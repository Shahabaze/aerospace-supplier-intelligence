/**
 * KPI engine tests – checks src/js/kpis.js against KPI Dictionary v2.2.
 *
 * Expected values come from tests/kpi-expected-values.js (independent calculation).
 * Rule tests change an in-memory copy of the data to prove each governance rule is enforced.
 * The source CSV files are never changed.
 */

import { test, assert, assertEqual, assertClose, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { SCHEMA, DATASET_NAMES } from '../src/js/schema.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import * as K from '../src/js/kpis.js';
import { EXPECTED as E, EXPECTED_SUPPLIERS as ES, EXPECTED_PROCUREMENT as EP } from './kpi-expected-values.js';

const Papa = window.Papa;
const DATA_PATH = '../data/';
const AS_OF = CONFIG.reportingAsOfDate;
const CENT = 0.005;
const FINE = 1e-9;

let d; // typed rows
let all; // computeAllKpis result
const hashesBefore = {};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const fetchText = async (url) => (await fetch(url, { cache: 'no-store' })).text();

/** In-memory copy of the data with selected rows changed or added. */
function withChanges(base, name, { where, set, add }) {
  let rows = base[name];
  if (where) rows = rows.map((r) => (where(r) ? { ...r, ...set } : r));
  if (add) rows = [...rows, ...add];
  return { ...base, [name]: rows };
}

const profile = (k, id) => k.suppliers.profiles.items.find((p) => p.supplier_id === id);
const conc = (k, id) => k.procurement.concentration.items.find((p) => p.supplier_id === id);

/* ======================================================================
 * Setup
 * ==================================================================== */

test('Setup', 'Data loads and all validation checks pass before KPIs are calculated', async () => {
  for (const n of DATASET_NAMES) hashesBefore[n] = await sha256(await fetchText(`${DATA_PATH}${SCHEMA[n].file}`));
  const lr = await loadAllDatasets({ basePath: DATA_PATH, Papa });
  assertEqual(lr.loadErrors, []);
  const v = runValidation(lr, { asOfDate: AS_OF });
  assert(v.summary.allPassed, `validation failures: ${v.summary.failed.join(', ')}`);
  d = rowsOf(lr);
  all = K.computeAllKpis(d, { asOfDate: AS_OF });
});

/* ======================================================================
 * 4. Delivery performance
 * ==================================================================== */

test('Delivery', '4.1 Snapshot-period Delivery Event OTD = 39.68% (25/63)', async () => {
  const k = all.delivery.otdSnapshot;
  assertEqual([k.numerator, k.denominator], [E['4.1_snap'].num, E['4.1_snap'].den]);
  assertClose(k.value, (25 / 63) * 100, FINE);
  assertEqual(k.value.toFixed(2), '39.68');
});

test('Delivery', '4.1 Full-dataset Delivery Event OTD = 38.36% (28/73)', async () => {
  const k = all.delivery.otdFull;
  assertEqual([k.numerator, k.denominator], [E['4.1_full'].num, E['4.1_full'].den]);
  assertEqual(k.value.toFixed(2), '38.36');
});

test('Delivery', '4.1 labels state the basis and never call it OTIF or PO-line OTD', async () => {
  for (const k of [all.delivery.otdSnapshot, all.delivery.otdFull]) {
    assert(k.label.startsWith('Delivery Event OTD'), k.label);
    assert(!/OTIF|PO-line OTD/i.test(k.label), k.label);
    assert(k.basis && k.limitation.includes('not OTIF'), 'basis/limitation missing');
  }
  assert(all.delivery.otdSnapshot.basis.includes(AS_OF), 'snapshot basis must show the as-of date');
});

test('Delivery', '4.2 Late delivery events: 38 (snapshot) / 45 (full)', async () => {
  assertEqual(all.delivery.lateSnapshot.value, E['4.2_snap']);
  assertEqual(all.delivery.lateFull.value, E['4.2_full']);
});

test('Delivery', '4.3 Average delivery variance: 2.83 (snapshot) / 2.92 (full) days', async () => {
  assertClose(all.delivery.varianceSnapshot.value, E['4.3_snap'], FINE);
  assertClose(all.delivery.varianceFull.value, E['4.3_full'], FINE);
});

test('Delivery', '4.4 Overdue open PO lines = 51 of 63 open lines', async () => {
  const k = all.delivery.overdueOpenPoLines;
  assertEqual([k.value, k.denominator], [E['4.4'].overdue, E['4.4'].open_lines]);
});

/* ======================================================================
 * 5. Quality
 * ==================================================================== */

test('Quality', '5.1 Inspection rejection rate = 5 / 2,997 = 0.1668%', async () => {
  const k = all.quality.rejectionRate;
  assertEqual([k.numerator, k.denominator], [E['5.1'].rej, E['5.1'].insp]);
  assertClose(k.value, (5 / 2997) * 100, FINE);
});

test('Quality', '5.2 Total rejected quantity = 5', async () => assertEqual(all.quality.totalRejected.value, 5));
test('Quality', '5.3 Nonconformance inspections = 4', async () => assertEqual(all.quality.nonconformances.value, E['5.3']));
test('Quality', '5.4 Open corrective actions = 3', async () => assertEqual(all.quality.openCorrectiveActions.value, E['5.4']));

test('Quality', '5.5 Average closure = 41 days with n = 1 shown', async () => {
  const k = all.quality.avgClosure;
  assertEqual([k.value, k.n], [E['5.5'].avg, E['5.5'].n]);
  assert(k.limitation.includes('1 record'), k.limitation);
});

test('Quality', '5.7 DPM = 1,668.3', async () => assertClose(all.quality.dpm.value, (5 / 2997) * 1e6, FINE));

/* ======================================================================
 * 6. Procurement
 * ==================================================================== */

test('Procurement', '6.1 Gross PO line value = $12,550,378.20', async () => assertClose(all.procurement.gross.value, E['6.1'], CENT));
test('Procurement', '6.1.1 Cancelled PO line value = $1,072,369.00 (17 lines)', async () => {
  assertClose(all.procurement.cancelled.value, E['6.1.1'], CENT);
  assertEqual(all.procurement.cancelled.n, 17);
});
test('Procurement', '6.1.2 Net active PO line value = $11,478,009.20', async () => assertClose(all.procurement.netActive.value, E['6.1.2'], CENT));
test('Procurement', '6.1.2 equals 6.1 − 6.1.1', async () => assertClose(all.procurement.netActive.value, all.procurement.gross.value - all.procurement.cancelled.value, CENT));
test('Procurement', '6.2 Open PO commitment value = $8,856,485.91', async () => assertClose(all.procurement.openCommitment.value, E['6.2'], CENT));
test('Procurement', '6.5 Average PO line value = $125,503.78', async () => assertClose(all.procurement.averageLine.value, E['6.5'], CENT));

test('Procurement', '6.3 Gross commitment per supplier matches for all 25 suppliers', async () => {
  const items = all.procurement.supplierCommitment.items;
  assertEqual(items.length, 25);
  for (const it of items) assertClose(it.grossValue, E['6.3_gross'][it.supplier_id], CENT, it.supplier_id);
});

test('Procurement', '6.4 (v2.2) Concentration uses net active value for all 25 suppliers', async () => {
  for (const it of all.procurement.concentration.items) assertClose(it.concentrationPct, E['6.4'][it.supplier_id], 1e-9, it.supplier_id);
});

test('Procurement', '6.4 Denominator equals total net active PO line value, not gross', async () => {
  assertClose(all.procurement.concentration.denominator, E['6.1.2'], CENT);
});

test('Procurement', '6.4 Top three: SUP-007 27.75%, SUP-008 24.42%, SUP-002 14.49%', async () => {
  const top = all.procurement.concentration.items.slice(0, 3).map((i) => [i.supplier_id, i.concentrationPct.toFixed(2)]);
  assertEqual(top, [['SUP-007', '27.75'], ['SUP-008', '24.42'], ['SUP-002', '14.49']]);
});

test('Procurement', '6.4 Supplier percentages sum to 100%', async () => {
  const total = all.procurement.concentration.items.reduce((s, i) => s + i.concentrationPct, 0);
  assertClose(total, 100, 1e-9);
});

test('Procurement', '6.4 Cancelled value is excluded from numerator (SUP-004: net $377,270 vs gross $690,370)', async () => {
  const c = conc(all, 'SUP-004');
  assertClose(c.netActiveValue, 377270, CENT);
  assertClose(c.concentrationPct, (377270 / E['6.1.2']) * 100, 1e-9);
});

test('Procurement', 'No supported KPI is labelled as spend or invoiced value', async () => {
  const labels = [...Object.values(all.procurement)].map((k) => k.label);
  for (const l of labels) assert(!/spend|invoice|paid/i.test(l), l);
});

/* ======================================================================
 * 7. Inventory
 * ==================================================================== */

test('Inventory', '7.1 On-hand inventory value (physical only) = $2,634,675.00, n = 23', async () => {
  assertClose(all.inventory.onHandValue.value, E['7.1'], CENT);
  assertEqual(all.inventory.onHandValue.n, 23);
  assertEqual(all.inventory.onHandValue.asOfDate, '2026-10-31');
});
test('Inventory', '7.2 Available inventory value = $2,198,357.00', async () => assertClose(all.inventory.availableValue.value, E['7.2'], CENT));
test('Inventory', '7.3 Below reorder point (available basis) = 10 materials', async () => assertEqual([...all.inventory.belowReorderPoint.items].sort(), E['7.3']));
test('Inventory', '7.4 Safety stock breaches (available basis) = 5 materials', async () => assertEqual([...all.inventory.safetyStockBreaches.items].sort(), E['7.4']));
test('Inventory', '7.5 Average days of supply = 48.75 days, n = 23', async () => {
  assertClose(all.inventory.daysOfSupply.value, E['7.5'].avg, FINE);
  assertEqual(all.inventory.daysOfSupply.n, E['7.5'].n);
});
test('Inventory', '7.6 Excess inventory value = $1,417,810.00', async () => assertClose(all.inventory.excessValue.value, E['7.6'], CENT));
test('Inventory', '7.7 Supplied status distribution (on-hand basis) is labelled and correct', async () => {
  assertEqual(all.inventory.statusDistribution.value, E['7.7']);
  assert(all.inventory.statusDistribution.label.includes('on-hand basis'), all.inventory.statusDistribution.label);
});

/* ======================================================================
 * 8. Supplier profile
 * ==================================================================== */

test('Suppliers', '8.1 Critical suppliers = 4', async () => assertEqual(all.suppliers.critical.value, E['8.1']));
test('Suppliers', '8.2 Qualification distribution', async () => assertEqual(all.suppliers.qualification.value, E['8.2']));
test('Suppliers', '8.3 Certification distribution', async () => assertEqual(all.suppliers.certification.value, E['8.3']));

test('Suppliers', '8.4 Profile figures match for all 25 suppliers', async () => {
  const items = all.suppliers.profiles.items;
  assertEqual(items.length, 25);
  for (const p of items) {
    const e = E['8.4'][p.supplier_id];
    const id = p.supplier_id;
    assertEqual([p.deliveredEventsFull, p.deliveredEventsSnapshot, p.lateEventsFull, p.nonconformances, p.openCorrectiveActions],
      [e.del_full, e.del_snap, e.late_full, e.nc, e.openca], id);
    assertEqual(p.otdFullPct === null ? null : +p.otdFullPct.toFixed(9), e.del_full ? +((e.ot_full / e.del_full) * 100).toFixed(9) : null, `${id} OTD full`);
    assertEqual(p.otdSnapshotPct === null ? null : +p.otdSnapshotPct.toFixed(9), e.del_snap ? +((e.ot_snap / e.del_snap) * 100).toFixed(9) : null, `${id} OTD snapshot`);
    assertEqual(p.avgVarianceDaysFull === null ? null : +p.avgVarianceDaysFull.toFixed(9), e.var_full === null ? null : +e.var_full.toFixed(9), `${id} variance`);
    assertEqual([p.inspectedQty, p.rejectedQty], [e.insp, e.rej], `${id} quantities`);
  }
});

test('Suppliers', '8.4 Suppliers with no delivered events show blank OTD, not 0% (SUP-004, SUP-009, SUP-012)', async () => {
  for (const id of E.no_delivered_suppliers) {
    const p = profile(all, id);
    assertEqual([p.otdFullPct, p.otdSnapshotPct, p.avgVarianceDaysFull, p.rejectionRatePct], [null, null, null, null], id);
  }
  assertEqual(E.no_delivered_suppliers, ['SUP-004', 'SUP-009', 'SUP-012']);
});

test('Suppliers', '8.4 SUP-018: 0% full-dataset OTD but blank snapshot OTD (no events in period)', async () => {
  const p = profile(all, 'SUP-018');
  assertEqual([p.otdFullPct, p.otdSnapshotPct, p.deliveredEventsSnapshot], [0, null, 0]);
});

test('Suppliers', '8.4 Supplier totals reconcile to overall KPIs', async () => {
  const items = all.suppliers.profiles.items;
  const s = (f) => items.reduce((t, p) => t + p[f], 0);
  assertEqual(s('deliveredEventsFull'), 73);
  assertEqual(s('deliveredEventsSnapshot'), 63);
  assertEqual(s('lateEventsFull'), 45);
  assertEqual([s('inspectedQty'), s('rejectedQty'), s('nonconformances'), s('openCorrectiveActions')], [2997, 5, 4, 3]);
});

test('Suppliers', 'No composite risk score is produced', async () => {
  const keys = Object.keys(all.suppliers.profiles.items[0]);
  assert(!keys.some((k) => /risk.?score|score/i.test(k)), keys.join(','));
});

/* ======================================================================
 * Stage 5 – supplier-level analysis
 * ==================================================================== */

const close = (a, b, tol = 1e-9) => (a === null || b === null ? a === b : Math.abs(a - b) <= tol);

test('Suppliers (Stage 5)', 'Profiles: snapshot late events, snapshot variance, in-transit, PO lines, open and overdue lines, net active value match for all 25', async () => {
  const bad = [];
  for (const p of all.suppliers.profiles.items) {
    const e = ES.per_supplier[p.supplier_id];
    if (p.lateEventsSnapshot !== e.late_snap) bad.push(`${p.supplier_id} late_snap`);
    if (!close(p.avgVarianceDaysSnapshot, e.var_snap)) bad.push(`${p.supplier_id} var_snap ${p.avgVarianceDaysSnapshot} vs ${e.var_snap}`);
    if (p.inTransitEvents !== e.in_transit) bad.push(`${p.supplier_id} in_transit`);
    if (p.poLines !== e.po_lines || p.openPoLines !== e.open_lines || p.overdueOpenPoLines !== e.overdue) bad.push(`${p.supplier_id} PO lines`);
    if (!close(p.netActiveValue, e.net_active, CENT)) bad.push(`${p.supplier_id} net active`);
    if (p.inspections !== e.inspections) bad.push(`${p.supplier_id} inspections`);
    if (p.correctiveActionsRequired !== e.ca_required || JSON.stringify(p.correctiveActionStatus) !== JSON.stringify(e.ca_status)) bad.push(`${p.supplier_id} CA`);
  }
  assertEqual(bad, []);
});

test('Suppliers (Stage 5)', 'Profile share of net active value equals KPI 6.4 concentration for every supplier', async () => {
  for (const p of all.suppliers.profiles.items) {
    assertClose(p.netActiveSharePct, conc(all, p.supplier_id).concentrationPct, 1e-9, p.supplier_id);
  }
});

test('Suppliers (Stage 5)', 'Profile overdue lines total equals KPI 4.4 (51)', async () => {
  assertEqual(all.suppliers.profiles.items.reduce((s, p) => s + p.overdueOpenPoLines, 0), 51);
});

test('Suppliers (Stage 5)', 'Sample labels (DEC-025, minimum 3): 4 no data, 11 limited, 10 sufficient on the snapshot basis', async () => {
  const by = (s) => all.suppliers.profiles.items.filter((p) => p.deliverySampleSnapshot === s).map((p) => p.supplier_id);
  assertEqual(by('none'), ['SUP-004', 'SUP-009', 'SUP-012', 'SUP-018']);
  assertEqual(by('limited'), ['SUP-001', 'SUP-002', 'SUP-007', 'SUP-008', 'SUP-011', 'SUP-015', 'SUP-016', 'SUP-020', 'SUP-021', 'SUP-022', 'SUP-024']);
  assertEqual(by('sufficient').length, 10);
  assertEqual([K.sampleSufficiency(0), K.sampleSufficiency(2), K.sampleSufficiency(3), K.sampleSufficiency(2, 2)], ['none', 'limited', 'sufficient', 'sufficient']);
});

test('Suppliers (Stage 5)', 'Sample threshold is configurable and changes labels only, not rates', async () => {
  const k5 = K.supplierProfiles(d, { asOfDate: AS_OF, minSample: 5 });
  const p3 = all.suppliers.profiles.items;
  assertEqual(k5.items.map((p) => p.otdSnapshotPct), p3.map((p) => p.otdSnapshotPct));
  assert(k5.items.filter((p) => p.deliverySampleSnapshot === 'limited').length > 11, 'more suppliers should be limited at 5');
});

test('Suppliers (Stage 5)', 'Criticality segments: pooled OTD, inspected units, rejections, nonconformances, open CAs and net active share', async () => {
  for (const g of all.suppliers.byCriticality.items) {
    const e = ES.segments[g.segment];
    assertEqual([g.suppliers, g.suppliersWithSnapshotEvents, g.deliveredEventsSnapshot, g.deliveredEventsFull, g.inspectedQty, g.rejectedQty, g.nonconformances, g.openCorrectiveActions],
      [e.suppliers, e.with_snap_events, e.snap_n, e.full_n, e.insp, e.rej, e.nc, e.open_ca], g.segment);
    assert(close(g.otdSnapshotPct, e.snap_n ? (e.snap_on / e.snap_n) * 100 : null), `${g.segment} snapshot OTD`);
    assert(close(g.otdFullPct, e.full_n ? (e.full_on / e.full_n) * 100 : null), `${g.segment} full OTD`);
    assertClose(g.netActiveSharePct, e.net_share, 1e-9, `${g.segment} share`);
  }
  assertEqual(all.suppliers.byCriticality.items.map((g) => g.segment), ['Critical', 'High', 'Medium', 'Low']);
});

test('Suppliers (Stage 5)', 'Segment OTD is pooled, not an average of supplier OTDs (High: 44.7%)', async () => {
  const high = all.suppliers.byCriticality.items.find((g) => g.segment === 'High');
  const rates = all.suppliers.profiles.items.filter((p) => p.criticality === 'High' && p.otdSnapshotPct !== null).map((p) => p.otdSnapshotPct);
  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  assertEqual(high.otdSnapshotPct.toFixed(1), '44.7');
  assert(Math.abs(mean - high.otdSnapshotPct) > 0.5, `mean of supplier rates ${mean} should differ from pooled`);
});

test('Suppliers (Stage 5)', 'Segment totals reconcile to portfolio KPIs', async () => {
  const s = (f) => all.suppliers.byCriticality.items.reduce((t, g) => t + g[f], 0);
  assertEqual([s('suppliers'), s('deliveredEventsSnapshot'), s('deliveredEventsFull'), s('inspectedQty'), s('rejectedQty'), s('nonconformances'), s('openCorrectiveActions')], [25, 63, 73, 2997, 5, 4, 3]);
  assertClose(s('netActiveSharePct'), 100, 1e-9);
});

test('Suppliers (Stage 5)', 'Segments use suppliers.csv criticality, not supplier_quality.supplier_criticality', async () => {
  const m = withChanges(d, 'supplier_quality', { where: () => true, set: { supplier_criticality: 'Low' } });
  const k = K.supplierSegments(m, { asOfDate: AS_OF });
  assertEqual(k.items.find((g) => g.segment === 'Low').inspectedQty, ES.segments.Low.insp);
});

test('Suppliers (Stage 5)', 'Corrective-action register lists the 4 required actions with status and closure days', async () => {
  const reg = all.suppliers.correctiveActions;
  assertEqual(reg.map((r) => [r.inspection_id, r.supplier_id, r.corrective_action_status, r.corrective_action_closure_days]),
    ES.ca_register.map((r) => [r.inspection_id, r.supplier_id, r.corrective_action_status, r.corrective_action_closure_days === '' ? null : Number(r.corrective_action_closure_days)]));
  assertEqual(reg.filter((r) => r.isOpen).length, 3);
});

test('Suppliers (Stage 5)', 'supplierDetail uses the standard KPI functions: matches the profile for every supplier', async () => {
  const bad = [];
  for (const p of all.suppliers.profiles.items) {
    const det = K.supplierDetail(d, p.supplier_id, { asOfDate: AS_OF });
    const pairs = [
      [det.delivery.otdSnapshot.value, p.otdSnapshotPct], [det.delivery.otdFull.value, p.otdFullPct],
      [det.delivery.lateSnapshot.value, p.lateEventsSnapshot], [det.delivery.lateFull.value, p.lateEventsFull],
      [det.delivery.varianceSnapshot.value, p.avgVarianceDaysSnapshot], [det.delivery.varianceFull.value, p.avgVarianceDaysFull],
      [det.delivery.overdueOpenPoLines.value, p.overdueOpenPoLines], [det.quality.rejectionRate.value, p.rejectionRatePct],
      [det.quality.nonconformances.value, p.nonconformances], [det.quality.openCorrectiveActions.value, p.openCorrectiveActions],
      [det.procurement.sharePct, p.netActiveSharePct],
    ];
    pairs.forEach(([a, b], i) => { if (!close(a, b, 1e-9)) bad.push(`${p.supplier_id} #${i}: ${a} vs ${b}`); });
    if (det.events.length !== p.deliveredEventsFull + p.inTransitEvents) bad.push(`${p.supplier_id} events list`);
    if (det.supplier.criticality !== p.criticality) bad.push(`${p.supplier_id} criticality`);
  }
  assertEqual(bad, []);
});

test('Suppliers (Stage 5)', 'scopeToSupplier keeps only that supplier\'s transactions and leaves the input unchanged', async () => {
  const before = d.delivery_transactions.length;
  const sd = K.scopeToSupplier(d, 'SUP-013');
  assert(sd.delivery_transactions.every((r) => r.supplier_id === 'SUP-013') && sd.purchase_orders.every((r) => r.supplier_id === 'SUP-013'));
  assertEqual(sd.suppliers.length, 25, 'master data kept');
  assertEqual(d.delivery_transactions.length, before);
});

test('Suppliers (Stage 5)', 'Unknown supplier returns null detail', async () => {
  assertEqual(K.supplierDetail(d, 'SUP-999', { asOfDate: AS_OF }), null);
});

/* ======================================================================
 * Stage 6 – procurement intelligence (KPI Dictionary v2.3)
 * ==================================================================== */

/** A synthetic PO line for rule tests (in memory only). */
function poLine(id, { ordered = 10, received = 0, cancelled = 0, price = 100, promised = '2026-10-01', requested = '2026-10-01', supplier = 'SUP-001', material = 'MAT-001' } = {}) {
  return { po_id: `PO-${id}`, po_line_id: id, supplier_id: supplier, material_id: material, order_date: '2026-01-01', requested_delivery_date: requested, promised_delivery_date: promised, ordered_qty: ordered, unit_of_measure: 'EA', unit_price_usd: price, line_total_usd: ordered * price, received_qty: received, cancelled_qty: cancelled, open_qty: ordered - received - cancelled, po_status: 'Open' };
}
const onlyLines = (lines) => ({ ...d, purchase_orders: lines, delivery_transactions: [], supplier_quality: [] });
const addDays = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

test('Procurement (Stage 6)', '6.7 Received PO line value = $2,621,523.29', async () => assertClose(all.procurement.received.value, EP.received, CENT));

test('Procurement (Stage 6)', '6.8 Overdue open PO value = $6,898,446.46 (51 lines); not yet due $1,958,039.45 (12 lines)', async () => {
  const k = all.procurement.overdueOpen;
  assertClose(k.value, EP.overdue, CENT);
  assertEqual([k.n, k.notYetDueLines], [EP.overdue_lines, EP.not_yet_due_lines]);
  assertClose(k.notYetDueValue, EP.not_yet_due, CENT);
  assertEqual(k.sharePct.toFixed(1), '77.9');
});

test('Procurement (Stage 6)', '6.9 Bridge: all three identities reconcile to the cent', async () => {
  const b = all.procurement.bridge;
  assertClose(b.gross - b.cancelled, b.netActive, CENT, 'gross − cancelled');
  assertClose(b.received + b.open, b.netActive, CENT, 'received + open');
  assertClose(b.overdue + b.notYetDue, b.open, CENT, 'overdue + not yet due');
  assert(b.reconciles && b.checks.length === 3, 'reconciliation flag');
  for (const [k, e] of [['gross', 'gross'], ['cancelled', 'cancelled'], ['netActive', 'net'], ['received', 'received'], ['open', 'open'], ['overdue', 'overdue'], ['notYetDue', 'not_yet_due']]) assertClose(b[k], EP[e], CENT, k);
});

test('Procurement (Stage 6)', '6.9 Bridge values equal the existing KPIs 6.1, 6.1.1, 6.1.2 and 6.2', async () => {
  const b = all.procurement.bridge;
  assertEqual([b.gross, b.cancelled, b.netActive, b.open], [all.procurement.gross.value, all.procurement.cancelled.value, all.procurement.netActive.value, all.procurement.openCommitment.value]);
});

test('Procurement (Stage 6)', '4.4.1 Ageing: 4 / 10 / 12 / 25 lines with matching values; totals equal KPI 4.4 and 6.8', async () => {
  const items = all.procurement.ageing.items;
  assertEqual(items.map((i) => i.bucket), ['1-30', '31-90', '91-180', '181+']);
  for (const i of items) {
    assertEqual(i.lines, EP.buckets[i.bucket].lines, i.bucket);
    assertClose(i.value, EP.buckets[i.bucket].value, CENT, i.bucket);
  }
  assertEqual(items.reduce((s, i) => s + i.lines, 0), all.delivery.overdueOpenPoLines.value);
  assertClose(items.reduce((s, i) => s + i.value, 0), all.procurement.overdueOpen.value, CENT);
  assertEqual(all.procurement.ageing.oldestDays, EP.max_days_overdue);
});

test('Procurement (Stage 6)', 'Ageing boundaries: 0 not overdue; 1 and 30 → 1–30; 31 and 90 → 31–90; 91 and 180 → 91–180; 181 → over 180', async () => {
  const cases = [[-5, null], [0, null], [1, '1-30'], [30, '1-30'], [31, '31-90'], [90, '31-90'], [91, '91-180'], [180, '91-180'], [181, '181+'], [400, '181+']];
  for (const [days, bucket] of cases) assertEqual(K.ageingBucket(days)?.id ?? null, bucket, `${days} days`);
  // Same boundaries through the full calculation, with PO lines promised N days before the as-of date.
  const lines = cases.map(([days], i) => poLine(`B-${i}`, { promised: addDays(AS_OF, -days) }));
  const k = K.overdueAgeing(onlyLines(lines), { asOfDate: AS_OF });
  assertEqual(k.items.map((i) => i.lines), [2, 2, 2, 2]);
  assertEqual(k.items.find((i) => i.bucket === '1-30').poLines.sort(), ['B-2', 'B-3']);
  assertEqual(k.items.find((i) => i.bucket === '181+').poLines.sort(), ['B-8', 'B-9']);
  const reg = K.openPoRegister(onlyLines(lines), { asOfDate: AS_OF }).items;
  assertEqual(reg.filter((r) => !r.overdue).map((r) => r.po_line_id).sort(), ['B-0', 'B-1'], 'promised on or after the as-of date is not yet due');
});

test('Procurement (Stage 6)', 'Ageing bucket definitions are contiguous, non-overlapping and match DEC-027 exactly', async () => {
  assertEqual(K.AGEING_BUCKETS.map((b) => [b.id, b.min, b.max]), [['1-30', 1, 30], ['31-90', 31, 90], ['91-180', 91, 180], ['181+', 181, null]]);
  K.AGEING_BUCKETS.forEach((b, i) => { if (i > 0) assertEqual(b.min, K.AGEING_BUCKETS[i - 1].max + 1, `${b.id} must start the day after the previous bucket ends`); });
});

test('Procurement (Stage 6)', 'As-of date: a line promised on the as-of date is not overdue; one day later it is 1 day overdue', async () => {
  const line = poLine('A-1', { promised: '2026-10-31' });
  assertEqual(K.overdueOpenPoValue(onlyLines([line]), { asOfDate: '2026-10-31' }).n, 0);
  const next = K.openPoRegister(onlyLines([line]), { asOfDate: '2026-11-01' }).items[0];
  assertEqual([next.overdue, next.daysPastPromised, next.bucket], [true, 1, '1-30']);
});

test('Procurement (Stage 6)', 'As-of date moved to 2025-10-31: nothing is overdue and all open value is not yet due', async () => {
  const k = K.overdueOpenPoValue(d, { asOfDate: '2025-10-31' });
  assertEqual(k.value, 0);
  assertClose(k.notYetDueValue, EP.open, CENT);
});

test('Procurement (Stage 6)', 'Cancellation cases: zero, partial and full cancellation reconcile and are treated correctly', async () => {
  const zero = poLine('C-0', { ordered: 10, received: 4, cancelled: 0 });
  const part = poLine('C-P', { ordered: 10, received: 4, cancelled: 3 });
  const full = poLine('C-F', { ordered: 10, received: 0, cancelled: 10 });
  const b = K.poValueBridge(onlyLines([zero, part, full]), { asOfDate: AS_OF });
  assertEqual([b.gross, b.cancelled, b.netActive, b.received, b.open, b.overdue], [3000, 1300, 1700, 800, 900, 900]);
  assert(b.reconciles, 'bridge does not reconcile');
  const rows = K.openPoRegister(onlyLines([zero, part, full]), { asOfDate: AS_OF }).items.map((r) => [r.po_line_id, r.open_qty, r.openValue]);
  assertEqual(rows.sort(), [['C-0', 6, 600], ['C-P', 3, 300]], 'fully cancelled line must not appear as open');
  const sup = K.supplierCommitmentRows(onlyLines([zero, part, full]), { asOfDate: AS_OF }).items.find((r) => r.supplier_id === 'SUP-001');
  assertEqual([sup.grossValue, sup.cancelledValue, sup.netActiveValue, sup.openValue, sup.overdueLines], [3000, 1300, 1700, 900, 2]);
});

test('Procurement (Stage 6)', 'A fully cancelled line past its promised date is not counted as overdue', async () => {
  const k = K.overdueOpenPoValue(onlyLines([poLine('F-1', { cancelled: 10, promised: '2025-01-01' })]), { asOfDate: AS_OF });
  assertEqual([k.n, k.value], [0, 0]);
});

test('Procurement (Stage 6)', '4.7 Promise-to-request gap: 66 later, 5 same, 29 earlier; mean +2.46 days; range −3 to +8', async () => {
  const g = all.procurement.promiseGap;
  assertEqual([g.later, g.same, g.earlier, g.n, g.min, g.max, g.excluded], [EP.gap.later, EP.gap.same, EP.gap.earlier, EP.gap.n, EP.gap.min, EP.gap.max, 0]);
  assertClose(g.value, EP.gap.mean, 1e-9);
  assert(g.limitation.includes('currently recorded promised date') && g.limitation.includes('revisions'), g.limitation);
});

test('Procurement (Stage 6)', '4.7 Sign: promised after requested is positive; before is negative; blank date excluded', async () => {
  const g = K.promiseToRequestGap(onlyLines([
    poLine('G-1', { requested: '2026-05-01', promised: '2026-05-04' }),
    poLine('G-2', { requested: '2026-05-10', promised: '2026-05-08' }),
    { ...poLine('G-3'), promised_delivery_date: null },
  ]));
  assertEqual([g.later, g.earlier, g.min, g.max, g.n, g.excluded], [1, 1, -2, 3, 2, 1]);
});

test('Procurement (Stage 6)', 'Supplier commitment rows match independently for all 25 suppliers', async () => {
  const bad = [];
  for (const r of all.procurement.supplierRows.items) {
    const e = EP.suppliers[r.supplier_id];
    const pairs = [['poLines', r.poLines, e.lines], ['gross', r.grossValue, e.gross], ['cancelled', r.cancelledValue, e.cancelled], ['net', r.netActiveValue, e.net], ['received', r.receivedValue, e.received], ['open', r.openValue, e.open], ['openLines', r.openLines, e.open_lines], ['overdueLines', r.overdueLines, e.overdue_lines], ['overdue', r.overdueValue, e.overdue], ['oldest', r.oldestOverdueDays, e.oldest], ['gapLater', r.gapLater, e.gap_later]];
    for (const [k, a, b] of pairs) if (!(a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < CENT))) bad.push(`${r.supplier_id} ${k}: ${a} vs ${b}`);
    if (!(r.avgPromiseGapDays === e.gap_mean || Math.abs(r.avgPromiseGapDays - e.gap_mean) < 1e-9)) bad.push(`${r.supplier_id} gap mean`);
  }
  assertEqual(bad, []);
});

