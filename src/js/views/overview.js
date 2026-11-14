/**
 * Command centre: a dark, chart-first overview of the whole dashboard.
 * Every figure comes from the KPI engine results (kpis.js); nothing is calculated
 * here except grouping and display. Full definitions and tables stay in the four modules.
 */

import { esc, percent, integer, usdCompact, date, isMissing, NA } from '../format.js';
import { drawHudMap, drawHudPareto, drawHudBars, drawHudPairedBars, drawHudDoughnut, HUD } from '../charts.js';

/**
 * Approximate country centre points (latitude, longitude) used only to place each country
 * on the footprint chart. They are not supplier site locations.
 */
const COUNTRY_POINTS = {
  'United States': [39, -98], Canada: [56, -106], Mexico: [23, -102], Brazil: [-10, -52],
  'United Kingdom': [54, -2], Ireland: [53.4, -8], France: [46.6, 2.2], Spain: [40, -4],
  Netherlands: [52.1, 5.3], Germany: [51, 10], Switzerland: [46.8, 8.2], Italy: [42.8, 12.5],
  'Czech Republic': [49.8, 15.5], Poland: [52, 19], Sweden: [62, 15], 'United Arab Emirates': [24, 54],
  India: [22, 79], Malaysia: [4, 102], Singapore: [1.35, 103.8], 'South Korea': [36, 128],
  Japan: [36, 138], Australia: [-25, 134],
};

const POSITION_ORDER = ['Below safety stock', 'Below reorder point', 'At or above reorder point'];

/** SVG ring gauge for a 0–100% value. */
function ring({ key, kpi, label, pct, display, sub, href, warn }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = isMissing(pct) ? 0 : Math.max(0, Math.min(100, pct));
  const offset = c * (1 - p / 100);
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI;
    const r1 = 59, r2 = i % 5 === 0 ? 55 : 57;
    return `<line x1="${(60 + r1 * Math.sin(a)).toFixed(2)}" y1="${(60 - r1 * Math.cos(a)).toFixed(2)}" x2="${(60 + r2 * Math.sin(a)).toFixed(2)}" y2="${(60 - r2 * Math.cos(a)).toFixed(2)}"/>`;
  }).join('');
  return `
    <a class="hud-ring${warn ? ' hud-ring--warn' : ''}" href="${href}" data-ring="${key}" data-value="${isMissing(pct) ? '' : esc(pct)}">
      <svg viewBox="0 0 120 120" role="img" aria-label="${esc(`${label}: ${display}. ${sub}`)}">
        <g class="hud-ring__ticks" aria-hidden="true">${ticks}</g>
        <circle class="hud-ring__track" cx="60" cy="60" r="${r}"/>
        <circle class="hud-ring__arc" cx="60" cy="60" r="${r}" style="--c:${c.toFixed(2)};--o:${offset.toFixed(2)}" transform="rotate(-90 60 60)"/>
        <text x="60" y="64" class="hud-ring__value" aria-hidden="true">${esc(display)}</text>
      </svg>
      <span class="hud-ring__label">${esc(label)} <span class="hud-ref">${esc(kpi)}</span></span>
      <span class="hud-ring__sub">${esc(sub)}</span>
    </a>`;
}

function figure({ key, kpi, label, value, sub, warn }) {
  return `
    <div class="hud-fig${warn ? ' hud-fig--warn' : ''}" data-fig="${key}">
      <span class="hud-fig__label">${esc(label)} <span class="hud-ref">${esc(kpi)}</span></span>
      <span class="hud-fig__value">${esc(value)}</span>
      <span class="hud-fig__sub">${esc(sub)}</span>
    </div>`;
}

function panel({ key, title, kpi, figure: fig, chartLabel, href, linkText, wide = '' }) {
  return `
    <section class="hud-panel ${wide}" data-hud="${key}" aria-labelledby="hud-${key}">
      <div class="hud-panel__head">
        <h2 id="hud-${key}">${esc(title)}</h2>
        <span class="hud-ref">${esc(kpi)}</span>
      </div>
      <p class="hud-panel__fig">${fig}</p>
      <div class="hud-chart"><canvas id="hud-${key}-chart" role="img" aria-label="${esc(chartLabel)}"></canvas></div>
      <a class="hud-panel__link" href="${href}">${esc(linkText)}</a>
    </section>`;
}

