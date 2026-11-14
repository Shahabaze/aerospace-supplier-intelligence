/**
 * KPI engine – implements docs/kpi-dictionary.md Version 2.3.
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
  return kpi({ kpiId: '6.5', label: 'Average gross PO line value', value: d.purchase_orders.length ? total / d.purchase_orders.length : null, unit: 'USD', numerator: total, denominator: d.purchase_orders.length, n: d.purchase_orders.length, basis: 'Gross PO line value ÷ number of PO lines', status: CALC, limitation: PO_LIMITATION });
}

/* ======================================================================
 * 6 (continued). Procurement intelligence – KPI Dictionary v2.3
 * All at PO-line grain from purchase_orders.csv; no joins before aggregation.
 * ==================================================================== */

/** Whole calendar days from date text a to b (b − a). Both YYYY-MM-DD. */
export function daysBetweenDates(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** KPI 4.4.1 ageing buckets (DEC-027), inclusive day ranges. */
export const AGEING_BUCKETS = Object.freeze([
  Object.freeze({ id: '1-30', label: '1–30 days', min: 1, max: 30 }),
  Object.freeze({ id: '31-90', label: '31–90 days', min: 31, max: 90 }),
  Object.freeze({ id: '91-180', label: '91–180 days', min: 91, max: 180 }),
  Object.freeze({ id: '181+', label: 'Over 180 days', min: 181, max: null }),
]);

/** Bucket for a number of days past the promised date; null when not overdue (≤ 0) or missing. */
export function ageingBucket(daysPast) {
  if (daysPast === null || daysPast === undefined || daysPast < 1) return null;
  return AGEING_BUCKETS.find((b) => daysPast >= b.min && (b.max === null || daysPast <= b.max)) || null;
}

const openValue = (r) => r.open_qty * r.unit_price_usd;
const isOpenLine = (r) => r.open_qty > 0;
/** KPI 4.4 / 6.8 rule: open quantity and recorded promised date before the as-of date. */
export const isOverdueLine = (r, asOfDate) => isOpenLine(r) && r.promised_delivery_date !== null && r.promised_delivery_date < asOfDate;
const daysPastPromised = (r, asOfDate) => (r.promised_delivery_date === null ? null : daysBetweenDates(r.promised_delivery_date, asOfDate));

export function receivedPoLineValue(d) {
  return kpi({ kpiId: '6.7', label: 'Received PO line value', value: sum(d.purchase_orders, (r) => r.received_qty * r.unit_price_usd), unit: 'USD', n: d.purchase_orders.length, basis: 'Σ received_qty × unit_price_usd, PO-line grain', status: CALC, limitation: 'Received quantity at PO unit price; not invoiced or paid value. Includes receipts from events dated after the as-of date (DEC-017).' });
}

export function overdueOpenPoValue(d, { asOfDate }) {
  const open = d.purchase_orders.filter(isOpenLine);
  const overdue = open.filter((r) => isOverdueLine(r, asOfDate));
  const notYetDue = open.filter((r) => !isOverdueLine(r, asOfDate));
  const value = sum(overdue, openValue);
  const openTotal = sum(open, openValue);
  return kpi({
    kpiId: '6.8',
    label: 'Overdue open PO value',
    value,
    unit: 'USD',
    numerator: value,
    denominator: openTotal,
    n: overdue.length,
    basis: `Open quantity × unit price where the recorded promised date is before ${asOfDate}`,
    asOfDate,
    status: LIMITED,
    limitation: 'Measured against the currently recorded promised date; original promises and revisions are not available. Not an invoice liability.',
    sharePct: pct(value, openTotal),
    notYetDueValue: sum(notYetDue, openValue),
    notYetDueLines: notYetDue.length,
  });
}

/** KPI 4.4.1 – overdue open PO lines and value by ageing bucket. */
export function overdueAgeing(d, { asOfDate }) {
  const items = AGEING_BUCKETS.map((b) => ({ bucket: b.id, label: b.label, minDays: b.min, maxDays: b.max, lines: 0, value: 0, poLines: [] }));
  let oldest = null;
  for (const r of d.purchase_orders) {
    if (!isOverdueLine(r, asOfDate)) continue;
    const days = daysPastPromised(r, asOfDate);
    const b = ageingBucket(days);
    const it = items.find((x) => x.bucket === b.id);
    it.lines++;
    it.value += openValue(r);
    it.poLines.push(r.po_line_id);
    oldest = oldest === null ? days : Math.max(oldest, days);
  }
  return kpi({
    kpiId: '4.4.1',
    label: 'Overdue open PO line ageing',
    value: null,
    n: items.reduce((t, i) => t + i.lines, 0),
    basis: `Days past recorded promised date at ${asOfDate}; buckets 1–30, 31–90, 91–180, over 180 (inclusive)`,
    asOfDate,
    status: LIMITED,
    limitation: 'Ageing is measured from the currently recorded promised date. Lines not yet due are excluded.',
    oldestDays: oldest,
    items,
  });
}

/** KPI 6.9 – PO value bridge with reconciliation checks. */
export function poValueBridge(d, { asOfDate }) {
  const gross = sum(d.purchase_orders, (r) => r.line_total_usd);
  const cancelled = sum(d.purchase_orders, (r) => r.cancelled_qty * r.unit_price_usd);
  const netActive = sum(d.purchase_orders, netActiveLineValue);
  const received = sum(d.purchase_orders, (r) => r.received_qty * r.unit_price_usd);
  const open = sum(d.purchase_orders.filter(isOpenLine), openValue);
  const overdue = sum(d.purchase_orders.filter((r) => isOverdueLine(r, asOfDate)), openValue);
  const notYetDue = sum(d.purchase_orders.filter((r) => isOpenLine(r) && !isOverdueLine(r, asOfDate)), openValue);
  const checks = [
    { id: 'gross-cancelled-net', label: 'Gross − cancelled = net active', difference: gross - cancelled - netActive },
    { id: 'net-received-open', label: 'Net active = received + open', difference: netActive - (received + open) },
    { id: 'open-overdue-notdue', label: 'Open = overdue open + not yet due', difference: open - (overdue + notYetDue) },
  ].map((c) => ({ ...c, reconciles: Math.abs(c.difference) < 0.005 }));
  return kpi({
    kpiId: '6.9',
    label: 'PO value bridge',
    value: null,
    unit: 'USD',
    n: d.purchase_orders.length,
    asOfDate,
    status: CALC,
    limitation: 'PO line values, not invoiced or paid spend.',
    gross,
    cancelled,
    netActive,
    received,
    open,
    overdue,
    notYetDue,
    checks,
    reconciles: checks.every((c) => c.reconciles),
  });
}

/** KPI 4.7 – promise-to-request gap (promised − requested), current promise dates only. */
export function promiseToRequestGap(d) {
  const lines = d.purchase_orders.filter((r) => r.promised_delivery_date !== null && r.requested_delivery_date !== null);
  const gaps = lines.map((r) => daysBetweenDates(r.requested_delivery_date, r.promised_delivery_date));
  const dist = {};
  for (const g of gaps) dist[g] = (dist[g] || 0) + 1;
  return kpi({
    kpiId: '4.7',
    label: 'Promise-to-request gap',
    value: avg(gaps),
    unit: 'days',
    n: gaps.length,
    basis: 'Current promised date − requested date, all PO lines with both dates',
    status: LIMITED,
    limitation: 'Uses the currently recorded promised date. Original promises and promise revisions are not held in the data.',
    later: gaps.filter((g) => g > 0).length,
    same: gaps.filter((g) => g === 0).length,
    earlier: gaps.filter((g) => g < 0).length,
    excluded: d.purchase_orders.length - lines.length,
    min: gaps.length ? Math.min(...gaps) : null,
    max: gaps.length ? Math.max(...gaps) : null,
    distribution: Object.entries(dist).map(([k, v]) => ({ days: Number(k), lines: v })).sort((a, b) => a.days - b.days),
  });
}

/**
 * Supplier commitment rows (KPI 6.3 gross and 6.4 net active side by side, DEC-032), with open,
 * overdue, received value and promise gap per supplier. Default order: net active value, descending.
 */
export function supplierCommitmentRows(d, { asOfDate }) {
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  const blank = (s) => ({ supplier_id: s.supplier_id, supplier_name: s.supplier_name ?? null, criticality: s.criticality ?? null, country: s.country ?? null, supplier_tier: s.supplier_tier ?? null, poLines: 0, grossValue: 0, cancelledValue: 0, netActiveValue: 0, receivedValue: 0, openValue: 0, openLines: 0, overdueLines: 0, overdueValue: 0, oldestOverdueDays: null, gapSum: 0, gapN: 0, gapLater: 0 });
  const rows = new Map(d.suppliers.map((s) => [s.supplier_id, blank(s)]));
  for (const r of d.purchase_orders) {
    if (!rows.has(r.supplier_id)) rows.set(r.supplier_id, blank({ supplier_id: r.supplier_id }));
    const e = rows.get(r.supplier_id);
    e.poLines++;
    e.grossValue += r.line_total_usd;
    e.cancelledValue += r.cancelled_qty * r.unit_price_usd;
    e.netActiveValue += netActiveLineValue(r);
    e.receivedValue += r.received_qty * r.unit_price_usd;
    if (isOpenLine(r)) {
      e.openLines++;
      e.openValue += openValue(r);
      if (isOverdueLine(r, asOfDate)) {
        const days = daysPastPromised(r, asOfDate);
        e.overdueLines++;
        e.overdueValue += openValue(r);
        e.oldestOverdueDays = e.oldestOverdueDays === null ? days : Math.max(e.oldestOverdueDays, days);
      }
    }
    if (r.promised_delivery_date !== null && r.requested_delivery_date !== null) {
      const g = daysBetweenDates(r.requested_delivery_date, r.promised_delivery_date);
      e.gapSum += g;
      e.gapN++;
      if (g > 0) e.gapLater++;
    }
  }
  const items = [...rows.values()]
    .map(({ gapSum, gapN, ...e }) => ({ ...e, sharePct: pct(e.netActiveValue, totalNet), avgPromiseGapDays: gapN ? gapSum / gapN : null, gapLines: gapN }))
    .sort((a, b) => b.netActiveValue - a.netActiveValue || a.supplier_id.localeCompare(b.supplier_id));
  let cum = 0;
  for (const it of items) {
    cum += it.sharePct ?? 0;
    it.cumulativeSharePct = it.sharePct === null ? null : cum;
  }
  const for80 = items.findIndex((i) => i.cumulativeSharePct !== null && i.cumulativeSharePct >= 80 - 1e-9);
  return kpi({
    kpiId: '6.3',
    label: 'Supplier PO commitment (gross and net active)',
    value: null,
    unit: 'USD',
    denominator: totalNet,
    n: items.length,
    basis: 'Gross (KPI 6.3) and net active (KPI 6.1.2) per supplier; share and cumulative share on net active (KPI 6.4)',
    asOfDate,
    status: CALC,
    limitation: 'PO line values, not invoiced or paid spend.',
    suppliersFor80Pct: for80 >= 0 ? for80 + 1 : null,
    items,
  });
}

/** Net active, open and overdue open value grouped by a supplier or material attribute. */
export function procurementSegments(d, { asOfDate, by }) {
  const sup = new Map(d.suppliers.map((s) => [s.supplier_id, s]));
  const mat = new Map(d.materials.map((m) => [m.material_id, m]));
  const keyFns = {
    material_category: (r) => mat.get(r.material_id)?.material_category,
    country: (r) => sup.get(r.supplier_id)?.country,
    supplier_tier: (r) => sup.get(r.supplier_id)?.supplier_tier,
    criticality: (r) => sup.get(r.supplier_id)?.criticality,
  };
  const keyFn = keyFns[by];
  if (!keyFn) throw new Error(`Unknown grouping "${by}"`);
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  const totalOverdue = sum(d.purchase_orders.filter((r) => isOverdueLine(r, asOfDate)), openValue);
  const g = new Map();
  for (const r of d.purchase_orders) {
    const k = keyFn(r) ?? 'Unknown';
    if (!g.has(k)) g.set(k, { segment: k, poLines: 0, suppliers: new Set(), netActiveValue: 0, openValue: 0, overdueValue: 0, overdueLines: 0 });
    const e = g.get(k);
    e.poLines++;
    e.suppliers.add(r.supplier_id);
    e.netActiveValue += netActiveLineValue(r);
    if (isOpenLine(r)) {
      e.openValue += openValue(r);
      if (isOverdueLine(r, asOfDate)) {
        e.overdueValue += openValue(r);
        e.overdueLines++;
      }
    }
  }
  const items = [...g.values()]
    .map((e) => ({ ...e, suppliers: e.suppliers.size, sharePct: pct(e.netActiveValue, totalNet), overdueSharePct: pct(e.overdueValue, totalOverdue) }))
    .sort((a, b) => b.netActiveValue - a.netActiveValue || String(a.segment).localeCompare(String(b.segment)));
  return kpi({ kpiId: '6.1.2', label: `Commitment by ${by.replace(/_/g, ' ')}`, value: null, unit: 'USD', n: items.length, basis: `Net active, open and overdue open PO value grouped by ${by.replace(/_/g, ' ')} (PO-line grain)`, asOfDate, status: CALC, items });
}

/** Expediting register: all open PO lines, most overdue first. */
export function openPoRegister(d, { asOfDate }) {
  const sup = new Map(d.suppliers.map((s) => [s.supplier_id, s]));
  const mat = new Map(d.materials.map((m) => [m.material_id, m]));
  const items = d.purchase_orders
    .filter(isOpenLine)
    .map((r) => {
      const days = daysPastPromised(r, asOfDate);
      const overdue = isOverdueLine(r, asOfDate);
      const b = overdue ? ageingBucket(days) : null;
      return {
        po_line_id: r.po_line_id,
        po_id: r.po_id,
        supplier_id: r.supplier_id,
        supplier_name: sup.get(r.supplier_id)?.supplier_name ?? null,
        criticality: sup.get(r.supplier_id)?.criticality ?? null,
        material_id: r.material_id,
        material_description: mat.get(r.material_id)?.material_description ?? null,
        material_category: mat.get(r.material_id)?.material_category ?? null,
        order_date: r.order_date,
        requested_delivery_date: r.requested_delivery_date,
        promised_delivery_date: r.promised_delivery_date,
        daysPastPromised: days,
        overdue,
        bucket: b ? b.id : 'not-due',
        bucketLabel: b ? b.label : 'Not yet due',
        promiseGapDays: r.requested_delivery_date && r.promised_delivery_date ? daysBetweenDates(r.requested_delivery_date, r.promised_delivery_date) : null,
        ordered_qty: r.ordered_qty,
        received_qty: r.received_qty,
        cancelled_qty: r.cancelled_qty,
        open_qty: r.open_qty,
        unit_of_measure: r.unit_of_measure,
        unit_price_usd: r.unit_price_usd,
        openValue: openValue(r),
        po_status: r.po_status,
        noReceipt: r.received_qty === 0,
      };
    })
    .sort((a, b) => (b.daysPastPromised ?? -Infinity) - (a.daysPastPromised ?? -Infinity) || a.po_line_id.localeCompare(b.po_line_id));
  return kpi({ kpiId: '4.4', label: 'Open PO line register', value: null, n: items.length, basis: `PO lines with open quantity at ${asOfDate}, most overdue first`, asOfDate, status: LIMITED, limitation: 'Days past promised use the currently recorded promised date.', overdueNoReceipt: items.filter((i) => i.overdue && i.noReceipt).length, items });
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
 * Sample-size label for a supplier-level rate (display rule DEC-025, not a KPI formula).
 *   'none'       – no qualifying records; the rate is blank
 *   'limited'    – fewer than minSample records; the rate is shown but flagged
 *   'sufficient' – minSample records or more
 */
export const DEFAULT_MIN_SAMPLE = 3;
export function sampleSufficiency(n, minSample = DEFAULT_MIN_SAMPLE) {
  if (!n) return 'none';
  return n < minSample ? 'limited' : 'sufficient';
}

/**
 * KPI 8.4 – Supplier delivery and quality profile.
 * Each source is aggregated separately per supplier, then combined (no row-level joins).
 * Indicators are shown individually; no composite risk score is produced (KPI 8.5).
 */
export function supplierProfiles(d, { asOfDate, minSample = DEFAULT_MIN_SAMPLE }) {
  const blank = () => ({
    delFull: 0, onTimeFull: 0, lateFull: 0, varSumFull: 0, varNFull: 0,
    delSnap: 0, onTimeSnap: 0, lateSnap: 0, varSumSnap: 0, varNSnap: 0, inTransit: 0,
    inspected: 0, rejected: 0, inspections: 0, nonconformances: 0, openCorrectiveActions: 0,
    caRequired: 0, caStatus: {}, poLines: 0, openPoLines: 0, overduePoLines: 0, netActiveValue: 0,
  });
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
      if (r.on_time_flag === 0) a.lateSnap++;
      if (r.delivery_variance_days !== null) {
        a.varSumSnap += r.delivery_variance_days;
        a.varNSnap++;
      }
    }
  }
  for (const r of d.delivery_transactions) if (r.delivery_status === 'In Transit') get(r.supplier_id).inTransit++;

  // PO lines (one pass over purchase_orders; values aggregated before any join)
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  for (const r of d.purchase_orders) {
    const a = get(r.supplier_id);
    a.poLines++;
    a.netActiveValue += netActiveLineValue(r);
    if (r.open_qty > 0) {
      a.openPoLines++;
      if (r.promised_delivery_date !== null && r.promised_delivery_date < asOfDate) a.overduePoLines++;
    }
  }

  // Inspection records (one pass over supplier_quality)
  for (const r of d.supplier_quality) {
    const a = get(r.supplier_id);
    if (r.quality_result === 'Nonconformance') a.nonconformances++;
    if (isOpenCorrectiveAction(r)) a.openCorrectiveActions++;
    if (r.corrective_action_required === 'Yes') {
      a.caRequired++;
      a.caStatus[r.corrective_action_status] = (a.caStatus[r.corrective_action_status] || 0) + 1;
    }
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
      lateEventsSnapshot: a.lateSnap,
      avgVarianceDaysSnapshot: a.varNSnap ? a.varSumSnap / a.varNSnap : null,
      inTransitEvents: a.inTransit,
      correctiveActionsRequired: a.caRequired,
      correctiveActionStatus: a.caStatus,
      poLines: a.poLines,
      openPoLines: a.openPoLines,
      overdueOpenPoLines: a.overduePoLines,
      netActiveValue: a.netActiveValue,
      netActiveSharePct: pct(a.netActiveValue, totalNet),
      deliverySampleSnapshot: sampleSufficiency(a.delSnap, minSample),
      deliverySampleFull: sampleSufficiency(a.delFull, minSample),
      inspectionSample: sampleSufficiency(a.inspections, minSample),
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
    minSample,
    items,
  });
}

