/**
 * KPI engine – implements docs/kpi-dictionary.md Version 2.2.
 *
 * Every function is "pure": it takes typed data (from data-loader.js) and returns a result
 * object. Nothing here touches the screen or changes the data.
 *
 * Standard result shape:
 * {
 *   kpiId, label, value, unit, numerator, denominator, n,
 *   basis, asOfDate, status, limitation, reason?, items?
 * }
 *   value      – null when the KPI cannot be calculated (never a misleading 0)
 *   status     – KPI Dictionary status: 'Calculable' | 'Calculable with limitation' | 'Not supported'
 *   reason     – present when value is null, explaining why
 *
 * Grain rules (KPI Dictionary section 2 and 11):
 *   - PO values are aggregated from purchase_orders.csv only, before any join.
 *   - Delivery metrics are aggregated from delivery_transactions.csv only.
 *   - Quality metrics are aggregated from supplier_quality.csv only.
 *   - Supplier-level results are built by aggregating each source separately, then placing
 *     the results side by side. Rows are never joined before aggregation.
 */

import { isPhysical } from './schema.js';

const CALC = 'Calculable';
const LIMITED = 'Calculable with limitation';
const NOT_SUPPORTED = 'Not supported';

const sum = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0);
const pct = (num, den) => (den > 0 ? (num / den) * 100 : null);
const avg = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

function kpi(fields) {
  return {
    numerator: null,
    denominator: null,
    n: null,
    basis: null,
    asOfDate: null,
    limitation: null,
    ...fields,
  };
}

/* ======================================================================
 * Shared selections
 * ==================================================================== */

/** Delivered events with a valid on-time flag (KPI 4.1 filters). */
export function deliveredEvents(deliveries) {
  return deliveries.filter((r) => r.delivery_status === 'Delivered' && r.on_time_flag !== null);
}

/**
 * Delivered events for a reporting basis (DEC-017):
 *   'snapshot' – actual_delivery_date on or before the as-of date
 *   'full'     – all delivered events in the file
 */
export function deliveredForBasis(deliveries, basis, asOfDate) {
  const all = deliveredEvents(deliveries);
  if (basis === 'full') return all;
  if (basis === 'snapshot') return all.filter((r) => r.actual_delivery_date !== null && r.actual_delivery_date <= asOfDate);
  throw new Error(`Unknown OTD basis "${basis}"`);
}

export const BASIS_LABEL = Object.freeze({
  snapshot: (asOf) => `Snapshot period (delivered on or before ${asOf})`,
  full: () => 'Full dataset (all delivered events in source file)',
});

/** Net active value of one PO line: line_total_usd − cancelled_qty × unit_price_usd (KPI 6.1.2 / 6.4 v2.2). */
export const netActiveLineValue = (r) => r.line_total_usd - r.cancelled_qty * r.unit_price_usd;

/** Inspection records usable for rate KPIs (inspected quantity > 0). */
const validInspections = (quality) => quality.filter((r) => typeof r.inspected_qty === 'number' && r.inspected_qty > 0);

/** True when a corrective action is open (KPI 5.4). */
export const isOpenCorrectiveAction = (r) =>
  r.corrective_action_required === 'Yes' && !['Closed', 'Not Required'].includes(r.corrective_action_status);

/* ======================================================================
 * 4. Supplier delivery performance
 * ==================================================================== */

export function deliveryEventOtd(d, { basis, asOfDate }) {
  const rows = deliveredForBasis(d.delivery_transactions, basis, asOfDate);
  const onTime = rows.filter((r) => r.on_time_flag === 1).length;
  return kpi({
    kpiId: '4.1',
    label: basis === 'snapshot' ? 'Delivery Event OTD – snapshot period' : 'Delivery Event OTD – full dataset',
    value: pct(onTime, rows.length),
    unit: '%',
    numerator: onTime,
    denominator: rows.length,
    n: rows.length,
    basis: BASIS_LABEL[basis](asOfDate),
    asOfDate,
    status: LIMITED,
    limitation: 'Delivery-event OTD only. Not PO-line OTD, not OTIF, not schedule adherence. A PO line can have several partial deliveries.',
    reason: rows.length ? undefined : 'No delivered events on this basis',
  });
}

