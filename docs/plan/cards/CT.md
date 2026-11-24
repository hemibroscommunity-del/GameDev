# Card CT: the two-button controls, a trial scheme (the owner's request, 2026-11-23)

**The owner's words, 2026-11-23, in order:**
1. *"change the combat mechanics of the right joystick so that there's just
   an attack and jump button. The left joystick rotates the character
   directionally if pressed at or below about 30% from center and begin
   walking in the pointed direction if moved further. The line of site will
   become visible if it's within target range of the monster (target range
   will depend on whether melee weapon or ranged weapon is equipped with
   range being longer)."*
2. *"when monsters in your line of site (and in range) the combat buttons
   appear around the attack button. The attack button should be beveled and
   when pressed it stays activated until out of range or the button is
   pressed again. The idea behind this is that the majority of combat will
   consist of delivering combos of special attacks, jumps, and blocking
   instead of managing the direction or smashing the attack button. It will
   lock on target while combat is active"*
3. *"By combat buttons I mean blocking and special attacks. I think that's
   it"*

**Purpose:** the owner can switch to this scheme on their iPhone, play a
fight with it upright and sideways, and switch back, with today's combat
untouched. It is a trial: the owner has changed the right stick three times
(2026-09-03 a button, then both sticks back; 2026-11-13 *"I like combat
better the old way"*), so nothing old is removed until they have played
both.

**Tags:** 6540 to 6559, one a PR, in order (6545: item 6, the orchestrator's addition of 2026-11-24).
**Model and effort:** the strong model, high. Helpers (the cheapest model, low) for phone runs.
**Read:** `CLAUDE.md`; `docs/plan/finish.md` parts 5 and 6 (they bind you);
`docs/plan/census/controls-map.md` (today's controls, file by file: start
there, do not map them again); `docs/specs/control-redesign.md`;
`docs/UI-DESIGN-NOTES.md` (the controls' section and "Tried before");
`docs/LANTERN-SLATE-SPEC.md`; TRAPS 175, 218, 229, 247.
**You hold, alone:** `src/ui/BroTown.jsx`, the two renderers (a call only:
see the readings), `src/ui/panels/TouchControls.jsx`, `ShieldButton.jsx`,
`JumpButton.jsx`, `SpecialButton.jsx`, `AbilityButtons.jsx`,
`src/game/manualCombat.js`, `controlVisibility.js`, `targeting.js`, the
controls' part of `src/styles/game.css`, the mode's rows under `src/state/`,
`src/ui/panels/DevPanel.jsx` (one row), the teaching words
(`QuestCoach.jsx`, `ControlsTutorial.jsx`, `src/data/say/`), new
`src/game/stickZones.js`, `sight.js`, `latch.js`, a new leaf under
`src/rendering/leaves/`, new `tools/qa/mp/mp-twobuttons.mjs`,
`tools/qa/ui-review/states.mjs`, `docs/specs/honest-trouble.md` (one row),
the switch table.
**Browser:** heavy. One browser job at a time; repeat runs to helpers.

## The scheme (the readings chosen for you)

- **It is mode 5 of `manualCombat.js`**, "the two buttons". Mode 4 stays the
  answer when nothing is chosen and is not touched. `?manual=5` chooses it
  and is remembered, as 0 to 3 are; the Test panel gets one row, "Controls:
  two sticks / two buttons", that sets the same key. Touch only: a
  computer's keys and mouse do not change in this card.
- **The left stick has three zones**, by the thumb's distance from where it
  landed, as a share of the stick's travel: a small dead zone (nothing; a
  tap stays a tap); up to 30% (TURN: the body faces the thumb's way, on the
  eight facings drawn today, and does not walk); beyond (WALK that way, the
  speed rising to full at the rim). Today's travel (17.5 px upright, 25
  sideways) is too short for three zones: in this mode the travel is the
  disc's drawn radius. The numbers live in one table in `stickZones.js`, and
  `?turnzone=<percent>` moves the border for the trial. The disc draws the
  border as a ring. The double tap (the weapon), the tap (the world) and
  the dodge swipe keep their rules: a swipe is judged first, and a turn
  never starts a roll.
- **A monster is SIGHTED** when it is alive, within the weapon's target
  range, and within the faced cone (start with 45 degrees each side of the
  drawn facing; the one nearest the facing's line wins, then the nearest).
  The ranges are one table in `sight.js`: the sword's is today's ring (440
  px), a bow's and a staff's their reach on the worker less its slack, never
  more than the worker would land.
- **While one is sighted**: the sight line is drawn from the body to it (the
  aim beam's drawing, called from a new leaf, not new lines in
  `effectsRenderer.js`), and Block and the specials appear around Attack.
  With none sighted the right side is Attack and Jump only. The appearing is
  one change at the sighting, held a short while at the range's edge so it
  does not flicker (TRAPS 218: never a structural change every frame). It
  goes through `controlVisibility.js`'s one resolver.
- **Attack is a latch**, drawn bevelled: raised at rest, pressed in and lit
  while combat is active. A press with a monster sighted makes combat
  ACTIVE: the target is locked, the body faces it, the weapon attacks at its
  own rate (the held attack's own lines), and the stick moves the body
  around the target as a lock does today. Combat ends when Attack is pressed
  again, when the target is out of range (with the margin the sword's ring
  has today, 440 held out to 550, so the edge does not flicker), or when it
  dies with no other monster sighted. If another is sighted as it dies, the
  lock moves to the nearest with no new press. **Tap and hold** (part 15,
  tag 6548; the owner, 2026-11-24: *"I'm also thinking if you hold down the
  attack button near a monster something signifies that the auto-attack is
  enabled. Maybe 2 seconds. Otherwise each tap is its own attack cycle"*,
  and to the orchestrator's reading *"Yes do it the way you suggested"*)
  changes that: every press is ONE attack at once; with a monster sighted
  it locks it ('active': the body faces it, the line shows) and the lock
  stays for the next taps until it dies, leaves the hold range or yours
  ends (a tap never lets a lock go); a HOLD on a lock fills a ring round
  Attack and at `autohold` ms (600; `?autohold=<ms>`, 200 to 3000) is
  'auto' (the held attack on, the button lit, the finger may lift); a lift
  before the fill empties the ring (a tap); a tap while auto ends it and
  strikes nothing of its own; a kill lets EVERYTHING go, no move to the
  next (*"doesn't jump to every monster"*). `?holdauto=0` keeps the press
  above (a lock is auto at once, the move kept). A press with nothing sighted
  is one attack the way the body faces, as a tap is today, and with a bow
  that is an arrow on the body's facing, line or no line (item 8, the owner
  2026-11-24: *"I want free form attacks when you press the attack button
  prior to entering any combat situation. So I want arrows to be able to
  shoot whenever the line of site is aimed at (instead of the current
  behavior of only firing when something is in front to fire at like props
  or monsters)"*; `?freefire=0` gives the old wait back). With a sword the
  locked press swings WHERE THE BODY STANDS: nothing walks, steps or dashes
  it to the monster, the left stick alone moves it, a swing that cannot
  reach misses (item 8, the owner: *"I want to change the melee behavior so
  that it doesn't jump to every monster. Instead you must press an attack
  charge button to get that behavior."*; the Charge button is a later
  item's; no switch: the press already moved nothing, and its road is
  game/freeAttack.js twoButtonPress, held by its guard).
- **Each job of the old right side has a home.** The specials and Block are
  their buttons (no flick in this mode). A staff's bolt and a bow's arrow
  fly at the locked target (nothing is steered by the finger in this mode).
  *"The bow only looses when the line is on something"* holds for the
  lock's arrows (the line is on the lock); a press with nothing sighted
  looses its arrow free (item 8, above): it hits what it meets and starts
  the fight as any arrow does. **Attack always stays Attack** (part 17, tag
  6550; the owner, 2026-11-24: *"I'm also thinking contextual buttons like
  mining fishing or interacting with npc should appear below the item
  instead of having a dual purpose attack button. Attack button always stays
  attack"*): near a node it keeps its word and sword and a press swings
  (during a harvest too: the harvest goes on); ONE button stands under the
  one nearest thing (game/contextButton.js, panels/ContextButton.jsx): CHOP,
  MINE, FISH or COOK under a node exactly when Attack used to become the
  harvest button (S._btnHarvest), its tap the harvest's start, and during the
  work the same button wears the beat and takes the strokes (the gesture's
  anchor); TALK under a townsperson within 120 px with no fight, its tap
  talking as a tap on him does. `?ctxbuttons=0` gives the old Attack. A tap
  on the world's right half still opens a door and talks to a townsperson.
- **PvP is not this card.** In a duel, a spar or No man's land the scheme
  must not break: say in PR 3's words what it does there today. Ask before
  changing any rule of a fight between players.
- **Nothing on the worker changes.** A turn rides `move` as today. A turn
  must not raise what a quiet phone sends (`mp-quietphone` step 4): nothing
  goes while the facing is unchanged. If you find the worker must change,
  stop and ask.
- **Three phases, each one field and one function** (CLAUDE.md section 5),
  each a row of `src/state/phases.js`: the stick (rest, turn, walk), the
  sight (none, sighted), the latch (idle, active, auto: part 15; S.autoAttack
  derived from it, latchHolds). Never a second boolean.
- **The rules are modules** (`finish.md` part 5, rule 5): `stickZones.js`,
  `sight.js`, `latch.js` under `src/game/`, with no imports where possible
  and node suites that test what they do. `BroTown.jsx` gains calls, not
  logic: its code lines do not rise (`four-lines`). The mode's reads sit in
  one named step of `src/game/frameSteps.js` (`input`), not in `legacy`.
- **The card is additive.** Taking mode 5 out again must be one small PR.
  Mode 4's lines are not moved in this card.
- **The watch must know the mode.** The owner removed tap-to-target on
  2026-11-09 as *"easily botted and abused"*; a latch with a lock is easier
  still for a script. `docs/specs/honest-trouble.md` gets the row: what a
  person's latched fight looks like to each signal that reads aim or the
  rhythm of presses. No detector's line moves in this card. Say in PR 5's
  words what a script gains in mode 5 over mode 4.

## PRs, in order

1. **(6540) The three rules, with nothing calling them.** `stickZones.js`,
   `sight.js`, `latch.js`, their suites, the phase rows, the ledger rows,
   mode 5 in `manualMode` (chosen by nothing yet but the address), the
   switch table's rows. Node only.
   Done when the suites play: a thumb at 20% turns and does not walk; at 40%
   walks; a swipe is a roll in both; a monster at the range's edge is
   sighted going in at 440 and lost going out at 550; the latch's five ends.
2. **(6541) The left stick in mode 5**: turn and walk, the ring on the disc.
   Done when `mp-twobuttons` part 1 plays it with real touches, upright and
   sideways, and `mp-heldcombat` is green with the mode off.
3. **(6542) The right side in mode 5**: Attack as the latch, Jump, the lock,
   its ends, the move to the next monster.
   Done when part 2 plays a whole fight with two presses, and the old right
   zone is back with the mode off.
4. **(6543) The sight line, and Block and the specials appearing.** The
   screen's states in `states.mjs`; the section in `docs/UI-DESIGN-NOTES.md`
   with the three earlier changes under "Tried before".
   Done when part 3 sees the line and the buttons come at a sighting and go
   at its end, with no flicker at the edge (a monster walked back and forth
   across it).
5. **(6544) The Test panel's row, the teaching words for the mode, the
   watch's row.** Then tell the orchestrator: ready for the owner's phone.
6. **(6545) Sprint from the left stick in mode 5** (the owner's request,
   2026-11-24 01:31 UTC: *"the sprint button should be moved to the left
   joystick too"*; asked how: *"Go recommended"*): the thumb pushed PAST the
   disc's edge sprints; no sprint button in mode 5.
   PURPOSE: in the two-button trial the run is one more thing the left thumb
   does, and a thumb resting at the rim (full walking speed) never burns
   stamina by accident.
   Readings chosen (named in the PR under "Decided by the orchestrator"):
   - The rule is a pure function beside `stickRead` in `stickZones.js` (or
     `src/game/stickSprint.js`), fed the UNCLAMPED `share`: on at share >=
     SPRINT_AT 1.25, off below SPRINT_OFF 1.05, both in STICK_ZONES (trial
     numbers). Never read from the clamped walk vector.
   - It is a HOLD, like Shift on a computer: BroTown's stick call holds the
     sprint through `sprint.js`'s start/stop, never `toggleSprint`. Every end
     of today's sprint still ends it (stamina 0, shield, attack, swim, death,
     a zone change, standing still), and after an end it starts again only
     once the thumb has come back inside SPRINT_OFF and gone out again.
     Refused for stamina: today's "Not enough energy!" popup and denied cue,
     once a push.
   - Stamina, speed and the `sp` field on the move are today's; NO server
     change, no cap, no new message (`server/src/sprint.js` judges it as now).
   - In mode 5 with this on, `SprintButton.jsx` is not rendered.
     `?rimsprint=0` (a row in the switch table) gives the button back and the
     edge does nothing. With mode 5 off, everything is as today. Shift on a
     computer is unchanged.
   - What shows: PR 2's ring says "sprinting" by its own colour; no new art,
     no new sound. One teaching line with PR 5's words: "Push the stick past
     its edge to sprint."
   Files beyond the card's own, APPROVED (README "Who answers", answer 1):
   `src/game/sprint.js` (only if the hold needs a `how`),
   `src/ui/panels/SprintButton.jsx` (the not-rendered case), the switch
   table, `server/test/stick-zones.test.mjs` (it deploys: say so),
   `tools/qa/mp/mp-<name>.mjs` with its lane, `docs/UI-DESIGN-NOTES.md`.
   Done when a phone test in mode 5 (`world: 'wheel'`, upright and sideways)
   shows: at the rim (share 1.0) full walking speed, no sprint, stamina
   still; past 1.25 the sprint (the move's `sp`, stamina falling); back
   inside, it ends; at 0 stamina it ends and does not start again until the
   thumb has come back; `?rimsprint=0` and mode off are as today. And these
   plants go red in the suite, by what the code does: SPRINT_OFF made equal
   to SPRINT_AT (flutter); the rule fed the clamped speed (sprints at the
   rim); a restart with the thumb still out; a sprint started with the
   shield up or dead; `toggleSprint` in place of the hold.

Stop there. Taking the right stick out, moving the old scenarios, the
computer's controls and PvP wait for the owner's verdict.

## More readings

- The phone test drives REAL touches on the stick and the buttons (not a
  write to `S.autoAttack`), on the world (`world: 'wheel'`), its `lane`
  named, each control tapped at its centre, upright and sideways.
- The about 120 scenarios that fight in mode 0 are not touched.
- Every new control is `touch-action: manipulation` unless it is the stick
  (TRAPS 229); a control that closes on `pointerup` calls
  `swallowTapClick` (TRAPS 247).
- No new art but the button's two states (256 colours, preloaded); no new
  sound. A sound or an effect you find dormant stays off (TRAPS 305).
- `playable` and `memory-budget` green on every PR; no memory line raised.
