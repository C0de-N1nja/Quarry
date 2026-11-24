const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const { parsePhoneNumber } = require('libphonenumber-js');
const osintService = require('./osint-service');
const stealthService = require('./stealth-service');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');

const WEIGHTS = {
  // Positive Scoring Signals
  PHONE_EXACT_NATIONAL: 50,
  PHONE_FUZZY_WINDOW: 35,
  DOMAIN_MATCH: 45,
  NAME_SIMILARITY_HIGH: 25,
  NAME_SIMILARITY_MEDIUM: 10,
  CITY_MATCH: 20,
  COUNTRY_MATCH: 15,
  DIRECTORY_CITATION_BONUS: 15,

  // Negative Signals / Penalties
  DOMAIN_MISMATCH: -35,
  COUNTRY_CONFLICT: -25,
  SINGLE_TOKEN_GENERIC_PENALTY: -20,

  // Decision Thresholds
  VERIFIED_SCORE_THRESHOLD: 60,
  REJECTED_SCORE_THRESHOLD: 10
};

function isSafePublicUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (host.endsWith('.internal') || host.endsWith('.local') || host.endsWith('.corp')) return false;
    return true;
  } catch {
    return false;
  }
}

class SocialResolverService {
  /**
   * Derive candidate username handles from email local-part and owner name
   */
  deriveHandles(email, groundTruth = {}) {
    const handles = new Set();
    if (!email || !email.includes('@')) return [];

    const [localPart, domain] = email.toLowerCase().trim().split('@');
    if (localPart) {
      // 1. Clean local part
      const cleanLocal = localPart.replace(/[^a-z0-9._-]/g, '');
      if (cleanLocal.length >= 3) handles.add(cleanLocal);

      // Strip separators
      const noSep = cleanLocal.replace(/[._-]/g, '');
      if (noSep.length >= 3) handles.add(noSep);

      // If local-part has dot/dash/underscore (e.g. patrick.planthaber)
      const parts = cleanLocal.split(/[._-]/).filter(p => p.length >= 2);
      if (parts.length >= 2) {
        handles.add(parts.join(''));
        handles.add(parts.join('_'));
        handles.add(parts.join('-'));
        handles.add(`${parts[0][0]}${parts[parts.length - 1]}`); // e.g. pplanthaber
      }
    }

    // 2. Derive from Ground-Truth Owner Name if provided
    if (groundTruth?.owner_name) {
      const nameParts = groundTruth.owner_name.toLowerCase().trim().split(/\s+/).filter(p => /^[a-z]{2,20}$/.test(p));
      if (nameParts.length >= 2) {
        const first = nameParts[0];
        const last = nameParts[nameParts.length - 1];
        handles.add(`${first}${last}`);
        handles.add(`${first}.${last}`);
        handles.add(`${first}_${last}`);
        handles.add(`${first}-${last}`);
        handles.add(`${first[0]}${last}`);
        handles.add(`${last}${first}`);
      }
    }

    // 3. Add explicit known handles if any
    if (Array.isArray(groundTruth?.known_handles)) {
      groundTruth.known_handles.forEach(h => {
        if (typeof h === 'string' && h.trim().length >= 2) handles.add(h.trim().toLowerCase());
      });
    }

    // Exclude generic email prefixes
    const generic = new Set(['info', 'contact', 'support', 'sales', 'admin', 'office', 'service', 'team', 'help', 'billing']);
    return Array.from(handles).filter(h => !generic.has(h));
  }

