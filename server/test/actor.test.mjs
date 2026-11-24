/* ═══ v2.3.6480: THE ACTOR, MADE ONCE (grand plan steps 10.1 and 11.2; card WHO PR 1) ═══
 *
 *   1. THE SOCKET'S ACTOR: made at the join, where it names the character:
 *      a `person`, its pid, its sitting's id (`stint`, the worker's clock),
 *      `wayIn` socket, `principal` and `permit` empty; frozen, and changed
 *      by nothing after (a second make keeps the first; a write throws).
 *   2. FROM PROOF THE SERVER HOLDS: a join's fields naming a kind, a stint,
 *      a way in or an actor change nothing; a test-mode character's actor
 *      is a `person`'s (test mode marks a character, not a hand); `qa` and
 *      `helper` are made by nothing.
 *   3. THE SITTING'S ID: the worker's clock at the join; two joins in one
 *      ms never share one; a new socket of the same character is a new
 *      actor (v2.3.6481: on the same sitting, inside the gap).
 *   4. THE OTHER WAYS IN: the room's constant (`system`, `room`), the
 *      owner's (`owner`, `admin`), and an HTTP call acting as its live
 *      session's actor (actorOf), none once the session is gone.
 *   5. THE LEDGER: a trade window settled by a test-mode character's
 *      confirm leaves an `xfer:` row whose `actor` says so (`test: true`
 *      beside the kind `person`); one settled out of test mode, none; a
 *      gift's actor is the accepter's; a settlement nobody's tap made, the
 *      room's.  Under ONE key, never flat.  Still one row a settlement.
 *   6. THE DAY'S BOOK: a test-mode sitting's seconds go under the `econ`
 *      part's `test` key, apart from play; a played sitting's at the top.
 *      Gold a test-mode character makes (gold.js's one call hands its
 *      record) under `test`; a player's at the top.  Items are not split
 *      (bagGive gets the bag alone).
 *      bookAddBy: a test-mode record's add under `test`, anyone else's (or
 *      none) at the top; `testmode: false` (the room's own question) adds
 *      with play.
 *   7. THE KILL SWITCH `actor: false`: no `actor` key on a row (the row's
 *      keys exactly as before), test play added with play, the cap not
 *      advertised.  On: the cap `actor: 1`.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-23:
 *   join.js: the actorSocket line taken out -> FAIL 1 (no actor) and FAIL 5
 *     (the row's actor null);
 *   actor.js actorRow: the `test` line taken out -> FAIL 5 ("says so");
 *   actor.js actorSocket: `if (session.actor) return session.actor` taken
 *     out -> FAIL 1 (a second make no longer keeps the first);
 *   actor.js stintNext: `last + 1` made `t` -> FAIL 3 (two joins in one ms);
 *   xfer.js: the `actorOff` guard taken out -> FAIL 7 (a key with the switch
 *     thrown);
 *   leave.js: bookAddBy back to bookAdd -> FAIL 6 (test seconds with play);
 *   daybook.js bookAdd: the `actorOff` test taken out -> FAIL 7;
 *   gold.js econGold: the record not passed (`, undefined, rec` taken out)
 *     -> FAIL 6 (test gold with play).
 * ...and the gatekeeper's three green plants (sitting 57), red since:
 *   gold.js econGold: the record passed for a mint only (`cls === 'mint' ?
 *     rec : undefined`) -> FAIL 6 (test gold burned with play);
 *   actor.js actorOf: `s.phase !== 'gone'` taken out -> FAIL 5 (a
 *     takeover's old sitting);
 *   actor.js actorRow: `test` from `ps._testMode` alone -> FAIL 5
 *     (`testmode: false`).
 * ...and the purpose review's (sitting 58):
 *   join.js: `if (!actorOff(this)) actorSocket(...)` -> FAIL 7 (joined off,
 *     traded on: `actor: null`).
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import { ACTOR, ROOM_ACTOR, actorOwner, actorOf, actorRow, actorSocket, actorOff, stintNext } from '../src/actor.js';
import { XFER, xferRow, xferDay } from '../src/xfer.js';
import { bookAddBy, bookDay, BOOK_TEST } from '../src/daybook.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 23, 12, 0, 0), seed: 5 }).install();
const DAY = xferDay(clock.now());
const xrows = (st) => [...st._store.keys()].filter((k) => k.startsWith(XFER.PREFIX)).sort().map((k) => st._store.get(k));
const seed = (pids, coins, inv) => new Map(pids.map((p) => ['rpg:' + p, { _v: 21, coins, inventory: { ...(inv || {}) }, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }]));
const cmd = (r, ws, type, payload) => r.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
const testOn = (m, pid) => m.set('testmode:' + pid, { v: 1, on: true, at: clock.now(), name: pid });
const sessOf = (room, ws) => room.sessions.get(ws);
const capsOf = (ws) => { const m = ws.sent.find((x) => x && x.type === 'state_sync'); return m ? (m.caps || (m.payload && m.payload.caps) || null) : null; };

/* ══════════ 1. THE SOCKET'S ACTOR ══════════ */
{
  const st = makeStorage(seed(['bp_ac_one'], 50));
  const room = await openRoom(st);
  const ws = fakeWs('one');
  const t0 = clock.now();
  await join(room, ws, 'bp_ac_one', { loginTaken: true });
  const a = sessOf(room, ws) && sessOf(room, ws).actor;
  check('1. the join made the session\'s actor: a person, its pid, by the socket', !!a && a.kind === 'person' && a.pid === 'bp_ac_one' && a.wayIn === 'socket', a);
  check('1. ...its sitting\'s id the worker\'s clock at the join', !!a && a.stint === t0, { stint: a && a.stint, t0 });
  check('1. ...`principal` and `permit` empty (calls 14, step 11.7)', !!a && a.principal === null && a.permit === null);
  check('1. ...exactly the six fields of SHAPES part 1', !!a && Object.keys(a).sort().join() === 'kind,permit,pid,principal,stint,wayIn', a && Object.keys(a));
  check('1. ...frozen', !!a && Object.isFrozen(a));
  let threw = false;
  try { sessOf(room, ws).actor = { kind: 'owner' }; } catch (e) { threw = true; }
  check('1. changed by nothing: writing the session\'s actor throws, and it stays', threw && sessOf(room, ws).actor === a);
  check('1. ...a second make keeps the first', actorSocket(room, sessOf(room, ws), 'bp_other', clock.now() + 99) === a && sessOf(room, ws).actor.pid === 'bp_ac_one');
  /* the session's other fields still copy (a spread never breaks on it) */
  const copy = { ...sessOf(room, ws) };
  check('1. ...a copy of the session carries it as a plain field', copy.actor === a);
}

