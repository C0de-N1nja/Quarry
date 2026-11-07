const path = require('path');
const fs = require('fs');

/**
 * ShowcaseService: Serves verified pre-built prototypes from the machine
 * mapped to lead industry niches (Roofing, Restaurant, Solar, General Contractor).
 */
class ShowcaseService {
  constructor() {
    this.showcases = {
      roofing: {
        id: 'roofing',
        name: 'Roofing & Exterior Contractors',
        category: 'Roofing',
        dirPath: '/home/beast/Projects/client-work/roofers-website',
        entryFile: 'index.html',
        headline: 'Reliable Roofing & Storm Restoration Framework',
        previewImage: '/images/hero.jpg'
      },
      'roofing-trust': {
        id: 'roofing-trust',
        name: 'Trust-First Roofing & Warranty',
        category: 'Roofing',
        dirPath: '/home/beast/Projects/client-work/roofing-showcase/trust-my-roofer',
        entryFile: 'index.html',
        headline: 'Certified Master Roofer & Warranty Guarantee',
        previewImage: '/images/hero.jpg'
      },
      restaurant: {
        id: 'restaurant',
        name: 'Restaurant, Cafe & Dining',
        category: 'Restaurant',
        dirPath: '/home/beast/Projects/research/Internet Research/restaurant-showcase',
        entryFile: 'index.html',
        headline: 'Artisan Dining, Live Menu & Instant Online Ordering',
        previewImage: '/images/hero.jpg'
      },
      contractor: {
        id: 'contractor',
        name: 'Commercial & Home Services',
        category: 'Contractor',
        dirPath: '/home/beast/Projects/client-work/roofing-showcase/shock-and-awe',
        entryFile: 'index.html',
        headline: 'High-Impact Contractor Conversion Engine',
        previewImage: '/images/hero.jpg'
      }
    };
  }

  getAvailableNiches() {
    return Object.keys(this.showcases);
  }

  getAllShowcases() {
    return Object.values(this.showcases).map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      headline: s.headline,
      exists: fs.existsSync(path.join(s.dirPath, s.entryFile))
    }));
  }

  getShowcase(id) {
    const key = (id || '').toLowerCase().trim();
    return this.showcases[key] || this.showcases['roofing'];
  }

  renderPrototype(niche) {
    const item = this.getShowcase(niche);
    const filePath = path.join(item.dirPath, item.entryFile);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Showcase prototype for "${niche}" not found on disk at ${filePath}`);
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // Inject <base> tag so all relative CSS, JS, and image paths resolve cleanly
    const baseTag = `<base href="/showcase-assets/${item.id}/">`;

    // Inject a lightweight preview banner at the very top of body
    const previewBanner = `
    <div style="background: linear-gradient(90deg, #090d16, #1e293b); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); position: sticky; top: 0; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Live Prototype</span>
        <span style="font-weight: 600;">${item.name} — Interactive Architecture (Client Prototype Preview)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="color: #94a3b8; font-size: 11px;">Desktop & Mobile Tested</span>
      </div>
    </div>
    `;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<head')) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
    } else {
      html = baseTag + html;
    }

    if (html.includes('<body')) {
      html = html.replace(/(<body[^>]*>)/i, `$1\n${previewBanner}`);
    } else {
      html = previewBanner + html;
    }

    return html;
  }

  matchNiche(category = '', businessName = '') {
    const text = `${category} ${businessName}`.toLowerCase();
    if (text.includes('food') || text.includes('restaurant') || text.includes('cafe') || text.includes('taco') || text.includes('grill') || text.includes('bistro') || text.includes('pizza') || text.includes('bar')) {
      return 'restaurant';
    }
    if (text.includes('roof') || text.includes('gutter') || text.includes('shingle')) {
      return 'roofing';
    }
    if (text.includes('solar') || text.includes('electric') || text.includes('energy')) {
      return 'contractor';
    }
    if (text.includes('plumb') || text.includes('hvac') || text.includes('air') || text.includes('paint') || text.includes('landscape') || text.includes('build')) {
      return 'contractor';
    }
    return 'roofing';
  }

  matchNicheForLead(lead = {}) {
    return this.matchNiche(lead.category, lead.business_name);
  }

  getShowcaseUrl(niche, baseUrl = '') {
    const cleanBase = baseUrl ? baseUrl.replace(/\/$/, '') : 'http://localhost:5000';
    const targetNiche = this.matchNiche(niche);
    return `${cleanBase}/showcase/${targetNiche}`;
  }
}

module.exports = new ShowcaseService();
