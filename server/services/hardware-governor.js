const os = require('os');
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch {}

/**
 * HardwareGovernor - Automatic CPU & Memory Resource Management
 * 
 * Dynamically profiles the host system (CPU cores, Total RAM, Free RAM)
 * to calculate safe, optimal worker concurrency across all processor types:
 * - Apple Silicon (M1/M2/M3/M4 ARM64)
 * - Intel / AMD x86_64
 * - Low-spec dual-core laptops & budget cloud VPS
 * - High-end multi-core developer workstations
 * 
 * Guarantees:
 * 1. Headroom Principle: Leaves CPU cores free for the operating system and dashboard UI.
 * 2. RAM Guardrail: Limits browser workers on machines with < 4GB RAM to prevent OOM freezes.
 * 3. User Override: Allows explicit .env tuning (MAPS_CONCURRENCY, OSINT_CONCURRENCY).
 */
class HardwareGovernor {
  constructor() {
    this.cores = (os.cpus() && os.cpus().length) || 4;
    this.totalMemBytes = os.totalmem() || (8 * 1024 * 1024 * 1024);
    this.totalMemGb = Math.round(this.totalMemBytes / (1024 * 1024 * 1024));
  }

  /**
   * Safe Maps Scraper Concurrency
   * @param {number} queryCount - Number of search query permutations
   * @returns {number} Optimal concurrent browser instances
   */
  getMapsConcurrency(queryCount = 1) {
    if (process.env.MAPS_CONCURRENCY) {
      const parsed = parseInt(process.env.MAPS_CONCURRENCY, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // Baseline: Cores minus 2 for OS headroom, bounded between 2 and 8
    let safeWorkers = Math.max(2, Math.min(this.cores - 2, 8));

    // Low-RAM guardrail: if machine has < 4GB total RAM, cap to 2 to prevent OOM
    if (this.totalMemGb < 4) {
      safeWorkers = Math.min(safeWorkers, 2);
    }
    // Very low RAM guardrail (< 2GB): single worker
    if (this.totalMemGb < 2) {
      safeWorkers = 1;
    }

    // Never spin up more workers than active queries
    if (queryCount && queryCount > 0) {
      return Math.min(safeWorkers, Math.max(1, queryCount));
    }

    return safeWorkers;
  }

  /**
   * Safe OSINT Verification Concurrency
   * @returns {number} Optimal concurrent OSINT workers
   */
  getOsintConcurrency() {
    if (process.env.OSINT_CONCURRENCY) {
      const parsed = parseInt(process.env.OSINT_CONCURRENCY, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    if (this.cores <= 2 || this.totalMemGb < 4) {
      return 2;
    }

    return Math.min(3, Math.max(2, this.cores - 2));
  }

  /**
   * Get System Profile for Telemetry and Diagnostics
   */
  getProfile() {
    return {
      cpuCores: this.cores,
      totalMemoryGb: this.totalMemGb,
      freeMemoryGb: Math.round((os.freemem() || 0) / (1024 * 1024 * 1024)),
      recommendedMapsConcurrency: this.getMapsConcurrency(4),
      recommendedOsintConcurrency: this.getOsintConcurrency()
    };
  }
}

module.exports = new HardwareGovernor();
