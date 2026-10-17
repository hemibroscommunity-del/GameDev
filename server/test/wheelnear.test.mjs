/* Into the Wheel with only the monsters around you -- v2.3.3318
 * (server/src/wheelnear.js; docs/specs/wheel-arrival.md).
 *
 *   1. THE WAY IN: a v2 phone that says `wn: 1`, walking into the Wheel, gets
 *      a zone_state marked `mnear: 1` with exactly the monsters within
 *      WHEEL_NEAR.R of where it stands -- none in the town square, a land's
 *      own where it stands among them -- each byte for byte as the whole list
 *      says it; the nodes and the loot whole, as before.
 *   2. EVERYONE ELSE AS BEFORE: a v2 phone without `wn`, a v1 phone with it,
 *      and every other zone get the whole lists, unmarked.
 *   3. THE FIRST TICK sends none of the arrival's monsters again (the tick's
 *      interest was seeded with them).
 *   4. COMING INTO REACH: walking up to a land's monsters, each comes whole in
 *      that phone's tick (`mw`, the snapshot's wire, keyed by zone) as well as
 *      in the tick's monsters -- once; a dead one says it is dead; walking out
 *      of reach and back brings it by the tick alone; a phone without `wn`
 *      never gets an `mw`; the shared tick is still byte for byte the
 *      unshared one (tick-share's check).
 *   5. OUT AND BACK IN: leaving the Wheel forgets what was held; the way back
 *      in is a near list of its own.
 *   6. A JOIN THAT LANDS IN THE WHEEL (a reconnect): state_sync marked
 *      `monstersNear: 1` with the monsters around it; caps.wheelnear.
 *   7. THE KILL SWITCH: `wheelnear: false` -- every later arrival whole and
 *      unmarked, caps.wheelnear false; a flag thrown on a cold room holds at
 *      its first join; only `wn: 1` exactly asks.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE, WHEEL } from '../src/wheelzone.js';
import { WHEEL_NEAR } from '../src/wheelnear.js';
import { monsterSnapWire } from '../src/spawnscale.js';
import * as LONG from '../src/wheelspawns.js';

const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const mockState = (flags) => ({
  storage: { get: async (k) => (k === 'liveflags' ? flags : undefined), put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
});

function fakeWs(label) {
  return { label, sent: [], raw: [], send(s) { this.raw.push(s); this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 600)); }
}

const room = new GameRoom(mockState(undefined), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const join = async (r, ws, id, extra = {}, data = { x: 1000, y: 1000, z: 'town' }) => {
  r.sessions.set(ws, baseSession());
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data, ...extra }));
  return r.sessions.get(ws);
};
const run = async (r, ticks) => {
  r.startTickLoop();
  await new Promise((res) => setTimeout(res, r.TICK_RATE * ticks));
  clearInterval(r.tickInterval); r.tickInterval = null;
};
const [CX, CY] = LONG.WHEEL_CENTRE;
const ARRIVE = { x: CX, y: CY + 288 };   /* the town square's arrival (wheelzone.test.mjs) */
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
/* hold every monster still where it was placed: this is about what is sent */
const still = () => { for (const q of wheel) { q.x = q.spawnX; q.y = q.spawnY; q.targetId = null; q._wanderPausedUntil = Date.now() + 600000; } };
still();
const nearIds = (x, y, r = WHEEL_NEAR.R) => wheel.filter((m) => Math.hypot(m.x - x, m.y - y) <= r).map((m) => m.id);
const midOf = (home, tier) => {
  const ms = wheel.filter((q) => q.home === home && (q.tier || 1) === tier);
  return { x: ms.reduce((a, q) => a + q.spawnX, 0) / ms.length, y: ms.reduce((a, q) => a + q.spawnY, 0) / ms.length, ids: ms.map((q) => q.id) };
};
const wholeOf = (ws) => {
  const out = [];
  for (const t of msgsOfType(ws, 'tick')) for (const list of Object.values(t.mw || {})) for (const m of list) out.push(m);
  return out;
};
const heard = (ws) => {
  const ids = new Set();
  for (const t of msgsOfType(ws, 'tick')) for (const list of Object.values(t.monsters || {})) for (const m of list) ids.add(m.id);
  return ids;
};
const graceAll = (r) => { for (const p of Object.values(r.playerState)) p._zoneEntryGraceUntil = Date.now() + 600000; };

