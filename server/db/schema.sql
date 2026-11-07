-- Schema for Client Hunting Automation Dashboard

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  website TEXT,
  maps_link TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  category TEXT,
  rating REAL DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  phone_type TEXT, -- 'Mobile', 'Landline', 'VoIP', 'Unknown'
  carrier TEXT,
  phone_e164 TEXT,
  opted_out INTEGER DEFAULT 0,
  source TEXT DEFAULT 'crawler', -- 'crawler', 'csv', 'manual', 'maps'
  status TEXT DEFAULT 'discovered', -- 'discovered', 'audited', 'enriched', 'pitched', 'sent', 'replied', 'won', 'archived'
  place_id TEXT,
  google_category TEXT,
  search_keyword TEXT,
  business_status TEXT,
  country TEXT,
  timezone TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  is_test INTEGER DEFAULT 0,
  archived_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  location TEXT NOT NULL,
  requested_limit INTEGER DEFAULT 100,
  found INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  skipped_closed INTEGER DEFAULT 0,
  skipped_wrong_city INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_sec REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs (started_at);


CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL UNIQUE,
  email TEXT,
  email_type TEXT DEFAULT 'generic', -- 'decision_maker', 'generic', 'unverified'
  contact_name TEXT,
  contact_title TEXT,
  phone TEXT,
  social_links TEXT, -- JSON object { linkedin, twitter, instagram, facebook }
  holehe_results TEXT, -- JSON array of confirmed online services
  avatar_url TEXT, -- Gravatar / profile photo URL
  gravatar_data TEXT, -- JSON object of Gravatar profile data
  is_mx_valid INTEGER DEFAULT 0,
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  angle TEXT NOT NULL UNIQUE, -- 'speed_mobile', 'booking_leak', 'tech_modernize', 'direct_audit'
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_default INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_angle TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed'
  scheduled_at DATETIME,
  sent_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mockups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL UNIQUE,
  html_content TEXT NOT NULL,
  headline TEXT,
  template_style TEXT DEFAULT 'modern',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
);

-- Indices for rapid querying and deduplication
CREATE INDEX IF NOT EXISTS idx_leads_website ON leads (website);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts (lead_id);
CREATE INDEX IF NOT EXISTS idx_mockups_lead_id ON mockups (lead_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox (status);

-- Category 5: Gmail Spam Rescuer & Inbox Bridge
CREATE TABLE IF NOT EXISTS rescued_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT,
  body_preview TEXT,
  folder_origin TEXT DEFAULT '[Gmail]/Spam',
  status TEXT DEFAULT 'rescued', -- 'rescued', 'archived'
  sentiment TEXT DEFAULT 'neutral', -- 'positive', 'question', 'negative', 'neutral'
  message_id TEXT,
  received_at DATETIME,
  rescued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rescued_replies_lead_id ON rescued_replies (lead_id);
CREATE INDEX IF NOT EXISTS idx_rescued_replies_sender ON rescued_replies (sender_email);
