# Release Report – Stage 8 Finalisation: Command Centre (DEC-033) and Portfolio Release

**Project:** Aerospace Supplier Intelligence Platform  
**Date:** 2026-11-15  
**Live URL:** https://shahabaze.github.io/aerospace-supplier-intelligence/  
**Scope:** documentation and release finalisation only. No features were added and no modules were redesigned.  
**Result:** **304 / 304 tests pass, both locally and from the public URL.**

## 1. Documentation Changes

| File | Change |
|---|---|
| `docs/decision-log.md` | Version 2.5 → 2.6. **DEC-033** is added to the register, with detail in section 7.9: the Command Centre is the executive overview and navigation layer, not a sixth operational module; the five-module architecture (DEC-021) is unchanged; every figure must come from the validated KPI engine; existing module functionality and the synthetic-data disclosure are preserved. A one-line cross-reference is added under the DEC-021 detail. |
| `README.md` | The Command centre is described as the overview layer above the five modules (DEC-033) and removed from the module table. Usage text states that the Executive dashboard remains the landing page. The live-test statement now covers all 304 tests. |
| `docs/portfolio-guide.md` | The opener describes the Command centre as the overview and navigation layer. A new reviewer question is added: "Is the Command centre a sixth module?" |
| `src/js/modules.js` | Code comment only, aligned with DEC-033. No behaviour change. |

**Unchanged:** the six CSV files, Data Model v2.0, KPI Dictionary v2.3, the KPI engine, and all module views and styles.

## 2. DEC-033 Compliance (checked by the existing tests)

| Rule | Evidence |
|---|---|
| Figures come from the validated KPI engine | `tests/overview-tests.html` checks every ring, figure and chart against engine results and the independent values in `tests/kpi-expected-values.js` (24 tests). A planted fault, using full-period instead of snapshot OTD, was caught (Stage 8 Command Centre run). |
| Not a sixth module; five-module architecture unchanged | `MODULES` still holds the five DEC-021 modules. The Command centre is an extra menu entry. The Executive dashboard remains the default route (dashboard tests). |
| Existing module functionality preserved | The suites for the existing modules pass unchanged (data layer 54, KPI 88, dashboard 38, supplier 44, procurement 33, inventory 23). At 375px and 1280px, every module page is pixel-identical to the release before the Command centre. The only difference is the menu tab's position in the top pixel row. |
| Dark theme limited to the Command centre | Test "Dark theme applies to the Command Centre only" |
| Synthetic-data disclosure kept | "Synthetic data" in the Command centre header; the footer disclosure on every page (checked live, section 4) |

## 3. Regression Suite

| Suite | Local (headless Chrome, Playwright) | Live site (Claude desktop built-in browser, Chromium) |
|---|---|---|
| Data layer | 54 / 54 | 54 / 54 |
| KPI engine | 88 / 88 | 88 / 88 |
| Executive dashboard | 38 / 38 | 38 / 38 |
| Supplier performance | 44 / 44 | 44 / 44 |
| Procurement intelligence | 33 / 33 | 33 / 33 |
| Inventory intelligence | 23 / 23 | 23 / 23 |
| Command centre | 24 / 24 | 24 / 24 |
| **Total** | **304 / 304** | **304 / 304** |

The live run used the deployed application at commit `6734dcd`. That application code is identical to this release, which changes documents and one code comment. During the live run the browser pane was rendering at about 60 frames per second, so the scroll-dependent mobile tests ran with native scroll events.

## 4. Post-deployment Verification

Checked on 2026-11-15 against the public URL after commit `c9ebbd6` deployed. The deployed files contain the new `modules.js` comment and Decision Log v2.6 with DEC-033.

- **Landing page:** the root URL opens the Executive dashboard.
- **Menu:** Executive dashboard, Command centre, Supplier performance, Procurement intelligence, Inventory intelligence, AI procurement assistant.
- **All 7 pages:** load with no `NaN` or `undefined` text; the synthetic-data disclosure is in the footer of each.
  - Charts drawn: Executive 1, Supplier performance 1 on the list page and 2 on the SUP-013 detail, Procurement 3, Command centre 7.
  - Only the Command centre uses the dark theme.
- **Command centre values:**
  - rings: 39.7%, 77.9%, 80.3%, 10/23
  - figures: $11.48M, $8.86M, 38, 0.17%, $2.63M, 5
  - status "17 of 17 data checks passed"; header "Synthetic data"
- **Requests:** every request returned HTTP 200, all from `shahabaze.github.io`.
- **Release report:** reachable on the live site.

## 5. Outstanding Limitations

- **Browsers:** tested in Chromium-based browsers only. Firefox, Safari and physical phones and tablets were not tested; phone and tablet widths were emulated.
- **Assistive technology:** not tested with a screen reader.
- **Map:** country positions on the Command centre map are approximate country centres, not supplier sites. The world outline is decorative.
- **Deferred by decision:** the AI Procurement Assistant (DEC-022; future phase, needs a secure backend) and CSV export (DEC-031).
- **Not supported by the data, by design:** OTIF, invoiced spend, a composite supplier risk score and HHI. See KPI Dictionary section 8.
- **Synthetic data:** results describe an invented supply base and must not be read as real supplier performance.
- **Release review:** Stage 7 Inventory Intelligence is still awaiting the Project Owner's release review, as recorded at Stage 7.
