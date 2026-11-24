/* wire-gaps.test.mjs -- v2.3.6445 (card DG PR 6, "the gaps beside the doors";
 * docs/plan/census/shape-doors.md part 9, shape-review.md part 3 item 9).
 *
 * The wire table (server/src/wire/) makes the router's two lists and the
 * routes' rows, and the doors judge what comes in by them.  The shape review
 * planted the ways a tired hand opens a door BESIDE the table, and none went
 * red.  This suite reads the syntax tree and runs the room:
 *
 *   1. THE RELAY IS THE MADE LIST.  In a running room, `_relayAllowed` says
 *      yes to a relay row of the table and to nothing else: every word of the
 *      form of a type anywhere in server/src (its syntax tree's strings) is
 *      asked, and every privileged type (plants4/5 RELAY-1: two types allowed
 *      by hand; a type added to the made Set after it was made).  And a
 *      joined phone sending each such word, as a message, puts nothing in the
 *      room's events (the router's relay end, run).
 *   2. THE ROUTER'S DEFAULT CASE opens with its two gates, the privileged
 *      deny-list then the relay list, and the phone's own message is handed
 *      to no call but the listed readers before the relay rebuilds it in the
 *      sender's name (plants5 PRIV-1: a privileged type let through by hand,
 *      the phone's message sent on as it came).  2b: anywhere in the router,
 *      the phone's message as it came is handed only to the doors, its
 *      case's handler and the relay's steps (TAKERS, a census only falling).
 *   3. THE ROUTES' DOOR COMES FIRST.  In GameRoom.fetch nothing before the
 *      wire door answers a request or reads its body, but the two internal
 *      probes listed (plants4 ROUTE-0, ROUTE-1: a route before the door,
 *      its path in a destructured name); and every path index.js compares,
 *      by any name (a destructured `pathname`, a renamed one), has a route
 *      row (wire-table §6 reads the text `path ===` / `url.pathname ===`).
 *
 * v2.3.6446 (card DG, sitting 59's mend): ALLOW LISTS IN THE TREE.  Sitting
 * 59's review stayed green with a relay let in by a regular expression or
 * `endsWith` (relay.js), a `{ ...msg }` broadcast, and routes by
 * `pathname.slice(1)` and `searchParams.has('tip')`.  Each part below names
 * the forms the guarded thing may take; every other form is red unless a row
 * of a counted list (it only falls), and a form the guard cannot follow is red.
 *   2c. THE PHONE'S OBJECT NEVER GOES OUT: in the router, `msg`, a field of
 *      it, `msg.payload || msg`, or a name for one is never spread, given to
 *      Object.assign, made a literal's part, put on another object, returned,
 *      or handed to a SENDER (the send door's own, and every function of
 *      server/src that hands a parameter whole to one, computed); a call it
 *      cannot follow is red (CARRIER_LISTED, CARRIER_READERS).
 *   4. THE RELAY'S DECISION: `_relayAllowed` defined once, in relay.js, its
 *      body the listed statements (the made list, the kill switch); every
 *      other read of a type in relay.js a counted row (RELAY_TYPE_READS).
 *   5. THE ROUTER'S URL: made only as `const url = new URL(request.url)` in
 *      the two fetches; each read a strict compare with a literal path, a
 *      mount's startsWith, the routes' door, or a counted row (URL_HANDED).
 * BREAK PROOF (sitting 59's plants, plants-gaps.json, all red): a regex and
 * an `endsWith` relay (4a), `String(type).toLowerCase()` (4a), a
 * `startsWith` in _relayBuild (4b), `broadcastExcept(ws, { ...msg })` and
 * `broadcastAll(msg.payload || msg)` (2c), `pathname.slice(1)` and
 * `searchParams.has('tip')` routes (5).
 *
 * Read only: nothing here changes the room's code or the table.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { visit, parse, fnName } from '../../tools/guards/lib/writesOf.mjs';
import { WIRE_RELAY } from '../src/wire/relays.js';
import { WIRE_HTTP } from '../src/wire/http.js';
import { PRIVILEGED_EVENTS } from '../src/wire/lists.js';
import { makeStorage, openRoom, join, fakeWs, settle } from './testroom.mjs';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failures++; console.log('  FAIL ' + name + (detail !== undefined ? '\n       ' + JSON.stringify(detail).slice(0, 1200) : '')); }
}

const raw = Object.create(null);
for (const f of srcFiles()) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
const INDEX = raw['index.js'];

/* the method `name` of class `cls` in `code`: its babel path, or null */
function methodOf(code, cls, name) {
  let hit = null;
  visit(code, { ClassMethod(path) {
    const k = path.node.key;
    if (hit || path.node.computed || !k || (k.name || k.value) !== name) return;
    const c = path.parentPath && path.parentPath.parentPath;
    if (c && c.node.id && c.node.id.name === cls) hit = path;
  } });
  return hit;
}
/* `a.b.c` of a member chain, or null */
function chain(n) {
  const parts = [];
  for (; n; n = n.object) {
    if (n.type === 'Identifier') { parts.unshift(n.name); return parts.join('.'); }
    if (n.type === 'ThisExpression') { parts.unshift('this'); return parts.join('.'); }
    if ((n.type !== 'MemberExpression' && n.type !== 'OptionalMemberExpression') || n.computed) return null;
    parts.unshift(n.property.name);
  }
  return null;
}
const lineOf = (code, node) => code.slice(0, node.start).split('\n').length;

/* ── 1. the relay is the made list ── */
const RELAY_ROWS = new Set(WIRE_RELAY.map((r) => r.name));
const TYPE_FORM = /^[a-z][a-z0-9_]{2,47}$/;
const words = new Set();
for (const f of Object.keys(raw)) {
  visit(raw[f], {
    StringLiteral(path) { if (TYPE_FORM.test(path.node.value)) words.add(path.node.value); },
    TemplateLiteral(path) { if (path.node.expressions.length === 0) { const v = path.node.quasis[0].value.cooked; if (TYPE_FORM.test(v)) words.add(v); } },
  });
}
check('1: the word list is read off the syntax tree (guard)', words.size > 1000 && words.has('emote') && words.has('player_state'), words.size);
{
  const room = await openRoom(makeStorage());
  const yes = [...words, ...PRIVILEGED_EVENTS].filter((t) => !RELAY_ROWS.has(t) && room._relayAllowed(t));
  check('1: _relayAllowed says yes to a relay row of the table and nothing else (every word of server/src, every privileged type)', yes.length === 0, yes);
  const rowsNo = [...RELAY_ROWS].filter((t) => !room._relayAllowed(t));
  check('1: ...and yes to every relay row (guard)', rowsNo.length === 0, rowsNo);
  const priv = [...PRIVILEGED_EVENTS].filter((t) => room._relayAllowed(t));
  check('1: no privileged type is a relay', priv.length === 0, priv);
}

