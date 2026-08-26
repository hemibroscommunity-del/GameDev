/* ═══ v2.3.1973: CROWD LOAD — every player in ONE zone ═══
 *
 * `load-tick.mjs` (v2.3.1575 era) answers "what does the room cost at N
 * players?" by SPREADING them across seven combat zones, one per index.
 * That is the shape a mature server sees, and it is the shape interest
 * management (v2.3.1575) was tuned against: same-zone peers keep 45 Hz,
 * everyone else rides the 1 Hz roster, so a 120-player run there is really
 * seven ~17-player crowds that barely see each other.
 *
 * A PUBLIC DEMO is the opposite shape.  Strangers arrive at once, they all
 * spawn in the same place, and the interesting question — the one nobody had
 * measured — is what happens when the whole population is in the SAME zone,
 * where the per-tick player delta is deliberately un-scoped and the payload
 * each socket receives grows with the crowd.  Serialization is O(N) (build
 * once per zone/protocol group), but egress is O(N^2) BYTES, and CPU is not
 * the axis that binds first.
 *
 * So this measures three things load-tick.mjs does not:
 *   1. tick CPU with the whole population in one zone;
 *   2. EGRESS — bytes actually written to sockets per second, which is what
 *      an iPhone on cellular pays for and where the O(N^2) term lives;
 *   3. LEAKS across join/leave churn — every in-memory map the room keeps,
 *      sampled before and after K rounds of the whole crowd reconnecting,
 *      which is what a demo's front door does all evening.
 * ...plus one badly-behaved client in a crowd of well-behaved ones, to see
 * what the other players pay for it.
 *
 * Same in-process harness as load-tick.mjs / protocol-v2.test.mjs: a REAL
 * GameRoom against mocked DO storage and fake sockets, so the numbers come
 * from the shipping code paths (monster AI, the damage handler, the relay
 * budget, the tick's own serialization), not a model of them.
 *
 * Run: cd server && node test/load-crowd.mjs [maxPlayers]
 * Not part of `npm test` — it is a measurement tool, like load-tick.mjs.
 */
import { performance } from 'node:perf_hooks';
import { GameRoom } from '../src/index.js';

/* Wall-clock is the number that matters (the tick has 22 ms of REAL time),
   but it is also the number a busy machine lies about — a CI box or a dev
   sandbox running four other jobs inflates it with time this process never
   got to run.  So every timing is taken twice: `performance.now()` for the
   honest budget answer, and `process.cpuUsage()` for the contention-proof
   one.  When the two disagree by a lot, the machine was busy and only the
   CPU column means anything. */
function cpuNowMs() { const u = process.cpuUsage(); return (u.user + u.system) / 1000; }

const TICK_BUDGET_MS = 22;
const MEASURE_TICKS = 450;        // ~10s of game time
const WARMUP_TICKS = 45;
const ZONE = 'meadow';            // where a new character starts, so where a demo crowd lands
const ATTACK_EVERY = 4;
const CHURN_ROUNDS = 6;

const argMax = Number(process.argv[2] || 60);
const COUNTS = [1, 5, 10, 20, 40, 60].filter((n) => n <= argMax);

function mockState() {
  return {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

/* Counts BYTES, not sends — the whole point of the egress column. */
function fakeWs() {
  return {
    sent: 0, bytes: 0,
    send(s) { this.sent++; this.bytes += typeof s === 'string' ? s.length : (s.byteLength || 0); },
    close() {},
  };
}
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() }; }
const pad = (v, w) => String(v).padStart(w);
const f2 = (x) => x.toFixed(2).padStart(7);
function pctile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]; }
function stat(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return { avg: arr.reduce((a, b) => a + b, 0) / arr.length, p95: pctile(s, 95), max: s[s.length - 1] };
}

/* Capture the tick closure without letting a real 22 ms interval run. */
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
    await room.webSocketMessage(ws, JSON.stringify({
      type: 'join', id: 'p' + i, name: 'L' + i, protocolVersion: 2,
      data: { x: 400 + (i % 8) * 20, y: 400 + Math.floor(i / 8) * 20, z: ZONE },
    }));
    players.push({ ws, id: 'p' + i });
  }
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn, players };
}

/* Keep everyone alive and in swinging range of a live monster — we are
   measuring a loaded room, not a graveyard. */
function pin(room, players) {
  const ms = room.monsters[ZONE] || [];
  for (const { id } of players) {
    const ps = room.playerState[id];
    if (!ps) continue;
    const m = ms.find((x) => x.alive);
    if (m) { ps.x = m.x; ps.y = m.y; ps._tgt = m.id; }
    ps.dead = false; ps.dying = false; ps.disconnected = false;
    ps.hp = 1e9; ps.maxHp = 1e9;
  }
}

