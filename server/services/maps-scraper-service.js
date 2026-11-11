const axios = require('axios');
const cheerio = require('cheerio');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const db = require('../db/database');
const Lead = require('../models/Lead');
const noWebsiteVerifier = require('./no-website-verifier');
const { isSocialOrAggregator, extractSocialUrls } = require('./social-domains');
const timezoneService = require('./timezone-service');
const notificationService = require('./notification-service');
const telemetryService = require('./telemetry-service');
const phoneService = require('./phone-service');

const DEFAULT_BIN_PATH = '/home/beast/.local/bin/google_maps_scraper';
const BINARY_PATH = process.env.MAPS_SCRAPER_BIN ||
  (fs.existsSync(DEFAULT_BIN_PATH)
    ? DEFAULT_BIN_PATH
    : (fs.existsSync('/home/beast/go/bin/google-maps-scraper')
      ? '/home/beast/go/bin/google-maps-scraper'
      : 'google_maps_scraper'));

/**
 * Cleanly terminates child processes and their descendant browser subprocesses
 * by signaling the process group.
 */
function killProcessTree(child, signal = 'SIGTERM') {
  if (!child || !child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {}
  }
}

function killProcessTreeGracefully(child, delayMs = 1500) {
  killProcessTree(child, 'SIGTERM');
  setTimeout(() => {
    killProcessTree(child, 'SIGKILL');
  }, delayMs);
}

function formatCategoryName(kw) {
  if (!kw) return 'General';
  const cleaned = kw.trim().replace(/\s+/g, ' ');
  return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || cleaned;
}

/**
 * Strips redundant suffix words (contractors, services, companies) so templates
 * don't produce awkward duplicate strings like "Roofing Contractors contractors".
 */
function cleanBaseKeyword(keyword) {
  if (!keyword) return '';
  const kw = keyword.trim();
  const stripped = kw
    .replace(/\b(contractors|contractor|companies|company|services|service|specialists|specialist|experts|expert|pros|pro)\b/gi, '')
    .trim();
  return (stripped.length >= 3) ? stripped : kw;
}

