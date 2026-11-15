/**
 * Chart-first presentation layer for the modules (DEC-035).
 *
 * Runs after a page or one of its sections renders, and again whenever a section redraws.
 * It never calculates KPIs and never reads figures from page text: every value comes from
 * the KPI engine results, or from the engine values the views write into data attributes.
 *
 * - KPI cards: adds a ring or split bar beside the value and folds the detail lines under
 *   "Details". The one-line note (the required caveat) stays visible.
 * - Text breakdowns become charts; the original tables stay available under a toggle.
 * - Charts act as filters: selecting a bar or segment sets the existing filter control.
 */

import { esc, percent, integer, usdCompact, isMissing } from './format.js';
import { drawHudBars, drawHudDoughnut, drawHudPairedBars, HUD } from './charts.js';

/* ---------- small visuals ---------- */

function ring(pct, { warn = false, label = '' } = {}) {
  if (isMissing(pct)) return '';
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return `<svg class="kpi__viz-ring${warn ? ' kpi__viz-ring--warn' : ''}" viewBox="0 0 64 64" role="img" aria-label="${esc(label)}" data-viz="ring" data-viz-value="${esc(pct)}">
    <circle class="track" cx="32" cy="32" r="${r}"/>
    <circle class="arc" cx="32" cy="32" r="${r}" transform="rotate(-90 32 32)" style="--c:${c.toFixed(2)};--o:${(c * (1 - p / 100)).toFixed(2)}"/>
  </svg>`;
}

/** parts: [{label, value, tone: 'warn' | 'dim' | undefined}] – a stacked bar of parts of a whole. */
function split(parts, label) {
  const total = parts.reduce((s, p) => s + (p.value > 0 ? p.value : 0), 0);
  if (!total) return '';
  const segs = parts.map((p) => `<span class="split__seg${p.tone ? ` split__seg--${p.tone}` : ''}" style="width:${((Math.max(p.value, 0) / total) * 100).toFixed(2)}%"></span>`).join('');
  const legend = parts.map((p) => `<span><i class="${p.tone || ''}"></i>${esc(p.label)} ${esc(p.text ?? usdCompact(p.value))}</span>`).join('');
  return `<div class="split" role="img" aria-label="${esc(label)}" data-viz="split"><div class="split__bar">${segs}</div><div class="split__legend" aria-hidden="true">${legend}</div></div>`;
}

const pctOf = (a, b) => (b ? (a / b) * 100 : null);
const num = (card, sel = '[data-value]') => {
  const v = card.querySelector(sel)?.dataset.value;
  return v === undefined || v === '' ? null : Number(v);
};

/* ---------- card visuals, keyed by data-card ---------- */

const CARD_VIZ = {
  // Executive dashboard
  otd: (k) => ring(k.delivery.otdSnapshot.value, { label: `On-time share ${percent(k.delivery.otdSnapshot.value, 1)}` }),
  late: (k) => ring(pctOf(k.delivery.lateSnapshot.value, k.delivery.lateSnapshot.denominator), { warn: true, label: `${k.delivery.lateSnapshot.value} of ${k.delivery.lateSnapshot.denominator} events late` }),
  'open-po': (k) => split([
    { label: 'Overdue', value: k.procurement.overdueOpen.value, tone: 'warn' },
    { label: 'Not yet due', value: k.procurement.openCommitment.value - k.procurement.overdueOpen.value },
  ], `Open PO value: ${usdCompact(k.procurement.overdueOpen.value)} overdue of ${usdCompact(k.procurement.openCommitment.value)}`),
  'net-active': (k) => split([
    { label: 'Received', value: k.procurement.received.value, tone: 'dim' },
    { label: 'Open', value: k.procurement.openCommitment.value },
  ], `Net active PO value: ${usdCompact(k.procurement.received.value)} received, ${usdCompact(k.procurement.openCommitment.value)} open`),
  rejection: (k) => ring(k.quality.rejectionRate.value, { warn: true, label: `Rejection rate ${percent(k.quality.rejectionRate.value, 2)}` }),
  inventory: (k) => stockSplit(k),

  // Supplier performance: portfolio baseline
  'base-otd': (k) => CARD_VIZ.otd(k),
  'base-late': (k) => CARD_VIZ.late(k),
  'base-rejection': (k) => CARD_VIZ.rejection(k),
  'base-ca': (k) => ring(pctOf(k.quality.openCorrectiveActions.value, k.quality.openCorrectiveActions.n), { warn: true, label: `${k.quality.openCorrectiveActions.value} of ${k.quality.openCorrectiveActions.n} corrective actions open` }),

  // Supplier detail: engine values written by the view into data-value
  'det-otd': (_k, card) => ring(num(card), { label: 'Supplier on-time share' }),
  'det-quality': (_k, card) => ring(num(card), { warn: true, label: 'Supplier rejection rate' }),

  // Procurement
  'overdue-value': (k) => ring(k.procurement.overdueOpen.sharePct, { warn: true, label: `${percent(k.procurement.overdueOpen.sharePct, 1)} of open PO value overdue` }),
  'overdue-lines': (k) => ring(pctOf(k.delivery.overdueOpenPoLines.value, k.delivery.overdueOpenPoLines.denominator), { warn: true, label: `${k.delivery.overdueOpenPoLines.value} of ${k.delivery.overdueOpenPoLines.denominator} open lines overdue` }),

  // Inventory
  onhand: (k) => stockSplit(k),
  'below-rop': (k) => ring(pctOf(k.inventory.belowReorderPoint.value, k.inventory.belowReorderPoint.denominator), { warn: true, label: `${k.inventory.belowReorderPoint.value} of ${k.inventory.belowReorderPoint.denominator} materials below reorder point` }),
  'below-ss': (k) => ring(pctOf(k.inventory.safetyStockBreaches.value, k.inventory.safetyStockBreaches.denominator), { warn: true, label: `${k.inventory.safetyStockBreaches.value} of ${k.inventory.safetyStockBreaches.denominator} materials below safety stock` }),
};

