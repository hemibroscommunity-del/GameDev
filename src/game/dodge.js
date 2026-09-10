/* ═══ DODGE — contextual dodge / lunge / retreat-shot (§5.8) ═══ */
/* v2.3.817: moved verbatim from src/ui/BroTown.jsx (REBUILD-PLAN — the
   first post-Phase-8 game-logic extraction; behavior-frozen). The §5.8
   contextual-dodge cluster shared between the touch swipe handler and the
   desktop keyboard handler: triggerContextualDodge resolves the input
   (dodge / lunge / retreat-shot) by lock-on state + swipe direction +
   active weapon, then dispatches to doStandardDodge / doLunge /
   doRetreatShot. All five take explicit (S, R, ang) — no React state, no
   refs; the only external references are the module imports below. Each
   was `var X = function...` in the component; `export var` here keeps the
   bodies byte-identical and the cross-calls resolve within the module. */
import { STAFF_LIFE } from '@/data/gameSystems.js'; /* v2.3.2387 */
import { BT_AUDIO, ELEMENTS, LUNGE_DAMAGE_MULT, LUNGE_DIRECTION_THRESHOLD, LUNGE_IFRAMES_MS, LUNGE_STAMINA_FRACTION, RETREAT_SHOT_DAMAGE_MULT, RETREAT_SHOT_STAMINA_FRACTION, RETREAT_STAFF_CONE_RAD, applyStatus, calcWeaponDmg, getActiveWeapon, rpgBlockSize } from '@/data/index.js';
import { addBuildUse, pushDmgPopup, lockAimPoint } from '@/game/combatHelpers.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
import { dropShield } from '@/game/shieldToggle.js'; /* v2.3.2242 */
import { engagedStance } from '@/game/targeting.js'; /* v2.3.2251 */
import { hitMaterialOf } from '@/data/monsterVariants.js'; /* v2.3.2452 */

export var triggerContextualDodge = function (S, R, ang) {
    if (S._dodgeRoll) return;
    /* ═══ v2.3.2242: A DODGE CANCELS THE BLOCK ═══
       Owner: "Dodge will be a swipe on the left side of the screen as it
       already is and will cancel any blocking action by doing so."  Dropped
       BEFORE the roll resolves, so a lunge or retreat-shot (which spend
       stamina and move the body) never starts with a shield still raised --
       and dropped regardless of which of the three it turns out to be. */
    dropShield(S, 'dodge');
    var ctx = resolveDodgeContext(S, ang);
    if (ctx === 'lunge') return doLunge(S, R, ang);
    if (ctx === 'retreat_shot') return doRetreatShot(S, R, ang);
    return doStandardDodge(S, R, ang);
  };
export var resolveDodgeContext = function (S, swipeAng) {
    /* v2.3.2251: a lock is acquired automatically now, so "there is a lock"
       no longer means the player is fighting.  A retreat-shot is a combat
       manoeuvre and should not fire because a slime happened to be in range
       while you rolled; it needs the same intent test the facing uses. */
    var lt = engagedStance(S) ? (S.lockedTarget && S.lockedTarget.ref) : null;
    if (!lt) return 'dodge';
    var P = S.player;
    var tx = lt.x - P.x, ty = lt.y - P.y;
    var tlen = Math.sqrt(tx * tx + ty * ty);
    if (tlen < 0.001) return 'dodge';
    var tdx = tx / tlen, tdy = ty / tlen;
    var sdx = Math.cos(swipeAng), sdy = Math.sin(swipeAng);
    var dot = sdx * tdx + sdy * tdy;
    var thresh = LUNGE_DIRECTION_THRESHOLD || 0.707;
    var slot = (S.rpg && S.rpg.activeSlot) || 'melee';
    var isRanged = slot === 'ranged' || slot === 'staff';
    if (dot > thresh && !isRanged) return 'lunge';
    if (dot < -thresh && isRanged) return 'retreat_shot';
    return 'dodge';
  };
