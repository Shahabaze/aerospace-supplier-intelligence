/**
 * Executive Dashboard tests (Stage 4).
 *
 * Part A loads the real application (../index.html) in hidden frames and inspects what it shows.
 * Part B renders the Executive Dashboard view directly with deliberately altered inputs to prove
 * graceful handling of validation failures, missing values and chart failures, and to prove the
 * figures come from the KPI engine rather than being hardcoded.
 *
 * Expected headline figures come from tests/kpi-expected-values.js (independent calculation).
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import { computeAllKpis } from '../src/js/kpis.js';
import { renderExecutive } from '../src/js/views/executive.js';
import { MODULES } from '../src/js/modules.js';
import { EXPECTED as E } from './kpi-expected-values.js';

const AS_OF = CONFIG.reportingAsOfDate;
const APP = '../index.html';

/* ---------- frame helpers ---------- */

function openApp(query = '', hash = '#/executive') {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:1280px;height:900px;position:absolute;left:-10000px;top:0';
    frame.src = `${APP}${query}${hash}`;
    const started = Date.now();
    frame.onload = () => {
      const poll = () => {
        const state = frame.contentDocument?.documentElement.dataset.appState;
        if (state === 'ready' || state === 'error') return resolve(frame);
        if (Date.now() - started > 15000) return reject(new Error(`app did not finish loading (state: ${state})`));
        setTimeout(poll, 50);
      };
      poll();
    };
    document.body.appendChild(frame);
  });
}

const waitFor = async (fn, ms = 3000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 30));
  }
  return false;
};

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

let frame; // main app frame
let doc; // its document
let engine; // KPI engine output computed independently in this test page
let lr; // load result

/* ======================================================================
 * Part A – the real application
 * ==================================================================== */

test('App', 'Application loads to the ready state with the Executive dashboard shown', async () => {
  lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  engine = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF });
  frame = await openApp();
  doc = frame.contentDocument;
  assertEqual(doc.documentElement.dataset.appState, 'ready');
  assertEqual(doc.querySelector('#page-title')?.textContent, 'Executive dashboard');
  assert(!doc.querySelector('[data-error]'), 'an error panel is shown');
});

test('Headline KPIs', 'Exactly six headline KPI cards, in the approved order', async () => {
  const labels = [...doc.querySelectorAll('.kpi-panel .kpi__label')].map((e) => e.textContent);
  assertEqual(labels, ['Delivery Event OTD', 'Late delivery events', 'Open PO commitment', 'Net active PO line value', 'Inspection rejection rate', 'On-hand inventory value']);
});

const HEADLINES = [
  ['otd', 'delivery.otdSnapshot', '39.7%', () => (E['4.1_snap'].num / E['4.1_snap'].den) * 100],
  ['late', 'delivery.lateSnapshot', '38', () => E['4.2_snap']],
  ['open-po', 'procurement.openCommitment', '$8.86M', () => E['6.2']],
  ['net-active', 'procurement.netActive', '$11.48M', () => E['6.1.2']],
  ['rejection', 'quality.rejectionRate', '0.17%', () => (E['5.1'].rej / E['5.1'].insp) * 100],
  ['inventory', 'inventory.onHandValue', '$2.63M', () => E['7.1']],
];

for (const [card, path, text, expected] of HEADLINES) {
  test('Headline KPIs', `${card}: shows ${text}, taken from engine result ${path}`, async () => {
    const el = doc.querySelector(`[data-card="${card}"] .kpi__value`);
    assert(el, 'value element missing');
    assertEqual(el.textContent, text, 'displayed text');
    assertEqual(el.dataset.kpiKey, path, 'engine path');
    const shown = Number(el.dataset.value);
    assertEqual(shown, getPath(engine, path).value, 'value equals KPI engine output');
    assert(Math.abs(shown - expected()) < 0.005, `value ${shown} differs from independent expected ${expected()}`);
  });
}

