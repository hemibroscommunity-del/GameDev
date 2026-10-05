/* The Wheel's monsters — v2.3.2978 (server/src/wheelzone.js).
 *
 * Owner, 2026-10-02: "can you place the monsters where they belong in their
 * zones (on the ends closest to the central map)?"  The Wheel is its own zone,
 * 'wheel', and each of the eight element zones brings its own spawn list there,
 * standing at the inner end of its spoke (server/src/wheelspawns.js, baked from
 * the plan by tools/world/bake-wheel-spawns.mjs).
 *
 *   1. THE SPAWN: every element zone's own monsters, as many as it fields, built
 *      exactly as in their zone (archetype, variant, element, levels 1-2), each
 *      standing on one of its land's baked places, inside its band, on its spoke.
 *   2. THE REWARDS are the home zone's: the shard, the weapon roll, quest credit
 *      ('shard_wheel' is not an item); a forged `home` buys nothing.
 *   3. THE WIRE: moving into 'wheel' hands back one zone_state whose monsters say
 *      their home and skin; every other zone's snapshot is unchanged (no `home`);
 *      no new message type; state_sync advertises caps.wheelmonsters.
 *   4. THE KILL SWITCH: `wheelmonsters: false` un-advertises the cap and a Wheel
 *      spawned after it is empty.
 *   5. THE CHASE LEASH: a monster chases a player next to it, and gives up past
 *      WHEEL.CHASE_LEASH from home.
 *  5b. THE SAFE GROUND: nobody in the commons or the town is a target, however
 *      near; a monster standing on it gives up its chase; and no hit lands
 *      there -- each against a control a step outside.
 *  5c. WHAT A PLAYER HEARS: in the Wheel, only the monsters within reach, and
 *      a monster coming into reach whole; an ordinary zone exactly as before.
 *   6. THE RANGED CAP: a bow shot from across the map lands nothing; one from
 *      bow range does.
 *   7. WHAT 'wheel' IS NOT: no nodes scattered over the sea, no population
 *      scaling, no PvP, no zone config -- and it is a zone a client may name.
 *   8. THE RESOURCES (v2.3.3012): the Wheel's baked nodes, tiered by distance
 *      from town (copper, pine and minnows on the safe ground; iron, softwood
 *      and clownfish at levels 1-10; black steel, hardwood and trout at
 *      11-20), each named for what the forge and the workbench consume; a
 *      harvest pays as anywhere and drops its land's shard (none on the
 *      commons); the wire says each node's land only in the Wheel;
 *      caps.wheelnodes; and the kill switch `wheelnodes: false`.
 *
 * v2.3.3013, PAST LEVEL 5 (the owner's yes to "monsters past level 5"):
 *  1b. THE DEEPER STRETCHES: each land's spawn list again in each of its next
 *      three tiers, at the tier's levels (6-10, 11-15, 16-20) by depth, built
 *      by the one copy of the stat math, on the tier's baked places; the first
 *      tier's 48 exactly as they were, and first in the list.
 *  4b. `wheeldeep: false` leaves a Wheel spawned after it with those 48.
 *   9. THE SEPARATION SWEEP: the Wheel keeps its monsters apart as every zone
 *      does, by a sweep instead of every pair (the tick's cost, measured).
 */
import { GameRoom } from '../src/index.js';
import { ZONES, VALID_ZONE_IDS, BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../src/data.js';
import { WHEEL_ZONE, WHEEL } from '../src/wheelzone.js';
import { gatherReqLvl } from '../src/gathering.js';   /* v2.3.3038 */
import { WHEEL_SPAWNS, WHEEL_NODES, WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { ZONES as CLIENT_ZONES } from '../../src/data/zones.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(mockState, mockEnv);
const CENTRE = [21504, 21504];

// ── 1. THE SPAWN ──────────────────────────────────────────────────────────
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
/* v2.3.3013: the first tier's -- levels 1-2 at each land's inner end, as
   since v2.3.2978; the deeper stretches carry `tier` (1b below) */
const first = wheel.filter((m) => !m.tier);
{
  const want = WHEEL.HOMES.reduce((n, h) => n + ZONES[h].spawns.reduce((t, s) => t + s.count, 0), 0);
  check(`spawn: the Wheel fields every element zone's own monsters at its inner end (${first.length} of ${want})`,
    want === 48 && first.length === want, { got: first.length, want });
  check('spawn: ...the first 48 in the list, as before the deeper stretches came', wheel.slice(0, 48).every((m) => !m.tier));
  check('spawn: ids are unique and say whose they are', new Set(wheel.map((m) => m.id)).size === wheel.length
    && first.every((m) => m.id === `wm-${m.home}-${m.id.split('-').pop()}`));
  const perHome = {};
  for (const m of first) (perHome[m.home] = perHome[m.home] || []).push(m);
  check('spawn: each of the eight lands has its own', WHEEL.HOMES.every((h) => (perHome[h] || []).length === 6),
    Object.fromEntries(Object.entries(perHome).map(([h, a]) => [h, a.length])));
  let built = true, why = null;
  for (const h of WHEEL.HOMES) {
    const ms = perHome[h] || [];
    const archs = {};
    for (const m of ms) archs[m.arch] = (archs[m.arch] || 0) + 1;
    for (const s of ZONES[h].spawns) {
      if ((archs[s.arch] || 0) !== s.count) { built = false; why = { h, archs, spawns: ZONES[h].spawns }; }
    }
    for (const m of ms) {
      const spawn = ZONES[h].spawns.find((s) => s.arch === m.arch);
      const variant = (spawn && spawn.variant) || room._variantForArchInZone(m.arch, h);
      if (m.element !== (ZONES[h].element || null) || m.variant !== variant || m.level < 1 || m.level > 2) { built = false; why = { h, m: { arch: m.arch, element: m.element, variant: m.variant, level: m.level } }; }
    }
  }
  check('spawn: built as in their own zone -- archetypes and counts, element, skin, levels 1-2', built, why);
  const levels = new Set(first.map((m) => m.level));
  check('spawn: both levels appear, nearer the commons level 1, further out level 2', levels.has(1) && levels.has(2), [...levels]);
  let placed = true, bad = null;
  for (const m of first) {
    const at = WHEEL_SPAWNS[m.home];
    const onPoint = at.points.some((p) => p[0] === m.x && p[1] === m.y);
    const r = Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1]);
    const ax = at.anchor[0] - CENTRE[0], ay = at.anchor[1] - CENTRE[1], al = Math.hypot(ax, ay);
    const cos = ((m.x - CENTRE[0]) * ax + (m.y - CENTRE[1]) * ay) / (r * al);
    if (!onPoint || r < at.band[0] - 450 || r > at.band[1] + 450 || cos < 0.9 || m.spawnX !== m.x || m.spawnY !== m.y) { placed = false; bad = { id: m.id, x: m.x, y: m.y, r, cos }; }
  }
  check('spawn: every monster stands on one of its land\'s places, in its band, on its own spoke', placed, bad);
  /* the inner end: no monster nearer the centre than its band allows */
  const nearest = Math.min(...first.map((m) => Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1])));
  check(`spawn: at the inner end of each land, past the commons (nearest ${Math.round(nearest)} px from the centre)`,
    nearest > 2900 && nearest < 4400, nearest);
  check('spawn: a second call is the same list (lazy, once per room)', room._ensureZoneMonsters(WHEEL_ZONE) === wheel);
}

