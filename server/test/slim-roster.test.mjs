/* ═══ v2.3.3226: THE ROSTER'S FAR PLAYERS, SLIM (tick.js ROSTER) ═══
 *
 * On a presence tick a v2 phone in the Wheel is sent the players near it
 * whole, the far ones slim ({x, y, d, z, vx, vy}), and a far one who has not
 * changed only once FAR_STILL_MS has passed since they were last sent.
 * Checked here on a room with a fake clock:
 *
 *   1. near whole (as a v1 phone's roster has them), a far mover slim (the
 *      whole entry's first six fields), a far player standing still left out
 *      until FAR_STILL_MS has passed;
 *   2. the client's ghost sweep (10 s) never loses a far player standing
 *      still: the gap between their entries is at most FAR_STILL_MS and one
 *      roster, at 45 ticks a second and at 10;
 *   3. a v1 phone in the Wheel, a phone in today's town and a socket that
 *      never joined still get everyone whole;
 *   4. a player in another zone is slim, with that zone;
 *   5. a far player standing still who comes into reach is whole in the
 *      next roster;
 *   6. `slimroster: false` sends everyone whole again;
 *   7. the two message builders agree byte for byte over many rosters, with
 *      ids JSON.stringify would move to the front of an object;
 *   8. the slim entry carries every field the client writes whether or not
 *      it is there (wsClient.js's tick merge: `dir`, `zone`...), read from
 *      the client's own code;
 *   9. a player who left is forgotten.
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { ROSTER, FAR_PLAYERS } from '../src/tick.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, { pv = 2, z = 'town', x = 1000, y = 1000 } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { x, y, z } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return { ws, id, pv };
}
async function move(room, p, x, y, z = 'wheel', vx = 1, vy = 0) {
  p.x = x; p.y = y; p.z = z;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx, vy, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
/* where a check needs a player, in the room's own state (the movement bound
   refuses a jump across the map, as it should) */
function place(room, p, x, y, z = 'wheel') {
  p.x = x; p.y = y; p.z = z;
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.z = z; ps.vx = 0; ps.vy = 0;
}
let STEP_MS = 22;
function step(room, tickFn, everyone) {
  NOW += STEP_MS;
  for (const p of everyone) {
    const s = room.playerState[p.id];
    if (s) { s.hp = Math.max(s.hp || 0, 1e6); s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false; }
  }
  tickFn();
}
const ticksOf = (p) => p.ws.sent.map((s) => JSON.parse(s)).filter((m) => m.type === 'tick');
const lastPlayers = (p) => { const t = ticksOf(p); return t.length ? (t[t.length - 1].players || null) : null; };
/* step to the next presence tick and return each phone's roster from it */
function toRoster(room, tickFn, everyone, phones) {
  do step(room, tickFn, everyone); while ((room.tickSeq - 1) % room.PRESENCE_REFRESH_TICKS !== 0);
  return phones.map((p) => lastPlayers(p) || {});
}
const SLIM_KEYS = 'x,y,d,z,vx,vy';
const keysOf = (o) => (o ? Object.keys(o).join(',') : null);

const ARRIVAL = { x: 21504, y: 21792 };

const { room, tickFn } = await makeRoom();
const A = await join(room, 'sa');                 /* the phone under test, in Brotown */
const N = await join(room, 'sn');                 /* near A, standing */
const M = await join(room, 'sm');                 /* far, walking */
const S = await join(room, 'ss');                 /* far, standing */
const V = await join(room, 'sv', { pv: 1 });      /* an old v1 phone in the Wheel */
const T = await join(room, 'st');                 /* today's town */
const lurker = fakeWs();
room.sessions.set(lurker, baseSession());
const everyone = [A, N, M, S, V, T];
for (const p of [A, N, M, S, V]) await move(room, p, ARRIVAL.x, ARRIVAL.y);
await move(room, T, 600, 600, 'town');
place(room, A, ARRIVAL.x, ARRIVAL.y);
place(room, N, ARRIVAL.x + 900, ARRIVAL.y + 300);
place(room, M, ARRIVAL.x + 6000, ARRIVAL.y);
place(room, S, ARRIVAL.x - 7000, ARRIVAL.y + 500);
place(room, V, ARRIVAL.x - 40, ARRIVAL.y);
room.playerState[N.id].eqc = 'iron_torso';
room.playerState[M.id].eqc = 'copper_torso';
room._liveFlags = { steadymovers: false };
step(room, tickFn, everyone);