test('Procurement (Stage 6)', 'Supplier rows: default order net active descending; share equals KPI 6.4; cumulative reaches 100%; 5 suppliers for 80%', async () => {
  const items = all.procurement.supplierRows.items;
  assertEqual(items.map((i) => i.supplier_id).slice(0, 5), EP.pareto.slice(0, 5).map((p) => p[0]));
  assert(items.every((it, i) => i === 0 || items[i - 1].netActiveValue >= it.netActiveValue), 'not sorted');
  for (const it of items) assertClose(it.sharePct, conc(all, it.supplier_id).concentrationPct, 1e-9, it.supplier_id);
  items.forEach((it, i) => assertClose(it.cumulativeSharePct, EP.pareto[i][2], 1e-9, `cumulative ${it.supplier_id}`));
  assertClose(items[items.length - 1].cumulativeSharePct, 100, 1e-9);
  assertEqual(all.procurement.supplierRows.suppliersFor80Pct, EP.suppliers_for_80);
});

test('Procurement (Stage 6)', 'Segments by category, country, tier and criticality match and reconcile to totals', async () => {
  for (const [key, ek] of [['byCategory', 'seg_category'], ['byCountry', 'seg_country'], ['byTier', 'seg_tier'], ['byCriticality', 'seg_criticality']]) {
    const items = all.procurement[key].items;
    assertEqual(items.length, Object.keys(EP[ek]).length, `${key} groups`);
    for (const g of items) {
      const e = EP[ek][g.segment];
      assertEqual([g.poLines, g.overdueLines], [e.lines, e.overdue_lines], `${key} ${g.segment}`);
      assertClose(g.netActiveValue, e.net, CENT, `${key} ${g.segment} net`);
      assertClose(g.openValue, e.open, CENT, `${key} ${g.segment} open`);
      assertClose(g.overdueValue, e.overdue, CENT, `${key} ${g.segment} overdue`);
    }
    assertClose(items.reduce((s, g) => s + g.netActiveValue, 0), EP.net, CENT, `${key} net total`);
    assertClose(items.reduce((s, g) => s + g.overdueValue, 0), EP.overdue, CENT, `${key} overdue total`);
  }
});

