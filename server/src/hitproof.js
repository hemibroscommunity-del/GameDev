/* ═══ v2.3.3334: A HIT ON A MONSTER NEEDS ITS WEAPON, ITS REACH, AND A PAID SPECIAL ═══
 *
 * The anti-bot review's fix 8 (docs/specs/antibot-review.md §5, "hits are
 * limited per monster, not per player, and 'ranged' reaches 3,600 px without
 * a bow"; the owner's "Yes" to the bot farming holes).  combat.js
 * _handleMonsterDamage calls the three gates here.  What was wrong:
 *   - A `ranged` or `staff` claim needed no bow or staff: the roll took an
 *     unarmed greatsword's numbers (combat.js _computeAttackDamage) and the
 *     hit landed.  In the bot lab a script holding no weapon at all killed
 *     6,009 monsters an hour; an honest sword, 471.
 *   - A ranged hit could come from anywhere in a zone, or from 3,600 px in
 *     the Wheel -- about three times a maxed bow's reach -- because the stuck
 *     arrows of a bow special chip while you kite away.
 *   - A claim marked `special` was the phone's word against a monster.
 *     Against a player it has counted only after a paid swipe since v2.3.3260
 *     (pvpbalance.js); against a monster, three a monster every 1.2 s, free.
 *
 * WHAT HAPPENS NOW (kill switch `hitproof: false`: all of it as before):
 *   1. THE WEAPON.  A `ranged` claim needs a bow in the worker's own bow slot
 *      (ps.rangedWeapon), a `staff` claim a staff (ps.staffWeapon) -- the
 *      slots only the worker's equip and forge write (gear.js), never the
 *      phone's activeSlot.  Without it, nothing.  A melee claim with no sword
 *      stays a bare fist: an unarmed player is held in the safe commons
 *      until Mayor Bro arms them.
 *   2. THE REACH, from the worker's own copy of the player -- honest since
 *      the move budget and the last place (movement.js, lastplace.js):
 *        - a bow: 675 px x its Range stat (prog3, the Bow lane; an older
 *          character's x2.0 at most), + the monster's body and the arrow's
 *          own radius, + a second of the fastest honest run (an arrow flies
 *          0.47 s whatever its range, and its claim comes after it lands);
 *        - a staff: its bolt is held to its caster's live place, so 675 px x
 *          the Staff lane's Range, + its hit radius, + 0.3 s of the run;
 *        - inside a paid bow special's window, the Wheel's old 3,600: the
 *          volley's stuck arrows chip, and a missed one planted in the
 *          ground ticks, while the archer kites away for 2.5 s.
 *      In every zone (the Wheel's 3,600 was the only cap; a dungeon had none).
 *   3. A SPECIAL IS A SPECIAL ONLY AFTER ONE WAS PAID FOR.  A swipe the
 *      worker charged (index.js _handleAbilityUse) opens a window of
 *      HIT_PROOF.SPECIAL_WINDOW_MS, worth ONE special's shape: the sword's
 *      special swing on each monster in it once, the volley's three arrows,
 *      or the big bolt (its orbs, three).  Four windows at most at once, the
 *      oldest with room taken first, so two big bolts in the air both count.
 *      A `special` claim outside one rolls as an ORDINARY hit, under the
 *      ordinary lane -- never dropped: the phone fires its special even when
 *      the worker refused the swipe (playerActions.js checks its own mana),
 *      and the tutorial's free swipe sends none.
 *   And the per-monster lanes (combat.js) are trimmed by last use, not by
 *   first hit: a fight across more than 32 monsters wiped the lanes of the
 *   ones being hit now.
 *
 *   4. HOW MANY HITS A PLAYER LANDS A SECOND, ACROSS EVERY MONSTER.  The
 *      lanes (combat.js) allow a hit on EACH monster every 210 ms, so a script
 *      among a pack claimed every one of them that often.  A bow now lands at
 *      most what its shots can carry: the phone's quickest shot is every
 *      200 ms whatever the build (monsterCombat.js `effectiveSwingCd`'s floor),
 *      and an arrow hits one monster and every one its Piercing passes through
 *      (an older character's channel, the worker's own weaponSpecs copy; a
 *      prog3 character has none) -- 5 x (1 + pierce) a second.  A staff's
 *      bolts come 300 ms slower and never pierce: 2 a second.  Three seconds'
 *      worth may wait (a phone's backlog after a stall).  A paid special adds
 *      its stuck arrows' chips and a missed volley's planted ticks
 *      (CHIP_GRANT), a paid retreat its shot (an arrow, or three bolts);
 *      a special inside its window is a special and spends none.  Melee is
 *      left to its lanes and its 400 px: a swing's ring holds what it holds.
 */
import { WHEEL } from './wheelzone.js';
import { MOVE_BUDGET } from './movement.js';
import { SPRINT } from './sprint.js';
import { PROG3, prog3StatValue } from './prog3.js';

