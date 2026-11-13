# Test Report – Stage 5: Supplier Performance

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 5 – Supplier Performance module  
**Date:** 2026-11-13  
**Tested by:** Claude (automated runs in a real browser), for review by ChatGPT and the Project Owner  
**Result:** **Supplier view 38 / 38. KPI engine 68 / 68 (13 new). Regression: Executive dashboard 40 / 40, data layer 54 / 54.** Responsive and console checks: 35 / 35 viewport and route combinations passed.

---

## 1. Scope

| Component | File |
|---|---|
| Supplier-level engine functions | `src/js/kpis.js`: extended `supplierProfiles`, new `scopeToSupplier`, `supplierDetail`, `supplierSegments`, `correctiveActionRegister`, `sampleSufficiency` |
| Supplier Performance view | `src/js/views/suppliers.js` |
| Charts | `src/js/charts.js`: `drawExposureChart`, `drawVarianceTimeline` |
| Navigation and supplier links | `src/js/app.js`, `src/js/modules.js` (`#/suppliers/SUP-xxx` opens a supplier) |
| Sample-size setting | `src/js/config.js`: `minimumSampleForRate = 3` (DEC-025, proposed) |
| Tests | `tests/supplier-tests.*`, additions to `tests/kpi-tests.js` and `tests/kpi-expected-values.js` |

Not changed: six CSV files, `docs/data-model.md`, KPI Dictionary formulas. Procurement Intelligence, Inventory Intelligence and the AI assistant remain planned pages.

## 2. What the Module Contains

| Section | Content | Source |
|---|---|---|
| Title block | Reporting period; 25 suppliers, 21 with deliveries in period; 63 / 73 delivered events; 73 inspections; validation; sample rule | KPI engine |
| Period banner | 10 delivered events fall after 31 Oct 2026 (DEC-017) | Validation notice N01 |
| Portfolio baseline | Delivery Event OTD on both bases, late events and variance, rejection rate, corrective actions by status | KPI 4.1–4.3, 5.1, 5.3–5.5 |
| Performance by criticality | Pooled OTD (both bases), inspected units, rejection rate, nonconformances, open CAs and net active PO share for Critical / High / Medium / Low | `supplierSegments` (criticality from suppliers.csv) |
| Delivery against PO exposure | Bubble chart of share of net active PO value against OTD, bubble size = events, pale = limited sample, portfolio line; suppliers not plotted are listed; data-derived statement about the top five exposure suppliers | KPI 6.4 and 8.4 |
| Supplier comparison | 13 columns; sort on any column (blanks always last); filters for criticality, qualification, certification, delivery sample and search; snapshot / full-dataset switch | KPI 8.4 profiles |
| Supplier detail | Supplier-master classification; OTD both bases with sample labels; late events and variance both bases; rejection rate, nonconformances, open CAs; net active value, share, open commitment, overdue lines; delivery-timing chart; full event list (out-of-period rows marked); inspection list with NCR and corrective-action status | `supplierDetail` = standard KPI functions applied to one supplier's records |
| Corrective-action register | All 4 corrective actions with NCR, defect, root cause, status, closure days | `correctiveActionRegister` |

**Analytical findings the module surfaces (all calculated from the data):**

- Critical suppliers hold **52.6%** of net active PO line value but account for **4 of 63** delivered events in the period, so their delivery performance rests on very little evidence.
- The five suppliers with the most net active PO value hold **80.3%** of it. On the snapshot basis, 2 of them (SUP-008, SUP-002) are below the portfolio OTD of 39.7%, 4 have fewer than 3 delivered events, and SUP-012 has none.
- Pooled OTD in period is lowest for Low-criticality suppliers (**25.0%**, only 4 events) and Medium-criticality suppliers (**29.4%**, 17 events), against 44.7% for High (38 events).

No composite risk score, rating or rank is produced.

## 3. Test Environment

| Item | Value |
|---|---|
| Browser | Google Chrome 153.0.8010.12 (headless), driven by Playwright |
| Served by | Local static web server (development sandbox only) |
| Viewports | 1440×900, 1024×768, 834×1112, 390×844 and 360×740 (phone emulation with touch) |

**Not tested, and not claimed:** Firefox and Safari (the sandbox cannot download them), real phones and tablets, and the live GitHub Pages site (Stage 8).

## 4. Results

### 4.1 Figures come from the engine and match independent values

- Profile, segment and corrective-action figures match the independent calculation for every supplier and every segment.
- `supplierDetail` (standard KPI functions scoped to one supplier) gives the same 11 figures as the profile for all 25 suppliers, so the detail and the table cannot disagree.
- Segment totals reconcile to the portfolio: 25 suppliers, 63 and 73 events, 2,997 units, 5 rejected, 4 nonconformances, 3 open CAs, 100% of net active value.
- Every OTD and rejection cell in the comparison table matches the engine profile.
- Detail figures on screen match `supplierDetail()` values.

### 4.2 Analytical rules

