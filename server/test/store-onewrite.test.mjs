/* v2.3.4500: THE AUCTION HOUSE'S MONEY IN ONE WRITE (store.js, storeoffer.js;
 * docs/specs/store-offers.md "One write").
 *
 * The state-machine sweep (2026-11-03, V8a S6-4, S6-5, S6-6) found four places
 * where the Auction House moved gold or goods in one write and wrote the
 * listing that names them in another, so a restart between the two (every
 * merge touching server/ restarts the room) lost gold or goods, or minted it:
 *   - an offer withdrawn, declined or expired: the listing was written without
 *     the offer, THEN the gold went home (a restart between: the gold is gone);
 *   - an offer raised: the old amount went home, THEN the listing was written
 *     (a restart between: an offer with no gold behind it, which the seller's
 *     Yes then paid out -- gold minted);
 *   - a stack listed: the goods were taken, THEN the listing written (a
 *     restart between: the goods are gone);
 *   - a buy-now never wrote `paid: true` after its debit, so the listing's
 *     only proof of payment was a 48-hour stamp.
 *
 * The storage is inbox.test §8c's: every write of one synchronous run commits
 * as one batch, as a Durable Object's does, and the room dies before batch
 * `crashAt`.  Each path is run once to count its batches, then again with a
 * restart before each of them; a second room wakes on what was written (the
 * shelf's rebuild, `_stEnsureIndex`), and the books are counted: every
 * player's purse, bag and mail, and what the listings hold.  Nothing may be
 * made or lost at any of them.
 *
 *   1. a buyer withdraws an offer
 *   2. a seller declines an offer (the buyer online, and away)
 *   3. an offer expires (the buyer online, and away)
 *   4. a buyer raises an offer, and the seller then says Yes
 *   5. a seller lists a stack
 *   6. a buy-now (and the same with 48 hours of a quiet shop after the restart)
 *   7. a leftover of the old order: a raise refunded and its listing never
 *      written -- the seller's Yes pays out nothing that is not there
 *   8. `ahonewrite: false` in the live flags puts the old order back
 *   9. what a player sees is unchanged (the messages, a raise they cannot
 *      afford), and the writes a path costs
 */
import { GameRoom } from '../src/index.js';
import { STORE_OFFER } from '../src/storeoffer.js';
import { flagNameOk } from '../src/liveops.js';

