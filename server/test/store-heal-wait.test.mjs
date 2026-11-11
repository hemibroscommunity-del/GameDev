/* v2.3.4842: THE STAMP PRUNE WAITS FOR THE AUCTION HOUSE'S HEAL
 * (store.js _stSettleWait, tick.js's housekeeping slot; STATE-MACHINES.md
 * "what is left", from #1521; the sweep's V8a S6-4).
 *
 * A listing a restart caught inside its settlement (the goods delivered, the
 * seller's gold not yet) is finished by the shelf's rebuild, which reads the
 * legs' oplog stamps -- and the prune deletes those after 48 hours.  The
 * rebuild ran only on the first Auction House request after a wake, so 48 h
 * of play with nobody opening the shop let the prune go first, and the
 * rebuild then delivered the goods a SECOND time.
 *   1. setup: a buy-now dies after its goods leg; the record says paid
 *   2. `storehealwait: false` (the old way): the prune goes first and the
 *      buyer is given the goods twice -- the hole, reproduced
 *   3. the new way: the slot's ask starts the rebuild and holds the prune
 *      until it is done; the sale finishes once: goods once, the seller paid
 *   4. ...and then the prune may go, and a later shop request changes nothing
 *   5. tick.js asks the shelf before the prune, every slot
 *   6. one load at a time: two shop requests during a load share it
 *   7. no extra write a sale: a buy-now costs what it cost before
 */
import { readFileSync } from 'node:fs';
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

function mkState(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
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
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(6), phrase: 'p-' + pid, ws: [1, 5], data: { x: 100, y: 100, z: 'town' } }));
  await settleIo();
}

const S = 'bp_hw_sell', B = 'bp_hw_buyb', GEL = 'slime_gel';
const gelOf = (store, pid) => {
  let n = ((store.get('rpg:' + pid) || {}).inventory || {})[GEL] || 0;
  for (const e of store.get('inbox:' + pid) || []) if (e.kind === 'item' && e.payload.invKey === GEL) n += Math.max(1, Math.floor(e.payload.count || 1));
  return n;
};
const mailGold = (store, pid) => (store.get('inbox:' + pid) || []).reduce((t, e) => t + (e.kind === 'gold' ? e.payload.amount : 0), 0);

/* 1. a buy-now that dies after its goods leg */
async function seedDead() {
  const s = mkState();
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
  /* the room dies on the second credit (the seller's gold): nothing more is written */
  const real = r._creditPlayer.bind(r);
  let n = 0;
  r._creditPlayer = async (...a) => { if (++n >= 2) { s.storage.put = async () => {}; s.storage.delete = async () => {}; throw new Error('restart'); } return real(...a); };
  try { await r._stBuyNow(L, B); } catch (e) { /* the restart */ }
  await settleIo();
  return { store: s._store, L };
}
const dead = await seedDead();
const rec0 = dead.store.get('store_listing:' + dead.L);
check('1. setup: the restart left a paid sale with its goods delivered and the seller unpaid',
  !!rec0 && !!rec0.sale && dead.store.has('oplog:store:' + dead.L + ':goods') && gelOf(dead.store, B) === 1 && mailGold(dead.store, S) === 0,
  { rec: rec0 && rec0.sale, goods: dead.store.has('oplog:store:' + dead.L + ':goods'), gel: gelOf(dead.store, B), sGold: mailGold(dead.store, S) });

/* 48 hours later, the housekeeping slot: ask the store, then prune if allowed */
const LATER = Date.now() + 49 * 3600 * 1000;
async function slot(r) {
  const mkt = !!(r._mktSettleWait && r._mktSettleWait());
  const st = !!(r._stSettleWait && r._stSettleWait());
  if (mkt || st) return { mkt, st, pruned: false };
  r._opPrune = null; r._lastOpPrune = 0;
  for (let i = 0; i < 20; i++) { await r._opPruneMaybe(LATER); if (!r._opPrune) break; }
  return { mkt, st, pruned: true };
}
/* the General Store's own wait (market.js) finishes its scan first */
async function slotUntil(r) {
  let res = null;
  for (let i = 0; i < 20; i++) { res = await slot(r); if (res.pruned || res.st) return res; await settleIo(); }
  return res;
}

