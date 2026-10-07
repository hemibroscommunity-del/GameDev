/* ═══ v2.3.3134: THE FEED & SEED'S ORDER BOARD ═══
 *
 * Owner: "Farming needs a purpose. I think the best purpose it can serve are
 * temporary buffs (boss fights, PvP, dueling, etc) and source of income."
 *
 * The income half.  Diego buys crops, but he pays less as his pile grows
 * (shop.js) and never buys a dish, so he is a trickle that dries up.  The
 * plan's dependable source (docs/FARMING-PLAN.md, "What farming pays") is
 * this board: THREE ORDERS A DAY per player, each a bag key and a count --
 * "12 Carrots", "3 Pumpkin Pies" -- paid in gold and Farming XP when you
 * deliver it.  About 150 coins a day for a new farmer, up to 450 for a farm
 * that grows and cooks everything (POOL below), never more: a fixed number
 * of orders a day, each delivered once.
 *
 * A NEW BOARD EVERY UTC DAY, DRAWN ONCE.  The board is drawn the first time
 * it is read on a day (opening the Feed & Seed, or a delivery) from the
 * orders this player can fill themselves -- their Farming level grows the
 * crop, their Cooking level cooks the dish -- shuffled by a seed of their id
 * and the day, and STORED, so it does not change under them when they level
 * up or the worker restarts.  Nothing ticks: a day that ends in an empty
 * room is just a stale record the next read replaces (rule 12; the cadence
 * day key, cadence.js).
 *
 * ONE EVENT, BOTH WRITES (the farm's rule, farm.js header; the guild
 * claims' order, guilds.js).  A delivery loads the board (a storage await,
 * the input gate closed), checks the bag, then marks the order done and
 * takes the goods, pays the gold and the XP on the live player, and issues
 * the board's put and _saveRpg with no await between -- one batch.  The
 * board goes first, so were the two ever split a crash could cost a
 * delivery's pay, never pay it twice; and the order's own `done` is the
 * replay guard: a resent delivery finds it done and pays nothing.
 *
 * WHAT THE CLIENT MAY SAY: a slot number, 0..PER_DAY-1, and -- only as a
 * check -- the day and the order id it is looking at.  A board turns over at
 * midnight UTC under a window left open, and slot 0 of the new board is a
 * different order: a tap meant for yesterday's carrots must not hand in
 * today's pies.  So a delivery whose day or id is not the board's is
 * refused ('order-stale') and answered with the board as it is now.  Never a
 * key, a count or a price.  The board's ids are looked up in POOL with
 * hasOwnProperty; a stored id this worker does not know (a newer worker's,
 * after a rollback) shows as gone and cannot be delivered -- tomorrow's
 * board replaces it, nothing is lost.
 *
 * STORAGE (rule 2): `farmorders:<pid>` {v, day, ids: [id x3], done: [0|1 x3]}.
 * v2.3.3134 (review): the record CARRIES ITS SHAPE (`v`, the farm's FARM.V
 * rule) and is read FAIL-CLOSED.  Its `done` flags are the only thing that
 * stops a second payment, so a record this worker cannot read is never a
 * free delivery: a newer worker's (`v` above V) closes the board for the
 * day and is never written over; today's record in a shape it cannot read
 * delivers nothing; a done flag that is not exactly 0 reads as done.  And a
 * board is never replaced by an EARLIER day's: a worker clock that steps
 * back across midnight (a room moved to another machine) keeps the later
 * board instead of re-opening the day before.
 *
 * NOT IN A FIGHT WITH A PLAYER (v2.3.3134, review): a delivery within
 * PVP_HEAL.WINDOW_MS of a hit between players, or in a duel, is refused
 * ('order-fight').  In No man's land a player losing a fight could
 * otherwise turn the bag's goods into gold, which a white skull's death
 * keeps, just before the killer's pile would have taken them.
 *
 * A CHARACTER RESTART KEEPS TODAY'S BOARD (v2.3.3134, review), as the guild
 * claims are kept: its done flags are the day's limit, and deleting them let
 * one player id deliver the day's three orders again after every restart.
 * The restarted character sees the old board until midnight, then its own.
 *
 * DEPLOY ORDER (rule 19): caps.farmorders gates the window's Orders tab and
 * every farm_order send -- an older worker has no case for it and would
 * rebroadcast it to the room.  KILL SWITCH `farmorders: false`: the cap reads
 * false, farm_order answers err 'off', and farm_open sends no board.
 *
 * Spec: docs/specs/farm-orders.md.  Suite: server/test/farmorders.test.mjs. */

