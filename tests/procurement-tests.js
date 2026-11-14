/**
 * Procurement Intelligence tests (Stage 6, KPI Dictionary v2.3).
 *
 * Part A drives the real application (../index.html#/procurement) in a hidden frame.
 * Part B renders the view directly with altered inputs.
 * Expected values: tests/kpi-expected-values.js (independent calculation).
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import { computeAllKpis } from '../src/js/kpis.js';
import { renderProcurement, resetProcurementViewState } from '../src/js/views/procurement.js';
import { usd } from '../src/js/format.js';
import { EXPECTED_PROCUREMENT as EP } from './kpi-expected-values.js';

const AS_OF = CONFIG.reportingAsOfDate;
const CENT = 0.005;

function openApp(hash) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:1366px;height:900px;position:absolute;left:-10000px;top:0';
    frame.src = `../index.html${hash}`;
    const t0 = Date.now();
    frame.onload = () => {
      const poll = () => {
        const st = frame.contentDocument?.documentElement.dataset.appState;
        if (st === 'ready' || st === 'error') return resolve(frame);
        if (Date.now() - t0 > 15000) return reject(new Error(`app not ready (${st})`));
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

let frame, doc, lr, engine, P;
const text = (sel) => doc.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim();
const near = (a, b, tol = CENT) => Math.abs(a - b) <= tol;
const supRows = () => [...doc.querySelectorAll('[data-table="suppliers"] tbody tr')].map((r) => r.dataset.supplier);
const regRows = () => [...doc.querySelectorAll('[data-table="register"] tbody tr')];
const set = (sel, value) => {
  const el = doc.querySelector(sel);
  if (el.type === 'checkbox') el.checked = value; else el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const typeIn = (sel, value) => {
  const el = doc.querySelector(sel);
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const sortBy = (table, key) => doc.querySelector(`[data-sort-table="${table}"][data-sort="${key}"]`).click();

/* ======================================================================
 * Part A – real application
 * ==================================================================== */

test('Load', 'Procurement intelligence opens from the navigation with all data loaded', async () => {
  lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  engine = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF, minSample: CONFIG.minimumSampleForRate });
  P = engine.procurement;
  frame = await openApp('#/executive');
  doc = frame.contentDocument;
  doc.querySelector('#module-nav-list a[data-module="procurement"]').click();
  assert(await waitFor(() => doc.querySelector('[data-panel="bridge"]')), 'procurement page not shown');
  assertEqual(doc.querySelector('#page-title').textContent, 'Procurement intelligence');
  assertEqual(doc.querySelector('#module-nav-list a[data-module="procurement"]').getAttribute('aria-current'), 'page');
  assert(!doc.querySelector('[data-placeholder]'));
});

test('Load', 'Title block: 100 PO lines, 63 open; overdue measured at 31 Oct 2026; KPI Dictionary 2.3', async () => {
  assertEqual(text('[data-tb="lines"]'), '100, 63 with open quantity');
  assertEqual(text('[data-tb="asof"]'), '31 Oct 2026');
  assert(text('.title-block').includes('Version 2.3'));
});

test('Load', 'Caution banner: out-of-period receipts and current promise dates only', async () => {
  const t = text('[data-banner="period"]');
  assert(t.includes('include deliveries dated after 31 Oct 2026') && t.includes('original promises and revisions are not held'), t);
});

test('Bridge', 'All seven bridge figures equal the engine and the independent values', async () => {
  const exp = { gross: EP.gross, cancelled: EP.cancelled, netActive: EP.net, received: EP.received, open: EP.open, overdue: EP.overdue, notYetDue: EP.not_yet_due };
  for (const [k, v] of Object.entries(exp)) {
    const el = doc.querySelector(`[data-bridge="${k}"] [data-kpi-field="${k}"]`);
    assertEqual(Number(el.dataset.value), P.bridge[k], `${k} engine`);
    assert(near(Number(el.dataset.value), v), `${k}: ${el.dataset.value} vs ${v}`);
  }
  assertEqual(text('[data-bridge="netActive"] .bridge__value'), '$11,478,009.20');
  assertEqual(text('[data-bridge="cancelled"] .bridge__value'), '−$1,072,369.00');
});

