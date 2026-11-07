const spamRescuerService = require('../services/spam-rescuer-service');
const RescuedReply = require('../models/RescuedReply');
const Setting = require('../models/Setting');

class RescuerController {
  getStatus(req, res) {
    try {
      const status = spamRescuerService.getStatus();
      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async scanNow(req, res) {
    try {
      const result = await spamRescuerService.scanSpamFolder();
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async testConnection(req, res) {
    try {
      const result = await spamRescuerService.testConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  simulate(req, res) {
    try {
      const { leadId, senderEmail, senderName, subject, bodyText } = req.body;
      if (!leadId) {
        return res.status(400).json({ success: false, error: 'leadId is required for simulation' });
      }
      const result = spamRescuerService.simulateRescue({ leadId, senderEmail, senderName, subject, bodyText });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  getReplies(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const replies = RescuedReply.findAll(limit);
      const stats = RescuedReply.getStats();
      res.json({ success: true, replies, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  deleteReply(req, res) {
    try {
      const id = req.params.id;
      RescuedReply.delete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  exportFilter(req, res) {
    try {
      const { xml, criteriaCount } = spamRescuerService.generateGmailFilterXml();
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="client_hunter_mailFilters.xml"');
      res.send(xml);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  toggle(req, res) {
    try {
      const { enabled, intervalMins } = req.body;
      if (typeof enabled !== 'undefined') {
        Setting.set('spam_monitor_enabled', enabled ? 'true' : 'false');
      }
      if (intervalMins) {
        Setting.set('spam_monitor_interval_mins', String(intervalMins));
      }
      spamRescuerService.initBackgroundMonitor();
      res.json({ success: true, status: spamRescuerService.getStatus() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new RescuerController();
