const db = require('../db/database');
const Setting = require('../models/Setting');

/**
 * MultiInboxService: Distributes outbound cold email volume
 * across a pool of SMTP sending accounts to safely send 300+ emails/day
 * without burning sender reputation or hitting single-inbox daily limits.
 */
class MultiInboxService {
  /**
   * Get all configured SMTP accounts
   */
  getAllAccounts() {
    this.checkAndResetDailyCounters();
    return db.prepare(`
      SELECT id, name, host, port, secure, user, daily_limit, sent_today, last_sent_at, is_active, created_at
      FROM smtp_accounts
      ORDER BY id ASC
    `).all();
  }

  /**
   * Reset daily send counters if day has changed
   */
  checkAndResetDailyCounters() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      db.prepare(`
        UPDATE smtp_accounts 
        SET sent_today = 0 
        WHERE last_sent_at IS NOT NULL AND substr(last_sent_at, 1, 10) != ?
      `).run(today);
    } catch (e) {}
  }

  /**
   * Add a new sending account to the rotation pool
   */
  addAccount({ name, host = 'smtp.gmail.com', port = 465, secure = 1, user, pass, daily_limit = 50 }) {
    if (!user || !pass) throw new Error('SMTP user (email) and password are required');
    const stmt = db.prepare(`
      INSERT INTO smtp_accounts (name, host, port, secure, user, pass, daily_limit, sent_today, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
    `);
    const info = stmt.run(name || user, host, parseInt(port, 10) || 465, secure ? 1 : 0, user, pass, parseInt(daily_limit, 10) || 50);
    return this.getAccountById(info.lastInsertRowid);
  }

  getAccountById(id) {
    return db.prepare('SELECT id, name, host, port, secure, user, daily_limit, sent_today, last_sent_at, is_active FROM smtp_accounts WHERE id = ?').get(id);
  }

  deleteAccount(id) {
    return db.prepare('DELETE FROM smtp_accounts WHERE id = ?').run(id);
  }

  toggleAccount(id, isActive) {
    db.prepare('UPDATE smtp_accounts SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    return this.getAccountById(id);
  }

  /**
   * Select next available SMTP account from pool with capacity remaining
   */
  getNextAvailableSender() {
    this.checkAndResetDailyCounters();

    // Look for active account with remaining quota
    const account = db.prepare(`
      SELECT * FROM smtp_accounts
      WHERE is_active = 1 AND sent_today < daily_limit
      ORDER BY sent_today ASC, id ASC
      LIMIT 1
    `).get();

    if (account) {
      return {
        id: account.id,
        name: account.name,
        host: account.host,
        port: account.port,
        secure: account.secure === 1,
        user: account.user,
        pass: account.pass,
        fromEmail: account.user,
        isPoolAccount: true
      };
    }

    // Fallback to default single-account settings
    const settings = Setting.getAll ? Setting.getAll() : {};
    if (settings.smtp_user && settings.smtp_pass) {
      return {
        id: null,
        name: settings.sender_name || 'Primary',
        host: settings.smtp_host || 'smtp.gmail.com',
        port: parseInt(settings.smtp_port, 10) || 465,
        secure: settings.smtp_secure !== 'false',
        user: settings.smtp_user,
        pass: settings.smtp_pass,
        fromEmail: settings.sender_email || settings.smtp_user,
        isPoolAccount: false
      };
    }

    return null;
  }

  /**
   * Record an email successfully dispatched by an account
   */
  recordSent(accountId) {
    if (!accountId) return;
    try {
      db.prepare(`
        UPDATE smtp_accounts
        SET sent_today = sent_today + 1,
            last_sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(accountId);
    } catch (e) {}
  }

  /**
   * Get pool capacity metrics for the dashboard
   */
  getPoolMetrics() {
    this.checkAndResetDailyCounters();
    const accounts = this.getAllAccounts();
    const totalDailyCapacity = accounts.filter(a => a.is_active === 1).reduce((sum, a) => sum + (a.daily_limit || 0), 0);
    const totalSentToday = accounts.reduce((sum, a) => sum + (a.sent_today || 0), 0);
    const activeCount = accounts.filter(a => a.is_active === 1).length;

    return {
      activeAccounts: activeCount,
      totalAccounts: accounts.length,
      targetDaily: 143, // Option B (143/day • 1,000/week)
      targetWeekly: 1000,
      totalDailyCapacity: totalDailyCapacity || 50,
      totalSentToday,
      remainingCapacity: Math.max(0, (totalDailyCapacity || 50) - totalSentToday),
      accounts
    };
  }
}

module.exports = new MultiInboxService();
