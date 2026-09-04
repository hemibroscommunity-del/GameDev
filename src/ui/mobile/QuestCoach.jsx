import React from 'react';
/* v2.3.1797: the special lesson has to know whether the ACTIVE slot holds a
   weapon, which is not "does the player own one" — specialAttack() refuses
   with "No weapon equipped!" when the active slot is empty, and a coach mark
   asking for a gesture the game will refuse is worse than no mark.  Imported
   rather than reimplemented: it is four lines, but they encode the
   ranged/staff fallback to `weapon` and a copy here would drift. */
import { getActiveWeapon } from '@/data/gameSystems.js';
import { holdDisc, releaseDisc, discSideFor } from '@/game/controlVisibility.js'; /* v2.3.2246 */

/* ═══════════════════════════════════════════════════════════════════
   QUEST COACH — the controls are taught by the questline (v2.3.1796)
   ═══════════════════════════════════════════════════════════════════
   Owner: "the controls need to be taught in the quest line by
   highlighting (flashing) the sequence you should be learning for
   equipping items, double tap the left joystick for swapping weapons,
   double tap and hold (maybe text above the right joystick and hold
   for a certain number of seconds while you rotate in a 360 degree
   circle)."
   ...and then (v2.3.1797): "I think mayor bro ought to require you to
   perform your special attack too during the tutorial."

   FIVE lessons, in the order they become usable: gear up, special attack,
   raise the shield, then — once the turn-in pays the bow and the staff —
   three weapons, and cycling between them.

   WHY THIS IS NOT ControlsTutorial.jsx.  That one already exists and is
   a good thing: a five-step guided tour, opened on demand, that dims the
   world and walks you through the HUD with Back/Next.  It is a MANUAL,
   and a manual is read once, before you have anything to use it on — the
   sword and shield are handed over by tut_1, minutes after that tour is
   over.  What the owner is describing is the opposite shape: no dim, no
   buttons, nothing to dismiss, one lesson at a time, appearing at the
   moment the questline has just given you the thing the lesson is about.
   So this overlay never blocks (pointerEvents:'none' throughout, and it
   never covers the control it points at), and it teaches at most one
   gesture at a time.

   HOW A LESSON KNOWS IT IS DONE.  By WATCHING GAME STATE, not by having
   hooks pushed into the gesture handlers.  The double-tap classifier in
   BroTown is 80 lines of tap-vs-drag timing that three separate features
   already read from; threading a "and also tell the coach" callback
   through it would put the tutorial inside the load-bearing path of the
   control itself.  Every lesson here has a state fact that is true only
   after the gesture worked — every weapon slot has been active, S._shieldUp
   went true, S._hasUsedSwipe went true — so the coach polls, and a player who finds
   the gesture some other way (the desktop keys, say) gets credit for it
   just the same.

   Lessons are ordered and shown ONE at a time; a lesson whose target is
   not on screen (the joysticks are display:none on desktop) is SKIPPED
   rather than blocking the ones behind it.  Completion is remembered in
   localStorage — per BROWSER, not per character, which is the right grain:
   the thing being learned is a thumb gesture, and a player who already knows
   how to raise a shield does not need telling again on their second bro.

   z-index 31 puts it above the dashboard and the joystick discs (30).  It
   sits OUTSIDE .brotown-wrap (see the mount site in BroTown.jsx for why it
   has to), which also puts it above the in-wrap modals — so "don't cover the
   quest dialogue" is enforced by the reachability rule below rather than by
   the z-ladder.  */

const LS_KEY = 'bt_coach_v1';

/* Lantern Slate: brass is focus/selection, and a coach mark IS focus. */
const BRASS = '#D8AA58';
const INK = 'rgba(13,21,26,.92)';

/* The block lesson's two conditions, both of which the owner named. */
/* v2.3.2130: the move lesson's finish line, and the jump it refuses to
   count as walking.  TELEPORT_PX is well above any real per-frame step
   (the bro covers a few px a frame) and well below a zone change, which
   moves him the width of a map. */
const MOVE_PX = 120;
const TELEPORT_PX = 48;

/* v2.3.2242: the block lesson used to demand a 2s hold swept through all 8
   sectors, because the double-tap-and-HOLD + drag-to-steer was the least
   discoverable gesture in the game.  The shield is a TOGGLE BUTTON now
   (ShieldButton.jsx) and points itself at the locked target, so there is
   nothing to sweep and nothing to hold: the lesson is "you found the
   button and raised it".  The old constants are kept as the probe's
   `needMs`/`needSectors` shape (0 / 1) so a reader of __btCoach still
   gets numbers, but only `raised` decides completion. */
const BLOCK_HOLD_MS = 0;
const BLOCK_SECTORS = 1;

function loadDone() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const o = raw ? JSON.parse(raw) : null;
    /* Object.create(null): keys are lesson ids and the file is
       player-writable, so a '__proto__' key must not reach a plain {}
       (CLAUDE.md rule 4). */
    const out = Object.create(null);
    if (o && typeof o === 'object') for (const k of Object.keys(o)) out[k] = !!o[k];
    return out;
  } catch (_e) { return Object.create(null); }
}
function saveDone(done) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(Object.assign({}, done))); } catch (_e) {}
}

/* Measure a live control.  A zero-size or missing element yields null and
   its lesson is skipped for this tick — the same degrade-to-fewer-callouts
   rule ControlsTutorial has used since v2.3.1205, and the reason the
   joystick lessons simply do not appear on a desktop pointer. */
