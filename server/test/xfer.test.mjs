/* ═══ v2.3.5092: THE TRANSFER LEDGER `xfer:` (grand plan step 10.3, card E PR 11) ═══
 *
 *   1. THE ROW: one settlement, one row, its key beginning with the day; its
 *      shape (from, to, gold, goods, ids, the price, `by`); bounded
 *      (`cut` when something did not fit); none for a road that writes none,
 *      a player trading with themself, or an id the key does not take.
 *   2. WHICH ROADS: every `move` road of the two doors (gold.js, bag.js)
 *      writes a row (XFER.ROADS) or is a kill (XFER.KILLS, none: the owner's
 *      "none a kill"), and nothing else is on either list.  v2.3.5280: the
 *      two lists are MADE from the roads between players (playerroads.js
 *      PLAYER_ROADS' `ledger`), so a `move` road counts as listed when it is
 *      on a row of that table whose ledger is `xfer` or `kill`.
 *   3. IN THE SETTLEMENT'S OWN RUN: the trade window's swap and its row
 *      commit in ONE batch (the shared test room's storage): a restart before
 *      it leaves neither, after it both.  One row whatever the swap carried
 *      (gold, goods, a staged weapon); `by` is the last confirm.
 *   4. THE GIFT TRADE: one row, the price empty, `by` the accepter.
 *   5. KEPT 90 DAYS: the older days pruned a page at a time from a row's
 *      write, once a day; the kept days untouched.
 *   6. THE KILL SWITCH `xfer: false`: no row, and the trade settles as before.
 *   7. THE READ: a day's rows; a newer worker's row returned whole, marked.
 *   8. v2.3.5290 (card R PR 11): A DUEL'S POT, the first escrow road with a
 *      row.  `xferescrow` off (the default): the pot pays as before and
 *      writes no row; on: ONE row, the loser's wager to the winner, `by` the
 *      winner's blow, in the pot's own run (a restart at any of its writes:
 *      the pot and its row both, or neither).
 *
 * BREAK PROOF (rule 8), tried by hand: the row's line in trade2.js moved
 * after `await together` (a run of its own) -> FAIL 3 ("a restart at any
 * write of the confirm: the swap and its row both, or neither": paid, no row).
 * And (sitting 10) the empty side's check taken out of xferRow -> FAIL 3
 * (an empty window wrote a row).  And (v2.3.5290) duel.js's row written
 * after the credit's await, not in _creditWith's run -> FAIL 8 (a restart
 * between: paid, no row).
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import { XFER, xferRow, xferKey, xferDay, xferList, xferPrunePage, xferOff } from '../src/xfer.js';
import { GOLD_ROADS } from '../src/gold.js';
import { BAG_ROADS } from '../src/bag.js';
import { PLAYER_ROADS } from '../src/playerroads.js';   /* v2.3.5280 */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 3 }).install();
const DAY = xferDay(clock.now());
const rows = (st) => [...st._store.keys()].filter((k) => k.startsWith(XFER.PREFIX)).sort();
const seed = (pids, coins, inv) => new Map(pids.map((p) => ['rpg:' + p, { _v: 21, coins, inventory: { ...(inv || {}) }, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }]));
const cmd = (r, ws, type, payload) => r.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

