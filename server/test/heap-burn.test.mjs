/* A BURNING HEAP SETS YOU ON FIRE -- v2.3.3748 (server/src/heapburn.js; the
 * `heap` row of hits.js's one door).
 *
 * The owner, 2026-10-28: "if you stand in a burning pile of flames from a
 * building prop getting destroyed you get on fire and take damage".  The
 * fire is on the phone's screen; the phone says `heap_burn`, the worker
 * burns the sender at its own rate.
 *   1. A TICK: `heap_burn` on BroTown's ground takes HEAP_BURN.PCT of max HP,
 *      a monster_attack on you tagged `heapburn`, flame, at your own place;
 *      nobody else is touched.
 *   2. THE RATE: asked again within EVERY_MS, nothing; after it, a tick.
 *   3. IT CAN FINISH YOU OFF (the owner: "Yeah let the fire finish you
 *      off"): standing in it from low HP, the death, `monster:heap`, through
 *      the death path; no burning a corpse.
 *   4. REFUSED: dead, off BroTown's ground (out on a spoke), outside the
 *      world.
 *   5. THE SWITCH: `heapburn: false` burns nobody and caps.heapburn says so
 *      at the next join (true otherwise). */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { HEAP_BURN } from '../src/heapburn.js';
import { MONSTER_HITS } from '../src/hits.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
Math.random = () => 0.999;

const room = new GameRoom(mockState, mockEnv);
const socks = {};
async function join(id) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288, z: WHEEL_ZONE }));
  socks[id] = ws;
  return ws;
}
await join('p1'); await join('p2');
const P = (id) => room.playerState[id];
const sess = (id) => room.sessions.get(socks[id]);
function stage() {
  for (const id of ['p1', 'p2']) {
    Object.assign(P(id), { z: WHEEL_ZONE, x: WHEEL_CENTRE[0] + 200, y: WHEEL_CENTRE[1] + 288, dead: false, dying: false, disconnected: false, _heapBurnAt: 0, _zoneEntryGraceUntil: 0 });
    P(id).maxHp = 1000; P(id).hp = 1000;
  }
  room.eventBuffer.length = 0;
}
const ticks = (pid) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === pid && e.payload.ability === 'heapburn').map((e) => e.payload);

check('0: BroTown\'s ground is where the test stands', room._wheelSafeAt(WHEEL_CENTRE[0] + 200, WHEEL_CENTRE[1] + 288));
check('0: the `heap` row: no shelter at the door (the owner wants it in town), flame', !!MONSTER_HITS.heap && MONSTER_HITS.heap.shelter !== 'door' && MONSTER_HITS.heap.elemental === true && !MONSTER_HITS.heap.block && !MONSTER_HITS.heap.roll);

/* ── 1. a tick, through the wire ── */
{
  stage();
  await room.webSocketMessage(socks.p1, JSON.stringify({ type: 'heap_burn' }));
  const t = ticks('p1')[0];
  const want = Math.ceil(1000 * HEAP_BURN.PCT);
  check('1: `heap_burn` burns you HEAP_BURN.PCT of your max HP', !!t && t.dmgTaken > 0 && t.dmgTaken <= want && P('p1').hp === 1000 - t.dmgTaken, { t, hp: P('p1').hp });
  check('1: a tick on you: flame, drawn at your own place', !!t && t.elem === 'flame' && t.attackerX === P('p1').x && t.attackerY === P('p1').y, t);
  check('1: nobody else is touched', ticks('p2').length === 0 && P('p2').hp === 1000);
}

/* ── 2. the rate ── */
{
  stage();
  const t0 = Date.now();
  const a = room._handleHeapBurn(sess('p1'), t0);
  const b = room._handleHeapBurn(sess('p1'), t0 + HEAP_BURN.EVERY_MS - 10);
  const c = room._handleHeapBurn(sess('p1'), t0 + HEAP_BURN.EVERY_MS + 10);
  check('2: asked again within a second: nothing; after it: a tick', a > 0 && b === 0 && c > 0 && ticks('p1').length === 2, { a, b, c });
  /* a phone asking ten times a second gets one tick a second */
  stage();
  let n = 0;
  for (let i = 0; i < 30; i++) if (room._handleHeapBurn(sess('p1'), t0 + i * 100) > 0) n++;
  check('2: thirty asks over three seconds: three ticks', n === 3, n);
}

/* ── 3. it can finish you off ── */
{
  const deaths = [];
  const real = room._handlePlayerDeath.bind(room);
  room._handlePlayerDeath = (ps, pid, cause) => { deaths.push({ pid, cause }); return real(ps, pid, cause); };
  stage();
  P('p1').hp = 70;
  const t0 = Date.now();
  for (let i = 0; i < 6; i++) room._handleHeapBurn(sess('p1'), t0 + i * HEAP_BURN.EVERY_MS);
  check('3: standing in it from 70 HP: it burns you to death', P('p1').hp <= 0 && P('p1').dying && deaths.length === 1 && deaths[0].pid === 'p1', { hp: P('p1').hp, deaths });
  check('3: ...put down to the heap (`monster:heap`: the phone reads BURNED TO DEATH)', deaths[0] && deaths[0].cause === 'monster:heap', deaths);
  const sent = socks.p1.sent.filter((m) => m.type === 'player_died').pop();
  check('3: ...and the phone is told, as any death', !!sent && sent.payload.cause === 'monster:heap', sent);
  check('3: no burning a corpse', room._handleHeapBurn(sess('p1'), t0 + 10 * HEAP_BURN.EVERY_MS) === 0 && deaths.length === 1);
  room._handlePlayerDeath = real;
}

/* ── 4. refused ── */
{
  stage();
  P('p1').dead = true;
  check('4: dead: nothing', room._handleHeapBurn(sess('p1'), Date.now()) === 0 && P('p1').hp === 1000);
  stage();
  /* out on a spoke, off BroTown's ground */
  P('p1').x = WHEEL_CENTRE[0]; P('p1').y = WHEEL_CENTRE[1] - (WHEEL_SAFE_R + 500);
  check('4: off BroTown\'s ground: nothing', !room._wheelSafeAt(P('p1').x, P('p1').y) && room._handleHeapBurn(sess('p1'), Date.now()) === 0 && P('p1').hp === 1000);
  stage();
  P('p1').z = 'dungeon:x';
  check('4: outside the world: nothing', room._handleHeapBurn(sess('p1'), Date.now()) === 0 && P('p1').hp === 1000);
  check('4: a socket with no player: nothing', room._handleHeapBurn({ id: null }, Date.now()) === 0);
}

/* ── 5. the switch ── */
{
  const ws3 = await join('p3');
  const sync = ws3.sent.find((m) => m.type === 'state_sync');
  check('5: caps.heapburn says the worker burns', !!sync && sync.caps && sync.caps.heapburn === true, sync && sync.caps && sync.caps.heapburn);
  stage();
  room._liveFlags = { heapburn: false };
  await room.webSocketMessage(socks.p1, JSON.stringify({ type: 'heap_burn' }));
  check('5: `heapburn: false`: nobody burns', ticks('p1').length === 0 && P('p1').hp === 1000);
  const ws4 = await join('p4');
  const sync4 = ws4.sent.find((m) => m.type === 'state_sync');
  check('5: ...and caps.heapburn is false at the next join', !!sync4 && sync4.caps && sync4.caps.heapburn === false, sync4 && sync4.caps && sync4.caps.heapburn);
  room._liveFlags = {};
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
