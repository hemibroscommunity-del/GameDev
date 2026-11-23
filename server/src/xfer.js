/* ═══ v2.3.5092: THE TRANSFER LEDGER `xfer:` (grand plan step 10.3, card E PR 11) ═══
 *
 * One lasting row each time value settles between two players: when, the
 * road, from, to, the gold, the goods and their ids, the price (what came
 * back the other way), and `by`, the player whose tap settled it.  (SHAPES
 * part 1's actor, "who started it", is built at v2.3.6480 (actor.js): the
 * row keeps it under one key, `actor`, beside `by`, never its fields flat.)
 * The owner's cases read it ("unwind this transfer"), and card Q's signals; the owner's
 * card counts the share moved one way for nothing from it (step 10.4).
 * Before this a trade left no trace but the two purses it changed.
 *
 * WHICH SETTLEMENTS (docs/SHAPES.md part 3: "a row a `move`"): the roads of
 * class `move` (gold.js GOLD_ROADS, bag.js BAG_ROADS), each listed below as
 * writing a row (ROADS) or never (KILLS: a player killed in No man's land
 * hands over their purse, and a kill writes no row -- the owner's "none a
 * kill", call 13).  xfer.test fails a `move` road on neither list.  The
 * escrow roads between players (the market, the auction house, a duel's
 * pot) are not on it: a price is their whole point, and card R's table of
 * the roads between players (step 10.5) says later which of them write one.
 * v2.3.5280: that table is built (playerroads.js PLAYER_ROADS), and ROADS
 * and KILLS are MADE from its `ledger` column (`xfer`, `kill`): the list is
 * written once (the plan's rule 2).  A row's key is the `road` an `xfer:`
 * row keeps.
 *
 * IN THE SETTLEMENT'S OWN RUN (handoff rule 5): `xferRow` issues the put
 * and hands back its promise, never awaiting, so the caller puts it in the
 * run that moves the value (the trade window's `_creditLiveTogether`, or
 * the two saves' run when a side is away) -- a restart lands before the
 * whole settlement or after it, its row with it.  One row a settlement,
 * whatever it carried (`cost-guard` §16 holds the line), and its delete
 * when the prune takes it KEEP_DAYS on: two rows a settlement over its
 * life.  A settlement that moved NOTHING either way (a trade window both
 * sides confirmed empty) writes no row (the gatekeeper's sitting 10).
 *
 * THE KEY BEGINS WITH THE DAY: `xfer:<yyyymmdd>:<id>`, the id the
 * settlement's own (a trade window's, an offer's), so a day's rows list
 * together and the old days are pruned from the front.  Kept KEEP_DAYS (90,
 * the owner's yes, call 13).  The prune is a page of PRUNE_PAGE keys at a
 * row's write, begun once a worker's life a UTC day and run a page each
 * write until a page finds nothing to drop: the ledger's own writes drive
 * it, as the day's book's do (daybook.js), so no tick of an empty room pays
 * for it.  A ledger nobody writes to keeps its last rows until the next.
 *
 * A NEWER WORKER'S ROW is never read or rewritten here (`v` above V: the
 * readers leave it whole).  Every field is bounded: GOODS_MAX keys, IDS_MAX
 * ids, a key KEY_MAX long; what does not fit is dropped and `cut` says so.
 *
 * THE KILL SWITCH `xfer: false` in the live flags: no row is written, and
 * the settlements run exactly as before (nothing else reads the ledger in
 * the settlement's path).
 *
 * v2.3.5290 (card R PR 11, step 10.5's `ledger`, its second step): THE
 * ESCROW ROADS.  A settlement through a record the worker holds between two
 * players writes its row too, in the run that pays it -- built for a duel's
 * pot first (xferDuelPot: the loser's wager to the winner; its door, card
 * L's, is on main).  The market and the auction house join in a later PR,
 * after card K's 5194/5196/5197; the arena's stakes did at v2.3.5292, below
 * (the file table's order, the planning session's (b)).  A row a wagered
 * duel is more rows a day, so it was OFF until the owner said (v2.3.6000,
 * card CS: ON by default; `xferescrow: false` in the live flags turns it off;
 * xferEscrowOn).  Off, the duel pays
 * exactly as before, through _creditPlayer; on, through _creditWith, the
 * pot's credit and its row in one run.
 *
 * v2.3.5292 (card R PR 13): THE ARENA'S STAKES (xferArenaStakes).  A
 * match's stakes settle as a POOL, and a row has one `from` and one `to`:
 * the planning session's reading (1) is ONE ROW A LOSING STAKE, `from` its
 * sponsor, `to` the winning fighter, its whole gold; when sponsors backed
 * the winner, each one's part of that stake rides the row's `ids` as
 * `share:<sponsorId>:<n>` (the fighter's part the rest).  So the rows of a
 * match add up to the losing pool, and their shares to what the winning
 * sponsors gained.  Written in the plan's own run (gladiator.js
 * _arenaSettleStakes: the plan's put and the losers' stamps), with
 * `xferescrow` on only; the old order (`arenasettleplan: false`) writes
 * none.  The row's shape is unchanged.
 *
 * v2.3.5293 (card R PR 17): THE MARKET AND THE AUCTION HOUSE, the escrow
 * ledger's last rows (xferMarketSale, xferAuctionSale, at the foot): one row
 * a sale, seller to buyer, the goods one way and the price the other.
 */

