# Test Report – Stage 6: Procurement Intelligence

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 6 – Procurement Intelligence (KPI Dictionary v2.3)  
**Date:** 2026-11-14  
**Tested by:** Claude (automated runs in a real browser), for review by ChatGPT and the Project Owner  
**Result:** **Procurement view 33 / 33. KPI engine 88 / 88 (20 new). Regression: Supplier performance 44 / 44, Executive dashboard 39 / 39, data layer 54 / 54.** Responsive and console checks: 30 / 30 viewport and route combinations passed.

---

## 1. Commits

| Step | Commit | Content |
|---|---|---|
| 1. Documentation | `b1b3447` | KPI Dictionary v2.3 (6.7, 6.8, 6.9, 4.4.1, 4.7; 6.5 label); Decision Log v2.5 (DEC-026 to DEC-032) |
| 2. KPI engine | `390f55e` | Procurement calculations and 20 KPI tests against independent values |
| 3. Interface | `fae6733` | Procurement Intelligence view, charts, navigation; supplier-view event fix |
| 4. Tests and report | This commit | Interface tests, screenshots, this report |

Not changed in any commit: the six CSV files and `docs/data-model.md`.

## 2. What the Module Shows

| Section | Content | KPI |
|---|---|---|
| PO value bridge | Gross $12,550,378.20 − cancelled $1,072,369.00 = net active $11,478,009.20 = received $2,621,523.29 + open $8,856,485.91; open = overdue $6,898,446.46 + not yet due $1,958,039.45. Three reconciliation lines, all "Reconciles" | 6.1, 6.1.1, 6.1.2, 6.7, 6.2, 6.8, 6.9 |
| Open commitment past promise | Overdue open value $6.90M (77.9% of open); 51 of 63 open lines overdue; 28 overdue with nothing received; oldest 327 days (POL-00003, SUP-003); average gross PO line value $125.5K | 6.8, 4.4, 4.4.1, 6.5 |
| Overdue ageing | 1–30 days: 4 lines, $914,291.60; 31–90: 10, $2,923,291.80; 91–180: 12, $2,197,476.06; over 180: 25, $863,387.00 | 4.4.1 |
| Supplier concentration | Pareto chart with cumulative share; 5 of 25 suppliers hold 80.3%; no HHI (DEC-028) | 6.4 |
| Commitment by segment | Material category, supplier criticality, tier, country. Critical suppliers hold 52.6% of net active value and **61.1% of overdue open value ($4,215,886.50)** | 6.1.2, 6.2, 6.8 grouped |
| Supplier commitment | Gross and net active side by side, default net active descending, cancelled, open, overdue, oldest overdue, average promise gap; links to the Stage 5 supplier detail | 6.3, 6.4, 6.2, 6.8, 4.7 (DEC-032) |
| Expediting register | All 63 open lines, most overdue first, with filters for due status, ageing bucket, supplier, material category, nothing received and search | 4.4, 4.4.1, 6.2 |
| Promised vs requested date | 66 later, 5 same, 29 earlier; average +2.5 days; range −3 to +8; labelled as current promise dates only | 4.7 (DEC-029) |
| Not supported | Invoiced spend (6.6), complete PO-line OTD (4.5), purchase price variance, savings / contract coverage / payment terms, alternate-source coverage | — |

CSV export is deferred (DEC-031) and is not present.

## 3. Test Environment

| Item | Value |
|---|---|
| Browser | Google Chrome 153 (headless), driven by Playwright |
| Served by | Local static web server (development sandbox only) |
| Viewports | 1440×900, 1024×768, 834×1112, 390×844, 360×740 (phone emulation with touch) |

**Not tested, and not claimed:** Firefox and Safari (the sandbox cannot download them), real devices, and the live GitHub Pages site (Stage 8).

## 4. Calculation Tests (KPI engine)

The expected values come from a separate script that reads the CSV files directly. It shares no code with `kpis.js`.

