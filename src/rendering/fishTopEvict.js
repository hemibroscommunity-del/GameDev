/* ═══ v2.3.4157: A FISHING OVERLAY PUSHED OUT IS LET GO OF FOR GOOD ═══
 *
 * An angler in a shirt, a plate or greaves is drawn with an overlay on top
 * (entityRenderer _fishTopFrame): the head, the rod and the hand on it, made
 * on a canvas for each frame of the cast and kept in a cache of 64.  The
 * cast is 32 frames, so three anglers in different outfits on one screen
 * want 96 and the cache turns over every frame: about 4,300 overlays made
 * and pushed out a minute (the state-machine sweep of 2026-11-03, V17b
 * R1-8, a node model of the cache).
 *
 * Pushed out, an overlay was destroyed with its source -- but it is made with
 * Texture.from(canvas), which parks a texture in Pixi's Cache with the CANVAS
 * as the key, and that entry leaves only when THAT texture is destroyed, not
 * the copy the cache held (TRAPS §139).  So every overlay pushed out kept its
 * whole canvas for the life of the page: about 4 MB a second at a busy pond,
 * until an iPhone tab ran out of memory.
 *
 * Now one pushed out is let go of in the order TRAPS §139 gives:
 *   0. any sprite still showing it is pointed at Texture.EMPTY and hidden: a
 *      sprite on a freed source draws a hole or throws the frame (TRAPS §49).
 *      An angler on screen draws its own overlay every frame and the cap is
 *      far above the anglers a screen holds, so the one pushed out is not on
 *      a drawn angler -- but a display the renderer skipped (no body frame
 *      this frame, culled) still holds its last one;
 *   1. the copy the cache held, without its source;
 *   2. the source, Pixi's Cache entry and the canvas (releaseCanvasSource).
 *
 * This stops the leak, not the turnover: three anglers still make an overlay
 * a frame each.  Keying the overlay per outfit, or never pushing out one this
 * frame draws, is a design question left for after the expo.
 *
 * No imports (the server's suites run it in node, where there is no Pixi):
 * the caller hands in Texture.EMPTY and releaseCanvasSource
 * (server/test/fish-top-evict.test.mjs). */

function _letGo(release, tex) {
  try { release(tex); } catch (e) { /* one that will not free is still out of the cache */ }
}

/** Keep `tex` under `key` in `cache` (a Map, least recently drawn first: a
 *  hit moves its key to the back), then let go of the least recently drawn
 *  through `release` while more than `cap` are held.  Each one let go of is
 *  out of the cache before `release` sees it and is handed over once; one
 *  still held never is.  Returns `tex`. */
export function storeFishTop(cache, key, tex, cap, release) {
  const had = cache.get(key);
  if (had !== undefined) {
    cache.delete(key);
    if (had !== tex) _letGo(release, had);
  }
  cache.set(key, tex);
  const most = Math.max(1, cap | 0);
  while (cache.size > most) {
    const k0 = cache.keys().next().value;
    const old = cache.get(k0);
    cache.delete(k0);
    _letGo(release, old);
  }
  return tex;
}

/** `sprite` was just given an overlay: it goes on `shown` (a Set, the
 *  sprites a let-go overlay is taken off), once.  Any sprite destroyed since
 *  leaves the list then, so it holds the live sprites and does not grow with
 *  the room's comings and goings. */
export function holdFishTop(shown, sprite) {
  if (!sprite || shown.has(sprite)) return;
  for (const s of shown) if (!s || s.destroyed) shown.delete(s);
  shown.add(sprite);
}

/** Let go of the overlay `tex`, in the order of the header: every sprite on
 *  `shown` still showing it points at `empty` (Texture.EMPTY) and is hidden,
 *  then the copy is destroyed without its source, then the source goes to
 *  `releaseSource` (releaseCanvasSource) with its canvas still on it. */
export function releaseFishTop(tex, shown, empty, releaseSource) {
  if (!tex) return;
  if (shown) {
    for (const s of shown) {
      if (!s || s.destroyed) { shown.delete(s); continue; }
      if (s.texture === tex) { s.texture = empty; s.visible = false; shown.delete(s); }
    }
  }
  const src = tex.source;
  try { if (!tex.destroyed) tex.destroy(false); } catch (e) { /* already gone */ }
  if (src) releaseSource(src);
}