import { playerRoadsBy } from './playerroads.js';   /* v2.3.5280: the roads between players, one table */
import { actorOff, actorOf, actorRow, ROOM_ACTOR } from './actor.js';   /* v2.3.6480: who started it (card WHO PR 1) */

export const XFER = Object.freeze({
  V: 1,
  PREFIX: 'xfer:',
  KEEP_DAYS: 90,
  PRUNE_PAGE: 32,
  GOODS_MAX: 64,
  IDS_MAX: 32,
  /* v2.3.5295 (card R PR 15; the gatekeeper's sitting 23): an arena stake's
     row carries each winning sponsor's part as an id, `share:<sid>:<n>`
     (xferArenaStakes), and a match can have more winning sponsors than
     IDS_MAX: their own bound, above the room's MAX_PLAYERS (120), so every
     share fits and the rows still add up to the pool. */
  SHARES_MAX: 128,
  SHARE: 'share:',
  KEY_MAX: 64,
  /** The roads between players that write a row, one a settlement
   *  (v2.3.5280: PLAYER_ROADS' rows whose ledger is `xfer`). */
  ROADS: Object.freeze(playerRoadsBy('xfer')),
  /** The ones that never do: a kill (the owner's "none a kill"; v2.3.5280:
   *  PLAYER_ROADS' rows whose ledger is `kill`). */
  KILLS: Object.freeze(playerRoadsBy('kill')),
});

/** v2.3.5295: an id that is a winning sponsor's part of an arena stake
 *  (`share:<sid>:<n>`), not a thing that moved: the owner's card counts no
 *  item for it (econcard.js itemsOf). */
export function xferIsShare(id) {
  return typeof id === 'string' && id.startsWith(XFER.SHARE);
}

/** The UTC day of `ts`, 'yyyymmdd' (daybook.js's, so a day's rows and its
 *  book agree). */
export function xferDay(ts) {
  const d = new Date(Number(ts) || 0);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
}
const ID_RE = /^[A-Za-z0-9_.:-]+$/;
/** A row's key, or null for an id the ledger does not take. */
export function xferKey(day, id) {
  if (typeof day !== 'string' || !/^\d{8}$/.test(day)) return null;
  if (typeof id !== 'string' || !id || id.length > XFER.KEY_MAX || !ID_RE.test(id)) return null;
  return XFER.PREFIX + day + ':' + id;
}

/** v2.3.5290: an escrow road's row (more rows a day, the owner's call).
 *  v2.3.6000: ON by default (card CS, the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost");
 *  `xferescrow: false` in the live flags turns it off. */
