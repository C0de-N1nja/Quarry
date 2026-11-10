const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const WebsiteAudit = require('../models/WebsiteAudit');
const Lead = require('../models/Lead');

let pa11y = null;
try {
  pa11y = require('pa11y');
} catch (_) {}

/**
 * WebsiteAuditService: Multi-dimensional website performance, accessibility (Pa11y / WCAG),
 * SEO, and security health auditor for cold outreach prospecting.
 */
class WebsiteAuditService {
  constructor() {
    this.chromiumPath = this.resolveChromium();
  }

  resolveChromium() {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/snap/bin/chromium',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ].filter(Boolean);

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  cleanUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let u = rawUrl.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    try {
      const parsed = new URL(u);
      return parsed.href;
    } catch (_) {
      return null;
    }
  }

  /**
   * Run full audit on target website URL
   * @param {string} targetUrl Target website URL
   * @param {number|string|null} leadId Associated lead ID
   * @param {object} options Extra flags
   */
  async auditWebsite(targetUrl, leadId = null, options = {}) {
    const clean = this.cleanUrl(targetUrl);
    if (!clean) {
      throw new Error('Invalid or missing website URL');
    }

    let lead = null;
    if (leadId) {
      lead = Lead.findById(leadId);
    }

    const startTime = Date.now();
    let response = null;
    let html = '';
    let loadTimeMs = 0;
    let ttfbMs = 0;
    let pageSizeBytes = 0;
    let headers = {};
    let isHttps = clean.startsWith('https://');

    // 1. Fetch live page with timing metrics
    try {
      const fetchStart = Date.now();
      response = await axios.get(clean, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 QuarryAuditor/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        maxRedirects: 5,
        validateStatus: () => true // Allow non-200 responses for audit
      });
      loadTimeMs = Date.now() - fetchStart;
      ttfbMs = Math.round(loadTimeMs * 0.4); // Estimated TTFB
      html = response.data || '';
      headers = response.headers || {};
      pageSizeBytes = Buffer.byteLength(typeof html === 'string' ? html : '', 'utf8');
    } catch (fetchErr) {
      loadTimeMs = Date.now() - startTime;
      html = '';
      headers = {};
    }

    // 2. DOM & SEO & Security Analysis via Cheerio
    const $ = cheerio.load(typeof html === 'string' ? html : '');

    const title = $('title').text().trim() || null;
    const metaDescription = $('meta[name="description" i]').attr('content')?.trim() || null;
    const viewport = $('meta[name="viewport" i]').attr('content')?.trim() || null;
    const canonical = $('link[rel="canonical" i]').attr('href')?.trim() || null;
    const h1Elements = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const ogTitle = $('meta[property="og:title" i]').attr('content')?.trim() || null;
    const ogImage = $('meta[property="og:image" i]').attr('content')?.trim() || null;

    // Images and Accessibility checks in DOM
    const allImages = $('img');
    const totalImages = allImages.length;
    let missingAltCount = 0;
    const sampleMissingAlts = [];

    allImages.each((_, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (alt === undefined || alt === null || alt.trim() === '') {
        missingAltCount++;
        if (sampleMissingAlts.length < 3 && src) {
          sampleMissingAlts.push(src.substring(0, 80));
        }
      }
    });

    // Form inputs and buttons accessibility
    const inputs = $('input:not([type="hidden"]), select, textarea');
    let unlabelledInputs = 0;
    inputs.each((_, el) => {
      const id = $(el).attr('id');
      const ariaLabel = $(el).attr('aria-label');
      const ariaLabelledBy = $(el).attr('aria-labelledby');
      const placeholder = $(el).attr('placeholder');
      if (!ariaLabel && !ariaLabelledBy) {
        if (!id || $(`label[for="${id}"]`).length === 0) {
          unlabelledInputs++;
        }
      }
    });

    // Security Headers
    const hsts = Boolean(headers['strict-transport-security']);
    const xFrameOptions = headers['x-frame-options'] || null;
    const xContentTypeOptions = headers['x-content-type-options'] || null;
    const csp = Boolean(headers['content-security-policy']);

