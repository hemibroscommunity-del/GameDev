/* Load test: measure GameRoom server cost vs player count.
 *
 * Reuses the SAME in-process harness as protocol-v2.test.mjs (a real
 * GameRoom with mocked Durable Object storage + fake sockets), so the
 * numbers reflect the actual server code -- monster AI, the damage path,
 * mummy->skeleton transforms, death/respawn/loot, lag-comp history, and
 * the per-player broadcast/serialization -- not a synthetic model.
 *
 * One room is a single CPU running its tick ~45x/sec (TICK_RATE=22ms) for
 * everyone in it, plus handling every incoming client message. If the work
 * for one ~22ms window can't finish in 22ms, the game lags for everyone in
 * that room. That CPU ceiling -- not Cloudflare cost -- caps players/room.
 *
 * Three scenarios:
 *   A) current sparse placeholder spawns (reference)
 *   B) all real mummies, pursuit only (no one fighting back)
 *   C) all real mummies, REALISTIC combat: every player sends moves +
 *      attacks through the real handlers, so monsters take damage,
 *      transform, die, drop loot and respawn -- the full live load,
 *      including the incoming-message cost (which is also the $ driver).
 *
 * Run: cd server && node test/load-tick.mjs
 */
import { performance } from 'node:perf_hooks';
import { GameRoom } from '../src/index.js';

const TICK_BUDGET_MS = 22;       // 45Hz server tick
const MEASURE_TICKS = 600;       // ~13.2s of game time
const WARMUP_TICKS = 30;
const REPIN_EVERY = 30;          // keep players alive / on a live target mid-run
const ATTACK_EVERY = 4;          // each player swings ~ every 4 ticks (~11/sec)
const ATTACK_DMG = 150;
const PLAYER_COUNTS = [20, 50, 80, 100, 120];
const COMBAT_ZONES = ['meadow', 'ember', 'frost', 'thunder', 'hollows', 'sky', 'tidal'];

function mockState() {
  return {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

function fakeWs() { return { sent: 0, send() { this.sent++; }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() }; }
const pad = (v, w) => String(v).padStart(w);
const f = (x) => x.toFixed(2).padStart(7);
function pctile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]; }
function stat(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return { avg: arr.reduce((a, b) => a + b, 0) / arr.length, p95: pctile(s, 95), max: s[s.length - 1] };
}

// Park every player on a live monster in their zone (records the target id
// so realistic attacks land in range) and make them durable so a stray hit
// doesn't drop them mid-measurement. Not counted in timing.
function pinPlayers(room, n) {
  for (let i = 0; i < n; i++) {
    const ps = room.playerState['p' + i];
    if (!ps) continue;
    const ms = room.monsters[ps.z];
    if (ms && ms.length) {
      const m = ms.find((x) => x.alive) || ms[i % ms.length];
      ps.x = m.x; ps.y = m.y; ps._tgt = m.id;
    }
    ps.dead = false; ps.disconnected = false;
    ps.hp = 1e9; ps.maxHp = 1e9;
  }
}

// Replace every active zone's monsters with `perZone` REAL mummies -- the
// fully-implemented monster (mummy->skeleton transform, proper AI/spd) that
// Desert Winds actually spawns. Templates come from the server's own sky
// spawn path so variant/speed/stats are authentic.
function setMummies(room, perZone) {
  const templates = room._spawnZoneMonsters('sky');
  if (!templates.length || templates[0].variant !== 'mummy') {
    throw new Error('expected mummy templates from sky, got ' + (templates[0] && templates[0].variant));
  }
  const SIZE = 1024, margin = 128;
  for (const z of COMBAT_ZONES) {
    const arr = [];
    for (let i = 0; i < perZone; i++) {
      const src = templates[i % templates.length];
      const x = margin + Math.random() * (SIZE - margin * 2);
      const y = margin + Math.random() * (SIZE - margin * 2);
      arr.push({ ...src, id: 'mum-' + z + '-' + i, x, y, spawnX: x, spawnY: y, alive: true, hp: src.maxHp, targetId: null, atkCd: 0 });
    }
    room.monsters[z] = arr;
  }
}

async function loadRoom(n) {
  const room = new GameRoom(mockState(), mockEnv);
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
    const zone = COMBAT_ZONES[i % COMBAT_ZONES.length];
    await room.webSocketMessage(ws, JSON.stringify({
      type: 'join', id: 'p' + i, name: 'L' + i, protocolVersion: 2,
      data: { x: 200, y: 200, z: zone },
    }));
    players.push({ ws, id: 'p' + i });
  }
  room.startTickLoop();          // direct joins bypass the auto-start path
  globalThis.setInterval = realSetInterval;
  return { room, tickFn, players };
}

