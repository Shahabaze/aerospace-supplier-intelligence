# Test Report – Stage 3: KPI Engine

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 3 – KPI engine and browser-based KPI tests  
**Date:** 2026-11-13  
**Governing definitions:** KPI Dictionary v2.2 (including DEC-023: supplier concentration on net active basis)  
**Tested by:** Claude (automated run in a real browser), for review by ChatGPT and the Project Owner  
**Result:** **55 of 55 KPI tests passed.** Data-layer regression: **54 of 54 passed.**

---

## 1. Scope

| Component | File |
|---|---|
| KPI engine | `src/js/kpis.js` |
| Expected values (independent) | `tests/kpi-expected-values.js` |
| Test page | `tests/kpi-tests.html`, `tests/kpi-tests.js` |

Not in scope: dashboard screens (Stage 4 onwards).

## 2. How Expected Values Were Produced

Expected values were calculated by a separate script that reads the six CSV files directly and applies the KPI Dictionary formulas. It shares no code with `kpis.js`, so the tests compare two independent implementations. That script was run in the development sandbox only and is not part of the application (DEC-005, no Python in the project). Its output is stored in `tests/kpi-expected-values.js`.

## 3. Test Environment

| Item | Value |
|---|---|
| Browser | Google Chrome 153.0.8010.12 (headless), driven by Playwright |
| Served by | Local static web server (development sandbox only) |
| Data | Six unmodified CSV files in `data/` |

**Not yet tested:** other browsers, mobile devices and GitHub Pages (Stage 8).

## 4. KPI Results Verified

| KPI | Result | Basis / n |
|---|---|---|
| 4.1 Delivery Event OTD – snapshot period | **39.68%** (25 / 63) | Delivered on or before 2026-10-31 |
| 4.1 Delivery Event OTD – full dataset | **38.36%** (28 / 73) | All delivered events |
| 4.2 Late delivery events | 38 (snapshot) / 45 (full) | |
| 4.3 Average delivery variance | +2.83 (snapshot) / +2.92 (full) days | |
| 4.4 Overdue open PO lines | 51 of 63 open lines | As of 2026-10-31 |
| 5.1 Inspection rejection rate | 0.1668% (5 / 2,997) | Quantity-weighted |
| 5.2 Total rejected quantity | 5 | |
| 5.3 Nonconformance inspections | 4 | |
| 5.4 Open corrective actions | 3 | |
| 5.5 Average closure duration | 41 days, **n = 1** | |
| 5.7 DPM | 1,668.3 | |
| 6.1 Gross PO line value | $12,550,378.20 | 100 lines |
| 6.1.1 Cancelled PO line value | $1,072,369.00 | 17 lines |
| 6.1.2 Net active PO line value | $11,478,009.20 | |
| 6.2 Open PO commitment value | $8,856,485.91 | |
| 6.3 Supplier PO commitment (gross) | All 25 suppliers match | |
| 6.4 Supplier concentration (net active, v2.2) | All 25 match; SUP-007 27.75%, SUP-008 24.42%, SUP-002 14.49%; sum = 100% | Denominator $11,478,009.20 |
| 6.5 Average PO line value | $125,503.78 | |
| 7.1 On-hand inventory value | $2,634,675.00 | 23 physical materials |
| 7.2 Available inventory value | $2,198,357.00 | |
| 7.3 Below reorder point (available) | 10 materials | |
| 7.4 Safety stock breaches (available) | 5 materials | |
| 7.5 Average days of supply | 48.75 days | n = 23 |
| 7.6 Excess inventory value | $1,417,810.00 | Supplied classification |
| 7.7 Supplied status (on-hand basis) | Healthy 11, Below ROP 5, Safety Stock Breach 4, Excess 3 | |
| 8.1 Critical suppliers | 4 | suppliers.csv |
| 8.2 / 8.3 Qualification / certification | Distributions match | |
| 8.4 Supplier profile | All 25 suppliers match on every indicator; totals reconcile to overall KPIs | |
| Not supported (4.5, 4.6, 5.6, 6.6, 7.8, 8.5–8.7) | Listed with reason, no value | |

## 5. Governance Rules Proven by Tests

Each rule is tested by changing an in-memory copy of the data and checking the KPI behaves correctly:

