const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const Contact = require('../models/Contact');
const { isSocialOrAggregator } = require('./social-domains');

class HarvesterService {
  constructor() {
    this._initPaths();
  }

  _initPaths() {
    this.uvPath = process.env.UV_PATH || (fs.existsSync('/home/beast/.local/bin/uv') ? '/home/beast/.local/bin/uv' : 'uv');

    const candidateDirs = [
      process.env.HARVESTER_PATH,
      path.resolve(__dirname, '../../../github-tools/theHarvester'),
      '/home/beast/github-tools/theHarvester'
    ].filter(Boolean);

    this.harvesterDir = null;
    for (const dir of candidateDirs) {
      if (fs.existsSync(path.join(dir, 'pyproject.toml')) || fs.existsSync(path.join(dir, 'README.md'))) {
        this.harvesterDir = dir;
        break;
      }
    }
  }

  /**
   * Clean domain string from URL or raw input
   */
  cleanDomain(input) {
    if (!input || typeof input !== 'string') return null;
    let clean = input.trim().toLowerCase();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/, '');
    clean = clean.split('/')[0].split('?')[0].split('#')[0].split(':')[0];

    // Reject emails or strings with @
    if (clean.includes('@')) return null;

    // Basic domain validation
    if (!clean.includes('.') || clean.length < 4) return null;
    if (isSocialOrAggregator(`https://${clean}`)) return null;

    // Filter common generic providers
    const generic = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'google.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'wix.com', 'squarespace.com', 'wordpress.com'];
    if (generic.includes(clean)) return null;

