/**
 * Expected KPI values for tests/kpi-tests.js.
 *
 * Calculated independently during development (2026-11-13) by a separate script that reads the
 * six CSV files directly and applies the KPI Dictionary formulas (v2.2, extended for v2.3 in Stage 6). That script is not part of
 * the application and does not share any code with src/js/kpis.js, so these values are an
 * independent check, not a copy of the JavaScript output.
 *
 * If the source data is deliberately revised, these values must be recalculated and reviewed.
 */
export const EXPECTED = Object.freeze({
  "4.1_full": {
    "num": 28,
    "den": 73
  },
  "4.1_snap": {
    "num": 25,
    "den": 63
  },
  "4.2_full": 45,
  "4.2_snap": 38,
  "4.3_full": 2.9178082191780823,
  "4.3_snap": 2.8253968253968256,
  "4.4": {
    "overdue": 51,
    "open_lines": 63
  },
  "5.1": {
    "rej": 5,
    "insp": 2997
  },
  "5.3": 4,
  "5.4": 3,
  "5.5": {
    "avg": 41,
    "n": 1
  },
  "rejections_after_snapshot": [],
  "6.1": 12550378.2,
  "6.1.1": 1072369,
  "6.1.2": 11478009.2,
  "6.2": 8856485.91,
  "6.5": 125503.78199999999,
  "6.3_gross": {
    "SUP-001": 478515,
    "SUP-002": 1686345,
    "SUP-003": 60144,
    "SUP-004": 690370,
    "SUP-005": 53039.5,
    "SUP-006": 165880,
    "SUP-007": 3184775,
    "SUP-008": 2803320,
    "SUP-009": 80784,
    "SUP-010": 338325,
    "SUP-011": 10583,
    "SUP-012": 894240,
    "SUP-013": 56625,
    "SUP-014": 76052.5,
    "SUP-015": 63728,
    "SUP-016": 719750,
    "SUP-017": 180922.5,
    "SUP-018": 10115,
    "SUP-019": 55442,
    "SUP-020": 535852.5,
    "SUP-021": 4750.2,
    "SUP-022": 212660,
    "SUP-023": 149910,
    "SUP-024": 32760,
    "SUP-025": 5490
  },
  "6.4": {
    "SUP-001": 2.977127775781884,
    "SUP-002": 14.48914154904145,
    "SUP-003": 0.42885485751309554,
    "SUP-004": 3.2868940373388096,
    "SUP-005": 0.13651757658462235,
    "SUP-006": 1.110427756060694,
    "SUP-007": 27.74675420193948,
    "SUP-008": 24.423399137892314,
    "SUP-009": 0.2654118799625984,
    "SUP-010": 2.268032682880233,
    "SUP-011": 0.0584334781679736,
    "SUP-012": 7.374101076691941,
    "SUP-013": 0.49333468037296924,
    "SUP-014": 0.662593126341108,
    "SUP-015": 0.4428642555888525,
    "SUP-016": 6.270686731981362,
    "SUP-017": 1.5762533105479652,
    "SUP-018": 0.0881250382688315,
    "SUP-019": 0.43038822446666103,
    "SUP-020": 2.2024943140836655,
    "SUP-021": 0.021991618546533313,
    "SUP-022": 1.6068640195897388,
    "SUP-023": 1.306062727323829,
    "SUP-024": 0.28541534885683834,
    "SUP-025": 0.04783059417655808
  },
  "7.1": 2634675,
  "7.2": 2198357,
  "7.3": [
    "MAT-004",
    "MAT-005",
    "MAT-006",
    "MAT-008",
    "MAT-010",
    "MAT-011",
    "MAT-013",
    "MAT-015",
    "MAT-020",
    "MAT-022"
  ],
  "7.4": [
    "MAT-004",
    "MAT-006",
    "MAT-010",
    "MAT-011",
    "MAT-015"
  ],
  "7.5": {
    "avg": 48.74782608695652,
    "n": 23
  },
  "7.6": 1417810,
  "7.7": {
    "Healthy": 11,
    "Excess": 3,
    "Safety Stock Breach": 4,
    "Below Reorder Point": 5
  },
  "8.1": 4,
  "8.2": {
    "Qualified": 22,
    "Conditional": 3
  },
  "8.3": {
    "Current": 19,
    "Expiring": 2,
    "Under Review": 3,
    "Not Applicable": 1
  },
  "8.4": {
    "SUP-001": {
      "del_full": 2,
      "ot_full": 1,
      "del_snap": 2,
      "ot_snap": 1,
      "late_full": 1,
      "var_full": 3,
      "insp": 62,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-002": {
      "del_full": 1,
      "ot_full": 0,
      "del_snap": 1,
      "ot_snap": 0,
      "late_full": 1,
      "var_full": 2,
      "insp": 39,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-003": {
      "del_full": 6,
      "ot_full": 1,
      "del_snap": 6,
      "ot_snap": 1,
      "late_full": 5,
      "var_full": 5.5,
      "insp": 372,
      "rej": 1,
      "nc": 1,
      "openca": 0
    },
    "SUP-004": {
      "del_full": 0,
      "ot_full": 0,
      "del_snap": 0,
      "ot_snap": 0,
      "late_full": 0,
      "var_full": null,
      "insp": 0,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-005": {
      "del_full": 6,
      "ot_full": 3,
      "del_snap": 6,
      "ot_snap": 3,
      "late_full": 3,
      "var_full": 4.833333333333333,
      "insp": 85,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-006": {
      "del_full": 5,
      "ot_full": 3,
      "del_snap": 5,
      "ot_snap": 3,
      "late_full": 2,
      "var_full": -0.2,
      "insp": 84,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-007": {
      "del_full": 1,
      "ot_full": 1,
      "del_snap": 1,
      "ot_snap": 1,
      "late_full": 0,
      "var_full": 0,
      "insp": 37,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-008": {
      "del_full": 1,
      "ot_full": 0,
      "del_snap": 1,
      "ot_snap": 0,
      "late_full": 1,
      "var_full": 7,
      "insp": 50,
      "rej": 1,
      "nc": 1,
      "openca": 1
    },
    "SUP-009": {
      "del_full": 0,
      "ot_full": 0,
      "del_snap": 0,
      "ot_snap": 0,
      "late_full": 0,
      "var_full": null,
      "insp": 0,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-010": {
      "del_full": 5,
      "ot_full": 3,
      "del_snap": 3,
      "ot_snap": 2,
      "late_full": 2,
      "var_full": -0.2,
      "insp": 63,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-011": {
      "del_full": 2,
      "ot_full": 1,
      "del_snap": 2,
      "ot_snap": 1,
      "late_full": 1,
      "var_full": -1,
      "insp": 25,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-012": {
      "del_full": 0,
      "ot_full": 0,
      "del_snap": 0,
      "ot_snap": 0,
      "late_full": 0,
      "var_full": null,
      "insp": 0,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-013": {
      "del_full": 6,
      "ot_full": 3,
      "del_snap": 4,
      "ot_snap": 2,
      "late_full": 3,
      "var_full": 2.6666666666666665,
      "insp": 301,
      "rej": 2,
      "nc": 1,
      "openca": 1
    },
    "SUP-014": {
      "del_full": 4,
      "ot_full": 1,
      "del_snap": 4,
      "ot_snap": 1,
      "late_full": 3,
      "var_full": 1.25,
      "insp": 49,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-015": {
      "del_full": 2,
      "ot_full": 0,
      "del_snap": 2,
      "ot_snap": 0,
      "late_full": 2,
      "var_full": 7,
      "insp": 79,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-016": {
      "del_full": 4,
      "ot_full": 2,
      "del_snap": 2,
      "ot_snap": 1,
      "late_full": 2,
      "var_full": 2.5,
      "insp": 375,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-017": {
      "del_full": 5,
      "ot_full": 2,
      "del_snap": 5,
      "ot_snap": 2,
      "late_full": 3,
      "var_full": 2.4,
      "insp": 40,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-018": {
      "del_full": 2,
      "ot_full": 0,
      "del_snap": 0,
      "ot_snap": 0,
      "late_full": 2,
      "var_full": 5.5,
      "insp": 2,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-019": {
      "del_full": 4,
      "ot_full": 3,
      "del_snap": 4,
      "ot_snap": 3,
      "late_full": 1,
      "var_full": 0.5,
      "insp": 367,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-020": {
      "del_full": 2,
      "ot_full": 1,
      "del_snap": 2,
      "ot_snap": 1,
      "late_full": 1,
      "var_full": 0.5,
      "insp": 31,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-021": {
      "del_full": 2,
      "ot_full": 0,
      "del_snap": 2,
      "ot_snap": 0,
      "late_full": 2,
      "var_full": 10,
      "insp": 3,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-022": {
      "del_full": 2,
      "ot_full": 0,
      "del_snap": 2,
      "ot_snap": 0,
      "late_full": 2,
      "var_full": 1.5,
      "insp": 36,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-023": {
      "del_full": 6,
      "ot_full": 2,
      "del_snap": 5,
      "ot_snap": 2,
      "late_full": 4,
      "var_full": 4,
      "insp": 792,
      "rej": 1,
      "nc": 1,
      "openca": 1
    },
    "SUP-024": {
      "del_full": 2,
      "ot_full": 1,
      "del_snap": 1,
      "ot_snap": 1,
      "late_full": 1,
      "var_full": 4.5,
      "insp": 11,
      "rej": 0,
      "nc": 0,
      "openca": 0
    },
    "SUP-025": {
      "del_full": 3,
      "ot_full": 0,
      "del_snap": 3,
      "ot_snap": 0,
      "late_full": 3,
      "var_full": 4.333333333333333,
      "insp": 94,
      "rej": 0,
      "nc": 0,
      "openca": 0
    }
  },
  "no_delivered_suppliers": [
    "SUP-004",
    "SUP-009",
    "SUP-012"
  ],
  "no_snapshot_delivered_suppliers": [
    "SUP-004",
    "SUP-009",
    "SUP-012",
    "SUP-018"
  ],
  "nc_suppliers": {
    "SUP-003": {
      "del_full": 6,
      "ot_full": 1,
      "del_snap": 6,
      "ot_snap": 1,
      "late_full": 5,
      "var_full": 5.5,
      "insp": 372,
      "rej": 1,
      "nc": 1,
      "openca": 0
    },
    "SUP-008": {
      "del_full": 1,
      "ot_full": 0,
      "del_snap": 1,
      "ot_snap": 0,
      "late_full": 1,
      "var_full": 7,
      "insp": 50,
      "rej": 1,
      "nc": 1,
      "openca": 1
    },
    "SUP-013": {
      "del_full": 6,
      "ot_full": 3,
      "del_snap": 4,
      "ot_snap": 2,
      "late_full": 3,
      "var_full": 2.6666666666666665,
      "insp": 301,
      "rej": 2,
      "nc": 1,
      "openca": 1
    },
    "SUP-023": {
      "del_full": 6,
      "ot_full": 2,
      "del_snap": 5,
      "ot_snap": 2,
      "late_full": 4,
      "var_full": 4,
      "insp": 792,
      "rej": 1,
      "nc": 1,
      "openca": 1
    }
  }
});

