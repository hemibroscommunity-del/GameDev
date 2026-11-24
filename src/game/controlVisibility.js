/* ═══ v2.3.2246: THE JOYSTICK OVERLAYS HIDE THEMSELVES ═══
 *
 * Owner: "Hide the joystick overlays. Just show the left joystick when
 * you're moving the character. Just show the right contextual button when
 * there's input that can be interacted with."
 *
 * Both discs used to sit on the world at a permanent 50% opacity -- two
 * 96px translucent metal rings across the bottom third of a phone screen,
 * present whether or not they had anything to do.  They are contextual now:
 * the left disc appears while a finger is driving movement, the right button
 * appears when a press would DO something (a monster in the targeting
 * perimeter, a lock held, a resource in reach, a harvest running).
 *
 * WHY A REGISTRY AND NOT JUST A PREDICATE.  Two onboarding surfaces point at
 * these controls by CSS selector -- ControlsTutorial's `move` / `attack`
 * steps and QuestCoach's `move` / `attack` / `special` / `block` marks -- and
 * both TEACH them in town, where by the new rule neither disc has anything
 * to do.  They measure with getBoundingClientRect, which a hidden element
 * still answers (the box is real; only the paint is gone), so without this
 * the tour would ring empty air and report success.  Rather than have those
 * components reach into the discs' styles, they take a HOLD for the side
 * they are pointing at and release it when they move on; the game loop's
 * one visibility resolver ors the holds in.
 *
 * A Set of holder ids, not a counter: a component that re-runs its effect
 * without cleanup (React strict mode double-invokes, a remount mid-step)
 * would leak a counter upward and pin a disc on screen for the session.
 * Adding the same id twice is a no-op, which is the property that makes
 * that harmless.
 */

import { sightPhase } from './sight.js';   /* v2.3.6543: the two buttons' sight (card CT PR 4) */
import { latchPhase, latchReach } from './latch.js';   /* v2.3.6543: ...and their latch, and its range */

/* Object.create(null), not {}: the keys are 'L' / 'R' here, but this is the
   house rule for any map that is looked up by a caller-supplied string
   (CLAUDE.md; three incidents in one day on 2026-07-07). */
const HOLDS = Object.create(null);
HOLDS.L = new Set();
HOLDS.R = new Set();

/* 'L' for the movement joystick, 'R' for the contextual button. */
export function holdDisc(side, who) {
  const s = HOLDS[side];
  if (!s || !who) return;
  s.add(who);
}

export function releaseDisc(side, who) {
  const s = HOLDS[side];
  if (!s || !who) return;
  s.delete(who);
}

export function discHeld(side) {
  const s = HOLDS[side];
  return !!s && s.size > 0;
}

/* Which disc a coach/tutorial selector is pointing at, or null for the
   anchors that are their own elements (the shield button, the target arrows,
   the dashboard).  Kept HERE, beside the registry, so the two callers cannot
   drift on what counts as "the left disc" -- the class names are load-bearing
   in five other places (game.css, the QA rect probes) and are not going to
   change quietly. */
export function discSideFor(sel) {
  if (typeof sel !== 'string' || !sel) return null;
  if (sel.indexOf('bt-rjoy') >= 0 || sel.indexOf('data-rbutton') >= 0
      || sel.indexOf('joyzone="R"') >= 0) return 'R';
  if (sel.indexOf('bt-joystick') >= 0 || sel.indexOf('joyzone="L"') >= 0) return 'L';
  return null;
}

/* Test seam: the QA harness reads this to tell "the disc is hidden because
   nothing is in range" from "the disc is hidden because it failed to
   render" -- a distinction a screenshot cannot make (TRAPS §28). */
export function discHoldProbe() {
  return { L: Array.from(HOLDS.L), R: Array.from(HOLDS.R) };
}

/* ═══ v2.3.6543: BLOCK AND THE SPECIALS COME WITH THE SIGHT (card CT PR 4) ═══
 * The owner, 2026-11-23: "when monsters in your line of site (and in range)
 * the combat buttons appear around the attack button."  "By combat buttons I
 * mean blocking and special attacks."
 *
 * THE ONE RESOLVER for those buttons in the two buttons (`?manual=5` on a
 * touch screen: `twoOn`): Block (ShieldButton.jsx), Special
 * (SpecialButton.jsx) and Whirlwind / Shield Bash (AbilityButtons.jsx) each
 * ask it ON TOP of their own rule (a shield in hand, a weapon, no swim...),
 * which it never loosens.  In the two buttons they are on screen while
 *   - a monster is SIGHTED (sight.js: its phase holds HOLD_MS past the last
 *     sighting and the range is held out from 440 to 550, so the buttons come
 *     once at a sighting and go once at its end: no flicker at the edge, and
 *     one change, never one a frame: TRAPS 218), or
 *   - the latch is ACTIVE (latch.js: combat on, the lock held), or
 *   - a fight between players is on (`fight`, sparTargets.js fightOn: a
 *     clone, a chosen foe, the player you fight).  The sight sees monsters
 *     only, and PR 3 said in its words that in a duel, a spar or No man's
 *     land "Block and the specials are their buttons": a rule of a fight
 *     between players is not this card's to change.
 * With none of those the right side is Attack and Jump only.  Any other
 * mode (`twoOn` false): true, every button's own rule alone, as today.
 * `fight` a function of S (asked last, only when needed) or a boolean.
 * Node tests it (server/test/control-visibility-ct.test.mjs). */
export function combatButtonsShown(S, twoOn, fight) {
  if (!twoOn) return true;
  if (!S || typeof S !== 'object') return false;
  if (sightPhase(S) === 'sighted' || latchPhase(S) === 'active') return true;
  return typeof fight === 'function' ? !!fight(S) : !!fight;
}

/* v2.3.6543: ...and their "a monster near".  Block's and Special's own rules
 * (shieldToggle.js shieldButtonLive, SpecialButton.jsx specialButtonLive) come
 * up for a monster within a perimeter, today's 220 px: in the two buttons a
 * monster in sight is up to the sight's range away (the sword's 440 held out
 * to 550, a bow's and a staff's longer), and a 220 px rule would keep them
 * down at a sighting (mp-twobuttons 3b's first run: Special absent at 435
 * px, sighted).  So in the two buttons the perimeter they are handed is the
 * sight's range (latch.js latchReach, never less than `base`); anywhere else
 * `base` untouched.  The resolver above still decides: a monster that near
 * but behind you (not sighted) shows nothing. */
export function combatReach(twoOn, base) {
  if (!twoOn) return base;
  const r = latchReach();
  return typeof r === 'number' && r > base ? r : base;
}
