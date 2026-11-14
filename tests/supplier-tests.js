/**
 * Supplier Performance tests (Stage 5).
 *
 * Part A drives the real application (../index.html#/suppliers) in a hidden frame:
 * figures, sorting, filtering, basis switching, supplier selection and sample-size labels.
 * Part B renders the view directly with altered inputs.
 *
 * Expected values: tests/kpi-expected-values.js (independent calculation).
 */

import { test, assert, assertEqual, runTests } from './test-harness.js';
import { CONFIG } from '../src/js/config.js';
import { loadAllDatasets, rowsOf } from '../src/js/data-loader.js';
import { runValidation } from '../src/js/validation.js';
import { computeAllKpis, supplierDetail } from '../src/js/kpis.js';
import { renderSuppliers, resetSupplierViewState, sortProfiles } from '../src/js/views/suppliers.js';
import { percent } from '../src/js/format.js';
import { EXPECTED_SUPPLIERS as ES } from './kpi-expected-values.js';

const AS_OF = CONFIG.reportingAsOfDate;

/* ---------- helpers ---------- */

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

let frame;
let doc;
let lr;
let engine;
let profiles;

const rows = () => [...doc.querySelectorAll('[data-table="compare"] tbody tr')];
const rowIds = () => rows().map((r) => r.dataset.supplier);
const setSelect = (name, value) => {
  const el = doc.querySelector(`select[data-filter="${name}"]`);
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const setBasis = (value) => {
  const el = doc.querySelector(`input[name="basis"][value="${value}"]`);
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const clickSort = (key) => doc.querySelector(`[data-sort="${key}"]`).click();
const resetFilters = () => doc.querySelector('.controls [data-action="reset"]').click();
const text = (sel) => doc.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim();

/* ======================================================================
 * Part A – the real application
 * ==================================================================== */

test('Load', 'Supplier performance opens from the navigation with all data loaded', async () => {
  lr = await loadAllDatasets({ basePath: '../data/', Papa: window.Papa });
  engine = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF, minSample: CONFIG.minimumSampleForRate });
  profiles = engine.suppliers.profiles.items;
  frame = await openApp('#/executive');
  doc = frame.contentDocument;
  doc.querySelector('#module-nav-list a[data-module="suppliers"]').click();
  assert(await waitFor(() => doc.querySelector('[data-table="compare"]')), 'supplier page not shown');
  assertEqual(doc.querySelector('#page-title').textContent, 'Supplier performance');
  assertEqual(doc.querySelector('#module-nav-list a[data-module="suppliers"]').getAttribute('aria-current'), 'page');
  assert(!doc.querySelector('[data-placeholder]'), 'placeholder still shown');
});

test('Load', 'Title block: 25 suppliers, 21 with deliveries in period; 63 / 73 events; 73 inspections', async () => {
  assertEqual(text('[data-tb="suppliers"]'), '25, 21 with deliveries in period');
  assertEqual(text('[data-tb="events"]'), '63 in period, 73 in full dataset');
  assertEqual(text('[data-tb="inspections"]'), '73, 2,997 units');
  assertEqual(text('[data-tb="sample-rule"]'), 'Limited below 3 records');
});

test('Load', 'Out-of-period caution banner is shown (DEC-017)', async () => {
  assert(text('[data-banner="period"]').startsWith('10 delivered events fall after 31 Oct 2026'), text('[data-banner="period"]'));
});

test('Baseline', 'Portfolio baseline figures equal the KPI engine', async () => {
  for (const el of doc.querySelectorAll('.kpi-panel--four [data-kpi-key]')) {
    const [g, k] = el.dataset.kpiKey.split('.');
    assertEqual(Number(el.dataset.value), engine[g][k].value, el.dataset.kpiKey);
  }
  assertEqual(text('[data-card="base-otd"] .kpi__value'), '39.7%');
  assertEqual(text('[data-card="base-ca"] .kpi__value'), '3 open');
});

test('Segments', 'Criticality table matches the independent pooled figures', async () => {
  for (const [seg, e] of Object.entries(ES.segments)) {
    const cells = [...doc.querySelectorAll(`[data-table="segments"] tr[data-segment="${seg}"] td`)].map((c) => c.textContent);
    assertEqual(cells[0], String(e.suppliers), `${seg} suppliers`);
    assertEqual(cells[1], percent(e.net_share, 1), `${seg} share`);
    assertEqual(cells[2], String(e.snap_n), `${seg} events`);
    assertEqual(cells[3], e.snap_n ? percent((e.snap_on / e.snap_n) * 100, 1) : 'No data', `${seg} OTD`);
    assertEqual(cells[5], e.full_n ? percent((e.full_on / e.full_n) * 100, 1) : 'No data', `${seg} OTD full`);
  }
});

