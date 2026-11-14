# The asset door: every file that ships, by family (v2.3.5241)

Grand plan pillar 9 (`docs/GRAND-PLAN.md`), card P (`docs/plan/cards/P.md`).
The owner, 2026-10-28: *"everything converted using this more efficient
method as standard protocol (art, audio, animations, etc)"*; and 2026-11-13:
*"automatically processing any files through the pipeline ... You decide how
that goes."*

It goes in this order: papers first (card F: `tools/assets/weights.mjs`,
`sources.json`, `uploads.json`), then one table (this page's part 1), the
measure (part 2), one finishing tool (part 3), one gate (part 4), then the
backlog, a family a PR (part 5).

## 1. The family table and the record of what ships (step 9.1, part one; tag 5241)

### The reach

Every file git tracks under `public/` that is a picture, a sound, a video or
data: `png webp jpeg svg mp3 m4a mp4 json bin tmx`, and the one JPEG spelled
`jpg` (`public/intro/mayor-welcome-poster.jpg`). **3,225 files** at tag 5241.
Code is out: `.js`, `.html`, the Tiled tile sets' `.tsx` (XML under
`public/sprites/tiles/`, read by no game code), `_headers`, the manifest.

`assets/` is card F's: `tools/assets/sources.json` names every file there by
its hash. A family row names its sources there by path; the door never writes
under `assets/`.

### A family

A family is a **path pattern, never a folder**. One folder holds all three
kinds side by side: `public/sprites/player/` has the bro's sheets
(supplied), their `.webp` twins (made, by the bot) and `anchors.json`
(data). Each file in reach matches exactly one row of
`tools/assets/families.mjs`; a file no row matches is `unsorted`.

- **supplied**: came from outside the repository (a ChatGPT sheet, an
  upload, a recording, the owner's own art). The door finishes only these.
- **made**: written by a tool in the repository from named sources. It
  changes when its source or its tool changes, re-made by that tool. The door
  never rewrites it. In doubt, a family is made with its tool `unknown`,
  never supplied.
- **data**: bytes the game reads as numbers, not colours. **The 223 look
  sheets** (`public/sprites/look/**/*.png`) hold colour NUMBERS in red and
  green (`src/rendering/lookUnpack.js`): put on 256 colours, every body would
  be scrambled, and today's checks would not see it. They are data, and so
  are their `roles.json`, the anchors, the maps, the Wheel's bakes and the
  portrait atlas. The door never rewrites a data file.

A row holds: its path pattern (and `not`, what a wider pattern leaves to a
narrower row); its kind; for a made family, its tool and its sources; its
draw path; its bundle of colours; its pixel-size rule; its bar.

- **The draw path** is one of a closed list taken from the code
  (`DRAWS`), each naming its module: `file` (a picture on its own colours),
  `numbers` (`paletteTex.js`, `picsNumbers.js`), `strip`
  (`loadTrackedStrip`), `look` (`lookPalette.js`), `wheel`
  (`paletteLoad.js`), `dom` (a picture in the page), `sfx` (`sfxCache.js`),
  `music` (the music deck), `data`, `none` (nothing loads it). The path is
  the one taken today with every switch at its default: `?p256` is off, so
  the effects are `file` and their `.p256.png` twins `none`.
- **The bundle of colours** is the group that shares one row of the palette
  atlas (`picsNumbers.js` `rowFor`). The atlas has 256 rows; when it is full
  a picture silently falls back to four bytes a pixel (`docs/MEMORY-MAP.md`).
- **The pixel-size rule** is the art law's (2 px a game px,
  `public/tools/style/bible.js`) or the frame size the family's loader
  assumes.
- **The bar**: at most 256 colours, that size, read back by the game's
  reader (`src/rendering/png8Decode.js`). Recorded for every picture family;
  held by the gate for supplied families only. A family over its bar today is
  counted in the census, not failed.

### The record: `tools/assets/shipped.json`

One row a file in reach: its path, its bytes, the SHA-256 of its bytes, its
family and its kind. A file the door made (part 3 on) also carries `door`:
its sources' hashes, its recipe and the tool's tag. The head holds the
totals (files, bytes, families, the count of each kind and of `unsorted`),
made from the rows.

