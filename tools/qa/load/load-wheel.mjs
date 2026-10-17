/* ═══ v2.3.3194: WHEEL LOAD — the room's CPU with everyone in the Wheel ═══
 *
 * load-crowd.mjs (v2.3.1973) measured a crowd in the MEADOW: one zone, one
 * shared serialisation per tick, 0.16 ms of the 22 ms tick at 60 players.
 * Since v2.3.2990 the world is the Wheel, and three things there grow with
 * the crowd that the meadow never had:
 *   - every Wheel player's tick is built ON ITS OWN (tick.js: `key += '|' +
 *     s.id`, because each hears only the monsters near it), and each one
 *     carries every moving player in the Wheel -- O(N^2) work, not O(N);
 *   - `_wheelInterest` walks all 384 monsters for every player every tick;
 *   - the monster AI runs all 384 monsters every tick once anyone is there.
 *
 * Same in-process harness as load-crowd.mjs: a REAL GameRoom on mocked
 * storage and fake sockets, so the time is the shipping code's.  The clock is
 * SIMULATED (22 ms a tick, Date.now() advanced by hand), so a run that goes
 * faster than real time still walks at a legal pace and every move is judged
 * the way a real one is.  Moves arrive at the client's own cadence (one per
 * 33 ms while walking, wsClient.js MOVE_GAP_SEEN_MS); 30% of the crowd fight
 * their land's first stretch with the client's `monster_damage`, one swing
 * per ~0.7 s.  The rest walk the town and its commons.
 *
 *   node tools/qa/load/load-wheel.mjs [1,10,25,50,100] [--short]
 *   node --cpu-prof --cpu-prof-dir=/tmp/prof tools/qa/load/load-wheel.mjs 100
 *
 * "% of a core" is the CPU one second of game time costs: past 100% the room
 * cannot keep its 45 Hz, and a room with spikes and GC needs headroom well
 * before that.  Not part of `npm test` -- a measurement tool, like
 * server/test/load-crowd.mjs.  It lives HERE and not beside that one on
 * purpose: anything under server/ deploys the worker when it merges
 * (deploy-worker.yml, paths server/**), and a measurement tool is no reason to
 * restart the live room.  Read with docs/specs/load-test.md.
 */
import { performance } from 'node:perf_hooks';
import { GameRoom } from '../../../server/src/index.js';
/* v2.3.3300: the Wheel the room plays -- the long one, or with `--short` the
   short one (its kill switch, `wheel5x: false`), each its own table */
const SHORT = process.argv.includes('--short');
const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(SHORT ? '../../../server/src/wheelspawns1.js' : '../../../server/src/wheelspawns.js');

const TICK_MS = 22;
const MEASURE_TICKS = 450;   // ~10 s of game time
const WARMUP_TICKS = 90;
const MOVE_EVERY_MS = 33;
const SWING_EVERY_MS = 700;
const FIGHTERS = 0.3;
const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3300: the Wheel the room plays */
const WALK_R = 1400;
const HOMES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

const COUNTS = (process.argv.slice(2).find((a) => !a.startsWith('--')) || '1,10,25,50,75,100,150,200').split(',').map(Number).filter((n) => n > 0);

/* ── the simulated clock ─────────────────────────────────────────────── */
const realDateNow = Date.now;
let simNow = realDateNow();
Date.now = () => simNow;

function cpuNowMs() { const u = process.cpuUsage(); return (u.user + u.system) / 1000; }
function mockState() {
  return {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() {
  return { sent: 0, bytes: 0, send(s) { this.sent++; this.bytes += typeof s === 'string' ? s.length : (s.byteLength || 0); }, close() {} };
}
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
function pctile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]; }
function stat(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return { avg: arr.reduce((a, b) => a + b, 0) / arr.length, p95: pctile(s, 95), max: s[s.length - 1] };
}
const rand = (a, b) => a + Math.random() * (b - a);

