# Quarry OSINT Subsystem Architecture Specification

Version: 1.1.0  
Status: Production Spec (Phase 0 Implemented)  
Engine: Quarry Universal Intelligence & Verification Engine

---

## 1. Executive Overview

The Quarry OSINT subsystem performs automated digital presence verification, contact extraction, and entity resolution for commercial leads. It determines whether a lead has an active standalone website, discovers and cross-verifies digital profiles across the web, extracts verified contact information, and resolves business ownership.

---

## 2. Canonical Scorer Specification & Weights Matrix

The entity-resolution scorer (`server/services/social-resolver-service.js`) uses a deterministic model with an exact hard verify rule gate and calibrated additive weights.

### Exported `WEIGHTS` Constant (Single Source of Truth)

```javascript
const WEIGHTS = {
  // Positive Scoring Signals
  PHONE_EXACT_NATIONAL: 50,          // Full national significant number match
  PHONE_FUZZY_WINDOW: 35,            // Last 8-10 digit partial window (scoring signal only)
  DOMAIN_MATCH: 45,                  // Profile outbound link matches verified lead domain
  NAME_SIMILARITY_HIGH: 25,          // Jaccard token similarity >= 0.75
  NAME_SIMILARITY_MEDIUM: 10,        // Jaccard token similarity 0.40 - 0.74
  CITY_MATCH: 20,                    // Profile explicitly mentions lead city
  COUNTRY_MATCH: 15,                 // Profile telephone/geo matches lead country
  DIRECTORY_CITATION_BONUS: 15,      // Verified dedicated directory telephone citation

  // Negative Signals / Penalties
  DOMAIN_MISMATCH: -35,              // Profile outbound domain conflicts with lead domain
  COUNTRY_CONFLICT: -25,             // Profile telephone/geo country conflicts with lead
  SINGLE_TOKEN_GENERIC_PENALTY: -20, // Only 1 generic token shared with low similarity

  // Decision Thresholds
  VERIFIED_SCORE_THRESHOLD: 60,      // Minimum score required to verify without hard gate
  REJECTED_SCORE_THRESHOLD: 10       // Score below which candidate is rejected
};
```

### Verification Decision Gates

1. **Trust Root (Website Vouching)**:
   - Outbound social links extracted directly from an authentic, verified business website's static HTML (`nav`, `footer`, `header`) score `100/100` and immediately resolve to `verified`.
   - Must pass `hasBrandTokenOverlap` against `lead.business_name` to eliminate web designer credit and widget leakage.

2. **Hard Veto (Rejection Guard)**:
   - If a candidate profile exhibits both a foreign phone country code AND a foreign address pattern (e.g. `US` phone and address pattern for an Australian lead), it is immediately marked `rejected` with score `0`.
   - If `features.domain_mismatch` AND `features.country_conflict` co-occur, the candidate is marked `rejected`.

3. **Hard Rule Gate (Full E.164 National Phone Match)**:
   - Compares full E.164 equality (`country code + national significant number`). Both country dialing code and national number must match. A foreign profile (e.g. `+64` NZ) matching the NSN of an Australian lead (`+61`) will strictly fail exact match and flag a country conflict.
   - Resolves directly to `state = 'verified'`, regardless of city or name fuzzy scores.
   - **Score/State Invariant**: Gate-verified leads may carry a numeric score below 60 (e.g. 50 points when city is null and name similarity is low). Downstream consumers, UI filters, and export pipelines gate strictly on `state === 'verified'`, never on numeric score thresholds.
   - **Provenance Rule**: The matched phone must originate from the profile's own contact fields (bio, JSON-LD, `tel:` link). On directory platforms, category or search listings containing multiple businesses fail provenance.
   - **Domain Conflict Co-occurrence**: If an exact phone match occurs alongside an outbound domain mismatch, the profile remains `verified` while writing `phone_match_with_domain_conflict: true` into the evidence log for audit.

4. **Fuzzy Scoring Gate**:
   - The partial 8-10 digit match (`PHONE_FUZZY_WINDOW = 35`) is strictly an additive signal and cannot trigger the hard verify gate.
   - Candidates without exact phone match must reach `score >= 60` with supporting signals (`features.domain_match` or `features.phone_fuzzy_match` combined with city, country, or name similarity).