test('Bridge', 'All three reconciliation lines show "Reconciles"', async () => {
  const lines = [...doc.querySelectorAll('.bridge__checks li')];
  assertEqual(lines.map((l) => l.dataset.check), ['gross-cancelled-net', 'net-received-open', 'open-overdue-notdue']);
  assert(lines.every((l) => l.classList.contains('status-pass') && l.textContent.startsWith('Reconciles')));
  assert(!doc.querySelector('[data-banner="bridge-fail"]'));
});

test('Headline', 'Overdue open value $6.90M (77.9% of open), not yet due $1,958,039.45', async () => {
  assertEqual(text('[data-card="overdue-value"] .kpi__value'), '$6.90M');
  assert(text('[data-card="overdue-value"]').includes('77.9% of $8,856,485.91'));
  assertEqual(Number(doc.querySelector('[data-card="overdue-value"] [data-kpi-field="notYetDueValue"]').dataset.value), P.overdueOpen.notYetDueValue);
});

test('Headline', 'Overdue lines 51 of 63; 28 with nothing received; oldest 327 days (POL-00003)', async () => {
  assertEqual(text('[data-card="overdue-lines"] .kpi__value'), '51');
  assert(text('[data-card="overdue-lines"]').includes('of 63 PO lines'));
  assertEqual(text('[data-card="overdue-lines"] [data-kpi-field="overdueNoReceipt"]'), '28');
  assertEqual(text('[data-card="oldest"] .kpi__value'), '327 days');
  assert(text('[data-card="oldest"]').includes('POL-00003, SUP-003'));
});

test('Headline', 'KPI 6.5 is labelled "Average gross PO line value" and shows $125.5K', async () => {
  assertEqual(text('[data-card="avg-line"] .kpi__label'), 'Average gross PO line value');
  assertEqual(text('[data-card="avg-line"] .kpi__value'), '$125.5K');
  assert(near(Number(doc.querySelector('[data-card="avg-line"] .kpi__value').dataset.value), EP.avg_gross_line));
});

test('Ageing', 'Ageing table: inclusive ranges, line counts and values match; totals 51 and $6,898,446.46', async () => {
  const rows = [...doc.querySelectorAll('[data-table="ageing"] tbody tr')];
  assertEqual(rows.map((r) => r.dataset.bucket), ['1-30', '31-90', '91-180', '181+']);
  assertEqual(rows.map((r) => r.children[1].textContent), ['1 to 30', '31 to 90', '91 to 180', '181 or more']);
  for (const r of rows) {
    const e = EP.buckets[r.dataset.bucket];
    assertEqual(r.children[2].textContent, String(e.lines), r.dataset.bucket);
    assertEqual(r.children[3].textContent, usd(e.value), r.dataset.bucket);
  }
  const foot = [...doc.querySelectorAll('[data-table="ageing"] tfoot td')].map((c) => c.textContent);
  assertEqual([foot[1], foot[2]], ['51', '$6,898,446.46']);
});

test('Ageing', 'Ageing chart plots the four bucket values from the engine', async () => {
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('ageing-chart'));
  assertEqual(c.data.datasets[0].data, P.ageing.items.map((i) => i.value));
  assert(text('[data-insight="ageing"]').includes('over 180 days (25 of 51)') && text('[data-insight="ageing"]').includes('31–90 days ($2,923,291.80'), text('[data-insight="ageing"]'));
});

