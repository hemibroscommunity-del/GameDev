# The gesture cue on the right button (v2.3.2384; reworked v2.3.2702)

## v2.3.2702 — the cue gesture as the owner described it

> Owner: "the character harvests a resource or performs an action for a
> certain amount of time (determined by your skill level) ... I wanted the
> character to perform each animation with a loading bar above their head
> indicating the progress of the animation. Then, once it reaches the limit,
> the character is supposed to stop animating until you perform the correct
> gesture on the right joystick ... the starting spot of the cue should be
> static but flash. An effect should show you which way the cue should move
> ... the character's frames should animate at the speed you perform the
> gesture, but require about 3 seconds of performing the gesture at a quick
> pace ... resource or action specific effects ... the cue was a mini sprite
> of the tool being used."

The flow, end to end:

| Phase | Character | Bar over the head | Right button |
| --- | --- | --- | --- |
| **Wind-up** (2–10 s, `computeOpenDelay` by skill level vs node tier) | plays its harvest loop on the clock, with its effects | brass, fills 0 → full | `WAIT`, amber ring fills |
| **Ready, untouched** | **frozen** on the ready pose (phase 0) — no demo | full, **flashing** with a gold halo | the **mini tool** sits still at the start of its track and flashes; chevrons point the way; a comet of light runs the motion |
| **Gesturing** | frames follow the thumb, forward only, at the hand's speed | green fills with the gesture's progress | the mini tool rides the phase; green ring fills |
| **Paused** (thumb stops or lifts) | holds where it is | holds; flashes again after 600 ms | the teaching cue returns after 600 ms |

What changed, file by file:

* **`src/game/gesturePose.js`** — `gesturePose01` no longer feeds a demo to
  the body and no longer caps at a leisurely pace (the cap is now a smoother,
  `GESTURE_MAX_CYCLE_MS`, ~4 swings a second); it chases forward only and
  holds when still. `gestureDemo01`/`gestureCue01` are replaced by
  `gestureIdle` (is the cue teaching?) and `gestureCueFace` (every number the
  button draws). The strokes are described once in `GESTURE_STROKE`: the
  power stroke (down for the pick, up for the pan, rightward for the axe)
  plays the loop up to the blow (`split`, measured on each sheet), the return
  stroke plays the rest. The meter wants `GESTURE_TARGET_MS` (3000) of work
  at `GESTURE_QUICK_CYCLE_MS` a cycle, floored at `GESTURE_FLOOR_MS` (2400)
  of real motion. `extractionMeter01.bar01` is now two full bars (wind-up,
  then gesture), not one that stalls at 95%.
* **`src/ui/ExtractionSwipeLayer.jsx`** — one stroke tracker drives both the
  pose (12 px turn hysteresis, continuous) and the meter (a stroke counts once
  it has travelled 28 px; the first stroke is measured from the span of the
  motion, not the press point). Fishing's turns are floored at 0. The grade
  is now pace-based (≤3.6 s of motion → perfect for a human hand). The mining
  slam's sparks moved to the frame the pick lands on.
* **`src/ui/panels/TouchControls.jsx` / `BroTown.jsx`** — the painted strip
  (`rCueRef`) and the white finger are gone; one `<svg>` carries the track,
  the chevrons, the comet and the mini tool (the bag's pickaxe / axe / rod
  icons, and cell 0 of the pan strip) on a dark badge with a pulsing glow.
  Preloaded on the gate (`gestureCuePreload.js`).
* **`src/rendering/systems/effectsRenderer.js`** — the bar is restyled for
  contrast (a pale bar vanished on snow), lifted above your own name plate /
  HP bar (entityRenderer publishes `S._selfBandTopY`), and the effects follow
  the frame actually shown: debris + clink on the pick's strike, chips on the
  axe's bite (crossing the frame, not landing on it — a quick hand steps over
  it), a splash every 480 ms while reeling, and for cooking grease pops plus
  **smoke** (new, sprites over the minted soft dot) while you flip — nothing
  off a still pan.

