/* ═══ v2.3.4416: WHO STILL HOLDS A PICTURE ═══
 *
 * Three streamed-art caches on the phone let a picture go at the wrong time
 * (the state-machine sweep of 2026-11-03, V17b):
 *
 *   - a Wheel monster look shares one sprite module with another (the rock
 *     golem and the thorn shambler, the Poison Forest's two rotcaps).
 *     Letting one go asked only whether the other was near THIS tick, not
 *     whether it was still held: the module was unloaded while the other
 *     stayed 'ready' over freed art, drawn as a stand-in, or with a dead
 *     texture that can throw the whole frame (R6-5);
 *   - a Wheel object page whose download failed stayed 'failed' for as long
 *     as you stood within ~1,000 px of it: its buildings invisible and
 *     walk-through for the visit, never asked for again (R11-1);
 *   - another player who left the room took their cook, fire and trait
 *     sprites with them, but not the three gear sprites (legs, shirt,
 *     plate), which stayed hidden in the gesture layer until a renderer
 *     rebuild (R4-15).
 *
 * No imports (the server's suites run these in node, where there is no Pixi:
 * server/test/art-holds.test.mjs). */

/** Does a look other than `k` that is still HELD in `looks` (a Map, look id
 *  -> { state }), loading or ready, draw from the same art (`same(q)`)?
 *  A 'failed' one holds nothing: it is asked for again on its own clock. */
export function heldBySibling(k, looks, same) {
  for (const [q, e] of looks) {
    if (q === k || !e || e.state === 'failed') continue;
    if (same(q)) return true;
  }
  return false;
}

/** How long a Wheel object page that failed to download stays failed before
 *  it is let go, so the next look round asks for it again. */
export const PAGE_RETRY_MS = 5000;

/** Should page record `rec` ({ state, wanted, failedAt }) be let go now?
 *  One still loading never; one that failed once PAGE_RETRY_MS has passed,
 *  near or not (then asked for again); any other once nothing of it has
 *  been near (`kept` false) for `dropMs`. */
export function pageDropDue(rec, kept, now, dropMs) {
  if (!rec || rec.state === 'loading') return false;
  if (rec.state === 'failed' && now - (rec.failedAt || 0) >= PAGE_RETRY_MS) return true;
  return !kept && now - rec.wanted > dropMs;
}

/** The sprites of a peer's pool entry (effectsRenderer's _remoteSkillSprites)
 *  that go when the peer leaves the room: the gestures and their drawings,
 *  the head traits, and the gear worn over them.  The farmer is its own
 *  (_destroyPeerFarmer). */
export function peerEntSprites(ent) {
  const out = [];
  if (!ent) return out;
  for (const f of ['chop', 'cook', 'cookInk', 'fire', 'fireInk']) if (ent[f]) out.push(ent[f]);
  if (ent.traits) for (const k in ent.traits) if (ent.traits[k]) out.push(ent.traits[k]);
  if (ent.gear) for (const k in ent.gear) if (ent.gear[k]) out.push(ent.gear[k]);
  return out;
}
