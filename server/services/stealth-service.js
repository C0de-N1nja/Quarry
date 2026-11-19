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

class StealthService {
  constructor() {
    this.venvPython = path.join(__dirname, '..', '.venv', 'bin', 'python3');
    this.scriptPath = path.join(__dirname, '..', 'scripts', 'stealth_fetcher.py');
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

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 8000;
    const args = [this.scriptPath, 'fetch', url, '--timeout', String(timeoutMs)];

    if (options.stealth) {
      args.push('--stealth');
    }

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 5000);
      if (timedOut || !stdout || !stdout.trim()) {
        return null;
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
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
      // Graceful error handling
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

    const pythonBin = this.getPythonBinary();
    const engine = options.engine || 'yahoo';
    const timeoutMs = options.timeout || 7000;
    const args = [this.scriptPath, 'search', query.trim(), '--engine', engine, '--timeout', String(timeoutMs)];

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 4000);
      if (timedOut || !stdout || !stdout.trim()) {
        return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: 'Search timed out' };
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
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
      return { success: false, engine: `scrapling_${engine}`, links: [], snippets: [], emails: [], error: err.message };
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

    const pythonBin = this.getPythonBinary();
    const timeoutMs = options.timeout || 10000;
    const args = [this.scriptPath, 'crawl', url, '--timeout', String(timeoutMs)];

    try {
      const { stdout, timedOut } = await spawnKill(pythonBin, args, timeoutMs + 5000);
      if (timedOut || !stdout || !stdout.trim()) {
        return { success: false, url, emails: [], phones: [], socials: {}, error: 'Crawl timed out' };
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
        return {
          success: Boolean(parsed.success),
          url: parsed.url || url,
          emails: Array.isArray(parsed.emails) ? parsed.emails : [],
          phones: Array.isArray(parsed.phones) ? parsed.phones : [],
          socials: parsed.socials || {},
          error: parsed.error || null
        };
      }
    } catch (err) {
      return { success: false, url, emails: [], phones: [], socials: {}, error: err.message };
    }

    return { success: false, url, emails: [], phones: [], socials: {}, error: 'Invalid crawl response' };
  }
}

module.exports = new StealthService();