test('Headline KPIs', 'Every figure tagged on the page equals the KPI engine output (all fields)', async () => {
  const els = [...doc.querySelectorAll('[data-kpi-key]')].filter((e) => e.dataset.kpiKey);
  assert(els.length >= 30, `only ${els.length} tagged figures found`);
  const mismatches = [];
  for (const el of els) {
    const k = getPath(engine, el.dataset.kpiKey);
    const v = k?.[el.dataset.kpiField];
    const shown = el.dataset.value === '' ? null : Number(el.dataset.value);
    if (v !== shown) mismatches.push(`${el.dataset.kpiKey}.${el.dataset.kpiField}: page ${shown} vs engine ${v}`);
  }
  assertEqual(mismatches, []);
});

test('Headline KPIs', 'Delivery Event OTD shows both bases: 39.7% (25/63) snapshot and 38.4% (28/73) full dataset', async () => {
  const card = doc.querySelector('[data-card="otd"]');
  assert(card.textContent.includes('25 of 63 delivered events on time, delivered on or before 31 Oct 2026'), card.textContent);
  assert(card.textContent.includes('38.4% (28 of 73)'), 'full-dataset basis missing');
  assert(!/OTIF/.test(card.querySelector('.kpi__label').textContent), 'label must not say OTIF');
});

test('Headline KPIs', 'Net active card shows gross $12,550,378.20, cancelled −$1,072,369.00 and net $11,478,009.20', async () => {
  const t = doc.querySelector('[data-card="net-active"]').textContent;
  for (const s of ['$12,550,378.20', '−$1,072,369.00', '$11,478,009.20', 'Cancelled (17 lines)', 'not invoiced or paid spend']) assert(t.includes(s), `missing "${s}"`);
});

test('Headline KPIs', 'No "NaN", "undefined" or "null" appears anywhere on the page', async () => {
  const t = doc.querySelector('main').textContent;
  for (const bad of ['NaN', 'undefined', 'null', 'Infinity']) assert(!t.includes(bad), `"${bad}" found`);
});

test('Labels', 'Title block shows reporting period, as-of date, validation and document versions', async () => {
  const tb = (k) => doc.querySelector(`[data-tb="${k}"]`)?.textContent;
  assertEqual(tb('period'), '1 Nov 2025 – 31 Oct 2026');
  assertEqual(tb('asof'), '31 Oct 2026');
  assertEqual(tb('validation'), '17 of 17 controls passed');
  assertEqual(tb('source'), '6 CSV files, 339 records');
  const t = doc.querySelector('.title-block').textContent;
  assert(t.includes('Version 2.0') && t.includes(`Version ${CONFIG.documentVersions.kpiDictionary}`), 'document versions missing');
});

test('Labels', 'Synthetic-data statement is visible in header and footer', async () => {
  assertEqual(doc.querySelector('.synthetic-flag').textContent, 'Synthetic demonstration data');
  assert(doc.querySelector('.site-footer').textContent.includes('synthetic'), 'footer statement missing');
});

test('Labels', 'No supported figure is labelled as spend, OTIF or risk score', async () => {
  const labels = [...doc.querySelectorAll('.kpi__label, .panel > h3')].map((e) => e.textContent).join(' | ');
  assert(!/spend|OTIF|risk score/i.test(labels), labels);
});

test('Data quality', 'Validation banner reports all checks passed', async () => {
  const b = doc.querySelector('[data-banner="validation-pass"]');
  assert(b, 'pass banner missing');
  assert(b.textContent.includes('All 17 data model controls and 7 supplementary checks passed'), b.textContent);
  assertEqual(doc.querySelectorAll('[data-check][data-status="pass"]').length, 24);
});

test('Data quality', 'DEC-017 warning lists the 12 events outside the reporting period', async () => {
  const n = doc.querySelector('[data-notice="N01"]');
  assert(n, 'N01 missing');
  assertEqual(n.dataset.severity, 'warning');
  assert(n.querySelector('summary').textContent.includes('12 delivery events fall outside the reporting period'), n.querySelector('summary').textContent);
  const ids = [...n.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent).sort();
  assertEqual(ids, ['DEL-00078', 'DEL-00079', 'DEL-00080', 'DEL-00081', 'DEL-00082', 'DEL-00085', 'DEL-00086', 'DEL-00087', 'DEL-00088', 'DEL-00089', 'DEL-00090', 'DEL-00091']);
});

