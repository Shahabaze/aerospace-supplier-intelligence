/**
 * Dataset schema – mirrors docs/data-model.md Version 2.0, section 5.
 *
 * Field types:
 *   string   – text, kept as-is
 *   date     – ISO YYYY-MM-DD, validated as a real calendar date, kept as text
 *   decimal  – number (decimals allowed)
 *   integer  – whole number
 *   flag     – 1 or 0 (on_time_flag)
 *
 * nullable: true  – a blank cell is an allowed, meaningful "no value" and becomes null.
 * nullable: false – a blank cell is still preserved as null (never converted to zero),
 *                   but it is reported as a missing required value.
 *
 * Nullability follows the "Nullable" types in Data Model v2.0.
 */

const f = (type, nullable = false) => Object.freeze({ type, nullable });

export const SCHEMA = Object.freeze({
  suppliers: Object.freeze({
    file: 'suppliers.csv',
    label: 'Supplier Master',
    grain: 'One record per supplier',
    primaryKey: ['supplier_id'],
    fields: Object.freeze({
      supplier_id: f('string'),
      supplier_name: f('string'),
      country: f('string'),
      supplier_category: f('string'),
      commodity: f('string'),
      supplier_tier: f('string'),
      supplier_status: f('string'),
      qualification_status: f('string'),
      criticality: f('string'),
      certification_status: f('string'),
      onboarding_date: f('date'),
    }),
  }),

  materials: Object.freeze({
    file: 'materials.csv',
    label: 'Material Master',
    grain: 'One record per material',
    primaryKey: ['material_id'],
    fields: Object.freeze({
      material_id: f('string'),
      material_description: f('string'),
      material_category: f('string'),
      commodity: f('string'),
      supplier_id: f('string'),
      unit_of_measure: f('string'),
      standard_cost_usd: f('decimal'),
      lead_time_days: f('integer'),
      safety_stock_qty: f('decimal'),
      reorder_point_qty: f('decimal'),
      criticality: f('string'),
      shelf_life_days: f('integer', true),
      material_status: f('string'),
    }),
  }),

  purchase_orders: Object.freeze({
    file: 'purchase_orders.csv',
    label: 'Purchase Order Lines',
    grain: 'One record per PO line',
    primaryKey: ['po_line_id'],
    fields: Object.freeze({
      po_id: f('string'),
      po_line_id: f('string'),
      supplier_id: f('string'),
      material_id: f('string'),
      order_date: f('date'),
      requested_delivery_date: f('date'),
      promised_delivery_date: f('date'),
      ordered_qty: f('decimal'),
      unit_of_measure: f('string'),
      unit_price_usd: f('decimal'),
      line_total_usd: f('decimal'),
      received_qty: f('decimal'),
      cancelled_qty: f('decimal'),
      open_qty: f('decimal'),
      po_status: f('string'),
    }),
  }),

  delivery_transactions: Object.freeze({
    file: 'delivery_transactions.csv',
    label: 'Delivery Transactions',
    grain: 'One record per shipment/delivery event',
    primaryKey: ['delivery_id'],
    fields: Object.freeze({
      delivery_id: f('string'),
      po_id: f('string'),
      po_line_id: f('string'),
      supplier_id: f('string'),
      material_id: f('string'),
      shipment_date: f('date'),
      promised_delivery_date: f('date'),
      actual_delivery_date: f('date', true),
      shipped_qty: f('decimal'),
      received_qty: f('decimal'),
      accepted_qty: f('decimal'),
      rejected_qty: f('decimal'),
      unit_of_measure: f('string'),
      delivery_status: f('string'),
      delivery_variance_days: f('integer', true),
      on_time_flag: f('flag', true),
      carrier: f('string'),
      tracking_reference: f('string'),
    }),
  }),

  inventory_snapshot: Object.freeze({
    file: 'inventory_snapshot.csv',
    label: 'Inventory Snapshot',
    grain: 'One record per material for one snapshot date',
    primaryKey: ['snapshot_date', 'material_id'],
    fields: Object.freeze({
      snapshot_date: f('date'),
      material_id: f('string'),
      material_description: f('string'),
      material_category: f('string'),
      commodity: f('string'),
      supplier_id: f('string'),
      warehouse_id: f('string'),
      unit_of_measure: f('string'),
      on_hand_qty: f('decimal'),
      allocated_qty: f('decimal'),
      available_qty: f('decimal'),
      in_transit_qty: f('decimal'),
      open_po_qty: f('decimal'),
      average_monthly_demand_qty: f('decimal'),
      average_daily_demand_qty: f('decimal'),
      days_of_supply: f('decimal'),
      safety_stock_qty: f('decimal'),
      reorder_point_qty: f('decimal'),
      standard_cost_usd: f('decimal'),
      on_hand_inventory_value_usd: f('decimal'),
      available_inventory_value_usd: f('decimal'),
      criticality: f('string'),
      shelf_life_days: f('integer', true),
      inventory_status: f('string'),
      material_status: f('string'),
    }),
  }),

  supplier_quality: Object.freeze({
    file: 'supplier_quality.csv',
    label: 'Supplier Quality',
    grain: 'One record per inspection event',
    primaryKey: ['inspection_id'],
    fields: Object.freeze({
      inspection_id: f('string'),
      delivery_id: f('string'),
      po_id: f('string'),
      po_line_id: f('string'),
      supplier_id: f('string'),
      supplier_name: f('string'),
      material_id: f('string'),
      material_description: f('string'),
      inspection_date: f('date'),
      inspection_type: f('string'),
      inspected_qty: f('decimal'),
      accepted_qty: f('decimal'),
      rejected_qty: f('decimal'),
      rejection_rate_pct: f('decimal'),
      defects_per_million_units: f('decimal'),
      defect_category: f('string'),
      defect_description: f('string'),
      severity: f('string'),
      ncr_id: f('string', true),
      disposition: f('string'),
      corrective_action_required: f('string'),
      corrective_action_status: f('string'),
      root_cause_category: f('string', true),
      corrective_action_closure_days: f('integer', true),
      supplier_criticality: f('string'),
      quality_result: f('string'),
      data_basis: f('string'),
    }),
  }),
});

/** Dataset names in load order. */
export const DATASET_NAMES = Object.freeze(Object.keys(SCHEMA));

/** Unit of measure that identifies service-type materials (Data Model 5.2). */
export const SERVICE_UOM = 'SERVICE';

/**
 * True when a record represents physical stock.
 * Service materials are excluded from physical inventory KPIs (Data Model 5.5, control 16).
 */
export function isPhysical(record) {
  return record.unit_of_measure !== SERVICE_UOM;
}

/** Builds the primary-key string for a typed record. */
export function keyOf(datasetName, record) {
  return SCHEMA[datasetName].primaryKey.map((k) => record[k]).join(' | ');
}
