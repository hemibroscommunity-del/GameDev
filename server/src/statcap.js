/* ═══ v2.3.3578: NO CAP ON HOW MANY POINTS A STAT HOLDS ═══
 *
 * The owner, asked about the Points window's per-stat bound ("why are you
 * capped at only adding a certain amount of points in any one stat allocation
 * category? I don't like that very much"), then: "Remove stat cap."
 *
 * Until now a stat held at most your character level in points, and the four
 * damage stats (Power, Luck, Special, Element) twice it -- the §6-C bound
 * (PROGRESSION-REDESIGN), kept through the curve (v2.3.2680: "keep per level
 * limit on those 3", Defense, Dodge and Resist).  Now any stat takes every
 * point you have to spend on it.
 *
 * What keeps one stat from breaking the game is what each point buys, never a
 * count:
 *   - the curve stats (Defense, Dodge, Resist, Move, Range, Speed, Luck,
 *     Power, Special, Element) read max x q/(q+k): every point buys a little
 *     less than the one before, and none ever reaches its `max` (Dodge heads
 *     for 90 %, Move for +35 %);
 *   - Dodge and Defense together never let less than PROG3.FLOOR (10 %) of a
 *     base hit through (combat.js _applyDamage);
 *   - the block ladders stop at ten blocks (abilities.js BLOCKS).
 * Max HP, Stamina and Mana are pools and stay linear: a point is a point.
 *
 * THE POOLS' 100 IS LIFTED TOO.  Max HP, Stamina and Mana kept a hard `cap` of
 * 100 points in the stat table (PROG3.BODY), under the level bound; with the
 * bound gone a character past level 33 (100 shared points) could meet it, so
 * it is 999 now, the curve stats' storage bound.  With this switch off both
 * come back as they were: the level bound, and 100 on the three pools
 * (STAT_CAP.WAS).  A worker before v2.3.3578 (a rollback) reads a pool placed
 * past 100 as 100, its old storage bound -- reachable only past level 33.
 *
 * A point already placed is never taken back (the free reset gives them all
 * back, pointsreset.js), and nothing is stored differently: the switch only
 * decides whether the next point is taken.  The phone greys its [+] where the
 * worker would refuse (src/data/prog3.js prog3StatCap) against caps.nostatcap,
 * which is this switch: an older worker still keeps the bound, and the phone
 * keeps it with that worker.
 *
 * Kill switch `nostatcap: false` in the live flags: the level bound again
 * (and caps.nostatcap false, so the phone greys [+] at it again). */

export const STAT_CAP = Object.freeze({
  FLAG: 'nostatcap',   /* the live flag; `false` brings the per-level bound back */
  /* the pools' storage bound before v2.3.3578, back with the switch off.
     MIRROR: src/data/prog3.js STAT_CAP_WAS (mirror-audit) */
  WAS: Object.freeze({ hp: 100, stam: 100, mana: 100 }),
});

export const statCapMethods = {
  /* v2.3.3578: on unless the live flags say `nostatcap: false` */
  _statCapFree() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object'
      && Object.prototype.hasOwnProperty.call(f, STAT_CAP.FLAG) && !f[STAT_CAP.FLAG]);
  },

  /* The most points `stat` may hold for `ps` (`def` its PROG3 row): the row's
     storage bound alone, or with the switch off the §6-C bound as it was --
     character level, twice it on the damage stats (`lvlBound`), and the
     pools' old 100. */
  _prog3StatBound(ps, stat, def) {
    const store = (def && def.cap) || 0;
    if (this._statCapFree()) return store;
    const was = Object.prototype.hasOwnProperty.call(STAT_CAP.WAS, stat) ? STAT_CAP.WAS[stat] : store;
    const level = (ps && ps.level) || this._prog3CharLevel(ps);
    return Math.min(store, was, level * ((def && def.lvlBound) || 1));
  },
};
