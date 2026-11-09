# The world's ground on a slow line and a busy computer (v2.3.4355)

> The owner, of the expo of 2026-11-05, where the judges played on computers
> while live-streaming: "The game was not smooth, and patches of texture like
> a checker pattern showed all round the outer ring of the view, away from my
> character."
>
> And of the same day (`docs/OWNER-LIST-2026-10-26.md` §9): "On a computer the
> map loads in pieces (many squares not drawn); phones are fine."

## What was wrong

It was not the computer's size and not its graphics chip. It was a computer
that **had never opened the game**, on **the venue's one line**, with **its
processor busy** with a stream. A returning phone reads every ground picture
from its own cache (`public/_headers` keeps `/world/ground/*` a year); a first
visit downloads each one, 0.35 MB on average, the moment a piece of ground
first needs it. All three faults below were reproduced on the test box before
anything was changed.

| # | The fault | How a player saw it | Reproduced with |
|---|---|---|---|
| 1 | A piece of ground laid before one of its pictures had come drew the Ground Studio's "not made yet" **chequer** for it | squares of checker pattern, mostly at the edge of the view, where ground is newest | the ground's pictures at 150 KB a second: all 70 pieces of the arrival laid short, the screen lifted on a chequered town, whole 12.5 s later |
| 2 | A download was given **15 s from start to last byte**, four at a time, then cut and begun again from its first byte | the checker lasting a minute or more | at 60 KB a second: 14 downloads cut, the town whole only after 85 s |
| 3 | The zone gate (the loading screen over a way in) was raced against a **flat 15 s**, and its pieces were asked for row by row from the top | the loading screen lifting on ground not laid: squares of the flat overview, on the outer ring | the page's processor slowed x4 (`BT_QA_CPU_THROTTLE=4`) at 1920 x 1080: the way in took 17.8 s, the gate let go at 15.2 s with 14 of 50 pieces missing, 11 of them on the outer ring |

A fourth weakness made 1 worse: the pictures round you were asked for only
two pieces out (384 game px past the piece being laid: 2.5 s of walking).

## What changed