Coverage: `mp-gcue` (73, the town campfire) and `mp-cueshow` (34 — mining,
woodcutting and fishing through the real tap and pointer path in Frost Ridge,
with screenshots of each stage). Regression: `mp-harvest`, `mp-chopyield`,
`mp-cooktap`, `mp-cookpeer`, `mp-fishhand` green. See TRAPS §104.

---

## v2.3.2703 — the owner's second pass

> "Double the amount of time it takes to complete the gesture. Play sound
> effect while specific actions occur like pickaxe hitting rocks, axe hitting
> tree bark ... Also recolor the tools in the animations (they're still
> magenta from the creation phase) so maybe copper for the axe, pine wood for
> the pole, might be more I'm forgetting."

* **Twice as long:** `GESTURE_TARGET_MS` 3000 → 6000, `GESTURE_FLOOR_MS`
  2400 → 4800. The grade thresholds are now multiples of the target, so a
  future retune carries them along.
* **Sounds:** the pick's `mine-strike` already played on every blow. The
  chop played the SWORD's hit — the owner's `axe-chop` sample had been wired
  to the floating axe marker that v2.3.2245 deleted — and now plays the
  hatchet (alternating its two strikes) on every bite. Fishing gained the two
  clips that sat unregistered in `public/sfx/fishing`: `lure-drop` when the
  cast goes out, `fish-on-hook` when the wind-up ends and the reel window
  opens.
* **Tools:** copper axe head on a pine haft, a pine rod, a bark log —
  `src/rendering/toolRecolor.js`, applied at load after the skin pass (the
  magenta is the pipeline's key and code still reads it: TRAPS §105).

---

## v2.3.2384 (superseded above — kept for the history)


> Owner: "Add the old gesture cues on top of the right joystick when it's
> time to extract the resource."

## What was wrong

The harvest cue moved off the world and onto the right button at v2.3.2245
(commit `2deb56a`). The procedural white finger that used to float over the
node was deleted in that commit; what replaced it on the button is the
owner's painted 8-cell tool strip (pickaxe / axe / reel / pan) plus a
wind-up ring and a label.

It taught nothing, and the reason is one number:

```js
ex.cueFrame01     // written in EXACTLY one place:
                  // ExtractionSwipeLayer.jsx onPointerMove
```

So the instant the gesture window opens with no thumb on the glass, the
phase is `0` and stays `0`. The button shows `CHOP`, a ring at 0%, and a
tool strip frozen on cell 0 — and the **character freezes with it**, because
`gesturePose01` chases the same number for the mine/fish body poses and the
chop/cook stand-ins. Nothing moves until you already know what to do.

Two smaller faults rode along:

* `Math.min(3, Math.floor(f * 4))` on the button's cell index (arrived
  uncommented in `2deb56a`) capped mining and woodcutting at cell 3 of 8.
  Measured on the strips — the opaque bbox marches continuously from cell 0
  (x 20..131, y 37..133) to cell 7 (x 82..199, y 126..244) — cells 4–7 are
  the tool coming **down**. Those two skills could never show the strike land.
* `ex._gestureMovedAt` had been stamped by `onPointerMove` since v2.3.2245
  with the comment "the button face reads this". Nothing read it.

## What ships

### 1. A demo phase (`gestureDemo01`, `src/game/gesturePose.js`)

`cueFrame01` gets a generated value while no thumb is down, fed in at the top
of `gesturePose01` so that **one** function unfreezes all four consumers at
once — the tool strip, the player's own body, the chop/cook stand-ins, and
the new finger. Fixing only the button would have left the frozen character
behind it.

* A **sawtooth**, not an oscillation. The painted strips march one way
  (wind-up → strike → back to ready); a triangle would play the strike
  backwards on the way down.
* The cadences are the caps already in the tree, so the demo and the result
  cannot disagree: **700 ms** a swing (mining, woodcutting), **450 ms** a
  crank (fishing), **1600 ms** a flip (cooking).
