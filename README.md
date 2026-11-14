# Aerospace Supplier Intelligence Platform

**A browser-based aerospace procurement and supplier intelligence dashboard that turns supplier, purchase order, delivery, quality and inventory data into traceable, decision-ready KPIs.**

<p align="center">
  <strong>Independent Technology Portfolio Project | Aerospace | Procurement | Supplier Performance | Supply Chain Analytics</strong>
</p>

> **All data in this repository is synthetic.** Supplier names, figures and results are invented for demonstration and do not describe any real company or supplier.

---

## 1. Project Overview

The Aerospace Supplier Intelligence Platform demonstrates how aerospace procurement domain knowledge, disciplined KPI governance and modern web technology can be combined into a practical supplier intelligence tool.

The application runs entirely in a web browser. It loads six synthetic procurement datasets, validates them against a documented data model, and calculates every KPI live from the source files using documented formulas.

An AI Procurement Assistant is planned for a later phase, once the core dashboard is complete and validated.

## 2. Business Problem

Aerospace procurement operations involve complex supplier networks, long material lead times, strict quality requirements, delivery commitments and inventory constraints.

Fragmented procurement information can make it difficult to:

- Identify suppliers with declining delivery performance.
- Monitor supplier delivery performance against promised dates.
- Identify potential supply disruptions.
- Understand PO commitments and supplier concentration.
- Detect material shortages and excess inventory.
- Prioritize suppliers requiring management intervention.
- Convert operational data into actionable management insights.

## 3. What Makes This Project Different

- **KPI governance first.** Every KPI is defined in [`docs/kpi-dictionary.md`](docs/kpi-dictionary.md) before it is built, including its formula, grain, filters and limitations.
- **Validated data.** All 17 integrity controls in [`docs/data-model.md`](docs/data-model.md) are run in the browser before KPIs are shown.
- **Honest measures.** Delivery-event OTD is never presented as OTIF. PO commitment is never presented as invoiced spend. Unsupported KPIs are labelled as unsupported rather than estimated.
- **Traceable.** Each figure on screen shows its basis, denominator and as-of date.

## 4. Application Modules

| # | Module | Primary Capabilities | Status |
|---|---|---|---|
| 1 | Executive Dashboard | Delivery Event OTD (snapshot and full-dataset bases), late delivery events, open PO commitment, net active PO line value (with gross and cancelled), inspection rejection rate, on-hand inventory value; data-quality warnings; supplier concentration; unsupported-KPI register | Approved (Stage 4) |
| 2 | Supplier Performance | Delivery-event OTD on snapshot and full-dataset bases, late events, delivery variance, rejection rate, nonconformances, corrective-action register, criticality/qualification/certification; criticality segments; PO exposure vs OTD; sortable, filterable comparison; supplier detail with events and inspections; sample-size labels | Approved (Stage 5) |
| 3 | Procurement Intelligence | Supplier PO commitment, commitment concentration, open PO exposure, overdue open PO lines | Planned |
| 4 | Inventory Intelligence | Inventory value, available stock, below reorder point, safety stock breaches, days of supply, excess inventory | Planned |
| 5 | AI Procurement Assistant | Natural-language questions grounded in validated KPI results, via a secure backend | Future phase |

There is no composite supplier risk score. The current data does not support one (KPI Dictionary 8.5).

