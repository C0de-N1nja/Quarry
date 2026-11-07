const Outbox = require('../models/Outbox');
const Setting = require('../models/Setting');
const Lead = require('../models/Lead');
const mailerService = require('../services/mailer-service');
const timezoneService = require('../services/timezone-service');

/**
 * Outreach Controller: Handles outbox queue, immediate send, smart timezone scheduling, and rate-limiting.
 */
class OutreachController {
  async getOutbox(req, res) {
    try {
      const { status } = req.query;
      const items = Outbox.findAll(status);
      const sentToday = Outbox.getDailySentCount();
      const settings = Setting.getAll();
      const dailyLimit = parseInt(settings.daily_send_limit || '30', 10);

      res.json({
        success: true,
        sentToday,
        dailyLimit,
        items
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async queueEmail(req, res) {
    try {
      const { lead_id, recipient_email, recipient_name, subject, body, template_angle, scheduled_at } = req.body;
      if (!lead_id || !recipient_email || !subject || !body) {
        return res.status(400).json({ success: false, error: 'Missing required outreach fields' });
      }

      const queued = mailerService.queueEmail({
        lead_id,
        recipient_email,
        recipient_name,
        subject,
        body,
        template_angle,
        scheduled_at: scheduled_at || null
      });

      res.json({ success: true, outbox: queued });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSmartSchedule(req, res) {
    try {
      const leadId = req.params.leadId;
      const lead = Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }

      const schedule = timezoneService.calculateNextOptimalSend(lead);
      res.json({ success: true, schedule });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendEmail(req, res) {
    try {
      const outboxId = req.params.outboxId;
      const result = await mailerService.sendEmail(outboxId);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendDirect(req, res) {
    try {
      const { lead_id, recipient_email, recipient_name, subject, body, template_angle } = req.body;
      if (!lead_id || !recipient_email || !subject || !body) {
        return res.status(400).json({ success: false, error: 'Missing required outreach fields' });
      }

      // 1. Stage in outbox
      const queued = mailerService.queueEmail({
        lead_id,
        recipient_email,
        recipient_name,
        subject,
        body,
        template_angle
      });

      // 2. Dispatch immediately via SMTP
      const sendResult = await mailerService.sendEmail(queued.id);

      res.json({
        success: true,
        outboxId: queued.id,
        result: sendResult
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteOutboxItem(req, res) {
    try {
      Outbox.delete(req.params.id);
      res.json({ success: true, message: 'Outbox item removed' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async handleUnsubscribe(req, res) {
    try {
      const token = req.query.token || req.body?.token;
      let leadId = null;
      let email = null;

      if (token) {
        try {
          const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
          leadId = decoded.leadId;
          email = decoded.email;
        } catch (e) {}
      }

      if (leadId) {
        const db = require('../db/database');
        db.prepare("UPDATE leads SET status = 'archived', opted_out = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(leadId);
        db.prepare("UPDATE outbox SET status = 'cancelled', error_message = 'Recipient opted out via One-Click Unsubscribe' WHERE lead_id = ? AND status IN ('pending', 'scheduled')").run(leadId);
      }

      // Check if RFC 8058 automated POST request
      if (req.method === 'POST') {
        return res.status(200).send('Unsubscribed successfully');
      }

      // Human browser GET response
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; max-width: 440px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            h2 { color: #38bdf8; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            .badge { display: inline-block; background: #065f46; color: #34d399; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="badge">Preferences Updated</div>
            <h2>You Have Been Unsubscribed</h2>
            <p>Your email address ${email ? `<strong>(${email})</strong>` : ''} has been removed from all future communication. You will not receive any further automated outreach from us.</p>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send('Error processing unsubscribe request');
    }
  }
}

module.exports = new OutreachController();
