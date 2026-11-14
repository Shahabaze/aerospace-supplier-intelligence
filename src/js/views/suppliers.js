/**
 * Supplier Performance view (Stage 5).
 *
 * Displays supplier-level results from the KPI engine:
 *   - kpis.suppliers.profiles       (KPI 8.4, one pass per source dataset)
 *   - kpis.suppliers.byCriticality  (pooled by suppliers.csv criticality)
 *   - kpis.suppliers.correctiveActions
 *   - supplierDetail()               (standard KPI functions scoped to one supplier)
 * No KPI is calculated here. Sorting and filtering only reorder and hide engine rows.
 * No composite risk score is produced (KPI Dictionary 8.5).
 */

import { usd, usdCompact, percent, integer, signedDays, date, esc, isMissing, NA } from '../format.js';
import { supplierDetail, sampleSufficiency } from '../kpis.js';
import { drawExposureChart, drawVarianceTimeline } from '../charts.js';
import { rowsOf } from '../data-loader.js';

/* ---------- view state (kept while the page is open) ---------- */

const state = {
  basis: 'snapshot', // 'snapshot' | 'full'
  sortKey: 'criticality',
  sortDir: 'asc',
  filters: { criticality: '', qualification: '', certification: '', sample: '', search: '' },
};

const CRIT_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const SAMPLE_TEXT = { none: 'No data', limited: 'Limited sample', sufficient: 'Sufficient sample' };

const basisFields = (basis) =>
  basis === 'snapshot'
    ? { n: 'deliveredEventsSnapshot', otd: 'otdSnapshotPct', late: 'lateEventsSnapshot', variance: 'avgVarianceDaysSnapshot', sample: 'deliverySampleSnapshot' }
    : { n: 'deliveredEventsFull', otd: 'otdFullPct', late: 'lateEventsFull', variance: 'avgVarianceDaysFull', sample: 'deliverySampleFull' };

const basisLabel = (basis, asOf) => (basis === 'snapshot' ? `snapshot period (delivered on or before ${date(asOf)})` : 'full dataset');

/* ---------- column definitions for the comparison table ---------- */

function columns(basis) {
  const b = basisFields(basis);
  return [
    { key: 'supplier', label: 'Supplier', sortValue: (p) => p.supplier_id, type: 'text' },
    { key: 'criticality', label: 'Criticality', sortValue: (p) => CRIT_ORDER.indexOf(p.criticality) + (CRIT_ORDER.includes(p.criticality) ? 0 : 99), type: 'text' },
    { key: 'qualification', label: 'Qualification', sortValue: (p) => p.qualification_status, type: 'text' },
    { key: 'certification', label: 'Certification', sortValue: (p) => p.certification_status, type: 'text' },
    { key: 'events', label: 'Delivered events', sortValue: (p) => p[b.n], type: 'num' },
    { key: 'otd', label: 'Delivery Event OTD', sortValue: (p) => p[b.otd], type: 'num' },
    { key: 'late', label: 'Late events', sortValue: (p) => (p[b.n] ? p[b.late] : null), type: 'num' },
    { key: 'variance', label: 'Avg variance', sortValue: (p) => p[b.variance], type: 'num' },
    { key: 'inspections', label: 'Inspections (units)', sortValue: (p) => p.inspections, type: 'num' },
    { key: 'rejection', label: 'Rejection rate', sortValue: (p) => p.rejectionRatePct, type: 'num' },
    { key: 'nc', label: 'Non­conform­ances', sortValue: (p) => p.nonconformances, type: 'num' },
    { key: 'openca', label: 'Open CAs', sortValue: (p) => p.openCorrectiveActions, type: 'num' },
    { key: 'share', label: 'Net active PO share', sortValue: (p) => p.netActiveSharePct, type: 'num' },
  ];
}

/** Sort with blanks (no data) always last, whichever direction is chosen. */
export function sortProfiles(items, basis, sortKey, sortDir) {
  const col = columns(basis).find((c) => c.key === sortKey) || columns(basis)[1];
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = col.sortValue(a);
    const vb = col.sortValue(b);
    const na = va === null || va === undefined;
    const nb = vb === null || vb === undefined;
    if (na && nb) return a.supplier_id.localeCompare(b.supplier_id);
    if (na) return 1;
    if (nb) return -1;
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return c !== 0 ? c * dir : a.supplier_id.localeCompare(b.supplier_id);
  });
}

export function filterProfiles(items, basis, f) {
  const b = basisFields(basis);
  const q = f.search.trim().toLowerCase();
  return items.filter(
    (p) =>
      (!f.criticality || p.criticality === f.criticality) &&
      (!f.qualification || p.qualification_status === f.qualification) &&
      (!f.certification || p.certification_status === f.certification) &&
      (!f.sample || p[b.sample] === f.sample) &&
      (!q || `${p.supplier_id} ${p.supplier_name ?? ''}`.toLowerCase().includes(q)),
  );
}

/* ---------- small helpers ---------- */

/**
 * DEC-025 sample indicator. `unit` names the records the rate rests on,
 * e.g. ['delivered event', 'delivered events'] or ['inspection record', 'inspection records'].
 */
