# The body under armour, from the colour numbers (v2.3.3752)

Phase 2 of the memory plan, part 3 (the look palette: `docs/specs/look-palette.md`).
The owner: *"The game needs to be extremely memory efficient"*, and of phase 2:
*"Make it so phase 2 finishes in a few hours. By sampling etc"*. On by default
with the rest of the look palette; `?lookpalette=0` in the address is the old way,
exactly as before.

## What the page held

Under a chest plate or greaves the body is not drawn as it is. The masked bake
(`src/rendering/maskedBake.js`, run in `maskedBakeWorker.js`) erases it under the
plates (dilated), keeps the head, gives back the trousers the halo ate, blends the
ghost fist, paints the chain belt into the waist (in the chest's metal since
v2.3.3733), gives back the tumble's head (v2.3.3732), and the result was a
recoloured, cropped picture **per look, per worn set, per frame**: a set's stand
and jog are ~150 pictures, baked for you, for the sets one equip away, and for every
armoured player on your screen (cap 900 frames).

The armour pieces themselves cost nothing per look: each piece is one shared sheet
(`steelplate`, `steelgreaves`) and its metal a sprite tint (`gearVariants.gearTint`).
So all the per-look cost was the masked body.

## Why not one mask a worn set

Half of the masked bake judges the body by its COLOURS: it samples the look's
skin, trousers and boots and asks of each pixel which it is most like (the trouser
restore, the ghost fist, the belt paint on the east and north-east jog, the east
olive quiet, the greaves-alone clamp). So which texels show under a set can differ
from one look to another, and a mask shared by every look would not be exact.

## What it does now (`src/rendering/lookArmour.js`)

The bake still runs, unchanged, on the same worker and queue: it is the one truth
of what shows under which piece, and every fix inside it rides along. What changes
is what goes in and what comes back:

- **In**: the body coloured from the shared colour numbers in this look
  (`lookExpand.js`: the look shader's arithmetic, line for line, in JavaScript).
  The worker is sent each body sheet's numbers once (2.6 MB in the worker for the
  page's life) and a job names the sheet, the frame's cell and the look's row. No
  picture of the body is made for an armoured look, on the page or in the worker's
  reply.
- **Out** (`lookBake.js`, `lookExpand.lookMaskOf`), per display texel:
  - the body's own texel (alpha the same, each premultiplied channel within 2 of it:
    the canvas's own rounding) -> **a bit**, 1;
  - see-through -> 0;
  - anything else (the chain belt, the steel fill, the ghost fist's trousers, the
    body partly erased at a plate's soft edge) -> 0, and the texel goes into the
    **residue**: a small picture of the frame's other texels.
- **The bits** of one pose (all five facings) for one look in one worn set are a
  **book** of rows in ONE R8 atlas, 2048 bytes wide (`MASK_W`), grown 128 rows at a
  time up to 1024 (2 MB). Each body sheet's header says where its bits start in its
  pose's book and the pose's index (`lookPalette.js` `layoutMasks`, two header
  values); the masked look is its own palette row, entries 1-4 the look's and entry
  `32 + pose` the book's first atlas row (the armour's range of the row, 32-63).
  The shader reads the bit of each display texel before it colours and blends it
  (`shown()`), so the chip's filtering is exactly the bare body's.
- **The residue** is drawn as one plain sprite just above the body
  (`entityRenderer._placeLookResidue`, as the whirl's glow is), under the gear. It
  stays visible while the figure is drawn this way and takes the empty texture on a
  frame without one (no draw-list rebuild a frame, TRAPS §218), and it draws only
  over the body frame it belongs to (`onRender`), never stale over another picture.
- **Freed**: a masked look no one drew for 30 s gives back its row, its books and
  its residues.
- **Not decided yet**: as the old path's frame not baked yet: you, the plain body
  for that frame (the worker's queue puts it first); a peer, their last masked
  frame of that pose and facing, else the plain body.
- **The uploads**: only the rows a frame's bits are in, at once, before the frame
  is said to be decided (a first cut waited for the next animation frame and drew
  the last frame decided see-through for a frame).

### Where it runs

- **You**: `prewarmMaskedBodyFrames` asks for every masked frame of your worn set
  behind the loading screen (the preloading law) and waits for them; no body
  pictures are baked for them. The sets one equip away are NOT prewarmed this way
  (they would hold a row and a book each): a set put on is decided by the worker as
  it is first drawn, the plain body for the frame or two that takes.
- **Other players**: their stand and jog frames are asked of the worker in the
  background when what they wear or how they look changes
  (`_peerLookPrewarmIfChanged`), as the old path's peer prewarm did.
- **No worker** (old Safari, a worker error): the same bake on the page
  (`_runLookBakeInline`), as the old path's own no-worker bake. QA's
  `window.__btLookBakeInline = true` forces it (below).

### What stays the old way

`?lookpalette=0`; the south block (yours only: it cuts the body into bands); the
knight figure (a full set of one metal on the jog facings that have one: it IS the
armour's art); the loot pickup in a full set (no bake); fishing (its head overlay
reads the body's pixels); any pose without numbers (P1 adds them: they get books
by their sheets, no change here); any look the numbers do not carry (a drawing, an
eye style, a baked shirt); no palette row or no room for a book (`rowsFull`,
`booksFull`): the old path's own bake of the old picture.

## How it was proven

All on this box's phone (390 x 844, dpr 3, the QA Chromium, software canvas):

- **The oracle, `mp-lookarmour`**: 4 looks (green / pink / blue, the ghost audit's;
  alabaster in red with blue eyes; ebony; the art's own) x the full steel, iron,
  copper and black steel sets, the plate alone, the copper greaves alone and a
  copper plate over iron greaves: every masked stand and jog frame in all eight
  facings, drawn the old way (the bake over the look's own picture) and the new
  (numbers + bits + residue), 1:1 through the sharp read. Results in the PR body.
  The full run uses the page's CPU canvas (`__btLookBakeInline`): on this box a
  worker's canvas is about 200 times slower than the page's (measured: the same 20
  reads 780 ms against 4 ms -- the old worker path pays it too), so a sample runs
  in the worker: a fifth look in full copper and in the mixed pair.
- Run with lane F's copper belt (#1214) and lane B's flip head (#1223) merged in,
  so the belt's metal tint is in the oracle's frames.

## Where it is not exact, and why

- **At the residue's edge**: the residue is its own sprite, so where a residue texel
  meets a body texel the two are blended as two layers, not inside one texture: up
  to 2 levels of 255 on a handful of pixels a set.
- **The worker's canvas**: the look jobs run every canvas of the bake on the CPU
  (`willReadFrequently`), where the old worker path's canvases may be on the chip.
  On a CPU canvas the nearest halving takes the top-left pixel of each block, as the
  page's does (look-palette.md "Where it is not exact"): the new path is the one
  that matches the page.

## What it costs

- Per look in a worn set: its books (stand + jog: 136 KB of bits, on the chip and
  kept on the page to upload again after a black screen), its residues (measured in
  the PR body), one palette row.
- The worker holds the body sheets' numbers once it is first asked for armour
  (2.6 MB).
- The shader: one more texel read per display texel it reads (the bit), the same
  single fetch chain.
- One more sprite a figure (the residue), plain, batched with the gear over it.

Probe: `window.__btLookArmour()`.
