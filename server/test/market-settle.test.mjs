/* ═══ v2.3.4505: THE GENERAL STORE'S CROSSING, CUT AT EVERY WRITE ═══
 *
 * The state-machine sweep (2026-11-03, V8a S6-3 and S6-4).  When a new order
 * in the General Store (/api/market) met a resting one, the worker saved the
 * taker's escrow (their gold or their weapon) and then paid each leg of the
 * trade -- the weapon, the gold, the price-improvement refund -- with an await
 * of its own, and deleted the maker's order last.  Every server merge
 * restarts the room, and a restart between those writes:
 *   - before the weapon leg: took the taker's gold or weapon (nothing named
 *     it) and put the maker's order back on sale;
 *   - after the weapon leg: left an order the wake deleted on ANY stamp, so
 *     the seller was never paid, and a price improvement was lost the same way.
 * And a leftover was looked at only by the first shop request after a wake,
 * while the stamps that said "paid" are pruned after 48 h (TRAPS §146).
 *
 * Now the crossing writes a "settle" note on the maker's order -- which legs
 * are owed, to whom, how much -- in the SAME synchronous run as the taker's
 * escrow save, before any credit.  Each leg is an idempotent credit with its
 * own stamp; the record is deleted when every leg is stamped.  A record found
 * with a note (the book's rebuild, a wake scan the stamp prune waits for, a
 * cancel, the expiry sweep) is finished: every leg without its stamp is paid,
 * then it is deleted.  `mktsettle: false` in the live flags puts back the old
 * order.
 *
 * The storage is inbox.test §8b/§8c's: every write made in one synchronous run
 * commits as one batch, as a Durable Object's does, and the room dies before
 * batch `crashAt` (every later write is lost).  Then a second room wakes on
 * what was written.
 *
 *   1. three crossings (a buy with a price improvement, a sell to an offline
 *      buyer, a buy at the asking price to an offline seller), cut at every
 *      write, woken through the shop's rebuild and through the wake scan:
 *      every coin and weapon is where it should be -- the trade happened
 *      whole, or not at all -- and nothing is paid twice;
 *   2. the heal itself cut at every write, then a third wake: still exact;
 *   3. the stamp prune waits for the wake's heal (a leftover found 49 h on);
 *   4. the kill switch: the old order back, and a note under the old rule
 *      (what an older worker does) is never paid twice, a roll forward too;
 *   5. a leg that throws inside one worker's life: the cancel and the retry
 *      finish the sale, and the prune waits meanwhile;
 *   6. the costs: one row more a crossing, no read more; a wake scan of a
 *      book with nothing to finish reads one page and writes nothing;
 *   7. the note's shape, the answer's shape, and a newer worker's note left
 *      alone.
 */
import { GameRoom } from '../src/index.js';
import { MARKET } from '../src/market.js';
import { OP_PRUNE } from '../src/inbox.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
/* inbox.test §8c's batch storage, with the runtime's sorted, paged list(), a
   count of every read and write, and an optional fault on one read */
function mkState(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, crashAt = Infinity, dead = false;
  const log = { gets: [], lists: [], writes: [] };
  let failGet = null;
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
  };
  const write = (op, k, v) => {
    log.writes.push(op + ' ' + k);
    if (!pending) { pending = []; queueMicrotask(commit); }
    pending.push([op, k, clone(v)]);
  };
  const view = (k) => {
    if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
    return clone(store.get(k));
  };
  return {
    _store: store,
    log,
    batches: () => batches,
    crashAt(n) { crashAt = n; },
    failGetOnce(k) { failGet = k; },
    storage: {
      get: async (k) => {
        log.gets.push(String(k));
        if (failGet !== null && k === failGet) { failGet = null; throw new Error('simulated read fault'); }
        return view(k);
      },
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        let n = 0;
        for (const k of keys) {
          if (opts?.startAfter && k <= opts.startAfter) continue;
          if (opts?.limit && n >= opts.limit) break;
          out.set(k, clone(store.get(k))); n++;
        }
        log.lists.push({ prefix: opts?.prefix, limit: opts?.limit, size: out.size });
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const settleIo = () => new Promise((r) => setTimeout(r, 5));
/* a room whose tick never starts by itself (section 3 drives it by hand), so
   each wake below is the one it names */
function mkRoom(s, flags) {
  const r = new GameRoom(s, mockEnv);
  r.startTickLoop = () => {};
  if (flags) r._liveFlags = { ...flags };
  return r;
}
async function joinOn(room, pid) {
  const ws = fakeWs(pid);
  room.sessions.set(ws, baseSession());
  await room.state.storage.put('cadence:login:' + pid, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: 'T', phrase: 'p-' + pid, data: { x: 100, y: 100, z: 'town' } }));
  await settleIo();
  return ws;
}

