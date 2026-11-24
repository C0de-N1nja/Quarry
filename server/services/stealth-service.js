const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function spawnKill(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
      return resolve({ stdout: '', stderr: e.message });
    }
    let out = '';
    if (child.stdout) child.stdout.on('data', d => { out += d.toString(); });
    const kill = () => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      try { child.kill('SIGKILL'); } catch {}
    };
    const t = setTimeout(() => { kill(); resolve({ stdout: out, timedOut: true }); }, timeoutMs);
    child.on('close', () => { clearTimeout(t); resolve({ stdout: out }); });
    child.on('error', (err) => { clearTimeout(t); resolve({ stdout: '', error: err.message }); });
  });
}

class HostRateLimiter {
  constructor() {
    this.hostQueues = new Map();
    this.hostDelays = new Map();
    this.degradedUntil = new Map(); // registrable domain -> timestamp
    this.baseDelayMs = process.env.NODE_ENV === 'test' ? 25 : (parseInt(process.env.SCRAPER_HOST_COOLDOWN_MS, 10) || 1500);
    this.degradedCooldownMs = process.env.NODE_ENV === 'test' ? 200 : (parseInt(process.env.SCRAPER_DEGRADED_COOLDOWN_MS, 10) || 10 * 60 * 1000); // 10 minutes default
    this.maxDelayMs = 15000;
  }

  getRegistrableDomain(urlString) {
    try {
      const u = urlString.startsWith('http') ? urlString : `https://${urlString}`;
      const hostname = new URL(u).hostname.toLowerCase();
      const parts = hostname.split('.');
      if (parts.length <= 2) return hostname;

      const secondLast = parts[parts.length - 2];
      const last = parts[parts.length - 1];
      const multiPartTlds = ['com.au', 'net.au', 'org.au', 'co.uk', 'org.uk', 'co.nz', 'net.nz', 'com.sg', 'co.za'];
      const lastTwo = `${secondLast}.${last}`;

      if (multiPartTlds.includes(lastTwo) && parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    } catch {
      return 'default';
    }
  }

  getHost(urlString) {
    return this.getRegistrableDomain(urlString);
  }

  isHostDegraded(domain) {
    const until = this.degradedUntil.get(domain);
    if (!until) return false;
    if (Date.now() < until) return true;
    this.degradedUntil.delete(domain);
    return false;
  }

  getDelay(domain) {
    return this.hostDelays.get(domain) || this.baseDelayMs;
  }

  recordResult(domain, httpStatus, finalUrl = '') {
    const current = this.getDelay(domain);
    const urlLower = (finalUrl || '').toLowerCase();
    const isCheckpoint = urlLower.includes('checkpoint') || urlLower.includes('/accounts/login') || urlLower.includes('/login');
    const isRateLimited = httpStatus === 429 || httpStatus === 403;

    if (isCheckpoint) {
      // Mark registrable domain degraded for 5-15 minutes (default 10 mins) to fail fast
      this.degradedUntil.set(domain, Date.now() + this.degradedCooldownMs);
      this.hostDelays.set(domain, this.maxDelayMs);
    } else if (isRateLimited) {
      const nextDelay = Math.min(this.maxDelayMs, Math.max(current * 1.5, 3000));
      this.hostDelays.set(domain, nextDelay);
    } else if (httpStatus >= 200 && httpStatus < 400) {
      // Cooldown relaxation: decay gradually on 2xx instead of instant reset
      if (current > this.baseDelayMs) {
        this.hostDelays.set(domain, Math.max(this.baseDelayMs, current - 250));
      }
    }
  }

  async acquire(domain) {
    const prev = this.hostQueues.get(domain) || Promise.resolve();
    let release;
    const current = new Promise(resolve => { release = resolve; });
    this.hostQueues.set(domain, current);

    await prev;
    const delay = this.getDelay(domain);
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    return {
      degraded: this.isHostDegraded(domain),
      release: () => release()
    };
  }
}

const hostRateLimiter = new HostRateLimiter();

class StealthService {
  constructor() {
    this.venvPython = path.join(__dirname, '..', '.venv', 'bin', 'python3');
    this.scriptPath = path.join(__dirname, '..', 'scripts', 'stealth_fetcher.py');
    this.rateLimiter = hostRateLimiter;
  }

