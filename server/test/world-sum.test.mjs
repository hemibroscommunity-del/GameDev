/* ═══ v2.3.5084: THE WORLD'S SUM (grand plan step 4.4, card E PR 5) ═══
 *
 * "A purse equals its start plus the roads that ran" is true by
 * construction, and past copies went through LEGAL roads (one stack of ore
 * sold 24 times in one bundle).  So the whole world is summed, one kind of
 * value at a time (docs/SHAPES.md part 3, "What is summed"):
 *
 *     everything held  ==  the start  +  minted  -  burned
 *
 * "Held" is every record the registry's marks say holds value
 * (server/src/storagemarks.js): purses and bags (a character live in the
 * room, or stored while away), vaults, mail waiting, every escrow, Diego's
 * pile, the piles on the ground.  "Minted" and "burned" are each character's
 * own `_econ` (rule 1's second exception, written in the purse's own put by
 * the two doors: gold.js, bag.js), what the bag door counted beside a bag no
 * save has named yet, and the minted part of mail still waiting (its class by
 * its opId: gold.js MAIL_CLASSES).  `unexplained` is how far the two sides
 * have moved apart since the start: it must stay 0.
 *
 *   1. THE SCENARIO: a room plays the bank, the gamble, Diego's pile, the
 *      trade window, a death and its pile, the mail (a grant waiting, a
 *      daily quest landing, a duel's pot) -- through the real handlers.
 *      Unexplained gold 0, every bag key 0; no gear or pet held twice.
 *   2. A PLANTED DOUBLE PAY THROUGH A LEGAL ROAD is seen: a vault paid out
 *      with no vault behind it, a pile's goods given with no pile, a
 *      duel's pot paid twice by the mail, a trade's gold taken with no
 *      other side.
 *   3. A VALUE RECORD THE MARKS DO NOT COUNT is seen: a stored key with no
 *      marks, and a marked value prefix the sum has no reader for.
 *   4. The three lines outside card E's own files the sum needed (the
 *      owner's yes, 2026-11-14): the join brings `_econ` back before any
 *      door runs, a red skull killed by a monster BURNS its purse
 *      (nml_lost), and the champion's prize says the house's part.
 *   5. v2.3.5085: A MAILBOX MERGED AT 200 counts each merged payout by its
 *      own class (inbox.js keeps the minted part beside the entry).
 *
 *   6. v2.3.6460 (card BK PR 1): THE SUM PLAYS WHAT IT SUMS.  §1 now plays
 *      the General Store, the Auction House (goods, a weapon, a piece of
 *      armour; an offer raised, a bid, a cancel), the jackpot and its draw, a
 *      duel through duel.js and the arena through gladiator.js (both were
 *      made by hand here), goods dropped and taken back, a weapon staged in
 *      the trade window, the old gift trade, weapons, armour and shields worn
 *      and taken off, and No man's land's player kill -- through the real
 *      handlers.  The suite writes down every road the handlers ran (the
 *      roads that ran, below the imports), and fails a `move` or `escrow`
 *      road that never ran and is not on UNPLAYED, a list that only falls.
 *
 * BREAK PROOF (rule 8), tried by hand: `WORLD_SUM_PLANT=1 node
 * test/world-sum.test.mjs` plants §2's vault double pay INTO §1's world,
 * and §1 fails ("unexplained gold 50").  v2.3.6460: the review's plants 2 and
 * 3 (docs/plan/census/shape-books.md: the Auction House's listing taking one
 * less, store.js `bagTake(..., qty - 1, 'ah_listing')`; the General Store's
 * order one gold less, market.js `_goldTake(ps, p - 1, 'market_order')`)
 * were green here and are red: "slime_gel 1" and "unexplained gold 3".  A new
 * escrow row in GOLD_ROADS that nothing plays fails "the roads".
 */
import { register } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
/* ═══ v2.3.6460 (card BK PR 1): THE ROADS THAT RAN ═══
 * Before the worker loads, a module hook stands a thin twin in front of the
 * bag's and the stashes' doors (bag.js, stash.js: every importer, the
 * worker's own files too, is handed the twin); each of their verbs calls the
 * real one, then writes down the road it named.  The gold door is the room's
 * own method, wrapped on the room (world() below).  No file of the worker
 * changes.  A road is written down only when it ran INSIDE a real handler
 * (a message to the room, or one of the room's own handlers called as the
 * game calls it: `played(...)`), with everything that handler started after
 * it (an await, a timer): a door the test calls by hand is not a road the
 * scenario played. */
const handling = new AsyncLocalStorage();
const RAN = { gold: new Set(), bag: new Set(), stash: new Set() };
globalThis.__roadsRan = (kind, road) => { if (handling.getStore()) RAN[kind].add(road); };
const played = (fn) => handling.run(true, fn);
register('data:text/javascript,' + encodeURIComponent(`
const VERBS = { bag: ['bagGive', 'bagTake', 'bagSet'], stash: ['stashGive', 'stashTake', 'stashSet'] };
export async function resolve(spec, ctx, next) {
  const r = await next(spec, ctx);
  const m = /\\/server\\/src\\/(bag|stash)\\.js$/.exec(r.url);
  if (!m) return r;
  const real = JSON.stringify(r.url + '?door');
  const src = 'import * as D from ' + real + '; export * from ' + real + ';\\n'
    + VERBS[m[1]].map((f) => 'export function ' + f + '(...a) { const v = D.' + f + '(...a); globalThis.__roadsRan(' + JSON.stringify(m[1]) + ', a[3]); return v; }').join('\\n');
  return { url: 'data:text/javascript,' + encodeURIComponent(src), format: 'module', shortCircuit: true };
}`));
const { GameRoom } = await import('../src/index.js');
const { STORAGE_MARKS } = await import('../src/storagemarks.js');
const { bagGive, BAG_ROADS } = await import('../src/bag.js');
const { BANK } = await import('../src/bank.js');
const { GOLD_ROADS } = await import('../src/gold.js');
const { STASH_ROADS } = await import('../src/stash.js');
/* v2.3.5091: the sum moved out whole (the storm judges with it too); v2.3.5093: into the worker (src/worldsum.js), the live walk's one sum */
const { READERS, count, unexplained } = await import('../src/worldsum.js');
/* v2.3.6464: the pieces the sum holds by id (a piece of gear, a weapon, a
   pet), read off the sum's own ctx by wrapping each reader (worldsum.js is
   not this suite's): unexplained() weighs gold and bag keys, not pieces */
/* v2.3.6465 (card BK, sitting 57's review of #2289): the IDS, not their
   count.  A count passed a piece lost and another made in the same step
   (the equip swap's weapon put back with its id dropped, gear.js
   `stashSet(..., Object.assign({}, activeItem, { gid: undefined }), 'equip_swap')`:
   a new id minted for it, the count the same, all 70 checks green).  So the
   ids held are a set ('gear:<gid>', 'pet:<id>'), and a step is judged by
   what left it and what came into it. */
