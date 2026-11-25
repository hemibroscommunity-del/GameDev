/* ═══ v2.3.6551: THE BODY FACES ITS LOCK IN THE TWO BUTTONS (card CT part 18) ═══
 *
 * In mode 5 (`?manual=5`) a tap on Attack with a monster in sight locks it
 * ('active', latch.js) and the owner was told "your bro keeps facing that
 * monster" (latch.js's own words: "'active' is the lock (the body faces
 * it...)").  It did not: the latch's lock is src 'auto', and the facing
 * sites asked targeting.js engagedStance (autoAttack, or a lock that was a
 * TAP), so between swings only the hit went to the lock and the body kept
 * the stick's way.  This is the one rule the three facing sites ask (the
 * aim at the lock, monsterCombat.js; the walk's stance, BroTown.jsx _lkFace;
 * the drawn body, entityRenderer.js lockFacing), through targeting.js
 * bodyFacesLock.
 *
 * Modes 1 to 4 are unchanged: with `twoLive` false the answer is `engaged`,
 * exactly engagedStance's.  In mode 5 a latched lock ('active' or 'auto')
 * on a MONSTER faces it; a townsperson's lock never does (walking away from
 * the mayor is no stance).  Its off-ramp is the mode's own: `?manual=4`.
 * No imports: node tests it (server/test/lock-face.test.mjs).
 */

/** `engaged` engagedStance(S); `twoLive` latch.js twoButtonsLive();
 *  `phase` latch.js latchPhase(S); `lock` S.lockedTarget. */
export function facesLock(engaged, twoLive, phase, lock) {
  if (engaged) return true;
  if (!twoLive) return false;
  if (phase !== 'active' && phase !== 'auto') return false;
  return !!(lock && lock.ref && lock.type === 'monster');
}
