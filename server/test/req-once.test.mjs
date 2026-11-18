/* A REPEAT ACTS ONCE -- v2.3.5194 (server/src/reqonce.js; grand plan step
 * 11.3, step 1; card K PR 9; docs/specs/req-once.md).
 *
 * A request with a request id (`reqId`, SHAPES part 2), repeated with the same
 * id, acts once and gets the first answer again; the answer echoes it.
 *   1. THE MARKET'S PLACE: twice at once, and a minute later: one order, one
 *      weapon escrowed, the same answer.  After a restart (the sitting's
 *      memory gone) the repeat finds its order resting and escrows nothing.
 *      BREAK PROOF: the same place with no id sells the next weapon.
 *   2. THE MARKET'S CANCEL (the id in its query): the same answer again.
 *   3. THE STORE: a listing twice (and after a restart: its record), a buy
 *      twice (the gold taken once), a cancel twice.
 *   4. THE BANK: a deposit twice, and after a restart (the vault's `ops`):
 *      the gold moved once; an older phone's opId still works.
 *   5. THE CHEST: opened twice, one key spent; the repeat is answered the
 *      same prize again, echoing the id.
 *   6. THE CAPE'S REDEEM and THE DAILY SPIN: a repeat stops at its stamp,
 *      kept with the pid.
 *   7. THE AUCTION HOUSE'S OFFER (socket): placed twice, one escrow.
 *   8. ITS REACH: another player's request with the same id acts for them.
 *   9. THE WORLD'S SUM: through 1-4, gold and weapons are neither made nor
 *      lost.
 *  10. THE SWITCHES: `reqonce: false` -- a repeat acts twice, as before;
 *      `reqstamp: false` writes no stamp row; unset (ON since v2.3.6000) a repeat the sitting has
 *      forgotten (a store buy, no record of its own) answers `repeat`.
 *  5194b (the gatekeeper's review, sitting 25):
 *  11. A FIRST THAT THREW (it may have acted: a matched sale is owed) is kept,
 *      and its re-send answers `interrupted`, never runs again.
 *  12. The store's bid and accept, the offer's cancel and the seller's reply.
 *  13. A re-send with both ids across a deploy finds the old opId stamp; the
 *      bank's answer keeps the phone's opId.
 *  14. The cap `reqid`, and the action door's ONE re-send with the same id
 *      behind it (src/game/actions.js). */
import { GameRoom } from '../src/index.js';
import { CHEST } from '../src/dailychest.js';
import { REQ_ONCE } from '../src/reqonce.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}
const settle = () => new Promise((r) => setTimeout(r, 5));
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

function makeStore() {
  const store = new Map();
  const storage = {
    get: async (k) => store.get(k), put: async (k, v) => { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) store.set(a, b); } else store.set(k, v); },
    list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
    delete: async (k) => { if (Array.isArray(k)) { let n = 0; for (const x of k) n += store.delete(x) ? 1 : 0; return n; } return store.delete(k); },
  };
  storage.transaction = async (f) => f(storage);
  return { store, state: { storage, getWebSockets: () => [], acceptWebSocket: () => {} } };
}
async function openRoom(st, flags) {
  const room = new GameRoom(st.state, env);
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  return room;
}
async function join(room, pid) {
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const ss = ws.sent.find((m) => m.type === 'state_sync');
  ws.tok = ss && typeof ss.httpToken === 'string' ? ss.httpToken : null;
  return ws;
}
async function route(room, ws, method, path, body, query) {
  const q = query ? '?' + query : '';
  const init = { method, headers: { 'Content-Type': 'application/json', ...(ws.tok ? { 'x-bt-auth': ws.tok } : {}) } };
  if (body) init.body = JSON.stringify(body);
  const r = await room.fetch(new Request('https://x' + path + q, init));
  return r.json();
}
const msg = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); };
const axe = (n) => ({ name: 'Axe ' + n, tierMult: 1, dmg: 5 });
const sellBody = (pid, reqId) => ({ type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: pid, stashIndex: 0, ...(reqId ? { reqId } : {}) });

