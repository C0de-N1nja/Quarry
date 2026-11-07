const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');
const Outbox = require('../models/Outbox');
const Lead = require('../models/Lead');
const multiInboxService = require('./multi-inbox-service');

/**
 * Mailer Service: Handles SMTP transport initialization,
 * multi-inbox rotation, anti-spam delay jitter, scheduled queuing, and transmission.
 */
class MailerService {
  getSettings() {
    return Setting.getAll();
  }

  getTransporter(explicitSender = null) {
    const sender = explicitSender || multiInboxService.getNextAvailableSender();
    if (!sender || !sender.user || !sender.pass) {
      return null;
    }

    return {
      transporter: nodemailer.createTransport({
        host: sender.host || 'smtp.gmail.com',
        port: sender.port || 465,
        secure: sender.secure !== false,
        auth: {
          user: sender.user,
          pass: sender.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      sender
    };
  }

  async verifyConnection() {
    const conn = this.getTransporter();
    if (!conn) {
      return { success: false, message: 'SMTP credentials (user/password) not configured in Settings or Multi-Inbox Pool' };
    }
    try {
      await conn.transporter.verify();
      return { success: true, message: `SMTP connection verified successfully for ${conn.sender.user}` };
    } catch (err) {
      return { success: false, message: `SMTP verification failed: ${err.message}` };
    }
  }

  getDailySentCount() {
    return Outbox.getDailySentCount();
  }

  getRandomJitterMs() {
    const s = this.getSettings();
    const minSec = parseInt(s.min_jitter_seconds || '45', 10);
    const maxSec = parseInt(s.max_jitter_seconds || '90', 10);
    const seconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    return seconds * 1000;
  }

  /**
   * Queue an email into the outbox with optional smart schedule
   */
  queueEmail({ lead_id, recipient_email, recipient_name, subject, body, template_angle, scheduled_at = null, status = 'pending' }) {
    const finalStatus = scheduled_at ? 'scheduled' : status;
    const queued = Outbox.create({
      lead_id,
      recipient_email,
      recipient_name,
      subject,
      body,
      template_angle,
      scheduled_at,
      status: finalStatus
    });

    // Update lead status to 'pitched'
    Lead.updateStatus(lead_id, 'pitched');

    return queued;
  }

  /**
   * Send a specific email immediately or process from queue
   */
  generateUnsubscribeToken(leadId, email = '') {
    return Buffer.from(JSON.stringify({ leadId: parseInt(leadId, 10), email, t: Date.now() })).toString('base64url');
  }

  verifyUnsubscribeToken(token) {
    if (!token) return null;
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      return decoded.leadId || null;
    } catch {
      return null;
    }
  }

  async sendEmail(outboxId) {
    const s = this.getSettings();
    const outboxItem = Outbox.findById(outboxId);
    if (!outboxItem) throw new Error('Outbox record not found');

    const conn = this.getTransporter();
    if (!conn) {
      throw new Error('SMTP credentials not configured. Please enter your SMTP username and password in Settings or add accounts to the Multi-Inbox Pool.');
    }

    const { transporter, sender } = conn;
    const senderEmail = sender.fromEmail || sender.user;
    const senderName = sender.name || s.sender_name || 'Rehan';
    const fromAddress = `"${senderName}" <${senderEmail}>`;

    Outbox.updateStatus(outboxId, 'sending');

    try {
      const tunnelService = require('./tunnel-service');
      const tunnel = tunnelService.getStatus();
      const publicBase = (tunnel && tunnel.publicUrl) ? tunnel.publicUrl : (s.base_url || 'http://localhost:5000');
      const unsubToken = this.generateUnsubscribeToken(outboxItem.lead_id, outboxItem.recipient_email);
      const unsubUrl = `${publicBase}/api/outreach/unsubscribe?token=${unsubToken}`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: outboxItem.recipient_email,
        subject: outboxItem.subject,
        text: outboxItem.body,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>, <mailto:${senderEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });

      // Record successful dispatch on multi-inbox account
      if (sender.id) {
        multiInboxService.recordSent(sender.id);
      }

      const now = new Date().toISOString();
      Outbox.updateStatus(outboxId, 'sent', null, now);

      // Update lead status to 'sent'
      Lead.updateStatus(outboxItem.lead_id, 'sent');

      return {
        success: true,
        messageId: info.messageId,
        senderUser: sender.user,
        sentToday: this.getDailySentCount()
      };
    } catch (err) {
      Outbox.updateStatus(outboxId, 'failed', err.message);
      throw err;
    }
  }

  getOutboxList(status = null) {
    return Outbox.findAll(status);
  }

  deleteOutboxItem(id) {
    return Outbox.delete(id);
  }
}

module.exports = new MailerService();
