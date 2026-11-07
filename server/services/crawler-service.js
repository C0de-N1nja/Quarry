const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse/sync');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const { isSocialOrAggregator } = require('./social-domains');

/**
 * Crawler Service: Discovers business prospects via search engines / Google Maps,
 * parses batch CSV imports, and resolves websites for leads.
 */
class CrawlerService {
  /**
   * Search for businesses given a niche keyword and location
   */
  async searchProspects(keyword, location, limit = 15) {
    const query = `${keyword} in ${location}`.trim();
    const leads = [];
    const seenWebsites = new Set();

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });

      const $ = cheerio.load(res.data);
      const searchEngineDomains = ['duckduckgo.com', 'google.com', 'bing.com', 'yahoo.com', 'wikipedia.org'];

      $('.result').each((i, el) => {
        if (leads.length >= limit) return false;

        const title = $(el).find('.result__title a').text().trim();
        let rawLink = $(el).find('.result__title a').attr('href') || '';
        const snippet = $(el).find('.result__snippet').text().trim();

        if (rawLink.includes('uddg=')) {
          const match = rawLink.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            rawLink = decodeURIComponent(match[1]);
          }
        }

        if (!rawLink.startsWith('http')) return;

        try {
          const parsed = new URL(rawLink);
          const domain = parsed.hostname.replace(/^www\./, '');

          if (isSocialOrAggregator(domain) || searchEngineDomains.some(d => domain.includes(d))) return;
          if (seenWebsites.has(domain)) return;
          seenWebsites.add(domain);

          let cleanName = title.split(/[-|–:]/)[0].trim();
          if (cleanName.length < 3) cleanName = title;

          const phoneMatch = snippet.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
          const phone = phoneMatch ? phoneMatch[0] : null;

          leads.push({
            business_name: cleanName,
            website: `https://${domain}`,
            maps_link: null,
            phone: phone,
            address: null,
            city: null,
            category: keyword,
            rating: null,
            reviews_count: 0,
            source: 'crawler',
            status: 'discovered',
            has_no_website: 0,
            no_website_verified: 0,
            website_status: 'active'
          });
        } catch {}
      });
    } catch (err) {
      try {
        const chromiumQuery = encodeURIComponent(query);
        const { stdout } = await execPromise(
          `/snap/bin/chromium --headless --disable-gpu --dump-dom "https://html.duckduckgo.com/html/?q=${chromiumQuery}"`,
          { timeout: 15000 }
        );
        const $ = cheerio.load(stdout);
        $('.result').each((i, el) => {
          if (leads.length >= limit) return false;
          const title = $(el).find('.result__title a').text().trim();
          let rawLink = $(el).find('.result__title a').attr('href') || '';
          if (rawLink.includes('uddg=')) {
            const match = rawLink.match(/uddg=([^&]+)/);
            if (match && match[1]) rawLink = decodeURIComponent(match[1]);
          }
          if (!rawLink.startsWith('http')) return;
          try {
            const parsed = new URL(rawLink);
            const domain = parsed.hostname.replace(/^www\./, '');
            if (!seenWebsites.has(domain)) {
              seenWebsites.add(domain);
              leads.push({
                business_name: title.split(/[-|–]/)[0].trim() || domain,
                website: `https://${domain}`,
                maps_link: null,
                phone: null,
                address: null,
                city: null,
                category: keyword,
                rating: null,
                reviews_count: 0,
                source: 'crawler',
                status: 'discovered',
                has_no_website: 0,
                no_website_verified: 0,
                website_status: 'active'
              });
            }
          } catch {}
        });
      } catch (chromiumErr) {}
    }

    return leads;
  }

  /**
   * Parse CSV file buffer for batch import
   * Flexible support for Google Maps exports, custom lead CSVs, etc.
   */
  parseCsv(fileBuffer) {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    const parsedLeads = [];
    for (const row of records) {
      // 1. Business Name (support any column variant)
      const business_name = row.business_name || row.name || row.Name || row.company || row['Company Name'] || row.Business || row.title || null;
      if (!business_name || business_name.trim().length === 0) continue;

      // 2. Website and Google Maps Link
      let website = row.website || row.url || row.domain || row.Website || row.web || row.URL || null;
      let maps_link = row.google_maps_link || row.maps_link || row.maps_url || row.gmaps || row['Google Maps Link'] || row['Maps Link'] || null;

      // If website column actually contains a google maps link, route to maps_link
      if (website && website.includes('google.com/maps')) {
        if (!maps_link) maps_link = website;
        website = null;
      }

      // Clean website URL if provided
      if (website) {
        website = website.trim();
        if (website.length > 0 && !website.startsWith('http://') && !website.startsWith('https://')) {
          website = 'https://' + website;
        }
      }

      // 3. Phone & Contact Details
      const phone = row.phone || row.telephone || row.Phone || row['Phone Number'] || row.phone_number || null;
      const address = row.address || row.location || row.Address || row.street || null;
      const city = row.city || row.City || null;
      const category = row.category || row.industry || row.niche || row.Category || 'General';
      const rating = parseFloat(row.rating || row.Rating || row.stars || 0) || 0;
      const reviews_count = parseInt(row.reviews || row.reviews_count || row['Reviews Count'] || row.review_count || 0, 10) || 0;

      parsedLeads.push({
        business_name: business_name.trim(),
        website: website || null,
        maps_link: maps_link ? maps_link.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        category: category.trim(),
        rating,
        reviews_count,
        source: 'csv',
        status: 'discovered'
      });
    }

    return parsedLeads;
  }

  /**
   * Search for a business's official website given its name, phone, or city
   */
  async findWebsiteForLead(businessName, phone = null, city = null) {
    const osintService = require('./osint-service');
    const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
    const query = `${businessName} ${cleanPhone} ${city || ''}`.trim();

    try {
      const searchRes = await osintService.searchEngineQuery(query, 'yahoo', 6000);
      const searchEngineDomains = ['duckduckgo.com', 'google.com', 'bing.com', 'yahoo.com', 'wikipedia.org', 'w3.org', 'bizarchive.com', 'about.me'];

      for (const link of (searchRes.links || [])) {
        try {
          const parsed = new URL(link);
          const domain = parsed.hostname.replace(/^www\./, '');
          if (!isSocialOrAggregator(domain) && !searchEngineDomains.some(d => domain.includes(d))) {
            return `https://${domain}`;
          }
        } catch {}
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  async findOfficialWebsite(businessName, city = null) {
    return this.findWebsiteForLead(businessName, null, city);
  }
}

module.exports = new CrawlerService();
