/**
 * Command centre tests.
 * Part A drives the real application (../index.html#/overview); Part B renders the view with
 * altered inputs. Expected values: tests/kpi-expected-values.js (independent calculation).
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { MODULES } from '../src/js/modules.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import { computeAllKpis } from '../src/js/kpis.js';
import { renderOverview, overviewModel } from '../src/js/views/overview.js';
import { EXPECTED as E, EXPECTED_PROCUREMENT as EP, EXPECTED_INVENTORY as EI } from './kpi-expected-values.js';

const AS_OF = CONFIG.reportingAsOfDate;
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

function openApp(hash, width = 1440) {
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

let frame, doc, lr, kpis, model;
const text = (sel) => doc.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim();
const chart = (key) => frame.contentWindow.Chart.getChart(doc.getElementById(`hud-${key}-chart`));
const ringValue = (key) => Number(doc.querySelector(`[data-ring="${key}"]`).dataset.value);
const fig = (key) => text(`[data-fig="${key}"] .hud-fig__value`);

/* ---------- Part A: the real page ---------- */

test('Load', 'Command centre opens from the navigation with all data loaded', async () => {
  lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  kpis = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF });
  model = { config: CONFIG, load: lr, validation: runValidation(lr, { asOfDate: AS_OF }), kpis };
  frame = await openApp('#/executive');
  doc = frame.contentDocument;
  doc.querySelector('#module-nav-list a[data-module="overview"]').click();
  assert(await waitFor(() => doc.querySelector('[data-overview]')), 'overview not shown');
  assertEqual(doc.querySelector('#page-title').textContent, 'Command centre');
  assertEqual(doc.querySelector('#module-nav-list a[data-module="overview"]').getAttribute('aria-current'), 'page');
  assertEqual(doc.title, 'Command centre – Aerospace Supplier Intelligence');
  assertEqual(MODULES.find((m) => m.id === 'overview')?.available, true);
});

test('Load', 'Status chip reports 17 of 17 data checks passed', async () => {
  assertEqual(text('[data-status]'), '17 of 17 data checks passed');
  assert(!doc.querySelector('[data-banner="validation-fail"]'));
});

test('Rings', 'Delivery OTD ring = 25 / 63 (KPI 4.1 snapshot), shown as 39.7%', async () => {
  assert(near(ringValue('otd'), (E['4.1_snap'].num / E['4.1_snap'].den) * 100));
  assert(text('[data-ring="otd"]').includes('39.7%') && text('[data-ring="otd"]').includes('25 of 63 events'), text('[data-ring="otd"]'));
});

test('Rings', 'Open value overdue ring = overdue ÷ open PO value (KPI 6.8), 77.9%', async () => {
  assert(near(ringValue('overdue'), (EP.overdue / EP.open) * 100, 1e-6));
  assert(text('[data-ring="overdue"]').includes('77.9%') && text('[data-ring="overdue"]').includes('$6.90M of $8.86M'));
});

test('Rings', 'Concentration ring: top 5 suppliers hold 80.3% of net active PO value (KPI 6.4)', async () => {
  const items = kpis.procurement.supplierRows.items;
  assertEqual(kpis.procurement.supplierRows.suppliersFor80Pct, 5);
  assert(near(ringValue('top80'), items[4].cumulativeSharePct));
  assert(text('[data-ring="top80"]').includes('80.3%') && text('[data-ring="top80"]').includes('Top 5 suppliers'));
});

test('Rings', 'Reorder ring: 10 of 23 materials below reorder point (KPI 7.3, available stock)', async () => {
  assertEqual(E['7.3'].length, 10);
  assert(near(ringValue('rop'), (10 / 23) * 100));
  assert(text('[data-ring="rop"]').includes('10/23'));
});

test('Rings', 'Each ring is labelled for screen readers with its figure', async () => {
  for (const r of doc.querySelectorAll('[data-ring] svg')) {
    assertEqual(r.getAttribute('role'), 'img');
    assert(/\d/.test(r.getAttribute('aria-label')), r.getAttribute('aria-label'));
  }
});

test('Figures', 'Six headline figures match the independent values', async () => {
  assertEqual(fig('net'), '$11.48M'); assert(near(EP.net, 11478009.2, 1e-6));
  assertEqual(fig('open'), '$8.86M'); assert(near(EP.open, 8856485.91, 1e-6));
  assertEqual(fig('late'), String(E['4.2_snap']));
  assertEqual(fig('reject'), `${((E['5.1'].rej / E['5.1'].insp) * 100).toFixed(2)}%`);
  assertEqual(fig('onhand'), '$2.63M'); assertEqual(E['7.1'], 2634675);
  assertEqual(fig('ss'), String(E['7.4'].length));
});