/** Builds every number the page shows from the engine results. */
export function overviewModel(m) {
  const k = m.kpis;
  const otd = k.delivery.otdSnapshot;
  const overdue = k.procurement.overdueOpen;
  const sr = k.procurement.supplierRows;
  const n80 = sr.suppliersFor80Pct;
  const pareto = sr.items.filter((i) => !isMissing(i.sharePct));
  const rop = k.inventory.belowReorderPoint;

  const countries = k.procurement.byCountry.items
    .filter((c) => COUNTRY_POINTS[c.segment])
    .map((c) => ({ segment: c.segment, lat: COUNTRY_POINTS[c.segment][0], lon: COUNTRY_POINTS[c.segment][1], value: c.netActiveValue, overdue: c.overdueValue, suppliers: c.suppliers }));
  const unplaced = k.procurement.byCountry.items.filter((c) => !COUNTRY_POINTS[c.segment]).map((c) => c.segment);

  const physical = k.inventory.register.items.filter((r) => r.physical);
  const positions = POSITION_ORDER.map((p) => physical.filter((r) => r.stockPosition === p).length);

  const profiles = new Map(k.suppliers.profiles.items.map((p) => [p.supplier_id, p]));
  const minSample = k.suppliers.profiles.minSample;
  const topSuppliers = pareto.slice(0, 8).map((s) => {
    const p = profiles.get(s.supplier_id);
    return { id: s.supplier_id, otd: p?.otdSnapshotPct ?? null, n: p?.deliveredEventsSnapshot ?? 0 };
  });

  const crit = ['Critical', 'High', 'Medium', 'Low']
    .map((c) => k.procurement.byCriticality.items.find((i) => i.segment === c))
    .filter(Boolean);

  return {
    otd, overdue, n80, pareto, rop, countries, unplaced, positions, physicalCount: physical.length,
    topSuppliers, minSample, crit,
    ageing: k.procurement.ageing.items,
    gap: k.procurement.promiseGap,
    portfolioOtd: otd.value,
    top80Share: n80 ? pareto[n80 - 1].cumulativeSharePct : null,
  };
}

