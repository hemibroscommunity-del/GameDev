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
 * v2.3.5720 (card K2 PR 1; the second red team's CRITICAL 1): A BODY'S SIZE,
 * BEFORE ANYTHING READS IT.  The routes' door read a whole body
 * (`request.clone().text()`) and parsed it before any route asked who
 * sends: a 24 MB POST with no key held the room's thread 2.8 to 4.5 s and
 * several hundred MB.  Now a body is at most BODY_CAP.BYTES (32 KB; a
 * route's own in BODY_CAP.ROUTES): the outer router (index.js `routeHttp`,
 * `bodyCapRoute` below) refuses a longer declared length with a 413 before
 * any forward and reads a body with no length through the cap, and this
 * door reads through the same cap (`readBodyCapped`, exported for the
 * Feedback object's own reads).  Every honest body is a few hundred bytes
 * (the largest a crash report, BODY_CAP.ROUTES).  THE SWITCHES:
 * `bodycap: false` in the live flags and this door reads as before; the
 * outer router has no live flags (they are the room's storage), so its
 * lever is the worker's setting `BODY_CAP = "off"` (as `ORIGIN_LOCK`).
 *
 * v2.3.6443 (card DG PR 4; the review's shape-doors: 44 of 47 plants green,
 * `n: "5"`, `-5`, `true`, a 15,000-character id all LET IN): A FIELD HELD TO
 * ITS FORM.  Past the checks above, a named field must also have its form:
 *
 *   by its row (the wire table's `form` column, in.js): `count` a whole
 *           number of zero or more, `int` a whole number, `num` a finite
 *           number, `yes` true or false, `id` WIRE_FORM.ID_RE's shape and
 *           length, `str:<n>` words of at most n, `num|str:<n>` either, and
 *           a list (`['gold', 'item']`) one of a closed list;
 *   by its trust, where the row says no more: a `request` field's string
 *           at most WIRE_FORM.STR_MAX characters (a `words` field keeps its
 *           own bound, above; `claim`, `look` and `bounded` are their
 *           handlers' to clamp).
 *
 * `null` passes, as above.  The form is judged only once every field has
 * passed the checks above, so a frame the old door refused is refused for
 * the same why (`form <field>` is never a cover for `number <field>`).
 *
 * THE SWITCH (`wireform` in the live flags; liveops.js _wireFormMode): absent
 * or true, a frame out of form is refused like any other (`form`, counted
 * and logged the same, and in `_wireFormSeen` by row and field); `'count'`,
 * it is counted and logged and goes on to its handler (the measure before
 * the refusal: the card's "first as a count"); `false`, no form is read: the
 * door of v2.3.5184, byte for byte.  The routes' door holds no forms yet (a
 * query's value is always a string): their rows are http.js's.
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

/* v2.3.6443: THE FORMS (header).  Measured over the whole server suite,
   the storm included, in count mode (`wireform: 'count'`): the honest
   values the suites and the page send, against these bounds. */
export const WIRE_FORM = Object.freeze({
  /* a string in a `request` field whose row gives it no form: half a
     frame (MAX_INBOUND_BYTES 16 KB).  Above every honest string the suites
     send, the longest a Turnstile token (verify.js VERIFY.TOKEN_MAX 2048)
     and heap-forget's 7 KB strike; a `claim`, `look` or `bounded` field
     has no default form (its handler clamps it, and a move must never be
     dropped for a look: movefields.test) */
  STR_MAX: 8192,
  /* an id: a player's `bp_`, an item's key, a weapon's `gid`, a listing, a
     request's opId; letters, digits and `_ - . :` (SHAPES part 2's reqId
     and more), at most 96 */
  ID_RE: /^[A-Za-z0-9_.:-]{1,96}$/,
  /* the forms a row may name (wire-door.test §8 holds every row to them) */
  NAMED: Object.freeze(['count', 'int', 'num', 'yes', 'id']),
  STR_RE: /^str:([1-9][0-9]{0,4})$/,
  NUM_OR_STR_RE: /^num\|str:([1-9][0-9]{0,4})$/,
});

/* ═══ v2.3.5720: A BODY'S SIZE (card K2 PR 1; header) ═══
 * Measured 2026-11-17 over every route a page, the Test panel or a phone
 * scenario posts (the server suites' 221 bodies through this door, and the
 * page's own senders read by hand): the largest is a market order (191
 * bytes in the suites), a store listing (150), a login (59 + the key), a
 * feedback post (its text at most 500 characters: about 1.6 KB in UTF-8)
 * and the Test panel's dev levers (about 120).  One is larger: a crash
 * report (src/debug/crashTrap.js), sixteen log lines of at most 500
 * characters each, about 10 KB in ASCII and some 49 KB at the very worst
 * (every character JSON-escaped), so its route has its own cap. */
export const BODY_CAP = Object.freeze({
  BYTES: 32 * 1024,
  /* a route whose honest body can pass BYTES: its own cap, by path */
  ROUTES: Object.freeze({ '/api/feedback/crash': 64 * 1024 }),
  /* the answer to a body past its cap */
  STATUS: 413,
  /* refusals the outer router logs in an isolate's life */
  LOG_FIRST: 20,
});

/** The cap for a route's body, in bytes. */
export function bodyCapFor(pathname) {
  return own(BODY_CAP.ROUTES, pathname) ? BODY_CAP.ROUTES[pathname] : BODY_CAP.BYTES;
}

/** Can a request of this method carry a body we read?  GET, HEAD and
 *  OPTIONS: no (the runtime reads none for them). */
export const bodyMethod = (method) => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

/** The length a request declares: a number of bytes, -1 when it names none,
 *  NaN when what it names is not a length. */
export function bodyDeclared(request) {
  const h = request.headers.get('content-length');
  if (h === null) return -1;
  return /^\s*\d{1,15}\s*$/.test(h) ? Number(h) : NaN;
}

/** A request's body read through a cap: `{ ok: true, bytes, data }` (a
 *  Uint8Array, and `text` when asked) or `{ ok: false, bytes }` once more
 *  than `cap` bytes have come, the rest never read (the stream is
 *  cancelled).  Memory: at most `cap` and one chunk.  A body that fails to
 *  read is an empty one (the door's way before).  For the Feedback object
 *  too (card SEC: feedback.js). */
export async function readBodyCapped(request, cap = BODY_CAP.BYTES, { text = true } = {}) {
  const empty = () => ({ ok: true, bytes: 0, data: new Uint8Array(0), text: text ? '' : undefined });
  if (!request || !request.body) return empty();
  let reader;
  try { reader = request.body.getReader(); } catch (e) { return empty(); }
  const parts = [];
  let n = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      n += chunk.byteLength;
      if (n > cap) {
        /* not awaited: a clone's branch (`request.clone()`, a tee) settles
           its cancel only once its twin is cancelled too, so an await here
           never ends (found by bodycap.test §3) */
        try { reader.cancel().catch(() => {}); } catch (e) { /* the refusal stands */ }
        return { ok: false, bytes: n };
      }
      parts.push(chunk);
    }
  } catch (e) {
    return empty();
  }
  const data = parts.length === 1 ? parts[0] : new Uint8Array(n);
  if (parts.length !== 1) { let at = 0; for (const p of parts) { data.set(p, at); at += p.byteLength; } }
  return { ok: true, bytes: n, data, text: text ? new TextDecoder().decode(data) : undefined };
}

/* the 413, CORS like every route's answer */
const tooLarge = () => new Response(JSON.stringify({ ok: false, error: 'too large' }), {
  status: BODY_CAP.STATUS, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
});

let _bodyCapLogged = 0;
function bodyCapLog(pathname, why) {
  if (++_bodyCapLogged > BODY_CAP.LOG_FIRST) return;
  try { console.warn('[bodycap] refused ' + String(pathname).slice(0, 64) + ': ' + why); } catch (e) { /* the refusal stands */ }
}

/** The outer router's check (index.js `routeHttp`), before any forward:
 *  `{ refused }` (a 413) or `{ request }` to go on with.  A declared length
 *  past the route's cap is refused unread; a body with no length is read
 *  through the cap here and goes on as the bytes read.  `env.BODY_CAP =
 *  "off"` checks nothing. */
export async function bodyCapRoute(request, pathname, env) {
  if (!bodyMethod(request.method || 'GET')) return { request };
  if (String((env && env.BODY_CAP) || 'on').trim().toLowerCase() === 'off') return { request };
  const cap = bodyCapFor(pathname);
  const said = bodyDeclared(request);
  if (Number.isNaN(said) || said > cap) { bodyCapLog(pathname, 'length ' + said); return { refused: tooLarge() }; }
  if (said >= 0 || !request.body) return { request };
  const r = await readBodyCapped(request, cap, { text: false });
  if (!r.ok) { bodyCapLog(pathname, 'read past ' + cap); return { refused: tooLarge() }; }
  return { request: new Request(request, { body: r.data }) };
}

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

/* v2.3.6443: a field's value against its form (WIRE_FORM; header): ''
   when it passes.  `form` is the row's (`count`, a list, ...) or undefined,
   when the trust's own default holds it (a `request` string of at most
   STR_MAX). */
export function formWhy(form, trust, v) {
  if (v === undefined || v === null) return '';
  if (form === undefined) {
    return trust === 'request' && typeof v === 'string' && v.length > WIRE_FORM.STR_MAX ? 'form' : '';
  }
  if (Array.isArray(form)) return form.includes(v) ? '' : 'form';
  switch (form) {
    case 'count': return Number.isSafeInteger(v) && v >= 0 ? '' : 'form';
    case 'int': return Number.isSafeInteger(v) ? '' : 'form';
    case 'num': return typeof v === 'number' && Number.isFinite(v) ? '' : 'form';
    case 'yes': return typeof v === 'boolean' ? '' : 'form';
    case 'id': return typeof v === 'string' && WIRE_FORM.ID_RE.test(v) ? '' : 'form';
    default: break;
  }
  const s = WIRE_FORM.STR_RE.exec(form);
  if (s) return typeof v === 'string' && v.length <= Number(s[1]) ? '' : 'form';
  const ns = WIRE_FORM.NUM_OR_STR_RE.exec(form);
  if (ns) return (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= Number(ns[1])) ? '' : 'form';
  /* a form no rule reads refuses (wire-door.test §8 fails the row first) */
  return 'form';
}

/* a row's `form` is a form formWhy reads (the table's guard, wire-door §8) */
export function formKnown(form) {
  if (Array.isArray(form)) return form.length > 0 && form.every((x) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)));
  return typeof form === 'string' && (WIRE_FORM.NAMED.includes(form) || WIRE_FORM.STR_RE.test(form) || WIRE_FORM.NUM_OR_STR_RE.test(form));
}

/* ── the judges: pure, so a suite reads them alone ── */

/* A socket message (a frame, or one part of a bundle): '' to let it in, or
   `<why>` / `<why> <field>`.  `rows` is a Map type -> [[path, trust,
   form]].  v2.3.6443: `forms: false` reads no form (the switch thrown:
   the door of v2.3.5184); a form is read only once every field has passed
   the checks before it. */
export function wireDoorJudge(msg, rows = WIRE_DOOR_ROWS.SOCKET, { forms = true } = {}) {
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
  if (!forms) return '';
  for (const [path, trust, form] of fields) {
    for (const root of roots) {
      for (const v of valuesAt(root, path)) {
        if (formWhy(form, trust, v)) return 'form ' + path;
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

/* ═══ v2.3.5726 (card K2 PR 7; the planning session's addendum, 2026-11-17):
   THE OWNER'S ROUTES REFUSED AT THE EDGE WHEN THEY CARRY NO KEY ═══
   `/api/admin*` and `/api/botstat*` woke the room for every request, a key
   or none, and the room refused one with no key (admin.js _adminAuth,
   botfp.js _botfpAdminFetch).  The outer router now gives that same answer
   itself, before any object is asked:
     - /api/admin* with no `Authorization: Bearer <something>`: 404 `Not
       found` when the worker has no ADMIN_KEY (the surface does not exist),
       else 401 `Unauthorized` -- the room's own two answers, byte for byte;
     - /api/botstat* with neither `Authorization: Bearer` nor `x-admin-key`:
       the room's plain `Not found` 404.
   A request WITH a header goes to the room as before, which checks the key
   and counts a wrong one toward its time-out.  `EDGE_GUARD = "off"` (the
   worker's setting, as ORIGIN_LOCK; absent means on) sends every one on. */
export const EDGE_GUARD = Object.freeze({
  ADMIN: '/api/admin',
  BOTSTAT: '/api/botstat',
});

const bearerOf = (request) => {
  const a = request.headers.get('Authorization') || '';
  return a.startsWith('Bearer ') && a.length > 7;
};

/** The outer router's answer for an owner's route that carries no key, or
 *  null to go on (index.js `routeHttp`). */
export function edgeKeyRefusal(request, pathname, env) {
  if (String((env && env.EDGE_GUARD) || 'on').trim().toLowerCase() === 'off') return null;
  if (request.method === 'OPTIONS') return null;
  /* the router's own tests (startsWith), so exactly what it would forward */
  if (pathname.startsWith(EDGE_GUARD.ADMIN)) {
    if (bearerOf(request)) return null;
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (!(env && env.ADMIN_KEY)) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: H });
  }
  if (pathname.startsWith(EDGE_GUARD.BOTSTAT)) {
    if (bearerOf(request) || request.headers.get('x-admin-key')) return null;
    return new Response('Not found', { status: 404 });
  }
  return null;
}

/* ═══ v2.3.5726 (card K2 PR 7): THE PUBLIC READS ANSWERED AT THE EDGE, FOR
   EVERYONE BUT THE GAME'S OWN PAGES ═══
   Four reads anyone may make (the market's book and a player's list by its
   id, the store's browse, the arena's status) woke the outer worker's room
   every time; the room keeps them 3 s and paces them by address
   (publicreads.js), but each still reached it.  Now the outer router answers
   them from the edge's cache (`caches.default`, EDGE_CACHE.TTL_S, keyed by
   the whole URL) -- but ONLY for a request whose Origin is not one of the
   game's sites (origin.js originAllowed: 'site' or 'local').  The planning
   session's answer, 2026-11-17: the page always sends its Origin, so it
   always reads through the room, whose copies drop on any write ("the
   player who just acted reads their own act at once"), and nothing a player
   sees changes; a script that names the game's Origin meets the room's own
   keep and pace, as today.  A request carrying a key (`Authorization`,
   `x-bt-auth`) is never answered from the cache, and only a 200 is kept.
   Nothing in wrangler.toml: the cache needs no binding (and where there is
   none, as in node, every read goes on).  `EDGE_CACHE = "off"` (the
   worker's setting, as ORIGIN_LOCK; absent means on): every read goes on. */
export const EDGE_CACHE = Object.freeze({
  TTL_S: 3,
  PATHS: Object.freeze(['/api/market/orders', '/api/market/my', '/api/store/browse', '/api/arena/status']),
});

/** The outer router's read through the edge cache: `forward()` is the
 *  room's answer; `gameOrigin(origin)` says whether a page of the game sent
 *  it. */
export async function edgeCacheRead(request, url, env, gameOrigin, forward) {
  const off = String((env && env.EDGE_CACHE) || 'on').trim().toLowerCase() === 'off';
  const cache = (typeof caches !== 'undefined' && caches && caches.default) || null;
  if (off || !cache || request.method !== 'GET' || !EDGE_CACHE.PATHS.includes(url.pathname)
      || request.headers.get('Authorization') || request.headers.get('x-bt-auth')
      || gameOrigin(request.headers.get('Origin'))) return forward();
  const key = new Request(url.toString(), { method: 'GET' });
  let hit = null;
  try { hit = await cache.match(key); } catch (e) { hit = null; }
  if (hit) return hit;
  const res = await forward();
  if (!res || res.status !== 200) return res;
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=' + EDGE_CACHE.TTL_S);
  try { await cache.put(key, out.clone()); } catch (e) { /* not kept: the answer stands */ }
  return out;
}

/* ── the room's methods (index.js mixes them in) ── */
export const wireDoorMethods = {
  /* count and (the first few) log a refusal.  v2.3.5184 (the gatekeeper,
     sitting 15): the count is keyed by the table's row (`row`), never by
     what the client named: a type or a path no row names counts as `(no
     row)`, so the keys are at most the table's rows times the five whys
     (before, 432,000 frames of random types in an hour grew it by 59 MB of
     the room's 128).  The log names what came, the first LOG_FIRST only. */
  _wireDoorCount(row, why, came) {
    if (!this._wireDoorCounts) this._wireDoorCounts = Object.create(null);
    const key = row + ' ' + why.split(' ')[0];
    this._wireDoorCounts[key] = (this._wireDoorCounts[key] || 0) + 1;
    this._wireDoorRefused = (this._wireDoorRefused || 0) + 1;
    if (this._wireDoorRefused <= WIRE_DOOR.LOG_FIRST) {
      try { console.warn('[wiredoor] refused ' + String(came === undefined ? row : came).slice(0, 64) + ': ' + why); } catch (e) { /* the count stands */ }
    }
  },

  /* The router's door: true when the message was refused here and must go no
     further.  Synchronous, so a bundle's parts still finish in order (TRAPS
     §182). */
  _wireDoor(session, msg, ws) {
    if (this._wireDoorOff && this._wireDoorOff()) return false;
    /* v2.3.6443: the forms by the switch (header): 'on', 'count' or 'off' */
    const mode = this._wireFormMode ? this._wireFormMode() : 'on';
    let why = wireDoorJudge(msg, WIRE_DOOR_ROWS.SOCKET, { forms: mode !== 'off' });
    const type = msg && typeof msg.type === 'string' ? msg.type : '';
    if (why && why.startsWith('form ')) {
      this._wireFormNote(type, why.slice(5), mode);
      if (mode === 'count') why = '';
    }
    /* v2.3.5195 (card K PR 10): past the checks, a repeat of a request id the
       player sent before reaches no handler (reqonce.js _reqOnceDoor) */
    if (!why) return !!(this._reqOnceDoor && this._reqOnceDoor(session, msg, ws));
    if (session) session.wireDoor = (session.wireDoor || 0) + 1;
    this._wireDoorCount(type && WIRE_DOOR_ROWS.SOCKET.has(type) ? type : '(no row)', why, type || '(no type)');
    return true;
  },

  /* v2.3.6443: a frame out of form, by its row and field (only a row's own
     type and a path its row names reach here, so the keys are at most the
     table's named fields).  Counted in both modes; in count mode it is also
     logged here (a refusal is logged by _wireDoorCount), the first
     WIRE_DOOR.LOG_FIRST of a worker's life. */
  _wireFormNote(type, path, mode) {
    if (!this._wireFormSeen) this._wireFormSeen = Object.create(null);
    const key = type + ' ' + path;
    this._wireFormSeen[key] = (this._wireFormSeen[key] || 0) + 1;
    if (mode !== 'count') return;
    this._wireFormCounted = (this._wireFormCounted || 0) + 1;
    if (this._wireFormCounted <= WIRE_DOOR.LOG_FIRST) {
      try { console.warn('[wireform] would refuse ' + key.slice(0, 96)); } catch (e) { /* the count stands */ }
    }
  },

  /* v2.3.6443: what the door counted, for the owner's overview (admin.js
     GET /api/admin/overview `wireDoor`): memory only, since the worker woke
     (as floodTally).  `forms` is every field out of its form, refused or
     (in count mode) let in; `mode` the forms' switch now. */
  _wireDoorInfo() {
    const copy = (o) => (o ? Object.assign(Object.create(null), o) : {});
    return {
      off: !!(this._wireDoorOff && this._wireDoorOff()),
      mode: this._wireFormMode ? this._wireFormMode() : 'on',
      refused: this._wireDoorRefused || 0,
      counts: copy(this._wireDoorCounts),
      forms: copy(this._wireFormSeen),
    };
  },

  /* v2.3.5720: `bodycap: false` in the live flags and the routes' door
     reads a body whole again (on unless its own falsy value) */
  _bodyCapOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'bodycap') && !f.bodycap);
  },

  /* The routes' door: a 400 (or a 413) to answer with, or null to go on.
     The body is read from a clone, so the route reads its own as before.
     v2.3.5720: a body past its cap (BODY_CAP) is a 413, refused unread when
     its length says so, else as soon as the cap is passed; before the
     door's own switch, so `wiredoor: false` keeps the cap. */
  async _wireDoorHttp(request, url) {
    const method = request.method || 'GET';
    const carries = bodyMethod(method);
    const capOn = carries && !this._bodyCapOff();
    const cap = bodyCapFor(url.pathname);
    const refuseSize = () => {
      this._wireDoorCount(wireDoorRouteRow(url.pathname, method) || 'http:(no row)', 'size', 'http:' + url.pathname);
      return tooLarge();
    };
    if (capOn) {
      const said = bodyDeclared(request);
      if (Number.isNaN(said) || said > cap) return refuseSize();
    }
    if (this._wireDoorOff && this._wireDoorOff()) return null;
    let body;
    if (carries) {
      let text = '';
      if (capOn) {
        const r = await readBodyCapped(request.clone(), cap);
        if (!r.ok) return refuseSize();
        text = r.text;
      } else {
        try { text = await request.clone().text(); } catch (e) { text = ''; }
      }
      if (text) { try { body = JSON.parse(text); } catch (e) { body = undefined; } }
    }
    const row = wireDoorRouteRow(url.pathname, method);
    const why = wireDoorRouteJudge(row, url.searchParams, body);
    if (!why) return null;
    this._wireDoorCount(row || 'http:(no row)', why, 'http:' + url.pathname);
    return new Response(JSON.stringify({ ok: false, error: 'bad request' }), {
      status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  },
};
