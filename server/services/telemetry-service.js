const fs = require('fs');
const readline = require('readline');
const noWebsiteVerifier = require('./no-website-verifier');

/**
 * TelemetryService: Tracks real-time Google Maps scraping metrics,
 * stream-parses newly landed places from disk, and broadcasts updates via SSE and polling.
 */
class TelemetryService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Initializes a new telemetry job record
   */
  initJob(jobId, { keyword, city, limit, workers = 8 }) {
    const existing = this.jobs.get(jobId);
    const existingSubscribers = existing && existing.subscribers ? existing.subscribers : new Set();
    const job = {
      jobId,
      status: 'initializing',
      keyword,
      city,
      targetLimit: limit,
      placesHarvested: 0,
      uniqueBusinesses: 0,
      withWebsiteCount: 0,
      noWebsiteCount: 0,
      currentSubRegion: city,
      activeWorkers: workers,
      speedPerMin: 0,
      percent: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      recentPlaces: [],
      subscribers: existingSubscribers,
      seenTitles: new Set(),
      lastReadOffset: 0,
      watchInterval: null,
      error: null
    };

    this.jobs.set(jobId, job);
    this.broadcast(jobId);
    return job;
  }

  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // Return clean JSON payload without circular/internal structures
    return {
      jobId: job.jobId,
      status: job.status,
      keyword: job.keyword,
      city: job.city,
      targetLimit: job.targetLimit,
      placesHarvested: job.placesHarvested,
      uniqueBusinesses: job.uniqueBusinesses,
      withWebsiteCount: job.withWebsiteCount || 0,
      noWebsiteCount: job.noWebsiteCount,
      currentSubRegion: job.currentSubRegion,
      activeWorkers: job.activeWorkers,
      speedPerMin: job.speedPerMin,
      percent: job.percent,
      isCancelled: !!job.isCancelled,
      elapsedSeconds: Math.floor((Date.now() - job.startTime) / 1000),
      recentPlaces: job.recentPlaces,
      error: job.error
    };
  }

  /**
   * Begins tracking the growing results file on disk
   */
  startWatching(jobId, filePath) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'scraping';
    this.broadcast(jobId);

    // Poll file every 600ms for newly written JSON lines
    job.watchInterval = setInterval(() => {
      this.readNewPlaces(jobId, filePath);
    }, 600);
  }

  /**
   * Reads new lines appended to the JSONL results file using byte offset tracking
   */
  readNewPlaces(jobId, filePath) {
    const job = this.jobs.get(jobId);
    if (!job || !fs.existsSync(filePath)) return;

    try {
      const stats = fs.statSync(filePath);
      if (stats.size <= job.lastReadOffset) return;

      const bytesToRead = stats.size - job.lastReadOffset;
      if (bytesToRead <= 0) return;

      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(bytesToRead);
      let bytesRead = 0;
      try {
        bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, job.lastReadOffset);
      } finally {
        fs.closeSync(fd);
      }

      if (bytesRead <= 0) return;

      // Find the last newline in buffer (0x0a = '\n')
      // Only process complete lines up to the last complete newline.
      // Any trailing partial line remains unread until its newline is written in a future tick.
      const lastNewlineIdx = buffer.lastIndexOf(0x0a);
      if (lastNewlineIdx === -1) {
        return; // No complete line yet, wait for next poll
      }

      const validChunk = buffer.subarray(0, lastNewlineIdx);
      // Advance offset exactly past the last complete newline
      job.lastReadOffset += (lastNewlineIdx + 1);

      const lines = validChunk.toString('utf8').split('\n');
      let addedAny = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const place = JSON.parse(trimmed);
          const title = (place.title || '').trim();
          if (!title || title.length < 2) continue;

          job.placesHarvested++;
          const titleKey = title.toLowerCase();
          const rawWeb = (place.web_site || '').trim();
          const isNoWeb = !rawWeb || noWebsiteVerifier.isSocialOrAggregator(rawWeb);

          if (!job.seenTitles.has(titleKey)) {
            job.seenTitles.add(titleKey);
            job.uniqueBusinesses++;
            if (isNoWeb) {
              job.noWebsiteCount++;
            } else {
              job.withWebsiteCount = (job.withWebsiteCount || 0) + 1;
            }
          }

          if (place.complete_address?.city) {
            job.currentSubRegion = place.complete_address.city;
          } else if (place.address && place.address.includes(',')) {
            const parts = place.address.split(',');
            if (parts.length >= 2) job.currentSubRegion = parts[1].trim();
          }

          const rating = place.review_rating ? parseFloat(place.review_rating) : null;
          const reviews = place.review_count ? parseInt(place.review_count, 10) : 0;

          // Maintain recent places queue (newest first, max 6 items)
          job.recentPlaces.unshift({
            name: title,
            city: job.currentSubRegion || job.city,
            rating: rating,
            reviews: reviews,
            hasNoWebsite: isNoWeb,
            phone: place.phone || null,
            discoveredAt: Date.now()
          });

          if (job.recentPlaces.length > 6) {
            job.recentPlaces.pop();
          }

          addedAny = true;
        } catch (jsonErr) {}
      }

      if (addedAny) {
        const elapsed = Math.max(1, (Date.now() - job.startTime) / 1000);
        job.speedPerMin = Math.round((job.placesHarvested / elapsed) * 60);
        job.percent = Math.min(99, Math.round((job.placesHarvested / Math.max(1, job.targetLimit)) * 100));
        this.broadcast(jobId);
      }
    } catch (err) {
      // Non-fatal read error; next tick will retry
    }
  }

  /**
   * Updates job stage status
   */
  updateStatus(jobId, status, extra = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    Object.assign(job, extra);

    if (status === 'completed' || status === 'error' || status === 'deduplicating') {
      if (job.watchInterval) {
        clearInterval(job.watchInterval);
        job.watchInterval = null;
      }
      if (status === 'completed') {
        job.percent = 100;
      }
    }

    this.broadcast(jobId);

    // Expire completed jobs from memory after 10 minutes
    if (status === 'completed' || status === 'error') {
      setTimeout(() => {
        this.jobs.delete(jobId);
      }, 600000);
    }
  }

  /**
   * Subscribes an Express response stream to Server-Sent Events (SSE)
   */
  subscribeSSE(jobId, res) {
    let job = this.jobs.get(jobId);
    if (!job) {
      job = this.initJob(jobId, { keyword: '', city: '', limit: 100 });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`data: ${JSON.stringify(this.getJob(jobId))}\n\n`);
    job.subscribers.add(res);

    res.on('close', () => {
      job.subscribers.delete(res);
    });
  }

  /**
   * Broadcasts current telemetry state to all SSE subscribers
   */
  broadcast(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || !job.subscribers || job.subscribers.size === 0) return;

    const payload = JSON.stringify(this.getJob(jobId));
    for (const res of job.subscribers) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        job.subscribers.delete(res);
      }
    }
  }

  /**
   * Registers running child process for immediate cancellation control
   */
  registerProcess(jobId, childProcess) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.childProcess = childProcess;
    }
  }

  /**
   * Cancels a running job and halts its child process
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.isCancelled = true;
    job.status = 'cancelled';

    if (job.watchInterval) {
      clearInterval(job.watchInterval);
      job.watchInterval = null;
    }

    if (job.childProcess) {
      const pid = job.childProcess.pid;
      if (pid) {
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          try { job.childProcess.kill('SIGTERM'); } catch {}
        }
        setTimeout(() => {
          try {
            process.kill(-pid, 'SIGKILL');
          } catch {
            try { job.childProcess.kill('SIGKILL'); } catch {}
          }
        }, 1500);
      } else {
        try { job.childProcess.kill('SIGTERM'); } catch {}
      }
    }

    this.broadcast(jobId);
    return true;
  }
}

module.exports = new TelemetryService();