const T = 'bp_mset_taker';
const M = 'bp_mset_maker';
const W = 'Settle Test Blade';
const wpn = () => ({ name: W, tierMult: 1.0, dmg: 5 });
const ORD = (over) => ({ category: 'weapon', subtype: 'greatsword', tierKey: 'iron', tierLabel: 'Iron', playerName: 'P', ...over });

/* Each crossing: who holds what before, the maker's resting order, the
   taker's order, and the two worlds a restart may leave: the trade not
   started, or the trade done. */
const SCEN = [
  {
    name: 'a taker buy at 120 meets a resting sell at 100 (20 back), both online',
    tStash: [], mStash: [wpn()], tCoins: 500, mCoins: 300, makerOnline: true,
    maker: ORD({ type: 'sell', price: 100, playerId: M, stashIndex: 0 }),
    taker: ORD({ type: 'buy', price: 120, playerId: T }),
    before: 'T500 M300 book:sell100', after: 'T400W M400 book:',
  },
  {
    name: 'a taker sell at 140 meets a resting buy at 150, the buyer offline',
    tStash: [wpn()], mStash: [], tCoins: 500, mCoins: 300, makerOnline: false,
    maker: ORD({ type: 'buy', price: 150, playerId: M }),
    taker: ORD({ type: 'sell', price: 140, playerId: T, stashIndex: 0 }),
    before: 'T500W M150 book:buy150', after: 'T650 M150W book:',
  },
  {
    name: 'a taker buy at the asking 100, the seller offline',
    tStash: [], mStash: [wpn()], tCoins: 500, mCoins: 300, makerOnline: false,
    maker: ORD({ type: 'sell', price: 100, playerId: M, stashIndex: 0 }),
    taker: ORD({ type: 'buy', price: 100, playerId: T }),
    before: 'T500 M300 book:sell100', after: 'T400W M400 book:',
  },
];

/* the world before the crossing: both saved, the maker's order resting */
async function setup(sc) {
  const s = mkState();
  const r = mkRoom(s);
  await joinOn(r, T); await joinOn(r, M);
  Object.assign(r.playerState[T], { coins: sc.tCoins, weaponStash: sc.tStash.map(clone) });
  Object.assign(r.playerState[M], { coins: sc.mCoins, weaponStash: sc.mStash.map(clone) });
  r._saveRpg(T, r.playerState[T]); r._saveRpg(M, r.playerState[M]);
  await settleIo();
  await r._mktEnsureIndex();
  const rest = await r._mktPlaceOrder(clone(sc.maker));
  await settleIo();
  if (!rest.ok || rest.matched) throw new Error('setup: the maker order did not rest: ' + JSON.stringify(rest));
  return { store: s._store, makerId: rest.order.id };
}

const hasW = (ps) => !!(ps && Array.isArray(ps.weaponStash) && ps.weaponStash.some((w) => w && w.name === W));
/* where every coin and the one weapon are, once both players have joined
   (their mail drained) */
function audit(r, s) {
  const t = r.playerState[T], m = r.playerState[M];
  const orders = [...s._store].filter(([k]) => k.startsWith('mkt_order:')).map(([, v]) => v);
  let gold = (t.coins || 0) + (m.coins || 0);
  let wCount = (t.weaponStash || []).filter((w) => w && w.name === W).length + (m.weaponStash || []).filter((w) => w && w.name === W).length;
  for (const o of orders) {
    if (o.type === 'buy') gold += o.price;
    if (o.item && o.item.name === W) wCount++;
  }
  for (const pid of [T, M]) {
    for (const e of s._store.get('inbox:' + pid) || []) {
      if (e.kind === 'gold') gold += e.payload.amount;
      if (e.kind === 'weapon' && e.payload.weapon && e.payload.weapon.name === W) wCount++;
    }
  }
  const sig = 'T' + t.coins + (hasW(t) ? 'W' : '') + ' M' + m.coins + (hasW(m) ? 'W' : '')
    + ' book:' + orders.map((o) => o.type + o.price + (o.settle ? '(settling)' : '')).join(',');
  return { sig, gold, wCount, settling: orders.filter((o) => o.settle).length };
}

