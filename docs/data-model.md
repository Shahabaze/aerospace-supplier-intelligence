
# Aerospace Supplier Intelligence Platform
# Procurement Data Model

**Document Version:** 1.0  
**Project Phase:** Phase 1 – Data Model and KPI Definitions  
**Reporting Currency:** USD  
**Dataset Classification:** Synthetic Demonstration Data  
**Industry Scope:** Aerospace OEM and Supplier Ecosystem

---

## 1. Purpose

This document defines the foundational data model for the Aerospace Supplier Intelligence Platform.

The data model establishes the datasets, fields, unique identifiers, relationships, validation rules and data structures required to support procurement analytics, supplier performance monitoring, supplier quality analysis, inventory intelligence and AI-assisted decision support.

The initial implementation will use synthetic aerospace procurement data.

## 2. Design Principles

The data model will follow these principles:

- Each business entity must have a unique identifier.
- Supplier, material and purchase order information must be consistently linked.
- Purchase order headers and delivery schedules must be maintained separately.
- Partial deliveries must be recorded independently.
- Supplier performance must be traceable to underlying transactions.
- Inventory must be measured using dated snapshots.
- KPI calculations must use documented business rules.
- Missing information must not automatically be interpreted as zero.
- Synthetic data must resemble realistic aerospace procurement operations.
- The initial solution must support browser-based application development without requiring Python.

## 3. Initial Dataset Scope

| Parameter | Initial Target |
|---|---|
| Suppliers | 25 |
| Materials / Part Numbers | 60 |
| Purchase Orders | 100 |
| PO Schedule Lines | 250 |
| Delivery Receipt Records | 300–500 |
| Quality Events | 30–60 |
| Inventory Records | 60 materials per snapshot |
| Supplier Risk Records | 25 |
| Reporting Currency | USD |
| Reporting Period | 12 months |

These are initial dataset targets, not actual supplier or transaction records. The final record counts may vary slightly to accommodate realistic delivery and quality scenarios.

## 4. Data Model Overview

The initial model contains eight core datasets.

| Dataset | Description | Primary Key |
|---|---|---|
| suppliers | Supplier master information | supplier_id |
| materials | Aerospace material master | material_id |
| purchase_orders | Purchase order header records | po_id |
| po_schedules | PO line and delivery schedule commitments | schedule_id |
| receipts | Material delivery and inspection transactions | receipt_id |
| quality_events | Supplier quality and corrective action records | quality_id |
| inventory_snapshots | Dated inventory positions | snapshot_id |
| supplier_risk_inputs | Supplier risk assessment inputs | risk_record_id |

## 5. Dataset Specifications

### 5.1 Suppliers

**Dataset:** suppliers

**Purpose:** Maintain supplier master information and supplier classification.

| Field | Data Type | Description |
|---|---|---|
| supplier_id | String | Unique supplier identifier |
| supplier_name | String | Synthetic supplier name |
| country | String | Supplier country |
| supplier_category | String | Manufacturer, distributor or service provider |
| commodity | String | Primary supply category |
| supplier_tier | String | Tier 1, Tier 2 or other |
| supplier_status | String | Active, Inactive or Under Review |
| qualification_status | String | Qualified, Conditional or Not Qualified |
| criticality | String | Critical, High, Medium or Low |
| certification_status | String | Certification assessment status |
| onboarding_date | Date | Supplier onboarding date |

**Primary Key:** supplier_id

### 5.2 Materials

**Dataset:** materials

**Purpose:** Maintain aerospace material and part-number information.

| Field | Data Type | Description |
|---|---|---|
| material_id | String | Unique material identifier |
| part_number | String | Synthetic aerospace part number |
| description | String | Material or component description |
| commodity | String | Material category |
| material_type | String | Raw Material, Component or Consumable |
| unit_of_measure | String | EA, KG, M, etc. |
| criticality | String | Critical, High, Medium or Low |
| standard_lead_time_days | Integer | Expected procurement lead time |
| safety_stock_qty | Decimal | Required safety stock |
| reorder_point_qty | Decimal | Inventory reorder threshold |
| maximum_stock_qty | Decimal | Maximum desired inventory |
| preferred_supplier_id | String | Preferred supplier reference |

**Primary Key:** material_id

**Foreign Key:** preferred_supplier_id references suppliers.supplier_id

### 5.3 Purchase Orders

**Dataset:** purchase_orders

**Purpose:** Store procurement commitment information at purchase order header level.

