/* ═══ v2.3.3194: THE BOT LOAD TEST — HOW MANY PLAYERS DOES THE ROOM HOLD? ═══
 *
 * docs/WORLD-ARCHITECTURE.md §11 said a room "tops out around 30-60 busy
 * players" and asked for "a bot load test ... before any launch push".  The
 * capacity campaign before it (server/test/load-crowd.mjs, v2.3.1973) measured
 * the OLD world inside a simulated room: one meadow zone, shared serialisation.
 * Since v2.3.2990 the whole world is ONE zone, the Wheel, with 384 monsters and
 * a per-player view of them (tick.js builds every Wheel player's tick on its
 * own), and nothing had measured that against the real runtime.  This does.
 *
 *   node tools/qa/load/load.mjs [--steps 10,25,50] [--hold 20] [--settle 20]
 *        [--procs 3] [--fighters 0.3] [--cap 400] [--idle] [--pong N]
 *        [--server <a server/ folder>] [--observability] [--url ws://127.0.0.1:PORT]
 *        [--no-deflate] [--move-ms 33] [--town-move-ms 66] [--diet] [--seen-r 2400]
 *        [--inspector-port 9230] [--worker-log <file>] [--walk-r 400] [--track]
 *
 * What it does:
 *   1. copies server/ to a temporary folder and raises MAX_PLAYERS there
 *      (only there: the game's own code is never edited), then starts that
 *      copy with `wrangler dev --local` -- the real GameRoom, the real
 *      workerd, real WebSockets on 127.0.0.1, its own empty storage, and
 *      wrangler's own local tracing OFF (it made every message about five
 *      times dearer than the room's own handling of it, and froze the room
 *      at ~95 players, which the room without it never did);
 *   2. forks `--procs` bot processes (bots.mjs), each a group of fake
 *      players that join, go down to the Wheel and walk or fight there the
 *      way a phone does;
 *   3. adds players step by step, lets each step settle, measures it for
 *      `--hold` seconds, and stops early once the room is clearly broken;
 *   4. prints a table and writes tools/qa/out/load/load-<time>.{json,md}.
 *
 * NEVER POINT IT AT THE LIVE GAME.  It fills a room with hundreds of
 * characters, each with a stored record.  `--url` accepts 127.0.0.1 and
 * localhost only, on purpose.
 *
 * Read the numbers with docs/specs/load-test.md: what each column means, why
 * this machine is not Cloudflare's, and what the last run found.
 */
import { fork, spawn } from 'node:child_process';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, createConnection } from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const HOMES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