function stockSplit(k) {
  const on = k.inventory.onHandValue.value;
  const av = k.inventory.availableValue.value;
  return split([
    { label: 'Available', value: av },
    { label: 'Allocated', value: on - av, tone: 'dim' },
  ], `On-hand inventory: ${usdCompact(av)} available, ${usdCompact(on - av)} allocated`);
}

function enhanceCards(root, k) {
  for (const card of root.querySelectorAll('.kpi[data-card]:not([data-enhanced])')) {
    card.dataset.enhanced = '';
    const value = card.querySelector('.kpi__value');
    const make = CARD_VIZ[card.dataset.card];
    const viz = make && value ? make(k, card) : '';
    if (viz) {
      if (viz.startsWith('<svg')) {
        const row = document.createElement('div');
        row.className = 'kpi__headline';
        value.replaceWith(row);
        row.append(value);
        row.insertAdjacentHTML('beforeend', viz);
      } else {
        value.insertAdjacentHTML('afterend', viz);
      }
    }
    // Fold the supporting lines; the context sentence and the caveat note stay visible.
    const lines = card.querySelector(':scope > .kpi__lines');
    if (lines) {
      const d = document.createElement('details');
      d.className = 'kpi__more';
      d.innerHTML = '<summary>Details</summary>';
      lines.replaceWith(d);
      d.append(lines);
    }
  }
}

/* ---------- chart-driven filters ---------- */

function setFilter(root, selector, value, eventType = 'change') {
  const el = root.querySelector(selector);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event(eventType, { bubbles: true }));
  const target = root.querySelector(selector)?.closest('.section') || el.closest('.section');
  if (target) {
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target.classList.remove('viz-flash');
    void target.offsetWidth;
    target.classList.add('viz-flash');
  }
}

function hasChart() {
  return Boolean(globalThis.Chart);
}

/** Wraps an element in a closed <details> toggle, keeping it in the page for screen readers and print. */
function fold(el, label) {
  if (!el || el.closest('details.viz-fold')) return;
  const d = document.createElement('details');
  d.className = 'notice viz-fold';
  d.innerHTML = `<summary><span>${esc(label)}</span></summary><div class="notice__body"></div>`;
  el.replaceWith(d);
  d.querySelector('.notice__body').append(el);
}

/* ---------- module charts ---------- */