/* ── 1. the market's place, 2. its cancel ── */
const W = makeStore();
let room = await openRoom(W);
let wa = await join(room, 'bp_rq_a');
let A = room.playerState['bp_rq_a'];
A.weaponStash = [axe(1), axe(2), axe(3)]; A.coins = 1000;
{
  const [p1, p2] = await Promise.all([
    route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', 'rq-place-1')),
    route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', 'rq-place-1')),
  ]);
  const p3 = await route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', 'rq-place-1'));
  check('1: the same place twice at once and again: one weapon escrowed', A.weaponStash.length === 2, A.weaponStash.length);
  check('1: ...one order, every answer the first (its order\'s id), echoing the id', p1.ok && p2.order && p3.order && p1.order.id === p2.order.id && p1.order.id === p3.order.id && p1.reqId === 'rq-place-1' && p3.reqId === 'rq-place-1', { p1, p2: p2.order && p2.order.id, p3: p3.order && p3.order.id });
  const later = Date.now;
  const t = Date.now() + 60 * 1000; Date.now = () => t;
  const p4 = await route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', 'rq-place-1'));
  Date.now = later;
  check('1: a minute later: the same answer, nothing escrowed', p4.order && p4.order.id === p1.order.id && A.weaponStash.length === 2, p4);
  const keep = p1.order.id;
  /* a restart: the sitting's memory is gone, the order's record is not */
  await settle();
  room = await openRoom(W);
  wa = await join(room, 'bp_rq_a');
  A = room.playerState['bp_rq_a'];
  const p5 = await route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', 'rq-place-1'));
  check('1: after a restart: the repeat finds its order resting and escrows nothing', p5.ok && p5.order && p5.order.id === keep && p5.repeat === true && A.weaponStash.length === 2, { p5, stash: A.weaponStash.length });
  const p6 = await route(room, wa, 'POST', '/api/market/place', sellBody('bp_rq_a', null));
  check('1: BREAK PROOF: the same place with no id sells the next weapon', p6.ok && p6.order.id !== keep && A.weaponStash.length === 1, { stash: A.weaponStash.length });
  const c1 = await route(room, wa, 'DELETE', '/api/market/cancel', null, 'id=' + keep + '&playerId=bp_rq_a&reqId=rq-cxl-1');
  const c2 = await route(room, wa, 'DELETE', '/api/market/cancel', null, 'id=' + keep + '&playerId=bp_rq_a&reqId=rq-cxl-1');
  check('2: the cancel twice: the first answer again, echoed', c1.ok && c2.ok && c2.cancelled && c2.cancelled.id === keep && c2.reqId === 'rq-cxl-1', { c1, c2 });
  await route(room, wa, 'DELETE', '/api/market/cancel', null, 'id=' + p6.order.id + '&playerId=bp_rq_a');
  await settle();
  check('9: the market: three weapons, every one back in the stash', A.weaponStash.length === 3, A.weaponStash.length);
}

