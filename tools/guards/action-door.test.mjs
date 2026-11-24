/* ═══ v2.3.5185: THE ACTION DOOR HOLDS (grand plan step 5.8; card K PR 5) ═══
 * TRAPS §18 (the rule): every type, event and route the page sends by name (a `.send({ type:`, a broadcast's `event:`, an `act('...'`, a fetch of '/api/...') has a row of the action door, and a send outside the door is counted (check 7); the shim's hand-kept pass-through list cannot come back (check 4). Break: src/ui/panels/buildings/CookPanel.jsx: `S.channel.send({ type: 'my_request' });` beside the eat request -> FAIL (tried 2026-11-17).
 * (v2.3.5764: the form line, card V2.)
 *
 * src/game/actions.js is the one way a request leaves the page: one row a
 * request, its way (alone, priority, the 33 ms batch, a rider, a route...)
 * and its flags, and act(), which makes a value request's id.  The page's
 * channel shim (wsClient.js, system wire) is its transport and reads the
 * rows: its pass-through, PRIORITY_EVENTS and SETTLED_SENDS were three lists
 * kept by hand (TRAPS §18: a type the pass-through forgot was dropped in
 * silence).  The door never imports the worker's table (it would carry every
 * row and its notes into a phone's memory), so this guard holds the two
 * together.  It fails:
 *
 *   1. a door row that is not an `in`, `relay` or `http` row of the wire
 *      table (server/src/wire/), but a `legacy` row: a type sent for an
 *      older worker, an `out` row today's worker drops;
 *   2. a type, event or route the page sends (a literal in src/: a
 *      `.send({ type: 'x'`, a broadcast's `event: 'x'`, an `act('x'`, a
 *      fetch of '/api/...') with no row;
 *   3. a row whose `req` is not its table row's: a request that moves value
 *      out or cannot be undone (`doesWhat` holds `value-out` or `final`) gets
 *      a request id, and no other does;
 *   3b. (v2.3.5191) a route row whose `auth` is not its table row's: the
 *      session's token goes exactly to a route whose `trust` reads x-bt-auth;
 *   4. a list of the shim's kept by hand again (a `msg.type === '<name>'`
 *      pass-through, a literal PRIORITY_EVENTS or SETTLED_SENDS);
 *   5. act() not taking each way as the shim does: a direct type in its
 *      `payload` (or at the top, `body: 'top'`), an event as a broadcast, a
 *      route with its method and the session's token, a request id on a
 *      `req` row in SHAPES' form, a name with no row refused and counted;
 *   6. (v2.3.5185 to 5187: PR 5's copy of the shim's ways, taken out by
 *      PR 7's first);
 *   7. THE CENSUS (the plan's rule 3): a send to the socket (`channel.send(`)
 *      or a fetch of '/api/' anywhere but the door, counted against LINE.
 *      It only falls: card K's PR 7 moves the page's sends to act(), a
 *      family a PR.  The exceptions, named: src/debug/crashTrap.js and
 *      src/networking/index.js (they run before a session), and wsClient.js's
 *      fetch of /api/lobby (the connection's own).  And (v2.3.5603, named
 *      for sitting 19b's gatekeeper) THE OWNER'S KEY: the Test panel's
 *      `call` and `callOwner` (src/ui/panels/DevPanel.jsx) go out through
 *      `fetchWithTimeout` with the owner's admin key, never a session's
 *      token, so the census's fetch pattern never sees them; they stay
 *      outside the door on purpose (the door carries a session's token, and
 *      the owner's key must never ride it).  §7b holds that only that file
 *      calls `fetchWithTimeout` with the API's base.
 *      v2.3.5187 (PR 7.1, combat and moving): 57 moved
 *      v2.3.6446 (sitting 59: `const k = 'channel'; S[k].send(...)` in
 *      BroTown.jsx stayed green): a computed key is read for the words the
 *      tree says it can be; a key it cannot know on an object that holds the
 *      channel in that file (or a name bound to one), or whose value has its
 *      `send` taken, is counted as a send (deny by default)
 *
 * BREAK PROOF (rule 8), each tried by hand 2026-11-14:
 *   1. src/game/chat.js: `S.channel.send({ type: 'zz_probe' })`          -> FAIL 2 (and 7)
 *   2. src/game/actions.js: `cape_redeem: A('alone', { req: 1 })` -> no req -> FAIL 3
 *   3. the shim (wsClient.js): `if (msg.type === 'zz_probe') { wsOut(msg); return; }` in the shim -> FAIL 4
 *   4. (retired with §6, v2.3.5187: the ways are the rows' now)
 *   5. src/game/actions.js: `item_drop`'s `body: 'top'` taken off      -> FAIL 2b (v2.3.5185, sitting 14)
 *   6. src/game/actions.js: `auth` taken off http:/api/market/place    -> FAIL 3b (v2.3.5191, 2026-11-15)
 *   7. act(): a JSON header and a body on every route, a GET's too      -> FAIL 5 (v2.3.5191, 2026-11-15)
 *   8. the page's main file ~8198 (BroTown): `const k = 'channel'; S[k].send(...)`  -> FAIL 7 (v2.3.6446, plants-scans.json)
 *
 * Run from the repository's root: node tools/guards/action-door.test.mjs
 * (cd server && npm test runs it with every other guard).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesOf } from './lib/filesOf.mjs';
import { visit, wordsAt } from './lib/writesOf.mjs';   /* v2.3.6441: the census reads the syntax tree (card DG PR 2); v2.3.6446: a key's words (wordsAt) */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700)));
};

