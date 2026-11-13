# Testing Directory

Testing pages, fixtures and validation records for the Aerospace Supplier Intelligence Platform.

## How to Run the Tests

The test pages run in an ordinary web browser and show pass or fail for each check. No Python or command-line tools are needed.

- **Online:** open the test page from the GitHub Pages site, for example `…/tests/data-layer-tests.html`.
- **Locally:** the pages must be served by a local web server, because browsers block CSV loading from pages opened directly from disk.

## Contents

| Path | Purpose |
|---|---|
| `data-layer-tests.html` | Tests for CSV loading, type conversion, blank handling and the 17 validation controls |
| `kpi-tests.html` | Tests for the KPI engine against expected values (added in the KPI stage) |
| `fixtures/` | Small, deliberately faulty CSV files used to prove each control detects errors. The real data files are never altered |
| `reports/` | Test report for each development stage |

## Testing Principles

- Validate calculations against source datasets and independently calculated expected values.
- Use synthetic demonstration data only.
- Document identified defects.
- Retest fixes before approval.
- Never claim functionality is operational without a recorded, successful test.