/* ══════════ 1. THE ROW ══════════ */
{
  const st = makeStorage();
  const room = await openRoom(st);
  const p = xferRow(room, { road: 'trade_window', id: 't2-abc', from: 'bp_a', to: 'bp_b', gives: { _gold: 200, fish_minnow: 5 }, ids: ['pet:p1'], price: { ore_iron_ore: 2 }, priceIds: [], by: 'bp_b' });
  check('1. the row\'s put is issued at once (a promise, for the caller\'s run)', !!p && typeof p.then === 'function');
  await p; await settle();
  const key = xferKey(DAY, 't2-abc');
  const row = st._store.get(key);
  check('1. one row, its key the day and the settlement\'s id', rows(st).length === 1 && rows(st)[0] === key && key === 'xfer:' + DAY + ':t2-abc', rows(st));
  check('1. ...its shape: from, to, gold, goods, ids, the price, `by`, the road, when',
    row && row.v === 1 && row.from === 'bp_a' && row.to === 'bp_b' && row.gold === 200 && row.goods.fish_minnow === 5 && !('_gold' in row.goods)
    && row.ids.join() === 'pet:p1' && row.price.gold === 0 && row.price.goods.ore_iron_ore === 2 && row.by === 'bp_b' && row.road === 'trade_window' && row.at === clock.now() && row.day === DAY && !row.cut, row);
  check('1. no row for a road that writes none (a kill; an escrow; an unknown)',
    xferRow(room, { road: 'nml_loss', id: 'k1', from: 'bp_a', to: 'bp_b', gives: { _gold: 9 } }) === null
    && xferRow(room, { road: 'bank_deposit', id: 'k2', from: 'bp_a', to: 'bp_b' }) === null
    && xferRow(room, { road: 'nope', id: 'k3', from: 'bp_a', to: 'bp_b' }) === null);
  check('1. ...nor for a player with themself, a side missing, or an id the key does not take',
    xferRow(room, { road: 'gift_trade', id: 'g1', from: 'bp_a', to: 'bp_a' }) === null
    && xferRow(room, { road: 'gift_trade', id: 'g2', from: 'bp_a' }) === null
    && xferRow(room, { road: 'gift_trade', id: 'a b', from: 'bp_a', to: 'bp_b' }) === null
    && xferRow(room, { road: 'gift_trade', id: 'x'.repeat(65), from: 'bp_a', to: 'bp_b' }) === null);
  /* bounded */
  const many = {}; for (let i = 0; i < 80; i++) many['k' + i] = 1;
  many.__proto__x = 1;
  await xferRow(room, { road: 'gift_trade', id: 'g-big', from: 'bp_a', to: 'bp_b', gives: many, ids: Array.from({ length: 40 }, (_, i) => 'pet:' + i), price: {} });
  const big = st._store.get(xferKey(DAY, 'g-big'));
  check('1. bounded: at most GOODS_MAX goods and IDS_MAX ids, and `cut` says so', big && Object.keys(big.goods).length === XFER.GOODS_MAX && big.ids.length === XFER.IDS_MAX && big.cut === true, big && { goods: Object.keys(big.goods).length, ids: big.ids.length, cut: big.cut });
  check('1. ...a count that is not a whole number above 0 is left out', (await xferRow(room, { road: 'gift_trade', id: 'g-odd', from: 'bp_a', to: 'bp_b', gives: { _gold: -5, a: 0, b: 'x', c: 2.7 }, price: {} }), st._store.get(xferKey(DAY, 'g-odd')).gold === 0 && JSON.stringify(st._store.get(xferKey(DAY, 'g-odd')).goods) === '{"c":2}'), st._store.get(xferKey(DAY, 'g-odd')));
}

/* ══════════ 2. WHICH ROADS ══════════
   v2.3.5280: through the roads between players (playerroads.js): a door's
   `move` road is listed when a row naming it under its door writes a row
   (`xfer`) or is a kill (`kill`); the two lists are that table's rows. */
{
  const moveOf = (door, table) => Object.entries(table).filter(([, r]) => r.class === 'move').map(([k]) => door + ':' + k);
  const moves = [...moveOf('gold', GOLD_ROADS), ...moveOf('bag', BAG_ROADS)];
  const listed = new Set();
  for (const k of [...XFER.ROADS, ...XFER.KILLS]) {
    const row = PLAYER_ROADS[k];
    for (const door of ['gold', 'bag']) for (const r of ((row && row.roads[door]) || [])) listed.add(door + ':' + r);
  }
  const unlisted = moves.filter((k) => !listed.has(k));
  const byLedger = (l) => Object.keys(PLAYER_ROADS).filter((k) => PLAYER_ROADS[k].ledger === l);
  check('2. every `move` road writes a row or is a kill (its row in PLAYER_ROADS, ledger `xfer` or `kill`)', unlisted.length === 0, unlisted);
  check('2. ...and the two lists are exactly the table\'s rows by ledger (one definition)',
    XFER.ROADS.join() === byLedger('xfer').join() && XFER.KILLS.join() === byLedger('kill').join(), { ROADS: XFER.ROADS, KILLS: XFER.KILLS });
  check('2. ...the two lists are apart', XFER.ROADS.every((k) => !XFER.KILLS.includes(k)));
}

