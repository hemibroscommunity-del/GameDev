/* ═══ v2.3.5093: THE OWNER'S CARD'S OTHER READ (grand plan step 10.4, card E PR 12) ═══
 *
 * The Test panel's economy card (src/ui/panels/EconCard.jsx) reads the day's
 * book through its ONE route (GET /dev/daybook, card A's); this is its other
 * read, GET /dev/econcard (devtools.js), read-only, behind the admin key:
 *
 *   metrics   the daily economy snapshots' world sums (liveops.js
 *             _metricsMaybe, `metrics:<yyyymmdd>`.world: what the world holds,
 *             what its characters made less destroyed, minted to date, the ten
 *             richest), newest first, the last DAYS_MAX + 1 -- unexplained
 *             gold and the share to the richest are the change between two;
 *   xfer      the transfer ledger's days (xfer.js), summed: gold and items
 *             moved between players, and those moved ONE WAY FOR NOTHING (a
 *             row whose price is empty: a gift, or a trade one side gave
 *             nothing for);
 *   open      the sittings still open: today's seconds of them (sitting 10's
 *             M3), which the book counts only when a sitting ends.
 *
 * The numbers themselves are the card's (src/game/econCard.js): this only
 * reads.  At most DAYS_MAX days, XFER_ROWS rows a day (a day past it says
 * `cut`).  `econ: false` reads nothing (the card says not counted). */
import { xferDay, xferList } from './xfer.js';
import { worldCtx, worldAdd } from './worldsum.js';
import { bookAdd, bookDay } from './daybook.js';

export const ECONCARD = Object.freeze({ DAYS_MAX: 7, XFER_ROWS: 500, METRICS_PREFIX: 'metrics:' });

const whole = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const itemsOf = (side) => Object.values(side && side.goods && typeof side.goods === 'object' ? side.goods : {}).reduce((a, n) => a + whole(n), 0)
  + (side && Array.isArray(side.ids) ? side.ids.length : 0);

/** One day of the ledger, summed. */
export function xferSummary(day, list, cut) {
  const s = { day, rows: 0, gold: 0, items: 0, goldOneWay: 0, itemsOneWay: 0, newer: 0, cut: !!cut };
  for (const x of list) {
    if (x.newer) { s.newer++; continue; }
    const r = x.row || {};
    const price = r.price || {};
    const back = whole(price.gold) + itemsOf(price);
    const gold = whole(r.gold), items = itemsOf(r);
    s.rows++; s.gold += gold + whole(price.gold); s.items += items + itemsOf(price);
    if (!back) { s.goldOneWay += gold; s.itemsOneWay += items; }
  }
  return s;
}

/* ═══ v2.3.5093: A CHARACTER'S RESTART, BOOKED (the gatekeeper's sitting 10, M1) ═══
   A restart (persistence.js _resetCharacterData) deletes the character's
   record and its vault outside the gold door: their gold and their own count
   of what they made (`_econ`) go together.  The world's sum then moved by
   what they held LESS what they made (A makes 1000 and trades 100 to B; B
   restarts: -100 in red; A restarts: +100, read as a copy).  So, before the
   delete, that difference goes into the day's book (`econ` part, `r`: `g`
   the gold held less made, `n` the restarts) -- riding the book's own puts,
   no row of its own -- and the card adds back the restarts between its two
   daily counts (src/game/econCard.js).  `econ: false`: nothing booked. */
export async function econResetBook(room, pid) {
  try {
    if (!room || typeof pid !== 'string' || !pid || (typeof room._econOff === 'function' && room._econOff())) return false;
    const live = room.playerState && room.playerState[pid];
    const rec = live && !live._spar ? live : await room.state.storage.get('rpg:' + pid);
    const cached = typeof room._bankMap === 'function' ? room._bankMap().get(pid) : null;
    const vault = cached || await room.state.storage.get('bank:' + pid);
    const ctx = worldCtx();
    if (rec) worldAdd(ctx, 'rpg:' + pid, rec);
    if (vault) worldAdd(ctx, 'bank:' + pid, vault);
    return bookAdd(room, 'econ', { r: { g: ctx.gold - ctx.net.gold, n: 1 } });
  } catch (e) { return false; }   /* a count must never stop a restart */
}

/* The seconds of the sittings still open, today's part (M3: the book counts
   a sitting's seconds when it ends, its gold as it is made, so "gold made a
   player-hour" read inside a sitting had the top without the bottom). */
function openSeconds(room, now) {
  const dayStart = Math.floor(now / 86400000) * 86400000;
  const seen = new Set();
  let s = 0;
  for (const sess of (room && room.sessions && typeof room.sessions.values === 'function' ? room.sessions.values() : [])) {
    if (!sess || !sess.id || seen.has(sess.id) || !(sess.openedAt > 0)) continue;
    seen.add(sess.id);
    s += Math.max(0, Math.round((now - Math.max(sess.openedAt, dayStart)) / 1000));
  }
  return { day: bookDay(now), s, sittings: seen.size };
}

/** The route's answer: { ok, on, metrics: [{day, world}], xfer: [summary], open }. */
export async function econCardRead(room, days) {
  const n = Math.max(1, Math.min(ECONCARD.DAYS_MAX, Math.floor(Number(days)) || 1));
  const on = !(room && typeof room._econOff === 'function' && room._econOff());
  if (!on) return { ok: true, on: false, metrics: [], xfer: [] };
  try {
    const page = await room.state.storage.list({ prefix: ECONCARD.METRICS_PREFIX, reverse: true, limit: n + 1 });
    const metrics = [];
    for (const [k, v] of page) {
      const w = v && v.world && typeof v.world === 'object' ? v.world : null;
      metrics.push({ day: k.slice(ECONCARD.METRICS_PREFIX.length), world: w });
    }
    const xfer = [];
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const day = xferDay(now - i * 86400000);
      const list = await xferList(room, day, ECONCARD.XFER_ROWS);
      xfer.push(xferSummary(day, list, list.length >= ECONCARD.XFER_ROWS));
    }
    return { ok: true, on: true, metrics, xfer, open: openSeconds(room, now) };
  } catch (e) {
    return { ok: false, error: 'read failed' };
  }
}
