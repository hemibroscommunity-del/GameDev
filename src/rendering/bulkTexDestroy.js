/* ═══ v2.3.5011: MANY TEXTURES OF ONE PICTURE LET GO OF IN ONE PASS ═══
 *
 * Pixi's Texture listens to its source's 'resize' (Texture.source's setter:
 * source.on('resize', this.update, this)), and its destroy() takes that
 * listener off again: source.off('resize', ...).  The source is an
 * eventemitter3 emitter, whose removeListener REBUILDS the event's whole list
 * of listeners, minus the one, as a new array -- every time, found or not.
 * A look's frames are Textures over a shared sheet or a look atlas page
 * (lookPalette.js lookSheetTexture), and a page carries the frames of every
 * look drawn from it: thousands of listeners.  So the look sweep, letting go
 * of an idle look's frames one destroy() at a time, rebuilt a list of
 * thousands once per frame let go of: work and garbage that grow as the
 * square of the frames, inside the frame that drew (lookFrames sweeps as it
 * is asked).  The page's allocation profile (heldsweep's stations with the
 * heap sampler, 2026-11-13) put it first in a fight: 15.3 MB of garbage in
 * 26 s from this one path (eventemitter3 removeListener < Texture.destroy <
 * the sweep), and 2.1 MB riding through the town.
 *
 * destroyTextures(list): the textures grouped by source; each source's
 * 'resize' list rebuilt ONCE without them; then each destroyed while that
 * source's off() is a no-op (the listener is already gone), so destroy()
 * does all it did (the 'destroy' event, its own listeners cleared, `destroyed`)
 * without the rebuild.  The source is never destroyed (destroy(false)), as
 * before.  Where the emitter is not the shape this reads (eventemitter3's
 * `_events`, one listener object or an array of them, no prefix), each is
 * destroyed the plain way, as before.
 *
 * No imports, so node can test it (server/test/bulk-tex-destroy.test.mjs).
 */

const noOff = function noOff() { return this; };

/* the source's 'resize' listeners without the dying textures', in one pass;
   false when the emitter is not the shape this reads */
function detach(src, dying) {
  const ev = src && src._events;
  if (!ev || typeof ev !== 'object' || ev['~resize']) return false;
  const L = ev.resize;
  if (!L) return true;   /* nobody listens: destroy()'s off() finds nothing */
  const gone = (l) => !!l && dying.has(l.context) && typeof l.fn === 'function' && l.fn === l.context.update;
  if (!Array.isArray(L)) {
    if (typeof L.fn !== 'function') return false;
    if (gone(L)) src.removeAllListeners('resize');   /* eventemitter3's own clear (its count kept right) */
    return true;
  }
  const keep = [];
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (!l || typeof l.fn !== 'function') return false;
    if (!gone(l)) keep.push(l);
  }
  if (keep.length === L.length) return true;
  if (!keep.length) src.removeAllListeners('resize');
  else ev.resize = keep.length === 1 ? keep[0] : keep;   /* as removeListener leaves it */
  return true;
}

/** Destroy these textures (never their source), each source's listener list
 *  rebuilt once rather than once a texture.  Returns how many were destroyed. */
export function destroyTextures(list) {
  const bySrc = new Map();
  let n = 0;
  for (const t of list) {
    if (!t || t.destroyed) continue;
    const s = t._source || null;
    let g = bySrc.get(s);
    if (!g) bySrc.set(s, (g = []));
    g.push(t);
  }
  for (const [src, group] of bySrc) {
    const quiet = !!src && detach(src, new Set(group));
    if (!quiet) {
      for (const t of group) { try { t.destroy(false); n++; } catch (e) { /* gone */ } }
      continue;
    }
    /* the listeners are gone: destroy() without its off() rebuilding the list */
    const own = Object.prototype.hasOwnProperty.call(src, 'off');
    const was = own ? src.off : undefined;
    src.off = noOff;
    try {
      for (const t of group) { try { t.destroy(false); n++; } catch (e) { /* gone */ } }
    } finally {
      if (own) src.off = was; else delete src.off;
    }
  }
  return n;
}
