const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Outbox = require('../models/Outbox');
const Setting = require('../models/Setting');
const mailerService = require('./mailer-service');

/**
 * Sequence Service: 3-Step Automated Follow-Up Engine.
 * 70%+ of cold client deals close on Follow-Up 1 or 2.
 * Generates tailored Step 2 (Day 4 Value Bump) and Step 3 (Day 8 Respectful Breakup).
 */
class SequenceService {
  /**
   * Generate preview of follow-up for a specific lead and step
   */
  generateFollowUp(leadId, targetStep = 2) {
    const lead = Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const contact = Contact.findByLeadId(leadId);
    const previousEmails = Outbox.findByLeadId(leadId);
    const lastEmail = previousEmails[0]; // newest
    const settings = Setting.getAll();

    const myName = settings.sender_name || 'Rehan';
    const myPortfolio = settings.my_portfolio || 'https://github.com';

    let firstName = 'there';
    if (contact && contact.contact_name) {
      const cleanName = contact.contact_name.replace(/^(?:Dr\.|Dr|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Ms)\s+/i, '');
      firstName = cleanName.split(' ')[0].trim() || 'there';
    }

    const businessName = lead.business_name || 'your business';
    const city = lead.city || 'your area';

    // Derive reference to what was offered in previous pitch
    let deliverableRef = 'interactive prototype';
    let topicRef = 'digital presence';
    if (lastEmail && lastEmail.template_angle) {
      if (lastEmail.template_angle === 'security_form_leak') {
        deliverableRef = 'executive security & form audit report';
        topicRef = 'contact form and security headers';
      } else if (lastEmail.template_angle === 'mockup_pitch') {
        deliverableRef = 'live mobile preview site';
        topicRef = 'mobile website and instant quote estimator';
      } else if (lastEmail.template_angle === 'speed_mobile') {
        deliverableRef = 'mobile speed benchmark breakdown';
        topicRef = 'mobile page load speed';
      }
    }

    const originalSubject = lastEmail ? lastEmail.subject : `Question regarding ${businessName}`;
    const cleanSubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    let body = '';

    if (targetStep === 2) {
      // Step 2: Day 4 Friendly Value Bump
      body = `Hi ${firstName},

Just following up on my previous note regarding ${businessName}'s ${topicRef}. 

Did you get a moment to review the ${deliverableRef} I put together for you? 

I know things get busy running operations in ${city}, so no rush at all—happy to jump on a quick 5-minute call or send over the code and configuration steps if you'd like to take a look.

Best,
${myName}
Node.js & Web Performance Engineer
${myPortfolio}`;
    } else {
      // Step 3: Day 8 Respectful Breakup
      body = `Hi ${firstName},

I assume your engineering roadmap and client intake pipeline are completely covered right now, so I won't follow up again!

If ${businessName} ever needs custom Node.js engineering, instant booking automations, or page speed tuning down the road, feel free to keep my contact info handy:
${myPortfolio}

Wishing you and ${businessName} continued momentum and success!

Cheers,
${myName}
Node.js & Backend Systems Engineer
${myPortfolio}`;
    }

    return {
      lead_id: lead.id,
      sequence_step: targetStep,
      subject: cleanSubject,
      body,
      recipient_email: contact?.email || lead.email,
      recipient_name: contact?.contact_name || businessName,
      template_angle: `followup_step_${targetStep}`
    };
  }

  /**
   * Stage follow-up email into outbox and advance lead's sequence step
   */
  stageFollowUp(leadId, targetStep = null) {
    const lead = Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const nextStep = targetStep || Math.min((lead.sequence_step || 1) + 1, 3);
    const generated = this.generateFollowUp(leadId, nextStep);

    if (!generated.recipient_email) {
      throw new Error('Cannot stage follow-up: No contact email found for this lead');
    }

    // Queue in Outbox
    const outboxItem = mailerService.queueEmail({
      lead_id: lead.id,
      recipient_email: generated.recipient_email,
      recipient_name: generated.recipient_name,
      subject: generated.subject,
      body: generated.body,
      template_angle: generated.template_angle
    });

    // Advance sequence step in Lead record
    const nowIso = new Date().toISOString();
    let nextFollowupDate = null;
    if (nextStep < 3) {
      // Target 4 days from now for Step 3
      const d = new Date();
      d.setDate(d.getDate() + 4);
      nextFollowupDate = d.toISOString();
    }

    const updatedLead = Lead.updateSequence(lead.id, nextStep, nowIso, nextFollowupDate);

    return {
      success: true,
      outboxItem,
      lead: updatedLead,
      advancedToStep: nextStep
    };
  }

  getDueFollowups() {
    return Lead.getFollowupsDue();
  }
}

module.exports = new SequenceService();