/* ── 3. the store ── */
{
  const wb = await join(room, 'bp_rq_b');
  const B = room.playerState['bp_rq_b'];
  B.coins = 5000;
  A.weaponStash = [axe(7)];
  const lb = (reqId) => ({ playerId: 'bp_rq_a', kind: 'weapon', stashIndex: 0, price: 100, ...(reqId ? { reqId } : {}) });
  const l1 = await route(room, wa, 'POST', '/api/store/list', lb('rq-list-1'));
  const l2 = await route(room, wa, 'POST', '/api/store/list', lb('rq-list-1'));
  check('3: a listing twice: one listing, the same answer', l1.ok && l2.ok && l1.listing.id === l2.listing.id && A.weaponStash.length === 0 && l2.reqId === 'rq-list-1', { l1, l2 });
  room._reqSeen = new Map();   /* the sitting's memory gone: the listing's own record answers */
  A.weaponStash = [axe(8)];
  const l3 = await route(room, wa, 'POST', '/api/store/list', lb('rq-list-1'));
  check('3: ...with the memory gone, the listing\'s record: the same listing, nothing escrowed', l3.ok && l3.listing && l3.listing.id === l1.listing.id && l3.repeat === true && A.weaponStash.length === 1, l3);
  const gA = A.coins, gB = B.coins;
  const b1 = await route(room, wb, 'POST', '/api/store/buy', { listingId: l1.listing.id, playerId: 'bp_rq_b', reqId: 'rq-buy-1' });
  const b2 = await route(room, wb, 'POST', '/api/store/buy', { listingId: l1.listing.id, playerId: 'bp_rq_b', reqId: 'rq-buy-1' });
  check('3: a buy twice: the gold taken once, the first answer again', b1.ok && b2.ok && b2.bought && B.coins === gB - 100 && b2.reqId === 'rq-buy-1', { b1, b2, coins: B.coins });
  await settle();
  check('9: the store: the buyer\'s 100 is the seller\'s (less the house\'s fee, if any) and nothing more', A.coins >= gA && A.coins <= gA + 100, { gA, A: A.coins });
  const l4 = await route(room, wa, 'POST', '/api/store/list', lb('rq-list-2'));
  const x1 = await route(room, wa, 'DELETE', '/api/store/cancel', null, 'id=' + l4.listing.id + '&playerId=bp_rq_a&reqId=rq-scx-1');
  const x2 = await route(room, wa, 'DELETE', '/api/store/cancel', null, 'id=' + l4.listing.id + '&playerId=bp_rq_a&reqId=rq-scx-1');
  check('3: a store cancel twice: the first answer again', x1.ok && x2.ok && JSON.stringify(x1.cancelled) === JSON.stringify(x2.cancelled), { x1, x2 });

  /* ── 8. the reach: B's request with A's id acts for B ── */
  B.weaponStash = [axe(9)];
  const r8 = await route(room, wb, 'POST', '/api/store/list', { playerId: 'bp_rq_b', kind: 'weapon', stashIndex: 0, price: 50, reqId: 'rq-list-2' });
  check('8: another player\'s request with the same id acts for them', r8.ok && r8.listing.id !== l4.listing.id && B.weaponStash.length === 0, r8);

  /* ── 7. the auction house's offer ── */
  B.weaponStash = [];
  A.weaponStash = [axe(10)];
  const lo = await route(room, wa, 'POST', '/api/store/list', lb('rq-list-3'));
  const g0 = B.coins;
  wb.sent.length = 0;
  await msg(room, wb, 'store_offer', { listingId: lo.listing.id, gold: 40, reqId: 'rq-offer-1' });
  await msg(room, wb, 'store_offer', { listingId: lo.listing.id, gold: 40, reqId: 'rq-offer-1' });
  const answers = wb.sent.filter((m) => m.type === 'store_offer_state' || m.type === 'store_offer_error');
  check('7: an offer twice: one escrow, the first answer again, echoed', B.coins === g0 - 40 && answers.length === 2 && answers.every((m) => m.payload && m.payload.reqId === 'rq-offer-1'), { coins: B.coins, g0, answers });
}

