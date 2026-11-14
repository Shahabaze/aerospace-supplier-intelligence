# Project Decision Log
## Aerospace Supplier Intelligence Platform

**Document Version:** 2.4  
**Project Stage:** Phase 2 – Application Development  
**Repository:** aerospace-supplier-intelligence  
**Last Updated:** 2026-11-13

---

## 1. Purpose

This document records important project decisions, their rationale, approval status and implications.

GitHub is the single source of truth for approved project decisions.

Earlier decisions are never deleted. When a decision is replaced, its status changes to **Superseded** and the replacing decision ID is recorded, so the history stays traceable.

## 2. Decision Register

| ID | Decision | Rationale | Status |
|---|---|---|---|
| DEC-001 | Use GitHub as the central project repository | Version control and transparency | Approved |
| DEC-002 | Make the repository public | Professional portfolio visibility | Approved |
| DEC-003 | Use synthetic aerospace procurement datasets | Protect confidential information | Approved |
| DEC-004 | Prioritize free development tools | Maintain zero-cost initial development | Approved |
| DEC-005 | Avoid Python as an initial requirement | Build using browser-based and low-code tools | Approved |
| DEC-006 | Use ChatGPT as project architect and quality reviewer | Architecture and development guidance | Approved |
| DEC-007 | Use Claude as an independent implementation and review partner | Independent technical assessment | Approved |
| DEC-008 | Evaluate Google AI Studio for application development | Browser-based development approach | Superseded by DEC-013 |
| DEC-009 | Evaluate Gemini API for AI functionality | AI-powered procurement insights and chatbot | Deferred – see DEC-022 |
| DEC-010 | Evaluate Google Sheets for initial data storage | Accessible browser-based data management | Superseded by DEC-014 |
| DEC-011 | Develop six application modules | Cover core aerospace procurement intelligence requirements | Superseded by DEC-021 |
| DEC-012 | Require validation before accepting implementation changes | Maintain technical quality and reliability | Approved |
| DEC-013 | Build the application as a static HTML, CSS and vanilla JavaScript site with no build step and no framework | Runs entirely in the browser, needs no Python or server, and is easy to review and maintain | Approved |
| DEC-014 | Use the six CSV files in `data/` as the only data source, loaded by the browser at run time | Data Model v2.0 is implemented as CSV files; KPIs must be calculated from source, not hardcoded | Approved |
| DEC-015 | Host the application on GitHub Pages from the `main` branch, repository root | Free, integrated with the repository, suitable for a public portfolio | Approved |
| DEC-016 | Use Chart.js for charts and Papa Parse for CSV parsing, stored as pinned local copies with licence files | Free, open-source (MIT), no dependency on a third-party CDN at run time | Approved |
| DEC-017 | Delivery Event OTD is shown on two clearly labelled bases (see section 7.1) | Some source events fall after the 2026-10-31 snapshot; showing both is transparent and leaves source data unchanged | Approved |
| DEC-018 | Inventory KPIs use available stock; the supplied `inventory_status` is labelled as an on-hand-based classification (see section 7.2) | The supplied status and the KPI Dictionary use different stock bases | Approved |
| DEC-019 | PO value is shown as gross, cancelled and net active PO line value (see section 7.3) | Cancelled value must not be presented as active commitment | Approved |
| DEC-020 | Parse every CSV field as text and convert types explicitly from a schema; blank stays blank (null), never zero | Prevents silent conversion of blanks and identifiers; implements Data Model v2.0 control 15 | Approved |
| DEC-021 | Adopt a five-module application scope (see section 7.4) | Aligns modules with the KPIs the current data supports | Approved |
| DEC-022 | Start AI assistant work only after the core dashboard is completed and validated; any AI API must be called through a secure backend, never from browser code | Protects API keys and keeps AI output grounded in validated KPIs | Approved |
| DEC-023 | Supplier Concentration (KPI 6.4) uses Net Active PO Line Value in both numerator and denominator | Cancelled value is not active commitment and must not inflate a supplier's share (consistent with DEC-019) | Approved |
| DEC-024 | Self-host the Barlow and Barlow Semi Condensed web fonts (SIL Open Font License 1.1) in `src/vendor/fonts/`, with licence files `OFL-LICENSE-Barlow.txt` and `OFL-LICENSE-Barlow-Semi-Condensed.txt` | Consistent professional typography with tabular figures, no external font service, free licence | Approved (Project Owner, 2026-11-13) |
| DEC-025 | Label supplier-level rates by sample size: no records = "No data" (rate blank); fewer than 3 records = "limited" (rate shown with n); 3 or more = sufficient. Threshold configurable (`minimumSampleForRate`) | Supplier rates often rest on 1–2 events; users must see how much evidence is behind each figure. Display rule only, no KPI formula changes | Approved (Project Owner, 2026-11-14), threshold 3 |