export function lateDeliveryEventCount(d, { basis, asOfDate }) {
  const rows = deliveredForBasis(d.delivery_transactions, basis, asOfDate);
  const late = rows.filter((r) => r.on_time_flag === 0).length;
  return kpi({
    kpiId: '4.2',
    label: 'Late delivery events',
    value: late,
    unit: 'events',
    numerator: late,
    denominator: rows.length,
    n: rows.length,
    basis: BASIS_LABEL[basis](asOfDate),
    asOfDate,
    status: CALC,
  });
}

export function averageDeliveryVariance(d, { basis, asOfDate }) {
  const values = deliveredForBasis(d.delivery_transactions, basis, asOfDate)
    .map((r) => r.delivery_variance_days)
    .filter((v) => v !== null);
  return kpi({
    kpiId: '4.3',
    label: 'Average delivery variance',
    value: avg(values),
    unit: 'days',
    n: values.length,
    basis: BASIS_LABEL[basis](asOfDate),
    asOfDate,
    status: CALC,
    limitation: 'Negative = early, positive = late, 0 = on the promised date.',
    reason: values.length ? undefined : 'No delivered events with a recorded variance',
  });
}

export function overdueOpenPoLines(d, { asOfDate }) {
  const open = d.purchase_orders.filter((r) => r.open_qty > 0);
  const overdue = open.filter((r) => r.promised_delivery_date !== null && r.promised_delivery_date < asOfDate);
  return kpi({
    kpiId: '4.4',
    label: 'Overdue open PO lines',
    value: overdue.length,
    unit: 'PO lines',
    numerator: overdue.length,
    denominator: open.length,
    n: open.length,
    basis: `Open quantity > 0 and promised date before ${asOfDate}`,
    asOfDate,
    status: LIMITED,
    limitation: 'Measured against the currently recorded promise date; original promise dates and revision history are not available.',
    items: overdue.map((r) => r.po_line_id),
  });
}

/* ======================================================================
 * 5. Supplier quality
 * ==================================================================== */

const QUALITY_BASIS = 'All recorded inspection events in the source file';
const QUALITY_LIMITATION = 'Inspection events linked to delivered events only; not every inspection performed by a supplier.';

export function inspectionRejectionRate(d) {
  const rows = validInspections(d.supplier_quality);
  const rej = sum(rows, (r) => r.rejected_qty);
  const insp = sum(rows, (r) => r.inspected_qty);
  return kpi({
    kpiId: '5.1',
    label: 'Inspection rejection rate',
    value: pct(rej, insp),
    unit: '%',
    numerator: rej,
    denominator: insp,
    n: rows.length,
    basis: QUALITY_BASIS,
    status: CALC,
    limitation: `Quantity-weighted (Σ rejected ÷ Σ inspected), not an average of percentages. ${QUALITY_LIMITATION}`,
  });
}

export function totalRejectedQuantity(d) {
  const rows = validInspections(d.supplier_quality);
  return kpi({ kpiId: '5.2', label: 'Total rejected quantity', value: sum(rows, (r) => r.rejected_qty), unit: 'units', n: rows.length, basis: QUALITY_BASIS, status: CALC });
}

export function nonconformanceInspectionCount(d) {
  const nc = d.supplier_quality.filter((r) => r.quality_result === 'Nonconformance');
  return kpi({
    kpiId: '5.3',
    label: 'Nonconformance inspections',
    value: nc.length,
    unit: 'inspections',
    n: d.supplier_quality.length,
    basis: QUALITY_BASIS,
    status: CALC,
    limitation: 'Counts inspection events with a nonconformance, not individual defects or unique quality incidents.',
    items: nc.map((r) => r.inspection_id),
  });
}