export const HIT_PROOF = Object.freeze({
  /* a paid swipe's window against monsters: the big bolt can land 3.5 s
     after it (675 px at its pace, the network on top), and a volley's stuck
     arrows chip until ~4.1 s */
  SPECIAL_WINDOW_MS: 4500,
  /* the volley's three arrows, or the big bolt's three orbs */
  SPECIAL_CLAIMS: 3,
  /* the sword's special swing: every monster in its ring once -- a
     whirlwind pulls 16 to it (abilities.js) */
  MELEE_SPECIAL_MAX: 24,
  /* windows live at once (the special's own cooldown is 1.5 s) */
  WINDOWS_MAX: 4,
  /* a bow's arrow: 675 px x the Range stat (projectiles.js BOW_RANGE_PX) */
  ARROW_PX: 675,
  /* an older character's Longshot channel at its cap (gameSystems.js
     bowRangeMult: +1%/pt to x2.0) */
  LEGACY_RANGE_MAX: 2,
  /* the monster's body, the arrow's own radius, the server's copy a move
     behind the phone */
  ARROW_SLACK_PX: 150,
  /* the time an arrow's claim is behind the archer: its 0.47 s flight and
     the claim's trip, at the fastest honest run */
  ARROW_RUN_S: 1,
  /* a staff bolt is held to its caster (projectiles.js): its 14 px start,
     the 130 px hit radius, a move behind */
  STAFF_SLACK_PX: 250,
  STAFF_RUN_S: 0.3,
  /* 4. the quickest honest shot, ms (monsterCombat.js: max(200, ...)), and the
     staff's 300 ms more */
  SHOT_MS: 200,
  STAFF_EXTRA_MS: 300,
  /* seconds of shots that may wait in hand */
  RATE_BURST_S: 3,
  /* what a paid swipe adds for the bow special's chips and its burning
     patch: one arrow of a volley carries the burn (projectiles.js
     volleyBurns), every 0.5 s for 2.5 s on each monster within 100 px, so
     eight packed in it with the archer at the quickest real pace (285 ms)
     are ~50 claims in those 2.5 s -- 24 clipped that; a script in a fight
     pays a swipe about every 19 s (the mana's regen), so this buys it ~2.5
     claims a second -- and what a paid retreat adds: its arrow, or its
     three bolts */
  CHIP_GRANT: 48,
  RETREAT_ARROWS: 1,
  RETREAT_BOLTS: 3,
  /* granted claims kept at most, past the burst */
  GRANT_MAX: 48,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const hitProofMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _hitProofOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'hitproof') && !f.hitproof);
  },

  /* the overview's counts */
  _hpTally(k) {
    const c = this._hpCount || (this._hpCount = { noWeapon: 0, far: 0, rate: 0, unpaid: 0, paid: 0 });
    c[k] = (c[k] || 0) + 1;
  },

  /* 1. a ranged or staff claim needs that weapon in the worker's own slot */
  _hitWeaponOk(ps, slot) {
    if (slot === 'ranged') return !!(ps && ps.rangedWeapon);
    if (slot === 'staff') return !!(ps && ps.staffWeapon);
    return true;
  },

  /* A swipe the worker charged (index.js _handleAbilityUse) opens a window. */
  _pveSpecialPaid(ps, now) {
    if (!ps) return;
    const t = typeof now === 'number' ? now : Date.now();
    const L = Array.isArray(ps._pveSpec) ? ps._pveSpec.filter((w) => t < w.until) : [];
    L.push({ until: t + HIT_PROOF.SPECIAL_WINDOW_MS, kind: null, n: 0, ids: null });
    while (L.length > HIT_PROOF.WINDOWS_MAX) L.shift();
    ps._pveSpec = L;
    /* 4. ...and room for a volley's chips and planted ticks */
    this._hitRateGrant(ps, 'ranged', HIT_PROOF.CHIP_GRANT, t);
  },
  /* A retreat the worker charged (index.js _handleAbilityUse): its shot. */
  _pveRetreatPaid(ps, now) {
    if (!ps) return;
    const t = typeof now === 'number' ? now : Date.now();
    this._hitRateGrant(ps, 'ranged', HIT_PROOF.RETREAT_ARROWS * (1 + this._hitPierce(ps)), t);
    this._hitRateGrant(ps, 'staff', HIT_PROOF.RETREAT_BOLTS, t);
  },

  /* Is a paid bow special's window open (the chips' and planted ticks' wider
     reach)?  One no special claim has taken yet counts: a volley that missed
     plants its arrows and claims nothing special. */
  _pveVolleyLive(ps, now) {
    const L = ps && ps._pveSpec;
    if (!Array.isArray(L)) return false;
    for (const w of L) if (now < w.until && (w.kind === null || w.kind === 'ranged')) return true;
    return false;
  },

  /* 3. May this `special` claim count as one?  Takes it from the oldest live
     window with room: the melee special once a monster, a volley arrow one,
     the big bolt its orbs (three) -- a window is one special's shape, and
     the first claim in it says which. */
  _pveSpecialTake(ps, slot, monsterId, orbs, now) {
    const L = ps && ps._pveSpec;
    if (!Array.isArray(L)) return false;
    for (const w of L) {
      if (now >= w.until) continue;
      if (w.kind !== null && w.kind !== slot) continue;
      if (slot === 'melee') {
        if (w.ids && (w.ids.has(monsterId) || w.ids.size >= HIT_PROOF.MELEE_SPECIAL_MAX)) continue;
        if (!w.ids) w.ids = new Set();
        w.ids.add(monsterId);
        w.kind = 'melee';
        return true;
      }
      const cost = (slot === 'staff' && orbs > 1) ? Math.min(HIT_PROOF.SPECIAL_CLAIMS, orbs) : 1;
      if (w.n + cost > HIT_PROOF.SPECIAL_CLAIMS) continue;
      w.n += cost;
      w.kind = slot;
      return true;
    }
    return false;
  },

  /* 2. How far a bow or staff claim may come from (game px), for this player
     now; null for melee (combat.js keeps PVE_MELEE_RANGE). */
  _hitReach(ps, slot, now) {
    if (slot !== 'ranged' && slot !== 'staff') return null;
    if (slot === 'ranged' && this._pveVolleyLive(ps, now)) return WHEEL.RANGED_MAX;
    const k = typeof this._moveSpeedK === 'function' ? this._moveSpeedK(ps) : { spdCap: 1, moveMult: 1 };
    const run = MOVE_BUDGET.SPEED_PX * k.spdCap * k.moveMult * SPRINT.MULT;
    const cat = slot === 'staff' ? 'staff' : 'bow';
    const mult = (ps && ps.prog3)
      ? 1 + PROG3.ATK.range.max * prog3StatValue(ps, 'range', cat, null)
      : HIT_PROOF.LEGACY_RANGE_MAX;
    if (slot === 'staff') return HIT_PROOF.ARROW_PX * mult + HIT_PROOF.STAFF_SLACK_PX + run * HIT_PROOF.STAFF_RUN_S;
    return HIT_PROOF.ARROW_PX * mult + HIT_PROOF.ARROW_SLACK_PX + run * HIT_PROOF.ARROW_RUN_S;
  },

  /* 4. The bow's Piercing (an older character's channel, the worker's own
     weaponSpecs copy, gameSystems.js bowPierceCount: +1 every 10 points, 10
     at most). */
  _hitPierce(ps) {
    const pts = Number(ps && ps.weaponSpecs && ps.weaponSpecs.bow && ps.weaponSpecs.bow.piercing) || 0;
    return Math.max(0, Math.min(10, Math.floor(pts / 10)));
  },
  /* claims a second a slot may carry */
  _hitRate(ps, slot) {
    if (slot === 'staff') return 1000 / (HIT_PROOF.SHOT_MS + HIT_PROOF.STAFF_EXTRA_MS);
    return (1000 / HIT_PROOF.SHOT_MS) * (1 + this._hitPierce(ps));
  },
  _hitBucketOf(ps, slot, now) {
    const all = ps._hitBucket || (ps._hitBucket = Object.create(null));
    const rate = this._hitRate(ps, slot);
    const cap = rate * HIT_PROOF.RATE_BURST_S;
    let b = all[slot];
    if (!b) b = all[slot] = { tokens: cap, at: now };
    else {
      /* refills to the burst; a grant above it stays until spent */
      const dt = Math.max(0, (now - b.at) / 1000);
      if (b.tokens < cap) b.tokens = Math.min(cap, b.tokens + rate * dt);
      b.at = now;
    }
    return { b, cap };
  },
  /* May one more bow or staff claim land now?  Takes it.  Melee: always. */
  _hitRateTake(ps, slot, now) {
    if (slot !== 'ranged' && slot !== 'staff') return true;
    const { b } = this._hitBucketOf(ps, slot, now);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  },
  /* A paid ability's shots: added past the burst, GRANT_MAX at most. */
  _hitRateGrant(ps, slot, n, now) {
    if (!ps || !(n > 0)) return;
    const t = typeof now === 'number' ? now : Date.now();
    const { b, cap } = this._hitBucketOf(ps, slot, t);
    b.tokens = Math.min(cap + HIT_PROOF.GRANT_MAX, b.tokens + n);
  },

  /* for /api/admin/overview: claims refused for want of the weapon, from too
     far, past the player's rate, specials rolled ordinary for want of a paid
     swipe, and paid ones */
  _hitProofInfo() {
    const c = this._hpCount || {};
    return { on: this._hitProofOn(), noWeapon: c.noWeapon || 0, far: c.far || 0, rate: c.rate || 0, unpaid: c.unpaid || 0, paid: c.paid || 0 };
  },
};
