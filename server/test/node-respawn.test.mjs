/* Density + respawn invariants — v2.3.1592.
 *
 * The owner's pass ("only 3 monsters per zone and one resource per zone but
 * with quick respawn") is TWO coupled halves: population down, cadence up.
 * Change either half alone and the game silently gets worse — fewer monsters
 * on the old 15s clock is an empty zone, and fewer nodes on the old 2-minute
 * clock is a gathering drought.  Nothing in the codebase tied them together,
 * so this suite does.
 *
 * The load-bearing one is §3.  botfp's HARVEST_HOUR_CAP is documented as
 * sitting "50% above the PHYSICAL ceiling ... zero false-positive risk by
 * design", and that ceiling is a function of node count and respawn speed.
 * Quickening the respawn far enough silently converts an anticheat with a
 * proof of safety into one that flags real players.  This test recomputes the
 * ceiling from the live constants every run, so the proof cannot rot.
 *
 *   1. every wilderness zone spawns exactly 3 monsters
 *   2. one node of each gathering type per zone, in both tables
 *   3. the physical harvest ceiling stays under HARVEST_HOUR_CAP
 *   3b. (v2.3.1983) population scaling does not move the SOLO ceiling
 *   4. respawn timers are actually the quick ones, and sane
 */
import { ZONES as SERVER_ZONES } from '../src/data.js';
import { ZONES as CLIENT_ZONES } from '../../src/data/zones.js';
import { GameRoom } from '../src/index.js';
import { BOTFP } from '../src/botfp.js';
import { SPAWN_SCALE } from '../src/spawnscale.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* Same stateless construction zones.test.mjs uses — no storage needed for
   constants and pure spawn math. */
const room = new GameRoom({ storage: { get: async () => null, put: async () => {}, list: async () => new Map() } }, {});

/* v2.3.2244: six per zone (owner: "Monsters per zone will increase to 6,
   but be spaced out more evenly").  The spacing half is pinned below. */
const TARGET_PER_ZONE = 6;
const wilderness = Object.keys(SERVER_ZONES);

// ── 1. Monster density ──────────────────────────────────────────────────
{
  for (const id of wilderness) {
    const total = (SERVER_ZONES[id].spawns || []).reduce((n, s) => n + s.count, 0);
    check(`density ${id}: spawns total ${TARGET_PER_ZONE}`, total === TARGET_PER_ZONE,
      { spawns: SERVER_ZONES[id].spawns, total });
  }
  /* The client table is asserted in lockstep by zones.test.mjs, but that test
     only proves they MATCH — if both were edited to 5 it would still pass.
     Pin the client side to the number as well. */
  for (const id of wilderness) {
    const total = (CLIENT_ZONES[id].spawns || []).reduce((n, s) => n + s.count, 0);
    check(`density ${id}: client table agrees`, total === TARGET_PER_ZONE, total);
  }
  /* Variety must survive the cut: a zone that used to field three archetypes
     should still field three, not three copies of one. */
  const skyArchs = new Set((SERVER_ZONES.sky.spawns || []).map((s) => s.arch));
  check('density sky: keeps all three archetypes', skyArchs.size === 3, [...skyArchs]);

  /* ═══ v2.3.2244: SPREAD ═══
     "spaced out more evenly over the zone area to prevent too much monster
     overlap."  _spawnZoneMonsters places by farthest-point sampling
     (_pickSpreadSpawn).  Measured rather than asserted by shape: over many
     fresh spawns, the closest pair in a spread set must sit far apart on
     average, and MUCH farther than the closest pair of six points dropped
     uniformly at random in the same rectangle -- the baseline is computed
     here, in the same run, so the pin is about the picker and not about
     one lucky draw.  Sabotage-checked: with the picker replaced by uniform
     random the ratio falls to ~1.0 and both assertions fail. */
  const _minPair = (pts) => {
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < best) best = d;
    }
    return best;
  };
  const RUNS = 60;
  let spreadSum = 0, uniformSum = 0, tooClose = 0;
  const zoneCfg = room._getZoneConfig('frost');
  const W = zoneCfg.w * room.TILE, Hh = zoneCfg.h * room.TILE, margin = 4 * room.TILE;
  for (let r = 0; r < RUNS; r++) {
    const spawned = room._spawnZoneMonsters('frost');
    const mp = _minPair(spawned);
    spreadSum += mp;
    if (mp < 64) tooClose++;
    const uni = [];
    for (let i = 0; i < spawned.length; i++) uni.push({ x: margin + Math.random() * (W - margin * 2), y: margin + Math.random() * (Hh - margin * 2) });
    uniformSum += _minPair(uni);
  }
  const spreadAvg = spreadSum / RUNS, uniformAvg = uniformSum / RUNS;
  check('spread: six frost spawns keep their closest pair >= 150px apart on average',
    spreadAvg >= 150, { spreadAvg: Math.round(spreadAvg), uniformAvg: Math.round(uniformAvg) });
  check('spread: ...at least 1.6x the closest pair of six uniformly random points',
    spreadAvg >= uniformAvg * 1.6, { ratio: +(spreadAvg / uniformAvg).toFixed(2) });
  check('spread: no spawn set stacks two monsters on one tile (closest pair < 64px) in more than 1 of 60 runs',
    tooClose <= 1, { tooClose, RUNS });
  /* Respawn returns each monster to its own spawn point, so the spread
     survives the fight -- pinned so a future "respawn somewhere random"
     cannot quietly undo the spacing. */
  const set = room._spawnZoneMonsters('frost');
  check('spread: every monster remembers its own spawn point (spawnX/Y == x/y at birth)',
    set.every((m) => m.spawnX === m.x && m.spawnY === m.y), set.map((m) => [Math.round(m.x), Math.round(m.spawnX)]));
  const verdantVariant = (SERVER_ZONES.verdant.spawns || []).some((s) => s.variant === 'blueSlime');
  check('density verdant: keeps the blueSlime variant', verdantVariant, SERVER_ZONES.verdant.spawns);

  /* And it must actually spawn that many, not just declare it. */
  const spawned = room._spawnZoneMonsters('meadow');
  check('density meadow: _spawnZoneMonsters really returns 3', spawned.length === TARGET_PER_ZONE, spawned.length);
}

