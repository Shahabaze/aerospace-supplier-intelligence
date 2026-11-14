/**
 * Application start-up and navigation.
 *
 * Sequence: load six CSV files → validate → calculate KPIs → render the selected module.
 * Failures are shown on screen with what went wrong and how to fix it.
 *
 * The document element carries data-app-state = loading | ready | error, which the
 * browser tests use to know when the page has finished.
 */

import { CONFIG } from './config.js';
import { loadAllDatasets, rowsOf } from './data-loader.js';
import { runValidation } from './validation.js';
import { computeAllKpis } from './kpis.js';
import { MODULES, DEFAULT_MODULE, moduleById } from './modules.js';
import { renderExecutive } from './views/executive.js';
import { renderPlaceholder } from './views/placeholder.js';
import { renderSuppliers } from './views/suppliers.js';
import { renderProcurement } from './views/procurement.js';
import { destroyAllCharts } from './charts.js';
import { esc, date } from './format.js';

const main = document.getElementById('main');
const nav = document.getElementById('module-nav-list');
let model = null;
let firstRender = true;

function setState(state) {
  document.documentElement.dataset.appState = state;
  main.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
}

/**
 * Optional ?data=<folder>/ override, used by the tests to simulate missing files.
 * Only simple relative folder paths are accepted.
 */
function dataBasePath() {
  const p = new URLSearchParams(location.search).get('data');
  if (p && /^[A-Za-z0-9_\-./]+\/$/.test(p) && !p.includes('//') && !p.startsWith('/')) return p;
  return CONFIG.dataBasePath;
}

/* ---------- navigation ---------- */

function hashParts() {
  return location.hash.replace(/^#\/?/, '').split(/[/?]/);
}

function currentModuleId() {
  const id = hashParts()[0];
  return moduleById(id) ? id : DEFAULT_MODULE;
}

/** Second part of the address, e.g. the supplier ID in #/suppliers/SUP-007. */
function currentParam() {
  const p = hashParts()[1];
  return p ? decodeURIComponent(p) : null;
}

const VIEWS = {
  executive: (m) => renderExecutive(main, m),
  suppliers: (m) => renderSuppliers(main, m, { selectedId: currentParam() }),
  procurement: (m) => renderProcurement(main, m),
};

let lastModule = null;

function renderNav() {
  nav.innerHTML = MODULES.map(
    (m) => `<li><a href="#/${m.id}" data-module="${m.id}">${esc(m.name)}${m.available ? '' : `<span class="stage">${esc(m.stageLabel)}</span>`}</a></li>`,
  ).join('');
}

function markActive(id) {
  for (const a of nav.querySelectorAll('a')) {
    if (a.dataset.module === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function route() {
  const id = currentModuleId();
  const mod = moduleById(id);
  markActive(id);
  const sameModule = id === lastModule;
  lastModule = id;
  destroyAllCharts();
  document.title = `${mod.name} – Aerospace Supplier Intelligence`;
  main.dataset.module = id;

  if (!mod.available) {
    renderPlaceholder(main, mod);
  } else if (model) {
    try {
      VIEWS[id](model);
    } catch (err) {
      showError('The dashboard could not be displayed', [`Display error: ${err.message}`], ['Reload the page. If the problem continues, report it with the message above.']);
      return;
    }
  }
  // Move focus to the page heading when the module changes (not when a supplier is selected).
  if (!firstRender && !sameModule) main.querySelector('#page-title')?.focus();
  firstRender = false;
}

/* ---------- states ---------- */

function showLoading() {
  main.innerHTML = `<section class="state"><h1 id="page-title" tabindex="-1">Loading data</h1><p class="muted">Reading six CSV files, checking them and calculating KPIs.</p></section>`;
}

function showError(title, problems, fixes) {
  destroyAllCharts();
  main.innerHTML = `
    <section class="state state--error" role="alert" data-error>
      <h1 id="page-title" tabindex="-1">${esc(title)}</h1>
      <ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      ${fixes.map((f) => `<p>${esc(f)}</p>`).join('')}
      <p class="muted">No figures are shown, because they could not be calculated from complete data.</p>
    </section>`;
  setState('error');
}

/* ---------- start ---------- */

async function start() {
  renderNav();
  setState('loading');
  markActive(currentModuleId());
  showLoading();
  window.addEventListener('hashchange', () => {
    if (document.documentElement.dataset.appState !== 'error') route();
  });

  if (!moduleById(currentModuleId())?.available && !location.hash) location.hash = `#/${DEFAULT_MODULE}`;

  let load;
  try {
    load = await loadAllDatasets({ basePath: dataBasePath(), Papa: globalThis.Papa });
  } catch (err) {
    showError('The dashboard could not load its data', [err.message], ['The CSV reading library did not load. Reload the page; if the problem continues, check that src/vendor/ is present.']);
    return;
  }

  if (load.loadErrors.length) {
    const fileProtocol = location.protocol === 'file:';
    showError(
      'The dashboard could not load its data',
      load.loadErrors.map((e) => `${e.file}: ${e.message}`),
      [
        fileProtocol
          ? 'This page was opened directly from a file on your computer. Browsers block data loading in that case. Open the GitHub Pages site, or serve the folder with a local web server.'
          : `Check that the six CSV files are present in the ${dataBasePath()} folder and reload the page.`,
      ],
    );
    return;
  }

  let validation;
  let kpis;
  try {
    validation = runValidation(load, { asOfDate: CONFIG.reportingAsOfDate });
    kpis = computeAllKpis(rowsOf(load), { asOfDate: CONFIG.reportingAsOfDate, minSample: CONFIG.minimumSampleForRate });
  } catch (err) {
    showError('The KPIs could not be calculated', [err.message], ['The source data loaded but could not be processed. Check the validation results in the browser tests (tests/data-layer-tests.html).']);
    return;
  }

  model = { config: CONFIG, load, validation, kpis };
  window.__APP_MODEL__ = model; // read-only reference for the browser tests
  route();
  setState('ready');
  document.getElementById('footer-asof').textContent = date(CONFIG.reportingAsOfDate);
}

start();
