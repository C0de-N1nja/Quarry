/**
 * Timezone Service: Auto-detects recipient timezone from phone area codes,
 * country prefixes, or city/state strings, and calculates the optimal 
 * high-converting local delivery window (e.g., 9:30 AM on next business day).
 */
class TimezoneService {
  constructor() {
    // North American Area Codes to Timezone Mapping (Common US / CA hubs)
    this.usAreaCodeMap = {
      // Eastern (UTC-5 / UTC-4)
      '212': 'America/New_York', '646': 'America/New_York', '332': 'America/New_York', '718': 'America/New_York',
      '305': 'America/New_York', '786': 'America/New_York', '404': 'America/New_York', '678': 'America/New_York',
      '617': 'America/New_York', '857': 'America/New_York', '215': 'America/New_York', '267': 'America/New_York',
      '202': 'America/New_York', '703': 'America/New_York', '410': 'America/New_York', '443': 'America/New_York',
      '704': 'America/New_York', '919': 'America/New_York', '416': 'America/Toronto', '647': 'America/Toronto',
      // Central (UTC-6 / UTC-5)
      '312': 'America/Chicago', '773': 'America/Chicago', '872': 'America/Chicago', '214': 'America/Chicago',
      '469': 'America/Chicago', '972': 'America/Chicago', '512': 'America/Chicago', '737': 'America/Chicago',
      '713': 'America/Chicago', '832': 'America/Chicago', '281': 'America/Chicago', '615': 'America/Chicago',
      '502': 'America/Chicago', '314': 'America/Chicago', '612': 'America/Chicago', '651': 'America/Chicago',
      // Mountain (UTC-7 / UTC-6)
      '303': 'America/Denver', '720': 'America/Denver', '801': 'America/Denver', '385': 'America/Denver',
      '602': 'America/Phoenix', '480': 'America/Phoenix', '505': 'America/Denver', '406': 'America/Denver',
      // Pacific (UTC-8 / UTC-7)
      '213': 'America/Los_Angeles', '310': 'America/Los_Angeles', '415': 'America/Los_Angeles', '628': 'America/Los_Angeles',
      '408': 'America/Los_Angeles', '669': 'America/Los_Angeles', '206': 'America/Los_Angeles', '253': 'America/Los_Angeles',
      '503': 'America/Los_Angeles', '971': 'America/Los_Angeles', '702': 'America/Los_Angeles', '604': 'America/Vancouver'
    };

    // State / City abbreviations
    this.cityStateMap = {
      'tx': 'America/Chicago', 'texas': 'America/Chicago', 'austin': 'America/Chicago', 'dallas': 'America/Chicago', 'houston': 'America/Chicago',
      'ny': 'America/New_York', 'new york': 'America/New_York', 'nyc': 'America/New_York', 'miami': 'America/New_York', 'fl': 'America/New_York',
      'ca': 'America/Los_Angeles', 'california': 'America/Los_Angeles', 'los angeles': 'America/Los_Angeles', 'san francisco': 'America/Los_Angeles',
      'ut': 'America/Denver', 'utah': 'America/Denver', 'salt lake city': 'America/Denver', 'denver': 'America/Denver', 'co': 'America/Denver',
      'wa': 'America/Los_Angeles', 'seattle': 'America/Los_Angeles', 'or': 'America/Los_Angeles', 'portland': 'America/Los_Angeles',
      'il': 'America/Chicago', 'chicago': 'America/Chicago', 'pa': 'America/New_York', 'philadelphia': 'America/New_York',
      'uk': 'Europe/London', 'london': 'Europe/London', 'manchester': 'Europe/London', 'england': 'Europe/London',
      'au': 'Australia/Sydney', 'sydney': 'Australia/Sydney', 'melbourne': 'Australia/Sydney', 'brisbane': 'Australia/Brisbane',
      'ae': 'Asia/Dubai', 'dubai': 'Asia/Dubai', 'uae': 'Asia/Dubai',
      'de': 'Europe/Berlin', 'germany': 'Europe/Berlin', 'berlin': 'Europe/Berlin', 'munich': 'Europe/Berlin',
      'ca': 'America/Toronto', 'toronto': 'America/Toronto', 'vancouver': 'America/Vancouver'
    };
  }