/* ── 1. near whole, far mover slim, far standing left out until due ───── */
{
  /* a roster with everyone due (a first), then one where M walks and S stands */
  toRoster(room, tickFn, everyone, [A, V]);
  for (let i = 0; i < 20; i++) step(room, tickFn, everyone);
  await move(room, M, M.x + 30, M.y);
  const [ra, rv] = toRoster(room, tickFn, everyone, [A, V]);
  check('1a a near player is sent whole, as a v1 phone gets them', ra.sn && JSON.stringify(ra.sn) === JSON.stringify(rv.sn) && ra.sn.eqc === 'iron_torso', { a: ra.sn, v: rv.sn });
  check('1b a far player who moved is sent slim: where, facing, zone and speed', keysOf(ra.sm) === SLIM_KEYS, ra.sm);
  check('1c ...the whole entry\'s own values', ra.sm && ['x', 'y', 'd', 'z', 'vx', 'vy'].every((k) => ra.sm[k] === rv.sm[k]), { a: ra.sm, v: rv.sm });
  check('1d a far player standing still is left out of the next roster', !('ss' in ra), Object.keys(ra));
  check('1e the phone is in its own roster, whole', !!ra.sa && keysOf(ra.sa) !== SLIM_KEYS, ra.sa);
  /* from a roster that sent them, to the next one that does */
  let sentAt = null;
  for (let i = 0; i < 10 && sentAt === null; i++) { const [r] = toRoster(room, tickFn, everyone, [A]); if (r.ss) sentAt = NOW; }
  let back = null;
  for (let i = 1; i <= 10 && back === null; i++) {
    const [r] = toRoster(room, tickFn, everyone, [A]);
    if (r.ss) back = { entry: r.ss, ms: NOW - sentAt };
  }
  const rosterMs = room.PRESENCE_REFRESH_TICKS * STEP_MS;
  check('1f ...and sent again, slim, at the first roster once FAR_STILL_MS has passed', sentAt !== null && back && keysOf(back.entry) === SLIM_KEYS
    && back.ms >= ROSTER.FAR_STILL_MS && back.ms < ROSTER.FAR_STILL_MS + rosterMs, { back, rosterMs });
}

/* ── 2. the ghost sweep never loses a far player standing still ───────── */
for (const [label, ms] of [['45 ticks a second', 22], ['10 ticks a second', 100]]) {
  STEP_MS = ms;
  let lastSeen = NOW, worst = 0, rosters = 0;
  const stop = NOW + 30000;
  while (NOW < stop) {
    const [r] = toRoster(room, tickFn, everyone, [A]);
    rosters++;
    if (r.ss) { worst = Math.max(worst, NOW - lastSeen); lastSeen = NOW; }
  }
  worst = Math.max(worst, NOW - lastSeen);
  const rosterMs = room.PRESENCE_REFRESH_TICKS * ms;
  check(`2${ms === 22 ? 'a' : 'b'} at ${label}, a far player standing still is never more than FAR_STILL_MS and one roster apart (the client's sweep: 10 s)`,
    rosters > 5 && worst <= ROSTER.FAR_STILL_MS + rosterMs && worst < 10000, { worst, rosterMs, rosters });
}
STEP_MS = 22;

/* ── 3. everyone else gets everyone whole ──────────────────────────────── */
{
  const [rv, rt] = toRoster(room, tickFn, everyone, [V, T]);
  const lr = (() => { const t = lurker.sent.map((s) => JSON.parse(s)).filter((m) => m.type === 'tick'); return (t[t.length - 1] || {}).players || {}; })();
  const whole = (r) => ['sa', 'sn', 'sm', 'ss', 'sv', 'st'].every((id) => r[id] && keysOf(r[id]) !== SLIM_KEYS);
  check('3a an old v1 phone in the Wheel still gets everyone whole', whole(rv), Object.keys(rv));
  check("3b a phone in today's town still gets everyone whole", whole(rt), Object.keys(rt));
  check('3c a socket that never joined still gets everyone whole', whole(lr), Object.keys(lr));
}

/* ── 4. another zone's player is slim, with that zone ─────────────────── */
{
  await move(room, T, 610, 600, 'town');
  const [ra] = toRoster(room, tickFn, everyone, [A]);
  check("4a a player in today's town who moved is slim, in town", ra.st && keysOf(ra.st) === SLIM_KEYS && ra.st.z === 'town', ra.st);
}

/* ── 5. a far player standing still who comes into reach ──────────────── */
{
  toRoster(room, tickFn, everyone, [A]);   /* S sent or not; now A walks up to them */
  place(room, A, S.x + 600, S.y);
  const [ra] = toRoster(room, tickFn, everyone, [A]);
  check('5a ...is sent whole in the next roster', ra.ss && keysOf(ra.ss) !== SLIM_KEYS, ra.ss);
  place(room, A, ARRIVAL.x, ARRIVAL.y);
  toRoster(room, tickFn, everyone, [A]);
}

