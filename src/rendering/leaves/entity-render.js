/* ═══ v2.3.6200: render's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */

/* ── v2.3.6200: level 0 ── */
/* v2.3.3459: is `o` drawn as a picture of its own -- shown, renderable and
   built into its figure's drawing all the way up to `root`?  (A stencil mask
   is shown inside a box the figure's drawing leaves out: hairClip.js.) */
export function drawnAsContent(o, root) {
  for (let c = o; c; c = c.parent) {
    if (!c.visible || c.renderable === false || c.includeInBuild === false) return false;
    if (c === root) return true;
  }
  return true;
}
export function _hideExceptDeep(display, keep) {
  const ui = display._uiLayer;
  for (let i = 0; i < display.children.length; i++) {
    const c = display.children[i];
    if (c === ui) continue;                       /* swept on its own terms below */
    if (c && c.visible && keep.indexOf(c) < 0) c.visible = false;
  }
  if (ui) {
    for (let i = 0; i < ui.children.length; i++) {
      const c = ui.children[i];
      if (c && c.visible && keep.indexOf(c) < 0) c.visible = false;
    }
  }
}
