# One drawing program for every sprite (v2.3.3376)

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
- `?onebatch=0` in the address is the three programs, to compare.

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

On top of v2.3.3359's layers (each world layer its own draw list, PR #977) --
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
the fight 5.73 -> 5.81): the one program's extra branches are done in
software here, on the same four processors as the page. On a phone they are
the graphics chip's -- which is what cannot be measured here (below), and why
the owner's Speed test times the three programs as a step of its own.

## How it is checked

- `mp-onebatch`: the one program linked and draws the world, `?onebatch=0`
  draws with the three; the same held frame drawn both ways is identical to
  the pixel, in BroTown and at a fight; fewer batches and far fewer program
  switches.
- `mp-palette`, `mp-sharppixels`, `mp-figureseam`, `mp-membudget`,
  `mp-questline` and the drawing scenarios run on it.

## What it cannot show here

The graphics chip's own share. Each branch's work per pixel is unchanged, but
one program holding three reads needs more registers than the plain one, and
on some chips that can slow plain sprites a little. This box draws in
software, so it cannot say. So the Speed test (game/speedTest.js) times the
sprites drawn by the three programs as a step of its own ("Three drawing
programs (the old way)", `setOneBatchLive`: every draw list rebuilt, live, for
that page only), and its card says how many frames a second the one saves on
that phone -- or, if the old way was faster, asks for the card. `?onebatch=0`
is the three programs for a whole visit.
