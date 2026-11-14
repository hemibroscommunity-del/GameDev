/* ═══ v2.3.5248: WHAT A PICTURE IN PIXI'S ASSET CACHE HOLDS IN THE PAGE ═══
 *
 * The memory check's `artCache` line (tools/qa/mp/memory-budget.mjs) reads
 * __btTex (pixiApp.js), which counted every source in Pixi's asset cache at
 * four bytes a pixel.  A picture kept as colour NUMBERS (paletteTex.js
 * makePaletteSource: the farm's pictures, the Wheel's ground, the trees since
 * v2.3.5248, the effects' twins) holds no picture in the page: its resource
 * is its numbers, one byte a pixel, and the `buffers` line already counts
 * them (they are an ArrayBuffer).  Counted here too, they were counted twice,
 * four times over: the five trees as numbers read 5.6 MB of `artCache` that
 * held nothing (card P's backlog, tree-tiers; the planning session's yes,
 * 2026-11-14).  So a numbers source counts nothing here, as an emptied canvas
 * has since v2.3.3715.  The graphics chip's copy of one is counted where the
 * chip is counted (__btGpuTex: bytes a pixel by format, one for colour
 * numbers), never here.
 *
 * One rule, read by __btTex's total and its list, by the census's page rows
 * (tools/qa/mp/memprobe.mjs, through window.__btCacheBytes) and by
 * tools/guards/cache-bytes.test.mjs.  No imports: node reads it as it is.
 */

/** The bytes `src` (a Pixi TextureSource in the asset cache) holds in the
 *  page, as the `artCache` line counts them:
 *    - destroyed, or its page copy let go of (picsOnce.js `__btReleased`): 0;
 *    - colour numbers (paletteTex.js marks one `_btPal` while it lives): 0,
 *      its numbers are counted in `buffers`;
 *    - a canvas: its own size now, four bytes a pixel (one emptied once its
 *      copy is on the chip holds 0 x 0: gpuOnly.js, heldNumbers.js);
 *    - anything else: its size, four bytes a pixel. */
export function cacheSourceBytes(src) {
  if (!src || src.destroyed) return 0;
  const res = src.resource;
  if (res && res.__btReleased) return 0;
  if (src._btPal) return 0;
  let w = src.pixelWidth || src.width || 0;
  let h = src.pixelHeight || src.height || 0;
  if (res && typeof res.getContext === 'function') { w = res.width | 0; h = res.height | 0; }
  return w * h * 4;
}