/* the router's switch and its default case, off the syntax tree */
const onMsg = methodOf(INDEX, 'GameRoom', '_onMessage');
let routerSwitch = null;
if (onMsg) onMsg.traverse({ SwitchStatement(path) {
  if (routerSwitch) return;
  if (chain(path.node.discriminant) === 'msg.type') routerSwitch = path.node;
} });
const caseNames = new Set();
let dflt = null;
if (routerSwitch) for (const c of routerSwitch.cases) {
  if (!c.test) dflt = c;
  else if (c.test.type === 'StringLiteral') caseNames.add(c.test.value);
}
check('2: the router\'s switch and its default case are found (guard)', !!dflt && caseNames.size > 100, caseNames.size);

{
  /* the relay's end, run: a joined phone sends every word that is no case of
     the router and no relay row; the room's events take none of them */
  const room = await openRoom(makeStorage());
  const a = await join(room, fakeWs('a'), 'bp_gapsaaaaaaaaaa1');
  const b = await join(room, fakeWs('b'), 'bp_gapsbbbbbbbbbb2');
  const sa = room.sessions.get(a);
  const sent = [...words].filter((t) => !caseNames.has(t) && !RELAY_ROWS.has(t));
  const through = [];
  /* each word with a full relay allowance (relay.test's way): a word let
     through is never hidden by a spent budget */
  const fresh = () => { sa.msgTokens = undefined; sa.relayTokens = room.RELAY_BURST; sa.relayAt = Date.now(); sa.chatGuard = null; };
  /* each word is seen to reach the default case's relay gate (the room's own
     `_relayAllowed`, counted on this room alone): a word dropped before it,
     by the socket's flood budget or a door, proves nothing */
  const asked = new Set();
  const own = room._relayAllowed;
  room._relayAllowed = function (type) { asked.add(type); return own.call(this, type); };
  for (const t of sent) {
    fresh();
    const before = room.eventBuffer.length, heard = b.sent.length;
    try { await room._onMessage(a, sa, { type: t, payload: {} }); } catch (e) { /* a word's handler that throws relays nothing */ }
    /* in the room's events (the tick's relay), or sent to the other phone at once */
    if (room.eventBuffer.length !== before || b.sent.length !== heard) { through.push(t); room.eventBuffer.length = before; b.sent.length = heard; }
  }
  room._relayAllowed = own;
  check(`1: no word that is neither a case nor a relay row reaches the room's events or the other phone (${sent.length} sent)`, through.length === 0, through);
  const unasked = sent.filter((t) => !asked.has(t) && !PRIVILEGED_EVENTS.has(t));
  check('1: ...each word but a privileged one (the deny-list, first) reached the relay gate (none dropped before it: the run proves something)', unasked.length === 0, unasked);
  /* the control, AFTER the sends: a relay row does reach them (a word that
     had put the phone out of the room would fail here) */
  fresh();
  const before = room.eventBuffer.length;
  await room._onMessage(a, sa, { type: 'player_jump', payload: {} });
  check('1: ...and a relay row does (the control, after them)', room.eventBuffer.length === before + 1, room.eventBuffer.length - before);
  await settle();
}

/* ── 2. the default case's gates come first ── */
if (dflt) {
  const body = dflt.consequent;
  const gate = (s, test) => s && s.type === 'IfStatement' && s.consequent.type === 'BreakStatement' && !s.alternate && test(s.test);
  const callOf = (e, name) => e && e.type === 'CallExpression' && chain(e.callee) === name && e.arguments.length === 1 && chain(e.arguments[0]) === 'msg.type';
  check('2: the default case opens with the privileged deny-list (`if (PRIVILEGED_EVENTS.has(msg.type)) break;`)',
    gate(body[0], (t) => callOf(t, 'PRIVILEGED_EVENTS.has')), body[0] && 'index.js:' + lineOf(INDEX, body[0]));
  check('2: ...then the relay list (`if (!this._relayAllowed(msg.type)) break;`)',
    gate(body[1], (t) => t.type === 'UnaryExpression' && t.operator === '!' && callOf(t.argument, 'this._relayAllowed')), body[1] && 'index.js:' + lineOf(INDEX, body[1]));
  /* before the relay is rebuilt in the sender's name (`msg = this._relayBuild(session, msg)`),
     the phone's message, or its payload, is handed only to these readers */
  const READERS = {
    'this._dgShot': 'a shot stamped on the worker\'s clock (drawgather.js), its payload read',
    'this._pfBowShot': 'the bow\'s shot seen (its payload read)',
    'this._bowShotSeen': 'the bow\'s shot seen (its payload read)',
    'this._relayBuild': 'THE REBUILD: a new message in the sender\'s name (relay.js)',
  };
  const handed = [];
  let built = false;
  const holds = (n) => n && (n.type === 'Identifier' ? n.name === 'msg' : chain(n) === 'msg.payload');
  for (const s of body) {
    if (built) break;
    const look = (node) => {
      if (!node || typeof node !== 'object' || built) return;
      if (Array.isArray(node)) { for (const x of node) look(x); return; }
      if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && node.left.name === 'msg'
        && node.right.type === 'CallExpression' && chain(node.right.callee) === 'this._relayBuild') { built = true; return; }
      if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression' || node.type === 'NewExpression') && node.arguments.some(holds)) {
        const who = chain(node.callee) || '(a call by another name)';
        if (!Object.prototype.hasOwnProperty.call(READERS, who)) handed.push(who + ' at index.js:' + lineOf(INDEX, node));
      }
      /* the message given a second name before the rebuild is the message */
      if (node.type === 'VariableDeclarator' && holds(node.init)) handed.push('a second name for it at index.js:' + lineOf(INDEX, node));
      if (node.type === 'AssignmentExpression' && holds(node.right)) handed.push('a second name for it at index.js:' + lineOf(INDEX, node));
      for (const k of Object.keys(node)) if (k !== 'loc' && k !== 'start' && k !== 'end' && node[k] && typeof node[k] === 'object') look(node[k]);
    };
    look(s);
  }
  check('2: before the rebuild, the phone\'s message is handed to no call but the listed readers', built && handed.length === 0, { built, handed });
}

