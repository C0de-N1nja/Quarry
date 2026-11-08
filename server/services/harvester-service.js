const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
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
   * Run theHarvester passive recon on target domain
   */
  async scanDomain(domainInput, leadId = null, options = {}) {
    this._initPaths();
    if (!this.harvesterDir) {
      return {
        success: false,
        error: 'theHarvester engine not detected. Configure HARVESTER_PATH in .env or clone theHarvester into github-tools/theHarvester',
        domain: domainInput,
        subdomains: [],
        emails: [],
        ips: []
      };
    }

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

    const tmpPrefix = `/tmp/harv_${domain.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const sources = options.sources || 'crtsh,certspotter,hackertarget';
    const limit = options.limit || 50;
    const timeoutMs = options.timeoutMs || 25000;

    const cmd = `${this.uvPath} run theHarvester -d ${domain} -b ${sources} -l ${limit} -f ${tmpPrefix} -q`;

    const intel = {
      domain,
      subdomains: [],
      emails: [],
      ips: [],
      scanned_at: new Date().toISOString()
    };

    try {
      await execPromise(cmd, {
        cwd: this.harvesterDir,
        timeout: timeoutMs
      });

      // Read output JSON
      const jsonFile = `${tmpPrefix}.json`;
      if (fs.existsSync(jsonFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          if (Array.isArray(content.hosts)) {
            intel.subdomains = content.hosts.map(h => typeof h === 'string' ? h.split(':')[0].trim().toLowerCase() : h).filter(Boolean);
          }
          if (Array.isArray(content.emails)) {
            intel.emails = content.emails.map(e => String(e).trim().toLowerCase()).filter(Boolean);
          }
          if (Array.isArray(content.ips)) {
            intel.ips = content.ips.map(ip => String(ip).trim()).filter(Boolean);
          }
        } catch (e) {}

        // Clean up temp file
        try { fs.unlinkSync(jsonFile); } catch (e) {}
        try { fs.unlinkSync(`${tmpPrefix}.xml`); } catch (e) {}
        try { fs.unlinkSync(`${tmpPrefix}.jsonl`); } catch (e) {}
      }
    } catch (cmdErr) {
      // Check if partial JSON or stdout contains data
      const jsonFile = `${tmpPrefix}.json`;
      if (fs.existsSync(jsonFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          if (Array.isArray(content.hosts)) intel.subdomains = content.hosts;
          if (Array.isArray(content.emails)) intel.emails = content.emails;
          if (Array.isArray(content.ips)) intel.ips = content.ips;
          fs.unlinkSync(jsonFile);
        } catch (e) {}
      }
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
