/* ═══ v2.3.4453: THE CHEST ON A RISE PAYS, ONCE A CHARACTER (docs/specs/rise-chest.md) ═══
 *
 * The owner, 2026-11-09: "I'm thinking of how I can make elevation changes in
 * brotown ... The character has a 'double jump' feature and I think it would
 * be cool to have some elevation and obstacle areas where that can be put to
 * use."  The first slice (v2.3.3994, docs/ELEVATION-PLAN.md) was the Lagoon
 * Islet behind `?climb=1`: swim out, climb the vines up the terrace, flip up
 * the taller ledge, and a chest that said "Empty for now".  Asked where the
 * first public obstacle area goes and what its prize is, the owner,
 * 2026-11-10: "Go recommended" -- the islet, for everyone, and its chest a
 * real prize.  This is the prize.
 *
 * WHAT THE WORKER CHECKS, AND WHAT IT DOES NOT.
 *   It checks WHERE YOU ARE: your feet (the worker's own copy of your place,
 *   which only ever travels as fast as the move budget lets it: movement.js)
 *   on the chest's own rise and within reach of the chest's baked box
 *   (wheelfaces.js, written from the plan by tools/world/bake-wheel-spawns.mjs
 *   and held to it by test-world-core).  And ONCE: the payment and its stamp
 *   are _creditPlayer's one run (handoff rules 4' and 5: `oplog:` under the
 *   op id below), so a second ask, a retry or a second tab is 'got'.
 *   It does NOT check that you jumped.  ELEVATION-PLAN's "(a) the worker
 *   learns the faces" was a movement clip, and reading the code for it found
 *   two things: the worker never moves a phone back (a move past its budget
 *   is FOLLOWED, never refused: TRAPS §203), so a clip only holds the
 *   worker's COPY behind a face while the phone walks on -- and an honest
 *   player whose jump relay was dropped (the relay bucket drops silently)
 *   would be the one left behind; and the jump itself is the phone's word
 *   (`player_jump`: its time, its height, its flip), which an app changed
 *   enough to walk through a face can simply say.  So a clip would cost the
 *   honest and stop nobody who meant it.  The prize is small and once; the
 *   place and the once are what a worker can hold.  A rise where MONSTERS
 *   fight (a ledge nothing can reach you on) is a different question, and
 *   that is when the clip is worth building.
 *
 * `risechest: false` in the live flags is the kill switch: the cap goes (the
 * phone's chest says "Empty for now" again) and an ask is answered 'off'.
 */
import { WHEEL_FACES, WHEEL_FACES_LONG } from './wheelfaces.js';
import { WHEEL_ZONE } from './wheelzone.js';

export const RISE_CHEST = {
  /* the phone opens a chest its feet are within this of (src/game/climb.js CHEST_REACH) */
  REACH_PX: 36,
  /* ...and the worker's copy of you is a move behind the phone */
  SLACK_PX: 30,
  /* a move carries the body's place, not the boots' (TRAPS §113, §127): the
     Wheel's drop from one to the other (bake-wheel-spawns.mjs: "the 52 px drop
     to the boots") */
  FEET_DY: 52,
  /* how far off the rise's own top the copy's feet may be and still be "on it" */
  TOP_SLACK_PX: 12,
  /* the prize, coins, by the rise's id (a number every player reads in the
     chest's own words, so it is not a hidden setting) */
  /* v2.3.4456: the Town Bluff's is the small one -- a minute from the square, where a new
     character starts with 50 */
  COINS: { 'lagoon-ledge': 300, 'bluff-ledge': 100 },
};

/** The rise with this id that has a chest, or null. */
export function riseWithChest(id) {
  for (let i = 0; i < WHEEL_FACES.length; i++) {
    const r = WHEEL_FACES[i];
    if (r.id === id && r.chest) return r;
  }
  return null;
}

/** Are feet at (fx, fy) at this rise's chest: on the rise's top (its box less
 *  its face, a little slack) and within reach of the chest's box? */
export function feetAtRiseChest(r, fx, fy) {
  if (!r || !r.chest) return false;
  const T = RISE_CHEST.TOP_SLACK_PX;
  const topY1 = r.face ? r.face[1] : r.box[3];   /* the top ends where the face begins */
  if (fx < r.box[0] - T || fx > r.box[2] + T || fy < r.box[1] - T || fy > topY1 + T) return false;
  const c = r.chest, reach = RISE_CHEST.REACH_PX + RISE_CHEST.SLACK_PX;
  const dx = fx < c[0] ? c[0] - fx : fx > c[2] ? fx - c[2] : 0;
  const dy = fy < c[1] ? c[1] - fy : fy > c[3] ? fy - c[3] : 0;
  return dx * dx + dy * dy <= reach * reach;
}

export const riseChestMethods = {
  /* `risechest: false` in the live flags: the kill switch (off only when written false) */
  _riseChestOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'risechest') && !f.risechest);
  },
  /* the cap: on, and this room plays the Wheel the faces were baked for */
  _riseChestOn() {
    if (this._riseChestOff()) return false;
    try { return this._wheelLongNow() === WHEEL_FACES_LONG && WHEEL_FACES.some((r) => !!r.chest); } catch (e) { return false; }
  },
  _riseChestSend(pid, payload) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'rise_chest', payload })); } catch (e) { /* the answer only: the payment is on file */ }
  },

  /* ═══ rise_chest_open {id} (index.js's router) ═══
     Answers `rise_chest {id, ok: true, coins}` or `{id, ok: false, why}`:
       'off'   the switch, or a Wheel with no rises;
       'none'  no such chest;
       'far'   your feet are not at it;
       'got'   this character has had it. */
  async _handleRiseChest(session, msg) {
    const pid = session && session.id;
    const ps = pid && this.playerState[pid];
    if (!ps) return;
    const p = (msg && msg.payload) || msg || {};
    const id = typeof p.id === 'string' ? p.id.slice(0, 40) : '';
    if (!this._riseChestOn()) { this._riseChestSend(pid, { id, ok: false, why: 'off' }); return; }
    const r = riseWithChest(id);
    const coins = r ? Math.floor(Number(RISE_CHEST.COINS[r.id]) || 0) : 0;
    if (!r || !(coins > 0)) { this._riseChestSend(pid, { id, ok: false, why: 'none' }); return; }
    if (ps.z !== WHEEL_ZONE || ps.dead || typeof ps.x !== 'number' || typeof ps.y !== 'number'
        || !feetAtRiseChest(r, ps.x, ps.y + RISE_CHEST.FEET_DY)) {
      this._riseChestSend(pid, { id, ok: false, why: 'far' });
      return;
    }
    /* once a character: _creditPlayer reads the stamp and pays with it in one
       run (inbox.js); a second ask finds the stamp */
    const res = await this._creditPlayer(pid, {
      opId: 'risechest:' + pid + ':' + r.id,
      source: 'risechest', kind: 'gold', payload: { amount: coins },
      note: 'The chest on ' + (r.name || 'the ledge'),
    });
    if (res === 'dup') { this._riseChestSend(pid, { id, ok: false, why: 'got' }); return; }
    this._riseChestSend(pid, { id, ok: true, coins });
  },
};
