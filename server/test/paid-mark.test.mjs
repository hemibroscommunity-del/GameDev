/* ═══ v2.3.5810 (card RV PR 10, MD-2): THE PAID MARK IN THE CREDIT'S OWN RUN ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding MD-2: the daily spin's pot, the
 * login spin and a season's tiers saved their "paid" mark in a later write
 * than the credit.  A restart between left the pot open with its payment's
 * stamp on file; once the 48 h prune took the stamp, the same pot paid again
 * (TRAPS §146).  The owner, 2026-11-18: "Yes to all" (one row more a daily
 * spin payout).  Now the marked record rides the credit's run (`paidmark`).
 *
 *   1. a daily spin's pot cut at each write: never a record still open on
 *      file beside its payment's stamp;
 *   2. the login spin's pot cut at each write: never a record unpaid on file
 *      beside its payment's stamp;
 *   3. ...and paid once, the gold on the player once;
 *   4. `paidmark: false`: the old order (a cut between leaves the stamp
 *      beside an open pot, and an unpaid login spin);
 *   5. (sitting 45's review) a season's "claim all" cut after its first
 *      write loses no tier: the season is left out of paidmark.
 *
 * Red on main before this change: checks 1, 2 and 3 fail (on main the pot's
 * record is saved only by its caller, after the pay).
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { DAILY } from '../src/dailyrewards.js';
import { LOGIN_SPIN } from '../src/loginspin.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const P = 'bp_rvpaid0001';

async function one(flags) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  await join(room, fakeWs('a'), P, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(3);
  return { st, room };
}

/* ── 1. the daily spin's pot ── */
async function spinCut(flags, cut) {
  const { st, room } = await one(flags);
  const rec = await room._drLoad(P);
  rec.sp.open = 1; rec.sp.pot = 120; rec.sp.run = 'rvrun1';
  await room._drSave(P);
  await settleN(2);
  const coins0 = room.playerState[P].coins || 0;
  st.crashAt(st.batches() + cut);
  try { await room._spinPay(P, rec, null); } catch (e) { /* a crashed write */ }
  await settleN(6);
  const onFile = st._store.get(DAILY.KEY + P);
  return { open: !!(onFile && onFile.sp && onFile.sp.open), stamp: st._store.has('oplog:spinpot:' + P + ':rvrun1'), paid: (room.playerState[P].coins || 0) - coins0 };
}
/* ── 2. the login spin's pot ── */
async function loginCut(flags, cut) {
  const { st, room } = await one(flags);
  const acct = 'rvacct1';
  const rec = { day: 20000, open: false, paid: false, pid: P, pot: 75, k: 1 };
  await st.storage.put(LOGIN_SPIN.KEY + acct, rec);
  await settleN(2);
  const coins0 = room.playerState[P].coins || 0;
  st.crashAt(st.batches() + cut);
  try { await room._loginSpinSettle(acct, rec); } catch (e) { /* a crashed write */ }
  await settleN(6);
  const onFile = st._store.get(LOGIN_SPIN.KEY + acct);
  return { unpaid: !(onFile && onFile.paid), stamp: st._store.has('oplog:loginspin:' + acct + ':20000'), paid: (room.playerState[P].coins || 0) - coins0 };
}

{
  const bad1 = [], bad2 = [];
  for (let cut = 0; cut <= 3; cut++) {
    const a = await spinCut(null, cut); if (a.open && a.stamp) bad1.push({ cut, ...a });
    const b = await loginCut(null, cut); if (b.unpaid && b.stamp) bad2.push({ cut, ...b });
  }
  check('1. a daily spin\'s pot cut at each write: never open on file beside its payment\'s stamp', bad1.length === 0, bad1);
  check('2. the login spin\'s pot cut at each write: never unpaid on file beside its payment\'s stamp', bad2.length === 0, bad2);
  const whole1 = await spinCut(null, 99), whole2 = await loginCut(null, 99);
  check('3. ...uncut, each pays once and is marked', whole1.paid === 120 && !whole1.open && whole2.paid === 75 && !whole2.unpaid, { whole1, whole2 });
}
{
  let left1 = false, left2 = false;
  for (let cut = 0; cut <= 3; cut++) {
    const a = await spinCut({ paidmark: false }, cut); if (a.open && a.stamp) left1 = true;
    const b = await loginCut({ paidmark: false }, cut); if (b.unpaid && b.stamp) left2 = true;
  }
  check('4. `paidmark: false`: the old order (a cut between leaves the stamp beside an open pot, and an unpaid login spin)', left1 && left2, { left1, left2 });
}

/* ── 5. (sitting 45's review) a season's "claim all" cut after its first
   write: no tier is lost -- the season is left out of paidmark, so nothing
   is marked on file until every grant is paid, and a claim again pays what
   is left (each grant once, by its stamp) ── */
{
  const FLAGS = { season: true };
  const st = makeStorage();
  const room = await openRoom(st, FLAGS);
  const ws = fakeWs('s');
  await join(room, ws, P, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(3);
  const rec = await room._drLoad(P);
  await room._drRollover(P, rec, room._drNow());
  rec.se.st = 999999;   /* every tier reached */
  await room._drSave(P);
  await settleN(2);
  const want = DAILY.SEASON.TIERS.reduce((n, g) => n + g.filter((x) => x.kind === 'coins' || x.kind === 'item').length, 0);
  st.crashAt(st.batches() + 1);
  try { await room._handleSeasonClaim({ id: P }, { all: true }); } catch (e) { /* a crashed write */ }
  await settleN(6);
  /* the restart: a new room on what was written */
  const st2 = makeStorage(new Map(st._store));
  const room2 = await openRoom(st2, FLAGS);
  await join(room2, fakeWs('s2'), P, { loginTaken: true });
  if (room2.tickInterval) { clearInterval(room2.tickInterval); room2.tickInterval = null; }
  await settleN(3);
  await room2._handleSeasonClaim({ id: P }, { all: true });
  await settleN(6);
  const stamps = [...st2._store.keys()].filter((k) => k.startsWith('oplog:season:' + P + ':')).length;
  check('5. a season "claim all" cut after its first write: a claim again pays every grant (none lost)', stamps === want, { stamps, want });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
