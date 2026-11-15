# Release Report – Dark HUD Design and Chart-first Presentation for All Modules (DEC-035)

**Project:** Aerospace Supplier Intelligence Platform  
**Date:** 2026-11-15  
**Commits:** `106e5e8` (feature and tests); documentation and screenshots in the following commit  
**Live URL:** https://shahabaze.github.io/aerospace-supplier-intelligence/  
**Result:** **324 / 324 tests pass locally** (headless Chrome via Playwright). **319 / 324 pass from the live site.** The other 5 need a browser window that is painting, and the browser pane used for live checks was hidden (section 4).

## 1. What Changed

| Area | Change |
|---|---|
| Theme | The dark HUD design now applies to every page, through one block of token overrides in `src/css/app.css`. Printed pages switch back to the light palette. |
| KPI cards | Each card gains a ring or split bar beside its value. Supporting lines fold under **Details**, keeping their text in the page; the caveat note stays visible. |
| Executive dashboard | Supplier-base lists become qualification and certification doughnuts. Selecting a supplier bar in the concentration chart opens that supplier. |
| Supplier performance | New chart: share of net active PO value against delivery OTD by criticality, with event counts in the labels. |
| Procurement intelligence | New chart: segment share of net active vs overdue value. Selecting an ageing bar filters the expediting register to that bucket. |
| Inventory intelligence | New charts: supplied-status doughnut (on-hand), stock-position doughnut (available), and days of supply by material. Each filters the material table when selected. |
| Command centre | Unchanged. |

Every table a chart replaces is still in the page under a toggle.

**Unchanged:** the CSV files, Data Model v2.0, KPI Dictionary v2.3, the KPI engine, filters, sorting and validation.

## 2. Governance Checks

- **KPI engine only:** visuals use engine results, or engine values the views already write into data attributes. They never read figures from page text.
- **Stage 7 conditions (DEC-034):** each caveat is a visible label next to its chart:
  - "On-hand basis, as supplied" on the supplied-status chart
  - "Available stock: on-hand minus allocated" on the stock-position chart
  - "Synthetic average daily demand, not a forecast. Single snapshot, no trend" on the days-of-supply chart

  SERVICE materials appear in no inventory chart. The KPI engine already blanks their stock fields, and the visuals layer filters them out again.
- **Fallback:** if Chart.js fails to load, card visuals still show and nothing is folded.

## 3. Tests

| Suite | Local | Live site |
|---|---|---|
| Data layer | 54 / 54 | 54 / 54 |
| KPI engine | 88 / 88 | 88 / 88 |
| Executive dashboard | 38 / 38 | 38 / 38 |
| Supplier performance | 44 / 44 | 44 / 44 |
| Procurement intelligence | 33 / 33 | 33 / 33 |
| Inventory intelligence | 23 / 23 | 22 / 23 |
| Command centre | 24 / 24 | 24 / 24 |
| Visuals (new) | 20 / 20 | 16 / 20 |
| **Total** | **324 / 324** | **319 / 324** |

**Mutation checks** (planted faults in a copy):

- **Caught:**
  - the "below safety stock" ring switched to the on-hand status count
  - the days-of-supply caveat removed
- **Not detectable:** removing the SERVICE filter from the visuals layer changed nothing visible. The engine already excludes SERVICE stock fields, so the mutation is equivalent. The test that SERVICE materials appear in no chart still guards the outcome.

**Problems found and fixed during testing:**

- **Page freeze:** a guard used an empty attribute value, which JavaScript treats as false. The procurement page re-added a chart hint endlessly and froze. Fixed, and the redraw watcher now limits itself to 25 passes per 200 ms rather than ever freezing the page.
- **Watcher shut-off:** the first version of that limit could switch the watcher off permanently in a background frame. Replaced with a time window.
- **Test timing:** two tests checked for a chart in the instant between a redraw and the enhancement pass queued right behind it. They now wait for the chart. The app was not affected, because the pass finishes before the browser paints.

## 4. Live-site Limitation

The live suite ran in the Claude desktop app's browser pane, which was hidden at the time: it rendered 0 frames per 500 ms. A hidden page delivers no scroll events, and Chart.js processes clicks only on an animation frame. The 5 tests that did not complete live are exactly these:

- the 4 chart-click filter tests (Visuals)
- the table scroll-shadow test (Inventory)

The scroll-shadow test passed from the live site on 2026-11-15 while the pane was visible. All 5 pass locally on identical code. They can be confirmed live by re-running `tests/visual-tests.html` and `tests/inventory-tests.html` in a visible browser window.

## 5. Screenshots

All 13 images in `assets/screenshots/` were recaptured in the new design, at the same sizes and framing as before.

## 6. Limits

- Tested in Chromium-based browsers only. Firefox, Safari and physical devices were not tested.
- Not tested with a screen reader. Charts carry text labels, and tables remain available under toggles.
- Synthetic data throughout.
