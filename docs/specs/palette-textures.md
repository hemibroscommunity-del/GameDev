# The Wheel's ground and objects kept as colour numbers (v2.3.3190)

Owner, 2026-10-12: *"Could you recreate byte for byte everything using pure
code instead of needing to load assets in memory?"* Not that: a picture the
game draws in code costs the graphics chip exactly what a loaded one does, 4
bytes a pixel, and the Wheel's ground is already made in code and still took
~34 MB there. What does work is the Phase 3 item in `docs/MEMORY-PLAN.md`,
palette textures, offered and answered *"Yes"*.

## What it is

The art law (`docs/WORLD-BIBLE.md` §6) puts every ground swatch and every
object on 64 colours of its own, so a ground piece or an object sheet holds
256 colours or fewer. Each pixel is kept as **one byte, its colour's number**,
and the picture's colours as one row of a shared table. The graphics chip
looks each colour up as it draws.

| | kept as | where |
|---|---|---|
| a ground piece | an R8 texture, its rows padded to 4 bytes with copies of each row's last number | the ground worker sends it as numbers (`public/tools/world/core/piecePalette.js`); a piece of more than 256 colours (up to ~6%) is sent as colours, as before |
| an object sheet | the same, read from its palette PNG as numbers in a worker (`src/rendering/png8Worker.js`, `png8Decode.js`) | `wheelObjects.js` `loadPalettePage`; a file that will not read loads as a picture, as before |
| their colours | one row each of ONE 256 x 256 RGBA texture (256 KB) | `paletteTex.js` `takeRow` / `giveRow`, the row given back when its picture is destroyed |

## How it is drawn

`src/rendering/paletteTex.js` adds a second Pixi batcher, `bt-palette`, used
by exactly the sprites and meshes whose texture is one of these. The choice is
made where Pixi hands each one to its batcher (`BatcherPipe.addToBatch`,
inside `sharpPixels.js`'s own wrapper), so anything that draws an object's
picture (the object, its shadow column by column, a mirrored copy) needs no
change. Its shader is Pixi's own batch shader with the lookup replaced: the
four texels round the point read as numbers (`texelFetch`), their colours
looked up, and blended with the weights the chip's smooth sampling uses. Where
the four numbers are one (the see-through round an object, a flat patch) that
colour is looked up once.

- The texture's slot and its colours' row ride in the vertex's texture id
  (slot + 16 x row); every batch binds the table after its 15 pictures, so
  pictures with different colours still share a draw call.
- A mesh too big to batch is drawn by a twin of Pixi's mesh shader
  (`paletteMeshExecute`); the moving water reads a piece through the same
  lookup (`wheelWater.js` `PAL_SAMPLE`).
- Pixi uploads a buffer at its size in points; the object sheets are
  resolution 2, so a palette source is uploaded at its pixels (TRAPS §165).
- Both programs are built behind the loading screen as the renderer is made
  (`setPaletteRenderer`); if either does not link, or there is no WebGL2,
  everything is drawn the old way.

## Reading a picture on the CPU

`source.resource` of such a picture is numbers, never an image. A read at the
picture's own size (a hit's chips, a burn mark, a shatter's shards) goes
through `drawSourceRect` (`paletteDraw.js`), which gives the same pixels. A
read that SCALES a picture (a shadow's base, `propGround.readArtBottoms`) does
not: Chromium scales an `<img>` and a canvas of the same pixels differently
(TRAPS §166), so each sheet's bases are read off its own `<img>`, decoded once
as the page loads and let go of (`readPageBottoms`). The old way kept that
picture for as long as the page was loaded.

## Measured

On the QA phone (390 x 844, 3x), `mp-palette` and `mp-membudget`:

| | main | colour numbers |
|---|---|---|
| GPU textures, arriving in BroTown | 104.0 MB | 71.9 MB |
| art from files, arriving | 156.4 MB | 125.2 MB |
| the page's buffers, arriving | 10.7 MB | 18.9 MB |
| highest on the budget's trip: GPU / art / buffers | 132.5 / 172.4 / 11.3 MB | 95.0 / 147.8 / 20.0 MB |

The buffers are the object sheets' numbers, kept by the page to upload a
sheet again (Pixi's collector takes an idle one off the chip; a black screen's
rebuild) and for the CPU readers. The budget's `buffers` line was raised 16 ->
24 MB for them, and `artCache` 178 -> 156 and `gpu` 145 -> 105 lowered.

The same picture: frame for frame against `?nopalette`, the camera, the
shadow grid and the ground pieces' order held (TRAPS §167), 834 of 2,829,060
pixels one level of 255 apart in BroTown and 1,107 at the water, none more;
the same after a rebuild; every object's shadow base the same, column by
column.

The cost: eight reads a pixel where the chip did one, and an object's batch
ends where it meets a sprite drawn the other way. On the QA box's software
chip (no real GPU there), the whole frame drawn and finished, the other page
held still, three runs: BroTown 20-27% longer (e.g. 946 ms against 791), the
water among trees 14-21% (1,239 against 1,023); 40 / 32 and 76 / 55 draw
calls. Not measured on a phone.

## Switches and probes

- `?nopalette`: the old way, all of it, for the tab.
- `window.__btPalette()`: on, built, sources alive (pieces, pages, MB), rows
  used, pieces sent as colours, the most colours a piece had.
- `window.__btGpuTex()` counts an R8 texture at 1 byte a pixel.

## Tests

- `mp-palette`: the two ways side by side on two phones -- R8 textures, the
  memory, the picture in BroTown and at the water, the shadow bases, a rebuild,
  the cost.
- `server/test/palette.test.mjs`: every object sheet read as numbers matches
  `tools/world/png.mjs` on every pixel; every PNG row filter; padding; a piece
  over 256 colours refused.
- `mp-groundcopy` checks the pieces are numbers and let go of on the page.

## Not done

- The other zones' art and the characters: they are not on 256 colours.
- Every sprite through the one batcher (no extra draw calls): it would change
  how every sprite in the game is drawn.
- Objects only (if the cost turns out too high on a phone): ~29 MB saved
  instead of ~55, the screen-filling ground drawn the old way.
