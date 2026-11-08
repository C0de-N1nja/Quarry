const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const Contact = require('../models/Contact');

/**
 * EmailVerifierService: Bundled standalone Rust engine (reacherhq/check-if-email-exists)
 * Performs syntax validation, disposable domain checks, DNS MX resolution, and SMTP handshake
 * without sending an actual email. Protects inbox sender reputation from bounces.
 */
class EmailVerifierService {
  constructor() {
    this.binaryPath = this.resolveBinary();
  }

  resolveBinary() {
    const candidates = [
      process.env.EMAIL_VERIFIER_PATH,
      path.resolve(__dirname, '../tools/email-verifier/check_if_email_exists'),
      path.resolve(__dirname, '../bin/check_if_email_exists'),
      '/usr/local/bin/check_if_email_exists',
      '/usr/bin/check_if_email_exists'
    ].filter(Boolean);

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          fs.chmodSync(p, 0o755);
        } catch (_) {}
        return p;
      }
    }
    return 'check_if_email_exists';
  }

  isAvailable() {
    return fs.existsSync(this.binaryPath);
  }

  /**
   * Fast Node.js native DNS MX fallback if SMTP port 25 times out on restricted ISPs
   */
  async checkMxFallback(domain) {
    try {
      const records = await dns.resolveMx(domain);
      if (records && records.length > 0) {
        records.sort((a, b) => a.priority - b.priority);
        return {
          accepts_mail: true,
          records: records.map(r => r.exchange)
        };
      }
      return { accepts_mail: false, records: [] };
    } catch (_) {
      return { accepts_mail: false, records: [] };
    }
  }

  /**
   * Verify an email address via bundled check-if-email-exists binary
   * @param {string} email Target email address
   * @param {number|string|null} leadId Associated lead ID for SQLite persistence
   * @param {object} options Optional flags (timeout, proxy, etc.)
   */
  async verifyEmail(email, leadId = null, options = {}) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return {
        ok: false,
        error: 'Invalid email syntax provided',
        deliverability: 'invalid',
        is_deliverable: false
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];
    const bin = this.resolveBinary();

    const args = ['--check-gravatar', 'true'];

    // Proxy support (useful when running on residential networks with blocked port 25)
    const proxyHost = options.proxyHost || process.env.REACHER_PROXY_HOST;
    const proxyPort = options.proxyPort || process.env.REACHER_PROXY_PORT;
    if (proxyHost) {
      args.push('--proxy-host', proxyHost);
      if (proxyPort) args.push('--proxy-port', String(proxyPort));
      if (process.env.REACHER_PROXY_USER) args.push('--proxy-username', process.env.REACHER_PROXY_USER);
      if (process.env.REACHER_PROXY_PASS) args.push('--proxy-password', process.env.REACHER_PROXY_PASS);
    }

    args.push(cleanEmail);

    let rawOutput = null;
    let execTimedOut = false;

    if (fs.existsSync(bin)) {
      try {
        rawOutput = await new Promise((resolve, reject) => {
          const timeoutMs = options.timeoutMs || 7000; // 7s timeout
          execFile(bin, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
            if (err) {
              if (err.killed || err.signal === 'SIGTERM') {
                execTimedOut = true;
              }
              // Even if it exited with code or timed out, check if stdout contains JSON
              if (stdout && stdout.trim().startsWith('{')) {
                return resolve(stdout.trim());
              }
              return reject(err);
            }
            resolve(stdout ? stdout.trim() : null);
          });
        });
      } catch (err) {
        // Continue to fallback
      }
    }

    let parsed = null;
    if (rawOutput) {
      try {
        parsed = JSON.parse(rawOutput);
      } catch (_) {}
    }

    // Determine deliverability metrics
    let reachability = 'unknown';
    let isDeliverable = false;
    let isCatchAll = false;
    let isDisposable = false;
    let isRoleAccount = false;
    let mxAcceptsMail = false;
    let mxRecords = [];
    let gravatarUrl = null;

    if (parsed) {
      reachability = parsed.is_reachable || 'unknown';
      isDeliverable = parsed.smtp?.is_deliverable === true;
      isCatchAll = parsed.smtp?.is_catch_all === true;
      isDisposable = parsed.misc?.is_disposable === true;
      isRoleAccount = parsed.misc?.is_role_account === true;
      mxAcceptsMail = parsed.mx?.accepts_mail === true;
      mxRecords = Array.isArray(parsed.mx?.records) ? parsed.mx.records : [];
      gravatarUrl = parsed.misc?.gravatar_url || null;

      // Refine unknown if MX is valid and syntax is clean
      if (reachability === 'unknown' && mxAcceptsMail && !isDisposable) {
        reachability = 'risky'; // Mail server exists, but port 25 was blocked/filtered
      }
    } else {
      // Fallback: Node native DNS check
      const mx = await this.checkMxFallback(domain);
      mxAcceptsMail = mx.accepts_mail;
      mxRecords = mx.records;
      reachability = mxAcceptsMail ? 'risky' : 'invalid';
      isDeliverable = mxAcceptsMail;
    }

    const result = {
      ok: true,
      email: cleanEmail,
      reachability, // 'safe' | 'risky' | 'invalid' | 'unknown'
      is_deliverable: isDeliverable,
      is_catch_all: isCatchAll,
      is_disposable: isDisposable,
      is_role_account: isRoleAccount,
      mx_accepts_mail: mxAcceptsMail,
      mx_records: mxRecords,
      gravatar_url: gravatarUrl,
      verified_via: fs.existsSync(bin) ? 'reacher-cli-rust' : 'dns-fallback',
      checked_at: new Date().toISOString()
    };

    // Persist to database if leadId provided
    if (leadId) {
      try {
        Contact.upsert({
          lead_id: Number(leadId),
          email: cleanEmail,
          is_mx_valid: mxAcceptsMail ? 1 : 0,
          email_deliverability: reachability,
          email_intel: JSON.stringify(result),
          avatar_url: gravatarUrl
        });
      } catch (dbErr) {
        console.error(`[EmailVerifierService] DB persistence error for lead ${leadId}:`, dbErr.message);
      }
    }

    return result;
  }
}

module.exports = new EmailVerifierService();
