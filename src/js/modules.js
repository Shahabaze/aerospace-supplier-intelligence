/**
 * The five approved application modules (DEC-021).
 * `available: false` modules show a "planned" page with no figures.
 */

export const MODULES = Object.freeze([
  {
    id: 'executive',
    name: 'Executive dashboard',
    available: true,
    stageLabel: null,
  },
  {
    id: 'suppliers',
    name: 'Supplier performance',
    available: true,
    stageLabel: null,
  },
  {
    id: 'procurement',
    name: 'Procurement intelligence',
    available: true,
    stageLabel: null,
  },
  {
    id: 'inventory',
    name: 'Inventory intelligence',
    available: false,
    stageLabel: 'Stage 7',
    status: 'Planned for development Stage 7',
    summary: 'Point-in-time stock health for physical materials at the 31 October 2026 snapshot.',
    planned: [
      'On-hand and available inventory value (SERVICE materials excluded)',
      'Materials below reorder point and safety stock, on the available-stock basis',
      'Days of supply and excess inventory value',
      'Supplied inventory status, labelled as on-hand based',
    ],
  },
  {
    id: 'assistant',
    name: 'AI procurement assistant',
    available: false,
    stageLabel: 'Future phase',
    status: 'Future phase, after the core dashboard is validated',
    summary: 'Plain-language questions about suppliers, purchase orders and inventory, answered from the validated KPI results.',
    planned: [
      'Questions such as "Which critical suppliers have the lowest delivery-event OTD?"',
      'Answers that separate source figures, rule-based calculations and AI interpretation',
      'Requests sent through a secure backend. No AI service or API key is used in this website.',
    ],
  },
]);

export const DEFAULT_MODULE = 'executive';

export function moduleById(id) {
  return MODULES.find((m) => m.id === id) || null;
}
