/* ═══ v2.3.5183: HOSTILE VALUES AT EVERY ROW OF THE WIRE TABLE (grand plan step 4.1, step 2; card K PR 3) ═══
 *
 * Every `in` row of the wire table (server/src/wire/in.js: the router's
 * cases) and every route a phone may call (server/src/wire/http.js, `wayIn:
 * 'http'`) is sent, one field its `trust` names at a time, each value of ONE
 * closed list (HOSTILE below): `__proto__`, `constructor` and `prototype` as
 * keys at any depth (and as the string a handler may index with); NaN, plus
 * and minus Infinity, -1, 0, 2^53, 1e308; a string of 1 MB; an array, an
 * object, null or a boolean where a number or a string goes; an object 1,000
 * deep; another player's id; a request id outside SHAPES' form (part 2: 1 to
 * 64 of A-Z a-z 0-9 _ -).  The other fields carry a plausible value
 * (`plain` below), so the hostile one is the only wrong one.
 *
 * A case passes when:
 *   1. nothing throws out of the router (`webSocketMessage`) or the route
 *      (the worker's `fetch`), and no route answers 500;
 *   2. no value moved unexplained: the world's sum (server/src/worldsum.js,
 *      card E) holds, gold and every bag key, and no piece is held twice;
 *   3. no key named `__proto__` is stored (a put's value) or kept in memory
 *      (the players' records, their sessions, the room's maps), no object
 *      has had its prototype swapped (`obj[k] = v` with k `__proto__`), and
 *      Object.prototype is clean;
 *   4. the answer is what the row's `bad` says: a row whose `bad` names only
 *      `refused` (no silent `dropped:<code>`) answers the sender.
 *
 * A CENSUS (the plan's rule 3).  Cases that fail today are listed in
 * docs/plan/census/hostile.md (row, field, value, what happened: `node
 * test/wire-hostile.test.mjs --write` makes it) and LINE below is their
 * count: the suite fails when the count rises, and says so when it falls
 * (lower LINE in that PR).  Fix no handler here: card K's PR 4 (the door's
 * checks, `wiredoor`) lowered it to 1, and each row's own fix after.
 * v2.3.5184: a frame the wire door drops (server/src/wire/door.js, before any
 * handler) is a silent exit by design, as the size gate's is (4 below);
 * `WIRE_HOSTILE_DOOR=off` runs every case with `wiredoor: false` and holds
 * the count to the line before the door (19: the plan's rule 4).
 *
 * HOW FAR A CASE REACHES.  The sender is a joined player in the town with
 * gold and a few bag stacks; the other fields are plausible, not a scene: a
 * row whose handler first asks a phase the sender is not in (a trade, the
 * Bank's door, a dungeon) stops there, so its later fields are tried at that
 * check, not in the handler's body.  The census counts what happens, not
 * what a scene would show; a row's own suite plays its scene.
 *
 * NaN cannot travel: JSON has no NaN, so the parse refuses a frame or a body
 * that holds one before any handler.  It is sent where it can arrive, as the
 * text `NaN` in a query or a header.  Infinity arrives as `1e999`.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14: `WIRE_HOSTILE_PLANT=1 node
 * test/wire-hostile.test.mjs` plants, on the room of the `achv_title` row, a
 * handler that writes `ps[payload.id] = payload` (the shape
 * `ps[payload.k] = ...`); its `"__proto__"` case swaps the record's
 * prototype and the count rises past LINE: FAIL.
 *
 * Not a phone test: node, card E's test room (testroom.mjs).  ~20 s. */
import { writeFileSync } from 'node:fs';
import worker, { Leaderboard, Feedback } from '../src/index.js';
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_HTTP } from '../src/wire/http.js';
import { makeStorage, openRoom, fakeWs, join, seededClock, settle } from './testroom.mjs';
import { performance } from 'node:perf_hooks';
import { count, unexplained } from '../src/worldsum.js';

/* the count of failing cases today: it only falls.  v2.3.5183, main 9fd5e58:
   19.  v2.3.5184 (card K PR 4): 1 -- the wire door drops `move`'s 16 (a key
   named like the prototype's) and chatmod.js answers a mute of `__proto__`
   unchanged (its 2); left, card R's honest restart (worldsum.js).  With the
   door's switch thrown (WIRE_HOSTILE_DOOR=off, the plan's rule 4) the count
   is the line before the door, LINE_DOOR_OFF. */