const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* inbox.test §8c's storage: a run's writes are one batch, committed at the
   next microtask; from batch `crashAt` on, nothing is written ever again
   (the room is dead).  `rows` counts the rows a batch writes (a put or a
   delete a key), what the owner pays for. */
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function mkCrashState(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, rows = 0, crashAt = Infinity, dead = false;
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    rows += w.length;
    for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
  };
  const write = (op, k, v) => {
    if (!pending) { pending = []; queueMicrotask(commit); }
    pending.push([op, k, clone(v)]);
  };
  const view = (k) => {
    if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
    return clone(store.get(k));
  };
  return {
    _store: store,
    batches: () => batches,
    rows: () => rows,
    crashAt(n) { crashAt = n; },
    storage: {
      get: async (k) => view(k),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
      /* sorted, `limit` and `startAfter`, as the runtime's: the shelf's
         rebuild pages through it */
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
const settleIo = () => new Promise((r) => setTimeout(r, 5));
async function joinOn(rm, ws, pid) {
  rm.sessions.set(ws, baseSession());
  /* today's login reward already taken, so a join moves no gold (inbox.test) */
  await rm.state.storage.put('cadence:login:' + pid, { period: rm._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(6), phrase: 'p-' + pid, data: { x: 100, y: 100, z: 'town' } }));
  await settleIo();
}

const S = 'bp_ow_sell', A = 'bp_ow_buya', B = 'bp_ow_buyb';
const GEL = 'slime_gel';

/* The world every path starts from: a seller with 10 slime gel, two buyers
   with 1000 gold each; one gel listed at 500, and buyer A's offer of 300 on
   it.  Built with no restart, then everyone leaves.  `flags` go in the live
   flags (and stay there for the rooms that wake on it). */
async function seedWorld(flags) {
  const s = mkCrashState();
  const r = new GameRoom(s, mockEnv);
  if (flags) { await s.storage.put('liveflags', flags); await settleIo(); }
  await r._liveFlagsEnsure();
  for (const [pid, coins, inv] of [[S, 0, { [GEL]: 10 }], [A, 1000, {}], [B, 1000, {}]]) {
    await joinOn(r, fakeWs('w-' + pid), pid);
    r.playerState[pid].coins = coins;
    r.playerState[pid].inventory = { ...inv };
    r._saveRpg(pid, r.playerState[pid]);
  }
  await settleIo();
  await r._stEnsureIndex();
  const L = (await r._stCreateListing({ playerId: S, kind: 'item', invKey: GEL, qty: 1, price: 500 })).listing.id;
  r._soBuckets = null;
  const o = await r._stOfferPlace(L, A, 300);
  await settleIo();
  if (!o.ok) throw new Error('seed offer refused: ' + JSON.stringify(o));
  return { store: s._store, L };
}

/* Gold and gel in the world, read off the disk: purses and bags, the mail,
   and what every listing holds (its goods, its top bid, its offers). */
function books(store) {
  let gold = 0, gel = 0;
  for (const [k, v] of store) {
    if (k.startsWith('rpg:')) {
      gold += Math.floor((v && v.coins) || 0);
      gel += (v && v.inventory && v.inventory[GEL]) || 0;
    } else if (k.startsWith('inbox:')) {
      for (const e of v || []) {
        if (e.kind === 'gold') gold += Math.floor(e.payload.amount || 0);
        if (e.kind === 'item' && e.payload.invKey === GEL) gel += Math.max(1, Math.floor(e.payload.count || 1));
      }
    } else if (k.startsWith('store_listing:')) {
      if (v.kind === 'item' && v.invKey === GEL) gel += v.qty;
      if (v.topBid) gold += v.topBid.amount;
      for (const o of Object.values(v.offers || {})) gold += o.gold;
    }
  }
  return { gold, gel };
}
/* a listing still carrying a step in flight after the wake */
function unfinished(store) {
  const out = [];
  for (const [k, v] of store) if (k.startsWith('store_listing:') && (v.sale || v.pendOffer || v.pendBid || v.releasing)) out.push(k);
  return out;
}

/* A fresh room on `seed`; `before` (no restart: joins, setup), then `act`
   with the room dying before its k-th batch; then a second room wakes on
   what was written: the shelf's rebuild, then `after` (a later step, the
   seller's Yes).  Returns the second room's disk. */
async function crashRun(seed, k, { before, act, after, prune }) {
  const s1 = mkCrashState(seed);
  const r1 = new GameRoom(s1, mockEnv);
  await r1._liveFlagsEnsure();
  await r1._stEnsureIndex();   /* as every store request does first */
  const ctx = before ? ((await before(r1)) || {}) : {};
  await settleIo();
  s1.crashAt(k === Infinity ? Infinity : s1.batches() + k);
  ctx.result = await act(r1, ctx);
  await settleIo();
  const survived = s1._store;
  /* 48 hours with nobody opening the shop: the stamps are pruned (inbox.js
     _opPruneMaybe) before anything reads them */
  if (prune && prune(survived)) for (const key of [...survived.keys()]) if (key.startsWith('oplog:')) survived.delete(key);
  const s2 = mkCrashState(survived);
  const r2 = new GameRoom(s2, mockEnv);
  await r2._liveFlagsEnsure();
  await r2._stEnsureIndex();
  await settleIo();
  if (after) { await after(r2, ctx); await settleIo(); }
  return s2._store;
}

/* How many batches `act` writes when nothing goes wrong, and the rows */
async function measure(seed, { before, act }) {
  const s = mkCrashState(seed);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  await r._stEnsureIndex();
  const ctx = before ? ((await before(r)) || {}) : {};
  await settleIo();
  const b0 = s.batches(), w0 = s.rows();
  ctx.result = await act(r, ctx);
  await settleIo();
  return { batches: s.batches() - b0, rows: s.rows() - w0, ctx, store: s._store };
}

/* Run a path with a restart before every one of its batches (and none);
   returns every k at which the books did not balance. */
async function everyRestart(seed, path, want) {
  const m = await measure(seed, path);
  const wrong = [];
  for (let k = 0; k <= m.batches; k++) {
    const st = await crashRun(seed, k, path);
    const got = books(st);
    const left = unfinished(st);
    if (got.gold !== want.gold || got.gel !== want.gel || left.length) wrong.push({ restartBefore: k, of: m.batches, gold: got.gold - want.gold, gel: got.gel - want.gel, left });
  }
  return { wrong, batches: m.batches, rows: m.rows };
}

const join = (pid) => async (r) => { await joinOn(r, fakeWs('j-' + pid), pid); };
const joinAll = (...pids) => async (r) => { for (const pid of pids) await joinOn(r, fakeWs('j-' + pid), pid); };
const cost = {};

const world = await seedWorld();
const W0 = books(world.store);
const L = world.L;
check('0. the world: 1000 + 1000 gold (300 of it in A\'s offer), 10 gel (1 of it listed)', W0.gold === 2000 && W0.gel === 10, W0);

// ── 1. a buyer withdraws an offer ──
{
  const path = { before: join(A), act: (r) => r._stOfferWithdraw(L, A) };
  const res = await everyRestart(world.store, path, W0);
  cost.withdraw = res;
  check(`1. withdraw: a restart before any of its ${res.batches} write(s) loses no gold (it lost the 300: the listing was written first)`, res.wrong.length === 0, res.wrong);
}

// ── 2. a seller declines an offer, the buyer online and away ──
for (const online of [true, false]) {
  const path = { before: online ? joinAll(S, A) : join(S), act: (r) => r._stOfferReply(L, S, A, 'no') };
  const res = await everyRestart(world.store, path, W0);
  cost['decline' + (online ? '' : 'Away')] = res;
  check(`2. decline, the buyer ${online ? 'online' : 'away (the gold goes to the mail)'}: a restart before any of its ${res.batches} write(s) loses no gold`, res.wrong.length === 0, res.wrong);
}

// ── 3. an offer expires, the buyer online and away ──
for (const online of [true, false]) {
  const path = {
    before: async (r) => {
      if (online) await joinOn(r, fakeWs('j-a'), A);
      await r._stEnsureIndex();
      r._stIndex.get(L).offers[A].at = Date.now() - STORE_OFFER.OFFER_EXPIRY - 1;
      r._stLastSweep = 0;
    },
    act: (r) => r._stSweep(),
  };
  const res = await everyRestart(world.store, path, W0);
  cost['expiry' + (online ? '' : 'Away')] = res;
  check(`3. an offer's 48 h run out, the buyer ${online ? 'online' : 'away'}: a restart before any of its ${res.batches} write(s) loses no gold`, res.wrong.length === 0, res.wrong);
}

// ── 4. a buyer raises an offer, and the seller then says Yes ──
{
  const path = {
    before: join(A),
    act: (r) => { r._soBuckets = null; return r._stOfferPlace(L, A, 400); },
    /* the seller says Yes to whatever offer A holds after the wake */
    after: async (r2) => { await r2._stOfferReply(L, S, A, 'yes'); },
  };
  const res = await everyRestart(world.store, path, W0);
  cost.raise = res;
  check(`4. raise 300 -> 400, then the seller's Yes: a restart before any of its ${res.batches} write(s) makes no gold (an offer with no gold behind it paid the seller 300 nobody paid)`, res.wrong.length === 0, res.wrong);
  /* ...and with no restart the raise did what it says */
  const m = await measure(world.store, { before: join(A), act: (r) => { r._soBuckets = null; return r._stOfferPlace(L, A, 400); } });
  const rec = m.store.get('store_listing:' + L);
  check('4. ...with no restart: A holds one offer of 400 and 600 gold', m.ctx.result.ok === true && rec.offers[A].gold === 400 && m.store.get('rpg:' + A).coins === 600 && !rec.pendOffer, { r: m.ctx.result, offers: rec.offers, coins: m.store.get('rpg:' + A).coins });
}

// ── 5. a seller lists a stack ──
{
  const path = { before: join(S), act: (r) => r._stCreateListing({ playerId: S, kind: 'item', invKey: GEL, qty: 4, price: 100 }) };
  const res = await everyRestart(world.store, path, W0);
  cost.listStack = res;
  check(`5. list a stack of 4: a restart before any of its ${res.batches} write(s) loses no goods (it lost the 4: taken first, the listing written second)`, res.wrong.length === 0, res.wrong);
  const m = await measure(world.store, path);
  check('5. ...with no restart: the stack is listed and out of the bag', m.ctx.result.ok === true && m.store.get('rpg:' + S).inventory[GEL] === 5 && m.store.get('store_listing:' + m.ctx.result.listing.id).qty === 4, m.ctx.result);
}

// ── 6. a buy-now ──
{
  const path = { before: join(B), act: (r) => r._stBuyNow(L, B) };
  const res = await everyRestart(world.store, path, W0);
  cost.buyNow = res;
  check(`6. buy-now: a restart before any of its ${res.batches} write(s) loses nothing`, res.wrong.length === 0, res.wrong);
  /* ...and the same restart, then 48 hours with nobody opening the shop:
     the stamps are gone, and the listing alone must say whether the buyer
     paid.  Only up to the payment: a restart inside the settlement (goods,
     gold, the offer's refund) heals by its stamps, and their 48 hours are
     not this change's (V8a S6-4, the PR's "not changed"). */
  const m = await measure(world.store, path);
  const wrong = [];
  for (let k = 0; k <= m.batches; k++) {
    let pruned = false;
    const st = await crashRun(world.store, k, { ...path, prune: (sv) => (pruned = !sv.has('oplog:store:' + L + ':goods')) });
    if (!pruned) continue;
    const got = books(st);
    if (got.gold !== W0.gold || got.gel !== W0.gel || unfinished(st).length) wrong.push({ restartBefore: k, gold: got.gold - W0.gold, gel: got.gel - W0.gel });
  }
  check('6. buy-now, a restart right after the payment, then 48 h of a quiet shop: the listing says it was paid, and the sale finishes (the buyer\'s 500 was lost: the listing went back on the shelf)', wrong.length === 0, wrong);
  const st = m.store;
  /* the seller and A are away: their gold waits in the mail */
  const mailGold = (pid) => (st.get('inbox:' + pid) || []).reduce((t, e) => t + (e.kind === 'gold' ? e.payload.amount : 0), 0);
  check('6. ...with no restart: B paid 500 and holds the gel, the seller has 500 and A their 300 back in the mail', st.get('rpg:' + B).coins === 500 && st.get('rpg:' + B).inventory[GEL] === 1 && mailGold(S) === 500 && mailGold(A) === 300 && !st.has('store_listing:' + L), { b: st.get('rpg:' + B).coins, s: mailGold(S), a: mailGold(A) });
}

// ── 7. a leftover of the old order: a raise refunded, its listing never written ──
{
  /* exactly what the old raise left at a restart between its two writes: A's
     300 back in the purse, its refund stamped, and the listing still holding
     the offer */
  const left = new Map([...world.store].map(([k, v]) => [k, clone(v)]));
  const seq = left.get('store_listing:' + L).offers[A].seq;
  left.get('rpg:' + A).coins += 300;
  left.set('oplog:store:' + L + ':offerref:' + seq, Date.now());
  const yes = await crashRun(left, Infinity, { act: async () => null, after: async (r2) => { await r2._stOfferReply(L, S, A, 'yes'); } });
  check('7. the seller\'s Yes to an offer whose gold already went home pays the seller nothing (it paid 300 out of thin air)', books(yes).gold === W0.gold && yes.get('rpg:' + S).coins === 0, { gold: books(yes).gold - W0.gold, seller: yes.get('rpg:' + S).coins });
  check('7. ...the offer is gone from the listing, and the gel is still for sale', yes.has('store_listing:' + L) && !(yes.get('store_listing:' + L).offers || {})[A] && books(yes).gel === W0.gel, yes.get('store_listing:' + L));
  const raise = await crashRun(left, Infinity, { before: join(A), act: (r) => { r._soBuckets = null; return r._stOfferPlace(L, A, 400); } });
  check('7. ...and A raising it pays them nothing back a second time (600 left, one offer of 400)', raise.get('rpg:' + A).coins === 600 && raise.get('store_listing:' + L).offers[A].gold === 400 && books(raise).gold === W0.gold, { coins: raise.get('rpg:' + A).coins, offers: raise.get('store_listing:' + L).offers });
  const wd = await crashRun(left, Infinity, { before: join(A), act: (r) => r._stOfferWithdraw(L, A) });
  check('7. ...and A withdrawing it pays nothing twice', wd.get('rpg:' + A).coins === 1000 && books(wd).gold === W0.gold, { coins: wd.get('rpg:' + A).coins });
}

// ── 8. `ahonewrite: false` puts the old order back ──
{
  const probe = new GameRoom(mkCrashState(), mockEnv);
  const reads = (flags) => { probe._liveFlags = flags; return typeof probe._ahOneWrite === 'function' ? probe._ahOneWrite() : 'missing'; };
  check('8. `ahonewrite` is a name the live flags take, and it is on unless written false', flagNameOk('ahonewrite') && reads({}) === true && reads({ ahonewrite: true }) === true && reads({ ahonewrite: false }) === false && reads(null) === true, { none: reads({}), off: reads({ ahonewrite: false }) });
  const old = await seedWorld({ ahonewrite: false });
  const O0 = books(old.store);
  const withdraw = await everyRestart(old.store, { before: join(A), act: (r) => r._stOfferWithdraw(old.L, A) }, O0);
  check('8. switched off, the withdraw writes the listing first again (a restart between loses the 300)', withdraw.wrong.length === 1 && withdraw.wrong[0].gold === -300 && withdraw.batches === cost.withdraw.batches + 1, withdraw);
  const raise = await everyRestart(old.store, { before: join(A), act: (r) => { r._soBuckets = null; return r._stOfferPlace(old.L, A, 400); }, after: async (r2) => { await r2._stOfferReply(old.L, S, A, 'yes'); } }, O0);
  check('8. ...the raise refunds first again (a restart between pays the seller 300 nobody paid)', raise.wrong.some((w) => w.gold === 300), raise.wrong);
  const stack = await everyRestart(old.store, { before: join(S), act: (r) => r._stCreateListing({ playerId: S, kind: 'item', invKey: GEL, qty: 4, price: 100 }) }, O0);
  check('8. ...the stack is taken in a write of its own again (a restart between loses the 4)', stack.wrong.length === 1 && stack.wrong[0].gel === -4, stack.wrong);
  const buy = await measure(old.store, { before: join(B), act: (r) => r._stBuyNow(old.L, B) });
  check('8. ...and a buy-now marks the sale before it takes the gold, as before', buy.batches === cost.buyNow.batches + 1, { old: buy.batches, now: cost.buyNow.batches });
}

// ── 9. what a player sees, and what it costs ──
{
  /* a raise sends the buyer the same "offer replaced" mail it always did */
  const wsA = fakeWs('a9');
  const m = await measure(world.store, {
    before: async (r) => { await joinOn(r, wsA, A); wsA.sent.length = 0; },
    act: (r) => { r._soBuckets = null; return r._stOfferPlace(L, A, 400); },
  });
  const mail = wsA.sent.filter((x) => x.type === 'inbox_delivered');
  check('9. a raise tells the buyer their old 300 came back, as before', m.ctx.result.ok && mail.length === 1 && mail[0].payload.entries[0].payload.amount === 300 && /offer replaced/.test(mail[0].payload.entries[0].note), mail);
  /* a raise the buyer cannot afford: as before, the old offer goes home and
     nothing else moves */
  const poor = await measure(world.store, { before: join(A), act: (r) => { r._soBuckets = null; return r._stOfferPlace(L, A, 1200); } });
  check('9. a raise to more than the purse and the old offer can pay is refused, the old 300 handed back (as before)', poor.ctx.result.ok === false && /Not enough gold/.test(poor.ctx.result.error) && poor.store.get('rpg:' + A).coins === 1000 && !(poor.store.get('store_listing:' + L).offers || {})[A] && books(poor.store).gold === W0.gold, { r: poor.ctx.result, coins: poor.store.get('rpg:' + A).coins });
  /* a withdraw tells the buyer, a decline tells the buyer through the mail */
  const wsW = fakeWs('w9');
  const w = await measure(world.store, { before: async (r) => { await joinOn(r, wsW, A); wsW.sent.length = 0; }, act: (r) => r._stOfferWithdraw(L, A) });
  check('9. a withdraw answers as before and the gold arrives with its note', w.ctx.result.ok === true && w.ctx.result.withdrawn === true && wsW.sent.some((x) => x.type === 'inbox_delivered' && /offer withdrawn/.test(x.payload.entries[0].note)), w.ctx.result);
  const writes = {};
  for (const [name, r] of Object.entries(cost)) writes[name] = r.batches + ' batch(es), ' + r.rows + ' row(s)';
  console.log('   the writes each path costs now:', JSON.stringify(writes));
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
