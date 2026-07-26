/* Tick-housekeeping test (v2.3.1142, PR "core test safety net").
 * The tick functions run the whole world simulation and had zero
 * dedicated coverage (only the non-CI load-tick.mjs perf harness ever
 * exercised them).  Never starts startTickLoop (real 22 ms interval;
 * load-tick.mjs remains the manual load harness) -- every _tick*() is
 * invoked directly, the established convention from combat-lifecycle.
 * Checks:
 *   1.  _tickMonsters aggro: a monster inside MONSTER_AGGRO_RANGE
 *       chases (distance shrinks) and is marked dirty in BOTH the v1
 *       zone set and the v2 per-entity set (dual-protocol invariant).
 *   2.  In attack range: monster_attack emitted with server-applied
 *       dmgTaken, victim hp reduced, atkCd stamped.
 *   3.  Blocking victim: attack skipped, blocked:true event with
 *       staminaDrain, 15 stamina deducted, hp untouched.
 *   4.  Respawn: past respawnAt revives at spawnX/Y with full hp and
 *       dirties both dirty structures; respawnAt=0 (the dungeon
 *       noRespawn stamp) stays dead forever.
 *   5.  Variant transform: mummy at <=50% hp becomes skeleton, emits
 *       monster_transform, takes the skeleton speed.
 *   6.  _tickNodes: depleted node with past respawnAt revives (both
 *       dirty structures).
 *   7.  _tickLoot: monster-kill pile past LOOT_EXPIRY_MS despawns with
 *       a loot_despawn event; a pile with its own future `expiry`
 *       (death-drop contract) survives the same sweep.
 *   8.  _tickPlayerRespawn: dying player past respawnAt revives in
 *       town at full pools, death-wiped inventory, player_respawned
 *       sent.
 * Wander is frozen via m._wanderPausedUntil (the combat-lifecycle
 * convention) and the test player + target monster are teleported to
 * an isolated corner so the other spawns can't interfere. */
import { GameRoom } from '../src/index.js';
import { ZONES as SERVER_ZONES } from '../src/data.js';
// v2.3.1147: the client zone table imports cleanly in node (pure data
// ESM) -- the lockstep section at the bottom pins it against the
// server's copy.
import { ZONES as CLIENT_ZONES } from '../../src/data/zones.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}
const clearDirty = () => {
  room.dirtyMonsters.clear();
  room.dirtyMonsterIds = {};
  room.dirtyNodes.clear();
  room.dirtyNodeIds = {};
  room.eventBuffer.length = 0;
};
const FAR = 5000; // isolated corner, far from every random spawn

const ws = fakeWs('t');
await join(ws, 'bp_tk_a');
const ps = room.playerState['bp_tk_a'];
ps.z = 'meadow';
ps.x = -100000; ps.y = -100000; // out of everyone's aggro until placed
ps.dead = false;
ps.agility = 0;               // no passive dodge -> deterministic damage
ps._zoneEntryGraceUntil = 0;  // no entry immunity
ps.defenseSpec = {};          // no Iron Skin cut
ps.maxHp = 100; ps.hp = 100;
ps.maxStamina = 100; ps.stamina = 100;

const monsters = room._ensureZoneMonsters('meadow');
check('meadow lazily spawns monsters', monsters.length > 0, monsters.length);
for (const m of monsters) m._wanderPausedUntil = Date.now() + 600000; // freeze wander
const m0 = monsters[0];
m0.x = m0.spawnX = FAR; m0.y = m0.spawnY = FAR;

// ── 1. aggro chase + dual-protocol dirty marking ──
ps.x = FAR + 100; ps.y = FAR; // inside MONSTER_AGGRO_RANGE (120), outside ATTACK_RANGE (45)
clearDirty();
const distBefore = Math.abs(ps.x - m0.x);
room._tickMonsters();
const distAfter = Math.abs(ps.x - m0.x);
check('aggro: monster chases the nearest player (distance shrinks)', distAfter < distBefore, { distBefore, distAfter });
check('chase dirties BOTH v1 zone set and v2 entity set (dual-protocol invariant)',
  room.dirtyMonsters.has('meadow') && room.dirtyMonsterIds.meadow && room.dirtyMonsterIds.meadow.has(m0.id),
  { v1: [...room.dirtyMonsters], v2: room.dirtyMonsterIds.meadow && [...room.dirtyMonsterIds.meadow] });