const D = await import(new URL('../../src/game/actions.js', import.meta.url));
const { ACTIONS, ENV_OF_WAY, REQ_ID_RE } = D;
const W = (f) => new URL('../../server/src/wire/' + f, import.meta.url);
const { WIRE_IN } = await import(W('in.js'));
const { WIRE_RELAY } = await import(W('relays.js'));
const { WIRE_OUT } = await import(W('out.js'));
const { WIRE_HTTP } = await import(W('http.js'));
const TAKES = new Map([...WIRE_IN, ...WIRE_RELAY, ...WIRE_HTTP].map((r) => [r.name, r]));
const OUT = new Set(WIRE_OUT.map((r) => r.name));
const names = Object.keys(ACTIONS);

/* ── 1. every row is a row of the table ── */
{
  const off = names.filter((n) => !TAKES.has(n) && !(ACTIONS[n].legacy && OUT.has(n)));
  const legacyWrong = names.filter((n) => ACTIONS[n].legacy && TAKES.has(n));
  check(`1: every door row (${names.length}) is an in, relay or http row of the wire table (or a legacy out row)`, off.length === 0 && legacyWrong.length === 0, { off, legacyWrong });
  const ways = names.filter((n) => !Object.prototype.hasOwnProperty.call(ENV_OF_WAY, ACTIONS[n].way));
  check('1: every row\'s way is one of the door\'s', ways.length === 0, ways);
  const http = names.filter((n) => ACTIONS[n].way === 'http');
  const badHttp = http.filter((n) => !/^http:\//.test(n) || !/^(GET|POST|DELETE)$/.test(ACTIONS[n].method || '') || !/^\/api\//.test(ACTIONS[n].path || ''));
  check(`1: every route row (${http.length}) is named http:/..., with its method and path`, badHttp.length === 0, badHttp);
}

/* ── 2. what the page sends, each a row ── */
const files = [];
const walk = (d) => { for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(p); } };
walk('src');
const SRC = new Map(files.map((f) => [f, read(f)]));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const sent = new Map();   /* name -> where */
const note = (n, f, s, i) => { if (!sent.has(n)) sent.set(n, f + ':' + lineOf(s, i)); };
for (const [f, s] of SRC) {
  if (f === 'src/game/actions.js') continue;
  for (const m of s.matchAll(/\.send\(\s*\{\s*type:\s*'([a-z_0-9]+)'/g)) if (m[1] !== 'broadcast') note(m[1], f, s, m.index);
  for (const m of s.matchAll(/type:\s*'broadcast',\s*event:\s*'([a-z_0-9]+)'/g)) note(m[1], f, s, m.index);
  if (/import\s*\{[^}]*\bact\b[^}]*\}\s*from\s*'[^']*actions\.js'/.test(s)) for (const m of s.matchAll(/\bact\(\s*'([^']+)'/g)) note(m[1], f, s, m.index);
}
/* a fetch of a route: its path, matched to the row that answers it */
const routeRows = names.filter((n) => ACTIONS[n].way === 'http');
const fetches = [];
for (const [f, s] of SRC) {
  for (const m of s.matchAll(/fetch\(([^\n]{0,200})/g)) {
    const pm = /'(\/api\/[a-z_/]*)/.exec(m[1]) || (/fetch\(\(u, i\)/.test(m[0]) ? /'\/api\/store'/.exec(m[1]) : null);
    if (!pm && !/\/api\//.test(m[1])) continue;
    fetches.push({ f, line: lineOf(s, m.index), path: pm ? pm[1] : null });
  }
}
/* the shim's file, found by what it holds among the wire system's files, never
   by its path (tests-by-system: a big file is read by system) */
const SHIM_FILE = filesOf('wire').find((f) => SRC.has(f) && SRC.get(f).includes('var channelShim = {'));
const EXCEPT = (x) => x.f === 'src/debug/crashTrap.js' || x.f === 'src/networking/index.js' || (x.f === SHIM_FILE && x.path === '/api/lobby');
/* v2.3.5603: the owner's key's way out (the header's exceptions): the Test panel alone */
const OWNER_KEY_FILE = 'src/ui/panels/DevPanel.jsx';
{
  const missing = [...sent].filter(([n]) => !Object.prototype.hasOwnProperty.call(ACTIONS, n)).map(([n, w]) => n + ' (' + w + ')');
  check(`2: every type and event the page sends by name (${sent.size}) has a row`, missing.length === 0, missing);
  const routeless = fetches.filter((x) => !EXCEPT(x) && x.path && x.path !== '/api/store' && !routeRows.some((n) => ACTIONS[n].path === x.path.replace(/\/$/, '') || ACTIONS[n].path.startsWith(x.path.replace(/\/$/, '') + '/')));
  check(`2: every route the page fetches (${fetches.length}, less the exceptions) has a row`, routeless.length === 0, routeless.map((x) => x.path + ' (' + x.f + ':' + x.line + ')'));
}
/* v2.3.5882 (card K3 PR 3): a route named through a wrapper is a row too.
   storeApi.js's post(route, ...) hands its route to act(); storeListPet said
   '/list', no row, and act() refused every pet listing in silence.  So every
   post('...') there, and every 'http:/...' written anywhere on the page (a
   door name: one slash, never a URL's two), names a row.  Break proof: post('/list', ...) back in storeApi.js turns it red */
{
  const STORE_API = 'src/ui/storeApi.js';
  const has = (n) => Object.prototype.hasOwnProperty.call(ACTIONS, n);
  const bad = [];
  const sa = SRC.get(STORE_API) || '';
  let posts = 0;
  for (const m of sa.matchAll(/\bpost\(\s*'([^']*)'/g)) { posts++; if (!has(m[1])) bad.push(m[1] + ' (' + STORE_API + ':' + lineOf(sa, m.index) + ')'); }
  for (const [f, s] of SRC) {
    if (f === 'src/game/actions.js') continue;
    for (const m of s.matchAll(/'(http:\/(?!\/)[^'\s]*)'/g)) if (!has(m[1])) bad.push(m[1] + ' (' + f + ':' + lineOf(s, m.index) + ')');
  }
  check(`2c: every route a wrapper names (${posts} post() in ${STORE_API}) and every 'http:/...' on the page is a row`, posts > 0 && bad.length === 0, bad);
}

/* ── 7b (v2.3.5603, sitting 19b's gatekeeper): the owner's key's way out,
   named: `fetchWithTimeout` with the API's base only in the Test panel, whose
   `call` and `callOwner` carry the owner's admin key, never a session */
{
  const outside = [];
  for (const [f, src] of SRC) {
    if (f === OWNER_KEY_FILE) continue;
    for (const m of src.matchAll(/fetchWithTimeout\(\s*BT_API_BASE/g)) outside.push(f + ':' + lineOf(src, m.index));
  }
  const inPanel = (SRC.get(OWNER_KEY_FILE) || '').match(/fetchWithTimeout\(\s*BT_API_BASE/g) || [];
  check(`7b: the owner's key goes out only from the Test panel (${inPanel.length} there; ${OWNER_KEY_FILE})`, outside.length === 0 && inPanel.length > 0, outside);
}

/* ── 2b (v2.3.5185, the gatekeeper's note, sitting 14). a direct send the
   page writes with its fields at the message's top (`{ type: 'x', k: ... }`,
   k not `payload`) is a `body: 'top'` row, so act() sends it the same way
   (item_drop and report were not) ── */
{
  const topless = [];
  for (const [f, s] of SRC) {
    if (f === 'src/game/actions.js') continue;
    /* block comments blanked first, line for line (a comment may sit between `{` and `type`) */
    const sc = s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    for (const m of sc.matchAll(/\{\s*type:\s*'([a-z_0-9]+)',\s*([A-Za-z_$][\w$]*)\s*[:,}]/g)) {
      const r = Object.prototype.hasOwnProperty.call(ACTIONS, m[1]) ? ACTIONS[m[1]] : null;
      if (!r || ENV_OF_WAY[r.way] !== 'direct' || m[2] === 'payload' || r.body === 'top') continue;
      topless.push(m[1] + ' (' + f + ':' + lineOf(s, m.index) + ', `' + m[2] + '` at the top)');
    }
  }
  check('2b: a direct send written with its fields at the top is a `body: \'top\'` row', topless.length === 0, topless);
}

/* ── 3. a request id exactly where the table says value goes out or cannot come back ── */
{
  const wrong = names.filter((n) => {
    const r = ACTIONS[n];
    if (r.way === 'own' || r.legacy) return !!r.req;
    const t = TAKES.get(n);
    const want = !!(t && (t.doesWhat.includes('value-out') || t.doesWhat.includes('final')));
    return !!r.req !== want;
  });
  check(`3: every row's req is its table row's (value-out or final): ${names.filter((n) => ACTIONS[n].req).length} rows`, wrong.length === 0, wrong);
  /* v2.3.5191 (card K PR 7.5): the token, exactly where the route reads it */
  const authWrong = names.filter((n) => {
    const r = ACTIONS[n];
    if (r.way !== 'http') return !!r.auth;
    const t = TAKES.get(n);
    return !!r.auth !== !!(t && t.trust && Object.prototype.hasOwnProperty.call(t.trust, 'x-bt-auth'));
  });
  check(`3b: every route row's auth is its table row's (its trust reads x-bt-auth): ${names.filter((n) => ACTIONS[n].auth).length} rows`, authWrong.length === 0, authWrong);
}

/* ── 4. the shim keeps no list by hand ── */
{
  const ws = SHIM_FILE ? SRC.get(SHIM_FILE) : '';
  const from = ws.indexOf('var channelShim = {'), to = ws.indexOf('track: function track(', from);
  const shim = from >= 0 && to > from ? ws.slice(from, to) : '';
  const literal = [...shim.matchAll(/msg\.type === '([a-z_0-9]+)'/g)].map((m) => m[1]).filter((t) => t !== 'broadcast' && t !== 'node_strike');
  check('4: the shim\'s pass-through is the door\'s rows (no `msg.type === \'<name>\'` kept by hand)', shim.length > 0 && literal.length === 0 && /actionWay\(msg\.type\)/.test(shim), literal);
  check('4: PRIORITY_EVENTS and SETTLED_SENDS are made from the rows', /var PRIORITY_EVENTS = namesOfWay\('priority'\);/.test(ws) && /var SETTLED_SENDS = settledSends\(\);/.test(ws));
}

/* ── 5. act() takes each way as the shim does ── */
{
  const sentOut = [];
  D.setActionTransport({ send: (m) => { sentOut.push(m); return true; }, http: (path, init) => { sentOut.push({ path, init }); return 'http'; }, token: () => 'tok' });
  const before = D.doorCounts().total;
  const ok = [];
  D.act('cape_equip', { on: true }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ type: 'cape_equip', payload: { on: true } }));
  D.act('dice', { kind: 'flip' }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ kind: 'flip', type: 'dice' }));
  D.act('emote', { e: 1 }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ type: 'broadcast', event: 'emote', payload: { e: 1 } }));
  D.act('cape_redeem', { code: 'x' }); const red = sentOut.pop(); ok.push(red.type === 'cape_redeem' && REQ_ID_RE.test(red.payload.reqId) && red.payload.code === 'x');
  D.act('http:/api/store/buy', { listingId: 'L' }, { query: 'room=brotown-1' }); const h = sentOut.pop();
  ok.push(h.path === '/api/store/buy?room=brotown-1' && h.init.method === 'POST' && h.init.headers['x-bt-auth'] === 'tok' && REQ_ID_RE.test(JSON.parse(h.init.body).reqId));
  ok.push(D.act('join', {}) === false && D.act('zz_no_row', {}) === false && sentOut.length === 0 && D.doorCounts().total === before + 2);
  ok.push([1, 2, 3].map(() => D.makeReqId()).every((r, i, a) => REQ_ID_RE.test(r) && a.indexOf(r) === i));
  /* v2.3.5191: a route's bytes are the page's own of before: a GET plain (no headers, no body: no
     preflight), a DELETE with its token and no body, a POST that reads no token sends none */
  D.act('http:/api/market/orders', {}, { query: 'room=r' }); const g = sentOut.pop();
  ok.push(g.path === '/api/market/orders?room=r' && g.init.method === 'GET' && g.init.headers === undefined && g.init.body === undefined);
  D.act('http:/api/store/cancel', {}, { query: 'id=1' }); const dl = sentOut.pop();
  ok.push(dl.init.method === 'DELETE' && dl.init.body === undefined && JSON.stringify(dl.init.headers) === JSON.stringify({ 'x-bt-auth': 'tok' }));
  D.act('http:/api/feedback/vote', { vote: 'up' }); const fv = sentOut.pop();
  ok.push(fv.init.method === 'POST' && JSON.stringify(fv.init.headers) === JSON.stringify({ 'Content-Type': 'application/json' }) && JSON.parse(fv.init.body).vote === 'up');
  check('5: act() sends each way as the shim does, makes a request id in SHAPES\' form on a req row, and refuses (counts) a name with no row', ok.every(Boolean), ok);
  /* v2.3.5191: with no transport a route answers a rejected promise (its caller's catch, as a
     fetch that could not leave), a socket's send false */
  D.setActionTransport(null);
  const off = D.act('http:/api/market/orders', {});
  let rejected = false;
  await (off && typeof off.then === 'function' ? off.then(() => {}, () => { rejected = true; }) : null);
  check('5b: with no transport a route answers a rejected promise, and a socket\'s send false', rejected && D.act('cape_equip', {}) === false);
}