/* `moveEvery` is the whole difference between "a crowd running about" and "a
   crowd standing in town reading a panel", and it matters because
   `_handleMove` adds the sender to `dirtyPlayers` on EVERY accepted move,
   changed or not — the idle keepalive included (movement.js:369).  So an idle
   player is not free: at the client's >=1 Hz standing-still keepalive they are
   still fanned out to every co-located peer once a second. */
async function crowd(n, moveEvery = 1, attack = true) {
  const { room, tickFn, players } = await loadRoom(n);
  if (!tickFn) throw new Error('failed to capture tick fn');
  room._ensureZoneMonsters(ZONE);
  pin(room, players);
  for (let i = 0; i < WARMUP_TICKS; i++) tickFn();
  for (const p of players) { p.ws.bytes = 0; p.ws.sent = 0; }

  const tickT = new Array(MEASURE_TICKS);
  const tickC = new Array(MEASURE_TICKS);
  const stepT = new Array(MEASURE_TICKS);
  const stepC = new Array(MEASURE_TICKS);
  let msgs = 0;
  for (let i = 0; i < MEASURE_TICKS; i++) {
    const mc0 = cpuNowMs();
    const m0 = performance.now();
    for (let p = 0; p < players.length; p++) {
      const { ws, id } = players[p];
      const ps = room.playerState[id];
      if (!ps) continue;
      /* A real client batches moves every 33 ms; one per 22 ms tick is
         deliberately conservative (slightly hotter than the real thing). */
      if ((i + p) % moveEvery === 0) {
        const jitter = moveEvery === 1 ? 8 : 0;   /* 0 = the standing-still keepalive */
        await room.webSocketMessage(ws, JSON.stringify({
          type: 'move', x: ps.x + (Math.random() - 0.5) * jitter, y: ps.y + (Math.random() - 0.5) * jitter, z: ZONE, d: 'south',
        }));
        msgs++;
      }
      if (attack && (i + p) % ATTACK_EVERY === 0 && ps._tgt) {
        await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ps._tgt, zone: ZONE, dmg: 40 } }));
        msgs++;
      }
    }
    const msgMs = performance.now() - m0;
    const msgCpu = cpuNowMs() - mc0;
    const c0 = cpuNowMs();
    const t0 = performance.now();
    tickFn();
    const tickMs = performance.now() - t0;
    const tickCpu = cpuNowMs() - c0;
    tickT[i] = tickMs; stepT[i] = msgMs + tickMs;
    tickC[i] = tickCpu; stepC[i] = msgCpu + tickCpu;
    if (i % 30 === 29) pin(room, players);
  }

  const secs = (MEASURE_TICKS * TICK_BUDGET_MS) / 1000;
  const totalBytes = players.reduce((a, p) => a + p.ws.bytes, 0);
  return {
    n,
    monsters: (room.monsters[ZONE] || []).length,
    tick: stat(tickT),
    step: stat(stepT),
    tickCpu: stat(tickC),
    stepCpu: stat(stepC),
    msgsPerSec: msgs / secs,
    perSocketKbps: n ? (totalBytes / n / secs) / 1024 : 0,
    roomKbps: (totalBytes / secs) / 1024,
    overPct: (100 * stepC.filter((t) => t > TICK_BUDGET_MS).length) / stepC.length,
  };
}

/* Every in-memory structure the room keeps that is keyed by something a
   player brings with them.  A demo's front door churns these all evening;
   anything that does not come back to its floor is a leak. */
function probe(room) {
  const size = (v) => (!v ? 0 : (v.size !== undefined ? v.size : Object.keys(v).length));
  let histRows = 0;
  for (const k of Object.keys(room.stateHistory || {})) histRows += (room.stateHistory[k] || []).length;
  let monsterRows = 0;
  for (const k of Object.keys(room.monsters || {})) monsterRows += (room.monsters[k] || []).length;
  return {
    sessions: room.sessions.size,
    playerState: size(room.playerState),
    stateHistory: size(room.stateHistory),
    stateHistoryRows: histRows,
    extractions: size(room.extractions),
    dirtyPlayers: size(room.dirtyPlayers),
    eventBuffer: (room.eventBuffer || []).length,
    monsterZones: size(room.monsters),
    monsterRows,
    lootPiles: size(room.loot),
    pvpConsent: size(room._pvpConsent),
    pvpHitLanes: size(room._pvpHitLanes),
    duels: size(room._duels),
    duelChallenges: size(room._duelChallenges),
    parties: size(room._parties),
    partyByPlayer: size(room._partyByPlayer),
    tradeOffers: size(room._tradeOffers),
    trades2: size(room._trades2),
    clanInvites: size(room._clanInvites),
    threats: size(room._threats),
    dungeons: size(room._dungeons),
    pendingPlayerStates: size(room._pendingPlayerStates),
    botstat: size(room._botstat),
  };
}

