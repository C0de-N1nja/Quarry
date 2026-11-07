const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

function spawnKill(cmd, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = require('child_process').spawn('bash',['-c',cmd],{detached:true,stdio:['ignore','pipe','ignore']});
    } catch(e){return resolve({stdout:''});}
    let out='';
    if(child.stdout) child.stdout.on('data',d=>{out+=d.toString();});
    const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}try{child.kill('SIGKILL');}catch{}};
    const t=setTimeout(()=>{kill();resolve({stdout:out});},timeoutMs);
    child.on('close',()=>{clearTimeout(t);resolve({stdout:out});});
    child.on('error',()=>{clearTimeout(t);resolve({stdout:''});});
  });
}

const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const phoneService = require('./phone-service');
const db = require('../db/database');

const BLOCKED_EMAIL_DOMAINS = [
  'duckduckgo.com', 'google.com', 'bing.com', 'microsoft.com', 'apple.com',
  'cloudflare.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com', 'youtube.com', 'sentry.io',
  'example.com', 'schema.org', 'w3.org', 'wixpress.com', 'yelp.com',
  'yellowpages.com', 'bbb.org', 'angi.com', 'thumbtack.com', 'tripadvisor.com',
  'mapquest.com', 'domain.com', 'email.com', 'wordpress.org', 'wordpress.com',
  'wxxi.org', 'pbs.org', 'npr.org', 'cbsnews.com', 'nbcnews.com', 'cnn.com',
  'nutricia.com', 'marchon.com'
];

const BLOCKED_LOCAL_PARTS = [
  'error', 'error-lite', 'abuse', 'postmaster', 'noreply', 'no-reply',
  'donotreply', 'do-not-reply', 'mailer-daemon', 'feedback', 'devnull',
  'bounce', 'privacy', 'security', 'legal', 'press', 'media', 'support',
  'help', 'admin', 'webmaster', 'test', 'sample', 'spam', 'notification',
  'notifications', 'alert', 'alerts', 'careers', 'jobs'
];

const SOCIAL_OR_DIRECTORY_DOMAINS = [
  'yahoo.com', 'bing.com', 'google.com', 'duckduckgo.com', 'wikipedia.org', 'microsoft.com', 'apple.com',
  'facebook.com', 'fb.com', 'instagram.com', 'instagr.am', 'linkedin.com',
  'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'pinterest.com',
  'threads.net', 'snapchat.com', 'reddit.com',
  'linktr.ee', 'bio.link', 'beacons.ai', 'campsite.bio', 'taplink.cc', 'solo.to',
  'lnk.bio', 'allmylinks.com', 'direct.me', 'stan.store', 'carrd.co',
  'wa.me', 'api.whatsapp.com', 'm.me', 't.me', 'telegram.me',
  'google.com/maps', 'maps.google.com', 'goo.gl/maps', 'maps.app.goo.gl',
  'yelp.com', 'yellowpages.com', 'mapquest.com', 'bbb.org', 'angi.com',
  'homeadvisor.com', 'thumbtack.com', 'tripadvisor.com', 'manta.com',
  'merchantcircle.com', 'citysearch.com', 'superpages.com', 'chamberofcommerce.com',
  'bizapedia.com', 'fresha.com', 'vagaro.com', 'booksy.com', 'schedulicity.com',
  'square.site', 'opentable.com', 'grubhub.com', 'doordash.com', 'ubereats.com'
];

const PARKED_PHRASES = [
  'domain is parked',
  'this domain is for sale',
  'buy this domain',
  'parked free, courtesy of',
  'parked courtesy of',
  'domain has expired',
  'website is temporarily unavailable',
  'registered and protected by',
  'under construction',
  'coming soon',
  'renew this domain',
  'hugedomains.com',
  'sedo.com',
  'dan.com',
  'godaddy.com/park'
];

const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

class OsintService {
  /**
   * Fetch cached OSINT verification result if not expired (up to 14 days)
   */
  getCachedResult(cacheKey) {
    if (!cacheKey) return null;
    try {
      const row = db.prepare("SELECT data FROM osint_cache WHERE cache_key = ? AND expires_at > datetime('now')").get(cacheKey);
      if (row && row.data) {
        return JSON.parse(row.data);
      }
    } catch (err) {
      console.warn('[OSINT Cache] Read error:', err.message);
    }
    return null;
  }

