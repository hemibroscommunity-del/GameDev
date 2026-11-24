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
 * Read only: nothing here changes the room's code or the table.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { visit } from '../../tools/guards/lib/writesOf.mjs';
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

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nwire-gaps: all passed');
process.exit(failures ? 1 : 0);
