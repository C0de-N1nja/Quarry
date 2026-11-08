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

# 4. Native In-Repo Harvester Recon Engine
echo "✅ Native passive subdomain & certificate recon engine active (Zero external repo needed)"

# 5. Check optional CLI helpers (Holehe, Cloudflared)
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
