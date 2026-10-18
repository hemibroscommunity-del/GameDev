# One drawing program for every sprite (v2.3.3447)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*. The second round, after draw-lists.md.

## What was wrong

Three *batchers* drew the world's sprites, each with its own program on the
graphics chip:

| batcher | draws | its read of a picture |
|---|---|---|
| `default` (Pixi's) | almost everything: monsters, effects, text, shapes | one smooth read |
| `sharp` (sharpPixels.js, v2.3.2770) | the characters' body, clothes and gear | "sharp bilinear": flat texels, a one-pixel blend at each seam |
| `bt-palette` (paletteTex.js, v2.3.3190) | the Wheel's ground and objects | four colour numbers, their colours looked up and blended |

A batch is drawn in one go, by one program. It ends wherever the next sprite in
depth order belongs to another batcher, and depth order interleaves them all
the time: a tree, a monster, a tree, the player, a fence. `mp-phoneframe`'s
census of a fight's frame: **68 batches, and the program switched 51 times**.
Each switch is a new draw call with the program, its vertex arrays and its
textures bound again: the per-draw work a phone's graphics driver (and on an
iPhone, Safari's GPU process translating WebGL to Metal) spends the most on.

## What changes

`ONE_BATCHER` (paletteTex.js) draws all three kinds. Its program has the three
reads in it, one branch each, chosen by a code in each vertex's texture id:
`slot + 64 x code`, where the code is 0 for Pixi's plain read, 1 for the sharp
read, and 2 + row for the colour numbers (with their colours' row in the
atlas). Each branch is the very lines of the program it replaces. The sharp
read is one shared text (sharpPixels.js `SHARP_SAMPLE_GLSL`), so they cannot
drift apart.

- The colours' atlas stays bound in the last texture unit. A batch binds only
  its own pictures (the batch adaptor's `execute`), not the empty picture into
  every slot it leaves free, as the colour-numbers batcher did.
- Routing is where it was: sharpPixels.js decides "sharp" or not, paletteTex.js
  decides colour numbers, and then everything of the three goes to the one.
- Built behind the loading screen (`setOneBatchRenderer`, after the palette's
  own build). If it does not link on a device, the three programs are used, as
  before.
- Not where the picture is drawn in software (below): there the three programs.
- `?onebatch=0` in the address is the three programs, to compare, and
  `?onebatch=1` the one program, even in software.

## The same picture

Each branch computes exactly what its old program did. On this box's software
GPU, which works every number at the same precision, the same held frame drawn
both ways is identical to the pixel (`mp-onebatch`).

On a phone, one thing can differ by a hair. Pixi's own program and the sharp
one read pictures through *low-precision* samplers (GLSL's default), while the
colour numbers need *high* precision to read their numbers exactly, and one
program has one set of samplers. So plain and sharp pictures are now read at
high precision. On a graphics chip that keeps low and high precision apart,
a pixel can come out one shade of 255 different. That is the same kind of
invisible difference the colour numbers themselves brought (v2.3.3190: 0.03%
of pixels, one shade).

## Measured

On top of v2.3.3445's layers (each world layer its own draw list, PR #977) --
the state this lands in -- a phone page at 1x density on this box's software
graphics, `mp-phoneframe` with `BT_PF_AB='onebatch=0'`, 3 rounds each, no
profiler or census:

| | one program | three programs |
|---|---|---|
| BroTown walking: draw calls a frame | 29.6 | 50.0 |
| BroTown walking: program switches a frame | 6 | 32.5 |
| BroTown walking: uniform / buffer uploads a frame | 18 / 9 | 28 / 15.4 |
| BroTown walking: Pixi's drawing a frame | 1.51 ms | 1.59 ms |
| Flame Fields fight: draw calls a frame | 27.6 | 71.3 |
| Flame Fields fight: program switches a frame | 7.6 | 58.1 |
| Flame Fields fight: uniform / buffer uploads a frame | 21.3 / 12.8 | 31.0 / 16.3 |
| Flame Fields fight: Pixi's drawing a frame | 2.14 ms | 2.42 ms |

`mp-onebatch`, a 3x phone: the same held frame drawn by the one program and
by the three is identical to the pixel in BroTown and at a fight; batches 21
against 39 (BroTown) and 19 against 48 (fight).

The frame's whole work on this box moved by noise (BroTown 4.43 -> 4.90 ms,
the fight 5.73 -> 5.81). But the box drew **4.1 frames a second with the one
program against 9.2 with the three** -- which is how this box draws, not what
a phone would do (next).

## In software, the three programs

This box's graphics are SwiftShader, a rasterizer in software, and a software
rasterizer runs **every branch of a program for every pixel**, the ones no
pixel takes too. Measured by `node tools/qa/qa-branchcost.mjs`: a full-screen
quad at 390 x 806, ms a draw over three rounds --

| program | ms a draw |
|---|---|
| A: one read, through Pixi's chain of 15 picture slots | 11.5-17.5 |
| B: A inside a branch whose other side (15 slots of 5 reads) no pixel takes | 50-66 |
| C: that other side alone | 36-60 |

B costs what C does: the branch nobody took was run. So in software the one
program pays all three reads for every pixel, and the page draws at half the
frames a second. A phone's graphics chip skips a branch that every pixel of a
quad agrees on -- Pixi's own batch program counts on that, with its chain of 16
picture slots -- so there a sprite pays for its own read.

So `setOneBatchRenderer` asks the renderer its name (`oneBatchChoice`): a name
saying software (SwiftShader, llvmpipe, softpipe, "Software", Windows' Basic
Render driver, WARP) keeps the three programs, as do the QA box and CI's
phones, so every scenario draws as it did before this. `?onebatch=1` draws with
the one program anyway (`mp-onebatch` does, to test it), `?onebatch=0` with the
three anywhere. `window.__btOneBatch()` says which, and why (`address`,
`software`, `chip`), with the renderer's name. TRAPS §225.

## How it is checked

- `mp-onebatch` (with `?onebatch=1`): the one program linked and draws the
  world; a page with nothing in the address draws with the three on this
  box's software renderer; the choice asked about ten addresses and chips (a
  phone's the one, a software renderer the three, the address first); the
  same held frame drawn both ways -- the second by the Speed test's own lever,
  `setOneBatchLive` -- is identical to the pixel, in BroTown and at a fight;
  fewer batches and far fewer program switches.
- `mp-palette`, `mp-sharppixels`, `mp-figureseam`, `mp-membudget` and
  `mp-questline` ran with the one program drawing (before the software rule):
  see the PR for the counts. `BT_QA_QUERY=onebatch=1 node tools/qa/mp/run.mjs
  <scenarios>` runs any of them so again (the harness adds `BT_QA_QUERY` to
  every page's address).

## What it cannot show here

The graphics chip's own share. A phone's chip skips the branches a sprite does
not take, so each sprite's work per pixel is its old program's, plus the
choosing. But one program holding three reads needs more registers than the
plain one, and on some chips that can slow plain sprites a little; and where
two kinds of sprite meet inside one group of pixels the chip works on together,
that group runs both reads. This box draws in software, so it cannot say. So
the Speed test (game/speedTest.js) times the sprites drawn by the three
programs as a step of its own ("Three drawing programs (the old way)",
`setOneBatchLive`: every draw list rebuilt, live, for that page only), and its
card says how many frames a second the one saves on that phone -- or, if the
old way was faster, asks for the card. `?onebatch=0` is the three programs for
a whole visit. (In software the step is not offered: the three programs are
already drawing.)
