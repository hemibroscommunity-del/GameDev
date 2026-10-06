/* ═══ v2.3.3102: THE FARM, SETTLED BY THE WORKER (Phase 1) ═══
 *
 * Owner, 2026-10-06: "Research how farming can work in my game.  I'm
 * thinking mechanics similar to the old FarmVille game where you have to
 * wait to harvest and each has a wait time different depending on what it
 * is.  Need to dig, plant seeds, fertilize, water, etc."  Then, on the
 * research (docs/FARMING-PLAN.md): "Good.  Go ahead and build it".
 *
 * This is the plan's Phase 1: the Feed & Seed window becomes a real farm the
 * worker settles.  Until now that window planted and harvested in the
 * browser only (FarmPanel.jsx wrote localStorage and sent nothing), so the
 * next player_state quietly undid every harvest, and its "seeds" were item
 * keys the worker has never minted -- a current player saw "No seeds" and
 * nothing else.  Rule zero (ARCHITECTURE-HANDOFF): the migration direction is
 * always client -> server.
 *
 * THE LOOP
 *   rough --dig--> tilled --plant (one seed)--> planted --(time)--> ripe
 *   ripe --harvest--> rough again, the crop in the bag and Farming XP paid.
 *   Water and fertilizer are OPTIONAL boosts with a payoff you can see:
 *   watering makes a crop ready 25% sooner (WATER_TIME), and one bag of
 *   compost makes its harvest half again as big (FEED_YIELD).  Forgetting
 *   them costs a little time or a little yield, never the crop: the plan's
 *   research found that withering (FarmVille's) and water as a GATE
 *   (FarmVille 2's well) were the two things players hated most.
 *
 * NOTHING WITHERS, NOTHING TICKS.  A planted bed stores the server-clock
 * moment it ripens (`readyAt`); it is ripe when Date.now() passes it.  The
 * worker never wakes up for a crop -- there are no alarms in this codebase
 * and the tick stops when the room empties (rule 12) -- it just compares the
 * stored time with the clock whenever the farm is read: on opening the
 * window, on every action, and on join.  So crops grow while their owner is
 * offline and while the room is empty, exactly like the food buffs' endsAt
 * (cooking.js), and a ripe crop waits in the ground for as long as it takes.
 *
 * STORAGE (rule 1, rule 2).  One record per player, `farm:<pid>`, never a
 * field on the rpg blob (whose fixed field list would drop it).  One record
 * rather than a key per bed: one row written per action.  Created on first
 * use with FREE_BEDS rough beds -- the free deed the owner asked the Land
 * Office to hand out ("you get a free plot from the land office"); buying
 * more land there is Phase 3.
 *
 * ONE EVENT, BOTH WRITES (rules 8 and 9).  Every action loads the record
 * (a storage await, which keeps the input gate closed), then changes the
 * record and the player's bag in memory and issues BOTH puts -- the farm
 * record first, then _saveRpg -- with no await between them, so the
 * Durable Object commits them as one batch.  Were they ever split, the farm
 * record going first means a crash could lose a harvest but never pay one
 * twice (the guild-claims order, guilds.js); a planting could keep its seed,
 * a few coins, never take two.  The bed's own state is the replay guard: a
 * resent harvest finds a rough bed and pays nothing -- which holds only
 * because the bed turns BEFORE anything is paid and nothing between the pay
 * and the commit can throw (v2.3.3102, the harvest branch).
 *
 * WHAT THE CLIENT MAY SAY.  Bed indexes (clamped, deduplicated) and a crop
 * id looked up with hasOwnProperty, so '__proto__' / 'constructor' resolve to
 * nothing (TRAPS #6).  Never a time, a yield or a bed's contents.  Farming XP
 * is paid ONLY at harvest -- never for digging or planting -- which closes
 * FarmVille's plant-delete-replant power-levelling before it can start.
 *
 * DEPLOY ORDER (rule 19).  caps.farm gates the client's new window and every
 * farm send: against an OLD worker the flag is absent and the window keeps
 * its old face, because that worker has no case for farm_act and would
 * REBROADCAST it to the room while settling nothing.  Against a NEW worker an
 * old client never sends one.  KILL SWITCH: `farm: false` in liveflags
 * un-advertises the cap AND answers every farm message with err 'off';
 * beds, seeds and crops are untouched and keep their times.
 *
 * A NEWER RECORD (v2.3.3102).  Every record says which shape it is
 * (FARM.V).  A record from a newer worker is refused whole -- err 'newer',
 * nothing read into it or written back -- so a rollback to this worker can
 * cost a farm visit but never the beds of a crop it does not know.  A phase
 * that changes the record must bump FARM.V.
 *
 * Spec: docs/specs/farm.md.  Suite: server/test/farm.test.mjs.  The crop
 * table is mirrored in src/data/farmCrops.js and pinned by mirror-audit. */

