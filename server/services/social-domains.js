/**
 * Shared Social, Directory Aggregator, and Maps Domain Classifier
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

const DIRECTORY_DOMAINS = [
  'hvacchamps.com',
  'plumberchamps.com',
  'roofingchamps.com',
  'electricianchamps.com',
  'contractorchamps.com',
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'bbb.org',
  'angi.com',
  'homeadvisor.com',
  'thumbtack.com',
  'manta.com',
  'tripadvisor.com',
  'expertise.com',
  'houzz.com',
  'porch.com',
  'buildzoom.com',
  'networx.com',
  'chamberofcommerce.com',
  'superpages.com',
  'citysearch.com',
  'dexknows.com',
  'local.com',
  'merchantcircle.com',
  'hotfrog.com',
  'ezlocal.com',
  'brownbook.net',
  'cylex.us.com',
  'cylex-usa.com',
  'uscity.net',
  'localdatabase.com',
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
  'b2byellowpages.com',
  'kudzu.com',
  'topratedlocal.com',
  'threebestrated.com',
  'bestprosintown.com',
  'find-us-here.com',
  'contractorhub.com',
  'contractorconnection.com',
  'contractors.com',
  'servicemagic.com',
  'servicepros.com',
  'proreferral.com',
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
  'gitlab.com'
];

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
 * Classify any website URL into 4 distinct types:
 * 1. 'official_website' - Dedicated, private company domain (e.g. lonestarcooling.com)
 * 2. 'directory_listing' - Third-party directory or contractor aggregator (e.g. hvacchamps.com/contractors/austin-tx, yelp.com)
 * 3. 'social_profile' - Social network page (e.g. facebook.com, instagram.com)
 * 4. 'maps_listing' - Google Maps link or Google business.site
 */
function classifyWebsiteUrl(url) {
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

  // 3. Third-Party Directories & Contractor Aggregators
  for (const d of DIRECTORY_DOMAINS) {
    if (clean.includes(d)) {
      let name = d.replace(/\.com|\.org|\.net/g, '');
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

  // Pattern heuristics: contractor directory paths (e.g. /contractors/austin-tx)
  if (/\/(?:contractors|contractor|find-pros|companylist|pro|pros|members|biz)\//i.test(clean) &&
      /(?:champs|directory|finder|guide|listings|network|portal|ranking|yellowpages)/i.test(clean)) {
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

function isSocialOrAggregator(url) {
  if (!url) return true;
  const classification = classifyWebsiteUrl(url);
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

module.exports = {
  SOCIAL_DOMAINS,
  DIRECTORY_DOMAINS,
  MAPS_DOMAINS,
  SOCIAL_AND_AGGREGATOR_DOMAINS,
  classifyWebsiteUrl,
  isSocialOrAggregator,
  extractSocialUrls
};
