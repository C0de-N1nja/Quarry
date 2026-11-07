/**
 * OsintTelemetryService: Manages live OSINT batch jobs, SSE subscribers,
 * polling telemetry, cancellation, and refresh recovery.
 */
class OsintTelemetryService {
  constructor() {
    this.jobs = new Map();
    this.activeJobId = null;
  }

  /**
   * Initializes a new batch OSINT job record
   */
  initJob(jobId, leads = [], concurrency = 1) {
    const items = leads.map(l => ({
      leadId: l.id,
      businessName: l.business_name,
      city: l.city || '',
      category: l.category || '',
      existingWebsite: l.website || '',
      status: 'queued', // 'queued' | 'running' | 'done' | 'uncertain' | 'failed'
      currentStep: 'queued', // 'finding_profiles' | 'scanning_bio' | 'verifying_site' | 'enriching_contacts' | 'done' | 'failed'
      decision: null, // 'has_website' | 'no_website' | 'uncertain'
      verifiedWebsite: null,
      contacts: null,
      socialProfiles: null,
      error: null,
      startedAt: null,
      finishedAt: null
    }));

    const job = {
      jobId,
      status: 'running', // 'running' | 'cancelled' | 'completed'
      total: leads.length,
      processed: 0,
      concurrency,
      activeThreads: 0,
      hasWebsiteCount: 0,
      noWebsiteCount: 0,
      uncertainCount: 0,
      failedCount: 0,
      currentLead: null,
      currentStep: 'initializing',
      startTime: Date.now(),
      elapsedSeconds: 0,
      items,
      subscribers: new Set(),
      isCancelled: false,
      activeLeadIds: new Set()
    };

    this.jobs.set(jobId, job);
    this.activeJobId = jobId;
    this.broadcast(jobId);
    return job;
  }

  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.jobId,
      status: job.status,
      total: job.total,
      processed: job.processed,
      concurrency: job.concurrency || 1,
      activeThreads: job.activeLeadIds ? job.activeLeadIds.size : (job.status === 'running' ? 1 : 0),
      activeLeadIds: job.activeLeadIds ? Array.from(job.activeLeadIds) : [],
      hasWebsiteCount: job.hasWebsiteCount,
      noWebsiteCount: job.noWebsiteCount,
      uncertainCount: job.uncertainCount,
      failedCount: job.failedCount,
      currentLead: job.currentLead,
      currentStep: job.currentStep,
      elapsedSeconds: Math.floor((Date.now() - job.startTime) / 1000),
      items: job.items,
      isCancelled: job.isCancelled
    };
  }

  getActiveJob() {
    if (!this.activeJobId) return null;
    const job = this.getJob(this.activeJobId);
    if (!job || job.status !== 'running' || job.isCancelled) {
      this.activeJobId = null;
      return null;
    }
    return job;
  }

  updateLeadStep(jobId, leadId, step, message = '') {
    const job = this.jobs.get(jobId);
    if (!job || job.isCancelled || job.status === 'cancelled') return;

    if (job.activeLeadIds) job.activeLeadIds.add(leadId);
    job.activeThreads = job.activeLeadIds ? job.activeLeadIds.size : 0;
    job.currentStep = step;
    const item = job.items.find(i => i.leadId === leadId);
    if (item) {
      if (item.status === 'queued') {
        item.status = 'running';
        item.startedAt = Date.now();
      }
      item.currentStep = step;
      job.currentLead = {
        id: item.leadId,
        businessName: item.businessName,
        city: item.city,
        step,
        message
      };
    }
    this.broadcast(jobId);
  }

  completeLead(jobId, leadId, { decision, verifiedWebsite, contacts, socialProfiles, error = null }) {
    const job = this.jobs.get(jobId);
    if (!job || job.isCancelled || job.status === 'cancelled') return;

    if (job.activeLeadIds) job.activeLeadIds.delete(leadId);
    job.activeThreads = job.activeLeadIds ? job.activeLeadIds.size : 0;
    job.processed++;
    const item = job.items.find(i => i.leadId === leadId);
    if (item) {
      item.finishedAt = Date.now();
      item.decision = decision;
      item.verifiedWebsite = verifiedWebsite || null;
      item.contacts = contacts || null;
      item.socialProfiles = socialProfiles || null;
      item.error = error;

      if (error && !decision) {
        item.status = 'failed';
        job.failedCount++;
      } else if (decision === 'uncertain') {
        item.status = 'uncertain';
        job.uncertainCount++;
      } else if (decision === 'has_website') {
        item.status = 'done';
        job.hasWebsiteCount++;
      } else {
        item.status = 'done';
        job.noWebsiteCount++;
      }
    }

    if (job.processed >= job.total) {
      job.status = 'completed';
      job.currentLead = null;
      job.currentStep = 'completed';
      if (job.activeLeadIds) job.activeLeadIds.clear();
    }

    this.broadcast(jobId);
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.isCancelled = true;
    job.status = 'cancelled';
    job.currentStep = 'cancelled';
    job.currentLead = null;
    if (job.activeLeadIds) job.activeLeadIds.clear();
    job.activeThreads = 0;

    // Mark remaining queued and running items as cancelled
    for (const item of job.items) {
      if (item.status === 'queued' || item.status === 'running') {
        item.status = 'cancelled';
        item.finishedAt = Date.now();
      }
    }

    if (this.activeJobId === jobId) {
      this.activeJobId = null;
    }

    this.broadcast(jobId);
    return true;
  }

  isCancelled(jobId) {
    const job = this.jobs.get(jobId);
    return job ? job.isCancelled : false;
  }

  subscribe(jobId, res) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.subscribers.add(res);
    res.write(`data: ${JSON.stringify(this.getJob(jobId))}\n\n`);

    res.on('close', () => {
      job.subscribers.delete(res);
    });
  }

  broadcast(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const payload = JSON.stringify(this.getJob(jobId));
    for (const res of job.subscribers) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (e) {
        job.subscribers.delete(res);
      }
    }
  }
}

module.exports = new OsintTelemetryService();