test('Procurement (Stage 6)', 'Critical suppliers (suppliers.csv) carry $4,215,886.50 of overdue open value', async () => {
  const c = all.procurement.byCriticality.items.find((g) => g.segment === 'Critical');
  assertClose(c.overdueValue, 4215886.5, CENT);
  assertEqual(c.overdueSharePct.toFixed(1), '61.1');
});

test('Procurement (Stage 6)', 'Register: 63 open lines, most overdue first (POL-00003 327 days), 28 overdue with no receipt', async () => {
  const r = all.procurement.register;
  assertEqual(r.items.length, EP.register_count);
  assertEqual(r.items.slice(0, 5).map((i) => [i.po_line_id, i.daysPastPromised]), EP.register_first5);
  assertEqual(r.overdueNoReceipt, EP.overdue_no_receipt);
  assert(r.items.every((i) => (i.overdue ? i.daysPastPromised >= 1 && i.bucket !== 'not-due' : i.daysPastPromised <= 0 && i.bucket === 'not-due')), 'bucket and overdue flag inconsistent');
  assertClose(r.items.reduce((s, i) => s + i.openValue, 0), EP.open, CENT);
});

test('Procurement (Stage 6)', 'Grain: extra delivery and inspection rows do not change any procurement value', async () => {
  const extra = { ...d.delivery_transactions[0], delivery_id: 'DEL-X9' };
  const m = withChanges(d, 'delivery_transactions', { add: [extra, extra, extra] });
  const b = K.poValueBridge(m, { asOfDate: AS_OF });
  assertEqual([b.gross, b.received, b.open, b.overdue], [all.procurement.bridge.gross, all.procurement.bridge.received, all.procurement.bridge.open, all.procurement.bridge.overdue]);
});