/**
 * Returns the data with every transactional dataset limited to one supplier.
 * Master data is kept whole. Used to apply the standard KPI functions to a single supplier,
 * so supplier-level figures use exactly the same formulas as portfolio figures.
 */
export function scopeToSupplier(d, supplierId) {
  const only = (rows) => rows.filter((r) => r.supplier_id === supplierId);
  return {
    ...d,
    purchase_orders: only(d.purchase_orders),
    delivery_transactions: only(d.delivery_transactions),
    supplier_quality: only(d.supplier_quality),
    inventory_snapshot: only(d.inventory_snapshot),
  };
}

/**
 * Detailed view of one supplier: standard KPI functions applied to the supplier's own records,
 * plus the underlying event and inspection records for inspection by the user.
 */
export function supplierDetail(d, supplierId, { asOfDate }) {
  const master = d.suppliers.find((s) => s.supplier_id === supplierId) || null;
  if (!master) return null;
  const sd = scopeToSupplier(d, supplierId);
  const opts = { asOfDate };
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  const netActive = netActivePoLineValue(sd);
  const materials = new Map(d.materials.map((m) => [m.material_id, m.material_description]));
  return {
    supplier: master,
    delivery: {
      otdSnapshot: deliveryEventOtd(sd, { ...opts, basis: 'snapshot' }),
      otdFull: deliveryEventOtd(sd, { ...opts, basis: 'full' }),
      lateSnapshot: lateDeliveryEventCount(sd, { ...opts, basis: 'snapshot' }),
      lateFull: lateDeliveryEventCount(sd, { ...opts, basis: 'full' }),
      varianceSnapshot: averageDeliveryVariance(sd, { ...opts, basis: 'snapshot' }),
      varianceFull: averageDeliveryVariance(sd, { ...opts, basis: 'full' }),
      overdueOpenPoLines: overdueOpenPoLines(sd, opts),
    },
    quality: {
      rejectionRate: inspectionRejectionRate(sd),
      nonconformances: nonconformanceInspectionCount(sd),
      openCorrectiveActions: openCorrectiveActionCount(sd),
    },
    procurement: {
      netActive,
      gross: grossPoLineValue(sd),
      openCommitment: openPoCommitmentValue(sd),
      sharePct: pct(netActive.value, totalNet),
    },
    events: sd.delivery_transactions
      .map((r) => ({
        delivery_id: r.delivery_id,
        po_line_id: r.po_line_id,
        material_id: r.material_id,
        material_description: materials.get(r.material_id) ?? null,
        delivery_status: r.delivery_status,
        shipment_date: r.shipment_date,
        promised_delivery_date: r.promised_delivery_date,
        actual_delivery_date: r.actual_delivery_date,
        delivery_variance_days: r.delivery_variance_days,
        on_time_flag: r.on_time_flag,
        received_qty: r.received_qty,
        rejected_qty: r.rejected_qty,
        unit_of_measure: r.unit_of_measure,
        inSnapshotPeriod: r.delivery_status === 'Delivered' ? r.actual_delivery_date !== null && r.actual_delivery_date <= asOfDate : r.shipment_date <= asOfDate,
      }))
      .sort((a, b) => (a.actual_delivery_date ?? a.shipment_date).localeCompare(b.actual_delivery_date ?? b.shipment_date)),
    inspections: sd.supplier_quality
      .map((r) => ({
        inspection_id: r.inspection_id,
        delivery_id: r.delivery_id,
        inspection_date: r.inspection_date,
        inspection_type: r.inspection_type,
        inspected_qty: r.inspected_qty,
        rejected_qty: r.rejected_qty,
        quality_result: r.quality_result,
        defect_category: r.defect_category,
        severity: r.severity,
        ncr_id: r.ncr_id,
        corrective_action_required: r.corrective_action_required,
        corrective_action_status: r.corrective_action_status,
        root_cause_category: r.root_cause_category,
        corrective_action_closure_days: r.corrective_action_closure_days,
      }))
      .sort((a, b) => a.inspection_date.localeCompare(b.inspection_date)),
  };
}

