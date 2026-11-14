/**
 * Inventory Intelligence view (Stage 7).
 *
 * Displays KPI engine results kpis.inventory.* (KPI 7.1–7.7) and the material register.
 * Physical materials only in KPIs (SERVICE excluded, Data Model control 16).
 * Stock position uses available stock (DEC-018); the supplied status is labelled on-hand based.
 * No KPI is calculated here.
 */

import { usd, usdCompact, integer, date, esc, isMissing, NA } from '../format.js';

const CRIT_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const POSITION_ORDER = ['Below safety stock', 'Below reorder point', 'At or above reorder point'];
const DEFAULT_SORT = { key: 'position', dir: 'asc' };

const state = {
  sort: { ...DEFAULT_SORT },
  filters: { position: '', supplied: '', category: '', materialCrit: '', supplierCrit: '', showService: false, search: '' },
};

const attr = (key, field, value) => `data-kpi-key="${esc(key)}" data-kpi-field="${esc(field)}" data-value="${isMissing(value) ? '' : esc(value)}"`;
const qty = (v) => (isMissing(v) ? NA : integer(v));
const dos = (v) => (isMissing(v) ? NA : `${v.toFixed(1)} days`);
const opts = (values, current) => '<option value="">All</option>' + values.map((v) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(v)}</option>`).join('');
const posClass = (p) => (p === 'Below safety stock' ? 'pos pos--ss' : p === 'Below reorder point' ? 'pos pos--rop' : 'pos pos--ok');

const COLS = [
  { key: 'material', label: 'Material', sticky: true, v: (r) => r.material_id },
  { key: 'supplier', label: 'Supplier', v: (r) => r.supplier_id },
  { key: 'materialCrit', label: 'Material criticality', v: (r) => (CRIT_ORDER.includes(r.materialCriticality) ? CRIT_ORDER.indexOf(r.materialCriticality) : 99) },
  { key: 'onhand', label: 'On hand', num: true, v: (r) => r.on_hand_qty },
  { key: 'available', label: 'Available', num: true, v: (r) => r.available_qty },
  { key: 'ss', label: 'Safety stock / reorder point', num: true, v: (r) => r.safety_stock_qty },
  { key: 'position', label: 'Stock position (available)', v: (r) => (r.stockPosition ? POSITION_ORDER.indexOf(r.stockPosition) : null) },
  { key: 'supplied', label: 'Supplied status (on-hand)', v: (r) => r.suppliedStatus },
  { key: 'dos', label: 'Days of supply', num: true, v: (r) => r.days_of_supply },
  { key: 'value', label: 'On-hand value', num: true, v: (r) => r.on_hand_inventory_value_usd },
];

/** Blanks always last; ties broken by days of supply (lowest first) then material ID. */
function sortRows(items, key, dir) {
  const col = COLS.find((c) => c.key === key) || COLS[6];
  const d = dir === 'desc' ? -1 : 1;
  const tie = (a, b) => (a.days_of_supply ?? Infinity) - (b.days_of_supply ?? Infinity) || a.material_id.localeCompare(b.material_id);
  return [...items].sort((a, b) => {
    const va = col.v(a);
    const vb = col.v(b);
    const na = va === null || va === undefined;
    const nb = vb === null || vb === undefined;
    if (na && nb) return tie(a, b);
    if (na) return 1;
    if (nb) return -1;
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return c !== 0 ? c * d : tie(a, b);
  });
}

function titleBlock(m) {
  const inv = m.kpis.inventory;
  const s = m.validation.summary;
  const total = inv.register.n;
  const physical = inv.onHandValue.n;
  return `
    <section class="title-block" aria-label="Report details">
      <div class="title-block__title">
        <h1 id="page-title" tabindex="-1">Inventory intelligence</h1>
        <p>Stock position of physical materials at a single snapshot date. Reorder and safety-stock checks use available stock, which excludes quantity already allocated.</p>
      </div>
      <div><span class="tb-label">Snapshot date</span><span class="tb-value" data-tb="snapshot">${esc(date(inv.onHandValue.asOfDate))}</span></div>
      <div><span class="tb-label">Materials</span><span class="tb-value" data-tb="materials">${integer(physical)} physical, ${integer(total - physical)} SERVICE excluded</span></div>
      <div><span class="tb-label">Validation</span><span class="tb-value ${s.allPassed ? 'tb-value--pass' : 'tb-value--fail'}">${s.controlsPassed} of ${s.controlsTotal} controls passed</span></div>
      <div><span class="tb-label">Stock basis</span><span class="tb-value">Available = on hand − allocated</span></div>
      <div><span class="tb-label">Trend data</span><span class="tb-value">None (one snapshot)</span></div>
      <div><span class="tb-label">KPI dictionary</span><span class="tb-value">Version ${esc(m.config.documentVersions.kpiDictionary)}</span></div>
    </section>`;
}

function notices(m) {
  const out = [];
  if (!m.validation.summary.allPassed) {
    out.push(`<div class="banner banner--fail" role="alert" data-banner="validation-fail"><strong>Some data checks did not pass.</strong> Inventory figures are shown for diagnosis only. See Data quality on the <a href="#/executive">Executive dashboard</a>.</div>`);
  }
  out.push(`<div class="banner banner--caution" data-banner="snapshot"><strong>Single inventory snapshot (${esc(date(m.kpis.inventory.onHandValue.asOfDate))}).</strong> These figures describe one point in time. They do not show trends, consumption history or how long a material has been below reorder point (KPI 7.8 not supported). Days of supply uses the synthetic average daily demand in the snapshot, not a forecast. The Excess status is used as supplied; its threshold rule is not documented.</div>`);
  return out.join('');
}

function headline(m) {
  const inv = m.kpis.inventory;
  const allocated = inv.onHandValue.value - inv.availableValue.value;
  const regPhys = inv.register.items.filter((r) => r.physical);
  const dosVals = regPhys.map((r) => r.days_of_supply).filter((v) => !isMissing(v));
  const critBelow = regPhys.filter((r) => r.stockPosition !== 'At or above reorder point' && r.materialCriticality === 'Critical').map((r) => r.material_id);
  const card = (id, ref, label, valueHtml, context, lines = [], note = '') => `
    <article class="kpi" data-card="${id}"><span class="kpi__ref">${esc(ref)}</span><h3 class="kpi__label">${esc(label)}</h3>
      ${valueHtml}<p class="kpi__context">${context}</p>
      ${lines.length ? `<ul class="kpi__lines">${lines.map(([l, v]) => `<li><span>${l}</span><span>${v}</span></li>`).join('')}</ul>` : ''}
      ${note ? `<p class="kpi__note">${esc(note)}</p>` : ''}</article>`;
  const val = (k, key, fmt) => `<span class="kpi__value${isMissing(k.value) ? ' kpi__value--na' : ''}" ${attr(key, 'value', k.value)}>${isMissing(k.value) ? NA : esc(fmt(k.value))}</span>`;
  return `
    <section class="section" aria-labelledby="inv-kpi-title">
      <div class="section__head"><h2 id="inv-kpi-title">Inventory position</h2><p>Physical materials only. SERVICE materials are excluded from every figure in this section.</p></div>
      <div class="kpi-panel">
        ${card('onhand', 'KPI 7.1', 'On-hand inventory value', val(inv.onHandValue, 'inventory.onHandValue', usdCompact), `${esc(usd(inv.onHandValue.value))} across ${integer(inv.onHandValue.n)} physical materials`)}
        ${card('available', 'KPI 7.2', 'Available inventory value', val(inv.availableValue, 'inventory.availableValue', usdCompact), `${esc(usd(inv.availableValue.value))} not yet allocated to demand`, [['Allocated value', `<span data-derived="allocated">${esc(usd(allocated))}</span>`]])}
        ${card('below-rop', 'KPI 7.3', 'Materials below reorder point', val(inv.belowReorderPoint, 'inventory.belowReorderPoint', integer), `of ${integer(inv.belowReorderPoint.denominator)} physical materials, on available stock`, [['Of which material criticality Critical', `<span data-derived="critical-below">${critBelow.length ? esc(critBelow.join(', ')) : 'None'}</span>`]], 'Includes materials that are also below safety stock.')}
        ${card('below-ss', 'KPI 7.4', 'Materials below safety stock', val(inv.safetyStockBreaches, 'inventory.safetyStockBreaches', integer), `of ${integer(inv.safetyStockBreaches.denominator)} physical materials, on available stock`, [['Materials', `<span>${esc(inv.safetyStockBreaches.items.join(', ') || 'None')}</span>`]])}
        ${card('dos', 'KPI 7.5', 'Average days of supply', val(inv.daysOfSupply, 'inventory.daysOfSupply', (v) => `${v.toFixed(1)} days`), `n = ${integer(inv.daysOfSupply.n)} materials with demand above zero`, [['Range', dosVals.length ? `${Math.min(...dosVals).toFixed(1)} to ${Math.max(...dosVals).toFixed(1)} days` : NA]], 'Snapshot planning indicator using synthetic demand, not a forecast.')}
        ${card('excess', 'KPI 7.6', 'Excess inventory value', val(inv.excessValue, 'inventory.excessValue', usdCompact), `${esc(usd(inv.excessValue.value))} on-hand value, ${integer(inv.excessValue.n)} materials`, [['Materials', esc(inv.excessValue.items.join(', ') || 'None')]], 'Uses the supplied Excess classification; its rule is not documented.')}
      </div>
    </section>`;
}

function statusSection(m) {
  const inv = m.kpis.inventory;
  const supplied = inv.statusDistribution.value;
  const regPhys = inv.register.items.filter((r) => r.physical);
  const avail = {};
  for (const r of regPhys) avail[r.stockPosition] = (avail[r.stockPosition] || 0) + 1;
  const suppliedOrder = ['Safety Stock Breach', 'Below Reorder Point', 'Healthy', 'Excess'];
  const suppliedRows = suppliedOrder.filter((k) => supplied[k] !== undefined).concat(Object.keys(supplied).filter((k) => !suppliedOrder.includes(k)))
    .map((k) => `<li data-supplied="${esc(k)}"><span>${esc(k)}</span><span>${integer(supplied[k])}</span></li>`).join('');
  const availRows = POSITION_ORDER.map((k) => `<li data-position="${esc(k)}"><span>${esc(k)}</span><span>${integer(avail[k] || 0)}</span></li>`).join('');
  const diffs = regPhys.filter((r) => {
    const s = r.suppliedStatus === 'Safety Stock Breach' ? 'Below safety stock' : r.suppliedStatus === 'Below Reorder Point' ? 'Below reorder point' : 'At or above reorder point';
    return s !== r.stockPosition;
  });
  const diffText = diffs.length
    ? diffs.map((r) => `${esc(r.material_id)} (supplied "${esc(r.suppliedStatus)}", available stock ${integer(r.available_qty)} against safety stock ${integer(r.safety_stock_qty)} and reorder point ${integer(r.reorder_point_qty)}: ${esc(r.stockPosition.toLowerCase())})`).join('; ')
    : 'none';
  return `
    <section class="section" aria-labelledby="status-title">
      <div class="section__head"><h2 id="status-title">Inventory status</h2><p>Two bases, shown side by side (DEC-018).</p></div>
      <div class="support-grid support-grid--even">
        <div class="panel" data-panel="supplied-status">
          <h3>Supplied status (on-hand basis)</h3>
          <p class="panel__lead">KPI 7.7, as recorded in the source data. Based on on-hand stock.</p>
          <ul class="stat-list">${suppliedRows}</ul>
        </div>
        <div class="panel" data-panel="available-position">
          <h3>Stock position (available basis)</h3>
          <p class="panel__lead">Used for KPI 7.3 and 7.4. Available stock excludes allocated quantity, so it is the stricter measure.</p>
          <ul class="stat-list">${availRows}</ul>
        </div>
      </div>
      <p class="kpi__note" data-insight="basis-diff">Materials classified differently on the two bases: ${diffText}.</p>
    </section>`;
}

function tableSection(m) {
  const reg = m.kpis.inventory.register;
  const f = state.filters;
  const q = f.search.trim().toLowerCase();
  const rows = sortRows(
    reg.items.filter(
      (r) =>
        (f.showService || r.physical) &&
        (!f.position || r.stockPosition === f.position) &&
        (!f.supplied || r.suppliedStatus === f.supplied) &&
        (!f.category || r.material_category === f.category) &&
        (!f.materialCrit || r.materialCriticality === f.materialCrit) &&
        (!f.supplierCrit || r.supplierCriticality === f.supplierCrit) &&
        (!q || `${r.material_id} ${r.material_description} ${r.supplier_id} ${r.supplier_name ?? ''} ${r.material_category}`.toLowerCase().includes(q)),
    ),
    state.sort.key,
    state.sort.dir,
  );
  const head = COLS.map((c) => {
    const active = c.key === state.sort.key;
    return `<th scope="col" class="${c.num ? 'num' : ''}${c.sticky ? ' sticky' : ''}" aria-sort="${active ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="sort" data-inv-sort="${c.key}">${esc(c.label)}<span class="sort__arrow" aria-hidden="true">${active ? (state.sort.dir === 'asc' ? '▲' : '▼') : ''}</span></button></th>`;
  }).join('');
  const body = rows
    .map(
      (r) => `<tr data-material="${esc(r.material_id)}"${r.physical ? '' : ' class="is-service"'}>
        <th scope="row" class="sticky"><span class="sid">${esc(r.material_id)}</span> ${esc(r.material_description)}<span class="cell-sub">${esc(r.material_category)}</span></th>
        <td><a class="link-plain" href="#/suppliers/${encodeURIComponent(r.supplier_id)}" data-supplier-link="${esc(r.supplier_id)}">${esc(r.supplier_id)}</a><span class="cell-sub" data-col="supplier-crit">Supplier: ${esc(r.supplierCriticality ?? NA)}</span></td>
        <td><span class="crit crit--${esc((r.materialCriticality || '').toLowerCase())}" data-col="material-crit">${esc(r.materialCriticality ?? NA)}</span></td>
        <td class="num">${qty(r.on_hand_qty)}<span class="cell-sub">${esc(r.unit_of_measure)}</span></td>
        <td class="num" data-col="available">${qty(r.available_qty)}<span class="cell-sub">${qty(r.allocated_qty)} allocated</span></td>
        <td class="num">${qty(r.safety_stock_qty)} / ${qty(r.reorder_point_qty)}</td>
        <td data-col="position">${r.physical ? `<span class="${posClass(r.stockPosition)}">${esc(r.stockPosition ?? NA)}</span>` : '<span class="no-data">Excluded (SERVICE)</span>'}</td>
        <td data-col="supplied">${esc(r.suppliedStatus ?? NA)}</td>
        <td class="num">${r.physical ? esc(dos(r.days_of_supply)) : '<span class="muted">—</span>'}</td>
        <td class="num"><span class="figure" title="${esc(usd(r.on_hand_inventory_value_usd))}">${esc(usdCompact(r.on_hand_inventory_value_usd))}</span></td></tr>`,
    )
    .join('');
  const uniq = (fn, order) => {
    const v = [...new Set(reg.items.map(fn).filter(Boolean))];
    return order ? v.sort((a, b) => order.indexOf(a) - order.indexOf(b)) : v.sort();
  };
  const shown = reg.items.filter((r) => f.showService || r.physical).length;
  return `
    <section class="section" aria-labelledby="mat-title">
      <div class="section__head"><h2 id="mat-title">Material inventory</h2><p>Default order: most urgent stock position first, then lowest days of supply. Select a heading to sort.</p></div>
      <div class="controls" role="group" aria-label="Material table filters">
        <label class="control">Stock position<select data-ifilter="position">${opts(POSITION_ORDER, f.position)}</select></label>
        <label class="control">Supplied status<select data-ifilter="supplied">${opts(uniq((r) => r.suppliedStatus), f.supplied)}</select></label>
        <label class="control">Material category<select data-ifilter="category">${opts(uniq((r) => r.material_category), f.category)}</select></label>
        <label class="control">Material criticality<select data-ifilter="materialCrit">${opts(uniq((r) => r.materialCriticality, CRIT_ORDER), f.materialCrit)}</select></label>
        <label class="control">Supplier criticality<select data-ifilter="supplierCrit">${opts(uniq((r) => r.supplierCriticality, CRIT_ORDER), f.supplierCrit)}</select></label>
        <label class="control control--check"><input type="checkbox" data-ifilter="showService"${f.showService ? ' checked' : ''}> Show SERVICE materials</label>
        <label class="control control--search">Search<input type="search" data-ifilter="search" value="${esc(f.search)}" placeholder="Material, supplier or category" autocomplete="off"></label>
        <button type="button" class="button-quiet" data-action="reset-inventory">Reset table</button>
      </div>
      <p class="result-count" data-count="inventory" aria-live="polite">Showing ${integer(rows.length)} of ${integer(shown)} ${f.showService ? 'materials' : 'physical materials'}.</p>
      ${rows.length ? '' : '<p class="empty" data-empty="inventory">No materials match these filters. <button type="button" class="link-button" data-action="reset-inventory">Reset table</button></p>'}
      <p class="swipe-hint" id="inv-swipe-hint" data-hint="inventory"${rows.length ? '' : ' hidden'}><span class="swipe-hint__icon" aria-hidden="true">⇆</span> Swipe sideways to see all ${COLS.length} columns. The Material column stays in place.</p>
      <div class="table-wrap table-wrap--bounded" role="region" aria-label="Material inventory table" tabindex="0"${rows.length ? '' : ' hidden'}><table class="data data--compare" data-table="inventory"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="kpi__note">Material criticality comes from the material record; supplier criticality from suppliers.csv. They can differ (for example, a Critical material from a High-criticality supplier). Stock position uses available stock; supplied status uses on-hand stock. SERVICE materials hold no physical stock and are excluded from inventory KPIs.</p>
    </section>`;
}

