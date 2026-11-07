const db = require('../db/database');

/**
 * Mockup Model: Encapsulates database persistence for generated landing page mockups.
 */
class Mockup {
  static findByLeadId(leadId) {
    return db.prepare('SELECT * FROM mockups WHERE lead_id = ?').get(leadId);
  }

  static save({ lead_id, html_content, headline = null, template_style = 'modern' }) {
    const existing = this.findByLeadId(lead_id);
    if (existing) {
      db.prepare(`
        UPDATE mockups 
        SET html_content = ?, headline = ?, template_style = ?, updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
      `).run(html_content, headline, template_style, lead_id);
    } else {
      db.prepare(`
        INSERT INTO mockups (lead_id, html_content, headline, template_style)
        VALUES (?, ?, ?, ?)
      `).run(lead_id, html_content, headline, template_style);
    }
    return this.findByLeadId(lead_id);
  }

  static deleteByLeadId(leadId) {
    return db.prepare('DELETE FROM mockups WHERE lead_id = ?').run(leadId);
  }
}

module.exports = Mockup;
