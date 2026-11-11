const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse/sync');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const {
  isSocialOrAggregator,
  classifyWebsiteUrl,
  extractSocialProfilesFromCheerio,
  extractSocialProfilesFromHtml
} = require('./social-domains');
const stealthService = require('./stealth-service');

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
      let fallbackHtml = '';
      if (stealthService.isAvailable()) {
        try {
          const stealth = await stealthService.fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
          if (stealth && stealth.html) fallbackHtml = stealth.html;
        } catch {}
      }
      if (!fallbackHtml) {
        try {
          const chromiumQuery = encodeURIComponent(query);
          const { stdout } = await execPromise(
            `/snap/bin/chromium --headless --disable-gpu --dump-dom "https://html.duckduckgo.com/html/?q=${chromiumQuery}"`,
            { timeout: 15000 }
          );
          fallbackHtml = stdout;
        } catch {}
      }
      if (fallbackHtml) {
        const $ = cheerio.load(fallbackHtml);
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
      }
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
   * Crawl a target website to extract all social media profile links
   * Checks homepage DOM, footer, and /contact page.
   */
  async crawlWebsiteForSocials(websiteUrl) {
    if (!websiteUrl || typeof websiteUrl !== 'string') return {};
    let cleanUrl = websiteUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let socials = {
      facebook: null,
      instagram: null,
      linkedin: null,
      twitter: null,
      youtube: null,
      tiktok: null,
      linktree: null
    };

    let html = '';
    try {
      const res = await axios.get(cleanUrl, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        maxRedirects: 4,
        validateStatus: () => true
      });
      html = res.data || '';
    } catch (e) {
      if (stealthService.isAvailable()) {
        try {
          const stealth = await stealthService.fetch(cleanUrl);
          if (stealth && stealth.html) html = stealth.html;
        } catch {}
      }
      if (!html) {
        try {
          const { stdout } = await execPromise(
            `/snap/bin/chromium --headless --disable-gpu --dump-dom "${cleanUrl}"`,
            { timeout: 12000 }
          );
          html = stdout;
        } catch {}
      }
    }

    if (html && typeof html === 'string') {
      const $ = cheerio.load(html);
      socials = extractSocialProfilesFromCheerio($, cleanUrl);

      // If facebook or instagram missing, check if there is a /contact or /about page linked
      if (!socials.facebook || !socials.instagram) {
        const contactHref = $('a[href*="contact" i]').first().attr('href') || $('a[href*="about" i]').first().attr('href');
        if (contactHref) {
          try {
            let contactUrl = contactHref;
            if (contactUrl.startsWith('/')) {
              const u = new URL(cleanUrl);
              contactUrl = `${u.protocol}//${u.host}${contactUrl}`;
            }
            if (contactUrl.startsWith('http')) {
              const contactRes = await axios.get(contactUrl, {
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                validateStatus: () => true
              });
              if (contactRes.data) {
                const $c = cheerio.load(contactRes.data);
                const contactSocials = extractSocialProfilesFromCheerio($c, contactUrl);
                for (const [k, v] of Object.entries(contactSocials)) {
                  if (v && !socials[k]) socials[k] = v;
                }
              }
            }
          } catch {}
        }
      }
    }

    return socials;
  }

  /**
   * Comprehensive Web & Social Presence Resolver
   * Resolves official website and social profiles (Facebook, Instagram, LinkedIn, etc.)
   * for leads WITH a website AND leads WITHOUT a website (checking Google Web results).
   */
  async resolvePresenceForLead(leadOrId) {
    const Lead = require('../models/Lead');
    const osintService = require('./osint-service');

    let lead = typeof leadOrId === 'object' && leadOrId !== null ? leadOrId : Lead.findById(leadOrId);
    if (!lead) throw new Error('Lead not found');

    const businessName = lead.business_name || '';
    const city = lead.city || '';
    const country = lead.country || '';
    const address = lead.address || '';
    const phone = lead.phone || '';
    const cleanPhoneDigits = phone ? phone.replace(/[^0-9]/g, '').slice(-8) : '';

    let existingSocials = {};
    if (lead.social_profiles) {
      try {
        existingSocials = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;
      } catch {}
    }

    // Clean existing socials of internal fields
    const currentSocials = {};
    for (const [k, v] of Object.entries(existingSocials)) {
      if (v && typeof v === 'string' && !k.startsWith('_')) {
        currentSocials[k] = v;
      }
    }
    if (lead.facebook_url && !currentSocials.facebook) currentSocials.facebook = lead.facebook_url;
    if (lead.instagram_url && !currentSocials.instagram) currentSocials.instagram = lead.instagram_url;

    // Check if lead already has a valid website
    const hasExistingOfficialSite = Boolean(lead.website && !isSocialOrAggregator(lead.website, country));

    if (hasExistingOfficialSite) {
      // CASE 1: Lead HAS a website
      // 1. Crawl website to extract social media links
      const crawledSocials = await this.crawlWebsiteForSocials(lead.website);
      for (const [k, v] of Object.entries(crawledSocials)) {
        if (v && !currentSocials[k]) currentSocials[k] = v;
      }

      // 2. If Facebook or Instagram are still missing, search Google/Yahoo for social presence
      if (!currentSocials.facebook || !currentSocials.instagram) {
        try {
          const socialQuery = `"${businessName}" ${city} site:facebook.com OR site:instagram.com`;
          const sRes = await osintService.searchEngineQuery(socialQuery, 'google', 7000);
          for (let i = 0; i < (sRes.links || []).length; i++) {
            const link = sRes.links[i];
            const snippet = (sRes.snippets && sRes.snippets[i]) || '';
            const isMatch = snippet.toLowerCase().includes(businessName.toLowerCase()) ||
                            (cleanPhoneDigits && snippet.replace(/[^0-9]/g, '').includes(cleanPhoneDigits)) ||
                            (city && snippet.toLowerCase().includes(city.toLowerCase()));
            if (isMatch) {
              if (link.includes('facebook.com') && !currentSocials.facebook && !/sharer|share\.php|dialog|plugins/i.test(link)) {
                currentSocials.facebook = link;
              }
              if (link.includes('instagram.com') && !currentSocials.instagram && !/\/p\/|\/reel\//i.test(link)) {
                currentSocials.instagram = link;
              }
            }
          }
        } catch {}
      }

      // Update Lead in DB
      const updated = Lead.update(lead.id, {
        facebook_url: currentSocials.facebook || lead.facebook_url || null,
        instagram_url: currentSocials.instagram || lead.instagram_url || null,
        social_profiles: currentSocials,
        has_no_website: 0,
        website_status: 'active'
      });

      return {
        success: true,
        website: lead.website,
        socials: currentSocials,
        has_no_website: 0,
        website_status: 'active',
        lead: updated,
        message: 'Website verified and social profiles extracted'
      };
    }

    // CASE 2: Lead DOES NOT have an official website
    // Run comprehensive web search to check Google Web results
    let foundWebsite = null;
    const queries = [
      `"${businessName}" ${city} ${country}`.trim(),
      address ? `"${businessName}" "${address.split(',')[0].trim()}"` : null,
      cleanPhoneDigits ? `"${businessName}" "${phone}"` : null
    ].filter(Boolean);

    for (const q of queries) {
      if (foundWebsite && currentSocials.facebook && currentSocials.instagram) break;
      try {
        const searchRes = await osintService.searchEngineQuery(q, 'google', 8000);
        for (let i = 0; i < (searchRes.links || []).length; i++) {
          const link = searchRes.links[i];
          const snippet = (searchRes.snippets && searchRes.snippets[i]) || '';
          const classification = classifyWebsiteUrl(link, country);

          // A) Official Website Candidate
          if (classification.type === 'official_website' && !foundWebsite) {
            const snipNums = snippet.replace(/[^0-9]/g, '');
            const phoneMatch = cleanPhoneDigits && snipNums.includes(cleanPhoneDigits);
            const streetName = address ? address.split(',')[0].replace(/[0-9]/g, '').trim().toLowerCase() : '';
            const addrMatch = streetName && streetName.length > 3 && snippet.toLowerCase().includes(streetName);
            const nameTokens = businessName.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
            const nameMatches = nameTokens.filter(t => snippet.toLowerCase().includes(t)).length;
            const nameMatch = nameTokens.length > 0 && nameMatches >= Math.min(2, nameTokens.length);

            if (phoneMatch || addrMatch || (nameMatch && (snippet.toLowerCase().includes(city.toLowerCase()) || !city))) {
              foundWebsite = link;
            }
          }

          // B) Social Profile Candidates
          if (classification.type === 'social_profile' || link.includes('facebook.com') || link.includes('instagram.com') || link.includes('linkedin.com')) {
            const snipLow = snippet.toLowerCase();
            const bNameLow = businessName.toLowerCase();
            const isRelevant = snipLow.includes(bNameLow) ||
                               (cleanPhoneDigits && snippet.replace(/[^0-9]/g, '').includes(cleanPhoneDigits)) ||
                               (city && snipLow.includes(city.toLowerCase()));
            if (isRelevant) {
              if (link.includes('facebook.com') && !currentSocials.facebook && !/sharer|share\.php|dialog|plugins/i.test(link)) {
                currentSocials.facebook = link;
              }
              if (link.includes('instagram.com') && !currentSocials.instagram && !/\/p\/|\/reel\//i.test(link)) {
                currentSocials.instagram = link;
              }
              if (link.includes('linkedin.com') && !currentSocials.linkedin) {
                currentSocials.linkedin = link;
              }
            }
          }
        }
      } catch {}
    }

    // If an official website was found, crawl it for full social profiles
    if (foundWebsite) {
      const siteSocials = await this.crawlWebsiteForSocials(foundWebsite);
      for (const [k, v] of Object.entries(siteSocials)) {
        if (v && !currentSocials[k]) currentSocials[k] = v;
      }

      const updated = Lead.update(lead.id, {
        website: foundWebsite,
        has_no_website: 0,
        no_website_verified: 0,
        website_status: 'active',
        facebook_url: currentSocials.facebook || null,
        instagram_url: currentSocials.instagram || null,
        social_profiles: currentSocials
      });

      return {
        success: true,
        website: foundWebsite,
        socials: currentSocials,
        has_no_website: 0,
        website_status: 'active',
        lead: updated,
        message: 'Official website discovered and social profiles extracted'
      };
    }

    // No official website found: verify if it is social_only or no_website
    const hasSocial = Boolean(currentSocials.facebook || currentSocials.instagram || currentSocials.linkedin);
    const newStatus = hasSocial ? 'social_only' : 'no_website';

    const updated = Lead.update(lead.id, {
      has_no_website: 1,
      no_website_verified: 1,
      website_status: newStatus,
      facebook_url: currentSocials.facebook || null,
      instagram_url: currentSocials.instagram || null,
      social_profiles: currentSocials
    });

    return {
      success: true,
      website: null,
      socials: currentSocials,
      has_no_website: 1,
      website_status: newStatus,
      lead: updated,
      message: hasSocial ? 'Confirmed no website: social presence discovered' : 'Confirmed no website found'
    };
  }

  /**
   * Search for a business's official website given its name, phone, or city
   */
  async findWebsiteForLead(businessName, phone = null, city = null) {
    const osintService = require('./osint-service');
    const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
    const query = `${businessName} ${cleanPhone} ${city || ''}`.trim();

    try {
      const searchRes = await osintService.searchEngineQuery(query, 'google', 6000);
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