const LINE = 1;
const LINE_DOOR_OFF = 19;
const WRITE = process.argv.includes('--write');
const PLANT = process.env.WIRE_HOSTILE_PLANT === '1';
const DOOR_OFF = process.env.WIRE_HOSTILE_DOOR === 'off';
const CENSUS = new URL('../../docs/plan/census/hostile.md', import.meta.url);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* ══════════ THE ONE CLOSED LIST ══════════ */
const MB = 'x'.repeat(1 << 20);
const deep = (n) => { const root = {}; let o = root; for (let i = 0; i < n; i++) { o.a = {}; o = o.a; } return root; };
const INF = Symbol('inf'), NINF = Symbol('-inf'), NAN = Symbol('nan');
const OTHER = Symbol('other');   /* another player's id, filled per room */
const HOSTILE = [
  ['key __proto__', () => JSON.parse('{"__proto__":{"hostilePolluted":true}}')],
  ['key constructor', () => JSON.parse('{"constructor":{"prototype":{"hostilePolluted":true}}}')],
  ['key prototype', () => JSON.parse('{"prototype":{"hostilePolluted":true}}')],
  ['key __proto__ deep', () => JSON.parse('{"a":{"b":[{"__proto__":{"hostilePolluted":true}}]}}')],
  ['"__proto__"', () => '__proto__'],
  ['"constructor"', () => 'constructor'],
  ['"prototype"', () => 'prototype'],
  ['NaN', () => NAN],
  ['+Infinity', () => INF],
  ['-Infinity', () => NINF],
  ['-1', () => -1],
  ['0', () => 0],
  ['2^53', () => 2 ** 53],
  ['1e308', () => 1e308],
  ['1 MB string', () => MB],
  ['array', () => [1, 'a']],
  ['object', () => ({ a: 1 })],
  ['null', () => null],
  ['boolean', () => true],
  ['1,000 deep', () => deep(1000)],
  ['another player\'s id', () => OTHER],
];
/* a request id outside SHAPES part 2's form, on the field a row names as its
   repeat's guard (`opId`, `k`, ...) and on `reqId` itself */
const BAD_REQ = [['reqId empty', () => ''], ['reqId 65 long', () => 'r'.repeat(65)], ['reqId not its letters', () => 'a b/../!']];
const REQ_WORDS = new Set(['state', 'none', 'harmless']);
/* the three keys at a body's top, as a phone's own text would put them */
const BODY_KEYS = '"__proto__":{"hostilePolluted":true},"constructor":{"prototype":{"hostilePolluted":true}},"prototype":{"x":1},';

/* JSON with the three values JSON cannot spell: Infinity as 1e999 (the parse
   reads it back as Infinity), NaN as null for a frame (it cannot arrive: the
   case says so) */
function wire(v) {
  const t = JSON.stringify(v, (k, x) => (x === INF ? '\u0000INF' : x === NINF ? '\u0000NINF' : x === NAN ? '\u0000NAN' : x));
  return t.replace(/"\\u0000INF"/g, '1e999').replace(/"\\u0000NINF"/g, '-1e999').replace(/"\\u0000NAN"/g, 'null');
}
const hasNaN = (v) => v === NAN;
const asText = (v, other) => {
  if (v === INF) return 'Infinity'; if (v === NINF) return '-Infinity'; if (v === NAN) return 'NaN'; if (v === OTHER) return other;
  return typeof v === 'string' ? v : JSON.stringify(v);
};

