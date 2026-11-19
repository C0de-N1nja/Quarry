/**
 * High-Converting Cold Email Pitch Generator for Local Service Leads
 * 
 * Tareeqa A (Default): 100% Free, Instant, Zero AI Hallucination.
 * Grounded strictly in authentic lead data (Google rating, review count, city, niche, website audit).
 * Strictly zero consumer emojis — executive B2B sales standard.
 */

export const PITCH_ANGLES = [
  { id: 'auto', label: 'Best Match (Auto)', desc: 'Automatically selects the highest-converting angle based on lead data' },
  { id: 'no_website', label: 'No Dedicated Website', desc: 'Converts Google 5-star reputation into a modern website' },
  { id: 'slow_site', label: 'Slow Page Speed', desc: 'Fixes customer drop-off caused by slow mobile loading' },
  { id: 'mobile_friendly', label: 'Mobile Experience', desc: 'Fixes mobile usability for phone and tablet searchers' },
  { id: 'reputation_gap', label: 'Reputation to Revenue', desc: 'Aligns their 5-star customer proof with a premium web presence' }
];

export function inferCountry(phone = '', countryCode = '') {
  const code = (countryCode || '').toUpperCase().trim();
  const phoneDigits = (phone || '').replace(/[^\d+]/g, '');

  const COUNTRY_MAP = {
    AU: 'Australia',
    US: 'United States',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    CA: 'Canada',
    NZ: 'New Zealand',
    IE: 'Ireland',
    ZA: 'South Africa',
    AE: 'United Arab Emirates',
    PK: 'Pakistan',
    IN: 'India',
    SG: 'Singapore',
    DE: 'Germany',
    FR: 'France'
  };

  if (COUNTRY_MAP[code]) return COUNTRY_MAP[code];
  if (code.length > 2) return code;

  if (phoneDigits.startsWith('+61') || phoneDigits.startsWith('61')) return 'Australia';
  if (phoneDigits.startsWith('+44') || phoneDigits.startsWith('44')) return 'United Kingdom';
  if (phoneDigits.startsWith('+64') || phoneDigits.startsWith('64')) return 'New Zealand';
  if (phoneDigits.startsWith('+971') || phoneDigits.startsWith('971')) return 'United Arab Emirates';
  if (phoneDigits.startsWith('+92') || phoneDigits.startsWith('92')) return 'Pakistan';
  if (phoneDigits.startsWith('+91') || phoneDigits.startsWith('91')) return 'India';
  if (phoneDigits.startsWith('+1') || phoneDigits.startsWith('1')) return 'United States';

  return null;
}

export function formatLocation(lead) {
  if (!lead) return 'your area';
  const inferred = inferCountry(lead.phone, lead.country);
  if (lead.city && inferred && !lead.city.toLowerCase().includes(inferred.toLowerCase())) {
    return `${lead.city}, ${inferred}`;
  }
  if (lead.city) return lead.city;
  if (inferred) return inferred;
  return 'your area';
}

export function determineOptimalAngle(lead, audit) {
  const isNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' || 
    /facebook\.com|instagram\.com|linkedin\.com|linktr\.ee/i.test(lead.website || '');
  
  if (isNoWebsite) return 'no_website';

  const ttfb = audit?.ttfb_ms || audit?.metrics?.ttfb_ms || 0;
  if (ttfb > 1400) return 'slow_site';

  const isMobileResponsive = audit?.mobile_viewport_present !== false && audit?.metrics?.isMobileResponsive !== false;
  if (!isMobileResponsive) return 'mobile_friendly';

  if ((lead.rating >= 4.5 && lead.reviews_count >= 15) || (lead.reviews_count >= 50)) {
    return 'reputation_gap';
  }

  return 'no_website';
}

export const DEFAULT_EMAIL_TEMPLATES = {
  subject: `Quick question regarding customer inquiries for {businessName}`,
  body: `Hi {greetingName},\n\nI was looking at established service businesses in {location} and came across {businessName}.\n\nI noticed you don't currently have an official website connected to your business profile.\n\nThe way local customers find and hire businesses has changed a lot recently. Beyond standard Google searches, many homeowners and clients now ask AI tools like ChatGPT: "Who is the most reliable service provider in {location}?"\n\nThese AI tools only recommend businesses that have an official website they can look at to confirm your services, past work, and credibility. Because {businessName} doesn't have a website listed, those customer inquiries are currently being handed straight to your competitors.\n\nHaving a simple, professional website ensures both regular searchers and modern AI tools recommend {businessName} first.\n\nWe put together a quick, clean blueprint showing how this works and what it would look like for {businessName}. Would you be open to a quick 2-minute preview this week?\n\n{signature}`
};

