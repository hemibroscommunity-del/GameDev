/* ═══ v2.3.5813 (card RV, PR 13): THE JACKPOT'S DEPOSIT ASKS THE PURSE AGAIN AFTER ITS AWAITS ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding MD-3.  The deposit checked the
 * purse, awaited the week's draw twice, then took with no second check, and
 * the gold door clamps a short take: a purse fallen in between bought the
 * full tickets for less gold.  Nothing can come between today (each await is
 * storage), so the suite makes the purse fall inside the await, as a future
 * await that is not storage would.
 *
 *   1. an honest deposit: the gold taken, the tickets granted;
 *   2. the purse fallen during the awaits: refused, nothing taken, no
 *      tickets, the pool unchanged;
 *   3. `jackcheck: false`: as before (the tickets for less gold).
 *
 * Red on main before this change: check 2 fails.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}
const P = 'bp_rvjackp01';

async function deposit(flags, fall) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const ws = fakeWs('p');
  await join(room, ws, P, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState[P];
  room._goldSet(ps, 500, 'restore');
  await settle();
  if (fall) {
    const get = st.storage.get.bind(st.storage);
    let fell = false;   /* once: the purse falls inside the deposit's first await */
    st.storage.get = async (k) => { const v = await get(k); if (k === 'jackpot:draw' && !fell) { fell = true; room._goldSet(ps, 100, 'restore'); } return v; };
  }
  await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_deposit', payload: { amount: 500 } }));
  for (let i = 0; i < 4; i++) await settle();
  const draw = st._store.get('jackpot:draw') || { pool: 0, entries: {} };
  return { coins: ps.coins, pool: draw.pool || 0, tickets: (draw.entries || {})[P] || 0 };
}

{
  const r = await deposit(null, false);
  check('1. an honest deposit: 500 taken, 10 tickets, the pool 500', r.coins === 0 && r.tickets === 10 && r.pool === 500, r);
}
{
  const r = await deposit(null, true);
  check('2. the purse fallen to 100 during the awaits: refused, nothing taken, no tickets', r.coins === 100 && r.tickets === 0 && r.pool === 0, r);
}
{
  const r = await deposit({ jackcheck: false }, true);
  check('3. `jackcheck: false`: as before (10 tickets for 100 gold)', r.coins === 0 && r.tickets === 10, r);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