/* ══════════ A PLAUSIBLE VALUE FOR EACH OTHER FIELD ══════════ */
let OP = 0;
function plain(field, ctx) {
  const f = field.split(/[.[\]]/).filter(Boolean).pop();
  if (/^(opId|reqId|op|k|nonce|token|sig)$/i.test(f)) return 'hq-' + (++OP);
  if (/^(hitSeq|seq|n?seq)$/.test(f)) return ++OP;
  if (/(target|^to$|victim|other|^pid$|playerId|^who$|^id$|^uid$|inviter|invitee|friend|^from$)/i.test(f)) return ctx.other;
  if (/^(x|y|tx|ty|dx|dy|vx|vy|ax|ay|lx|ly|px|py|mx|my|cx|cy)$/i.test(f)) return 100;
  if (/(angle|ang|dir|facing|rot)$/i.test(f)) return 0;
  if (/(qty|count|^n$|amount|price|wager|bet|gold|coins|stake|bid|level|lv|tier|index|idx|slot|stash|^i$|points|pts|ms|dur|ts|t$|hp|dmg|damage|sec)/i.test(f)) return 1;
  if (/(invKey|itemKey|^key$|item|ore|fish|herb|seed|crop|dish|food)/i.test(f)) return 'copper_ore';
  if (/(text|msg|message|name|title|note|tag|label|topic|reason|words|clan)/i.test(f)) return 'hi';
  if (/(zone|^z$|land|area)/i.test(f)) return 'town';
  if (/(ready|up|on|open|accept|yes|ok|flag|walk|special|bash|whirl)$/i.test(f)) return true;
  if (/(kind|type|mode|cat|category|class|stat|element|skill|ability|weapon|wpn)/i.test(f)) return 'sword';
  return 1;
}
/* a field's place in a body: `a.b` and `a[].b` reach in */
function setPath(obj, path, v) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length; i++) {
    const arr = parts[i].endsWith('[]');
    const k = arr ? parts[i].slice(0, -2) : parts[i];
    if (i === parts.length - 1) { if (arr) o[k] = [v]; else o[k] = v; return; }
    if (arr) { if (!Array.isArray(o[k])) o[k] = [{}]; o = o[k][0]; }
    else { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  }
}

/* ══════════ WHAT IS KEPT: no own `__proto__`, no swapped prototype ══════════ */
const OK_PROTOS = new Set([Object.prototype, Array.prototype, Map.prototype, Set.prototype, Date.prototype, null]);
function protoFaults(root, where, budget = 200000) {
  const out = [], seen = new Set(), stack = [[root, where, 0]];
  while (stack.length && budget-- > 0) {
    const [o, p, d] = stack.pop();
    if (!o || typeof o !== 'object' || seen.has(o) || d > 40) continue;
    seen.add(o);
    if (Object.prototype.hasOwnProperty.call(o, '__proto__')) out.push(p + '.__proto__ (an own key)');
    const pr = Object.getPrototypeOf(o);
    if (!OK_PROTOS.has(pr) && !Object.prototype.hasOwnProperty.call(pr, 'constructor')) out.push(p + ' (its prototype swapped)');
    if (o instanceof Map) { for (const [k, v] of o) stack.push([v, p + '<' + String(k).slice(0, 20) + '>', d + 1]); continue; }
    if (o instanceof Set || ArrayBuffer.isView(o) || typeof o.send === 'function') continue;
    for (const k of Object.keys(o)) stack.push([o[k], p + '.' + k, d + 1]);
  }
  return out;
}
const polluted = () => Object.keys(Object.prototype).length > 0 || Object.keys(Array.prototype).length > 0 || ({}).hostilePolluted !== undefined;
function cleanPollution() { for (const k of Object.keys(Object.prototype)) delete Object.prototype[k]; for (const k of Object.keys(Array.prototype)) delete Array.prototype[k]; }

/* ══════════ THE ROOM ══════════ */
const clock = seededClock().install();
const A = 'bp_hq_aaa', B = 'bp_hq_bbb', C = 'bp_hq_ccc';
const rec = () => ({ _v: 21, coins: 5000, level: 10, hp: 100, maxHp: 100,
  inventory: { copper_ore: 20, wood_oak: 10, fish_minnow: 10, iron_bar: 5 },
  _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });

/* ═══ v2.3.6444: HOW FAR THE CASES REACH (card DG PR 5; the review's REACH plant, kept) ═══
 * A case that a handler's first check stops never meets the lines that read
 * its later fields: the suite would pass with those fields unjudged.  So the
 * test room watches what is read off each message AFTER the wire door lets
 * it in (a Proxy on the message and its payload, armed when `_wireDoor`
 * passes it; the door's own reads are not counted), and section 3 below
 * holds every field a socket row's `trust` names to: read by some case, or
 * listed in NOT_REACHED with why (a list that only falls).  A field read
 * that the row does NOT name fails too (section 4): the door holds only
 * what the table names.  The test room's alone: nothing on the live worker. */
