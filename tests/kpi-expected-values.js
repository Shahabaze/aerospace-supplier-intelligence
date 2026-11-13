/**
 * Expected KPI values for tests/kpi-tests.js.
 *
 * Calculated independently during development (2026-11-13) by a separate script that reads the
 * six CSV files directly and applies the KPI Dictionary v2.2 formulas. That script is not part of
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