// ── 2. in-range attack ──
m0.x = FAR; m0.y = FAR; // reset drift from the chase tick
ps.x = FAR + 30; ps.y = FAR; // attackDist 30 <= 45
ps.blocking = false;
m0.atkCd = 0;
clearDirty();
room._tickMonsters();
const atk = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
check('attack: monster_attack emitted with server-applied dmgTaken', !!atk && atk.payload.targetId === 'bp_tk_a' && atk.payload.dmgTaken > 0, atk && atk.payload);
check('attack: victim hp reduced by exactly dmgTaken', !!atk && ps.hp === 100 - atk.payload.dmgTaken, { hp: ps.hp });
check('attack: cooldown stamped (no machine-gun swings)', m0.atkCd > Date.now(), m0.atkCd);

// ── 3. blocking victim ──
ps.hp = 100; ps.stamina = 100; ps.blocking = true;
m0.atkCd = 0;
clearDirty();
room._tickMonsters();
const blk = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
check('block: event flagged blocked with the stamina drain on the wire', !!blk && blk.payload.blocked === true && blk.payload.staminaDrain === 15 && blk.payload.dmgTaken === 0, blk && blk.payload);
check('block: 15 stamina deducted server-side, hp untouched', ps.stamina === 85 && ps.hp === 100, { stamina: ps.stamina, hp: ps.hp });

// ── 3b. Bulwark block-stamina efficiency (v2.3.1343: -1%/pt, cap
// -100%) discounts the per-blocked-hit cost, and the DISCOUNTED number
// rides the wire so pre-fix clients render it correctly.  At the cap
// the Math.max(1, …) floor holds the cost at 1 — blocking is never
// TRULY free (the anti-turtle backstop). ──
ps.stamina = 100; ps.defenseSpec = { bulwark: 100 };
m0.atkCd = 0;
clearDirty();
room.eventBuffer.length = 0;
room._tickMonsters();
const blkBw = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
check('bulwark: 100 pts (cap) floor the block cost at 1 on the wire',
  !!blkBw && blkBw.payload.blocked === true && blkBw.payload.staminaDrain === 1, blkBw && blkBw.payload);
check('bulwark: floored cost deducted server-side', ps.stamina === 99, ps.stamina);
ps.defenseSpec = {};
ps.blocking = false;

// ── 4. respawn + the noRespawn guard ──
m0.alive = false; m0.hp = 0; m0.respawnAt = Date.now() - 1; m0.x = 9999; m0.y = 9999;
const m1 = monsters[1];
m1.alive = false; m1.hp = 0; m1.respawnAt = 0; // the dungeon noRespawn stamp
ps.x = -100000; ps.y = -100000; // out of aggro so the revived monster stands still
clearDirty();
room._tickMonsters();
check('respawn: past respawnAt revives at spawn with full hp',
  m0.alive === true && m0.hp === m0.maxHp && m0.x === m0.spawnX && m0.y === m0.spawnY);
check('respawn dirties BOTH dirty structures',
  room.dirtyMonsters.has('meadow') && room.dirtyMonsterIds.meadow.has(m0.id));
check('respawnAt=0 stays dead (noRespawn contract, dungeon guard)', m1.alive === false);

// ── 5. variant transform (sky mummies -> skeleton at 50%) ──
ps.z = 'sky';
const skyMonsters = room._ensureZoneMonsters('sky');
for (const m of skyMonsters) m._wanderPausedUntil = Date.now() + 600000;
const mummy = skyMonsters.find((m) => m.variant === 'mummy');
check('sky remaps spawns to the mummy variant', !!mummy, skyMonsters.map((m) => m.variant));
if (mummy) {
  mummy.hp = Math.floor(mummy.maxHp * 0.49);
  clearDirty();
  room._tickMonsters();
  const tx = room.eventBuffer.find((e) => e.type === 'monster_transform' && e.payload.id === mummy.id);
  check('transform: mummy at <=50% becomes skeleton + event emitted',
    !!tx && tx.payload.fromVariant === 'mummy' && tx.payload.toVariant === 'skeleton' && mummy.variant === 'skeleton',
    tx && tx.payload);
  check('transform: skeleton speed applied (server drives the pace)', mummy.spd === 1.4, mummy.spd);
}
ps.z = 'meadow';

// ── 6. node respawn ──
const nodes = room._ensureZoneNodes('meadow');
check('meadow lazily spawns gather nodes', nodes.length > 0, nodes.length);
const n0 = nodes[0];
n0.alive = false; n0.respawnAt = Date.now() - 1;
clearDirty();
room._tickNodes();
check('node respawn: revived + respawnAt cleared + dirty in both structures',
  n0.alive === true && n0.respawnAt === 0
  && room.dirtyNodes.has('meadow') && room.dirtyNodeIds.meadow.has(n0.id));