export function xferEscrowOn(room) {
  const f = room && room._liveFlags;
  if (xferOff(room)) return false;   /* rule 4: off with the ledger it needs (`xfer: false`) */
  return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'xferescrow') && f.xferescrow === false);
}

/** `xfer: false` in the live flags. */
export function xferOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'xfer') && !f.xfer);
}

const whole = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const keyOk = (k) => typeof k === 'string' && k.length > 0 && k.length <= XFER.KEY_MAX && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';

/* One side of a settlement: its gold, its goods ({key: n}, `_gold` the
   gold, as an offer is written) and its ids (a pet's id, a weapon's place),
   bounded; `cut` when something did not fit. */
function sideOf(gives, ids, cut) {
  const g = gives && typeof gives === 'object' ? gives : {};
  const goods = Object.create(null);
  let n = 0;
  for (const k of Object.keys(g)) {
    if (k === '_gold') continue;
    const c = whole(g[k]);
    if (!c) continue;
    if (!keyOk(k) || n >= XFER.GOODS_MAX) { cut.v = true; continue; }
    goods[k] = c; n++;
  }
  const list = [];
  let things = 0, shares = 0;   /* v2.3.5295: a share counts against its own bound (SHARES_MAX) */
  for (const x of (Array.isArray(ids) ? ids : [])) {
    if (typeof x !== 'string' || !x || x.length > XFER.KEY_MAX) { cut.v = true; continue; }
    const share = xferIsShare(x);
    if (share ? shares >= XFER.SHARES_MAX : things >= XFER.IDS_MAX) { cut.v = true; continue; }
    if (share) shares++; else things++;
    list.push(x);
  }
  return { gold: whole(g._gold), goods: { ...goods }, ids: list };
}

const sideEmpty = (x) => !x.gold && !x.ids.length && !Object.keys(x.goods).length;

/** THE ROW.  Issues the put of one settlement's row and returns its
 *  promise, for the caller to put in the settlement's own run (never
 *  awaited here: no await may come between the payment and its row).  Null
 *  when switched off, the road writes no row, or the row is not well made
 *  (a missing side, an id the key does not take): a settlement is never
 *  stopped by its ledger.
 *    road    a road of XFER.ROADS
 *    id      the settlement's own id (a trade window's, an offer's)
 *    from    the player whose `gives` these are; `to` the other
 *    gives   what `from` gave: {_gold, key: n}; `ids` its pets' and weapons'
 *    price   what came back the other way, the same shape ({} for a gift)
 *    by      the player whose tap settled it
 *  v2.3.6480 (card WHO PR 1; SHAPES part 1): and `actor`, WHO STARTED IT,
 *  under its one key (actor.js actorRow): `by`'s live session's actor (a
 *  socket's, or an HTTP call's, which acts as its session), the room's
 *  (`system`) when nobody's tap settled it, null when `by` has no live
 *  session; `test: true` beside its kind when its character is in test
 *  mode at the write, so the owner's test play is told apart for ever
 *  after.  It rides the row's own put: no new row.  `actor: false` in the
 *  live flags: no `actor` key, the row exactly as before.  XFER.V stays 1:
 *  a key the older readers never read (econcard.js xferSummary), on a row
 *  written once -- a bump would have an older worker's card skip the new
 *  rows as `newer` for nothing. */
