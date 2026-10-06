/* ═══ v2.3.3109: DAILY REWARDS — a free spin, three daily quests, a season ═══
 *
 * Owner, 2026-10-06, with a brief on what works in top-grossing games: "a
 * layered system: a small reward just for logging in, daily quests that get
 * people playing, and both feeding a longer progression track like a battle
 * pass" -- daily quests over pure login rewards, dailies tied to a long-term
 * goal, FORGIVING streaks (a missed day pauses, a "freeze" saves a streak),
 * an escalating big payoff, a bit of variability, 5-15 minute sessions; and
 * the mistakes to avoid: rewards too small for the economy, too many
 * overlapping dailies, harsh streak resets, quests that push play styles
 * people don't enjoy.
 *
 * Then, mid-build: "Personally I find the login page with the chest
 * intrusive.  I'd rather have it be something like a free daily spin from
 * the gambling building where you can win quite good rewards but it's rare.
 * Like a layered reward spin system where the first win has a 50% chance and
 * it continues further spins at a 50% win chance and the rewards double each
 * time."  And: "You can remove the daily chest and just do the gambling
 * spin like I said."
 *
 * So nothing here opens on login.  Three layers, each found where it lives:
 *
 *   1. THE FREE DAILY SPIN, at the Gambling Den (DAILY.SPIN).  One free spin
 *      a UTC day, and the owner's twist on it (2026-10-06, after a first cut
 *      that climbed a doubling ladder): "Your first spin is for a lump sum
 *      award.  You have a rare chance at a high lump sum in gold.  Then you
 *      have the option of spinning it for double or nothing at 50% odds and
 *      that continues on."  So the spin lands on a LUMP SUM from PRIZES
 *      (usually 25-200; 1 in 25 a thousand or more; 1 in 1,000 the 10,000
 *      jackpot), raised by the login STREAK (+10% a day, to +60% at 7).  That
 *      is a POT, not yet paid: TAKE IT, or DOUBLE OR NOTHING -- 50% to double
 *      it, 50% to lose it all -- as often as you dare, until one more double
 *      would pass the HOUSE LIMIT, POT_MAX (then it is paid by itself).  The pot lives in the record (money at
 *      rest, rule 7: a deploy loses nothing), and one left open at the day's
 *      end is PAID then, never lost.  Doubling is a fair coin for x2, so it
 *      never changes what the spin pays on average -- it only spreads it.
 *      BONUS SPINS (extra spins) come from the daily quests and the season.
 *      Each act -- spin, double, take -- is one input-gated event, the shape
 *      of Ace's coin flip (gamble.js, handoff rule 8).
 *   2. THREE DAILY QUESTS (DAILY.QUESTS), rolled for each player each UTC
 *      day once the first quest is handed in (tut_1: before that you cannot
 *      leave the commons).  One FIGHT, one GATHER when you hold a tool, one
 *      more from anything you can do -- short (a few minutes each), counted
 *      by the worker at the same choke points the story quests use, paid the
 *      moment they finish (no claim step to forget), and ONE free reroll a
 *      day that may draw from ANY pool, so nobody is pushed into a play style
 *      they do not enjoy.  All three done: a bonus star and a bonus spin.
 *   3. THE SEASON (DAILY.SEASON): 28 days from a fixed Monday.  Stars come
 *      from each daily quest, the all-three bonus and the day's free spin;
 *      every STARS_PER_TIER stars opens a tier with a reward to CLAIM, the
 *      milestones every fifth tier and the last the biggest.  A missed day
 *      just pauses (stars never go down), unclaimed tiers are MAILED when the
 *      season ends (nothing is lost for being away), and stars past the last
 *      tier keep paying a bonus spin every OVERFLOW_STARS.
 *
 * THE STREAK stays where it always lived, cadence.js (`cadence:login:<pid>`),
 * now with FREEZES: one earned every FREEZE_EVERY days of streak, at most
 * FREEZE_MAX held, spent automatically on a missed day.  A missed day with no
 * freeze resets the streak -- and costs only the spin's streak bonus; the
 * season's stars never reset.
 *
 * STORAGE: ONE key per player, `daily_rewards:<pid>` (handoff rule-2 table):
 *   { _v, sp: {day, free, open, pot, k, i, run, extra},
 *         dq: {day, list: [{t, p, g, n, d, c}], rr, all},
 *         se: {s, st, cl: [tier...], ov} }
 * Cached in memory while the player is online (`_drMap`), written at once
 * on every value-bearing change (a spin, a finished quest, a claim, a reroll,
 * a new day), and progress-only changes (a kill towards "defeat 15") flushed
 * by the tick every SAVE_MS and on disconnect -- the regen-save posture
 * (handoff rule 4): a deploy can lose a few seconds of COUNTING, never a
 * reward.  Coins from quests and the season go through `_creditPlayer` with
 * deterministic opIds (rules 4/5), so a mailed season reward and a claimed
 * one can never both pay.
 *
 * WIRE (docs/specs/daily-rewards.md):
 *   client -> worker: rewards_get {} | daily_spin {act, opId} | daily_reroll {i}
 *                     | season_claim {tier} or {all: true}
 *   worker -> client: rewards_state {..., news?}  (PRIVILEGED: it names coins)
 *                     daily_progress {i, n}        (PRIVILEGED)
 * DEPLOY ORDER (rule 19): caps.dailyspin gates the Gambling Den's spin and
 * caps.dailyquests the daily quests and the season.  Both are KILL SWITCHES
 * the admin flags route can throw (lower case, TRAPS §117): `dailyspin:
 * false` un-advertises the cap and refuses every spin; `dailyquests: false`
 * stops the counting, the rerolls and the claims.  Nothing is taken away by
 * either -- the record waits. */
import { WHEEL } from './wheelzone.js';
import { RARE_GEM_KEY } from './data.js';

const DAY_MS = 86400000;

