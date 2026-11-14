# Technical Architecture
## Aerospace Supplier Intelligence Platform

**Document Version:** 2.0  
**Project Stage:** Phase 2 – Application Development  
**Status:** Approved Architecture (Project Owner approval, 2026-11-13)  
**Supersedes:** Version 1.0 (Initial Architecture Proposal)  
**Related Decisions:** DEC-013 to DEC-022 in `docs/decision-log.md`

---

## 1. Architecture Overview

The platform is a **static web application**: plain HTML, CSS and JavaScript files that run entirely in the visitor's browser.

- **No build step, no framework, no server and no Python.** The files in the repository are exactly the files the browser runs.
- **Hosting:** GitHub Pages, serving the `main` branch from the repository root (DEC-015).
- **Data:** the six CSV files in `data/`, loaded by the browser each time the page opens (DEC-014). KPIs are calculated live from these files and are never hardcoded.
- **Governing documents:** `docs/data-model.md` (v2.0) defines datasets, fields and validation controls. `docs/kpi-dictionary.md` (v2.3) defines every KPI formula.

In plain language: when someone opens the website, their browser downloads the six CSV files, checks them, calculates the KPIs and draws the dashboard. Nothing is sent anywhere else.

## 2. Logical Layers

```text
┌───────────────────────────────────────────────────────────────┐
│ 1. Presentation layer   index.html · src/css · src/js/views    │  Dashboards, charts, labels, warnings
├───────────────────────────────────────────────────────────────┤
│ 2. KPI layer            src/js/kpis.js                         │  One function per KPI Dictionary ID
├───────────────────────────────────────────────────────────────┤
│ 3. Validation layer     src/js/validation.js                   │  17 Data Model controls + data-quality notices
├───────────────────────────────────────────────────────────────┤
│ 4. Data layer           src/js/data-loader.js · schema.js      │  Load CSVs, convert types, keep blanks as null
├───────────────────────────────────────────────────────────────┤
│ 5. Source data          data/*.csv  (read-only)                │  Six approved CSV files
└───────────────────────────────────────────────────────────────┘
          (Future) 6. AI layer – secure backend, see section 8
```

Each layer only uses the layer beneath it. Calculations never happen in the presentation layer, so every displayed number can be traced to a KPI function and its dictionary ID.

## 3. Repository Structure

```text
aerospace-supplier-intelligence/
├── index.html                 Application entry point (GitHub Pages serves this)
├── .nojekyll                  Tells GitHub Pages to serve files unchanged
├── data/                      Six source CSV files (read-only) + README
├── docs/                      Governance documents
├── src/
│   ├── css/app.css            Theme and responsive layout
│   ├── js/
│   │   ├── config.js          Data file paths, reporting as-of date, labels
│   │   ├── schema.js          Field types and keys from Data Model v2.0
│   │   ├── data-loader.js     Loads and types the six CSV files
│   │   ├── validation.js      17 integrity controls and data-quality notices
│   │   ├── kpis.js            KPI Dictionary implementations
│   │   ├── charts.js          Chart.js helpers
│   │   ├── format.js          Display formatting only (blank shown as "Not available")
│   │   ├── modules.js         The five approved modules and their status
│   │   ├── views/             One file per dashboard module (executive.js, suppliers.js, placeholder.js)
│   │   └── app.js             Start-up, navigation and error display
│   └── vendor/                Pinned Chart.js, Papa Parse and fonts + licence files
├── tests/
│   ├── data-layer-tests.html  Browser test page for the data layer
│   ├── kpi-tests.html         Browser test page for the KPI engine
│   ├── dashboard-tests.html   Browser test page for the dashboard screens
│   ├── supplier-tests.html    Browser test page for Supplier Performance
│   ├── fixtures/              Small deliberately faulty CSV files for negative tests
│   └── reports/               Test report for each development stage
└── assets/                    Screenshots and images
```

Files are added stage by stage; not all of them exist yet. See `README.md` for current status.

## 4. Data Layer

**Loading.** `data-loader.js` fetches the six CSV files listed in `config.js` and parses them with Papa Parse.

**Typing.** Papa Parse's automatic type conversion is switched off. Every value is read as text, then converted using the field types in `schema.js`, which mirror Data Model v2.0 (DEC-020):

| Data Model type | Conversion | Blank value |
|---|---|---|
| String | Kept as text | `null` |
| Date | Checked against `YYYY-MM-DD`, kept as text for exact comparison | `null` |
| Decimal / Integer | Converted to a number; anything non-numeric is reported as an error | `null` (never 0) |
| Nullable Integer/Boolean (`on_time_flag`) | `1` / `0` | `null` |

**Errors.** A missing file, a missing column or a value that cannot be converted is reported on screen and in the validation results. The application does not guess.

