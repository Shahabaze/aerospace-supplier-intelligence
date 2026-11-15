/**
 * Visuals tests (DEC-035): the chart-first layer added to the four modules by src/js/visuals.js.
 * Drives the real application in an iframe. Expected values: tests/kpi-expected-values.js
 * (independent calculation) and the KPI engine.
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { computeAllKpis } from '../src/js/kpis.js';
import { EXPECTED as E, EXPECTED_PROCUREMENT as EP } from './kpi-expected-values.js';

const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;

function openApp(hash, width = 1400) {
  return new Promise((resolve, reject) => {
    const f = document.createElement('iframe');
    f.style.cssText = `width:${width}px;height:900px;position:absolute;left:-20000px;top:0`;
    f.src = `../index.html${hash}`;
    const t0 = Date.now();
    f.onload = () => {
      const poll = () => {
        const st = f.contentDocument?.documentElement.dataset.appState;
        if (st === 'ready' || st === 'error') return resolve(f);
        if (Date.now() - t0 > 15000) return reject(new Error(`app not ready (${st})`));
        setTimeout(poll, 50);
      };
      poll();
    };
    document.body.appendChild(f);
  });
}
const waitFor = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 30)); } return false; };

let frame, doc, win, kpis;
const go = async (hash, ready) => { win.location.hash = hash; assert(await waitFor(() => win.location.hash === hash && doc.querySelector(ready)), `${hash} not shown`); await new Promise((r) => setTimeout(r, 60)); };
const ringOf = (card) => Number(doc.querySelector(`[data-card="${card}"] [data-viz="ring"]`)?.dataset.vizValue);
const chartOf = (id) => win.Chart.getChart(doc.getElementById(id));

/** Clicks a chart element the way a user would: a real click event at its centre. */
function clickChart(id, index, datasetIndex = 0) {
  const c = chartOf(id);
  const el = c.getDatasetMeta(datasetIndex).data[index];
  const { x, y } = el.getCenterPoint ? el.getCenterPoint() : el;
  const r = c.canvas.getBoundingClientRect();
  const opts = { clientX: r.left + x, clientY: r.top + y, bubbles: true };
  c.canvas.dispatchEvent(new win.MouseEvent('mousemove', opts));
  c.canvas.dispatchEvent(new win.MouseEvent('click', opts));
}

test('Load', 'Application loads; KPI engine available for comparison', async () => {
  const lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  kpis = computeAllKpis(rowsOf(lr), { asOfDate: CONFIG.reportingAsOfDate });
  frame = await openApp('#/executive');
  doc = frame.contentDocument;
  win = frame.contentWindow;
  assert(doc.querySelector('[data-card="otd"]'));
});

/* ---------- Executive dashboard ---------- */

test('Executive', 'Card rings equal the engine: OTD 25/63, late 38/63, rejection 0.17%', async () => {
  assert(near(ringOf('otd'), (E['4.1_snap'].num / E['4.1_snap'].den) * 100));
  assert(near(ringOf('late'), (E['4.2_snap'] / E['4.1_snap'].den) * 100));
  assert(near(ringOf('rejection'), kpis.quality.rejectionRate.value));
});

test('Executive', 'Split bars: open = overdue + not yet due; net active = received + open', async () => {
  const open = doc.querySelector('[data-card="open-po"] [data-viz="split"]').getAttribute('aria-label');
  assert(open.includes('$6.90M overdue of $8.86M'), open);
  const net = doc.querySelector('[data-card="net-active"] [data-viz="split"]').getAttribute('aria-label');
  assert(net.includes('$2.62M received') && net.includes('$8.86M open'), net);
  assert(near(kpis.procurement.received.value + kpis.procurement.openCommitment.value, EP.net, 1e-6));
});

test('Executive', 'Detail lines are folded but keep their text; caveat notes stay visible', async () => {
  const card = doc.querySelector('[data-card="net-active"]');
  const d = card.querySelector('details.kpi__more');
  assert(d && !d.open, 'details not folded');
  assert(d.textContent.includes('$12,550,378.20'), 'gross value missing from details');
  const note = card.querySelector(':scope > .kpi__note');
  assert(note && note.getBoundingClientRect().height > 0 && note.textContent.includes('not invoiced or paid spend'));
  assert(doc.querySelector('[data-card="inventory"] > .kpi__note').textContent.includes('Single snapshot'));
});

