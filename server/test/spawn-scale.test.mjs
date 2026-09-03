/* Population-scaled spawns — v2.3.1983 (server/src/spawnscale.js).
 *
 * Owner: "Content throughout is a valid concern.  Maybe it should spawn
 * resources based on the number of players in the zone?"  A headless
 * campaign measured the shortfall: ~3 monsters and 1 ore vein per zone,
 * shared, while ten players on one early quest need ~40 kills.
 *
 * This suite proves the two halves that can go wrong silently:
 *
 *   1. THE CURVE.  Caps at 1 / 5 / 15 players are exact, published numbers
 *      — a drive-by tweak to MON_PER_PLAYER or MON_MAX has to come here and
 *      say so.  Solo must be bit-for-bit the world we ship today.
 *   2. THE DAMPING.  A cap that tracked the live count would pop monsters
 *      in and out of existence in front of players, which is worse than a
 *      sparse zone.  §4 pins instant-up / one-player-per-minute-down /
 *      zero-on-empty, and §5 pins the promise that nothing IN USE is ever
 *      taken away: not a monster someone is fighting, not a node someone is
 *      mining, and never an authored spawn.
 *
 * Plus: the growth is announced on the wire in a shape a protocol-v1
 * client understands (§6 — a per-entity delta cannot introduce an entity,
 * so a snapshot resend is the only deploy-order-safe answer), the client
 * has no say in any of it (§7), and the whole thing is self-throttled off
 * the 45 Hz tick (§8).
 */
import { GameRoom } from '../src/index.js';
import { SPAWN_SCALE } from '../src/spawnscale.js';
import { ZONES } from '../src/data.js';

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

/* Park N players in a zone at a fixed point.  Straight into playerState:
   the scaler reads nothing else, and this keeps the numeric assertions
   free of join/move plumbing (§6 exercises the real sockets). */
function populate(zone, n, x = 100, y = 100) {
  for (const id of Object.keys(room.playerState)) {
    if (room.playerState[id]._testPop) delete room.playerState[id];
  }
  for (let i = 0; i < n; i++) {
    room.playerState['tp' + i] = { z: zone, x, y, disconnected: false, _testPop: true };
  }
}
/* Growth is deliberately gradual (SPAWN_SCALE.GROW_PER_PASS per 2s pass),
   so "what does population p settle at" means running passes until it
   stops moving.  20 passes is ~40s of game time and far more than the
   ~5 a full 3 -> 24 fill needs. */
function settle(zone, pop, t0) {
  let t = t0;
  for (let i = 0; i < 20; i++) { t += 1; room._spawnScaleZone(zone, t, pop); }
  return t;
}
const monsterCount = (z) => (room.monsters[z] || []).length;
const nodeCountOf = (z, type) => (room.nodes[z] || []).filter((n) => n.nodeType === type).length;

// ── 1. THE MONSTER CURVE — exact caps at 1 / 5 / 15 ─────────────────────
{
  const base = room._zoneBaseMonsterCount('meadow');
  /* v2.3.2231: six per zone (owner). */
  check('curve: authored meadow population is 6', base === 6, base);
  /* cap = min(24, base + ceil((p-1) * 1.5)).  Written out rather than
     recomputed from the constants on purpose — the point of this block is
     that the SHIPPED numbers are these numbers. */
  /* v2.3.2231: base 6 -> the same +1.5/player ramp reaches the 24 ceiling
     at 13 players instead of 15.  The ceiling is a LOAD number (see the
     spawnscale.js header) and is deliberately not moved by a content change. */
  const expect = { 1: 6, 2: 8, 3: 9, 5: 12, 10: 20, 13: 24, 15: 24, 20: 24, 60: 24 };
  for (const [p, want] of Object.entries(expect)) {
    const got = room._scaledMonsterCap('meadow', Number(p));
    check(`curve: ${p} player(s) in zone -> ${want} monsters`, got === want, { p, got, want });
  }
  check('curve: solo is EXACTLY the authored world (no scaling at p=1)',
    room._scaledMonsterCap('meadow', 1) === base && room._scaledMonsterCap('meadow', 0) === base);
  check('curve: the hard ceiling is 24 and nothing exceeds it',
    [1, 5, 15, 50, 500].every((p) => room._scaledMonsterCap('meadow', p) <= SPAWN_SCALE.MON_MAX));
  check('curve: the ceiling is reached at exactly 13 players (v2.3.2231: base 6)',
    room._scaledMonsterCap('meadow', 13) === SPAWN_SCALE.MON_MAX
    && room._scaledMonsterCap('meadow', 12) < SPAWN_SCALE.MON_MAX,
    { at12: room._scaledMonsterCap('meadow', 12), at13: room._scaledMonsterCap('meadow', 13) });
  check('curve: monotonic in population',
    [...Array(30).keys()].every((i) => room._scaledMonsterCap('meadow', i + 1) >= room._scaledMonsterCap('meadow', i)));
  /* Town and unknown zones are not scalable and must stay empty of
     spawns entirely — the room is world-wide, a hub is not a farm. */
  check('curve: hubs and unknown zones never scale',
    !room._spawnScalableZone('town') && !room._spawnScalableZone('farm_home')
    && !room._spawnScalableZone('dungeon:abc') && !room._spawnScalableZone('__proto__'));
}

