/* ═══ v2.3.3111: PET TRAPPING — ARM A TRAP, THEN KILL IT ═══
 * Plan: docs/PET-TRAPPING-PLAN.md (every choice the owner's, 2026-10-06).
 * Spec: docs/specs/trapping.md.  The pets record is petbook.js.
 *
 * The owner, on the old capture (pets.js, v2.3.1130: weaken a monster to 20%
 * health and throw a trap): "It also becomes infeasible if you're powerful
 * enough to 1 hit monsters so I need something else."  Then: "your trapping
 * level governs what level monster you can capture.  Catching a pet is a rare
 * activity with very little success rate.  The best success rate for the
 * lowest tier monster should be about 1%.  And each trap should cost at least
 * 1 wood to make."  And, of a bad-luck rule: "Just leave the odds exactly the
 * same for everyone."
 *
 * THE LOOP
 *   make_traps {log, count}   one log of any kind -> one box trap (`trap_box`),
 *                             at the Woodworker, up to 50 a press
 *   trap_arm {monsterId}      a mark on one of the Wheel's monsters, MARK_MS
 *   the kill                  _resolveMonsterKill (combat.js) calls
 *                             _trapRollOnKill just before it clears
 *                             dmgByPlayer: every player whose mark is live and
 *                             who did MIN_SHARE of the damage rolls for
 *                             themselves.  However hard anyone hits, and
 *                             whoever lands the blow.
 *
 * THE ODDS ARE A TABLE AND NOTHING ELSE (trapChance): the monster's stretch
 * (five levels) and how far the player's Trapping level stands above the
 * monster's.  No count of misses, no combat level, no damage, no health: two
 * players at the same Trapping level trying the same kind always have the same
 * chance, however their tries have gone.  The worker keeps no number that
 * could tilt it.  Rolled as four checks at the chance's fourth root, as
 * Pokémon rolls its shakes, so P(catch) is exactly the chance and the shakes
 * before a break are honest near misses.
 *
 * WHAT IT COSTS.  A roll uses one trap, caught or not.  A mark that runs out
 * before the kill costs nothing; a refusal costs nothing; a kill you did not
 * help with (under MIN_SHARE) costs nothing -- "you miss that roll and keep
 * your trap".  And the kill's own payouts are untouched: XP, gold, loot and
 * quest credit go exactly where they went before (the old capture cancelled
 * all of them for everyone).
 *
 * WHERE.  Only on the Wheel's own monsters (`home`, zone 'wheel'), so never in
 * a dungeon -- the old capture could take a dungeon's boss and finish the
 * dungeon -- and never with either of you standing on the safe ground.
 *
 * KILL SWITCHES (lower case, TRAPS §117): `trapping: false` in liveflags
 * un-advertises caps.trapping, refuses every arm AND stops every roll (a mark
 * already set then costs nothing); `trapcraft: false` the same for
 * make_traps.  Both read in the handler (the smelting shape), so an old client
 * that never reads caps is refused too.
 *
 * MEMORY ONLY: the marks (on the monster, `m._armedBy`, a Map) and each
 * player's arm and catch times (`this._trapRuntime`, a Map keyed by player id,
 * room-level so a reconnect cannot reset the hour's catch count).  A deploy
 * wipes both, which costs a mark at most (rule 11).  The record of pets and
 * tries is petbook.js's `pets:<pid>`.
 */
import { WHEEL_ZONE } from './wheelzone.js';