test('Charts', 'All seven charts are drawn', async () => {
  for (const k of ['map', 'pareto', 'ageing', 'gap', 'stock', 'suppliers', 'crit']) assert(chart(k), `${k} chart missing`);
});

test('Charts', 'Footprint: 22 countries placed; node sizes follow net active value; none left unplaced', async () => {
  const c = chart('map');
  assertEqual(c.data.datasets[0].data.length, 22);
  assertEqual(kpis.procurement.byCountry.items.length, 22);
  const o = overviewModel(model);
  assertEqual(o.unplaced, []);
  const italy = o.countries.find((x) => x.segment === 'Italy');
  assertEqual(italy.value, kpis.procurement.byCountry.items.find((x) => x.segment === 'Italy').netActiveValue);
  const r = c.data.datasets[0].data;
  const iI = o.countries.indexOf(italy);
  assertEqual(Math.max(...r.map((d) => d.r)), r[iI].r, 'largest node is the largest country');
  assert(text('[data-hud="map"]').includes('Italy $3.18M'), text('[data-hud="map"]'));
});

test('Charts', 'Pareto: 25 suppliers, largest first, cumulative ends at 100%', async () => {
  const c = chart('pareto');
  assertEqual(c.data.labels.length, 25);
  assertEqual(c.data.labels.slice(0, 5), EP.pareto.slice(0, 5).map((p) => p[0]));
  assert(near(c.data.datasets[0].data[24], 100, 1e-9));
});

test('Charts', 'Ageing: four bucket values from the engine; total equals overdue open value', async () => {
  const vals = chart('ageing').data.datasets[0].data;
  assertEqual(vals, kpis.procurement.ageing.items.map((i) => i.value));
  assert(near(vals.reduce((s, v) => s + v, 0), EP.overdue, 1e-6));
  assert(text('[data-hud="ageing"]').includes('31–90 days'));
});

test('Charts', 'Promise gap: 12 day values, 100 PO lines; 66 promised later', async () => {
  const vals = chart('gap').data.datasets[0].data;
  assertEqual(vals.length, 12);
  assertEqual(vals.reduce((s, v) => s + v, 0), 100);
  assert(text('[data-hud="gap"]').includes('66 of 100'));
});

test('Charts', 'Stock position: 5 below safety stock, 5 below reorder point only, 13 at or above (23 physical)', async () => {
  assertEqual(chart('stock').data.datasets[0].data, [E['7.4'].length, E['7.3'].length - E['7.4'].length, 23 - E['7.3'].length]);
  assertEqual(Object.values(EI.rows).filter((r) => !r.service).length, 23);
});

test('Charts', 'Largest-supplier OTD: top 8 by net active value; limited samples and no-event suppliers are labelled', async () => {
  const c = chart('suppliers');
  assertEqual(c.data.labels.length, 8);
  assertEqual(c.data.labels.map((l) => l.split(' ')[0]), EP.pareto.slice(0, 8).map((p) => p[0]));
  for (const [i, l] of c.data.labels.entries()) {
    const p = kpis.suppliers.profiles.items.find((x) => x.supplier_id === l.split(' ')[0]);
    if (!p.deliveredEventsSnapshot) assert(l.endsWith('(no events)'), l);
    else if (p.deliveredEventsSnapshot < 3) assert(l.endsWith(`(n=${p.deliveredEventsSnapshot})`), l);
    else assertEqual(l, p.supplier_id);
    assertEqual(c.data.datasets[0].data[i], p.otdSnapshotPct ?? 0);
  }
  assertEqual(c.options.plugins.referenceLines.lines[0].value, kpis.delivery.otdSnapshot.value);
});

test('Charts', 'Criticality: shares of net active and overdue value from the engine; Critical 52.6% / 61.1%', async () => {
  const c = chart('crit');
  assertEqual(c.data.labels, ['Critical', 'High', 'Medium', 'Low']);
  const crit = kpis.procurement.byCriticality.items;
  assertEqual(c.data.datasets[0].data, c.data.labels.map((l) => crit.find((x) => x.segment === l).sharePct));
  assertEqual(c.data.datasets[1].data, c.data.labels.map((l) => crit.find((x) => x.segment === l).overdueSharePct));
  assert(text('[data-hud="crit"]').includes('52.6%') && text('[data-hud="crit"]').includes('61.1%'));
});

test('Governance', 'No NaN, undefined or missing values; no HHI; PO value is not called spend', async () => {
  const t = doc.querySelector('main').textContent;
  assert(!/NaN|undefined|Not available/.test(t), 'bad value on page');
  assert(!/HHI|Herfindahl/i.test(t));
  assert(t.includes('PO line value, not spend'));
  assert(t.includes('approximate country centres, not supplier sites'));
});