const READS = new Map();   /* 'row field' -> where it was first read (a line of src/) */
const SEEN = new Set();    /* the rows a case took past the door */
const armedOf = new WeakMap();
function whereRead() {
  const at = (new Error().stack || '').split('\n').find((l) => /\/src\//.test(l));
  return at ? at.trim().replace(/^at /, '').replace(/\(?file:\/\/[^)]*?\/server\//, '').replace(/\)$/, '') : '?';
}
function watchReads(room) {
  const onMessage = room._onMessage, door = room._wireDoor;
  room._onMessage = function (ws, session, msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return onMessage.call(this, ws, session, msg);
    const T = String(msg.type).slice(0, 64);
    const st = { on: false };
    const seen = (k) => { if (st.on && typeof k === 'string') { const key = T + ' ' + k; if (!READS.has(key)) READS.set(key, whereRead()); } };
    const wrap = (o) => new Proxy(o, { get(t, k, r) { seen(k); return Reflect.get(t, k, r); }, has(t, k) { seen(k); return Reflect.has(t, k); } });
    const p = msg.payload;
    if (p && typeof p === 'object' && !Array.isArray(p)) msg.payload = wrap(p);
    const m = wrap(msg);
    armedOf.set(m, st);
    return onMessage.call(this, ws, session, m);
  };
  room._wireDoor = function (session, msg) {
    const out = door.call(this, session, msg);
    const st = armedOf.get(msg);
    if (!out && st) { st.on = true; SEEN.add(String(msg.type)); }
    return out;
  };
}

async function newRoom() {
  const st = makeStorage(new Map([['rpg:' + A, rec()], ['rpg:' + B, rec()]]));
  const writes = [];
  const put = st.storage.put;
  st.storage.put = async function (k, v) {
    if (k && typeof k === 'object') for (const [kk, vv] of Object.entries(k)) writes.push([kk, vv]); else writes.push([k, v]);
    return put.call(this, k, v);
  };
  const room = await openRoom(st);
  watchReads(room);   /* v2.3.6444: how far the cases reach (above) */
  /* v2.3.5184: WIRE_HOSTILE_DOOR=off throws the wire door's switch (the
     plan's rule 4): the count is the line before the door, 19 */
  if (DOOR_OFF) room._liveFlags = { ...(room._liveFlags || {}), wiredoor: false };
  const wa = await join(room, fakeWs('a'), A, { loginTaken: true, name: 'Ada' });
  const wb = await join(room, fakeWs('b'), B, { loginTaken: true, name: 'Bob' });
  await settle();
  writes.length = 0;
  return { st, room, wa, wb, writes, start: count(room, st) };
}
const sessionOf = (room, ws) => room.sessions.get(ws);

/* one case's verdict: what happened, and the faults (empty: it passed) */
async function judge(w, row, run, extraMemory = []) {
  const before = w.wa.sent.length;
  const oversize0 = (sessionOf(w.room, w.wa) || {}).oversize || 0;
  const door0 = (sessionOf(w.room, w.wa) || {}).wireDoor || 0;
  w.writes.length = 0;
  const errs = [];
  let threw = null, status = null;
  const quiet = { e: console.error, w: console.warn, l: console.log };
  console.error = (...a) => errs.push(a.map(String).join(' ').slice(0, 120)); console.warn = () => {}; console.log = () => {};
  try { status = await run(); } catch (e) { threw = (e && e.message) || String(e); }
  finally { await soon(); console.error = quiet.e; console.warn = quiet.w; console.log = quiet.l; }
  const faults = [];
  if (threw) faults.push('threw: ' + threw.slice(0, 100));
  if (status === 500) faults.push('answered 500' + (errs.length ? ': ' + errs[0] : ''));
  if (UNHANDLED.length) { faults.push('a promise it started threw: ' + String(UNHANDLED[0]).slice(0, 100)); UNHANDLED.length = 0; }
  const now = count(w.room, w.st);
  const u = unexplained(w.start, now);
  const goods = Object.keys(u.goods);
  if (u.gold || goods.length) faults.push('value moved unexplained: ' + (u.gold ? 'gold ' + u.gold : '') + goods.map((k) => ' ' + k + ' ' + u.goods[k]).join(''));
  if (now.dup.length > w.start.dup.length) faults.push('a piece held twice: ' + now.dup[now.dup.length - 1][0]);
  if (polluted()) { faults.push('Object.prototype polluted'); cleanPollution(); }
  for (const [k, v] of w.writes) for (const p of protoFaults(v, 'stored ' + k)) faults.push(p);
  const mem = [];
  for (const id of [A, B, C]) if (w.room.playerState[id]) mem.push(...protoFaults(w.room.playerState[id], 'ps ' + id.slice(6)));
  for (const s of w.room.sessions.values()) mem.push(...protoFaults(s.data, 'session data'));
  for (const [o, n] of extraMemory) mem.push(...protoFaults(o, n));
  for (const p of mem.slice(0, 2)) faults.push('kept in memory: ' + p);
  /* 4: a row that names only `refused` answers -- unless the router's own
     size gate dropped the frame before any handler (MAX_INBOUND_BYTES,
     v2.3.1618: every row's, silent by design), or (v2.3.5184) the wire door
     did, before any handler too (wire/door.js: only a script sends what it
     drops; refusal-door-list.mjs CODES `door`) */
  const bad = row.bad || [];
  const silent = w.wa.sent.length === before;
  const gated = ((sessionOf(w.room, w.wa) || {}).oversize || 0) > oversize0
    || ((sessionOf(w.room, w.wa) || {}).wireDoor || 0) > door0;
  if (row.envelope !== 'http' && silent && !gated && bad.includes('refused') && !bad.some((b) => b.startsWith('dropped:')) && !threw)
    faults.push('silent, and the row says a wrong value is refused');
  if (faults.length) w.start = now;   /* the next case is judged from here */
  return { faults, silent, status };
}
/* every write of the case committed (a microtask) and every timer it set for
   now run: card E's settle waits 5 ms, which over ten thousand cases is a
   minute of nothing */
const soon = () => new Promise((r) => setImmediate(() => setImmediate(r)));
const UNHANDLED = [];
process.on('unhandledRejection', (e) => UNHANDLED.push((e && e.message) || String(e)));

/* ══════════ THE SOCKET'S ROWS ══════════ */
const census = [];   /* [row, field, value, what happened] */
/* a thing stored or kept is listed once a row: the next case's write of the
   same record carries it again, and is not a new fault */
const seenKept = new Set();
const note = (row, field, label, faults) => {
  for (const f of faults) {
    if (/^(stored|kept in memory)/.test(f)) { const k = row + ' ' + f; if (seenKept.has(k)) continue; seenKept.add(k); }
    census.push([row, field, label, f]);
  }
};
const KINDS = [['threw', /^threw/], ['answered 500', /^answered 500/], ['a promise it started threw', /^a promise/],
  ['value moved unexplained', /^value moved/], ['a piece held twice', /^a piece held twice/], ['Object.prototype polluted', /^Object\.prototype/],
  ['a __proto__ stored', /^stored/], ['a __proto__ kept in memory', /^kept in memory/], ['silent where the row says refused', /^silent/]];
const kindOf = (what) => (KINDS.find(([, re]) => re.test(what)) || ['other'])[0];
const GAP = 61_000;   /* past the flood bucket and most handlers' cooldowns */

function frameFor(row, fields) {
  const P = {};
  for (const [f, v] of Object.entries(fields)) setPath(P, f, v);
  if (row.name === 'track') return { type: row.name, data: P };
  const top = {};
  for (const [k, v] of Object.entries(P)) if (k !== 'type' && k !== 'payload' && k !== 'data') top[k] = v;
  return { ...top, type: row.name, payload: P };
}
function casesOf(row) {
  const fields = Object.keys(row.trust || {});
  const out = [];
  for (const f of fields) for (const [label, make] of HOSTILE) out.push([f, label, make]);
  const guard = typeof row.reqId === 'string' && !REQ_WORDS.has(row.reqId) ? row.reqId.split('+') : [];
  for (const f of new Set([...guard, 'reqId'])) for (const [label, make] of BAD_REQ) out.push([f, label, make]);
  out.push(['(body)', 'keys __proto__, constructor, prototype', () => null]);
  return out;
}
let plantedOnce = false;
async function runSocketRow(row) {
  const w = await newRoom();
  if (PLANT && row.name === 'achv_title' && !plantedOnce) {
    plantedOnce = true;
    w.room._achvTitle = function (session, p) { const ps = this.playerState[session.id]; if (ps && p) ps[p.id] = p; };
  }
  const fields = Object.keys(row.trust || {});
  let n = 0;
  for (const [field, label, make] of casesOf(row)) {
    clock.advance(GAP);
    const ctx = { other: B };
    const vals = {};
    for (const f of fields) vals[f] = plain(f, ctx);
    let v = make();
    if (v === OTHER) v = B;
    if (field !== '(body)') vals[field] = v;
    if (hasNaN(v)) { n++; continue; }   /* cannot arrive: the parse refuses NaN (the header says) */
    let text = wire(frameFor(row, vals));
    if (field === '(body)') text = text.replace(/^\{/, '{' + BODY_KEYS);
    let ws = w.wa;
    if (row.name === 'join') {
      /* a join is its socket's first word: a fresh socket for C each time */
      ws = fakeWs('c');
      w.room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
      const j = JSON.parse(text);
      if (field !== 'id') j.id = C;
      j.ws = [1, 5];
      text = wire(j);
      w.wa_saved = w.wa; w.wa = ws;
    }
    const r = await judge(w, row, () => w.room.webSocketMessage(ws, text));
    if (row.name === 'join') { try { await w.room.webSocketClose(ws, 1000, 'case over', true); } catch {} w.wa = w.wa_saved; }
    note(row.name, field, label, r.faults);
    n++;
  }
  /* what the whole room keeps at the row's end */
  const keep = protoFaults(Object.fromEntries(Object.entries(w.room).filter(([k]) => !/^(state|env|sessions)$/.test(k))), 'room', 400000);
  note(row.name, '(any)', '(the row\'s cases)', keep.slice(0, 3).map((p) => 'kept in memory: ' + p));
  return n;
}

/* ══════════ THE ROUTES A PHONE MAY CALL ══════════ */
const HEADERS = new Set(['x-bt-auth', 'Upgrade', 'Origin']);
const POSTS = /^http:\/api\/(market\/place|store\/(list|buy|bid|accept)|arena\/(join|leave|result)|account\/(login|reset)|feedback\/(submit|vote|crash))$/;
const DELETES = /^http:\/api\/(market|store)\/cancel$/;
function routeOf(row) {
  const [p0, method0] = row.name.slice(5).split(' ');
  let path = p0.replace(/[?#].*$/, '');
  if (path.endsWith('/*')) path = path.slice(0, -1) + 'zz-none';
  const method = method0 || (POSTS.test('http:' + path) ? 'POST' : DELETES.test('http:' + path) ? 'DELETE' : 'GET');
  return { path, method };
}
/* the worker's own door, its rooms and objects */
const RealResponse = globalThis.Response;
globalThis.Response = class extends RealResponse {
  constructor(body, init) { super(body, init && init.status === 101 ? { ...init, status: 200 } : init); }
};
globalThis.WebSocketPair = globalThis.WebSocketPair || function () { const a = fakeWs('pair-a'), b = fakeWs('pair-b'); return { 0: a, 1: b }; };
async function runHttpRow(row) {
  const w = await newRoom();
  const lb = new Leaderboard(makeStorage(), {});
  const fb = new Feedback(makeStorage(), {});
  const env = {
    GAME_ROOM: { idFromName: () => 'room', get: () => w.room },
    LEADERBOARD: { idFromName: () => 'lb', get: () => lb },
    FEEDBACK: { idFromName: () => 'fb', get: () => fb },
    ROOMS: '',
  };
  w.room.env = { ...(w.room.env || {}), ...env };
  const token = sessionOf(w.room, w.wa).httpToken;
  const { path, method } = routeOf(row);
  const fields = Object.keys(row.trust || {}).filter((f) => f !== 'method');
  const plainOf = (f) => (f === 'x-bt-auth' ? token : f === 'Upgrade' ? 'websocket' : f === 'Origin' ? 'https://brotown.net' : f === 'room' ? 'brotown-1' : f === 'playerId' ? A : plain(f, { other: B }));
  const cases = [];
  for (const f of fields) for (const [label, make] of HOSTILE) cases.push([f, label, make]);
  for (const [label, make] of BAD_REQ) cases.push(['reqId', label, make]);
  cases.push(['(body)', 'keys __proto__, constructor, prototype', () => null]);
  let n = 0;
  for (const [field, label, make] of cases) {
    clock.advance(GAP);
    let v = make();
    if (v === OTHER) v = B;
    const vals = {};
    for (const f of fields) vals[f] = plainOf(f);
    if (field !== '(body)') vals[field] = v;
    const headers = { 'Content-Type': 'application/json' };
    const q = new URLSearchParams();
    const body = {};
    let skip = false;
    for (const [f, x] of Object.entries(vals)) {
      if (HEADERS.has(f)) { const t = asText(x, B); if (/[\r\n\0]/.test(t) || t.length > 64 * 1024) { if (f === field) skip = true; continue; } headers[f] = t; continue; }
      if (f === 'room' || method === 'GET' || method === 'DELETE') q.set(f, asText(x, B));
      if (method !== 'GET' && f !== 'room') setPath(body, f, x);
    }
    if (skip) { n++; continue; }   /* a header cannot carry it (a line break, past 64 KB): the runtime refuses it first */
    let text = method === 'GET' ? null : wire(body);
    if (method !== 'GET' && hasNaN(v)) { if (field !== 'room' && !HEADERS.has(field)) { n++; continue; } }
    if (field === '(body)') { if (method === 'GET') { q.set('__proto__', 'x'); q.set('constructor', 'x'); } else text = text.replace(/^\{/, '{' + BODY_KEYS); }
    const qs = q.toString();
    const url = 'https://worker.test' + path + (qs ? '?' + qs : '');
    const r = await judge(w, row, async () => {
      const res = await worker.fetch(new Request(url, { method, headers, body: text }), env);
      try { await res.text(); } catch {}
      return res.status;
    }, [[lb, 'leaderboard'], [fb, 'feedback']]);
    note(row.name, field, label, r.faults);
    n++;
  }
  return n;
}

const REACH_LINE = 0;
const NOT_REACHED = {};

/* ══════════ RUN ══════════ */
const t0 = performance.now();
let cases = 0;
const socketRows = WIRE_IN;
const httpRows = WIRE_HTTP.filter((r) => r.wayIn === 'http');
for (const row of socketRows) cases += await runSocketRow(row);
for (const row of httpRows) cases += await runHttpRow(row);
clock.restore();

check(`1: every in row (${socketRows.length}) and every route a phone may call (${httpRows.length}) ran, ${cases} cases`, cases > socketRows.length * 3);
const failing = census.length;
const kinds = {};
for (const [, , , what] of census) { const k = kindOf(what); kinds[k] = (kinds[k] || 0) + 1; }
console.log('     ' + failing + ' failing cases: ' + JSON.stringify(kinds) + ', in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s');

/* what a row's failing cases are, read from the handler (the census's Why
   column; a row with no line here is read from its cases alone) */
const WHY = {
  /* v2.3.5184: move's 16 and chat_mute's 2 fell (card K PR 4: the wire door, chatmod's mend) */
  character_reset: 'not the handler: the honest restart (`confirm: true`) deletes the character, and the world\'s sum (worldsum.js) reads it as value gone with no burn written: card E\'s sum or card R\'s roads',
};
if (WRITE) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const byRow = new Map();
  for (const c of census) { if (!byRow.has(c[0])) byRow.set(c[0], 0); byRow.set(c[0], byRow.get(c[0]) + 1); }
  const lines = [
    '# The hostile values census (card K PR 3, v2.3.5183)',
    '',
    'Made by `node server/test/wire-hostile.test.mjs --write` (cd server first:',
    '`node test/wire-hostile.test.mjs --write`). Every `in` row of the wire table',
    'and every route a phone may call, one field its `trust` names at a time,',
    'each value of one closed list (the suite\'s header). A line is a case that',
    'fails today; the suite\'s `LINE` is their count, and it only falls (the',
    'plan\'s rule 3). Fix no handler from this page alone: card K\'s PR 4 (the',
    'door\'s checks) lowered it, and each row\'s own fix after.',
    '',
    `**${failing} failing cases** of ${cases}. By kind: ` + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('; ') + '.',
    '',
    'v2.3.5183 (main 9fd5e58): 19. v2.3.5184 (card K PR 4): the wire door',
    '(`server/src/wire/door.js`) drops a key named `__proto__`, `constructor`',
    'or `prototype` at any depth before any handler, which took `move`\'s 16',
    '(movement.js kept `vx`, `vy`, `d`, `f`, `eqc`, `eql`, `eqs` and `ex` as',
    'sent); chatmod.js answers a mute of `__proto__` unchanged, which took',
    '`chat_mute`\'s 2. With `wiredoor: false` the count is 19 again',
    '(`WIRE_HOSTILE_DOOR=off`, the plan\'s rule 4).',
    '',
    '## By row',
    '',
    '| Row | Failing cases | Why |',
    '|---|---|---|',
    ...[...byRow].sort((a, b) => b[1] - a[1]).map(([r, k]) => `| \`${esc(r)}\` | ${k} | ${esc(WHY[r] || '')} |`),
    '',
    'Not failing, and why: a frame of 1 MB is dropped by the router\'s size gate',
    'before any handler (`MAX_INBOUND_BYTES`, v2.3.1618), silent by design for',
    'every row; a frame the wire door drops is silent by design too (its code',
    '`door`); NaN cannot arrive in a frame or a JSON body (the parse refuses',
    'it), so it is sent only as the text `NaN` in a query or a header.',
    '',
    '## Every case',
    '',
    '| Row | Field | Value | What happened |',
    '|---|---|---|---|',
    ...census.map(([r, f, v, what]) => `| \`${esc(r)}\` | \`${esc(f)}\` | ${esc(v)} | ${esc(what)} |`),
    '',
  ];
  writeFileSync(CENSUS, lines.join('\n'));
  console.log('     wrote docs/plan/census/hostile.md');
}

if (DOOR_OFF) {
  check(`2: with the wire door's switch thrown (wiredoor: false), the failing cases are the line before the door (${failing} = ${LINE_DOOR_OFF})`, failing === LINE_DOOR_OFF, census.slice(0, 8));
} else {
  check(`2: the failing cases do not rise past the line (${failing} <= ${LINE}: docs/plan/census/hostile.md)`, failing <= LINE, census.slice(0, 8));
  if (failing < LINE) console.log(`NOTE the failing cases fell (${failing} < ${LINE}): lower LINE in this suite, and the census with --write`);
}
/* ══════════ 3 and 4: HOW FAR THE CASES REACHED (v2.3.6444; card DG PR 5) ══════════
   Every field a socket row's `trust` names (its top level: `data.x` is
   `data`; less type, payload and reqId) was read by some case after the
   door, or is in NOT_REACHED with why; a listed field that a case now reads
   fails until its line goes (the list only falls, REACH_LINE its count).
   And no case read a field its row does not name.  Held with the door on
   (WIRE_HOSTILE_DOOR=off lets other frames in: its reach is not the line). */
const REACH_SKIP = new Set(['type', 'payload', 'reqId']);
const NOT_A_FIELD = /^(then|toJSON|constructor|length|valueOf|toString)$/;
const namedOf = (r) => [...new Set(Object.keys(r.trust || {}).map((k) => k.split('.')[0].replace(/\[\]$/, '')))].filter((k) => !REACH_SKIP.has(k));
if (!DOOR_OFF) {
  const listed = new Set();
  for (const [row, { fields }] of Object.entries(NOT_REACHED)) for (const f of fields) listed.add(row + ' ' + f);
  const unread = [], stale = [], unnamed = [];
  let named = 0, read = 0;
  for (const r of socketRows.filter((x) => !x.wayIn || x.wayIn === 'socket')) {
    const fields = namedOf(r);
    named += fields.length;
    for (const f of fields) {
      const key = r.name + ' ' + f;
      if (READS.has(key)) read++;
      if (READS.has(key) && listed.has(key)) stale.push(key);
      else if (!READS.has(key) && !listed.has(key)) unread.push(key);
    }
    for (const [key, at] of READS) {
      if (!key.startsWith(r.name + ' ')) continue;
      const f = key.slice(r.name.length + 1);
      if (!REACH_SKIP.has(f) && !NOT_A_FIELD.test(f) && !fields.includes(f)) unnamed.push(key + ' (read at ' + at + ')');
    }
  }
  for (const key of listed) if (!WIRE_IN.some((r) => key.startsWith(r.name + ' ') && namedOf(r).includes(key.slice(r.name.length + 1)))) stale.push(key + ' (no such row or field)');
  if (process.argv.includes('--reach')) for (const k of [...unread, ...stale, ...unnamed]) console.log('REACH ' + k);   /* every line, for NOT_REACHED */
  console.log(`     reach: ${named} named fields, ${read} read after the door, ${listed.size} not reached (REACH_LINE ${REACH_LINE}); ${SEEN.size} rows passed the door`);
  check(`3a: every field a row names was read by some case, or is in NOT_REACHED with why (${unread.length} neither)`, unread.length === 0, unread.slice(0, 20));
  check(`3b: NOT_REACHED only falls: no listed field is read now (delete its line) and the list is at most REACH_LINE (${listed.size} <= ${REACH_LINE})`, stale.length === 0 && listed.size <= REACH_LINE, stale.slice(0, 20));
  if (listed.size < REACH_LINE) console.log(`NOTE NOT_REACHED fell (${listed.size} < ${REACH_LINE}): lower REACH_LINE in this suite`);
  check(`4: no case read a field its row does not name (name it in the row's trust: wire/in.js)`, unnamed.length === 0, unnamed.slice(0, 20));
}
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
