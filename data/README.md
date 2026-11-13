# Data Directory

This directory contains the six synthetic aerospace procurement datasets used by the Aerospace Supplier Intelligence Platform.

**These files are the approved source of truth (Data Model v2.0).** The application only reads them. They must not be modified, renamed, deleted or regenerated without a recorded decision in `docs/decision-log.md`.

## Datasets

| File | Records | Grain | Primary Key |
|---|---:|---|---|
| `suppliers.csv` | 25 | One supplier | `supplier_id` |
| `materials.csv` | 25 | One material | `material_id` |
| `purchase_orders.csv` | 100 | One PO line | `po_line_id` |
| `delivery_transactions.csv` | 91 | One delivery event | `delivery_id` |
| `inventory_snapshot.csv` | 25 | One material at one snapshot date | `snapshot_date` + `material_id` |
| `supplier_quality.csv` | 73 | One inspection event | `inspection_id` |

- Snapshot date: 2026-10-31
- Reporting period: 2025-11-01 to 2026-10-31
- Currency: USD

Field definitions, relationships and the 17 validation controls are in [`docs/data-model.md`](../docs/data-model.md). KPI definitions are in [`docs/kpi-dictionary.md`](../docs/kpi-dictionary.md).

## Known Data Notes

- 12 delivery events fall outside the 2026-10-31 snapshot period. They are kept unchanged and flagged in the dashboard (DEC-017).
- The supplied `inventory_status` is based on on-hand stock; inventory KPIs use available stock (DEC-018).

## Data Governance

- Synthetic demonstration data only.
- No confidential company or supplier information.
- No proprietary aerospace procurement records.
- Data is validated in the browser before use in dashboards.