export const TRAPPING = Object.freeze({
  /* The box trap, an ordinary bag item: traded, sold, mailed and dropped like
     logs.  `basic_trap`, the 20-gold trap the shop sold until v2.3.2069, is
     one each, turned into a box trap at join (_trapJoinConvert). */
  TRAP: 'trap_box',
  LEGACY_TRAP: 'basic_trap',
  /* The logs a trap is made from, one each: every tree the Wheel grows
     (gathering.js TREE names through _harvestInvKey). */
  LOGS: Object.freeze({
    wood_pine_log: 1,
    wood_softwood: 1,
    wood_hardwood: 1,
    wood_cedar_wood: 1,
    wood_maple_wood: 1,
  }),
  /* A little Woodworking XP a trap: half what smelting pays an ore (400 for
     five, smelting.js), as a trap is a single log and a minute's work. */
  MAKE_XP: 40,
  MAX_PER_REQUEST: 50,
  /* How long a mark lasts.  The plan's "about 15 seconds": long enough to
     arm, close in and kill a monster at your own level, short enough that
     arming everything in sight and waiting is pointless. */
  MARK_MS: 15000,
  /* How near the monster must be when you arm it, from your own spot.  The
     plan's ~300 px "to be tuned for bows and staffs": a bow or staff fights
     from about this far, and a target tapped on a phone's screen is within
     it (the Wheel's view is ~640 x 1,100 world px on the QA phone). */
  ARM_RANGE: 480,
  ARMS_PER_MIN: 20,
  /* Who rolls: the share of the damage that already decides who gets a
     monster's gold (combat.js, GDD §7). */
  MIN_SHARE: 0.05,
  /* The bound no honest trapper meets: at 1% best and the monsters' supply
     (six a stretch a land, back every 18.75 s), a busy hour is a handful of
     catches.  Past it an arm is REFUSED, never quietly failed -- every roll
     that happens stays honest. */
  CATCH_PER_HOUR: 10,

  /* ── the odds ── */
  BEST: 0.01,           // the first stretch's best chance: 1 in 100
  STRETCH_MULT: 0.8,    // each deeper stretch x0.8 (Pokémon S/V's per-band x0.8)
  STRETCH_LEVELS: 5,    // a stretch is five levels, as the Wheel's tiers are
  START_FRAC: 0.5,      // at the monster's own level: half the best
  RISE_LEVELS: 20,      // ...rising evenly to the best 20 levels above it
  CHECKS: 4,            // four hidden checks: 0-3 shakes, then the snap

  /* ── Trapping XP ──
     Every roll pays, caught or not, more for a deeper monster: the harvest's
     own base at the stretch's tier (gathering.js _harvestXpForTier, before
     its accuracy), so a roll pays what a tree of the same stretch pays and an
     hour of trapping levels Trapping about as fast as an hour of woodcutting
     levels Woodcutting -- the plan's aim, to be tuned against real rates.
     Monsters far below you pay less, as a creature's fixed XP matters less as
     you outgrow it in RuneScape: full up to FAR_FROM levels above (where the
     odds stop rising), then FAR_STEP less a level, never under FAR_MIN.  A
     catch pays CATCH_XP_MULT rolls more. */
  XP_K: 25,
  FAR_FROM: 20,
  FAR_STEP: 0.03,
  FAR_MIN: 0.25,
  CATCH_XP_MULT: 10,
});

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** The stretch a monster's level is in: 1 for levels 1-5, 2 for 6-10, ... */
export function trapStretch(monLvl) {
  const L = Math.max(1, Math.floor(Number(monLvl) || 1));
  return Math.ceil(L / TRAPPING.STRETCH_LEVELS);
}

/** A stretch's best chance: 1%, x0.8 for each stretch past the first. */
export function trapBestChance(stretch) {
  const s = Math.max(1, Math.floor(Number(stretch) || 1));
  return TRAPPING.BEST * Math.pow(TRAPPING.STRETCH_MULT, s - 1);
}

/** The chance one roll catches, from the table alone.  0 when the monster is
 *  above the player's Trapping level -- no arm is allowed then. */
export function trapChance(trapLvl, monLvl) {
  const T = Math.max(1, Math.floor(Number(trapLvl) || 1));
  const M = Math.max(1, Math.floor(Number(monLvl) || 1));
  if (M > T) return 0;
  const rise = Math.min(1, TRAPPING.START_FRAC + (1 - TRAPPING.START_FRAC) * (T - M) / TRAPPING.RISE_LEVELS);
  return trapBestChance(trapStretch(M)) * rise;
}