test('Procurement (Stage 6)', '6.5 is labelled "Average gross PO line value" ($125,503.78)', async () => {
  assertEqual(all.procurement.averageLine.label, 'Average gross PO line value');
  assertClose(all.procurement.averageLine.value, EP.avg_gross_line, CENT);
});

/* ======================================================================
 * Not supported
 * ==================================================================== */

test('Not supported', 'Unsupported KPIs are listed with a reason and no value', async () => {
  assertEqual(all.notSupported.map((k) => k.kpiId), ['4.5', '4.6', '5.6', '6.6', '7.8', '8.5', '8.6', '8.7']);
  for (const k of all.notSupported) {
    assertEqual([k.value, k.status], [null, 'Not supported'], k.kpiId);
    assert(k.reason.length > 10, `${k.kpiId} has no reason`);
  }
});

/* ======================================================================
 * Governance rule tests (in-memory changes)
 * ==================================================================== */

test('Rules', 'Grain: extra delivery and inspection rows do not change PO values', async () => {
  const extraDel = { ...d.delivery_transactions.find((r) => r.delivery_id === 'DEL-00001'), delivery_id: 'DEL-X1' };
  const extraQ = { ...d.supplier_quality.find((r) => r.inspection_id === 'QI-0001'), inspection_id: 'QI-X1', delivery_id: 'DEL-X1' };
  let m = withChanges(d, 'delivery_transactions', { add: [extraDel, extraDel, extraDel] });
  m = withChanges(m, 'supplier_quality', { add: [extraQ] });
  const k = K.computeAllKpis(m, { asOfDate: AS_OF });
  assertClose(k.procurement.gross.value, E['6.1'], CENT);
  assertClose(k.procurement.netActive.value, E['6.1.2'], CENT);
  assertClose(k.procurement.openCommitment.value, E['6.2'], CENT);
});

