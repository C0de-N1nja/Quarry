const { execFile } = require('child_process');
const os = require('os');

/**
 * Linux Desktop Notification Service
 * Sends native desktop alerts on Linux using /usr/bin/notify-send.
 * Automatically injects X11/Wayland and DBus session parameters.
 */
class NotificationService {
  constructor() {
    this.isLinux = os.platform() === 'linux';
  }

  /**
   * Send a native desktop notification on Linux
   * @param {string} title - Notification title
   * @param {string} message - Notification body text
   * @param {Object} options - Options (urgency, expireTime, icon, appName)
   */
  sendNotification(title, message, options = {}) {
    if (!this.isLinux) {
      console.log(`[Notification] Non-Linux OS (${os.platform()}), skipping notify-send: ${title} - ${message}`);
      return;
    }

    const {
      urgency = 'normal', // 'low', 'normal', 'critical'
      expireTime = 5000,   // milliseconds
      icon = 'dialog-information',
      appName = 'Client Hunter OS'
    } = options;

    const uid = process.getuid ? process.getuid() : 1000;
    const env = {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ':0',
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-0',
      DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=/run/user/${uid}/bus`,
      XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`
    };

    const args = [
      '-a', appName,
      '-i', icon,
      '-u', urgency,
      '-t', String(expireTime),
      title,
      message
    ];

    execFile('notify-send', args, { env }, (err) => {
      if (err) {
        // Fallback without icon if icon was missing
        execFile('notify-send', ['-a', appName, '-u', urgency, title, message], { env }, (fallbackErr) => {
          if (fallbackErr) {
            console.warn(`[Notification] Failed to send desktop notification: ${fallbackErr.message}`);
          } else {
            console.log(`[Notification] Desktop notification sent (fallback): "${title}"`);
          }
        });
      } else {
        console.log(`[Notification] Desktop notification sent: "${title}" - "${message}"`);
      }
    });
  }

  /**
   * Helper specifically formatted for scraping completion
   */
  sendScrapeComplete({ engine = 'Google Maps', keyword, location, found = 0, inserted = 0, upgraded = 0, time }) {
    const title = `🎯 ${engine} Complete!`;
    const timeStr = time ? ` in ${time}` : '';
    const body = `Harvested ${found} places (${inserted} fresh leads saved, ${upgraded} upgraded)${timeStr} for "${keyword}" in ${location}.`;
    this.sendNotification(title, body, {
      urgency: 'normal',
      expireTime: 8000,
      icon: 'dialog-information'
    });
  }

  /**
   * Helper specifically formatted for OSINT completion
   */
  sendOsintComplete({ total = 0, processed = 0, noWebsiteCount = 0, hasWebsiteCount = 0, emailsFound = 0, elapsedSeconds = 0 }) {
    const title = `🔍 OSINT Verification Complete!`;
    const timeStr = elapsedSeconds ? ` in ${elapsedSeconds}s` : '';
    const body = `Verified ${processed}/${total} leads${timeStr}.\n🎯 ${noWebsiteCount} confirmed no-website prospects\n📧 ${emailsFound} emails discovered\n🌐 ${hasWebsiteCount} active websites detected.`;
    this.sendNotification(title, body, {
      urgency: 'normal',
      expireTime: 9000,
      icon: 'dialog-information'
    });
  }
}

module.exports = new NotificationService();