test('Segments', 'Insight states critical suppliers hold 52.6% of value with 4 of 63 events in period', async () => {
  assertEqual(text('[data-insight="critical-share"]'), '52.6%');
  assertEqual(text('[data-insight="critical-events"]'), '4 of 63');
});

test('Exposure', 'Chart plots the 21 suppliers with events in period; the 4 without are listed', async () => {
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('exposure-chart'));
  assert(c, 'exposure chart not drawn');
  assertEqual(c.data.datasets[0].data.length, 21);
  assertEqual(text('[data-not-plotted]'), 'SUP-004, SUP-009, SUP-012, SUP-018');
  assertEqual(c.options.plugins.referenceLines.lines[0].value, engine.delivery.otdSnapshot.value);
});

test('Exposure', 'Top-five exposure statement is derived from the data', async () => {
  const t = text('[data-insight="top5"]');
  assert(t.includes('80.3%') && t.includes('2 of them (SUP-008, SUP-002) are below the portfolio OTD of 39.7%') && t.includes('1 (SUP-012) have none'), t);
});

test('Comparison', 'Table lists all 25 suppliers by default, sorted by criticality', async () => {
  assertEqual(rows().length, 25);
  const crit = rows().map((r) => r.querySelector('.crit').textContent);
  const order = ['Critical', 'High', 'Medium', 'Low'];
  assert(crit.every((c, i) => i === 0 || order.indexOf(crit[i - 1]) <= order.indexOf(c)), crit.join(','));
  assertEqual(text('[data-count]').split('.')[0], 'Showing 25 of 25 suppliers');
});

test('Comparison', 'Every row\'s OTD and rejection cells match the engine profile (snapshot basis)', async () => {
  const bad = [];
  for (const p of profiles) {
    const tr = doc.querySelector(`tr[data-supplier="${p.supplier_id}"]`);
    const otd = tr.querySelector('[data-col="otd"]').textContent.trim();
    const rej = tr.querySelector('[data-col="rejection"]').textContent.trim();
    const expOtd = p.otdSnapshotPct === null ? 'No data' : percent(p.otdSnapshotPct, 1);
    const expRej = p.rejectionRatePct === null ? 'No data' : percent(p.rejectionRatePct, 2);
    if (!otd.startsWith(expOtd)) bad.push(`${p.supplier_id} OTD "${otd}" vs ${expOtd}`);
    if (!rej.startsWith(expRej)) bad.push(`${p.supplier_id} rejection "${rej}" vs ${expRej}`);
  }
  assertEqual(bad, []);
});

test('Comparison', 'Sample labels: 4 "No data" and 11 "limited" OTD cells on the snapshot basis', async () => {
  const lab = (s) => rows().filter((r) => r.querySelector(`[data-col="otd"] [data-sample="${s}"]`)).map((r) => r.dataset.supplier);
  assertEqual(lab('none').sort(), ['SUP-004', 'SUP-009', 'SUP-012', 'SUP-018']);
  assertEqual(lab('limited').sort(), ['SUP-001', 'SUP-002', 'SUP-007', 'SUP-008', 'SUP-011', 'SUP-015', 'SUP-016', 'SUP-020', 'SUP-021', 'SUP-022', 'SUP-024']);
  const t = doc.querySelector('tr[data-supplier="SUP-002"] [data-col="otd"] [data-sample="limited"]');
  assertEqual(t.textContent, 'Limited sample');
  assertEqual(t.title, 'Limited sample: 1 delivered event. Rates based on fewer than 3 records are flagged (DEC-025).');
});

test('Sample rule (DEC-025)', 'Boundary: 3 delivered events shows no flag (SUP-010); 2 shows "Limited sample" (SUP-016)', async () => {
  const p10 = profiles.find((p) => p.supplier_id === 'SUP-010');
  const p16 = profiles.find((p) => p.supplier_id === 'SUP-016');
  assertEqual([p10.deliveredEventsSnapshot, p16.deliveredEventsSnapshot], [3, 2]);
  assert(!doc.querySelector('tr[data-supplier="SUP-010"] [data-col="otd"] [data-sample]'), 'SUP-010 should not be flagged');
  assertEqual(text('tr[data-supplier="SUP-016"] [data-col="otd"] [data-sample]'), 'Limited sample');
});

