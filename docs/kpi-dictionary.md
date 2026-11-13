
# Aerospace Supplier Intelligence Platform
# KPI Dictionary and Calculation Standards

**Document Version:** 1.0  
**Project Phase:** Phase 1 – KPI Definitions  
**Reporting Currency:** USD  
**Data Classification:** Synthetic Demonstration Data  
**Industry:** Aerospace Procurement

---

## 1. Purpose

This document establishes the standard definitions, formulas, calculation rules and interpretation guidelines for procurement and supply chain KPIs used in the Aerospace Supplier Intelligence Platform.

The KPI dictionary will serve as the reference for:

- Executive procurement dashboards.
- Supplier performance scorecards.
- Supplier delivery analytics.
- Supplier quality monitoring.
- Procurement expenditure analysis.
- Inventory intelligence.
- Supplier risk assessment.
- AI-assisted procurement recommendations.

All KPIs must be calculated using validated source data and documented business rules.

## 2. KPI Design Principles

1. Every KPI must have a clearly defined business meaning.
2. Every calculation must identify its source dataset.
3. KPI calculations must use the correct data grain.
4. Reporting periods must be consistently applied.
5. Missing values must not be treated as zero without justification.
6. Cancelled transactions must be excluded where appropriate.
7. Historical commitments must remain traceable.
8. KPI results must be reproducible.
9. AI must not independently invent or modify KPI values.
10. KPI thresholds must be configurable rather than permanently hardcoded.

## 3. Supplier Performance KPIs

### KPI 3.1 – Supplier On-Time Delivery (OTD)

**Objective:** Measure the percentage of due PO schedule lines fully delivered by their original committed delivery dates.

**Formula:**

OTD (%) = (Fully delivered schedule lines received on or before baseline due date / Eligible due schedule lines) × 100

**Source datasets:**
- po_schedules
- receipts
- purchase_orders

**Calculation rules:**
- Use baseline_due_date as the original delivery commitment.
- Aggregate receipts against each schedule_id.
- A schedule counts as on time only when the full ordered quantity has been physically received by the baseline due date.
- Partial deliveries do not qualify as fully delivered.
- Cancelled schedules are excluded.
- Only schedules due within the selected reporting period are included.
- Open overdue schedules remain in the denominator and count as not delivered on time.
- Future schedules are excluded.

**Reporting grain:** Supplier, month and reporting period.

### KPI 3.2 – Supplier On-Time In-Full (OTIF)

**Objective:** Measure the percentage of due PO schedule lines received in full and on time.

**Formula:**

OTIF (%) = (Schedule lines fully received by baseline due date / Eligible due schedule lines) × 100

For this initial model, OTD and OTIF use the same schedule-level completion rule. They are therefore equivalent.

A future line-level or shipment-level OTIF model may introduce additional requirements such as quantity acceptance and delivery location compliance.

### KPI 3.3 – Average Procurement Lead Time

**Objective:** Measure the average time taken from purchase order release to complete physical receipt.

**Formula:**

Average Lead Time (Days) = Sum of (Final Complete Receipt Date − PO Release Date) / Number of Fully Received Schedules

**Source datasets:**
- purchase_orders
- po_schedules
- receipts

**Calculation rules:**
- Use release_date as the start date.
- Use the date when cumulative received quantity reaches the ordered quantity as the completion date.
- Exclude open schedules.
- Exclude cancelled schedules.
- Report the average by supplier and reporting period.

### KPI 3.4 – Overdue PO Schedule Lines

**Objective:** Identify open delivery commitments that have exceeded their original due dates.

**Formula:**

Overdue Lines = Count of open or partially received schedules where current reporting date > baseline_due_date

**Source datasets:**
- po_schedules
- receipts

**Calculation rules:**
- Exclude cancelled schedules.
- Exclude fully received schedules.
- Include partially received schedules if outstanding quantities remain.
- Use the reporting date consistently.

### KPI 3.5 – Average Delivery Delay