async function churn(n, rounds) {
  const { room, tickFn, players } = await loadRoom(n);
  room._ensureZoneMonsters(ZONE);
  for (let i = 0; i < WARMUP_TICKS; i++) tickFn();
  const before = probe(room);
  const heap0 = process.memoryUsage().heapUsed;

  /* Everyone leaves and comes back, `rounds` times, with the room ticking in
     between — the shape of a demo lobby all evening. */
  for (let r = 0; r < rounds; r++) {
    for (const p of players) { await room.webSocketClose(p.ws); room.sessions.delete(p.ws); }
    for (let i = 0; i < 20; i++) tickFn();
    for (let i = 0; i < players.length; i++) {
      const ws = fakeWs();
      room.sessions.set(ws, baseSession());
      await room.webSocketMessage(ws, JSON.stringify({
        type: 'join', id: 'p' + i, name: 'L' + i, protocolVersion: 2,
        data: { x: 400, y: 400, z: ZONE },
      }));
      players[i].ws = ws;
    }
    for (let i = 0; i < 40; i++) tickFn();
  }
  for (let i = 0; i < 60; i++) tickFn();
  const after = probe(room);
  if (globalThis.gc) globalThis.gc();
  const heap1 = process.memoryUsage().heapUsed;
  return { before, after, heapMb0: heap0 / 1048576, heapMb1: heap1 / 1048576 };
}

/* ── one badly-behaved client, in a crowd of well-behaved ones ──────────
 *
 * `mode` separates two different questions, because running them together
 * answers neither: the BRUTE flood eats the token bucket, so a polite abuser
 * sharing the same socket would look like it was being stopped when it was
 * only being starved by its own noisier half.
 *
 *   'quiet'  — the control.  The "bad" client behaves; everyone else moves.
 *              Every other row is only meaningful against this one.
 *   'brute'  — 40 relay messages per tick (~1800/s).  This is exactly what
 *              the v2.3.1618 token bucket exists for.
 *   'polite' — the same un-gated relay (`chat` has no case, so it rides the
 *              default branch) at EXACTLY the bucket's refill rate, each
 *              message as large as MAX_INBOUND_BYTES allows.  The bucket
 *              bounds the RATE and never the BYTES, and the default branch
 *              fans every message to every socket in the room, so this is
 *              the amplification the brute version never reaches.
 *
 * All three also send a genuinely OVERSIZE frame (over MAX_INBOUND_BYTES,
 * refused before the parse) and a teleport — and the teleport is preceded by
 * a legitimate move, so it is judged by the anti-teleport cap rather than by
 * the deliberate first-move bypass (movement.js).
 */
async function griefer(n, mode) {
  const { room, tickFn, players } = await loadRoom(n);
  room._ensureZoneMonsters(ZONE);
  pin(room, players);
  for (let i = 0; i < WARMUP_TICKS; i++) tickFn();

  const bad = players[0];
  const good = players.slice(1);
  for (const p of players) { p.ws.bytes = 0; }

  const chat = JSON.stringify({ type: 'chat', text: 'A'.repeat(400) });
  const fat = JSON.stringify({ type: 'chat', text: 'F'.repeat(room.MAX_INBOUND_BYTES - 200) });
  const huge = JSON.stringify({ type: 'chat', text: 'x'.repeat(room.MAX_INBOUND_BYTES + 4096) });
  /* RELAY_REFILL_PER_S tokens/second spread over the 45 Hz tick. */
  const politeEvery = Math.max(1, Math.round(45 / room.RELAY_REFILL_PER_S));
  const TICKS = 300;
  const tickT = [];
  let attempted = 0;
  /* Establish lastMoveAt so the teleport below meets the cap, not the
     first-move bypass. */
  const badPs0 = room.playerState[bad.id];
  await room.webSocketMessage(bad.ws, JSON.stringify({ type: 'move', x: badPs0.x, y: badPs0.y, z: ZONE }));
  for (let i = 0; i < TICKS; i++) {
    if (mode === 'brute') {
      for (let k = 0; k < 40; k++) { await room.webSocketMessage(bad.ws, chat); attempted++; }
    } else if (mode === 'polite' && i % politeEvery === 0) {
      await room.webSocketMessage(bad.ws, fat); attempted++;
    }
    await room.webSocketMessage(bad.ws, huge);
    await room.webSocketMessage(bad.ws, JSON.stringify({ type: 'move', x: 99999, y: 99999, z: ZONE }));
    for (const p of good) {
      const ps = room.playerState[p.id];
      if (!ps) continue;
      await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: ps.x + 2, y: ps.y + 2, z: ZONE }));
    }
    const t0 = performance.now();
    tickFn();
    tickT.push(performance.now() - t0);
  }
  const badPs = room.playerState[bad.id];
  const s = room.sessions.get(bad.ws);
  const secs = (TICKS * TICK_BUDGET_MS) / 1000;
  return {
    mode,
    attempted,
    dropped: (s && s.relayDropped) || 0,
    oversize: (s && s.oversize) || 0,
    teleported: !!(badPs && badPs.x > 5000),
    eventBufferEnd: room.eventBuffer.length,
    tick: stat(tickT),
    victimKbps: good.length ? (good.reduce((a, p) => a + p.ws.bytes, 0) / good.length / secs) / 1024 : 0,
    roomKbps: (players.reduce((a, p) => a + p.ws.bytes, 0) / secs) / 1024,
  };
}

