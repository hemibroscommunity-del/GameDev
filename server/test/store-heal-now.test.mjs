/* v2.3.4920: A SETTLE THAT THROWS IS FINISHED IN THIS WORKER'S LIFE
 * (store.js _stHealStuck; STATE-MACHINES.md "what is left", V8a).
 *
 * A buy, an accepted bid or a release marks its listing, then moves the
 * goods and the gold leg by leg.  A leg that threw left the marker on the
 * listing in memory until the next restart: the listing stuck "being bought",
 * the seller unpaid -- and a release that threw after sending the goods home
 * left a listing a buyer could still buy: the seller took it down and it sold.
 *   1. a buy whose seller leg throws: the listing is stuck, the seller unpaid
 *   2. a minute later the next shop request finishes it: goods once, gold once
 *   3. a release (the seller's cancel) that throws midway: the buy is refused
 *   4. ...and the next pass finishes the release: the goods home once
 *   5. `storehealnow: false`: the old way -- stuck until a restart, and the
 *      listing its seller took down can still be bought (the hole)
 *   6. a marker younger than a minute (a request still running) is left alone
 *   7. no extra write a sale
 */
import { GameRoom } from '../src/index.js';

const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const settleIo = () => new Promise((r) => setTimeout(r, 5));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

function mkState() {
  const store = new Map();
  let writes = 0;
  return {
    _store: store,
    writes: () => writes,
    storage: {
      get: async (k) => clone(store.get(k)),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { store.set(kk, clone(vv)); writes++; } return; }
        store.set(k, clone(v)); writes++;
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) { store.delete(x); writes++; } return true; },
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        for (const k of keys) {
          if (opts?.startAfter && k <= opts.startAfter) continue;
          if (opts?.limit && out.size >= opts.limit) break;
          out.set(k, clone(store.get(k)));
        }
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
async function joinOn(rm, pid) {
  const ws = fakeWs();
  rm.sessions.set(ws, baseSession());
  await rm.state.storage.put('cadence:login:' + pid, { period: rm._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(6), phrase: 'p-' + pid, ws: [1, 5], data: { x: 100, y: 100, z: 'wheel' } }));
  await settleIo();
}

const S = 'bp_hn_sell', B = 'bp_hn_buyb', GEL = 'slime_gel';
const gelOf = (r, store, pid) => {
  let n = ((r.playerState[pid] || store.get('rpg:' + pid) || {}).inventory || {})[GEL] || 0;
  for (const e of store.get('inbox:' + pid) || []) if (e.kind === 'item' && e.payload.invKey === GEL) n += Math.max(1, Math.floor(e.payload.count || 1));
  return n;
};
const goldOf = (r, store, pid) => (r.playerState[pid].coins || 0)
  + (store.get('inbox:' + pid) || []).reduce((t, e) => t + (e.kind === 'gold' ? e.payload.amount : 0), 0);

const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;

async function room(flags) {
  const s = mkState();
  if (flags) await s.storage.put('liveflags', flags);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  for (const [pid, coins, inv] of [[S, 0, { [GEL]: 10 }], [B, 1000, {}]]) {
    await joinOn(r, pid);
    r.playerState[pid].coins = coins;
    r.playerState[pid].inventory = { ...inv };
    await r._saveRpg(pid, r.playerState[pid]);
  }
  await r._stEnsureIndex();
  const L = (await r._stCreateListing({ playerId: S, kind: 'item', invKey: GEL, qty: 1, price: 500 })).listing.id;
  await settleIo();
  return { s, r, L };
}
/* one leg throws once: the request answers an error, the room lives on */
function throwOnce(r, method, nth) {
  const real = r[method].bind(r);
  let n = 0;
  r[method] = async (...a) => { if (++n === nth) throw new Error('storage hiccup'); return real(...a); };
}
/* a shop request a minute and a bit later (the sweep runs once a minute) */
async function shopLater(r, ms) {
  skew += ms;
  await r._storeFetch(new Request('http://x/api/store/browse'));
  await settleIo();
}

