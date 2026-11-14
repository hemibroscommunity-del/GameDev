/* ═══ v2.3.5184: THE WIRE DOOR HOLDS (grand plan step 4.1, step 3; card K PR 4) ═══
 *
 * server/src/wire/door.js checks every message (index.js `_onMessage`) and
 * every web request to the room's routes (GameRoom `fetch`) before any
 * handler, from the wire table's `trust` column (lists.js WIRE_DOOR_ROWS).
 * It refuses only what no page of the game sends.  This suite holds:
 *
 *   1. the socket's judge: each refusal (a key named like the prototype's at
 *      the top, deep, inside an array; a payload that is no plain object; a
 *      named field's number not finite; a `words` field not a string or past
 *      its bound; a request id outside SHAPES' form), and what passes (a
 *      field no row names, null, an honest frame of each kind, a good id);
 *   2. the room: a refused frame reaches no handler, is silent, and is
 *      counted (the socket's `wireDoor`, the room's `_wireDoorCounts`), a
 *      bundle's refused part alone;
 *   3. the routes: a query's name, a body's key, a body that is no object,
 *      a named field past its form are answered 400; a good request goes on
 *      to its route;
 *   4. made from the table: a row's `trust` changed reaches the door with no
 *      other edit (`wireDoorRows` with a probe row);
 *   5. the request id the page's action door makes (src/game/actions.js
 *      `makeReqId`'s form) passes;
 *   6. THE SWITCH THROWN (the plan's rule 4): `wiredoor: false` and every
 *      frame of §1 and §2 reaches its handler as before, every route of §3
 *      its route, and nothing is counted.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *   1. door.js: BAD_KEYS without 'constructor'                 -> FAIL 3
 *   2. index.js: the router's `if (this._wireDoor(session, msg)) return;` removed -> FAIL 2
 *   3. liveops.js: `_wireDoorOff` returning false always        -> FAIL 6
 *
 * Not a phone test: node, card E's test room (testroom.mjs).  Under a
 * second. */
import { WIRE_DOOR, wireDoorJudge, wireDoorRouteJudge, wireDoorRouteRow } from '../src/wire/door.js';
import { wireDoorRows } from '../src/wire/lists.js';
import { WIRE_IN } from '../src/wire/in.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
};
const P = (t) => JSON.parse(t);

/* ── 1. the socket's judge ── */
const REFUSED = [
  ['a key `__proto__` at the top', P('{"type":"move","__proto__":{"x":1},"x":1,"y":1}'), 'key'],
  ['a key `constructor` in the payload', P('{"type":"chat","payload":{"constructor":{"prototype":{"a":1}},"text":"hi"}}'), 'key'],
  ['a key `prototype` deep', P('{"type":"move","x":1,"y":1,"f":{"a":{"b":{"prototype":1}}}}'), 'key'],
  ['a key `__proto__` inside an array', P('{"type":"move","x":1,"y":1,"eqc":[{"__proto__":{"a":1}}]}'), 'key'],
  ['a payload that is an array', { type: 'player_jump', payload: [1, 2] }, 'body'],
  ['a payload that is a string', { type: 'chat', payload: 'hi' }, 'body'],
  ['a named number not finite (`move` x, sent as 1e999)', P('{"type":"move","x":1e999,"y":1}'), 'number x'],
  ['a not-finite number inside a named field', P('{"type":"move","x":1,"y":1,"eqc":{"a":-1e999}}'), 'number eqc'],
  ['a `words` field that is no string (`pet_name` name)', { type: 'pet_name', payload: { id: 'p1', name: { a: 1 } } }, 'words name'],
  ['a `words` field past its bound', { type: 'pet_name', payload: { id: 'p1', name: 'x'.repeat(WIRE_DOOR.WORDS_MAX + 1) } }, 'words name'],
  ['a request id outside SHAPES\' form (payload)', { type: 'achv_title', payload: { id: 't', reqId: 'a b/../!' } }, 'reqId'],
  ['a request id too long (top)', { type: 'achv_title', reqId: 'r'.repeat(65), payload: { id: 't' } }, 'reqId'],
  ['a request id that is a number', { type: 'achv_title', payload: { id: 't', reqId: 5 } }, 'reqId'],
];
for (const [what, msg, want] of REFUSED) {
  const why = wireDoorJudge(msg);
  check(`1: refused: ${what} (${want})`, why === want, why);
}
const PASSED = [
  ['an honest move', { type: 'move', x: 100, y: 120, d: 'down', f: 'se', eqc: { helmet: 'iron' }, eql: null, ex: null, z: 'town', vx: 0, vy: 0, dodging: false, blocking: false }],
  ['an honest chat', { type: 'chat', payload: { text: 'hello there', from: 'bp_a', fromName: 'Ada' } }],
  ['an honest join', { type: 'join', id: 'bp_a', name: 'Ada', phrase: 'p', protocolVersion: 2, ws: [1, 5], data: { x: 1, y: 2, z: 'town', name: 'Ada', look: { hair: 2 } } }],
  ['an honest track', { type: 'track', data: { aw: 0, ac: [1, 2], name: 'Ada' } }],
  ['a pong (no body)', { type: 'pong', ts: 5 }],
  ['null where a field goes (a page\'s NaN arrives as null)', { type: 'move', x: null, y: 1 }],
  ['a field no row names, of any form (an older or a newer phone\'s)', P('{"type":"move","x":1,"y":1,"zz_new":{"a":[1,2]},"zz_inf":1e999}')],
  ['a type no row names (the router drops it, as before)', { type: 'zz_not_a_type', payload: { a: 1 } }],
  ['a `words` field at its bound', { type: 'pet_name', payload: { id: 'p1', name: 'x'.repeat(WIRE_DOOR.WORDS_MAX) } }],
  ['a request id in SHAPES\' form', { type: 'achv_title', payload: { id: 't', reqId: 'rq-mf3k2a-1-x9' } }],
  ['a payload of null', { type: 'pong', payload: null }],
];
for (const [what, msg] of PASSED) {
  const why = wireDoorJudge(msg);
  check(`1: passes: ${what}`, why === '', why);
}