export function xferRow(room, { road, id, from, to, gives, ids, price, priceIds, by, now } = {}) {
  try {
    if (!room || !room.state || !room.state.storage || xferOff(room)) return null;
    if (XFER.ROADS.indexOf(road) < 0) return null;
    if (typeof from !== 'string' || !from || typeof to !== 'string' || !to || from === to) return null;
    const at = typeof now === 'number' && Number.isFinite(now) ? now : Date.now();
    const day = xferDay(at);
    const key = xferKey(day, id);
    if (!key) return null;
    const cut = { v: false };
    const gave = sideOf(gives, ids, cut);
    const back = sideOf(price, priceIds, cut);
    if (sideEmpty(gave) && sideEmpty(back) && !cut.v) return null;   /* v2.3.5092 (sitting 10): nothing moved, nothing to record */
    const row = {
      v: XFER.V, at, day, road, from, to,
      gold: gave.gold, goods: gave.goods, ids: gave.ids,
      price: back,
      by: typeof by === 'string' && by ? by : null,
    };
    if (!actorOff(room)) row.actor = actorRow(room, row.by ? actorOf(room, row.by) : ROOM_ACTOR);   /* v2.3.6480 */
    if (cut.v) row.cut = true;
    const p = room.state.storage.put(key, row);
    /* the prune rides the row's write, once a day (the header) */
    xferPrunePage(room, at).catch(() => {});
    return p;
  } catch (e) { return null; }   /* a ledger must never stop what it records */
}

function mem(room) {
  if (!room._xfer) room._xfer = { prunedDay: null, pruneAfter: null, pruning: false };
  return room._xfer;
}
/* The day `days` before `day` ('yyyymmdd'), for the prune's line. */
function dayBefore(day, days) {
  const t = Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8)) - days * 86400000;
  return xferDay(t);
}

/** One page of the prune: the days before the last KEEP_DAYS go, the oldest
 *  first, PRUNE_PAGE keys a call.  Begins once a worker's life a UTC day
 *  and runs a page each call until a page finds nothing to drop. */
export async function xferPrunePage(room, now) {
  const m = mem(room);
  const today = xferDay(typeof now === 'number' ? now : Date.now());
  if (m.prunedDay === today || m.pruning) return false;
  m.pruning = true;
  const line = XFER.PREFIX + dayBefore(today, XFER.KEEP_DAYS - 1);   /* the oldest day kept */
  try {
    const opts = { prefix: XFER.PREFIX, limit: XFER.PRUNE_PAGE };
    if (m.pruneAfter) opts.startAfter = m.pruneAfter;
    const page = await room.state.storage.list(opts);
    const drop = [];
    let last = null;
    for (const k of page.keys()) { last = k; if (k < line) drop.push(k); }
    if (drop.length) await room.state.storage.delete(drop);
    if (page.size < XFER.PRUNE_PAGE || !last || drop.length < page.size) {
      m.prunedDay = today; m.pruneAfter = null;   /* reached the kept days, or the end: done for today */
      return false;
    }
    m.pruneAfter = last;
    return true;
  } catch (e) {
    m.prunedDay = today; m.pruneAfter = null;    /* tomorrow, or the next worker */
    return false;
  } finally {
    m.pruning = false;
  }
}

/** A day's rows, oldest key first, at most `limit` (the owner's card and
 *  the cases read through this; a newer worker's row is returned whole and
 *  marked `newer`, never rewritten). */
export async function xferList(room, day, limit = 200) {
  const out = [];
  if (typeof day !== 'string' || !/^\d{8}$/.test(day)) return out;
  try {
    const page = await room.state.storage.list({ prefix: XFER.PREFIX + day + ':', limit: Math.max(1, Math.min(1000, Math.floor(Number(limit)) || 200)) });
    for (const [k, v] of page) {
      if (!v || typeof v !== 'object') continue;
      out.push(Number(v.v) > XFER.V ? { key: k, newer: true, row: v } : { key: k, row: v });
    }
  } catch (e) { /* an unread day is an empty one */ }
  return out;
}

/* ══════════ THE TWO SETTLEMENTS THAT WRITE A ROW (XFER.ROADS) ══════════
   Each is called from inside its settlement's own run and hands back the
   put's promise for that run (the header), so its caller adds one line. */

/** The trade window's commit (trade2.js): `s` the window, both sides'
 *  offers, pets and staged weapons; one row, `a` to `b`, b's side the
 *  price.  `by` the confirm that settled it. */
