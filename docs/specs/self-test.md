# The self-test at the door (v2.3.5234, v2.3.5236, v2.3.5237, v2.3.5238, v2.3.5239)

Card O's PR 14 (grand plan step 1.7), in three parts: 14a (v2.3.5234) the
frame, the one program and the colour numbers; 14b (v2.3.5236) the look
program, the sharp read, the shine in the frame, the shadows' shade and the
moving water; 14c (v2.3.5237) the fill and the glint; 14d (v2.3.5238) the clip. The code:
`src/rendering/selfTest.js` (the frame, every picture and every answer);
each program's own file for where its picture is drawn and its one way
back. The checks: `server/test/self-test.test.mjs` and
`tools/qa/mp/mp-selftest.mjs`.

## Why

A drawing program can be built (linked) on a phone and still draw wrong
there. The one program lost a bro's legs on the owner's iPhone in four
facings with a bow carried (TRAPS §225, §260; `docs/specs/one-batch.md`),
and nothing on the page could tell: the cure was the owner trying
`?onebatch=0`. The self-test lets the page see it for itself, behind the
loading screen, and put that one program back to its way of today.

## What it does

- **A known picture.** 16 x 16, four colour numbers in a pattern where a
  flipped row, a flipped column or a swapped half each draws a different
  picture (`selfIdx`), and four opaque colours (`SELF_PAL`).
- **The answer is worked on the CPU** from the same numbers and palette
  (`selfRgba`). No art picture is ever read back.