| Rule | Proven by |
|---|---|
| Segment OTD is pooled, not averaged | High: pooled 44.7% differs from the mean of supplier rates |
| Criticality from suppliers.csv | Changing `supplier_quality.supplier_criticality` in an in-memory copy changes nothing (engine and screen) |
| Blank is not zero | SUP-004, SUP-009, SUP-012, SUP-018 show "No data", never 0%; their detail shows "No data" and no chart |
| Sample labels (DEC-025) | 4 "No data" and 11 limited on the snapshot basis; tooltip "Limited sample: 1 record"; threshold changes labels only |
| Both bases | Switching to the full dataset changes all delivery columns (SUP-018 becomes 0.0%, n = 2) and the chart (22 plotted) |
| Not hardcoded | Marking one SUP-013 event on time in an in-memory copy changes its OTD from 50.0% to 75.0% |

### 4.3 Interaction

- **Sorting:** ascending and descending on OTD, net active share and others. Suppliers without data always sort last. `aria-sort` is updated.
- **Filtering:**
  - criticality, qualification, certification, delivery sample and search
  - focus stays in the search box while typing
  - a "no matches" message with a working "Clear filters" button
- **Selection:**
  - from the table, the chart or the corrective-action register
  - the address changes to `#/suppliers/SUP-xxx`, so a supplier can be bookmarked or shared
  - the selected row is highlighted and focus moves to the detail heading
  - a direct link opens the supplier on first load
  - an unknown ID shows a clear message
- **Keyboard:** sort buttons and supplier links work with Enter.

### 4.4 Responsive and console checks

| Check | Result |
|---|---|
| 7 routes × 5 viewports (Executive dashboard, Supplier performance, two supplier details, three planned pages) | 35 / 35 ready |
| Page-level horizontal overflow | None |
| All five module tabs visible | 35 / 35 |
| Console errors or warnings | None |
| Comparison table | Fits without scrolling at 1440 px. At 1024 px and below it scrolls sideways inside its frame with the supplier column pinned |

## 5. Mutation Check

Six deliberate bugs, introduced one at a time in a throwaway copy:

| Deliberate bug | Supplier tests failed | KPI tests failed |
|---|---:|---:|
| Blanks sorted first when descending | 2 | 0 |
| Segment snapshot OTD calculated from full-dataset events | 1 | 2 |
| Supplier criticality taken from supplier_quality | 1 | 1 |
| Sample threshold off by one (≤ instead of <) | 1 | 1 |
| Delivery-sample filter ignored | 4 | 0 |
| Missing rate displayed as 0.0% | 3 | 0 |

All six were caught by at least one suite.

## 6. Issues Found and Fixed During This Stage

1. **Log-scale chart clutter.** The exposure chart drew a gridline and rotated label at every minor tick. Ticks are now limited to 0.01%, 0.1%, 1%, 10% and 100%.
2. **Timing chart date range.** With one event, the date axis spanned 2022–2030. It now runs from the reporting-period start to the later of the as-of date and the last event.
3. **Plurals.** "1 events" and "−1 days" corrected to "1 event" and "−1 day".
4. **Focus outline on headings.** A heavy outline appeared when the detail heading received focus after a mouse selection. It now appears only for keyboard use.
5. **Comparison table too wide.** The table needed 339 px of sideways scrolling at 1440 px. Headings now wrap and sample tags show "n = 2", with the full wording in a tooltip and the legend. It now fits at desktop width.
6. **Comparison table cut off.** The table had a fixed height that hid rows. The limit was removed.

## 7. Items for Project Owner Decision

1. **DEC-025 (proposed): sample-size labels.** Fewer than 3 records = "limited", 0 = "No data". The threshold is configurable. Please approve or give another value.

## 8. Remaining Issues and Notes

1. Cross-browser, real-device and live-site testing are outstanding.
2. The bubble chart uses a logarithmic x-axis because shares range from 0.02% to 27.7%; the axis title says so.
3. Quality figures use all recorded inspections (as in Stage 3); none of the 10 inspections after the as-of date has a rejection.
4. Selecting a supplier re-renders the page and scrolls to the detail section; the table's filters and sort are kept.

## 9. Screenshots

In `tests/reports/screenshots/stage-05/`:

| File | Shows |
|---|---|
| `suppliers-overview-desktop-1440.png` | Full module, no supplier selected |
| `suppliers-overview-tablet-834.png`, `suppliers-overview-mobile-390.png` | Tablet and phone layouts |
| `comparison-filtered-high-sorted-otd-1440.png` | Comparison table filtered to High criticality, sorted by OTD ascending |
| `exposure-full-dataset-1440.png` | Exposure chart on the full-dataset basis |
| `supplier-detail-SUP-013-desktop-1440.png` (and tablet, phone) | Supplier detail with timing chart, events and inspections |
| `supplier-detail-SUP-004-no-data-1440.png` | Supplier with no delivered events: "No data" handling |

## 10. Full Test Lists

### Supplier view tests (supplier-tests.html)