// ── 1b. THE DEEPER STRETCHES (v2.3.3013) ─────────────────────────────────
const deep = wheel.filter((m) => m.tier);
{
  const TIERS = { 2: [6, 10], 3: [11, 15], 4: [16, 20] };
  const want = WHEEL.HOMES.reduce((n, h) => n + 3 * ZONES[h].spawns.reduce((t, s) => t + s.count, 0), 0);
  check(`deeper: each land's own monsters again in each of its next three stretches (${deep.length} of ${want}; ${wheel.length} in all)`,
    want === 144 && deep.length === want && wheel.length === 192, { got: deep.length, want, all: wheel.length });
  check('deeper: ids say whose they are and which stretch', deep.every((m) => m.id === `wm-${m.home}-t${m.tier}-${m.id.split('-').pop()}`),
    deep.filter((m) => !/^wm-[a-z]+-t[234]-\d+$/.test(m.id)).slice(0, 3).map((m) => m.id));
  /* per land and tier: the home's spawn list exactly, its element and skin */
  let built = true, why = null;
  for (const h of WHEEL.HOMES) for (const t of [2, 3, 4]) {
    const ms = deep.filter((m) => m.home === h && m.tier === t);
    const archs = {};
    for (const m of ms) archs[m.arch] = (archs[m.arch] || 0) + 1;
    for (const sp of ZONES[h].spawns) if ((archs[sp.arch] || 0) !== sp.count) { built = false; why = { h, t, archs }; }
    for (const m of ms) {
      const sp = ZONES[h].spawns.find((q) => q.arch === m.arch);
      const variant = (sp && sp.variant) || room._variantForArchInZone(m.arch, h);
      if (m.element !== (ZONES[h].element || null) || m.variant !== variant) { built = false; why = { h, t, m: { id: m.id, element: m.element, variant: m.variant } }; }
    }
  }
  check('deeper: per land and stretch, its home\'s spawn list -- archetypes, counts, element, skin', built, why);
  const offLevel = deep.filter((m) => m.level < TIERS[m.tier][0] || m.level > TIERS[m.tier][1]);
  check('deeper: each at its stretch\'s levels -- 6-10, 11-15, 16-20, what the top bar says there', offLevel.length === 0,
    offLevel.slice(0, 4).map((m) => ({ id: m.id, tier: m.tier, level: m.level })));
  const seen = {};
  for (const m of deep) (seen[m.tier] = seen[m.tier] || new Set()).add(m.level);
  check('deeper: both ends of every stretch appear (6 and 10, 11 and 15, 16 and 20)',
    [2, 3, 4].every((t) => seen[t] && seen[t].has(TIERS[t][0]) && seen[t].has(TIERS[t][1])), Object.fromEntries(Object.entries(seen).map(([t, v]) => [t, [...v].sort((a, b) => a - b)])));
  /* the level is the place's depth in its band, and the band runs outward */
  let byDepth = true, why2 = null;
  for (const m of deep) {
    const st = WHEEL_SPAWNS[m.home].deeper.find((d) => d.tier === m.tier);
    const p = st && st.points.find((q) => q[0] === m.x && q[1] === m.y);
    const want = p && Math.round(st.levels[0] + p[2] * (st.levels[1] - st.levels[0]));
    if (!p || m.level !== want || m.spawnX !== m.x || m.spawnY !== m.y) { byDepth = false; why2 = { id: m.id, level: m.level, want, p }; break; }
  }
  check('deeper: every one on one of its stretch\'s places, its level by how far out it stands there', byDepth, why2);
  let outward = true;
  for (const h of WHEEL.HOMES) {
    const r = (t) => deep.filter((m) => m.home === h && m.tier === t).map((m) => Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1]));
    const t1 = first.filter((m) => m.home === h).map((m) => Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1]));
    const [a, b, c] = [r(2), r(3), r(4)];
    if (!(Math.max(...t1) < Math.min(...a) && Math.max(...a) < Math.min(...b) && Math.max(...b) < Math.min(...c))) outward = false;
  }
  check('deeper: down every spoke the stretches follow one another outward, none overlapping the one before', outward);
  /* the one copy of the stat math: what its home zone would build at that level */
  let same = true, why3 = null;
  for (const m of deep) {
    const z = ZONES[m.home], sp = z.spawns.find((q) => q.arch === m.arch);
    const ref = room._makeZoneMonster(m.home, z, sp, 'ref', 10, 10, m.level);
    for (const k of ['level', 'hp', 'maxHp', 'dmg', 'xp', 'gold', 'spd', 'variant', 'element', 'arch']) {
      if (ref[k] !== m[k]) { same = false; why3 = { id: m.id, k, got: m[k], want: ref[k] }; }
    }
  }
  check('deeper: every stat what its home zone builds at that level (_makeZoneMonster, given the level)', same, why3);
  const snow1 = first.find((m) => m.home === 'frost' && m.level === 1);
  const snow20 = deep.find((m) => m.home === 'frost' && m.level === 20);
  check(`deeper: a level-20 snowman is tougher and pays more than a level-1 (hp ${snow1 && snow1.maxHp} -> ${snow20 && snow20.maxHp}, hit ${snow1 && snow1.dmg} -> ${snow20 && snow20.dmg}, XP ${snow1 && snow1.xp} -> ${snow20 && snow20.xp})`,
    !!snow1 && !!snow20 && snow20.maxHp > snow1.maxHp && snow20.dmg > snow1.dmg && snow20.xp > snow1.xp && snow20.gold > snow1.gold);
  check('deeper: without a level given, a monster is built exactly as before (the level off the zone\'s depth)',
    room._makeZoneMonster('frost', ZONES.frost, ZONES.frost.spawns[0], 'a', 512, 900).level === room._makeZoneMonster('frost', ZONES.frost, ZONES.frost.spawns[0], 'b', 512, 900, undefined).level
    && room._makeZoneMonster('frost', ZONES.frost, ZONES.frost.spawns[0], 'c', 512, 900, 0).level <= 2);
  /* the rewards are the home's, at the level's rates */
  const keep = room.SHARD_DROP_RATE;
  room.SHARD_DROP_RATE = 1;
  check('deeper: its shard is its home\'s too', !!snow20 && room._rollShardForKill(room._rewardZone(WHEEL_ZONE, snow20)) === 'shard_frost');
  room.SHARD_DROP_RATE = keep;
  /* the weapon roll's chance climbs with the level (index.js, the cubic curve) */
  const rnd = Math.random;
  let p1 = 0, p20 = 0;
  for (const [m, set] of [[snow1, (v) => { p1 = v; }], [snow20, (v) => { p20 = v; }]]) {
    let lo = 0, hi = 0.01;
    for (let i = 0; i < 30; i++) {
      const midP = (lo + hi) / 2;
      Math.random = () => midP;
      if (room._rollWeaponDropForKill('frost', m)) lo = midP; else hi = midP;
    }
    set(lo);
  }
  Math.random = rnd;
  check(`deeper: a weapon drops a little more often off it (${(p1 * 100).toFixed(3)}% at level 1, ${(p20 * 100).toFixed(3)}% at level 20)`, p20 > p1 && p1 > 0, { p1, p20 });
}

