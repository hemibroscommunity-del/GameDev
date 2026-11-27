/* ═══ v2.3.6763: THE BAKED FRAMES AND THE GEAR SHEETS TO THE GRAPHICS CHIP ═══
 *
 * Moved unchanged from src/rendering/systems/entityRenderer.js (that file's
 * line, tools/guards/four-lines; card LOAD part 3b), which re-exports them
 * under their old names: uploadBakedTextures hands its masked cache in.
 */
import { getLoadedGearSources } from './gearSheets.js';
import { _nextFrameP } from './leaves/entity-preload.js';

/* v2.3.701: force-upload the baked masked-body textures to the GPU while the
   intro overlay is still up.  Texture.from(canvas) uploads lazily on first
   DRAW, so early play paid a stream of one-off upload stalls as the player
   turned/moved through freshly-baked frames ('slowing down on a few frames
   even after joining').  Feature-detected; harmless no-op if the renderer
   doesn't expose an upload path. */
/* v2.3.704: remember which sources already went up so repeat calls (the
   equip-change re-prewarm below re-runs this) only push the NEW bakes
   instead of re-uploading the whole ~100MB cache. */
const _uploadedSources = new WeakSet();
/* v2.3.2904: `opts.frameBudgetMs` -- in PLAY, upload for at most that long
   per rendered frame.  The every-24 setTimeout(0) yield below was written for
   the loading screen, where nothing else wants the thread; after an equip,
   several of those 0 ms timers run back to back before the next frame, so the
   ~150-200 new frames of a set went up in a few frames' worth of bursts
   (texImage2D + mipmaps each), seconds after the equip. */
export async function uploadBakedTexturesOf(_maskedBodyCache, renderer, opts) {
  if (!renderer) return;
  const budgetMs = (opts && opts.frameBudgetMs) || 0;
  let n = 0;
  let t0 = budgetMs ? performance.now() : 0;
  /* a snapshot: the cache is a live LRU (a draw re-inserts), and a Map
     iterator that keeps meeting re-inserted entries across the awaits
     below would never finish */
  for (const t of (budgetMs ? Array.from(_maskedBodyCache.values()) : _maskedBodyCache.values())) {
    if (!t || !t.source || t.source.destroyed || _uploadedSources.has(t.source)) continue;
    try {
      if (renderer.texture && typeof renderer.texture.initSource === 'function') {
        renderer.texture.initSource(t.source);
      } else if (renderer.prepare && typeof renderer.prepare.upload === 'function') {
        renderer.prepare.upload(t);
      } else return;
      _uploadedSources.add(t.source);
    } catch (e) { /* best-effort */ }
    if (budgetMs) {
      if (performance.now() - t0 >= budgetMs) { await _nextFrameP(); t0 = performance.now(); }
    } else if (++n % 24 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

/* v2.3.1022: force-upload the GEAR sheet textures too — idle/jog via the
   gearSheets cache, swing/bowshot via the Assets cache that
   effectsRenderer._gearStripFrame reads (warmed by preloadCombatGear).  Their
   GPU upload was still deferred to first DRAW, so the first armored turn/swing
   hitched.  Shares _uploadedSources so repeat calls push only new sources, and
   stays staggered (every 24) to avoid a synchronous upload spike on iOS. */
export async function uploadGearTextures(renderer) {
  if (!renderer) return;
  const up = (source) => {
    if (!source || _uploadedSources.has(source)) return false;
    try {
      if (renderer.texture && typeof renderer.texture.initSource === 'function') renderer.texture.initSource(source);
      else if (renderer.prepare && typeof renderer.prepare.upload === 'function') renderer.prepare.upload(source);
      else return false;
      _uploadedSources.add(source);
    } catch (e) { /* best-effort */ }
    return true;
  };
  let n = 0;
  for (const source of getLoadedGearSources()) {
    if (up(source) && ++n % 24 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  /* v2.3.2774: the combat stand-in strips are no longer in the Assets cache
     (they are cropped canvases now -- effectsRenderer _gearStripFrame); they
     reach this upload through getLoadedGearSources above, which they register
     with.  The old loop over combatGearUrls() found nothing to upload. */
}