test('Data quality', 'DEC-018 warning explains the stock bases and lists MAT-010 and MAT-020', async () => {
  const n = doc.querySelector('[data-notice="N02"]');
  assert(n.textContent.includes('on-hand stock minus quantity already allocated'), 'basis explanation missing');
  assertEqual([...n.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent), ['MAT-010', 'MAT-020']);
});

test('Data quality', 'DEC-019 note about cancelled value is shown', async () => {
  assert(doc.querySelector('[data-notice="N03"]').textContent.includes('17 PO lines carry cancelled quantity'));
});

test('Unsupported', 'All eight unsupported KPIs are listed with reasons and no figures', async () => {
  const ids = [...doc.querySelectorAll('[data-unsupported]')].map((e) => e.dataset.unsupported);
  assertEqual(ids, ['4.5', '4.6', '5.6', '6.6', '7.8', '8.5', '8.6', '8.7']);
  for (const e of doc.querySelectorAll('[data-unsupported] dd')) assert(e.textContent.length > 15);
  assert(!doc.querySelector('.unsupported [data-kpi-key]'), 'unsupported section must not contain figures');
});

test('Supporting panels', 'Concentration panel shows 52.2% for the top two suppliers and a table summing to 100%', async () => {
  const p = doc.querySelector('[data-panel="concentration"]');
  assert(p.textContent.includes('SUP-007 and SUP-008 together hold 52.2%'), p.textContent.slice(0, 200));
  const shares = [...p.querySelectorAll('[data-table="concentration"] td.num')].map((td) => parseFloat(td.textContent));
  const total = shares.reduce((s, v) => s + v, 0);
  assert(Math.abs(total - 100) < 0.05, `table total ${total}`);
  assertEqual(shares.length, 9, 'top 8 plus "Other"');
});

test('Supporting panels', 'Concentration chart is drawn with the engine figures', async () => {
  const Chart = frame.contentWindow.Chart;
  const c = Chart.getChart(doc.getElementById('concentration-chart'));
  assert(c, 'chart not drawn');
  const data = c.data.datasets[0].data;
  assertEqual(data.slice(0, 3).map((v) => v.toFixed(2)), ['27.75', '24.42', '14.49']);
});

test('Supporting panels', 'Critical supplier count is 4 of 25 from the supplier master', async () => {
  const p = doc.querySelector('[data-panel="supplier-base"]');
  assert(p.textContent.includes('4of 25 suppliers classified critical') || p.textContent.replace(/\s+/g, ' ').includes('4 of 25 suppliers classified critical'), p.textContent);
});

test('Navigation', 'Navigation lists the five approved modules; four modules are available and the AI assistant is a planned page', async () => {
  const links = [...doc.querySelectorAll('#module-nav-list a')];
  assertEqual(links.map((a) => a.dataset.module), ['executive', 'suppliers', 'procurement', 'inventory', 'assistant']);
  assertEqual(MODULES.filter((m) => m.available).map((m) => m.id), ['executive', 'suppliers', 'procurement', 'inventory']);
  assertEqual(links[0].getAttribute('aria-current'), 'page');
  assertEqual(links.slice(1).map((a) => a.querySelector('.stage')?.textContent ?? null), [null, null, null, 'Future phase']);
});

for (const id of ['assistant']) {
  test('Navigation', `Clicking "${id}" shows a planned-module page with no figures`, async () => {
    doc.querySelector(`#module-nav-list a[data-module="${id}"]`).click();
    assert(await waitFor(() => doc.querySelector(`[data-placeholder="${id}"]`)), 'placeholder not shown');
    const main = doc.querySelector('main');
    assert(main.textContent.includes('This module is not built yet'), 'not-built statement missing');
    assertEqual(main.querySelectorAll('[data-kpi-key], canvas, .kpi').length, 0, 'figures shown on a planned page');
    assertEqual(doc.querySelector(`#module-nav-list a[data-module="${id}"]`).getAttribute('aria-current'), 'page');
    assertEqual(doc.activeElement?.id, 'page-title', 'focus moves to the page heading');
  });
}

