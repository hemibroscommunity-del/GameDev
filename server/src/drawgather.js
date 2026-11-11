/* ═══ v2.3.4801: THE BOW'S DRAW AND THE STAFF'S GATHER -- BUILD, THEN RELEASE ═══
 *
 * The owner, 2026-11-11: "Instead of just copying what other games do I want
 * to think about the 'feel' of the combat.  Think about the sword swing.  The
 * bow pull back and release.  The staff building power and blasting the
 * orb."  Approving the design: "build all of them (sword, bow, magic)".  Of
 * the staff: "For magic I think it should be skipped for now" (the timing
 * window).  The design is the combat-feel brief's (docs/specs/manual-combat.md
 * "The bow's draw and the staff's gather"); this file is the worker's half,
 * modelled on freeswing.js (the sword's "share of a full swing").
 *
 * THE CLAIM.  A bow's arrow may carry its DRAW (`dr`, ms) on its
 * `player_projectile` relay, a staff's bolt its GATHER (`ga`, ms) on its own;
 * every hit claim of that arrow or bolt names the shot (`sw` = the relay's
 * `ts`) on monster_damage and pvp_attack.  The phone's rules, which it
 * imports: src/game/drawGather.js (mirrored here, pinned by draw-gather.test).
 *
 * WHAT THE WORKER DOES (index.js calls _dgShot at the relay; combat.js the rest):
 *   1. THE BOUND, on the worker's clock.  A claim counts at most the time
 *      since this player's previous counted bow shot OR bolt -- ONE clock for
 *      both, or a phone switching weapons could build a full arrow and a full
 *      bolt in the same second -- plus SLACK_MS for the network.  The slack
 *      is LENT, not given: what a shot takes past the time it had is owed
 *      by the next (`debt`, never more than SLACK_MS), so over any run the
 *      draws sum to no more than the time that passed plus SLACK_MS once.
 *      A negative, a NaN, a string, Infinity: 0 (a share of nothing).  A
 *      huge number: the bound.  A field on the wrong weapon (`dr` on a bolt,
 *      `ga` on an arrow), a shot without that weapon in the worker's own
 *      slot, a special's or a retreat's shot: nothing kept.
 *   2. THE SHARE.  The shot's damage is its share of a FULL build, f =
 *      min(1, bounded build / full): a full DRAW is the flicked bow's cycle
 *      (freeswing.js _pfBowCycleMs: 371 ms on a new character -- the bow's
 *      today, so a full draw every cycle is today's damage a second); a full
 *      GATHER is the staff's own cycle, the held staff's interval and its
 *      +300 (900 ms on a new character).  Quicker shots add up to the same
 *      damage a second, as the sword's swings do.  The fraction is carried
 *      (freeswing.js _fsTake): never rounded up, never floored at 1.
 *   3. WHAT ONLY A FULL ONE CARRIES, the sword's rule (FREE_SWING
 *      .FULL_SWING_SHARE, 0.8): the shove, the gem's status, its collision
 *      and its mana, a storm gem's spark.  A lighter shot is its damage.
 *   4. THE BOW'S PERFECT SHOT: a draw from full to PERFECT_DRAW_MS after it
 *      ("the moment just after it settles"; the arm tires after), not cut
 *      under full by the bound -- the sword's perfect strike: x(1 +
 *      FULL_SWING_BONUS), PERFECT_MANA of the special's cost once a shot,
 *      `pf: 1` on monster_hit; ON A MONSTER ONLY.  No early side: the draw
 *      is measured on the phone, where the sword's 60 early is the network's
 *      wobble between two of the worker's own stamps.  NO PERFECT FOR THE
 *      STAFF (the owner).
 *   5. THE STAFF'S STAGE: spark under ORB_SHARE, orb, sphere from
 *      SPHERE_SHARE.  It sets the bolt's splash (SPLASH_K of the basic
 *      bolt's 60 px, x Detonation; none for a spark; the splash's damage the
 *      bolt's share of today's half) and a RING OF FORCE that throws the
 *      monsters the splash takes outward from the impact (RING_PX, x the
 *      zone's depth, as a debt they walk back: the knock-back's own rules;
 *      MONSTERS ONLY, the owner's decision on knock-back).  The sphere is
 *      today's bolt in reach, so a full gather's damage a second over a pack
 *      is today's.  Told as `gs` (the stage) on monster_hit.
 *   6. THE FLOORS.  One counted shot at most every MIN_GAP_MS (the sword's
 *      MIN_SWING_GAP_MS): one sooner is kept as a shot that lands nothing,
 *      and the clock is untouched.  A named shot's claims are held to the
 *      210 ms lane a monster (combat.js) and the 300 ms lane a player by
 *      their WORTH (v2.3.4799, _dgLaneTake: a full one a whole lane, a light
 *      one its share, so a tap-spam of shares keeps every hit a flurry of
 *      light sword cuts keeps).  Its claims spend their SHARE of
 *      the bow's or staff's hits-a-second allowance (hitproof.js
 *      _hitRateTake), so damage a second is held there too.  Each monster
 *      or player once a shot; an arrow its Piercing's worth, a bolt one (its
 *      splash is the worker's own).
 *   7. AGAINST A PLAYER the share applies as a sword's does (after every
 *      cut, in _applyDamage; a blocker's stamina by it too); no perfect, no
 *      mana, no ring.
 *   8. A shot with no field, a claim naming no shot (or one never stamped,
 *      or one of another weapon): TODAY'S DAMAGE, exactly -- and (v2.3.4799)
 *      a shot with no field is charged to the one clock as a FULL build
 *      (_dgWhole), and every claim, named or not, shares the target's lane.
 *      Until v2.3.4799 this line said "a forged claim gains nothing a phone
 *      leaving the field off would not", and it was false: a field-less
 *      arrow left the clock alone and a drawn one skipped the lane, so a
 *      phone MIXING the two (a field-less arrow, a full draw 1 ms later,
 *      every cycle) landed 35,044 a minute against today's best forged
 *      29,068 with double the perfects, and 1.8x today's in a duel (the
 *      combined feel's review, F1).  What holds now, draw-gather.test §9
 *      MIXED: no mix of the two lands more than today's best forged rhythm
 *      (one lane's worth more at most, once), nor more perfects than one
 *      honest full draw a cycle.
 *
 * SWITCHES (live flags, lower case): `bowdraw: false` (no draw counted;
 * caps.bowDraw un-advertised), `staffgather: false` (no gather; caps
 * .staffGather).  The perfect shot is paid to whom today's perfect
 * arrow is (a join with `fs: 2`, the phone's default; `freeswingbonus`), and
 * follows `perfectbow`.  NOT test mode: the bound can only make a shot worth less
 * than today's, so there is nothing an honest tester is held back by.
 * NOT the hidden settings: every number here but SLACK_MS is the phone's
 * too (it draws the settle and the stages), so hiding it hides nothing.
 * NOTHING IS PERSISTED (handoff rule 1): `_dg` lives on the player state.
 */
