/* ═══ v2.3.5345: THE RENDER SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `render` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

const PET_DRAW_K = 0.85;   /* v2.3.3120: see _updatePet */

/* Module-scope SECTORS array — shared by local + other player update
 * paths.  Was previously allocated as a `const` inside each per-frame
 * loop, which produced a small but recurring GC pressure source. */
const SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

export { PET_DRAW_K, SECTORS };
