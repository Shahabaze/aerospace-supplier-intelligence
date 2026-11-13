# Aerospace Supplier Intelligence Platform

# KPI Dictionary

**Document Version:** 2.2  
**Project Phase:** Phase 1 – KPI Definition (2.1 and 2.2 clarifications approved 2026-11-13)  
**Reporting Currency:** USD  
**Dataset Classification:** Synthetic Demonstration Data  
**Industry Scope:** Aerospace OEM and Supplier Ecosystem  
**Status:** Implemented KPI Definition Baseline  
**Snapshot Date:** 2026-10-31  
**Reporting Period:** 2025-11-01 to 2026-10-31

---

## 1. Purpose

This document defines the Key Performance Indicators (KPIs) for the Aerospace Supplier Intelligence Platform.

It establishes the business meaning, calculation logic, source datasets, reporting grain, filters, limitations and implementation status of each KPI.

All KPI definitions are aligned with the six implemented CSV datasets documented in `docs/data-model.md`.

The objective is to provide consistent and traceable procurement, supplier performance, quality, spend and inventory insights.

The platform uses synthetic demonstration data. KPI results must not be represented as actual performance of real aerospace suppliers.

## 2. KPI Governance Principles

The following principles apply to all KPI calculations:

1. Every KPI must have a clear business definition and calculation rule.
2. KPI calculations must respect the grain of the source dataset.
3. The same transaction must not be counted more than once because of dataset joins.
4. Blank values must not automatically be treated as zero.
5. In-transit deliveries must be excluded from completed-delivery OTD.
6. Service materials must be excluded from physical inventory KPIs.
7. PO commitment value must not be presented as actual invoiced or paid spend.
8. A single inventory snapshot must not be used to claim historical inventory trends.
9. Supplier-level criticality must come from `suppliers.csv`.
10. Unsupported KPIs must be identified rather than estimated without evidence.
11. KPI definitions and thresholds must be documented before implementation.
12. All dashboard calculations must leave the source CSV files unchanged.

## 3. KPI Implementation Status

Each KPI is assigned one of the following statuses:

| Status | Meaning |
|---|---|
| Calculable | Required source fields exist and the KPI can be calculated from current datasets |
| Calculable with limitation | A calculation is possible, but the result has a documented scope or interpretation limitation |
| Not supported | Required source data is missing or insufficient for a reliable calculation |
| Future enhancement | The KPI requires an additional dataset, business rule or approved methodology |

A KPI marked calculable does not automatically mean it has already been implemented in the dashboard.

## 4. Supplier Delivery Performance KPIs

### 4.1 Delivery Event On-Time Delivery (Event OTD)

**Business Question:** What percentage of completed delivery events arrived on or before their associated promised delivery dates?

**Formula:**

Delivery Event OTD (%) =

(Number of delivered events with `on_time_flag = 1` ÷ Total delivered events with a valid on-time flag) × 100

**Source Dataset:** `delivery_transactions.csv`

**Required Fields:**
- `delivery_status`
- `on_time_flag`
- `promised_delivery_date`
- `actual_delivery_date`

**Reporting Grain:** One delivery event.

**Filters and Rules:**
- Include only events with `delivery_status = Delivered`.
- Exclude in-transit events.
- Exclude records with missing on-time flags.
- Treat early deliveries as on time.
- Use the event-level promised delivery date.

**Current Dataset Reference:** 73 delivered events. The generated sample has an event-level OTD of approximately 38.4%.

**Status:** Calculable with limitation.

**Important Limitation:** This is delivery-event OTD, not complete PO-line OTD, OTIF or supplier schedule adherence. A PO line can have multiple partial deliveries.

**Version 2.1 Clarification – Reporting Bases (DEC-017):**

The source file contains delivered events with `actual_delivery_date` after the 2026-10-31 snapshot date. Delivery Event OTD is therefore reported on two clearly labelled bases. The source data is not modified or silently filtered.

| Basis | Population | Current Dataset Reference |
|---|---|---|
| Snapshot-period Delivery Event OTD (as of 2026-10-31) | Delivered events with a valid on-time flag and `actual_delivery_date` on or before the reporting as-of date | 39.68% (25 / 63) |
| Full-dataset Delivery Event OTD | All delivered events with a valid on-time flag, regardless of date | 38.36% (28 / 73) |

