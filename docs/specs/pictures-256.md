# Pictures on 256 colours, kept as colour numbers (v2.3.3728; next: v2.3.3771)

The owner, 2026-10-28: *"You can go ahead and reduce it. I won't notice at all
from anything at 256"*, and as a standing rule: *"everything converted using
this more efficient method as standard protocol (art, audio, animations,
etc)"*. **Off by default** for now (`?p256=1` in the address turns it on):
measured in §5, the effects are too small at play for their reduced colours to
pay yet. The reducer and the art-law step ship and work today; the twins and
their loader are ready for the owner to try.

A picture on 256 colours or fewer is drawn by the game as **colour numbers**:
one byte a pixel in the page and on the graphics chip, its colours one row of
the shared atlas, looked up as it draws (`paletteTex.js`). The Wheel's ground
and objects, the farm and (v2.3.3715, `pictures-once.md`) the monsters' strips
already are. This puts the effects drawn in the world on 256 colours and draws
them the same way.

## 1. The inventory

What the game still holds at four bytes a pixel at the memory check's Flame
Fields fight, with this PR's base (`?onecopy`, `?picnumbers` on): `mp-picsonce`'s
census, every picture in the asset cache and on the chip, families of 0.3 MB or
more. "In the page" counts an `<img>` at its decoded size, as the memory line
does; a browser decodes an `<img>` only when it is drawn, so for pictures not on
the chip that is mostly the line's way of counting.

