/* ═══ v2.3.4412: THE OFFER EXPIRY PASS REACHES EVERY LISTING ═══
 *
 * The state-machine sweep (2026-11-03, V8a S6-6): the Auction House's offer
 * expiry pass (store.js _stSweep) counted EVERY listing before it asked
 * whether the listing had offers, and stopped at 20 with no cursor.  On a
 * shelf of more than 20, an ignored offer past listing 20 never expired: the
 * buyer's gold was held up to the listing's week, not the 48 h promised
 * (store-offers.md).
 *
 * Against the real GameRoom:
 *   1. a shelf of 25: an expired offer on listing 25 is refunded by one pass
 *      (failed before: the pass stopped at listing 20);
 *   2. ...the listing stays up, and gold is conserved;
 *   3. a quiet shelf (offers standing, none due) writes NOTHING;
 *   4. the bound holds: at most SWEEP_MAX listings refunded a pass, the rest
 *      on the next;
 *   5. the kill switch `disable_offer_sweep_all` puts back the old first-20
 *      pass (listing 25's offer is left), and clearing it reaches it again.
 */
import { GameRoom } from '../src/index.js';
import { STORE } from '../src/store.js';
import { STORE_OFFER } from '../src/storeoffer.js';

function makeState() {
  const store = new Map();
  const st = {
    puts: 0,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { st.puts++; store.set(k, v); },
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
  return st;
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
const P = (n) => 'bp_sw_' + n;

/* three sellers (MAX_PER_PLAYER is 10 each) and a buyer per offer */
const SELLERS = ['s1', 's2', 's3'];
for (const s of SELLERS) {
  await join(fakeWs(s), P(s), 'Seller ' + s);
  room.playerState[P(s)].inventory = { slime_gel: 60 };
}
const BUYERS = [];
for (let i = 0; i < 26; i++) {
  const b = 'b' + i;
  await join(fakeWs(b), P(b), 'Buyer ' + i);
  room.playerState[P(b)].coins = 1000;
  BUYERS.push(P(b));
}
await room._stEnsureIndex();

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

const listings = [];
for (let i = 0; i < 25; i++) {
  room._soBuckets = null;
  const seller = P(SELLERS[Math.floor(i / 10)]);
  const r = await room._stCreateListing({ playerId: seller, kind: 'item', invKey: 'slime_gel', qty: 1, price: 300 });
  if (!r || !r.ok) { check('listing ' + (i + 1) + ' went up', false, r); process.exit(1); }
  listings.push(r.listing.id);
}
check('the shelf holds 25 listings (more than SWEEP_MAX)', room._stIndex.size === 25 && STORE.SWEEP_MAX < 25, room._stIndex.size);

const offer = async (L, buyer, gold) => {
  room._soBuckets = null;
  const r = await room._stOfferPlace(L, buyer, gold);
  if (!r || !r.ok) check('offer placed on ' + L, false, r);
};
const age = (L, buyer) => { room._stIndex.get(L).offers[buyer].at = Date.now() - STORE_OFFER.OFFER_EXPIRY - 1; };
const sweep = async () => { room._stLastSweep = 0; await room._stSweep(); };

// ── 1 + 2. an expired offer on listing 25 is reached ──
{
  const L25 = listings[24];
  const buyer = BUYERS[0];
  await offer(L25, buyer, 150);
  const g0 = totalGold();
  const c0 = room.playerState[buyer].coins;
  age(L25, buyer);
  await sweep();
  check('1. an expired offer on listing 25 of 25 is refunded by one pass',
    room.playerState[buyer].coins === c0 + 150, { coins: room.playerState[buyer].coins, want: c0 + 150 });
  check('1. ...and it is gone from the listing', !(P('b0') in (room._stIndex.get(L25).offers || {})));
  check('2. ...the listing stays up', state._store.has('store_listing:' + L25) && room._stIndex.has(L25));
  check('2. ...gold is conserved', totalGold() === g0, { want: g0, got: totalGold() });
}

// ── 3. a quiet shelf writes nothing ──
{
  await offer(listings[3], BUYERS[1], 100);
  await offer(listings[22], BUYERS[2], 100);
  state.puts = 0;
  await sweep();
  check('3. offers standing but none due: the pass writes nothing', state.puts === 0, state.puts);
  await room._stOfferWithdraw(listings[3], BUYERS[1]);
  await room._stOfferWithdraw(listings[22], BUYERS[2]);
}

// ── 4. the bound: at most SWEEP_MAX listings a pass ──
{
  const g0 = totalGold();
  for (let i = 0; i < 25; i++) { await offer(listings[i], BUYERS[i + 1], 50); age(listings[i], BUYERS[i + 1]); }
  const held = () => listings.filter((L) => Object.keys(room._stIndex.get(L).offers || {}).length > 0).length;
  await sweep();
  check('4. one pass refunds at most SWEEP_MAX listings', held() === 25 - STORE.SWEEP_MAX, held());
  await sweep();
  check('4. ...and the next pass the rest', held() === 0, held());
  check('4. ...gold is conserved', totalGold() === g0, { want: g0, got: totalGold() });
}

// ── 5. the kill switch puts back the old pass ──
{
  const L25 = listings[24];
  const buyer = BUYERS[0];
  await offer(L25, buyer, 120);
  age(L25, buyer);
  room._liveFlags = { ...(room._liveFlags || {}), disable_offer_sweep_all: true };
  const c0 = room.playerState[buyer].coins;
  await sweep();
  check('5. disable_offer_sweep_all: the old first-20 pass leaves listing 25\'s offer',
    room.playerState[buyer].coins === c0 && !!room._stIndex.get(L25).offers[buyer]);
  delete room._liveFlags.disable_offer_sweep_all;
  await sweep();
  check('5. ...cleared, the pass reaches it again', room.playerState[buyer].coins === c0 + 120, room.playerState[buyer].coins);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
