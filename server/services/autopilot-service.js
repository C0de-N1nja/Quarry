const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Mockup = require('../models/Mockup');
const Outbox = require('../models/Outbox');
const Setting = require('../models/Setting');
const osintService = require('./osint-service');
const phoneService = require('./phone-service');
const mockupService = require('./mockup-service');
const templateService = require('./template-service');
const timezoneService = require('./timezone-service');
const mailerService = require('./mailer-service');
const crawlerService = require('./crawler-service');
const db = require('../db/database');

/**
 * AutoPilotService: Automated 1-Click Multi-Stage Batch Client Acquisition Pipeline
 * Sequences: Social Verification & OSINT -> Phone Classification -> Prototype -> Spintax Pitch -> Timezone Queue
 */
class AutoPilotService {
  /**
   * Run the end-to-end Auto-Pilot pipeline on a batch of leads
   */
  async runAutoPilot(options = {}, onProgress = null) {
    const {
      leadIds = [],
      filter = 'discovered',
      limit = 10,
      angle = 'mockup_pitch',
      dispatchMode = 'queue' // 'queue' | 'send' | 'prepare_only'
    } = options;

    const emit = (event, data) => {
      if (typeof onProgress === 'function') {
        try { onProgress(event, data); } catch {}
      }
    };

    // 1. Resolve Target Leads
    let targets = [];
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targets = leadIds.map(id => Lead.findById(id)).filter(Boolean);
    } else {
      let query = "SELECT * FROM leads WHERE status NOT IN ('won', 'archived')";
      const params = [];
      if (filter === 'no_website') {
        query += " AND (has_no_website = 1 OR website IS NULL OR website = '')";
      } else if (filter && filter !== 'all') {
        query += " AND status = ?";
        params.push(filter);
      }
      query += " ORDER BY id DESC LIMIT ?";
      params.push(parseInt(limit, 10) || 10);
      targets = db.prepare(query).all(...params);
    }

    emit('start', {
      total: targets.length,
      angle,
      dispatchMode,
      timestamp: new Date().toISOString()
    });

    const summary = {
      total: targets.length,
      processed: 0,
      enriched: 0,
      phonesClassified: 0,
      mockupsBuilt: 0,
      pitchesQueued: 0,
      pitchesSent: 0,
      pitchesPrepared: 0,
      skipped: 0,
      failed: 0,
      results: []
    };

    // Multi-Threaded Concurrent Worker Pool across CPU cores (12 cores)
    const os = require('os');
    const cpuCount = os.cpus().length || 4;
    const concurrency = Math.max(2, Math.min(cpuCount - 2, 4));