/* ══════════ 2. FROM PROOF THE SERVER HOLDS ══════════ */
{
  const m = seed(['bp_ac_claim', 'bp_ac_test'], 50);
  testOn(m, 'bp_ac_test');
  const st = makeStorage(m);
  const room = await openRoom(st);
  const ws = fakeWs('claim');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_ac_claim', name: 'claim', phrase: 'p-c', protocolVersion: 2, ws: [1, 5],
    kind: 'qa', stint: 7, wayIn: 'room', actor: { kind: 'owner' }, data: { x: 100, y: 100, z: 'town', kind: 'qa', actor: { kind: 'qa' } } }));
  await settle();
  const a = sessOf(room, ws).actor;
  check('2. a join\'s fields naming a kind, a stint, a way in or an actor change nothing', !!a && a.kind === 'person' && a.stint === clock.now() && a.wayIn === 'socket', a);
  const wt = fakeWs('test');
  await join(room, wt, 'bp_ac_test', { loginTaken: true });
  check('2. a test-mode character\'s actor is a person\'s (test mode marks a character, not a hand)', room._testMode(room.playerState.bp_ac_test) && sessOf(room, wt).actor.kind === 'person' && !('test' in sessOf(room, wt).actor), sessOf(room, wt).actor);
  check('2. `qa` and `helper` are kinds nothing makes; the built ones are person, owner, system', ACTOR.BUILT.join() === 'person,owner,system' && ACTOR.KINDS.includes('qa') && !ACTOR.BUILT.includes('qa') && !ACTOR.BUILT.includes('helper'));
}

