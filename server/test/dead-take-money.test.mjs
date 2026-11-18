/* ═══ v2.3.6022 (card RV; TRAPS §150, V3's `deadtake`): THE DEAD TAKE NOTHING, IN THE MONEY'S FOUR ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), routed by the planning session: four
 * handlers took gold or goods from a body in its dying seconds -- the arena's
 * stake, the Auction House's offer, the gift trade's sender and the trade
 * window's Accept -- the four V3 left on traps-money §150's census for card
 * RV.  Each now reads the life phase (life.js lifeOf) and refuses with the
 * answer its phone already knows, behind V3's switch `deadtake`.
 *
 *   1. the arena: a dying backer's stake refused (`down`), no gold taken;
 *   2. the Auction House: a dying player's offer refused, no gold taken;
 *      2b. a resend of one placed before the death gets its first answer;
 *   3. the gift trade: a dying sender's gift not taken (the accepter refused);
 *   4. the trade window: an Accept with a dying side cancelled, nothing taken;
 *   5. `deadtake: false`: each as before (taken).
 *
 * Red on main before this change: checks 1, 2, 3 and 4 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';
import { ARENA } from '../src/gladiator.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const A = 'bp_rvdeada01', B = 'bp_rvdeadb01', X = 'bp_rvdeadx01', Y = 'bp_rvdeady01';
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };
const rec = () => ({ _v: RPG_SCHEMA_VERSION, coins: 1000, inventory: { slime_gel: 5 }, level: 10, hp: 100, maxHp: 100, _econ: ECON });

async function world(flags) {
  const st = makeStorage(new Map([A, B, X, Y].map((p) => ['rpg:' + p, rec()])));
  const room = await openRoom(st, flags);
  const ws = {};
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { for (const p of [A, B, X, Y]) { ws[p] = fakeWs(p); await join(room, ws[p], p, { loginTaken: true }); } } finally { [console.warn, console.error] = back; }
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(3);
  const dying = (p) => { const ps = room.playerState[p]; ps.dying = true; ps.life = 'dying'; };
  const coins = (p) => room.playerState[p].coins;
  const sent = (p, type) => ws[p].sent.filter((m) => m.type === type).map((m) => m.payload);
  return { st, room, ws, dying, coins, sent };
}

async function arena(flags) {
  const W = await world(flags);
  W.room._arena = { id: 'T_rv1', status: 'running', round: 1, matches: [{ id: 'm1', a: X, b: Y, round: 1 }], players: [], rounds: [] };
  W.dying(A);
  const c0 = W.coins(A);
  try { await W.room._handleArenaSponsor({ id: A }, { targetId: X, amount: ARENA.STAKE_MIN }); } catch (e) { /* as it may */ }
  await settleN(4);
  return { taken: c0 - W.coins(A), err: W.sent(A, 'arena_stake_error').map((e) => e.code) };
}
async function offer(flags) {
  const W = await world(flags);
  await W.room._stEnsureIndex();
  W.room._stIndex.set('L_rvd_1', { id: 'L_rvd_1', sellerId: B, sellerName: 'B', kind: 'item', askPrice: 500, createdAt: Date.now(), expiresAt: Date.now() + 864e5, disp: { name: 'Stick' } });
  W.dying(A);
  const c0 = W.coins(A);
  try { await W.room._handleStoreOffer({ id: A }, { listingId: 'L_rvd_1', gold: 200 }); } catch (e) { /* as it may */ }
  await settleN(4);
  return { taken: c0 - W.coins(A), err: W.sent(A, 'store_offer_error').map((e) => e.error) };
}
/* v2.3.6022 (sitting 45's review): the refusal sits inside the request-once
   run -- an offer placed alive and re-sent (same reqId) after the death gets
   its first answer back, taken once; a new one while dying is refused with
   its reqId echoed */
