# ⛏️ Quarry

> **The autonomous local business discovery, deep OSINT intelligence, and 1-click client acquisition engine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Node-Express-black.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57.svg)](https://www.sqlite.org/)
[![Design System](https://img.shields.io/badge/Design_System-BoardUI-6366f1.svg)](https://boardui.com)

---

## 💡 Why Quarry?

Most freelance web developers and agency owners fail at cold outreach for one simple reason:  
**They pitch companies that already spent \$10,000 on custom websites.**

**Quarry** turns client acquisition on its head. It autonomously mines Google Maps and public business registries to surface profitable local contractors, clinics, and service businesses that have hundreds of glowing 5-star customer reviews—but **literally zero website**. 

Then, its OSINT engine runs automated deep background checks to verify the company's real status, uncover the verified owner's direct cell phone or email, and generate a bespoke, high-converting audit and pitch in one click.

---

## ✨ Features

- **🗺️ Targeted Place Harvester**: Ingest authentic local businesses across any city, state, or niche (Landscaping, HVAC, Roofing, Dental, Plumbing, Legal).
- **🛡️ Multi-Layer OSINT Pipeline**:
  - DNS, MX, and WHOIS resolution to prove whether a domain is truly absent, parked, or active.
  - Government registry verification (Texas SOS, Secretary of State filings, public health inspections).
  - Phone carrier & mobile validation (VoIP vs. mobile cell).
  - Social footprint cross-referencing (Instagram bio extraction, Facebook business profiles, LinkedIn).
- **👤 Decision Maker Resolution**: Bypasses generic gatekeeper phones to discover the authentic founder, owner, or partner.
- **🎨 BoardUI Design System**: Crafted with Tailwind CSS v4, OKLCH semantic tokens, and React Aria primitives. Features 3 workflow views:
  - **Data Table View** (Figma Node `3731:3201`): TanStack-powered sorting, filtering, selection, and pagination.
  - **Kanban Board**: Drag-and-drop deal pipeline tracking prospect progress from Discovered to Won.
  - **Split Fast Triage View**: Rapid dossier review and instant action triggers.
- **⚡ 1-Click Auto-Pilot**: Autonomous batch agent that enriches prospects, generates hyper-personalized pitch decks, and stages them in the outbox.
- **📫 Deliverability & Compliance Outbox**: Rate-limited queue with RFC 8058 one-click unsubscribe headers, custom sender aliases, and audit logs.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** v18+ (tested on Node v20/v22)
- **npm** v9+

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/quarry.git
cd quarry
```

### 2. Install dependencies
```bash
# Installs root, client, and server dependencies in one command
npm run install:all
```

### 3. Configure environment variables (optional)
```bash
cp .env.example .env
```
*(Quarry works out-of-the-box with local SQLite. Add optional API keys for AI Auto-Pilot pitch generation.)*

### 4. Start the platform
```bash
./run.sh
# or
npm run dev
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)

---

## 🏗️ Architecture

```
quarry/
├── client/                     # Vite + React 18 + Tailwind v4 + BoardUI
│   ├── src/
│   │   ├── components/
│   │   │   ├── boardui/        # BoardUI Customer Table, Stat Cards, Kanban
│   │   │   ├── KanbanBoard.jsx # Drag-and-drop stage pipeline
│   │   │   ├── SplitView.jsx   # Fast keyboard-friendly triage
│   │   │   └── LeadDrawer.jsx  # Full intelligence dossier inspector
│   │   ├── App.jsx             # Shell router and state manager
│   │   └── main.jsx
│   ├── components/             # BoardUI base design tokens & primitives
│   ├── styles/                 # Tailwind v4 globals, OKLCH tokens, typography
│   └── vite.config.js
├── server/                     # Node.js + Express backend
│   ├── controllers/            # Leads, OSINT, outreach, autopilot controllers
│   ├── routes/                 # REST API endpoints
│   ├── services/               # OSINT engines, crawler, WHOIS, phone validator
│   ├── db/                     # SQLite database with WAL mode & schema migrations
│   └── server.js
├── run.sh                      # Unified platform launcher
├── package.json                # Root orchestrator
└── README.md
```

---

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for details.