/* ══════════ 3. THE TRADE WINDOW: the row in the swap's own batch ══════════ */
const A = 'bp_xf_a', B = 'bp_xf_b';
async function windowTo(store, flags) {
  const st = makeStorage(store);
  const room = await openRoom(st, flags);
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true });
  await join(room, wb, B, { loginTaken: true });
  await cmd(room, wa, 'trade2_open', { target: B }); await settle();
  await cmd(room, wb, 'trade2_open', { target: A }); await settle();
  await cmd(room, wa, 'trade2_set', { offer: { _gold: 120, fish_minnow: 4 } }); await settle();
  await cmd(room, wb, 'trade2_set', { offer: { ore_iron_ore: 2 } }); await settle();
  await cmd(room, wa, 'trade2_ready', { ready: true }); await settle();
  await cmd(room, wb, 'trade2_ready', { ready: true }); await settle();
  clock.advance(3000);
  await cmd(room, wa, 'trade2_confirm'); await settle();
  return { st, room, wa, wb };
}
const world = () => {
  const m = seed([A], 500, { fish_minnow: 10 });
  for (const [k, v] of seed([B], 300, { ore_iron_ore: 6 })) m.set(k, v);
  return m;
};
{
  const { st, room, wb } = await windowTo(world());
  await cmd(room, wb, 'trade2_confirm'); await settle();
  const ks = rows(st);
  const row = ks.length === 1 ? st._store.get(ks[0]) : null;
  check('3. the swap settled and wrote ONE row', room.playerState[B].coins === 420 && room.playerState[A].inventory.ore_iron_ore === 2 && ks.length === 1, { b: room.playerState[B].coins, rows: ks });
  check('3. ...A to B, A\'s side its gold and goods, B\'s the price, `by` B (the last confirm)',
    row && row.from === A && row.to === B && row.gold === 120 && row.goods.fish_minnow === 4 && row.price.goods.ore_iron_ore === 2 && row.price.gold === 0 && row.by === B && row.road === 'trade_window', row);
}
{
  /* a restart before each batch of the confirm: the row and the swap
     together, or neither */
  const bad = [];
  for (let k = 0; k <= 4; k++) {
    const { st, room, wb } = await windowTo(world());
    st.crashAt(st.batches() + k);
    await cmd(room, wb, 'trade2_confirm'); await settle();
    const recB = st._store.get('rpg:' + B) || {};
    const paid = Math.floor(recB.coins || 0) === 420;
    const row = rows(st).length;
    if (paid !== (row === 1) || row > 1) bad.push({ crashAt: k, paid, rows: row, coinsB: recB.coins });
  }
  check('3. a restart at any write of the confirm: the swap and its row both, or neither', bad.length === 0, bad);
}
{
  /* v2.3.5092 (the gatekeeper's sitting 10): a window both sides confirmed
     EMPTY moves nothing and writes no row */
  const st = makeStorage(world());
  const room = await openRoom(st);
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true });
  await join(room, wb, B, { loginTaken: true });
  await cmd(room, wa, 'trade2_open', { target: B }); await settle();
  await cmd(room, wb, 'trade2_open', { target: A }); await settle();
  await cmd(room, wa, 'trade2_ready', { ready: true }); await settle();
  await cmd(room, wb, 'trade2_ready', { ready: true }); await settle();
  clock.advance(3000);
  await cmd(room, wa, 'trade2_confirm'); await settle();
  await cmd(room, wb, 'trade2_confirm'); await settle();
  const done = wa.sent.some((m) => m && m.type === 'trade2_state' && m.payload && m.payload.state === 'done');
  check('3. an empty window confirmed by both (it settles) writes no row', done && rows(st).length === 0, { done, rows: rows(st) });
  check('3. ...and xferRow writes none for a settlement with nothing either way', xferRow(room, { road: 'gift_trade', id: 'g-empty', from: A, to: B, gives: { _gold: 0 }, price: {} }) === null && rows(st).length === 0);
}

/* ══════════ 4. THE GIFT TRADE ══════════ */
async function giftWorld() {
  const m = seed([A], 200);
  for (const [k, v] of seed([B], 100)) m.set(k, v);
  m.set('liveflags', { trade2: false });   /* the gift is the trade window's fallback only (trade.js _giftClosed) */
  const st = makeStorage(m);
  const room = await openRoom(st);
  await join(room, fakeWs('a'), A, { loginTaken: true });
  await join(room, fakeWs('b'), B, { loginTaken: true });
  await room._interceptTrade(A, { type: 'trade_offer', payload: { target: B, fromName: 'A', offer: { _gold: 50 } } });
  return { st, room };
}
{
  const { st, room } = await giftWorld();
  await room._interceptTrade(B, { type: 'trade_accept', payload: { target: A } }); await settle();
  const ks = rows(st);
  const row = ks.length === 1 ? st._store.get(ks[0]) : null;
  check('4. a gift trade writes ONE row: A to B, 50 gold, the price empty, `by` B (the accepter)',
    room.playerState[B].coins === 150 && row && row.road === 'gift_trade' && row.from === A && row.to === B && row.gold === 50 && row.price.gold === 0 && Object.keys(row.price.goods).length === 0 && row.by === B, { rows: ks, row, b: room.playerState[B].coins });
}

/* ══════════ 5. KEPT 90 DAYS ══════════ */
{
  const m = new Map();
  const old = (d) => xferDay(clock.now() - d * 86400000);
  for (let i = 0; i < 70; i++) m.set(xferKey(old(100 + (i % 7)), 'o' + i), { v: 1 });
  for (let i = 0; i < 5; i++) m.set(xferKey(old(89), 'k' + i), { v: 1 });
  m.set(xferKey(old(0), 'today'), { v: 1 });
  const st = makeStorage(m);
  const room = await openRoom(st);
  let pages = 0;
  while (await xferPrunePage(room, clock.now())) { pages++; await settle(); }
  await settle();
  const left = rows(st);
  check('5. the days past 90 are pruned, a page at a time; day 89 and today kept', left.length === 6 && left.every((k) => k >= XFER.PREFIX + old(89)) && pages >= 2, { left: left.length, pages });
  check('5. ...and once a day: a second call finds the day done', (await xferPrunePage(room, clock.now())) === false && room._xfer.prunedDay === DAY);
}

