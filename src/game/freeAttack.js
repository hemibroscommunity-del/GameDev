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
 * attack charge button to get that behavior."  Attack's press in the two
 * buttons is twoButtonPress, below, and its road is the latch's press and the
 * tap's one attack: with a sword it locks (the latch) and swings WHERE THE
 * BODY STANDS; nothing walks, steps or dashes the body to the monster, the
 * left stick alone moves it, and a swing that cannot reach misses.  That was
 * already so when the owner spoke (card CT item 8's reproduction: 0 px); what
 * they felt was production `main` between #2293 (mode 5's stick) and #2330
 * (the latch), which ran mode 5's Attack as mode 4's press, whose last line
 * is the opening lunge (abilities.js maybeSwordDash).  The press is a module
 * so a later change cannot wire the dash to it unseen: the guard
 * (tools/guards/free-attack.test.mjs) plays it and reads its road.  The dash
 * gets its own button (Charge) in a later part.
 *
 * Two imports, switches.js and latch.js (the one gate, the latch's press and its hold): node
 * tests it (tools/guards/free-attack.test.mjs).
 */
import { readerFor, sw } from './switches.js';
import { twoButtonsLive, latchAttackPress, latchPhase, latchHolds, latchHoldStart, latchRing, latchRelease, latchRingOff, latchSlide, autoHoldMs } from './latch.js';   /* the two buttons' one gate, and the latch's press; v2.3.6548: its hold (tap and hold, card CT part 15) */

/** The free arrow for this page: on unless `?freefire=0`.  `search` is for
 *  tests. */
export function freeFireOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('freefire') : sw('freefire'));
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

/** ATTACK'S PRESS in the two buttons (BroTown's disc, its one call): the
 *  latch's press (latch.js latchAttackPress: a monster sighted locks it, a
 *  press while locked lets go), and with nothing sighted the tap's one attack
 *  the way the body faces (`tap`: tapJump.js requestTapAttack, handed in;
 *  with a bow it is the free arrow above).  The held attack (S.autoAttack)
 *  is the lock's.  Nothing else: no walk, no step, no dash.  Returns the
 *  press ('lock' | 'unlock' | 'once', and v2.3.6548 'strike'), or null off
 *  the two buttons (nothing done).
 *
 *  v2.3.6548 (card CT part 15, the owner: "Otherwise each tap is its own
 *  attack cycle"): with the hold's rule (latch.js holdAutoOn) every press but
 *  the one that ends auto-attack is ONE attack at once (`tap`: at the lock,
 *  which the body faces, or the way it faces), and a press on a lock starts
 *  the hold (latchHoldStart) and its ring on `el`, the disc (latchRing, once
 *  here).  With `?holdauto=0` the lock is auto at once and strikes no tap,
 *  as before.  S.autoAttack is latchHolds's, the phase's. */
export function twoButtonPress(S, now, tap, el) {
  const lp = latchAttackPress(S);
  if (lp === null) return null;
  if (lp !== 'unlock' && latchPhase(S) !== 'auto') { if (typeof tap === 'function') tap(S, now); }
  if (latchHoldStart(S, now)) latchRing(el, S, autoHoldMs());
  S.autoAttack = latchHolds(S);
  return lp;
}

/** v2.3.6548: Attack's finger lifted or cancelled (BroTown's bE, a page
 *  going away): the hold ends and the ring empties at once.  Before the fill
 *  it was a tap: nothing else happens.  True when a hold was running. */
export function twoButtonRelease(S, el) {
  latchRingOff(el);
  return latchRelease(S);
}

/** v2.3.6548: Attack's finger moved (dx, dy) px from its press: slid off
 *  the button (latch.js latchSlide), the hold ends as a lift does. */
export function twoButtonSlide(S, el, dx, dy) {
  if (!latchSlide(S, dx, dy)) return false;
  latchRingOff(el);
  return true;
}
