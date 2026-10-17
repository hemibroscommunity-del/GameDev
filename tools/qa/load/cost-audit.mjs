/* ═══ v2.3.3270: THE COST AUDIT -- what an hour of play writes and sends ═══
 *
 * The owner: "Build my game so that it's the most cost effective that it can
 * be without losing quality."  On Cloudflare's paid plan a player-hour costs
 * three things (docs/specs/cost-diet.md):
 *   - ROWS WRITTEN: every storage put or delete is a row, $1.00 a million
 *     past 50 million a month -- at 20,000 monthly players the biggest line;
 *   - MESSAGES IN: 20 incoming socket messages are one request, $0.15 a
 *     million (mp-quietphone counts what a real page sends);
 *   - the time a room is awake, which is the room's, not the player's.
 * This counts the first, and the messages the simulated phones send, on a
 * REAL GameRoom (load-wheel.mjs's in-process harness: mocked storage, fake
 * sockets, the clock simulated so walks are legal) with players doing what a
 * player does for a simulated stretch of time:
 *   idle    stands in BroTown (a menu open, chatting, away from the phone);
 *   walk    walks the town and the commons;
 *   fight   fights its land's first stretch (monster_damage every 0.7 s),
 *           eating when low;
 *   gather  chops, mines and fishes the commons' nodes (node_strike, the
 *           honest harvest's pace).
 * Every put and delete is counted by KEY (its prefix) and by the CODE that
 * made it -- for the player record, the caller of _saveRpg -- and per player,
 * so a persona's rows are its own.  The join (a new character's first join
 * and its arrival in the Wheel) is counted apart.
 *
 *   node tools/qa/load/cost-audit.mjs [minutes of game time, default 20] [players per persona, default 3]
 *
 * Under tools/ on purpose: anything under server/ deploys the worker when it
 * merges.  Read with docs/specs/cost-diet.md.
 */
import { GameRoom } from '../../../server/src/index.js';
import { WHEEL_SPAWNS, WHEEL_CENTRE } from '../../../server/src/wheelspawns.js';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FLAG = (name, d) => { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.split('=')[1] : d; };
const GAME_MIN = Number(ARGS[0] || 20);
const PER = Number(ARGS[1] || 3);
/* the same run every time on the same code: Math.random seeded (the room's
   monsters, rolls and drops, and these players) -- so two versions of the
   server can be compared, and a budget line held */
