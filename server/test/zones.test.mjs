/* Zone-band + monster-scaling parity test — v2.3.1144 (follow-up to the
 * v2.3.1140 BF-1 fix + zone unpin).
 *
 * The zone tables and the HP curve are DUPLICATED (client
 * src/data/zones.js + gameSystems.js MONSTER_HP_CURVE, server
 * src/data.js) with a keep-in-sync obligation that until now was
 * enforced by convention only — and had drifted twice (client sky
 * carried an extra fodder spawn; server _monsterStat ceiled differently
 * past L30).  This suite is the permanent tripwire:
 *   1. client/server zone lockstep: bands, spawns, dimensions, element
 *   2. MONSTER_HP_CURVE lockstep (client <-> server copies)
 *   3. band sanity (guards the `zone.level[1] || 10` fallback)
 *   4. client/server monsterStat parity across the phase boundaries
 *      (the closed-form rewrite must ceil at L30/L65 like the client)
 *   5. curve lock: brute L35 HP === 99 — the binding INV-03 audit point
 *      on the 1.052 ramp; a drive-by constant change fails loudly here
 *   6. spawn levels stay inside the zone band
 */
import { ZONES as CLIENT_ZONES } from '../../src/data/zones.js';
import { monsterStat, createMonster, MONSTER_HP_CURVE as CLIENT_CURVE } from '../../src/data/gameSystems.js';
import { ZONES as SERVER_ZONES, MONSTER_HP_CURVE as SERVER_CURVE, VALID_ZONE_IDS, DUNGEON_ZONE_RE } from '../src/data.js';
import { GameRoom } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

// ── 1. Client/server zone lockstep for the 9 wilderness zones ──
{
  const serverIds = Object.keys(SERVER_ZONES);
  check('lockstep: server table covers exactly the 9 wilderness zones',
    serverIds.length === 9 && serverIds.every((id) => CLIENT_ZONES[id]), serverIds);
  for (const id of serverIds) {
    const c = CLIENT_ZONES[id], s = SERVER_ZONES[id];
    check(`lockstep ${id}: level band matches`,
      c.level[0] === s.level[0] && c.level[1] === s.level[1],
      { client: c.level, server: s.level });
    check(`lockstep ${id}: spawns match (arch+count+order)`,
      JSON.stringify(c.spawns || []) === JSON.stringify(s.spawns || []),
      { client: c.spawns, server: s.spawns });
    check(`lockstep ${id}: dimensions + element match`,
      c.w === s.w && c.h === s.h && (c.element || null) === (s.element || null),
      { client: [c.w, c.h, c.element], server: [s.w, s.h, s.element] });
  }
}

// ── 2. MONSTER_HP_CURVE lockstep ──
{
  check('lockstep: MONSTER_HP_CURVE matches client <-> server',
    JSON.stringify(CLIENT_CURVE) === JSON.stringify(SERVER_CURVE),
    { client: CLIENT_CURVE, server: SERVER_CURVE });
}

// ── 3. Band sanity ──
{
  for (const [id, z] of Object.entries(CLIENT_ZONES)) {
    if (z.safe || id === 'worldview') {
      check(`bands: hub ${id} stays [0,0]`, z.level[0] === 0 && z.level[1] === 0, z.level);
    } else {
      // Wilderness: 1 <= lo <= hi <= 100, hi truthy — a 0/undefined max
      // would silently become 10 via the `zone.level[1] || 10` fallback
      // in both spawners.
      check(`bands: ${id} sane (1<=${z.level[0]}<=${z.level[1]}<=100)`,
        z.level[0] >= 1 && z.level[0] <= z.level[1] && z.level[1] <= 100 && !!z.level[1],
        z.level);
    }
  }
}

