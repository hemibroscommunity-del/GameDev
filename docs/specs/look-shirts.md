# The tee coloured on the graphics chip: its colour, pattern and print (v2.3.3751)

Phase 2 of the look palette, the shirt part (lane P2). The method and its
numbers are in `docs/specs/look-palette.md`; this is what the shirt adds.

**On by default**, with the rest of the look palette (the owner, 2026-10-28:
*"I think including the new memory change work by default would be better. I
can always revert the change if I don't like it or it doesn't work well."*).
`?lookpalette=0` in the address draws every shirt the old way, for that page.

## What the page held

The tee is its own sprite over the body (`gearSheets.js`, slot `shirt`, the
white sheet `public/sprites/gear/shirt/tshirt/`). Since v2.3.756 the body is
never baked with a shirt, so `getLookBodyFrame`'s `shirtT` is always null;
the shirt's cost was elsewhere:

- a **plain** tee (one colour) is one shared sheet and a sprite tint: free,
  then and now;
- a tee with a **pattern** or a **print** (a drawing, front and back) was a
  COPY of every sheet it is seen in, per player
  (`gearSheets.getShirtLookFrame` -> `playerDecal.composeShirt`: tint, then
  pattern, then print, baked into a canvas), a mirrored copy too for the three
  flipped facings, eight drawings kept at a time.

## What it does now

Where a pattern and a print land is the white sheet's alone: the print's box
is each frame's chest box (`chestBox`, which `stampShirtArt` reports to the
shirt designer), the pattern's anchor the centroid of the frame's lit fabric
(`litFabricMask`), and neither knows the player. So each tee sheet is kept
ONCE, as numbers, and the chip paints the look as it draws:

- **The sheet** (`tools/art/shirt-bake.mjs`, `public/sprites/look/shirt/`,
  the set `shirt`, P0's manifest): a 16-bit number a texel, its low byte the
  colour (the tee has 33-135 colours a sheet, all grey and opaque: exact in 8
  bits), its high byte the frame + 1; the table the colours sorted by role
  (0 the outline and shading a print never touches, 1 the lit fabric), then
  five entries a frame: its packed cell, its pattern anchor, its print box. The
  layout is the old path's packed cells. 88 KB to download, 0.6 MB on the
  chip, once.
- **The look's row** (entries 8-31 the shirt's, 128-159 its drawing, P0's
  `LOOK_ROW_RANGES`): 8 the tint, 9 the pattern's colour, 10 its tile's size,
  11-12 its ink (a bit a tile cell), 13 "printed", 16-31 the drawing's
  16-colour palette, 128-159 the drawing, four bits a cell. Two players in the
  same tee share one row.
- **The shading** (`lookShirt.js`): `shirtTexel` is composeShirt's arithmetic
  per texel (the multiply, the tile's phase from the anchor, the print's cell
  edges as `stampShirtArt` rounds them), and `SHIRT_GLSL` its line-for-line
  twin, which the one look program runs for a sheet of kind `shirt`. A flipped
  facing reads the print and the tile pre-flipped, as the old bake does, by a
  bit in the vertex.
- **Where** (`lookShirtFrame.js`, asked by `entityRenderer.js` `_placeGear`):
  the tee's stand and jog, for every player, whenever it has a pattern or a
  print; a plain coloured tee too when the body beside it is drawn from the
  numbers (then body and tee are one batch, one draw call). Drawn untinted
  (the tint is in the row). Anything else, and every other pose, the old way.

## How it was proven

- **The bake checks itself** against `composeShirt`: 60 looks (four tints,
  every tile, two drawings, a drawing over a pattern) x both mirrors, every
  texel of all ten sheets drawn from the numbers by `shirtTexel`: 0 texels more
  than 1 level of 255 apart (2.5 million of them dressed).
- **`mp-lookshirts`** (a phone, dpr 3, in the Wheel's BroTown): 24 tees (6
  colours, white among them, x plain / a pattern / a print front and back / a
  print over a pattern), every stand and jog frame in all eight facings, 4,623
  frames, 2.4 million pixels drawn the old way and the new on the chip through
  the sharp read: **0 pixels more than 1 level apart**. At a phone's 2.6 screen
  pixels a texel: 0 of 399,052. At a computer's 0.8 (the mip chain): 3 levels
  at most, on 7.1% of the pixels (the body's 2.5%: the same chip rounding, and
  the tee is mostly edge). The palette atlas: rowsFull 0 throughout.

## What it saved

`mp-lookshirts`, 1, 5 and 20 different dressed tees put on the chip, both ways
(each look's every stand and jog frame drawn once; the tee's own textures,
counted texture by texture):

| dressed tees on screen | the old way | the new way |
|---|---|---|
| 1 | 2.4 MB | 0.6 MB |
| 5 | 11.1 MB | 0.6 MB |
| 20 | 11.9 MB (the old cache keeps 8 drawings) | 0.6 MB |

The new way's 0.6 MB is the ten sheets of numbers, held once whatever the
looks; a look is a row of the palette atlas (1 KB), freed 30 s after its last
draw. On a phone where no one wears a pattern or a print this is 0.6 MB MORE
than before (the sheets are loaded behind the loading screen either way).

## What it costs a frame

`mp-crowdbots` (BT_CROWD_GL=1), 15 bots in a printed, striped tee, the body
drawn from the numbers both ways, the shirt part alone switched by
`?lookshirt=0` (two runs each):

| | draws a frame | programs a frame | work ms p50 / p95 | frames in 20 s (this box's software chip) |
|---|---|---|---|---|
| `?lookshirt=0` | 98 / 97 | 79 / 80 | 10.3 / 20.0, 10.7 / 19.2 | 47 / 45 |
| the tee from the numbers | 166 / 185 | 149 / 164 | 11.4 / 18.0, 13.1 / 20.0 | 30 / 29 |

About five more draws and program switches a dressed figure: the tee on its
own program breaks the batch round it (it does not sit next to the body in
the draw order, and four sheets fill a batch). This is the cost the look
program's fold into the one batcher (`claude/look-palette-fold`) is for. `?lookshirt=0` draws
the tee the old way, the rest of the look palette as it is.

## Where it is not exact

Minified (a computer), as the body: the chip rounds its own level of detail
and the blend between mip levels.

## The rest

Every other pose of the tee (hit, dodge, pickup, mine, fish, the stand-ins'
strips) is baked the old way when a print or pattern is worn: the same bake
over P1's poses as they land (`--` the pose list in `shirt-bake.mjs`; the
mining sheet anchors its print on the hem, `STABLE_PRINT_POSES`, which the
frame numbers carry as they are).
