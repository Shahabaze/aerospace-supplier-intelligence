# Aerospace Supplier Intelligence Platform

# Procurement Data Model

**Document Version:** 2.0  
**Project Phase:** Phase 1 – Implemented Data Model  
**Reporting Currency:** USD  
**Dataset Classification:** Synthetic Demonstration Data  
**Industry Scope:** Aerospace OEM and Supplier Ecosystem  
**Status:** Implemented Dataset Baseline  
**Snapshot Date:** 2026-10-31  
**Reporting Period:** 2025-11-01 to 2026-10-31

---

## 1. Purpose

This document defines the data model implemented by the six CSV datasets currently stored in the repository's `data/` directory.

It documents the actual dataset names, fields, data types, record grain, keys, relationships, validation rules and known limitations. It supersedes the earlier proposed eight-dataset model in Version 1.0.

The platform uses synthetic aerospace procurement data for demonstration and portfolio purposes. The initial implementation is intended to run in a browser, with JavaScript handling data loading, validation, transformations and KPI calculations.

## 2. Implemented Dataset Scope

| Dataset File | Current Records | Data Grain |
|---|---:|---|
| `suppliers.csv` | 25 | One record per supplier |
| `materials.csv` | 25 | One record per material |
| `purchase_orders.csv` | 100 | One record per PO line |
| `delivery_transactions.csv` | 91 | One record per shipment/delivery event |
| `inventory_snapshot.csv` | 25 | One record per material for one snapshot date |
| `supplier_quality.csv` | 73 | One record per inspection event |
| **Total** | **339** | **Across six datasets** |

Counts describe the current synthetic files and may change if the datasets are deliberately revised. The six source CSV files are the source of truth for the implemented schema.

## 3. Design Principles

- Preserve the actual CSV structures and field names.
- Use stable identifiers to link suppliers, materials, PO lines, delivery events and inspections.
- Respect the grain of each dataset when calculating KPIs.
- Support partial deliveries against a PO line.
- Keep delivery-event performance distinct from complete PO-line performance.
- Treat the inventory file as a point-in-time snapshot, not a historical inventory ledger.
- Do not interpret blank values as zero unless a documented business rule explicitly says so.
- Exclude service materials from physical inventory calculations.
- Keep synthetic demonstration data clearly identified as synthetic.
- Do not claim that fields or datasets exist when they are not present in the current files.

## 4. Data Model Overview

The implemented model contains six datasets.

| Dataset | Description | Primary Key |
|---|---|---|
| `suppliers` | Supplier master and classification | `supplier_id` |
| `materials` | Material, commodity, cost and replenishment master | `material_id` |
| `purchase_orders` | PO-line commitments, quantities and commercial values | `po_line_id` |
| `delivery_transactions` | Individual shipment and delivery events | `delivery_id` |
| `inventory_snapshot` | Material stock position at 2026-10-31 | `snapshot_date` + `material_id` |
| `supplier_quality` | Inspection outcomes and corrective-action details linked to delivery events | `inspection_id` |

### 4.1 Relationship Overview

```text
suppliers
   |
   | supplier_id
   |
   +--------------------< materials
   |                         |
   |                         | material_id
   |                         |
   +--------------------< purchase_orders
                              |
                              | po_id / po_line_id
                              |
                              +--------------------< delivery_transactions
                              |
                              +--------------------< supplier_quality

materials ----------------< inventory_snapshot