/* ── 2b. who is handed the phone's message as it came ──
   In the whole of `_onMessage`, every call given `msg` itself (not a field
   of it) is one of these: the doors, the handlers of their own cases, the
   relay's steps.  A privileged type let through by hand is the phone's
   message handed to a send (`this.broadcastExcept(ws, msg)`, plants5
   PRIV-1), wherever in the router it is written. */
if (onMsg) {
  const TAKERS = {
    'this._wireDoor': 'THE WIRE DOOR: judges it', 'this._silenceDoor': 'the owner\'s silence: judges it',
    'this._moveActivitySig': 'the AFK clock reads its kind', 'this._valuePauseGate': 'the pause of value: judges it',
    'this._fightLockGate': 'the fight lock: judges it',
    'this._handleJoin': 'its case', 'this._handlePose': 'its case', 'this._handleRide': 'its case', 'this._handleDice': 'its case',
    'this._handleItemDrop': 'its case', 'this._handleMove': 'its case', 'this._sigOnMove': 'the move\'s signal (its case)',
    'this._reportTake': 'its case (a report)', 'this._handleRiseChest': 'its case',
    'this._relayBuild': 'THE REBUILD: a new message in the sender\'s name',
    'this._sanitizeChatRelay': 'the relay\'s step (after the rebuild)', 'this._sanitizeEmoteRelay': 'the relay\'s step (after the rebuild)',
    'this._interceptTrade': 'the relay\'s step (after the rebuild)', 'this._interceptDuel': 'the relay\'s step (after the rebuild)',
    'this._observeClanInvite': 'the relay\'s step (after the rebuild)', 'this._interceptThreat': 'the relay\'s step (after the rebuild)',
    'this._sparSeen': 'the relay\'s step (after the rebuild)', 'this._relayBytesDrop': 'the relay\'s pace (after the rebuild)',
    'this.eventBuffer.push': 'THE RELAY, rebuilt in the sender\'s name (after the rebuild, in the default case)',
  };
  const AFTER_BUILD = new Set(Object.keys(TAKERS).filter((k) => /after the rebuild/.test(TAKERS[k])));
  const bad = [], seen = new Set();
  let buildAt = -1;
  onMsg.traverse({ AssignmentExpression(path) {
    const n = path.node;
    if (n.left.type === 'Identifier' && n.left.name === 'msg' && n.right.type === 'CallExpression' && chain(n.right.callee) === 'this._relayBuild') buildAt = n.start;
  } });
  const inDefault = (node) => dflt && node.start >= dflt.start && node.end <= dflt.end;
  onMsg.traverse({
    'CallExpression|OptionalCallExpression|NewExpression'(path) {
      const n = path.node;
      if (!n.arguments.some((a) => a.type === 'Identifier' && a.name === 'msg')) return;
      const who = chain(n.callee) || '(a call by another name)';
      const at = 'index.js:' + lineOf(INDEX, n);
      if (!Object.prototype.hasOwnProperty.call(TAKERS, who)) { bad.push(who + ' at ' + at); return; }
      if (AFTER_BUILD.has(who) && !(inDefault(n) && buildAt >= 0 && n.start > buildAt)) { bad.push(who + ' at ' + at + ' (before the rebuild)'); return; }
      seen.add(who);
    },
    VariableDeclarator(path) { const i = path.node.init; if (i && i.type === 'Identifier' && i.name === 'msg') bad.push('a second name for it at index.js:' + lineOf(INDEX, path.node)); },
  });
  check('2b: the phone\'s message, as it came, is handed only to the doors, its case\'s handler and the relay\'s steps (TAKERS), the relay\'s after its rebuild', bad.length === 0, bad);
  check('2b: ...every taker listed is still one (a stale row is deleted)', seen.size === Object.keys(TAKERS).length, Object.keys(TAKERS).filter((k) => !seen.has(k)));
}