const METRO_SUB_REGIONS = {
  'new york': ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island', 'Long Island', 'Astoria', 'Flushing', 'Harlem', 'Williamsburg', 'Jamaica', 'Yonkers', 'Hempstead', 'White Plains', 'New Rochelle', 'Mount Vernon', 'Midtown', 'Upper East Side', 'Upper West Side', 'Bushwick', 'Bay Ridge', 'Crown Heights', 'Forest Hills', 'Bayside', 'Riverdale'],
  'fort worth': ['Arlington', 'Keller', 'North Richland Hills', 'Burleson', 'Haltom City', 'Grapevine', 'Saginaw', 'Mansfield', 'Bedford', 'Euless', 'Hurst', 'Alliance', 'Weatherford', 'Benbrook', 'White Settlement', 'Crowley', 'Southlake', 'Colleyville', 'Watauga'],
  'dallas': ['Plano', 'Frisco', 'Irving', 'Garland', 'Grand Prairie', 'McKinney', 'Carrollton', 'Richardson', 'Denton', 'Lewisville', 'Allen', 'Rowlett', 'Mesquite', 'Coppell', 'Addison', 'Desoto', 'Cedar Hill', 'Duncanville'],
  'austin': ['Round Rock', 'Cedar Park', 'Pflugerville', 'Georgetown', 'Buda', 'Kyle', 'Lakeway', 'Leander', 'San Marcos', 'West Lake Hills', 'Bee Cave', 'Hutto', 'Manor', 'Dripping Springs'],
  'houston': ['The Woodlands', 'Sugar Land', 'Katy', 'Pearland', 'Pasadena', 'Conroe', 'Spring', 'Cypress', 'Kingwood', 'League City', 'Baytown', 'Missouri City', 'Friendswood', 'Richmond', 'Tomball', 'Humble', 'Rosenberg'],
  'miami': ['Miami Beach', 'Hialeah', 'Coral Gables', 'Doral', 'Kendall', 'Homestead', 'Aventura', 'North Miami', 'Fort Lauderdale', 'Hollywood', 'Pembroke Pines', 'Miramar', 'Davie', 'Plantation', 'Sunrise', 'Boca Raton'],
  'los angeles': ['Long Beach', 'Pasadena', 'Glendale', 'Santa Monica', 'Burbank', 'Torrance', 'Inglewood', 'Compton', 'Van Nuys', 'Downey', 'West Hollywood', 'Beverly Hills', 'Norwalk', 'Pomona', 'El Monte', 'North Hollywood'],
  'chicago': ['Naperville', 'Aurora', 'Joliet', 'Evanston', 'Schaumburg', 'Cicero', 'Skokie', 'Elgin', 'Arlington Heights', 'Bolingbrook', 'Oak Lawn', 'Des Plaines', 'Berwyn', 'Orland Park', 'Tinley Park', 'Oak Park'],
  'atlanta': ['Alpharetta', 'Marietta', 'Roswell', 'Sandy Springs', 'Decatur', 'Smyrna', 'Dunwoody', 'Johns Creek', 'Duluth', 'Kennesaw', 'Lawrenceville', 'Norcross', 'Cumming', 'Buford', 'Tucker'],
  'phoenix': ['Scottsdale', 'Mesa', 'Chandler', 'Gilbert', 'Glendale', 'Tempe', 'Peoria', 'Surprise', 'Avondale', 'Buckeye', 'Goodyear', 'Queen Creek'],
  'london': ['Central London', 'North London', 'South London', 'East London', 'West London', 'Camden', 'Greenwich', 'Kensington', 'Islington', 'Hackney', 'Croydon', 'Richmond', 'Wimbledon', 'Ealing'],
  'sydney': ['Central Sydney', 'North Sydney', 'Parramatta', 'Bondi', 'Manly', 'Chatswood', 'Surry Hills', 'Newtown', 'Cronulla', 'Ryde', 'Blacktown', 'Penrith'],
  'melbourne': ['Melbourne CBD', 'South Yarra', 'St Kilda', 'Richmond', 'Brunswick', 'Fitzroy', 'Carlton', 'Footscray', 'Box Hill', 'Dandenong'],
  'toronto': ['Downtown Toronto', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York', 'Mississauga', 'Brampton', 'Vaughan', 'Markham'],
  'dubai': ['Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Deira', 'Bur Dubai', 'Jumeirah', 'Al Barsha', 'JLT', 'Palm Jumeirah', 'Mirdif', 'Al Quoz']
};

const CANONICAL_COUNTRIES = {
  'us': 'US', 'usa': 'US', 'united states': 'US', 'united states of america': 'US',
  'au': 'AU', 'aus': 'AU', 'australia': 'AU',
  'ca': 'CA', 'can': 'CA', 'canada': 'CA',
  'uk': 'UK', 'gb': 'UK', 'united kingdom': 'UK', 'england': 'UK', 'scotland': 'UK', 'wales': 'UK',
  'nz': 'NZ', 'new zealand': 'NZ',
  'de': 'DE', 'germany': 'DE', 'deutschland': 'DE',
  'fr': 'FR', 'france': 'FR',
  'ae': 'AE', 'uae': 'AE', 'dubai': 'AE', 'united arab emirates': 'AE'
};

const US_STATES = {
  'al': 'AL', 'ak': 'AK', 'az': 'AZ', 'ar': 'AR', 'ca': 'CA', 'co': 'CO', 'ct': 'CT', 'de': 'DE', 'fl': 'FL', 'ga': 'GA',
  'hi': 'HI', 'id': 'ID', 'il': 'IL', 'in': 'IN', 'ia': 'IA', 'ks': 'KS', 'ky': 'KY', 'la': 'LA', 'me': 'ME', 'md': 'MD',
  'ma': 'MA', 'mi': 'MI', 'mn': 'MN', 'ms': 'MS', 'mo': 'MO', 'mt': 'MT', 'ne': 'NE', 'nv': 'NV', 'nh': 'NH', 'nj': 'NJ',
  'nm': 'NM', 'ny': 'NY', 'nc': 'NC', 'nd': 'ND', 'oh': 'OH', 'ok': 'OK', 'or': 'OR', 'pa': 'PA', 'ri': 'RI', 'sc': 'SC',
  'sd': 'SD', 'tn': 'TN', 'tx': 'TX', 'ut': 'UT', 'vt': 'VT', 'va': 'VA', 'wa': 'WA', 'wv': 'WV', 'wi': 'WI', 'wy': 'WY',
  'texas': 'TX', 'california': 'CA', 'florida': 'FL', 'new york': 'NY', 'illinois': 'IL', 'washington': 'WA', 'colorado': 'CO'
};

const AU_STATES = {
  'qld': 'QLD', 'nsw': 'NSW', 'vic': 'VIC', 'wa': 'WA', 'sa': 'SA', 'tas': 'TAS', 'act': 'ACT', 'nt': 'NT',
  'queensland': 'QLD', 'new south wales': 'NSW', 'victoria': 'VIC', 'western australia': 'WA', 'south australia': 'SA', 'tasmania': 'TAS'
};

const CA_PROVINCES = {
  'on': 'ON', 'qc': 'QC', 'bc': 'BC', 'ab': 'AB', 'mb': 'MB', 'sk': 'SK', 'ns': 'NS', 'nb': 'NB', 'nl': 'NL', 'pe': 'PE',
  'ontario': 'ON', 'quebec': 'QC', 'british columbia': 'BC', 'alberta': 'AB'
};

function parseSearchLocation(searchLocation, fallbackCountry = 'US') {
  if (!searchLocation) return { city: '', state: '', country: fallbackCountry };
  const parts = searchLocation.split(',').map(s => s.trim().toLowerCase());
  const city = parts[0] || '';
  let state = '';
  let country = fallbackCountry;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (CANONICAL_COUNTRIES[p]) {
      country = CANONICAL_COUNTRIES[p];
    } else if (US_STATES[p]) {
      state = US_STATES[p];
      if (!country || country === 'US') country = 'US';
    } else if (AU_STATES[p]) {
      state = AU_STATES[p];
      country = 'AU';
    } else if (CA_PROVINCES[p]) {
      state = CA_PROVINCES[p];
      country = 'CA';
    }
  }

  return { city, state, country, raw: searchLocation };
}