| Field | Data Type | Description |
|---|---|---|
| po_id | String | Unique purchase order identifier |
| supplier_id | String | Supplier reference |
| po_date | Date | Purchase order creation date |
| release_date | Date | Purchase order release date |
| buyer_id | String | Synthetic buyer identifier |
| currency_code | String | Reporting transaction currency |
| payment_terms | String | Agreed payment terms |
| po_status | String | Open, Partially Received, Closed or Cancelled |

**Primary Key:** po_id

**Foreign Key:** supplier_id references suppliers.supplier_id

**Initial currency rule:** All demonstration transactions will use USD. Multi-currency conversion is outside the initial implementation scope.

### 5.4 Purchase Order Schedules

**Dataset:** po_schedules

**Purpose:** Record material commitments, ordered quantities, supplier delivery dates and schedule-level performance.

One schedule record represents one material commitment against a specific PO schedule.

| Field | Data Type | Description |
|---|---|---|
| schedule_id | String | Unique schedule identifier |
| po_id | String | Purchase order reference |
| material_id | String | Material reference |
| line_number | Integer | PO line number |
| schedule_number | Integer | Schedule sequence |
| ordered_qty | Decimal | Committed order quantity |
| unit_price_usd | Decimal | Unit purchase price in USD |
| baseline_due_date | Date | Original agreed delivery date |
| current_promise_date | Date | Latest supplier-confirmed date |
| schedule_status | String | Open, Partially Received, Complete or Cancelled |

**Primary Key:** schedule_id

**Foreign Keys:**
- po_id references purchase_orders.po_id
- material_id references materials.material_id

**Important:** baseline_due_date is the original committed date and must remain unchanged when supplier promises are revised. This protects historical OTD measurement.

### 5.5 Receipts

**Dataset:** receipts

**Purpose:** Record individual material delivery and inspection transactions.

Multiple receipt records may belong to one PO schedule.

| Field | Data Type | Description |
|---|---|---|
| receipt_id | String | Unique receipt identifier |
| schedule_id | String | PO schedule reference |
| receipt_date | Date | Physical receipt date |
| received_qty | Decimal | Quantity physically received |
| inspected_qty | Decimal | Quantity inspected |
| accepted_qty | Decimal | Quantity accepted by quality |
| rejected_qty | Decimal | Quantity rejected |
| inspection_status | String | Pending, Partial or Completed |
| goods_receipt_reference | String | Synthetic goods receipt reference |

**Primary Key:** receipt_id

**Foreign Key:** schedule_id references po_schedules.schedule_id

**Validation rules:**
- received_qty must be greater than or equal to zero.
- inspected_qty cannot exceed received_qty.
- accepted_qty and rejected_qty cannot exceed inspected_qty.
- For fully inspected quantities, accepted_qty + rejected_qty must equal inspected_qty.
- Multiple receipts against one schedule must be supported.

### 5.6 Quality Events

**Dataset:** quality_events

**Purpose:** Monitor supplier quality issues and corrective action progress.

| Field | Data Type | Description |
|---|---|---|
| quality_id | String | Unique quality event identifier |
| supplier_id | String | Supplier reference |
| material_id | String | Material reference |
| receipt_id | String | Related receipt reference, if applicable |
| event_date | Date | Quality event date |
| defect_type | String | Defect classification |
| severity | String | Critical, Major or Minor |
| nonconformance_qty | Decimal | Quantity associated with the event |
| corrective_action_required | Boolean | Corrective action requirement |
| action_due_date | Date | Corrective action deadline |
| closure_date | Date | Actual closure date |
| closure_status | String | Open, In Progress or Closed |

**Primary Key:** quality_id

**Foreign Keys:**
- supplier_id references suppliers.supplier_id
- material_id references materials.material_id
- receipt_id references receipts.receipt_id (nullable)

### 5.7 Inventory Snapshots

**Dataset:** inventory_snapshots

**Purpose:** Maintain historical inventory positions for shortage, excess and stock-health analysis.

| Field | Data Type | Description |
|---|---|---|
| snapshot_id | String | Unique snapshot identifier |
| material_id | String | Material reference |
| snapshot_date | Date | Inventory measurement date |
| on_hand_qty | Decimal | Physical inventory quantity |
| allocated_qty | Decimal | Quantity allocated to demand |
| in_transit_qty | Decimal | Open incoming material quantity |
| average_daily_demand | Decimal | Average daily consumption |
| safety_stock_qty | Decimal | Required safety stock |
| reorder_point_qty | Decimal | Replenishment trigger |
| maximum_stock_qty | Decimal | Maximum desired stock |

**Primary Key:** snapshot_id

**Foreign Key:** material_id references materials.material_id

**Unique business key:** material_id + snapshot_date