function executiveCharts(root, k) {
  const panel = root.querySelector('[data-panel="supplier-base"]:not([data-viz-done])');
  if (panel && hasChart()) {
    panel.dataset.vizDone = '';
    const q = Object.entries(k.suppliers.qualification.value).sort((a, b) => b[1] - a[1]);
    const c = Object.entries(k.suppliers.certification.value).sort((a, b) => b[1] - a[1]);
    const groups = [...panel.querySelectorAll('.stat-group')];
    const grid = document.createElement('div');
    grid.className = 'viz-grid viz-grid--2';
    grid.innerHTML = `
      <div><h4>Qualification</h4><div class="hud-chart" style="height:200px"><canvas id="viz-qualification" role="img" aria-label="${esc(`Supplier qualification status: ${q.map(([n, v]) => `${n} ${v}`).join(', ')}`)}"></canvas></div></div>
      <div><h4>Certification</h4><div class="hud-chart" style="height:200px"><canvas id="viz-certification" role="img" aria-label="${esc(`Supplier certification status: ${c.map(([n, v]) => `${n} ${v}`).join(', ')}`)}"></canvas></div></div>`;
    (panel.querySelector('.big-stat') || panel.querySelector('.panel__lead')).after(grid);
    const holder = document.createElement('div');
    groups.forEach((g) => holder.append(g));
    grid.after(holder);
    fold(holder, 'Show counts');
    const pal = [HUD.cyan, HUD.amber, HUD.blue, HUD.muted];
    drawHudDoughnut(grid.querySelector('#viz-qualification'), q.map(([n]) => n), q.map(([, v]) => v), pal);
    drawHudDoughnut(grid.querySelector('#viz-certification'), c.map(([n]) => n), c.map(([, v]) => v), pal);
  }
  // Concentration bars open the supplier.
  const conc = root.querySelector('#concentration-chart');
  const chart = conc && globalThis.Chart?.getChart(conc);
  if (chart && conc.dataset.vizClick === undefined) {
    conc.dataset.vizClick = '';
    chart.options.onClick = (_e, els) => {
      const id = els.length ? String(chart.data.labels[els[0].index]).match(/SUP-\d+/)?.[0] : null;
      if (id) location.hash = `#/suppliers/${id}`;
    };
    chart.options.onHover = (e, els) => { e.native.target.style.cursor = els.length && /SUP-\d+/.test(String(chart.data.labels[els[0].index])) ? 'pointer' : 'default'; };
    chart.update('none');
    conc.closest('.chart-box')?.insertAdjacentHTML('beforebegin', '<p class="viz-hint">Select a supplier bar to open its performance detail.</p>');
  }
}

const BUCKET_KEYS = ['1-30', '31-90', '91-180', '181+'];

function supplierCharts(root, k) {
  const table = root.querySelector('[data-table="segments"]');
  const panel = table?.closest('.panel');
  if (!panel || panel.dataset.vizDone !== undefined || !hasChart()) return;
  panel.dataset.vizDone = '';
  const items = CRIT.map((c) => k.suppliers.byCriticality.items.find((g) => g.segment === c)).filter(Boolean);
  const label = (g) => `${g.segment} (${integer(g.deliveredEventsSnapshot)} event${g.deliveredEventsSnapshot === 1 ? '' : 's'})`;
  table.closest('.table-wrap').insertAdjacentHTML('beforebegin', `
    <p class="viz-hint">Share of net active PO value against delivery OTD in the period. Event counts show how much evidence sits behind each OTD.</p>
    <div class="hud-chart" style="height:240px"><canvas id="viz-crit" role="img" aria-label="${esc(`By supplier criticality, share of net active PO value and Delivery Event OTD in period: ${items.map((g) => `${g.segment} ${percent(g.netActiveSharePct, 1)} and ${isMissing(g.otdSnapshotPct) ? 'no data' : percent(g.otdSnapshotPct, 1)} on ${g.deliveredEventsSnapshot} events`).join('; ')}`)}"></canvas></div>`);
  fold(table.closest('.table-wrap'), 'Show table');
  drawHudPairedBars(panel.querySelector('#viz-crit'), items.map(label), [
    { label: 'Share of net active PO value', data: items.map((g) => g.netActiveSharePct), color: HUD.blue },
    { label: 'Delivery Event OTD, in period', data: items.map((g) => g.otdSnapshotPct ?? 0), color: HUD.cyan },
  ]);
}

const SEGMENT_KEYS = { material_category: 'byCategory', criticality: 'byCriticality', supplier_tier: 'byTier', country: 'byCountry' };
const CRIT = ['Critical', 'High', 'Medium', 'Low'];

