/* THE SWORD'S SWING -- v2.3.5548 (grand plan step 4.2, the sword's reach;
 * card K PR 14; docs/specs/sword-swing.md).  OFF: the owner's to turn on
 * (`swordswing: true` in the live flags), since it changes how combat is
 * judged.
 *
 * The bench (claims-gain.test, `reach`) found the sword's claim worth 2.96
 * times an honest sword's take: a melee hit was believed from
 * PVE_MELEE_RANGE (400 px), on EACH monster every 210 ms (combat.js's lane),
 * where an honest sword swings once a cycle (600 ms, the Speed stat's cut)
 * at what its ring holds.  The reach alone was not the take: a liar held to
 * 250 px killed MORE (it stops spreading its hits), so this tightens both:
 *
 *   1. THE REACH: a sword's claim on a monster from at most REACH_PX (150)
 *      of the worker's own copy of the player (an honest swing lands at
 *      81 px at most on every disturbance of the bench).
 *   2. THE SWING: counted swings a player at the sword's own rate -- one a
 *      cycle (freeswing.js _fsCycleMs: 600 ms x the Speed cut, never under
 *      half), from an allowance of BURST_SWINGS, so two claims the network
 *      brought closer together than they were swung both land (a gap held
 *      to 0.7 of the cycle let a script swing 1.43 times as often: the
 *      bench's 1.62); a swing's other targets come within GROUP_MS of its
 *      first claim (the phone sends a ring's hits together), each once,
 *      SWING_TARGETS at most.
 *      A claim sooner, or a target the swing already took, is dropped
 *      quietly (counted: `swing` in /api/admin/overview's hit proof).
 *
 *   3. THE SHOVE: a sword's claim never opts out of its shove (`noKb`:
 *      only a bow's chips and a volley's later arrows send it; no page's
 *      sword does) -- combat.js.
 *
 * Left as they are: a paid special swing, the lunge (its own path), a phone
 * on the free-swing trial (its swings are prorated by time already:
 * freeswing.js), a test-mode character, and every bow and staff claim.
 * NOTHING IS PERSISTED: `_ss` lives on the player state (handoff rule 1).
 */
export const SWORD_SWING = Object.freeze({
  /* GS_OUTER_RADIUS 72 (the blade's ring) + a monster's body, and the
     network's lag on top: an honest swing lands at 81 px at most on every
     disturbance of the bench (claims-gain.test 2d), so 150 is nearly twice
     what honest play needs */
  REACH_PX: 150,
  BURST_SWINGS: 2,   /* the allowance's top: a swing, and one the network delayed */
  GROUP_MS: 150,
  SWING_TARGETS: 24,   /* a whirlwind pulls 16 (HIT_PROOF.MELEE_SPECIAL_MAX) */
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const swordSwingMethods = {
  /* an opt-in, off: only `swordswing: true` turns it on */
  _swordSwingOn() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'swordswing') && f.swordswing === true);
  },
  /* the sword's reach the worker believes */
  _swordReach() {
    return this._swordSwingOn() ? SWORD_SWING.REACH_PX : this.PVE_MELEE_RANGE;
  },
  /* May this sword claim on monster `id` land now?  Counts it. */
  _swordSwingTake(ps, id, now) {
    if (!ps) return true;
    const s = ps._ss || (ps._ss = { at: -Infinity, ids: null, tokens: SWORD_SWING.BURST_SWINGS, t: now });
    const key = String(id);
    if (now - s.at <= SWORD_SWING.GROUP_MS) {
      if (s.ids.has(key) || s.ids.size >= SWORD_SWING.SWING_TARGETS) return false;
      s.ids.add(key);
      return true;
    }
    const cyc = this._fsCycleMs(ps);
    s.tokens = Math.min(SWORD_SWING.BURST_SWINGS, s.tokens + Math.max(0, now - s.t) / cyc);
    s.t = now;
    if (s.tokens < 1) return false;
    s.tokens -= 1;
    s.at = now;
    s.ids = new Set([key]);
    return true;
  },
};