// ── 1 and 2. a buy whose seller leg throws ──
{
  const { s, r, L } = await room();
  throwOnce(r, '_creditPlayer', 2);   /* the goods land; the seller's gold throws */
  let threw = false;
  try { await r._stBuyNow(L, B); } catch (e) { threw = true; }
  await settleIo();
  const rec = r._stIndex.get(L);
  const again = await r._stBuyNow(L, B);
  check('1. a buy whose seller leg throws: the listing stuck mid-sale, the seller unpaid',
    threw && !!rec && !!rec.sale && again.ok === false && goldOf(r, s._store, S) === 0 && gelOf(r, s._store, B) === 1,
    { threw, sale: rec && rec.sale, again, sGold: goldOf(r, s._store, S) });
  await shopLater(r, 61000);
  check('2. a minute later a shop request finishes it: the goods once, the gold once, the listing gone',
    !r._stIndex.has(L) && !s._store.has('store_listing:' + L) && goldOf(r, s._store, S) === 500 && gelOf(r, s._store, B) === 1 && goldOf(r, s._store, B) === 500,
    { indexed: r._stIndex.has(L), sGold: goldOf(r, s._store, S), bGel: gelOf(r, s._store, B), bGold: goldOf(r, s._store, B) });
}

// ── 3 and 4. a release that throws midway ──
{
  const { s, r, L } = await room();
  throwOnce(r, '_soReleaseAll', 1);
  let threw = false;
  try { await r._stCancel(L, S); } catch (e) { threw = true; }
  await settleIo();
  /* the listing is marked released, and still on the shelf in memory */
  const home = gelOf(r, s._store, S);
  const marked = !!(r._stIndex.get(L) || {}).releasing;
  const buy = await r._stBuyNow(L, B);
  await settleIo();
  check('3. a release that threw midway: the listing is refused to a buyer',
    threw && marked && home === 9 && buy.ok === false && gelOf(r, s._store, B) === 0 && goldOf(r, s._store, B) === 1000,
    { threw, home, buy, bGel: gelOf(r, s._store, B) });
  await shopLater(r, 61000);
  check('4. the next pass finishes the release: the goods home once, the listing gone',
    !r._stIndex.has(L) && !s._store.has('store_listing:' + L) && gelOf(r, s._store, S) === 10,
    { indexed: r._stIndex.has(L), sGel: gelOf(r, s._store, S) });
}

// ── 5. the switch off: the old way ──
{
  const { s, r, L } = await room({ storehealnow: false });
  throwOnce(r, '_soReleaseAll', 1);
  try { await r._stCancel(L, S); } catch (e) { /* the hiccup */ }
  await settleIo();
  const buy = await r._stBuyNow(L, B);
  await settleIo();
  await shopLater(r, 61000);
  check('5. `storehealnow: false`: the listing its seller took down is bought anyway (the hole)',
    buy.ok === true && gelOf(r, s._store, B) === 1, { buy, sGel: gelOf(r, s._store, S), bGel: gelOf(r, s._store, B) });
  const b = await room({ storehealnow: false });
  throwOnce(b.r, '_creditPlayer', 2);
  try { await b.r._stBuyNow(b.L, B); } catch (e) { /* the hiccup */ }
  await shopLater(b.r, 61000);
  check('5b. `storehealnow: false`: a thrown buy stays stuck until a restart',
    !!(b.r._stIndex.get(b.L) || {}).sale && goldOf(b.r, b.s._store, S) === 0, { sGold: goldOf(b.r, b.s._store, S) });
}

// ── 6. a request still running is left alone ──
{
  const { r, L } = await room();
  const rec = r._stIndex.get(L);
  rec.sale = { buyerId: B, buyerName: 'b', price: 500, paid: true, bidSeq: null, at: Date.now() };
  const n = await r._stHealStuck(Date.now() + 30000);
  check('6. a marker younger than a minute is left alone', n === 0 && r._stIndex.get(L) === rec && !!rec.sale, { n });
  rec.sale = null;
}

// ── 7. no extra write a sale ──
{
  const on = await room();
  await shopLater(on.r, 61000);
  const w0 = on.s.writes();
  await on.r._stBuyNow(on.L, B);
  await shopLater(on.r, 61000);
  const onW = on.s.writes() - w0;
  const off = await room({ storehealnow: false });
  await shopLater(off.r, 61000);
  const w1 = off.s.writes();
  await off.r._stBuyNow(off.L, B);
  await shopLater(off.r, 61000);
  const offW = off.s.writes() - w1;
  check('7. no extra write a sale: a buy and a shop request cost what they cost before', onW === offW && onW > 0, { onW, offW });
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
