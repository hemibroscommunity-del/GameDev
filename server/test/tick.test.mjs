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
import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from '../src/data.js'; /* v2.3.1704: NOT from index.js — see the note on the flag */
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
  room.dirtyMonsterIds = Object.create(null); /* v2.3.1631: mirror production (TRAPS #6) */
  room.dirtyNodes.clear();
  room.dirtyNodeIds = Object.create(null); /* v2.3.1631: mirror production (TRAPS #6) */
  room.eventBuffer.length = 0;
};
const FAR = 5000; // isolated corner, far from every random spawn

const ws = fakeWs('t');
await join(ws, 'bp_tk_a');
const ps = room.playerState['bp_tk_a'];

/* v2.3.1659 (prog3): every joining player is respecced onto the
   trained-skill track now.  THIS SUITE PINS THE LEGACY PATH (bulwark
   block costs, channel regen flats) — still live code for any blob
   whose v10 migration fail-opens — so the fixture opts out of prog3
   and re-derives the legacy pools.  prog3.test.mjs covers the new
   path. */
delete ps.prog3;
room._recomputeMaxes(ps);
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
/* v2.3.1812: m0 is meadow FODDER, and fodder gained a wind-up in this
   version (server/src/telegraph.js).  Every attack assertion in this file
   is about the BASIC SWING — dmgTaken, the cooldown stamp, the block price
   — so the cast is pinned off rather than letting a `lunge` answer for the
   swing.  Re-pinned before each attack tick because a resolved cast writes
   _tgNextAt itself.  Telegraph behaviour has its own coverage in
   combat-lifecycle.test.mjs. */
const swingOnly = () => {
  m0._tgPhase = null; m0._tgUntil = 0; m0._tgAim = null; m0._tgTarget = null;
  m0._tgNextAt = Date.now() + 1e9;
};
swingOnly();

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
m0.atkCd = 0; swingOnly();
clearDirty();
room._tickMonsters();
const atk = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
check('attack: monster_attack emitted with server-applied dmgTaken', !!atk && atk.payload.targetId === 'bp_tk_a' && atk.payload.dmgTaken > 0, atk && atk.payload);
check('attack: victim hp reduced by exactly dmgTaken', !!atk && ps.hp === 100 - atk.payload.dmgTaken, { hp: ps.hp });
check('attack: cooldown stamped (no machine-gun swings)', m0.atkCd > Date.now(), m0.atkCd);

// ── 3. blocking victim ──
ps.hp = 100; ps.stamina = 100; ps.blocking = true;
m0.atkCd = 0; swingOnly();
clearDirty();
room._tickMonsters();
const blk = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
/* v2.3.1704: the melee twins of the combat-lifecycle / dungeon block
   assertions — they read BLOCK_COSTS_STAMINA so the suite pins whichever mode
   is shipping (the owner suspended the cost for the demo).  What must hold in
   BOTH modes is the block itself: flagged blocked, zero damage, hp untouched.
   Only the price moves. */
check('block: event flagged blocked, damage fully negated',
  !!blk && blk.payload.blocked === true && blk.payload.dmgTaken === 0, blk && blk.payload);
/* v2.3.1731: the price is read from BLOCK_STAMINA_COST rather than re-typed.
   This assertion said 15 and broke the moment the cost was retuned to 10 —
   and re-typing 10 would just re-arm it for the next retune.  What is being
   pinned is that the deduction and the wire number AGREE with the shipped
   constant, which is the property that actually matters. */
check(BLOCK_COSTS_STAMINA
  ? `block: ${BLOCK_STAMINA_COST} stamina deducted server-side and put on the wire, hp untouched`
  : 'block: free, no drain field on the wire, hp untouched (v2.3.1704 demo flag)',
  ps.hp === 100 && (BLOCK_COSTS_STAMINA
    ? (ps.stamina === 100 - BLOCK_STAMINA_COST && blk.payload.staminaDrain === BLOCK_STAMINA_COST)
    : (ps.stamina === 100 && blk.payload.staminaDrain === undefined)),
  { stamina: ps.stamina, hp: ps.hp, drain: blk && blk.payload.staminaDrain });

