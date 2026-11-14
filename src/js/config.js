/**
 * Application configuration.
 *
 * Central place for settings that may change between data refreshes.
 * Values here are settings, not KPI results: no KPI value is hardcoded anywhere.
 */

export const CONFIG = Object.freeze({
  /** Reporting as-of (snapshot) date. KPI Dictionary 4.4 and 4.1 (v2.1) require this to be configurable. */
  reportingAsOfDate: '2026-10-31',

  /** Reporting period start, from Data Model v2.0. */
  reportingPeriodStart: '2025-11-01',

  /**
   * Minimum number of records for a supplier-level rate to be labelled "sufficient" (DEC-025).
   * Below this the rate is still shown, with its sample size, and labelled "limited".
   * Zero records: the rate is blank and labelled "no data". Display rule only; no KPI formula changes.
   */
  minimumSampleForRate: 3,

  /** Reporting currency. */
  currency: 'USD',

  /** Folder holding the six source CSV files, relative to the page that loads them. */
  dataBasePath: 'data/',

  /** Classification shown on every page. */
  dataClassification: 'Synthetic Demonstration Data',

  /** Public repository, used for links to the governing documents. */
  repositoryUrl: 'https://github.com/Shahabaze/aerospace-supplier-intelligence',

  /** Governing document versions, shown in the application footer. */
  documentVersions: Object.freeze({
    dataModel: '2.0',
    kpiDictionary: '2.3',
    architecture: '2.0',
  }),
});
