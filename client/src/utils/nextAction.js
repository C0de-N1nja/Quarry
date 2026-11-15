import { normalizeStage } from '../../../shared/stages.js';

/**
 * Checks if a phone number or lead profile qualifies as a mobile phone.
 * Landline-only phone explicitly counts as no mobile.
 */
export function isMobilePhone(lead) {
  if (!lead) return false;

  const phoneType = (lead.phone_type || '').toLowerCase();
  if (phoneType.includes('landline')) {
    return false;
  }
  if (phoneType.includes('mobile') || phoneType.includes('wireless') || phoneType.includes('cell')) {
    return true;
  }
  if (phoneType.includes('voip')) {
    return false;
  }

  // Explicit WhatsApp registration detected by intel
  if (lead.is_whatsapp_registered === 1 || lead.has_whatsapp === 1 || lead.whatsapp) {
    return true;
  }

  // Australian mobile format detection (+61 4... or 04...)
  const phone = String(lead.phone || '').replace(/[^\d+]/g, '');
  if (phone.startsWith('+614') || phone.startsWith('614') || phone.startsWith('04')) {
    return true;
  }

  return false;
}

export function hasPhone(lead) {
  const p = lead?.phone || lead?.contact?.phone;
  return Boolean(p && String(p).trim() !== '');
}

export function hasEmail(lead) {
  const em = lead?.email || lead?.contact?.email;
  return Boolean(em && String(em).trim() !== '');
}

export function hasSocial(lead) {
  if (!lead) return false;
  if (lead.facebook_url || lead.instagram_url || lead.linkedin_url) return true;
  if (lead.social_profiles) {
    if (typeof lead.social_profiles === 'string') {
      const trimmed = lead.social_profiles.trim();
      if (trimmed !== '' && trimmed !== '{}' && trimmed !== '[]' && trimmed !== 'null') {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.length > 0;
          if (typeof parsed === 'object' && parsed !== null) return Object.keys(parsed).length > 0;
        } catch (_) {
          return true;
        }
      }
    } else if (typeof lead.social_profiles === 'object' && lead.social_profiles !== null) {
      if (Array.isArray(lead.social_profiles)) return lead.social_profiles.length > 0;
      return Object.keys(lead.social_profiles).length > 0;
    }
  }
  return false;
}

export function hasContact(lead) {
  return hasPhone(lead) || hasEmail(lead) || hasSocial(lead);
}

export function isSocialOrAggregator(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('google.com/maps') ||
         lower.includes('maps.app.goo.gl') ||
         lower.includes('facebook.com') ||
         lower.includes('fb.com') ||
         lower.includes('instagram.com') ||
         lower.includes('linkedin.com') ||
         lower.includes('yelp.com') ||
         lower.includes('yellowpages.com') ||
         lower.includes('angi.com');
}

export function canCheckWebsite(lead) {
  if (!lead) return false;
  const hasNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' || isSocialOrAggregator(lead.website);
  if (hasNoWebsite) return false;
  return lead.audit_status !== 'audited';
}

export function getFollowUpChannel(lead) {
  if (lead?.last_contact_channel) {
    return lead.last_contact_channel;
  }
  if (isMobilePhone(lead)) return 'whatsapp';
  if (hasEmail(lead)) return 'email';
  if (hasPhone(lead)) return 'phone';
  return 'general';
}

/**
 * Returns single next primary action for a lead according to the strict priority rules.
 * Returns { type, label, text, channel, followUpDate }
 */
export function getNextAction(lead, { today } = {}) {
  if (!lead) {
    return { type: 'none', label: null, text: null, channel: null };
  }

  const stage = normalizeStage(lead.status);

  // 1. won / lost -> no primary button
  if (stage === 'won' || stage === 'lost') {
    return { type: 'none', label: null, text: null, channel: null };
  }

  // 2. stage replied -> "Mark won"
  if (stage === 'replied') {
    return {
      type: 'mark_won',
      label: 'Mark won',
      text: null,
      channel: null
    };
  }

  // 3. stage messaged
  if (stage === 'messaged') {
    const todayStr = today || new Date().toISOString().split('T')[0];
    const followUpDate = lead.follow_up_at;
    const isDue = !followUpDate || followUpDate <= todayStr;

    if (isDue) {
      return {
        type: 'follow_up',
        label: 'Follow up',
        text: null,
        channel: getFollowUpChannel(lead),
        followUpDate: followUpDate || null
      };
    } else {
      // not due yet -> show "Follow-up on <date>" as text, no button
      return {
        type: 'none',
        label: null,
        text: `Follow-up on ${followUpDate}`,
        channel: null,
        followUpDate
      };
    }
  }

  // 4. no phone/email/social found yet -> "Find contact"
  const anyContactFound = hasContact(lead);
  if (!anyContactFound) {
    return {
      type: 'find_contact',
      label: 'Find contact',
      text: null,
      channel: null
    };
  }

  // 5. stage contact_found
  if (stage === 'contact_found') {
    if (isMobilePhone(lead)) {
      return {
        type: 'whatsapp',
        label: 'WhatsApp',
        text: null,
        channel: 'whatsapp'
      };
    }

    if (hasEmail(lead)) {
      return {
        type: 'email',
        label: 'Email',
        text: null,
        channel: 'email'
      };
    }

    // Landline only, no mobile, no email
    return {
      type: 'find_contact',
      label: 'Find contact',
      text: null,
      channel: null
    };
  }

  // 6. Default / stage new with unverified contacts
  return {
    type: 'find_contact',
    label: 'Find contact',
    text: null,
    channel: null
  };
}