function procurementCharts(root, k) {
  // Commitment by segment: share of net active vs overdue value, largest 10, above the table.
  const seg = root.querySelector('[data-panel="segments"]:not([data-viz-done])');
  if (seg && hasChart()) {
    seg.dataset.vizDone = '';
    const choice = seg.querySelector('input[name="segment"]:checked')?.value;
    const data = k.procurement[SEGMENT_KEYS[choice]];
    if (data) {
      let items = [...data.items];
      items = choice === 'criticality' ? items.sort((a, b) => CRIT.indexOf(a.segment) - CRIT.indexOf(b.segment)) : items.sort((a, b) => b.sharePct - a.sharePct);
      const shown = items.slice(0, 10);
      const rest = items.length - shown.length;
      const table = seg.querySelector('.table-wrap');
      table.insertAdjacentHTML('beforebegin', `
        <p class="viz-hint">Share of net active PO value against share of overdue open value${rest > 0 ? `; largest 10 of ${integer(items.length)} shown, all in the table` : ''}.</p>
        <div class="hud-chart" style="height:${Math.max(220, shown.length * 34 + 60)}px"><canvas id="viz-segments" role="img" aria-label="${esc(`Share of net active and overdue open PO value by segment: ${shown.map((g) => `${g.segment} ${percent(g.sharePct, 1)} and ${percent(g.overdueSharePct, 1)}`).join('; ')}`)}"></canvas></div>`);
      fold(table, 'Show table');
      drawHudPairedBars(seg.querySelector('#viz-segments'), shown.map((g) => g.segment), [
        { label: 'Net active value', data: shown.map((g) => g.sharePct), color: HUD.cyan },
        { label: 'Overdue open value', data: shown.map((g) => g.overdueSharePct), color: HUD.amber },
      ]);
    }
  }

  const canvas = root.querySelector('#ageing-chart');
  const chart = canvas && globalThis.Chart?.getChart(canvas);
  if (chart && canvas.dataset.vizClick === undefined) {
    canvas.dataset.vizClick = '';
    chart.options.onClick = (_e, els) => {
      if (!els.length) return;
      setFilter(root, 'select[data-rfilter="due"]', 'overdue');
      setFilter(root, 'select[data-rfilter="bucket"]', BUCKET_KEYS[els[0].index]);
    };
    chart.options.onHover = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };
    chart.update('none');
    canvas.closest('.chart-box')?.insertAdjacentHTML('beforebegin', '<p class="viz-hint">Select a bar to show those lines in the expediting register.</p>');
  }
}

const POSITION_ORDER = ['Below safety stock', 'Below reorder point', 'At or above reorder point'];
const SUPPLIED_ORDER = ['Safety Stock Breach', 'Below Reorder Point', 'Healthy', 'Excess'];

