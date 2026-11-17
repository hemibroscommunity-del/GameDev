/* ═══ v2.3.3704: THE ARMOUR YOU WEAR IS THE LAST TO GO ═══
 *
 * The body baked under your armour (entityRenderer's masked bake) is kept for
 * every frame you can be drawn in -- each pose, all eight facings -- and, in
 * spare time, for the sets ONE EQUIP AWAY (a piece in your bag put on over
 * what you wear: prewarmAltWornSets, v2.3.2873), so putting it on never
 * stutters.  The cache holds 900 frames (MASKED_CAP).  v2.3.2873 added a third
 * spare set and v2.3.3577 the flipped facings to every set (a picture of their
 * own for a player with a pattern or a drawing on), so such a player owning
 * pieces of two metals asks for more than 900: the spare bakes went on into
 * play, every insert letting go of the least recently DRAWN frame -- and the
 * frames of the armour you wear in a facing you had not faced lately went
 * first.  Jogging that way then drew the plain body under the plate, a frame
 * here and a frame there, while each was baked again (the owner's "Northwest
 * jog has trouble loading reloading textures after recovering from black
 * screen": mp-wornbake, 177 of 177 of the worn set held, then 137, and 20 of
 * 26 looks north-east and north-west the plain body).
 *
 * So the frame let go of is the least recently drawn of any OTHER armour --
 * a spare set's, another player's, an old look's -- and only when every frame
 * held is the worn set's, the least recently drawn of those.
 *
 * A key is `uid|worn|dilate` (entityRenderer _maskedKey), `worn` the pieces in
 * the order every worn list is built, `chest:<id>,legs:<id>`.  No imports but
 * the lanes' table (v2.3.5231: itself none but the page's reader): the
 * server's suites run it in node (worn-bake.test.mjs). */
import { laneKnob, onKnob } from '../game/drawLanes.js';

/* the worn set as a key spells it, from the slots' worn ids */
export function wornSigOf(chest, legs) {
  const out = [];
  if (chest && chest !== 'none') out.push('chest:' + chest);
  if (legs && legs !== 'none') out.push('legs:' + legs);
  return out.join(',');
}

/* which key to let go of: `keys` least recently drawn first (a Map's order,
   a hit moving its key to the back), `wornSig` what you wear */
export function pickEvictKey(keys, wornSig) {
  let first;
  for (const k of keys) {
    if (first === undefined) first = k;
    const s = String(k), a = s.indexOf('|'), b = s.lastIndexOf('|');
    if (s.slice(a + 1, b) !== wornSig) return k;
  }
  return first;
}

/* ═══ v2.3.5231 (card O PR 11): THE CAP IS A SHARE OF ITS OWN ═══
   The lanes' `caches` knob (drawLanes.js): 1, or 0.5 on the memory axis's
   first rung (a full memory: the report's count over the memory check's
   lines, framePacer.js).  A rung taken trims at once (onCachesTrim): the
   frames let go of are picked as ever (pickEvictKey: the least recently
   drawn of any armour but yours), each dropped as entityRenderer drops it
   (destroyed 30 s on, so a sprite still showing one re-points first); a
   frame let go of is baked again when it is drawn.  Given back, the cap is
   its own. */
/** The cap now: `cap` (MASKED_CAP) times the lanes' share, at least 1. */
export function maskedCap(cap) {
  let v = 1;
  try { v = Number(laneKnob('caches')); } catch (e) { v = 1; }
  return Math.max(1, Math.round(cap * (v > 0 && v <= 1 ? v : 1)));
}
/** Let go of frames until the cache is at its cap now: `evictKey()` names
 *  the one to go, `drop(old)` lets its texture go. */
export function trimMasked(cache, cap, evictKey, drop) {
  const c = maskedCap(cap);
  while (cache.size > c) {
    const k = evictKey();
    const old = cache.get(k);
    cache.delete(k);
    try { drop(old); } catch (e) { /* gone */ }
  }
}
/** fn() runs when the share moves (a memory rung taken or given back). */
export function onCachesTrim(fn) {
  try { onKnob('caches', () => { try { fn(); } catch (e) { /* the next bake trims */ } }); } catch (e) { /* no lanes: the whole cap */ }
}
