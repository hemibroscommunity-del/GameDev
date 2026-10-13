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
 *     (spawnscale.js _spawnScalableZone), and the random node layout skips
 *     (gathering.js) -- so no resource nodes are scattered over the sea.  Its
 *     nodes are baked instead, since v2.3.3012 (_wheelSpawnNodes, below).
 *     Not in ZONES either, so ZONES stays "the zones the server spawns"
 *     and every ZONES-wide rule (PvP needs ZONES[z].lawless) fails closed here.
 *   - Each monster carries `home`, the element zone it belongs to.  Its
 *     element, skin (variant) and stats come from home; so do its REWARDS
 *     (_rewardZone): a shard named after 'wheel' is not an item, and "kill 5
 *     in Frost Ridge" should count a snowman killed on Frost Ridge's spoke.
 *   - The commons and Brotown are SAFE GROUND (_wheelSafeAt: within
 *     WHEEL_SAFE_R of the centre, baked with the places): nobody standing on
 *     it is a target (index.js, target acquisition), a monster that steps on
 *     it gives up its chase, and no monster's hit lands on it
 *     (_monsterStrikePlayer).  Since v2.3.3056 it shelters no one from a monster
 *     they PROVOKED -- hurt it, and still fighting (_wheelSheltered,
 *     WHEEL.PROVOKE_MS / PURSUE_LEASH).  An ordinary zone's monsters can never reach
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
 *
 * ═══ v2.3.3013: AND PAST LEVEL 5 ═══
 * The owner said yes to "monsters past level 5": each land's first stage runs
 * levels 1-20, a tier (one zone of walking, five levels) at a time, and only
 * its first tier had monsters.  Now its next three do too -- levels 6-10,
 * 11-15 and 16-20, up to the first pass and the camp at level 20 -- each the
 * land's own spawn list again (the same archetypes, skins and element), at
 * that tier's baked places (WHEEL_SPAWNS[home].deeper), at the tier's levels:
 * 6 at its inner end, 10 at its outer, by the place's depth in its band.
 * Every stat comes from the one copy of the math (_makeZoneMonster, given the
 * level), so a level-15 snowman is exactly what a level-15 snowman's zone
 * would build.  8 lands x 3 tiers x 6 = 144 more, 192 in all; ids
 * `wm-<home>-t<tier>-<k>`, the first tier's 48 unchanged and first in the
 * list.  `wheeldeep: false` in liveflags leaves a Wheel spawned after it with
 * the first tier's 48 alone.  The client shows such a monster's own level
 * (monsterVariants.js applyZoneVariant clamped it to its home's 1-2).
 *
 * ═══ v2.3.3093: AND PAST LEVEL 20 ═══
 * The owner: "build the world past level 20 (levels 21-40 in each land with
 * their own monsters and resources) You can just recolor existing monsters for
 * now for placeholder monsters".  A land's second stage -- tiers 5-8, levels
 * 21-40, past the first pass and the camp at 20 -- has the land's spawn list
 * again per tier, exactly as tiers 2-4 do: nothing here changed but the bake
 * (tools/world/bake-wheel-spawns.mjs SPAWN_RULES.deep.tiers, 2..8), since
 * this loop was always one per baked tier.  8 lands x 4 tiers x 6 = 192 more,
 * 384 in all.  The game draws them in their stage's colour and name
 * (src/data/wheelStageLooks.js), a sprite tint on the look the land already
 * has, so nothing new loads.  `wheelpast20: false` in liveflags leaves a Wheel
 * spawned after it with the first stage alone.
 */