export function openCorrectiveActionCount(d) {
  const open = d.supplier_quality.filter(isOpenCorrectiveAction);
  return kpi({
    kpiId: '5.4',
    label: 'Open corrective actions',
    value: open.length,
    unit: 'actions',
    n: d.supplier_quality.filter((r) => r.corrective_action_required === 'Yes').length,
    basis: 'Corrective action required and status not Closed / Not Required',
    status: LIMITED,
    limitation: 'Inspection-linked corrective-action records, not necessarily unique enterprise CAPA cases.',
    items: open.map((r) => r.inspection_id),
  });
}

export function averageCorrectiveActionClosure(d) {
  const values = d.supplier_quality.map((r) => r.corrective_action_closure_days).filter((v) => v !== null);
  return kpi({
    kpiId: '5.5',
    label: 'Average corrective-action closure duration',
    value: avg(values),
    unit: 'days',
    n: values.length,
    basis: 'Records with a populated closure duration only (blank is not zero)',
    status: LIMITED,
    limitation: `Based on ${values.length} record(s). Treat a very small sample with caution.`,
    reason: values.length ? undefined : 'No populated closure durations',
  });
}

export function defectsPerMillion(d) {
  const rows = validInspections(d.supplier_quality);
  const rej = sum(rows, (r) => r.rejected_qty);
  const insp = sum(rows, (r) => r.inspected_qty);
  return kpi({
    kpiId: '5.7',
    label: 'Defects per million units (DPM)',
    value: insp > 0 ? (rej / insp) * 1e6 : null,
    unit: 'DPM',
    numerator: rej,
    denominator: insp,
    n: rows.length,
    basis: QUALITY_BASIS,
    status: CALC,
    limitation: 'Rejected units per million inspected units, not a count of individual defect occurrences.',
  });
}

/* ======================================================================
 * 6. Procurement spend and commercial
 * ==================================================================== */

const PO_LIMITATION = 'PO line value, not invoiced, paid or accounting spend.';

export function grossPoLineValue(d) {
  return kpi({ kpiId: '6.1', label: 'Gross PO line value', value: sum(d.purchase_orders, (r) => r.line_total_usd), unit: 'USD', n: d.purchase_orders.length, status: CALC, limitation: `Includes cancelled quantities. ${PO_LIMITATION}` });
}

export function cancelledPoLineValue(d) {
  const lines = d.purchase_orders.filter((r) => r.cancelled_qty > 0);
  return kpi({ kpiId: '6.1.1', label: 'Cancelled PO line value', value: sum(d.purchase_orders, (r) => r.cancelled_qty * r.unit_price_usd), unit: 'USD', n: lines.length, status: CALC, limitation: PO_LIMITATION });
}

export function netActivePoLineValue(d) {
  return kpi({ kpiId: '6.1.2', label: 'Net active PO line value', value: sum(d.purchase_orders, netActiveLineValue), unit: 'USD', n: d.purchase_orders.length, basis: 'Gross PO line value − cancelled PO line value', status: CALC, limitation: `Received plus open value. ${PO_LIMITATION}` });
}

export function openPoCommitmentValue(d) {
  const open = d.purchase_orders.filter((r) => r.open_qty > 0);
  return kpi({ kpiId: '6.2', label: 'Open PO commitment value', value: sum(open, (r) => r.open_qty * r.unit_price_usd), unit: 'USD', n: open.length, status: CALC, limitation: 'Value of outstanding PO quantities, not an invoice liability or confirmed cash obligation.' });
}

/**
 * KPI 6.3 (gross, as defined) and KPI 6.4 (net active, v2.2), per supplier.
 * Aggregated from purchase_orders.csv only.
 */
