/**
 * Shared Social, Directory Aggregator, and Maps Domain Classifier
 * Country-aware scoping across US, GB, AU, CA, AE, and Global.
 * Unified across Lead.js, maps-scraper-service.js, no-website-verifier.js,
 * and website-audit-service.js
 */

const SOCIAL_DOMAINS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'linktr.ee',
  'bio.link',
  'beacons.ai',
  'campsite.bio',
  'tiktok.com',
  'youtube.com'
];

const GLOBAL_DIRECTORY_DOMAINS = [
  'yelp.com',
  'yellowpages.com',
  'tripadvisor.com',
  'trustpilot.com',
  'bark.com',
  'birdeye.com',
  'nextdoor.com',
  'allbiz.com',
  'hub.biz',
  'cybo.com',
  'directorylib.com',
  'foursquare.com',
  'alignable.com',
  'threebestrated.com',
  'find-us-here.com',
  'hotfrog.com',
  'brownbook.net',
  'localdatabase.com',
  'mapquest.com',
  'expertise.com',
  'houzz.com',
  'yahoo.com',
  'bing.com',
  'duckduckgo.com',
  'uservoice.com',
  'zendesk.com',
  'freshdesk.com',
  'atlassian.net',
  'intercom.com',
  'helpjuice.com',
  'github.com',
  'gitlab.com',
  'showmelocal.com',
  'tat.net.au',
  'whereis.com',
  'cylex-australia.com',
  'autocareplus.com.au'
];

const COUNTRY_DIRECTORY_DOMAINS = {
  US: [
    'angi.com',
    'homeadvisor.com',
    'thumbtack.com',
    'bbb.org',
    'hvacchamps.com',
    'plumberchamps.com',
    'roofingchamps.com',
    'electricianchamps.com',
    'contractorchamps.com',
    'manta.com',
    'porch.com',
    'buildzoom.com',
    'networx.com',
    'superpages.com',
    'dexknows.com',
    'citysearch.com',
    'kudzu.com',
    'proreferral.com',
    'contractorhub.com',
    'contractorconnection.com',
    'contractors.com',
    'servicemagic.com',
    'servicepros.com',
    'bestprosintown.com',
    'topratedlocal.com',
    'uscity.net',
    'chamberofcommerce.com',
    'cylex-usa.com',
    'cylex.us.com',
    'b2byellowpages.com',
    'local.com',
    'merchantcircle.com',
    'ezlocal.com'
  ],
  GB: [
    'yell.com',
    'checkatrade.com',
    'trustatrader.com',
    'mybuilder.com',
    'thomsonlocal.com',
    'ratedpeople.com',
    'scoot.co.uk',
    'touchlocal.com',
    'approvedtrader.co.uk',
    'trustmark.org.uk',
    'freeindex.co.uk',
    'cylex-uk.co.uk',
    '192.com',
    'tradechecker.co.uk',
    'findatrade.com',
    'localheroes.com',
    'gumtree.com',
    'uksmallbusinessdirectory.co.uk',
    'thetradesmen.co.uk',
    'tradesmangun.co.uk'
  ],
  AU: [
    'hipages.com.au',
    'yellowpages.com.au',
    'truelocal.com.au',
    'oneflare.com.au',
    'serviceseeking.com.au',
    'tradiefinder.com.au',
    'womo.com.au',
    'startlocal.com.au',
    'dlook.com.au',
    'localsearch.com.au',
    'aussieweb.com.au',
    'hotfrog.com.au',
    'purelocal.com.au',
    'tradiesdirectory.com.au'
  ],
  CA: [
    'homestars.com',
    'yellowpages.ca',
    '411.ca',
    'trustedpros.ca',
    'canpages.ca',
    'profilecanada.com',
    'n49.com',
    'hotfrog.ca',
    'cylex-canada.com',
    'tradeconnection.ca',
    'canadianbusinessdirectory.ca'
  ],
  AE: [
    'yellowpages.ae',
    'dubaibizdirectory.com',
    'localsearch.ae',
    'uaecontact.com',
    'reachuae.com',
    'connect.ae',
    'atninfo.com',
    'etisalatyellowpages.ae',
    'angloinfo.com',
    'dubaisouthdirectory.com'
  ]
};

