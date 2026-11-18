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
 * High-converting, non-technical business-language WhatsApp hooks for local businesses.
 * Grounded in customer behavior, AI search visibility (ChatGPT/Google), and competitor customer leakage.
 * Strictly zero consumer emojis, respectful, point-to-point.
 */
export const WHATSAPP_HOOKS = [
  {
    id: 'ai_search',
    title: 'AI Search & ChatGPT',
    badge: 'Modern AI Gap',
    desc: 'Explains ChatGPT and Google AI only recommend businesses with an official website'
  },
  {
    id: 'competitor_leak',
    title: 'Competitor Customer Leak',
    badge: 'Revenue Alert',
    desc: 'Highlights how nearby competitors win calls because customers check proof on their phone'
  },
  {
    id: 'reputation',
    title: 'Trapped Google Reputation',
    badge: 'For Rated Leads',
    desc: 'Turns 5-star Google reputation into new jobs instead of letting competitors win'
  },
  {
    id: 'direct',
    title: 'Direct 30-Sec Inbound Hook',
    badge: 'Short & Punchy',
    desc: 'Ultra-concise message asking about capturing local search calls'
  },
  {
    id: 'speed_audit',
    title: 'Mobile Customer Drop-Off',
    badge: 'Has Website',
    desc: 'For businesses with a slow mobile site losing customers after 3 seconds'
  }
];

/**
 * Generates high-converting WhatsApp message tailored for a specific lead in plain business language.
 */
export function generateWhatsAppMessage(lead, hookId = 'auto') {
  if (!lead) return '';

  const businessName = lead.business_name || lead.company_name || 'Business Owner';
  const ownerName = lead.decision_maker_name || lead.owner_name || '';
  const greetingName = ownerName || businessName;
  const location = lead.city || formatLocation(lead) || 'your area';
  const category = lead.category || lead.google_category || 'services';

  const hasNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' ||
    /facebook\.com|instagram\.com|linkedin\.com|linktr\.ee/i.test(lead.website || '');

  const hasGoodRating = Number(lead.rating) >= 4.5 && Number(lead.reviews_count) >= 5;

  let chosenHook = hookId;
  if (chosenHook === 'auto') {
    if (!hasNoWebsite) {
      chosenHook = 'speed_audit';
    } else if (hasGoodRating) {
      chosenHook = 'reputation';
    } else {
      chosenHook = 'ai_search';
    }
  }

  const ratingText = Number(lead.rating) > 0
    ? `${lead.rating}-star rating (${lead.reviews_count || 0} reviews)`
    : 'strong track record';

  switch (chosenHook) {
    case 'competitor_leak': {
      return `Hi ${greetingName}, had a quick observation regarding ${businessName}.

You do great work in ${location}, but without an official website, you are likely losing calls every week to competitors.

Most homeowners compare two or three businesses on their phones before hiring. When they see your listing with no website, they usually tap on the next competitor who shows photos of their past work, customer reviews, and a simple quote request form.

You are doing the hard work on the job, but nearby businesses are getting those high-paying customers just by having a website.

We sketched out a quick mobile concept specifically for ${businessName} to help you keep those calls. Would you like me to send the link over?`;
    }

    case 'reputation': {
      return `Hi ${greetingName}, saw your ${ratingText} for ${businessName} in ${location} — you have a great reputation.

The issue is that your great reputation is trapped inside Google Maps.

Competitors in ${location} with fewer reviews and lower ratings are winning bigger jobs simply because they have an official website that builds immediate trust and lets customers request quotes at any time of day.

A simple, clean website showing your best work and top reviews would make ${businessName} the obvious choice in town.

I put together a quick preview of how this would look for your business. Open to seeing it?`;
    }

    case 'direct': {
      return `Hi ${greetingName}, noticed ${businessName} has a strong presence in ${location} but no official website.

When people search on Google or ask ChatGPT for ${category} in ${location}, nearby competitors get recommended because they have an active website.

We mapped out a simple way for ${businessName} to capture those inquiries instead of losing them. Would you be open to a quick 2-minute preview?`;
    }

    case 'speed_audit': {
      return `Hi ${greetingName}, quick heads up regarding ${businessName}.

I looked up your website from my phone earlier today. You have a solid business, but on mobile, the page takes several seconds to load, making it difficult for customers to quickly tap and call you.

Most phone searchers give up after 3 seconds and call the next business on Google.

With two simple adjustments, your site can load instantly and bring in more phone calls. Would you like me to send over a quick 2-minute breakdown?`;
    }

    case 'no_website':
    case 'ai_search':
    default: {
      return `Hi ${greetingName}, quick question regarding ${businessName} in ${location}.

I noticed your listing on Google Maps, but you don't have an official website attached to it.

A lot of local customers now ask ChatGPT or Google things like "who is the best ${category} in ${location}?" These AI tools only recommend businesses that have a real website to check. Because your business doesn't have one listed, they automatically send those customers to your local competitors.

We put together a simple plan to get ${businessName} recommended first when people search or ask AI for ${category}.

Would you be open to taking a quick 2-minute look?`;
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
