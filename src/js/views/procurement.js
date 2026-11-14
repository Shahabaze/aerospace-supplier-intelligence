/**
 * Procurement Intelligence view (Stage 6, KPI Dictionary v2.3).
 *
 * Displays results from the KPI engine (kpis.procurement.*):
 *   bridge (6.9), overdueOpen (6.8), received (6.7), ageing (4.4.1), supplierRows (6.3/6.4),
 *   byCategory/byCountry/byTier/byCriticality, register (4.4), promiseGap (4.7), averageLine (6.5).
 * No KPI is calculated here. Sorting and filtering only reorder and hide engine rows.
 * All overdue figures use open quantity and the currently recorded promised date.
 */

import { usd, usdCompact, percent, integer, date, esc, isMissing, NA } from '../format.js';
import { sampleSufficiency } from '../kpis.js';
import { drawAgeingChart, drawParetoChart, drawGapChart } from '../charts.js';

/* ---------- view state ---------- */

const DEFAULT_SUPPLIER_SORT = { key: 'net', dir: 'desc' }; // DEC-032
const DEFAULT_REGISTER_SORT = { key: 'days', dir: 'desc' }; // most overdue first

const state = {
  segment: 'material_category',
  supplierSort: { ...DEFAULT_SUPPLIER_SORT },
  supplierFilters: { criticality: '', overdue: '', search: '' },
  registerSort: { ...DEFAULT_REGISTER_SORT },
  registerFilters: { due: '', bucket: '', supplier: '', category: '', noReceipt: false, search: '' },
};

const CRIT_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const SEGMENTS = {
  material_category: { key: 'byCategory', label: 'Material category', note: 'Material category from materials.csv (one material per PO line).' },
  criticality: { key: 'byCriticality', label: 'Supplier criticality', note: 'Supplier criticality from suppliers.csv.' },
  supplier_tier: { key: 'byTier', label: 'Supplier tier', note: 'Supplier tier from suppliers.csv.' },
  country: { key: 'byCountry', label: 'Supplier country', note: 'Supplier country from suppliers.csv.' },
};

/* ---------- helpers ---------- */

const money = (v) => `<span class="figure" title="${esc(usd(v))}">${esc(usdCompact(v))}</span>`;
const daysText = (n) => (isMissing(n) ? '—' : `${integer(n)} day${Math.abs(n) === 1 ? '' : 's'}`);
const signed = (n, digits = 1) => (isMissing(n) ? NA : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)} day${Math.abs(n) === 1 && digits === 0 ? '' : 's'}`);
const opts = (values, current, all = 'All') => `<option value="">${esc(all)}</option>` + values.map((v) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(v)}</option>`).join('');

function sortRows(items, col, dir) {
  const d = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = col.sortValue(a);
    const vb = col.sortValue(b);
    const na = va === null || va === undefined;
    const nb = vb === null || vb === undefined;
    if (na && nb) return col.tie(a, b);
    if (na) return 1; // blanks always last
    if (nb) return -1;
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return c !== 0 ? c * d : col.tie(a, b);
  });
}

function sortHeader(cols, sort, table) {
  return cols
    .map((c) => {
      const active = c.key === sort.key;
      const aria = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return `<th scope="col" class="${c.num ? 'num' : ''}${c.sticky ? ' sticky' : ''}" aria-sort="${aria}"><button type="button" class="sort" data-sort-table="${table}" data-sort="${c.key}">${esc(c.label)}<span class="sort__arrow" aria-hidden="true">${active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span></button></th>`;
    })
    .join('');
}

const attr = (key, field, value) => `data-kpi-key="${esc(key)}" data-kpi-field="${esc(field)}" data-value="${isMissing(value) ? '' : esc(value)}"`;

/* ---------- sections ---------- */

function titleBlock(m) {
  const p = m.kpis.procurement;
  const s = m.validation.summary;
  return `
    <section class="title-block" aria-label="Report details">
      <div class="title-block__title">
        <h1 id="page-title" tabindex="-1">Procurement intelligence</h1>
        <p>Where PO value is committed, how concentrated it is, and which open commitments are past their promised date. All values are PO line values, not invoiced spend.</p>
      </div>
      <div><span class="tb-label">Reporting period</span><span class="tb-value">${esc(date(m.config.reportingPeriodStart))} – ${esc(date(m.config.reportingAsOfDate))}</span></div>
      <div><span class="tb-label">Overdue measured at</span><span class="tb-value" data-tb="asof">${esc(date(m.config.reportingAsOfDate))}</span></div>
      <div><span class="tb-label">Validation</span><span class="tb-value ${s.allPassed ? 'tb-value--pass' : 'tb-value--fail'}">${s.controlsPassed} of ${s.controlsTotal} controls passed</span></div>
      <div><span class="tb-label">PO lines</span><span class="tb-value" data-tb="lines">${integer(p.bridge.n)}, ${integer(p.register.n)} with open quantity</span></div>
      <div><span class="tb-label">Promise reference</span><span class="tb-value">Recorded promised date</span></div>
      <div><span class="tb-label">KPI dictionary</span><span class="tb-value">Version ${esc(m.config.documentVersions.kpiDictionary)}</span></div>
    </section>`;
}