// Flattened list for backwards compatibility
const DIRECTORY_DOMAINS = Array.from(new Set([
  ...GLOBAL_DIRECTORY_DOMAINS,
  ...Object.values(COUNTRY_DIRECTORY_DOMAINS).flat()
]));

const MAPS_DOMAINS = [
  'google.com/maps',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl/maps',
  'google.com/business',
  'business.site'
];

const SOCIAL_AND_AGGREGATOR_DOMAINS = [
  ...SOCIAL_DOMAINS,
  ...DIRECTORY_DOMAINS,
  'google.com'
];

/**
 * Get active directory domains for a given country code (e.g. 'GB', 'AU', 'US').
 * If country is unknown or null, returns all directory domains.
 */
function getDirectoryDomainsForCountry(countryCode) {
  if (!countryCode) return DIRECTORY_DOMAINS;
  const upper = String(countryCode).trim().toUpperCase();
  const regional = COUNTRY_DIRECTORY_DOMAINS[upper];
  if (!regional) return DIRECTORY_DOMAINS;
  return Array.from(new Set([...GLOBAL_DIRECTORY_DOMAINS, ...regional]));
}

/**
 * Classify any website URL into 4 distinct types:
 * 1. 'official_website' - Dedicated, private company domain (e.g. lonestarcooling.com)
 * 2. 'directory_listing' - Third-party directory or contractor aggregator
 * 3. 'social_profile' - Social network page (e.g. facebook.com, instagram.com)
 * 4. 'maps_listing' - Google Maps link or Google business.site
 *
 * @param {string} url - The URL to classify
 * @param {string} [countryCode] - Optional ISO country code (e.g. 'US', 'GB', 'AU') to scope directory matching
 */
function classifyWebsiteUrl(url, countryCode = null) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      type: 'no_website',
      isOfficialWebsite: false,
      isNoWebsite: true,
      category: 'No Website',
      platformName: null
    };
  }

  const clean = url.trim().toLowerCase();

  // 1. Google Maps / Business Listings
  if (MAPS_DOMAINS.some(d => clean.includes(d))) {
    return {
      type: 'maps_listing',
      isOfficialWebsite: false,
      isNoWebsite: true,
      category: 'Google Maps Listing',
      platformName: 'Google Maps'
    };
  }

  // 2. Social Media Profiles
  for (const s of SOCIAL_DOMAINS) {
    if (clean.includes(s)) {
      const name = s === 'fb.com' ? 'Facebook' : s.split('.')[0].charAt(0).toUpperCase() + s.split('.')[0].slice(1);
      return {
        type: 'social_profile',
        isOfficialWebsite: false,
        isNoWebsite: true,
        category: 'Social Profile',
        platformName: name
      };
    }
  }

  // 3. Third-Party Directories & Contractor Aggregators (Scoped to country if provided)
  const activeDirectories = getDirectoryDomainsForCountry(countryCode);
  for (const d of activeDirectories) {
    if (clean.includes(d)) {
      let name = d.replace(/\.com|\.org|\.net|\.co\.uk|\.com\.au|\.ca|\.ae/g, '');
      if (d.includes('champs.com')) {
        name = d.replace('.com', '').toUpperCase();
      } else {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      return {
        type: 'directory_listing',
        isOfficialWebsite: false,
        isNoWebsite: true,
        category: 'Directory Listing',
        platformName: name
      };
    }
  }

  // Pattern heuristics: contractor directory paths (e.g. /contractors/austin-tx, /trades/london)
  if (/\/(?:contractors|contractor|find-pros|companylist|pro|pros|members|biz|trades|tradies)\//i.test(clean) &&
      /(?:champs|directory|finder|guide|listings|network|portal|ranking|yellowpages|yell|trader)/i.test(clean)) {
    return {
      type: 'directory_listing',
      isOfficialWebsite: false,
      isNoWebsite: true,
      category: 'Directory Listing',
      platformName: 'Contractor Directory'
    };
  }

  // 4. Official Business Website
  return {
    type: 'official_website',
    isOfficialWebsite: true,
    isNoWebsite: false,
    category: 'Official Website',
    platformName: null
  };
}