**The ground worker** (`public/tools/world/core/ground-worker.js`, "A SLOW
LINE"):

- **No chequer for a late picture.** A swatch whose picture is made and has
  not come (or that this browser could not unpack) is laid in its plan colour,
  plain (`composeGround`'s `opts.late`). The land's shapes are right; only its
  texture is still to come, and the piece is laid again when it does, as
  before. A swatch nobody has made keeps the chequer: that is the Ground
  Studio's mark, and the owner's own unmade swatches still show.
- **A download is cut for stalling, not for being slow**: `DL_STALL_MS` (15 s)
  with no byte, `DL_MAX_MS` (3 minutes) in all. It is read a part at a time,
  and each part pushes the cut back.
- **The pictures further out, while nothing is asked** (`farPrefetch`): every
  picture within `FAR_REACH` (1,536 game px) of where you stand, asked for
  quietly while the worker is idle, again each `FAR_STEP` (384) you move.
  About 16 s of walking ahead, 8 on the board. At the town square that is 10
  pictures against the first screen's 8; on the way out of town about 16 more.
- **The line belongs to the waiting piece.** A quiet download never starts
  beside one a piece is waiting for, and at most `DL_QUIET` (2) run at once.
- **The way in's pieces share one wait** for their pictures: `GATE_WAIT_MS`
  (7 s) from the first of them that had to wait, where each new picture used
  to cost its own 4 s in turn. Past it they are laid with what has come.

**The zone gate** (`src/game/zoneGate.js`, read by `zoneTransitions.js` and
`wheelTrial.js`):

- **`gateCap(progress)`**: the world's way in is given longer while it is
  still arriving. Past 15 s the gate keeps waiting while a piece of ground or
  a sheet of objects keeps coming (`worldTrial.js wheelEntryProgress`), lets go
  once nothing has come for `GATE_QUIET_MS` (8 s), and never waits past
  `GATE_CAP_MAX_MS` (24 s). A load that hung still frees the player at 15 s.
  Every other zone keeps the flat 15 s.
- **`fillOrder`**: the gate's pieces are asked for nearest the arrival first.
  Whatever cuts the wait short, what is missing is the far edge for a moment,
  never the ground you stand on.
- The stuck-gate failsafe's age went from 20 s to `GATE_STALE_MS` (30 s), to
  stay above the gate's longest wait. The trip's veil (`wheelHome.js
  TRIP_VEIL_MS`, 30 s) is untouched and still above it (`zone-gate` §5).

Nothing is kept in memory that was not: pictures fetched ahead are held like
the others (`FILES_KEEP`, 8) and otherwise by the browser's own cache.

## The numbers (the test box, 1920 x 1080, `lookpalette=0`)

| | Before | After |
|---|---|---|
| Thin line, 150 KB a second: pieces chequered at the lift | 50 of 50 | 0 (38 plain, mending) |
| ...the town whole | 12.5 s after the lift | 13.8 s (the line's own limit: 2.4 MB) |
| ...pieces laid short on the walk out of town | 25 | 0 |
| Thin line, 60 KB a second: downloads cut and restarted | 14 | 0 |
| ...the town whole | 85 s | 40 s |
| Page slowed x4: pieces missing at the lift | 14 of 50 (11 on the outer ring) | 0 |
| ...the gate held | 15.2 s | 17.6 s |
| Quiet box: missing at the lift, late on a walk | 0, 0 | 0, 0 |

## What it does not do

- On a line too slow for the first screen's 2.4 MB in 7 s, the town still
  starts in plain colours for a few seconds and sharpens as its pictures
  come. Waiting longer behind the loading screen would fix that for a first
  visit and is the owner's call.
- A processor so busy that the way in takes more than 24 s still lifts on
  ground being laid (now nearest first, so the far edge).
- Nothing here measures a real graphics chip. See "Measuring" below.

## Measuring

- **`node tools/qa/mp/run.mjs desksmooth`** (about 5 minutes; the full run,
  `BT_DS_FULL=1`, adds the throttle at the other two sizes and a 60 KB line):
  a short laptop (1366 x 657), 1920 x 1080 and a large monitor (2560 x 1440),
  each `wide: true` and `lookpalette=0`:
  - at the loading screen's lift every piece in view laid, none short;
  - a walk across the town: no piece or object late on screen;
  - the game's work a frame (`perfTracker` `workMs`) under its line;
  - 1920 x 1080 with the page slowed x4: the same, the gate holding;
  - 1920 x 1080 on a thin line: no download cut, the town whole in 30 s, the
    walk's pictures fetched ahead.

  Measured, work a frame in ms on this box (middle frame / 19 in 20):

  | Window | The view, game px | Standing | Walking |
  |---|---|---|---|
  | 1366 x 657 | 1553 x 728 | 4.0 / 8.2 | 4.7 / 7.9 |
  | 1920 x 1080 | 1564 x 723 | 4.2 / 6.3 | 6.0 / 12.6 |
  | 2560 x 1440 | 1546 x 731 | 5.0 / 8.3 | 5.8 / 11.8 |
  | 1920 x 1080, page slowed x4 | 1564 x 723 | 20.9 / 31.1 | 26.4 / 41.7 |

  Every computer sees the same area of world (`docs/specs/view-cap.md`), so
  the three do the same work and share one line: 9 ms standing, 12 walking
  (x4 slowed), about twice what was measured.
- **A thin line for any scenario**: `BT_QA_SLOW=/world/ground/:150:200` (a
  path prefix, KB a second, ms before the first byte) sends those files down
  one shared line; `H.slowLine(spec)` switches it for one part of a scenario.
  The test page server also sends the ground's pictures with the real host's
  keep-for-a-year header now, so a picture let go is read back from the
  browser's cache as on a phone, not downloaded again.
- **`window.__btGroundCover()`**: the pieces the view touches, how many are
  laid, missing (and on the outer ring), short of a picture.
- **On a real computer**: the Test panel's Speed test (its card says where
  the frame goes on that graphics chip). This box draws in software, a few
  frames a second, so no frame rate here means anything (TRAPS §200).

## Tests

- `server/test/ground-late.test.mjs`: the chequer only for a swatch nobody
  made; the worker's download rules.
- `server/test/zone-gate.test.mjs`: the gate's wait (hung, slow, never-ending)
  and the fill's order; the clocks outside the gate stay longer than it.
- `tools/qa/mp/mp-desksmooth.mjs`: above.