function notices(m) {
  const out = [];
  if (!m.validation.summary.allPassed) {
    out.push(`<div class="banner banner--fail" role="alert" data-banner="validation-fail"><strong>Some data checks did not pass.</strong> Procurement figures are shown for diagnosis only. See Data quality on the <a href="#/executive">Executive dashboard</a>.</div>`);
  }
  if (!m.kpis.procurement.bridge.reconciles) {
    out.push(`<div class="banner banner--fail" role="alert" data-banner="bridge-fail"><strong>The PO value bridge does not reconcile.</strong> Check the reconciliation lines below before using these figures.</div>`);
  }
  if (m.validation.notices.find((n) => n.id === 'N01')) {
    out.push(`<div class="banner banner--caution" data-banner="period"><strong>Received and open quantities include deliveries dated after ${esc(date(m.config.reportingAsOfDate))}.</strong> They are already reflected in the PO lines, so the bridge includes them (DEC-017). Overdue status uses the currently recorded promised date; original promises and revisions are not held in the data.</div>`);
  }
  return out.join('');
}

function bridgeSection(m) {
  const b = m.kpis.procurement.bridge;
  const max = Math.max(b.gross, 1);
  const w = (v) => `${Math.max(0, (v / max) * 100).toFixed(2)}%`;
  const rows = [
    { key: 'gross', ref: '6.1', label: 'Gross PO line value', value: b.gross, kind: 'total', offset: 0 },
    { key: 'cancelled', ref: '6.1.1', label: 'Cancelled', value: b.cancelled, kind: 'minus', offset: b.netActive },
    { key: 'netActive', ref: '6.1.2', label: 'Net active PO line value', value: b.netActive, kind: 'subtotal', offset: 0 },
    { key: 'received', ref: '6.7', label: 'Received', value: b.received, kind: 'part', offset: 0 },
    { key: 'open', ref: '6.2', label: 'Open PO commitment', value: b.open, kind: 'subtotal', offset: b.received },
    { key: 'overdue', ref: '6.8', label: 'Overdue open', value: b.overdue, kind: 'alert', offset: b.received },
    { key: 'notYetDue', ref: '6.8', label: 'Not yet due', value: b.notYetDue, kind: 'part', offset: b.received + b.overdue },
  ];
  const bars = rows
    .map(
      (r) => `<div class="bridge__row bridge__row--${r.kind}" data-bridge="${r.key}">
        <span class="bridge__label"><span class="kpi__ref">KPI ${r.ref}</span>${esc(r.label)}</span>
        <span class="bridge__track"><span class="bridge__bar" style="margin-left:${w(r.offset)};width:${w(r.value)}"></span></span>
        <span class="bridge__value figure" ${attr('procurement.bridge', r.key, r.value)}>${r.kind === 'minus' ? '−' : ''}${esc(usd(r.value))}</span>
      </div>`,
    )
    .join('');
  const checks = b.checks
    .map((c) => `<li data-check="${esc(c.id)}" class="${c.reconciles ? 'status-pass' : 'status-fail'}">${c.reconciles ? 'Reconciles' : `Does not reconcile (difference ${esc(usd(c.difference))})`}: ${esc(c.label)}</li>`)
    .join('');
  return `
    <section class="section" aria-labelledby="bridge-title">
      <div class="section__head"><h2 id="bridge-title">PO value bridge</h2><p>From gross PO line value to what is still open and overdue. PO-line grain; every line counted once.</p></div>
      <div class="panel" data-panel="bridge">
        <div class="bridge">${bars}</div>
        <ul class="bridge__checks">${checks}</ul>
        <p class="kpi__note">PO line values at PO unit price, not invoiced or paid spend. Overdue open = open quantity on lines whose recorded promised date is before ${esc(date(m.config.reportingAsOfDate))}.</p>
      </div>
    </section>`;
}