* It **bypasses the chase** rather than feeding it. The rate limiter moves at
  most one full cycle per `fullCycleMs`, which is the same rate the demo
  advances, so the chase could only just keep up — and `wraps` is false for
  mining and chopping, so at the 0.999 → 0 seam the chase would walk the pose
  all the way back down, turning a repeating swing into a wind-and-unwind.
  `_posF`/`_posT` are still written, so the frame the thumb takes over starts
  exactly where the demo left off.

### 2. It stands down for a live gesture — on a fact, not a timer

* `ex._gestureDown` is set on `pointerdown` (inside the button's radius) and
  cleared on `pointerup` / `pointercancel` / unmount. While a finger is on the
  glass there is no demo, **however long a frame took**.
* `ex._gestureMovedAt` gives a **600 ms hold** after the last movement (and
  `onPointerUp` now stamps it too), so a player who lifts between strokes
  keeps their own pose for a beat and the demo returns after stillness.

The flag exists because the timer alone was not enough, and that was measured
rather than guessed: in the headless harness the main thread stalls for over a
second at a stretch, and every stall longer than the hold let the demo cut in
on a gesture in progress (`_posF` jumped off the thumb's value and back twice
in four seconds).

### 3. The finger itself (`gestureCue01` + `TouchControls` `rHintRef`)

An `<svg>` on the button face — **not** a `<div>`, twice over: a Pixi
`Graphics` draw is impossible here (this is DOM, not the stage), and
`mp-harvest.mjs` scans the button's DIVs for a `/gesture/` background to find
the tool strip, so a div would be a second match and break that assertion.

The four motions are the owner's own curves, restored: v2.3.843 the chop
(wind back, snap forward, recover), v2.3.853 the cook flip (dip, flick up,
recover), v2.3.1442 the mine pump and the reel orbit, v2.3.1667 "point where
it is going". Only the frame changed, from the node to the disc — and it is
driven by the same phase as the tool and the body, so the three are one
motion rather than three clocks.

Two things the move forced, both settled by measuring a real capture:

* **The glyph is not a point.** The first cut sized the tracks by where the
  *fingertip* went, and the capture showed a white blob hanging off the rim at
  ten o'clock: the body runs back from the origin and the knuckle further back
  still. `CUE_REACH` is that overhang; the tracks are sized against it and the
  pin measures the same way.
* **The middle of the disc is the only room there is.** The joystick knob
  (v2.3.2258) covers the centre and the tool strip behind it; the label owns
  the bottom. Drawing over the knob is right rather than merely expedient —
  the cue is on screen only while no thumb is down, and the knob only matters
  once one is.

The cue is painted twice, dark under light, because it crosses both the
near-black knob and the bright brass rim within one cycle.

### 4. Dead code removed

`drawFingerCue`, `drawFingerStreak`, `CUE_FINGER_LEN`, `CUE_FINGER_W` in
`effectsRenderer.js` — 45 lines with zero callers since v2.3.2245.

## Coverage — `tools/qa/mp/mp-gcue.mjs` (29 assertions)

`mp-harvest` already asserted that the window opens, that the button reads
CHOP, and that the axe strip is on the face. All three were green the whole
time this was broken, because **every one of them reads a single frame**. The
defect is not in any frame; it is that there is only ever one. So every
assertion here that matters is a difference between frames, sampled with the
page untouched.

The fixture is a cook on a campfire at the player's own feet in town
(`mp-cooktap`'s route) — no zone travel, no tools, no monsters. The 3500 ms
window is pushed out before sampling: the deadline is not what is under test,
and two cook cycles is too few samples to tell a moving cue from a jittery
one. The demo is skill-agnostic, so the per-skill curves are checked directly
against `gestureCue01` with no browser needed.

Mutation-tested — each of these turns the pin red on the assertions named:

| Mutation | Assertions killed |
| --- | --- |
| `gestureDemo01` always returns `null` (the pre-fix behaviour) | 11 |
| the `_gestureDown` guard removed, timer only | 3 |
| the `Math.min(3, …)` cell clamp restored | 1 |
| the finger never renders | 3 |

Regression: `mp-harvest` 30/30, `mp-cooktap` and `mp-chopyield` green.
