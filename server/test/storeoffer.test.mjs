/* Escrowed-offer suite (v2.3.2623, storeoffer.js).  A buyer names a number in
 * a listing's thread, their gold is TAKEN on the spot, and the seller's "Yes"
 * completes the sale.  This is settlement, so the bar is every branch plus
 * two properties that catch the class of bug that matters:
 *
 *   NO DOUBLE SPEND   a buyer with N gold can never be committed for more.
 *   CONSERVATION      across offer->accept, offer->decline, offer->withdraw,
 *                     offer->offer-expiry and offer->listing-expiry, the
 *                     total gold in the system is unchanged.
 *
 * Branches covered, in the order the brief listed them:
 *   1. caps + PRIVILEGED + the offer escrows real gold at offer time.
 *   2. The buyer cannot afford it -> refused BEFORE anything is escrowed.
 *   3. The same gold twice -> impossible by construction (the debit is real).
 *   4. The seller accepts two offers -> only one wins, the other comes back.
 *   5. Listing sells / expires with offers standing -> every escrow releases.
 *   6. The seller ignores it -> OFFER_EXPIRY refunds on the lazy sweep.
 *   7. The buyer withdraws.
 *   8. The seller declines -> immediate refund.
 *   9. "I'll think about it" -> the escrow STAYS HELD (and says so).
 *  10. Buy-it-now while offers stand -> offers release.
 *  11. DO wake -> a pending offer converges; a live one survives.
 *  12. Bounds: MAX_PER_LISTING, own listing, junk numbers, rate limit.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { STORE_OFFER } from '../src/storeoffer.js';

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
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const P = (n) => 'bp_so_' + n;

const S = fakeWs('seller'); const A = fakeWs('buyerA'); const B = fakeWs('buyerB');
await join(S, P('sell'), 'Marvin');
await join(A, P('a'), 'Lyria');
await join(B, P('b'), 'Bram');

const sp = room.playerState[P('sell')];
sp.inventory = { slime_gel: 60 };
sp.coins = 0;
room.playerState[P('a')].coins = 1000;
room.playerState[P('b')].coins = 1000;
await room._stEnsureIndex();

/* Gold in the world: purses + anything escrowed inside live listings + any
   mail waiting to be collected.  Conservation is asserted against THIS. */
function totalGold() {
  let t = 0;
  for (const pid of Object.keys(room.playerState)) t += Math.floor(room.playerState[pid].coins || 0);
  for (const rec of room._stIndex.values()) {
    if (rec.topBid) t += rec.topBid.amount;
    for (const k of Object.keys(rec.offers || {})) t += rec.offers[k].gold;
  }
  for (const [k, v] of state._store) {
    if (!k.startsWith('inbox:')) continue;
    for (const e of (v || [])) if (e.kind === 'gold') t += Math.floor(e.payload.amount || 0);
  }
  return t;
}
/* Gold this SUITE puts into the world on purpose (topping a purse up, or a
   fresh buyer joining with coins). Conservation is about the store not
   minting or burning gold, so the deliberate injections have to be declared
   rather than swept into the final number -- otherwise the assertion passes
   by being vague, which is the opposite of what it is for. */
let injected = 0;
function inject(pid, amount) {
  room.playerState[pid].coins += amount;
  injected += amount;
}
/* A character who joins mid-suite arrives with a starting purse (25g), and
   that gold is just as much an injection as a top-up -- it simply was not in
   the world when GOLD0 was taken. Counting only the top-up left the books 175
   out (7 buyers x 25) and read as the store minting gold, which is exactly
   the alarm this assertion exists to raise. Declaring the WHOLE purse is what
   makes a future 175 mean something. */
async function joinBuyer(ws, pid, name, topUp) {
  await join(ws, pid, name);
  injected += Math.floor(room.playerState[pid].coins || 0);
  inject(pid, topUp);
}

const listOne = async (price) => {
  room._soBuckets = null;
  const r = await room._stCreateListing({ playerId: P('sell'), kind: 'item', invKey: 'slime_gel', qty: 1, price });
  return r.listing.id;
};

// ── 1. the offer takes real gold ──
for (const t of ['store_offer_state', 'store_offer_error']) {
  check(t + ' is PRIVILEGED (a client cannot forge it)', PRIVILEGED_EVENTS.has(t));
}
const sync0 = S.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.storeOffer', sync0 && sync0.caps && sync0.caps.storeOffer === true,
  sync0 && sync0.caps && Object.keys(sync0.caps).length);

const GOLD0 = totalGold();
let L = await listOne(500);
const aCoins0 = room.playerState[P('a')].coins;
const off1 = await room._stOfferPlace(L, P('a'), 400);
check('an offer is accepted', off1.ok === true, off1);
check('...and the gold LEAVES the buyer there and then',
  room.playerState[P('a')].coins === aCoins0 - 400, { was: aCoins0, now: room.playerState[P('a')].coins });