/**
 * Pooled delivery and quality results by a supplier-master attribute (default: criticality).
 * Rates are pooled (Σ numerators ÷ Σ denominators), never averages of supplier rates.
 * Supplier attributes come from suppliers.csv only.
 */
export function supplierSegments(d, { asOfDate, field = 'criticality', order = ['Critical', 'High', 'Medium', 'Low'] }) {
  const attr = new Map(d.suppliers.map((s) => [s.supplier_id, s[field]]));
  const seg = new Map();
  const get = (k) => {
    if (!seg.has(k)) seg.set(k, { segment: k, suppliers: 0, suppliersWithSnapshotEvents: new Set(), snapOn: 0, snapN: 0, fullOn: 0, fullN: 0, inspections: 0, inspected: 0, rejected: 0, nonconformances: 0, openCorrectiveActions: 0, netActiveValue: 0 });
    return seg.get(k);
  };
  for (const s of d.suppliers) get(s[field]).suppliers++;
  for (const r of deliveredEvents(d.delivery_transactions)) {
    const g = get(attr.get(r.supplier_id) ?? 'Unknown');
    g.fullN++;
    if (r.on_time_flag === 1) g.fullOn++;
    if (r.actual_delivery_date !== null && r.actual_delivery_date <= asOfDate) {
      g.snapN++;
      if (r.on_time_flag === 1) g.snapOn++;
      g.suppliersWithSnapshotEvents.add(r.supplier_id);
    }
  }
  for (const r of d.supplier_quality) {
    const g = get(attr.get(r.supplier_id) ?? 'Unknown');
    if (r.quality_result === 'Nonconformance') g.nonconformances++;
    if (isOpenCorrectiveAction(r)) g.openCorrectiveActions++;
    if (typeof r.inspected_qty === 'number' && r.inspected_qty > 0) {
      g.inspections++;
      g.inspected += r.inspected_qty;
      g.rejected += r.rejected_qty;
    }
  }
  const totalNet = sum(d.purchase_orders, netActiveLineValue);
  for (const r of d.purchase_orders) get(attr.get(r.supplier_id) ?? 'Unknown').netActiveValue += netActiveLineValue(r);

  const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length);
  const items = [...seg.values()]
    .sort((a, b) => rank(a.segment) - rank(b.segment) || String(a.segment).localeCompare(String(b.segment)))
    .map((g) => ({
      segment: g.segment,
      suppliers: g.suppliers,
      suppliersWithSnapshotEvents: g.suppliersWithSnapshotEvents.size,
      deliveredEventsSnapshot: g.snapN,
      otdSnapshotPct: pct(g.snapOn, g.snapN),
      deliveredEventsFull: g.fullN,
      otdFullPct: pct(g.fullOn, g.fullN),
      inspections: g.inspections,
      inspectedQty: g.inspected,
      rejectedQty: g.rejected,
      rejectionRatePct: pct(g.rejected, g.inspected),
      nonconformances: g.nonconformances,
      openCorrectiveActions: g.openCorrectiveActions,
      netActiveValue: g.netActiveValue,
      netActiveSharePct: pct(g.netActiveValue, totalNet),
    }));
  return kpi({
    kpiId: '8.4',
    label: `Delivery and quality by supplier ${field.replace(/_/g, ' ')}`,
    value: null,
    n: d.suppliers.length,
    basis: `Pooled by ${field} from suppliers.csv; rates are Σ numerator ÷ Σ denominator`,
    asOfDate,
    status: LIMITED,
    limitation: 'Pooled segment results. Small segments rest on few events; check the event counts.',
    items,
  });
}

