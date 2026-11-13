# Test Report – Stage 2: Data Layer

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 2 – Data loader, schema handling and validation controls  
**Date:** 2026-11-13  
**Tested by:** Claude (automated run in a real browser), for review by ChatGPT and the Project Owner  
**Result:** **54 of 54 tests passed**

---

## 1. Scope

| Component | File |
|---|---|
| Configuration | `src/js/config.js` |
| Schema (Data Model v2.0 field types, keys, SERVICE rule) | `src/js/schema.js` |
| CSV loader and type conversion | `src/js/data-loader.js` |
| 17 Data Model controls, 7 supplementary checks, 3 approved notices | `src/js/validation.js` |
| Pinned libraries | `src/vendor/papaparse-5.7.1.min.js` (used), `src/vendor/chart-4.6.1.umd.min.js` (added, used from Stage 4) |
| Test page | `tests/data-layer-tests.html`, `tests/data-layer-tests.js`, `tests/test-harness.js` |

Not in scope: KPI calculations and dashboard screens (later stages).

## 2. Test Environment

| Item | Value |
|---|---|
| Browser | Google Chrome 153.0.8010.12 (headless), driven by Playwright |
| Page served by | Local static web server (`python3 -m http.server`, development sandbox only, not part of the application) |
| Data | The six unmodified CSV files in `data/` |
| How to repeat | Open `tests/data-layer-tests.html` through any web server, or on GitHub Pages once deployed |

**Not yet tested:** other browsers (Firefox, Safari, Edge), mobile devices, and the GitHub Pages deployment. These will be tested when the dashboard is deployed (Stage 8).

## 3. Results Summary

| Group | Tests | Passed |
|---|---:|---:|
| Loading and source protection | 6 | 6 |
| Type conversion and blank handling | 7 | 7 |
| Loader negative tests (fixture files) | 4 | 4 |
| Controls on real data | 4 | 4 |
| Negative tests (one injected fault per check) | 24 | 24 |
| Approved data-quality notices | 8 | 8 |
| Source protection (final hash check) | 1 | 1 |
| **Total** | **54** | **54** |

Console output: 6 expected "404 Not Found" messages, produced on purpose by the test that loads from a non-existent folder to prove missing files are reported. No other errors.

## 4. Key Findings Confirmed by the Tests

- **All six files load**, row counts are 25 / 25 / 100 / 91 / 25 / 73, and headers exactly match Data Model v2.0.
- **All 17 Data Model controls pass** on the real data, and each one examined records (no empty passes).
- **All 7 supplementary checks pass** (schema conformance; PO quantity and value reconciliation; received ≤ shipped; variance and on-time flag; in-transit blanks; rejection rate and DPM).
- **Blank stays blank:** 310 blank cells are kept as blank (null), and 581 recorded numeric zeros stay 0. For example, DEL-00002 has a blank on-time flag but a recorded received quantity of 0.
- **SERVICE exclusion:** MAT-018 and MAT-021 are excluded; 23 physical inventory records remain.
- **DEC-017 notice:** exactly the 12 expected events (10 delivered and 2 shipped after 2026-10-31) are flagged. The boundary rule is tested: delivered on the as-of date counts as inside the period.
- **DEC-018 notice:** MAT-010 and MAT-020 are the two materials classified differently on the available-stock and on-hand bases.
- **DEC-019 notice:** 17 cancelled PO lines, $1,072,369.00.
- **Source files unchanged:** SHA-256 hashes of all six CSV files are identical before and after the test run. The commit diff shows no change to `data/*.csv`.

### Control results on the real data

