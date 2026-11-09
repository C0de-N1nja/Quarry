const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'linktr.ee',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'yelp.com',
  'yellowpages.com',
  'bbb.org'
];

export function isSocialOrAggregator(url = ''): boolean {
  if (!url) return false;
  const lower = String(url).toLowerCase();
  return SOCIAL_DOMAINS.some(domain => lower.includes(domain));
}