import { PROG3, prog3StatValue } from './prog3.js';
import { AMULET_TIER_POWER } from './data.js';
import { FREE_SWING } from './freeswing.js';
import { STAFF_SPLASH } from './combat.js';

export const DRAW_GATHER = Object.freeze({
  /* MIRRORS of src/game/drawGather.js (draw-gather.test §1) */
  BOW_FASTER: 0.75,
  BOW_MIN_MS: 215,
  STAFF_EXTRA_MS: 300,
  PERFECT_DRAW_MS: 300,
  FULL_SHARE: 0.8,
  ORB_SHARE: 0.4,
  SPHERE_SHARE: 0.8,
  SPLASH_K: Object.freeze([0, 0.6, 1]),
  RING_PX: Object.freeze([0, 15, 30]),
  MIN_GAP_MS: 100,
  CLAIM_MAX_MS: 60000,
  /* THE WORKER'S OWN.  The network's allowance, lent to a shot and owed by
     the next: two messages' wobble, one late and the next on time -- the
     free swing's 50 ms a message (MIN_SWING_GAP_MS 100 under the phone's
     150) twice. */
  SLACK_MS: 100,
  /* an arrow takes this many monsters at most, or its Piercing's worth
     (hitproof.js _hitPierce) if more; a bolt one */
  ARROW_TARGETS: 4,
  BOLT_TARGETS: 1,
  /* shots kept to judge their claims by: a bolt flies up to ~4.5 s (a big
     one's window, hitproof.js SPECIAL_WINDOW_MS) and a counted shot comes at
     most every MIN_GAP_MS -- 45 in flight at the very most */
  SHOTS_KEPT: 48,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const STAGE_SPECS = Object.freeze(DRAW_GATHER.SPLASH_K.map((k) => Object.freeze({
  RADIUS_PX: STAFF_SPLASH.RADIUS_PX * k, FRAC: STAFF_SPLASH.FRAC, MAX_TARGETS: STAFF_SPLASH.MAX_TARGETS,
})));

export const drawGatherMethods = {
  /* the switches, read the lower-case way (TRAPS §117): on unless written false */
  _bowDrawOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'bowdraw') && !f.bowdraw);
  },
  _staffGatherOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'staffgather') && !f.staffgather);
  },
  _dgOn(kind) {
    return kind === 'staff' ? this._staffGatherOn() : kind === 'ranged' ? this._bowDrawOn() : false;
  },

  /* the full gather, ms: the held staff's interval (monsterCombat.js
     effectiveSwingCd: max(200, 600 x the Speed stat's cut, the Staff lane,
     / a storm amulet)) and its +300 (_staffCdExtra) -- 900 on a new
     character.  The storm amulet's speed as freeswing.js _pfBowCycleMs reads it. */
  _dgStaffCycleMs(ps) {
    const cut = (ps && ps.prog3) ? PROG3.ATK.aspd.max * prog3StatValue(ps, 'aspd', 'staff', null) : 0;
    const am = ps && ps.amulet;
    const spd = (am && am.gem === 'storm')
      ? 1 + Math.round((FREE_SWING.STORM_ATKSPD_BASE + FREE_SWING.STORM_ATKSPD_PER * (AMULET_TIER_POWER[am.tier] || 1)) * 10) / 1000
      : 1;
    const held = Math.max(FREE_SWING.SHOT_FLOOR_MS, Math.floor(FREE_SWING.BASE_CYCLE_MS * Math.max(FREE_SWING.SPEED_FLOOR, 1 - cut) / spd));
    return held + DRAW_GATHER.STAFF_EXTRA_MS;
  },
  /* a full build of this weapon, ms: the full draw is the flicked bow's cycle */
  _dgFullMs(ps, kind) {
    return kind === 'staff' ? this._dgStaffCycleMs(ps) : this._pfBowCycleMs(ps);
  },
  _dgState(ps) {
    return ps._dg || (ps._dg = { at: 0, debt: 0, q: [], c: 0, sc: 0, sp: 0, m: 0 });
  },

  /* A bow's arrow or a staff's bolt leaves (index.js: its `player_projectile`
     relay, BEFORE the relay's own budget -- a tap-spam of five shots a
     second outruns the relay's four, and a shot never stamped would have its
     claims land as today's whole ones).  Stamps a shot carrying a build
     claim; anything else keeps nothing.  The relayed copy carries the build
     the worker counted, so the others draw what lands. */
  _dgShot(session, payload, now) {
    if (!session || !session.id || !payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    if (payload.isSpecial || payload.retreat) return false;
    const staff = payload.isStaff === true;
    const field = staff ? 'ga' : 'dr';
    if (!own(payload, field) || payload[field] === null || payload[field] === undefined) {
      /* no claim: today's whole arrow or bolt -- and a FULL build on the one
         clock (v2.3.4799) */
      this._dgWhole(session, staff ? 'staff' : 'ranged', now);
      return false;
    }
    const kind = staff ? 'staff' : 'ranged';
    if (!this._dgOn(kind)) return false;
    const ps = this.playerState && this.playerState[session.id];
    if (!ps || ps.dead) return false;
    if (!this._hitWeaponOk(ps, kind)) return false;   /* a build on a weapon not held */
    const sw = (typeof payload.ts === 'number' && Number.isFinite(payload.ts)) ? payload.ts : null;
    if (sw === null) return false;
    const dg = this._dgState(ps);
    if (dg.q.some((x) => x.sw === sw)) return false;   /* the same shot again: the first stands */
    const raw = payload[field];
    const claim = (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) ? Math.min(raw, DRAW_GATHER.CLAIM_MAX_MS) : 0;
    const el = now - dg.at;
    const shot = { sw, kind, at: now, f: 0, p: 0, st: 0, drop: false, ids: null };
    if (el < DRAW_GATHER.MIN_GAP_MS) {
      shot.drop = true;   /* sooner than the floor: lands nothing, the clock untouched */
      payload[field] = 0;
    } else {
      const base = el - dg.debt;
      const d = Math.min(claim, Math.max(0, base + DRAW_GATHER.SLACK_MS));
      dg.debt = Math.max(0, d - base);
      dg.at = now;
      const full = this._dgFullMs(ps, kind);
      shot.f = Math.min(1, d / full);
      /* the perfect draw: the phone's own measure inside the window, and the
         bound did not cut it under full */
      if (!staff && d >= full && claim <= full + DRAW_GATHER.PERFECT_DRAW_MS) shot.p = 1;
      if (staff) shot.st = shot.f >= DRAW_GATHER.SPHERE_SHARE ? 2 : shot.f >= DRAW_GATHER.ORB_SHARE ? 1 : 0;
      payload[field] = Math.round(d);
    }
    dg.q.push(shot);
    if (dg.q.length > DRAW_GATHER.SHOTS_KEPT) dg.q.shift();
    return true;
  },

  /* v2.3.4799: A shot with NO claim (today's whole arrow or bolt) is charged
     to the one clock as a FULL build of its weapon: the clock moves to now
     and what the time since the last shot did not cover is owed by the next
     (`debt`, at most one full build).  Before, it touched nothing: a modified
     phone loosed a field-less arrow (today's whole one, judged perfect by
     freeswing.js's own clock) and a full draw 1 ms later (still a full
     share: the clock had not moved), double the perfects and +21 % over
     today's best forged rhythm (the combined feel's review, F1).  Charged
     as a full build, every shot -- with a field or without -- spends the
     time it is worth, so a mix of the two draws no more perfects than one
     honest full draw a cycle.  Only for a phone that has drawn (or gathered)
     already: one that never has has no clock to protect, and a first draw
     after a rest is a full one anyway.  A special's shot is its own (paid,
     its own lane), as before. */
  _dgWhole(session, kind, now) {
    if (!this._bowDrawOn() && !this._staffGatherOn()) return;
    const ps = this.playerState && this.playerState[session.id];
    const dg = ps && ps._dg;
    if (!dg) return;
    const full = this._dgFullMs(ps, kind);
    const base = now - dg.at - dg.debt;
    dg.debt = Math.min(full, Math.max(0, full - base));
    dg.at = now;
  },
  /* v2.3.4799: A drawn or gathered claim on one target is HELD to that
     target's lane (combat.js: 210 ms a monster, `_monHitCad`; 300 ms a
     player, `_pvpHitLanes`) by its WORTH, not skipped: `lane[field]` is the
     time of the last whole claim (today's), so the lane is free a whole
     lane later; a claim worth `k` (its share, x the perfect bonus) moves it
     on by k of a lane.  A light shot moves it a little (a tap-spam of
     shares lands every one, as a flurry of light sword cuts does), a full
     one a whole lane.  A drawn claim may come up to one lane early (it
     needs only that the lane is not owed past now): the network bunches
     two claims, and a drawn one's worth is already held by the clock --
     once, never cumulative, so a mix of today's whole claims and drawn
     ones lands at most one lane's worth more than today's whole ones alone,
     however long it runs.  Before, a named claim skipped the lane outright
     and a field-less claim between two drawn ones had the lane to itself
     (the review's F1).  Mutates the lane only when it lets the claim
     through. */
  _dgLaneTake(lane, field, laneMs, k, now) {
    if (!lane) return true;
    const last = Number(lane[field]) || 0;
    if (now < last) return false;
    lane[field] = Math.max(last + laneMs, now) + laneMs * Math.max(0, k) - laneMs;
    return true;
  },

  /* The shot a claim names (`sw`), of this weapon, if the worker stamped one
     with a build: or null (the claim is today's). */
  _dgFind(ps, kind, sw) {
    const dg = ps && ps._dg;
    if (!dg || typeof sw !== 'number' || !Number.isFinite(sw) || !this._dgOn(kind)) return null;
    for (let i = dg.q.length - 1; i >= 0; i--) {
      const s = dg.q[i];
      if (s.sw === sw) return s.kind === kind ? s : null;
    }
    return null;
  },
  /* Does this phone get the bow's perfect bonus?  Exactly whom today's
     perfect arrow pays (freeswing.js _pfAsked: a join with `fs: 2`, every
     phone's default, and `freeswingbonus` on) and `perfectbow` on -- so no
     phone's best damage a second moves: one off the trial has no perfect
     today and gets none from a draw. */
  _dgPerfectOn(session) {
    return this._perfectBowOn() && this._pfAsked(session);
  },
  /* A claim on the shot `shot` against `key` ('m:' a monster, 'p:' a player):
     null (dropped quietly: a shot that lands nothing, or a target it took
     already, or more than it can take), or { k: its worth, pf: perfect }. */
  _dgTake(ps, session, shot, key, onMonster, gate) {
    if (!shot || shot.drop) return null;
    const max = shot.kind === 'staff' ? DRAW_GATHER.BOLT_TARGETS : Math.max(DRAW_GATHER.ARROW_TARGETS, 1 + this._hitPierce(ps));
    if (shot.ids && (shot.ids.has(key) || shot.ids.size >= max)) return null;
    const pf = !!(onMonster && shot.p && this._dgPerfectOn(session));
    const k = pf ? shot.f * (1 + FREE_SWING.FULL_SWING_BONUS) : shot.f;
    /* v2.3.4799: the target's lane, by the claim's worth (_dgLaneTake),
       BEFORE anything is spent: a claim the lane holds back takes no
       target and pays no mana */
    if (typeof gate === 'function' && !gate(k)) return null;
    if (!shot.ids) shot.ids = new Set();
    shot.ids.add(key);
    if (pf && shot.p === 1) { shot.p = 2; this._pfMana(session.id, ps, ps._dg); }
    return { k, pf };
  },

  /* The splash a bolt of stage `st` makes (combat.js _staffSplash's spec), or
     null for a spark. */
  _dgSplashSpec(st) {
    const sp = STAGE_SPECS[st];
    return sp && sp.RADIUS_PX > 0 ? sp : null;
  },
  /* A gathered bolt landed on monster `m` at (ox, oy) for `capped` (its
     roll, capped) x `k` (its share): its splash, then its ring of force on
     the monsters the splash took (chosen before it, by the splash's own
     scan, so a neighbour it kills is not swapped for one further out). */
  _dgBlast(zone, m, ox, oy, attackerId, ps, capped, shot, k) {
    const sp = this._dgSplashSpec(shot.st);
    if (!sp) return;
    const ring = this._dgRingTargets(zone, m, ox, oy, ps, sp);
    this._dgSplash(zone, m, ox, oy, attackerId, ps, capped, k, sp);
    this._dgRing(zone, ring, ox, oy, DRAW_GATHER.RING_PX[shot.st] || 0);
  },
  /* The splash's share of today's (combat.js _staffSplash, its half of the
     capped roll a neighbour), WHOLE with the fraction carried to the next
     bolt (freeswing.js _fsTake, `sp`): rounded a bolt, a 6.4 is a 6 and a
     minute of 0.8 spheres splashed 6 % under today's; and nothing at all
     when the share is under a whole point, never the splash's floor of 1
     (it would farm).  `opts`: _staffSplash's (a bolt that struck a player). */
  _dgSplash(zone, primary, ox, oy, attackerId, ps, capped, k, sp, opts) {
    const whole = this._fsTake(this._dgState(ps), 'sp', (Number(capped) || 0) * sp.FRAC, k);
    if (whole > 0) this._staffSplash(zone, primary, ox, oy, attackerId, ps, whole / sp.FRAC, sp, opts);
  },
  _dgRingTargets(zone, primary, ox, oy, ps, sp) {
    const out = [];
    const monsters = (this.monsters && this.monsters[zone]) || [];
    const r = sp.RADIUS_PX * this._staffSplashMult(ps);
    const r2 = r * r;
    for (const mm of monsters) {
      if (out.length >= sp.MAX_TARGETS) break;
      if (!mm || (primary && (mm === primary || mm.id === primary.id))) continue;
      if (!mm.alive || mm.hp <= 0) continue;
      if (typeof mm.x !== 'number' || typeof mm.y !== 'number') continue;
      const dx = mm.x - ox, dy = mm.y - oy;
      if (dx * dx + dy * dy > r2) continue;
      out.push(mm);
    }
    return out;
  },
  /* the ring: each pushed straight out from the impact by `px` x the zone's
     depth at its feet, banked as the debt it walks back (combat.js's
     knock-back, the same cap); a monster braced for its move is not moved */
  _dgRing(zone, list, ox, oy, px) {
    if (!(px > 0) || !list || !list.length) return;
    for (const mm of list) {
      if (!mm.alive || mm.hp <= 0) continue;
      if (this._moveBraced && this._moveBraced(mm)) continue;
      const kK = typeof this._depthK === 'function' ? this._depthK(zone, mm.y) : 1;
      const f = px * kK;
      const dx = mm.x - ox, dy = mm.y - oy;
      const a = (dx * dx + dy * dy > 0.25) ? Math.atan2(dy, dx) : 0;
      mm.x += Math.cos(a) * f;
      mm.y += Math.sin(a) * f;
      mm._kbDebt = Math.min((mm._kbDebt || 0) + f, 60 * kK);
      if (typeof this._keepMonsterIn === 'function') this._keepMonsterIn(zone, mm);
      this._markMonsterDirty(zone, mm.id);
    }
  },
};