// ── 4 + 6. GameRoom-backed checks ──
const mockState = {
  storage: {
    get: async () => undefined,
    put: async () => {},
    list: async () => new Map(),
    delete: async () => {},
  },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const room = new GameRoom(mockState, {});

// monsterStat parity across the phase boundaries for all four param sets.
// Before v2.3.1144 the server used an iterative loop that ceiled only at
// the end — brute L35 base HP read 66 on the client but 65 on the server.
{
  const PARAMS = [
    ['hp',   CLIENT_CURVE.base, CLIENT_CURVE.ramp, CLIENT_CURVE.plateau, CLIENT_CURVE.endgame],
    ['dmg',  12,   1.045, 1.025, 1.018],
    ['xp',   10,   1.045, 1.025, 1.018],
    ['gold', 5,    1.035, 1.020, 1.015],
  ];
  for (const [label, base, r1, r2, r3] of PARAMS) {
    let allEqual = true;
    const diffs = [];
    for (const L of [1, 15, 30, 31, 35, 65, 66, 100]) {
      const server = room._monsterStat(base, L, r1, r2, r3);
      const client = monsterStat(base, L, r1, r2, r3);
      if (server !== client) { allEqual = false; diffs.push({ L, server, client }); }
    }
    check(`parity: server._monsterStat === client monsterStat (${label})`, allEqual, diffs);
  }
}

// Curve lock — the binding INV-03 audit point behind the 1.052 ramp.
{
  const brute35 = createMonster('t', 'brute', 35, 0, 0);
  // v2.3.1346: +100 universal flat rides on top of the ramp; the lock
  // still pins the 1.052 curve itself (hp minus flat must stay 99).
  check('curve lock: brute L35 HP === 99 + flat (1.052 ramp, ceil-at-breaks form)',
    brute35.hp === 99 + (CLIENT_CURVE.flat || 0), brute35.hp);
}

// v2.3.1364 (owner): Lv1-2 monsters carry flatLow (50 less than the
// universal +100 flat).  Pin the boundary on both sides so a curve
// tweak can't silently re-sponge the starter zones.
{
  const f1 = createMonster('t', 'fodder', 1, 0, 0);
  const f2 = createMonster('t', 'fodder', 2, 0, 0);
  const f3 = createMonster('t', 'fodder', 3, 0, 0);
  const raw = (lvl) => Math.ceil(monsterStat(CLIENT_CURVE.base, lvl, CLIENT_CURVE.ramp, CLIENT_CURVE.plateau, CLIENT_CURVE.endgame) * 0.6); /* fodder hpMult 0.6 */
  check('Lv1 flat = flatLow (50 less)', f1.hp === raw(1) + (CLIENT_CURVE.flatLow || 0), f1.hp);
  check('Lv2 flat = flatLow (50 less)', f2.hp === raw(2) + (CLIENT_CURVE.flatLow || 0), f2.hp);
  check('Lv3 flat = full +100', f3.hp === raw(3) + (CLIENT_CURVE.flat || 0), f3.hp);
  check('flatLow is exactly 50 below flat', (CLIENT_CURVE.flat || 0) - (CLIENT_CURVE.flatLow || 0) === 50,
    { flat: CLIENT_CURVE.flat, flatLow: CLIENT_CURVE.flatLow });
}

// Spawn levels stay inside the band.
// v2.3.1160: every wilderness band is [1,2] — OWNER DIRECTIVE
// (2026-07-04): entry-depth zones stay L1-2 while the game is a demo.
// These assertions pin the directive so a band can't silently rise.
{
  const spawned = room._spawnZoneMonsters('frost');
  const band = SERVER_ZONES.frost.level;
  check('spawn bounds: frost monsters spawn within [1,2]',
    spawned.length > 0 && spawned.every((m) => m.level >= band[0] && m.level <= band[1]),
    spawned.map((m) => m.level));
  const meadow = room._spawnZoneMonsters('meadow');
  check('spawn bounds: meadow monsters spawn within [1,2]',
    meadow.length > 0 && meadow.every((m) => m.level >= 1 && m.level <= 2),
    meadow.map((m) => m.level));
  const flat = Object.entries(SERVER_ZONES).every(([, z]) =>
    Array.isArray(z.level) && z.level[0] === 1 && z.level[1] === 2);
  check('demo directive: every server zone band is exactly [1,2]', flat,
    Object.fromEntries(Object.entries(SERVER_ZONES).map(([k, z]) => [k, z.level])));
}

/* ── 7. v2.3.1625: VALID_ZONE_IDS covers every zone the client can
 *    actually put a player in.
 *
 *    This is the tripwire for the real hazard the zone allowlist
 *    introduces.  The gate closes a room-wide monster-AI outage (a
 *    client-chosen z of '__proto__' made _tickMonsters throw every
 *    tick), but an allowlist that MISSES a zone is worse than the bug:
 *    the player walks to the entrance and is silently held in place,
 *    with nothing in the log.  So: every client zone id must be
 *    accepted, and the fixture below must stay rejected. */
{
  const clientIds = Object.keys(CLIENT_ZONES);
  const missing = clientIds.filter((id) => !VALID_ZONE_IDS.has(id));
  check('zone allowlist: every client zone id is accepted server-side',
    missing.length === 0, missing);
  const extra = [...VALID_ZONE_IDS].filter((id) => !CLIENT_ZONES[id]);
  check('zone allowlist: carries no id the client does not know',
    extra.length === 0, extra);
  /* v2.3.1631: the assertion that used to sit here ("every server
     wilderness zone is included") was a TAUTOLOGY -- VALID_ZONE_IDS is
     literally built by spreading Object.keys(ZONES), so it tested the
     spread operator, not the code.  The two directions above (every
     CLIENT id accepted, no id the client does not know) are the ones
     that can actually fail, and they are what protects a player from
     being frozen at an unlisted zone's entrance. */
  for (const magic of ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf']) {
    check(`zone allowlist: rejects ${magic}`, !VALID_ZONE_IDS.has(magic));
  }
  check('zone allowlist: rejects an invented id', !VALID_ZONE_IDS.has('nowhere'));
  check('dungeon zone shape: accepts a real instance id',
    DUNGEON_ZONE_RE.test('dungeon:a1b2c3d4'));
  /* The shape gate is only half of it -- _validZone also requires a LIVE
     instance -- but it must still refuse anything with a separator, a
     traversal, or an over-long id on its own. */
  check('dungeon zone shape: rejects separators and traversal',
    !DUNGEON_ZONE_RE.test('dungeon:a:b')
    && !DUNGEON_ZONE_RE.test('dungeon:../x')
    && !DUNGEON_ZONE_RE.test('dungeon:')
    && !DUNGEON_ZONE_RE.test('dungeon:' + 'x'.repeat(33)));
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
