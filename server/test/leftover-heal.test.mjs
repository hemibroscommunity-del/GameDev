/* ═══ v2.3.5809 (card RV, PR 9): A "YES" WAITS FOR A BID HALF MADE, AND A
 * PAYMENT AND ITS ESCROW'S DELETE ARE ONE WRITE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md):
 *
 *   MS-5 (low).  An Auction House offer's "Yes" did not ask about a bid being
 *   escrowed (`pendBid`), as a buy, an accepted bid and a cancel do: a bid
 *   whose request failed after taking its gold waits for the heal, and a Yes
 *   in between sold the listing out of the index, so that gold was never
 *   given back.  Now a Yes waits, in the buy's own words (`offerpend`).
 *
 *   MS-6 (low).  The trade window's weapons and the arena's champion paid
 *   in one write and deleted their escrow record in the next: a restart
 *   between left a record only the payment's stamp explained, and the 48 h
 *   prune could outrun the sweep that reads it (TRAPS §146).  Now one write
 *   (inbox.js _creditWith; `leftoverheal`).
 *
 *   1. a Yes while a bid is half made: refused; `offerpend: false`: as before;
 *   2. a cancelled trade window's weapon refund cut at each write: never a
 *      record left that only the refund's stamp explains;
 *   3. the arena's crown cut at each write: never an entry left that only the
 *      pot's stamp explains;
 *   4. `leftoverheal: false`: the old two writes (2 and 3 leave one).
 *
 * Red on main before this change: checks 1a, 2 and 3 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const A = 'bp_rvlhplya1', B = 'bp_rvlhplyb1';

async function pair(flags) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  await join(room, fakeWs('a'), A, { loginTaken: true });
  await join(room, fakeWs('b'), B, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(2);
  return { st, room };
}

/* ── 1. a Yes while a bid is half made ── */
async function yesWhilePending(flags) {
  const { room } = await pair(flags);
  await room._stEnsureIndex();
  const rec = { id: 'L_rvlh_1', sellerId: A, sellerName: 'A', askPrice: 500, expiresAt: Date.now() + 864e5, disp: { name: 'Stick' },
    offers: { [B]: { gold: 300, at: Date.now() } }, pendBid: { seq: 1, bidderId: 'bp_rvlhbid01', amount: 400, at: Date.now() } };
  room._stIndex.set(rec.id, rec);
  try { return await room._stOfferReply(rec.id, A, B, 'yes'); } catch (e) { return { threw: String(e && e.message) }; }
}
{
  const r = await yesWhilePending(null);
  check('1a. a Yes while a bid is half made is refused, in the buy\'s own words', r && r.ok === false && r.error === 'Someone is buying that right now', r);
  const off = await yesWhilePending({ offerpend: false });
  check('1b. `offerpend: false`: not refused by it, as before', !(off && off.error === 'Someone is buying that right now'), off);
}

/* ── 2. a cancelled trade window's weapon refund, cut at each write ── */
async function refundCut(flags, cut) {
  const { st, room } = await pair(flags);
  const weapon = { name: 'RV Trade Blade', type: 'greatsword', gearBase: 'iron', tier: 'common', tierMult: 1 };
  const s = { id: 'tw_rvlh_1', a: A, b: B, weapons: { [A]: [{ seq: 7, weapon }], [B]: [] } };
  await st.storage.put('trade2wpn:' + A + ':7', { pid: A, sid: s.id, seq: 7, weapon, at: Date.now() });
  await settleN(2);
  st.crashAt(st.batches() + cut);
  await room._t2RefundWeapons(s);
  await settleN(6);
  return { rec: st._store.has('trade2wpn:' + A + ':7'), stamp: st._store.has('oplog:trade2:' + s.id + ':wpnrefund:' + A + ':7') };
}
{
  const bad = [];
  for (let cut = 0; cut <= 3; cut++) { const r = await refundCut(null, cut); if (r.rec && r.stamp) bad.push({ cut, ...r }); }
  check('2. a trade window\'s weapon refund cut at each write: never a record left that only its stamp explains', bad.length === 0, bad);
}

/* ── 3. the arena's crown, cut at each write ── */
async function crownCut(flags, cut) {
  const { st, room } = await pair(flags);
  const tid = 'T_rvlh_1';
  room._arena = { id: tid, status: 'running', players: [{ playerId: A, playerName: 'A' }, { playerId: B, playerName: 'B' }], rounds: [] };
  await st.storage.put({ ['arena_entry:' + tid + ':' + A]: { fee: 100 }, ['arena_entry:' + tid + ':' + B]: { fee: 100 } });
  await settleN(2);
  st.crashAt(st.batches() + cut);
  try { room._arenaCrown({ playerId: A, playerName: 'A' }); } catch (e) { return { threw: String(e && e.message) }; }
  await settleN(10);
  const entries = [...st._store.keys()].filter((k) => k.startsWith('arena_entry:' + tid)).length;
  return { entries, stamp: st._store.has('oplog:arenapot:' + tid) };
}
{
  const bad = [];
  let threw = null;
  for (let cut = 0; cut <= 4; cut++) {
    const r = await crownCut(null, cut);
    if (r.threw) { threw = r.threw; break; }
    if (r.entries && r.stamp) bad.push({ cut, ...r });
  }
  check('3. (setup) the crown runs', !threw, threw);
  check('3. the arena\'s crown cut at each write: never an entry left that only the pot\'s stamp explains', !threw && bad.length === 0, bad);
}

/* ── 4. the kill switch ── */
{
  let refundLeft = false, crownLeft = false;
  for (let cut = 0; cut <= 3 && !refundLeft; cut++) { const r = await refundCut({ leftoverheal: false }, cut); if (r.rec && r.stamp) refundLeft = true; }
  for (let cut = 0; cut <= 4 && !crownLeft; cut++) { const r = await crownCut({ leftoverheal: false }, cut); if (!r.threw && r.entries && r.stamp) crownLeft = true; }
  check('4. `leftoverheal: false`: the old two writes (a cut between leaves a stamp-only record)', refundLeft && crownLeft, { refundLeft, crownLeft });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
