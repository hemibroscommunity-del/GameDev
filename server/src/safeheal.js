/* ═══ v2.3.3569: BROTOWN'S SAFE GROUND HEALS YOU AS THE OLD TOWN DID ═══
 *
 * The owner, on the first-30-minutes estimate's second risk
 * (docs/specs/first-30-minutes.md): "Yes standing on the safe ground should
 * heal you quickly."
 *
 * The old town (zone 'town') is a HUB to the regen tick (index.js
 * _tickPlayerRegen): 10% of each bar a tick (~670 ms), full in about 7 s.  The
 * world (zone 'wheel', since v2.3.2990) is one zone, so its BroTown was the
 * wilds to the tick: nothing for 6 s after a fight, then 1% of your HP a tick,
 * about 67 s from empty to full.  A player back at the Mayor from the slimes
 * stayed half dead for a minute; the Hotel's rest (v2.3.3539) fills you, but
 * nothing tells a new player it is there.
 *
 * Now the Wheel's SAFE GROUND (wheelzone.js _wheelSafeAt: the commons and the
 * town) heals as a hub does -- the hub's own branch, the same 10% of HP,
 * stamina and mana -- but only OUT OF A FIGHT, which the old town never needed:
 * it had no monsters, and the safe ground can have one you provoked following
 * you onto it (v2.3.3056).  So:
 *   - nothing taken or dealt for SPOKE_REGEN_OOC_MS (6 s): the wilds' own "out
 *     of a fight", so the hub's pace starts exactly where the trickle would
 *     have, and a fight at the town's edge heals nobody faster;
 *   - not in a duel or an arena match: the hub's own gates (v2.3.1126,
 *     v2.3.1613: a heal that outruns the damage makes a fight unendable).  Town
 *     still tops stamina and mana off in a duel; here none of the three is,
 *     since the Wheel never did and a duel stays as it was;
 *   - stamina not topped off during Lil Bro's race (race.js, run on the town
 *     square: its sprint was tuned against the wilds' refill, RACE's "THE
 *     NUMBERS");
 *   - a phone out of step with the room's Wheel (wheeltables.js _wheelInStep)
 *     stands somewhere else on its own map: no heal.
 * The pools are the worker's, and the phone's bar climbs as the echo comes
 * (entityRenderer's climbing heal holds it up), so nothing new goes on the
 * wire and there is no caps flag.  The write is the regen tick's own,
 * coalesced to REGEN_SAVE_MS (handoff rule 4): no row more than the trickle.
 *
 * Kill switch `safeheal: false` in the live flags: the wilds' trickle again.
 */

export const SAFE_HEAL = Object.freeze({
  FLAG: 'safeheal',   /* the live flag; `false` turns it off */
});

export const safeHealMethods = {
  /* v2.3.3569: `safeheal: false` in the live flags */
  _safeHealOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object'
      && Object.prototype.hasOwnProperty.call(f, SAFE_HEAL.FLAG) && !f[SAFE_HEAL.FLAG]);
  },

  /* Does the regen tick heal `ps` at the hub's pace right now, standing on the
     Wheel's safe ground?  `inDuel` is the tick's own answer (_duelFor). */
  _safeHealHere(ps, now, inDuel) {
    if (!ps || ps.z !== 'wheel') return false;
    if (this._safeHealOff()) return false;
    if (ps._arenaMatch || inDuel) return false;
    if (this._wheelInStep && !this._wheelInStep(ps)) return false;
    if (!this._wheelSafeAt(ps.x, ps.y)) return false;
    const quiet = this.SPOKE_REGEN_OOC_MS;
    return (now - (ps.lastDamageAt || 0)) > quiet
      && (now - (ps._lastDealtAt || 0)) > quiet;
  },

  /* ...and is a race of Lil Bro's on (its countdown included)?  Its stamina is
     the race's.  race.js clears ps._race at the finish or on a late move; one
     left standing past its end time no longer counts. */
  _safeHealRacing(ps, now) {
    const r = ps && ps._race;
    return !!(r && typeof r.endBy === 'number' && now <= r.endBy);
  },
};
