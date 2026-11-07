const radarService = require('../services/radar-service');

/**
 * Radar Controller: Handles live searches for international developer gigs,
 * tailored proposal generation, and 1-click lead conversion.
 */
class RadarController {
  async search(req, res) {
    try {
      const { query, source, limit } = req.query;
      const gigs = await radarService.searchOpportunities({
        query: query || 'node backend',
        source: source || 'all',
        limit: limit ? parseInt(limit, 10) : 25
      });
      res.json({ success: true, count: gigs.length, gigs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  generateProposal(req, res) {
    try {
      const { gig } = req.body;
      if (!gig) {
        return res.status(400).json({ success: false, error: 'Gig details required' });
      }
      const proposal = radarService.generateProposal(gig);
      res.json({ success: true, proposal });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  convertToLead(req, res) {
    try {
      const { gig } = req.body;
      if (!gig) {
        return res.status(400).json({ success: false, error: 'Gig details required' });
      }
      const result = radarService.convertToLead(gig);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new RadarController();
