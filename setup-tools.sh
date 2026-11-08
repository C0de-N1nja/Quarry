#!/usr/bin/env bash
# ==============================================================================
# Quarry - Optional External OSINT Toolkit Setup Script
# ==============================================================================
set -e

echo "=============================================================="
echo "⛏️  Quarry OSINT External Tools Setup"
echo "=============================================================="

TOOLS_DIR="$(dirname "$(dirname "$(pwd)")")/github-tools"
mkdir -p "$TOOLS_DIR"
cd "$TOOLS_DIR"

echo "📂 Target tools directory: $TOOLS_DIR"

# 1. WhatsLookup (WhatsApp presence & devices)
if [ ! -d "whatslookup" ]; then
  echo "📥 Cloning whatslookup..."
  git clone https://github.com/thehappydinoa/whatslookup.git || true
else
  echo "✅ whatslookup already exists"
fi

# 2. Blackbird (574+ social networks handle scanner)
if [ ! -d "blackbird" ]; then
  echo "📥 Cloning blackbird..."
  git clone https://github.com/p1ngul1n0/blackbird.git || true
else
  echo "✅ blackbird already exists"
fi

# 3. theHarvester (passive certificate logs & subdomains)
if [ ! -d "theHarvester" ]; then
  echo "📥 Cloning theHarvester..."
  git clone https://github.com/laramies/theHarvester.git || true
else
  echo "✅ theHarvester already exists"
fi

echo ""
echo "=============================================================="
echo "✨ Optional OSINT tools are cloned in $TOOLS_DIR!"
echo "   Quarry will auto-detect them or you can set paths in .env"
echo "=============================================================="
