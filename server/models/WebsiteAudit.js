const db = require('../db/database');

/**
 * WebsiteAudit Model: Encapsulates database storage and queries for client website audits.
 */
class WebsiteAudit {
  static findByLeadId(leadId) {
    const row = db.prepare('SELECT * FROM website_audits WHERE lead_id = ?').get(leadId);
    if (!row) return null;
    return {
      ...row,
      flaws_summary: row.flaws_summary ? JSON.parse(row.flaws_summary) : [],
      audit_data: row.audit_data ? JSON.parse(row.audit_data) : {}
    };
  }

  static save(data) {
    const {
      lead_id,
      url,
      performance_score = 0,
      accessibility_score = 0,
      seo_score = 0,
      security_score = 0,
      overall_score = 0,
      load_time_ms = 0,
      violations_count = 0,
      flaws_summary = [],
      audit_data = {}
    } = data;

    const existing = db.prepare('SELECT id FROM website_audits WHERE lead_id = ?').get(lead_id);
    const flawsJson = typeof flaws_summary === 'string' ? flaws_summary : JSON.stringify(flaws_summary || []);
    const auditJson = typeof audit_data === 'string' ? audit_data : JSON.stringify(audit_data || {});

    if (existing) {
      db.prepare(`
        UPDATE website_audits
        SET url = ?, performance_score = ?, accessibility_score = ?,
            seo_score = ?, security_score = ?, overall_score = ?,
            load_time_ms = ?, violations_count = ?, flaws_summary = ?,
            audit_data = ?, audited_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
      `).run(
        url,
        performance_score,
        accessibility_score,
        seo_score,
        security_score,
        overall_score,
        load_time_ms,
        violations_count,
        flawsJson,
        auditJson,
        lead_id
      );
    } else {
      db.prepare(`
        INSERT INTO website_audits (
          lead_id, url, performance_score, accessibility_score,
          seo_score, security_score, overall_score, load_time_ms,
          violations_count, flaws_summary, audit_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead_id,
        url,
        performance_score,
        accessibility_score,
        seo_score,
        security_score,
        overall_score,
        load_time_ms,
        violations_count,
        flawsJson,
        auditJson
      );
    }

    // Also update lead table for fast indexing
    try {
      db.prepare(`
        UPDATE leads 
        SET audit_status = 'audited',
            audit_summary = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          overall_score,
          performance_score,
          accessibility_score,
          seo_score,
          violations_count,
          load_time_ms
        }),
        lead_id
      );
    } catch (_) {}

    return this.findByLeadId(lead_id);
  }

  static deleteByLeadId(leadId) {
    return db.prepare('DELETE FROM website_audits WHERE lead_id = ?').run(leadId);
  }
}

module.exports = WebsiteAudit;
