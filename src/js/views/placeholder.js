/**
 * Page for modules that are not built yet. Shows what is planned and shows no figures.
 */

import { esc } from '../format.js';

export function renderPlaceholder(container, module) {
  const items = module.planned.map((p) => `<li>${esc(p)}</li>`).join('');
  container.innerHTML = `
    <section class="placeholder" data-placeholder="${esc(module.id)}">
      <h1 id="page-title" tabindex="-1">${esc(module.name)}</h1>
      <span class="placeholder__status">${esc(module.status)}</span>
      <p>${esc(module.summary)}</p>
      <p><strong>This module is not built yet.</strong> No figures are shown here, so nothing on this page should be read as a result.</p>
      <h2 style="font-size:1.25rem;margin-top:1.25rem">Planned content</h2>
      <ul>${items}</ul>
      <p class="muted">Current figures are on the <a href="#/executive">Executive dashboard</a>.</p>
    </section>`;
}