export function xferTradeWindow(room, s, by) {
  if (!s || typeof s !== 'object') return null;
  const idsOf = (pid) => [
    ...((s.pets && Array.isArray(s.pets[pid])) ? s.pets[pid] : []).map((id) => 'pet:' + id),
    ...((s.weapons && Array.isArray(s.weapons[pid])) ? s.weapons[pid] : []).map((e) => 'weapon:' + (e && e.seq)),
  ];
  const offers = s.offers || {};
  return xferRow(room, { road: 'trade_window', id: 't2-' + s.id, from: s.a, to: s.b, gives: offers[s.a], ids: idsOf(s.a), price: offers[s.b], priceIds: idsOf(s.b), by });
}

/** The gift trade's accept (trade.js): `pending` the offer, `from` its
 *  sender, `to` the accepter (`by`); nothing comes back (a gift's price is
 *  empty). */
export function xferGift(room, pending, from, to) {
  if (!pending || typeof pending !== 'object') return null;
  return xferRow(room, { road: 'gift_trade', id: 'gift-' + pending.id, from, to, gives: pending.offer, price: {}, by: to });
}

/* ══════════ THE ESCROW ROADS THAT WRITE A ROW (v2.3.5290) ══════════
   Only with `xferescrow: true` (xferEscrowOn), each from inside its
   settlement's own run, as the two above. */

/** A duel's pot (duel.js _resolveDuel): the loser's wager to the winner, the
 *  winner's own wager coming back to them (not a transfer: the row's price
 *  is empty).  `by` the winner when their blow settled it (`kill`); a
 *  forfeit, a clock or another death is nobody's tap. */
export function xferDuelPot(room, duel, winnerId, loserId, how) {
  if (!xferEscrowOn(room) || !duel || typeof duel !== 'object' || !(Number(duel.wager) > 0)) return null;
  return xferRow(room, { road: 'duel_pot', id: 'duel-' + duel.id, from: loserId, to: winnerId, gives: { _gold: duel.wager }, price: {}, by: how === 'kill' ? winnerId : null });
}

/** v2.3.5292: each loser's stake split among the winning sponsors' gains
 *  (`gains`: [{sponsorId, n}]), in whole coins, so that every winner's
 *  parts add up to its gain exactly and no stake gives more than it held:
 *  each part its floor of the pro-rata share, then the coins left over one
 *  at a time, the largest remainder first, to a stake with room.  Returns
 *  one Map(sponsorId -> n) a loser, in the losers' order. */
export function arenaStakeParts(losers, gains) {
  const L = losers.map((x) => whole(x && x.amount));
  const total = L.reduce((n, a) => n + a, 0);
  const parts = L.map(() => new Map());
  if (!total) return parts;
  const room = L.slice();
  const rem = [];
  const left = [];
  (Array.isArray(gains) ? gains : []).forEach((g, i) => {
    const s = Math.min(whole(g && g.n), total);
    let given = 0;
    L.forEach((a, j) => {
      const f = Math.floor(s * a / total);
      if (f > 0) { parts[j].set(g.sponsorId, f); room[j] -= f; given += f; }
      rem.push({ i, j, r: (s * a) % total });
    });
    left[i] = s - given;
  });
  rem.sort((x, y) => (y.r - x.r) || (x.i - y.i) || (x.j - y.j));
  const give = (i, j) => {
    const sid = gains[i].sponsorId;
    parts[j].set(sid, (parts[j].get(sid) || 0) + 1); room[j]--; left[i]--;
  };
  for (const { i, j } of rem) if (left[i] > 0 && room[j] > 0) give(i, j);
  for (let i = 0; i < left.length; i++) for (let j = 0; j < L.length && left[i] > 0; j++) while (left[i] > 0 && room[j] > 0) give(i, j);
  return parts;
}

