const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const osintService = require('./osint-service');
const stealthService = require('./stealth-service');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');

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

    // Sort matches by confidence score descending
    report.matches.sort((a, b) => b.confidence_score - a.confidence_score);
    report.ambiguous.sort((a, b) => b.confidence_score - a.confidence_score);

    return report;
  }
}

module.exports = new SocialResolverService();
