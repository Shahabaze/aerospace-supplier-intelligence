/**
 * Inventory Intelligence tests (Stage 7).
 * Part A drives the real application (../index.html#/inventory); Part B renders the view with
 * altered inputs. Expected values: tests/kpi-expected-values.js (independent calculation).
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import { computeAllKpis } from '../src/js/kpis.js';
import { renderInventory, resetInventoryViewState } from '../src/js/views/inventory.js';
import { usd } from '../src/js/format.js';
import { EXPECTED_INVENTORY as EI } from './kpi-expected-values.js';

const AS_OF = CONFIG.reportingAsOfDate;
const near = (a, b, t = 0.005) => Math.abs(a - b) <= t;

function openApp(hash, width = 1366) {
  return new Promise((resolve, reject) => {
    const f = document.createElement('iframe');
    f.style.cssText = `width:${width}px;height:900px;position:absolute;left:-10000px;top:0`;
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

let frame, doc, lr, inv;
const text = (sel) => doc.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim();
const ids = () => [...doc.querySelectorAll('[data-table="inventory"] tbody tr')].map((r) => r.dataset.material);
const set = (sel, v) => { const el = doc.querySelector(sel); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
const reset = () => doc.querySelector('.controls [data-action="reset-inventory"]').click();
const physical = Object.entries(EI.rows).filter(([, r]) => !r.service);

test('Load', 'Inventory intelligence opens from the navigation with all data loaded', async () => {
  lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  inv = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF }).inventory;
  frame = await openApp('#/executive');
  doc = frame.contentDocument;
  doc.querySelector('#module-nav-list a[data-module="inventory"]').click();
  assert(await waitFor(() => doc.querySelector('[data-table="inventory"]')), 'inventory page not shown');
  assertEqual(doc.querySelector('#page-title').textContent, 'Inventory intelligence');
  assertEqual(doc.querySelector('#module-nav-list a[data-module="inventory"]').getAttribute('aria-current'), 'page');
});

test('Load', 'Title block: snapshot 31 Oct 2026; 23 physical, 2 SERVICE excluded; no trend data', async () => {
  assertEqual(text('[data-tb="snapshot"]'), '31 Oct 2026');
  assertEqual(text('[data-tb="materials"]'), '23 physical, 2 SERVICE excluded');
  assert(text('.title-block').includes('None (one snapshot)'));
});

test('Snapshot warning', 'Single-snapshot limitations are stated', async () => {
  const t = text('[data-banner="snapshot"]');
  for (const s of ['Single inventory snapshot (31 Oct 2026)', 'do not show trends', 'KPI 7.8 not supported', 'not a forecast', 'Excess status is used as supplied']) assert(t.includes(s), `missing "${s}"`);
});

test('KPIs', 'Six inventory KPIs equal the engine and the independent values', async () => {
  const exp = { 'inventory.onHandValue': EI.oh, 'inventory.availableValue': EI.av, 'inventory.belowReorderPoint': EI.below_rop.length, 'inventory.safetyStockBreaches': EI.below_ss.length, 'inventory.daysOfSupply': EI.dos_avg, 'inventory.excessValue': EI.excess };
  for (const [k, v] of Object.entries(exp)) {
    const el = doc.querySelector(`.kpi-panel [data-kpi-key="${k}"]`);
    const [g, n] = k.split('.');
    assertEqual(Number(el.dataset.value), inv[n].value, `${k} engine`);
    assert(near(Number(el.dataset.value), v, 1e-6), `${k}: ${el.dataset.value} vs ${v}`);
  }
  assertEqual(text('[data-card="onhand"] .kpi__value'), '$2.63M');
  assertEqual(text('[data-card="available"] .kpi__value'), '$2.20M');
  assertEqual(text('[data-card="below-rop"] .kpi__value'), '10');
  assertEqual(text('[data-card="below-ss"] .kpi__value'), '5');
  assertEqual(text('[data-card="dos"] .kpi__value'), '48.7 days');
  assertEqual(text('[data-card="excess"] .kpi__value'), '$1.42M');
});

test('KPIs', 'Supporting figures: allocated value, safety-stock list, critical material below ROP, DoS range, excess list', async () => {
  assertEqual(text('[data-derived="allocated"]'), usd(EI.allocated_value));
  assert(text('[data-card="below-ss"]').includes(EI.below_ss.join(', ')));
  assertEqual(text('[data-derived="critical-below"]'), EI.critical_below_rop.join(', '));
  assert(text('[data-card="dos"]').includes(`${EI.dos_min.toFixed(1)} to ${EI.dos_max.toFixed(1)} days`));
  assert(text('[data-card="excess"]').includes('MAT-002, MAT-007, MAT-019'));
});

test('Status', 'Supplied status (on-hand) and stock position (available) shown side by side; differences MAT-010 and MAT-020', async () => {
  for (const [k, n] of Object.entries(EI.status)) assertEqual(text(`[data-supplied="${k}"] span:last-child`), String(n), k);
  assertEqual(text('[data-position="Below safety stock"] span:last-child'), '5');
  assertEqual(text('[data-position="Below reorder point"] span:last-child'), '5');
  assertEqual(text('[data-position="At or above reorder point"] span:last-child'), '13');
  const d = text('[data-insight="basis-diff"]');
  assert(d.includes('MAT-010') && d.includes('MAT-020') && !d.includes('MAT-004'), d);
});

test('Table', 'Default: 23 physical materials, most urgent stock position first, then lowest days of supply', async () => {
  assertEqual(ids().length, 23);
  assertEqual(ids().slice(0, 5), ['MAT-011', 'MAT-015', 'MAT-006', 'MAT-004', 'MAT-010']);
  assert(!ids().includes('MAT-018') && !ids().includes('MAT-021'), 'SERVICE shown by default');
});

test('Table', 'Every row matches the independent values (available, stock position, supplied status, both criticalities, value)', async () => {
  const pos = { 'Safety Stock Breach': 'Below safety stock', 'Below Reorder Point': 'Below reorder point', 'Not below reorder point': 'At or above reorder point' };
  const bad = [];
  for (const [id, e] of physical) {
    const tr = doc.querySelector(`[data-table="inventory"] tr[data-material="${id}"]`);
    if (!tr.querySelector('[data-col="available"]').textContent.startsWith(e.available.toLocaleString('en-US'))) bad.push(`${id} available`);
    if (tr.querySelector('[data-col="position"]').textContent !== pos[e.avail_basis]) bad.push(`${id} position`);
    if (tr.querySelector('[data-col="supplied"]').textContent !== e.status) bad.push(`${id} supplied`);
    if (tr.querySelector('[data-col="material-crit"]').textContent !== e.material_crit) bad.push(`${id} material crit`);
    if (tr.querySelector('[data-col="supplier-crit"]').textContent !== `Supplier: ${e.supplier_crit}`) bad.push(`${id} supplier crit`);
    if (tr.querySelector('.figure').title !== usd(e.oh_value)) bad.push(`${id} value`);
  }
  assertEqual(bad, []);
});

test('Table', 'MAT-004 shows material criticality Critical and supplier criticality High (separate sources)', async () => {
  const tr = doc.querySelector('[data-table="inventory"] tr[data-material="MAT-004"]');
  assertEqual([tr.querySelector('[data-col="material-crit"]').textContent, tr.querySelector('[data-col="supplier-crit"]').textContent], ['Critical', 'Supplier: High']);
});

test('Filters', 'Stock position, supplied status, category, material and supplier criticality filters', async () => {
  set('select[data-ifilter="position"]', 'Below safety stock');
  assertEqual(ids().sort(), EI.below_ss);
  reset();
  set('select[data-ifilter="supplied"]', 'Excess');
  assertEqual(ids().sort(), ['MAT-002', 'MAT-007', 'MAT-019']);
  reset();
  set('select[data-ifilter="materialCrit"]', 'Critical');
  assertEqual(ids().sort(), physical.filter(([, e]) => e.material_crit === 'Critical').map(([k]) => k).sort());
  reset();
  set('select[data-ifilter="supplierCrit"]', 'Critical');
  assertEqual(ids().sort(), physical.filter(([, e]) => e.supplier_crit === 'Critical').map(([k]) => k).sort());
  assert(!ids().includes('MAT-004'), 'MAT-004 supplier is High');
  reset();
  set('select[data-ifilter="category"]', 'Raw Materials');
  assertEqual(ids().sort(), physical.filter(([, e]) => e.category === 'Raw Materials').map(([k]) => k).sort());
  reset();
});

test('Filters', 'Search keeps focus; SERVICE toggle shows 25 rows with SERVICE marked excluded; empty state and reset', async () => {
  const box = doc.querySelector('input[data-ifilter="search"]');
  box.focus(); box.value = 'turbine'; box.dispatchEvent(new Event('input', { bubbles: true }));
  assertEqual(ids(), ['MAT-002']);
  assertEqual(doc.activeElement?.dataset.ifilter, 'search');
  reset();
  set('input[data-ifilter="showService"]', true);
  assertEqual(ids().length, 25);
  assertEqual(text('[data-table="inventory"] tr[data-material="MAT-018"] [data-col="position"]'), 'Excluded (SERVICE)');
  reset();
  set('select[data-ifilter="position"]', 'Below safety stock');
  set('select[data-ifilter="supplied"]', 'Excess');
  assert(doc.querySelector('[data-empty="inventory"]'));
  doc.querySelector('[data-empty="inventory"] [data-action="reset-inventory"]').click();
  assertEqual(ids().length, 23);
});

test('Sorting', 'Days of supply ascending and on-hand value descending; aria-sort updated', async () => {
  doc.querySelector('[data-inv-sort="dos"]').click();
  const d = ids().map((id) => EI.rows[id].dos);
  assert(d.every((v, i) => i === 0 || d[i - 1] <= v), 'DoS not ascending');
  assertEqual(doc.querySelector('[data-inv-sort="dos"]').closest('th').getAttribute('aria-sort'), 'ascending');
  doc.querySelector('[data-inv-sort="value"]').click();
  const v = ids().map((id) => EI.rows[id].oh_value);
  assert(v.every((x, i) => i === 0 || v[i - 1] >= x), 'value not descending');
  reset();
});

test('Navigation', 'Supplier link opens the Stage 5 supplier detail; other modules still work afterwards', async () => {
  doc.querySelector('[data-table="inventory"] [data-supplier-link="SUP-004"]').click();
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-004"]')));
  frame.contentWindow.location.hash = '#/procurement';
  assert(await waitFor(() => doc.querySelector('[data-panel="bridge"]')));
  doc.querySelector('[data-sort-table="register"][data-sort="value"]').click();
  assertEqual(doc.querySelector('[data-sort-table="register"][data-sort="value"]').closest('th').getAttribute('aria-sort'), 'descending');
  frame.contentWindow.location.hash = '#/inventory';
  assert(await waitFor(() => doc.querySelector('[data-table="inventory"]')));
  assertEqual(ids().length, 23);
});

test('Governance', 'Unsupported items listed without figures; no NaN/undefined/null on the page', async () => {
  assertEqual(doc.querySelectorAll('section[aria-labelledby="ins-title"] [data-unsupported]').length, 4);
  const t = doc.querySelector('main').textContent;
  for (const bad of ['NaN', 'undefined', 'null', 'Infinity']) assert(!t.includes(bad), bad);
});

function render(loadResult) {
  resetInventoryViewState();
  const h = document.createElement('div');
  h.style.cssText = 'position:absolute;left:-10000px;width:1300px';
  document.body.appendChild(h);
  renderInventory(h, { config: CONFIG, load: loadResult, validation: runValidation(loadResult, { asOfDate: AS_OF }), kpis: computeAllKpis(rowsOf(loadResult), { asOfDate: AS_OF }) });
  return h;
}
function altered(name, where, set2) {
  const ds = lr.datasets[name];
  const rows = ds.rows.map((r) => { if (!where(r)) return r; const c = { ...r, ...set2 }; Object.defineProperty(c, '_line', { value: r._line, enumerable: false }); return c; });
  return { ...lr, datasets: { ...lr.datasets, [name]: { ...ds, rows } } };
}

/* ---------- Mobile usability (Stage 8 refinement) ---------- */