/* ── the room ── */
const A = 'bp_wd_aaa';
async function newRoom(flags) {
  const st = makeStorage(new Map([['rpg:' + A, { _v: 21, coins: 100, level: 3, hp: 100, maxHp: 100, inventory: {} }]]));
  const room = await openRoom(st, flags);
  const ws = await join(room, fakeWs('a'), A, { name: 'Ada' });
  await settle();
  return { room, ws, st };
}
/* a handler of our own on the room, to see what reaches it */
function spy(room, method) {
  const seen = [];
  const real = room[method];
  room[method] = function (...a) { seen.push(a); return real ? real.apply(this, a) : undefined; };
  return seen;
}

/* ── 2. the room: refused frames reach no handler, and are counted ── */
async function roomCases(flags) {
  const w = await newRoom(flags);
  const seenTitle = spy(w.room, '_achvTitle');
  const sess = w.room.sessions.get(w.ws);
  const sent0 = w.ws.sent.length;
  await w.room.webSocketMessage(w.ws, '{"type":"achv_title","payload":{"id":"t","__proto__":{"polluted":1}}}');
  await w.room.webSocketMessage(w.ws, JSON.stringify({ type: 'achv_title', payload: { id: 't', reqId: 'not ok!' } }));
  /* a bundle: the bad part alone is refused, the good one goes on */
  await w.room.webSocketMessage(w.ws, JSON.stringify([{ type: 'achv_title', payload: { id: 't', reqId: '!!' } }, { type: 'achv_title', payload: { id: 't2' } }]));
  await settle();
  return { w, seenTitle, sess, sentAfter: w.ws.sent.length - sent0, polluted: ({}).polluted !== undefined };
}
{
  const r = await roomCases();
  check('2: a refused frame reaches no handler (2 frames and a bundle\'s bad part refused; the good part goes on)', r.seenTitle.length === 1 && r.seenTitle[0][1] && r.seenTitle[0][1].id === 't2', r.seenTitle.map((a) => a[1]));
  check('2: ...each counted: the socket\'s `wireDoor` 3, the room\'s counts by type and why', r.sess.wireDoor === 3 && r.w.room._wireDoorCounts['achv_title key'] === 1 && r.w.room._wireDoorCounts['achv_title reqId'] === 2, [r.sess.wireDoor, r.w.room._wireDoorCounts]);
  check('2: ...and nothing polluted', !r.polluted);
}