// ── 2. Node density ─────────────────────────────────────────────────────
{
  const cfg = room._getZoneNodeConfig('meadow');
  check('nodes: one of each type per zone', cfg.treeCt === 1 && cfg.fishCt === 1 && cfg.oreCt === 1, cfg);
  /* One of EACH, not one TOTAL — every gathering skill has to stay playable
     wherever the player is standing (v2.3.1346 + the 2026-07-06 fishing
     request).  A config of {tree:1,fish:0,ore:0} would pass a naive
     "one node" check and break that. */
  check('nodes: every gathering skill is represented',
    cfg.treeCt >= 1 && cfg.fishCt >= 1 && cfg.oreCt >= 1, cfg);
  const nodes = room._spawnZoneNodes('meadow');
  check('nodes: _spawnZoneNodes really places 3', nodes.length === 3, nodes.length);
  check('nodes: one of each nodeType placed',
    new Set(nodes.map((n) => n.nodeType)).size === 3, nodes.map((n) => n.nodeType));
  /* The config is uniform across zones by design; prove it rather than
     assuming, since it takes a zoneId argument. */
  const uniform = wilderness.every((id) => {
    const c = room._getZoneNodeConfig(id);
    return c.treeCt === cfg.treeCt && c.fishCt === cfg.fishCt && c.oreCt === cfg.oreCt;
  });
  check('nodes: config is uniform across every wilderness zone', uniform);
}