Rules:
- Both figures must show their basis label, numerator and denominator.
- The reporting as-of date is configurable and defaults to 2026-10-31.
- Events outside the snapshot period must be identified in a visible data-quality warning.
- Neither basis is OTIF or PO-line OTD.

### 4.2 Late Delivery Event Count

**Business Question:** How many completed delivery events arrived after their promised dates?

**Formula:**

Count of delivery events where:
- `delivery_status = Delivered`
- `on_time_flag = 0`

**Source Dataset:** `delivery_transactions.csv`

**Reporting Grain:** One delivery event.

**Status:** Calculable.

### 4.3 Average Delivery Variance

**Business Question:** On average, how many days early or late were completed delivery events?

**Formula:**

Average Delivery Variance (days) =

Sum of `delivery_variance_days` ÷ Count of valid delivered events

**Source Dataset:** `delivery_transactions.csv`

**Reporting Grain:** One delivery event.

**Filters and Rules:**
- Include delivered events only.
- Exclude blank variance values.
- Negative values indicate early delivery.
- Positive values indicate late delivery.
- Zero indicates delivery on the promised date.

**Status:** Calculable.

### 4.4 Overdue Open PO Line Count

**Business Question:** How many purchase order lines still have outstanding quantities beyond their recorded promised delivery dates?

**Formula:**

Count of PO lines where:
- `open_qty > 0`
- `promised_delivery_date` is earlier than the reporting as-of date

**Source Dataset:** `purchase_orders.csv`

**Reporting Grain:** One PO line.

**Reporting As-of Date:** 2026-10-31 for the initial baseline.

**Filters and Rules:**
- Exclude lines with zero open quantity.
- Use the recorded PO-line promised delivery date.
- Do not count fully received or fully cancelled lines with no open quantity.
- The reporting as-of date must be configurable for future refreshes.

**Status:** Calculable with limitation.

**Important Limitation:** The dataset does not preserve original supplier promise dates or promise-revision history. This KPI measures overdue open commitments against the currently recorded promise date.

### 4.5 Complete PO-Line OTD

**Business Question:** What percentage of PO lines were fulfilled in full by the required commitment date?

**Required Calculation Concept:**

A PO line must reach its full required quantity by an agreed baseline commitment date.

**Source Datasets:**
- `purchase_orders.csv`
- `delivery_transactions.csv`

**Status:** Not supported as a reliable historical KPI.

**Reason:**
- The original immutable commitment date is not available.
- Promise-date revision history is not available.
- Partial deliveries require a clearly defined full-quantity completion rule.

**Future Requirement:** Implement `po_schedule_history` and an approved PO-line completion methodology before reporting this KPI.

### 4.6 OTIF – On Time In Full

**Business Question:** What percentage of purchase order lines were delivered in full and on time?

**Source Datasets:**
- `purchase_orders.csv`
- `delivery_transactions.csv`

**Status:** Not supported as a reliable historical KPI.

**Reason:** The current dataset does not preserve the original commitment baseline and complete schedule history required for a defensible historical OTIF calculation.

**Important Rule:** Do not use Delivery Event OTD as a substitute for OTIF.

---

## 5. Supplier Quality KPIs

### 5.1 Inspection Rejection Rate

**Business Question:** What percentage of inspected quantity was rejected?

**Formula:**

Inspection Rejection Rate (%) =

(Sum of `rejected_qty` ÷ Sum of `inspected_qty`) × 100

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** One inspection event, aggregated by inspected and rejected quantities.

**Filters and Rules:**
- Include records with valid inspected quantities greater than zero.
- Use total quantities rather than averaging individual inspection percentages.
- Exclude records with missing or invalid quantities.

**Current Dataset Reference:**
- Inspected quantity: 2,997
- Rejected quantity: 5
- Overall inspection rejection rate: approximately 0.17%

**Status:** Calculable.

### 5.2 Total Rejected Quantity

**Business Question:** How many units were rejected during recorded inspection events?

**Formula:**

Sum of `rejected_qty`

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** Inspection event.

**Status:** Calculable.

### 5.3 Nonconformance Inspection Count

