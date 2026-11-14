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

/* ---------- Command centre (dark HUD) charts ---------- */

export const HUD = Object.freeze({
  cyan: '#3fd4ff',
  blue: '#2b7de9',
  deep: '#1a4f9c',
  pale: 'rgba(63, 212, 255, 0.28)',
  amber: '#ffb547',
  text: '#d9e8f6',
  muted: '#8fa9c8',
  grid: 'rgba(63, 212, 255, 0.09)',
});

/** Plugin: soft glow behind every dataset, the HUD's signature. */
const hudGlow = {
  id: 'hudGlow',
  beforeDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = 'rgba(63, 212, 255, 0.55)';
    ctx.shadowBlur = 10;
  },
  afterDatasetsDraw(chart) {
    chart.ctx.restore();
  },
};

const hudTick = { family: 'Barlow Semi Condensed', size: 11 };

function hudChart(canvas, config) {
  const Chart = globalThis.Chart;
  if (!Chart || !canvas) return false;
  reset(canvas.id);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  config.options = {
    maintainAspectRatio: false,
    animation: reduced ? false : { duration: 700 },
    ...config.options,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#04101d', borderColor: HUD.deep, borderWidth: 1, titleColor: HUD.text, bodyColor: HUD.text, titleFont: { family: 'Barlow', weight: '600' }, bodyFont: { family: 'Barlow' } },
      ...(config.options?.plugins || {}),
    },
  };
  config.plugins = [hudGlow, referenceLines, ...(config.plugins || [])];
  charts.set(canvas.id, new Chart(canvas, config));
  return true;
}

const hudAxis = (extra = {}) => ({ ticks: { color: HUD.muted, font: hudTick }, grid: { color: HUD.grid }, border: { color: HUD.grid }, ...extra });

/**
 * Supplier footprint: one node per country at an approximate country centre point,
 * sized by net active PO line value, on a longitude/latitude graticule.
 * @param {{segment, lat, lon, value, overdue, suppliers}[]} nodes
 */
/**
 * Coarse continent outlines (longitude, latitude), drawn only as a dot-matrix backdrop so the
 * country nodes can be read as a world map. Decorative; no data is attached to them.
 */
const LAND = [
  [[-168,66],[-162,70],[-140,70],[-125,72],[-95,74],[-80,72],[-62,66],[-55,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,25],[-84,30],[-90,29],[-97,26],[-97,21],[-92,18],[-88,15],[-83,9],[-78,8],[-82,8],[-86,12],[-92,14],[-105,20],[-110,23],[-112,30],[-117,33],[-124,40],[-124,48],[-132,55],[-140,59],[-152,58],[-158,56],[-165,60]],
  [[-55,60],[-45,60],[-20,70],[-20,82],[-60,82],[-70,77],[-55,70]],
  [[-80,10],[-62,11],[-50,2],[-35,-5],[-38,-13],[-41,-22],[-48,-26],[-58,-38],[-65,-42],[-68,-55],[-74,-52],[-73,-40],[-71,-18],[-76,-14],[-81,-5],[-78,2]],
  [[-10,36],[-9,43],[-2,43.5],[-4,48],[2,51],[8,54],[8,57],[5,62],[15,69],[25,71],[31,70],[40,67],[45,68],[60,69],[60,55],[50,47],[40,41],[28,41],[26,38],[23,36],[20,40],[15,38],[12,44],[8,44],[3,43],[-1,37],[-6,36]],
  [[-6,50],[2,51],[0,53],[-3,56],[-5,59],[-7,57],[-5,54],[-4,52]],
  [[-10,52],[-6,52],[-6,55],[-9,55]],
  [[-24,64],[-13,64],[-15,66],[-22,66]],
  [[-17,21],[-17,15],[-12,7],[-8,4],[5,5],[9,4],[9,-1],[13,-6],[12,-17],[15,-27],[18,-34],[26,-34],[33,-26],[35,-20],[40,-15],[40,-5],[43,0],[51,12],[43,12],[37,18],[32,31],[20,32],[10,37],[-1,36],[-6,35],[-10,30]],
  [[44,-25],[47,-25],[50,-15],[48,-12]],
  [[35,30],[48,30],[56,26],[60,22],[52,16],[44,12],[42,16],[38,24]],
  [[26,41],[40,41],[48,40],[52,37],[60,25],[67,24],[72,20],[77,8],[80,15],[88,22],[92,21],[98,16],[100,13],[103,1],[104,10],[109,12],[107,21],[117,23],[122,30],[121,37],[126,38],[129,35],[129,41],[140,48],[142,54],[135,55],[140,60],[162,60],[165,68],[180,68],[180,72],[140,74],[110,77],[80,73],[68,73],[60,69],[45,68],[40,64],[30,60],[28,50],[30,45]],
  [[130,31],[135,33],[141,37],[142,43],[145,44],[141,45],[139,40],[136,36],[131,34]],
  [[109,1],[117,7],[119,1],[116,-4],[110,-3]],
  [[95,5],[98,4],[106,-6],[102,-4]],
  [[131,-1],[141,-3],[150,-10],[141,-9],[137,-5]],
  [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-25],[153,-28],[150,-37],[146,-39],[140,-38],[135,-35],[130,-32],[116,-35],[114,-26]],
  [[172,-34],[178,-38],[174,-41],[170,-46],[167,-46],[172,-40]],
];

