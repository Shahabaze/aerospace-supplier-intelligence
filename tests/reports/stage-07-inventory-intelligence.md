# Test Report – Stage 7: Inventory Intelligence

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 7 – Inventory Intelligence (accelerated, essential scope)  
**Date:** 2026-11-14  
**Tested by:** Claude (automated runs in headless Chrome 153 via Playwright)  
**Result:** **Inventory view 17 / 17.** Regression: KPI engine 88 / 88, procurement 33 / 33, supplier 44 / 44, Executive dashboard 38 / 38, data layer 54 / 54. Responsive and console checks: 30 / 30 route and viewport combinations passed.

## 1. Scope Delivered

| Requirement | Delivered as | KPI |
|---|---|---|
| Total on-hand inventory value | $2.63M ($2,634,675.00), 23 physical materials | 7.1 |
| Available inventory value | $2.20M ($2,198,357.00); allocated $436,318.00 | 7.2 |
| Materials below reorder point | 10, on available stock; the Critical material among them is MAT-004 | 7.3 |
| Materials below safety stock | 5 (MAT-004, MAT-006, MAT-010, MAT-011, MAT-015) | 7.4 |
| Days of supply | Average 48.7 days, n = 23, range 4.8 to 164.8 days; per material in the table | 7.5 |
| Excess inventory value | $1.42M, 3 materials, supplied classification | 7.6 |
| Inventory status distribution | Supplied status (on-hand basis) shown beside stock position (available basis); MAT-010 and MAT-020 differ | 7.7, DEC-018 |
| Searchable, filterable material table | Filters: stock position, supplied status, category, material criticality, supplier criticality, show SERVICE, search. Sortable; default most urgent first, then lowest days of supply. Supplier links open the Stage 5 detail | — |
| Supplier and material criticality | Separate columns, separate sources. MAT-004 is a Critical material from a High-criticality supplier | — |
| Single-snapshot warnings | Banner and "not supported" list: no trend (7.8), no consumption history, no expiry calculation, Excess rule undocumented | 7.8 |

Engine addition: `inventoryRegister()` in `kpis.js`, one row per material. Existing KPIs 7.1 to 7.7 are unchanged.

**Not added:** new datasets, Data Model changes, CSV export, AI.

## 2. Tests

- **All figures:** the six KPI figures match the engine and the independent calculation. All 23 rows match on available stock, stock position, supplied status, both criticalities and value.
- **Filters:** every filter was tested. The SERVICE toggle shows 25 rows, with SERVICE marked "Excluded (SERVICE)". Search keeps focus. An empty result shows a message, and reset works.
- **Sorting:** by days of supply and by value, with `aria-sort` updated. Sorting also works with the keyboard.
- **Rules:**
  - lowering MAT-001's available stock in an in-memory copy changes "below safety stock" from 5 to 6
  - a $9 billion SERVICE value does not change any inventory KPI
  - a validation failure shows an alert
  - text from the data is escaped
- **Navigation:** a supplier link opens the Stage 5 detail. After moving through the modules, procurement sorting still works, so there is no cross-talk.
- **Mutation check:** three bugs were planted: stock position calculated on on-hand stock, SERVICE shown by default, and the criticality filter using the wrong source. All three were caught (5, 4 and 1 tests failed).

**Not tested:** Firefox, Safari, real devices and the live site. These are covered in Stage 8 as far as possible.

## 3. Screenshots

In `tests/reports/screenshots/stage-07/`:

- full page at 1440, 834 and 390 px
- KPI panel
- status bases
- material table filtered to material criticality Critical

*Synthetic demonstration data.*