import { ZONES } from './data.js';
import { WHEEL_SPAWNS, WHEEL_NODES, WHEEL_CENTRE, WHEEL_SAFE_R } from './wheelspawns.js';

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
  /* ═══ v2.3.3056: A MONSTER YOU HIT MAY FOLLOW YOU ONTO SAFE GROUND ═══
     Owner, 2026-10-05: "make it so monsters can still chase you out of their
     zones.  I was sitting in a safe zone just sniping mummies with magic and
     they couldn't attack."  Safe ground (_wheelSafeAt) shelters a player from
     every monster -- except one that player has hurt (m.dmgByPlayer) while
     they are still fighting: they dealt damage within PROVOKE_MS (the sticky
     aggro's own 10 s, combat.js).  Such a monster keeps its target on safe
     ground, may step onto it, and its blows land there; its chase reaches
     PURSUE_LEASH from home instead of CHASE_LEASH (the first stretch's places
     stand 184-915 px outside the safe edge, so 720 could not even reach it).
     Ten seconds without dealing any damage and the shelter is back, the
     monster gives up and walks home.  Never provoked, never chased: the
     commons stay safe for everyone who is not fighting from them.
     `wheelpursue: false` in liveflags puts the old rule back (_wheelPursueOff). */
  PROVOKE_MS: 10000,
  PURSUE_LEASH: 1800,
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
  /* v2.3.3195: the side of _wheelMonsterGrid's squares: half INTEREST_OUT,
     so a player's reach covers at most 5 x 5 of them */
  GRID_CELL: 1400,
  /* v2.3.3012: WHEEL_NODES' kind letters, and the only gathering tiers a baked
     node may carry -- the three gathering.js _harvestNameForTier names */
  NODE_TYPES: Object.freeze({ o: 'oreVein', t: 'tree', f: 'fishSpot' }),
  /* v2.3.3093: the tiers of a land's first stage (levels 1-20); the
     `wheelpast20` switch keeps the Wheel to them */
  FIRST_STAGE_TIERS: 4,
  /* v2.3.3094: + 16 and 21, the second stage's (levels 21-30, 31-40) */
  NODE_TIERS: Object.freeze([1, 6, 11, 16, 21]),
});

/* v2.3.3201: a square's key is a NUMBER, cx * GRID_KEY + cy (unique while
   |cy| < 2^20), where it was the string 'cx,cy' -- up to 25 strings made and
   looked up for every Wheel player every tick, and then a sort calling a
   comparator, were two thirds of this search's cost in the load test's
   profile.  A square past GRID_LIM (a position no Wheel has) sends the
   search back to the full walk, so no two squares can ever share a key. */
const GRID_KEY = 2 ** 21;
const GRID_LIM = 2 ** 20 - 2;
const gridKeyOk = (cx, cy) => cx >= -GRID_LIM && cx <= GRID_LIM && cy >= -GRID_LIM && cy <= GRID_LIM;
/* the indices found, reused from call to call (read before the next call) */
let nearIdx = new Int32Array(512);
/* v2.3.3212: `entered` when nothing entered -- shared, never written to */
const NO_ENTERED = new Set();

/* v2.3.3195: the indices of the monsters in the grid squares within `r` of
   (x, y) on both axes, in the monsters' own order.  v2.3.3201: written into
   `nearIdx`, and the count returned -- sorted as numbers by the typed array's
   own sort (no comparator), the same order; -1 when the grid cannot answer
   (the full walk does).  A position that is not finite reaches nothing, as
   the full walk's distance test says. */
function wheelGridNear(grid, x, y, r) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const C = WHEEL.GRID_CELL;
  const x0 = Math.floor((x - r) / C), x1 = Math.floor((x + r) / C);
  const y0 = Math.floor((y - r) / C), y1 = Math.floor((y + r) / C);
  if (!gridKeyOk(x0, y0) || !gridKeyOk(x1, y1)) return -1;
  let n = 0;
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const c = grid.cells.get(cx * GRID_KEY + cy);
      if (c === undefined) continue;
      if (n + c.length > nearIdx.length) {
        const bigger = new Int32Array(Math.max(nearIdx.length * 2, n + c.length));
        bigger.set(nearIdx.subarray(0, n));
        nearIdx = bigger;
      }
      for (let k = 0; k < c.length; k++) nearIdx[n++] = c[k];
    }
  }
  if (n > 1) nearIdx.subarray(0, n).sort();
  return n;
}

/* v2.3.3212: wheelGridNear's answer for a block of squares, kept on the grid
   for the tick it was built in (tick.js builds a new grid every tick), so the
   players standing in the same squares ask once.  A copy, as nearIdx is
   reused; null when the grid cannot answer (the full walk does). */