// ── 3b. Bulwark block-stamina efficiency (v2.3.1343: -1%/pt, cap
// -100%) discounts the per-blocked-hit cost, and the DISCOUNTED number
// rides the wire so pre-fix clients render it correctly.  At the cap
// the Math.max(1, …) floor holds the cost at 1 — blocking is never
// TRULY free (the anti-turtle backstop). ──
ps.stamina = 100; ps.defenseSpec = { bulwark: 100 };
m0.atkCd = 0; swingOnly();
clearDirty();
room.eventBuffer.length = 0;
room._tickMonsters();
const blkBw = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === m0.id);
/* v2.3.1704: with the demo flag off nothing is charged, so the anti-turtle
   floor is asserted against the PRICING HELPER — the maths is untouched and
   still pinned for whoever flips the flag back. */
check(BLOCK_COSTS_STAMINA
  ? 'bulwark: 100 pts (cap) floor the block cost at 1 on the wire'
  : 'bulwark: the 1-stamina floor survives the demo flag (pricing intact)',
  BLOCK_COSTS_STAMINA
    ? (!!blkBw && blkBw.payload.blocked === true && blkBw.payload.staminaDrain === 1)
    : (!!blkBw && blkBw.payload.blocked === true
       && Math.max(1, Math.round(15 * room._blockStaminaMult(ps))) === 1),
  blkBw && blkBw.payload);
