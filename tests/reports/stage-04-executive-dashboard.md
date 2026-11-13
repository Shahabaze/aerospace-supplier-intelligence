# Test Report – Stage 4: Executive Dashboard

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 4 – Application shell and Executive Dashboard  
**Date:** 2026-11-13  
**Tested by:** Claude (automated runs in a real browser), for review by ChatGPT and the Project Owner  
**Result:** **41 of 41 dashboard tests passed.** Regression: data layer 54 / 54, KPI engine 55 / 55. Responsive and console checks: 25 of 25 viewport and module combinations passed.

---

## 1. Scope

| Component | File |
|---|---|
| Application entry point | `index.html` |
| Start-up, navigation, error states | `src/js/app.js` |
| Module list and status | `src/js/modules.js` |
| Executive Dashboard view | `src/js/views/executive.js` |
| Planned-module page | `src/js/views/placeholder.js` |
| Formatting and chart helpers | `src/js/format.js`, `src/js/charts.js` |
| Theme and responsive layout | `src/css/app.css` |
| Self-hosted fonts (DEC-024) | `src/vendor/fonts/` |
| Tests | `tests/dashboard-tests.html`, `tests/dashboard-tests.js` |

Only the Executive Dashboard is built. The other four modules show a "planned" page with no figures.

## 2. Test Environment

| Item | Value |
|---|---|
| Browser | Google Chrome 153.0.8010.12 (headless), driven by Playwright |
| Served by | Local static web server (development sandbox only) |
| Viewports | 1440×900 desktop, 1024×768 laptop, 834×1112 tablet, 390×844 and 360×740 mobile (mobile emulation with touch) |

**Not tested, and not claimed:**

- **Firefox and Safari (WebKit):** the sandbox could not download these browser engines (download blocked), so cross-browser compatibility is untested.
- **Real phones and tablets:** mobile was tested with Chrome's mobile emulation at phone widths, not on physical devices.
- **The live GitHub Pages site:** not yet deployed. Planned for Stage 8.

## 3. What the Tests Prove

**Figures come from the KPI engine.** Every displayed figure carries the path of the KPI engine result it came from, for example `delivery.otdSnapshot`. The test page calculates the KPIs separately and checks all 34 tagged figures on the page against them, with no mismatches. The six headline values also match the independent expected values:

| Card | Shown | KPI engine path | Independent expected |
|---|---|---|---|
| Delivery Event OTD | 39.7% (25 of 63) | `delivery.otdSnapshot` | 39.68% |
| Late delivery events | 38 of 63 | `delivery.lateSnapshot` | 38 |
| Open PO commitment | $8.86M | `procurement.openCommitment` | $8,856,485.91 |
| Net active PO line value | $11.48M | `procurement.netActive` | $11,478,009.20 |
| Inspection rejection rate | 0.17% (5 of 2,997) | `quality.rejectionRate` | 0.1668% |
| On-hand inventory value | $2.63M | `inventory.onHandValue` | $2,634,675.00 |

**Not hardcoded.** The view is re-rendered from an in-memory copy of the data with one PO line cancelled. Net active value and open commitment drop by exactly that line's open value. Moving the as-of date changes the OTD shown from 39.7% to 38.4%.

**Approved definitions on screen.**

- The OTD card shows both bases (DEC-017).
- The net active card shows gross, cancelled and net values (DEC-019).
- Inventory counts use available stock and exclude SERVICE materials (DEC-018).
- Concentration uses net active value (DEC-023).
- No supported figure is labelled as spend, OTIF or a risk score.

**Data-quality warnings.** The pass banner and all 24 checks are shown. The DEC-017 warning lists exactly the 12 out-of-period events. The DEC-018 warning explains the two stock bases and lists MAT-010 and MAT-020. The DEC-019 note is present.

**Unsupported KPIs.** All 8 are listed with a reason and no figure.

**Navigation.** The five approved modules are listed, and only the Executive Dashboard is available.

- Each planned module opens a page that says it is not built and shows no figures.
- The active tab is marked, and focus moves to the page heading on navigation.
- An unknown address falls back to the Executive Dashboard.
- Keyboard: the first Tab reaches "Skip to content", and the module tabs can be reached and opened with Enter.

**Failure handling.**

- **Missing data files:** an error page lists all six files with HTTP 404 and shows no figures.
- **Validation failure:** a red alert banner appears, the failed check (C06) is listed and the check table is expanded. The title block marks validation as failed.
- **A KPI with no value:** "Not available" is shown with the reason, never 0.
- **Chart library unavailable:** a text message appears and the figures table remains.
- **Unsafe data-path parameter:** ignored.
- **HTML in the data:** escaped, not executed.

