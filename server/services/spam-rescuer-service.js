const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../db/database');
const Setting = require('../models/Setting');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Outbox = require('../models/Outbox');
const RescuedReply = require('../models/RescuedReply');

// Common free/generic email domains to exclude from domain-level wildcard matching
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'zoho.com', 'mail.com', 'gmx.com'
]);

class SpamRescuerService {
  constructor() {
    this.monitorInterval = null;
    this.isScanning = false;
  }

  /**
   * Extract clean domain from email or URL
   */
  extractDomain(str) {
    if (!str) return null;
    let text = str.trim().toLowerCase();
    if (text.includes('@')) {
      return text.split('@')[1];
    }
    // Remove protocol and paths
    text = text.replace(/^[a-z]+:\/\//i, '');
    text = text.split('/')[0];
    text = text.split(':')[0];
    text = text.replace(/^www\./i, '');
    return text || null;
  }

  /**
   * Rule-based sentiment & intent analyzer
   */
  detectSentiment(text = '') {
    const lower = text.toLowerCase();
    
    // Negative / Opt-Out signals (Highest priority)
    const negativeKeywords = [
      'unsubscribe', 'remove me', 'not interested', 'stop emailing',
      'leave us alone', 'take me off', 'do not contact', 'spam', 'reported'
    ];
    for (const kw of negativeKeywords) {
      if (lower.includes(kw)) return 'negative';
    }

    // Strong positive high-intent phrases (takes precedence over question mark)
    const strongPositive = [
      'sounds great', 'sounds good', 'interested', 'send video', 'send the video',
      'send over', 'call me', 'jump on a call', 'book a call', "let's talk", 'lets talk',
      'happy to chat', 'available to speak'
    ];
    for (const kw of strongPositive) {
      if (lower.includes(kw)) return 'positive';
    }

    // Question / Clarification signals (If asking questions or has '?')
    const questionKeywords = [
      'how much', 'what is your', 'what are your', 'portfolio', 'references',
      'turnaround', 'wordpress', 'shopify', 'experience', 'who are you', 'how did you find'
    ];
    for (const kw of questionKeywords) {
      if (lower.includes(kw)) return 'question';
    }
    if (lower.includes('?')) return 'question';

    // Secondary Positive / Commercial interest signals
    const generalPositive = [
      'quote', 'pricing', 'price', 'rates', 'schedule', 'meeting',
      'available', 'demo', 'proposal', 'share more', 'tell me more',
      'estimate', 'phone number', 'contact me'
    ];
    for (const kw of generalPositive) {
      if (lower.includes(kw)) return 'positive';
    }

    return 'neutral';
  }

  /**
   * Build lead & contact lookup maps from SQLite
   */
  getLeadLookupMaps() {
    const exactEmailMap = new Map(); // email -> lead_id
    const domainMap = new Map();     // domain -> lead_id
    const leadMap = new Map();       // lead_id -> lead

    const leads = db.prepare('SELECT id, business_name, website, city FROM leads').all();
    for (const lead of leads) {
      leadMap.set(lead.id, lead);
      if (lead.website) {
        const dom = this.extractDomain(lead.website);
        if (dom && !GENERIC_DOMAINS.has(dom)) {
          domainMap.set(dom, lead.id);
        }
      }
    }

    const contacts = db.prepare("SELECT email, lead_id FROM contacts WHERE email IS NOT NULL AND length(email) > 0").all();
    for (const c of contacts) {
      const email = c.email.toLowerCase().trim();
      exactEmailMap.set(email, c.lead_id);
      const dom = this.extractDomain(email);
      if (dom && !GENERIC_DOMAINS.has(dom) && !domainMap.has(dom)) {
        domainMap.set(dom, c.lead_id);
      }
    }

    const outbox = db.prepare('SELECT recipient_email, lead_id, subject FROM outbox WHERE recipient_email IS NOT NULL').all();
    for (const o of outbox) {
      const email = o.recipient_email.toLowerCase().trim();
      exactEmailMap.set(email, o.lead_id);
      const dom = this.extractDomain(email);
      if (dom && !GENERIC_DOMAINS.has(dom) && !domainMap.has(dom)) {
        domainMap.set(dom, o.lead_id);
      }
    }

    return { exactEmailMap, domainMap, leadMap, outbox };
  }

  /**
   * Create configured ImapFlow client using saved Settings
   */
  getImapClient() {
    const user = Setting.get('smtp_user');
    const pass = Setting.get('smtp_pass');

    if (!user || !pass) {
      throw new Error('Gmail IMAP credentials not configured. Please add your Gmail address and App Password in Settings.');
    }

    return new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: user.trim(),
        pass: pass.trim()
      },
      logger: false,
      emitLogs: false
    });
  }

  /**
   * Test IMAP connectivity with current settings
   */
  async testConnection() {
    let client;
    try {
      client = this.getImapClient();
      await client.connect();
      const mailboxes = await client.list();
      await client.logout();
      return {
        success: true,
        message: 'Successfully connected to Gmail IMAP!',
        mailboxCount: mailboxes.length
      };
    } catch (err) {
      if (client) {
        try { await client.logout(); } catch (e) {}
      }
      return {
        success: false,
        error: err.message || 'Failed to authenticate with Gmail IMAP'
      };
    }
  }

  /**
   * Main Scan & Rescue Engine
   * Connects to Gmail IMAP, locates Spam folder, finds client replies,
   * moves them to INBOX, and advances Kanban pipeline to 'replied'.
   */
  async scanSpamFolder() {
    if (this.isScanning) {
      return { success: false, error: 'A spam scan is already in progress' };
    }

    this.isScanning = true;
    let client;
    const rescued = [];

    try {
      client = this.getImapClient();
      await client.connect();

      // Locate the Spam/Junk mailbox
      const mailboxes = await client.list();
      let spamPath = null;
      for (const mb of mailboxes) {
        if (mb.specialUse === '\\Junk' || /(^|\/|\b)spam(\b|\/|$)/i.test(mb.path) || mb.path === '[Gmail]/Spam') {
          spamPath = mb.path;
          break;
        }
      }

      if (!spamPath) {
        // Fallback standard Gmail spam path
        spamPath = '[Gmail]/Spam';
      }

      // Check if mailbox exists
      let mailboxLock;
      try {
        mailboxLock = await client.getMailboxLock(spamPath);
      } catch (e) {
        // Try fallback [Google Mail]/Spam
        try {
          spamPath = '[Google Mail]/Spam';
          mailboxLock = await client.getMailboxLock(spamPath);
        } catch (e2) {
          throw new Error(`Could not access Gmail Spam folder: ${e.message}`);
        }
      }

      // Build lead match lookups
      const { exactEmailMap, domainMap, leadMap, outbox } = this.getLeadLookupMaps();

      // Fetch messages from Spam (read newest up to 60 messages)
      const status = await client.status(spamPath, { messages: true, unseen: true });
      const totalMessages = status.messages || 0;

      if (totalMessages > 0) {
        // Fetch up to the last 60 messages
        const fetchRange = totalMessages > 60 ? `${totalMessages - 59}:*` : '1:*';
        
        for await (let msg of client.fetch(fetchRange, {
          envelope: true,
          source: true,
          flags: true,
          internalDate: true,
          uid: true
        })) {
          try {
            const messageId = msg.envelope.messageId;
            if (messageId && RescuedReply.findByMessageId(messageId)) {
              // Already rescued previously
              continue;
            }

            const senderAddress = msg.envelope.from?.[0]?.address?.toLowerCase().trim() || '';
            const senderName = msg.envelope.from?.[0]?.name || senderAddress;
            const subject = msg.envelope.subject || '';

            // Matching checks
            let matchedLeadId = null;
            let matchReason = null;

            // 1. Exact email match
            if (exactEmailMap.has(senderAddress)) {
              matchedLeadId = exactEmailMap.get(senderAddress);
              matchReason = 'exact_email';
            }

            // 2. Domain match (if not generic domain)
            if (!matchedLeadId) {
              const senderDomain = this.extractDomain(senderAddress);
              if (senderDomain && domainMap.has(senderDomain)) {
                matchedLeadId = domainMap.get(senderDomain);
                matchReason = 'domain_match';
              }
            }

            // 3. Subject reference match
            if (!matchedLeadId && subject.toLowerCase().startsWith('re:')) {
              const cleanSub = subject.replace(/^re:\s*/i, '').trim().toLowerCase();
              for (const o of outbox) {
                if (o.subject && o.subject.toLowerCase().includes(cleanSub)) {
                  matchedLeadId = o.lead_id;
                  matchReason = 'subject_thread';
                  break;
                }
              }
            }

            // If matched, RESCUE THIS MESSAGE!
            if (matchedLeadId) {
              // Parse message body
              let snippet = '';
              try {
                const parsed = await simpleParser(msg.source);
                const fullText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
                snippet = fullText.replace(/\s+/g, ' ').trim().slice(0, 350);
              } catch (parseErr) {
                snippet = 'Email content received (preview parsing skipped)';
              }

              const sentiment = this.detectSentiment(snippet || subject);

              // 1. Move message from [Gmail]/Spam to INBOX
              try {
                await client.messageMove(msg.uid, 'INBOX', { uid: true });
              } catch (moveErr) {
                // If messageMove is unsupported on older Gmail IMAP extensions, copy + mark \Deleted
                await client.messageCopy(msg.uid, 'INBOX', { uid: true });
                await client.messageFlagsAdd(msg.uid, ['\\Deleted'], { uid: true });
                await client.expunge();
              }

              // 2. Advance Lead to 'replied' in Kanban & Stop automated follow-up drip
              Lead.updateStage(matchedLeadId, 'replied');
              Lead.updateSequence(matchedLeadId, 4, null, null);

              // 3. Save into rescued_replies table
              const record = RescuedReply.create({
                lead_id: matchedLeadId,
                sender_email: senderAddress,
                sender_name: senderName,
                subject,
                body_preview: snippet,
                folder_origin: spamPath,
                sentiment,
                message_id: messageId,
                received_at: msg.internalDate ? new Date(msg.internalDate).toISOString() : new Date().toISOString()
              });

              rescued.push({
                ...record,
                matchReason,
                lead: leadMap.get(matchedLeadId)
              });
            }
          } catch (itemErr) {
            console.error('Error processing spam message item:', itemErr);
          }
        }
      }

      mailboxLock.release();
      await client.logout();

      // Update last scan timestamp setting
      Setting.set('last_spam_scan_at', new Date().toISOString());

      return {
        success: true,
        scannedFolder: spamPath,
        messagesInSpam: totalMessages,
        rescuedCount: rescued.length,
        rescued
      };
    } catch (err) {
      if (client) {
        try { await client.logout(); } catch (e) {}
      }
      return {
        success: false,
        error: err.message || 'Spam rescue scan failed'
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Simulate a rescued client reply for testing UI and pipeline advancement
   */
  simulateRescue({ leadId, senderEmail, senderName = 'Client Prospect', subject, bodyText }) {
    const lead = Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found for simulation');

    const email = senderEmail || `${lead.business_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const sub = subject || `Re: Question regarding ${lead.business_name}'s website`;
    const body = bodyText || `Hi Rehan,\n\nThanks for reaching out. Yes, we saw your pitch and would love to see the video breakdown you mentioned. When are you available for a quick chat this week?\n\nBest,\n${senderName}`;
    const sentiment = this.detectSentiment(body);

    // Advance Kanban stage to 'replied'
    Lead.updateStage(lead.id, 'replied');
    Lead.updateSequence(lead.id, 4, null, null);

    // Record rescued reply
    const record = RescuedReply.create({
      lead_id: lead.id,
      sender_email: email,
      sender_name: senderName,
      subject: sub,
      body_preview: body.slice(0, 300),
      folder_origin: '[Gmail]/Spam (Simulated)',
      sentiment,
      message_id: `<simulated-${Date.now()}@client-hunter-os>`
    });

    return {
      success: true,
      rescued: record,
      lead
    };
  }

  /**
   * Generate 1-Click Downloadable Gmail Filter XML (mailFilters.xml)
   * Prevents emails from prospects from ever landing in Spam in the first place!
   */
  generateGmailFilterXml() {
    const leads = db.prepare('SELECT website, business_name FROM leads').all();
    const contacts = db.prepare("SELECT email FROM contacts WHERE email IS NOT NULL AND length(email) > 0").all();
    const outbox = db.prepare("SELECT recipient_email FROM outbox WHERE recipient_email IS NOT NULL AND length(recipient_email) > 0").all();

    const criteriaParts = new Set();

    // Add specific emails
    for (const c of contacts) {
      if (c.email) criteriaParts.add(c.email.trim().toLowerCase());
    }
    for (const o of outbox) {
      if (o.recipient_email) criteriaParts.add(o.recipient_email.trim().toLowerCase());
    }

    // Add domains
    for (const l of leads) {
      if (l.website) {
        const dom = this.extractDomain(l.website);
        if (dom && !GENERIC_DOMAINS.has(dom)) {
          criteriaParts.add(`*@${dom}`);
        }
      }
    }

    // Build OR query
    let queryList = Array.from(criteriaParts).join(' OR ');
    if (!queryList) {
      queryList = 'from:prospect@example.com';
    }

    const xml = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>
  <title>Mail Filters</title>
  <id>tag:mail.google.com,2008:filters:</id>
  <updated>${new Date().toISOString()}</updated>
  <author>
    <name>Client Hunter OS</name>
  </author>
  <entry>
    <category term='filter'></category>
    <title>Client Hunter OS: Permanent Spam Immunity Rule</title>
    <id>tag:mail.google.com,2008:filter:client_hunter_anti_spam</id>
    <updated>${new Date().toISOString()}</updated>
    <content></content>
    <apps:property name='from' value='${queryList.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}'/>
    <apps:property name='shouldNeverSpam' value='true'/>
    <apps:property name='shouldAlwaysMarkAsImportant' value='true'/>
    <apps:property name='smartLabelToApply' value='^smartlabel_personal'/>
  </entry>
</feed>`;

    return {
      xml,
      criteriaCount: criteriaParts.size
    };
  }

  /**
   * Get Current Rescuer Status
   */
  getStatus() {
    const user = Setting.get('smtp_user');
    const pass = Setting.get('smtp_pass');
    const enabled = Setting.get('spam_monitor_enabled', 'true') === 'true';
    const intervalMins = parseInt(Setting.get('spam_monitor_interval_mins', '5'), 10) || 5;
    const lastScan = Setting.get('last_spam_scan_at', null);
    const stats = RescuedReply.getStats();

    return {
      configured: Boolean(user && pass),
      connectedAccount: user ? user.replace(/(^.{3})(.*)(@.*)$/, '$1***$3') : null,
      enabled,
      intervalMins,
      lastScan,
      isScanning: this.isScanning,
      stats
    };
  }

  /**
   * Background monitoring scheduler
   */
  initBackgroundMonitor() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    const enabled = Setting.get('spam_monitor_enabled', 'true') === 'true';
    const intervalMins = parseInt(Setting.get('spam_monitor_interval_mins', '5'), 10) || 5;

    if (!enabled) return;

    // Run interval
    this.monitorInterval = setInterval(async () => {
      try {
        const user = Setting.get('smtp_user');
        const pass = Setting.get('smtp_pass');
        const isEnabled = Setting.get('spam_monitor_enabled', 'true') === 'true';

        if (isEnabled && user && pass) {
          console.log('🛡️ [SpamRescuer] Running automatic background scan of [Gmail]/Spam...');
          const result = await this.scanSpamFolder();
          if (result.success && result.rescuedCount > 0) {
            console.log(`🔥 [SpamRescuer] Rescued ${result.rescuedCount} client email(s) from Spam folder!`);
          }
        }
      } catch (err) {
        console.error('🛡️ [SpamRescuer] Background scan error:', err.message);
      }
    }, intervalMins * 60 * 1000);

    console.log(`🛡️ [SpamRescuer] Background spam monitor initialized (polling every ${intervalMins}m)`);
  }
}

module.exports = new SpamRescuerService();