check(BLOCK_COSTS_STAMINA
  ? 'bulwark: floored cost deducted server-side'
  : 'bulwark: nothing deducted server-side (v2.3.1704 demo flag)',
  BLOCK_COSTS_STAMINA ? ps.stamina === 99 : ps.stamina === 100, ps.stamina);
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
// v2.3.1534: verdant's brute (thornShambler, the rock monster) was removed
// on owner request, so the zone is slimes only.
// v2.3.1535: and ONE of those slimes is the fast/squishy blueSlime, pinned
// by a per-spawn-entry variant override rather than the archetype map.
const EXPECTED_VARIANTS = {
  verdant: ['blueSlime'],
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
/* v2.3.1675 (owner: "make the slimes in verdant wilds blue ... this is to make
   them stand out against the background").  The zone is ALL blue now — the
   mossy green reskin was camouflage against a green forest floor, which is
   fine for a slime and useless for a player trying to find one.
   The v2.3.1535 shape this replaces pinned "exactly ONE blue standout among
   greens".  That is deliberately gone, and the checks below are the ones that
   still mean something: the whole zone really is blue (which guards BOTH the
   spawn table and ZONE_VARIANT_MAP — either one left on mossSlime and the
   zone goes green again), and blueSlime's two stat multipliers still apply,
   since they live in different functions and could drift apart.
   Note this makes the WHOLE zone fast-and-squishy rather than one standout in
   a slow crowd; that is a real difficulty change and it is intended. */
{
  const zm = room._ensureZoneMonsters('verdant');
  const blues = zm.filter((m) => m.variant === 'blueSlime');
  check('verdant: every slime is blue', blues.length === zm.length,
    { blue: blues.length, total: zm.length, variants: [...new Set(zm.map((m) => m.variant))] });
  check('verdant: no green slimes remain',
    !zm.some((m) => m.variant === 'mossSlime'), zm.map((m) => m.variant));
  /* The stat multipliers, compared against the BASE fodder the Meadow spawns
     — the green ones are gone, so the meaningful comparison moved zones. */
  const meadow = room._ensureZoneMonsters('meadow');
  const plain = meadow.filter((m) => m.arch === 'fodder');
  check('blue slime is FASTER than a plain slime',
    blues[0] && plain[0] && blues[0].spd > plain[0].spd,
    { blue: blues[0] && blues[0].spd, plain: plain[0] && plain[0].spd });
  check('blue slime maxHp stays >= 1 (multiplier can never zero it out)',
    blues.every((b) => b.maxHp >= 1), blues.map((b) => b.maxHp));
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

// ── 11. v2.3.1575: interest management (zone-scoped broadcasts) ──
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
  /* v2.3.1576: freezing wander is NOT enough to hold a zone still.  The
     de-overlap pass in _tickMonsters (index.js, MIN_SEP = 22) runs on every
     tick regardless of the wander pause: any two monsters closer than 22px
     shove each other apart and BOTH get marked dirty.  Spawn positions are
     random, so whether a pair lands inside that radius varied run to run —
     this section failed roughly 1 tick in 7 (measured 7/50 locally, and it
     is what turned CI red on the Tier 0 branch).  The fix is to make the
     precondition deterministic rather than to retry: lay the zone out on a
     40px grid, well outside MIN_SEP, and move each monster's spawn anchor
     with it so the 180px leash pull-back cannot fire either.  Both of the
     only two things that can dirty an idle monster are now excluded, so the
     assertions below see exactly what the test marks. */
  const separate = (list) => {
    list.forEach((m, i) => {
      m.x = m.spawnX = -50000 + (i % 8) * 40;
      m.y = m.spawnY = -50000 + Math.floor(i / 8) * 40;
      m._wanderTx = null; m._wanderTy = null;
    });
  };
  const mMeadow = room3._ensureZoneMonsters('meadow')[0];
  const mFrost = room3._ensureZoneMonsters('frost')[0];
  freeze(room3.monsters.meadow);
  freeze(room3.monsters.frost);
  separate(room3.monsters.meadow);
  separate(room3.monsters.frost);
  room3.monsters['dungeon:secret'] = [{ ...mMeadow, id: 'dg-1' }];
  freeze(room3.monsters['dungeon:secret']);
  // _ensureZoneMonsters dirties the WHOLE zone on first spawn; reset so
  // the assertions below see exactly the one entity each test marks.
  room3.dirtyMonsters.clear();
  room3.dirtyNodes.clear();
  room3.dirtyMonsterIds = Object.create(null);
  room3.dirtyNodeIds = Object.create(null);
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

// ── 12. v2.3.1621: the AFK sweep actually evicts ──
//
// The sweep called ws.close() and nothing else, leaving the session in
// the map.  For the case it exists to handle — a peer that has stopped
// answering — the TCP close never completes, so webSocketClose never
// fired and the session leaked forever: the tick's setInterval was
// never cleared (a DO with a live interval cannot hibernate, so it
// bills wall-clock GB-s with nobody playing), MAX_PLAYERS kept counting
// corpses, and peers never saw player_leave.
//
// Ticks are driven synchronously by capturing the interval callback
// (the load-tick.mjs convention) — the AFK branch only runs on every
// 90th tick, so a real 22 ms interval would make this a 2-second test.
{
  const state4 = makeState();
  const room4 = new GameRoom(state4, mockEnv);

  // A ws that counts close() calls — the old code re-closed dead
  // sockets every ~3 s forever.
  const countingWs = (label) => {
    const w = fakeWs(label);
    w.closes = 0;
    w.close = () => { w.closes++; };
    return w;
  };
  const wsIdle = countingWs('afk');
  const wsLive = countingWs('active');

  let tickFn = null;
  let cleared = null;
  const realSetInterval = globalThis.setInterval;
  const realClearInterval = globalThis.clearInterval;
  globalThis.setInterval = (fn, ms) => {
    // Truthy sentinel: startTickLoop stores this in room.tickInterval,
    // and webSocketClose's teardown is gated on it being truthy — a 0
    // handle would skip the very branch under test.
    if (ms === room4.TICK_RATE && !tickFn) { tickFn = fn; return 987654; }
    return realSetInterval(fn, ms);
  };
  globalThis.clearInterval = (h) => { if (h === 987654) { cleared = h; return; } return realClearInterval(h); };

  room4.sessions.set(wsIdle, baseSession());
  room4.sessions.set(wsLive, baseSession());
  await room4.webSocketMessage(wsIdle, JSON.stringify({ type: 'join', id: 'bp_afk', name: 'Afk', phrase: 'p-afk', data: { x: -100000, y: -100000, z: 'town' } }));
  await room4.webSocketMessage(wsLive, JSON.stringify({ type: 'join', id: 'bp_live', name: 'Live', phrase: 'p-live', data: { x: -100000, y: -100000, z: 'town' } }));
  room4.startTickLoop();

  // Age the idle one past the timeout; keep the other fresh.
  const drive = (n) => { for (let i = 0; i < n; i++) tickFn(); };
  room4.sessions.get(wsIdle).lastRecv = Date.now() - room4.IDLE_TIMEOUT_MS - 1;
  wsLive.sent.length = 0;
  drive(90); // the AFK branch runs on the 90th tick

  check('afk sweep: the idle session is REMOVED from the map',
    !room4.sessions.has(wsIdle), [...room4.sessions.values()].map((s) => s.id));
  check('afk sweep: the active session survives', room4.sessions.has(wsLive));
  check('afk sweep: the idle player\'s state is released',
    room4.playerState['bp_afk'] === undefined, Object.keys(room4.playerState));
  check('afk sweep: peers are told the player left',
    wsLive.sent.some((m) => m.type === 'player_leave' && m.id === 'bp_afk'),
    wsLive.sent.map((m) => m.type).slice(0, 12));
  check('afk sweep: the socket is closed exactly once', wsIdle.closes === 1, wsIdle.closes);

  // The bug's signature: the old code re-closed the same dead socket on
  // every sweep, forever.  Three more sweeps must not touch it again.
  drive(270);
  check('afk sweep: a removed socket is never re-closed', wsIdle.closes === 1, wsIdle.closes);

  // The billing property: evicting the LAST session must stop the tick
  // interval, or the DO can never hibernate.
  check('afk sweep: tick still running while a live session remains',
    cleared === null && room4.tickInterval === 987654, { cleared, handle: room4.tickInterval });
  room4.sessions.get(wsLive).lastRecv = Date.now() - room4.IDLE_TIMEOUT_MS - 1;
  drive(90);
  check('afk sweep: evicting the last session clears the tick interval (DO can hibernate)',
    room4.sessions.size === 0 && cleared === 987654, { size: room4.sessions.size, cleared });

  globalThis.setInterval = realSetInterval;
  globalThis.clearInterval = realClearInterval;
  if (room4.tickInterval && room4.tickInterval !== 987654) realClearInterval(room4.tickInterval);
  room4.tickInterval = null;
}

/* ── v2.3.1631: the per-tick dirty maps must stay NULL-PROTOTYPE ──
 *
 * Review caught that this was unpinned: reverting tick.js's reset from
 * Object.create(null) back to {} left all 42 suites green.  The maps are
 * keyed by zone id, which is client-chosen, and they are REBUILT EVERY
 * TICK -- so a plain {} here quietly undoes the constructor's guarantee
 * one tick later, which is the whole defence-in-depth behind TRAPS #6.
 * This suite also used to assign plain {} to these maps in four places,
 * modelling the very pattern production removed; those now mirror
 * production so a future copy-paste carries the right idiom. */
{
  const rProto = new GameRoom(makeState(), mockEnv);
  rProto.startTickLoop();
  await new Promise((r) => setTimeout(r, 60));
  clearInterval(rProto.tickInterval); rProto.tickInterval = null;
  check('tick: dirtyMonsterIds is null-prototype after a tick reset',
    Object.getPrototypeOf(rProto.dirtyMonsterIds) === null);
  check('tick: dirtyNodeIds is null-prototype after a tick reset',
    Object.getPrototypeOf(rProto.dirtyNodeIds) === null);
  check('tick: the constructor maps are null-prototype too',
    Object.getPrototypeOf(rProto.monsters) === null
    && Object.getPrototypeOf(rProto.nodes) === null
    && Object.getPrototypeOf(rProto.loot) === null);
  /* A '__proto__'-shaped zone key must land as an ordinary own key
     rather than writing through to Object.prototype. */
  rProto.dirtyMonsterIds['__proto__'] = new Set(['m1']);
  check('tick: a __proto__ zone key becomes a normal own entry',
    Object.prototype.hasOwnProperty.call(rProto.dirtyMonsterIds, '__proto__')
    && ({}).m1 === undefined);
}

/* ── v2.3.1701: OUT-OF-COMBAT REGEN IN THE SPOKE (COMBAT) ZONES ──
 *
 * Owner playtest: "a fresh level-1 character in Frost Ridge gets roughly ONE
 * snowman kill per full health bar" — and HP only regenerated in the hubs, so
 * every kill cost a round trip to the World View (7 deaths, 7 heal trips in
 * the measured run).  _tickPlayerRegen now trickles HP in combat zones once
 * the player has been out of combat for SPOKE_REGEN_OOC_MS.
 *
 * The interesting half is what must NOT regenerate: the trickle is gated on
 * both halves of "in combat" — damage TAKEN (lastDamageAt) and damage DEALT
 * (_lastDealtAt).  Without the second stamp a player standing over a slow
 * monster, hitting it and not yet being hit back, heals mid-fight.
 *
 * Uses its own room so the sections above (which leave `ps` in the meadow at
 * odd HP) cannot influence it. */
{
  const stateR = makeState();
  const roomR = new GameRoom(stateR, mockEnv);
  const wsR = fakeWs('regen');
  roomR.sessions.set(wsR, baseSession());
  await roomR.webSocketMessage(wsR, JSON.stringify({ type: 'join', id: 'bp_rg', name: 'R', phrase: 'p-rg', data: { x: -100000, y: -100000, z: 'town' } }));
  const psR = roomR.playerState['bp_rg'];
  psR.maxHp = 100; psR.maxStamina = 100; psR.maxMana = 100;
  psR.stamina = 100; psR.mana = 100;
  const OOC = roomR.SPOKE_REGEN_OOC_MS;
  const outOfCombat = () => {
    psR.lastDamageAt = Date.now() - OOC - 1000;
    psR._lastDealtAt = Date.now() - OOC - 1000;
  };

  // In a combat zone, freshly hit: nothing.
  psR.z = 'frost'; psR.hp = 40;
  psR.lastDamageAt = Date.now(); psR._lastDealtAt = Date.now() - OOC - 1000;
  roomR._tickPlayerRegen();
  check('spoke regen: a player who was just HIT does not regenerate', psR.hp === 40, psR.hp);

  // Just dealt damage (the slow-monster window): still nothing.
  psR.hp = 40;
  psR.lastDamageAt = Date.now() - OOC - 1000; psR._lastDealtAt = Date.now();
  roomR._tickPlayerRegen();
  check('spoke regen: a player still SWINGING does not regenerate (damage-dealt stamp)',
    psR.hp === 40, psR.hp);

  // Out of combat on both counts: the trickle runs.
  psR.hp = 40; outOfCombat();
  roomR._tickPlayerRegen();
  const trickle = psR.hp - 40;
  check('spoke regen: out of combat in a combat zone, HP trickles back',
    psR.hp > 40, { hp: psR.hp, trickle });
  check('spoke regen: the trickle is a fraction of the hub pace, not a heal button',
    trickle === Math.max(1, Math.round(100 * roomR.SPOKE_REGEN_PCT)) && trickle <= 100 * 0.10 / 5,
    { trickle, hubTick: Math.ceil(100 * 0.10) });

  // It stops at max and never overshoots.
  psR.hp = psR.maxHp - 1; outOfCombat();
  roomR._tickPlayerRegen();
  check('spoke regen: never overshoots maxHp', psR.hp === psR.maxHp, psR.hp);

  // The hub is still the fast way home.
  psR.z = 'town'; psR.hp = 40; outOfCombat();
  roomR._tickPlayerRegen();
  check('hub regen unchanged: a hub still heals 10% of maxHp per tick',
    psR.hp === 50, psR.hp);

  // A dead / dying player is untouched (the loop's own guard, pinned here
  // because the new branch runs for every non-hub zone).
  psR.z = 'frost'; psR.hp = 10; psR.dying = true; outOfCombat();
  roomR._tickPlayerRegen();
  check('spoke regen: a dying player does not trickle back to life', psR.hp === 10, psR.hp);
  psR.dying = false;

  /* The stamp itself: dealing damage to a monster must mark the attacker as
     in combat, or the gate above is unreachable in a real fight. */
  psR.z = 'meadow'; psR.x = 0; psR.y = 0;
  const mons = roomR._ensureZoneMonsters('meadow');
  const target = mons[0];
  target.x = 10; target.y = 0; target.alive = true; target.hp = target.maxHp;
  psR._lastDealtAt = 0;
  await roomR.webSocketMessage(wsR, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: target.id, zone: 'meadow', dmg: 1, slot: 'melee' },
  }));
  check('the damage-DEALT stamp is set by hitting a monster',
    typeof psR._lastDealtAt === 'number' && Date.now() - psR._lastDealtAt < 2000, psR._lastDealtAt);
}