**Objective:** Measure the average delay for schedules completed after the original commitment.

**Formula:**

Average Delay (Days) = Sum of (Final Complete Receipt Date − Baseline Due Date) for late completed schedules / Number of late completed schedules

Only positive delay values are included.

Open overdue schedules must be reported separately and must not be treated as completed deliveries.

---

## 4. Supplier Quality KPIs

### KPI 4.1 – Material Defect Rate

**Objective:** Measure the percentage of inspected material quantities rejected during incoming inspection.

**Formula:**

Defect Rate (%) = (Total Rejected Quantity / Total Inspected Quantity) × 100

**Source dataset:** receipts

**Calculation rules:**
- Use inspected_qty as the denominator.
- Use rejected_qty as the numerator.
- Exclude records where inspection is pending.
- Aggregate quantities before calculating the percentage.
- Do not calculate an unweighted average of individual receipt percentages.

### KPI 4.2 – Total Rejected Quantity

**Objective:** Measure the total quantity of material rejected during incoming inspection.

**Formula:**

Total Rejected Quantity = Sum of rejected_qty

**Source dataset:** receipts

### KPI 4.3 – Open Quality Events

**Objective:** Monitor unresolved supplier quality issues.

**Formula:**

Open Quality Events = Count of quality events where closure_status is not Closed

**Source dataset:** quality_events

**Calculation rules:**
- Exclude invalid or duplicate records.
- Allow filtering by supplier, severity and event date.
- Distinguish between Critical, Major and Minor events.

### KPI 4.4 – Corrective Action Closure Rate

**Objective:** Measure the percentage of corrective actions closed by their agreed deadlines.

**Formula:**

On-Time Closure Rate (%) = (Corrective actions closed on or before action due date / Corrective actions due for closure in the reporting period) × 100

**Source dataset:** quality_events

**Calculation rules:**
- Include only events where corrective_action_required = true.
- Count actions due within the reporting period.
- An action closed after its due date is not an on-time closure.
- Open overdue actions remain in the denominator.
- Actions not yet due are excluded.

---

## 5. Procurement Spend KPIs

### KPI 5.1 – Total Committed Procurement Spend

**Objective:** Measure the total value of purchase order commitments.

**Formula:**

Committed Spend (USD) = Sum of (Ordered Quantity × Unit Price USD)

**Source datasets:**
- purchase_orders
- po_schedules

**Calculation rules:**
- Exclude cancelled purchase orders and cancelled schedules.
- Include open and partially received commitments.
- Use schedule-level quantities and prices.
- Avoid double counting PO header values.
- This KPI represents committed purchase value, not actual payments or invoices.

### KPI 5.2 – Supplier-Wise Spend

**Objective:** Identify procurement expenditure concentration by supplier.

**Formula:**

Supplier Spend = Sum of (Ordered Quantity × Unit Price USD) for the selected supplier

**Source datasets:**
- purchase_orders
- po_schedules
- suppliers

### KPI 5.3 – Monthly Procurement Spend

**Objective:** Analyze purchase commitments over time.

**Formula:**

Monthly Spend = Sum of committed PO schedule value for purchase orders created in the selected month

**Date basis:** po_date

**Source datasets:**
- purchase_orders
- po_schedules

### KPI 5.4 – Supplier Spend Concentration

**Objective:** Identify dependency on individual suppliers.

**Formula:**

Supplier Concentration (%) = (Supplier Committed Spend / Total Committed Spend) × 100

Additional views:
- Top 5 supplier spend percentage.
- Top 10 supplier spend percentage.
- Supplier-wise spend distribution.

### KPI 5.5 – Average Purchase Order Value

**Objective:** Measure the average commercial value of issued purchase orders.

**Formula:**

Average PO Value = Total Committed Spend / Number of Eligible Purchase Orders

**Calculation rules:**
- Count each PO once.
- Exclude cancelled purchase orders.
- Use USD reporting values.