/* ══════════ 3. THE SITTING'S ID ══════════ */
{
  const st = makeStorage(seed(['bp_ac_s1', 'bp_ac_s2'], 50));
  const room = await openRoom(st);
  const w1 = fakeWs('s1'), w2 = fakeWs('s2');
  await join(room, w1, 'bp_ac_s1', { loginTaken: true });
  await join(room, w2, 'bp_ac_s2', { loginTaken: true });   /* the clock has not moved: one ms */
  const a1 = sessOf(room, w1).actor;
  const s1 = a1.stint, s2 = sessOf(room, w2).actor.stint;
  check('3. two joins in one ms never share a sitting\'s id', s1 !== s2 && s2 === s1 + 1, { s1, s2 });
  check('3. ...the ids run on the room\'s clock (stintNext)', stintNext({}, 5) === 5 && stintNext({ _stintLast: 9 }, 5) === 10);
  clock.advance(1000);
  const w3 = fakeWs('s1b');
  await join(room, w3, 'bp_ac_s1', { loginTaken: true });   /* the same character again: takes the first over */
  const a3 = sessOf(room, w3).actor;
  /* v2.3.6481 (card WHO PR 2): ...and the same sitting, a second later
     (sitting.js carries the stint inside five quiet minutes; sitting.test) */
  check('3. a new socket of the same character is a new actor, on the same sitting', !!a3 && a3 !== a1 && a3.pid === 'bp_ac_s1' && a3.stint === s1, { a3, s1 });
}

/* ══════════ 4. THE OTHER WAYS IN ══════════ */
{
  check('4. the room\'s constant: a system, by the room, nobody\'s pid or sitting', ROOM_ACTOR.kind === 'system' && ROOM_ACTOR.wayIn === 'room' && ROOM_ACTOR.pid === null && ROOM_ACTOR.stint === null && Object.isFrozen(ROOM_ACTOR));
  const o = actorOwner();
  check('4. the owner\'s: by the admin door, no pid (the character an owner\'s route changes is its target)', o.kind === 'owner' && o.wayIn === 'admin' && o.pid === null && Object.isFrozen(o));
  const st = makeStorage(seed(['bp_ac_http'], 50));
  const room = await openRoom(st);
  const ws = fakeWs('http');
  await join(room, ws, 'bp_ac_http', { loginTaken: true });
  check('4. an HTTP call acts as its live session\'s actor (actorOf)', actorOf(room, 'bp_ac_http') === sessOf(room, ws).actor && actorOf(room, 'bp_nobody') === null);
  await room.webSocketClose(ws, 1000, 'bye', true); await settle();
  check('4. ...and none once the session is gone', actorOf(room, 'bp_ac_http') === null);
}

