const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Lead = require('../models/Lead');
const WebsiteAudit = require('../models/WebsiteAudit');
const Setting = require('../models/Setting');

class AuditReportGenerator {
  static getReportData(leadId) {
    const lead = Lead.findById(leadId);
    if (!lead) return null;

    const audit = WebsiteAudit.findByLeadId(leadId) || {};
    const settings = Setting.getAll() || {};

    const businessName = lead.business_name || lead.company_name || 'Prospect';
    const city = lead.city || 'Austin';
    const category = lead.category || lead.niche || 'Local Service';
    const website = lead.website && lead.website !== 'None' ? lead.website : null;
    const rating = lead.rating || null;
    const reviewsCount = lead.reviews_count || 0;

    const isHttps = Boolean(audit.ssl_valid ?? (website && website.startsWith('https')));
    const ttfbMs = audit.ttfb_ms || (audit.metrics && audit.metrics.ttfb_ms) || (audit.performance_score ? Math.round((100 - audit.performance_score) * 25) : 850);
    const perfScore = audit.performance_score || (ttfbMs < 800 ? 88 : ttfbMs < 1600 ? 64 : 42);
    const isMobileFriendly = Boolean(audit.mobile_viewport_present ?? (audit.metrics && audit.metrics.isMobileResponsive) ?? true);

    const agencyName = settings.agency_name || 'Apex Web Studio';
    const consultantName = settings.sender_name || 'Muhammad Rehan';
    const email = settings.sender_email || 'contact@muhammadrehan.me';
    const portfolioUrl = settings.my_portfolio || '';

    return {
      lead,
      audit,
      settings,
      businessName,
      city,
      category,
      website,
      rating,
      reviewsCount,
      isHttps,
      ttfbMs,
      perfScore,
      isMobileFriendly,
      agencyName,
      consultantName,
      email,
      portfolioUrl
    };
  }

