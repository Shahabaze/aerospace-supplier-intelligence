/**
 * Data layer tests – loader, schema typing, the 17 Data Model controls,
 * supplementary Data Model section 5 checks and approved data-quality notices.
 *
 * Expected values below come from the independent repository audit (2026-11-13),
 * not from this JavaScript code.
 */

import { test, assert, assertEqual, assertClose, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { SCHEMA, DATASET_NAMES } from '../src/js/schema.js';
import { loadAllDatasets, parseDataset, convertValue, isIsoDate } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';

const Papa = window.Papa;
const DATA_PATH = '../data/';
const AS_OF = CONFIG.reportingAsOfDate;

let real; // load result for the real data
const sourceHashesBefore = {};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

const byId = (rows, field, id) => rows.find((r) => r[field] === id);
const control = (v, id) => [...v.controls, ...v.supplementary].find((c) => c.id === id);

/**
 * Returns a copy of a load result with one record changed or added.
 * The real load result and the source files are not modified.
 */
function mutate(base, datasetName, { where, set, appendFrom, appendSet }) {
  const ds = base.datasets[datasetName];
  const copyRow = (r, changes) => {
    const c = { ...r, ...changes };
    Object.defineProperty(c, '_line', { value: r._line, enumerable: false });
    return c;
  };
  let rows = ds.rows;
  let rawRows = ds.rawRows;
  if (where) {
    rows = ds.rows.map((r) => (where(r) ? copyRow(r, set) : r));
    rawRows = ds.rawRows.map((raw, i) => {
      if (!where(ds.rows[i])) return raw;
      const rawChanges = {};
      for (const [k, v] of Object.entries(set)) rawChanges[k] = v === null ? '' : String(v);
      return copyRow(raw, rawChanges);
    });
  }
  if (appendFrom) {
    const src = ds.rows.find(appendFrom);
    const i = ds.rows.indexOf(src);
    const rawChanges = {};
    for (const [k, v] of Object.entries(appendSet || {})) rawChanges[k] = v === null ? '' : String(v);
    rows = [...rows, copyRow(src, appendSet || {})];
    rawRows = [...rawRows, copyRow(ds.rawRows[i], rawChanges)];
  }
  return { ...base, datasets: { ...base.datasets, [datasetName]: { ...ds, rows, rawRows } } };
}

/* ======================================================================
 * 1. Loading and source protection
 * ==================================================================== */

test('Loading', 'All six CSV files load without errors', async () => {
  for (const name of DATASET_NAMES) sourceHashesBefore[name] = await sha256(await fetchText(`${DATA_PATH}${SCHEMA[name].file}`));
  real = await loadAllDatasets({ basePath: DATA_PATH, Papa });
  assertEqual(real.loadErrors, [], 'load errors');
  assertEqual(Object.keys(real.datasets).sort(), [...DATASET_NAMES].sort(), 'datasets loaded');
});

test('Loading', 'Row counts match Data Model v2.0 (25/25/100/91/25/73)', async () => {
  const counts = Object.fromEntries(DATASET_NAMES.map((n) => [n, real.datasets[n].rows.length]));
  assertEqual(counts, {
    suppliers: 25,
    materials: 25,
    purchase_orders: 100,
    delivery_transactions: 91,
    inventory_snapshot: 25,
    supplier_quality: 73,
  });
});

test('Loading', 'Column headers exactly match the schema (no missing or extra columns)', async () => {
  for (const name of DATASET_NAMES) assertEqual(real.datasets[name].headers, Object.keys(SCHEMA[name].fields), name);
});

test('Loading', 'Real data produces no loader errors or warnings', async () => {
  assertEqual(real.issues, []);
});

test('Loading', 'A missing file is reported as a load error, not ignored', async () => {
  const r = await loadAllDatasets({ basePath: './no-such-folder/', Papa });
  assertEqual(r.loadErrors.length, 6, 'load errors');
  const v = runValidation(r, { asOfDate: AS_OF });
  assertEqual(v.summary.notRun.length, 24, 'checks marked not run');
  assert(!v.summary.allPassed, 'validation must not report success when data is missing');
});

test('Loading', 'Typed records are read-only (application cannot alter loaded data)', async () => {
  const r = real.datasets.suppliers.rows[0];
  assert(Object.isFrozen(r), 'record is not frozen');
});

/* ======================================================================
 * 2. Type conversion and blank handling
 * ==================================================================== */

test('Typing', 'Identifiers stay as text', async () => {
  const s = real.datasets.suppliers.rows[0];
  assertEqual(s.supplier_id, 'SUP-001');
  assertEqual(typeof real.datasets.purchase_orders.rows[0].po_line_id, 'string');
});

test('Typing', 'Numbers are converted to numbers', async () => {
  const po = byId(real.datasets.purchase_orders.rows, 'po_line_id', 'POL-00001');
  assertEqual(po.ordered_qty, 30);
  assertEqual(po.unit_price_usd, 2736);
  assertEqual(po.line_total_usd, 82080);
});

test('Typing', 'In-transit blanks stay blank (null), not zero', async () => {
  const d = byId(real.datasets.delivery_transactions.rows, 'delivery_id', 'DEL-00002');
  assertEqual([d.actual_delivery_date, d.delivery_variance_days, d.on_time_flag], [null, null, null]);
});

test('Typing', 'Recorded zeros stay zero', async () => {
  const d = byId(real.datasets.delivery_transactions.rows, 'delivery_id', 'DEL-00001');
  assertEqual(d.rejected_qty, 0);
  assertEqual(d.on_time_flag, 0);
  const d2 = byId(real.datasets.delivery_transactions.rows, 'delivery_id', 'DEL-00002');
  assertEqual(d2.received_qty, 0, 'in-transit received_qty is a recorded 0');
});

test('Typing', 'Blank shelf life stays blank; recorded shelf life is a number', async () => {
  const m1 = byId(real.datasets.materials.rows, 'material_id', 'MAT-001');
  const m6 = byId(real.datasets.materials.rows, 'material_id', 'MAT-006');
  assertEqual(m1.shelf_life_days, null);
  assertEqual(m6.shelf_life_days, 365);
});

test('Typing', 'Blank corrective-action closure days stay blank', async () => {
  const q = real.datasets.supplier_quality.rows.filter((r) => r.corrective_action_closure_days !== null);
  assertEqual(q.map((r) => [r.inspection_id, r.corrective_action_closure_days]), [['QI-0020', 41]]);
});

test('Typing', 'convertValue unit cases', async () => {
  const dec = { type: 'decimal', nullable: false };
  assertEqual(convertValue('', dec), { value: null, error: null });
  assertEqual(convertValue('0', dec), { value: 0, error: null });
  assertEqual(convertValue('-3.5', dec), { value: -3.5, error: null });
  assert(convertValue('1,000', dec).error, '"1,000" must be rejected');
  assert(convertValue('abc', dec).error, '"abc" must be rejected');
  assert(convertValue('1.5', { type: 'integer' }).error, '"1.5" is not a whole number');
  assertEqual(convertValue('41.0', { type: 'integer' }).value, 41);
  assert(convertValue('2', { type: 'flag' }).error, 'flag 2 must be rejected');
});

test('Typing', 'Date validation rejects non-ISO and impossible dates', async () => {
  assert(isIsoDate('2026-10-31'));
  assert(isIsoDate('2024-02-29'), 'leap day');
  assert(!isIsoDate('2026-02-29'), 'not a leap year');
  assert(!isIsoDate('2026-02-30'));
  assert(!isIsoDate('2025/12/08'));
  assert(!isIsoDate('31-10-2026'));
  assert(!isIsoDate('2026-1-5'));
});

/* ======================================================================
 * 3. Loader negative tests (fixture files)
 * ==================================================================== */

test('Loader faults', 'Fixture: bad dates, non-numeric value, bad flag, blank required value and extra column are all reported', async () => {
  const ds = parseDataset('delivery_transactions', await fetchText('fixtures/delivery_type_errors.csv'), Papa);
  const msgs = ds.issues.filter((i) => i.severity === 'error').map((i) => `${i.line}|${i.field}|${i.message}`);
  const has = (line, field, text) => msgs.some((m) => m.startsWith(`${line}|${field}|`) && m.includes(text));
  assert(has(4, 'shipment_date', 'not a valid YYYY-MM-DD'), 'non-ISO date not reported');
  assert(has(4, 'promised_delivery_date', 'not a valid YYYY-MM-DD'), 'impossible date not reported');
  assert(has(4, 'shipped_qty', 'not a valid number'), 'non-numeric not reported');
  assert(has(4, 'on_time_flag', 'not a valid flag'), 'bad flag not reported');
  assert(has(5, 'received_qty', 'required value is blank'), 'blank required value not reported');
  assert(msgs.some((m) => m.startsWith('6|null|CSV structure problem')), 'extra column not reported');
});

test('Loader faults', 'Fixture: valid blanks and zeros are preserved correctly', async () => {
  const ds = parseDataset('delivery_transactions', await fetchText('fixtures/delivery_type_errors.csv'), Papa);
  const fx2 = ds.rows[1];
  assertEqual([fx2.actual_delivery_date, fx2.delivery_variance_days, fx2.on_time_flag, fx2.received_qty], [null, null, null, 0]);
  const fx4 = ds.rows[3];
  assertEqual(fx4.received_qty, null, 'blank required value must stay blank, not 0');
});

test('Loader faults', 'Fixture: missing column is reported', async () => {
  const ds = parseDataset('materials', await fetchText('fixtures/materials_missing_column.csv'), Papa);
  assert(ds.issues.some((i) => i.severity === 'error' && i.field === 'shelf_life_days' && i.message.includes('missing')), 'missing column not reported');
});

test('Loader faults', 'Loader errors make check S00 fail', async () => {
  const bad = parseDataset('delivery_transactions', await fetchText('fixtures/delivery_type_errors.csv'), Papa);
  const lr = { ...real, issues: bad.issues };
  assertEqual(control(runValidation(lr, { asOfDate: AS_OF }), 'S00').status, 'fail');
});

/* ======================================================================
 * 4. The 17 controls and supplementary checks on the real data
 * ==================================================================== */

test('Controls on real data', 'All 17 Data Model controls pass', async () => {
  const v = runValidation(real, { asOfDate: AS_OF });
  assertEqual(v.controls.length, 17, 'number of controls');
  const failed = v.controls.filter((c) => c.status !== 'pass').map((c) => `${c.id}: ${c.failures.map((f) => f.detail).join('; ')}`);
  assertEqual(failed, []);
});

test('Controls on real data', 'All supplementary Data Model section 5 checks pass (S00–S06)', async () => {
  const v = runValidation(real, { asOfDate: AS_OF });
  assertEqual(v.supplementary.length, 7);
  assertEqual(v.supplementary.filter((c) => c.status !== 'pass').map((c) => c.id), []);
});

test('Controls on real data', 'Every check actually examined records (no empty passes)', async () => {
  const v = runValidation(real, { asOfDate: AS_OF });
  const empty = [...v.controls, ...v.supplementary].filter((c) => !(c.checked > 0)).map((c) => c.id);
  assertEqual(empty, []);
});

test('Controls on real data', 'C16 excludes exactly the two SERVICE materials', async () => {
  const c = control(runValidation(real, { asOfDate: AS_OF }), 'C16');
  assert(c.detail.includes('MAT-018, MAT-021'), c.detail);
  assert(c.detail.includes('23 physical'), c.detail);
});

/* ======================================================================
 * 5. Negative tests – each control must detect a deliberately injected fault
 * ==================================================================== */

const NEGATIVE_CASES = [
  ['C01', 'duplicate supplier record', (b) => mutate(b, 'suppliers', { appendFrom: (r) => r.supplier_id === 'SUP-001' })],
  ['C02', 'PO line points to unknown supplier', (b) => mutate(b, 'purchase_orders', { where: (r) => r.po_line_id === 'POL-00001', set: { supplier_id: 'SUP-999' } })],
  ['C03', 'inspection points to unknown material', (b) => mutate(b, 'supplier_quality', { where: (r) => r.inspection_id === 'QI-0001', set: { material_id: 'MAT-999' } })],
  ['C04', 'delivery points to unknown PO line', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { po_line_id: 'POL-99999' } })],
  ['C05', 'delivery material disagrees with PO line', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { material_id: 'MAT-002' } })],
  ['C06', 'PO received quantity does not match deliveries', (b) => mutate(b, 'purchase_orders', { where: (r) => r.po_line_id === 'POL-00001', set: { received_qty: 16 } })],
  ['C07', 'delivery accepted + rejected ≠ received', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { accepted_qty: 16 } })],
  ['C08', 'inspection accepted + rejected ≠ inspected', (b) => mutate(b, 'supplier_quality', { where: (r) => r.inspection_id === 'QI-0001', set: { accepted_qty: 16 } })],
  ['C09', 'inspection rejected ≠ delivery rejected', (b) => mutate(b, 'supplier_quality', { where: (r) => r.inspection_id === 'QI-0001', set: { rejected_qty: 1, accepted_qty: 16 } })],
  ['C10', 'available ≠ on-hand − allocated', (b) => mutate(b, 'inventory_snapshot', { where: (r) => r.material_id === 'MAT-001', set: { available_qty: 57 } })],
  ['C11', 'inventory value ≠ qty × cost', (b) => mutate(b, 'inventory_snapshot', { where: (r) => r.material_id === 'MAT-001', set: { on_hand_inventory_value_usd: 225250 } })],
  ['C12', 'negative shipped quantity', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { shipped_qty: -1 } })],
  ['C13', 'PO unit of measure differs from material master', (b) => mutate(b, 'purchase_orders', { where: (r) => r.po_line_id === 'POL-00001', set: { unit_of_measure: 'KG' } })],
  ['C14', 'non-ISO date in source text', (b) => mutate(b, 'suppliers', { where: (r) => r.supplier_id === 'SUP-001', set: { onboarding_date: '14/03/2019' } })],
  ['C15', 'blank cell wrongly converted to 0', (b) => {
    const m = mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00002', set: { on_time_flag: 0 } });
    // Simulate a faulty loader: typed value is 0 but the source cell was blank.
    const ds = m.datasets.delivery_transactions;
    const i = ds.rows.findIndex((r) => r.delivery_id === 'DEL-00002');
    const raw = { ...ds.rawRows[i], on_time_flag: '' };
    Object.defineProperty(raw, '_line', { value: ds.rawRows[i]._line, enumerable: false });
    const rawRows = ds.rawRows.map((r, j) => (j === i ? raw : r));
    return { ...m, datasets: { ...m.datasets, delivery_transactions: { ...ds, rawRows } } };
  }],
  ['C16', 'SERVICE material recorded as physical stock', (b) => mutate(b, 'inventory_snapshot', { where: (r) => r.material_id === 'MAT-018', set: { unit_of_measure: 'EA' } })],
  ['C17', 'two inspections linked to one delivery', (b) => mutate(b, 'supplier_quality', { appendFrom: (r) => r.inspection_id === 'QI-0001', appendSet: { inspection_id: 'QI-9999' } })],
  ['S01', 'PO quantities do not reconcile', (b) => mutate(b, 'purchase_orders', { where: (r) => r.po_line_id === 'POL-00001', set: { open_qty: 12 } })],
  ['S02', 'PO line value ≠ qty × price', (b) => mutate(b, 'purchase_orders', { where: (r) => r.po_line_id === 'POL-00001', set: { line_total_usd: 82081 } })],
  ['S03', 'received more than shipped', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { shipped_qty: 16 } })],
  ['S04', 'wrong on-time flag for a late delivery', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00001', set: { on_time_flag: 1 } })],
  ['S05', 'in-transit event carries an on-time flag', (b) => mutate(b, 'delivery_transactions', { where: (r) => r.delivery_id === 'DEL-00002', set: { on_time_flag: 1 } })],
  ['S06', 'stored rejection rate does not recompute', (b) => mutate(b, 'supplier_quality', { where: (r) => r.inspection_id === 'QI-0001', set: { rejection_rate_pct: 5 } })],
];