| family | kept as | n | MB at 4 B/px | on the chip | in the page | <=256 colours | >256 colours | colours not readable |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| canvases the game drew (crops, bakes) | canvas | 149 | 22.8 | 6.4 | 22.8 | 6.8 | 16.0 | 0 |
| `/sprites/gear/` (walking armour sheets, as images) | img | 64 | 18.1 | 18.1 | 18.1 | 2.7 | 15.3 | 0 |
| `/sprites/gear/` (combat poses' gear, emptied) | canvas | 33 | 13.9 | 13.9 | 0 | -- | -- | 13.9 |
| canvases emptied (weapon bodies) | canvas | 11 | 11.0 | 11.0 | 0 | -- | -- | 11.0 |
| body sheets' files (unnamed) | img | 15 | 6.7 | 2.1 | 6.7 | 2.0 | 4.7 | 0 |
| `/sprites/trees/` | img | 5 | 5.6 | 0 | 5.6 | 5.6 | 0 | 0 |
| `/sprites/monsters/` (slimes, whole files) | img | 8 | 5.1 | 0 | 5.1 | 5.1 | 0 | 0 |
| `/icons/ui/` | img | 17 | 4.5 | 0 | 4.5 | 0 | 4.5 | 0 |
| `/sprites/traits/` | img | 16 | 4.0 | 0 | 4.0 | 0.8 | 3.3 | 0 |
| `/icons/shards/` | img | 9 | 2.3 | 0 | 2.3 | 0 | 2.3 | 0 |
| `/sprites/player/` | img | 5 | 2.2 | 0 | 2.2 | 2.2 | 0 | 0 |
| `/sprites/fx/` (the coin flip) | img | 2 | 2.1 | 0 | 2.1 | 0 | 2.1 | 0 |
| `/sprites/world/`, `/icons/items/`, `/sprites/players/`, `/sprites/pets/`, `/sprites/player-naked/` | img | 14 | 6.9 | 0 | 6.9 | 0 | 6.9 | 0 |
| `/sprites/weapons/`, `/sprites/ore/`, `/sprites/npc/`, `/sprites/props/`, `/sprites/projectiles/`, `/icons/popups/` | img | 35 | 6.7 | 0 | 6.7 | 2.3 | 4.4 | 0 |

Ranked by what a byte a pixel would save **on the chip at the fight**:

1. the character sheets (phase 2, not this change): the walking armour 18.1 MB
   and the emptied pose and weapon canvases 24.9 MB -- about **32 MB** less at
   a byte a pixel;
2. the effects (this change): about 5 MB on the chip when drawn, about 3.7 MB
   less at a byte a pixel;
3. everything else in scope (icons, props, projectiles, popups, the fish spot)
   is not on the chip at the fight.

On disk (`public/`, 2,968 pictures, PIL): every in-scope effect, tool strip,
icon and prop file is on more than 256 colours. The monsters' strips are on
256 or fewer for 48 of 66 files.

## 2. The reduction

`public/tools/style/quant256.js`, one pure function (`reduce256`) shared by:

- **the art pipeline**: `process.js` `reduceColours`, the last step of `snap`,
  so a picture the studio makes comes out on 256 colours or fewer (the art
  law);
- **the one-time tool**: `tools/art/reduce256.mjs`, for the pictures already
  in the game.

How it chooses:

- a picture already on 256 colours or fewer comes back **exactly** as it was;
- fully see-through stays fully see-through, fully solid stays fully solid,
  and a soft pixel (a glow's fade, an anti-aliased rim) stays soft. The solid
  and the soft pixels get colours of their own, shared out by how much of the
  picture each is;
- colours are compared in **OKLab**, where equal distances look equally
  different, with alpha as a fourth axis; a soft pixel counts by how much of
  it shows;
- the colours are found by splitting the picture's own colours where they
  spread most, then a few rounds of k-means;
- **no dithering**: every pixel takes its nearest colour, so an animation's
  frames do not shimmer;
- the same picture always gives the same answer.

`server/test/quant256.test.mjs` holds it to each of these. It also checks that
the palette PNG it is written as (`png8.js` `encodeIndexedPng`, each colour's
own alpha in `tRNS`) reads back through the game's own reader as the same
colours.

The tool reads each file exactly as stored (ffmpeg: every pixel's RGBA), writes
the twin **beside** the original (`name.webp` -> `name.p256.png`), reads the
twin back and stops if one colour differs, and lists every twin in
`src/data/p256Files.js` (generated). The originals stay until the owner has
tried it.

**The sheet for the owner**: `docs/specs/pictures-256-sheet.png`. Before on
the left, after on the right, the six pictures with the most colours (the
arrow blast at 155,488, the whirlwind at 106,377, the stun stars at 80,038, the
fishing reel, the fire trail, the pan). Each is shown on a checker (to see the
see-through parts) and on black (to see a glow's fade).

The 18 twins (an OKLab distance of about 0.02 is the smallest step most eyes
see):

| picture | size | colours before | after | moved (OKLab) |
|---|---|--:|--:|--:|
| `/sprites/fx/fire-trail-v1.png` | 2048 x 256 | 30,324 | 256 | 0.0053 |
| `/sprites/fx/portal-beam.webp` | 448 x 456 | 23,051 | 256 | 0.0129 |
| `/sprites/fx/smith-anvil.webp` | 180 x 155 | 11,202 | 256 | 0.0095 |
| `/sprites/fx/snow-footprints.webp` | 380 x 96 | 13,084 | 256 | 0.0069 |
| `/sprites/fx/stun-stars-v1.png` | 2048 x 256 | 80,038 | 256 | 0.0136 |
| `/sprites/fx/whirl-vortex-v1.png` | 2048 x 256 | 106,377 | 256 | 0.0279 |
| `/sprites/effects/arrow-blast-v1.webp` | 2048 x 256 | 155,488 | 256 | 0.0135 |
| `/sprites/effects/grease-burst-v1.webp` | 2048 x 256 | 10,348 | 256 | 0.0171 |
| `/sprites/effects/jet-stream-v1.png` | 512 x 39 | 8,378 | 256 | 0.0074 |
| `/sprites/effects/rocks-burst-v1.webp` | 2048 x 256 | 10,384 | 256 | 0.0161 |
| `/sprites/effects/snowball-burst-v1.png` | 1024 x 128 | 21,936 | 256 | 0.0056 |
| `/sprites/effects/splash-burst-v1.webp` | 2048 x 256 | 16,649 | 256 | 0.0137 |
| `/sprites/effects/woodchips-burst-v1.webp` | 2048 x 256 | 19,014 | 256 | 0.0189 |
| `/sprites/tools/axe-gesture-v1.webp` | 2048 x 256 | 12,339 | 256 | 0.0087 |
| `/sprites/tools/pan-gesture-v1.webp` | 2048 x 256 | 25,510 | 256 | 0.0089 |
| `/sprites/tools/pan-gesture-v2.webp` | 2048 x 256 | 19,718 | 256 | 0.0057 |
| `/sprites/tools/pickaxe-gesture-v1.webp` | 2048 x 256 | 12,284 | 256 | 0.0084 |
| `/sprites/tools/reel-gesture-v1.webp` | 2048 x 256 | 56,414 | 256 | 0.0106 |

## 3. How the game reads them

`src/rendering/p256.js`, two doors, as these pictures load two ways:

- **a strip cropped and packed** (`gearSheets.js` `loadCroppedStrip`: the hit
  bursts, the whirlwind, the stun stars, the fire trail, the tools' gestures).
  The twin is packed instead of the original, and the packed strip is read
  into its numbers at once (`picsNumbers.js` `stripAsNumbers`, the monsters'
  way). One row of the atlas per picture, whatever its frames;
- **a picture loaded whole** (`Assets.load`: the portal's beam, the arrow
  blast, the snowball's burst, the anvil, the footprints). A loader ahead of
  Pixi's own reads the twin and hands back a texture of colour numbers at the
  same address and size, so nothing that loads, finds or frees it changes.

These effects are asked for as their modules load, before the renderer has
said whether this device draws colour numbers. So a picture with a twin waits
for that answer (at most 20 s, then the original), still behind the loading
screen. Where it is drawn as numbers it is the twin; everywhere else
(`?p256` not on -- the default --, `?picnumbers=0`, no WebGL2, a full atlas, QA's `__btTrimVerify`)
it is the original, as before.

## 4. Not in this change, and why

- **The character sheets** (body, clothes, armour, head pieces) belong to
  phase 2. What 256 colours per sheet would save there is in the report.
- **The townsfolk**: they are drawn as figures, with the sharp-pixel program
  (`sharpPixels.js`), and a picture of colour numbers is drawn by the
  colour-numbers program, which samples smoothly. Converting them would change
  how they look. Phase 2 draws them live.
- **Pictures the page draws with `<img>` or CSS** (the level-up burst, the zone
  banners, the coin flip): a browser keeps every picture at four bytes a pixel
  whatever its colours. Measured below.
- **Icons, props, weapons**: something reads them back on the CPU
  (`weaponSprites.js`, the popups' tight crop, `propGround.js`) as
  `source.resource`. Each needs its reader moved to `drawSourceRect` first.

**The pictures the page draws** (`<img>` / CSS), decoded at four bytes a
pixel whatever their colours:

| picture | file | decoded | drawn | held |
|---|---|--:|---|---|
| level-up burst (`LevelUpBurst.jsx`) | 2172 x 724 | 6.0 MB | up to 0.93 x the strip in CSS px (`LEVELUP_MAX_W` 359 in a 390-wide column at 0.86), so 2.8 x the file on a 3x phone: **nothing to shrink** without losing detail | the whole session (`levelUpBurstPreload.js` `_held`, on purpose: the preload law) |
| zone banners (`zoneBannerOverlay.js`), four | 2043-2268 x 382-518 | 3.0-4.5 MB each | not measured here | by theme (`zoneBannerPreload.js` `_held`); since v2.3.5003 only near its land (§7) |
| coin flip win / lose | 1408 x 192 | 1.03 MB each | -- | also in Pixi's cache, never drawn there at a fight |

Drawing the level-up burst in the game's renderer as colour numbers would
take it to about 1.5 MB on the chip and nothing decoded in the page. That is
a change of its own, not this one. (v2.3.5004 drew it from colour numbers in
the page instead, keeping its place over the HUD: §7a.)

## 5. Measured

`mp-membudget`, one build, `QA_MB_QUERY`, MB, each stop the average of its
three trips:

| reading | `?p256` off (the default) | `?p256=1` |
|---|--:|--:|
| on arrival: chip / buffers | 71.3 / 18.5 | 74.1 / 19.3 |
| at the fight: chip / buffers | 81.6 / 19.5 | 79.3 / 20.3 |
| home again: chip / buffers | 83.9 / 20.4 | 82.1 / 21.7 |
| highest: chip / buffers | 85.3 / 20.6 | 82.6 / **22.8 (line 22)** |

What changes, at the fight with it on:
- the effects drawn on the chip at a byte a pixel: 2.3 MB less;
- their numbers in the page: kept deflated once on the chip (2.9 MB of numbers
  as about 0.8 MB);
- every effect is sent to the chip on arrival (not at its first draw), so
  arrival is 2.8 MB higher.

Before packing, the numbers in the page cost 2.9 MB of buffers against 3.5 MB
less on the chip. Either way it is about a megabyte or two, and the buffers
line is crossed. So it stays off until the character sheets (phase 2) make
256 colours worth the trade.

The shared atlas (`__btPalette()`): 83 of 256 rows with `?p256=1` at the
fight, none full.

## 6. Tests

| test | result |
|---|---|
| `server/test/quant256.test.mjs` (the reducer's promises, the PNG read back by the game's reader) | 8 / 8 |
| `mp-picsonce`, default | 9 / 9 |
| `mp-picsonce`, `BT_QA_QUERY=p256=1`: 15 effects from their twins (0 fell back, 0 undecided), every one of 29 colour-number strips drawn by the chip identically to its packed canvas (26.6 million pixels, 0 apart), packed once on the chip, unpacked for a rebuild with 0 blank uploads | 11 / 11 |
| `mp-membudget`, default | 11 / 11 |
| `mp-membudget`, `p256=1` | 10 / 11 (buffers 22.8 / 22) |
| `mp-glrestore`, `mp-renderheal` (with it on) | 7 / 7, 7 / 7 |
| `node tools/dev/precheck.mjs` | clean but the accepted version-tag line |

## 7. Next (after the showing)

v2.3.3771, measured and not built (the orchestrator, 2026-10-28: "not tonight").
These are the page's own pictures, drawn by the browser (`<img>` / CSS). A
browser holds every picture at four bytes a pixel whatever its colours, so 256
colours does nothing for them, and none is drawn smaller than its file on a 3x
phone.

**The zone banners.** Their drawn size, worked out from `game.css`
(`--zb-w: min(98vw, 430px)`; on the sideways and computer layouts
`min(64% of the play width, 360px)`; one ornament cell is 0.26 of that,
against a cell of 227-252 px in the file):

| layout | ornament cell drawn | against the file |
|---|--:|--:|
| upright phone, 390 x 844 at 3x | 298 device px | 1.19x |
| sideways phone at 3x | 281 device px | 1.12x |
| computer, 1440 wide at 1x / 2x | 94 / 187 device px | 0.37x / 0.75x |

All four themes were held decoded while you were in the world
(`zoneBannerPreload.js` `_held`, by theme): about 15.7 MB (3.1 fire, 3.6
desert, 4.3 forest, 4.7 frost). **The owner's decision** (it changes what the
loading screen holds, the preload law), 2026-11-12: "Yes do it" -- hold only
the banner of the land you are in or walking toward.

**Built in v2.3.5003.** A land's strip is held only near its land:

- **Which** (`src/game/bannerReach.js`, from where you stand, not where you
  face: a stick turns in an instant). Your spoke's land (the land whose
  direction from the middle is nearest yours, `wheelLandAt`'s rule), from
  2,400 px inside the safe ground's edge outward; and the neighbouring land
  on your side while you are within 2,000 px of the line between the two
  (near the commons a land's first stretch touches its neighbours', and the
  passes cross between them); and the land under you, always. So: **none in
  BroTown** (the town square, where you arrive, is 288 px from the middle);
  at most two near the commons' edge; one out along a land.
- **When.** The strip starts loading at least ~1,940 px of walking before its
  land can begin (the commons' edge, 2,765 px, wandering 288), and ~1,420 px
  before a neighbour's (the border wanders 576 px from the line): 4 s at the
  worker's 500 px/s move bound, 13 s at a walk. Behind the world's loading
  screen it loads the banners near where that trip lands (none at the town
  square; a dungeon's mouth or a reload's spot out in a land, that land's),
  then every 250 ms as you walk (`wheelBannerTick`, asked from the minimap's
  frame by the land watch). It is let go 600 px past both measures, its
  `<img>` pointed at nothing; a load that lands after you walked away is not
  held. Leaving the world lets all of them go, as before.
- **Not there in time** (a slow line, a reload that came back inside a land):
  the banner never fetches anything itself and never shows a strip that is
  not decoded and held. A strip still on its way is waited for, 2 s at most
  past the 600 ms dwell (`zoneBannerOverlay.js` `BANNER_WAIT_MS`); then the
  land plays the plaque alone, its icon and name, as the four lands with no
  art of the owner's always do. Never a broken picture. A load that never
  answers fails at 20 s and is asked again 10 s later while you are near
  (TRAPS §257; `picture-door.test` lists it `own`).
- **Held:** 0 MB in BroTown (15.7 less), 3.1-4.7 MB out in a land (11-12.6
  less), at most two (6.7-9.0 MB, two neighbouring lands with art) near
  the commons' edge.
- **Measured** (v2.3.5003, a browser, one build, BroTown 10 s after arrival,
  Chromium's own memory dump of the page, three dumps each way, steady):
  decoded pictures (`cc/image_memory`) 309.4 MB by default against 324.3
  with `?banners=all`, **14.9 MB less**; the files' bytes
  (`web_cache/Image_resources`) 0.9 MB less. `mp-membudget` does not see it
  (its lines are the art cache, the chip, canvases, sound, the heap, buffers
  and workers, not a picture the browser decodes for an `<img>`): its
  readings on the branch and on main were the same within a run's noise
  (artCache 54.9 / 54.9, chip highest 78.3 / 76.3, which moves 2-3 MB run to
  run). Chromium keeps decoded pictures in memory it may throw away under
  pressure; iPhone Safari keeps a decoded `<img>` that a page holds, which is
  what the owner's black screens were.
- **`?banners=all`** holds all four while you are in the world, as before.
- **Probe:** `window.__btBanners()`: `mode`, `held`, `loading`, `want`,
  `keep`, your spoke `land`, its neighbour `next`, `r` and `side` in px,
  `loads`, `frees`, `fails`. `__btZoneBanner.land()` adds `waitedMs` and
  `bare` (lands with art that played the plaque alone).
- **Tests:** `server/test/banner-reach.test.mjs` (the reach on both Wheels
  against the plan's own geometry, the hold with a stand-in `<img>`, the
  wiring); `mp-wheelmap` (none held in BroTown on arrival; out on Frost Ridge
  only its strip, there in time: the banner played its ornaments);
  `mp-farmfree` (the Flame Fields' strip held at its edge, none on the farm,
  the wanted ones back on return).

**The level-up burst.** 2172 x 724, 6.0 MB decoded, drawn up to 0.93 x the
strip in CSS px, which is 2.8x the file on a 3x phone. It is held for the
session (`levelUpBurstPreload.js` `_held`). **A rendering change of its own**:
draw it in the game's renderer as colour numbers (on 256 colours, the
owner's yes). That is about 6 MB decoded in the page becoming about 1.5 MB on
the graphics chip. **Built differently, v2.3.5004: below.**

### 7a. The level-up burst as colour numbers (v2.3.5004)

**Not in the game's renderer.** Measured before building: the world's canvas
ends at the top of the dashboard band (`BroTown.jsx`, `bottom: var(--dash-h)`),
and every HTML layer is over it. The burst is the page's own overlay at z 70
(`LevelUpBurst.jsx`), over the top bar (25), the band (30), and the building
windows and their scrim (`.bt-inspect`, 32). Drawn by the renderer, frames 4
and 5 would lose about 36 px at 390 x 844 under the band. A level won at the
Cookhouse, Smithy, Gem Works, Woodworker or Enchanter (each window raises the
burst while it is open) would play dimmed under the window, its number and
caption (still HTML) over it.

**What it is.** The same overlay, the same box, timing and z, drawn from colour
numbers:

- the eight frames' rects (`LEVELUP_FRAMES`, all the burst ever shows: it
  clips to them, 878,722 px) as palette PNGs,
  `public/sprites/fx/levelup-burst-v1-f0..f7.p256.png` (398 KB of files; the
  strip's was 434 KB), made by `tools/art/levelup-numbers.mjs` (`--check`
  re-makes them and compares);
- the loading screen fetches them through loadSetLater's door
  (`levelUpBurstNumbers.js`; 20 s, then retried). **Between bursts** the page
  holds the eight files PACKED, as Blobs (0.40 MB, which the browser keeps
  outside the page's heap), and frames 0 and 1 open as colour numbers
  (0.09 MB of buffers), so a burst's first 140 ms never wait. Nothing is
  decoded as a picture. The strip was 6.29 MB, held for the session;
- **as a burst starts** (its first render), frames 2-7 are opened from the
  Blobs on the reader's worker (`stripRead.js` `readPaletteBlob`,
  `png8Worker.js`'s `pngBlob` read, off the page's thread), all at once.
  Frame 2 is wanted at 140 ms. A frame not back yet is drawn when it comes,
  and the canvas keeps the frame before. When the last burst stops drawing,
  frames 2-7 are let go (0.80 MB). The first cut held all eight open for the
  session, 0.89 MB of buffers, and the memory check's buffers line failed by
  0.3 (22.3 against 22; main reads 21.3-21.4). Opening them ahead (a skill
  near its level) was not taken: at a fight that is when the check reads;
- as a frame comes up (eight times a burst, never each tick) its numbers are
  turned into colours on a canvas the size of the largest frame, at the art's
  own pixels, and the page scales it by k as it scaled the strip
  (`image-rendering: auto`). The draw is the largest frame at most: one table
  look-up a pixel and one `putImageData` of 0.93 MB, with no read back. It
  took 0.2-1.4 ms in node; the phone test reports the browser's number
  against the 12 ms line. While a burst plays it holds 0.93 MB for its
  canvas and 0.93 MB for the ImageData the bursts share. The canvas is
  emptied when the burst ends and the ImageData let go with the last burst;
- `?burstnumbers=0` draws the strip as before. So does a page with no
  reader's worker (`?stripworker=0`), a browser that cannot unpack the files
  (no DecompressionStream: iOS before 16.4), or a first load that failed (the
  strip is then warmed behind the loading screen).

**The cut.** The strip is on 505,071 colours, and almost every pixel is a soft
glow (one solid pixel in 752,178 shown). It is put on 256 colours by
`reduce256`, the whole strip as one picture, as decoded by libwebp (the
browsers' decoder; ffmpeg's own decoder turns the colours out up to 110 levels
apart). Measured over the eight rects' 727,367 shown pixels, premultiplied, in
levels of 255:

| reducer | mean | worst | past 16 levels | mean OKLab move |
|---|--:|--:|--:|--:|
| `reduce256` (shipped) | 7.26 | 94.5 | 66,581 (9.2%) | 0.0186 |
| the armour's cut (`lookCut`, for comparison) | 14.3 | 29 | 22% | -- |

This is **outside the armour's 16-level bar** (§8). No 256-colour cut of this
glow meets it: frame by frame, the armour's cut held it only for frames 0
and 1. Even with the see-through kept exact (2 bytes a pixel), the worst
pixel was 23.7. `reduce256` has the lower mean, and by eye it is close to the
original (the armour's cut bands the glow). **The owner looked at the
before / after sheet (frames 4 and 7 on black and on grass) and said yes,
2026-11-12.**

**Tests.** `mp-levelupnum` step 7: what is held between bursts; each of the
eight frames read off its canvas, alpha for alpha against its file; a live
burst; the canvas emptied after, and frames 2-7 and the ImageData let go. The draw was also checked in node: the eight frames drawn through
`drawLevelUpFrame` are byte for byte the strip's reduction at each rect, and
see-through past it.

**The character sheets** (phase 2): at the fight the chip holds 18.1 MB of
walking armour and body sheets as images, and 24.9 MB of emptied pose and
weapon canvases. At a byte a pixel that is about 32 MB less.

## 8. Phase 2, slice 1: the combat poses' armour (v2.3.4998)

The owner, 2026-11-12: *"Do armor and weapons as 256 color pictures."* The
first slice is the row ranked first in §1 that the look program can already
draw: **the armour of the combat and work poses** (the sword's swing, the
bow's draw, the chop, the cook's stir, the fire's lighting, the farmer's hoe,
can and kneel), 42 strips across the shirt, the chest and the legs, which
`effectsRenderer.js _gearStripFrame` cut into RGBA canvases: 13.9 MB on the
chip at the memory check's fight.

**What it is now.** A look set, `gear` (`src/rendering/lookSets/gear.js`,
baked by `node tools/art/role-bake.mjs --set gear` into
`public/sprites/look/gear/`): each strip's frames cut by the game's own
`packTrimmed` cells, at a byte a pixel and the sheet's own 255 colours (the
body's contract, `look-palette.md`), with no roles (armour is not recoloured
by a look). Copper, iron and black steel are the same steel art under a sprite
tint, which the look program applies as it applies every tint. 4.2 MB of
sheets (1.7 MB of files), a texture a sheet, as the stand-ins: on the look
atlas's 8-bit page they grew it from 2.4 to 8.4 MB (1.8 MB of gaps), and they
buy no batch there, since shining armour is drawn by the look program's shine
form, a batch apart from the bodies anyway.

**How it is drawn** (`src/rendering/gearLookFrame.js`). `_gearStripFrame` asks
`gearStripFrames` first: the frames from the numbers where the look program
and its shine are built; `'wait'` while the look sets load behind the loading
screen (so the RGBA strip is never fetched: that is the saving); null for the
old strip (`?gearlook=0`, a computer, no WebGL2, a program that did not
build). Where the numbers turn out not to be drawn after all, the old strips
are warmed again once the look sets are in, still behind the loading screen
(`gearLookDecided`; the preloading law). The metal's shine (`lightfx/
sheenBatch.js`) is drawn by the look program with the shine's own lines: a
look sprite the shine marks goes to `LOOK_SHEEN_BATCHER`, the look program
with the sheen's vertex and fragment lines added (`lookPalette.js
lookSheenShader`), its vertex the sheen's 21 floats with the sheet's number in
the low half of the round flag (`packSheenQuad`). The legs' swing and bow
strips still give the stand-in bodies the greaves' shape (TRAPS §255's
receipt, the `standinlegs` clamp): read once from their own file and let go
(`_greavesShapeOnce`).

**The cut** (the bake's self-check, every sheet against its own RGBA): 8 of the
42 already on 255 colours or fewer (exact); the rest from 788 colours (the
median) to 27,012, each cut to 255 within the 16-level bar: the mean a sheet
moves 0.8-3.9 levels (1.3 on average), the worst colour 14.5. All 111 armour
sheets (the walking ones too) were measured before this was built: every one
within the bar, the worst 14.

**The oracle** (`mp-lookgear`, `src/rendering/gearLookProbe.js`): every frame
of the 42 strips drawn the old way (the same PNG, `packTrimmed`, the sharp
read) and the new, through the game's own batchers, read back and compared
texel for texel, premultiplied:

| drawn | frames | px drawn | mean (levels of 255) | worst | px past 16 |
|---|--:|--:|--:|--:|--:|
| steel, no shine | 351 | 1.76 M | 1.49 | 14 | 0 |
| steel, its shine | 351 | 1.76 M | 1.51 | 15 | 0 |
| copper tint and its shine | 351 | 1.76 M | 1.21 | 14 | 0 |

**Memory** (§1's census; the check's numbers are in the PR): the 42 strips'
13.9 MB on the chip at the fight become their 4.2 MB of numbers, sent to the
chip behind the loading screen with every look sheet (`uploadSheets`: a sheet
first sent when first drawn held its bytes in the page until then, the
buffers line). The old strips were on the chip from arrival too (cut behind
the loading screen and kept there alone, `keepOnGpuOnly`: `mp-gpuonly`'s 47
canvases let go of on arrival, 24.9 MB with the weapon bodies). So about
9.7 MB less on the chip, from arrival on.

Measured in CI on merge (#1640): the memory check's chip line at its
highest 100.4 -> 89.9 MB.

## 9. Phase 2, slice 2: the walking armour (v2.3.4999)

**What it covers.** The chest plate and the greaves standing, jogging and
taking a hit (five facings each), rolling (south, east), mining, fishing and
picking up (south), and the full steel set's jog figure (east, north, south,
south-west): 44 sheets, which `gearSheets.js` builds as RGBA (packed,
linear, a full mip chain) and the loading screen sent to the chip
(`uploadGearTextures`). The shirt's walking sheets are the tee's look set
already (v2.3.4992).

**What it is now.** A look set of its own, `gearwalk`
(`src/rendering/lookSets/gearwalk.js`, `role-bake.mjs --set gearwalk`):
read as `_buildSheet` reads the art (`loadWebpOrPng` and the art's version;
the 128-tall sheets at a 128 frame, the 256-tall roll and pickup through the
same upscale and smoothing calls), cut by the same packed cells, **with** the
mip chain (its own set: `mip` is a set's field, and slice 1's is off).
3.6 MB of numbers (1.3 MB of files), a texture a sheet.

**How it is drawn** (`src/rendering/gearWalkFrame.js`). `gearDrawFrame` /
`gearDrawFramePhased` at the five draw sites: `_placeGear` (the chest and the
greaves), `_fullsetFrame` (the figure, as the body sprite's texture), and the
jogging greaves under a swing or a shot (`effectsRenderer.js`, four callers).
The numbers' frame where the look program and its shine are built; nothing
while the look sets load behind the loading screen; the RGBA frame otherwise
(`?gearwalk=0`, a computer the look program is off on, a sheet not in the
set). The shine and the tints are slice 1's (`LOOK_SHEEN_BATCHER`, the
sprite tint).

**What keeps its RGBA.** The masked bakes read the chest's and the greaves'
pixels on the CPU (`entityRenderer.js _frameInput`, the worker's input), as
does the fishing grip (`_fishTopFrame`), so `gearSheets.js` still loads every
walking sheet behind the loading screen. It no longer SENDS those drawn from
the numbers to the chip (`setGearDrawnElsewhere`), nor the jog chain belt,
which is never put on a sprite at all (its colours are copied by the bake).
Feeding the bakes from the numbers (so the RGBA need not load) is a change to
what the bakes see: its own PR, its baselines re-taken.

**The cut** (the bake's self-check): every sheet to 255 colours within the
16-level bar; the worst colour 14 levels (the pickup and the full set's
figure, cut from 15,000-29,000 colours), the mean a texel moves 0.08-0.5.

**The oracle** (`mp-lookgear`, `__btGearOracle.compareWalk`): every frame of
the 44 sheets, the RGBA sheet the game builds against the numbers, through
the game's batchers:

| drawn | frames | px drawn | mean | worst | px past 16 |
|---|--:|--:|--:|--:|--:|
| steel, no shine, full size | 592 | 1.06 M | 2.50 | 14 | 0 |
| steel, its shine | 592 | 1.06 M | 2.55 | 21 | 11 |
| copper and its shine | 592 | 1.06 M | 1.83 | 16 | 0 |
| half size (a computer's window: the chip's mips against the first level) | 592 | 0.29 M | 1.54 | 10 | 0 |

**Memory** (`mp-membudget`, this box, the same day; its character wears no
armour, so what goes is the loading screen's upload of every armour sheet):

| reading | main (slice 1) | slice 2 | `?gearwalk=0` |
|---|--:|--:|--:|
| the chip on arrival | 74.7 | **59.2** | 74.6 |
| the chip at its highest | 91.9 | **76.4** | 91.8 |
| heap at its highest | 37.4 | 37.9 | 37.7 |

A player WEARING iron, after jogging every way and 100 s (a probe, not a
test): main held 38.0 MB of RGBA armour on the chip and 92.4 MB in all; slice
2 holds 5.0 MB of the tee's RGBA, 7.9 MB of numbers, 62.1 MB in all.

**The race this found** (TRAPS §340; it was in slice 1 as merged). The
effects renderer is made before the game's renderer is handed to the look
program, and its armour warm asked `lookSheenOn()`, read false, and took it
for "off": on 8 of 21 loads it cut the 13.9 MB of RGBA combat strips
and sent them to the chip anyway. Now `lookSheenState()` says null for "not
yet known" (no renderer, no sheet, the program not built), and both armour
modules wait on it; `lookSetsSettled()` also waits for a set registered after
the loading screen began. 21 probe loads before: 8 with the strips on
the chip; 6 after: none.

## 10. Phase 2, slice 3: the bodies under armour baked from the armour's numbers (v2.3.5000)

**What was left.** After §9 the walking armour was drawn from its numbers,
but three readers still took its RGBA on the CPU, so `gearSheets.js` loaded
every walking chest, greaves and full-set sheet behind the loading screen
(about 14 MB of pictures in the page, never drawn): the masked bakes of the
body under armour (the worker, `maskedBakeWorker.js`, and their inline
fallbacks), and the fishing grip (`entityRenderer.js _fishTopFrame`).

**Now** (`src/rendering/gearNumbers.js`):
- a bake's piece drawn from the numbers is NAMED to the worker, not copied:
  `gearInput(tex)` gives the sheet and the frame's cell; the sheet's bytes go
  to the worker once (`lookSheetForWorker`, as the body's do; since v2.3.5015
  as the file's address, the worker fetching and decoding it itself:
  look-armour.md), and the worker
  expands the cell to the table's own colours (`lookExpand.js
  lookFrameRGBA`, a row of nothing: armour has no roles). A job naming a
  sheet the worker lacks fails rather than bake the piece as not worn;
- on the page (no worker, QA's inline oracle, the fishing grip),
  `drawGearFrame` draws such a frame from the same expansion, its sheet
  parsed once and its frames kept with caps (4 sheets, 24 frames);
- every worn list a bake builds asks `gearDrawFrame` (§9), so nothing starts
  an RGBA load in play;
- `preloadGear` / `preloadFullsetFigures` skip those sheets
  (`setGearPreloadSkip`) and load them after all, still behind the loading
  screen, where it turns out the numbers are not drawn (`gearWalkDecided`).
  The chain belt's jog sheets stay RGBA (read on the CPU only, never drawn).

**The bake's answer is unchanged.** The bake reads the armour only for its
outline (alpha) and the 255-colour cut keeps every sheet's alpha: the oracle
(`mp-lookgear`, `__btArmourOracle.compareGear`) bakes every frame of stand,
jog, hit, roll and mining under steel twice, the pieces' RGBA against their
numbers: 0 of 1.49 million texels apart, for the default look and another.

**What it saves.** No line of the memory check moves (59.1 MB on the chip on
arrival, 76.3 at the highest; heap 37.8): the RGBA sheets were not on the chip
since §9, and in the page they were kept as images of themselves
(`keepAsImage`), which no line counts. What goes is the loading screen's work
and what it held: 44 sheets, 14.4 MB of pixels, no longer decoded, packed and
encoded again as images, nor their compressed copies held for the session.

**The bake's speed.** The first cut expanded every piece texel by texel
through lookExpand.js's general walk and drew it through a new
OffscreenCanvas: `mp-armourflash` read 27 frames baked in 140 s against
main's 41, and 4 plain body frames in the walk after the armour went on
against 1. The worker now makes a sheet's table once (a texel is one look-up:
no roles, a byte a texel), hands the bake an ImageBitmap as the RGBA path did,
and keeps the last 48 frames: 39 in 140 s, 1 plain frame.

**And the stand-ins' bodies** (TRAPS §340): the sword's and the bow's bodies
are drawn from the numbers once the sets are in (`_rebakeBodies`), but that
was asked when the sets came in, before the game's renderer reached
lookPalette.js: read as "off", the strips baked the old way stayed, RGBA, on
the chip. It now waits for the answer (`whenLookKnown`, shared with both
armour modules); `__btFxBakes().bodyRgba` counts any left (`mp-lookgear`: 21
from the numbers, 0 RGBA).

## 11. Phase 2, weapons slice 1: the swing's blade and the bow's draw (v2.3.5002)

The owner, 2026-11-12: *"Do armor and weapons as 256 color pictures."* With
the armour done (§8, §9), the first weapons are the two kinds of strip the
stand-ins lay over their bodies: the sword's swing blade and the bow's draw.
(The research, with the rest of the weapons ranked, was lane W1's: the held
weapons (`weaponSprites.js`) and the projectiles are later slices.)

**What they were.** Eight RGBA strips, loaded by the effects renderer's
constructor (`effectsRenderer.js _loadSwordStrip`, `_loadBowStrip`), in the
page from arrival and on the chip once drawn:

| strip | on disk | as the game cuts it | kept as | MB at 4 B/px |
|---|---|---|---|--:|
| swing south | 2240 x 160, half size, 6,907 colours | blown up x2 (nearest) to 4480 x 320, 14 frames of 320, cropped | a packed canvas 360 x 592 | 0.81 |
| swing east | 2211 x 123, half size, 4,739 colours | x2 to 4422 x 246, 11 frames of 402, cropped | a packed canvas 320 x 504 | 0.62 |
| swing north | 3060 x 227, 38,244 colours | 9 frames of 340, NOT cropped: a faint haze (alpha 1-15) in every frame leaves the cut nothing to take | its `<img>` | 2.65 |
| bow, five facings | 366-642 x 233-260, 11-61 colours | 3 frames each, the whole file (`Assets.load`, i x fw) | the files | 2.16 |

6.2 MB in all.

**What they are now.** A look set, `weapons` (`src/rendering/lookSets/weapons.js`,
baked by `node tools/art/role-bake.mjs --set weapons` into
`public/sprites/look/weapons/`), as the armour's: no roles (a blade is not
recoloured by a look), 8 bits, `mip: false` (the game's strips have no mip
chain). The set reads each strip exactly as the game does -- the swing through
`loadWebpOrPng` and `upscaleToFrameHeight` to its frame's height, as
`lookSets/standin.js` reads the stand-ins' bodies; the bow as its PNG -- and
the bake cuts the display with the game's own packer, so its cells are the
game's: the swing's south and east cropped as before, its north whole (the
haze kept: cleaning it is an art change, the owner's call), the bow cropped
where the game drew whole frames (a cropped frame keeps its `orig`, so every
Sprite lands where it did). The bow's numbers are exact (61 colours at most);
the swing's are the 8-bit cut, held to the 16-level bar (a sheet the cut
cannot hold stays 16-bit, the bake's own rule).

**How it is drawn** (`src/rendering/weaponLookFrame.js`, slice 1's pattern,
`gearLookFrame.js`). Every draw site -- your swing (`_updateSwordSwing`,
`swordWeaponSprite`), a peer's (`set.weapon`), your bow shot and a peer's --
asks `_weaponStrip(pose, dir)`, which asks `weaponStripFrames`: the numbers'
frames where the look program and its shine are built; nothing while the look
sets load behind the loading screen; the RGBA strip otherwise. The RGBA strips
are loaded only where the numbers are not drawn: at once where they were never
asked for (`?weaponlook=0`, `?lookpalette=0`, a Windows or Mac computer); once
the look sets are in and the shine has answered no, still behind the loading
screen (`weaponLookDecided`, its loads joined to the loading screen's wait:
the preloading law), never on "not yet known" (TRAPS §340); and late, at a draw
that finds no numbers after all (a palette atlas with no row free, the live
switch off), as the armour's are, rather than a swing with no blade. The tints
are `weaponTint` as before (copper, iron, black steel on the sprite); the
steel's shine is the look program's shine form (`LOOK_SHEEN_BATCHER`), which
`glint.js` asks for as it always did (`swordWeaponSprite`, a peer's
`sw.weapon`). The bow is never metal: no tint, no shine.

**Kill switch.** `?weaponlook=0`: the RGBA strips at once, as before.

**The oracle** (`mp-lookgear`, `gearLookProbe.js compareWeapons`). Before any
oracle loads a strip itself: none of the eight RGBA files was fetched
(resource timings), none cut by the renderer (`__btWeaponStrips`), none on the
chip (`__btGpuTex`), and every draw site's strip is the numbers'. Then every
frame of the eight, drawn the old way (the strip cut as the renderer cuts it)
and the new, through the game's batchers, read back and compared texel for
texel, premultiplied, to the armour's bar (the mean under 4 levels, under
0.5% of a strip's texels past 16): as drawn; the blade under the steel shine;
in copper with its shine; mirrored (a west swing); and at half size (neither
has a mip chain; the walking armour's 1% bar).

| drawn | frames | px drawn | mean | worst | px past 16 |
|---|--:|--:|--:|--:|--:|
| as drawn (8 strips) | 49 | 135,771 | 1.99 | 13 | 0 |
| the blade under the steel shine | 34 | 104,406 | 2.52 | 17 | 1 |
| the blade in copper and its shine | 34 | 104,406 | 2.13 | 17 | 1 |
| the blade mirrored (a west swing) | 34 | 104,406 | 2.59 | 13 | 0 |
| at half size (8 strips) | 49 | 36,399 | 1.74 | 12 | 0 |

Measured 2026-11-12 (v2.3.5002), with the first bake: every sheet held the
8-bit cut, the north included (cut from 23,347 colours as the bake reads it;
the bake's self-check: its worst texel 13.25 levels, the mean 0.19), so nothing stays 16-bit. The south was
cut from 6,906 (9 at most), the east from 4,738 (7); the bow's five are exact
(11 to 61 colours). The eight files are 124 KB on disk.

**Memory.** The page lets go of the 6.2 MB of strips (1.4 MB of canvases,
4.8 MB of `<img>`s) and the chip of what of them was drawn; the chip takes the numbers from arrival instead (`uploadSheets`, as the
armour's): about 0.2 + 0.15 MB for the swing's south and east, 0.7 MB for its
north (it held the 8-bit cut), about 0.15 MB for the bow. So the
chip on arrival can READ about 1 MB more (the strips were on it only once a
swing or a shot drew them), and less at any fight with a swing or a shot in
it: the memory check's numbers are in the PR.