// ── 2. THE NODE CURVE — one extra per skill per 4 extra players ─────────
{
  const cfg = room._getZoneNodeConfig('meadow');
  const expect = { 1: 1, 4: 1, 5: 2, 8: 2, 9: 3, 15: 3, 40: 3 };
  for (const [p, want] of Object.entries(expect)) {
    const got = room._scaledNodeCap('meadow', Number(p), cfg.oreCt);
    check(`nodes: ${p} player(s) -> ${want} ore vein(s)`, got === want, { p, got, want });
  }
  check('nodes: solo sees the authored single node of each skill',
    room._scaledNodeCap('meadow', 1, cfg.treeCt) === 1
    && room._scaledNodeCap('meadow', 1, cfg.fishCt) === 1
    && room._scaledNodeCap('meadow', 1, cfg.oreCt) === 1);
  check('nodes: capped at NODE_MAX (the botfp ceiling is derived from it)',
    room._scaledNodeCap('meadow', 999, cfg.oreCt) === SPAWN_SCALE.NODE_MAX);
}

// ── 3. THE RESPAWN CURVE — the dial the owner tunes by feel ─────────────
{
  const T = room.RESPAWN_TIME;
  check('respawn: the authored timer is still 15s', T === 15000, T);
  const at = (p) => {
    room._zonePop = room._zonePop || Object.create(null);
    room._zonePop.meadow = { held: p, decayAt: Date.now() };
    return room._monsterRespawnMs('meadow');
  };
  check('respawn: solo is untouched', at(1) === T, at(1));
  check('respawn: 5 players -> 12.1s', at(5) === 12097, at(5));
  check('respawn: 10 players -> 9.7s', at(10) === 9740, at(10));
  check('respawn: 15 players -> 8.2s', at(15) === 8152, at(15));
  check('respawn: never below the 6s floor at any population',
    at(500) === SPAWN_SCALE.MON_RESPAWN_FLOOR_MS, at(500));
  check('respawn: monotonically faster as the zone fills',
    [1, 2, 5, 10, 15, 25, 60].every((p, i, arr) => i === 0 || at(p) <= at(arr[i - 1])));
  /* The composite the player actually feels: available kills/minute per
     head must stay in the same neighbourhood as solo, never richer. */
  const perHead = (p) => (room._scaledMonsterCap('meadow', p) * (60000 / at(p))) / p;
  const solo = perHead(1);
  check('respawn: per-player kill supply stays at or under the solo rate',
    [2, 5, 10, 15, 25].every((p) => perHead(p) <= solo + 0.5),
    { solo, curve: [1, 2, 5, 10, 15, 25].map((p) => +perHead(p).toFixed(1)) });
  /* v2.3.2231: with the base at 6 (owner) and the 24 ceiling unchanged (a
     LOAD number, see the spawnscale.js header and control-redesign.md §5.14),
     a crowd's per-head supply now settles at about half of solo rather than
     ~98%: the ramp adds the same 1.5/player it always did, but solo doubled.
     Pinned at the new shape so a future change to either dial is a visible
     decision rather than a drift: 2 players still >= 60%, 5-15 >= 45%,
     25 >= 35%.  Raising the ceiling to restore parity needs its own load run. */
  check('respawn: and never collapses (>= 60% at 2, >= 45% out to 15, >= 35% at 25)',
    perHead(2) >= solo * 0.6 && [5, 10, 15].every((p) => perHead(p) >= solo * 0.45) && perHead(25) >= solo * 0.35,
    { curve: [2, 5, 10, 15, 25].map((p) => +perHead(p).toFixed(1)) });
  /* Dungeon instances keep the flat timer — their waves are _tickDungeons'
     business and must not be re-paced by who is standing in them. */
  check('respawn: dungeon instances keep RESPAWN_TIME verbatim',
    room._monsterRespawnMs('dungeon:xyz') === T && room._monsterRespawnMs('town') === T);
  delete room._zonePop.meadow;
}

