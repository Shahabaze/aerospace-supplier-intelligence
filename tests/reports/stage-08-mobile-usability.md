# Test Report – Stage 8 Refinement: Mobile Usability

**Project:** Aerospace Supplier Intelligence Platform  
**Stage:** Phase 2, Stage 8, final mobile usability refinement before portfolio release  
**Date:** 2026-11-14  
**Tested by:** Claude (automated runs in headless Chrome 153 via Playwright)  
**Result:** **Regression suite 280 / 280** (data layer 54, KPI engine 88, Executive dashboard 38, supplier 44, procurement 33, inventory 23, of which 6 are new). **Viewport checks 81 / 81** at 375, 400, 768, 1280 and 1440px. **Desktop and tablet unchanged:** 18 / 18 full-page screenshots (6 routes at 768, 1280 and 1440px) are pixel-identical to the release before this change.

## 1. Changes

| # | Requirement | Delivered as |
|---|---|---|
| 1 | Sticky first Material column, including its header | The column was already fixed during sideways scrolling: at 375px it stays at x = 17 after a 300px scroll. Two additions help users notice this. A shadow appears on the column's right edge once the table has been scrolled, and clears at the start. The table is also a labelled, focusable region (`role="region"`, `tabindex="0"`), so keyboard users can scroll it with the arrow keys. |
| 2 | Touch targets of about 44px on mobile | At 640px and below, these are at least 44px tall: menu button, module links, filter selects, search, the SERVICE checkbox row, reset buttons, segmented options, table sort headers, table supplier links, notice toggles and the wordmark. Above 640px, all sizes are unchanged. |
| 3 | Mobile-only "Swipe to see more" hint | "⇆ Swipe sideways to see all 10 columns. The Material column stays in place." It sits above the inventory table at 640px and below, is hidden on wider screens, and is hidden when filters leave no rows. |
| 4 | Collapsible mobile navigation | At 640px and below, a menu button replaces the always-open module list. The button's label shows the current module. It sets `aria-expanded` and `aria-controls`. Escape closes the menu and returns focus to the button. Choosing a module closes the menu, then focus moves to the page heading as before. Above 640px the button is hidden and the five tabs show as before. |

**Files changed:**

- `index.html`: the menu button
- `src/css/app.css`: rules inside the existing 640px block, plus the edge shadow and focus outline
- `src/js/app.js`: menu state and the scroll-edge class
- `src/js/views/inventory.js`: the hint, and the region attributes on the table wrapper
- `tests/inventory-tests.js`: 6 tests

**Unchanged:** KPI calculations, CSV files, Data Model v2.0, the KPI Dictionary, and module content and behaviour.

## 2. Viewport Checks (375, 400, 768, 1280, 1440px)

At each width:

- **All six routes:** no horizontal page overflow, and no `NaN` or `undefined` text.
- **Menu:** button shown and collapsed at 375 and 400; hidden at 768 and above, where all five links are visible.
- **Swipe hint:** shown at 375 and 400; hidden at 768 and above.
- **Inventory table:**
  - The Material column and its header keep the same left position after a sideways scroll.
  - Other cells pass beneath the fixed column.
  - The edge shadow appears after scrolling and clears at the start.
  - The table region takes focus, and ArrowRight scrolls it.
- **Filter:** "Below safety stock" shows the 5 expected materials (MAT-004, -006, -010, -011, -015).
- **Sort:** sorting by on-hand value with the keyboard sets `aria-sort` and keeps focus. Reset restores 23 materials.
- **Keyboard menu (375 and 400):**
  - Enter opens the menu.
  - Tab moves into the first link.
  - Escape closes the menu and focuses the button.
  - Choosing a module navigates, closes the menu, updates the label and focuses the heading.
- **Errors:** no console or page errors.

Touch-target heights at 375px (smallest of each type):

| Element | Height |
|---|---|
| Menu button | 44 |
| Module links | 44 |
| Selects | 44 |
| Search | 44 |
| SERVICE checkbox row | 50 |
| Reset | 44 |
| Sort headers | 46 |
| Supplier links | 44 |
| Wordmark | 44 |

At 768px and above, these heights are unchanged from the release (for example, selects 32 and sort headers 18).

## 3. New Regression Tests (`tests/inventory-tests.js`, group "Mobile")

1. Desktop width: menu button and hint hidden; all five links visible.
2. 375px, closed state:
   - The menu is collapsed.
   - The button names the current module and is at least 44px tall.
   - The wordmark keeps its word spacing.
   - Table links are at least 44px tall.
3. 375px, open state: the menu opens with links of at least 44px; Escape closes it and returns focus to the button.
4. 375px, navigation: choosing a module navigates and closes the menu.
5. 375px, table:
   - The hint sits above the table.
   - The table is a focusable region.
   - The Material cell and its header stay fixed.
   - The edge-shadow class is set and then cleared.
6. 375px, controls: every filter, search, checkbox, reset and sort control is at least 44px tall.

**Mutation check:** three bugs were planted in a copy, and each was caught by one failing test:

- the menu never collapses
- Escape does not return focus
- the Material column is not sticky

While writing these tests, two problems were found and fixed:

- **Unreliable focus test:** the first version of the focus test compared DOM elements with `assertEqual`. That function compares JSON, and every element serialises to `{}`, so the test could not fail. It now compares the elements directly.
- **Lost word spacing:** an early CSS version used flex layout for the larger links. Flex drops the space between "Supplier" and "Intelligence", and between a supplier ID and its name. This was caught in screenshot review. Those elements now use inline-block, and a test guards the wordmark spacing.

## 4. Screenshots (`assets/screenshots/`, 375 × 812 at 2× scale)

- `08-mobile-executive.png`: updated; collapsed menu.
- `09-mobile-procurement.png`: updated.
- `10-mobile-inventory-table.png`: new; swipe hint, and the table scrolled sideways with the Material column fixed and the edge shadow visible.
- `11-mobile-menu-open.png`: new; menu open with the current module highlighted.

## 5. Limits

- Narrow widths were emulated in desktop Chrome with touch enabled. They were not tested on physical phones, and not in Safari or Firefox.
- Screen-reader announcements were not tested with assistive technology.
- The hint follows a width breakpoint (640px). It does not detect touch, so a narrow desktop window also shows it.
