const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

class BlackbirdService {
  constructor() {
    this._initPaths();
  }

  _initPaths() {
    const defaultPython = path.resolve(__dirname, '../.venv/bin/python');
    this.pythonPath = process.env.PYTHON_PATH || (fs.existsSync(defaultPython) ? defaultPython : 'python3');

    // Prioritize in-repo bundled tools first, then env, then external fallbacks
    const candidateDirs = [
      path.resolve(__dirname, '../tools/blackbird'),
      process.env.BLACKBIRD_PATH,
      path.resolve(__dirname, '../../../github-tools/blackbird'),
      '/home/beast/github-tools/blackbird'
    ].filter(Boolean);

    this.blackbirdDir = null;
    this.blackbirdScript = null;
    for (const dir of candidateDirs) {
      const script = path.join(dir, 'blackbird.py');
      if (fs.existsSync(script)) {
        this.blackbirdDir = dir;
        this.blackbirdScript = script;
        break;
      }
    }
  }

  /**
   * Sanitize handle to safe alphanumeric characters
   */
  sanitizeHandle(handle) {
    if (!handle || typeof handle !== 'string') return null;
    const clean = handle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '');
    return clean.length >= 2 ? clean : null;
  }

  /**
   * Run Blackbird OSINT scan on a username handle
   */
  async scanHandle(handle, leadId = null, options = {}) {
    this._initPaths();
    if (!this.blackbirdScript || !this.blackbirdDir) {
      return {
        success: false,
        handle: handle,
        total_found: 0,
        accounts: [],
        error: 'Blackbird OSINT engine not detected. Configure BLACKBIRD_PATH in .env or install blackbird in github-tools/blackbird'
      };
    }

    const cleanHandle = this.sanitizeHandle(handle);
    if (!cleanHandle) {
      return {
        success: false,
        handle: handle,
        total_found: 0,
        accounts: [],
        error: 'Invalid username handle'
      };
    }

    const filterArg = options.category ? `--filter "cat=${options.category}"` : '';
    const timeoutSeconds = options.timeout || 4;
    const maxExecutionMs = options.maxWaitMs || 15000;

    const cmd = `${this.pythonPath} ${this.blackbirdScript} -u "${cleanHandle}" ${filterArg} --timeout ${timeoutSeconds} --json --no-update`;

    const foundAccounts = [];

    try {
      const { stdout } = await execPromise(cmd, {
        cwd: this.blackbirdDir,
        timeout: maxExecutionMs
      });

      // 1. Parse from stdout lines: "✔️  [Platform] URL"
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/[✔✓]\s+\[(.*?)\]\s+(https?:\/\/[^\s]+)/i);
        if (match) {
          foundAccounts.push({
            platform: match[1].trim(),
            url: match[2].trim(),
            category: options.category || 'social'
          });
        }
      }

      // 2. Also check if JSON output file was produced in results/
      try {
        const resultsDir = path.join(this.blackbirdDir, 'results');
        if (fs.existsSync(resultsDir)) {
          const subdirs = fs.readdirSync(resultsDir).filter(d => d.startsWith(`${cleanHandle}_`));
          for (const subdir of subdirs) {
            const jsonPath = path.join(resultsDir, subdir, `${subdir}.json`);
            if (fs.existsSync(jsonPath)) {
              const fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
              if (Array.isArray(fileData)) {
                for (const item of fileData) {
                  if (item.status === 'FOUND' && item.url) {
                    if (!foundAccounts.some(a => a.url === item.url)) {
                      foundAccounts.push({
                        platform: item.name || 'Social Profile',
                        url: item.url,
                        category: item.category || 'social'
                      });
                    }
                  }
                }
              }
              break;
            }
          }
        }
      } catch (e) {}

    } catch (cmdErr) {
      // If timed out or exited with partial output, still check stdout
      if (cmdErr.stdout) {
        const lines = cmdErr.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/[✔✓]\s+\[(.*?)\]\s+(https?:\/\/[^\s]+)/i);
          if (match && !foundAccounts.some(a => a.url === match[2].trim())) {
            foundAccounts.push({
              platform: match[1].trim(),
              url: match[2].trim(),
              category: options.category || 'social'
            });
          }
        }
      }
    }

    const result = {
      success: true,
      handle: cleanHandle,
      total_found: foundAccounts.length,
      accounts: foundAccounts,
      scanned_at: new Date().toISOString()
    };

    // 3. Persist to SQLite if leadId is passed
    if (leadId) {
      try {
        const Contact = require('../models/Contact');
        const existingContact = Contact.findByLeadId(leadId);
        let socialLinks = {};
        try {
          if (existingContact?.social_links) {
            socialLinks = typeof existingContact.social_links === 'string'
              ? JSON.parse(existingContact.social_links)
              : existingContact.social_links;
          }
        } catch (e) {}

        // Map discovered accounts into social_links
        foundAccounts.forEach(acc => {
          const p = acc.platform.toLowerCase();
          if (p.includes('linkedin') && !socialLinks.linkedin) socialLinks.linkedin = acc.url;
          else if (p.includes('twitter') || p.includes('x') || p.includes('flipboard')) {
            if (!socialLinks.twitter) socialLinks.twitter = acc.url;
          } else if (p.includes('instagram') && !socialLinks.instagram) socialLinks.instagram = acc.url;
          else if (p.includes('facebook') && !socialLinks.facebook) socialLinks.facebook = acc.url;
          else if (p.includes('github') && !socialLinks.github) socialLinks.github = acc.url;
          else {
            socialLinks[acc.platform] = acc.url;
          }
        });

        Contact.upsert({
          lead_id: leadId,
          email: existingContact?.email || null,
          email_type: existingContact?.email_type || 'generic',
          contact_name: existingContact?.contact_name || null,
          contact_title: existingContact?.contact_title || null,
          phone: existingContact?.phone || null,
          whatsapp: existingContact?.whatsapp || null,
          social_links: socialLinks,
          holehe_results: existingContact?.holehe_results || [],
          avatar_url: existingContact?.avatar_url || null,
          gravatar_data: existingContact?.gravatar_data || null,
          is_mx_valid: existingContact?.is_mx_valid || 0
        });

        // Update lead osint_evidence
        const leadRow = db.prepare('SELECT osint_evidence FROM leads WHERE id = ?').get(leadId);
        let evidence = {};
        try {
          if (leadRow?.osint_evidence) evidence = JSON.parse(leadRow.osint_evidence);
        } catch (e) {}

        evidence.blackbird_results = result;

        db.prepare(`
          UPDATE leads 
          SET osint_evidence = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(evidence), leadId);
      } catch (dbErr) {
        console.warn(`[BlackbirdService] DB update error: ${dbErr.message}`);
      }
    }

    return result;
  }
}

module.exports = new BlackbirdService();