// ── 7. loot expiry ──
const realRandom = Math.random;
Math.random = () => 0.999; // no shard, no weapon on these piles
const oldPile = room._spawnLootForKill('meadow', { id: 'tk-old', arch: 'fodder', level: 1, x: 0, y: 0, gold: 5 }, 'bp_tk_a', ['bp_tk_a'], { bp_tk_a: 1 });
const keptPile = room._spawnLootForKill('meadow', { id: 'tk-keep', arch: 'fodder', level: 1, x: 0, y: 0, gold: 5 }, 'bp_tk_a', ['bp_tk_a'], { bp_tk_a: 1 });
Math.random = realRandom;
oldPile.ts = Date.now() - room.LOOT_EXPIRY_MS - 1000;
keptPile.ts = Date.now() - room.LOOT_EXPIRY_MS - 1000;
keptPile.expiry = Date.now() + 60000; // own expiry (death-drop contract) overrides ts
clearDirty();
room._tickLoot();
check('loot expiry: stale pile despawns with a loot_despawn event',
  !room.loot.meadow.find((p) => p.lootId === oldPile.lootId)
  && room.eventBuffer.some((e) => e.type === 'loot_despawn' && e.payload.lootId === oldPile.lootId));
check('loot expiry: a pile with its own future expiry survives the sweep',
  !!room.loot.meadow.find((p) => p.lootId === keptPile.lootId));

// ── 8. player respawn ──
ps.dying = true; ps.dead = true; ps.respawnAt = Date.now() - 1;
ps.hp = 0; ps.inventory = { fish_minnow: 3 };
ws.sent.length = 0;
room._tickPlayerRespawn();
check('player respawn: pools refilled, town teleport, death flags cleared',
  ps.hp === ps.maxHp && ps.stamina === ps.maxStamina && ps.mana === ps.maxMana
  && ps.dying === false && ps.dead === false && ps.z === 'town' && ps.respawnAt === 0);
check('player respawn: inventory wiped again (defense-in-depth vs late ticks)',
  Object.keys(ps.inventory).length === 0);
check('player respawn: player_respawned sent to the victim',
  msgsOfType(ws, 'player_respawned').length === 1 && msgsOfType(ws, 'player_respawned')[0].payload.zone === 'town');

// ── 9. v2.3.1147: mid-band zone content + client/server lockstep ──
// verdant/mist owned [22,40] but spawned NOTHING -- the L25-38 dead
// band.  Pins: both zones spawn, levels stay inside band-floor-4
// (entrance ramp) .. band-ceiling, and every spawn maps to one of the
// new tinted variants.
const EXPECTED_VARIANTS = {
  verdant: ['mossSlime', 'thornShambler'],
  mist: ['mireWisp', 'bogLurker'],
};
for (const zid of ['verdant', 'mist']) {
  const zm = room._ensureZoneMonsters(zid);
  const band = SERVER_ZONES[zid].level;
  check(zid + ' spawns monsters (mid-band hole closed)', zm.length > 0, zm.length);
  check(zid + ' levels within [floor-4, ceiling] (entrance ramp honored)',
    zm.every((m) => m.level >= band[0] - 4 && m.level <= band[1]),
    zm.map((m) => m.level));
  check(zid + ' spawns map to the new variants',
    zm.every((m) => EXPECTED_VARIANTS[zid].includes(m.variant)),
    [...new Set(zm.map((m) => m.variant))]);
  check(zid + ' variants have a server speed entry (client/server pace sync)',
    zm.every((m) => typeof m.spd === 'number' && m.spd > 0), zm.map((m) => m.spd));
}
// monster_transform joined the deny-list (pre-existing forgery hole).
room.eventBuffer.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_transform', payload: { id: 'sm-sky-0', fromVariant: 'mummy', toVariant: 'skeleton' } }));
check('forged monster_transform dropped by deny-list',
  room.eventBuffer.filter((e) => e.type === 'monster_transform').length === 0);