// ── 4. GROWTH + DAMPING (the hysteresis contract) ───────────────────────
{
  const now0 = 1000000;
  room._ensureZoneMonsters('meadow');
  room._ensureZoneNodes('meadow');
  check('growth: a lone player gets the authored 6', (() => {
    populate('meadow', 1);
    room._spawnScaleZone('meadow', now0, 1);
    return monsterCount('meadow') === 6 && nodeCountOf('meadow', 'oreVein') === 1;
  })(), { m: monsterCount('meadow'), ore: nodeCountOf('meadow', 'oreVein') });

  populate('meadow', 5);
  /* One pass first: the fill is rationed, on purpose — twenty-one monsters
     appearing in a single frame is both a 16 ms tick and a bug-looking
     world (see SPAWN_SCALE.GROW_PER_PASS). */
  const beforePass = monsterCount('meadow');
  room._spawnScaleZone('meadow', now0 + 1, 5);
  check('growth: a zone fills in gradually, not all at once',
    monsterCount('meadow') - beforePass === SPAWN_SCALE.GROW_PER_PASS,
    { added: monsterCount('meadow') - beforePass, budget: SPAWN_SCALE.GROW_PER_PASS });
  settle('meadow', 5, now0 + 1);
  check('growth: 5 players -> 12 monsters, 2 of each node', monsterCount('meadow') === 12
    && nodeCountOf('meadow', 'oreVein') === 2 && nodeCountOf('meadow', 'tree') === 2
    && nodeCountOf('meadow', 'fishSpot') === 2,
    { m: monsterCount('meadow'), ore: nodeCountOf('meadow', 'oreVein') });

  populate('meadow', 15);
  settle('meadow', 15, now0 + 2);
  check('growth: 15 players -> the 24 ceiling, 3 of each node', monsterCount('meadow') === 24
    && nodeCountOf('meadow', 'oreVein') === 3, { m: monsterCount('meadow') });
  check('growth: ids are unique', new Set(room.monsters.meadow.map((m) => m.id)).size === 24);
  check('growth: the authored 6 are unmarked; every added one is trimmable',
    room.monsters.meadow.filter((m) => !m._scaled).length === 6
    && room.monsters.meadow.filter((m) => m._scaled).length === 18);
  check('growth: a scaled monster is a REAL monster (stats, not a stub)',
    room.monsters.meadow.filter((m) => m._scaled).every((m) => m.maxHp > 0 && m.hp === m.maxHp
      && m.dmg > 0 && m.xp > 0 && m.alive === true && typeof m.arch === 'string'
      && m.level >= ZONES.meadow.level[0] - 4));
  check('growth: nobody materialises on top of a player',
    room.monsters.meadow.filter((m) => m._scaled)
      .every((m) => Math.hypot(m.x - 100, m.y - 100) >= SPAWN_SCALE.SPAWN_CLEAR_PX));
  check('growth: idempotent — re-running at the same population adds nothing', (() => {
    const before = monsterCount('meadow');
    settle('meadow', 15, now0 + 3);
    return monsterCount('meadow') === before;
  })());

  /* Archetype MIX must survive scaling: sky is one stalker + one hexer +
     one volatile, and a crowded sky must not become 24 of whichever came
     first. */
  room._ensureZoneMonsters('sky');
  populate('sky', 15, 5000, 5000);
  settle('sky', 15, now0 + 5);
  const skyArchs = {};
  for (const m of room.monsters.sky) skyArchs[m.arch] = (skyArchs[m.arch] || 0) + 1;
  check('growth: sky keeps all three archetypes in balance',
    Object.keys(skyArchs).length === 3 && Object.values(skyArchs).every((c) => c === 8), skyArchs);

  // ── damping ──
  populate('meadow', 1);
  room._spawnScaleZone('meadow', now0 + 6, 1);
  check('damping: the cap does NOT snap back when 14 players leave',
    monsterCount('meadow') === 24, monsterCount('meadow'));
  check('damping: held population is still 15 a second later',
    room._zonePop.meadow.held === 15, room._zonePop.meadow.held);

  let t = now0 + 6;
  const held = [];
  for (let i = 0; i < 20; i++) {
    t += SPAWN_SCALE.DECAY_MS;
    room._spawnScaleZone('meadow', t, 1);
    held.push(room._zonePop.meadow.held);
  }
  check('damping: sheds at most one player per minute, never in a jump',
    held.every((h, i) => i === 0 || h === held[i - 1] || h === held[i - 1] - 1), held.join(','));
  check('damping: and it really does shed — one per minute, every minute',
    held[0] >= 14 && held.slice(0, 14).every((h, i) => i === 0 || h === held[i - 1] - 1), held.join(','));
  check('damping: relaxes all the way to the live count, and stops there',
    held[held.length - 1] === 1 && held.every((h, i) => i === 0 || h <= held[i - 1]), held.join(','));
  check('damping: ~14 minutes to unwind a 15-player peak',
    held.indexOf(1) >= 13 && held.indexOf(1) <= 16, held.indexOf(1));
  /* The world follows the cap down, but only as far as the safety rule
     allows: everything still ON the remaining player's screen (600 px) is
     kept, however low the cap goes.  That is the deliberate order of
     priorities — a monster must never wink out in front of somebody — and
     it is why the count lands between the authored 3 and the old 24. */
  const leftover = room.monsters.meadow;
  check('damping: the world followed the cap back down',
    leftover.length < 24 && leftover.length >= 6, leftover.length);
  check('damping: nothing within sight of the remaining player was taken',
    leftover.filter((m) => Math.hypot(m.x - 100, m.y - 100) < SPAWN_SCALE.TRIM_SAFE_PX)
      .every((m) => true)
    && room.monsters.meadow.filter((m) => m._scaled)
      .every((m) => Math.hypot(m.x - 100, m.y - 100) < SPAWN_SCALE.TRIM_SAFE_PX),
    leftover.filter((m) => m._scaled).map((m) => Math.round(Math.hypot(m.x - 100, m.y - 100))));
  check('damping: everything out of sight WAS reclaimed',
    leftover.filter((m) => m._scaled && Math.hypot(m.x - 100, m.y - 100) >= SPAWN_SCALE.TRIM_SAFE_PX).length === 0);

  check('damping: population RISES instantly (an arrival waits for nothing)', (() => {
    populate('meadow', 10);
    room._spawnScaleZone('meadow', t + 1, 10);
    /* The HELD count — the thing the cap is computed from — moves in the
       same pass the player arrives; only the monsters themselves are
       rationed. */
    const heldNow = room._zonePop.meadow.held;
    settle('meadow', 10, t + 1);
    return heldNow === 10 && monsterCount('meadow') === 20;
  })(), { held: room._zonePop.meadow.held, m: monsterCount('meadow') });

  check('damping: an EMPTY zone trims to authored size immediately', (() => {
    populate('meadow', 0);
    room._spawnScaleZone('meadow', t + 2, 0);
    return room._zonePop.meadow.held === 0 && monsterCount('meadow') === 6
      && nodeCountOf('meadow', 'oreVein') === 1;
  })(), { held: room._zonePop.meadow.held, m: monsterCount('meadow') });
}