| Requirement | Evidence |
|---|---|
| **Bridge reconciles** | All three identities hold to the cent. Bridge values equal the existing KPIs 6.1, 6.1.1, 6.1.2 and 6.2 |
| **6.7 / 6.8 values** | $2,621,523.29; $6,898,446.46 (51 lines); not yet due $1,958,039.45 (12 lines); 77.9% |
| **Ageing buckets** | 4 / 10 / 12 / 25 lines with matching values; totals equal KPI 4.4 (51) and 6.8 |
| **Bucket boundaries** | Tested at −5, 0, 1, 30, 31, 90, 91, 180, 181 and 400 days. The function and the full calculation agree, and 0 days (promised on the as-of date) is "not yet due" |
| **Bucket definitions** | Exactly 1–30, 31–90, 91–180, 181+, contiguous and non-overlapping |
| **As-of date** | A line promised on the as-of date is not overdue; one day later it is 1 day overdue (1–30). At 31 Oct 2025 nothing is overdue. At 31 Dec 2026 the view re-ages every line |
| **Cancellation cases** | Zero, partial and full cancellation give gross 3,000, cancelled 1,300, net 1,700 = received 800 + open 900. A fully cancelled line never appears as open or overdue, even past its promised date |
| **Gap sign** | Promised after requested is positive; before is negative; a blank date is excluded and counted |
| **Supplier rows** | All 25 suppliers match on 12 figures. Default order is net active descending; share equals KPI 6.4; cumulative share reaches 100%; 5 suppliers reach 80% |
| **Segments** | All four groupings match and reconcile to net active and overdue totals |
| **Register** | 63 lines; first five POL-00003 (327 days), POL-00001 (325), POL-00009 (289), POL-00018 (280), POL-00002 (278); 28 overdue with nothing received |
| **Grain** | Adding duplicate delivery rows changes no procurement value |

## 5. Interface Tests

- **Figures equal the engine:**
  - all seven bridge figures, the headline figures, the ageing table and chart
  - Pareto order and cumulative share
  - gross and net per supplier, checked for all 25 against both the engine and the independent values
- **Supplier commitment table:**
  - default order is net active descending, with `aria-sort` marked
  - sorting by gross and by oldest overdue works, with blanks last; reset restores the default
  - filters work: Critical gives 4 suppliers; "no overdue lines", and search, also tested
  - the supplier link opens the Stage 5 detail
- **Expediting register:**
  - by default shows all 63 lines, most overdue first
  - every row's bucket tag matches its days past promise
  - overdue gives 51 lines and not yet due gives 12
  - each ageing bucket gives its count; choosing a bucket switches to overdue lines
  - "nothing received" combined with overdue gives 28
  - supplier, category and search filters work; sorting by value works
  - an empty result shows a message, and reset restores the default order
- **Wording and governance:**
  - the promise-gap text and limitation are present
  - the unsupported list contains no figures
  - no figure is labelled as spend
  - no HHI appears
  - no "NaN", "undefined" or "null" appears on the page
- **Failure handling:**
  - a bridge that does not reconcile shows a red alert
  - a validation failure shows an alert
  - text from the data is escaped
- **Not hardcoded:** fully cancelling POL-00083 in an in-memory copy removes it from the register (62 lines), lowers not-yet-due value by exactly its open value, and the bridge still reconciles.
- **Keyboard:** register sorting and supplier links work with Enter.

## 6. Mutation Check

Deliberate bugs, one at a time, in throwaway copies:

| Deliberate bug | Tests failed |
|---|---:|
| **Engine:** bucket edge 30 moved to 29 | 1 |
| **Engine:** over-180 bucket starting at 180 | 0 at first. The lookup took 91–180 first, so results were unchanged. A contiguity test was added and now catches it (1) |
| **Engine:** promised on the as-of date counted as overdue | 2 |
| **Engine:** open value including cancelled quantity | 1 |
| **Engine:** gap sign reversed | 2 |
| **Engine:** supplier rows sorted by gross | 1 |
| **View:** supplier table default sort by gross | 2 |
| **View:** register default sort by value | 3 |
| **View:** ageing filter ignored | 1 |
| **View:** bridge "overdue" bar showing open value | 1 |
| **View:** supplier link broken | 1 |
| **View:** supplier-view event isolation removed | 4 |

All twelve are now caught.

## 7. Responsive and Console Checks

