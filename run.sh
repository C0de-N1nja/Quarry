#!/usr/bin/env bash
# Quarry - Autonomous Lead Hunting & OSINT Platform
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=============================================================="
echo "⛏️  Starting Quarry Platform"
echo "   • Backend REST API:  http://localhost:5000"
echo "   • Frontend UI (Web): http://localhost:3000"
echo "=============================================================="

npm run dev