export const DAILY = {
  KEY: 'daily_rewards:',
  /* progress-only changes are written at most this often (and on close) */
  SAVE_MS: 30000,
  /* how often the tick looks for dirty records and a new UTC day */
  TICK_MS: 10000,

  SPIN: {
    /* The lump sums the spin lands on, with their weights out of 1,000.
       Sized against the economy as it stands (v2.3.3109): a monster drops ~5
       gold at level 1 and ~13 at 30, an hour of fighting earns ~1-2k, the
       forge's weapon tiers cost 8-120 gold to level 30.  So most spins are a
       snack, 1 in 25 is a thousand or more, and 1 in 1,000 is the jackpot:
       "a rare chance at a high lump sum in gold".  On average 144 coins a
       spin (230 at a 7-day streak); doubling never changes that average. */
    PRIZES: Object.freeze([
      Object.freeze({ coins: 25, w: 400 }),
      Object.freeze({ coins: 50, w: 250 }),
      Object.freeze({ coins: 100, w: 150 }),
      Object.freeze({ coins: 200, w: 100 }),
      Object.freeze({ coins: 400, w: 60 }),
      Object.freeze({ coins: 1000, w: 30 }),
      Object.freeze({ coins: 2500, w: 9 }),
      Object.freeze({ coins: 10000, w: 1 }),
    ]),
    STREAK_PCT: 10,      /* the lump sum +10% per streak day past the first ... */
    STREAK_CAP: 7,       /* ... up to a 7-day streak: x1.6 */
    DOUBLE_CHANCE: 0.5,  /* owner: "double or nothing at 50% odds" */
    /* "and that continues on" -- until one more double would pass the HOUSE
       LIMIT; a pot that can double no further is paid by itself.  The limit
       keeps one lucky run from flooding the auction house.  A 10,000 jackpot
       can still double three times, to 80,000; the everyday 25 eleven
       times, to 51,200. */
    POT_MAX: 100000,
    EXTRA_MAX: 20,       /* bonus spins banked at most */
    COOLDOWN_MS: 450,    /* between two acts (the wheel turns for longer than this) */
  },

  STREAK: {
    FREEZE_EVERY: 7,     /* a freeze earned on every 7th day of a streak */
    FREEZE_MAX: 2,       /* held at most */
  },

  QUESTS: {
    COUNT: 3,
    REROLLS: 1,          /* free rerolls a day */
    UNLOCK_QUEST: 'tut_1',
    STARS: 1,            /* each finished daily quest */
    ALL: Object.freeze({ stars: 1, spins: 1 }),   /* all three done */
    /* sig: the worker signal that counts it (_drSignal).  coins: the pay.
       goal: what it asks.  A FIGHT quest is always possible; a GATHER quest
       needs its tool; a CRAFT quest needs its tool or its stuff in the bag
       (_dqEligible). */
    TEMPLATES: Object.freeze({
      /* A few minutes each (a commons vein or tree is back in 20 s; there
         are six of each by town).  Paid on top of what the act itself
         yields -- the kills' gold, the ore -- so ~100 is a clear bonus over
         the same minutes spent any other way, never the whole point of
         playing.  The crafts chain two acts (catch, then cook) and pay more. */
      kill:      Object.freeze({ pool: 'fight',  sig: 'kill',   goal: 15, coins: 100 }),
      kill_land: Object.freeze({ pool: 'fight',  sig: 'kill',   goal: 10, coins: 120, land: true }),
      mine:      Object.freeze({ pool: 'gather', sig: 'gather', skill: 'mining',      goal: 10, coins: 100 }),
      chop:      Object.freeze({ pool: 'gather', sig: 'gather', skill: 'woodcutting', goal: 10, coins: 100 }),
      fish:      Object.freeze({ pool: 'gather', sig: 'gather', skill: 'fishing',     goal: 8,  coins: 100 }),
      cook:      Object.freeze({ pool: 'craft',  sig: 'cook',   goal: 4,  coins: 150 }),
      smelt:     Object.freeze({ pool: 'craft',  sig: 'smelt',  goal: 2,  coins: 150 }),
    }),
  },

  SEASON: {
    /* Season 1 ends 28 days after this Monday; everything before it is
       season 1 too, so the first season is never shorter than 28 days. */
    EPOCH_DAY: Date.UTC(2026, 9, 12) / DAY_MS,
    DAYS: 28,
    STARS_PER_TIER: 3,
    SPIN_STARS: 1,       /* the day's free spin */
    OVERFLOW_STARS: 5,   /* past the last tier: a bonus spin every 5 stars */
    /* Each tier: what it pays, in grants -- {kind:'coins', n} | {kind:'item',
       key, n} | {kind:'spin', n} | {kind:'freeze', n}.  Milestones every
       fifth tier; the last the biggest. */
    TIERS: Object.freeze([
      /*  1 */ [{ kind: 'coins', n: 150 }],
      /*  2 */ [{ kind: 'spin', n: 1 }],
      /*  3 */ [{ kind: 'item', key: 'cooked_fish_minnow', n: 5 }],
      /*  4 */ [{ kind: 'coins', n: 200 }],
      /*  5 */ [{ kind: 'item', key: RARE_GEM_KEY, n: 1 }, { kind: 'spin', n: 2 }],
      /*  6 */ [{ kind: 'coins', n: 250 }],
      /*  7 */ [{ kind: 'freeze', n: 1 }],
      /*  8 */ [{ kind: 'item', key: 'cooked_fish_minnow', n: 10 }],
      /*  9 */ [{ kind: 'coins', n: 300 }],
      /* 10 */ [{ kind: 'item', key: RARE_GEM_KEY, n: 2 }, { kind: 'coins', n: 400 }],
      /* 11 */ [{ kind: 'spin', n: 1 }],
      /* 12 */ [{ kind: 'coins', n: 400 }],
      /* 13 */ [{ kind: 'item', key: 'bar_iron', n: 5 }],          /* an iron torso's worth (armorforge.js) */
      /* 14 */ [{ kind: 'freeze', n: 1 }],
      /* 15 */ [{ kind: 'spin', n: 3 }, { kind: 'coins', n: 600 }],
      /* 16 */ [{ kind: 'coins', n: 450 }],
      /* 17 */ [{ kind: 'item', key: RARE_GEM_KEY, n: 1 }],
      /* 18 */ [{ kind: 'coins', n: 500 }],
      /* 19 */ [{ kind: 'spin', n: 2 }],
      /* 20 */ [{ kind: 'item', key: RARE_GEM_KEY, n: 3 }, { kind: 'coins', n: 1000 }],
      /* 21 */ [{ kind: 'coins', n: 600 }],
      /* 22 */ [{ kind: 'freeze', n: 1 }, { kind: 'spin', n: 1 }],
      /* 23 */ [{ kind: 'coins', n: 750 }],
      /* 24 */ [{ kind: 'item', key: RARE_GEM_KEY, n: 2 }],
      /* 25 */ [{ kind: 'coins', n: 3000 }, { kind: 'item', key: RARE_GEM_KEY, n: 5 }, { kind: 'spin', n: 5 }],
    ]),
  },
};

