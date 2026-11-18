/* ═══ v2.3.6220: THE RENDER SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */

/* v2.3.3241: a player the renderer did not draw this frame -- far off screen
   in the Wheel, or past the crowd cap (entityRenderer _updateOtherPlayers,
   which runs first) -- gets none of their effects either: no stand-in figure,
   trail, status look or bubble where nobody is drawn */
export const _peerNotDrawn = (S, id) => !!(S && S._peersNotDrawn && S._peersNotDrawn.has(id));
/* ═══ v2.3.3339: AN EMPTY GRAPHIC IS NOT CLEARED AGAIN ═══
   Found by the frame-rate hunt after the owner's "around 30fps to 40ish fps":
   Graphics.clear() on a graphic that is already empty draws nothing new, but
   it still marks the graphic changed, and Pixi answers any change to a
   batchable graphic by rebuilding its render group's whole draw list
   (GraphicsPipe.validateRenderable).  The screen's flash, atmosphere and HUD
   graphics are empty nearly always and were cleared every frame, so the
   screen's draw list (its three layers: atmosphere, screenFX, the HUD) was
   rebuilt every frame.  An empty graphic has no instructions; clearing one
   changes nothing (each fill already starts its next path afresh). */
export function clearIfDrawn(g) {
  if (g && g.context && g.context.instructions.length) g.clear();
}