**Security.** The page makes no requests outside its own site. Application source contains no API keys or AI service addresses.

## 4. Responsive and Console Checks

All five modules were loaded at each of the five viewports (25 combinations):

| Check | Result |
|---|---|
| App reached ready state | 25 / 25 |
| No horizontal overflow | 25 / 25 |
| All five module tabs fully visible without scrolling | 25 / 25 (after fix, see section 6) |
| Browser console errors or warnings | None |
| KPI layout | 3 columns at 1440 and 1024, 2 at 834, 1 at 390 and 360 |
| Smallest text | 12.8 px (KPI references and notes) |

Expected console messages: the dashboard and data-layer test pages deliberately request missing files to test error handling, which produces "404 Not Found" messages. None occur on the dashboard itself.

## 5. Mutation Check (Do the Tests Catch Display Bugs?)

| Deliberate bug in `executive.js` | Tests that failed |
|---|---:|
| Net active card shows gross value | 2 |
| OTD figure hardcoded as "39.7%" | 2 |
| DEC-017 warning removed | 1 |
| Missing value displayed as if present | 1 |

All four were caught. The throwaway copy was discarded.

## 6. Issues Found and Fixed During This Stage

1. **Chart appeared empty in full-page screenshots.** Diagnosis: the data was correct (27.75%, 24.42%, …), but full-page capture resizes the page and restarts the chart animation. Screenshots are now taken with the browser's reduced-motion setting, which the dashboard respects by turning chart animation off. The chart drew correctly in an element screenshot taken under normal conditions.
2. **Supplier names clipped in the chart on phones.** On narrow screens the chart now shows supplier IDs only; full names remain in the figures table.
3. **Module tabs hidden at tablet and laptop widths.** At 834 px and 1024 px only 3–4 of 5 tabs were visible without sideways scrolling. Tabs now wrap onto a second row below 1180 px.

## 7. Remaining Issues and Notes

1. **Cross-browser and real-device testing are outstanding** (section 2).
2. **Headline selection.** The six cards follow the Project Owner's Stage 4 list. Critical supplier count (KPI 8.1, Priority 1 in the KPI Dictionary) appears in the Supplier base panel rather than as a headline card.
3. **Late delivery events headline** uses the snapshot-period basis to match the OTD headline; the full-dataset figure is shown underneath.
4. **Fonts (DEC-024)** were added as a new self-hosted dependency (about 120 KB, SIL OFL 1.1) and are recorded for Project Owner review.

## 7A. Successful-Load Verification (added after Project Owner review)

Run separately from the missing-file test, using the normal address with **no** `?data=` parameter. Every CSV request was recorded at network level.

| Check | A: repository root | B: GitHub Pages project-site layout |
|---|---|---|
| Address | `/index.html` | `/aerospace-supplier-intelligence/` |
| CSV requests | `/data/<file>.csv`, all six | `/aerospace-supplier-intelligence/data/<file>.csv`, all six |
| HTTP status | 200 for all six | 200 for all six |
| Bytes served match `origin/main` (SHA-256) | 6 / 6 | 6 / 6 |
| Rows loaded | 25 / 25 / 100 / 91 / 25 / 73 | 25 / 25 / 100 / 91 / 25 / 73 |
| App state | ready, no error panel | ready, no error panel |
| Validation | 17 of 17 controls passed | 17 of 17 controls passed |
| Headline values | 39.7%, 38, $8.86M, $11.48M, 0.17%, $2.63M | identical |
| Console errors | none | none |

Layout B serves the repository inside a sub-folder, in the same way GitHub Pages will publish it at `https://shahabaze.github.io/aerospace-supplier-intelligence/`. The application uses relative paths (`data/…`), so it loads correctly in both cases. This is a local simulation; the live site itself will be checked in Stage 8.

The automated dashboard test page also covers this separately: its first test opens the application normally and requires the ready state, and the missing-file test runs in its own frame with `?data=tests/no-such-folder/`.

Screenshot of the loaded dashboard from layout B: `executive-loaded-pages-path-1440.png`.

## 8. Screenshots

Stored in `tests/reports/screenshots/stage-04/`:

| File | Shows |
|---|---|
| `executive-loaded-pages-path-1440.png` | Full Executive Dashboard, all six CSV files loaded, GitHub Pages folder layout |
| `executive-desktop-1440.png` | Full Executive Dashboard, desktop |
| `executive-laptop-1024.png` | Laptop width |
| `executive-tablet-834.png` | Tablet width, wrapped tabs, 2-column KPIs |
| `executive-mobile-390.png`, `executive-mobile-360.png` | Phone widths, single column |
| `data-quality-expanded-1280.png` | Data-quality warnings expanded with event and material tables |
| `suppliers-desktop-1440.png`, `assistant-mobile-390.png` | Planned-module pages |
| `load-error-1280.png` | **Deliberate test:** error page when data files are missing (`?data=tests/no-such-folder/`). Not the normal state. |

