/* ═══ v2.3.3246: WHAT THE PRESENCE ROSTER COSTS, IN-PROCESS ═══
 *
 * docs/specs/slim-roster.md.  The real GameRoom in Node with fake sockets: N
 * players in the Wheel, a third walking about Brotown and two thirds out at
 * the monsters, MOVING% of them taking a step every tick, the rest standing.
 * The same room runs SECONDS of ticks with the slim roster off and on, and
 * prints, for each, what a phone is sent a second (all of a tick's parts) and
 * the room's time a tick (its code plus encoding every message as the
 * runtime must).
 *
 * v2.3.3250: and with presence v2 (server/src/presence2.js): every phone
 * joins with `pres: 2` and keeps its world map shut, so it is sent the
 * players near it and its party only.  `presence2: false` in the live flags
 * gives the same phones the slim roster, so the three rows are one room.
 *
 *   node tools/qa/load/roster-bench.mjs [N 120] [moving 30] [seconds 10] [server dir]
 */
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { WHEEL_CENTRE } from '../../../server/src/wheelspawns.js';   /* v2.3.3315: the Wheel the room plays */

const N = +(process.argv[2] || 120), MOVING = +(process.argv[3] || 30) / 100, SECS = +(process.argv[4] || 10);
const dir = process.argv[5] ? pathToFileURL(process.argv[5] + '/').href : new URL('../../../server/', import.meta.url).href;
const { GameRoom } = await import(dir + 'src/index.js');

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
let NOW = Date.now();
Date.now = () => NOW;

const room = new GameRoom(mockState(), mockEnv);
room.MAX_PLAYERS = Math.max(room.MAX_PLAYERS, N + 10);
let tickFn = null;
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
room.startTickLoop();
globalThis.setInterval = realSetInterval;

const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3315: the Wheel the room plays */
const ps = [];
for (let i = 0; i < N; i++) {
  const ws = { b: 0, send(s) { this.b += s.length; Buffer.from(s); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'B', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  const id = 'rb' + i + '_' + Math.random().toString(36).slice(2, 12);
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], pres: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ARRIVAL.x, y: ARRIVAL.y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  ps.push({ ws, id });
}
tickFn();
const ms = room.monsters.wheel || [];
ps.forEach((p, i) => {
  const s = room.playerState[p.id];
  if (i % 3 === 0) { s.x = ARRIVAL.x + (rnd() - 0.5) * 2400; s.y = ARRIVAL.y + (rnd() - 0.5) * 2400; }
  else { const m = ms[(i * 7) % ms.length]; s.x = m.x + (rnd() - 0.5) * 400; s.y = m.y + (rnd() - 0.5) * 400; }
  s.eqc = 'iron_torso'; s.eql = 'iron_greaves'; s.ex = null;
  p.moving = rnd() < MOVING;
});
function tick() {
  NOW += room.TICK_RATE;
  for (const p of ps) {
    const s = room.playerState[p.id];
    s.hp = s.maxHp = 1e9; s.dead = false; s.dying = false;
    if (p.moving) {
      const a = (p.a = (p.a === undefined ? rnd() * 6.28 : p.a + (rnd() - 0.5) * 0.2));
      s.x += Math.cos(a) * 4; s.y += Math.sin(a) * 4; s.vx = Math.cos(a) * 250; s.vy = Math.sin(a) * 250;
      s.lastMoveAt = NOW;
      room.dirtyPlayers.add(p.id);
    }
  }
  tickFn();
}
function run(slim, pres2 = false) {
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { slimroster: slim, presence2: pres2 });
  for (let t = 0; t < 90; t++) tick();
  for (const p of ps) p.ws.b = 0;
  const ticks = Math.round(SECS * 1000 / room.TICK_RATE);
  let total = 0;
  for (let t = 0; t < ticks; t++) { const t0 = performance.now(); tick(); total += performance.now() - t0; }
  const bytes = ps.reduce((a, p) => a + p.ws.b, 0);
  return `${(bytes / N / SECS / 1024).toFixed(1)} KB a phone a second, ${(total / ticks).toFixed(2)} ms a tick`;
}
const off = run(false), on = run(true), p2 = run(true, true), off2 = run(false), on2 = run(true), p22 = run(true, true);
console.log(`${N} players, ${Math.round(MOVING * 100)}% moving, ${SECS} s`);
console.log(`  everyone whole in every roster:  ${off}  |  ${off2}`);
console.log(`  far players slim:                ${on}  |  ${on2}`);
console.log(`  presence v2, maps shut:          ${p2}  |  ${p22}`);
process.exit(0);