const SPIN = DAILY.SPIN;
const QUESTS = DAILY.QUESTS;
const SEASON = DAILY.SEASON;
const TEMPLATES = QUESTS.TEMPLATES;

/* ── pure helpers (exported for the tests) ── */

/** The UTC day number of `now` (days since 1970-01-01). */
export function dayOf(now) { return Math.floor((now || Date.now()) / DAY_MS); }

/** cadence.js keys a day as yyyymmdd; this is its day number. */
export function dayOfPeriod(p) {
  const n = Math.floor(Number(p) || 0);
  if (n <= 0) return 0;
  return Math.floor(Date.UTC(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100) / DAY_MS);
}

/** The season a day belongs to (1 for everything up to the epoch's 28th day). */
export function seasonOf(day) {
  return day < SEASON.EPOCH_DAY ? 1 : 1 + Math.floor((day - SEASON.EPOCH_DAY) / SEASON.DAYS);
}

/** The first day of the season AFTER `s` (its end, exclusive). */
export function seasonEndDay(s) { return SEASON.EPOCH_DAY + s * SEASON.DAYS; }

/** The streak's bonus on the lump sum: x1 on day 1, +10% a day, to x1.6. */
export function spinMult(streak) {
  const s = Math.max(1, Math.min(SPIN.STREAK_CAP, Math.floor(Number(streak) || 1)));
  return Math.round(100 + SPIN.STREAK_PCT * (s - 1)) / 100;
}

/** A prize's lump sum at multiplier `mult`, to the nearest 5 coins. */
export function spinLump(coins, mult) {
  return Math.max(5, Math.round(((Number(coins) || 0) * (Number(mult) || 1)) / 5) * 5);
}

/** The prize a roll r in [0, 1) lands on (an index into SPIN.PRIZES). */
export function spinPick(r) {
  const total = SPIN.PRIZES.reduce((t, p) => t + p.w, 0);
  let x = Math.max(0, Math.min(0.9999999, Number(r) || 0)) * total;
  for (let i = 0; i < SPIN.PRIZES.length; i++) {
    x -= SPIN.PRIZES[i].w;
    if (x < 0) return i;
  }
  return SPIN.PRIZES.length - 1;
}

/** The stars tier `t` (1-based) needs. */
export function tierNeed(t) { return t * SEASON.STARS_PER_TIER; }

/* FNV-1a, then mulberry32: a day's quests are a pure function of the player
   and the day, so a lost record rolls the same three again. */
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function freshRec() {
  return {
    _v: 1,
    sp: { day: 0, free: 0, open: 0, pot: 0, k: 0, i: 0, run: '', extra: 0 },
    dq: { day: 0, list: [], rr: 0, all: 0 },
    se: { s: 0, st: 0, cl: [], ov: 0 },
  };
}

const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

/* A stored record, healed: a missing or junk field becomes its fresh value,
   so a hand-edited or older record can never wedge a player. */
function healRec(r) {
  const f = freshRec();
  if (!r || typeof r !== 'object') return f;
  const sp = r.sp && typeof r.sp === 'object' ? r.sp : {};
  f.sp = {
    day: int(sp.day, 0, 1e7), free: sp.free ? 1 : 0, open: sp.open ? 1 : 0,
    pot: int(sp.pot, 0, SPIN.POT_MAX), k: int(sp.k, 0, 40), i: int(sp.i, 0, SPIN.PRIZES.length - 1),
    run: typeof sp.run === 'string' ? sp.run.slice(0, 40) : '', extra: int(sp.extra, 0, SPIN.EXTRA_MAX),
  };
  if (!f.sp.pot) f.sp.open = 0;   /* an open run is a pot; no pot, nothing open */
  const dq = r.dq && typeof r.dq === 'object' ? r.dq : {};
  f.dq = {
    day: int(dq.day, 0, 1e7),
    list: Array.isArray(dq.list) ? dq.list.slice(0, QUESTS.COUNT).filter((q) => q && Object.prototype.hasOwnProperty.call(TEMPLATES, q.t)).map((q) => ({
      t: q.t, p: typeof q.p === 'string' ? q.p.slice(0, 16) : null,
      g: int(q.g, 1, 999), n: int(q.n, 0, 999), d: q.d ? 1 : 0, c: int(q.c, 0, 100000),
    })) : [],
    rr: int(dq.rr, 0, 99), all: dq.all ? 1 : 0,
  };
  const se = r.se && typeof r.se === 'object' ? r.se : {};
  f.se = {
    s: int(se.s, 0, 1e6), st: int(se.st, 0, 1e6),
    cl: Array.isArray(se.cl) ? se.cl.map((t) => int(t, 0, SEASON.TIERS.length)).filter((t, i, a) => t >= 1 && a.indexOf(t) === i) : [],
    ov: int(se.ov, 0, 1e6),
  };
  return f;
}

