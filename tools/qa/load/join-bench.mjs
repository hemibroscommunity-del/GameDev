/* ═══ v2.3.3276: WHAT A JOIN COSTS, IN-PROCESS (server/src/nearjoin.js) ═══
 *
 * docs/specs/near-join.md.  The real GameRoom in Node with fake sockets that
 * count what they are sent: N players in the Wheel (a third about BroTown, two
 * thirds out at the monsters, as tools/qa/load/roster-bench.mjs places them),
 * each with a real phone's look (tools/qa/load/track-sample.json; one in three
 * with a drawn shirt and tattoo, 256 hex each), every phone a presence-v2 phone
 * -- with `nj: 1` (the near join) or without (the snapshot as before).  It
 * prints, for each:
 *   - ONE JOIN in town (the way every login comes in): the snapshot's bytes and
 *     the room's time to make it, and the player_join it sends everyone;
 *   - the same joiner ARRIVING in BroTown: the looks sent with its next tick;
 *   - THE STORM: every phone drops and comes back (a deploy, a network blip),
 *     each where it stood in the Wheel (a reconnect joins with its own zone and
 *     place): everything the room sends for it (the snapshots, the
 *     player_joins, each joiner's first whole look relay, then a roster's
 *     ticks with their looks), and the room's time for the joins and after.
 *
 *   node tools/qa/load/join-bench.mjs [N 120] [server dir]
 *   NJ=off|on node tools/qa/load/join-bench.mjs N    one mode alone, as JSON
 */
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const N = +(process.argv[2] || 120);
const dir = process.argv[3] ? pathToFileURL(process.argv[3] + '/').href : new URL('../../../server/', import.meta.url).href;
const { GameRoom } = await import(dir + 'src/index.js');
const SAMPLE = JSON.parse(readFileSync(new URL('./track-sample.json', import.meta.url), 'utf8'));
const SAMPLE_LOOK = SAMPLE.data || SAMPLE;

function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
let NOW = 1_800_000_000_000;
Date.now = () => NOW;

const HEX = '0123456789abcdef';
const drawing = (i) => Array.from({ length: 256 }, (_, k) => HEX[(i * 7 + k * 3) % 16]).join('');
function lookOf(i) {
  const l = { ...SAMPLE_LOOK, name: 'Bro' + i, color: '#' + (0x100000 + i * 9973).toString(16).slice(-6) };
  if (l.rpgData) l.rpgData = { ...l.rpgData, kills: 10 + i, goldEarned: 100 * i };
  if (i % 3 === 0) { l.sa = drawing(i); l.ta = drawing(i + 1); }
  delete l.x; delete l.y;
  return l;
}

const ARRIVAL = { x: 21504, y: 21792 };

async function build(nj) {
  const room = new GameRoom(mockState(), mockEnv);
  room.MAX_PLAYERS = N + 20;
  room._liveFlags = { nearjoin: nj };
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  const ps = [];
  for (let i = 0; i < N; i++) {
    const p = { id: 'jb' + i, i, look: lookOf(i) };
    ps.push(p);
  }
  /* where each stands: a third about BroTown, two thirds at the monsters */
  const ms = () => room.monsters.wheel || [];
  return { room, tick: () => { NOW += room.TICK_RATE; tickFn(); }, ps, ms };
}

function counter() {
  return { b: 0, n: 0, kinds: Object.create(null) };
}
function makeWs(c) {
  return {
    send(s) {
      c.b += s.length; c.n++;
      const k = s.slice(9, s.indexOf('"', 9));
      c.kinds[k] = (c.kinds[k] || 0) + s.length;
    },
    close() {},
  };
}

/* a phone joins where it is: a login in today's town (its stop on the way to
   the Wheel), a reconnect where it stood (wsClient.js sends S.currentZone and
   the player's place) */