test('Navigation', 'AI assistant page states no AI service or API key is used', async () => {
  frame.contentWindow.location.hash = '#/assistant';
  assert(await waitFor(() => doc.querySelector('[data-placeholder="assistant"]')));
  assert(doc.querySelector('main').textContent.includes('No AI service or API key is used in this website'));
});

test('Navigation', 'Returning to the Executive dashboard redraws it with the same figures', async () => {
  doc.querySelector('#module-nav-list a[data-module="executive"]').click();
  assert(await waitFor(() => doc.querySelector('[data-card="otd"] .kpi__value')));
  assertEqual(doc.querySelector('[data-card="otd"] .kpi__value').textContent, '39.7%');
  assert(frame.contentWindow.Chart.getChart(doc.getElementById('concentration-chart')), 'chart not redrawn');
});

test('Navigation', 'An unknown address falls back to the Executive dashboard', async () => {
  frame.contentWindow.location.hash = '#/does-not-exist';
  assert(await waitFor(() => doc.querySelector('#module-nav-list a[data-module="executive"]')?.getAttribute('aria-current') === 'page'));
  assert(doc.querySelector('[data-card="otd"]'));
});

test('Security', 'The page makes no requests outside its own site', async () => {
  const origin = frame.contentWindow.location.origin;
  const external = frame.contentWindow.performance.getEntriesByType('resource').map((r) => r.name).filter((u) => !u.startsWith(origin) && !u.startsWith('data:'));
  assertEqual(external, []);
});

test('Security', 'Application source contains no API keys or AI service calls', async () => {
  const files = ['index.html', 'src/js/app.js', 'src/js/config.js', 'src/js/kpis.js', 'src/js/validation.js', 'src/js/data-loader.js', 'src/js/schema.js', 'src/js/views/executive.js', 'src/js/views/placeholder.js', 'src/js/modules.js', 'src/js/charts.js', 'src/js/format.js'];
  const pattern = /(api[_-]?key|apikey|secret|bearer\s|sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|generativelanguage|openai\.com|anthropic\.com\/v1)/i;
  for (const f of files) {
    const text = await (await fetch(`../${f}`, { cache: 'no-store' })).text();
    const m = text.match(pattern);
    assert(!m, `${f} contains "${m?.[0]}"`);
  }
});

/* ---------- loading failure ---------- */

test('Failure handling', 'Missing data files: an error page lists the six files and shows no figures', async () => {
  const f = await openApp('?data=tests/no-such-folder/');
  const d = f.contentDocument;
  assertEqual(d.documentElement.dataset.appState, 'error');
  const err = d.querySelector('[data-error]');
  assert(err, 'error panel missing');
  assertEqual(err.getAttribute('role'), 'alert');
  assertEqual(err.querySelectorAll('li').length, 6);
  assert(err.textContent.includes('suppliers.csv') && err.textContent.includes('HTTP 404'), err.textContent);
  assert(err.textContent.includes('No figures are shown'), 'missing explanation');
  assertEqual(d.querySelectorAll('[data-kpi-key], .kpi').length, 0);
  f.remove();
});

test('Failure handling', 'Unsafe data-path overrides are ignored', async () => {
  const f = await openApp('?data=https://example.com/');
  assertEqual(f.contentDocument.documentElement.dataset.appState, 'ready', 'should fall back to the normal data folder');
  f.remove();
});

/* ======================================================================
 * Part B – the view rendered with altered inputs
 * ==================================================================== */

function render(model) {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-10000px;width:1200px';
  document.body.appendChild(host);
  renderExecutive(host, model);
  return host;
}

function baseModel(loadResult = lr) {
  return {
    config: CONFIG,
    load: loadResult,
    validation: runValidation(loadResult, { asOfDate: AS_OF }),
    kpis: computeAllKpis(rowsOf(loadResult), { asOfDate: AS_OF }),
  };
}