test('Executive', 'Supplier base lists become doughnuts with the engine counts; counts table kept under a toggle', async () => {
  assertEqual(chartOf('viz-qualification').data.datasets[0].data.reduce((s, v) => s + v, 0), 25);
  assertEqual(chartOf('viz-certification').data.datasets[0].data.reduce((s, v) => s + v, 0), 25);
  assertEqual(chartOf('viz-qualification').data.labels, Object.entries(kpis.suppliers.qualification.value).sort((a, b) => b[1] - a[1]).map(([n]) => n));
  assert(doc.querySelector('[data-panel="supplier-base"] details.viz-fold .stat-list'));
});

test('Executive', 'Selecting a concentration bar opens that supplier', async () => {
  const c = chartOf('concentration-chart');
  const i = c.data.labels.findIndex((l) => /SUP-008/.test(String(l)));
  assert(i >= 0);
  clickChart('concentration-chart', i);
  assert(await waitFor(() => win.location.hash === '#/suppliers/SUP-008'), win.location.hash);
});

/* ---------- Supplier performance ---------- */

test('Suppliers', 'Baseline rings match the engine; corrective actions 3 of 4 open', async () => {
  await go('#/suppliers', '[data-card="base-otd"] [data-viz]');
  assert(near(ringOf('base-otd'), kpis.delivery.otdSnapshot.value));
  assert(near(ringOf('base-ca'), (kpis.quality.openCorrectiveActions.value / kpis.quality.openCorrectiveActions.n) * 100));
  assertEqual(kpis.quality.openCorrectiveActions.value, 3);
});

test('Suppliers', 'Criticality chart: value share and OTD per segment from the engine; event counts in the labels', async () => {
  const c = chartOf('viz-crit');
  assertEqual(c.data.labels[0], 'Critical (4 events)');
  const crit = kpis.suppliers.byCriticality.items.find((g) => g.segment === 'Critical');
  assert(near(c.data.datasets[0].data[0], crit.netActiveSharePct) && near(c.data.datasets[1].data[0], crit.otdSnapshotPct));
  assert(doc.querySelector('details.viz-fold [data-table="segments"]'), 'table not kept under a toggle');
});

test('Suppliers', 'Supplier detail rings use the engine values written on the cards', async () => {
  await go('#/suppliers/SUP-013', '[data-card="det-otd"] [data-viz]');
  const v = Number(doc.querySelector('[data-card="det-otd"] [data-value]').dataset.value);
  assert(near(ringOf('det-otd'), v));
});

/* ---------- Procurement ---------- */

test('Procurement', 'Overdue rings: 77.9% of open value, 51 of 63 lines', async () => {
  await go('#/procurement', '[data-card="overdue-value"] [data-viz]');
  assert(near(ringOf('overdue-value'), (EP.overdue / EP.open) * 100));
  assert(near(ringOf('overdue-lines'), (51 / 63) * 100));
});

test('Procurement', 'Selecting the 31–90 day ageing bar filters the register to those 10 overdue lines', async () => {
  clickChart('ageing-chart', 1);
  assert(await waitFor(() => doc.querySelector('select[data-rfilter="bucket"]')?.value === '31-90'), 'bucket filter not set');
  const rows = [...doc.querySelectorAll('[data-table="register"] tbody tr')];
  assertEqual(rows.length, kpis.procurement.ageing.items.find((b) => b.bucket === '31-90').lines);
  assert(rows.every((r) => r.dataset.bucket === '31-90'));
});

test('Procurement', 'Segment chart redraws for each grouping without freezing the page', async () => {
  for (const g of ['criticality', 'country', 'material_category']) {
    const r = doc.querySelector(`input[name="segment"][value="${g}"]`);
    r.checked = true;
    r.dispatchEvent(new win.Event('change', { bubbles: true }));
    assert(await waitFor(() => chartOf('viz-segments')), `${g}: chart missing`);
  }
  const c = chartOf('viz-segments');
  assertEqual(c.data.labels.length, 10);
  assertEqual(doc.querySelectorAll('[data-panel="segments"] .viz-hint').length, 1, 'hint repeated');
  assertEqual(doc.querySelectorAll('[data-panel="ageing"] .viz-hint').length, 1, 'ageing hint repeated');
});

/* ---------- Inventory ---------- */

test('Inventory', 'Cards: below reorder 10 of 23, below safety stock 5 of 23 (available basis)', async () => {
  await go('#/inventory', '[data-card="below-ss"] [data-viz]');
  assert(near(ringOf('below-rop'), (E['7.3'].length / 23) * 100));
  assert(near(ringOf('below-ss'), (E['7.4'].length / 23) * 100));
});