**Source protection.** The application only reads the CSV files. It cannot write to them.

## 5. Validation Layer

`validation.js` implements all 17 controls in Data Model v2.0 section 8. Each control returns a structured result:

```text
{ id, title, status: "pass" | "warn" | "fail", checked, failures: [ { dataset, key, detail } ] }
```

It also produces **data-quality notices** for approved, documented conditions that are not control failures. For example, DEC-017 lists the 12 delivery events outside the 2026-10-31 snapshot period. Results are shown in a Data Quality panel so reviewers can see that the data was checked before any KPI is shown.

## 6. KPI Layer

`kpis.js` contains pure functions. Each one takes typed data and returns a result. None of them touch the screen. Each result includes:

```text
{ kpiId, label, value, unit, numerator, denominator, n, basis, asOfDate, status, limitation }
```

Rules applied by the KPI layer, all taken from the governing documents:

- Respect source grain; aggregate PO values from `purchase_orders.csv` only, before any join.
- Delivery Event OTD on two labelled bases (DEC-017); never labelled OTIF or PO-line OTD.
- Inventory KPIs exclude `unit_of_measure = SERVICE` and use available stock (DEC-018).
- PO value shown as gross, cancelled and net active (DEC-019).
- Supplier criticality from `suppliers.csv` only.
- Rejection rate = Σ rejected ÷ Σ inspected, never an average of percentages.
- KPIs marked "Not supported" in the dictionary are shown as not supported, with the reason, never estimated.
- No composite supplier risk score (KPI Dictionary 8.5).

## 7. Presentation Layer and Modules

The application has five modules (DEC-021):

| # | Module | Content | Phase |
|---|---|---|---|
| 1 | Executive Dashboard | Priority 1 KPIs (KPI Dictionary section 10) | 2 |
| 2 | Supplier Performance | Priority 2 KPIs, supplier profile and risk indicators shown individually | 2 |
| 3 | Procurement Intelligence | Priority 3 KPIs | 2 |
| 4 | Inventory Intelligence | Priority 4 KPIs (physical materials only) | 2 |
| 5 | AI Procurement Assistant | Natural-language questions grounded in validated KPI results | 3 (future) |

Presentation rules:

- Every KPI tile shows its exact label, value, denominator or record count, as-of date or basis, and a short limitation note.
- A permanent banner states that all data is synthetic.
- A Data Quality panel shows validation results and approved notices.
- A "Not supported by current data" panel lists unsupported KPIs and the reason for each.
- Responsive layout for desktop and mobile; charts include text labels and do not rely on colour alone.

**Libraries (DEC-016).** Chart.js and Papa Parse are stored as pinned local copies in `src/vendor/`, with their MIT licence files. The site works without any third-party CDN. Fonts (Barlow, Barlow Semi Condensed, SIL OFL 1.1) are self-hosted in `src/vendor/fonts/` (DEC-024).

## 8. AI Layer (Future – DEC-022)

The AI Procurement Assistant is not part of the current build. When it starts:

- The browser sends questions to a **secure backend** (for example, a serverless function). Only the backend holds the AI API key. No key ever appears in browser code or in this repository.
- The backend receives validated KPI results from the KPI layer as context, so answers are grounded in calculated figures.
- AI responses must distinguish source values, rule-based calculations and AI interpretation, and must not invent supplier performance results.

The provider, backend platform and free-tier limits will be decided and recorded in the decision log before work begins.

## 9. Testing Approach

- **Browser-based tests.** Test pages in `tests/` run in an ordinary browser and show pass or fail for each check. No Python or command-line tools are needed to run them.
- **Expected values** come from an independent calculation recorded during the repository audit, and are checked against the JavaScript results.
- **Negative tests** use small, deliberately faulty CSV files in `tests/fixtures/` to prove that each control detects the problem it is meant to detect. The real data files are never altered.
- **Stage reports.** Each development stage has a test report in `tests/reports/` stating what was tested, how, and the result.

## 10. Local Preview and Deployment

- Browsers block a page opened directly from disk (a `file://` address) from loading CSV files. Previews therefore use a local web server during development, and the live site uses GitHub Pages.
- Deployment: GitHub Pages → Source: `main` branch, `/ (root)` folder.

## 11. Security

- The application holds no credentials and calls no paid service.
- `.gitignore` excludes `.env` files; no secrets may be committed.
- Only synthetic data is used.
- Third-party code is limited to two pinned, open-source libraries.

## 12. Change Control

Changes to this architecture must be recorded in `docs/decision-log.md` before implementation.

---

**Document Status:** Approved Architecture – Version 2.0  
**Document Owner:** Project Owner  
**Architecture Review:** ChatGPT and Claude  
**Repository:** aerospace-supplier-intelligence