/* ── 4. the bank ── */
{
  room._bankPlaceOk = () => true;
  room._paceTake = () => true;
  A.coins = 500;
  const v0 = (await room._bankLoad('bp_rq_a')).gold;
  await msg(room, wa, 'bank_deposit', { kind: 'gold', n: 50, reqId: 'rq-bank-1' });
  await msg(room, wa, 'bank_deposit', { kind: 'gold', n: 50, reqId: 'rq-bank-1' });
  await settle();
  check('4: a deposit twice: the gold moved once', A.coins === 450, A.coins);
  const last = wa.sent.filter((m) => m.type === 'bank_state').pop();
  check('4: ...its answer echoes the id', last && JSON.stringify(last).includes('rq-bank-1'), last);
  /* a restart: the vault's ops, the record's own */
  await settle();
  room = await openRoom(W);
  room._bankPlaceOk = () => true; room._paceTake = () => true;
  wa = await join(room, 'bp_rq_a');
  A = room.playerState['bp_rq_a'];
  const c0 = A.coins;
  await msg(room, wa, 'bank_deposit', { kind: 'gold', n: 50, reqId: 'rq-bank-1' });
  check('4: after a restart, the vault\'s ops: nothing moved again', A.coins === c0 && (await room._bankLoad('bp_rq_a')).gold === v0 + 50, { c0, now: A.coins });
  await msg(room, wa, 'bank_deposit', { kind: 'gold', n: 10, opId: 'bk-old-1' });
  await msg(room, wa, 'bank_deposit', { kind: 'gold', n: 10, opId: 'bk-old-1' });
  check('4: an older phone\'s opId: once, as before', A.coins === c0 - 10, A.coins);
}

/* ── 5. the chest ── */
{
  A.inventory = A.inventory || {};
  A.inventory[CHEST.KEY] = 2;
  wa.sent.length = 0;
  await msg(room, wa, 'chest_open', { invKey: CHEST.KEY, reqId: 'rq-chest-1' });
  await msg(room, wa, 'chest_open', { invKey: CHEST.KEY, reqId: 'rq-chest-1' });
  const opened = wa.sent.filter((m) => m.type === 'chest_opened');
  check('5: a chest twice: one key spent', A.inventory[CHEST.KEY] === 1, A.inventory[CHEST.KEY]);
  check('5: ...the repeat answered the same prize again, echoing the id', opened.length === 2 && JSON.stringify(opened[0].payload.prize) === JSON.stringify(opened[1].payload.prize) && opened[1].payload.reqId === 'rq-chest-1', opened);
  check('5: the stamp is kept with the pid', W.store.has('oplog:chestop:bp_rq_a:rq-chest-1'), [...W.store.keys()].filter((k) => k.startsWith('oplog:chest')));
}

/* ── 6. the cape and the spin: the stamp with the pid ── */
{
  let led = 0;
  room._capeForTicket = (k) => (k === 'tkt' ? 'capeX' : null);
  room._capeLedger = async () => { led++; return { redeemed: [] }; };
  room._capeLedgerSave = () => {};
  A.inventory.tkt = 2;
  await msg(room, wa, 'cape_redeem', { invKey: 'tkt', reqId: 'rq-cape-1' });
  await msg(room, wa, 'cape_redeem', { invKey: 'tkt', reqId: 'rq-cape-1' });
  check('6: a cape\'s redeem twice: one ticket spent, the repeat stops at its stamp', A.inventory.tkt === 1 && led === 1 && W.store.has('oplog:capered:bp_rq_a:rq-cape-1'), { tkt: A.inventory.tkt, led });
  let loads = 0;
  const realLoad = room._drLoad.bind(room);
  room._drLoad = async (pid) => { loads++; return realLoad(pid); };
  W.store.set('oplog:spinop:bp_rq_a:rq-spin-1', Date.now());
  A._lastDailySpinAt = 0;
  await msg(room, wa, 'daily_spin', { act: 'spin', reqId: 'rq-spin-1' });
  check('6: a spin whose id is stamped with the pid does not run', loads === 0, loads);
}

