/**
 * Validation layer.
 *
 * Implements:
 *   - The 17 data quality and validation controls in docs/data-model.md v2.0, section 8 (C01–C17).
 *   - Supplementary checks for the dataset-specific rules in Data Model v2.0, section 5 (S00–S06).
 *   - Data-quality notices approved in the decision log (DEC-017, DEC-018, DEC-019).
 *
 * Each check returns:
 *   { id, title, reference, status: 'pass'|'fail'|'not_run', checked, failureCount, failures[], detail }
 *
 * The validation layer reads typed data only. It never changes source data.
 */

import { SCHEMA, DATASET_NAMES, SERVICE_UOM, isPhysical, keyOf } from './schema.js';
import { isIsoDate } from './data-loader.js';

const QTY_TOLERANCE = 1e-9;
const MONEY_TOLERANCE = 0.01; // one cent
const RATE_TOLERANCE = 0.01; // rejection_rate_pct is stored to two decimals
const DPM_TOLERANCE = 1; // DPM is stored to whole or one-decimal units
const MAX_LISTED_FAILURES = 50;

/* ---------- helpers ---------- */

function result(id, title, reference, checked, failures, detail = '') {
  return {
    id,
    title,
    reference,
    status: failures.length === 0 ? 'pass' : 'fail',
    checked,
    failureCount: failures.length,
    failures: failures.slice(0, MAX_LISTED_FAILURES),
    detail,
  };
}

function notRun(id, title, reference, reason) {
  return { id, title, reference, status: 'not_run', checked: 0, failureCount: 0, failures: [], detail: reason };
}

const fail = (dataset, key, detail) => ({ dataset, key, detail });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Whole days from date text a to date text b (b − a). Both must be YYYY-MM-DD. */
export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

function indexBy(rows, field) {
  const m = new Map();
  for (const r of rows) m.set(r[field], r);
  return m;
}

/* ---------- the 17 Data Model controls ---------- */