function wheelGridNearKept(grid, x, y, r) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return EMPTY_IDX;
  const C = WHEEL.GRID_CELL;
  const x0 = Math.floor((x - r) / C), x1 = Math.floor((x + r) / C);
  const y0 = Math.floor((y - r) / C), y1 = Math.floor((y + r) / C);
  if (!gridKeyOk(x0, y0) || !gridKeyOk(x1, y1)) return null;
  const kept = grid.near || (grid.near = new Map());
  const key = x0 + ',' + y0 + ',' + x1 + ',' + y1;
  let idx = kept.get(key);
  if (idx === undefined) {
    const n = wheelGridNear(grid, x, y, r);
    if (n < 0) return null;
    idx = nearIdx.slice(0, n);
    kept.set(key, idx);
  }
  return idx;
}
const EMPTY_IDX = new Int32Array(0);

export const wheelzoneMethods = {
  _wheelMonstersOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheelmonsters') && !f.wheelmonsters);
  },
  /* v2.3.3056: `wheelpursue: false` -- safe ground shelters everyone again */
  _wheelPursueOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheelpursue') && !f.wheelpursue);
  },
  /* v2.3.3056: has player `pid` provoked monster `m` -- hurt it this life, and
     dealt damage (to anything) within WHEEL.PROVOKE_MS?  (ps._lastDealtAt is
     stamped by every player->monster damage path: combat, abilities, the
     arrow blast, the burst.) */
  _wheelProvokedBy(m, pid, now) {
    if (!m || !pid || this._wheelPursueOff()) return false;
    const ps = this.playerState[pid];
    if (!ps || !(now - (ps._lastDealtAt || 0) < WHEEL.PROVOKE_MS)) return false;
    const by = m.dmgByPlayer;
    return !!(by && Object.prototype.hasOwnProperty.call(by, pid) && by[pid] > 0);
  },
  /* v2.3.3056: does the safe ground shelter player `pid` at (x, y) from
     monster `m`?  Off safe ground: never.  On it: unless they provoked `m` --
     or, with no monster in hand (a burn ticking, a fire trail), unless they
     are still fighting at all. */
  _wheelSheltered(m, pid, x, y, now) {
    if (!this._wheelSafeAt(x, y)) return false;
    if (this._wheelPursueOff()) return true;
    if (m) return !this._wheelProvokedBy(m, pid, now);
    const ps = pid ? this.playerState[pid] : null;
    return !(ps && now - (ps._lastDealtAt || 0) < WHEEL.PROVOKE_MS);
  },
  /* v2.3.3093: `wheelpast20: false` -- no monsters past level 20 */
  _wheelPast20Off() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheelpast20') && !f.wheelpast20);
  },
  /* v2.3.3013: `wheeldeep: false` -- the first tier's monsters only */
  _wheelDeepOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheeldeep') && !f.wheeldeep);
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
    /* v2.3.3013: the stretches past the first, after all of the first's (so
       those 48 keep their places in the list): each land's spawn list again
       per tier, at the tier's own levels.  The stand-in point is irrelevant
       here -- the level is given -- so it is the home zone's middle. */
    if (this._wheelDeepOff()) return out;
    for (const home of WHEEL.HOMES) {
      const zone = ZONES[home], at = WHEEL_SPAWNS[home];
      if (!zone || !zone.spawns || !at || !Array.isArray(at.deeper)) continue;
      const H = zone.h * this.TILE, W = zone.w * this.TILE;
      for (const st of at.deeper) {
        if (!st || !Array.isArray(st.points) || !st.points.length || !Array.isArray(st.levels)) continue;
        /* v2.3.3093: `wheelpast20: false` -- the first stage's alone (levels
           1-20), every land's second stage (tiers 5-8) left empty */
        if (Number(st.tier) > WHEEL.FIRST_STAGE_TIERS && this._wheelPast20Off()) continue;
        const lo = Number(st.levels[0]) || 1, hi = Number(st.levels[1]) || lo;
        let k = 0;
        for (const spawn of zone.spawns) {
          for (let c = 0; c < (spawn.count || 0); c++, k++) {
            const p = st.points[k % st.points.length];
            const depth = Math.max(0, Math.min(1, Number(p[2]) || 0));
            const m = this._makeZoneMonster(home, zone, spawn, 'wm-' + home + '-t' + st.tier + '-' + k, W / 2, H / 2,
              Math.round(lo + depth * (hi - lo)));
            if (!m) continue;
            m.x = m.spawnX = p[0];
            m.y = m.spawnY = p[1];
            m.home = home;
            m.tier = st.tier;   /* server-side only: the serializers name their fields */
            out.push(m);
          }
        }
      }
    }
    return out;
  },

  /* v2.3.3013: the Wheel's monster<->monster separation (index.js, the end of
     _tickMonsters): the same push as every zone's -- two live monsters' feet
     within `minSep` are pushed half the overlap each apart -- found by a sweep
     along x instead of every pair.  The Wheel's monsters stand in tens of
     small groups across 43,008 px, so all but a handful of the ~18,000 pairs
     are thousands of px apart; sorted by x, a monster is checked only against
     the next ones within `minSep` of it in x, and nothing else can be within
     `minSep` of it at all.  No depth scaling: 'wheel' has no depth row
     (depth.js zoneDepthK is 1 here), so the flat ring is the ring. */
  _wheelSeparate(zoneId, monsters, minSep) {
    const live = [];
    for (const m of monsters) if (m.alive) live.push(m);
    live.sort((a, b) => a.x - b.x);
    const s2 = minSep * minSep;
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      for (let j = i + 1; j < live.length; j++) {
        const b = live[j];
        const dx = b.x - a.x;
        if (dx >= minSep) break;
        const dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= s2 || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const push = (minSep - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        this._markMonsterDirty(zoneId, a.id);
        this._markMonsterDirty(zoneId, b.id);
      }
    }
  },

  /* ═══ v2.3.3012: THE WHEEL'S RESOURCES ═══
     Owner: "Add harvestable resources back to the wheel" -- tiered by how far
     from town they grow ("Copper can be in the safe areas around town ...
     Iron can be in lvl 1 monster areas ... 'black steel' in like level 10+
     areas ... Same principle for fishing and wood cutting too").
     Their places are baked from the plan with the monsters' (WHEEL_NODES,
     tools/world/bake-wheel-spawns.mjs): the commons' at gathering tier 1
     (copper, pine, minnow), each land's levels 1-10 at tier 6 (iron,
     softwood, clownfish) and 11-20 at tier 11 (black steel, hardwood,
     trout).  Built exactly like any zone's nodes (gathering.js
     _placeGatherNode's shape), with `home`: the land whose shard a harvest
     can drop -- none in the commons, which belongs to no element.
     KILL SWITCH (lower case, TRAPS §117): `wheelnodes: false` in liveflags
     un-advertises caps.wheelnodes and a Wheel whose nodes are spawned after
     it has none; ones already spawned stay until the room restarts, as the
     monsters' do. */
  _wheelNodesOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wheelnodes') && !f.wheelnodes);
  },

  _wheelSpawnNodes() {
    if (this._wheelNodesOff() || !WHEEL_NODES) return [];
    const out = [];
    for (const area of Object.keys(WHEEL_NODES)) {
      const list = WHEEL_NODES[area];
      if (!Array.isArray(list)) continue;
      const home = Object.prototype.hasOwnProperty.call(ZONES, area) ? area : null;
      for (let k = 0; k < list.length; k++) {
        const p = list[k];
        const nodeType = WHEEL.NODE_TYPES[p && p[0]];
        if (!nodeType || typeof p[1] !== 'number' || typeof p[2] !== 'number') continue;
        out.push({
          id: 'wn-' + area + '-' + k,
          nodeType,
          x: p[1], y: p[2],
          tierLvl: WHEEL.NODE_TIERS.includes(p[3]) ? p[3] : 1,
          alive: true,
          respawnAt: 0,
          ...(home ? { home } : {}),
        });
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
  /* v2.3.3195: `grid` (optional) is _wheelMonsterGrid's index of the same
     monsters, built once a tick by tick.js: only the cells within
     INTEREST_OUT of the player are walked, in the monsters' own order, so the
     answer is exactly the full walk's -- a monster in any other cell is more
     than INTEREST_OUT away on one axis, and both tests below refuse it.
     `list` is the seen monsters in that order, so tick.js no longer filters
     all of them a second time per player.  Before, every Wheel player walked
     all 384 monsters every tick, twice (the load test's profile,
     docs/specs/load-test.md). */
  /* ═══ v2.3.3212: THE SAME ANSWER, A THIRD OF THE WORK ═══
     The stress test's profile of the real runtime at 120 players: this was
     the room's biggest single cost after building and sending the ticks,
     ~145 ms of every second of its thread (in process: ~110 ms, more than the
     whole tick's own building).  Every Wheel player, every tick, it made two
     Sets, an array and a closure, looked every candidate up in last tick's
     set (by its string id) before knowing whether it was even near, and asked
     the grid for the same squares as everyone standing near them.  Now:
       - the distance first: a candidate past INTEREST_OUT (about half of the
         5 x 5 squares' worth) is dropped before any set is touched;
       - the session's two sets are used in turn, and its list kept (`seen`
         and `list` are read only within the tick that made them: tick.js),
         and `entered` is made only when something enters (one shared empty
         set otherwise, never written to);
       - the grid's answer for a block of squares is kept for the tick
         (`grid.near`), so the players standing in the same squares -- the
         town -- ask once.
     The answer is exactly the old one: tick-share.test.mjs §5 holds it to a
     copy of the code before, tick after tick, monster for monster, in order. */
  _wheelInterest(session, ps, monsters, grid) {
    const prev = session._wheelSeen || null;
    const bufs = session._wheelBufs || (session._wheelBufs = [new Set(), new Set()]);
    const seen = bufs[0] === prev ? bufs[1] : bufs[0];
    seen.clear();
    const list = session._wheelList || (session._wheelList = []);
    list.length = 0;
    let entered = NO_ENTERED;
    const rIn2 = WHEEL.INTEREST_R * WHEEL.INTEREST_R, rOut2 = WHEEL.INTEREST_OUT * WHEEL.INTEREST_OUT;
    const px = ps.x, py = ps.y;
    /* one pixel past INTEREST_OUT: a monster on a square's edge is never
       lost to rounding, and the distance test below still decides */
    const near = (grid && grid.monsters === monsters && grid.cells)
      ? wheelGridNearKept(grid, px, py, WHEEL.INTEREST_OUT + 1) : null;
    const n = near ? near.length : monsters.length;
    for (let k = 0; k < n; k++) {
      const m = near ? monsters[near[k]] : monsters[k];
      const dx = m.x - px, dy = m.y - py, d2 = dx * dx + dy * dy;
      if (d2 > rOut2) continue;   /* in reach of nobody's rule: never a set lookup */
      const had = prev !== null && prev.has(m.id);
      if (d2 <= rIn2 || (had && d2 <= rOut2)) {
        seen.add(m.id);
        list.push(m);
        if (!had) {
          if (entered === NO_ENTERED) entered = new Set();
          entered.add(m.id);
        }
      }
    }
    session._wheelSeen = seen;
    return { seen, entered, list };
  },

  /* v2.3.3195: the Wheel's monsters by GRID_CELL square, as array indices in
     array order -- built once a tick (tick.js), for _wheelInterest */
  _wheelMonsterGrid(monsters) {
    const cells = new Map();
    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      const cx = Math.floor(m.x / WHEEL.GRID_CELL), cy = Math.floor(m.y / WHEEL.GRID_CELL);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;   /* a NaN position is never in reach */
      /* v2.3.3201: a number for a key (GRID_KEY); a square no Wheel has
         leaves the grid unusable, and _wheelInterest walks them all */
      if (!gridKeyOk(cx, cy)) return { monsters, cells: null };
      const k = cx * GRID_KEY + cy;
      let c = cells.get(k);
      if (!c) cells.set(k, c = []);
      c.push(i);
    }
    return { monsters, cells };
  },

  /* The zone a kill pays out for: a Wheel monster's home, everywhere else the
     zone it died in.  `home` is server-authored (above), never client data. */
  _rewardZone(zone, m) {
    const h = m && typeof m.home === 'string' ? m.home : null;
    return h && Object.prototype.hasOwnProperty.call(ZONES, h) ? h : zone;
  },
};