// ── 2. THE REWARDS ────────────────────────────────────────────────────────
{
  const snow = wheel.find((m) => m.home === 'frost');
  check('rewards: a Wheel monster pays out for its home zone', room._rewardZone(WHEEL_ZONE, snow) === 'frost');
  check('rewards: every other monster for the zone it died in', room._rewardZone('ember', { arch: 'fodder' }) === 'ember');
  check('rewards: a home that is not a zone buys nothing', room._rewardZone(WHEEL_ZONE, { home: '__proto__' }) === WHEEL_ZONE
    && room._rewardZone(WHEEL_ZONE, { home: 'town' }) === WHEEL_ZONE);
  const keep = room.SHARD_DROP_RATE;
  room.SHARD_DROP_RATE = 1;
  check('rewards: its shard is its home\'s, never shard_wheel', room._rollShardForKill(room._rewardZone(WHEEL_ZONE, snow)) === 'shard_frost');
  room.SHARD_DROP_RATE = keep;
  const goblin = wheel.find((m) => m.home === 'ember');
  check('rewards: and its skin decides its remnants as at home (the fire goblin\'s)', goblin && goblin.variant === 'fireGoblin'
    && room._invKeyForSkull(goblin.variant, goblin.arch) === 'fire-goblin-remnants');
}

// ── 3. THE WIRE ───────────────────────────────────────────────────────────
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const wsA = fakeWs('wheel');
room.sessions.set(wsA, baseSession());
await room.webSocketMessage(wsA, JSON.stringify({ type: 'join', id: 'wa', name: 'A', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
{
  const sync = msgsOfType(wsA, 'state_sync')[0];
  check('wire: state_sync advertises caps.wheelmonsters', !!(sync && sync.caps && sync.caps.wheelmonsters === true), sync && sync.caps && sync.caps.wheelmonsters);
  wsA.sent.length = 0;
  /* walk in from the town square -- the Wheel's arrival point */
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 21504, y: 21792, z: WHEEL_ZONE }));
  const zs = msgsOfType(wsA, 'zone_state');
  check('wire: moving into the Wheel is accepted (a zone a client may name)', room.playerState.wa.z === WHEEL_ZONE && VALID_ZONE_IDS.has(WHEEL_ZONE), room.playerState.wa.z);
  /* v2.3.3013: all 192, the deeper ones each with its own level (the client
     shows it: monsterVariants.js applyZoneVariant) and nothing new */
  check(`wire: one zone_state with all ${wheel.length}, each saying its home and its skin, and its own level`,
    zs.length === 1 && zs[0].zone === WHEEL_ZONE && zs[0].monsters.length === wheel.length && wheel.length === 192
    && zs[0].monsters.every((m) => WHEEL.HOMES.includes(m.home) && 'variant' in m && typeof m.x === 'number')
    && zs[0].monsters.every((m) => m.level === wheel.find((q) => q.id === m.id).level && !('tier' in m)),
    zs.length && { n: zs[0].monsters.length, first: zs[0].monsters[0] });
  const bytes = zs.length ? JSON.stringify(zs[0]).length : 0;
  check(`wire: ...in ${Math.round(bytes / 1024)} KB, once, on the way in (the ticks after carry only the monsters in reach)`, bytes > 0 && bytes < 64 * 1024, bytes);
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'town' }));
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 500, y: 500, z: 'tidal' }));
  /* (leaving a zone for town sends an empty town zone_state first: the clear) */
  const tz = msgsOfType(wsA, 'zone_state').filter((q) => q.zone === 'tidal');
  check('wire: every other zone\'s snapshot is unchanged -- no home, no variant there',
    tz.length === 1 && tz[0].zone === 'tidal' && tz[0].monsters.length > 0 && tz[0].monsters.every((m) => !('home' in m) && !('variant' in m)),
    { n: tz.length, zone: tz[0] && tz[0].zone, count: tz[0] && tz[0].monsters.length, first: tz[0] && tz[0].monsters[0] });
  const types = new Set(wsA.sent.map((m) => m.type));
  check('wire: no new message type', [...types].every((t) => ['zone_state', 'player_state', 'tick', 'fire_trail', 'zone_roster'].includes(t)), [...types]);
  check('wire: the client knows the zone too (src/data/zones.js), not safe, levels 1-2',
    !!CLIENT_ZONES.wheel && CLIENT_ZONES.wheel.safe === false && CLIENT_ZONES.wheel.level[0] === 1 && CLIENT_ZONES.wheel.level[1] === 2,
    CLIENT_ZONES.wheel);
  /* the client loads and frees the Wheel's monster art by ZONES.wheel.homes
     (monsterVariants.variantsForZone, preloadAnimations); a land the server
     spawns and the client does not list would be drawn on art never loaded */
  check('wire: the client lists the same eight lands as the server spawns, in the same order',
    Array.isArray(CLIENT_ZONES.wheel && CLIENT_ZONES.wheel.homes) && CLIENT_ZONES.wheel.homes.join() === WHEEL.HOMES.join(),
    { client: CLIENT_ZONES.wheel && CLIENT_ZONES.wheel.homes, server: WHEEL.HOMES });
}

