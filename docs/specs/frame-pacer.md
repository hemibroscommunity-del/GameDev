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
  water), then the pixels' own axis (v2.3.5225: last down and last up, a
  chip-bound phone's only; `docs/specs/pixel-budget.md`).
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

## The rate is a knob (v2.3.5224, card O PR 4)

The ladder's first knob that moves anything: the rate (`docs/LANES.md`,
`rate`). On a screen of 60 a second or slower the pacer reads it through
the lanes' one reader, `laneKnob('rate')`: the slowest frame it holds a
steady rate at. The lane's row is 26 ms, `PACE_FLOOR_MS`: every refresh, as
ever. The rung is 34 ms: on a 60 screen a whole number of refreshes, every
second one, **a steady 30**; on a 30 screen still every one (no rung). It is
the chip axis's first rung and the work axis's last: a steady lower rate
before a softer picture (the owner's call 16).

**A fast screen (90, 120, 144) is unchanged: its own steps stop at about 40
a second, whatever the lane or the rung.** That is the planning session's
reading (a) of the card, 2026-11-14; a rate rung below 40 on a fast screen
would be a decision of its own, not an accident of this one.

The pacer's own steps are a fast screen's alone now; on any other screen
the rate is the knob's. `?ladderrate=0` is the rate as before, whatever the
rung (a switch that needs `?govern`). Held by `frame-pacer.test` §18: a 60
screen too hot for 60 takes the rate's rung first and comes back to 60 once
cool with no see-saw (two seeds); at the rung, nine frames in ten are the
same 33 ms; a 120 screen too hot for 40 is never paced below 40;
`?ladderrate=0`; the read through `laneKnob`.

### Only the rungs something reads (v2.3.5224, the gatekeeper's sitting 11)

The governor first counted every knob in the table, read or not. So it
stepped through rungs nothing read (the crowd, the passes, the pixels),
kept them in `bt_rung`, and climbed back one 20-second try a rung, the rate
last. After a hot sitting, a cool 60 phone started the next one at 30 and
stayed there for minutes; where a pixel rung waited for a veil, for the
whole sitting. Now:

- **It walks only the LIVE knobs** (`drawLanes.js` `liveKnobs()`: the
  knobs whose row marks them moved, read through `laneKnob`). A rung that
  changes no live knob is passed, down and up, and `rungDepth` (the strip,
  the report's `rung`) counts only rungs that change one. A step's rung is
  trimmed to what it changes.
- **A kept rung carries its live set** (`bt_rung`: `[work, chip, 'rate']`).
  A rung kept under another set (the first version's, with none; a knob
  moved since) is not loaded: the sitting starts at the lane's row.
- **A try up that moves the pixels waits for its veil, and the other axis
  may try meanwhile** (before, the wait stopped every try).
- Today a cool phone after a hot sitting is back at 60 in ONE try, about
  20 seconds in.
- **A kept rung loads WITHOUT its pixel rungs** (v2.3.5225, card O PR 5; the
  planning session's (A), 2026-11-14): the rate and the passes are kept, and
  if the phone is still hot the pixels are taken again at the next veil.
  This departs from the card's "the next sitting starts there", for the
  pixels only: a pixel rung moves only behind a veil, both ways, so a kept
  one would hold a cool phone on a softer picture (and 30) until its next
  loading screen or tab's return. In the Wheel that can be a whole sitting,
  for the last sitting's heat. Held by §19g (and §19c).
- **(A) revised: a kept rung keeps the rate only** (v2.3.5229, card O PR 9;
  the planning session, 2026-11-14). The passes (the shine, the shadows,
  still water) are the chip axis's rungs after the rate, and an axis comes
  back last-taken first: a kept chip 4 gave back three passes, one 20 s try
  each, before its rate, so a cool 60 phone played at 30 for about 85 s
  after a hot sitting (sitting 11's hold, live rungs this time). Now a kept
  rung loads the chip axis through the rate's rung only (`CHIP_KEPT`, from
  the table); its passes start drawn, as its pixels do, and a phone still
  hot takes them again within the sitting (about 2 s a step down). Held by
  §19g and §19c, as written.

## The passes (v2.3.5229, card O PR 9)

The chip axis is the rate, then the metal's shine, then the shadows, then
still water (`drawLanes.js` AXES, `docs/LANES.md`). Each pass is read
through `laneKnob` in its own file and told when it moves (`onKnob`), so a
frame reads a boolean: `glint.js` `shineKnobOn` (`sheenLive`),
`lightFx.js` `shadowsKnobOn` (`lightFxLive`), `wheelWater.js`
`waterKnobStill`. The device's own switch (`?sheen`, `?lightfx`, the
water's live switch; the Speed test's steps) still wins: a pass is drawn
when both say so, and the Speed test reads and puts back the switch, never
the knob.

What a player sees, a step at a time, on a phone whose frames wait on the
graphics chip and are still late at 30:

| Rung (chip axis) | What changes on screen |
|---|---|
| 1, the rate | 30 frames a second (as before this PR) |
| 2, the shine | metal armour and weapons stop catching the light; a grade's own colour stays |
| 3, the shadows | no shadows under players, monsters, trees or buildings |
| 4, still water | the sea stops moving: no swell, river flow, rings, whitecaps or moving web of light; it is drawn as its calm ground pictures (as the Speed test's "Still water" step draws it) |

Then the pixels (their own axis, at a veil). Each change is ONE structural
change when the rung moves (the shine's pieces released once; the shadows
cleared once; the sea's layer hidden and the ground under open sea shown
once), never one a frame (TRAPS §218). Nothing loads when a pass comes
back (the sea's quads stay laid; the shine's programs are warmed behind the
loading screen by the device's switch). `?ladderpass=0` takes the three
off the ladder for one screen. Held by `ladder-passes.test` and
`frame-pacer.test` §21.

Held by `frame-pacer.test` §19, with its break proofs. §13 to §16 play the
whole ladder live (`_liveKnobs`), as card O's later PRs will make it.

A fight is not a reason to hold a step: the card's call 3 reads "a step
may come in a fight (a hot phone needs it then): it changes no timing, and
pixels still wait for a veil". The rate's rung changes how often a frame is
DRAWN, never a swing's clock, a cooldown or the tick (`draw-lanes` guard: no
knob read in `combat`).

## The owner's switch (v2.3.5235)

`govern` is a row of the Test panel's list (`src/game/clientOff.js`, the
"Memory savers" block): the owner turns the governor off **for every
phone, live, with no deploy**. The worker keeps `off_govern: true` and
tells every phone at join (`caps.clientoff`) and at once when it changes
(`client_off`); nothing on the worker reads the name. It is one name on
both sides: `?govern=0` is the same switch for one tab.

This is the planning session's word (2026-11-14) in place of the card's
cap `ladder`: the same lever every memory saver already has, live where a
cap is read only at a join, and no change to the worker.

Off, the ladder goes back to the lane's row at the next verdict and takes
no step, however late the frames. A pixel rung (and with it the rest of
its axis) waits for the next veil, as every pixel step does. The row is
kept for the next sitting. Switched on again, it steps as before. The
strip says `switched off`; `__btPace().ladder.off` tells QA. Held by
`frame-pacer.test` §20, its break proofs in the suite's header.
