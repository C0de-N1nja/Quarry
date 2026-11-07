const Mockup = require('../models/Mockup');
const Lead = require('../models/Lead');
const Setting = require('../models/Setting');

/**
 * Mockup Service: Generates high-converting, ultra-fast landing page prototypes
 * tailored dynamically to each lead's niche, reviews, phone number, and location.
 */
class MockupService {
  /**
   * Get existing mockup or generate on the fly
   */
  async getOrGenerate(leadId, options = {}) {
    let existing = Mockup.findByLeadId(leadId);
    if (existing && !options.forceRegenerate) {
      return existing;
    }

    const lead = Lead.findById(leadId);
    if (!lead) {
      throw new Error(`Lead #${leadId} not found`);
    }

    return this.generateAndSave(lead, options);
  }

  /**
   * Generate HTML and save to database
   */
  generateAndSave(lead, options = {}) {
    const style = options.template_style || 'modern';
    const headline = options.headline || null;
    const html = this.renderMockupHtml(lead, { ...options, template_style: style, headline });

    const saved = Mockup.save({
      lead_id: lead.id,
      html_content: html,
      headline: headline || `Premium ${lead.category || 'Services'} in ${lead.city || 'Your Area'}`,
      template_style: style
    });

    return saved;
  }

  /**
   * Detect industry archetype from business category / name
   */
  detectNiche(category = '', name = '') {
    const text = `${category} ${name}`.toLowerCase();
    if (text.includes('roof') || text.includes('gutter') || text.includes('shingle')) {
      return {
        key: 'roofing',
        name: 'Roofing & Exterior Specialists',
        headline: 'Reliable Roofing & Storm Restoration',
        sub: 'Built to withstand any season. Trusted by homeowners and commercial properties across the valley.',
        service1: 'Full Roof Replacements',
        desc1: 'Premium architectural shingles, slate, and standing-seam metal roofing with lifetime durability.',
        service2: 'Emergency Leak & Storm Repair',
        desc2: '24/7 rapid response team to halt water damage and secure your home within hours.',
        service3: 'Free 21-Point Inspection',
        desc3: 'Drone and manual attic-to-eaves inspection with photographic evidence and honest pricing.',
        calcUnit: 'Roof Area (Sq Ft)',
        basePrice: 5500,
        ratePerUnit: 3.8
      };
    } else if (text.includes('plumb') || text.includes('drain') || text.includes('pipe') || text.includes('water heater')) {
      return {
        key: 'plumbing',
        name: 'Master Plumbing & Drain Services',
        headline: 'Fast, Licensed & Dependable Plumbing',
        sub: 'Emergency plumbing and modern installations done right the first time.',
        service1: 'Emergency Drain & Leak Repair',
        desc1: 'Hydro jetting, camera line inspections, and rapid leak mitigation.',
        service2: 'Water Heater Install & Repair',
        desc2: 'Tankless and standard water heater installations with high-efficiency warranties.',
        service3: 'Whole-Home Repiping & Fixtures',
        desc3: 'Modern PEX water line conversions and luxury kitchen & bath fixture installs.',
        calcUnit: 'Fixtures / Fixture Count',
        basePrice: 350,
        ratePerUnit: 180
      };
    } else if (text.includes('hvac') || text.includes('heat') || text.includes('air condition') || text.includes('cooling')) {
      return {
        key: 'hvac',
        name: 'Heating & Air Conditioning Pros',
        headline: 'Maximum Indoor Comfort All Year Long',
        sub: 'High-efficiency AC and heating solutions tailored for energy savings and clean airflow.',
        service1: 'AC & Heat Pump Installations',
        desc1: 'SEER2-rated high-efficiency heat pumps and air conditioning systems.',
        service2: 'Same-Day Emergency Service',
        desc2: 'Rapid diagnostics and component replacements when your system goes down.',
        service3: 'Annual Maintenance & Air Quality',
        desc3: 'Comprehensive seasonal tune-ups, duct sanitization, and HEPA filtration.',
        calcUnit: 'System Size (Tons / Zones)',
        basePrice: 1200,
        ratePerUnit: 1400
      };
    } else {
      return {
        key: 'general',
        name: 'Contractor & Local Services',
        headline: 'Quality Craftsmanship & Reliable Service',
        sub: 'Dedicated to exceptional customer service, transparent upfront pricing, and lasting results.',
        service1: 'Comprehensive Installations',
        desc1: 'Professional installations executed to the highest standards with guaranteed warranties.',
        service2: 'Emergency Maintenance & Repair',
        desc2: 'Prompt, dependable repair dispatch whenever unexpected issues arise.',
        service3: 'Free Consultations & Estimates',
        desc3: 'Detailed, transparent project quotes with no hidden fees or surprise upcharges.',
        calcUnit: 'Estimated Project Scope',
        basePrice: 2000,
        ratePerUnit: 500
      };
    }
  }