function isSocialOrAggregator(url, countryCode = null) {
  if (!url) return true;
  const classification = classifyWebsiteUrl(url, countryCode);
  return classification.isNoWebsite;
}

function extractSocialUrls(url) {
  if (!url) return { facebook_url: null, instagram_url: null };
  const lower = String(url).toLowerCase();
  let facebook_url = null;
  let instagram_url = null;
  if (lower.includes('facebook.com') || lower.includes('fb.com')) {
    facebook_url = url.trim();
  }
  if (lower.includes('instagram.com')) {
    instagram_url = url.trim();
  }
  return { facebook_url, instagram_url };
}

function extractSocialProfilesFromCheerio($, originUrl = '') {
  const socials = {
    facebook: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    youtube: null,
    tiktok: null,
    linktree: null
  };

  const ignoredFb = /sharer|share\.php|dialog|plugins|tr\?|help|policies|terms|about/i;
  const ignoredIg = /\/(?:p|reel|reels|stories|explore|developer|about|legal|accounts)\//i;
  const ignoredLi = /shareArticle|sharing/i;
  const ignoredTw = /intent|share/i;
  const ignoredYt = /watch\?|embed/i;

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    href = href.trim();
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      if (href.startsWith('//')) {
        href = 'https:' + href;
      } else {
        return;
      }
    }

    try {
      const u = new URL(href);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = u.pathname;

      if ((host === 'facebook.com' || host === 'fb.com') && !ignoredFb.test(href)) {
        if (pathname.length > 2 && !socials.facebook) {
          socials.facebook = `https://${host}${pathname}`;
        }
      } else if (host === 'instagram.com' && !ignoredIg.test(href)) {
        if (pathname.length > 2 && !socials.instagram) {
          socials.instagram = `https://${host}${pathname.replace(/\/+$/, '')}`;
        }
      } else if (host === 'linkedin.com' && !ignoredLi.test(href)) {
        if ((pathname.includes('/company/') || pathname.includes('/in/')) && !socials.linkedin) {
          socials.linkedin = `https://${host}${pathname.replace(/\/+$/, '')}`;
        }
      } else if ((host === 'twitter.com' || host === 'x.com') && !ignoredTw.test(href)) {
        if (pathname.length > 2 && !socials.twitter) {
          socials.twitter = `https://${host}${pathname.replace(/\/+$/, '')}`;
        }
      } else if ((host === 'youtube.com' || host === 'youtu.be') && !ignoredYt.test(href)) {
        if (pathname.length > 2 && !socials.youtube) {
          socials.youtube = `https://${host}${pathname.replace(/\/+$/, '')}`;
        }
      } else if (host === 'tiktok.com' && pathname.includes('@') && !socials.tiktok) {
        socials.tiktok = `https://${host}${pathname.replace(/\/+$/, '')}`;
      } else if ((host === 'linktr.ee' || host === 'bio.link' || host === 'beacons.ai') && !socials.linktree) {
        socials.linktree = `https://${host}${pathname.replace(/\/+$/, '')}`;
      }
    } catch {}
  });

  return socials;
}

function extractSocialProfilesFromHtml(html, originUrl = '') {
  if (!html || typeof html !== 'string') return {};
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  return extractSocialProfilesFromCheerio($, originUrl);
}

module.exports = {
  SOCIAL_DOMAINS,
  GLOBAL_DIRECTORY_DOMAINS,
  COUNTRY_DIRECTORY_DOMAINS,
  DIRECTORY_DOMAINS,
  MAPS_DOMAINS,
  SOCIAL_AND_AGGREGATOR_DOMAINS,
  getDirectoryDomainsForCountry,
  classifyWebsiteUrl,
  isSocialOrAggregator,
  extractSocialUrls,
  extractSocialProfilesFromCheerio,
  extractSocialProfilesFromHtml
};