let MIN_SAMPLE = 3;
const tag = (sample, n, unit) => {
  if (sample === 'sufficient') return '';
  const [one, many] = unit;
  const title =
    sample === 'none'
      ? `No data: 0 ${many}.`
      : `Limited sample: ${n} ${n === 1 ? one : many}. Rates based on fewer than ${MIN_SAMPLE} records are flagged (DEC-025).`;
  return `<span class="sample-tag sample-tag--${sample}" data-sample="${sample}" title="${esc(title)}">${sample === 'none' ? 'No data' : 'Limited sample'}</span>`;
};
const DELIVERY_UNIT = ['delivered event', 'delivered events'];
const INSPECTION_UNIT = ['inspection record', 'inspection records'];

function rateCell(value, n, sample, unit, digits = 1, title = '') {
  if (isMissing(value)) return `<span class="no-data" data-sample="none" title="${esc(`No data: 0 ${unit[1]}.`)}">No data</span>`;
  return `<span class="figure"${title ? ` title="${esc(title)}"` : ''}>${esc(percent(value, digits))}</span>${tag(sample, n, unit)}`;
}

const options = (values, current, allLabel) =>
  `<option value="">${esc(allLabel)}</option>` + values.map((v) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(v)}</option>`).join('');

const unique = (items, field, order) => {
  const vals = [...new Set(items.map((i) => i[field]).filter((v) => v !== null))];
  return order ? vals.sort((a, b) => order.indexOf(a) - order.indexOf(b)) : vals.sort();
};

/* ---------- sections ---------- */

function titleBlock(m, profiles) {
  const k = m.kpis;
  const withSnap = profiles.filter((p) => p.deliveredEventsSnapshot > 0).length;
  const s = m.validation.summary;
  return `
    <section class="title-block" aria-label="Report details">
      <div class="title-block__title">
        <h1 id="page-title" tabindex="-1">Supplier performance</h1>
        <p>Delivery-event and inspection performance for each supplier, with classification from the supplier master. Rates show their sample size; small samples are labelled.</p>
      </div>
      <div><span class="tb-label">Reporting period</span><span class="tb-value">${esc(date(m.config.reportingPeriodStart))} – ${esc(date(m.config.reportingAsOfDate))}</span></div>
      <div><span class="tb-label">Suppliers</span><span class="tb-value" data-tb="suppliers">${integer(profiles.length)}, ${integer(withSnap)} with deliveries in period</span></div>
      <div><span class="tb-label">Validation</span><span class="tb-value ${s.allPassed ? 'tb-value--pass' : 'tb-value--fail'}">${s.controlsPassed} of ${s.controlsTotal} controls passed</span></div>
      <div><span class="tb-label">Delivered events</span><span class="tb-value" data-tb="events">${integer(k.delivery.otdSnapshot.denominator)} in period, ${integer(k.delivery.otdFull.denominator)} in full dataset</span></div>
      <div><span class="tb-label">Inspection records</span><span class="tb-value" data-tb="inspections">${integer(k.quality.rejectionRate.n)}, ${integer(k.quality.rejectionRate.denominator)} units</span></div>
      <div><span class="tb-label">Sample rule</span><span class="tb-value" data-tb="sample-rule">Limited below ${integer(m.config.minimumSampleForRate)} records</span></div>
    </section>`;
}

function notices(m) {
  const out = [];
  if (!m.validation.summary.allPassed) {
    out.push(`<div class="banner banner--fail" role="alert" data-banner="validation-fail"><strong>Some data checks did not pass.</strong> Supplier figures are shown for diagnosis only. See Data quality on the <a href="#/executive">Executive dashboard</a>.</div>`);
  }
  const n01 = m.validation.notices.find((n) => n.id === 'N01');
  if (n01) {
    const delivered = n01.items.filter((e) => e.delivery_status === 'Delivered').length;
    out.push(`<div class="banner banner--caution" data-banner="period"><strong>${integer(delivered)} delivered events fall after ${esc(date(m.config.reportingAsOfDate))}.</strong> Choose the snapshot-period basis to exclude them, or the full-dataset basis to include them. Source data is unchanged (DEC-017).</div>`);
  }
  return out.join('');
}

function baseline(m) {
  const d = m.kpis.delivery;
  const q = m.kpis.quality;
  const ca = m.kpis.suppliers.correctiveActions;
  const statusCounts = {};
  for (const r of ca) statusCounts[r.corrective_action_status] = (statusCounts[r.corrective_action_status] || 0) + 1;
  const caLines = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li><span>${esc(k)}</span><span>${integer(n)}</span></li>`).join('');
  return `
    <section class="section" aria-labelledby="baseline-title">
      <div class="section__head"><h2 id="baseline-title">Portfolio baseline</h2><p>The reference point for each supplier below.</p></div>
      <div class="kpi-panel kpi-panel--four">
        <article class="kpi" data-card="base-otd"><span class="kpi__ref">KPI 4.1</span><h3 class="kpi__label">Delivery Event OTD</h3>
          <span class="kpi__value" data-kpi-key="delivery.otdSnapshot" data-kpi-field="value" data-value="${esc(d.otdSnapshot.value ?? '')}">${esc(percent(d.otdSnapshot.value, 1))}</span>
          <p class="kpi__context">${integer(d.otdSnapshot.numerator)} of ${integer(d.otdSnapshot.denominator)} events, snapshot period</p>
          <ul class="kpi__lines"><li><span>Full dataset</span><span>${esc(percent(d.otdFull.value, 1))} (${integer(d.otdFull.numerator)} of ${integer(d.otdFull.denominator)})</span></li></ul></article>
        <article class="kpi" data-card="base-late"><span class="kpi__ref">KPI 4.2, 4.3</span><h3 class="kpi__label">Late delivery events</h3>
          <span class="kpi__value" data-kpi-key="delivery.lateSnapshot" data-kpi-field="value" data-value="${esc(d.lateSnapshot.value ?? '')}">${esc(integer(d.lateSnapshot.value))}</span>
          <p class="kpi__context">Average variance ${esc(signedDays(d.varianceSnapshot.value))}, snapshot period</p>
          <ul class="kpi__lines"><li><span>Full dataset</span><span>${integer(d.lateFull.value)} late, ${esc(signedDays(d.varianceFull.value))}</span></li></ul></article>
        <article class="kpi" data-card="base-rejection"><span class="kpi__ref">KPI 5.1, 5.3</span><h3 class="kpi__label">Inspection rejection rate</h3>
          <span class="kpi__value" data-kpi-key="quality.rejectionRate" data-kpi-field="value" data-value="${esc(q.rejectionRate.value ?? '')}">${esc(percent(q.rejectionRate.value, 2))}</span>
          <p class="kpi__context">${integer(q.rejectionRate.numerator)} of ${integer(q.rejectionRate.denominator)} units rejected</p>
          <ul class="kpi__lines"><li><span>Nonconformance inspections</span><span>${integer(q.nonconformances.value)}</span></li></ul></article>
        <article class="kpi" data-card="base-ca"><span class="kpi__ref">KPI 5.4, 5.5</span><h3 class="kpi__label">Corrective actions</h3>
          <span class="kpi__value" data-kpi-key="quality.openCorrectiveActions" data-kpi-field="value" data-value="${esc(q.openCorrectiveActions.value ?? '')}">${esc(integer(q.openCorrectiveActions.value))} open</span>
          <p class="kpi__context">of ${integer(q.openCorrectiveActions.n)} required</p>
          <ul class="kpi__lines">${caLines}</ul></article>
      </div>
    </section>`;
}

