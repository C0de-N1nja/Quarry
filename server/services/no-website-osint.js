const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const Contact = require('../models/Contact');
const phoneService = require('./phone-service');

const BLOCKED_DOMAINS = [
  'duckduckgo.com',
  'google.com',
  'bing.com',
  'microsoft.com',
  'apple.com',
  'cloudflare.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'pinterest.com',
  'youtube.com',
  'sentry.io',
  'example.com',
  'schema.org',
  'w3.org',
  'wixpress.com',
  'yelp.com',
  'yellowpages.com',
  'bbb.org',
  'angi.com',
  'thumbtack.com',
  'tripadvisor.com',
  'mapquest.com',
  'bizarchive.com',
  'manta.com',
  'domain.com',
  'email.com',
  'github.com',
  'gitlab.com',
  'gravatar.com',
  'automattic.com',
  'wordpress.org',
  'wordpress.com'
];

const BLOCKED_LOCAL_PARTS = [
  'error',
  'error-lite',
  'abuse',
  'postmaster',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'feedback',
  'devnull',
  'bounce',
  'privacy',
  'security',
  'legal',
  'press',
  'media',
  'support',
  'help',
  'admin',
  'webmaster',
  'test',
  'sample',
  'spam',
  'notification',
  'notifications',
  'alert',
  'alerts'
];

const BLOCKED_NAME_WORDS = [
  'error', 'feedback', 'support', 'admin', 'info', 'contact', 'sales',
  'billing', 'office', 'service', 'services', 'team', 'help', 'webmaster',
  'test', 'owner', 'manager', 'none', 'null', 'undefined', 'user',
  'customer', 'account', 'reply', 'hello', 'mail'
];

/**
 * NoWebsiteOsintService: Multi-source OSINT contact harvester
 * specifically engineered for local businesses that DO NOT have a website domain.
 * Scrapes Facebook, Instagram, Google place snippets, and registry metadata for direct Gmail/Yahoo/Outlook emails.
 */
