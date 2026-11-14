/* ═══ v2.3.5184: THE WIRE DOOR (grand plan step 4.1, step 3; card K PR 4) ═══
 *
 * One check before any handler, at the two ways in: the router
 * (index.js `_onMessage`, for every frame and every part of a bundle, after
 * the join gate) and the room's web routes (index.js GameRoom `fetch`, just
 * after the live flags load: the market, the store, the arena, the account,
 * botstat and admin).  It refuses only what no page of the game sends:
 *
 *   key     a key named `__proto__`, `constructor` or `prototype`, at any
 *           depth of the message or the body (or as a query's name).  A
 *           handler that writes `obj[k] = v` with one swaps a prototype or
 *           stores an own `__proto__` (TRAPS: the 2026-07-07 incidents; the
 *           hostile census's `move`, 16 cases);
 *   body    a `payload`, or a route's JSON body, that is not a plain object;
 *   number  a field the row's `trust` names holding a number that is not
 *           finite (Infinity arrives as `1e999`; a page's JSON never writes
 *           one: JSON.stringify writes null);
 *   words   a `words` field (trust) that is not a string, or longer than
 *           WIRE_DOOR.WORDS_MAX (above every handler's own clamp: chat 200,
 *           feedback 500, names 16 to 64);
 *   reqId   a `reqId` outside SHAPES part 2's form (1 to 64 of A-Z a-z 0-9
 *           _ -): the action door's maker (src/game/actions.js) makes no
 *           other.
 *
 * A field the row does not name passes untouched: an older or a newer
 * phone's extra field is not a fault.  `null` passes where a field is
 * checked (a page's NaN arrives as null: the handler judges it, as before).
 *
 * WHAT THE ROWS ARE: the wire table's `trust` column (lists.js
 * WIRE_DOOR_ROWS): a socket message by its type (an `in` or a `relay` row),
 * a route by `http:<path> <METHOD>` or `http:<path>`.  A type or a route
 * with no row gets the checks that need no row (key, body, reqId).
 *
 * A REFUSAL: a frame is dropped silently (refusal-door-list.mjs CODES
 * `door`: only a script sends one, and an answer helps it probe); a route
 * answers 400 `{ ok: false, error: 'bad request' }`.  Each is counted (the
 * room's `_wireDoorCounts`, by type and why; the socket's `wireDoor`), and
 * the first WIRE_DOOR.LOG_FIRST of a worker's life are logged with their
 * type, why and field, so a page that meets the door is seen at once.
 *
 * THE SWITCH: `wiredoor: false` in the live flags (liveops.js
 * `_wireDoorOff`) and the door checks nothing, counts nothing: today's way,
 * byte for byte (wire-door.test §6 runs it thrown: the plan's rule 4).
 *
 * docs/specs/wire-door.md says it in full. */
import { WIRE_DOOR_ROWS } from './lists.js';

