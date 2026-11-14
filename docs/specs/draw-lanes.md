# The lanes and the ladder (v2.3.5221)

`src/game/drawLanes.js`; the page made from it `docs/LANES.md`; held by
`tools/guards/draw-lanes.test.mjs`, `server/test/report.test.mjs` §13 and
`server/test/mirror-audit.test.mjs` ("lanes:"). The grand plan's step 2.1,
card O (`docs/plan/cards/O.md`), PR 1.

## Why

How much a device draws was decided in a dozen places, each by its own rule:
the pacer's floor (`framePacer.js`), the pixel budget (`renderRes.js`), the
crowd cap (`crowdCap.js`), one program or three (`paletteTex.js`), how a look
is made (`lookPaletteChoice.js`), the shine, the shadows and the water, the
strip queue's slice (`zoneTextures.js`), the cache caps, the step's cap
(`frameClock.js`). Nothing said which of them a device was drawing with, so a
report could not name it, a test could not choose it, and a hot phone could
not be stepped down by one controller. The plan (pillar 2): **one ladder, one
controller**.

## The words

- A **knob** is one thing a device may draw more or less of. Each has
  **steps**: step 0 the best, each further one a step down, each in a
  player's words.
- A **lane** is a ROW: a value for every knob. Three:
  - `full`: what every device draws today (2026-11-14), exactly;
  - `light`: `full` a few rungs down (the ladder's first rung of the work
    axis and first two of the chip's: 30 players drawn, a steady 30 a second
    on a 60 screen, no shine on metal). The tests' and the slow profiles'
    lane (step 1.5). **No device picks it by itself**: only `?lane=light`.
  - `thirty`: a screen of 30 a second (an iPhone in Low Power Mode). Its row
    is `full`'s until card O's PR 13 gives it its step's cap. A word, never
    the number, so no page sends `30` where a name is checked.
- The **ladder** is the rungs below a lane's row, on two **axes**: the game's
  own work (the crowd, then the rate) and waiting for the chip (the rate,
  then the shine, the shadows, the water, then the pixels). A rung lowers ONE
  knob ONE step. The rate's rung is on both axes: whichever takes it first
  lowers the rate. A steady lower rate comes before a softer picture (the
  owner's call 16); the order is data, not code.
- An **override** pins a knob, over the lane and the ladder (an off-ramp, or
  a fallback for a known bug). None yet: PR 8 moves the fallbacks into the
  table, PR 12 the off-ramps.
- The **rung** (PR 2) is where the governor stands on the ladder: rungs taken
  on each axis. Until PR 2 it is always the row.

## The reader

`laneKnob(name)` is the ONE way a knob's value is read: the override that
pins it, else this page's lane's row at the rung. A knob that must be told
when its value changes (a resolution, a pass) subscribes: `onKnob(name, fn)`.
Until each knob's PR moves it (`moved: true` in its row), its file reads its
own value, which is `full`'s; the guard counts the knobs not yet moved (a
census: the line only falls).

## The lane: facts, never a name

`pickLane(cls)` takes the device class (`docs/SHAPES.md` part 6,
`deviceProfile.js devClass()`) and gives `thirty` where the screen's rate is
30, else `full`. Never a system's, browser's, chip's or model's name: a name
stays only as a fallback for a known bug, asked in `deviceProfile.js` alone.

`drawLane()` is this page's lane: `?lane=<name>` (a lever, the switch table's
`?lane`), else the lane its class picks. `drawLanes.js` has no imports (node
tests it, and the pacer may import it as a leaf in PR 2), so the class is
handed in: `deviceProfile.js` calls `useDevClass(devClass)` once, and the lane
asks it again at most every 5 s. While the page has no drawing context (the
class is null), the lane is `full`. The report hands `drawLane(cls)` the class
it is sending, so a report's class and lane are one reading.

A finer pick (`light` by facts) waits for the device table (step 1.3): two
devices of one class that run differently, each with 20 reports or more.

**Nothing timed decides a lane**: the class's `fill` stays `none` (a timed
fill behind the loading screen holds the page and lengthens a loading screen
that has no line yet).

## Never combat, never loading

The owner's call 3: the ladder may step down by itself on a hot or full
phone, never combat. No knob changes a swing's clock, a cooldown, a wind-up,
a hit window, the dash's step, the bow's sight, the tick or what the worker
reads from moves; no knob moves a load off the loading screen. Held in data:
the guard fails a knob read in card B's `combat` or `preload` system.

## The game's own drawing programs

The report's `self` (step 1.7, PR 14) names a program that failed its
self-test at the door. The closed list, read from the code (the guard holds
each name's programs to its file; Pixi's own are not the game's):

| Name | File | Its way back (PR 14) |
|---|---|---|
| `one` | `paletteTex.js` (`bt-one-batch`) | the three programs |
| `palette` | `paletteTex.js` (the colour numbers' four) | whole colours |
| `look` | `lookPalette.js` | each look baked |
| `sharp` | `sharpPixels.js` | plain pixels |
| `clip` | `hairClip.js` | none: drawn as today, named in the report |
| `fill` | `fillBatch.js` | none |
| `water` | `wheelWater.js` | still water |
| `glint` | `lightfx/glint.js` | none |
| `sheen` | `lightfx/sheenBatch.js` | its pass |
| `shadow` | `lightfx/shadows.js` | the old pass |

`paletteTex.js` builds two of the game's programs that fail apart (the one
program and the colour numbers), so it has two names; every other file one.

## The report

The worker (`server/src/report.js`) learns all of card O's lists in this PR,
so it deploys once for the card:

- `drawLane`: `full`, `light`, `thirty` (`DRAW_LANES`), each its own cell;
- `rung` (sent from PR 2): two whole numbers, the most rungs taken at once
  and the seconds below the lane's row; summed beside the cell, never in it;
- `self` (sent from PR 14): names from `SELF_PROGRAMS`.

`caps.report` 3 takes them (a cap that grows gates by its count, TRAPS §9).
The page sends a lane but `full` only to 3; to an older worker `full`, which
in this PR is true of every page (every lane draws `full`'s values). The kill
switch `reportlanes: false` takes the cap back to 2: a lane but `full` is
dropped (no cell), `rung` and `self` dropped from a report that still comes.
`reportspeed: false` (cap 1) takes no lane either.

## Who reads it

| Reader | What |
|---|---|
| `src/debug/report.js` | `drawLane(cls)` for the report, to `caps.report` 3 |
| `src/game/speedTest.js` | the Speed card's device line names the lane |
| `window.__btLane()` | QA: the lane, whether the address chose it, every knob's value |
| `tools/guards/draw-lanes.test.mjs` | the table's guard; `--write` makes `docs/LANES.md` |
| card O's PRs 2 to 14 | the governor, each knob, every phone test's lane, the self-test |

## Not here

The device table and its reader (1.3); the slow profiles (1.5); the look
palette on computers (2.2b); the prewarm ring (3.3: a column with one value
and no reader until then); a lane picked by facts beyond `thirty`.