/** The roll: CHECKS checks, each passed at the chance's CHECKS-th root.
 *  {caught, shakes}: shakes is how many passed before one failed (0-3), or 3
 *  on a catch (three shakes, then the snap).  P(caught) = chance exactly. */
export function trapShakes(chance, rand = Math.random) {
  const c = Math.max(0, Math.min(1, Number(chance) || 0));
  if (!(c > 0)) return { caught: false, shakes: 0 };
  const b = Math.pow(c, 1 / TRAPPING.CHECKS);
  let passed = 0;
  while (passed < TRAPPING.CHECKS && rand() < b) passed++;
  return passed >= TRAPPING.CHECKS
    ? { caught: true, shakes: TRAPPING.CHECKS - 1 }
    : { caught: false, shakes: passed };
}

/** A roll's Trapping XP before the far-below cut: a harvest's base at the
 *  stretch's tier (1, 6, 11, ...). */
export function trapXpBase(stretch) {
  const s = Math.max(1, Math.floor(Number(stretch) || 1));
  const tier = 1 + TRAPPING.STRETCH_LEVELS * (s - 1);
  return Math.ceil((tier * 1.5 + 5) * TRAPPING.XP_K);
}

/** What one roll pays: its stretch's base, less for a monster far below. */
export function trapRollXp(stretch, gap) {
  const g = Math.max(0, Math.floor(Number(gap) || 0));
  const far = g <= TRAPPING.FAR_FROM ? 1 : Math.max(TRAPPING.FAR_MIN, 1 - (g - TRAPPING.FAR_FROM) * TRAPPING.FAR_STEP);
  return Math.max(1, Math.round(trapXpBase(stretch) * far));
}

/** What a catch pays on top of its roll. */
export function trapCatchXp(stretch) {
  return trapXpBase(stretch) * TRAPPING.CATCH_XP_MULT;
}

/** The player's Trapping level, read as the worker pays it (`level || 1`). */
export function trapLevelOf(ps) {
  const ls = ps && ps.lifeSkills;
  const s = ls && typeof ls === 'object' && has(ls, 'trapping') ? ls.trapping : null;
  const L = s && typeof s === 'object' ? Math.floor(Number(s.level) || 1) : 1;
  return Math.max(1, L);
}

/** Trap boxes in a bag (own property only: a bag is a plain object). */
export function trapsIn(ps) {
  const inv = ps && ps.inventory;
  const n = has(inv, TRAPPING.TRAP) ? Math.floor(Number(inv[TRAPPING.TRAP]) || 0) : 0;
  return Math.max(0, n);
}

/** v2.3.3111: what a FIRST connect may not bring from the browser.  The join
 *  bootstrap (join.js) takes the client's life skills on a player's very first
 *  join; a forged Trapping 99 would skip the rule that decides what can be
 *  caught, and forged pets would move into the record and, once pets trade,
 *  be sold.  #830 stops the bootstrap trusting the browser at all; this holds
 *  the two that matter here, whether or not it has merged.  Pure. */
export function trapBootstrapGuard(ps) {
  const ls = ps && ps.lifeSkills;
  if (!ls || typeof ls !== 'object') return;
  delete ls.pets;
  delete ls.activePet;
  if (has(ls, 'trapping')) ls.trapping = { level: 1, xp: 0 };
}