/* A fresh opaque id for a spin run (the opIds of its layers name it). */
function runId() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().slice(0, 18); } catch (e) { /* below */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const dailyRewardsMethods = {
  /* ── switches and seams ── */

  /* The kill switches, read the dailyChest way (dailychest.js _chestOff):
     only an explicit false turns them off. */
  _drFlagOff(name) {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, name) && !f[name]);
  },
  _spinOff() { return this._drFlagOff('dailyspin'); },
  _dqOff() { return this._drFlagOff('dailyquests'); },

  /* Injectable for tests; the clock and the dice in the game. */
  _drNow() { return Date.now(); },
  _drRand() { return Math.random(); },

  _drMap() {
    if (!this.__drRecs) this.__drRecs = new Map();   /* pid -> record; rule 4: never a plain {} */
    return this.__drRecs;
  },
  _drDirtyMap() {
    if (!this.__drDirty) this.__drDirty = new Map();  /* pid -> first-dirty time */
    return this.__drDirty;
  },

  /* ── the record ── */

  async _drLoad(pid) {
    if (typeof pid !== 'string' || !pid) return null;
    const map = this._drMap();
    if (map.has(pid)) return map.get(pid);
    let stored = null;
    try { stored = await this.state.storage.get(DAILY.KEY + pid); } catch (e) { stored = null; }
    /* Re-check after the await: another event for this player may have
       loaded it first, and two copies would each save over the other. */
    if (map.has(pid)) return map.get(pid);
    const rec = healRec(stored);
    map.set(pid, rec);
    return rec;
  },

  async _drSave(pid) {
    const rec = this._drMap().get(pid);
    if (!rec) return;
    this._drDirtyMap().delete(pid);
    try { await this.state.storage.put(DAILY.KEY + pid, rec); } catch (e) { this._drDirtyMap().set(pid, 0); }
  },

  _drMarkDirty(pid) {
    const d = this._drDirtyMap();
    if (!d.has(pid)) d.set(pid, this._drNow());
  },

  /* ── the day and the season turning over ── */

  /* Brings a record up to `now`: a new season closes the old one (its
     unclaimed tiers are MAILED, never lost), a new day frees the spin, PAYS
     yesterday's pot if it was still open (_spinPay) and rolls the day's
     quests.  Returns true when anything changed. */
  async _drRollover(pid, rec, now) {
    const day = dayOf(now);
    let changed = false;
    const s = seasonOf(day);
    if (rec.se.s !== s) {
      if (rec.se.s > 0) await this._seClose(pid, rec);
      rec.se = { s, st: 0, cl: [], ov: 0 };
      changed = true;
    }
    if (rec.sp.day !== day) {
      /* a pot still open when the day ends is PAID, never lost: walking away
         from the double-or-nothing must not cost what the spin already won.
         With the spin switched off it is left OPEN instead -- the switch is
         for a spin gone wrong, and paying a wrong pot is the one thing it
         must not do; it waits for the switch, then Take or Double as ever. */
      if (rec.sp.open && rec.sp.pot > 0 && !this._spinOff()) {
        const kept = await this._spinPay(pid, rec, 'kept at the day\'s end');
        /* said on the next state (`kept`), apart from its news: the same
           turn-over may close a season, whose news must not be lost */
        if (kept > 0) {
          if (!this.__drKept) this.__drKept = new Map();   /* pid -> coins; rule 4 */
          this.__drKept.set(pid, kept);
        }
      }
      rec.sp.day = day; rec.sp.free = 0;
      if (!rec.sp.open) { rec.sp.pot = 0; rec.sp.k = 0; }
      changed = true;
    }
    if (rec.dq.day !== day) {
      rec.dq = { day, list: [], rr: 0, all: 0 };
      changed = true;
    }
    /* Rolled when unlocked -- which may be later the same day (tut_1 handed
       in mid-session), so this is not only a new-day step. */
    if (!rec.dq.list.length && !this._dqOff() && this._dqUnlocked(pid)) {
      rec.dq.list = this._dqRoll(pid, day);
      changed = changed || rec.dq.list.length > 0;
    }
    return changed;
  },

  /* A player online across midnight (UTC) starts the new day where they
     stand: the login streak advances (cadence.js, freezes and all) and the
     record turns over -- exactly what logging in tomorrow would have done.
     One at a time per player. */
  async _drNewDayOnline(pid) {
    if (!this.__drTurning) this.__drTurning = new Set();
    if (this.__drTurning.has(pid)) return;
    this.__drTurning.add(pid);
    try {
      const now = this._drNow();
      await this._cadenceLoginReward(pid, now);
      const rec = this._drMap().get(pid);
      if (!rec) return;
      if (await this._drRollover(pid, rec, now)) await this._drSave(pid);
      await this._drSendState(pid, { kind: 'newday' });
    } catch (e) { /* the next signal or tick tries again */ } finally {
      this.__drTurning.delete(pid);
    }
  },

  /* ── join / close / tick (named integration points, rule 22) ── */

  /* After _cadenceLoginReward on join: load, turn the record over, save. */
  async _drOnJoin(pid) {
    try {
      const rec = await this._drLoad(pid);
      if (!rec) return;
      if (await this._drRollover(pid, rec, this._drNow())) await this._drSave(pid);
    } catch (e) { /* rewards must never block a join */ }
  },

  /* The first quest was just handed in (quests.js): today's three appear at
     once rather than at the next login. */
  async _drOnQuestTurnIn(pid, questId) {
    if (questId !== QUESTS.UNLOCK_QUEST || this._dqOff()) return;
    try {
      const rec = await this._drLoad(pid);
      if (!rec) return;
      if (await this._drRollover(pid, rec, this._drNow())) await this._drSave(pid);
      await this._drSendState(pid, { kind: 'unlocked' });
    } catch (e) { /* the next login rolls them anyway */ }
  },

  /* On a real disconnect: write what was only counted, then forget.
     Returns a promise ONLY when there is something to write, and null
     otherwise -- webSocketClose awaits it just then, so a clean close stays
     synchronous.  The AFK sweep (tick.js) calls webSocketClose unawaited and
     relies on its cleanup having run when the call returns (afk.test.mjs);
     an unconditional await here deferred all of it a microtask. */
  _drOnClose(pid) {
    const forget = () => {
      this._drMap().delete(pid);
      this._drDirtyMap().delete(pid);
      if (this.__drNews) this.__drNews.delete(pid);
      if (this.__drKept) this.__drKept.delete(pid);
    };
    if (!this._drDirtyMap().has(pid)) { forget(); return null; }
    return this._drSave(pid).catch(() => { /* the counting is all that is at stake */ }).then(forget);
  },

  /* From the tick: flush counted progress, and turn over a new UTC day for
     everyone online (a room that stays busy across midnight). */
  _drTick(now) {
    if (this.__drLastTick && now - this.__drLastTick < DAILY.TICK_MS) return;
    this.__drLastTick = now;
    const dirty = this._drDirtyMap();
    for (const [pid, since] of dirty) {
      if (now - since >= DAILY.SAVE_MS) this._drSave(pid).catch(() => {});
    }
    const day = dayOf(now);
    if (this.__drDay !== day) {
      const first = this.__drDay === undefined;
      this.__drDay = day;
      if (!first) {
        for (const [pid, rec] of this._drMap()) {
          if (rec && rec.sp.day !== day && this.playerState[pid]) this._drNewDayOnline(pid);
        }
      }
    }
  },

  /* ── 1. the free daily spin ── */

  async _drStreak(pid) {
    try {
      const c = await this._cadenceGet('login', pid);
      return {
        n: Math.max(1, Math.floor((c && c.streak) || 1)),
        fz: Math.max(0, Math.floor((c && c.fz) || 0)),
        saved: Math.max(0, Math.floor((c && c.saved) || 0)),
        best: Math.max(1, Math.floor((c && (c.best || c.streak)) || 1)),
        period: (c && c.period) || 0,
      };
    } catch (e) {
      return { n: 1, fz: 0, saved: 0, best: 1, period: 0 };
    }
  },

  /* Pays the open pot, once.  The credit goes FIRST and the run is closed
     after it (rule 5): a crash between the two leaves the pot open, and the
     next pay of the same run is the oplog's 'dup' -- never a second payout,
     whatever was doubled in between.  `_creditPlayer` lands the coins on a
     player who is here (the player_state echo carries them) and mails them
     to one who is not.  Returns the coins paid (0 for none). */
  async _spinPay(pid, rec, why) {
    const sp = rec.sp;
    const amount = Math.max(0, Math.floor(sp.pot || 0));
    if (!sp.open || !(amount > 0)) return 0;
    const r = await this._creditPlayer(pid, {
      opId: 'spinpot:' + pid + ':' + (sp.run || 'x'),
      source: 'dailyspin', kind: 'gold', payload: { amount },
      note: 'Daily spin' + (why ? ' (' + why + ')' : ''),
    });
    sp.open = 0;
    return r === 'dup' ? 0 : amount;
  },

  /* One act on the daily spin, the shape of Ace's flip (gamble.js): checked,
     rolled and settled in one input-gated event, the answer one
     rewards_state.  `act`:
       'spin'    a new run: the day's free spin, else a bonus spin.  It lands
                 on a lump sum (PRIZES, x the streak's spinMult) -- the pot.
       'double'  double or nothing on the open pot: 50% it doubles, 50% it is
                 gone.  A pot that cannot double again (POT_MAX) is paid.
       'collect' take the open pot.
     A refused act still answers (news.refused) so the game never waits. */
  async _handleDailySpin(session, payload) {
    if (!session || !session.id) return;
    if (this._spinOff()) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const now = this._drNow();
    if (ps._lastDailySpinAt && now - ps._lastDailySpinAt < SPIN.COOLDOWN_MS) return;
    /* stamped for EVERY ask past this line, a refused one too -- otherwise a
       client with no spins left could have the worker read storage and answer
       as fast as it can send */
    ps._lastDailySpinAt = now;
    const act = payload && (payload.act === 'double' || payload.act === 'collect') ? payload.act : 'spin';
    const opId = payload && typeof payload.opId === 'string' && payload.opId.length <= 96 ? payload.opId : null;
    if (opId && await this._opSeen('spinop:' + opId)) return;
    const rec = await this._drLoad(pid);
    if (!rec || !this.playerState[pid]) return;
    if (rec.sp.day !== dayOf(now)) {
      /* the first act of a new day: the streak advances first (and a pot
         left open yesterday is paid by the rollover) */
      await this._cadenceLoginReward(pid, now);
      await this._drRollover(pid, rec, now);
    }
    const sp = rec.sp;
    let news;
    if (act === 'spin') {
      if (sp.open) { await this._drSendState(pid, { kind: 'spin', act, refused: 'open' }); return; }
      let started;
      if (!sp.free) { sp.free = 1; started = 'free'; }
      else if (sp.extra > 0) { sp.extra -= 1; started = 'bonus'; }
      else { await this._drSendState(pid, { kind: 'spin', act, refused: 'none' }); return; }
      const st = await this._drStreak(pid);
      const mult = spinMult(st.n);
      const i = spinPick(this._drRand());
      const lump = spinLump(SPIN.PRIZES[i].coins, mult);
      sp.open = 1; sp.pot = lump; sp.k = 0; sp.i = i; sp.run = runId();
      if (started === 'free' && !this._dqOff()) this._seAddStars(rec, SEASON.SPIN_STARS);
      news = { kind: 'spin', act, started, i, lump, pot: lump, mult, jackpot: i === SPIN.PRIZES.length - 1 };
      if (lump * 2 > SPIN.POT_MAX) { news.paid = await this._spinPay(pid, rec, 'the house limit'); news.top = true; }
    } else if (act === 'double') {
      if (!sp.open || !(sp.pot > 0)) { await this._drSendState(pid, { kind: 'spin', act, refused: 'closed' }); return; }
      if (sp.pot * 2 > SPIN.POT_MAX) { await this._drSendState(pid, { kind: 'spin', act, refused: 'limit' }); return; }
      const won = this._drRand() < SPIN.DOUBLE_CHANCE;
      if (won) {
        sp.pot *= 2; sp.k += 1;
        news = { kind: 'spin', act, won: true, k: sp.k, pot: sp.pot };
        if (sp.pot * 2 > SPIN.POT_MAX) { news.paid = await this._spinPay(pid, rec, 'the house limit'); news.top = true; }
      } else {
        news = { kind: 'spin', act, won: false, k: sp.k, lost: sp.pot, pot: 0 };
        sp.open = 0; sp.pot = 0;
      }
    } else {
      if (!sp.open || !(sp.pot > 0)) { await this._drSendState(pid, { kind: 'spin', act, refused: 'closed' }); return; }
      const pot = sp.pot;
      news = { kind: 'spin', act, k: sp.k, pot, paid: await this._spinPay(pid, rec, null) };
    }
    if (opId) await this._opStamp('spinop:' + opId);
    await this._drSave(pid);
    await this._drSendState(pid, news);
  },

  /* ── 2. the daily quests ── */

  _dqUnlocked(pid) {
    const ps = this.playerState[pid];
    return !!(ps && ps._quests && ps._quests[QUESTS.UNLOCK_QUEST] === 'turnedIn');
  },

  _dqHolds(ps, prefix) {
    const inv = (ps && ps.inventory) || null;
    if (!inv) return 0;
    let n = 0;
    for (const k of Object.keys(inv)) if (k.startsWith(prefix)) n += Math.max(0, Math.floor(Number(inv[k]) || 0));
    return n;
  },

  /* Can this player do template `id` today?  A fight always; a gather with
     its tool; a craft with its tool or its stuff in the bag. */
  _dqEligible(ps, id) {
    const T = TEMPLATES[id];
    if (!T) return false;
    if (T.pool === 'fight') return true;
    const tool = (skill) => this._hasGatherTool(ps, skill);
    if (T.sig === 'gather') return tool(T.skill);
    if (id === 'cook') {
      const fish = tool('fishing') || this._dqHolds(ps, 'fish_') >= T.goal;
      const fire = tool('woodcutting') || this._dqHolds(ps, 'wood_') >= 1;
      return fish && fire;
    }
    if (id === 'smelt') return tool('mining') || this._dqHolds(ps, 'ore_') >= T.goal * 5;
    return false;
  },

  /* One quest of template `id`; a land quest picks a land no other quest in
     `list` already names. */
  _dqMake(id, rand, list) {
    const T = TEMPLATES[id];
    const q = { t: id, p: null, g: T.goal, n: 0, d: 0, c: T.coins };
    if (T.land) {
      const used = (list || []).filter((x) => x && x.t === id).map((x) => x.p);
      const homes = ((WHEEL && WHEEL.HOMES) || []).filter((h) => !used.includes(h));
      q.p = homes.length ? homes[Math.floor(rand() * homes.length) % homes.length] : null;
      if (!q.p) return null;
    }
    return q;
  },

  /* Can quest `id` join `list`?  Never the same quest twice -- except a land
     quest in a DIFFERENT land, which is what keeps three quests on the board
     for a player with no tools yet (two fights alone would make the
     all-three bonus impossible for exactly the newest players). */
  _dqFits(id, list) {
    const same = list.filter((x) => x && x.t === id).length;
    if (!same) return true;
    return !!TEMPLATES[id].land && same < ((WHEEL && WHEEL.HOMES) || []).length;
  },

  /* The day's three: a fight, a gather if there is a tool, then more of
     anything this player can do.  A pure function of (player, day). */
  _dqRoll(pid, day) {
    const ps = this.playerState[pid];
    if (!ps) return [];
    const rand = seeded(hash32(pid + ':' + day));
    const ids = Object.keys(TEMPLATES).filter((id) => this._dqEligible(ps, id));
    const list = [];
    const add = (pool) => {
      const inPool = (id) => !pool || TEMPLATES[id].pool === pool;
      /* a KIND not on the board yet first; only when none is left, the land
         quest again in another land -- so a player with no tools gets "Defeat
         15 monsters" and two lands, never three separate trips (the first cut
         drew three land quests for exactly that player, mp-dailyrewards) */
      let opts = ids.filter((id) => inPool(id) && !list.some((x) => x && x.t === id));
      if (!opts.length) opts = ids.filter((id) => inPool(id) && this._dqFits(id, list));
      if (!opts.length) return;
      const q = this._dqMake(opts[Math.floor(rand() * opts.length) % opts.length], rand, list);
      if (q) list.push(q);
    };
    add('fight');
    add('gather');
    for (let guard = 0; list.length < QUESTS.COUNT && guard < 6; guard++) add(null);
    return list;
  },

  /* The worker's signals, from the choke points that settle each act:
       kill   -- combat.js _resolveMonsterKill, every XP recipient (what = m)
       gather -- gathering.js _handleNodeStrike (what = skill, n = yield)
       cook   -- cooking.js _handleCookRequest, a fish cooked (n = 1)
       smelt  -- smelting.js _handleSmeltBar (n = bars)
     Synchronous and cheap: only an online player's cached record is read. */
  _drSignal(pid, sig, what, n) {
    if (this._dqOff()) return;
    const rec = this._drMap().get(pid);
    if (!rec) return;
    if (rec.dq.day !== dayOf(this._drNow())) { this._drNewDayOnline(pid); return; }
    const list = rec.dq.list;
    let moved = false;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (!q || q.d) continue;
      const T = TEMPLATES[q.t];
      if (!T || T.sig !== sig) continue;
      if (T.land && !(what && what.home === q.p)) continue;
      if (T.skill && what !== T.skill) continue;
      q.n = Math.min(q.g, q.n + Math.max(1, Math.floor(Number(n) || 1)));
      moved = true;
      if (q.n >= q.g) this._dqComplete(pid, rec, i);
      else this._drSendProgress(pid, i, q);
    }
    if (moved) this._drMarkDirty(pid);
  },

  /* A daily quest is done: paid at once, its star on the season, and the
     all-three bonus when it is the third.  Saved at once (value). */
  _dqComplete(pid, rec, i) {
    const q = rec.dq.list[i];
    q.d = 1;
    q.n = q.g;
    this._creditPlayer(pid, {
      opId: 'dq:' + pid + ':' + rec.dq.day + ':' + i,
      source: 'dailyquest', kind: 'gold', payload: { amount: q.c },
      note: 'Daily quest',
    }).catch(() => {});
    this._seAddStars(rec, QUESTS.STARS);
    let all = null;
    if (!rec.dq.all && rec.dq.list.length >= QUESTS.COUNT && rec.dq.list.every((x) => x && x.d)) {
      rec.dq.all = 1;
      this._seAddStars(rec, QUESTS.ALL.stars);
      rec.sp.extra = Math.min(SPIN.EXTRA_MAX, rec.sp.extra + QUESTS.ALL.spins);
      all = { stars: QUESTS.ALL.stars, spins: QUESTS.ALL.spins };
    }
    this._drSave(pid).catch(() => {});
    this._drSendState(pid, { kind: 'daily', i, t: q.t, p: q.p, coins: q.c, stars: QUESTS.STARS, all }).catch(() => {});
  },

  async _handleDailyReroll(session, payload) {
    if (!session || !session.id) return;
    if (this._dqOff()) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    /* an exact small integer, never a coerced one: Math.floor(1.5) and
       Number(null) would both name a real slot */
    const i = payload ? payload.i : undefined;
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= QUESTS.COUNT) return;
    const rec = await this._drLoad(pid);
    if (!rec) return;
    const now = this._drNow();
    if (rec.dq.day !== dayOf(now)) {
      await this._cadenceLoginReward(pid, now);
      await this._drRollover(pid, rec, now);
    }
    const q = rec.dq.list[i];
    if (!q || q.d || rec.dq.rr >= QUESTS.REROLLS) return;
    /* any pool: the reroll is how a player swaps a gather they do not want
       for a fight they do -- the brief's "quests that push play styles" */
    const rand = seeded(hash32(pid + ':' + rec.dq.day + ':rr' + rec.dq.rr));
    /* the others stay; the one being swapped is never drawn again -- a
       different KIND of quest when there is one, else (a player with no
       tools yet, holding only fights) the same land quest in another land */
    const others = rec.dq.list.filter((x, j) => j !== i);
    const fits = (id) => this._dqFits(id, others) && this._dqEligible(ps, id);
    let opts = Object.keys(TEMPLATES).filter((id) => id !== q.t && fits(id));
    if (!opts.length && TEMPLATES[q.t].land && fits(q.t)) opts = [q.t];
    if (!opts.length) return;
    const nq = this._dqMake(opts[Math.floor(rand() * opts.length) % opts.length], rand, rec.dq.list);
    if (!nq) return;
    rec.dq.list[i] = nq;
    rec.dq.rr += 1;
    await this._drSave(pid);
    await this._drSendState(pid, { kind: 'reroll', i });
  },

  /* ── 3. the season ── */

  _seAddStars(rec, n) {
    const se = rec.se;
    se.st += Math.max(0, Math.floor(n) || 0);
    /* past the last tier, every OVERFLOW_STARS more is a bonus spin -- kept
       in the record, counted by `ov`, so it can only ever pay once */
    const top = tierNeed(SEASON.TIERS.length);
    if (se.st > top) {
      const due = Math.floor((se.st - top) / SEASON.OVERFLOW_STARS);
      while (se.ov < due) {
        se.ov += 1;
        rec.sp.extra = Math.min(SPIN.EXTRA_MAX, rec.sp.extra + 1);
      }
    }
  },

  /* Pays one tier's grants.  Coins and items through _creditPlayer with an
     opId per grant (online: straight into the bag; offline: the inbox), so a
     claim and the season-end mail can never both pay.  Spins and freezes are
     the record's and the streak's own. */
  async _seGrant(pid, rec, s, t, why) {
    const grants = SEASON.TIERS[t - 1] || [];
    const note = 'Season ' + s + ' · tier ' + t + (why ? ' ' + why : '');
    for (let g = 0; g < grants.length; g++) {
      const gr = grants[g];
      /* opId 'season:<pid>:<season>:<tier>:<grant>' -- the same for a claim
         and for the season-end mail, which is what makes them unable to both
         pay (opid-audit wants the literal prefix inline) */
      try {
        if (gr.kind === 'coins') {
          await this._creditPlayer(pid, { opId: 'season:' + pid + ':' + s + ':' + t + ':' + g, source: 'season', kind: 'gold', payload: { amount: gr.n }, note });
        } else if (gr.kind === 'item') {
          await this._creditPlayer(pid, { opId: 'season:' + pid + ':' + s + ':' + t + ':' + g, source: 'season', kind: 'item', payload: { invKey: gr.key, count: gr.n }, note });
        } else if (gr.kind === 'spin') {
          rec.sp.extra = Math.min(SPIN.EXTRA_MAX, rec.sp.extra + gr.n);
        } else if (gr.kind === 'freeze') {
          await this._drAddFreeze(pid, gr.n);
        }
      } catch (e) { /* one grant failing must not strand the rest */ }
    }
    return grants;
  },

  async _drAddFreeze(pid, n) {
    const c = (await this._cadenceGet('login', pid)) || null;
    if (!c) return;
    const fz = Math.min(DAILY.STREAK.FREEZE_MAX, Math.max(0, Math.floor(c.fz || 0)) + Math.max(0, Math.floor(n) || 0));
    await this.state.storage.put('cadence:login:' + pid, { ...c, fz });
  },

  /* The season is over: every tier this player reached and never claimed is
     MAILED (the inbox for coins and items; spins and freezes kept).  Called
     from the rollover, i.e. the first time they are seen after it ends. */
  async _seClose(pid, rec) {
    const se = rec.se;
    const mailed = [];
    for (let t = 1; t <= SEASON.TIERS.length; t++) {
      if (se.st < tierNeed(t) || se.cl.includes(t)) continue;
      se.cl.push(t);
      mailed.push(t);
      await this._seGrant(pid, rec, se.s, t, '(sent at the season\'s end)');
    }
    /* the next state this player is sent says the season ended, and what
       it mailed them -- usually the one after their join */
    this._drQueueNews(pid, { kind: 'season_end', s: se.s, stars: se.st, mailed });
  },

  _drQueueNews(pid, news) {
    if (!this.__drNews) this.__drNews = new Map();   /* pid -> news; rule 4 */
    this.__drNews.set(pid, news);
  },

  async _handleSeasonClaim(session, payload) {
    if (!session || !session.id) return;
    if (this._dqOff()) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const rec = await this._drLoad(pid);
    if (!rec) return;
    const now = this._drNow();
    if (rec.dq.day !== dayOf(now) || rec.se.s !== seasonOf(dayOf(now))) {
      await this._cadenceLoginReward(pid, now);
      await this._drRollover(pid, rec, now);
    }
    const se = rec.se;
    let want = [];
    if (payload && payload.all) {
      for (let t = 1; t <= SEASON.TIERS.length; t++) want.push(t);
    } else {
      /* an exact integer (see _handleDailyReroll): 2.5 is not tier 2 */
      const t = payload ? payload.tier : undefined;
      if (typeof t === 'number' && Number.isInteger(t)) want = [t];
    }
    const claimed = [];
    for (const t of want) {
      if (t < 1 || t > SEASON.TIERS.length) continue;
      if (se.st < tierNeed(t) || se.cl.includes(t)) continue;
      se.cl.push(t);   /* marked before anything is paid: a second claim finds it */
      claimed.push(t);
    }
    if (!claimed.length) return;
    const grants = [];
    for (const t of claimed) grants.push(...await this._seGrant(pid, rec, se.s, t, ''));
    await this._drSave(pid);
    await this._drSendState(pid, { kind: 'claim', tiers: claimed, grants });
  },

  /* ── the operator's test hook (devtools.js /dev/daily) ── */

  /* Behind the admin key and its audit log, like every /dev/ op: `stars`
     adds season stars (the overflow's spins included), `spins` banks bonus
     spins, `quest: [i, n]` counts n towards today's quest i through the very
     path a kill would (so a finished one is PAID, as in the game).  For the
     phone scenario (mp-dailyrewards) and the owner's own testing. */
  async _drDev(pid, body) {
    const ps = this.playerState[pid];
    if (!ps) return { ok: false, error: 'not online' };
    const rec = await this._drLoad(pid);
    if (!rec) return { ok: false, error: 'no record' };
    await this._drRollover(pid, rec, this._drNow());
    const b = body || {};
    const stars = Math.max(0, Math.min(500, Math.floor(Number(b.stars) || 0)));
    if (stars) this._seAddStars(rec, stars);
    const spins = Math.max(0, Math.min(SPIN.EXTRA_MAX, Math.floor(Number(b.spins) || 0)));
    if (spins) rec.sp.extra = Math.min(SPIN.EXTRA_MAX, rec.sp.extra + spins);
    if (Array.isArray(b.quest) && b.quest.length === 2) {
      const i = b.quest[0];
      const n = Math.max(1, Math.min(999, Math.floor(Number(b.quest[1]) || 1)));
      const q = typeof i === 'number' && Number.isInteger(i) ? rec.dq.list[i] : null;
      if (q && !q.d) {
        q.n = Math.min(q.g, q.n + n);
        if (q.n >= q.g) this._dqComplete(pid, rec, i);
        else this._drSendProgress(pid, i, q);
      }
    }
    await this._drSave(pid);
    await this._drSendState(pid, null);
    return { ok: true, stars: rec.se.st, extra: rec.sp.extra, quests: rec.dq.list.map((q) => [q.t, q.n, q.g, q.d]) };
  },

  /* ── the state the game draws ── */

  async _handleRewardsGet(session) {
    if (!session || !session.id) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return;
    const now = this._drNow();
    if (ps._lastRewardsGetAt && now - ps._lastRewardsGetAt < 800) return;
    ps._lastRewardsGetAt = now;
    const rec = await this._drLoad(pid);
    if (!rec) return;
    if (await this._drRollover(pid, rec, now)) await this._drSave(pid);
    await this._drSendState(pid, null);
  },

  _drSendProgress(pid, i, q) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'daily_progress', payload: { i, n: q.n, g: q.g } })); } catch (e) { /* the state carries it later */ }
  },

  async _drState(pid, rec, news) {
    const now = this._drNow();
    const day = dayOf(now);
    const st = await this._drStreak(pid);
    const sp = rec.sp;
    const spinToday = sp.day === day;
    const se = rec.se;
    return {
      v: 1,
      now,
      resetAt: (day + 1) * DAY_MS,
      spin: (() => {
        const mult = spinMult(st.n);
        const open = sp.open && sp.pot > 0 ? 1 : 0;   /* a pot carries across a day only while the switch is off */
        return {
          on: !this._spinOff(),
          ready: spinToday && sp.free ? 0 : 1,       /* today's free spin still to take */
          open,
          pot: open ? sp.pot : 0,
          k: open ? sp.k : 0,
          i: open ? sp.i : -1,                       /* the prize the open pot came from (the wheel rests on it) */
          canDouble: open && sp.pot * 2 <= SPIN.POT_MAX ? 1 : 0,
          limit: SPIN.POT_MAX,
          chance: SPIN.DOUBLE_CHANCE,
          mult,                                      /* the streak's bonus on today's lump sums */
          /* the wheel's prizes as they pay today, with their weights out of
             the total (the odds the window prints) */
          prizes: SPIN.PRIZES.map((p) => ({ c: spinLump(p.coins, mult), w: p.w })),
          extra: sp.extra,
        };
      })(),
      streak: {
        n: st.n, fz: st.fz, fzMax: DAILY.STREAK.FREEZE_MAX, every: DAILY.STREAK.FREEZE_EVERY,
        saved: st.saved, best: st.best, cap: SPIN.STREAK_CAP,
      },
      dq: {
        on: !this._dqOff(),
        locked: !this._dqUnlocked(pid),
        list: (rec.dq.day === day ? rec.dq.list : []).map((q) => ({ t: q.t, p: q.p, g: q.g, n: q.n, d: q.d, c: q.c })),
        rr: QUESTS.REROLLS - (rec.dq.day === day ? rec.dq.rr : 0),
        all: rec.dq.day === day ? rec.dq.all : 0,
        bonus: { stars: QUESTS.ALL.stars, spins: QUESTS.ALL.spins },
        stars: QUESTS.STARS,
      },
      season: {
        s: se.s || seasonOf(day),
        st: se.st,
        per: SEASON.STARS_PER_TIER,
        endsAt: seasonEndDay(se.s || seasonOf(day)) * DAY_MS,
        tiers: SEASON.TIERS,
        cl: se.cl.slice(),
        ov: se.ov,
        ovEvery: SEASON.OVERFLOW_STARS,
        spinStars: SEASON.SPIN_STARS,
      },
      news: news || null,
    };
  },

  async _drSendState(pid, news, wsIn) {
    const ws = wsIn || this._wsBySessionId(pid);
    if (!ws) return;
    const rec = this._drMap().get(pid);
    if (!rec) return;
    let n = news || null;
    if (!n && this.__drNews && this.__drNews.has(pid)) {
      n = this.__drNews.get(pid);
      this.__drNews.delete(pid);
    }
    const payload = await this._drState(pid, rec, n);
    if (this.__drKept && this.__drKept.has(pid)) {
      payload.kept = this.__drKept.get(pid);
      this.__drKept.delete(pid);
    }
    try { ws.send(JSON.stringify({ type: 'rewards_state', payload })); } catch (e) { /* the next one carries it */ }
  },
};