function segments(m) {
  const sampleOf = (n) => sampleSufficiency(n, m.config.minimumSampleForRate);
  const seg = m.kpis.suppliers.byCriticality.items;
  const crit = seg.find((g) => g.segment === 'Critical');
  const totalSnap = m.kpis.delivery.otdSnapshot.denominator;
  const lead = crit
    ? `Critical suppliers hold <strong data-insight="critical-share">${esc(percent(crit.netActiveSharePct, 1))}</strong> of net active PO line value but account for <strong data-insight="critical-events">${integer(crit.deliveredEventsSnapshot)} of ${integer(totalSnap)}</strong> delivered events in the period, so their delivery performance rests on very little evidence.`
    : '';
  const rows = seg
    .map(
      (g) => `<tr data-segment="${esc(g.segment)}">
        <th scope="row">${esc(g.segment)}</th>
        <td class="num">${integer(g.suppliers)}</td>
        <td class="num">${esc(percent(g.netActiveSharePct, 1))}</td>
        <td class="num">${integer(g.deliveredEventsSnapshot)}</td>
        <td class="num">${rateCell(g.otdSnapshotPct, g.deliveredEventsSnapshot, sampleOf(g.deliveredEventsSnapshot), DELIVERY_UNIT)}</td>
        <td class="num">${integer(g.deliveredEventsFull)}</td>
        <td class="num">${rateCell(g.otdFullPct, g.deliveredEventsFull, sampleOf(g.deliveredEventsFull), DELIVERY_UNIT)}</td>
        <td class="num">${integer(g.inspectedQty)}<span class="cell-sub">${integer(g.inspections)} records</span></td>
        <td class="num">${rateCell(g.rejectionRatePct, g.inspections, sampleOf(g.inspections), INSPECTION_UNIT, 2)}</td>
        <td class="num">${integer(g.nonconformances)}</td>
        <td class="num">${integer(g.openCorrectiveActions)}</td></tr>`,
    )
    .join('');
  return `
    <section class="section" aria-labelledby="seg-title">
      <div class="section__head"><h2 id="seg-title">Performance by supplier criticality</h2><p>Criticality from suppliers.csv. Rates pooled across each group.</p></div>
      <div class="panel">
        <p class="panel__lead panel__lead--insight">${lead}</p>
        <div class="table-wrap"><table class="data" data-table="segments">
          <thead><tr><th scope="col">Criticality</th><th scope="col" class="num">Suppliers</th><th scope="col" class="num">Net active PO share</th><th scope="col" class="num">Events in period</th><th scope="col" class="num">OTD in period</th><th scope="col" class="num">Events, full</th><th scope="col" class="num">OTD, full</th><th scope="col" class="num">Inspected units (records)</th><th scope="col" class="num">Rejection rate</th><th scope="col" class="num">Nonconform­ances</th><th scope="col" class="num">Open CAs</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
      </div>
    </section>`;
}