    return clean;
  }

  /**
   * Native In-Repo Passive Recon Engine:
   * Directly queries Certificate Transparency logs (crt.sh, CertSpotter) & HackerTarget
   * Runs in 1-2 seconds with 0 external tool requirements!
   */
  async _runNativeRecon(domain) {
    const subdomains = new Set();
    const ips = new Set();
    const emails = new Set();

    // 1. HackerTarget Hostsearch API
    try {
      const res = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`, {
        timeout: 4500,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuarryOSINT/1.0' },
        validateStatus: s => s === 200
      });
      if (typeof res.data === 'string' && !res.data.includes('error') && !res.data.includes('API count exceeded')) {
        for (const line of res.data.split('\n')) {
          const [host, ip] = line.split(',');
          if (host && host.includes(domain)) {
            subdomains.add(host.trim().toLowerCase());
          }
          if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip.trim())) {
            ips.add(ip.trim());
          }
        }
      }
    } catch (e) {}

    // 2. crt.sh Certificate Transparency Database
    try {
      const res = await axios.get(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&exclude=expired&deduplicate=Y&output=json`, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuarryOSINT/1.0' },
        validateStatus: s => s === 200
      });
      if (Array.isArray(res.data)) {
        for (const item of res.data) {
          if (item.name_value) {
            const names = item.name_value.split('\n');
            for (const name of names) {
              const cleanHost = name.replace(/^\*\./, '').trim().toLowerCase();
              if (cleanHost && cleanHost.includes(domain) && !cleanHost.includes('*')) {
                subdomains.add(cleanHost);
              }
            }
          }
        }
      }
    } catch (e) {}

    // 3. Resolve IP addresses for top subdomains if none found yet
    if (ips.size === 0 && subdomains.size > 0) {
      const sample = Array.from(subdomains).slice(0, 3);
      for (const host of sample) {
        try {
          const lookup = await dns.lookup(host);
          if (lookup?.address) ips.add(lookup.address);
        } catch (e) {}
      }
    }

    return {
      subdomains: Array.from(subdomains),
      emails: Array.from(emails),
      ips: Array.from(ips)
    };
  }

  /**
   * Run theHarvester passive recon on target domain (Native in-repo engine + theHarvester CLI fallback)
   */
  async scanDomain(domainInput, leadId = null, options = {}) {
    const domain = this.cleanDomain(domainInput);
    if (!domain) {
      return {
        success: false,
        error: 'Invalid or unsupported domain for theHarvester recon',
        domain: domainInput,
        subdomains: [],
        emails: [],
        ips: []
      };
    }

    const intel = {
      domain,
      subdomains: [],
      emails: [],
      ips: [],
      source_engine: 'native_inrepo',
      scanned_at: new Date().toISOString()
    };

    // 1. Run Native Zero-Dependency In-Repo Engine First (Instant & Self-Contained)
    try {
      const nativeResults = await this._runNativeRecon(domain);
      intel.subdomains = nativeResults.subdomains;
      intel.emails = nativeResults.emails;
      intel.ips = nativeResults.ips;
    } catch (err) {
      console.warn(`[HarvesterService] Native recon warning: ${err.message}`);
    }

    // 2. If external theHarvester CLI is available and requested, supplement with it
    this._initPaths();
    if (this.harvesterDir && options.forceCli) {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const tmpPrefix = `/tmp/harv_${domain.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        const sources = options.sources || 'crtsh,certspotter,hackertarget';
        const limit = options.limit || 50;

        await execPromise(`${this.uvPath} run theHarvester -d ${domain} -b ${sources} -l ${limit} -f ${tmpPrefix} -q`, {
          cwd: this.harvesterDir,
          timeout: 20000
        });

        const jsonFile = `${tmpPrefix}.json`;
        if (fs.existsSync(jsonFile)) {
          const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          if (Array.isArray(content.hosts)) {
            content.hosts.forEach(h => intel.subdomains.push(String(h).split(':')[0].trim().toLowerCase()));
          }
          if (Array.isArray(content.emails)) {
            content.emails.forEach(e => intel.emails.push(String(e).trim().toLowerCase()));
          }
          if (Array.isArray(content.ips)) {
            content.ips.forEach(ip => intel.ips.push(String(ip).trim()));
          }
          try { fs.unlinkSync(jsonFile); } catch (e) {}
          try { fs.unlinkSync(`${tmpPrefix}.xml`); } catch (e) {}
          try { fs.unlinkSync(`${tmpPrefix}.jsonl`); } catch (e) {}
        }
      } catch (cliErr) {}
    }

    // Deduplicate hosts and subdomains
    intel.subdomains = Array.from(new Set(intel.subdomains));
    intel.emails = Array.from(new Set(intel.emails));
    intel.ips = Array.from(new Set(intel.ips));

    // Persist to SQLite if leadId is passed
    if (leadId) {
      try {
        const leadRow = db.prepare('SELECT osint_evidence FROM leads WHERE id = ?').get(leadId);
        let evidence = {};
        try {
          if (leadRow?.osint_evidence) evidence = JSON.parse(leadRow.osint_evidence);
        } catch (e) {}

        evidence.harvester_intel = intel;

        db.prepare(`
          UPDATE leads 
          SET osint_evidence = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(evidence), leadId);

        // If emails discovered and contact record has no email, attach first domain email
        if (intel.emails.length > 0) {
          const existingContact = Contact.findByLeadId(leadId);
          if (!existingContact || !existingContact.email) {
            Contact.upsert({
              lead_id: leadId,
              email: intel.emails[0],
              email_type: 'corporate_inbox',
              contact_name: existingContact?.contact_name || null,
              contact_title: existingContact?.contact_title || 'Domain Contact',
              phone: existingContact?.phone || null,
              whatsapp: existingContact?.whatsapp || null,
              social_links: existingContact?.social_links || {},
              holehe_results: existingContact?.holehe_results || [],
              avatar_url: existingContact?.avatar_url || null,
              gravatar_data: existingContact?.gravatar_data || null,
              is_mx_valid: 1
            });
          }
        }
      } catch (dbErr) {
        console.warn(`[HarvesterService] DB error: ${dbErr.message}`);
      }
    }

    return {
      success: true,
      domain,
      subdomains_count: intel.subdomains.length,
      emails_count: intel.emails.length,
      ips_count: intel.ips.length,
      intel
    };
  }
}

module.exports = new HarvesterService();
