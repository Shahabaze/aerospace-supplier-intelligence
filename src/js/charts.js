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