function unsupported() {
  const items = [
    ['7.8', 'Inventory trend', 'Only one inventory snapshot date is available.'],
    ['—', 'Consumption history and forecast accuracy', 'Not held in the data; days of supply uses a synthetic average daily demand.'],
    ['—', 'Shelf-life expiry and obsolescence', 'Shelf life is held per material, but no batch or receipt dates exist to calculate expiry.'],
    ['—', 'Excess threshold logic', 'The supplied Excess status is used as provided; its rule is not documented, so it is not recalculated.'],
  ];
  return `
    <section class="section" aria-labelledby="ins-title">
      <div class="section__head"><h2 id="ins-title">Not supported by the current data</h2><p>Not calculated or estimated on this page.</p></div>
      <dl class="unsupported">${items.map(([id, l, r]) => `<div data-unsupported="${esc(l)}"><dt>${esc(l)}${id !== '—' ? `<span class="muted">KPI ${esc(id)}</span>` : ''}</dt><dd>${esc(r)}</dd></div>`).join('')}</dl>
    </section>`;
}

let model = null;
let host = null;

function draw() {
  host.innerHTML = `${titleBlock(model)}${notices(model)}${headline(model)}${statusSection(model)}${tableSection(model)}${unsupported()}`;
}

function rerender(sel, caret) {
  const y = window.scrollY;
  draw();
  window.scrollTo(0, y);
  const el = sel && host.querySelector(sel);
  if (el) {
    el.focus({ preventScroll: true });
    if (caret !== undefined && el.setSelectionRange) el.setSelectionRange(caret, caret);
  }
}

