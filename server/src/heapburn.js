/* ═══ v2.3.3748: A BURNING HEAP SETS YOU ON FIRE ═══
 *
 * The owner, 2026-10-28: "if you stand in a burning pile of flames from a
 * building prop getting destroyed you get on fire and take damage (same flame
 * effect as the building)".
 *
 * A building's fire is on each phone's screen only (docs/specs/building-fire.md:
 * "the worker knows nothing of any of it"), but damage is the worker's.  So
 * the phone SAYS so: `heap_burn` (no fields), about once a second while your
 * boots stand in a burning piece of a fallen building's heap on its screen
 * (src/game/heapBurn.js).  The worker burns the SENDER, and only the sender:
 *   - in the world (zone 'wheel'), alive, on BroTown's ground (_wheelSafeAt:
 *     the town and its commons, where every building stands), not in a duel's
 *     or the arena's fight;
 *   - not while harvesting (no damage reaches a harvester, hits.js rule 3);
 *   - at most one tick every HEAP_BURN.EVERY_MS, however often it is asked;
 *   - HEAP_BURN.PCT of your max HP a tick (at least 1), flame damage (Elem
 *     Resist reads it), through the one door (hits.js, the `heap` row);
 *   - NEVER the last point: a tick takes at most your HP less 1, and none at
 *     1, so BroTown keeps no deaths and nothing is lost to a heap.
 * A phone that lies can only hurt itself: it names no one else, and a tick
 * pays no XP, no kill credit and no loot.  A phone that never says so spares
 * only itself.  So no test-mode exception (no honesty check).
 *
 * The tick is a monster_attack on you, `ability: 'heapburn'` (a tick, not a
 * blow, on the phone: game/elemHits.js isBurnTick), `elem: 'flame'`, its
 * attackerX/Y your own place.  Nothing is stored: the vitals' own coalesced
 * save (_saveRpgVitals), as every hit.
 *
 * `heapburn: false` in the live flags un-advertises it (caps.heapburn: the
 * phone sends nothing and draws no fire on you) and burns nobody.
 */

export const HEAP_BURN = Object.freeze({
  FLAG: 'heapburn',
  /* one tick a second at most */
  EVERY_MS: 1000,
  /* 3% of your max HP a tick: about half your bar standing in it 15 s */
  PCT: 0.03,
});

export const heapBurnMethods = {
  /* `heapburn: false` in the live flags */
  _heapBurnOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object'
      && Object.prototype.hasOwnProperty.call(f, HEAP_BURN.FLAG) && !f[HEAP_BURN.FLAG]);
  },

  /* `heap_burn` from session `session`: one tick of the heap's fire on its
     own player, or nothing.  Returns the HP it took (the tests). */
  _handleHeapBurn(session, now) {
    const pid = session && session.id;
    const ps = pid ? this.playerState[pid] : null;
    if (!ps || !this._heapBurnOn()) return 0;
    const t = typeof now === 'number' ? now : Date.now();
    if (ps.z !== 'wheel' || ps.dead || ps.dying || ps.disconnected || ps._spar) return 0;
    if (!(ps.hp > 1)) return 0;
    if (ps._arenaMatch || (this._duelFor && this._duelFor(pid))) return 0;
    if (!this._wheelSafeAt(ps.x, ps.y)) return 0;
    /* a harvester takes no damage, as from every monster (hits.js rule 3) */
    if (this._extractionShielded && this._extractionShielded(pid, t)) return 0;
    if (t - (ps._heapBurnAt || 0) < HEAP_BURN.EVERY_MS) return 0;
    ps._heapBurnAt = t;
    /* never the last point: held under what you have less 1, with room for
       anything that makes a blow land harder after it (a fracture's +6% a
       stack, five at most) */
    const raw = Math.min(Math.max(1, Math.ceil((ps.maxHp || 100) * HEAP_BURN.PCT)), Math.floor((ps.hp - 1) / 1.5));
    if (!(raw > 0)) return 0;
    return this._monsterHit({
      src: 'heap', zoneId: 'wheel', pid, m: null,
      mid: 'heap', lvl: 1, raw, now: t,
      /* the fire is under your feet: the number is drawn on you */
      at: { x: ps.x, y: ps.y },
      ability: 'heapburn',
      extra: { elem: 'flame' },
    });
  },
};
