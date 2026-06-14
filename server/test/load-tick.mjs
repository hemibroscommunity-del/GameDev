/* Load test: measure GameRoom server-tick cost vs player count.
 *
 * Reuses the SAME in-process harness as protocol-v2.test.mjs (a real
 * GameRoom with mocked Durable Object storage + fake sockets), so the
 * numbers reflect the actual server tick body -- monster AI, node/loot
 * ticks, lag-comp history, and the per-player broadcast/serialization --
 * not a synthetic model.
 *
 * Why this matters: one room is a single CPU running this tick ~45x/sec
 * (TICK_RATE=22ms) for everyone in it.  If a tick can't finish inside its
 * 22ms budget, the game lags for every player in that room.  That CPU
 * ceiling -- not Cloudflare cost -- is what sets the max players per room.
 *
 * Worst-case bias (intentional): every player is parked on top of a
 * monster pack so monster AI (aggro + pursuit) runs hot, and players are
 * kept alive (huge HP) so per-tick broadcast volume stays at its ceiling.
 * Real play is lighter, so these are pessimistic (safe) numbers.
 *
 * Run: cd server && node test/load-tick.mjs
 */
import { performance } from 'node:perf_hooks';
import { GameRoom } from '../src/index.js';

const TICK_BUDGET_MS = 22;       // 45Hz server tick
const MEASURE_TICKS = 600;       // ~13s of game time
const WARMUP_TICKS = 30;
const REPIN_EVERY = 30;          // keep players alive/on-pack mid-run
const PLAYER_COUNTS = [20, 35, 50, 65, 80];
// Combat zones that actually spawn monsters server-side (mist has none).
const COMBAT_ZONES = ['meadow', 'ember', 'frost', 'thunder', 'hollows', 'sky', 'tidal'];

function mockState() {
  return {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

// Fake socket: count sends (the server still does the real JSON.stringify
// before send; we just don't re-parse, which would be harness overhead).
function fakeWs() { return { sent: 0, send() { this.sent++; }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() }; }

function pctile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]; }

// Park every player on a monster in their zone and make them durable so a
// stray monster hit doesn't kill them mid-measurement (which would drop the
// load).  Not counted in tick timing.
function pinPlayers(room, n) {
  for (let i = 0; i < n; i++) {
    const ps = room.playerState['p' + i];
    if (!ps) continue;
    const ms = room.monsters[ps.z];
    if (ms && ms.length) { const m = ms[i % ms.length]; ps.x = m.x; ps.y = m.y; }
    ps.dead = false; ps.disconnected = false;
    ps.hp = 1e9; ps.maxHp = 1e9;
  }
}

async function loadRoom(n) {
  const room = new GameRoom(mockState(), mockEnv);

  // Capture the real tick body WITHOUT scheduling it: intercept only the
  // 22ms tick's setInterval (the first join auto-starts the loop), and let
  // any other setInterval through.  We then drive ticks manually + timed.
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 0; }
    return realSetInterval(fn, ms);
  };

  for (let i = 0; i < n; i++) {
    const ws = fakeWs();
    room.sessions.set(ws, baseSession());
    const zone = COMBAT_ZONES[i % COMBAT_ZONES.length];
    await room.webSocketMessage(ws, JSON.stringify({
      type: 'join', id: 'p' + i, name: 'L' + i, protocolVersion: 2,
      data: { x: 200, y: 200, z: zone },
    }));
  }
  // Direct webSocketMessage joins bypass the upgrade path that auto-starts
  // the loop, so start it explicitly -- our interceptor grabs the tick fn.
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}

// Pad each active zone's monster list to `perZone` by cloning existing
// monsters (unique id + jittered position) -- simulates Phase 2 combat
// density without needing the new spawn tables.
function densify(room, perZone) {
  for (const z of COMBAT_ZONES) {
    const arr = room.monsters[z];
    if (!arr || !arr.length) continue;
    let k = 0;
    while (arr.length < perZone) {
      const src = arr[k++ % arr.length];
      const c = { ...src, id: src.id + '-d' + arr.length };
      c.x = src.x + (Math.random() - 0.5) * 240;
      c.y = src.y + (Math.random() - 0.5) * 240;
      c.spawnX = c.x; c.spawnY = c.y;
      c.alive = true; c.hp = c.maxHp; c.targetId = null; c.atkCd = 0;
      arr.push(c);
    }
  }
}

async function run(n, perZone) {
  const { room, tickFn } = await loadRoom(n);
  if (!tickFn) throw new Error('failed to capture tick fn (setInterval not called at TICK_RATE)');

  pinPlayers(room, n);
  if (perZone) { densify(room, perZone); pinPlayers(room, n); }

  let monsters = 0;
  for (const z of COMBAT_ZONES) monsters += (room.monsters[z]?.length || 0);

  for (let i = 0; i < WARMUP_TICKS; i++) tickFn();

  const times = new Array(MEASURE_TICKS);
  for (let i = 0; i < MEASURE_TICKS; i++) {
    const t0 = performance.now();
    tickFn();
    times[i] = performance.now() - t0;
    if (i % REPIN_EVERY === REPIN_EVERY - 1) pinPlayers(room, n);
  }

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const over = times.filter((t) => t > TICK_BUDGET_MS).length;
  return { n, monsters, avg, p50: pctile(sorted, 50), p95: pctile(sorted, 95), max: sorted[sorted.length - 1], overPct: (100 * over) / times.length };
}

const f = (x) => x.toFixed(2).padStart(7);
async function table(label, perZone) {
  console.log(`\n${label}`);
  console.log('players | monsters |  avg ms |  p50 ms |  p95 ms |  max ms | % over 22ms');
  console.log('--------|----------|---------|---------|---------|---------|------------');
  for (const n of PLAYER_COUNTS) {
    const r = await run(n, perZone);
    console.log(`${String(r.n).padStart(7)} | ${String(r.monsters).padStart(8)} | ${f(r.avg)} | ${f(r.p50)} | ${f(r.p95)} | ${f(r.max)} | ${r.overPct.toFixed(1).padStart(9)}%`);
  }
}

console.log(`\nGameRoom tick load test  --  budget ${TICK_BUDGET_MS}ms (45Hz), ${MEASURE_TICKS} ticks/run, worst case`);
await table('A) CURRENT spawn density (sparse, as shipped):', null);
await table('B) PHASE 2 density (~25 monsters/zone, ~175 total):', 25);
console.log('\nReading it: p95 well under 22ms = headroom to raise the cap; p95 near/over 22ms');
console.log('= that player count is the ceiling for one room at 45Hz (lag for everyone above it).\n');