/* ══════════ 5. THE LEDGER ══════════ */
const A = 'bp_ac_a', B = 'bp_ac_b';
async function windowTo(m, flags, afterJoins) {
  const st = makeStorage(m);
  const room = await openRoom(st, flags);
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true });
  await join(room, wb, B, { loginTaken: true });
  if (afterJoins) afterJoins(room);   /* v2.3.6480: a live flag thrown between the joins and the trade (§7) */
  await cmd(room, wa, 'trade2_open', { target: B }); await settle();
  await cmd(room, wb, 'trade2_open', { target: A }); await settle();
  await cmd(room, wa, 'trade2_set', { offer: { _gold: 120, fish_minnow: 4 } }); await settle();
  await cmd(room, wb, 'trade2_set', { offer: { ore_iron_ore: 2 } }); await settle();
  await cmd(room, wa, 'trade2_ready', { ready: true }); await settle();
  await cmd(room, wb, 'trade2_ready', { ready: true }); await settle();
  clock.advance(3000);
  await cmd(room, wa, 'trade2_confirm'); await settle();
  await cmd(room, wb, 'trade2_confirm'); await settle();
  return { st, room, wa, wb };
}
const world = (testB) => {
  const m = seed([A], 500, { fish_minnow: 10 });
  for (const [k, v] of seed([B], 300, { ore_iron_ore: 6 })) m.set(k, v);
  if (testB) testOn(m, B);
  return m;
};
const ROW_KEYS = 'at,by,day,from,gold,goods,ids,price,road,to,v';   /* the row's keys before v2.3.6480 */
{
  const { st, room, wb } = await windowTo(world(true));
  const rs = xrows(st);
  const row = rs[0];
  const a = row && row.actor;
  check('5. a trade made in test mode leaves ONE `xfer:` row whose actor says so', rs.length === 1 && room.playerState[B].coins === 420 && !!a && a.test === true && a.kind === 'person', { rows: rs.length, actor: a });
  check('5. ...the actor is the last confirm\'s (B\'s session, its sitting, by the socket)', !!a && a.pid === B && a.stint === sessOf(room, wb).actor.stint && a.wayIn === 'socket' && row.by === B, a);
  check('5. ...under ONE key, never its fields flat beside the row\'s own', 'actor' in row && Object.keys(row).filter((k) => k !== 'actor').sort().join() === ROW_KEYS, Object.keys(row));
  check('5. ...the empty fields are left out of the row (principal, permit)', !!a && !('principal' in a) && !('permit' in a));
}
{
  const { st } = await windowTo(world(false));
  const row = xrows(st)[0];
  check('5. a trade made out of test mode: a person\'s actor, no `test`', !!row && !!row.actor && row.actor.kind === 'person' && !('test' in row.actor) && row.actor.pid === B, row && row.actor);
}
{
  /* the gift: the accepter's actor */
  const m = seed([A], 200);
  for (const [k, v] of seed([B], 100)) m.set(k, v);
  m.set('liveflags', { trade2: false });
  testOn(m, A);   /* the SENDER in test mode: the accepter's tap settled it */
  const st = makeStorage(m);
  const room = await openRoom(st);
  await join(room, fakeWs('a'), A, { loginTaken: true });
  await join(room, fakeWs('b'), B, { loginTaken: true });
  await room._interceptTrade(A, { type: 'trade_offer', payload: { target: B, fromName: 'A', offer: { _gold: 50 } } });
  await room._interceptTrade(B, { type: 'trade_accept', payload: { target: A } }); await settle();
  const row = xrows(st)[0];
  check('5. a gift\'s actor is the accepter\'s (its character not in test mode: no `test`)', !!row && row.actor && row.actor.pid === B && row.actor.kind === 'person' && !('test' in row.actor), row && row.actor);
}
{
  /* nobody's tap: the room's */
  const st = makeStorage();
  const room = await openRoom(st);
  await xferRow(room, { road: 'gift_trade', id: 'g-room', from: 'bp_x', to: 'bp_y', gives: { _gold: 5 }, price: {}, by: null });
  const row = xrows(st)[0];
  check('5. a settlement nobody\'s tap made: the room\'s actor (system, room)', !!row && row.actor && row.actor.kind === 'system' && row.actor.wayIn === 'room' && !('pid' in row.actor), row && row.actor);
  await xferRow(room, { road: 'gift_trade', id: 'g-gone', from: 'bp_x', to: 'bp_y', gives: { _gold: 5 }, price: {}, by: 'bp_x' });
  const gone = st._store.get(XFER.PREFIX + DAY + ':g-gone');
  check('5. ...a tap whose session is gone: `actor: null` (never made up)', !!gone && gone.actor === null, gone);
  check('5. actorRow of nothing, or of a kind not on the list, is null', actorRow(room, null) === null && actorRow(room, { kind: 'boss' }) === null);
  /* v2.3.6480 (the gatekeeper's review, sitting 57): a takeover's old
     session is `gone` while _leaveRun awaits, and may come first in the
     room's list: the actor is the live session's, never the old sitting's */
  {
    const P = 'bp_ac_take', a1 = { kind: 'person', pid: P, stint: 1, wayIn: 'socket' }, a2 = { kind: 'person', pid: P, stint: 2, wayIn: 'socket' };
    const fake = { sessions: new Map([[{}, { id: P, phase: 'gone', actor: a1 }], [{}, { id: P, phase: 'playing', actor: a2 }]]) };
    const only = { sessions: new Map([[{}, { id: P, phase: 'gone', actor: a1 }]]) };
    check('5. actorOf: a takeover\'s gone session is passed over for the live one', actorOf(fake, P) === a2 && actorOf(only, P) === null, { got: actorOf(fake, P), only: actorOf(only, P) });
  }
  /* ...and `test` is the room's question (the record's mark AND the
     `testmode` switch), never the mark alone */
  {
    const P = 'bp_ac_tmoff';
    const r3 = await openRoom(makeStorage(), { testmode: false });
    r3.playerState[P] = { _testMode: true };
    const row3 = actorRow(r3, { kind: 'person', pid: P, stint: 1, wayIn: 'socket' });
    check('5. `testmode: false`: a marked character\'s row carries no `test` (the switch is asked, not the mark)', !!row3 && row3.pid === P && !('test' in row3), row3);
  }
}

