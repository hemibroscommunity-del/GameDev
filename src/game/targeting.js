/* ═══ v2.3.2242 / v2.3.2243: TARGETING — the perimeter, the lock, the switch ═══
 *
 * Owner: "Combat will rely on the auto targeting system. The contextual
 * button will say 'attack' on it to engage the enemy and begin the existing
 * targeting system (currently tap to lock on monster). ... Monsters will
 * have a circular perimeter around them for targeting zone. It'll be same
 * for all weapon types. If multiple monsters in same perimeter there will
 * be arrows above the dashboard on that right side beneath the right button
 * that allows you to switch targets. Otherwise the target stays locked on
 * the same monster."
 *
 * The lock itself is unchanged -- the same {type:'monster', id, ref} the
 * canvas tap writes, read by the swing sweep, the projectile aim, the shield
 * angle, the reticle and the renderer's facing.  What this module adds:
 *
 *   - CANDIDATES (v2.3.2243): every alive, tangible monster whose
 *     TARGET_PERIMETER_PX circle the player is standing inside, refreshed
 *     once per frame into S._targetCands (nearest first) so the arrows, the
 *     rings and the shield button all read one list.
 *   - ENGAGE (v2.3.2242): pressing Attack with no live lock locks the nearest
 *     candidate.  Nothing in range -> no lock, and the press still swings.
 *   - PERSISTENCE (v2.3.2243): a lock holds while its monster stays inside
 *     the perimeter x TARGET_HYST -- "otherwise the target stays locked on
 *     the same monster".  The hysteresis ring is what stops a target dancing
 *     on the edge from flickering in and out.  It drops on death, on leaving
 *     that ring, or on zone change (zoneTransitions already clears it).
 *   - SWITCH (v2.3.2243): with two or more candidates, cycleTarget steps
 *     through them in SCREEN-X order, so the left arrow always means "the
 *     one to the left of this one".
 *
 * Tap-to-lock is kept as the manual override (control-redesign.md §5.1); a
 * tapped lock outside the perimeter is left alone by the persistence rule
 * until it dies or the player walks further than the hysteresis ring.
 * NPC and player locks (a duel opponent) are never touched here -- those are
 * deliberate taps and mean something else.
 */
import { TARGET_PERIMETER_PX, TARGET_HYST } from '@/data/index.js';
import { isIntangible } from '@/data/monsterVariants.js';
import { isPlayerDead } from '@/game/combatHelpers.js'; /* v2.3.2251: a corpse acquires nothing */

function monPos(m) {
  const x = (typeof m.renderX === 'number' && isFinite(m.renderX)) ? m.renderX : m.x;
  const y = (typeof m.renderY === 'number' && isFinite(m.renderY)) ? m.renderY : m.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  return { x: x, y: y };
}

function monLive(m) {
  return !!m && m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) && !isIntangible(m);
}

/* ═══ v2.3.2252: A BURROWED SNOWMAN IS STILL YOUR FIGHT ═══
 * Owner: "make the character keep his targeting on the snowman even during
 * burrow because you're still in active combat with him you just can't damage
 * him.  Makes it hard to use shield against him when auto targeting of the
 * monster drops."
 *
 * `monLive` is false while he is a snow pile (isIntangible), which is right for
 * ACQUIRING -- a mound you cannot hit must never steal the target off a live
 * monster standing next to it -- and wrong for KEEPING.  Dropping the target
 * mid-burrow points the shield away from the one thing that is about to hit
 * you, at exactly the moment the shield is the whole point.
 *
 * So the two questions are separated: `monLive` still answers "can this be
 * picked up", and this answers "is this still the thing I am fighting".  A
 * corpse fails both; a snow pile passes only this one, and only because it is
 * ALREADY the target -- the caller checks that. */
function monHoldable(m) {
  return !!m && m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0);
}

/* ═══ v2.3.2261: A LOCK'S AIM DIES WITH THE LOCK ═══
 * monsterCombat writes S._aimAngle toward a held lock on every frame and sets
 * S._aiming with it, and NEITHER has a writer that ever clears it.  So dropping
 * the lock alone was not enough: the fire chain kept reading the residue and
 * kept shooting at the ghost -- measured at exactly -1.571 rad with the lock
 * already null and no monsters left in the zone.
 *
 * `_aimSrc` says who wrote the aim last.  If it was the LOCK, it goes with the
 * lock.  If it was the player's stick or the desktop mouse, it is left entirely
 * alone -- that IS the direction they asked for, and dropping it would bring
 * back the cardinal fallback from the other side.
 *
 * Called from every site that drops a monster lock. */