function headline(m) {
  const p = m.kpis.procurement;
  const ov = p.overdueOpen;
  const reg = p.register;
  const oldest = reg.items[0];
  const lateLines = m.kpis.delivery.overdueOpenPoLines;
  return `
    <section class="section" aria-labelledby="exposure-title">
      <div class="section__head"><h2 id="exposure-title">Open commitment past promise</h2><p>Measured at ${esc(date(m.config.reportingAsOfDate))} against the recorded promised date.</p></div>
      <div class="kpi-panel kpi-panel--four">
        <article class="kpi" data-card="overdue-value"><span class="kpi__ref">KPI 6.8</span><h3 class="kpi__label">Overdue open PO value</h3>
          <span class="kpi__value" ${attr('procurement.overdueOpen', 'value', ov.value)}>${esc(usdCompact(ov.value))}</span>
          <p class="kpi__context">${esc(percent(ov.sharePct, 1))} of ${esc(usd(ov.denominator))} open PO commitment</p>
          <ul class="kpi__lines"><li><span>Not yet due</span><span ${attr('procurement.overdueOpen', 'notYetDueValue', ov.notYetDueValue)}>${esc(usd(ov.notYetDueValue))}</span></li></ul></article>
        <article class="kpi" data-card="overdue-lines"><span class="kpi__ref">KPI 4.4</span><h3 class="kpi__label">Overdue open PO lines</h3>
          <span class="kpi__value" ${attr('delivery.overdueOpenPoLines', 'value', lateLines.value)}>${esc(integer(lateLines.value))}</span>
          <p class="kpi__context">of ${integer(lateLines.denominator)} PO lines with open quantity</p>
          <ul class="kpi__lines"><li><span>Overdue with nothing received</span><span ${attr('procurement.register', 'overdueNoReceipt', reg.overdueNoReceipt)}>${integer(reg.overdueNoReceipt)}</span></li></ul></article>
        <article class="kpi" data-card="oldest"><span class="kpi__ref">KPI 4.4.1</span><h3 class="kpi__label">Oldest overdue line</h3>
          <span class="kpi__value" ${attr('procurement.ageing', 'oldestDays', p.ageing.oldestDays)}>${isMissing(p.ageing.oldestDays) ? 'None' : esc(daysText(p.ageing.oldestDays))}</span>
          <p class="kpi__context">${oldest && oldest.overdue ? `${esc(oldest.po_line_id)}, ${esc(oldest.supplier_id)}, promised ${esc(date(oldest.promised_delivery_date))}` : 'No overdue lines'}</p></article>
        <article class="kpi" data-card="avg-line"><span class="kpi__ref">KPI 6.5</span><h3 class="kpi__label">Average gross PO line value</h3>
          <span class="kpi__value" ${attr('procurement.averageLine', 'value', p.averageLine.value)}>${esc(usdCompact(p.averageLine.value))}</span>
          <p class="kpi__context">${esc(usd(p.averageLine.value))} across ${integer(p.averageLine.n)} PO lines, including cancelled value</p></article>
      </div>
    </section>`;
}

function ageingSection(m) {
  const a = m.kpis.procurement.ageing;
  const total = a.items.reduce((s, i) => s + i.value, 0);
  const totalLines = a.items.reduce((s, i) => s + i.lines, 0);
  const byLines = [...a.items].sort((x, y) => y.lines - x.lines)[0];
  const byValue = [...a.items].sort((x, y) => y.value - x.value)[0];
  const lead = totalLines
    ? `Most lines: <strong>${esc(byLines.label.toLowerCase())}</strong> (${integer(byLines.lines)} of ${integer(totalLines)}). Most value: <strong>${esc(byValue.label.toLowerCase())}</strong> (${esc(usd(byValue.value))}, ${esc(percent((byValue.value / total) * 100, 1))}).`
    : 'No PO lines are overdue at this date.';
  const rows = a.items
    .map((i) => `<tr data-bucket="${esc(i.bucket)}"><th scope="row">${esc(i.label)}</th><td class="num">${i.maxDays === null ? `${i.minDays} or more` : `${i.minDays} to ${i.maxDays}`}</td><td class="num">${integer(i.lines)}</td><td class="num">${esc(usd(i.value))}</td><td class="num">${total ? esc(percent((i.value / total) * 100, 1)) : NA}</td></tr>`)
    .join('');
  return `
    <section class="section" aria-labelledby="ageing-title">
      <div class="section__head"><h2 id="ageing-title">Overdue ageing</h2><p>Days past the recorded promised date at ${esc(date(m.config.reportingAsOfDate))}. Lines not yet due are excluded (KPI 4.4.1).</p></div>
      <div class="support-grid support-grid--even">
        <div class="panel" data-panel="ageing">
          <p class="panel__lead panel__lead--insight" data-insight="ageing">${lead}</p>
          <div class="chart-box"><canvas id="ageing-chart" role="img" aria-label="Bar chart of overdue open PO value by ageing bucket. Figures are in the table beside it."></canvas></div>
        </div>
        <div class="panel">
          <h3>Ageing buckets</h3>
          <p class="panel__lead">Boundaries are inclusive (DEC-027).</p>
          <div class="table-wrap"><table class="data" data-table="ageing"><thead><tr><th scope="col">Bucket</th><th scope="col" class="num">Days past promise</th><th scope="col" class="num">Lines</th><th scope="col" class="num">Overdue open value</th><th scope="col" class="num">Share</th></tr></thead>
          <tbody>${rows}</tbody><tfoot><tr><th scope="row">Total</th><td></td><td class="num" ${attr('procurement.ageing', 'n', a.n)}>${integer(a.n)}</td><td class="num">${esc(usd(total))}</td><td class="num">${totalLines ? '100.0%' : NA}</td></tr></tfoot></table></div>
        </div>
      </div>
    </section>`;
}