export const FARM = {
  /* v2.3.3102: the shape of a `farm:<pid>` record this worker reads and
     writes.  A later phase that adds a crop, a field or a state to the
     record BUMPS it, and this worker refuses to write a record newer than
     it knows (err 'newer', read nothing into it, write nothing).  Without
     that, a Cloudflare rollback to this worker rebuilt a newer record from
     the fields it knows on the first action and wrote it back: every bed
     of a crop it had never heard of became grass, for good (the review
     showed it on a copy; the owner: "Yes fix all of your recommended
     fixes").  Not mirrored on the client: the window never reads it. */
  V: 1,
  /* The free deed: six beds, the plan's starter farm. */
  FREE_BEDS: 6,
  /* The most a farm can ever hold (the Land Office's top step, Phase 3) --
     about as many beds as one finger can drag across on a phone. */
  MAX_BEDS: 25,
  /* A watered crop takes this share of its time: ready 25% sooner. */
  WATER_TIME: 0.75,
  /* A fertilized crop's harvest is this many times as big. */
  FEED_YIELD: 1.5,
  /* One bag of compost per bed, sold at the Feed & Seed. */
  COMPOST: 'compost',
  COMPOST_PRICE: 4,
  /* Most seeds or compost one tap can buy. */
  BUY_MAX: 50,
  /* Farm messages a player may send in a minute.  Each action is one write
     of one small record, so this is a bound on a script, not on a person: a
     drag across every bed is ONE message, and the quickest hand tapping bed
     by bed stays well under it. */
  MSG_PER_MIN: 90,
  /* The starter crops.  Two short ones that reward being on the farm, two
     long ones that reward coming back.  Three of the four are the exact herb
     keys the Cookhouse's recipes already ask for (COOKING_RECIPES in
     data.js), which until now nothing in the game could make.
       seed   the bag key a planting takes, sold at the Feed & Seed for price
       item   the bag key a harvest pays
       lvl    Farming level to buy and plant (the owner's "levels of 5")
       mins   minutes to ripen UNWATERED (watered: x WATER_TIME)
       yield  crops per bed (fertilized: x FEED_YIELD)
       xp     Farming XP per bed harvested
       base   Diego's base value for the crop (shop.js): he pays half of it
              into an empty pile and less as his pile grows. */
  CROPS: {
    carrot:     { name: 'Carrot',     seed: 'seed_carrot',     item: 'crop_carrot',     lvl: 1,  price: 2,  mins: 8,   yield: 2, xp: 25,  base: 8 },
    firebloom:  { name: 'Firebloom',  seed: 'seed_firebloom',  item: 'herb_firebloom',  lvl: 1,  price: 5,  mins: 40,  yield: 2, xp: 50,  base: 16 },
    rock_vine:  { name: 'Rock Vine',  seed: 'seed_rock_vine',  item: 'herb_rock_vine',  lvl: 5,  price: 10, mins: 320, yield: 2, xp: 120, base: 30 },
    cloudpetal: { name: 'Cloudpetal', seed: 'seed_cloudpetal', item: 'herb_cloudpetal', lvl: 10, price: 15, mins: 640, yield: 2, xp: 180, base: 40 },
  },
};

/* The five things a hand can do to a bed.  A null-prototype map read with
   hasOwnProperty, so no inherited name is ever an op. */
const OPS = Object.freeze(Object.assign(Object.create(null), {
  dig: true, plant: true, water: true, feed: true, harvest: true,
}));
const STATES = Object.freeze(Object.assign(Object.create(null), {
  rough: true, tilled: true, planted: true,
}));