async function joinOne(room, p, c, nj, at = null) {
  const ws = makeWs(c);
  room.sessions.set(ws, { id: null, name: 'B', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  const where = at ? { x: at.x, y: at.y, z: 'wheel' } : { x: 1000, y: 1000, z: 'town' };
  const msg = { type: 'join', id: p.id, name: p.look.name, protocolVersion: 2, pres: 2, data: { ...p.look, rpgData: undefined, ...where } };
  if (nj) msg.nj = 1;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  p.ws = ws;
  return ws;
}
async function track(room, p) { await room.webSocketMessage(p.ws, JSON.stringify({ type: 'track', data: p.look })); }
async function moveTo(room, p, x, y, z = 'wheel') {
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
function place(room, p, x, y) { const s = room.playerState[p.id]; s.x = x; s.y = y; s.vx = 0; s.vy = 0; }

async function scenario(nj) {
  const { room, tick, ps, ms } = await build(nj);
  const all = counter();
  for (const p of ps) { await joinOne(room, p, all, nj); }
  /* down into the Wheel (which spawns its monsters), then each to its place */
  for (const p of ps) await moveTo(room, p, ARRIVAL.x, ARRIVAL.y, 'wheel');
  tick();
  const mons = ms();
  for (const p of ps) {
    if (p.i % 3 === 0 || !mons.length) { p.x = ARRIVAL.x + (rnd() - 0.5) * 2400; p.y = ARRIVAL.y + (rnd() - 0.5) * 2400; }
    else { const m = mons[(p.i * 7) % mons.length]; p.x = m.x + (rnd() - 0.5) * 400; p.y = m.y + (rnd() - 0.5) * 400; }
    place(room, p, p.x, p.y);
    await track(room, p);
  }
  for (let i = 0; i < 50; i++) tick();
  NOW += 120000;   /* long after: every look's last whole relay is old */
  for (const [, s] of room.sessions) s.lastRecv = NOW;
  tick();

  /* ── one join in town, then its arrival in BroTown ── */
  const J = { id: 'jbjoiner', i: N + 1, look: lookOf(N + 1) };
  const jc = counter();       /* what the joiner is sent */
  const others = counter();   /* what everyone else is sent for it */
  for (const [ws] of room.sessions) { const send = ws.send; ws.send = (s) => { others.b += s.length; others.n++; send.call(ws, s); }; ws._wrapped = send; }
  const t0 = performance.now();
  await joinOne(room, J, jc, nj);
  const tJoin = performance.now() - t0;
  for (const [ws] of room.sessions) if (ws._wrapped) { ws.send = ws._wrapped; delete ws._wrapped; }
  const snapB = jc.kinds.state_sync || 0;
  const joinB = others.b;
  const before = jc.b;
  await moveTo(room, J, ARRIVAL.x, ARRIVAL.y, 'wheel');
  const t1 = performance.now();
  tick();
  const tArrive = performance.now() - t1;
  const arriveB = jc.b - before;

  /* ── the storm: every socket drops (a deploy, a blip) and each phone comes
     back where it stood, in the Wheel; then its first track goes (whole, to
     everyone) and the room ticks on ── */
  const storm = counter();
  for (const p of ps) { try { await room.webSocketClose(p.ws); } catch {} }
  const t2 = performance.now();
  for (const p of ps) await joinOne(room, p, storm, nj, { x: p.x, y: p.y });
  const tJoins = performance.now() - t2;
  for (const p of ps) place(room, p, p.x, p.y);
  const t3 = performance.now();
  for (const p of ps) await track(room, p);   /* each phone's first track: whole, to everyone */
  for (let i = 0; i < room.PRESENCE_REFRESH_TICKS + 2; i++) tick();   /* past a roster */
  const tArrivals = performance.now() - t3;
  return {
    nj, snapB, joinB, tJoin, arriveB, tArrive,
    stormB: storm.b, stormKinds: storm.kinds, tJoins, tArrivals,
  };
}

const kb = (b) => (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB';
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
/* each mode in a process of its own (NJ=off / NJ=on), or both in this one */
const only = process.env.NJ;
const r = { off: only === 'on' ? null : await scenario(false), on: only === 'off' ? null : await scenario(true) };
if (only) { console.log(JSON.stringify(r[only])); process.exit(0); }
console.log(`\n${N} players in the Wheel (a third about BroTown), real looks, one in three with two drawings\n`);
console.log('                               as before      near join');
console.log(`one join: its snapshot          ${kb(r.off.snapB).padStart(10)}   ${kb(r.on.snapB).padStart(10)}`);
console.log(`          its player_join (all) ${kb(r.off.joinB).padStart(10)}   ${kb(r.on.joinB).padStart(10)}`);
console.log(`          the room's time        ${r.off.tJoin.toFixed(1).padStart(7)} ms   ${r.on.tJoin.toFixed(1).padStart(7)} ms`);
console.log(`arriving in BroTown: sent       ${kb(r.off.arriveB).padStart(10)}   ${kb(r.on.arriveB).padStart(10)}`);
console.log(`          the room's time        ${r.off.tArrive.toFixed(1).padStart(7)} ms   ${r.on.tArrive.toFixed(1).padStart(7)} ms`);
console.log(`the storm: sent for the joins   ${mb(r.off.stormB).padStart(10)}   ${mb(r.on.stormB).padStart(10)}`);
for (const k of ['state_sync', 'player_join', 'player_update', 'tick']) {
  console.log(`   ${k.padEnd(28)}${mb(r.off.stormKinds[k] || 0).padStart(10)}   ${mb(r.on.stormKinds[k] || 0).padStart(10)}`);
}
console.log(`   the room's time, the joins   ${r.off.tJoins.toFixed(0).padStart(7)} ms   ${r.on.tJoins.toFixed(0).padStart(7)} ms`);
console.log(`   the first tracks, a roster   ${r.off.tArrivals.toFixed(0).padStart(7)} ms   ${r.on.tArrivals.toFixed(0).padStart(7)} ms`);