**Validation rules:**
- Allocated quantity cannot exceed on-hand quantity in the initial model.
- Quantity values must not be negative.
- Average daily demand must be non-negative.
- Inventory calculations must use the same unit of measure.

### 5.8 Supplier Risk Inputs

**Dataset:** supplier_risk_inputs

**Purpose:** Store transparent supplier risk assessment inputs.

| Field | Data Type | Description |
|---|---|---|
| risk_record_id | String | Unique risk record identifier |
| supplier_id | String | Supplier reference |
| assessment_date | Date | Assessment date |
| delivery_risk_score | Decimal | Delivery risk score, 0–100 |
| quality_risk_score | Decimal | Quality risk score, 0–100 |
| financial_risk_score | Decimal | Financial risk score, 0–100 |
| continuity_risk_score | Decimal | Supply continuity risk score, 0–100 |
| risk_notes | String | Supporting assessment explanation |
| assessment_source | String | Synthetic data, rule-based or manual |
| review_status | String | Pending, Reviewed or Approved |

**Primary Key:** risk_record_id

**Foreign Key:** supplier_id references suppliers.supplier_id

Higher scores indicate higher risk.

## 6. Entity Relationships

The following relationships define the initial data architecture:

- One supplier can have multiple purchase orders.
- One purchase order can have multiple PO schedules.
- One material can appear in multiple PO schedules.
- One PO schedule can have multiple delivery receipts.
- One supplier can have multiple quality events.
- One material can have multiple inventory snapshots.
- One supplier can have multiple historical risk assessments.

## 7. Data Grain and Reporting Rules

| Dataset | Data Grain |
|---|---|
| Suppliers | One record per supplier |
| Materials | One record per material |
| Purchase Orders | One record per PO |
| PO Schedules | One record per scheduled material commitment |
| Receipts | One record per physical receipt transaction |
| Quality Events | One record per quality event |
| Inventory Snapshots | One record per material per snapshot date |
| Supplier Risk Inputs | One record per supplier assessment date |

All KPI calculations must respect the grain of the underlying dataset to avoid duplicate counting.

## 8. Data Quality and Validation

The following controls must be implemented:

1. All primary keys must be unique.
2. All foreign keys must reference valid records.
3. PO schedules must reference valid purchase orders and materials.
4. Receipts must reference valid PO schedules.
5. Receipt quantities must reconcile with inspection quantities.
6. Baseline delivery dates must remain historically traceable.
7. Cancelled schedules must be excluded from delivery performance calculations.
8. Inventory snapshots must have unique material/date combinations.
9. Supplier risk scores must remain within the 0–100 range.
10. Missing values must be identified and reported.
11. Currency and units of measure must remain consistent.
12. Date fields must use a consistent ISO date format (YYYY-MM-DD).

## 9. Synthetic Data Generation Scenarios

The demonstration dataset should include realistic operating conditions:

- Suppliers with consistently high delivery performance.
- Suppliers experiencing recurring delivery delays.
- Suppliers with partial deliveries.
- Suppliers with quality rejection issues.
- Suppliers with open corrective actions.
- Critical aerospace materials with extended lead times.
- Materials below safety stock.
- Materials with excess inventory.
- Suppliers with concentrated procurement spend.
- Suppliers with elevated continuity risk.

These scenarios will provide meaningful inputs for dashboard analysis and AI-assisted recommendations.

## 10. Future Data Model Extensions

The following datasets are excluded from the initial version but may be introduced later:

| Dataset | Future Capability |
|---|---|
| demand_forecasts | Forecasted material requirements |
| supplier_audits | Supplier audit findings and compliance |
| invoices | Actual invoiced procurement expenditure |
| contracts | Commercial terms and contract compliance |
| supplier_capacities | Supplier capacity and utilization |
| sourcing_events | RFQ, quotation and sourcing analysis |
| corrective_actions | Detailed 8D and CAPA tracking |
| risk_history | Historical risk movement and trend analysis |

## 11. Implementation Strategy

The initial data model will be implemented using synthetic CSV or JSON datasets.

JavaScript will handle data loading, validation, transformations and KPI calculations within the browser-based application.

Google Sheets may be used as an initial data preparation and management interface.

The model must remain portable so that future integration with a database or API is possible without redesigning the business entities.

## 12. Approval and Change Control

This document represents the proposed baseline data model for Phase 1.

Changes to datasets, fields, relationships or calculation requirements must be documented in the project Decision Log before implementation.

---

**Project:** Aerospace Supplier Intelligence Platform  
**Document:** Procurement Data Model  
**Version:** 1.0  
**Status:** Proposed Phase 1 Baseline  
**Data Classification:** Synthetic Demonstration Data  
**Reporting Currency:** USD