- **Grain:** adding duplicate delivery and inspection rows does not change any PO value.
- **SERVICE exclusion:** a $9 billion SERVICE stock value does not affect inventory KPIs.
- **Available-stock basis:** changing allocation moves MAT-020 in or out of "below reorder point".
- **Blank is not zero:** a blank on-time flag leaves the OTD denominator; blank closure days are excluded, while a recorded 0 is included.
- **Weighted rejection rate:** the engine returns 0.1668% (Σ rejected ÷ Σ inspected), not the 0.1574% average of per-record percentages.
- **Supplier criticality from suppliers.csv:** changing `supplier_quality.supplier_criticality` has no effect.
- **Configurable as-of date** and the **as-of boundary** (an event on the as-of date is inside the period).
- **Concentration (DEC-023):** cancelling a whole SUP-007 line lowers its share; all shares still total 100%.
- **No data is not zero:** SUP-004, SUP-009 and SUP-012 (no delivered events) show blank OTD and rejection rate, not 0%. SUP-018 shows 0% full-dataset OTD but a blank snapshot OTD.
- **No composite risk score** field exists.
- **No mutation:** KPI functions leave their input unchanged; source CSV hashes are identical before and after.

## 6. Mutation Check (Do the Tests Catch Real Bugs?)

Seven deliberate bugs were introduced, one at a time, in a throwaway copy of `kpis.js`:

| Deliberate bug | Tests that failed |
|---|---:|
| Concentration calculated on gross value (old definition) | 5 |
| SERVICE materials not excluded from inventory | 5 |
| Rejection rate as average of record percentages | 2 |
| Snapshot uses "before" instead of "on or before" the as-of date | 1 |
| Suppliers with no data shown as 0% instead of blank | 4 |
| Below reorder point calculated on on-hand stock | 1 |
| Concentration: net numerator but gross denominator | 6 |
| *Control: no change* | *0* |

All seven bugs were caught. The throwaway copy was discarded.

## 7. Issues Found and Fixed During Testing

1. **One test was wrong, not the engine.** The first run gave 54 / 55. The rejection-rate method test required the two methods to differ by more than 0.01 percentage points; they differ by 0.0094 (0.1668% vs 0.1574%). The threshold was changed to 0.001, and the test now also asserts the 0.1574% value explicitly. No KPI code was changed.

## 8. Remaining Issues and Notes

1. **Quality KPIs use all recorded inspections.** DEC-017 set two bases for OTD only. Ten inspection records are dated after 2026-10-31; none of them has a rejection, so the rejection rate, DPM, nonconformance and corrective-action figures are the same either way. They are labelled "All recorded inspection events". No decision is needed unless you want a snapshot basis for quality too.
2. **KPI 4.2 and 4.3** are calculated on both bases for consistency with 4.1. The dashboard will label which one is shown.
3. **KPI 6.3** (supplier commitment) stays gross, as defined in the KPI Dictionary. Net active per supplier is also returned and is used for 6.4.
4. **KPI 7.5** excludes materials with zero or missing demand. None are excluded in the current data (n = 23).
5. Cross-browser and live-site testing are outstanding (Stage 8).

## 9. Full Test List