export const trappingMethods = {
  /* `trapping: false` in liveflags -- no arms, no rolls */
  _trappingOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'trapping') && !f.trapping);
  },
  /* `trapcraft: false` in liveflags -- no traps made */
  _trapcraftOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'trapcraft') && !f.trapcraft);
  },

  /* Each player's arm and catch times and their live mark, kept by the room
     (not on playerState, which a reconnect replaces).  Bounded: the times are
     pruned to their windows on every arm; an entry is dropped on a character
     reset (persistence.js). */
  _trapRt(pid) {
    if (!this._trapRuntime) this._trapRuntime = new Map();
    let rt = this._trapRuntime.get(pid);
    if (!rt) { rt = { arms: [], catches: [], mark: null }; this._trapRuntime.set(pid, rt); }
    return rt;
  },
  _trapForget(pid) {
    if (this._trapRuntime) this._trapRuntime.delete(pid);
  },

  /* A broken skill shape would make _addLifeSkillXp throw after the trap is
     spent (#827 fixes it for every skill; this holds Trapping and
     Woodworking until it merges): anything but an object is level 1. */
  _trapSkillReady(ps, skill) {
    if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') ps.lifeSkills = {};
    const s = has(ps.lifeSkills, skill) ? ps.lifeSkills[skill] : undefined;
    if (s !== undefined && (s === null || typeof s !== 'object' || Array.isArray(s))) {
      ps.lifeSkills[skill] = { level: 1, xp: 0 };
    }
  },

  /* At join: an old `basic_trap` is a box trap now, one each.  Idempotent --
     once turned, no basic_trap is left to turn -- so it needs no stamp, and a
     crash before the next save simply turns it again. */
  _trapJoinConvert(ps) {
    const inv = ps && ps.inventory;
    if (!inv || typeof inv !== 'object' || !has(inv, TRAPPING.LEGACY_TRAP)) return;
    const n = Math.max(0, Math.floor(Number(inv[TRAPPING.LEGACY_TRAP]) || 0));
    delete inv[TRAPPING.LEGACY_TRAP];
    if (n > 0) inv[TRAPPING.TRAP] = trapsIn(ps) + n;
  },

  /* ═══ make_traps {log, count} -- the Woodworker's Traps tab ═══
     smelting.js's shape: the log looked up as the table's own key, the count
     clamped to 1-50 and then to the logs on hand, logs taken and traps given
     in one synchronous run, a little Woodworking XP, saved, and a private
     receipt.  Every refusal before anything is taken. */
  _handleMakeTraps(session, payload) {
    if (!session || !session.id) return;
    const ws = this._wsBySessionId(session.id);
    const reply = (p) => { if (ws) { try { ws.send(JSON.stringify({ type: 'make_traps_result', payload: p })); } catch (e) {} } };
    if (this._trapcraftOff()) return reply({ error: 'off' });
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const log = payload && typeof payload.log === 'string' ? payload.log : '';
    if (!has(TRAPPING.LOGS, log)) return reply({ error: 'bad-log', log });
    const per = TRAPPING.LOGS[log];
    if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
    const held = has(ps.inventory, log) ? Math.max(0, Math.floor(Number(ps.inventory[log]) || 0)) : 0;
    let count = Math.floor(Number(payload && payload.count) || 1);
    if (!(count >= 1)) count = 1;
    count = Math.min(count, TRAPPING.MAX_PER_REQUEST, Math.floor(held / per));
    if (count < 1) return reply({ error: 'no-logs', log, need: per, have: held });

    ps.inventory[log] = held - count * per;
    if (ps.inventory[log] <= 0) delete ps.inventory[log];
    ps.inventory[TRAPPING.TRAP] = trapsIn(ps) + count;

    let xp = 0, leveled = false, newLevel = 0;
    try {
      this._trapSkillReady(ps, 'woodworking');
      xp = TRAPPING.MAKE_XP * count;
      const r = this._addLifeSkillXp(ps, 'woodworking', xp);
      leveled = !!(r && r.leveled); newLevel = (r && r.newLevel) || 0;
    } catch (e) { /* the traps are made; an XP fault must not undo them */ }
    this._saveRpg(session.id, ps);
    reply({ made: count, log, xp, leveled, newLevel, traps: trapsIn(ps) });
    if (ws) this._sendPlayerState(ws, session.id);
  },

  /* ═══ trap_arm {monsterId} ═══
     Every gate before anything is marked; a refusal costs nothing and says
     why.  Arming another monster MOVES your one mark there (one armed monster
     at a time); arming the same one again restarts its clock. */
  _handleTrapArm(session, payload) {
    if (!session || !session.id) return;
    const pid = session.id;
    const monsterId = payload && typeof payload.monsterId === 'string' ? payload.monsterId : '';
    const ws = this._wsBySessionId(pid);
    const refuse = (error, extra) => {
      if (ws) { try { ws.send(JSON.stringify({ type: 'trap_armed', payload: { monsterId, error, ...(extra || {}) } })); } catch (e) {} }
    };
    if (this._trappingOff()) return refuse('off');
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return refuse('not-now');
    if (ps.z !== WHEEL_ZONE) return refuse('not-here');
    const list = this.monsters[ps.z] || [];
    const m = monsterId ? list.find((x) => x && x.id === monsterId) : null;
    if (!m || typeof m.home !== 'string' || !this._monsterDamageable(m)) return refuse('no-monster');
    if (this._wheelSafeAt(ps.x, ps.y) || this._wheelSafeAt(m.x, m.y)) return refuse('safe-ground');
    const dx = m.x - ps.x, dy = m.y - ps.y;
    if (dx * dx + dy * dy > TRAPPING.ARM_RANGE * TRAPPING.ARM_RANGE) return refuse('too-far');
    const T = trapLevelOf(ps);
    const M = Math.max(1, Math.floor(Number(m.level) || 1));
    if (M > T) return refuse('level', { need: M, have: T });
    if (trapsIn(ps) < 1) return refuse('no-trap');
    const book = this._petbookOf ? this._petbookOf(pid) : null;
    if (!book || book.locked) return refuse('pets-unavailable');
    if (book.rec.list.length >= book.rec.cap) return refuse('pets-full', { cap: book.rec.cap });
    const now = Date.now();
    const rt = this._trapRt(pid);
    rt.catches = rt.catches.filter((t) => now - t < 3600000);
    if (rt.catches.length >= TRAPPING.CATCH_PER_HOUR) return refuse('catch-cap');
    rt.arms = rt.arms.filter((t) => now - t < 60000);
    if (rt.arms.length >= TRAPPING.ARMS_PER_MIN) return refuse('too-fast');

    /* Move the one mark: off the monster it was on, if another. */
    if (rt.mark && rt.mark.monsterId !== m.id) {
      const old = (this.monsters[rt.mark.zone] || []).find((x) => x && x.id === rt.mark.monsterId);
      if (old && old._armedBy instanceof Map) old._armedBy.delete(pid);
    }
    if (!(m._armedBy instanceof Map)) m._armedBy = new Map();
    for (const [k, until] of m._armedBy) if (until < now) m._armedBy.delete(k);   /* stale marks */
    const until = now + TRAPPING.MARK_MS;
    m._armedBy.set(pid, until);
    rt.mark = { monsterId: m.id, zone: ps.z, until };
    rt.arms.push(now);
    const chance = trapChance(T, M);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'trap_armed', payload: {
          monsterId: m.id, until, ms: TRAPPING.MARK_MS, chance, stretch: trapStretch(M), traps: trapsIn(ps),
        } }));
      } catch (e) {}
    }
  },

  /* ═══ THE ROLL, AT THE KILL ═══
     Called by _resolveMonsterKill (combat.js) after the kill has paid
     everyone and before it clears dmgByPlayer, with the kill's own `shares`
     (alive, connected, in the zone; GDD §7).  A slime's death is deferred by
     its 1.6 s swell (telegraph.js): its marks are judged at the KILLING BLOW
     (`m._trapJudgeAt`, stamped where the kill was first asked for), so the
     swell cannot run a mark out.  Each armed player rolls once, alone:
       - the mark had run out by the blow   -> nothing (the trap stays);
       - under MIN_SHARE of the damage       -> told so, the trap stays;
       - no trap left in the bag             -> told so;
       - otherwise one trap is used, the four checks rolled, a catch written
         to pets:<pid> at once (petbook.js), a miss counted in memory, and
         Trapping XP paid LAST, inside a try. */
  _trapRollOnKill(zone, m, shares) {
    const armed = m && m._armedBy;
    const judge = (m && m._trapJudgeAt) || Date.now();
    if (m) { m._armedBy = null; m._trapJudgeAt = 0; }
    if (!(armed instanceof Map) || armed.size === 0) return;
    if (this._trappingOff()) return;
    const now = Date.now();
    for (const [pid, until] of armed) {
      if (!(until >= judge)) continue;
      const rt = this._trapRuntime && this._trapRuntime.get(pid);
      if (rt && rt.mark && rt.mark.monsterId === m.id) rt.mark = null;
      const ps = this.playerState[pid];
      if (!ps || ps.dead || ps.disconnected || ps.z !== zone) continue;
      const ws = this._wsBySessionId(pid);
      const tell = (p) => { if (ws) { try { ws.send(JSON.stringify({ type: 'trap_result', payload: { monsterId: m.id, ...p } })); } catch (e) {} } };
      const share = has(shares, pid) ? Number(shares[pid]) || 0 : 0;
      if (!(share >= TRAPPING.MIN_SHARE)) { tell({ sprung: false, why: 'share' }); continue; }
      if (trapsIn(ps) < 1) { tell({ sprung: false, why: 'no-trap' }); continue; }
      const book = this._petbookOf ? this._petbookOf(pid) : null;
      if (!book || book.locked) { tell({ sprung: false, why: 'pets-unavailable' }); continue; }
      const T = trapLevelOf(ps);
      const M = Math.max(1, Math.floor(Number(m.level) || 1));
      const chance = trapChance(T, M);
      if (!(chance > 0)) { tell({ sprung: false, why: 'level' }); continue; }

      /* One trap, caught or not. */
      ps.inventory[TRAPPING.TRAP] = trapsIn(ps) - 1;
      if (ps.inventory[TRAPPING.TRAP] <= 0) delete ps.inventory[TRAPPING.TRAP];
      /* The dice.  `_trapForced` is the admin test kit's lever (devtools.js
         /dev/trapping `next`): one roll forced to catch or miss, for the QA
         scenario and the owner's own look at a catch, never set by play and
         never stored.  `_trapRng` is the suites' seam. */
      const forced = (this._trapForced instanceof Map) ? this._trapForced.get(pid) : null;
      if (forced) this._trapForced.delete(pid);
      const rng = forced === 'catch' ? () => 0 : forced === 'miss' ? () => 0.999999
        : (typeof this._trapRng === 'function' ? this._trapRng : Math.random);
      const { caught, shakes } = trapShakes(chance, rng);
      const stretch = trapStretch(M);
      let pet = null;
      if (caught) {
        pet = this._petbookAddCatch(pid, ps, m, T, now);
        this._trapRt(pid).catches.push(now);
      } else {
        this._petbookCountMiss(pid, m, now);
      }
      const tries = this._petbookTries(pid, m);

      let xp = 0, leveled = false, newLevel = 0;
      try {
        this._trapSkillReady(ps, 'trapping');
        xp = trapRollXp(stretch, T - M) + (caught ? trapCatchXp(stretch) : 0);
        const r = this._addLifeSkillXp(ps, 'trapping', xp);
        leveled = !!(r && r.leveled); newLevel = (r && r.newLevel) || 0;
      } catch (e) { xp = 0; /* the roll stands; an XP fault must not undo a catch */ }
      this._saveRpg(pid, ps);
      tell({ sprung: true, caught, shakes, pet, chance, stretch, xp, leveled, newLevel, tries, traps: trapsIn(ps) });
      if (pet) this._petbookSend(pid);
      this._queuePlayerStateFlush(pid);
    }
  },
};