function exposureSection(m, profiles) {
  const b = basisFields(state.basis);
  const plotted = profiles.filter((p) => !isMissing(p[b.otd]) && !isMissing(p.netActiveSharePct) && p.netActiveSharePct > 0);
  const notPlotted = profiles.filter((p) => !plotted.includes(p));
  const portfolio = state.basis === 'snapshot' ? m.kpis.delivery.otdSnapshot.value : m.kpis.delivery.otdFull.value;
  const top5 = [...profiles].sort((a, b2) => (b2.netActiveSharePct ?? 0) - (a.netActiveSharePct ?? 0)).slice(0, 5);
  const top5Share = top5.reduce((s, p) => s + (p.netActiveSharePct ?? 0), 0);
  const top5NoData = top5.filter((p) => isMissing(p[b.otd]));
  const top5Below = top5.filter((p) => !isMissing(p[b.otd]) && portfolio !== null && p[b.otd] < portfolio);
  const top5Limited = top5.filter((p) => p[b.sample] === 'limited');
  const list = (arr) => arr.map((p) => esc(p.supplier_id)).join(', ') || 'none';
  return `
    <section class="section" aria-labelledby="exp-title">
      <div class="section__head"><h2 id="exp-title">Delivery performance against PO exposure</h2><p>Basis: ${esc(basisLabel(state.basis, m.config.reportingAsOfDate))}.</p></div>
      <div class="panel" data-panel="exposure">
        <p class="panel__lead panel__lead--insight" data-insight="top5">The top 5 suppliers hold <strong>${esc(percent(top5Share, 1))}</strong> of net active PO value: ${top5Below.length} below the ${esc(percent(portfolio, 1))} portfolio OTD (${list(top5Below)}), ${top5Limited.length} with fewer than ${integer(m.config.minimumSampleForRate)} delivered events (${list(top5Limited)}), ${top5NoData.length} with none (${list(top5NoData)}).</p>
        <div class="chart-box chart-box--tall"><canvas id="exposure-chart" role="img" aria-label="Bubble chart of each supplier's share of net active PO value against its Delivery Event OTD. Figures are in the comparison table."></canvas></div>
        <p class="kpi__note">Bubble size shows delivered events; pale bubbles have a limited sample. Select a bubble to open the supplier. Not plotted (no delivered events): <span data-not-plotted>${list(notPlotted)}</span>.</p>
      </div>
    </section>`;
}

function comparison(m, profiles) {
  const cols = columns(state.basis);
  const b = basisFields(state.basis);
  const f = state.filters;
  const shown = sortProfiles(filterProfiles(profiles, state.basis, f), state.basis, state.sortKey, state.sortDir);

  const head = cols
    .map((c) => {
      const active = c.key === state.sortKey;
      const aria = active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
      const arrow = active ? (state.sortDir === 'asc' ? '▲' : '▼') : '';
      return `<th scope="col" class="${c.type === 'num' ? 'num' : ''}${c.key === 'supplier' ? ' sticky' : ''}" aria-sort="${aria}"><button type="button" class="sort" data-sort="${c.key}">${esc(c.label)}<span class="sort__arrow" aria-hidden="true">${arrow}</span></button></th>`;
    })
    .join('');

  const rows = shown
    .map((p) => {
      const sel = p.supplier_id === state.selected;
      const late = p[b.n] ? integer(p[b.late]) : '<span class="no-data">No data</span>';
      const variance = isMissing(p[b.variance]) ? '<span class="no-data">No data</span>' : esc(signedDays(p[b.variance]));
      return `<tr data-supplier="${esc(p.supplier_id)}"${sel ? ' class="is-selected" aria-current="true"' : ''}>
        <th scope="row" class="sticky"><button type="button" class="link-button" data-select="${esc(p.supplier_id)}"><span class="sid">${esc(p.supplier_id)}</span> ${esc(p.supplier_name ?? '')}</button></th>
        <td><span class="crit crit--${esc((p.criticality || '').toLowerCase())}">${esc(p.criticality ?? NA)}</span></td>
        <td>${esc(p.qualification_status ?? NA)}</td>
        <td>${esc(p.certification_status ?? NA)}</td>
        <td class="num">${integer(p[b.n])}</td>
        <td class="num" data-col="otd">${rateCell(p[b.otd], p[b.n], p[b.sample], DELIVERY_UNIT)}</td>
        <td class="num">${late}</td>
        <td class="num">${variance}</td>
        <td class="num" data-col="inspections">${integer(p.inspections)}${p.inspections ? `<span class="cell-sub" data-col="inspected-units">${integer(p.inspectedQty)} units</span>` : ''}</td>
        <td class="num" data-col="rejection">${rateCell(p.rejectionRatePct, p.inspections, p.inspectionSample, INSPECTION_UNIT, 2, isMissing(p.rejectionRatePct) ? '' : `${integer(p.rejectedQty)} rejected of ${integer(p.inspectedQty)} inspected units, ${integer(p.inspections)} inspection records`)}</td>
        <td class="num">${integer(p.nonconformances)}</td>
        <td class="num">${integer(p.openCorrectiveActions)}</td>
        <td class="num">${esc(percent(p.netActiveSharePct, 1))}</td></tr>`;
    })
    .join('');

  const empty = shown.length ? '' : `<p class="empty" data-empty>No suppliers match these filters. <button type="button" class="link-button" data-action="reset">Clear filters</button></p>`;

  return `
    <section class="section" aria-labelledby="cmp-title">
      <div class="section__head"><h2 id="cmp-title">Supplier comparison</h2><p>Select a column heading to sort; blanks always sort last. Select a supplier to see its detail.</p></div>
      <div class="controls" role="group" aria-label="Table controls">
        <fieldset class="segmented" data-control="basis"><legend>Delivery basis</legend>
          <label><input type="radio" name="basis" value="snapshot"${state.basis === 'snapshot' ? ' checked' : ''}> Snapshot period</label>
          <label><input type="radio" name="basis" value="full"${state.basis === 'full' ? ' checked' : ''}> Full dataset</label>
        </fieldset>
        <label class="control">Criticality<select data-filter="criticality">${options(unique(profiles, 'criticality', CRIT_ORDER), f.criticality, 'All')}</select></label>
        <label class="control">Qualification<select data-filter="qualification">${options(unique(profiles, 'qualification_status'), f.qualification, 'All')}</select></label>
        <label class="control">Certification<select data-filter="certification">${options(unique(profiles, 'certification_status'), f.certification, 'All')}</select></label>
        <label class="control">Delivery sample<select data-filter="sample"><option value="">All</option>${['sufficient', 'limited', 'none'].map((s) => `<option value="${s}"${f.sample === s ? ' selected' : ''}>${SAMPLE_TEXT[s]}</option>`).join('')}</select></label>
        <label class="control control--search">Search<input type="search" data-filter="search" value="${esc(f.search)}" placeholder="ID or name" autocomplete="off"></label>
        <button type="button" class="button-quiet" data-action="reset">Clear filters</button>
      </div>
      <p class="result-count" data-count aria-live="polite">Showing ${integer(shown.length)} of ${integer(profiles.length)} suppliers. Delivery columns use the ${esc(basisLabel(state.basis, m.config.reportingAsOfDate))}.</p>
      ${empty}
      <div class="table-wrap table-wrap--bounded"${shown.length ? '' : ' hidden'}><table class="data data--compare" data-table="compare">
        <thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="sample-legend" data-legend="sample">
        <p><strong>Sample rule (DEC-025), minimum ${integer(m.config.minimumSampleForRate)} records:</strong></p>
        <ul>
          <li><span class="sample-tag sample-tag--none">No data</span> 0 records. The rate is left blank, never 0%.</li>
          <li><span class="sample-tag sample-tag--limited">Limited sample</span> 1 to ${integer(m.config.minimumSampleForRate - 1)} records. The rate is shown but rests on very little evidence.</li>
          <li>${integer(m.config.minimumSampleForRate)} or more records: the rate is shown without a flag.</li>
        </ul>
        <p>Delivery Event OTD counts delivered events on the selected basis. Rejection rate counts inspection records; its denominator is inspected units, shown under the inspection count. Criticality, qualification and certification come from suppliers.csv.</p>
      </div>
    </section>`;
}

