const axios = require('axios');
const dns = require('dns').promises;
const db = require('../db/database');
const { isSocialOrAggregator } = require('./social-domains');

/**
 * Website verification states:
 *
 * no_website       - No independent website was listed.
 * social_only      - Only a social profile or directory was listed.
 * active_website  - A website responded or an anti-bot challenge was detected.
 * parked_domain   - The domain appears to be parked or for sale.
 * broken_domain   - The supplied domain appears to be misconfigured or broken.
 * unreachable_domain - The domain could not be reached reliably.
 * uncertain       - Evidence is insufficient for a reliable conclusion.
 *
 * hasNoWebsite:
 *   true  = evidence supports no usable independent website
 *   false = an active website was detected
 *   null  = inconclusive; do not force a yes/no conclusion
 */
class NoWebsiteVerifier {
  isSocialOrAggregator(url) {
    return isSocialOrAggregator(url);
  }

  isParkedOrExpired(html) {
    if (!html || typeof html !== 'string') return false;

    const lower = html.toLowerCase();
    const parkedPhrases = [
      'domain is parked',
      'this domain is for sale',
      'buy this domain',
      'parked free, courtesy of godaddy',
      'domain has expired',
      'registered and protected by',
      'this domain may be for sale'
    ];

    return parkedPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Persist tri-state website classification.
   * Important: null is retained as SQL NULL.
   */
  persistVerification(leadId, hasNoWebsite, status) {
    if (leadId == null) return;

    try {
      db.prepare(`
        UPDATE leads
        SET has_no_website = ?,
            no_website_verified = 1,
            website_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        hasNoWebsite === true ? 1 :
        hasNoWebsite === false ? 0 :
        null,
        status,
        leadId
      );
    } catch (error) {
      console.error(
        '[NoWebsiteVerifier] Could not persist verification:',
        error.message
      );
    }
  }

  makeResult(lead, hasNoWebsite, status, reason, extra = {}) {
    const result = {
      hasNoWebsite,
      status,
      reason,
      ...extra
    };

    this.persistVerification(lead?.id, hasNoWebsite, status);
    return result;
  }

  async verifyLeadWebsite(lead) {
    return this.verifyLead(lead);
  }

  async verifyLead(lead) {
    if (!lead) {
      return {
        hasNoWebsite: null,
        status: 'uncertain',
        reason: 'Lead data is missing'
      };
    }

    const websiteUrl = String(lead.website || '').trim();

    // No URL listed or only a social profile/directory is present.
    if (!websiteUrl) {
      return this.makeResult(
        lead,
        true,
        'no_website',
        'No independent website is listed in the available lead data'
      );
    }

    if (this.isSocialOrAggregator(websiteUrl)) {
      return this.makeResult(
        lead,
        true,
        'social_only',
        'The listed URL appears to be a social profile or directory, not an independent website',
        { isSocialOnly: true }
      );
    }

    // Parse and normalize the provided URL.
    let parsedUrl;

    try {
      const candidate = /^https?:\/\//i.test(websiteUrl)
        ? websiteUrl
        : `https://${websiteUrl}`;

      parsedUrl = new URL(candidate);

      if (!parsedUrl.hostname || !parsedUrl.hostname.includes('.')) {
        throw new Error('Invalid hostname');
      }
    } catch (error) {
      return this.makeResult(
        lead,
        null,
        'uncertain',
        `The supplied website URL could not be parsed: ${error.message}`
      );
    }

    const domain = parsedUrl.hostname.replace(/^www\./i, '');

    // DNS failure check
    try {
      await dns.lookup(domain);
    } catch (dnsError) {
      const isDefinitiveMissingDomain =
        dnsError.code === 'ENOTFOUND' ||
        dnsError.code === 'ENODATA';

      return this.makeResult(
        lead,
        isDefinitiveMissingDomain ? true : null,
        isDefinitiveMissingDomain ? 'broken_domain' : 'uncertain',
        `DNS lookup failed for ${domain} (${dnsError.code || dnsError.message}).`
      );
    }

    // Probe the website. HTTP errors are classified separately from
    // connection failures and timeouts.
    try {
      const response = await axios.get(parsedUrl.toString(), {
        timeout: 6000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      const statusCode = response.status;

      // Authentication and anti-bot responses still indicate a live domain.
      if (statusCode === 401 || statusCode === 403) {
        return this.makeResult(
          lead,
          false,
          'active_website',
          `The website responded with HTTP ${statusCode}; access may be restricted by authentication or an anti-bot system.`,
          { httpStatus: statusCode }
        );
      }

      // A 404 or similar client error does not establish that the business
      // has no website. It indicates a broken or unavailable page.
      if (statusCode >= 400 && statusCode < 500) {
        return this.makeResult(
          lead,
          null,
          'broken_domain',
          `The website returned HTTP ${statusCode}. The site may exist, but the requested page is unavailable.`,
          { httpStatus: statusCode }
        );
      }

      // Server errors are transient/inconclusive.
      if (statusCode >= 500) {
        return this.makeResult(
          lead,
          null,
          'unreachable_domain',
          `The website returned HTTP ${statusCode}; the server may be temporarily unavailable.`,
          { httpStatus: statusCode }
        );
      }

      if (this.isParkedOrExpired(response.data)) {
        return this.makeResult(
          lead,
          true,
          'parked_domain',
          'The domain appears to show a parked, expired, or for-sale landing page.',
          { httpStatus: statusCode }
        );
      }

      return this.makeResult(
        lead,
        false,
        'active_website',
        'An active website response was detected.',
        { httpStatus: statusCode }
      );
    } catch (httpError) {
      // Timeout, connection refusal, TLS errors, and similar failures are
      // inconclusive. Do not classify them as "no website".
      return this.makeResult(
        lead,
        null,
        'unreachable_domain',
        `The domain resolved, but the website could not be reached reliably: ${httpError.code || httpError.message}`
      );
    }
  }
}

module.exports = new NoWebsiteVerifier();