/* ═══ v2.3.1817: A ZONE OPENS WHEN A QUEST SENDS YOU THERE ═══
   Owner: "make each zone open up only after a mayor bro quest requires that
   area."

   The gate reuses the EXISTING invalid-zone rejection path, and that reuse is
   the thing most worth pinning: that path holds the player in the zone the
   server believes they are in while leaving them MOBILE.  A lock that froze
   the player instead would look like the game hanging, and this file's own
   history records three freezes from people inventing a second rejection
   shape here. */
{
  const wsZ = fakeWs('zonegate');
  await join(wsZ, 'bp_zone');
  const ps = room.playerState['bp_zone'];
  ps.z = 'town'; ps.x = 100; ps.y = 100;
  ps._quests = Object.create(null);
  const move = async (z, x = 120, y = 120) => {
    ps.lastMoveAt = 0;   /* the anti-teleport budget is not what is under test */
    await room.webSocketMessage(wsZ, JSON.stringify({ type: 'move', x, y, z }));
  };

  /* ── locked: no quest names frost yet ── */
  await move('frost');
  check('a gated zone is refused with no quest for it', ps.z === 'town', ps.z);
  /* NOT FROZEN — the property that actually matters, and it is subtler than
     "the position still applies".  The rejection path drops the offending
     message whole and arms the NEXT one to bypass the anti-teleport cap
     (lastMoveAt = undefined), so the player loses one packet and keeps
     playing.  Asserted as "the next move lands", because that is the thing a
     player would notice if it broke — and because a first draft of this test
     asserted the position applied on the REJECTED message, which is not what
     this path has ever done. */
  check('...and the rejected move does not write a position', ps.x === 100, { x: ps.x });
  await move('town', 121, 121);
  check('...but the NEXT move lands, so a lock never freezes you',
    ps.x === 121 && ps.y === 121, { x: ps.x, y: ps.y });

  /* ── always-open zones are never gated ── */
  await move('meadow', 130, 130);
  check('the Starting Meadow is always open', ps.z === 'meadow', ps.z);
  ps.z = 'town';
  await move('worldview', 140, 140);
  check('the World View is always open (it is how you reach a quest giver)',
    ps.z === 'worldview', ps.z);
  ps.z = 'town';

  /* ── accepting the quest opens it ── */
  ps._quests.tut_1 = 'active';
  await move('frost', 150, 150);
  check('accepting the quest that names frost opens frost', ps.z === 'frost', ps.z);

  /* ── and it does not close behind you ── */
  ps._quests.tut_1 = 'turnedIn';
  ps.z = 'town';
  await move('frost', 160, 160);
  check('...and a finished quest leaves its zone open, not locked again',
    ps.z === 'frost', ps.z);

  /* ── ALREADY INSIDE A LOCKED ZONE: you can still move, and still leave ──
     Found by the suite rather than by reasoning: the first cut gated on the
     zone alone, and since a client re-sends its current zone on every move
     packet, anyone standing in a locked zone had EVERY move dropped.  That is
     a player frozen in place with no way out — strictly worse than the lock
     being absent.  Reachable for real: entered before the gate shipped, or
     abandoned the quest afterwards. */
  ps.z = 'sky'; ps.x = 200; ps.y = 200;      /* no tut_3 -> sky is locked */
  await move('sky', 210, 210);
  check('a player already inside a locked zone can still move',
    ps.x === 210 && ps.y === 210, { x: ps.x, y: ps.y });
  await move('town', 220, 220);
  check('...and can still walk OUT of it', ps.z === 'town', ps.z);

  /* ── GUARD: the gate is per-zone, not a single global unlock ──
     Without this, "opens frost" would also pass on an implementation that
     opened EVERYTHING the moment any quest went active. */
  ps.z = 'town';
  await move('ember', 170, 170);
  check('one quest does not open every zone (guard)', ps.z === 'town', ps.z);
  ps._quests.tut_4 = 'active';
  await move('ember', 180, 180);
  check('...and the quest that DOES name ember opens ember', ps.z === 'ember', ps.z);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
