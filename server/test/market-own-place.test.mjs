/* ═══ v2.3.5801 (card RV, PR 2): THE GENERAL STORE FILES A SELL UNDER ITS
 * WEAPON, AND A REFUND AND ITS ORDER'S DELETE ARE ONE WRITE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), two findings in market.js:
 *
 *   MS-2 (high).  A sell order's place in the book -- category, kind, tier --
 *   was the request's word (only its gems were the weapon's, v2.3.3513).  A
 *   copper blade sent as `godly` met the head of the godly BUY bucket and
 *   sold at once at the buyer's price: the buyer paid 15,000 for a copper
 *   blade and never had a step to look.  Now a sell files itself under its
 *   weapon's own `gearBase` and `type` (`mkttier`).
 *
 *   MS-4 (high when it lands, rare).  A cancel pays the escrow back
 *   (`refund:<id>`) and deletes the order in the NEXT write.  A restart
 *   between the two left the order on file with only the stamp to say so;
 *   the stamp prune (48 h) waited for the wake scan, which finished notes
 *   only, so after a quiet 48 h the order came back on the book and a second
 *   cancel paid the weapon again.  Now the order's delete rides the refund's
 *   own write (inbox.js _creditWith; handoff rule 5), so there is no
 *   leftover to find (`mktheal`).
 *
 *   1. a copper blade sent as godly does not cross a resting godly buy; it is
 *      filed under copper, and the buyer keeps their gold;
 *   2. an honest sell still crosses its own bucket; a mis-pick in the tier
 *      row (a bow filed as iron) lands under the bow's own tier; a legacy
 *      blob naming no tier keeps the request's (as before);
 *   3. `mkttier: false`: the request's word, as before (the hole is back);
 *   4. a cancel is one write; cut at each of its writes, woken 49 h on with
 *      nobody opening the General Store, the prune run: the weapon (or the
 *      buy's gold) comes back exactly once;
 *   5. `mktheal: false`: the old two writes (the order back, a second refund);
 *   6. the cost: a wake scan of a book with nothing to finish writes nothing.
 *
 * Red on main before this change: 10 checks fail (1a-1e, 2c, 2e, 4a-4c).
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { OP_PRUNE } from '../src/inbox.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };

const blade = (name, type, gearBase) => ({ name, type, gearBase, tier: 'common', tierMult: 1, element1: null, element2: null });

/* two players in a fresh room, the buyer with gold, the seller with `weapon` */
async function pair(flags, weapon) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const B = 'bp_rvbuyer01', S = 'bp_rvseller1';
  await join(room, fakeWs('b'), B, { loginTaken: true });
  await join(room, fakeWs('s'), S, { loginTaken: true });
  const pb = room.playerState[B], ps = room.playerState[S];
  room._goldSet(pb, 20000, 'restore');
  room._goldSet(ps, 0, 'restore');
  ps.weaponStash = [weapon];
  room._saveRpg(B, pb); room._saveRpg(S, ps);
  await settleN(3);
  await room._mktEnsureIndex();
  return { st, room, B, S, pb, ps };
}

/* ── 1. a copper blade sent as godly ── */
{
  const { room, B, S, pb, ps } = await pair(null, blade('Copper Greatsword', 'greatsword', 'copper'));
  const buy = await room._mktPlaceOrder({ type: 'buy', price: 15000, playerId: B, category: 'weapon', subtype: 'greatsword', tierKey: 'godly' });
  check('1. (setup) a godly buy order rests', buy.ok && !buy.matched && pb.coins === 5000, buy);
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 1, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'godly' });
  await settleN(6);
  check('1a. the copper blade sent as godly does not cross the godly buy', sell.ok && !sell.matched, sell);
  check('1b. ...the seller is paid nothing', room.playerState[S].coins === 0, room.playerState[S].coins);
  check('1c. ...the buyer gets no blade and their order still rests', (room.playerState[B].weaponStash || []).length === 0 && room._mktQueryOrders(null, null, null, B, 100).length === 1);
  check('1d. ...the sell is filed under its weapon\'s own tier', sell.order && sell.order.tierKey === 'copper' && sell.order.subtype === 'greatsword' && sell.order.category === 'weapon', sell.order);
  check('1e. ...and its label is copper\'s', sell.order && /copper/i.test(sell.order.tierLabel), sell.order && sell.order.tierLabel);
  void ps;
}

/* ── 2. honest sells ── */
{
  const { room, B, S } = await pair(null, blade('Copper Greatsword', 'greatsword', 'copper'));
  await room._mktPlaceOrder({ type: 'buy', price: 300, playerId: B, category: 'weapon', subtype: 'greatsword', tierKey: 'copper' });
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 250, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'copper' });
  await settleN(6);
  check('2a. an honest copper sell crosses the copper buy at its price', sell.ok && sell.matched && room.playerState[S].coins === 300, { sell, coins: room.playerState[S].coins });
  check('2b. ...and the buyer has the blade', (room.playerState[B].weaponStash || []).some((w) => w && w.name === 'Copper Greatsword'));
}
{
  const { room, S } = await pair(null, blade('Softwood Bow', 'bow', 'ww_softwood'));
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 40, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'iron' });
  check('2c. a mis-pick in the tier row: the bow is filed under its own kind and tier', sell.ok && sell.order.subtype === 'bow' && sell.order.tierKey === 'ww_softwood', sell.order);
}
{
  const { room, S } = await pair(null, { name: 'Old Blob', damage: 9 });
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 40, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'staff', tierKey: 'iron' });
  check('2d. a legacy blob naming no tier keeps the request\'s (as before)', sell.ok && sell.order.subtype === 'staff' && sell.order.tierKey === 'iron', sell);
}
{
  const { room, S } = await pair(null, blade('Old Sword', 'sword', 'wood'));
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 40, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'bow', tierKey: 'godly' });
  check('2e. a retired wooden sword files where the book moves it: a copper greatsword', sell.ok && sell.order.subtype === 'greatsword' && sell.order.tierKey === 'copper', sell.order);
}

