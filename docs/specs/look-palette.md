# The body kept once, coloured by its look on the graphics chip (v2.3.3716)

The owner: *"The game needs to be extremely memory efficient."* iPhone Safari
kills the tab at about 250 MB, and a big fight holds about 335 MB on the memory
check's measure.

**On by default.** The owner, 2026-10-28: *"I think including the new memory
change work by default would be better. I can always revert the change if I
don't like it or it doesn't work well."* `?lookpalette=0` in the address is the
old path, exactly as before, for that page (the tests measure both ways with
it). This is the first step of a plan (the end of this file); it proves the
method on the player's body, standing and walking.

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
images are the browser's to drop and in no line). The page's buffers: none
kept -- the numbers are let go of once on the chip (below).

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

- 2.6 MB of numbers on the chip, always: on a phone
  where no one wears a recoloured look this is MORE than before.
- About 1 MB to download (`public/sprites/look/`), behind the loading screen.
- The numbers' bytes are let go of once on the chip (first measured with them
  kept: the buffers line 20.7 -> 23.0 MB, over its 22), as the Wheel's ground
  lets go of its colours; a rebuilt renderer after a black screen makes them
  again from the sheets' `<img>`s, whose decoded pixels are the browser's to
  drop.
- Each body pixel reads its numbers and its table (4 to 16 texel reads, twice
  that minified) where the chip did one filtered read; a batch ends at each
  body (its own program).

## Phase 2: adding a set (v2.3.3737, P0)

Each part kept as numbers is a **set**: its own module, folder and manifest,
so five lanes can add theirs without editing one shared line.

1. **The set's module**: `src/rendering/lookSets/<set>.js` (the body's,
   `body.js`, is the example and the contract in its header). It tells the bake
   how the GAME loads, recolours and halves that art -- the game's own
   functions, never re-implemented -- and its `roleDefs`. Nothing in the game
   imports it.
2. **The bake**: `node tools/art/role-bake.mjs --set <set> [--sheets a,b]
   [--bits 8|16] [--out dir]`. It writes `public/sprites/look/<set>/` (the
   body, v2.3.3716, at the folder's root). A new set is **8 bits** unless its
   module says otherwise (the owner: *"You can go ahead and reduce it. I won't
   notice at all from anything at 256"*): at most 255 colours a sheet, cut PER
   ROLE (no colour crosses from one role to another) by median cut weighted by
   pixel count, each colour its box's mean. The bake reports how far the cut
   moved a pixel (`quant` in the manifest); an 8-bit sheet's self-check reports
   instead of failing. `--sheets` re-bakes some sheets and keeps the others.
   Measured on stand and jog at 8 bits: 1.1 MB on the chip instead of 2.6; a
   pixel moved 1.3-1.5 levels on average on the stand sheets and 3.4-5.1 on the
   jog sheets, the rarest colours up to 40-146 (a median cut merges a colour
   few pixels use) -- the oracle for an 8-bit set is the quantized art
   recoloured the old way, and its look is for the owner's eye.
   **The quality bar** (the orchestrator, on the owner's "I won't notice"): a
   sheet's worst texel stays within 16 levels a channel of the art, and a
   sheet that cannot meet the bar stays 16 bits, named here. Since v2.3.3750
   the cut is `tools/art/lookCut.mjs`, one for every bake, error-bounded (the
   body's section below says how and what it measured).
3. **The game**: `registerLookSheets('<set>', '/sprites/look/<set>/roles.json')`
   (a promise: loaded behind the loading screen with the body, or at once if
   later), then `getLookPartFrame('<set>', sheetName, frameIdx, [[entry, rgb |
   null], ...])` for a Texture, or null: draw the old way. A pose is DATA: the
   body has a pose when its manifest has its sheets (`lookPose`, `lookHas`), so
   P1 adds poses by baking them, not by editing `lookPalette.js`.
4. **Its roles** (`roleDefs`, in the manifest and so in each sheet's header):
   up to 15 a sheet, each `{ name, entry, ref, under }`:
   - `entry`: which entry of the look's row holds its colour;
   - `ref` > 0: recoloured as `recolorBodyToCanvas`'s `_retint` (the target at
     the pixel's luminance over `ref`); `ref` 0: painted the target (the iris);
   - `under`: the role used when this one's entry is unset (the iris over the
     skin); 0, the art's own colour.
5. **Sharing a texture**: a sheet is one RG8 (16 bits) or R8 (8 bits) texture;
   its header (the last row) says which, its scale, its roles, its refs' scale
   (`refScale`: a role's `ref` in 1/refScale's, for fractional refs), its KIND
   and its book offset. The sampling and the batcher are the body's.
6. **A kind's own texel** (P2's prints, P3's masks, P4's heads):
   `registerLookKind('<kind>', glsl)` from the part's own module, before the
   program is built (behind the loading screen; a late one is counted,
   `lateKinds`, and ignored). The GLSL defines `highp vec4
   lookKind_<kind>(highp int k, highp ivec2 p)`: the texel's number and its
   position in the sheet's texture, returning the premultiplied 0-255 colour.
   It may call `entry(k)` (the default), `tableRGBA(k)`, `num(p)`, `fetchT(p)`
   (the ONE fetch chain -- never a second), `rowT(e)`, `recol(c, T, ref)`, and
   read `sMirror`, `sBook`, `sKind`, `sW`, `sN`, `sDs`, `sBits`.
7. **The frame's options** (and `getLookPartFrames(...)`, the whole strip,
   for a caller that indexes it -- ask again each time it is drawn: a look no
   one asks for in 30 s gives its frames back): `getLookPartFrame(set, sheet, f, entries, { key,
   mirror })`: an entry's value of four bytes is RGBA verbatim (three: a
   colour, alpha 255); `key` is the caller's own key for the entries (not
   joined every frame); `mirror` gives the flipped facings their own frames and
   the shader its `sMirror` (vertex id: slot + 16 x (4 x look + 2 x mirror +
   sharp)). `setLookSheetBook(set, sheet, offset)` writes a sheet's book offset
   into its header (uploaded again).

