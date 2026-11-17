/* ═══ v2.3.5725: THREE SMALL GUARDS (card K2 PR 6) ═══
 *
 * The second red team's three small findings in the wire's files:
 *
 *   a. a frame of its own whose handler throws reached the runtime as the
 *      room's own uncaught error (a bundle's part was caught: index.js
 *      webSocketMessage).  Now it is caught and logged as the bundle's
 *      part is: the message is dropped, the socket and the room go on;
 *   b. a Workshop `dungeon_start` (no `entrance`) was taken wherever the
 *      player stood, out in a land mid-fight too (dungeon.js).  Now it needs
 *      the Wheel's safe ground (`dungeonground`); a mouth's start, today's
 *      town and the farm as before;
 *   c. the market's two public reads (`/orders`, `/my`) showed each order's
 *      request id (`reqId`).  Now they leave it out; the stored order keeps
 *      it, so a repeat still acts once (reqonce.js).
 *
 * Red on main (v2.3.5719): a, b and c. */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { LAST_PLACE } from '../src/lastplace.js';
import { wheelTable } from '../src/wheeltables.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const quiet = async (f) => { const e = console.error, w = console.warn; const logged = []; console.error = (...a) => logged.push(a.join(' ')); console.warn = () => {}; try { await f(); } finally { console.error = e; console.warn = w; } return logged; };

/* ── a. a frame of its own that throws ── */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('a');
  await join(room, ws, 'bp_tg_a', { loginTaken: true });
  /* a handler that throws, as an object where a scalar goes made some do */
  const real = room._onMessage;
  room._onMessage = async function (w, s, m) { if (m && m.type === 'boom') throw new Error('an object where a scalar goes'); return real.call(this, w, s, m); };
  let escaped = null;
  const logged = await quiet(async () => {
    try { await room.webSocketMessage(ws, JSON.stringify({ type: 'boom', payload: { id: { x: 1 } } })); } catch (e) { escaped = e.message; }
  });
  check('a. a frame of its own whose handler throws does not reach the runtime', escaped === null, escaped);
  check('a. ...it is logged once, as a bundle\'s part is', logged.length === 1 && /\[message\] boom threw/.test(logged[0]), logged);
  check('a. ...and the socket goes on: its next message is handled', await (async () => { const n = ws.sent.length; await room.webSocketMessage(ws, JSON.stringify({ type: 'ping', t: 1 })); await settle(); return room.sessions.has(ws) && ws.sent.length >= n; })());
  room._onMessage = real;
}

/* ── b. a Workshop run starts on safe ground ── */
{
  const C = wheelTable(5).WHEEL_CENTRE;
  const ARR = { x: C[0], y: C[1] + LAST_PLACE.ARRIVAL_DY };
  const FAR = { x: C[0] + 20000, y: C[1] };
  const start = async (flags, at) => {
    const room = await openRoom(makeStorage(), flags);
    const ws = fakeWs('d');
    await join(room, ws, 'bp_tg_d', { loginTaken: true, data: { x: at.x, y: at.y, z: 'wheel' } });
    const ps = room.playerState.bp_tg_d;
    ps.x = at.x; ps.y = at.y; ps.z = 'wheel';
    const safe = room._wheelSafeAt(at.x, at.y);
    ws.sent.length = 0;
    await quiet(async () => { await room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 3, difficulty: 'normal' } } })); await settle(); });
    const err = ws.sent.find((m) => m.type === 'dungeon_error');
    const ok = ws.sent.find((m) => m.type === 'dungeon_started');
    return { safe, err: err ? (err.payload || err) : null, ok: !!ok, runs: room._dungeons ? room._dungeons.size : 0 };
  };
  const far = await start(null, FAR);
  check('b. (guard) out in a land is not safe ground; the arrival is', far.safe === false && (await start(null, ARR)).safe === true);
  check('b. a Workshop start out in a land is refused, no run made', !far.ok && far.runs === 0 && !!far.err, far);
  check('b. ...with the door\'s own `not-now` words (no new words)', far.err && (far.err.code === 'not-now' || far.err.reason === 'not-now') && /right now/.test(far.err.message || ''), far.err);
  const home = await start(null, ARR);
  check('b. a Workshop start on BroTown\'s safe ground is taken, as before', home.ok && home.runs === 1, home);
  const off = await start({ dungeonground: false }, FAR);
  check('b. `dungeonground: false`: taken anywhere, as before', off.ok && off.runs === 1, off);
}

/* ── c. the public reads leave out the request id ── */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('m');
  await join(room, ws, 'bp_tg_m', { loginTaken: true });
  const ss = ws.sent.find((m) => m.type === 'state_sync');
  const tok = ss && ss.httpToken;
  const A = room.playerState.bp_tg_m;
  A.weaponStash = [{ name: 'Axe 1', tierMult: 1, dmg: 5 }, { name: 'Axe 2', tierMult: 1, dmg: 5 }];
  const route = async (method, path, body) => {
    const init = { method, headers: { 'Content-Type': 'application/json', ...(tok ? { 'x-bt-auth': tok } : {}) } };
    if (body) init.body = JSON.stringify(body);
    return (await room.fetch(new Request('https://x' + path, init))).json();
  };
  const sell = { type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: 'bp_tg_m', stashIndex: 0, reqId: 'tg-place-1' };
  const p1 = await route('POST', '/api/market/place', sell);
  check('c. (guard) the order is placed with its request id', p1 && p1.ok && p1.order && p1.order.reqId === 'tg-place-1', p1);
  const book = await route('GET', '/api/market/orders?category=weapon&subtype=axe&tier=mythic');
  const mine = await route('GET', '/api/market/my?playerId=bp_tg_m');
  const inBook = (book.orders || []).find((o) => o.id === p1.order.id);
  const inMine = (mine.orders || []).find((o) => o.id === p1.order.id);
  check('c. the public book shows the order without its request id', inBook && !('reqId' in inBook) && inBook.price === 300 && inBook.playerId === 'bp_tg_m', inBook);
  check('c. ...and so does a player\'s list by its id', inMine && !('reqId' in inMine), inMine);
  const p2 = await route('POST', '/api/market/place', sell);
  check('c. the stored order keeps it: the same request again acts once (reqonce)', p2 && p2.order && p2.order.id === p1.order.id && A.weaponStash.length === 1, { p2: p2 && p2.order && p2.order.id, stash: A.weaponStash.length });
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