test('Rules', 'SERVICE exclusion: a large SERVICE stock value does not enter inventory KPIs', async () => {
  const m = withChanges(d, 'inventory_snapshot', { where: (r) => r.material_id === 'MAT-018', set: { on_hand_qty: 1000, on_hand_inventory_value_usd: 9e9, available_qty: 0, available_inventory_value_usd: 9e9 } });
  const k = K.computeAllKpis(m, { asOfDate: AS_OF });
  assertClose(k.inventory.onHandValue.value, E['7.1'], CENT);
  assertClose(k.inventory.availableValue.value, E['7.2'], CENT);
  assertEqual(k.inventory.safetyStockBreaches.value, 5);
});

test('Rules', 'Available basis: reducing allocation (more available stock) clears a breach that on-hand status would not show', async () => {
  const m = withChanges(d, 'inventory_snapshot', { where: (r) => r.material_id === 'MAT-020', set: { allocated_qty: 0, available_qty: 38 } });
  const k = K.computeAllKpis(m, { asOfDate: AS_OF });
  assert(!k.inventory.belowReorderPoint.items.includes('MAT-020'), 'MAT-020 should no longer be below ROP');
  assertEqual(k.inventory.belowReorderPoint.value, 9);
});

test('Rules', 'Blank is not zero: a blank on-time flag is excluded from the OTD denominator', async () => {
  const m = withChanges(d, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { on_time_flag: null } });
  const k = K.deliveryEventOtd(m, { basis: 'full', asOfDate: AS_OF });
  assertEqual([k.numerator, k.denominator], [28, 72]);
});

