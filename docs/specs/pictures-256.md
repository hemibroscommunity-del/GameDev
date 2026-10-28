# Pictures on 256 colours, kept as colour numbers (v2.3.3728)

The owner, 2026-10-28: *"You can go ahead and reduce it. I won't notice at all
from anything at 256"*, and as a standing rule: *"everything converted using
this more efficient method as standard protocol (art, audio, animations,
etc)"*. On by default; `?p256=0` in the address is the game as it was.

A picture on 256 colours or fewer is drawn by the game as **colour numbers**:
one byte a pixel in the page and on the graphics chip, its colours one row of
the shared atlas, looked up as it draws (`paletteTex.js`). The Wheel's ground
and objects, the farm and (v2.3.3715, `pictures-once.md`) the monsters' strips
already are. This puts the effects drawn in the world on 256 colours and draws
them the same way.

## 1. The inventory

INVENTORY

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

TWINS

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
(`?p256=0`, `?picnumbers=0`, no WebGL2, a full atlas, QA's `__btTrimVerify`)
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

DOM

## 5. Measured

MEASURED

## 6. Tests

TESTS