// LOCKSTEP: the client and server ZONES tables must agree on level
// bands and spawn tables -- a mismatch desyncs damage prediction and
// trips the client's level clamp.  This has burned the repo before;
// now it's pinned by CI.  (v2.3.1151: every OTHER mirrored table is
// audited by test/mirror-audit.test.mjs; ZONES stays here because the
// depth-lerp checks above already import both sides.)
{
  let lockstep = true;
  const detail = {};
  for (const [zid, sz] of Object.entries(SERVER_ZONES)) {
    const cz = CLIENT_ZONES[zid];
    if (!cz) { lockstep = false; detail[zid] = 'missing on client'; continue; }
    if (cz.level[0] !== sz.level[0] || cz.level[1] !== sz.level[1]) {
      lockstep = false; detail[zid] = { server: sz.level, client: cz.level };
    }
    const sSpawns = JSON.stringify((sz.spawns || []).map((s) => [s.arch, s.count]));
    const cSpawns = JSON.stringify((cz.spawns || []).map((s) => [s.arch, s.count]));
    if (sSpawns !== cSpawns) { lockstep = false; detail[zid] = { serverSpawns: sSpawns, clientSpawns: cSpawns }; }
  }
  check('client/server ZONES lockstep (bands + spawns identical)', lockstep, detail);
}

// ── 10. v2.3.1163: event-buffer overflow keeps the remainder ──
// A burst past EVENTS_PER_TICK_CAP used to be dropped (slice + wipe);
// now the flush splices, so the overflow is delayed one tick instead
// of lost.  This is the one section that actually starts
// startTickLoop (the flush lives inline in the interval closure);
// the loop is stopped immediately after the window.
{
  const state2 = makeState();
  const room2 = new GameRoom(state2, mockEnv);
  const ws2 = fakeWs('ovf');
  room2.sessions.set(ws2, baseSession());
  await room2.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'bp_tk_ovf', name: 'T', phrase: 'p-ovf', data: { x: -100000, y: -100000, z: 'town' } }));
  ws2.sent.length = 0;
  room2.eventBuffer.length = 0;
  const N = room2.EVENTS_PER_TICK_CAP + 1; // 501
  for (let i = 0; i < N; i++) room2.eventBuffer.push({ type: 'qa_overflow', payload: { i } });
  room2.startTickLoop();
  await new Promise((r) => setTimeout(r, room2.TICK_RATE * 6));
  clearInterval(room2.tickInterval);
  // World-sim noise (monster events) can ride the same ticks; count
  // only the qa_overflow markers per tick message.
  const perTick = ws2.sent
    .filter((m) => m.type === 'tick' && Array.isArray(m.events))
    .map((m) => m.events.filter((e) => e.type === 'qa_overflow').length)
    .filter((n) => n > 0);
  const total = perTick.reduce((a, b) => a + b, 0);
  check('overflow: all 501 events delivered (none dropped)', total === N, { total, perTick });
  check('overflow: first flush honors the 500 cap', perTick[0] === room2.EVENTS_PER_TICK_CAP, perTick);
  check('overflow: remainder arrives on a later tick', perTick.length >= 2 && perTick[perTick.length - 1] >= 1, perTick);
}