test('Sample rule (DEC-025)', 'Rejection rate uses inspection records for the flag and shows inspected units as the denominator', async () => {
  const bad = [];
  for (const p of profiles) {
    const tr = doc.querySelector(`tr[data-supplier="${p.supplier_id}"]`);
    const units = tr.querySelector('[data-col="inspected-units"]')?.textContent ?? null;
    const expUnits = p.inspections ? `${p.inspectedQty.toLocaleString('en-US')} units` : null;
    if (units !== expUnits) bad.push(`${p.supplier_id} units "${units}" vs "${expUnits}"`);
    const flag = tr.querySelector('[data-col="rejection"] [data-sample]')?.dataset.sample ?? 'sufficient';
    if (flag !== p.inspectionSample) bad.push(`${p.supplier_id} flag ${flag} vs ${p.inspectionSample}`);
    const fig = tr.querySelector('[data-col="rejection"] .figure');
    if (fig && fig.title !== `${p.rejectedQty.toLocaleString('en-US')} rejected of ${p.inspectedQty.toLocaleString('en-US')} inspected units, ${p.inspections} inspection records`) bad.push(`${p.supplier_id} tooltip "${fig.title}"`);
  }
  assertEqual(bad, []);
  assertEqual(doc.querySelector('tr[data-supplier="SUP-020"] [data-col="rejection"] [data-sample]').title,
    'Limited sample: 2 inspection records. Rates based on fewer than 3 records are flagged (DEC-025).');
});

test('Sample rule (DEC-025)', 'Legend states the threshold and the record type for each metric', async () => {
  const t = text('[data-legend="sample"]');
  for (const s of ['minimum 3 records', 'No data 0 records', 'Limited sample 1 to 2 records', '3 or more records: the rate is shown without a flag', 'Delivery Event OTD counts delivered events', 'Rejection rate counts inspection records; its denominator is inspected units']) {
    assert(t.includes(s), `legend missing "${s}"`);
  }
});

test('Sample rule (DEC-025)', '"No data" cells carry a tooltip naming the missing records', async () => {
  assertEqual(doc.querySelector('tr[data-supplier="SUP-004"] [data-col="otd"] .no-data').title, 'No data: 0 delivered events.');
  assertEqual(doc.querySelector('tr[data-supplier="SUP-004"] [data-col="rejection"] .no-data').title, 'No data: 0 inspection records.');
});

test('Sample rule (DEC-025)', 'Criticality table applies the same rule; all four groups have 3 or more records, so none is flagged', async () => {
  assertEqual(doc.querySelectorAll('[data-table="segments"] [data-sample]').length, 0);
  // Inspection-record counts per group, from the independent calculation: Critical 4, High 45, Medium 19, Low 5.
  for (const [seg, n] of Object.entries({ Critical: 4, High: 45, Medium: 19, Low: 5 })) {
    const sub = doc.querySelector(`[data-table="segments"] tr[data-segment="${seg}"] td:nth-child(8) .cell-sub`).textContent;
    assertEqual(sub, `${n} records`, seg);
  }
});

test('Sorting', 'OTD ascending: lowest first, suppliers with no data last', async () => {
  clickSort('otd');
  const ids = rowIds();
  const vals = ids.map((id) => profiles.find((p) => p.supplier_id === id).otdSnapshotPct);
  const firstNull = vals.indexOf(null);
  assertEqual(vals.slice(firstNull).every((v) => v === null), true, 'blanks not last');
  assert(vals.slice(0, firstNull).every((v, i, a) => i === 0 || a[i - 1] <= v), 'not ascending');
  assertEqual(doc.querySelector('[data-sort="otd"]').closest('th').getAttribute('aria-sort'), 'ascending');
});

test('Sorting', 'OTD descending: highest first, no-data suppliers still last', async () => {
  clickSort('otd');
  const vals = rowIds().map((id) => profiles.find((p) => p.supplier_id === id).otdSnapshotPct);
  const firstNull = vals.indexOf(null);
  assert(vals.slice(0, firstNull).every((v, i, a) => i === 0 || a[i - 1] >= v), 'not descending');
  assertEqual(vals.slice(-4), [null, null, null, null]);
  assertEqual(doc.querySelector('[data-sort="otd"]').closest('th').getAttribute('aria-sort'), 'descending');
});

