const sequenceService = require('../services/sequence-service');

/**
 * Sequence Controller: Manages multi-step outreach follow-ups and drip cadences.
 */
class SequenceController {
  getDueFollowups(req, res) {
    try {
      const leads = sequenceService.getDueFollowups();
      res.json({ success: true, count: leads.length, leads });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  previewFollowUp(req, res) {
    try {
      const leadId = req.params.leadId;
      const step = req.query.step ? parseInt(req.query.step, 10) : 2;
      const preview = sequenceService.generateFollowUp(leadId, step);
      res.json({ success: true, preview });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  stageFollowUp(req, res) {
    try {
      const leadId = req.params.leadId;
      const { step } = req.body;
      const result = sequenceService.stageFollowUp(leadId, step ? parseInt(step, 10) : null);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SequenceController();