  /**
   * Store OSINT verification result in cache with 14-day expiration
   */
  setCachedResult(cacheKey, data, ttlDays = 14) {
    if (!cacheKey || !data) return;
    try {
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO osint_cache (cache_key, data, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP
      `).run(cacheKey, JSON.stringify(data), expiresAt);
    } catch (err) {
      console.warn('[OSINT Cache] Write error:', err.message);
    }
  }

  /**
   * Clear cache for a specific key or all entries
   */
  clearCache(cacheKey = null) {
    try {
      if (cacheKey) {
        db.prepare('DELETE FROM osint_cache WHERE cache_key = ?').run(cacheKey);
      } else {
        db.prepare('DELETE FROM osint_cache').run();
      }
    } catch (err) {
      console.warn('[OSINT Cache] Clear error:', err.message);
    }
  }

  /**
   * Rank an email address by priority:
   * Rank 2: Decision Maker / Named Owner (personal name format, e.g. drsmith@, john.doe@)
   * Rank 1: Direct / Non-generic personal alias
   * Rank 0: Generic company alias (info@, contact@, sales@, etc.)
   */
  rankEmail(email) {
    if (!email || !email.includes('@')) return -1;
    const local = email.split('@')[0].toLowerCase().trim();

    const genericAliases = [
      'info', 'contact', 'sales', 'support', 'admin', 'help', 'office',
      'hello', 'mail', 'billing', 'inquiries', 'team', 'service', 'services',
      'frontdesk', 'reception', 'desk', 'general', 'feedback', 'quotes',
      'estimate', 'estimates', 'jobs', 'careers', 'marketing', 'media', 'press',
      'customercare', 'customer', 'reservations', 'booking'
    ];

    if (genericAliases.some(alias => local === alias || local.startsWith(alias + '+') || local.startsWith(alias + '-'))) {
      return 0; // Generic role email
    }

    // Check for named owner / doctor / personal pattern
    if (/^(dr|doc|dr\.)[a-z]+/i.test(local)) return 2; // e.g. drsmith, dr.johnson
    if (local.includes('.') || local.includes('_')) {
      const parts = local.split(/[._]/).filter(p => p.length >= 2 && !/\d/.test(p));
      if (parts.length >= 2) return 2; // e.g. john.doe, sarah_miller
    }

    if (/^[a-z]{3,15}$/i.test(local) && !genericAliases.includes(local)) {
      return 2; // e.g. mike@, emily@
    }

    return 1; // Other direct addresses
  }

  /**
   * Normalize stylized Unicode fancy fonts (script, gothic/fraktur, blackboard bold,
   * negative squared, negative circled, fullwidth, regional indicators) into clean ASCII/Latin text.
   * Ensures Instagram, Twitter, and Facebook bios with decorative fonts are fully readable by regex.
   */
  normalizeFancyText(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Map enclosed alphanumeric supplements (negative squared, negative circled, regional indicators)
    let res = text
      .replace(/[\u{1F130}-\u{1F149}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F130 + 0x41))
      .replace(/[\u{1F150}-\u{1F169}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F150 + 0x41))
      .replace(/[\u{1F170}-\u{1F189}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F170 + 0x41))
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F1E6 + 0x41));

    // 2. Normalize standard Unicode decompositions (NFKD handles math bold, script, fraktur, fullwidth, circled)
    res = res.normalize('NFKD');

    // 3. Strip zero-width, non-breaking spaces, and combining diacritical marks
    return res
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Deep Gravatar & Libravatar profile and avatar identity resolution
   * Zero API keys required - queries Gravatar public hash API
   */
  async resolveGravatar(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) return null;
    const cleanEmail = email.toLowerCase().trim();
    const md5Hash = crypto.createHash('md5').update(cleanEmail).digest('hex');

    try {
      // 1. Try Gravatar JSON profile
      const jsonRes = await axios.get(`https://www.gravatar.com/${md5Hash}.json`, {
        timeout: 4000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        validateStatus: s => s === 200 || s === 404
      });

      if (jsonRes.status === 200 && jsonRes.data?.entry?.[0]) {
        const entry = jsonRes.data.entry[0];
        const nameObj = typeof entry.name === 'object' && entry.name ? entry.name : {};
        const formattedName = entry.displayName || nameObj.formatted || [nameObj.givenName, nameObj.familyName].filter(Boolean).join(' ') || null;

        return {
          found: true,
          avatarUrl: entry.thumbnailUrl || `https://0.gravatar.com/avatar/${md5Hash}`,
          displayName: formattedName,
          jobTitle: entry.job_title || null,
          company: entry.company || null,
          location: entry.currentLocation || null,
          aboutMe: entry.aboutMe || null,
          profileUrl: entry.profileUrl || `https://gravatar.com/${md5Hash}`,
          verifiedAccounts: Array.isArray(entry.accounts) ? entry.accounts.map(a => ({
            name: a.name || a.shortname,
            url: a.url,
            verified: !!a.verified
          })) : []
        };
      }

      // 2. Fallback: Check if avatar image exists (d=404 returns 404 if no avatar registered)
      const avatarRes = await axios.head(`https://www.gravatar.com/avatar/${md5Hash}?d=404`, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: s => s === 200 || s === 404
      });

