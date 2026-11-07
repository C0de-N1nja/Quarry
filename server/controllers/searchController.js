const crawlerService = require('../services/crawler-service');
const Lead = require('../models/Lead');
const notificationService = require('../services/notification-service');

/**
 * Search Controller: Handles web scraping searches and CSV imports.
 */
class SearchController {
  async searchProspects(req, res) {
    try {
      const { keyword, location, limit = 15 } = req.body;
      if (!keyword || !location) {
        return res.status(400).json({ success: false, error: 'Both keyword and location are required' });
      }

      const discovered = await crawlerService.searchProspects(keyword, location, parseInt(limit, 10));
      const result = Lead.insertBatch(discovered);

      try {
        notificationService.sendScrapeComplete({
          engine: 'Web Crawler Engine',
          keyword,
          location,
          found: discovered.length,
          inserted: result.count,
          upgraded: result.upgraded || 0
        });
      } catch (notifErr) {}

      res.json({
        success: true,
        found: discovered.length,
        inserted: result.count,
        leads: result.leads
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async uploadCsv(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
      }

      const parsed = crawlerService.parseCsv(req.file.buffer);
      const result = Lead.insertBatch(parsed);

      try {
        notificationService.sendNotification(
          '📂 CSV Ingestion Complete',
          `Imported ${result.count} leads into database (${parsed.length} rows processed).`
        );
      } catch (notifErr) {}

      res.json({
        success: true,
        found: parsed.length,
        inserted: result.count,
        leads: result.leads
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async searchMaps(req, res) {
    try {
      const { keyword, location, limit = 20, jobId } = req.body;
      if (!keyword || !location) {
        return res.status(400).json({ success: false, error: 'Both keyword (niche) and location (city) are required' });
      }

      const mapsScraperService = require('../services/maps-scraper-service');
      const result = await mapsScraperService.searchMapsLeads(keyword, location, parseInt(limit, 10), jobId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  getTelemetry(req, res) {
    try {
      const { jobId } = req.params;
      const telemetryService = require('../services/telemetry-service');
      const job = telemetryService.getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Telemetry job not found' });
      }
      res.json({ success: true, ...job });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  streamTelemetry(req, res) {
    try {
      const { jobId } = req.params;
      const telemetryService = require('../services/telemetry-service');
      telemetryService.subscribeSSE(jobId, res);
    } catch (err) {
      res.status(500).end();
    }
  }

  cancelTelemetry(req, res) {
    try {
      const { jobId } = req.params;
      const telemetryService = require('../services/telemetry-service');
      const success = telemetryService.cancelJob(jobId);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SearchController();