export const WIRE_DOOR = Object.freeze({
  BAD_KEYS: Object.freeze(new Set(['__proto__', 'constructor', 'prototype'])),
  /* SHAPES part 2's request id: the one form, the action door's maker's */
  REQ_ID_RE: /^[A-Za-z0-9_-]{1,64}$/,
  /* a `words` field's bound: above every handler's own clamp (chatlanes.js
     TEXT_MAX 200, feedback.js FEEDBACK_TEXT_MAX 500, the names' 16 to 64),
     so the door refuses only what no input box of the game can hold */
  WORDS_MAX: 2000,
  /* nodes walked in one message or body: a frame is at most 16 KB
     (MAX_INBOUND_BYTES), some 8,000 nodes; past this the body is refused
     (`key`: it could not be read to its end) */
  NODES_MAX: 50000,
  /* the elements of one array a field's path is read through */
  ARRAY_MAX: 256,
  /* refusals logged in a worker's life; every one is counted */
  LOG_FIRST: 20,
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isPlain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/* a key named like the prototype's anywhere in `root` (iterative: a body
   1,000 deep is walked, never recursed).  '' when clean. */
function badKeyIn(root) {
  if (!root || typeof root !== 'object') return '';
  const stack = [root];
  let n = 0;
  while (stack.length) {
    const o = stack.pop();
    if (++n > WIRE_DOOR.NODES_MAX) return 'key';
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) { const v = o[i]; if (v && typeof v === 'object') stack.push(v); }
      continue;
    }
    for (const k of Object.keys(o)) {
      if (WIRE_DOOR.BAD_KEYS.has(k)) return 'key';
      const v = o[k];
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return '';
}

/* a number that is not finite anywhere in a field's value */
function nonFiniteIn(v) {
  if (typeof v === 'number') return !Number.isFinite(v);
  if (!v || typeof v !== 'object') return false;
  const stack = [v];
  let n = 0;
  while (stack.length && ++n <= WIRE_DOOR.NODES_MAX) {
    const o = stack.pop();
    for (const x of (Array.isArray(o) ? o : Object.values(o))) {
      if (typeof x === 'number' && !Number.isFinite(x)) return true;
      if (x && typeof x === 'object') stack.push(x);
    }
  }
  return false;
}

/* every value at a field's path (`a.b`, `a[].b`; an array met on the way is
   read through, its first ARRAY_MAX elements) */
function valuesAt(root, path) {
  let cur = [root];
  for (const raw of path.split('.')) {
    const k = raw.endsWith('[]') ? raw.slice(0, -2) : raw;
    const next = [];
    for (const o of cur) {
      if (!o || typeof o !== 'object') continue;
      const list = Array.isArray(o) ? o.slice(0, WIRE_DOOR.ARRAY_MAX) : [o];
      for (const x of list) if (x && typeof x === 'object' && !Array.isArray(x) && own(x, k)) next.push(x[k]);
    }
    cur = next;
    if (!cur.length) return cur;
  }
  return cur;
}

const reqIdBad = (v) => v !== undefined && !(typeof v === 'string' && WIRE_DOOR.REQ_ID_RE.test(v));

/* a field's value against its trust: '' when it passes */
function fieldWhy(trust, v) {
  if (v === undefined || v === null) return '';
  if (nonFiniteIn(v)) return 'number';
  if (trust === 'words' && (typeof v !== 'string' || v.length > WIRE_DOOR.WORDS_MAX)) return 'words';
  return '';
}

/* ── the judges: pure, so a suite reads them alone ── */

/* A socket message (a frame, or one part of a bundle): '' to let it in, or
   `<why>` / `<why> <field>`.  `rows` is a Map type -> [[path, trust]]. */
export function wireDoorJudge(msg, rows = WIRE_DOOR_ROWS.SOCKET) {
  if (!isPlain(msg)) return 'body';
  if (badKeyIn(msg)) return 'key';
  if (own(msg, 'payload') && msg.payload !== null && msg.payload !== undefined && !isPlain(msg.payload)) return 'body';
  if (reqIdBad(msg.reqId) || (isPlain(msg.payload) && reqIdBad(msg.payload.reqId))) return 'reqId';
  const fields = typeof msg.type === 'string' && rows.has(msg.type) ? rows.get(msg.type) : null;
  if (!fields) return '';
  /* a field sits in `payload` or at the message's top (the phone's way for
     each type differs: SHAPES part 5 `body`); both are read */
  const roots = isPlain(msg.payload) ? [msg.payload, msg] : [msg];
  for (const [path, trust] of fields) {
    for (const root of roots) {
      for (const v of valuesAt(root, path)) {
        const why = fieldWhy(trust, v);
        if (why) return why + ' ' + path;
      }
    }
  }
  return '';
}

/* A route: its row's name, its query and its JSON body (undefined when it
   has none, or none that parses: the route answers that as today). */
export function wireDoorRouteJudge(rowName, query, body, rows = WIRE_DOOR_ROWS.ROUTES) {
  for (const k of query.keys()) if (WIRE_DOOR.BAD_KEYS.has(k)) return 'key';
  if (reqIdBad(query.has('reqId') ? query.get('reqId') : undefined)) return 'reqId';
  if (body !== undefined) {
    if (!isPlain(body)) return 'body';
    if (badKeyIn(body)) return 'key';
    if (reqIdBad(body.reqId)) return 'reqId';
  }
  const fields = rowName && rows.has(rowName) ? rows.get(rowName) : null;
  if (!fields) return '';
  for (const [path, trust] of fields) {
    if (query.has(path)) { const why = fieldWhy(trust, query.get(path)); if (why) return why + ' ' + path; }
    if (body !== undefined) for (const v of valuesAt(body, path)) { const why = fieldWhy(trust, v); if (why) return why + ' ' + path; }
  }
  return '';
}

/* the route's row: `http:<path> <METHOD>`, else `http:<path>` */
export function wireDoorRouteRow(pathname, method, rows = WIRE_DOOR_ROWS.ROUTES) {
  const a = 'http:' + pathname + ' ' + method;
  if (rows.has(a)) return a;
  const b = 'http:' + pathname;
  return rows.has(b) ? b : '';
}

/* ── the room's methods (index.js mixes them in) ── */
export const wireDoorMethods = {
  /* count and (the first few) log a refusal */
  _wireDoorCount(type, why) {
    if (!this._wireDoorCounts) this._wireDoorCounts = Object.create(null);
    const key = String(type).slice(0, 64) + ' ' + why.split(' ')[0];
    this._wireDoorCounts[key] = (this._wireDoorCounts[key] || 0) + 1;
    this._wireDoorRefused = (this._wireDoorRefused || 0) + 1;
    if (this._wireDoorRefused <= WIRE_DOOR.LOG_FIRST) {
      try { console.warn('[wiredoor] refused ' + String(type).slice(0, 64) + ': ' + why); } catch (e) { /* the count stands */ }
    }
  },

  /* The router's door: true when the message was refused here and must go no
     further.  Synchronous, so a bundle's parts still finish in order (TRAPS
     §182). */
  _wireDoor(session, msg) {
    if (this._wireDoorOff && this._wireDoorOff()) return false;
    const why = wireDoorJudge(msg);
    if (!why) return false;
    if (session) session.wireDoor = (session.wireDoor || 0) + 1;
    this._wireDoorCount(msg && typeof msg.type === 'string' ? msg.type : '(no type)', why);
    return true;
  },

  /* The routes' door: a 400 to answer with, or null to go on.  The body is
     read from a clone, so the route reads its own as before. */
  async _wireDoorHttp(request, url) {
    if (this._wireDoorOff && this._wireDoorOff()) return null;
    const method = request.method || 'GET';
    let body;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      let text = '';
      try { text = await request.clone().text(); } catch (e) { text = ''; }
      if (text) { try { body = JSON.parse(text); } catch (e) { body = undefined; } }
    }
    const row = wireDoorRouteRow(url.pathname, method);
    const why = wireDoorRouteJudge(row, url.searchParams, body);
    if (!why) return null;
    this._wireDoorCount(row || ('http:' + url.pathname), why);
    return new Response(JSON.stringify({ ok: false, error: 'bad request' }), {
      status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  },
};