/* ── 6. slimroster: false ─────────────────────────────────────────────── */
{
  room._liveFlags = { steadymovers: false, slimroster: false };
  const [ra] = toRoster(room, tickFn, everyone, [A]);
  check('6a slimroster:false sends the Wheel phone everyone whole again',
    ['sa', 'sn', 'sm', 'ss', 'sv', 'st'].every((id) => ra[id] && keysOf(ra[id]) !== SLIM_KEYS), Object.keys(ra));
  room._liveFlags = { steadymovers: false };
  const [rb] = toRoster(room, tickFn, everyone, [A]);
  check('6b ...and switched back on, the far ones are slim (all due at once)', rb.sm && keysOf(rb.sm) === SLIM_KEYS && rb.ss && keysOf(rb.ss) === SLIM_KEYS, { sm: rb.sm, ss: rb.ss });
}

/* ── 7. the two builders agree, byte for byte ──────────────────────────── */
{
  const { room: r2, tickFn: t2 } = await makeRoom();
  const ps = [];
  /* ids a JSON object puts first ("0", "17") are among them */
  const ids = ['0', 'vb', '17', 'vc', 'vd', 've', 'vf', 'vg', '4294967294', 'vh'];
  for (const id of ids) ps.push(await join(r2, id));
  const v1 = await join(r2, 'v1', { pv: 1 });
  const tw = await join(r2, 'tw');
  ps.push(v1, tw);
  for (const p of ps) await move(r2, p, ARRIVAL.x, ARRIVAL.y);
  await move(r2, tw, 600, 600, 'town');
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  ps.forEach((p, i) => { if (p !== tw) place(r2, p, ARRIVAL.x + (i % 3) * 3000 - 3000, ARRIVAL.y + (i % 2) * 2000); });
  const verify = { checked: 0, mismatched: 0, first: null };
  r2._tickShareVerify = verify;
  r2._liveFlags = { steadymovers: false };
  let rosterMsgs = 0;
  for (let t = 0; t < 600; t++) {
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k];
      if (p === tw || (t + k) % 5) continue;
      if (k % 3 === 0) continue;   /* a third stand still */
      await move(r2, p, p.x + (rnd() - 0.5) * 20, p.y + (rnd() - 0.5) * 20);
    }
    step(r2, t2, ps);
    if ((r2.tickSeq - 1) % r2.PRESENCE_REFRESH_TICKS === 0) rosterMsgs++;
  }
  check('7a every tick message from shared parts equals the old build, rosters included, byte for byte', verify.mismatched === 0, verify.first);
  check('7b ...over a dozen rosters and thousands of messages', rosterMsgs >= 12 && verify.checked > 1000, { rosterMsgs, checked: verify.checked });
  const slimSeen = ps[1].ws.sent.some((s) => s.indexOf('"players":') !== -1 && /"vy":-?\d+\}/.test(s) && JSON.parse(s).players && Object.values(JSON.parse(s).players).some((e) => keysOf(e) === SLIM_KEYS));
  check('7c ...and the rosters had slim entries in them', slimSeen);
}

/* ── 8. the slim entry has every field the client writes regardless ───── */
{
  const src = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  /* the tick merge: `S.others[pid].<field> = data.<key>;` with no guard */
  const start = src.indexOf('if (msg.players) {');
  const block = src.slice(start, src.indexOf('GHOST SWEEP', start));
  /* the block's own statements, at the indent of its `x` line: a write
     inside an `if` (the pet's, only when it changed) is deeper */
  const xLine = block.match(/^(\s*)S\.others\[pid\]\.x = data\.x;/m);
  const indent = xLine ? xLine[1] : null;
  const plain = indent === null ? [] : [...block.matchAll(/^(\s*)S\.others\[pid\]\.(\w+) = data\.(\w+);/gm)]
    .filter((m) => m[1] === indent).map((m) => m[3]);
  const viaOr = [...block.matchAll(/S\.others\[pid\]\.\w+ = \(data\.(\w+) \|\| 0\)/g)].map((m) => m[1]);
  const need = [...new Set([...plain, ...viaOr])];
  const slim = SLIM_KEYS.split(',');
  check('8a the client\'s tick merge was found and read', start > 0 && need.length >= 4, need);
  check('8b the slim entry has every field it writes whether or not it is there', need.every((k) => slim.includes(k)), { need, slim });
}

/* ── 9. a player who left is forgotten ─────────────────────────────────── */
{
  for (const id of ['gone1', 'gone2', 'gone3']) {
    const g = await join(room, id);
    await move(room, g, ARRIVAL.x, ARRIVAL.y);
    everyone.push(g);
  }
  toRoster(room, tickFn, everyone, [A]);
  const had = ['gone1', 'gone2', 'gone3'].every((id) => room._rosterSlimAt.has(id));
  for (const id of ['gone1', 'gone2', 'gone3']) delete room.playerState[id];
  toRoster(room, tickFn, everyone, [A]);
  check('9a the room forgets when it last sent a player who left', had && ['gone1', 'gone2', 'gone3'].every((id) => !room._rosterSlimAt.has(id)), [...room._rosterSlimAt.keys()]);
}

void FAR_PLAYERS;
console.log(`\nslim-roster: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
process.exit(0);