**Business Question:** How many inspection events resulted in a nonconformance?

**Formula:**

Count of inspection records where `quality_result = Nonconformance`.

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** One inspection event.

**Status:** Calculable.

**Important Limitation:** This measures nonconformance inspection events, not the total number of individual defects or unique supplier quality incidents.

### 5.4 Open Corrective Action Count

**Business Question:** How many corrective actions remain unresolved?

**Formula:**

Count of records where:
- Corrective action is required.
- `corrective_action_status` is neither `Closed` nor `Not Required`.

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** One inspection event/corrective-action record.

**Status:** Calculable with limitation.

**Important Limitation:** The current dataset does not contain a separate corrective-action master or complete action history. This count represents recorded inspection-linked corrective-action records, not necessarily unique enterprise-wide CAPA cases.

### 5.5 Average Corrective Action Closure Duration

**Business Question:** How many days did recorded corrective actions take to close?

**Formula:**

Average of valid `corrective_action_closure_days` values.

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** Inspection-linked corrective-action record.

**Filters and Rules:**
- Include only populated closure-duration values.
- Do not treat blank values as zero.
- Clearly state the number of records used in the calculation.

**Status:** Calculable with limitation.

### 5.6 CAPA On-Time Closure Rate

**Business Question:** What percentage of corrective actions were closed by their approved due dates?

**Status:** Not supported.

**Reason:** The dataset does not contain corrective-action due dates and actual closure dates.

**Future Requirement:** Add due dates, actual closure dates, action owners and action-history records.

### 5.7 Defects Per Million Units (DPM)

**Business Question:** What is the number of rejected units per million inspected units?

**Formula:**

DPM =

(Sum of `rejected_qty` ÷ Sum of `inspected_qty`) × 1,000,000

**Source Dataset:** `supplier_quality.csv`

**Reporting Grain:** Inspection event, aggregated using total inspected and rejected quantities.

**Status:** Calculable.

**Important Limitation:** The current field represents rejected units per million inspected units. It should not be described as a count of individual defect occurrences unless the data model captures individual defect counts.

---

## 6. Procurement Spend and Commercial KPIs

### 6.1 Total PO Committed Value

**Business Question:** What is the total value of purchase order lines recorded during the reporting period?

**Formula:**

Sum of `line_total_usd`

**Source Dataset:** `purchase_orders.csv`

**Reporting Grain:** One PO line.

**Filters and Rules:**
- Use the PO-line value only once.
- Do not join delivery or inspection records before summing PO-line values.
- Clearly identify the reporting period and currency.

**Status:** Calculable.

**Important Limitation:** This is PO committed value, not actual invoiced spend, paid spend or accounting expenditure.

**Version 2.1 Clarification – Gross, Cancelled and Net Active PO Line Value (DEC-019):**

`line_total_usd` equals `ordered_qty × unit_price_usd`, including any quantity later cancelled. The value calculated by 6.1 is therefore **gross** PO line value and includes cancelled value. It must be displayed as **Gross PO Line Value**, never as active commitment.

Three measures are displayed together:

| Measure | Formula | Current Dataset Reference |
|---|---|---|
| 6.1 Gross PO Line Value | Sum of `line_total_usd` | $12,550,378.20 |
| 6.1.1 Cancelled PO Line Value | Sum of (`cancelled_qty` × `unit_price_usd`) | $1,072,369.00 (17 fully cancelled lines) |
| 6.1.2 Net Active PO Line Value | Gross PO Line Value − Cancelled PO Line Value | $11,478,009.20 |

Rules:
- All three use `purchase_orders.csv` at PO-line grain, with each line counted once.
- Net Active PO Line Value includes received and open quantities; it excludes cancelled quantities only.
- None of these measures represents invoiced, paid or accounting spend.
- Where this document refers to "Total PO committed value" (6.3, 6.5 and section 10), it means 6.1 Gross PO Line Value. From Version 2.2, 6.4 Supplier Concentration uses Net Active PO Line Value (DEC-023).

### 6.2 Open PO Commitment Value

**Business Question:** What is the remaining monetary value of outstanding PO quantities?

**Formula:**

Sum of (`open_qty` × `unit_price_usd`)

