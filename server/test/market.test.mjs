/* Marketplace settlement test (v2.3.1118, PR3 of the heavy-systems
 * plan).  The order book now lives in the GameRoom with escrow at
 * placement and settlement through the PR2 inbox/escrow primitives.
 * Checks:
 *   1. Sell escrow: the weapon leaves the seller's stash at listing --
 *      taken from the SERVER's copy by stash index (body.item ignored).
 *   2. Buy escrow: gold leaves the buyer at placement; insufficient
 *      gold rejects; offline players can't place.
 *   3. Match settles both legs: seller paid exec price (online -> live
 *      coins), buyer receives the weapon; price improvement refunded.
 *   4. Offline counterparty settles into the inbox (mail).
 *   5. Cancel refunds the escrow exactly once (idempotent vs expiry).
 *   6. Expiry sweep refunds instead of deleting (the old DO destroyed
 *      escrowed items on expiry).
 *   7. Self-orders never match and never enter price history.
 *   8. Price history records executions; /history returns avg + last.
 *   9. MAX_ORDERS_PER_PLAYER enforced.
 *  10. v2.3.1182: DO restart rebuilds the book + order counts from
 *      mkt_order: keys; escrow survives, cancel on the rebuilt room
 *      refunds, and the shared oplog blocks a cross-instance double
 *      refund.
 *  11. v2.3.1182: HTTP surface (GameRoom.fetch -> _marketFetch) --
 *      place/cancel carry the `settled: true` deploy-order flag the
 *      client gates its legacy self-credit path on; /orders read shape.
 *  12. v2.3.1184: settlement crash windows converge -- credits land
 *      before the record delete (maker-keyed settle stamps), refunds
 *      never pay over a stamped settlement, and the index rebuild
 *      deletes (never re-lists) stamped leftovers.
 */
import { GameRoom } from '../src/index.js';
import { GEAR_SELL, removeGearLocal } from '../../src/ui/mobile/dash/gearSellLocal.js';   /* v2.3.2532: the client half of a gear listing (S12j) */
import { GEAR_SELL_REASON, gearSellReasonText, gearSellCheck, gearSellGid } from '../../src/ui/mobile/dash/gearSellReason.js';   /* v2.3.2551: the client half of a REFUSAL (S12m) */
import { GEAR_REFUSAL } from '../src/storegear.js';   /* v2.3.2551: ...and the table it mirrors */
import { STORE } from '../src/store.js';   /* v2.3.2619: the sweep arithmetic reads the real constants */
import { QUEST_REWARDS, MONSTER_ARMOR_DROPS } from '../src/data.js';   /* v2.3.2554: the REAL copper/iron entries, so S12o cannot drift from the catalog */

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const wpn = (n) => ({ name: n, tierMult: 1.0, dmg: 5 });
const ORD = (over) => ({
  type: 'sell', category: 'weapon', subtype: 'sword', tierKey: 'iron',
  price: 100, tierLabel: 'Iron', playerName: 'T', ...over,
});

const wsS = fakeWs('seller'); const wsB = fakeWs('buyer');
await join(wsS, 'bp_mkt_seller');
await join(wsB, 'bp_mkt_buyer');
const seller = room.playerState['bp_mkt_seller'];
const buyer = room.playerState['bp_mkt_buyer'];
seller.weaponStash = [wpn('Iron Sword')];
seller.coins = 0;
buyer.coins = 500;

await room._mktEnsureIndex();

// ── 1. sell escrow from the server's own stash ──
const badIdx = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_seller', stashIndex: 5 }));
check('sell with bad stash index rejected', badIdx.ok === false, badIdx);
const sellRes = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_seller', stashIndex: 0 }));
check('sell listed, weapon escrowed out of stash', sellRes.ok === true && sellRes.matched === false && sellRes.settled === true && seller.weaponStash.length === 0, { sellRes, stash: seller.weaponStash });
check('resting order carries the escrowed item', sellRes.order.item && sellRes.order.item.name === 'Iron Sword');

// ── 2. buy escrow ──
const poorBuy = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 9999 }));
check('buy with insufficient gold rejected', poorBuy.ok === false && poorBuy.error === 'Not enough gold');
const offline = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_ghost', stashIndex: 0 }));
check('offline player cannot place', offline.ok === false && offline.error === 'Not in game');

// ── 3. match settles both legs (taker buy at a higher bid) ──
const buyRes = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 120 }));
check('taker buy matches the resting ask', buyRes.ok === true && buyRes.matched === true && buyRes.execPrice === 100, buyRes);
check('buyer escrowed bid then got improvement back', buyer.coins === 400, buyer.coins); // 500 - 120 + 20
check('buyer received the weapon', buyer.weaponStash.some((w) => w.name === 'Iron Sword'), buyer.weaponStash);
check('seller paid the exec price live', seller.coins === 100, seller.coins);
check('matched order removed from storage', !state._store.has('mkt_order:' + sellRes.order.id));

// ── 4. offline counterparty settles into the inbox ──
seller.weaponStash = [wpn('Mail Sword')];
const sell2 = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_seller', stashIndex: 0 }));
room.sessions.delete(wsS);
delete room.playerState['bp_mkt_seller'];
const buy2 = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 100 }));
check('match against offline seller still executes', buy2.ok === true && buy2.matched === true, buy2);
const sellerInbox = state._store.get('inbox:bp_mkt_seller');
check('offline seller paid via inbox', sellerInbox?.length === 1 && sellerInbox[0].kind === 'gold' && sellerInbox[0].payload.amount === 100, sellerInbox);

// ── 5. cancel refunds exactly once ──
const buyRest = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 50 }));
const coinsBeforeCancel = buyer.coins;
const cxl = await room._mktCancelOrder(buyRest.order.id, 'bp_mkt_buyer');
check('cancel refunds buy escrow', cxl.ok === true && buyer.coins === coinsBeforeCancel + 50, buyer.coins);
await room._mktRefund(buyRest.order, 'order cancelled'); // simulate cancel/expiry race retry
check('double refund blocked by opId journal', buyer.coins === coinsBeforeCancel + 50, buyer.coins);

// ── 6. expiry sweep refunds ──
buyer.weaponStash = [wpn('Expiring Sword')];
const sell3 = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_buyer', stashIndex: 0 }));
sell3.order.expires = Date.now() - 1;
await state.storage.put('mkt_order:' + sell3.order.id, sell3.order);
room._mktLastSweep = 0;
await room._mktSweep();
check('expired listing refunds the weapon', buyer.weaponStash.some((w) => w.name === 'Expiring Sword'), buyer.weaponStash);
check('expired order removed from book', !state._store.has('mkt_order:' + sell3.order.id));

// ── 7. self-orders never match ──
buyer.weaponStash.push(wpn('Own Sword'));
const selfSell = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_buyer', stashIndex: buyer.weaponStash.length - 1, price: 10 }));
const selfBuy = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 10 }));
check('own resting order is skipped by the matcher', selfSell.matched === false && selfBuy.matched === false, { selfSell: selfSell.matched, selfBuy: selfBuy.matched });
await room._mktCancelOrder(selfSell.order.id, 'bp_mkt_buyer');
await room._mktCancelOrder(selfBuy.order.id, 'bp_mkt_buyer');

// ── 8. price history ──
const hist = state._store.get('mkt_hist:weapon:sword:iron:none:none');
check('executions recorded in price history', Array.isArray(hist) && hist.length === 2 && hist.every((h) => h.p === 100), hist);

// ── 9. per-player order cap ──
room._mktOrderCounts.set('bp_mkt_buyer', 10);
const capped = await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_buyer', price: 10 }));
check('order cap enforced', capped.ok === false && capped.error === 'Max 10 orders', capped);

// ── 10. v2.3.1182: order-book rebuild after DO restart ──
// _mktEnsureIndex rebuilds the in-memory book + _mktOrderCounts from
// the persisted mkt_order: keys on DO wake.  Resting orders are the
// ONLY copy of escrowed player property, and every check above runs
// against the warm first instance -- a rebuild regression would pass
// all of them while silently stranding escrow.  Simulate a restart by
// constructing a SECOND GameRoom over the SAME storage state.
const wsS2 = fakeWs('r2seller'); const wsB2 = fakeWs('r2buyer');
await join(wsS2, 'bp_mkt_r2s');
await join(wsB2, 'bp_mkt_r2b');
const r2seller = room.playerState['bp_mkt_r2s'];
const r2buyer = room.playerState['bp_mkt_r2b'];
r2seller.weaponStash = [wpn('Rebuild Sword')];
r2seller.coins = 0;
r2buyer.coins = 500;
// Distinct tier bucket, non-crossing prices: nothing above can match
// these -- they must be the only two orders left in storage.
const R2 = (over) => ORD({ tierKey: 'steel', tierLabel: 'Steel', ...over });
const restSell = await room._mktPlaceOrder(R2({ playerId: 'bp_mkt_r2s', stashIndex: 0, price: 200 }));
const restBuy = await room._mktPlaceOrder(R2({ type: 'buy', playerId: 'bp_mkt_r2b', price: 50 }));
check('restart setup: both orders rest unmatched', restSell.matched === false && restBuy.matched === false, { s: restSell.matched, b: restBuy.matched });
const preSellerCount = room._mktOrderCounts.get('bp_mkt_r2s');
const preBuyerCount = room._mktOrderCounts.get('bp_mkt_r2b');

const room2 = new GameRoom(state, mockEnv); // same storage, cold in-memory caches
await room2._mktEnsureIndex();
const r2Orders = room2._mktQueryOrders(null, null, null, 'bp_mkt_r2s', 100);
check('rebuilt book serves the resting sell order', r2Orders.length === 1 && r2Orders[0].id === restSell.order.id, r2Orders);
check('escrowed item survives the rebuild intact', r2Orders[0]?.item?.name === 'Rebuild Sword', r2Orders[0]?.item);
check('rebuilt order count matches pre-restart (seller)', preSellerCount === 1 && room2._mktOrderCounts.get('bp_mkt_r2s') === preSellerCount, { preSellerCount, post: room2._mktOrderCounts.get('bp_mkt_r2s') });
check('rebuilt order count matches pre-restart (buyer)', preBuyerCount === 1 && room2._mktOrderCounts.get('bp_mkt_r2b') === preBuyerCount, { preBuyerCount, post: room2._mktOrderCounts.get('bp_mkt_r2b') });

// Cancel on the rebuilt room returns the escrow.  Nobody has joined
// room2, so both refunds land in the shared-storage inbox (mail).
const cxlSell = await room2._mktCancelOrder(restSell.order.id, 'bp_mkt_r2s');
const r2sInbox = state._store.get('inbox:bp_mkt_r2s');
check('rebuilt-room cancel refunds the escrowed weapon', cxlSell.ok === true && r2sInbox?.length === 1 && r2sInbox[0].kind === 'weapon' && r2sInbox[0].payload.weapon.name === 'Rebuild Sword', r2sInbox);
const cxlBuy = await room2._mktCancelOrder(restBuy.order.id, 'bp_mkt_r2b');
const r2bInbox = state._store.get('inbox:bp_mkt_r2b');
check('rebuilt-room cancel refunds the escrowed gold', cxlBuy.ok === true && r2bInbox?.length === 1 && r2bInbox[0].kind === 'gold' && r2bInbox[0].payload.amount === 50, r2bInbox);

// Retry the same refund on the OLD instance.  The opId journal lives
// in shared storage, so the stamp room2 wrote must block the old room
// from paying again -- a crash-retry spanning a restart pays exactly
// once.  The seller is live on room1, so a double-pay would land in
// this stash, not the inbox.
r2seller.weaponStash = [];
await room._mktRefund(restSell.order, 'order cancelled');
check('cross-instance refund retry blocked by shared oplog', r2seller.weaponStash.length === 0 && state._store.get('inbox:bp_mkt_r2s').length === 1, { stash: r2seller.weaponStash, inbox: state._store.get('inbox:bp_mkt_r2s') });

// ── 11. v2.3.1182: HTTP surface + the `settled` deploy-order flag ──
// GameRoom.fetch routes /api/market/* into _marketFetch.  The client's
// legacy ExchangePanel self-credit path is gated on !data.settled: if
// a mutating response ever ships without settled === true, old clients
// pay themselves ON TOP of server settlement -- the exact duplication
// hole PR3 closed.  Drive the real fetch path (liveops-style req).
const mreq = (method, path, body) => room.fetch(new Request('https://x' + path, {
  method,
  body: body ? JSON.stringify(body) : undefined,
}));
const wsH = fakeWs('http');
await join(wsH, 'bp_mkt_http');
const httpP = room.playerState['bp_mkt_http'];
httpP.weaponStash = [wpn('Http Axe')];
httpP.coins = 0;
// Fresh bucket again: room1's warm index still holds ghosts of the
// section-10 orders room2 cancelled (storage is authoritative; the
// ghosts just must not be matchable or listable here).
const placeRes = await mreq('POST', '/api/market/place', ORD({ playerId: 'bp_mkt_http', stashIndex: 0, subtype: 'axe', tierKey: 'mythic', tierLabel: 'Mythic', price: 300 }));
const placeBody = await placeRes.json();
check('HTTP place: ok + settled flag', placeRes.status === 200 && placeBody.ok === true && placeBody.settled === true, placeBody);
check('HTTP place escrowed the weapon out of live state', placeBody.order?.item?.name === 'Http Axe' && httpP.weaponStash.length === 0, httpP.weaponStash);

const ordRes = await mreq('GET', '/api/market/orders?category=weapon&subtype=axe&tier=mythic');
const ordBody = await ordRes.json();
check('HTTP orders read shape', ordRes.status === 200 && ordBody.ok === true && Array.isArray(ordBody.orders) && ordBody.orders.length === 1 && ordBody.orders[0].id === placeBody.order.id && ordBody.orders[0].price === 300, ordBody);

const cxlRes = await mreq('DELETE', '/api/market/cancel?id=' + placeBody.order.id + '&playerId=bp_mkt_http');
const cxlBody = await cxlRes.json();
check('HTTP cancel: ok + settled flag', cxlRes.status === 200 && cxlBody.ok === true && cxlBody.settled === true, cxlBody);
check('HTTP cancel refunded the weapon live', httpP.weaponStash.some((w) => w.name === 'Http Axe'), httpP.weaponStash);

// ── 12. v2.3.1184: settlement crash windows converge ──
// The match/cancel/sweep paths used to delete the escrow record BEFORE
// crediting -- a deploy landing in between destroyed both sides' escrow
// with nothing left for any sweep to repair (the settle stamps were
// also keyed on the taker's never-persisted UUID, so no retry could
// ever find them).  Now: credit first with stamps keyed on the
// PERSISTED maker id, delete last, and the index rebuild converges
// leftovers -- stamp seen means delete, never re-list, never refund
// on top (rule 6; _duelEscrowSweep is the reference shape).
const wsC = fakeWs('crashSeller'); const wsD = fakeWs('crashBuyer');
await join(wsC, 'bp_mkt_cs'); await join(wsD, 'bp_mkt_cb');
const csP = room.playerState['bp_mkt_cs'];
const cbP = room.playerState['bp_mkt_cb'];
csP.weaponStash = [wpn('Crash Spear')]; csP.coins = 0; cbP.coins = 500;
const restCS = await room._mktPlaceOrder(ORD({ playerId: 'bp_mkt_cs', stashIndex: 0, subtype: 'spear', tierKey: 'gold', tierLabel: 'Gold', price: 100 }));
// Simulated deploy: the record delete never commits.
const realDel = state.storage.delete;
state.storage.delete = async (k) => { if (k === 'mkt_order:' + restCS.order.id) throw new Error('simulated crash'); return realDel(k); };
let matchThrew = false;
try {
  await room._mktPlaceOrder(ORD({ type: 'buy', playerId: 'bp_mkt_cb', subtype: 'spear', tierKey: 'gold', tierLabel: 'Gold', price: 100 }));
} catch (e) { matchThrew = true; }
state.storage.delete = realDel;
check('crash sim: both credits landed before the lost delete', matchThrew && csP.coins === 100 && cbP.weaponStash.some((w) => w.name === 'Crash Spear'), { matchThrew, coins: csP.coins, stash: cbP.weaponStash });
check('settle stamps keyed on the persisted maker id', state._store.has('oplog:settle:' + restCS.order.id + ':item') && state._store.has('oplog:settle:' + restCS.order.id + ':gold'));
check('crash leftover record survives (delete was lost)', state._store.has('mkt_order:' + restCS.order.id));

