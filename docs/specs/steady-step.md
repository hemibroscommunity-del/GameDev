# A steady step on a steady screen (v2.3.4400)

> The owner, 2026-11-09, on an iPhone 14 Pro Max in Safari: "the performance
> on mobile ... is gritty framerate while on skateboard riding through town.
> Can that be improved to a buttery smooth FPS?"
>
> And, after riding with the frame meter on (`?perf=1`) at the screen's own
> resolution, at a lower one (`&res=2`) and with no buildings or trees
> (`&noobjects`): "I don't know why but it was saying 60fps but the screen
> looked gritty like it was 30fps or worse ... All 3 were gritty."

## What was wrong

The meter on those rides: **60 frames a second**, the game's own work **3.4
to 4.1 ms** of each 16.7, the frames' lengths "avg 16.7 p95 18.0 max 22.0"
and "avg 16.7 p95 19.0 max 24.0". The graphics chip had time to spare and
every frame was shown. A lower resolution and an empty town changed nothing,
so it was not the pixels and not the buildings.

What was uneven was **what each frame showed**. The game moves you by your
speed times the frame's length (`BroTown.jsx` `_dtScale`, v2.3.1769), and it
took that length from the clock at the moment its own code began to run. The
screen shows every frame for exactly one refresh, 16.7 ms. The moment the
code begins wobbles a few ms round that (and Safari rounds its clock to a
whole ms). A frame measured 22 ms moved you a third too far; the one after
it, measured 11, a third too little; the screen showed both for the same
16.7 ms.

At a walk that is under a pixel. On the skateboard (300 game px a second,
7.7 device px a frame on that phone) the world slid 10 px, then 5, then 8.
The eye reads uneven motion at 60 frames a second as a lower frame rate. A
computer does the same (the judges' "not smooth", the same week).

An earlier guess in `docs/STATE-MACHINES.md` (A3: the graphics chip making 13
new pieces of ground a second) is **refuted** by the owner's captures: the
ride was as gritty with a third of the pixels, and the meter shows the chip
keeping up.

## The rule

`src/game/frameClock.js`: the step a frame is the **mean of the last ten
frames' measured lengths**.

- A late start and the short frame after it are in the same mean, so they
  cancel. The phone's wobble of 6 ms a frame becomes 0.6.
- Every measured ms is still spent, once, a tenth at a time: you cover
  exactly the ground the clock says. The worker checks your speed on the
  same clock (`movement.js` MOVE_BUDGET), so nothing is faster.
- A frame longer than 50 ms (three frames: the cap the step already had) is
  a **break** (a tab coming back, a stall). It is taken as it is, as before,
  and the mean starts again after it. So under 20 frames a second nothing
  changes at all, which is every phone test on the QA box.
- `S._frameMs` is the length the step was made from (the mean) up to the
  cap, so a jump's crossing rule still reads 0.06 px a ms; past the cap it
  is the frame's own, as before.
- **`?dtsmooth=0`** in the address is the old way for one tab: the owner's
  own side-by-side on the phone.

## The proof

| | The old way | Now |
|---|---|---|
| The phone's wobble played to the real game on the skateboard (`mp-steadystep`): the ground covered a frame, worst | 36% out | 3.6% out |
| ...from one frame to the next | jumps by 70% of a step | 4.3% |
| ...on the whole | 5.00 game px a frame | 5.00 (the same speed) |

- **`node tools/qa/mp/run.mjs steadystep`**: a phone page in the world, on
  the skateboard, riding east. The page's clock is replaced by one that says
  what the owner's phone said (each frame 16.7 ms after the last, the game's
  code starting up to 7 ms late: avg 16.7, p95 18.7, max 22.3) and every
  frame's step is read back (`window.__btStepLog`). Two pages: as it ships,
  and `?dtsmooth=0`. This box draws a few frames a second and cannot show 60;
  it does not need to, because the fault is in how a measured length becomes
  a step.
- **`server/test/frame-clock.test.mjs`**: a steady screen, the phone's
  wobble, Safari's whole-ms clock, a dropped frame, a break, 120 Hz and 30
  frames a second, a change between them, the off-ramp, and that the game
  loop has no other writer of the step.

