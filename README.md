# Quarry

> **The autonomous local business discovery, multi-country Google Maps harvester, deep OSINT intelligence, and 1-click client acquisition engine.**

![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![BoardUI](https://img.shields.io/badge/Design_System-BoardUI-6366f1?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## Why Quarry?

Most freelance web developers and agency owners fail at cold outreach for one simple reason:  
**They pitch companies that already spent \$10,000 on custom websites.**

**Quarry** turns client acquisition on its head. It autonomously mines Google Maps and search engine web results to surface profitable local contractors, clinics, restaurants, and service businesses that have hundreds of glowing 5-star customer reviews—but **literally zero website**, rely solely on a social profile or directory listing, or have slow, broken websites.

Quarry's OSINT engine runs automated deep background checks to verify the company's real status, uncover the verified owner's direct mobile phone or email, and generate a bespoke, high-converting audit and pitch in one click.

---

## Core Capabilities

### 1. Multi-Country Google Maps Harvester (Go Native Engine)
- Zero-Docker, high-speed standalone Go scraper binary (`google_maps_scraper`) directly integrated into the dashboard.
- Country Selector covering the United States (US), United Kingdom (GB), Australia (AU), Canada (CA), and United Arab Emirates (AE) with international E.164 phone normalization.
- 6 categorized trade clusters (Contractors, Restaurants & Food, Medical & Dental, Professional Services, Automotive, Personal Care) plus instant custom write-in search.
- Live Harvester HUD telemetry showing extraction rate, unique prospects, and genuine no-website leads in real time.

### 2. Discovery Signals & Local 3-Pack Tracking
- **Google Maps Rank Position**: Tracks each prospect's exact rank on Google Maps for their niche and city.
- **Local 3-Pack Badge**: Instantly identifies businesses holding top 3 positions vs businesses ranked #4+ that need SEO to break into the pack.
- **Unclaimed Google Business Profiles**: Flags unmanaged and unclaimed listings for high-converting local agency pitches.

### 3. Organic Web & Social Presence Resolver
- Inspects Google organic web results below the map container for businesses with and without websites.
- **Directory vs Official Website Classification**: Distinguishes authentic business websites from 3rd-party contractor directories (Angi, Houzz, Bark, Yelp, YellowPages, Hipages, TrueLocal, Checkatrade) and social profiles so directories are never mistaken for official websites.
- **Social Profile Discovery**: Crawls website footers and runs targeted search dorks to extract verified Facebook pages, Instagram profiles, LinkedIn companies, and YouTube channels into the dossier.

### 4. 26-Point Commercial Sales Signals & Tech Stack Auditor
- Scans target sites across 4 key dimensions:
  - **Conversion Bottlenecks**: Tap-to-call link missing on mobile, online booking tool missing (Calendly, Housecall Pro, Jobber, ServiceTitan), contact forms, and live chat widgets.
  - **Site Health & Speed**: Mobile viewport tag, SSL HTTPS security, load speed against Google's 3.0s guideline, and copyright year freshness.
  - **SEO & AI Search Visibility**: JSON-LD schema markup, primary heading hierarchy, meta descriptions, sitemaps, image alt tags, analytics, and robots.txt AI crawler blocking.
  - **Commercial Profile**: Amateurs DIY builders (Wix, GoDaddy, Weebly), incumbent web agency credits, active ad spend (Google/Meta Ads), and call tracking detection.

### 5. Multi-Layer OSINT & Decision Maker Extraction
- Discovers decision makers, founders, and managing partners via Secretary of State corporate registry checks and team pages.
- Email deliverability validation (SMTP handshake, MX verification, catch-all detection).
- Phone line type classification (mobile cell vs landline vs VoIP) with click-to-call and WhatsApp deep-links.

### 6. BoardUI Design System
- Built with Tailwind CSS v4, OKLCH color tokens, and React Aria primitives.
- Three specialized triage views:
  - **Table View**: Dynamic PillTab filters (All, Ready to Pitch, No Website, Local 3-Pack, Rank 4+, Unclaimed, Gold Vault), multi-column search, and batch actions.
  - **Kanban Pipeline**: Drag-and-drop progression (Discovered -> Contacted -> Replied -> Won -> Archived).
  - **Split View & Lead Dossier**: Interactive dossier with live audit scorecards, Google Maps preview, sales signal analysis, and 1-click tailored email pitch generator.

---

## Quickstart

### Prerequisites
- **Node.js** v20+ or v22+
- **npm** v10+

### 1. Clone the repository
```bash
git clone https://github.com/C0de-N1nja/Quarry.git
cd Quarry
```

### 2. Install dependencies
```bash
# Installs server and client dependencies
npm run install:all
```

### 3. Configure environment variables (optional)
```bash
cp .env.example .env
```
Quarry runs out of the box with embedded SQLite (`server/db/hunting.db`) in WAL mode. No external database server or SaaS subscription is required.

### 4. Start the platform
```bash
./run.sh
# or
npm run dev
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)

---

## Project Structure

```
Quarry/
├── client/                     # Vite + React 18 + Tailwind CSS v4 + BoardUI
│   ├── src/
│   │   ├── components/
│   │   │   ├── boardui/        # BoardLeadTable, LeadDossierPage, DashboardSidebar
│   │   │   ├── audit/          # ClientAuditReportModal, AuditPage
│   │   │   ├── KanbanBoard.jsx # Drag-and-drop stage pipeline
│   │   │   ├── SplitView.jsx   # Keyboard-friendly split triage
│   │   │   ├── LeadDrawer.jsx  # Detailed intelligence slide-out
│   │   │   └── SearchModal.jsx # Multi-country Maps Harvester modal
│   │   ├── styles/             # Tailwind v4 globals, OKLCH tokens, BoardUI CSS
│   │   ├── App.jsx             # Root layout and state orchestrator
│   │   └── main.jsx
│   └── vite.config.js
├── server/                     # Node.js + Express backend
│   ├── controllers/            # Lead, OSINT, audit, export, settings controllers
│   ├── routes/                 # REST API routes (/api/leads, /api/osint, /api/audit)
│   ├── services/
│   │   ├── maps-scraper-service.js   # Go binary Google Maps harvester & rank parser
│   │   ├── crawler-service.js        # Web & social presence resolver
│   │   ├── website-audit-service.js  # 26 sales signals & 9 tech stack auditor
│   │   ├── social-domains.js         # Country-scoped directory & social classifier
│   │   ├── osint-service.js          # Corporate registry & search dorking engine
│   │   ├── owner-osint-service.js    # Founder and decision maker extractor
│   │   ├── phone-service.js          # libphonenumber-js E.164 normalization
│   │   └── email-verifier-service.js # SMTP deliverability tester
│   ├── db/
│   │   ├── hunting.db          # SQLite production database (WAL mode)
│   │   ├── database.js         # better-sqlite3 connection manager
│   │   └── schema.sql          # Table definitions and migrations
│   └── server.js               # Express application entrypoint
├── run.sh                      # Unified launch script
├── package.json
└── README.md
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