// ── 2. the old way ──
{
  const s = mkState(dead.store);
  await s.storage.put('liveflags', { storehealwait: false });
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  const { pruned } = await slotUntil(r);
  await r._stEnsureIndex();   /* the first shop request, two days later */
  await settleIo();
  check('2. `storehealwait: false`: the prune goes first, and the rebuild gives the buyer the goods a second time (the hole)',
    pruned && gelOf(s._store, B) === 2, { pruned, gel: gelOf(s._store, B) });
}

// ── 3 and 4. the new way ──
{
  const s = mkState(dead.store);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  const first = await slotUntil(r);
  check('3a. a slot after the wake holds the prune for the shelf and starts its rebuild', !!first && first.st === true && first.pruned === false, first);
  for (let i = 0; i < 20 && r._stSettleWait && r._stSettleWait(); i++) await settleIo();
  check('3b. the sale finishes once: the goods once, the seller paid, the listing gone',
    gelOf(s._store, B) === 1 && mailGold(s._store, S) === 500 && !s._store.has('store_listing:' + dead.L),
    { gel: gelOf(s._store, B), sGold: mailGold(s._store, S), listing: s._store.has('store_listing:' + dead.L) });
  const second = (await slotUntil(r)).pruned;
  r._stIndex = null;
  await r._stEnsureIndex();
  await settleIo();
  check('4. then the prune goes, and a later shop request changes nothing', second === true && gelOf(s._store, B) === 1 && mailGold(s._store, S) === 500,
    { second, gel: gelOf(s._store, B), sGold: mailGold(s._store, S) });
}

// ── 5. the slot asks the shelf before the prune ──
{
  const src = readFileSync(new URL('../src/tick.js', import.meta.url), 'utf8');
  const iSt = src.indexOf('_stSettleWait()');
  const iPrune = src.indexOf('this._opPruneMaybe(nowJp)');
  check('5. tick.js asks the shelf before the prune', iSt > 0 && iPrune > iSt, { iSt, iPrune });
}

// ── 6. one load at a time ──
{
  const s = mkState(dead.store);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  let lists = 0;
  const realList = s.storage.list;
  s.storage.list = async (o) => { if (o && o.prefix === 'store_listing:') lists++; return realList(o); };
  await Promise.all([r._stEnsureIndex(), r._stEnsureIndex()]);
  await settleIo();
  check('6. two shop requests during a load share it: the shelf read once, the sale finished once',
    lists === 1 && gelOf(s._store, B) === 1 && mailGold(s._store, S) === 500, { lists, gel: gelOf(s._store, B) });
}

// ── 7. no extra write a sale ──
{
  const s = mkState();
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
  r._stSettleWait();
  await settleIo();
  const w0 = s.writes();
  await r._stBuyNow(L, B);
  await settleIo();
  const onW = s.writes() - w0;
  /* the same sale with the switch off */
  const s2 = mkState();
  await s2.storage.put('liveflags', { storehealwait: false });
  const r2 = new GameRoom(s2, mockEnv);
  await r2._liveFlagsEnsure();
  for (const [pid, coins, inv] of [[S, 0, { [GEL]: 10 }], [B, 1000, {}]]) {
    await joinOn(r2, pid);
    r2.playerState[pid].coins = coins;
    r2.playerState[pid].inventory = { ...inv };
    await r2._saveRpg(pid, r2.playerState[pid]);
  }
  await r2._stEnsureIndex();
  const L2 = (await r2._stCreateListing({ playerId: S, kind: 'item', invKey: GEL, qty: 1, price: 500 })).listing.id;
  await settleIo();
  const w1 = s2.writes();
  await r2._stBuyNow(L2, B);
  await settleIo();
  const offW = s2.writes() - w1;
  check(`7. no extra write a sale: a buy-now writes ${onW} row(s), the same as before (${offW})`, onW === offW && onW > 0, { onW, offW });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