## 3. Technology Decisions Pending Validation

The following decisions remain open:

- AI model and provider for the AI Procurement Assistant (Gemini remains a candidate, DEC-009).
- Secure backend for AI requests (for example, a serverless proxy) and its free-tier limits.
- AI response validation methodology.

Resolved by DEC-013 to DEC-016: frontend approach, data access, hosting platform and charting/parsing libraries.

No technology should be considered production-ready solely because it has been selected as a preference.

## 4. Development Governance Decisions

1. GitHub is the authoritative repository for approved project files.
2. Claude-generated code must be reviewed before acceptance.
3. ChatGPT will independently review architecture and implementation.
4. No confidential aerospace or supplier data will be used.
5. Every major implementation milestone requires validation.
6. API keys and credentials must never be committed to GitHub.
7. Changes to approved project decisions must be documented.
8. No paid services will be adopted without prior approval.
9. The six source CSV files must not be modified, renamed, deleted or regenerated by the application or by development work without a recorded decision.
10. Each major development stage is committed separately and accompanied by a test report in `tests/reports/`.
11. A feature is described as tested only when a test has actually been run and its result recorded.

## 5. Decision Change Procedure

When a project decision changes:

1. Identify the original decision ID.
2. Explain the reason for the change.
3. Document the alternative.
4. Evaluate technical and financial implications.
5. Obtain project owner approval.
6. Update this decision log.
7. Record the change in the project change history.

Previous decisions should remain traceable.

## 6. Initial Project Baseline

The initial baseline establishes:

- Public GitHub repository.
- Project README.
- Project Charter v1.0.
- Decision Log v1.0.
- Browser-based development preference.
- Synthetic demonstration data.
- Zero-cost initial development target.

## 7. Decision Details – Repository Audit, 2026-11-13

The following details support DEC-013 to DEC-022. They were approved by the Project Owner after the repository audit on 2026-11-13.

### 7.1 DEC-017 – Delivery events outside the reporting snapshot

**Finding:** The reporting period ends on the snapshot date, 2026-10-31. The source data contains 12 delivery events outside that period:

- 10 events with `delivery_status = Delivered` and `actual_delivery_date` after 2026-10-31 (latest 2027-01-31): DEL-00078, DEL-00079, DEL-00080, DEL-00081, DEL-00085, DEL-00086, DEL-00088, DEL-00089, DEL-00090, DEL-00091. Their linked inspection records are also dated after 2026-10-31.
- 2 events with `delivery_status = In Transit` and `shipment_date` after 2026-10-31: DEL-00082, DEL-00087.

These quantities also flow into `purchase_orders.received_qty`, `open_qty`, `po_status` and `inventory_snapshot.in_transit_qty`, so the files reconcile with each other but do not represent a pure as-of-2026-10-31 position.

**Decision:**

- All six CSV files remain unchanged. The application does not filter or alter source records silently.
- Delivery Event OTD is displayed on two labelled bases:
  - **Snapshot-period Delivery Event OTD (as of 2026-10-31):** delivered events with `actual_delivery_date` on or before 2026-10-31. Baseline: 39.68% (25 / 63).
  - **Full-dataset Delivery Event OTD:** all delivered events in the file. Baseline: 38.36% (28 / 73).
- A data-quality warning lists the 12 events outside the snapshot period.

**Alternatives considered:** filtering to the snapshot date only (rejected because PO and inventory files would then disagree), or regenerating the data (rejected; source data is the approved baseline).

### 7.2 DEC-018 – Inventory status basis

**Finding:** The supplied `inventory_status` values for all 23 physical materials match these on-hand rules exactly: `on_hand_qty < safety_stock_qty` → Safety Stock Breach; otherwise `on_hand_qty < reorder_point_qty` → Below Reorder Point. KPI Dictionary 7.3 and 7.4 use `available_qty`. The rule behind the supplied **Excess** classification is not documented and could not be reliably derived.

**Decision:**

- KPI calculations (materials below reorder point, safety stock breach count) use **available stock**, as defined in the KPI Dictionary. Baselines: 10 and 5 materials.
- The supplied classification is displayed as **"Supplied inventory status (on-hand basis)"**. Baselines: 5 Below Reorder Point and 4 Safety Stock Breach.
- The dashboard explains the difference: available stock excludes quantity already allocated to demand, so it is the stricter measure.
- The supplied Excess classification is used only as supplied (KPI 7.6) and is not recalculated.