export function renderOverview(host, m) {
  const k = m.kpis;
  const o = overviewModel(m);
  const v = m.validation.summary;

  const rings = [
    ring({ key: 'otd', kpi: '4.1', label: 'Delivery OTD', pct: o.otd.value, display: percent(o.otd.value, 1), sub: `${integer(o.otd.numerator)} of ${integer(o.otd.denominator)} events`, href: '#/suppliers', warn: false }),
    ring({ key: 'overdue', kpi: '6.8', label: 'Open value overdue', pct: o.overdue.sharePct, display: percent(o.overdue.sharePct, 1), sub: `${usdCompact(o.overdue.value)} of ${usdCompact(o.overdue.denominator)}`, href: '#/procurement', warn: true }),
    ring({ key: 'top80', kpi: '6.4', label: `Top ${o.n80 ?? NA} suppliers`, pct: o.top80Share, display: percent(o.top80Share, 1), sub: `of net active PO value`, href: '#/procurement', warn: false }),
    ring({ key: 'rop', kpi: '7.3', label: 'Below reorder point', pct: (o.rop.numerator / o.rop.denominator) * 100, display: `${integer(o.rop.value)}/${integer(o.rop.denominator)}`, sub: 'materials, on available stock', href: '#/inventory', warn: true }),
  ].join('');

  const figs = [
    figure({ key: 'net', kpi: '6.1.2', label: 'Net active PO', value: usdCompact(k.procurement.netActive.value), sub: 'PO line value, not spend' }),
    figure({ key: 'open', kpi: '6.2', label: 'Open commitment', value: usdCompact(k.procurement.openCommitment.value), sub: `${integer(k.delivery.overdueOpenPoLines.denominator)} open PO lines` }),
    figure({ key: 'late', kpi: '4.2', label: 'Late deliveries', value: integer(k.delivery.lateSnapshot.value), sub: `of ${integer(k.delivery.lateSnapshot.denominator)} delivered events`, warn: true }),
    figure({ key: 'reject', kpi: '5.1', label: 'Rejection rate', value: percent(k.quality.rejectionRate.value, 2), sub: `${integer(k.quality.rejectionRate.numerator)} of ${integer(k.quality.rejectionRate.denominator)} units` }),
    figure({ key: 'onhand', kpi: '7.1', label: 'On-hand stock', value: usdCompact(k.inventory.onHandValue.value), sub: `${integer(o.physicalCount)} physical materials` }),
    figure({ key: 'ss', kpi: '7.4', label: 'Below safety stock', value: integer(k.inventory.safetyStockBreaches.value), sub: 'materials, available basis', warn: true }),
  ].join('');

  const topCountries = [...o.countries].sort((a, b) => b.value - a.value).slice(0, 3);
  const ageMax = [...o.ageing].sort((a, b) => b.value - a.value)[0];
  const limited = o.topSuppliers.filter((s) => s.n > 0 && s.n < o.minSample).length;
  const none = o.topSuppliers.filter((s) => s.n === 0).length;

  const panels = [
    panel({
      key: 'map', wide: 'hud-panel--wide', title: 'Supplier footprint', kpi: '6.1.2',
      figure: `<strong>${integer(o.countries.length)}</strong> countries. Largest: ${topCountries.map((c) => `${esc(c.segment)} ${esc(usdCompact(c.value))}`).join(', ')}.`,
      chartLabel: `Map of net active PO line value by supplier country. ${o.countries.length} countries. ${topCountries.map((c) => `${c.segment} ${usdCompact(c.value)}`).join(', ')}.`,
      href: '#/procurement', linkText: 'Commitment by country',
    }),
    panel({
      key: 'pareto', wide: 'hud-panel--side', title: 'Concentration curve', kpi: '6.4',
      figure: `<strong>${integer(o.n80)} of ${integer(o.pareto.length)}</strong> suppliers reach ${esc(percent(o.top80Share, 1))}.`,
      chartLabel: `Pareto curve of supplier share of net active PO line value. ${o.n80} of ${o.pareto.length} suppliers hold ${percent(o.top80Share, 1)}.`,
      href: '#/procurement', linkText: 'Procurement intelligence',
    }),
    panel({
      key: 'ageing', title: 'Overdue ageing', kpi: '4.4.1',
      figure: `Peak value: <strong>${esc(ageMax.label)}</strong>, ${esc(usdCompact(ageMax.value))}.`,
      chartLabel: `Overdue open PO value by days past promised date: ${o.ageing.map((a) => `${a.label} ${usdCompact(a.value)}`).join(', ')}.`,
      href: '#/procurement', linkText: 'Expediting register',
    }),
    panel({
      key: 'gap', title: 'Promise vs request', kpi: '4.7',
      figure: `<strong>${integer(o.gap.later)} of ${integer(o.gap.n)}</strong> lines promised late.`,
      chartLabel: `PO lines by promised minus requested date, from ${o.gap.min} to ${o.gap.max} days. ${o.gap.later} later, ${o.gap.same} same day, ${o.gap.earlier} earlier.`,
      href: '#/procurement', linkText: 'Promise detail',
    }),
    panel({
      key: 'stock', title: 'Stock position', kpi: '7.3 / 7.4',
      figure: `<strong>${integer(o.positions[0])}</strong> below safety stock.`,
      chartLabel: `Physical materials by stock position on available stock: ${POSITION_ORDER.map((p, i) => `${p} ${o.positions[i]}`).join(', ')}.`,
      href: '#/inventory', linkText: 'Material table',
    }),
    panel({
      key: 'suppliers', wide: 'hud-panel--wide', title: 'OTD of the largest suppliers', kpi: '4.1',
      figure: `Top 8 by net active value. Portfolio <strong>${esc(percent(o.portfolioOtd, 1))}</strong>.${limited ? ` ${limited} with a limited sample.` : ''}${none ? ` ${none} with no events.` : ''}`,
      chartLabel: `Delivery Event OTD, snapshot period, for the eight suppliers with the most net active PO value: ${o.topSuppliers.map((s) => `${s.id} ${s.otd === null ? 'no events' : percent(s.otd, 0)}`).join(', ')}.`,
      href: '#/suppliers', linkText: 'Supplier performance',
    }),
    panel({
      key: 'crit', wide: 'hud-panel--side', title: 'Value vs overdue by criticality', kpi: '6.1.2 / 6.8',
      figure: `Critical: <strong>${esc(percent(o.crit[0]?.sharePct, 1))}</strong> of value, ${esc(percent(o.crit[0]?.overdueSharePct, 1))} of overdue.`,
      chartLabel: `Share of net active and overdue open PO value by supplier criticality: ${o.crit.map((c) => `${c.segment} ${percent(c.sharePct, 1)} and ${percent(c.overdueSharePct, 1)}`).join('; ')}.`,
      href: '#/suppliers', linkText: 'Criticality segments',
    }),
  ].join('');

  host.innerHTML = `
    <div class="hud" data-overview>
      ${v.allPassed ? '' : '<div class="banner banner--fail" role="alert" data-banner="validation-fail"><strong>Some data checks did not pass.</strong> Figures are shown for diagnosis only. See Data quality on the <a href="#/executive">Executive dashboard</a>.</div>'}
      <div class="hud-top">
        <div>
          <h1 id="page-title" tabindex="-1">Command centre</h1>
          <p class="hud-top__meta">Snapshot ${esc(date(m.config.reportingAsOfDate))}. Synthetic data.</p>
        </div>
        <span class="hud-status${v.allPassed ? '' : ' hud-status--fail'}" data-status>${v.controlsPassed} of ${v.controlsTotal} data checks passed</span>
      </div>
      <div class="hud-grid">
        <section class="hud-panel hud-panel--rings" aria-label="Key rates">${rings}</section>
        <section class="hud-panel hud-panel--figs" aria-label="Key figures">${figs}</section>
        ${panels}
      </div>
      <p class="hud-foot">Every figure comes from the validated KPI engine. Open a module for definitions, bases and tables. Map positions are approximate country centres, not supplier sites.${o.unplaced.length ? ` Not placed on the map: ${esc(o.unplaced.join(', '))}.` : ''}</p>
    </div>`;

  draw(host, o);
}