      if (avatarRes.status === 200) {
        return {
          found: true,
          avatarUrl: `https://www.gravatar.com/avatar/${md5Hash}`,
          displayName: null,
          jobTitle: null,
          company: null,
          location: null,
          aboutMe: null,
          profileUrl: `https://gravatar.com/${md5Hash}`,
          verifiedAccounts: []
        };
      }
    } catch (e) {
      // Gravatar probe failed non-critically
    }
    return null;
  }

  /**
   * Determine if a URL is an aggregator, social network, directory, or bio-link
   */
  isSocialOrDirectory(url) {
    if (!url) return true;
    try {
      let clean = url.toLowerCase().trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      const parsed = new URL(clean);
      const host = parsed.hostname.replace(/^www\./, '');
      const fullPath = host + parsed.pathname;

      return SOCIAL_OR_DIRECTORY_DOMAINS.some(domain => {
        if (domain.includes('/')) {
          return fullPath.startsWith(domain) || fullPath.includes('/' + domain);
        }
        return host === domain || host.endsWith('.' + domain);
      });
    } catch {
      return true;
    }
  }

  /**
   * Check if page content indicates a parked or expired domain
   */
  isParkedOrExpired(html) {
    if (!html || typeof html !== 'string') return false;
    const lower = html.toLowerCase();
    return PARKED_PHRASES.some(phrase => lower.includes(phrase));
  }

  /**
   * Check if webpage content matches the target business (name tokens, phone, or city)
   */
  matchesBusiness(html, lead) {
    if (!html || typeof html !== 'string') return false;
    const lower = this.normalizeFancyText(html).toLowerCase();

    // 1. Check phone digits
    if (lead.phone) {
      const digits = lead.phone.replace(/[^\d]/g, '');
      if (digits.length >= 7 && lower.replace(/[^\d]/g, '').includes(digits.slice(-7))) {
        return true;
      }
    }

    // 2. Check business name tokens
    const stopWords = ['llc', 'inc', 'corp', 'co', 'the', 'and', '&', 'services', 'service', 'solutions', 'group', 'company', 'clinic', 'center', 'pros', 'pro'];
    const nameTokens = (lead.business_name || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4 && !stopWords.includes(w));

    if (nameTokens.length > 0) {
      const matched = nameTokens.filter(token => lower.includes(token));
      if (matched.length >= Math.min(2, nameTokens.length)) {
        return true;
      }
    }

    // 3. Check city if provided
    if (lead.city && lead.city.length >= 4 && lower.includes(lead.city.toLowerCase())) {
      // If city matches AND at least 1 name token matches
      if (nameTokens.some(token => lower.includes(token))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize URLs into clean protocol + domain format
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl) return null;
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    try {
      const parsed = new URL(clean);
      return parsed.origin + parsed.pathname.replace(/\/+$/, '');
    } catch {
      return null;
    }
  }

  normalizeCandidateUrl(rawUrl) {
    return this.normalizeUrl(rawUrl);
  }

  async checkDnsCandidate(domain) {
    if (!domain) return { resolved: false, addresses: [], error: 'Empty domain' };
    const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');
    try {
      const addresses = await dns.lookup(cleanDomain, { all: true });
      return { resolved: true, addresses };
    } catch (e) {
      return { resolved: false, addresses: [], error: e.message };
    }
  }

  /**
   * Verify domain MX deliverability
   */
  async verifyMx(email) {
    if (!email || !email.includes('@')) return 0;
    const domain = email.split('@')[1];
    try {
      const records = await dns.resolveMx(domain);
      return records && records.length > 0 ? 1 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Run Holehe online footprint verification for a discovered email
   * Returns array of verified platform names (e.g. ['twitter', 'instagram', 'office365'])
   */
  async checkHolehe(email) {
    if (!email || !email.includes('@')) return [];
    try {
      const scriptPath = path.join(__dirname, '../scripts/holehe_check.py');
      const { stdout } = await spawnKill(`python3 "${scriptPath}" "${email.trim()}" 2>/dev/null`, 20000);
      const jsonMatch = stdout && stdout.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn(`[OSINT Holehe] Check error for ${email}:`, err.message);
    }
    return [];
  }

  /**
   * Extract clean, validated emails from raw text
   */
  extractEmails(text) {
    if (!text || typeof text !== 'string') return [];
    const normalized = this.normalizeFancyText(text);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = normalized.match(emailRegex) || [];
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.css', '.js', '.woff', '.pdf'];

    return Array.from(new Set(matches)).filter(email => {
      const lower = email.toLowerCase().trim();
      if (!lower.includes('@')) return false;
      if (ignoredExtensions.some(ext => lower.endsWith(ext))) return false;

      const [local, domain] = lower.split('@');
      if (!local || !domain) return false;

      if (BLOCKED_LOCAL_PARTS.some(b => local === b || local.startsWith(b + '+') || local.startsWith(b + '-') || local.startsWith(b + '.'))) {
        return false;
      }

      if (BLOCKED_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
        return false;
      }

      // Block government, military, and educational domains (prevents city/state/agency email leakage)
      if (domain.endsWith('.gov') || domain.endsWith('.mil') || domain.endsWith('.edu') || domain.includes('.gov.')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Phone-anchored snippet validation:
   * Accepts snippet email only if the snippet contains the lead's exact 10-digit phone number.
   */
  snippetMatchesPhone(snippet, phone) {
    if (!snippet || !phone) return false;
    const phoneDigits = String(phone).replace(/\D/g, '');
    if (phoneDigits.length < 10) return false;
    const target10 = phoneDigits.slice(-10);
    const snippetDigits = String(snippet).replace(/\D/g, '');
    return snippetDigits.includes(target10);
  }

  /**
   * Collision guard: checks if email is already attached to a different lead in contacts table.
   */
  checkEmailCollision(email, leadId) {
    if (!email) return null;
    try {
      const row = db.prepare(`
        SELECT c.lead_id, l.business_name
        FROM contacts c
        JOIN leads l ON c.lead_id = l.id
        WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(?)) AND c.lead_id != ?
        LIMIT 1
      `).get(email, leadId || 0);
      return row || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Universal URL Decoder for Search Redirects (Yahoo /RU=, DuckDuckGo uddg=, Bing /ck/a? u=a1)
   */
  decodeSearchUrl(rawHref) {
    if (!rawHref) return '';
    let href = rawHref;

    // 1. Yahoo redirect unwrapping: /RU=...
    if (href.includes('/RU=')) {
      try {
        const match = href.match(/\/RU=([^/]+)/);
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1]);
          if (decoded.startsWith('http')) return decoded;
        }
      } catch {}
    }

    // 2. DuckDuckGo redirect unwrapping: uddg=...
    if (href.includes('uddg=')) {
      try {
        const match = href.match(/[?&]uddg=([^&]+)/);
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1]);
          if (decoded.startsWith('http')) return decoded;
        }
      } catch {}
    }

    // 3. Bing redirect unwrapping: u=a1...
    if (href.includes('u=a1') || href.includes('/ck/a?')) {
      try {
        const match = href.match(/[?&]u=a1([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          const decoded = Buffer.from(b64, 'base64').toString('utf8');
          if (decoded.startsWith('http')) return decoded;
        }
      } catch {}
    }

    return href;
  }

  /**
   * Multi-Engine Search with Automatic Rotation (Yahoo -> Bing -> oc -> DuckDuckGo)
   * Prevents bot blocks through query sanitization, header randomization, and TLS impersonation
   */
  async searchEngineQuery(query, preferredEngine = 'yahoo', timeout = 6000) {
    const cleanQuery = query
      .replace(/&/g, 'and')
      .replace(/["'()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const engines = preferredEngine === 'bing'
      ? ['bing', 'yahoo', 'duckduckgo']
      : ['yahoo', 'bing', 'duckduckgo'];

    const errors = [];

    // Tier 1: Direct queries across engines (with oc TLS impersonation for Yahoo)
    for (const engine of engines) {
      try {
        let html = '';
        if (engine === 'yahoo') {
          try {
            const res = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(cleanQuery)}`, {
              headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://search.yahoo.com/'
              },
              timeout,
              validateStatus: (s) => s < 400
            });
            html = res.data;
          } catch (yahooAxiosErr) {
            // If direct Axios gets challenged (500 or redirect), immediately bypass via oc open (TLS impersonation)
            try {
              const ocUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(cleanQuery)}`;
              const { stdout } = await spawnKill(`oc open "${ocUrl}" --json`, 10000);
              const data = JSON.parse(stdout);
              if (data && Array.isArray(data.blocks)) {
                const links = [];
                const snippets = [];
                for (const b of data.blocks) {
                  if (b.href) {
                    const unwrapped = this.decodeSearchUrl(b.href);
                    if (unwrapped.startsWith('http')) links.push(unwrapped);
                  }
                  if (b.type === 'text' && b.text) snippets.push(b.text.trim());
                }
                if (links.length > 0 || snippets.length > 0) {
                  return { success: true, engine: 'oc_yahoo', links, snippets, html: '', error: null };
                }
              }
            } catch (ocErr) {
              errors.push({ engine: 'oc_yahoo', error: ocErr.message });
            }
            throw yahooAxiosErr;
          }
        } else if (engine === 'bing') {
          const res = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(cleanQuery)}`, {
            headers: {
              'User-Agent': ua,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.bing.com/'
            },
            timeout,
            validateStatus: (s) => s < 400
          });
          html = res.data;
        } else if (engine === 'duckduckgo') {
          const res = await axios.post(
            'https://lite.duckduckgo.com/lite/',
            new URLSearchParams({ q: cleanQuery }).toString(),
            {
              headers: {
                'User-Agent': ua,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              timeout: 3000,
              validateStatus: (s) => s < 400
            }
          );
          html = res.data;
        }

        if (typeof html === 'string' && html.length > 500) {
          const $ = cheerio.load(html);
          const links = [];
          const snippets = [];

          $('a[href]').each((_, el) => {
            const raw = $(el).attr('href') || '';
            const unwrapped = this.decodeSearchUrl(raw);
            if (unwrapped.startsWith('http')) links.push(unwrapped);
          });

          $('div.compText, p, span.fc-smoke, li.b_algo p, .b_snippet, td.result-snippet, .result-snippet, .result__snippet').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt) snippets.push(txt);
          });

          if (links.length > 0 || snippets.length > 0) {
            return {
              success: true,
              engine,
              links,
              snippets,
              html,
              error: null
            };
          }
        }
      } catch (err) {
        errors.push({ engine, error: err.message, code: err.code || null });
      }
    }

    // Tier 2: oc open fallback (built-in TLS browser impersonation)
    try {
      const ocUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(cleanQuery)}`;
      const { stdout } = await spawnKill(`oc open "${ocUrl}" --json`, 10000);
      const data = JSON.parse(stdout);
      if (data && Array.isArray(data.blocks)) {
        const links = [];
        const snippets = [];

        for (const b of data.blocks) {
          if (b.href) {
            const unwrapped = this.decodeSearchUrl(b.href);
            if (unwrapped.startsWith('http')) links.push(unwrapped);
          }
          if (b.type === 'text' && b.text) {
            snippets.push(b.text.trim());
          }
        }

        if (links.length > 0 || snippets.length > 0) {
          return {
            success: true,
            engine: 'oc_yahoo',
            links,
            snippets,
            html: '',
            error: null
          };
        }
      }
    } catch (ocErr) {
      errors.push({ engine: 'oc_yahoo', error: ocErr.message });
    }

    return {
      success: false,
      engine: 'none',
      links: [],
      snippets: [],
      html: '',
      error: errors.map(e => `${e.engine}: ${e.error}`).join('; '),
      errors
    };
  }

  /**
   * Discover authentic social profiles across Facebook, Instagram, LinkedIn, X, TikTok, YouTube, and Linktree
   */
  async discoverSocialProfiles(lead, options = {}) {
    const snippetEmails = new Set();
    const searchErrors = [];
    const profiles = {
      facebook: null,
      instagram: null,
      linkedin: null,
      twitter: null,
      tiktok: null,
      youtube: null,
      linktree: null,
      whatsapp: null,
      _emailSources: {},
      _candidateWebsiteLinks: []
    };

    if (options && typeof options.isCancelled === 'function' && options.isCancelled()) {
      return profiles;
    }

    // 1. Check existing website field if it was set to a social profile or bio link
    if (lead.website) {
      const existing = lead.website.trim();
      if (existing.includes('facebook.com/')) profiles.facebook = existing;
      else if (existing.includes('instagram.com/')) profiles.instagram = existing;
      else if (existing.includes('linkedin.com/')) profiles.linkedin = existing;
      else if (existing.includes('twitter.com/') || existing.includes('x.com/')) profiles.twitter = existing;
      else if (existing.includes('tiktok.com/')) profiles.tiktok = existing;
      else if (existing.includes('youtube.com/')) profiles.youtube = existing;
      else if (existing.includes('linktr.ee/') || existing.includes('bio.link/') || existing.includes('beacons.ai/')) profiles.linktree = existing;
      else if (existing.includes('wa.me/')) profiles.whatsapp = existing;
    }

    // 2. Multi-Engine Search with Query Distribution
    const cleanName = (lead.business_name || '').replace(/&/g, 'and').trim();
    const queries = [
      `"${cleanName}" ${lead.city || ''} facebook instagram linkedin`,
      `"${cleanName}" ${lead.city || ''} ("@gmail.com" OR "@yahoo.com" OR email OR contact)`
    ];

    if (lead.phone) {
      queries.push(`"${lead.phone}" facebook instagram`);
    }

    await Promise.allSettled(queries.map(async (q) => {
      if (options && typeof options.isCancelled === 'function' && options.isCancelled()) return;
      const res = await this.searchEngineQuery(q, 'yahoo', 7000);
      if (!res.success) {
        console.warn(`[OSINT Search Warning] All search engines failed for query: ${q}`);
        searchErrors.push({
          query: q,
          error: res.error || 'All search engines exhausted',
          code: res.errors?.[0]?.code || null
        });
        return;
      }

      for (const href of res.links) {
        const lower = href.toLowerCase();

        // Facebook Business Profile (reject generic root or share endpoints)
        const fbMatch = href.match(/^https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)\/?/i);
        if (!profiles.facebook && fbMatch && fbMatch[1] && !['sharer', 'login', 'dialog', 'search', 'pages', 'groups', 'watch', 'share', 'events', 'marketplace'].includes(fbMatch[1].toLowerCase())) {
          profiles.facebook = href.split('?')[0];
        }

        // Instagram Business Profile (reject root, post, reel, explore)
        const igMatch = href.match(/^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)\/?/i);
        if (!profiles.instagram && igMatch && igMatch[1] && !['p', 'reel', 'reels', 'accounts', 'explore', 'stories', 'about'].includes(igMatch[1].toLowerCase())) {
          profiles.instagram = href.split('?')[0];
        }

        // LinkedIn Company or Personal Profile
        if (!profiles.linkedin && lower.includes('linkedin.com/') && (lower.includes('/company/') || lower.includes('/in/'))) {
          profiles.linkedin = href.split('?')[0];
        }

        // X / Twitter Profile
        const twMatch = href.match(/^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/i);
        if (!profiles.twitter && twMatch && twMatch[1] && !['status', 'home', 'explore', 'notifications', 'messages', 'i'].includes(twMatch[1].toLowerCase())) {
          profiles.twitter = href.split('?')[0];
        }

        // TikTok Profile
        if (!profiles.tiktok && lower.includes('tiktok.com/@')) {
          profiles.tiktok = href.split('?')[0];
        }

        // Linktree / Bio link
        if (!profiles.linktree && (lower.includes('linktr.ee/') || lower.includes('bio.link/') || lower.includes('beacons.ai/'))) {
          profiles.linktree = href.split('?')[0];
        }

        // Plain business domain surfaced in search results (not social/directory) — candidate for "secretly has a website" check
        if (profiles._candidateWebsiteLinks.length < 5 && !this.isSocialOrDirectory(href)) {
          const normCand = this.normalizeUrl(href);
          if (normCand && !profiles._candidateWebsiteLinks.includes(normCand)) {
            profiles._candidateWebsiteLinks.push(normCand);
          }
        }
      }

      for (const snip of res.snippets) {
        if (!this.snippetMatchesPhone(snip, lead.phone_e164 || lead.phone)) continue;

        // Enforce brand anchor: Snippet MUST mention the business name to prevent third-party directory leakage
        const cleanTokens = cleanName.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3 && !['roofing', 'dental', 'clinic', 'contractor', 'services', 'inc', 'llc', 'company'].includes(w));
        const snipLower = snip.toLowerCase();
        const hasAnchor = cleanTokens.length === 0 || cleanTokens.some(tok => snipLower.includes(tok));
        if (!hasAnchor) continue;

        const found = this.extractEmails(snip);
        for (const e of found) {
          const lower = e.toLowerCase();
          snippetEmails.add(lower);
          profiles._emailSources[lower] = {
            source: 'phone_anchored_snippet',
            confidence: 'high',
            query: q,
            snippet: snip.slice(0, 200),
            found_at: new Date().toISOString(),
            source_url: null
          };
        }
      }
    }));

    profiles._snippetEmails = Array.from(snippetEmails);
    profiles._searchErrors = searchErrors;
    profiles._queriesAttempted = queries.length;
    return profiles;
  }

  /**
   * Dedicated Facebook Page Intelligence Extractor:
   * Uses Relay GraphQL About payload extraction & OpenGraph crawler headers.
   * Completely bypasses Facebook's desktop login wall in <1 second without headless browser overhead.
   */
  async scrapeFacebookPage(profileUrl) {
    if (!profileUrl) return null;
    const scriptPath = path.join(__dirname, '../scripts/fb_scraper.py');
    try {
      const sanitizedUrl = profileUrl.replace(/["$`\\]/g, '');
      const { stdout } = await spawnKill(`python3 "${scriptPath}" "${sanitizedUrl}"`, 9000);
      if (!stdout) return null;
      const parsed = JSON.parse(stdout);
      return parsed.ok ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Inspect a social profile or bio link page for external website links and contact info.
   * Utilizes Jina Reader for social platforms (Facebook/Instagram) to bypass login walls.
   */
  async inspectProfile(profileUrl, platform = 'unknown') {
    const result = {
      platform,
      url: profileUrl,
      bioText: '',
      candidateLinks: [],
      emails: [],
      phones: [],
      whatsapp: null,
      error: null
    };

    if (!profileUrl) return result;

    const lowerUrl = profileUrl.toLowerCase();

    // 1. High-Performance Facebook Page Extraction
    if (lowerUrl.includes('facebook.com')) {
      const fbData = await this.scrapeFacebookPage(profileUrl);
      if (fbData) {
        if (fbData.bio) result.bioText = fbData.bio;
        if (fbData.email) {
          const valid = this.extractEmails(fbData.email);
          for (const em of valid) {
            if (!result.emails.includes(em)) result.emails.push(em);
          }
        }
        if (fbData.phone && !result.phones.includes(fbData.phone)) {
          result.phones.push(fbData.phone);
        }
        if (fbData.website) {
          const norm = this.normalizeUrl(fbData.website);
          if (norm && !this.isSocialOrDirectory(norm) && !result.candidateLinks.includes(norm)) {
            result.candidateLinks.push(norm);
          }
        }
        if (Array.isArray(fbData.candidate_links)) {
          for (const link of fbData.candidate_links) {
            const norm = this.normalizeUrl(link);
            if (norm && !this.isSocialOrDirectory(norm) && !result.candidateLinks.includes(norm)) {
              result.candidateLinks.push(norm);
            }
          }
        }
        // If Facebook scraper successfully extracted email or website, return immediately
        if (result.emails.length > 0 || result.candidateLinks.length > 0) {
          return result;
        }
      }
    }

    let textContent = '';
    let htmlContent = '';

    // If target is a social profile (Instagram, LinkedIn), prioritize Jina Reader to bypass login walls
    const isSocialGated = lowerUrl.includes('instagram.com') || lowerUrl.includes('linkedin.com');

    if (isSocialGated) {
      try {
        const clean = profileUrl.replace(/\/+$/, '');
        const jinaRes = await axios.get(`https://r.jina.ai/${clean}`, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (typeof jinaRes.data === 'string' && jinaRes.data.length > 50) {
          textContent = jinaRes.data;
        }
      } catch (jinaErr) {
        try {
          const jinaRes2 = await axios.get(`https://r.jina.ai/${profileUrl}`, { timeout: 7000 });
          if (typeof jinaRes2.data === 'string') textContent = jinaRes2.data;
        } catch {}
      }
    }

    // Direct HTTP probe (for regular sites or fallback)
    try {
      const response = await axios.get(profileUrl, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        },
        maxRedirects: 3,
        validateStatus: (s) => s < 400
      });

      htmlContent = typeof response.data === 'string' ? response.data : '';
      if (htmlContent) {
        const $ = cheerio.load(htmlContent);
        const pageTitle = $('title').text() || '';
        const metaDesc = $('meta[name="description"], meta[property="og:description"]').attr('content') || '';
        const bodyText = $('body').text() || '';
        result.bioText = `${pageTitle} ${metaDesc}`.trim();

        $('a[href]').each((_, el) => {
          let href = $(el).attr('href') || '';
          if (href.startsWith('//')) href = 'https:' + href;
          if (!href.startsWith('http')) return;

          if (href.includes('wa.me/') || href.includes('api.whatsapp.com/send')) {
            result.whatsapp = href;
            return;
          }

          const lower = href.toLowerCase();
          if (lower.includes('facebook.com') || lower.includes('instagram.com') || lower.includes('twitter.com') || lower.includes('x.com')) {
            return;
          }

          if (href.includes('?u=') || href.includes('&u=')) {
            try {
              const urlObj = new URL(href);
              const targetU = urlObj.searchParams.get('u');
              if (targetU) href = decodeURIComponent(targetU);
            } catch {}
          }

          if (!this.isSocialOrDirectory(href)) {
            const norm = this.normalizeUrl(href);
            if (norm && !result.candidateLinks.includes(norm)) {
              result.candidateLinks.push(norm);
            }
          }
        });
      }
    } catch (err) {
      if (!textContent) {
        result.error = err.message || 'Inspection failed';
      }
    }

    // Extract links, emails, and phones from combined content (HTML + Jina Markdown)
    const combinedText = `${htmlContent} ${textContent}`;

    // Extract external website links from Markdown text (e.g. [website](https://...))
    const mdLinks = textContent.match(/https?:\/\/[^\s)\]"']+/g) || [];
    for (let link of mdLinks) {
      if (link.includes('wa.me/') || link.includes('api.whatsapp.com/send')) {
        if (!result.whatsapp) result.whatsapp = link;
        continue;
      }
      if (!this.isSocialOrDirectory(link)) {
        const norm = this.normalizeUrl(link);
        if (norm && !result.candidateLinks.includes(norm)) {
          result.candidateLinks.push(norm);
        }
      }
    }

    result.emails = this.extractEmails(combinedText);

    // Clean raw HTML out of combinedText and normalize fancy/fullwidth unicode before phone matching
    const cleanText = this.normalizeFancyText(combinedText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '));

    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/g;
    const phoneMatches = cleanText.match(phoneRegex) || [];
    const validPhones = phoneMatches.map(p => p.trim()).filter(p => {
      const digits = p.replace(/\D/g, '');
      if (digits.length !== 10 && digits.length !== 11) return false;
      if (digits.startsWith('179') || digits.startsWith('178') || digits.startsWith('180') || digits.startsWith('184')) return false;
      return true;
    });
    result.phones = Array.from(new Set(validPhones));

    return result;
  }

  /**
   * Verify candidate website: DNS lookup, HTTP response, check not parked, check business relevance
   */
  async verifyCandidateWebsite(url, lead) {
    const verification = {
      verified: false,
      url,
      dns: false,
      httpStatus: null,
      isParked: false,
      businessMatch: false,
      reason: ''
    };

    if (!url) {
      verification.reason = 'URL is empty';
      return verification;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      verification.reason = 'Invalid URL structure';
      return verification;
    }

    const hostname = parsed.hostname.replace(/^www\./, '');

    // 1. DNS Resolution Check
    try {
      await dns.lookup(hostname);
      verification.dns = true;
    } catch (dnsErr) {
      verification.reason = `DNS failed for ${hostname} (${dnsErr.code || 'NXDOMAIN'})`;
      return verification;
    }

    // 2. HTTP Probe
    let html = '';
    try {
      const response = await axios.get(url, {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        },
        maxRedirects: 4,
        validateStatus: () => true
      });

      verification.httpStatus = response.status;
      if (response.status >= 400) {
        verification.reason = `HTTP status ${response.status} returned`;
        return verification;
      }

      html = typeof response.data === 'string' ? response.data : '';
    } catch (httpErr) {
      verification.reason = `Connection failed: ${httpErr.message}`;
      return verification;
    }

    // 3. Parked Domain Check
    if (this.isParkedOrExpired(html)) {
      verification.isParked = true;
      verification.reason = 'Domain is parked, expired, or placeholder';
      return verification;
    }

    // 4. Business Match Check
    const matches = this.matchesBusiness(html, lead);
    verification.businessMatch = matches;
    if (!matches) {
      verification.reason = 'Page content does not match business name, phone, or location';
      return verification;
    }

    verification.verified = true;
    verification.reason = 'Verified active standalone business website matching name/contact info';
    return verification;
  }

  /**
   * Run full OSINT, Social Media Website Verification, and Contact Enrichment on a lead
   */
  async enrichLead(lead, onStep = null, options = {}) {
    const startTime = new Date().toISOString();
    const cacheKey = `lead_${lead.id || (encodeURIComponent(lead.business_name || '') + '_' + (lead.phone || ''))}`;

    // 14-day Cache lookup (skipped if options.forceRefresh is true)
    if (!options.forceRefresh) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true
        };
      }
    }

    const evidence = {
      decision: 'no_website', // 'has_website' | 'no_website' | 'uncertain'
      search_status: 'ok', // 'ok' | 'search_blocked'
      search_errors: [],
      reason: '',
      website_found: null,
      source_profile: null,
      profiles_inspected: [],
      verification: null,
      enriched_contacts: {
        emails: [],
        primary_email: null,
        email_type: 'generic',
        is_mx_valid: 0,
        holehe_results: [],
        avatar_url: null,
        gravatar_data: null,
        phones: [],
        primary_phone: null,
        whatsapp: null
      },
      timestamp: startTime
    };

    const checkCancelled = () => {
      if (options && typeof options.isCancelled === 'function' && options.isCancelled()) {
        const err = new Error('OSINT_CANCELLED');
        err.name = 'AbortError';
        throw err;
      }
    };

    const safeOnStep = (step, msg) => {
      checkCancelled();
      if (typeof onStep === 'function') onStep(step, msg);
    };

    checkCancelled();

    // Step 1: Discover Social Profiles
    safeOnStep('finding_profiles', 'Searching Facebook, Instagram, LinkedIn, X, TikTok, Linktree...');
    const socialProfiles = await this.discoverSocialProfiles(lead, options);

    checkCancelled();

    // Step 2: Inspect Profiles & Extract Candidate Links
    safeOnStep('scanning_bio', 'Inspecting profile bios, contact cards & external links...');
    const candidateWebsites = [];
    const collectedEmails = new Set(socialProfiles._snippetEmails || []);
    const emailSources = { ...(socialProfiles._emailSources || {}) };
    const collectedPhones = new Set();
    let detectedWhatsApp = null;

    // Check if initial lead.website was a candidate standalone domain
    if (lead.website && !this.isSocialOrDirectory(lead.website)) {
      const norm = this.normalizeUrl(lead.website);
      if (norm) candidateWebsites.push({ url: norm, source: 'maps_initial' });
    }

    // Candidate domains surfaced directly in phone/name search results — verifies whether a real website secretly exists
    for (const link of (socialProfiles._candidateWebsiteLinks || [])) {
      if (!candidateWebsites.some(c => c.url === link)) {
        candidateWebsites.push({ url: link, source: 'search_result_link' });
      }
    }

    // Inspect all found social profiles concurrently
    const profileEntries = Object.entries(socialProfiles).filter(([p, u]) => u && !p.startsWith('_'));
    if (profileEntries.length > 0) {
      const inspectionResults = await Promise.allSettled(
        profileEntries.map(([platform, url]) => this.inspectProfile(url, platform))
      );

      for (const res of inspectionResults) {
        if (res.status !== 'fulfilled') continue;
        const inspected = res.value;
        evidence.profiles_inspected.push({
          platform: inspected.platform,
          url: inspected.url,
          candidateLinks: inspected.candidateLinks,
          emails: inspected.emails,
          phones: inspected.phones,
          whatsapp: inspected.whatsapp,
          error: inspected.error
        });

        for (const link of inspected.candidateLinks) {
          if (!candidateWebsites.some(c => c.url === link)) {
            candidateWebsites.push({ url: link, source: `${inspected.platform}_profile` });
          }
        }

        for (const email of inspected.emails) collectedEmails.add(email);
        for (const phone of inspected.phones) collectedPhones.add(phone);
        if (!detectedWhatsApp && inspected.whatsapp) detectedWhatsApp = inspected.whatsapp;
      }
    }

    // Targeted public web email search if no emails found yet (skipped if search discovery was blocked)
    const isDiscoveryBlocked = (socialProfiles._searchErrors?.length > 0) &&
      (socialProfiles._searchErrors.length >= (socialProfiles._queriesAttempted || 1));

    // Step 2.5: Phone-anchored search queries (run before old fallback queries)
    const phoneRaw = lead.phone_e164 || lead.phone;
    const phoneDigits = String(phoneRaw || '').replace(/\D/g, '');
    if (phoneDigits.length >= 10 && !isDiscoveryBlocked) {
      const d10 = phoneDigits.slice(-10);
      const area = d10.slice(0, 3);
      const prefix = d10.slice(3, 6);
      const line = d10.slice(6);
      const formatParen = `(${area}) ${prefix}-${line}`;
      const formatHyphen = `${area}-${prefix}-${line}`;

      const phoneQueries = [
        `"${formatParen}" email`,
        `"${formatHyphen}" email`
      ];

      for (const pq of phoneQueries) {
        if (options && typeof options.isCancelled === 'function' && options.isCancelled()) break;
        try {
          const pRes = await this.searchEngineQuery(pq, 'yahoo', 6000);
          if (pRes && pRes.snippets && pRes.snippets.length > 0) {
            for (const snip of pRes.snippets) {
              if (!this.snippetMatchesPhone(snip, phoneRaw)) continue;
              const found = this.extractEmails(snip);
              for (const e of found) {
                const lower = e.toLowerCase();
                collectedEmails.add(lower);
                emailSources[lower] = {
                  source: 'phone_anchored_snippet',
                  confidence: 'high',
                  query: pq,
                  snippet: snip.slice(0, 200),
                  found_at: new Date().toISOString(),
                  source_url: null
                };
              }
            }
          }
        } catch (pqErr) {}
      }
    }

    // Old fallback query (only if still no emails found):
    if (collectedEmails.size === 0 && !isDiscoveryBlocked) {
      const cleanName = (lead.business_name || '').replace(/&/g, 'and').trim();
      const emailQ = `"${cleanName}" ${lead.city || ''} email OR contact`;
      const emailRes = await this.searchEngineQuery(emailQ, 'yahoo', 6000);
      if (emailRes.snippets && emailRes.snippets.length > 0) {
        const cleanTokens = cleanName.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3 && !['roofing', 'dental', 'clinic', 'contractor', 'services', 'inc', 'llc', 'company'].includes(w));
        for (const snip of emailRes.snippets) {
          if (!this.snippetMatchesPhone(snip, lead.phone_e164 || lead.phone)) continue;
          const snipLower = snip.toLowerCase();
          const hasAnchor = cleanTokens.length === 0 || cleanTokens.some(tok => snipLower.includes(tok));
          if (!hasAnchor) continue;

          const found = this.extractEmails(snip);
          for (const e of found) {
            const lower = e.toLowerCase();
            collectedEmails.add(lower);
            emailSources[lower] = {
              source: 'phone_anchored_snippet',
              confidence: 'high',
              query: emailQ,
              snippet: snip.slice(0, 200),
              found_at: new Date().toISOString(),
              source_url: null
            };
          }
        }
      }
    }

    // Step 3: Classify & Verify Candidate Websites concurrently
    checkCancelled();
    safeOnStep('verifying_site', 'Verifying candidate website via DNS, HTTP & business match...');
    let verifiedWebsiteUrl = null;
    let verifiedSource = null;
    let hadAmbiguousCandidate = false;

    if (candidateWebsites.length > 0) {
      const verifyResults = await Promise.allSettled(
        candidateWebsites.map(async (candidate) => {
          if (options && typeof options.isCancelled === 'function' && options.isCancelled()) return null;
          const verifyRes = await this.verifyCandidateWebsite(candidate.url, lead);
          return { ...verifyRes, candidateUrl: candidate.url, source: candidate.source };
        })
      );

      for (const vRes of verifyResults) {
        if (vRes.status !== 'fulfilled' || !vRes.value) continue;
        const verifyRes = vRes.value;
        if (verifyRes.verified && !verifiedWebsiteUrl) {
          verifiedWebsiteUrl = verifyRes.candidateUrl;
          verifiedSource = verifyRes.source;
          evidence.verification = verifyRes;
        } else if (verifyRes.dns && !verifyRes.isParked && verifyRes.httpStatus === 200 && !verifyRes.businessMatch) {
          hadAmbiguousCandidate = true;
        }
      }
    }

    // Check if web search queries failed or were blocked
    const searchBlocked = (socialProfiles._searchErrors?.length > 0) &&
      (socialProfiles._searchErrors.length >= (socialProfiles._queriesAttempted || 1)) &&
      evidence.profiles_inspected.length === 0 &&
      candidateWebsites.length === 0;

    if (searchBlocked) {
      evidence.search_status = 'search_blocked';
      evidence.search_errors = socialProfiles._searchErrors;
    } else {
      evidence.search_status = 'ok';
    }

    // Determine Final Decision
    const hasInitialStandaloneWebsite = Boolean(lead.website && !this.isSocialOrDirectory(lead.website));

    if (verifiedWebsiteUrl) {
      evidence.decision = 'has_website';
      evidence.website_found = verifiedWebsiteUrl;
      evidence.source_profile = verifiedSource;
      evidence.reason = `Verified active standalone website found via ${verifiedSource}: ${verifiedWebsiteUrl}`;
    } else if (hasInitialStandaloneWebsite) {
      // If the lead already had an authentic standalone website from maps / initial listing,
      // never overwrite it as 'no_website' just because a quick probe or match was strict/timed out.
      if (hadAmbiguousCandidate || searchBlocked) {
        evidence.decision = 'uncertain';
        evidence.reason = `Initial website domain (${lead.website}) could not be fully verified; flagged for manual review`;
      } else {
        evidence.decision = 'has_website';
        evidence.website_found = this.normalizeUrl(lead.website);
        evidence.reason = `Preserved active website domain from place listing: ${lead.website}`;
      }
    } else if (hadAmbiguousCandidate) {
      evidence.decision = 'uncertain';
      evidence.reason = 'Candidate link found but business content match was inconclusive; flagged for manual review';
    } else if (searchBlocked) {
      evidence.decision = 'uncertain';
      evidence.reason = 'Web search blocked or timed out (429/timeout); could not query search engines. Place records only.';
    } else {
      evidence.decision = 'no_website';
      evidence.reason = evidence.profiles_inspected.length > 0
        ? `Inspected ${evidence.profiles_inspected.length} social profile(s); only social/bio pages found with zero independent website`
        : 'Zero website or social profiles found in public place records';
    }

    // Step 4: Contact Enrichment with parallel MX verification & priority ranking
    checkCancelled();
    safeOnStep('enriching_contacts', 'Verifying email MX records & ranking decision-maker contacts...');
    let primaryEmail = null;
    let emailType = 'generic';
    let isMxValid = 0;

    const emailList = Array.from(collectedEmails);
    if (emailList.length > 0) {
      // Sort emails by Decision Maker priority ranking (Owner/Personal > Direct > Generic)
      emailList.sort((a, b) => this.rankEmail(b) - this.rankEmail(a));

      const mxResults = await Promise.allSettled(
        emailList.map(async (email) => {
          if (options && typeof options.isCancelled === 'function' && options.isCancelled()) return null;
          const mx = await this.verifyMx(email);
          const rank = this.rankEmail(email);
          return { email, mx, rank };
        })
      );

      for (const mRes of mxResults) {
        if (mRes.status === 'fulfilled' && mRes.value && mRes.value.mx) {
          const candidateEmail = mRes.value.email.toLowerCase().trim();

          // Collision guard: check if email is already attached to a different lead
          const collision = this.checkEmailCollision(candidateEmail, lead.id);
          if (collision) {
            if (!emailSources[candidateEmail]) {
              emailSources[candidateEmail] = {
                source: 'phone_anchored_snippet',
                confidence: 'high',
                query: null,
                snippet: null,
                found_at: new Date().toISOString(),
                source_url: null
              };
            }
            emailSources[candidateEmail].status = 'needs_review';
            emailSources[candidateEmail].collision_with_lead_id = collision.lead_id;

            evidence.email_collisions = evidence.email_collisions || [];
            evidence.email_collisions.push({
              email: candidateEmail,
              status: 'needs_review',
              existing_lead_id: collision.lead_id
            });
            continue; // Do NOT attach this email to the new lead!
          }

          primaryEmail = mRes.value.email;
          isMxValid = 1;
          const rank = mRes.value.rank;
          emailType = rank >= 2 ? 'decision_maker' : (rank === 1 ? 'direct' : 'generic');
          break;
        }
      }
    }

    // Holehe Footprint Verification:
    let holeheResults = [];
    if (primaryEmail && isMxValid) {
      checkCancelled();
      safeOnStep('verifying_footprint', `Checking social footprint for ${primaryEmail} via Holehe...`);
      holeheResults = await this.checkHolehe(primaryEmail);
    }

    // Derive contact name from email if decision maker / personal
    let contactName = null;
    if (primaryEmail && emailType === 'decision_maker') {
      const local = primaryEmail.split('@')[0];
      const parts = local.split(/[._-]/).filter(p => p.length > 1 && !/\d/.test(p));
      if (parts.length >= 1 && parts.length <= 2) {
        contactName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      }
    }

    // Gravatar Profile & Avatar Identity Resolution:
    let avatarUrl = null;
    let gravatarData = null;
    if (primaryEmail && isMxValid) {
      checkCancelled();
      safeOnStep('resolving_avatar', `Checking Gravatar identity & avatar for ${primaryEmail}...`);
      try {
        const gravRes = await this.resolveGravatar(primaryEmail);
        if (gravRes && gravRes.found) {
          avatarUrl = gravRes.avatarUrl;
          gravatarData = gravRes;
          if (gravRes.displayName && (!contactName || contactName === lead.business_name)) {
            contactName = gravRes.displayName;
            emailType = 'decision_maker';
          }
        }
      } catch (gravErr) {}
    }

    // Normalize phone & detect carrier if available (fast in-memory path)
    let primaryPhone = lead.phone || Array.from(collectedPhones)[0] || null;
    let phoneType = lead.phone_type || null;
    let carrier = lead.carrier || null;
    let phoneE164 = lead.phone_e164 || null;

    if (primaryPhone && (!phoneType || !carrier)) {
      try {
        const phoneIntel = await phoneService.scanPhoneNumber(primaryPhone, lead.id, { fast: true });
        phoneType = phoneIntel.phone_type;
        carrier = phoneIntel.carrier;
        phoneE164 = phoneIntel.phone_e164;
      } catch (pErr) {}
    }

    evidence.email_sources = emailSources;
    evidence.enriched_contacts = {
      emails: Array.from(collectedEmails),
      email_sources: emailSources,
      primary_email: primaryEmail,
      email_type: emailType,
      is_mx_valid: isMxValid,
      holehe_results: holeheResults,
      avatar_url: avatarUrl,
      gravatar_data: gravatarData,
      phones: Array.from(collectedPhones),
      primary_phone: primaryPhone,
      whatsapp: detectedWhatsApp
    };

    checkCancelled();

    // Save to database
    if (lead.id) {
      // 1. Update Lead
      const isActualNoWebsite = evidence.decision === 'no_website' && (!lead.website || this.isSocialOrDirectory(lead.website));
      const preservedWebsite = verifiedWebsiteUrl || (evidence.decision === 'has_website' ? (lead.website || null) : (lead.website && !this.isSocialOrDirectory(lead.website) ? lead.website : null));

      const updateData = {
        website: preservedWebsite,
        has_no_website: isActualNoWebsite ? 1 : 0,
        no_website_verified: isActualNoWebsite ? 1 : 0,
        website_status: isActualNoWebsite ? 'no_website' : (evidence.decision === 'no_website' ? 'has_website' : evidence.decision),
        social_profiles: JSON.stringify(socialProfiles),
        osint_evidence: JSON.stringify(evidence),
        phone: primaryPhone || lead.phone,
        phone_type: phoneType,
        carrier,
        phone_e164: phoneE164
      };

      if (lead.status === 'discovered') {
        updateData.status = 'enriched';
      }

      Lead.update(lead.id, updateData);

      // 2. Upsert Contact
      if (primaryEmail || primaryPhone || detectedWhatsApp) {
        Contact.upsert({
          lead_id: lead.id,
          email: primaryEmail,
          email_type: emailType,
          contact_name: contactName || lead.business_name,
          contact_title: contactName ? (gravatarData?.jobTitle || 'Owner / Decision Maker') : null,
          phone: primaryPhone,
          whatsapp: detectedWhatsApp,
          social_links: socialProfiles,
          holehe_results: holeheResults,
          avatar_url: avatarUrl,
          gravatar_data: gravatarData,
          is_mx_valid: isMxValid
        });
      }
    }

    const returnData = {
      success: true,
      decision: evidence.decision,
      website: verifiedWebsiteUrl,
      socialProfiles,
      contacts: evidence.enriched_contacts,
      evidence
    };

    // Store in 14-day cache
    this.setCachedResult(cacheKey, returnData, 14);

    return returnData;
  }
}

module.exports = new OsintService();
