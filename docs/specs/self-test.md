# The self-test at the door (v2.3.5234)

Card O's PR 14 (grand plan step 1.7). The code: `src/rendering/selfTest.js`;
the programs' hooks in `src/rendering/paletteTex.js`; the checks:
`server/test/self-test.test.mjs` and `tools/qa/mp/mp-selftest.mjs`.

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
  `selfTest` (`preloadAnimations.js`) waits for every verdict.
- **The report** (`src/debug/report.js`) names each program that failed in
  `self`, once a sitting, to a worker that takes the lanes (the worker has
  known `self` since card O's PR 1).

## The switches

- `?selftest=fail:<name>[,<name>...]` (a lever, for QA): the named program
  fails its test (`forced`), to see its fallback drawn and the others
  untouched. Names: `one`, `palette`.
- `?selftest=0` (or `off`, `false`): no self-test (the off-ramp, and how its
  time is measured).

## The probe

`window.__btSelfTest()`: `{ results, failed, ms, draws }`. Each result is
`pass`, `fail` (with `off`, the pixels wrong), `forced`, `unread` (kept as
today) or `skipped` (with why: switched off, no WebGL 2, not built on this
device). A program not yet
tested has no row and is never in `self`.

## What it costs (measured 2026-11-15, `mp-selftest`)

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

## In 14b and 14c (to come)

- 14b (5236): the look palette (to the bake), the sharp pixels (to plain),
  the sheen batch (to its pass), the shadows' pre-pass (to the old pass), and
  water (to still: moved from 14a, as its shader is not a pure recolour of
  the picture and its answer needs working out).
- 14c (5237): the clip, the fill and the glint: tested and named in `self`;
  where a program has no way back, it is drawn as today and named.
