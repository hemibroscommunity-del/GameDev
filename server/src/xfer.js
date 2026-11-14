/* ═══ v2.3.5092: THE TRANSFER LEDGER `xfer:` (grand plan step 10.3, card E PR 11) ═══
 *
 * One lasting row each time value settles between two players: when, the
 * road, from, to, the gold, the goods and their ids, the price (what came
 * back the other way), and `by`, the player whose tap settled it.  (SHAPES
 * part 1's actor, "who started it", is not built yet: when it is, the row
 * keeps it under one key beside `by`, never its fields flat.)  The owner's
 * cases read it ("unwind this transfer"), and card Q's signals; the owner's
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
 *
 * IN THE SETTLEMENT'S OWN RUN (handoff rule 5): `xferRow` issues the put
 * and hands back its promise, never awaiting, so the caller puts it in the
 * run that moves the value (the trade window's `_creditLiveTogether`, or
 * the two saves' run when a side is away) -- a restart lands before the
 * whole settlement or after it, its row with it.  One row a settlement,
 * whatever it carried (`cost-guard` §16 holds the line).
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
 */

export const XFER = Object.freeze({
  V: 1,
  PREFIX: 'xfer:',
  KEEP_DAYS: 90,
  PRUNE_PAGE: 32,
  GOODS_MAX: 64,
  IDS_MAX: 32,
  KEY_MAX: 64,
  /** The `move` roads that write a row, one a settlement. */
  ROADS: Object.freeze(['trade_window', 'gift_trade']),
  /** The `move` roads that never do: a kill (the owner's "none a kill"). */
  KILLS: Object.freeze(['nml_loss']),
});

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
  for (const x of (Array.isArray(ids) ? ids : [])) {
    if (typeof x !== 'string' || !x || x.length > XFER.KEY_MAX) { cut.v = true; continue; }
    if (list.length >= XFER.IDS_MAX) { cut.v = true; break; }
    list.push(x);
  }
  return { gold: whole(g._gold), goods: { ...goods }, ids: list };
}

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
 *    by      the player whose tap settled it */
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
    const row = {
      v: XFER.V, at, day, road, from, to,
      gold: gave.gold, goods: gave.goods, ids: gave.ids,
      price: back,
      by: typeof by === 'string' && by ? by : null,
    };
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