/* ── 10. the switches ── */
{
  const S = makeStore();
  const r = await openRoom(S, { reqonce: false });
  const w = await join(r, 'bp_rq_c');
  const C = r.playerState['bp_rq_c'];
  C.weaponStash = [axe(1), axe(2)];
  await route(r, w, 'POST', '/api/market/place', sellBody('bp_rq_c', 'rq-x'));
  await route(r, w, 'POST', '/api/market/place', sellBody('bp_rq_c', 'rq-x'));
  check('10: `reqonce: false`: a repeat acts twice, as before', C.weaponStash.length === 0, C.weaponStash.length);
  /* v2.3.6000 (card CS): `reqstamp` is ON by default (the owner, 2026-11-17:
     "I think turn all of them on then we monitor usage cost"); `reqstamp:
     false` turns it off */
  {
    const F = makeStore();
    const r3 = await openRoom(F, { reqstamp: false });
    const fs1 = await join(r3, 'bp_rq_fs'); const fs2 = await join(r3, 'bp_rq_ft');
    r3.playerState['bp_rq_fs'].weaponStash = [axe(4)];
    r3.playerState['bp_rq_ft'].coins = 1000;
    const L3 = await route(r3, fs1, 'POST', '/api/store/list', { playerId: 'bp_rq_fs', kind: 'weapon', stashIndex: 0, price: 100 });
    await route(r3, fs2, 'POST', '/api/store/buy', { listingId: L3.listing.id, playerId: 'bp_rq_ft', reqId: 'rq-buy-8' });
    check('10: `reqstamp: false`: no stamp row was written', !!L3.listing && ![...F.store.keys()].some((k) => k.startsWith(REQ_ONCE.STAMP)), [...F.store.keys()].filter((k) => k.startsWith(REQ_ONCE.STAMP)));
  }
  const T = makeStore();
  const r2 = await openRoom(T, {});   /* v2.3.6000: no flag, the default: on */
  const ws1 = await join(r2, 'bp_rq_s'); const ws2 = await join(r2, 'bp_rq_t');
  r2.playerState['bp_rq_s'].weaponStash = [axe(3)];
  r2.playerState['bp_rq_t'].coins = 1000;
  const L = await route(r2, ws1, 'POST', '/api/store/list', { playerId: 'bp_rq_s', kind: 'weapon', stashIndex: 0, price: 100 });
  await route(r2, ws2, 'POST', '/api/store/buy', { listingId: L.listing.id, playerId: 'bp_rq_t', reqId: 'rq-buy-9' });
  r2._reqSeen = new Map();
  const again = await route(r2, ws2, 'POST', '/api/store/buy', { listingId: L.listing.id, playerId: 'bp_rq_t', reqId: 'rq-buy-9' });
  check('10: `reqstamp` unset (on, the default since v2.3.6000): its row written, and a repeat the sitting forgot answers `repeat`', T.store.has(REQ_ONCE.STAMP + 'bp_rq_t:rq-buy-9') && again.ok === true && again.repeat === true && again.reqId === 'rq-buy-9', again);
}

/* ── 11. 5194b: a first that threw is kept, never run again ── */
{
  const S = makeStore();
  const r = await openRoom(S);
  const w = await join(r, 'bp_rq_th');
  const P = r.playerState['bp_rq_th'];
  P.weaponStash = [axe(1), axe(2)];
  const real = r._mktPlaceOrder.bind(r);
  let runs = 0;
  r._mktPlaceOrder = async (body, rid) => { runs++; await real(body, rid); throw new Error('cut after the sale was owed'); };
  const a = await route(r, w, 'POST', '/api/market/place', sellBody('bp_rq_th', 'rq-th-1'));
  const b = await route(r, w, 'POST', '/api/market/place', sellBody('bp_rq_th', 'rq-th-1'));
  check('11: a place that threw after acting: its re-send runs nothing again and answers `interrupted`', runs === 1 && P.weaponStash.length === 1 && a.ok === false && b.interrupted === true && b.reqId === 'rq-th-1', { runs, stash: P.weaponStash.length, a, b });
}

