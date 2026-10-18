/* ═══ v2.3.2242: THE SHIELD IS A TOGGLE ═══
 *
 * Owner: "It'll be its own shield button that appears below the right button
 * during combat. Tapping it once holds the shield. Tapping it again
 * disengages it. Shield will automatically disengage upon receiving damage
 * (successful block)."  And: "Dodge ... will cancel any blocking action."
 *
 * ONE module owns the transitions, because the shield used to be raised and
 * lowered from six places (the double-tap gesture in BroTown's rS/rE, the
 * BlockRing glyph, the LockOnActions Block button, the desktop Q key, the
 * stamina auto-release in the game loop, and raiseShield in playerActions)
 * and each carried its own copy of the same four writes -- S._shieldUp, the
 * angle, the player_shield broadcast, the blockRingBus edge.  Three of those
 * six are gone with this change; the rest call here.
 *
 * The state itself is unchanged and deliberately so: `S._shieldUp` and
 * `S._shieldAngle` are what wsClient puts on every `move` packet as
 * `blocking` / `ba`, what the renderer draws the arm and the cone from, and
 * what the server's block arc is measured against.  A toggle is a different
 * INPUT to the same contract, not a new contract.
 */
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: the shield heard going up and down */
import { blockRingBus } from '@/ui/mobile/blockRingBus.js';
import { lockAimPoint, swimRefused /* v2.3.3003 */, dazeRefused /* v2.3.3014 */, airRefused /* v2.3.3017 */ } from '@/game/combatHelpers.js';
import { isWheelSwimming } from '@/game/wheelSwim.js'; /* v2.3.3003: no button in the water */
import { targetCandidates } from '@/game/targeting.js'; /* v2.3.2472: the nearest-monster fallback below */
import { fightersNear, fightOn, FIGHT_R } from '@/game/sparTargets.js'; /* v2.3.3267: your sparring clones are a fight too; v2.3.3268: and a foe you chose, or the one who attacked you */

/* Where the shield should point: at the locked target if there is one (the
   whole meaning of a lock), else wherever the body is facing.  Called on the
   raise AND every frame while up (BroTown's loop), so a block always faces
   the thing you are fighting as it moves. */
/* ═══ v2.3.3260: ...OR THE PLAYER WHO JUST HIT YOU ═══
   Owner, on No man's land: "confirm that the shield button does become
   available the moment you're in combat for any weapon type".  It does -- a
   lock, a blow taken in the last 5 s, or a monster in reach lights it for a
   sword, a bow or a staff alike (shieldButtonLive below) -- but with no lock
   a guard raised against a PLAYER pointed at the nearest MONSTER, or at
   whatever angle the last gesture left, and the worker measures the block's
   arc (+/-60 degrees) at impact, so the arrow that lit the button walked past
   the shield it lit.  A pvp_hit on this page (gameEvents.js) remembers who
   threw it; for SHIELD_THREAT_MS the guard faces them -- below a lock (that
   is still what a lock is for), above the nearest monster (a player hitting
   you is a live threat, the monster only the closest thing). */
export const SHIELD_THREAT_MS = 3000;
export function noteShieldThreat(S, payload, now) {
  if (!S || !payload || !S.myId || payload.target !== S.myId) return false;
  if (!payload.attacker || payload.attacker === S.myId) return false;
  S._shieldThreat = { id: payload.attacker, at: typeof now === 'number' ? now : Date.now() };
  return true;
}
/* Where the last player to hit this page stands, while it is fresh and they
   are drawn here (a parked far copy -- presence v2 -- or a dead one is no
   threat to face). */
export function shieldThreatPoint(S, now) {
  const th = S && S._shieldThreat;
  if (!th) return null;
  const t = typeof now === 'number' ? now : Date.now();
  if (!(t - th.at < SHIELD_THREAT_MS)) return null;
  const o = S.others && Object.prototype.hasOwnProperty.call(S.others, th.id) ? S.others[th.id] : null;
  if (!o || o._isDead || o.dead || o._away) return null;
  return lockAimPoint(o);
}