function detailSection(m) {
  if (!state.selected) {
    return `<section class="section" id="supplier-detail" aria-labelledby="det-title"><div class="section__head"><h2 id="det-title">Supplier detail</h2></div>
      <div class="panel empty-panel" data-detail-empty><p>Select a supplier in the comparison table or the chart to see its delivery events, inspections and PO position.</p></div></section>`;
  }
  const det = supplierDetail(rowsOf(m.load), state.selected, { asOfDate: m.config.reportingAsOfDate });
  if (!det) {
    return `<section class="section" id="supplier-detail"><div class="banner banner--caution" data-detail-missing>Supplier ${esc(state.selected)} is not in the supplier master. <a href="#/suppliers">Clear selection</a></div></section>`;
  }
  const s = det.supplier;
  const p = m.kpis.suppliers.profiles.items.find((x) => x.supplier_id === s.supplier_id);
  const dl = det.delivery;
  const q = det.quality;
  const pr = det.procurement;
  const min = m.config.minimumSampleForRate;
  const word = (n, one, many) => (n === 1 ? one : many);
  const sampleNote = (n, one, many) =>
    n === 0
      ? `<span class="sample-tag sample-tag--none" data-sample="none" title="No data: 0 ${many}.">No data: 0 ${many}</span>`
      : n < min
        ? `<span class="sample-tag sample-tag--limited" data-sample="limited" title="Rates based on fewer than ${min} records are flagged (DEC-025).">Limited sample: ${n} ${word(n, one, many)}</span>`
        : '';
  const attr = (k, field = 'value', key) => `data-detail-key="${key}" data-kpi-field="${field}" data-value="${isMissing(k[field]) ? '' : esc(k[field])}"`;

  const delivered = det.events.filter((e) => e.delivery_status === 'Delivered');
  const eventRows = det.events
    .map((e) => `<tr${e.inSnapshotPeriod ? '' : ' class="out-of-period"'}>
      <td>${esc(e.delivery_id)}</td><td>${esc(e.po_line_id)}</td><td>${esc(e.material_id)}<br><span class="muted">${esc(e.material_description ?? '')}</span></td>
      <td>${esc(e.delivery_status)}</td><td>${esc(date(e.promised_delivery_date))}</td><td>${e.actual_delivery_date ? esc(date(e.actual_delivery_date)) : '—'}</td>
      <td class="num">${isMissing(e.delivery_variance_days) ? '—' : esc(signedDays(e.delivery_variance_days, 0))}</td>
      <td>${e.on_time_flag === 1 ? 'On time' : e.on_time_flag === 0 ? '<span class="late">Late</span>' : '—'}</td>
      <td>${e.inSnapshotPeriod ? 'In period' : '<span class="caution-text">After as-of date</span>'}</td></tr>`)
    .join('');
  const inspRows = det.inspections
    .map((i) => `<tr${i.quality_result === 'Nonconformance' ? ' class="nc"' : ''}>
      <td>${esc(i.inspection_id)}</td><td>${esc(date(i.inspection_date))}</td><td>${esc(i.inspection_type)}</td>
      <td class="num">${integer(i.inspected_qty)}</td><td class="num">${integer(i.rejected_qty)}</td><td>${esc(i.quality_result)}</td>
      <td>${i.quality_result === 'Nonconformance' ? `${esc(i.defect_category)}, ${esc(i.severity)}${i.ncr_id ? `, ${esc(i.ncr_id)}` : ''}` : '—'}</td>
      <td>${i.corrective_action_required === 'Yes' ? `${esc(i.corrective_action_status)}${i.root_cause_category ? `<br><span class="muted">${esc(i.root_cause_category)}</span>` : ''}${isMissing(i.corrective_action_closure_days) ? '' : `<br><span class="muted">Closed in ${integer(i.corrective_action_closure_days)} days</span>`}` : '—'}</td></tr>`)
    .join('');

  return `
    <section class="section" id="supplier-detail" aria-labelledby="det-title" data-detail="${esc(s.supplier_id)}">
      <div class="detail-head">
        <div>
          <span class="kpi__ref">Supplier detail</span>
          <h2 id="det-title" tabindex="-1">${esc(s.supplier_id)} ${esc(s.supplier_name)}</h2>
          <p class="muted">${esc(s.country)}, ${esc(s.supplier_category)}, ${esc(s.supplier_tier)}. Primary commodity: ${esc(s.commodity)}. Onboarded ${esc(date(s.onboarding_date))}.</p>
        </div>
        <dl class="profile-facts">
          <div><dt>Criticality</dt><dd><span class="crit crit--${esc(s.criticality.toLowerCase())}" data-fact="criticality">${esc(s.criticality)}</span></dd></div>
          <div><dt>Qualification</dt><dd data-fact="qualification">${esc(s.qualification_status)}</dd></div>
          <div><dt>Certification</dt><dd data-fact="certification">${esc(s.certification_status)}</dd></div>
          <div><dt>Supplier status</dt><dd>${esc(s.supplier_status)}</dd></div>
        </dl>
      </div>

      <div class="kpi-panel kpi-panel--four">
        <article class="kpi" data-card="det-otd"><span class="kpi__ref">KPI 4.1</span><h3 class="kpi__label">Delivery Event OTD</h3>
          <span class="kpi__value${isMissing(dl.otdSnapshot.value) ? ' kpi__value--na' : ''}" ${attr(dl.otdSnapshot, 'value', 'delivery.otdSnapshot')}>${isMissing(dl.otdSnapshot.value) ? 'No data' : esc(percent(dl.otdSnapshot.value, 1))}</span>
          <p class="kpi__context">${integer(dl.otdSnapshot.numerator)} of ${integer(dl.otdSnapshot.denominator)} ${word(dl.otdSnapshot.denominator, 'event', 'events')} in period ${sampleNote(dl.otdSnapshot.denominator, 'delivered event', 'delivered events')}</p>
          <ul class="kpi__lines"><li><span>Full dataset</span><span ${attr(dl.otdFull, 'value', 'delivery.otdFull')}>${isMissing(dl.otdFull.value) ? 'No data' : `${esc(percent(dl.otdFull.value, 1))} (${integer(dl.otdFull.numerator)} of ${integer(dl.otdFull.denominator)})${dl.otdFull.denominator < min ? ' <span class="sample-tag sample-tag--limited" data-sample="limited">Limited sample</span>' : ''}`}</span></li>
          <li><span>Portfolio, in period</span><span>${esc(percent(m.kpis.delivery.otdSnapshot.value, 1))}</span></li></ul></article>
        <article class="kpi" data-card="det-late"><span class="kpi__ref">KPI 4.2, 4.3</span><h3 class="kpi__label">Late delivery events</h3>
          <span class="kpi__value" ${attr(dl.lateSnapshot, 'value', 'delivery.lateSnapshot')}>${integer(dl.lateSnapshot.value)}</span>
          <p class="kpi__context">in period, average variance ${esc(signedDays(dl.varianceSnapshot.value))}</p>
          <ul class="kpi__lines"><li><span>Full dataset</span><span>${integer(dl.lateFull.value)} late, ${esc(signedDays(dl.varianceFull.value))}</span></li>
          <li><span>In transit</span><span>${integer(det.events.length - delivered.length)}</span></li></ul></article>
        <article class="kpi" data-card="det-quality"><span class="kpi__ref">KPI 5.1, 5.3, 5.4</span><h3 class="kpi__label">Inspection rejection rate</h3>
          <span class="kpi__value${isMissing(q.rejectionRate.value) ? ' kpi__value--na' : ''}" ${attr(q.rejectionRate, 'value', 'quality.rejectionRate')}>${isMissing(q.rejectionRate.value) ? 'No data' : esc(percent(q.rejectionRate.value, 2))}</span>
          <p class="kpi__context">${integer(q.rejectionRate.numerator)} of ${integer(q.rejectionRate.denominator)} units, ${integer(q.rejectionRate.n)} ${word(q.rejectionRate.n, 'inspection record', 'inspection records')} ${sampleNote(q.rejectionRate.n, 'inspection record', 'inspection records')}</p>
          <ul class="kpi__lines"><li><span>Nonconformance inspections</span><span>${integer(q.nonconformances.value)}</span></li>
          <li><span>Open corrective actions</span><span>${integer(q.openCorrectiveActions.value)} of ${integer(q.openCorrectiveActions.n)}</span></li></ul></article>
        <article class="kpi" data-card="det-po"><span class="kpi__ref">KPI 6.1.2, 6.4, 6.2, 4.4</span><h3 class="kpi__label">Net active PO line value</h3>
          <span class="kpi__value" ${attr(pr.netActive, 'value', 'procurement.netActive')}>${esc(usdCompact(pr.netActive.value))}</span>
          <p class="kpi__context">${esc(percent(pr.sharePct, 1))} of portfolio net active value</p>
          <ul class="kpi__lines"><li><span>Open PO commitment</span><span>${esc(usd(pr.openCommitment.value))}</span></li>
          <li><span>Open lines past promised date</span><span>${integer(dl.overdueOpenPoLines.value)} of ${integer(dl.overdueOpenPoLines.denominator)}</span></li></ul></article>
      </div>

      <div class="detail-grid">
        <div class="panel" data-panel="timeline">
          <h3>Delivery timing</h3>
          <p class="panel__lead">Days late (+) or early (−) for each delivered event, including events after the as-of date.</p>
          ${delivered.length ? '<div class="chart-box"><canvas id="timeline-chart" role="img" aria-label="Scatter chart of delivery variance for each delivered event. Figures are in the delivery events table."></canvas></div>' : '<p class="no-data" data-timeline-empty>No delivered events for this supplier.</p>'}
        </div>
        <div class="panel">
          <h3>What this profile can and cannot show</h3>
          <ul class="plain-list">
            <li>Delivery figures are per delivery event, not per PO line, and are not OTIF.</li>
            <li>Quality figures cover inspections linked to delivered events only.</li>
            <li>Criticality, qualification and certification are taken from the supplier master.</li>
            <li>No overall risk score is calculated; financial and continuity risk data are not available.</li>
          </ul>
        </div>
      </div>

      <details class="notice" open data-table-wrap="events"><summary><span>Delivery events (${integer(det.events.length)})</span></summary>
        <div class="notice__body">${det.events.length ? `<div class="table-wrap"><table class="data" data-table="events"><thead><tr><th>Delivery</th><th>PO line</th><th>Material</th><th>Status</th><th>Promised</th><th>Delivered</th><th class="num">Variance</th><th>Result</th><th>Period</th></tr></thead><tbody>${eventRows}</tbody></table></div>` : '<p>No delivery events recorded.</p>'}</div></details>
      <details class="notice" open data-table-wrap="inspections"><summary><span>Inspections (${integer(det.inspections.length)})</span></summary>
        <div class="notice__body">${det.inspections.length ? `<div class="table-wrap"><table class="data" data-table="inspections"><thead><tr><th>Inspection</th><th>Date</th><th>Type</th><th class="num">Inspected</th><th class="num">Rejected</th><th>Result</th><th>Defect</th><th>Corrective action</th></tr></thead><tbody>${inspRows}</tbody></table></div>` : '<p>No inspection records.</p>'}</div></details>
    </section>`;
}

