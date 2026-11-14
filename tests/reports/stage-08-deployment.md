# Test Report – Stage 8: Deployment and Final Validation

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 8 – GitHub Pages deployment and live-site validation  
**Date:** 2026-11-14  
**Live URL:** https://shahabaze.github.io/aerospace-supplier-intelligence/  
**Deployed commit:** `c859478` (Stage 7). Pages source: `main` branch, `/ (root)` folder (DEC-015), enabled by the Project Owner.  
**Tested by:** Claude, against the public URL, in the Claude desktop app's built-in browser (Chromium-based, Chrome 156)  
**Result:** **Live site verified.** All 274 / 274 browser tests pass when served from the public URL. All six CSVs load, all 17 controls and 7 supplementary checks pass, every module and link works, the layout holds at mobile, tablet and desktop, and no keys or confidential information are exposed.

## 1. Data Loading (live)

| File | HTTP | Rows | SHA-256 vs `origin/main` |
|---|---|---|---|
| suppliers.csv | 200 | 25 | identical |
| materials.csv | 200 | 25 | identical |
| purchase_orders.csv | 200 | 100 | identical |
| delivery_transactions.csv | 200 | 91 | identical |
| inventory_snapshot.csv | 200 | 25 | identical |
| supplier_quality.csv | 200 | 73 | identical |

- No load errors. Validation: 17 / 17 controls and 7 / 7 supplementary checks; `allPassed: true`.
- Headline values on the live site match Stages 3 and 4: OTD 39.7% (snapshot basis), 38 late events, open PO value $8.86M, net active PO value $11.48M, rejection rate 0.17%, on-hand inventory $2.63M.
- Every request goes to `shahabaze.github.io`. There are no third-party requests: the fonts, Papa Parse and Chart.js are all self-hosted.

## 2. Automated Test Suites (run from the public URL)

| Suite | Result | Duration |
|---|---|---|
| Data layer | 54 / 54 | 1.1 s |
| KPI engine | 88 / 88 | 0.3 s |
| Executive dashboard | 38 / 38 | 1.3 s |
| Supplier performance | 44 / 44 | 1.5 s |
| Procurement intelligence | 33 / 33 | 3.2 s |
| Inventory intelligence | 17 / 17 | 0.8 s |
| **Total** | **274 / 274** | |

## 3. Modules, Navigation and Links

- **Routes:** these routes load with charts drawn and no `NaN` or `undefined` text:
  - `#/executive`
  - `#/suppliers`
  - `#/suppliers/SUP-013`
  - `#/procurement`
  - `#/inventory`
  - `#/assistant` (future-phase placeholder)
- An unknown route falls back to the Executive dashboard.
- **Interactions spot-checked live:**
  - Supplier OTD sorting works.
  - The Critical filter shows 4 suppliers.
  - The register's over-180-days filter shows 25 lines.
  - Every procurement bridge check passes.
  - The inventory below-safety-stock filter shows 5 materials.
- **Links:** all 31 internal links are valid. The 3 external links to the KPI Dictionary, Data Model and Decision Log open the correct pages on GitHub.

## 4. Responsive Layout (live)

| Viewport | Routes checked | Horizontal overflow | Navigation items visible | KPI grid |
|---|---|---|---|---|
| Mobile 375 × 812 | 6 | none | 5 / 5 | 1 column |
| Tablet 768 × 1024 | 6 | none | 5 / 5 | 2 columns |
| Desktop (pane width) | 6 | none | 5 / 5 | full grid |

The viewport emulation was reset to desktop after testing.

## 5. Console and Network

- A fresh load of the dashboard makes 28 requests and all 28 return HTTP 200. The network log shows no 404 for the app.
- The console showed "Failed to load resource: 404" entries. Each was traced to a known, non-app source:
  - **Before deployment finished:** the first request to the URL, made while GitHub Pages was still deploying, returned 404. The next request returned 200.
  - **From the test suites, by design:** the data-layer and dashboard tests request missing files on purpose. For example, they check that a missing `suppliers.csv` shows an "HTTP 404" error panel.
  - **From two manual probes:** two `favicon.ico` requests made during this check. The app itself uses an inline SVG icon and never requests `favicon.ico`.
- No JavaScript errors or warnings came from the app.

## 6. Security and Confidentiality

- Every same-origin JS, CSS, HTML and CSV file the live site serves (22 files, vendor libraries excluded) was scanned for these patterns: `api_key`, `secret`, `token`, `password`, `bearer`, and GitHub, OpenAI, AWS and Google key formats.
  - **Result:** the only match was the CSS comment "Tokens", which labels design tokens. It is not a credential.
- The repository was also scanned:
  - `git grep` on `origin/main` for the same key formats found nothing.
  - No `.env`, credential or key files are tracked.
- No API keys exist anywhere in the project. AI features are deferred.
- The data is synthetic, as the site footer states. No personal or confidential information is published.

## 7. Limits

- The live checks ran in one Chromium-based browser. Firefox, Safari and physical phones and tablets were not tested.
- Mobile and tablet results come from viewport emulation, not real devices.
- Screen-reader behaviour was not tested with assistive technology.
- GitHub Pages caching means a new push can take a few minutes to appear on the live site.