### 7.3 DEC-019 – PO line value presentation

**Finding:** `line_total_usd` equals `ordered_qty × unit_price_usd`, including quantity that was later cancelled. All cancelled quantity in the current data sits on 17 fully cancelled PO lines.

**Decision:** Display three labelled figures:

| Label | Formula | Baseline |
|---|---|---|
| Gross PO line value | Σ `line_total_usd` | $12,550,378.20 |
| Cancelled PO line value | Σ (`cancelled_qty` × `unit_price_usd`) | $1,072,369.00 |
| Net active PO line value | Gross PO line value − Cancelled PO line value | $11,478,009.20 |

The KPI Dictionary is updated to define these measures. None of them represents invoiced or paid spend.

### 7.4 DEC-021 – Five-module scope

Replaces DEC-011. The application modules are:

1. **Executive Dashboard**
2. **Supplier Performance** – includes supplier profile and risk *indicators* (criticality, qualification, certification, delivery and quality indicators) shown individually.
3. **Procurement Intelligence**
4. **Inventory Intelligence**
5. **AI Procurement Assistant** – future phase, governed by DEC-022.

There is no standalone Supplier Risk Intelligence module. A composite supplier risk score is not introduced, consistent with KPI Dictionary 8.5.

### 7.5 DEC-023 – Supplier Concentration basis

**Decision (Project Owner, 2026-11-13):**

Supplier Concentration (%) = (Supplier's Net Active PO Line Value ÷ Total Net Active PO Line Value across all suppliers) × 100

- Net Active PO Line Value per line = `line_total_usd` − (`cancelled_qty` × `unit_price_usd`), so fully cancelled lines contribute zero.
- The same exclusion applies to numerator and denominator.
- Recorded in KPI Dictionary Version 2.2.
- Effect on current data: SUP-007 changes from 25.38% (gross) to 27.75% (net active); SUP-008 from 22.34% to 24.42%.

### 7.6 DEC-024 – Self-hosted fonts

**Decision (Project Owner, 2026-11-13):** approved on condition that the font licence is included in the repository and documented here.

| Item | Detail |
|---|---|
| Fonts | Barlow 400, 500, 600 and Barlow Semi Condensed 500, 600 (Latin subset, WOFF2, about 120 KB) |
| Location | `src/vendor/fonts/` |
| Licence | SIL Open Font License 1.1, free to use, embed and redistribute |
| Licence files | `src/vendor/fonts/OFL-LICENSE-Barlow.txt`, `src/vendor/fonts/OFL-LICENSE-Barlow-Semi-Condensed.txt` |
| Source | npm packages `@fontsource/barlow@5.3.0` and `@fontsource/barlow-semi-condensed@5.3.0`, files unmodified |
| Integrity | SHA-256 hashes listed in `src/vendor/fonts/README.md` |

### 7.7 DEC-025 – Sample-size labels for supplier-level rates

**Why:** in the current data, 4 suppliers have no delivered events in the snapshot period and 11 have only 1 or 2. Critical suppliers hold 52.6% of net active PO line value but account for 4 of 63 delivered events in the period. A rate such as "100% OTD" from one event must not look as reliable as a rate from six events.

**Rule:**

| Records behind the rate | Label | What is shown |
|---|---|---|
| 0 | No data | The rate is left blank (never 0%) |
| 1 to 2 | Limited sample | The rate, with an amber "n = …" tag |
| 3 or more | Sufficient | The rate |

- Delivery rates count delivered events on the selected basis; rejection rate counts inspection records.
- The threshold is a setting (`minimumSampleForRate` in `src/js/config.js`, default 3).
- This is a display rule. It does not change any KPI formula, and no supplier is excluded from any total.

**Status:** Approved by the Project Owner on 2026-11-14 with a minimum sample threshold of **3 records**.

**Approved rule, applied consistently to every supplier-level and supplier-group rate:**

| Records | Display |
|---|---|
| 0 | "No data". No rate is shown. |
| 1–2 | The calculated rate, with an amber **"Limited sample"** indicator |
| 3 or more | The calculated rate, with no limited-sample warning |

**Record count used for each metric:**

| Metric | Records counted for the rule | Also displayed |
|---|---|---|
| Delivery Event OTD (snapshot-period and full-dataset bases) | Delivered events on that basis | Numerator and denominator (events) |
| Inspection rejection rate | Inspection records with inspected quantity > 0 | Inspected quantity, as the rejection-rate denominator |

The threshold and the record type must be explained in a visible legend and in the tooltip of each indicator.

---

**Document Status:** Decision Register – Version 2.4  
**Approval Authority:** Project Owner