test('Sorting', 'Sorting by net active PO share puts SUP-007 first when descending', async () => {
  clickSort('share');
  clickSort('share');
  assertEqual(rowIds().slice(0, 3), ['SUP-007', 'SUP-008', 'SUP-002']);
});

test('Sorting', 'sortProfiles never places blanks first in either direction', async () => {
  for (const dir of ['asc', 'desc']) {
    for (const key of ['otd', 'variance', 'rejection']) {
      const s = sortProfiles(profiles, 'snapshot', key, dir);
      const col = { otd: 'otdSnapshotPct', variance: 'avgVarianceDaysSnapshot', rejection: 'rejectionRatePct' }[key];
      const firstNull = s.findIndex((p) => p[col] === null);
      if (firstNull >= 0) assert(s.slice(firstNull).every((p) => p[col] === null), `${key} ${dir}`);
    }
  }
});

test('Filtering', 'Criticality = Critical shows the 4 critical suppliers', async () => {
  setSelect('criticality', 'Critical');
  assertEqual(rowIds().sort(), ['SUP-001', 'SUP-002', 'SUP-007', 'SUP-012']);
  assertEqual(text('[data-count]').split('.')[0], 'Showing 4 of 25 suppliers');
  resetFilters();
});

test('Filtering', 'Delivery sample = No data shows the 4 suppliers without in-period deliveries', async () => {
  setSelect('sample', 'none');
  assertEqual(rowIds().sort(), ['SUP-004', 'SUP-009', 'SUP-012', 'SUP-018']);
  resetFilters();
});

test('Filtering', 'Qualification = Conditional and certification filters narrow the list', async () => {
  setSelect('qualification', 'Conditional');
  const cond = profiles.filter((p) => p.qualification_status === 'Conditional').map((p) => p.supplier_id).sort();
  assertEqual(rowIds().sort(), cond);
  assertEqual(cond.length, 3);
  resetFilters();
  setSelect('certification', 'Expiring');
  assertEqual(rowIds().length, 2);
  resetFilters();
});

test('Filtering', 'Search matches name or ID, and focus stays in the search box while typing', async () => {
  const box = doc.querySelector('input[data-filter="search"]');
  box.focus();
  box.value = 'thermal';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  assertEqual(rowIds(), ['SUP-008']);
  assertEqual(doc.activeElement?.dataset.filter, 'search', 'focus lost after re-render');
  resetFilters();
});

test('Filtering', 'No matches: a clear message and a working "Clear filters" button', async () => {
  setSelect('criticality', 'Low');
  setSelect('sample', 'none');
  assert(doc.querySelector('[data-empty]'), 'empty message missing');
  assertEqual(rows().length, 0);
  doc.querySelector('[data-empty] [data-action="reset"]').click();
  assertEqual(rows().length, 25);
});

test('Basis', 'Switching to the full dataset changes delivery columns: SUP-018 shows 0.0% (n = 2, limited)', async () => {
  setBasis('full');
  const cell = doc.querySelector('tr[data-supplier="SUP-018"] [data-col="otd"]').textContent;
  assert(cell.includes('0.0%') && cell.includes('Limited sample'), cell);
  assert(text('[data-count]').includes('full dataset'));
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('exposure-chart'));
  assertEqual(c.data.datasets[0].data.length, 22);
  assertEqual(text('[data-not-plotted]'), 'SUP-004, SUP-009, SUP-012');
  setBasis('snapshot');
  assert(doc.querySelector('tr[data-supplier="SUP-018"] [data-col="otd"] [data-sample="none"]'));
});

test('Detail', 'No supplier selected: the detail area invites a selection', async () => {
  assert(doc.querySelector('[data-detail-empty]'));
});

test('Detail', 'Selecting SUP-013 opens its detail, updates the address and highlights the row', async () => {
  doc.querySelector('[data-select="SUP-013"]').click();
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-013"]')), 'detail not shown');
  assertEqual(frame.contentWindow.location.hash, '#/suppliers/SUP-013');
  assert(doc.querySelector('tr[data-supplier="SUP-013"]').classList.contains('is-selected'));
  assertEqual(doc.activeElement?.id, 'det-title', 'focus should move to the detail heading');
});

