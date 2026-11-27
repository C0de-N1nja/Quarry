# Quarry

> **The all-in-one lead intelligence and outreach platform that finds local businesses with or without websites, audits their site health, verifies authentic owner contacts via deterministic OSINT, and generates tailored outreach in one click.**

![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Radar_Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Fast_Storage-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

---

## What is Quarry?

Most web designers and marketing agencies struggle to find clients because they waste time messaging businesses with generic templates without knowing what that business actually needs.

**Quarry solves this problem.** It searches Google Maps across your chosen city and industry to find high-rated local businesses (contractors, clinics, auto shops, restaurants) and splits them into two clear opportunities:
1. **Businesses with NO website**: Great local reputation, but completely missing an online home.
2. **Businesses WITH a website**: Actively getting traffic, but losing customers due to missing phone links, slow load times, or no online booking.

Then, Quarry verifies the business owner's direct phone number, email, and social profiles using a deterministic OSINT pipeline, audits their website health, benchmarks them against local competitors, and drafts tailored outreach inside **Quarry Pitch Studio** so you can close deals faster.

---

## What Quarry Does for You

### 1. Radar Business Scanner & Sector Expansion
- **Search Any City and Trade**: Pick a target region with recent-search history recall, choose a trade/category, set a search radius (`5 km` to `50 km`), and scan.
- **Sector Expansion (`+N` / `+S` / `+E` / `+W`)**: Expand your scan to adjacent geographic sectors with automatic lowercase business-name deduplication.
- **Direct Link & Phone Lookup Bar**: Paste a Google Maps URL, phone number (7+ digits), or business name to match local scanned prospects instantly or resolve a new target.
- **Interactive Leaflet Radar Map**: Visualizes the scan radius and prospects with color-coded circle markers (Selected in emerald, top-ranked Competitors in amber, Others in silver) and adaptive Dark/Light map tiles.

### 2. Opportunity Scoring & Competitive Benchmarking
- **Opportunity Score (0–100)**: Calculates lead opportunity based on website absence, review volume velocity, and star rating gaps.
- **Review Comparison Bars & Competitors Grid**: Compares the selected business against regional suburb averages and top-ranking local competitors.
- **Target Space Card**: Collapsible regional workspace with saved-lead counters, campaign strategy notes, and an interactive target checklist.

### 3. Deterministic OSINT Verification & Directory Filtering
- **Never Confuse Directories with Real Websites**: Aggregator listings on Yelp, YellowPages, Bark, Houzz, or social profiles are classified separately from official business domains.
- **Strict E.164 Phone Hard Gate**: Verifies social profiles using full E.164 equality (`country code + national number`) with cross-country guards so matching local digits in different countries never false-verify.
- **Directory Provenance Protection**: Discards phone numbers scraped from multi-business directory search or category listing pages.
- **Website Vouching with Brand Token Matching**: Extracts static owner-authored social links from verified business websites using distinctive brand root tokens while stripping share widgets and external agency/designer footer credits.
- **Resilient Host Rate Limiting**: Buckets request cooldowns by registrable domain (`eTLD+1`) with gradual cooldown relaxation and a 10-minute fail-fast backoff when anti-bot checkpoints are detected.
- For full scoring weights, thresholds, and state invariants, see [`docs/OSINT_ARCHITECTURE.md`](docs/OSINT_ARCHITECTURE.md).

### 4. "What's Missing" Website Health Audit
If a business already has a website or needs digital infrastructure diagnostics, Quarry highlights actionable gaps grouped by severity (**Critical**, **Warning**, **Info**):
- Missing official domain or invisible to AI discovery (ChatGPT / Perplexity).
- No tap-to-call phone links or mobile conversion CTAs.
- Low review volume velocity compared to local competitors.
- Missing structured `LocalBusiness` / `Service` schema markup.

### 5. Quarry Pitch Studio & Outreach Logging
- **Dual-Channel Composer**: Toggle seamlessly between **WhatsApp / Short** and **Email Format** (with editable Subject line).
- **7 Asset Focus Angles**: `Auto (Smart BI)`, `New Website`, `Redesign & Scale`, `E-Com/Online Sales`, `Online Booking`, `WhatsApp CRM`, and `Reviews & SEO`.
- **Top 5 Hook Styles**: Switch instantly between *Observation Hook*, *Cold Intro + Value*, *Competitor Gap*, *Problem -> Solution*, and *Ultra-Short Soft CTA*.
- **One-Click Dispatch & Logging**: Copy pitches, launch directly into WhatsApp (`wa.me`) or your Mail App (`mailto:`), and log outreach events (with required sender email confirmation for email dispatches) plus a live monospace-free **Email Signature Studio**.

### 6. Leads CRM & Dual Theme UI
- **Leads CRM (`/leads`)**: 12-column pipeline inspector with status filter pills (`New`, `Messaged`, `Replied`, `Won`, `Lost`), a **Group By** switcher (`Region`, `Category`, `Status`, `Flat`) with collapsible headers, Outreach History timeline, and interactive Tags & Notes editors.
- **Anti-Duplicate UX**: Selecting a business auto-marks it as *Reviewed*, and lead cards surface the *Last Contacted* channel and date to prevent multi-channel flooding.
- **Dark & Light Themes**: Switch between the `#050505` dark grid workspace and the `#f8fafc` light theme using the Sun/Moon toggle in the header, persisted in `localStorage`.

---

## How to Get Started

### What You Need
- **Node.js** (version 20 or newer; 22.x recommended)
- An internet connection

### 1. Download the Project
```bash
git clone https://github.com/C0de-N1nja/Quarry.git
cd Quarry
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Start the App
```bash
./run.sh
# or
npm run dev
```

- **Frontend UI (Next.js App Router):** [http://localhost:3000](http://localhost:3000)
- **Backend REST API (Express):** [http://localhost:5000](http://localhost:5000)

### Useful Scripts
- `npm run dev` — Starts the Express backend (`server`) and Next.js frontend (`client-next`) concurrently.
- `npm run dev:server` — Starts only the Express API server.
- `npm run dev:client` — Starts only the Next.js frontend (`client-next`).
- `npm run dev:vite-legacy` — Starts the legacy Vite client (`client`) if needed.
- `npm run build:client` — Builds the Next.js frontend for production.
- `npm run test:server` — Runs the backend & OSINT verification test suite (`node server/test/run-all.js`).

---

## Open Source Credits & Tool Attribution

Quarry leverages and integrates several battle-tested open source OSINT engines and developer utilities:

- **[Blackbird](https://github.com/p1ngul1n0/blackbird)**: Social account footprinting across 500+ networks.
- **[check-if-email-exists](https://github.com/reacherhq/check-if-email-exists)**: High-performance email MX deliverability verification binary by ReacherHQ.
- **[theHarvester](https://github.com/laramies/theHarvester)**: Passive domain infrastructure reconnaissance and subdomain discovery.
- **[WhatsLookup](https://github.com)**: WhatsApp presence and business metadata verification.
- **[Scrapling](https://github.com/D4Vinci/Scrapling)**: Stealth web scraping and anti-bot HTTP parsing.

All third-party tools retain their respective open-source licenses and copyrights.

---

## License

This project is licensed under the **MIT License**. Free to use and customize.