function normalizeBusinessName(name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isLocationContradiction(place, searchLoc) {
  if (!place || !searchLoc) return false;

  const addr = place.complete_address || {};
  const rawAddr = (place.address || '').toLowerCase();

  // Extract place country
  let placeCountry = null;
  const rawCountry = (addr.country_code || addr.country || place.country_code || place.country || '').trim().toLowerCase();
  if (rawCountry && CANONICAL_COUNTRIES[rawCountry]) {
    placeCountry = CANONICAL_COUNTRIES[rawCountry];
  }
  if (!placeCountry) {
    if (/\b(usa|united states)\b/i.test(rawAddr) || /,\s*[a-z]{2}\s+\d{5}/i.test(rawAddr)) placeCountry = 'US';
    else if (/\b(australia)\b/i.test(rawAddr) || /\b(qld|nsw|vic|wa|sa|tas|act)\s+\d{4}\b/i.test(rawAddr)) placeCountry = 'AU';
    else if (/\b(canada)\b/i.test(rawAddr) || /[a-z]\d[a-z]\s*\d[a-z]\d/i.test(rawAddr)) placeCountry = 'CA';
    else if (/\b(uk|united kingdom|england|scotland|wales)\b/i.test(rawAddr)) placeCountry = 'UK';
  }

  // 1. Direct Country Contradiction (e.g. search was Brisbane, AU and place is Brisbane, CA, US)
  if (searchLoc.country && placeCountry && searchLoc.country !== placeCountry) {
    return true;
  }

  // Extract place state
  const rawState = (addr.state || '').trim().toLowerCase();
  let placeState = null;
  if (rawState) {
    if (US_STATES[rawState]) placeState = US_STATES[rawState];
    else if (AU_STATES[rawState]) placeState = AU_STATES[rawState];
    else if (CA_PROVINCES[rawState]) placeState = CA_PROVINCES[rawState];
  }

  // 2. Direct State Contradiction
  if (searchLoc.state && placeState && searchLoc.state !== placeState) {
    return true;
  }

  // 3. Direct City Contradiction (when place city is provided and search city was specific)
  const placeCity = (addr.city || '').trim().toLowerCase();
  const searchCity = (searchLoc.city || '').trim().toLowerCase();
  if (searchCity && placeCity && searchCity !== placeCity) {
    const allowedSubRegions = (METRO_SUB_REGIONS[searchCity] || []).map(r => r.toLowerCase());
    const isSubRegion = allowedSubRegions.some(sr => placeCity.includes(sr) || sr.includes(placeCity));
    const addressMentionsSearchCity = rawAddr.includes(searchCity);

    if (!isSubRegion && !addressMentionsSearchCity) {
      if (placeState && searchLoc.state && placeState !== searchLoc.state) {
        return true;
      }
      if (['sydney', 'melbourne', 'perth', 'adelaide', 'dallas', 'houston', 'chicago', 'miami', 'los angeles', 'new york'].includes(placeCity)) {
        return true;
      }
    }
  }

  return false;
}

const EXCLUDED_CATEGORY_REGEX = /airline|supplier|wholesale|manufactur|distribut|store|school|college|association/i;

function extractLatLng(place) {
  let lat = null;
  let lng = null;

  if (place.latitude !== undefined && place.latitude !== null && place.latitude !== '') {
    const val = parseFloat(place.latitude);
    if (!isNaN(val)) lat = val;
  }
  if (place.longitude !== undefined && place.longitude !== null && place.longitude !== '') {
    const val = parseFloat(place.longitude);
    if (!isNaN(val)) lng = val;
  }

  if ((lat === null || lng === null) && (place.link || place.maps_link)) {
    const linkStr = place.link || place.maps_link || '';
    const match = linkStr.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
    if (match) {
      const parsedLat = parseFloat(match[1]);
      const parsedLng = parseFloat(match[2]);
      if (!isNaN(parsedLat) && lat === null) lat = parsedLat;
      if (!isNaN(parsedLng) && lng === null) lng = parsedLng;
    }
  }

  return { lat, lng };
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractCity(place) {
  if (place && place.complete_address && place.complete_address.city && typeof place.complete_address.city === 'string' && place.complete_address.city.trim().length > 0) {
    return place.complete_address.city.trim();
  }

  const addr = place?.address;
  if (addr && typeof addr === 'string') {
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const statePart = parts[parts.length - 2];
      if (/\b[A-Z]{2}\b/i.test(statePart) || /\d{5}/.test(statePart)) {
        const cityCandidate = parts[parts.length - 3];
        if (cityCandidate && !/^\d+/.test(cityCandidate)) {
          return cityCandidate;
        }
      }
      if (parts[1] && !/^\d+/.test(parts[1])) {
        return parts[1];
      }
    } else if (parts.length === 2) {
      if (/\b[A-Z]{2}\b/i.test(parts[1]) || /\d{5}/.test(parts[1])) {
        if (!/^\d+/.test(parts[0])) return parts[0];
      } else {
        return parts[1];
      }
    }
  }

  return null;
}

/**
 * Returns niche-appropriate service modifiers rather than forcing roofing terms on all businesses.
 */
function getNicheSpecificModifiers(rawKeyword) {
  const kw = (rawKeyword || '').toLowerCase();
  if (kw.includes('roof')) {
    return ['Replacement', 'Repair', 'Inspections', 'Shingle', 'Flat', 'Metal'];
  }
  if (kw.includes('dent') || kw.includes('ortho')) {
    return ['Cosmetic', 'Family', 'Emergency', 'Implants', 'Care', 'Clinic'];
  }
  if (kw.includes('plumb')) {
    return ['Emergency', 'Drain Cleaning', 'Repiping', 'Repair', 'Sewer Line', 'Water Heater'];
  }
  if (kw.includes('hvac') || kw.includes('air cond') || kw.includes('heat')) {
    return ['AC Repair', 'Heating', 'Air Conditioning', 'Maintenance', 'Installation', 'Tune Up'];
  }
  if (kw.includes('pool')) {
    return ['Custom', 'Remodeling', 'Maintenance', 'Cleaning', 'Installation', 'Service'];
  }
  if (kw.includes('tree')) {
    return ['Removal', 'Trimming', 'Emergency', 'Pruning', 'Arborist', 'Stump Grinding'];
  }
  if (kw.includes('clean') || kw.includes('maid')) {
    return ['Deep Cleaning', 'Commercial', 'Residential', 'Move Out', 'Services'];
  }
  if (kw.includes('landscap') || kw.includes('lawn')) {
    return ['Maintenance', 'Design', 'Hardscaping', 'Lawn Care', 'Commercial'];
  }
  if (kw.includes('electric')) {
    return ['Emergency', 'Repair', 'Wiring', 'Panel Upgrade', 'Commercial', 'Residential'];
  }
  if (kw.includes('paint')) {
    return ['Interior', 'Exterior', 'Commercial', 'Residential', 'Cabinet'];
  }
  if (kw.includes('spa') || kw.includes('medspa') || kw.includes('skin') || kw.includes('botox')) {
    return ['Aesthetics', 'Laser', 'Facials', 'Skin Care', 'Wellness', 'Treatments'];
  }
  // Universal service business modifiers
  return ['Services', 'Repair', 'Installation', 'Care', 'Solutions', 'Pros'];
}

/**
 * Generates diversified search queries across niches, specialties, and sub-regions.
 * Interleaves geographic sub-regions immediately so even smaller limits (20-100)
 * achieve wide geographic dispersion across metro boroughs and neighborhoods.
 */
let _metroCache = null;
function loadMetroAreas() {
  if (_metroCache) return _metroCache;
  try {
    _metroCache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'metro-areas.json'), 'utf8'));
  } catch (e) { _metroCache = {}; }
  return _metroCache;
}