export function shieldAimAngle(S) {
  if (!S || !S.player) return 0;
  const pt = lockAimPoint(S.lockedTarget && S.lockedTarget.ref);
  if (pt) return Math.atan2(pt.y - S.player.y, pt.x - S.player.x);
  /* v2.3.3260: the player who just hit you (the note above) */
  const tp = shieldThreatPoint(S);
  if (tp) return Math.atan2(tp.y - S.player.y, tp.x - S.player.x);
  /* ═══ v2.3.2472: NO LOCK? POINT IT AT THE NEAREST MONSTER ═══
     Owner (D8): the shield button comes back for bow and staff and "auto-aims
     at the nearest monster".  Those two weapons acquire NOTHING automatically
     (v2.3.2258 gated auto-lock to melee -- a tap is their only lock), so
     without this rung the ladder fell straight through to `_shieldAngle` and a
     ranged player raising the guard got whatever angle the last gesture
     happened to leave behind, most often the four-way body facing.  A block
     arc is +/-60 degrees and the server measures it at impact
     (_blockArcCovers), so "most often" is a guard that misses.

     targetCandidates is the same nearest-first scan targeting.js runs for the
     melee lock, called directly rather than read off `S._targetCands` -- that
     array is deliberately EMPTY for bow and staff, which is exactly the case
     this rung exists for.  Through lockAimPoint so the arc points at the body
     centre, the same point the swing and the lock aim at; a candidate whose
     ref has no usable position answers null and falls through to the rungs
     below rather than aiming at the world origin.

     BELOW the lock and ABOVE the remembered angle, deliberately: a monster you
     tapped still outranks whatever is merely closest (that is what a lock is
     for), and a remembered angle must not outrank a live threat or the guard
     would stick to the first direction it was ever raised in. */
  /* v2.3.3267: ...or the nearest of your sparring clones, out as far as one
     fights you from (a bow or staff clone keeps 280-400 px off), whichever of
     the two is nearer.  v2.3.3268: a player you chose to attack, and the one
     who attacked you, are in that list too (sparTargets.js fightersNear) */
  let near = targetCandidates(S)[0];
  const nearClone = fightersNear(S, FIGHT_R)[0];
  if (nearClone && (!near || nearClone.d2 < near.d2)) near = nearClone;
  if (near) {
    const np = lockAimPoint(near.m);
    if (np) return Math.atan2(np.y - S.player.y, np.x - S.player.x);
  }
  if (typeof S._shieldAngle === 'number') return S._shieldAngle;
  if (typeof S._aimAngle === 'number') return S._aimAngle;
  if (typeof S._facingAngle === 'number') return S._facingAngle;
  return 0;
}

/* Raise.  Every refusal raiseShield() had is kept: cooldown after a stamina
   break, and no shield item means no block (v2.3.212).  Returns whether it
   went up so a button can decline to light. */
export function raiseShieldToggle(S) {
  if (!S || !S.rpg) return false;
  const now = Date.now();
  if (S._shieldCdUntil && now < S._shieldCdUntil) return false;
  if (!S.rpg.shield) return false;
  if (S._shieldUp) return true;
  /* v2.3.3003: no block in the water -- only your head is out of it */
  if (swimRefused(S) || dazeRefused(S)) return false;
  if (airRefused(S)) return false;   /* v2.3.3017: not mid-jump */
  /* ═══ v2.3.2246: RAISING THE SHIELD CANCELS THE ATTACK ═══
     Owner: "you can both swing and block at the same time. That is not
     right."  playerActions/monsterCombat refuse to START an attack while the
     shield is up; this is the other direction -- the guard going up ends the
     swing that is already in the air, so the two can never overlap for even
     the 250ms of a swing window.
     Written as plain field writes with no React setter, which is how
     S.autoAttack is already cleared from the game loop when an extraction
     starts (BroTown.jsx `if (S._extraction) S.autoAttack = false`); the
     useState mirror is write-only and nothing reads it. */
  S.autoAttack = false;
  S._atkPending = false;   /* v2.3.3145: and a press still waiting on its tap (game/tapJump.js) */
  S.isSwinging = false;
  S._swingSfxPending = false;
  S._aiming = false;
  S._shieldUp = true;
  S._shieldAngle = shieldAimAngle(S);
  S.shieldActive = now;
  S._shieldAutoReleased = false;
  if (S.channel) {
    try { S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: true } }); } catch (e) { /* offline: the local block still holds */ }
  }
  try { blockRingBus.beginBlock(); } catch (e) { /* bus is display-only */ }
  /* v2.3.3343: the leather and buckle of the shield coming up -- these were
     two beep()s, which play nothing (SOUND-GAPS) */
  cue('shieldUp');
  return true;
}

/* Lower.  `why` is for the probe and the log, never for behaviour: a shield
   that came down because a block landed, because the player dodged, or
   because they tapped, is down the same way.  Idempotent -- the six old
   call sites each guarded against a double broadcast in their own words;
   one guard here does it for all of them. */