function clearLockAim(S) {
  if (!S || S._aimSrc !== 'lock') return;
  S._aimAngle = null;
  S._aiming = false;
  S._aimSrc = null;
}

/* ═══ v2.3.2261: A LOCK MUST STILL BE POINTING AT SOMETHING THAT IS HERE ═══
 *
 * Owner: "the monster somehow gets targeted twice (tap to lock AND auto target
 * active) I could see both lock circles at the same time.  It also forced me to
 * shoot a different direction (as if shooting an invisible monster) even when a
 * monster was close nearby."
 *
 * Both halves are one bug, and monHoldable above is where it lives: it reads
 * the monster OBJECT'S OWN FIELDS and nothing else.  An object that has left
 * S.monsters keeps `alive: true` and a positive `curHp` for as long as anything
 * holds a reference to it -- forever, because nothing mutates a monster the
 * zone has stopped tracking.  So:
 *
 *   - the tap branch of updateTargeting asks monHoldable, gets true, and
 *     RETURNS -- the lock is immortal, and because that return sits above the
 *     automatic rule the auto target can never take over either;
 *   - lockAimPoint keeps answering with the ghost's frozen position, so every
 *     shot flies at empty ground: "as if shooting an invisible monster";
 *   - and the reticle keeps drawing there, which with a live monster nearby is
 *     the "two lock circles at the same time".
 *
 * PRESENCE IS THE MISSING TEST, and it is cheap: S.monsters is the list the
 * renderer draws and the hit tests read, so "in that array" is the authoritative
 * definition of "still in this fight".
 *
 * IT RE-BINDS BEFORE IT DROPS, and that half matters more than the drop in the
 * zone the owner actually plays in.  Spoke-zone monsters arrive over the wire;
 * a snapshot that REPLACES the array hands back objects with the same ids and
 * different identities, and a lock holding the old object would be dropped on
 * every full sync even though the monster is standing right there.  So an id
 * match re-points the lock at the live object and the fight continues -- which
 * also repairs the position the aim and the dash read.  Only a lock whose id is
 * nowhere in the zone is a ghost, and that one is cleared.
 *
 * Returns true if the lock is (still, or again) valid; false if it is gone. */
function lockRefPresent(S) {
  const lt = monsterLock(S);
  if (!lt) return true;                       /* nothing locked: nothing to fix */
  const list = (S && S.monsters) || [];
  if (list.indexOf(lt.ref) >= 0) return true; /* same object, the common case */
  if (lt.id != null) {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      /* String() on both sides: monster ids are numbers in some spawn paths and
         strings over the wire, and a === between the two silently never matches
         -- which would turn every full sync into a dropped lock. */
      if (m && m.id != null && String(m.id) === String(lt.id)) { lt.ref = m; return true; }
    }
  }
  return false;
}