test('Detail', 'Detail figures equal supplierDetail() from the KPI engine', async () => {
  const det = supplierDetail(rowsOf(lr), 'SUP-013', { asOfDate: AS_OF });
  for (const el of doc.querySelectorAll('[data-detail] [data-detail-key]')) {
    const [g, k] = el.dataset.detailKey.split('.');
    const v = det[g][k].value;
    assertEqual(el.dataset.value === '' ? null : Number(el.dataset.value), v, el.dataset.detailKey);
  }
  assertEqual(text('[data-card="det-otd"] .kpi__value'), '50.0%');
  assert(text('[data-card="det-otd"]').includes('2 of 4 events in period'), text('[data-card="det-otd"]'));
});

test('Detail', 'Detail shows supplier-master classification (criticality, qualification, certification)', async () => {
  assertEqual(text('[data-fact="criticality"]'), 'High');
  assertEqual(text('[data-fact="qualification"]'), 'Conditional');
  assertEqual(text('[data-fact="certification"]'), 'Under Review');
});

test('Detail', 'Event and inspection lists are complete; out-of-period events are marked', async () => {
  assertEqual(doc.querySelectorAll('[data-table="events"] tbody tr').length, 7);
  assertEqual(doc.querySelectorAll('[data-table="events"] tbody tr.out-of-period').length, 3);
  assertEqual(doc.querySelectorAll('[data-table="inspections"] tbody tr').length, 6);
  assertEqual(doc.querySelectorAll('[data-table="inspections"] tbody tr.nc').length, 1);
});

test('Detail', 'Delivery-timing chart plots each delivered event (6 for SUP-013)', async () => {
  const c = frame.contentWindow.Chart.getChart(doc.getElementById('timeline-chart'));
  assert(c, 'timeline not drawn');
  assertEqual(c.data.datasets.reduce((s, ds) => s + ds.data.length, 0), 6);
});

test('Detail', 'Supplier with no delivered events (SUP-004): "No data" and no chart, not 0%', async () => {
  frame.contentWindow.location.hash = '#/suppliers/SUP-004';
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-004"]')));
  assertEqual(text('[data-card="det-otd"] .kpi__value'), 'No data');
  assert(doc.querySelector('[data-card="det-otd"] [data-sample="none"]'), 'no-data tag missing');
  assert(doc.querySelector('[data-timeline-empty]'), 'empty timeline message missing');
  assertEqual(text('[data-card="det-quality"] .kpi__value'), 'No data');
});

test('Detail', 'Limited-sample supplier (SUP-008) is labelled in the detail', async () => {
  frame.contentWindow.location.hash = '#/suppliers/SUP-008';
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-008"]')));
  assert(text('[data-card="det-otd"]').includes('Limited sample: 1 delivered event'), text('[data-card="det-otd"]'));
  assert(text('[data-card="det-quality"]').includes('Limited sample: 1 inspection record'), text('[data-card="det-quality"]'));
  assert(text('[data-card="det-quality"]').includes('1 of 50 units'), 'inspected-unit denominator missing');
});

test('Detail', 'Unknown supplier in the address shows a clear message', async () => {
  frame.contentWindow.location.hash = '#/suppliers/SUP-999';
  assert(await waitFor(() => doc.querySelector('[data-detail-missing]')));
});

test('Detail', 'A direct link to a supplier opens it on first load', async () => {
  const f = await openApp('#/suppliers/SUP-023');
  assert(f.contentDocument.querySelector('[data-detail="SUP-023"]'), 'deep link failed');
  f.remove();
});

test('Corrective actions', 'Register lists the 4 corrective actions; open ones are highlighted; selecting opens the supplier', async () => {
  frame.contentWindow.location.hash = '#/suppliers';
  assert(await waitFor(() => doc.querySelector('[data-detail-empty]')));
  const ca = [...doc.querySelectorAll('[data-table="ca"] tbody tr')];
  assertEqual(ca.map((r) => r.dataset.ca), ES.ca_register.map((r) => r.inspection_id));
  assertEqual(doc.querySelectorAll('[data-table="ca"] .caution-text').length, 3);
  ca[0].querySelector('[data-select]').click();
  assert(await waitFor(() => doc.querySelector('[data-detail="SUP-008"]')));
});