check(`setup: the live Wheel (${LONG.WHEEL_LONG} times longer), ${wheel.length} monsters, the reach ${WHEEL_NEAR.R} px = the tick's`,
  LONG.WHEEL_LONG === 5 && wheel.length > 1000 && WHEEL_NEAR.R === WHEEL.INTEREST_R);

// ── 1. THE WAY IN ─────────────────────────────────────────────────────────
const wsA = fakeWs('near'), wsB = fakeWs('whole'), wsC = fakeWs('v1');
const sA = await join(room, wsA, 'pa', { wn: 1 });
const sB = await join(room, wsB, 'pb');
room.sessions.set(wsC, baseSession());
await room.webSocketMessage(wsC, JSON.stringify({ type: 'join', id: 'pc', name: 'pc', protocolVersion: 1, wn: 1, data: { x: 1000, y: 1000, z: 'town' } }));
const sC = room.sessions.get(wsC);
check('join: `wn: 1` on a v2 phone is a near phone; none without it, none on v1', sA.wheelNear === true && sB.wheelNear === false && sC.wheelNear === false,
  { a: sA.wheelNear, b: sB.wheelNear, c: sC.wheelNear });
check('join: state_sync says caps.wheelnear', (msgsOfType(wsA, 'state_sync')[0] || {}).caps?.wheelnear === true);
for (const w of [wsA, wsB, wsC]) { w.sent.length = 0; w.raw.length = 0; }
for (const [w] of [[wsA], [wsB], [wsC]]) await room.webSocketMessage(w, JSON.stringify({ type: 'move', x: ARRIVE.x, y: ARRIVE.y, z: WHEEL_ZONE }));
graceAll(room);
const full = room._zoneSnapshotWire(WHEEL_ZONE);
{
  const zA = msgsOfType(wsA, 'zone_state')[0], zB = msgsOfType(wsB, 'zone_state')[0];
  const want = nearIds(ARRIVE.x, ARRIVE.y);
  check(`way in: the town square -- a near list of the ${want.length} within ${WHEEL_NEAR.R} px (none: the nearest stand a stretch out), marked mnear`,
    !!zA && zA.mnear === 1 && zA.monsters.length === want.length && want.length === 0, zA && { n: zA.monsters.length, mnear: zA.mnear });
  const bytesA = wsA.raw.find((s) => s.includes('"zone_state"')).length, bytesB = wsB.raw.find((s) => s.includes('"zone_state"')).length;
  check(`way in: ${Math.round(bytesA / 1024)} KB where the whole list is ${Math.round(bytesB / 1024)} KB`, bytesA < bytesB / 3, { bytesA, bytesB });
  check('way in: the nodes and the loot come whole, as before', !!zA && !!zB && JSON.stringify(zA.nodes) === JSON.stringify(zB.nodes)
    && JSON.stringify(zA.loot) === JSON.stringify(zB.loot) && zA.nodes.length > 1000);
  check('way in: the near phone has heard and holds exactly what it was sent', sA._wheelSeen instanceof Set && sA._wheelSeen.size === 0
    && sA._wheelWhole instanceof Set && sA._wheelWhole.size === 0);
}
// ── 2. EVERYONE ELSE AS BEFORE ────────────────────────────────────────────
{
  const zB = msgsOfType(wsB, 'zone_state')[0];
  check(`as before: a phone without wn gets all ${wheel.length}, unmarked, byte for byte the snapshot`,
    !!zB && !('mnear' in zB) && JSON.stringify(zB.monsters) === JSON.stringify(full.monsters), zB && { n: zB.monsters.length, mnear: zB.mnear });
  const zmC = msgsOfType(wsC, 'zone_monsters')[0];
  check('as before: a v1 phone (wn or not) gets its zone_monsters whole', !!zmC && zmC.monsters.length === wheel.length && !('mnear' in zmC)
    && msgsOfType(wsC, 'zone_state').length === 0);
  check('as before: neither holds anything whole', sB._wheelWhole === null && !sC._wheelWhole);
  const wsT = fakeWs('tidal');
  await join(room, wsT, 'pt', { wn: 1 });
  wsT.sent.length = 0;
  await room.webSocketMessage(wsT, JSON.stringify({ type: 'move', x: 500, y: 500, z: 'tidal' }));
  const zt = msgsOfType(wsT, 'zone_state')[0];
  check('as before: every other zone whole and unmarked, even for a near phone', !!zt && zt.monsters.length > 0 && !('mnear' in zt)
    && zt.monsters.length === room._ensureZoneMonsters('tidal').length);
  room.sessions.delete(wsT); delete room.playerState.pt;
}