const piecesHeld = (room, state) => {
  let ctx = null;
  const readers = Object.fromEntries(Object.entries(READERS).map(([p, f]) => [p, (c, k, v) => { ctx = c; return f(c, k, v); }]));
  count(room, state, readers);
  return new Set(ctx ? ctx.ids.map(([kind, id]) => kind + ':' + id) : []);
};
/* the room: the gold door's three verbs write down their road; a message to
   it is a handler (and so is its alarm) */
function ranRoom(room) {
  for (const f of ['_goldGive', '_goldTake', '_goldSet']) {
    const door = room[f];
    room[f] = function (rec, n, road, ...rest) { const v = door.call(this, rec, n, road, ...rest); globalThis.__roadsRan('gold', road); return v; };
  }
  for (const f of ['webSocketMessage', 'fetch', 'alarm']) {
    const h = room[f];
    if (typeof h === 'function') room[f] = function (...a) { return played(() => h.apply(this, a)); };
  }
  return room;
}

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;
let seed = 7;
const realRandom = Math.random;
Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

/* storage as a Durable Object's: a copy of what is put, listed in key order */
function makeState() {
  const store = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    _store: store,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (store.has(x)) r.set(x, clone(store.get(x))); return r; }
        return clone(store.get(k));
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; }
        store.set(k, clone(v));
      },
      async delete(k) { if (Array.isArray(k)) { let n = 0; for (const x of k) if (store.delete(x)) n++; return n; } return store.delete(k); },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.startAfter) keys = keys.filter((k) => k > o.startAfter);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
const settle = () => new Promise((r) => setTimeout(r, 5));

