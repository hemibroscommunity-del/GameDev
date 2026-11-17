/* ═══ v2.3.5811 (card RV, PR 11): A FRIENDSHIP IS BOTH SIDES OR NEITHER, AND
 * A REQUEST NOBODY ANSWERS RUNS OUT ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md):
 *
 *   ACC-5 (low).  An accept added each side only while its own list had
 *   room: a list that filled between the request and the accept made a
 *   friendship of one side, which could message the other for ever, while the
 *   other could not remove it.  Now a full list refuses the accept (the
 *   request kept, the full list's own answer), and a friendship of one side is
 *   ended by the side it names too (`friendfix`).
 *
 *   SEC-F4 (card SEC's Found).  Requests a player received never ran out:
 *   50 throwaways filled the ceiling for good.  Now one received 30 days ago
 *   and never answered is let go where the record is written anyway
 *   (`friendfix`; no write of its own).
 *
 *   1. an accept with the requester's list full: refused, `target-full`, the
 *      request kept, neither list changed;
 *   2. a friendship of one side: the side it names can end it;
 *   3. a ceiling of 50 requests a month old: a new request is let in, the old
 *      ones let go;
 *   4. `friendfix: false`: as before (1 half-accepts, 2 does nothing, 3 is
 *      refused).
 *
 * Red on main before this change: checks 1, 2 and 3 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { FRIENDS } from '../src/friends.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const A = 'bp_rvfra0001', B = 'bp_rvfrb0001', Y = 'bp_rvfry0001';

async function three(flags) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const ws = { a: fakeWs('a'), b: fakeWs('b'), y: fakeWs('y') };
  await join(room, ws.a, A, { loginTaken: true });
  await join(room, ws.b, B, { loginTaken: true });
  await join(room, ws.y, Y, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const send = async (w, type, payload) => { await room.webSocketMessage(w, JSON.stringify({ type, payload: payload || {} })); await settleN(2); };
  return { st, room, ws, send };
}
const fill = (doc, n, prefix) => { for (let i = 0; i < n; i++) doc.list[prefix + i] = { name: 'F' + i, since: 1 }; };

/* ── 1. an accept with the requester's list full ── */
async function acceptFull(flags) {
  const R = await three(flags);
  await R.send(R.ws.b, 'friend_request', { target: A, name: 'A' });   /* B asks A */
  const db = await R.room._friendsDoc(B);
  fill(db, FRIENDS.LIST_MAX, 'bp_rvfill_');                            /* then B's list fills */
  await R.room._friendsPut(B, db);
  R.ws.a.sent.length = 0;
  await R.send(R.ws.a, 'friend_accept', { from: B });                 /* A accepts */
  const da = await R.room._friendsDoc(A), db2 = await R.room._friendsDoc(B);
  const err = R.ws.a.sent.filter((m) => m.type === 'friend_error').map((m) => m.payload.reason);
  return { aHasB: !!da.list[B], bHasA: !!db2.list[A], kept: !!da.reqIn[B], err };
}
{
  const r = await acceptFull(null);
  check('1. an accept with the requester\'s list full: refused (target-full), the request kept, neither list changed', !r.aHasB && !r.bHasA && r.kept && r.err[0] === 'target-full', r);
}

/* ── 2. a friendship of one side ── */
async function oneSided(flags) {
  const R = await three(flags);
  const da = await R.room._friendsDoc(A);
  da.list[B] = { name: 'B', since: 1 };                               /* A holds B; B does not hold A */
  await R.room._friendsPut(A, da);
  await settleN(2);
  await R.send(R.ws.b, 'friend_remove', { fid: A });                  /* B ends it */
  const da2 = await R.room._friendsDoc(A);
  return { aStillHasB: !!da2.list[B] };
}
{
  const r = await oneSided(null);
  check('2. a friendship of one side is ended by the side it names', r.aStillHasB === false, r);
}

/* ── 3. a ceiling of old requests ── */
async function staleCeiling(flags) {
  const R = await three(flags);
  const dy = await R.room._friendsDoc(Y);
  const old = Date.now() - 31 * 86400000;
  for (let i = 0; i < FRIENDS.REQ_IN_MAX; i++) dy.reqIn['bp_rvold_' + i] = { name: 'Old' + i, at: old };
  await R.room._friendsPut(Y, dy);
  await settleN(2);
  R.ws.a.sent.length = 0;
  await R.send(R.ws.a, 'friend_request', { target: Y, name: 'Y' });
  const dy2 = await R.room._friendsDoc(Y);
  const err = R.ws.a.sent.filter((m) => m.type === 'friend_error').map((m) => m.payload.reason);
  return { got: !!dy2.reqIn[A], left: Object.keys(dy2.reqIn).length, err };
}
{
  const r = await staleCeiling(null);
  check('3. 50 requests a month old: a new one is let in, the old ones let go', r.got && r.left === 1 && r.err.length === 0, r);
}

/* ── 4. the kill switch ── */
{
  const a = await acceptFull({ friendfix: false });
  const o = await oneSided({ friendfix: false });
  const s = await staleCeiling({ friendfix: false });
  check('4. `friendfix: false`: as before (a half accept, no remove, the ceiling full)', a.aHasB && !a.bHasA && o.aStillHasB && !s.got && s.err[0] === 'target-full', { a, o, s });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
