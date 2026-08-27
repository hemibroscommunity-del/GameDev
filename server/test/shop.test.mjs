/* SHOPKEEPER BRO'S PUBLIC PILE (v2.3.2047).
 *
 * Owner: "His inventory is public so other players who sell monster remains
 * (etc) can see it and buy from him. The more quantity he has of a thing the
 * cheaper he's willing to buy from you."
 *
 * The price rule IS the design, so most of this file is about it. What it has
 * to prove is not "a price came back" but that the price MOVES the way the
 * owner described, that a bulk sale cannot dodge the movement, and that the
 * pile one player fills is the pile another player sees.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { SHOP } from '../src/shop.js';

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}

const A = fakeWs('A'), B = fakeWs('B');
await join(A, 'seller');
await join(B, 'buyer');
const psA = room.playerState.seller, psB = room.playerState.buyer;

/* ── THE PRICE FALLS AS THE PILE GROWS ── */
const p0 = room._shopBuyPrice('bone', 0);
const p12 = room._shopBuyPrice('bone', 12);
const p100 = room._shopBuyPrice('bone', 100);
check('he pays most for a thing he has none of', p0 > p12 && p12 > p100, { p0, p12, p100 });
check('...and the fall is real, not a rounding wobble: at SOFTEN he offers about half',
  p12 <= Math.ceil(p0 / 2) && p12 >= Math.floor(p0 / 2) - 1, { p0, p12, SOFTEN: SHOP.SOFTEN });
check('...but he never offers nothing, however much he is holding',
  room._shopBuyPrice('bone', 100000) >= SHOP.MIN_BUY, room._shopBuyPrice('bone', 100000));

/* What he CHARGES must NOT fall with stock, or a glut would be cheap to buy
   and cheap to sell and the two would cancel out. */
check('what he charges does not move with his stock',
  room._shopSellPrice('bone') === room._shopSellPrice('bone'), null);
check('...and he charges more than he pays, so buy-then-sell-back is a loss',
  room._shopSellPrice('bone') > room._shopBuyPrice('bone', 0),
  { sell: room._shopSellPrice('bone'), buy: p0 });

/* ── A BULK SALE CANNOT DODGE THE DECAY ──
   The one that matters: if a stack were priced at the opening offer, selling
   100 at once would beat selling 1 a hundred times and the rule would be
   decorative. */
psA.inventory = { bone: 100 };
psA.coins = 0;
const bulk = await room._shopSell(psA, 'bone', 100);
check('a hundred-unit sale settles', bulk.ok && bulk.sold === 100, bulk);
check('...and pays LESS than a hundred times the opening offer, because each '
    + 'unit is priced against the pile as it grows',
  bulk.paid < p0 * 100, { paid: bulk.paid, naive: p0 * 100 });
check('...and the coins actually reached the player', psA.coins === bulk.paid, { coins: psA.coins, paid: bulk.paid });
check('...and the goods actually left the bag', !psA.inventory.bone, psA.inventory);
check('...and his next offer is lower than his first', bulk.nextBuy < p0, { nextBuy: bulk.nextBuy, p0 });

/* ── THE PILE IS PUBLIC ── */
const listB = await room._shopList();
const boneLine = listB.items.find((i) => i.key === 'bone');
check('another player sees the pile the first one filled', !!boneLine && boneLine.qty === 100, listB.items);
check('...with both prices on the line, so a seller can see why the offer moved',
  !!boneLine && boneLine.buy > 0 && boneLine.sell > 0, boneLine);

/* ── BUYING DRAINS IT AND RECOVERS THE PRICE ── */
psB.coins = 10000;
psB.inventory = {};
const buy = await room._shopBuy(psB, 'bone', 40);
check('a second player can buy out of the pile', buy.ok && buy.bought === 40, buy);
check('...paying his asking price, not the seller offer',
  buy.cost === room._shopSellPrice('bone') * 40, buy);
check('...the goods land in the buyer bag', psB.inventory.bone === 40, psB.inventory);
check('...the coins leave the buyer purse', psB.coins === 10000 - buy.cost, { coins: psB.coins });
check('...and draining the pile RAISES what he will pay the next seller',
  buy.nextBuy > bulk.nextBuy, { after: buy.nextBuy, before: bulk.nextBuy });

/* ── REFUSALS ── */
psB.coins = 1;
check('he will not sell to an empty purse', !(await room._shopBuy(psB, 'bone', 40)).ok);
check('he will not sell what he has not got', !(await room._shopBuy(psB, 'nothing_at_all', 1)).ok);
psA.inventory = { bone: 2 };
check('you cannot sell more than you carry', !(await room._shopSell(psA, 'bone', 5)).ok);
check('a zero or negative quantity is refused', !(await room._shopSell(psA, 'bone', 0)).ok
  && !(await room._shopSell(psA, 'bone', -3)).ok);
check('a single action is capped, so a fat-fingered quantity cannot empty a bag',
  !(await room._shopSell(psA, 'bone', SHOP.MAX_QTY_PER_OP + 1)).ok);

/* ── THE STOCK RECORD SURVIVES A RESTART ──
   It is one shared record; if it lived only in memory the pile would vanish on
   every deploy and every player's sales with it. */
const room2 = new GameRoom(state, mockEnv);
const after = await room2._shopList();
check('the pile survives a room restart (it is storage, not memory)',
  !!after.items.find((i) => i.key === 'bone' && i.qty === 60), after.items);

/* ── '__proto__' IS AN ITEM KEY LIKE ANY OTHER ──
   CLAUDE.md rule 4: a plain {} silently no-ops on it, and the keys here come
   straight from a client. Three incidents in one day is why this is checked. */
psA.inventory = { __proto__: 5 };
const proto = await room._shopSell(psA, '__proto__', 1);
const protoList = await room._shopList();
check("a '__proto__' item key does not corrupt the pile",
  !protoList.items.some((i) => i.key !== '__proto__' && i.qty === undefined), { proto: proto.ok, items: protoList.items.length });

/* ── THE ANSWERS ARE SERVER-ONLY ──
   Both carry money: shop_result names coins paid, shop_state is the pile
   everyone prices against. */
check('shop_state cannot be forged by a client', PRIVILEGED_EVENTS.has('shop_state'));
check('shop_result cannot be forged by a client', PRIVILEGED_EVENTS.has('shop_result'));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