| Check | Result |
|---|---|
| 6 routes × 5 viewports | 30 / 30 ready, no page overflow, all five module tabs visible |
| Console errors or warnings | None |
| Supplier commitment and register tables | Fit without scrolling at 1440 px; scroll sideways inside their frame, with the first column pinned, at 1024 px and below |
| Bridge on phones | Each bar moves under its label and value |
| Pareto chart on phones | 25 rotated supplier IDs; small but legible. Exact figures are in the supplier table |

## 8. Issues Found and Fixed During This Stage

1. **Event cross-talk between modules (real bug).** The Supplier performance view listened for clicks on any `data-sort` header in the page. The procurement tables reuse that attribute, so a click there could redraw the supplier view. Each view now acts only while its own content is shown. A regression test covers it.
2. **Register default would have hidden lines.** I initially defaulted the register to overdue lines only, which would hide the 12 not-yet-due lines. Changed before testing to all open lines, most overdue first, as specified.
3. **Untested bucket definition.** The over-180 bucket boundary could change without any test failing (see section 6). A test for contiguous, non-overlapping buckets was added.
4. **Version labels.** The Executive dashboard test and the footer still referred to KPI Dictionary v2.2; updated to read the version from configuration.

## 9. Remaining Issues and Notes

1. Cross-browser, real-device and live-site testing are outstanding (Stage 8).
2. SERVICE materials (MAT-018, MAT-021) appear in procurement figures and the register. This is correct: the KPI Dictionary excludes them only from inventory KPIs.
3. Received value includes receipts from the 10 delivery events dated after 31 Oct 2026 (DEC-017), as stated in the page banner and in KPI 6.7.
4. CSV export of the register is deferred (DEC-031).

## 10. Screenshots

In `tests/reports/screenshots/stage-06/`:

| File | Shows |
|---|---|
| `procurement-full-desktop-1440.png`, `-tablet-834.png`, `-mobile-390.png` | Full module at three widths |
| `bridge-1440.png` | PO value bridge with reconciliation lines |
| `ageing-1440.png` | Ageing chart and bucket table |
| `pareto-1440.png` | Supplier Pareto chart |
| `segments-by-criticality-1440.png` | Commitment by supplier criticality |
| `supplier-commitment-1440.png` | Supplier table, gross and net active, net descending |
| `register-over-180-nothing-received-1440.png` | Register filtered to over 180 days with nothing received |
| `promise-gap-1440.png` | Promised vs requested date |

## 11. Full Test Lists

### KPI engine tests (kpi-tests.html, group "Procurement (Stage 6)")

| # | Test | Result |
|---|---|---|
| 1 | 6.7 Received PO line value = $2,621,523.29 | PASS |
| 2 | 6.8 Overdue open PO value = $6,898,446.46 (51 lines); not yet due $1,958,039.45 (12 lines) | PASS |
| 3 | 6.9 Bridge: all three identities reconcile to the cent | PASS |
| 4 | 6.9 Bridge values equal the existing KPIs 6.1, 6.1.1, 6.1.2 and 6.2 | PASS |
| 5 | 4.4.1 Ageing: 4 / 10 / 12 / 25 lines with matching values; totals equal KPI 4.4 and 6.8 | PASS |
| 6 | Ageing boundaries: 0 not overdue; 1 and 30 → 1–30; 31 and 90 → 31–90; 91 and 180 → 91–180; 181 → over 180 | PASS |
| 7 | Ageing bucket definitions are contiguous, non-overlapping and match DEC-027 exactly | PASS |
| 8 | As-of date: a line promised on the as-of date is not overdue; one day later it is 1 day overdue | PASS |
| 9 | As-of date moved to 2025-10-31: nothing is overdue and all open value is not yet due | PASS |
| 10 | Cancellation cases: zero, partial and full cancellation reconcile and are treated correctly | PASS |
| 11 | A fully cancelled line past its promised date is not counted as overdue | PASS |
| 12 | 4.7 Promise-to-request gap: 66 later, 5 same, 29 earlier; mean +2.46 days; range −3 to +8 | PASS |
| 13 | 4.7 Sign: promised after requested is positive; before is negative; blank date excluded | PASS |
| 14 | Supplier commitment rows match independently for all 25 suppliers | PASS |
| 15 | Supplier rows: default order net active descending; share equals KPI 6.4; cumulative reaches 100%; 5 suppliers for 80% | PASS |
| 16 | Segments by category, country, tier and criticality match and reconcile to totals | PASS |
| 17 | Critical suppliers (suppliers.csv) carry $4,215,886.50 of overdue open value | PASS |
| 18 | Register: 63 open lines, most overdue first (POL-00003 327 days), 28 overdue with no receipt | PASS |
| 19 | Grain: extra delivery and inspection rows do not change any procurement value | PASS |
| 20 | 6.5 is labelled "Average gross PO line value" ($125,503.78) | PASS |