function bind(container) {
  const active = () => container === host && container.querySelector('[data-table="inventory"], [data-empty="inventory"]');
  container.addEventListener('click', (e) => {
    if (!active()) return;
    const t = e.target.closest('[data-inv-sort], [data-action="reset-inventory"]');
    if (!t) return;
    if (t.dataset.invSort) {
      const k = t.dataset.invSort;
      const numeric = COLS.find((c) => c.key === k)?.num;
      state.sort = state.sort.key === k ? { key: k, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: numeric && k !== 'dos' && k !== 'available' ? 'desc' : 'asc' };
      rerender(`[data-inv-sort="${k}"]`);
    } else {
      state.sort = { ...DEFAULT_SORT };
      state.filters = { position: '', supplied: '', category: '', materialCrit: '', supplierCrit: '', showService: false, search: '' };
      rerender('[data-ifilter="position"]');
    }
  });
  container.addEventListener('change', (e) => {
    if (!active()) return;
    const t = e.target;
    if (!t.dataset.ifilter || t.dataset.ifilter === 'search') return;
    state.filters[t.dataset.ifilter] = t.type === 'checkbox' ? t.checked : t.value;
    rerender(`[data-ifilter="${t.dataset.ifilter}"]`);
  });
  container.addEventListener('input', (e) => {
    if (!active()) return;
    const t = e.target;
    if (t.dataset.ifilter !== 'search') return;
    state.filters.search = t.value;
    rerender('[data-ifilter="search"]', t.selectionStart);
  });
}

export function renderInventory(container, m) {
  model = m;
  host = container;
  if (!container.dataset.inventoryBound) {
    bind(container);
    container.dataset.inventoryBound = 'true';
  }
  draw();
}

export function resetInventoryViewState() {
  state.sort = { ...DEFAULT_SORT };
  state.filters = { position: '', supplied: '', category: '', materialCrit: '', supplierCrit: '', showService: false, search: '' };
}