/* ── options ──────────────────────────────────────────────────────────── */
function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : dflt;
}
const OPT = {
  steps: String(arg('steps', '10,25,50,75,100,125,150,200')).split(',').map((s) => +s).filter((n) => n > 0),
  hold: +arg('hold', 20),
  settle: +arg('settle', 20),             /* a fighter's walk out to its land is ~20 s */
  procs: Math.max(1, +arg('procs', 3)),
  fighters: Math.min(1, Math.max(0, +arg('fighters', 0.3))),
  cap: +arg('cap', 400),
  url: arg('url', null),
  joinRate: +arg('joinrate', 10),          /* joins per second while a step fills */
  room: arg('room', 'loadtest'),
  stopP95: +arg('stop-p95', 1500),         /* ms: the others' moves this late at p95 = broken */
  stopTickRate: +arg('stop-tickrate', 25), /* ticks a second the server still manages */
  idle: process.argv.includes('--idle'),   /* everyone stands still: 1 keepalive a second */
  pongHz: +arg('pong', 0),                 /* extra do-nothing messages a second per player */
  recover: !process.argv.includes('--no-recover'),
  observability: process.argv.includes('--observability'),   /* wrangler's local tracing on (off by default) */
  /* v2.3.3199: the bots do not OFFER permessage-deflate, so the room sends
     them its messages uncompressed -- to measure what compressing every
     message costs the room.  The live game compresses: compatibility_date
     2024-12-01 turns web_socket_compression on, every phone's browser offers
     it, and so does Node's own WebSocket, which the bots use otherwise.  (The
     no_web_socket_compression flag in a copy's wrangler.toml did NOT stop
     the local runtime negotiating it, tried 2026-10-13: hence the client.) */
  noDeflate: process.argv.includes('--no-deflate'),
  moveMs: +arg('move-ms', 0),             /* v2.3.3199: a walker's move every N ms (0: the phone's 33) */
  townMoveMs: +arg('town-move-ms', 0),     /* v2.3.3203: the town walkers' (not the fighters') move every N ms */
  diet: process.argv.includes('--diet'),     /* v2.3.3204: the walkers keep a steady walk's moves back as a phone on the safe ground does (src/game/moveDiet.js) */
  track: process.argv.includes('--track'),   /* v2.3.3220: every bot sends a phone's 2 s look (bots.mjs TRACK_MS), relayed by the worker to everyone */
  seenR: +arg('seen-r', 0),               /* v2.3.3199: "others' moves seen" counts senders this near (0: 2,400) */
  walkR: +arg('walk-r', 0),               /* v2.3.3220: the town walkers' circle (0: bots.mjs WALK_R, 1,400); smaller packs them in */
  inspectorPort: +arg('inspector-port', 0),   /* v2.3.3203: the runtime's debugger port, for a CPU profile (cdpprof.mjs) */
  server: arg('server', null),             /* a server/ folder to test instead of this repo's own */
  workerLog: arg('worker-log', null),      /* v2.3.3203: write the worker's whole log here at the end */
  recoverTo: +arg('recover-to', 0.6),       /* share of the players kept after a break */
  recoverSettle: +arg('recover-settle', 20), /* seconds given to come back before measuring */
};
if (OPT.url && !/^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(OPT.url)) {
  console.error('load.mjs: --url must be a local worker (127.0.0.1 or localhost). Never the live game.');
  process.exit(2);
}

/* ── helpers ──────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const r1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
async function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

/* ── v2.3.3199: what a phone is sent ON THE WIRE ───────────────────────
   The room compresses every message to a phone (permessage-deflate: the
   worker's compatibility date turns web_socket_compression on, and every
   browser offers it), so a bot's own byte count -- the messages as it reads
   them, unzipped -- is not what a phone downloads.  Measured at 50 players
   in town: 177 KB/s unzipped, 13 KB/s on the wire.  One bot (the first of
   the first process) goes through this proxy, which counts the bytes the
   room really sent it; its own unzipped count over the same window gives
   the ratio, and every player's download on the wire follows from it. */
async function startWireProxy(targetPort) {
  const counts = { down: 0, up: 0 };
  const server = createServer((c) => {
    const s = createConnection({ host: '127.0.0.1', port: targetPort });
    c.on('data', (d) => { counts.up += d.length; s.write(d); });
    s.on('data', (d) => { counts.down += d.length; c.write(d); });
    const end = () => { c.destroy(); s.destroy(); };
    c.on('close', end); s.on('close', end); c.on('error', end); s.on('error', end);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, counts, server };
}

/* ── the server copy ──────────────────────────────────────────────────── */
async function serverCopy(cap) {
  const dir = await mkdtemp(join(tmpdir(), 'bt-load-server-'));
  /* --server: another checkout's server/ (a branch under test), copied the
     same way; this repo's own by default */
  const from = OPT.server ? resolve(OPT.server) : join(REPO, 'server');
  await cp(join(from, 'src'), join(dir, 'src'), { recursive: true });
  for (const f of ['wrangler.toml', 'package.json']) await cp(join(from, f), join(dir, f));
  const f = join(dir, 'src', 'index.js');
  const src = await readFile(f, 'utf8');
  const re = /this\.MAX_PLAYERS = (\d+);/;
  const m = src.match(re);
  if (!m) throw new Error('load.mjs: MAX_PLAYERS not found in server/src/index.js -- update serverCopy()');
  await writeFile(f, src.replace(re, `this.MAX_PLAYERS = ${cap};`));
  return { dir, realCap: +m[1] };
}

async function startWorker(dir, port) {
  const state = await mkdtemp(join(tmpdir(), 'bt-load-state-'));
  /* detached, so the whole npx -> node -> workerd tail is one process group
     and one kill reaches all of it (tools/qa/mp/harness.mjs, same lesson) */
  /* wrangler 4.x records a trace and the logs of EVERY event for its local
     explorer page (X_LOCAL_OBSERVABILITY / X_LOCAL_EXPLORER, both on by
     default).  The live runtime does nothing of the kind, and every incoming
     WebSocket message is an event, so it is off unless --observability asks
     for it: the cost being measured is the room's, not the dev tooling's. */
  const env = Object.assign({}, process.env, OPT.observability ? {} : { X_LOCAL_OBSERVABILITY: 'false', X_LOCAL_EXPLORER: 'false' });
  const proc = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1',
    '--persist-to', state, '--var', 'ADMIN_KEY:load-test-' + process.pid,
    /* v2.3.3203: --inspector-port N: the runtime's own debugger on N, so a
       CPU profile of the real room can be taken while it runs (cdpprof.mjs) */
    ...(OPT.inspectorPort ? ['--inspector-port', String(OPT.inspectorPort)] : [])], {
    cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; if (log.length > 2e6) log = log.slice(-1e6); });
  proc.stderr.on('data', (d) => { log += d; if (log.length > 2e6) log = log.slice(-1e6); });
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await sleep(1000);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) });
      if (res.status) return { proc, state, log: () => log };
    } catch { /* not up yet */ }
  }
  try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* gone */ }
  throw new Error('worker did not start in 120 s:\n' + log.slice(-2000));
}