function paretoSection(m) {
  const sr = m.kpis.procurement.supplierRows;
  const items = sr.items.filter((i) => !isMissing(i.sharePct));
  const n80 = sr.suppliersFor80Pct;
  const at80 = n80 ? items[n80 - 1].cumulativeSharePct : null;
  const lead = n80
    ? `<strong data-insight="pareto">${integer(n80)} of ${integer(items.length)} suppliers</strong> hold ${esc(percent(at80, 1))} of net active PO line value. The largest, ${esc(items[0].supplier_id)}, holds ${esc(percent(items[0].sharePct, 1))}.`
    : 'Not enough data to describe concentration.';
  return `
    <section class="section" aria-labelledby="pareto-title">
      <div class="section__head"><h2 id="pareto-title">Supplier concentration</h2><p>Share of net active PO line value by supplier, largest first, with cumulative share (KPI 6.4). Select a bar to open the supplier.</p></div>
      <div class="panel" data-panel="pareto">
        <p class="panel__lead panel__lead--insight">${lead}</p>
        <div class="chart-box chart-box--tall"><canvas id="pareto-chart" role="img" aria-label="Pareto chart of supplier share and cumulative share of net active PO value. Figures are in the supplier commitment table."></canvas></div>
        <p class="kpi__note">Dark bars together first reach 80%. PO value, not invoiced spend; no concentration index (DEC-028).</p>
      </div>
    </section>`;
}

function segmentSection(m) {
  const cfg = SEGMENTS[state.segment];
  const seg = m.kpis.procurement[cfg.key];
  let lead = '';
  if (state.segment === 'criticality') {
    const c = seg.items.find((g) => g.segment === 'Critical');
    if (c) lead = `Critical suppliers hold ${esc(percent(c.sharePct, 1))} of net active PO line value and <strong data-insight="critical-overdue">${esc(percent(c.overdueSharePct, 1))}</strong> of overdue open value (${esc(usd(c.overdueValue))}).`;
  } else if (seg.items.length) {
    const top = seg.items[0];
    const topOver = [...seg.items].sort((a, b) => b.overdueValue - a.overdueValue)[0];
    lead = `${esc(top.segment)} holds the most net active value (${esc(percent(top.sharePct, 1))}). The most overdue open value sits in ${esc(topOver.segment)} (${esc(percent(topOver.overdueSharePct, 1))}).`;
  }
  const items = state.segment === 'criticality' ? [...seg.items].sort((a, b) => CRIT_ORDER.indexOf(a.segment) - CRIT_ORDER.indexOf(b.segment)) : seg.items;
  const rows = items
    .map((g) => `<tr data-segment="${esc(g.segment)}"><th scope="row">${esc(g.segment)}</th><td class="num">${integer(g.suppliers)}</td><td class="num">${integer(g.poLines)}</td><td class="num">${money(g.netActiveValue)}</td><td class="num">${esc(percent(g.sharePct, 1))}</td><td class="num">${money(g.openValue)}</td><td class="num">${integer(g.overdueLines)}</td><td class="num">${money(g.overdueValue)}</td><td class="num">${esc(percent(g.overdueSharePct, 1))}</td></tr>`)
    .join('');
  const radios = Object.entries(SEGMENTS)
    .map(([k, v]) => `<label><input type="radio" name="segment" value="${k}"${state.segment === k ? ' checked' : ''}> ${esc(v.label)}</label>`)
    .join('');
  return `
    <section class="section" aria-labelledby="seg-title">
      <div class="section__head"><h2 id="seg-title">Commitment by segment</h2><p>Net active, open and overdue open PO value grouped at PO-line grain.</p></div>
      <div class="panel" data-panel="segments">
        <fieldset class="segmented segmented--wrap" data-control="segment"><legend>Group by</legend>${radios}</fieldset>
        <p class="panel__lead panel__lead--insight" data-insight="segment">${lead}</p>
        <div class="table-wrap"><table class="data" data-table="segments"><thead><tr><th scope="col">${esc(cfg.label)}</th><th scope="col" class="num">Suppliers</th><th scope="col" class="num">PO lines</th><th scope="col" class="num">Net active</th><th scope="col" class="num">Share</th><th scope="col" class="num">Open</th><th scope="col" class="num">Overdue lines</th><th scope="col" class="num">Overdue open</th><th scope="col" class="num">Share of overdue</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="kpi__note">${esc(cfg.note)} Values in USD; hover a value for the exact figure.</p>
      </div>
    </section>`;
}

const SUPPLIER_COLS = [
  { key: 'supplier', label: 'Supplier', sticky: true, sortValue: (r) => r.supplier_id },
  { key: 'criticality', label: 'Criticality', sortValue: (r) => (CRIT_ORDER.includes(r.criticality) ? CRIT_ORDER.indexOf(r.criticality) : 99) },
  { key: 'lines', label: 'PO lines', num: true, sortValue: (r) => r.poLines },
  { key: 'gross', label: 'Gross PO value', num: true, sortValue: (r) => r.grossValue },
  { key: 'cancelled', label: 'Cancelled', num: true, sortValue: (r) => r.cancelledValue },
  { key: 'net', label: 'Net active PO value', num: true, sortValue: (r) => r.netActiveValue },
  { key: 'share', label: 'Share', num: true, sortValue: (r) => r.sharePct },
  { key: 'open', label: 'Open', num: true, sortValue: (r) => r.openValue },
  { key: 'overdueLines', label: 'Overdue lines', num: true, sortValue: (r) => r.overdueLines },
  { key: 'overdue', label: 'Overdue open', num: true, sortValue: (r) => r.overdueValue },
  { key: 'oldest', label: 'Oldest overdue', num: true, sortValue: (r) => r.oldestOverdueDays },
  { key: 'gap', label: 'Avg promise gap', num: true, sortValue: (r) => r.avgPromiseGapDays },
].map((c) => ({ ...c, tie: (a, b) => a.supplier_id.localeCompare(b.supplier_id) }));

