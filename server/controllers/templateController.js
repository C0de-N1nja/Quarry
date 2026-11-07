const Template = require('../models/Template');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Setting = require('../models/Setting');
const templateService = require('../services/template-service');

/**
 * Template Controller: Handles sales angles management and pitch previews.
 */
class TemplateController {
  async getTemplates(req, res) {
    try {
      const templates = Template.findAll();
      res.json({ success: true, templates });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async saveTemplate(req, res) {
    try {
      const { name, angle, subject_template, body_template, is_default } = req.body;
      if (!name || !angle || !subject_template || !body_template) {
        return res.status(400).json({ success: false, error: 'Missing required template fields' });
      }

      const saved = Template.save({
        name,
        angle,
        subject_template,
        body_template,
        is_default: is_default ? 1 : 0
      });

      res.json({ success: true, template: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async previewPitch(req, res) {
    try {
      const { template_angle, lead_id } = req.body;
      if (!lead_id) return res.status(400).json({ success: false, error: 'lead_id is required' });

      const lead = Lead.findById(lead_id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const contact = Contact.findByLeadId(lead_id);
      const settings = Setting.getAll();

      const rendered = templateService.renderPitch(
        template_angle || 'speed_mobile',
        lead,
        null,
        contact,
        settings
      );

      res.json({
        success: true,
        rendered,
        lead,
        contact
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new TemplateController();