  /**
   * Calculate string similarity score between 0 and 1 (token Jaccard / Levenshtein hybrid)
   */
  calculateNameSimilarity(strA, strB) {
    if (!strA || !strB) return 0;
    const a = strA.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const b = strB.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;

    const tokensA = new Set(a.split(/\s+/).filter(Boolean));
    const tokensB = new Set(b.split(/\s+/).filter(Boolean));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }
    const union = new Set([...tokensA, ...tokensB]).size;
    return intersection / union;
  }

  /**
   * Fetch public GitHub profile data
   */
  async fetchGitHubProfile(handle) {
    try {
      const res = await axios.get(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
        timeout: 4500,
        headers: { 'User-Agent': 'Quarry-OSINT-Resolver/1.0', 'Accept': 'application/vnd.github.v3+json' },
        validateStatus: s => s === 200
      });
      if (res.status === 200 && res.data && res.data.id) {
        return {
          platform: 'GitHub',
          handle: res.data.login,
          profile_url: res.data.html_url,
          display_name: res.data.name || null,
          bio: res.data.bio || null,
          website: res.data.blog || null,
          location: res.data.location || null,
          avatar_url: res.data.avatar_url || null,
          followers: res.data.followers || 0,
          raw_data: {
            company: res.data.company,
            public_repos: res.data.public_repos,
            created_at: res.data.created_at
          }
        };
      }
    } catch {}
    return null;
  }

  /**
   * Fetch public Reddit profile data
   */
  async fetchRedditProfile(handle) {
    try {
      const res = await axios.get(`https://www.reddit.com/user/${encodeURIComponent(handle)}/about.json`, {
        timeout: 4500,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuarryOSINT/1.0' },
        validateStatus: s => s === 200
      });
      const data = res.data?.data;
      if (data && data.name) {
        return {
          platform: 'Reddit',
          handle: data.name,
          profile_url: `https://www.reddit.com/user/${data.name}`,
          display_name: data.subreddit?.title || data.name,
          bio: data.subreddit?.public_description || null,
          website: null,
          location: null,
          avatar_url: data.icon_img ? data.icon_img.split('?')[0] : null,
          followers: data.subreddit?.subscribers || 0,
          raw_data: {
            total_karma: data.total_karma,
            created_utc: data.created_utc
          }
        };
      }
    } catch {}
    return null;
  }

  /**
   * Fetch Gravatar profile and verified external linked accounts
   */
  async fetchGravatarProfile(email) {
    if (!email || !email.includes('@')) return null;
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    try {
      const res = await axios.get(`https://en.gravatar.com/${hash}.json`, {
        timeout: 4500,
        headers: { 'User-Agent': 'Quarry-OSINT-Resolver/1.0' },
        validateStatus: s => s === 200
      });
      const entry = res.data?.entry?.[0];
      if (entry) {
        const websites = Array.isArray(entry.urls) ? entry.urls.map(u => u.value) : [];
        const accounts = Array.isArray(entry.accounts) ? entry.accounts.map(a => ({
          domain: a.domain,
          username: a.username,
          url: a.url,
          verified: a.verified === 'true'
        })) : [];

        return {
          platform: 'Gravatar',
          handle: entry.preferredUsername || email.split('@')[0],
          profile_url: entry.profileUrl || `https://gravatar.com/${entry.preferredUsername || hash}`,
          display_name: entry.displayName || entry.name?.formatted || null,
          bio: entry.aboutMe || null,
          website: websites[0] || null,
          location: entry.currentLocation || null,
          avatar_url: entry.thumbnailUrl || `https://www.gravatar.com/avatar/${hash}`,
          linked_accounts: accounts,
          raw_data: { entry }
        };
      }
    } catch {}
    return null;
  }

  /**
   * Search for social profiles via targeted search engine dorks
   */
  async fetchSocialViaSearch(platform, handle, groundTruth = {}) {
    const domainMap = {
      'LinkedIn': 'linkedin.com/in',
      'Twitter/X': 'x.com',
      'Instagram': 'instagram.com',
      'Facebook': 'facebook.com'
    };
    const domain = domainMap[platform];
    if (!domain) return null;

    const query = `site:${domain}/${handle}`;
    try {
      const res = await osintService.searchEngineQuery(query, 'yahoo', 5000);
      for (const link of res.links || []) {
        if (link.includes(`${domain}/${handle}`)) {
          // Extract matching snippet
          const snippet = res.snippets?.find(s => s.toLowerCase().includes(handle.toLowerCase())) || res.snippets?.[0] || '';
          return {
            platform,
            handle,
            profile_url: link,
            display_name: null,
            bio: snippet || null,
            website: null,
            location: null,
            avatar_url: null,
            raw_data: { snippet }
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * Multi-Factor Identity Attribution Scorer
   * Compares candidate profile data against ground-truth owner facts
   */
  scoreAttribution(profile, groundTruth = {}, email = '') {
    let score = 0;
    const evidence = [];
    const flags = [];

    const normUrl = (u) => (u || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '').split('/')[0];
    const targetDomain = normUrl(groundTruth.website || (email.includes('@') ? email.split('@')[1] : ''));
    const isGenericEmailProvider = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'].includes(targetDomain);

    // 1. Direct Email Registration Evidence (e.g. confirmed via Holehe or Gravatar hash)
    if (profile.registered_via_email) {
      score += 25;
      evidence.push({
        factor: 'EMAIL_REGISTRATION_MATCH',
        weight: 25,
        detail: `Account confirmed registered to target email address (${email})`
      });
    }

    // 2. Bio Link / Website Match (Strongest anchor)
    if (profile.website && targetDomain && !isGenericEmailProvider) {
      const profileDomain = normUrl(profile.website);
      if (profileDomain === targetDomain || profileDomain.endsWith('.' + targetDomain)) {
        score += 45;
        evidence.push({
          factor: 'BIO_WEBSITE_MATCH',
          weight: 45,
          detail: `Profile website '${profile.website}' directly links to target domain '${targetDomain}'`
        });
      }
    } else if (profile.bio && targetDomain && !isGenericEmailProvider) {
      if (profile.bio.toLowerCase().includes(targetDomain)) {
        score += 35;
        evidence.push({
          factor: 'BIO_DOMAIN_MENTION',
          weight: 35,
          detail: `Profile bio mentions company domain '${targetDomain}'`
        });
      }
    }

    // 3. Display Name Similarity to Owner Name
    if (profile.display_name && groundTruth.owner_name) {
      const sim = this.calculateNameSimilarity(profile.display_name, groundTruth.owner_name);
      if (sim >= 0.9) {
        score += 35;
        evidence.push({
          factor: 'NAME_EXACT_MATCH',
          weight: 35,
          detail: `Profile name '${profile.display_name}' matches owner '${groundTruth.owner_name}'`
        });
      } else if (sim >= 0.5) {
        score += 20;
        evidence.push({
          factor: 'NAME_PARTIAL_MATCH',
          weight: 20,
          detail: `Profile name '${profile.display_name}' shares tokens with owner '${groundTruth.owner_name}'`
        });
      } else {
        // Name contradiction penalty
        score -= 40;
        flags.push(`Name contradiction: profile name '${profile.display_name}' differs from owner '${groundTruth.owner_name}'`);
      }
    }

    // 4. Location Match
    if (profile.location && groundTruth.city) {
      const pLoc = profile.location.toLowerCase();
      const tCity = groundTruth.city.toLowerCase().trim();
      if (pLoc.includes(tCity)) {
        score += 15;
        evidence.push({
          factor: 'LOCATION_MATCH',
          weight: 15,
          detail: `Profile location '${profile.location}' matches city '${groundTruth.city}'`
        });
      }
    }

    // 5. Business Name Mention in Bio
    if (profile.bio && groundTruth.business_name) {
      const bName = groundTruth.business_name.toLowerCase().trim();
      if (profile.bio.toLowerCase().includes(bName)) {
        score += 25;
        evidence.push({
          factor: 'COMPANY_NAME_IN_BIO',
          weight: 25,
          detail: `Profile bio references business name '${groundTruth.business_name}'`
        });
      }
    }

    // 6. Handle Entropy / Shared Handle Weight
    if (profile.handle) {
      const cleanHandle = profile.handle.toLowerCase();
      const localPart = email.split('@')[0]?.toLowerCase();
      if (localPart && (cleanHandle === localPart || cleanHandle.includes(localPart))) {
        // High entropy check: handle has >= 8 characters or matches first+last tokens
        if (cleanHandle.length >= 8) {
          score += 15;
          evidence.push({
            factor: 'HIGH_ENTROPY_HANDLE_MATCH',
            weight: 15,
            detail: `High-entropy handle '${profile.handle}' matches email local-part '${localPart}'`
          });
        } else {
          score += 5;
          evidence.push({
            factor: 'HANDLE_MATCH',
            weight: 5,
            detail: `Handle '${profile.handle}' matches email username`
          });
        }
      }
    }

    // Bound score
    const finalScore = Math.max(0, Math.min(100, score));

    // Determine Verdict
    let verdict = 'AMBIGUOUS';
    if (flags.length > 0 && finalScore < 40) {
      verdict = 'DISQUALIFIED';
    } else if (finalScore >= 75) {
      verdict = 'CONFIRMED_MATCH';
    } else if (finalScore >= 50) {
      verdict = 'PROBABLE_MATCH';
    } else if (finalScore >= 30) {
      verdict = 'AMBIGUOUS';
    } else {
      verdict = 'UNMATCHED';
    }

    return {
      confidence_score: finalScore,
      verdict,
      evidence,
      flags
    };
  }

  /**
   * Main Resolution Pipeline: Resolve Social Accounts from Email Address
   */
  async resolveSocialAccounts(email, options = {}) {
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required for social account resolution');
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Build Ground Truth context from options or database
    let groundTruth = options.groundTruth || {};
    if (options.leadId && (!groundTruth.owner_name || !groundTruth.website)) {
      try {
        const lead = Lead.findById(options.leadId);
        if (lead) {
          groundTruth = {
            owner_name: groundTruth.owner_name || null,
            business_name: groundTruth.business_name || lead.business_name,
            website: groundTruth.website || lead.website,
            city: groundTruth.city || lead.city,
            ...groundTruth
          };
          const contact = Contact.findByLeadId(lead.id);
          if (contact?.contact_name && !groundTruth.owner_name) {
            groundTruth.owner_name = contact.contact_name;
          }
        }
      } catch {}
    }

    const report = {
      target_email: cleanEmail,
      ground_truth: groundTruth,
      registered_platforms: [],
      derived_handles: [],
      matches: [],
      ambiguous: [],
      disqualified: [],
      summary: {
        total_platforms_detected: 0,
        confirmed_matches: 0,
        probable_matches: 0,
        ambiguous_matches: 0,
        disqualified_matches: 0
      },
      resolved_at: new Date().toISOString()
    };

    // 2. Enumerate Registered Platforms via Holehe
    let registeredPlatforms = [];
    try {
      registeredPlatforms = await osintService.checkHolehe(cleanEmail);
      report.registered_platforms = registeredPlatforms;
      report.summary.total_platforms_detected = registeredPlatforms.length;
    } catch {}

    // 3. Derive Candidate Handles
    const handles = this.deriveHandles(cleanEmail, groundTruth);
    report.derived_handles = handles;

    const candidateProfiles = [];

    // 4. Fetch Gravatar Profile (direct email cryptographic resolution)
    try {
      const gravatar = await this.fetchGravatarProfile(cleanEmail);
      if (gravatar) {
        gravatar.registered_via_email = true;
        candidateProfiles.push(gravatar);

        // If Gravatar exposes linked verified external accounts (Twitter, GitHub, etc.)
        if (Array.isArray(gravatar.linked_accounts)) {
          for (const acc of gravatar.linked_accounts) {
            if (acc.domain === 'github.com' && acc.username) {
              const gh = await this.fetchGitHubProfile(acc.username);
              if (gh) {
                gh.registered_via_email = true;
                candidateProfiles.push(gh);
              }
            } else if (acc.url) {
              candidateProfiles.push({
                platform: acc.domain || 'External Verified Account',
                handle: acc.username || 'verified_user',
                profile_url: acc.url,
                display_name: gravatar.display_name,
                bio: null,
                website: gravatar.website,
                location: gravatar.location,
                registered_via_email: true
              });
            }
          }
        }
      }
    } catch {}

    // 5. Probe Candidate Handles on GitHub & Reddit
    const topHandles = handles.slice(0, 4); // prioritize top derived handles
    for (const h of topHandles) {
      // GitHub Probe
      if (registeredPlatforms.includes('github') || candidateProfiles.every(p => p.platform !== 'GitHub')) {
        const gh = await this.fetchGitHubProfile(h);
        if (gh && !candidateProfiles.some(p => p.platform === 'GitHub' && p.handle.toLowerCase() === gh.handle.toLowerCase())) {
          if (registeredPlatforms.includes('github')) gh.registered_via_email = true;
          candidateProfiles.push(gh);
        }
      }

      // Reddit Probe
      if (registeredPlatforms.includes('reddit') || candidateProfiles.every(p => p.platform !== 'Reddit')) {
        const red = await this.fetchRedditProfile(h);
        if (red && !candidateProfiles.some(p => p.platform === 'Reddit' && p.handle.toLowerCase() === red.handle.toLowerCase())) {
          if (registeredPlatforms.includes('reddit')) red.registered_via_email = true;
          candidateProfiles.push(red);
        }
      }

      // LinkedIn / X / Instagram Probe via search snippet
      for (const plat of ['LinkedIn', 'Twitter/X', 'Instagram']) {
        const key = plat.toLowerCase().replace('/x', '');
        if (registeredPlatforms.includes(key)) {
          const soc = await this.fetchSocialViaSearch(plat, h, groundTruth);
          if (soc && !candidateProfiles.some(p => p.platform === plat && p.handle === soc.handle)) {
            soc.registered_via_email = true;
            candidateProfiles.push(soc);
          }
        }
      }
    }

    // 6. Score & Categorize All Discovered Profiles
    for (const profile of candidateProfiles) {
      const scoring = this.scoreAttribution(profile, groundTruth, cleanEmail);
      const enrichedResult = {
        platform: profile.platform,
        handle: profile.handle,
        profile_url: profile.profile_url,
        display_name: profile.display_name,
        bio: profile.bio,
        website: profile.website,
        location: profile.location,
        avatar_url: profile.avatar_url,
        confidence_score: scoring.confidence_score,
        verdict: scoring.verdict,
        evidence: scoring.evidence,
        flags: scoring.flags,
        raw_data: profile.raw_data || null
      };

      if (scoring.verdict === 'CONFIRMED_MATCH') {
        report.matches.push(enrichedResult);
        report.summary.confirmed_matches++;
      } else if (scoring.verdict === 'PROBABLE_MATCH') {
        report.matches.push(enrichedResult);
        report.summary.probable_matches++;
      } else if (scoring.verdict === 'AMBIGUOUS') {
        report.ambiguous.push(enrichedResult);
        report.summary.ambiguous_matches++;
      } else {
        report.disqualified.push(enrichedResult);
        report.summary.disqualified_matches++;
      }
    }

    report.matches.sort((a, b) => b.confidence_score - a.confidence_score);
    report.ambiguous.sort((a, b) => b.confidence_score - a.confidence_score);

    return report;
  }

  /**
   * Scrape and extract authentic social media profile links directly from prospect's verified website.
   * Enforces brand token overlap and restricts extraction to static owner-authored HTML elements.
   * @param {string} websiteUrl - Target verified business website
   * @param {Object} [lead] - Lead ground truth for brand token verification
   */
  async vouchFromVerifiedWebsite(websiteUrl, lead = {}) {
    if (!isSafePublicUrl(websiteUrl)) return {};
    const socials = {};

    try {
      let html = '';
      if (stealthService.isAvailable()) {
        const res = await stealthService.fetch(websiteUrl, { timeout: 8000 });
        if (res && res.html) html = res.html;
      }
      if (!html) {
        const resp = await axios.get(websiteUrl, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
          maxRedirects: 3,
          validateStatus: s => s < 400
        });
        html = typeof resp.data === 'string' ? resp.data : '';
      }

      if (!html) return socials;
      return this.extractSocialLinksFromHtml(html, lead);
    } catch {}

    return socials;
  }

  /**
   * Parse static owner-authored HTML elements and extract authentic social media links,
   * enforcing brand token overlap and rejecting external designer/agency links.
   * @param {string} html - Raw HTML of verified website
   * @param {Object} [lead] - Lead ground truth for brand token verification
   * @returns {Object} Extracted socials map
   */
  extractSocialLinksFromHtml(html, lead = {}) {
    const socials = {};
    if (!html || typeof html !== 'string') return socials;

    try {
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);

      // Strip dynamic scripts, styles, iframes, share widgets, designer credits, theme links
      $('script, style, iframe, noscript, svg').remove();
      $('[class*="share"], [id*="share"], [class*="widget"], [id*="widget"], [class*="credit"], [id*="credit"], [class*="designer"], [id*="designer"], [class*="theme"], [class*="author"]').remove();

      const candidateHrefs = [];
      $('nav a[href], footer a[href], header a[href], main a[href], a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !candidateHrefs.includes(href)) candidateHrefs.push(href);
      });

      // Helper to check brand-token overlap between handle and business name
      const hasBrandTokenOverlap = (handle, bName) => {
        if (!bName) return true;
        const cleanHandle = String(handle).toLowerCase().replace(/[^a-z0-9]/g, '');
        const stopWords = new Set([
          'the', 'and', '&', 'inc', 'llc', 'corp', 'co', 'pty', 'ltd', 'limited', 'services', 'service',
          'solutions', 'group', 'company', 'pros', 'pro', 'australia', 'city', 'area'
        ]);
        const tradeWords = new Set([
          'roof', 'roofing', 'floor', 'flooring', 'tile', 'tiler', 'tiling', 'clean', 'cleaning',
          'plumb', 'plumbing', 'paint', 'painting', 'electric', 'electrician', 'contractor', 'builder',
          'renovation', 'renovations', 'remodel', 'remodeling', 'repair', 'repairs', 'agency', 'media', 'design', 'digital'
        ]);
        // Distinctive brand root token definition: not in generic trade/stopword list, min length >= 4
        const tokens = bName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !stopWords.has(w));
        const distinctiveTokens = tokens.filter(w => !tradeWords.has(w));

        if (distinctiveTokens.length > 0) {
          return distinctiveTokens.some(tok => cleanHandle.includes(tok) || (tok.length >= 5 && tok.includes(cleanHandle)));
        }
        const allTrade = tokens.filter(w => tradeWords.has(w));
        if (allTrade.length > 0) {
          return allTrade.every(tok => cleanHandle.includes(tok));
        }
        return true;
      };

      const hardIgnorePatterns = /sharer|share\.php|dialog|plugins|widgets|tr\?id=/i;
      const suspiciousAgencyPatterns = /theme|developer|webdesign|seo|agency|advertis|studio/i;

      for (const h of candidateHrefs) {
        if (hardIgnorePatterns.test(h)) continue;

        // Facebook
        if (!socials.facebook) {
          const fb = h.match(/^https?:\/\/(?:www\.)?facebook\.com\/(?:profile\.php\?id=\d+|([a-zA-Z0-9._-]+))\/?(?:#[^"']*)?$/i);
          if (fb && fb[1] && !['sharer', 'dialog', 'login', 'pages', 'groups', 'events'].includes(fb[1].toLowerCase())) {
            const handle = fb[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard external agency/developer link
            } else if (hasOverlap) {
              socials.facebook = h.split('?')[0].replace(/\/+$/, '');
            }
          }
        }

        // Instagram
        if (!socials.instagram) {
          const ig = h.match(/^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)\/?(?:#[^"']*)?$/i);
          if (ig && ig[1] && !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'about', 'legal'].includes(ig[1].toLowerCase())) {
            const handle = ig[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard external agency
            } else if (hasOverlap) {
              socials.instagram = `https://www.instagram.com/${ig[1]}`;
            }
          }
        }

        // LinkedIn
        if (!socials.linkedin) {
          const li = h.match(/^https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._-]+)\/?/i);
          if (li && li[1]) {
            const handle = li[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard external agency
            } else if (hasOverlap) {
              socials.linkedin = h.split('?')[0].replace(/\/+$/, '');
            }
          }
        }

        // X / Twitter
        if (!socials.twitter) {
          const tw = h.match(/^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/i);
          if (tw && tw[1] && !['intent', 'share', 'home', 'explore', 'i'].includes(tw[1].toLowerCase())) {
            const handle = tw[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard
            } else if (hasOverlap) {
              socials.twitter = `https://x.com/${tw[1]}`;
            }
          }
        }

        // TikTok
        if (!socials.tiktok) {
          const tt = h.match(/^https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._-]+)\/?/i);
          if (tt && tt[1] && !['video', 'tag', 'music', 'live'].includes(tt[1].toLowerCase())) {
            const handle = tt[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard
            } else if (hasOverlap) {
              socials.tiktok = `https://www.tiktok.com/@${tt[1]}`;
            }
          }
        }

        // YouTube
        if (!socials.youtube) {
          const yt = h.match(/^https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|user\/|@)([a-zA-Z0-9._-]+)\/?/i);
          if (yt && yt[1]) {
            const handle = yt[1];
            const hasOverlap = hasBrandTokenOverlap(handle, lead.business_name);
            const isSuspicious = suspiciousAgencyPatterns.test(h);
            if (isSuspicious && !hasOverlap) {
              // Discard
            } else if (hasOverlap) {
              socials.youtube = h.split('?')[0].replace(/\/+$/, '');
            }
          }
        }
      }
    } catch {}

    return socials;
  }

  /**
   * Deterministic entity-resolution scorer for social candidate profiles
   * @param {Object} lead - Lead record (business_name, phone, phone_e164, country, city, website)
   * @param {Object} profile - Scraped profile data (platform, url, status, page_name, bio, website, addresses, phones, emails, source)
   * @returns {{ schema_version: number, state: 'verified'|'unverified'|'rejected', score: number, features: Object, reasons: string[], variant: string }}
   */
  scoreSocialCandidate(lead, profile = {}) {
    const reasons = [];
    const features = {
      phone_exact_match: false,
      phone_fuzzy_match: false,
      phone_match: false,
      phone_match_with_domain_conflict: false,
      domain_match: false,
      domain_mismatch: false,
      country_match: null,
      country_conflict: false,
      city_match: null,
      name_similarity: 0,
      single_token_only: false,
      vouched_by_website: false
    };

    if (!profile || !profile.url) {
      return { schema_version: 1, state: 'rejected', score: 0, features, reasons: ['Missing profile URL'], variant: profile?.variant || 'www' };
    }

    // 0. Trust Root: Verified Website Vouching
    if (profile.source === 'website_vouch') {
      features.vouched_by_website = true;
      features.domain_match = true;
      reasons.push('Vouched directly by authentic verified business website');
      return {
        schema_version: 1,
        state: 'verified',
        score: 100,
        features,
        reasons,
        variant: profile.variant || 'www'
      };
    }

    // 1. Check for Login Wall / Empty / Blocked Status
    if (profile.status === 'login_wall' || profile.status === 'blocked' || profile.status === 'empty') {
      reasons.push(`Scrape status was ${profile.status}: no public bio/contact content accessible`);
      return {
        schema_version: 1,
        state: 'unverified',
        score: 0,
        features,
        reasons,
        variant: profile.variant || 'www'
      };
    }

    let score = 0;
    const isoCountry = (lead.country || 'US').toUpperCase().trim();

    // 2. Phone Match Feature (E.164 normalization via libphonenumber-js)
    const leadPhoneRaw = lead.phone_e164 || lead.phone;
    let leadE164 = null;
    let leadNationalNumber = null;
    let leadDigits = null;
    if (leadPhoneRaw) {
      try {
        const parsed = parsePhoneNumber(String(leadPhoneRaw), isoCountry);
        if (parsed && parsed.isValid()) {
          leadE164 = parsed.format('E.164');
          leadNationalNumber = String(parsed.nationalNumber);
        }
      } catch {}
      leadDigits = String(leadPhoneRaw).replace(/\D/g, '').slice(-10);
    }

    // Phone Provenance Check: If directory, verify it's a dedicated business profile, not a search/aggregator page
    let provenanceAllowed = true;
    if (profile.platform === 'directory') {
      const urlLower = String(profile.url).toLowerCase();
      const isDedicatedListing = /\/(?:biz|business|pro|connect|tradie|profile)\//.test(urlLower) ||
        !/(?:find|search|browse|category|directory|listings|service\?)/.test(urlLower);
      if (!isDedicatedListing) {
        provenanceAllowed = false;
        reasons.push('Directory phone discarded: listing page contains multiple businesses');
      }
    }

    const profilePhones = Array.isArray(profile.phones) ? profile.phones : [];
    let detectedProfilePhoneCountry = null;

    if (provenanceAllowed) {
      for (const ph of profilePhones) {
        let candE164 = null;
        let candNationalNumber = null;
        let candDigits = null;
        try {
          const p1 = parsePhoneNumber(String(ph), isoCountry);
          if (p1 && p1.isValid()) {
            candE164 = p1.format('E.164');
            candNationalNumber = String(p1.nationalNumber);
            detectedProfilePhoneCountry = p1.country;
          }
        } catch {}
        if (!candE164 && String(ph).startsWith('+')) {
          try {
            const p2 = parsePhoneNumber(String(ph));
            if (p2 && p2.isValid()) {
              candE164 = p2.format('E.164');
              candNationalNumber = String(p2.nationalNumber);
              detectedProfilePhoneCountry = p2.country;
            }
          } catch {}
        }
        candDigits = String(ph).replace(/\D/g, '').slice(-10);

        // Strict Full E.164 Equality Check (Country Code + National Significant Number)
        if (leadE164 && candE164) {
          if (leadE164 === candE164) {
            features.phone_exact_match = true;
            features.phone_match = true;
            break;
          }
          // Cross-country guard: if countries differ (e.g. +64 NZ vs +61 AU), never exact match
          if (detectedProfilePhoneCountry && detectedProfilePhoneCountry !== isoCountry) {
            continue;
          }
        } else if (leadNationalNumber && candNationalNumber && leadNationalNumber === candNationalNumber) {
          const sameCountry = !detectedProfilePhoneCountry || detectedProfilePhoneCountry === isoCountry;
          if (sameCountry) {
            features.phone_exact_match = true;
            features.phone_match = true;
            break;
          }
        }

        // Fuzzy partial match (last 8-10 digits) - strictly within the same country
        const sameCountryOrUnspecified = !detectedProfilePhoneCountry || detectedProfilePhoneCountry === isoCountry;
        if (sameCountryOrUnspecified && leadDigits && candDigits && leadDigits.length >= 8 && leadDigits.slice(-8) === candDigits.slice(-8)) {
          features.phone_fuzzy_match = true;
          features.phone_match = true;
        }
      }
    }

    if (features.phone_exact_match) {
      score += WEIGHTS.PHONE_EXACT_NATIONAL;
      reasons.push('Exact E.164 national phone number matched authentic lead contact');
    } else if (features.phone_fuzzy_match) {
      score += WEIGHTS.PHONE_FUZZY_WINDOW;
      reasons.push('Partial phone number match (fuzzy window, scoring signal only)');
    }

    // 3. Geographic & Country Contradiction Check (VETO GUARD)
    const profileAddresses = Array.isArray(profile.addresses) ? profile.addresses : [];
    let hasForeignGeoPattern = false;
    let profileCountryDetected = detectedProfilePhoneCountry || null;

    for (const addr of profileAddresses) {
      const uAddr = addr.toUpperCase();
      if (uAddr.includes(', US') || uAddr.includes(', USA') || /,\s*[A-Z]{2},\s*US\b/.test(uAddr)) {
        profileCountryDetected = 'US';
        hasForeignGeoPattern = true;
      }
    }

    if (lead.country && profileCountryDetected && lead.country !== profileCountryDetected) {
      features.country_conflict = true;
      // HARD REJECT VETO: Foreign phone AND foreign geo pattern appear together
      if (hasForeignGeoPattern && detectedProfilePhoneCountry && detectedProfilePhoneCountry !== lead.country) {
        reasons.push(`Hard reject: Foreign phone (${detectedProfilePhoneCountry}) and foreign address pattern contradict lead country (${lead.country})`);
        return {
          schema_version: 1,
          state: 'rejected',
          score: 0,
          features,
          reasons,
          variant: profile.variant || 'www'
        };
      }
      score += WEIGHTS.COUNTRY_CONFLICT;
      reasons.push(`Country conflict detected: profile country (${profileCountryDetected}) vs lead country (${lead.country})`);
    } else if (lead.country && profileCountryDetected && lead.country === profileCountryDetected) {
      features.country_match = true;
      score += WEIGHTS.COUNTRY_MATCH;
    }

    // 4. Domain Match Feature (Lead Website vs Profile Website)
    const leadWebsite = lead.website && !lead.has_no_website ? lead.website.trim() : null;
    const profileWebsite = profile.website ? profile.website.trim() : null;

    const extractHost = (u) => {
      try {
        const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
        return parsed.hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        return null;
      }
    };

    if (leadWebsite && profileWebsite) {
      const leadHost = extractHost(leadWebsite);
      const profileHost = extractHost(profileWebsite);

      if (leadHost && profileHost) {
        if (leadHost === profileHost) {
          features.domain_match = true;
          score += WEIGHTS.DOMAIN_MATCH;
          reasons.push(`Profile links directly to authentic business domain (${leadHost})`);
        } else {
          features.domain_mismatch = true;
          score += WEIGHTS.DOMAIN_MISMATCH;
          reasons.push(`Profile outbound domain (${profileHost}) mismatches lead domain (${leadHost})`);
        }
      }
    }

    // 5. Full-Name Similarity Feature
    const bName = (lead.business_name || '').toLowerCase().trim();
    const pName = (profile.page_name || '').toLowerCase().trim();
    if (bName && pName) {
      const tokensA = bName.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !['inc', 'llc', 'company', 'services'].includes(w));
      const tokensB = pName.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !['inc', 'llc', 'company', 'services'].includes(w));

      const setA = new Set(tokensA);
      const setB = new Set(tokensB);
      let intersection = 0;
      for (const t of setA) {
        if (setB.has(t)) intersection++;
      }
      const union = new Set([...tokensA, ...tokensB]).size;
      const jaccard = union > 0 ? (intersection / union) : 0;
      features.name_similarity = Number(jaccard.toFixed(2));

      if (intersection === 1 && setA.size > 1 && setB.size > 1 && jaccard < 0.4) {
        features.single_token_only = true;
        score += WEIGHTS.SINGLE_TOKEN_GENERIC_PENALTY;
        reasons.push(`Single shared generic token ("${tokensA[0]}") is insufficient without anchor match`);
      } else if (jaccard >= 0.75) {
        score += WEIGHTS.NAME_SIMILARITY_HIGH;
        reasons.push(`High name similarity (${Math.round(jaccard * 100)}%)`);
      } else if (jaccard >= 0.4) {
        score += WEIGHTS.NAME_SIMILARITY_MEDIUM;
      }
    }

    // 6. City Match Feature
    if (lead.city && lead.city.trim()) {
      const cleanCity = lead.city.toLowerCase().trim();
      const combinedText = `${profile.bio || ''} ${profileAddresses.join(' ')}`.toLowerCase();
      if (combinedText.includes(cleanCity)) {
        features.city_match = true;
        score += WEIGHTS.CITY_MATCH;
        reasons.push(`Profile explicitly mentions lead city (${lead.city})`);
      } else {
        features.city_match = false;
      }
    } else {
      features.city_match = null;
    }

    // Directory-specific citation bonus
    const isDirectory = profile.platform === 'directory' || ['yelp', 'yellowpages', 'bbb', 'truelocal', 'houzz', 'bark'].includes(profile.platform);
    if (isDirectory && features.phone_match) {
      score += WEIGHTS.DIRECTORY_CITATION_BONUS;
      reasons.push('Verified business directory telephone match');
    }

    // 7. Final State Resolution
    let state = 'unverified';

    // Hard Rule Gate: Exact National E.164 phone match verifies profile directly
    if (features.phone_exact_match) {
      state = 'verified';
      if (features.domain_mismatch) {
        features.phone_match_with_domain_conflict = true;
        reasons.push('Notice: Verified via exact national phone match, but outbound domain differs from lead website');
      }
      return {
        schema_version: 1,
        state,
        score: Math.max(0, Math.min(100, score)),
        features,
        reasons,
        variant: profile.variant || 'www'
      };
    }

    // Standard scoring threshold
    if (score >= WEIGHTS.VERIFIED_SCORE_THRESHOLD && (features.phone_fuzzy_match || features.domain_match)) {
      state = 'verified';
    } else if (score < WEIGHTS.REJECTED_SCORE_THRESHOLD || (features.domain_mismatch && features.country_conflict)) {
      state = 'rejected';
    } else {
      state = 'unverified';
    }

    return {
      schema_version: 1,
      state,
      score: Math.max(0, Math.min(100, score)),
      features,
      reasons,
      variant: profile.variant || 'www'
    };
  }

  /**
   * Universal Cross-Check Engine: Scrapes candidate URL with Scrapling and runs deterministic scorer
   * @param {Object} lead - Lead record (business_name, phone, phone_e164, country, city, website)
   * @param {string} candidateUrl - Target social profile or directory URL
   * @param {string} [platform] - Platform hint (facebook, instagram, linkedin, twitter, tiktok, youtube, directory)
   * @returns {Promise<{ state: 'verified'|'unverified'|'rejected', score: number, features: Object, reasons: string[], variant: string }>}
   */
  async crossCheckCandidate(lead, candidateUrl, platform = null) {
    if (!candidateUrl || !isSafePublicUrl(candidateUrl)) {
      return {
        state: 'rejected',
        score: 0,
        features: {},
        reasons: ['Invalid or unsafe candidate URL'],
        variant: 'www'
      };
    }

    try {
      let profileData = null;
      if (stealthService.isAvailable()) {
        profileData = await stealthService.scrapeSocial(candidateUrl, { timeout: 8000 });
      }

      const flatProfile = {
        platform: profileData?.platform || platform || 'unknown',
        url: profileData?.url || candidateUrl,
        status: profileData?.status || 'unknown',
        page_name: profileData?.page_name || profileData?.fields?.page_name || null,
        bio: profileData?.bio || profileData?.fields?.bio || '',
        website: profileData?.website || profileData?.fields?.website || null,
        addresses: profileData?.addresses || profileData?.fields?.addresses || [],
        phones: profileData?.phones || profileData?.fields?.phones || [],
        emails: profileData?.emails || profileData?.fields?.emails || [],
        variant: profileData?.variant || 'www',
        source: 'scrapling'
      };

      return this.scoreSocialCandidate(lead, flatProfile);
    } catch (err) {
      return {
        state: 'unverified',
        score: 0,
        features: {},
        reasons: [`Cross-check scrape error: ${err.message}`],
        variant: 'www'
      };
    }
  }
}

SocialResolverService.WEIGHTS = WEIGHTS;
const instance = new SocialResolverService();
instance.WEIGHTS = WEIGHTS;

module.exports = instance;