function generateSearchQueries(keyword, city, limit = 100, countryCode = 'US') {
  const rawKw = (keyword || '').trim();
  let c = (city || '').trim();
  const baseKw = cleanBaseKeyword(rawKw);

  // International location anchoring: if country is provided and not already in city string
  const normCountry = (countryCode === 'UK' ? 'GB' : (countryCode || 'US')).toUpperCase();
  const countryNames = { GB: 'UK', AU: 'Australia', CA: 'Canada', AE: 'UAE' };
  const countrySuffix = countryNames[normCountry];
  if (countrySuffix && !c.toLowerCase().includes(countrySuffix.toLowerCase()) && !c.toLowerCase().includes(normCountry.toLowerCase())) {
    c = `${c}, ${countrySuffix}`;
  }

  const cityLower = c.toLowerCase();
  const metroKey = c.split(',')[0].trim().toLowerCase();
  const metroAreas = loadMetroAreas()[metroKey];
  if (Array.isArray(metroAreas) && metroAreas.length > 0) {
    const metroState = c.includes(',') ? c.split(',')[1].trim() : '';
    const withState = (a) => metroState ? `${a}, ${metroState}` : a;
    const mq = [`${rawKw} in ${c}`];
    for (const a of metroAreas) mq.push(`${rawKw} in ${withState(a)}`);
    for (const a of metroAreas) mq.push(`${baseKw} services in ${withState(a)}`);
    const want = Math.max(6, Math.ceil(limit / 10));
    return Array.from(new Set(mq)).slice(0, want);
  }

  // Identify sub-regions if known major metro
  let subRegions = [];
  for (const [key, regions] of Object.entries(METRO_SUB_REGIONS)) {
    if (cityLower.includes(key)) {
      subRegions = regions;
      break;
    }
  }

  // Fallback geographic sectors for any city
  const statePart = c.includes(',') ? c.split(',')[1].trim() : '';
  const geoSectors = [
    `North ${c}`, `South ${c}`, `East ${c}`, `West ${c}`,
    `Northwest ${c}`, `Southwest ${c}`, `Northeast ${c}`, `Southeast ${c}`,
    `Downtown ${c}`, `Central ${c}`, `Uptown ${c}`, `Midtown ${c}`
  ];

  const targetAreas = subRegions.length > 0
    ? subRegions.map(r => statePart ? `${r}, ${statePart}` : `${r}, ${c}`)
    : geoSectors;

  const nicheModifiers = getNicheSpecificModifiers(rawKw);
  const isTradeContractor = /roof|plumb|hvac|electric|paint|construct|contract|remodel|flooring|concrete|masonry|landscap|tree|insulat/i.test(rawKw);

  const pool = [];

  // 1. Primary core city anchors
  pool.push(`${rawKw} in ${c}`);
  if (baseKw !== rawKw && baseKw.length >= 3 && !/^(tree|lawn|pool|maid|pest|glass|lock|roof|water)$/i.test(baseKw)) {
    pool.push(`${baseKw} in ${c}`);
  }
  if (isTradeContractor) {
    pool.push(`${baseKw} Contractors in ${c}`);
  } else {
    pool.push(`Best ${baseKw} in ${c}`);
  }
  pool.push(`${baseKw} Services in ${c}`);

  // 2. Interleave Sub-Regions Immediately (Fix for geo-diversification)
  // Ensures sub-regions like Brooklyn, Manhattan, Queens, Plano, etc. are hit from the start
  for (const area of targetAreas) {
    pool.push(`${rawKw} in ${area}`);
    if (isTradeContractor) {
      pool.push(`${baseKw} Contractors in ${area}`);
    } else {
      pool.push(`Best ${baseKw} in ${area}`);
    }
  }

  // 3. Interleave Universal & Niche-Specific Modifiers across Sub-Regions
  const mainMod = nicheModifiers[0] || 'Services';
  const secMod = nicheModifiers[1] || 'Repair';
  for (const area of targetAreas) {
    pool.push(`${mainMod} ${baseKw} in ${area}`);
    pool.push(`${baseKw} ${secMod} in ${area}`);
  }

  // 4. Core City Specialties
  pool.push(`Commercial ${baseKw} in ${c}`);
  pool.push(`Residential ${baseKw} in ${c}`);
  pool.push(`Emergency ${baseKw} in ${c}`);
  pool.push(`Top Rated ${baseKw} in ${c}`);
  pool.push(`Best ${baseKw} in ${c}`);
  pool.push(`Local ${baseKw} in ${c}`);

  // 5. Deeper Expansion for Large Runs (limit > 100, 500, 1000+)
  if (limit > 100) {
    for (const area of targetAreas) {
      pool.push(`Commercial ${baseKw} in ${area}`);
      pool.push(`Residential ${baseKw} in ${area}`);
      pool.push(`Best ${baseKw} in ${area}`);
      pool.push(`Local ${baseKw} in ${area}`);
    }
  }

  if (limit > 500) {
    for (const area of targetAreas) {
      pool.push(`Emergency ${baseKw} in ${area}`);
      pool.push(`Top Rated ${baseKw} in ${area}`);
      for (const mod of nicheModifiers.slice(2)) {
        pool.push(`${baseKw} ${mod} in ${area}`);
      }
    }
  }

  if (limit > 1000) {
    for (const area of targetAreas) {
      pool.push(`Affordable ${baseKw} in ${area}`);
      pool.push(`Licensed ${baseKw} in ${area}`);
      pool.push(`24 Hour ${baseKw} in ${area}`);
      pool.push(`${baseKw} Companies in ${area}`);
      pool.push(`${baseKw} Specialists in ${area}`);
    }
  }

  // Eliminate any duplicate query strings while preserving interleaved order
  const deduped = Array.from(new Set(pool));

  // Determine needed queries: ~8-10 places per query after deduplication
  const neededQueries = Math.max(3, Math.min(deduped.length, Math.ceil(limit / 8)));
  return deduped.slice(0, neededQueries);
}