/* ── 3. the kill switch ── */
{
  const { room, B, S } = await pair({ mkttier: false }, blade('Copper Greatsword', 'greatsword', 'copper'));
  await room._mktPlaceOrder({ type: 'buy', price: 15000, playerId: B, category: 'weapon', subtype: 'greatsword', tierKey: 'godly' });
  const sell = await room._mktPlaceOrder({ type: 'sell', price: 1, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'godly' });
  await settleN(6);
  check('3. `mkttier: false`: the request\'s tier, as before (it crosses)', sell.ok && sell.matched === true, sell);
}

/* ── 4 and 5. a cancel cut at each of its writes, 49 h, the prune ── */
/* Every blade named `Dupe Blade` the player could ever hold: the stash, and
   the book after a wake (a re-listed order is one a second cancel pays). */
async function cutCancel(flags, cutAfter, kind) {
  const clock = seededClock().install();
  try {
    const P = 'bp_rvmktpl01';
    const st = makeStorage();
    const room = await openRoom(st, flags);
    await join(room, fakeWs('p'), P, { loginTaken: true });
    const ps = room.playerState[P];
    room._goldSet(ps, 1000, 'restore');
    ps.weaponStash = [blade('Dupe Blade', 'greatsword', 'iron')];
    room._saveRpg(P, ps); await settleN(3);
    await room._mktEnsureIndex();
    const placed = kind === 'buy'
      ? await room._mktPlaceOrder({ type: 'buy', price: 500, playerId: P, category: 'weapon', subtype: 'bow', tierKey: 'iron' })
      : await room._mktPlaceOrder({ type: 'sell', price: 500, playerId: P, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'iron' });
    await settleN(3);
    const b0 = st.batches();
    st.crashAt(b0 + cutAfter);
    await room._mktCancelOrder(placed.order.id, P);
    await settleN(4);
    const writes = Math.min(st.batches(), b0 + 10) - b0;
    const leftover = st._store.has('mkt_order:' + placed.order.id);
    /* the wake 49 h on: someone plays (the tick's slot asks the market's
       wait, then the prune); nobody opens the General Store */
    clock.advance(OP_PRUNE.TTL_MS + 3600000);
    const st2 = makeStorage(st._store);
    const r2 = await openRoom(st2, flags);
    await join(r2, fakeWs('p2'), P, { loginTaken: true });
    for (let i = 0; i < 20 && r2._mktSettleWait(); i++) await settleN(2);
    for (let i = 0; i < 20; i++) { const more = await r2._opPruneMaybe(Date.now()); await settle(); if (!more) break; }
    await r2._mktEnsureIndex();
    const listed = r2._mktQueryOrders(null, null, null, P, 100).length;
    const again = await r2._mktCancelOrder(placed.order.id, P);
    await settleN(4);
    const q = r2.playerState[P];
    const blades = (q.weaponStash || []).filter((w) => w && w.name === 'Dupe Blade').length;
    return { writes, leftover, listed, again: !!(again && again.ok), blades, coins: q.coins };
  } finally { clock.restore(); }
}
{
  /* the cancel's writes, on main: the refund, then the delete (2) */
  const whole = await cutCancel(null, 1000, 'sell');
  check('4a. a whole cancel of a sell: one write, the blade back once', whole.writes === 1 && whole.blades === 1 && whole.listed === 0 && !whole.leftover, whole);
  let bad = [];
  for (let cut = 0; cut <= 2; cut++) {
    const r = await cutCancel(null, cut, 'sell');
    if (r.blades !== 1) bad.push({ cut, ...r });   /* after the second cancel: the order's blade, once */
  }
  check('4b. a sell\'s cancel cut at each write, woken 49 h on: the blade exactly once, never paid twice', bad.length === 0, bad);
  bad = [];
  for (let cut = 0; cut <= 2; cut++) {
    const r = await cutCancel(null, cut, 'buy');
    if (r.coins !== 1000) bad.push({ cut, ...r });   /* after the second cancel: the 500 back, once */
  }
  check('4c. a buy\'s cancel cut at each write: the 500 back exactly once', bad.length === 0, bad);
}
{
  const r = await cutCancel({ mktheal: false }, 1, 'sell');
  check('5. `mktheal: false`: the old two writes (cut between, 49 h on: the order back and the blade twice)', r.listed === 1 && r.blades === 2, r);
}

/* ── 6. the cost: a scan of a book with nothing to finish writes nothing ── */
{
  const { st, room, S } = await pair(null, blade('Iron Greatsword', 'greatsword', 'iron'));
  await room._mktPlaceOrder({ type: 'sell', price: 900, playerId: S, stashIndex: 0, category: 'weapon', subtype: 'greatsword', tierKey: 'iron' });
  await settleN(4);
  const st2 = makeStorage(st._store);
  const r2 = await openRoom(st2);
  const b0 = st2.batches();
  for (let i = 0; i < 10 && r2._mktSettleWait(); i++) await settleN(2);
  await settleN(2);
  check('6a. the wake scan of a live book writes nothing', st2.batches() === b0, { before: b0, after: st2.batches() });
  check('6b. ...and leaves the live order on file', [...st2._store.keys()].some((k) => k.startsWith('mkt_order:')));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