/* ── 12. 5194b: the store's bid and accept, the offer's reply and cancel ── */
{
  const S = makeStore();
  const r = await openRoom(S);
  const ws = await join(r, 'bp_rq_s1'); const wb = await join(r, 'bp_rq_b1'); const wc = await join(r, 'bp_rq_c1');
  const Sx = r.playerState['bp_rq_s1'], Bx = r.playerState['bp_rq_b1'], Cx = r.playerState['bp_rq_c1'];
  Sx.weaponStash = [axe(1), axe(2)]; Bx.coins = 2000; Cx.coins = 2000;
  const L = await route(r, ws, 'POST', '/api/store/list', { playerId: 'bp_rq_s1', kind: 'weapon', stashIndex: 0, price: 500 });
  const g0 = Bx.coins;
  const d1 = await route(r, wb, 'POST', '/api/store/bid', { listingId: L.listing.id, playerId: 'bp_rq_b1', amount: 100, reqId: 'rq-bid-1' });
  const d2 = await route(r, wb, 'POST', '/api/store/bid', { listingId: L.listing.id, playerId: 'bp_rq_b1', amount: 100, reqId: 'rq-bid-1' });
  check('12: a bid twice: its gold escrowed once, the same answer', d1.ok === d2.ok && Bx.coins >= g0 - 100 && Bx.coins <= g0 && JSON.stringify(d1.listing) === JSON.stringify(d2.listing) && d2.reqId === 'rq-bid-1', { d1, d2, coins: Bx.coins });
  const a1 = await route(r, ws, 'POST', '/api/store/accept', { listingId: L.listing.id, playerId: 'bp_rq_s1', reqId: 'rq-acc-1' });
  const a2 = await route(r, ws, 'POST', '/api/store/accept', { listingId: L.listing.id, playerId: 'bp_rq_s1', reqId: 'rq-acc-1' });
  check('12: an accept twice: the same answer again', JSON.stringify({ ...a1, reqId: 0 }) === JSON.stringify({ ...a2, reqId: 0 }) && a2.reqId === 'rq-acc-1', { a1, a2 });
  const L2 = await route(r, ws, 'POST', '/api/store/list', { playerId: 'bp_rq_s1', kind: 'weapon', stashIndex: 0, price: 500 });
  await msg(r, wc, 'store_offer', { listingId: L2.listing.id, gold: 60, reqId: 'rq-of-2' });
  const c0 = Cx.coins;
  wc.sent.length = 0;
  await msg(r, wc, 'store_offer_cancel', { listingId: L2.listing.id, reqId: 'rq-ofc-1' });
  await msg(r, wc, 'store_offer_cancel', { listingId: L2.listing.id, reqId: 'rq-ofc-1' });
  const oc = wc.sent.filter((m) => m.type === 'store_offer_state' || m.type === 'store_offer_error');
  check('12: an offer\'s cancel twice: refunded once, the first answer again', Cx.coins <= c0 + 60 && oc.length === 2 && JSON.stringify(oc[0].payload) === JSON.stringify(oc[1].payload), { c0, coins: Cx.coins, oc });
  await msg(r, wc, 'store_offer', { listingId: L2.listing.id, gold: 70, reqId: 'rq-of-3' });
  ws.sent.length = 0;
  await msg(r, ws, 'store_offer_reply', { listingId: L2.listing.id, buyerId: 'bp_rq_c1', reply: 'accept', reqId: 'rq-rep-1' });
  await msg(r, ws, 'store_offer_reply', { listingId: L2.listing.id, buyerId: 'bp_rq_c1', reply: 'accept', reqId: 'rq-rep-1' });
  const rp = ws.sent.filter((m) => m.type === 'store_offer_state' || m.type === 'store_offer_error');
  check('12: the seller\'s reply twice: the first answer again, echoed', rp.length === 2 && JSON.stringify(rp[0].payload) === JSON.stringify(rp[1].payload) && rp[1].payload.reqId === 'rq-rep-1', rp);
}