class MapsScraperService {
  /**
   * Multi-Scraper Lead Extractor:
   * Combines high-speed native Go Google Maps engine with clean directory fallback,
   * deduplicates by composite business identity, and merges authentic records.
   */
  async searchMapsLeads(keywordIn, cityIn, limit = 100, jobId = null, countryIn = 'US') {
    const keyword = (keywordIn || '').trim();
    const city = (cityIn || '').trim();
    if (!keyword || !city) {
      throw new Error('Both keyword (niche) and city are required');
    }

    const targetCountry = (countryIn === 'UK' ? 'GB' : (countryIn || 'US')).toUpperCase();
    const activeJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    telemetryService.initJob(activeJobId, { keyword, city, limit, country: targetCountry });

    const searchQuery = `${keyword} in ${city}`.trim();
    const allHarvestedLeads = [];
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    let skippedClosed = 0;
    let skippedWrongLocation = 0;
    let skippedCategory = 0;

    try {
      // Primary Tool: High-Speed Native Go Google Maps Scraper (Multi-goroutine browser engine)
      if (this.isBinaryAvailable()) {
        try {
          const binLeads = await this.scrapeWithNativeBinary(keyword, city, limit, activeJobId, targetCountry);
          if (Array.isArray(binLeads)) {
            allHarvestedLeads.push(...binLeads);
            if (binLeads.skippedClosed) skippedClosed += binLeads.skippedClosed;
            if (binLeads.skippedWrongLocation) skippedWrongLocation += binLeads.skippedWrongLocation;
            if (binLeads.skippedCategory) skippedCategory += binLeads.skippedCategory;
          }
        } catch (binErr) {
          console.warn(`[MapsScraperService] Native binary run warning: ${binErr.message}`);
        }
      } else {
        console.warn('[MapsScraperService] Google Maps scraper binary is not installed on the system.');
      }

      telemetryService.updateStatus(activeJobId, 'deduplicating', { percent: 99 });

      // Intra-batch Deduplication: Dedupe by composite key BEFORE reporting and inserting
      const dedupedLeads = [];
      const seenKeys = new Set();

      for (const lead of allHarvestedLeads) {
        const nameNorm = (lead.business_name || '').toLowerCase().trim();
        const phoneNorm = (lead.phone || '').replace(/\D/g, '');
        const linkNorm = (lead.maps_link || '').split('?')[0].toLowerCase();

        const key = lead.place_id ? `pid:${lead.place_id}` : phoneNorm.length >= 7
          ? `${nameNorm}|phone:${phoneNorm.slice(-10)}`
          : (linkNorm ? `${nameNorm}|link:${linkNorm}` : `${nameNorm}|city:${(lead.city || '').toLowerCase()}`);

        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        dedupedLeads.push(lead);
      }

      // Calculate runs metrics for leads of THAT run only:
      let withWebsiteCount = 0;
      let noWebsiteCount = 0;
      let qualifiedCount = 0;

      for (const lead of dedupedLeads) {
        const isNoWeb = lead.has_no_website === 1 || lead.website_status === 'no_website' || lead.website_status === 'social_only' || !lead.website;
        if (isNoWeb) {
          noWebsiteCount++;
          const r = parseFloat(lead.rating) || 0;
          const rev = parseInt(lead.reviews_count, 10) || 0;
          if (r >= 4.0 && rev >= 15) {
            qualifiedCount++;
          }
        } else {
          withWebsiteCount++;
        }
      }

      // Insert deduplicated leads into SQLite database with Smart Deduplication & Authenticity Merge
      const batchResult = Lead.insertBatch(dedupedLeads);

      // Record execution in runs table
      const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
      try {
        db.prepare(`
          INSERT INTO runs (
            keyword, location, requested_limit, found, inserted,
            skipped_closed, skipped_wrong_city, skipped_category,
            with_website_count, no_website_count, qualified_count,
            started_at, duration_sec
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          keyword,
          city,
          limit,
          dedupedLeads.length,
          batchResult.count,
          skippedClosed,
          skippedWrongLocation,
          skippedCategory,
          withWebsiteCount,
          noWebsiteCount,
          qualifiedCount,
          startedAt,
          durationSec
        );
      } catch (runLogErr) {
        console.warn(`[MapsScraperService] Failed to record run in database: ${runLogErr.message}`);
      }

      let newQualifiedCount = 0;
      try {
        newQualifiedCount = (batchResult.leads || []).filter(l => l.has_no_website === 1 && (parseFloat(l.rating) || 0) >= 4.0 && (parseInt(l.reviews_count, 10) || 0) >= 15).length;
        db.prepare('UPDATE runs SET new_qualified_count = ? WHERE id = (SELECT MAX(id) FROM runs)').run(newQualifiedCount);
      } catch (e) {}

      // Trigger Linux Desktop Notification upon scraping completion
      try {
        notificationService.sendScrapeComplete({
          engine: 'Google Maps Radar',
          keyword,
          location: city,
          found: dedupedLeads.length,
          inserted: batchResult.count,
          upgraded: batchResult.upgraded || 0
        });
      } catch (notifErr) {
        console.warn(`[MapsScraperService] Notification: ${notifErr.message}`);
      }

      telemetryService.updateStatus(activeJobId, 'completed', {
        percent: 100,
        found: dedupedLeads.length,
        inserted: batchResult.count,
        upgraded: batchResult.upgraded || 0
      });

      return {
        success: true,
        jobId: activeJobId,
        query: searchQuery,
        found: dedupedLeads.length,
        inserted: batchResult.count,
        upgraded: batchResult.upgraded || 0,
        skipped_closed: skippedClosed,
        skipped_wrong_city: skippedWrongLocation,
        skipped_category: skippedCategory,
        with_website_count: withWebsiteCount,
        no_website_count: noWebsiteCount,
        qualified_count: qualifiedCount,
        new_qualified_count: newQualifiedCount,
        leads: batchResult.leads
      };
    } catch (err) {
      telemetryService.updateStatus(activeJobId, 'error', { error: err.message });
      throw err;
    }
  }

  /**
   * Executes local gosom/google_maps_scraper binary with spawn (no shell interpolation),
   * proper timeout process termination, and memory-efficient readline streaming.
   */
  async scrapeWithNativeBinary(keyword, city, limit = 100, jobId = null, countryCode = 'US') {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tempQueryFile = path.join('/tmp', `maps_query_${tempId}.txt`);
    const tempResultsFile = path.join('/tmp', `maps_out_${tempId}.json`);
    const leads = [];
    const seenNames = new Set();
    let skippedWrongLocationCount = 0;
    let skippedClosedCount = 0;
    let skippedChainsCount = 0;
    let skippedCategoryCount = 0;

    if (jobId) {
      telemetryService.startWatching(jobId, tempResultsFile);
    }

    try {
      const queries = generateSearchQueries(keyword, city, limit, countryCode);
      fs.writeFileSync(tempQueryFile, queries.join('\n') + '\n', 'utf8');

      const depth = parseInt(process.env.MAPS_DEPTH, 10) || (limit <= 250 ? 5 : (limit <= 1000 ? 8 : 10));
      const timeoutMs = Math.max(180000, Math.min(600000, queries.length * 30000));

      const cpuCount = os.cpus().length || 4;
      const maxConcurrency = Math.max(2, Math.min(cpuCount - 2, 8));
      const workerConcurrency = Math.min(maxConcurrency, Math.max(1, queries.length));

      const args = [
        '-input', tempQueryFile,
        '-results', tempResultsFile,
        '-json',
        '-depth', String(depth),
        '-c', String(workerConcurrency),
        '-browser-pool-size', String(workerConcurrency)
      ];

      // Robust spawn execution with detached process group and SIGKILL cleanup
      await new Promise((resolve) => {
        let child;
        let killTimer = null;

        try {
          child = spawn(BINARY_PATH, args, {
            detached: true,
            stdio: ['ignore', 'ignore', 'pipe']
          });
        } catch (spawnErr) {
          console.warn(`[MapsScraperService] Failed to spawn scraper binary: ${spawnErr.message}`);
          return resolve();
        }

        let stderrData = '';
        if (child.stderr) {
          child.stderr.on('data', chunk => {
            stderrData += chunk.toString();
          });
        }

        let limitCheckInterval = null;
        if (jobId) {
          telemetryService.registerProcess(jobId, child);
        }

        let lastPlacesCount = 0;
        let lastProgressTime = Date.now();
        const STAGNATION_THRESHOLD_MS = 90000; // Conclude early only if no new leads found in 90 seconds (allows browser to switch queries)

        limitCheckInterval = setInterval(() => {
          const job = jobId ? telemetryService.getJob(jobId) : null;
          if (job && job.isCancelled) {
            console.log(`[MapsScraperService] Job ${jobId} cancelled by user. Terminating process.`);
            clearInterval(limitCheckInterval);
            killProcessTreeGracefully(child);
            return resolve();
          }

          // Stop early if we have harvested enough raw candidate places (>= limit * 1.25) to satisfy target after filters
          const targetRawPlaces = Math.ceil(limit * 1.25);
          if (job && job.uniqueBusinesses >= targetRawPlaces) {
            console.log(`[MapsScraperService] Reached target candidate limit (${job.placesHarvested}/${targetRawPlaces}). Gracefully concluding harvest.`);
            clearInterval(limitCheckInterval);
            killProcessTreeGracefully(child);
            return resolve();
          }

          // Stagnation watchdog: If places were harvested and 90s pass with zero new leads,
          // conclude early instead of stalling on dead/unresponsive pages
          if (job) {
            if (job.placesHarvested > lastPlacesCount) {
              lastPlacesCount = job.placesHarvested;
              lastProgressTime = Date.now();
            } else if (job.placesHarvested > 0 && (Date.now() - lastProgressTime >= STAGNATION_THRESHOLD_MS)) {
              console.log(`[MapsScraperService] Inactivity detected: No new places for ${STAGNATION_THRESHOLD_MS / 1000}s (${job.placesHarvested} collected). Concluding harvest early.`);
              clearInterval(limitCheckInterval);
              killProcessTreeGracefully(child);
              return resolve();
            }
          }
        }, 1000);

        killTimer = setTimeout(() => {
          console.warn(`[MapsScraperService] Scraper binary exceeded timeout (${timeoutMs}ms). Terminating process...`);
          if (limitCheckInterval) clearInterval(limitCheckInterval);
          killProcessTreeGracefully(child, 2000);
          resolve();
        }, timeoutMs);

        child.on('error', err => {
          if (killTimer) clearTimeout(killTimer);
          if (limitCheckInterval) clearInterval(limitCheckInterval);
          console.warn(`[MapsScraperService] Scraper binary error: ${err.message}`);
          resolve();
        });

        child.on('close', (code, signal) => {
          if (killTimer) clearTimeout(killTimer);
          if (limitCheckInterval) clearInterval(limitCheckInterval);
          if (code !== 0 && code !== null) {
            console.warn(`[MapsScraperService] Binary closed with code ${code} / signal ${signal}. Stderr: ${stderrData.slice(-300)}`);
          }
          resolve();
        });
      });

      // Infer country and timezone once from search location (do not guess per lead)
      const tzInfo = timezoneService.detectTimezone({ city, address: city });
      const inferredCountry = (countryCode && countryCode !== 'US' ? countryCode : tzInfo.country) || countryCode || 'US';
      const inferredTimezone = tzInfo.timezone || (inferredCountry === 'GB' || inferredCountry === 'UK' ? 'Europe/London' : inferredCountry === 'AU' ? 'Australia/Sydney' : inferredCountry === 'AE' ? 'Asia/Dubai' : 'America/Chicago');
      const searchLoc = parseSearchLocation(city, inferredCountry);

      const candidatePlaces = [];

      // Stream JSONL results line by line with readline to prevent high memory usage
      if (fs.existsSync(tempResultsFile)) {
        const fileStream = fs.createReadStream(tempResultsFile, { encoding: 'utf8' });
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        for await (const line of rl) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const place = JSON.parse(trimmed);
            const title = (place.title || '').trim();
            if (!title || title.length < 2) continue;

            // Step 2: Skip permanently closed businesses
            const businessStatus = (place.status || place.business_status || '').trim();
            if (/permanently[_\s-]?closed/i.test(businessStatus) || place.permanently_closed === true) {
              skippedClosedCount++;
              console.log(`[MapsScraperService] Skipping permanently closed business: "${title}"`);
              continue;
            }

            // Step 2.5: Category skip (/airline|supplier|wholesale|manufactur|distribut|store|school|college|association/i)
            // Apply EXCLUDED_CATEGORY_REGEX ONLY to the primary category (place.category, else place.categories[0]). Do NOT join all categories.
            const primaryCategory = place.category || (Array.isArray(place.categories) && place.categories[0]) || '';
            if (EXCLUDED_CATEGORY_REGEX.test(primaryCategory)) {
              skippedCategoryCount++;
              console.log(`[MapsScraperService] Skipping excluded primary category "${primaryCategory}" for "${title}"`);
              continue;
            }

            // Step 3: Location contradiction check
            if (isLocationContradiction(place, searchLoc)) {
              skippedWrongLocationCount++;
              const addr = place.complete_address || {};
              console.log(`[MapsScraperService] Skipped place "${title}" (location contradiction: search="${city}", place="${addr.city || ''}, ${addr.state || ''}, ${addr.country || ''}")`);
              continue;
            }

            // Extract lat/lng
            const coords = extractLatLng(place);
            place._lat = coords.lat;
            place._lng = coords.lng;

            candidatePlaces.push(place);
          } catch (jsonErr) {}
        }
      }

      console.log(`[MapsScraperService] Total places skipped due to location contradiction: ${skippedWrongLocationCount}, excluded category: ${skippedCategoryCount}`);

      // Calculate median lat/lng of the run's first 10 candidate results with valid coordinates
      const first10Coords = [];
      for (const p of candidatePlaces) {
        if (p._lat !== null && p._lng !== null) {
          first10Coords.push({ lat: p._lat, lng: p._lng });
          if (first10Coords.length === 10) break;
        }
      }

      let medianLat = null;
      let medianLng = null;
      if (first10Coords.length > 0) {
        const sortedLats = first10Coords.map(c => c.lat).sort((a, b) => a - b);
        const sortedLngs = first10Coords.map(c => c.lng).sort((a, b) => a - b);
        const mid = Math.floor(sortedLats.length / 2);
        medianLat = sortedLats.length % 2 !== 0 ? sortedLats[mid] : (sortedLats[mid - 1] + sortedLats[mid]) / 2;
        medianLng = sortedLngs.length % 2 !== 0 ? sortedLngs[mid] : (sortedLngs[mid - 1] + sortedLngs[mid]) / 2;
      }

      // Step 3: Chain filter (if a business name appears in 3+ distinct cities in the result set, it's a chain)
      const businessCityMap = new Map();
      for (const p of candidatePlaces) {
        const normName = normalizeBusinessName(p.title);
        const pCity = (p.complete_address?.city || extractCity(p) || '').trim().toLowerCase();
        if (normName && pCity) {
          if (!businessCityMap.has(normName)) {
            businessCityMap.set(normName, new Set());
          }
          businessCityMap.get(normName).add(pCity);
        }
      }

      skippedChainsCount = 0;
      const chainNames = new Set();
      for (const [nameKey, cities] of businessCityMap.entries()) {
        if (cities.size >= 3) {
          chainNames.add(nameKey);
          console.log(`[MapsScraperService] Chain filter detected franchise "${nameKey}" across ${cities.size} cities: ${Array.from(cities).join(', ')}`);
        }
      }

      for (const place of candidatePlaces) {
        if (leads.length >= limit) break;
        const title = (place.title || '').trim();

        // 1. Geo check: skip if >60 km from median lat/lng of the run's first 10 results
        if (medianLat !== null && medianLng !== null && place._lat !== null && place._lng !== null) {
          const distKm = haversineDistanceKm(medianLat, medianLng, place._lat, place._lng);
          if (distKm > 60) {
            skippedWrongLocationCount++;
            console.log(`[MapsScraperService] Skipped place "${title}" (>60km from median: ${distKm.toFixed(1)}km)`);
            continue;
          }
        }

        const normName = normalizeBusinessName(title);
        if (chainNames.has(normName)) {
          skippedChainsCount++;
          continue;
        }

        const dedupeKey = place.place_id ? `pid:${place.place_id}` : `${normName}|${String(place.phone || '').replace(/\D/g, '').slice(-10)}`;
        if (seenNames.has(dedupeKey)) continue;
        seenNames.add(dedupeKey);

        const rawWeb = (place.web_site || '').trim();
        const isSocialOrNone = !rawWeb || isSocialOrAggregator(rawWeb, inferredCountry);
        const socialUrls = extractSocialUrls(rawWeb);

        // Extract genuine rating and reviews; default to null rather than fabricated 4.8 / 50
        const rawRating = place.review_rating ? parseFloat(place.review_rating) : null;
        const rating = (!isNaN(rawRating) && rawRating > 0) ? rawRating : null;

        const rawReviews = place.review_count ? parseInt(place.review_count, 10) : null;
        const reviewsCount = (!isNaN(rawReviews) && rawReviews >= 0) ? rawReviews : 0;

        const realCategory = place.category || (Array.isArray(place.categories) && place.categories[0]) || null;
        const businessStatus = (place.status || place.business_status || '').trim();

        const rawPhone = (place.phone || '').trim();
        const e164 = rawPhone ? phoneService.normalizeNumber(rawPhone, inferredCountry) : null;

        // City: use place.complete_address.city, else parse it from address. Never fall back to the raw query string; leave NULL.
        const placeCity = extractCity(place);

        leads.push({
          business_name: title,
          website: rawWeb || null,
          maps_link: place.link || null,
          latitude: place._lat,
          longitude: place._lng,
          lat: place._lat,
          lng: place._lng,
          phone: rawPhone || null,
          phone_e164: e164,
          phone_type: 'unknown',
          carrier: null,
          address: place.address || null,
          city: placeCity,
          category: formatCategoryName(keyword.trim()),
          google_category: realCategory,
          search_keyword: keyword.trim(),
          business_status: businessStatus || 'OPERATIONAL',
          place_id: place.place_id || null,
          country: inferredCountry,
          timezone: inferredTimezone,
          facebook_url: socialUrls.facebook_url,
          instagram_url: socialUrls.instagram_url,
          rating: rating,
          reviews_count: reviewsCount,
          source: 'maps',
          status: 'discovered',
          deal_value: 1000,
          sequence_step: 1,
          has_no_website: isSocialOrNone ? 1 : 0,
          website_status: isSocialOrNone ? (!rawWeb ? 'no_website' : 'social_only') : 'active',
          showcase_niche: isSocialOrNone ? (keyword || 'general') : null
        });
      }

      console.log(`[MapsScraperService] Total places skipped by chain filter: ${skippedChainsCount}`);
    } finally {
      try { if (fs.existsSync(tempQueryFile)) fs.unlinkSync(tempQueryFile); } catch {}
      try { if (fs.existsSync(tempResultsFile)) fs.unlinkSync(tempResultsFile); } catch {}
    }

    leads.skippedClosed = skippedClosedCount;
    leads.skippedWrongLocation = skippedWrongLocationCount;
    leads.skippedChains = skippedChainsCount;
    leads.skippedCategory = skippedCategoryCount;

    return leads;
  }

  isBinaryAvailable() {
    return fs.existsSync(BINARY_PATH);
  }

  generateSearchQueries(keyword, city, limit = 100) {
    return generateSearchQueries(keyword, city, limit);
  }

  parseSearchLocation(city, fallbackCountry = 'US') {
    return parseSearchLocation(city, fallbackCountry);
  }

  isLocationContradiction(place, searchLoc) {
    return isLocationContradiction(place, searchLoc);
  }

  normalizeBusinessName(name) {
    return normalizeBusinessName(name);
  }

  extractCity(place) {
    return extractCity(place);
  }

  extractLatLng(place) {
    return extractLatLng(place);
  }

  haversineDistanceKm(lat1, lon1, lat2, lon2) {
    return haversineDistanceKm(lat1, lon1, lat2, lon2);
  }

  isExcludedCategory(place) {
    const primaryCategory = (place && (place.category || (Array.isArray(place.categories) && place.categories[0]))) || '';
    return EXCLUDED_CATEGORY_REGEX.test(primaryCategory);
  }
}

module.exports = new MapsScraperService();