```
node tools/assets/shipped.mjs               how shipped.json compares with public/ today
node tools/assets/shipped.mjs --families    one line a family: kind, draw path, files, MB, over its bar
node tools/assets/shipped.mjs --write       write shipped.json again
```

Written by `--write`, never by hand. Like `weights.mjs`, it REPORTS and
fails nothing: the gate is part 4.

### Readings taken in building the table

The card's readings decide most rows. Where the code left a choice open,
this table took one reading, recorded here so a row can be read the same way
the next time:

- **Supplied, or made by a tool from sources not kept?** A file a repository
  tool wrote from inputs the repository does NOT keep (a ChatGPT sheet given
  on the command line, an upload deleted after its cut, a studio's own
  storage) is **supplied**: no tool here can make it again, and the file is
  the only copy of art that came from outside. The importing tool is named
  in the row's note, never as its `tool`. This is the card's own example:
  the bro's sheets were cut by `tools/build_player_attack_sheets.py` and
  `tools/repack-dodge-grid.mjs` from uploads that are gone, and the card
  calls them supplied. **Made** means a tool here makes the file from
  sources the repository keeps (under `assets/`, `tools/**/src-art`,
  `public/` itself), named in `sources`; or that nothing shows what made it
  (`tool: 'unknown'`: the card's "in doubt"). A made file later mended in
  place by another tool stays made (the jog legs: "do not re-run as it is").
- **A `.png` with a `.webp` twin is `none`.** `webpImage.js loadWebpOrPng`
  asks for the twin first (the build lists every twin), so the `.png` is
  fetched only if its twin fails: the twin is what is drawn. The `.png` is
  the twin's source and the look sheets' source; `none` here means "nothing
  draws it", not "nothing needs it".
- **Phones and computers.** The look palette is on by default except on
  Windows and Mac (`src/game/lookPaletteChoice.js`): a phone draws a coloured
  body, the combat armour, the weapons and the townsfolk from the look sheets
  and never fetches their pictures; a computer fetches them. Those families
  are `file`, with a note saying what a phone draws instead, so that `none`
  always means no device loads the file by default. The census (part 2) is
  measured on the memory check's phone, so their MB there is what a phone
  holds.
- **Decoded, not streamed.** The ambient loops (`public/audio/ambient/`)
  are decoded whole at 24 kHz (`BT_AUDIO.loadSample`), so they are `sfx`,
  not `music`; only the music and the dance beat go through the music deck.
- **The farm is `wheel`.** `paletteLoad.js` reads the farm's palette
  pictures as colour numbers; the closed list puts that module under
  `wheel`.
- **A picture copied onto a canvas** (the bag's icons in `lootIcons.js`,
  `dropIcons.js`, `nodeLabels.js`) keeps the draw path of the file itself
  (`dom`); the canvas is a texture made in play, which the census lists as
  `in play` and no family holds.

### At tag 5241

**3,225 files in reach, 157,445,958 bytes (150.2 MB), in 200 families.**

| kind | files | MB on disk | over the bar (not read by `png8Decode.js`) |
|---|--:|--:|--:|
| supplied | 797 | 62.6 | 565 |
| made | 2,077 | 80.7 | 1,727 |
| data | 351 | 6.9 | (no bar) |
| `unsorted` | **0** | 0 | |

The 223 look sheets are data (nine families, `look-*`), with their nine
`roles.json`. By draw path: `dom` 1,035 files, `file` 899, `none` 545,
`look` 223, `wheel` 217, `data` 122, `sfx` 109, `strip` 62, `music` 13.

"Over the bar" counts a picture the game's reader does not read: every WebP
and JPEG, and every PNG that is not an 8-bit palette PNG. Most of the made
files over it are the bot's lossless `.webp` twins of RGBA sheets. The bar's
size (the pixel-size rule) is read by the gate (part 4), not here. Bytes on
disk are not the measure: part 2 measures what each family holds at the
memory check's fight.
