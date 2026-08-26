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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