const shown = (el) => !!el && el.getBoundingClientRect().height > 0;
let mFrame, mDoc;

test('Mobile', 'Desktop width: menu button and swipe hint hidden, all six menu links visible', async () => {
  doc.querySelector('#module-nav-list a[data-module="inventory"]').click();
  assert(await waitFor(() => doc.querySelector('[data-table="inventory"]')));
  assert(!shown(doc.getElementById('nav-toggle')), 'menu button visible on desktop');
  assert(!shown(doc.querySelector('[data-hint="inventory"]')), 'swipe hint visible on desktop');
  assertEqual([...doc.querySelectorAll('#module-nav-list a')].filter(shown).length, 6);
});

test('Mobile', '375px: menu collapsed by default; button names the current module and is at least 44px', async () => {
  mFrame = await openApp('#/inventory', 375);
  mDoc = mFrame.contentDocument;
  const b = mDoc.getElementById('nav-toggle');
  assert(shown(b), 'menu button not shown');
  assertEqual(b.getAttribute('aria-expanded'), 'false');
  assertEqual(b.getAttribute('aria-controls'), 'module-nav-list');
  assertEqual(mDoc.getElementById('nav-current').textContent, 'Inventory intelligence');
  assertEqual([...mDoc.querySelectorAll('#module-nav-list a')].filter(shown).length, 0, 'links visible while collapsed');
  assert(b.getBoundingClientRect().height >= 44, `button ${b.getBoundingClientRect().height}px`);
  // Larger touch targets must not collapse word spacing in the wordmark or in links.
  assertEqual(mDoc.querySelector('.wordmark').innerText.replace(/\s+/g, ' '), 'Aerospace Supplier Intelligence');
  const link = mDoc.querySelector('[data-table="inventory"] a.link-plain');
  assert(link.getBoundingClientRect().height >= 44, `supplier link ${link.getBoundingClientRect().height}px`);
});

