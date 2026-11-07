const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { parsePhoneNumber } = require('libphonenumber-js');
const db = require('../db/database');

function toIso2Country(country) {
  if (!country) return 'US';
  const c = String(country).toUpperCase().trim();
  if (c === 'UK') return 'GB';
  if (c === 'USA') return 'US';
  if (c === 'AUS') return 'AU';
  if (c === 'CAN') return 'CA';
  return c.slice(0, 2);
}

class PhoneService {
  /**
   * Normalize raw phone input into valid E.164 using the specified country.
   * If invalid for that country, returns null (saving raw digits without forcing wrong country).
   */
  normalizeNumber(rawPhone, defaultCountry = 'US') {
    if (!rawPhone) return null;
    const str = String(rawPhone).trim();
    if (!str) return null;

    const isoCountry = toIso2Country(defaultCountry);

    try {
      const phoneNumber = parsePhoneNumber(str, isoCountry);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format('E.164');
      }
    } catch (err) {
      // If parsing failed with defaultCountry, but number starts with +, try international parse
      if (str.startsWith('+')) {
        try {
          const intlNumber = parsePhoneNumber(str);
          if (intlNumber && intlNumber.isValid()) {
            return intlNumber.format('E.164');
          }
        } catch (e) {}
      }
    }

    return null;
  }

  /**
   * Scan phone number via local phoneinfoga binary
   */
  async scanPhoneNumber(rawPhone, leadId = null, options = { fast: false }) {
    let country = options.country || 'US';
    if (!options.country && leadId) {
      try {
        const leadRow = db.prepare('SELECT country FROM leads WHERE id = ?').get(leadId);
        if (leadRow && leadRow.country) country = leadRow.country;
      } catch (e) {}
    }

    const isoCountry = toIso2Country(country);
    const normalized = this.normalizeNumber(rawPhone, isoCountry);

    const intel = {
      phone_raw: rawPhone,
      phone_e164: normalized,
      phone_formatted: rawPhone,
      country: isoCountry,
      phone_type: 'unknown',
      carrier: 'unknown',
      is_sms_ready: false,
      scanned_at: new Date().toISOString()
    };

    if (!normalized) {
      if (leadId) {
        db.prepare(`
          UPDATE leads 
          SET phone_type = ?, carrier = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(intel.phone_type, intel.carrier, leadId);
      }
      return intel;
    }

    // Run local phoneinfoga binary only when not in fast mode
    if (!options || !options.fast) {
      try {
        const { stdout } = await execPromise(
          `/home/beast/.local/bin/phoneinfoga scan -n "${normalized}" --disable ovh,numverify`,
          { timeout: 3000 }
        );

        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('E164:')) {
            intel.phone_e164 = trimmed.replace('E164:', '').trim();
          } else if (trimmed.startsWith('Local:')) {
            intel.phone_formatted = trimmed.replace('Local:', '').trim();
          } else if (trimmed.startsWith('Country:')) {
            intel.country = trimmed.replace('Country:', '').trim();
          } else if (trimmed.startsWith('Carrier:')) {
            intel.carrier = trimmed.replace('Carrier:', '').trim();
          } else if (trimmed.startsWith('Line type:')) {
            intel.phone_type = trimmed.replace('Line type:', '').trim().toLowerCase();
          }
        }
      } catch (cmdErr) {
        console.warn(`[PhoneService] phoneinfoga scan fallback: ${cmdErr.message}`);
      }
    }

    // Persist to SQLite if leadId is passed
    if (leadId) {
      db.prepare(`
        UPDATE leads 
        SET phone_type = ?, carrier = ?, phone_e164 = COALESCE(?, phone_e164), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(intel.phone_type, intel.carrier, intel.phone_e164, leadId);
    }

    return intel;
  }
}

module.exports = new PhoneService();
