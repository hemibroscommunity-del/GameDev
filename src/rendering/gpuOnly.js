/* ═══ v2.3.3078: PICTURES KEPT ON THE GRAPHICS CHIP ONLY ═══
 *
 * Owner, 2026-10-06, of the memory plan's trade-offs (docs/MEMORY-PLAN.md,
 * Phase 3): "Yes do all of them" -- among them "character art kept only on the
 * graphics chip (~46 MB): slightly slower recovery after a black screen".
 *
 * A picture the game bakes on a canvas is held twice once it is drawn: the
 * canvas in the page, and its copy on the graphics chip that is what is
 * actually drawn.  Pixi reads the canvas again only to upload it again: when
 * the source is updated or resized, or when a renderer that has never drawn it
 * -- a black screen's rebuild, or a context the browser gave back -- draws it
 * for the first time (GlTextureSystem._initSource).  So for a picture that
 * nothing reads back, and that a rebuilt renderer makes again for itself, the
 * canvas can be emptied the moment its copy is on the chip.  Two qualify,
 * measured on a phone in the Wheel (25 of the 47 MB of such canvases):
 *
 *   - the combat poses' gear layers (effectsRenderer._gearStrip): shirt, chest
 *     and legs over the sword, bow and gathering figures, 13.9 MB, made by each
 *     effects renderer for itself and only ever drawn;
 *   - the damage numbers' font (effectsRenderer, BitmapFont pages), 11 MB,
 *     installed once for the page and never redrawn (every number it draws is
 *     made of characters it was installed with) -- installed again for a
 *     rebuilt renderer (prewarmDmgFontPipe), the "slower recovery".
 *
 * The walking gear sheets (gearSheets.js, 18 MB) stay: the masked-body bakes
 * read them back (drawGearFrame) whenever gear changes.
 *
 * A context the browser restores without a rebuild would upload the emptied
 * canvases (nothing drawn there) -- but the game rebuilds the renderer 2.5 s
 * after every loss and never draws on a restored context (crashTrap
 * watchContextLoss, v2.3.773), as #806 found for the Wheel's ground.
 *
 * And Pixi's own GPU collector (renderer.gc, pixi 8.17) unloads a texture not
 * drawn for 60 s when the texture says it may (autoGarbageCollect -- the
 * damage font's pages do), to upload it again from its canvas when next drawn:
 * an emptied canvas would draw nothing.  So a picture kept on the chip only is
 * taken out of that collection: it stays on the chip while the page lives,
 * which costs the chip, idle, what the canvas cost the page (found by
 * mp-gpuonly: numbers drawn blank after a minute without a fight).
 *
 * `?gpucopies` in the address keeps every canvas, as before; so does QA's
 * window.__btTrimVerify (mp-geartrim compares the cropped strips' canvases
 * byte by byte).  QA: window.__btGpuOnly.
 */
export const KEEP_GPU_COPIES = typeof location !== 'undefined' && /[?&]gpucopies\b/.test(location.search || '');
const keepCopies = () => KEEP_GPU_COPIES || (typeof window !== 'undefined' && window.__btTrimVerify === true);

let _n = 0;
let _bytes = 0;

/** Upload `source` to `renderer` now, if it is not there yet, and empty the
 *  canvas behind it.  Returns true when the canvas was emptied.  Anything but
 *  a canvas on a live renderer is left as it is. */
export function keepOnGpuOnly(renderer, source) {
  if (keepCopies() || !renderer || !renderer.texture || !source || source.destroyed) return false;
  const cv = source.resource;
  if (!cv || typeof cv.getContext !== 'function' || !(cv.width > 0) || !(cv.height > 0)) return false;
  try { renderer.texture.initSource(source); } catch (e) { return false; }
  /* uploaded to THIS renderer, or the canvas stays (Pixi keys its copies by
     the renderer's uid) */
  if (!source._gpuData || !source._gpuData[renderer.uid]) return false;
  /* never unloaded by Pixi's GPU collector (above): the canvas it would be
     uploaded from again is about to be empty */
  source.autoGarbageCollect = false;
  _n++;
  _bytes += cv.width * cv.height * 4;
  /* QA (mp-gpuonly): what the canvas held, read once before it goes -- only
     when a test asked, never in play */
  if (typeof window !== 'undefined' && Array.isArray(window.__btGpuOnlyHeld)) {
    try {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let h = 2166136261 >>> 0;
      for (let i = 3; i < d.length; i += 4) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; }
      window.__btGpuOnlyHeld.push({ source, label: String(source.label || ''), w: cv.width, h: cv.height, alpha: h });
    } catch (e) { /* QA only */ }
  }
  cv.width = 0;
  cv.height = 0;
  return true;
}

if (typeof window !== 'undefined') {
  window.__btGpuOnly = () => ({ keep: keepCopies(), emptied: _n, mb: +(_bytes / 1048576).toFixed(1) });
}
