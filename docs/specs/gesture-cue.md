# The gesture cue on the right button (v2.3.2384)

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
