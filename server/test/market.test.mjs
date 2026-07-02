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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
