const db = require('../db/database');

/**
 * Contact Model: Encapsulates database persistence and queries for discovered decision makers.
 */
class Contact {
  static findByLeadId(leadId) {
    return db.prepare('SELECT * FROM contacts WHERE lead_id = ?').get(leadId);
  }

  static upsert(data) {
    const {
      lead_id,
      email,
      email_type = 'generic',
      contact_name,
      contact_title,
      phone,
      whatsapp,
      social_links,
      holehe_results,
      avatar_url,
      gravatar_data,
      is_mx_valid = 0
    } = data;

    const existing = this.findByLeadId(lead_id);
    const socialLinksJson = typeof social_links === 'string' ? social_links : JSON.stringify(social_links || {});
    const holeheJson = typeof holehe_results === 'string' ? holehe_results : JSON.stringify(holehe_results || []);
    const gravatarJson = gravatar_data ? (typeof gravatar_data === 'string' ? gravatar_data : JSON.stringify(gravatar_data)) : null;
    let cleanEmail = email;
    if (cleanEmail && cleanEmail.trim()) {
      const collision = db.prepare(`
        SELECT c.lead_id, l.business_name
        FROM contacts c
        JOIN leads l ON c.lead_id = l.id
        WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(?)) AND c.lead_id != ?
        LIMIT 1
      `).get(cleanEmail, lead_id);
      
      if (collision) {
        // Prevent multi-client cross-contamination: do not assign an existing client's email to a new client
        cleanEmail = existing ? existing.email : null;
      }
    }

    if (existing) {
      db.prepare(`
        UPDATE contacts 
        SET email = ?, email_type = ?, contact_name = ?, contact_title = ?,
            phone = ?, whatsapp = ?, social_links = ?, holehe_results = ?,
            avatar_url = COALESCE(?, avatar_url), gravatar_data = COALESCE(?, gravatar_data),
            is_mx_valid = ?, verified_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
      `).run(
        cleanEmail,
        email_type,
        contact_name,
        contact_title,
        phone,
        whatsapp || null,
        socialLinksJson,
        holeheJson,
        avatar_url || null,
        gravatarJson,
        is_mx_valid,
        lead_id
      );
    } else {
      db.prepare(`
        INSERT INTO contacts (
          lead_id, email, email_type, contact_name, contact_title,
          phone, whatsapp, social_links, holehe_results, avatar_url, gravatar_data, is_mx_valid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead_id,
        cleanEmail,
        email_type,
        contact_name,
        contact_title,
        phone,
        whatsapp || null,
        socialLinksJson,
        holeheJson,
        avatar_url || null,
        gravatarJson,
        is_mx_valid
      );
    }

    return this.findByLeadId(lead_id);
  }

  static deleteByLeadId(leadId) {
    return db.prepare('DELETE FROM contacts WHERE lead_id = ?').run(leadId);
  }
}

module.exports = Contact;
