/* ═══ v2.3.6547: THE FREE ARROW, AND THE SWORD THAT STAYS (card CT item 8: the two-button trial, mode 5) ═══
 *
 * The owner, 2026-11-24 (an iPhone 14 Pro, the game's only player): "I want
 * free form attacks when you press the attack button prior to entering any
 * combat situation. So I want arrows to be able to shoot whenever the line of
 * site is aimed at (instead of the current behavior of only firing when
 * something is in front to fire at like props or monsters)".
 *
 * THE BOW'S GATE (monsterCombat.js, v2.3.2473 "the bow only looses when the
 * line is on something") holds an arrow back when its sight line meets
 * nothing; only a flick (`_mcFire`, manual modes 1, 3 and 4) passed it, and the
 * two buttons have no flick.  Here, in the two buttons (latch.js
 * twoButtonsLive: `?manual=5` on a touch screen) with the switch on, a press
 * of Attack with nothing sighted (the latch's 'once': tapJump.js
 * requestTapAttack, its angle the body's facing) passes the gate as a flick
 * does: the arrow flies the way the body faces, to the bow's reach (the
 * sight's `reach`, projectiles.js updateArrows), and one that meets a monster
 * hits it and starts the fight as any arrow does (a `monster_damage` claim, as
 * today; a miss makes none).  It spends the bow's cadence (S.swingTimer, the
 * gate before it), so presses cannot outrun the worker's cycle
 * (server/src/bowshot.js: an arrow counted at its relay).  The worker changes
 * nothing.  A held (latched) attack is not asked: its line is on the lock.
 * The staff already fires with no target; mode 4 and the other schemes keep
 * their gate.
 *
 * `?freefire=0` turns it off: the arrow waits for its line, as before.
 *
 * THE SWORD THAT STAYS.  The owner, the same day: "I want to change the melee
 * behavior so that it doesn't jump to every monster. Instead you must press an
 * attack charge button to get that behavior."  In the two buttons Attack's
 * press with a sword locks (the latch) and swings WHERE THE BODY STANDS:
 * nothing walks, steps or dashes the body to the monster, the left stick alone
 * moves it, and a swing that cannot reach misses.  That is the latch's press
 * as built (it returns before mode 4's handleRBtnPress, whose last line is the
 * opening lunge, abilities.js maybeSwordDash); production `main` between
 * #2293 (mode 5's stick) and #2330 (the latch) ran mode 5's Attack as mode
 * 4's press, the lunge at every press, which is what the owner felt.  The
 * rule here is the off-ramp: `?meleestay=0` lets the sword dash lunge at the
 * latch's locked monster whenever it is ready (its own cooldown and reach,
 * maybeSwordDash untouched), the frame asking latchLungeGo.  The dash's own
 * button (Charge) is a later part's.
 *
 * Two imports, switches.js and latch.js (the one gate, twoButtonsLive): node
 * tests it (tools/guards/free-attack.test.mjs).
 */
import { readerFor, sw } from './switches.js';
import { twoButtonsLive, latchPhase } from './latch.js';   /* the two buttons' one gate, and the latch's phase */

/** The free arrow for this page: on unless `?freefire=0`.  `search` is for
 *  tests. */
export function freeFireOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('freefire') : sw('freefire'));
}

/** The sword stays for this page: on unless `?meleestay=0`.  `search` is
 *  for tests. */
export function meleeStayOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('meleestay') : sw('meleestay'));
}

/** The bow's gate: may this frame's arrow loose with nothing on its line?
 *  `tapNow` the tap's one attack is waiting (tapAttackWaiting: Attack's
 *  'once'), `live` the two buttons are played (twoButtonsLive), `on` the
 *  switch (freeFireOn).  Each must be exactly true. */
export function freeArrow(tapNow, live, on) {
  return tapNow === true && live === true && on === true;
}

/** The gate's one call (monsterCombat.js): freeArrow on this page's two
 *  buttons and switch.  A yes is the arrow this frame looses, counted in
 *  `S._freeShots` for QA (mp-twobuttons part 7). */
export function freeArrowGo(S, tapNow) {
  if (!freeArrow(tapNow, twoButtonsLive(), freeFireOn())) return false;
  if (S && typeof S === 'object') S._freeShots = (S._freeShots || 0) + 1;
  return true;
}

/** May the sword dash lunge at the latch's lock this frame?  Only with the
 *  stay switched OFF (`stay` false): `live` the two buttons, `phase` the
 *  latch's ('active'), `slot` the hand's ('melee'), `locked` the latch's lock
 *  written (targeting.js: S.lockedTarget, `latch: true`).  Each exactly so. */
export function latchLunge(phase, slot, locked, live, stay) {
  return stay === false && live === true && phase === 'active' && slot === 'melee' && locked === true;
}

/** The frame's one call (BroTown, the step `input`, after latchFrame):
 *  latchLunge on this page, then `dash` (abilities.js maybeSwordDash, whose
 *  own rules -- its cooldown, the shield down, a living target in reach --
 *  stay its own).  True when it lunged. */
export function latchLungeGo(S, dash) {
  if (!S || typeof S !== 'object' || typeof dash !== 'function') return false;
  const lt = S.lockedTarget;
  if (!latchLunge(latchPhase(S), S.rpg ? S.rpg.activeSlot : null, !!(lt && lt.latch && lt.ref), twoButtonsLive(), meleeStayOn())) return false;
  try { return dash(S) === true; } catch (e) { return false; }
}
