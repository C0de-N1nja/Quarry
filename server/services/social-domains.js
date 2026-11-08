/**
 * Shared Social & Directory Aggregator Domains
 * Unified across Lead.js, maps-scraper-service.js, and no-website-verifier.js
 */

const SOCIAL_AND_AGGREGATOR_DOMAINS = [
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
  'youtube.com',
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
  'yahoo.com',
  'bing.com',
  'google.com',
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

function isSocialOrAggregator(url) {
  if (!url) return true;
  const lower = String(url).toLowerCase();
  return SOCIAL_AND_AGGREGATOR_DOMAINS.some(domain => lower.includes(domain));
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
  SOCIAL_AND_AGGREGATOR_DOMAINS,
  isSocialOrAggregator,
  extractSocialUrls
};