test('Concentration', 'Pareto: 25 suppliers, largest first, cumulative ends at 100%; "5 of 25 suppliers hold 80.3%"', async () => {
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('pareto-chart'));
  assertEqual(c.data.labels.slice(0, 5), EP.pareto.slice(0, 5).map((p) => p[0]));
  assertEqual(c.data.labels.length, 25);
  assert(near(c.data.datasets[1].data[24], 100, 1e-9));
  assertEqual(text('[data-insight="pareto"]'), '5 of 25 suppliers');
  assert(text('[data-panel="pareto"]').includes('80.3% of net active PO line value'));
  assert(!/HHI|Herfindahl/i.test(doc.querySelector('main').textContent), 'no HHI (DEC-028)');
});

test('Segments', 'Material category is the default grouping: 21 categories, totals reconcile', async () => {
  const rows = [...doc.querySelectorAll('[data-table="segments"] tbody tr')];
  assertEqual(rows.length, Object.keys(EP.seg_category).length);
  assertEqual(rows[0].dataset.segment, 'Landing Gear Components');
});

test('Segments', 'Grouping by supplier criticality: Critical carries 61.1% of overdue open value', async () => {
  set('input[name="segment"][value="criticality"]', 'criticality');
  doc.querySelector('input[name="segment"][value="criticality"]').checked = true;
  doc.querySelector('input[name="segment"][value="criticality"]').dispatchEvent(new Event('change', { bubbles: true }));
  assertEqual([...doc.querySelectorAll('[data-table="segments"] tbody tr')].map((r) => r.dataset.segment), ['Critical', 'High', 'Medium', 'Low']);
  assertEqual(text('[data-insight="critical-overdue"]'), '61.1%');
});

test('Segments', 'Grouping by tier and by country shows 2 and 22 groups', async () => {
  for (const [v, n] of [['supplier_tier', 2], ['country', 22]]) {
    const el = doc.querySelector(`input[name="segment"][value="${v}"]`);
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    assertEqual(doc.querySelectorAll('[data-table="segments"] tbody tr').length, n, v);
  }
  const el = doc.querySelector('input[name="segment"][value="material_category"]');
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
});

test('Supplier commitment', 'Default order: net active value, descending (DEC-032)', async () => {
  assertEqual(supRows(), EP.pareto.map((p) => p[0]));
  assertEqual(doc.querySelector('[data-sort-table="suppliers"][data-sort="net"]').closest('th').getAttribute('aria-sort'), 'descending');
});

test('Supplier commitment', 'Gross and net active values side by side equal the engine for every supplier', async () => {
  const head = [...doc.querySelectorAll('[data-table="suppliers"] thead th')].map((t) => t.textContent.replace(/[▲▼]/g, ''));
  assertEqual(head.slice(3, 6), ['Gross PO value', 'Cancelled', 'Net active PO value']);
  const bad = [];
  for (const r of P.supplierRows.items) {
    const tr = doc.querySelector(`[data-table="suppliers"] tr[data-supplier="${r.supplier_id}"]`);
    if (tr.querySelector('[data-col="gross"] .figure').title !== usd(r.grossValue)) bad.push(`${r.supplier_id} gross`);
    if (tr.querySelector('[data-col="net"] .figure').title !== usd(r.netActiveValue)) bad.push(`${r.supplier_id} net`);
    if (!near(r.netActiveValue, EP.suppliers[r.supplier_id].net) || !near(r.grossValue, EP.suppliers[r.supplier_id].gross)) bad.push(`${r.supplier_id} independent`);
  }
  assertEqual(bad, []);
});

test('Supplier commitment', 'Sorting by gross, then by oldest overdue (blanks last), then reset restores net descending', async () => {
  sortBy('suppliers', 'gross');
  const gross = supRows().map((id) => EP.suppliers[id].gross);
  assert(gross.every((v, i) => i === 0 || gross[i - 1] >= v), 'gross not descending');
  sortBy('suppliers', 'oldest');
  sortBy('suppliers', 'oldest');
  const oldest = supRows().map((id) => EP.suppliers[id].oldest);
  const firstNull = oldest.indexOf(null);
  if (firstNull >= 0) assert(oldest.slice(firstNull).every((v) => v === null), 'blanks not last');
  doc.querySelector('[data-action="reset-suppliers"]').click();
  assertEqual(supRows(), EP.pareto.map((p) => p[0]));
});

