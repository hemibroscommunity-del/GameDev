# Pictures on 256 colours, kept as colour numbers (v2.3.3728)

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
| zone banners (`zoneBannerOverlay.js`), four | 2043-2268 x 382-518 | 3.0-4.5 MB each | not measured here | the whole session, by theme (`zoneBannerPreload.js` `_held`) |
| coin flip win / lose | 1408 x 192 | 1.03 MB each | -- | also in Pixi's cache, never drawn there at a fight |

Drawing the level-up burst in the game's renderer as colour numbers would
take it to about 1.5 MB on the chip and nothing decoded in the page. That is
a change of its own, not this one.

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