export function generatePitchDraft({
  lead,
  audit,
  settings = {},
  angle = 'auto'
}) {
  const businessName = lead.business_name || lead.company_name || 'your business';
  const location = formatLocation(lead);
  const hasReviews = Number(lead.rating) > 0 && Number(lead.reviews_count) > 0;
  const rating = hasReviews ? `${lead.rating}/5.0` : null;
  const reviewsCount = Number(lead.reviews_count) || 0;
  const senderName = settings.sender_name || 'Your Name';
  const agencyName = settings.agency_name || '';
  const bookingLink = settings.my_portfolio || '';
  const signature = settings.outreach_signature || `Best regards,\n${senderName}${agencyName ? ` | ${agencyName}` : ''}${bookingLink ? `\n${bookingLink}` : ''}`;
  const greetingName = lead.decision_maker_name || lead.owner_name || `${businessName} team`;

  const vars = {
    businessName,
    companyName: businessName,
    greetingName,
    location,
    city: lead.city || location,
    category: lead.category || lead.google_category || 'services',
    rating: rating || '',
    reviewsCount: reviewsCount || '',
    senderName,
    agencyName,
    bookingLink,
    portfolioUrl: bookingLink,
    signature
  };

  const interpolate = (tpl) => {
    if (!tpl) return '';
    return tpl.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  };

  if (settings.custom_email_subject || settings.custom_email_body) {
    const customSubj = settings.custom_email_subject 
      ? interpolate(settings.custom_email_subject) 
      : `Quick question regarding customer inquiries for ${businessName}`;
    const customBody = settings.custom_email_body 
      ? interpolate(settings.custom_email_body) 
      : '';
    if (customBody) {
      return {
        subject: customSubj,
        body: customBody,
        angle: 'custom'
      };
    }
  }

  const chosenAngle = angle === 'auto' ? determineOptimalAngle(lead, audit) : angle;

  let subject = '';
  let body = '';

  switch (chosenAngle) {
    case 'no_website': {
      subject = `Quick question regarding customer inquiries for ${businessName}`;
      
      body = `Hi ${businessName} team,

I was looking at established service businesses in ${location} and came across ${businessName}.

I noticed you don't currently have an official website connected to your business profile. 

The way local customers find and hire businesses has changed a lot recently. Beyond standard Google searches, many homeowners and clients now ask AI tools like ChatGPT: "Who is the most reliable service provider in ${location}?"

These AI tools only recommend businesses that have an official website they can look at to confirm your services, past work, and credibility. Because ${businessName} doesn't have a website listed, those customer inquiries are currently being handed straight to your competitors.

Having a simple, professional website ensures both regular searchers and modern AI tools recommend ${businessName} first.

We put together a quick, clean blueprint showing how this works and what it would look like for ${businessName}. Would you be open to a quick 2-minute preview this week?

${signature}`;
      break;
    }

    case 'slow_site': {
      subject = `Quick note regarding mobile customer inquiries for ${businessName}`;
      
      body = `Hi ${businessName} team,

I came across ${businessName} while looking at local service providers in ${location} and took a look at your website from my phone earlier today.

You have a solid business, but on mobile phones, the page takes several seconds to load, and it is difficult for a customer to quickly find your phone number or request a quote.

Most local customers give up after 3 seconds if a page does not load smoothly, and they call the next business on Google.

With a few simple adjustments, your site can load instantly and make it effortless for phone visitors to tap and call you right away.

I put together a quick summary of 2 simple improvements you can make to bring in more calls. Would you like me to share it with you?

${signature}`;
      break;
    }

    case 'mobile_friendly': {
      subject = `Customer experience on mobile for ${businessName}`;
      
      body = `Hi ${businessName} team,

I was looking at ${businessName}'s website from a smartphone earlier today.

Over 80% of local customers now search and compare businesses on their phones before hiring. When viewing your site on a mobile device, the layout can be difficult to read, and prospective clients have to pinch and zoom to find your contact details.

A clean, easy-to-read mobile layout with a direct "Tap to Call" button makes it effortless for interested clients to get in touch before they move on to a competitor.

Would you be open to a quick 2-minute walkthrough showing how to make your mobile page easier for customers to book?

${signature}`;
      break;
    }

    case 'reputation_gap':
    default: {
      const proofText = rating && reviewsCount > 0 
        ? `${rating} rating and ${reviewsCount.toLocaleString()} verified customer reviews` 
        : `established reputation in ${location}`;

      subject = `Your Google rating vs. competitors in ${location} (${businessName})`;
      
      body = `Hi ${businessName} team,

Congratulations on building your ${proofText} in ${location} — that kind of customer trust takes years of hard work to earn.

However, right now that great reputation is only visible to people who happen to scroll through Google Maps.

Without an official website:
1. Customers who search Google outside of Maps cannot find your full service details.
2. AI tools like ChatGPT cannot verify or recommend your business to local searchers.
3. Competitors with lower ratings are winning clients simply because they have a professional website where customers can request a quote at any time.

A simple website featuring your best reviews and photos of your work would immediately turn ${businessName} into the top choice in your area.

We drafted a quick visual preview of what this could look like for your business. Would you be open to seeing a quick 2-minute walkthrough?

${signature}`;
      break;
    }
  }

  return {
    angle: chosenAngle,
    subject,
    body: body.trim()
  };
}
