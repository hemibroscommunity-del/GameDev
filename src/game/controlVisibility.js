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
import { latchLocked } from './latch.js';   /* v2.3.6543: ...and their latch */
import { specialsUp, blockUp, chargeUp, reachSpecialsOn, threatBlockOn, chargeBtnOn } from './thumbSide.js';   /* v2.3.6549: the reach, the threat and Charge (card CT part 16) */

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
  if (sightPhase(S) === 'sighted' || latchLocked(S)) return true;   /* v2.3.6548: locked, by a tap or auto-attack */
  return typeof fight === 'function' ? !!fight(S) : !!fight;
}

/* ═══ v2.3.6549: EACH BUTTON ITS OWN MOMENT (card CT part 16) ═══
 * The owner, 2026-11-24: "I want a clean attack and jump button that's it.
 * The special attacks buttons should only appear when a monster is within
 * attack range."  So in the two buttons the one resolver above splits by
 * button, each asking thumbSide.js's one phase (`S._thumbPhase`):
 *   specialsShown  Special, Whirlwind, Shield Bash: a monster in REACH (where
 *                  an attack would connect); `?reachspecials=0` the sighting,
 *                  as before (combatButtonsShown);
 *   blockShown     Block: a THREAT (sighted, locked, in reach, or a monster's
 *                  hit in the last 3 s, seen or not); `?threatblock=0` the
 *                  sighting, as before;
 *   chargeShown    Charge: a melee weapon, a monster sighted or locked and
 *                  none in reach; `?chargebtn=0` never.
 * A fight between players still shows Block and the specials (`fight`, as
 * above: not this card's to change); it never shows Charge (the dash at a
 * player is the lock's, mode 4's).  Any other mode: true for Block and the
 * specials, false for Charge (no such button there).  The switches are read
 * when not handed (`on`), as the page's.  Node tests them
 * (server/test/sight.test.mjs 8, thumb-side.test.mjs). */
function fightAsk(fight, S) { return typeof fight === 'function' ? !!fight(S) : !!fight; }

export function specialsShown(S, twoOn, fight, on) {
  if (!twoOn) return true;
  if ((on === undefined ? reachSpecialsOn() : on) === false) return combatButtonsShown(S, twoOn, fight);
  if (!S || typeof S !== 'object') return false;
  return specialsUp(S) || fightAsk(fight, S);
}

export function blockShown(S, twoOn, fight, on) {
  if (!twoOn) return true;
  if ((on === undefined ? threatBlockOn() : on) === false) return combatButtonsShown(S, twoOn, fight);
  if (!S || typeof S !== 'object') return false;
  return blockUp(S) || fightAsk(fight, S);
}

/* ═══ v2.3.6554: CHARGE IS FOR MONSTERS -- NONE WHILE A PLAYER HOLDS THE LOCK (card CT part 20, job 2) ═══
 * Sitting 64's review: chargeShown never asked the fight.  In a duel (or an
 * arena match) a monster in sight brought Charge up; its press latched that
 * monster (thumbSide.js chargeLock), and then targeting.js updateTargeting
 * (keepDuelLock: an arena match's lock comes back each frame) put the lock on
 * the PLAYER, and maybeSwordDash dashed at them -- the dash at a player that
 * part 16 left to the lock (mode 4's).  So no Charge while a fight between
 * players holds you: a duel or a match on this phone (`S._inDuel`, the duel
 * door's one field, an arena match included; `S._arenaMatch`, the arena
 * door's), or a player locked (the `{type: 'player'}` lock a duel, a match or
 * a tap writes).  The press's road (ChargeButton.jsx chargePress) asks
 * chargeShown first, so it refuses with it.  Block and the specials keep
 * their own rule (`fight`, above). */
export function playerFightHoldsLock(S) {
  if (!S || typeof S !== 'object') return false;
  if (S._inDuel && typeof S._inDuel === 'object') return true;
  if (S._arenaMatch) return true;
  const lt = S.lockedTarget;
  return !!(lt && lt.type === 'player');
}

export function chargeShown(S, twoOn, melee, on) {
  if (!twoOn || (on === undefined ? chargeBtnOn() : on) === false) return false;
  if (playerFightHoldsLock(S)) return false;   /* v2.3.6554: Charge is for monsters */
  return chargeUp(S, melee);
}

/* v2.3.6543: ...and their "a monster near".  Block's and Special's own rules
 * (shieldToggle.js shieldButtonLive, SpecialButton.jsx specialButtonLive) come
 * up for a monster within a perimeter, today's 220 px: in the two buttons a
 * monster in sight is up to the sight's range away, and a 220 px rule would
 * keep them down at a sighting (mp-twobuttons 3b's first run: Special absent
 * at 435 px, sighted).
 * v2.3.6549 (card CT part 16): in the two buttons the perimeter is NO LIMIT
 * (Infinity): the resolvers above alone decide when, and the own rules keep
 * only what they say of the button itself (a shield owned, a weapon, no
 * swim, the shield's state).  THE FLIPPING (mp-twobuttons 3c/3d sideways,
 * twice: Block and Special coming and going in the page while their probes
 * said shown and the sight's phase held) was this perimeter: it was the
 * sight's OUT line (550 for a sword) measured again by each button, every
 * 200 ms render, centre to centre with no hold and no in line -- a monster
 * wandering across 550 between two renders took the buttons away and gave
 * them back while the sight (held 400 ms, its own in and out) held still.
 * One rule now, held once: no second line for a button to cross.
 * Anywhere else `base` untouched. */
export function combatReach(twoOn, base) {
  if (!twoOn) return base;
  return Infinity;
}
