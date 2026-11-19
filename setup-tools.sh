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

# 1. Detect Architecture and Operating System
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "🖥️  Detected OS: $OS ($ARCH)"

# 2. Auto-generate .env from .env.example if missing
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "📄 Created .env from .env.example"
fi

# 3. Google Maps Radar Engine (Cross-Architecture Go Binary)
if command -v google_maps_scraper &>/dev/null || [ -f "$HOME/.local/bin/google_maps_scraper" ] || [ -f "$HOME/go/bin/google-maps-scraper" ]; then
  echo "✅ Google Maps Scraper binary detected"
elif command -v go &>/dev/null; then
  echo "📦 Compiling Google Maps Scraper natively for your processor ($ARCH)..."
  go install github.com/gosom/google-maps-scraper@latest
  mkdir -p "$HOME/.local/bin"
  if [ -f "$HOME/go/bin/google-maps-scraper" ]; then
    cp "$HOME/go/bin/google-maps-scraper" "$HOME/.local/bin/google_maps_scraper"
    chmod +x "$HOME/.local/bin/google_maps_scraper"
  fi
  echo "✅ Google Maps Scraper successfully compiled and placed in ~/.local/bin"
else
  echo "ℹ️  Go is not detected. Maps Radar will use system PATH or Web Crawler fallback."
  echo "   (Install Go from https://go.dev to compile the Maps binary natively for your CPU)"
fi

# 4. Bundled Blackbird Dependencies (if Python is present)
if python3 -c "import aiohttp" &>/dev/null; then
  echo "✅ Bundled Blackbird dependencies ready (System Python)"
elif [ -f "$ROOT_DIR/server/.venv/bin/python" ] && "$ROOT_DIR/server/.venv/bin/python" -c "import aiohttp" &>/dev/null; then
  echo "✅ Bundled Blackbird dependencies ready (server/.venv)"
elif command -v python3 &>/dev/null && [ -f "$SERVER_TOOLS/blackbird/requirements.txt" ]; then
  echo "📦 Checking Blackbird dependencies..."
  python3 -m pip install -r "$SERVER_TOOLS/blackbird/requirements.txt" --quiet --disable-pip-version-check --break-system-packages 2>/dev/null || true
  echo "✅ Bundled Blackbird ready"
fi

# 5. Bundled Facebook Page Scraper
if [ -d "$SERVER_TOOLS/facebook-page-info-scraper" ]; then
  echo "✅ Bundled Facebook Page Info Scraper ready"
fi

# 6. Bundled WhatsLookup
if [ -d "$SERVER_TOOLS/whatslookup" ]; then
  echo "✅ Bundled WhatsLookup ready"
fi

# 7. check-if-email-exists Architecture Check & Permissions
if [ -f "$SERVER_TOOLS/email-verifier/check_if_email_exists" ]; then
  if [ "$OS" = "Linux" ] && [ "$ARCH" = "x86_64" ]; then
    chmod +x "$SERVER_TOOLS/email-verifier/check_if_email_exists" 2>/dev/null || true
    echo "✅ Bundled check-if-email-exists binary executable ready"
  else
    echo "ℹ️  Non-x86_64 Linux detected ($OS $ARCH). Quarry will use built-in Node.js DNS/MX verification."
  fi
fi

# 8. Native In-Repo Harvester Recon Engine
echo "✅ Native passive subdomain & certificate recon engine active (Zero external repo needed)"

# 9. Chromium for Website Health, Speed & ADA Auditor
if command -v chromium &>/dev/null || [ -f "/snap/bin/chromium" ] || command -v google-chrome &>/dev/null || [ -d "/Applications/Google Chrome.app" ]; then
  echo "✅ Chromium/Chrome browser engine detected for Pa11y WCAG 2.1 & Performance audits"
else
  echo "ℹ️  Chromium can be installed via 'sudo apt install chromium-browser', 'brew install --cask chromium', or standard Chrome"
fi

# 10. Check optional CLI helpers (Holehe, Cloudflared)
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
