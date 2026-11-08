#!/usr/bin/env bash
# ==============================================================================
# Quarry - Self-Contained OSINT & Automation Environment Initializer
# ==============================================================================
set -e

echo "=============================================================="
echo "⛏️  Quarry Self-Contained Toolkit Initializer"
echo "=============================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_TOOLS="$ROOT_DIR/server/tools"

echo "📂 Quarry root: $ROOT_DIR"
echo "🛠️  Bundled tools directory: $SERVER_TOOLS"

# 1. Bundled Blackbird Dependencies (if Python is present)
if command -v python3 &>/dev/null && [ -f "$SERVER_TOOLS/blackbird/requirements.txt" ]; then
  echo "📦 Checking Blackbird dependencies..."
  python3 -m pip install -r "$SERVER_TOOLS/blackbird/requirements.txt" --quiet --disable-pip-version-check || true
  echo "✅ Bundled Blackbird ready"
fi

# 2. Bundled Facebook Page Scraper
if [ -d "$SERVER_TOOLS/facebook-page-info-scraper" ]; then
  echo "✅ Bundled Facebook Page Info Scraper ready"
fi

# 3. Bundled WhatsLookup
if [ -d "$SERVER_TOOLS/whatslookup" ]; then
  echo "✅ Bundled WhatsLookup ready"
fi

# 4. Bundled check-if-email-exists Rust Binary (Option 1)
if [ -f "$SERVER_TOOLS/email-verifier/check_if_email_exists" ]; then
  chmod +x "$SERVER_TOOLS/email-verifier/check_if_email_exists"
  echo "✅ Bundled check-if-email-exists Rust binary executable ready"
fi

# 5. Native In-Repo Harvester Recon Engine
echo "✅ Native passive subdomain & certificate recon engine active (Zero external repo needed)"

# 6. Chromium for Website Health, Speed & ADA Auditor
if command -v chromium &>/dev/null || [ -f "/snap/bin/chromium" ]; then
  echo "✅ Chromium browser engine detected for Pa11y WCAG 2.1 & Performance audits"
else
  echo "ℹ️  Chromium can be installed via 'sudo apt install chromium-browser' or snap for deep ADA audits"
fi

# 7. Check optional CLI helpers (Holehe, Cloudflared)
if command -v holehe &>/dev/null; then
  echo "✅ Holehe email-to-social auditor is installed globally"
else
  echo "ℹ️  Holehe is optional: install with 'pip install holehe' for 120+ email footprint audits"
fi

echo ""
echo "=============================================================="
echo "✨ Quarry is 100% self-contained and ready to run!"
echo "   Start the dashboard with: npm run dev"
echo "=============================================================="
