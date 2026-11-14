/**
 * Executive Dashboard view.
 *
 * Displays results produced by the KPI engine (kpis.js) and validation layer (validation.js).
 * This file performs no KPI calculations of its own: it only selects, labels and formats
 * values it is given. Every KPI element carries data-kpi-id and data-value attributes so
 * tests can confirm the displayed figure is the engine's figure.
 */

import { usd, usdCompact, percent, integer, signedDays, date, esc, plural, isMissing, NA } from '../format.js';
import { drawConcentrationChart } from '../charts.js';

/* ---------- small builders ---------- */

/** Engine path of each KPI result object (e.g. "delivery.otdSnapshot"), filled at render time. */
let PATHS = new Map();
function indexPaths(kpis) {
  PATHS = new Map();
  for (const [group, obj] of Object.entries(kpis)) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [name, k] of Object.entries(obj)) if (k && typeof k === 'object') PATHS.set(k, `${group}.${name}`);
    }
  }
}

const kpiAttr = (k, field = 'value') =>
  `data-kpi-id="${esc(k.kpiId)}" data-kpi-key="${esc(PATHS.get(k) ?? '')}" data-kpi-field="${field}" data-value="${isMissing(k[field]) ? '' : esc(k[field])}"`;

function value(k, formatter, field = 'value') {
  const v = k[field];
  if (isMissing(v)) return `<span ${kpiAttr(k, field)} class="kpi__value kpi__value--na">${NA}</span>`;
  return `<span ${kpiAttr(k, field)} class="kpi__value">${esc(formatter(v))}</span>`;
}

function inline(k, formatter, field = 'value') {
  const v = k[field];
  return `<span ${kpiAttr(k, field)}>${esc(isMissing(v) ? NA : formatter(v))}</span>`;
}

function card({ id, refs, label, valueHtml, context, lines = [], note, reason }) {
  const li = lines
    .map((l) => `<li${l.total ? ' class="total"' : ''}><span>${l.label}</span><span>${l.value}</span></li>`)
    .join('');
  return `
    <article class="kpi" data-card="${id}" aria-labelledby="kpi-${id}-label">
      <span class="kpi__ref">${esc(refs)}</span>
      <h3 class="kpi__label" id="kpi-${id}-label">${esc(label)}</h3>
      ${valueHtml}
      ${context ? `<p class="kpi__context">${context}</p>` : ''}
      ${reason ? `<p class="kpi__context muted">${esc(reason)}</p>` : ''}
      ${li ? `<ul class="kpi__lines">${li}</ul>` : ''}
      ${note ? `<p class="kpi__note">${esc(note)}</p>` : ''}
    </article>`;
}

/* ---------- sections ---------- */

function titleBlock(m) {
  const { config, validation, load } = m;
  const records = Object.values(load.datasets).reduce((s, ds) => s + ds.rows.length, 0);
  const files = Object.keys(load.datasets).length;
  const c = validation.summary;
  const ok = c.controlsPassed === c.controlsTotal;
  return `
    <section class="title-block" aria-label="Report details">
      <div class="title-block__title">
        <h1 id="page-title" tabindex="-1">Executive dashboard</h1>
        <p>Supplier delivery, PO commitment, quality and inventory position for the reporting period. All figures are calculated in your browser from the source CSV files.</p>
      </div>
      <div><span class="tb-label">Reporting period</span><span class="tb-value" data-tb="period">${esc(date(config.reportingPeriodStart))} – ${esc(date(config.reportingAsOfDate))}</span></div>
      <div><span class="tb-label">As of (snapshot)</span><span class="tb-value" data-tb="asof">${esc(date(config.reportingAsOfDate))}</span></div>
      <div><span class="tb-label">Validation</span><span class="tb-value ${ok ? 'tb-value--pass' : 'tb-value--fail'}" data-tb="validation">${c.controlsPassed} of ${c.controlsTotal} controls passed</span></div>
      <div><span class="tb-label">Source data</span><span class="tb-value" data-tb="source">${files} CSV files, ${integer(records)} records</span></div>
      <div><span class="tb-label">Data model</span><span class="tb-value">Version ${esc(config.documentVersions.dataModel)}</span></div>
      <div><span class="tb-label">KPI dictionary</span><span class="tb-value">Version ${esc(config.documentVersions.kpiDictionary)}</span></div>
    </section>`;
}