test('Supplier commitment', 'Filters: Critical → 4 suppliers; "No overdue lines" → suppliers with none; search by name', async () => {
  set('select[data-sfilter="criticality"]', 'Critical');
  assertEqual(supRows().sort(), ['SUP-001', 'SUP-002', 'SUP-007', 'SUP-012']);
  doc.querySelector('[data-action="reset-suppliers"]').click();
  set('select[data-sfilter="overdue"]', 'no');
  assertEqual(supRows().sort(), Object.entries(EP.suppliers).filter(([, e]) => e.overdue_lines === 0).map(([k]) => k).sort());
  doc.querySelector('[data-action="reset-suppliers"]').click();
  typeIn('input[data-sfilter="search"]', 'helios');
  assertEqual(supRows(), ['SUP-007']);
  assertEqual(doc.activeElement?.dataset.sfilter, 'search');
  doc.querySelector('[data-action="reset-suppliers"]').click();
});

test('Supplier commitment', 'Supplier link opens the Stage 5 supplier detail', async () => {
  const a = doc.querySelector('[data-table="suppliers"] [data-supplier-link="SUP-008"]');
  assertEqual(a.getAttribute('href'), '#/suppliers/SUP-008');
  a.click();
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-008"]')), 'supplier detail not opened');
  frame.contentWindow.location.hash = '#/procurement';
  assert(await waitFor(() => doc.querySelector('[data-panel="bridge"]')));
});

test('Register', 'Default: all 63 open lines, most overdue first', async () => {
  assertEqual(regRows().length, 63);
  assertEqual(regRows().slice(0, 5).map((r) => r.dataset.line), EP.register_first5.map((x) => x[0]));
  assertEqual(doc.querySelector('[data-sort-table="register"][data-sort="days"]').closest('th').getAttribute('aria-sort'), 'descending');
  assert(text('[data-count="register"]').includes('$8,856,485.91'), text('[data-count="register"]'));
});

test('Register', 'Every row\'s bucket tag is consistent with its days past promise (boundaries inclusive)', async () => {
  const bad = [];
  for (const r of P.register.items) {
    const tr = doc.querySelector(`[data-table="register"] tr[data-line="${r.po_line_id}"]`);
    const d = r.daysPastPromised;
    const exp = d < 1 ? 'not-due' : d <= 30 ? '1-30' : d <= 90 ? '31-90' : d <= 180 ? '91-180' : '181+';
    if (tr.dataset.bucket !== exp) bad.push(`${r.po_line_id}: ${d} days in ${tr.dataset.bucket}`);
  }
  assertEqual(bad, []);
});

test('Register', 'Due-status filter: 51 overdue, 12 not yet due', async () => {
  set('select[data-rfilter="due"]', 'overdue');
  assertEqual(regRows().length, 51);
  set('select[data-rfilter="due"]', 'not-due');
  assertEqual(regRows().length, 12);
  assert(regRows().every((r) => r.dataset.bucket === 'not-due'));
  doc.querySelector('[data-action="reset-register"]').click();
});

test('Register', 'Ageing filter: each bucket returns its count; choosing a bucket switches to overdue lines', async () => {
  for (const [b, e] of Object.entries(EP.buckets)) {
    set('select[data-rfilter="bucket"]', b);
    assertEqual(regRows().length, e.lines, b);
    assertEqual(doc.querySelector('select[data-rfilter="due"]').value, 'overdue');
  }
  doc.querySelector('[data-action="reset-register"]').click();
});