function correctiveActions(m) {
  const reg = m.kpis.suppliers.correctiveActions;
  const rows = reg
    .map((r) => `<tr data-ca="${esc(r.inspection_id)}"><td><button type="button" class="link-button" data-select="${esc(r.supplier_id)}">${esc(r.supplier_id)} ${esc(r.supplier_name ?? '')}</button></td>
      <td>${esc(r.ncr_id ?? '—')}</td><td>${esc(date(r.inspection_date))}</td><td>${esc(r.defect_category)}, ${esc(r.severity)}</td><td>${esc(r.root_cause_category ?? '—')}</td>
      <td>${r.isOpen ? `<span class="caution-text">${esc(r.corrective_action_status)}</span>` : esc(r.corrective_action_status)}</td>
      <td class="num">${isMissing(r.corrective_action_closure_days) ? '—' : integer(r.corrective_action_closure_days)}</td></tr>`)
    .join('');
  return `
    <section class="section" aria-labelledby="ca-title">
      <div class="section__head"><h2 id="ca-title">Corrective-action register</h2><p>All inspection-linked corrective actions. Due dates are not held in the data, so on-time closure cannot be measured (KPI 5.6).</p></div>
      <div class="panel"><div class="table-wrap"><table class="data" data-table="ca"><thead><tr><th>Supplier</th><th>NCR</th><th>Inspected</th><th>Defect</th><th>Root cause</th><th>Status</th><th class="num">Closure days</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    </section>`;
}