function measure(anchors) {
  for (const a of anchors) {
    let el = null;
    try { el = document.querySelector(a.sel); } catch (_e) {}
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (!r || r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (!reachable(el, r, a.reach)) continue;
    return { left: r.left, top: r.top, width: r.width, height: r.height, body: a.body };
  }
  return null;
}

/* ── CAN A FINGER ACTUALLY REACH IT? ──
   This is the one rule that keeps the coach from covering the game, and it
   replaces what would otherwise be a list of every modal class in the repo
   (a list that goes stale the first time someone adds a panel).

   Since v2.3.1796 the overlay sits OUTSIDE .brotown-wrap, which is what
   makes it visible over the dashboard at all — but that same move puts it
   above the in-wrap modals, and a coach mark stamped across an open quest
   dialogue would be a straight downgrade.  So instead of asking "is a modal
   open", ask the question that actually matters: hit-test the middle of the
   control, and only draw if what answers is the control itself.  Every
   overlay in this UI puts a scrim over the screen (the .bt-inspect panels
   and ItemDetailPopup both do), so every one of them takes the mark down
   automatically, including ones not written yet.

   `reach` exists for the joysticks.  Their discs are pointerEvents:'none'
   by design — the visual is a picture and the touch is caught by the
   full-height [data-joyzone] layer underneath (TouchControls) — so the
   honest answer to "what would a finger hit here" is the zone, not the
   disc, and that still means the control is reachable. */
function reachable(el, r, reach) {
  let top = null;
  try { top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (_e) {}
  if (!top) return false;
  if (top === el || el.contains(top)) return true;
  if (reach) { try { if (top.closest(reach)) return true; } catch (_e) {} }
  return false;
}

/* ── The questline gate ──
   Only while Mayor Bro's tutorial chain is underway.  Once tut_4 is
   turned in the chain is over ("That's the tour. Everything past here is
   yours to find.") and the coach retires with it. */
function inTutorial(rpg) {
  const q = (rpg && rpg._quests) || null;
  if (!q) return false;
  if (q.tut_4 === 'turnedIn') return false;
  for (const id of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
    if (q[id] === 'active' || q[id] === 'turnedIn') return true;
  }
  return false;
}

/* ── Before Mayor Bro has said a word ──
   v2.3.2130.  inTutorial() above is the gate the coach has always used, and
   it answers false for the one player who needs teaching most: someone who
   has just spawned.  A brand-new bro has accepted nothing, so no tut quest
   is 'active', so the coach stayed dark through the entire first minute --
   the minute three of four demo reviewers described as not knowing what to
   do.  (The other two teachers do not cover it either: the §15 step machine
   has been switched off since v2.3.1593 on the owner's instruction, and
   ControlsTutorial only opens from a row in Settings labelled "replay the
   tutorial", which a first-time player has neither seen nor gone looking
   for.)

   So the coach also runs BEFORE the chain starts -- but only for someone it
   could plausibly be about.  Two conditions, and both matter:

     - no tut quest has any record at all.  Once tut_1 is accepted this goes
       false and inTutorial takes over, so the two gates hand off cleanly and
       never overlap; once tut_4 is turned in both are false forever.
     - level 3 or under.  Per-browser completion (LS_KEY) already means a
       returning player is not re-taught, but "returning" is per BROWSER: a
       veteran on a new phone, or after clearing site data, would otherwise
       be told how to walk.  The level is the fact that says who they really
       are. */
function preTutorial(rpg) {
  if (!rpg) return false;
  if ((rpg.level || 1) > 3) return false;
  const q = rpg._quests || null;
  if (!q) return true;
  for (const id of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) if (q[id]) return false;
  return true;
}

/* ── The lessons ──
   `live(rpg)`  — is there anything to teach right now?
   `done(rpg)`  — has the player done it? (checked before `live`, so a
                  player who already knows the gesture is never nagged)
   `anchors`    — live-DOM targets, first REACHABLE one wins, each with the
                  wording that fits what it is pointing at. */
const LESSONS = [
  {
    /* ═══ v2.3.2130: DRAG TO MOVE ═══
       The most basic control in the game, and until now it was taught in
       exactly one place: ControlsTutorial's first step, behind Settings.
       It goes first because it is first -- a player who cannot move cannot
       reach Mayor Bro, and every lesson below assumes they got to him.

       ═══ LIVE ONLY BEFORE THE CHAIN, AND THAT IS LOAD-BEARING ═══
       The first cut had `live` return true unconditionally -- there is no
       state that makes walking unavailable, so there seemed to be no gate
       to write.  That was wrong, and mp-questcoach caught it with 23
       failures: lessons are shown ONE at a time in order, and an unfinished
       lesson at the head of the queue blocks every lesson behind it.  A
       `move` mark that had not yet been satisfied sat on top of the gear
       lesson, the special, the block and the cycle -- the entire questline
       curriculum, held hostage by a hint about walking.

       (The file's own degrade rule normally prevents exactly this: a lesson
       whose anchor cannot be measured is SKIPPED rather than blocking, which
       is why the joystick lessons cause no trouble on desktop.  But this
       one's anchor measures fine on a phone.  It was on screen, so it
       blocked.)

       Scoping it to preTutorial fixes that at the root instead of adding a
       "non-blocking" flag for one lesson: this exists to cover the walk from
       the spawn point to Mayor Bro, so accepting his first quest IS the
       lesson being over -- you demonstrably got there.  From that moment
       preTutorial is false forever, the mark can never return, and the
       questline lessons own the queue exactly as they did before.

       On desktop the joystick is display:none, measure() returns null, and
       the degrade rule skips this one as well.

       Anchored on the same zone the cycle lesson uses, with the same
       `reach` escape: the disc is pointerEvents:'none' and the finger is
       caught by the full-height [data-joyzone] layer underneath. */
    id: 'move',
    shape: 'circle',
    anchors: [{ sel: '.bt-joystick-zone', reach: '[data-joyzone="L"]',
                body: 'Drag to move.' }],
    label: 'Move',
    live: function (rpg) { return preTutorial(rpg); },
    done: null,     /* watched live -- see the walked tracker below */
  },
  {
    id: 'equip',
    shape: 'rect',
    /* Two anchors, and the copy follows whichever one is on screen — on a
       phone the bag grid is already sitting on the dashboard, so the usual
       answer is the ITEM, and telling a player to "open your bag" while the
       item is visible in front of them is worse than saying nothing.
       (Those two selectors were also what ControlsTutorial's own bag step
       pointed at, and neither is in the DOM — nothing passes BottomDashboard's
       `tut` prop, and the nav moved to .bt-navrail.  Its five-step tour had
       been running as three.  Fixed in v2.3.1803 and pinned by
       tools/qa/mp/mp-ctltut.mjs; noted here because this is where it was
       found, and because the dead names are still tempting.) */
    anchors: [
      { sel: '[data-tut="coach-gear"]', body: 'Tap it, then Equip.' },
      { sel: '.bt-navrail [aria-label="Bag"]', body: 'Open your bag and equip your gear.' },
    ],
    label: 'Gear up',
    /* tut_1 hands over a Copper Great Sword and a Pine Shield.  They land
       in the STASHES, not in your hands — which is the whole reason this
       lesson exists: a player who never opens the bag fights the starting
       quest bare-handed and has no idea why. */
    live: function (rpg) {
      return (rpg.weaponStash || []).length > 0 || (rpg.shieldStash || []).length > 0;
    },
    done: function (rpg) {
      return !!rpg.shield && !!(rpg.weapon || rpg.rangedWeapon || rpg.staffWeapon);
    },
  },
  {
    /* ═══ v2.3.1801: THE TURN-IN HANDS YOU TWO MORE WEAPONS ═══
       Owner: "When player turns in quest and receives bow and staff there
       should be a tutorial requiring you equip them all and double tap the
       left joystick to swap through the weapons and just a little message to
       use what you like best."
       Two lessons, because it is two things: put them ON, then learn the
       gesture that moves between them.  This is the first half. */
    id: 'equipAll',
    shape: 'rect',
    anchors: [
      { sel: '[data-tut="coach-gear"]', body: 'Equip the bow and the staff too.' },
      { sel: '.bt-navrail [aria-label="Bag"]', body: 'Open your bag — equip the bow and the staff.' },
    ],
    label: 'Three weapons',
    /* Only after the turn-in that pays them.  Before that a leftover in the
       stash is just a spare, and "equip them all" would be nonsense. */
    live: function (rpg) {
      const q = rpg._quests || {};
      if (q.tut_1 !== 'turnedIn') return false;
      return (rpg.weaponStash || []).length > 0;
    },
    done: function (rpg) {
      return !!rpg.weapon && !!rpg.rangedWeapon && !!rpg.staffWeapon;
    },
  },
  {
    /* The second half: the gesture, and the point of it.
       This REPLACES v2.3.1796's `swap`, which finished on a single change of
       slot.  One swap teaches that the gesture exists; the owner is asking for
       something else — that the player go round all three and pick.  So it is
       not done until every slot has been active, and the copy says why you
       would bother. */
    id: 'cycle',
    shape: 'circle',
    anchors: [{ sel: '.bt-joystick-zone', reach: '[data-joyzone="L"]',
                body: 'Double-tap to cycle. Use whichever you like best.' }],
    label: 'Swap weapons',
    /* Nothing to cycle BETWEEN until the second weapon is in hand, which is
       the beat Mayor Bro hands the bow over on.  He USED to add "Double-tap
       the LEFT joystick to switch weapons" there; v2.3.1831 removed it as
       duplicate teaching, so this mark is now the only place the gesture is
       taught and its copy has to carry it alone. */
    live: function (rpg) {
      return !!rpg.weapon && !!(rpg.rangedWeapon || rpg.staffWeapon);
    },
    done: null,     /* watched live — see the activeSlot tracker below */
  },
  /* ═══ v2.3.2269: THE GUARD LESSON MOVES TO THE WEAPONS BEAT ═══
     Owner: "Move the tutorial bit about raising the shield and alter it so
     that it talks about the new controls (BOW and STAFF only).  It would make
     perfect sense to have this portion right after turning in the first quest
     to be seated with the bow and staff."

     It sat after `special` and taught the melee ShieldButton.  It teaches the
     new bow/staff double-tap now (BroTown handleRBtnPress, v2.3.2269), so it
     has to come after the player HAS a bow or a staff -- otherwise it is a mark
     for a gesture the game would refuse, which this file already holds is worse
     than no mark at all (see the `attack` lesson's gate).

     PLACED HERE RATHER THAN GATED LATER.  Lessons show one at a time in array
     order among those that are live, so position and gate together decide when
     it appears: sitting after `cycle` it cannot jump ahead of the weapons, and
     `attack`/`special` -- live from the first sword, long before the turn-in --
     have already had their turn by then.  The result is exactly the beat asked
     for: turn in tut_1, equip the bow and staff, learn to cycle, learn to
     guard.

     THE ID CHANGED, and that is the point of changing it.  Completion is
     remembered per browser under `bt_coach_v1`, so anyone who finished the old
     melee `block` lesson would never be shown this one -- and this is a
     different gesture on a different weapon, not a rewording.  A new id is the
     cheapest way to say so; bumping LS_KEY was the alternative and it would
     have re-taught every lesson in the game to every existing player. */
  {
    id: 'blockRanged',
    shape: 'circle',
    /* The gesture is ON the attack button now, so the mark points there and
       needs no fallback -- the shield BUTTON's own coming-and-going was the
       only reason the old lesson carried two anchors. */
    anchors: [{ sel: '.bt-rjoy-base', reach: '.bt-rjoy-base',
                body: 'With the bow or staff out, double-tap Attack to raise your shield.' },
              { sel: '[data-joyzone="R"]', reach: '[data-joyzone="R"]',
                body: 'Double-tap the right side to raise your shield.' }],
    label: 'Guard with the bow',
    /* Bow or staff IN HAND, a shield to raise, and the turn-in that paid them
       -- the same `tut_1 === 'turnedIn'` gate equipAll uses, so the two cannot
       disagree about when the weapons arrived. */
    live: function (rpg) {
      if (!rpg.shield) return false;
      const q = rpg._quests || {};
      if (q.tut_1 !== 'turnedIn') return false;
      return !!(rpg.rangedWeapon || rpg.staffWeapon);
    },
    done: null,     /* watched live — see the block tracker below */
  },
  {
    /* ═══ v2.3.2130: DRAG TO ATTACK ═══
       The other control nothing teaches.  The coach has taught the SPECIAL
       (a quick swipe) since v2.3.1797 and the BLOCK since v2.3.1796, and
       both sit on the right joystick -- so the ordinary attack, the plainest
       thing that stick does, was the one gesture a player could reach the
       end of the tutorial without ever being shown.  Ordered before the
       special for that reason: swipe-then-hold are variations on a drag, and
       teaching a variation before the thing it varies is backwards.

       GATED ON A WEAPON, and not merely for tidiness: swingAttack() returns
       at `if (!S.rpg.weapon) return` (v2.3.1682, after the owner reported
       "the character can still make an initial swing without a sword"), so
       before the gear lesson is finished this would be asking for a gesture
       the game refuses -- which this file already holds to be worse than no
       mark at all.  getActiveWeapon rather than rpg.weapon so the ranged and
       staff slots count, matching the special's gate exactly. */
    id: 'attack',
    shape: 'circle',
    /* v2.3.2242: the stick is a BUTTON -- hold it, do not drag it. */
    anchors: [{ sel: '.bt-rjoy-base', reach: '.bt-rjoy-base',
                body: 'Hold to attack the nearest enemy.' },
              { sel: '.bt-rjoy-zone', reach: '.bt-rjoy-base',
                body: 'Hold to attack the nearest enemy.' }],
    label: 'Attack',
    live: function (rpg) { return !!getActiveWeapon(rpg); },
    done: null,     /* watched live -- see the isSwinging tracker below */
  },
  {
    id: 'special',
    shape: 'circle',
    /* v2.3.2242: same gesture, on the Attack BUTTON now. */
    anchors: [{ sel: '.bt-rjoy-base', reach: '.bt-rjoy-base',
                body: 'A quick swipe on the Attack button.' },
              { sel: '.bt-rjoy-zone', reach: '.bt-rjoy-base',
                body: 'A quick swipe on the Attack button.' }],
    label: 'Special attack',
    /* ═══ v2.3.1797: THE SPECIAL IS PART OF THE TUTORIAL ═══
       Owner: "I think mayor bro ought to require you to perform your special
       attack too during the tutorial."
       It belongs here for the same reason the block does: Mayor Bro's tut_1
       dialogue already teaches it in words ("A quick swipe on the right
       joystick triggers a special attack"), and the words were not enough.
       Ordered BEFORE the block to match the order he says them in, which is
       also the order they become usable — the swipe needs only a weapon in
       hand, so it is available the moment the gear lesson is finished.
       WORDING IS FIXED BY INCIDENT.  v2.3.1681 corrected the dialogue from
       "flick it and let go" after the owner reported it as wrong: the handler
       measures release SPEED, so "a quick swipe" is the gesture.  This line
       says the same thing in the same words on purpose — one string, one
       meaning, in the two places a player meets it. */
    live: function (rpg) { return !!getActiveWeapon(rpg); },
    done: null,     /* watched live — see the _hasUsedSwipe tracker below */
  },
  /* ═══ v2.3.2147: THE TWO THINGS NOBODY IS EVER TOLD ═══
     Owner: "During the first onboarding tutorial maybe after the shield
     rotation help orient players to their pass key. Also that tapping on your
     character (on screen) is how you open the chat menu."

     Both sit AFTER the shield deliberately, in the order asked for: the
     lessons above are how to survive the next minute, and these two are how
     to keep the character and how to talk to anyone -- important, and not
     urgent, which is exactly why they belong last rather than in the middle of
     a fight lesson. */
  {
    id: 'passkey',
    shape: 'rect',
    /* The rail's More button, because it is on screen whatever panel you are
       on; the tile itself is the better ring once More is open, so it is
       listed first and the rail is the fallback -- the same anchor-then-
       fallback shape every step here uses. */
    anchors: [{ sel: '[data-more-tile="account"]', reach: '[data-more-tile="account"]',
                body: 'Your Login Key is the ONLY way back to this character. Open it and save it somewhere.' },
              { sel: '.bt-navrail [aria-label="More"]', reach: '.bt-navrail [aria-label="More"]',
                body: 'More > Login Key. It is the only way back to this character — save it somewhere.' }],
    label: 'Save your Login Key',
    /* Gated on having got through the fight lessons: a key is meaningless to
       someone who has not yet decided they want to keep the character, and the
       owner asked for it after the shield. */
    live: function (rpg) { return !!rpg.shield; },
    done: null,     /* watched live — see the passkey tracker below */
  },
  {
    id: 'chat',
    shape: 'circle',
    /* THE CHARACTER IS NOT IN THE DOM -- he is painted on the canvas -- so
       there is no selector for the thing this lesson is about. The canvas is
       the honest anchor: the ring lands on the play area, and the words say
       where to tap. ControlsTutorial has taught this in passing since
       v2.3.1287 ("Menus live down here. Tap your character to chat."), bundled
       into the toolbar step where it reads as a footnote; the owner asking for
       it again is the tell that a footnote was not enough. */
    anchors: [{ sel: 'canvas', reach: 'canvas',
                body: 'Tap your own character to open chat.' }],
    label: 'Tap yourself to chat',
    live: function (rpg) { return !!rpg.shield; },
    done: null,     /* watched live — see the chat tracker below */
  },
];

export function QuestCoach(props) {
  const stateRef = props.stateRef;
  const [view, setView] = React.useState(null);
  /* A ref MIRROR of `view`.  The rAF loop is mounted once and must stay
     mounted, so it cannot read the state variable — its closure would
     hold the first render's `null` forever and re-set the same mark
     twelve times a second. */
  const viewRef = React.useRef(null);
  /* v2.3.2246: which discs this coach is currently holding on screen, so the
     set can be reconciled each tick rather than leaked.  See the hold note in
     the selection loop, and TRAPS §41 for why the hold has to be taken before
     the anchor is measured. */
  const discHoldRef = React.useRef({ id: null, sides: [] });
  const doneRef = React.useRef(loadDone());
  const ringRef = React.useRef(null);
  const arcRef = React.useRef(null);
  /* Gesture trackers.  Refs, not state: they tick every frame and only
     their CROSSING of the finish line is worth a render. */
  /* Object.create(null): keyed by slot name, which is player-influenced data
     (CLAUDE.md rule 4). */
  const seenSlots = React.useRef(Object.create(null));
  /* v2.3.1809: false until the cycle mark is actually on screen.  See the
     tracker — equipping a weapon changes activeSlot, so counting from session
     start credited the player for the previous lesson's equips. */
  const cycleArmed = React.useRef(false);
  const blockRef = React.useRef({ ms: 0, sectors: 0, last: 0 });
  /* v2.3.2130: how far the bro has actually walked, in world px.  A ref for
     the same reason as the others -- it ticks every frame and only its
     crossing of the finish line is worth a render. */
  const walkRef = React.useRef({ x: null, y: null, px: 0 });

  React.useEffect(function () {
    let raf = 0, tick = 0, stop = false;
    /* The mark's own pulse is time-driven rather than a CSS animation so
       the ring and the progress arc stay in step with one frame's read of
       the game state — see the arc write below. */
    const step = function () {
      if (stop) return;
      raf = requestAnimationFrame(step);
      const S = stateRef && stateRef.current;
      const rpg = (S && S.rpg) || null;
      const now = Date.now();
      const done = doneRef.current;

      /* ── watch for the gestures, every frame, regardless of what is on
         screen: credit is for DOING it, not for doing it while being
         asked to. ── */
      if (rpg) {
        /* v2.3.1801: every slot the player has been in, not "has it changed".
           The owner asked for a cycle THROUGH the weapons, so the lesson is
           not finished until all of the ones they own have been active.
           Counted against what they OWN rather than a flat three: a player
           who somehow reaches this with two weapons can still finish it, and
           nobody is asked to select a slot that is empty. */
        /* ═══ v2.3.1809: ONLY COUNT SLOTS ONCE THE LESSON HAS ASKED ═══
           Owner: "The tutorial after completing the quest guides you through
           equipping the sword and staff but it needs to guide you to double
           tap the left joystick to show you how to swap weapons."
           The lesson existed (v2.3.1801) and was completing itself before it
           could ever appear.  EQUIPPING sets the slot: ItemDetailPopup's
           onEquipStashWeapon does `R.activeSlot = slot` so the bro swings what
           you just put on.  So putting on the sword, the bow and the staff
           marks melee, ranged and staff all "seen" — and the cycle lesson,
           which finishes when every owned slot has been active, was already
           satisfied the instant the previous lesson finished.
           Nothing was wrong with the finish RULE; the counting started too
           early.  It now starts when the mark goes up (cycleArmed, set in the
           selection loop below), seeded with wherever the player is standing,
           so what counts is cycling AFTER being asked to. */
        const slot = rpg.activeSlot || 'melee';
        if (cycleArmed.current) seenSlots.current[slot] = true;
        if (!done.cycle && cycleArmed.current) {
          const need = ['melee'];
          if (rpg.rangedWeapon) need.push('ranged');
          if (rpg.staffWeapon) need.push('staff');
          if (need.length > 1 && need.every((k) => seenSlots.current[k])) {
            done.cycle = true; saveDone(done);
          }
        }
      }
      /* The special sets a permanent flag the moment one actually FIRES —
         specialAttack() writes it only after every refusal gate (dead,
         mid-harvest, cooldown, no weapon, no mana) has passed, so it cannot
         credit a swipe the game turned down. */
      if (S && S._hasUsedSwipe && !done.special) { done.special = true; saveDone(done); }
      /* ═══ v2.3.2147: THE TWO NEW LESSONS, WATCHED THE SAME WAY ═══
         By POLLING a fact the game already keeps, never by a hook pushed into
         the control -- the design note at the top of this file explains why,
         and neither of these is worth breaking that rule for.

         The key counts as learned when the panel that SHOWS it is open, not
         when More is tapped: opening More and closing it again teaches nobody
         their key. The chat lesson counts when the composer is actually open,
         which is only reachable by the tap being taught (or the rail), so it
         cannot be credited by accident. */
      if (!done.passkey) {
        try {
          const _pb = window.__broDashPanelBus;
          if (_pb && typeof _pb.current === 'function' && _pb.current() === 'account') {
            done.passkey = true; saveDone(done);
          }
        } catch (e) { /* a lesson tracker must never break the frame */ }
      }
      if (!done.chat) {
        try {
          const _cb = window.__broChatBubbleBus;
          if (_cb && _cb.open === true) { done.chat = true; saveDone(done); }
        } catch (e) { /* as above */ }
      }
      /* ═══ v2.3.2130: DID THEY WALK, AND DID THEY SWING? ═══
         Both watched the way every other lesson here is -- by polling a state
         fact, never by a hook pushed into the control (the design note at the
         top of this file says why, and the double-tap classifier it is
         protecting has only grown since).

         WALKING is measured as distance COVERED rather than "is the stick
         deflected", because the honest question is whether the player got the
         bro to go somewhere.  Per-frame steps over TELEPORT_PX are discarded:
         a zone change relocates the player across the map in one frame and
         would otherwise finish this lesson for them -- which matters, since
         the pre-tutorial gate means this can be on screen while somebody
         wanders through a door.  120px is a few steps, far enough to be a
         deliberate walk and short enough that the mark is gone before it
         nags. */
      if (S && S.player && !done.move) {
        const w = walkRef.current;
        if (w.x != null) {
          const step = Math.hypot(S.player.x - w.x, S.player.y - w.y);
          if (step < TELEPORT_PX) w.px += step;
        }
        w.x = S.player.x; w.y = S.player.y;
        if (w.px >= MOVE_PX) { done.move = true; saveDone(done); }
      }
      /* SWINGING is a live flag rather than a permanent one, so it is caught
         on the frame it is true.  Both paths that set it count: playerActions'
         manual swing and the auto-attack arm in monsterCombat -- a bow player
         who drags the stick and looses an arrow has done what was asked, and
         refusing them credit for holding the wrong weapon would be pedantry.

         AND THE AUTO-ATTACK ARM IS NOT A LOOPHOLE, which is worth writing
         down because it reads like one.  That arm is gated on S.autoAttack,
         and the only two things that set it are BroTown's right-joystick drag
         handler (beside S._aiming and the right-stick trail) and the desktop
         left-click.  It is off until the player aims.  So there is no path
         where the game swings for somebody who has not made this gesture,
         and the flag means the thing the lesson is asking about.

         The refusal gates are upstream of the flag too (it is set AFTER
         swingAttack's no-weapon return), so a swing the game turned down
         cannot credit it -- the same property that makes _hasUsedSwipe
         trustworthy above. */
      if (S && S.isSwinging && !done.attack) { done.attack = true; saveDone(done); }
      if (S) {
        /* v2.3.2242: raised once = learned.  The old hold-and-sweep tracker
           measured a gesture that no longer exists (see BLOCK_HOLD_MS). */
        /* v2.3.2269: only a raise made WITH THE BOW OR STAFF counts.  The
           lesson is about a gesture that exists on those weapons alone, and
           `_shieldUp` is raised by the melee ShieldButton too -- so the old
           bare test would have marked this learned for a player who tapped a
           button they were never being taught, and they would never see it.
           The slot is read at the moment the guard is up, which is the moment
           the gesture would have been made. */
        const b = blockRef.current;
        const _sl = S.rpg && S.rpg.activeSlot;
        if (S._shieldUp && (_sl === 'ranged' || _sl === 'staff')) {
          b.sectors = 1; b.ms = Math.max(b.ms, 1);
        }
        if (!done.blockRanged && b.sectors === 1) { done.blockRanged = true; saveDone(done); }
      }

      /* ── pick and place the mark, ~12x a second ── */
      if ((tick++ % 5) !== 0) return;
      if (!rpg || (!inTutorial(rpg) && !preTutorial(rpg))) {
        if (viewRef.current) { viewRef.current = null; setView(null); }
        /* v2.3.2246: the coach retired — let go of the discs. */
        if (discHoldRef.current.sides.length) {
          for (const sd of discHoldRef.current.sides) releaseDisc(sd, 'coach');
          discHoldRef.current = { id: null, sides: [] };
        }
        return;
      }
      let next = null;
      /* ═══ v2.3.2246: THE HOLD HAS TO COME BEFORE THE MEASURE ═══
         v2.3.2246 hides the right button unless a press would do something
         (owner: "Just show the right contextual button when there's input
         that can be interacted with"), and hiding it means switching the
         disc's pointerEvents off -- it is the touch target, and an
         opacity-0 element still takes taps.

         That closes a loop on this file.  reachable() hit-tests the middle
         of the anchor with elementFromPoint; with the disc declining taps,
         the answer is the [data-joyzone="R"] layer underneath, which is not
         inside `.bt-rjoy-base`, so measure() returns null, so the `attack`
         and `special` marks are skipped, so nothing ever asks for the
         button to be shown, so it stays hidden.  The lesson would have
         vanished in silence -- and this file's own rule is that a skipped
         mark is a mark nobody can see is missing.

         So the hold is taken the moment a lesson is found LIVE, before its
         anchors are measured at all: the disc comes up on this tick and the
         mark measures on the next (~80ms later, the 5-frame stride).  Only
         the FIRST live lesson holds, because that is the only one that can
         be shown -- holding for every live lesson would pin both discs on
         screen for the whole of onboarding, which is the thing the owner
         asked to stop.
         The LEFT disc has no such loop: its anchors carry
         reach:'[data-joyzone="L"]' and the disc has been pointerEvents:'none'
         since v2.3.816, so the zone answers the hit-test whether the disc is
         painted or not. */
      const wantSides = [];
      for (const L of LESSONS) {
        if (done[L.id]) continue;
        if (L.done && L.done(rpg)) { done[L.id] = true; saveDone(done); continue; }
        if (!L.live(rpg)) continue;
        /* Collected for EVERY live lesson the walk reaches, not just the
           first: the walk stops at the first one that MEASURES, and a lesson
           can be live and fail to measure for exactly the reason this hold
           exists.  So the set is "the lessons that were considered", which
           ends at the shown one -- bounded, and it cannot miss the lesson
           actually on screen the way holding only for the first live one
           could (gear is live and unmeasurable in a phone's bag layout;
           attack is the one displayed). */
        for (const a of L.anchors) {
          const sd = discSideFor(a.sel);
          if (sd && wantSides.indexOf(sd) < 0) wantSides.push(sd);
        }
        const rect = measure(L.anchors);
        if (!rect) continue;          /* off screen / covered / desktop — skip, don't block */
        next = { id: L.id, label: L.label, body: rect.body, shape: L.shape, rect: rect };
        /* Arm the cycle counter the first time its mark is chosen, seeded with
           the slot the player is on so that one does not count as a swap. */
        if (L.id === 'cycle' && !cycleArmed.current) {
          seenSlots.current = Object.create(null);
          if (rpg) seenSlots.current[rpg.activeSlot || 'melee'] = true;
          cycleArmed.current = true;
        }
        break;
      }
      /* v2.3.2246: reconcile the hold set against what the walk wanted.
         Recomputed every tick rather than edge-gated, so a lesson finishing
         (or the whole coach retiring) cannot leave a disc pinned on screen
         for the rest of the session, and so a hold lost to a remount comes
         back on its own.  holdDisc is a Set add -- re-asking is free. */
      {
        const prev = discHoldRef.current.sides;
        for (const sd of prev) if (wantSides.indexOf(sd) < 0) releaseDisc(sd, 'coach');
        for (const sd of wantSides) holdDisc(sd, 'coach');
        discHoldRef.current = { id: null, sides: wantSides };
      }
      const cur = viewRef.current;
      const same = (!next && !cur) || (next && cur && next.id === cur.id
        && next.body === cur.body
        && Math.abs(next.rect.left - cur.rect.left) < 2
        && Math.abs(next.rect.top - cur.rect.top) < 2
        && Math.abs(next.rect.width - cur.rect.width) < 2
        && Math.abs(next.rect.height - cur.rect.height) < 2);
      if (!same) { viewRef.current = next; setView(next); }
      paint();
    };
    /* ═══ v2.3.1808: THE FLASH IS CSS, AND THIS RUNS 12x A SECOND ═══
       It was right that re-rendering React 60 times a second to animate an
       opacity would jank — and then this did the same damage a different way:
       it wrote el.style.opacity EVERY frame, on a fixed overlay sitting above
       the WebGL canvas, which is precisely the composite path CLAUDE.md
       already records as the sore spot on iPhone (the charge-pie drop-shadow
       incident).  A style write per frame on that layer forces a composite per
       frame whether or not the mark changed.
       The pulse is a CSS keyframe now (.bt-coach-ring in game.css), so the
       compositor owns it and this loop touches no style at all in the common
       case.  What is left runs on the same 1-in-5 tick as the measurement:
       only the block lesson's progress bar, and only while it is on screen.
       (The gesture watchers above still run every frame — they read plain
       object fields, which is free, and the shield sweep needs the
       resolution.) */
    const paint = function () {
      const arc = arcRef.current;
      if (arc) {
        const b = blockRef.current;
        /* v2.3.2242: a one-step lesson has a one-step bar. */
        arc.style.width = (b.sectors === 1 ? 100 : 0) + '%';
      }
    };
    /* Dev probe, in the house style (__btWorldProps, __btStandInSkin): the
       two halves of the block gesture are invisible from the outside, and a
       test that could only see "the mark is gone" could not tell a lesson
       that completed from one that was never shown. */
    try {
      window.__btCoach = function () {
        const b = blockRef.current;
        return { done: Object.assign({}, doneRef.current), heldMs: Math.round(b.ms),
                 raised: b.sectors === 1,   /* v2.3.2242 */
                 sectors: b.sectors, needMs: BLOCK_HOLD_MS, needSectors: BLOCK_SECTORS,
                 slots: Object.assign({}, seenSlots.current),
                 cycleArmed: cycleArmed.current,
                 /* v2.3.2130: the move lesson's progress, and which gate is
                    holding the coach open.  Both are invisible from outside --
                    a test that could only see "no mark" could not tell a coach
                    that finished from one that never opened, which is exactly
                    the failure the pre-tutorial gate is fixing. */
                 walkedPx: Math.round(walkRef.current.px), needPx: MOVE_PX,
                 gate: (function () {
                   const r = (stateRef && stateRef.current && stateRef.current.rpg) || null;
                   if (!r) return 'none';
                   if (inTutorial(r)) return 'tutorial';
                   if (preTutorial(r)) return 'pre';
                   return 'closed';
                 })() };
      };
    } catch (_e) {}
    raf = requestAnimationFrame(step);
    return function () {
      stop = true; cancelAnimationFrame(raf);
      /* v2.3.2246: unmount releases too, so a remount cannot double-hold. */
      for (const sd of discHoldRef.current.sides) releaseDisc(sd, 'coach');
      discHoldRef.current = { id: null, sides: [] };
    };
  }, [stateRef]);

  if (!view) return null;
  const r = view.rect;
  const pad = view.shape === 'circle' ? 6 : 5;
  const round = view.shape === 'circle' ? '50%' : 12;
  /* The card goes ABOVE the target when there is room and below when
     there is not — the right joystick sits at the bottom of the screen,
     which is precisely the "text above the right joystick" the owner
     asked for, and the bag button is down there too. */
  const above = r.top > 108;
  return React.createElement('div', {
    'data-coach': view.id,
    style: {
      position: 'fixed', inset: 0, zIndex: 31, pointerEvents: 'none',
    },
  },
    /* the flashing ring */
    React.createElement('div', {
      ref: ringRef,
      'data-coach-ring': view.id,
      className: 'bt-coach-ring',
      style: {
        position: 'absolute',
        left: r.left - pad, top: r.top - pad,
        width: r.width + pad * 2, height: r.height + pad * 2,
        border: '3px solid ' + BRASS,
        borderRadius: round,
        /* DARK ON BOTH SIDES OF THE BRASS.  A plain brass ring was nearly
           invisible in the first screenshots: the left joystick's disc art
           is tan and the town ground it sits on is sand, so brass-on-brass
           for most of the circle.  The two 2px near-black rings (one inset,
           one outset) give the ring its own edge whatever it lands on,
           which is the same reason the joystick sprites carry their own rim.
           No CSS `filter` here — a filter compositing over the WebGL canvas
           is the documented cause of the iOS "static" (CLAUDE.md), and this
           overlay sits on top of the world by definition. */
        boxShadow: '0 0 0 2px rgba(5,10,13,.55), inset 0 0 0 2px rgba(5,10,13,.45),'
          + ' 0 0 22px rgba(216,170,88,.55)',
        pointerEvents: 'none',
      },
    }),
    /* the line that says what to do with it */
    React.createElement('div', {
      'data-coach-card': view.id,
      style: {
        position: 'absolute',
        /* v2.3.2174: clamped to the WORLD's span, not the screen's.  The
           landscape dashboard can take the left edge now, and a card clamped
           to `window.innerWidth` happily slid underneath it -- measured at
           x=175 with the panel occupying 0..220.  --world-x / --play-w are
           0 / innerWidth in portrait, so the arithmetic is unchanged there. */
        left: (() => {
          const _cs = getComputedStyle(document.documentElement);
          const _wx = parseFloat(_cs.getPropertyValue('--world-x')) || 0;
          const _pw = parseFloat(_cs.getPropertyValue('--play-w')) || window.innerWidth;
          return Math.min(
            Math.max(_wx + 8, r.left + r.width / 2 - 110),
            Math.max(_wx + 8, _wx + _pw - 228));
        })(),
        /* Anchored by its BOTTOM when it sits above the control, because the
           card's height is not knowable here — it is one, two or three lines
           of wrapped copy plus an optional progress bar.  The first cut used
           a guessed 62px top offset and the three-line block card overlapped
           the very joystick it was pointing at. */
        top: above ? undefined : r.top + r.height + pad + 10,
        bottom: above ? Math.max(6, window.innerHeight - (r.top - pad - 10)) : undefined,
        width: 220,
        background: INK,
        border: '1px solid rgba(216,170,88,.45)',
        borderRadius: 12,
        padding: '7px 10px 8px',
        /* v2.3.2123: the dismiss X below is absolutely positioned against this
           card, which needs the card to be its containing block -- and it
           already is, from the `position: 'absolute'` at the top of this
           object.  A second one was added here and CI caught it as a duplicate
           key (no-dupe-keys); the note is kept because the X depends on that
           line and a future tidy-up that removes it would send the button to
           the screen's corner. */
        boxShadow: '0 10px 24px rgba(3,8,10,.45)',
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3,sans-serif',
      },
    },
      /* ═══ v2.3.2123: A WAY OUT OF THE LESSON ═══
         Demo feedback, three reviewers.  Excalibur: the tips and the chat
         "just won't go away no matter what I do."  Tee: "I suggest adding a
         collapse option for the chat screen and tips, so they don't take up
         the entire screen ... It is obstructing the view of the game", with
         the shield card circled.  Alix: "The message above the attack stick
         mask the screen and not go down easily."

         The header of this file says a lesson has "nothing to dismiss" and
         ends by WATCHING GAME STATE, which is the right instinct and was too
         literal: the block lesson ends only when you double-tap, hold, and
         turn all the way around for two seconds.  A player who cannot make
         that gesture -- or does not want to right now -- has no way to put the
         card down, and it is parked over the world until they manage it.

         So: one X, and only the X is interactive.  The overlay, the ring and
         the card stay pointerEvents:'none', so the "never blocks" property the
         header describes is intact everywhere except a 22px target that exists
         to be pressed.  Dismissing marks the lesson done in the same
         localStorage record the gesture would have -- per browser, the grain
         the file already chose -- because a card you have explicitly put down
         and which returns on the next zone change is the same complaint
         again. */
      React.createElement('button', {
        'data-coach-dismiss': view.id,
        onPointerUp: function (e) {
          e.stopPropagation();
          try {
            const d = doneRef.current;
            d[view.id] = true;
            saveDone(d);
          } catch (_e) { /* the card must still close */ }
          viewRef.current = null;
          setView(null);
        },
        'aria-label': 'Dismiss tip',
        style: {
          position: 'absolute', top: 2, right: 2,
          width: 22, height: 22, lineHeight: '20px', textAlign: 'center',
          padding: 0, borderRadius: 8,
          background: 'transparent', border: 0,
          color: 'rgba(244,240,231,.55)', fontSize: 15, fontWeight: 700,
          fontFamily: 'inherit',
          pointerEvents: 'auto',   /* the ONE thing here that takes a touch */
          WebkitTapHighlightColor: 'transparent',
        },
      }, '×'),
      React.createElement('div', {
        style: {
          fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
          textTransform: 'uppercase', color: BRASS, marginBottom: 2,
          /* room for the X, so a long label cannot run under it */
          paddingRight: 20,
        },
      }, view.label),
      React.createElement('div', {
        style: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: '#F4F0E7' },
      }, view.body),
      /* Only the block lesson has something to fill: the other two are a
         single action, and a progress bar that jumps 0 -> 100 tells the
         player nothing they did not already see happen. */
      view.id === 'blockRanged' && React.createElement('div', {
        style: {
          marginTop: 6, height: 4, borderRadius: 2,
          background: 'rgba(244,240,231,.14)', overflow: 'hidden',
        },
      }, React.createElement('div', {
        ref: arcRef,
        'data-coach-progress': '1',
        style: { width: '0%', height: '100%', background: BRASS, borderRadius: 2 },
      }))
    )
  );
}

export default QuestCoach;
