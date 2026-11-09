const Setting = require('../models/Setting');

/**
 * Settings Controller: Handles application configurations and crawler/OSINT settings.
 */
class SettingsController {
  async getSettings(req, res) {
    try {
      const raw = Setting.getAll();
      res.json({ success: true, settings: raw });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const updated = Setting.setMany(req.body);
      res.json({ success: true, settings: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  getTunnelStatus(req, res) {
    res.json({ success: true, tunnel: { isRunning: false, publicUrl: null } });
  }
}

module.exports = new SettingsController();