    // 3. Deep WCAG Accessibility Audit via Pa11y (if available)
    let pa11yIssues = [];
    if (pa11y && this.chromiumPath) {
      try {
        const pa11yResult = await pa11y(clean, {
          chromeLaunchConfig: {
            executablePath: this.chromiumPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
          },
          timeout: 10000,
          standard: 'WCAG2AA'
        });
        if (Array.isArray(pa11yResult.issues)) {
          pa11yIssues = pa11yResult.issues.map(iss => ({
            code: iss.code,
            type: iss.type, // 'error', 'warning', 'notice'
            message: iss.message,
            selector: iss.selector,
            context: iss.context
          }));
        }
      } catch (pa11yErr) {
        // Graceful fallback to DOM checks
      }
    }

    // Combine DOM accessibility warnings if Pa11y returned few or failed
    if (pa11yIssues.length === 0 && (missingAltCount > 0 || unlabelledInputs > 0)) {
      if (missingAltCount > 0) {
        pa11yIssues.push({
          code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
          type: 'error',
          message: `${missingAltCount} image(s) missing alt text description. Screen readers cannot describe these images to visually impaired users.`,
          selector: 'img:not([alt])'
        });
      }
      if (unlabelledInputs > 0) {
        pa11yIssues.push({
          code: 'WCAG2AA.Principle1.Guideline1_3.1_3_1.H44',
          type: 'error',
          message: `${unlabelledInputs} form input(s) missing corresponding <label> tags.`,
          selector: 'input:not([id])'
        });
      }
    }

    // 4. Calculate Scores (0 - 100)
    // Performance Score
    let performanceScore = 100;
    if (loadTimeMs > 6000) performanceScore = 25;
    else if (loadTimeMs > 4500) performanceScore = 40;
    else if (loadTimeMs > 3000) performanceScore = 55;
    else if (loadTimeMs > 2000) performanceScore = 75;
    else if (loadTimeMs > 1000) performanceScore = 88;
    else performanceScore = 96;

    if (pageSizeBytes > 4 * 1024 * 1024) performanceScore = Math.max(15, performanceScore - 20);
    else if (pageSizeBytes > 2 * 1024 * 1024) performanceScore = Math.max(25, performanceScore - 10);

    // Accessibility Score
    const errorCount = pa11yIssues.filter(i => i.type === 'error').length;
    const warningCount = pa11yIssues.filter(i => i.type === 'warning').length;
    let accessibilityScore = Math.max(10, 100 - (errorCount * 6 + warningCount * 2));
    if (pa11yIssues.length === 0 && missingAltCount === 0) accessibilityScore = 95;

    // SEO Score
    let seoScore = 100;
    if (!title) seoScore -= 25;
    else if (title.length < 15 || title.length > 70) seoScore -= 10;

    if (!metaDescription) seoScore -= 25;
    else if (metaDescription.length < 50 || metaDescription.length > 160) seoScore -= 8;

    if (!viewport) seoScore -= 25; // Mobile-friendly penalty
    if (h1Elements.length === 0) seoScore -= 15;
    else if (h1Elements.length > 1) seoScore -= 8; // Multiple H1s penalty
    if (missingAltCount > 0) seoScore -= 10;
    seoScore = Math.max(15, Math.min(100, seoScore));

    // Security Score
    let securityScore = 0;
    if (isHttps) securityScore += 40;
    if (hsts) securityScore += 25;
    if (xContentTypeOptions) securityScore += 15;
    if (xFrameOptions) securityScore += 10;
    if (csp) securityScore += 10;
    securityScore = Math.min(100, securityScore);

    const overallScore = Math.round((performanceScore * 0.35) + (accessibilityScore * 0.3) + (seoScore * 0.25) + (securityScore * 0.1));

    // 5. Generate Top Flaws & Client Pitch Copy
    const flawsSummary = [];
    const loadTimeSec = (loadTimeMs / 1000).toFixed(1);