function supplierTable(m) {
  const sr = m.kpis.procurement.supplierRows;
  const f = state.supplierFilters;
  const q = f.search.trim().toLowerCase();
  const filtered = sr.items.filter(
    (r) =>
      (!f.criticality || r.criticality === f.criticality) &&
      (!f.overdue || (f.overdue === 'yes' ? r.overdueLines > 0 : r.overdueLines === 0)) &&
      (!q || `${r.supplier_id} ${r.supplier_name ?? ''}`.toLowerCase().includes(q)),
  );
  const col = SUPPLIER_COLS.find((c) => c.key === state.supplierSort.key) || SUPPLIER_COLS[5];
  const rows = sortRows(filtered, col, state.supplierSort.dir);
  const min = m.config.minimumSampleForRate;
  const body = rows
    .map((r) => {
      const gapFlag = r.gapLines > 0 && sampleSufficiency(r.gapLines, min) === 'limited' ? `<span class="sample-tag sample-tag--limited" data-sample="limited" title="Limited sample: ${r.gapLines} PO line${r.gapLines === 1 ? '' : 's'}. Averages based on fewer than ${min} records are flagged (DEC-025).">Limited sample</span>` : '';
      return `<tr data-supplier="${esc(r.supplier_id)}">
        <th scope="row" class="sticky"><a class="link-plain" href="#/suppliers/${encodeURIComponent(r.supplier_id)}" data-supplier-link="${esc(r.supplier_id)}" title="Open supplier detail in Supplier performance"><span class="sid">${esc(r.supplier_id)}</span> ${esc(r.supplier_name ?? '')}</a></th>
        <td><span class="crit crit--${esc((r.criticality || '').toLowerCase())}">${esc(r.criticality ?? NA)}</span></td>
        <td class="num">${integer(r.poLines)}</td>
        <td class="num" data-col="gross">${money(r.grossValue)}</td>
        <td class="num">${r.cancelledValue ? money(r.cancelledValue) : '<span class="muted">—</span>'}</td>
        <td class="num" data-col="net"><strong>${money(r.netActiveValue)}</strong></td>
        <td class="num">${esc(percent(r.sharePct, 1))}</td>
        <td class="num">${r.openValue ? money(r.openValue) : '<span class="muted">—</span>'}</td>
        <td class="num">${integer(r.overdueLines)}</td>
        <td class="num" data-col="overdue">${r.overdueValue ? money(r.overdueValue) : '<span class="muted">—</span>'}</td>
        <td class="num">${isMissing(r.oldestOverdueDays) ? '<span class="muted">—</span>' : esc(daysText(r.oldestOverdueDays))}</td>
        <td class="num">${isMissing(r.avgPromiseGapDays) ? '<span class="no-data">No data</span>' : `${esc(signed(r.avgPromiseGapDays))}${gapFlag}`}</td></tr>`;
    })
    .join('');
  return `
    <section class="section" aria-labelledby="sup-title">
      <div class="section__head"><h2 id="sup-title">Supplier commitment</h2><p>Gross (KPI 6.3) and net active PO value side by side; default order is net active value, largest first (DEC-032). Select a supplier to open its performance detail.</p></div>
      <div class="controls" role="group" aria-label="Supplier table filters">
        <label class="control">Criticality<select data-sfilter="criticality">${opts(CRIT_ORDER.filter((c) => sr.items.some((r) => r.criticality === c)), f.criticality)}</select></label>
        <label class="control">Overdue lines<select data-sfilter="overdue"><option value="">All</option><option value="yes"${f.overdue === 'yes' ? ' selected' : ''}>Has overdue lines</option><option value="no"${f.overdue === 'no' ? ' selected' : ''}>No overdue lines</option></select></label>
        <label class="control control--search">Search<input type="search" data-sfilter="search" value="${esc(f.search)}" placeholder="ID or name" autocomplete="off"></label>
        <button type="button" class="button-quiet" data-action="reset-suppliers">Reset table</button>
      </div>
      <p class="result-count" data-count="suppliers" aria-live="polite">Showing ${integer(rows.length)} of ${integer(sr.items.length)} suppliers.</p>
      ${rows.length ? '' : '<p class="empty" data-empty="suppliers">No suppliers match these filters. <button type="button" class="link-button" data-action="reset-suppliers">Reset table</button></p>'}
      <div class="table-wrap table-wrap--bounded"${rows.length ? '' : ' hidden'}><table class="data data--compare data--money" data-table="suppliers"><thead><tr>${sortHeader(SUPPLIER_COLS, state.supplierSort, 'suppliers')}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="kpi__note">Values in USD, shown rounded; hover for the exact figure. Avg promise gap = current promised date − requested date, averaged over the supplier's PO lines (KPI 4.7). Positive means later than requested.</p>
    </section>`;
}