export var doStandardDodge = function (S, R, ang) {
    var dodgeCost = rpgBlockSize(R, 'stamina');   /* v2.3.2302: one block */
    if ((R.stamina || 0) < dodgeCost) return;
    /* Server-authoritative stamina in MP: send ability_use and let the
       worker validate + deduct.  Local predict for snappy bar feedback;
       player_state arrives shortly with the authoritative value.  In SP
       the local mutation is the only writer. */
    R.stamina -= dodgeCost;
    /* v2.3.1702: see the note in playerActions.js — `_serverMonsters` is
       false in town, so the worker never saw this spend and refunded it. */
    if (S.channel) {
      try { S.channel.send({ type: 'ability_use', payload: { type: 'dodge' } }); } catch (e) {}
    }
    /* GDD §1.2 Endurance + Agility — tracked as use-frequency and
       resolved when the next monster dies. */
    addBuildUse(R, 'endurance', dodgeCost);
    addBuildUse(R, 'agility', dodgeCost);
    S._dodgeRoll = { angle: ang, startTime: Date.now() };
    /* v2.3.1011: broadcast so peers see the dodge (trail + movement). */
    /* v2.3.1702: `_serverMonsters` dropped here too — it is false in town, so
       nobody standing in the hub ever saw anybody else dodge. */
    if (S.channel) {
      try { S.channel.send({ type: 'broadcast', event: 'player_dodge', payload: { id: S.myId, kind: 'dodge', angle: ang, ts: Date.now() } }); } catch (e) {}
    }
    S._hasDodged = true;
    S._dodgeFlash = Date.now();
    if (!S.respawnTimer || Date.now() > S.respawnTimer) S.respawnTimer = Date.now() + 400;
  };