/* ── the server's CPU, from /proc ─────────────────────────────────────────
   A Durable Object runs on ONE thread, so the number that says "full" is the
   busiest thread's share of one core, not the process total. */
const HZ = 100;   /* CLK_TCK on Linux */
function statOf(path) {
  try {
    const s = readFileSync(path, 'utf8');
    const rest = s.slice(s.lastIndexOf(')') + 2).split(' ');
    return { comm: s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')), pgrp: +rest[2], ticks: +rest[11] + +rest[12] };
  } catch { return null; }
}
async function groupPids(pgid) {
  const out = [];
  for (const d of await readdir('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    const st = statOf(`/proc/${d}/stat`);
    if (st && st.pgrp === pgid) out.push({ pid: +d, comm: st.comm });
  }
  return out;
}
async function cpuSnapshot(pids) {
  const snap = { at: Date.now(), procs: {}, threads: {}, rssMb: 0 };
  for (const { pid, comm } of pids) {
    const st = statOf(`/proc/${pid}/stat`);
    if (!st) continue;
    snap.procs[pid] = { comm, ticks: st.ticks };
    if (comm === 'workerd') {
      try {
        const m = readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+) kB/);
        if (m) snap.rssMb += +m[1] / 1024;
      } catch { /* gone */ }
      try {
        for (const tid of await readdir(`/proc/${pid}/task`)) {
          const t = statOf(`/proc/${pid}/task/${tid}/stat`);
          if (t) snap.threads[pid + '/' + tid] = t.ticks;
        }
      } catch { /* gone */ }
    }
  }
  return snap;
}
function cpuBetween(a, b) {
  const secs = (b.at - a.at) / 1000;
  const pctOf = (d) => (d / HZ / secs) * 100;
  let workerd = 0, other = 0, busiest = 0;
  for (const pid of Object.keys(b.procs)) {
    if (!a.procs[pid]) continue;
    const d = b.procs[pid].ticks - a.procs[pid].ticks;
    if (b.procs[pid].comm === 'workerd') workerd += d; else other += d;
  }
  for (const k of Object.keys(b.threads)) {
    if (a.threads[k] === undefined) continue;
    busiest = Math.max(busiest, b.threads[k] - a.threads[k]);
  }
  return { workerdPct: pctOf(workerd), busiestThreadPct: pctOf(busiest), otherPct: pctOf(other), rssMb: b.rssMb };
}

