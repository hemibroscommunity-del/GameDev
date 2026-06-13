/* ═══ PLAYER ACTIONS — swing / special attack / shield raise ═══ */
/* v2.3.819: moved verbatim from the useCallback bodies in
   src/ui/BroTown.jsx (behavior-frozen). These were `useCallback`s that
   read `stateRef.current`; the component keeps thin useCallback wrappers
   (so referential identity for JSX/handlers is unchanged) and the bodies
   live here as `(S, …)` functions — S is stateRef.current passed at call
   time, identical to the originals. specialAttack's one
   `stateRef.current._tutorialStep` read became `S._tutorialStep` (same
   object). raiseShield takes setShieldUp via deps (its only React
   setter). All other references are module imports below. */
import { SWING_COOLDOWN, SPECIAL_ATK_MULT, BT_AUDIO, meleeSwingSfx, getActiveWeapon, calcSpecialDmg } from '@/data/index.js';
import { addBuildUse } from '@/game/combatHelpers.js';

export function swingAttack(S) {
    if (!S.rpg || Date.now() - S.swingTimer < SWING_COOLDOWN) return;
    if (S._playerStunUntil && Date.now() < S._playerStunUntil) return;
    var slot = S.rpg.activeSlot || 'melee';
    /* Ranged/staff: let the auto-attack loop fire the projectile on the
       next frame so the first shot matches the equipped weapon. Resetting
       swingTimer here would force a melee swing AND delay the projectile
       by the full swing cooldown. */
    if (slot === 'ranged' || slot === 'staff') return;
    S.swingTimer = Date.now();
    S.isSwinging = true;
    S._specialAttack = false;
    BT_AUDIO.play(meleeSwingSfx(S.rpg), { vol: 0.55 });
}