/** v2.3.5292: a match's stakes (gladiator.js _arenaSettleStakes, its plan's
 *  run): one row a losing stake, `from` its sponsor, `to` the winning
 *  fighter, its whole gold, the winning sponsors' parts of it in `ids` as
 *  `share:<sponsorId>:<n>` (the header).  `losers` [{sponsorId, amount}],
 *  `gains` [{sponsorId, n}] what each winning sponsor gained beyond its own
 *  stake.  `by` nobody: a stake settles by the match's end, not by a tap on
 *  it.  The puts' promises, for the caller's run; [] when off. */
export function xferArenaStakes(room, { tid, matchId, winnerId, losers, gains } = {}) {
  if (!xferEscrowOn(room) || typeof matchId !== 'string' || !Array.isArray(losers) || !losers.length) return [];
  const parts = arenaStakeParts(losers, gains);
  const mid = matchId.replace(/-/g, '');
  const out = [];
  losers.forEach((x, j) => {
    if (!x || typeof x.sponsorId !== 'string') return;
    const ids = [];
    for (const [sid, n] of parts[j]) if (n > 0) ids.push(XFER.SHARE + sid + ':' + n);
    const p = xferRow(room, { road: 'arena_stakes', id: 'as-' + mid + '-' + x.sponsorId, from: x.sponsorId, to: winnerId, gives: { _gold: x.amount }, ids, price: {}, by: null });
    if (p) out.push(p);
  });
  return out;
}

/* ══════════ v2.3.5293 (card R PR 17): THE MARKET AND THE AUCTION HOUSE ══════════
   The escrow ledger's last rows (card R PR 11's `ledger`, step 2), after
   card K's 5194, 5196 and 5197 (`market.js`, `store.js`).  Each writes ONE
   row a sale, from the seller to the buyer, the goods and their ids one
   way and the price the other, in the run that commits the sale; only with
   `xferescrow: true` (OFF by default: the owner's cost question). */

/** The goods of a listing (store.js `_stGoodsCredit`'s kinds) as a row's
 *  side: an item counted by its key, a weapon, a piece of gear or a pet by
 *  its id. */
function goodsOf(kind, rec) {
  const g = Object.create(null);
  const ids = [];
  if (kind === 'item' && typeof rec.invKey === 'string') g[rec.invKey] = whole(rec.qty);
  else if (kind === 'weapon') ids.push('weapon:' + ((rec.weapon && typeof rec.weapon.gid === 'string' && rec.weapon.gid) || '?'));
  else if (kind === 'gear') ids.push('gear:' + ((rec.gear && typeof rec.gear.gid === 'string' && rec.gear.gid) || '?'));
  else if (kind === 'pet') ids.push('pet:' + ((rec.pet && typeof rec.pet.id === 'string' && rec.pet.id) || '?'));
  return { goods: g, ids };
}

/** The General Store's order book (market.js, a noted sale's commit: the
 *  maker's `settle` note, in the taker's escrow's run): the weapon from the
 *  seller to the buyer, the price the other way, `by` the taker's tap. */
export function xferMarketSale(room, { makerId, sellerId, buyerId, weapon, price, by } = {}) {
  if (!xferEscrowOn(room) || typeof makerId !== 'string') return null;
  const side = goodsOf('weapon', { weapon });
  return xferRow(room, { road: 'market', id: 'mkt-' + makerId, from: sellerId, to: buyerId, gives: side.goods, ids: side.ids, price: { _gold: price }, by });
}

/** The Auction House (store.js, storeoffer.js): a listing's goods from the
 *  seller to `rec.sale`'s buyer, its price the other way; `road` the way it
 *  sold (`auction_sale` bought now, `auction_bid` a bid accepted,
 *  `auction_offer` an offer taken), `by` whose tap settled it. */
export function xferAuctionSale(room, rec, road, by) {
  if (!xferEscrowOn(room) || !rec || typeof rec !== 'object' || !rec.sale || typeof rec.id !== 'string') return null;
  const side = goodsOf(rec.kind, rec);
  return xferRow(room, { road, id: 'ah-' + rec.id, from: rec.sellerId, to: rec.sale.buyerId, gives: side.goods, ids: side.ids, price: { _gold: rec.sale.price }, by });
}