  /**
   * Detect timezone from lead phone, city, or address
   */
  detectTimezone(lead = {}) {
    const phone = (lead.phone || '').trim();
    const city = (lead.city || '').toLowerCase().trim();
    const address = (lead.address || '').toLowerCase().trim();

    // 1. Check International Country Calling Codes
    if (phone.startsWith('+44')) {
      return { timezone: 'Europe/London', label: 'UK (GMT/BST)', country: 'UK', offsetHours: 1 };
    }
    if (phone.startsWith('+61')) {
      return { timezone: 'Australia/Sydney', label: 'Australia (AEST)', country: 'AU', offsetHours: 10 };
    }
    if (phone.startsWith('+971')) {
      return { timezone: 'Asia/Dubai', label: 'UAE (Gulf Standard)', country: 'AE', offsetHours: 4 };
    }
    if (phone.startsWith('+49')) {
      return { timezone: 'Europe/Berlin', label: 'Germany (CET)', country: 'DE', offsetHours: 2 };
    }
    if (phone.startsWith('+33')) {
      return { timezone: 'Europe/Paris', label: 'France (CET)', country: 'FR', offsetHours: 2 };
    }

    // 2. Check US/CA Area Code in Phone
    const cleanDigits = phone.replace(/[^\d]/g, '');
    let areaCode = '';
    if (cleanDigits.length === 10) {
      areaCode = cleanDigits.slice(0, 3);
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith('1')) {
      areaCode = cleanDigits.slice(1, 4);
    }

    if (areaCode && this.usAreaCodeMap[areaCode]) {
      const tz = this.usAreaCodeMap[areaCode];
      return {
        timezone: tz,
        label: this.getTimezoneFriendlyName(tz),
        country: tz.includes('Toronto') || tz.includes('Vancouver') ? 'CA' : 'US',
        areaCode
      };
    }

    // 3. Check City / State string
    const locationText = `${city} ${address}`.toLowerCase();
    for (const [key, tz] of Object.entries(this.cityStateMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(locationText)) {
        return {
          timezone: tz,
          label: this.getTimezoneFriendlyName(tz),
          country: tz.includes('London') ? 'UK' : tz.includes('Sydney') ? 'AU' : tz.includes('Dubai') ? 'AE' : 'US'
        };
      }
    }

    // Default to US Eastern (most common for US outreach)
    return {
      timezone: 'America/New_York',
      label: 'US Eastern (EST/EDT)',
      country: 'US',
      isDefault: true
    };
  }

  getTimezoneFriendlyName(tz) {
    if (tz === 'America/New_York') return 'US Eastern (EST/EDT)';
    if (tz === 'America/Chicago') return 'US Central (CST/CDT)';
    if (tz === 'America/Denver') return 'US Mountain (MST/MDT)';
    if (tz === 'America/Phoenix') return 'US Arizona (MST)';
    if (tz === 'America/Los_Angeles') return 'US Pacific (PST/PDT)';
    if (tz === 'Europe/London') return 'United Kingdom (GMT/BST)';
    if (tz === 'Australia/Sydney') return 'Australia Sydney (AEST)';
    if (tz === 'Asia/Dubai') return 'United Arab Emirates (GST)';
    if (tz === 'Europe/Berlin') return 'Central Europe (CET)';
    return tz;
  }

  /**
   * Get approximate current hour in recipient timezone
   */
  getCurrentLocalHour(timezone) {
    try {
      const str = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      }).format(new Date());
      return parseInt(str, 10);
    } catch {
      return 12;
    }
  }

  /**
   * Calculate next optimal B2B window (9:30 AM local time, Mon-Fri)
   */
  calculateNextOptimalSend(lead, targetHour = 9, targetMinute = 30) {
    const tzInfo = this.detectTimezone(lead);
    const tz = tzInfo.timezone;

    // Use Intl to get recipient local time components
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const map = {};
    for (const p of parts) map[p.type] = p.value;

    const localYear = parseInt(map.year, 10);
    const localMonth = parseInt(map.month, 10);
    const localDay = parseInt(map.day, 10);
    const localHour = parseInt(map.hour, 10);
    const weekday = map.weekday; // 'Mon', 'Tue', ...

    // Determine target local date
    let addDays = 0;
    // If today is past 11:30 AM, target tomorrow
    if (localHour >= 11) {
      addDays = 1;
    }

    // Check if target day falls on weekend
    // Calculate weekday index for target date
    const targetDateLocal = new Date(Date.UTC(localYear, localMonth - 1, localDay + addDays));
    const dayOfWeek = targetDateLocal.getUTCDay(); // 0 is Sun, 6 is Sat

    if (dayOfWeek === 6) { // Saturday -> shift to Monday (+2 days)
      addDays += 2;
    } else if (dayOfWeek === 0) { // Sunday -> shift to Monday (+1 day)
      addDays += 1;
    }

    // Rough timezone offset calculation to UTC
    const dateLocalString = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay + addDays).padStart(2, '0')}T${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}:00`;
    
    // We can compute the exact UTC instant using JavaScript Date with timezone conversion
    const localTimeMs = new Date(now.toLocaleString('en-US', { timeZone: tz })).getTime();
    const tzOffsetMs = now.getTime() - localTimeMs;

    const scheduledDateObj = new Date(new Date(dateLocalString).getTime() + tzOffsetMs);
    const utcIso = scheduledDateObj.toISOString();

    const humanTime = `${tzInfo.label} • ${new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(scheduledDateObj)}`;

    return {
      scheduled_at_utc: utcIso,
      human_local_time: humanTime,
      timezone: tz,
      timezone_label: tzInfo.label,
      recipient_current_hour: localHour
    };
  }
}

module.exports = new TimezoneService();