// ── 3. THE FIRST TICK, AND 4. COMING INTO REACH ───────────────────────────
/* land among Frost Ridge's first stretch: the arrival there is not empty */
const frost = midOf('frost', 1);
const wsF = fakeWs('frost');
const sF = await join(room, wsF, 'pf', { wn: 1 });
wsF.sent.length = 0;
await room.webSocketMessage(wsF, JSON.stringify({ type: 'move', x: Math.round(frost.x), y: Math.round(frost.y + 60), z: WHEEL_ZONE }));
graceAll(room);
{
  const zF = msgsOfType(wsF, 'zone_state')[0];
  const want = nearIds(room.playerState.pf.x, room.playerState.pf.y);
  const got = zF ? zF.monsters.map((m) => m.id) : [];
  check(`way in among Frost Ridge's monsters: the ${want.length} within reach, in the list's order, marked`,
    !!zF && zF.mnear === 1 && want.length > 0 && JSON.stringify(got) === JSON.stringify(want), { want: want.length, got: got.length });
  const byId = new Map(full.monsters.map((m) => [m.id, m]));
  const fresh = room._zoneSnapshotWire(WHEEL_ZONE);
  const freshById = new Map(fresh.monsters.map((m) => [m.id, m]));
  check('way in: each says itself byte for byte as the whole list does', !!zF && zF.monsters.every((m) => JSON.stringify(m) === JSON.stringify(freshById.get(m.id)))
    && byId.size === wheel.length);
}
for (const q of wheel) room._markMonsterDirty(WHEEL_ZONE, q.id);   /* every monster moving: the hardest case */
wsF.sent.length = 0; wsA.sent.length = 0; wsB.sent.length = 0;
room._tickShareVerify = { checked: 0, mismatched: 0, first: null };
/* what the tick's interest takes as newly in reach, for this phone */
const arrivalF = [...sF._wheelWhole];
const enteredF = [];
const _interest = room._wheelInterest;
room._wheelInterest = function (session, ps, monsters, grid) {
  const r = _interest.call(this, session, ps, monsters, grid);
  if (session === sF) for (const id of r.entered) enteredF.push(id);
  return r;
};
await run(room, 3);
room._wheelInterest = _interest;
{
  check(`first tick: the tick takes none of the arrival's ${arrivalF.length} as new (its interest was seeded with them)`,
    arrivalF.length > 0 && !arrivalF.some((id) => enteredF.includes(id)), enteredF.slice(0, 5));
  check('first tick: none of the arrival\'s monsters comes whole again', wholeOf(wsF).length === 0, wholeOf(wsF).map((m) => m.id).slice(0, 5));
  const reachF = nearIds(room.playerState.pf.x, room.playerState.pf.y);
  check(`first tick: ...and the tick still says how the ${reachF.length} are doing (they moved)`, reachF.length > 0 && reachF.every((id) => heard(wsF).has(id)),
    reachF.filter((id) => !heard(wsF).has(id)));
}
/* the town-square phone walks out to the Flame Fields' first stretch:
   set where it stands, as wheelzone.test.mjs does -- a long `move` is a
   teleport the anticheat refuses, and walking is not what this is about */
