const autopilotService = require('../services/autopilot-service');
const Lead = require('../models/Lead');
const Outbox = require('../models/Outbox');
const db = require('../db/database');

/**
 * AutoPilot Controller: REST & Server-Sent Events (SSE) streaming endpoint for batch pipeline
 */
class AutoPilotController {
  async runAutoPilot(req, res) {
    const isStream = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) res.flushHeaders();

      const sendEvent = (event, data) => {
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {}
      };

      try {
        await autopilotService.runAutoPilot(req.body || {}, sendEvent);
        res.write('event: done\ndata: {"finished":true}\n\n');
        res.end();
      } catch (err) {
        sendEvent('error', { error: err.message });
        res.end();
      }
    } else {
      try {
        const result = await autopilotService.runAutoPilot(req.body || {});
        res.json({ success: true, ...result });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  async getStatus(req, res) {
    try {
      const stats = Lead.getPipelineStats();
      const discoveredCount = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'discovered'").get().c;
      const unEnrichedCount = db.prepare("SELECT COUNT(l.id) as c FROM leads l LEFT JOIN contacts c ON l.id = c.lead_id WHERE c.id IS NULL").get().c;
      const pendingOutbox = db.prepare("SELECT COUNT(*) as c FROM outbox WHERE status IN ('pending', 'scheduled')").get().c;

      res.json({
        success: true,
        stats,
        discoveredCount,
        unEnrichedCount,
        pendingOutbox
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AutoPilotController();
