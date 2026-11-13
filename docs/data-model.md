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
              +--------------+--------------+
              |              |              |
              v              v              v
           materials    purchase_orders  supplier_quality
              |              |              ^
              |              |              |
              v              v              |
       inventory_snapshot  delivery_transactions
                             |
                             v
                       supplier_quality
```

The diagram represents logical relationships. The datasets also carry supplier, material, PO and PO-line identifiers for traceability.

### 4.2 Relationship Details

| Parent Dataset | Child Dataset | Relationship |
|---|---|---|
| `suppliers` | `materials` | One supplier to many materials in the current model |
| `suppliers` | `purchase_orders` | One supplier to many PO lines |
| `suppliers` | `delivery_transactions` | One supplier to many delivery events |
| `suppliers` | `inventory_snapshot` | One supplier to many material snapshot records |
| `suppliers` | `supplier_quality` | One supplier to many inspection records |
| `materials` | `purchase_orders` | One material to many PO lines |
| `materials` | `delivery_transactions` | One material to many delivery events |
| `materials` | `inventory_snapshot` | One material to one record per snapshot date |
| `materials` | `supplier_quality` | One material to many inspection records |
| `purchase_orders` | `delivery_transactions` | One PO line to zero or many delivery events |
| `delivery_transactions` | `supplier_quality` | One delivery event to zero or one inspection record in the current generated sample |

The current generated sample maps each material to one designated supplier. This is a simplification; a future qualified-source model may allow multiple approved suppliers for one material.

## 5. Dataset Specifications

### 5.1 Supplier Master

**File:** `data/suppliers.csv`

**Purpose:** Maintain supplier identity, classification, qualification and certification status.

| Field | Data Type | Description |
|---|---|---|
| `supplier_id` | String | Unique supplier identifier |
| `supplier_name` | String | Synthetic supplier name |
| `country` | String | Supplier country |
| `supplier_category` | String | Supplier type, such as manufacturer, distributor or service provider |
| `commodity` | String | Supplier's primary commodity or supply category |
| `supplier_tier` | String | Supplier tier classification |
| `supplier_status` | String | Supplier operational status |
| `qualification_status` | String | Supplier qualification status |
| `criticality` | String | Supplier criticality classification |
| `certification_status` | String | Certification assessment status |
| `onboarding_date` | Date | Supplier onboarding date in YYYY-MM-DD format |

**Primary Key:** `supplier_id`

**Current Scope:** 25 suppliers, from `SUP-001` to `SUP-025`.

**Relationships:** Referenced by:

- `materials.supplier_id`
- `purchase_orders.supplier_id`
- `delivery_transactions.supplier_id`
- `inventory_snapshot.supplier_id`
- `supplier_quality.supplier_id`

### 5.2 Material Master

**File:** `data/materials.csv`

**Purpose:** Maintain material identity, commodity classification, supplier mapping, cost and replenishment parameters.

| Field | Data Type | Description |
|---|---|---|
| `material_id` | String | Unique material identifier |
| `material_description` | String | Material or component description |
| `material_category` | String | Material category |
| `commodity` | String | Commodity classification |
| `supplier_id` | String | Designated supplier reference |
| `unit_of_measure` | String | Unit such as EA, KG or SERVICE |
| `standard_cost_usd` | Decimal | Standard material or service cost in USD per unit |
| `lead_time_days` | Integer | Standard procurement lead time in days |
| `safety_stock_qty` | Decimal | Safety stock quantity |
| `reorder_point_qty` | Decimal | Reorder point quantity |
| `criticality` | String | Material criticality classification |
| `shelf_life_days` | Nullable Integer | Shelf life in days, when applicable |
| `material_status` | String | Material status |

**Primary Key:** `material_id`

**Foreign Key:** `supplier_id` references `suppliers.supplier_id`.

**Current Scope:** 25 materials, from `MAT-001` to `MAT-025`.

**Important Rules:**

- `SERVICE` is a valid unit of measure for service-type materials. These are not physical inventory items.
- Blank `shelf_life_days` means no shelf-life value is recorded; it must not be treated as zero.
- The current file maps each material to one designated supplier. It does not model multiple approved sources or supplier qualification by material.

### 5.3 Purchase Order Lines

**File:** `data/purchase_orders.csv`

**Purpose:** Store purchase commitments at PO-line level, including ordered, received, cancelled and open quantities.

| Field | Data Type | Description |
|---|---|---|
| `po_id` | String | Purchase order identifier |
| `po_line_id` | String | Unique PO-line identifier |
| `supplier_id` | String | Supplier reference |
| `material_id` | String | Material reference |
| `order_date` | Date | PO creation/order date |
| `requested_delivery_date` | Date | Requested delivery date |
| `promised_delivery_date` | Date | Supplier-promised delivery date recorded in this dataset |
| `ordered_qty` | Decimal | Total ordered quantity |
| `unit_of_measure` | String | PO line unit of measure |
| `unit_price_usd` | Decimal | Unit price in USD |
| `line_total_usd` | Decimal | PO line value in USD |
| `received_qty` | Decimal | Cumulative quantity received |
| `cancelled_qty` | Decimal | Cancelled quantity |
| `open_qty` | Decimal | Outstanding open quantity |
| `po_status` | String | PO-line status: Open, Partially Received, Closed or Cancelled |

**Primary Key:** `po_line_id`

**Logical Reference:** `po_id` identifies the purchase order. In the current sample, each PO ID appears once, but the model should not assume that a real purchase order can only contain one line.

**Foreign Keys:**

- `supplier_id` references `suppliers.supplier_id`.
- `material_id` references `materials.material_id`.

**Current Scope:** 100 PO-line records.

**Quantity Reconciliation Rule:**

`ordered_qty = received_qty + cancelled_qty + open_qty`

**Value Reconciliation Rule:**

`line_total_usd = ordered_qty × unit_price_usd`

**Important Date Limitation:**

The file contains requested and promised delivery dates but does not contain a separate immutable original baseline commitment date or a promise-revision history. Historical OTD against the original baseline cannot be reconstructed if supplier promises were revised outside this dataset.

### 5.4 Delivery Transactions

**File:** `data/delivery_transactions.csv`

**Purpose:** Record individual shipment and delivery events against PO lines. Multiple delivery events can relate to one PO line.

| Field | Data Type | Description |
|---|---|---|
| `delivery_id` | String | Unique delivery-event identifier |
| `po_id` | String | Purchase order reference |
| `po_line_id` | String | PO-line reference |
| `supplier_id` | String | Supplier reference |
| `material_id` | String | Material reference |
| `shipment_date` | Date | Shipment date |
| `promised_delivery_date` | Date | Promised date associated with the delivery event |
| `actual_delivery_date` | Nullable Date | Actual delivery date; blank for events still in transit |
| `shipped_qty` | Decimal | Quantity shipped |
| `received_qty` | Decimal | Quantity received for this event |
| `accepted_qty` | Decimal | Quantity accepted |
| `rejected_qty` | Decimal | Quantity rejected |
| `unit_of_measure` | String | Delivery unit of measure |
| `delivery_status` | String | Delivery status, including Delivered and In Transit |
| `delivery_variance_days` | Nullable Integer | Actual delivery date minus promised delivery date, in days |
| `on_time_flag` | Nullable Integer/Boolean | 1 when event is on time or early; 0 when late; blank when not yet delivered |
| `carrier` | String | Synthetic carrier name |
| `tracking_reference` | String | Synthetic tracking reference |

**Primary Key:** `delivery_id`

**Foreign Keys:**

- `po_id` references `purchase_orders.po_id`.
- `po_line_id` references `purchase_orders.po_line_id`.
- `supplier_id` references `suppliers.supplier_id`.
- `material_id` references `materials.material_id`.

**Current Scope:** 91 delivery events: 73 Delivered and 18 In Transit.

**Validation Rules:**

- `accepted_qty + rejected_qty = received_qty`.
- `received_qty` must not exceed `shipped_qty`.
- For delivered events, `delivery_variance_days` must equal actual delivery date minus promised delivery date.
- `on_time_flag` is 1 when variance is less than or equal to zero; otherwise it is 0.
- For in-transit events, actual delivery date, delivery variance and on-time flag remain blank.
- Total received quantity across delivery events for a PO line must reconcile to `purchase_orders.received_qty` for that line.

**KPI Grain Warning:**

Event-level OTD is calculated at delivery-event grain. It must not be presented as complete PO-line OTD. A PO line may be fulfilled through multiple partial deliveries; event-level timeliness and complete-line fulfilment are different measures.

### 5.5 Inventory Snapshot

**File:** `data/inventory_snapshot.csv`

**Purpose:** Provide a point-in-time material inventory position for stock availability, replenishment and excess analysis.

| Field | Data Type | Description |
|---|---|---|
| `snapshot_date` | Date | Inventory measurement date |
| `material_id` | String | Material reference |
| `material_description` | String | Material description |
| `material_category` | String | Material category |
| `commodity` | String | Commodity classification |
| `supplier_id` | String | Designated supplier reference |
| `warehouse_id` | String | Synthetic warehouse identifier |
| `unit_of_measure` | String | Inventory unit of measure |
| `on_hand_qty` | Decimal | Physical on-hand quantity |
| `allocated_qty` | Decimal | Quantity allocated to demand |
| `available_qty` | Decimal | Unallocated available quantity |
| `in_transit_qty` | Decimal | Incoming quantity in transit |
| `open_po_qty` | Decimal | Open PO quantity |
| `average_monthly_demand_qty` | Decimal | Average monthly demand assumption |
| `average_daily_demand_qty` | Decimal | Average daily demand assumption |
| `days_of_supply` | Decimal | Available coverage expressed in days |
| `safety_stock_qty` | Decimal | Safety stock quantity |
| `reorder_point_qty` | Decimal | Reorder point quantity |
| `standard_cost_usd` | Decimal | Standard cost in USD per unit |
| `on_hand_inventory_value_usd` | Decimal | On-hand quantity multiplied by standard cost |
| `available_inventory_value_usd` | Decimal | Available quantity multiplied by standard cost |
| `criticality` | String | Material criticality |
| `shelf_life_days` | Nullable Integer | Shelf life in days, when recorded |
| `inventory_status` | String | Inventory health classification |
| `material_status` | String | Material status |

**Composite Business Key:** `snapshot_date` + `material_id`

**Foreign Keys:**

- `material_id` references `materials.material_id`.
- `supplier_id` references `suppliers.supplier_id`.

**Current Scope:** 25 material records for snapshot date `2026-10-31`.

**Calculation Rules:**

- `available_qty = on_hand_qty - allocated_qty`.
- `on_hand_inventory_value_usd = on_hand_qty × standard_cost_usd`.
- `available_inventory_value_usd = available_qty × standard_cost_usd`.
- `days_of_supply` is based on available quantity and average daily demand. Where demand is zero or unavailable, coverage must be handled without division by zero.

**Important Rules and Limitations:**

- This is one snapshot date, not a time series. Inventory trend or historical stock movement cannot be derived from this file alone.
- Service materials (`unit_of_measure = SERVICE`) are not physical stock. Exclude them from physical inventory value, stock-health counts, safety-stock breach and days-of-supply KPIs.
- Use `available_qty`, not `on_hand_qty`, when assessing unallocated stock available to meet demand.
- `in_transit_qty` and `open_po_qty` are separate planning measures. Do not add them together without checking whether their underlying quantities overlap.
- `inventory_status` is a supplied classification. Its exact business-rule thresholds should be documented in the KPI dictionary before being recalculated.

### 5.6 Supplier Quality

**File:** `data/supplier_quality.csv`

**Purpose:** Record inspection outcomes associated with delivered events, nonconformance details and corrective-action status.

| Field | Data Type | Description |
|---|---|---|
| `inspection_id` | String | Unique inspection identifier |
| `delivery_id` | String | Related delivery-event reference |
| `po_id` | String | Purchase order reference |
| `po_line_id` | String | PO-line reference |
| `supplier_id` | String | Supplier reference |
| `supplier_name` | String | Supplier name carried in the inspection record |
| `material_id` | String | Material reference |
| `material_description` | String | Material description carried in the inspection record |
| `inspection_date` | Date | Inspection date |
| `inspection_type` | String | Inspection type |
| `inspected_qty` | Decimal | Quantity inspected |
| `accepted_qty` | Decimal | Quantity accepted |
| `rejected_qty` | Decimal | Quantity rejected |
| `rejection_rate_pct` | Decimal | Rejected quantity divided by inspected quantity, expressed as a percentage |
| `defects_per_million_units` | Decimal | Rejection rate expressed as defects per million inspected units |
| `defect_category` | String | Defect category |
| `defect_description` | String | Defect description |
| `severity` | String | Defect severity |
| `ncr_id` | Nullable String | Nonconformance report reference |
| `disposition` | String | Material disposition |
| `corrective_action_required` | String/Boolean-like | Indicates whether corrective action is required |
| `corrective_action_status` | String | Corrective-action status |
| `root_cause_category` | Nullable String | Root-cause classification |
| `corrective_action_closure_days` | Nullable Integer | Recorded closure duration in days |
| `supplier_criticality` | String | Criticality value currently populated in the generated file |
| `quality_result` | String | Inspection outcome |
| `data_basis` | String | Data provenance/qualification note |

**Primary Key:** `inspection_id`

**Foreign Keys:**

- `delivery_id` references `delivery_transactions.delivery_id`.
- `po_id` references `purchase_orders.po_id`.
- `po_line_id` references `purchase_orders.po_line_id`.
- `supplier_id` references `suppliers.supplier_id`.
- `material_id` references `materials.material_id`.

**Current Scope:** 73 inspection records, corresponding to the 73 delivered events in the current delivery dataset.

**Validation Rules:**

- `inspected_qty = accepted_qty + rejected_qty`.
- `rejected_qty` reconciles to the rejected quantity recorded for the linked delivery event.
- `rejection_rate_pct = rejected_qty / inspected_qty × 100`, where inspected quantity is greater than zero.
- `defects_per_million_units = rejected_qty / inspected_qty × 1,000,000`, where inspected quantity is greater than zero.

**Important Limitations:**

- The current records represent inspection events associated with delivered events; they should not be assumed to represent every inspection performed by a supplier.
- `supplier_criticality` currently reflects material criticality values in the generated records. Do not use it as an independent supplier-master criticality field. Use `suppliers.criticality` for supplier-level criticality.
- Corrective-action due dates and actual closure dates are not included. Reliable on-time CAPA closure rates cannot be calculated from this file.
- Only records with populated closure duration can contribute to a closure-duration statistic. Do not treat blank closure duration as zero.
- The current data has synthetic demonstration provenance and is not evidence of actual supplier quality performance.

## 6. Entity Relationships and Cardinality

| Parent Dataset | Child Dataset | Relationship |
|---|---|---|
| `suppliers` | `materials` | One supplier to many materials in the current model |
| `suppliers` | `purchase_orders` | One supplier to many PO lines |
| `suppliers` | `delivery_transactions` | One supplier to many delivery events |
| `suppliers` | `inventory_snapshot` | One supplier to many material snapshot records |
| `suppliers` | `supplier_quality` | One supplier to many inspection records |
| `materials` | `purchase_orders` | One material to many PO lines |
| `materials` | `delivery_transactions` | One material to many delivery events |
| `materials` | `inventory_snapshot` | One material to one record per snapshot date |
| `materials` | `supplier_quality` | One material to many inspection records |
| `purchase_orders` | `delivery_transactions` | One PO line to zero or many delivery events |
| `delivery_transactions` | `supplier_quality` | One delivery event to zero or one inspection record in the current generated sample |

The current generated sample maps each material to one designated supplier. This is a simplification; a future qualified-source model may allow many-to-many supplier/material relationships.

## 7. Data Grain and KPI Reporting Rules

| Dataset | Grain | Appropriate Analytical Use |
|---|---|---|
| Suppliers | One supplier | Supplier profile and classification |
| Materials | One material | Material attributes and planning parameters |
| Purchase orders | One PO line | Ordered value, open quantity, PO status and line commitments |
| Delivery transactions | One delivery event | Shipment activity, event-level delivery timeliness and receipt quantities |
| Inventory snapshot | One material at one snapshot date | Point-in-time stock health and inventory valuation |
| Supplier quality | One inspection event | Inspection outcomes, rejection and nonconformance analysis |

All KPI calculations must respect the source grain. Joining one PO line to multiple delivery events or inspections can multiply PO-line values if aggregation is not performed carefully.

### 7.1 Delivery Performance

- Event-level OTD uses delivered events and the event's promised and actual delivery dates.
- In-transit events are excluded from completed-event OTD.
- Complete PO-line OTD requires a defined rule for full-quantity completion and an appropriate commitment date. The current dataset does not preserve original promise-date history.
- Do not label event-level OTD as PO-line OTD or OTIF.

### 7.2 Quality Performance

- Inspection rejection rate is calculated from inspected and rejected quantities.
- Inspection-event counts and inspected-quantity-weighted rates are different measures and must be labelled accordingly.
- Quality sampling limitations must be visible in the dashboard or supporting documentation.

### 7.3 Inventory Performance

- Physical inventory KPIs exclude service materials.
- Available quantity is on-hand less allocated quantity.
- The current snapshot supports point-in-time analysis only.
- Days of supply is calculated using available quantity and average daily demand, with zero-demand handling explicitly defined.

### 7.4 Spend Analysis

- PO line value is represented by `line_total_usd`.
- PO commitment value and actual invoiced spend are not interchangeable.
- No invoice dataset is currently implemented. The dashboard must label spend measures as PO committed value or PO line value, not actual paid/invoiced spend.

### 7.5 Supplier Risk

- Supplier profile criticality is available from `suppliers.criticality`.
- Delivery and quality indicators can be derived from the transaction datasets with the limitations described above.
- Dedicated financial risk, continuity risk and approved composite risk assessment inputs are not currently implemented.
- A composite supplier risk score must not be presented as a measured fact until its inputs, weights and scoring rules are explicitly defined.

## 8. Data Quality and Validation Controls

The following controls apply to the current data model:

1. Primary keys must be unique within each dataset.
2. All supplier references must resolve to `suppliers.supplier_id`.
3. All material references must resolve to `materials.material_id`.
4. Every delivery event must resolve to a valid PO and PO line.
5. Supplier and material identifiers on delivery events must agree with the referenced PO line.
6. Delivery received quantities must reconcile to PO-line received quantities.
7. Delivery accepted and rejected quantities must reconcile to received quantities.
8. Inspection quantities must reconcile: accepted plus rejected equals inspected.
9. Inspection rejected quantity must reconcile to the linked delivery event.
10. Inventory available quantity must equal on-hand quantity less allocated quantity.
11. Inventory values must reconcile to quantity multiplied by standard cost.
12. Quantities must not be negative.
13. Units of measure must be consistent across linked material, PO, delivery and inventory records.
14. Date fields must use ISO format `YYYY-MM-DD`.
15. Blank values must remain distinguishable from numeric zero.
16. Service materials must be excluded from physical inventory calculations.
17. KPI aggregation must respect dataset grain and avoid duplicate counting after joins.

## 9. Known Model Gaps and Future Extensions

The following capabilities are not represented by the six current CSV files.

| Future Dataset/Capability | Purpose |
|---|---|
| `po_schedule_history` | Preserve original and revised supplier promise dates and schedule changes |
| `supplier_risk_inputs` | Store financial, continuity and other risk assessment inputs with sources and review status |
| `supplier_approved_sources` | Model multiple qualified suppliers for a material and approval status |
| `inventory_history` | Store repeated inventory snapshots for trend analysis |
| `corrective_action_history` | Store CAPA due dates, actual closure dates, owners, 8D milestones and evidence |
| `invoices` | Support invoiced, paid and actual spend analysis |
| `supplier_audits` | Store audit findings and certification evidence |
| `supplier_capacity` | Store supplier capacity, utilization and constraints |
| `demand_forecasts` | Support forward-looking material requirements and shortage projections |
| `contracts` | Support contract terms, pricing validity and compliance |

These are future extensions. They must not be represented as implemented datasets until files, fields and validation rules are added to the repository.

## 10. Implementation Strategy

The initial application will load the six CSV files from the repository and process them in the browser using JavaScript.

The application should:

- Validate source records and foreign-key relationships at load time.
- Display clear errors for missing or inconsistent data.
- Calculate KPIs using documented definitions.
- Keep source data separate from calculated metrics.
- Avoid modifying source CSV files during dashboard calculations.
- Remain portable for future migration to a database or API.

## 11. Change Control

This document is the implemented Phase 1 data-model baseline for the six current CSV files.

Changes to dataset names, fields, relationships, grain or validation rules must be recorded in `docs/decision-log.md` before implementation. KPI definitions and calculation rules are maintained in `docs/kpi-dictionary.md`.

---

**Project:** Aerospace Supplier Intelligence Platform  
**Document:** Procurement Data Model  
**Version:** 2.0  
**Status:** Implemented Dataset Baseline  
**Data Classification:** Synthetic Demonstration Data  
**Reporting Currency:** USD
