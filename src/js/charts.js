/**
 * Chart helpers (Chart.js, pinned local copy – DEC-016).
 * Charts are always accompanied by a text table, so the figures stay readable
 * if Chart.js fails to load or for screen-reader users.
 */

const COLORS = {
  signal: '#1d5fa8',
  signalMuted: '#9db6d3',
  ink: '#13263c',
  steel: '#56677b',
  rule: '#dfe5ec',
};

const charts = new Map();

/** Destroys any chart previously drawn on this canvas id. */
function reset(id) {
  if (charts.has(id)) {
    charts.get(id).destroy();
    charts.delete(id);
  }
}

/**
 * Horizontal bar chart of supplier concentration (% of net active PO line value).
 * @param {HTMLCanvasElement} canvas
 * @param {{label: string, value: number, isOther?: boolean}[]} bars
 * @returns {boolean} true when drawn, false when Chart.js is unavailable
 */
export function drawConcentrationChart(canvas, bars) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: bars.map((b) => b.label),
      datasets: [
        {
          data: bars.map((b) => b.value),
          backgroundColor: bars.map((b) => (b.isOther ? COLORS.signalMuted : COLORS.signal)),
          borderWidth: 0,
          barPercentage: 0.78,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x.toFixed(2)}% of net active PO line value` } },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: (v) => `${v}%`, color: COLORS.steel, font: { family: 'Barlow Semi Condensed', size: 12 } },
          grid: { color: COLORS.rule },
          title: { display: true, text: 'Share of net active PO line value', color: COLORS.steel, font: { family: 'Barlow', size: 12 } },
        },
        y: {
          ticks: {
            color: COLORS.ink,
            autoSkip: false,
            font: { family: 'Barlow', size: 12 },
            // On narrow screens show the supplier ID only; full names stay in the table.
            callback(value) {
              const label = this.getLabelForValue(value);
              return this.chart.width < 520 && label.startsWith('SUP-') ? label.split(' ')[0] : label;
            },
          },
          grid: { display: false },
        },
      },
    },
  });
  charts.set(canvas.id, chart);
  return true;
}

export function destroyAllCharts() {
  for (const id of [...charts.keys()]) reset(id);
}

/** Plugin: dashed reference line(s) at fixed axis values. */
const referenceLines = {
  id: 'referenceLines',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea: a, scales } = chart;
    for (const line of opts.lines || []) {
      const scale = scales[line.axis];
      if (!scale || line.value === null || line.value === undefined) continue;
      const px = scale.getPixelForValue(line.value);
      ctx.save();
      ctx.strokeStyle = line.color || COLORS.steel;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (line.axis === 'y') { ctx.moveTo(a.left, px); ctx.lineTo(a.right, px); } else { ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); }
      ctx.stroke();
      if (line.label) {
        ctx.setLineDash([]);
        ctx.fillStyle = line.color || COLORS.steel;
        ctx.font = '12px Barlow, sans-serif';
        ctx.textAlign = line.axis === 'y' ? 'right' : 'left';
        if (line.axis === 'y') ctx.fillText(line.label, a.right - 4, px - 5); else ctx.fillText(line.label, px + 4, a.top + 12);
      }
      ctx.restore();
    }
  },
};

const tickFont = { family: 'Barlow Semi Condensed', size: 12 };
const titleFont = { family: 'Barlow', size: 12 };

/**
 * Bubble chart: supplier share of net active PO value (x) against Delivery Event OTD (y).
 * Bubble area reflects the number of delivered events behind the OTD figure.
 * @param {{id, label, x, y, n}[]} points
 * @param {{portfolioOtd: number|null, basisLabel: string, onSelect?: Function}} opts
 */
export function drawExposureChart(canvas, points, { portfolioOtd, basisLabel, onSelect }) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const chart = new Chart(canvas, {
    type: 'bubble',
    data: {
      datasets: [{
        data: points.map((p) => ({ x: p.x, y: p.y, r: 4 + Math.sqrt(p.n) * 3, id: p.id, label: p.label, n: p.n })),
        backgroundColor: points.map((p) => (p.n < (p.minSample ?? 3) ? 'rgba(29,95,168,0.18)' : 'rgba(29,95,168,0.55)')),
        borderColor: COLORS.signal,
        borderWidth: 1,
      }],
    },
    options: {
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => { const r = ctx.raw; return ` ${r.label}: OTD ${r.y.toFixed(1)}% (${r.n} events), ${r.x.toFixed(2)}% of net active PO value`; } } },
        referenceLines: { lines: [{ axis: 'y', value: portfolioOtd, label: portfolioOtd === null ? '' : `Portfolio ${portfolioOtd.toFixed(1)}%` }] },
      },
      onClick: (_e, els) => { if (els.length && onSelect) onSelect(chart.data.datasets[0].data[els[0].index].id); },
      scales: {
        x: {
          type: 'logarithmic', min: 0.01, max: 100,
          afterBuildTicks: (axis) => { axis.ticks = [0.01, 0.1, 1, 10, 100].map((value) => ({ value })); },
          ticks: { color: COLORS.steel, font: tickFont, maxRotation: 0, autoSkip: false, callback: (v) => `${v}%` },
          grid: { color: COLORS.rule }, title: { display: true, text: 'Share of net active PO line value (log scale)', color: COLORS.steel, font: titleFont } },
        y: { min: -5, max: 105, ticks: { color: COLORS.steel, font: tickFont, stepSize: 25, callback: (v) => (v >= 0 && v <= 100 ? `${v}%` : '') }, grid: { color: COLORS.rule }, title: { display: true, text: `Delivery Event OTD – ${basisLabel}`, color: COLORS.steel, font: titleFont } },
      },
    },
    plugins: [referenceLines],
  });
  charts.set(canvas.id, chart);
  return true;
}

/**
 * Scatter: delivery variance (days) of each delivered event against its actual delivery date.
 * @param {{t: number, y: number, onTime: boolean, id: string, inPeriod: boolean}[]} points (t = epoch ms)
 */
export function drawVarianceTimeline(canvas, points, { asOfMs, startMs }) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fmt = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' });
  const ys = points.map((p) => p.y);
  const pad = 2;
  const chart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        { label: 'On time or early', data: points.filter((p) => p.onTime), backgroundColor: COLORS.signal, pointRadius: 5, pointStyle: 'circle' },
        { label: 'Late', data: points.filter((p) => !p.onTime), backgroundColor: '#b26a00', pointRadius: 6, pointStyle: 'rectRot' },
      ].map((ds) => ({ ...ds, data: ds.data.map((p) => ({ x: p.t, y: p.y, id: p.id, inPeriod: p.inPeriod })) })),
    },
    options: {
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 300 },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, font: titleFont, color: COLORS.ink } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw.id}: ${ctx.raw.y > 0 ? '+' : ''}${ctx.raw.y} days, delivered ${fmt(ctx.raw.x)}${ctx.raw.inPeriod ? '' : ' (after as-of date)'}` } },
        referenceLines: { lines: [{ axis: 'y', value: 0, label: 'Promised date' }, { axis: 'x', value: asOfMs, label: 'As of' }] },
      },
      scales: {
        x: {
          type: 'linear',
          // Range: reporting-period start to the later of the as-of date and the last event, plus a margin.
          min: (startMs ?? Math.min(...points.map((p) => p.t))) - 15 * 86400000,
          max: Math.max(asOfMs, ...points.map((p) => p.t)) + 15 * 86400000,
          ticks: { color: COLORS.steel, font: tickFont, maxTicksLimit: 7, maxRotation: 0, callback: (v) => fmt(v) },
          grid: { color: COLORS.rule },
        },
        y: { suggestedMin: Math.min(-pad, ...ys) - 1, suggestedMax: Math.max(pad, ...ys) + 1, ticks: { color: COLORS.steel, font: tickFont, precision: 0, callback: (v) => `${v > 0 ? '+' : ''}${v} d` }, grid: { color: COLORS.rule }, title: { display: true, text: 'Days late (+) or early (−)', color: COLORS.steel, font: titleFont } },
      },
    },
    plugins: [referenceLines],
  });
  charts.set(canvas.id, chart);
  return true;
}