/* ── 6. (v2.3.5185's copy of the shim's ways, card K PR 5's only, taken out by
   PR 7's first, v2.3.5187: from here the rows are the ways, held by §1 to §5) ── */

/* ── 7. the census: sends and fetches outside the door ── */
const LINE = { sends: 0, fetches: 0 };   /* v2.3.5187: 203 less PR 7.1's 57; v2.3.5188: less PR 7.2's 41; v2.3.5189: less PR 7.3's 17; v2.3.5190: less PR 7.4's 44; v2.3.5191: less PR 7.5's 22 sends and 24 fetches (the fetch left: BroTown's, 7.6; LoginSpinWindow.jsx waits for card T's #1863); v2.3.5192: less PR 7.6's 18 sends (BroTown.jsx's 17, the ride key's) and 1 fetch; the 4 left: nmlAsk.js and LoginSpinWindow.jsx, after card T's #1863; v2.3.5880: less nmlAsk.js's 3 (card K3 PR 1); the 1 left: LoginSpinWindow.jsx's, K3 PR 2; v2.3.5881: less LoginSpinWindow.jsx's 1 (card K3 PR 2): none left */
/* v2.3.6441 (card DG PR 2): read off the syntax tree, never a pattern of
   text: a channel's send by any spelling (`S.channel?.send(...)`, `const ch =
   S.channel; ch.send(m)`, a bind of it: plants2 ACT-1, ACT-2), and a fetch
   whose address names a route however it was built (a url made a line above,
   `fetch(u, ...)`: plants2 ACT-3). */