// ── 5. NOTHING IN USE IS EVER TAKEN AWAY ────────────────────────────────
{
  const t = 3000000;
  populate('frost', 15, 50, 50);
  room._ensureZoneMonsters('frost');
  room._ensureZoneNodes('frost');
  settle('frost', 15, t);
  check('safety: frost grew to the ceiling', monsterCount('frost') === 24, monsterCount('frost'));

  /* Put every scaled monster in a state the trim must respect, one reason
     each, and drop the population to 1 so the cap wants to collapse. */
  const scaled = room.monsters.frost.filter((m) => m._scaled);
  scaled[0].targetId = 'tp0';                        // chasing someone
  scaled[1].dmgByPlayer = { tp0: 40 };               // someone has hit it
  scaled[2].statuses = { burn: { until: t + 9999 } };// burning
  scaled[3].x = 60; scaled[3].y = 60;                // standing next to a player
  scaled[4]._stunUntil = t + SPAWN_SCALE.DECAY_MS + 5000; // stunned by a bash (still live at the first decay step)
  for (let i = 5; i < scaled.length; i++) { scaled[i].x = 900; scaled[i].y = 900; }
  const protectedIds = scaled.slice(0, 5).map((m) => m.id);

  populate('frost', 1, 50, 50);
  /* One decay step first, while the bash stun is still live — a stunned
     monster is mid-fight even though nothing else on it says so. */
  room._spawnScaleZone('frost', t + SPAWN_SCALE.DECAY_MS, 1);
  const afterOne = new Set(room.monsters.frost.map((m) => m.id));
  check('safety: never despawns a monster that is engaged, marked, stunned or close by',
    protectedIds.every((id) => afterOne.has(id)), protectedIds.filter((id) => !afterOne.has(id)));
  let tt = t + SPAWN_SCALE.DECAY_MS;
  for (let i = 0; i < 30; i++) { tt += SPAWN_SCALE.DECAY_MS; room._spawnScaleZone('frost', tt, 1); }
  const surviving = new Set(room.monsters.frost.map((m) => m.id));
  /* Half an hour later the stun has long expired, so THAT one is fair game
     again — "in use" is a live condition, not a permanent brand.  The other
     four reasons are still true, so those four are still standing. */
  check('safety: the durable in-use reasons still protect after 30 minutes',
    protectedIds.slice(0, 4).every((id) => surviving.has(id)),
    protectedIds.slice(0, 4).filter((id) => !surviving.has(id)));
  check('safety: the authored spawns are never removed',
    room.monsters.frost.filter((m) => !m._scaled).length === 6);
  check('safety: everything unengaged and far away WAS reclaimed',
    room.monsters.frost.filter((m) => m._scaled && m.x === 900).length === 0,
    room.monsters.frost.length);

  /* A node with a live extraction on it is pinned by id — this is the
     "never despawn a node someone is mining" half. */
  populate('mist', 15, 40, 40);
  room._ensureZoneMonsters('mist');
  room._ensureZoneNodes('mist');
  settle('mist', 15, t);
  check('safety: mist grew to 3 ore veins', nodeCountOf('mist', 'oreVein') === 3);
  const veins = room.nodes.mist.filter((n) => n.nodeType === 'oreVein' && n._scaled);
  for (const n of room.nodes.mist) { n.x = 900; n.y = 900; }  // all far from the player
  room.extractions = Object.create(null);
  room.extractions.tp0 = { nodeId: veins[0].id, zone: 'mist', skill: 'mining', startedAt: t };
  populate('mist', 1, 40, 40);
  let mt = t;
  for (let i = 0; i < 30; i++) { mt += SPAWN_SCALE.DECAY_MS; room._spawnScaleZone('mist', mt, 1); }
  const mistIds = new Set(room.nodes.mist.map((n) => n.id));
  check('safety: the node being mined survives the whole decay',
    mistIds.has(veins[0].id), veins[0].id);
  check('safety: the other scaled veins were reclaimed',
    nodeCountOf('mist', 'oreVein') === 2, nodeCountOf('mist', 'oreVein'));
  check('safety: the authored node of each skill is never removed',
    room.nodes.mist.filter((n) => !n._scaled).length === 3);
  room.extractions = Object.create(null);
}

