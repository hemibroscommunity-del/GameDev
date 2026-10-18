# Harvesting on a computer (v2.3.3407)

The owner, 2026-10-18: "Make sure all actions/buttons can be completed in
landscape mode and on the computer. For instance I don't think you can harvest
lifeskills right now on the computer. Make a fix for that."

## What was wrong

A harvest has two halves (docs/specs/gesture-cue.md, docs/specs/gathering-hits.md):

1. the **wind-up**: the character works, the worker's hits land on the
   resource's green bar until it reads 0;
2. the **gesture**: the window opens and the player makes the skill's motion
   for about 1.5 s at a quick pace -- pump (mining), chop side to side
   (woodcutting), circle (fishing), flick (cooking) -- and the harvest pays.

Since v2.3.2245 the gesture is made **on the right button** (the attack disc),
which game.css hides on a computer (`@media (pointer:fine)`). For that case
ExtractionSwipeLayer's `buttonCueScreenPos` fell back to "the character", but
worked the point out as `(player - camera) * scale` **without the canvas's own
offset**. A computer plays the game in a centred phone-shaped column
(game.css, v2.3.1715), so the point lay in the black margin left of the game:
measured at 1280 x 800, x = 218 against a column at 422..858. No press could
land there, nothing on screen said what to do, and since v2.3.1416 a harvest
has no time-out -- it waited at its full bar for ever.

Two smaller faults rode along:

- **E started the harvest over.** `runInteract` reaches a resource through
  `S._proxNode`, which stays set while you work it, and `startExtraction`
  drops the attempt in flight for a new one -- so a second press of E (the
  natural thing to try) threw the wind-up away.
- **A click during a harvest set the attack's state** (the canvas's
  mousedown), for nothing: a swing is refused mid-harvest.

## What a computer does now

- **The right button comes back for the harvest.** BroTown's resolver stamps
  `data-harvest` on its box while a harvest runs, and game.css shows the box
  under `pointer:fine` then (`.bt-rjoy-zone[data-harvest="1"]` out-ranks
  `.bt-desktop-hide`). It wears the phone's own cue -- the tool, the arrows,
  the ring -- and, while the window is open, a line over it saying what to do:
  "Drag ↔ or hold E", "Drag ↕ or hold E", "Circle ↻ or hold E",
  "Flick ↕ or hold E" (gesturePose.js `DESK_GESTURE_HINT`; TouchControls'
  `.bt-rjoy-deskhint`, shown only under `pointer:fine`).
- **The mouse makes the gesture anywhere on the world** -- pressed on the
  button or on the game's canvas (`onWorld`), dragged the way the arrows go.
  A mouse that was already down on the world when the window opened (the click
  that started it, held) is adopted on its first move. Fishing with a mouse
  counts the turn of the pointer's own **heading** (`FREE_STEP_PX`,
  `FREE_TURN_MAX`), so a circle of any size, anywhere, reels; a wiggle reels
  nothing, as on the button. A finger is unchanged: on the button only.
- **The mouse press is the gesture's.** The layer cancels the pointerdown, so
  the canvas's mousedown (an attack on a computer) never comes; BroTown's
  onMouseDown also returns during any harvest. The click a gesture ends with
  is swallowed (the canvas's own `_touchHandledAt`), so it locks nothing and
  starts nothing.
- **Or E is held.** desktopControls owns the key and hands it to the layer
  (`S._harvestKeys.down/up`): while E is held the gesture is worked at a quick
  hand's pace (`GESTURE_QUICK_CYCLE_MS`), its cycles and active clock both
  running, so the meter fills in `GESTURE_TARGET_MS` (1.5 s) and the floor is
  met; the body, the cue, the effects and the reel's sound play along. The
  press that starts a harvest, held on, waits through the wind-up and works it
  the moment the window opens: **hold E to harvest**. A fresh tap works at
  least `KEY_WORK.tapMs` (160 ms), so tapping in a rhythm works too.
- **E never starts a harvest over**, and a held E's repeats start nothing.
- **QuestCoach** never rings the right button on a computer (its attack and
  special lessons would point at a button that harvests), as before.

## The grade

`gradeGesture` (moved to gesturePose.js, unchanged) grades the keyboard too.
A key draws no path, so it is graded with an entropy of 0: **never
'perfect'** -- 'good' at a steady hold, 'ok' when slow -- and no fingerprint
is sent. The worker already pays a strike with no fingerprint at most 'good'
(botfp.js, v2.3.3322), and counts it as evidence only (`noFpStrikes`), so a
keyboard player is never scored as a bot. **The mouse draws a real path and is
graded exactly as a thumb**: 'perfect' (more XP than 'good', and on ore a
second piece) is the mouse's and the thumb's. A gesture the keyboard worked on
at all is graded as the keyboard's.

## Not changed

- The phone: the gesture starts on the button only; the line is never shown
  (it is `pointer:fine` only); everything else in the layer is the same code.
- The worker: nothing. The strike, its timing and its fingerprint rules are
  the same messages as before.

## Tests

`mp-deskharvest` (tools/qa/mp): on a computer, a tree by E held (a second
press in the wind-up does not restart it; the button and the line are on the
screen, in the game's column), a copper vein by a real mouse press on the
world (no attack armed, the click swallowed), a minnow spot by the mouse
circling away from the button, the fallback anchor on the figure; and a phone
held sideways, unchanged (a real tap on HARVEST, no computer line, a finger on
the world does nothing, a finger on the button finishes it).