class NoWebsiteOsintService {
  /**
   * Normalize fancy unicode styling and enclosed alphanumeric glyphs into standard ASCII
   */
  normalizeFancyText(text) {
    if (!text || typeof text !== 'string') return '';
    let res = text
      .replace(/[\u{1F130}-\u{1F149}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F130 + 0x41))
      .replace(/[\u{1F150}-\u{1F169}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F150 + 0x41))
      .replace(/[\u{1F170}-\u{1F189}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F170 + 0x41))
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1F1E6 + 0x41));

    res = res.normalize('NFKD');

    return res
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Extract emails from arbitrary raw text with strict domain and local-part blocklists
   */
  extractEmails(text) {
    if (!text || typeof text !== 'string') return [];
    const normalized = this.normalizeFancyText(text);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = normalized.match(emailRegex) || [];
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.mp4', '.pdf'];

    return Array.from(new Set(matches)).filter(email => {
      const lower = email.toLowerCase().trim();
      if (!lower.includes('@')) return false;

      // Filter out static asset extensions masquerading as emails
      if (ignoredExtensions.some(ext => lower.endsWith(ext))) return false;

      const [local, domain] = lower.split('@');
      if (!local || !domain) return false;

      // Filter blocked local parts (e.g. error-lite+..., noreply, abuse, feedback)
      if (BLOCKED_LOCAL_PARTS.some(b => local === b || local.startsWith(b + '+') || local.startsWith(b + '-') || local.startsWith(b + '.'))) {
        return false;
      }

      // Filter blocked domains and subdomains (e.g. duckduckgo.com, google.com, etc.)
      if (BLOCKED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
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
   * Safely derive a human first and last name from an email local-part
   */
  deriveContactName(email) {
    if (!email || !email.includes('@')) return null;
    const local = email.split('@')[0].toLowerCase();
    const rawParts = local.split(/[._-]/);
    const validParts = rawParts.filter(p => /^[a-zA-Z]{2,20}$/.test(p) && !BLOCKED_NAME_WORDS.includes(p));

    if (validParts.length >= 1 && validParts.length <= 2) {
      return validParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return null;
  }

  /**
   * Verify if domain has active MX records
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
   * Harvest contact info for a lead with no official website
   */
  async harvestNoWebsiteContact(lead) {
    const Lead = require('../models/Lead');
    const osintService = require('./osint-service');

    const findings = {
      email: null,
      email_type: 'generic',
      contact_name: null,
      phone: lead.phone || null,
      phone_type: lead.phone_type || null,
      carrier: lead.carrier || null,
      phone_e164: lead.phone_e164 || null,
      is_mx_valid: 0,
      holehe_results: null,
      avatar_url: null,
      gravatar_data: null,
      source: 'none'
    };

    // 1. If lead already has a phone, classify via PhoneInfoga
    if (lead.phone) {
      try {
        const phoneIntel = await phoneService.scanPhoneNumber(lead.phone, lead.id);
        findings.phone_type = phoneIntel.phone_type;
        findings.carrier = phoneIntel.carrier;
        findings.phone_e164 = phoneIntel.phone_e164;
      } catch (e) {}
    }

    // 2. Targeted Multi-Dork Search for Social Profiles & Direct Inboxes
    const queries = [
      `"${lead.business_name}" ${lead.city || ''} email OR contact "@gmail.com" OR "@yahoo.com"`,
      `${lead.business_name} ${lead.city || ''} contact email facebook`,
      `${lead.business_name} ${lead.city || ''} instagram contact email`
    ];

    if (lead.phone) {
      queries.push(`"${lead.phone}" email`);
    }

    const candidatePool = new Set();

    for (const q of queries) {
      if (findings.email && findings.is_mx_valid) break;

      try {
        const searchRes = await osintService.searchEngineQuery(q, 'yahoo', 6000);
        for (const snip of (searchRes.snippets || [])) {
          if (!osintService.snippetMatchesPhone(snip, lead.phone_e164 || lead.phone)) continue;
          const extracted = this.extractEmails(snip);

          for (const candidate of extracted) {
          if (!candidatePool.has(candidate)) {
            candidatePool.add(candidate);
            const hasMx = await this.verifyMx(candidate);
            if (hasMx) {
              findings.email = candidate;
              findings.source = 'social_search';
              findings.is_mx_valid = 1;
              findings.contact_name = this.deriveContactName(candidate);
              findings.email_type = findings.contact_name ? 'decision_maker' : 'generic';

              // Valid MX-verified email discovered - check online platform footprint via Holehe
              try {
                findings.holehe_results = await osintService.checkHolehe(candidate);
              } catch {}

              // Gravatar Identity & Avatar Check
              try {
                const grav = await osintService.resolveGravatar(candidate);
                if (grav && grav.found) {
                  findings.avatar_url = grav.avatarUrl;
                  findings.gravatar_data = grav;
                  if (grav.displayName && (!findings.contact_name || findings.contact_name === lead.business_name)) {
                    findings.contact_name = grav.displayName;
                    findings.email_type = 'decision_maker';
                  }
                }
              } catch {}

              break;
            }
          }
        }
      }
      } catch (searchErr) {
        console.warn(`[NoWebsiteOSINT Search Warning] Query failed for "${lead.business_name}": ${searchErr.message}`);
      }
    }

    // 3. Persist contact ONLY if a valid, MX-verified email was discovered
    if (findings.email && findings.is_mx_valid && lead.id) {
      Contact.upsert({
        lead_id: lead.id,
        email: findings.email,
        email_type: findings.email_type,
        contact_name: findings.contact_name || lead.business_name,
        contact_title: findings.contact_name ? (findings.gravatar_data?.jobTitle || 'Owner / Manager') : null,
        phone: findings.phone,
        is_mx_valid: findings.is_mx_valid,
        holehe_results: findings.holehe_results,
        avatar_url: findings.avatar_url,
        gravatar_data: findings.gravatar_data
      });
    }

    // 4. Update lead record with verified intelligence
    if (lead.id) {
      Lead.update(lead.id, {
        phone_type: findings.phone_type,
        carrier: findings.carrier,
        phone_e164: findings.phone_e164,
        has_no_website: 1,
        no_website_verified: 1
      });
    }

    return findings;
  }
}

module.exports = new NoWebsiteOsintService();