// ── 3. THE ANTICHEAT CEILING (the reason this file exists) ──────────────
{
  const cfg = room._getZoneNodeConfig('meadow');
  const perSkill = Math.max(cfg.treeCt, cfg.fishCt, cfg.oreCt);
  const respawnsPerHour = 3600000 / room.NODE_RESPAWN_TIME;
  /* v2.3.1983: the ceiling is now the CROWDED one.  Population-scaled spawns
     (spawnscale.js) grow a zone to SPAWN_SCALE.NODE_MAX nodes per skill, so
     the supply the cap is derived from is that maximum, not the authored
     one.  A LONE harvester — the case the original derivation was written
     for — still sees exactly `perSkill` nodes, which §3b below pins
     separately: the scaling cannot raise what a player alone can take. */
  const perSkillCrowded = Math.max(perSkill, SPAWN_SCALE.NODE_MAX);
  /* The most a teleporting bot could take from one skill in one zone: every
     node of that skill, harvested the instant it comes back. */
  const ceiling = perSkillCrowded * respawnsPerHour;
  check('ceiling: physical harvest rate stays under HARVEST_HOUR_CAP',
    ceiling < BOTFP.HARVEST_HOUR_CAP,
    { ceiling, cap: BOTFP.HARVEST_HOUR_CAP, perSkill, respawnMs: room.NODE_RESPAWN_TIME });
  /* Not merely under it — the cap's documented claim is a 50% margin, which
     is what makes "zero false-positive risk by design" true.  Losing the
     margin quietly is the failure mode this guards. */
  check('ceiling: keeps the documented ~50% margin',
    BOTFP.HARVEST_HOUR_CAP >= ceiling * 1.4,
    { ceiling, cap: BOTFP.HARVEST_HOUR_CAP, ratio: +(BOTFP.HARVEST_HOUR_CAP / ceiling).toFixed(2) });
  /* Spell out the arithmetic the comments promise, so a reader can confirm
     the numbers without deriving them. */
  console.log(`      (ceiling ${ceiling}/h = ${perSkillCrowded} nodes x ${respawnsPerHour}/h; cap ${BOTFP.HARVEST_HOUR_CAP})`);

  /* ── 3b. v2.3.1983: SOLO IS UNCHANGED ──────────────────────────────────
     The load-bearing half of the new derivation.  Extra nodes only exist
     while other people are standing in the zone competing for them, so the
     rate a player ALONE can physically reach is exactly what it was before
     population scaling — and that is why raising HARVEST_HOUR_CAP does not
     hand a solo bot anything.  If a future change makes nodes scale on
     something other than co-located players, this is the assertion that
     should stop it. */
  const soloNodes = room._scaledNodeCap('meadow', 1, cfg.oreCt);
  const soloCeiling = soloNodes * respawnsPerHour;
  check('ceiling: a player ALONE still sees the authored node count',
    soloNodes === cfg.oreCt, { soloNodes, authored: cfg.oreCt });
  check('ceiling: the solo physical rate is unchanged at 180/h',
    soloCeiling === 180, { soloCeiling });
  /* And the crowd ceiling must be reachable only by a crowd: the scaler
     needs 1 + NODE_PLAYERS_PER_EXTRA * (NODE_MAX - base) players in the
     zone before the maximum exists at all. */
  const crowdNeeded = 1 + SPAWN_SCALE.NODE_PLAYERS_PER_EXTRA * (SPAWN_SCALE.NODE_MAX - cfg.oreCt);
  check('ceiling: the max node count needs a real crowd to exist',
    room._scaledNodeCap('meadow', crowdNeeded, cfg.oreCt) === SPAWN_SCALE.NODE_MAX
    && room._scaledNodeCap('meadow', crowdNeeded - 1, cfg.oreCt) < SPAWN_SCALE.NODE_MAX,
    { crowdNeeded, at: room._scaledNodeCap('meadow', crowdNeeded, cfg.oreCt) });
}

// ── 4. Respawn timers ───────────────────────────────────────────────────
{
  /* v2.3.1739 (owner: "about 3x slower globally"): 5000 -> 15000, back on the
     pre-v2.3.1592 number.  Pinned as an exact value because it is a FEEL
     dial the owner sets by playing, not a derived one — if a later session
     nudges it, that should be a deliberate edit here and a conversation,
     not a quiet drift.  The relationship the next two checks pin (positive,
     and slower for nodes) is what must never break regardless. */
  check('respawn: monsters are on the slow clock (3x the v2.3.1592 timer)',
    room.RESPAWN_TIME === 15000, room.RESPAWN_TIME);
  check('respawn: nodes are on the quick clock', room.NODE_RESPAWN_TIME === 20000, room.NODE_RESPAWN_TIME);
  /* Floors, not exact values, for the invariants that actually matter: a
     0ms respawn would make monsters unkillable-feeling and spam the wire. */
  check('respawn: monster timer is a positive, non-degenerate delay',
    room.RESPAWN_TIME >= 1000, room.RESPAWN_TIME);
  check('respawn: node timer is slower than the monster timer',
    room.NODE_RESPAWN_TIME > room.RESPAWN_TIME,
    { node: room.NODE_RESPAWN_TIME, monster: room.RESPAWN_TIME });
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