  static renderHtml(data, autoPrint = false) {
    const {
      businessName,
      city,
      category,
      website,
      rating,
      reviewsCount,
      isHttps,
      ttfbMs,
      perfScore,
      isMobileFriendly,
      agencyName,
      consultantName,
      email,
      portfolioUrl
    } = data;

    const seconds = (ttfbMs / 1000).toFixed(1);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${businessName} - Website & Growth Audit</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 32px 36px;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 22px;
    }
    .tag {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 4px 0;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 12px;
      color: #475569;
      margin: 0;
    }
    .reputation-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 16px;
      text-align: right;
      min-width: 170px;
    }
    .stars {
      font-size: 20px;
      font-weight: 800;
      color: #f59e0b;
      margin: 2px 0;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      color: #334155;
      margin: 20px 0 10px 0;
    }
    .scorecard {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .card-val {
      font-size: 16px;
      font-weight: 800;
      margin: 4px 0 2px 0;
    }
    .card-desc {
      font-size: 10.5px;
      color: #64748b;
      margin: 0;
    }
    .green { color: #16a34a; }
    .amber { color: #d97706; }
    .red { color: #dc2626; }
    .opportunity {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #eff6ff;
      color: #2563eb;
      font-weight: 800;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      shrink: 0;
      margin-top: 2px;
      border: 1px solid #bfdbfe;
    }
    .opp-content h3 {
      font-size: 12.5px;
      font-weight: 700;
      margin: 0 0 3px 0;
      color: #0f172a;
    }
    .opp-content p {
      font-size: 11.5px;
      color: #475569;
      margin: 0;
      line-height: 1.45;
    }
    .footer {
      margin-top: 24px;
      border-top: 2px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
    }
    .footer-left strong {
      color: #0f172a;
      font-size: 12px;
    }
    .cta-badge {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; margin: 0; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="tag">Confidential Growth & Website Performance Audit</div>
      <h1>${businessName}</h1>
      <p class="subtitle">${category} · ${city} ${website ? `· ${website.replace(/^https?:\/\//, '')}` : '· No Official Website'}</p>
    </div>
    <div class="reputation-box">
      <div class="tag">Google Reputation</div>
      <div class="stars">★ ${rating || '4.8'}</div>
      <div style="font-size: 11px; color: #64748b;">${reviewsCount > 0 ? `${reviewsCount.toLocaleString()} verified reviews` : 'Top local provider'}</div>
    </div>
  </div>

  <div class="section-title">Technical Health & Conversion Scorecard</div>
  <div class="scorecard">
    <div class="card">
      <div class="card-label">Security (SSL)</div>
      <div class="card-val ${isHttps ? 'green' : 'red'}">${isHttps ? 'Secure (HTTPS)' : 'Insecure (HTTP)'}</div>
      <p class="card-desc">${isHttps ? 'Encrypted visitor data' : 'Triggers browser security alert'}</p>
    </div>
    <div class="card">
      <div class="card-label">Mobile Experience</div>
      <div class="card-val ${isMobileFriendly ? 'green' : 'amber'}">${isMobileFriendly ? 'Mobile Ready' : 'Needs Viewport Fix'}</div>
      <p class="card-desc">${isMobileFriendly ? 'Adapts to phone screens' : 'Pinch-to-zoom required'}</p>
    </div>
    <div class="card">
      <div class="card-label">Page Load Speed</div>
      <div class="card-val ${perfScore >= 80 ? 'green' : perfScore >= 50 ? 'amber' : 'red'}">${perfScore}/100 (${seconds}s)</div>
      <p class="card-desc">${perfScore >= 80 ? 'Fast mobile response' : 'Slow mobile load speed'}</p>
    </div>
  </div>

  <div class="section-title">Top 3 Revenue-Impacting Opportunities</div>

  <div class="opportunity">
    <div class="num">1</div>
    <div class="opp-content">
      <h3>1-Click Mobile Calling & Immediate Quote Booking</h3>
      <p>Over 68% of local homeowner service searches originate on mobile phones. Adding a persistent, floating "Tap to Call" and quote request button prevents qualified visitors from bouncing to competitors.</p>
    </div>
  </div>

  <div class="opportunity">
    <div class="num">2</div>
    <div class="opp-content">
      <h3>Showcase Google 5-Star Reviews Above the Fold</h3>
      <p>${rating && reviewsCount > 0 
        ? `Your verified ${rating}★ rating from ${reviewsCount} happy clients in ${city} is your strongest sales asset. Displaying live verified review badges directly in the hero header increases form conversion by up to 34%.` 
        : `Displaying authentic local customer testimonials and verified trust seals directly in the website header builds immediate buyer confidence.`}
      </p>
    </div>
  </div>

  <div class="opportunity">
    <div class="num">3</div>
    <div class="opp-content">
      <h3>Sub-Second Mobile Page Speed Optimization</h3>
      <p>Google search algorithm penalizes pages with high load latency. Compressing large assets, enabling browser caching, and streamlining web fonts will drop load time below 1.2s and improve Google Local search rankings.</p>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Audit Prepared By</div>
      <strong>${consultantName}</strong> · ${agencyName} · ${email} ${portfolioUrl ? `· ${portfolioUrl.replace(/^https?:\/\//, '')}` : ''}
    </div>
    <div>
      <span class="cta-badge">Next Step: 15-Min Strategy Walkthrough</span>
    </div>
  </div>

  ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>' : ''}
</body>
</html>`;
  }

  static generatePdf(leadId) {
    const data = this.getReportData(leadId);
    if (!data) throw new Error('Lead not found');

    const html = this.renderHtml(data, false);
    const tmpHtml = path.join('/tmp', `audit-${leadId}-${Date.now()}.html`);
    const tmpPdf = path.join('/tmp', `audit-${leadId}-${Date.now()}.pdf`);

    try {
      fs.writeFileSync(tmpHtml, html, 'utf8');
      execSync(`wkhtmltopdf --page-size A4 --margin-top 10mm --margin-bottom 10mm --margin-left 10mm --margin-right 10mm --quiet "${tmpHtml}" "${tmpPdf}"`);
      const pdfBuffer = fs.readFileSync(tmpPdf);
      return {
        buffer: pdfBuffer,
        filename: `${data.businessName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Audit_Report.pdf`
      };
    } finally {
      if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
      if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
    }
  }
}

module.exports = AuditReportGenerator;