### The row is law

A look's row has 256 entries, and a player's parts will share one row (the
plan's item 8), so each kind of part owns a range of entries, checked when a
set loads (a role outside its kind's range fails the set, `rangeErrors`):

| entries | kind (`kind` in the manifest) |
|---|---|
| 0-7 | body: 1 skin, 2 trousers, 3 boots, 4 eye |
| 8-31 | shirt and prints |
| 32-63 | armour (P3: entry 32 a mask book's address) |
| 64-127 | head pieces |
| 128-159 | shirt drawings (P2: 256 cells x 4 bits) |
| 160-255 | spare |

The orchestrator owns the row map and the atlas budget (256 rows, shared with
the Wheel's pictures): every phase 2 test reports `rowsFull` 0.

### What a phase 2 lane must read first

- **Bake from what the game reads**: the `.webp` twin (`webpImage.js`), which
  decodes see-through pixels differently from the `.png`.
- **The old path's halvings**: 'high' smoothing is a 2x2 box TRUNCATED;
  nearest is the top-left pixel on a software canvas and uneven on a canvas the
  graphics chip draws -- bake and test with `--disable-gpu` (the QA phones do).
- **Lay frames out with the old path's cells** (`packTrimmed`): a different
  quad drifted the sharp read up to 9 levels.
- **One texel-fetch chain in the shader**: a reading inlined once a texture
  slot froze the QA box's software chip for minutes building the program.
- **Never hand a look texture to code that reads pixels** (the armour's masked
  bake, the south block, anything through `drawGearFrame`): they are numbers.
- **The batch cost**: a look texture breaks the figure's batch (its own
  program): measured with 15 bare peers on screen, about 5 draw calls more a
  peer (166 against 94 a frame). The plan's item 8 (one program) is the fix.

## Every pose (v2.3.3750, phase 2 lane P1)

The body set (`public/sprites/look/roles.json` and its sheets) now carries every
pose the body draws through `getBodyFrame`, not only the stand and the jog:

| what the player does | the sheets |
|---|---|
| stand; walk, sprint and the jump's held frame | `stand-*`, `jog-*` (five facings each) |
| the hit taken | `hit-*` (five) |
| the roll, and the double jump's flip (`_rFlip` draws the roll) | `dodge-east`, `dodge-south` |
| mining; fishing; picking up | `mine-south`, `fish-south`, `pickup-south` |

20 sheets. A pose is live because the manifest has it (`lookPose`); nothing in
`lookPalette.js` lists them.

- **The bake runs `buildBodySheet`'s own call for each pose**: the jog's
  steadied drawing, the fish's boots under its legs (`bootsUnderLegs`), the
  pickaxe's wood (`toolWood`), and then the rod's pine
  (`recolorToolKeyCanvas`, only where the FILE has the key).
- **A kept entry's colour is the bake's, not the art's**: the default look's
  output. The rod is pine whatever the look, so its pixels are role 0 with the
  pine colour in the table. For every other kept pixel the two are the same
  (the stand and jog sheets re-baked byte for byte the same).
- **The skin floor** (`poseSkinTarget`: hit, roll, mine and fish always take the
  walking tan) was already in `getLookBodyFrame`.
- **Fishing asks as `getFishFrame` does**: no shirt, eye colour or eye style
  on that sheet, its drawings unmirrored.
- **Not from the numbers**: a cast in a shirt (`_placeFishHead` lifts the
  hand from the body's own pixels), and, as before, anything under chest or leg
  armour, the south block, a drawing, an eye style. The stand-ins (the swings,
  the bow and the shield block, chop, cook, fire, the farm) are their own path
  and their own pull request. Death needs nothing: `death-v1` is one bald body
  for everyone, and the crumble photographs the figure as drawn.

**Known difference (not copied):** the old fish bake tests the rod's hue again
AFTER the retint, so a boot pixel inside the file's key turns to pine for a look
whose boots land in that hue -- 2 texels of fish-south's 1.57 million, a tan
boot. The bake counts them apart (`rod flips`) and keeps them boots, as the file
draws them.

### At 8 bits: the cut held to its worst colour (`tools/art/lookCut.mjs`)

P0's first cut (median cut by pixel count, each box its mean) left the common
colours 1-3 levels off and merged the rare ones 40-146 off. The cut now:

- **measures a colour as the screen shows it**: premultiplied (an edge's colour
  counts for its alpha), and for a retinted role the retint's output at ANY
  target -- `min(255, T x lum / ref)` moves at most 255 |u - v| below the clamp
  and 255 (1 - v / u) past it (u = lum / ref), so luminance is measured on
  255 u up to 1 and 255 (1 + ln u) above. (Measured first at a white target
  only, the clamp hid the error: an entry 16 levels off at white was 34 at a
  darker target.)
- **spends all 255 entries as one pool**: each step splits the box, of any
  role, whose worst colour is furthest from its entry, at the middle of the
  axis that error lies on; an entry is its box's middle, then its pixels' mean
  where that stays 1.5 levels under the bar.
- **keeps a sheet exact (16 bits) when its worst is past the bar** (16), or its
  self-check (three looks against the old path's canvases) shows a texel past
  it. The manifest says so per sheet (`bits: 16`).

| sheet | bits | colours cut from | worst (levels) |
|---|---|---|---|
| stand x5 | 8 | 2,117-2,762 | 6-10 |
| jog-east, -north, -south | 8 | 13,636-22,773 | 15-15.5 |
| **jog-northeast, jog-southwest** | **16** | (17, 18 at 8 bits) | exact |
| hit x5 | 8 | 7,854-9,583 | 14.2-14.5 |
| dodge-east, -south | 8 | 19,249-20,568 | 14 |
| **mine-south** | **16** | (19 at 8 bits) | exact |
| fish-south | 8 | 31,256 | 15.4 |
| pickup-south | 8 | 21,802 | 15 |

The body's 20 sheets: **3.3 MB on the chip** (17 at 8 bits, 2.1 MB; 3 at 16,
1.2 MB), against 6.1 MB all at 16 bits and 2.6 MB for stand and jog alone
before. On screen (two looks, seven poses, drawn in JS from both bakes): about
1 level on average on the stand, 2 on the roll, 4-7 on the jog, hit, fish and
pickup, almost all of it on the outline and the see-through edge.

**The oracle** (`mp-lookpalette`, 16-bit numbers, before the cut): 24 looks x every pose x
every facing it is drawn in (the flipped ones flipped), 8,424 frames, 20.7
million pixels drawn both ways: **0 pixels more than 1 level apart** (worst 1).
At a phone's 2.6x: 0 of 3.7 million over 1. At a computer's 0.8x: 2.6% over 1,
worst 4 on one texel of jog-east (the chip's rounding of the mip blend; the
check's line is 4 now, under 5% of the pixels). The atlas: 20 rows at the most,
none refused. `tools/qa/mp/out/lookpalette-poses.png` is the side-by-side: six
poses in two looks, the old way above the new.

## The stand-ins (v2.3.3757, phase 2 lane P1)

The sword's swing, the bow's draw and the shield block (it swaps the figure to
the bow's art) draw **stand-in** sheets, not the walking body:
`effectsRenderer.js` recoloured a copy of each for your look
(`_bakeBodyStrip`) and for every other player seen swinging
(`_remoteBodyFramesFor`, `_remoteSheetFramesFor`, an LRU of bakes). They are
now the set `standin` (`src/rendering/lookSets/standin.js`,
`public/sprites/look/standin/`), registered by `effectsRenderer.js` and loaded
behind the loading screen with the body:

| part | sheets |
|---|---|
| the swing's body and torso | `sword-{south,east,north}-{body,torso}` |
| the bow's (and the block's) body and torso | `bow-{east,southwest,south,northwest,north}-{body,torso}` |
| the jog's legs under a torso | `jog-*-legs` (five) |

21 sheets, 16 at 8 bits (worst 11-16 levels), 5 kept exact: sword-east-body
(18 at 8 bits), sword-north-body (18), sword-north-torso (16.3),
jog-northeast-legs (17), jog-southwest-legs (18).

- **Their own sizes**: each sheet has its frame size (`frameOf`); nothing
  halves them for the screen, so the display IS the full bake: `role-bake.mjs`
  maps a ds 1 display texel to `W / DW` (1 here, 2 for the body's jog; the
  body's numbers byte for byte the same).
- **The skin is always recoloured** (`skinTarget || DEFAULT_SKIN_TARGET`, the
  stand-ins' own rule since v2.3.1788), no eye colour; a torso strip's
  garments are the waist's sliver, as the old bake.
- **No mip chain** (`mip: false`, header byte 0's 64): the old strips are
  canvases with no mipmaps, read at their level 0 however small they are drawn
  (about half size). The shader skips its mip blend for such a sheet --
  measured without it, 160 levels off at half size.
- **Where it applies**: no drawing (`_peerStandInArt`'s seg, `localBodyArt`)
  and no greaves (the legs are cut by their shape, `_legsUnder`). Your own
  strips are a marker `_standInStrip` turns into your look's frames each time
  they are drawn; the bow body's to `blockArm.js` as a function, and the
  block's arm cut keeps the look (`_btLook`) and caches by the frame, not the
  source (one source, every look).
- **Not here**: cook, fire and chop have their own SKIN-ONLY bake, already
  shared by skin colour (`recolorStandInSkinSplit`); they stay as they are.

**The oracle** (`mp-lookstandins`): six looks x every frame of the 21 sheets
(1,314 frames), the old bake and crop against the numbers, through the sharp
read: at 1:1 worst 15, mean 3.0 levels, none past 16; at half size (how they are drawn) worst 15, mean 2.7, none past 16.

## The plan for the rest

Each its own pull request (on by default, as this one: the owner's rule for the phase).

1. **Every pose** (done, v2.3.3750: above). The same bake for hit, dodge, pickup, mine and fish (the
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
   pattern stamped per player is a copy per player. **Done (v2.3.3751,
   `docs/specs/look-shirts.md`)**: the tee's stand and jog kept once as
   numbers, its tint, tile and drawing painted from the look's row.
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
9. **The old copies' code removed**, once every part draws from numbers and
   the owner has played with it on a phone.

## Questions for the owner

- It is on for everyone: if anything looks wrong on your iPhone, `?lookpalette=0`
  in the address shows the old way to compare, and reverting this pull request
  takes it out.
- The plan's order: the measured win grows with the number of players on screen
  wearing different looks; the head pieces (5) and the local player (2) are the
  next biggest.
