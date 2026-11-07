const { spawn } = require('child_process');
const fs = require('fs');
const Setting = require('../models/Setting');

/**
 * Tunnel Service: Automates Cloudflare Quick Tunnels via the local cloudflared binary
 * to expose localhost:5000 with a free, public HTTPS URL. This allows international
 * prospects to view their interactive mockups and security report cards from any device.
 */
class TunnelService {
  constructor() {
    this.binaryPath = this.resolveBinary();
    this.process = null;
    this.publicUrl = null;
    this.isRunning = false;
    this.error = null;
    this.startedAt = null;
  }

  resolveBinary() {
    const candidates = [
      '/home/beast/github-tools/cloudflared',
      '/usr/local/bin/cloudflared',
      '/usr/bin/cloudflared'
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return 'cloudflared';
  }

  getStatus() {
    const currentBaseUrl = Setting.get('base_url', 'http://localhost:5000');
    return {
      isRunning: this.isRunning,
      publicUrl: this.publicUrl || (currentBaseUrl.startsWith('http') && !currentBaseUrl.includes('localhost') ? currentBaseUrl : null),
      activeBaseUrl: currentBaseUrl,
      error: this.error,
      startedAt: this.startedAt,
      binaryAvailable: fs.existsSync(this.binaryPath)
    };
  }

  /**
   * Start cloudflared quick tunnel in the background
   */
  start(port = 5000) {
    if (this.isRunning && this.publicUrl) {
      return Promise.resolve(this.getStatus());
    }

    if (!fs.existsSync(this.binaryPath)) {
      this.error = `cloudflared binary not found at ${this.binaryPath}`;
      return Promise.resolve(this.getStatus());
    }

    return new Promise((resolve) => {
      try {
        this.error = null;
        this.isRunning = true;
        this.startedAt = new Date().toISOString();

        // Spawn cloudflared tunnel
        this.process = spawn(this.binaryPath, [
          'tunnel',
          '--url', `http://127.0.0.1:${port}`,
          '--no-autoupdate'
        ], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let resolved = false;

        const handleOutput = (data) => {
          const text = data.toString();
          // Match trycloudflare.com URL
          const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
          if (match && !this.publicUrl) {
            this.publicUrl = match[0];
            // Persist as active base_url so all generated mockup/report links use it
            Setting.set('base_url', this.publicUrl);
            console.log(`🌐 Cloudflare Public Tunnel established: ${this.publicUrl}`);
            if (!resolved) {
              resolved = true;
              resolve(this.getStatus());
            }
          }
        };

        this.process.stdout.on('data', handleOutput);
        this.process.stderr.on('data', handleOutput);

        this.process.on('error', (err) => {
          console.error('Cloudflare tunnel spawn error:', err.message);
          this.error = err.message;
          this.isRunning = false;
          if (!resolved) {
            resolved = true;
            resolve(this.getStatus());
          }
        });

        this.process.on('close', (code) => {
          console.log(`Cloudflare tunnel process exited with code ${code}`);
          this.isRunning = false;
          this.publicUrl = null;
          this.process = null;
        });

        // Resolve after 12s if handshake is still in flight (won't block UI)
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(this.getStatus());
          }
        }, 12000);
      } catch (err) {
        this.error = err.message;
        this.isRunning = false;
        resolve(this.getStatus());
      }
    });
  }

  /**
   * Stop running tunnel
   */
  stop() {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch (e) {
        // Ignore kill error
      }
      this.process = null;
    }
    this.isRunning = false;
    this.publicUrl = null;
    this.error = null;
    this.startedAt = null;

    // Reset base_url back to localhost if it was a trycloudflare URL
    const currentBaseUrl = Setting.get('base_url', '');
    if (currentBaseUrl.includes('trycloudflare.com')) {
      Setting.set('base_url', 'http://localhost:5000');
    }

    return this.getStatus();
  }

  /**
   * Set custom base URL manually (e.g. custom domain or ngrok)
   */
  setCustomBaseUrl(url) {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim().replace(/\/+$/, '');
    Setting.set('base_url', cleanUrl);
    return this.getStatus();
  }
}

module.exports = new TunnelService();
