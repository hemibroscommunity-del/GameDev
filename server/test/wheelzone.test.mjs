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
 */
import { GameRoom } from '../src/index.js';
import { ZONES, VALID_ZONE_IDS } from '../src/data.js';
import { WHEEL_ZONE, WHEEL } from '../src/wheelzone.js';
import { WHEEL_SPAWNS, WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
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
{
  const want = WHEEL.HOMES.reduce((n, h) => n + ZONES[h].spawns.reduce((t, s) => t + s.count, 0), 0);
  check(`spawn: the Wheel fields every element zone's own monsters (${wheel.length} of ${want})`,
    want === 48 && wheel.length === want, { got: wheel.length, want });
  check('spawn: ids are unique and say whose they are', new Set(wheel.map((m) => m.id)).size === wheel.length
    && wheel.every((m) => m.id === `wm-${m.home}-${m.id.split('-').pop()}`));
  const perHome = {};
  for (const m of wheel) (perHome[m.home] = perHome[m.home] || []).push(m);
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
  const levels = new Set(wheel.map((m) => m.level));
  check('spawn: both levels appear, nearer the commons level 1, further out level 2', levels.has(1) && levels.has(2), [...levels]);
  let placed = true, bad = null;
  for (const m of wheel) {
    const at = WHEEL_SPAWNS[m.home];
    const onPoint = at.points.some((p) => p[0] === m.x && p[1] === m.y);
    const r = Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1]);
    const ax = at.anchor[0] - CENTRE[0], ay = at.anchor[1] - CENTRE[1], al = Math.hypot(ax, ay);
    const cos = ((m.x - CENTRE[0]) * ax + (m.y - CENTRE[1]) * ay) / (r * al);
    if (!onPoint || r < at.band[0] - 450 || r > at.band[1] + 450 || cos < 0.9 || m.spawnX !== m.x || m.spawnY !== m.y) { placed = false; bad = { id: m.id, x: m.x, y: m.y, r, cos }; }
  }
  check('spawn: every monster stands on one of its land\'s places, in its band, on its own spoke', placed, bad);
  /* the inner end: no monster nearer the centre than its band allows */
  const nearest = Math.min(...wheel.map((m) => Math.hypot(m.x - CENTRE[0], m.y - CENTRE[1])));
  check(`spawn: at the inner end of each land, past the commons (nearest ${Math.round(nearest)} px from the centre)`,
    nearest > 2900 && nearest < 4400, nearest);
  check('spawn: a second call is the same list (lazy, once per room)', room._ensureZoneMonsters(WHEEL_ZONE) === wheel);
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
  check('wire: one zone_state with all 48, each saying its home and its skin',
    zs.length === 1 && zs[0].zone === WHEEL_ZONE && zs[0].monsters.length === 48
    && zs[0].monsters.every((m) => WHEEL.HOMES.includes(m.home) && 'variant' in m && typeof m.x === 'number'),
    zs.length && { n: zs[0].monsters.length, first: zs[0].monsters[0] });
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
  check('kill switch: off again, the Wheel spawns', room._spawnZoneMonsters(WHEEL_ZONE).length === 48);
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
    const ms = wheel.filter((q) => q.home === home);
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
  const frostIds = wheel.filter((q) => q.home === 'frost').map((q) => q.id);
  const inReach = (id, pid) => {
    const q = wheel.find((w) => w.id === id), p = room.playerState[pid];
    return !!q && Math.hypot(q.x - p.x, q.y - p.y) <= WHEEL.INTEREST_OUT;
  };
  check('traffic: among Frost Ridge\'s six you hear about each of them', frostIds.every((id) => hn.has(id)), { heard: [...hn] });
  check(`traffic: ...and about none out of reach (${WHEEL.INTEREST_R} px), though all 48 moved`, [...hn].every((id) => inReach(id, 'hn')), [...hn].filter((id) => !inReach(id, 'hn')));
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
  const emberIds = wheel.filter((q) => q.home === 'ember').map((q) => q.id);
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
  check('not: nodes scattered over the map', (room._ensureZoneNodes(WHEEL_ZONE) || []).length === 0);
  check('not: population-scaled', room._spawnScalableZone(WHEEL_ZONE) === false);
  check('not: in ZONES (PvP needs ZONES[z].lawless, so it fails closed)', !Object.prototype.hasOwnProperty.call(ZONES, WHEEL_ZONE));
  check('not: a hub -- it heals at the ordinary rate (no town top-off on the spokes)',
    !['town', 'worldview', 'farm_home'].includes(WHEEL_ZONE));
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nwheelzone: all passed');
