const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const db = require('../db/database');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const phoneService = require('./phone-service');
const osintService = require('./osint-service');
const stealthService = require('./stealth-service');

class OwnerOsintService {
  /**
   * Helper: Run a search engine query with both snippets and links
   */
  async searchFull(query, preferredEngine = 'yahoo', timeout = 6000) {
    try {
      const res = await osintService.searchEngineQuery(query, preferredEngine, timeout);
      return {
        snippets: res?.snippets || [],
        links: res?.links || []
      };
    } catch (e) {
      return { snippets: [], links: [] };
    }
  }

  async search(query, limit = 5) {
    const res = await this.searchFull(query);
    return res.snippets || [];
  }

  /**
   * Check if a search snippet is relevant to the target business
   */
  isSnippetRelevant(snippet, businessName) {
    if (!snippet || !businessName) return false;
    const s = snippet.toLowerCase();
    const b = businessName.toLowerCase().trim();
    if (s.includes(b)) return true;

    const genericTradeWords = new Set([
      'landscape', 'landscaping', 'design', 'services', 'service', 'tree', 'construction',
      'cleaning', 'plumbing', 'roofing', 'electric', 'group', 'co', 'llc', 'inc', 'corp',
      'solutions', 'enterprises', 'company', 'agency', 'contractor', 'contractors'
    ]);
    const brandTokens = b.split(/\s+/).filter(w => w.length >= 3 && !genericTradeWords.has(w));
    if (brandTokens.length > 0) {
      return brandTokens.every(w => s.includes(w)) || (brandTokens.length >= 2 && brandTokens.filter(w => s.includes(w)).length >= 2);
    }
    return false;
  }

  /**
   * Helper: Validate and clean person name
   */
  cleanPersonName(candidate, businessName = '') {
    if (!candidate || typeof candidate !== 'string') return null;
    const clean = candidate.trim().replace(/^(?:mr\.?|ms\.?|mrs\.?|dr\.?)\s+/i, '');
    const words = clean.split(/\s+/);
    if (words.length < 2 || words.length > 3) return null;

    const stopWords = new Set([
      'and', 'or', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'a', 'an', 'by', 'with', 'for', 'at', 'our', 'in', 'on', 'to', 'from', 'of',
      'as', 'so', 'we', 'he', 'she', 'it', 'they', 'you', 'my', 'your', 'his', 'her', 'their', 'this', 'that', 'these', 'those', 'but', 'not', 'if',
      'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'about', 'into', 'through', 'after', 'over', 'between', 'out', 'against',
      'during', 'without', 'before', 'under', 'around', 'among', 'services', 'contact', 'about', 'projects', 'project', 'open', 'close', 'menu',
      'skip', 'content', 'home', 'learn', 'more', 'read', 'gallery', 'portfolio', 'pricing', 'reviews', 'testimonials', 'blog', 'news', 'privacy',
      'policy', 'terms', 'cookies', 'login', 'signup', 'register', 'design', 'designs', 'cabinet', 'cabinets', 'cabinetry', 'woodwork', 'woodworking',
      'landscape', 'landscaping', 'tree', 'trees', 'construction', 'roofing', 'plumbing', 'electric', 'electrical', 'cleaning', 'gardening',
      'contractor', 'contractors', 'arborist', 'builders', 'builder', 'remodeling', 'lawn', 'care', 'painting', 'hvac', 'pool', 'flooring',
      'renovation', 'development', 'management', 'solutions', 'solution', 'enterprises', 'enterprise', 'group', 'team', 'company', 'agency',
      'studio', 'studios', 'store', 'shop', 'online', 'website', 'systems', 'system', 'ventures', 'venture', 'associates', 'associate',
      'consulting', 'consultant', 'consultants', 'laboratories', 'laboratory', 'holdings', 'holding', 'industries', 'industry',
      'corporation', 'incorporated', 'limited', 'technologies', 'technology', 'works', 'craft', 'custom', 'customs',
      'shopify', 'wordpress', 'wix', 'squarespace', 'page', 'site', 'view', 'help', 'search', 'click', 'here', 'see', 'find', 'send',
      'email', 'phone', 'call', 'today', 'free', 'quote', 'estimate'
    ]);
    const stopNames = ['Contact Us', 'About Us', 'Our Team', 'Home Page', 'Read More', 'Learn More', 'Business Name', 'Privacy Policy', 'Terms Service', 'John Smith', 'Jane Doe', 'Projects Open', 'Tree Service'];

    // Strict capital validation
    if (!words.every(w => /^[A-Z][a-z]{1,20}$/.test(w))) return null;
    
    // Check if any word or stem matches trade/stop words
    const isTradeOrStopWord = (word) => {
      const w = word.toLowerCase();
      if (stopWords.has(w)) return true;
      if (w.endsWith('s') && stopWords.has(w.slice(0, -1))) return true;
      if (w.endsWith('ing') && stopWords.has(w.slice(0, -3))) return true;
      return false;
    };
    if (words.some(w => isTradeOrStopWord(w))) return null;
    if (stopNames.includes(clean)) return null;

    // Check collision with business name tokens
    if (businessName) {
      const bTokens = businessName.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
      if (words.some(w => bTokens.includes(w.toLowerCase()))) return null;
      if (businessName.toLowerCase().includes(clean.toLowerCase())) return null;
    }

    return clean;
  }

