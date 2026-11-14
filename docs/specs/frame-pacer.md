# A steady rate on a screen the game cannot keep up with (v2.3.4400)

> The owner, 2026-11-10, an iPhone 14 Pro Max, Safari's "Prefer Page
> Rendering Updates near 60fps" turned off, twenty-four minutes into a
> session: "Still performance issues". The frame meter (`?perf=1`):
> "fps ~51  frame avg 19.6 p95 26.0 max 32.0 ms", "work 6.8 (sim 0.8 /
> render 6.0)  outside 12.8 ms". The ride before it, the phone cool, read
> "fps ~106  frame avg 9.5".

## What was wrong

With that flag off Safari offers the page the screen's own 120 refreshes a
second. Cool, the phone drew on nearly every one. Hot, it could not finish a
frame inside one refresh (8.3 ms), nor always inside two: its frames were on
the glass for two refreshes, then three, then two, then four (16.7, 25,
16.7, 33 ms). The steady step (`docs/specs/steady-step.md`) moves you the
same distance every frame; shown for unequal times, that is an unequal SPEED
on the glass from one frame to the next, which the eye reads as grit however
high the average. "51 frames a second" is not a rate a 120 screen has: it is
a mix of 60 and 40 and 30.

And drawing 120 frames a second is twice the work of 60, which is what heats
the phone in the first place.

## What the game does now

`src/game/framePacer.js` (no imports; `server/test/frame-pacer.test.mjs`),
asked at the top of the game loop (`BroTown.jsx _gameLoop`) before a frame
is counted, moved or drawn.

- **Only on a fast screen**: one that refreshes more often than every 14 ms
  (over about 70 a second): an Android phone at 90 or 120, a gaming laptop
  at 144, a ProMotion iPhone with that flag off. **A 60 screen is never
  paced**: every iPhone as Safari ships, most computers, the QA box. Its
  only whole step down is 30 a second, and the game never paces under about
  40 (`PACE_FLOOR_MS`).
- **While the game keeps up, every refresh is drawn**, as before. (The
  owner's cool phone, 106 a second with one frame in seven late, is left
  alone.)
- **When more than a quarter of its frames come a refresh or more late**, on
  two verdicts of 80 frames running (about three seconds), it draws on every
  SECOND refresh; if that cannot be kept to either, every third. A whole
  number of refreshes a frame, so every frame is on the glass for the same
  time. The owner's hot phone settles on every third refresh: a steady 40.
- **It tries a step faster** after 20 s of clean frames. A try that does not
  hold goes straight back and the next waits twice as long (40 s, 80, up to
  320), so a phone that is simply too hot is not shaken every few seconds. A
  faster rate that holds a whole wait starts the waits afresh.
- **The screen's rate is read** from the animation frame's own timestamp
  (the refresh's time, not the moment the code ran). A page that cannot keep
  up never sees a single refresh, only twos and threes; the gap between
  those is the refresh (`refreshOf`). A clock that does not beat in whole
  refreshes says nothing, and nothing is paced on a guess.
- **Not judged**: behind a loading screen, or across a break (a hidden tab).
- The steady step's mean starts again when the rate changes.
- **Whoever reads the canvas reads a refresh the game drew.** A WebGL canvas
  keeps its picture only until it is shown, so on a refresh the pacer passes
  it reads as EMPTY. The black-screen watchdog (`BroTown.jsx _sampleLit`)
  sampled "in an animation frame after the world's", which was every frame
  until there was a pacer: on a passed refresh it read 0% lit, counted a
  strike, and two strikes rebuild the renderer. The loop now says which
  refresh it drew in (`noteDrawn`) and the watchdog's sample, its late copy,
  the screen probe after a rebuild and QA's sample all ask for one
  (`whenDrawn`). A loop that draws nothing at all for 12 frames is not
  pacing, and is read anyway: the dark screen the watchdog exists to find.
- **`?pace=0`** in the address is the old way for one tab: every refresh the
  browser offers.

## What was proved, and how

| | The old way (`?pace=0`) | Now |
|---|---|---|
| The owner's hot phone, scripted, played to the real game on the skateboard (`mp-steadypace`): frames on the glass for two / three / four refreshes | 67% / 31% / 2% (avg 19.6 ms, the meter's own number) | 0 / 98% / 2% |
| ...the speed on the glass, one frame in ten | 33% out | 3.3% out |
| ...the ground covered a second | 297.6 game px | 300 (the same speed) |

- **`node tools/qa/mp/run.mjs steadypace`**: this box draws a few frames a
  second, so the phone's screen is scripted (as `mp-steadystep` scripts its
  clock): one refresh of a 120 screen for every call the browser makes, and
  after a frame the game drew, that frame's scripted cost rounded up to
  whole refreshes. It also takes the watchdog's own sample eight times while
  two refreshes in three are passed: lit every time, no dark strike. Against
  the watchdog as it was, the same run counted 3 strikes and the game was
  rebuilt mid-ride (the board gone, the ground covered 223 game px a second
  for 297): that is how it was found.
- **`server/test/frame-pacer.test.mjs`** (40 checks) on a model of a screen
  and a device: the fault; the settle on every third refresh within 7 s; a
  steady 60 for a phone that only just misses 120; never paced when it keeps
  up, on a 60 or 75 screen, on the QA box or on a clock that wobbles; 144
  and 240 screens; the floor; the come-back when the phone cools; a hot
  phone tried 5 times in 16 minutes (43, 86, 162, 323 s apart) with 94% of
  frames still the same length; a break; a loading screen; a reader of the canvas called only in a drawn
  refresh; the wiring.