export function supplierCommitment(d) {
  const bySupplier = new Map(d.suppliers.map((s) => [s.supplier_id, { supplier_id: s.supplier_id, supplier_name: s.supplier_name, poLines: 0, grossValue: 0, netActiveValue: 0 }]));
  for (const r of d.purchase_orders) {
    let e = bySupplier.get(r.supplier_id);
    if (!e) {
      e = { supplier_id: r.supplier_id, supplier_name: null, poLines: 0, grossValue: 0, netActiveValue: 0 };
      bySupplier.set(r.supplier_id, e);
    }
    e.poLines++;
    e.grossValue += r.line_total_usd;
    e.netActiveValue += netActiveLineValue(r);
  }
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  const items = [...bySupplier.values()]
    .map((e) => ({ ...e, concentrationPct: pct(e.netActiveValue, totalNet) }))
    .sort((a, b) => b.netActiveValue - a.netActiveValue || a.supplier_id.localeCompare(b.supplier_id));
  return {
    commitment: kpi({ kpiId: '6.3', label: 'Supplier PO commitment value (gross)', value: null, unit: 'USD', n: items.length, status: CALC, limitation: `Gross line value per supplier, includes cancelled value. ${PO_LIMITATION}`, items: items.map(({ supplier_id, supplier_name, poLines, grossValue, netActiveValue }) => ({ supplier_id, supplier_name, poLines, grossValue, netActiveValue })) }),
    concentration: kpi({ kpiId: '6.4', label: 'Supplier concentration (net active PO line value)', value: null, unit: '%', denominator: totalNet, n: items.length, basis: 'Supplier net active ÷ total net active PO line value (KPI Dictionary v2.2)', status: CALC, limitation: 'Concentration of active PO line value, not actual spend or financial dependency.', items: items.map(({ supplier_id, supplier_name, netActiveValue, concentrationPct }) => ({ supplier_id, supplier_name, netActiveValue, concentrationPct })) }),
  };
}

export function averagePoLineValue(d) {
  const total = sum(d.purchase_orders, (r) => r.line_total_usd);
  return kpi({ kpiId: '6.5', label: 'Average PO line value', value: d.purchase_orders.length ? total / d.purchase_orders.length : null, unit: 'USD', numerator: total, denominator: d.purchase_orders.length, n: d.purchase_orders.length, basis: 'Gross PO line value ÷ number of PO lines', status: CALC, limitation: PO_LIMITATION });
}

/* ======================================================================
 * 7. Inventory and material planning (physical materials only)
 * ==================================================================== */

const physical = (d) => d.inventory_snapshot.filter(isPhysical);
const snapshotDateOf = (rows) => [...new Set(rows.map((r) => r.snapshot_date))].join(', ') || null;
const INV_BASIS = 'Physical materials only (SERVICE excluded), available stock = on-hand − allocated';

export function onHandInventoryValue(d) {
  const rows = physical(d);
  return kpi({ kpiId: '7.1', label: 'On-hand inventory value', value: sum(rows, (r) => r.on_hand_inventory_value_usd), unit: 'USD', n: rows.length, basis: 'Physical materials only (SERVICE excluded)', asOfDate: snapshotDateOf(rows), status: CALC, limitation: 'Point-in-time snapshot, not a trend.' });
}

export function availableInventoryValue(d) {
  const rows = physical(d);
  return kpi({ kpiId: '7.2', label: 'Available inventory value', value: sum(rows, (r) => r.available_inventory_value_usd), unit: 'USD', n: rows.length, basis: INV_BASIS, asOfDate: snapshotDateOf(rows), status: CALC });
}

export function materialsBelowReorderPoint(d) {
  const rows = physical(d);
  const below = rows.filter((r) => r.available_qty < r.reorder_point_qty);
  return kpi({ kpiId: '7.3', label: 'Materials below reorder point', value: below.length, unit: 'materials', numerator: below.length, denominator: rows.length, n: rows.length, basis: INV_BASIS, asOfDate: snapshotDateOf(rows), status: CALC, limitation: 'Available-stock basis. May differ from the supplied inventory status, which is on-hand based (DEC-018). Includes materials also below safety stock.', items: below.map((r) => r.material_id) });
}

