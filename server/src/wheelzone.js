/* ═══ v2.3.2978: THE WHEEL'S MONSTERS — zone 'wheel' ═══
 *
 * Owner, 2026-10-02: "can you place the monsters where they belong in their
 * zones (on the ends closest to the central map)?"
 *
 * The Wheel is the one seamless map (docs/WORLD-MAP-PIPELINE.md), still a
 * client-side trial behind `?trial=wheel`.  Until now a trial player stood in
 * 'worldview' -- the safe hub, no monsters -- sharing that zone id with every
 * ordinary World View player on a different map.  The Wheel is its own zone
 * now, 'wheel', and each of today's eight element zones brings its own spawn
 * list here, unchanged (the same archetypes, counts, levels and stats,
 * through the same _makeZoneMonster), standing at the INNER end of that
 * element's spoke: its levels 1-5, just past the safe commons.  Where exactly
 * comes from the plan, baked into server/src/wheelspawns.js by
 * tools/world/bake-wheel-spawns.mjs -- the server has no copy of the map and
 * must never build one (the plan is ~1 s and 13 MB).
 *
 * WHAT IS DIFFERENT IN 'wheel', AND WHY
 *   - No zone config (_getZoneConfig('wheel') is null, like the hubs').  Every
 *     consumer already guards on that: knockback/pull/burrow clamps skip (a
 *     43,008 px zone has no edge to clamp to), the population scaler skips
 *     (spawnscale.js _spawnScalableZone), nodes skip (gathering.js) -- so no
 *     resource nodes are scattered over the sea, and fishing waits for its own
 *     round.  Not in ZONES either, so ZONES stays "the zones the server spawns"
 *     and every ZONES-wide rule (PvP needs ZONES[z].lawless) fails closed here.
 *   - Each monster carries `home`, the element zone it belongs to.  Its
 *     element, skin (variant) and stats come from home; so do its REWARDS
 *     (_rewardZone): a shard named after 'wheel' is not an item, and "kill 5
 *     in Frost Ridge" should count a snowman killed on Frost Ridge's spoke.
 *   - The commons and Brotown are SAFE GROUND (_wheelSafeAt: within
 *     WHEEL_SAFE_R of the centre, baked with the places): nobody standing on
 *     it is a target (index.js, target acquisition), a monster that steps on
 *     it gives up its chase, and no monster's hit lands on it
 *     (_monsterStrikePlayer).  An ordinary zone's monsters can never reach
 *     town -- it is another zone; the Wheel's town is the same zone.
 *   - A chase also gives up WHEEL.CHASE_LEASH from home (index.js, the chase
 *     branch): an ordinary zone's edge ends a chase, and the Wheel has none.
 *   - A player hears only about the monsters within WHEEL.INTEREST_R
 *     (tick.js, _wheelInterest): ~85 KB a second of far monsters' moves
 *     otherwise.  Only in 'wheel', only for v2 sessions (no v1 client knows
 *     the zone), and only the monster deltas: players, events and nodes ride
 *     the tick exactly as in any zone.
 *   - A ranged hit must be within WHEEL.RANGED_MAX of its monster (combat.js).
 *     Ordinary zones have no ranged gate because a whole zone is in range
 *     anyway; the Wheel is forty zones across.
 *
 * KILL SWITCH (lower case, TRAPS §117): `wheelmonsters: false` in liveflags
 * un-advertises caps.wheelmonsters (join.js spreads the flags over the caps),
 * so a client that joins after it keeps the Wheel on 'worldview' as before;
 * and a Wheel spawned after it is empty.  A Wheel already spawned keeps its
 * monsters until the room restarts (no tick polls the flag).
 */
import { ZONES } from './data.js';
import { WHEEL_SPAWNS, WHEEL_CENTRE, WHEEL_SAFE_R } from './wheelspawns.js';

export const WHEEL_ZONE = 'wheel';