/* ── 13. 5194b: both ids across a deploy; the bank's answer keeps the phone's opId ── */
{
  const S = makeStore();
  const r = await openRoom(S);
  const w = await join(r, 'bp_rq_d1');
  const P = r.playerState['bp_rq_d1'];
  P.inventory = P.inventory || {}; P.inventory[CHEST.KEY] = 1;
  S.store.set('oplog:chestop:ck-old-1', Date.now());   /* an older worker stamped this open by the phone's opId */
  await msg(r, w, 'chest_open', { invKey: CHEST.KEY, opId: 'ck-old-1', reqId: 'rq-chest-9' });
  check('13: a chest re-sent with both ids after a deploy finds the old stamp: nothing opened', P.inventory[CHEST.KEY] === 1, P.inventory[CHEST.KEY]);
  r._bankPlaceOk = () => true; r._paceTake = () => true;
  P.coins = 100;
  await msg(r, w, 'bank_deposit', { kind: 'gold', n: 5, opId: 'bk-ph-1', reqId: 'rq-bk-9' });
  const last = w.sent.filter((m) => m.type === 'bank_state').pop();
  const lj = JSON.stringify(last || {});
  check('13: a bank move with both ids answers the phone\'s own opId, and echoes the request id', lj.includes('"opId":"bk-ph-1"') && lj.includes('"reqId":"rq-bk-9"'), last);
}

/* ── 14. 5194b: the cap, and the page's one re-send behind it ── */
{
  const S = makeStore();
  const r1 = await openRoom(S);
  const w1 = await join(r1, 'bp_rq_cap');
  const ss1 = w1.sent.find((m) => m.type === 'state_sync');
  const r2 = await openRoom(makeStore(), { reqonce: false });
  const w2 = await join(r2, 'bp_rq_cap2');
  const ss2 = w2.sent.find((m) => m.type === 'state_sync');
  check('14: caps.reqid says the worker answers once; `reqonce: false` takes it away', ss1 && ss1.caps && ss1.caps.reqid === 1 && ss2 && ss2.caps && ss2.caps.reqid === undefined, { a: ss1 && ss1.caps && ss1.caps.reqid, b: ss2 && ss2.caps && ss2.caps.reqid });
  const { act, setActionTransport, RESEND_MS } = await import('../../src/game/actions.js');
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (f) => realTimeout(f, 0);
  const tryOnce = async (capOn, fails, name, body) => {
    const seen = [];
    let n = 0;
    setActionTransport({ send: () => true, token: () => 't', reqOnce: () => capOn,
      http: async (path, init) => { seen.push(JSON.parse(init.body).reqId); n++; if (n <= fails) throw new Error('no answer'); return { status: 200, json: async () => ({ ok: true }) }; } });
    let out = null;
    try { out = await act(name || 'http:/api/store/buy', body || { listingId: 'x', playerId: 'bp_rq_cap' }); } catch (e) { out = 'threw'; }
    return { seen, out };
  };
  const on = await tryOnce(true, 1);
  const off = await tryOnce(false, 1);
  const twice = await tryOnce(true, 2);
  const place = await tryOnce(true, 1, 'http:/api/market/place', { type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: 'bp_rq_cap', stashIndex: 0 });
  const arena = await tryOnce(true, 1, 'http:/api/arena/join', { playerId: 'bp_rq_cap' });
  globalThis.setTimeout = realTimeout;
  setActionTransport(null);
  check('14: with the cap, a request heard nothing from is sent once more with the SAME id', on.seen.length === 2 && on.seen[0] === on.seen[1] && on.out && on.out.status === 200 && RESEND_MS > 0, on);
  check('14: without it, one try, as before', off.seen.length === 1 && off.out === 'threw', off);
  check('14: ...and only once more, never a third', twice.seen.length === 2 && twice.out === 'threw', twice);
  check('14: (sitting 27) never the market\'s place, whose at-once match leaves no record a restart could find, nor the arena\'s join', place.seen.length === 1 && place.out === 'threw' && arena.seen.length <= 1, { place, arena });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