test('Inventory', 'Stage 7 caveats stay visible beside the charts (DEC-034 conditions 2, 4, 5)', async () => {
  const vis = (sel) => { const e = doc.querySelector(sel); return e && e.getBoundingClientRect().height > 0 ? e.textContent : ''; };
  assert(vis('[data-caveat="on-hand"]').includes('On-hand basis'), 'on-hand caveat');
  assert(vis('[data-caveat="available"]').includes('on-hand minus allocated'), 'available caveat');
  assert(vis('[data-caveat="dos"]').includes('Synthetic average daily demand, not a forecast') && vis('[data-caveat="dos"]').includes('Single snapshot'), 'DOS caveat');
  assert(vis('[data-banner="snapshot"]'), 'snapshot banner');
});

test('Inventory', 'Doughnuts carry the engine counts: supplied status (on-hand) and stock position (available)', async () => {
  const s = chartOf('viz-supplied');
  assertEqual(s.data.datasets[0].data.reduce((a, b) => a + b, 0), 23);
  assertEqual(s.data.labels.map((l, i) => [l, s.data.datasets[0].data[i]]), s.data.labels.map((l) => [l, kpis.inventory.statusDistribution.value[l]]));
  assertEqual(chartOf('viz-position').data.datasets[0].data, [E['7.4'].length, E['7.3'].length - E['7.4'].length, 23 - E['7.3'].length]);
});

test('Inventory', 'Selecting "Below safety stock" in the stock-position chart filters the table to those 5 materials', async () => {
  clickChart('viz-position', 0);
  assert(await waitFor(() => doc.querySelector('select[data-ifilter="position"]')?.value === 'Below safety stock'));
  const ids = [...doc.querySelectorAll('[data-table="inventory"] tbody tr')].map((r) => r.dataset.material).sort();
  assertEqual(ids, [...E['7.4']].sort());
});

test('Inventory', 'Days-of-supply chart: one bar per physical material with demand, lowest first; a bar finds its material', async () => {
  doc.querySelector('[data-action="reset-inventory"]').click();
  assert(await waitFor(() => doc.querySelectorAll('[data-table="inventory"] tbody tr').length === 23 && chartOf('viz-dos')), 'chart not redrawn after reset');
  const c = chartOf('viz-dos');
  const phys = kpis.inventory.register.items.filter((r) => r.physical && r.days_of_supply !== null);
  assertEqual(c.data.labels.length, phys.length);
  const v = c.data.datasets[0].data;
  assert(v.every((x, i) => i === 0 || v[i - 1] <= x), 'not sorted');
  assertEqual(v[0], Math.min(...phys.map((r) => r.days_of_supply)));
  const id = c.data.labels[0];
  clickChart('viz-dos', 0);
  assert(await waitFor(() => doc.querySelector('input[data-ifilter="search"]')?.value === id));
  const rows = [...doc.querySelectorAll('[data-table="inventory"] tbody tr')];
  assertEqual(rows.map((r) => r.dataset.material), [id]);
  doc.querySelector('[data-action="reset-inventory"]').click();
});

test('Inventory', 'SERVICE materials stay out of every inventory chart (DEC-034 condition 3)', async () => {
  assert(await waitFor(() => chartOf('viz-dos') && chartOf('viz-position')), 'charts not redrawn');
  const all = [...chartOf('viz-dos').data.labels];
  assert(!all.includes('MAT-018') && !all.includes('MAT-021'));
  assertEqual(chartOf('viz-position').data.datasets[0].data.reduce((a, b) => a + b, 0), 23);
});

/* ---------- Whole app ---------- */

test('Theme', 'Every page is dark and has no NaN or undefined text', async () => {
  for (const [h, sel] of [['#/executive', '[data-card="otd"]'], ['#/overview', '[data-overview]'], ['#/suppliers', '[data-card="base-otd"]'], ['#/procurement', '[data-panel="bridge"]'], ['#/inventory', '[data-table="inventory"]']]) {
    await go(h, sel);
    assert(win.getComputedStyle(doc.body).backgroundImage.includes('radial-gradient'), `${h} not dark`);
    assert(!/NaN|undefined/.test(doc.querySelector('main').textContent), `${h} has a bad value`);
  }
  frame.remove();
});

test('Fallback', 'Without the chart library: card visuals still show and every table stays unfolded', async () => {
  const f = await openApp('#/inventory');
  const d = f.contentDocument;
  assert(await waitFor(() => d.querySelector('[data-table="inventory"]')));
  // Simulate a failed chart library on the next page render.
  f.contentWindow.Chart = undefined;
  f.contentWindow.location.hash = '#/executive';
  assert(await waitFor(() => d.querySelector('[data-card="otd"] [data-viz="ring"]')), 'card visuals missing');
  assert(!d.querySelector('details.viz-fold'), 'tables folded without charts');
  assert(d.querySelector('[data-panel="supplier-base"] .stat-list'));
  f.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => { document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Visuals tests`; });