/* ── 3. the routes' door comes first ── */
const fetchM = methodOf(INDEX, 'GameRoom', 'fetch');
check('3: GameRoom.fetch is found (guard)', !!fetchM);
/* the internal probes the outer worker asks before the door (no outside path is forwarded to them) */
const INTERNAL = { '/_room_count': 'the lobby\'s count probe', '/_room_health': 'the room\'s health for /health/room' };
/* every path a node compares: `x === '/..'`, `'/..' === x`, `!==`, `x.startsWith('/..')`, a switch case */
function pathsIn(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const x of node) pathsIn(x, out); return out; }
  const lit = (n) => n && n.type === 'StringLiteral' && n.value.startsWith('/') ? n.value : (n && n.type === 'TemplateLiteral' && !n.expressions.length && n.quasis[0].value.cooked.startsWith('/') ? n.quasis[0].value.cooked : null);
  if (node.type === 'BinaryExpression' && /^[!=]==?$/.test(node.operator)) { const p = lit(node.left) || lit(node.right); if (p) out.push({ p, node }); }
  if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression') && node.callee.type.endsWith('MemberExpression') && !node.callee.computed
    && ['startsWith', 'endsWith', 'includes', 'test', 'match'].includes(node.callee.property.name) && lit(node.arguments[0])) out.push({ p: lit(node.arguments[0]), node });
  if (node.type === 'SwitchCase' && lit(node.test)) out.push({ p: lit(node.test), node });
  for (const k of Object.keys(node)) if (k !== 'loc' && node[k] && typeof node[k] === 'object') pathsIn(node[k], out);
  return out;
}
const answers = (node) => {
  let hit = null;
  const look = (n) => {
    if (!n || typeof n !== 'object' || hit) return;
    if (Array.isArray(n)) { for (const x of n) look(x); return; }
    if (n.type === 'ReturnStatement') hit = 'a return';
    else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'Response') hit = 'a Response';
    else if (n.type === 'CallExpression' && n.callee.type.endsWith('MemberExpression') && !n.callee.computed
      && ['json', 'text', 'formData', 'arrayBuffer', 'blob'].includes(n.callee.property.name) && chain(n.callee.object) === 'request') hit = 'the body read';
    for (const k of Object.keys(n)) if (k !== 'loc' && n[k] && typeof n[k] === 'object') look(n[k]);
  };
  look(node);
  return hit;
};
if (fetchM) {
  const body = fetchM.node.body.body;
  const at = body.findIndex((s) => s.type === 'IfStatement' && s.test.type === 'CallExpression' && chain(s.test.callee) === 'url.pathname.startsWith'
    && s.test.arguments[0] && s.test.arguments[0].value === '/api/' && pathsIn(s.consequent).length === 0
    && JSON.stringify(s.consequent).includes('"_wireDoorHttp"'));
  check('3: the routes\' door is a statement of GameRoom.fetch (`if (url.pathname.startsWith(\'/api/\')) { ... this._wireDoorHttp ... }`)', at > 0, at);
  const early = [];
  for (const s of body.slice(0, Math.max(0, at))) {
    const ps = pathsIn(s).map((x) => x.p);
    const internal = s.type === 'IfStatement' && ps.length === 1 && Object.prototype.hasOwnProperty.call(INTERNAL, ps[0]) && !s.alternate;
    if (internal) continue;
    const why = ps.length ? 'tests ' + ps.join(', ') : answers(s);
    if (why) early.push('index.js:' + lineOf(INDEX, s) + ' ' + why);
  }
  check('3: nothing before the routes\' door tests a path, answers a request or reads its body, but the internal probes listed', early.length === 0, early);
  const seenInternal = new Set(body.slice(0, Math.max(0, at)).flatMap((s) => pathsIn(s).map((x) => x.p)));
  check('3: ...each internal probe listed is still before the door (a stale one is deleted)', Object.keys(INTERNAL).every((p) => seenInternal.has(p)), [...seenInternal]);
}
{
  /* every path index.js compares, by any name, has a route row (a row below it, for a mount) */
  const pathOf = (name) => name.slice(5).split(' ')[0].replace(/[?#].*$/, '');
  const rowPaths = new Set(WIRE_HTTP.map((r) => pathOf(r.name)));
  /* compared in index.js, and no route: by the line's function and why */
  const NOT_ROUTES = Object.create(null);
  const found = [];
  let ast = null;
  visit(INDEX, { Program(path) { ast = path.node; } });
  const all = pathsIn(ast);
  for (const { p, node } of all) {
    const full = p.replace(/\/$/, '') || '/';
    if (rowPaths.has(full) || [...rowPaths].some((q) => q.startsWith(full + '/')) || Object.prototype.hasOwnProperty.call(INTERNAL, full)) continue;
    if (NOT_ROUTES[full]) continue;
    found.push(full + ' (index.js:' + lineOf(INDEX, node) + ')');
  }
  check(`3: the path lister reads the syntax tree (guard: ${all.length} compares)`, all.length > 15 && all.some((x) => x.p === '/_room_count') && all.some((x) => x.p === '/api/'), all.length);
  check('3: every path index.js compares, by any name, has a route row', found.length === 0, found);
}

/* ════ v2.3.6446 (card DG, sitting 59's mend): ALLOW LISTS IN THE TREE ════
   Sitting 59's review walked beside each part above: a relay let in by a
   regular expression or `endsWith` in relay.js (part 1 asks only the words
   server/src spells), a `{ ...msg }` broadcast (part 2b follows `msg` as an
   argument only), routes by `pathname.slice(1)` and `searchParams.has('tip')`
   (part 3 reads only literal paths).  Each part below names the FORMS the
   guarded thing may take in the syntax tree; every other appearance is red
   unless it is a row of a counted list that only falls, and a form the
   guard cannot follow is red, never passed for being unknown. */
const SHAPE_SKIP = new Set(['start', 'end', 'loc', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'errors', 'tokens']);
const shapeOf = (n) => JSON.stringify(n, (k, v) => (SHAPE_SKIP.has(k) ? undefined : v));
/* a node's own source, its comments out and its spaces one: a row's key */
const norm = (code, n) => code.slice(n.start, n.end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim();
/* a counted list held to what was found: a row seen more is red, a row seen fewer is stale (the list only falls) */
function heldTo(list, got) {
  const over = [], stale = [];
  for (const [k, n] of got) { const row = list[k]; if (!row) over.push(k + ' (x' + n + ')'); else if (n > row[0]) over.push(k + ' (x' + n + ', listed ' + row[0] + ')'); }
  for (const k of Object.keys(list)) { const n = got.get(k) || 0; if (n < list[k][0]) stale.push(k + ' (seen ' + n + ', listed ' + list[k][0] + ')'); }
  return { over, stale };
}
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

/* ── 4. THE RELAY'S DECISION, in the tree (relay.js) ──
   4a. `_relayAllowed` is defined once, in relay.js, and its body is these
   statements and nothing else (their shapes in the tree): a type is let in
   by the made list (`RELAY.TYPES.has(type)`) or by the kill switch that lets
   every type in (`relaylist: false`).  Nowhere in server/src is the name
   given another body or reached by a string (`this['_relay' + ...]`).
   4b. Every other read of a type in relay.js -- a `.type` or `['type']` of
   anything, a destructure of `type`, a computed key on `msg`, `arguments` --
   is a row of RELAY_TYPE_READS by its function and its form (its parent
   node's source), counted: a regular expression, startsWith / endsWith, a
   `==`, a switch, a lookup in another object, a second name is red. */
const RELAY_ALLOWED_BODY = [
  ['if (RELAY.TYPES.has(type)) return true;', 'THE ADMISSION: a row of the wire table (RELAY.TYPES, made from its relay rows)'],
  ['const f = this._liveFlags;', 'the live flags, for the switch below'],
  ["return !!(f && typeof f === 'object' && own(f, 'relaylist') && !f.relaylist);", 'the kill switch `relaylist: false`: every type, as before the allowlist (liveops)'],
];
const RELAY_TYPE_READS = {
  '_relayBuild: Object.prototype.hasOwnProperty.call(RELAY_FORMS, msg.type)': [1, 'its row\'s field forms (RELAY_FORMS): which fields go out, never whether it goes'],
  '_relayBuild: RELAY_FORMS[msg.type]': [1, 'the same row\'s forms, read'],
  '_relayBuild: type: msg.type': [1, 'the type carried onto the rebuilt message (admitted at the gate before)'],
  '_relayBytesDrop: msg && msg.type': [1, 'the log line of a relay dropped for its bytes'],
};
{
  const RSRC = raw['relay.js'];
  const defs = [];
  for (const f of Object.keys(raw)) {
    visit(raw[f], {
      'ObjectMethod|ClassMethod|ObjectProperty|ClassProperty|ClassPrivateMethod'(path) {
        const k = path.node.key;
        if (k && !path.node.computed && (k.name || k.value) === '_relayAllowed') defs.push({ f, path, line: lineOf(raw[f], path.node) });
      },
      'MemberExpression|OptionalMemberExpression'(path) {
        const n = path.node;
        if (!n.computed && n.property.name === '_relayAllowed' && path.parentPath.isAssignmentExpression() && path.parentKey === 'left') defs.push({ f, line: lineOf(raw[f], n), what: 'given another body' });
      },
      StringLiteral(path) { if (path.node.value === '_relayAllowed' && !path.parentPath.isObjectProperty({ computed: false })) defs.push({ f, line: lineOf(raw[f], path.node), what: 'reached by a string' }); },
    });
  }
  const own1 = defs.length === 1 && defs[0].f === 'relay.js' && defs[0].path && defs[0].path.isObjectMethod() && !defs[0].path.node.async && !defs[0].path.node.generator;
  check('4a: `_relayAllowed` is defined once, in relay.js, and nowhere given another body or reached by a string', own1, defs.map((d) => d.f + ':' + d.line + (d.what ? ' ' + d.what : '')));
  if (own1) {
    const m = defs[0].path.node;
    const want = RELAY_ALLOWED_BODY.map(([s]) => shapeOf(parse('function _relayAllowed(type) {\n' + s + '\n}').program.body[0].body.body[0]));
    const got = m.body.body;
    const bad = [];
    if (m.params.length !== 1 || m.params[0].type !== 'Identifier' || m.params[0].name !== 'type') bad.push('its parameter is not the one `type`');
    if (got.length !== want.length) bad.push(got.length + ' statements, ' + want.length + ' listed');
    got.forEach((s, i) => { if (shapeOf(s) !== want[i]) bad.push('relay.js:' + lineOf(RSRC, s) + ' `' + norm(RSRC, s).slice(0, 120) + '` is no listed statement (RELAY_ALLOWED_BODY ' + (i + 1) + ')'); });
    check('4a: ...its body is the listed statements and nothing else: the made list, then the kill switch', bad.length === 0, bad);
  }
  const got = new Map(), odd = [];
  visit(RSRC, {
    'MemberExpression|OptionalMemberExpression'(path) {
      const n = path.node;
      const isType = (!n.computed && n.property.name === 'type') || (n.computed && n.property.type === 'StringLiteral' && n.property.value === 'type');
      if (isType) { bump(got, fnName(path) + ': ' + norm(RSRC, path.parent)); return; }
      if (n.computed && n.object.type === 'Identifier' && n.object.name === 'msg') odd.push('relay.js:' + lineOf(RSRC, n) + ' `' + norm(RSRC, n) + '` (a computed key on msg)');
    },
    ObjectPattern(path) {
      for (const p of path.node.properties) if (p.type === 'RestElement' || p.computed || (p.key && (p.key.name || p.key.value) === 'type')) odd.push('relay.js:' + lineOf(RSRC, p) + ' `' + norm(RSRC, path.node) + '` (a destructure: its type or its rest)');
    },
    Identifier(path) { if (path.node.name === 'arguments' && path.isReferencedIdentifier()) odd.push('relay.js:' + lineOf(RSRC, path.node) + ' `arguments`'); },
  });
  const { over, stale } = heldTo(RELAY_TYPE_READS, got);
  check('4b: every read of a type in relay.js but the admission is a listed form (RELAY_TYPE_READS, counted): no regular expression, startsWith/endsWith, ==, switch, lookup or second name', over.length === 0 && odd.length === 0, [...over, ...odd]);
  check('4b: ...every RELAY_TYPE_READS row is still there, at its count (a stale row is deleted, a count lowered)', stale.length === 0, stale);
  check('4b: the reader reads the tree (guard: the four rows found)', got.size >= 4, [...got.keys()]);
}

/* ── 5. THE ROUTER'S URL, in the tree (index.js) ──
   A request's URL is made once a fetch, `const url = new URL(request.url)`,
   and never read another way: `request.url` only there, no other `new URL`.
   Each read of that `url` is one of the FORMS: a strict comparison of
   `url.pathname` with a literal path (part 3 holds the path to its row), a
   mount's `url.pathname.startsWith('<literal path>')`, the routes' door's
   own call, or a row of URL_HANDED (the URL handed to a named helper,
   counted).  `searchParams`, `search`, `href`, a slice of the path, a loose
   or non-literal comparison, a destructure, a second name, a reassignment:
   red. */
const URL_FORMS_DOOR = 'this._wireDoorHttp(request, url)';
const URL_MADE_IN = { routeHttp: 'the outer worker\'s router (its default export\'s fetch hands it the request)', fetch: 'GameRoom.fetch, the room\'s routes' };
const URL_HANDED = {
  'bodyCapRoute(url.pathname)': [1, 'the outer worker\'s body cap by route (bodycap.js), before the room'],
  'roomNameFor(url)': [1, 'which room a request is for (its query\'s room name, judged there)'],
  'edgeCacheRead(url)': [3, 'the edge cache\'s key for a public read (edgecache.js): market, store, arena'],
  'edgeKeyRefusal(url.pathname)': [1, 'the edge key check by route (the leaderboard)'],
  'this._publicReadDo(url)': [4, 'the public reads kept and paced by address (publicreads.js)'],
  'this._seatGate(url)': [1, 'the room\'s seat gate (its query\'s place in line)'],
  'this._roomFullRefusal(url)': [2, 'the room-full refusal (join.js)'],
};
{
  let ast = null;
  visit(INDEX, { Program(path) { ast = path; } });
  const made = [], bad = [], handed = new Map();
  let reads = 0;
  ast.traverse({
    NewExpression(path) {
      if (path.node.callee.type !== 'Identifier' || !/^URL(SearchParams)?$/.test(path.node.callee.name)) return;
      const d = path.parentPath;
      const fnP = path.getFunctionParent();
      const ok = path.node.callee.name === 'URL' && d.isVariableDeclarator() && d.node.id.type === 'Identifier' && d.node.id.name === 'url'
        && d.parentPath.node.kind === 'const' && path.node.arguments.length === 1 && chain(path.node.arguments[0]) === 'request.url'
        && fnP && Object.prototype.hasOwnProperty.call(URL_MADE_IN, fnName(path)) && fnP.node.params[0] && fnP.node.params[0].name === 'request';
      if (!ok) { bad.push('index.js:' + lineOf(INDEX, path.node) + ' `' + norm(INDEX, path.node) + '` (the URL made another way)'); return; }
      made.push(d);
    },
    'MemberExpression|OptionalMemberExpression'(path) {
      const n = path.node;
      if ((!n.computed && n.property.name === 'url') || (n.computed && n.property.type === 'StringLiteral' && n.property.value === 'url')) {
        if (!(path.parentPath.isNewExpression() && made.some((d) => d.node.init === path.parent))) {
          /* the made URL is visited first (its declarator is entered before its argument): a read of `.url` elsewhere is red */
          const inMade = path.parentPath.isNewExpression() && path.parentPath.parentPath.isVariableDeclarator();
          if (!inMade) bad.push('index.js:' + lineOf(INDEX, n) + ' `' + norm(INDEX, path.parent) + '` (the request\'s URL read outside `new URL(request.url)`)');
        }
      }
    },
    ObjectPattern(path) {
      for (const p of path.node.properties) if (p.key && !p.computed && ['url', 'pathname', 'searchParams', 'search', 'href'].includes(p.key.name)) bad.push('index.js:' + lineOf(INDEX, p) + ' `' + norm(INDEX, path.node) + '` (a destructure of the URL)');
    },
  });
  const isPath = (n) => n && ((n.type === 'StringLiteral' && n.value.startsWith('/')) || (n.type === 'TemplateLiteral' && !n.expressions.length && n.quasis[0].value.cooked.startsWith('/')));
  for (const d of made) {
    const b = d.scope.getBinding('url');
    if (!b || b.path !== d) { bad.push('index.js:' + lineOf(INDEX, d.node) + ' the made URL\'s binding is not followed'); continue; }
    for (const v of b.constantViolations) bad.push('index.js:' + lineOf(INDEX, v.node) + ' `url` given another value');
    for (const r of b.referencePaths) {
      reads++;
      const at = 'index.js:' + lineOf(INDEX, r.node);
      const p = r.parentPath;
      /* the routes' door's own call */
      if (p.isCallExpression() && r.parentKey === 'arguments' && norm(INDEX, p.node) === URL_FORMS_DOOR) continue;
      /* handed whole to a named helper (URL_HANDED) */
      if ((p.isCallExpression() || p.isNewExpression()) && r.parentKey === 'arguments') { bump(handed, (chain(p.node.callee) || '(a call by another name)') + '(url)'); continue; }
      if (p.isMemberExpression() && r.parentKey === 'object' && !p.node.computed && p.node.property.name === 'pathname') {
        const g = p.parentPath;
        /* url.pathname === '/lit' (or !==), either side */
        if (g.isBinaryExpression() && (g.node.operator === '===' || g.node.operator === '!==') && isPath(p.parentKey === 'left' ? g.node.right : g.node.left)) continue;
        /* url.pathname.startsWith('/lit') */
        if (g.isMemberExpression() && p.parentKey === 'object' && !g.node.computed && g.node.property.name === 'startsWith'
          && g.parentPath.isCallExpression() && g.parentKey === 'callee' && g.parent.arguments.length === 1 && isPath(g.parent.arguments[0])) continue;
        /* the path handed to a named helper (URL_HANDED) */
        if ((g.isCallExpression() || g.isNewExpression()) && p.parentKey === 'arguments') { bump(handed, (chain(g.node.callee) || '(a call by another name)') + '(url.pathname)'); continue; }
        bad.push(at + ' `' + norm(INDEX, g.node).slice(0, 100) + '` (the path read in no listed form)');
        continue;
      }
      bad.push(at + ' `' + norm(INDEX, p.node).slice(0, 100) + '` (the URL read in no listed form)');
    }
  }
  const { over, stale } = heldTo(URL_HANDED, handed);
  check('5: the request\'s URL is made only as `const url = new URL(request.url)` in a fetch (guard: ' + made.length + ' made, ' + reads + ' reads)', made.length === 2 && reads > 30, made.length);
  check('5: every read of the request\'s URL in index.js is a listed form: a strict compare with a literal path, a mount\'s startsWith, the routes\' door, a URL_HANDED row (counted)', bad.length === 0 && over.length === 0, [...bad, ...over]);
  check('5: ...every URL_HANDED row is still there, at its count (a stale row is deleted, a count lowered)', stale.length === 0, stale);
}

/* ── 2c. WHAT GOES OUT IS NEVER THE PHONE'S OWN OBJECT (the router) ──
   In `_onMessage`, the phone's message `msg`, a field of it at any depth
   (`msg.payload`, `msg.data[k]`), or an `||` / `??` / `?:` / `await` of them
   (`msg.payload || msg`), and any name given one, is a CARRIER.  A carrier
   may be read, compared, tested and handed to a function; it is red when it
   is SPREAD (`{ ...msg }`, `[...msg.list]`, `f(...msg.args)`), handed to
   Object.assign, made a field or an element of a literal, put on another
   object (`x.y = msg.payload`), returned, or handed to a SENDER: the send
   door's own (`_send`, `_sendRoom`, broadcastAll/Except, the room's
   eventBuffer, a socket's send) and, computed off the whole of server/src,
   every function that hands one of its parameters, whole, to a sender (the
   helpers `_partySend(pid, type, payload)` and the rest).  A call the guard
   cannot follow (a computed callee, a name with no definition in server/src,
   a function not listed in CARRIER_READERS) is red.  After the rebuild in
   the default case (`msg = this._relayBuild(session, msg)`), `msg` is the
   worker's own message (part 2b holds its takers).  Rows: CARRIER_LISTED,
   counted, by form. */
const SINKS = { 'this._send': [1], 'this._sendRoom': [0], 'this.broadcastAll': [0], 'this.broadcastExcept': [1], 'this.eventBuffer.push': 'all', 'sendOutside': [1] };
const CARRIER_READERS = {
  'console.error': 'a log line', 'console.warn': 'a log line', 'console.log': 'a log line', 'Math.min': 'a number',
  'Object.prototype.hasOwnProperty.call': 'asks whether a field is there', 'Number.isFinite': 'asks a number',
  'RIDE_ENDS_ON.has': 'a list of types asked', 'PAUSE_GATED.has': 'a list of types asked', 'FIGHT_GATED.has': 'a list of types asked', 'PRIVILEGED_EVENTS.has': 'the deny-list asked',
};
const CARRIER_LISTED = {
  /* the `track` case (index.js): each cosmetic key of TRACK_COSMETIC_KEYS copied on its own, to its form, before it rides session.data and the player_update fan-out */
  'put on another object: clean[k] = _tv.length > _tcap ? _tv.slice(0, _tcap) : _tv': [1, 'track: a cosmetic string, cut to its cap (cosmeticCap)'],
  'put on another object: clean[k] = _tv': [2, 'track: a scalar (null, a boolean, a finite number), and `rpgData`, the inspect card\'s blob, bounded by its JSON size (TRACK_BLOB_MAX_BYTES)'],
  /* the shop's case: the type, one of the case's own two words */
  'a field of a literal: kind: _kind': [1, 'shop_sell / shop_buy: the case\'s own type on its result (`_kind = msg.type`, inside those two cases)'],
};
{
  /* every named function of server/src: its parameters' names and its body */
  const defs = new Map();   /* name -> [{ f, path, params }] */
  for (const f of Object.keys(raw)) {
    visit(raw[f], { 'ObjectMethod|ClassMethod|FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
      const n = path.node, pp = path.parentPath;
      let name = null;
      if ((path.isObjectMethod() || path.isClassMethod()) && !n.computed) name = n.key.name || n.key.value;
      else if (n.id && n.id.name) name = n.id.name;
      else if (pp.isVariableDeclarator() && pp.node.id.type === 'Identifier') name = pp.node.id.name;
      else if (pp.isObjectProperty() && !pp.node.computed) name = pp.node.key.name || pp.node.key.value;
      else if (pp.isAssignmentExpression() && pp.node.left.type === 'MemberExpression' && !pp.node.left.computed) name = pp.node.left.property.name;
      if (!name) return;
      if (!defs.has(name)) defs.set(name, []);
      defs.get(name).push({ f, path, params: n.params.map((p) => (p.type === 'Identifier' ? p.name : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : p.type === 'RestElement' ? '...' : null)) });
    } });
  }
  /* the names in `node` handed WHOLE (not a field read, not a key) */
  const wholeIn = (node, names) => {
    const out = new Set();
    const look = (n, parent, key) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { for (const x of n) look(x, parent, key); return; }
      if (n.type === 'Identifier' && names.has(n.name)) {
        const fieldRead = parent && (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && key === 'object';
        const aKey = parent && parent.type === 'ObjectProperty' && key === 'key' && !parent.computed && !parent.shorthand;
        const asked = parent && (parent.type === 'UnaryExpression'
          /* `p && p.x`: the left passes on only when it is falsy, never an object; `p ? a : b` tests it */
          || (parent.type === 'LogicalExpression' && parent.operator === '&&' && key === 'left') || (parent.type === 'ConditionalExpression' && key === 'test'));
        if (!fieldRead && !aKey && !asked) out.add(n.name);
      }
      if (/Function/.test(n.type) || n.type === 'BinaryExpression' || n.type === 'CallExpression' && n !== node) return;
      for (const k of Object.keys(n)) if (!SHAPE_SKIP.has(k) && n[k] && typeof n[k] === 'object') look(n[k], n, k);
    };
    look(node, null, null);
    return out;
  };
  const sinkAt = (callNode) => {
    const c = callNode.callee;
    const name = chain(c);
    if (name && Object.prototype.hasOwnProperty.call(SINKS, name)) return SINKS[name];
    if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.name === 'send' && name !== 'this._send') return [0];
    return null;
  };
  const senders = new Map();   /* name -> Set of parameter indexes handed whole to a send */
  const sendersAt = (callNode) => {
    const s = sinkAt(callNode);
    if (s) return s;
    const name = chain(callNode.callee);
    if (name && name.startsWith('this.') && name.split('.').length === 2 && senders.has(name.slice(5))) return [...senders.get(name.slice(5))];
    return null;
  };
  for (let round = 0, grew = true; grew && round < 12; round++) {
    grew = false;
    for (const [name, list] of defs) for (const d of list) {
      const params = new Map();
      d.params.forEach((p, i) => { if (p && p !== '...') params.set(p, i); });
      if (!params.size) continue;
      /* a second name for a parameter, in its body: the parameter */
      d.path.traverse({ VariableDeclarator(p) {
        if (p.node.id.type !== 'Identifier' || !p.node.init) return;
        for (const w of wholeIn(p.node.init, new Set(params.keys()))) if (!params.has(p.node.id.name)) params.set(p.node.id.name, params.get(w));
      } });
      d.path.traverse({ 'CallExpression|OptionalCallExpression'(p) {
        const at = sendersAt(p.node);
        if (!at) return;
        const args = at === 'all' ? p.node.arguments : at.map((i) => p.node.arguments[i]).filter(Boolean);
        for (const a of args) for (const w of wholeIn(a, new Set(params.keys()))) {
          const i = params.get(w);
          if (!senders.has(name)) senders.set(name, new Set());
          if (!senders.get(name).has(i)) { senders.get(name).add(i); grew = true; }
        }
      } });
    }
  }
  check('2c: the senders are computed off server/src (guard: broadcastAll, _partySend, _send\'s callers found)', senders.has('broadcastAll') && senders.has('broadcastExcept') && senders.has('_partySend') && senders.size > 20, senders.size);

  const bad = [], got = new Map();
  let carriers = 0;
  if (onMsg) {
    let buildAt = -1;
    onMsg.traverse({ AssignmentExpression(path) {
      const n = path.node;
      if (n.left.type === 'Identifier' && n.left.name === 'msg' && n.right.type === 'CallExpression' && chain(n.right.callee) === 'this._relayBuild') buildAt = n.start;
    } });
    const afterBuild = (node) => dflt && buildAt >= 0 && node.start > buildAt && node.end <= dflt.end;
    const PASS = new Set(['LogicalExpression', 'ConditionalExpression', 'AwaitExpression', 'ParenthesizedExpression', 'SequenceExpression', 'TSAsExpression', 'TSNonNullExpression']);
    const seenBind = new Set(), seenNode = new Set();
    const follow = (binding, label) => {
      if (!binding || seenBind.has(binding)) return;
      seenBind.add(binding);
      for (const v of binding.constantViolations) {
        /* `msg = this._relayBuild(...)` / `msg = await this._interceptX(...)`: the router's own steps after the rebuild */
        if (label === 'msg' && afterBuild(v.node)) continue;
        if (label === 'msg' && v.node.type === 'AssignmentExpression' && chain(v.node.right.callee || {}) === 'this._relayBuild') continue;
        if (label !== 'msg') bad.push('index.js:' + lineOf(INDEX, v.node) + ' `' + label + '` (a carrier\'s name) given another value');
      }
      for (const r0 of binding.referencePaths) {
        if (label === 'msg' && afterBuild(r0.node)) continue;
        let r = r0;
        /* a field, at any depth (a computed one too): still the phone's */
        while ((r.parentPath.isMemberExpression() || r.parentPath.isOptionalMemberExpression()) && r.parentKey === 'object') r = r.parentPath;
        /* a value passed through: || ?? ?: await (...) */
        while (PASS.has(r.parent.type) && !(r.parent.type === 'ConditionalExpression' && r.parentKey === 'test') && !(r.parent.type === 'SequenceExpression' && r.parent.expressions[r.parent.expressions.length - 1] !== r.node)) r = r.parentPath;
        if (seenNode.has(r.node)) continue;
        seenNode.add(r.node);
        carriers++;
        const p = r.parentPath, at = 'index.js:' + lineOf(INDEX, r.node), txt = norm(INDEX, p.node).slice(0, 110);
        const listed = (form) => { const k = form + ': ' + txt; if (CARRIER_LISTED[k]) bump(got, k); else bad.push(at + ' `' + txt + '` (' + form + ')'); };
        if (p.isSpreadElement()) { listed('spread'); continue; }
        if (p.isObjectProperty() && r.parentKey === 'value') { listed('a field of a literal'); continue; }
        if (p.isArrayExpression()) { listed('an element of a literal'); continue; }
        if (p.isReturnStatement() || p.isArrowFunctionExpression()) { listed('returned'); continue; }
        if (p.isVariableDeclarator() && r.parentKey === 'init') {
          if (p.node.id.type === 'Identifier') follow(p.scope.getBinding(p.node.id.name), p.node.id.name);
          continue;   /* a destructure takes fields; a second name is followed (2b reds `const x = msg` itself) */
        }
        if (p.isAssignmentExpression() && r.parentKey === 'right') {
          if (p.node.left.type === 'Identifier') { if (p.node.left.name !== 'msg') follow(p.scope.getBinding(p.node.left.name), p.node.left.name); continue; }
          listed('put on another object'); continue;
        }
        if ((p.isCallExpression() || p.isOptionalCallExpression() || p.isNewExpression()) && r.parentKey === 'arguments') {
          const callee = chain(p.node.callee);
          const i = p.node.arguments.indexOf(r.node);
          if (callee === 'Object.assign') { listed('Object.assign'); continue; }
          /* its size measured (`JSON.stringify(x).length`): a number, no copy */
          if (callee === 'JSON.stringify' && p.parentPath.isMemberExpression() && p.parentKey === 'object' && !p.parent.computed && p.parent.property.name === 'length') continue;
          const sink = sendersAt(p.node);
          if (sink && (sink === 'all' || sink.includes(i))) { listed('handed whole to a send (' + callee + ')'); continue; }
          if (r.node.type === 'Identifier' && r.node.name === 'msg') continue;   /* part 2b holds `msg` itself to its takers */
          if (callee && callee.startsWith('this.') && callee.split('.').length === 2 && defs.has(callee.slice(5))) continue;   /* a function of server/src, no sender at this place */
          if (callee && Object.prototype.hasOwnProperty.call(CARRIER_READERS, callee)) continue;
          listed('handed to a call the guard cannot follow (' + (callee || 'a computed callee') + ')'); continue;
        }
        /* read, compared, tested, a key of a lookup, a switch, a callee: no copy goes anywhere */
      }
    };
    follow(onMsg.scope.getBinding('msg'), 'msg');
  }
  const { over, stale } = heldTo(CARRIER_LISTED, got);
  if (process.env.WIRE_GAPS_ALL) for (const x of [...bad, ...over]) console.log('       ' + x);
  check(`2c: the phone's message, a field of it or a name for one, is never spread, assigned whole, made a literal's part or handed to a sender (CARRIER_LISTED, counted; guard: ${carriers} carriers)`, bad.length === 0 && over.length === 0 && carriers > 150, [...bad, ...over]);
  check('2c: ...every CARRIER_LISTED row is still there, at its count', stale.length === 0, stale);
}

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nwire-gaps: all passed');
process.exit(failures ? 1 : 0);
