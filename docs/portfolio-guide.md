# Portfolio Demonstration Guide

**Aerospace Supplier Intelligence Platform – version 1.0**  
**Live dashboard:** https://shahabaze.github.io/aerospace-supplier-intelligence/  
**Audience:** recruiters, hiring managers and aerospace procurement professionals  
**Time needed:** about 5 minutes

All data is synthetic.

---

## The one-sentence pitch

A supplier intelligence dashboard that turns raw supplier, PO, delivery, quality and inventory records into decision-ready procurement KPIs. It is built with the discipline of a real aerospace procurement function: governed definitions, validated data, and no figure the data cannot support.

## Five-minute walkthrough

### 1. Executive dashboard (1 minute)

- Point to the **title block** at the top: reporting period, snapshot date, "17 of 17 controls passed", and the data model and KPI dictionary versions. *The data is validated in the browser before any number appears.*
- **Delivery Event OTD 39.7%** is shown with 38.4% on the full dataset underneath. *Twelve events fall after the snapshot date. Rather than hide them, both bases are shown and the events are listed under Data quality.*
- **Net active PO line value $11.48M** shows gross and cancelled value beneath it. *Cancelled value is not active commitment.*
- Scroll to **Not supported by the current data**. *OTIF, invoiced spend and a composite risk score are deliberately not calculated, because the data cannot support them.*

### 2. Supplier performance (1½ minutes)

- Read the line under **Performance by supplier criticality**: Critical suppliers hold 52.6% of active PO value but account for only 4 of 63 delivered events in the period. *That is a supplier-governance insight, not just a chart.*
- In the **comparison table**:
  - sort by Delivery Event OTD; suppliers with no data stay at the bottom, never shown as 0%
  - point out the amber **Limited sample** tags on rates based on 1–2 records
- Select **SUP-013** to show the detail view. Every delivery event and inspection is listed, and events after the snapshot date are marked.

### 3. Procurement intelligence (1½ minutes)

- The **PO value bridge** reconciles to the cent. Gross − cancelled = net active = received + open, and open = overdue + not yet due.
- **$6.90M (77.9%) of open commitment is past its recorded promise date**, and 28 overdue lines have received nothing.
- **Overdue ageing:** most lines are over 180 days late, but most value sits in the 31–90-day bucket. *That changes where you expedite first.*
- In the **Expediting register**, select "Over 180 days" and "Nothing received yet". *That is the expediting call list.*
- Under **Commitment by segment**, choose "Supplier criticality". *Critical suppliers carry 61.1% of overdue value.*

### 4. Inventory intelligence (1 minute)

- **10 materials are below reorder point** on available stock (on hand minus allocated), which is stricter than the supplied on-hand status. *The two bases are shown side by side, and MAT-010 and MAT-020 differ.*
- In the material table, show **MAT-004**: a Critical material from a High-criticality supplier. Material and supplier criticality come from different sources and are shown separately.
- Point to the **single-snapshot warning**. *There is no trend data, and the dashboard says so.*

## Questions reviewers often ask

| Question | Short answer |
|---|---|
| Is this real company data? | No. All data is synthetic and was designed for this project. |
| How are the numbers checked? | 280 automated browser tests. KPI values are checked against a separate, independent calculation, and deliberate bugs were planted to prove the tests catch them. |
| Why no OTIF? | The data does not hold original commitment dates or promise history, so a defensible OTIF cannot be calculated. Delivery-event OTD is shown instead and labelled as such. |
| Why not show spend? | There is no invoice data. All values are PO line values, and the dashboard labels them that way. |
| What tools were used? | Plain HTML, CSS and JavaScript on GitHub Pages, with Chart.js and Papa Parse. No server, no paid services and no API keys. |
| What is next? | An AI procurement assistant that answers questions from the validated KPIs, through a secure backend. |

## Domain skills on show

- Supplier performance management: OTD, nonconformance and CAPA tracking, supplier qualification and certification status
- PO lifecycle and commitment control: open commitment, cancellations, expediting, promise versus need date
- Supply-base concentration and criticality analysis
- Inventory planning: reorder point, safety stock, days of supply, excess
- Data governance: KPI dictionary, data model, decision log, validation controls, honest limitations

## Links

- [README](../README.md)
- [KPI Dictionary v2.3](kpi-dictionary.md)
- [Data Model v2.0](data-model.md)
- [Decision Log](decision-log.md)
- [Test reports](../tests/reports/)