/* ── the bots ─────────────────────────────────────────────────────────── */
const groups = [];
let reports = [];
function startBots(url, wireUrl) {
  for (let i = 0; i < OPT.procs; i++) {
    const child = fork(join(HERE, 'bots.mjs'), [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    const g = { child, last: null, n: 0 };
    child.on('message', (m) => { if (m && m.type === 'report') { g.last = m.data; reports.push(m.data); } });
    child.send({ cmd: 'config', cfg: { url, wireUrl: i === 0 ? wireUrl : null, fighters: OPT.fighters, homes: HOMES, tag: String.fromCharCode(97 + i), idle: OPT.idle, pongHz: OPT.pongHz, moveGapMs: OPT.moveMs, townMoveMs: OPT.townMoveMs, diet: OPT.diet, noDeflate: OPT.noDeflate, seenR: OPT.seenR, walkR: OPT.walkR, track: OPT.track } });
    groups.push(g);
  }
}
function addBots(n, spreadMs) {
  /* round-robin, so every process carries its share */
  const per = groups.map(() => 0);
  for (let i = 0; i < n; i++) per[i % groups.length]++;
  groups.forEach((g, i) => { if (per[i]) { g.n += per[i]; g.child.send({ cmd: 'add', n: per[i], spreadMs }); } });
}
function removeBots(n) {
  const per = groups.map(() => 0);
  for (let i = 0; i < n; i++) per[i % groups.length]++;
  groups.forEach((g, i) => { if (per[i]) { g.n -= per[i]; g.child.send({ cmd: 'remove', n: per[i] }); } });
}
function liveStates() {
  const s = {};
  for (const g of groups) for (const [k, v] of Object.entries((g.last && g.last.states) || {})) s[k] = (s[k] || 0) + v;
  return s;
}

/* ── probes from outside the crowd ───────────────────────────────────────
   Two ways in that are not the crowd's own sockets, so a room that has
   stopped answering can be told apart from one that is only slow:
   - an HTTP request INTO the room (/api/market goes to the same Durable
     Object, market.js): how long its incoming queue is;
   - a brand-new player: how long until its first state_sync, which is sent
     from inside the join itself (join.js), not from the tick -- so this
     still answers if the tick has stopped but the room can take messages in
     and send out. */
async function probeHttp(httpBase) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${httpBase}/api/market/orders?room=${encodeURIComponent(OPT.room)}`, { signal: AbortSignal.timeout(10000) });
    await res.text();
    return Date.now() - t0;
  } catch { return null; }   /* no answer in 10 s */
}
function probeJoin(url) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let done = false, ws;
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch { /* gone */ } resolve(v); };
    const timer = setTimeout(() => finish(null), 15000);
    try { ws = new WebSocket(url); } catch { finish(null); return; }
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: 'ltprobe' + Date.now().toString(36), name: 'Probe', protocolVersion: 2,
      data: { x: 1000, y: 1000, d: 'south', z: 'town', name: 'Probe' } }));
    ws.onmessage = (ev) => { if (typeof ev.data === 'string' && ev.data.startsWith('{"type":"state_sync"')) finish(Date.now() - t0); };
    ws.onerror = () => finish(null);
  });
}

/* ── one step ─────────────────────────────────────────────────────────── */
/* `rs` is the measured window; `whole` the step from its first join, so the
   joins and zone entries the step made are counted with it */
function summarise(n, rs, whole, cpu, secs) {
  const sum = (k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
  const all = (k) => rs.flatMap((r) => r[k] || []);
  const allStep = (k) => whole.flatMap((r) => r[k] || []);
  const sumStep = (k) => whole.reduce((a, r) => a + (r[k] || 0), 0);
  const lastByProc = groups.map((g) => g.last).filter(Boolean);
  const states = liveStates();
  const walking = states.walking || 0;
  const closes = {};
  for (const r of whole) for (const [c, v] of Object.entries(r.closes || {})) closes[c] = (closes[c] || 0) + v;
  const seen = all('seen'), deliver = all('deliver'), rates = all('tickRates');
  const botCpu = lastByProc.length ? rs.reduce((a, r) => a + r.cpuPct, 0) / Math.max(1, rs.length) : 0;
  const players = (states.walking || 0) + (states.entering || 0) + (states.synced || 0) + (states.dead || 0) + (states.joining || 0);
  return {
    target: n,
    players,
    walking,
    fighters: Math.round(n * OPT.fighters),
    inMsgsPerSec: r1(sum('txMsgs') / secs),
    movesPerSec: r1(sum('moves') / secs),
    swingsPerSec: r1(sum('swings') / secs),
    serverThreadPct: r1(cpu.busiestThreadPct),
    workerdPct: r1(cpu.workerdPct),
    wranglerNodePct: r1(cpu.otherPct),
    workerdRssMb: r1(cpu.rssMb),
    tickRate: r1(pct(rates, 50)),
    tickRateLow: r1(pct(rates, 5)),
    tickDelayP50: r1(pct(deliver, 50)),
    tickDelayP95: r1(pct(deliver, 95)),
    tickDelayMax: r1(pct(deliver, 100)),
    seenP50: r1(pct(seen, 50)),
    seenP95: r1(pct(seen, 95)),
    seenP99: r1(pct(seen, 99)),
    seenSamples: seen.length,
    downKBps: r1(players ? sum('rxBytes') / secs / players / 1024 : 0),
    downTickKBps: r1(players ? sum('rxTickBytes') / secs / players / 1024 : 0),
    ticksPerPlayerPerSec: r1(players ? sum('rxTicks') / secs / players : 0),
    msgsPerPlayerPerSec: r1(players ? sum('rxMsgs') / secs / players : 0),
    /* v2.3.3220: --track's relays, as each player receives them */
    updatesPerPlayerPerSec: r1(players ? sum('rxUpdates') / secs / players : 0),
    updateKBpsPerPlayer: r1(players ? sum('rxUpdateBytes') / secs / players / 1024 : 0),
    tracksPerSec: r1(sum('tracks') / secs),
    roomOutMBps: r1(sum('rxBytes') / secs / 1048576),
    joinP50: r1(pct(allStep('joins'), 50)),
    joinP95: r1(pct(allStep('joins'), 95)),
    enterP50: r1(pct(allStep('entries'), 50)),
    enterP95: r1(pct(allStep('entries'), 95)),
    deaths: sumStep('deaths'),
    closes,
    errors: sumStep('errors'),
    roomFull: sumStep('roomFull'),
    botCpuPct: r1(botCpu),
    botLoopP99: r1(Math.max(0, ...rs.map((r) => r.loopP99 || 0))),
  };
}

function row(s) {
  const c = (v, w) => String(v === null || v === undefined ? '-' : v).padStart(w);
  return `${c(s.players, 7)} | ${c(s.inMsgsPerSec, 7)} | ${c(s.serverThreadPct, 6)}% | ${c(s.tickRate, 5)} | ${c(s.tickDelayP50, 5)} / ${c(s.tickDelayP95, 6)} | ${c(s.seenP50, 5)} / ${c(s.seenP95, 6)} / ${c(s.seenP99, 6)} | ${c(s.downKBps, 7)} | ${c(s.downWireKBps, 5)} | ${c(s.workerdRssMb, 6)} | ${c(s.botCpuPct, 5)}% | ${c(Object.values(s.closes).reduce((a, b) => a + b, 0), 6)}`;
}
const HEAD = `players | msgs/s  | server |ticks/s| tick delay ms  | others' moves seen ms  | down KB/s | wire  | RSS MB | bots  | drops\n` +
  `        | in      | thread | (45)  |  p50 / p95     |  p50 / p95 / p99       | /player   | KB/s  |        | CPU   |`;

/* ── the run ──────────────────────────────────────────────────────────── */
let worker = null, copy = null;
async function cleanup() {
  for (const g of groups) { try { g.child.send({ cmd: 'stop' }); } catch { /* gone */ } }
  await sleep(700);
  for (const g of groups) { try { g.child.kill('SIGKILL'); } catch { /* gone */ } }
  if (worker) {
    try { process.kill(-worker.proc.pid, 'SIGKILL'); } catch { /* gone */ }
    try { await rm(worker.state, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  if (copy) { try { await rm(copy.dir, { recursive: true, force: true }); } catch { /* best effort */ } }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await cleanup(); process.exit(130); });

async function main() {
  const startedAt = new Date();
  let url = OPT.url, pids = [];
  if (!url) {
    copy = await serverCopy(OPT.cap);
    const port = await freePort();
    console.log(`starting a private copy of the server (player cap ${copy.realCap} -> ${OPT.cap}) on :${port} ...`);
    worker = await startWorker(copy.dir, port);
    url = `ws://127.0.0.1:${port}/ws?room=${encodeURIComponent(OPT.room)}&rf=1`;
    pids = await groupPids(worker.proc.pid);
  } else {
    url = OPT.url;
    console.log('using the worker at', url, '(no CPU readings: it is not ours)');
  }
  let wire = null, wireUrl = null;
  try {
    const u = new URL(url);
    wire = await startWireProxy(+u.port);
    u.port = String(wire.port);
    wireUrl = u.toString();
  } catch (e) { console.log('no wire probe:', e.message); }
  startBots(url, wireUrl);
  console.log(`machine: ${cpus().length} cores, ${cpus()[0].model.trim()}`);
  console.log(`bots: ${OPT.procs} processes, ${Math.round(OPT.fighters * 100)}% fighters; steps ${OPT.steps.join(', ')}; ${OPT.hold}s measured a step\n`);
  console.log(HEAD);

  const results = [];
  await mkdir(join(REPO, 'tools', 'qa', 'out', 'load'), { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const base = join(REPO, 'tools', 'qa', 'out', 'load', 'load-' + stamp);
  /* written after EVERY step, so a run that is stopped (or that wedges the
     machine) keeps everything it measured */
  const save = async () => {
    const out = {
      version: 'v2.3.3199', startedAt: startedAt.toISOString(), options: OPT,
      machine: { cores: cpus().length, model: cpus()[0].model.trim() },
      serverCap: copy ? { real: copy.realCap, test: OPT.cap } : null,
      steps: results,
    };
    await writeFile(base + '.json', JSON.stringify(out, null, 2));
    await writeFile(base + '.md', '```\n' + HEAD + '\n' + results.map(row).join('\n') + '\n```\n');
  };

  /* fill (wait until nearly everyone is walking, at most 90 s), settle, then
     measure `hold` seconds */
  const measure = async (n, label) => {
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await sleep(1000);
      const st = liveStates();
      if ((st.walking || 0) + (st.dead || 0) >= n * 0.97) break;
    }
    await sleep(OPT.settle * 1000);
    if (worker) pids = await groupPids(worker.proc.pid);   /* workerd may have forked helpers */
    const holdFrom = reports.length;
    const c0 = worker ? await cpuSnapshot(pids) : null;
    const m0 = Date.now();
    const w0 = wire ? wire.counts.down : 0;
    const http = [], joins = [];
    let probing = true;
    const httpBase = url.replace(/^ws/, 'http').replace(/\/ws\?.*$/, '');
    const probeLoop = (async () => {
      while (probing) {
        const [h, j] = await Promise.all([probeHttp(httpBase), probeJoin(url)]);
        http.push(h); joins.push(j);
        await sleep(2000);
      }
    })();
    await sleep(OPT.hold * 1000);
    probing = false;
    const c1 = worker ? await cpuSnapshot(pids) : null;
    const secs = (Date.now() - m0) / 1000;
    const cpu = c0 && c1 ? cpuBetween(c0, c1) : {};
    const s = summarise(n, reports.slice(holdFrom), reports.slice(), cpu, secs);
    s.label = label;
    /* v2.3.3199: the wire bot's bytes on the wire against its own unzipped
       bytes, the same window; every player's wire download from the ratio */
    const wireDown = wire ? wire.counts.down - w0 : 0;
    const wireRx = reports.slice(holdFrom).reduce((a, r) => a + (r.wireRx || 0), 0);
    s.wireProbeKBps = r1(wireDown / secs / 1024);
    s.wireProbeUnzippedKBps = r1(wireRx / secs / 1024);
    s.wireRatio = wireDown > 0 && wireRx > 0 ? r1(wireRx / wireDown) : null;
    s.downWireKBps = s.wireRatio ? r1(s.downKBps * wireDown / wireRx) : null;
    s.rssGrowMb = c0 && c1 ? r1(c1.rssMb - c0.rssMb) : null;
    const answered = (a) => a.filter((v) => v !== null);
    s.httpProbeP50 = r1(pct(answered(http), 50));
    s.httpProbeMax = r1(pct(answered(http), 100));
    s.httpProbeUnanswered = http.filter((v) => v === null).length + '/' + http.length;
    s.newJoinP50 = r1(pct(answered(joins), 50));
    s.newJoinMax = r1(pct(answered(joins), 100));
    s.newJoinUnanswered = joins.filter((v) => v === null).length + '/' + joins.length;
    await probeLoop;
    /* BROKEN, in any of four ways.  The first two are the ones a player
       feels; the last two are the server giving up: a room whose thread is
       full stops running ticks altogether (none arrive), and what it cannot
       send piles up in memory (measured: 660 MB -> 1.9 GB in two minutes) */
    const reasons = [];
    if (s.seenP95 !== null && s.seenP95 > OPT.stopP95) reasons.push(`others' moves p95 ${s.seenP95} ms`);
    if (s.tickRate !== null && s.tickRate < OPT.stopTickRate) reasons.push(`${s.tickRate} ticks/s`);
    if (s.walking > 0 && (s.tickRate === null || !s.downKBps)) reasons.push('no ticks reached the players');
    if (s.rssGrowMb !== null && s.rssGrowMb > 300) reasons.push(`server memory +${s.rssGrowMb} MB in ${OPT.hold} s`);
    s.broken = reasons.length ? reasons.join('; ') : null;
    results.push(s);
    console.log(row(s) + (label === 'step' ? '' : '   <- ' + label) + (s.broken ? '   BROKEN: ' + s.broken : ''));
    console.log(`        probes: room answers HTTP in ${s.httpProbeP50} ms (max ${s.httpProbeMax}, unanswered ${s.httpProbeUnanswered}); a new player's first snapshot in ${s.newJoinP50} ms (max ${s.newJoinMax}, none ${s.newJoinUnanswered})`);
    console.log(`        each player is sent ${s.msgsPerPlayerPerSec} messages a second, ${s.ticksPerPlayerPerSec} ticks`);
    if (OPT.track) console.log(`        looks (--track): ${s.tracksPerSec} sent a second in all; each player is sent ${s.updatesPerPlayerPerSec} relays a second, ${s.updateKBpsPerPlayer} KB/s unzipped`);
    await save();
    return s;
  };

  let have = 0;
  let broke = null;
  for (const n of OPT.steps) {
    reports = [];
    if (n > have) addBots(n - have, ((n - have) / OPT.joinRate) * 1000);
    have = Math.max(have, n);
    const s = await measure(n, 'step');
    if (s.broken) { broke = s; break; }
  }

  /* DOES IT COME BACK?  A live room that tips over is only survivable if it
     recovers once some players leave -- otherwise one crowd freezes it for
     everyone until a deploy restarts it.  Take 40% of the players out and
     measure again. */
  if (broke && OPT.recover) {
    const keep = Math.round(have * OPT.recoverTo);
    console.log(`\nthe room broke at ${broke.players} players (${broke.broken}); taking it down to ${keep} ...`);
    reports = [];
    removeBots(have - keep);
    have = keep;
    const settle = OPT.settle;
    OPT.settle = OPT.recoverSettle;
    const s = await measure(keep, 'after');
    OPT.settle = settle;
    console.log(s.broken ? `it did NOT recover at ${keep} players.` : `it recovered at ${keep} players.`);
  }
  console.log(`\nwritten: ${base}.json (and .md)`);
  if (worker) {
    if (OPT.workerLog) { try { (await import('node:fs')).writeFileSync(OPT.workerLog, worker.log()); } catch { /* best effort */ } }
    const errs = (worker.log().match(/\b(Error|Uncaught|guard)\b.*$/gm) || []).slice(-10);
    if (errs.length) console.log('\nlast errors in the worker log:\n  ' + errs.join('\n  '));
  }
}

main().then(cleanup).then(() => process.exit(0)).catch(async (e) => {
  console.error(e && e.stack ? e.stack : e);
  await cleanup();
  process.exit(1);
});