test('Register', '"Nothing received yet" with overdue shows the 28 lines; supplier, category and search filters work', async () => {
  set('select[data-rfilter="due"]', 'overdue');
  set('input[data-rfilter="noReceipt"]', true);
  assertEqual(regRows().length, EP.overdue_no_receipt);
  doc.querySelector('[data-action="reset-register"]').click();
  set('select[data-rfilter="supplier"]', 'SUP-007');
  assertEqual(regRows().map((r) => r.dataset.line).sort(), P.register.items.filter((i) => i.supplier_id === 'SUP-007').map((i) => i.po_line_id).sort());
  doc.querySelector('[data-action="reset-register"]').click();
  set('select[data-rfilter="category"]', 'Landing Gear Components');
  assertEqual(regRows().length, P.register.items.filter((i) => i.material_category === 'Landing Gear Components').length);
  doc.querySelector('[data-action="reset-register"]').click();
  typeIn('input[data-rfilter="search"]', 'POL-00003');
  assertEqual(regRows().map((r) => r.dataset.line), ['POL-00003']);
  doc.querySelector('[data-action="reset-register"]').click();
});

test('Register', 'Sort by open value descending; no matches shows a message and reset restores 63 rows', async () => {
  sortBy('register', 'value');
  const vals = regRows().map((r) => P.register.items.find((i) => i.po_line_id === r.dataset.line).openValue);
  assert(vals.every((v, i) => i === 0 || vals[i - 1] >= v), 'not descending by value');
  set('select[data-rfilter="due"]', 'not-due');
  set('select[data-rfilter="supplier"]', 'SUP-001');
  assert(doc.querySelector('[data-empty="register"]'), 'empty message missing');
  doc.querySelector('[data-empty="register"] [data-action="reset-register"]').click();
  assertEqual(regRows().length, 63);
  assertEqual(regRows()[0].dataset.line, 'POL-00003', 'reset restores most-overdue-first order');
});

test('Promise gap', 'Gap section: 66 later, 5 same, 29 earlier; average +2.5 days; current-promise limitation stated', async () => {
  const t = text('[data-insight="gap"]');
  assert(t.startsWith('66 of 100 PO lines carry a promised date later than the requested date, 5 match it and 29 are earlier. Average gap +2.5 days; range −3 days to +8 days.'), t);
  assert(text('section[aria-labelledby="gap-title"]').includes('does not show original promises, how often promises changed'));
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('gap-chart'));
  assertEqual(c.data.datasets[0].data.reduce((s, v) => s + v, 0), 100);
});

test('Governance', 'Unsupported items listed without figures; no "invoiced spend" figure claimed', async () => {
  const items = [...doc.querySelectorAll('section[aria-labelledby="pns-title"] [data-unsupported]')];
  assertEqual(items.length, 5);
  assert(!doc.querySelector('section[aria-labelledby="pns-title"] [data-kpi-key], section[aria-labelledby="pns-title"] .figure'));
  const labels = [...doc.querySelectorAll('.kpi__label, .bridge__label, th')].map((e) => e.textContent).join(' | ');
  assert(!/spend|invoic/i.test(labels), 'a figure is labelled as spend');
});

test('Governance', 'No "NaN", "undefined", "null" or "Infinity" on the page; no AI wording', async () => {
  const t = doc.querySelector('main').textContent;
  for (const bad of ['NaN', 'undefined', 'null', 'Infinity']) assert(!t.includes(bad), bad);
});

test('Navigation', 'Supplier performance still works after visiting procurement (no event cross-talk)', async () => {
  frame.contentWindow.location.hash = '#/suppliers';
  assert(await waitFor(() => doc.querySelector('[data-table="compare"]')));
  doc.querySelector('[data-sort="otd"]').click();
  assertEqual(doc.querySelector('[data-sort="otd"]').closest('th').getAttribute('aria-sort'), 'ascending');
  frame.contentWindow.location.hash = '#/procurement';
  assert(await waitFor(() => doc.querySelector('[data-panel="bridge"]')));
  assertEqual(doc.querySelector('[data-sort-table="register"][data-sort="days"]').closest('th').getAttribute('aria-sort'), 'descending');
});