### Interface tests (procurement-tests.html)

| # | Group | Test | Result |
|---|---|---|---|
| 1 | Load | Procurement intelligence opens from the navigation with all data loaded | PASS |
| 2 | Load | Title block: 100 PO lines, 63 open; overdue measured at 31 Oct 2026; KPI Dictionary 2.3 | PASS |
| 3 | Load | Caution banner: out-of-period receipts and current promise dates only | PASS |
| 4 | Bridge | All seven bridge figures equal the engine and the independent values | PASS |
| 5 | Bridge | All three reconciliation lines show "Reconciles" | PASS |
| 6 | Headline | Overdue open value $6.90M (77.9% of open), not yet due $1,958,039.45 | PASS |
| 7 | Headline | Overdue lines 51 of 63; 28 with nothing received; oldest 327 days (POL-00003) | PASS |
| 8 | Headline | KPI 6.5 is labelled "Average gross PO line value" and shows $125.5K | PASS |
| 9 | Ageing | Ageing table: inclusive ranges, line counts and values match; totals 51 and $6,898,446.46 | PASS |
| 10 | Ageing | Ageing chart plots the four bucket values from the engine | PASS |
| 11 | Concentration | Pareto: 25 suppliers, largest first, cumulative ends at 100%; "5 of 25 suppliers hold 80.3%" | PASS |
| 12 | Segments | Material category is the default grouping: 21 categories, totals reconcile | PASS |
| 13 | Segments | Grouping by supplier criticality: Critical carries 61.1% of overdue open value | PASS |
| 14 | Segments | Grouping by tier and by country shows 2 and 22 groups | PASS |
| 15 | Supplier commitment | Default order: net active value, descending (DEC-032) | PASS |
| 16 | Supplier commitment | Gross and net active values side by side equal the engine for every supplier | PASS |
| 17 | Supplier commitment | Sorting by gross, then by oldest overdue (blanks last), then reset restores net descending | PASS |
| 18 | Supplier commitment | Filters: Critical → 4 suppliers; "No overdue lines" → suppliers with none; search by name | PASS |
| 19 | Supplier commitment | Supplier link opens the Stage 5 supplier detail | PASS |
| 20 | Register | Default: all 63 open lines, most overdue first | PASS |
| 21 | Register | Every row's bucket tag is consistent with its days past promise (boundaries inclusive) | PASS |
| 22 | Register | Due-status filter: 51 overdue, 12 not yet due | PASS |
| 23 | Register | Ageing filter: each bucket returns its count; choosing a bucket switches to overdue lines | PASS |
| 24 | Register | "Nothing received yet" with overdue shows the 28 lines; supplier, category and search filters work | PASS |
| 25 | Register | Sort by open value descending; no matches shows a message and reset restores 63 rows | PASS |
| 26 | Promise gap | Gap section: 66 later, 5 same, 29 earlier; average +2.5 days; current-promise limitation stated | PASS |
| 27 | Governance | Unsupported items listed without figures; no "invoiced spend" figure claimed | PASS |
| 28 | Governance | No "NaN", "undefined", "null" or "Infinity" on the page; no AI wording | PASS |
| 29 | Navigation | Supplier performance still works after visiting procurement (no event cross-talk) | PASS |
| 30 | Rules | Moving the as-of date to 31 Dec 2026 re-ages every line (not hardcoded) | PASS |
| 31 | Rules | Fully cancelling an open line removes it from the register and lowers open value | PASS |
| 32 | Rules | A bridge that does not reconcile shows an alert | PASS |
| 33 | Rules | Validation failure shows an alert; data text is escaped | PASS |

---

*Synthetic demonstration data. Results describe software behaviour only, not the performance of any real supplier.*