export function specialAttack(S) {
    if (!S.rpg) return;
    var R = S.rpg;
    var now = Date.now();

    /* §4.5 Swipe cooldown check */
    if (now - (S._lastSwipe || 0) < 1500) return;

    /* §4.5 Mana cost.
       v2.3.172: cost = floor(maxMana / 5) so the 5-segment MP bar
       drains exactly one segment per special.  Tier still affects
       damage via SPECIAL_ATK_MULT downstream; it no longer affects
       cost.  Old formula was `15 + tierIdx * 3` (15-24). */
    var activeWpn = getActiveWeapon(R);
    /* v2.3.212: no weapon equipped in active slot -> special disabled. */
    if (!activeWpn) return;
    var tierIdx = {
      common: 0,
      elemental: 1,
      fusion: 2,
      shift: 3
    }[activeWpn.tier] || 0;
    var manaCost = Math.floor((R.maxMana || 100) / 5);
    /* During tutorial step 4, make swipe free so player can learn */
    var isTutorialSwipe = (S._tutorialStep || 0) === 4;
    if (!isTutorialSwipe && (R.mana || 0) < manaCost) {
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'No mana!',
        color: '#3498DB',
        ts: now
      });
      return;
    }
    if (!isTutorialSwipe) {
      /* Server-authoritative mana in MP: predict the deduction locally
         for snappy bar feedback, then send ability_use so the worker
         validates + applies.  player_state arrives shortly with the
         authoritative value. */
      R.mana -= manaCost;
      if (S._serverMonsters && S.channel) {
        try { S.channel.send({ type: 'ability_use', payload: { type: 'swipe', tier: tierIdx } }); } catch (e) {}
      }
      /* GDD §1.2 Mind: spending mana on swipe triggers. */
      addBuildUse(R, 'mind', manaCost);
    }
    S._lastSwipe = now;
    S._hasUsedSwipe = true;
    var hasElement = activeWpn.element2 || activeWpn.element1;
    /* Aim direction — use finger swipe direction from right joystick, or locked target, or facing */
    var aimAng = S._aimAngle || 0;
    if (S.lockedTarget && S.lockedTarget.ref) {
      var lt = S.lockedTarget.ref;
      aimAng = Math.atan2((lt.y || 0) - S.player.y, (lt.x || 0) - S.player.x);
    }
    if (activeWpn.type === 'bow') {
      /* BOW heavy — large elemental arrow in swipe direction.  Renders
         in effectsRenderer as a regular arrow with a bright halo ring;
         no `ice` flag (that flag is the "draw as orb" toggle and is
         reserved for staff/ice specials now).  pierce:true keeps the
         arrow alive after each hit so it travels through every monster
         it overlaps -- hitIds prevents double-hits on the same target. */
      if (!S.arrows) S.arrows = [];
      /* v2.3.234 (Phase 4): specials scale with Mind, not weapon stat. */
      var wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult);
      S.arrows.push({
        ang: aimAng,
        dist: 14,
        dmg: Math.round(wpnDmg * SPECIAL_ATK_MULT),
        life: 200,
        maxLife: 200,
        hitIds: new Set(),
        isSpecial: true,
        isStaff: false,
        pierce: true,
        element: hasElement || null
      });
      /* v2.3.840: broadcast the bow special so peers see the big golden
         arrow fly (mirrors the regular-arrow player_projectile path). */
      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
        id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: aimAng, isStaff: false, isSpecial: true, ts: now
      }});
      BT_AUDIO.beep(400, 0.12, 0.15, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      }, 60);
    } else if (activeWpn.type === 'staff') {
      /* STAFF heavy — burst of 3 projectiles in a cone.  isStaff:true so
         the hit handler picks the 'spell' popup icon (vs 'arrow' for
         bows) and the projectile renders as magic, not a physical arrow. */
      if (!S.arrows) S.arrows = [];
      /* v2.3.234 (Phase 4): staff special damage scales with Mind. */
      var _wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult);
      for (var si = -1; si <= 1; si++) {
        S.arrows.push({
          ang: aimAng + si * 0.25,
          dist: 14,
          dmg: Math.round(_wpnDmg * SPECIAL_ATK_MULT * 0.6),
          life: 150,
          maxLife: 150,
          hitIds: new Set(),
          isSpecial: true,
          isStaff: true,
          element: hasElement || null,
          ice: true
        });
      }
      /* v2.3.840: broadcast the 3-bolt staff special cone so peers see it. */
      if (S.channel) {
        for (var _bcj = -1; _bcj <= 1; _bcj++) {
          S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
            id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: aimAng + _bcj * 0.25, isStaff: true, isSpecial: true, ts: now
          }});
        }
      }
      BT_AUDIO.beep(500, 0.15, 0.18, 'square');
      setTimeout(function () {
        return BT_AUDIO.beep(700, 0.1, 0.12, 'square');
      }, 50);
      S.screenShake = 3;
    } else {
      /* SWORD/GREATSWORD heavy — melee elemental swing */
      S.swingTimer = now;
      S.isSwinging = true;
      S._specialAttack = true;
      if (hasElement) S._iceAttack = true;
      /* Broadcast the special swing so peers render the wider arc +
         gold halo.  The regular auto-swing broadcast path is skipped
         because isSwinging is already true here. */
      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_swing', payload: { id: S.myId, ts: now, special: true } });
    }

    /* Power-up sound */
    BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
    setTimeout(function () {
      return BT_AUDIO.beep(600, 0.12, 0.15, 'square');
    }, 80);
    setTimeout(function () {
      return BT_AUDIO.beep(900, 0.1, 0.12, 'square');
    }, 160);
}

export function raiseShield(S, deps) {
  var setShieldUp = deps.setShieldUp;
    var now = Date.now();
    if (S._shieldCdUntil && now < S._shieldCdUntil) return;
    if ((S._shieldStamina || 3000) <= 0) return;
    /* v2.3.212: no shield equipped -> block is disabled. */
    if (!S.rpg || !S.rpg.shield) return;
    S._shieldUp = true;
    setShieldUp(true);
    S.shieldActive = now;
    if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: true }});
    BT_AUDIO.beep(500, 0.1, 0.15, 'sine');
    setTimeout(function () {
      return BT_AUDIO.beep(700, 0.08, 0.1, 'sine');
    }, 60);
    /* Cooldown starts when shield drops (on touch release) */
    setTimeout(function () {
      return BT_AUDIO.beep(1000, 0.12, 0.08, 'sine');
    }, 120);
}