## 9. Full Test List (dashboard-tests.html)

| # | Group | Test | Result |
|---|---|---|---|
| 1 | App | Application loads to the ready state with the Executive dashboard shown | PASS |
| 2 | Headline KPIs | Exactly six headline KPI cards, in the approved order | PASS |
| 3 | Headline KPIs | otd: shows 39.7%, taken from engine result delivery.otdSnapshot | PASS |
| 4 | Headline KPIs | late: shows 38, taken from engine result delivery.lateSnapshot | PASS |
| 5 | Headline KPIs | open-po: shows $8.86M, taken from engine result procurement.openCommitment | PASS |
| 6 | Headline KPIs | net-active: shows $11.48M, taken from engine result procurement.netActive | PASS |
| 7 | Headline KPIs | rejection: shows 0.17%, taken from engine result quality.rejectionRate | PASS |
| 8 | Headline KPIs | inventory: shows $2.63M, taken from engine result inventory.onHandValue | PASS |
| 9 | Headline KPIs | Every figure tagged on the page equals the KPI engine output (all fields) | PASS |
| 10 | Headline KPIs | Delivery Event OTD shows both bases: 39.7% (25/63) snapshot and 38.4% (28/73) full dataset | PASS |
| 11 | Headline KPIs | Net active card shows gross $12,550,378.20, cancelled −$1,072,369.00 and net $11,478,009.20 | PASS |
| 12 | Headline KPIs | No "NaN", "undefined" or "null" appears anywhere on the page | PASS |
| 13 | Labels | Title block shows reporting period, as-of date, validation and document versions | PASS |
| 14 | Labels | Synthetic-data statement is visible in header and footer | PASS |
| 15 | Labels | No supported figure is labelled as spend, OTIF or risk score | PASS |
| 16 | Data quality | Validation banner reports all checks passed | PASS |
| 17 | Data quality | DEC-017 warning lists the 12 events outside the reporting period | PASS |
| 18 | Data quality | DEC-018 warning explains the stock bases and lists MAT-010 and MAT-020 | PASS |
| 19 | Data quality | DEC-019 note about cancelled value is shown | PASS |
| 20 | Unsupported | All eight unsupported KPIs are listed with reasons and no figures | PASS |
| 21 | Supporting panels | Concentration panel shows 52.2% for the top two suppliers and a table summing to 100% | PASS |
| 22 | Supporting panels | Concentration chart is drawn with the engine figures | PASS |
| 23 | Supporting panels | Critical supplier count is 4 of 25 from the supplier master | PASS |
| 24 | Navigation | Navigation lists the five approved modules; only the Executive dashboard is available | PASS |
| 25 | Navigation | Clicking "suppliers" shows a planned-module page with no figures | PASS |
| 26 | Navigation | Clicking "procurement" shows a planned-module page with no figures | PASS |
| 27 | Navigation | Clicking "inventory" shows a planned-module page with no figures | PASS |
| 28 | Navigation | Clicking "assistant" shows a planned-module page with no figures | PASS |
| 29 | Navigation | AI assistant page states no AI service or API key is used | PASS |
| 30 | Navigation | Returning to the Executive dashboard redraws it with the same figures | PASS |
| 31 | Navigation | An unknown address falls back to the Executive dashboard | PASS |
| 32 | Security | The page makes no requests outside its own site | PASS |
| 33 | Security | Application source contains no API keys or AI service calls | PASS |
| 34 | Failure handling | Missing data files: an error page lists the six files and shows no figures | PASS |
| 35 | Failure handling | Unsafe data-path overrides are ignored | PASS |
| 36 | Failure handling | Validation failure: red alert banner, checks expanded, title block marked failed | PASS |
| 37 | Failure handling | A KPI that cannot be calculated shows "Not available" with the reason, not 0 | PASS |
| 38 | Failure handling | Chart library unavailable: a text fallback is shown and the table remains | PASS |
| 39 | Not hardcoded | Changing the source data changes the displayed figures | PASS |
| 40 | Not hardcoded | Moving the as-of date changes the snapshot OTD on screen | PASS |
| 41 | Not hardcoded | Text from the data is escaped (no HTML injection) | PASS |

---

*Synthetic demonstration data. Results describe software behaviour only, not the performance of any real supplier.*
