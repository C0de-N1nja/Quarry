const https = require('https');
const Lead = require('../models/Lead');
const Setting = require('../models/Setting');

/**
 * International Gig & Intent Radar:
 * Scans live hiring intent and developer contract opportunities from
 * HackerNews (Who is Hiring?) and WeWorkRemotely RSS feeds with ZERO API keys.
 * Offers 1-click tailored proposal generation and instant lead conversion.
 */
class RadarService {
  constructor() {
    this.hnApiBase = 'https://hn.algolia.com/api/v1';
    this.wwrBackEndRss = 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss';
    this.wwrFullStackRss = 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss';
  }

  /**
   * Helper to perform HTTPS GET and return response body as string
   */
  async httpGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (ClientHuntingRadar/1.0)' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.httpGet(res.headers.location));
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  /**
   * Decode HTML entities & strip tags for clean text
   */
  cleanHtml(html = '') {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n\n')
      .replace(/<\/?[^>]+(>|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect tech stack keywords in job text
   */
  detectKeywords(text = '') {
    const known = [
      'Node.js', 'Express', 'TypeScript', 'JavaScript', 'Python', 'FastAPI',
      'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'GraphQL', 'REST API',
      'React', 'Vue', 'Next.js', 'Redis', 'Tailwind', 'Microservices'
    ];
    const found = [];
    for (const k of known) {
      const reg = new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i');
      if (reg.test(text)) found.push(k);
    }
    return found;
  }

  /**
   * Fetch HackerNews comments from "Who is hiring?" and hiring queries
   */
  async fetchHackerNewsGigs(query = 'node OR backend OR API', limit = 25) {
    try {
      const url = `${this.hnApiBase}/search_by_date?tags=comment&query=${encodeURIComponent(query)}&hitsPerPage=${limit * 2}`;
      const raw = await this.httpGet(url);
      const json = JSON.parse(raw);
      const hits = json.hits || [];

      const gigs = [];
      for (const h of hits) {
        const comment = h.comment_text || '';
        if (comment.length < 80) continue;

        const clean = this.cleanHtml(comment);
        // Only keep comments that appear to be job postings
        if (!/(hiring|engineer|developer|backend|fullstack|remote|contract|onsite)/i.test(clean)) {
          continue;
        }

        // Try to parse first line as Company / Role / Location
        const firstLine = clean.split('\n')[0] || '';
        const parts = firstLine.split('|').map(s => s.trim());
        const company = parts[0] || h.author || 'HN Hiring Company';
        const role = parts[1] || 'Backend / Software Engineer';
        const location = parts[2] || (clean.toLowerCase().includes('remote') ? 'Remote' : 'US / Worldwide');

        // Extract potential link
        const urlMatch = comment.match(/href="([^"]+)"/i) || comment.match(/https?:\/\/[^\s<"']+/i);
        const website = urlMatch ? urlMatch[1] || urlMatch[0] : `https://news.ycombinator.com/item?id=${h.objectID}`;

        gigs.push({
          id: `hn-${h.objectID}`,
          source: 'HackerNews',
          company,
          role,
          location,
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          website: website.startsWith('http') ? website : `https://news.ycombinator.com/item?id=${h.objectID}`,
          posted_at: h.created_at,
          tags: this.detectKeywords(clean),
          summary: clean.slice(0, 240) + '...',
          raw_text: clean
        });

        if (gigs.length >= limit) break;
      }

      return gigs;
    } catch (err) {
      console.error('Radar HackerNews fetch error:', err.message);
      return [];
    }
  }

  /**
   * Fetch WeWorkRemotely RSS feeds for backend and fullstack engineering
   */
  async fetchWeWorkRemotelyGigs(limit = 20) {
    try {
      const raw = await this.httpGet(this.wwrBackEndRss);
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items = [];
      let match;

      while ((match = itemRegex.exec(raw)) !== null && items.length < limit) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemContent.match(/<title>(.*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>(.*?)<\/link>/i);
        const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
        const regionMatch = itemContent.match(/<region>(.*?)<\/region>/i);
        const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);

        const rawTitle = titleMatch ? titleMatch[1].trim() : 'Remote Developer';
        // Usually "Company: Role"
        let company = 'WeWorkRemotely Partner';
        let role = rawTitle;
        if (rawTitle.includes(':')) {
          const split = rawTitle.split(':');
          company = split[0].trim();
          role = split.slice(1).join(':').trim();
        }

        const link = linkMatch ? linkMatch[1].trim() : 'https://weworkremotely.com';
        const cleanDesc = this.cleanHtml(descMatch ? descMatch[1] : '');
        const region = regionMatch ? regionMatch[1].trim() : 'Anywhere in the World';

        items.push({
          id: `wwr-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          source: 'WeWorkRemotely',
          company,
          role,
          location: region || 'Remote / Worldwide',
          url: link,
          website: link,
          posted_at: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
          tags: this.detectKeywords(cleanDesc),
          summary: cleanDesc.slice(0, 240) + '...',
          raw_text: cleanDesc
        });
      }

      return items;
    } catch (err) {
      console.error('Radar WeWorkRemotely fetch error:', err.message);
      return [];
    }
  }

  /**
   * Search across sources
   */
  async searchOpportunities({ query = 'node backend', source = 'all', limit = 30 } = {}) {
    let results = [];

    if (source === 'hn' || source === 'all') {
      const hnGigs = await this.fetchHackerNewsGigs(query, limit);
      results = results.concat(hnGigs);
    }

    if (source === 'wwr' || source === 'all') {
      const wwrGigs = await this.fetchWeWorkRemotelyGigs(limit);
      results = results.concat(wwrGigs);
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

    return results.slice(0, limit);
  }

  /**
   * Generate high-converting proposal for a selected gig
   */
  generateProposal(gig) {
    const settings = Setting.getAll();
    const myName = settings.sender_name || 'Rehan';
    const myPortfolio = settings.my_portfolio || 'https://github.com';
    const company = gig.company || 'Hiring Team';
    const role = gig.role || 'Software Engineer';
    const tags = (gig.tags && gig.tags.length > 0) ? gig.tags.join(', ') : 'Node.js, REST APIs, PostgreSQL, and high-performance backend systems';

    const subject = `Regarding ${company}'s ${role} opening - Node.js & Backend Specialist`;

    const body = `Hi ${company} Team,

I came across your posting for the ${role} position and wanted to reach out directly.

I specialize in building robust backend architectures, custom APIs, and high-throughput microservices using ${tags}. 

A few ways I can hit the ground running with ${company}:
- **Rapid API & Microservices Execution:** Experienced with low-latency REST/GraphQL architectures, async queue workers, and clean modular Node.js/TypeScript code.
- **Database & Performance Optimization:** Deep focus on query indexing, cache layers (Redis), and sub-100ms response targets.
- **Reliable Remote Delivery:** Proven track record working with international teams across US, UK, and Europe with proactive async updates and clean Git workflows.

You can inspect some of my recent production code and projects here:
${myPortfolio}

I would welcome a brief 10-minute sync this week to discuss how I can help accelerate your backend roadmap. Are you available for a quick conversation?

Best regards,
${myName}
Node.js & Backend Systems Engineer
${myPortfolio}`;

    return {
      subject,
      body,
      company,
      role
    };
  }

  /**
   * Convert a gig directly into a Lead in the dashboard
   */
  convertToLead(gig) {
    // Check if website or URL already exists
    const existing = Lead.findByWebsiteOrName(gig.website || gig.url, gig.company);
    if (existing) {
      return { lead: existing, alreadyExisted: true };
    }

    const leadData = {
      business_name: gig.company || 'International Client',
      website: gig.website && gig.website.startsWith('http') ? gig.website : gig.url,
      phone: '',
      address: gig.location || 'Remote',
      city: gig.location ? gig.location.slice(0, 50) : 'Remote',
      category: `Tech / ${gig.role.slice(0, 40)}`,
      rating: 5.0,
      reviews_count: 1,
      source: 'radar'
    };

    const newLead = Lead.create(leadData);
    return { lead: newLead, alreadyExisted: false };
  }
}

module.exports = new RadarService();