check('...and is held on the listing', room._stIndex.get(L).offers[P('a')].gold === 400);
check('...with total gold unchanged (it moved into escrow, it did not vanish)',
  totalGold() === GOLD0, { before: GOLD0, now: totalGold() });

// ── 2. cannot afford it ──
room._soBuckets = null;
const poor = await room._stOfferPlace(L, P('b'), 5000);
check('an offer bigger than the purse is refused', poor.ok === false, poor);
check('...and took nothing', room.playerState[P('b')].coins === 1000);

// ── 3. THE SAME GOLD TWICE IS IMPOSSIBLE BY CONSTRUCTION ──
{
  const L2 = await listOne(500);
  room._soBuckets = null;
  const c0 = room.playerState[P('b')].coins;             // 1000
  const ok1 = await room._stOfferPlace(L, P('b'), 1000); // commits ALL of it
  room._soBuckets = null;
  const ok2 = await room._stOfferPlace(L2, P('b'), 1000); // the same coins again
  check('a buyer may commit their whole purse once', ok1.ok === true, ok1);
  check('...and CANNOT commit the same gold to a second listing',
    ok2.ok === false, { ok2, coins: room.playerState[P('b')].coins });
  check('...because the debit is real: the purse is the ledger',
    room.playerState[P('b')].coins === c0 - 1000, room.playerState[P('b')].coins);
  await room._stOfferWithdraw(L, P('b'));
  await room._stRelease(room._stIndex.get(L2), 'tidy');
  check('...and withdrawing gives it straight back', room.playerState[P('b')].coins === c0);
  check('...conservation holds across the whole exchange', totalGold() === GOLD0, totalGold());
}

// ── 4 + 9. two offers; "think" holds; accepting one returns the other ──
{
  room._soBuckets = null;
  await room._stOfferPlace(L, P('b'), 450);
  const think = await room._stOfferReply(L, P('sell'), P('b'), 'think');
  check('"I\'ll think about it" is recorded', think.ok === true && think.replied === 'think', think);
  check('...and the gold STAYS HELD (or the reply would mean nothing)',
    room._stIndex.get(L).offers[P('b')].gold === 450 && room.playerState[P('b')].coins === 550,
    room.playerState[P('b')].coins);

  const sellCoins0 = room.playerState[P('sell')].coins;
  const bCoins0 = room.playerState[P('b')].coins;
  const aGel0 = (room.playerState[P('a')].inventory || {}).slime_gel || 0;
  const yes = await room._stOfferReply(L, P('sell'), P('a'), 'yes');
  check('the seller accepting settles on the spot', yes.ok === true && yes.sold === true, yes);
  check('...the seller is paid the offered amount, not the ask',
    room.playerState[P('sell')].coins === sellCoins0 + 400,
    { was: sellCoins0, now: room.playerState[P('sell')].coins });
  check('...the buyer gets the goods',
    ((room.playerState[P('a')].inventory || {}).slime_gel || 0) === aGel0 + 1);
  check('...the OTHER offer is returned in full',
    room.playerState[P('b')].coins === bCoins0 + 450, room.playerState[P('b')].coins);
  check('...the listing is gone', !state._store.has('store_listing:' + L));
  check('...and NOTHING was created or destroyed', totalGold() === GOLD0, { want: GOLD0, got: totalGold() });
}

// ── 5 + 10. buy-it-now while offers stand ──
{
  L = await listOne(300);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 120);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('b'), 130);
  const a0 = room.playerState[P('a')].coins, b0 = room.playerState[P('b')].coins;
  inject(P('b'), 300);                                       // afford the ask
  const bought = await room._stBuyNow(L, P('b'));
  check('somebody buys it outright while two offers stand', bought.ok === true, bought);
  /* A paid the ask (300) and gets their 120 offer back; B's 130 comes back
     too. Written as the two purses rather than a net, because a net can be
     right for the wrong reasons. */
  check('...both escrowed offers come back',
    room.playerState[P('a')].coins === a0 + 120
      && room.playerState[P('b')].coins === b0 + 130 - 300 + 300, {
      a: { was: a0, now: room.playerState[P('a')].coins },
      b: { was: b0, now: room.playerState[P('b')].coins } });
  check('...and conservation holds across a buy-now over standing offers',
    totalGold() === GOLD0 + injected, { want: GOLD0 + injected, got: totalGold() });
}

// ── 5b. the listing EXPIRES with an offer standing ──
{
  const gold0 = totalGold();
  L = await listOne(300);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 200);
  const a0 = room.playerState[P('a')].coins;
  room._stIndex.get(L).expiresAt = Date.now() - 1;
  room._stLastSweep = 0;
  await room._stSweep();
  check('a listing that expires returns every escrowed offer',
    room.playerState[P('a')].coins === a0 + 200, room.playerState[P('a')].coins);
  check('...and the listing is gone', !state._store.has('store_listing:' + L));
  check('...conservation holds across expiry', totalGold() === gold0, { want: gold0, got: totalGold() });
}

