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
