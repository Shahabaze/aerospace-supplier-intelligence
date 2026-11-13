/**
 * Display formatting helpers. Formatting only – no calculations.
 * A null value is always shown as "Not available", never as 0.
 */

export const NA = 'Not available';

const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const isMissing = (v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));

/** $11.48M / $845.2K / $950 – compact headline money. */
export function usdCompact(v) {
  if (isMissing(v)) return NA;
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
}

/** $11,478,009.20 */
export function usd(v) {
  return isMissing(v) ? NA : usdFull.format(v).replace('-', '−');
}

/** 39.7% (digits default 1) */
export function percent(v, digits = 1) {
  return isMissing(v) ? NA : `${v.toFixed(digits)}%`;
}

/** 2,997 */
export function integer(v) {
  return isMissing(v) ? NA : intFmt.format(v);
}

/** +2.8 days / −0.2 days / 0.0 days */
export function signedDays(v, digits = 1) {
  if (isMissing(v)) return NA;
  const s = v.toFixed(digits);
  const unit = s.replace('-', '') === '1' ? 'day' : 'days';
  if (v > 0) return `+${s} ${unit}`;
  if (v < 0) return `${s.replace('-', '−')} ${unit}`;
  return `${s} ${unit}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-31' → '31 Oct 2026' */
export function date(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? NA;
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Escapes text for safe insertion into HTML. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** "1 event" / "3 events" */
export function plural(n, one, many = `${one}s`) {
  return `${integer(n)} ${n === 1 ? one : many}`;
}
