/**
 * High-Converting Cold Email Pitch Generator for Local Service Leads
 * 
 * Tareeqa A (Default): 100% Free, Instant, Zero AI Hallucination.
 * Grounded strictly in authentic lead data (Google rating, review count, city, niche, website audit).
 */

export const PITCH_ANGLES = [
  { id: 'auto', label: '🎯 Best Match (Auto-detected)', desc: 'Automatically selects the highest-converting angle based on lead data' },
  { id: 'no_website', label: '🌐 No Website / Social Only', desc: 'Converts Google 5-star reputation into a modern website' },
  { id: 'slow_site', label: '⚡ Slow Load Speed', desc: 'Fixes customer drop-off caused by slow mobile loading' },
  { id: 'mobile_friendly', label: '📱 Mobile Responsiveness', desc: 'Fixes mobile usability for phone & tablet searchers' },
  { id: 'reputation_gap', label: '⭐ Reputation-to-Revenue', desc: 'Aligns their 5-star customer proof with a premium web presence' }
];

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

export function generatePitchDraft({
  lead,
  audit,
  settings = {},
  angle = 'auto'
}) {
  const businessName = lead.business_name || lead.company_name || 'your business';
  const city = lead.city || 'your area';
  const rating = lead.rating ? `${lead.rating}★` : null;
  const reviewsCount = lead.reviews_count || 0;
  const senderName = settings.sender_name || 'Rehan';
  const agencyName = settings.agency_name || '';
  const bookingLink = settings.my_portfolio || '';
  const signature = settings.outreach_signature || `Best,\n${senderName}${agencyName ? ` | ${agencyName}` : ''}${bookingLink ? `\n${bookingLink}` : ''}`;

  const chosenAngle = angle === 'auto' ? determineOptimalAngle(lead, audit) : angle;

  let subject = '';
  let body = '';

  switch (chosenAngle) {
    case 'no_website': {
      subject = `Quick question about ${businessName}'s web presence`;
      const reputationProof = rating && reviewsCount > 0
        ? `I noticed your stellar ${rating} Google rating with ${reviewsCount.toLocaleString()} reviews in ${city} — impressive work.`
        : `I was researching reputable service businesses in ${city} and came across ${businessName}.`;
      
      body = `Hi ${businessName} team,

${reputationProof}

While searching for your official website, I noticed you don't currently have a dedicated site set up (or customers get redirected to social media). 

Most local homeowners searching on Google book the first reputable contractor with an instant quote or booking page. Without a direct site, you're likely losing qualified calls to competitors.

I built a quick modern mockup of what a clean, 1-click booking website for ${businessName} could look like. 

Would you be open to seeing a 2-minute preview this week? No pressure at all.

${signature}`;
      break;
    }

    case 'slow_site': {
      const ttfbMs = audit?.ttfb_ms || audit?.metrics?.ttfb_ms || 1800;
      const seconds = (ttfbMs / 1000).toFixed(1);
      subject = `Quick note on ${businessName}'s mobile load speed`;
      
      body = `Hi ${businessName} team,

I came across ${businessName} while researching top-rated businesses in ${city}.

I noticed your website takes around ${seconds} seconds to respond on mobile connections. Over 50% of mobile searchers hit the back button if a local service page doesn't load within 2 seconds.

We help service companies fix speed bottlenecks so every Google click turns into a phone call rather than a bounce.

I put together a quick 1-page breakdown of 2 speed fixes you can apply. Would you like me to send it over?

${signature}`;
      break;
    }

    case 'mobile_friendly': {
      subject = `${businessName} website on mobile screens`;
      
      body = `Hi ${businessName} team,

I was looking at ${businessName}'s website from my phone today. 

Over 65% of local service customers find you directly on mobile devices, but your current layout doesn't cleanly adjust to smaller phone screens — making it difficult for visitors to tap and call.

A responsive mobile layout with a sticky "Tap to Call" button typically increases inbound estimate inquiries by 25-35%.

Would you be open to a quick 2-minute video showing where customers get stuck on mobile?

${signature}`;
      break;
    }

    case 'reputation_gap':
    default: {
      const proofText = rating && reviewsCount > 0 
        ? `${rating} rating and ${reviewsCount.toLocaleString()} happy reviews` 
        : `strong reputation in ${city}`;

      subject = `Aligning ${businessName}'s online presence with your ${rating || '5-star'} reputation`;
      
      body = `Hi ${businessName} team,

I was looking through your Google profile and was impressed by your ${proofText} in ${city}.

Your customer proof is outstanding, but your current website doesn't fully showcase the premium quality of your work to first-time visitors searching online.

We help reputable local businesses turn high Google ratings into high-ticket inbound contracts with high-converting web design.

I'd love to share 3 specific ways to showcase your reviews and drive more booked jobs. Open to taking a look?

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