/* ---------- render and interaction ---------- */

let currentModel = null;
let currentContainer = null;

function draw(m, container) {
  MIN_SAMPLE = m.config.minimumSampleForRate;
  const profiles = m.kpis.suppliers.profiles.items;
  container.innerHTML = `
    ${titleBlock(m, profiles)}
    ${notices(m)}
    ${baseline(m)}
    ${segments(m)}
    ${exposureSection(m, profiles)}
    ${comparison(m, profiles)}
    ${detailSection(m)}
    ${correctiveActions(m)}`;

  const b = basisFields(state.basis);
  const pts = profiles
    .filter((p) => !isMissing(p[b.otd]) && p.netActiveSharePct > 0)
    .map((p) => ({ id: p.supplier_id, label: `${p.supplier_id} ${p.supplier_name ?? ''}`, x: p.netActiveSharePct, y: p[b.otd], n: p[b.n], minSample: m.config.minimumSampleForRate }));
  const portfolio = state.basis === 'snapshot' ? m.kpis.delivery.otdSnapshot.value : m.kpis.delivery.otdFull.value;
  const ok = drawExposureChart(container.querySelector('#exposure-chart'), pts, { portfolioOtd: portfolio, basisLabel: state.basis === 'snapshot' ? 'snapshot period' : 'full dataset', onSelect: select });
  if (!ok) container.querySelector('[data-panel="exposure"] .chart-box')?.replaceWith(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'The chart could not be drawn. The figures are in the comparison table.' }));

  if (state.selected) {
    const det = supplierDetail(rowsOf(m.load), state.selected, { asOfDate: m.config.reportingAsOfDate });
    const canvas = container.querySelector('#timeline-chart');
    if (det && canvas) {
      const toMs = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
      const points = det.events
        .filter((e) => e.delivery_status === 'Delivered' && e.actual_delivery_date && !isMissing(e.delivery_variance_days))
        .map((e) => ({ id: e.delivery_id, t: toMs(e.actual_delivery_date), y: e.delivery_variance_days, onTime: e.on_time_flag === 1, inPeriod: e.inSnapshotPeriod }));
      drawVarianceTimeline(canvas, points, { asOfMs: toMs(m.config.reportingAsOfDate), startMs: toMs(m.config.reportingPeriodStart) });
    }
  }
}

