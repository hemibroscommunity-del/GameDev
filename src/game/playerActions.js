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
import { SWING_COOLDOWN, SPECIAL_ATK_MULT, specialAtkMultFor, BT_AUDIO, meleeSwingSfx, getActiveWeapon, calcSpecialDmg, calcWeaponDmg, monsterBodyY, swingCooldownMult, specialManaCost, burstRefusal, burstWeapon, PROG3, ELEMENTS } from '@/data/index.js';
import { addBuildUse, clearSwingHitFlags, pushDmgPopup, isPlayerDead } from '@/game/combatHelpers.js';

export function swingAttack(S) {
    /* v2.3.1473: a corpse doesn't swing (see isPlayerDead). */
    if (isPlayerDead(S)) return;
    /* v2.3.1500 (owner): no attacking while a life-skill animation is
       playing.  The harvest pose and a swing pose are the same body, so a tap
       mid-chop used to swap the character to a swing for a frame and leave the
       harvest running underneath. */
    if (S._extraction) return;

    /* v2.3.1134: the manual tap gate honors Tempo like the auto-attack loop
       does, else tap-attackers get no benefit from the channel.  (The amulet
       atkSpd bonus was never applied here — unchanged, out of scope.) */
    if (!S.rpg || Date.now() - S.swingTimer < SWING_COOLDOWN * swingCooldownMult(S.rpg)) return;
    if (S._playerStunUntil && Date.now() < S._playerStunUntil) return;
    var slot = S.rpg.activeSlot || 'melee';
    /* Ranged/staff: let the auto-attack loop fire the projectile on the
       next frame so the first shot matches the equipped weapon. Resetting
       swingTimer here would force a melee swing AND delay the projectile
       by the full swing cooldown. */
    if (slot === 'ranged' || slot === 'staff') return;
    /* v2.3.1682 (owner: "the character can still make an initial swing
       without a sword").  The auto-attack loop has refused to fire on an
       empty slot since v2.3.212 (monsterCombat's `_eqWpn` gate), but this
       MANUAL tap path never checked -- so a weaponless character could tap
       out one full swing (animation, sfx, hit sweep) and only the FOLLOW-UP
       swings were suppressed by the loop.  That read as "the first swing is
       free" and became visible to everyone once v2.3.1676 made every fresh
       character start with all three weapon slots empty.
       Only the melee arm needs the check here: ranged/staff returned above
       and are gated in the loop.  S.rpg.weapon mirrors what getActiveWeapon
       resolves for the melee slot. */
    if (!S.rpg.weapon) return;
    S.swingTimer = Date.now();
    S.isSwinging = true;
    S._specialAttack = false;
    clearSwingHitFlags(S); /* v2.3.1421: fresh dedup per swing (quick re-tap fix) */
    /* v2.3.1798: rotate the owner's three swing samples (level-matched in
       BT_AUDIO.swordSwing); bamboo keeps its own. */
    BT_AUDIO.swordSwing(meleeSwingSfx(S.rpg), { vol: 0.55 });
}