for (const [id, description, make] of NEGATIVE_CASES) {
  test('Negative tests', `${id} detects: ${description}`, async () => {
    const v = runValidation(make(real), { asOfDate: AS_OF });
    const c = control(v, id);
    assertEqual(c.status, 'fail', `${id} status`);
    assert(c.failureCount >= 1, `${id} reported no failure records`);
    assert(!v.summary.allPassed, 'overall result must not be "all passed"');
  });
}

test('Negative tests', 'Real data is unchanged after all negative tests', async () => {
  const v = runValidation(real, { asOfDate: AS_OF });
  assert(v.summary.allPassed, `checks failing on real data: ${v.summary.failed.join(', ')}`);
});

/* ======================================================================
 * 6. Approved data-quality notices
 * ==================================================================== */

test('Notices', 'N01 (DEC-017) lists exactly the 12 events outside the 2026-10-31 snapshot', async () => {
  const n = runValidation(real, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N01');
  assert(n, 'notice N01 missing');
  assertEqual(n.items.map((e) => e.delivery_id).sort(), [
    'DEL-00078', 'DEL-00079', 'DEL-00080', 'DEL-00081', 'DEL-00082', 'DEL-00085',
    'DEL-00086', 'DEL-00087', 'DEL-00088', 'DEL-00089', 'DEL-00090', 'DEL-00091',
  ]);
  assertEqual(n.items.filter((e) => e.delivery_status === 'Delivered').length, 10, 'delivered after snapshot');
  assertEqual(n.items.filter((e) => e.delivery_status === 'In Transit').length, 2, 'shipped after snapshot');
});

test('Notices', 'N01 boundary: an event delivered exactly on the as-of date is inside the snapshot period', async () => {
  const m = mutate(real, 'delivery_transactions', {
    where: (r) => r.delivery_id === 'DEL-00088',
    set: { shipment_date: '2026-10-29', actual_delivery_date: AS_OF },
  });
  const n = runValidation(m, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N01');
  assert(!n.items.some((e) => e.delivery_id === 'DEL-00088'), 'event delivered on the as-of date was wrongly flagged');
  assertEqual(n.items.length, 11);
});

test('Notices', 'N01 boundary: an event delivered one day after the as-of date is outside', async () => {
  const m = mutate(real, 'delivery_transactions', {
    where: (r) => r.delivery_id === 'DEL-00001',
    set: { actual_delivery_date: '2026-11-01' },
  });
  const n = runValidation(m, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N01');
  assert(n.items.some((e) => e.delivery_id === 'DEL-00001'));
});

test('Notices', 'N01 disappears when the as-of date is moved past all events (as-of date is configurable)', async () => {
  const v = runValidation(real, { asOfDate: '2027-12-31' });
  assertEqual(v.notices.find((x) => x.id === 'N01'), undefined);
});

test('Notices', 'N02 (DEC-018) identifies MAT-010 and MAT-020 as classified differently on available vs on-hand basis', async () => {
  const n = runValidation(real, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N02');
  assertEqual(
    n.items.map((i) => [i.material_id, i.supplied_status, i.available_basis]),
    [
      ['MAT-010', 'Below Reorder Point', 'Safety Stock Breach'],
      ['MAT-020', 'Healthy', 'Below Reorder Point'],
    ],
  );
});

test('Notices', 'N02 never includes SERVICE materials', async () => {
  const n = runValidation(real, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N02');
  assert(!n.items.some((i) => ['MAT-018', 'MAT-021'].includes(i.material_id)));
});

test('Notices', 'N03 (DEC-019) reports 17 cancelled lines worth $1,072,369.00', async () => {
  const n = runValidation(real, { asOfDate: AS_OF }).notices.find((x) => x.id === 'N03');
  assertEqual(n.items.length, 17);
  const value = real.datasets.purchase_orders.rows.reduce((s, r) => s + r.cancelled_qty * r.unit_price_usd, 0);
  assertClose(value, 1072369.0, 0.005, 'cancelled value');
  assert(n.detail.includes('1072369.00'), n.detail);
});

/* ======================================================================
 * 7. Source protection (final)
 * ==================================================================== */

test('Source protection', 'Source CSV files are byte-for-byte unchanged after all tests', async () => {
  for (const name of DATASET_NAMES) {
    const after = await sha256(await fetchText(`${DATA_PATH}${SCHEMA[name].file}`));
    assertEqual(after, sourceHashesBefore[name], name);
  }
});

/* ---------- run ---------- */
runTests(document.getElementById('results')).then(({ summary }) => {
  document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Data layer tests`;
});