/* ══════════ 6. THE DAY'S BOOK ══════════ */
const econOf = (room) => { const d = room._daybook && room._daybook.days.get(bookDay(clock.now())); return d ? d.parts.econ : null; };
async function sitting(testmode, flags) {
  const m = seed(['bp_ac_sit'], 50);
  if (testmode) testOn(m, 'bp_ac_sit');
  const st = makeStorage(m);
  const room = await openRoom(st, flags);
  const ws = fakeWs('sit');
  await join(room, ws, 'bp_ac_sit', { loginTaken: true });
  sessOf(room, ws).openedAt = clock.now();
  clock.advance(90 * 1000);
  await room.webSocketClose(ws, 1000, 'bye', true); await settle();
  return { room, econ: econOf(room) || (st._store.get('daybook:' + bookDay(clock.now())) || {}).econ || {} };
}
{
  const t = await sitting(true);
  check('6. a test-mode sitting\'s seconds go under the `econ` part\'s `test` key', t.econ[BOOK_TEST] && t.econ[BOOK_TEST].p && t.econ[BOOK_TEST].p.s === 90 && !(t.econ.p && t.econ.p.s), t.econ);
  const p = await sitting(false);
  check('6. ...a played sitting\'s at the top, nothing under `test`', p.econ.p && p.econ.p.s === 90 && !p.econ[BOOK_TEST], p.econ);
}
{
  /* gold: the door's one call (gold.js econGold) hands the purse's record */
  const m = seed(['bp_ac_gt', 'bp_ac_gp'], 50);
  testOn(m, 'bp_ac_gt');
  const room = await openRoom(makeStorage(m));
  await join(room, fakeWs('gt'), 'bp_ac_gt', { loginTaken: true });
  await join(room, fakeWs('gp'), 'bp_ac_gp', { loginTaken: true });
  const e0 = JSON.parse(JSON.stringify(econOf(room) || {}));
  const g = (e, t) => Number(((t ? (e.test || {}) : e).g || {}).mint) || 0;
  room._goldGive(room.playerState.bp_ac_gt, 40, 'quest_reward');
  room._goldGive(room.playerState.bp_ac_gp, 15, 'quest_reward');
  const e1 = econOf(room);
  check('6. gold a test-mode character makes is booked under `test`; a player\'s at the top', g(e1, true) - g(e0, true) === 40 && g(e1, false) - g(e0, false) === 15, { e0, e1 });
  check('6. ...the purses themselves paid as before', room.playerState.bp_ac_gt.coins === 90 && room.playerState.bp_ac_gp.coins === 65);
  /* v2.3.6480 (the gatekeeper's review, sitting 57): and gold BURNED, the
     door's other class (a plant booking a test-mode burn with play was green) */
  const b = (e, t) => Number(((t ? (e.test || {}) : e).g || {}).burn) || 0;
  const e1b = JSON.parse(JSON.stringify(econOf(room) || {}));
  room._goldTake(room.playerState.bp_ac_gt, 10, 'weapon_forge');
  room._goldTake(room.playerState.bp_ac_gp, 5, 'weapon_forge');
  const e2 = econOf(room);
  check('6. gold a test-mode character burns is booked under `test`; a player\'s at the top', b(e2, true) - b(e1b, true) === 10 && b(e2, false) - b(e1b, false) === 5, { e1b, e2 });
  check('6. ...the purses paid as before', room.playerState.bp_ac_gt.coins === 80 && room.playerState.bp_ac_gp.coins === 60);
}
{
  const st = makeStorage();
  const room = await openRoom(st);
  const day = () => room._daybook.days.get(bookDay(clock.now())).parts.econ;
  bookAddBy(room, 'econ', { g: { mint: 7 } }, { _testMode: true });
  bookAddBy(room, 'econ', { g: { mint: 3 } }, { _testMode: false });
  bookAddBy(room, 'econ', { g: { mint: 2 } }, null);
  bookAddBy(room, 'econ', { i: { mint: { fish_minnow: 4 } } }, { _testMode: true });
  check('6. bookAddBy: a test-mode record\'s add under `test`, anyone\'s else (or none) at the top', day().test.g.mint === 7 && day().g.mint === 5 && day().test.i.mint.fish_minnow === 4, day());
  const r2 = await openRoom(makeStorage(), { testmode: false });
  bookAddBy(r2, 'econ', { g: { mint: 7 } }, { _testMode: true });
  const d2 = r2._daybook.days.get(bookDay(clock.now())).parts.econ;
  check('6. ...`testmode: false` (test mode off for all): added with play', d2.g.mint === 7 && !d2.test, d2);
}