async function loadRoom(n) {
  const room = new GameRoom(mockState(), mockEnv);
  if (SHORT) room._liveFlags = { wheel5x: false };
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 0; }
    return realSetInterval(fn, ms);
  };
  const players = [];
  for (let i = 0; i < n; i++) {
    const ws = fakeWs();
    room.sessions.set(ws, baseSession());
    const id = 'w' + i;
    await room.webSocketMessage(ws, JSON.stringify({
      type: 'join', id, name: 'W' + i, protocolVersion: 2,
      ws: [1, 5],   /* v2.3.3300: the Wheels a phone of today draws */
      data: { x: 1000, y: 1000, z: 'town' },
    }));
    const fighter = i % 10 < FIGHTERS * 10;
    const home = HOMES[i % HOMES.length];
    const p = { ws, id, fighter, home, x: ARRIVAL.x + rand(-60, 60), y: ARRIVAL.y + rand(-40, 40), tx: 0, ty: 0, acc: rand(0, MOVE_EVERY_MS), swingAcc: rand(0, SWING_EVERY_MS) };
    /* the zone change down to the Wheel, as wheelHome's trip sends it */
    await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: p.x, y: p.y, d: 'south', z: 'wheel', vx: 0, vy: 0 }));
    if (fighter) {
      /* stand them at their land's first stretch straight away: the walk out
         is not what is being measured */
      const pts = (WHEEL_SPAWNS[home] && WHEEL_SPAWNS[home].points) || [];
      const pt = pts[i % Math.max(1, pts.length)] || [ARRIVAL.x, ARRIVAL.y];
      p.x = pt[0] + rand(-80, 80); p.y = pt[1] + rand(-80, 80);
      p.anchor = { x: pt[0], y: pt[1] };
      room.playerState[id].x = p.x; room.playerState[id].y = p.y;
      room.playerState[id].lastMoveAt = undefined;   /* next move is a first move */
    }
    retarget(p);
    players.push(p);
  }
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn, players };
}

function retarget(p) {
  const c = p.fighter ? p.anchor : ARRIVAL;
  const r = (p.fighter ? 300 : WALK_R) * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  p.tx = c.x + Math.cos(a) * r; p.ty = c.y + Math.sin(a) * r;
}

/* keep the fighters alive: a death is a different workload (respawn, a trip
   through town), and the room's steady state is what is being measured */
function keepAlive(room, players) {
  for (const { id } of players) {
    const ps = room.playerState[id];
    if (!ps) continue;
    ps.dead = false; ps.dying = false; ps.respawnAt = 0;
    ps.hp = Math.max(ps.hp || 0, 1e6); ps.maxHp = Math.max(ps.maxHp || 0, 1e6);
  }
}