async function offerAgain() {
  const W = await world(null);
  await W.room._stEnsureIndex();
  W.room._stIndex.set('L_rvd_2', { id: 'L_rvd_2', sellerId: B, sellerName: 'B', kind: 'item', askPrice: 500, createdAt: Date.now(), expiresAt: Date.now() + 864e5, disp: { name: 'Stick' } });
  const c0 = W.coins(A);
  await W.room._handleStoreOffer({ id: A }, { listingId: 'L_rvd_2', gold: 200, reqId: 'rvdOffer1' });
  await settleN(4);
  W.dying(A);
  await W.room._handleStoreOffer({ id: A }, { listingId: 'L_rvd_2', gold: 200, reqId: 'rvdOffer1' });
  await W.room._handleStoreOffer({ id: A }, { listingId: 'L_rvd_2', gold: 300, reqId: 'rvdOffer2' });
  await settleN(4);
  const states = W.sent(A, 'store_offer_state').filter((p) => p.reqId === 'rvdOffer1');
  const errs = W.sent(A, 'store_offer_error');
  return { taken: c0 - W.coins(A), firstAgain: states.length, errOne: errs.filter((e) => e.reqId === 'rvdOffer1').length, errTwo: errs.filter((e) => e.reqId === 'rvdOffer2').map((e) => e.error) };
}
async function gift(flags) {
  const W = await world(flags);
  await W.room._interceptTrade(A, { type: 'trade_offer', payload: { target: B, fromName: 'A', offer: { _gold: 100 } } });
  W.dying(A);
  const c0 = W.coins(A);
  try { await W.room._interceptTrade(B, { type: 'trade_accept', payload: { target: A } }); } catch (e) { /* as it may */ }
  await settleN(4);
  return { taken: c0 - W.coins(A) };
}
async function window2(flags) {
  const W = await world(flags);
  const cmd = (p, type, payload) => W.room.webSocketMessage(W.ws[p], JSON.stringify({ type, payload: payload || {} }));
  await cmd(A, 'trade2_open', { target: B });
  await cmd(B, 'trade2_open', { target: A });
  await cmd(A, 'trade2_set', { offer: { _gold: 100 } });
  await cmd(A, 'trade2_ready', { ready: true });
  await cmd(B, 'trade2_ready', { ready: true });
  /* past the window's cooling (a change just before the confirm) */
  const s = W.room._t2SessionFor ? W.room._t2SessionFor(A) : null;
  if (s) for (const k of Object.keys(s)) if (/At$/.test(k) && typeof s[k] === 'number') s[k] -= 60000;
  await cmd(A, 'trade2_confirm');
  W.dying(A);
  const c0 = W.coins(A);
  await cmd(B, 'trade2_confirm');
  await settleN(6);
  return { taken: c0 - W.coins(A), open: !!s };
}

{
  const a = await arena(null), o = await offer(null), g = await gift({ giftclosed: false }), w = await window2(null);
  check('1. the arena: a dying backer\'s stake refused (down), no gold taken', a.taken === 0 && a.err.includes('down'), a);
  check('2. the Auction House: a dying player\'s offer refused, no gold taken', o.taken === 0 && o.err.includes('Not while you are down'), o);
  check('3. the gift trade: a dying sender\'s gift not taken', g.taken === 0, g);
  check('4. the trade window: an Accept with a dying side takes nothing', w.taken === 0, w);
}
{
  const r = await offerAgain();
  check('2b. an offer placed alive, re-sent after the death: its first answer again (taken once); a new one refused with its reqId', r.taken === 200 && r.firstAgain === 2 && r.errOne === 0 && r.errTwo.includes('Not while you are down'), r);
}
{
  const a = await arena({ deadtake: false }), o = await offer({ deadtake: false }), g = await gift({ deadtake: false, giftclosed: false }), w = await window2({ deadtake: false });
  check('5. `deadtake: false`: as before (the stake, the offer, the gift and the window\'s gold taken)', a.taken === ARENA.STAKE_MIN && o.taken === 200 && g.taken === 100 && w.taken === 100, { a, o, g, w });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
