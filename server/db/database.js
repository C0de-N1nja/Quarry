const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hunting.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Initialize database instance
const db = new Database(DB_PATH);
if (DB_PATH !== ':memory:') {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

// Execute base schema to create all tables
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

// Drop deprecated audits table
try {
  db.exec('DROP TABLE IF EXISTS audits');
} catch (e) {}

// Apply column migrations for existing databases
const leadColumns = [
  'maps_link TEXT',
  'phone TEXT',
  'address TEXT',
  'city TEXT',
  'category TEXT',
  'rating REAL DEFAULT 0.0',
  'reviews_count INTEGER DEFAULT 0',
  'phone_type TEXT',
  'carrier TEXT',
  'phone_e164 TEXT',
  'opted_out INTEGER DEFAULT 0',
  "source TEXT DEFAULT 'crawler'",
  "status TEXT DEFAULT 'discovered'",
  'deal_value INTEGER DEFAULT 1000',
  'sequence_step INTEGER DEFAULT 1',
  'last_sequence_sent_at DATETIME',
  'next_followup_date DATETIME',
  'has_no_website INTEGER DEFAULT 0',
  'no_website_verified INTEGER DEFAULT 0',
  "website_status TEXT DEFAULT 'unknown'",
  'showcase_niche TEXT',
  'social_profiles TEXT',
  'osint_evidence TEXT',
  'place_id TEXT',
  'google_category TEXT',
  'search_keyword TEXT',
  'business_status TEXT',
  'country TEXT',
  'timezone TEXT',
  'facebook_url TEXT',
  'instagram_url TEXT',
  'is_test INTEGER DEFAULT 0',
  'archived_reason TEXT',
  'latitude REAL',
  'longitude REAL',
  'lat REAL',
  'lng REAL'
];

for (const col of leadColumns) {
  try { db.exec(`ALTER TABLE leads ADD COLUMN ${col}`); } catch (e) {}
}

const contactColumns = [
  'whatsapp TEXT',
  'avatar_url TEXT',
  'gravatar_data TEXT'
];

for (const col of contactColumns) {
  try { db.exec(`ALTER TABLE contacts ADD COLUMN ${col}`); } catch (e) {}
}

const runColumns = [
  'skipped_category INTEGER DEFAULT 0',
  'with_website_count INTEGER DEFAULT 0',
  'no_website_count INTEGER DEFAULT 0',
  'qualified_count INTEGER DEFAULT 0',
  'new_qualified_count INTEGER DEFAULT 0'
];

for (const col of runColumns) {
  try { db.exec(`ALTER TABLE runs ADD COLUMN ${col}`); } catch (e) {}
}

// Ensure unique index on place_id exists now that place_id is guaranteed to exist
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_place_id ON leads (place_id) WHERE place_id IS NOT NULL');
} catch (e) {}