function select(id) {
  // Navigation keeps the selection in the address, so it can be bookmarked or shared.
  if (location.hash !== `#/suppliers/${id}`) location.hash = `#/suppliers/${id}`;
}

function bind(container) {
  // Handlers act only while this view is shown in the container (other views reuse attribute names).
  const active = () => container === currentContainer && container.querySelector('[data-table="compare"]');
  container.addEventListener('click', (e) => {
    if (!active()) return;
    const t = e.target.closest('[data-sort], [data-select], [data-action]');
    if (!t) return;
    if (t.dataset.sort) {
      const k = t.dataset.sort;
      state.sortDir = state.sortKey === k && state.sortDir === 'asc' ? 'desc' : 'asc';
      state.sortKey = k;
      rerender(`[data-sort="${k}"]`);
    } else if (t.dataset.select) {
      select(t.dataset.select);
    } else if (t.dataset.action === 'reset') {
      state.filters = { criticality: '', qualification: '', certification: '', sample: '', search: '' };
      rerender('[data-filter="criticality"]');
    }
  });
  container.addEventListener('change', (e) => {
    if (!active()) return;
    const t = e.target;
    if (t.name === 'basis') {
      state.basis = t.value;
      rerender(`input[name="basis"][value="${t.value}"]`);
    } else if (t.dataset.filter && t.tagName === 'SELECT') {
      state.filters[t.dataset.filter] = t.value;
      rerender(`[data-filter="${t.dataset.filter}"]`);
    }
  });
  container.addEventListener('input', (e) => {
    if (!active()) return;
    const t = e.target;
    if (t.dataset.filter === 'search') {
      state.filters.search = t.value;
      const pos = t.selectionStart;
      rerender('[data-filter="search"]', pos);
    }
  });
}

/** Re-renders and restores focus to the control the user was using. */
function rerender(focusSelector, caret) {
  const y = window.scrollY;
  draw(currentModel, currentContainer);
  window.scrollTo(0, y);
  const el = focusSelector && currentContainer.querySelector(focusSelector);
  if (el) {
    el.focus({ preventScroll: true });
    if (caret !== undefined && el.setSelectionRange) el.setSelectionRange(caret, caret);
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} model – { config, load, validation, kpis }
 * @param {{ selectedId?: string|null }} params
 */
export function renderSuppliers(container, model, { selectedId = null } = {}) {
  currentModel = model;
  if (currentContainer !== container) {
    currentContainer = container;
  }
  if (!container.dataset.suppliersBound) {
    bind(container);
    container.dataset.suppliersBound = 'true';
  }
  const changed = state.selected !== selectedId;
  state.selected = selectedId;
  draw(model, container);
  if (selectedId && changed) {
    const h = container.querySelector('#det-title');
    if (h) {
      h.scrollIntoView({ block: 'start' });
      h.focus({ preventScroll: true });
    }
  }
}

/** For tests: reset table state to defaults. */
export function resetSupplierViewState() {
  Object.assign(state, { basis: 'snapshot', sortKey: 'criticality', sortDir: 'asc', filters: { criticality: '', qualification: '', certification: '', sample: '', search: '' }, selected: undefined });
}
