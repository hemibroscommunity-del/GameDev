/* ═══ v2.3.3271: A JOIN IS TOLD THE PLAYERS AROUND IT (the phone's half) ═══
 *
 * server/src/nearjoin.js has the whole story.  This phone joins with `nj: 1`
 * (beside presence v2's `pres: 2`), and against a worker that advertises
 * `caps.nearjoin` its snapshot (state_sync) holds the players AROUND it whole
 * and everyone else as a LIST ENTRY: what the lists show (name, colour, level,
 * clan, the inspect card's counters, the Hemi Bro picture and count) and
 * nothing of the look, marked `fa`.  So:
 *   - a list entry is PARKED at once (`parkFar`), as presence v2 parks a far
 *     player's copy (src/game/presence2.js): kept at least PARK_R from you by
 *     every frame's parkAway, past the minimap and every reach -- never drawn
 *     in a look they do not wear.  A `player_join` that comes as a list entry
 *     is parked the same way;
 *   - a tick's `pl` (id -> the whole entry the snapshot would have given) is
 *     applied BEFORE the tick's players (`applyPeerLooks`): the worker sends it
 *     on the tick that first sends that player to this phone whole -- they came
 *     around you, you came around them, you arrived somewhere -- so the tick
 *     that shows them shows them in their own look.  It brings where they are
 *     too, and unparks them.
 * Nothing else changes: the look relay (player_update) still reaches this
 * phone for every player, and their next whole one fills in a list entry's
 * look too (within about a minute and a half of a join).
 *
 * Against an older worker there is no `fa` and no `pl`, and nothing here runs.
 * Only presence2.js is imported (no imports of its own): node-tested by
 * server/test/near-join.test.mjs.
 */
import { parkAway } from './presence2.js';

/** Does this worker send near snapshots and looks (nearjoin.js)? */
export function nearJoinOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.nearjoin);
}

/** A list entry: no look yet, so out of sight at once. */
export function parkFar(S, o) {
  if (!o) return o;
  o._away = true;
  o._lookFar = true;
  o._vx = 0; o._vy = 0; o._smoothVx = 0; o._smoothVy = 0;
  parkAway(S, o);
  return o;
}

/** A tick's `pl`: each player's whole look (and place).  `build(data)` makes
    the peer object the snapshot road makes (wsClient.js `peerFromSnapshot`);
    a player already listed keeps everything else it carries (its position
    buffer, its jog's phase, its pet ...).  Returns how many were new. */
export function applyPeerLooks(S, pl, build) {
  if (!S || !pl || typeof pl !== 'object' || typeof build !== 'function') return 0;
  if (!S.others) S.others = Object.create(null);
  const others = S.others;
  let made = 0;
  for (const id of Object.keys(pl)) {
    /* ids from the worker's own table, but never write '__proto__' into the
       peer map (CLAUDE.md rule 4), and never yourself */
    if (id === S.myId || id === '__proto__') continue;
    const data = pl[id];
    if (!data || typeof data !== 'object') continue;
    const fresh = build(data);
    if (!fresh) continue;
    const o = Object.prototype.hasOwnProperty.call(others, id) ? others[id] : null;
    if (o) {
      Object.assign(o, fresh);
      if (o._posBuffer) o._posBuffer.length = 0;
    } else {
      others[id] = fresh;
      made++;
    }
    const p = others[id];
    p._away = false;
    p._lookFar = false;
    p._lastUpdate = Date.now();
  }
  return made;
}