export var doLunge = function (S, R, ang) {
    /* v2.3.213: no melee weapon -> fall back to a plain dodge. */
    if (!R.weapon) return doStandardDodge(S, R, ang);
    var lungeCost = rpgBlockSize(R, 'stamina');   /* v2.3.2302: one block -- was 0.25, a block and a quarter on a bar you count */
    if ((R.stamina || 0) < lungeCost) return doStandardDodge(S, R, ang);
    var lt = S.lockedTarget && S.lockedTarget.ref;
    if (!lt || !lt.alive) return doStandardDodge(S, R, ang);
    /* Server-authoritative stamina in MP — see doStandardDodge note. */
    R.stamina -= lungeCost;
    /* v2.3.1702: see the note in playerActions.js — `_serverMonsters` is
       false in town, so the worker never saw this spend and refunded it. */
    /* ═══ v2.3.2361: NAME THE MONSTER, SO THE WORKER CAN HIT IT ═══
       One optional field on a message this function has always sent.  The
       worker's lunge deals damage ONLY when it is named (server/src/abilities.js
       _lungeStrike), which is what keeps a pre-v2.3.2351 tab — one that still
       applies its own lunge number in a server zone — from being handed a
       second, server-rolled number for the same swing.  So this field is the
       opt-in handshake, and it is why no caps flag is involved: an old worker
       ignores it, a new worker does nothing without it.
       MONSTER LOCKS ONLY.  `lt` is S.lockedTarget.ref read directly, and that
       lock is a PLAYER during a duel (game/duelLock.js) or after tapping
       somebody (BroTown.jsx) — so without the type check this would ship a
       player id on a monster field.  The worker resolves it against the monster
       list alone and fails closed either way; sending it anyway would just be a
       lie about what the field means. */
    if (S.channel) {
      var _lockIsMonster = !!(S.lockedTarget && S.lockedTarget.type === 'monster');
      var _lungeTargetId = (_lockIsMonster && lt.id != null) ? String(lt.id) : null;
      try { S.channel.send({ type: 'ability_use', payload: { type: 'lunge', targetId: _lungeTargetId } }); } catch (e) {}
    }
    addBuildUse(R, 'endurance', lungeCost);
    addBuildUse(R, 'agility', lungeCost);
    /* §12.2 cert — first lunge executed. */
    masteryEarnCert('first-lunge');
    var P = S.player;
    var tdx = lt.x - P.x, tdy = lt.y - P.y;
    var tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    var dirAng = Math.atan2(tdy, tdx);
    /* Reuse the dodge-roll state for visual + i-frames; mark as a lunge so
       the post-dash hit fires on landing. */
    S._dodgeRoll = { angle: dirAng, startTime: Date.now(), kind: 'lunge', targetId: lt.id || null };
    /* v2.3.1011: broadcast the lunge so peers see it. */
    /* v2.3.1702: `_serverMonsters` dropped here too — it is false in town, so
       nobody standing in the hub ever saw anybody else dodge. */
    if (S.channel) {
      try { S.channel.send({ type: 'broadcast', event: 'player_dodge', payload: { id: S.myId, kind: 'lunge', angle: dirAng, ts: Date.now() } }); } catch (e) {}
    }
    S._lungeIFramesUntil = Date.now() + (LUNGE_IFRAMES_MS || 150);
    S._dodgeFlash = Date.now();
    S._hasDodged = true;
    /* Hit on arrival — reduced damage, applies element_1 status (setup). */
    var activeWpn = getActiveWeapon(R);
    var pDmg = calcWeaponDmg(activeWpn.type || 'sword', R || {}, activeWpn.tierMult || 1, activeWpn);
    var lDmg = Math.max(1, Math.round(pDmg * (LUNGE_DAMAGE_MULT || 0.6)));
    setTimeout(function () {
      if (!lt.alive) return;
      var hitEl = activeWpn.element1;
      /* ═══ v2.3.2361: THE OWNER ANSWERED, AND THE WORKER ROLLS IT NOW ═══
         The note this replaces asked whether the lunge should deal damage at
         all; the answer was "Yes lunge damage should take effect", so
         server/src/abilities.js _lungeStrike now rolls it at this move's own
         0.6 next to _abilityStrikeMonster — which is what that note predicted
         it would take, and the reason it could not be done by sending
         monster_damage from here (the worker would have rolled a FULL swing).

         THE GATE BELOW STAYS, and it stays for the ORIGINAL reason, not
         because the lunge does nothing any more.  The worker's number and a
         local guess are two different numbers: they are two independent
         Math.random() rolls of the same formula, so they agree only by luck
         (v2.3.2220 for the main hit, v2.3.2350 for the collision burst,
         v2.3.2351 for this one).  In a server zone the worker rolls, the
         monster_hit echo displays — gameEvents.js has painted own server-rolled
         NUMBERS since v2.3.1733/v2.3.2220, and that half needed no change (the
         STATUS half did; see below) — and this function predicts NOTHING.  lDmg is computed above and, in a server zone,
         deliberately goes nowhere.
         Client-authoritative zones (town, and any pre-caps worker) are
         untouched: there the three lines below are still the only writer.

         AND THE STATUS IS INSIDE THE GATE WITH THEM (v2.3.2372).  A draft of
         this change put the applyStatus call OUTSIDE, so a server zone would
         still get the coloured pip and the ambient element particles the
         server owns statuses for but never syncs.  The pip then painted on
         EVERY lunge this function fired -- including every one the worker
         refuses (out of reach, inside the cadence floor, an invulnerable
         phase, a dead target, a harvest in progress) and every one sent to a
         worker too old to have _lungeStrike at all.  That is the same local
         fiction v2.3.2351 deleted the local NUMBER for, one field over.
         The pip now rides the truth the number already rides: the worker tags
         its monster_hit `ability: 'lunge'`, and gameEvents.js paints the
         status off that echo for our own hits in a server zone.  Here it stays
         gated, so the two are mutually exclusive by construction and one lunge
         can never paint twice. */
      if (!S._serverMonsters) {
        lt.curHp = (lt.curHp || lt.hp) - lDmg;
        if (hitEl) {
          var sid = (ELEMENTS[hitEl] || {}).status;
          if (sid) applyStatus(lt, sid, S.player, Date.now());
        }
        pushDmgPopup(S, lt.x, lt.y - 18, String(lDmg), '#fffbb0');
      }
      /* v2.3.2452: the lunge lands in the same body the swing does, so it
         picks its sample the same way.  `lt` is a live monster here — it is
         S.lockedTarget.ref, returned out of this function when null and again
         when !lt.alive before the strike timer fires. */
      BT_AUDIO.swordHit({ vol: 0.5 }, hitMaterialOf(lt.archetype || lt.type).kind);
      /* v2.3.1747: a lunge hit used to advance the combo chain; chain removed. */
    }, 160);
  };