async function run(n, mode, perZone, realistic) {
  const { room, tickFn, players } = await loadRoom(n);
  if (!tickFn) throw new Error('failed to capture tick fn');
  if (mode === 'mummy') setMummies(room, perZone);
  pinPlayers(room, n);

  let monsters = 0;
  for (const z of COMBAT_ZONES) monsters += (room.monsters[z]?.length || 0);

  for (let i = 0; i < WARMUP_TICKS; i++) tickFn();

  const tickT = new Array(MEASURE_TICKS);
  const stepT = realistic ? new Array(MEASURE_TICKS) : null;
  let msgs = 0;
  for (let i = 0; i < MEASURE_TICKS; i++) {
    let msgMs = 0;
    if (realistic) {
      const m0 = performance.now();
      for (let p = 0; p < players.length; p++) {
        const { ws, id } = players[p];
        const ps = room.playerState[id];
        if (!ps) continue;
        // Move every tick (slightly faster than the client's 33ms batch -> conservative).
        await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ps.x + (Math.random() - 0.5) * 8, y: ps.y + (Math.random() - 0.5) * 8, z: ps.z }));
        msgs++;
        // Attack the pinned (in-range) target periodically.
        if ((i + p) % ATTACK_EVERY === 0 && ps._tgt) {
          await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ps._tgt, zone: ps.z, dmg: ATTACK_DMG } }));
          msgs++;
        }
      }
      msgMs = performance.now() - m0;
    }
    const t0 = performance.now();
    tickFn();
    const tickMs = performance.now() - t0;
    tickT[i] = tickMs;
    if (stepT) stepT[i] = msgMs + tickMs;
    if (i % REPIN_EVERY === REPIN_EVERY - 1) pinPlayers(room, n);
  }

  const res = { n, monsters, tick: stat(tickT) };
  if (realistic) {
    res.step = stat(stepT);
    res.msgsPerSec = msgs / (MEASURE_TICKS * TICK_BUDGET_MS / 1000); // tick interval == budget == 22ms
    res.overPct = (100 * stepT.filter((t) => t > TICK_BUDGET_MS).length) / stepT.length;
  } else {
    res.overPct = (100 * tickT.filter((t) => t > TICK_BUDGET_MS).length) / tickT.length;
  }
  return res;
}

async function tickTable(label, mode, perZone) {
  console.log(`\n${label}`);
  console.log('players | monsters |  avg ms |  p95 ms |  max ms | % over 22ms');
  console.log('--------|----------|---------|---------|---------|------------');
  for (const n of PLAYER_COUNTS) {
    const r = await run(n, mode, perZone, false);
    console.log(`${pad(r.n, 7)} | ${pad(r.monsters, 8)} | ${f(r.tick.avg)} | ${f(r.tick.p95)} | ${f(r.tick.max)} | ${pad(r.overPct.toFixed(1), 9)}%`);
  }
}

async function realisticTable(label, perZone) {
  console.log(`\n${label}`);
  console.log('players | monsters | in msgs/s | msg+tick avg | msg+tick p95 | % over 22ms');
  console.log('--------|----------|-----------|--------------|--------------|------------');
  for (const n of PLAYER_COUNTS) {
    const r = await run(n, 'mummy', perZone, true);
    console.log(`${pad(r.n, 7)} | ${pad(r.monsters, 8)} | ${pad(Math.round(r.msgsPerSec), 9)} | ${pad(f(r.step.avg), 12)} | ${pad(f(r.step.p95), 12)} | ${pad(r.overPct.toFixed(1), 9)}%`);
  }
}

console.log(`\nGameRoom load test  --  budget ${TICK_BUDGET_MS}ms per 45Hz window, ${MEASURE_TICKS} ticks/run, worst case`);
await tickTable('A) CURRENT spawns (mixed placeholder monsters, sparse) -- tick only:', 'current', null);
await tickTable('B) ALL-MUMMY (real monster) ~25/zone -- pursuit only, tick:', 'mummy', 25);
await realisticTable('C) ALL-MUMMY realistic combat (moves + attacks + transform/death/respawn/loot) -- msg handling + tick:', 25);
console.log('\nin msgs/s = incoming client messages/sec the room handles (also the request-billing driver).');
console.log('msg+tick = total server CPU per 22ms window. Under 22ms = fine; near/over = the ceiling.\n');
