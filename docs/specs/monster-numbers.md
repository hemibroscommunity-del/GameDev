# A monster's picture held once, its colours as numbers (v2.3.3699)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal"*, and that night: *"Keep running tests
through the night on memory fixes/improvements"*.

## What was held twice

Every pose of a land's monsters (the fire goblin, the mummy, the skeleton, the
snowman, the rock monster, the fishman) is loaded as a strip, cut to its art
and packed onto a canvas (`zoneTextures.js` `loadTrackedStrip`, v2.3.2870).
Once drawn, each strip is held twice: the canvas in the page, and its copy on
the graphics chip, which is what is drawn. At a Flame Fields fight that was
22 MB of the page (mp-battlemem's ledger, every picture counted once), the
most of any one kind after the walking gear sheets.

`keepOnGpuOnly` (gpuOnly.js), which empties the canvases of pictures that are
only ever drawn, could not simply be used on them:

- **Two things read a monster's picture back on the CPU:** a hit's chips
  (`hitMaterialFx.js` `bakeChips`, the snowman's snow, the rock monster's
  stone, the skeleton's and the mummy's bone) and an arrow stuck in it
  (`arrowPin.js` `frameData`).
- **A black screen's rebuilt renderer uploads them again from their
  canvases.** The monster modules keep their strips for the page and reuse
  them across rebuilds (pixiRenderer.js, v2.3.778). Emptied, every monster
  would be drawn blank after a rebuild.

## What it does now

Nearly all of the monsters' art is drawn on 256 colours or fewer (palette
PNGs). So `src/rendering/heldNumbers.js`:

1. **Once a strip has been drawn** (Pixi has made the renderer's copy), reads
   its canvas once into its COLOUR NUMBERS: a byte a pixel, each pixel its
   colour's place in the strip's own list of at most 256 colours, the colours
   exactly as the canvas gives them back. Then it empties the canvas
   (`keepOnGpuOnly`). The picture stays on the chip, and the page keeps a
   quarter of what it kept.
2. **The two readers read the numbers** (`readSourceRect`), and get the same
   pixels the canvas gave them.
3. **A renderer that has not got the picture** (a rebuild's, or Pixi's
   collector having let it go) has the canvas filled again from the numbers
   the moment it uploads it (`GlTextureSystem.onSourceUpdate`, patched once a
   page by `installHeldRefill`), and it is emptied again once drawn.
4. **A strip on more than 256 colours** (the snowman's throws: tens of
   thousands) keeps its canvas, as before. So does one never drawn.

Nothing drawn changes: the chip's copy is uploaded from the canvas as before.
The reading is done by the effects renderer's sweep, every 500 ms (gpuOnly's),
a few milliseconds at most a sweep, and never while a strip waits to be drawn.

`?held=0` keeps every canvas, as before; so do `?gpucopies` and QA's
`__btTrimVerify`. The probe: `window.__btHeld()` (held, MB let go of, MB of
numbers, strips on too many colours, refills, reads from the numbers).

## Measured

**The memory check's fight** (`mp-membudget`, the check every pull request
runs: a phone at the Flame Fields' fire goblins and home again, three times),
two runs each way on one build, `QA_MB_QUERY=held=0` the game before:

| at the fight | before | now |
|---|---|---|
| the page's canvases | 90.2-91.7 MB | 79.9-82.2 MB |
| the page's buffers (the numbers among them) | 17.0-17.7 MB | 19.5-21.2 MB |
| the graphics chip | 82-88 MB | 80-84 MB |

The buffers' highest on the trip is at home, where the land's art and its
numbers have gone: 23.8 MB either way. So the budget's `canvases` line comes
down from 96 to 88 MB (tools/qa/mp/memory-budget.mjs), locking the saving in,
and no line goes up.

**A wider look** (`mp-monsternumbers`, the fire goblins, a black screen's
rebuild and the Wind Dunes' mummies in one visit): 35.8 MB of canvases let go
of over the visit, 3.4 MB of numbers held at its end; the canvases 81.2 ->
74.6 MB from the first fight to the last, the numbers going with each land's
art as you leave it.

The colours: every packed strip of the fire goblin, the mummy and the skeleton
is on 256 colours or fewer (none was turned away in either test); the rock
monster's and the fishman's walks (900-1,300 colours) and the snowman's throws
keep their canvases.

## Tests

- **`held-numbers` suite** (server/test, node): the numbers of a picture, a
  byte a pixel, every colour once, see-through first, more than 256 colours no
  answer, every pixel and rectangle given back; the sweep (not drawn waits,
  drawn is read and emptied, too many colours keeps its canvas, nothing on a
  lost context or with the copies kept, a strip its zone let go of forgotten);
  a reader's pixels the same from the numbers as from the canvas; an upload
  putting the canvas back first, and emptying it again once drawn; the wiring.
- **`mp-monsternumbers`** (a phone at Frost Ridge's snowmen): the strips held
  and their canvases emptied once drawn, every monster drawn from one still
  whole (read back from the chip); a fight with the bow and the sword reading
  the chips and stuck arrows from the numbers; a black screen's rebuild giving
  the new renderer each strip back, every monster whole again and emptied
  again once drawn; what it saved. `BT_MN_QUERY=held=0` is the game as it was.