/* ══════════ 6. THE KILL SWITCH ══════════ */
{
  const { st, room, wb } = await windowTo(world(), { xfer: false });
  check('6. `xfer: false` reads off', xferOff(room) === true);
  await cmd(room, wb, 'trade2_confirm'); await settle();
  check('6. ...no row, and the trade settles as before', rows(st).length === 0 && room.playerState[B].coins === 420, { rows: rows(st), b: room.playerState[B].coins });
}

/* ══════════ 7. THE READ ══════════ */
{
  const m = new Map([[xferKey(DAY, 'one'), { v: 1, from: 'a' }], [xferKey(DAY, 'two'), { v: 9, from: 'b', future: true }], [xferKey('20200101', 'old'), { v: 1 }]]);
  const st = makeStorage(m);
  const room = await openRoom(st);
  const list = await xferList(room, DAY);
  check('7. a day\'s rows, and only that day\'s', list.length === 2 && list.every((x) => x.key.startsWith(XFER.PREFIX + DAY + ':')), list);
  check('7. ...a newer worker\'s row returned whole and marked, never rewritten', list.find((x) => x.newer) && list.find((x) => x.newer).row.future === true && st._store.get(xferKey(DAY, 'two')).v === 9);
}

/* ══════════ 8. A DUEL'S POT (v2.3.5290) ══════════ */
async function duelTo(flags) {
  const m = seed([A], 500, {});
  for (const [k, v] of seed([B], 300, {})) m.set(k, v);
  const st = makeStorage(m);
  const room = await openRoom(st, flags);
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true });
  await join(room, wb, B, { loginTaken: true });
  await room._interceptDuel(A, { type: 'duel_wager_request', payload: { target: B, fromName: 'A', wager: 40 } });
  await room._interceptDuel(B, { type: 'duel_accept', payload: { target: A, wager: 40 } });
  await settle();
  const duel = [...room._duels.values()][0];
  return { st, room, duel };
}
{
  const off = await duelTo(null);
  check('8. a wagered duel is under way (both wagers held)', !!off.duel && off.duel.wager === 40 && off.st._store.has('duelEscrow:' + off.duel.id) && off.room.playerState[A].coins === 460);
  off.room._duelOnDeath(B, 'pvp:' + A);
  await settle(); await settle();
  check('8. xferescrow off (the default): the pot pays the winner as before, and no row', off.room.playerState[A].coins === 540 && rows(off.st).length === 0 && !off.st._store.has('duelEscrow:' + off.duel.id), { coins: off.room.playerState[A].coins, rows: rows(off.st) });
  const on = await duelTo({ xferescrow: true });
  on.room._duelOnDeath(B, 'pvp:' + A);
  await settle(); await settle();
  const ks = rows(on.st);
  const row = ks.length === 1 ? on.st._store.get(ks[0]) : null;
  check('8. xferescrow on: the pot pays as before, and ONE row', on.room.playerState[A].coins === 540 && ks.length === 1, { coins: on.room.playerState[A].coins, rows: ks });
  check('8. ...the loser\'s wager to the winner, nothing back, `by` the winner\'s blow, keyed by the duel',
    row && row.road === 'duel_pot' && row.from === B && row.to === A && row.gold === 40 && row.price.gold === 0 && row.by === A && ks[0].endsWith(':duel-' + on.duel.id), row);
  /* the forfeit: nobody's blow */
  const ff = await duelTo({ xferescrow: true });
  ff.room._resolveDuel(ff.duel, A, B, 'forfeit');
  await settle(); await settle();
  const fr = rows(ff.st).map((k) => ff.st._store.get(k));
  check('8. a forfeit\'s row has no `by` (nobody\'s tap settled it)', fr.length === 1 && fr[0].by === null, fr);
}
{
  /* a restart before each batch of the pot: the pot and its row both, or neither */
  const bad = [];
  for (let k = 0; k <= 3; k++) {
    const { st, room } = await duelTo({ xferescrow: true });
    st.crashAt(st.batches() + k);
    room._duelOnDeath(B, 'pvp:' + A);
    await settle(); await settle();
    const recA = st._store.get('rpg:' + A) || {};
    const paid = Math.floor(recA.coins || 0) === 540;
    const n = rows(st).length;
    if (paid !== (n === 1) || n > 1) bad.push({ crashAt: k, paid, rows: n, coinsA: recA.coins });
  }
  check('8. a restart at any write of the pot: the pot and its row both, or neither', bad.length === 0, bad);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all xfer checks passed');