## 5. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5, CSS3, vanilla JavaScript | Application structure, styling and logic, with no framework and no build step |
| [Papa Parse](https://www.papaparse.com/) (pinned local copy, MIT) | CSV parsing in the browser |
| [Chart.js](https://www.chartjs.org/) (pinned local copy, MIT) | Charts |
| Barlow and Barlow Semi Condensed (self-hosted, SIL OFL 1.1) | Typography |
| GitHub Pages | Free hosting from the `main` branch |
| GitHub | Source code, documentation and version control |
| ChatGPT | Project architecture and independent quality review |
| Claude | Implementation and code review |

No Python, no server and no paid services are required. See [`docs/architecture.md`](docs/architecture.md).

## 6. Data

Six synthetic CSV datasets in [`data/`](data/), defined by Data Model v2.0:

| File | Records | Grain |
|---|---:|---|
| `suppliers.csv` | 25 | One supplier |
| `materials.csv` | 25 | One material |
| `purchase_orders.csv` | 100 | One PO line |
| `delivery_transactions.csv` | 91 | One delivery event |
| `inventory_snapshot.csv` | 25 | One material at snapshot date 2026-10-31 |
| `supplier_quality.csv` | 73 | One inspection event |

Reporting period: 2025-11-01 to 2026-10-31. Currency: USD.

## 7. Repository Structure

```text
aerospace-supplier-intelligence/
├── index.html                 Application entry point
├── data/                      Six source CSV files (read-only)
├── docs/
│   ├── project-charter.md
│   ├── architecture.md        v2.0 – approved architecture
│   ├── decision-log.md        v2.5 – decision register
│   ├── development-roadmap.md
│   ├── data-model.md          v2.0 – implemented data model
│   └── kpi-dictionary.md      v2.3 – KPI definitions
├── src/                       Application code (CSS, JavaScript, pinned libraries)
├── tests/                     Browser-based test pages, fixtures and stage test reports
├── assets/                    Screenshots and images
├── .gitignore
└── README.md
```

## 8. Development Roadmap

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Project foundation and documentation | Completed |
| Phase 1 | Requirements, architecture validation and data design | Completed (Data Model v2.0, KPI Dictionary v2.3, Architecture v2.0) |
| Phase 2 | Dashboard and application development | In progress |
| Phase 3 | AI integration and procurement assistant | Planned – after Phase 2 validation |
| Phase 4 | Testing, validation and security | Ongoing per stage; final review planned |
| Phase 5 | Deployment and portfolio preparation | Planned |

### Phase 2 build sequence

1. Decision log and documentation updates
2. Data layer: loader, schema handling and all 17 validation controls
3. KPI engine and browser-based KPI tests
4. Executive Dashboard
5. Supplier Performance
6. Procurement Intelligence
7. Inventory Intelligence
8. GitHub Pages deployment and live-site verification

Each stage is committed separately with a test report in `tests/reports/`.

## 9. Project Documentation

- [Project Charter](docs/project-charter.md) – Objectives, scope and governance.
- [Technical Architecture](docs/architecture.md) – Approved application architecture (v2.0).
- [Decision Log](docs/decision-log.md) – Approved decisions and rationale (v2.5).
- [Development Roadmap](docs/development-roadmap.md) – Phases and milestones.
- [Data Model](docs/data-model.md) – Datasets, fields, keys and validation controls (v2.0).
- [KPI Dictionary](docs/kpi-dictionary.md) – KPI definitions, formulas and limitations (v2.3).

Where the charter or roadmap differ from later approved decisions (technology stack, five-module scope), the decision log takes precedence.

## 10. Data and Security

The project does not use or publish:

- Confidential aerospace supplier information.
- Proprietary company procurement records.
- Restricted supplier financial information.
- Personal or sensitive business information.
- API keys, passwords or authentication credentials.

The future AI assistant will call any AI service only through a secure backend. API keys will never appear in browser code or in this repository.

AI-generated content will clearly distinguish dataset values, rule-based calculations and AI interpretation, and must not invent supplier performance results.

## 11. Development Governance

| Role | Responsibility |
|---|---|
| Project Owner | Project decisions and final approval |
| ChatGPT | Project architecture and independent quality review |
| Claude | Implementation, testing and code review |
| GitHub | Authoritative repository and version control |

A feature is described as tested only when a test has actually been run and its result recorded.

## 12. Current Project Status

**Current Phase:** Phase 2 – Application Development  
**Development Budget:** Zero cost

**Completed**

- Data Model v2.0 and six synthetic CSV datasets.
- KPI Dictionary v2.3.
- Repository audit (2026-11-13): all 17 data-model controls pass on the source data.
- Architecture v2.0 and Decision Log v2.5.
- Data layer: CSV loader, schema typing (blank stays blank) and all 17 Data Model validation controls, with browser tests ([Stage 2 test report](tests/reports/stage-02-data-layer.md)).

- KPI engine implementing KPI Dictionary v2.3, verified against independently calculated values ([Stage 3 test report](tests/reports/stage-03-kpi-engine.md)).

- Executive Dashboard and application shell ([Stage 4 test report](tests/reports/stage-04-executive-dashboard.md)).

- Supplier Performance module ([Stage 5 test report](tests/reports/stage-05-supplier-performance.md)).

**Next**

- Procurement Intelligence (Stage 6): approved for implementation (DEC-026 to DEC-032).

The live dashboard link and screenshots will be added once the first module is deployed and verified.

## 13. Project Vision

To demonstrate how aerospace procurement professionals can combine industry expertise, data governance and modern digital technology to build practical supplier intelligence and supply chain decision-support tools.

---

**Project Classification:** Independent Professional Technology Portfolio Project  
**Data Classification:** Synthetic Demonstration Data  
**Document Version:** 1.2  
**Repository:** aerospace-supplier-intelligence