const REGISTER_COLS = [
  { key: 'line', label: 'PO line', sticky: true, sortValue: (r) => r.po_line_id },
  { key: 'supplier', label: 'Supplier', sortValue: (r) => r.supplier_id },
  { key: 'material', label: 'Material', sortValue: (r) => r.material_id },
  { key: 'promised', label: 'Promised', sortValue: (r) => r.promised_delivery_date },
  { key: 'days', label: 'Days past promise', num: true, sortValue: (r) => r.daysPastPromised },
  { key: 'qty', label: 'Ordered / received / open', num: true, sortValue: (r) => r.open_qty },
  { key: 'value', label: 'Open value', num: true, sortValue: (r) => r.openValue },
  { key: 'status', label: 'Status', sortValue: (r) => r.po_status },
  { key: 'gap', label: 'Promise gap', num: true, sortValue: (r) => r.promiseGapDays },
].map((c) => ({ ...c, tie: (a, b) => a.po_line_id.localeCompare(b.po_line_id) }));

function registerSection(m) {
  const reg = m.kpis.procurement.register;
  const f = state.registerFilters;
  const q = f.search.trim().toLowerCase();
  const filtered = reg.items.filter(
    (r) =>
      (!f.due || (f.due === 'overdue' ? r.overdue : !r.overdue)) &&
      (!f.bucket || r.bucket === f.bucket) &&
      (!f.supplier || r.supplier_id === f.supplier) &&
      (!f.category || r.material_category === f.category) &&
      (!f.noReceipt || r.noReceipt) &&
      (!q || `${r.po_line_id} ${r.po_id} ${r.supplier_id} ${r.supplier_name ?? ''} ${r.material_id} ${r.material_description ?? ''}`.toLowerCase().includes(q)),
  );
  const col = REGISTER_COLS.find((c) => c.key === state.registerSort.key) || REGISTER_COLS[4];
  const rows = sortRows(filtered, col, state.registerSort.dir);
  const filteredValue = rows.reduce((s, r) => s + r.openValue, 0);
  const suppliers = [...new Set(reg.items.map((r) => r.supplier_id))].sort();
  const categories = [...new Set(reg.items.map((r) => r.material_category).filter(Boolean))].sort();
  const buckets = [['1-30', '1–30 days'], ['31-90', '31–90 days'], ['91-180', '91–180 days'], ['181+', 'Over 180 days'], ['not-due', 'Not yet due']];
  const body = rows
    .map(
      (r) => `<tr data-line="${esc(r.po_line_id)}" data-bucket="${esc(r.bucket)}"${r.overdue ? ' class="is-overdue"' : ''}>
        <th scope="row" class="sticky"><span class="sid">${esc(r.po_line_id)}</span><span class="cell-sub">${esc(r.po_id)}, ordered ${esc(date(r.order_date))}</span></th>
        <td><a class="link-plain" href="#/suppliers/${encodeURIComponent(r.supplier_id)}" data-supplier-link="${esc(r.supplier_id)}">${esc(r.supplier_id)}</a><span class="cell-sub">${esc(r.criticality ?? '')}</span></td>
        <td>${esc(r.material_id)}<span class="cell-sub cell-sub--wrap">${esc(r.material_description ?? '')}</span></td>
        <td>${esc(date(r.promised_delivery_date))}<span class="cell-sub">requested ${esc(date(r.requested_delivery_date))}</span></td>
        <td class="num" data-col="days">${r.overdue ? `<strong class="caution-text">${esc(daysText(r.daysPastPromised))}</strong>` : `<span class="muted">due in ${esc(daysText(-r.daysPastPromised))}</span>`}<span class="bucket-tag bucket-tag--${esc(r.bucket)}">${esc(r.bucketLabel)}</span></td>
        <td class="num">${integer(r.ordered_qty)} / ${integer(r.received_qty)} / <strong>${integer(r.open_qty)}</strong><span class="cell-sub">${esc(r.unit_of_measure)}${r.cancelled_qty ? `, ${integer(r.cancelled_qty)} cancelled` : ''}</span></td>
        <td class="num" data-col="value">${money(r.openValue)}</td>
        <td>${esc(r.po_status)}${r.noReceipt ? '<span class="cell-sub">Nothing received</span>' : ''}</td>
        <td class="num">${isMissing(r.promiseGapDays) ? '—' : esc(signed(r.promiseGapDays, 0))}</td></tr>`,
    )
    .join('');
  return `
    <section class="section" aria-labelledby="reg-title">
      <div class="section__head"><h2 id="reg-title">Expediting register</h2><p>Open PO lines, most overdue first. Days past promise use the recorded promised date at ${esc(date(m.config.reportingAsOfDate))}.</p></div>
      <div class="controls" role="group" aria-label="Register filters">
        <label class="control">Due status<select data-rfilter="due"><option value=""${f.due === '' ? ' selected' : ''}>All open lines</option><option value="overdue"${f.due === 'overdue' ? ' selected' : ''}>Overdue</option><option value="not-due"${f.due === 'not-due' ? ' selected' : ''}>Not yet due</option></select></label>
        <label class="control">Ageing<select data-rfilter="bucket"><option value="">All</option>${buckets.map(([v, l]) => `<option value="${v}"${f.bucket === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="control">Supplier<select data-rfilter="supplier">${opts(suppliers, f.supplier)}</select></label>
        <label class="control">Material category<select data-rfilter="category">${opts(categories, f.category)}</select></label>
        <label class="control control--check"><input type="checkbox" data-rfilter="noReceipt"${f.noReceipt ? ' checked' : ''}> Nothing received yet</label>
        <label class="control control--search">Search<input type="search" data-rfilter="search" value="${esc(f.search)}" placeholder="PO line, supplier or material" autocomplete="off"></label>
        <button type="button" class="button-quiet" data-action="reset-register">Reset register</button>
      </div>
      <p class="result-count" data-count="register" aria-live="polite">Showing ${integer(rows.length)} of ${integer(reg.items.length)} open PO lines, ${esc(usd(filteredValue))} open value.</p>
      ${rows.length ? '' : '<p class="empty" data-empty="register">No open PO lines match these filters. <button type="button" class="link-button" data-action="reset-register">Reset register</button></p>'}
      <div class="table-wrap table-wrap--bounded"${rows.length ? '' : ' hidden'}><table class="data data--compare data--register" data-table="register"><thead><tr>${sortHeader(REGISTER_COLS, state.registerSort, 'register')}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="kpi__note">Lines with no open quantity (closed or fully cancelled) are not listed. Promise gap = current promised date − requested date. CSV export is deferred (DEC-031).</p>
    </section>`;
}

function gapSection(m) {
  const g = m.kpis.procurement.promiseGap;
  return `
    <section class="section" aria-labelledby="gap-title">
      <div class="section__head"><h2 id="gap-title">Promised versus requested date</h2><p>Supporting indicator (KPI 4.7), based on the currently recorded promised date.</p></div>
      <div class="support-grid">
        <div class="panel" data-panel="gap">
          <p class="panel__lead panel__lead--insight" data-insight="gap"><strong>${integer(g.later)} of ${integer(g.n)}</strong> PO lines are promised later than requested, ${integer(g.same)} on the date, ${integer(g.earlier)} earlier. Average gap ${esc(signed(g.value))} (range ${esc(signed(g.min, 0))} to ${esc(signed(g.max, 0))}).</p>
          <div class="chart-box"><canvas id="gap-chart" role="img" aria-label="Bar chart of PO lines by promise-to-request gap in days."></canvas></div>
        </div>
        <div class="panel">
          <h3>How to read this</h3>
          <ul class="plain-list">
            <li>Gap = current promised date − requested date, for all ${integer(g.n)} PO lines${g.excluded ? ` (${integer(g.excluded)} excluded for a missing date)` : ''}.</li>
            <li>Positive: the supplier's current commitment is later than requested. Negative: earlier.</li>
            <li>The data holds only the current promised date. It does not show original promises, how often promises changed, or who requested a change.</li>
          </ul>
        </div>
      </div>
    </section>`;
}

function unsupported() {
  const items = [
    ['6.6', 'Actual invoiced spend', 'No invoice dataset is implemented. All values on this page are PO line values.'],
    ['4.5', 'Complete PO-line OTD', 'Original commitment dates and promise-revision history are not available.'],
    ['—', 'Purchase price variance', 'Not defined in the KPI Dictionary. There is no approved price baseline; standard cost is an inventory valuation.'],
    ['—', 'Savings, contract coverage and payment terms', 'Not defined in the KPI Dictionary and not held in the data.'],
    ['—', 'Alternate-source coverage', 'The material master holds one supplier per material; no alternate-source data exists (KPI 8.7 not supported).'],
  ];
  return `
    <section class="section" aria-labelledby="pns-title">
      <div class="section__head"><h2 id="pns-title">Not supported by the current data</h2><p>Not calculated or estimated on this page.</p></div>
      <dl class="unsupported">${items.map(([id, l, r]) => `<div data-unsupported="${esc(l)}"><dt>${esc(l)}${id !== '—' ? `<span class="muted">KPI ${esc(id)}</span>` : ''}</dt><dd>${esc(r)}</dd></div>`).join('')}</dl>
    </section>`;
}

/* ---------- render and interaction ---------- */

let model = null;
let host = null;

function draw() {
  const m = model;
  host.innerHTML = `
    ${titleBlock(m)}
    ${notices(m)}
    ${bridgeSection(m)}
    ${headline(m)}
    ${ageingSection(m)}
    ${paretoSection(m)}
    ${segmentSection(m)}
    ${supplierTable(m)}
    ${registerSection(m)}
    ${gapSection(m)}
    ${unsupported()}`;

  const p = m.kpis.procurement;
  const fallback = (sel) => host.querySelector(sel)?.replaceWith(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'The chart could not be drawn. The figures are in the table on this page.' }));
  if (!drawAgeingChart(host.querySelector('#ageing-chart'), p.ageing.items)) fallback('[data-panel="ageing"] .chart-box');
  const pareto = p.supplierRows.items.filter((i) => !isMissing(i.sharePct)).map((i) => ({ id: i.supplier_id, share: i.sharePct, cumulative: i.cumulativeSharePct }));
  if (!drawParetoChart(host.querySelector('#pareto-chart'), pareto, { onSelect: (id) => { location.hash = `#/suppliers/${id}`; } })) fallback('[data-panel="pareto"] .chart-box');
  if (!drawGapChart(host.querySelector('#gap-chart'), p.promiseGap.distribution)) fallback('[data-panel="gap"] .chart-box');
}

function rerender(focusSelector, caret) {
  const y = window.scrollY;
  draw();
  window.scrollTo(0, y);
  const el = focusSelector && host.querySelector(focusSelector);
  if (el) {
    el.focus({ preventScroll: true });
    if (caret !== undefined && el.setSelectionRange) el.setSelectionRange(caret, caret);
  }
}

function bind(container) {
  container.addEventListener('click', (e) => {
    if (!container.querySelector('[data-panel="bridge"]')) return; // only while this view is shown
    const t = e.target.closest('[data-sort-table], [data-action]');
    if (!t) return;
    if (t.dataset.sortTable) {
      const s = t.dataset.sortTable === 'suppliers' ? state.supplierSort : state.registerSort;
      const k = t.dataset.sort;
      s.dir = s.key === k && s.dir === 'desc' ? 'asc' : s.key === k ? 'desc' : ['supplier', 'line', 'material', 'promised', 'status', 'criticality'].includes(k) ? 'asc' : 'desc';
      s.key = k;
      rerender(`[data-sort-table="${t.dataset.sortTable}"][data-sort="${k}"]`);
    } else if (t.dataset.action === 'reset-suppliers') {
      state.supplierFilters = { criticality: '', overdue: '', search: '' };
      state.supplierSort = { ...DEFAULT_SUPPLIER_SORT };
      rerender('[data-sfilter="criticality"]');
    } else if (t.dataset.action === 'reset-register') {
      state.registerFilters = { due: '', bucket: '', supplier: '', category: '', noReceipt: false, search: '' };
      state.registerSort = { ...DEFAULT_REGISTER_SORT };
      rerender('[data-rfilter="due"]');
    }
  });
  container.addEventListener('change', (e) => {
    if (!container.querySelector('[data-panel="bridge"]')) return; // only while this view is shown
    const t = e.target;
    if (t.name === 'segment') {
      state.segment = t.value;
      rerender(`input[name="segment"][value="${t.value}"]`);
    } else if (t.dataset.sfilter && t.tagName === 'SELECT') {
      state.supplierFilters[t.dataset.sfilter] = t.value;
      rerender(`[data-sfilter="${t.dataset.sfilter}"]`);
    } else if (t.dataset.rfilter && (t.tagName === 'SELECT' || t.type === 'checkbox')) {
      const k = t.dataset.rfilter;
      state.registerFilters[k] = t.type === 'checkbox' ? t.checked : t.value;
      // Choosing an ageing bucket implies overdue lines; choosing "not yet due" implies that status.
      if (k === 'bucket' && t.value) state.registerFilters.due = t.value === 'not-due' ? 'not-due' : 'overdue';
      rerender(`[data-rfilter="${k}"]`);
    }
  });
  container.addEventListener('input', (e) => {
    if (!container.querySelector('[data-panel="bridge"]')) return; // only while this view is shown
    const t = e.target;
    if (t.dataset.sfilter === 'search' || t.dataset.rfilter === 'search') {
      const which = t.dataset.sfilter ? 'sfilter' : 'rfilter';
      (which === 'sfilter' ? state.supplierFilters : state.registerFilters).search = t.value;
      rerender(`[data-${which}="search"]`, t.selectionStart);
    }
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} m – { config, load, validation, kpis }
 */
export function renderProcurement(container, m) {
  model = m;
  host = container;
  if (!container.dataset.procurementBound) {
    bind(container);
    container.dataset.procurementBound = 'true';
  }
  draw();
}

/** For tests: restore default table state. */
export function resetProcurementViewState() {
  Object.assign(state, {
    segment: 'material_category',
    supplierSort: { ...DEFAULT_SUPPLIER_SORT },
    supplierFilters: { criticality: '', overdue: '', search: '' },
    registerSort: { ...DEFAULT_REGISTER_SORT },
    registerFilters: { due: '', bucket: '', supplier: '', category: '', noReceipt: false, search: '' },
  });
}