/* ══════════════════════════ THE ROOM ══════════════════════════ */
async function world() {
  const state = makeState();
  /* the characters, on file before anyone joins (a test seeds a character
     by putting its record first: CLAUDE.md §5); D stays away */
  const rec = (coins, inventory, econ) => ({ _v: 21, coins, inventory, level: 5, hp: 100, maxHp: 100, _econ: econ || { v: 1, g: { m: 0, b: 0 }, i: {} } });
  /* v2.3.5085 (the gatekeeper's sitting 8): A comes with counts on file, so
     the join's line (join.js: `_econ` back before any door runs) is held --
     with every seeded count 0, deleting it changed nothing here */
  state._store.set('rpg:bp_ws_a', { ...rec(1000, { wood_oak: 10, fish_minnow: 20, 'slime-remnants': 10, slime_gel: 12 }, { v: 1, g: { m: 500, b: 120 }, i: { wood_oak: { m: 3, b: 1 } } }),
    /* v2.3.6460: weapons to sell, list, stage and wear (the join gives each its id) */
    weaponStash: [0, 1, 2, 3, 4].map((i) => ({ name: 'Axe ' + i, type: 'axe', tierMult: 1, dmg: 5 })) });
  state._store.set('rpg:bp_ws_b', rec(800, { ore_iron_ore: 6 }));
  state._store.set('rpg:bp_ws_d', rec(50, {}));
  const room = ranRoom(new GameRoom(state, mockEnv));
  room._liveFlags = {};
  const ws = {};
  for (const n of ['a', 'b']) {
    ws[n] = fakeWs();
    room.sessions.set(ws[n], { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws[n], JSON.stringify({ type: 'join', id: 'bp_ws_' + n, name: n.toUpperCase(), phrase: 'p-' + n, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    await settle();
  }
  await room._shopStock();   /* Diego's pile seeds itself once, the first time it is read: before the start */
  await settle();
  return { room, state, ws, A: room.playerState.bp_ws_a, B: room.playerState.bp_ws_b };
}
/* v2.3.6460: a fallen player stands up again by the room's own respawn (the tick's), the clock past its time */
const respawn = (room, ps) => { if (ps.dying) { NOW = Math.max(NOW, (ps.respawnAt || 0) + 1); played(() => room._tickPlayerRespawn()); } };
const send = async (room, w, type, payload) => { await room.webSocketMessage(w, JSON.stringify({ type, payload: payload || {} })); await settle(); };

/* ══════════════════════════ 1. THE SCENARIO ══════════════════════════ */
let PLAYED = null;
{
  const { room, state, ws, A, B } = await world();
  check('1. the room holds A and B, D is away', !!A && !!B && !room.playerState.bp_ws_d && A.coins === 1000);
  const start = count(room, state);
  check('1. at the start, every record is marked and every marked value record has a reader', start.unmarked.length === 0 && start.noReader.length === 0, { unmarked: start.unmarked, noReader: start.noReader });
  for (const k of Object.keys(RAN)) RAN[k].clear();
  const steps = [];
  /* v2.3.6464 (sitting 56's Found on #2278: a weapon lost on an equip swap
     stayed green, the sum counting no pieces): each step says how many
     pieces it MADE (a grant); any other change in the pieces held fails */
  const pieceSteps = [];
  let piecesThen = piecesHeld(room, state);
  /* v2.3.6465: by id -- no id may leave in a step, and exactly `made` new
     ones may come (a lost one and a new one no longer cancel) */
  const note = (what, made = 0) => {
    const u = unexplained(start, count(room, state)); steps.push([what, u.gold, Object.keys(u.goods).length ? u.goods : 0]);
    const p = piecesHeld(room, state);
    const lost = [...piecesThen].filter((id) => !p.has(id)), came = [...p].filter((id) => !piecesThen.has(id));
    if (lost.length || came.length !== made) pieceSteps.push([what, { lost, came, made }]);
    piecesThen = p;
  };

  /* the bank: gold and goods in and out (escrow) */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    A.z = 'wheel'; A.x = c[0] + BANK.DOOR[0] + 40; A.y = c[1] + BANK.DOOR[1] + 150; A.dead = false; A.dying = false;
    await send(room, ws.a, 'bank_open');
    await send(room, ws.a, 'bank_deposit', { kind: 'gold', n: 300, opId: 'ws-1' });
    await send(room, ws.a, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 4, opId: 'ws-2' });
    await send(room, ws.a, 'bank_withdraw', { kind: 'gold', n: 120, opId: 'ws-3' });
    await send(room, ws.a, 'bank_withdraw', { kind: 'item', id: 'wood_oak', n: 1, opId: 'ws-4' });
    check('1. the bank moved gold and goods (a vault on file)', A.coins === 820 && A.inventory.wood_oak === 7 && !!state._store.get('bank:bp_ws_a'), { coins: A.coins, wood: A.inventory.wood_oak });
    note('bank');
  }
  /* the gamble: a win (mint) and a loss (burn) */
  {
    Math.random = () => 0.0; await send(room, ws.a, 'gamble_request', { wager: 100 });
    A._lastGambleAt = 0;
    Math.random = () => 0.99; await send(room, ws.a, 'gamble_request', { wager: 50 });
    Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    check('1. the gamble won 100 and lost 50', A.coins === 870, A.coins);
    note('gamble');
  }
  /* Diego: A sells into his pile, B buys from it (goods in escrow, gold minted and burned) */
  {
    await send(room, ws.a, 'shop_sell', { key: 'slime-remnants', qty: 10 });
    await send(room, ws.b, 'shop_buy', { key: 'slime-remnants', qty: 2 });
    check('1. A sold 10 to Diego, B bought 2 from his pile', !A.inventory['slime-remnants'] && B.inventory['slime-remnants'] === 2, { a: A.inventory['slime-remnants'], b: B.inventory['slime-remnants'] });
    note('shop');
  }
  /* the trade window: gold and goods both ways (moves, by the mail) */
  {
    for (const p of [A, B]) { p.z = 'town'; p.x = 0; p.y = 0; }
    const a0 = A.coins, b0 = B.coins;
    await send(room, ws.a, 'trade2_open', { target: 'bp_ws_b' });
    await send(room, ws.b, 'trade2_open', { target: 'bp_ws_a' });
    await send(room, ws.a, 'trade2_set', { offer: { fish_minnow: 5, _gold: 200 } });
    await send(room, ws.b, 'trade2_set', { offer: { ore_iron_ore: 2 } });
    await send(room, ws.a, 'trade2_ready', { ready: true });
    await send(room, ws.b, 'trade2_ready', { ready: true });
    for (const s2 of (room._trades2 || new Map()).values()) s2.changedAt = Date.now() - 999999;
    await send(room, ws.a, 'trade2_confirm');
    await send(room, ws.b, 'trade2_confirm');
    check('1. the trade settled: 200 gold and 5 fish to B, 2 ore to A', B.inventory.fish_minnow === 5 && A.inventory.ore_iron_ore === 2 && A.coins === a0 - 200 && B.coins === b0 + 200, { a: A.coins - a0, b: B.coins - b0, fish: B.inventory.fish_minnow, ore: A.inventory.ore_iron_ore });
    note('trade');
  }
  /* v2.3.6460 (card BK PR 1): THE GENERAL STORE, through its own route
     (market.js, /api/market/place and /cancel): A's weapon offered (held in
     its order), B's buy order crossing it (B's gold held, then paid on);
     a second buy order resting, then cancelled (its gold back by the mail);
     a storage that refuses the order's put hands the gold and the weapon
     straight back (market_unwind, market_back) */
  {
    const route = (method, path, body, query) => room.fetch(new Request('https://x' + path + (query ? '?' + query : ''),
      { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })).then((r) => r.json());
    const order = (pid, type, price, extra) => ({ type, category: 'weapon', subtype: 'axe', tierKey: 'mythic', price, playerId: pid, ...(extra || {}) });
    const a0 = A.coins, b0 = B.coins, w0 = A.weaponStash.length;
    const sold = await route('POST', '/api/market/place', order('bp_ws_a', 'sell', 300, { stashIndex: 0 }));
    const bought = await route('POST', '/api/market/place', order('bp_ws_b', 'buy', 320));
    await settle();
    check('1. the General Store: A\'s axe offered at 300, B\'s order at 320 crossed it (B paid 300, A got 300, the axe is B\'s)',
      sold.ok !== false && bought.matched === true && A.coins === a0 + 300 && B.coins === b0 - 300 && A.weaponStash.length === w0 - 1 && (B.weaponStash || []).length === 1,
      { sold, bought, a: A.coins - a0, b: B.coins - b0, wa: A.weaponStash.length, wb: (B.weaponStash || []).length });
    note('market crossed');
    const rest = await route('POST', '/api/market/place', order('bp_ws_b', 'buy', 90));
    const id = rest && (rest.order && rest.order.id || rest.id);
    check('1. ...a buy order of 90 rests, its gold held', !!id && B.coins === b0 - 390, rest);
    note('market order resting');
    await route('DELETE', '/api/market/cancel', null, 'id=' + id + '&playerId=bp_ws_b');
    await settle();
    check('1. ...and cancelled: its 90 back', B.coins === b0 - 300, B.coins - b0);
    note('market order cancelled');
    const realPut = state.storage.put;
    state.storage.put = async (k, v) => { if (typeof k === 'string' && k.startsWith('mkt_order:')) throw new Error('storage full'); return realPut.call(state.storage, k, v); };
    await route('POST', '/api/market/place', order('bp_ws_b', 'buy', 70));
    await route('POST', '/api/market/place', order('bp_ws_a', 'sell', 500, { stashIndex: 0 }));
    state.storage.put = realPut;
    await settle();
    check('1. ...a storage that refuses the order: the gold and the weapon handed straight back', B.coins === b0 - 300 && A.weaponStash.length === w0 - 1, { b: B.coins - b0, wa: A.weaponStash.length });
    note('market unwound');
  }
  /* v2.3.6460: THE AUCTION HOUSE, through its own routes and messages
     (store.js, storeoffer.js): goods listed (held in the listing) and bought
     (the gold held, then paid on); a weapon listed; an offer made, raised (the
     first one handed back in the same write) and taken; a bid, then the
     listing cancelled (the goods and the bid back) */
  {
    const route = (method, path, body, query) => room.fetch(new Request('https://x' + path + (query ? '?' + query : ''),
      { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })).then((r) => r.json());
    const a0 = A.coins, b0 = B.coins;
    const l1 = await route('POST', '/api/store/list', { playerId: 'bp_ws_a', kind: 'item', invKey: 'slime_gel', qty: 4, price: 50 });
    check('1. the Auction House: A listed 4 gel (held in the listing)', !!(l1 && l1.listing) && A.inventory.slime_gel === 8, { l1, gel: A.inventory.slime_gel });
    note('ah listed');
    const b1 = await route('POST', '/api/store/buy', { listingId: l1.listing.id, playerId: 'bp_ws_b' });
    await settle();
    check('1. ...B bought it: the gel is B\'s, 50 moved', !!(b1 && b1.bought) && B.inventory.slime_gel === 4 && B.coins === b0 - 50, { b1, gel: B.inventory.slime_gel, b: B.coins - b0 });
    note('ah bought');
    const l2 = await route('POST', '/api/store/list', { playerId: 'bp_ws_a', kind: 'weapon', stashIndex: 0, price: 100 });
    check('1. ...A listed a weapon', !!(l2 && l2.listing), l2);
    note('ah weapon listed');
    room._soBuckets = null;
    await send(room, ws.b, 'store_offer', { listingId: l2.listing.id, gold: 40 });
    room._soBuckets = null;
    await send(room, ws.b, 'store_offer', { listingId: l2.listing.id, gold: 60 });
    check('1. ...B offered 40, then raised to 60 (60 held)', B.coins === b0 - 50 - 60, B.coins - b0);
    note('ah offer raised');
    await send(room, ws.a, 'store_offer_reply', { listingId: l2.listing.id, buyerId: 'bp_ws_b', reply: 'yes' });
    await settle();
    check('1. ...and A took it: the weapon is B\'s, A has the 60 (and the gel\'s 50)', (B.weaponStash || []).length === 2 && A.coins === a0 + 50 + 60, { wb: (B.weaponStash || []).length, a: A.coins - a0 });
    note('ah offer taken');
    const l3 = await route('POST', '/api/store/list', { playerId: 'bp_ws_a', kind: 'item', invKey: 'slime_gel', qty: 3, price: 200 });
    const bid = await route('POST', '/api/store/bid', { listingId: l3.listing.id, playerId: 'bp_ws_b', amount: 90 });
    note('ah bid');
    await route('DELETE', '/api/store/cancel', null, 'id=' + l3.listing.id + '&playerId=bp_ws_a');
    await settle();
    check('1. ...a bid of 90, then the listing cancelled: the gel and the bid back', !!bid && A.inventory.slime_gel === 8 && B.coins === b0 - 110, { bid, gel: A.inventory.slime_gel, b: B.coins - b0 });
    note('ah cancelled');
  }
  /* the mail: a grant to D, who is away (a mint waiting), D comes in and it
     lands; a daily quest's gold lands on B at once (a mint); a duel's pot,
     its escrow on file, lands on A (an escrow paid on) */
  {
    await room._creditPlayer('bp_ws_d', { opId: 'admin:g1', source: 'admin', kind: 'gold', payload: { amount: 75 }, note: 'grant' });
    check('1. a grant to D, away, waits in the mail', Array.isArray(state._store.get('inbox:bp_ws_d')) && state._store.get('inbox:bp_ws_d').length === 1);
    note('grant waiting');
    ws.d = fakeWs();
    room.sessions.set(ws.d, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws.d, JSON.stringify({ type: 'join', id: 'bp_ws_d', name: 'D', phrase: 'p-d', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    await settle();
    check('1. D comes in and the grant lands', room.playerState.bp_ws_d && room.playerState.bp_ws_d.coins === 125, room.playerState.bp_ws_d && room.playerState.bp_ws_d.coins);
    note('grant landed');
    await room._creditPlayer('bp_ws_b', { opId: 'dq:bp_ws_b:20270115:0', source: 'daily', kind: 'gold', payload: { amount: 40 }, note: 'a daily quest' });
    note('daily quest');
    /* goods by the mail: a quest's item, the bag full (a mint) */
    await room._creditPlayer('bp_ws_b', { opId: 'questitem:bp_ws_b:q1:fish_minnow#1', source: 'quest', kind: 'item', payload: { invKey: 'fish_minnow', count: 3 }, note: 'a quest item' });
    note('quest item by the mail');
  }
  /* v2.3.6460 (card BK PR 1): A DUEL, through duel.js (it was made by hand
     here): B challenges with a stake of 30, A accepts (both stakes into its
     escrow in one run), B falls, the pot lands on A */
  {
    for (const p of [A, B]) { p.z = 'town'; p.x = 0; p.y = 0; p.dead = false; p.dying = false; p.hp = p.maxHp || 100; }
    const a0 = A.coins, b0 = B.coins;
    await send(room, ws.b, 'duel_wager_request', { target: 'bp_ws_a', wager: 30 });
    await send(room, ws.a, 'duel_accept', { target: 'bp_ws_b', wager: 30 });
    const duel = room._duelFor && room._duelFor('bp_ws_a');
    check('1. a duel: both stakes went into its escrow together (duel.js)', !!duel && A.coins === a0 - 30 && B.coins === b0 - 30 && [...state._store.keys()].some((k) => k.startsWith('duelEscrow:')), { duel: !!duel, a: A.coins - a0, b: B.coins - b0 });
    note('duel staked');
    B.hp = 0;
    played(() => room._handlePlayerDeath(B, 'bp_ws_b', 'pvp:bp_ws_a'));
    await new Promise((r) => setTimeout(r, 25));
    check('1. ...B fell: the pot (60) is A\'s, the escrow gone', A.coins === a0 + 30 && ![...state._store.keys()].some((k) => k.startsWith('duelEscrow:')), { a: A.coins - a0 });
    note('duel pot');
    respawn(room, B);
  }
  /* v2.3.6460: THE ARENA, through gladiator.js (its entries were made by
     hand here): A and B enter by the route (each entry held), D, watching,
     backs A (the stake held), B falls, the champion's prize (the entries and
     the house's part, one payout) and the stake settle */
  {
    const D = room.playerState.bp_ws_d;
    for (const p of [A, B, D]) { p.z = 'town'; p.x = 0; p.y = 0; p.dead = false; p.dying = false; p.hp = p.maxHp || 100; }
    room._arenaHouse = { hour: 0, used: 0 };
    const join = (pid, name) => room.fetch(new Request('https://x/api/arena/join', { method: 'POST', body: JSON.stringify({ playerId: pid, playerName: name }) })).then((r) => r.json());
    const a0 = A.coins, d0 = D.coins;
    const ja = await join('bp_ws_a', 'A'), jb = await join('bp_ws_b', 'B');
    check('1. the arena: A and B entered, each entry held', !!(ja && ja.ok !== false && jb && jb.ok !== false) && A.coins === a0 - 100 && [...state._store.keys()].filter((k) => k.startsWith('arena_entry:')).length === 2, { ja, jb });
    note('arena entries');
    room._arena.gatherDeadline = NOW - 1;
    played(() => room._arenaLazyTick(NOW));
    await new Promise((r) => setTimeout(r, 25));
    await send(room, ws.d, 'arena_sponsor', { targetId: 'bp_ws_a', amount: 100 });
    check('1. ...D backed A with 100 (held)', D.coins === d0 - 100 && [...state._store.keys()].some((k) => k.startsWith('arena_stake:')), { d: D.coins - d0, sent: ws.d.sent.filter((m) => /arena_stake/.test(m.type)).slice(-1) });
    note('arena stake');
    B.hp = 0;
    played(() => room._handlePlayerDeath(B, 'bp_ws_b', 'pvp:bp_ws_a'));
    await new Promise((r) => setTimeout(r, 30));
    check('1. ...B fell: A the champion, paid; the entries and the stake settled', A.coins > a0 && ![...state._store.keys()].some((k) => k.startsWith('arena_entry:') || k.startsWith('arena_stake:')), { a: A.coins - a0, d: D.coins - d0, left: [...state._store.keys()].filter((k) => /^arena_/.test(k)) });
    note('arena prize');
    respawn(room, B);
    room._arena = null; room._arenaClearAt = 0;
  }
  /* v2.3.6460 (card BK PR 1): goods dropped on the ground (itemdrop.js: a
     pile of the dropper's own) and taken back; a weapon staged in the trade
     window (held in it) and traded; a weapon worn and put away (the stashes'
     moves within one player); the old gift trade, opened by its switch */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    for (const p of [A, B]) { p.z = 'wheel'; p.x = c[0]; p.y = c[1] + 288; p.dead = false; p.dying = false; }
    const w0 = A.inventory.wood_oak;
    A._dropAt = 0;
    await room.webSocketMessage(ws.a, JSON.stringify({ type: 'item_drop', key: 'wood_oak', qty: 2 }));
    await settle();
    const r = ws.a.sent.filter((m) => m.type === 'item_drop_result').pop();
    const lootId = r && (r.lootId || (r.payload && r.payload.lootId));
    check('1. A dropped 2 oak on the ground (a pile of A\'s own)', !!lootId && A.inventory.wood_oak === w0 - 2, { r, wood: A.inventory.wood_oak });
    note('item dropped');
    await send(room, ws.a, 'loot_pickup', { lootId, zone: 'wheel' });
    check('1. ...and took it back', A.inventory.wood_oak === w0, A.inventory.wood_oak);
    note('item taken back');
    for (const p of [A, B]) { p.z = 'town'; p.x = 0; p.y = 0; }
    const wa = A.weaponStash.length, wb = (B.weaponStash || []).length;
    room._paceTake = () => true;
    await send(room, ws.a, 'trade2_open', { target: 'bp_ws_b' });
    await send(room, ws.b, 'trade2_open', { target: 'bp_ws_a' });
    await send(room, ws.a, 'trade2_stage_weapon', { stashIdx: 0 });
    check('1. the trade window: A staged a weapon (held in the window)', A.weaponStash.length === wa - 1 && [...state._store.keys()].some((k) => k.startsWith('trade2wpn:')), A.weaponStash.length);
    note('weapon staged');
    await send(room, ws.a, 'trade2_ready', { ready: true });
    await send(room, ws.b, 'trade2_ready', { ready: true });
    for (const s2 of (room._trades2 || new Map()).values()) s2.changedAt = Date.now() - 999999;
    await send(room, ws.a, 'trade2_confirm');
    await send(room, ws.b, 'trade2_confirm');
    check('1. ...and traded: the weapon is B\'s', (B.weaponStash || []).length === wb + 1 && ![...state._store.keys()].some((k) => k.startsWith('trade2wpn:')), { wb: (B.weaponStash || []).length, last: ws.a.sent.filter((m) => m.type === 'trade2_state').slice(-1).map((m) => m.payload.reason || m.payload.state) });
    note('weapon traded');
    delete A.prog3;
    await send(room, ws.a, 'equip_request', { stashIdx: 0, slot: 'weapon' });
    const worn = A.weapon && A.weapon.gid;
    await send(room, ws.a, 'unequip_request', { slot: 'weapon' });
    check('1. A wore a weapon and put it away again', !!worn && A.weaponStash.some((w) => w && w.gid === worn), { worn, stash: A.weaponStash.map((w) => w && w.gid) });
    note('weapon worn and put away');
    room._liveFlags.giftclosed = false;
    const a0 = A.coins, b0 = B.coins, f0 = B.inventory.wood_oak || 0;
    await send(room, ws.a, 'trade_offer', { target: 'bp_ws_b', fromName: 'A', offer: { _gold: 30, wood_oak: 1 } });
    await send(room, ws.b, 'trade_accept', { target: 'bp_ws_a' });
    delete room._liveFlags.giftclosed;
    check('1. the old gift trade: 30 gold and an oak from A to B', A.coins === a0 - 30 && B.coins === b0 + 30 && (B.inventory.wood_oak || 0) === f0 + 1, { a: A.coins - a0, b: B.coins - b0, wood: (B.inventory.wood_oak || 0) - f0 });
    note('gift trade');
  }
  /* v2.3.6460: GEAR, worn and taken off and sold.  Two weapons in turn in
     the hand (the second swapped for the first); two armour pieces put on in
     turn and taken off; a shield on and off; a piece listed at the Auction
     House (held in the listing) and bought (by the mail).  The pieces come as
     the game's own grants do (the owner's kit: devtools.js), so each carries
     its receipt */
  {
    delete A.prog3;
    await send(room, ws.a, 'equip_request', { stashIdx: 0, slot: 'weapon' });
    const first = A.weapon && A.weapon.gid;
    await send(room, ws.a, 'equip_request', { stashIdx: 0, slot: 'weapon' });
    const second = A.weapon && A.weapon.gid;
    await send(room, ws.a, 'unequip_request', { slot: 'weapon' });
    check('1. A took a second weapon up in place of the first, then put it away', !!first && !!second && first !== second && !A.weapon, { first, second, hand: A.weapon && A.weapon.gid });
    note('weapons swapped');
    const pieces = [1, 2].map((i) => room._gearProvRecord('bp_ws_a', 'armor', { name: 'Iron Torso ' + i, gearBase: 'iron', mat: 'iron', tierMult: 2.0 }, 'test'));
    for (const pc of pieces) A.armorStash = [...(A.armorStash || []), { ...pc }];
    await send(room, ws.a, 'stats_update', { armorRef: pieces[0].gid });
    await send(room, ws.a, 'stats_update', { armorRef: pieces[1].gid });
    const wore = A.armor && A.armor.gid;
    await send(room, ws.a, 'unequip_request', { slot: 'armor' });
    check('1. A put on one torso, then the other, then took it off', wore === pieces[1].gid && !(A.armor && A.armor.gid), { wore, now: A.armor });
    note('armour worn', pieces.length);   /* v2.3.6464: the two torsos made above */
    /* a granted shield goes on the arm when the arm is empty (quests.js) */
    const grant = () => { played(() => room._grantQuestItem(A, { kind: 'shield', gearBase: 'wood', tierMult: 1.0, name: 'Pine Shield' }, 'bp_ws_a')); return A.shield && A.shield.gid; };
    const sh = grant();
    await send(room, ws.a, 'shield_wear', { none: true });
    const off = !(A.shield && A.shield.gid);
    const other = grant();
    await send(room, ws.a, 'shield_wear', { gid: sh });
    const swapped = A.shield && A.shield.gid;
    await send(room, ws.a, 'shield_wear', { none: true });
    check('1. A took a shield off, was given another, swapped back to the first, and took it off', !!sh && off && !!other && other !== sh && swapped === sh && !(A.shield && A.shield.gid), { sh, off, other, swapped });
    note('shield worn', 2);   /* v2.3.6464: the two shields granted (grant()) */
    const route = (method, path, body) => room.fetch(new Request('https://x' + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).then((r) => r.json());
    const lg = await route('POST', '/api/store/list', { playerId: 'bp_ws_a', kind: 'gear', field: 'armorStash', gid: pieces[0].gid, price: 250 });
    check('1. A listed a torso at the Auction House (held in the listing)', !!(lg && lg.listing) && !(A.armorStash || []).some((x) => x && x.gid === pieces[0].gid), lg);
    note('gear listed');
    const bg = await route('POST', '/api/store/buy', { listingId: lg.listing.id, playerId: 'bp_ws_b' });
    await settle();
    check('1. ...B bought it (by the mail)', !!(bg && bg.bought) && (B.armorStash || []).some((x) => x && x.gid === pieces[0].gid), { bg, b: (B.armorStash || []).map((x) => x && x.gid) });
    note('gear bought');
  }
  /* v2.3.6460: THE JACKPOT (cadence.js): A and B buy tickets (the pool held
     in its draw), and the week after, the next ticket draws the old pool
     (the winner paid by the mail) */
  {
    const a0 = A.coins, b0 = B.coins;
    await send(room, ws.a, 'jackpot_deposit', { amount: 100 });
    await send(room, ws.b, 'jackpot_deposit', { amount: 50 });
    const d1 = state._store.get('jackpot:draw');
    check('1. the jackpot: A and B bought tickets, the pool holds 150', !!d1 && d1.pool === 150 && A.coins === a0 - 100 && B.coins === b0 - 50, d1);
    note('jackpot tickets');
    NOW += 8 * 24 * 3600 * 1000;
    await send(room, ws.a, 'jackpot_deposit', { amount: 50 });
    const d2 = state._store.get('jackpot:draw');
    check('1. ...a week on, the old pool drawn (paid to its winner), the new pool 50', !!d2 && d2.pool === 50 && (A.coins + B.coins) === a0 + b0 - 50, { d2, a: A.coins - a0, b: B.coins - b0 });
    note('jackpot drawn');
  }
  /* a death outside town: the bag to the pile on the ground (escrow), B takes it (escrow) */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    A.z = 'wheel'; A.x = c[0] + 4000; A.y = c[1] + 4000;
    NOW += 60000;
    played(() => room._handlePlayerDeath(A, 'bp_ws_a', 'monster'));   /* v2.3.6460: the game's own handler, as a monster's blow calls it */
    await settle();
    const pile = (room.loot[A.z] || []).find((p) => p.isDeathDrop && !p.inventoryClaimed);
    check('1. A died: the bag went to a pile on the ground', !!pile && (pile.deathItems || []).length > 0, pile && pile.deathItems);
    note('death');
    NOW += (room.DEATH_OWNER_ONLY_MS || 60000) + 1000;
    B.z = A.z; B.x = pile.x; B.y = pile.y; B.dead = false; B.dying = false; B.hp = 100;
    const sessB = [...room.sessions.values()].find((x) => x.id === 'bp_ws_b');
    played(() => room._handleLootPickup(sessB, { lootId: pile.lootId, zone: pile.zone }));
    await settle();
    check('1. B took the pile whole', pile.inventoryClaimed === true, pile.inventoryClaimed);
    note('pickup');
  }
  /* v2.3.6460 (card BK PR 1): NO MAN'S LAND, a red skull killed by the
     player it attacked (nomansland.js, from the room's own death): the purse,
     the weapon bag and what is worn to the killer's mail.  Its state (the red
     skull, B's last blow) is set as §4 sets it: the blow itself is the fight's */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    respawn(room, A);
    A.z = 'wheel'; A.x = c[0] + 4000; A.y = c[1] + 4000;
    if (A.weaponStash && A.weaponStash.length) await send(room, ws.a, 'equip_request', { stashIdx: 0, slot: 'weapon' });
    room._nmlState(A).red = 60000;   /* the room's own shape of the state */
    A._nmlLastHitBy = 'bp_ws_b'; A._nmlLastHitAt = NOW;
    const a0 = A.coins;
    A.hp = 0;
    played(() => room._handlePlayerDeath(A, 'bp_ws_a', 'pvp:bp_ws_b'));
    await settle();
    check('1. No man\'s land: A, a red skull, killed by B: the purse goes to B\'s mail', a0 > 0 && A.coins === 0, { a0, a: A.coins });
    note('nml kill');
    respawn(room, A);
  }
  /* saves and a leave: what is written must say what memory said */
  {
    for (const id of ['bp_ws_a', 'bp_ws_b', 'bp_ws_d']) room._saveRpg(id, room.playerState[id]);
    await settle();
    note('saves');
    room.sessions.delete(ws.b);
    delete room.playerState.bp_ws_b;
    note('B away (counted from the record on file)');
  }
  if (process.env.WORLD_SUM_PLANT === '1') { room._goldGive(A, 50, 'bank_withdraw'); note('PLANTED: a vault paid out twice'); }
  const end = count(room, state);
  PLAYED = { gold: [...RAN.gold], bag: [...RAN.bag], stash: [...RAN.stash] };
  const u = unexplained(start, end);
  const bad = steps.filter(([, g, s]) => g !== 0 || s !== 0);
  check('1. after every step, unexplained gold 0 and every bag key 0', bad.length === 0, bad);
  check(`1. at the end: unexplained gold ${u.gold}`, u.gold === 0, u);
  check('1. ...and no bag key unexplained', Object.keys(u.goods).length === 0, u.goods);
  check('1. no piece of gear or pet is held twice', end.dup.length === 0, end.dup);
  /* v2.3.6464: BREAK PROOF, tried by hand: the weapon swap's bag spliced
     after its stashSet (gear.js _handleEquipRequest: the old weapon put
     back, then cut out) was green in all 70 checks before this line and
     fails it now ("weapons swapped", -1).
     v2.3.6465: BREAK PROOF, tried by hand: the same swap's old weapon put
     back with its id dropped (gear.js `stashSet(ps, 'weaponStash',
     Object.assign({}, activeItem, { gid: undefined }), 'equip_swap', ...)`:
     a new id minted for it, the count the same) was green in all 70 checks
     and fails this one now ("weapons swapped": one id lost, one came) */
  check(`1. after every step, the pieces held (${piecesThen.size}) moved only by what the step made, id by id: none lost, none made from nothing`, pieceSteps.length === 0 && piecesThen.size > 0, pieceSteps);
  check('1. every record is marked and every marked value record has a reader, at the end too', end.unmarked.length === 0 && end.noReader.length === 0, { unmarked: end.unmarked, noReader: end.noReader });
  check('1. value moved: gold was minted and burned (the scenario is not empty)', end.net.gold !== start.net.gold, end.net);
}

/* ══════════════════════════ 2. PLANTED DOUBLE PAYS ══════════════════════════ */
for (const [what, plant, wantGold, wantGoods] of [
  ['a vault paid out with no vault behind it (bank_withdraw, an escrow road)', ({ room, A }) => room._goldGive(A, 50, 'bank_withdraw'), 50, null],
  ['a pile\'s goods given with no pile (loot_death_items, an escrow road)', ({ B }) => bagGive(B.inventory, 'ore_copper', 3, 'loot_death_items'), 0, { ore_copper: 3 }],
  ['a duel\'s pot paid twice by the mail (duelpot, an escrow by its word)', async ({ room }) => {
    await room._creditPlayer('bp_ws_b', { opId: 'duelpot:twice', source: 'duel', kind: 'gold', payload: { amount: 100 }, note: 'x' });
  }, 100, null],
  ['a trade\'s gold taken with no other side (trade_window, a move road)', ({ room, A }) => room._goldTake(A, 40, 'trade_window'), -40, null],
]) {
  const w = await world();
  const s0 = count(w.room, w.state);
  await plant(w);
  await settle();
  const u = unexplained(s0, count(w.room, w.state));
  const goodsOk = wantGoods ? JSON.stringify(Object.fromEntries(Object.entries(u.goods))) === JSON.stringify(wantGoods) : Object.keys(u.goods).length === 0;
  check('2. PLANTED, and seen: ' + what + ` -> unexplained gold ${u.gold}` + (wantGoods ? ', goods ' + JSON.stringify(u.goods) : ''), u.gold === wantGold && goodsOk, u);
}
{
  /* the same roads, honestly run, are not seen */
  const w = await world();
  const s0 = count(w.room, w.state);
  w.room._goldGive(w.A, 25, 'quest_reward');                    /* a mint: counted */
  bagGive(w.B.inventory, 'ore_copper', 2, 'harvest');           /* a mint: counted */
  const u = unexplained(s0, count(w.room, w.state));
  check('2. ...while an honest mint of gold and of goods is explained (0)', u.gold === 0 && Object.keys(u.goods).length === 0, u);
}

/* ══════════════════════════ 3. VALUE THE MARKS DO NOT COUNT ══════════════════════════ */
{
  const w = await world();
  w.state._store.set('vault2:bp_ws_a', { gold: 10 });
  const c = count(w.room, w.state);
  check('3. a stored record with no marks is seen (it holds what nobody counts)', c.unmarked.includes('vault2:bp_ws_a'), c.unmarked);
  const fewer = { ...READERS };
  delete fewer['bounty:'];
  const c2 = count(w.room, makeState(), fewer);
  check('3. a marked value record with no reader is seen (bounty: without its reader)', c2.noReader.join() === 'bounty:', c2.noReader);
  check('3. every marked value prefix has its reader today, and no reader is for a prefix not marked as value',
    Object.entries(STORAGE_MARKS).filter(([, m]) => m.value !== 'none').every(([p]) => READERS[p]) && Object.keys(READERS).every((p) => STORAGE_MARKS[p] && STORAGE_MARKS[p].value !== 'none'));
}

/* ══════════════════════════ 5. A MAILBOX MERGED AT 200 ══════════════════════════ */
/* v2.3.5085 (the gatekeeper's sitting 8): at 200 entries the mailbox merges a
   credit into the first entry of its kind (inbox.js _inboxAppend), whatever
   that entry's word.  A reward (a mint) merged into a parked sale (an escrow)
   was counted by the sale's word: nothing minted, +300 unexplained.  The
   merged entry keeps its minted part beside it now. */
{
  const w = await world();
  const box = [{ opId: 'store:l1:pay', ts: 1, source: 'store', kind: 'gold', payload: { amount: 100 }, note: 'a sale, parked' }];
  for (let i = 0; i < 199; i++) box.push({ opId: 'store:l' + i + ':goods', ts: 1, source: 'store', kind: 'item', payload: { invKey: 'fish_minnow', count: 1 }, note: 'goods, parked' });
  w.state._store.set('inbox:bp_ws_d', box);
  const s0 = count(w.room, w.state);
  await w.room._creditPlayer('bp_ws_d', { opId: 'season:s1:bp_ws_d:t3', source: 'season', kind: 'gold', payload: { amount: 300 }, note: 'a season reward' });
  await w.room._creditPlayer('bp_ws_d', { opId: 'questitem:bp_ws_d:q9:fish_minnow#1', source: 'quest', kind: 'item', payload: { invKey: 'fish_minnow', count: 2 }, note: 'a quest item' });
  await settle();
  const after = w.state._store.get('inbox:bp_ws_d');
  check('5. the box was full: both credits merged into the first entry of their kind', after.length === 200 && after[0].payload.amount === 400 && after[1].payload.count === 3, { n: after.length, gold: after[0].payload, item: after[1].payload });
  const u = unexplained(s0, count(w.room, w.state));
  check(`5. ...a reward merged into a parked sale is still a mint: unexplained gold ${u.gold}, goods ${JSON.stringify(u.goods)}`, u.gold === 0 && Object.keys(u.goods).length === 0, u);
  /* D comes in: the merged entries land, counted by what they say */
  const wd = fakeWs();
  w.room.sessions.set(wd, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await w.room.webSocketMessage(wd, JSON.stringify({ type: 'join', id: 'bp_ws_d', name: 'D', phrase: 'p-d', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const D = w.room.playerState.bp_ws_d;
  const u2 = unexplained(s0, count(w.room, w.state));
  check('5. ...and when D comes in and they land: 300 of the 400 minted, nothing unexplained', D && D.coins >= 450 && D._econ.g.m >= 300 && u2.gold === 0 && Object.keys(u2.goods).length === 0, { coins: D && D.coins, econ: D && D._econ.g, u2 });
}

/* ══════════════════════════ 4. THE THREE LINES OUTSIDE ══════════════════════════ */
{
  /* the join brings _econ back before any door runs */
  const w = await world();
  const stored = w.state._store.get('rpg:bp_ws_a');
  check('4. the join brought A\'s _econ back (it was on file; the start\'s join counted nothing over it)', !!w.A._econ && w.A._econ.g.m === stored._econ.g.m, { live: w.A._econ, stored: stored._econ });
  {
    /* v2.3.5085 (the gatekeeper's sitting 8): HELD at the join itself, before
       any save -- persistence.js's adopt at the first save backs the line up,
       so a check after the join passes without it; a door that ran between
       the join and that save would have counted into a blank */
    const st2 = makeState();
    st2._store.set('rpg:bp_ws_j', { _v: 21, coins: 10, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 77, b: 7 }, i: {} } });
    const r2 = new GameRoom(st2, mockEnv);
    r2._liveFlags = {};
    let seen = 'no save';
    const save = r2._saveRpg;
    r2._saveRpg = function (pid, ps, ...rest) { if (seen === 'no save') seen = ps && ps._econ ? JSON.stringify(ps._econ.g) : 'blank'; return save.call(this, pid, ps, ...rest); };
    const wj = fakeWs();
    r2.sessions.set(wj, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await r2.webSocketMessage(wj, JSON.stringify({ type: 'join', id: 'bp_ws_j', name: 'J', phrase: 'p-j', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    await settle();
    check('4. ...at the join itself: the counts on file are live before the first save (join.js, not the save\'s adopt)', seen === '{"m":77,"b":7}', seen);
  }
  /* a red skull killed by a monster burns its purse; by a player it moves */
  const { NML } = await import('../src/nomansland.js').catch(() => ({}));
  const ps = w.A;
  ps._nml = { red: 60000, white: 0 };
  const c = w.room._wheelT().WHEEL_CENTRE;
  ps.z = 'wheel'; ps.x = c[0] + 4000; ps.y = c[1] + 4000;
  const s0 = count(w.room, w.state);
  const before = ps.coins;
  if (typeof w.room._nmlOnDeath === 'function') w.room._nmlOnDeath(ps, 'bp_ws_a', 'monster');
  const u = unexplained(s0, count(w.room, w.state));
  check(`4. a red skull killed by a monster: the purse (${before}) burned through nml_lost, nothing unexplained`, ps.coins === 0 && u.gold === 0 && w.A._econ.g.b >= before, { coins: ps.coins, u, econ: w.A._econ && w.A._econ.g, NML: !!NML });
  /* the champion's prize carries the house's part */
  const { GOLD_ROADS } = await import('../src/gold.js');
  check('4. nml_lost is its own burn road', GOLD_ROADS.nml_lost && GOLD_ROADS.nml_lost.class === 'burn' && GOLD_ROADS.nml_loss.class === 'move');
  const src = (await import('node:fs')).readFileSync(new URL('../src/gladiator.js', import.meta.url), 'utf8');
  check('4. the champion\'s prize says the house\'s part (payload.house)', /opId: 'arenapot:' \+ tid[^\n]*payload: \{ amount: prize, house: /.test(src));
}

/* ══════════ v2.3.5281: THE STASHES, BY THE DOOR'S CLASSES (card R PR 2) ══════════
   The stashes' door (stash.js) classes every road as gold.js does; the sum
   reads every place a stash road holds a piece in, and counts the gear lists
   the door writes (each piece by its id, in one place).  The weapon bag is
   counted once weapons carry an id (card R PR 3: the readers say so). */
{
  const { STASH_ROADS, STASH_FIELDS } = await import('../src/stash.js');
  const { classFaults } = await import('../src/gold.js');
  check('stash: every road of the stashes\' door is classed (a mint, a burn, a move within one player, an escrow into a place)', classFaults(STASH_ROADS, { self: true }).length === 0, classFaults(STASH_ROADS, { self: true }));
  const places = [...new Set(Object.values(STASH_ROADS).filter((r) => r.class === 'escrow').map((r) => r.other))];
  const unread = places.filter((p) => !Object.prototype.hasOwnProperty.call(READERS, p));
  check('stash: every place a stash road holds a piece in is read by the sum (' + places.join(', ') + ')', places.length >= 4 && unread.length === 0, unread);
  const src = (await import('node:fs')).readFileSync(new URL('../src/worldsum.js', import.meta.url), 'utf8');
  const m = /const STASH_FIELDS = (\[[^\]]*\]);/.exec(src);
  /* v2.3.5282 (card R PR 3): the weapon bag too, now that a weapon has its own id */
  check('stash: the sum counts every stash the door writes, the weapon bag included (by id)', !!m && JSON.stringify(JSON.parse(m[1].replace(/'/g, '"'))) === JSON.stringify(STASH_FIELDS), m && m[1]);
}

/* ══════════ v2.3.6460 (card BK PR 1): THE SUM PLAYS WHAT IT SUMS ══════════
   The sum sees a road that moves or holds value only if the scenario runs it:
   a road booked one short (the Auction House's listing taking one less, the
   General Store's order one gold less) left this suite green while §1 played
   six systems (docs/plan/census/shape-books.md, plants 2 and 3).  So every
   `move` and `escrow` road of the three doors (gold.js GOLD_ROADS, bag.js
   BAG_ROADS, stash.js STASH_ROADS) must have RUN in §1, inside a real
   handler (the roads that ran, at the top), or be on UNPLAYED with why.
   UNPLAYED is a list that only falls: a road on it that runs fails until it
   is taken off, and its length is a line (UNPLAYED_MOST) a new road raises
   only in plain sight.  A mint or a burn is explained by construction (the
   door books what it moves), so it is not held here: a door that books
   other than it moves is the doors' own tests' (card DG). */
const UNPLAYED = Object.freeze({
  gold: {
    threat_levy: 'shut on the live game: the threat levy runs only with OPEN_PVP (false; threat.js, valuepause.test §4)',
    escrow_debit_stored: 'a payer who is away: every route that takes it asks for a live session first (httpauth.js), so only a leave in the middle of a request reaches it',
  },
  bag: {
    escrow_item: 'the Auction House\'s old two-write listing, run only with `ahonewrite: false` (store.js)',
    escrow_item_stored: 'the same, for a seller who is away',
  },
  stash: {
    quest_wood: 'a quest weapon traded up to a better wood (quests.js _questTradeApply): a quest line to play first, a later PR',
    forge_swap: 'a weapon forged while one is in the hand (gear.js): the smith\'s level and bars first, a later PR',
    gear_migrate: 'a stored record from before the gear lists, made lists (gearstash.js): runs only on that old shape',
  },
});
const UNPLAYED_MOST = 7;
{
  const DOORS = { gold: GOLD_ROADS, bag: BAG_ROADS, stash: STASH_ROADS };
  const held = (r) => r && (r.class === 'move' || r.class === 'escrow');
  const missing = [], stale = [], wrong = [];
  let listed = 0, roads = 0;
  for (const [door, table] of Object.entries(DOORS)) {
    const ran = new Set(PLAYED ? PLAYED[door] : []);
    for (const [road, row] of Object.entries(table)) {
      if (!held(row)) continue;
      roads++;
      if (!ran.has(road) && !Object.prototype.hasOwnProperty.call(UNPLAYED[door], road)) missing.push(door + ' ' + road + ' (' + row.at + ')');
    }
    for (const road of Object.keys(UNPLAYED[door])) {
      listed++;
      if (!held(table[road])) wrong.push(door + ' ' + road);
      else if (ran.has(road)) stale.push(door + ' ' + road);
    }
  }
  check(`the roads: every move or escrow road (${roads}) ran in §1 through a real handler, or is on UNPLAYED with its reason`, !!PLAYED && missing.length === 0, missing);
  check('the roads: UNPLAYED only falls -- a road on it that now runs is taken off', stale.length === 0, stale);
  check('the roads: UNPLAYED names only move or escrow roads of the doors', wrong.length === 0, wrong);
  check(`the roads: UNPLAYED holds ${listed}, at most its line ${UNPLAYED_MOST} (a line that only falls)`, listed <= UNPLAYED_MOST, listed);
  if (listed < UNPLAYED_MOST) console.log(`NOTE UNPLAYED holds ${listed}: lower UNPLAYED_MOST to it`);
  /* the record itself: a door the test calls by hand is not written down */
  const w = await world();
  const before = RAN.gold.size;
  RAN.gold.clear();
  w.room._goldGive(w.A, 1, 'tonic_refund');
  const byHand = RAN.gold.has('tonic_refund');
  played(() => w.room._goldGive(w.A, 1, 'tonic_refund'));
  check('the roads: a door called by hand is not counted as played; the same call inside a handler is', !byHand && RAN.gold.has('tonic_refund'), { byHand, before });
}
Math.random = realRandom;
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all world-sum checks passed');
process.exit(0);