---

## 6. Inventory Intelligence KPIs

### KPI 6.1 – Available Inventory

**Objective:** Determine the quantity available after existing allocations.

**Formula:**

Available Inventory = On-Hand Quantity − Allocated Quantity

**Source dataset:** inventory_snapshots

### KPI 6.2 – Safety Stock Breaches

**Objective:** Identify materials whose available inventory has fallen below required safety stock.

**Formula:**

Safety Stock Breach = Available Inventory < Safety Stock Quantity

**Reporting output:**
- Number of affected materials.
- Affected material IDs.
- Shortage quantity.
- Material criticality.

**Shortage Quantity:**

Safety Stock Shortage = Maximum of (Safety Stock Quantity − Available Inventory, 0)

### KPI 6.3 – Inventory Coverage

**Objective:** Estimate the number of days existing available inventory can support demand.

**Formula:**

Inventory Coverage (Days) = Available Inventory / Average Daily Demand

**Calculation rules:**
- If average daily demand is zero or missing, return N/A.
- Use consistent units of measure.
- Use the selected inventory snapshot date.

### KPI 6.4 – Excess Inventory

**Objective:** Identify stock above the defined maximum inventory target.

**Formula:**

Excess Inventory Quantity = Maximum of (Available Inventory − Maximum Stock Quantity, 0)

**Reporting output:**
- Number of materials with excess stock.
- Total excess quantity by material.
- Estimated excess stock value where a valid unit valuation is available.

### KPI 6.5 – Reorder Alerts

**Objective:** Identify materials requiring replenishment.

**Formula:**

Reorder Alert = Available Inventory ≤ Reorder Point Quantity

**Reporting output:**
- Material ID.
- Current available stock.
- Reorder point.
- Safety stock.
- Preferred supplier.
- Standard lead time.

In-transit quantities will be displayed separately in the initial version. They will not be silently included in available physical inventory.

---

## 7. Supplier Risk Intelligence KPIs

### KPI 7.1 – Supplier Composite Risk Score

**Objective:** Calculate an explainable supplier risk score using defined risk dimensions.

**Initial proposed weighting:**

| Risk Dimension | Weight |
|---|---:|
| Delivery Risk | 35% |
| Quality Risk | 30% |
| Financial Risk | 20% |
| Supply Continuity Risk | 15% |
| Total | 100% |

**Formula:**

Composite Risk Score =

(Delivery Risk × 0.35) +
(Quality Risk × 0.30) +
(Financial Risk × 0.20) +
(Continuity Risk × 0.15)

Each input score ranges from 0 to 100.

Higher scores indicate greater supplier risk.

**Initial risk classification:**

| Score | Classification |
|---|---|
| 0–24 | Low |
| 25–49 | Moderate |
| 50–74 | High |
| 75–100 | Critical |

These are proposed demonstration thresholds and require business validation.

### KPI 7.2 – High-Risk Supplier Count

**Objective:** Identify suppliers requiring management attention.

**Formula:**

High-Risk Supplier Count = Count of active suppliers with composite risk score ≥ 50

### KPI 7.3 – Critical Supplier Exposure

**Objective:** Identify procurement commitments associated with critical-risk suppliers.

**Formula:**

Critical Supplier Exposure (%) = (Committed Spend with Critical-Risk Suppliers / Total Committed Spend) × 100

Risk assessment date and spend reporting period must be clearly aligned.

### KPI 7.4 – Supplier Dependency

**Objective:** Identify high procurement concentration among suppliers.

**Formula:**

Supplier Dependency (%) = Individual Supplier Committed Spend / Total Committed Spend × 100

This KPI will support supply continuity and sourcing diversification analysis.

---

## 8. Executive Dashboard KPI Summary

The following KPIs are recommended for the initial executive dashboard.