import { PVP_HEAL } from './data.js';

export const FARM_ORDERS = {
  /* The record's shape.  A change to it bumps this; an older worker then
     refuses the record whole instead of reading its delivered orders as
     undelivered (the farm's FARM.V, v2.3.3127). */
  V: 1,
  PER_DAY: 3,
  /* What a board is drawn from.  `key` is the bag key asked for (a crop, an
     herb, a dish or the Stamina Tonic, all made from what the farm grows),
     `n` how many, `gold` and `xp` (Farming) what one delivery pays, `farm`
     and `cook` the levels a player needs before it is drawn for them -- the
     Farming level of its crops (FARM.CROPS lvl) and the Cooking level of its
     recipe (COOKING_RECIPES cookLvl).  Every order pays more than Diego's
     opening price for its goods (half their `base`, shop.js), plus the XP,
     and Diego buys no dish at all.  APPEND only: an id in a stored board is
     looked up here. */
  POOL: [
    { id: 'carrots',     key: 'crop_carrot',      n: 12, gold: 50,  xp: 150, farm: 1,  cook: 0 },
    { id: 'firebloom',   key: 'herb_firebloom',   n: 6,  gold: 55,  xp: 200, farm: 1,  cook: 0 },
    { id: 'bread',       key: 'meal_herb_bread',  n: 3,  gold: 50,  xp: 250, farm: 1,  cook: 1 },
    { id: 'tonic',       key: 'staminaSalts',     n: 3,  gold: 40,  xp: 200, farm: 1,  cook: 1 },
    { id: 'rock_vine',   key: 'herb_rock_vine',   n: 6,  gold: 100, xp: 400, farm: 5,  cook: 0 },
    { id: 'potatoes',    key: 'crop_potato',      n: 9,  gold: 70,  xp: 350, farm: 5,  cook: 0 },
    { id: 'garden_stew', key: 'meal_garden_stew', n: 2,  gold: 80,  xp: 400, farm: 5,  cook: 4 },
    { id: 'cloudpetal',  key: 'herb_cloudpetal',  n: 4,  gold: 110, xp: 500, farm: 10, cook: 0 },
    { id: 'pumpkins',    key: 'crop_pumpkin',     n: 3,  gold: 120, xp: 600, farm: 10, cook: 0 },
    { id: 'root_stew',   key: 'meal_root_stew',   n: 2,  gold: 110, xp: 450, farm: 10, cook: 3 },
    { id: 'pies',        key: 'meal_pumpkin_pie', n: 3,  gold: 220, xp: 800, farm: 10, cook: 8 },
  ],
};

/* id -> order, read with hasOwnProperty. */
const BY_ID = Object.freeze(FARM_ORDERS.POOL.reduce((m, o) => { m[o.id] = o; return m; }, Object.create(null)));
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export function farmOrderById(id) { return own(BY_ID, id) ? BY_ID[id] : null; }

/* A skill's level as a whole number, 1 at least (farm.js _farmLevel's rule:
   a first join may have stored it as a string or a bare number). */
