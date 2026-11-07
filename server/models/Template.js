const db = require('../db/database');

/**
 * Template Model: Encapsulates database persistence and queries for cold outreach templates.
 */
class Template {
  static findAll() {
    return db.prepare('SELECT * FROM templates ORDER BY is_default DESC, id ASC').all();
  }

  static findById(id) {
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
  }

  static findByAngle(angle) {
    return db.prepare('SELECT * FROM templates WHERE angle = ?').get(angle);
  }

  static save({ name, angle, subject_template, body_template, is_default = 0 }) {
    const existing = this.findByAngle(angle);
    if (existing) {
      db.prepare(`
        UPDATE templates 
        SET name = ?, subject_template = ?, body_template = ?, is_default = ?
        WHERE angle = ?
      `).run(name, subject_template, body_template, is_default, angle);
      return this.findByAngle(angle);
    } else {
      const res = db.prepare(`
        INSERT INTO templates (name, angle, subject_template, body_template, is_default)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, angle, subject_template, body_template, is_default);
      return this.findById(res.lastInsertRowid);
    }
  }

  static delete(id) {
    return db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }
}

module.exports = Template;