| # | Group | Test | Result |
|---|---|---|---|
| 1 | Load | Supplier performance opens from the navigation with all data loaded | PASS |
| 2 | Load | Title block: 25 suppliers, 21 with deliveries in period; 63 / 73 events; 73 inspections | PASS |
| 3 | Load | Out-of-period caution banner is shown (DEC-017) | PASS |
| 4 | Baseline | Portfolio baseline figures equal the KPI engine | PASS |
| 5 | Segments | Criticality table matches the independent pooled figures | PASS |
| 6 | Segments | Insight states critical suppliers hold 52.6% of value with 4 of 63 events in period | PASS |
| 7 | Exposure | Chart plots the 21 suppliers with events in period; the 4 without are listed | PASS |
| 8 | Exposure | Top-five exposure statement is derived from the data | PASS |
| 9 | Comparison | Table lists all 25 suppliers by default, sorted by criticality | PASS |
| 10 | Comparison | Every row's OTD and rejection cells match the engine profile (snapshot basis) | PASS |
| 11 | Comparison | Sample labels: 4 "No data" and 11 "limited" OTD cells on the snapshot basis | PASS |
| 12 | Sorting | OTD ascending: lowest first, suppliers with no data last | PASS |
| 13 | Sorting | OTD descending: highest first, no-data suppliers still last | PASS |
| 14 | Sorting | Sorting by net active PO share puts SUP-007 first when descending | PASS |
| 15 | Sorting | sortProfiles never places blanks first in either direction | PASS |
| 16 | Filtering | Criticality = Critical shows the 4 critical suppliers | PASS |
| 17 | Filtering | Delivery sample = No data shows the 4 suppliers without in-period deliveries | PASS |
| 18 | Filtering | Qualification = Conditional and certification filters narrow the list | PASS |
| 19 | Filtering | Search matches name or ID, and focus stays in the search box while typing | PASS |
| 20 | Filtering | No matches: a clear message and a working "Clear filters" button | PASS |
| 21 | Basis | Switching to the full dataset changes delivery columns: SUP-018 shows 0.0% (n = 2, limited) | PASS |
| 22 | Detail | No supplier selected: the detail area invites a selection | PASS |
| 23 | Detail | Selecting SUP-013 opens its detail, updates the address and highlights the row | PASS |
| 24 | Detail | Detail figures equal supplierDetail() from the KPI engine | PASS |
| 25 | Detail | Detail shows supplier-master classification (criticality, qualification, certification) | PASS |
| 26 | Detail | Event and inspection lists are complete; out-of-period events are marked | PASS |
| 27 | Detail | Delivery-timing chart plots each delivered event (6 for SUP-013) | PASS |
| 28 | Detail | Supplier with no delivered events (SUP-004): "No data" and no chart, not 0% | PASS |
| 29 | Detail | Limited-sample supplier (SUP-008) is labelled in the detail | PASS |
| 30 | Detail | Unknown supplier in the address shows a clear message | PASS |
| 31 | Detail | A direct link to a supplier opens it on first load | PASS |
| 32 | Corrective actions | Register lists the 4 corrective actions; open ones are highlighted; selecting opens the supplier | PASS |
| 33 | Governance | No composite risk score, rating or rank appears anywhere on the page | PASS |
| 34 | Governance | No "NaN", "undefined", "null" or "Infinity" on the page | PASS |
| 35 | Rules | Material criticality in supplier_quality is ignored; supplier-master criticality is shown | PASS |
| 36 | Rules | Changing source data changes the supplier figures (not hardcoded) | PASS |
| 37 | Rules | Validation failure shows an alert on the supplier page | PASS |
| 38 | Rules | Supplier text from the data is escaped | PASS |

### New KPI engine tests (kpi-tests.html, group "Suppliers (Stage 5)")

| # | Test | Result |
|---|---|---|
| 1 | Profiles: snapshot late events, snapshot variance, in-transit, PO lines, open and overdue lines, net active value match for all 25 | PASS |
| 2 | Profile share of net active value equals KPI 6.4 concentration for every supplier | PASS |
| 3 | Profile overdue lines total equals KPI 4.4 (51) | PASS |
| 4 | Sample labels (DEC-025, minimum 3): 4 no data, 11 limited, 10 sufficient on the snapshot basis | PASS |
| 5 | Sample threshold is configurable and changes labels only, not rates | PASS |
| 6 | Criticality segments: pooled OTD, inspected units, rejections, nonconformances, open CAs and net active share | PASS |
| 7 | Segment OTD is pooled, not an average of supplier OTDs (High: 44.7%) | PASS |
| 8 | Segment totals reconcile to portfolio KPIs | PASS |
| 9 | Segments use suppliers.csv criticality, not supplier_quality.supplier_criticality | PASS |
| 10 | Corrective-action register lists the 4 required actions with status and closure days | PASS |
| 11 | supplierDetail uses the standard KPI functions: matches the profile for every supplier | PASS |
| 12 | scopeToSupplier keeps only that supplier's transactions and leaves the input unchanged | PASS |
| 13 | Unknown supplier returns null detail | PASS |

---

*Synthetic demonstration data. Results describe software behaviour only, not the performance of any real supplier.*