/* Every monster the player could engage right now, nearest first. */
export function targetCandidates(S, radiusPx) {
  const out = [];
  if (!S || !S.player || !S.monsters) return out;
  const P = S.player;
  const R = radiusPx || TARGET_PERIMETER_PX;
  const R2 = R * R;
  for (let i = 0; i < S.monsters.length; i++) {
    const m = S.monsters[i];
    if (!monLive(m)) continue;
    const p = monPos(m);
    if (!p) continue;
    const dx = p.x - P.x, dy = p.y - P.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= R2) out.push({ m: m, d2: d2, x: p.x, y: p.y });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/* Is the current lock a MONSTER lock that the perimeter rule owns? */
function monsterLock(S) {
  const lt = S && S.lockedTarget;
  return (lt && lt.type === 'monster' && lt.ref) ? lt : null;
}

/* Does the locked monster still count?  Inside the hysteresis ring and alive. */
function lockHolds(S) {
  const lt = monsterLock(S);
  if (!lt) return false;
  /* v2.3.2252: monHoldable, not monLive -- a burrowed snowman is intangible but
     is still the fight you are in, and this is the function that decides
     whether the target survives.  Acquisition still uses monLive, so the pile
     can never be PICKED UP as a new target. */
  if (!monHoldable(lt.ref)) return false;
  const p = monPos(lt.ref);
  if (!p || !S.player) return false;
  const R = TARGET_PERIMETER_PX * TARGET_HYST;
  const dx = p.x - S.player.x, dy = p.y - S.player.y;
  return dx * dx + dy * dy <= R * R;
}

/* ═══ v2.3.2246: THE RANGE RULE OWNS ONLY THE LOCKS IT MADE ═══
 * §5.1 of the spec says a tapped lock "outside the perimeter is left alone by
 * the persistence rule", and the code did not do that: updateTargeting
 * cleared ANY monster lock outside the hysteresis ring, tapped or engaged.
 * So tap-to-lock silently stopped working past 275px -- and a bow plants at
 * 675px (up to 1350 with Longshot), so locking a distant monster and sniping
 * it, which worked before v2.3.2243, dropped the lock on the next frame.
 * That went unnoticed because the button still swung at air; with the button
 * hidden unless it can do something (v2.3.2246), tap-to-lock is now the only
 * way to engage anything beyond the perimeter, so the gap had to close.
 *
 * `viaPerimeter` is stamped by the two writers here (an Attack press and the
 * switch arrows) and by nothing else; a lock the canvas tap wrote has no such
 * mark, and keeps its old lifetime -- it ends when the monster dies (the
 * dead-lock clear in monsterCombat, which is separate and applies to every
 * lock), on zone change, or on another tap. */
function tapOwned(S) {
  const lt = monsterLock(S);
  return !!lt && lt.src === 'tap';
}

/* How much nearer a rival has to be before the auto target switches to it.
   Pure "nearest every frame" flip-flops between two monsters standing at
   near-equal distance, and every flip moves the reticle, the body facing, the
   shield angle and the next shot's aim -- a jitter the player reads as the
   game being unable to make up its mind. 12% is enough to need a real step. */
const AUTO_SWITCH_MARGIN = 0.88;

/* ═══ v2.3.2263: A TAP PICKS THE FIGHT; IT DOES NOT OWN IT FOREVER ═══
 * Owner: "the lock on targeting when attacking with melee isn't working the way
 * I want when other monsters are nearer than the one you're locked on to.  I
 * want the lock on system to go by the nearest monster for which one to target,
 * not just the one you've been fighting."
 *
 * The rule that produced that is directly above: a tap-owned lock RETURNS out
 * of updateTargeting before the automatic nearest rule can run, at any
 * distance, until the monster dies or you tap again.  So one tap early in a
 * fight pinned the target for the rest of it, and a slime standing on your feet
 * could not take it off a goblin across the clearing.
 *
 * TWO THINGS STOP THIS BEING A REVERT of the rule it narrows, because both are
 * live owner directives that a plain "always nearest" would break:
 *
 *   - A BOW OR STAFF TAP IS STILL ABSOLUTE.  v2.3.2251 made the tap the ONLY
 *     way a ranged weapon acquires anything, and v2.3.2246's snipe at 675px
 *     depends on the lock surviving far outside the 220px perimeter.  Nothing
 *     is stolen from a weapon whose automatic rule does not run at all --
 *     `autoAcquires` is the same classifier the rule below reads.
 *   - A TAP IS PINNED BRIEFLY.  "Tap a monster across the screen, then press
 *     Attack to lunge at it" is v2.3.2260's directive, and the press comes some
 *     hundreds of ms after the tap.  Without a pin, a slime already at your
 *     feet takes the lock in the very next FRAME and the lunge goes to the
 *     wrong monster -- the new rule would break the previous round's feature.
 *     TAP_PIN_MS covers thumb-to-thumb; after it, nearest wins.
 *
 * The steal itself reuses AUTO_SWITCH_MARGIN rather than inventing a second
 * threshold, so "meaningfully nearer" means one thing in this file.  A tapped
 * lock with NOTHING nearer is never touched here, which is what keeps a distant
 * tapped target alive while you close on it. */
const TAP_PIN_MS = 900;
function tapStealable(S, cands) {
  const lt = monsterLock(S);
  if (!lt) return false;
  /* Ranged and magic: the tap is the whole targeting system.  Never stolen. */
  if (!autoAcquires(S)) return false;
  /* Stamped on first sight rather than at the three tap sites, so a new one
     cannot forget it and read as instantly stealable. */
  if (lt.at == null) { lt.at = Date.now(); return false; }
  if (Date.now() - lt.at < TAP_PIN_MS) return false;
  if (!cands || !cands.length) return false;      /* nothing nearer to steal it */
  const best = cands[0];
  if (!best || best.m === lt.ref) return false;   /* already the nearest */
  const p = monPos(lt.ref);
  if (!p || !S.player) return false;
  const dx = p.x - S.player.x, dy = p.y - S.player.y;
  const curD2 = dx * dx + dy * dy;
  return best.d2 <= curD2 * AUTO_SWITCH_MARGIN * AUTO_SWITCH_MARGIN;
}

/* Once per frame (monsterCombat's tick): refresh the candidate list, then
   ACQUIRE.  Cheap -- one pass over the zone's monsters. */
/* ═══ v2.3.2258: ONLY A BLADE FINDS ITS OWN TARGET ═══
   Owner: "For ONLY melee (sword) I want to keep the auto targeting behavior
   that exists now (also within proximity of monster attack button appears) ...
   For magic and ranged, I do not want the auto targeting behavior when you get
   in proximity of monsters.  You must tap on the monster for auto-targeting
   behavior to take effect."

   S.rpg.activeSlot is the classifier the rest of the game already branches on
   ('ranged' the bow, 'staff' the magic, anything else -- including a legacy
   unset slot -- melee), so this reads the same field entityRenderer,
   monsterCombat and the equip screen read.  Defaulting the unknown case to
   MELEE is deliberate: melee is the case that keeps the old behaviour, so a
   slot this function has not heard of degrades to what shipped rather than to
   a silently disarmed one. */
export function autoAcquires(S) {
  const slot = S && S.rpg && S.rpg.activeSlot;
  return !(slot === 'ranged' || slot === 'staff');
}

export function updateTargeting(S) {
  if (!S || !S.player) return;
  const cands = targetCandidates(S);
  /* THE PERIMETER MARKS GO WITH THE RULE THEY ADVERTISE.  _targetCands is what
     draws the carets and ground rings and what lights the attack button hot
     (BroTown's `_cands`), and every one of those answers the question "who will
     this take if you press it".  With a bow the answer is "nobody, until you
     tap one", so leaving the marks up would promise an engagement that is not
     going to happen.  The TAPPED target keeps its reticle -- that is drawn from
     S.lockedTarget in its own block, not from this list. */
  S._targetCands = autoAcquires(S) ? cands : [];

  /* ═══ v2.3.2251: THE TARGET IS ALWAYS THE NEAREST, UNLESS YOU TAPPED ONE ═══
     Owner: "Change the auto targeting system to always be nearest enemy. Only
     way to pick target and lock it on is to tap on the monster."

     So this function stopped being a janitor that only ever CLEARED a lock and
     became the single writer of the automatic one.  Two kinds of lock now, and
     `src` says which: 'tap' is a deliberate pick and is left completely alone
     here, at any distance (that is what makes a bow snipe at 675px work, the
     v2.3.2246 regression); 'auto' is this rule's own and it re-points every
     frame at whatever is nearest.

     THE GUARDS THAT USED TO LIVE IN engageNearest LIVE HERE NOW, because this
     is where acquisition happens: a dead or dying player acquires nothing (a
     corpse aiming at a monster was a real bug the shield/lock clear in
     wsClient fixed), and a live NPC or player lock is a deliberate thing the
     monster rule must not stamp over. */
  const lt = S.lockedTarget;
  if (lt && lt.ref && lt.type !== 'monster') return;   /* npc/player: not ours */
  /* v2.3.2261: before ANY branch below reads the lock -- including the tap
     branch, which returns early and is what made the ghost immortal -- make the
     lock point at a monster that is actually in this zone, or drop it.  See
     lockRefPresent. */
  if (!lockRefPresent(S)) {
    S.lockedTarget = null;
    S._lockDroppedAt = Date.now();
    S._lockDroppedWhy = 'gone';
    clearLockAim(S);
  }
  if (S._dying || S._zoneLoading || isPlayerDead(S)) {
    if (S.lockedTarget) { S.lockedTarget = null; S._lockDroppedAt = Date.now(); S._lockDroppedWhy = 'dead'; clearLockAim(S); }
    return;
  }

  /* A TAPPED lock survives until it dies or you tap again -- range never
     clears it.  (v2.3.2246 §7.9: the range rule owns only the locks it made,
     and now it makes them all except this one.) */
  if (tapOwned(S)) {
    if (!monHoldable(S.lockedTarget.ref)) {
      S.lockedTarget = null;
      S._lockDroppedAt = Date.now();
      S._lockDroppedWhy = 'dead';
      clearLockAim(S);
    } else if (!tapStealable(S, cands)) {
      return;
    }
    /* else: fall through to the automatic rule below, which re-points at
       cands[0].  Only reachable for MELEE and only with a genuinely nearer
       candidate in hand -- see tapStealable -- so the `!cands.length` branch
       under it, which would DROP a distant tapped lock, cannot be reached
       from here. */
  }

  /* ═══ v2.3.2258: ...AND A BOW DOES NOT ═══
     Below this line is the automatic rule, and with a ranged or magic weapon it
     does not run at all.  Reached only when the lock is NOT tap-owned (that
     case returned above and is untouched at any distance -- it is what makes a
     bow snipe work), so anything still held here is an 'auto' lock this rule
     made, most likely while a sword was equipped a moment ago.  Dropping it on
     the weapon swap is the honest move: it was acquired by a rule that no
     longer applies, and leaving it would let a player keep a free lock simply
     by drawing the bow after walking up. */
  if (!autoAcquires(S)) {
    if (monsterLock(S)) {
      S.lockedTarget = null;
      S._lockDroppedAt = Date.now();
      S._lockDroppedWhy = 'weapon';
      clearLockAim(S);
    }
    return;
  }

  /* Everything below is the AUTO target. */
  const cur = monsterLock(S);
  if (!cands.length) {
    /* THE HYSTERESIS SURVIVES THE REWRITE.  An empty candidate list means
       nothing is inside the 220px perimeter -- but the lock is held out to
       TARGET_HYST x that (275px), and dropping it at 220 is exactly the
       flicker the ring was added to stop: a monster pacing the boundary would
       lose and regain the target several times a second, and every flip moves
       the reticle, the facing, the shield angle and the next shot's aim.
       So the lock is only cleared once it fails lockHolds -- dead, or truly
       past the ring. */
    if (cur && !lockHolds(S)) {
      S.lockedTarget = null;
      S._lockDroppedAt = Date.now();
      S._lockDroppedWhy = monHoldable(cur.ref) ? 'range' : 'dead';
      clearLockAim(S);
    }
    return;
  }
  const best = cands[0];
  if (cur && monHoldable(cur.ref) && lockHolds(S)) {
    /* fall through to the switch test below */
    if (cur.ref === best.m) return;                    /* already on it */
    /* Only switch for a MEANINGFULLY nearer rival -- see AUTO_SWITCH_MARGIN. */
    const curD2 = (() => {
      const p = monPos(cur.ref);
      if (!p) return Infinity;
      const dx = p.x - S.player.x, dy = p.y - S.player.y;
      return dx * dx + dy * dy;
    })();
    if (best.d2 > curD2 * AUTO_SWITCH_MARGIN * AUTO_SWITCH_MARGIN) return;
  }
  /* Allocate only when the monster actually changes: this runs 60x a second
     and a fresh object every frame would churn the field every consumer of
     S.lockedTarget compares by reference. */
  if (!cur || cur.ref !== best.m) {
    S.lockedTarget = { type: 'monster', id: best.m.id, ref: best.m, src: 'auto' };
  }
}

/* ═══ v2.3.2251: WHAT WENT, AND WHY ═══
 * engageNearest / heldMonster / hasCandidate / candidatesByX / cycleTarget are
 * gone.  Every one of them existed to serve the two-step press (v2.3.2246:
 * press once to engage, again to attack) or the switch arrows (v2.3.2243), and
 * the owner replaced both: "always be nearest enemy", "only way to pick target
 * and lock it on is to tap on the monster".  With acquisition automatic there
 * is nothing for a press to engage and nothing for an arrow to cycle, so the
 * button is a plain attack button again and the arrows are deleted rather than
 * left pointing at a system that no longer steps.
 *
 * `targetCandidates` stays -- the perimeter still decides who is in play, and
 * both the auto rule above and the on-screen marks read it. */

/* Is the current monster lock one the player picked by tapping? */
export function isTapLock(S) {
  return tapOwned(S);
}

/* ═══ v2.3.2251: "AM I DELIBERATELY FIGHTING THIS?" ═══
 * Before this, a monster lock existed only because the player had ASKED for
 * one -- an Attack press or a tap -- so a bare `S.lockedTarget` was a fair
 * proxy for intent, and half a dozen sites used it that way: the backpedal,
 * the locked facing, the aim write, the lock beam, the dodge context, and
 * (the dangerous one) the harvest button's priority rule.
 *
 * Automatic acquisition breaks that proxy completely.  A lock is now present
 * whenever ANY monster is within the perimeter, whether or not the player has
 * so much as looked at it -- so those sites would read "in combat" while you
 * are standing at a tree with a slime wandering past, and the harvest button
 * in particular would never appear again.
 *
 * This is the replacement, and it is deliberately narrow: you are fighting if
 * your thumb is on the attack button, or if you picked this target yourself.
 * Sites that genuinely mean "point at the current target" (shieldAimAngle,
 * lockAimPoint, the melee base angle, projectiles) keep reading the bare lock
 * -- they want the target, not the intent. */
export function engagedStance(S) {
  if (!S) return false;
  if (S.autoAttack) return true;
  const lt = monsterLock(S);
  return !!lt && lt.src === 'tap';
}
