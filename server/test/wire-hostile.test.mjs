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
 * WHAT A HANDLER READS, REACHED OR NOT (v2.3.6446, sitting 59's mend; card
 * DG).  Sections 3 and 4 (v2.3.6444) watch the reads a case REACHES; the
 * review of sitting 59 planted three a case never meets and all three
 * stayed green: `if (msg.lucky)` behind a gate no case passes (dice.js), a
 * handler that returns right after its destructure (quests.js: its names
 * counted as read), `msg.length` (the old NOT_A_FIELD words, held to
 * nothing).  Section 5 reads the syntax tree (tools/guards/lib/writesOf.mjs
 * msgReadsOf) from the router into every function the message is handed
 * to, and holds:
 *   5a  every read of a field is of one its row's `trust` names (or
 *       TREE_UNNAMED, with why);
 *   5b  the message appears in no other form (deny by default: a computed
 *       key, a spread, a copy, a rest, a store, a write, a call the tree
 *       cannot follow), or TREE_FORMS;
 *   5c  every named field is read LIVE (not after a return, not a
 *       destructured name nothing uses); and a case's read counts for 3a
 *       only when the tree reads the field live too;
 *   5d  TREE_UNNAMED, TREE_FORMS and TREE_TABLES only fall (TREE_LINE);
 *   5w  the watcher itself, on a room of its own; 5j  the judges' verdicts,
 *       each both ways, on lists of the suite's own; 6  every verdict given.
 * No name is "not a field" any more: `length`, `then`, `toJSON` are held.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14: `WIRE_HOSTILE_PLANT=1 node
 * test/wire-hostile.test.mjs` plants, on the room of the `achv_title` row, a
 * handler that writes `ps[payload.id] = payload` (the shape
 * `ps[payload.k] = ...`); its `"__proto__"` case swaps the record's
 * prototype and the count rises past LINE: FAIL.
 * v2.3.6446 (sitting 59): the review's three lines and three plants of the
 * mend's own (the rest of a payload kept on the room, the message kept in a
 * list by a call on a list, a key put together from two words in a type
 * table's row of another file), each RED (the PR's words); and a
 * mutation pass over the decisions of sections 3 to 5, each mutant against
 * this suite alone: 44 of 48 killed (the PR's words: the 4 and why).
 *
 * Not a phone test: node, card E's test room (testroom.mjs).  ~20 s. */
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { Leaderboard, Feedback } from '../src/index.js';
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_HTTP } from '../src/wire/http.js';
import { makeStorage, openRoom, fakeWs, join, seededClock, settle } from './testroom.mjs';
import { performance } from 'node:perf_hooks';
import { count, unexplained } from '../src/worldsum.js';
import { msgReadsOf } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6446: the tree's reading (section 5) */

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
const judged = new Set();   /* v2.3.6446: the verdicts given (the last check: none skipped) */
const check = (name, ok, detail) => {
  if (!ok) failures++;
  judged.add(String(name).split(':')[0]);
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
 * what the table names; and so does a listing of the message's keys after
 * the door (4b: a spread, Object.assign or JSON copy, whose reads the Proxy
 * cannot see; none today).  The test room's alone: nothing on the live
 * worker.  Its break proofs: the PR's words (card DG PR 5), seven plants.
 * v2.3.6446 (sitting 59): what no case reaches is section 5's (the tree);
 * the watcher's own behaviour is held by 5w, on a room of its own. */
const KEYS = '(its keys)';   /* the key READS notes for a listing of the message's keys */
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
    const wrap = (o) => new Proxy(o, { get(t, k, r) { seen(k); return Reflect.get(t, k, r); }, has(t, k) { seen(k); return Reflect.has(t, k); },
      /* a copy of the whole message (a spread, Object.assign, JSON) lists its keys: the reads off the copy are not seen, so a listing is its own fault (4b) */
      ownKeys(t) { seen(KEYS); return Reflect.ownKeys(t); } });
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

/* v2.3.6444 (card DG PR 5): THE FIELDS NO CASE REACHES, by row, and why:
 * the first check that stops a joined player in town with the plausible
 * values (`plain` above) before the field is read.  The list only falls
 * (3b): a scene that reaches a field takes its line out (a row's own suite
 * plays its scene; the plan's step 4.1).  104 fields on 2026-11-24, the
 * count the review's REACH plant measured (plants3.json, reach.mjs).
 * v2.3.6507 (card PH, the sitting-60 mend, at its merge of main): 108 -- the
 * report's four fields of card PH PR 1 (#2279: `up`, `ride`, `rideGaps`,
 * `ramps`), named in its row before this suite landed and read past the same
 * devClass gate as the report's other eighteen; report.test 15 drives them. */
const REACH_LINE = 108;
const NOT_REACHED = {
  join: { fields: ['nj'],
    why: 'pres is 1, not 2: the near-join list is read only for pres2 (nearjoin.js, join.js)' },
  report: { fields: ['drawLane', 'build', 'secs', 'seen', 'sw', 'drawn', 'gaps', 'late', 'split', 'where', 'near', 'holds', 'mem', 'lost', 'died', 'speed', 'rung', 'self', 'up', 'ride', 'rideGaps', 'ramps'],
    why: 'devClass is not an object: classOfReport gives null and the report drops (report.js)' },
  pong: { fields: ['ts', 'hd'],
    why: 'no ping was sent (the test room runs no tick loop): a pong with lastPing 0 is dropped (index.js)' },
  dice: { fields: ['max'],
    why: 'kind is neither flip nor roll; max is read only for a roll (dice.js)' },
  player_attack: { fields: ['sw', 'orbs', 'part', 'sn'],
    why: 'town is lawful, no duel or No man\'s land: the victim is skipped (combat.js _resolvePvPAttack)' },
  monster_damage: { fields: ['special', 'orbs', 'part', 'sw', 'noKb', 'sn'],
    why: 'monsterId names no monster of the zone (combat.js _handleMonsterDamage)' },
  ability_use: { fields: ['targetId', 'pid'],
    why: 'type is no ability; both are read only for a lunge (index.js _handleAbilityUse)' },
  ability: { fields: ['targetId', 'pid'],
    why: 'kind is no STAM_ABILITIES key (abilities.js)' },
  prog3_allocate: { fields: ['cat'],
    why: 'stat is no stat name; cat is read only for an attack stat (prog3.js)' },
  stats_update: { fields: ['armor', 'legsArmor', 'power', 'vitality', 'endurance', 'agility', 'mind', 'defenseSkill'],
    why: 'a prog3 player skips the T1 stats; armorRef and legsArmorRef win over armor and legsArmor (grids.js)' },
  extraction_start: { fields: ['fishKey'],
    why: 'skill is not cooking; fishKey is read only on the cooking branch (gathering.js)' },
  cook_request: { fields: ['swipeFp'],
    why: 'fishKey is no fish_ key (cooking.js)' },
  farm_act: { fields: ['beds', 'crop'],
    why: 'op is no farm op (farm.js _handleFarmAct)' },
  farm_buy: { fields: ['count'],
    why: 'item is neither compost nor a seed (farm.js _handleFarmBuy)' },
  smelt_bar: { fields: ['count'],
    why: 'barKey is no smelt recipe (smelting.js)' },
  cape_equip: { fields: ['worn'],
    why: 'the player owns no cape: the refusal echo (eventcapes.js)' },
  amulet_forge_request: { fields: ['tierKey', 'gem', 'target', 'stashIdx', 'gid'],
    why: 'op is unknown: denied by default (amulet.js _handleAmuletForge)' },
  gem_cut_request: { fields: ['gem'],
    why: 'shardcrack is on by default: the whole message is refused (amulet.js _handleGemCut)' },
  bank_deposit: { fields: ['id'],
    why: 'kind is out of its form (gold or item) at the door, and id is read only for an item (bank.js)' },
  bank_withdraw: { fields: ['id'],
    why: 'kind is out of its form (gold or item) at the door, and id is read only for an item (bank.js)' },
  store_dm: { fields: ['to'],
    why: 'listingId names no listing; to is read only for the seller (storechat.js)' },
  daily_reroll: { fields: ['i'],
    why: 'the daily quests are off unless their flag is set (dailyrewards.js)' },
  season_claim: { fields: ['all', 'tier'],
    why: 'the season is off unless its flag is set (dailyrewards.js)' },
  bro_verify: { fields: ['signature', 'tokenId', 'count'],
    why: 'no bro_nonce was asked first: nonce_expired (broverify.js)' },
  item_drop: { fields: ['qty'],
    why: 'town is a no-drop zone: not-here (itemdrop.js)' },
  farm_order: { fields: ['id'],
    why: 'day is not the record\'s day: order-stale before id (farmorders.js)' },
  make_traps: { fields: ['count'],
    why: 'log is no TRAPPING log: bad-log (trapping.js)' },
  smith_salvage: { fields: ['gid', 'idx', 'sig'],
    why: 'field is neither the weapon stash nor an armour list: bad (salvage.js)' },
  essence_apply: { fields: ['gid', 'idx', 'sig'],
    why: 'essence is no essence key: bad (salvage.js)' },
  shield_gem: { fields: ['gid', 'sig'],
    why: 'gem is not a string: bad_gem (shieldgem.js)' },
  shard_crack: { fields: ['count'],
    why: 'land is no SHARD_CRACK land: bad_land (shardcrack.js)' },
  make_hardened_wood: { fields: ['count'],
    why: 'key is no hardened-wood recipe: bad-key (hardenedwood.js)' },
  pet_name: { fields: ['name'],
    why: 'the player has no pets: no-pet (petbook.js)' },
  pet_release: { fields: ['confirm'],
    why: 'the player has no pets: no-pet (petbook.js)' },
  arena_sponsor: { fields: ['matchId', 'amount'],
    why: 'no tournament is running: no-tournament (gladiator.js)' },
  trade2_set: { fields: ['offer'],
    why: 'no trade is open (trade2.js: phase trade:in)' },
  trade2_ready: { fields: ['ready'],
    why: 'no trade is open (trade2.js: phase trade:in)' },
  trade2_stage_weapon: { fields: ['stashIdx', 'gid', 'expectName'],
    why: 'no trade is open (trade2.js: phase trade:in)' },
  trade2_unstage_weapon: { fields: ['seq'],
    why: 'no trade is open (trade2.js: phase trade:in)' },
  trade2_pets: { fields: ['ids'],
    why: 'no trade is open (trade2.js: phase trade:in)' },
  party_chat: { fields: ['text'],
    why: 'the player is in no party (party.js: phase party:in)' },
  alliance_name: { fields: ['name', 'tag'],
    why: 'the player leads no party: no-party (alliance.js)' },
  alliance_war: { fields: ['tag'],
    why: 'the player leads no party: no-party (alliance.js)' },
  clan_create: { fields: ['name', 'tag', 'color1', 'color2', 'logo'],
    why: 'clanparty is on by default: new clans are refused (clans.js)' },
  clan_join_accept: { fields: ['inviter'],
    why: 'clanparty is on by default: joins are refused (clans.js)' },
  clan_war_declare: { fields: ['defenderTag', 'war', 'zone'],
    why: 'clanparty is on by default: new wars are refused (clans.js)' },
};

/* v2.3.6446 (sitting 59): WHAT THE TREE READS THAT A ROW DOES NOT NAME, and
 * the forms the tree's reading (tools/guards/lib/writesOf.mjs msgReadsOf)
 * lets by, each with why.  Section 5 holds every OTHER read the tree finds
 * to its row's `trust`, and every other form of the message to nothing
 * (deny by default).  Counted (TREE_LINE: their fields, forms and tables)
 * and the list only falls: a row that names the field takes its line out.
 * Found 2026-11-24 by the tree, behind gates no case of section 1 passes
 * (a field the running room never meets).  Named in no row here: naming
 * a field puts it under the door's forms, which is the row's own change. */
const TREE_UNNAMED = {
  ride: { fields: ['data'],
    why: 'ride.js _handleRide reads `msg.payload || msg.data || msg`: a phone\'s `data: { on }` (a case sends a payload, so the Proxy never meets it)' },
  player_attack: { fields: ['element'],
    why: 'pvpextras.js _pvpClaimElement reads the claim\'s element only with weapongem thrown (as monster_damage\'s `element`, named in v2.3.6444)' },
  dungeon_start: { fields: ['monsters', 'name', 'terrain', 'width', 'height', 'waves', 'monsterLevel', 'element', 'hasBoss', 'bossArchetype', 'bossMultiplier'],
    why: 'dungeon.js _dungeonSanitizeConfig(payload.config || payload): with no config the payload itself is the config (the row\'s `absent`), and the row names only `config.*`' },
};
const TREE_FORMS = [
  { at: 'join.js _handleJoin', what: 'a write of the message (data)',
    why: 'a join with no record on file strips the rpg claims off its own `data` before anything reads it (join.js: a new character starts from the server\'s defaults; CLAUDE.md §5 Identity)' },
];
/* a table built at run time, read as the literal it is made from (`FIGHT_LOCK`
   is Object.fromEntries over FIGHT_LOCK_SW and FIGHT_LOCK_HOW: its rows'
   `when` and `refuse` are FIGHT_LOCK_HOW's) */
const TREE_TABLES = { 'fightlock.js:FIGHT_LOCK': 'FIGHT_LOCK_HOW' };
const TREE_LINE = 15;   /* 13 fields + 1 form + 1 table, 2026-11-24 */

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
/* ══════════ 3 to 5: HOW FAR THE CASES REACHED, AND WHAT THE TREE READS ══════════
   (v2.3.6444, card DG PR 5; v2.3.6446, sitting 59's mend)
   3 and 4: every field a socket row's `trust` names (its top level: `data.x`
   is `data`; less type, payload and reqId) was read by some case after the
   door, or is in NOT_REACHED with why; a listed field that a case now reads
   fails until its line goes (the list only falls, REACH_LINE its count).
   And no case read a field its row does not name.  Held with the door on
   (WIRE_HOSTILE_DOOR=off lets other frames in: its reach is not the line).
   v2.3.6446 (sitting 59: `if (msg.lucky)` behind a gate no case passes, a
   handler that returns right after its destructure, `msg.length`, all
   green): a case's read counts only when the tree reads the field LIVE too
   (5), and no name is let by as "not a field" (`length`, `then`, `toJSON`:
   the old NOT_A_FIELD words, read by no case today, held now). */
const REACH_SKIP = new Set(['type', 'payload', 'reqId']);
const namedOf = (r) => [...new Set(Object.keys(r.trust || {}).map((k) => k.split('.')[0].replace(/\[\]$/, '')))].filter((k) => !REACH_SKIP.has(k));
const isSocket = (x) => x.dir === 'in' && (!x.wayIn || x.wayIn === 'socket');

/* v2.3.6446: THE JUDGES, pure, so 5j tries every verdict on lists of its own
   (sitting 59's rule: each comparison the suite decides by is killed by a
   test, not only by a room that happens to fail).
   judgeReach: the running room's reads (`reads`: 'row field' -> where), the
   tree's live reads (`treeLive`: 'row field'), NOT_REACHED and its line. */
function judgeReach({ rows, reads, treeLive, notReached, line }) {
  const listed = new Set();
  for (const [row, { fields }] of Object.entries(notReached)) for (const f of fields) listed.add(row + ' ' + f);
  const unread = [], stale = [], unnamed = [], listedKeys = [];
  let named = 0, read = 0;
  for (const r of rows) {
    const fields = namedOf(r);
    named += fields.length;
    for (const f of fields) {
      const key = r.name + ' ' + f;
      /* a destructure whose names nothing uses is no read (the review's quests.js plant) */
      const was = reads.has(key) && treeLive.has(key);
      if (was) read++;
      if (was && listed.has(key)) stale.push(key);
      else if (!was && !listed.has(key)) unread.push(key);
    }
    for (const [key, at] of reads) {
      if (!key.startsWith(r.name + ' ')) continue;
      const f = key.slice(r.name.length + 1);
      if (f === KEYS) listedKeys.push(key + ' (at ' + at + ')');
      else if (!REACH_SKIP.has(f) && !fields.includes(f)) unnamed.push(key + ' (read at ' + at + ')');
    }
  }
  for (const key of listed) if (!rows.some((r) => key.startsWith(r.name + ' ') && namedOf(r).includes(key.slice(r.name.length + 1)))) stale.push(key + ' (no such row or field)');
  const count = listed.size;
  return { named, read, count, unread, stale, unnamed, listedKeys,
    ok3a: unread.length === 0, ok3b: stale.length === 0 && count <= line, ok4: unnamed.length === 0, ok4b: listedKeys.length === 0 };
}
/* judgeTree: the tree's reads and faults (msgReadsOf) against the rows, with
   TREE_UNNAMED, TREE_FORMS and the line (the tables count in it too) */
function judgeTree({ rows, tree, unnamedKnown, formsKnown, tables, line }) {
  const byName = new Map(rows.map((r) => [r.name, namedOf(r)]));
  const known = new Set();
  for (const [row, { fields }] of Object.entries(unnamedKnown)) for (const f of fields) known.add(row + ' ' + f);
  const unnamed = new Map(), live = new Set(), usedKnown = new Set(), usedForms = new Set(), faults = [];
  for (const x of tree.reads) {
    for (const t of x.types) {
      const fields = byName.get(t);
      if (!fields) continue;
      const key = t + ' ' + x.field;
      if (x.live) live.add(key);
      if (REACH_SKIP.has(x.field) || fields.includes(x.field)) continue;
      if (known.has(key)) { usedKnown.add(key); continue; }
      if (!unnamed.has(key)) unnamed.set(key, x.file + ':' + x.line + ' ' + x.text);
    }
  }
  for (const f of tree.faults) {
    /* a fault no socket row's type reaches is a relay's (the router's default: wire-gaps holds it) */
    if (![...f.types].some((t) => byName.has(t))) continue;
    const row = formsKnown.find((k) => k.at === f.file + ' ' + f.fn && k.what === f.what);
    if (row) { usedForms.add(row); continue; }
    faults.push(f.file + ':' + f.line + ' [' + f.fn + '] ' + f.what + ': ' + f.text + ' (' + [...f.types].slice(0, 3).join(', ') + (f.types.size > 3 ? ' +' + (f.types.size - 3) : '') + ')');
  }
  const neverLive = [];
  for (const r of rows) for (const f of byName.get(r.name)) if (!live.has(r.name + ' ' + f)) neverLive.push(r.name + ' ' + f);
  const stale = [...known].filter((k) => !usedKnown.has(k))
    .concat(formsKnown.filter((k) => !usedForms.has(k)).map((k) => k.at + ': ' + k.what));
  const count = known.size + formsKnown.length + Object.keys(tables).length;
  return { live, count, unnamed: [...unnamed].map(([k, at]) => k + ' (' + at + ')'), faults, neverLive, stale,
    ok5a: unnamed.size === 0, ok5b: faults.length === 0, ok5c: neverLive.length === 0, ok5d: stale.length === 0 && count <= line };
}

/* v2.3.6446: the tree's reading of every handler the router hands a message to */
function srcFiles() {
  const out = {};
  const walk = (dir, pre) => {
    for (const f of readdirSync(dir)) {
      const p = pathJoin(dir, f);
      if (statSync(p).isDirectory()) walk(p, pre + f + '/');
      else if (f.endsWith('.js')) out[pre + f] = readFileSync(p, 'utf8');
    }
  };
  walk(fileURLToPath(new URL('../src/', import.meta.url)), '');
  return out;
}
const socketIn = socketRows.filter(isSocket);
const tree = msgReadsOf(srcFiles(), { entry: { file: 'index.js', fn: '_onMessage', param: 2 }, types: socketIn.map((r) => r.name),
  skip: ['_wireDoor'], tables: TREE_TABLES });
const tv = judgeTree({ rows: socketIn, tree, unnamedKnown: TREE_UNNAMED, formsKnown: TREE_FORMS, tables: TREE_TABLES, line: TREE_LINE });

if (!DOOR_OFF) {
  const v = judgeReach({ rows: socketIn, reads: READS, treeLive: tv.live, notReached: NOT_REACHED, line: REACH_LINE });
  if (process.argv.includes('--reach')) for (const k of [...v.unread, ...v.stale, ...v.unnamed, ...v.listedKeys]) console.log('REACH ' + k);   /* every line, for NOT_REACHED */
  console.log(`     reach: ${v.named} named fields, ${v.read} read after the door (and live in the tree), ${v.count} not reached (REACH_LINE ${REACH_LINE}); ${SEEN.size} rows passed the door`);
  check(`3a: every field a row names was read by some case (and the tree reads it live), or is in NOT_REACHED with why (${v.unread.length} neither)`, v.ok3a, v.unread.slice(0, 20));
  check(`3b: NOT_REACHED only falls: no listed field is read now (delete its line) and the list is at most REACH_LINE (${v.count} <= ${REACH_LINE})`, v.ok3b, v.stale.slice(0, 20));
  if (v.count < REACH_LINE) console.log(`NOTE NOT_REACHED fell (${v.count} < ${REACH_LINE}): lower REACH_LINE in this suite`);
  check(`4: no case read a field its row does not name (name it in the row's trust: wire/in.js)`, v.ok4, v.unnamed.slice(0, 20));
  check(`4b: no handler lists a message's keys after the door (a copy of the whole message hides what it reads: read the named fields)`, v.ok4b, v.listedKeys.slice(0, 20));
}

/* ══════════ 5: WHAT THE TREE READS, REACHED OR NOT (v2.3.6446, sitting 59) ══════════
   The running room holds only what its cases reach; the tree holds the rest
   (tools/guards/lib/writesOf.mjs msgReadsOf: from index.js _onMessage into
   every function the message is handed to, which types reach each line read
   off the router's cases and the tests of msg.type). */
console.log(`     tree: ${tree.reads.length} reads of a message, ${tree.faults.length} other forms (${tree.faults.length - tv.faults.length - TREE_FORMS.length} a relay's), allowed ${tv.count} (TREE_LINE ${TREE_LINE})`);
check(`5a: every read the tree finds is of a field its row names, or in TREE_UNNAMED with why (${tv.unnamed.length} not)`, tv.ok5a, tv.unnamed.slice(0, 20));
check(`5b: the message appears in no form but a read of a named field (deny by default: a computed key, a spread, a copy, a rest, a store, a write, a call it cannot follow), or in TREE_FORMS (${tv.faults.length} not)`, tv.ok5b, tv.faults.slice(0, 20));
check(`5c: every field a row names is read LIVE somewhere in the tree (not after a return, not a destructured name nothing uses) (${tv.neverLive.length} not)`, tv.ok5c, tv.neverLive.slice(0, 20));
check(`5d: TREE_UNNAMED, TREE_FORMS and TREE_TABLES only fall: each row still found, at most TREE_LINE (${tv.count} <= ${TREE_LINE})`, tv.ok5d, tv.stale.slice(0, 20));
if (tv.count < TREE_LINE) console.log(`NOTE the tree's allowed list fell (${tv.count} < ${TREE_LINE}): lower TREE_LINE in this suite`);

/* 5w: the running room's watcher itself, on a room of its own: a read after
   the door is counted (a member, `in`, a listing of keys, a symbol passes
   unharmed), a read before it or on a frame the door dropped is not, and
   what is no plain object goes by unwrapped. */
{
  const WS = '__watch_self', WD = '__watch_drop', SYM = Symbol('s');
  const fake = {
    _onMessage(ws, s, m) {
      if (!m || typeof m !== 'object') return 'plain';
      void m.before;
      if (this._wireDoor(s, m)) { void m.after; return 'dropped'; }
      const p = m.payload;
      if (Array.isArray(p)) void p[0];
      else if (p && typeof p === 'object') { void p.a; void Object.keys(p); void p[SYM]; }
      void ('b' in m);
      void m.length;
      if (Array.isArray(m)) void m[0];
      return 'ran';
    },
    _wireDoor(s, m) { return m.type === WD ? 'drop' : ''; },
  };
  watchReads(fake);
  const before = new Set(READS.keys()), seenBefore = new Set(SEEN);
  const outs = [];
  let threw = null;
  try {
    for (const m of [{ type: WS, payload: { a: 1 }, b: 2, before: 1 }, { type: WD, payload: { a: 1 }, after: 1 }, null, 'text', [1],
      { type: WS + '_arr', payload: [5] }, { type: WS + '_null', payload: null }, { type: WS + '_str', payload: 'x' }]) outs.push(fake._onMessage(null, {}, m));
  } catch (e) { threw = String(e && e.message); }
  const got = [...READS.keys()].filter((k) => !before.has(k)).sort();
  /* `type`: the watcher's own read once the door passed (SEEN) */
  const want = [WS + ' (its keys)', WS + ' a', WS + ' b', WS + ' length', WS + ' payload', WS + ' type']
    .concat(...['_arr', '_null', '_str'].map((x) => ['b', 'length', 'payload', 'type'].map((f) => WS + x + ' ' + f))).sort();
  const seenNew = [...SEEN].filter((k) => !seenBefore.has(k)).sort();
  check(`5w: the watcher counts what is read after the door and nothing else (${got.length} reads)`, !threw && JSON.stringify(got) === JSON.stringify(want)
    && JSON.stringify(outs) === JSON.stringify(['ran', 'dropped', 'plain', 'plain', 'ran', 'ran', 'ran', 'ran'])
    && JSON.stringify(seenNew) === JSON.stringify([WS, WS + '_arr', WS + '_null', WS + '_str']), { threw, got, outs, seenNew });
  for (const k of got) READS.delete(k);
  for (const k of seenNew) SEEN.delete(k);
}

/* 5j: the judges' verdicts on lists of the suite's own: each verdict both
   ways, at the line and one past it */
{
  const rows = [{ name: 'r1', trust: { x: 'request', y: 'request', 'd.e': 'request', reqId: 'request' } }];
  const R = (...ks) => new Map(ks.map((k) => [k, 'here']));
  const L = (...ks) => new Set(ks);
  const J = (o) => judgeReach({ rows, line: 1, notReached: { r1: { fields: ['y'], why: '' } }, ...o });
  const cases = [
    ['all read or listed', J({ reads: R('r1 x', 'r1 d'), treeLive: L('r1 x', 'r1 d', 'r1 y') }), { ok3a: true, ok3b: true, ok4: true, ok4b: true }],
    ['a field neither read nor listed', J({ reads: R('r1 x'), treeLive: L('r1 x', 'r1 d') }), { ok3a: false, ok3b: true }],
    ['a case read it, the tree reads it nowhere live (a dead destructure)', J({ reads: R('r1 x', 'r1 d'), treeLive: L('r1 x') }), { ok3a: false }],
    ['a listed field a case reads', J({ reads: R('r1 x', 'r1 d', 'r1 y'), treeLive: L('r1 x', 'r1 d', 'r1 y') }), { ok3a: true, ok3b: false }],
    ['a listed field that is no field', J({ reads: R('r1 x', 'r1 d'), treeLive: L('r1 x', 'r1 d'), notReached: { r1: { fields: ['y', 'zz'], why: '' } }, line: 2 }), { ok3b: false }],
    ['the list one past its line', J({ reads: R('r1 x'), treeLive: L('r1 x'), notReached: { r1: { fields: ['y', 'd'], why: '' } } }), { ok3a: true, ok3b: false }],
    ['the list at its line', J({ reads: R('r1 x'), treeLive: L('r1 x'), notReached: { r1: { fields: ['y', 'd'], why: '' } }, line: 2 }), { ok3b: true }],
    ['a read of a field the row does not name', J({ reads: R('r1 x', 'r1 d', 'r1 q'), treeLive: L('r1 x', 'r1 d') }), { ok4: false }],
    ['`length` is a field like any other', J({ reads: R('r1 x', 'r1 d', 'r1 length'), treeLive: L('r1 x', 'r1 d') }), { ok4: false }],
    ['type, payload and reqId are no fields', J({ reads: R('r1 x', 'r1 d', 'r1 type', 'r1 payload', 'r1 reqId'), treeLive: L('r1 x', 'r1 d') }), { ok4: true, ok3a: true }],
    ['a listing of the keys', J({ reads: R('r1 x', 'r1 d', 'r1 ' + KEYS), treeLive: L('r1 x', 'r1 d') }), { ok4b: false, ok4: true }],
  ];
  const T = (reads, faults, o = {}) => judgeTree({ rows, tree: { reads, faults }, unnamedKnown: {}, formsKnown: [], tables: {}, line: 0, ...o });
  const rd = (field, live = true, types = ['r1']) => ({ types: new Set(types), field, live, file: 'f.js', line: 1, text: '' });
  const ft = (what, types = ['r1']) => ({ types: new Set(types), file: 'f.js', line: 1, fn: 'h', what, text: '' });
  const all = [rd('x'), rd('y'), rd('d')];
  cases.push(
    ['the tree: every named field read live', T(all, []), { ok5a: true, ok5b: true, ok5c: true, ok5d: true }],
    ['the tree: a named field read only dead', T([rd('x'), rd('y', false), rd('d')], []), { ok5c: false, ok5a: true }],
    ['the tree: a read the row does not name', T([...all, rd('lucky')], []), { ok5a: false }],
    ['the tree: `length` read', T([...all, rd('length')], []), { ok5a: false }],
    ['the tree: an unnamed read listed', T([...all, rd('q')], [], { unnamedKnown: { r1: { fields: ['q'], why: '' } }, line: 1 }), { ok5a: true, ok5d: true }],
    ['the tree: the list one past its line', T([...all, rd('q')], [], { unnamedKnown: { r1: { fields: ['q'], why: '' } }, line: 0 }), { ok5a: true, ok5d: false }],
    ['the tree: a listed read no longer found', T(all, [], { unnamedKnown: { r1: { fields: ['q'], why: '' } }, line: 1 }), { ok5d: false }],
    ['the tree: a listed read of no row', T(all, [], { unnamedKnown: { r9: { fields: ['q'], why: '' } }, line: 1 }), { ok5d: false }],
    ['the tree: a fault', T(all, [ft('a spread')]), { ok5b: false }],
    ['the tree: a fault listed', T(all, [ft('a spread')], { formsKnown: [{ at: 'f.js h', what: 'a spread' }], line: 1 }), { ok5b: true, ok5d: true }],
    ['the tree: another fault in a listed function', T(all, [ft('a rest')], { formsKnown: [{ at: 'f.js h', what: 'a spread' }], line: 1 }), { ok5b: false }],
    ['the tree: a listed fault no longer found', T(all, [], { formsKnown: [{ at: 'f.js h', what: 'a spread' }], line: 1 }), { ok5d: false }],
    ['the tree: a fault no row reaches (a relay\'s)', T(all, [ft('a spread', [])]), { ok5b: true }],
    ['the tree: a read no row reaches', T([...all, rd('lucky', true, [])], []), { ok5a: true }],
    ['the tree: a table counts in the line', T(all, [], { tables: { 'a.js:T': 'U' }, line: 0 }), { ok5d: false }],
  );
  const bad = cases.filter(([, got, want]) => Object.entries(want).some(([k, v]) => got[k] !== v)).map(([n, got, want]) => n + ': ' + JSON.stringify(Object.fromEntries(Object.keys(want).map((k) => [k, got[k]]))));
  check(`5j: the judges' verdicts on ${cases.length} lists of the suite's own`, bad.length === 0, bad);
}
/* v2.3.6446: every verdict was given (a branch that skips a section is a red, not a silence) */
{
  const want = ['1', '2', ...(DOOR_OFF ? [] : ['3a', '3b', '4', '4b']), '5a', '5b', '5c', '5d', '5w', '5j'];
  check(`6: every verdict was given (${want.join(' ')})`, want.every((k) => judged.has(k)), want.filter((k) => !judged.has(k)));
}
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