export var doRetreatShot = function (S, R, ang) {
    /* v2.3.213: no ranged weapon in active slot -> plain dodge. */
    var _rwSlot = R.activeSlot || 'ranged';
    var _rwEq = _rwSlot === 'staff' ? R.staffWeapon : R.rangedWeapon;
    if (!_rwEq) return doStandardDodge(S, R, ang);
    var retCost = rpgBlockSize(R, 'stamina');     /* v2.3.2302: one block */
    if ((R.stamina || 0) < retCost) return doStandardDodge(S, R, ang);
    var lt = S.lockedTarget && S.lockedTarget.ref;
    if (!lt || !lt.alive) return doStandardDodge(S, R, ang);
    /* Server-authoritative stamina in MP — see doStandardDodge note. */
    R.stamina -= retCost;
    /* v2.3.1702: see the note in playerActions.js — `_serverMonsters` is
       false in town, so the worker never saw this spend and refunded it. */
    if (S.channel) {
      try { S.channel.send({ type: 'ability_use', payload: { type: 'retreat' } }); } catch (e) {}
    }
    addBuildUse(R, 'endurance', retCost);
    addBuildUse(R, 'agility', retCost);
    /* §12.2 cert — first retreat shot executed. */
    masteryEarnCert('first-retreat-shot');
    /* Standard dodge movement — but no i-frames per §5.8.3 (the shot is
       the tradeoff for safety). We mark this on _dodgeRoll so the damage
       interceptor can skip i-frames when checked. */
    S._dodgeRoll = { angle: ang, startTime: Date.now(), kind: 'retreat_shot', noIFrames: true };
    /* v2.3.1011: broadcast the retreat shot so peers see it. */
    /* v2.3.1702: `_serverMonsters` dropped here too — it is false in town, so
       nobody standing in the hub ever saw anybody else dodge. */
    if (S.channel) {
      try { S.channel.send({ type: 'broadcast', event: 'player_dodge', payload: { id: S.myId, kind: 'retreat_shot', angle: ang, ts: Date.now() } }); } catch (e) {}
    }
    S._dodgeFlash = Date.now();
    S._hasDodged = true;
    /* Fire a setup shot at the locked target. */
    var P = S.player;
    /* v2.3.1979: the retreat shot aimed at the target's FEET (lt.y raw), the
       one aim site that never got the v2.3.1111 body-centre fix -- so it flew
       under the hit circle by the full body offset.  Same helper as every
       other aim now; it also reads the rendered position and refuses a target
       whose position is not a number. */
    var _rLock = lockAimPoint(lt);
    var aimAng = _rLock ? Math.atan2(_rLock.y - P.y, _rLock.x - P.x)
                        : Math.atan2((lt.y || P.y) - P.y, (lt.x || P.x) - P.x);
    var activeWpn = getActiveWeapon(R);
    var pDmg = calcWeaponDmg(activeWpn.type || 'bow', R || {}, activeWpn.tierMult || 1, activeWpn);
    var shotDmg = Math.max(1, Math.round(pDmg * (RETREAT_SHOT_DAMAGE_MULT || 0.5)));
    var slot = R.activeSlot || 'ranged';
    var isStaff = slot === 'staff';
    if (!S.arrows) S.arrows = [];
    var pushArrow = function (a) {
      S.arrows.push({
        /* v2.3.1335: range -25%.  v2.3.2387: the staff's 68 becomes STAFF_LIFE
           (675px, the arrow's cap) -- gameSystems.js has the derivation. */
        ang: a, dist: 14, dmg: shotDmg, life: isStaff ? STAFF_LIFE : 90,
        maxLife: isStaff ? STAFF_LIFE : 90, hitIds: new Set(), isStaff: isStaff,
        element: activeWpn.element1 || null, retreatShot: true
      });
    };
    if (isStaff) {
      var c = RETREAT_STAFF_CONE_RAD || (25 * Math.PI / 180);
      pushArrow(aimAng - c / 2);
      pushArrow(aimAng);
      pushArrow(aimAng + c / 2);
    } else {
      pushArrow(aimAng);
    }
    BT_AUDIO.play('arrow-fly', { vol: 0.7 });
  };

