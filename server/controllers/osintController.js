const os = require('os');
const osintService = require('../services/osint-service');
const ownerOsintService = require('../services/owner-osint-service');
const socialResolverService = require('../services/social-resolver-service');
const osintTelemetryService = require('./../services/osint-telemetry-service');
const notificationService = require('../services/notification-service');
const Lead = require('../models/Lead');
const db = require('../db/database');

/**
 * OSINT Controller: Handles single-lead and batch OSINT social website verification,
 * contact enrichment, live SSE streaming, and cancellation.
 */
class OsintController {
  /**
   * Run OSINT on a single lead (no website gate!)
   */
  async enrichLead(req, res) {
    try {
      const leadId = req.params.leadId;
      const lead = Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const forceRefresh = req.query.force === 'true' || req.body?.force === true;

      // Run deep social verification & contact enrichment
      const result = await osintService.enrichLead(lead, null, { forceRefresh });

      const updatedLead = Lead.findById(leadId);
      const Contact = require('../models/Contact');
      const contact = Contact.findByLeadId(leadId);
      res.json({
        success: true,
        lead: updatedLead,
        contact,
        decision: result.decision,
        contacts: result.contacts,
        evidence: result.evidence
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Run Owner Deep-OSINT (Person Pivot) on a single lead
   */
  async enrichOwner(req, res) {
    try {
      const leadId = req.params.leadId;
      const lead = Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const manualOwnerName = req.body?.ownerName || req.query.name || null;
      const dossier = await ownerOsintService.enrichOwner(leadId, { manualOwnerName });

      const updatedLead = Lead.findById(leadId);
      res.json({
        success: true,
        lead: updatedLead,
        dossier
      });
    } catch (err) {
      console.error('[enrichOwner Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Run Social Account Resolution from an email address
   */
  async resolveSocialAccounts(req, res) {
    try {
      const email = req.body?.email || req.query.email;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Target email is required' });
      }

      const leadId = req.body?.leadId ? Number(req.body.leadId) : null;
      const groundTruth = req.body?.groundTruth || {};

      const report = await socialResolverService.resolveSocialAccounts(email, {
        leadId,
        groundTruth
      });

      res.json({
        success: true,
        report
      });
    } catch (err) {
      console.error('[resolveSocialAccounts Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Start a batch OSINT run with live progress tracking and multi-worker hardware concurrency
   */
  async runBatchOsint(req, res) {
    try {
      const { 
        leadIds = [], 
        filter = 'all', 
        category = 'all', 
        tier = null, 
        focusTier = null, 
        batchMode = null, 
        contactChannel = 'all', 
        search = '', 
        limit = 100, 
        retryFailedOnly = false, 
        forceRefresh = false 
      } = req.body || {};

      let targets = [];
      if (Array.isArray(leadIds) && leadIds.length > 0) {
        targets = leadIds.map(id => Lead.findById(id)).filter(Boolean);
      } else {
        const parsedLimit = (limit === 'all' || !limit || limit > 5000) ? 5000 : Math.max(1, parseInt(limit, 10) || 100);
        const finalTier = tier || (focusTier === 'gold' ? 'gold' : null);
        const finalBatchMode = batchMode || (focusTier === 'today' ? 'today' : null);

        targets = Lead.findAll({
          status: filter,
          category,
          tier: finalTier,
          batchMode: finalBatchMode,
          contactChannel,
          search,
          limit: parsedLimit
        });
      }

      if (targets.length === 0) {
        return res.status(400).json({ success: false, error: 'No matching leads found for OSINT run' });
      }

      // Conservative parallel workers (default: 3) to prevent search engine rate limits and CPU contention
      const concurrency = parseInt(process.env.OSINT_CONCURRENCY, 10) || 3;

      const jobId = 'osint_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      osintTelemetryService.initJob(jobId, targets, concurrency);

      // Launch multi-worker concurrent pool in background
      (async () => {
        let currentIndex = 0;
        let emailsFoundCount = 0;

        const worker = async () => {
          while (currentIndex < targets.length) {
            if (osintTelemetryService.isCancelled(jobId)) break;
            const index = currentIndex++;
            const target = targets[index];
            if (!target) break;

            const lead = Lead.findById(target.id);
            if (!lead) continue;

            try {
              if (osintTelemetryService.isCancelled(jobId)) break;

              // Immediately register active worker thread
              osintTelemetryService.updateLeadStep(jobId, lead.id, 'finding_profiles', 'Active worker thread assigned...');

              // 45s timeout per lead to guarantee multi-engine search, profile bio inspection, and DNS verification complete
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Lead processing timed out after 45s')), 45000)
              );

              const resultPromise = osintService.enrichLead(lead, (step, message) => {
                if (osintTelemetryService.isCancelled(jobId)) {
                  throw new Error('OSINT_CANCELLED');
                }
                osintTelemetryService.updateLeadStep(jobId, lead.id, step, message);
              }, { 
                forceRefresh: forceRefresh || retryFailedOnly,
                isCancelled: () => osintTelemetryService.isCancelled(jobId)
              });

              const result = await Promise.race([resultPromise, timeoutPromise]);

              if (osintTelemetryService.isCancelled(jobId)) break;

              if (result?.contacts?.primary_email) {
                emailsFoundCount++;
              }

              osintTelemetryService.completeLead(jobId, lead.id, {
                decision: result.decision,
                verifiedWebsite: result.website,
                contacts: result.contacts,
                socialProfiles: result.socialProfiles
              });
            } catch (err) {
              if (osintTelemetryService.isCancelled(jobId) || err.message === 'OSINT_CANCELLED') {
                break;
              }
              // Single lead failure or timeout recorded without stopping the batch
              osintTelemetryService.completeLead(jobId, lead.id, {
                decision: 'uncertain',
                error: err.message
              });
            }
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        // Native Linux Desktop Notification on batch completion
        const completedJob = osintTelemetryService.getJob(jobId);
        if (completedJob && !completedJob.isCancelled) {
          notificationService.sendOsintComplete({
            total: completedJob.total,
            processed: completedJob.processed,
            noWebsiteCount: completedJob.noWebsiteCount,
            hasWebsiteCount: completedJob.hasWebsiteCount,
            emailsFound: emailsFoundCount,
            elapsedSeconds: completedJob.elapsedSeconds
          });
        }
      })();

      res.json({
        success: true,
        jobId,
        total: targets.length,
        concurrency,
        message: `Started OSINT batch verification on ${targets.length} leads across ${concurrency} parallel workers`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }

  }

  /**
   * Cancel an ongoing batch OSINT job
   */
  async cancelJob(req, res) {
    try {
      const jobId = req.params.jobId;
      const cancelled = osintTelemetryService.cancelJob(jobId);
      res.json({ success: true, cancelled });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Stream live SSE progress for a job
   */
  async streamProgress(req, res) {
    const jobId = req.params.jobId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    osintTelemetryService.subscribe(jobId, res);
  }

  /**
   * Polling telemetry endpoint for an OSINT job
   */
  async getTelemetry(req, res) {
    const jobId = req.params.jobId;
    const job = osintTelemetryService.getJob(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, ...job });
  }

  /**
   * Get currently active or most recent job (survives page refresh)
   */
  async getActiveJob(req, res) {
    const job = osintTelemetryService.getActiveJob();
    const active = !!(job && job.status === 'running' && !job.isCancelled);
    res.json({ success: true, active, jobId: job?.jobId || null, job });
  }

  /**
   * Reset OSINT data, contacts, and verification status for all leads or a specific category
   */
  async resetOsint(req, res) {
    try {
      const { category = 'all' } = req.body || {};
      const result = Lead.resetOsint({ category });
      res.json({
        success: true,
        count: result.count,
        message: category && category !== 'all'
          ? `OSINT data reset for ${result.count} leads in collection "${category}"`
          : `OSINT data completely reset for all ${result.count} leads in database`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new OsintController();