export function dropShield(S, why) {
  if (!S || !S._shieldUp) return false;
  S._shieldUp = false;
  S._shieldKb = false;   /* v2.3.1726's desktop mouse-steer stops with it */
  S.shieldEnd = 0;
  S._shieldDroppedWhy = why || 'tap';
  S._shieldDroppedAt = Date.now();
  if (S.channel) {
    try { S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: false } }); } catch (e) { /* as above */ }
  }
  try { blockRingBus.endBlock(); } catch (e) { /* display-only */ }
  cue('shieldDown');   /* v2.3.3343: ...and going down, softer (it was silent) */
  return true;
}

export function toggleShield(S) {
  if (!S) return false;
  if (S._shieldUp) { dropShield(S, 'tap'); return false; }
  return raiseShieldToggle(S);
}

/* "Appears below the right button DURING COMBAT."  The renderer's own
   in-combat predicate (entityRenderer `_combatTriggers`) minus autoAttack --
   a lock held, a monster close enough to matter, or a hit in the last five
   seconds -- so the button shows the moment a fight could start and lingers
   through a lull rather than blinking with every swing.  And a shield in
   hand, because raising one you do not own has been refused since v2.3.212
   and a button that refuses is worse than no button. */
export function shieldButtonLive(S, perimeterPx) {
  if (!S || !S.rpg || !S.rpg.shield) return false;
  if (isWheelSwimming(S)) return false;   /* v2.3.3003: no block in the water */
  /* ═══ v2.3.2472: THE BUTTON COMES BACK FOR BOW AND STAFF ═══
     Owner decision D8, reversing v2.3.2446 ("When you use bow or staff there
     should be no shield button") four days later, and reversing all three of
     its parts together because they were one mechanism: the button went away
     because the guard moved onto a double-tap-and-HOLD on the right control,
     and the hold is what made a button impossible -- it had no direction, and
     the whole point of that gesture was that the thumb steered the arc.

     Retiring the hold (BroTown's handleRBtnPress) gives the direction back to
     the game: shieldAimAngle above now falls through to the NEAREST monster
     when there is no lock, which is the rung bow and staff always land on
     because they auto-acquire nothing.  So the button can express the arc
     after all.

     v2.3.2542: ...and the double tap that freed up is bound to NOTHING now.
     v2.3.2472 gave it the weapon swap; the owner took that back off it after
     playing ("weapon swapping goes back to the LEFT joystick only").  The
     gesture being unbound is NOT an invitation to put this guard back on it --
     that would be two controls on one shield, which is the fight the backlog's
     §0.2 warns about.  THIS BUTTON is what replaced the gesture.

     v2.3.2446's own words for what it was protecting -- "a button appearing
     under the thumb mid-block is the thing the owner asked to be rid of" --
     are answered by the geometry rather than by hiding the control: the button
     moved to the LEFT of the disc (D9, ShieldButton.jsx), out from under the
     thumb that presses Attack.

     The `activeSlot` read is gone entirely rather than inverted: with the
     gesture retired there is no weapon-shaped reason left for this predicate
     to know which weapon is in hand.  What it always asked -- is a shield
     owned, and is a fight on -- is the whole question again. */
  /* v2.3.2242 (post-review): a RAISED shield keeps its button.  The first
     cut showed the button only "during combat", so a lock dropping or the
     last monster dying while the shield was up took the button away and
     left the shield up with no way to lower it but a dodge -- a slower
     walk with nothing on screen explaining why.  Whatever else is true,
     the thing you tapped on stays until you tap it off. */
  if (S._shieldUp) return true;
  if (S.lockedTarget && S.lockedTarget.ref) return true;
  if (S.lastDamageTaken && Date.now() - S.lastDamageTaken < 5000) return true;
  /* ═══ v2.3.3267: A SPAR IS A FIGHT, FOR EVERY WEAPON ═══
     The owner, after the first spar: "the block shield button needs to appear
     while in combat for any of the 3 combat types. It was not there."  With
     nothing locked it came only with a clone's blow and went five seconds
     later, and a bow or staff clone fights from 280-400 px, outside the
     monster's reach below -- so it came and went with each blow, and never
     came at all against a dummy.  While one of your clones is within
     FIGHT_R (about a screen) the fight is on (game/sparTargets.js).
     ═══ v2.3.3268: AND A FIGHT WITH A REAL PLAYER ═══
     The owner: "I also want to be able to use shield for when battles happen
     against real players in no mans land".  The same while a player you
     chose to attack (the window's Attack) or the one who gave you your white
     skull is that near and No man's land still lets the two of you fight:
     between their blows, and before the first. */
  if (fightOn(S)) return true;
  const P = S.player;
  const R = perimeterPx || 220;
  const list = S.monsters;
  if (P && list) {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m || !m.alive) continue;
      const dx = m.x - P.x, dy = m.y - P.y;
      if (dx * dx + dy * dy <= R * R) return true;
    }
  }
  return false;
}