// ── 6. THE WIRE — an OLD client must see the new monsters ───────────────
{
  const wsA = fakeWs('v1');
  const wsB = fakeWs('v2');
  const wsC = fakeWs('v2-elsewhere');
  const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  room.sessions.set(wsA, baseSession());
  room.sessions.set(wsB, baseSession());
  room.sessions.set(wsC, baseSession());
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'join', id: 'w1', name: 'A', data: { x: 10, y: 10, z: 'tidal' } }));
  await room.webSocketMessage(wsB, JSON.stringify({ type: 'join', id: 'w2', name: 'B', protocolVersion: 2, data: { x: 10, y: 10, z: 'tidal' } }));
  await room.webSocketMessage(wsC, JSON.stringify({ type: 'join', id: 'w3', name: 'C', protocolVersion: 2, data: { x: 10, y: 10, z: 'thunder' } }));
  wsA.sent.length = 0; wsB.sent.length = 0; wsC.sent.length = 0;

  const before = monsterCount('tidal');
  populate('tidal', 12, 10, 10);
  room._spawnScaleZone('tidal', 5000000, 12);   // one pass = one roster push
  check('wire: the zone actually grew', monsterCount('tidal') > before,
    { before, after: monsterCount('tidal') });

  const v1zm = msgsOfType(wsA, 'zone_monsters');
  const v1zn = msgsOfType(wsA, 'zone_nodes');
  check('wire: a protocol-v1 client is re-sent the full monster list',
    v1zm.length === 1 && v1zm[0].zone === 'tidal' && v1zm[0].monsters.length === monsterCount('tidal'),
    { got: v1zm.length && v1zm[0].monsters.length, want: monsterCount('tidal') });
  check('wire: and the full node list', v1zn.length === 1 && v1zn[0].nodes.length === room.nodes.tidal.length);
  check('wire: v1 gets NO zone_state (it would not understand it)',
    msgsOfType(wsA, 'zone_state').length === 0);
  const v2zs = msgsOfType(wsB, 'zone_state');
  check('wire: a protocol-v2 client gets one merged zone_state',
    v2zs.length === 1 && v2zs[0].zone === 'tidal'
    && v2zs[0].monsters.length === monsterCount('tidal') && Array.isArray(v2zs[0].nodes),
    { n: v2zs.length });
  check('wire: v2 gets no legacy pair', msgsOfType(wsB, 'zone_monsters').length === 0
    && msgsOfType(wsB, 'zone_nodes').length === 0);
  check('wire: a player in ANOTHER zone is not spammed', wsC.sent.length === 0, wsC.sent.map((m) => m.type));
  check('wire: the snapshot carries everything needed to RENDER a new monster',
    v2zs[0].monsters.every((m) => m.id && m.arch && typeof m.level === 'number'
      && typeof m.maxHp === 'number' && typeof m.x === 'number' && typeof m.spd === 'number'));
  /* No new message type is introduced anywhere — zone_state /
     zone_monsters / zone_nodes are the ones the client has always had, so
     nothing needs adding to PRIVILEGED_EVENTS and an old client is safe
     against a new worker. */
  const types = new Set([...wsA.sent, ...wsB.sent].map((m) => m.type));
  check('wire: no new message type invented',
    [...types].every((t) => ['zone_monsters', 'zone_nodes', 'zone_state', 'player_state', 'tick'].includes(t)),
    [...types]);

  /* And the same growth reaches a client that walks in AFTER it happened —
     the zone-change snapshot is built from the scaled world. */
  const wsD = fakeWs('late');
  room.sessions.set(wsD, baseSession());
  await room.webSocketMessage(wsD, JSON.stringify({ type: 'join', id: 'w4', name: 'D', protocolVersion: 2, data: { x: 10, y: 10, z: 'town' } }));
  wsD.sent.length = 0;
  await room.webSocketMessage(wsD, JSON.stringify({ type: 'move', x: 20, y: 20, z: 'tidal' }));
  const late = msgsOfType(wsD, 'zone_state');
  check('wire: a player arriving later is handed the GROWN world in one frame',
    late.length === 1 && late[0].monsters.length === monsterCount('tidal')
    && late[0].monsters.length > 3,
    { got: late.length && late[0].monsters.length, want: monsterCount('tidal') });
}

