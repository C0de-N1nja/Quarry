const Template = require('../models/Template');

/**
 * Template Service: Pure deterministic variable interpolation engine
 * injecting real audit metrics and contact details into battle-tested outreach templates.
 */
class TemplateService {
  getAllTemplates() {
    return Template.findAll();
  }

  getTemplateByAngle(angle) {
    return Template.findByAngle(angle);
  }

  getTemplateById(id) {
    return Template.findById(id);
  }

  saveTemplate({ name, angle, subject_template, body_template, is_default = 0 }) {
    return Template.save({ name, angle, subject_template, body_template, is_default });
  }

  /**
   * Render a pitch for a given lead, audit, contact and template
   */
  renderPitch(templateAngleOrId, lead, audit = null, contact = null, settings = {}) {
    let template;
    if (typeof templateAngleOrId === 'number' || !isNaN(Number(templateAngleOrId))) {
      template = this.getTemplateById(Number(templateAngleOrId));
    } else {
      template = this.getTemplateByAngle(templateAngleOrId);
    }

    if (!template) {
      const all = this.getAllTemplates();
      template = all[0];
    }

    // Parse audit details if present
    let loadTimeSec = '3.6';
    let techStackStr = 'current stack';
    let flaws = [];
    if (audit) {
      if (audit.load_time_ms) {
        loadTimeSec = (audit.load_time_ms / 1000).toFixed(1);
      }
      if (audit.tech_stack) {
        try {
          const parsed = typeof audit.tech_stack === 'string' ? JSON.parse(audit.tech_stack) : audit.tech_stack;
          if (Array.isArray(parsed) && parsed.length > 0) {
            techStackStr = parsed.slice(0, 3).join(', ');
          }
        } catch {}
      }
      if (audit.flaws_summary) {
        try {
          flaws = typeof audit.flaws_summary === 'string' ? JSON.parse(audit.flaws_summary) : audit.flaws_summary;
        } catch {}
      }
    }

    const flaw1 = flaws[0] ? ` ${flaws[0]}` : ' with several render-blocking assets causing noticeable lag';
    const flaw2 = flaws[1] ? ` ${flaws[1]}` : ' and lacks instant mobile conversion prompts';
    const flawSummary = flaws.length > 0 ? flaws.slice(0, 2).join(' and ') : 'manual contact forms and unoptimized assets';

    let firstName = 'there';
    if (contact && contact.contact_name) {
      const cleanName = contact.contact_name.replace(/^(?:Dr\.|Dr|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Ms)\s+/i, '').trim();
      const candidate = cleanName.split(' ')[0].trim();
      const blockedNames = [
        'error', 'admin', 'test', 'undefined', 'null', 'owner', 'manager',
        'support', 'info', 'team', 'contact', 'feedback', 'none', 'user'
      ];
      if (candidate && !blockedNames.includes(candidate.toLowerCase()) && /^[a-zA-Z]{2,}$/.test(candidate)) {
        firstName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
      }
    }

    let cleanWebsite = lead.website ? lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'your website';

    const baseUrl = (settings.base_url || 'http://localhost:5000').replace(/\/$/, '');
    const mockupUrl = `${baseUrl}/mockup/${lead.id}`;
    const reportUrl = `${baseUrl}/report/${lead.id}`;
    const showcaseService = require('./showcase-service');
    const matchedNiche = lead.showcase_niche || showcaseService.matchNiche(lead.category, lead.business_name);
    const showcaseUrl = `${baseUrl}/showcase/${matchedNiche}`;

    // Map replacement variables
    const variables = {
      '{{business_name}}': lead.business_name || 'your business',
      '{{first_name}}': firstName,
      '{{website}}': cleanWebsite,
      '{{city}}': lead.city || 'your area',
      '{{category}}': lead.category || 'services',
      '{{phone}}': lead.phone || 'your phone',
      '{{rating}}': lead.rating ? String(lead.rating) : '5.0',
      '{{reviews_count}}': lead.reviews_count ? Number(lead.reviews_count).toLocaleString() : 'several',
      '{{mockup_url}}': mockupUrl,
      '{{report_url}}': reportUrl,
      '{{showcase_url}}': showcaseUrl,
      '{{load_time_sec}}': loadTimeSec,
      '{{tech_stack}}': techStackStr,
      '{{flaw_summary}}': flawSummary,
      '{{flaw_bullet_1}}': flaw1.trim(),
      '{{flaw_bullet_2}}': flaw2.trim(),
      '{{my_name}}': settings.sender_name || 'Rehan',
      '{{my_portfolio}}': settings.my_portfolio || 'https://github.com'
    };

    let subject = template ? template.subject_template : 'Quick question regarding {{business_name}}';
    let body = template ? template.body_template : 'Hi {{first_name}},\n\nI was looking at {{business_name}}...';

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    // Apply Spintax randomization to guarantee unique phrasings per lead
    subject = this.parseSpintax(subject);
    body = this.parseSpintax(body);

    // Clean up phrasing if firstName is generic 'there'
    if (firstName === 'there') {
      subject = subject.replace(/Question for there about/gi, 'Question about');
      subject = subject.replace(/for there about/gi, 'about');
    }

    return {
      template_id: template ? template.id : null,
      template_name: template ? template.name : 'Default',
      template_angle: template ? template.angle : 'default',
      subject,
      body,
      variables
    };
  }

  /**
   * Spintax Randomization Engine
   * Recursively parses {option1|option2|option3} syntax into random selections.
   * Supports nested spintax like {Hello|Hi {there|friend}}.
   */
  parseSpintax(text) {
    if (!text || typeof text !== 'string') return text;
    const spintaxRegex = /\{([^{}]+)\}/g;
    let result = text;
    let safetyCounter = 0;
    while (spintaxRegex.test(result) && safetyCounter < 10) {
      result = result.replace(spintaxRegex, (_, choices) => {
        const parts = choices.split('|');
        return parts[Math.floor(Math.random() * parts.length)];
      });
      safetyCounter++;
    }
    return result;
  }
}

module.exports = new TemplateService();