/* ======================================================================
 * Part B – view rendered with altered inputs
 * ==================================================================== */

function modelFrom(loadResult, asOfDate = AS_OF) {
  return {
    config: { ...CONFIG, reportingAsOfDate: asOfDate },
    load: loadResult,
    validation: runValidation(loadResult, { asOfDate }),
    kpis: computeAllKpis(rowsOf(loadResult), { asOfDate, minSample: CONFIG.minimumSampleForRate }),
  };
}
function altered(name, where, set2) {
  const ds = lr.datasets[name];
  const rows = ds.rows.map((r) => {
    if (!where(r)) return r;
    const c = { ...r, ...set2 };
    Object.defineProperty(c, '_line', { value: r._line, enumerable: false });
    return c;
  });
  return { ...lr, datasets: { ...lr.datasets, [name]: { ...ds, rows } } };
}
function renderInto(model) {
  resetProcurementViewState();
  const h = document.createElement('div');
  h.style.cssText = 'position:absolute;left:-10000px;width:1300px';
  document.body.appendChild(h);
  renderProcurement(h, model);
  return h;
}

test('Rules', 'Moving the as-of date to 31 Dec 2026 re-ages every line (not hardcoded)', async () => {
  const h = renderInto(modelFrom(lr, '2026-12-31'));
  const k = computeAllKpis(rowsOf(lr), { asOfDate: '2026-12-31' }).procurement;
  const rows = [...h.querySelectorAll('[data-table="ageing"] tbody tr')].map((r) => Number(r.children[2].textContent));
  assertEqual(rows, k.ageing.items.map((i) => i.lines));
  assert(rows.reduce((s, v) => s + v, 0) > 51, 'more lines should be overdue at a later date');
  assertEqual(h.querySelector('[data-tb="asof"]').textContent, '31 Dec 2026');
  h.remove();
});

test('Rules', 'Fully cancelling an open line removes it from the register and lowers open value', async () => {
  const line = rowsOf(lr).purchase_orders.find((r) => r.po_line_id === 'POL-00083');
  const h = renderInto(modelFrom(altered('purchase_orders', (r) => r.po_line_id === 'POL-00083', { cancelled_qty: line.ordered_qty, open_qty: 0 })));
  assert(!h.querySelector('[data-table="register"] tr[data-line="POL-00083"]'), 'cancelled line still listed');
  assertEqual(h.querySelectorAll('[data-table="register"] tbody tr').length, 62);
  assert(near(Number(h.querySelector('[data-bridge="notYetDue"] [data-kpi-field="notYetDue"]').dataset.value), EP.not_yet_due - line.open_qty * line.unit_price_usd));
  assert(h.querySelectorAll('.bridge__checks .status-pass').length === 3, 'bridge must still reconcile');
  h.remove();
});

test('Rules', 'A bridge that does not reconcile shows an alert', async () => {
  const m = modelFrom(lr);
  m.kpis = structuredClone(m.kpis);
  m.kpis.procurement.bridge.reconciles = false;
  m.kpis.procurement.bridge.checks[1] = { ...m.kpis.procurement.bridge.checks[1], reconciles: false, difference: 10 };
  const h = renderInto(m);
  assert(h.querySelector('[data-banner="bridge-fail"][role="alert"]'));
  assert(h.querySelector('[data-check="net-received-open"].status-fail'));
  h.remove();
});

test('Rules', 'Validation failure shows an alert; data text is escaped', async () => {
  let h = renderInto(modelFrom(altered('purchase_orders', (r) => r.po_line_id === 'POL-00001', { received_qty: 16 })));
  assert(h.querySelector('[data-banner="validation-fail"][role="alert"]'));
  h.remove();
  h = renderInto(modelFrom(altered('materials', (r) => r.material_id === 'MAT-003', { material_description: '<img src=x onerror="window.__xss3=1">' })));
  assert(!h.querySelector('img') && !window.__xss3);
  h.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => {
  document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Procurement intelligence tests`;
});