| # | Group | Test | Result |
|---|---|---|---|
| 1 | Setup | Data loads and all validation checks pass before KPIs are calculated | PASS |
| 2 | Delivery | 4.1 Snapshot-period Delivery Event OTD = 39.68% (25/63) | PASS |
| 3 | Delivery | 4.1 Full-dataset Delivery Event OTD = 38.36% (28/73) | PASS |
| 4 | Delivery | 4.1 labels state the basis and never call it OTIF or PO-line OTD | PASS |
| 5 | Delivery | 4.2 Late delivery events: 38 (snapshot) / 45 (full) | PASS |
| 6 | Delivery | 4.3 Average delivery variance: 2.83 (snapshot) / 2.92 (full) days | PASS |
| 7 | Delivery | 4.4 Overdue open PO lines = 51 of 63 open lines | PASS |
| 8 | Quality | 5.1 Inspection rejection rate = 5 / 2,997 = 0.1668% | PASS |
| 9 | Quality | 5.2 Total rejected quantity = 5 | PASS |
| 10 | Quality | 5.3 Nonconformance inspections = 4 | PASS |
| 11 | Quality | 5.4 Open corrective actions = 3 | PASS |
| 12 | Quality | 5.5 Average closure = 41 days with n = 1 shown | PASS |
| 13 | Quality | 5.7 DPM = 1,668.3 | PASS |
| 14 | Procurement | 6.1 Gross PO line value = $12,550,378.20 | PASS |
| 15 | Procurement | 6.1.1 Cancelled PO line value = $1,072,369.00 (17 lines) | PASS |
| 16 | Procurement | 6.1.2 Net active PO line value = $11,478,009.20 | PASS |
| 17 | Procurement | 6.1.2 equals 6.1 − 6.1.1 | PASS |
| 18 | Procurement | 6.2 Open PO commitment value = $8,856,485.91 | PASS |
| 19 | Procurement | 6.5 Average PO line value = $125,503.78 | PASS |
| 20 | Procurement | 6.3 Gross commitment per supplier matches for all 25 suppliers | PASS |
| 21 | Procurement | 6.4 (v2.2) Concentration uses net active value for all 25 suppliers | PASS |
| 22 | Procurement | 6.4 Denominator equals total net active PO line value, not gross | PASS |
| 23 | Procurement | 6.4 Top three: SUP-007 27.75%, SUP-008 24.42%, SUP-002 14.49% | PASS |
| 24 | Procurement | 6.4 Supplier percentages sum to 100% | PASS |
| 25 | Procurement | 6.4 Cancelled value is excluded from numerator (SUP-004: net $377,270 vs gross $690,370) | PASS |
| 26 | Procurement | No supported KPI is labelled as spend or invoiced value | PASS |
| 27 | Inventory | 7.1 On-hand inventory value (physical only) = $2,634,675.00, n = 23 | PASS |
| 28 | Inventory | 7.2 Available inventory value = $2,198,357.00 | PASS |
| 29 | Inventory | 7.3 Below reorder point (available basis) = 10 materials | PASS |
| 30 | Inventory | 7.4 Safety stock breaches (available basis) = 5 materials | PASS |
| 31 | Inventory | 7.5 Average days of supply = 48.75 days, n = 23 | PASS |
| 32 | Inventory | 7.6 Excess inventory value = $1,417,810.00 | PASS |
| 33 | Inventory | 7.7 Supplied status distribution (on-hand basis) is labelled and correct | PASS |
| 34 | Suppliers | 8.1 Critical suppliers = 4 | PASS |
| 35 | Suppliers | 8.2 Qualification distribution | PASS |
| 36 | Suppliers | 8.3 Certification distribution | PASS |
| 37 | Suppliers | 8.4 Profile figures match for all 25 suppliers | PASS |
| 38 | Suppliers | 8.4 Suppliers with no delivered events show blank OTD, not 0% (SUP-004, SUP-009, SUP-012) | PASS |
| 39 | Suppliers | 8.4 SUP-018: 0% full-dataset OTD but blank snapshot OTD (no events in period) | PASS |
| 40 | Suppliers | 8.4 Supplier totals reconcile to overall KPIs | PASS |
| 41 | Suppliers | No composite risk score is produced | PASS |
| 42 | Not supported | Unsupported KPIs are listed with a reason and no value | PASS |
| 43 | Rules | Grain: extra delivery and inspection rows do not change PO values | PASS |
| 44 | Rules | SERVICE exclusion: a large SERVICE stock value does not enter inventory KPIs | PASS |
| 45 | Rules | Available basis: reducing allocation (more available stock) clears a breach that on-hand status would not show | PASS |
| 46 | Rules | Blank is not zero: a blank on-time flag is excluded from the OTD denominator | PASS |
| 47 | Rules | Blank is not zero: blank closure days are excluded from the average | PASS |
| 48 | Rules | Rejection rate is quantity-weighted, not an average of record percentages | PASS |
| 49 | Rules | Supplier criticality comes from suppliers.csv, not supplier_quality.supplier_criticality | PASS |
| 50 | Rules | As-of date is configurable: moving it past all events makes snapshot OTD equal full OTD | PASS |
| 51 | Rules | As-of boundary: an event delivered on the as-of date is in the snapshot basis | PASS |
| 52 | Rules | Cancelling a whole PO line lowers that supplier's concentration and totals still sum to 100% | PASS |
| 53 | Rules | Empty input gives blank KPI values, not 0 | PASS |
| 54 | Rules | KPI functions do not modify their input | PASS |
| 55 | Source protection | Source CSV files are byte-for-byte unchanged after all tests | PASS |

---

*Synthetic demonstration data. Results describe software behaviour only, not the performance of any real supplier.*
