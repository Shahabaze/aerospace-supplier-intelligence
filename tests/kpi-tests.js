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
import { EXPECTED as E } from './kpi-expected-values.js';

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
