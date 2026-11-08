const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parsePhoneNumber } = require('libphonenumber-js');
const db = require('../db/database');

class WhatsAppService {
  constructor() {
    this.rapidApiKey = this._getRapidApiKey();
    this.apiHost = 'whatsapp-osint.p.rapidapi.com';
    this.baseUrl = 'https://whatsapp-osint.p.rapidapi.com';
  }

  /**
   * Helper: Retrieve RapidAPI key from env or whatslookup .env file
   */
  _getRapidApiKey() {
    if (process.env.RAPIDAPI_KEY) return process.env.RAPIDAPI_KEY;

    try {
      const candidates = [
        path.resolve(__dirname, '../tools/whatslookup/.env'),
        process.env.WHATSLOOKUP_PATH ? path.join(process.env.WHATSLOOKUP_PATH, '.env') : null,
        path.resolve(__dirname, '../../../github-tools/whatslookup/.env'),
        '/home/beast/github-tools/whatslookup/.env'
      ].filter(Boolean);

      for (const dotenvPath of candidates) {
        if (fs.existsSync(dotenvPath)) {
          const content = fs.readFileSync(dotenvPath, 'utf8');
          const match = content.match(/^RAPIDAPI_KEY=(.+)$/m);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Normalize input phone string to pure international digits (e.g. "14088419485")
   */
  normalizeDigits(rawPhone, defaultCountry = 'US') {
    if (!rawPhone) return null;
    const str = String(rawPhone).trim();
    if (!str) return null;

    try {
      const parsed = parsePhoneNumber(str, defaultCountry);
      if (parsed && parsed.isValid()) {
        return parsed.number.replace('+', '');
      }
    } catch (e) {
      if (str.startsWith('+')) {
        try {
          const parsed = parsePhoneNumber(str);
          if (parsed && parsed.isValid()) {
            return parsed.number.replace('+', '');
          }
        } catch (err) {}
      }
    }

    const cleaned = str.replace(/[^\d]/g, '');
    return (cleaned.length >= 8 && cleaned.length <= 15) ? cleaned : null;
  }

  /**
   * Query WhatsLookup / WhatsApp OSINT RapidAPI endpoint
   */
  async _queryEndpoint(endpoint, phoneDigits, method = 'GET', timeout = 4000) {
    if (!this.rapidApiKey) return null;

    const headers = {
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.apiHost
    };

    try {
      if (method === 'GET') {
        const res = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers,
          params: { phone: phoneDigits },
          timeout,
          validateStatus: s => s < 500
        });
        return res.data;
      } else {
        const res = await axios.post(`${this.baseUrl}${endpoint}`, phoneDigits, {
          headers: { ...headers, 'Content-Type': 'text/plain' },
          timeout,
          validateStatus: s => s < 500
        });
        return res.data;
      }
    } catch (err) {
      return null;
    }
  }

  /**
   * Verify WhatsApp registration and fetch OSINT intel for a phone number
   */
  async verifyWhatsApp(rawPhone, leadId = null, options = {}) {
    const defaultCountry = options.country || 'US';
    const digits = this.normalizeDigits(rawPhone, defaultCountry);

    const result = {
      phone_raw: rawPhone,
      phone_digits: digits,
      phone_e164: digits ? `+${digits}` : null,
      direct_url: digits ? `https://wa.me/${digits}` : null,
      is_whatsapp_registered: false,
      is_business: false,
      devices: null,
      status_message: null,
      verified_via: 'none',
      verified_at: new Date().toISOString()
    };

    if (!digits) {
      return result;
    }

    // 1. Try WhatsLookup RapidAPI OSINT endpoints
    try {
      const devicesRes = await this._queryEndpoint('/devices', digits, 'GET', 4000);
      if (devicesRes && typeof devicesRes.devices !== 'undefined') {
        result.is_whatsapp_registered = true;
        result.devices = devicesRes.devices;
        result.verified_via = 'whatslookup_rapidapi';
      }

      const aboutRes = await this._queryEndpoint('/about', digits, 'GET', 3000);
      if (aboutRes && typeof aboutRes === 'object') {
        if (aboutRes.status) result.status_message = aboutRes.status;
        if (!result.is_whatsapp_registered && Object.keys(aboutRes).length > 0) {
          result.is_whatsapp_registered = true;
          result.verified_via = 'whatslookup_rapidapi';
        }
      }

      // Check business verification
      const bizRes = await this._queryEndpoint('/wspic/b64', digits, 'GET', 3000);
      if (bizRes) {
        if (typeof bizRes === 'string' && bizRes.length > 50) {
          result.is_whatsapp_registered = true;
          result.is_business = true;
          result.verified_via = 'whatslookup_rapidapi';
        } else if (bizRes.Info && bizRes.Info.includes('Pictures are only available for business numbers')) {
          // Standard WhatsApp active account (non-business)
          result.is_whatsapp_registered = true;
          result.is_business = false;
          if (result.verified_via === 'none') result.verified_via = 'whatslookup_rapidapi';
        }
      }
    } catch (apiErr) {
      console.warn(`[WhatsAppService] RapidAPI error: ${apiErr.message}`);
    }

    // 2. Fallback heuristic: If carrier or phone type indicates mobile, and number is valid international format
    if (!result.is_whatsapp_registered && digits) {
      try {
        const leadRow = leadId ? db.prepare('SELECT phone_type, carrier FROM leads WHERE id = ?').get(leadId) : null;
        const isMobile = leadRow?.phone_type && leadRow.phone_type.toLowerCase().includes('mobile');
        if (isMobile) {
          result.is_whatsapp_registered = true;
          result.verified_via = 'e164_mobile_heuristic';
        }
      } catch (e) {}
    }

    // 3. Persist to SQLite if leadId is passed
    if (leadId && digits) {
      try {
        const Contact = require('../models/Contact');
        const existingContact = Contact.findByLeadId(leadId);
        Contact.upsert({
          lead_id: leadId,
          email: existingContact?.email || null,
          email_type: existingContact?.email_type || 'generic',
          contact_name: existingContact?.contact_name || null,
          contact_title: existingContact?.contact_title || null,
          phone: existingContact?.phone || rawPhone,
          whatsapp: `+${digits}`,
          social_links: existingContact?.social_links || {},
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

        evidence.whatsapp_intel = result;

        db.prepare(`
          UPDATE leads 
          SET osint_evidence = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(evidence), leadId);
      } catch (dbErr) {
        console.warn(`[WhatsAppService] DB update error: ${dbErr.message}`);
      }
    }

    return result;
  }
}

module.exports = new WhatsAppService();