export function specialAttack(S) {
    if (!S.rpg) return;
    /* v2.3.1473: no specials during the death animation either. */
    if (isPlayerDead(S)) return;
    /* v2.3.1500 (owner): no attacking while a life-skill animation is
       playing.  The harvest pose and a swing pose are the same body, so a tap
       mid-chop used to swap the character to a swing for a frame and leave the
       harvest running underneath. */
    if (S._extraction) return;

    var R = S.rpg;
    var now = Date.now();

    /* §4.5 Swipe cooldown check */
    if (now - (S._lastSwipe || 0) < 1500) return;

    /* §4.5 Mana cost.
       v2.3.172: cost = floor(maxMana / 5) so the 5-segment MP bar
       drained exactly one segment per special.  Tier still affects
       damage via SPECIAL_ATK_MULT downstream; it no longer affects
       cost.  Old formula was `15 + tierIdx * 3` (15-24).
       v2.3.1734: FLAT (PROG3.SPECIAL_MANA_COST) against a worker that
       advertises caps.elemBurst.  A cost that was a fraction of max
       meant five casts per bar at Magic 1 and five at Magic 100 —
       training Magic bought nothing.  specialManaCost() keeps the old
       formula against an old worker so the prediction still matches
       what THAT worker charges (rule 19); see src/data/prog3.js. */
    var activeWpn = getActiveWeapon(R);
    /* v2.3.212: no weapon equipped in active slot -> special disabled.
       v2.3.1716: ...but SAY SO.  This returned in total silence, and since
       v2.3.1715 the desktop hints strip advertises "R-Click Special" and
       "F Special" on screen, so a new player reads those, presses them at
       spawn with an empty slot, and gets nothing at all -- indistinguishable
       from a broken game.  A fresh character IS bare (weapons start in the
       bag, unequipped), so this is the FIRST thing a new player hits.  The
       no-mana branch a few lines below already floats a popup; this is the
       same courtesy for the other refusal. */
    if (!activeWpn) {
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'No weapon equipped!', '#D8A94D', { ts: now });
      return;
    }
    var tierIdx = {
      common: 0,
      elemental: 1,
      fusion: 2,
      shift: 3
    }[activeWpn.tier] || 0;
    var manaCost = specialManaCost(R);
    /* During tutorial step 4, make swipe free so player can learn */
    var isTutorialSwipe = (S._tutorialStep || 0) === 4;
    if (!isTutorialSwipe && (R.mana || 0) < manaCost) {
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'No mana!', '#3498DB', { ts: now });
      return;
    }
    if (!isTutorialSwipe) {
      /* Server-authoritative mana in MP: predict the deduction locally
         for snappy bar feedback, then send ability_use so the worker
         validates + applies.  player_state arrives shortly with the
         authoritative value. */
      R.mana -= manaCost;
      /* v2.3.1702: `_serverMonsters` removed — it is a "this zone's monsters
         are server-driven" flag, FALSE in town and in every hub, so the
         worker never heard about a special / dodge / lunge / retreat used
         there.  The client predicted the spend, the worker's pool never
         moved, and its next player_state echo refunded it: a free ability
         anywhere outside a spoke zone.  _handleAbilityUse is zone-agnostic
         (it only reads the pool), so `S.channel` is the whole gate. */
      if (S.channel) {
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
      /* v2.3.1111: aim at the body centre (see monsterCombat aim note). */
      aimAng = Math.atan2((monsterBodyY(lt) || 0) - S.player.y, (lt.x || 0) - S.player.x);
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
      var wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn);
      /* v2.3.1402 (owner): capture a NORMAL bow hit's damage at fire time
         so the landed arrow's lingering ground-tick (projectiles.js) deals
         base damage, immune to a later weapon swap. */
      var _bowBase = Math.max(1, Math.round(calcWeaponDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn)));
      S.arrows.push({
        ang: aimAng,
        dist: 14,
        dmg: Math.round(wpnDmg * specialAtkMultFor('bow')), /* v2.3.1397: bow special 3x (owner) */
        baseDmg: _bowBase, /* v2.3.1402: lingering ground-tick base damage */
        life: 150, /* v2.3.1335: range -25% (the 675px plant cap governs reach) */
        maxLife: 150,
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
      var _wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn);
      /* v2.3.1426: the v2.3.1425 stuck-orb chip base is retired -- the
         owner meant the BOW special sticks (projectiles.js), and its
         _bowBase above already carries the chip base.  Orbs die on
         their first hit again. */
      /* v2.3.1435 (owner: "magic special is overpowered — often 4 hits
         on one monster, regular hit plus the 3 orbs"): the volley
         shares one hit set, so a monster can eat at most ONE orb of
         the cone; the other orbs pass it and spread to the crowd. */
      var _volleyHit = new Set();
      for (var si = -1; si <= 1; si++) {
        S.arrows.push({
          volleyHitIds: _volleyHit,
          ang: aimAng + si * 0.25,
          dist: 14,
          dmg: Math.round(_wpnDmg * specialAtkMultFor('staff')), /* v2.3.1397: 2x per orb, 0.6 haircut dropped (owner) */
          life: 112, /* v2.3.1335: range -25% (750->560px at 5px/tick) */
          maxLife: 112,
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
      clearSwingHitFlags(S); /* v2.3.1421: the special is a NEW swing — without this a special fired <450ms after a normal swing inherited its "already hit" flags and never registered (owner report) */
      if (hasElement) S._iceAttack = true;
      /* Broadcast the special swing so peers render the wider arc +
         gold halo.  The regular auto-swing broadcast path is skipped
         because isSwinging is already true here. */
      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_swing', payload: { id: S.myId, ts: now, special: true, wpn: (activeWpn && activeWpn.type) || 'sword', ang: aimAng } });
    }

    /* ═══ v2.3.1798: THE SPECIAL HAS A REAL SOUND ═══
       Owner supplied it: "The last one is special attack sound."
       This replaces a three-beep sawtooth/square arpeggio — a synth stand-in
       from before there were samples for any of this.  It fires for EVERY
       weapon, which is what the old arpeggio did: the per-weapon layers a few
       lines up (the bow's two sine beeps, the staff's) are flavour on top and
       are left alone, so a bow special still reads as a bow. */
    BT_AUDIO.specialSwipe({ vol: 0.55 });
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

/* ═══ v2.3.1734: ELEMENT BURST (COMBAT-OVERHAUL-PLAN PR 6) ═══
 *
 * Cast your weapon's element as a short-range nova.  100% SERVER-RESOLVED:
 * this function spends no mana locally, rolls no damage, and picks no
 * targets — it sends an EMPTY `element_burst` and the worker does all of
 * it (server/src/burst.js).  That is a deliberate departure from the
 * special attack's predict-then-send shape.  The special predicts because
 * it has an animation to start on the same frame as the tap; the burst's
 * whole visual is the nova ring, which arrives with the server's
 * `element_nova` a round-trip later, so predicting anything here would
 * only create a second source of truth to disagree with.
 *
 * The refusal popups mirror v2.3.1716's lesson: a control that does
 * nothing and says nothing is indistinguishable from a broken game, and
 * this one is doubly at risk because it is gated on THREE things a new
 * player has no reason to connect (character level, an enchanted weapon,
 * mana).  The button is normally hidden when ineligible — these fire for
 * the desktop key, which is always live.
 */
export function elementBurst(S) {
  if (!S || !S.rpg) return;
  if (isPlayerDead(S)) return;
  if (S._extraction) return;   /* parity with swing/special */
  var R = S.rpg;
  var now = Date.now();
  var wpn = burstWeapon(R);   /* NOT getActiveWeapon — see burstWeapon's note */
  var refusal = burstRefusal(R, wpn, S._lastBurstAt);
  if (refusal) {
    var msg = {
      caps: null,   /* old worker: the ability doesn't exist there — stay silent */
      level: 'Element Burst unlocks at level ' + PROG3.BURST_MIN_CHAR_LEVEL,
      no_weapon: 'No weapon equipped!',
      no_element: 'Element Burst needs an enchanted weapon',
      mana: 'Not enough mana!',
      cooldown: null,   /* a timer the player can see; nagging about it is noise */
    }[refusal];
    if (msg && now - (S._burstMsgAt || 0) > 700) {
      S._burstMsgAt = now;
      pushDmgPopup(S, S.player.x, S.player.y - 30, msg, '#8E44AD', { ts: now });
    }
    return;
  }
  /* Local cooldown stamp so the button greys out on the tap rather than
     on the echo.  The SERVER's stamp is the one that decides; this only
     stops the HUD lying for a round-trip. */
  S._lastBurstAt = now;
  var elemColor = (ELEMENTS[wpn.element1] && ELEMENTS[wpn.element1].color) || '#8E44AD';
  BT_AUDIO.beep(220, 0.10, 0.16, 'sawtooth');
  setTimeout(function () { BT_AUDIO.beep(520, 0.08, 0.10, 'triangle'); }, 70);
  /* A tiny local tell at the caster's feet so the tap feels instant even
     on a slow connection; the real nova is drawn by the element_nova
     handler (src/networking/gameEvents.js) at the server's position. */
  if (S._impactRings) {
    S._impactRings.push({ x: S.player.x, y: S.player.y, ts: now, duration: 220, maxR: 18, color: elemColor });
  }
  if (S.channel) {
    try { S.channel.send({ type: 'element_burst', payload: {} }); } catch (e) {}
  }
}