function onLand(lon, lat) {
  return LAND.some((poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

let landDots = null;
function landGrid() {
  if (!landDots) {
    landDots = [];
    for (let lat = 78; lat >= -56; lat -= 3) for (let lon = -177; lon <= 180; lon += 3) if (onLand(lon, lat)) landDots.push([lon, lat]);
  }
  return landDots;
}

export function drawHudMap(canvas, nodes, { labelTop = 3 } = {}) {
  const backdrop = {
    id: 'hudLand',
    beforeDatasetsDraw(chart) {
      const { ctx, scales: { x, y } } = chart;
      ctx.save();
      ctx.fillStyle = 'rgba(63, 212, 255, 0.22)';
      for (const [lon, lat] of landGrid()) {
        ctx.beginPath();
        ctx.arc(x.getPixelForValue(lon), y.getPixelForValue(lat), 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
  const max = Math.max(...nodes.map((n) => n.value), 1);
  const top = new Set([...nodes].sort((a, b) => b.value - a.value).slice(0, labelTop).map((n) => n.segment));
  const labels = {
    id: 'hudMapLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = '600 11px "Barlow Semi Condensed", Barlow, sans-serif';
      ctx.fillStyle = HUD.text;
      meta.data.forEach((el, i) => {
        const n = nodes[i];
        if (!top.has(n.segment)) return;
        const left = n.lon < 0 || n.lon > 160; // label on the side with open space
        ctx.textAlign = left ? 'right' : 'left';
        const dx = left ? -(el.options.radius + 4) : el.options.radius + 4;
        ctx.fillText(n.segment, el.x + dx, el.y + 4);
      });
      ctx.restore();
    },
  };
  return hudChart(canvas, {
    type: 'bubble',
    data: {
      datasets: [{
        data: nodes.map((n) => ({ x: n.lon, y: n.lat, r: 3 + 15 * Math.sqrt(n.value / max) })),
        backgroundColor: nodes.map((n) => (n.overdue > 0 ? 'rgba(63, 212, 255, 0.45)' : 'rgba(63, 212, 255, 0.25)')),
        borderColor: HUD.cyan,
        borderWidth: 1,
      }],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => nodes[items[0].dataIndex].segment,
            label: (ctx) => {
              const n = nodes[ctx.dataIndex];
              return [` ${n.suppliers} supplier${n.suppliers === 1 ? '' : 's'}`, ` Net active ${usdShort(n.value)}`, ` Overdue open ${usdShort(n.overdue)}`];
            },
          },
        },
      },
      scales: {
        x: hudAxis({ min: -180, max: 180, ticks: { display: false, stepSize: 30 }, grid: { color: 'rgba(63, 212, 255, 0.05)' } }),
        y: hudAxis({ min: -60, max: 80, ticks: { display: false, stepSize: 20 }, grid: { color: 'rgba(63, 212, 255, 0.05)' } }),
      },
    },
    plugins: [backdrop, labels],
  });
}

function usdShort(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** Pareto: share bars and glowing cumulative line, 80% reference. rows: {id, share, cumulative} */
export function drawHudPareto(canvas, rows) {
  return hudChart(canvas, {
    data: {
      labels: rows.map((r) => r.id),
      datasets: [
        { type: 'line', label: 'Cumulative share', data: rows.map((r) => r.cumulative), borderColor: HUD.cyan, backgroundColor: 'rgba(63, 212, 255, 0.08)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.25, order: 1 },
        { type: 'bar', label: 'Supplier share', data: rows.map((r) => r.share), backgroundColor: rows.map((r) => (r.cumulative - r.share < 80 ? HUD.blue : HUD.deep)), borderWidth: 0, order: 2 },
      ],
    },
    options: {
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` } },
        referenceLines: { lines: [{ axis: 'y', value: 80, label: '80%', color: HUD.muted }] },
      },
      scales: {
        x: hudAxis({ ticks: { display: false }, grid: { display: false } }),
        y: hudAxis({ min: 0, max: 100, ticks: { color: HUD.muted, font: hudTick, stepSize: 20, callback: (v) => `${v}%` } }),
      },
    },
  });
}

/**
 * Bars for the HUD (vertical by default).
 * @param {{labels: string[], values: number[], colors?: string[], format?: Function, horizontal?: boolean, max?: number, reference?: {value, label}}} spec
 */
export function drawHudBars(canvas, spec) {
  const fmt = spec.format || ((v) => String(v));
  const valueAxis = hudAxis({ beginAtZero: true, max: spec.max, ticks: { color: HUD.muted, font: hudTick, maxTicksLimit: 5, callback: (v) => fmt(v) } });
  const catAxis = hudAxis({ grid: { display: false }, ticks: { color: HUD.text, font: hudTick, autoSkip: false } });
  return hudChart(canvas, {
    type: 'bar',
    data: { labels: spec.labels, datasets: [{ data: spec.values, backgroundColor: spec.colors || HUD.blue, borderColor: HUD.cyan, borderWidth: { top: spec.horizontal ? 0 : 1, right: spec.horizontal ? 1 : 0 }, borderSkipped: false, barPercentage: 0.7 }] },
    options: {
      indexAxis: spec.horizontal ? 'y' : 'x',
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${fmt(spec.horizontal ? ctx.parsed.x : ctx.parsed.y)}` } },
        referenceLines: spec.reference ? { lines: [{ axis: spec.horizontal ? 'x' : 'y', value: spec.reference.value, label: spec.reference.label, color: HUD.amber }] } : {},
      },
      scales: spec.horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
    },
  });
}

/** Two series side by side per category (horizontal). series: [{label, data, color}] */
export function drawHudPairedBars(canvas, labels, series, format = (v) => `${v.toFixed(1)}%`) {
  return hudChart(canvas, {
    type: 'bar',
    data: { labels, datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.color, borderWidth: 0, barPercentage: 0.8, categoryPercentage: 0.7 })) },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: HUD.text, font: { family: 'Barlow', size: 12 }, boxWidth: 12, boxHeight: 12 } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${format(ctx.parsed.x)}` } },
      },
      scales: {
        x: hudAxis({ beginAtZero: true, max: 100, ticks: { color: HUD.muted, font: hudTick, stepSize: 25, callback: (v) => `${v}%` } }),
        y: hudAxis({ grid: { display: false }, ticks: { color: HUD.text, font: { family: 'Barlow', size: 12 } } }),
      },
    },
  });
}

/** Ring chart for category counts. */
export function drawHudDoughnut(canvas, labels, values, colors) {
  return hudChart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#0a1a2d', borderWidth: 3, hoverOffset: 4 }] },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: HUD.text, font: { family: 'Barlow', size: 12 }, boxWidth: 12, boxHeight: 12, padding: 10 } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
      },
    },
  });
}
