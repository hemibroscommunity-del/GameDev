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
 */
import { PROG3, prog3StatValue } from './prog3.js';

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
    return ps._fs || (ps._fs = { at: 0, sw: null, f: 1, ids: null, c: 0, sc: 0 });
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
    fs.f = Math.min(1, (now - fs.at) / this._fsCycleMs(ps));
    fs.at = now;
    fs.sw = swk;
    fs.ids = new Set([key]);
    return fs.f;
  },
  /* A paid special swing: counted as a swing, its own hit untouched. */
  _fsStamp(ps, now) {
    const fs = this._fsState(ps);
    fs.at = now; fs.sw = null; fs.f = 1; fs.ids = null;
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
};