// ── 4. THE KILL SWITCH ────────────────────────────────────────────────────
{
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), wheelmonsters: false };
  check('kill switch: a Wheel spawned after it is empty', room._spawnZoneMonsters(WHEEL_ZONE).length === 0);
  const wsK = fakeWs('kill');
  room.sessions.set(wsK, baseSession());
  await room.webSocketMessage(wsK, JSON.stringify({ type: 'join', id: 'wk', name: 'K', protocolVersion: 2, data: { x: 10, y: 10, z: 'town' } }));
  const sync = msgsOfType(wsK, 'state_sync')[0];
  check('kill switch: and the cap is no longer advertised', !!sync && !!sync.caps && sync.caps.wheelmonsters === false, sync && sync.caps && sync.caps.wheelmonsters);
  room._liveFlags = keep;
  check('kill switch: off again, the Wheel spawns', room._spawnZoneMonsters(WHEEL_ZONE).length === wheel.length);
  /* v2.3.3013: 4b. `wheeldeep: false` -- the first tier's alone */
  room._liveFlags = { ...(keep || {}), wheeldeep: false };
  const only = room._spawnZoneMonsters(WHEEL_ZONE);
  check('kill switch: `wheeldeep: false` leaves a Wheel spawned after it with the first stretch\'s 48, exactly',
    only.length === 48 && only.every((m, i) => !m.tier && m.id === first[i].id && m.level === first[i].level && m.x === first[i].x), only.length);
  room._liveFlags = keep;
}

// ── 5. THE CHASE LEASH ────────────────────────────────────────────────────
{
  const ps = room.playerState.wa;
  ps.z = WHEEL_ZONE; ps.dead = false; ps.hp = ps.maxHp || 100; ps.disconnected = false;
  ps._zoneEntryGraceUntil = Date.now() + 600000;   /* no damage: this is about who it chases */
  const m = wheel.find((q) => q.home === 'ember');
  for (const q of wheel) q._wanderPausedUntil = Date.now() + 600000;
  /* 100 px: inside its notice (120), outside its swing (72) -- a swing stops
     it for its wind-up, which needs real time to pass */
  const calm = () => { m._bwUntil = 0; m._bwTarget = null; m._attackingUntil = 0; m.atkCd = 0; };
  ps.x = m.x + 100; ps.y = m.y;
  calm();
  room._tickMonsters();
  check('leash: a monster chases a player beside it, on the Wheel as anywhere', m.targetId === 'wa', m.targetId);
  /* drag the fight out past the leash: the player kites, the monster follows */
  m.x = m.spawnX + WHEEL.CHASE_LEASH + 40; m.y = m.spawnY;
  ps.x = m.x + 100; ps.y = m.y;
  calm();
  room._tickMonsters();
  check(`leash: past ${WHEEL.CHASE_LEASH} px from home it gives up, even with you beside it`, m.targetId == null, m.targetId);
  const before = Math.hypot(m.x - m.spawnX, m.y - m.spawnY);
  for (let i = 0; i < 20; i++) room._tickMonsters();
  check('leash: and walks home', Math.hypot(m.x - m.spawnX, m.y - m.spawnY) < before, { before, now: Math.hypot(m.x - m.spawnX, m.y - m.spawnY) });
  /* in an ordinary zone there is no such leash: the zone's edge is the limit */
  const mz = room._ensureZoneMonsters('meadow')[0];
  mz.x = mz.spawnX + 700; mz.targetId = 'wb';
  mz._bwUntil = 0; mz._attackingUntil = 0; mz.atkCd = 0;
  room.playerState.wb = { z: 'meadow', x: mz.x + 100, y: mz.y, hp: 100, maxHp: 100, dead: false, disconnected: false, _zoneEntryGraceUntil: Date.now() + 600000 };
  room._tickMonsters();
  check('leash: an ordinary zone keeps its chase (only the Wheel leashes)', mz.targetId === 'wb', mz.targetId);
  delete room.playerState.wb;
  m.x = m.spawnX; m.y = m.spawnY; m.targetId = null;
}

// ── 5b. THE SAFE GROUND ───────────────────────────────────────────────────
{
  const ps = room.playerState.wa;
  ps.z = WHEEL_ZONE; ps.dead = false; ps.disconnected = false; ps.dying = false;
  ps._zoneEntryGraceUntil = Date.now() + 600000;   /* targeting first; hits below */
  const m = wheel.find((q) => q.home === 'frost');
  const calm = () => {
    m._bwUntil = 0; m._bwTarget = null; m._attackingUntil = 0; m.atkCd = 0;
    m.targetId = null; m._aggroOverrideTarget = null; m._aggroOverrideUntil = 0;
  };
  /* points on the line from the centre out through the monster's spot */
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  const at = (r) => ({ x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r });
  const put = (o, p) => { o.x = p.x; o.y = p.y; };
  check('safe ground: every land\'s places stand outside it', wheel.every((q) => !room._wheelSafeAt(q.spawnX, q.spawnY)),
    wheel.filter((q) => room._wheelSafeAt(q.spawnX, q.spawnY)).map((q) => q.id));
  put(m, at(WHEEL_SAFE_R + 40)); put(ps, at(WHEEL_SAFE_R - 60));
  calm(); room._tickMonsters();
  check('safe ground: nobody in the commons is a target, however near (100 px)', m.targetId == null, m.targetId);
  m._aggroOverrideTarget = 'wa'; m._aggroOverrideUntil = Date.now() + 5000;   /* shot from the commons */
  room._tickMonsters();
  check('safe ground: ...not even one who shot it from there', m.targetId == null, m.targetId);
  put(m, at(WHEEL_SAFE_R + 40)); put(ps, at(WHEEL_SAFE_R + 140));
  calm(); room._tickMonsters();
  check('safe ground: ...where the same player a step outside it is', m.targetId === 'wa', m.targetId);
  put(m, at(WHEEL_SAFE_R - 30)); put(ps, at(WHEEL_SAFE_R + 70));
  calm(); room._tickMonsters();
  check('safe ground: a monster standing on it gives up its chase, you beside it outside', m.targetId == null, m.targetId);
  /* the one choke point every monster->player hit funnels through */
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp || 100;
  put(m, at(WHEEL_SAFE_R + 40)); put(ps, at(WHEEL_SAFE_R - 20));
  const hp0 = ps.hp;
  room._monsterStrikePlayer(WHEEL_ZONE, m, 'wa', m.x, m.y);
  check('safe ground: no hit lands on it', ps.hp === hp0, { hp0, hp: ps.hp });
  put(ps, at(WHEEL_SAFE_R + 100));
  room._monsterStrikePlayer(WHEEL_ZONE, m, 'wa', m.x, m.y);
  check('safe ground: ...where the same hit a step outside does', ps.hp < hp0, { hp0, hp: ps.hp });
  ps.hp = ps.maxHp || 100; ps._zoneEntryGraceUntil = Date.now() + 600000;
  m.x = m.spawnX; m.y = m.spawnY; calm();
}