    let nextIndex = 0;
    const processLeadWorker = async () => {
      while (nextIndex < targets.length) {
        const i = nextIndex++;
        const currentLead = targets[i];
        summary.processed++;

        const leadResult = {
          leadId: currentLead.id,
          businessName: currentLead.business_name,
          website: currentLead.website,
          success: false,
          steps: {}
        };

        emit('lead_start', {
          index: i + 1,
          total: targets.length,
          leadId: currentLead.id,
          businessName: currentLead.business_name
        });

      try {
        // Step 0: Check Opt-Out Compliance
        if (Boolean(currentLead.opted_out)) {
          leadResult.steps.optOut = 'skipped_opted_out';
          summary.skipped++;
          emit('lead_step', { leadId: currentLead.id, step: 'opt_out', status: 'skipped', msg: 'Lead opted out via RFC 8058. Skipping.' });
          summary.results.push(leadResult);
          continue;
        }

        let websiteUrl = currentLead.website;
        const isNoWebsiteMode = filter === 'no_website' || angle === 'no_website_showcase' || currentLead.has_no_website === 1;

        // Step 1: Website Auto-Resolution (if missing, but skip if explicitly running no-website showcase)
        if (!websiteUrl && !isNoWebsiteMode) {
          emit('lead_step', { leadId: currentLead.id, step: 'resolve', status: 'running', msg: 'Searching official website domain...' });
          websiteUrl = await crawlerService.findOfficialWebsite(currentLead.business_name, currentLead.city);
          if (websiteUrl) {
            Lead.update(currentLead.id, { website: websiteUrl });
            leadResult.website = websiteUrl;
            emit('lead_step', { leadId: currentLead.id, step: 'resolve', status: 'done', msg: `Found website: ${websiteUrl}` });
          } else {
            emit('lead_step', { leadId: currentLead.id, step: 'resolve', status: 'warning', msg: 'No website found; proceeding to OSINT social verification.' });
          }
        }

        // Step 3: OSINT Decision-Maker & MX Enrichment
        let contact = Contact.findByLeadId(currentLead.id);
        if (!contact && websiteUrl) {
          emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'running', msg: 'Harvesting decision maker email & validating MX...' });
          try {
            const contactData = await osintService.enrichLead(currentLead);
            contact = Contact.upsert({
              lead_id: currentLead.id,
              email: contactData.email,
              email_type: contactData.email_type,
              contact_name: contactData.contact_name,
              contact_title: contactData.contact_title,
              phone: contactData.phone,
              social_links: contactData.social_links,
              holehe_results: contactData.holehe_results,
              is_mx_valid: contactData.is_mx_valid
            });
            if (contact && contact.email) {
              summary.enriched++;
              leadResult.steps.osint = { email: contact.email, name: contact.contact_name, isMxValid: contact.is_mx_valid };
              emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'done', msg: `Found contact: ${contact.contact_name || 'Owner'} (${contact.email})` });
            } else {
              emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'warning', msg: 'No direct email discovered yet.' });
            }
          } catch (osintErr) {
            emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'warning', msg: `OSINT lookup skipped: ${osintErr.message}` });
          }
        } else if (!contact && !websiteUrl) {
          // Alternative OSINT for leads without websites
          emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'running', msg: 'Running multi-source social & place OSINT...' });
          try {
            const noWebsiteOsint = require('./no-website-osint');
            const harvested = await noWebsiteOsint.harvestNoWebsiteContact(currentLead);
            if (harvested.email) {
              contact = Contact.findByLeadId(currentLead.id);
              summary.enriched++;
              leadResult.steps.osint = { email: harvested.email, name: harvested.contact_name, isMxValid: harvested.is_mx_valid };
              emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'done', msg: `Social OSINT discovered: ${harvested.email}` });
            } else {
              emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'warning', msg: 'No public email found in social bios.' });
            }
          } catch (e) {
            emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'warning', msg: 'Alternative OSINT skipped.' });
          }
        } else if (contact && contact.email) {
          leadResult.steps.osint = { email: contact.email, name: contact.contact_name, isMxValid: contact.is_mx_valid };
          emit('lead_step', { leadId: currentLead.id, step: 'osint', status: 'cached', msg: `Existing contact: ${contact.contact_name || 'Owner'} (${contact.email})` });
        }

        // Step 4: Phone Classification (PhoneInfoga)
        if (currentLead.phone && !currentLead.phone_type) {
          emit('lead_step', { leadId: currentLead.id, step: 'phone', status: 'running', msg: 'Classifying carrier via PhoneInfoga...' });
          try {
            const phoneIntel = await phoneService.scanPhoneNumber(currentLead.phone, currentLead.id);
            summary.phonesClassified++;
            leadResult.steps.phone = { type: phoneIntel.phone_type, carrier: phoneIntel.carrier };
            emit('lead_step', { leadId: currentLead.id, step: 'phone', status: 'done', msg: `${phoneIntel.phone_type} • ${phoneIntel.carrier}` });
          } catch (phoneErr) {
            emit('lead_step', { leadId: currentLead.id, step: 'phone', status: 'warning', msg: 'Phone scan skipped.' });
          }
        }

        const effectiveAngle = isNoWebsiteMode ? 'no_website_showcase' : angle;

        // Step 5: Prototype Delivery (Showcase Niche or Bespoke Dynamic Mockup)
        if (effectiveAngle === 'no_website_showcase') {
          const showcaseService = require('./showcase-service');
          const matchedNiche = showcaseService.matchNiche(currentLead.category, currentLead.business_name);
          summary.mockupsBuilt++;
          leadResult.steps.mockup = { id: matchedNiche, url: `/showcase/${matchedNiche}` };
          emit('lead_step', { leadId: currentLead.id, step: 'mockup', status: 'done', msg: `Attached showcase prototype: /showcase/${matchedNiche} (${matchedNiche.toUpperCase()})` });
        } else {
          emit('lead_step', { leadId: currentLead.id, step: 'mockup', status: 'running', msg: 'Synthesizing mobile-first interactive prototype...' });
          const mockup = await mockupService.getOrGenerate(currentLead.id, { template_style: 'modern' });
          if (mockup) {
            summary.mockupsBuilt++;
            leadResult.steps.mockup = { id: mockup.id, url: `/mockup/${currentLead.id}` };
            emit('lead_step', { leadId: currentLead.id, step: 'mockup', status: 'done', msg: 'Interactive prototype ready with quote calculator.' });
          }
        }

        // Step 6: Spintax Cold Pitch & Smart Scheduling
        emit('lead_step', { leadId: currentLead.id, step: 'pitch', status: 'running', msg: `Generating Spintax pitch for angle "${effectiveAngle}"...` });
        const latestContact = Contact.findByLeadId(currentLead.id);
        const settings = Setting.getAll ? Setting.getAll() : {};
        const pitch = templateService.renderPitch(effectiveAngle, currentLead, null, latestContact, settings);
        const rawEmail = latestContact?.email || currentLead.email;
        const hasValidEmail = this.isValidRecipientEmail(rawEmail);

        if (hasValidEmail) {
          const recipientEmail = rawEmail.trim().toLowerCase();
          let recipientName = latestContact?.contact_name || currentLead.business_name;
          const blockedNames = ['error', 'admin', 'test', 'undefined', 'null', 'owner', 'manager', 'support', 'info', 'team', 'contact', 'feedback', 'none'];
          if (!recipientName || blockedNames.includes(recipientName.toLowerCase().trim())) {
            recipientName = currentLead.business_name;
          }

          if (dispatchMode === 'queue') {
            const delivery = timezoneService.calculateNextOptimalSend(currentLead);
            const queuedItem = Outbox.create({
              lead_id: currentLead.id,
              recipient_email: recipientEmail,
              recipient_name: recipientName,
              subject: pitch.subject,
              body: pitch.body,
              template_angle: effectiveAngle,
              status: 'scheduled',
              scheduled_at: delivery.sendAtUtc
            });

            Lead.updateStage(currentLead.id, 'pitched');
            Lead.updateSequence(currentLead.id, 1);
            summary.pitchesQueued++;
            leadResult.steps.pitch = { queuedId: queuedItem.id, scheduledFor: delivery.human_local_time || delivery.sendAtUtc };
            emit('lead_step', { leadId: currentLead.id, step: 'pitch', status: 'done', msg: `Queued for ${delivery.timezone_label} @ 9:30 AM` });
          } else if (dispatchMode === 'send') {
            const queuedItem = Outbox.create({
              lead_id: currentLead.id,
              recipient_email: recipientEmail,
              recipient_name: recipientName,
              subject: pitch.subject,
              body: pitch.body,
              template_angle: effectiveAngle,
              status: 'pending'
            });

            const sendResult = await mailerService.sendEmail(queuedItem.id);
            summary.pitchesSent++;
            leadResult.steps.pitch = { sent: true, messageId: sendResult.messageId };
            emit('lead_step', { leadId: currentLead.id, step: 'pitch', status: 'done', msg: 'Dispatched via SMTP!' });
          } else {
            // prepare_only
            summary.pitchesPrepared++;
            Lead.updateStage(currentLead.id, 'enriched');
            emit('lead_step', { leadId: currentLead.id, step: 'pitch', status: 'done', msg: 'Pitch drafted (Ready in Drawer).' });
          }
        } else {
          leadResult.steps.pitch = { skipped: true, reason: rawEmail ? 'invalid_blocked_email' : 'no_email_found' };
          emit('lead_step', {
            leadId: currentLead.id,
            step: 'pitch',
            status: 'warning',
            msg: rawEmail
              ? `Filtered out invalid/unserviceable address (${rawEmail}); outbox queue skipped.`
              : 'No verified direct email found; pitch drafted but outbox queue skipped (use WhatsApp / Phone fallback).'
          });
        }

        leadResult.success = true;
        emit('lead_done', {
          leadId: currentLead.id,
          businessName: currentLead.business_name,
          success: true,
          summary: leadResult.steps
        });
      } catch (err) {
        summary.failed++;
        leadResult.success = false;
        leadResult.error = err.message;
        emit('lead_done', {
          leadId: currentLead.id,
          businessName: currentLead.business_name,
          success: false,
          error: err.message
        });
      }

        summary.results.push(leadResult);
      }
    };

    const workerTasks = Array.from(
      { length: Math.min(concurrency, targets.length) },
      () => processLeadWorker()
    );
    await Promise.all(workerTasks);

    emit('complete', summary);
    return summary;
  }

  /**
   * Validate that an email is legitimate and not an internal engine error or infrastructure address
   */
  isValidRecipientEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) return false;

    const [local, domain] = clean.split('@');
    if (!local || !domain) return false;

    const blockedDomains = [
      'duckduckgo.com', 'google.com', 'bing.com', 'microsoft.com', 'apple.com',
      'cloudflare.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
      'linkedin.com', 'sentry.io', 'example.com', 'schema.org', 'w3.org',
      'wixpress.com', 'yelp.com', 'yellowpages.com', 'bbb.org'
    ];
    if (blockedDomains.some(d => domain === d || domain.endsWith('.' + d))) {
      return false;
    }

    const blockedLocals = [
      'error', 'error-lite', 'abuse', 'postmaster', 'noreply', 'no-reply',
      'donotreply', 'mailer-daemon', 'feedback', 'devnull', 'bounce', 'privacy',
      'security', 'test'
    ];
    if (blockedLocals.some(b => local === b || local.startsWith(b + '+') || local.startsWith(b + '-') || local.startsWith(b + '.'))) {
      return false;
    }

    return true;
  }
}

module.exports = new AutoPilotService();