| ID | Check | Reference | Records/values checked | Result | Note |
|---|---|---|---:|---|---|
| C01 | Primary keys unique | DM 8.1 | 339 | Pass | |
| C02 | Supplier references resolve | DM 8.2 | 314 | Pass | |
| C03 | Material references resolve | DM 8.3 | 289 | Pass | |
| C04 | Deliveries resolve to PO and PO line | DM 8.4 | 91 | Pass | |
| C05 | Delivery supplier/material agree with PO line | DM 8.5 | 91 | Pass | |
| C06 | Delivery receipts reconcile to PO received qty | DM 8.6 | 100 | Pass | |
| C07 | Delivery accepted + rejected = received | DM 8.7 | 91 | Pass | |
| C08 | Inspection accepted + rejected = inspected | DM 8.8 | 73 | Pass | |
| C09 | Inspection rejected reconciles to delivery | DM 8.9 | 73 | Pass | Also checks linked identifiers |
| C10 | Available = on-hand − allocated | DM 8.10 | 25 | Pass | |
| C11 | Inventory values = qty × cost | DM 8.11 | 50 | Pass | On-hand and available values |
| C12 | No negative quantities | DM 8.12 | 1,258 | Pass | All `*_qty` fields |
| C13 | Unit of measure consistent | DM 8.13 | 216 | Pass | |
| C14 | ISO dates | DM 8.14 | 678 | Pass | |
| C15 | Blank distinguishable from zero | DM 8.15 | 6,334 | Pass | 310 blanks kept blank; 581 zeros kept 0 |
| C16 | SERVICE excluded from physical inventory | DM 8.16 | 25 | Pass | MAT-018, MAT-021 excluded; 23 physical |
| C17 | Join cardinality supports grain-safe aggregation | DM 8.17 | 198 | Pass | 27 PO lines have multiple deliveries (max 4) |
| S00 | Schema conformance and typing | DM 5.1–5.6 | 6,334 | Pass | |
| S01 | PO ordered = received + cancelled + open | DM 5.3 | 100 | Pass | |
| S02 | PO line value = qty × price | DM 5.3 | 100 | Pass | |
| S03 | Received ≤ shipped | DM 5.4 | 91 | Pass | |
| S04 | Variance and on-time flag correct | DM 5.4 | 73 | Pass | Delivered events |
| S05 | In-transit blanks preserved | DM 5.4 | 18 | Pass | In-transit events |
| S06 | Rejection rate and DPM recompute | DM 5.6 | 73 | Pass | |

## 5. How We Know the Tests Can Fail (Mutation Check)

A test that always passes proves nothing. In a throwaway copy of the code, three deliberate bugs were introduced and the test page was re-run:

| Deliberate bug | Caught? |
|---|---|
| C06 never reports a reconciliation failure | Yes – C06 negative test failed |
| Loader converts blank numbers to 0 | Yes – 8 tests failed, including C15 |
| Snapshot rule uses "on or after" instead of "after" the as-of date | **Not caught on first run.** No real event falls exactly on 2026-10-31. Two boundary tests were added; the bug is now caught. |

The throwaway copy was discarded. The committed code is the unmodified version that passes 54/54.

## 6. Remaining Issues and Notes

1. **Supplementary checks are additions.** S00–S06 implement rules stated in Data Model v2.0 section 5 that are not in the section 8 list of 17 controls. They are labelled separately so the 17 controls remain traceable one-to-one.
2. **C09 also checks identifiers.** Besides rejected quantity, C09 confirms each inspection's PO, PO line, supplier and material agree with its linked delivery (Data Model 5.6 foreign keys).
3. **C17 is a structural check.** It confirms the join keys and cardinalities that make grain-safe aggregation possible. Whether KPI code actually aggregates correctly will be tested in Stage 3 (KPI engine).
4. **Cross-browser and live-site testing** are still outstanding (see section 2).
5. **Not pushed to GitHub yet.** Write access to the repository has not been granted. Commits are held locally and will be pushed unchanged once access is confirmed.

## 7. Full Test List

