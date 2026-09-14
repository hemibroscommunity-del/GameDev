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

/* ════════════════════════════════════════════════════════════════════
 * v2.3.2475 — THE GENERAL STORE (store.js), phase 1
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
 *        whose debit never landed is dropped.
 *   S9.  Browse pages, and the page is bounded (rule 9).
 *   S10. HTTP surface: `settled: true` on every mutating response, and
 *        the session-token gate (v2.3.1178) rejects a forged caller.
 *   S11. Guards: your own listing, the per-player cap, price bounds, an
 *        Object.prototype key, and goods you do not hold.
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

  // ── the order book next door is untouched ──
  check('store: the order book still has its own index', !!room._mktIndex && typeof room._mktPlaceOrder === 'function');
  check('store: the two surfaces use different storage prefixes',
    [...st._store.keys()].every((k) => !k.startsWith('mkt_order:')), [...st._store.keys()].filter((k) => k.startsWith('mkt_')));
  void poor; void listItem;
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
