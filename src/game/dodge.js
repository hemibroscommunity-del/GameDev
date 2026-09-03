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
import { BT_AUDIO, ELEMENTS, LUNGE_DAMAGE_MULT, LUNGE_DIRECTION_THRESHOLD, LUNGE_IFRAMES_MS, LUNGE_STAMINA_FRACTION, RETREAT_SHOT_DAMAGE_MULT, RETREAT_SHOT_STAMINA_FRACTION, RETREAT_STAFF_CONE_RAD, applyStatus, calcWeaponDmg, getActiveWeapon } from '@/data/index.js';
import { addBuildUse, pushDmgPopup, lockAimPoint } from '@/game/combatHelpers.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
import { dropShield } from '@/game/shieldToggle.js'; /* v2.3.2229 */

export var triggerContextualDodge = function (S, R, ang) {
    if (S._dodgeRoll) return;
    /* ═══ v2.3.2229: A DODGE CANCELS THE BLOCK ═══
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
    var lt = S.lockedTarget && S.lockedTarget.ref;
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
    var dodgeCost = Math.ceil((R.maxStamina || 100) * 0.2);
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
    var lungeCost = Math.ceil((R.maxStamina || 100) * (LUNGE_STAMINA_FRACTION || 0.25));
    if ((R.stamina || 0) < lungeCost) return doStandardDodge(S, R, ang);
    var lt = S.lockedTarget && S.lockedTarget.ref;
    if (!lt || !lt.alive) return doStandardDodge(S, R, ang);
    /* Server-authoritative stamina in MP — see doStandardDodge note. */
    R.stamina -= lungeCost;
    /* v2.3.1702: see the note in playerActions.js — `_serverMonsters` is
       false in town, so the worker never saw this spend and refunded it. */
    if (S.channel) {
      try { S.channel.send({ type: 'ability_use', payload: { type: 'lunge' } }); } catch (e) {}
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
      lt.curHp = (lt.curHp || lt.hp) - lDmg;
      if (hitEl) {
        var sid = (ELEMENTS[hitEl] || {}).status;
        if (sid) applyStatus(lt, sid, S.player, Date.now());
      }
      pushDmgPopup(S, lt.x, lt.y - 18, String(lDmg), '#fffbb0');
      BT_AUDIO.swordHit({ vol: 0.5 });
      /* v2.3.1747: a lunge hit used to advance the combo chain; chain removed. */
    }, 160);
  };
export var doRetreatShot = function (S, R, ang) {
    /* v2.3.213: no ranged weapon in active slot -> plain dodge. */
    var _rwSlot = R.activeSlot || 'ranged';
    var _rwEq = _rwSlot === 'staff' ? R.staffWeapon : R.rangedWeapon;
    if (!_rwEq) return doStandardDodge(S, R, ang);
    var retCost = Math.ceil((R.maxStamina || 100) * (RETREAT_SHOT_STAMINA_FRACTION || 0.20));
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
        ang: a, dist: 14, dmg: shotDmg, life: isStaff ? 68 : 90, /* v2.3.1335: range -25% */
        maxLife: isStaff ? 68 : 90, hitIds: new Set(), isStaff: isStaff,
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