const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* How long a crop takes, in ms, watered or not. */
export function farmGrowMs(crop, watered) {
  return Math.round(crop.mins * 60000 * (watered ? FARM.WATER_TIME : 1));
}

/* What one bed pays.  A fractional fertilized yield (a 3-crop bed would
   give 4.5) is the whole part plus a chance at one more, so the AVERAGE is
   exactly FEED_YIELD -- the four starter crops all yield 2, so 3 exactly. */
export function farmYield(crop, fed, rand = Math.random) {
  if (!fed) return crop.yield;
  const q = crop.yield * FARM.FEED_YIELD;
  const whole = Math.floor(q);
  return whole + (rand() < q - whole ? 1 : 0);
}

/* The seed key -> crop id map the buy path reads.  Built once from CROPS. */
const SEED_TO_CROP = Object.freeze(Object.keys(FARM.CROPS).reduce((m, id) => {
  m[FARM.CROPS[id].seed] = id; return m;
}, Object.create(null)));

/* Diego's base values for everything the farm makes or sells (shop.js
   spreads this into SHOP.BASE).  Without them every farm key fell to his
   BASE_DEFAULT of 20 -- he would have paid 10 for a 2-coin seed, a gold
   faucet the size of a click.  A seed's value is its Feed & Seed price and
   compost's is its own, so with his half-price spread selling him one you
   just bought is always a loss; a crop's value is the plan's (`base`). */
export const FARM_SHOP_BASE = Object.freeze(Object.keys(FARM.CROPS).reduce((m, id) => {
  const c = FARM.CROPS[id];
  m[c.seed] = c.price;
  m[c.item] = c.base;
  return m;
}, { [FARM.COMPOST]: FARM.COMPOST_PRICE }));

const clampInt = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
};