// ── 5c. WHAT A PLAYER HEARS ───────────────────────────────────────────────
{
  const join = async (ws, id, x, y, z) => {
    room.sessions.set(ws, baseSession());
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
    await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z }));
    const ps = room.playerState[id];
    ps._zoneEntryGraceUntil = Date.now() + 600000;   /* about what is heard, not who is hit */
  };
  const mid = (home) => {
    const ms = first.filter((q) => q.home === home);   /* v2.3.3013: the inner end's six */
    return { x: ms.reduce((a, q) => a + q.spawnX, 0) / ms.length, y: ms.reduce((a, q) => a + q.spawnY, 0) / ms.length };
  };
  const heard = (ws) => {
    const ids = new Set();
    for (const t of msgsOfType(ws, 'tick')) for (const list of Object.values(t.monsters || {})) for (const m of list) ids.add(m.id);
    return ids;
  };
  const run = async (ticks) => {
    room.startTickLoop();
    await new Promise((r) => setTimeout(r, room.TICK_RATE * ticks));
    clearInterval(room.tickInterval); room.tickInterval = null;
  };
  for (const q of wheel) { q.x = q.spawnX; q.y = q.spawnY; q.targetId = null; q._wanderPausedUntil = Date.now() + 600000; }
  const f = mid('frost'), e = mid('ember');
  const wsN = fakeWs('near'), wsF = fakeWs('far'), wsT = fakeWs('tidal');
  await join(wsN, 'hn', f.x, f.y + 60, WHEEL_ZONE);
  await join(wsF, 'hf', 21504, 21792, WHEEL_ZONE);
  await join(wsT, 'ht', 500, 500, 'tidal');
  /* every monster of both zones moving this tick: the hardest case */
  for (const q of wheel) room._markMonsterDirty(WHEEL_ZONE, q.id);
  const tidal = room._ensureZoneMonsters('tidal');
  for (const q of tidal) room._markMonsterDirty('tidal', q.id);
  for (const w of [wsN, wsF, wsT]) w.sent.length = 0;
  await run(4);
  const hn = heard(wsN), hf = heard(wsF), ht = heard(wsT);
  const frostIds = first.filter((q) => q.home === 'frost').map((q) => q.id);
  const inReach = (id, pid) => {
    const q = wheel.find((w) => w.id === id), p = room.playerState[pid];
    return !!q && Math.hypot(q.x - p.x, q.y - p.y) <= WHEEL.INTEREST_OUT;
  };
  check('traffic: among Frost Ridge\'s six you hear about each of them', frostIds.every((id) => hn.has(id)), { heard: [...hn] });
  check(`traffic: ...and about none out of reach (${WHEEL.INTEREST_R} px), though all ${wheel.length} moved`, [...hn].every((id) => inReach(id, 'hn')), [...hn].filter((id) => !inReach(id, 'hn')));
  check('traffic: in Brotown\'s square, 3,000 px and more from every one, you hear about none', hf.size === 0, [...hf]);
  check('traffic: an ordinary zone is unchanged -- its player hears every one of its moving monsters, none of the Wheel\'s',
    tidal.every((q) => ht.has(q.id)) && [...ht].every((id) => !id.startsWith('wm-')), { n: ht.size, tidal: tidal.length });
  /* walk the far one to the Flame Fields' six, none of them moving: they come
     in whole, so none is drawn where it stood when last heard */
  /* (set where they stand: one 3,900 px `move` is a teleport the
     anticheat refuses, and walking there is not what this is about) */
  room.playerState.hf.x = e.x; room.playerState.hf.y = e.y + 60;
  wsF.sent.length = 0;
  await run(3);
  const emberIds = first.filter((q) => q.home === 'ember').map((q) => q.id);
  const he = heard(wsF);
  const whole = msgsOfType(wsF, 'tick').flatMap((t) => (t.monsters && t.monsters[WHEEL_ZONE]) || []).filter((m) => emberIds.includes(m.id));
  check('traffic: walk up to the Flame Fields and its six come in whole, moving or not',
    emberIds.every((id) => he.has(id)) && whole.every((m) => typeof m.x === 'number' && typeof m.y === 'number' && typeof m.hp === 'number' && 'alive' in m),
    { heard: [...he], sample: whole[0] });
  /* out of the Wheel and back: what it had heard is forgotten, and comes in whole again */
  await room.webSocketMessage(wsF, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'town' }));
  await run(2);
  const sess = room.sessions.get(wsF);
  check('traffic: leaving the Wheel forgets what you heard there', !sess._wheelSeen, sess._wheelSeen && [...sess._wheelSeen]);
  await room.webSocketMessage(wsF, JSON.stringify({ type: 'move', x: e.x, y: e.y + 60, z: WHEEL_ZONE }));
  wsF.sent.length = 0;
  await run(3);
  check('traffic: ...so coming back, the six come in whole again', emberIds.every((id) => heard(wsF).has(id)), [...heard(wsF)]);
  for (const w of [wsN, wsF, wsT]) room.sessions.delete(w);
  for (const id of ['hn', 'hf', 'ht']) delete room.playerState[id];
}

// ── 6. THE RANGED CAP ─────────────────────────────────────────────────────
{
  const ps = room.playerState.wa;
  ps.z = WHEEL_ZONE; ps.dead = false;
  ps.rangedWeapon = ps.rangedWeapon || { type: 'bow', tierMult: 1 };
  const m = wheel.find((q) => q.home === 'tidal');
  m.alive = true; m.hp = m.maxHp;
  ps.x = m.x + 9000; ps.y = m.y;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: WHEEL_ZONE, slot: 'ranged' } }));
  check('ranged: a shot from across the map lands nothing', m.hp === m.maxHp, m.hp);
  ps.x = m.x + 900; ps.y = m.y;
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: WHEEL_ZONE, slot: 'ranged' } }));
  check('ranged: one from bow range lands', m.hp < m.maxHp, { hp: m.hp, maxHp: m.maxHp, sent: wsA.sent.map((q) => q.type) });
}