/* v2.3.6441 (sitting 57: `S['channel'].send(m)` and `const go = fetch`
   stayed green, the receiver matched as text): the receiver is read as a
   node -- a member whose key is `channel` however it is written (`.channel`,
   `?.channel`, `['channel']`, a template), or a name bound to one, or to a
   name bound to one */
/* v2.3.6446 (sitting 59: `const k = 'channel'; S[k].send(m)` stayed green,
   a key in a name was no key): a computed key is read for the WORDS the tree
   says it can be (writesOf's wordsAt: a const, a ternary, a list looped
   over); one of them the channel's (or send's, fetch's) is that key.  A key
   whose words cannot be known is null: on an object that can hold the
   channel it is counted (unknownKey below). */
const WATCHED = ['channel', 'send', 'fetch', 'call', 'apply', 'bind'];
const keyOf = (m, path) => {
  if (!m.computed) return m.property.type === 'Identifier' ? m.property.name : null;
  if (m.property.type === 'StringLiteral') return m.property.value;
  if (m.property.type === 'TemplateLiteral' && m.property.expressions.length === 0) return m.property.quasis[0].value.cooked;
  const w = path ? wordsAt(m.property, path) : null;
  if (!w || !w.length) return null;
  return WATCHED.find((x) => w.includes(x)) || (w.length === 1 ? w[0] : '(' + w.join('|') + ')');
};
const isMember = (n) => n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression');
const unwrap = (n) => { while (n && (n.type === 'ParenthesizedExpression' || n.type === 'TSNonNullExpression')) n = n.expression; return n; };
function isChannel(node, path, depth = 0) {
  node = unwrap(node);
  if (!node || depth > 6) return false;
  if (isMember(node)) return keyOf(node, path) === 'channel';
  if (node.type === 'LogicalExpression') return isChannel(node.left, path, depth + 1) || isChannel(node.right, path, depth + 1);
  if (node.type === 'Identifier') return chanBinding(path && path.scope.getBinding(node.name), depth);
  if (node.type === 'ConditionalExpression') return isChannel(node.consequent, path, depth + 1) || isChannel(node.alternate, path, depth + 1);
  if (node.type === 'AssignmentExpression') return isChannel(node.right, path, depth + 1);
  if (node.type === 'SequenceExpression') return isChannel(node.expressions[node.expressions.length - 1], path, depth + 1);
  return false;
}
/* v2.3.6441 (sitting 58: `const { channel } = S; channel.send(m)` stayed
   green: a name bound by a PATTERN was not followed).  DENY BY DEFAULT: a
   name is a channel when it is bound to one by ANY form -- a name, a pattern
   under the key `channel` (`{ channel }`, `{ channel: c = null }`, nested, a
   parameter's, a loop's), or put again later (`ch = S.channel`) -- and every
   USE of a channel is one the census knows (a test of it, a read of a key
   that is not `send`, a name bound to it) or it is COUNTED as a send: a use
   the census cannot follow (handed to a call, put into a member or a list,
   a key it cannot know, a pattern taking its `send`) is red, never green. */
