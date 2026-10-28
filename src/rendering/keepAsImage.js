/* ═══ v2.3.3606: A PICTURE THE GAME DREW, KEPT AS AN IMAGE ═══
 *
 * The owner, 2026-10-26, with two screenshots a minute apart: their bro in
 * his wavy hair, Red Bandana and Golden Glasses, then jogging southwest bald,
 * the glasses still on -- "Some traits will disappear.  It seems after combat
 * or interacting in the world a while."
 *
 * Every head piece is a picture the game MADE on a canvas: cut out of its
 * file (entityRenderer _loadTraitDir, v2.3.2776's crop) or recoloured
 * (hairColorCatalog and its four siblings).  A canvas reaches the graphics
 * chip the first time it is drawn, and is read again whenever the graphics
 * are made again (the black-screen recovery, a context restored).  iPhone
 * Safari can empty a canvas and say nothing (TRAPS §250, mp-tabwipe), and
 * the v2.3.778 note in pixiRenderer.js is the record of its memory purge:
 * anything but a picture from a FILE came back invisible, and pictures from
 * files have been decoded to <img> ever since.  So a facing the bro had not
 * turned to before such a moment, or every facing after a rebuild, drew its
 * hair and hat from an empty canvas: bald, the body (baked again on demand)
 * whole.
 *
 * So each such picture is turned into an image of itself the moment it is
 * made: the canvas is copied into a PNG (toBlob takes the copy at the call,
 * before anything can empty it), the PNG loaded as an <img>, and the
 * texture's source swapped to that image -- the same size, so every frame,
 * crop and anchor cut from it is unchanged and nothing that holds the texture
 * needs to know.  An <img> keeps its compressed bytes and is decoded again on
 * every upload, so it survives what the canvas did not.  The canvas is then
 * let go of (width 0, out of Pixi's Cache): the image is smaller than the
 * canvas it replaces, so this is a saving, not a cost.  A source already on
 * the chip is sent again from its image (the same pixels).
 *
 * Fails safe: no toBlob, a failed encode or load, or a source let go of in
 * the meantime keeps the canvas as before.  `?keepimage=0` is the game as it
 * was.  QA: window.__btKeptImages() (mp-headkeep).
 *
 * Only for pictures made once and kept as they are: a canvas the game draws
 * into again later must never be swapped out from under it.
 *
 * No imports (the server's suites run it in node, where there is no Pixi):
 * the caller hands in Pixi's Cache, which Texture.from(canvas) keyed by the
 * canvas, so the entry is taken out with the canvas (TRAPS §139). */

let _on = true;
try { if (typeof location !== 'undefined' && /[?&]keepimage=0\b/.test(location.search || '')) _on = false; } catch (e) { /* on */ }

const _stats = { asked: 0, kept: 0, failed: 0, pending: 0 };

/** Keep `source`'s canvas as an image of itself (the header).  `cache` is
 *  Pixi's Cache (the caller's import), or nothing.  Returns a promise of true
 *  once the source draws from the image, false when it keeps its canvas.
 *  v2.3.3702: `opts.quiet` -- a source already on the chip is NOT sent again:
 *  its copy there is these very pixels, and the image is only for the next
 *  upload (a black screen's rebuild).  For the sheets made by the dozen
 *  behind the loading screen (gearSheets.js), where sending every one again
 *  as its PNG comes back was a decode and an upload each in the first seconds
 *  of play. */
export function keepAsImage(source, cache, opts) {
  /* v2.3.3702: asked again for one source while it is being kept, or once it
     is (a head piece is cut by loadCroppedStrip, which keeps every strip it
     packs now, and its loader asks again), the answer is the first ask's: one
     PNG, not two.  One that failed may be asked again. */
  if (source && source.__btKeep) return source.__btKeep;
  const cv = source && source.resource;
  if (!_on || !cv || source.destroyed || typeof cv.toBlob !== 'function' || !(cv.width > 0) || !(cv.height > 0)) {
    return Promise.resolve(false);
  }
  _stats.asked++;
  _stats.pending++;
  /* the answer is the source's before any work starts, so a failure that comes
     at once (a toBlob that throws) takes it back off again */
  let resolve = null;
  const answer = new Promise((r) => { resolve = r; });
  try { source.__btKeep = answer; } catch (e) { /* asked again: encoded again */ }
  {
    let done = false;
    const end = (ok) => {
      if (done) return;
      done = true;
      _stats.pending--;
      if (ok) _stats.kept++; else _stats.failed++;
      if (!ok) { try { if (source.__btKeep === answer) source.__btKeep = null; } catch (e) { /* gone */ } }
      resolve(ok);
    };
    try {
      cv.toBlob((blob) => {
        if (!blob || source.destroyed || source.resource !== cv) { end(false); return; }
        let url = null;
        try { url = URL.createObjectURL(blob); } catch (e) { end(false); return; }
        const img = new Image();
        img.onload = () => {
          if (source.destroyed || source.resource !== cv || img.naturalWidth !== cv.width || img.naturalHeight !== cv.height) {
            try { URL.revokeObjectURL(url); } catch (e) { /* gone */ }
            end(false);
            return;
          }
          source.resource = img;
          /* on the chip already: sent again from the image (the same pixels);
             not yet: it goes up from the image the first time it is drawn */
          if (!(opts && opts.quiet)) { try { source.update(); } catch (e) { /* drawn from the image next time */ } }
          /* the bytes behind the image live as long as the picture does */
          try { source.once('destroy', () => { try { URL.revokeObjectURL(url); } catch (e) { /* gone */ } }); } catch (e) { /* kept */ }
          try { if (cache && cache.has(cv)) cache.remove(cv); } catch (e) { /* older pixi */ }
          try { cv.width = 0; cv.height = 0; } catch (e) { /* not ours to zero */ }
          end(true);
        };
        img.onerror = () => { try { URL.revokeObjectURL(url); } catch (e) { /* gone */ } end(false); };
        img.src = url;
      }, 'image/png');
    } catch (e) { end(false); }
  }
  return answer;
}

/** Off with `?keepimage=0`. */
export const keepAsImageOn = () => _on;

/** What has been kept, what kept its canvas, what is still loading. */
export function keptImageStats() { return { off: !_on, ..._stats }; }

if (typeof window !== 'undefined') window.__btKeptImages = keptImageStats;