export function safetyStockBreachCount(d) {
  const rows = physical(d).filter((r) => r.safety_stock_qty !== null && r.available_qty !== null);
  const breach = rows.filter((r) => r.available_qty < r.safety_stock_qty);
  return kpi({ kpiId: '7.4', label: 'Safety stock breaches', value: breach.length, unit: 'materials', numerator: breach.length, denominator: rows.length, n: rows.length, basis: INV_BASIS, asOfDate: snapshotDateOf(rows), status: CALC, limitation: 'Available-stock basis. May differ from the supplied inventory status, which is on-hand based (DEC-018).', items: breach.map((r) => r.material_id) });
}

export function averageDaysOfSupply(d) {
  const rows = physical(d).filter((r) => r.days_of_supply !== null && r.average_daily_demand_qty !== null && r.average_daily_demand_qty > 0);
  const excluded = physical(d).length - rows.length;
  return kpi({ kpiId: '7.5', label: 'Average days of supply', value: avg(rows.map((r) => r.days_of_supply)), unit: 'days', n: rows.length, basis: `Physical materials with demand > 0 and a recorded value${excluded ? `; ${excluded} excluded` : ''}`, asOfDate: snapshotDateOf(rows), status: LIMITED, limitation: 'Snapshot planning indicator using synthetic demand assumptions, not a forecast.' });
}

export function excessInventoryValue(d) {
  const rows = physical(d).filter((r) => r.inventory_status === 'Excess');
  return kpi({ kpiId: '7.6', label: 'Excess inventory value', value: sum(rows, (r) => r.on_hand_inventory_value_usd), unit: 'USD', n: rows.length, basis: 'Supplied inventory_status = Excess (on-hand value)', asOfDate: snapshotDateOf(rows), status: LIMITED, limitation: 'Uses the supplied Excess classification; its threshold rule is not documented.', items: rows.map((r) => r.material_id) });
}

export function inventoryStatusDistribution(d) {
  const rows = physical(d);
  const counts = {};
  for (const r of rows) counts[r.inventory_status] = (counts[r.inventory_status] || 0) + 1;
  return kpi({ kpiId: '7.7', label: 'Supplied inventory status (on-hand basis)', value: counts, unit: 'materials', n: rows.length, basis: 'Supplied classification, based on on-hand stock (DEC-018)', asOfDate: snapshotDateOf(rows), status: LIMITED, limitation: 'Supplied classification. Uses on-hand stock, so it can differ from KPI 7.3 and 7.4, which use available stock.' });
}

/* ======================================================================
 * 8. Supplier profile and risk indicators
 * ==================================================================== */

export function criticalSupplierCount(d) {
  const crit = d.suppliers.filter((s) => s.criticality === 'Critical');
  return kpi({ kpiId: '8.1', label: 'Critical suppliers', value: crit.length, unit: 'suppliers', numerator: crit.length, denominator: d.suppliers.length, n: d.suppliers.length, basis: 'suppliers.csv criticality', status: CALC, items: crit.map((s) => s.supplier_id) });
}

function distribution(rows, field) {
  const out = {};
  for (const r of rows) out[r[field]] = (out[r[field]] || 0) + 1;
  return out;
}

export function qualificationStatusDistribution(d) {
  return kpi({ kpiId: '8.2', label: 'Supplier qualification status', value: distribution(d.suppliers, 'qualification_status'), unit: 'suppliers', n: d.suppliers.length, status: CALC });
}