// ── 7. WHAT 'wheel' IS NOT ────────────────────────────────────────────────
{
  check('not: a zone config (no edge to clamp to, nothing to scale)', room._getZoneConfig(WHEEL_ZONE) === null);
  /* v2.3.3012: it has nodes now, but only the baked ones (section 8) -- none
     from the random layout, whose every point of 43,008 px is likely sea */
  check('not: nodes scattered over the map at random', (room._ensureZoneNodes(WHEEL_ZONE) || []).every((n) => /^wn-/.test(n.id)));
  check('not: population-scaled', room._spawnScalableZone(WHEEL_ZONE) === false);
  check('not: in ZONES (PvP needs ZONES[z].lawless, so it fails closed)', !Object.prototype.hasOwnProperty.call(ZONES, WHEEL_ZONE));
  check('not: a hub -- it heals at the ordinary rate (no town top-off on the spokes)',
    !['town', 'worldview', 'farm_home'].includes(WHEEL_ZONE));
}

// ── 8. THE RESOURCES (v2.3.3012) ──────────────────────────────────────────
{
  const nodes = room._ensureZoneNodes(WHEEL_ZONE) || [];
  const want = Object.values(WHEEL_NODES).reduce((t, l) => t + l.length, 0);
  check(`nodes: the Wheel grows every baked node (${nodes.length} of ${want})`, want > 100 && nodes.length === want, { got: nodes.length, want });
  check('nodes: ids are unique and say whose they are', new Set(nodes.map((n) => n.id)).size === nodes.length
    && nodes.every((n) => /^wn-[a-z]+-\d+$/.test(n.id) && Object.prototype.hasOwnProperty.call(WHEEL_NODES, n.id.split('-')[1])));
  check('nodes: each is a vein, a tree or a fishing spot, alive, at a tier the worker names',
    nodes.every((n) => ['oreVein', 'tree', 'fishSpot'].includes(n.nodeType) && n.alive === true && n.respawnAt === 0
      && WHEEL.NODE_TIERS.includes(n.tierLvl) && typeof n.x === 'number' && typeof n.y === 'number'));
  const R = (n) => Math.hypot(n.x - WHEEL_CENTRE[0], n.y - WHEEL_CENTRE[1]);
  const area = (n) => n.id.split('-')[1];
  const commons = nodes.filter((n) => area(n) === 'commons'), lands = nodes.filter((n) => area(n) !== 'commons');
  /* "Copper can be in the safe areas around town" */
  check('nodes: the safe ground grows copper, pine and minnows, all three, and no land\'s shard',
    commons.length > 0 && commons.every((n) => n.tierLvl === 1 && !('home' in n) && R(n) < WHEEL_SAFE_R)
    && ['oreVein', 'tree', 'fishSpot'].every((t) => commons.some((n) => n.nodeType === t)),
    commons.map((n) => [n.nodeType, n.tierLvl, n.home, Math.round(R(n))]));
  /* "Iron can be in lvl 1 monster areas ... 'black steel' in like level 10+" */
  check('nodes: every land grows iron and black steel ore, softwood and hardwood, off the safe ground',
    WHEEL.HOMES.every((h) => [6, 11].every((t) => ['oreVein', 'tree'].every((k) =>
      lands.some((n) => n.home === h && n.tierLvl === t && n.nodeType === k))))
    && lands.every((n) => n.home === area(n) && WHEEL.HOMES.includes(n.home) && n.tierLvl !== 1 && R(n) >= WHEEL_SAFE_R));
  check('nodes: and catches fish in some land at each of its tiers (clownfish, trout)',
    [6, 11].every((t) => lands.some((n) => n.nodeType === 'fishSpot' && n.tierLvl === t)));
  /* the owner: "Make all 8 have fishing spots" */
  check('nodes: every one of the eight lands has fishing',
    WHEEL.HOMES.every((h) => lands.some((n) => n.home === h && n.nodeType === 'fishSpot')),
    Object.fromEntries(WHEEL.HOMES.map((h) => [h, lands.filter((n) => n.home === h && n.nodeType === 'fishSpot').length])));
  /* "the higher lvl resources will be progressively more distant" */
  const med = (t) => { const r = nodes.filter((n) => n.tierLvl === t).map(R).sort((a, b) => a - b); return r[r.length >> 1]; };
  check('nodes: the richer the tier, the farther from town it grows', med(1) < med(6) && med(6) < med(11),
    { 1: Math.round(med(1)), 6: Math.round(med(6)), 11: Math.round(med(11)) });
  /* the bake keeps nodes apart, across lands too (two lands' bands meet) */
  let close = Infinity;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++)
    close = Math.min(close, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
  check('nodes: no two stand on top of each other, whoever\'s they are', close >= 160, Math.round(close));
  /* every monster's place stays clear of them */
  const mPts = Object.values(WHEEL_SPAWNS).flatMap((s) => s.points);
  check('nodes: none stands in a monster camp', nodes.every((n) => mPts.every((p) => Math.hypot(p[0] - n.x, p[1] - n.y) >= 300)));

  /* what each harvest is called -- and the forge and the workbench take them */
  const names = {
    'oreVein 1': 'ore_copper_ore', 'oreVein 6': 'ore_iron_ore', 'oreVein 11': 'ore_black_steel_ore',
    'tree 1': 'wood_pine_log', 'tree 6': 'wood_softwood', 'tree 11': 'wood_hardwood',
    'fishSpot 1': 'fish_minnow', 'fishSpot 6': 'fish_clownfish', 'fishSpot 11': 'fish_trout',
  };
  const got = Object.fromEntries(Object.keys(names).map((k) => { const [t, l] = k.split(' '); return [k, room._harvestInvKey(t, Number(l))]; }));
  check('nodes: each tier\'s harvest has its own name', Object.keys(names).every((k) => got[k] === names[k]), got);
  check('nodes: black steel ore is what the black steel tier forges from (BLACKSMITH_TIERS.steel)',
    'ore_' + BLACKSMITH_TIERS.steel.oreName + '_ore' === room._harvestInvKey('oreVein', 11)
    && 'ore_' + BLACKSMITH_TIERS.iron.oreName + '_ore' === room._harvestInvKey('oreVein', 6)
    && 'ore_' + BLACKSMITH_TIERS.copper.oreName + '_ore' === room._harvestInvKey('oreVein', 1),
    BLACKSMITH_TIERS.steel);
  check('nodes: and each wood what its bow tier is made from',
    ['pine', 'softwood', 'hardwood'].every((k, i) => 'wood_' + WOODWORKING_TIERS[k].wood === room._harvestInvKey('tree', [1, 6, 11][i])));

  /* a harvest, end to end, in the Wheel */
  const ps = room.playerState.wa;
  const session = room.sessions.get(wsA);
  ps.z = WHEEL_ZONE; ps.dead = false; ps.disconnected = false;
  ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  ps.lifeSkills = {};
  const shardAsked = [];
  const keepRoll = room._rollHarvestShard;
  room._rollHarvestShard = function (z) { shardAsked.push(z); return 'shard_' + z; };
  const harvest = async (n) => {
    n.alive = true; n.respawnAt = 0;
    ps.x = n.x; ps.y = n.y;
    wsA.sent.length = 0;
    await room.webSocketMessage(wsA, JSON.stringify({ type: 'extraction_start', payload: { nodeId: n.id, zone: WHEEL_ZONE, skill: room._harvestSkillName(n.nodeType) } }));
    const ex = room.extractions.wa;
    if (ex) ex.startedAt = Date.now() - ex.openDelayBase - 500;
    await room.webSocketMessage(wsA, JSON.stringify({ type: 'node_strike', payload: { id: n.id, zone: WHEEL_ZONE, accuracy: 'good' } }));
  };
  const iron = nodes.find((n) => n.home === 'frost' && n.nodeType === 'oreVein' && n.tierLvl === 6);
  await harvest(iron);
  check('harvest: a Wheel vein pays its ore and mining XP, and goes down',
    (ps.inventory.ore_iron_ore || 0) >= 1 && ps.lifeSkills.mining && ps.lifeSkills.mining.xp > 0 && iron.alive === false && iron.respawnAt > Date.now(),
    { inv: ps.inventory, ls: ps.lifeSkills, alive: iron.alive });
  check('harvest: and its land\'s shard, never shard_wheel', shardAsked.join() === 'frost' && (ps.inventory.shard_frost || 0) === 1 && !ps.inventory.shard_wheel,
    { shardAsked, inv: ps.inventory });
  check('harvest: the private credit goes to the harvester', msgsOfType(wsA, 'harvest_credit').length === 1);
  shardAsked.length = 0;
  const minnow = commons.find((n) => n.nodeType === 'fishSpot');
  await harvest(minnow);
  check('harvest: a commons fishing spot pays a minnow and no shard at all', (ps.inventory.fish_minnow || 0) >= 1 && shardAsked.length === 0
    && !Object.keys(ps.inventory).some((k) => k === 'shard_wheel' || k === 'shard_commons'),
    { shardAsked, inv: ps.inventory });
  const black = nodes.find((n) => n.nodeType === 'oreVein' && n.tierLvl === 11);
  /* v2.3.3038: black steel asks Mining 5 (GATHER_REQ_LVL) -- at 4 the worker
     plans nothing and pays nothing, and the vein is left standing */
  ps.lifeSkills.mining = { level: 4, xp: 0 };
  await harvest(black);
  check('level gate: black steel at Mining 4 pays nothing and leaves the vein up',
    !(ps.inventory.ore_black_steel_ore > 0) && black.alive === true && ps.lifeSkills.mining.xp === 0,
    { inv: ps.inventory, alive: black.alive, ls: ps.lifeSkills.mining });
  check('level gate: and the refusal says why', (room._lastStrikeFor('wa') || {}).why === 'skill-too-low'
    && room._lastStrikeFor('wa').need === 5 && room._lastStrikeFor('wa').have === 4, room._lastStrikeFor('wa'));
  check('level gate: no extraction record was planned for it', !room.extractions.wa || room.extractions.wa.nodeId !== black.id);
  ps.lifeSkills.mining = { level: 5, xp: 0 };
  await harvest(black);
  check('harvest: a levels 11-20 vein pays black steel ore at Mining 5', (ps.inventory.ore_black_steel_ore || 0) >= 1, ps.inventory);
  /* iron asks nothing: the owner's "copper and iron where you can mine both" */
  ps.lifeSkills.mining = { level: 1, xp: 0 };
  const ironBefore = ps.inventory.ore_iron_ore || 0;
  await harvest(iron);
  check('level gate: iron still mines at Mining 1', (ps.inventory.ore_iron_ore || 0) > ironBefore, ps.inventory);
  /* clownfish asks Fishing 5, the owner's other named cell */
  const clown = nodes.find((n) => n.nodeType === 'fishSpot' && n.tierLvl === 6);
  ps.lifeSkills.fishing = { level: 4, xp: 0 };
  await harvest(clown);
  check('level gate: a clownfish spot at Fishing 4 pays nothing', !(ps.inventory.fish_clownfish > 0) && clown.alive === true
    && (room._lastStrikeFor('wa') || {}).why === 'skill-too-low', { inv: ps.inventory, last: room._lastStrikeFor('wa') });
  ps.lifeSkills.fishing = { level: 5, xp: 0 };
  await harvest(clown);
  check('level gate: and at Fishing 5 it pays a clownfish', (ps.inventory.fish_clownfish || 0) >= 1, ps.inventory);
  /* the kill switch lifts it */
  const keepGate = room._liveFlags;
  room._liveFlags = { ...(keepGate || {}), gatherreq: false };
  ps.lifeSkills.mining = { level: 1, xp: 0 };
  const blackBefore = ps.inventory.ore_black_steel_ore || 0;
  await harvest(black);
  check('level gate: gatherreq:false lifts it -- black steel at Mining 1 again', (ps.inventory.ore_black_steel_ore || 0) > blackBefore, ps.inventory);
  room._liveFlags = keepGate;
  /* the table: the owner's three cells, and the rule for the rest */
  check('level gate: the table -- copper 1, iron 1, black steel 5; minnow 1, clownfish 5; trout, hardwood 10; pine 1, softwood 5',
    gatherReqLvl('oreVein', 1) === 1 && gatherReqLvl('oreVein', 6) === 1 && gatherReqLvl('oreVein', 11) === 5
    && gatherReqLvl('fishSpot', 1) === 1 && gatherReqLvl('fishSpot', 6) === 5 && gatherReqLvl('fishSpot', 11) === 10
    && gatherReqLvl('tree', 1) === 1 && gatherReqLvl('tree', 6) === 5 && gatherReqLvl('tree', 11) === 10);
  check('level gate: a forged type or tier asks nothing and walks no prototype',
    gatherReqLvl('__proto__', 11) === 1 && gatherReqLvl('constructor', 6) === 1 && gatherReqLvl('oreVein', '__proto__') === 1 && gatherReqLvl('oreVein', 999) === 1);
  room._rollHarvestShard = keepRoll;
  /* a strike from the vein's own spot in another zone is refused: a node is
     its zone's, and the Wheel's ids are not anyone else's */
  ps.z = 'tidal';
  const before = ps.inventory.ore_black_steel_ore;
  black.alive = true;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'node_strike', payload: { id: black.id, zone: WHEEL_ZONE, accuracy: 'good' } }));
  check('harvest: not from another zone', black.alive === true && ps.inventory.ore_black_steel_ore === before);
  ps.z = WHEEL_ZONE;

  /* the wire */
  const wsN = fakeWs('nodes');
  room.sessions.set(wsN, baseSession());
  await room.webSocketMessage(wsN, JSON.stringify({ type: 'join', id: 'wn', name: 'N', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  const sync = msgsOfType(wsN, 'state_sync')[0];
  check('wire: state_sync advertises caps.wheelnodes', !!(sync && sync.caps && sync.caps.wheelnodes === true), sync && sync.caps && sync.caps.wheelnodes);
  wsN.sent.length = 0;
  await room.webSocketMessage(wsN, JSON.stringify({ type: 'move', x: 21504, y: 21792, z: WHEEL_ZONE }));
  const zs = msgsOfType(wsN, 'zone_state').filter((q) => q.zone === WHEEL_ZONE);
  check('wire: the Wheel\'s zone_state carries every node, a land\'s saying its land',
    zs.length === 1 && Array.isArray(zs[0].nodes) && zs[0].nodes.length === want
    && zs[0].nodes.every((n) => (n.id.startsWith('wn-commons-') ? !('home' in n) : WHEEL.HOMES.includes(n.home))),
    zs[0] && { n: zs[0].nodes && zs[0].nodes.length, first: zs[0].nodes && zs[0].nodes[0] });
  wsN.sent.length = 0;
  await room.webSocketMessage(wsN, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'town' }));
  await room.webSocketMessage(wsN, JSON.stringify({ type: 'move', x: 500, y: 500, z: 'meadow' }));
  const mz = msgsOfType(wsN, 'zone_state').filter((q) => q.zone === 'meadow');
  check('wire: every other zone\'s nodes are unchanged -- no home there',
    mz.length === 1 && mz[0].nodes.length > 0 && mz[0].nodes.every((n) => !('home' in n)), mz[0] && mz[0].nodes[0]);

  /* the kill switch */
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), wheelnodes: false };
  check('kill switch: a Wheel whose nodes spawn after it has none', room._spawnZoneNodes(WHEEL_ZONE).length === 0);
  const wsK = fakeWs('nodekill');
  room.sessions.set(wsK, baseSession());
  await room.webSocketMessage(wsK, JSON.stringify({ type: 'join', id: 'wnk', name: 'NK', protocolVersion: 2, data: { x: 10, y: 10, z: 'town' } }));
  const ksync = msgsOfType(wsK, 'state_sync')[0];
  check('kill switch: and caps.wheelnodes is no longer advertised', !!ksync && !!ksync.caps && ksync.caps.wheelnodes === false, ksync && ksync.caps && ksync.caps.wheelnodes);
  room._liveFlags = keep;
  check('kill switch: off again, the nodes grow', room._spawnZoneNodes(WHEEL_ZONE).length === want);
}