/* v2.3.6446: a pattern's computed key, by its words (`const { [k]: c } = S` with k 'channel') */
const patKey = (k, bp) => { const w = bp && bp.scope ? wordsAt(k, bp) : null; return w && w.length ? (WATCHED.find((x) => w.includes(x)) || (w.length === 1 ? w[0] : '?')) : '?'; };
const patternKey = (bp, name) => {
  /* the key a name sits under in the pattern that binds it, or null */
  let hit = null;
  const walk = (n, key) => {
    if (!n || hit !== null) return;
    if (n.type === 'Identifier') { if (n.name === name) hit = key; return; }
    if (n.type === 'AssignmentPattern') return walk(n.left, key);
    if (n.type === 'RestElement') return walk(n.argument, '...');
    if (n.type === 'ArrayPattern') { for (const e of n.elements) walk(e, '[]'); return; }
    if (n.type === 'ObjectPattern') for (const p of n.properties) {
      if (p.type === 'RestElement') { walk(p.argument, '...'); continue; }
      walk(p.value, p.computed ? (p.key.type === 'StringLiteral' ? p.key.value : patKey(p.key, bp)) : (p.key.name || String(p.key.value)));
    }
  };
  const ids = bp.isVariableDeclarator() ? [bp.node.id] : (bp.isFunction() ? bp.node.params : [bp.node]);
  for (const id of ids) walk(id, null);
  return hit;
};
function chanBinding(b, depth) {
  if (!b) return false;
  const bp = b.path;
  if (bp.isVariableDeclarator() && bp.node.id.type === 'Identifier') {
    if (bp.node.init && isChannel(bp.node.init, bp, depth + 1)) return true;
  } else if (patternKey(bp, b.identifier.name) === 'channel') return true;
  for (const v of b.constantViolations || []) {
    if (v.isAssignmentExpression() && v.node.left.type === 'Identifier' && isChannel(v.node.right, v, depth + 1)) return true;
    if (v.isAssignmentExpression() && v.node.left.type !== 'Identifier' && patternKey({ isVariableDeclarator: () => false, isFunction: () => false, node: v.node.left }, b.identifier.name) === 'channel') return true;
  }
  return false;
}

/* the page's fetch however it is reached: the global name, `window.fetch` /
   `globalThis.fetch` / `self['fetch']`, a name bound to one (`const go =
   fetch`), a bind of one (`fetch.bind(window)`) */
