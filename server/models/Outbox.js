const db = require('../db/database');

/**
 * Outbox Model: Encapsulates staging, sending state, and queue history for outreach emails.
 */
class Outbox {
  static findAll(status = null, limit = 100) {
    if (status) {
      return db.prepare('SELECT * FROM outbox WHERE status = ? ORDER BY id DESC LIMIT ?').all(status, limit);
    }
    return db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT ?').all(limit);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM outbox WHERE id = ?').get(id);
  }

  static findByLeadId(leadId) {
    return db.prepare('SELECT * FROM outbox WHERE lead_id = ? ORDER BY id DESC').all(leadId);
  }

  static create({ lead_id, recipient_email, recipient_name, subject, body, template_angle, status = 'pending', scheduled_at = null }) {
    const res = db.prepare(`
      INSERT INTO outbox (lead_id, recipient_email, recipient_name, subject, body, template_angle, status, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lead_id, recipient_email, recipient_name, subject, body, template_angle, status, scheduled_at);

    return this.findById(res.lastInsertRowid);
  }

  static updateStatus(id, status, errorMessage = null, sentAt = null) {
    if (sentAt) {
      db.prepare(`
        UPDATE outbox 
        SET status = ?, error_message = ?, sent_at = ? 
        WHERE id = ?
      `).run(status, errorMessage, sentAt, id);
    } else {
      db.prepare(`
        UPDATE outbox 
        SET status = ?, error_message = ? 
        WHERE id = ?
      `).run(status, errorMessage, id);
    }
    return this.findById(id);
  }

  static getDailySentCount() {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM outbox 
      WHERE status = 'sent' 
        AND date(sent_at, 'localtime') = date('now', 'localtime')
    `).get();
    return result ? result.count : 0;
  }

  static delete(id) {
    return db.prepare('DELETE FROM outbox WHERE id = ?').run(id);
  }
}

module.exports = Outbox;