export const WHEEL = Object.freeze({
  /* the eight lands that bring monsters, in their spokes' order */
  HOMES: Object.freeze(['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant']),
  /* a chase ends this far (px) from the monster's own spawn point: about
     two of today's zones' chases.  It does NOT keep the commons safe on its
     own -- the places stand ~180-320 px from WHEEL_SAFE_R, so a 720 px chase
     ran ~400 px into the commons (mp-wheelmonsters' fight picture);
     _wheelSafeAt does that */
  CHASE_LEASH: 720,
  /* a ranged or staff hit lands only this close (px): a maxed bow plants at
     1,350 px and its stuck arrow chips for 4 s while you kite at up to
     ~441 px/s -- 3,600 covers both and still stops a shot from across the map */
  RANGED_MAX: 3600,
  /* A player in the Wheel hears only about the monsters within INTEREST_R
     (tick.js, through _wheelInterest), and keeps hearing about one until it
     is past INTEREST_OUT, so a step back across the line does not drop and
     resend it.  An ordinary zone's every monster is within a screen or two of
     you; the Wheel's 48 are spread over 43,008 px, and telling everyone about
     all of them, 45 times a second, was ~44 messages and ~85 KB a second to a
     player standing in Brotown's square, every one about monsters 3,000 px
     away (mp probe).  INTEREST_R is wider than any view's half-diagonal plus
     the client's FAR_MARGIN (~1,800 px on a wide desktop), so a monster's
     state is fresh before it can be drawn. */
  INTEREST_R: 2400,
  INTEREST_OUT: 2800,
});

export const wheelzoneMethods = {
  _wheelMonstersOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheelmonsters') && !f.wheelmonsters);
  },

  /* Each home's spawn list, at its baked places on its spoke, built exactly as
     in its own zone.  Level: _makeZoneMonster reads depth from y / zone height,
     so each monster is built at a stand-in point in its home zone's own frame
     whose depth is the place's depth in its band (inner end shallow, outer end
     deep), then moved to its place on the Wheel. */
  _wheelSpawnMonsters() {
    if (this._wheelMonstersOff()) return [];
    const out = [];
    for (const home of WHEEL.HOMES) {
      const zone = ZONES[home], at = WHEEL_SPAWNS[home];
      if (!zone || !zone.spawns || !at || !Array.isArray(at.points) || !at.points.length) continue;
      const H = zone.h * this.TILE, W = zone.w * this.TILE;
      let k = 0;
      for (const spawn of zone.spawns) {
        for (let c = 0; c < (spawn.count || 0); c++, k++) {
          const p = at.points[k % at.points.length];
          const depth = Math.max(0, Math.min(1, Number(p[2]) || 0));
          const m = this._makeZoneMonster(home, zone, spawn, 'wm-' + home + '-' + k, W / 2, 128 + depth * (H - 256));
          if (!m) continue;
          m.x = m.spawnX = p[0];
          m.y = m.spawnY = p[1];
          m.home = home;
          out.push(m);
        }
      }
    }
    return out;
  },

  /* Whether (x, y) is the Wheel's safe ground: the commons and the town, every
     land cell of which lies within WHEEL_SAFE_R of the centre (baked).  Only
     ever asked about zone 'wheel'. */
  _wheelSafeAt(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') return false;
    const dx = x - WHEEL_CENTRE[0], dy = y - WHEEL_CENTRE[1];
    return dx * dx + dy * dy < WHEEL_SAFE_R * WHEEL_SAFE_R;
  },

  /* Which of the Wheel's monsters this session hears about this tick
     (tick.js): `seen`, the ones in reach, and `entered`, the ones that came
     into reach since the last tick -- sent whole that tick, dirty or not, so
     none is ever drawn where it stood when it was last in reach.  Kept on the
     session; tick.js drops it when the session is anywhere else, so coming
     back re-sends every one in reach.  Monster ids are server-minted. */
  _wheelInterest(session, ps, monsters) {
    const prev = session._wheelSeen || null;
    const seen = new Set(), entered = new Set();
    const rIn2 = WHEEL.INTEREST_R * WHEEL.INTEREST_R, rOut2 = WHEEL.INTEREST_OUT * WHEEL.INTEREST_OUT;
    for (const m of monsters) {
      const dx = m.x - ps.x, dy = m.y - ps.y, d2 = dx * dx + dy * dy;
      const had = !!(prev && prev.has(m.id));
      if (d2 <= rIn2 || (had && d2 <= rOut2)) {
        seen.add(m.id);
        if (!had) entered.add(m.id);
      }
    }
    session._wheelSeen = seen;
    return { seen, entered };
  },

  /* The zone a kill pays out for: a Wheel monster's home, everywhere else the
     zone it died in.  `home` is server-authored (above), never client data. */
  _rewardZone(zone, m) {
    const h = m && typeof m.home === 'string' ? m.home : null;
    return h && Object.prototype.hasOwnProperty.call(ZONES, h) ? h : zone;
  },
};