/* drive the wake scan the tick's housekeeping runs (tick.js) until it says
   the stamp prune may go; false if there is none (main before v2.3.4505) */
async function wakeScan(r) {
  if (typeof r._mktSettleWait !== 'function') return false;
  for (let i = 0; i < 50; i++) {
    if (!r._mktSettleWait()) return true;
    await settleIo();
  }
  return false;
}

/* one crossing on a fresh room over `store`, the room dying before its k-th
   write (Infinity: never); returns the store it left and the answer */
async function crossing(sc, store, k, flags) {
  const s1 = mkState(store);
  const r1 = mkRoom(s1, flags);
  await joinOn(r1, T);
  if (sc.makerOnline) await joinOn(r1, M);
  await r1._mktEnsureIndex();
  await settleIo();
  const b0 = s1.batches();
  const w0 = s1.log.writes.length, g0 = s1.log.gets.length;
  s1.crashAt(k === Infinity ? Infinity : b0 + k);
  let res = null, threw = null;
  try { res = await r1._mktPlaceOrder(clone(sc.taker)); } catch (e) { threw = e.message; }
  await settleIo();
  return { store: s1._store, res, threw, writes: s1.batches() - b0, rows: s1.log.writes.slice(w0), gets: s1.log.gets.slice(g0), r1, s1 };
}
/* wake on `store` by `how` ('shop': the first shop request's rebuild;
   'scan': the tick's wake scan), then both join and the shop opens */
async function wake(store, how, flags) {
  const s2 = mkState(store);
  const r2 = mkRoom(s2, flags);
  let scanned = true;
  if (how === 'scan') scanned = await wakeScan(r2);
  else await r2._mktEnsureIndex();
  await settleIo();
  await joinOn(r2, T); await joinOn(r2, M);
  await r2._mktEnsureIndex();
  await settleIo();
  return { r2, s2, scanned };
}

const INITIAL_GOLD = 800;

/* ── 1. every write of three crossings, two ways to wake ── */
for (const sc of SCEN) {
  const { store } = await setup(sc);
  const dry = await crossing(sc, store, Infinity);
  const n = dry.writes;
  const dw = await wake(dry.store, 'shop');
  const da = audit(dw.r2, dw.s2);
  check(`1. ${sc.name}: uncut, the trade completes (${n} writes)`, dry.res && dry.res.ok && dry.res.matched && da.sig === sc.after && da.gold === INITIAL_GOLD, { res: dry.res, da });
  for (const how of ['shop', 'scan']) {
    const wrong = [];
    for (let k = 0; k <= n; k++) {
      const c = await crossing(sc, store, k);
      const w = await wake(c.store, how);
      const a = audit(w.r2, w.s2);
      const ok = w.scanned && a.gold === INITIAL_GOLD && a.wCount === 1 && a.settling === 0
        && (a.sig === sc.before || a.sig === sc.after);
      if (!ok) wrong.push({ k, sig: a.sig, gold: a.gold, w: a.wCount, settling: a.settling, scanned: w.scanned });
    }
    check(`1. ${sc.name}: a restart at any of its ${n} writes, woken by the ${how === 'shop' ? 'first shop request' : 'wake scan'}, leaves the trade whole or not started (800 gold, one weapon)`, wrong.length === 0, wrong);
  }
}