const CONTROLS = [
  {
    id: 'C01',
    title: 'Primary keys are unique within each dataset',
    reference: 'Data Model 8.1',
    run(d) {
      const failures = [];
      let checked = 0;
      for (const name of DATASET_NAMES) {
        const seen = new Map();
        for (const r of d[name]) {
          checked++;
          const k = keyOf(name, r);
          if (SCHEMA[name].primaryKey.some((f) => r[f] === null)) {
            failures.push(fail(name, k, `primary key is blank (line ${r._line})`));
          } else if (seen.has(k)) {
            failures.push(fail(name, k, `duplicate key on lines ${seen.get(k)} and ${r._line}`));
          } else seen.set(k, r._line);
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C02',
    title: 'All supplier references resolve to suppliers.supplier_id',
    reference: 'Data Model 8.2',
    run(d) {
      const ids = new Set(d.suppliers.map((r) => r.supplier_id));
      const failures = [];
      let checked = 0;
      for (const name of ['materials', 'purchase_orders', 'delivery_transactions', 'inventory_snapshot', 'supplier_quality']) {
        for (const r of d[name]) {
          checked++;
          if (!ids.has(r.supplier_id)) failures.push(fail(name, keyOf(name, r), `supplier_id "${r.supplier_id}" not found in suppliers.csv`));
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C03',
    title: 'All material references resolve to materials.material_id',
    reference: 'Data Model 8.3',
    run(d) {
      const ids = new Set(d.materials.map((r) => r.material_id));
      const failures = [];
      let checked = 0;
      for (const name of ['purchase_orders', 'delivery_transactions', 'inventory_snapshot', 'supplier_quality']) {
        for (const r of d[name]) {
          checked++;
          if (!ids.has(r.material_id)) failures.push(fail(name, keyOf(name, r), `material_id "${r.material_id}" not found in materials.csv`));
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C04',
    title: 'Every delivery event resolves to a valid PO and PO line',
    reference: 'Data Model 8.4',
    run(d) {
      const lines = indexBy(d.purchase_orders, 'po_line_id');
      const failures = [];
      for (const r of d.delivery_transactions) {
        const line = lines.get(r.po_line_id);
        if (!line) failures.push(fail('delivery_transactions', r.delivery_id, `po_line_id "${r.po_line_id}" not found in purchase_orders.csv`));
        else if (line.po_id !== r.po_id) failures.push(fail('delivery_transactions', r.delivery_id, `po_id "${r.po_id}" does not match PO line's po_id "${line.po_id}"`));
      }
      return { checked: d.delivery_transactions.length, failures };
    },
  },
  {
    id: 'C05',
    title: 'Delivery supplier and material identifiers agree with the referenced PO line',
    reference: 'Data Model 8.5',
    run(d) {
      const lines = indexBy(d.purchase_orders, 'po_line_id');
      const failures = [];
      for (const r of d.delivery_transactions) {
        const line = lines.get(r.po_line_id);
        if (!line) continue; // reported by C04
        if (line.supplier_id !== r.supplier_id) failures.push(fail('delivery_transactions', r.delivery_id, `supplier_id ${r.supplier_id} ≠ PO line ${line.supplier_id}`));
        if (line.material_id !== r.material_id) failures.push(fail('delivery_transactions', r.delivery_id, `material_id ${r.material_id} ≠ PO line ${line.material_id}`));
      }
      return { checked: d.delivery_transactions.length, failures };
    },
  },
  {
    id: 'C06',
    title: 'Delivery received quantities reconcile to PO-line received quantities',
    reference: 'Data Model 8.6',
    run(d) {
      const sums = new Map();
      for (const r of d.delivery_transactions) sums.set(r.po_line_id, (sums.get(r.po_line_id) || 0) + (r.received_qty ?? 0));
      const failures = [];
      for (const line of d.purchase_orders) {
        const s = sums.get(line.po_line_id) || 0;
        if (!near(s, line.received_qty, QTY_TOLERANCE)) {
          failures.push(fail('purchase_orders', line.po_line_id, `received_qty ${line.received_qty} ≠ sum of delivery received_qty ${s}`));
        }
      }
      return { checked: d.purchase_orders.length, failures };
    },
  },
  {
    id: 'C07',
    title: 'Delivery accepted plus rejected quantities equal received quantity',
    reference: 'Data Model 8.7',
    run(d) {
      const failures = [];
      for (const r of d.delivery_transactions) {
        if (!near(r.accepted_qty + r.rejected_qty, r.received_qty, QTY_TOLERANCE)) {
          failures.push(fail('delivery_transactions', r.delivery_id, `accepted ${r.accepted_qty} + rejected ${r.rejected_qty} ≠ received ${r.received_qty}`));
        }
      }
      return { checked: d.delivery_transactions.length, failures };
    },
  },
  {
    id: 'C08',
    title: 'Inspection accepted plus rejected quantities equal inspected quantity',
    reference: 'Data Model 8.8',
    run(d) {
      const failures = [];
      for (const r of d.supplier_quality) {
        if (!near(r.accepted_qty + r.rejected_qty, r.inspected_qty, QTY_TOLERANCE)) {
          failures.push(fail('supplier_quality', r.inspection_id, `accepted ${r.accepted_qty} + rejected ${r.rejected_qty} ≠ inspected ${r.inspected_qty}`));
        }
      }
      return { checked: d.supplier_quality.length, failures };
    },
  },
  {
    id: 'C09',
    title: 'Inspection rejected quantity reconciles to the linked delivery event',
    reference: 'Data Model 8.9 (and 5.6 foreign keys)',
    run(d) {
      const dels = indexBy(d.delivery_transactions, 'delivery_id');
      const failures = [];
      for (const q of d.supplier_quality) {
        const del = dels.get(q.delivery_id);
        if (!del) {
          failures.push(fail('supplier_quality', q.inspection_id, `delivery_id "${q.delivery_id}" not found in delivery_transactions.csv`));
          continue;
        }
        for (const k of ['po_id', 'po_line_id', 'supplier_id', 'material_id']) {
          if (q[k] !== del[k]) failures.push(fail('supplier_quality', q.inspection_id, `${k} ${q[k]} ≠ linked delivery ${del[k]}`));
        }
        if (!near(q.rejected_qty, del.rejected_qty, QTY_TOLERANCE)) {
          failures.push(fail('supplier_quality', q.inspection_id, `rejected_qty ${q.rejected_qty} ≠ delivery ${del.delivery_id} rejected_qty ${del.rejected_qty}`));
        }
      }
      return { checked: d.supplier_quality.length, failures };
    },
  },
  {
    id: 'C10',
    title: 'Inventory available quantity equals on-hand less allocated',
    reference: 'Data Model 8.10',
    run(d) {
      const failures = [];
      for (const r of d.inventory_snapshot) {
        if (!near(r.on_hand_qty - r.allocated_qty, r.available_qty, QTY_TOLERANCE)) {
          failures.push(fail('inventory_snapshot', keyOf('inventory_snapshot', r), `on-hand ${r.on_hand_qty} − allocated ${r.allocated_qty} ≠ available ${r.available_qty}`));
        }
      }
      return { checked: d.inventory_snapshot.length, failures };
    },
  },
  {
    id: 'C11',
    title: 'Inventory values reconcile to quantity × standard cost',
    reference: 'Data Model 8.11',
    run(d) {
      const failures = [];
      for (const r of d.inventory_snapshot) {
        const k = keyOf('inventory_snapshot', r);
        const oh = r.on_hand_qty * r.standard_cost_usd;
        const av = r.available_qty * r.standard_cost_usd;
        if (!near(oh, r.on_hand_inventory_value_usd, MONEY_TOLERANCE)) failures.push(fail('inventory_snapshot', k, `on-hand value ${r.on_hand_inventory_value_usd} ≠ ${oh.toFixed(2)}`));
        if (!near(av, r.available_inventory_value_usd, MONEY_TOLERANCE)) failures.push(fail('inventory_snapshot', k, `available value ${r.available_inventory_value_usd} ≠ ${av.toFixed(2)}`));
      }
      return { checked: d.inventory_snapshot.length * 2, failures };
    },
  },
  {
    id: 'C12',
    title: 'Quantities are not negative',
    reference: 'Data Model 8.12',
    run(d) {
      const failures = [];
      let checked = 0;
      for (const name of DATASET_NAMES) {
        const qtyFields = Object.keys(SCHEMA[name].fields).filter((f) => f.endsWith('_qty'));
        for (const r of d[name]) {
          for (const f of qtyFields) {
            if (r[f] === null) continue;
            checked++;
            if (r[f] < 0) failures.push(fail(name, keyOf(name, r), `${f} is negative (${r[f]})`));
          }
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C13',
    title: 'Units of measure are consistent across material, PO, delivery and inventory records',
    reference: 'Data Model 8.13',
    run(d) {
      const mats = indexBy(d.materials, 'material_id');
      const failures = [];
      let checked = 0;
      for (const name of ['purchase_orders', 'delivery_transactions', 'inventory_snapshot']) {
        for (const r of d[name]) {
          const m = mats.get(r.material_id);
          if (!m) continue; // reported by C03
          checked++;
          if (r.unit_of_measure !== m.unit_of_measure) {
            failures.push(fail(name, keyOf(name, r), `unit_of_measure ${r.unit_of_measure} ≠ material master ${m.unit_of_measure}`));
          }
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C14',
    title: 'Date fields use ISO format YYYY-MM-DD',
    reference: 'Data Model 8.14',
    run(d, ctx) {
      const failures = [];
      let checked = 0;
      for (const name of DATASET_NAMES) {
        const dateFields = Object.entries(SCHEMA[name].fields).filter(([, def]) => def.type === 'date').map(([f]) => f);
        for (const raw of ctx.raw[name]) {
          for (const f of dateFields) {
            if (raw[f] === '') continue;
            checked++;
            if (!isIsoDate(raw[f])) failures.push(fail(name, `line ${raw._line}`, `${f} "${raw[f]}" is not a valid YYYY-MM-DD date`));
          }
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'C15',
    title: 'Blank values remain distinguishable from numeric zero',
    reference: 'Data Model 8.15',
    run(d, ctx) {
      const failures = [];
      let checked = 0;
      let blanks = 0;
      let zeros = 0;
      for (const name of DATASET_NAMES) {
        const fields = SCHEMA[name].fields;
        d[name].forEach((r, i) => {
          const raw = ctx.raw[name][i];
          for (const [f, def] of Object.entries(fields)) {
            checked++;
            if (raw[f] === '') {
              blanks++;
              if (r[f] !== null) failures.push(fail(name, keyOf(name, r), `${f}: blank cell was converted to ${JSON.stringify(r[f])}`));
            } else if (['decimal', 'integer', 'flag'].includes(def.type)) {
              if (r[f] === null) continue; // conversion error, reported by S00
              if (!isNum(r[f]) || r[f] !== Number(raw[f])) failures.push(fail(name, keyOf(name, r), `${f}: "${raw[f]}" converted to ${JSON.stringify(r[f])}`));
              if (r[f] === 0) zeros++;
            }
          }
        });
      }
      return { checked, failures, detail: `${blanks} blank cells kept as blank (null); ${zeros} numeric zeros kept as 0` };
    },
  },
  {
    id: 'C16',
    title: 'Service materials are excluded from physical inventory calculations',
    reference: 'Data Model 8.16',
    run(d) {
      const failures = [];
      const serviceMats = d.materials.filter((m) => m.unit_of_measure === SERVICE_UOM).map((m) => m.material_id);
      const serviceSet = new Set(serviceMats);
      for (const r of d.inventory_snapshot) {
        const shouldBeService = serviceSet.has(r.material_id);
        if (shouldBeService && isPhysical(r)) {
          failures.push(fail('inventory_snapshot', keyOf('inventory_snapshot', r), 'service material would be counted as physical stock'));
        }
        if (!shouldBeService && !isPhysical(r)) {
          failures.push(fail('inventory_snapshot', keyOf('inventory_snapshot', r), 'physical material carries SERVICE unit of measure'));
        }
      }
      const physical = d.inventory_snapshot.filter(isPhysical).length;
      const excluded = d.inventory_snapshot.length - physical;
      return {
        checked: d.inventory_snapshot.length,
        failures,
        detail: `${serviceMats.length} service material(s) in master (${serviceMats.join(', ') || 'none'}); ${excluded} inventory record(s) excluded, ${physical} physical record(s) used for inventory KPIs`,
      };
    },
  },
  {
    id: 'C17',
    title: 'Join cardinality supports grain-safe KPI aggregation (no duplicate counting)',
    reference: 'Data Model 8.17',
    run(d) {
      const failures = [];
      // PO-line key must be unique so PO values are counted once.
      const poLineCounts = new Map();
      for (const r of d.purchase_orders) poLineCounts.set(r.po_line_id, (poLineCounts.get(r.po_line_id) || 0) + 1);
      for (const [k, n] of poLineCounts) if (n > 1) failures.push(fail('purchase_orders', k, `PO line appears ${n} times; PO values would be double counted`));
      // Zero or one inspection per delivery event (Data Model 4.2).
      const inspCounts = new Map();
      for (const q of d.supplier_quality) inspCounts.set(q.delivery_id, (inspCounts.get(q.delivery_id) || 0) + 1);
      for (const [k, n] of inspCounts) if (n > 1) failures.push(fail('supplier_quality', k, `${n} inspections linked to one delivery event`));
      // Inventory: one record per material per snapshot date (Data Model 4.2).
      const invCounts = new Map();
      for (const r of d.inventory_snapshot) {
        const k = keyOf('inventory_snapshot', r);
        invCounts.set(k, (invCounts.get(k) || 0) + 1);
      }
      for (const [k, n] of invCounts) if (n > 1) failures.push(fail('inventory_snapshot', k, `${n} records for one material and snapshot date`));
      // Report one-to-many fan-out that KPI code must respect.
      const delPerLine = new Map();
      for (const r of d.delivery_transactions) delPerLine.set(r.po_line_id, (delPerLine.get(r.po_line_id) || 0) + 1);
      const maxDel = Math.max(0, ...delPerLine.values());
      const multi = [...delPerLine.values()].filter((n) => n > 1).length;
      return {
        checked: d.purchase_orders.length + d.supplier_quality.length + d.inventory_snapshot.length,
        failures,
        detail: `${multi} PO line(s) have more than one delivery event (max ${maxDel}); PO values must be aggregated from purchase_orders.csv before any join`,
      };
    },
  },
];

/* ---------- supplementary Data Model section 5 rules ---------- */

const SUPPLEMENTARY = [
  {
    id: 'S00',
    title: 'Schema conformance: required columns present, values convert to their documented types, required values not blank',
    reference: 'Data Model 5.1–5.6 field tables',
    run(d, ctx) {
      const failures = ctx.loaderIssues
        .filter((i) => i.severity === 'error')
        .map((i) => fail(i.dataset, `line ${i.line ?? '?'}`, `${i.field ? i.field + ': ' : ''}${i.message}`));
      const checked = DATASET_NAMES.reduce((n, name) => n + d[name].length * Object.keys(SCHEMA[name].fields).length, 0);
      const warnings = ctx.loaderIssues.filter((i) => i.severity === 'warning').length;
      return { checked, failures, detail: warnings ? `${warnings} warning(s) – see loader issues` : '' };
    },
  },
  {
    id: 'S01',
    title: 'PO quantity reconciliation: ordered = received + cancelled + open',
    reference: 'Data Model 5.3',
    run(d) {
      const failures = [];
      for (const r of d.purchase_orders) {
        if (!near(r.received_qty + r.cancelled_qty + r.open_qty, r.ordered_qty, QTY_TOLERANCE)) {
          failures.push(fail('purchase_orders', r.po_line_id, `ordered ${r.ordered_qty} ≠ received ${r.received_qty} + cancelled ${r.cancelled_qty} + open ${r.open_qty}`));
        }
      }
      return { checked: d.purchase_orders.length, failures };
    },
  },
  {
    id: 'S02',
    title: 'PO value reconciliation: line_total_usd = ordered_qty × unit_price_usd',
    reference: 'Data Model 5.3',
    run(d) {
      const failures = [];
      for (const r of d.purchase_orders) {
        const v = r.ordered_qty * r.unit_price_usd;
        if (!near(v, r.line_total_usd, MONEY_TOLERANCE)) failures.push(fail('purchase_orders', r.po_line_id, `line_total_usd ${r.line_total_usd} ≠ ${v.toFixed(2)}`));
      }
      return { checked: d.purchase_orders.length, failures };
    },
  },
  {
    id: 'S03',
    title: 'Delivery received quantity does not exceed shipped quantity',
    reference: 'Data Model 5.4',
    run(d) {
      const failures = [];
      for (const r of d.delivery_transactions) {
        if (r.received_qty > r.shipped_qty + QTY_TOLERANCE) failures.push(fail('delivery_transactions', r.delivery_id, `received ${r.received_qty} > shipped ${r.shipped_qty}`));
      }
      return { checked: d.delivery_transactions.length, failures };
    },
  },
  {
    id: 'S04',
    title: 'Delivered events: variance = actual − promised date, on_time_flag = 1 when variance ≤ 0',
    reference: 'Data Model 5.4',
    run(d) {
      const failures = [];
      let checked = 0;
      for (const r of d.delivery_transactions) {
        if (r.delivery_status !== 'Delivered') continue;
        checked++;
        if (r.actual_delivery_date === null) {
          failures.push(fail('delivery_transactions', r.delivery_id, 'delivered event has no actual_delivery_date'));
          continue;
        }
        const v = daysBetween(r.promised_delivery_date, r.actual_delivery_date);
        if (r.delivery_variance_days !== v) failures.push(fail('delivery_transactions', r.delivery_id, `delivery_variance_days ${r.delivery_variance_days} ≠ ${v}`));
        const flag = v <= 0 ? 1 : 0;
        if (r.on_time_flag !== flag) failures.push(fail('delivery_transactions', r.delivery_id, `on_time_flag ${r.on_time_flag} ≠ ${flag} for variance ${v}`));
      }
      return { checked, failures };
    },
  },
  {
    id: 'S05',
    title: 'In-transit events keep actual date, variance and on-time flag blank',
    reference: 'Data Model 5.4',
    run(d) {
      const failures = [];
      let checked = 0;
      for (const r of d.delivery_transactions) {
        if (r.delivery_status !== 'In Transit') continue;
        checked++;
        for (const f of ['actual_delivery_date', 'delivery_variance_days', 'on_time_flag']) {
          if (r[f] !== null) failures.push(fail('delivery_transactions', r.delivery_id, `in-transit event has ${f} = ${r[f]}`));
        }
      }
      return { checked, failures };
    },
  },
  {
    id: 'S06',
    title: 'Inspection rejection_rate_pct and defects_per_million_units recompute from quantities',
    reference: 'Data Model 5.6',
    run(d) {
      const failures = [];
      let checked = 0;
      for (const r of d.supplier_quality) {
        if (!(r.inspected_qty > 0)) continue;
        checked++;
        const rate = (r.rejected_qty / r.inspected_qty) * 100;
        const dpm = (r.rejected_qty / r.inspected_qty) * 1e6;
        if (!near(rate, r.rejection_rate_pct, RATE_TOLERANCE)) failures.push(fail('supplier_quality', r.inspection_id, `rejection_rate_pct ${r.rejection_rate_pct} ≠ ${rate.toFixed(4)}`));
        if (!near(dpm, r.defects_per_million_units, DPM_TOLERANCE)) failures.push(fail('supplier_quality', r.inspection_id, `defects_per_million_units ${r.defects_per_million_units} ≠ ${dpm.toFixed(1)}`));
      }
      return { checked, failures };
    },
  },
];

/* ---------- approved data-quality notices ---------- */

/** DEC-017: events outside the reporting snapshot period. */
export function eventsOutsideSnapshot(deliveries, asOfDate) {
  return deliveries
    .filter(
      (r) =>
        (r.delivery_status === 'Delivered' && r.actual_delivery_date !== null && r.actual_delivery_date > asOfDate) ||
        (r.shipment_date !== null && r.shipment_date > asOfDate),
    )
    .map((r) => ({
      delivery_id: r.delivery_id,
      po_line_id: r.po_line_id,
      supplier_id: r.supplier_id,
      delivery_status: r.delivery_status,
      shipment_date: r.shipment_date,
      actual_delivery_date: r.actual_delivery_date,
      reason:
        r.delivery_status === 'Delivered' && r.actual_delivery_date > asOfDate
          ? `delivered ${r.actual_delivery_date}, after ${asOfDate}`
          : `shipped ${r.shipment_date}, after ${asOfDate}`,
    }));
}

/**
 * DEC-018: compares the available-stock basis used by KPIs with the supplied on-hand-based status.
 * Classification on a given stock basis: < safety stock → Safety Stock Breach;
 * otherwise < reorder point → Below Reorder Point; otherwise "Not below reorder point".
 */
export function classifyStock(qty, row) {
  if (qty < row.safety_stock_qty) return 'Safety Stock Breach';
  if (qty < row.reorder_point_qty) return 'Below Reorder Point';
  return 'Not below reorder point';
}

export function inventoryBasisDifferences(inventory) {
  const out = [];
  for (const r of inventory.filter(isPhysical)) {
    const availableBasis = classifyStock(r.available_qty, r);
    const supplied = ['Safety Stock Breach', 'Below Reorder Point'].includes(r.inventory_status) ? r.inventory_status : 'Not below reorder point';
    if (availableBasis !== supplied) {
      out.push({
        material_id: r.material_id,
        on_hand_qty: r.on_hand_qty,
        available_qty: r.available_qty,
        safety_stock_qty: r.safety_stock_qty,
        reorder_point_qty: r.reorder_point_qty,
        supplied_status: r.inventory_status,
        available_basis: availableBasis,
      });
    }
  }
  return out;
}

function buildNotices(d, asOfDate) {
  const notices = [];

  const outside = eventsOutsideSnapshot(d.delivery_transactions, asOfDate);
  if (outside.length) {
    const delivered = outside.filter((e) => e.delivery_status === 'Delivered').length;
    notices.push({
      id: 'N01',
      decision: 'DEC-017',
      severity: 'warning',
      title: `${outside.length} delivery events fall outside the reporting snapshot period (as of ${asOfDate})`,
      detail: `${delivered} delivered after ${asOfDate} and ${outside.length - delivered} shipped after ${asOfDate}. Source data is unchanged. Delivery Event OTD is shown on a snapshot-period basis and a full-dataset basis. These quantities are also included in PO received/open quantities and inventory in-transit quantities.`,
      items: outside,
    });
  }

  const diffs = inventoryBasisDifferences(d.inventory_snapshot);
  notices.push({
    id: 'N02',
    decision: 'DEC-018',
    severity: diffs.length ? 'warning' : 'info',
    title: 'Inventory KPIs use available stock; the supplied inventory status is based on on-hand stock',
    detail: `Available stock = on-hand − allocated, so it is the stricter basis. ${diffs.length} physical material(s) are classified differently on the two bases.`,
    items: diffs,
  });

  const cancelledLines = d.purchase_orders.filter((r) => r.cancelled_qty > 0);
  if (cancelledLines.length) {
    const value = cancelledLines.reduce((s, r) => s + r.cancelled_qty * r.unit_price_usd, 0);
    notices.push({
      id: 'N03',
      decision: 'DEC-019',
      severity: 'info',
      title: 'Gross PO line value includes cancelled quantities',
      detail: `${cancelledLines.length} PO line(s) carry cancelled quantity worth ${value.toFixed(2)} USD. Gross, cancelled and net active PO line value are shown separately.`,
      items: cancelledLines.map((r) => ({ po_line_id: r.po_line_id, cancelled_qty: r.cancelled_qty, po_status: r.po_status })),
    });
  }

  return notices;
}

/* ---------- entry point ---------- */

/**
 * Runs all checks.
 * @param {object} loadResult – output of loadAllDatasets()
 * @param {object} options – { asOfDate: 'YYYY-MM-DD' }
 */
export function runValidation(loadResult, { asOfDate }) {
  const missing = DATASET_NAMES.filter((n) => !loadResult.datasets[n]);
  const d = {};
  const raw = {};
  for (const n of DATASET_NAMES) {
    if (loadResult.datasets[n]) {
      d[n] = loadResult.datasets[n].rows;
      raw[n] = loadResult.datasets[n].rawRows;
    }
  }
  const ctx = { raw, loaderIssues: loadResult.issues || [], asOfDate };

  const runAll = (list) =>
    list.map((c) => {
      if (missing.length) return notRun(c.id, c.title, c.reference, `not run: dataset(s) not loaded – ${missing.join(', ')}`);
      try {
        const { checked, failures, detail } = c.run(d, ctx);
        return result(c.id, c.title, c.reference, checked, failures, detail);
      } catch (err) {
        return { ...notRun(c.id, c.title, c.reference, `check could not run: ${err.message}`), status: 'fail' };
      }
    });

  const controls = runAll(CONTROLS);
  const supplementary = runAll(SUPPLEMENTARY);
  const notices = missing.length ? [] : buildNotices(d, asOfDate);
  const all = [...controls, ...supplementary];

  return {
    asOfDate,
    controls,
    supplementary,
    notices,
    summary: {
      controlsPassed: controls.filter((c) => c.status === 'pass').length,
      controlsTotal: controls.length,
      supplementaryPassed: supplementary.filter((c) => c.status === 'pass').length,
      supplementaryTotal: supplementary.length,
      failed: all.filter((c) => c.status === 'fail').map((c) => c.id),
      notRun: all.filter((c) => c.status === 'not_run').map((c) => c.id),
      allPassed: all.every((c) => c.status === 'pass'),
    },
  };
}
