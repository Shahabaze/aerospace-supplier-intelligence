/**
 * Data loader – fetches the six source CSV files and converts them to typed records.
 *
 * Rules (DEC-020, Data Model v2.0 section 3 and controls 14–15):
 *   - Papa Parse automatic typing is OFF. Every cell is read as text first.
 *   - Each value is then converted using the field type in schema.js.
 *   - A blank cell always becomes null. It is never converted to zero.
 *   - A value that cannot be converted is reported as an error. It is never guessed.
 *   - Source files are only read, never written.
 */

import { SCHEMA, DATASET_NAMES } from './schema.js';

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const INTEGER_PATTERN = /^-?\d+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when text is a real calendar date in strict YYYY-MM-DD format. */
export function isIsoDate(text) {
  const m = DATE_PATTERN.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Converts one raw cell to its typed value.
 * Returns { value, error } where error is null when conversion succeeded.
 */
export function convertValue(raw, fieldDef) {
  if (raw === '') return { value: null, error: null };
  switch (fieldDef.type) {
    case 'string':
      return { value: raw, error: null };
    case 'date':
      return isIsoDate(raw)
        ? { value: raw, error: null }
        : { value: null, error: `"${raw}" is not a valid YYYY-MM-DD date` };
    case 'decimal':
      return NUMBER_PATTERN.test(raw)
        ? { value: Number(raw), error: null }
        : { value: null, error: `"${raw}" is not a valid number` };
    case 'integer':
      if (INTEGER_PATTERN.test(raw)) return { value: Number(raw), error: null };
      // Accept "41.0" style whole numbers, reject true fractions.
      if (NUMBER_PATTERN.test(raw) && Number.isInteger(Number(raw))) return { value: Number(raw), error: null };
      return { value: null, error: `"${raw}" is not a valid whole number` };
    case 'flag':
      return raw === '1' || raw === '0'
        ? { value: Number(raw), error: null }
        : { value: null, error: `"${raw}" is not a valid flag (expected 1, 0 or blank)` };
    default:
      return { value: null, error: `unknown field type "${fieldDef.type}"` };
  }
}

/**
 * Parses CSV text for one dataset and types every record.
 *
 * @param {string} datasetName – key in SCHEMA
 * @param {string} csvText – raw file content
 * @param {object} Papa – Papa Parse library object
 * @returns {{name, file, rows, rawRows, headers, issues}}
 *   rows    – typed records; each has a hidden _line property (CSV line number, header = line 1)
 *   rawRows – the untouched text cells, kept for the blank-vs-zero control (15)
 *   issues  – [{ severity: 'error'|'warning', dataset, line, field, message }]
 */
export function parseDataset(datasetName, csvText, Papa) {
  const def = SCHEMA[datasetName];
  if (!def) throw new Error(`Unknown dataset "${datasetName}"`);

  const issues = [];
  const add = (severity, line, field, message) =>
    issues.push({ severity, dataset: datasetName, line, field, message });

  const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText; // strip BOM

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false, // never let the parser guess types (DEC-020)
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields || [];
  const expected = Object.keys(def.fields);

  for (const col of expected) {
    if (!headers.includes(col)) add('error', 1, col, `required column "${col}" is missing`);
  }
  for (const col of headers) {
    if (!expected.includes(col)) add('warning', 1, col, `unexpected column "${col}" is not in Data Model v2.0`);
  }
  const dup = headers.filter((h, i) => headers.indexOf(h) !== i);
  for (const col of new Set(dup)) add('error', 1, col, `column "${col}" appears more than once`);

  for (const err of parsed.errors) {
    // Papa row index is 0-based over data rows; CSV line = row + 2 (header is line 1).
    const line = typeof err.row === 'number' ? err.row + 2 : null;
    add('error', line, null, `CSV structure problem: ${err.message}`);
  }

  const rows = [];
  const rawRows = [];
  parsed.data.forEach((rawRecord, i) => {
    const line = i + 2;
    const typed = {};
    const raw = {};
    for (const [field, fieldDef] of Object.entries(def.fields)) {
      const cell = rawRecord[field];
      const rawText = cell === undefined || cell === null ? '' : String(cell);
      raw[field] = rawText;
      if (rawText !== rawText.trim()) {
        add('warning', line, field, `value "${rawText}" has leading or trailing spaces`);
      }
      const { value, error } = convertValue(rawText, fieldDef);
      if (error) add('error', line, field, error);
      if (rawText === '' && !fieldDef.nullable && headers.includes(field)) {
        add('error', line, field, 'required value is blank (kept as blank, not zero)');
      }
      typed[field] = value;
    }
    Object.defineProperty(typed, '_line', { value: line, enumerable: false });
    Object.defineProperty(raw, '_line', { value: line, enumerable: false });
    rows.push(Object.freeze(typed));
    rawRows.push(Object.freeze(raw));
  });

  return { name: datasetName, file: def.file, headers, rows, rawRows, issues };
}

/**
 * Fetches and parses all six datasets.
 *
 * @param {object} options
 * @param {string} options.basePath – folder URL containing the CSV files (e.g. 'data/')
 * @param {object} [options.Papa] – Papa Parse (defaults to the global loaded by the page)
 * @param {Function} [options.fetchImpl] – fetch function (defaults to window.fetch)
 * @returns {Promise<{datasets: Object<string, object>, issues: Array, loadErrors: Array, sourceText: Object<string,string>}>}
 */
export async function loadAllDatasets({ basePath, Papa = globalThis.Papa, fetchImpl = globalThis.fetch } = {}) {
  if (!Papa) throw new Error('Papa Parse is not loaded');
  const datasets = {};
  const sourceText = {};
  const loadErrors = [];
  let issues = [];

  await Promise.all(
    DATASET_NAMES.map(async (name) => {
      const url = `${basePath}${SCHEMA[name].file}`;
      try {
        const res = await fetchImpl(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        sourceText[name] = text;
        const ds = parseDataset(name, text, Papa);
        datasets[name] = ds;
      } catch (err) {
        loadErrors.push({ dataset: name, file: SCHEMA[name].file, url, message: err.message });
      }
    }),
  );

  for (const name of DATASET_NAMES) if (datasets[name]) issues = issues.concat(datasets[name].issues);
  return { datasets, issues, loadErrors, sourceText };
}

/** Convenience: typed rows by dataset name, e.g. rowsOf(result).purchase_orders */
export function rowsOf(loadResult) {
  const out = {};
  for (const [name, ds] of Object.entries(loadResult.datasets)) out[name] = ds.rows;
  return out;
}