/* ── 2. the heal cut at every write, then a third wake ── */
{
  const sc = SCEN[0];
  const { store } = await setup(sc);
  const dry = await crossing(sc, store, Infinity);
  const wrong = [];
  let tried = 0;
  for (let k1 = 1; k1 < dry.writes; k1++) {
    const c = await crossing(sc, store, k1);
    /* how many writes this leftover's heal makes */
    const hs = mkState(c.store);
    const hr = mkRoom(hs);
    if (typeof hr._mktSettleWait !== 'function') { wrong.push({ k1, why: 'no wake heal' }); continue; }
    const hb = hs.batches();
    await wakeScan(hr);
    const hn = hs.batches() - hb;
    for (let k2 = 0; k2 <= hn; k2++) {
      tried++;
      const s2 = mkState(c.store);
      const r2 = mkRoom(s2);
      s2.crashAt(s2.batches() + k2);
      await wakeScan(r2);
      await settleIo();
      const w = await wake(s2._store, k2 % 2 ? 'scan' : 'shop');
      const a = audit(w.r2, w.s2);
      if (!(a.gold === INITIAL_GOLD && a.wCount === 1 && a.settling === 0 && a.sig === sc.after)) wrong.push({ k1, k2, sig: a.sig, gold: a.gold, w: a.wCount });
    }
  }
  check(`2. a restart at any write of the wake's heal (${tried} cuts), then another wake: the trade completes exactly once`, wrong.length === 0 && tried > 0, wrong);
}

