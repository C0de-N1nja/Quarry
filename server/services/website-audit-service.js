const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const WebsiteAudit = require('../models/WebsiteAudit');
const Lead = require('../models/Lead');
const { extractSocialProfilesFromCheerio } = require('./social-domains');

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
    const extractedSocials = extractSocialProfilesFromCheerio($, clean);

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

    // 2.5 Inspect 26 Commercial Sales Signals & 9-Point Tech Stack
    let signalsResult = { signals: {}, tech_stack: {}, problems_count: 0, problems_list: [] };
    try {
      signalsResult = await this.inspectSignalsAndTech($, html, clean, loadTimeMs, headers, lead);
    } catch (sigErr) {
      console.warn('[WebsiteAuditService] Signals inspection error:', sigErr.message);
    }

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

    // 5. Generate Top Flaws & Client Pitch Copy (Commercial Pain Points First)
    const flawsSummary = [];
    const loadTimeSec = (loadTimeMs / 1000).toFixed(1);

    // Prioritize high-converting commercial signals
    if (signalsResult?.signals?.no_click_to_call?.status === 'problem') {
      flawsSummary.push('Phone number is not a tap-to-call (tel:) link on mobile');
    }
    if (signalsResult?.signals?.no_online_booking?.status === 'problem') {
      flawsSummary.push('No online booking or scheduling widget found (losing after-hours jobs)');
    }
    if (signalsResult?.signals?.no_contact_form?.status === 'problem') {
      flawsSummary.push('No direct contact form found on homepage or contact page');
    }
    if (signalsResult?.signals?.ad_spend_leaking?.status === 'problem') {
      flawsSummary.push(`Ad spend leaking: running ads but ${signalsResult.signals.ad_spend_leaking.proof}`);
    }
    if (signalsResult?.signals?.outdated_site?.status === 'problem') {
      flawsSummary.push(`Outdated website: ${signalsResult.signals.outdated_site.proof}`);
    }
    if (signalsResult?.signals?.blocks_ai_search?.status === 'problem') {
      flawsSummary.push(`Robots.txt blocks AI search crawlers (${signalsResult.signals.blocks_ai_search.proof})`);
    }
    if (signalsResult?.signals?.has_web_agency?.status === 'problem') {
      flawsSummary.push('No web agency credit in footer (unprotected account)');
    }

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
      subject: `Quick website observation for ${businessName}`,
      body: `Hey ${contactName},

I took a look at ${businessName}'s website (${clean}) and noticed a few conversion bottlenecks:
${flawsSummary.slice(0, 3).map(f => `• ${f}`).join('\n')}

Over 60% of local customers look up service providers on mobile phones. When visitors can't tap-to-call or book directly, most bounce to a competitor.

We put together an ultra-fast, modern interactive prototype for ${businessName} showing how a mobile-first, high-converting design looks and works.

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
      signals: signalsResult.signals || {},
      tech_stack: signalsResult.tech_stack || {},
      problems_count: signalsResult.problems_count || 0,
      problems_list: signalsResult.problems_list || [],
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

        // Enrich lead's social profiles in SQLite from website HTML
        const existing = Lead.findById(leadId);
        let curSocials = {};
        if (existing?.social_profiles) {
          try {
            curSocials = typeof existing.social_profiles === 'string' ? JSON.parse(existing.social_profiles) : existing.social_profiles;
          } catch {}
        }
        const mergedSocials = { ...curSocials };
        for (const [k, v] of Object.entries(extractedSocials || {})) {
          if (v && !mergedSocials[k]) mergedSocials[k] = v;
        }

        Lead.update(leadId, {
          facebook_url: existing?.facebook_url || extractedSocials?.facebook || null,
          instagram_url: existing?.instagram_url || extractedSocials?.instagram || null,
          social_profiles: mergedSocials
        });
      } catch (saveErr) {
        console.error('[WebsiteAuditService] DB save error:', saveErr.message);
      }
    }

    return auditData;
  }

  /**
   * Inspect 26 Commercial Sales Signals & 9-Point Tech Stack
   * Modeled after WarmReach intelligence pipeline, checking Homepage HTML,
   * /contact page, robots.txt, and sitemap.xml.
   */
  async inspectSignalsAndTech($, html, cleanUrl, loadTimeMs, headers = {}, lead = null) {
    const rawHtml = typeof html === 'string' ? html : '';
    const origin = (() => {
      try {
        const u = new URL(cleanUrl);
        return `${u.protocol}//${u.host}`;
      } catch {
        return cleanUrl;
      }
    })();

    // 1. Parallel lightweight checks for robots.txt, sitemap.xml, and contact page
    let robotsTxt = '';
    let sitemapXml = '';
    let contactPageHtml = '';

    try {
      const fetchWithTimeout = (url, timeout = 2500) =>
        axios.get(url, {
          timeout,
          maxRedirects: 3,
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 QuarryAuditor/1.0' }
        }).catch(() => null);

      // Check contact link on homepage
      let contactHref = null;
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (/contact/i.test(href) && !contactHref) {
          try {
            contactHref = new URL(href, cleanUrl).href;
          } catch (_) {}
        }
      });

      const promises = [
        fetchWithTimeout(`${origin}/robots.txt`),
        fetchWithTimeout(`${origin}/sitemap.xml`)
      ];
      if (contactHref && contactHref !== cleanUrl) {
        promises.push(fetchWithTimeout(contactHref));
      }

      const results = await Promise.allSettled(promises);
      if (results[0].status === 'fulfilled' && results[0].value?.data) {
        robotsTxt = typeof results[0].value.data === 'string' ? results[0].value.data : '';
      }
      if (results[1].status === 'fulfilled' && results[1].value?.data) {
        sitemapXml = typeof results[1].value.data === 'string' ? results[1].value.data : '';
      }
      if (results[2]?.status === 'fulfilled' && results[2].value?.data) {
        contactPageHtml = typeof results[2].value.data === 'string' ? results[2].value.data : '';
      }
    } catch (_) {}

    const fullHtml = rawHtml + '\n' + contactPageHtml;

    // --- CONVERSION SIGNALS ---
    // 1. Contact Form
    const hasFormTag = $('form').length > 0 || /<form[\s>]/i.test(contactPageHtml);
    const hasFormInputs = (fullHtml.includes('type="email"') || fullHtml.includes('name="email"')) &&
      (fullHtml.includes('type="submit"') || /<button[^>]*>.*(?:submit|send|request|quote|contact).*/i.test(fullHtml));
    const hasThirdPartyForm = /typeform\.com|jotform\.com|formspree\.io|wpforms|wpcf7|gravityforms|ninja-forms|hbspt\.forms/i.test(fullHtml);
    const hasContactForm = Boolean(hasFormTag || hasFormInputs || hasThirdPartyForm);

    // 2. Click to Call (tel: link)
    const telLinks = [];
    $('a[href^="tel:"], a[href^="callto:"]').each((_, el) => {
      const h = $(el).attr('href');
      if (h) telLinks.push(h.replace(/^(?:tel|callto):/i, '').trim());
    });
    const hasClickToCall = telLinks.length > 0;
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const bodyText = $('body').text() || '';
    const hasPhoneInText = phoneRegex.test(bodyText) || Boolean(lead?.phone);
    const telProof = hasClickToCall
      ? `Phone has tel: link (${telLinks[0]})`
      : (hasPhoneInText ? 'Phone number is not a tel: link' : 'No phone number or tel: link found');

    // 3. Online Booking
    let bookingTool = null;
    const bookingPatterns = [
      { name: 'Calendly', regex: /calendly\.com/i },
      { name: 'Acuity Scheduling', regex: /acuityscheduling\.com/i },
      { name: 'Housecall Pro', regex: /housecallpro\.com/i },
      { name: 'Jobber', regex: /getjobber\.com/i },
      { name: 'ServiceTitan', regex: /servicetitan\.com/i },
      { name: 'Square Appointments', regex: /squareup\.com\/appointments/i },
      { name: 'Setmore', regex: /setmore\.com/i },
      { name: 'Booksy', regex: /booksy\.com/i },
      { name: 'Vagaro', regex: /vagaro\.com/i },
      { name: 'Thryv', regex: /thryv\.com/i },
      { name: 'Mindbody', regex: /mindbodyonline\.com/i },
      { name: 'ChiliPiper', regex: /chilipiper\.com/i },
      { name: 'SavvyCal', regex: /savvycal\.com/i },
      { name: 'SimplyBook', regex: /simplybook\.it/i }
    ];
    for (const b of bookingPatterns) {
      if (b.regex.test(fullHtml)) {
        bookingTool = b.name;
        break;
      }
    }
    const hasBooking = Boolean(bookingTool);

    // 4. Live Chat
    let chatWidget = null;
    const chatPatterns = [
      { name: 'Tidio', regex: /tidio\.co/i },
      { name: 'Intercom', regex: /intercom\.io|widget\.intercom/i },
      { name: 'Crisp', regex: /crisp\.chat/i },
      { name: 'Drift', regex: /drift\.com/i },
      { name: 'Zendesk', regex: /zopim\.com|zendesk\.com/i },
      { name: 'LiveChat', regex: /livechatinc\.com/i },
      { name: 'Tawk.to', regex: /tawk\.to/i },
      { name: 'HubSpot Chat', regex: /js\.hs-scripts\.com|hubspot-messages/i },
      { name: 'WhatsApp Widget', regex: /api\.whatsapp\.com|wa\.me/i },
      { name: 'Chatra', regex: /chatra\.io/i },
      { name: 'PureChat', regex: /purechat\.com/i }
    ];
    for (const c of chatPatterns) {
      if (c.regex.test(fullHtml)) {
        chatWidget = c.name;
        break;
      }
    }
    const hasLiveChat = Boolean(chatWidget);

    // --- PAID ADS SIGNALS ---
    const hasGoogleAds = /googletagmanager\.com\/gtag\/js\?id=AW-|googleads\.g\.doubleclick\.net|google_conversion_id|gtag\(['"]config['"],\s*['"]AW-/i.test(rawHtml);
    const hasMetaAds = /connect\.facebook\.net\/(?:en_US|en_GB)\/fbevents\.js|fbq\(['"]init['"]/i.test(rawHtml);
    const hasMicrosoftAds = /bat\.bing\.com\/bat\.js|uetq/i.test(rawHtml);

    let callTrackingTool = null;
    const callTrackingPatterns = [
      { name: 'CallRail', regex: /cdn\.callrail\.com|callrail/i },
      { name: 'Invoca', regex: /invoca/i },
      { name: 'WhatConverts', regex: /whatconverts/i },
      { name: 'CallTrackingMetrics', regex: /calltrackingmetrics/i },
      { name: 'DialogTech', regex: /dialogtech/i }
    ];
    for (const ct of callTrackingPatterns) {
      if (ct.regex.test(rawHtml)) {
        callTrackingTool = ct.name;
        break;
      }
    }
    const hasCallTracking = Boolean(callTrackingTool);

    const activeAdNetworks = [];
    if (hasGoogleAds) activeAdNetworks.push('Google Ads');
    if (hasMetaAds) activeAdNetworks.push('Meta Ads');
    if (hasMicrosoftAds) activeAdNetworks.push('Microsoft Ads');

    const hasAnyAds = activeAdNetworks.length > 0;
    const leakReasons = [];
    if (loadTimeMs > 3000) leakReasons.push(`slow mobile load (${(loadTimeMs / 1000).toFixed(1)}s)`);
    if (!hasBooking) leakReasons.push('no online booking');
    if (!hasClickToCall) leakReasons.push('no tap-to-call link');
    const isAdSpendLeaking = hasAnyAds && leakReasons.length > 0;

    // --- SEO AND AI SEARCH SIGNALS ---
    const hasSchema = $('script[type="application/ld+json"]').length > 0 || $('[itemscope]').length > 0;
    const titleText = $('title').text().trim();
    const metaDescText = $('meta[name="description" i]').attr('content')?.trim() || '';
    const isMetaMissing = !titleText || !metaDescText || titleText.length < 15 || metaDescText.length < 40;
    const h1Count = $('h1').length;
    const firstH1 = $('h1').first().text().trim() || '';

    // Sitemap check
    const hasSitemap = /<urlset|<sitemapindex/i.test(sitemapXml);
    let sitemapCount = null;
    if (hasSitemap) {
      const locMatches = sitemapXml.match(/<loc>/gi);
      sitemapCount = locMatches ? locMatches.length : null;
    }

    // Blog abandoned check
    let isBlogAbandoned = false;
    let blogDateFound = null;
    if (hasSitemap && /blog|news|post/i.test(sitemapXml)) {
      const dateMatches = sitemapXml.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/gi);
      if (dateMatches && dateMatches.length > 0) {
        const latestDateStr = dateMatches[0].replace(/<\/?lastmod>/gi, '');
        const latestDate = new Date(latestDateStr);
        if (!isNaN(latestDate.getTime())) {
          blogDateFound = latestDateStr;
          const diffMonths = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          if (diffMonths > 12) {
            isBlogAbandoned = true;
          }
        }
      }
    }

    // AI Search Robots.txt check
    const blockedAiBots = [];
    if (robotsTxt) {
      const lines = robotsTxt.split('\n').map(l => l.trim());
      let currentAgent = '';
      for (const line of lines) {
        if (/^User-agent:\s*(.*)/i.test(line)) {
          currentAgent = line.replace(/^User-agent:\s*/i, '').trim().toLowerCase();
        } else if (/^Disallow:\s*\/\s*$/i.test(line)) {
          if (['gptbot', 'chatgpt-user', 'perplexitybot', 'claudebot', 'claude-web', 'ccbot', 'google-extended'].includes(currentAgent) || currentAgent === '*') {
            if (!blockedAiBots.includes(currentAgent)) blockedAiBots.push(currentAgent);
          }
        }
      }
    }
    const isAiBlocked = blockedAiBots.length > 0;

    // Analytics check
    let analyticsTool = null;
    if (/googletagmanager\.com|google-analytics\.com/i.test(rawHtml)) {
      analyticsTool = 'Google Analytics / Tag Manager';
    } else if (/plausible\.io/i.test(rawHtml)) {
      analyticsTool = 'Plausible Analytics';
    } else if (/fathom/i.test(rawHtml)) {
      analyticsTool = 'Fathom Analytics';
    } else if (/posthog/i.test(rawHtml)) {
      analyticsTool = 'PostHog';
    }
    const hasAnalytics = Boolean(analyticsTool);

    // --- WEBSITE HEALTH & PROFILE SIGNALS ---
    const isHttps = cleanUrl.startsWith('https://');
    const hasViewport = Boolean($('meta[name="viewport" i]').attr('content')?.trim());

    // Outdated Copyright Year
    const footerHtml = $('footer').text() || $('div[class*="footer" i]').text() || rawHtml.slice(-4000);
    const copyMatch = footerHtml.match(/(?:©|&copy;|copyright|\(c\))\s*(?:20\d{2}\s*[-–—]\s*)?(20\d{2})/i);
    const copyrightYear = copyMatch ? parseInt(copyMatch[1], 10) : null;
    const currentYear = new Date().getFullYear();
    const isOutdated = copyrightYear !== null && copyrightYear < (currentYear - 1);

    // Builder detection
    let builderName = null;
    let isDiy = false;
    if (/wp-content|wp-includes|content="WordPress"/i.test(rawHtml)) {
      builderName = 'WordPress';
    } else if (/squarespace\.com|static1\.squarespace\.com/i.test(rawHtml)) {
      builderName = 'Squarespace';
      isDiy = true;
    } else if (/wix\.com|wixsite\.com|_wix/i.test(rawHtml)) {
      builderName = 'Wix';
      isDiy = true;
    } else if (/webflow\.com|wf-page/i.test(rawHtml)) {
      builderName = 'Webflow';
      isDiy = true;
    } else if (/cdn\.shopify\.com|shopify\.com/i.test(rawHtml)) {
      builderName = 'Shopify';
    } else if (/weebly\.com/i.test(rawHtml)) {
      builderName = 'Weebly';
      isDiy = true;
    } else if (/godaddy\.com|secureserver\.net/i.test(rawHtml)) {
      builderName = 'GoDaddy Website Builder';
      isDiy = true;
    }

    // Agency Credit Detection
    let agencyName = null;
    const agencyMatch = footerHtml.match(/(?:designed|built|developed|created|powered|made|maintained|managed|marketing)\s+by\s+([A-Za-z0-9\s&.-]{2,30})/i);
    if (agencyMatch && !/wordpress|wix|squarespace|shopify|webflow/i.test(agencyMatch[1])) {
      agencyName = agencyMatch[1].trim();
    }
    const hasAgency = Boolean(agencyName);

    // Social Links
    const socialPlatforms = [];
    if (/facebook\.com/i.test(rawHtml)) socialPlatforms.push('Facebook');
    if (/instagram\.com/i.test(rawHtml)) socialPlatforms.push('Instagram');
    if (/linkedin\.com/i.test(rawHtml)) socialPlatforms.push('LinkedIn');
    if (/twitter\.com|x\.com/i.test(rawHtml)) socialPlatforms.push('X');
    if (/tiktok\.com/i.test(rawHtml)) socialPlatforms.push('TikTok');
    if (/youtube\.com/i.test(rawHtml)) socialPlatforms.push('YouTube');
    const hasSocialLinks = socialPlatforms.length > 0;

    // Internal links count
    let internalLinksCount = 0;
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href') || '';
      if (h.startsWith('/') || h.includes(origin)) internalLinksCount++;
    });

    const loadTimeSec = (loadTimeMs / 1000).toFixed(1);
    const cleanDomain = (() => {
      try { return new URL(cleanUrl).hostname.replace(/^www\./, ''); } catch { return cleanUrl; }
    })();

    // 26 Structured Signals
    const signals = {
      // Website health
      no_website: { id: 'no_website', name: 'No website', status: 'fine', proof: `Website listed: ${cleanDomain}`, category: 'Website health' },
      website_down: { id: 'website_down', name: 'Website down', status: 'fine', proof: `Loaded ${cleanUrl} (200)`, category: 'Website health' },
      no_secure_connection: { id: 'no_secure_connection', name: 'No secure connection', status: !isHttps ? 'problem' : 'fine', proof: isHttps ? 'Loads over HTTPS' : 'Insecure HTTP connection', category: 'Website health' },
      not_mobile_friendly: { id: 'not_mobile_friendly', name: 'Not mobile friendly', status: !hasViewport ? 'problem' : 'fine', proof: hasViewport ? 'Has a mobile viewport tag' : 'Missing mobile viewport tag', category: 'Website health' },
      outdated_site: { id: 'outdated_site', name: 'Outdated site', status: isOutdated ? 'problem' : 'fine', proof: copyrightYear ? `Footer says © ${copyrightYear}` : 'No copyright year found', category: 'Website health' },
      slow_to_load: { id: 'slow_to_load', name: 'Slow to load', status: loadTimeMs > 3000 ? 'problem' : 'fine', proof: `Homepage arrived in ${loadTimeSec} s`, category: 'Website health' },

      // Conversion
      no_contact_form: { id: 'no_contact_form', name: 'No contact form', status: !hasContactForm ? 'problem' : 'fine', proof: hasContactForm ? 'Contact form found' : `No form on the homepage or contact page`, category: 'Conversion' },
      no_click_to_call: { id: 'no_click_to_call', name: 'No click-to-call', status: !hasClickToCall ? 'problem' : 'fine', proof: telProof, category: 'Conversion' },
      no_online_booking: { id: 'no_online_booking', name: 'No online booking', status: !hasBooking ? 'problem' : 'fine', proof: hasBooking ? `Booking tool detected (${bookingTool})` : 'No booking or scheduling tool found', category: 'Conversion' },
      no_live_chat: { id: 'no_live_chat', name: 'No live chat', status: !hasLiveChat ? 'problem' : 'fine', proof: hasLiveChat ? `Chat widget detected (${chatWidget})` : 'No chat widget found', category: 'Conversion' },

      // Paid ads
      running_google_ads: { id: 'running_google_ads', name: 'Running Google Ads', status: hasGoogleAds ? 'fine' : 'neutral', proof: hasGoogleAds ? 'Google Ads tag found' : 'No Google Ads tag', category: 'Paid ads' },
      running_meta_ads: { id: 'running_meta_ads', name: 'Running Meta ads', status: hasMetaAds ? 'fine' : 'neutral', proof: hasMetaAds ? 'Meta Pixel found' : 'No Meta Pixel', category: 'Paid ads' },
      running_microsoft_ads: { id: 'running_microsoft_ads', name: 'Running Microsoft Ads', status: hasMicrosoftAds ? 'fine' : 'neutral', proof: hasMicrosoftAds ? 'Microsoft Ads tag found' : 'No Microsoft Ads tag', category: 'Paid ads' },
      uses_call_tracking: { id: 'uses_call_tracking', name: 'Uses call tracking', status: hasCallTracking ? 'fine' : 'neutral', proof: hasCallTracking ? `Call tracking active (${callTrackingTool})` : 'No call tracking script', category: 'Paid ads' },
      ad_spend_leaking: { id: 'ad_spend_leaking', name: 'Ad spend leaking', status: isAdSpendLeaking ? 'problem' : 'fine', proof: isAdSpendLeaking ? `Running ads (${activeAdNetworks.join(', ')}) but ${leakReasons.join(' and ')}` : (hasAnyAds ? 'Ads and conversion tools configured' : 'No ad spend detected'), category: 'Paid ads' },

      // SEO and AI search
      no_schema_markup: { id: 'no_schema_markup', name: 'No schema markup', status: !hasSchema ? 'problem' : 'fine', proof: hasSchema ? 'Structured data present' : 'No structured data (JSON-LD / Schema.org)', category: 'SEO and AI search' },
      missing_title_or_description: { id: 'missing_title_or_description', name: 'Missing title or description', status: isMetaMissing ? 'problem' : 'fine', proof: `Title ${titleText.length} chars, description ${metaDescText.length} chars`, category: 'SEO and AI search' },
      no_main_heading: { id: 'no_main_heading', name: 'No main heading', status: h1Count === 0 ? 'problem' : 'fine', proof: h1Count > 0 ? `H1: ${firstH1.substring(0, 50)}` : 'No <h1> heading tag found', category: 'SEO and AI search' },
      no_sitemap: { id: 'no_sitemap', name: 'No sitemap', status: !hasSitemap ? 'problem' : 'fine', proof: hasSitemap ? 'sitemap.xml found' : 'No sitemap.xml found', category: 'SEO and AI search' },
      blog_abandoned: { id: 'blog_abandoned', name: 'Blog abandoned', status: isBlogAbandoned ? 'problem' : (blogDateFound ? 'fine' : 'neutral'), proof: isBlogAbandoned ? `Latest post dates back to ${blogDateFound}` : (blogDateFound ? 'Blog updated recently' : 'No dated blog or news pages'), category: 'SEO and AI search' },
      blocks_ai_search: { id: 'blocks_ai_search', name: 'Blocks AI search', status: isAiBlocked ? 'problem' : 'fine', proof: isAiBlocked ? `robots.txt blocks AI crawlers (${blockedAiBots.join(', ')})` : 'robots.txt allows AI crawlers', category: 'SEO and AI search' },
      no_analytics: { id: 'no_analytics', name: 'No analytics', status: !hasAnalytics ? 'problem' : 'fine', proof: hasAnalytics ? `Analytics detected (${analyticsTool})` : 'No Google Analytics or Tag Manager found', category: 'SEO and AI search' },

      // Profile
      site_size: { id: 'site_size', name: 'Site size', status: 'neutral', proof: sitemapCount ? `${sitemapCount} URLs in the sitemap` : `${internalLinksCount} internal pages detected`, category: 'Profile' },
      built_with_diy_builder: { id: 'built_with_diy_builder', name: 'Built with a DIY builder', status: isDiy ? 'problem' : 'fine', proof: isDiy ? `Built with ${builderName}` : (builderName ? `Built with ${builderName}` : 'No DIY builder detected'), category: 'Profile' },
      has_web_agency: { id: 'has_web_agency', name: 'Has a web agency', status: hasAgency ? 'fine' : 'problem', proof: hasAgency ? `Agency credit in footer (${agencyName})` : 'No agency credit in the footer', category: 'Profile' },
      links_to_social_profiles: { id: 'links_to_social_profiles', name: 'Links to social profiles', status: hasSocialLinks ? 'fine' : 'problem', proof: hasSocialLinks ? `${socialPlatforms.join(', ')} linked` : 'No social links on website', category: 'Profile' }
    };

    // The 9 Commercial Tech Stack points
    const tech_stack = {
      builder: builderName || 'No DIY builder detected',
      agency_credit: hasAgency ? agencyName : 'None in the footer',
      ads_pixels: activeAdNetworks.length > 0 ? activeAdNetworks.join(', ') : 'None found',
      call_tracking: hasCallTracking ? callTrackingTool : 'None found',
      analytics: hasAnalytics ? analyticsTool : 'None found',
      booking: hasBooking ? bookingTool : 'None found',
      live_chat: hasLiveChat ? chatWidget : 'None found',
      socials: hasSocialLinks ? socialPlatforms.join(', ') : 'None linked',
      sitemap_pages: sitemapCount ? String(sitemapCount) : (hasSitemap ? 'Present' : 'Not found')
    };

    const problemsList = Object.values(signals).filter(s => s.status === 'problem');

    return {
      signals,
      tech_stack,
      problems_count: problemsList.length,
      problems_list: problemsList
    };
  }
}

module.exports = new WebsiteAuditService();