function skillLvl(ps, skill) {
  const s = ps && ps.lifeSkills && ps.lifeSkills[skill];
  const n = Math.floor(Number(s && typeof s === 'object' ? s.level : 1));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/* FNV-1a, then mulberry32: the same board for the same player on the same
   day, whichever worker draws it. */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The board for a player on a day: PER_DAY ids from the orders their levels
   can fill, in a shuffled order seeded by (pid, day).  Pure. */
export function drawFarmOrders(pid, day, farmLvl, cookLvl) {
  const fit = FARM_ORDERS.POOL.filter((o) => o.farm <= farmLvl && o.cook <= cookLvl).map((o) => o.id);
  const rand = mulberry32(hash32(String(pid) + ':' + String(day)));
  for (let i = fit.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = fit[i]; fit[i] = fit[j]; fit[j] = t;
  }
  return fit.slice(0, FARM_ORDERS.PER_DAY);
}

/* The next UTC midnight after `now`: when today's board is replaced. */
export function farmOrdersResetAt(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export const farmOrderMethods = {
  /* The kill switch, read the farm's way. */
  _farmOrdersOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'farmorders') && !f.farmorders);
  },

  /* Today's board for this player: the stored one when it is today's,
     otherwise a fresh draw (`fresh`, to be written by the caller).  Read
     FAIL-CLOSED (v2.3.3134, review; header): `newer` when the record is a
     newer worker's (no board, nothing written); today's record in a shape
     this worker cannot read delivers nothing; a done flag that is not
     exactly 0 reads as done; and a stored day LATER than today's is kept,
     never replaced by an earlier day's draw. */
  async _farmOrdersLoad(pid, ps, now) {
    const today = this._cadencePeriodDaily(now);
    const stored = await this.state.storage.get('farmorders:' + pid);
    if (stored && typeof stored === 'object') {
      const v = Number(stored.v);
      if (Number.isFinite(v) && v > FARM_ORDERS.V) return { rec: null, fresh: false, newer: true };
      const sd = stored.day;
      if (typeof sd === 'number' && Number.isFinite(sd) && sd >= today) {
        const okIds = Array.isArray(stored.ids);
        const okDone = Array.isArray(stored.done);
        const ids = [];
        const done = [];
        for (let i = 0; i < FARM_ORDERS.PER_DAY; i++) {
          const id = okIds ? stored.ids[i] : null;
          ids.push(typeof id === 'string' ? id : '');
          done.push(okDone && stored.done[i] === 0 ? 0 : 1);
        }
        return { rec: { v: FARM_ORDERS.V, day: sd, ids, done }, fresh: false, newer: false };
      }
    }
    const ids = drawFarmOrders(pid, today, skillLvl(ps, 'farming'), skillLvl(ps, 'cooking'));
    return { rec: { v: FARM_ORDERS.V, day: today, ids, done: ids.map(() => 0) }, fresh: true, newer: false };
  },

  /* v2.3.3134 (review): in a fight with a player -- a duel, or a hit between
     players within PVP_HEAL.WINDOW_MS (cooking.js's clock, _pvpHealClocks,
     stamped by every PvP exchange). */
  _farmOrderInFight(pid, now) {
    if (this._duelFor && this._duelFor(pid)) return true;
    const c = this._pvpHealClocks ? this._pvpHealClocks.get(pid) : null;
    return !!(c && typeof c.pvpAt === 'number' && now - c.pvpAt < PVP_HEAL.WINDOW_MS);
  },

  /* What the window is sent: each order as the worker knows it, and when the
     board turns over (the worker's clock, as the farm's beds). */
  _farmOrdersView(rec, now) {
    return {
      day: rec.day,
      resetsAt: farmOrdersResetAt(now),
      list: rec.ids.map((id, i) => {
        const o = farmOrderById(id);
        if (!o) return { id: '', gone: 1, done: rec.done[i] };
        return { id: o.id, key: o.key, n: o.n, gold: o.gold, xp: o.xp, done: rec.done[i] };
      }),
    };
  },

  _farmOrdersPut(pid, rec) {
    const p = this.state.storage.put('farmorders:' + pid, rec);
    if (p && p.catch) p.catch(() => { /* the next read draws or rewrites it */ });
  },

  /* For farm_open: today's board, written the first time it is drawn so it
     stays put for the day.  Null when the board is switched off, or when
     the record is a newer worker's (the board is closed, never overwritten). */
  async _farmOrdersForOpen(pid, ps, now) {
    if (this._farmOrdersOff()) return null;
    const { rec, fresh, newer } = await this._farmOrdersLoad(pid, ps, now);
    if (newer) return null;
    if (fresh) this._farmOrdersPut(pid, rec);
    return this._farmOrdersView(rec, now);
  },

  /* farm_order { slot, day, id } -- deliver one of today's orders from the
     bag.  Answers farm_state with the board and `did` (what it paid) or
     `err`. */
  async _handleFarmOrder(session, payload) {
    const ps = this._farmPs(session);
    if (!ps) return null;
    const pid = session.id;
    /* `orders: null` with it (v2.3.3134, review): the window drops the board
       it was showing and says the board is closed -- a page keeps the caps
       it joined with, so a switch thrown mid-session left Deliver lit. */
    if (this._farmOff() || this._farmOrdersOff()) { this._farmSend(pid, { err: 'off', orders: null, did: { op: 'order', n: 0 } }); return null; }
    if (!this._farmRateOk(pid)) return null;
    const slot = payload && payload.slot;
    if (!Number.isInteger(slot) || slot < 0 || slot >= FARM_ORDERS.PER_DAY) return null;
    const now = Date.now();
    const { rec, fresh, newer } = await this._farmOrdersLoad(pid, ps, now);
    if (newer) { this._farmSend(pid, { err: 'newer', orders: null, did: { op: 'order', n: 0, slot } }); return null; }
    const refuse = (err) => {
      if (fresh) this._farmOrdersPut(pid, rec);
      const ans = { orders: this._farmOrdersView(rec, now), err, did: { op: 'order', n: 0, slot } };
      this._farmSend(pid, ans);
      return ans;
    };
    if (payload.day !== rec.day || payload.id !== rec.ids[slot]) return refuse('order-stale');
    const o = farmOrderById(rec.ids[slot]);
    if (!o) return refuse('order-gone');
    if (rec.done[slot]) return refuse('order-done');
    if (this._farmOrderInFight(pid, now)) return refuse('order-fight');
    /* proto-ok: o.key is a POOL key (this file's own table), never the wire's */
    const have = Math.floor(Number(ps.inventory[o.key]) || 0);
    if (have < o.n) {
      /* v2.3.3134 (review): an honest page lights Deliver only when ITS bag
         holds enough, so a short answer means its bag is wrong (a cook the
         worker never heard, its dish drawn in the bag anyway).  The bag goes
         again -- a v2 echo of nothing that changed sends nothing (cooking.js,
         v2.3.3130). */
      const w = this._wsBySessionId(pid);
      if (w && this._resendPlayerState) this._resendPlayerState(w, pid, ['inventory']);
      return refuse('order-short');
    }

    /* The order turns BEFORE anything is paid, and nothing between the pay
       and the writes can throw except the XP, which is last and caught
       (farm.js's harvest, v2.3.3127). */
    rec.done[slot] = 1;
    if (have - o.n > 0) ps.inventory[o.key] = have - o.n;
    else delete ps.inventory[o.key];
    ps.coins = Math.max(0, Math.floor(Number(ps.coins) || 0)) + o.gold;
    const fromLevel = skillLvl(ps, 'farming');
    let leveled = false;
    let newLevel = fromLevel;
    try {
      const res = this._addLifeSkillXp(ps, 'farming', o.xp);
      leveled = !!res.leveled;
      newLevel = res.newLevel;
    } catch (e) {
      console.error('[farm] order XP for', pid, e && e.message);
    }
    /* One batch: the board's put, then _saveRpg, no await between. */
    this._farmOrdersPut(pid, rec);
    this._saveRpg(pid, ps);
    const ws = this._wsBySessionId(pid);
    if (ws) this._sendPlayerState(ws, pid);
    const did = { op: 'order', n: 1, slot, item: o.key, count: o.n, gold: o.gold, xp: o.xp, leveled, fromLevel, newLevel };
    const ans = { orders: this._farmOrdersView(rec, now), did };
    this._farmSend(pid, ans);
    return ans;
  },
};