**Source Dataset:** `purchase_orders.csv`

**Reporting Grain:** One PO line.

**Filters and Rules:**
- Include lines with positive open quantities.
- Exclude fully received or fully cancelled quantities.
- Use the recorded unit price.

**Status:** Calculable.

**Important Limitation:** This represents the value of outstanding PO quantities, not an invoice liability or confirmed cash obligation.

### 6.3 Supplier PO Commitment Value

**Business Question:** How much PO commitment value is associated with each supplier?

**Formula:**

Sum of `line_total_usd`, grouped by `supplier_id`.

**Source Datasets:**
- `purchase_orders.csv`
- `suppliers.csv`

**Reporting Grain:** PO line, aggregated by supplier.

**Status:** Calculable.

### 6.4 Supplier Spend Concentration

**Business Question:** What percentage of total active PO line value is associated with each supplier?

**Formula (Version 2.2, DEC-023):**

Supplier Concentration (%) =

(Supplier's Net Active PO Line Value ÷ Total Net Active PO Line Value across all suppliers) × 100

Where, for each PO line:

Net Active PO Line Value = `line_total_usd` − (`cancelled_qty` × `unit_price_usd`)

This is the line-level form of 6.1.2. A fully cancelled PO line therefore contributes zero, and any cancelled portion of a partially cancelled line is also removed.

**Source Datasets:**
- `purchase_orders.csv`
- `suppliers.csv`

**Reporting Grain:** PO line, aggregated by supplier.

**Filters and Rules:**
- Apply the same cancellation exclusion to the numerator and the denominator.
- The denominator equals 6.1.2 Net Active PO Line Value ($11,478,009.20 in the current dataset).
- Supplier percentages must sum to 100% (allowing for display rounding).
- Aggregate from `purchase_orders.csv` only, before any join to delivery or inspection data.

**Current Dataset Reference:** SUP-007 27.75%, SUP-008 24.42%, SUP-002 14.49% (top three suppliers). All cancelled quantity in the current data is on 17 fully cancelled lines, so excluding fully cancelled lines and subtracting cancelled value give the same result here.

**Status:** Calculable.

**Important Limitation:** This is concentration of active PO line value, not actual supplier spend or financial dependency.

**Superseded Definition (Version 2.1 and earlier):** (Supplier PO committed value ÷ Total PO committed value) × 100, using gross `line_total_usd` including cancelled value.

### 6.5 Average PO Line Value

**Business Question:** What is the average monetary value of a purchase order line?

**Formula:**

Sum of `line_total_usd` ÷ Count of PO-line records.

**Source Dataset:** `purchase_orders.csv`

**Reporting Grain:** One PO line.

**Status:** Calculable.

### 6.6 Actual Invoiced Spend

**Business Question:** What value has been invoiced by suppliers?

**Status:** Not supported.

**Reason:** No invoice dataset is currently implemented.

**Future Requirement:** Add invoice records, invoice dates, invoice values, currency and PO-line references.

---

## 7. Inventory and Material Planning KPIs

### 7.1 Total On-Hand Inventory Value

**Business Question:** What is the monetary value of physical stock currently held?

**Formula:**

Sum of `on_hand_inventory_value_usd`

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude materials where `unit_of_measure = SERVICE`.
- Use the inventory snapshot date as the reporting reference.
- Use the supplied inventory value field or validate it against quantity multiplied by standard cost.

**Status:** Calculable.

### 7.2 Available Inventory Value

**Business Question:** What is the monetary value of unallocated physical inventory?

**Formula:**

Sum of `available_inventory_value_usd`

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Use available inventory value, not on-hand inventory value.
- Validate available quantity as on-hand quantity less allocated quantity.

**Status:** Calculable.

### 7.3 Materials Below Reorder Point

**Business Question:** How many physical materials have available stock below their reorder point?

**Formula:**

Count of physical materials where:

`available_qty < reorder_point_qty`

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Use available quantity.
- Apply the same comparison rule consistently.

**Status:** Calculable.

**Important Limitation:** This formula is a direct threshold calculation. It should not automatically be assumed to match the supplied `inventory_status` classification.

### 7.4 Safety Stock Breach Count

**Business Question:** How many physical materials have available stock below safety stock?

**Formula:**

Count of physical materials where:

`available_qty < safety_stock_qty`

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Compare available quantity against safety stock quantity.
- Do not count blank values as zero.

**Status:** Calculable.

### 7.5 Average Days of Supply

**Business Question:** How many days of demand can current available inventory support on average?

**Formula:**

Average of valid `days_of_supply` values.

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One physical material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Exclude missing or invalid coverage values.
- Display the number of materials included.
- Do not allow zero-demand materials to distort the average.

**Status:** Calculable with limitation.

**Important Limitation:** This is a snapshot-based planning indicator using synthetic demand assumptions, not a forecast of guaranteed future availability.

### 7.6 Excess Inventory Value

**Business Question:** What is the value of inventory classified as excess?

**Formula:**

Sum of `on_hand_inventory_value_usd` for physical materials classified as `Excess`.

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Use the supplied `inventory_status = Excess` classification.
- Use on-hand inventory value.

**Status:** Calculable with limitation.

**Important Limitation:** The exact threshold logic behind the supplied excess classification must be documented before recalculating or changing the classification.

### 7.7 Inventory Status Distribution

**Business Question:** How is physical inventory distributed across the recorded inventory health categories?

**Formula:**

Count of physical materials grouped by `inventory_status`.

**Source Dataset:** `inventory_snapshot.csv`

**Reporting Grain:** One material at one snapshot date.

**Filters and Rules:**
- Exclude service materials.
- Use the supplied status classification.
- Display the snapshot date.

**Status:** Calculable with limitation.

### 7.8 Inventory Trend

**Business Question:** How has inventory value or stock health changed over time?

**Status:** Not supported.

**Reason:** Only one inventory snapshot date is currently available.

**Future Requirement:** Add repeated dated inventory snapshots or an inventory movement history dataset.

---

## 8. Supplier Profile and Risk Indicators

### 8.1 Critical Supplier Count

**Business Question:** How many suppliers are classified as critical?

**Formula:**

Count of supplier records where `criticality = Critical`.

**Source Dataset:** `suppliers.csv`

**Reporting Grain:** One supplier.

**Status:** Calculable.

### 8.2 Supplier Qualification Status Distribution

**Business Question:** How many suppliers fall into each qualification status?

**Formula:**

Count suppliers grouped by `qualification_status`.

**Source Dataset:** `suppliers.csv`

**Reporting Grain:** One supplier.

**Status:** Calculable.

### 8.3 Supplier Certification Status Distribution

**Business Question:** What is the distribution of supplier certification assessment statuses?

**Formula:**

Count suppliers grouped by `certification_status`.

**Source Dataset:** `suppliers.csv`

**Reporting Grain:** One supplier.

**Status:** Calculable.

**Important Limitation:** The current field contains certification assessment status. It does not provide individual certificate names, certificate expiry dates or documentary evidence.

### 8.4 Supplier Delivery and Quality Profile

**Business Question:** How does each supplier perform across recorded delivery and inspection indicators?

**Source Datasets:**
- `suppliers.csv`
- `delivery_transactions.csv`
- `supplier_quality.csv`

**Possible Indicators:**
- Supplier criticality.
- Supplier qualification status.
- Supplier certification status.
- Delivery Event OTD.
- Late delivery event count.
- Inspection rejection rate.
- Nonconformance inspection count.
- Open corrective-action count.

**Status:** Calculable with limitation.

**Aggregation Rules:**
- Aggregate delivery events independently at supplier level.
- Aggregate inspection quantities independently at supplier level.
- Do not join raw PO-line values to multiple delivery or inspection records before aggregation.
- Use `suppliers.criticality` for supplier criticality.
- Do not use `supplier_quality.supplier_criticality` as an independent supplier-master classification.

### 8.5 Composite Supplier Risk Score

**Business Question:** Which suppliers have the highest combined risk exposure?

**Status:** Not supported as a measured KPI.

**Reason:**
- Financial risk inputs are not available.
- Business continuity risk inputs are not available.
- Approved risk scoring methodology and weights have not been established.
- Current delivery and quality indicators have known data limitations.

**Future Requirement:**

Before implementation, define:
- Risk dimensions.
- Individual scoring criteria.
- Weighting methodology.
- Risk thresholds.
- Evidence sources.
- Review frequency.
- Human approval and override rules.

**Important Rule:** Do not present an arbitrary weighted supplier risk score as an established business fact.

### 8.6 Supplier Financial Risk

**Business Question:** Which suppliers face financial distress or financial instability?

**Status:** Not supported.

**Future Requirement:** Introduce verified financial indicators, source references, assessment dates and review status.

### 8.7 Supplier Continuity Risk

**Business Question:** Which suppliers are exposed to capacity, geographic, operational or continuity risks?

**Status:** Not supported as a complete KPI.

**Future Requirement:** Introduce supplier capacity, dependency, geographic exposure, alternate-source and continuity assessment data.

---

## 9. KPI Summary and Implementation Matrix

| KPI | Source Dataset | Status |
|---|---|---|
| Delivery Event OTD (snapshot-period and full-dataset bases) | `delivery_transactions.csv` | Calculable with limitation |
| Late Delivery Event Count | `delivery_transactions.csv` | Calculable |
| Average Delivery Variance | `delivery_transactions.csv` | Calculable |
| Overdue Open PO Line Count | `purchase_orders.csv` | Calculable with limitation |
| Complete PO-Line OTD | PO and delivery data | Not supported |
| OTIF | PO and delivery data | Not supported |
| Inspection Rejection Rate | `supplier_quality.csv` | Calculable |
| Total Rejected Quantity | `supplier_quality.csv` | Calculable |
| Nonconformance Inspection Count | `supplier_quality.csv` | Calculable |
| Open Corrective Action Count | `supplier_quality.csv` | Calculable with limitation |
| Average Corrective Action Closure Duration | `supplier_quality.csv` | Calculable with limitation |
| CAPA On-Time Closure Rate | `supplier_quality.csv` | Not supported |
| Defects Per Million Units | `supplier_quality.csv` | Calculable |
| Gross PO Line Value (6.1) | `purchase_orders.csv` | Calculable |
| Cancelled PO Line Value (6.1.1) | `purchase_orders.csv` | Calculable |
| Net Active PO Line Value (6.1.2) | `purchase_orders.csv` | Calculable |
| Open PO Commitment Value | `purchase_orders.csv` | Calculable |
| Supplier PO Commitment Value | PO and supplier data | Calculable |
| Supplier Spend Concentration (net active basis, v2.2) | PO and supplier data | Calculable |
| Average PO Line Value | `purchase_orders.csv` | Calculable |
| Actual Invoiced Spend | Not available | Not supported |
| Total On-Hand Inventory Value | `inventory_snapshot.csv` | Calculable |
| Available Inventory Value | `inventory_snapshot.csv` | Calculable |
| Materials Below Reorder Point | `inventory_snapshot.csv` | Calculable |
| Safety Stock Breach Count | `inventory_snapshot.csv` | Calculable |
| Average Days of Supply | `inventory_snapshot.csv` | Calculable with limitation |
| Excess Inventory Value | `inventory_snapshot.csv` | Calculable with limitation |
| Inventory Status Distribution | `inventory_snapshot.csv` | Calculable with limitation |
| Inventory Trend | Not available | Not supported |
| Critical Supplier Count | `suppliers.csv` | Calculable |
| Qualification Status Distribution | `suppliers.csv` | Calculable |
| Certification Status Distribution | `suppliers.csv` | Calculable |
| Supplier Delivery and Quality Profile | Multiple datasets | Calculable with limitation |
| Composite Supplier Risk Score | Not available | Not supported |
| Supplier Financial Risk | Not available | Not supported |
| Supplier Continuity Risk | Not available | Not supported |

## 10. Dashboard Implementation Priorities

The following implementation sequence is recommended.

### Priority 1 – Core Executive Dashboard

- Gross, cancelled and net active PO line value.
- Open PO commitment value.
- Delivery Event OTD (snapshot-period and full-dataset bases).
- Inspection rejection rate.
- Total on-hand inventory value.
- Critical supplier count.

### Priority 2 – Supplier Performance Dashboard

- Supplier delivery-event OTD.
- Late delivery event count.
- Average delivery variance.
- Inspection rejection rate by supplier.
- Nonconformance inspection count.
- Open corrective-action count.
- Supplier qualification and certification status.

### Priority 3 – Procurement and Spend Dashboard

- Supplier PO commitment value.
- Supplier commitment concentration.
- Average PO line value.
- Open PO commitment value.
- Overdue open PO line count.

### Priority 4 – Inventory Intelligence Dashboard

- On-hand inventory value.
- Available inventory value.
- Materials below reorder point.
- Safety stock breach count.
- Average days of supply.
- Excess inventory value.
- Inventory status distribution.

### Priority 5 – Advanced Supplier Intelligence

- Supplier risk assessment.
- Supplier continuity exposure.
- Supplier financial risk.
- Complete PO-line OTD and OTIF.
- Historical inventory trend.
- CAPA on-time closure.

Advanced capabilities must be implemented only after the required source data and business rules are available.

## 11. Data Integrity and Calculation Controls

The application must apply the following controls:

1. Validate that all six CSV files are loaded successfully.
2. Validate primary keys and foreign-key references.
3. Validate required numeric fields before calculation.
4. Preserve blank values and distinguish them from zero.
5. Exclude in-transit deliveries from completed-event OTD.
6. Exclude service materials from physical inventory KPIs.
7. Aggregate PO-line values before joining to delivery or inspection details.
8. Calculate rejection rates using total rejected quantity divided by total inspected quantity.
9. Use supplier master criticality for supplier-level reporting.
10. Display the reporting period or snapshot date for time-dependent KPIs.
11. Display the denominator or record count alongside percentage KPIs where practical.
12. Display a clear message when a KPI cannot be calculated because of missing or invalid data.
13. Keep source CSV files unchanged during KPI calculations.
14. Record future changes to KPI definitions in `docs/decision-log.md` and update this document.

## 12. Known Limitations and Future Data Requirements

| Data Gap | Impact | Required Enhancement |
|---|---|---|
| Original promise-date history | Complete PO-line OTD and OTIF cannot be reliably reconstructed | `po_schedule_history` |
| Invoice data | Actual invoiced and paid spend unavailable | `invoices` |
| Inventory history | Historical inventory trends unavailable | `inventory_history` |
| CAPA due and closure dates | On-time corrective-action closure unavailable | `corrective_action_history` |
| Supplier financial data | Financial risk unavailable | `supplier_risk_inputs` |
| Supplier continuity and capacity data | Complete continuity risk unavailable | `supplier_capacity` and risk assessment inputs |
| Multiple approved sources | Alternate supplier exposure cannot be fully assessed | `supplier_approved_sources` |
| Certificate evidence and expiry dates | Detailed certification compliance cannot be assessed | Supplier certification evidence records |

These are future enhancements and must not be represented as existing capabilities.

## 13. Change Control

### Version History

| Version | Date | Change | Decision |
|---|---|---|---|
| 2.0 | Before 2026-11-13 | Implemented KPI definition baseline | – |
| 2.1 | 2026-11-13 | Clarified Delivery Event OTD reporting bases (4.1) | DEC-017 |
| 2.1 | 2026-11-13 | Defined Gross, Cancelled and Net Active PO Line Value (6.1, 6.1.1, 6.1.2) | DEC-019 |
| 2.2 | 2026-11-13 | Supplier Concentration (6.4) changed to Net Active PO Line Value in both numerator and denominator | DEC-023 |

Version 2.1 added clarifications only. Version 2.2 changes the 6.4 formula basis from gross to net active PO line value. No other KPI formula, filter or grain was changed.

This document is the Phase 1 KPI definition baseline for the six implemented CSV datasets.

Any change to KPI names, definitions, formulas, thresholds, filters, reporting grain or source datasets must be recorded in `docs/decision-log.md`.

Changes to the underlying dataset structure must also be reflected in `docs/data-model.md`.

All implemented dashboard KPIs must remain traceable to this document.

---

**Project:** Aerospace Supplier Intelligence Platform  
**Document:** KPI Dictionary  
**Version:** 2.2  
**Status:** Phase 1 KPI Definition Baseline with approved 2.1 and 2.2 clarifications  
**Data Classification:** Synthetic Demonstration Data  
**Reporting Currency:** USD
