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

## 2. The measure: MB held at the memory check's fight (step 9.1, part two; tag 5242)

The measure is **MB held at the fight, not a file's bytes**. The `.p256.png`
twins taught it (`docs/specs/pictures-256.md`): 256 colours in a file saved
nothing on the chip until the picture was held as colour numbers.

### One ruler

The memory check's own trip (`tools/qa/mp/mp-membudget.mjs`: a phone, 390 x
844 at dpr 3, BroTown to a fight at the Flame Fields' inner end and home,
three times), read its own way (`memprobe.mjs`: two forced collections), at
its three fights. With **`QA_MB_ROWS=1`** each fight stop also carries every
row of what the page holds, read in the same moment (`memprobe.mjs`
`__memRows`):

| column | what | read from |
|---|---|---|
| chip | every texture on the graphics chip, at its own size (bytes a pixel by format, x 4/3 with mipmaps) | `window.__btGpuTex()`, all rows (the check reads only its total) |
| page | every picture the asset cache holds in the page, four bytes a pixel | `window.__btTex(true)` |
| numbers | the colour numbers the page keeps beside a texture, one byte a pixel | the chip's and the cache's sources (`__btGpuTexSources`) and the monsters' strips (`__btPicNumSources`) whose numbers are still their resource |
| sound | each decoded sound, by its file | BT_AUDIO's own maps: a sample's file is its tag (`_sampleTag`), a zone track its address, the session track `GLOBAL_MUSIC`; a buffer two keys share counted once |
| atlas | the palette atlas's rows: used, the most, how often it was full; the monsters' bundles | `__btPalette()`, `__btPicNumbers()` |

**Without `QA_MB_ROWS` the check asks the page exactly what it asked
before**: it runs on every PR, and its lines are unchanged.

### Rows to families

`tools/assets/fightmb.mjs` matches each row to its family by its label's
path. A label names a file in reach in two forms:

- its address: `/sprites/x.png` is `public/sprites/x.png`, a row of
  `shipped.json`, and that row's family. A picture with no label of its own
  is named by its file (its image's `src`), and the page's copies by their
  source, not by the cache's key: the cache keys some pictures by the
  element itself (`[object HTMLImageElement]`);
- a look sheet's texture, `bt-look:<set>/<sheet>` (`bt-look:<sheet>` for the
  body set, `src/rendering/lookPalette.js`), which is
  `public/sprites/look/<set>/<sheet>.png` drawn as it is.

A label that is not a file in reach is a texture **made in play** (a canvas,
a render texture, a Wheel ground piece, a look atlas page `bt-look:page/...`
holding many sheets laid out in play): `in play: <label>`, its digits folded
to `#`, and one line `in play: unnamed` for every texture with no label and
no file, with its kinds on the chip beside it (render, canvas, buffer).
Those are the renderers' bakes: listed for reading, never a family, never the
door's to change.

**The backlog column.** A data family is never the backlog's (the door never
rewrites data: the look sheets are colour NUMBERS, and they hold real MB at
the fight). Nor is a sound (the door re-encodes no sound: decoding every
sound at 24 kHz is the owner's call, MEMORY-MAP's list). A made family is
taken only by changing its own tool, and a backlog PR may change a loader
rather than a file (a family already on 256 colours but held at four bytes a
pixel is put in its slot's form). A family
whose loader, or whose draw path's module, is one of the files card P leaves
alone while card H runs ("Files P waits on": `zoneTextures.js` and
`stripRead.js` for a strip, `soundFold.js` for a sound, `entityRenderer.js`,
`gearSheets.js`, `characterPortrait.js` and the rest, `fightmb.mjs`
`WAITS_ON_H`) goes after H, and the next family that is free goes first.

A family's **MB at the fight** is the most it held at any one fight stop of
any run (chip + page + numbers + sound at that stop): the highest of three
runs. The census is `docs/plan/census/assets.md`, one row a family, most MB
held first: the backlog's order.

```
QA_MB_ROWS=1 node tools/qa/mp/run.mjs membudget      three times, keeping each out/membudget.json
node tools/assets/fightmb.mjs a.json b.json c.json --write
```

### At tag 5242: three runs

Three runs of `QA_MB_ROWS=1 node tools/qa/mp/run.mjs membudget`, each 11 of
11 assertions passed; the census is `docs/plan/census/assets.md`.

- **Every fight stop's rows add up to its lines**: the chip's rows to within
  0.3 MB of the `gpu` line (60.6 to 68.6 MB), the page's to the `artCache`
  line (48.75 against 48.7), sound by file to BT_AUDIO's own count (17.5 to
  18.1). So nothing the lines count is left out of the census.