test('Mobile', '375px: menu opens, links are at least 44px, Escape closes it and returns focus', async () => {
  const b = mDoc.getElementById('nav-toggle');
  b.click();
  assertEqual(b.getAttribute('aria-expanded'), 'true');
  const links = [...mDoc.querySelectorAll('#module-nav-list a')].filter(shown);
  assertEqual(links.length, 6);
  assert(links.every((a) => a.getBoundingClientRect().height >= 44), 'link below 44px');
  links[0].focus();
  mDoc.dispatchEvent(new mFrame.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assertEqual(b.getAttribute('aria-expanded'), 'false');
  assert(mDoc.activeElement === b, `focus not returned to the menu button (on ${mDoc.activeElement?.tagName})`);
});

test('Mobile', '375px: choosing a module navigates and closes the menu', async () => {
  const b = mDoc.getElementById('nav-toggle');
  b.click();
  mDoc.querySelector('#module-nav-list a[data-module="procurement"]').click();
  assert(await waitFor(() => mFrame.contentWindow.location.hash === '#/procurement' && mDoc.querySelector('[data-table="register"]')));
  assertEqual(b.getAttribute('aria-expanded'), 'false');
  assertEqual(mDoc.getElementById('nav-current').textContent, 'Procurement intelligence');
  mDoc.querySelector('#module-nav-list a[data-module="inventory"]').click();
  assert(await waitFor(() => mDoc.querySelector('[data-table="inventory"]')));
});

test('Mobile', '375px: swipe hint above the table; table is a focusable region; Material column and header stay fixed', async () => {
  const hint = mDoc.querySelector('[data-hint="inventory"]');
  const wrap = mDoc.querySelector('[data-table="inventory"]').closest('.table-wrap');
  assert(shown(hint), 'hint not shown');
  assert(hint.textContent.includes('Swipe sideways to see all 10 columns'), hint.textContent);
  assert(hint.getBoundingClientRect().bottom <= wrap.getBoundingClientRect().top, 'hint not above the table');
  assertEqual(wrap.getAttribute('role'), 'region');
  assertEqual(wrap.getAttribute('tabindex'), '0');
  assert(wrap.scrollWidth > wrap.clientWidth, 'table does not scroll sideways at 375px');
  const body = wrap.querySelector('tbody th.sticky'), head = wrap.querySelector('thead th.sticky');
  const before = [body.getBoundingClientRect().left, head.getBoundingClientRect().left];
  wrap.scrollLeft = 250;
  assert(await waitFor(() => wrap.classList.contains('is-scrolled')), 'edge shadow class not set');
  assertEqual(body.getBoundingClientRect().left, before[0], 'Material cell moved');
  assertEqual(head.getBoundingClientRect().left, before[1], 'Material header moved');
  wrap.scrollLeft = 0;
  assert(await waitFor(() => !wrap.classList.contains('is-scrolled')), 'edge shadow class not cleared');
});

test('Mobile', '375px: filter, search, checkbox, reset and sort controls are at least 44px', async () => {
  const sel = ['.controls select', '.controls input[type=search]', '.control--check', '.controls .button-quiet', '[data-table="inventory"] .sort'];
  for (const s of sel) for (const el of mDoc.querySelectorAll(s)) assert(el.getBoundingClientRect().height >= 44, `${s} ${el.getBoundingClientRect().height}px`);
  mFrame.remove();
});

test('Rules', 'Not hardcoded: lowering MAT-001 available stock below safety stock changes the page', async () => {
  const h = render(altered('inventory_snapshot', (r) => r.material_id === 'MAT-001', { allocated_qty: 69, available_qty: 10, available_inventory_value_usd: 28500 }));
  assertEqual(h.querySelector('[data-card="below-ss"] .kpi__value').textContent, '6');
  assertEqual(h.querySelector('tr[data-material="MAT-001"] [data-col="position"]').textContent, 'Below safety stock');
  h.remove();
});

test('Rules', 'SERVICE stock never enters inventory KPIs, even with a large value', async () => {
  const h = render(altered('inventory_snapshot', (r) => r.material_id === 'MAT-018', { on_hand_inventory_value_usd: 9e9 }));
  assertEqual(Number(h.querySelector('[data-card="onhand"] .kpi__value').dataset.value), EI.oh);
  h.remove();
});

test('Rules', 'Validation failure shows an alert; data text is escaped', async () => {
  let h = render(altered('purchase_orders', (r) => r.po_line_id === 'POL-00001', { received_qty: 16 }));
  assert(h.querySelector('[data-banner="validation-fail"][role="alert"]'));
  h.remove();
  h = render(altered('inventory_snapshot', (r) => r.material_id === 'MAT-003', { material_description: '<img src=x onerror="window.__xss4=1">' }));
  assert(!h.querySelector('img') && !window.__xss4);
  h.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => { document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Inventory intelligence tests`; });
