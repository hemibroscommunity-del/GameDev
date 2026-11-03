/* ═══ v2.3.4080: A BIG DRAWING'S BUILDING LISTS LET GO ONCE IT IS BUILT (`?gfxlean`) ═══
 *
 * The owner, 2026-11-03: "Raise to 38 MB + trim" (the memory check's heap
 * line; docs/specs/heap-trim-2026-11-03.md).  Heap snapshots of the check's
 * trip named the biggest single holder of the page's JavaScript objects: the
 * Wheel minimap's roads, river and railway (wheelMinimap.js `lines`), one
 * Graphics stroked once for the whole long Wheel -- ~26,600 points of
 * triangles with their round joins, kept as THREE plain arrays of numbers
 * (its points, their texture places and the triangles' corners: ~1.0 MB of
 * the heap) for the whole session, on every stop of the trip.
 *
 * Pixi 8 (GraphicsContextSystem) fills those arrays (`geometryData`) when it
 * builds a Graphics' shapes into triangles.  A SMALL Graphics (under 400
 * numbers: `isBatchable`) is copied from them into the shared batch every
 * time its layer's draw list is rebuilt, so it needs them.  A BIG one is not
 * batched: Pixi copies them ONCE into its own vertex and index buffers
 * (`graphicsData`, the typed arrays the graphics chip draws from, kept) and
 * never reads them again -- until the drawing changes (`dirty`), when Pixi
 * empties and refills them itself (buildContextBatches), or Pixi's own
 * collector unloads it (GraphicsContext.unload: a fresh build next time it
 * is drawn).  So once that copy exists, the three arrays are emptied here,
 * as Pixi's own reset() empties them (`length = 0`, the same arrays): what
 * the chip draws is the copy, and is the same to the pixel.
 *
 * leanGraphics(g) is called for a big Graphics drawn once (the minimap's
 * lines, buildings and places, each frame: a few property reads, a no-op
 * once done).  It does nothing to a Graphics that is batched, not yet drawn
 * or has fewer than MIN numbers.
 *
 * `?gfxlean=0` keeps the arrays (the page as before), or the Test panel's
 * Memory savers row, from the next load (game/clientOff.js).
 */
import { clientOffAtLoad } from '../game/clientOff.js';

/* numbers in the points' array below which a drawing is left alone (2,000
   points): the batched ones are under 400, and a small one is not worth it */
const MIN = 4000;

const _off = (() => {
  try {
    if (typeof location !== 'undefined' && /[?&]gfxlean=(0|off|false)(&|$)/.test(location.search || '')) return true;
    return clientOffAtLoad('gfxlean');
  } catch (e) { return false; }
})();

/* the QA probe (window.__btGfxLean): drawings let go, and the numbers freed */
const _stats = { on: !_off, lean: 0, numbers: 0 };
try { if (typeof window !== 'undefined') window.__btGfxLean = _stats; } catch (e) { /* no page */ }

/** Let go of a big, drawn, unbatched Graphics' building lists (the header).
 *  Returns how many numbers it freed (0 almost always). */
export function leanGraphics(g) {
  if (_off || !g || g.destroyed) return 0;
  const ctx = g.context;
  const all = ctx && ctx._gpuData;
  if (!all) return 0;
  let freed = 0;
  for (const k in all) {
    const gc = all[k];
    /* drawn (its own buffers made), not batched, not dirty (Pixi rebuilds it
       from the shapes then, refilling the lists itself) */
    if (!gc || gc.isBatchable || !gc.graphicsData || !gc.geometryData || ctx.dirty) continue;
    const d = gc.geometryData;
    if (!d.vertices || d.vertices.length < MIN) continue;
    freed += d.vertices.length + d.uvs.length + d.indices.length;
    d.vertices.length = 0;
    d.uvs.length = 0;
    d.indices.length = 0;
  }
  if (freed) { _stats.lean++; _stats.numbers += freed; }
  return freed;
}