test('Rules', 'Blank is not zero: blank closure days are excluded from the average', async () => {
  const m = withChanges(d, 'supplier_quality', { where: (r) => r.inspection_id === 'QI-0007', set: { corrective_action_closure_days: 0 } });
  const k = K.averageCorrectiveActionClosure(m);
  assertEqual([k.value, k.n], [20.5, 2], 'a recorded 0 is included');
  assertEqual(K.averageCorrectiveActionClosure(d).n, 1, 'blanks are not included');
});

test('Rules', 'Rejection rate is quantity-weighted, not an average of record percentages', async () => {
  const valid = d.supplier_quality.filter((r) => r.inspected_qty > 0);
  const meanOfPct = valid.reduce((s, r) => s + r.rejection_rate_pct, 0) / valid.length;
  assert(Math.abs(meanOfPct - all.quality.rejectionRate.value) > 0.001, `methods must differ (mean of % = ${meanOfPct.toFixed(4)})`);
  assertClose(meanOfPct, 0.1574, 0.0001, 'mean of record percentages');
  assertClose(all.quality.rejectionRate.value, (5 / 2997) * 100, FINE);
});

test('Rules', 'Supplier criticality comes from suppliers.csv, not supplier_quality.supplier_criticality', async () => {
  const m = withChanges(d, 'supplier_quality', { where: (r) => r.supplier_id === 'SUP-001', set: { supplier_criticality: 'Low' } });
  const k = K.supplierProfiles(m, { asOfDate: AS_OF });
  assertEqual(k.items.find((p) => p.supplier_id === 'SUP-001').criticality, 'Critical');
});

