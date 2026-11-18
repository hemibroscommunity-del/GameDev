/* ═══ v2.3.6200: preload's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */

/* ── v2.3.6200: level 0 ── */
/* The gather poses are authored SOUTH-ONLY -- walking them through all five
   dirs would bake four empty frames per pose and log four 404s per slot.
   Dodge is authored south + east for the same reason (see playerSprites). */
export const prewarmDirs = (pose, dirs) => ((pose === 'mine' || pose === 'pickup' || pose === 'fish') ? ['south']
  : pose === 'dodge' ? ['south', 'east'] : dirs);
export const _prewarmMasks = (pose) => pose !== 'pickup';
/* Yield between bake slices: prefer idle time (rIC), else a long-ish pause.
   v2.3.699: the first trickle (4 bakes / 16ms gap =~ a third of the main
   thread) measurably dented the frame rate right after joining -- now 2
   bakes per slice, >=90ms apart, idle-scheduled, after a 5s grace. */
export const _idleYield = () => new Promise((r) => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => setTimeout(r, 90), { timeout: 1000 });
  } else {
    setTimeout(r, 120);
  }
});
/* v2.3.2904: the next rendered frame (see prewarmAltWornSets' worker pace). */
export const _nextFrameP = () => new Promise((r) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r());
  else setTimeout(r, 16);
});
/* v2.3.2873: the `soon` pace -- the next idle moment, no added gap. */
export const _idleYieldSoon = () => new Promise((r) => {
  if (typeof requestAnimationFrame !== 'function') { setTimeout(r, 32); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => r()));
});