test('Governance', 'No composite risk score, rating or rank appears anywhere on the page', async () => {
  const t = doc.querySelector('main').textContent;
  assert(!/risk score|risk rating|overall score|composite score|scorecard/i.test(t.replace('No overall risk score is calculated', '')), 'score wording found');
  const headers = [...doc.querySelectorAll('th')].map((th) => th.textContent).join('|');
  assert(!/score|rank/i.test(headers), headers);
});

test('Governance', 'No "NaN", "undefined", "null" or "Infinity" on the page', async () => {
  const t = doc.querySelector('main').textContent;
  for (const bad of ['NaN', 'undefined', 'null', 'Infinity']) assert(!t.includes(bad), bad);
});

/* ======================================================================
 * Part B – view rendered with altered inputs
 * ==================================================================== */

function modelFrom(loadResult) {
  return {
    config: CONFIG,
    load: loadResult,
    validation: runValidation(loadResult, { asOfDate: AS_OF }),
    kpis: computeAllKpis(rowsOf(loadResult), { asOfDate: AS_OF, minSample: CONFIG.minimumSampleForRate }),
  };
}

function altered(name, where, set) {
  const ds = lr.datasets[name];
  const r2 = ds.rows.map((r) => {
    if (!where(r)) return r;
    const c = { ...r, ...set };
    Object.defineProperty(c, '_line', { value: r._line, enumerable: false });
    return c;
  });
  return { ...lr, datasets: { ...lr.datasets, [name]: { ...ds, rows: r2 } } };
}

function renderInto(model, selectedId = null) {
  resetSupplierViewState();
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-10000px;width:1300px';
  document.body.appendChild(host);
  renderSuppliers(host, model, { selectedId });
  return host;
}

test('Rules', 'Material criticality in supplier_quality is ignored; supplier-master criticality is shown', async () => {
  const host = renderInto(modelFrom(altered('supplier_quality', (r) => r.supplier_id === 'SUP-008', { supplier_criticality: 'Critical' })), 'SUP-008');
  assertEqual(host.querySelector('[data-fact="criticality"]').textContent, 'Medium');
  assertEqual(host.querySelector('tr[data-supplier="SUP-008"] .crit').textContent, 'Medium');
  host.remove();
});

test('Rules', 'Changing source data changes the supplier figures (not hardcoded)', async () => {
  // Mark SUP-013's late in-period event DEL-00035 as on time in an in-memory copy.
  const host = renderInto(modelFrom(altered('delivery_transactions', (r) => r.delivery_id === 'DEL-00035', { on_time_flag: 1, delivery_variance_days: 0, actual_delivery_date: '2026-06-20' })), 'SUP-013');
  assertEqual(host.querySelector('[data-card="det-otd"] .kpi__value').textContent, '75.0%');
  host.remove();
});

test('Rules', 'With a threshold of 5, the Critical and Low groups (4 events each) are flagged "Limited sample"', async () => {
  const cfg = { ...CONFIG, minimumSampleForRate: 5 };
  const model = { ...modelFrom(lr), config: cfg };
  model.kpis = computeAllKpis(rowsOf(lr), { asOfDate: AS_OF, minSample: 5 });
  const host = renderInto(model);
  const flagged = (seg) => host.querySelector(`[data-table="segments"] tr[data-segment="${seg}"] td:nth-child(5) [data-sample="limited"]`);
  assert(flagged('Critical') && flagged('Low'), 'Critical/Low not flagged');
  assert(!flagged('High'), 'High (38 events) should not be flagged');
  assert(host.querySelector('[data-legend="sample"]').textContent.includes('minimum 5 records'));
  host.remove();
});

test('Rules', 'Validation failure shows an alert on the supplier page', async () => {
  const host = renderInto(modelFrom(altered('purchase_orders', (r) => r.po_line_id === 'POL-00001', { received_qty: 16 })));
  assert(host.querySelector('[data-banner="validation-fail"][role="alert"]'));
  host.remove();
});

test('Rules', 'Supplier text from the data is escaped', async () => {
  const host = renderInto(modelFrom(altered('suppliers', (r) => r.supplier_id === 'SUP-007', { supplier_name: '<img src=x onerror="window.__xss2=1">' })), 'SUP-007');
  assert(!host.querySelector('img') && !window.__xss2);
  host.remove();
});

runTests(document.getElementById('results')).then(({ summary }) => {
  document.title = `${summary.failed ? 'FAIL' : 'PASS'} – Supplier performance tests`;
});