function nearestMonster(room, p) {
  let best = null, bestD = Infinity;
  for (const m of room.monsters.wheel || []) {
    if (!m.alive) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best && bestD < 600 ? best : null;
}

async function run(n) {
  const { room, tickFn, players } = await loadRoom(n);
  if (!tickFn) throw new Error('failed to capture the tick');
  keepAlive(room, players);
  let msgs = 0, msgCpuTotal = 0;
  const tickC = [], stepC = [], tickW = [];
  const speed = 165 / 1000;   /* px per ms */
  for (let t = 0; t < WARMUP_TICKS + MEASURE_TICKS; t++) {
    const measuring = t >= WARMUP_TICKS;
    if (t === WARMUP_TICKS) for (const p of players) { p.ws.bytes = 0; p.ws.sent = 0; }
    simNow += TICK_MS;
    const mc0 = cpuNowMs();
    for (const p of players) {
      p.acc += TICK_MS;
      p.swingAcc += TICK_MS;
      if (p.acc >= MOVE_EVERY_MS) {
        const dtMs = p.acc; p.acc = 0;
        let tx = p.tx, ty = p.ty;
        const target = p.fighter ? nearestMonster(room, p) : null;
        if (target) { tx = target.x; ty = target.y; }
        const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
        const stepPx = speed * dtMs;
        if (dist <= (target ? 50 : stepPx)) { if (!target) retarget(p); }
        else { p.x += (dx / dist) * stepPx; p.y += (dy / dist) * stepPx; }
        /* v2.3.3194: what a phone sends (bots.mjs sendMove): a tenth of a
           pixel, velocity in hundredths of a pixel a 60 Hz frame, its gear */
        await room.webSocketMessage(p.ws, JSON.stringify({
          type: 'move', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
          d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z: 'wheel',
          vx: Math.round(dx / (dist || 1) * speed * 1000 / 60 * 100), vy: Math.round(dy / (dist || 1) * speed * 1000 / 60 * 100),
          dodging: false, blocking: false, ba: null, dead: false,
        }));
        if (measuring) msgs++;
        if (p.fighter && target && p.swingAcc >= SWING_EVERY_MS && Math.hypot(target.x - p.x, target.y - p.y) < 70) {
          p.swingAcc = 0;
          await room.webSocketMessage(p.ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: target.id, zone: 'wheel', element: null, slot: 'melee', special: false } }));
          if (measuring) msgs++;
        }
      }
    }
    const msgCpu = cpuNowMs() - mc0;
    const c0 = cpuNowMs(), w0 = performance.now();
    tickFn();
    const tickCpu = cpuNowMs() - c0, tickWall = performance.now() - w0;
    if (measuring) { tickC.push(tickCpu); tickW.push(tickWall); stepC.push(msgCpu + tickCpu); msgCpuTotal += msgCpu; }
    if (t % 45 === 44) keepAlive(room, players);
  }
  const secs = (MEASURE_TICKS * TICK_MS) / 1000;
  const bytes = players.reduce((a, p) => a + p.ws.bytes, 0);
  const tick = stat(tickC), step = stat(stepC);
  const cpuPerSec = (tick.avg * MEASURE_TICKS + msgCpuTotal) / secs;   /* ms of CPU per second of game time */
  return {
    n, monsters: (room.monsters.wheel || []).length,
    msgsPerSec: msgs / secs,
    tickCpuAvg: tick.avg, tickCpuP95: tick.p95, tickWallAvg: stat(tickW).avg,
    msgCpuPerSec: msgCpuTotal / secs,
    stepCpuP95: step.p95,
    corePct: cpuPerSec / 10,
    perPlayerKBps: n ? bytes / n / secs / 1024 : 0,
    roomMBps: bytes / secs / 1048576,
    overBudgetPct: (100 * stepC.filter((x) => x > TICK_MS).length) / stepC.length,
  };
}

const pad = (v, w) => String(v).padStart(w);
console.log(`\nWHEEL LOAD -- everyone in the Wheel, ${Math.round(FIGHTERS * 100)}% fighting, simulated clock, ${MEASURE_TICKS} ticks (${(MEASURE_TICKS * TICK_MS / 1000).toFixed(1)} s of game time) a row`);
console.log('(cpu = this process\'s CPU time; "% of a core" = CPU one second of game time costs)\n');
console.log('players | monsters | msgs in/s | tick cpu ms avg / p95 | msgs cpu ms/s | % of a core | KB/s per player | room MB/s | ticks over 22ms');
console.log('--------|----------|-----------|-----------------------|---------------|-------------|-----------------|-----------|----------------');
for (const n of COUNTS) {
  const r = await run(n);
  console.log(`${pad(r.n, 7)} | ${pad(r.monsters, 8)} | ${pad(Math.round(r.msgsPerSec), 9)} | ${pad(r.tickCpuAvg.toFixed(2), 9)} / ${pad(r.tickCpuP95.toFixed(2), 9)} | ${pad(r.msgCpuPerSec.toFixed(1), 13)} | ${pad(r.corePct.toFixed(1) + '%', 11)} | ${pad(r.perPlayerKBps.toFixed(1), 15)} | ${pad(r.roomMBps.toFixed(2), 9)} | ${pad(r.overBudgetPct.toFixed(1) + '%', 14)}`);
}
console.log('');
Date.now = realDateNow;
process.exit(0);
