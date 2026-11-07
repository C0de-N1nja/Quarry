const axios = require('axios');
const dns = require('dns').promises;
const db = require('../db/database');

const { isSocialOrAggregator } = require('./social-domains');

/**
 * NoWebsiteVerifier: Eliminates false positives by thoroughly verifying
 * whether a business genuinely has NO website or has a dead/parked domain.
 */
class NoWebsiteVerifier {
  /**
   * Determine if a URL is an aggregator or social profile rather than an independent site
   */
  isSocialOrAggregator(url) {
    return isSocialOrAggregator(url);
  }

  /**
   * Check if page content indicates a parked or expired domain
   */
  isParkedOrExpired(html) {
    if (!html || typeof html !== 'string') return false;
    const lower = html.toLowerCase();
    const parkedPhrases = [
      'domain is parked',
      'this domain is for sale',
      'buy this domain',
      'parked free, courtesy of godaddy',
      'domain has expired',
      'website is temporarily unavailable',
      'registered and protected by'
    ];
    return parkedPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Thorough verification of a lead
   */
  async verifyLeadWebsite(lead) {
    return this.verifyLead(lead);
  }

  async verifyLead(lead) {
    if (!lead) return { hasNoWebsite: false, status: 'invalid' };

    let websiteUrl = (lead.website || '').trim();

    // 1. If website is blank or points to social/aggregator
    if (!websiteUrl || this.isSocialOrAggregator(websiteUrl)) {
      const result = {
        hasNoWebsite: true,
        isSocialOnly: Boolean(websiteUrl && this.isSocialOrAggregator(websiteUrl)),
        status: !websiteUrl ? 'no_website' : 'social_only',
        reason: !websiteUrl ? 'No website listed in place records' : 'Only social profile / directory listed'
      };

      this.persistVerification(lead.id, result.hasNoWebsite, result.status);
      return result;
    }

    // 2. Normalize domain and probe DNS
    let domain = websiteUrl.replace(/^https?:\/\//i, '').split('/')[0].trim();
    try {
      await dns.lookup(domain);
    } catch (dnsErr) {
      // Domain does not resolve (NXDOMAIN)
      const result = {
        hasNoWebsite: true,
        status: 'broken_domain',
        reason: `DNS failed for ${domain} (${dnsErr.code || 'NXDOMAIN'})`
      };
      this.persistVerification(lead.id, result.hasNoWebsite, result.status);
      return result;
    }

    // 3. Probe HTTP response
    try {
      let targetUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const response = await axios.get(targetUrl, {
        timeout: 4500,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (response.status >= 400) {
        // If HTTP 403/401, domain is active with bot/Cloudflare challenge
        const isBotChallenge = response.status === 403 || response.status === 401;
        const result = {
          hasNoWebsite: !isBotChallenge,
          status: isBotChallenge ? 'active_website' : 'broken_domain',
          reason: isBotChallenge ? 'Domain active with anti-bot challenge (HTTP 403)' : `HTTP ${response.status} returned by domain`
        };
        this.persistVerification(lead.id, result.hasNoWebsite, result.status);
        return result;
      }

      // Check for parked page signature
      if (this.isParkedOrExpired(response.data)) {
        const result = {
          hasNoWebsite: true,
          status: 'parked_domain',
          reason: 'Domain points to parked registrar landing page'
        };
        this.persistVerification(lead.id, result.hasNoWebsite, result.status);
        return result;
      }

      // Live website verified
      const result = {
        hasNoWebsite: false,
        status: 'active_website',
        reason: 'Active live website detected'
      };
      this.persistVerification(lead.id, result.hasNoWebsite, result.status);
      return result;
    } catch (httpErr) {
      // Domain resolved via DNS, but HTTP probe timed out or had connection error
      const result = {
        hasNoWebsite: false,
        status: 'unreachable_domain',
        reason: `Domain connection timed out or refused (${httpErr.message})`
      };
      this.persistVerification(lead.id, result.hasNoWebsite, result.status);
      return result;
    }
  }

  persistVerification(leadId, hasNoWebsite, status) {
    try {
      db.prepare(`
        UPDATE leads 
        SET has_no_website = ?,
            no_website_verified = 1,
            website_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(hasNoWebsite ? 1 : 0, status, leadId);
    } catch (e) {}
  }
}

module.exports = new NoWebsiteVerifier();
