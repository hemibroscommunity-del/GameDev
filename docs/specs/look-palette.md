# The body kept once, coloured by its look on the graphics chip (v2.3.3716)

The owner: *"The game needs to be extremely memory efficient."* iPhone Safari
kills the tab at about 250 MB, and a big fight holds about 335 MB on the memory
check's measure.

**Behind a switch, off by default: `?lookpalette`.** Without it nothing here
runs and the game is exactly as before. This is the first step of a plan (the
end of this file); it proves the method on the player's body, standing and
walking.

## What the page held

Every look (a skin, trousers, boots, an eye colour) got its own recoloured copy
of the body's sheets: `playerSkins.js` `recolorBodyToCanvas` paints the original
art by colour rules (the skin, the trousers, the boots, the outline left alone,
the pickaxe's wood), and each copy is uploaded for that look and kept as an
image of itself (`keepAsImage.js`). So the memory grew with every look on the
screen, yours and every other player's, and the old path never lets a copy go
(`_bodySheets` has no cap). Measured by `mp-lookpalette`, the stand and jog
sheets of ONE look:

| | on the graphics chip | decoded images beside them (in no line of the check) |
|---|---|---|
| a look, the old way | 5.3 MB | about 4 MB |
| twenty looks, the old way | 105.6 MB | 70.6 MB |

## What it does now

Each of the 10 stand and jog sheets (five facings each; the other three facings
are these flipped) is kept ONCE, as **colour numbers**, and a look is ONE ROW of
colours. The sprite is drawn from the shared numbers with its look's row, and
the graphics chip does the recolour as it draws.

| | on the graphics chip |
|---|---|
| the 10 sheets of numbers, whatever the looks | 2.6 MB, once |
| a look | one row of the palette atlas: 1 KB |

### The numbers (`tools/art/role-bake.mjs`, `public/sprites/look/`)

- The art is painted in full colour (jog-south alone has 23,000 different
  colours; the ten sheets together 82,700), so a look cannot be one row of 256
  colours, as the Wheel's ground is. What is shared instead is each pixel's
  **role** and its **own colour**:
  - roles: 0 keep (the outline, the eye's white...), 1 skin, 2 trousers,
    3 boots, 4-7 an iris (the eye colour when one is picked, else roles 0-3).
  - each sheet: a 16-bit NUMBER a texel, into the sheet's own table of (its
    colour, its role) pairs, sorted by role; the table and a header (where each
    role's entries end) ride in the same texture, two bytes a texel (RG8).
- **The roles are decided by the game's own recolour.** The tool runs
  `recolorBodyToCanvas` itself (the Vite dev server serves the game's modules
  to a Chromium page) with three probe looks in colours no art pixel has, and
  asks of every pixel which rule explains what came out. A pixel no rule
  explains fails the bake: none does. So the garment bands, the eye creams, the
  trouser judge (`garmentConfine.js`) are in the numbers exactly as they run.
- **It reads the sheets as the game does** (`webpImage.js`: the lossless
  `.webp` twin). A browser decodes a see-through pixel of the `.webp` a shade
  differently from the `.png` (4,510 of them in jog-east); a bake from the
  `.png` put a few in the wrong role.
- **The layout is the old path's own**: `gearSheets.packTrimmed`'s cells, so
  every frame's quad, crop and mip blocks are the old texture's.
- **The stand sheets keep four numbers a display texel** (ds 2). They are 256
  pixels a frame on disk and the old path halves them for the screen with the
  canvas's 'high' smoothing, which, measured in Chromium, is the 2x2 box of the
  premultiplied bytes, truncated. The shader colours the four and takes that
  box. The jog sheets are 128 on disk (doubled, recoloured, halved by nearest
  neighbour), so one number a display texel.
- It checks itself: three real looks drawn from the numbers in JavaScript the
  way the chip will, against the old path's display canvases: within half a
  level of 255 on every texel of every sheet.
- `precheck` `look-roles`: a stand or jog sheet changed without a re-bake
  FAILS; a change to the recolour code WARNS (`role-bake.mjs --check` says
  whether the roles moved).

- **No colour is reduced.** Every pixel keeps its own colour exactly (the
  table holds the art's colour; the recolour is computed from it), so this is
  not a 256-colour quantization and needs no owner's yes on quality.
- **Why numbers + a table, not the shipped sheet + a role map.** The other
  exact design -- draw from the shipped RGBA sheet the game already holds and
  add a one-byte role map -- needs TWO textures a sprite (the sheet and its
  roles) in one batch, and the shipped stand sheets are already halved to the
  display (the box above mixes roles, so a role a display texel is not exact
  there). One RG8 texture a sheet keeps one texture a sprite and the stand's
  four source pixels a texel, at 2 bytes a texel plus the table (2.6 MB for all
  ten) against the shipped sheets' 4 bytes (+ mips). The shipped sheets stay
  loaded for the default look and the other poses; dropping them is a later step.

### The look (`src/rendering/lookPalette.js`)

- A look's row, in `paletteTex.js`'s atlas (256 x 256, shared with the Wheel's
  pictures; three small functions added there): entry 1 the skin's target,
  2 the trousers', 3 the boots', 4 the eye's, or zero for "as drawn".
- The shader is `recolorBodyToCanvas`'s own arithmetic: `min(255, round(target
  x luminance / ref))`, the refs 149 / 112 / 75, the iris replaced by the eye
  colour, the result premultiplied as the canvas kept it.
- A row is freed when no one has drawn that look for 30 s (a player who left);
  a sprite still holding one of its frames draws the art's own colours until it
  is given a frame again.

### How it is drawn

- **Its own batcher, `bt-look`**, routed by the texture as `paletteTex.js`
  routes its own (inside `sharpPixels.js`'s hook, outside `paletteTex.js`'s).
  The vertex's texture id carries the slot, the look's row and whether the
  sharp read was chosen. Four sheets a batch (a figure draws one); the atlas
  is bound after them.
- **The chip cannot filter numbers, so the shader does**: the body is drawn
  with `sharpPixels.js`'s sharp read (or Pixi's plain one) from a mipmapped
  texture; here the four display texels round the point are coloured and
  blended with the chip's weights, the same sharp ramp first; minified, the
  mip chain's first level (a 2x2 box of display texels) and the blend between
  the levels. Below half size it stays on that first level.
- **One copy of the reading.** GLSL ES 3.00 picks a sampler of an array by a
  constant only; the first cut wrapped the whole reading in the per-slot chain
  (as Pixi's own batch shader does its one read) and the QA box's software chip
  spent minutes building fifteen inlined copies behind the loading screen. Now
  only the texel fetch is chained.
- Built behind the loading screen (a sprite drawn nearly see-through), the
  sheets loaded there too (`playerSkins.preloadBodyAll` awaits them).

### Which frames

`playerSkins.getLookBodyFrame`, asked by `entityRenderer.js` where the body is
drawn as it is:

- the local player and every other player, standing or jogging, **with no chest
  or leg armour** (the armour's masked frames are made from the body's own
  pixels, which are numbers here), and the local player not in the south block
  (cut into bands from the body's pixels);
- a look the numbers carry: skin, trousers, boots, eye colour. Not a drawing (a
  tattoo, a trouser print or pattern), an eye style (its erase samples the face
  round each eye), a baked shirt: those draw the old way, as does every other
  pose, the stand-ins, the armour, the head pieces.

Everything else asks `getBodyFrame`, exactly as before. The local player's own
stand and jog bakes are still made behind the loading screen (the armour's
masked prewarm reads them when armour is put on mid-play), so the saving is in
the OTHER players' looks today, which the old path baked on first sight and kept
for good.

## What it saved

`mp-lookpalette` (a phone, dpr 3, in the Wheel's BroTown), each look's every
stand and jog frame drawn once, the body's own textures counted texture by
texture:

| looks on screen | the old way: on the chip | + decoded images | the new way: on the chip | saved on the chip |
|---|---|---|---|---|
| 1 | 5.3 MB | (still a canvas) | 2.6 MB | 2.7 MB |
| 5 | 26.4 MB | 10.9 MB | 2.6 MB | 23.8 MB |
| 20 | 105.6 MB | 70.6 MB | 2.6 MB | 103.0 MB |

The page's GPU line moved the same way: +5.3 / +26.4 / +104.8 MB the old way,
+2.5 MB flat the new. The canvases and the asset cache did not move either way
(the old path's copies are images of themselves since v2.3.3702; the decoded
images are the browser's to drop and in no line). The page's buffers: +2.6 MB
with the switch (the numbers, kept to upload again).

`mp-membudget` (its phone wears the default look, which the old path never
recolours: no copies to save there), three trips each, highest reading:

| line | main (switch off) | `?lookpalette` | budget |
|---|---|---|---|
| artCache | 102.2 | 102.2 | 112 |
| gpu | 87.5 | 86.9 | 105 |
| canvases | 44.7 | 40.7 | 56 |
| sound | 27.0 | 27.0 | 29 |
| heap | 33.0 | 33.5 | 34 |
| buffers | 20.7 | **23.0 (over)** | 22 |
| workers | 28.6 | 28.6 | 36 |

With the switch on, the `buffers` line goes over its budget by 1 MB: that is the
2.6 MB of numbers the page keeps to upload again after a black screen. Main is
unchanged (the switch is off). Before the switch goes on for everyone, either
raise the line by 3 MB (with the owner's yes, as `memory-budget.mjs` asks) or
let go of the copy once uploaded and fetch the sheets again on a rebuild (the
Wheel's ground does the same, `wheelGround.js`): the next chunk.

## How it was proven

All on this box's phone (390 x 844, dpr 3, the QA Chromium, its canvas in
software as every QA phone's is):

- **The oracle, `mp-lookpalette`** -- 24 looks (skin green / alabaster / ebony
  / default x trousers pink / red / default x boots blue / white, the ghost
  audit's green / pink / blue among them, every other one with blue eyes):
  every stand and jog frame in all eight facings, 4,824 frames, 10.8 million
  pixels drawn both ways through the sharp read the body is drawn with:
  **0 pixels more than 1 level of 255 apart** (the largest difference 1).
  At a phone's 2.6 screen pixels a texel: 1.58 million pixels, none more than
  1 apart. At a computer's 0.8 (minified, the mip chain): 3 levels at most, on
  2.5% of the pixels (below). The local player, given a look, drawn from the
  numbers; without the switch nothing is.
- **`mp-ghostaudit`, sampled at the owner's request** ("Can we save time by
  just sampling that part"): with the switch on, the two families this changes
  (stand, jog), all eight facings, bare and in the full iron set: 18 of 18
  (333 frames photographed; the walking body never drawn with a stand-in,
  nothing left after).
- **`mp-traitsoak`** with the switch on: 5 of 5. **`mp-questline`** (the
  "playable" check) with the switch on: 187 of 187.
- `tools/art/role-bake.mjs` checks its own bake (above) and `precheck` passes.

## Where it is not exact, and why

- **Minified (a computer's 0.8 screen pixels a texel)**: up to 3 levels of 255
  on about 2.5% of the pixels. The chip rounds its own level of detail and the
  blend between mip levels; the shader's are the textbook ones.
- **A device that draws its canvases on the graphics chip** halves the jog
  sheets (nearest neighbour) taking one pixel or another of each 2x2 block,
  unevenly across the sheet (measured: Chromium with its canvas on the chip),
  where a software canvas always takes the top-left one, as the bake does. On
  such a device the OLD path's own output differs texel by texel wherever a
  block's four pixels differ: 32 texels in all five jog sheets (`split` in
  `roles.json`), along a garment's edge. The new path draws the same on every
  device.

## What it costs

- 2.6 MB of numbers on the chip and the same in the page's buffers (kept to
  upload again after a black screen), always, with the switch on: on a phone
  where no one wears a recoloured look this is MORE than before.
- About 1 MB to download (`public/sprites/look/`), only with the switch on.
- Each body pixel reads its numbers and its table (4 to 16 texel reads, twice
  that minified) where the chip did one filtered read; a batch ends at each
  body (its own program).

## The plan for the rest

Each its own pull request, each behind the switch until the owner turns it on.

1. **Every pose.** The same bake for hit, dodge, pickup, mine and fish (the
   mining sheet's pickaxe keeps its wood, `toolWood.js`; the fish sheet's boots
   are under the legs, `bootsUnderLegs`; both are rules inside the recolour, so
   the bake carries them as it does the garment bands). Needs: the pose list in
   the tool and `LOOK_POSES`, the oracle over them, and the hit / mine / dodge
   / fish default skin floor (`poseSkinTarget`) as a row entry.
2. **The local player's own sheets.** Stop baking stand and jog copies for
   yourself. Needs: the armour's masked bake (`entityRenderer.js`
   `_localMaskedFrame`, the bake worker) and the south block to read a look
   frame's pixels: a CPU expansion of numbers + row into RGBA for one frame,
   like `paletteDraw.js` `drawSourceRect` for the Wheel's pictures.
3. **Armour and the body under it.** The masked body is "the body's pixels
   minus the armour's silhouette": keep the mask as one bit a texel per (frame,
   loadout) and discard in the shader, instead of a recoloured masked copy per
   look and loadout. Needs: the mask bake moved to the numbers, and the
   full-set knight figures (`_fullsetFrame`) left as they are (they are the
   armour's own art).
4. **Shirts and their prints.** The shirt is its own sprite (a white-base sheet
   times a tint, `gearSheets.composeShirt`): a tint is already free; a print or
   pattern stamped per player is a copy per player. Needs: the print as its own
   small texture drawn over the shirt's numbers.
5. **Head pieces** (hats, hair, beards, eyewear, eye styles): each colour a
   recoloured copy today (`traits/*ColorCatalog.js`). The same bake per piece
   (their roles are simpler: the piece's own shades and its outline), one row a
   colour. The eye style's erase (`_blankEyes`) samples the face round the eye:
   a row entry of its own.
6. **Drawings** (tattoos, trouser prints and patterns): stamped into the body
   per player. Needs: the stamp drawn as an overlay texture of its own, at the
   body's frame, over the numbers.
7. **Other players with armour**: covered by 3.
8. **One program.** Fold the look read into `paletteTex.js`'s `ONE_BATCHER` as
   a fourth kind, so a figure no longer breaks the batch (the pictures lane's
   file: a joint change).
9. **The switch on by default**, and the old copies' code removed, once the
   owner has played with it on a phone.

## Questions for the owner

- Turn `?lookpalette` on for everyone (after a session on your iPhone with it in
  the address)? Until then it costs nothing and saves nothing.
- The plan's order: the measured win grows with the number of players on screen
  wearing different looks; the head pieces (5) and the local player (2) are the
  next biggest.