/**
 * Ageing chart: overdue open PO value per bucket, with line counts in the labels.
 * @param {{label: string, value: number, lines: number}[]} buckets
 */
export function drawAgeingChart(canvas, buckets) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const money = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}K`);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: buckets.map((b) => [b.label, `${b.lines} line${b.lines === 1 ? '' : 's'}`]),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: ['#9db6d3', '#5f8cc0', '#1d5fa8', '#13263c'], borderWidth: 0, barPercentage: 0.7 }],
    },
    options: {
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 400 },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${money(ctx.parsed.y)} overdue open value, ${buckets[ctx.dataIndex].lines} PO lines` } } },
      scales: {
        x: { ticks: { color: COLORS.ink, font: titleFont }, grid: { display: false }, title: { display: true, text: 'Days past recorded promised date', color: COLORS.steel, font: titleFont } },
        y: { beginAtZero: true, ticks: { color: COLORS.steel, font: tickFont, callback: (v) => money(v) }, grid: { color: COLORS.rule }, title: { display: true, text: 'Overdue open PO value', color: COLORS.steel, font: titleFont } },
      },
    },
  });
  charts.set(canvas.id, chart);
  return true;
}

/**
 * Pareto chart: supplier share of net active PO value (bars) and cumulative share (line).
 * @param {{id: string, share: number, cumulative: number}[]} rows sorted descending
 */