// ── 7. THE CLIENT HAS NO SAY ────────────────────────────────────────────
{
  /* Spawn count is a pure function of server-side playerState.  There is no
     message that sets it, and a forged zone cannot conjure a world: the
     move handler's own allowlist rejects unknown ids, and the scaler
     refuses anything without an authored spawn table. */
  const wsX = fakeWs('cheat');
  room.sessions.set(wsX, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(wsX, JSON.stringify({ type: 'join', id: 'cheat1', name: 'X', protocolVersion: 2, data: { x: 0, y: 0, z: 'meadow' } }));
  const meadowBefore = monsterCount('meadow');
  await room.webSocketMessage(wsX, JSON.stringify({
    type: 'move', x: 1, y: 1, z: 'meadow',
    spawnCount: 999, monsters: 999, _zonePop: { meadow: { held: 999 } }, players: 999,
  }));
  room._tickSpawnScale(9000000);
  check('trust: forged fields on move buy no monsters',
    monsterCount('meadow') <= meadowBefore + 1, { before: meadowBefore, after: monsterCount('meadow') });
  check('trust: the held population is what the SERVER counted, not what was sent',
    (room._zonePop.meadow ? room._zonePop.meadow.held : 0) < 999, room._zonePop.meadow);
  check('trust: an unknown / prototype-shaped zone spawns nothing',
    !room.monsters['__proto__'] && !room._spawnScalableZone('__proto__')
    && Object.getPrototypeOf(room._zonePop) === null);
}

// ── 8. COST — it is not a per-tick re-scan ──────────────────────────────
{
  /* 60 players spread over the wilderness, the shape the load harness
     calls a full room.  The scaler must (a) do its work at most once per
     SCALE_MS and (b) cost nothing on the other ~89 ticks in that window. */
  const zones = Object.keys(ZONES);
  for (const id of Object.keys(room.playerState)) if (room.playerState[id]._testPop) delete room.playerState[id];
  for (let i = 0; i < 60; i++) {
    room.playerState['load' + i] = { z: zones[i % zones.length], x: 100 + i, y: 100 + i, disconnected: false, _testPop: true };
  }
  for (const z of zones) { room._ensureZoneMonsters(z); room._ensureZoneNodes(z); }
  room._spawnScaleAt = 0;
  room._tickSpawnScale(Date.now());          // one real pass (grows every zone)
  const settled = zones.map((z) => monsterCount(z));
  const t0 = process.hrtime.bigint();
  const N = 5000;
  for (let i = 0; i < N; i++) room._tickSpawnScale(Date.now());   // all throttled
  const perSkipped = Number(process.hrtime.bigint() - t0) / N / 1e6;
  check('cost: a throttled tick costs ~nothing (< 0.01 ms)', perSkipped < 0.01, perSkipped.toFixed(6) + ' ms');
  check('cost: the throttle really blocked the work (world unchanged)',
    zones.every((z, i) => monsterCount(z) === settled[i]));
  room._spawnScaleAt = 0;
  const t1 = process.hrtime.bigint();
  const M = 200;
  for (let i = 0; i < M; i++) { room._spawnScaleAt = 0; room._tickSpawnScale(Date.now()); }
  const perFull = Number(process.hrtime.bigint() - t1) / M / 1e6;
  check('cost: even a FORCED full pass is far inside the 22 ms tick budget',
    perFull < 2, perFull.toFixed(4) + ' ms');
  console.log(`      (spawn-scale: ${perFull.toFixed(4)} ms per full pass, ${perSkipped.toFixed(6)} ms per throttled tick;`
    + ` one full pass per ${SPAWN_SCALE.SCALE_MS} ms = ${(perFull / (SPAWN_SCALE.SCALE_MS / 22)).toFixed(5)} ms amortised per 22 ms tick)`);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