function alteredLoad(name, where, set) {
  const ds = lr.datasets[name];
  const rows = ds.rows.map((r) => {
    if (!where(r)) return r;
    const c = { ...r, ...set };
    Object.defineProperty(c, '_line', { value: r._line, enumerable: false });
    return c;
  });
  return { ...lr, datasets: { ...lr.datasets, [name]: { ...ds, rows } } };
}

test('Failure handling', 'Validation failure: red alert banner, checks expanded, title block marked failed', async () => {
  const host = render(baseModel(alteredLoad('purchase_orders', (r) => r.po_line_id === 'POL-00001', { received_qty: 16 })));
  const b = host.querySelector('[data-banner="validation-fail"]');
  assert(b, 'fail banner missing');
  assertEqual(b.getAttribute('role'), 'alert');
  assert(b.textContent.includes('C06') && b.textContent.includes('diagnosis only'), b.textContent);
  assert(host.querySelector('[data-notice="checks"]').open, 'checks list should be expanded');
  assert(host.querySelector('[data-check="C06"][data-status="fail"]'), 'C06 row not marked failed');
  assert(host.querySelector('[data-tb="validation"]').classList.contains('tb-value--fail'));
  host.remove();
});

test('Failure handling', 'A KPI that cannot be calculated shows "Not available" with the reason, not 0', async () => {
  const model = baseModel();
  model.kpis = structuredClone(model.kpis);
  model.kpis.delivery.otdSnapshot.value = null;
  model.kpis.delivery.otdSnapshot.reason = 'No delivered events on this basis';
  const host = render(model);
  const v = host.querySelector('[data-card="otd"] .kpi__value');
  assertEqual(v.textContent, 'Not available');
  assert(v.classList.contains('kpi__value--na'));
  assert(host.querySelector('[data-card="otd"]').textContent.includes('No delivered events on this basis'));
  host.remove();
});

test('Failure handling', 'Chart library unavailable: a text fallback is shown and the table remains', async () => {
  const saved = window.Chart;
  window.Chart = undefined;
  try {
    const host = render(baseModel());
    assert(host.querySelector('[data-chart-fallback]'), 'fallback message missing');
    assertEqual(host.querySelectorAll('[data-table="concentration"] tbody tr').length, 9);
    host.remove();
  } finally {
    window.Chart = saved;
  }
});

test('Not hardcoded', 'Changing the source data changes the displayed figures', async () => {
  // Cancel a whole open PO line in an in-memory copy; net active and open commitment must fall.
  const line = rowsOf(lr).purchase_orders.find((r) => r.po_line_id === 'POL-00001');
  const altered = alteredLoad('purchase_orders', (r) => r.po_line_id === 'POL-00001', { cancelled_qty: line.ordered_qty - line.received_qty, open_qty: 0 });
  const host = render(baseModel(altered));
  const net = Number(host.querySelector('[data-card="net-active"] .kpi__value').dataset.value);
  const open = Number(host.querySelector('[data-card="open-po"] .kpi__value').dataset.value);
  const removed = line.open_qty * line.unit_price_usd;
  assert(Math.abs(net - (E['6.1.2'] - removed)) < 0.01, `net ${net}`);
  assert(Math.abs(open - (E['6.2'] - removed)) < 0.01, `open ${open}`);
  host.remove();
});

test('Not hardcoded', 'Moving the as-of date changes the snapshot OTD on screen', async () => {
  const model = baseModel();
  model.kpis = computeAllKpis(rowsOf(lr), { asOfDate: '2027-12-31' });
  const host = render(model);
  assertEqual(host.querySelector('[data-card="otd"] .kpi__value').textContent, '38.4%');
  host.remove();
});

test('Not hardcoded', 'Text from the data is escaped (no HTML injection)', async () => {
  const altered = alteredLoad('suppliers', (r) => r.supplier_id === 'SUP-007', { supplier_name: '<img src=x onerror="window.__xss=1">' });
  const host = render(baseModel(altered));
  assert(!host.querySelector('img'), 'markup from data was rendered');
  assert(!window.__xss);
  host.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => {
  document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Dashboard tests`;
});