/* ══════════ 7. THE KILL SWITCH ══════════ */
{
  const { st, room, wb } = await windowTo(world(true), { actor: false });
  check('7. `actor: false` reads off', actorOff(room) === true && actorOff({ _liveFlags: {} }) === false);
  const row = xrows(st)[0];
  check('7. ...the row has no `actor`: its keys exactly as before', !!row && Object.keys(row).sort().join() === ROW_KEYS && room.playerState[B].coins === 420, row && Object.keys(row));
  check('7. ...the cap is not advertised', !!capsOf(wb) && capsOf(wb).actor === undefined);
  const t = await sitting(true, { actor: false });
  check('7. ...test play\'s seconds added with play', t.econ.p && t.econ.p.s === 90 && !t.econ[BOOK_TEST], t.econ);
  const r2 = await openRoom(makeStorage(), { actor: false });
  bookAddBy(r2, 'econ', { g: { mint: 7 } }, { _testMode: true });
  check('7. ...bookAddBy adds a test-mode record\'s with play', r2._daybook.days.get(bookDay(clock.now())).parts.econ.g.mint === 7);
}
{
  const { wb } = await windowTo(world(false));
  check('7. on: the cap `actor: 1`', !!capsOf(wb) && capsOf(wb).actor === 1, capsOf(wb));
}
{
  /* v2.3.6480 (the gatekeeper's purpose review, sitting 58): joined while
     `actor: false`, the switch thrown back on, then the trade: the row says
     who settled it (actor.js's header: "thrown back on needs no rejoin").
     A join that made no actor with the switch off would write `actor: null`
     here, and the off-only checks above stayed green. */
  const { st, room, wb } = await windowTo(world(true), { actor: false }, (r) => { r._liveFlags = {}; });
  const row = xrows(st)[0];
  const a = row && row.actor;
  check('7. off at the join, on at the trade: the row\'s actor is the last confirm\'s, never null', actorOff(room) === false && !!a && a.kind === 'person' && a.pid === B && a.test === true && a.stint === sessOf(room, wb).actor.stint, row && row.actor);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
