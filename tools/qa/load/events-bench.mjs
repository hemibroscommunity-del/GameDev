/* ═══ v2.3.3245: WHAT THE TICK'S EVENTS COST THE ROOM, IN-PROCESS ═══
 *
 * docs/specs/events-by-place.md.  The real GameRoom in Node with fake
 * sockets: N players in the Wheel (a third walking about Brotown, two thirds
 * standing at the monsters), E events a tick (a third monster hits, a third
 * swings, a third arrows, from the fighters, and a chat line every tenth
 * tick).  The same room is timed with events by place off and on, twice each,
 * after 20 ticks of warm-up.  Players stand still, so a tick is events and
 * monsters: this measures the events' part, not a whole tick's.
 *
 *   node tools/qa/load/events-bench.mjs [N 120] [E 2] [ticks 150] [server dir]
 *
 * SENDMODE=utf8 (the default) encodes every message as the runtime must;
 * SENDMODE=deflate also compresses each one alone, which overstates the
 * runtime, which keeps one compressor per socket; SENDMODE=none only counts.
 * Prints ms a tick (the room's code plus that sending) and KB a phone a tick.
 */
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { WHEEL_CENTRE } from '../../../server/src/wheelspawns.js';   /* v2.3.3311: the Wheel the room plays */

const N = +(process.argv[2] || 120), E = +(process.argv[3] || 2), T = +(process.argv[4] || 150);
const dir = process.argv[5] ? pathToFileURL(process.argv[5] + '/').href : new URL('../../../server/', import.meta.url).href;
const MODE = process.env.SENDMODE || 'utf8';
const { GameRoom } = await import(dir + 'src/index.js');

function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

const room = new GameRoom(mockState(), mockEnv);
room.MAX_PLAYERS = Math.max(room.MAX_PLAYERS, N + 10);
let tickFn = null;
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
room.startTickLoop();
globalThis.setInterval = realSetInterval;

const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3311: the Wheel the room plays */
const ps = [];
for (let i = 0; i < N; i++) {
  const ws = {
    b: 0,
    send(s) {
      this.b += s.length;
      if (MODE === 'utf8') Buffer.from(s);
      else if (MODE === 'deflate') zlib.deflateRawSync(Buffer.from(s), { level: 6 });
    },
    close() {},
  };
  room.sessions.set(ws, { id: null, name: 'B', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  const id = 'eb' + i;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ARRIVAL.x, y: ARRIVAL.y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  ps.push({ ws, id });
}
tickFn();
const ms = room.monsters.wheel || [];
const fighters = [];
ps.forEach((p, i) => {
  const s = room.playerState[p.id];
  if (i % 3 === 0) { s.x = ARRIVAL.x + (rnd() - 0.5) * 2000; s.y = ARRIVAL.y + (rnd() - 0.5) * 2000; }
  else { const m = ms[(i * 7) % ms.length]; s.x = m.x + (rnd() - 0.5) * 300; s.y = m.y + (rnd() - 0.5) * 300; p.m = m; fighters.push(p); }
});
const keepUp = () => { for (const p of ps) { const s = room.playerState[p.id]; s.hp = s.maxHp = 1e9; s.dead = false; s.dying = false; } };
function pushEvents(t) {
  for (let k = 0; k < E; k++) {
    const f = fighters[(t * 31 + k * 17) % fighters.length];
    if (k % 3 === 0) room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: f.m.id, zone: 'wheel', dmg: 12, isCrit: false, attackerId: f.id, slot: 'melee', hpPct: 0.5 } });
    else if (k % 3 === 1) room.eventBuffer.push({ type: 'player_swing', from: f.id, payload: { id: f.id, ts: Date.now(), wpn: 'sword', ang: 1.234 } });
    else room.eventBuffer.push({ type: 'player_projectile', from: f.id, payload: { id: f.id, x: 1, y: 2, ang: 0.5, isStaff: false, ts: Date.now(), life: 90 } });
  }
  if (t % 10 === 0) room.eventBuffer.push({ type: 'chat', from: ps[0].id, payload: { id: ps[0].id, text: 'hi' } });
}
function run(placed) {
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { eventplace: placed });
  for (let t = 0; t < 20; t++) { pushEvents(t); keepUp(); tickFn(); }
  for (const p of ps) p.ws.b = 0;
  let total = 0;
  for (let t = 0; t < T; t++) {
    pushEvents(t);
    keepUp();
    const t0 = performance.now();
    tickFn();
    total += performance.now() - t0;
  }
  const bytes = ps.reduce((a, p) => a + p.ws.b, 0);
  return `${(total / T).toFixed(2)} ms a tick, ${(bytes / T / N / 1024).toFixed(2)} KB a phone`;
}
const before = [run(false)], after = [run(true)];
before.push(run(false)); after.push(run(true));
console.log(`${N} players, ${E} events a tick, sending: ${MODE}`);
console.log(`  everyone gets every event:  ${before.join('  |  ')}`);
console.log(`  events by place:            ${after.join('  |  ')}`);
process.exit(0);
