import { formatLocation, inferCountry } from './pitchGenerator.js';

/**
 * Normalizes any phone number into pure international digits suitable for WhatsApp.
 * Handles US (+1), AU (+61), UK (+44), and general international formats.
 */
export function normalizeWhatsAppPhone(rawPhone, country = 'US') {
  if (!rawPhone) return '';
  const str = String(rawPhone).trim();
  if (!str) return '';

  const digits = str.replace(/[^\d]/g, '');
  if (!digits) return '';

  const inferred = inferCountry(str, country);

  // If number started with a plus (+) or 00, check if it already has country code
  if (str.startsWith('+') || str.startsWith('00')) {
    return digits;
  }

  // Australia: 10 digits starting with 0 (e.g. 0451 899 683 -> 61451899683)
  if (inferred === 'Australia' || country === 'AU') {
    if (digits.startsWith('0') && digits.length === 10) {
      return `61${digits.slice(1)}`;
    }
    if (digits.startsWith('61')) {
      return digits;
    }
    if (digits.length === 9) {
      return `61${digits}`;
    }
  }

  // United Kingdom: 11 digits starting with 0 (e.g. 07123 456789 -> 447123456789)
  if (inferred === 'United Kingdom' || country === 'GB' || country === 'UK') {
    if (digits.startsWith('0') && digits.length === 11) {
      return `44${digits.slice(1)}`;
    }
    if (digits.startsWith('44')) {
      return digits;
    }
  }

  // North America (US/Canada): 10 digits (e.g. 8138358733 -> 18138358733)
  if (digits.length === 10) {
    return `1${digits}`;
  }

  // Already prefixed with 1 (11 digits in US)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }

  return digits;
}

/**
 * High-converting WhatsApp message hooks for local businesses.
 * Strictly zero emojis, direct, professional B2B consulting standard.
 */
export const WHATSAPP_HOOKS = [
  {
    id: 'no_website',
    title: 'No-Website Direct Hook',
    badge: 'Highest Reply Rate',
    desc: 'Highlights their Google rating and asks if they are taking new clients without a site'
  },
  {
    id: 'speed_audit',
    title: 'Mobile Speed & Audit Hook',
    badge: 'Audit Focused',
    desc: 'Mentions mobile page speed or mobile experience fixes'
  },
  {
    id: 'casual',
    title: 'Casual 1-Liner (Low Pressure)',
    badge: 'Direct & Simple',
    desc: 'Short, friendly question about taking new clients this month'
  }
];

/**
 * Generates high-converting WhatsApp message tailored for a specific lead.
 */
export function generateWhatsAppMessage(lead, hookId = 'auto') {
  if (!lead) return '';

  const businessName = lead.business_name || lead.company_name || 'Business Owner';
  const ownerName = lead.decision_maker_name || lead.owner_name || '';
  const greetingName = ownerName || businessName;
  const location = lead.city || formatLocation(lead) || 'your area';

  const hasNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' ||
    /facebook\.com|instagram\.com|linkedin\.com|linktr\.ee/i.test(lead.website || '');

  let chosenHook = hookId;
  if (chosenHook === 'auto') {
    chosenHook = hasNoWebsite ? 'no_website' : 'speed_audit';
  }

  switch (chosenHook) {
    case 'speed_audit': {
      return `Hi ${greetingName}, quick heads up — I ran a mobile audit on ${businessName} and noticed a couple of simple fixes to improve mobile customer inquiries. Would you like me to send over a quick 2-minute breakdown?`;
    }
    case 'casual': {
      return `Hi ${greetingName}, quick question — are you currently taking new clients this month for ${businessName}? Had a quick observation regarding your local Google Maps visibility in ${location}.`;
    }
    case 'no_website':
    default: {
      const ratingProof = Number(lead.rating) > 0 
        ? `high rating on Google Maps for ${businessName} in ${location}`
        : `listing for ${businessName} in ${location}`;
      return `Hi ${greetingName}, I saw your ${ratingProof} and noticed you do not have an official commercial website set up. Are you currently taking on new clients this month? Most local competitors capture bookings directly through search.`;
    }
  }
}

/**
 * Direct WhatsApp Web URL (bypasses universal intermediate prompt on desktop).
 * Pre-fills the chat input so user only presses Enter.
 */
export function getWhatsAppWebUrl(rawPhone, message, country = 'US') {
  const digits = normalizeWhatsAppPhone(rawPhone, country);
  const encoded = encodeURIComponent(message || '');
  if (!digits) {
    return `https://web.whatsapp.com/send?text=${encoded}`;
  }
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`;
}

/**
 * Universal wa.me URL (works on mobile devices and native desktop apps).
 */
export function getUniversalWhatsAppUrl(rawPhone, message, country = 'US') {
  const digits = normalizeWhatsAppPhone(rawPhone, country);
  const encoded = encodeURIComponent(message || '');
  if (!digits) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${digits}?text=${encoded}`;
}