## What it does not do

- It cannot be SEEN here. Whether a steady 40 looks better than an uneven 51
  is the owner's eye: the preview with and without `?pace=0`, on the phone
  when it is warm.
- It does not make a hot phone fast. It draws fewer frames, evenly, which is
  also what lets the phone cool; the meter's `screen` line says what it
  settled on ("screen 120/s  drawn every 3rd refresh (40/s)").
- A 60 screen that cannot hold 60 is as it was (a mix of 60 and 30). Pacing
  it would mean a steady 30, which the owner called gritty.
- **Why the phone slowed is not proved.** The game's own work went from 2.7
  to 6.8 ms a frame between the two captures with fewer monsters loaded,
  which reads as the phone slowing itself down (heat, twenty-four minutes at
  120 a second), not as more to draw. The meter now splits the time outside
  the game's frames into the page being BUSY and the page WAITING to be
  called (`src/debug/busyBeat.js`), so the next capture says which.

## The frame meter's new lines (`?perf=1`)

- `screen 120/s  drawn every 3rd refresh (40/s)`: the pacer's reading.
- `frames 17 ms 62%  25 ms 33%  33 ms 5%`: the last ten seconds' frames by
  whole refreshes. More than one big number is an uneven rate.
- `outside: page busy 1.2 + waiting 11.6 ms a frame`, and the worst frame's
  own `busy` and `waiting`: busy is code running on the page between frames
  (find it); waiting is the page not being called (the chip, the phone).
- `between frames: screen check N ms`: the black-screen watchdog's read of
  the canvas, when it holds the page past 4 ms (162 ms on the QA box with a
  second page open: `mp-peerarrive`).
- `looks palette` is asked every time. It was asked once, before the
  palette's sheets had loaded, so the owner's phone read "looks baked
  (default)" all session while drawing from the palette.

## The governor: the pacer, grown (v2.3.5222, card O PR 2; the grand plan's 2.3)

The pacer used to judge only a screen faster than about 70 a second, and
nothing in the game lowered a quality, a cap or a crowd because frames were
late. Now:

- **One verdict, every screen.** `lateOver(refresh, every)` is the one rule
  of a late frame: more than half a refresh past its frame (12.5 ms at 120,
  25 at 60, 50 at 30). The pacer judges on every screen whose refresh it
  knows; the report's `late` imports the rule (`src/debug/report.js`), and
  so has a verdict at 60 and 30 now. The QA box (frames 400 ms and more
  apart: every gap a break) is still never judged. The screen's own rate
  still steps on a fast screen alone, exactly as before.
- **The ladder** (`src/game/drawLanes.js`, `docs/LANES.md`): the same verdict
  moves the governor's rung, one rung of one axis a step. The axis comes
  from the late frames' split, out of the frame meter's samples
  (`perfTracker.js` hands them in by a setter, `useFrameSamples`: no import
  into the pacer, nothing new timed): the game's own work takes the work
  axis (the crowd, then the rate); the rest, or where the busy beat runs the
  time the page WAITED, the chip axis (the rate, the shine, the shadows, the
  water, the pixels).
- **Down and up as the pacer**: two bad verdicts, a step down; clean for
  `UP_WAIT_MS`, a try up (undoing the last step); a step down after a step
  up doubles the wait, to `UP_WAIT_MAX_MS`. On a fast screen the ladder
  steps down only once the screen's own rate is at its floor, and never on a
  verdict the rate stepped on (one step a verdict).
- **Pixels only behind a veil**: a step that would change the pixels waits
  for a loading screen (`judge` false) or a tab's return
  (`visibilitychange`); a clean verdict meanwhile drops a wanted step down,
  a bad one a wanted step up. A window covering the world is not a veil
  yet: no one field says so (the phase table's `window` row is todo).
- **A full memory** (its count is card O's PR 11) is a bad verdict whose
  step is the work axis's, never the chip's: it frees, never resizes.
- **Kept by lane** in `localStorage` (`bt_rung`, a convenience: every read
  and write in a `try`, the page right without it), loaded at a veil: the
  next sitting starts where the last settled and tries up as above.
- **Off in the test box**: `?lane=` holds the ladder still (the lane's row),
  unless `?govern=1`; `?govern=0` turns it off on one phone. The Speed test
  holds it while it runs (`holdLadder`): it turns the same knobs.
- **It moves no knob yet.** Each knob reads `laneKnob` in its own PR (card
  O's 4 to 13). Until then the rung shows on the strip (`ladder full  work
  1/3  chip 0/6`, and a `STEP down work: crowd` mark for each step in the
  last ten seconds), in the report's `rung` (to `caps.report` 3) and to QA
  (`__btPace().ladder`, `__btLane()`).
- **No new loop and no step of the frame**: it runs inside the loop's one
  `take(ts, judge)`; `BroTown.jsx` is unchanged. Its verdict comes once in
  80 frames and walks at most a verdict's samples. `read()` builds the
  ladder's part only when asked (a getter): the loop reads `read().every`
  every frame.

Held by `server/test/frame-pacer.test.mjs` §12 to §17: a node model of a
phone heating over minutes and cooling, at 30, 60 and 120 (two seeds
each), that settles, comes back to the lane's row, and does not see-saw
(the doubling taken out: 17 failed tries at 60 where 8 are allowed); a
pixel step only behind a veil; a full memory on the work axis alone; the
switches, the Speed test's hold and the kept rung; the door (`setRung`'s
one caller); and `tools/qa/mp/mp-governor.mjs` on the page.