// Rule 6: a refund retry over the stamped payout must pay nothing.
const cbCoinsBefore = cbP.coins; const csStashBefore = csP.weaponStash.length;
await room._mktRefund(restCS.order, 'sweep retry');
check('refund over a stamped settlement is a no-op', cbP.coins === cbCoinsBefore && csP.weaponStash.length === csStashBefore, { coins: cbP.coins, stash: csP.weaponStash });

// A restarted room's rebuild converges the settled leftover to a
// delete instead of re-listing it (re-listing would let the same
// escrowed weapon match or refund a second time).
const room3 = new GameRoom(state, mockEnv);
await room3._mktEnsureIndex();
check('rebuild converges the settled leftover to a delete', !state._store.has('mkt_order:' + restCS.order.id) && !room3._mktOrderCounts.get('bp_mkt_cs'), { store: state._store.has('mkt_order:' + restCS.order.id) });

// Same convergence for the cancel/expiry side: a record whose
// refund:<id> stamp exists (crash between refund and delete) is
// deleted on rebuild, not re-listed.
state._store.set('mkt_order:ghost1', { id: 'ghost1', type: 'buy', category: 'weapon', subtype: 'spear', tierKey: 'gold', price: 10, playerId: 'bp_mkt_cb', playerName: 'T', ts: Date.now(), expires: Date.now() + 9999999 });
state._store.set('oplog:refund:ghost1', Date.now());
const room4 = new GameRoom(state, mockEnv);
await room4._mktEnsureIndex();
check('rebuild converges a refund-stamped leftover to a delete', !state._store.has('mkt_order:ghost1') && !room4._mktOrderCounts.get('bp_mkt_cb'));

/* ═══ v2.3.1971: A LISTING THAT CANNOT BE WRITTEN MUST NOT TAKE THE ITEM ═══
   category / subtype / tierKey / element1 / element2 / tierLabel /
   playerName were checked for TRUTHINESS only, and this is the HTTP
   surface -- `await request.json()` on a POST body, not a 16 KB WS frame
   -- so nothing bounded their length.  All of them ride into
   `mkt_order:<uuid>` (128 KB DO value ceiling) and the first five are
   concatenated into `mkt_hist:<key>` (2 KB DO key ceiling).  Oversize
   either and `storage.put` throws -- AFTER `weaponStash.splice()` and
   `_saveRpg` have already run, so the seller's weapon is gone from live
   state and from disk with no order record for any sweep to find.
   Escrow that cannot be written is escrow that never existed, so the
   bound has to come BEFORE the splice.  Asserted on the stash, which is
   the thing that was being destroyed. */
{
  const VICTIM = 'bp_mkt_bounds';
  const wsV = fakeWs('bounds');
  await join(wsV, VICTIM);
  const vP = room.playerState[VICTIM];
  vP.coins = 0;
  const bad = [
    ['a 200 KB category', { category: 'x'.repeat(200000) }],
    ['a 5 KB tierKey', { tierKey: 'w'.repeat(5000) }],
    ['a subtype with separators in it', { subtype: 'sword:iron:none' }],
    ['a non-string category', { category: { toString: () => 'weapon' } }],
    ['an empty-after-trim subtype', { subtype: '   ' }],
    ['a 5 KB element', { element1: 'e'.repeat(5000) }],
  ];
  for (const [label, over] of bad) {
    vP.weaponStash = [wpn('Do Not Destroy')];
    const res = await room._mktPlaceOrder(ORD({ playerId: VICTIM, stashIndex: 0, ...over }));
    check('refused: ' + label, res.ok === false, res);
    check('...and the weapon is STILL in the stash', vP.weaponStash.length === 1
      && vP.weaponStash[0].name === 'Do Not Destroy', vP.weaponStash);
  }

  // The free-text display fields are truncated, not refused — they are a
  // label and a name, and a long one is rudeness, not an attack.
  vP.weaponStash = [wpn('Long Label Sword')];
  const longText = await room._mktPlaceOrder(ORD({
    playerId: VICTIM, stashIndex: 0, price: 777,
    tierLabel: 'L'.repeat(9000), playerName: 'N'.repeat(9000),
  }));
  check('an over-long display label is truncated, not refused', longText.ok === true, longText.error);
  check('...tierLabel bounded to 32', longText.order.tierLabel.length === 32, longText.order.tierLabel.length);
  check('...playerName bounded to 24', longText.order.playerName.length === 24, longText.order.playerName.length);
  check('...and the whole record is small enough to store',
    JSON.stringify(longText.order).length < 4096, JSON.stringify(longText.order).length);
  await room._mktCancelOrder(longText.order.id, VICTIM);

  // The honest client's real values must still be accepted, including the
  // woodworking `ww_` prefix and a two-element weapon.
  vP.weaponStash = [wpn('Honest Sword')];
  const honest = await room._mktPlaceOrder(ORD({
    playerId: VICTIM, stashIndex: 0, price: 42,
    category: 'weapon', subtype: 'greatsword', tierKey: 'ww_pine',
    element1: 'fire', element2: 'ice',
  }));
  check('a real listing (ww_ tier, two elements) is still accepted', honest.ok === true, honest.error);
  await room._mktCancelOrder(honest.order.id, VICTIM);

  /* ═══ v2.3.1971: THE CLASS, not just the instance ═══
     The escrow leaves live state (splice / coin debit + _saveRpg) BEFORE
     the `mkt_order:` record lands, and that record is what cancel,
     expiry-refund and the rebuild sweep all key off.  A put that throws
     for ANY reason therefore leaves the player short with nothing naming
     what they lost.  Forced here by making the next put fail, which is
     the only way to reach the branch on purpose. */
  const realPut = state.storage.put;
  const failNextPut = (pred) => { state.storage.put = async (k, v) => { if (pred(k)) throw new Error('storage full'); return realPut.call(state.storage, k, v); }; };

  vP.weaponStash = [wpn('Rescued Blade')];
  failNextPut((k) => k.startsWith('mkt_order:'));
  let threw = false;
  try { await room._mktPlaceOrder(ORD({ playerId: VICTIM, stashIndex: 0, price: 55 })); } catch (e) { threw = true; }
  state.storage.put = realPut;
  check('a failed listing write still reports failure to the caller', threw);
  check('...and the weapon is BACK in the stash, not destroyed',
    vP.weaponStash.length === 1 && vP.weaponStash[0].name === 'Rescued Blade', vP.weaponStash);
  check('...and the order left nothing in the book', !room._mktOrderCounts.get(VICTIM),
    room._mktOrderCounts.get(VICTIM));

  vP.coins = 300;
  failNextPut((k) => k.startsWith('mkt_order:'));
  threw = false;
  try { await room._mktPlaceOrder(ORD({ type: 'buy', playerId: VICTIM, price: 120 })); } catch (e) { threw = true; }
  state.storage.put = realPut;
  check('a failed BUY write refunds the escrowed gold', threw && vP.coins === 300, vP.coins);
  check('...and leaves no phantom order in the book', !room._mktOrderCounts.get(VICTIM),
    room._mktOrderCounts.get(VICTIM));

  // Rule 3: an unwind into a FULL stash mails the weapon, never truncates it.
  vP.weaponStash = [wpn('u1'), wpn('u2'), wpn('u3'), wpn('u4'), wpn('u5'), wpn('u6'), wpn('u7'), wpn('u8'), wpn('Overflow Rescue')];
  failNextPut((k) => k.startsWith('mkt_order:'));
  try { await room._mktPlaceOrder(ORD({ playerId: VICTIM, stashIndex: 8, price: 55 })); } catch (e) { /* expected */ }
  state.storage.put = realPut;
  const vInbox = state._store.get('inbox:' + VICTIM) || [];
  check('an unwind into a full stash mails the weapon (rule 3)',
    vP.weaponStash.length === 8
      && vInbox.some((e) => e.kind === 'weapon' && e.payload.weapon.name === 'Overflow Rescue'),
    { stash: vP.weaponStash.length, inbox: vInbox.length });
}

