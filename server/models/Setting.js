const db = require('../db/database');

/**
 * Setting Model: Encapsulates application and SMTP configurations.
 */
class Setting {
  static getAll() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return settings;
  }

  static get(key, defaultValue = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  static set(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
    return this.get(key);
  }

  static setMany(obj) {
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction((entries) => {
      for (const [key, val] of Object.entries(entries)) {
        if (key === 'smtp_pass' && val === '••••••••') continue;
        updateStmt.run(key, String(val));
      }
    });
    transaction(obj);
    return this.getAll();
  }
}

module.exports = Setting;