const SEED = Number(FLAG('seed', 1));
{
  let a = (SEED * 2654435761) >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TICK_MS = 22;
const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3315: the Wheel the room plays */
const HOMES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
const SPEED = 165 / 1000;   /* px a ms */

/* ── the simulated clock ─────────────────────────────────────────────── */
const realDateNow = Date.now;
let simNow = realDateNow();
Date.now = () => simNow;

/* ── storage that remembers, and counts ──────────────────────────────── */
const SAVE_WRAPPERS = new Set(['_saveRpg', '_saveRpgPools', '_saveRpgVitals']);
const SKIP_FRAMES = /^(put|delete|get|list|countingStorage|Object\.put|Object\.delete|Proxy\.|new Promise|Array\.forEach|processTicksAndRejections)/;
function callerOf() {
  const lim = Error.stackTraceLimit; Error.stackTraceLimit = 24;
  const lines = (new Error().stack || '').split('\n').slice(2);
  Error.stackTraceLimit = lim;
  let via = '';
  for (const l of lines) {
    const m = /at (?:async )?(?:Object\.|GameRoom\.)?([\w$<>.]+) \(/.exec(l);
    if (!m) continue;
    const fn = m[1];
    if (SKIP_FRAMES.test(fn) || /cost-audit/.test(l)) continue;
    if (SAVE_WRAPPERS.has(fn)) { via = via || fn; continue; }
    return via ? fn + ' -> ' + via : fn;
  }
  return via || '?';
}
const W = { byKey: new Map(), byCaller: new Map(), byPlayer: new Map(), reads: 0, writes: 0 };
let tag = (k) => null;   /* key -> player id, set below */
function noteWrite(k) {
  W.writes++;
  const prefix = String(k).split(':')[0];
  W.byKey.set(prefix, (W.byKey.get(prefix) || 0) + 1);
  const c = callerOf();
  const ck = prefix + '  <-  ' + c;
  W.byCaller.set(ck, (W.byCaller.get(ck) || 0) + 1);
  const pid = tag(String(k));
  const who = pid || '(room)';
  let pw = W.byPlayer.get(who);
  if (!pw) W.byPlayer.set(who, pw = { n: 0, byKey: new Map(), byCaller: new Map() });
  pw.n++;
  pw.byKey.set(prefix, (pw.byKey.get(prefix) || 0) + 1);
  pw.byCaller.set(ck, (pw.byCaller.get(ck) || 0) + 1);
}
function countingStorage() {
  const m = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    async get(k) {
      if (Array.isArray(k)) { W.reads += k.length; const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; }
      W.reads++; return m.has(k) ? clone(m.get(k)) : undefined;
    },
    async put(k, v) {
      if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { noteWrite(kk); m.set(kk, clone(vv)); } return; }
      noteWrite(k); m.set(k, clone(v));
    },
    async delete(k) {
      if (Array.isArray(k)) { let n = 0; for (const x of k) { noteWrite(x); if (m.delete(x)) n++; } return n; }
      noteWrite(k); return m.delete(k);
    },
    async list(opts) {
      const r = new Map(); const p = (opts && opts.prefix) || '';
      for (const [k, v] of [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (k.startsWith(p)) r.set(k, clone(v));
      W.reads += Math.max(1, r.size); return r;
    },
    async deleteAll() { for (const k of m.keys()) noteWrite(k); m.clear(); },
    async transaction(fn) { return fn(this); },
    _map: m,
  };
}
function mockState() {
  return { storage: countingStorage(), getWebSockets: () => [], acceptWebSocket: () => {}, blockConcurrencyWhile: async (fn) => fn() };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function fakeWs() { return { sent: 0, bytes: 0, send(s) { this.sent++; this.bytes += typeof s === 'string' ? s.length : 0; }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
const rand = (a, b) => a + Math.random() * (b - a);

/* ── the room and its players ────────────────────────────────────────── */
const room = new GameRoom(mockState(), mockEnv);
let tickFn = null;
{
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 0; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
}
/* the near-death band's saves apart from the coalesced ones (persistence.js
   _saveRpgVitals: at or under HP_URGENT_SAVE_FRAC every hit saves at once) */
const VIT = { urgent: 0, coalesced: 0 };
{
  const orig = room._saveRpgVitals;
  room._saveRpgVitals = function (pid, ps) {
    const before = ps && ps._regenSaveAt;
    const maxHp = ps && ps.maxHp > 0 ? ps.maxHp : 100;
    const urgent = ps && typeof ps.hp === 'number' && ps.hp <= maxHp * this.HP_URGENT_SAVE_FRAC;
    const r = orig.call(this, pid, ps);
    if (ps && ps._regenSaveAt !== before) { if (urgent) VIT.urgent++; else VIT.coalesced++; }
    return r;
  };
}
const players = [];
const pidOf = new Map();   /* id -> persona */
tag = (k) => { for (const id of pidOf.keys()) if (k.indexOf(id) >= 0) return id; return null; };
const msgIn = { frames: 0, byType: new Map() };
async function send(p, msg) {
  msgIn.frames++;
  msgIn.byType.set(p.kind + ':' + msg.type, (msgIn.byType.get(p.kind + ':' + msg.type) || 0) + 1);
  p.sent++;
  await room.webSocketMessage(p.ws, JSON.stringify(msg));
}
function moveMsg(p, vx, vy) {
  return { type: 'move', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none',
    ex: null, z: 'wheel', vx: Math.round(vx * 100), vy: Math.round(vy * 100), dodging: false, blocking: false, ba: null, dead: false };
}

const JOIN = { writes: 0, players: 0 };
async function addPlayer(kind, i) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const id = 'ca' + kind[0] + i + Math.random().toString(36).slice(2, 7);
  pidOf.set(id, kind);
  const w0 = W.writes;
  const p = { ws, id, kind, sent: 0, x: ARRIVAL.x + rand(-80, 80), y: ARRIVAL.y + rand(-50, 50), tx: 0, ty: 0, acc: rand(0, 66), swingAcc: rand(0, 700), standAcc: 0, strikeAcc: rand(0, 2000) };
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Cost ' + kind + ' ' + i, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify(moveMsg(p, 0, 0)));   /* down the stairs: the trip into the Wheel */
  JOIN.writes += W.writes - w0; JOIN.players++;
  const ps = room.playerState[id];
  if (kind === 'fight') {
    const home = HOMES[i % HOMES.length];
    const pts = (WHEEL_SPAWNS[home] && WHEEL_SPAWNS[home].points) || [];
    const pt = pts[(i * 3) % Math.max(1, pts.length)] || [ARRIVAL.x, ARRIVAL.y];
    p.anchor = { x: pt[0], y: pt[1] };
    p.x = pt[0] + rand(-60, 60); p.y = pt[1] + rand(-60, 60);
    ps.x = p.x; ps.y = p.y; ps.lastMoveAt = undefined;
  }
  if (kind === 'gather' && ps) {
    ps.inventory = ps.inventory || {};
    ps.inventory.woodcutting_axe = 1; ps.inventory.mining_pickaxe = 1; ps.inventory.fishing_pole = 1;
  }
  retarget(p);
  players.push(p);
  return p;
}
function retarget(p) {
  const c = p.kind === 'fight' ? p.anchor : ARRIVAL;
  const r = (p.kind === 'fight' ? 300 : 1400) * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  p.tx = c.x + Math.cos(a) * r; p.ty = c.y + Math.sin(a) * r;
}
function nearest(list, p, max, ok) {
  let best = null, bd = Infinity;
  for (const m of list || []) { if (!ok(m)) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  return best && bd < max ? { m: best, d: bd } : null;
}

/* one persona's turn of the loop, once a tick */
async function step(p) {
  const ps = room.playerState[p.id];
  if (!ps) return;
  if (ps.dead || ps.dying) return;
  p.acc += TICK_MS; p.swingAcc += TICK_MS; p.standAcc += TICK_MS; p.strikeAcc += TICK_MS;
  if (p.kind === 'idle') {
    /* the quiet phone standing: one copy 1 s after the stop, then one every 10 s */
    if (p.standAcc >= 10000) { p.standAcc = 0; await send(p, moveMsg(p, 0, 0)); }
    return;
  }
  if (p.kind === 'gather') {
    const t = p.node && p.node.alive ? p.node : null;
    if (!t) {
      const n = nearest(room.nodes.wheel, p, 4000, (m) => m.alive && (m.tierLvl || 1) <= 1);
      p.node = n ? n.m : null;
      if (!p.node) return;
    }
    const dx = p.node.x - p.x, dy = p.node.y - p.y, d = Math.hypot(dx, dy);
    if (d > 40) {
      if (p.acc >= 66) {
        const dt = p.acc; p.acc = 0;
        const s = Math.min(d - 30, SPEED * dt);
        p.x += dx / d * s; p.y += dy / d * s;
        await send(p, moveMsg(p, dx / d * SPEED * 1000 / 60, dy / d * SPEED * 1000 / 60));
      }
      return;
    }
    /* an honest harvest's pace: ~1.5 s a cycle, and a breath between */
    if (p.strikeAcc >= 2000) {
      p.strikeAcc = 0;
      await send(p, { type: 'node_strike', payload: { id: p.node.id, zone: 'wheel', accuracy: 'good' } });
    }
    return;
  }
  if (p.kind === 'fight') {
    /* eat when low, as a player does (the heal itself, not the bite's own
       save): at half, so a fight is not spent in the near-death band, where
       every hit saves at once by design (persistence.js _saveRpgVitals) */
    if (ps.hp < (ps.maxHp || 100) * 0.5) ps.hp = ps.maxHp || 100;
  }
  if (p.acc < (p.kind === 'walk' ? 66 : 33)) return;
  const dt = p.acc; p.acc = 0;
  let tx = p.tx, ty = p.ty;
  const target = p.kind === 'fight' ? nearest(room.monsters.wheel, p, 600, (m) => m.alive) : null;
  if (target) { tx = target.m.x; ty = target.m.y; }
  const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
  const s = SPEED * dt;
  if (dist <= (target ? 50 : s)) { if (!target) retarget(p); }
  else { p.x += dx / dist * s; p.y += dy / dist * s; }
  await send(p, moveMsg(p, dx / (dist || 1) * SPEED * 1000 / 60, dy / (dist || 1) * SPEED * 1000 / 60));
  if (target && p.swingAcc >= 700 && target.d < 70) {
    p.swingAcc = 0;
    await send(p, { type: 'monster_damage', payload: { monsterId: target.m.id, zone: 'wheel', element: null, slot: 'melee', special: false } });
  }
}

/* ── run ─────────────────────────────────────────────────────────────── */
const KINDS = ['idle', 'walk', 'fight', 'gather'];
for (const k of KINDS) for (let i = 0; i < PER; i++) await addPlayer(k, i);
const joinRows = JOIN.writes / Math.max(1, JOIN.players);
const joinBy = [...W.byCaller.entries()].sort((a, b) => b[1] - a[1]);
/* from here on, play: reset the counters */
W.byKey.clear(); W.byCaller.clear(); W.byPlayer.clear(); W.writes = 0; W.reads = 0;
msgIn.frames = 0; msgIn.byType.clear();
VIT.urgent = 0; VIT.coalesced = 0;
const ticks = Math.round(GAME_MIN * 60000 / TICK_MS);
const t0 = realDateNow();
for (let t = 0; t < ticks; t++) {
  simNow += TICK_MS;
  for (const p of players) await step(p);
  tickFn();
  if (t % 2000 === 0) await new Promise((r) => setImmediate(r));
}
const realS = (realDateNow() - t0) / 1000;
const hours = GAME_MIN / 60;

/* ── report ──────────────────────────────────────────────────────────── */
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
console.log(`\nCOST AUDIT -- ${GAME_MIN} min of game time, ${PER} players a persona (${players.length} in all), ${realS.toFixed(0)} s to run\n`);
console.log(`A new character's join and arrival in the Wheel: ${fmt(joinRows)} rows written each`);
for (const [kk, v] of joinBy.slice(0, 8)) console.log(`  ${fmt(v / Math.max(1, JOIN.players)).padStart(6)}  ${kk}`);
console.log('');
const perKind = {};
for (const k of KINDS) perKind[k] = { n: 0, byKey: new Map(), byCaller: new Map(), sent: 0, died: 0 };
for (const p of players) { perKind[p.kind].sent += p.sent; }
for (const [who, pw] of W.byPlayer) {
  const k = pidOf.get(who);
  const tgt = k ? perKind[k] : null;
  if (!tgt) continue;
  tgt.n += pw.n;
  for (const [kk, v] of pw.byKey) tgt.byKey.set(kk, (tgt.byKey.get(kk) || 0) + v);
  for (const [kk, v] of pw.byCaller) tgt.byCaller.set(kk, (tgt.byCaller.get(kk) || 0) + v);
}
console.log('persona | rows written a player-hour | messages in a player-hour (simulated phone) | top keys');
for (const k of KINDS) {
  const r = perKind[k];
  const per = r.n / PER / hours;
  const keys = [...r.byKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([kk, v]) => `${kk} ${fmt(v / PER / hours)}`).join(', ');
  console.log(`${k.padEnd(7)} | ${fmt(per).padStart(10)} | ${fmt(r.sent / PER / hours).padStart(10)} | ${keys}`);
}
for (const k of KINDS) {
  const r = perKind[k];
  console.log(`\n${k}: where its rows come from (a player-hour)`);
  for (const [kk, v] of [...r.byCaller.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${fmt(v / PER / hours).padStart(8)}  ${kk}`);
}
const roomRows = W.byPlayer.get('(room)');
if (roomRows) {
  console.log(`\nthe room's own rows (no player's key), an hour: ${fmt(roomRows.n / hours)}`);
  for (const [kk, v] of [...roomRows.byCaller.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${fmt(v / hours).padStart(8)}  ${kk}`);
}
console.log(`\nhealth saves from hits (all players, an hour): ${fmt(VIT.urgent / hours)} at or under a quarter of max HP (at once, by design), ${fmt(VIT.coalesced / hours)} coalesced (REGEN_SAVE_MS ${room.REGEN_SAVE_MS})`);
console.log(`reads, all players, an hour: ${fmt(W.reads / hours)}`);
if (process.env.COST_JSON) {
  const out = { GAME_MIN, PER, joinRows, kinds: Object.fromEntries(KINDS.map((k) => [k, {
    rowsPerHour: perKind[k].n / PER / hours, msgsPerHour: perKind[k].sent / PER / hours,
    byKey: Object.fromEntries([...perKind[k].byKey].map(([a, b]) => [a, b / PER / hours])),
    byCaller: Object.fromEntries([...perKind[k].byCaller].map(([a, b]) => [a, b / PER / hours])) }])),
    roomRowsPerHour: roomRows ? roomRows.n / hours : 0 };
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.COST_JSON, JSON.stringify(out, null, 1));
}
Date.now = realDateNow;
process.exit(0);