- **Where each program is warmed today** (as the renderer is made, behind
  the loading screen), it also draws that picture into a 16 x 16 texture:
  - **the colour numbers** (the palette's program, `setPaletteRenderer`):
    a sprite of the picture's numbers, recoloured by its palette row;
  - **the one program** (`setOneBatchRenderer`): a plain picture, and, where
    the colour numbers are on, the numbers too: both through the one
    program.
  The picture is drawn first, before the warm-up's own full screen, so its
  copy does not wait behind it.
- **The read never holds the page.** As each picture is drawn it is copied
  into a WebGL 2 pixel buffer behind a fence, and the texture is destroyed
  at once (the memory law). The fence is asked at the top of each later
  frame (`framePacer.js beforeDraw`; 500 ms on with no frame), without
  waiting; once it has passed, the 1 KB is taken and compared.
  - Why not Pixi's extract: a read straight after the draw waits for
    everything the chip has queued, 114 to 198 ms on the QA box's software
    renderer, and 2.7 s at the top of a loading frame there.
  - **Nothing read back is not a failure.** A picture that could not be made,
    or whose copy never finished (120 tries), is `unread`: the program is
    kept as today and never named in `self`. A read that fails says nothing
    of the program, and the colour numbers' way back, whole colours, costs
    an iPhone's memory (the memory law). Only a picture read and wrong falls
    a program back.
- **Pixels are compared, never a time.** A channel may round by 2.
- **One that fails falls back alone**, to its way of today, and the load
  goes on:
  - the one program: the three programs, every draw list rebuilt at once
    (`setOneBatchLive(false)`);
  - the colour numbers: whole colours (`setWheelPalette(false)`), the
    Wheel's ground worker told.
  Until its verdict a program is used as it was. The loading screen's group
  `selfTest` (`preloadAnimations.js`) waits for every verdict queued by
  then (the colour numbers, the one program, the shadows' shade); the look's
  comes once its sheets are in, the shine's at the end of the loading
  screen's chain and the water's behind the Wheel's own loading screen,
  each within a few frames.
- **The report** (`src/debug/report.js`) names each program that failed in
  `self`, once a sitting, to a worker that takes the lanes (the worker has
  known `self` since card O's PR 1).

## The switches

- `?selftest=fail:<name>[,<name>...]` (a lever, for QA): the named program
  fails its test (`forced`), to see its fallback drawn and the others
  untouched. Names: `one`, `palette`, `look`, `sharp`, `sheen`, `shadow`,
  `water`.
- `?selftest=0` (or `off`, `false`): no self-test (the off-ramp, and how its
  time is measured).

## The probe

`window.__btSelfTest()`: `{ results, failed, ms, draws }`. Each result is
`pass`, `fail` (with `off`, the pixels wrong), `forced`, `unread` (kept as
today) or `skipped` (with why: switched off, no WebGL 2, not built on this
device, drawn by another program here). A program not yet tested has no
row and is never in `self`.

## What it costs: 14a (measured 2026-11-15, `mp-selftest`)

Pages 4 (`?selftest=0`) and 5 (as it ships) are compared: both load after the
same programs were built once in that browser (this box's software renderer
keeps a built program for the next page, so the first page, built cold,
would charge the self-test for the cold build).

| | unthrottled | `BT_QA_CPU_THROTTLE=4` |
|---|--:|--:|
| the tests' own clock (draws, copies, every poll) | 13.6 ms | 50.5 ms |
| the one program: drawn, then read (polls) | 2.8 + 1.0 ms (6) | 13.3 + 4.2 ms (20) |
| the colour numbers: drawn, then read (polls) | 9.6 + 0.2 ms (6) | 32.4 + 0.6 ms (20) |
| the two warm-ups whole (colour numbers + one), with | 37.0 + 3.8 ms | 70.2 + 17.5 ms |
| the same, without | 29.2 + 2.6 ms | 68.8 + 18.6 ms |
| the loading screen, with / without | 22.9 / 24.7 s | 50.5 / 51.0 s |

- **What it adds**: about 9 ms unthrottled and nothing to measure at
  throttle 4 (70.2 + 17.5 against 68.8 + 18.6). The colour numbers' picture
  takes that program's first draw, which its warm-up's full screen paid
  before; the warm-up's own draw is then quicker by as much.
- **The reads** are at the top of frames, the fence asked without waiting:
  all the polls of a program together 4.2 ms at most, so none comes near
  the held-page line (12 ms).
- The loading screen's runs differ by a second or two from run to run;
  either way it is no longer with the self-test.

## 14b: five more programs (v2.3.5236)

Each is tested where it is warmed, at inputs where every term the CPU cannot
follow to the bit is multiplied away (so its answer is exact), and falls
back alone to the way it is drawn when its switch is off.

| program | where its picture is drawn | the picture, and its answer | its way back |
|---|---|---|---|
| **look** (`lookPalette.js`) | `prewarmProgram`, once its sheets are in | a sheet of its own: 16 x 16 numbers at 8 bits, a table of four colours, two of them a role recoloured by a row of the colours' atlas (`recol`); and, where the shine reaches it, the same sheet with the shine | every look baked (`_ok` false: as a computer, or the Test panel's switch) |
| **sharp** (`sharpPixels.js`) | where the three programs draw (`setOneBatchRenderer`: not chosen, or not built) | an 8 x 8 picture drawn 2x: the sharp read gives every pixel a texel's own colour; the plain read blends a quarter of the neighbour in | the plain read (as `?sharp=0`), every draw list rebuilt |
| ...the one program's sharp read | in the one program's test, where it draws (phones, tablets) | the same picture, through the one program (`_btSharp`) | the one program's: the three programs |
| **sheen** (`sheenBatch.js`) | `warmSheenBatch`, at the end of the loading screen's chain | four colours as a shining piece, the sun's side 0, no figure frame, a white tint: the lift is a function of each pixel's colour | every shine in a pass of its own (as `?sheenpass`) |
| **shadow** (`shadows.js`) | as a shadow system is made with its renderer (once a renderer) | a pieces' picture of four alphas, read by the shade at a soft step of one texel, no slide: the five reads blended | the filter in the middle of the frame (as `?shadowpass`), every system moved over |
| **water** (`wheelWater.js`) | `prewarmWheelWater`, behind the Wheel's loading screen (and its colour-numbers twin) | a piece under a field at strength 0: the piece read at the texel's middle times the field's wetness | still water (as `?nowaves`, the live switch, the lanes' last rung), the ground worker told |

- **Each way back is its own flag**, never the Speed test's switch
  (`setSheenPass`, `setShadowPrepass`), which its next step would put back.
- **The sharp read takes the shine with it.** The sheen batcher reads its
  pieces with the sharp read and draws only what the sharp batcher would
  (`sheenBatch.js`), so a sharp read found wrong puts every shine in its own
  pass too (`sheenBatchOn` asks `sharpSelfOff`), and the shine is then not
  tested (`skipped`, saying why).
- **The look's choices wait for its verdict.** `lookSheenState` says "not
  known" while the look's pictures wait (`selfPending`), so the armour's
  choice (`whenLookKnown`) never builds on numbers that are taken away a few
  frames on (TRAPS §340).
- **The shine is allowed 4 a channel**, not 2: a phone works its exp and
  smoothstep at half precision. Its four colours sit where the lift is still
  steep (near the ceiling it saturates): the highlight's start, its end and
  the ceiling each move a colour past the allowance. The sun-side weight
  cannot show with the sun at 0.
- **The shadows' shade is built behind the loading screen now.** Until 14b
  its program was built on the first frame with a shadow, in play; its
  picture builds it as the renderer is made (the most the self-test costs
  there: below).
- **Each CPU copy is held to its program's own text** (`self-test.test.mjs`
  §5: the shine's lines, the shade's five reads, the water's wetness, the
  look's recolour). A shader's number changed without its copy would make
  every phone fail its test and quietly fall that program back: the suite
  fails first.
- **Tried on the real GPU path** (a scratch scenario, each program broken in
  the built page): the sharp read made plain fails `one` (252 of 256 px),
  and `sharp` with `onebatch=0`; the shade's 0.36 made 0.30 fails `shadow`
  (192); the look's 0.299 made 0.399 fails `look` (128); the water's
  smoothstep(0.3 to 0.2) fails `water` (128); the shine's highlight start
  0.55 made 0.50 fails `sheen` and `look` (64 each: the look's shine
  picture runs the same lines). Every other program passed each time.

### What 14b costs (measured 2026-11-15, `mp-selftest`, pages 4 and 5)

| | unthrottled | `BT_QA_CPU_THROTTLE=4` |
|---|--:|--:|
| the tests' own clock, every program (draws, copies, polls) | 51.8 ms | 164.4 ms |
| the shade: drawn (its program's first build), read | 31.9 + 0.7 ms | 38.0 + 2.8 ms |
| the look: drawn (two pictures), read | 2.4 + 0.5 ms | 40.9 + 4.0 ms |
| the one program, now with the sharp picture: drawn, read | 3.7 + 0.9 ms | 26.9 + 2.7 ms |
| the shine (end of the loading screen's chain): drawn, read | 1.1 + 0.3 ms | 6.1 + 2.1 ms |
| the water (the Wheel's loading screen): drawn, read | 1.7 + 0.5 ms | 6.5 + 1.8 ms |
| the two warm-ups whole (colour numbers + one), with / without | 32.0 + 4.8 / 30.3 + 3.9 ms | 82.4 + 31.0 / 72.1 + 12.4 ms |
| the loading screen, with / without | 26.3 / 24.1 s | 55.9 / 62.0 s |

- **Added behind the loading screens on a slowed page**: about 120 ms of the
  page's work, the biggest single piece the look's 41 ms; 38 of it is the
  shade's program built, which play paid on its first shadow before. The
  loading screen's own length varies by more than that from run to run.
- **In play**: only the shine's verdict, read at the top of the first frames
  (2.1 ms over 2 polls at throttle 4), and the water's, if its warm-up was
  not reached behind the Wheel's loading screen (6.5 ms): both under the
  held-page line (12 ms).

## 14c: the fill and the glint (v2.3.5237)

Neither has a way back (the card's program list, `back: null`): a wrong
picture is **named** in the report's `self` and the program is drawn as
today. (v2.3.5239: each now falls back alone; part 15 below.)

| program | where its picture is drawn | the picture, and its answer |
|---|---|---|
| **fill** (`fillBatch.js`) | once it is built (`fillSelfTest`), behind the loading screen | the known picture as a monster in the whirlwind's amber: each pixel's brightness lifted to a grey (0.5 + 0.8 x luma, at most 1), its alpha kept, then tinted (`selfFillWant`) |
| **glint** (`lightfx/glint.js`) | once a renderer, where its filter is warmed (`glintSelfTest`) | the shine's four colours, its sweep's strength 0, the sun's side 0, no figure frame, a white tint, drawn twice: the shine alone (the sheen batcher's SHEEN_LIFT, to the byte) and with a rare piece's blue grade (its highlights lit in the grade's colour); allowed 4 a channel, as the shine (`glintCpu`) |

- **The fill's grey is the picture's luma**, so a picture's colours read
  wrong would still show through the tint.
- **The glint with no grade is the sheen batcher's shine**: one CPU copy
  (`sheenLiftCpu` is `glintCpu` with no grade), held to both programs'
  text (`self-test.test.mjs` §8).
- `?selftest=fail:fill` and `fail:glint`: `mp-selftest` pages 11 and 12;
  each is named in `self`, still on, the others passed and on.

### What 14c costs (measured 2026-11-16, `mp-selftest`, unthrottled)

| | drawn | read |
|---|--:|--:|
| the fill (one picture) | 1.2 ms | 0.5 ms |
| the glint (two pictures) | 2.0 ms | 0.3 ms |

About 4 ms more behind the loading screen; every program's tests together
76.8 ms on that run (the shade's first build 50 of it, as in 14b).

## 14d: the clip (v2.3.5238)

`hairClip.js`'s two programs draw the stencil's shapes: the hat's and the
hood's (`batch-clip`, a white silhouette: kept where alpha x red is at
least half) and the monsters' behind a thing (`batch-clip-alpha`, the
thing's own colours: kept where alpha is at least half). Once installed
(`installHairClip`, after the app is made), each draws the clip's picture
(`selfClipRgba`: four premultiplied colours, none within a tenth of either
line) **as a picture**, not into the stencil, so what it keeps is seen: its
sprite marked as that program's shape answers its own batcher. The answer
(`selfClipWant`): the picture where kept, nothing elsewhere. A program that
discarded nothing, or everything, or the wrong colours, draws another
picture.

- **No way back in the card's list** (`back: null`): a wrong picture is
  named in `self` and the clip drawn as today. `?alphaclip` (the alpha
  mask, as it was) could be one; that is asked in card O's status, Needs.
- Not tested where it is not installed (no WebGL2, or `?alphaclip`):
  `skipped`, saying why.
- `?selftest=fail:clip`: `mp-selftest` page 13.

### What 14d costs (measured 2026-11-17, `mp-selftest`, unthrottled)

The clip: drawn 26.7 ms (both programs' first build: until now they were
built on the first hat or silhouette in play), read 0.2 ms. Every program's
tests together 77.8 ms on that run.

## 15: the fill and the glint fall back alone (v2.3.5239)

Decided by the planning session for the owner (their standing "go
recommended"): a program that draws its picture wrong falls back alone, as
the sprite programs do (CLAUDE.md §7), so 14c's "named, drawn as today" is
now for the clip only.

| program | its way back |
|---|---|
| **fill** | as `?fill=0`: no one-colour glow (`fillBatchOn` false; `_whirlGlow` hides a glow already made); the whirlwind's rings still mark the catch |
| **glint** | no piece filtered (`_selfOff`, in `update`): a pinned sweep, a grade's look and a shine not drawn in the frame are drawn plain; the shine in the frame (`sheenBatch.js`, its own test) is kept |

- Each is its own flag, never the Speed test's or the lanes' switch.
- `mp-selftest` pages 11 and 12: each forced fail is off, the others on.