console.log(`\nCROWD LOAD — every player in ONE zone (${ZONE}), budget ${TICK_BUDGET_MS}ms/tick, ${MEASURE_TICKS} ticks/run`);
console.log('(cpu = process CPU time, immune to a busy machine; wall = real elapsed, the actual 22 ms budget)');
console.log('\nplayers | monsters | in msg/s | tick cpu | tick wall | msg+tick cpu p95 | KB/s per socket | room KB/s | % over budget');
console.log('--------|----------|----------|----------|-----------|------------------|-----------------|-----------|--------------');
for (const n of COUNTS) {
  const r = await crowd(n);
  console.log(`${pad(r.n, 7)} | ${pad(r.monsters, 8)} | ${pad(Math.round(r.msgsPerSec), 8)} | ${f2(r.tickCpu.avg)} | ${pad(f2(r.tick.avg), 9)} | ${pad(f2(r.stepCpu.p95), 16)} | ${pad(r.perSocketKbps.toFixed(1), 15)} | ${pad(r.roomKbps.toFixed(0), 9)} | ${pad(r.overPct.toFixed(1), 12)}%`);
}

/* The same crowd STANDING STILL.  Nobody swings, and each client sends only
   the ~1 Hz keepalive move at an unchanged position — the town-square case,
   which is what a demo lobby actually looks like for most of its evening. */
console.log('\nSAME CROWD, IDLE (1 Hz keepalive move, unchanged position, no attacks — the town square):');
console.log('\nplayers | in msg/s | tick cpu | KB/s per socket | room KB/s');
console.log('--------|----------|----------|-----------------|----------');
for (const n of COUNTS) {
  const r = await crowd(n, 45, false);
  console.log(`${pad(r.n, 7)} | ${pad(Math.round(r.msgsPerSec), 8)} | ${f2(r.tickCpu.avg)} | ${pad(r.perSocketKbps.toFixed(1), 15)} | ${pad(r.roomKbps.toFixed(0), 9)}`);
}

const N = COUNTS[COUNTS.length - 1];
console.log(`\nJOIN/LEAVE CHURN — ${N} players, ${CHURN_ROUNDS} full reconnect rounds:`);
const c = await churn(N, CHURN_ROUNDS);
let leaks = 0;
for (const k of Object.keys(c.before)) {
  const a = c.before[k], b = c.after[k];
  if (b > a) leaks++;
  console.log(`  ${k.padEnd(22)} ${pad(a, 7)} -> ${pad(b, 7)}${b > a ? '  <-- GREW' : ''}`);
}
console.log(`  heap ${c.heapMb0.toFixed(1)} MB -> ${c.heapMb1.toFixed(1)} MB  (${(c.heapMb1 - c.heapMb0 >= 0 ? '+' : '') + (c.heapMb1 - c.heapMb0).toFixed(1)} MB)`);
console.log(`  ${leaks} structure(s) ended above where they started.`);

console.log(`\nONE BAD CLIENT in a crowd of ${N} (every row against the 'quiet' control):`);
console.log('\nmode   | relay sent | bucket-dropped | oversize refused | teleported | tick p95 | victims pay KB/s | room KB/s');
console.log('-------|------------|----------------|------------------|------------|----------|------------------|----------');
for (const mode of ['quiet', 'brute', 'polite']) {
  const g = await griefer(N, mode);
  console.log(`${g.mode.padEnd(6)} | ${pad(g.attempted, 10)} | ${pad(g.dropped, 14)} | ${pad(g.oversize, 16)} | ${pad(String(g.teleported), 10)} | ${pad(g.tick.p95.toFixed(2), 8)} | ${pad(g.victimKbps.toFixed(1), 16)} | ${pad(g.roomKbps.toFixed(0), 9)}`);
}
console.log('');