export function certificationStatusDistribution(d) {
  return kpi({ kpiId: '8.3', label: 'Supplier certification status', value: distribution(d.suppliers, 'certification_status'), unit: 'suppliers', n: d.suppliers.length, status: CALC, limitation: 'Certification assessment status only; no certificate names, expiry dates or evidence.' });
}

/**
 * KPI 8.4 – Supplier delivery and quality profile.
 * Each source is aggregated separately per supplier, then combined (no row-level joins).
 * Indicators are shown individually; no composite risk score is produced (KPI 8.5).
 */
export function supplierProfiles(d, { asOfDate }) {
  const blank = () => ({ delFull: 0, onTimeFull: 0, lateFull: 0, varSumFull: 0, varNFull: 0, delSnap: 0, onTimeSnap: 0, inspected: 0, rejected: 0, inspections: 0, nonconformances: 0, openCorrectiveActions: 0 });
  const agg = new Map(d.suppliers.map((s) => [s.supplier_id, blank()]));
  const get = (id) => {
    if (!agg.has(id)) agg.set(id, blank());
    return agg.get(id);
  };

  // Delivery events (one pass over delivery_transactions)
  for (const r of deliveredEvents(d.delivery_transactions)) {
    const a = get(r.supplier_id);
    a.delFull++;
    if (r.on_time_flag === 1) a.onTimeFull++;
    if (r.on_time_flag === 0) a.lateFull++;
    if (r.delivery_variance_days !== null) {
      a.varSumFull += r.delivery_variance_days;
      a.varNFull++;
    }
    if (r.actual_delivery_date !== null && r.actual_delivery_date <= asOfDate) {
      a.delSnap++;
      if (r.on_time_flag === 1) a.onTimeSnap++;
    }
  }

  // Inspection records (one pass over supplier_quality)
  for (const r of d.supplier_quality) {
    const a = get(r.supplier_id);
    if (r.quality_result === 'Nonconformance') a.nonconformances++;
    if (isOpenCorrectiveAction(r)) a.openCorrectiveActions++;
    if (typeof r.inspected_qty === 'number' && r.inspected_qty > 0) {
      a.inspections++;
      a.inspected += r.inspected_qty;
      a.rejected += r.rejected_qty;
    }
  }

  const master = new Map(d.suppliers.map((s) => [s.supplier_id, s]));
  const items = [...agg.entries()].map(([id, a]) => {
    const s = master.get(id) || {};
    return {
      supplier_id: id,
      supplier_name: s.supplier_name ?? null,
      country: s.country ?? null,
      supplier_tier: s.supplier_tier ?? null,
      supplier_status: s.supplier_status ?? null,
      criticality: s.criticality ?? null, // from suppliers.csv only
      qualification_status: s.qualification_status ?? null,
      certification_status: s.certification_status ?? null,
      deliveredEventsFull: a.delFull,
      otdFullPct: pct(a.onTimeFull, a.delFull),
      deliveredEventsSnapshot: a.delSnap,
      otdSnapshotPct: pct(a.onTimeSnap, a.delSnap),
      lateEventsFull: a.lateFull,
      avgVarianceDaysFull: a.varNFull ? a.varSumFull / a.varNFull : null,
      inspections: a.inspections,
      inspectedQty: a.inspected,
      rejectedQty: a.rejected,
      rejectionRatePct: pct(a.rejected, a.inspected),
      nonconformances: a.nonconformances,
      openCorrectiveActions: a.openCorrectiveActions,
    };
  });
  items.sort((x, y) => x.supplier_id.localeCompare(y.supplier_id));

  return kpi({
    kpiId: '8.4',
    label: 'Supplier delivery and quality profile',
    value: null,
    n: items.length,
    basis: `Delivery and inspection data aggregated separately per supplier; OTD on snapshot (≤ ${asOfDate}) and full-dataset bases`,
    asOfDate,
    status: LIMITED,
    limitation: 'Indicators are shown individually. No composite risk score (KPI Dictionary 8.5). A blank rate means no qualifying records, not zero.',
    items,
  });
}

