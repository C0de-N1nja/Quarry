const ExcelJS = require('exceljs');
const db = require('../db/database');
const showcaseService = require('./showcase-service');

/**
 * ExportService: Generates structured, professional Excel (.xlsx) and CSV spreadsheets
 * detailing all harvested leads, deep OSINT contact findings, phone classifications,
 * laptop showcase links, and real-time cold outreach statuses.
 */
class ExportService {
  /**
   * Fetch leads joined with latest OSINT contacts and outbox status
   */
  getLeadsForExport(filter = 'all') {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (filter === 'no_website') {
      whereClause += " AND (l.has_no_website = 1 OR l.website IS NULL OR l.website = '')";
    } else if (filter && filter !== 'all') {
      whereClause += ' AND l.status = ?';
      params.push(filter);
    }

    const query = `
      SELECT 
        l.id,
        l.business_name,
        l.category,
        l.city,
        l.address,
        l.phone,
        l.phone_type,
        l.carrier,
        l.website,
        l.has_no_website,
        l.website_status,
        l.showcase_niche,
        l.rating,
        l.reviews_count,
        l.status,
        l.deal_value,
        l.sequence_step,
        l.last_sequence_sent_at,
        l.created_at,
        l.social_profiles,
        c.email as contact_email,
        c.whatsapp as contact_whatsapp,
        c.contact_name,
        c.contact_title,
        c.is_mx_valid,
        o.subject as outbox_subject,
        o.status as outbox_status,
        o.scheduled_at as outbox_scheduled_at,
        o.sent_at as outbox_sent_at
      FROM leads l
      LEFT JOIN (
        SELECT lead_id, email, whatsapp, contact_name, contact_title, is_mx_valid,
               ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY id DESC) as rn
        FROM contacts
      ) c ON c.lead_id = l.id AND c.rn = 1
      LEFT JOIN (
        SELECT lead_id, subject, status, scheduled_at, sent_at,
               ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY id DESC) as rn
        FROM outbox
      ) o ON o.lead_id = l.id AND o.rn = 1
      ${whereClause}
      ORDER BY l.id DESC
    `;

    return db.prepare(query).all(...params);
  }

  /**
   * Build configured ExcelJS workbook
   */
  async buildWorkbook(filter = 'all', baseUrl = 'http://localhost:5000') {
    const rows = this.getLeadsForExport(filter);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Client Hunter OS';
    workbook.created = new Date();

    const sheetName = filter === 'no_website' ? 'No-Website Leads' : 'All Leads';
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Define table columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Business Name', key: 'business_name', width: 34 },
      { header: 'Niche / Category', key: 'category', width: 20 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Address', key: 'address', width: 32 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Phone Line Type', key: 'phone_type', width: 22 },
      { header: 'Carrier', key: 'carrier', width: 18 },
      { header: 'Website Status', key: 'website_status', width: 18 },
      { header: 'Owner / Contact', key: 'contact_name', width: 22 },
      { header: 'Verified Email', key: 'contact_email', width: 30 },
      { header: 'WhatsApp Link', key: 'contact_whatsapp', width: 28 },
      { header: 'Social Profiles', key: 'social_profiles', width: 34 },
      { header: 'MX Valid', key: 'is_mx_valid', width: 14 },
      { header: 'Rating ★', key: 'rating', width: 10 },
      { header: 'Reviews', key: 'reviews_count', width: 12 },
      { header: 'Showcase Niche', key: 'showcase_niche', width: 18 },
      { header: 'Showcase Prototype Link', key: 'showcase_url', width: 36 },
      { header: 'Outreach Status', key: 'outreach_status', width: 16 },
      { header: 'Sequence Step', key: 'sequence_step', width: 14 },
      { header: 'Outbox Status', key: 'outbox_status', width: 16 },
      { header: 'Last Sent / Scheduled At', key: 'timestamp', width: 24 },
      { header: 'Email Pitch Subject', key: 'outbox_subject', width: 44 }
    ];

    // Style Header Row (Dark Slate with crisp white bold text)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    });

    // Populate data rows
    rows.forEach((row, index) => {
      const isNoWebsite = row.has_no_website === 1 || !row.website;
      const matchedNiche = row.showcase_niche || showcaseService.matchNiche(row.category, row.business_name);
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const showcaseUrl = `${cleanBaseUrl}/showcase/${matchedNiche}`;

      let phoneTypeFormatted = row.phone_type ? row.phone_type.toUpperCase() : 'UNKNOWN';
      if (phoneTypeFormatted.includes('MOBILE')) {
        phoneTypeFormatted = '📱 MOBILE (WhatsApp Ready)';
      } else if (phoneTypeFormatted.includes('LANDLINE')) {
        phoneTypeFormatted = '☎️ LANDLINE';
      }

      let mxFormatted = 'N/A';
      if (row.is_mx_valid === 1) mxFormatted = '✅ VALID MX';
      else if (row.is_mx_valid === 0) mxFormatted = '❌ INVALID';

      let websiteStatusFormatted = 'Official Domain';
      if (isNoWebsite) {
        if (row.website_status === 'social_only') websiteStatusFormatted = '🌐❌ Social Only';
        else if (row.website_status === 'dead_dns') websiteStatusFormatted = '🌐❌ Dead Domain';
        else websiteStatusFormatted = '🌐❌ NO WEBSITE';
      }

      const rowData = {
        id: row.id,
        business_name: row.business_name || '',
        category: row.category || '',
        city: row.city || '',
        address: row.address || '',
        phone: row.phone || '',
        phone_type: phoneTypeFormatted,
        carrier: row.carrier || 'N/A',
        website_status: websiteStatusFormatted,
        contact_name: row.contact_name || 'Business Owner',
        contact_email: row.contact_email || '',
        contact_whatsapp: row.contact_whatsapp || '',
        social_profiles: row.social_profiles || '',
        is_mx_valid: mxFormatted,
        rating: row.rating ? Number(row.rating) : '',
        reviews_count: row.reviews_count ? Number(row.reviews_count) : 0,
        showcase_niche: matchedNiche.toUpperCase(),
        showcase_url: showcaseUrl,
        outreach_status: (row.status || 'discovered').toUpperCase(),
        sequence_step: row.sequence_step > 0 ? `Step ${row.sequence_step}` : 'Not Started',
        outbox_status: (row.outbox_status || 'Draft').toUpperCase(),
        timestamp: row.outbox_sent_at || row.outbox_scheduled_at || row.last_sequence_sent_at || '',
        outbox_subject: row.outbox_subject || ''
      };

      const addedRow = worksheet.addRow(rowData);
      addedRow.height = 22;

      // Zebra striping
      if (index % 2 === 1) {
        addedRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        });
      }

      addedRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: worksheet.columns.length }
    };

    return workbook;
  }

  async generateExcelBuffer(filter = 'all', baseUrl = 'http://localhost:5000') {
    const workbook = await this.buildWorkbook(filter, baseUrl);
    return await workbook.xlsx.writeBuffer();
  }

  async generateCsvBuffer(filter = 'all', baseUrl = 'http://localhost:5000') {
    const workbook = await this.buildWorkbook(filter, baseUrl);
    return await workbook.csv.writeBuffer();
  }
}

module.exports = new ExportService();