function draw(host, o) {
  const c = (key) => host.querySelector(`#hud-${key}-chart`);
  const results = {
    map: drawHudMap(c('map'), o.countries),
    pareto: drawHudPareto(c('pareto'), o.pareto.map((p) => ({ id: p.supplier_id, share: p.sharePct, cumulative: p.cumulativeSharePct }))),
    ageing: drawHudBars(c('ageing'), {
      labels: o.ageing.map((a) => a.label.replace(' days', '')),
      values: o.ageing.map((a) => a.value),
      colors: o.ageing.map((a, i) => [HUD.pale, 'rgba(63, 212, 255, 0.5)', HUD.blue, HUD.amber][i] || HUD.blue),
      format: (v) => usdCompact(v),
    }),
    gap: drawHudBars(c('gap'), {
      labels: o.gap.distribution.map((d) => (d.days > 0 ? `+${d.days}` : `${d.days}`)),
      values: o.gap.distribution.map((d) => d.lines),
      colors: o.gap.distribution.map((d) => (d.days > 0 ? HUD.amber : d.days === 0 ? HUD.muted : HUD.cyan)),
      format: (v) => `${v} lines`,
    }),
    stock: drawHudDoughnut(c('stock'), POSITION_ORDER, o.positions, [HUD.amber, 'rgba(255, 181, 71, 0.45)', HUD.blue]),
    suppliers: drawHudBars(c('suppliers'), {
      labels: o.topSuppliers.map((s) => (s.otd === null ? `${s.id} (no events)` : s.n < o.minSample ? `${s.id} (n=${s.n})` : s.id)),
      values: o.topSuppliers.map((s) => s.otd ?? 0),
      colors: o.topSuppliers.map((s) => (s.otd === null ? 'transparent' : s.n < o.minSample ? HUD.pale : HUD.cyan)),
      format: (v) => `${Math.round(v)}%`,
      horizontal: true,
      max: 100,
      reference: { value: o.portfolioOtd, label: 'Portfolio' },
    }),
    crit: drawHudPairedBars(c('crit'), o.crit.map((x) => x.segment), [
      { label: 'Net active value', data: o.crit.map((x) => x.sharePct), color: HUD.cyan },
      { label: 'Overdue open value', data: o.crit.map((x) => x.overdueSharePct), color: HUD.amber },
    ]),
  };
  for (const [key, ok] of Object.entries(results)) {
    if (!ok) {
      const box = host.querySelector(`[data-hud="${key}"] .hud-chart`);
      box?.replaceWith(Object.assign(document.createElement('p'), { className: 'hud-fallback', textContent: 'The chart could not be drawn. The figure above and the linked module show the same data.' }));
    }
  }
}