export function drawParetoChart(canvas, rows, { onSelect } = {}) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const chart = new Chart(canvas, {
    data: {
      labels: rows.map((r) => r.id),
      datasets: [
        { type: 'bar', label: 'Share of net active PO value', data: rows.map((r) => r.share), backgroundColor: rows.map((r) => (r.cumulative - r.share < 80 ? COLORS.signal : COLORS.signalMuted)), borderWidth: 0, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Cumulative share', data: rows.map((r) => r.cumulative), borderColor: COLORS.ink, backgroundColor: COLORS.ink, pointRadius: 2, borderWidth: 1.5, yAxisID: 'y', order: 1 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 400 },
      plugins: {
        legend: { position: 'bottom', labels: { font: titleFont, color: COLORS.ink, boxWidth: 14 } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` } },
        referenceLines: { lines: [{ axis: 'y', value: 80, label: '80%' }] },
      },
      onClick: (_e, els) => { if (els.length && onSelect) onSelect(rows[els[0].index].id); },
      scales: {
        x: { ticks: { color: COLORS.ink, font: { family: 'Barlow Semi Condensed', size: 11 }, maxRotation: 90, minRotation: 60, autoSkip: false }, grid: { display: false } },
        y: { min: 0, max: 100, ticks: { color: COLORS.steel, font: tickFont, stepSize: 20, callback: (v) => `${v}%` }, grid: { color: COLORS.rule } },
      },
    },
    plugins: [referenceLines],
  });
  charts.set(canvas.id, chart);
  return true;
}

/**
 * Promise-to-request gap distribution: PO lines per gap in days.
 * @param {{days: number, lines: number}[]} dist
 */
export function drawGapChart(canvas, dist) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dist.map((x) => (x.days > 0 ? `+${x.days}` : `${x.days}`)),
      datasets: [{ data: dist.map((x) => x.lines), backgroundColor: dist.map((x) => (x.days > 0 ? '#b26a00' : x.days === 0 ? COLORS.steel : COLORS.signal)), borderWidth: 0, barPercentage: 0.85 }],
    },
    options: {
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 300 },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => `${items[0].label} days`, label: (ctx) => ` ${ctx.parsed.y} PO lines` } } },
      scales: {
        x: { ticks: { color: COLORS.ink, font: tickFont }, grid: { display: false }, title: { display: true, text: 'Current promised date minus requested date (days)', color: COLORS.steel, font: titleFont } },
        y: { beginAtZero: true, ticks: { color: COLORS.steel, font: tickFont, precision: 0 }, grid: { color: COLORS.rule }, title: { display: true, text: 'PO lines', color: COLORS.steel, font: titleFont } },
      },
    },
  });
  charts.set(canvas.id, chart);
  return true;
}