    if (loadTimeMs > 3000) {
      flawsSummary.push(`Mobile load speed is ${loadTimeSec}s (exceeds Google 3.0s guideline)`);
    }
    if (errorCount > 0) {
      flawsSummary.push(`${errorCount} accessibility issue(s) detected (contrast, labels, or structure)`);
    }
    if (!metaDescription) {
      flawsSummary.push('Missing meta description tag in Google search engine snippets');
    }
    if (!viewport) {
      flawsSummary.push('Missing mobile viewport configuration tag (causes horizontal zoom glitches on smartphones)');
    }
    if (missingAltCount > 0) {
      flawsSummary.push(`${missingAltCount} image(s) missing alt text (hurts Google Image ranking & screen-readers)`);
    }
    if (h1Elements.length === 0) {
      flawsSummary.push('Missing primary <h1> heading tag for search engine hierarchy');
    }
    if (!isHttps) {
      flawsSummary.push('Site is not served over secure HTTPS (triggers "Not Secure" warning in Chrome)');
    }

    const businessName = lead?.business_name || 'your business';
    const contactName = lead?.contact_name || 'there';

    const pitchDraft = {
      subject: `Speed & ADA health report for ${businessName} (${loadTimeSec}s load time)`,
      body: `Hey ${contactName},

I took a look at ${businessName}'s website (${clean}) and ran an automated performance and accessibility audit.

A couple of critical items stood out:
${flawsSummary.slice(0, 3).map(f => `• ${f}`).join('\n')}

Google data shows that over 53% of local mobile visitors leave when a contractor or service site takes longer than 3 seconds to load, which directly impacts quote inquiries.

We put together an ultra-fast, modern interactive prototype for ${businessName} showing how a sub-second, ADA-compliant redesign looks and performs on mobile.

You can preview the live mockup here: {{mockup_url}}

Would you be open to a quick 5-minute walk-through this week?

Best regards,
Rehan`
    };

    const auditData = {
      lead_id: leadId ? Number(leadId) : null,
      url: clean,
      performance_score: performanceScore,
      accessibility_score: accessibilityScore,
      seo_score: seoScore,
      security_score: securityScore,
      overall_score: overallScore,
      load_time_ms: loadTimeMs,
      load_time_sec: loadTimeSec,
      ttfb_ms: ttfbMs,
      page_size_kb: Math.round(pageSizeBytes / 1024),
      violations_count: pa11yIssues.length,
      error_count: errorCount,
      warning_count: warningCount,
      flaws_summary: flawsSummary,
      accessibility_issues: pa11yIssues.slice(0, 25), // Top 25 issues
      seo: {
        title,
        title_length: title ? title.length : 0,
        meta_description: metaDescription,
        has_meta_description: Boolean(metaDescription),
        viewport,
        has_viewport: Boolean(viewport),
        h1_tags: h1Elements,
        h1_count: h1Elements.length,
        canonical,
        total_images: totalImages,
        missing_alt_count: missingAltCount,
        sample_missing_alts: sampleMissingAlts,
        og_title: ogTitle,
        og_image: ogImage
      },
      security: {
        is_https: isHttps,
        hsts,
        x_frame_options: xFrameOptions,
        csp,
        x_content_type_options: xContentTypeOptions
      },
      pitch_draft: pitchDraft,
      audited_at: new Date().toISOString()
    };

    // Save to SQLite
    if (leadId) {
      try {
        WebsiteAudit.save({
          lead_id: Number(leadId),
          url: clean,
          performance_score: performanceScore,
          accessibility_score: accessibilityScore,
          seo_score: seoScore,
          security_score: securityScore,
          overall_score: overallScore,
          load_time_ms: loadTimeMs,
          violations_count: pa11yIssues.length,
          flaws_summary: flawsSummary,
          audit_data: auditData
        });
      } catch (saveErr) {
        console.error('[WebsiteAuditService] DB save error:', saveErr.message);
      }
    }

    return auditData;
  }
}

module.exports = new WebsiteAuditService();