| # | Group | Test | Result |
|---|---|---|---|
| 1 | Loading | All six CSV files load without errors | PASS |
| 2 | Loading | Row counts match Data Model v2.0 (25/25/100/91/25/73) | PASS |
| 3 | Loading | Column headers exactly match the schema (no missing or extra columns) | PASS |
| 4 | Loading | Real data produces no loader errors or warnings | PASS |
| 5 | Loading | A missing file is reported as a load error, not ignored | PASS |
| 6 | Loading | Typed records are read-only (application cannot alter loaded data) | PASS |
| 7 | Typing | Identifiers stay as text | PASS |
| 8 | Typing | Numbers are converted to numbers | PASS |
| 9 | Typing | In-transit blanks stay blank (null), not zero | PASS |
| 10 | Typing | Recorded zeros stay zero | PASS |
| 11 | Typing | Blank shelf life stays blank; recorded shelf life is a number | PASS |
| 12 | Typing | Blank corrective-action closure days stay blank | PASS |
| 13 | Typing | convertValue unit cases | PASS |
| 14 | Typing | Date validation rejects non-ISO and impossible dates | PASS |
| 15 | Loader faults | Fixture: bad dates, non-numeric value, bad flag, blank required value and extra column are all reported | PASS |
| 16 | Loader faults | Fixture: valid blanks and zeros are preserved correctly | PASS |
| 17 | Loader faults | Fixture: missing column is reported | PASS |
| 18 | Loader faults | Loader errors make check S00 fail | PASS |
| 19 | Controls on real data | All 17 Data Model controls pass | PASS |
| 20 | Controls on real data | All supplementary Data Model section 5 checks pass (S00–S06) | PASS |
| 21 | Controls on real data | Every check actually examined records (no empty passes) | PASS |
| 22 | Controls on real data | C16 excludes exactly the two SERVICE materials | PASS |
| 23 | Negative tests | C01 detects: duplicate supplier record | PASS |
| 24 | Negative tests | C02 detects: PO line points to unknown supplier | PASS |
| 25 | Negative tests | C03 detects: inspection points to unknown material | PASS |
| 26 | Negative tests | C04 detects: delivery points to unknown PO line | PASS |
| 27 | Negative tests | C05 detects: delivery material disagrees with PO line | PASS |
| 28 | Negative tests | C06 detects: PO received quantity does not match deliveries | PASS |
| 29 | Negative tests | C07 detects: delivery accepted + rejected ≠ received | PASS |
| 30 | Negative tests | C08 detects: inspection accepted + rejected ≠ inspected | PASS |
| 31 | Negative tests | C09 detects: inspection rejected ≠ delivery rejected | PASS |
| 32 | Negative tests | C10 detects: available ≠ on-hand − allocated | PASS |
| 33 | Negative tests | C11 detects: inventory value ≠ qty × cost | PASS |
| 34 | Negative tests | C12 detects: negative shipped quantity | PASS |
| 35 | Negative tests | C13 detects: PO unit of measure differs from material master | PASS |
| 36 | Negative tests | C14 detects: non-ISO date in source text | PASS |
| 37 | Negative tests | C15 detects: blank cell wrongly converted to 0 | PASS |
| 38 | Negative tests | C16 detects: SERVICE material recorded as physical stock | PASS |
| 39 | Negative tests | C17 detects: two inspections linked to one delivery | PASS |
| 40 | Negative tests | S01 detects: PO quantities do not reconcile | PASS |
| 41 | Negative tests | S02 detects: PO line value ≠ qty × price | PASS |
| 42 | Negative tests | S03 detects: received more than shipped | PASS |
| 43 | Negative tests | S04 detects: wrong on-time flag for a late delivery | PASS |
| 44 | Negative tests | S05 detects: in-transit event carries an on-time flag | PASS |
| 45 | Negative tests | S06 detects: stored rejection rate does not recompute | PASS |
| 46 | Negative tests | Real data is unchanged after all negative tests | PASS |
| 47 | Notices | N01 (DEC-017) lists exactly the 12 events outside the 2026-10-31 snapshot | PASS |
| 48 | Notices | N01 boundary: an event delivered exactly on the as-of date is inside the snapshot period | PASS |
| 49 | Notices | N01 boundary: an event delivered one day after the as-of date is outside | PASS |
| 50 | Notices | N01 disappears when the as-of date is moved past all events (as-of date is configurable) | PASS |
| 51 | Notices | N02 (DEC-018) identifies MAT-010 and MAT-020 as classified differently on available vs on-hand basis | PASS |
| 52 | Notices | N02 never includes SERVICE materials | PASS |
| 53 | Notices | N03 (DEC-019) reports 17 cancelled lines worth $1,072,369.00 | PASS |
| 54 | Source protection | Source CSV files are byte-for-byte unchanged after all tests | PASS |

---

*Synthetic demonstration data. Test results describe software behaviour only, not the performance of any real supplier.*