/* ════════════════════════════════════════════════════════════════════
 * v2.3.2475 — THE AUCTION HOUSE (store.js), phase 1
 *
 * A second, per-LISTING surface beside the bucket order book above: one
 * seller, one pile of goods, one ask price, at most one live bid.  Lives
 * in this file because it shares every primitive the order book settles
 * through (_creditPlayer, _escrowTakeItem, _escrowDebitGold, the oplog)
 * and because the two must be shown NOT to interfere.
 *
 * Checks:
 *   S1.  Listing escrows from the SERVER's own copy — a stackable through
 *        _escrowTakeItem, a weapon by stash index — and every displayed
 *        field is derived here, never taken from the request (market.js:66-69
 *        is the hole this avoids).
 *   S2.  Buy-now: buyer debited, goods delivered, seller paid, record gone.
 *   S3.  Bids escrow gold; an outbid refunds the previous bidder exactly
 *        once; a bid at or above the ask is a purchase.
 *   S4.  The seller accepts the top bid — settles at the BID price, and
 *        the already-escrowed gold is not charged twice.
 *   S5.  Cancel and lazy expiry both return the goods AND refund the live
 *        bid (rule 12: no alarms).
 *   S6.  An offline counterparty settles into the mail (inbox:<pid>).
 *   S7.  Double settlement is a no-op — the opIds are the wall (rule 5).
 *   S8.  Crash convergence: an in-flight sale marker with its payment
 *        stamp RESUMES on rebuild; one without it re-lists; a bid marker
 *        whose debit never landed is dropped; and (v2.3.2521) a cancel or
 *        an expiry that died between its refunds and its delete is
 *        FINISHED on the next wake instead of going back on the shelf.
 *   S9.  Browse pages, and the page is bounded (rule 9).
 *   S10. HTTP surface: `settled: true` on every mutating response, and
 *        the session-token gate (v2.3.1178) rejects a forged caller.
 *   S11. Guards: your own listing, the per-player cap, price bounds, an
 *        Object.prototype key, and goods you do not hold.
 *   S12. GEAR listings (v2.3.2531, storegear.js): escrow out of the
 *        server's own gear stash and return on cancel, on expiry and
 *        across a simulated restart in each; the WORN-slot hole, which
 *        v2.3.2532 leaves OPEN and named rather than guessed at (§S12e —
 *        the reconciliation that guessed deleted real spares); a stash
 *        entry that has CHANGED since the card was opened; the kill
 *        switch; the provenance mark in both directions; and (§S12j) the
 *        client's own bag losing the piece it just listed.
 * ════════════════════════════════════════════════════════════════════ */
{
  /* Its own storage mock, honouring `limit`/`startAfter` — the rebuild
     pages deliberately (an unbounded list() holds the room's input gate,
     handoff rule 9 / v2.3.2438), and a mock that ignores paging would let
     that regress silently. */
  function makeStoreState() {
    const store = new Map();
    return {
      storage: {
        get: async (k) => store.get(k),
        put: async (k, v) => { store.set(k, v); },
        list: async (opts) => {
          const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
          const out = new Map();
          for (const k of keys) {
            if (opts?.startAfter && k <= opts.startAfter) continue;
            if (opts?.limit && out.size >= opts.limit) break;
            out.set(k, store.get(k));
          }
          return out;
        },
        delete: async (k) => { store.delete(k); },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
      _store: store,
    };
  }

  const st = makeStoreState();
  const shop = new GameRoom(st, mockEnv);
  const sJoin = async (ws, id, name) => {
    shop.sessions.set(ws, { id: null, name: name || 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await shop.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
  };
  const wsSel = fakeWs('st-seller'); const wsBuy = fakeWs('st-buyer'); const wsOth = fakeWs('st-other');
  await sJoin(wsSel, 'bp_st_sell', 'Sella');
  await sJoin(wsBuy, 'bp_st_buy', 'Buya');
  await sJoin(wsOth, 'bp_st_oth', 'Otha');
  const SEL = shop.playerState['bp_st_sell'];
  const BUY = shop.playerState['bp_st_buy'];
  const OTH = shop.playerState['bp_st_oth'];
  SEL.coins = 0; BUY.coins = 1000; OTH.coins = 1000;
  SEL.inventory = { slime_gel: 5, manaShard: 2, ore_iron: 3 };
  SEL.weaponStash = [{ name: 'Frost Bow', type: 'bow', tier: 'elemental', tierMult: 1.25, element1: 'frost', quality: 'rare', hardness: 2, temper: 10 }];
  await shop._stEnsureIndex();

  // ── S1. listing escrows the SERVER's copy; display is server-derived ──
  const listItem = await shop._stCreateListing({
    playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 2, price: 50,
    // A modified client's lies, all ignored: the store reads its own copy.
    cat: 'weapon', disp: { name: 'Godly Blade' }, sellerName: 'NotSella',
  });
  check('store: stackable listed', listItem.ok === true && listItem.settled === true, listItem);
  check('store: the stack left the seller inventory at listing', SEL.inventory.slime_gel === 3, SEL.inventory);
  check('store: the listed item is categorised by the SERVER (crafting, not the claimed weapon)',
    listItem.listing.cat === 'crafting' && listItem.listing.disp.name === 'slime_gel', listItem.listing);

  const listPot = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'manaShard', qty: 1, price: 30 });
  check('store: a shop consumable files under potion, like the bag chip does',
    listPot.ok === true && listPot.listing.cat === 'potion', listPot.listing);

  const listWpn = await shop._stCreateListing({
    playerId: 'bp_st_sell', kind: 'weapon', stashIndex: 0, price: 400,
    item: { name: 'Forged Lie', tierMult: 8 },   // rule 16: ignored
  });
  check('store: weapon listed out of the server stash', listWpn.ok === true && SEL.weaponStash.length === 0, { r: listWpn, stash: SEL.weaponStash });
  check('store: the weapon card is read off the escrowed blob, not the request',
    listWpn.listing.disp.name === 'Frost Bow' && listWpn.listing.disp.tierMult === 1.25
    && listWpn.listing.disp.element1 === 'frost' && listWpn.listing.cat === 'weapon', listWpn.listing);
  check('store: the escrowed weapon blob is never put on the wire', listWpn.listing.weapon === undefined, listWpn.listing);
  check('store: the escrow record holds the weapon', !!st._store.get('store_listing:' + listWpn.listing.id).weapon);

  // ── S2. buy now ──
  const bought = await shop._stBuyNow(listWpn.listing.id, 'bp_st_buy');
  check('store: buy-now settles', bought.ok === true && bought.bought === true && bought.price === 400, bought);
  check('store: buyer paid', BUY.coins === 600, BUY.coins);
  check('store: buyer received the weapon', BUY.weaponStash.some((w) => w.name === 'Frost Bow'), BUY.weaponStash);
  check('store: seller paid the ask', SEL.coins === 400, SEL.coins);
  check('store: the listing record is deleted LAST and is gone', !st._store.has('store_listing:' + listWpn.listing.id));
  check('store: both settlement legs are stamped', st._store.has('oplog:store:' + listWpn.listing.id + ':goods') && st._store.has('oplog:store:' + listWpn.listing.id + ':gold'));
  const soldNote = wsSel.sent.filter((m) => m.type === 'inbox_delivered').pop();
  check('store: the seller is told, through the mail the economy already has',
    !!soldNote && soldNote.payload.entries.some((e) => e.source === 'market' && /sold to Buya for 400/.test(e.note)), soldNote && soldNote.payload);

  // ── S7. double settlement is a no-op ──
  const coinsBefore = SEL.coins; const stashBefore = BUY.weaponStash.length;
  await shop._stSettle({ id: listWpn.listing.id, sellerId: 'bp_st_sell', kind: 'weapon', weapon: { name: 'Frost Bow' }, qty: 1, disp: { name: 'Frost Bow' }, topBid: null }, 'bp_st_buy', 'Buya', 400, null);
  check('store: replaying a settlement pays nobody twice (rule 5)',
    SEL.coins === coinsBefore && BUY.weaponStash.length === stashBefore, { coins: SEL.coins, stash: BUY.weaponStash.length });

  // ── S3. bids ──
  const auction = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'ore_iron', qty: 3, price: 300 });
  const bid1 = await shop._stPlaceBid(auction.listing.id, 'bp_st_buy', 100);
  check('store: a bid escrows the bidder gold', bid1.ok === true && BUY.coins === 500, { bid1, coins: BUY.coins });
  const lowBid = await shop._stPlaceBid(auction.listing.id, 'bp_st_oth', 100);
  check('store: a bid must beat the standing one', lowBid.ok === false, lowBid);
  const bid2 = await shop._stPlaceBid(auction.listing.id, 'bp_st_oth', 150);
  check('store: a higher bid takes the top', bid2.ok === true && OTH.coins === 850, { bid2, coins: OTH.coins });
  check('store: the outbid player is refunded, exactly once', BUY.coins === 600, BUY.coins);
  await shop._stPlaceBid(auction.listing.id, 'bp_st_oth', 160);   // raise own bid
  check('store: raising your own bid refunds the earlier one', OTH.coins === 840, OTH.coins);
  const ownBid = await shop._stPlaceBid(auction.listing.id, 'bp_st_sell', 200);
  check('store: you cannot bid on your own listing', ownBid.ok === false, ownBid);

  // ── S4. the seller accepts ──
  const notSeller = await shop._stAcceptBid(auction.listing.id, 'bp_st_buy');
  check('store: only the seller can accept a bid', notSeller.ok === false, notSeller);
  const sellerCoinsPre = SEL.coins; const othCoinsPre = OTH.coins;
  const accepted = await shop._stAcceptBid(auction.listing.id, 'bp_st_sell');
  check('store: accept settles at the BID price', accepted.ok === true && accepted.price === 160, accepted);
  check('store: the seller is paid the bid', SEL.coins === sellerCoinsPre + 160, SEL.coins);
  check('store: the winning bidder is NOT charged twice (the bid was the escrow)', OTH.coins === othCoinsPre, OTH.coins);
  check('store: the winner receives the goods', OTH.inventory.ore_iron === 3, OTH.inventory);
  check('store: the listing is gone', !st._store.has('store_listing:' + auction.listing.id));

  // ── S3b. a bid at or above the ask is simply a purchase ──
  SEL.inventory.slime_gel = 5;
  const cheap = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 20 });
  const overBid = await shop._stPlaceBid(cheap.listing.id, 'bp_st_buy', 25);
  check('store: a bid that reaches the ask buys it outright at the ask',
    overBid.ok === true && overBid.bought === true && overBid.price === 20, overBid);

  // ── S5. cancel refunds goods AND the live bid ──
  const toCancel = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 2, price: 500 });
  const gelBefore = SEL.inventory.slime_gel;
  await shop._stPlaceBid(toCancel.listing.id, 'bp_st_buy', 90);
  const buyCoinsPre = BUY.coins;
  const cxl = await shop._stCancel(toCancel.listing.id, 'bp_st_sell');
  check('store: cancel returns the goods', cxl.ok === true && SEL.inventory.slime_gel === gelBefore + 2, { cxl, inv: SEL.inventory });
  check('store: cancel refunds the standing bid', BUY.coins === buyCoinsPre + 90, BUY.coins);
  const notMine = await shop._stCancel('nope', 'bp_st_sell');
  check('store: cancelling a listing that is gone fails cleanly', notMine.ok === false, notMine);

  // ── S5b. lazy expiry (rule 12: no alarms) ──
  const willExpire = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
  await shop._stPlaceBid(willExpire.listing.id, 'bp_st_buy', 40);
  const expGel = SEL.inventory.slime_gel; const expCoins = BUY.coins;
  const expRec = shop._stIndex.get(willExpire.listing.id);
  expRec.expiresAt = Date.now() - 1;
  shop._stLastSweep = 0;
  await shop._stSweep();
  check('store: expiry returns the goods to the seller', SEL.inventory.slime_gel === expGel + 1, SEL.inventory);
  check('store: expiry refunds the standing bid', BUY.coins === expCoins + 40, BUY.coins);
  check('store: the expired listing is deleted', !st._store.has('store_listing:' + willExpire.listing.id));

  // ── S5c. ONE WEEK, FIXED (v2.3.2619) ──
  // Owner: "All listings are 7 days (1 week)." Not a default, not a choice.
  {
    const DAY = 86400000;
    SEL.inventory.slime_gel = 30;

    const wk = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 });
    const wkRec = shop._stIndex.get(wk.listing.id);
    check('store week: a listing runs seven days',
      Math.abs((wkRec.expiresAt - wkRec.createdAt) - 7 * DAY) < 1000,
      { days: (wkRec.expiresAt - wkRec.createdAt) / DAY });

    /* THE SERVER READS NO DURATION FROM THE CLIENT. Every one of these is a
       request a modified client could send; all of them must be ignored
       rather than validated, because there is no duration field at all. */
    const asked = [];
    for (const bad of [3600000, 30 * DAY, -DAY, 0, 'abc', Infinity, null, {}]) {
      const r = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10, durationMs: bad });
      if (!r.ok) { asked.push({ bad: String(bad), refused: r.error }); continue; }
      const rec = shop._stIndex.get(r.listing.id);
      if (Math.abs((rec.expiresAt - rec.createdAt) - 7 * DAY) >= 1000) {
        asked.push({ bad: String(bad), got: (rec.expiresAt - rec.createdAt) / DAY });
      }
      await shop._stCancel(r.listing.id, 'bp_st_sell');
    }
    check('store week: a client-supplied duration cannot change it -- the field does not exist',
      asked.length === 0, asked);
    check('store week: ...and nothing about a duration goes out on the wire',
      wk.listing.durationMs === undefined, Object.keys(wk.listing));

    /* THE SWEEP, at the new lifetime. The arithmetic is in store.js's header;
       this pins the two numbers it turns on so a future retune cannot quietly
       break the relationship. */
    const duePerPass = STORE.MAX_GLOBAL * (STORE.SWEEP_INTERVAL / STORE.LISTING_EXPIRY);
    check('store week: a full shelf expires far fewer than SWEEP_MAX per pass',
      duePerPass < STORE.SWEEP_MAX, { duePerPass: Number(duePerPass.toFixed(3)), sweepMax: STORE.SWEEP_MAX });
    console.log(`    store week: a FULL shelf (${STORE.MAX_GLOBAL}) expires ${duePerPass.toFixed(3)} listings `
      + `per ${STORE.SWEEP_INTERVAL / 1000}s pass against SWEEP_MAX ${STORE.SWEEP_MAX} `
      + `(${Math.round(STORE.SWEEP_MAX / duePerPass)}x headroom); sustainable rate `
      + `~${Math.round(STORE.MAX_GLOBAL / (STORE.LISTING_EXPIRY / 86400000))} new listings/day`);

    /* A LISTING MADE UNDER THE OLD 24h RULE still retires on its own clock:
       expiresAt is stored per record, so the constant change is not
       retroactive in either direction and needs no migration. */
    const legacy = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 });
    const legRec = shop._stIndex.get(legacy.listing.id);
    legRec.expiresAt = legRec.createdAt + DAY;          // as a pre-2619 record would be
    await st._store.set('store_listing:' + legacy.listing.id, legRec);
    const gelPre = SEL.inventory.slime_gel;
    legRec.expiresAt = Date.now() - 1;
    shop._stLastSweep = 0;
    await shop._stSweep();
    check('store week: a listing created under the 24h rule still expires on ITS clock',
      !st._store.has('store_listing:' + legacy.listing.id) && SEL.inventory.slime_gel === gelPre + 1);
    check('store week: ...and the week-long one beside it is untouched',
      st._store.has('store_listing:' + wk.listing.id));

    await shop._stCancel(wk.listing.id, 'bp_st_sell');
  }

  // ── S5d. THE SELLER'S ICON, AND WHAT A FULL PAGE COSTS (v2.3.2620) ──
  // Owner: "Add the players tiny icon ... next to their listing."
  // Two things have to be true at once: the icon has to be there, and a
  // PAGE_MAX page of them must not turn a listing page into a payload.
  {
    const ICON = 'https://wsrv.nl/?url=' + 'x'.repeat(200) + '&w=64';
    SEL.inventory.slime_gel = 80;
    shop.playerState['bp_st_sell'].color = '#D8AA58';

    const withIcon = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 9 });
    check('store icon: the seller colour is snapshotted onto the record',
      shop._stIndex.get(withIcon.listing.id).sellerColor === '#D8AA58',
      shop._stIndex.get(withIcon.listing.id).sellerColor);

    // Resolved LIVE, never stored -- so it appears when the seller is online...
    shop.playerState['bp_st_sell'].avatar = ICON;
    const onWire = shop._stPublic(shop._stIndex.get(withIcon.listing.id));
    check('store icon: an online seller\'s avatar is on the wire', onWire.sellerAvatar === ICON, onWire.sellerAvatar);
    check('store icon: ...and it was NOT written into the stored record',
      shop._stIndex.get(withIcon.listing.id).sellerAvatar === undefined
        && !('sellerAvatar' in st._store.get('store_listing:' + withIcon.listing.id)));

    // ...and degrades to the colour disc when they are not.
    const keepPs = shop.playerState['bp_st_sell'];
    delete shop.playerState['bp_st_sell'];
    const offWire = shop._stPublic(shop._stIndex.get(withIcon.listing.id));
    check('store icon: an offline seller falls back to the colour disc',
      offWire.sellerAvatar === null && offWire.sellerColor === '#D8AA58', offWire);
    shop.playerState['bp_st_sell'] = keepPs;

    // It lands in an <img src>: only https: and same-origin get through.
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'http://x', 'x'.repeat(600), 42, null]) {
      shop.playerState['bp_st_sell'].avatar = bad;
      const w = shop._stPublic(shop._stIndex.get(withIcon.listing.id));
      if (w.sellerAvatar !== null) { check('store icon: refuses ' + String(bad).slice(0, 24), false, w.sellerAvatar); break; }
    }
    check('store icon: only https/same-origin avatars reach the panel', true);
    shop.playerState['bp_st_sell'].color = '<script>';
    const badCol = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 9 });
    check('store icon: a colour that is not a colour is dropped, not stored',
      shop._stIndex.get(badCol.listing.id).sellerColor === null,
      shop._stIndex.get(badCol.listing.id).sellerColor);
    shop.playerState['bp_st_sell'].color = '#D8AA58';
    shop.playerState['bp_st_sell'].avatar = ICON;

    /* ── THE PAGE COST. PAGE_MAX is 40; weigh a full one. ──
       Measured on the PROJECTION rather than by escrowing forty real items:
       _stPublic is what actually goes on the wire, and MAX_PER_PLAYER is 10
       so no single seller can fill a page anyway. Every row below is the
       most expensive one the store can produce -- a seller who is online AND
       wearing a ~250-char Hemi Bro URL. Real pages are cheaper. */
    const oneRow = shop._stPublic(shop._stIndex.get(withIcon.listing.id));
    const rows40 = [];
    for (let i = 0; i < 40; i++) rows40.push({ ...oneRow, id: 'row-' + i });
    const bytes = JSON.stringify({ ok: true, listings: rows40, nextCursor: null, total: 40 }).length;
    const noIcons = JSON.stringify({
      ok: true, nextCursor: null, total: 40,
      listings: rows40.map(({ sellerAvatar, sellerColor, ...rest }) => rest),
    }).length;
    const perRow = Math.round((bytes - noIcons) / 40);
    console.log(`    store icon: a 40-row page is ${bytes} bytes, ${bytes - noIcons} of them icon `
      + `(${perRow}/row) -- worst case, every seller online and wearing a Bro picture`);
    // The bound that matters: a full page must stay well under the ~64KB a
    // phone on a bad connection notices, even with every seller wearing one.
    check('store icon: a full PAGE_MAX page stays under 32KB with every seller iconed',
      bytes < 32768, { bytes, rows: 40 });
    /* ...and a per-ROW bound on the icon itself.
       This was a RATIO ("the icons are a minority of the page") and that was
       the wrong shape: it divides two numbers that move for unrelated
       reasons, so v2.3.2619 taking `durationMs` off the wire shrank the row
       and tipped a passing 47% to a failing 51% without the icon costing one
       byte more. An avatar URL is genuinely ~half of a small row; that is not
       a regression, it is what a 250-char URL beside a short record looks
       like. The absolute cost per row is the thing worth pinning, and it does
       not move when a neighbouring field does. 300 against a measured 268. */
    check('store icon: an icon costs no more than 300 bytes on a row', perRow <= 300,
      { perRow, icon: bytes - noIcons, total: bytes });

    /* ── v2.3.2622: THE SELLER'S OWN FACE, NOT A LETTER ──
       Owner: "Make the player's actual profile picture be there instead of
       the M." The client draws it from the seller's cosmetics; this checks
       the server stores the RIGHT ONES and no more. */
    {
      const ps = shop.playerState['bp_st_sell'];
      Object.assign(ps, {
        sk: 'tan', hr: 'short', hc: 'brown', fh: 'none', fhc: 'brown',
        hw: 'cap', htc: 'red', ew: 'none', ewc: 'black', ec: 'blue',
        st: 'tee', stc: 'green', bs: 'slim', hg: 'med', fr: 'med',
        /* the nine DRAWING fields, each a fixed 256 chars -- these must NOT
           travel: invisible on an 18px disc and 92KB on a full page. */
        sa: 'a'.repeat(256), sb: 'b'.repeat(256), pa: 'c'.repeat(256),
        pb: 'd'.repeat(256), ta: 'e'.repeat(256), tf: 'f'.repeat(256),
        tm: '0'.repeat(256), tb: '1'.repeat(256), tr: '2'.repeat(256),
      });
      const faced = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 7 });
      const look = shop._stIndex.get(faced.listing.id).sellerLook;
      check('store face: the seller\'s bust set is snapshotted onto the record',
        !!look && look.sk === 'tan' && look.hw === 'cap' && look.ec === 'blue', look);
      check('store face: ...including the build fields the portrait fit reads',
        !!look && look.bs === 'slim' && look.hg === 'med' && look.fr === 'med', look);
      const drawings = ['sa', 'sb', 'pa', 'pb', 'ta', 'tf', 'tm', 'tb', 'tr'].filter((k) => look && look[k] !== undefined);
      check('store face: ...and NONE of the nine 256-char drawing fields', drawings.length === 0, drawings);
      check('store face: it survives the seller logging off (it is stored, not resolved live)',
        (() => { const keep = shop.playerState['bp_st_sell']; delete shop.playerState['bp_st_sell'];
          const w = shop._stPublic(shop._stIndex.get(faced.listing.id));
          shop.playerState['bp_st_sell'] = keep;
          return !!w.sellerLook && w.sellerLook.sk === 'tan' && w.sellerAvatar === null; })(),
        'the avatar is resolved live and goes; the face is stored and stays');

      /* A long value cannot ride in: one seller must not be able to push a
         blob into every shelf page. */
      ps.hr = 'z'.repeat(400);
      const longHair = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 7 });
      check('store face: an over-long cosmetic value is dropped, not stored',
        shop._stIndex.get(longHair.listing.id).sellerLook.hr === undefined,
        shop._stIndex.get(longHair.listing.id).sellerLook);
      ps.hr = 'short';

      /* THE PAGE COST, again, now that a face rides along. */
      /* Measured with the seller OFFLINE, which is when the look ships: the
         two are either-or now, so the worst case is one of them, not both. */
      const keepPs = shop.playerState['bp_st_sell'];
      delete shop.playerState['bp_st_sell'];
      const faceRow = shop._stPublic(shop._stIndex.get(faced.listing.id));
      shop.playerState['bp_st_sell'] = keepPs;
      const rowsF = [];
      for (let i = 0; i < 40; i++) rowsF.push({ ...faceRow, id: 'f-' + i });
      const fBytes = JSON.stringify({ ok: true, listings: rowsF, nextCursor: null, total: 40 }).length;
      const noLook = JSON.stringify({
        ok: true, nextCursor: null, total: 40,
        listings: rowsF.map(({ sellerLook, ...rest }) => rest),
      }).length;
      console.log(`    store face: a 40-row page is ${fBytes} bytes, ${fBytes - noLook} of them face `
        + `(${Math.round((fBytes - noLook) / 40)}/row) -- against ~2300/row if the nine drawing fields rode along`);
      check('store face: a full page with a face on every row stays under 32KB',
        fBytes < 32768, { bytes: fBytes });

      check('store face: the face and the avatar are never both on one row',
        (() => {
          shop.playerState['bp_st_sell'].avatar = ICON;
          const on = shop._stPublic(shop._stIndex.get(faced.listing.id));
          delete shop.playerState['bp_st_sell'].avatar;
          const off = shop._stPublic(shop._stIndex.get(faced.listing.id));
          return on.sellerAvatar === ICON && on.sellerLook === null
            && off.sellerAvatar === null && !!off.sellerLook;
        })());

      await shop._stCancel(faced.listing.id, 'bp_st_sell');
      await shop._stCancel(longHair.listing.id, 'bp_st_sell');
    }

    // Tidy: clear the shelf for the sections after this one.
    await shop._stCancel(withIcon.listing.id, 'bp_st_sell');
    await shop._stCancel(badCol.listing.id, 'bp_st_sell');
    delete shop.playerState['bp_st_sell'].avatar;
  }

  // ── S6. an offline counterparty settles into the mail ──
  const offSell = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 70 });
  const sellerPs = shop.playerState['bp_st_sell'];
  delete shop.playerState['bp_st_sell'];          // seller logs off mid-listing
  const offBuy = await shop._stBuyNow(offSell.listing.id, 'bp_st_buy');
  const sellerMail = st._store.get('inbox:bp_st_sell') || [];
  check('store: an offline seller is paid into the mail',
    offBuy.ok === true && sellerMail.some((e) => e.kind === 'gold' && e.payload.amount === 70 && e.source === 'market'), sellerMail);
  shop.playerState['bp_st_sell'] = sellerPs;

  // ── S8. crash convergence ──
  // (a) a sale marker whose payment landed RESUMES on the next wake.
  SEL.inventory.slime_gel = 4;
  const crashA = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 60 });
  {
    const rec = st._store.get('store_listing:' + crashA.listing.id);
    rec.sale = { buyerId: 'bp_st_buy', buyerName: 'Buya', price: 60, paid: false, bidSeq: null, at: Date.now() };
    st._store.set('store_listing:' + crashA.listing.id, rec);
    st._store.set('oplog:store:' + crashA.listing.id + ':pay', Date.now());   // the debit landed
  }
  const sellCoinsPre = SEL.coins; const buyGelPre = BUY.inventory ? (BUY.inventory.slime_gel || 0) : 0;
  const room5 = new GameRoom(st, mockEnv);
  room5.playerState = shop.playerState;   // same live players
  await room5._stEnsureIndex();
  check('store: a paid-for sale interrupted by a restart FINISHES on the next wake',
    SEL.coins === sellCoinsPre + 60 && (BUY.inventory.slime_gel || 0) === buyGelPre + 1
    && !st._store.has('store_listing:' + crashA.listing.id),
    { coins: SEL.coins, inv: BUY.inventory });

  // (b) a sale marker with no payment stamp goes back on the shelf.
  const crashB = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 65 });
  {
    const rec = st._store.get('store_listing:' + crashB.listing.id);
    rec.sale = { buyerId: 'bp_st_buy', buyerName: 'Buya', price: 65, paid: false, bidSeq: null, at: Date.now() };
    st._store.set('store_listing:' + crashB.listing.id, rec);
  }
  const room6 = new GameRoom(st, mockEnv);
  room6.playerState = shop.playerState;
  await room6._stEnsureIndex();
  check('store: a sale whose money never moved is re-listed, not lost',
    room6._stIndex.has(crashB.listing.id) && !room6._stIndex.get(crashB.listing.id).sale
    && !st._store.get('store_listing:' + crashB.listing.id).sale,
    st._store.get('store_listing:' + crashB.listing.id));

  // (c) a bid marker whose debit never landed is dropped; one that did is promoted.
  const crashC = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
  {
    const rec = st._store.get('store_listing:' + crashC.listing.id);
    rec.pendBid = { seq: 1, bidderId: 'bp_st_buy', bidderName: 'Buya', amount: 55, at: Date.now() };
    st._store.set('store_listing:' + crashC.listing.id, rec);
  }
  const room7 = new GameRoom(st, mockEnv);
  room7.playerState = shop.playerState;
  await room7._stEnsureIndex();
  check('store: a bid whose gold was never taken is dropped, not owed',
    room7._stIndex.get(crashC.listing.id).topBid === null && !st._store.get('store_listing:' + crashC.listing.id).pendBid,
    st._store.get('store_listing:' + crashC.listing.id));
  {
    const rec = st._store.get('store_listing:' + crashC.listing.id);
    rec.pendBid = { seq: 2, bidderId: 'bp_st_buy', bidderName: 'Buya', amount: 55, at: Date.now() };
    st._store.set('store_listing:' + crashC.listing.id, rec);
    st._store.set('oplog:store:' + crashC.listing.id + ':bid:2', Date.now());   // the debit landed
  }
  const room8 = new GameRoom(st, mockEnv);
  room8.playerState = shop.playerState;
  await room8._stEnsureIndex();
  check('store: a bid whose gold WAS taken is promoted on the next wake',
    room8._stIndex.get(crashC.listing.id).topBid?.amount === 55,
    st._store.get('store_listing:' + crashC.listing.id));
  await room8._stCancel(crashC.listing.id, 'bp_st_sell');

  /* (d)+(e) v2.3.2521 — the cancel/expiry crash window.
     `_stRelease` refunds the bid, mails the goods home, then deletes the
     record: three separate disk writes, and the worker restarts on every
     merge to main that touches server/**.  Shipped without a marker, a
     death between the refunds and the delete left a record carrying NO
     in-flight flag, so the rebuild re-listed it holding goods it had
     already returned and a bid it had already refunded — the item could
     then be bought a second time, and an accepted stale bid paid the
     seller gold nobody paid.  Both halves are measured the only way that
     catches minting: count the goods and the gold in the WHOLE world
     (live players plus whatever the shelf still holds in escrow) before
     and after, and demand they match. */
  const gelInWorld = () => {
    let n = (SEL.inventory.slime_gel || 0) + (BUY.inventory.slime_gel || 0) + (OTH.inventory.slime_gel || 0);
    for (const [k, r] of st._store) {
      if (k.startsWith('store_listing:') && r && r.invKey === 'slime_gel') n += r.qty;
    }
    return n;
  };
  const goldInWorld = () => {
    let g = SEL.coins + BUY.coins + OTH.coins;
    for (const [k, r] of st._store) {
      if (k.startsWith('store_listing:') && r && r.topBid) g += r.topBid.amount;   // escrowed bids
    }
    return g;
  };
  const realDelete = st.storage.delete;
  const dieOnDeleteOf = (id) => {
    st.storage.delete = async (k) => {
      if (k === 'store_listing:' + id) throw new Error('simulated restart before the delete');
      return realDelete(k);
    };
  };

  // (d) a seller CANCEL that died before its delete.
  SEL.inventory.slime_gel = (SEL.inventory.slime_gel || 0) + 2;
  const gelPreD = gelInWorld(); const goldPreD = goldInWorld();
  const crashD = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 2, price: 500 });
  await shop._stPlaceBid(crashD.listing.id, 'bp_st_buy', 90);
  dieOnDeleteOf(crashD.listing.id);
  let diedD = false;
  try { await shop._stCancel(crashD.listing.id, 'bp_st_sell'); } catch { diedD = true; }
  st.storage.delete = realDelete;
  check('store: (setup) the cancel refunded and then died before its delete',
    diedD && st._store.has('store_listing:' + crashD.listing.id), { diedD });
  const room9 = new GameRoom(st, mockEnv);
  room9.playerState = shop.playerState;
  await room9._stEnsureIndex();
  check('store: a cancel interrupted before its delete does NOT come back on the shelf',
    !room9._stIndex.has(crashD.listing.id) && !st._store.has('store_listing:' + crashD.listing.id),
    st._store.get('store_listing:' + crashD.listing.id));
  check('store: the interrupted cancel mints no item and no gold',
    gelInWorld() === gelPreD && goldInWorld() === goldPreD,
    { gel: gelInWorld(), wantGel: gelPreD, gold: goldInWorld(), wantGold: goldPreD });
  const ghostBuy = await room9._stBuyNow(crashD.listing.id, 'bp_st_buy');
  check('store: the cancelled listing cannot be bought a second time', ghostBuy.ok === false, ghostBuy);

  // (e) the same window on the EXPIRY path (rule 12 — no alarms, the sweep
  //     is the only thing that ever resolves these).
  SEL.inventory.slime_gel = (SEL.inventory.slime_gel || 0) + 1;
  const gelPreE = gelInWorld(); const goldPreE = goldInWorld();
  const crashE = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
  await shop._stPlaceBid(crashE.listing.id, 'bp_st_buy', 40);
  shop._stIndex.get(crashE.listing.id).expiresAt = Date.now() - 1;
  shop._stLastSweep = 0;
  dieOnDeleteOf(crashE.listing.id);
  let diedE = false;
  try { await shop._stSweep(); } catch { diedE = true; }
  st.storage.delete = realDelete;
  check('store: (setup) the expiry refunded and then died before its delete',
    diedE && st._store.has('store_listing:' + crashE.listing.id), { diedE });
  const room10 = new GameRoom(st, mockEnv);
  room10.playerState = shop.playerState;
  await room10._stEnsureIndex();
  check('store: an expiry interrupted before its delete does NOT come back on the shelf',
    !room10._stIndex.has(crashE.listing.id) && !st._store.has('store_listing:' + crashE.listing.id),
    st._store.get('store_listing:' + crashE.listing.id));
  check('store: the interrupted expiry mints no item and no gold',
    gelInWorld() === gelPreE && goldInWorld() === goldPreE,
    { gel: gelInWorld(), wantGel: gelPreE, gold: goldInWorld(), wantGold: goldPreE });

  // ── S9. browse pages ──
  SEL.inventory.slime_gel = 20;
  const madeIds = [];
  for (let i = 0; i < 5; i++) {
    const r = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 + i });
    if (r.ok) madeIds.push(r.listing.id);
  }
  const page1 = shop._stBrowse(null, null, 2);
  check('store: browse returns ONE page, not the whole shelf', page1.listings.length === 2 && !!page1.nextCursor, page1);
  const page2 = shop._stBrowse(null, page1.nextCursor, 2);
  check('store: the cursor walks forward without repeating a row',
    page2.listings.length === 2 && !page2.listings.some((l) => page1.listings.some((p) => p.id === l.id)), { page1: page1.listings.map((l) => l.id), page2: page2.listings.map((l) => l.id) });
  check('store: the page size is capped', shop._stBrowse(null, null, 9999).listings.length <= 40);
  const crafting = shop._stBrowse('crafting', null, 40);
  check('store: browse filters by the same categories the bag chips use',
    crafting.listings.length > 0 && crafting.listings.every((l) => l.cat === 'crafting'), crafting.listings.map((l) => l.cat));
  check('store: a category with nothing in it is empty, not everything',
    shop._stBrowse('armor', null, 40).listings.length === 0);

  // ── S10. HTTP surface + the token gate ──
  const sreq = (method, path, body, token) => shop.fetch(new Request('https://x' + path, {
    method,
    headers: token ? { 'x-bt-auth': token } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }));
  const browseRes = await sreq('GET', '/api/store/browse?cat=crafting&limit=3');
  const browseBody = await browseRes.json();
  check('store HTTP: browse read shape', browseRes.status === 200 && browseBody.ok === true && Array.isArray(browseBody.listings), browseBody);
  const forged = await sreq('POST', '/api/store/buy', { playerId: 'bp_st_buy', listingId: madeIds[0] }, 'not-the-token');
  check('store HTTP: a forged token is rejected (v2.3.1178)', forged.status === 403, await forged.json());
  const buyRes = await sreq('POST', '/api/store/buy', { playerId: 'bp_st_buy', listingId: madeIds[0] });
  const buyBody = await buyRes.json();
  check('store HTTP: buy carries the settled deploy-order flag',
    buyRes.status === 200 && buyBody.ok === true && buyBody.settled === true, buyBody);
  const mineRes = await sreq('GET', '/api/store/mine?playerId=bp_st_sell');
  const mineBody = await mineRes.json();
  check('store HTTP: a seller can read their own shelf', mineBody.ok === true && mineBody.listings.length > 0, mineBody);
  const cxlRes2 = await sreq('DELETE', '/api/store/cancel?id=' + madeIds[1] + '&playerId=bp_st_sell');
  const cxlBody2 = await cxlRes2.json();
  check('store HTTP: cancel carries the settled flag', cxlBody2.ok === true && cxlBody2.settled === true, cxlBody2);
  const unknown = await sreq('POST', '/api/store/teleport', { playerId: 'bp_st_buy' });
  check('store HTTP: an unknown store path is a 404, not a crash', unknown.status === 404);

  // ── S11. guards ──
  const own = await shop._stBuyNow(madeIds[2], 'bp_st_sell');
  check('store: you cannot buy your own listing', own.ok === false, own);
  const badPrice = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 0 });
  check('store: a zero price is refused', badPrice.ok === false, badPrice);
  const hugePrice = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 ** 9 });
  check('store: an absurd price is refused', hugePrice.ok === false, hugePrice);
  const protoKey = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'constructor', qty: 1, price: 10 });
  check('store: an Object.prototype key is not an item (TRAPS #6)', protoKey.ok === false, protoKey);
  const notHeld = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'dragon_hoard', qty: 1, price: 10 });
  check('store: you cannot list goods you do not hold', notHeld.ok === false, notHeld);
  const tooMany = await shop._stCreateListing({ playerId: 'bp_st_sell', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 });
  check('store: the per-player listing cap holds',
    (shop._stCounts.get('bp_st_sell') || 0) <= 10 && (tooMany.ok === false || (shop._stCounts.get('bp_st_sell') || 0) <= 10),
    { count: shop._stCounts.get('bp_st_sell'), tooMany });
  const offlineSeller = await shop._stCreateListing({ playerId: 'bp_st_ghost', kind: 'item', invKey: 'slime_gel', qty: 1, price: 10 });
  check('store: an offline player cannot list', offlineSeller.ok === false && offlineSeller.error === 'Not in game', offlineSeller);
  const poor = await shop._stBuyNow(madeIds[2], 'bp_st_oth');
  OTH.coins = 0;
  const poor2 = await shop._stBuyNow(madeIds[3], 'bp_st_oth');
  check('store: a buyer without the gold is refused and nothing is left half-sold',
    poor2.ok === false && !st._store.get('store_listing:' + madeIds[3])?.sale, poor2);


  /* ══════════════════════════════════════════════════════════════════
     S12. GEAR LISTINGS (v2.3.2531 — server/src/storegear.js)
     ══════════════════════════════════════════════════════════════════
     Phase 3 of the store.  A gear listing is the SAME record travelling
     the SAME paths as a stackable or a weapon — the `sale`/`pendBid`/
     `releasing` markers, the wake-time rebuild, credit-first settlement,
     the opId journal — so most of what needs proving here is that it
     really does travel them, and does not quietly get a second
     mechanism of its own.

     The hazards this section exists for are all duplication, and all
     were found by adversarial review (#640/#641, then #643) rather than
     by the code:
       - the WORN slot.  A piece equipped after the hand-over is recorded
         twice, once as `ps.armor` and still in `ps.armorStash`, so the
         seller can keep wearing the armour they just sold.  OPEN, and
         §S12e says so: the v2.3.2531 reconciliation for it deleted real
         spares, so it is gone and the kill switch is the bound.
       - a stale SELECTOR.  The client's stash and the server's are in
         different orders, so a card opened a moment ago can name an
         index holding something else by the time Sell is pressed.
       - the CLIENT's own copy (§S12j).  Nothing redraws these lists off
         the echo, so a listed piece has to be spliced out locally or it
         can be equipped — and re-adopted — after it was sold.

     Goods are counted the way S8 counts them: over the WHOLE world (live
     players plus whatever the shelf still holds in escrow), before and
     after, because a count that only looks at one side cannot see
     minting. */
  {
    const GSEL = 'bp_st_sell';
    const plate = (name, q) => ({ name, gearBase: 'iron', mat: 'iron', tierMult: 2.0, ...(q ? { quality: q } : null) });

    /* ═══ v2.3.2551: EVERY SELLABLE PIECE IS ONE THE SERVER MINTED ═══
       Before this version a test could put a bare object in `ps.armorStash`
       and sell it, because being in the list WAS the qualification.  It is
       not any more: the gate asks the receipt book.  So the setup has to
       mint, which is what `_gearProvRecord` does at every real mint site
       (a monster drop at pickup, a quest grant, an amulet forge press).

       The stash copy is pushed separately and deliberately, because that
       is the real shape: the server mints a piece, the piece goes to the
       player's browser, and the server's own list learns about it later
       through the join claim.  The two are not the same object, exactly as
       they are not in the game. */
    const mintInto = (pid, slot, field, piece) => {
      const ps = shop.playerState[pid];
      const rec = shop._gearProvRecord(pid, slot, { ...piece }, 'test');
      if (!Array.isArray(ps[field])) ps[field] = [];
      ps[field].push({ ...rec });
      return rec.gid;
    };
    const mintedPlate = (pid, name, q) => mintInto(pid, 'armor', 'armorStash', plate(name, q));

    /* Count one named piece everywhere it can be: the seller's stash, the
       buyer's stash, the worn slot, and any listing still holding it. */
    const pieceInWorld = (field, name) => {
      let n = 0;
      for (const ps of [SEL, BUY, OTH]) {
        if (Array.isArray(ps[field])) n += ps[field].filter((g) => g && g.name === name).length;
      }
      for (const [k, r] of st._store) {
        if (k.startsWith('store_listing:') && r && r.kind === 'gear' && r.gear && r.gear.name === name) n += 1;
      }
      return n;
    };
    const wornCount = (slot, name) => [SEL, BUY, OTH].filter((ps) => ps[slot] && ps[slot].name === name).length;

    // ── S12a. escrow takes the LEDGER's copy, and the receipt goes with it ──
    SEL.armorStash = []; SEL.armor = null;
    const torsoGid = mintedPlate(GSEL, 'Iron Torso', 'elite');

    /* The gate is asked about an ID, so a request naming a piece nobody
       minted is refused with a reason a player can read -- not with
       "Item not in stash". */
    const inflated = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', price: 250,
      sel: { name: 'Iron Torso', gearBase: 'iron', tierMult: 999 },
    });
    check('store gear: a selector that matches nothing is refused as legacy, with a reason',
      inflated.ok === false && inflated.reason === 'legacy', inflated);
    check('store gear: ...and it took nothing on the way past', SEL.armorStash.length === 1, SEL.armorStash);

    const gList = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', price: 250, gid: torsoGid,
      /* Everything a modified client could say about the piece, said, and
         all of it ignored: the goods, the card and the price basis are the
         LEDGER's copy of what this server minted. */
      sel: { name: 'Godly Iron Plate', gearBase: 'mythril', tierMult: 8, quality: 'godly', hardness: 5, temper: 9999 },
      cat: 'weapon', disp: { name: 'Godly Plate' },
    });
    check('store gear: a MINTED plate is listed, named by its receipt number',
      gList.ok === true && gList.settled === true && SEL.armorStash.length === 0, { r: gList, stash: SEL.armorStash });
    check('store gear: the card is read off the ledger\'s piece, not the request',
      gList.ok === true && gList.listing.disp.name === 'Iron Torso' && gList.listing.disp.tierMult === 2.0
      && gList.listing.disp.quality === 'elite' && gList.listing.disp.slot === 'Chest', gList.listing);
    check('store gear: it files under the bag ARMOR chip, not the claimed weapon',
      gList.listing.cat === 'armor', gList.listing);
    check('store gear: the escrowed piece is NEVER put on the wire',
      gList.listing.gear === undefined && gList.listing.gearRow === undefined
      && gList.listing.weapon === undefined, gList.listing);
    const gRec = st._store.get('store_listing:' + gList.listing.id);
    check('store gear: the escrow record holds the piece and the list it came from',
      gRec.gear?.name === 'Iron Torso' && gRec.gearField === 'armorStash', gRec);
    check('store gear: ...AND the piece\'s detached RECEIPT, escrowed beside the goods',
      !!gRec.gearRow && gRec.gearRow.id === torsoGid && gRec.gearRow.slot === 'armor', gRec.gearRow);
    check('store gear: the escrowed piece keeps its identity, so it stays provable across the counter',
      gRec.gear.gid === torsoGid && gRec.gear.prov === 'minted', gRec.gear);
    check('store gear: the forge-minted fields a client claimed are not in escrow',
      gRec.gear.hardness === undefined && gRec.gear.temper === undefined, gRec.gear);

    /* ── THE RECEIPT MOVED, SO THE PIECE CANNOT BE IN TWO PLACES ──
       This is the property the whole lane exists for.  While the piece is
       on the shelf the seller's book does not name it, so they cannot list
       it again and they cannot equip it by name either. */
    check('store gear: a piece on the shelf cannot be listed a second time',
      shop._gearSellable(GSEL, 'armor', torsoGid).reason === 'not_held',
      shop._gearSellable(GSEL, 'armor', torsoGid));
    check('store gear: ...and cannot be equipped by name while it is there',
      shop._gearProvPieceByRef(GSEL, 'armor', torsoGid) === null);
    const relist = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: torsoGid, price: 10,
    });
    check('store gear: ...and the second listing request is refused, with the reason why',
      relist.ok === false && relist.reason === 'not_held', relist);

    // ── S12b. cancel returns the piece AND its receipt ──
    const cxlG = await shop._stCancel(gList.listing.id, GSEL);
    check('store gear: cancel returns the piece to its own stash',
      cxlG.ok === true && SEL.armorStash.length === 1 && SEL.armorStash[0].name === 'Iron Torso', SEL.armorStash);
    check('store gear: the returned piece keeps its grade',
      SEL.armorStash[0].quality === 'elite', SEL.armorStash[0]);
    check('store gear: the returned piece comes back PROVABLE, under the same receipt number',
      SEL.armorStash[0].gid === torsoGid && SEL.armorStash[0].prov === 'minted', SEL.armorStash[0]);
    check('store gear: ...so it is sellable again, and the book says so',
      shop._gearSellable(GSEL, 'armor', torsoGid).ok === true, shop._gearSellable(GSEL, 'armor', torsoGid));
    check('store gear: the mark is DERIVED, not carried — the retired `_sv` is nowhere on it',
      SEL.armorStash[0]._sv === undefined, SEL.armorStash[0]);
    check('store gear: the cancelled listing is gone', !st._store.has('store_listing:' + gList.listing.id));

    // ── S12c. expiry returns the piece too (rule 12: no alarms) ──
    SEL.legsStash = [];
    const greavesGid = mintInto(GSEL, 'legsArmor', 'legsStash', plate('Iron Greaves'));
    const gExp = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'legsStash', gid: greavesGid, price: 90,
    });
    check('store gear: (setup) the greaves are escrowed', gExp.ok === true && SEL.legsStash.length === 0, SEL.legsStash);
    await shop._stPlaceBid(gExp.listing.id, 'bp_st_buy', 40);
    const expCoinsG = BUY.coins;
    shop._stIndex.get(gExp.listing.id).expiresAt = Date.now() - 1;
    shop._stLastSweep = 0;
    await shop._stSweep();
    check('store gear: expiry returns the piece to the seller',
      SEL.legsStash.length === 1 && SEL.legsStash[0].name === 'Iron Greaves', SEL.legsStash);
    check('store gear: ...with its receipt, so an expired listing does not quietly make gear unsellable',
      SEL.legsStash[0].gid === greavesGid && shop._gearSellable(GSEL, 'legsArmor', greavesGid).ok === true,
      SEL.legsStash[0]);
    check('store gear: expiry refunds the standing bid', BUY.coins === expCoinsG + 40, BUY.coins);
    check('store gear: the expired gear listing is deleted', !st._store.has('store_listing:' + gExp.listing.id));

    // ── S12d. a sale delivers the piece AND the receipt to the BUYER ──
    SEL.shieldStash = []; BUY.shieldStash = [];
    const shieldGid = mintInto(GSEL, 'shield', 'shieldStash', { name: 'Pine Shield', gearBase: 'wood', tierMult: 1.0 });
    const gSale = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'shieldStash', gid: shieldGid, price: 120,
    });
    const sellCoinsG = SEL.coins;
    const boughtG = await shop._stBuyNow(gSale.listing.id, 'bp_st_buy');
    check('store gear: buy-now settles a gear listing',
      boughtG.ok === true && boughtG.bought === true && boughtG.price === 120, boughtG);
    check('store gear: the buyer receives the piece in the right stash',
      BUY.shieldStash.length === 1 && BUY.shieldStash[0].name === 'Pine Shield', BUY.shieldStash);
    check('store gear: ...under the SAME receipt number, so it keeps its identity across the counter',
      BUY.shieldStash[0].gid === shieldGid && BUY.shieldStash[0].prov === 'minted', BUY.shieldStash[0]);
    check('store gear: the buyer can now sell it on, and the SELLER cannot',
      shop._gearSellable('bp_st_buy', 'shield', shieldGid).ok === true
      && shop._gearSellable(GSEL, 'shield', shieldGid).ok === false,
      { buyer: shop._gearSellable('bp_st_buy', 'shield', shieldGid), seller: shop._gearSellable(GSEL, 'shield', shieldGid) });
    check('store gear: the seller is paid, goods leg first', SEL.coins === sellCoinsG + 120, SEL.coins);
    check('store gear: both legs are stamped (rule 5)',
      st._store.has('oplog:store:' + gSale.listing.id + ':goods')
      && st._store.has('oplog:store:' + gSale.listing.id + ':gold'));
    check('store gear: the record is deleted LAST and is gone', !st._store.has('store_listing:' + gSale.listing.id));

    /* A DELIVERY CANNOT PUT INFLATED STATS BESIDE A GENUINE RECEIPT.  The
       goods payload is the one place a future producer could try, so the
       apply is driven directly with a lying piece under a real receipt and
       the ledger's own copy is what has to land (rule 16). */
    {
      const row = { id: shieldGid, slot: 'shield', src: 'test', at: Date.now(), p: { name: 'Pine Shield', gearBase: 'wood', tierMult: 1.0 } };
      BUY.shieldStash = [];
      await shop._creditPlayer('bp_st_buy', {
        opId: 'test:liar:1', source: 'market', kind: 'gear',
        payload: { field: 'shieldStash', piece: { name: 'Godly Shield', gearBase: 'mythril', tierMult: 8 }, row },
        note: 'a lying producer',
      });
      check('store gear: a delivery claiming a godly piece under a real receipt hands over the REAL one',
        BUY.shieldStash.length === 1 && BUY.shieldStash[0].name === 'Pine Shield'
        && BUY.shieldStash[0].tierMult === 1.0 && BUY.shieldStash[0].gid === shieldGid, BUY.shieldStash[0]);
    }

    /* ══ S12e. THE WORN SLOT: CLOSED, AND THE SPARES STILL SAFE ══
       The hole: adoption records the stash as it stood at that join, so a
       piece equipped afterwards is on the books TWICE -- as `ps.armor` and
       still in `ps.armorStash` -- and selling the stash copy left the
       seller wearing the armour they were paid for.  It needed no modified
       client: equipping a spare is the normal way to play.

       v2.3.2531 tried to close it by DELETING one stash entry whose
       name|gearBase|tierMult|tier signature matched the worn piece, and
       v2.3.2532 took that back out because the signature cannot tell a
       stale copy from a second identical plate -- it ate real spares.

       v2.3.2551 closes it without guessing.  The worn piece and its stale
       stash twin carry the SAME receipt number, and the gate refuses a
       receipt that is on the player's body: reason `worn`, which is
       something a player can act on.  Two genuinely different plates have
       two different numbers and both stay sellable.

       Counted over the WHOLE world, because "the stash is empty now" would
       pass while the piece existed twice. */
    SEL.armorStash = []; SEL.armor = null;
    const wornGid = mintedPlate(GSEL, 'Worn Plate');
    SEL.armor = { ...SEL.armorStash[0] };          // ...and now they put it on
    const wornPreTotal = pieceInWorld('armorStash', 'Worn Plate') + wornCount('armor', 'Worn Plate');
    check('store gear: (setup) the worn plate really is recorded twice', wornPreTotal === 2, wornPreTotal);
    const sellWorn = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: wornGid, price: 300,
    });
    check('store gear: CLOSED — the plate you are WEARING can no longer be listed',
      sellWorn.ok === false && sellWorn.reason === 'worn', sellWorn);
    check('store gear: ...and the refusal says something the player can act on',
      sellWorn.error === "You're wearing it — take it off first", sellWorn.error);
    check('store gear: ...and refusing it moved nothing at all',
      pieceInWorld('armorStash', 'Worn Plate') + wornCount('armor', 'Worn Plate') === wornPreTotal
      && SEL.armorStash.length === 1, { stash: SEL.armorStash, worn: SEL.armor });
    /* The selector path has to reach the same answer -- an old browser must
       not be able to sell what a new one cannot. */
    const sellWornSel = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', sel: SEL.armorStash[0], hint: 0, price: 300,
    });
    check('store gear: ...and an OLD client naming it by selector is refused identically',
      sellWornSel.ok === false && sellWornSel.reason === 'worn', sellWornSel);
    /* Take it off and it sells, which is what the refusal promised. */
    SEL.armor = null;
    const sellUnworn = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: wornGid, price: 300,
    });
    check('store gear: ...take it off and the same piece lists fine', sellUnworn.ok === true, sellUnworn);
    if (sellUnworn.ok) await shop._stCancel(sellUnworn.listing.id, GSEL);

    /* THE REGRESSION THE 2532 REMOVAL EXISTS FOR, still pinned.  A player
       wearing a plate and holding one real spare of it: no listing they
       make, and no listing they are REFUSED, may take that spare off them.
       Two separate mints, so two separate receipts -- which is exactly
       what the old signature heuristic could not see. */
    SEL.armorStash = []; SEL.armor = null; SEL.shieldStash = [];
    const twinWornGid = mintedPlate(GSEL, 'Twin Plate');
    SEL.armor = { ...SEL.armorStash[0] };
    SEL.armorStash = [];
    const twinSpareGid = mintedPlate(GSEL, 'Twin Plate');
    const pineGid = mintInto(GSEL, 'shield', 'shieldStash', { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 });
    const spareBefore = SEL.armorStash.length;
    for (let i = 0; i < 3; i++) {
      const miss = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', sel: plate('Nothing Plate'), price: 10,
      });
      check('store gear: a listing that names nothing is refused (round ' + (i + 1) + ')', miss.ok === false, miss);
    }
    check('store gear: ...and three refused requests did NOT erode the real spare',
      SEL.armorStash.length === spareBefore && SEL.armorStash[0].name === 'Twin Plate', SEL.armorStash);
    const sellShield = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'shieldStash', gid: pineGid, price: 40,
    });
    check('store gear: selling a SHIELD works', sellShield.ok === true, sellShield);
    check('store gear: ...and it touches no other list — the armour spare is untouched',
      SEL.armorStash.length === 1 && SEL.armorStash[0].name === 'Twin Plate'
      && SEL.armor && SEL.armor.name === 'Twin Plate', SEL.armorStash);
    if (sellShield.ok) await shop._stCancel(sellShield.listing.id, GSEL);
    const sellSpare = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: twinSpareGid, price: 150,
    });
    check('store gear: the SPARE is sellable even though an identical plate is worn',
      sellSpare.ok === true, sellSpare);
    check('store gear: ...and exactly one copy is left behind, wearing the other',
      SEL.armorStash.filter((g) => g.name === 'Twin Plate').length === 0
      && SEL.armor.name === 'Twin Plate'
      && pieceInWorld('armorStash', 'Twin Plate') + wornCount('armor', 'Twin Plate') === 2,
      { stash: SEL.armorStash, escrowed: pieceInWorld('armorStash', 'Twin Plate') });
    check('store gear: ...and the WORN twin is still refused, by its own number',
      shop._gearSellable(GSEL, 'armor', twinWornGid).reason === 'worn',
      shop._gearSellable(GSEL, 'armor', twinWornGid));
    await shop._stCancel(sellSpare.listing.id, GSEL);
    check('store gear: the removed reconciliation really is gone from the room',
      typeof shop._stGearReconcileWorn === 'undefined', typeof shop._stGearReconcileWorn);
    check('store gear: ...and so is every part of the retired `_sv` mark',
      typeof shop._stGearListable === 'undefined' && typeof shop._stGearStrip === 'undefined',
      { listable: typeof shop._stGearListable, strip: typeof shop._stGearStrip });

    /* ══ S12f. NAMING THE PIECE: the id, and the selector an old client sends ══
       Both naming paths reach the SAME gate; what differs is precision.
       `hint` is still a tie-break and never an address, and a selector
       that names nothing must take nothing at all. */
    SEL.armorStash = []; SEL.armor = null;
    const copperGid = mintedPlate(GSEL, 'Copper Torso');
    const steelGid = mintedPlate(GSEL, 'Steel Torso');
    void copperGid;
    const staleHint = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash',
      sel: SEL.armorStash[1], hint: 0,        // index 0 is the COPPER one
      price: 80,
    });
    check('store gear: an old client\'s stale index does not sell the wrong piece',
      staleHint.ok === true && staleHint.listing.disp.name === 'Steel Torso'
      && SEL.armorStash.length === 1 && SEL.armorStash[0].name === 'Copper Torso',
      { listed: staleHint.listing.disp, left: SEL.armorStash });
    check('store gear: ...and it escrowed the receipt the SERVER holds for it',
      st._store.get('store_listing:' + staleHint.listing.id).gearRow.id === steelGid,
      st._store.get('store_listing:' + staleHint.listing.id).gearRow);
    await shop._stCancel(staleHint.listing.id, GSEL);

    const gonePiece = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', sel: plate('Mythril Torso'), price: 80,
    });
    const stashAfterMiss = SEL.armorStash.length;
    check('store gear: a piece that is in no stash and no book lists nothing',
      gonePiece.ok === false && gonePiece.reason === 'legacy', gonePiece);
    check('store gear: ...and a refused listing takes nothing out of the stash',
      stashAfterMiss === 2, SEL.armorStash);

    /* THE ID REACHES WHAT THE SELECTOR CANNOT.  A quest plate goes straight
       to the browser's bag; the server's own stash snapshot learns of it
       only at the next join.  Until then the selector finds nothing while
       the receipt number finds the row -- which is the whole reason
       `caps.storeGearRef` is worth advertising. */
    {
      const notAdopted = shop._gearProvRecord(GSEL, 'armor', plate('Unadopted Plate'), 'quest');
      const byName = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', sel: { ...notAdopted }, price: 55,
      });
      check('store gear: a selector cannot find a piece our stash snapshot has not adopted',
        byName.ok === false, byName);
      const byId = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: notAdopted.gid, price: 55,
      });
      check('store gear: ...but its receipt number can, and lists the LEDGER\'s copy',
        byId.ok === true && byId.listing.disp.name === 'Unadopted Plate', byId);
      if (byId.ok) await shop._stCancel(byId.listing.id, GSEL);
    }

    /* A FORGED RECEIPT NUMBER BUYS NOTHING.  Three shapes: another
       player's real number, a number nobody ever issued, and '__proto__'
       (TRAPS #6 -- the ledger's list is an ARRAY, so there is no key to
       poison, but the request still has to be refused). */
    {
      BUY.armorStash = [];
      const theirsGid = mintInto('bp_st_buy', 'armor', 'armorStash', plate('Not Yours'));
      const stashBefore = BUY.armorStash.length;
      const forged = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: theirsGid, price: 5,
      });
      check('store gear: another player\'s receipt number is not yours to sell',
        forged.ok === false && forged.reason === 'not_held', forged);
      check('store gear: ...and it took nothing off them', BUY.armorStash.length === stashBefore, BUY.armorStash);
      const never = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: 'g-never-issued', price: 5,
      });
      check('store gear: a number nobody issued is refused', never.ok === false && never.reason === 'not_held', never);
      const proto = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: '__proto__', price: 5,
      });
      check("store gear: '__proto__' as a receipt number is refused like any other miss",
        proto.ok === false && proto.reason === 'not_held', proto);
    }

    /* ══ S12g. THE CRASH WINDOW, on both release paths ══
       `_stRelease` is three disk writes and the worker restarts on every
       merge touching server/**.  Gear must be protected by the SAME
       `releasing` marker as everything else (v2.3.2521) — not a second
       mechanism — or a death between the refund and the delete puts the
       listing back on the shelf holding a piece it already handed back:
       buy it again and the plate has been minted.

       v2.3.2551 adds one more thing to protect: the RECEIPT travels inside
       the same record, so the same marker recovers it and there is still
       no second recovery mechanism. */
    const platesInWorld = (name) => pieceInWorld('armorStash', name) + wornCount('armor', name);
    const goldInWorldG = () => {
      let g = SEL.coins + BUY.coins + OTH.coins;
      for (const [k, r] of st._store) {
        if (k.startsWith('store_listing:') && r && r.topBid) g += r.topBid.amount;
      }
      return g;
    };
    const realDelG = st.storage.delete;
    const dieOnDeleteOfG = (id) => {
      st.storage.delete = async (k) => {
        if (k === 'store_listing:' + id) throw new Error('simulated restart before the delete');
        return realDelG(k);
      };
    };

    // (g1) a seller CANCEL of a gear listing that died before its delete.
    SEL.armorStash = []; SEL.armor = null;
    const crashGid = mintedPlate(GSEL, 'Crash Plate');
    const gPreCount = platesInWorld('Crash Plate'); const gPreGold = goldInWorldG();
    const crashG = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: crashGid, price: 500,
    });
    await shop._stPlaceBid(crashG.listing.id, 'bp_st_buy', 70);
    dieOnDeleteOfG(crashG.listing.id);
    let diedG = false;
    try { await shop._stCancel(crashG.listing.id, GSEL); } catch { diedG = true; }
    st.storage.delete = realDelG;
    check('store gear: (setup) the cancel returned the piece and then died before its delete',
      diedG && st._store.has('store_listing:' + crashG.listing.id), { diedG });
    check('store gear: (setup) ...and it carries the releasing marker, not a clean record',
      !!st._store.get('store_listing:' + crashG.listing.id).releasing,
      st._store.get('store_listing:' + crashG.listing.id));
    const roomG1 = new GameRoom(st, mockEnv);
    roomG1.playerState = shop.playerState;
    roomG1._gearProvCache = shop._gearProvCache;
    await roomG1._stEnsureIndex();
    check('store gear: an interrupted cancel does NOT come back on the shelf',
      !roomG1._stIndex.has(crashG.listing.id) && !st._store.has('store_listing:' + crashG.listing.id),
      st._store.get('store_listing:' + crashG.listing.id));
    check('store gear: the interrupted cancel mints no plate and no gold',
      platesInWorld('Crash Plate') === gPreCount && goldInWorldG() === gPreGold,
      { plates: platesInWorld('Crash Plate'), want: gPreCount, gold: goldInWorldG(), wantGold: gPreGold });
    check('store gear: ...and exactly ONE receipt for it, so it is neither lost nor doubled',
      shop._gearProvOf(GSEL).list.filter((r) => r.id === crashGid).length === 1
      && shop._gearSellable(GSEL, 'armor', crashGid).ok === true,
      shop._gearSellable(GSEL, 'armor', crashGid));
    const ghostBuyG = await roomG1._stBuyNow(crashG.listing.id, 'bp_st_buy');
    check('store gear: the cancelled gear listing cannot be bought a second time', ghostBuyG.ok === false, ghostBuyG);

    // (g2) the same window on the EXPIRY path.
    SEL.armorStash = []; SEL.armor = null;
    const expGid = mintedPlate(GSEL, 'Expiry Plate');
    const ePreCount = platesInWorld('Expiry Plate'); const ePreGold = goldInWorldG();
    const crashGE = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: expGid, price: 500,
    });
    await shop._stPlaceBid(crashGE.listing.id, 'bp_st_buy', 35);
    shop._stIndex.get(crashGE.listing.id).expiresAt = Date.now() - 1;
    shop._stLastSweep = 0;
    dieOnDeleteOfG(crashGE.listing.id);
    let diedGE = false;
    try { await shop._stSweep(); } catch { diedGE = true; }
    st.storage.delete = realDelG;
    check('store gear: (setup) the expiry returned the piece and then died before its delete',
      diedGE && st._store.has('store_listing:' + crashGE.listing.id), { diedGE });
    const roomG2 = new GameRoom(st, mockEnv);
    roomG2.playerState = shop.playerState;
    roomG2._gearProvCache = shop._gearProvCache;
    await roomG2._stEnsureIndex();
    check('store gear: an interrupted expiry does NOT come back on the shelf',
      !roomG2._stIndex.has(crashGE.listing.id) && !st._store.has('store_listing:' + crashGE.listing.id),
      st._store.get('store_listing:' + crashGE.listing.id));
    check('store gear: the interrupted expiry mints no plate and no gold',
      platesInWorld('Expiry Plate') === ePreCount && goldInWorldG() === ePreGold,
      { plates: platesInWorld('Expiry Plate'), want: ePreCount, gold: goldInWorldG(), wantGold: ePreGold });

    // (g3) a plain restart over a RESTING gear listing keeps the escrow
    //      intact -- goods AND receipt -- and still refunds afterwards.
    SEL.armorStash = []; SEL.armor = null;
    const rebuildGid = mintedPlate(GSEL, 'Rebuild Plate');
    const restG = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: rebuildGid, price: 210,
    });
    const roomG3 = new GameRoom(st, mockEnv);
    roomG3.playerState = shop.playerState;
    roomG3._gearProvCache = shop._gearProvCache;
    await roomG3._stEnsureIndex();
    check('store gear: a resting gear listing survives a restart with its piece AND its receipt',
      roomG3._stIndex.get(restG.listing.id)?.gear?.name === 'Rebuild Plate'
      && roomG3._stIndex.get(restG.listing.id)?.gearField === 'armorStash'
      && roomG3._stIndex.get(restG.listing.id)?.gearRow?.id === rebuildGid,
      roomG3._stIndex.get(restG.listing.id));
    const stashPreG3 = SEL.armorStash.length;
    await roomG3._stCancel(restG.listing.id, GSEL);
    check('store gear: the rebuilt room returns the piece to the right stash, still provable',
      SEL.armorStash.length === stashPreG3 + 1
      && SEL.armorStash.some((g) => g.name === 'Rebuild Plate' && g.gid === rebuildGid), SEL.armorStash);

    /* (g4) THE ONE WINDOW THAT FAILS THE OTHER WAY, stated because it is a
       real cost.  `_gearProvTake` is synchronous and the listing record is
       written immediately after it.  If the room dies in between, the
       receipt is gone and the piece is out of the server's stash -- and the
       player's own browser still holds its copy, because the client only
       splices on `ok`.  Their next join re-adopts it and it comes back
       LEGACY: usable, worn, counted in the damage maths, not sellable.
       Never in two places, which is the direction that would be money. */
    {
      SEL.armorStash = []; SEL.armor = null;
      const doomedGid = mintedPlate(GSEL, 'Doomed Plate');
      const clientCopy = { ...SEL.armorStash[0] };      // the browser's own copy
      const realPutG = st.storage.put;
      st.storage.put = async (k, v) => {
        if (k.startsWith('store_listing:')) throw new Error('simulated death before the record landed');
        return realPutG(k, v);
      };
      let dead = false;
      try {
        await shop._stCreateListing({ playerId: GSEL, kind: 'gear', field: 'armorStash', gid: doomedGid, price: 70 });
      } catch { dead = true; }
      st.storage.put = realPutG;
      check('store gear: (setup) the record could not be written', dead === true);
      /* The unwind is the ordinary path and it hands BOTH back, so the
         piece is whole again.  What is pinned here is that it is never in
         two places, whichever half survived. */
      check('store gear: a listing whose record failed leaves exactly one copy in the world',
        platesInWorld('Doomed Plate') === 1, { world: platesInWorld('Doomed Plate'), stash: SEL.armorStash });
      const verdict = shop._gearSellable(GSEL, 'armor', doomedGid);
      check('store gear: ...and it is either fully whole or merely unsellable — never a duplicate',
        verdict.ok === true || verdict.reason === 'not_held' || verdict.reason === 'legacy', verdict);
      /* And the browser's surviving copy, re-adopted, can never promote
         itself: `prov` is derived from the book, never read off the wire. */
      const readopted = shop._gearProvResolve(GSEL, 'armor', { ...clientCopy, prov: 'minted' }, null, false);
      check('store gear: a browser re-offering the piece cannot promote it by claiming `minted`',
        readopted.prov === 'minted' ? !!shop._gearProvOf(GSEL).list.find((r) => r.id === readopted.gid) : readopted.prov === 'legacy',
        readopted);
    }

    // ── S12h. an offline seller gets the piece AND the receipt in the MAIL ──
    SEL.armorStash = []; SEL.armor = null;
    const mailGid = mintedPlate(GSEL, 'Mail Plate');
    const gMail = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: mailGid, price: 400,
    });
    const savedSel = shop.playerState[GSEL];
    delete shop.playerState[GSEL];                 // the seller logs off
    await shop._stCancel(gMail.listing.id, GSEL);
    const gearMail = (st._store.get('inbox:' + GSEL) || []).filter((e) => e.kind === 'gear');
    check('store gear: an offline seller is mailed the piece, with the list named',
      gearMail.some((e) => e.payload.field === 'armorStash' && e.payload.piece.name === 'Mail Plate'), gearMail);
    check('store gear: ...and the receipt travels INSIDE the mail entry, not granted ahead of it',
      gearMail.some((e) => e.payload.row && e.payload.row.id === mailGid), gearMail);
    shop.playerState[GSEL] = savedSel;
    await shop._drainInbox(GSEL, wsSel);
    check('store gear: ...and the next join drains it back into that stash',
      SEL.armorStash.some((g) => g.name === 'Mail Plate'), SEL.armorStash);
    check('store gear: ...provable again, under the same number',
      SEL.armorStash.some((g) => g.name === 'Mail Plate' && g.gid === mailGid)
      && shop._gearSellable(GSEL, 'armor', mailGid).ok === true, SEL.armorStash);

    // ── S12i. guards and the kill switch ──
    SEL.armorStash = []; SEL.armor = null;
    const guardGid = mintedPlate(GSEL, 'Guard Plate');
    const badField = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'constructor', gid: guardGid, price: 10,
    });
    check('store gear: an Object.prototype name is not a stash (TRAPS #6)', badField.ok === false, badField);
    const noField = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'weaponStash', gid: guardGid, price: 10,
    });
    check('store gear: only the five gear lists are listable this way', noField.ok === false, noField);
    const noSel = await shop._stCreateListing({ playerId: GSEL, kind: 'gear', field: 'armorStash', price: 10 });
    check('store gear: a listing that names no piece is refused', noSel.ok === false, noSel);
    const wrongSlot = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'shieldStash', gid: guardGid, price: 10,
    });
    check("store gear: a chest piece's number offered as a shield answers 'wrong_slot'",
      wrongSlot.ok === false && wrongSlot.reason === 'wrong_slot', wrongSlot);
    check('store gear: none of those refusals took the plate',
      SEL.armorStash.length === 1 && SEL.armorStash[0].name === 'Guard Plate', SEL.armorStash);

    /* The kill switch: one live-ops flag write stops gear listings being
       ACCEPTED, not just advertised, so a client that kept its button is
       still refused.  Existing listings are untouched by it on purpose — a
       switch that destroyed live escrow would be worse than the thing it
       switches off.  It is no longer BOUNDING an accepted risk (the gate
       does that now); it is an ordinary lever on a money path. */
    shop._liveFlags = { storeGear: false };
    const killed = await shop._stCreateListing({
      playerId: GSEL, kind: 'gear', field: 'armorStash', gid: guardGid, price: 10,
    });
    check('store gear: the live-ops kill switch refuses new gear listings',
      killed.ok === false && killed.error === 'Gear cannot be listed right now', killed);
    check('store gear: ...and refusing it still takes nothing', SEL.armorStash.length === 1, SEL.armorStash);
    const stillItems = await shop._stCreateListing({ playerId: 'bp_st_oth', kind: 'item', invKey: 'slime_gel', qty: 1, price: 5 });
    void stillItems;   // OTH may hold no gel; the point is only that the switch is gear-only
    check('store gear: the switch is gear-only — it is not a store-wide off',
      stillItems.error !== 'Gear cannot be listed right now', stillItems);
    shop._liveFlags = {};

    /* ══ S12l. EVERY REFUSAL CARRIES A REASON THE PLAYER CAN READ ══
       #648 promised this and nothing delivered it: `prov` reached the
       browser and was read by nobody, so a Sell button either was not
       there or failed with "Invalid item".  The reason is now part of the
       answer, and each one is a different sentence — `cosmetic` most of
       all, because outfits are unsellable BY DESIGN and telling a player
       "earned before receipts" would read as an oversight to go and fix.

       Driven through the real HTTP route, not the helper, because that is
       the surface the browser actually reads. */
    {
      const sreq = (body) => shop.fetch(new Request('https://x/api/store/list?room=brotown-1', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bt-auth': shop._httpTokens?.get?.(GSEL) || '' },
        body: JSON.stringify(body),
      }));
      shop._httpAuthCheck = () => true;   // the token gate has its own section (S10)

      SEL.armorStash = []; SEL.armor = null; SEL.gearStash = [{ slot: 'chest', gearId: 'steelchest', name: 'Steel Chest' }];
      const legacyPlate = { ...plate('Grandfather Plate') };        // no receipt: minted before the book
      SEL.armorStash.push(legacyPlate);
      const wornBodyGid = mintedPlate(GSEL, 'On My Back');
      SEL.armor = { ...SEL.armorStash[SEL.armorStash.length - 1] };

      const answers = {};
      for (const [label, body] of [
        ['legacy', { playerId: GSEL, kind: 'gear', field: 'armorStash', sel: legacyPlate, price: 10 }],
        ['cosmetic', { playerId: GSEL, kind: 'gear', field: 'gearStash', sel: SEL.gearStash[0], price: 10 }],
        ['worn', { playerId: GSEL, kind: 'gear', field: 'armorStash', gid: wornBodyGid, price: 10 }],
        ['not_held', { playerId: GSEL, kind: 'gear', field: 'armorStash', gid: 'g-nope', price: 10 }],
        ['wrong_slot', { playerId: GSEL, kind: 'gear', field: 'shieldStash', gid: wornBodyGid, price: 10 }],
      ]) {
        answers[label] = await (await sreq(body)).json();
      }
      for (const want of ['legacy', 'cosmetic', 'worn', 'not_held', 'wrong_slot']) {
        check("store gear: the browser is told '" + want + "' over HTTP, with a sentence",
          answers[want].ok === false && answers[want].settled === true
          && answers[want].reason === want && typeof answers[want].error === 'string' && answers[want].error.length > 0,
          answers[want]);
      }
      check('store gear: an outfit layer is NOT told it was "earned before receipts"',
        answers.cosmetic.error !== answers.legacy.error, { c: answers.cosmetic.error, l: answers.legacy.error });
      check('store gear: ...and no refusal took anything',
        SEL.armorStash.length === 2 && SEL.gearStash.length === 1 && !!SEL.armor,
        { armor: SEL.armorStash, gear: SEL.gearStash });

      /* A piece STILL IN THE POST is the fifth answer, and it needs the
         mail to really hold one -- a full stash defers a delivery while
         the player is online, which is how the row and the piece came
         apart in the first place (#650's review). */
      SEL.legsStash = [];
      const postGid = mintInto(GSEL, 'legsArmor', 'legsStash', plate('Posted Greaves'));
      const taken = shop._gearProvTake(GSEL, 'legsArmor', postGid);
      SEL.legsStash = new Array(32).fill(null).map((_, i) => plate('Filler ' + i));   // GEAR_STASH_CAP
      await shop._creditPlayer(GSEL, {
        opId: 'test:post:1', source: 'market', kind: 'gear',
        payload: { field: 'legsStash', piece: taken.piece, row: taken.row }, note: 'in the post',
      });
      const postAnswer = await (await sreq({ playerId: GSEL, kind: 'gear', field: 'legsStash', gid: postGid, price: 10 })).json();
      check("store gear: a piece sitting in the mail answers 'in_mail', not 'not yours'",
        postAnswer.ok === false && postAnswer.reason === 'in_mail', postAnswer);
      SEL.legsStash = [];
      await shop._drainInbox(GSEL, wsSel);
      check('store gear: ...and once it lands it is sellable, under the same number',
        SEL.legsStash.some((g) => g.gid === postGid) && shop._gearSellable(GSEL, 'legsArmor', postGid).ok === true,
        SEL.legsStash);
    }

    /* ══ S12n. THE DAY THIS DEPLOYS, AND THE HAPPY PATH OVER HTTP ══
       (v2.3.2553, review of #653 -- three named gaps, all cheap.)

       The FIRST is the case that actually happens on merge day: a gear
       listing placed by a v2.3.2531 worker is already resting on the shelf
       and has no `gearRow`, because the field did not exist when it was
       written.  `_stGoodsCredit` sends `rec.gearRow || null`, so nothing
       is granted and the piece must arrive LEGACY -- usable, unsellable,
       never refused and never lost.  Nothing exercised that. */
    {
      const oldRec = {
        id: 'legacy-listing-1', sellerId: GSEL, sellerName: 'Sella', kind: 'gear',
        invKey: null, weapon: null,
        gear: { name: 'Pre-Ledger Plate', gearBase: 'iron', mat: 'iron', tierMult: 2 },
        gearField: 'armorStash',        /* and deliberately NO gearRow */
        qty: 1, cat: 'armor', disp: { name: 'Pre-Ledger Plate', slot: 'Chest' },
        askPrice: 50, createdAt: Date.now(), expiresAt: Date.now() + 1000,
        bidSeq: 0, topBid: null, pendBid: null, bids: [], sale: null,
      };
      await st.storage.put('store_listing:' + oldRec.id, oldRec);
      const roomOld = new GameRoom(st, mockEnv);
      roomOld.playerState = shop.playerState;
      roomOld._gearProvCache = shop._gearProvCache;
      await roomOld._stEnsureIndex();
      check('deploy day: a listing written before the receipt existed still rests',
        roomOld._stIndex.has(oldRec.id), [...roomOld._stIndex.keys()]);
      BUY.armorStash = [];
      const oldBuy = await roomOld._stBuyNow(oldRec.id, 'bp_st_buy');
      check('deploy day: ...and still SELLS rather than being refused', oldBuy.ok === true, oldBuy);
      const got = BUY.armorStash.find((g) => g && g.name === 'Pre-Ledger Plate');
      check('deploy day: ...the buyer gets the piece, at its real stats',
        !!got && got.tierMult === 2, BUY.armorStash);
      check('deploy day: ...marked legacy rather than carrying a receipt nothing backs',
        got.prov === 'legacy' && got.gid === undefined, got);
      check('deploy day: ...so the buyer cannot re-list it, and is told why',
        shop._gearSellable('bp_st_buy', 'armor', got).reason === 'legacy',
        shop._gearSellable('bp_st_buy', 'armor', got));
    }

    /* The SECOND: every successful gear listing in this section goes
       through `_stCreateListing` directly; only the refusals went through
       the real route, so the shape of a SUCCESSFUL answer over HTTP was
       unpinned -- including `settled: true`, which is the deploy-order
       contract (rule 19), and the absence of the goods from the wire. */
    {
      const sreq2 = (body) => shop.fetch(new Request('https://x/api/store/list?room=brotown-1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }));
      shop._httpAuthCheck = () => true;   /* covered on its own in S10 */
      SEL.armorStash = []; SEL.armor = null;
      const httpGid = mintedPlate(GSEL, 'Counter Plate');
      const okBody = await (await sreq2({ playerId: GSEL, kind: 'gear', field: 'armorStash', gid: httpGid, price: 77 })).json();
      check('http: a successful gear listing answers ok + settled, over the real route',
        okBody.ok === true && okBody.settled === true && !!okBody.listing, okBody);
      check('http: ...carrying the derived card and NOT the goods or the receipt',
        okBody.listing.disp.name === 'Counter Plate' && okBody.listing.askPrice === 77
        && okBody.listing.gear === undefined && okBody.listing.gearRow === undefined, okBody.listing);
      check('http: ...and no reason rides a success', okBody.reason === undefined, okBody);
      if (okBody.ok) await shop._stCancel(okBody.listing.id, GSEL);
    }

    /* The THIRD: the SERVER's own id bound.  Only the browser's was
       tested.  An over-long id must not reach a comparison or a Map key;
       it falls through to the selector path and ends up `legacy`, which is
       the right answer but was never asserted. */
    {
      SEL.armorStash = []; SEL.armor = null;
      const boundGid = mintedPlate(GSEL, 'Bound Plate');
      const tooLong = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: 'g' + 'x'.repeat(60), price: 10,
      });
      check('store gear: an over-long id is not an id we issued, and is refused',
        tooLong.ok === false && tooLong.reason === 'legacy', tooLong);
      check('store gear: ...and refusing it took nothing',
        SEL.armorStash.length === 1 && shop._gearSellable(GSEL, 'armor', boundGid).ok === true, SEL.armorStash);
    }

    /* ══ S12o. A PIECE KEEPS ITS MATERIAL — AND ITS COLOUR — ACROSS A SALE ══
       (v2.3.2554.)

       The owner read "outfits aren't sellable" in the PR body and asked
       whether that meant their armour: *"the copper armor is supposed to be
       its own tier of armor (even though it's just recolored from iron) so
       it needs to be able to be bought and sold and retain its color."*

       It does, and this is the proof rather than the assurance.  Copper is
       a real tier of stat armour, not a cosmetic: `QUEST_REWARDS.life_2`
       and `.tut_4` grant `Copper Torso` and `Copper Greaves` with
       `mat: 'copper'`, and a quest grant is one of the mint paths #648
       records — so copper carries a receipt and IS sellable.  The colour
       is not chosen separately either: `gearCatalog.js` derives the art
       from the piece with `gearIdFor(slot, R.armor.mat)`, so `mat` riding
       on the object is what makes a buyer see copper.

       What this PR actually makes unsellable is only the separate
       `gearStash` COSMETIC entry — a `{slot, gearId}` pair with no stats
       and no material.

       The items come from the REAL tables rather than from a copy of their
       fields, so this test cannot quietly drift away from the catalog the
       game grants; and the sale is driven through the real HTTP route. */
    {
      const wornCopper = QUEST_REWARDS.life_2.item;
      const legsCopper = QUEST_REWARDS.tut_4.item;
      check('copper: (guard) the catalog still grants copper as STAT armour with a material',
        wornCopper.kind === 'armor' && wornCopper.mat === 'copper' && wornCopper.tierMult === 1
        && legsCopper.kind === 'legs' && legsCopper.mat === 'copper',
        { chest: wornCopper, legs: legsCopper });

      const sreq3 = (body) => shop.fetch(new Request('https://x/api/store/list?room=brotown-1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }));
      shop._httpAuthCheck = () => true;   /* covered on its own in S10 */
      shop._prog3EquipOk = () => true;

      SEL.armorStash = []; SEL.armor = null; SEL.legsStash = []; SEL.legsArmor = null;
      BUY.armorStash = []; BUY.legsStash = [];
      /* The buyer has been shopping all section; top them up so a refusal
         here is about the GEAR and never about the wallet.  (A "Not enough
         gold" answer would have made this test pass for the wrong reason
         had it been asserting a refusal instead of a sale.) */
      BUY.coins = 5000;
      SEL._questGrantOverflow = null;
      shop._grantQuestItem(SEL, wornCopper, GSEL);
      const copperGid = SEL._questGrantOverflow[SEL._questGrantOverflow.length - 1].gid;
      check('copper: the quest grant mints it with a receipt',
        !!copperGid && SEL._questGrantOverflow[SEL._questGrantOverflow.length - 1].mat === 'copper',
        SEL._questGrantOverflow[SEL._questGrantOverflow.length - 1]);

      /* WORN, on a piece that actually carries a material — the existing
         worn tests use a plain plate, so this is the material-bearing
         case, equipped through the real route. */
      await shop.webSocketMessage(wsSel, JSON.stringify({ type: 'stats_update', payload: { armorRef: copperGid } }));
      check('copper: (setup) the real equip route put it on, in copper',
        !!SEL.armor && SEL.armor.gid === copperGid && SEL.armor.mat === 'copper', SEL.armor);
      const copperWorn = await (await sreq3({ playerId: GSEL, kind: 'gear', field: 'armorStash', gid: copperGid, price: 120 })).json();
      check('copper: it is refused while you are WEARING it, with the reason',
        copperWorn.ok === false && copperWorn.reason === 'worn', copperWorn);
      await shop.webSocketMessage(wsSel, JSON.stringify({ type: 'stats_update', payload: { armorRef: null } }));

      /* ...and sells once it is off, over the real route, keeping colour. */
      const copperList = await (await sreq3({ playerId: GSEL, kind: 'gear', field: 'armorStash', gid: copperGid, price: 120 })).json();
      check('copper: ...and sells once it is off', copperList.ok === true, copperList);
      check('copper: the shelf card shows the material, so a buyer sees the colour BEFORE buying',
        copperList.listing.disp.mat === 'copper' && copperList.listing.disp.name === 'Copper Torso',
        copperList.listing.disp);
      const copperBuy = await shop._stBuyNow(copperList.listing.id, 'bp_st_buy');
      check('copper: the sale settles', copperBuy.ok === true && copperBuy.bought === true, copperBuy);
      const gotCopper = BUY.armorStash.find((g) => g && g.name === 'Copper Torso');
      check('copper: THE BUYER RECEIVES IT AS COPPER, at its own tier',
        !!gotCopper && gotCopper.mat === 'copper' && gotCopper.tierMult === 1, gotCopper);
      check('copper: ...under the same receipt, so they can sell it on again',
        gotCopper.gid === copperGid && shop._gearSellable('bp_st_buy', 'armor', copperGid).ok === true,
        shop._gearSellable('bp_st_buy', 'armor', copperGid));

      /* The LEGS twin, because the two are granted by different quests and
         a per-slot table is exactly the kind of thing that goes wrong once. */
      SEL._questGrantOverflow = null;
      shop._grantQuestItem(SEL, legsCopper, GSEL);
      const legsGid = SEL._questGrantOverflow[SEL._questGrantOverflow.length - 1].gid;
      const legsList = await (await sreq3({ playerId: GSEL, kind: 'gear', field: 'legsStash', gid: legsGid, price: 60 })).json();
      check('copper: the legs sell too', legsList.ok === true, legsList);
      const legsBuy = await shop._stBuyNow(legsList.listing.id, 'bp_st_buy');
      check('copper: ...and the buyer gets copper greaves, not plain ones',
        legsBuy.ok === true && BUY.legsStash.some((g) => g && g.name === 'Copper Greaves' && g.mat === 'copper'),
        BUY.legsStash);

      /* IRON is the tier above and arrives by a different route — a monster
         drop.  The drop path's own recording is pinned in gearprov §2
         through the real `loot_pickup` handler; what is pinned here is that
         the SALE keeps the material, read off the real drop table. */
      const ironDrop = MONSTER_ARMOR_DROPS[0];
      check('iron: (guard) the drop table still carries a material and the tier-two multiplier',
        ironDrop.mat === 'iron' && ironDrop.tierMult === 2 && ironDrop.slot === 'armor', ironDrop);
      SEL.armorStash = []; SEL.armor = null; BUY.armorStash = [];
      const ironMinted = shop._gearProvRecord(GSEL, 'armor',
        { name: ironDrop.name, mat: ironDrop.mat, tierMult: ironDrop.tierMult }, 'drop');
      const ironList = await (await sreq3({ playerId: GSEL, kind: 'gear', field: 'armorStash', gid: ironMinted.gid, price: 300 })).json();
      check('iron: a dropped plate sells', ironList.ok === true, ironList);
      const ironBuy = await shop._stBuyNow(ironList.listing.id, 'bp_st_buy');
      const gotIron = BUY.armorStash.find((g) => g && g.name === 'Iron Torso');
      check('iron: the buyer receives it as iron, at tier two',
        ironBuy.ok === true && !!gotIron && gotIron.mat === 'iron' && gotIron.tierMult === 2, gotIron);
      check('copper and iron are DIFFERENT pieces to the game, not one recoloured twice',
        gotCopper.mat !== gotIron.mat && gotCopper.tierMult !== gotIron.tierMult,
        { copper: gotCopper.mat + '/' + gotCopper.tierMult, iron: gotIron.mat + '/' + gotIron.tierMult });

      /* And the thing that IS unsellable, side by side with them, so the
         difference is one assertion apart rather than one document apart. */
      check('...while the separate COSMETIC layer is the only thing refused, and by its own reason',
        shop._gearSellable(GSEL, 'gear', { slot: 'chest', gearId: 'steelchest' }).reason === 'cosmetic',
        shop._gearSellable(GSEL, 'gear', { slot: 'chest', gearId: 'steelchest' }));
    }

    /* ══ S12m. THE REASON TABLE IS MIRRORED, AND PINNED ══
       The browser cannot ask the worker "would you refuse this?" once per
       card, so it carries its own copy of the sentences
       (src/ui/mobile/dash/gearSellReason.js).  A mirror nothing pins is a
       mirror that drifts -- mirror-audit.test.mjs's posture for data.js. */
    {
      const serverKeys = [...GEAR_REFUSAL.keys()].sort();
      const clientKeys = [...GEAR_SELL_REASON.keys()].sort();
      check('client mirror: the two reason tables list the same reasons',
        serverKeys.join(',') === clientKeys.join(','), { server: serverKeys, client: clientKeys });
      check('client mirror: ...and say the same sentence for each',
        serverKeys.every((k) => GEAR_REFUSAL.get(k) === GEAR_SELL_REASON.get(k)),
        serverKeys.filter((k) => GEAR_REFUSAL.get(k) !== GEAR_SELL_REASON.get(k)));
      check('client mirror: every reason `_gearSellable` can answer has a sentence',
        ['legacy', 'cosmetic', 'worn', 'in_mail', 'not_held', 'wrong_slot', 'no_player']
          .every((k) => typeof GEAR_SELL_REASON.get(k) === 'string' && GEAR_SELL_REASON.get(k).length > 0));
      check('client mirror: an unknown reason from a newer worker still gets a sentence',
        typeof gearSellReasonText('something_new_2599') === 'string'
        && gearSellReasonText('something_new_2599').length > 0, gearSellReasonText('something_new_2599'));

      /* And the browser's own pre-tap check: the two PERMANENT answers it
         is allowed to decide alone, and nothing else. */
      check('client: an outfit layer is greyed as `cosmetic` before the tap',
        gearSellCheck('gearStash', { slot: 'chest', gearId: 'steelchest' }).reason === 'cosmetic');
      check('client: a piece with no receipt number is greyed as `legacy`',
        gearSellCheck('armorStash', plate('Old Plate')).reason === 'legacy');
      check('client: ...and so is one that CLAIMS `minted` without a number',
        gearSellCheck('armorStash', { ...plate('Liar Plate'), prov: 'minted' }).reason === 'legacy');
      check('client: a recorded piece is left hopeful — worn/in-the-post are the worker\'s to answer',
        gearSellCheck('armorStash', { ...plate('Real Plate'), gid: 'g-abc', prov: 'minted' }).ok === true);
      check('client: the id it would send is the piece\'s own, bounded, or nothing',
        gearSellGid({ gid: 'g-abc' }) === 'g-abc'
        && gearSellGid({ gid: 'x'.repeat(41) }) === null
        && gearSellGid({}) === null && gearSellGid(null) === null);
    }

    /* ══ S12j. THE CLIENT'S OWN BAG STOPS SHOWING WHAT IT SOLD ══
       The half the worker cannot do for you.  v2.3.2531 listed a piece
       and left it sitting on its card: this client does not read the
       gear stashes off the `player_state` echo (gear-stash.md, "M3's
       first problem", still open) and the popup's success path only
       closed the popup.  So the plate stayed in the bag and stayed in
       localStorage — and tapping Equip on it made the worker accept it
       through `stats_update`, handing the seller a copy of the plate the
       buyer had just paid for.

       v2.3.2551 makes that far less expensive than it was: the surviving
       copy is re-offered under a receipt number the book no longer holds,
       so it comes back LEGACY and cannot be sold again.  The splice is
       still the right fix — a bag showing gear you do not own is a bug on
       its own — and `removeGearLocal` is a pure module precisely so this
       suite can reach it; ItemDetailPopup.jsx cannot be imported here. */
    {
      const R = {
        armorStash: [plate('Bag Plate'), plate('Other Plate')],
        gearStash: [{ slot: 'chest', gearId: 'steelchest', name: 'Steel Chest' }],
      };
      const listed = R.armorStash[0];
      check('client: the card sells out of the list the server names',
        GEAR_SELL.get('stashArmor').field === 'armorStash'
        && GEAR_SELL.get('stashLegs').field === 'legsStash'
        && GEAR_SELL.get('stashShield').field === 'shieldStash'
        && GEAR_SELL.get('stashGear').field === 'gearStash');
      check('client: a listed piece leaves the bag', removeGearLocal(R, 'armorStash', listed, 0) === true);
      check('client: ...and only that one — the other plate stays',
        R.armorStash.length === 1 && R.armorStash[0].name === 'Other Plate', R.armorStash);
      /* The array was replaced under the popup (the v2.3.2341 shape):
         identity is gone, so the signature has to find it. */
      const R2 = { armorStash: [plate('Other Plate'), plate('Bag Plate')] };
      check('client: a piece whose array was replaced is still found by signature',
        removeGearLocal(R2, 'armorStash', plate('Bag Plate'), 0) === true
        && R2.armorStash.length === 1 && R2.armorStash[0].name === 'Other Plate', R2.armorStash);
      /* A stale hint must never remove a piece the player still owns. */
      const R3 = { armorStash: [plate('Keep Me'), plate('Sell Me')] };
      removeGearLocal(R3, 'armorStash', plate('Sell Me'), 0);
      check('client: a stale index does not take the wrong piece out of the bag',
        R3.armorStash.length === 1 && R3.armorStash[0].name === 'Keep Me', R3.armorStash);
      /* A refused listing calls this with something that is not there;
         it must be a no-op, not a "remove whatever is at the hint". */
      const R4 = { armorStash: [plate('Keep Me')] };
      check('client: a piece that is not in the bag removes nothing',
        removeGearLocal(R4, 'armorStash', plate('Ghost'), 0) === false && R4.armorStash.length === 1, R4.armorStash);
      check('client: a cosmetic is matched on slot+gearId, like the server',
        removeGearLocal(R, 'gearStash', { slot: 'chest', gearId: 'steelchest' }, 0) === true
        && R.gearStash.length === 0, R.gearStash);
    }

    /* ══ S12k. ...AND THE BAG HAS TO GET IT BACK ══ (v2.3.2533)
       S12j is only half a story, and shipped alone it trades one bug for
       another.  The splice takes a listed piece out of the bag because
       the worker escrowed it — but the worker GIVES IT BACK on a
       take-down, on the 24h expiry, and on a listing whose record could
       not be written, and this client still does not read the gear
       stashes off `player_state`.  So the returned piece lands in a list
       nobody renders: you take your own listing down and the plate is
       gone from your bag, with the worker holding it where you cannot
       see it.  "Sold it twice" becomes "lost it".

       The client half is a `kind: 'gear'` branch in gameEvents.js's
       inbox_delivered handler, which adopts the piece the way
       loot_credit and quest_reward_stashed already adopt dropped and
       quest armour.  What is pinned HERE is the contract that branch
       depends on: that a returned gear listing actually reaches the
       socket as a gear delivery naming its list and carrying its piece.
       v2.3.2551 adds one more thing the branch depends on: the piece on
       the wire keeps its RECEIPT NUMBER, which is what lets the bag's
       copy stay provable and lets `armorRef` name it afterwards. */
    {
      SEL.armorStash = []; SEL.armor = null;
      const homeGid = mintedPlate(GSEL, 'Homecoming Plate');
      wsSel.sent.length = 0;
      const back = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: homeGid, price: 99,
      });
      check('client contract: (setup) the piece is listed', back.ok === true, back);
      await shop._stCancel(back.listing.id, GSEL);
      const deliveries = wsSel.sent.filter((m) => m.type === 'inbox_delivered');
      const entries = deliveries.flatMap((m) => (m.payload && m.payload.entries) || []);
      const gearEntry = entries.find((e) => e.kind === 'gear');
      check('client contract: a returned piece arrives as a GEAR delivery, not an untyped one',
        !!gearEntry, entries.map((e) => e.kind));
      check('client contract: ...naming the list it belongs in',
        gearEntry && gearEntry.payload && gearEntry.payload.field === 'armorStash', gearEntry && gearEntry.payload);
      check('client contract: ...and carrying the piece itself, so the bag can show it again',
        gearEntry && gearEntry.payload.piece && gearEntry.payload.piece.name === 'Homecoming Plate',
        gearEntry && gearEntry.payload && gearEntry.payload.piece);
      check('client contract: ...with its receipt number, so the bag\'s copy stays provable',
        gearEntry && gearEntry.payload.piece.gid === homeGid, gearEntry && gearEntry.payload.piece);
      /* And the same on the EXPIRY path, which is the one no player
         triggers on purpose and therefore the one nobody would notice. */
      SEL.armorStash = [];
      const expHomeGid = mintedPlate(GSEL, 'Expired Homecoming');
      wsSel.sent.length = 0;
      const back2 = await shop._stCreateListing({
        playerId: GSEL, kind: 'gear', field: 'armorStash', gid: expHomeGid, price: 99,
      });
      shop._stIndex.get(back2.listing.id).expiresAt = Date.now() - 1;
      shop._stLastSweep = 0;
      await shop._stSweep();
      const expEntry = wsSel.sent.filter((m) => m.type === 'inbox_delivered')
        .flatMap((m) => (m.payload && m.payload.entries) || [])
        .find((e) => e.kind === 'gear');
      check('client contract: an EXPIRED gear listing comes home the same way',
        !!expEntry && expEntry.payload.field === 'armorStash'
        && expEntry.payload.piece.name === 'Expired Homecoming'
        && expEntry.payload.piece.gid === expHomeGid, expEntry && expEntry.payload);
    }
  }

  // ── the order book next door is untouched ──
  check('store: the order book still has its own index', !!room._mktIndex && typeof room._mktPlaceOrder === 'function');
  check('store: the two surfaces use different storage prefixes',
    [...st._store.keys()].every((k) => !k.startsWith('mkt_order:')), [...st._store.keys()].filter((k) => k.startsWith('mkt_')));
  void poor; void listItem;
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
