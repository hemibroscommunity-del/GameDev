/* ═══ v2.3.4520: THE FREE-SWING TRIAL -- SWING AS OFTEN AS YOU LIKE ═══
 *
 * The owner, 2026-11-10: "What if the attack speed was uncapped (you can
 * swipe as many times as you want to hit) but the DPS is prorated by the time
 * elapsed relative to the full swing cycle?  Thinking that might be better."
 * And: "Yes pass it on.  I'd like to try."  docs/specs/manual-combat.md "The
 * free-swing trial" has the whole of it.
 *
 * ONE PHONE AT A TIME, ITS SWORD ONLY: a phone asks in its join (`fs: 1`, or
 * 2 with the bonus; its `?manual=3`, src/game/manualCombat.js).  A bow, a
 * staff, the lunge and a paid special swing are as they are; a phone that
 * does not ask meets nothing new.  combat.js calls this file:
 *   1. a swing's damage is its SHARE of a full one, f = min(1, time since
 *      this player's last counted sword swing / their full cycle), on the
 *      worker's clock: a full cycle's worth of time is a full hit's worth of
 *      damage however it is cut up;
 *   2. only f >= FULL_SWING_SHARE carries the extras (the shove, the gem's
 *      status, its collision and mana, a spark); a player's blocked stamina
 *      scales by f; XP, kill credit and lifesteal are paid by damage or on a
 *      kill, so nothing multiplies;
 *   3. one counted swing a MIN_SWING_GAP_MS: one sooner is dropped quietly
 *      and costs nothing (the clock is untouched); a swing's other targets
 *      (`sw`) take its share, each once; the fraction is carried, never
 *      rounded up, never floored at 1;
 *   4. FULL_SWING_BONUS for a full swing, if asked, on a monster only --
 *      against a player damage a second stays the untried sword's: fair.
 * SWITCHES (live flags): `freeswing: false` (no phone gets it; every phone
 * told, `free_swing`), `freeswingbonus: false` (never the bonus).
 * NOTHING IS PERSISTED (handoff rule 1): `_fs` lives on the player state.
 *
 * ═══ v2.3.4615: THE PERFECT STRIKE -- THE BONUS IS FOR TIMING, NOT WAITING ═══
 * The owner, 2026-11-10: "something that benefits the player if they swipe
 * just around the time their swing is back to full again"; of the timing
 * bar: "During this glinting must attack to get the bonus.  Same with the
 * bow."  So (4.) above is now: an attack landing from PERFECT_EARLY_MS before
 * its weapon's full cycle to PERFECT_LATE_MS after (time since this player's
 * last COUNTED attack with it, the worker's clock) is a PERFECT STRIKE:
 * FULL_SWING_BONUS harder (a sword's share x it) and PERFECT_MANA of the
 * special's cost back, ON A MONSTER ONLY; a full swing outside the window is
 * an ordinary full hit.  A sword is timed on its counted swings (`_fsSwing`);
 * a bow when its arrow leaves (its `player_projectile` relay, index.js:
 * `_pfBowShot`), its claims naming the shot (`sw`).  The device asks as
 * before (`fs: 2`, the trial's default now).  Switches: `freeswingbonus:
 * false` (no bonus, no mana), `perfectbow: false` (the bow's part).  Told as
 * `pf: 1` on monster_hit.  docs/specs/manual-combat.md "The timing bar and
 * the perfect strike".
 */
import { PROG3, prog3StatValue } from './prog3.js';
import { AMULET_TIER_POWER } from './data.js';   /* v2.3.4615: the storm amulet's speed, for the bow's cycle */
import { blockSize } from './abilities.js';     /* v2.3.4615: the special's cost, for PERFECT_MANA */