/** All corrective-action records (KPI 5.4 / 5.5 source records), oldest inspection first. */
export function correctiveActionRegister(d) {
  const names = new Map(d.suppliers.map((s) => [s.supplier_id, s.supplier_name]));
  return d.supplier_quality
    .filter((r) => r.corrective_action_required === 'Yes')
    .map((r) => ({
      inspection_id: r.inspection_id,
      supplier_id: r.supplier_id,
      supplier_name: names.get(r.supplier_id) ?? null,
      inspection_date: r.inspection_date,
      ncr_id: r.ncr_id,
      defect_category: r.defect_category,
      severity: r.severity,
      root_cause_category: r.root_cause_category,
      corrective_action_status: r.corrective_action_status,
      corrective_action_closure_days: r.corrective_action_closure_days,
      isOpen: isOpenCorrectiveAction(r),
    }))
    .sort((a, b) => a.inspection_date.localeCompare(b.inspection_date));
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
export function computeAllKpis(d, { asOfDate, minSample = DEFAULT_MIN_SAMPLE }) {
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
      received: receivedPoLineValue(d),
      overdueOpen: overdueOpenPoValue(d, opts),
      ageing: overdueAgeing(d, opts),
      bridge: poValueBridge(d, opts),
      promiseGap: promiseToRequestGap(d),
      supplierRows: supplierCommitmentRows(d, opts),
      byCategory: procurementSegments(d, { ...opts, by: 'material_category' }),
      byCountry: procurementSegments(d, { ...opts, by: 'country' }),
      byTier: procurementSegments(d, { ...opts, by: 'supplier_tier' }),
      byCriticality: procurementSegments(d, { ...opts, by: 'criticality' }),
      register: openPoRegister(d, opts),
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
      profiles: supplierProfiles(d, { ...opts, minSample }),
      byCriticality: supplierSegments(d, opts),
      correctiveActions: correctiveActionRegister(d),
    },
    notSupported: NOT_SUPPORTED_KPIS,
  };
}