function validationTable(v) {
  const rows = [...v.controls, ...v.supplementary]
    .map(
      (c) => `<tr data-check="${esc(c.id)}" data-status="${esc(c.status)}">
        <td>${esc(c.id)}</td><td>${esc(c.title)}${c.status !== 'pass' && c.failures.length ? `<br><span class="status-fail">${esc(c.failures.slice(0, 3).map((f) => `${f.key}: ${f.detail}`).join('; '))}${c.failureCount > 3 ? ` (and ${c.failureCount - 3} more)` : ''}</span>` : ''}${c.status === 'not_run' ? `<br><span class="status-fail">${esc(c.detail)}</span>` : ''}</td>
        <td>${esc(c.reference)}</td><td class="num">${integer(c.checked)}</td>
        <td class="${c.status === 'pass' ? 'status-pass' : 'status-fail'}">${c.status === 'pass' ? 'Passed' : c.status === 'not_run' ? 'Not run' : 'Failed'}</td></tr>`,
    )
    .join('');
  return `<div class="table-wrap"><table class="data"><thead><tr><th>ID</th><th>Check</th><th>Reference</th><th class="num">Values checked</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function noticeTable(notice) {
  if (!notice.items?.length) return '';
  if (notice.id === 'N01') {
    const rows = notice.items.map((e) => `<tr><td>${esc(e.delivery_id)}</td><td>${esc(e.po_line_id)}</td><td>${esc(e.supplier_id)}</td><td>${esc(e.delivery_status)}</td><td>${esc(date(e.shipment_date))}</td><td>${esc(e.actual_delivery_date ? date(e.actual_delivery_date) : '—')}</td></tr>`).join('');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Delivery</th><th>PO line</th><th>Supplier</th><th>Status</th><th>Shipped</th><th>Delivered</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (notice.id === 'N02') {
    const rows = notice.items.map((i) => `<tr><td>${esc(i.material_id)}</td><td class="num">${integer(i.on_hand_qty)}</td><td class="num">${integer(i.available_qty)}</td><td class="num">${integer(i.safety_stock_qty)}</td><td class="num">${integer(i.reorder_point_qty)}</td><td>${esc(i.supplied_status)}</td><td>${esc(i.available_basis)}</td></tr>`).join('');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Material</th><th class="num">On hand</th><th class="num">Available</th><th class="num">Safety stock</th><th class="num">Reorder point</th><th>Supplied status (on-hand)</th><th>Available-stock basis</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (notice.id === 'N03') {
    return `<p class="muted">PO lines: ${esc(notice.items.map((i) => i.po_line_id).join(', '))}</p>`;
  }
  return '';
}

const NOTICE_TEXT = {
  N01: (n, asOf) => ({
    title: `${plural(n.items.length, 'delivery event')} fall outside the reporting period`,
    body: `${plural(n.items.filter((e) => e.delivery_status === 'Delivered').length, 'event')} were delivered after ${date(asOf)} and ${plural(n.items.filter((e) => e.delivery_status !== 'Delivered').length, 'event')} shipped after it. The source data is unchanged. Delivery Event OTD is therefore shown for the snapshot period and for the full dataset. These quantities are also included in PO received and open quantities.`,
  }),
  N02: (n) => ({
    title: 'Inventory KPIs use available stock; the supplied inventory status uses on-hand stock',
    body: `Available stock is on-hand stock minus quantity already allocated to demand, so it is the stricter measure. ${n.items.length ? `${plural(n.items.length, 'material')} ${n.items.length === 1 ? 'is' : 'are'} classified differently on the two bases:` : 'No material is classified differently on the two bases.'}`,
  }),
  N03: (n) => ({
    title: 'Gross PO line value includes cancelled quantities',
    body: `${plural(n.items.length, 'PO line')} carry cancelled quantity. Net active PO line value excludes it and is the figure used for commitment and supplier concentration.`,
  }),
};

function dataQuality(m) {
  const { validation: v, config } = m;
  const s = v.summary;
  const banner = s.allPassed
    ? `<div class="banner banner--pass" data-banner="validation-pass"><strong>All ${s.controlsTotal} data model controls and ${s.supplementaryTotal} supplementary checks passed.</strong> Keys, references, quantity and value reconciliations, dates and blank values were checked before any KPI was calculated.</div>`
    : `<div class="banner banner--fail" role="alert" data-banner="validation-fail"><strong>${plural(s.failed.length + s.notRun.length, 'check')} did not pass (${esc([...s.failed, ...s.notRun].join(', '))}).</strong> The figures below are shown for diagnosis only and should not be relied on until the source data is corrected. See the validation checks for details.</div>`;

  const notices = v.notices
    .map((n) => {
      const t = NOTICE_TEXT[n.id]?.(n, config.reportingAsOfDate) || { title: n.title, body: n.detail };
      const tag = n.severity === 'warning' ? '<span class="notice__tag notice__tag--warning">Caution</span>' : '<span class="notice__tag notice__tag--info">Note</span>';
      return `<details class="notice" data-notice="${esc(n.id)}" data-severity="${esc(n.severity)}">
        <summary>${tag}<span>${esc(t.title)} <span class="muted notice__decision">(${esc(n.decision)})</span></span></summary>
        <div class="notice__body"><p>${esc(t.body)}</p>${noticeTable(n)}</div></details>`;
    })
    .join('');

  const checksTag = s.allPassed ? '<span class="notice__tag notice__tag--pass">Passed</span>' : '<span class="notice__tag notice__tag--fail">Failed</span>';
  return `
    <section class="section" aria-labelledby="dq-title">
      <div class="section__head"><h2 id="dq-title">Data quality</h2><p>Checked in your browser each time the data loads.</p></div>
      ${banner}
      <div class="notices">
        <details class="notice" data-notice="checks" data-severity="${s.allPassed ? 'info' : 'warning'}" ${s.allPassed ? '' : 'open'}>
          <summary>${checksTag}<span>Validation checks: ${s.controlsPassed} of ${s.controlsTotal} data model controls, ${s.supplementaryPassed} of ${s.supplementaryTotal} supplementary checks</span></summary>
          <div class="notice__body">${validationTable(v)}</div>
        </details>
        ${notices}
      </div>
    </section>`;
}

function headlineKpis(m) {
  const k = m.kpis;
  const asOf = date(m.config.reportingAsOfDate);
  const d = k.delivery;
  const p = k.procurement;
  const q = k.quality;
  const inv = k.inventory;
  const outsideCount = d.otdFull.denominator - d.otdSnapshot.denominator;

  const cards = [
    card({
      id: 'otd',
      refs: 'KPI 4.1',
      label: 'Delivery Event OTD',
      valueHtml: value(d.otdSnapshot, (v) => percent(v, 1)),
      context: `${inline(d.otdSnapshot, integer, 'numerator')} of ${inline(d.otdSnapshot, integer, 'denominator')} delivered events on time, delivered on or before ${esc(asOf)}`,
      reason: isMissing(d.otdSnapshot.value) ? d.otdSnapshot.reason : null,
      lines: [
        { label: 'Full dataset', value: `${inline(d.otdFull, (v) => percent(v, 1))} (${inline(d.otdFull, integer, 'numerator')} of ${inline(d.otdFull, integer, 'denominator')})` },
        { label: 'Delivered after the as-of date', value: integer(outsideCount) },
      ],
      note: 'Delivery-event measure. Not PO-line OTD or OTIF: a PO line can have several partial deliveries.',
    }),
    card({
      id: 'late',
      refs: 'KPI 4.2, 4.3',
      label: 'Late delivery events',
      valueHtml: value(d.lateSnapshot, integer),
      context: `of ${inline(d.lateSnapshot, integer, 'denominator')} delivered events in the reporting period arrived after the promised date`,
      lines: [
        { label: 'Full dataset', value: `${inline(d.lateFull, integer)} of ${inline(d.lateFull, integer, 'denominator')}` },
        { label: 'Average variance in period', value: inline(d.varianceSnapshot, (v) => signedDays(v, 1)) },
      ],
      note: 'Variance is actual minus promised delivery date. Positive means late.',
    }),
    card({
      id: 'open-po',
      refs: 'KPI 6.2, 4.4',
      label: 'Open PO commitment',
      valueHtml: value(p.openCommitment, usdCompact),
      context: `${inline(p.openCommitment, usd)} across ${inline(p.openCommitment, integer, 'n')} PO lines with open quantity`,
      lines: [
        { label: `Open lines past promised date at ${esc(asOf)}`, value: `${inline(d.overdueOpenPoLines, integer)} of ${inline(d.overdueOpenPoLines, integer, 'denominator')}` },
      ],
      note: 'Value of outstanding PO quantity at the recorded unit price. Not an invoice liability. Overdue is measured against the currently recorded promise date.',
    }),
    card({
      id: 'net-active',
      refs: 'KPI 6.1, 6.1.1, 6.1.2',
      label: 'Net active PO line value',
      valueHtml: value(p.netActive, usdCompact),
      context: 'Received and open PO line value, excluding cancellations',
      lines: [
        { label: 'Gross PO line value', value: inline(p.gross, usd) },
        { label: `Cancelled (${inline(p.cancelled, integer, 'n')} lines)`, value: `−${inline(p.cancelled, usd)}` },
        { label: 'Net active PO line value', value: inline(p.netActive, usd), total: true },
      ],
      note: 'PO line value, not invoiced or paid spend. No invoice data is available.',
    }),
    card({
      id: 'rejection',
      refs: 'KPI 5.1, 5.7, 5.3, 5.4',
      label: 'Inspection rejection rate',
      valueHtml: value(q.rejectionRate, (v) => percent(v, 2)),
      context: `${inline(q.rejectionRate, integer, 'numerator')} of ${inline(q.rejectionRate, integer, 'denominator')} inspected units rejected`,
      lines: [
        { label: 'Defects per million units', value: inline(q.dpm, integer) },
        { label: 'Nonconformance inspections', value: inline(q.nonconformances, integer) },
        { label: 'Open corrective actions', value: inline(q.openCorrectiveActions, integer) },
      ],
      note: 'Quantity-weighted across all recorded inspection events. Covers inspections linked to delivered events only.',
    }),
    card({
      id: 'inventory',
      refs: 'KPI 7.1, 7.2, 7.3, 7.4',
      label: 'On-hand inventory value',
      valueHtml: value(inv.onHandValue, usdCompact),
      context: `${inline(inv.onHandValue, usd)} across ${inline(inv.onHandValue, integer, 'n')} physical materials at ${esc(date(inv.onHandValue.asOfDate))}`,
      lines: [
        { label: 'Available (unallocated) value', value: inline(inv.availableValue, usd) },
        { label: 'Below reorder point', value: `${inline(inv.belowReorderPoint, integer)} materials` },
        { label: 'Below safety stock', value: `${inline(inv.safetyStockBreaches, integer)} materials` },
      ],
      note: 'SERVICE materials excluded. Reorder and safety-stock counts use available stock. Single snapshot, not a trend.',
    }),
  ];

  return `
    <section class="section" aria-labelledby="kpi-title">
      <div class="section__head"><h2 id="kpi-title">Headline indicators</h2><p>Reporting period ${esc(date(m.config.reportingPeriodStart))} to ${esc(asOf)}. Currency USD.</p></div>
      <div class="kpi-panel">${cards.join('')}</div>
    </section>`;
}

function concentrationBars(items, topN = 8) {
  const top = items.slice(0, topN);
  const rest = items.slice(topN);
  const bars = top.map((i) => ({ label: `${i.supplier_id} ${i.supplier_name ?? ''}`.trim(), value: i.concentrationPct ?? 0, id: i.supplier_id }));
  if (rest.length) {
    bars.push({ label: `Other ${rest.length} suppliers`, value: rest.reduce((s, i) => s + (i.concentrationPct ?? 0), 0), isOther: true, id: 'other' });
  }
  return bars;
}

function supportingPanels(m) {
  const c = m.kpis.procurement.concentration;
  const items = c.items.filter((i) => !isMissing(i.concentrationPct));
  const bars = concentrationBars(items);
  const top2 = items.slice(0, 2);
  const top2Share = top2.reduce((s, i) => s + i.concentrationPct, 0);
  const lead = top2.length === 2
    ? `${esc(top2[0].supplier_id)} and ${esc(top2[1].supplier_id)} together hold <span data-kpi-id="6.4" data-kpi-field="top2" data-value="${esc(top2Share)}">${esc(percent(top2Share, 1))}</span> of net active PO line value (${esc(usd(c.denominator))}).`
    : 'Not enough supplier data to describe concentration.';
  const tableRows = bars.map((b) => `<tr><td>${esc(b.label)}</td><td class="num">${esc(percent(b.value, 2))}</td></tr>`).join('');

  const s = m.kpis.suppliers;
  const dist = (k) => Object.entries(k.value).sort((a, b) => b[1] - a[1]).map(([name, n]) => `<li><span>${esc(name)}</span><span>${integer(n)}</span></li>`).join('');

  return `
    <section class="section support-grid" aria-label="Supporting detail">
      <div class="panel" data-panel="concentration">
        <h3>Supplier concentration</h3>
        <p class="panel__lead">${lead}</p>
        <div class="chart-box"><canvas id="concentration-chart" role="img" aria-label="Bar chart of supplier share of net active PO line value. The same figures are in the table below."></canvas></div>
        <details class="notice" style="margin-top:0.75rem">
          <summary><span>Show figures as a table</span></summary>
          <div class="notice__body"><div class="table-wrap"><table class="data" data-table="concentration"><thead><tr><th>Supplier</th><th class="num">Share</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>
        </details>
        <p class="kpi__note">KPI 6.4 (net active basis since KPI Dictionary v2.2): supplier net active PO line value divided by total net active PO line value. Concentration of PO value, not of invoiced spend.</p>
      </div>
      <div class="panel" data-panel="supplier-base">
        <h3>Supplier base</h3>
        <p class="panel__lead">Classification from the supplier master.</p>
        <div class="big-stat"><span class="figure" ${kpiAttr(s.critical)}>${esc(integer(s.critical.value))}</span><span>of ${integer(s.critical.denominator)} suppliers classified critical</span></div>
        <div class="stat-group"><h4>Qualification status</h4><ul class="stat-list">${dist(s.qualification)}</ul></div>
        <div class="stat-group"><h4>Certification status</h4><ul class="stat-list">${dist(s.certification)}</ul></div>
        <p class="kpi__note">KPI 8.1 to 8.3. Certification status is an assessment status; certificate expiry dates are not held in the data.</p>
      </div>
    </section>`;
}

function unsupported(m) {
  const items = m.kpis.notSupported
    .map((k) => `<div data-unsupported="${esc(k.kpiId)}"><dt>${esc(k.label)}<span class="muted">KPI ${esc(k.kpiId)}</span></dt><dd>${esc(k.reason)}</dd></div>`)
    .join('');
  return `
    <section class="section" aria-labelledby="ns-title">
      <div class="section__head"><h2 id="ns-title">Not supported by the current data</h2><p>These measures are not calculated or estimated. Each needs data that the six source files do not contain.</p></div>
      <dl class="unsupported">${items}</dl>
    </section>`;
}

/* ---------- entry point ---------- */

/**
 * @param {HTMLElement} container
 * @param {{config, load, validation, kpis}} model
 */
export function renderExecutive(container, model) {
  indexPaths(model.kpis);
  container.innerHTML = `
    ${titleBlock(model)}
    ${dataQuality(model)}
    ${headlineKpis(model)}
    ${supportingPanels(model)}
    ${unsupported(model)}`;

  const items = model.kpis.procurement.concentration.items.filter((i) => !isMissing(i.concentrationPct));
  const drawn = drawConcentrationChart(container.querySelector('#concentration-chart'), concentrationBars(items));
  if (!drawn) {
    const box = container.querySelector('.chart-box');
    if (box) box.outerHTML = '<p class="muted" data-chart-fallback>The chart could not be drawn. The figures are available in the table below.</p>';
  }
}