  /**
   * Extract potential owner name and title from web page text, legal filings, or snippets
   */
  extractOwnerEntityFromText(text, businessName = '') {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.replace(/\s+/g, ' ');

    // 1. Inverted legal name from corporate filings / Sunbiz / SOS
    // e.g. "The guiding force behind this is Planthaber, Amanda S from Tampa FL, holding the position of Manager; Planthaber, Patrick S..."
    const invRe = /([A-Z][a-z]{1,20}),\s+([A-Z][a-z]{1,20})(?:\s+[A-Z]\.?)?(?:[,\s]+from\s+[A-Za-z\s,]+)?[,\s]+(?:holding the position of|serving as(?: the)?|is(?: the)?)\s+(manager|managing member|president|director|owner|officer|ceo|principal)/gi;
    let invMatch;
    while ((invMatch = invRe.exec(cleanText)) !== null) {
      const candidate = `${invMatch[2]} ${invMatch[1]}`;
      const valid = this.cleanPersonName(candidate, businessName);
      if (valid) {
        const rawTitle = invMatch[3].trim();
        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
        return { name: valid, title: formattedTitle, source: 'Corporate Registry Filing' };
      }
    }

    // 2. Led by / operated by / headed by owner [Mr.] Name
    const ledRe = /(?:led|headed|run|operated|managed)\s+by\s+(?:owner|founder|president|ceo|principal)?\s*(?:mr\.?|ms\.?|mrs\.?|dr\.?)?\s*([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})/gi;
    let ledMatch;
    while ((ledMatch = ledRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(ledMatch[1], businessName);
      if (valid) return { name: valid, title: 'Owner / Principal', source: 'Executive Leadership Context' };
    }

    // 3. Title [: ,] [is] [Mr.] Name (e.g. "Owner Patrick Planthaber", "Company Owner , Tim Bowen", "Principal: John Doe")
    const titleRe = /(?:owner|founder|co-founder|president|ceo|principal|managing member)[:\s,]+(?:is\s+)?(?:mr\.?|ms\.?|mrs\.?|dr\.?)?\s*([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})/gi;
    let titleMatch;
    while ((titleMatch = titleRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(titleMatch[1], businessName);
      if (valid) return { name: valid, title: 'Owner / Principal', source: 'Executive Title Anchor' };
    }

    // 4. Name [,] is [the] [proud] owner / founder / president / managing member
    const nameTitleRe = /([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})[,\s]+(?:is\s+(?:the\s+)?)?(?:the\s+)?(?:proud\s+)?(owner|founder|co-founder|president|ceo|principal|managing member)/gi;
    let nameTitleMatch;
    while ((nameTitleMatch = nameTitleRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(nameTitleMatch[1], businessName);
      if (valid) {
        const rawTitle = nameTitleMatch[2].trim();
        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
        return { name: valid, title: formattedTitle, source: 'Bio & Role Disclosure' };
      }
    }

    // 5. Name - Owner / Founder
    const dashRe = /([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s*[-–|]\s*(owner|founder|co-founder|president|ceo|principal|managing member)/gi;
    let dashMatch;
    while ((dashMatch = dashRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(dashMatch[1], businessName);
      if (valid) {
        const rawTitle = dashMatch[2].trim();
        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
        return { name: valid, title: formattedTitle, source: 'Leadership Byline' };
      }
    }

    // 6. Founded / Established / Owned by [Mr.] Name
    const foundRe = /(?:founded|established|started|owned)\s+by\s+(?:mr\.?|ms\.?|mrs\.?|dr\.?)?\s*([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})/gi;
    let foundMatch;
    while ((foundMatch = foundRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(foundMatch[1], businessName);
      if (valid) return { name: valid, title: 'Founder', source: 'Company History' };
    }

    // 7. Meet the owner / about our founder [Name]
    const meetRe = /(?:meet\s+(?:the\s+owner\s+|our\s+founder\s+)?|about\s+(?:the\s+owner\s+|our\s+founder\s+|the\s+founder\s+))(?:mr\.?|ms\.?|mrs\.?|dr\.?)?\s*([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})/gi;
    let meetMatch;
    while ((meetMatch = meetRe.exec(cleanText)) !== null) {
      const valid = this.cleanPersonName(meetMatch[1], businessName);
      if (valid) return { name: valid, title: 'Owner / Founder', source: 'Bio Page Intro' };
    }

    return null;
  }

  /**
   * Backward-compatible helper: extracts just the owner name
   */
  extractOwnerNameFromText(text, businessName = '') {
    const entity = this.extractOwnerEntityFromText(text, businessName);
    return entity?.name || null;
  }

  /**
   * Step 1: Discover or Confirm Owner Name & Corporate Entity
   */
  async discoverOwnerName(lead, manualName = null) {
    if (manualName && manualName.trim().length >= 3) {
      return manualName.trim();
    }

    // A. Check dedicated bio / About / Team pages with Stealth Fetcher fallback (check homepage first)
    if (lead.website && !osintService.isSocialOrDirectory(lead.website)) {
      const targetPaths = ['', '/about', '/about-us', '/our-team', '/team', '/leadership', '/owner'];
      let norm = lead.website.trim().replace(/\/+$/, '');
      if (!norm.startsWith('http')) norm = 'https://' + norm;

      for (const p of targetPaths) {
        try {
          let html = '';
          try {
            const pageRes = await axios.get(norm + p, {
              timeout: 4000,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              validateStatus: s => s === 200
            });
            html = pageRes.data;
          } catch (axiosErr) {
            // If challenged or failed, invoke stealth fetcher
            const sRes = await stealthService.fetch(norm + p, { engine: 'fast_http', timeout: 5000 });
            if (sRes.success && sRes.html) html = sRes.html;
          }

          if (html && typeof html === 'string') {
            const $ = cheerio.load(html);

            // Harvest any website social links
            if (!lead._siteSocials) lead._siteSocials = {};
            $('a[href]').each((_, el) => {
              const h = $(el).attr('href') || '';
              if (h.includes('instagram.com/') && !lead._siteSocials.instagram) {
                if (!/\/tv\b|\/reel\b|\/explore\b|\/p\/|\/stories\b|\/accounts\b/i.test(h)) {
                  lead._siteSocials.instagram = h;
                }
              }
              if (h.includes('facebook.com/') && !lead._siteSocials.facebook) {
                if (!/\/reel\b|\/sharer\b|\/dialog\b|\/watch\b|\/share\b|\/tr\b|\/events\b/i.test(h)) {
                  lead._siteSocials.facebook = h;
                }
              }
              if (h.includes('linkedin.com/in/') && !lead._siteSocials.linkedin) {
                lead._siteSocials.linkedin = h;
              }
            });

            $('script, style, svg').remove();
            $('p, h1, h2, h3, h4, h5, h6, li, span, div, a').append(' ');
            const bodyText = $('body').text();
            const foundEntity = this.extractOwnerEntityFromText(bodyText, lead.business_name);
            if (foundEntity) {
              if (!lead._discoveredTitle) lead._discoveredTitle = foundEntity.title;
              if (!lead._discoverySource) lead._discoverySource = foundEntity.source;
              return foundEntity.name;
            }
          }
        } catch {}
      }
    }

    // B. Search engine dorks for Corporate Registry, SOS, Sunbiz, and Executive Leadership
    const dorks = [
      `"${lead.business_name}" "${lead.city || ''}" (manager OR "managing member" OR officer OR principal OR "corporate filing" OR sunbiz OR "secretary of state")`,
      `"${lead.business_name}" "${lead.city || ''}" (owner OR founder OR president OR "meet the owner" OR "about the owner")`,
      `site:linkedin.com/in/ "${lead.business_name}" ${lead.city || ''}`,
      `site:bbb.org "${lead.business_name}" ${lead.city || ''}`
    ];

    for (const q of dorks) {
      const full = await this.searchFull(q);
      for (const snip of full.snippets) {
        if (!this.isSnippetRelevant(snip, lead.business_name)) continue;

        const foundEntity = this.extractOwnerEntityFromText(snip, lead.business_name);
        if (foundEntity) {
          if (!lead._discoveredTitle) lead._discoveredTitle = foundEntity.title;
          if (!lead._discoverySource) lead._discoverySource = foundEntity.source;
          return foundEntity.name;
        }
      }
      for (const snip of full.snippets) {
        if (!this.isSnippetRelevant(snip, lead.business_name)) continue;

        const liMatch = snip.match(/^([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s*[-–|]/);
        if (liMatch && liMatch[1]) {
          const cand = this.cleanPersonName(liMatch[1].trim(), lead.business_name);
          if (cand) {
            if (!lead._discoveredTitle) lead._discoveredTitle = 'Professional Profile';
            if (!lead._discoverySource) lead._discoverySource = 'LinkedIn Identity Graph';
            return cand;
          }
        }
      }
    }

    return null;
  }

  /**
   * Step 2: Generate Work Email Permutations
   */
  generatePermutations(fullName, domain) {
    if (!fullName || !domain) return [];
    const parts = fullName.toLowerCase().split(/\s+/).filter(p => /^[a-z]{2,20}$/.test(p));
    if (parts.length < 2) return [];

    const first = parts[0];
    const last = parts[parts.length - 1];
    const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0].toLowerCase();

    return [
      { email: `${first}@${cleanDomain}`, pattern: 'first' },
      { email: `${first}.${last}@${cleanDomain}`, pattern: 'first.last' },
      { email: `${first[0]}${last}@${cleanDomain}`, pattern: 'firstinitial.last' },
      { email: `${first}${last}@${cleanDomain}`, pattern: 'firstlast' },
      { email: `${last}.${first}@${cleanDomain}`, pattern: 'last.first' },
      { email: `${first}_${last}@${cleanDomain}`, pattern: 'first_last' }
    ];
  }

  /**
   * Step 3: Hunt Personal Inboxes (Gmail, Yahoo, Outlook, iCloud)
   */
  async huntPersonalEmails(ownerName, businessName, city) {
    if (!ownerName) return [];
    const queries = [
      `"${ownerName}" "${businessName}" ("@gmail.com" OR "@yahoo.com" OR "@outlook.com" OR "@icloud.com")`,
      `"${ownerName}" ${city || ''} ("@gmail.com" OR "@yahoo.com" OR "@outlook.com")`
    ];

    const emailsFound = new Set();
    for (const q of queries) {
      const snippets = await this.search(q);
      for (const snip of snippets) {
        const extracted = osintService.extractEmails(snip);
        for (const e of extracted) {
          const lower = e.toLowerCase();
          // Strictly match legitimate consumer email providers (reject subdomains like yahoo.uservoice.com)
          if (/@(?:gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|aol\.com)$/i.test(lower)) {
            emailsFound.add(lower);
          }
        }
      }
    }

    // Verify MX for discovered personal emails
    const verified = [];
    for (const email of emailsFound) {
      const hasMx = await osintService.verifyMx(email);
      if (hasMx) verified.push(email);
    }
    return verified;
  }

  /**
   * Step 4: Personal Social Footprint Hunting
   */
  async huntPersonalSocials(ownerName, businessName, city, lead = null) {
    if (!ownerName) return {};
    const socials = {
      linkedin: null,
      facebook: null,
      instagram: null,
      twitter: null
    };

    // 1. LinkedIn Person Profile (scan links and snippets across specific and broad dorks)
    const liQueries = [
      `site:linkedin.com/in/ "${ownerName}" "${businessName}"`,
      `site:linkedin.com/in/ "${ownerName}"`
    ];

    for (const q of liQueries) {
      const liRes = await this.searchFull(q);
      for (const link of liRes.links) {
        const match = link.match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
        if (match) {
          socials.linkedin = match[0];
          break;
        }
      }
      if (socials.linkedin) break;

      for (const snip of liRes.snippets) {
        const match = snip.match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
        if (match) {
          socials.linkedin = match[0];
          break;
        }
      }
      if (socials.linkedin) break;
    }

    // 2. Personal Facebook Profile
    const fbRes = await this.searchFull(`site:facebook.com "${ownerName}" "${city || ''}" "${businessName}"`);
    for (const link of fbRes.links) {
      const match = link.match(/https?:\/\/(?:www\.)?facebook\.com\/(?:people\/[a-zA-Z0-9_.-]+\/\d+|[a-zA-Z0-9_.-]+)/i);
      if (match && !match[0].includes('/pages/') && !match[0].includes('/groups/')) {
        socials.facebook = match[0];
        break;
      }
    }
    if (!socials.facebook) {
      for (const snip of fbRes.snippets) {
        const match = snip.match(/https?:\/\/(?:www\.)?facebook\.com\/(?:people\/[a-zA-Z0-9_.-]+\/\d+|[a-zA-Z0-9_.-]+)/i);
        if (match && !match[0].includes('/pages/') && !match[0].includes('/groups/')) {
          socials.facebook = match[0];
          break;
        }
      }
    }

    // 3. Instagram Profile
    const igRes = await this.searchFull(`site:instagram.com "${ownerName}" "${city || ''}"`);
    for (const link of igRes.links) {
      const match = link.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/i);
      if (match && !['explore', 'p', 'reels', 'stories'].includes(match[1])) {
        socials.instagram = match[0];
        break;
      }
    }
    if (!socials.instagram) {
      for (const snip of igRes.snippets) {
        const match = snip.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/i);
        if (match && !['explore', 'p', 'reels', 'stories'].includes(match[1])) {
          socials.instagram = match[0];
          break;
        }
      }
    }

    // 4. Supplement with verified business website social links if personal ones not found
    if (lead?._siteSocials) {
      if (!socials.instagram && lead._siteSocials.instagram) {
        socials.instagram = lead._siteSocials.instagram;
      }
      if (!socials.facebook && lead._siteSocials.facebook) {
        socials.facebook = lead._siteSocials.facebook;
      }
      if (!socials.linkedin && lead._siteSocials.linkedin) {
        socials.linkedin = lead._siteSocials.linkedin;
      }
    }

    return socials;
  }

  /**
   * Step 5: Run Sherlock username scanner if personal handle is detected
   */
  async runSherlock(handle) {
    if (!handle || handle.length < 3) return [];
    try {
      const { stdout } = await execPromise(`/home/beast/.local/bin/sherlock --timeout 5 --print-found "${handle}"`, { timeout: 15000 });
      const foundUrls = [];
      for (const line of stdout.split('\n')) {
        if (line.includes('http://') || line.includes('https://')) {
          const match = line.match(/https?:\/\/[^\s]+/);
          if (match) foundUrls.push(match[0]);
        }
      }
      return foundUrls;
    } catch {
      return [];
    }
  }

  /**
   * Main Execution: Run Deep-OSINT Person Pivot on a Lead
   */
  async enrichOwner(leadOrId, options = {}) {
    let lead;
    let leadId;
    if (typeof leadOrId === 'object' && leadOrId !== null) {
      lead = leadOrId;
      leadId = lead.id;
    } else {
      leadId = Number(leadOrId);
      lead = Lead.findById(leadId);
    }
    if (!lead) throw new Error(`Lead #${leadId} not found`);

    const manualOwnerName = typeof options === 'string' ? options : (options?.manualOwnerName || null);

    const dossier = {
      lead_id: lead.id,
      business_name: lead.business_name,
      city: lead.city,
      owner_name: null,
      owner_title: 'Owner / Principal',
      personal_emails: [],
      work_permutations: [],
      verified_work_email: null,
      primary_email: null,
      personal_mobile: null,
      phone_carrier: null,
      personal_socials: {},
      holehe_accounts: [],
      gravatar: null,
      sherlock_profiles: [],
      confidence: 'medium',
      enriched_at: new Date().toISOString()
    };

    // 1. Discover Owner Name
    const ownerName = await this.discoverOwnerName(lead, manualOwnerName);
    dossier.owner_name = ownerName;
    if (lead._discoveredTitle) dossier.owner_title = lead._discoveredTitle;
    if (lead._discoverySource) dossier.discovery_source = lead._discoverySource;

    if (!ownerName) {
      dossier.confidence = 'low';
      dossier.notes = 'Could not determine owner name automatically. Please enter owner name manually.';
      return dossier;
    }

    // 2. Generate and Verify Work Email Permutations (if legitimate business domain exists)
    if (lead.website && !osintService.isSocialOrDirectory(lead.website)) {
      const cleanDomain = lead.website.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0].toLowerCase();
      const blockedPermDomains = ['uservoice.com', 'zendesk.com', 'freshdesk.com', 'yahoo.com', 'bing.com', 'google.com', 'duckduckgo.com', 'atlassian.net', 'intercom.com', 'github.com'];
      const isBlockedDomain = blockedPermDomains.some(b => cleanDomain === b || cleanDomain.endsWith('.' + b));

      if (!isBlockedDomain) {
        const perms = this.generatePermutations(ownerName, cleanDomain);
        dossier.work_permutations = perms.map(p => p.email);

        // Verify MX on domain first
        const hasMx = await osintService.verifyMx(`test@${cleanDomain}`);
        if (hasMx && perms.length > 0) {
          // Preferred candidate permutation is first.last or first
          dossier.verified_work_email = perms[1]?.email || perms[0]?.email;
        }
      }
    }

    // 3. Hunt Personal Inboxes (Gmail, Yahoo, iCloud)
    const personalEmails = await this.huntPersonalEmails(ownerName, lead.business_name, lead.city);
    dossier.personal_emails = personalEmails;

    // Pick top primary direct email: Personal Gmail/Yahoo if found, else verified work permutation
    dossier.primary_email = personalEmails[0] || dossier.verified_work_email || null;

    // 4. Personal Mobile Phone Analysis via PhoneInfoga
    if (lead.phone) {
      try {
        const phoneIntel = await phoneService.scanPhoneNumber(lead.phone, lead.id, { fast: false });
        dossier.phone_carrier = phoneIntel.carrier;
        if (phoneIntel.phone_type === 'mobile' || phoneIntel.is_sms_ready) {
          dossier.personal_mobile = phoneIntel.phone_e164 || lead.phone;
          dossier.phone_type = 'Direct Mobile (Cellular)';
        } else {
          dossier.phone_type = `${phoneIntel.phone_type || 'Landline'} (Office Line)`;
        }
      } catch {}
    }

    // 5. Hunt Personal Social Profiles
    const socials = await this.huntPersonalSocials(ownerName, lead.business_name, lead.city, lead);
    dossier.personal_socials = socials;

    // 6. Check Personal Accounts via Holehe & Gravatar
    if (dossier.primary_email) {
      try {
        dossier.holehe_accounts = await osintService.checkHolehe(dossier.primary_email);
      } catch {}

      try {
        const grav = await osintService.resolveGravatar(dossier.primary_email);
        if (grav?.found) {
          dossier.gravatar = grav;
          if (grav.displayName && !dossier.owner_name) dossier.owner_name = grav.displayName;
        }
      } catch {}
    }

    // 7. Optional Sherlock scan if handle available
    const candidateHandle = dossier.primary_email ? dossier.primary_email.split('@')[0] : null;
    if (candidateHandle && !candidateHandle.includes('.') && candidateHandle.length >= 4) {
      const sherlockResults = await this.runSherlock(candidateHandle);
      dossier.sherlock_profiles = sherlockResults.slice(0, 5);
    }

    dossier.confidence = (dossier.primary_email && dossier.owner_name) ? 'high' : 'medium';

    // 8. Persist to SQLite Database
    try {
      // Upsert Contact Record
      Contact.upsert({
        lead_id: lead.id,
        email: dossier.primary_email || lead.email,
        email_type: 'decision_maker',
        contact_name: dossier.owner_name,
        contact_title: dossier.owner_title,
        phone: dossier.personal_mobile || lead.phone,
        social_links: {
          ...(dossier.personal_socials || {})
        },
        holehe_results: dossier.holehe_accounts,
        avatar_url: dossier.gravatar?.avatarUrl || null,
        gravatar_data: dossier.gravatar,
        is_mx_valid: dossier.primary_email ? 1 : 0
      });

      // Update Lead osint_evidence
      let currentEvidence = {};
      try {
        if (lead.osint_evidence) currentEvidence = JSON.parse(lead.osint_evidence);
      } catch {}
      currentEvidence.owner_dossier = dossier;

      Lead.update(lead.id, {
        osint_evidence: JSON.stringify(currentEvidence),
        phone_type: dossier.phone_type,
        carrier: dossier.phone_carrier || lead.carrier
      });
    } catch (saveErr) {
      console.warn('[OwnerOsintService] Save error:', saveErr.message);
    }

    return dossier;
  }
}

module.exports = new OwnerOsintService();