/* ── 3. the routes ── */
const req = (path, method, body, headers) => new Request('https://worker.test' + path, { method, headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: body === undefined ? undefined : body });
{
  const q = (s) => new URLSearchParams(s);
  check('3: judge: a query named `__proto__` -> key', wireDoorRouteJudge('http:/api/store/browse', q('__proto__=1'), undefined) === 'key');
  check('3: judge: a body that is an array -> body', wireDoorRouteJudge('http:/api/market/place', q(''), [1]) === 'body');
  check('3: judge: a body key `constructor` deep -> key', wireDoorRouteJudge('http:/api/market/place', q(''), P('{"a":{"constructor":1}}')) === 'key');
  check('3: judge: a request id outside the form, in the body or the query -> reqId',
    wireDoorRouteJudge('http:/api/store/buy', q(''), { reqId: 'bad id' }) === 'reqId' && wireDoorRouteJudge('http:/api/store/buy', q('reqId=bad%20id'), undefined) === 'reqId');
  check('3: judge: a `words` field past its bound -> words (feedback\'s text)', wireDoorRouteJudge('http:/api/feedback/submit', q(''), { text: 'x'.repeat(WIRE_DOOR.WORDS_MAX + 1) }) === 'words text');
  check('3: judge: an honest body passes', wireDoorRouteJudge('http:/api/market/place', q(''), { side: 'buy', itemKey: 'copper_ore', qty: 2, price: 5, playerId: A }) === '');
  check('3: the route\'s row: by its method first, then its path', wireDoorRouteRow('/api/admin/freeze', 'POST') === 'http:/api/admin/freeze POST' && wireDoorRouteRow('/api/store/buy', 'POST') === 'http:/api/store/buy' && wireDoorRouteRow('/api/zz', 'GET') === '');
}
async function routeCases(flags) {
  const w = await newRoom(flags);
  const seen = spy(w.room, '_storeFetch');
  const bad1 = await w.room.fetch(req('/api/store/buy', 'POST', '{"__proto__":{"a":1},"listingId":"x"}'));
  const bad2 = await w.room.fetch(req('/api/store/browse?__proto__=1', 'GET'));
  const good = await w.room.fetch(req('/api/store/browse', 'GET'));
  return { w, seen, bad1: bad1.status, bad2: bad2.status, good: good.status };
}
{
  const r = await routeCases();
  check('3: the room answers 400 to a body\'s `__proto__` and a query\'s, and they reach no route', r.bad1 === 400 && r.bad2 === 400 && r.seen.length === 1, [r.bad1, r.bad2, r.seen.length]);
  check('3: ...a good request goes on to its route', r.good !== 400 && r.seen.length >= 1 && new URL(r.seen[r.seen.length - 1][0].url).search === '', r.good);
  check('3: ...each counted by its row', r.w.room._wireDoorCounts['http:/api/store/buy key'] === 1 && r.w.room._wireDoorCounts['http:/api/store/browse key'] === 1, r.w.room._wireDoorCounts);
}

/* ── 4. made from the table ── */
{
  const probe = { ...WIRE_IN[0], name: 'zz_probe', trust: { note: 'words' } };
  const rows = wireDoorRows({ inn: [...WIRE_IN, probe] });
  const msg = { type: 'zz_probe', payload: { note: 5 } };
  check('4: a row added to the table reaches the door with no other edit', wireDoorJudge(msg, rows.SOCKET) === 'words note' && wireDoorJudge(msg) === '');
  const changed = wireDoorRows({ inn: WIRE_IN.map((r) => (r.name === 'pet_name' ? { ...r, trust: { id: 'request', name: 'request' } } : r)) });
  check('4: ...and a field\'s trust changed in the table changes what the door holds it to', wireDoorJudge({ type: 'pet_name', payload: { id: 'p', name: 5 } }, changed.SOCKET) === '' && wireDoorJudge({ type: 'pet_name', payload: { id: 'p', name: 5 } }) === 'words name');
}

/* ── 5. the page's request ids pass ── */
{
  /* src/game/actions.js makeReqId: 'rq-' + time, count and a random part in
     base 36 (card K PR 5); its form is SHAPES part 2's */
  const ids = ['rq-mf3k2a-1-x9', 'rq-0-0-0', 'a', 'A_b-9'.repeat(12).slice(0, 64)];
  check('5: a request id in SHAPES\' form passes (the action door\'s, and the form\'s edges)', ids.every((id) => WIRE_DOOR.REQ_ID_RE.test(id) && wireDoorJudge({ type: 'achv_title', payload: { id: 't', reqId: id } }) === ''), ids);
}

/* ── 6. the switch thrown: today's way ── */
{
  const r = await roomCases({ wiredoor: false });
  check('6: wiredoor: false -- every frame reaches its handler as before (the two frames and both parts)', r.seenTitle.length === 4, r.seenTitle.length);
  check('6: ...nothing counted', !r.sess.wireDoor && !r.w.room._wireDoorCounts, [r.sess.wireDoor, r.w.room._wireDoorCounts]);
  const h = await routeCases({ wiredoor: false });
  check('6: ...every route request reaches its route, none answered by the door', h.seen.length === 3 && h.bad1 !== 400 && h.bad2 !== 400 && !h.w.room._wireDoorCounts, [h.seen.length, h.bad1, h.bad2]);
  /* the judge itself is unchanged: the switch is read by the room's doors */
  check('6: ...the hostile frames of §1 are still judged when the switch is on again', REFUSED.every(([, msg, want]) => wireDoorJudge(msg) === want));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
