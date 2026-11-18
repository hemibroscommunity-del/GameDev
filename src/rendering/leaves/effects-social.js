/* ═══ v2.3.6220: THE SOCIAL SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */

/* v2.3.3392: the band over a head, lowered as far as an emote brought the
   name plate down (rendering/emoteFx.js `_emoteHudDrop`: a sitter, a sleeper) */
export function bandWithEmote(band, who) {
  if (typeof band !== 'number' || !isFinite(band)) return band;
  const d = who && who._emoteHudDrop;
  return d > 0 ? band + d : band;
}