## The owner's verdict, and what is left

"I think it looks a little smoother but it's still gritty looking"
(2026-11-09, the strip reading "fps ~59 frame avg 16.8 p95 17.0 max 38.0").
So the uneven step was part of it, not all of it. With steady input the step,
the camera's slide (within 3.8%) and your place on the screen (within 0.06
game px) are all steady now (`mp-steadystep`). What is left, and how the
phone's strip (`?perf=1`) tells them apart since this change:

- **late frames**: the count over ten seconds, the worst one's split into
  the game's work and the time outside it, and the slowest job between
  frames, by name. The owner's next capture read "late frames 10 in 10s",
  "worst 170.0 = game 40.0 + outside 130.0", "stick 1.00 to 1.00": art made
  on the page the first time it came on screen. Found and fixed in the same
  version: `docs/specs/living-town.md`, "The looks the numbers refuse", and
  an object page's bases read a few ms at a time (`mp-townride`);
- **the 60 ceiling**: that phone's screen is 120 Hz and Safari gives a web
  page 60; the strip's `fps` line says which the page is getting;
- **the thumb**: the stick is analog, and the strip's `stick` line shows
  whether it sat at the rim (1.00 to 1.00) or wavered short of it.

## What it does not do

- It cannot be SEEN here: only the owner's phone shows whether the ride now
  looks smooth. The comparison is the preview with and without `?dtsmooth=0`.
- Other players and monsters are placed from the worker's messages by their
  own smoothing; this is your own step and so the world's scroll under you.
- A screen the device cannot keep up with shows frames for unequal times,
  and a steady step is then an unsteady speed: `docs/specs/frame-pacer.md`
  (v2.3.4400, the same version) draws on a whole number of refreshes on a
  fast screen.
- A frame the screen really drops (the chip running out of time) is still a
  dropped frame. The owner's third ride read 46 frames a second for a moment
  with a tutorial card on screen; that is a separate thing to look at if it
  comes back.

## The 30 lane (v2.3.5233, card O PR 13, grand plan 2.5)

- **The cap is the lane's**: three of its frames. The lanes' `step` knob
  (`drawLanes.js`): 50 ms in the full and light lanes, 100 in `thirty`
  (named by the pacer wherever the refresh reads 30: Low Power Mode). Read
  in `BroTown.jsx` alone (`_stepCapMs`), handed to the clock
  (`makeFrameClock(undefined, _stepCapMs)`: `frameClock.js` keeps no
  imports, its cap may be a function asked each frame) and the same cap
  clamps `_dtScale` (3 at 60, 6 at 30).
- **Why**: at 30 a missed refresh is a 67 ms frame. Under the old 50 it was
  a break, clamped to 50: 17 ms of ground lost each time, slow motion. At
  100 it is a step like any other; the ground the clock moved is covered.
  A 60 screen that only ever makes twos reads as 30 and takes this lane,
  which is what its frames are.
- **The worker's move budget is the ceiling, and a 100 ms step fits it**:
  the fastest honest walk (~441 px/s) covers 44 px in 100 ms, inside
  `MOVE_BUDGET`'s 500 px/s refill and 3 s burst (and the old per-message 80
  under `movebudget: false`). No server change.
- **Not combat**: the dash keeps its own per-frame cap (`DASH_MAX_STEP_PX`),
  and the swing's clock and the bow's sight read no step cap. A projectile
  steps at most the old clamp's 3 (`frameClock.js` `combatDt`,
  `COMBAT_DT_MAX`; read by `projectiles.js` and, v2.3.5231, by
  `visualSystems.js` for another player's arrow: the sitting 26 low): its sweep cap (200 px over 144) and the trail's guard
  (260) assume it, and at 6 an arrow would step past a monster on a long
  frame (the gatekeeper's sitting 25).
- `?dtsmooth=0` stays the old way: no clock, and the clamp the old 50 ms.
- The clamp is the cap x 3 / 50: main's 3 exactly at 60 (v2.3.5231), 6 at 30.
- Held by `frame-clock.test` §9 (a 30 screen missing one refresh covers its
  whole ground; the 60 cap would lose 17 ms) and `mp-steadystep`'s 30 rides.