5. **Login Wall & Error State**:
   - Any profile redirecting to `/login`, `/accounts/login`, or checkpoint screens resolves to `state = 'unverified'` with score `0`. It is never treated as negative proof.

---

## 3. Host-Level Adaptive Rate Limiter & Degraded Mode

All web and social fetches (`server/services/stealth-service.js`) pass through `HostRateLimiter`:
- **Registrable Domain (eTLD+1) Keys**: Buckets are keyed by eTLD+1 (`facebook.com`, `yahoo.com`, `yellowpages.com.au`), ensuring `m.facebook.com`, `web.facebook.com`, and `www.facebook.com` share the exact same rate budget.
- **Configurable Cooldown**: `SCRAPER_HOST_COOLDOWN_MS` (default `1500ms`, `25ms` in test mode).
- **Gradual Relaxation on 2xx**: On consecutive successful responses, the domain delay decays gradually by 250ms steps towards `baseDelayMs` rather than snapping to an instant reset.
- **Checkpoint Handling & Degraded Host Mode**: Upon detecting a login checkpoint or HTTP 429/403, the domain is marked degraded for 5–15 minutes (configurable via `SCRAPER_DEGRADED_COOLDOWN_MS`, default 10 minutes; 200ms in test mode). Subsequent requests to a degraded host fail fast immediately to avoid extending the IP ban.

---

## 4. Website Vouching Hardening

`vouchFromVerifiedWebsite(websiteUrl, lead)` enforces:
- **Element Stripping**: Completely strips `<script>`, `<style>`, `<iframe>`, `<noscript>`, `<svg>`, and elements with classes/IDs matching `share`, `widget`, `credit`, `designer`, `theme`, `author`.
- **Distinctive Brand Root Token Definition**: Brand root tokens are defined as non-stopwords, non-generic trade words with length >= 4 (e.g. "bloom" for "Bloom Agency", "finer" for "Finer Floors").
- **Vouching Order & Override**:
  - Pure widget/share patterns (`sharer`, `share.php`, `dialog`, `plugins`) are unconditionally dropped.
  - Suspicious agency patterns (`theme`, `developer`, `webdesign`, `agency`, `studio`) are dropped by default, **unless** the candidate handle carries the lead's distinctive brand token. A genuine agency lead (e.g. "Bloom Agency" with `facebook.com/bloomagency`) overrides the suspicious agency filter and vouches successfully. An unrelated lead (e.g. "Apex Plumbing" with `facebook.com/bloomagency`) is dropped.

---

## 5. Persistence & Consumer Safety

- **Data Model**:
  - `website_status`: Canonical status (`'no_website'`, `'has_website'`, or `'uncertain'`).
  - `has_no_website`: Derived strictly from `website_status`:
    - `1` when `website_status === 'no_website'`
    - `0` when `website_status === 'has_website'`
    - `NULL` when `website_status === 'uncertain'`
- **Evidence Versioning**:
  - `osint_evidence` and `social_evidence` include `schema_version: 1`.
- **Verified-Only Column Gate**:
  - Only candidates with `state === 'verified'` populate `leads.facebook_url`, `leads.instagram_url`, and top-level `social_profiles`.
  - Unverified candidates are quarantined within `social_evidence` JSON.

---

## 6. Strategic Roadmap

### Phase 1 (Near Term)
- **Golden Benchmark Dataset**: Hand-labeled fixtures (100-300 leads) covering exact phone + null city, agency-footer traps, and directory multi-listing traps.
- **Shared Per-URL Candidate Cache**: In-memory / SQLite URL cache to prevent redundant fetches of shared directory pages across leads in the same suburb.
- **Durable Task Queue**: Resumable per-lead state machine with crash recovery and dead-letter handling.
- **SERP Engine Health Metrics**: Per-engine telemetry (success/captcha rates) with automated 10-minute backoff and commercial fallback API integration.

### Phase 2 (Platform & Compliance)
- **Australian Privacy Act 1988 Compliance**: Retention policies, purpose-limitation logging, and lead data deletion workflows.
- **Target-Country Egress Proxies**: Geographically aligned proxy rotation to eliminate false country-conflict signals.
- **User Feedback Loop**: Incorporate manual user confirmations/rejections as training labels to calibrate scoring weights.