/* ── 3. the stamp prune waits for the wake's heal ──
   A leftover found 49 h after its restart: the weapon leg's stamp is older
   than the prune's 48 h.  If the prune ran first, the leftover would read as
   unpaid: re-listed (the weapon twice) or its weapon paid again. */
{
  const sc = SCEN[0];
  const { store, makerId } = await setup(sc);
  const c = await crossing(sc, store, 2);   /* the weapon leg landed, nothing after */
  const realNow = Date.now;
  let NOW = realNow() + OP_PRUNE.TTL_MS + 3600000;
  Date.now = () => NOW;
  try {
    const s2 = mkState(c.store);
    const r2 = new GameRoom(s2, mockEnv);
    await joinOn(r2, T); await joinOn(r2, M);
    /* the socket path starts the tick (index.js); here it is started by hand
       and its function kept, as cost-guard does */
    let tickFn = null;
    const realSetInterval = globalThis.setInterval;
    globalThis.setInterval = (fn, ms) => { if (ms === r2.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
    try { r2.startTickLoop(); } finally { globalThis.setInterval = realSetInterval; }
    check('3. setup: the room\'s tick is in hand', typeof tickFn === 'function');
    for (let i = 0; i < 12 && tickFn; i++) {
      try { tickFn(); } catch (e) { /* a tick slot's own business */ }
      await settleIo();
      NOW += 3500;
    }
    await r2._mktEnsureIndex();
    await settleIo();
    const a = audit(r2, s2);
    check('3. a leftover found 49 h on: the tick heals it before the prune, and the trade completes once (one weapon, 800 gold)',
      a.gold === INITIAL_GOLD && a.wCount === 1 && a.sig === sc.after, a);
    check('3. setup: the leftover carried the weapon leg\'s old stamp', c.store.has('oplog:settle:' + makerId + ':item'));
    check('3. ...and the prune did run after the heal (that old stamp is gone, the new ones kept)', !s2._store.has('oplog:settle:' + makerId + ':item') && s2._store.has('oplog:settle:' + makerId + ':gold'), [...s2._store.keys()].filter((k) => k.startsWith('oplog:settle:')));
  } finally {
    Date.now = realNow;
  }
}

/* ── 4. the kill switch, and what an older worker makes of a note ── */
{
  check('4. `mktsettle` is a name the live flags take', flagNameOk('mktsettle'));
  const sc = SCEN[0];
  const { store } = await setup(sc);
  const OFF = { mktsettle: false };
  /* the old order: the taker's save is the crossing's first write, alone */
  const off1 = await crossing(sc, store, 1, OFF);
  const offOrders = [...off1.store].filter(([k]) => k.startsWith('mkt_order:')).map(([, v]) => v);
  check('4. switched off, the crossing writes no note (the old order: the escrow save alone first)', offOrders.length === 1 && !offOrders[0].settle, offOrders);
  const offUncut = await crossing(sc, store, Infinity, OFF);
  check('4. ...and still trades, uncut', offUncut.res && offUncut.res.ok && offUncut.res.matched && offUncut.res.execPrice === 100, offUncut.res);
  {
    const sOff = mkState(store);
    const rOff = mkRoom(sOff, OFF);
    const L0 = sOff.log.lists.length;
    check('4. ...and the stamp prune never waits on the store (no wake scan, nothing read)', typeof rOff._mktSettleWait === 'function' && rOff._mktSettleWait() === false && sOff.log.lists.length === L0);
  }
  /* a note woken under the old rule (switch off, which is an older worker's
     rule: any stamp deletes, none re-lists): never more gold or weapons than
     there were, at any write; then rolled forward (switch on): still never
     more, and a note the old rule only re-listed is finished whole */
  const dry = await crossing(sc, store, Infinity);
  const wrong = [];
  for (let k = 1; k <= dry.writes; k++) {
    const c = await crossing(sc, store, k);
    const old = await wake(c.store, 'shop', OFF);
    const a1 = audit(old.r2, old.s2);
    if (a1.gold > INITIAL_GOLD || a1.wCount > 1) wrong.push({ k, step: 'old rule', sig: a1.sig, gold: a1.gold, w: a1.wCount });
    const fwd = await wake(old.s2._store, 'scan');
    const a2 = audit(fwd.r2, fwd.s2);
    if (a2.gold > INITIAL_GOLD || a2.wCount > 1) wrong.push({ k, step: 'roll forward', sig: a2.sig, gold: a2.gold, w: a2.wCount });
    if (k === 1 && a2.sig !== sc.after) wrong.push({ k, step: 'roll forward finishes a re-listed note', sig: a2.sig });
  }
  check('4. a note under the old rule, then rolled forward, never pays twice at any write (and a re-listed one is finished)', wrong.length === 0, wrong);

  /* the old rule re-listed a note, the maker cancelled it (refunded), and the
     room died before the delete: rolled forward, the note's legs must NOT be
     paid (the maker's escrow went home) -- the taker's escrow goes home too */
  {
    const c = await crossing(sc, store, 1);
    const s3 = mkState(c.store);
    const r3 = mkRoom(s3, OFF);
    await joinOn(r3, M);
    await r3._mktEnsureIndex();
    const noted = [...c.store].find(([k, v]) => k.startsWith('mkt_order:') && v.settle);
    const id = noted ? noted[1].id : 'none';
    const b = s3.batches();
    /* the refund's write lands, the delete does not */
    s3.crashAt(b + 1);
    await r3._mktCancelOrder(id, M);
    await settleIo();
    const st = s3._store;
    check('4. setup: the refund landed and the noted order did not go', st.has('oplog:refund:' + id) && !!(st.get('mkt_order:' + id) || {}).settle, [...st.keys()].filter((k) => k.indexOf(id) >= 0));
    const fwd = await wake(st, 'scan');
    const a = audit(fwd.r2, fwd.s2);
    check('4. ...rolled forward: the maker keeps the refund, the taker gets the escrow back, nothing twice (T500 M300W, empty book)',
      a.gold === INITIAL_GOLD && a.wCount === 1 && a.sig === 'T500 M300W book:', a);
  }
}

/* ── 5. a leg that throws inside one worker's life ── */
for (const finish of ['cancel', 'retry']) {
  const sc = SCEN[0];
  const { store, makerId } = await setup(sc);
  const s1 = mkState(store);
  const r1 = mkRoom(s1);
  await joinOn(r1, T); await joinOn(r1, M);
  await r1._mktEnsureIndex();
  await settleIo();
  /* the gold leg's stamp read fails once: the sale stops after the weapon */
  s1.failGetOnce('oplog:settle:' + makerId + ':gold');
  let threw = false;
  try { await r1._mktPlaceOrder(clone(sc.taker)); } catch (e) { threw = true; }
  await settleIo();
  const mid = audit(r1, s1);
  check(`5 (${finish}). a read fault after the weapon leg: the crossing answers an error, the sale half done`, threw && mid.sig === 'T380W M300 book:sell100(settling)', { threw, sig: mid.sig });
  if (finish === 'cancel') {
    const cx = await r1._mktCancelOrder(makerId, M);
    check('5 (cancel). the maker\'s cancel of an order mid-sale finishes the sale (answered as gone, never refunded)', cx && cx.ok === false, cx);
  } else {
    const owedNow = typeof r1._mktSettleWait === 'function' && r1._mktSettleWait();
    check('5 (retry). ...the stamp prune waits while it is owed', owedNow === true, owedNow);
    for (let i = 0; i < 10 && r1._mktSettleWait && r1._mktSettleWait(); i++) await settleIo();
  }
  await settleIo();
  const a = audit(r1, s1);
  check(`5 (${finish}). ...and the trade completes once (T400W M400, empty book)`, a.gold === INITIAL_GOLD && a.wCount === 1 && a.sig === sc.after, a);
  check(`5 (${finish}). ...and then the prune may go`, typeof r1._mktSettleWait === 'function' && r1._mktSettleWait() === false);
}

/* ── 6. the costs ── */
{
  const sc = SCEN[0];
  const { store } = await setup(sc);
  const on = await crossing(sc, store, Infinity);
  const off = await crossing(sc, store, Infinity, { mktsettle: false });
  /* measured from each crossing's own start */
  check('6. a crossing writes one row more than the old order (its note), no more', on.rows.length === off.rows.length + 1, { on: on.rows, off: off.rows });
  check('6. ...and reads nothing more', on.gets.length === off.gets.length, { on: on.gets, off: off.gets });

  /* a wake scan over a book with nothing to finish: one page read, no other read, no write */
  const sW = mkState(store);
  const rW = mkRoom(sW);
  const L0 = sW.log.lists.length, G0 = sW.log.gets.length, W0 = sW.log.writes.length;
  const ran = await wakeScan(rW);
  const lists = sW.log.lists.slice(L0);
  check('6. a wake scan of a book with nothing to finish: one paged list, no get, no write',
    ran && lists.length === 1 && lists[0].prefix === 'mkt_order:' && lists[0].limit === MARKET.SCAN_PAGE && sW.log.gets.length === G0 && sW.log.writes.length === W0,
    { ran, lists, gets: sW.log.gets.slice(G0), writes: sW.log.writes.slice(W0) });
  /* the shop's rebuild first: the scan then has nothing left to read */
  const sR = mkState(store);
  const rR = mkRoom(sR);
  await rR._mktEnsureIndex();
  const l0 = sR.log.lists.length, g0 = sR.log.gets.length;
  const waits = typeof rR._mktSettleWait === 'function' ? rR._mktSettleWait() : null;
  check('6. after the shop\'s rebuild the wake scan reads nothing more and the prune may go', waits === false && sR.log.lists.length === l0 && sR.log.gets.length === g0, { waits });
}

/* ── 7. shapes ── */
{
  const sc = SCEN[0];
  const { store, makerId } = await setup(sc);
  const c = await crossing(sc, store, 1);   /* the note and the taker's save only */
  const rec = c.store.get('mkt_order:' + makerId);
  const st = rec && rec.settle;
  check('7. the note lands with the taker\'s escrow save, before any credit', !!st && c.store.get('rpg:' + T).coins === 380 && ![...c.store.keys()].some((k) => k.startsWith('oplog:settle:')), { st, coins: (c.store.get('rpg:' + T) || {}).coins });
  check('7. ...and names every leg: whose, what, how much', st && st.v === MARKET.SETTLE_V && Array.isArray(st.legs) && st.legs.length === 3
    && st.legs[0].leg === 'item' && st.legs[0].to === T && st.legs[0].weapon && st.legs[0].weapon.name === W
    && st.legs[1].leg === 'gold' && st.legs[1].to === M && st.legs[1].amount === 100
    && st.legs[2].leg === 'diff' && st.legs[2].to === T && st.legs[2].amount === 20, st);
  const u = await crossing(sc, store, Infinity);
  check('7. the answer is the shape it was (no note in it)', u.res && u.res.ok && u.res.settled && u.res.matched && u.res.execPrice === 100
    && u.res.matchedOrder && u.res.matchedOrder.id === makerId && !('settle' in u.res.matchedOrder) && u.res.newOrder && !('settle' in u.res.newOrder), u.res);

  /* a newer worker's note: not ours to pay, list or delete */
  const s9 = mkState(c.store);
  const nv = clone(rec) || {};
  nv.settle = { ...(nv.settle || {}), v: (MARKET.SETTLE_V || 1) + 1 };
  s9._store.set('mkt_order:' + makerId, nv);
  const r9 = mkRoom(s9);
  await wakeScan(r9);
  await r9._mktEnsureIndex();
  await settleIo();
  check('7. a newer worker\'s note is left alone: not paid, not listed, not deleted',
    !![...s9._store.keys()].includes('mkt_order:' + makerId) && ![...s9._store.keys()].some((k) => k.startsWith('oplog:settle:'))
    && r9._mktQueryOrders(null, null, null, null, 100).length === 0);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