  /**
   * Render complete self-contained HTML
   */
  renderMockupHtml(lead, options = {}) {
    const niche = this.detectNiche(lead.category, lead.business_name);
    const style = options.template_style || 'modern';
    const settings = Setting.getAll();
    const developerName = settings.sender_name || 'Rehan';
    const developerPortfolio = settings.my_portfolio || 'https://github.com';

    const businessName = lead.business_name || 'Premier Local Pro';
    const city = lead.city || 'Local Area';
    const phone = lead.phone || '(555) 019-2834';
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const rating = lead.rating ? Number(lead.rating).toFixed(1) : '4.9';
    const reviews = lead.reviews_count ? Number(lead.reviews_count).toLocaleString() : '120+';
    const mapsLink = lead.maps_link || '#';
    const headline = options.headline || `${niche.headline} in ${city}`;

    // Color theme variables
    let themeVars = '';
    if (style === 'clean') {
      themeVars = `
        --bg-main: #f8fafc;
        --bg-card: #ffffff;
        --bg-header: rgba(255, 255, 255, 0.95);
        --text-main: #0f172a;
        --text-sub: #475569;
        --accent: #2563eb;
        --accent-hover: #1d4ed8;
        --accent-glow: rgba(37, 99, 235, 0.15);
        --border-color: #e2e8f0;
        --badge-bg: #eff6ff;
        --badge-text: #1d4ed8;
        --calc-bg: #f1f5f9;
      `;
    } else if (style === 'contractor') {
      themeVars = `
        --bg-main: #0c1427;
        --bg-card: #152238;
        --bg-header: rgba(12, 20, 39, 0.95);
        --text-main: #f8fafc;
        --text-sub: #94a3b8;
        --accent: #f59e0b;
        --accent-hover: #d97706;
        --accent-glow: rgba(245, 158, 11, 0.2);
        --border-color: #273752;
        --badge-bg: rgba(245, 158, 11, 0.12);
        --badge-text: #fbbf24;
        --calc-bg: #1c2c47;
      `;
    } else {
      // Modern slate (Default)
      themeVars = `
        --bg-main: #090d16;
        --bg-card: #111827;
        --bg-header: rgba(9, 13, 22, 0.92);
        --text-main: #f9fafb;
        --text-sub: #9ca3af;
        --accent: #06b6d4;
        --accent-hover: #0891b2;
        --accent-glow: rgba(6, 182, 212, 0.25);
        --border-color: #1f2937;
        --badge-bg: rgba(6, 182, 212, 0.1);
        --badge-text: #22d3ee;
        --calc-bg: #151e30;
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} | ${niche.name} in ${city}</title>
  <meta name="description" content="Top-rated ${lead.category || niche.name} in ${city}. Over ${reviews} 5-star reviews. Call ${phone} for an instant estimate.">
  <style>
    :root {
      ${themeVars}
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: var(--bg-main);
      color: var(--text-main);
      line-height: 1.5;
      padding-bottom: 70px;
    }
    a {
      text-decoration: none;
      color: inherit;
    }

    /* Developer Demo Topbar */
    .dev-banner {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #ffffff;
      padding: 8px 16px;
      font-size: 13px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .dev-banner-btn {
      background: #ffffff;
      color: #1e1b4b;
      font-weight: 600;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      transition: opacity 0.2s;
    }
    .dev-banner-btn:hover {
      opacity: 0.9;
    }

    /* Header Nav */
    header {
      background: var(--bg-header);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 37px;
      z-index: 90;
      padding: 14px 24px;
    }
    .header-inner {
      max-width: 1160px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-loc {
      font-size: 11px;
      color: var(--text-sub);
    }
    .header-cta {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-phone {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--accent);
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 14px var(--accent-glow);
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }

    /* Hero Section */
    .hero {
      max-width: 1160px;
      margin: 0 auto;
      padding: 56px 24px 40px;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 48px;
      align-items: center;
    }
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding-top: 32px;
        gap: 36px;
      }
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--badge-bg);
      color: var(--badge-text);
      font-size: 12px;
      font-weight: 600;
      border-radius: 999px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
    }
    .hero h1 {
      font-size: 40px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 18px;
    }
    @media (max-width: 640px) {
      .hero h1 {
        font-size: 28px;
      }
    }
    .hero p {
      font-size: 16px;
      color: var(--text-sub);
      margin-bottom: 28px;
      max-width: 520px;
    }
    .trust-badges {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-sub);
    }
    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-large {
      padding: 13px 24px;
      font-size: 15px;
      border-radius: 8px;
    }
    .btn-secondary {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      font-weight: 600;
      font-size: 14px;
      padding: 12px 20px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .btn-secondary:hover {
      border-color: var(--accent);
    }

    /* Calculator Widget Card */
    .calc-card {
      background: var(--calc-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }
    .calc-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .calc-desc {
      font-size: 12px;
      color: var(--text-sub);
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-sub);
      margin-bottom: 6px;
    }
    select, input[type="text"], input[type="tel"] {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    select:focus, input:focus {
      border-color: var(--accent);
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .price-box {
      background: var(--bg-card);
      border: 1px dashed var(--accent);
      border-radius: 10px;
      padding: 14px;
      text-align: center;
      margin: 18px 0;
    }
    .price-tag {
      font-size: 26px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.02em;
    }
    .price-sub {
      font-size: 11px;
      color: var(--text-sub);
    }

    /* Services Grid */
    .section-wrap {
      max-width: 1160px;
      margin: 40px auto;
      padding: 0 24px;
    }
    .section-header {
      text-align: center;
      margin-bottom: 36px;
    }
    .section-header h2 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .section-header p {
      font-size: 14px;
      color: var(--text-sub);
    }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .service-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .service-card:hover {
      transform: translateY(-3px);
      border-color: var(--accent);
    }
    .service-icon {
      font-size: 28px;
      margin-bottom: 14px;
      display: inline-block;
    }
    .service-card h3 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .service-card p {
      font-size: 13px;
      color: var(--text-sub);
      line-height: 1.5;
    }

    /* Reviews Section */
    .reviews-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 32px 24px;
      margin-top: 36px;
    }
    .reviews-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }
    .rating-large {
      font-size: 36px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stars {
      color: #f59e0b;
      letter-spacing: 2px;
    }
    .reviews-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    .review-item {
      background: var(--bg-main);
      padding: 18px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
    }
    .review-author {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .review-text {
      font-size: 12px;
      color: var(--text-sub);
      line-height: 1.5;
      margin-top: 6px;
    }

    /* Fixed Mobile Action Bar */
    .mobile-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-header);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--border-color);
      padding: 10px 16px;
      z-index: 100;
      justify-content: space-around;
      gap: 8px;
    }
    @media (max-width: 768px) {
      .mobile-bar {
        display: flex;
      }
    }
    .mobile-btn {
      flex: 1;
      text-align: center;
      padding: 10px 8px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .mobile-call {
      background: #10b981;
      color: #fff;
    }
    .mobile-quote {
      background: var(--accent);
      color: #fff;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border-color);
      padding: 40px 24px;
      text-align: center;
      margin-top: 60px;
      font-size: 12px;
      color: var(--text-sub);
    }
    footer a {
      color: var(--accent);
    }

    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 200;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 28px;
      text-align: center;
    }
    .modal-box h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .modal-box p {
      font-size: 13px;
      color: var(--text-sub);
      margin-bottom: 20px;
    }
  </style>
</head>
<body>

  <!-- Dev Header Banner -->
  <div class="dev-banner">
    <span>⚡ <strong>Interactive Web Prototype</strong> created for <strong>${businessName}</strong> by <strong>${developerName}</strong></span>
    <a href="mailto:${settings.sender_email || ''}?subject=Claiming%20Mockup%20for%20${encodeURIComponent(businessName)}" class="dev-banner-btn">
      Deploy This Site For Your Domain →
    </a>
  </div>

  <!-- Header Nav -->
  <header>
    <div class="header-inner">
      <div class="brand-logo">
        <div class="brand-icon">${businessName.charAt(0)}</div>
        <div>
          <div class="brand-title">${businessName}</div>
          <div class="brand-loc">📍 ${city} • ⭐ ${rating} (${reviews} reviews)</div>
        </div>
      </div>
      <div class="header-cta">
        <a href="tel:${cleanPhone}" class="header-phone">
          📞 <span>${phone}</span>
        </a>
        <button onclick="scrollToCalc()" class="btn-primary">
          Instant Estimate
        </button>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div>
      <div class="badge-pill">
        <span>⭐ Verified Google Top-Rated in ${city}</span>
      </div>
      <h1>${headline}</h1>
      <p>${niche.sub}</p>
      
      <div class="trust-badges">
        <div class="trust-item">
          <span>🛡️</span>
          <span>Fully Licensed & Insured</span>
        </div>
        <div class="trust-item">
          <span>⚡</span>
          <span>Rapid Same-Day Response</span>
        </div>
        <div class="trust-item">
          <span>💯</span>
          <span>100% Satisfaction Guarantee</span>
        </div>
      </div>

      <div class="hero-actions">
        <button onclick="scrollToCalc()" class="btn-primary btn-large">
          ⚡ Calculate Instant Estimate
        </button>
        <a href="tel:${cleanPhone}" class="btn-secondary">
          📞 Call ${phone}
        </a>
      </div>
    </div>

    <!-- Instant Cost Estimator Card -->
    <div class="calc-card" id="estimator-widget">
      <div class="calc-title">
        <span>🧮</span>
        <span>Instant Project Estimator</span>
      </div>
      <div class="calc-desc">Select your service to calculate an immediate price range:</div>

      <div class="form-group">
        <div class="form-label">
          <span>Service Type</span>
        </div>
        <select id="service-select" onchange="calculatePrice()">
          <option value="1.0">${niche.service1}</option>
          <option value="0.4">${niche.service2}</option>
          <option value="0.15">${niche.service3}</option>
        </select>
      </div>

      <div class="form-group">
        <div class="form-label">
          <span>${niche.calcUnit}</span>
          <span id="unit-val" style="color: var(--accent); font-weight: 700;">2,200</span>
        </div>
        <input type="range" id="unit-slider" min="500" max="4500" step="100" value="2200" oninput="calculatePrice()">
      </div>

      <div class="price-box">
        <div class="price-tag" id="price-display">$6,800 - $8,200</div>
        <div class="price-sub">Transparent estimate based on local ${city} standard rates</div>
      </div>

      <div class="form-group">
        <input type="text" id="cust-name" placeholder="Your Name" required>
      </div>
      <div class="form-group">
        <input type="tel" id="cust-phone" placeholder="Phone Number for Callback" required>
      </div>
      <button onclick="submitLead()" class="btn-primary" style="width: 100%; padding: 12px; font-size: 14px;">
        Lock In Estimate & Request Priority Callback →
      </button>
    </div>
  </section>

  <!-- Services Section -->
  <section class="section-wrap">
    <div class="section-header">
      <h2>Professional Services by ${businessName}</h2>
      <p>Precision workmanship, premium materials, and honest local pricing.</p>
    </div>

    <div class="services-grid">
      <div class="service-card">
        <div class="service-icon">🏗️</div>
        <h3>${niche.service1}</h3>
        <p>${niche.desc1}</p>
      </div>
      <div class="service-card">
        <div class="service-icon">🚨</div>
        <h3>${niche.service2}</h3>
        <p>${niche.desc2}</p>
      </div>
      <div class="service-card">
        <div class="service-icon">📋</div>
        <h3>${niche.service3}</h3>
        <p>${niche.desc3}</p>
      </div>
    </div>
  </section>

  <!-- Google Reviews Box -->
  <section class="section-wrap">
    <div class="reviews-box">
      <div class="reviews-stats">
        <div>
          <div class="rating-large">
            <span>${rating}</span>
            <span class="stars">★★★★★</span>
          </div>
          <div style="font-size: 13px; color: var(--text-sub); margin-top: 4px;">
            Based on <strong>${reviews} verified Google reviews</strong> in ${city}
          </div>
        </div>
        ${mapsLink !== '#' ? `
        <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 12px; padding: 8px 14px;">
          📍 View on Google Maps ↗
        </a>` : ''}
      </div>

      <div class="reviews-grid">
        <div class="review-item">
          <div class="stars" style="font-size: 12px;">★★★★★</div>
          <div class="review-author">David M.</div>
          <div class="review-text">"Called ${businessName} after a bad storm. They arrived promptly, gave an honest quote, and completed the job ahead of schedule. Highly recommend!"</div>
        </div>
        <div class="review-item">
          <div class="stars" style="font-size: 12px;">★★★★★</div>
          <div class="review-author">Sarah L.</div>
          <div class="review-text">"Super professional and clean. The quote was transparent with zero hidden fees. Best contractor experience we've had in ${city}."</div>
        </div>
        <div class="review-item">
          <div class="stars" style="font-size: 12px;">★★★★★</div>
          <div class="review-author">Robert K.</div>
          <div class="review-text">"Top-tier workmanship. Communicated every step of the process and left the property spotless. 5 stars all the way."</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Fixed Mobile Action Bar -->
  <div class="mobile-bar">
    <a href="tel:${cleanPhone}" class="mobile-btn mobile-call">
      📞 Call ${phone}
    </a>
    <button onclick="scrollToCalc()" class="mobile-btn mobile-quote">
      ⚡ Get Instant Quote
    </button>
  </div>

  <!-- Success Modal -->
  <div class="modal-backdrop" id="modal">
    <div class="modal-box">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <h3>Estimate Locked In!</h3>
      <p id="modal-msg">A specialist from ${businessName} will contact you shortly to confirm your scheduled consultation.</p>
      <button onclick="closeModal()" class="btn-primary" style="width: 100%;">Got it!</button>
    </div>
  </div>

  <!-- Footer -->
  <footer>
    <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
    <p style="margin-top: 8px; opacity: 0.7;">
      Prototype designed & built with ⚡ Node.js by <a href="${developerPortfolio}" target="_blank">${developerName}</a>.
    </p>
  </footer>

  <script>
    const basePrice = ${niche.basePrice};
    const ratePerUnit = ${niche.ratePerUnit};

    function calculatePrice() {
      const mult = parseFloat(document.getElementById('service-select').value);
      const units = parseInt(document.getElementById('unit-slider').value);
      document.getElementById('unit-val').innerText = units.toLocaleString();

      const calculated = Math.round((basePrice + (units * ratePerUnit)) * mult);
      const low = Math.round(calculated * 0.9 / 50) * 50;
      const high = Math.round(calculated * 1.15 / 50) * 50;

      document.getElementById('price-display').innerText = '$' + low.toLocaleString() + ' - $' + high.toLocaleString();
    }

    function scrollToCalc() {
      document.getElementById('estimator-widget').scrollIntoView({ behavior: 'smooth' });
    }

    function submitLead() {
      const name = document.getElementById('cust-name').value.trim();
      const phone = document.getElementById('cust-phone').value.trim();
      if (!name || !phone) {
        alert('Please provide your name and phone number so we can send your estimate.');
        return;
      }
      document.getElementById('modal-msg').innerText = 'Thank you ' + name + '! An estimator from ${businessName} has received your request and will call you at ' + phone + ' within 15 minutes.';
      document.getElementById('modal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('modal').style.display = 'none';
    }

    calculatePrice();
  </script>
</body>
</html>`;
  }
}

module.exports = new MockupService();
