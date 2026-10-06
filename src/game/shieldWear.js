/* ═══ v2.3.3091: TELL THE WORKER WHICH SHIELD IS ON YOUR ARM ═══
 *
 * Asked "Shields and outfits in no man's land?", the owner said "Yes".  A
 * spare shield stayed in your bag on a No man's land loss because putting a
 * shield on was a purely local move here (R.shield <-> R.shieldStash), so the
 * worker could not tell the one on your arm from a spare.  Now every change
 * of the arm -- and the arm as it is on every join -- is reported:
 *
 *   shield_wear { gid }         a recorded piece, by its id
 *   shield_wear { sig }         a piece from before the ledger, by the
 *                               signature both sides use for it
 *   shield_wear { none: true }  nothing on the arm
 *
 * and the worker (server/src/shieldwear.js) keeps `ps.shield` as the shield
 * WORN, `ps.shieldStash` as the ones carried.  Only against a worker that
 * advertises caps.shieldwear: an older one has no case for the type and would
 * rebroadcast it to the room.  No imports, so node can test it. */

/** The shield's signature (wsClient.js `_shSig`, gearstash.js stashSig). */
export function shieldSig(p) {
  return p && typeof p === 'object' ? [p.name || '', p.gearBase || '', p.tierMult == null ? '' : p.tierMult, p.tier || ''].join('|') : '';
}

/** What to report for the bag `R`'s arm. */
export function shieldWearPayload(R) {
  const sh = R && R.shield && typeof R.shield === 'object' ? R.shield : null;
  if (!sh) return { none: true };
  if (typeof sh.gid === 'string' && sh.gid) return { gid: sh.gid };
  return { sig: shieldSig(sh) };
}

/** Report the arm of `S.rpg` to the worker, if it can hear it.  Returns the
 *  payload sent, or null. */
export function syncShieldWorn(S) {
  if (!S || !S.rpg || !S.channel || !(S._serverCaps && S._serverCaps.shieldwear)) return null;
  const payload = shieldWearPayload(S.rpg);
  try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { return null; }
  /* QA (mp-nomansland), armed by the harness only: the last report */
  if (typeof window !== 'undefined' && window.__btProbe) window.__btShieldWear = { at: Date.now(), payload };
  return payload;
}
