# Source Code Directory

Application source code for the Aerospace Supplier Intelligence Platform. The entry point is `index.html` in the repository root.

## Structure

| Path | Purpose |
|---|---|
| `css/` | Theme and responsive layout |
| `js/config.js` | Data file paths, reporting as-of date and labels |
| `js/schema.js` | Field types and keys from Data Model v2.0 |
| `js/data-loader.js` | Loads the six CSV files and converts types (blank stays blank) |
| `js/validation.js` | The 17 Data Model integrity controls and data-quality notices |
| `js/kpis.js` | KPI Dictionary implementations |
| `js/charts.js` | Chart helpers |
| `js/views/` | One file per dashboard module |
| `js/app.js` | Start-up, navigation and error display |
| `vendor/` | Pinned local copies of Papa Parse and Chart.js with licence files |

Files are added stage by stage; see the root `README.md` for current status.

## Development Principles

- Plain HTML, CSS and JavaScript, with no framework and no build step.
- Calculations are kept separate from display.
- Source CSV files are read-only.
- No API keys or credentials in browser code.
- No Python dependency.

See [`docs/architecture.md`](../docs/architecture.md).