try { db.exec("UPDATE leads SET is_test = 1 WHERE business_name LIKE '%test%' OR business_name LIKE '%mock%' OR source = 'test'"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    location TEXT NOT NULL,
    requested_limit INTEGER DEFAULT 100,
    found INTEGER DEFAULT 0,
    inserted INTEGER DEFAULT 0,
    skipped_closed INTEGER DEFAULT 0,
    skipped_wrong_city INTEGER DEFAULT 0,
    skipped_category INTEGER DEFAULT 0,
    with_website_count INTEGER DEFAULT 0,
    no_website_count INTEGER DEFAULT 0,
    qualified_count INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_sec REAL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs (started_at);
`);

// OSINT 14-Day Search & Verification Result Cache
db.exec(`
  CREATE TABLE IF NOT EXISTS osint_cache (
    cache_key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_osint_cache_expires ON osint_cache (expires_at);
`);

// Multi-Inbox Pool Table for 300+ Emails/Day Scale
db.exec(`
  CREATE TABLE IF NOT EXISTS smtp_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    port INTEGER NOT NULL DEFAULT 465,
    secure INTEGER NOT NULL DEFAULT 1,
    user TEXT NOT NULL,
    pass TEXT NOT NULL,
    daily_limit INTEGER NOT NULL DEFAULT 50,
    sent_today INTEGER NOT NULL DEFAULT 0,
    last_sent_at DATETIME,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Category 5: Gmail Spam Rescuer & Inbox Bridge
db.exec(`
  CREATE TABLE IF NOT EXISTS rescued_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT,
    body_preview TEXT,
    folder_origin TEXT DEFAULT '[Gmail]/Spam',
    status TEXT DEFAULT 'rescued',
    sentiment TEXT DEFAULT 'neutral',
    message_id TEXT,
    received_at DATETIME,
    rescued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rescued_replies_lead_id ON rescued_replies (lead_id);
  CREATE INDEX IF NOT EXISTS idx_rescued_replies_sender ON rescued_replies (sender_email);
`);

// Seed default sales templates if empty
const countTemplates = db.prepare('SELECT COUNT(*) as count FROM templates').get();
if (countTemplates.count === 0) {
  const seedTemplate = db.prepare(`
    INSERT INTO templates (name, angle, subject_template, body_template, is_default)
    VALUES (@name, @angle, @subject_template, @body_template, @is_default)
  `);

  const defaultTemplates = [
    {
      name: 'Mobile Speed & Conversion Leak',
      angle: 'speed_mobile',
      subject_template: 'Quick question regarding {{business_name}}\'s mobile site speed',
      body_template: `Hi {{first_name}},

I was looking at {{business_name}}'s site while researching local companies in {{city}} and ran a quick benchmark test on your page.

I noticed your website currently takes {{load_time_sec}} seconds to fully load on mobile devices{{flaw_bullet_1}}. 

Google's data shows that over 53% of mobile visitors bounce if a site takes more than 3 seconds to render. For a business like {{business_name}}, that often means losing potential clients directly to local competitors before they even see your phone number or contact form.

I put together a quick 90-second video walkthrough showing the exact 3 bottlenecks slowing down the site and how to fix them (no pitch, just direct steps).

Would you be open to me sending that video over to you?

Best regards,
{{my_name}}
Node.js & Web Performance Engineer
{{my_portfolio}}`,
      is_default: 1
    },
    {
      name: 'Missing Automated Booking / Lead Leak',
      angle: 'booking_leak',
      subject_template: 'Automating instant appointment bookings for {{business_name}}',
      body_template: `Hi {{first_name}},

Hope your week is going well.

I was checking out {{website}} and noticed that while your services look stellar, your site currently relies on {{flaw_summary}}.

When high-intent clients search for {{category}} after hours or from their phones, having to fill out a static form or wait for business hours to call results in substantial drop-off. Most users prefer an instant self-service booking slot that syncs directly with calendar and SMS confirmations.

We recently built an automated booking and lead-confirmation pipeline for a similar service business that increased their weekly scheduled consultations by 35% without adding manual office work.

Would you be open to a 3-minute video showing how this could work directly on {{business_name}}'s current website?

Best,
{{my_name}}
Backend & Automation Developer
{{my_portfolio}}`,
      is_default: 1
    },
    {
      name: 'Tech Modernization & API Integration',
      angle: 'tech_modernize',
      subject_template: 'Modernizing {{business_name}}\'s backend & web stack ({{tech_stack}})',
      body_template: `Hi {{first_name}},

I came across {{business_name}} and took a look under the hood at your digital infrastructure (noticed you're currently using {{tech_stack}}).

I noticed a couple of technical friction points that might be affecting your search rankings and conversion:
{{flaw_bullet_1}}
{{flaw_bullet_2}}

I specialize in building high-performance Node.js backends, custom API automations, and modernizing legacy setups so pages render in under 800ms while automating repetitive client intake tasks.

Would it be helpful if I sent over a short 2-page technical audit report outlining what we can streamline for {{business_name}}?

Regards,
{{my_name}}
Node.js Backend & API Specialist
{{my_portfolio}}`,
      is_default: 1
    },
    {
      name: 'Direct & Value-First Quick Fix',
      angle: 'direct_audit',
      subject_template: 'Found 2 small technical fixes on {{website}}',
      body_template: `Hi {{first_name}},

I'll keep this brief. While browsing {{business_name}} today, I noticed 2 minor technical issues that could be hurting your client inquiries:

1. {{flaw_bullet_1}}
2. {{flaw_bullet_2}}

Both can be resolved relatively quickly. I already jotted down the exact code and configuration steps required to fix them.

Happy to send the breakdown right over if you'd like to take a look or hand it to your technical team—no cost or obligation at all.

Would that be helpful?

Cheers,
{{my_name}}
{{my_portfolio}}`,
      is_default: 1
    },
    {
      name: 'Pre-Built Website Mockup Pitch (No Website / Modernization)',
      angle: 'mockup_pitch',
      subject_template: 'Built a quick modern preview site for {{business_name}}',
      body_template: `Hi {{first_name}},

I came across {{business_name}} while reviewing top-rated {{category}} providers in {{city}}. With {{rating}} stars and {{reviews_count}} verified reviews, your local reputation is stellar.

I noticed you don't currently have a dedicated mobile website (or your current site isn't capturing instant mobile inquiries). Most mobile searchers bounce if they cannot get an immediate price estimate or book directly.

To show you what's possible, I put together a working modern prototype site for {{business_name}} featuring:
- Instant interactive quote estimator
- One-click click-to-call & WhatsApp routing
- Prominently showcasing your {{reviews_count}} reviews and credibility

You can view the live prototype here:
{{mockup_url}}

No strings attached or cost whatsoever—I just wanted to show you what an ultra-fast, modern web presence could look like for {{business_name}}.

If you'd like me to transfer the code or hook it up to your domain, let me know!

Best regards,
{{my_name}}
Node.js & Web Performance Engineer
{{my_portfolio}}`,
      is_default: 1
    }
  ];

  for (const t of defaultTemplates) {
    seedTemplate.run(t);
  }
} else {
  // Ensure the mockup_pitch template is seeded if missing
  const hasMockup = db.prepare('SELECT id FROM templates WHERE angle = ?').get('mockup_pitch');
  if (!hasMockup) {
    db.prepare(`
      INSERT INTO templates (name, angle, subject_template, body_template, is_default)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      'Pre-Built Website Mockup Pitch (No Website / Modernization)',
      'mockup_pitch',
      'Built a quick modern preview site for {{business_name}}',
      `Hi {{first_name}},

I came across {{business_name}} while reviewing top-rated {{category}} providers in {{city}}. With {{rating}} stars and {{reviews_count}} verified reviews, your local reputation is stellar.

I noticed you don't currently have a dedicated mobile website (or your current site isn't capturing instant mobile inquiries). Most mobile searchers bounce if they cannot get an immediate price estimate or book directly.

To show you what's possible, I put together a working modern prototype site for {{business_name}} featuring:
- Instant interactive quote estimator
- One-click click-to-call & WhatsApp routing
- Prominently showcasing your {{reviews_count}} reviews and credibility

You can view the live prototype here:
{{mockup_url}}

No strings attached or cost whatsoever—I just wanted to show you what an ultra-fast, modern web presence could look like for {{business_name}}.

If you'd like me to transfer the code or hook it up to your domain, let me know!

Best regards,
{{my_name}}
Node.js & Web Performance Engineer
{{my_portfolio}}`
    );
  }

  // Ensure security_form_leak template is seeded if missing
  const hasSecurity = db.prepare('SELECT id FROM templates WHERE angle = ?').get('security_form_leak');
  if (!hasSecurity) {
    db.prepare(`
      INSERT INTO templates (name, angle, subject_template, body_template, is_default)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      'Broken Form & Security Header Leak Pitch',
      'security_form_leak',
      'Found 2 security & lead-leak issues on {{website}}\'s contact form',
      `Hi {{first_name}},

I came across {{business_name}} and ran a quick technical security & lead-capture diagnostic on {{website}}.

I noticed a couple of items under the hood that are likely hurting your search ranking and leaking inbound inquiries:
1. {{flaw_bullet_1}}
2. {{flaw_bullet_2}}

Additionally, your site currently lacks instant SMS/email lead auto-responders. Studies show that responding to an inbound customer request within 5 minutes increases lead qualification by 391%, whereas waiting even 30 minutes drops conversions dramatically.

I generated a 1-page executive technical scorecard for {{business_name}} showing the exact bottlenecks and code fixes:
{{report_url}}

I specialize in building high-performance Node.js backends, custom API automations, and modernizing legacy setups.

Would it be helpful if I walked you through the recommended fixes?

Best regards,
{{my_name}}
Node.js & Web Performance Engineer
{{my_portfolio}}`
    );
  }
}

// Seed default settings if empty
const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (countSettings.count === 0) {
  const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaultSettings = [
    ['smtp_host', 'smtp.gmail.com'],
    ['smtp_port', '465'],
    ['smtp_secure', 'true'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['sender_name', 'Rehan'],
    ['sender_email', ''],
    ['my_portfolio', 'https://github.com'],
    ['daily_send_limit', '30'],
    ['min_jitter_seconds', '45'],
    ['max_jitter_seconds', '90'],
    ['search_depth_default', '15'],
    ['spam_monitor_enabled', 'true'],
    ['spam_monitor_interval_mins', '5'],
    ['last_spam_scan_at', '']
  ];

  for (const [k, v] of defaultSettings) {
    seedSetting.run(k, v);
  }
}

// Ensure no_website_showcase template exists
const checkNoWeb = db.prepare('SELECT id FROM templates WHERE angle = ?').get('no_website_showcase');
if (!checkNoWeb) {
  db.prepare(`
    INSERT INTO templates (name, angle, subject_template, body_template, is_default)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'No-Website Niche Showcase Pitch',
    'no_website_showcase',
    `{Quick question regarding {{business_name}}'s online quotes in {{city}}|Question for {{first_name}} about {{business_name}}|{{business_name}} - {{city}} clients & website question}`,
    `{Hi|Hello} {{first_name}},

{I was looking up|I came across} top-rated {{category}} services in {{city}} and noticed {{business_name}} has an impressive {{rating}}★ rating across {{reviews_count}} reviews on Google.

However, {when homeowners and clients search for your services|when local clients search for you online}, there is no official website where they can view your previous work or request an instant quote online. Most customers in {{city}} who can't book or get a quick price estimate online end up clicking the next local contractor on Google.

We recently built a high-converting, mobile-first prototype specifically for {{category}} companies:
👉 {{showcase_url}}

We can customize this exact layout with your branding, phone number, and service areas, and have it live in under 48 hours.

Would you be open to a quick 5-minute preview this week?

{Best regards|Thanks},
{{my_name}}
{{my_portfolio}}`,
    1
  );
}

module.exports = db;