export const FREE_SWING = Object.freeze({
  /* the share a swing needs to carry the extras (the shove, the gem's status,
     its collision and mana, the spark) */
  FULL_SWING_SHARE: 0.8,
  /* counted swings at most one per this; a quicker one is dropped quietly.
     The phone swings no sooner than MANUAL.FREE_GAP_MS (150): its blade
     lands 120 ms into the swing (MELEE_CONTACT_MS), and the 50 ms over this
     is the network's wobble */
  MIN_SWING_GAP_MS: 100,
  /* a full-cycle swing's extra, for a phone that asked (`fs: 2`) */
  FULL_SWING_BONUS: 0.12,
  /* the sword's cycle: SWING_COOLDOWN x the Speed stat's cut, never under
     SPEED_FLOOR of it (gameSystems.js swingCooldownMultFor) */
  BASE_CYCLE_MS: 600,
  SPEED_FLOOR: 0.5,
  /* a swing's other targets: its claims come within its sweep (the PvP claim
     at 0-180 ms, the blade at 120 ms on) */
  SWING_SPAN_MS: 1000,
  /* targets one swing may take: a whirlwind pulls 16 (HIT_PROOF.MELEE_SPECIAL_MAX) */
  SWING_TARGETS: 24,
  /* v2.3.4615: THE PERFECT STRIKE'S WINDOW, around the full cycle (MIRROR:
     src/game/manualCombat.js MANUAL.PERFECT_EARLY_MS / PERFECT_LATE_MS, the
     timing bar's glint).  60 early: the network's wobble on two claims;
     300 late: a thumb's reaction to a glint it sees */
  PERFECT_EARLY_MS: 60,
  PERFECT_LATE_MS: 300,
  /* v2.3.4615: a perfect strike's mana, a share of the special's cost (one
     mana block, abilities.js blockSize: 20 of a new character's 100): an
     eighth, the fraction carried -- eight perfect strikes pay one special */
  PERFECT_MANA: 0.125,
  /* v2.3.4615: THE FLICKED BOW'S CYCLE, the phone's own (monsterCombat.js:
     max(SHOT_FLOOR_MS, 600 x Speed's cut x BOW_SWING_MULT / the storm
     amulet), then manualCombat.js mcBowInterval: x BOW_FASTER, never under
     BOW_MIN_MS) -- 371 ms for a new character.  MIRRORS, pinned by
     perfect-strike.test: gameSystems.js BOW_SWING_MULT, manualCombat.js
     BOW_FASTER / BOW_MIN_MS, items.js AMULET_GEM_STATS.storm */
  BOW_SWING_MULT: 0.825,
  SHOT_FLOOR_MS: 200,
  BOW_FASTER: 0.75,
  BOW_MIN_MS: 215,
  STORM_ATKSPD_BASE: 2,
  STORM_ATKSPD_PER: 1.5,
  /* v2.3.4615: an arrow's claims come within this of its shot (it flies
     0.47 s at most; hitproof.js ARROW_RUN_S), and one shot takes this many
     monsters at most (an arrow and its Piercing, 3 at most) */
  SHOT_SPAN_MS: 1500,
  SHOT_TARGETS: 4,
  /* v2.3.4615: the shots kept to judge their claims by: a flicked bow's next
     shot (371 ms) leaves before the last one lands (up to 470) */
  SHOTS_KEPT: 4,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const freeSwingMethods = {
  /* the switches, read the lower-case way (TRAPS §117): on unless written false */
  _freeSwingOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'freeswing') && !f.freeswing);
  },
  _freeSwingBonusOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'freeswingbonus') && !f.freeswingbonus);
  },
  /* v2.3.4615: the bow's perfect strike (`perfectbow: false`: the bow as
     before it, the sword's unchanged) */
  _perfectBowOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'perfectbow') && !f.perfectbow);
  },
  /* does this session play the trial now (it asked in its join, the switch is on)? */
  _freeSwingFor(session) {
    return !!session && (session.freeSwing === 1 || session.freeSwing === 2) && this._freeSwingOn();
  },
  /* liveops.js, when `freeswing` is set or cleared: every phone told */
  _freeSwingFlagChanged() {
    this.broadcastAll({ type: 'free_swing', on: this._freeSwingOn() });
  },

  /* this player's full sword cycle, ms: the Speed stat's cut (prog3.js aspd,
     the Sword lane) -- an older character's Tempo channel (+0.5 %/pt) */
  _fsCycleMs(ps) {
    let cut = 0;
    if (ps && ps.prog3) cut = PROG3.ATK.aspd.max * prog3StatValue(ps, 'aspd', 'sword', null);
    else {
      const pts = Number(ps && ps.weaponSpecs && ps.weaponSpecs.sword && ps.weaponSpecs.sword.tempo) || 0;
      cut = Math.max(0, Math.min(100, pts)) * 0.005;
    }
    return FREE_SWING.BASE_CYCLE_MS * Math.max(FREE_SWING.SPEED_FLOOR, 1 - cut);
  },
  _fsState(ps) {
    return ps._fs || (ps._fs = { at: 0, sw: null, f: 1, ids: null, c: 0, sc: 0, p: 0 });
  },
  /* v2.3.4615: is `el` ms since the last counted attack inside the perfect
     window round a `cycle` ms cycle? */
  _pfIn(el, cycle) {
    return el >= cycle - FREE_SWING.PERFECT_EARLY_MS && el <= cycle + FREE_SWING.PERFECT_LATE_MS;
  },

  /* One counted sword swing, or another target of the one counted: its share
     (0..1), or null -- sooner than MIN_SWING_GAP_MS after the last counted
     one (dropped; the clock untouched), or a target the swing already took.
     `sw` the phone's name for the swing, `key` the target ('m:' a monster,
     'p:' a player). */
  _fsSwing(ps, sw, key, now) {
    const fs = this._fsState(ps);
    const swk = (typeof sw === 'number' && Number.isFinite(sw)) ? sw : null;
    if (swk !== null && swk === fs.sw && now - fs.at <= FREE_SWING.SWING_SPAN_MS) {
      if (!fs.ids) fs.ids = new Set();
      if (fs.ids.has(key) || fs.ids.size >= FREE_SWING.SWING_TARGETS) return null;
      fs.ids.add(key);
      return fs.f;
    }
    if (now - fs.at < FREE_SWING.MIN_SWING_GAP_MS) return null;
    const cyc = this._fsCycleMs(ps);
    fs.f = Math.min(1, (now - fs.at) / cyc);
    fs.p = this._pfIn(now - fs.at, cyc) ? 1 : 0;   /* v2.3.4615: a perfect strike (1: its mana not paid yet) */
    fs.at = now;
    fs.sw = swk;
    fs.ids = new Set([key]);
    return fs.f;
  },
  /* A paid special swing: counted as a swing, its own hit untouched. */
  _fsStamp(ps, now) {
    const fs = this._fsState(ps);
    fs.at = now; fs.sw = null; fs.f = 1; fs.ids = null; fs.p = 0;
  },
  /* `k` of `full`, whole, the fraction left carried in fs[field] to the next:
     never rounded up, never floored at 1.  (+1e-9: six sixths of a hit in
     floating point are 0.9999999999999999, which must still be the hit) */
  _fsTake(fs, field, full, k) {
    const ex = Math.max(0, Number(full) || 0) * k + ((fs && fs[field]) || 0);
    const out = Math.floor(ex + 1e-9);
    if (fs) fs[field] = Math.max(0, ex - out);
    return out;
  },

  /* ═══ v2.3.4615: THE PERFECT STRIKE (header) ═══ */
  /* Does this session get the perfect strike's bonus (it asked, `fs: 2`, and
     `freeswingbonus` is on)?  The trial itself is the caller's to ask. */
  _pfAsked(session) {
    return !!session && session.freeSwing === 2 && this._freeSwingBonusOn();
  },
  /* A sword's claim on a monster, after `_fsSwing` counted it: is its swing a
     perfect strike?  The swing's first claim pays the mana. */
  _pfSword(ps, session) {
    const fs = ps && ps._fs;
    if (!fs || !fs.p || !this._pfAsked(session)) return false;
    if (fs.p === 1) { fs.p = 2; this._pfMana(session.id, ps, fs); }
    return true;
  },
  /* the flicked bow's cycle, ms (FREE_SWING's mirror notes) */
  _pfBowCycleMs(ps) {
    const cut = (ps && ps.prog3) ? PROG3.ATK.aspd.max * prog3StatValue(ps, 'aspd', 'bow', null) : 0;
    const am = ps && ps.amulet;
    const spd = (am && am.gem === 'storm')
      ? 1 + Math.round((FREE_SWING.STORM_ATKSPD_BASE + FREE_SWING.STORM_ATKSPD_PER * (AMULET_TIER_POWER[am.tier] || 1)) * 10) / 1000
      : 1;
    const held = Math.max(FREE_SWING.SHOT_FLOOR_MS, Math.floor(FREE_SWING.BASE_CYCLE_MS * Math.max(FREE_SWING.SPEED_FLOOR, 1 - cut) * FREE_SWING.BOW_SWING_MULT / spd));
    return Math.max(FREE_SWING.BOW_MIN_MS, Math.floor(held * FREE_SWING.BOW_FASTER));
  },
  /* A bow's arrow leaves (index.js: its `player_projectile` relay, before the
     relay is rebuilt): stamped on the worker's clock and judged against the
     last shot.  A special's volley, a retreat's arrow and a staff's bolt are
     not judged: the volley and the retreat restart the clock (the phone's
     bar restarts at every attack), a bolt touches nothing.  Only for a
     session on the trial (its claims need a bow: hitproof.js). */
  _pfBowShot(session, payload, now) {
    if (!payload || payload.isStaff || !this._freeSwingFor(session) || !this._perfectBowOn()) return;
    const ps = this.playerState && this.playerState[session.id];
    if (!ps) return;
    const b = ps._pfb || (ps._pfb = { at: 0, q: [] });
    const judged = !payload.isSpecial && !payload.retreat;
    const p = (judged && this._pfIn(now - b.at, this._pfBowCycleMs(ps))) ? 1 : 0;
    b.at = now;
    const sw = (typeof payload.ts === 'number' && Number.isFinite(payload.ts)) ? payload.ts : null;
    if (sw === null) return;
    b.q.push({ sw, at: now, p, ids: null });
    if (b.q.length > FREE_SWING.SHOTS_KEPT) b.q.shift();
  },
  /* An arrow's claim on a monster naming its shot (`sw`): a perfect strike?
     Each monster once a shot, SHOT_TARGETS at most; the shot's first pays
     the mana. */
  _pfBowClaim(ps, session, sw, key, now) {
    const b = ps && ps._pfb;
    if (!b || typeof sw !== 'number' || !this._perfectBowOn() || !this._pfAsked(session)) return false;
    const s = b.q.find((x) => x.sw === sw && now - x.at <= FREE_SWING.SHOT_SPAN_MS);
    if (!s || !s.p) return false;
    if (!s.ids) s.ids = new Set();
    if (s.ids.has(key) || s.ids.size >= FREE_SWING.SHOT_TARGETS) return false;
    s.ids.add(key);
    if (s.p === 1) { s.p = 2; this._pfMana(session.id, ps, b); }
    return true;
  },
  /* PERFECT_MANA of the special's cost, the fraction carried in `st.m`;
     coalesced like every mana write (persistence.js _saveRpgPools) */
  _pfMana(id, ps, st) {
    const add = this._fsTake(st, 'm', blockSize(ps, 'mana'), FREE_SWING.PERFECT_MANA);
    const max = ps.maxMana || 100;
    if (add <= 0 || (ps.mana || 0) >= max) return;
    ps.mana = Math.min(max, (ps.mana || 0) + add);
    this._saveRpgPools(id, ps);
    this._queuePlayerStateFlush(id);
  },
};
