const db = require('../db/database');

/**
 * RescuedReply Model: Encapsulates client responses automatically rescued
 * from Gmail Spam folder into the Primary Inbox.
 */
class RescuedReply {
  static findAll(limit = 50) {
    return db.prepare(`
      SELECT r.*, l.business_name, l.website, l.city, l.category
      FROM rescued_replies r
      LEFT JOIN leads l ON r.lead_id = l.id
      ORDER BY r.id DESC
      LIMIT ?
    `).all(limit);
  }

  static findById(id) {
    return db.prepare(`
      SELECT r.*, l.business_name, l.website, l.city, l.category
      FROM rescued_replies r
      LEFT JOIN leads l ON r.lead_id = l.id
      WHERE r.id = ?
    `).get(id);
  }

  static findByLeadId(leadId) {
    return db.prepare(`
      SELECT * FROM rescued_replies 
      WHERE lead_id = ? 
      ORDER BY id DESC
    `).all(leadId);
  }

  static findByMessageId(messageId) {
    if (!messageId) return null;
    return db.prepare('SELECT id FROM rescued_replies WHERE message_id = ?').get(messageId);
  }

  static create({
    lead_id = null,
    sender_email,
    sender_name = null,
    subject = null,
    body_preview = null,
    folder_origin = '[Gmail]/Spam',
    status = 'rescued',
    sentiment = 'neutral',
    message_id = null,
    received_at = null
  }) {
    const stmt = db.prepare(`
      INSERT INTO rescued_replies 
        (lead_id, sender_email, sender_name, subject, body_preview, folder_origin, status, sentiment, message_id, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);
    const info = stmt.run(
      lead_id,
      sender_email,
      sender_name,
      subject,
      body_preview,
      folder_origin,
      status,
      sentiment,
      message_id,
      received_at
    );
    return this.findById(info.lastInsertRowid);
  }

  static delete(id) {
    return db.prepare('DELETE FROM rescued_replies WHERE id = ?').run(id);
  }

  static getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM rescued_replies').get().count;
    const positive = db.prepare("SELECT COUNT(*) as count FROM rescued_replies WHERE sentiment = 'positive'").get().count;
    const question = db.prepare("SELECT COUNT(*) as count FROM rescued_replies WHERE sentiment = 'question'").get().count;
    const negative = db.prepare("SELECT COUNT(*) as count FROM rescued_replies WHERE sentiment = 'negative'").get().count;
    const lastRescued = db.prepare('SELECT rescued_at FROM rescued_replies ORDER BY id DESC LIMIT 1').get()?.rescued_at || null;

    return {
      total,
      positive,
      question,
      negative,
      lastRescued
    };
  }
}

module.exports = RescuedReply;