  getPythonBinary() {
    if (fs.existsSync(this.venvPython)) {
      return this.venvPython;
    }
    return 'python3';
  }

  isAvailable() {
    return fs.existsSync(this.scriptPath);
  }

  /**
   * Fetch website content using Scrapling (HTTP/3 TLS impersonation + Cloudflare Turnstile bypass)
   * @param {string} url - Target URL to fetch
   * @param {Object} options - { stealth: boolean, timeout: number }
   * @returns {Promise<{success: boolean, status: number, html: string, engine: string, url: string}|null>}
   */
  async fetch(url, options = {}) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return null;
    }

    const host = this.rateLimiter.getHost(url);
    const { degraded, release } = await this.rateLimiter.acquire(host);
    if (degraded) {
      release();
      return { status: 'blocked', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Host temporarily degraded due to active checkpoint' };
    }

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 8000;
    const args = [this.scriptPath, 'fetch', url, '--timeout', String(timeoutMs)];

    if (options.stealth) {
      args.push('--stealth');
    }

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 5000);
      if (timedOut || !stdout || !stdout.trim()) {
        this.rateLimiter.recordResult(host, 408, url);
        return null;
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
        this.rateLimiter.recordResult(host, parsed.status || 200, parsed.url || url);
        if (parsed.success && parsed.html) {
          return {
            success: true,
            status: parsed.status,
            html: parsed.html,
            engine: parsed.engine,
            url: parsed.url || url
          };
        }
      }
    } catch (err) {
      this.rateLimiter.recordResult(host, 500, url);
    } finally {
      release();
    }

    return null;
  }

  /**
   * Execute SERP search query via Scrapling Fetcher with Chrome TLS fingerprinting
   * @param {string} query - Clean query string
   * @param {Object} options - { engine: 'yahoo'|'bing'|'duckduckgo', timeout: number }
   * @returns {Promise<{success: boolean, engine: string, links: string[], snippets: string[], emails: string[], error: string|null}>}
   */
  async search(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { success: false, engine: 'scrapling', links: [], snippets: [], emails: [], error: 'Empty query' };
    }

    const engine = options.engine || 'yahoo';
    const host = engine.includes('duck') ? 'duckduckgo.com' : (engine.includes('bing') ? 'bing.com' : 'yahoo.com');
    const { degraded, release } = await this.rateLimiter.acquire(host);
    if (degraded) {
      release();
      return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: 'Host temporarily degraded due to active checkpoint' };
    }

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 7000;
    const args = [this.scriptPath, 'search', query.trim(), '--engine', engine, '--timeout', String(timeoutMs)];

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 4000);
      if (timedOut || !stdout || !stdout.trim()) {
        this.rateLimiter.recordResult(host, 408);
        return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: 'Search timed out' };
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
        this.rateLimiter.recordResult(host, parsed.success ? 200 : 429);
        return {
          success: Boolean(parsed.success),
          engine: parsed.engine || `scrapling_${engine}`,
          links: Array.isArray(parsed.links) ? parsed.links : [],
          snippets: Array.isArray(parsed.snippets) ? parsed.snippets : [],
          emails: Array.isArray(parsed.emails) ? parsed.emails : [],
          html: parsed.html || '',
          error: parsed.error || null
        };
      }
    } catch (err) {
      this.rateLimiter.recordResult(host, 500);
      return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: err.message };
    } finally {
      release();
    }

    return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: 'Invalid response' };
  }

  /**
   * Crawl prospect homepage and contact subpages via Scrapling
   * @param {string} url - Target homepage URL
   * @param {Object} options - { timeout: number }
   * @returns {Promise<{success: boolean, url: string, emails: string[], phones: string[], socials: Object, error: string|null}>}
   */
  async crawlWebsite(url, options = {}) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return { success: false, url, emails: [], phones: [], socials: {}, error: 'Invalid URL' };
    }

    const host = this.rateLimiter.getHost(url);
    const { degraded, release } = await this.rateLimiter.acquire(host);
    if (degraded) {
      release();
      return { status: 'blocked', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Host temporarily degraded due to active checkpoint' };
    }

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 10000;
    const args = [this.scriptPath, 'crawl', url, '--timeout', String(timeoutMs)];

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 4000);
      if (timedOut || !stdout || !stdout.trim()) {
        this.rateLimiter.recordResult(host, 408, url);
        return { success: false, url, emails: [], phones: [], socials: {}, error: 'Crawl timed out' };
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
        this.rateLimiter.recordResult(host, parsed.success ? 200 : 500, url);
        return {
          success: Boolean(parsed.success),
          url: parsed.url || url,
          emails: Array.isArray(parsed.emails) ? parsed.emails : [],
          phones: Array.isArray(parsed.phones) ? parsed.phones : [],
          socials: parsed.socials || {},
          pages_scraped: parsed.pages_scraped || 0,
          error: parsed.error || null
        };
      }
    } catch (err) {
      this.rateLimiter.recordResult(host, 500, url);
      return { success: false, url, emails: [], phones: [], socials: {}, error: err.message };
    } finally {
      release();
    }

    return { success: false, url, emails: [], phones: [], socials: {}, error: 'Invalid crawl response' };
  }

  /**
   * Scrape a social media profile directly via Scrapling
   * @param {string} url - Target social profile URL
   * @param {Object} options - { timeout: number }
   * @returns {Promise<{status: string, variant: string, platform: string, url: string, final_url: string, http_status: number, page_name: string|null, bio: string, emails: string[], phones: string[], addresses: string[], whatsapp: string|null, candidate_links: string[], website: string|null, source: string, error: string|null}>}
   */
  async scrapeSocial(url, options = {}) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return { status: 'empty', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Invalid URL' };
    }

    const host = this.rateLimiter.getHost(url);
    const { degraded, release } = await this.rateLimiter.acquire(host);
    if (degraded) {
      release();
      return { status: 'blocked', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Host temporarily degraded due to active checkpoint' };
    }

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 8000;
    const args = [this.scriptPath, 'social', url, '--timeout', String(timeoutMs)];

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 4000);
      if (timedOut || !stdout || !stdout.trim()) {
        this.rateLimiter.recordResult(host, 408, url);
        return { status: 'empty', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Social scrape timed out' };
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
        const fields = parsed.fields || {};
        this.rateLimiter.recordResult(host, parsed.http_status || 200, parsed.final_url || url);
        return {
          status: parsed.status || 'ok',
          variant: parsed.variant || 'www',
          platform: parsed.platform || 'unknown',
          url: parsed.url || url,
          final_url: parsed.final_url || url,
          http_status: parsed.http_status || 200,
          page_name: fields.page_name || null,
          bio: fields.bio || '',
          emails: Array.isArray(fields.emails) ? fields.emails : [],
          phones: Array.isArray(fields.phones) ? fields.phones : [],
          addresses: Array.isArray(fields.addresses) ? fields.addresses : [],
          whatsapp: fields.whatsapp || null,
          candidate_links: Array.isArray(fields.candidate_links) ? fields.candidate_links : [],
          website: fields.website || null,
          source: parsed.source || 'scrapling',
          error: parsed.error || null
        };
      }
    } catch (err) {
      this.rateLimiter.recordResult(host, 500, url);
      return { status: 'error', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: err.message };
    } finally {
      release();
    }

    return { status: 'empty', variant: 'www', url, emails: [], phones: [], addresses: [], candidate_links: [], error: 'Invalid social response' };
  }
}

module.exports = new StealthService();