test('Rules', 'As-of date is configurable: moving it past all events makes snapshot OTD equal full OTD', async () => {
  const k = K.computeAllKpis(d, { asOfDate: '2027-12-31' });
  assertEqual([k.delivery.otdSnapshot.numerator, k.delivery.otdSnapshot.denominator], [28, 73]);
});

test('Rules', 'As-of boundary: an event delivered on the as-of date is in the snapshot basis', async () => {
  const m = withChanges(d, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00088', set: { actual_delivery_date: AS_OF } });
  assertEqual(K.deliveryEventOtd(m, { basis: 'snapshot', asOfDate: AS_OF }).denominator, 64);
});

test('Rules', 'Cancelling a whole PO line lowers that supplier\'s concentration and totals still sum to 100%', async () => {
  const line = d.purchase_orders.find((r) => r.supplier_id === 'SUP-007' && r.open_qty > 0);
  const m = withChanges(d, 'purchase_orders', { where: (r) => r.po_line_id === line.po_line_id, set: { cancelled_qty: line.ordered_qty, open_qty: 0, received_qty: 0 } });
  const k = K.supplierCommitment(m).concentration;
  const before = conc(all, 'SUP-007').concentrationPct;
  const after = k.items.find((i) => i.supplier_id === 'SUP-007').concentrationPct;
  assert(after < before, `expected lower than ${before}, got ${after}`);
  assertClose(k.items.reduce((s, i) => s + i.concentrationPct, 0), 100, 1e-9);
});

test('Rules', 'Empty input gives blank KPI values, not 0', async () => {
  const empty = Object.fromEntries(DATASET_NAMES.map((n) => [n, []]));
  const k = K.computeAllKpis(empty, { asOfDate: AS_OF });
  assertEqual([k.delivery.otdFull.value, k.quality.rejectionRate.value, k.quality.dpm.value, k.inventory.daysOfSupply.value, k.procurement.averageLine.value], [null, null, null, null, null]);
});

test('Rules', 'KPI functions do not modify their input', async () => {
  const snapshot = JSON.stringify(d);
  K.computeAllKpis(d, { asOfDate: AS_OF });
  assertEqual(JSON.stringify(d), snapshot);
});

/* ======================================================================
 * Source protection
 * ==================================================================== */

test('Source protection', 'Source CSV files are byte-for-byte unchanged after all tests', async () => {
  for (const n of DATASET_NAMES) assertEqual(await sha256(await fetchText(`${DATA_PATH}${SCHEMA[n].file}`)), hashesBefore[n], n);
});

runTests(document.getElementById('results')).then(({ summary }) => {
  document.title = `${summary.failed ? 'FAIL' : 'PASS'} – KPI engine tests`;
});