| Category | KPI | Display |
|---|---|---|
| Supplier Performance | Supplier OTD | Percentage |
| Supplier Performance | Overdue PO Lines | Count |
| Supplier Performance | Average Lead Time | Days |
| Supplier Quality | Defect Rate | Percentage |
| Supplier Quality | Open Quality Events | Count |
| Procurement Spend | Total Committed Spend | USD |
| Procurement Spend | Top Supplier Concentration | Percentage |
| Inventory | Safety Stock Breaches | Count |
| Inventory | Inventory Coverage | Days |
| Supplier Risk | High-Risk Supplier Count | Count |
| Supplier Risk | Critical Supplier Exposure | Percentage |

## 9. KPI Calculation and Reporting Standards

### 9.1 Reporting Period

The platform will initially support:
- Monthly reporting.
- Quarterly reporting.
- Year-to-date reporting.
- Rolling 12-month analysis.
- Custom date-range filtering.

### 9.2 Aggregation Rules

- Calculate percentages using aggregated numerators and denominators.
- Do not average individual supplier percentages to derive overall performance.
- Use unique IDs to prevent duplicate transaction counting.
- Respect the underlying dataset grain.
- Apply reporting-period filters consistently.
- Distinguish historical performance from current operational status.

### 9.3 Missing Data

- Missing values must be reported as N/A where appropriate.
- Zero must represent a confirmed zero value.
- Missing supplier assessments must not automatically be classified as low risk.
- Missing delivery dates must be flagged for validation.
- Incomplete inspection records must not be included in defect-rate calculations.

### 9.4 KPI Traceability

Every dashboard KPI must be traceable to:
- Source dataset.
- Source field.
- Calculation formula.
- Reporting date.
- Applied filters.
- Validation status.

---

## 10. AI-Assisted KPI Interpretation

The AI Procurement Assistant will use validated KPI outputs to generate explanations and recommendations.

Examples:

**Supplier Performance:**
"Which suppliers have the highest number of overdue PO schedules?"

**Delivery Recovery:**
"Which suppliers require immediate delivery recovery action?"

**Quality:**
"Which suppliers have the highest material rejection rates?"

**Spend Analytics:**
"Which suppliers account for the largest share of committed procurement spend?"

**Inventory:**
"Which critical materials are below safety stock?"

**Supplier Risk:**
"Which high-risk suppliers have significant procurement exposure?"

### AI Governance Rules

1. AI must use actual calculated KPI results from the application.
2. AI must not fabricate supplier performance statistics.
3. AI recommendations must identify the supporting data.
4. AI must distinguish between observed facts and interpretations.
5. AI must highlight missing or insufficient data.
6. Risk recommendations must be explainable.
7. AI-generated recommendations must remain subject to human review.

---

## 11. Future KPI Enhancements

The following metrics may be introduced after the initial dashboard is validated:

- Supplier OTD trend and rolling average.
- Supplier delivery recovery effectiveness.
- Purchase price variance.
- Contract compliance.
- Inventory turnover.
- Days of inventory on hand.
- Forecast accuracy.
- Supplier capacity utilization.
- Supplier lead-time variability.
- Corrective action aging.
- Supplier audit compliance.
- Risk trend and risk movement.
- Supplier performance improvement tracking.

These require additional datasets or more detailed historical information.

## 12. Implementation and Validation

The KPI calculation logic will be implemented using JavaScript.

Initial validation will include:

- Manual verification of sample KPI calculations.
- Cross-checking dashboard totals against source records.
- Testing partial delivery scenarios.
- Testing overdue and cancelled schedules.
- Testing incomplete inspection records.
- Testing missing inventory data.
- Validating supplier risk score calculations.
- Testing date filters and reporting periods.

No KPI will be marked validated until its calculations have been tested against known sample records.

---

**Project:** Aerospace Supplier Intelligence Platform  
**Document:** KPI Dictionary and Calculation Standards  
**Version:** 1.0  
**Status:** Proposed Phase 1 Baseline  
**Reporting Currency:** USD  
**Data Classification:** Synthetic Demonstration Data