- **49 families hold something at the fight; 36 hold 1 MB or more**, where
  the backlog's line falls. The most: the fire goblin's strips (8.1 MB:
  2.6 on the chip, 5.5 of colour numbers in the page), the owner's sounds
  (5.9 decoded), the tree tiers (5.6 in the page), the walking armour's twins
  (5.0 on the chip; card H's `pack-page`), the slimes (4.6 in the page).
- **Six look families hold 16.8 MB on the chip.** They are data: never the
  backlog's.
- **Made in play** (no family): unnamed textures 22.2 MB (canvases 16.6 on
  the chip), pictures made from bytes 10.5 (`blob:`: the baked bodies,
  `bodyBake.js`; canvases kept as images, `keepAsImage.js`), the Wheel's
  ground pieces 8.6 (57 rows of the atlas), the look atlas's pages 5.3.
- **The palette atlas**: 100 to 104 rows of 256 used at the fights, never
  full (`rowsFull` 0); the monsters' bundle there, `fireGoblin`.
- **151 families hold nothing at the fight**: another land's, a window's, a
  computer's, or nothing's (`none`: 545 files).

**And without the opt-in**, one run of `node tools/qa/mp/run.mjs membudget`
read no rows at any stop and stayed within every line of
`tools/qa/mp/memory-budget.mjs` (11 of 11): `artCache` 48.7 of 112, `gpu`
72.1 of 115, `canvases` 15.4 of 56, `sound` 18.1 of 22, `heap` 36.4 of
38.5, `buffers` 21.4 of 22, `workers` 19.4 of 36. No line changes in this
PR.

## 3. One finishing tool (step 9.2; tag 5243)

`tools/assets/finish.mjs`: the colour and file step after the art step
(`public/tools/style/process.js` keys out, splits and snaps new art to the
grid). Four steps, each a function the old tools now call:

1. **decode** (`readRgba`): ffmpeg, every pixel's own RGBA, no colour
   management (`strip256.mjs`'s way). For the townsfolk's lossless WebPs,
   ffmpeg and PIL give the same bytes: all 65 of `public/sprites/npc/*.webp`
   compared.
2. **the bundle on its colours** (`onColours`): `quant256.js` over every
   pixel of the bundle at once (`strip256.mjs --shared`'s way), so a bundle
   shares one row of the atlas. One picture alone is put on its own colours,
   exactly as before.
3. **encode** (`encodePng`, `writeWebp`): a palette PNG (`png8.js`); a
   lossless WebP where the family's address is a `.webp` (PIL, as
   `npc256.mjs`).
4. **verify** (`verifyPng`): read back through the game's own reader
   (`src/rendering/png8Decode.js`): exactly the colours written, at the
   size. A WebP is read back by PIL (the game's reader reads palette PNGs
   only). Then the row in `shipped.json` with `door`: its sources' hashes,
   its recipe (bundle, colours, how far its pixels moved, encoder, pixel
   rule and whether it held) and the tool's tag (`recordRows`).

```
node tools/assets/finish.mjs <family> <file> [...]        into the family's folder, under the file's own name
node tools/assets/finish.mjs <family> <file> --to <path>  one file, to an address of the family
  --shared   every file named on one list of colours        --dry   write nothing
node tools/assets/finish.mjs --bounds
```

**What it refuses**, each with the reason and the numbers:

- a family that is not **supplied** (a made one is re-made by its own tool,
  named; data is never rewritten), and a family with no bar (a sound is
  never encoded a second time);
- an input over its **bounds**: the largest picture, sound and file in reach
  at tag 5243, taken from what exists (`public/maps/farm_v2.png`, 2048 x 2816
  = 5,767,168 pixels; 7,424 wide; 2,916,937 bytes,
  `public/audio/music/world.mp3`). The owner's own limits replace them when
  given;
- an output that is not an address of the family (its pattern, matched by
  `shipped.mjs`), and **an input written over**: the output goes to the
  family's address, never the input's (an upload stays byte for byte);
- a name that is not plain letters, digits, `-`, `_` and `.` (words in a
  picture, a tag, a signed record or a file's name are data: `--to` says
  where it goes);
- a picture that is not whole frames of its family's pixel rule (`frame` or
  `cells WxH`).

**The three old tools keep their command lines** and call these steps:
`tools/art/strip256.mjs` (decode, colours, encode; its read-back is now the
game's reader, where it was ffmpeg; its `--shared` step keeps its own call
`reduce256(all, total, 1)` on `finish.mjs`'s `joinPixels`, because
`server/test/monster-palettes.test.mjs` reads that line), `tools/art/reduce256.mjs` (the same),
`tools/art/npc256.mjs` (decode by ffmpeg where it was PIL, colours, encode,
the WebP). A cut stays authored: each `cut_*` script holds one animal's cut
and calls `strip256.mjs`.

**Compared, not committed** (tag 5243, scratch worktrees of the commit before
and after): each old tool and its new self on the same input gave **the same
bytes**:

- `strip256.mjs` on the stun stars alone (80,038 colours, 2048 x 256) and
  `--shared` with the fire trail;
- `reduce256.mjs` on the fire trail alone (30,324 colours): the same twin and
  the same `src/data/p256Files.js`;
- `npc256.mjs` on a 23,050-colour lossless WebP in a townsperson's place.

And `finish.mjs fx-coinflip` on a 1408 x 192 picture: a lossless WebP of 256
colours at `public/sprites/fx/coinflip-test.webp`, its row with `door`, the
input untouched; every refusal above tried once. Nothing any of them made is
made again in this PR.

`shipped.mjs` (v2.3.5243): a tracked file deleted in the working tree is no
longer in reach (its row reads as a row with no file), where the compare
crashed reading it.