const ember = midOf('ember', 1);
room.playerState.pa.x = Math.round(ember.x); room.playerState.pa.y = Math.round(ember.y + 60);
/* one of them dead when first met */
const deadOne = wheel.find((q) => q.id === ember.ids[0]);
deadOne.alive = false; deadOne.hp = 0;
wsA.sent.length = 0;
await run(room, 3);
{
  const w = wholeOf(wsA);
  const inReach = nearIds(room.playerState.pa.x, room.playerState.pa.y);
  const ids = w.map((m) => m.id);
  check(`into reach: the ${inReach.length} around you come whole (mw), each once`, inReach.length > 0 && inReach.every((id) => ids.includes(id))
    && new Set(ids).size === ids.length && ids.every((id) => Math.hypot(wheel.find((q) => q.id === id).x - room.playerState.pa.x, wheel.find((q) => q.id === id).y - room.playerState.pa.y) <= WHEEL.INTEREST_R),
    { inReach: inReach.length, sent: ids.length });
  const now = room._zoneSnapshotWire(WHEEL_ZONE);
  const nowById = new Map(now.monsters.map((m) => [m.id, m]));
  check('into reach: ...each in the snapshot\'s own wire (what it is, where, how it is doing)', w.length > 0
    && w.every((m) => JSON.stringify(m) === JSON.stringify(nowById.get(m.id))) && w.every((m) => typeof m.arch === 'string' && typeof m.home === 'string'),
    w[0]);
  const d = w.find((m) => m.id === deadOne.id);
  check('into reach: one first met dead says it is dead', !!d && d.alive === false, d);
  check('into reach: ...and in the tick\'s monsters as well, the same tick', inReach.every((id) => heard(wsA).has(id)));
  const tickWith = msgsOfType(wsA, 'tick').find((t) => t.mw);
  check('into reach: mw is keyed by the zone, as the tick\'s monsters are', !!tickWith && Object.keys(tickWith.mw).join() === WHEEL_ZONE);
  check('into reach: the phone without wn never gets an mw', msgsOfType(wsB, 'tick').every((t) => !('mw' in t)));
  check(`into reach: the shared tick is byte for byte the unshared one (${room._tickShareVerify.checked} compared)`,
    room._tickShareVerify.checked > 0 && room._tickShareVerify.mismatched === 0, room._tickShareVerify.first);
}
deadOne.alive = true; deadOne.hp = deadOne.maxHp;
{
  /* out of reach (past INTEREST_OUT) and back: by the tick alone */
  const back = { x: room.playerState.pa.x, y: room.playerState.pa.y };
  room.playerState.pa.x = ARRIVE.x; room.playerState.pa.y = ARRIVE.y;
  await run(room, 2);
  check('out of reach: no longer heard', ![...(sA._wheelSeen || [])].some((id) => ember.ids.includes(id)));
  room.playerState.pa.x = back.x; room.playerState.pa.y = back.y;
  wsA.sent.length = 0;
  await run(room, 3);
  const reachA = nearIds(back.x, back.y);
  check(`back in reach: the ${reachA.length} come by the tick alone, nothing whole again`, reachA.length > 0 && reachA.every((id) => heard(wsA).has(id)) && wholeOf(wsA).length === 0,
    wholeOf(wsA).map((m) => m.id).slice(0, 5));
}

// ── 5. OUT AND BACK IN ────────────────────────────────────────────────────
await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'town' }));
await run(room, 2);
check('out: leaving the Wheel forgets what was held and heard', sA._wheelWhole === null && sA._wheelSeen === null);
wsA.sent.length = 0;
await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: Math.round(frost.x), y: Math.round(frost.y + 60), z: WHEEL_ZONE }));
graceAll(room);
{
  const z = msgsOfType(wsA, 'zone_state').find((q) => q.zone === WHEEL_ZONE);
  const want = nearIds(room.playerState.pa.x, room.playerState.pa.y);
  check(`back in: a near list of its own (${want.length}), held`, !!z && z.mnear === 1 && z.monsters.length === want.length
    && sA._wheelWhole.size === want.length && want.every((id) => sA._wheelWhole.has(id)));
}