// ── 6. the seller ignores it: the OFFER expires on its own, sooner ──
{
  const gold0 = totalGold();
  L = await listOne(300);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 150);
  const a0 = room.playerState[P('a')].coins;
  check('an offer expires sooner than the listing it sits on',
    STORE_OFFER.OFFER_EXPIRY < 604800000, STORE_OFFER.OFFER_EXPIRY);
  room._stIndex.get(L).offers[P('a')].at = Date.now() - STORE_OFFER.OFFER_EXPIRY - 1;
  room._stLastSweep = 0;
  await room._stSweep();
  check('an ignored offer refunds itself without the listing ending',
    room.playerState[P('a')].coins === a0 + 150 && state._store.has('store_listing:' + L),
    { coins: room.playerState[P('a')].coins });
  check('...conservation holds across offer expiry', totalGold() === gold0, { want: gold0, got: totalGold() });
  await room._stRelease(room._stIndex.get(L), 'tidy');
}

// ── 7 + 8. withdraw, and decline ──
{
  const gold0 = totalGold();
  L = await listOne(300);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 90);
  const a0 = room.playerState[P('a')].coins;
  const w = await room._stOfferWithdraw(L, P('a'));
  check('a buyer may withdraw', w.ok === true && room.playerState[P('a')].coins === a0 + 90, w);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 95);
  const a1 = room.playerState[P('a')].coins;
  const no = await room._stOfferReply(L, P('sell'), P('a'), 'no');
  check('a declined offer is returned immediately',
    no.ok === true && room.playerState[P('a')].coins === a1 + 95, no);
  check('...conservation holds across withdraw and decline', totalGold() === gold0, totalGold());
  await room._stRelease(room._stIndex.get(L), 'tidy');
}

// ── 11. the DO wakes mid-escrow, and with a live offer ──
{
  L = await listOne(300);
  room._soBuckets = null;
  await room._stOfferPlace(L, P('a'), 77);
  const room2 = new GameRoom(state, mockEnv);
  room2.playerState = room.playerState;
  await room2._stEnsureIndex();
  check('a live offer survives the wake-time rebuild',
    room2._stIndex.get(L).offers[P('a')].gold === 77, room2._stIndex.get(L).offers);

  /* A pending offer whose debit NEVER landed must be dropped, not promoted:
     no money moved, so promoting it would hand the seller gold nobody paid. */
  const rec = room2._stIndex.get(L);
  rec.pendOffer = { seq: 999, buyerId: P('b'), gold: 5000, at: Date.now() };
  await state.storage.put('store_listing:' + L, rec);
  const room3 = new GameRoom(state, mockEnv);
  room3.playerState = room.playerState;
  await room3._stEnsureIndex();
  check('a pending offer whose debit never landed is DROPPED, not promoted',
    !room3._stIndex.get(L).offers[P('b')] && room3._stIndex.get(L).pendOffer === null,
    room3._stIndex.get(L).offers);
  await room3._stRelease(room3._stIndex.get(L), 'tidy');
  room._stIndex = null;
  await room._stEnsureIndex();
}

// ── 12. bounds ──
{
  L = await listOne(300);
  const own = await room._stOfferPlace(L, P('sell'), 10);
  check('a seller cannot offer on their own listing', own.ok === false, own);
  const junk = [];
  for (const bad of [0, -5, 'abc', NaN, Infinity, 1e12, null, {}]) {
    room._soBuckets = null;
    const r = await room._stOfferPlace(L, P('a'), bad);
    if (r.ok !== false) junk.push({ bad: String(bad), r });
  }
  check('a nonsense offer amount is refused, never clamped', junk.length === 0, junk);

  /* MAX_PER_LISTING, with fresh buyers so the purse is not the limit. */
  for (let i = 0; i < STORE_OFFER.MAX_PER_LISTING + 2; i++) {
    const w = fakeWs('x' + i);
    // eslint-disable-next-line no-await-in-loop
    await joinBuyer(w, P('x' + i), 'X' + i, 500);
    room._soBuckets = null;
    await room._stOfferPlace(L, P('x' + i), 10);
  }
  check('a listing holds at most MAX_PER_LISTING offers',
    Object.keys(room._stIndex.get(L).offers).length <= STORE_OFFER.MAX_PER_LISTING,
    Object.keys(room._stIndex.get(L).offers).length);

  /* Rate limit: an explicit router case never reaches the relay bucket. */
  room._soBuckets = null;
  let refused = 0;
  for (let i = 0; i < STORE_OFFER.BURST + 3; i++) {
    const r = await room._stOfferPlace(L, P('a'), 20 + i);
    if (!r.ok && /Slow down/.test(r.error || '')) refused++;
  }
  check('offers carry their own rate limit', refused > 0, { refused });
  await room._stRelease(room._stIndex.get(L), 'tidy');
}

// ── FINAL: the books balance ──
check('FINAL: every coin is accounted for -- nothing minted, nothing burned',
  totalGold() === GOLD0 + injected,
  { started: GOLD0, injectedByTheSuite: injected, expected: GOLD0 + injected, ended: totalGold() });

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
