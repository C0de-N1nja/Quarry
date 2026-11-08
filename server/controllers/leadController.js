const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Outbox = require('../models/Outbox');
const crawlerService = require('../services/crawler-service');
const db = require('../db/database');

/**
 * Lead Controller: Handles HTTP requests for lead CRM operations.
 */
class LeadController {
  async getLeads(req, res) {
    try {
      let { status, search, category, tier, batchMode, contactChannel, limit, offset = 0 } = req.query;
      let parsedLimit;
      if (limit === 'all' || limit === '0' || limit === 0 || !limit) {
        parsedLimit = 10000;
      } else {
        parsedLimit = parseInt(limit, 10) || 10000;
      }
      const parsedOffset = parseInt(offset, 10) || 0;

      const leads = Lead.findAll({ status, search, category, tier, batchMode, contactChannel, limit: parsedLimit, offset: parsedOffset });
      const total = Lead.count({ status, search, category, tier, batchMode, contactChannel });

      res.json({
        success: true,
        total,
        leads
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const stats = Lead.getPipelineStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getLeadById(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const contact = Contact.findByLeadId(id);
      const outbox = Outbox.findByLeadId(id);

      res.json({
        success: true,
        lead,
        contact,
        outbox
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createLead(req, res) {
    try {
      const { business_name, website, maps_link, phone, address, city, category } = req.body;
      if (!business_name) return res.status(400).json({ success: false, error: 'Business name is required' });

      let cleanWebsite = website ? website.trim() : null;
      if (cleanWebsite && !cleanWebsite.startsWith('http')) {
        cleanWebsite = 'https://' + cleanWebsite;
      }

      const lead = Lead.create({
        business_name,
        website: cleanWebsite,
        maps_link: maps_link || null,
        phone,
        address,
        city,
        category,
        source: 'manual',
        status: 'discovered'
      });

      res.json({ success: true, lead });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateLead(req, res) {
    try {
      const id = req.params.id;
      const updated = Lead.update(id, req.body);
      res.json({ success: true, lead: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteLead(req, res) {
    try {
      const id = req.params.id;
      Lead.delete(id);
      res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async resolveWebsite(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      if (lead.website) {
        return res.json({ success: true, website: lead.website, message: 'Website already present' });
      }

      const foundUrl = await crawlerService.findWebsiteForLead(lead.business_name, lead.phone, lead.city);
      if (foundUrl) {
        const updated = Lead.update(id, { website: foundUrl });
        return res.json({ success: true, website: foundUrl, lead: updated });
      } else {
        return res.status(404).json({ success: false, error: 'Could not automatically find official website domain' });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async autoResolveAll(req, res) {
    try {
      const missing = db.prepare("SELECT id, business_name, phone, city FROM leads WHERE website IS NULL OR website = '' LIMIT 15").all();
      let resolvedCount = 0;
      for (const lead of missing) {
        const found = await crawlerService.findWebsiteForLead(lead.business_name, lead.phone, lead.city);
        if (found) {
          Lead.update(lead.id, { website: found });
          resolvedCount++;
        }
      }
      res.json({ success: true, attempted: missing.length, resolved: resolvedCount });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async cleanWebsites(req, res) {
    try {
      const result = Lead.purgeLeadsWithWebsites();
      res.json({
        success: true,
        purgedCount: result.purgedCount,
        remainingCount: result.remainingCount,
        message: `Successfully cleaned ${result.purgedCount} leads with websites. Retained ${result.remainingCount} authentic no-website prospects!`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async purgeAll(req, res) {
    try {
      Lead.purgeAll();
      res.json({
        success: true,
        message: 'All leads and pipeline artifacts have been completely purged from the database.'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateStage(req, res) {
    try {
      const id = req.params.id;
      const { status, deal_value } = req.body;
      const updated = Lead.updateStage(id, status, deal_value);
      res.json({ success: true, lead: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async scanPhone(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
      if (!lead.phone) return res.status(400).json({ success: false, error: 'Lead has no phone number to scan' });

      const phoneService = require('../services/phone-service');
      const intel = await phoneService.scanPhoneNumber(lead.phone, id);
      const updatedLead = Lead.findById(id);

      res.json({
        success: true,
        intel,
        lead: updatedLead
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async scanHolehe(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const Contact = require('../models/Contact');
      const contact = Contact.findByLeadId(id);
      const targetEmail = contact?.email || lead.email;
      if (!targetEmail) return res.status(400).json({ success: false, error: 'No email found for this lead to scan with Holehe' });

      const osintService = require('../services/osint-service');
      const accounts = await osintService.checkHolehe(targetEmail);

      if (contact) {
        Contact.upsert({
          lead_id: Number(id),
          email: contact.email,
          contact_name: contact.contact_name,
          contact_title: contact.contact_title,
          phone: contact.phone,
          holehe_results: accounts
        });
      }

      const updatedLead = Lead.findById(id);
      const updatedContact = Contact.findByLeadId(id);

      res.json({
        success: true,
        email: targetEmail,
        accounts,
        contact: updatedContact,
        lead: updatedLead
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async verifyWhatsApp(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const Contact = require('../models/Contact');
      const contact = Contact.findByLeadId(id);
      const targetPhone = contact?.phone || lead.phone;
      if (!targetPhone) return res.status(400).json({ success: false, error: 'No phone number available to verify on WhatsApp' });

      const whatsappService = require('../services/whatsapp-service');
      const intel = await whatsappService.verifyWhatsApp(targetPhone, id, { country: lead.country || 'US' });
      const updatedLead = Lead.findById(id);
      const updatedContact = Contact.findByLeadId(id);

      res.json({
        success: true,
        whatsapp: intel,
        lead: updatedLead,
        contact: updatedContact
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async scanBlackbird(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const Contact = require('../models/Contact');
      const contact = Contact.findByLeadId(id);

      let candidateHandle = req.body?.handle;
      if (!candidateHandle) {
        if (contact?.email && contact.email.includes('@')) {
          candidateHandle = contact.email.split('@')[0];
        } else if (lead.email && lead.email.includes('@')) {
          candidateHandle = lead.email.split('@')[0];
        } else if (contact?.contact_name) {
          candidateHandle = contact.contact_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
      }

      if (!candidateHandle) {
        return res.status(400).json({ success: false, error: 'No username handle or email local-part available to scan with Blackbird' });
      }

      const blackbirdService = require('../services/blackbird-service');
      const intel = await blackbirdService.scanHandle(candidateHandle, id, {
        category: req.query.category || req.body?.category || null,
        timeout: 4
      });

      const updatedLead = Lead.findById(id);
      const updatedContact = Contact.findByLeadId(id);

      res.json({
        success: true,
        blackbird: intel,
        lead: updatedLead,
        contact: updatedContact
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async scanHarvester(req, res) {
    try {
      const id = req.params.id;
      const lead = Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

      const domainInput = req.body?.domain || lead.website;
      if (!domainInput) {
        return res.status(400).json({ success: false, error: 'Lead has no custom website domain for theHarvester recon' });
      }

      const harvesterService = require('../services/harvester-service');
      const result = await harvesterService.scanDomain(domainInput, id, {
        sources: req.body?.sources || 'crtsh,certspotter,hackertarget',
        limit: 50,
        timeoutMs: 25000
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      const updatedLead = Lead.findById(id);
      const Contact = require('../models/Contact');
      const updatedContact = Contact.findByLeadId(id);

      res.json({
        success: true,
        harvester: result,
        lead: updatedLead,
        contact: updatedContact
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new LeadController();