// ── 9. THE SEPARATION SWEEP (v2.3.3013) ──────────────────────────────────
{
  /* the same push as every zone's (index.js): two live monsters' feet within
     22 px are pushed half the overlap each apart; dirty both */
  const mk = (id, x, y, alive = true) => ({ id, x, y, alive });
  const a = mk('sa', 1000, 1000), b = mk('sb', 1010, 1000), far = mk('sf', 1010, 1600), dead = mk('sd', 1005, 1000, false);
  room.dirtyMonsterIds = Object.create(null);
  room._wheelSeparate(WHEEL_ZONE, [a, far, dead, b], 22);
  check('sweep: two monsters 10 px apart are pushed to 22, half each, and marked to send',
    Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 22) < 1e-9 && Math.abs(a.x - 994) < 1e-9 && Math.abs(b.x - 1016) < 1e-9
    && room.dirtyMonsterIds[WHEEL_ZONE] && room.dirtyMonsterIds[WHEEL_ZONE].has('sa') && room.dirtyMonsterIds[WHEEL_ZONE].has('sb'),
    { a, b });
  check('sweep: one in line on x but 600 px off on y, and a dead one, are left alone',
    far.x === 1010 && far.y === 1600 && dead.x === 1005 && !room.dirtyMonsterIds[WHEEL_ZONE].has('sf') && !room.dirtyMonsterIds[WHEEL_ZONE].has('sd'));
  /* against the loop every other zone runs: a tight knot of 12 (the pack
     round a player), many pairs close at once.  One gentle pass a tick does
     not open a knot in one go -- the loop does not either -- so both run a
     second's worth of ticks, and the knot must open as far either way */
  const knot = () => Array.from({ length: 12 }, (_, i) => mk('k' + i, 5000 + (i % 4) * 9, 5000 + Math.floor(i / 4) * 9));
  const minD = (L) => { let d = Infinity; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) d = Math.min(d, Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y)); return d; };
  const loopPass = (L) => {
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const p = L[i], q = L[j], dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 >= 484 || d2 < 0.0001) continue;
      const d = Math.sqrt(d2), push = (22 - d) / 2, ux = dx / d, uy = dy / d;
      p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push;
    }
  };
  const swept = knot(), looped = knot();
  for (let t = 0; t < 45; t++) { room._wheelSeparate(WHEEL_ZONE, swept, 22); loopPass(looped); }
  const k0 = minD(knot()), kS = minD(swept), kL = minD(looped);
  check(`sweep: a knot of 12 opens in a second of ticks as the loop opens it (closest pair ${k0.toFixed(1)} px -> ${kS.toFixed(1)} swept, ${kL.toFixed(1)} looped)`,
    kS >= 20 && kL >= 20, { k0, kS, kL });
  /* what it is for: the whole monster tick with the Wheel's 192 */
  const r2 = new GameRoom(mockState, mockEnv);
  const ms = r2._ensureZoneMonsters(WHEEL_ZONE);
  r2.playerState.bench = { id: 'bench', z: WHEEL_ZONE, x: CENTRE[0], y: CENTRE[1] + 300, hp: 100, maxHp: 100 };
  for (let i = 0; i < 200; i++) r2._tickMonsters();
  let calls = 0;
  const sep = r2._wheelSeparate;
  r2._wheelSeparate = function (...a2) { calls++; return sep.apply(this, a2); };
  const N = 400, t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) r2._tickMonsters();
  const us = Number(process.hrtime.bigint() - t0) / 1e3 / N;
  check(`sweep: the Wheel's monster tick uses it, once a tick (${ms.length} monsters, ${us.toFixed(0)} µs a tick here; ~1,270 µs with every pair)`,
    calls === N && ms.length === 192, { calls, us });
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nwheelzone: all passed');