/**
 * Stage 5 additions (supplier-level analysis), calculated by the same independent script.
 * Snapshot basis = delivered on or before 2026-10-31.
 */
export const EXPECTED_SUPPLIERS = Object.freeze({
  "per_supplier": {
    "SUP-001": {
      "late_snap": 1,
      "var_snap": 3,
      "overdue": 3,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 2,
      "inspections": 2,
      "net_active": 341715
    },
    "SUP-002": {
      "late_snap": 1,
      "var_snap": 2,
      "overdue": 3,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 1,
      "net_active": 1663065
    },
    "SUP-003": {
      "late_snap": 5,
      "var_snap": 5.5,
      "overdue": 3,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 1,
      "ca_status": {
        "Closed": 1
      },
      "in_transit": 1,
      "inspections": 6,
      "net_active": 49224
    },
    "SUP-004": {
      "late_snap": 0,
      "var_snap": null,
      "overdue": 2,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 0,
      "net_active": 377270
    },
    "SUP-005": {
      "late_snap": 3,
      "var_snap": 4.833333333333333,
      "overdue": 0,
      "open_lines": 0,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 6,
      "net_active": 15669.5
    },
    "SUP-006": {
      "late_snap": 2,
      "var_snap": -0.2,
      "overdue": 1,
      "open_lines": 1,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 5,
      "net_active": 127455
    },
    "SUP-007": {
      "late_snap": 0,
      "var_snap": 0,
      "overdue": 3,
      "open_lines": 4,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 1,
      "net_active": 3184775
    },
    "SUP-008": {
      "late_snap": 1,
      "var_snap": 7,
      "overdue": 2,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 1,
      "ca_status": {
        "In Progress": 1
      },
      "in_transit": 0,
      "inspections": 1,
      "net_active": 2803320
    },
    "SUP-009": {
      "late_snap": 0,
      "var_snap": null,
      "overdue": 1,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 0,
      "net_active": 30464
    },
    "SUP-010": {
      "late_snap": 1,
      "var_snap": -0.6666666666666666,
      "overdue": 1,
      "open_lines": 1,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 5,
      "net_active": 260325
    },
    "SUP-011": {
      "late_snap": 1,
      "var_snap": -1,
      "overdue": 2,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 2,
      "net_active": 6707
    },
    "SUP-012": {
      "late_snap": 0,
      "var_snap": null,
      "overdue": 2,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 0,
      "net_active": 846400
    },
    "SUP-013": {
      "late_snap": 2,
      "var_snap": 2.75,
      "overdue": 1,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 1,
      "ca_status": {
        "Pending Supplier Response": 1
      },
      "in_transit": 1,
      "inspections": 6,
      "net_active": 56625
    },
    "SUP-014": {
      "late_snap": 3,
      "var_snap": 1.25,
      "overdue": 4,
      "open_lines": 4,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 4,
      "net_active": 76052.5
    },
    "SUP-015": {
      "late_snap": 2,
      "var_snap": 7,
      "overdue": 2,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 2,
      "net_active": 50832
    },
    "SUP-016": {
      "late_snap": 1,
      "var_snap": 3,
      "overdue": 2,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 4,
      "net_active": 719750
    },
    "SUP-017": {
      "late_snap": 3,
      "var_snap": 2.4,
      "overdue": 1,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 2,
      "inspections": 5,
      "net_active": 180922.5
    },
    "SUP-018": {
      "late_snap": 0,
      "var_snap": null,
      "overdue": 3,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 2,
      "net_active": 10115
    },
    "SUP-019": {
      "late_snap": 1,
      "var_snap": 0.5,
      "overdue": 2,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 4,
      "net_active": 49400
    },
    "SUP-020": {
      "late_snap": 1,
      "var_snap": 0.5,
      "overdue": 1,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 2,
      "net_active": 252802.5
    },
    "SUP-021": {
      "late_snap": 2,
      "var_snap": 10,
      "overdue": 1,
      "open_lines": 2,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 0,
      "inspections": 2,
      "net_active": 2524.2
    },
    "SUP-022": {
      "late_snap": 2,
      "var_snap": 1.5,
      "overdue": 3,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 2,
      "net_active": 184436
    },
    "SUP-023": {
      "late_snap": 3,
      "var_snap": 4,
      "overdue": 3,
      "open_lines": 4,
      "po_lines": 4,
      "ca_required": 1,
      "ca_status": {
        "In Progress": 1
      },
      "in_transit": 1,
      "inspections": 6,
      "net_active": 149910
    },
    "SUP-024": {
      "late_snap": 0,
      "var_snap": -1,
      "overdue": 3,
      "open_lines": 4,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 2,
      "net_active": 32760
    },
    "SUP-025": {
      "late_snap": 3,
      "var_snap": 4.333333333333333,
      "overdue": 2,
      "open_lines": 3,
      "po_lines": 4,
      "ca_required": 0,
      "ca_status": {},
      "in_transit": 1,
      "inspections": 3,
      "net_active": 5490
    }
  },
  "segments": {
    "Critical": {
      "suppliers": 4,
      "with_snap_events": 3,
      "snap_on": 2,
      "snap_n": 4,
      "full_on": 2,
      "full_n": 4,
      "insp": 138,
      "rej": 0,
      "nc": 0,
      "open_ca": 0,
      "net_share": 52.58712460345476
    },
    "High": {
      "suppliers": 11,
      "with_snap_events": 9,
      "snap_on": 17,
      "snap_n": 38,
      "full_on": 20,
      "full_n": 45,
      "insp": 2143,
      "rej": 4,
      "nc": 3,
      "open_ca": 2,
      "net_share": 19.344970554649844
    },
    "Medium": {
      "suppliers": 8,
      "with_snap_events": 7,
      "snap_on": 5,
      "snap_n": 17,
      "full_on": 5,
      "full_n": 19,
      "insp": 611,
      "rej": 1,
      "nc": 1,
      "open_ca": 1,
      "net_share": 27.734658898862012
    },
    "Low": {
      "suppliers": 2,
      "with_snap_events": 2,
      "snap_on": 1,
      "snap_n": 4,
      "full_on": 1,
      "full_n": 5,
      "insp": 105,
      "rej": 0,
      "nc": 0,
      "open_ca": 0,
      "net_share": 0.33324594303339644
    }
  },
  "ca_register": [
    {
      "inspection_id": "QI-0007",
      "supplier_id": "SUP-008",
      "ncr_id": "NCR-0007",
      "corrective_action_status": "In Progress",
      "root_cause_category": "Documentation control failure",
      "corrective_action_closure_days": "",
      "severity": "Major",
      "defect_category": "Documentation"
    },
    {
      "inspection_id": "QI-0020",
      "supplier_id": "SUP-003",
      "ncr_id": "NCR-0020",
      "corrective_action_status": "Closed",
      "root_cause_category": "Handling or packaging weakness",
      "corrective_action_closure_days": "41",
      "severity": "Major",
      "defect_category": "Handling"
    },
    {
      "inspection_id": "QI-0026",
      "supplier_id": "SUP-013",
      "ncr_id": "NCR-0026",
      "corrective_action_status": "Pending Supplier Response",
      "root_cause_category": "Inspection escape",
      "corrective_action_closure_days": "",
      "severity": "Major",
      "defect_category": "Dimensional"
    },
    {
      "inspection_id": "QI-0055",
      "supplier_id": "SUP-023",
      "ncr_id": "NCR-0055",
      "corrective_action_status": "In Progress",
      "root_cause_category": "Handling or packaging weakness",
      "corrective_action_closure_days": "",
      "severity": "Major",
      "defect_category": "Documentation"
    }
  ],
  "snap_events_count": {
    "SUP-001": 2,
    "SUP-002": 1,
    "SUP-003": 6,
    "SUP-004": 0,
    "SUP-005": 6,
    "SUP-006": 5,
    "SUP-007": 1,
    "SUP-008": 1,
    "SUP-009": 0,
    "SUP-010": 3,
    "SUP-011": 2,
    "SUP-012": 0,
    "SUP-013": 4,
    "SUP-014": 4,
    "SUP-015": 2,
    "SUP-016": 2,
    "SUP-017": 5,
    "SUP-018": 0,
    "SUP-019": 4,
    "SUP-020": 2,
    "SUP-021": 2,
    "SUP-022": 2,
    "SUP-023": 5,
    "SUP-024": 1,
    "SUP-025": 3
  }
});

