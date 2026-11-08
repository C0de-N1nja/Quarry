const db = require('../db/database');
const { isSocialOrAggregator, extractSocialUrls } = require('../services/social-domains');
const phoneService = require('../services/phone-service');

/**
 * Lead Model: Encapsulates database queries and persistence for prospective clients.
 */
class Lead {
  static findAll({ status, search, category, tier, batchMode, contactChannel, includeTest = false, limit = 100, offset = 0 } = {}) {
    let query = `
      SELECT 
        l.*,
        c.email,
        c.email_type,
        c.contact_name,
        c.contact_title,
        c.is_mx_valid,
        c.holehe_results,
        c.whatsapp,
        c.avatar_url,
        c.gravatar_data
      FROM leads l
      LEFT JOIN contacts c ON l.id = c.lead_id
      WHERE 1=1
    `;
    const params = [];

    if (!includeTest) {
      query += ' AND (l.is_test = 0 OR l.is_test IS NULL)';
      if (status !== 'archived') { query += " AND (l.status IS NULL OR l.status != 'archived')"; }
    }

    if (status === 'no_website') {
      query += " AND ((l.has_no_website = 1 OR l.website IS NULL OR l.website = '') AND (l.website IS NULL OR l.website = '' OR lower(l.website) LIKE '%facebook.com%' OR lower(l.website) LIKE '%instagram.com%' OR lower(l.website) LIKE '%linkedin.com%' OR lower(l.website) LIKE '%linktr.ee%'))";
    } else if (status && status !== 'all') {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (contactChannel === 'has_email') {
      query += " AND (c.email IS NOT NULL AND c.email != '')";
    } else if (contactChannel === 'has_whatsapp') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NOT NULL AND c.whatsapp != '')";
    } else if (contactChannel === 'has_social') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND ((l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))";
    } else if (contactChannel === 'social_all') {
      query += " AND (c.email IS NULL OR c.email = '') AND ((c.whatsapp IS NOT NULL AND c.whatsapp != '') OR (l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))";
    } else if (contactChannel === 'phone_only') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND (l.phone IS NOT NULL AND l.phone != '')";
    }

    if (tier === 'gold') {
      query += " AND ((l.has_no_website = 1 OR l.website IS NULL OR l.website = '') AND (l.website IS NULL OR l.website = '' OR lower(l.website) LIKE '%facebook.com%' OR lower(l.website) LIKE '%instagram.com%' OR lower(l.website) LIKE '%linkedin.com%' OR lower(l.website) LIKE '%linktr.ee%')) AND (l.rating >= 4.5 AND l.reviews_count >= 10 AND l.phone IS NOT NULL)";
    }

    if (category && category !== 'all') {
      query += ' AND lower(TRIM(l.category)) = lower(TRIM(?))';
      params.push(category);
    }

    if (search) {
      query += ' AND (l.business_name LIKE ? OR l.website LIKE ? OR l.city LIKE ? OR l.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (batchMode === 'today') {
      const todayLimit = (limit && limit !== 10000) ? parseInt(limit, 10) : 143;
      query += ' ORDER BY (CASE WHEN l.has_no_website = 1 THEN 0 ELSE 1 END), l.rating DESC, l.reviews_count DESC, l.id DESC LIMIT ? OFFSET ?';
      params.push(todayLimit, parseInt(offset, 10) || 0);
    } else {
      query += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10) || 10000, parseInt(offset, 10) || 0);
    }

    return db.prepare(query).all(...params);
  }

  static count({ status, search, category, tier, batchMode, contactChannel, includeTest = false } = {}) {
    let query = `
      SELECT COUNT(*) as total 
      FROM leads l 
      LEFT JOIN contacts c ON l.id = c.lead_id 
      WHERE 1=1
    `;
    const params = [];

    if (!includeTest) {
      query += ' AND (l.is_test = 0 OR l.is_test IS NULL)';
      if (status !== 'archived') { query += " AND (l.status IS NULL OR l.status != 'archived')"; }
    }

    if (status === 'no_website') {
      query += " AND ((l.has_no_website = 1 OR l.website IS NULL OR l.website = '') AND (l.website IS NULL OR l.website = '' OR lower(l.website) LIKE '%facebook.com%' OR lower(l.website) LIKE '%instagram.com%' OR lower(l.website) LIKE '%linkedin.com%' OR lower(l.website) LIKE '%linktr.ee%'))";
    } else if (status && status !== 'all') {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (contactChannel === 'has_email') {
      query += " AND (c.email IS NOT NULL AND c.email != '')";
    } else if (contactChannel === 'has_whatsapp') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NOT NULL AND c.whatsapp != '')";
    } else if (contactChannel === 'has_social') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND ((l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))";
    } else if (contactChannel === 'social_all') {
      query += " AND (c.email IS NULL OR c.email = '') AND ((c.whatsapp IS NOT NULL AND c.whatsapp != '') OR (l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))";
    } else if (contactChannel === 'phone_only') {
      query += " AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND (l.phone IS NOT NULL AND l.phone != '')";
    }

    if (tier === 'gold') {
      query += " AND ((l.has_no_website = 1 OR l.website IS NULL OR l.website = '') AND (l.website IS NULL OR l.website = '' OR lower(l.website) LIKE '%facebook.com%' OR lower(l.website) LIKE '%instagram.com%' OR lower(l.website) LIKE '%linkedin.com%' OR lower(l.website) LIKE '%linktr.ee%')) AND (l.rating >= 4.5 AND l.reviews_count >= 10 AND l.phone IS NOT NULL)";
    }

    if (category && category !== 'all') {
      query += ' AND lower(TRIM(l.category)) = lower(TRIM(?))';
      params.push(category);
    }

    if (search) {
      query += ' AND (l.business_name LIKE ? OR l.website LIKE ? OR l.city LIKE ? OR l.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const res = db.prepare(query).get(...params);
    const total = res ? res.total : 0;
    return batchMode === 'today' ? Math.min(143, total) : total;
  }

  static findById(id) {
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  }

  static findByWebsiteOrName(website, business_name) {
    return db.prepare(`
      SELECT id FROM leads 
      WHERE (website IS NOT NULL AND website != '' AND website = ?)
         OR business_name = ?
    `).get(website, business_name);
  }

  static create({
    business_name,
    website = null,
    maps_link = null,
    phone = null,
    address = null,
    city = null,
    category = 'General',
    rating = 0,
    reviews_count = 0,
    source = 'manual',
    status = 'discovered',
    place_id = null,
    google_category = null,
    search_keyword = null,
    business_status = 'OPERATIONAL',
    country = null,
    timezone = null,
    facebook_url = null,
    instagram_url = null,
    phone_e164 = null,
    phone_type = 'unknown',
    carrier = null,
    latitude = null,
    longitude = null,
    lat = null,
    lng = null,
    is_test = 0
  }) {
    let fb = facebook_url;
    let ig = instagram_url;
    if (website) {
      const extracted = extractSocialUrls(website);
      if (!fb && extracted.facebook_url) fb = extracted.facebook_url;
      if (!ig && extracted.instagram_url) ig = extracted.instagram_url;
    }
    const finalLat = latitude !== undefined && latitude !== null ? latitude : (lat !== undefined && lat !== null ? lat : null);
    const finalLng = longitude !== undefined && longitude !== null ? longitude : (lng !== undefined && lng !== null ? lng : null);
    const e164 = phone_e164 || (phone ? phoneService.normalizeNumber(phone, country || 'US') : null);
    const stmt = db.prepare(`
      INSERT INTO leads (
        business_name, website, maps_link, phone, address, city, category,
        rating, reviews_count, source, status,
        place_id, google_category, search_keyword, business_status,
        country, timezone, facebook_url, instagram_url,
        phone_e164, phone_type, carrier, latitude, longitude, lat, lng, is_test
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      business_name, website, maps_link, phone, address, city, category,
      rating, reviews_count, source, status,
      place_id, google_category, search_keyword, business_status,
      country, timezone, fb, ig,
      e164, phone_type, carrier, finalLat, finalLng, finalLat, finalLng, is_test ? 1 : 0
    );
    return this.findById(info.lastInsertRowid);
  }

  static scoreLead(l) {
    if (!l) return 0;
    let s = 0;
    if (l.place_id) s += 4;
    if (l.phone && String(l.phone).trim().length > 5) s += 3;
    if (l.address && String(l.address).trim().length > 5) s += 3;
    if (l.rating && Number(l.rating) > 0) s += 2;
    if (l.reviews_count && Number(l.reviews_count) > 0) s += 2;
    if (l.maps_link && String(l.maps_link).trim().length > 5) s += 2;
    if (l.has_no_website === 1) s += 2;
    if (l.website && String(l.website).trim().length > 5) s += 1;
    return s;
  }

  static insertBatch(leads) {
    const insertStmt = db.prepare(`
      INSERT INTO leads (
        business_name, website, maps_link, phone, address, city, category,
        rating, reviews_count, source, status, has_no_website, website_status, showcase_niche,
        place_id, google_category, search_keyword, business_status,
        country, timezone, facebook_url, instagram_url,
        phone_e164, phone_type, carrier, latitude, longitude, lat, lng, is_test
      )
      VALUES (
        @business_name, @website, @maps_link, @phone, @address, @city, @category,
        @rating, @reviews_count, @source, @status, @has_no_website, @website_status, @showcase_niche,
        @place_id, @google_category, @search_keyword, @business_status,
        @country, @timezone, @facebook_url, @instagram_url,
        @phone_e164, @phone_type, @carrier, @latitude, @longitude, @lat, @lng, @is_test
      )
    `);

    let insertedCount = 0;
    let upgradedCount = 0;
    const insertedLeads = [];

    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item || !item.business_name) continue;

        // Step 4: Normalize phone to E.164 using lead's country (libphonenumber-js)
        if (!item.phone_e164 && item.phone) {
          item.phone_e164 = phoneService.normalizeNumber(item.phone, item.country || 'US');
        }

        // Step 2: Strict Deduplication Hierarchy
        // 1. place_id first
        let existing = null;
        if (item.place_id && String(item.place_id).trim().length > 0) {
          existing = db.prepare('SELECT * FROM leads WHERE place_id = ?').get(String(item.place_id).trim());
        }

        // 2. phone_e164 second (or normalized phone digits >= 7)
        if (!existing && item.phone_e164 && String(item.phone_e164).trim().length > 0) {
          existing = db.prepare('SELECT * FROM leads WHERE phone_e164 = ?').get(String(item.phone_e164).trim());
        }
        if (!existing && item.phone) {
          const cleanPhone = String(item.phone).replace(/\D/g, '');
          if (cleanPhone.length >= 7) {
            existing = db.prepare(`
              SELECT * FROM leads 
              WHERE phone IS NOT NULL 
                AND replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
            `).get(`%${cleanPhone.slice(-10)}`);
          }
        }

        // 3. name + city third (both required and non-empty!)
        if (!existing && item.business_name && item.city && String(item.city).trim().length > 0) {
          existing = db.prepare(`
            SELECT * FROM leads 
            WHERE lower(TRIM(business_name)) = lower(TRIM(?))
              AND lower(TRIM(city)) = lower(TRIM(?))
          `).get(item.business_name, item.city);
        }

        // 4. Fallback: exact maps_link or exact non-social website
        if (!existing && item.maps_link && String(item.maps_link).trim().length > 5) {
          existing = db.prepare('SELECT * FROM leads WHERE maps_link = ?').get(String(item.maps_link).trim());
        }
        if (!existing && item.website && String(item.website).trim().length > 5) {
          if (!isSocialOrAggregator(item.website)) {
            existing = db.prepare('SELECT * FROM leads WHERE website = ?').get(item.website.trim());
          }
        }

        // Dedicated social URLs extraction
        let fb = item.facebook_url || null;
        let ig = item.instagram_url || null;
        if (item.website) {
          const extracted = extractSocialUrls(item.website);
          if (!fb && extracted.facebook_url) fb = extracted.facebook_url;
          if (!ig && extracted.instagram_url) ig = extracted.instagram_url;
        }
        if (item.social_profiles) {
          try {
            const sp = typeof item.social_profiles === 'string' ? JSON.parse(item.social_profiles) : item.social_profiles;
            if (!fb && sp.facebook) fb = sp.facebook;
            if (!ig && sp.instagram) ig = sp.instagram;
          } catch (e) {}
        }

        if (!existing) {
          const isSocialOrNone = !item.website || isSocialOrAggregator(item.website);

          const payload = {
            business_name: item.business_name,
            website: item.website || null,
            maps_link: item.maps_link || null,
            phone: item.phone || null,
            address: item.address || null,
            city: item.city || null,
            category: item.category || 'General',
            rating: item.rating !== undefined ? item.rating : 0,
            reviews_count: item.reviews_count !== undefined ? item.reviews_count : 0,
            source: item.source || 'manual',
            status: item.status || 'discovered',
            has_no_website: isSocialOrNone ? (item.has_no_website !== undefined ? item.has_no_website : 1) : 0,
            website_status: !isSocialOrNone 
              ? (item.website_status && item.website_status !== 'no_website' ? item.website_status : 'active')
              : (item.website_status || (!item.website ? 'no_website' : 'social_only')),
            showcase_niche: isSocialOrNone ? (item.showcase_niche || null) : null,
            place_id: item.place_id || null,
            google_category: item.google_category || null,
            search_keyword: item.search_keyword || null,
            business_status: item.business_status || 'OPERATIONAL',
            country: item.country || null,
            timezone: item.timezone || null,
            facebook_url: fb,
            instagram_url: ig,
            phone_e164: item.phone_e164 || null,
            phone_type: item.phone_type || 'unknown',
            carrier: item.carrier || null,
            latitude: item.latitude !== undefined && item.latitude !== null ? item.latitude : (item.lat !== undefined && item.lat !== null ? item.lat : null),
            longitude: item.longitude !== undefined && item.longitude !== null ? item.longitude : (item.lng !== undefined && item.lng !== null ? item.lng : null),
            lat: item.lat !== undefined && item.lat !== null ? item.lat : (item.latitude !== undefined && item.latitude !== null ? item.latitude : null),
            lng: item.lng !== undefined && item.lng !== null ? item.lng : (item.longitude !== undefined && item.longitude !== null ? item.longitude : null),
            is_test: item.is_test ? 1 : 0
          };
          const info = insertStmt.run(payload);
          insertedCount++;
          insertedLeads.push({ id: info.lastInsertRowid, ...payload });
        } else {
          // Duplicate detected across multiple scrapers: Smart Authenticity Merge!
          const incomingScore = Lead.scoreLead(item);
          const existingScore = Lead.scoreLead(existing);

          const mergedWeb = item.website || existing.website;
          const mergedIsSocial = !mergedWeb || isSocialOrAggregator(mergedWeb);

          const mergedFields = {
            business_name: (item.business_name && item.business_name.length > (existing.business_name || '').length) ? item.business_name : existing.business_name,
            website: mergedWeb || null,
            phone: item.phone || existing.phone,
            address: item.address || existing.address,
            city: item.city || existing.city,
            category: (item.category && item.category !== 'General') ? item.category : existing.category,
            rating: (item.rating && item.rating > (existing.rating || 0)) ? item.rating : existing.rating,
            reviews_count: (item.reviews_count && item.reviews_count > (existing.reviews_count || 0)) ? item.reviews_count : existing.reviews_count,
            maps_link: item.maps_link || existing.maps_link,
            has_no_website: mergedIsSocial ? (item.has_no_website !== undefined ? item.has_no_website : existing.has_no_website) : 0,
            website_status: !mergedIsSocial
              ? (item.website_status && item.website_status !== 'no_website' ? item.website_status : (existing.website_status && existing.website_status !== 'no_website' ? existing.website_status : 'active'))
              : (item.website_status || existing.website_status || 'no_website'),
            showcase_niche: mergedIsSocial ? (item.showcase_niche || existing.showcase_niche) : null,
            place_id: item.place_id || existing.place_id || null,
            google_category: item.google_category || existing.google_category || null,
            search_keyword: item.search_keyword || existing.search_keyword || null,
            business_status: item.business_status || existing.business_status || 'OPERATIONAL',
            country: item.country || existing.country || null,
            timezone: item.timezone || existing.timezone || null,
            facebook_url: fb || existing.facebook_url || null,
            instagram_url: ig || existing.instagram_url || null,
            phone_e164: item.phone_e164 || existing.phone_e164 || null,
            phone_type: (item.phone_type && item.phone_type !== 'unknown') ? item.phone_type : (existing.phone_type || 'unknown'),
            carrier: item.carrier || existing.carrier || null,
            latitude: item.latitude || item.lat || existing.latitude || existing.lat || null,
            longitude: item.longitude || item.lng || existing.longitude || existing.lng || null,
            lat: item.lat || item.latitude || existing.lat || existing.latitude || null,
            lng: item.lng || item.longitude || existing.lng || existing.longitude || null
          };

          // If duplicate version has more authentic details or backfills missing fields, upgrade!
          if (incomingScore > existingScore || (!existing.phone && item.phone) || (!existing.address && item.address) || (!existing.place_id && item.place_id)) {
            Lead.update(existing.id, mergedFields);
            upgradedCount++;
          }
        }
      }
    });

    transaction(leads);
    return { count: insertedCount, upgraded: upgradedCount, leads: insertedLeads };
  }

  static update(id, fields = {}) {
    let {
      business_name, website, maps_link, phone, address, city, category, status,
      rating, reviews_count,
      has_no_website, no_website_verified, website_status, showcase_niche,
      phone_type, carrier, phone_e164, deal_value, sequence_step,
      place_id, google_category, search_keyword, business_status,
      country, timezone, facebook_url, instagram_url,
      latitude, longitude, lat, lng,
      social_profiles, osint_evidence
    } = fields;

    // Check if lead currently has or is receiving an authentic standalone website
    let currentWeb = website;
    if (currentWeb === undefined) {
      try {
        const existingRow = db.prepare('SELECT website FROM leads WHERE id = ?').get(id);
        currentWeb = existingRow ? existingRow.website : null;
      } catch (e) {}
    }

    const isSocialOrNone = !currentWeb || isSocialOrAggregator(currentWeb);

    if (!isSocialOrNone) {
      if (has_no_website === 1) has_no_website = 0;
      if (no_website_verified === 1 && website_status === 'no_website') no_website_verified = 0;
      if (website_status === 'no_website') website_status = 'active';
    }

    let fb = facebook_url;
    let ig = instagram_url;
    if (website) {
      const extracted = extractSocialUrls(website);
      if (!fb && extracted.facebook_url) fb = extracted.facebook_url;
      if (!ig && extracted.instagram_url) ig = extracted.instagram_url;
    }

    const finalLat = latitude !== undefined && latitude !== null ? latitude : (lat !== undefined && lat !== null ? lat : null);
    const finalLng = longitude !== undefined && longitude !== null ? longitude : (lng !== undefined && lng !== null ? lng : null);

    db.prepare(`
      UPDATE leads 
      SET business_name = COALESCE(?, business_name),
          website = COALESCE(?, website),
          maps_link = COALESCE(?, maps_link),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          category = COALESCE(?, category),
          status = COALESCE(?, status),
          rating = COALESCE(?, rating),
          reviews_count = COALESCE(?, reviews_count),
          has_no_website = COALESCE(?, has_no_website),
          no_website_verified = COALESCE(?, no_website_verified),
          website_status = COALESCE(?, website_status),
          showcase_niche = COALESCE(?, showcase_niche),
          phone_type = COALESCE(?, phone_type),
          carrier = COALESCE(?, carrier),
          phone_e164 = COALESCE(?, phone_e164),
          deal_value = COALESCE(?, deal_value),
          sequence_step = COALESCE(?, sequence_step),
          place_id = COALESCE(?, place_id),
          google_category = COALESCE(?, google_category),
          search_keyword = COALESCE(?, search_keyword),
          business_status = COALESCE(?, business_status),
          country = COALESCE(?, country),
          timezone = COALESCE(?, timezone),
          facebook_url = COALESCE(?, facebook_url),
          instagram_url = COALESCE(?, instagram_url),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          social_profiles = COALESCE(?, social_profiles),
          osint_evidence = COALESCE(?, osint_evidence),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      business_name, website, maps_link, phone, address, city, category, status,
      rating, reviews_count,
      has_no_website, no_website_verified, website_status, showcase_niche,
      phone_type, carrier, phone_e164, deal_value, sequence_step,
      place_id, google_category, search_keyword, business_status,
      country, timezone, fb, ig,
      finalLat, finalLng, finalLat, finalLng,
      social_profiles ? (typeof social_profiles==='string'?social_profiles:JSON.stringify(social_profiles)):null,
      osint_evidence ? (typeof osint_evidence==='string'?osint_evidence:JSON.stringify(osint_evidence)):null,
      id
    );

    return this.findById(id);
  }

  static updateStatus(id, status) {
    db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    return this.findById(id);
  }

  static updateStage(id, status, dealValue = null) {
    if (dealValue !== null) {
      db.prepare('UPDATE leads SET status = ?, deal_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, dealValue, id);
    } else {
      db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    }
    return this.findById(id);
  }

  static updateSequence(id, step, sentAt = null, nextDate = null) {
    db.prepare(`
      UPDATE leads 
      SET sequence_step = ?,
          last_sequence_sent_at = COALESCE(?, last_sequence_sent_at),
          next_followup_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(step, sentAt, nextDate, id);
    return this.findById(id);
  }

  static getFollowupsDue() {
    return db.prepare(`
      SELECT l.*, c.email, c.contact_name
      FROM leads l
      LEFT JOIN contacts c ON l.id = c.lead_id
      WHERE (l.is_test = 0 OR l.is_test IS NULL)
        AND l.status IN ('pitched', 'sent')
        AND l.sequence_step < 4
        AND (l.next_followup_date IS NOT NULL AND datetime(l.next_followup_date) <= datetime('now'))
      ORDER BY l.next_followup_date ASC
    `).all();
  }

  static optOut(id) {
    db.prepare("UPDATE leads SET opted_out = 1, status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return this.findById(id);
  }

  static updatePhoneIntel(id, phoneE164, phoneType, carrier) {
    db.prepare(`
      UPDATE leads 
      SET phone_e164 = COALESCE(?, phone_e164),
          phone_type = COALESCE(?, phone_type),
          carrier = COALESCE(?, carrier),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(phoneE164, phoneType, carrier, id);
    return this.findById(id);
  }

  static delete(id) {
    return db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  }

  static purgeLeadsWithWebsites() {
    // Select all leads that have an authentic website (not missing, not social-only)
    const toArchive = db.prepare(`
      SELECT id FROM leads 
      WHERE website IS NOT NULL 
        AND website != '' 
        AND lower(website) NOT LIKE '%facebook.com%' 
        AND lower(website) NOT LIKE '%instagram.com%' 
        AND lower(website) NOT LIKE '%linkedin.com%' 
        AND lower(website) NOT LIKE '%twitter.com%' 
        AND lower(website) NOT LIKE '%x.com%' 
        AND lower(website) NOT LIKE '%linktr.ee%'
        AND (website_status IS NULL OR website_status != 'social_only')
        AND (status != 'archived' OR status IS NULL)
    `).all();

    const archiveTransaction = db.transaction((rows) => {
      const updateStmt = db.prepare(`
        UPDATE leads 
        SET status = 'archived',
            archived_reason = 'has_website',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      for (const r of rows) {
        updateStmt.run(r.id);
      }
    });

    archiveTransaction(toArchive);

    const remainingCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (status != 'archived' OR status IS NULL) AND (has_no_website = 1 OR website IS NULL OR website = '') AND (website IS NULL OR website = '' OR lower(website) LIKE '%facebook.com%' OR lower(website) LIKE '%instagram.com%' OR lower(website) LIKE '%linkedin.com%' OR lower(website) LIKE '%linktr.ee%')").get().count;

    return {
      purgedCount: toArchive.length,
      remainingCount
    };
  }

  static purgeAll() {
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM contacts').run();
      db.prepare('DELETE FROM mockups').run();
      db.prepare('DELETE FROM outbox').run();
      db.prepare('DELETE FROM leads').run();
      try {
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('leads', 'contacts', 'mockups', 'outbox')").run();
      } catch (e) {}
    });
    deleteTransaction();
    return { success: true };
  }

  static getPipelineStats() {
    const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE is_test IS NOT 1 AND status IS NOT 'archived'").get().count;
    const discovered = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'discovered' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const enriched = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'enriched' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const pitched = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'pitched' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const sent = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'sent' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const replied = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'replied' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const won = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'won' AND (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')").get().count;
    const decisionMakers = db.prepare("SELECT COUNT(*) as count FROM contacts c JOIN leads l ON c.lead_id = l.id WHERE c.email_type = 'decision_maker' AND (l.is_test = 0 OR l.is_test IS NULL)").get().count;
    const noWebsite = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND (has_no_website = 1 OR website IS NULL OR website = '') AND (website IS NULL OR website = '' OR lower(website) LIKE '%facebook.com%' OR lower(website) LIKE '%instagram.com%' OR lower(website) LIKE '%linkedin.com%' OR lower(website) LIKE '%linktr.ee%')").get().count;
    const withWebsites = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND website IS NOT NULL AND website != '' AND lower(website) NOT LIKE '%facebook.com%' AND lower(website) NOT LIKE '%instagram.com%' AND lower(website) NOT LIKE '%linkedin.com%' AND lower(website) NOT LIKE '%linktr.ee%'").get().count;
    
    // Website verification status breakdown
    const verifiedNoWebsite = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND website_status = 'no_website' AND (website IS NULL OR website = '' OR lower(website) LIKE '%facebook.com%' OR lower(website) LIKE '%instagram.com%' OR lower(website) LIKE '%linkedin.com%' OR lower(website) LIKE '%linktr.ee%')").get().count;
    const verifiedHasWebsite = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND (website_status IN ('has_website', 'active') OR (website IS NOT NULL AND website != '' AND lower(website) NOT LIKE '%facebook.com%' AND lower(website) NOT LIKE '%instagram.com%' AND lower(website) NOT LIKE '%linkedin.com%' AND lower(website) NOT LIKE '%linktr.ee%'))").get().count;
    const uncertainCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND website_status = 'uncertain'").get().count;

    // Contact Channel distribution (email vs whatsapp vs social media vs phone)
    const withEmail = db.prepare("SELECT COUNT(*) as count FROM leads l JOIN contacts c ON l.id = c.lead_id WHERE (l.is_test = 0 OR l.is_test IS NULL) AND c.email IS NOT NULL AND c.email != ''").get().count;
    const withWhatsApp = db.prepare("SELECT COUNT(*) as count FROM leads l JOIN contacts c ON l.id = c.lead_id WHERE (l.is_test = 0 OR l.is_test IS NULL) AND (c.email IS NULL OR c.email = '') AND c.whatsapp IS NOT NULL AND c.whatsapp != ''").get().count;
    const withSocial = db.prepare("SELECT COUNT(*) as count FROM leads l LEFT JOIN contacts c ON l.id = c.lead_id WHERE (l.is_test = 0 OR l.is_test IS NULL) AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND ((l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))").get().count;
    const withPhoneOnly = db.prepare("SELECT COUNT(*) as count FROM leads l LEFT JOIN contacts c ON l.id = c.lead_id WHERE (l.is_test = 0 OR l.is_test IS NULL) AND (c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = '') AND l.phone IS NOT NULL AND l.phone != ''").get().count;
    const socialInsteadOfEmail = db.prepare("SELECT COUNT(*) as count FROM leads l LEFT JOIN contacts c ON l.id = c.lead_id WHERE (l.is_test = 0 OR l.is_test IS NULL) AND (c.email IS NULL OR c.email = '') AND ((c.whatsapp IS NOT NULL AND c.whatsapp != '') OR (l.social_profiles IS NOT NULL AND l.social_profiles != '' AND l.social_profiles != '{}') OR (l.facebook_url IS NOT NULL AND l.facebook_url != '') OR (l.instagram_url IS NOT NULL AND l.instagram_url != '') OR (l.website LIKE '%facebook.com%' OR l.website LIKE '%instagram.com%' OR l.website LIKE '%linkedin.com%'))").get().count;

    const pipelineVal = db.prepare("SELECT COALESCE(SUM(deal_value), 0) as total FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND status NOT IN ('archived', 'lost')").get().total;
    const wonVal = db.prepare("SELECT COALESCE(SUM(deal_value), 0) as total FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND status = 'won'").get().total;
    const activeVal = db.prepare("SELECT COALESCE(SUM(deal_value), 0) as total FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND status IN ('pitched', 'sent', 'replied')").get().total;

    const goldCount = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived')
        AND (has_no_website = 1 OR website IS NULL OR website = '') 
        AND rating >= 4.5 AND reviews_count >= 10 AND phone IS NOT NULL
    `).get().count;

    // Dynamic collections autogenerated from distinct categories in database
    const dynamicCollections = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM leads 
      WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND category IS NOT NULL AND TRIM(category) != '' 
      GROUP BY category 
      ORDER BY count DESC, category ASC
    `).all();

    const collections = dynamicCollections.map(c => ({
      name: c.category,
      count: c.count
    }));

    const roofingCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND lower(category) LIKE '%roof%'").get().count;
    const plumbingCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND (lower(category) LIKE '%plumb%' OR lower(category) LIKE '%hvac%' OR lower(category) LIKE '%air%')").get().count;
    const restaurantCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND (lower(category) LIKE '%rest%' OR lower(category) LIKE '%cafe%')").get().count;
    const otherCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (status IS NULL OR status != 'archived') AND lower(category) NOT LIKE '%roof%' AND lower(category) NOT LIKE '%plumb%' AND lower(category) NOT LIKE '%hvac%' AND lower(category) NOT LIKE '%rest%'").get().count;

    return {
      totalLeads,
      discovered,
      enriched,
      pitched,
      sent,
      replied,
      won,
      noWebsite,
      withWebsites,
      verifiedNoWebsite,
      verifiedHasWebsite,
      uncertainCount,
      withEmail,
      withWhatsApp,
      withSocial,
      withPhoneOnly,
      socialInsteadOfEmail,
      decisionMakers,
      goldLeads: goldCount,
      collections,
      niches: {
        roofing: roofingCount,
        plumbing: plumbingCount,
        restaurant: restaurantCount,
        other: otherCount
      },
      totalPipelineValue: pipelineVal,
      wonRevenue: wonVal,
      activeNegotiationValue: activeVal
    };
  }

  /**
   * Reset OSINT data, contacts, and verification status for all leads or a specific category
   */
  static resetOsint({ category } = {}) {
    if (category && category !== 'all') {
      const leads = db.prepare('SELECT id FROM leads WHERE lower(TRIM(category)) = lower(TRIM(?))').all(category);
      const leadIds = leads.map(l => l.id);
      if (leadIds.length > 0) {
        const placeholders = leadIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM contacts WHERE lead_id IN (${placeholders})`).run(...leadIds);
        db.prepare(`
          UPDATE leads 
          SET status = 'discovered',
              website_status = 'unknown',
              no_website_verified = 0,
              social_profiles = NULL,
              osint_evidence = NULL
          WHERE id IN (${placeholders})
        `).run(...leadIds);
        try {
          const cacheKeys = leadIds.map(id => `lead_${id}`);
          const cachePlaceholders = cacheKeys.map(() => '?').join(',');
          db.prepare(`DELETE FROM osint_cache WHERE cache_key IN (${cachePlaceholders})`).run(...cacheKeys);
        } catch (e) {}
      }
      return { count: leadIds.length };
    } else {
      db.prepare('DELETE FROM contacts').run();
      try {
        db.prepare('DELETE FROM osint_cache').run();
      } catch (e) {}
      const info = db.prepare(`
        UPDATE leads 
        SET status = 'discovered',
            website_status = 'unknown',
            no_website_verified = 0,
            social_profiles = NULL,
            osint_evidence = NULL
      `).run();
      return { count: info.changes };
    }
  }
}

module.exports = Lead;
