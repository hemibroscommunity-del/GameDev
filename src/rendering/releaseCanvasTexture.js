/* ═══ v2.3.3060: LETTING GO OF A TEXTURE THAT WAS MADE FROM A CANVAS ═══
 *
 * Owner: "It happens too often that the screen goes black" -- and a black
 * screen's own recovery (the renderer rebuilt, BroTown _rebuildRenderer) was
 * found leaving ~90 MB behind it every time, a designer stroke 11.5 MB, a
 * monster's recolour a little on every visit (TRAPS §139, mp-bakeleak).  One
 * mistake under most of it:
 *
 * Texture.from(canvas) parks a Texture in Pixi's Cache with the CANVAS ITSELF
 * as the key (pixi textureFrom.mjs resourceToTexture), and that entry leaves
 * only when THAT Texture is destroyed.  Every release in this codebase
 * destroyed the SOURCE instead (`src.destroy()`): the GPU copy goes and
 * `source.resource` is nulled, but the Cache still holds the canvas -- every
 * pixel of it -- for the rest of the page's life, and __btTex, which skips
 * destroyed sources, never saw it.
 *
 * So the release is three steps, in this order (the order zoneTextures
 * _releaseCrops and npcSprites already used, v2.3.2859 / v2.3.2870):
 *   1. destroy the source (GPU copy, listeners);
 *   2. take the canvas out of the Cache;
 *   3. zero the canvas, so Safari hands its backing store back now rather
 *      than whenever its collector gets round to it.
 * Safe on a source that was never cached (a CanvasSource built by hand), on
 * one already released, and on an image-backed one (step 3 only touches a
 * canvas).
 *
 * The caller still owns step 0: nothing may be DRAWING the source.  A sprite
 * left holding a destroyed source draws nothing (TRAPS §49) or throws in the
 * frame it is next shown (CLAUDE.md, v2.3.2651) -- point it at Texture.EMPTY
 * first, as every release site here does. */
import { Cache } from 'pixi.js';

export function releaseCanvasSource(src) {
  if (!src) return;
  const res = src.resource;
  try { if (!src.destroyed) src.destroy(); } catch (e) { /* already gone */ }
  if (!res) return;
  try { if (Cache.has(res)) Cache.remove(res); } catch (e) { /* older pixi */ }
  try { if (typeof res.getContext === 'function') { res.width = 0; res.height = 0; } } catch (e) { /* not a canvas */ }
}

/** The same for a frame array (every frame of a strip shares one source). */
export function releaseFrames(arr) {
  const src = arr && arr[0] && arr[0].source;
  if (src) releaseCanvasSource(src);
}