// ── 11. v2.3.1502: interest management (zone-scoped broadcasts) ──
//
// The tick used to fan every dirty zone's entities to every socket;
// measured, ~85% of egress was data the receiver's own client threw
// away (wsClient reads only msg.monsters[myZone]; entityRenderer skips
// out-of-zone peers).  Entities are scoped to the receiver's zone now.
// Pins: the scoping itself, the v1/v2 split SURVIVING the scoping, the
// dungeon-leak closure, and that `events` stay room-wide on purpose.
{
  const state3 = makeState();
  const room3 = new GameRoom(state3, mockEnv);
  const wsM = fakeWs('in-meadow');       // v2, meadow
  const wsF = fakeWs('in-frost');        // v2, frost
  const wsL = fakeWs('legacy-meadow');   // v1, meadow
  room3.sessions.set(wsM, baseSession());
  room3.sessions.set(wsF, baseSession());
  room3.sessions.set(wsL, baseSession());
  await room3.webSocketMessage(wsM, JSON.stringify({ type: 'join', id: 'bp_zm', name: 'M', phrase: 'p-zm', protocolVersion: 2, data: { x: -100000, y: -100000, z: 'meadow' } }));
  await room3.webSocketMessage(wsF, JSON.stringify({ type: 'join', id: 'bp_zf', name: 'F', phrase: 'p-zf', protocolVersion: 2, data: { x: -100000, y: -100000, z: 'frost' } }));
  await room3.webSocketMessage(wsL, JSON.stringify({ type: 'join', id: 'bp_zl', name: 'L', phrase: 'p-zl', data: { x: -100000, y: -100000, z: 'meadow' } }));

  // Dirty one monster in each zone, plus a private dungeon instance.
  // Wander is frozen (the file-header convention) so the AI can't dirty
  // extra entities mid-window and blur the v1-full / v2-delta contrast;
  // the players sit at -100000 so nothing aggros either.
  const freeze = (list) => { for (const m of list) m._wanderPausedUntil = Date.now() + 60000; };
  const mMeadow = room3._ensureZoneMonsters('meadow')[0];
  const mFrost = room3._ensureZoneMonsters('frost')[0];
  freeze(room3.monsters.meadow);
  freeze(room3.monsters.frost);
  room3.monsters['dungeon:secret'] = [{ ...mMeadow, id: 'dg-1' }];
  freeze(room3.monsters['dungeon:secret']);
  // _ensureZoneMonsters dirties the WHOLE zone on first spawn; reset so
  // the assertions below see exactly the one entity each test marks.
  room3.dirtyMonsters.clear();
  room3.dirtyNodes.clear();
  room3.dirtyMonsterIds = {};
  room3.dirtyNodeIds = {};
  room3._markMonsterDirty('meadow', mMeadow.id);
  room3._markMonsterDirty('frost', mFrost.id);
  room3._markMonsterDirty('dungeon:secret', 'dg-1');
  room3.eventBuffer.push({ type: 'qa_social', payload: { hi: 1 } });

  wsM.sent.length = 0; wsF.sent.length = 0; wsL.sent.length = 0;
  room3.tickSeq = 1; // not a presence tick -> pure zone-scoped frame
  room3.startTickLoop();
  await new Promise((r) => setTimeout(r, room3.TICK_RATE * 3));
  clearInterval(room3.tickInterval); room3.tickInterval = null;

  const zonesSeenBy = (w) => {
    const z = new Set();
    for (const m of w.sent) {
      if (m.type === 'tick' && m.monsters) for (const k of Object.keys(m.monsters)) z.add(k);
    }
    return [...z];
  };
  const zM = zonesSeenBy(wsM), zF = zonesSeenBy(wsF), zL = zonesSeenBy(wsL);

  check('scoping: meadow player receives ONLY meadow monsters',
    zM.length === 1 && zM[0] === 'meadow', zM);
  check('scoping: frost player receives ONLY frost monsters',
    zF.length === 1 && zF[0] === 'frost', zF);
  check('scoping: v1 legacy session is scoped the same way',
    zL.length === 1 && zL[0] === 'meadow', zL);
  check('scoping: dungeon instance no longer leaks to the room',
    !zM.includes('dungeon:secret') && !zF.includes('dungeon:secret'),
    { zM, zF });

  // The v1/v2 contract must survive the scoping: v1 gets EVERY monster
  // in its zone, v2 only the ones marked dirty this tick.
  const monstersFor = (w) => {
    for (const m of w.sent) {
      if (m.type === 'tick' && m.monsters && m.monsters.meadow) return m.monsters.meadow;
    }
    return null;
  };
  const v2List = monstersFor(wsM), v1List = monstersFor(wsL);
  check('scoping: v2 still gets per-entity deltas (dirty only)',
    v2List && v2List.length === 1 && v2List[0].id === mMeadow.id, v2List && v2List.length);
  check('scoping: v1 still gets the full zone list',
    v1List && v1List.length === room3.monsters.meadow.length,
    { got: v1List && v1List.length, want: room3.monsters.meadow.length });

  // Events are deliberately NOT scoped -- they measured at 1% of
  // egress and mix zone-local combat with room-wide social relays.
  const gotSocial = (w) => w.sent.some((m) => m.type === 'tick'
    && Array.isArray(m.events) && m.events.some((e) => e.type === 'qa_social'));
  check('scoping: events stay room-wide (social relays unaffected)',
    gotSocial(wsM) && gotSocial(wsF) && gotSocial(wsL),
    { m: gotSocial(wsM), f: gotSocial(wsF), l: gotSocial(wsL) });

  // Presence roster: tickSeq 0 carries EVERY player to EVERY session,
  // which is what keeps the client's 10s ghost-sweep from deleting
  // out-of-zone peers and collapsing the online count.
  wsM.sent.length = 0;
  room3.tickSeq = 0;
  room3.startTickLoop();
  await new Promise((r) => setTimeout(r, room3.TICK_RATE * 2));
  clearInterval(room3.tickInterval); room3.tickInterval = null;
  const rosterMsg = wsM.sent.find((m) => m.type === 'tick' && m.players && m.players.bp_zf);
  check('presence roster: out-of-zone peer reaches the meadow session',
    !!rosterMsg, rosterMsg && Object.keys(rosterMsg.players));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