test('Links', 'Every panel and ring links to an available module', async () => {
  const avail = new Set(MODULES.filter((m) => m.available).map((m) => `#/${m.id}`));
  const links = [...doc.querySelectorAll('.hud a[href^="#/"]')];
  assertEqual(links.length, 11);
  for (const a of links) assert(avail.has(a.getAttribute('href')), a.getAttribute('href'));
  doc.querySelector('[data-hud="ageing"] .hud-panel__link').click();
  assert(await waitFor(() => doc.querySelector('[data-table="register"]')), 'procurement not opened');
});

test('Theme', 'Dark theme applies to the Command centre only; other modules keep the approved light design', async () => {
  const bg = () => frame.contentWindow.getComputedStyle(doc.body).backgroundImage;
  assert(!bg().includes('gradient'), 'procurement page is dark');
  frame.contentWindow.location.hash = '#/overview';
  assert(await waitFor(() => doc.querySelector('[data-overview]') && chart('map')));
  assert(bg().includes('radial-gradient'), 'overview is not dark');
  frame.contentWindow.location.hash = '#/executive';
  assert(await waitFor(() => doc.querySelector('[data-card="otd"]')));
  assert(!bg().includes('gradient'), 'executive page stayed dark');
  frame.remove();
});

test('Mobile', '375px: no sideways overflow; rings in two columns; panel links at least 44px', async () => {
  const f = await openApp('#/overview', 375);
  const d = f.contentDocument;
  assert(await waitFor(() => d.querySelector('[data-overview]')));
  assertEqual(d.documentElement.scrollWidth - d.documentElement.clientWidth, 0);
  assertEqual(f.contentWindow.getComputedStyle(d.querySelector('.hud-panel--rings')).gridTemplateColumns.split(' ').length, 2);
  for (const a of d.querySelectorAll('.hud-panel__link')) assert(a.getBoundingClientRect().height >= 44, `${a.textContent} ${a.getBoundingClientRect().height}px`);
  f.remove();
});

/* ---------- Part B: altered inputs ---------- */

function render(loadResult) {
  const h = document.createElement('div');
  h.style.cssText = 'position:absolute;left:-20000px;width:1300px';
  document.body.appendChild(h);
  renderOverview(h, { config: CONFIG, load: loadResult, validation: runValidation(loadResult, { asOfDate: AS_OF }), kpis: computeAllKpis(rowsOf(loadResult), { asOfDate: AS_OF }) });
  return h;
}
function altered(name, where, set2) {
  const ds = lr.datasets[name];
  const rows = ds.rows.map((r) => { if (!where(r)) return r; const c = { ...r, ...set2 }; Object.defineProperty(c, '_line', { value: r._line, enumerable: false }); return c; });
  return { ...lr, datasets: { ...lr.datasets, [name]: { ...ds, rows } } };
}

test('Rules', 'Not hardcoded: lowering MAT-001 available stock changes the reorder ring and stock chart', async () => {
  const h = render(altered('inventory_snapshot', (r) => r.material_id === 'MAT-001', { allocated_qty: 69, available_qty: 10, available_inventory_value_usd: 28500 }));
  assert(h.querySelector('[data-ring="rop"]').textContent.includes('11/23'), h.querySelector('[data-ring="rop"]').textContent);
  assert(h.querySelector('[data-fig="ss"] .hud-fig__value').textContent === '6');
  h.remove();
});

test('Rules', 'Validation failure shows an alert and a failed status chip', async () => {
  const h = render(altered('purchase_orders', (r) => r.po_line_id === 'POL-00001', { received_qty: 16 }));
  assert(h.querySelector('[data-banner="validation-fail"][role="alert"]'));
  assert(h.querySelector('[data-status]').classList.contains('hud-status--fail'));
  h.remove();
});

test('Rules', 'Chart library unavailable: each chart is replaced by a text note; rings and figures remain', async () => {
  const saved = window.Chart;
  window.Chart = undefined;
  try {
    const h = render(lr);
    assertEqual(h.querySelectorAll('canvas').length, 0);
    assertEqual(h.querySelectorAll('.hud-fallback').length, 7);
    assertEqual(h.querySelectorAll('[data-ring]').length, 4);
    assertEqual(h.querySelector('[data-fig="net"] .hud-fig__value').textContent, '$11.48M');
    h.remove();
  } finally {
    window.Chart = saved;
  }
});

test('Rules', 'Data text is escaped', async () => {
  const h = render(altered('suppliers', (r) => r.supplier_id === 'SUP-007', { country: '<img src=x onerror="window.__xssO=1">' }));
  assert(!h.querySelector('img') && !window.__xssO);
  h.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => { document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Command centre tests`; });
