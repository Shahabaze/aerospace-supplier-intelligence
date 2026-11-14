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
    available: true,
    stageLabel: null,
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
