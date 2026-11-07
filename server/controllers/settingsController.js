const Setting = require('../models/Setting');
const mailerService = require('../services/mailer-service');
const tunnelService = require('../services/tunnel-service');

/**
 * Settings Controller: Handles application configurations, SMTP verification,
 * and Cloudflare Public Tunnel management.
 */
class SettingsController {
  async getSettings(req, res) {
    try {
      const raw = Setting.getAll();
      const masked = { ...raw };
      if (masked.smtp_pass) {
        masked.smtp_pass = '••••••••';
      }
      res.json({ success: true, settings: masked });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const updated = Setting.setMany(req.body);
      if (updated.smtp_pass) updated.smtp_pass = '••••••••';
      res.json({ success: true, settings: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async testSmtp(req, res) {
    try {
      const testResult = await mailerService.verifyConnection();
      res.json(testResult);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  getTunnelStatus(req, res) {
    try {
      res.json({ success: true, tunnel: tunnelService.getStatus() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async startTunnel(req, res) {
    try {
      const port = process.env.PORT || 5000;
      const status = await tunnelService.start(port);
      res.json({ success: true, tunnel: status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  stopTunnel(req, res) {
    try {
      const status = tunnelService.stop();
      res.json({ success: true, tunnel: status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  setCustomDomain(req, res) {
    try {
      const { baseUrl } = req.body;
      const status = tunnelService.setCustomBaseUrl(baseUrl);
      res.json({ success: true, tunnel: status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Multi-Inbox Pool Endpoints
  getInboxes(req, res) {
    try {
      const multiInboxService = require('../services/multi-inbox-service');
      res.json({ success: true, pool: multiInboxService.getPoolMetrics() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  addInbox(req, res) {
    try {
      const multiInboxService = require('../services/multi-inbox-service');
      const account = multiInboxService.addAccount(req.body);
      res.json({ success: true, account });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  deleteInbox(req, res) {
    try {
      const multiInboxService = require('../services/multi-inbox-service');
      multiInboxService.deleteAccount(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  toggleInbox(req, res) {
    try {
      const multiInboxService = require('../services/multi-inbox-service');
      const updated = multiInboxService.toggleAccount(req.params.id, req.body.isActive);
      res.json({ success: true, account: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SettingsController();