/* ======================================================================
 * Not supported KPIs (shown as such, never estimated)
 * ==================================================================== */

export const NOT_SUPPORTED_KPIS = Object.freeze([
  { kpiId: '4.5', label: 'Complete PO-line OTD', reason: 'Original commitment dates and promise-date revision history are not available.' },
  { kpiId: '4.6', label: 'OTIF – On Time In Full', reason: 'Original commitment baseline and complete schedule history are not available. Delivery Event OTD is not a substitute.' },
  { kpiId: '5.6', label: 'CAPA on-time closure rate', reason: 'Corrective-action due dates and actual closure dates are not available.' },
  { kpiId: '6.6', label: 'Actual invoiced spend', reason: 'No invoice dataset is implemented.' },
  { kpiId: '7.8', label: 'Inventory trend', reason: 'Only one inventory snapshot date is available.' },
  { kpiId: '8.5', label: 'Composite supplier risk score', reason: 'No financial or continuity risk inputs and no approved scoring methodology.' },
  { kpiId: '8.6', label: 'Supplier financial risk', reason: 'No verified financial indicators are available.' },
  { kpiId: '8.7', label: 'Supplier continuity risk', reason: 'No capacity, dependency, alternate-source or continuity data is available.' },
].map((k) => Object.freeze({ ...k, value: null, status: NOT_SUPPORTED })));

/* ======================================================================
 * All KPIs
 * ==================================================================== */

/**
 * Calculates every KPI.
 * @param {object} d – typed rows by dataset name (rowsOf(loadResult))
 * @param {object} options – { asOfDate }
 */
export function computeAllKpis(d, { asOfDate }) {
  const opts = { asOfDate };
  const commitment = supplierCommitment(d);
  return {
    asOfDate,
    delivery: {
      otdSnapshot: deliveryEventOtd(d, { ...opts, basis: 'snapshot' }),
      otdFull: deliveryEventOtd(d, { ...opts, basis: 'full' }),
      lateSnapshot: lateDeliveryEventCount(d, { ...opts, basis: 'snapshot' }),
      lateFull: lateDeliveryEventCount(d, { ...opts, basis: 'full' }),
      varianceSnapshot: averageDeliveryVariance(d, { ...opts, basis: 'snapshot' }),
      varianceFull: averageDeliveryVariance(d, { ...opts, basis: 'full' }),
      overdueOpenPoLines: overdueOpenPoLines(d, opts),
    },
    quality: {
      rejectionRate: inspectionRejectionRate(d),
      totalRejected: totalRejectedQuantity(d),
      nonconformances: nonconformanceInspectionCount(d),
      openCorrectiveActions: openCorrectiveActionCount(d),
      avgClosure: averageCorrectiveActionClosure(d),
      dpm: defectsPerMillion(d),
    },
    procurement: {
      gross: grossPoLineValue(d),
      cancelled: cancelledPoLineValue(d),
      netActive: netActivePoLineValue(d),
      openCommitment: openPoCommitmentValue(d),
      supplierCommitment: commitment.commitment,
      concentration: commitment.concentration,
      averageLine: averagePoLineValue(d),
    },
    inventory: {
      onHandValue: onHandInventoryValue(d),
      availableValue: availableInventoryValue(d),
      belowReorderPoint: materialsBelowReorderPoint(d),
      safetyStockBreaches: safetyStockBreachCount(d),
      daysOfSupply: averageDaysOfSupply(d),
      excessValue: excessInventoryValue(d),
      statusDistribution: inventoryStatusDistribution(d),
    },
    suppliers: {
      critical: criticalSupplierCount(d),
      qualification: qualificationStatusDistribution(d),
      certification: certificationStatusDistribution(d),
      profiles: supplierProfiles(d, opts),
    },
    notSupported: NOT_SUPPORTED_KPIS,
  };
}