export const farmMethods = {
  /* The kill switch, read the storeGear / smelting way. */
  _farmOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'farm') && !f.farm);
  },

  _farmNew() {
    const plots = [];
    for (let i = 0; i < FARM.FREE_BEDS; i++) plots.push({ s: 'rough' });
    return { v: FARM.V, beds: FARM.FREE_BEDS, plots };
  },

  /* Whatever storage holds, hand back a record every reader can trust: the
     bed count inside its bounds, one plot per bed, and every planted plot
     naming a real crop with finite times.  Anything else is a rough bed --
     a planted bed that cannot be read is never a free harvest. */
  _farmHeal(rec) {
    if (!rec || typeof rec !== 'object') return this._farmNew();
    const beds = clampInt(rec.beds, FARM.FREE_BEDS, FARM.MAX_BEDS);
    const src = Array.isArray(rec.plots) ? rec.plots : [];
    const plots = [];
    for (let i = 0; i < beds; i++) {
      const p = src[i];
      if (!p || typeof p !== 'object' || !own(STATES, p.s)) { plots.push({ s: 'rough' }); continue; }
      if (p.s !== 'planted') { plots.push({ s: p.s }); continue; }
      if (!own(FARM.CROPS, p.crop) || !Number.isFinite(p.plantedAt) || !Number.isFinite(p.readyAt)) {
        plots.push({ s: 'rough' }); continue;
      }
      plots.push({ s: 'planted', crop: p.crop, plantedAt: p.plantedAt, readyAt: p.readyAt, water: p.water ? 1 : 0, feed: p.feed ? 1 : 0 });
    }
    return { v: FARM.V, beds, plots };
  },

  /* v2.3.3102: written by a newer worker (FARM.V above): never healed, never
     written, never paid from.  Only the worker writes these records, so `v`
     is always a number. */
  _farmNewer(stored) {
    return !!stored && typeof stored === 'object' && Number.isFinite(stored.v) && stored.v > FARM.V;
  },

  async _farmLoad(pid) {
    const stored = await this.state.storage.get('farm:' + pid);
    if (!stored) return { rec: this._farmNew(), fresh: true };
    if (this._farmNewer(stored)) return { rec: null, fresh: false, newer: true };
    return { rec: this._farmHeal(stored), fresh: false };
  },

  /* What the window is sent.  `now` is the worker's clock, so a phone whose
     own clock is wrong still counts down to the right moment (the client
     subtracts its arrival time, never its own idea of the date). */
  _farmView(rec, now) {
    return {
      beds: rec.beds,
      now,
      plots: rec.plots.map((p) => (p.s === 'planted'
        ? { s: 'planted', crop: p.crop, plantedAt: p.plantedAt, readyAt: p.readyAt, water: p.water ? 1 : 0, feed: p.feed ? 1 : 0 }
        : { s: p.s })),
    };
  },

  _farmSend(pid, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'farm_state', payload })); } catch (e) { /* the farm is saved */ }
  },

  /* A fixed one-minute window per player, in memory.  A deploy resets it,
     which buys a script one more minute at most; a reconnect does not, as it
     is keyed by player id.  v2.3.3102: windows already over are swept once
     the map passes 256 players, so it never grows past the farmers of the
     last minute (it was never pruned, and its comment said a reconnect
     reset it). */
  _farmRateOk(pid) {
    if (!this._farmRate) this._farmRate = new Map();
    const now = Date.now();
    if (this._farmRate.size > 256) {
      for (const [k, w] of this._farmRate) if (now - w.t0 >= 60000) this._farmRate.delete(k);
    }
    let r = this._farmRate.get(pid);
    if (!r || now - r.t0 >= 60000) { r = { t0: now, n: 0 }; this._farmRate.set(pid, r); }
    r.n += 1;
    return r.n <= FARM.MSG_PER_MIN;
  },

  /* v2.3.3102: the player's Farming level as a whole number, 1 at least,
     whatever the record holds -- a first join stores the client's life
     skills as sent (join.js), so a level could be a string or the skill a
     bare number.  A string compared with a crop's level was coerced, and a
     bare number read as 1 by luck. */
  _farmLevel(ps) {
    const s = ps.lifeSkills && ps.lifeSkills.farming;
    const n = Math.floor(Number(s && typeof s === 'object' ? s.level : 1));
    return Number.isFinite(n) && n >= 1 ? n : 1;
  },

  /* Who may farm right now: a live, joined player.  Returns their state. */
  _farmPs(session) {
    if (!session || !session.id) return null;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    if (!ps.inventory) ps.inventory = {}; // proto-ok: keys written here come from FARM's own table
    return ps;
  },

  /* Commit a changed farm (and the bag it paid into) as one batch: the farm
     record's put is ISSUED first and _saveRpg's in the same synchronous run,
     no await between -- see the header. */
  _farmCommit(pid, ps, rec) {
    const p = this.state.storage.put('farm:' + pid, rec);
    if (p && p.catch) p.catch(() => { /* the next action rewrites the whole record */ });
    if (ps) this._saveRpg(pid, ps);
  },

  async _handleFarmOpen(session, payload) {
    const ps = this._farmPs(session);
    if (!ps) return null;
    if (this._farmOff()) { this._farmSend(session.id, { err: 'off' }); return null; }
    if (!this._farmRateOk(session.id)) return null;
    const { rec, fresh, newer } = await this._farmLoad(session.id);
    if (newer) { this._farmSend(session.id, { err: 'newer' }); return null; }
    /* The free deed is written the first time it is opened, so the record
       exists from then on (and a second tab sees the same rough beds). */
    if (fresh) this._farmCommit(session.id, null, rec);
    const view = this._farmView(rec, Date.now());
    this._farmSend(session.id, view);
    return view;
  },

  /* farm_act { op, beds: [i, ...], crop? } -- one message for a tap or a
     whole drag across the beds.  Applies the op to every bed it fits and
     skips the rest; answers farm_state with `did` (what happened) or `err`
     (why nothing did). */
  async _handleFarmAct(session, payload) {
    const ps = this._farmPs(session);
    if (!ps) return null;
    if (this._farmOff()) { this._farmSend(session.id, { err: 'off' }); return null; }
    if (!this._farmRateOk(session.id)) return null;
    const op = payload && payload.op;
    if (!own(OPS, op)) return null;
    const rawBeds = payload && payload.beds;
    if (!Array.isArray(rawBeds)) return null;

    const { rec, newer } = await this._farmLoad(session.id);
    if (newer) { this._farmSend(session.id, { err: 'newer' }); return null; }
    const now = Date.now();
    /* Bed indexes: integers inside this farm, each once, in the order given
       (the order a finger dragged across them -- seeds run out in that
       order).  Sliced first so a forged million-entry array costs nothing. */
    const seen = new Set();
    const beds = [];
    for (const i of rawBeds.slice(0, FARM.MAX_BEDS * 2)) {
      /* Whole numbers only: Number(null) is 0 and Number('2') is 2, and a bed
         the client did not name must never be the one acted on. */
      if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= rec.beds || seen.has(i)) continue;
      seen.add(i); beds.push(i);
    }
    if (!beds.length) return null;

    const level = this._farmLevel(ps);
    const did = { op, n: 0 };
    let err = null;

    if (op === 'dig') {
      for (const i of beds) {
        if (rec.plots[i].s !== 'rough') continue;
        rec.plots[i] = { s: 'tilled' };
        did.n += 1;
      }
    } else if (op === 'plant') {
      const cropId = payload.crop;
      if (!own(FARM.CROPS, cropId)) return null;
      const crop = FARM.CROPS[cropId];
      did.crop = cropId;
      if (level < crop.lvl) {
        err = 'level';
      } else {
        let seeds = Math.floor(Number(ps.inventory[crop.seed]) || 0);
        for (const i of beds) {
          if (rec.plots[i].s !== 'tilled') continue;
          if (seeds <= 0) { err = 'no-seeds'; break; }
          seeds -= 1;
          rec.plots[i] = { s: 'planted', crop: cropId, plantedAt: now, readyAt: now + farmGrowMs(crop, false), water: 0, feed: 0 };
          did.n += 1;
        }
        if (did.n > 0) {
          if (seeds > 0) ps.inventory[crop.seed] = seeds; else delete ps.inventory[crop.seed];
          did.used = { [crop.seed]: did.n };
        }
      }
    } else if (op === 'water') {
      /* Only a crop still growing: watering a ripe one would do nothing.
         Watering re-times the WHOLE crop, so it pays in full whenever it is
         done -- forgetting until later is never punished. */
      for (const i of beds) {
        const p = rec.plots[i];
        if (p.s !== 'planted' || p.water || now >= p.readyAt) continue;
        p.water = 1;
        p.readyAt = p.plantedAt + farmGrowMs(FARM.CROPS[p.crop], true);
        did.n += 1;
      }
    } else if (op === 'feed') {
      let bags = Math.floor(Number(ps.inventory[FARM.COMPOST]) || 0);
      for (const i of beds) {
        const p = rec.plots[i];
        if (p.s !== 'planted' || p.feed) continue;
        if (bags <= 0) { err = 'no-compost'; break; }
        bags -= 1;
        p.feed = 1;
        did.n += 1;
      }
      if (did.n > 0) {
        if (bags > 0) ps.inventory[FARM.COMPOST] = bags; else delete ps.inventory[FARM.COMPOST];
        did.used = { [FARM.COMPOST]: did.n };
      }
    } else if (op === 'harvest') {
      /* v2.3.3102: THE BED FIRST, THEN THE BAG, AND NOTHING BETWEEN THEM AND
         THE COMMIT THAT CAN THROW.  The first cut paid each bed's crops, then
         its Farming XP, then turned the bed back to grass.  `_addLifeSkillXp`
         threw on a life skill stored as a bare number (a first join copied
         the client's as sent: migrations.js healLifeSkillLevels), so the bed
         was never turned and _farmCommit never ran, and the router's catch
         swallowed it all.  The crops stayed in the bag and the bed stayed ripe
         in storage, so the same bed paid again on every message (review
         finding: 1 seed, unbounded carrots).  The bed is the replay guard
         (the header), so it changes before anything is paid, the way
         gathering's node dies before its strike pays.  The XP comes last,
         inside a try: if it fails, the harvest loses its XP but is never
         paid twice. */
      const items = Object.create(null);
      const picked = [];
      for (const i of beds) {
        const p = rec.plots[i];
        if (p.s !== 'planted' || now < p.readyAt) continue;
        const crop = FARM.CROPS[p.crop];
        const q = farmYield(crop, !!p.feed);
        rec.plots[i] = { s: 'rough' };
        items[crop.item] = (items[crop.item] || 0) + q;
        picked.push(crop);
        did.n += 1;
      }
      if (did.n > 0) {
        for (const k of Object.keys(items)) {
          ps.inventory[k] = (Math.floor(Number(ps.inventory[k]) || 0)) + items[k];
        }
        let xp = 0;
        let leveled = false;
        let newLevel = level;
        try {
          /* Per bed, not one lump: the level curve is per level (smelting.js). */
          for (const crop of picked) {
            const res = this._addLifeSkillXp(ps, 'farming', crop.xp);
            if (res.leveled) leveled = true;
            newLevel = res.newLevel;
            xp += crop.xp;
          }
        } catch (e) {
          console.error('[farm] harvest XP for', session.id, e && e.message);
        }
        did.items = { ...items };
        did.xp = xp;
        did.leveled = leveled;
        did.fromLevel = level;
        did.newLevel = newLevel;
      }
    }

    if (did.n > 0) {
      /* dig and water change only the farm; plant, feed and harvest change
         the bag too.  _saveRpg for those three only. */
      const bagChanged = op === 'plant' || op === 'feed' || op === 'harvest';
      this._farmCommit(session.id, bagChanged ? ps : null, rec);
      const view = this._farmView(rec, now);
      view.did = did;
      if (err) view.err = err;   /* e.g. seeds ran out partway through a drag */
      this._farmSend(session.id, view);
      if (bagChanged) {
        const ws = this._wsBySessionId(session.id);
        if (ws) this._sendPlayerState(ws, session.id);
      }
      return view;
    }
    const view = this._farmView(rec, now);
    view.err = err || 'nothing';
    view.did = did;
    this._farmSend(session.id, view);
    return view;
  },

  /* farm_buy { item, count } -- seeds and compost at the Feed & Seed.  A
     seed is sold only to a farmer who can plant it (the window shows it
     locked), and never part of an order: the whole order or nothing. */
  async _handleFarmBuy(session, payload) {
    const ps = this._farmPs(session);
    if (!ps) return null;
    if (this._farmOff()) { this._farmSend(session.id, { err: 'off' }); return null; }
    if (!this._farmRateOk(session.id)) return null;
    const item = payload && payload.item;
    let price;
    if (item === FARM.COMPOST) {
      price = FARM.COMPOST_PRICE;
    } else if (own(SEED_TO_CROP, item)) {
      const crop = FARM.CROPS[SEED_TO_CROP[item]];
      if (this._farmLevel(ps) < crop.lvl) { this._farmSend(session.id, { err: 'level', did: { op: 'buy', item, n: 0 } }); return null; }
      price = crop.price;
    } else {
      return null;
    }
    const count = clampInt(payload.count, 1, FARM.BUY_MAX);
    const cost = price * count;
    if ((ps.coins || 0) < cost) { this._farmSend(session.id, { err: 'coins', did: { op: 'buy', item, n: 0 } }); return null; }
    /* One event, live state (the jackpot deposit's shape): the coins and the
       bag change together and _saveRpg writes both. */
    ps.coins -= cost;
    ps.inventory[item] = (Math.floor(Number(ps.inventory[item]) || 0)) + count;
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
    const did = { op: 'buy', item, n: count, cost };
    this._farmSend(session.id, { did });
    return did;
  },

  /* On join: if this player has a farm, send it, flagged `login`, so the
     game can say how many beds are ready without the window being opened.
     Never creates the record (a player who has never farmed gets nothing)
     and never throws into the join. */
  async _farmOnJoin(pid) {
    try {
      if (this._farmOff()) return;
      const stored = await this.state.storage.get('farm:' + pid);
      if (!stored || this._farmNewer(stored)) return;
      const view = this._farmView(this._farmHeal(stored), Date.now());
      view.login = true;
      this._farmSend(pid, view);
    } catch (e) { /* a farm that cannot be read never blocks a join */ }
  },
};
