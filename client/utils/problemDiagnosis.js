/**
 * Generates an everyday, plain-English 1-line problem diagnosis
 * for any business lead (inspired by WarmReach).
 * Strictly zero emojis.
 */

export function getProblemDiagnosis(lead) {
  if (!lead) return { text: 'Needs review', type: 'neutral' };

  // 1. No website or social profile acting as website
  const rawWeb = (lead.website || '').toLowerCase();
  const isNoWebsite = lead.has_no_website === 1 || 
    !lead.website || 
    lead.website === 'None' || 
    rawWeb.includes('facebook.com') || 
    rawWeb.includes('instagram.com') ||
    lead.website_status === 'no_website';

  if (isNoWebsite) {
    return {
      text: 'No website · Invisible to local Google searchers',
      shortText: 'No website',
      type: 'danger'
    };
  }

  // 2. Unclaimed Google Business Profile
  if (lead.is_unclaimed === 1) {
    return {
      text: 'Unclaimed Google profile · Competitors can edit info',
      shortText: 'Unclaimed listing',
      type: 'warning'
    };
  }

  // 3. Low Google Maps Rank (Rank #10 or worse)
  if (lead.maps_rank && lead.maps_rank >= 8) {
    return {
      text: `Rank #${lead.maps_rank} on Maps · Local competitors take 80% calls`,
      shortText: `Rank #${lead.maps_rank}`,
      type: 'warning'
    };
  }

  // 4. Slow mobile speed
  if (lead.speed_score && Number(lead.speed_score) < 50) {
    return {
      text: `Slow mobile speed (${Math.round(lead.speed_score)}/100) · High bounce rate`,
      shortText: 'Slow mobile site',
      type: 'warning'
    };
  }

  // 5. Contact channel readiness
  const hasPhone = Boolean(lead.phone && String(lead.phone).trim() !== '');
  const hasWhatsApp = Boolean(lead.whatsapp && String(lead.whatsapp).trim() !== '');
  const hasEmail = Boolean(lead.email && String(lead.email).trim() !== '');

  if (hasWhatsApp) {
    return {
      text: 'Verified mobile · Direct WhatsApp ready',
      shortText: 'WhatsApp ready',
      type: 'success'
    };
  }

  if (hasEmail) {
    return {
      text: 'Verified email · Ready to send intro',
      shortText: 'Email ready',
      type: 'success'
    };
  }

  if (hasPhone) {
    return {
      text: 'Phone listed · Needs WhatsApp verification',
      shortText: 'Phone only',
      type: 'warning'
    };
  }

  return {
    text: 'No contact listed · Needs owner search',
    shortText: 'No contact',
    type: 'neutral'
  };
}
