const mockupService = require('../services/mockup-service');
const Mockup = require('../models/Mockup');
const Lead = require('../models/Lead');
const Setting = require('../models/Setting');

/**
 * Mockup Controller: Handles website mockup generation and public viewing.
 */
class MockupController {
  /**
   * GET /api/mockup/:leadId
   * Fetch current mockup data
   */
  async getMockup(req, res) {
    try {
      const { leadId } = req.params;
      const lead = Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      let mockup = Mockup.findByLeadId(leadId);
      if (!mockup) {
        mockup = await mockupService.getOrGenerate(leadId);
      }

      const settings = Setting.getAll();
      const baseUrl = (settings.base_url || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const mockupUrl = `${baseUrl}/mockup/${leadId}`;

      res.json({
        success: true,
        mockup,
        mockup_url: mockupUrl
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/mockup/:leadId
   * (Re)generate mockup with chosen style and options
   */
  async generateMockup(req, res) {
    try {
      const { leadId } = req.params;
      const { template_style, headline } = req.body;

      const lead = Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const mockup = mockupService.generateAndSave(lead, {
        template_style: template_style || 'modern',
        headline: headline || null
      });

      const settings = Setting.getAll();
      const baseUrl = (settings.base_url || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const mockupUrl = `${baseUrl}/mockup/${leadId}`;

      res.json({
        success: true,
        mockup,
        mockup_url: mockupUrl
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /mockup/:leadId
   * Standalone public HTML view for the client or browser preview
   */
  async renderPublicView(req, res) {
    try {
      const { leadId } = req.params;
      const lead = Lead.findById(leadId);
      if (!lead) {
        return res.status(404).send('<h2>Mockup Not Found: Invalid Business Lead ID</h2>');
      }

      let mockup = Mockup.findByLeadId(leadId);
      if (!mockup) {
        mockup = await mockupService.getOrGenerate(leadId);
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(mockup.html_content);
    } catch (err) {
      res.status(500).send(`<h2>Error rendering preview: ${err.message}</h2>`);
    }
  }
}

module.exports = new MockupController();
