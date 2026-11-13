/**
 * Minimal browser test harness (no dependencies).
 *
 * Usage: test('group', 'name', async () => { assertEqual(a, b) }); then await runTests(container).
 * Results are rendered as a table and exposed on window.__TEST_RESULTS__ so the same page can be
 * run by a person in a browser or by an automated headless browser.
 */

const registered = [];

export function test(group, name, fn) {
  registered.push({ group, name, fn });
}

export class AssertionError extends Error {}

export function assert(condition, message = 'assertion failed') {
  if (!condition) throw new AssertionError(message);
}

export function assertEqual(actual, expected, label = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new AssertionError(`${label ? label + ': ' : ''}expected ${e}, got ${a}`);
}

export function assertClose(actual, expected, tolerance, label = '') {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
    throw new AssertionError(`${label ? label + ': ' : ''}expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function runTests(container) {
  const results = [];
  const started = performance.now();
  for (const t of registered) {
    try {
      await t.fn();
      results.push({ group: t.group, name: t.name, status: 'pass', message: '' });
    } catch (err) {
      results.push({ group: t.group, name: t.name, status: 'fail', message: err.message });
    }
  }
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    durationMs: Math.round(performance.now() - started),
    userAgent: navigator.userAgent,
    ranAt: new Date().toISOString(),
  };

  if (container) {
    const rows = results
      .map(
        (r) => `<tr class="${r.status}"><td>${esc(r.group)}</td><td>${esc(r.name)}</td>
        <td class="status">${r.status === 'pass' ? 'PASS' : 'FAIL'}</td><td>${esc(r.message)}</td></tr>`,
      )
      .join('');
    container.innerHTML = `
      <p class="summary ${summary.failed ? 'fail' : 'pass'}">
        ${summary.passed} of ${summary.total} tests passed${summary.failed ? ` — ${summary.failed} FAILED` : ''}
        <span class="meta">(${summary.durationMs} ms · ${esc(summary.ranAt)})</span></p>
      <table><thead><tr><th>Group</th><th>Test</th><th>Result</th><th>Detail</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  window.__TEST_RESULTS__ = { summary, results };
  document.documentElement.dataset.testsDone = 'true';
  return { summary, results };
}