function isFetch(node, path, depth = 0) {
  node = unwrap(node);
  if (!node || depth > 6) return false;
  if (node.type === 'Identifier') {
    const b = path && path.scope.getBinding(node.name);
    if (!b) return node.name === 'fetch';
    /* v2.3.6441 (sitting 58): bound by a pattern under the key `fetch` (`const { fetch: go } = window`), or put again */
    if (!(b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier') && patternKey(b.path, node.name) === 'fetch') return true;
    for (const v of b.constantViolations || []) if (v.isAssignmentExpression() && v.node.left.type === 'Identifier' && isFetch(v.node.right, v, depth + 1)) return true;
    const init = b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier' && b.path.node.init;
    return !!init && isFetch(init, b.path, depth + 1);
  }
  if (isMember(node)) return keyOf(node, path) === 'fetch';
  if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression') && isMember(node.callee) && keyOf(node.callee, path) === 'bind') return isFetch(node.callee.object, path, depth + 1);
  if (node.type === 'LogicalExpression') return isFetch(node.left, path, depth + 1) || isFetch(node.right, path, depth + 1);
  return false;
}
/* v2.3.6441 (sitting 58): where a value is USED, climbing through what
   only passes it on (brackets, `a || b`, a ternary's side): 'test' (an if, a
   compare, `typeof`, `!`, a statement of its own), 'name' (bound to a
   name, followed), 'key' (a key of it read; with the key), or 'other' (a
   use the census cannot follow) */
function useOf(path) {
  let x = path;
  for (;;) {
    const p = x.parentPath, c = x.node;
    if (!p) return { use: 'test' };
    const n = p.node;
    if (p.isParenthesizedExpression() || p.isTSNonNullExpression() || p.isAwaitExpression() || p.isLogicalExpression()
      || (p.isConditionalExpression() && n.test !== c) || (p.isSequenceExpression() && n.expressions[n.expressions.length - 1] === c)) { x = p; continue; }
    if (p.isSequenceExpression() || p.isConditionalExpression() || p.isIfStatement() || p.isWhileStatement() || p.isDoWhileStatement()
      || (p.isForStatement() && n.test === c) || p.isUnaryExpression() || p.isBinaryExpression() || p.isExpressionStatement()) return { use: 'test' };
    if ((p.isMemberExpression() || p.isOptionalMemberExpression()) && n.object === c) return { use: 'key', key: keyOf(n, p), path: p };
    if (p.isVariableDeclarator() && n.init === c) return n.id.type === 'Identifier' ? { use: 'name' } : { use: 'pattern', pattern: n.id };
    if (p.isAssignmentExpression() && n.right === c) {
      if (n.left.type === 'Identifier') return { use: 'name' };
      if (isMember(n.left) && keyOf(n.left, p) === 'channel') return { use: 'name' };   /* put under the key `channel`: a channel by its key */
      if (n.left.type === 'ObjectPattern' || n.left.type === 'ArrayPattern') return { use: 'pattern', pattern: n.left };
      return { use: 'other' };
    }
    if (p.isAssignmentExpression() && n.left === c) return { use: 'test' };   /* `S.channel = null`: put, not used */
    /* `S.channel.send.bind(S.channel)`: the receiver handed to its own send's bind, a send counted once */
    if ((p.isCallExpression() || p.isOptionalCallExpression()) && n.arguments.includes(c) && isMember(n.callee)
      && ['bind', 'call', 'apply'].includes(keyOf(n.callee, p)) && isMember(n.callee.object) && keyOf(n.callee.object, p) === 'send') return { use: 'test' };
    return { use: 'other' };
  }
}
/* a pattern taking a channel apart: only keys it knows, never `send` */
const patternTakesSend = (pt) => pt.type !== 'ObjectPattern'
  || pt.properties.some((p) => p.type === 'RestElement' || (p.computed && p.key.type !== 'StringLiteral') || (p.computed ? p.key.value : (p.key.name || String(p.key.value))) === 'send');
function treeSends(s) {
  const out = [];
  const seen = new Set();
  const hit = (n) => { if (!seen.has(n.start)) { seen.add(n.start); out.push(n.loc.start.line); } };
  /* a channel used: a send, a key the census cannot know, a pattern taking its send, or a use it cannot follow */
  const chanUse = (path) => {
    const u = useOf(path);
    if (u.use === 'test' || u.use === 'name') return;
    if (u.use === 'pattern') { if (patternTakesSend(u.pattern)) hit(path.node); return; }
    if (u.use === 'key') {
      if (u.key === null) { hit(path.node); return; }
      if (u.key !== 'send') return;
      /* a send: called, bound, handed on, named -- anything but asked about (`typeof S.channel.send`, `if (S.channel.send)`) */
      if (useOf(u.path).use !== 'test') hit(u.path.node);
      return;
    }
    hit(path.node);
  };
  /* v2.3.6446 (sitting 59): DENY BY DEFAULT on a key the tree cannot know.
     The objects that can hold the channel: every receiver of a `channel` key
     in the file (a name, `this`, a member chain), and a name bound to one.
     A key the tree cannot know on one of them (`S[k]`, `S[k].send(m)`) is
     counted however it is used (but put or deleted: no send); on any other
     object it is counted when its value is used as a channel would be (its
     `send` taken, or a name bound to it whose `send` is). */
  const holders = new Set();
  const holderOf = (o, path) => {
    o = unwrap(o);
    if (!o) return null;
    if (o.type === 'ThisExpression') return 'this';
    if (o.type === 'Identifier') return path.scope.getBinding(o.name) || ('g:' + o.name);
    if (isMember(o)) return 't:' + s.slice(o.start, o.end);
    return null;
  };
  visit(s, {
    'MemberExpression|OptionalMemberExpression'(path) { if (keyOf(path.node, path) === 'channel') { const h = holderOf(path.node.object, path); if (h) holders.add(h); } },
    VariableDeclarator(path) { const { id, init } = path.node; if (id.type === 'ObjectPattern' && init && id.properties.some((p) => p.type === 'ObjectProperty' && (p.computed ? patKey(p.key, path) : (p.key.name || String(p.key.value))) === 'channel')) { const h = holderOf(init, path); if (h) holders.add(h); } },
  });
  for (let i = 0, more = true; more && i < 4; i++) {
    more = false;
    visit(s, { VariableDeclarator(path) {
      const { id, init } = path.node;
      if (id.type !== 'Identifier' || !init || !holders.has(holderOf(init, path))) return;
      const b = path.scope.getBinding(id.name);
      if (b && !holders.has(b)) { holders.add(b); more = true; }
    } });
  }
  const sendsThrough = (b) => !!b && b.referencePaths.some((r) => isMember(r.parent) && r.parent.object === r.node && keyOf(r.parent, r.parentPath) === 'send');
  const unknownKey = (path) => {
    const p = path.parentPath;
    if ((p.isAssignmentExpression() && p.node.left === path.node) || (p.isUnaryExpression() && p.node.operator === 'delete')) return;   /* put, not used */
    if (holders.has(holderOf(path.node.object, path))) { hit(path.node); return; }
    const u = useOf(path);
    if (u.use === 'key' && u.key === 'send') { hit(path.node); return; }
    if (p.isVariableDeclarator() && p.node.id.type === 'Identifier' && sendsThrough(p.scope.getBinding(p.node.id.name))) hit(path.node);
  };
  visit(s, {
    'MemberExpression|OptionalMemberExpression'(path) {
      const k = keyOf(path.node, path);
      if (k === 'channel') chanUse(path);
      else if (k === null && path.node.computed) unknownKey(path);
    },
    Identifier(path) {
      if (!path.isReferencedIdentifier() || isMember(path.parent) && path.parent.property === path.node && !path.parent.computed) return;
      if (isChannel(path.node, path)) chanUse(path);
    },
  });
  return out;
}
function treeFetches(s) {
  const out = [];
  visit(s, { 'CallExpression|OptionalCallExpression'(path) {
    const c = path.node.callee;
    /* fetchWithTimeout is the owner key's way, held by 7b; `fetch.call(w, u)`'s
       address is its second argument, `fetch.apply(w, [u])`'s in a list */
    let a;
    if (isFetch(c, path)) a = path.node.arguments[0];
    else if (isMember(c) && keyOf(c, path) === 'call' && isFetch(c.object, path)) a = path.node.arguments[1];
    else if (isMember(c) && keyOf(c, path) === 'apply' && isFetch(c.object, path)) { const l = path.node.arguments[1]; a = l && l.type === 'ArrayExpression' ? l.elements[0] : null; }
    else return;
    if (!a) return;
    let text = s.slice(a.start, a.end);
    if (a.type === 'Identifier') {
      const b = path.scope.getBinding(a.name);
      const init = b && b.path.isVariableDeclarator() && b.path.node.init;
      if (init) text += ' ' + s.slice(init.start, init.end);
    }
    if (/\/api\//.test(text)) out.push({ line: path.node.loc.start.line, path: (/'(\/api\/[a-z_/]*)/.exec(text) || [])[1] || null });
  },
  /* v2.3.6441 (sitting 58): DENY BY DEFAULT -- a fetch used any way but
     called, `.call` / `.apply` / `.bind`, bound to a name (followed) or asked
     about (`typeof fetch`) is counted: its address cannot be read */
  'Identifier|MemberExpression|OptionalMemberExpression'(path) {
    const n = path.node;
    if (n.type === 'Identifier') {
      if (!path.isReferencedIdentifier() || (isMember(path.parent) && path.parent.property === n && !path.parent.computed)) return;
      if (!isFetch(n, path)) return;
    } else if (keyOf(n, path) !== 'fetch') return;
    const u = useOf(path);
    const p = path.parentPath;
    const called = (p.isCallExpression() || p.isOptionalCallExpression()) && p.node.callee === n;
    if (called || u.use === 'test' || u.use === 'name') return;
    if (u.use === 'key' && ['call', 'apply', 'bind'].includes(u.key)) return;
    out.push({ line: n.loc.start.line, path: null, cannot: true });
  } });
  return out;
}
{
  let sends = 0; const byFile = new Map();
  for (const [f, s] of SRC) {
    if (f === 'src/game/actions.js') continue;
    const n = treeSends(s).length;
    if (n) { sends += n; byFile.set(f, n); }
  }
  for (const [f, s] of SRC) for (const x of treeFetches(s)) if (!fetches.some((y) => y.f === f && y.line === x.line)) fetches.push({ f, ...x });
  check('7: ...the census reads the tree: `S.channel?.send`, a channel held in a name, a url built a line above',
    treeSends('function f(S, m) {\n S.channel?.send(m);\n const ch = S.channel; ch.send(m);\n this.channel.send(m);\n const g = S.channel.send.bind(S.channel);\n}').length === 4
    && treeSends('function f(ws, m, S) { ws.send(m); const x = { send: 1 }; if (typeof S.channel.send !== "function") return; }').length === 0
    && treeFetches("function f() { const u = (window.BT_API_BASE || '') + '/api/store/buy'; fetch(u, { method: 'POST' }); fetch('/img/a.png'); }").length === 1);
  /* v2.3.6441: sitting 57's plants, red by the tree */
  check('7: ...a bracket and a string, a template, a name of a name: `S[\'channel\'].send`, `S[`channel`].send`, `const a = S.channel; const b = a; b.send`',
    treeSends('function f(S, m) {\n S[\'channel\'].send(m);\n S[`channel`].send(m);\n const a = S.channel; const b = a; b.send(m);\n S.channel[\'send\'](m);\n}').length === 4);
  check('7: ...the fetch held in a name, bound, called through `.call` or `window.fetch`: `const go = fetch; go(\'/api/x\')`',
    treeFetches("function f(u) { const go = fetch; go('/api/a'); const g2 = fetch.bind(window); g2('/api/b'); fetch.call(window, '/api/c'); window['fetch']('/api/d'); const fetch2 = (x) => x; fetch2('/api/e'); }").length === 4);
  /* v2.3.6441: sitting 58's plant (review-z58.md, #2295) and the class
     around it: a channel or a fetch bound by any form is followed, and a use
     the census cannot follow is counted (deny by default) */
  check('7: ...a channel taken from a pattern, nested, a parameter\'s, put again, its send taken apart: `const { channel } = S; channel.send(m)`',
    treeSends('function f(S, m) {\n const { channel } = S; channel.send(m);\n const { channel: c = null } = S; c.send(m);\n const { net: { channel: d } } = S; d.send(m);\n let e; e = S.channel; e.send(m);\n const { send } = S.channel; send(m);\n}\nfunction g({ channel }, m) {\n channel.send(m);\n}').length === 6);
  check('7: ...DENY: a channel handed to a call, put into a list or a member, a key the census cannot know, counted',
    treeSends('function f(S, m, k) {\n relay(S.channel, m);\n const list = [S.channel];\n this.out = S.channel;\n S.channel[k](m);\n}').length === 4
    && treeSends('function f(S) {\n if (S.channel && S.channel.readyState === 1) return;\n const ok = S.channel && typeof S.channel.send === "function";\n S.channel = null;\n}').length === 0);
  /* v2.3.6446: sitting 59's plant (review-z59.md, #2295: `const k =
     'channel'; S[k].send(...)` in BroTown.jsx) and the class around it: a
     computed key read for its words, and a key the tree cannot know on an
     object that can hold the channel (or used as a channel would be) counted */
  check('7: ...a key in a name, a ternary, a pattern\'s computed key: `const k = \'channel\'; S[k].send(m)`',
    treeSends('function f(S, m, x) {\n const k = \'channel\'; S[k].send(m);\n S[x ? \'channel\' : \'net\'].send(m);\n const { [k]: c } = S; c.send(m);\n const s2 = \'send\'; S.channel[s2](m);\n}').length === 4);
  check('7: ...DENY: a key the tree cannot know on an object that holds the channel, an alias of it, or used as a channel (its send taken), counted',
    treeSends('function f(S, m, k) {\n if (!S.channel) return;\n S[k].send(m);\n const T = S; T[k](m);\n}').length === 2
    && treeSends('function g(o, m, k) {\n o[k].send(m);\n const c = o[k]; c.send(m);\n}').length === 2
    && treeSends('function h(S, o, k, v) {\n if (S.channel) S[k] = v;\n delete S[k];\n const t = o[k] + 1;\n return o[k] || t;\n}').length === 0);
  check('7: ...a fetch taken from a pattern (`const { fetch: go } = window; go(\'/api/x\')`), DENY: a fetch handed on, counted',
    treeFetches("function f() { const { fetch: go } = window; go('/api/a'); }").length === 1
    && treeFetches("function f() { retry(fetch, '/api/b'); const o = { f: window.fetch }; if (typeof fetch !== 'function') return; }").filter((x) => x.cannot).length === 2);
  const fx = fetches.filter((x) => !EXCEPT(x) && x.f !== 'src/game/actions.js').length;
  check(`7: sends outside the door (${sends}, in ${byFile.size} files) are at or under the line (${LINE.sends})`, sends <= LINE.sends, sends);
  check(`7: fetches of /api/ outside the door (${fx}) are at or under the line (${LINE.fetches})`, fx <= LINE.fetches, fx);
  if (sends < LINE.sends || fx < LINE.fetches) console.log(`NOTE the census fell (sends ${sends}, fetches ${fx}): lower LINE in this guard in the PR that moved them`);
}
process.exit(failed ? 1 : 0);