/**
 * Stage 6 additions (procurement intelligence, KPI Dictionary v2.3), calculated by the same
 * independent script. As-of date 2026-10-31. Bucket "181+" = over 180 days.
 */
export const EXPECTED_PROCUREMENT = Object.freeze({
 "gross": 12550378.2,
 "cancelled": 1072369,
 "net": 11478009.2,
 "received": 2621523.29,
 "open": 8856485.91,
 "overdue": 6898446.46,
 "overdue_lines": 51,
 "not_yet_due": 1958039.45,
 "not_yet_due_lines": 12,
 "buckets": {
  "1-30": {
   "lines": 4,
   "value": 914291.6
  },
  "31-90": {
   "lines": 10,
   "value": 2923291.8
  },
  "91-180": {
   "lines": 12,
   "value": 2197476.06
  },
  "181+": {
   "lines": 25,
   "value": 863386.9999999999
  }
 },
 "max_days_overdue": 327,
 "overdue_no_receipt": 28,
 "gap": {
  "later": 66,
  "same": 5,
  "earlier": 29,
  "mean": 2.46,
  "max": 8,
  "min": -3,
  "n": 100
 },
 "suppliers": {
  "SUP-001": {
   "lines": 4,
   "gross": 478515,
   "cancelled": 136800,
   "net": 341715,
   "received": 173479.5,
   "open": 168235.5,
   "open_lines": 3,
   "overdue_lines": 3,
   "overdue": 168235.5,
   "oldest": 325,
   "gap_mean": -0.5,
   "gap_later": 1
  },
  "SUP-002": {
   "lines": 4,
   "gross": 1686345,
   "cancelled": 23280,
   "net": 1663065,
   "received": 181584,
   "open": 1481481,
   "open_lines": 3,
   "overdue_lines": 3,
   "overdue": 1481481,
   "oldest": 278,
   "gap_mean": -1,
   "gap_later": 1
  },
  "SUP-003": {
   "lines": 4,
   "gross": 60144,
   "cancelled": 10920,
   "net": 49224,
   "received": 15028.44,
   "open": 34195.56,
   "open_lines": 3,
   "overdue_lines": 3,
   "overdue": 34195.56,
   "oldest": 327,
   "gap_mean": 2.25,
   "gap_later": 3
  },
  "SUP-004": {
   "lines": 4,
   "gross": 690370,
   "cancelled": 313100,
   "net": 377270,
   "received": 0,
   "open": 377270,
   "open_lines": 3,
   "overdue_lines": 2,
   "overdue": 189410,
   "oldest": 266,
   "gap_mean": 5,
   "gap_later": 4
  },
  "SUP-005": {
   "lines": 4,
   "gross": 53039.5,
   "cancelled": 37370,
   "net": 15669.5,
   "received": 15669.5,
   "open": 0,
   "open_lines": 0,
   "overdue_lines": 0,
   "overdue": 0,
   "oldest": null,
   "gap_mean": 5.25,
   "gap_later": 4
  },
  "SUP-006": {
   "lines": 4,
   "gross": 165880,
   "cancelled": 38425,
   "net": 127455,
   "received": 125947,
   "open": 1508,
   "open_lines": 1,
   "overdue_lines": 1,
   "overdue": 1508,
   "oldest": 94,
   "gap_mean": 4.25,
   "gap_later": 4
  },
  "SUP-007": {
   "lines": 4,
   "gross": 3184775,
   "cancelled": 0,
   "net": 3184775,
   "received": 711880,
   "open": 2472895,
   "open_lines": 4,
   "overdue_lines": 3,
   "overdue": 2198170,
   "oldest": 211,
   "gap_mean": 2.75,
   "gap_later": 3
  },
  "SUP-008": {
   "lines": 4,
   "gross": 2803320,
   "cancelled": 0,
   "net": 2803320,
   "received": 382200,
   "open": 2421120,
   "open_lines": 3,
   "overdue_lines": 2,
   "overdue": 1672320,
   "oldest": 183,
   "gap_mean": 2.25,
   "gap_later": 3
  },
  "SUP-009": {
   "lines": 4,
   "gross": 80784,
   "cancelled": 50320,
   "net": 30464,
   "received": 0,
   "open": 30464,
   "open_lines": 2,
   "overdue_lines": 1,
   "overdue": 13463.999999999998,
   "oldest": 289,
   "gap_mean": 2.25,
   "gap_later": 2
  },
  "SUP-010": {
   "lines": 4,
   "gross": 338325,
   "cancelled": 78000,
   "net": 260325,
   "received": 205627.5,
   "open": 54697.5,
   "open_lines": 1,
   "overdue_lines": 1,
   "overdue": 54697.5,
   "oldest": 263,
   "gap_mean": 4.75,
   "gap_later": 4
  },
  "SUP-011": {
   "lines": 4,
   "gross": 10583,
   "cancelled": 3876,
   "net": 6707,
   "received": 2375,
   "open": 4332,
   "open_lines": 2,
   "overdue_lines": 2,
   "overdue": 4332,
   "oldest": 198,
   "gap_mean": 2.5,
   "gap_later": 3
  },
  "SUP-012": {
   "lines": 4,
   "gross": 894240,
   "cancelled": 47840,
   "net": 846400,
   "received": 0,
   "open": 846400,
   "open_lines": 3,
   "overdue_lines": 2,
   "overdue": 368000,
   "oldest": 218,
   "gap_mean": 4,
   "gap_later": 3
  },
  "SUP-013": {
   "lines": 4,
   "gross": 56625,
   "cancelled": 0,
   "net": 56625,
   "received": 38561.25,
   "open": 18063.75,
   "open_lines": 2,
   "overdue_lines": 1,
   "overdue": 12000,
   "oldest": 243,
   "gap_mean": 3.75,
   "gap_later": 3
  },
  "SUP-014": {
   "lines": 4,
   "gross": 76052.5,
   "cancelled": 0,
   "net": 76052.5,
   "received": 7363.1,
   "open": 68689.4,
   "open_lines": 4,
   "overdue_lines": 4,
   "overdue": 68689.4,
   "oldest": 270,
   "gap_mean": 3.75,
   "gap_later": 3
  },
  "SUP-015": {
   "lines": 4,
   "gross": 63728,
   "cancelled": 12896,
   "net": 50832,
   "received": 24268.8,
   "open": 26563.2,
   "open_lines": 2,
   "overdue_lines": 2,
   "overdue": 26563.2,
   "oldest": 264,
   "gap_mean": 1.25,
   "gap_later": 3
  },
  "SUP-016": {
   "lines": 4,
   "gross": 719750,
   "cancelled": 0,
   "net": 719750,
   "received": 458750,
   "open": 261000,
   "open_lines": 2,
   "overdue_lines": 2,
   "overdue": 261000,
   "oldest": 250,
   "gap_mean": 4.75,
   "gap_later": 3
  },
  "SUP-017": {
   "lines": 4,
   "gross": 180922.5,
   "cancelled": 0,
   "net": 180922.5,
   "received": 84280,
   "open": 96642.5,
   "open_lines": 2,
   "overdue_lines": 1,
   "overdue": 53212.5,
   "oldest": 39,
   "gap_mean": 3,
   "gap_later": 3
  },
  "SUP-018": {
   "lines": 4,
   "gross": 10115,
   "cancelled": 0,
   "net": 10115,
   "received": 1802,
   "open": 8313,
   "open_lines": 3,
   "overdue_lines": 3,
   "overdue": 8313,
   "oldest": 280,
   "gap_mean": 1.5,
   "gap_later": 2
  },
  "SUP-019": {
   "lines": 4,
   "gross": 55442,
   "cancelled": 6042,
   "net": 49400,
   "received": 13946,
   "open": 35454,
   "open_lines": 2,
   "overdue_lines": 2,
   "overdue": 35454,
   "oldest": 264,
   "gap_mean": 5,
   "gap_later": 3
  },
  "SUP-020": {
   "lines": 4,
   "gross": 535852.5,
   "cancelled": 283050,
   "net": 252802.5,
   "received": 58478.5,
   "open": 194324,
   "open_lines": 2,
   "overdue_lines": 1,
   "overdue": 7474,
   "oldest": 56,
   "gap_mean": 1,
   "gap_later": 2
  },
  "SUP-021": {
   "lines": 4,
   "gross": 4750.2,
   "cancelled": 2226,
   "net": 2524.2,
   "received": 1239,
   "open": 1285.2,
   "open_lines": 2,
   "overdue_lines": 1,
   "overdue": 411.6,
   "oldest": 275,
   "gap_mean": 0.5,
   "gap_later": 2
  },
  "SUP-022": {
   "lines": 4,
   "gross": 212660,
   "cancelled": 28224,
   "net": 184436,
   "received": 34535.2,
   "open": 149900.8,
   "open_lines": 3,
   "overdue_lines": 3,
   "overdue": 149900.8,
   "oldest": 222,
   "gap_mean": 4,
   "gap_later": 4
  },
  "SUP-023": {
   "lines": 4,
   "gross": 149910,
   "cancelled": 0,
   "net": 149910,
   "received": 79361.1,
   "open": 70548.9,
   "open_lines": 4,
   "overdue_lines": 3,
   "overdue": 62190.8,
   "oldest": 197,
   "gap_mean": -1.75,
   "gap_later": 0
  },
  "SUP-024": {
   "lines": 4,
   "gross": 32760,
   "cancelled": 0,
   "net": 32760,
   "received": 853.5,
   "open": 31906.5,
   "open_lines": 4,
   "overdue_lines": 3,
   "overdue": 26704.5,
   "oldest": 242,
   "gap_mean": -0.75,
   "gap_later": 1
  },
  "SUP-025": {
   "lines": 4,
   "gross": 5490,
   "cancelled": 0,
   "net": 5490,
   "received": 4293.9,
   "open": 1196.1,
   "open_lines": 3,
   "overdue_lines": 2,
   "overdue": 719.1,
   "oldest": 252,
   "gap_mean": 1.75,
   "gap_later": 2
  }
 },
 "pareto": [
  [
   "SUP-007",
   27.74675420193948,
   27.74675420193948
  ],
  [
   "SUP-008",
   24.423399137892314,
   52.1701533398318
  ],
  [
   "SUP-002",
   14.48914154904145,
   66.65929488887325
  ],
  [
   "SUP-012",
   7.374101076691941,
   74.03339596556519
  ],
  [
   "SUP-016",
   6.270686731981362,
   80.30408269754655
  ],
  [
   "SUP-004",
   3.2868940373388096,
   83.59097673488536
  ],
  [
   "SUP-001",
   2.977127775781884,
   86.56810451066724
  ],
  [
   "SUP-010",
   2.268032682880233,
   88.83613719354747
  ],
  [
   "SUP-020",
   2.2024943140836655,
   91.03863150763114
  ],
  [
   "SUP-022",
   1.6068640195897388,
   92.64549552722087
  ],
  [
   "SUP-017",
   1.5762533105479652,
   94.22174883776884
  ],
  [
   "SUP-023",
   1.306062727323829,
   95.52781156509268
  ],
  [
   "SUP-006",
   1.110427756060694,
   96.63823932115336
  ],
  [
   "SUP-014",
   0.662593126341108,
   97.30083244749447
  ],
  [
   "SUP-013",
   0.49333468037296924,
   97.79416712786744
  ],
  [
   "SUP-015",
   0.4428642555888525,
   98.2370313834563
  ],
  [
   "SUP-019",
   0.43038822446666103,
   98.66741960792297
  ],
  [
   "SUP-003",
   0.42885485751309554,
   99.09627446543607
  ],
  [
   "SUP-024",
   0.28541534885683834,
   99.38168981429291
  ],
  [
   "SUP-009",
   0.2654118799625984,
   99.64710169425551
  ],
  [
   "SUP-005",
   0.13651757658462235,
   99.78361927084013
  ],
  [
   "SUP-018",
   0.0881250382688315,
   99.87174430910896
  ],
  [
   "SUP-011",
   0.0584334781679736,
   99.93017778727693
  ],
  [
   "SUP-025",
   0.04783059417655808,
   99.97800838145349
  ],
  [
   "SUP-021",
   0.021991618546533313,
   100.00000000000003
  ]
 ],
 "suppliers_for_80": 5,
 "seg_category": {
  "Machined Components": {
   "lines": 4,
   "net": 341715,
   "open": 168235.5,
   "overdue": 168235.5,
   "overdue_lines": 3
  },
  "Engine Components": {
   "lines": 4,
   "net": 1663065,
   "open": 1481481,
   "overdue": 1481481,
   "overdue_lines": 3
  },
  "Raw Materials": {
   "lines": 12,
   "net": 155249,
   "open": 87713.31,
   "overdue": 81649.56,
   "overdue_lines": 6
  },
  "Avionics": {
   "lines": 4,
   "net": 377270,
   "open": 377270,
   "overdue": 189410,
   "overdue_lines": 2
  },
  "Aerospace Fasteners": {
   "lines": 8,
   "net": 91722,
   "open": 68689.4,
   "overdue": 68689.4,
   "overdue_lines": 4
  },
  "Composite Materials": {
   "lines": 4,
   "net": 127455,
   "open": 1508,
   "overdue": 1508,
   "overdue_lines": 1
  },
  "Landing Gear Components": {
   "lines": 4,
   "net": 3184775,
   "open": 2472895,
   "overdue": 2198170,
   "overdue_lines": 3
  },
  "Thermal Management": {
   "lines": 4,
   "net": 2803320,
   "open": 2421120,
   "overdue": 1672320,
   "overdue_lines": 2
  },
  "Castings and Forgings": {
   "lines": 8,
   "net": 180374,
   "open": 101012.90000000001,
   "overdue": 75654.8,
   "overdue_lines": 4
  },
  "Hydraulic Components": {
   "lines": 4,
   "net": 260325,
   "open": 54697.5,
   "overdue": 54697.5,
   "overdue_lines": 1
  },
  "Electrical Components": {
   "lines": 4,
   "net": 6707,
   "open": 4332,
   "overdue": 4332,
   "overdue_lines": 2
  },
  "Actuation Systems": {
   "lines": 4,
   "net": 846400,
   "open": 846400,
   "overdue": 368000,
   "overdue_lines": 2
  },
  "Cabin Components": {
   "lines": 4,
   "net": 50832,
   "open": 26563.2,
   "overdue": 26563.2,
   "overdue_lines": 2
  },
  "Sensors and Instrumentation": {
   "lines": 4,
   "net": 719750,
   "open": 261000,
   "overdue": 261000,
   "overdue_lines": 2
  },
  "Structural Components": {
   "lines": 4,
   "net": 180922.5,
   "open": 96642.5,
   "overdue": 53212.5,
   "overdue_lines": 1
  },
  "Special Process Services": {
   "lines": 4,
   "net": 10115,
   "open": 8313,
   "overdue": 8313,
   "overdue_lines": 3
  },
  "Bearings": {
   "lines": 4,
   "net": 252802.5,
   "open": 194324,
   "overdue": 7474,
   "overdue_lines": 1
  },
  "Surface Treatment": {
   "lines": 4,
   "net": 2524.2,
   "open": 1285.2,
   "overdue": 411.6,
   "overdue_lines": 1
  },
  "Electrical Assemblies": {
   "lines": 4,
   "net": 184436,
   "open": 149900.8,
   "overdue": 149900.8,
   "overdue_lines": 3
  },
  "Polymer Components": {
   "lines": 4,
   "net": 32760,
   "open": 31906.5,
   "overdue": 26704.5,
   "overdue_lines": 3
  },
  "Logistics and Packaging": {
   "lines": 4,
   "net": 5490,
   "open": 1196.1,
   "overdue": 719.1,
   "overdue_lines": 2
  }
 },
 "seg_country": {
  "United States": {
   "lines": 12,
   "net": 414009.5,
   "open": 186299.25,
   "overdue": 180235.5,
   "overdue_lines": 4
  },
  "United Kingdom": {
   "lines": 4,
   "net": 1663065,
   "open": 1481481,
   "overdue": 1481481,
   "overdue_lines": 3
  },
  "Germany": {
   "lines": 4,
   "net": 49224,
   "open": 34195.56,
   "overdue": 34195.56,
   "overdue_lines": 3
  },
  "France": {
   "lines": 4,
   "net": 377270,
   "open": 377270,
   "overdue": 189410,
   "overdue_lines": 2
  },
  "Canada": {
   "lines": 4,
   "net": 127455,
   "open": 1508,
   "overdue": 1508,
   "overdue_lines": 1
  },
  "Italy": {
   "lines": 4,
   "net": 3184775,
   "open": 2472895,
   "overdue": 2198170,
   "overdue_lines": 3
  },
  "Japan": {
   "lines": 4,
   "net": 2803320,
   "open": 2421120,
   "overdue": 1672320,
   "overdue_lines": 2
  },
  "India": {
   "lines": 4,
   "net": 30464,
   "open": 30464,
   "overdue": 13463.999999999998,
   "overdue_lines": 1
  },
  "Netherlands": {
   "lines": 4,
   "net": 260325,
   "open": 54697.5,
   "overdue": 54697.5,
   "overdue_lines": 1
  },
  "Singapore": {
   "lines": 8,
   "net": 12197,
   "open": 5528.1,
   "overdue": 5051.1,
   "overdue_lines": 4
  },
  "Sweden": {
   "lines": 4,
   "net": 846400,
   "open": 846400,
   "overdue": 368000,
   "overdue_lines": 2
  },
  "Spain": {
   "lines": 4,
   "net": 76052.5,
   "open": 68689.4,
   "overdue": 68689.4,
   "overdue_lines": 4
  },
  "Poland": {
   "lines": 4,
   "net": 50832,
   "open": 26563.2,
   "overdue": 26563.2,
   "overdue_lines": 2
  },
  "South Korea": {
   "lines": 4,
   "net": 719750,
   "open": 261000,
   "overdue": 261000,
   "overdue_lines": 2
  },
  "Australia": {
   "lines": 4,
   "net": 180922.5,
   "open": 96642.5,
   "overdue": 53212.5,
   "overdue_lines": 1
  },
  "Ireland": {
   "lines": 4,
   "net": 10115,
   "open": 8313,
   "overdue": 8313,
   "overdue_lines": 3
  },
  "United Arab Emirates": {
   "lines": 4,
   "net": 49400,
   "open": 35454,
   "overdue": 35454,
   "overdue_lines": 2
  },
  "Switzerland": {
   "lines": 4,
   "net": 252802.5,
   "open": 194324,
   "overdue": 7474,
   "overdue_lines": 1
  },
  "Czech Republic": {
   "lines": 4,
   "net": 2524.2,
   "open": 1285.2,
   "overdue": 411.6,
   "overdue_lines": 1
  },
  "Mexico": {
   "lines": 4,
   "net": 184436,
   "open": 149900.8,
   "overdue": 149900.8,
   "overdue_lines": 3
  },
  "Brazil": {
   "lines": 4,
   "net": 149910,
   "open": 70548.90000000001,
   "overdue": 62190.8,
   "overdue_lines": 3
  },
  "Malaysia": {
   "lines": 4,
   "net": 32760,
   "open": 31906.5,
   "overdue": 26704.5,
   "overdue_lines": 3
  }
 },
 "seg_tier": {
  "Tier 1": {
   "lines": 32,
   "net": 7646102.5,
   "open": 5856303,
   "overdue": 4728468,
   "overdue_lines": 17
  },
  "Tier 2": {
   "lines": 68,
   "net": 3831906.6999999997,
   "open": 3000182.91,
   "overdue": 2169978.46,
   "overdue_lines": 34
  }
 },
 "seg_criticality": {
  "Critical": {
   "lines": 16,
   "net": 6035955,
   "open": 4969011.5,
   "overdue": 4215886.5,
   "overdue_lines": 11
  },
  "High": {
   "lines": 44,
   "net": 2220417.5,
   "open": 1138714.21,
   "overdue": 689152.36,
   "overdue_lines": 16
  },
  "Medium": {
   "lines": 32,
   "net": 3183386.6999999997,
   "open": 2715657.6,
   "overdue": 1965984,
   "overdue_lines": 19
  },
  "Low": {
   "lines": 8,
   "net": 38250,
   "open": 33102.6,
   "overdue": 27423.6,
   "overdue_lines": 5
  }
 },
 "register_first5": [
  [
   "POL-00003",
   327
  ],
  [
   "POL-00001",
   325
  ],
  [
   "POL-00009",
   289
  ],
  [
   "POL-00018",
   280
  ],
  [
   "POL-00002",
   278
  ]
 ],
 "register_count": 63,
 "avg_gross_line": 125503.78199999999
});
