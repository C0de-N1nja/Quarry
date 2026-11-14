/**
 * Shared Lead Pipeline Stages
 * Single source of truth across client and server.
 *
 * Pipeline sequence: new -> contact_found -> messaged -> replied -> won
 * Terminal outcome: lost
 */

export const STAGES = {
  NEW: 'new',
  CONTACT_FOUND: 'contact_found',
  MESSAGED: 'messaged',
  REPLIED: 'replied',
  WON: 'won',
  LOST: 'lost'
};

export const STAGE_IDS = ['new', 'contact_found', 'messaged', 'replied', 'won', 'lost'];

export const STAGE_LABELS = {
  new: 'New',
  contact_found: 'Contact found',
  messaged: 'Messaged',
  replied: 'Replied',
  won: 'Won',
  lost: 'Lost'
};

export const STAGE_CONFIG = [
  {
    id: 'new',
    label: 'New',
    color: 'blue',
    chipColor: 'blue',
    dotColor: 'blue',
    description: 'Freshly discovered lead'
  },
  {
    id: 'contact_found',
    label: 'Contact found',
    color: 'purple',
    chipColor: 'purple',
    dotColor: 'purple',
    description: 'Direct email, phone, or owner discovered'
  },
  {
    id: 'messaged',
    label: 'Messaged',
    color: 'amber',
    chipColor: 'yellow',
    dotColor: 'yellow',
    description: 'Outreach email or WhatsApp sent'
  },
  {
    id: 'replied',
    label: 'Replied',
    color: 'emerald',
    chipColor: 'emerald',
    dotColor: 'emerald',
    description: 'Prospect responded or in discussion'
  },
  {
    id: 'won',
    label: 'Won',
    color: 'green',
    chipColor: 'green',
    dotColor: 'green',
    description: 'Deal closed and won'
  },
  {
    id: 'lost',
    label: 'Lost',
    color: 'slate',
    chipColor: 'slate',
    dotColor: 'slate',
    description: 'Archived, rejected, or lost'
  }
];

export const STAGE_MAP_OLD_TO_NEW = {
  // Discovered -> new
  discovered: 'new',
  new: 'new',

  // Enriched / Contacts Found -> contact_found
  enriched: 'contact_found',
  contacts_found: 'contact_found',
  contact_found: 'contact_found',

  // Pitched / Outreached / Contacted / Sent -> messaged
  pitched: 'messaged',
  outreached: 'messaged',
  contacted: 'messaged',
  sent: 'messaged',
  messaged: 'messaged',

  // In Discussion / Replied -> replied
  in_discussion: 'replied',
  replied: 'replied',

  // Won -> won
  won: 'won',

  // Archived -> lost
  archived: 'lost',
  lost: 'lost'
};

export function normalizeStage(stage) {
  if (!stage) return 'new';
  const lower = String(stage).trim().toLowerCase();
  return STAGE_MAP_OLD_TO_NEW[lower] || 'new';
}

export function getNextStage(currentStage) {
  const norm = normalizeStage(currentStage);
  switch (norm) {
    case 'new':
      return 'contact_found';
    case 'contact_found':
      return 'messaged';
    case 'messaged':
      return 'replied';
    case 'replied':
      return 'won';
    default:
      return norm;
  }
}

export function getStageLabel(stage) {
  const norm = normalizeStage(stage);
  return STAGE_LABELS[norm] || norm;
}

export default {
  STAGES,
  STAGE_IDS,
  STAGE_LABELS,
  STAGE_CONFIG,
  STAGE_MAP_OLD_TO_NEW,
  normalizeStage,
  getNextStage,
  getStageLabel
};