// ── 6. A JOIN THAT LANDS IN THE WHEEL ─────────────────────────────────────
{
  const at = { x: Math.round(frost.x), y: Math.round(frost.y + 60), z: WHEEL_ZONE };
  const wsJ = fakeWs('rejoin'), wsK = fakeWs('rejoin-whole');
  const sJ = await join(room, wsJ, 'pj', { wn: 1 }, at);
  await join(room, wsK, 'pk', {}, at);
  const syncJ = msgsOfType(wsJ, 'state_sync')[0], syncK = msgsOfType(wsK, 'state_sync')[0];
  const want = nearIds(at.x, at.y);
  check(`join in the Wheel: state_sync with the ${want.length} around it, marked monstersNear`,
    !!syncJ && syncJ.monstersNear === 1 && syncJ.monsters.length === want.length && syncJ.monsters.every((m) => want.includes(m.id)), syncJ && { n: syncJ.monsters.length });
  check('join in the Wheel: ...held and heard', sJ._wheelWhole instanceof Set && sJ._wheelWhole.size === want.length && sJ._wheelSeen.size === want.length);
  check(`join in the Wheel: without wn, all ${wheel.length}, unmarked`, !!syncK && !('monstersNear' in syncK) && syncK.monsters.length === wheel.length);
  for (const w of [wsJ, wsK]) room.sessions.delete(w);
  delete room.playerState.pj; delete room.playerState.pk;
}

// ── 7. THE KILL SWITCH ────────────────────────────────────────────────────
{
  check('switch: only `wn: 1` exactly asks', !room._wheelNearFor({ protocolVersion: 2 }, { wn: true }) && !room._wheelNearFor({ protocolVersion: 2 }, { wn: '1' })
    && room._wheelNearFor({ protocolVersion: 2 }, { wn: 1 }) && !room._wheelNearFor({ protocolVersion: 1 }, { wn: 1 }));
  room._liveFlags = { wheelnear: false };
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'town' }));
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: Math.round(frost.x), y: Math.round(frost.y + 60), z: WHEEL_ZONE }));
  const z = msgsOfType(wsA, 'zone_state').find((q) => q.zone === WHEEL_ZONE);
  check(`switch: \`wheelnear: false\` -- the way in whole (${z && z.monsters.length}) and unmarked, nothing held`,
    !!z && !('mnear' in z) && z.monsters.length === wheel.length && sA._wheelWhole === null);
  const wsS = fakeWs('switch');
  await join(room, wsS, 'ps', { wn: 1 });
  check('switch: caps.wheelnear false', (msgsOfType(wsS, 'state_sync')[0] || {}).caps?.wheelnear === false);
  room.sessions.delete(wsS); delete room.playerState.ps;
  room._liveFlags = {};
  /* a cold room's first join, landing in the Wheel, with the flag in storage */
  const cold = new GameRoom(mockState({ wheelnear: false }), mockEnv);
  cold._ensureZoneMonsters(WHEEL_ZONE);
  const wsX = fakeWs('cold');
  await join(cold, wsX, 'px', { wn: 1 }, { x: Math.round(frost.x), y: Math.round(frost.y + 60), z: WHEEL_ZONE });
  const sx = msgsOfType(wsX, 'state_sync')[0];
  check('switch: a flag in storage holds at a cold room\'s first join', !!sx && !('monstersNear' in sx) && sx.monsters.length === cold.monsters[WHEEL_ZONE].length
    && sx.caps.wheelnear === false, sx && { n: sx.monsters.length, near: sx.monstersNear });
}

check('the shared wire is one function: the snapshot\'s first monster is monsterSnapWire\'s', JSON.stringify(room._zoneSnapshotWire(WHEEL_ZONE).monsters[0]) === JSON.stringify(monsterSnapWire(wheel[0])));

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nwheelnear: all passed');
process.exit(0);