function inventoryCharts(root, k) {
  if (!hasChart()) return;
  const physical = k.inventory.register.items.filter((r) => r.physical);

  const supplied = root.querySelector('[data-panel="supplied-status"]:not([data-viz-done])');
  if (supplied) {
    supplied.dataset.vizDone = '';
    const dist = k.inventory.statusDistribution.value;
    const labels = SUPPLIED_ORDER.filter((s) => dist[s] !== undefined);
    const table = supplied.querySelector('.stat-list, .table-wrap, table');
    supplied.querySelector('.panel__lead').insertAdjacentHTML('afterend', `
      <p class="viz-caption" data-caveat="on-hand">On-hand basis, as supplied (KPI 7.7). Not the basis for reorder checks.</p>
      <p class="viz-hint">Select a segment to filter the material table.</p>
      <div class="hud-chart" style="height:220px"><canvas id="viz-supplied" role="img" aria-label="${esc(`Supplied inventory status, on-hand basis: ${labels.map((l) => `${l} ${dist[l]}`).join(', ')}`)}"></canvas></div>`);
    fold(table, 'Show figures');
    drawHudDoughnut(supplied.querySelector('#viz-supplied'), labels, labels.map((l) => dist[l]), [HUD.amber, 'rgba(255, 181, 71, 0.45)', HUD.cyan, HUD.blue],
      (i) => setFilter(root, 'select[data-ifilter="supplied"]', labels[i]));
  }

  const position = root.querySelector('[data-panel="available-position"]:not([data-viz-done])');
  if (position) {
    position.dataset.vizDone = '';
    const counts = POSITION_ORDER.map((p) => physical.filter((r) => r.stockPosition === p).length);
    const table = position.querySelector('.stat-list, .table-wrap, table');
    position.querySelector('.panel__lead').insertAdjacentHTML('afterend', `
      <p class="viz-caption" data-caveat="available">Available stock: on-hand minus allocated (DEC-018).</p>
      <p class="viz-hint">Select a segment to filter the material table.</p>
      <div class="hud-chart" style="height:220px"><canvas id="viz-position" role="img" aria-label="${esc(`Stock position on available stock: ${POSITION_ORDER.map((p, i) => `${p} ${counts[i]}`).join(', ')}`)}"></canvas></div>`);
    fold(table, 'Show figures');
    drawHudDoughnut(position.querySelector('#viz-position'), POSITION_ORDER, counts, [HUD.amber, 'rgba(255, 181, 71, 0.45)', HUD.cyan],
      (i) => setFilter(root, 'select[data-ifilter="position"]', POSITION_ORDER[i]));
  }

  // Days of supply by material: a new panel above the material table.
  const tableSection = root.querySelector('[aria-labelledby="mat-title"]');
  if (tableSection && !root.querySelector('[data-panel="dos"]')) {
    const rows = physical.filter((r) => !isMissing(r.days_of_supply)).sort((a, b) => a.days_of_supply - b.days_of_supply);
    const missing = physical.length - rows.length;
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.setAttribute('aria-labelledby', 'dos-title');
    sec.innerHTML = `
      <div class="section__head"><h2 id="dos-title">Days of supply by material</h2><p>KPI 7.5, lowest first. Colour shows stock position on available stock.</p></div>
      <div class="panel viz-panel" data-panel="dos">
        <p class="viz-caption" data-caveat="dos">Synthetic average daily demand, not a forecast. Single snapshot (${esc(k.inventory.onHandValue.asOfDate)}), no trend.</p>
        <p class="viz-hint">Select a bar to find the material in the table.${missing ? ` ${integer(missing)} material${missing === 1 ? '' : 's'} with no demand not shown.` : ''}</p>
        <div class="hud-chart" style="height:${Math.max(260, rows.length * 22)}px"><canvas id="viz-dos" role="img" aria-label="${esc(`Days of supply by material, lowest first: ${rows.map((r) => `${r.material_id} ${r.days_of_supply.toFixed(1)} days`).join(', ')}`)}"></canvas></div>
      </div>`;
    tableSection.before(sec);
    const tone = { 'Below safety stock': HUD.amber, 'Below reorder point': 'rgba(255, 181, 71, 0.5)', 'At or above reorder point': HUD.cyan };
    drawHudBars(sec.querySelector('#viz-dos'), {
      labels: rows.map((r) => r.material_id),
      values: rows.map((r) => r.days_of_supply),
      colors: rows.map((r) => tone[r.stockPosition] || HUD.blue),
      format: (v) => `${Number(v).toFixed(0)} d`,
      horizontal: true,
      onSelect: (i) => setFilter(root, 'input[data-ifilter="search"]', rows[i].material_id, 'input'),
    });
  }
}

/* ---------- entry point ---------- */

let observer = null;

/**
 * Enhances the current page now and after any later redraw of its sections.
 * @param {HTMLElement} main
 * @param {object} model – {kpis, ...}
 */
export function attachVisuals(main, model) {
  const run = () => {
    if (!model?.kpis) return;
    const k = model.kpis;
    enhanceCards(main, k);
    const route = main.dataset.module;
    if (route === 'executive') executiveCharts(main, k);
    if (route === 'procurement') procurementCharts(main, k);
    if (route === 'inventory') inventoryCharts(main, k);
    if (route === 'suppliers') supplierCharts(main, k);
  };
  run();
  if (observer) observer.disconnect();
  let pending = false;
  let windowStart = 0;
  let passes = 0;
  let catchUp = null;
  const schedule = () => {
    pending = true;
    Promise.resolve().then(() => { pending = false; run(); });
  };
  observer = new MutationObserver(() => {
    if (pending) return;
    // Safety cap: enhancement settles in one or two passes per redraw. If something ever made
    // it chase its own changes, limit it to 25 passes per 200 ms instead of freezing the page,
    // and catch up once the burst is over.
    const now = performance.now();
    if (now - windowStart > 200) { windowStart = now; passes = 0; }
    if (++passes > 25) {
      clearTimeout(catchUp);
      catchUp = setTimeout(schedule, 250);
      return;
    }
    schedule();
  });
  observer.observe(main, { childList: true, subtree: true });
}
