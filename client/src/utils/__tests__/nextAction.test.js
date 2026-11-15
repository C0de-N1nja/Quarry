import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getNextAction, isMobilePhone, canCheckWebsite } from '../nextAction.js';

describe('Next Action Decision Logic (client/src/utils/nextAction.js)', () => {
  const TODAY = '2026-11-15';

  it('1. Returns none when lead is null or undefined', () => {
    assert.deepStrictEqual(getNextAction(null), { type: 'none', label: null, text: null, channel: null });
    assert.deepStrictEqual(getNextAction(undefined), { type: 'none', label: null, text: null, channel: null });
  });

  it('2. Stage won / lost -> no primary button', () => {
    const wonLead = { status: 'won', phone: '+1234567890', email: 'test@example.com' };
    const lostLead = { status: 'lost', phone: '+1234567890', email: 'test@example.com' };

    assert.strictEqual(getNextAction(wonLead).type, 'none');
    assert.strictEqual(getNextAction(wonLead).label, null);

    assert.strictEqual(getNextAction(lostLead).type, 'none');
    assert.strictEqual(getNextAction(lostLead).label, null);
  });

  it('3. Stage replied -> "Mark won"', () => {
    const repliedLead = {
      status: 'replied',
      phone: '+1 813-835-8733',
      email: 'owner@example.com'
    };
    const action = getNextAction(repliedLead);
    assert.strictEqual(action.type, 'mark_won');
    assert.strictEqual(action.label, 'Mark won');
  });

  it('4. Stage messaged and follow-up due/past -> "Follow up"', () => {
    // Follow up due today
    const dueToday = {
      status: 'messaged',
      follow_up_at: '2026-11-15',
      phone: '+61 451 899 683',
      phone_type: 'mobile'
    };
    const actionToday = getNextAction(dueToday, { today: TODAY });
    assert.strictEqual(actionToday.type, 'follow_up');
    assert.strictEqual(actionToday.label, 'Follow up');
    assert.strictEqual(actionToday.channel, 'whatsapp');

    // Follow up overdue (past date)
    const overdue = {
      status: 'messaged',
      follow_up_at: '2026-11-10',
      email: 'owner@example.com'
    };
    const actionOverdue = getNextAction(overdue, { today: TODAY });
    assert.strictEqual(actionOverdue.type, 'follow_up');
    assert.strictEqual(actionOverdue.label, 'Follow up');
    assert.strictEqual(actionOverdue.channel, 'email');

    // Follow up date not set yet (immediate follow-up)
    const noDate = {
      status: 'messaged',
      follow_up_at: null,
      phone: '+1 813-835-8733'
    };
    const actionNoDate = getNextAction(noDate, { today: TODAY });
    assert.strictEqual(actionNoDate.type, 'follow_up');
    assert.strictEqual(actionNoDate.label, 'Follow up');
  });

  it('5. Stage messaged and follow-up not due yet -> text "Follow-up on <date>", no button', () => {
    const futureLead = {
      status: 'messaged',
      follow_up_at: '2026-11-20',
      phone: '+61 451 899 683'
    };
    const action = getNextAction(futureLead, { today: TODAY });
    assert.strictEqual(action.type, 'none');
    assert.strictEqual(action.label, null);
    assert.strictEqual(action.text, 'Follow-up on 2026-11-20');
  });

  it('6. No phone/email/social found yet -> "Find contact"', () => {
    const emptyLead = {
      status: 'new',
      business_name: 'No Contact Co',
      phone: null,
      email: null,
      social_profiles: null,
      facebook_url: null,
      instagram_url: null
    };
    const action = getNextAction(emptyLead);
    assert.strictEqual(action.type, 'find_contact');
    assert.strictEqual(action.label, 'Find contact');
  });

  it('7. Stage contact_found with mobile number -> "WhatsApp"', () => {
    // Explicit mobile phone_type
    const mobileLead = {
      status: 'contact_found',
      phone: '+1 813-555-0100',
      phone_type: 'mobile',
      email: 'info@example.com'
    };
    const action1 = getNextAction(mobileLead);
    assert.strictEqual(action1.type, 'whatsapp');
    assert.strictEqual(action1.label, 'WhatsApp');

    // Australian cellular format (+61 4... or 04...)
    const auCellLead = {
      status: 'contact_found',
      phone: '+61 451 899 683',
      phone_type: 'unknown'
    };
    const action2 = getNextAction(auCellLead);
    assert.strictEqual(action2.type, 'whatsapp');
    assert.strictEqual(action2.label, 'WhatsApp');
  });

  it('8. Stage contact_found with email only (or landline + email) -> "Email"', () => {
    // Email only, no phone
    const emailOnlyLead = {
      status: 'contact_found',
      phone: null,
      email: 'owner@localplumbing.com'
    };
    const action1 = getNextAction(emailOnlyLead);
    assert.strictEqual(action1.type, 'email');
    assert.strictEqual(action1.label, 'Email');

    // Landline phone + email
    const landlineWithEmail = {
      status: 'contact_found',
      phone: '+1 813-835-8733',
      phone_type: 'landline',
      email: 'patrick@gulfcoasttree.biz'
    };
    const action2 = getNextAction(landlineWithEmail);
    assert.strictEqual(action2.type, 'email');
    assert.strictEqual(action2.label, 'Email');
  });

  it('9. Landline-only phone counts as no mobile (do not offer WhatsApp)', () => {
    const landlineOnlyLead = {
      status: 'contact_found',
      phone: '+1 813-835-8733',
      phone_type: 'landline',
      email: null
    };
    assert.strictEqual(isMobilePhone(landlineOnlyLead), false);
    const action = getNextAction(landlineOnlyLead);
    // Since no mobile and no email, do NOT offer WhatsApp; offers "Find contact" to find a mobile or email
    assert.notStrictEqual(action.label, 'WhatsApp');
    assert.strictEqual(action.label, 'Find contact');
  });

  it('10. Stage new with discovered phone/social -> "Find contact" (enrichment step)', () => {
    const newLead = {
      status: 'new',
      phone: '+1 813-555-0199',
      phone_type: 'unknown'
    };
    const action = getNextAction(newLead);
    assert.strictEqual(action.type, 'find_contact');
    assert.strictEqual(action.label, 'Find contact');
  });

  it('11. canCheckWebsite: returns true only for un-audited real websites', () => {
    assert.strictEqual(canCheckWebsite({ website: null }), false);
    assert.strictEqual(canCheckWebsite({ website: 'https://facebook.com/localbiz' }), false);
    assert.strictEqual(canCheckWebsite({ website: 'https://myshop.com', audit_status: 'audited' }), false);
    assert.strictEqual(canCheckWebsite({ website: 'https://myshop.com', audit_status: null }), true);
  });
});
