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
- **The bar**: at most 256 colours, that size, read from the file's own
  bytes: a PNG by the game's reader (`src/rendering/png8Decode.js`), a WebP
  by its colour index (`shipped.mjs` `webpColours`, tag 5244); a JPEG is
  over it. Recorded for every picture family;
  held by the gate for supplied families only. A family over its bar today is
  counted in the census, not failed.

### The record: `tools/assets/shipped.json`

One row a file in reach: its path, its bytes, the SHA-256 of its bytes, its
family and its kind. A file the door made (part 3 on) also carries `door`:
its sources' hashes, its recipe and the tool's tag. One row a line, in path
order, and no totals (tag 5244: the gatekeeper's sitting 5 found that two
PRs changing a file in reach would both rewrite a `"bytes"` line, and the
second could not merge with one press); the tool prints the totals, made
from the rows.

**A sprite's `.webp` twin is its PNG's row** (tag 5244, the same sitting). A
push that changes `public/sprites/player/**` or `gear/**` gets a
`github-actions[bot]` commit with each PNG's lossless twin
(`optimize-assets.yml`, which runs on a push to any branch, `main` included,
after a merge too); a twin is never committed by hand (precheck
`sprite-webp`). A twin the bot puts on `main` after a merge would have no
row, and turn every PR's gate red. So a `.webp` there whose `.png` is
tracked beside it is not recorded and not held (`inReach` leaves it out,
`botTwins` lists it; 195 at tag 5244). `--families` and `fightmb.mjs` still
count the twins under their families: they are what the game fetches. A
`.webp` there with no `.png` beside it (its PNG removed) is in reach like any
other file.

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

## 4. The gate (step 9.3; tag 5244)

`tools/guards/asset-door.test.mjs`, in card B's form (`asset-sources.test.mjs`:
its header lists the holds and their break proofs, `ROOT` from
`tools/guards/lib/fourLines.mjs`); `cd server && npm test` runs it with every
guard and suite (1.2 s, the 150 MB hashed). It fails:

1. a file in reach with no row;
2. a row with no file;
3. a file whose bytes or hash are not its row's (changed outside the door: the
   mend is its own tool, then `node tools/assets/shipped.mjs --write`);
4. a file two families match;
5. a rise in `unsorted` (a census: at most 0 today; it only falls, and the
   gatekeeper alone makes it strict);
6. a file of a supplied family over its bar: a PNG the game's reader
   (`png8Decode.js`) does not read, a WebP whose own colour index does not
   say 256 colours or fewer, a JPEG. A census by family (`OVER_BAR`: 565
   files in 32 families at tag 5244, the bro's sheets, the head pieces'
   originals, the uploads' cuts), each count only falls. A picture within its
   bar must be whole frames of its family's pixel rule where the rule names
   a frame or a cell (11 of the 36 supplied families with a bar; the others
   state no size). `finish.mjs` writes a WebP with a colour index and checks
   it (libwebp chooses: 25 of 25 tried kept one at effort 6; one without is
   written again at the next effort down, or the run stops), so a file it
   finishes is within the bar;
7. a look sheet that `lookExpand.js` `lookSheetParse` will not read, or whose
   hash is not its row's. Read the game's way: the picture's pixels as a
   canvas gives them (a see-through texel reads 0,0,0,0; a partly see-through
   one fails, its number would change), its manifest row and its set's roles
   (`roles.json`), the spec (`lookUnpack.js` `lookSheetSpec`), the bytes
   (`unpackLookSheet`), the parse (its rows, table start, scale and roles as
   the manifest says); and every colour number below its table's entries (a
   shirt's number is its red: its green is its frame + 1, `shirt-bake.mjs`).
   The sheets are every one a set's `roles.json` names, and every PNG of a
   family drawn `look`; each must be in a family of kind `data` drawn `look`,
   so a one-line change of the table's kind cannot take them out of the hold
   (the gatekeeper's sitting 5);
8. a record that would not merge with one press: totals in its head, rows out
   of path order or twice, not one a line as `--write` writes them; or a row
   whose family or kind is not the table's today (a family moved without
   `--write`).

It never makes a file again to compare: it compares recorded hashes and reads
files through the game's own readers. Each hold's break proof is in the
guard's header, tried once by hand: each turned its hold red, and the tree
green again after.

**`lookSheetSpec`, one copy.** A sheet's shape (its rows on the chip and its
header) was built inside `lookPalette.js` `buildSheet`, which imports
`pixi.js`, which GitHub's `test` job does not have. It moved, unchanged, to
`src/rendering/lookUnpack.js` (no imports), with `LOOK_KIND_IDS` and the most
roles; `lookPalette.js` imports it (and still exports `LOOK_KIND_IDS`), and the
gate imports the same. The planning session's answer (2026-11-14): one shape,
never a twin in the guard (part 5, rule 2). Compared before and after: the
same spec for every one of the 223 sheets, at book 0 and 70,000 (446 of 446).

## 5. The backlog, a family a PR (step 9.5; tags 5245 on)

In the census's order, most MB held at the fight first; a family whose
loader is card H's after H; a data family or a sound never. The planning
session's rule for a conversion to colour numbers (2026-11-14): it may raise
`buffers` by exactly what it moves there, if the same PR lowers the line the
family was held in by its full amount and says both and the net. The owner
(the same day, "Go recommended"): the slimes load as you walk in the Wheel,
and the effects' 256-colour twins go on, each family its own PR.

| tag | family | what changed | at the fight (three runs) | line |
|---|---|---|---|---|
| 5245 | the 19 `.m4a` | removed: nothing named them, the MP3 beside each plays | nothing loaded them | none |
| 5246 | `npc-heads` | the dialogue portraits let go of once loaded: an `<img>` reads them from the HTTP cache (`npcSprites.js`, `?npcheads=0`) | `artCache` 48.7 -> 45.8; `buffers` 21.1-21.3, unchanged | `artCache` 112 -> 109.1 |
| 5247 | `fx-coinflip` | Ace's two coin strips let go of once loaded: his window draws them as a CSS background, and now asks for the address the loading screen warmed (`npcArtUrl`'s `?v=`: before, the warm never served it) (`npcSprites.js`, `AceFlipPanel.jsx`, `?coinflip=0`). Taken before `tree-tiers`, which waited on a question (the measure counted colour numbers twice) | `artCache` 45.8 -> 43.7; `buffers` 21.1-21.4, unchanged; atlas 58-104 rows, never full | `artCache` 109.1 -> 107.0 |
| 5248 | `tree-tiers` | the woods' five trees read as colour numbers (`paletteLoad.js`; effectsRenderer.js asks for them once the renderer has said whether pictures are drawn so, p256.js `whenPaletteDecided`, still behind the loading screen; `?treenumbers=0`). And the measure mended (the planning session's yes): `__btTex` counted a numbers picture at four bytes a pixel though its page copy is its numbers, `buffers`' already; one rule now, `src/rendering/cacheBytes.js`, read by `__btTex` and memprobe's page rows, held by `tools/guards/cache-bytes.test.mjs` (five holds, each break proof tried). The chip counts a drawn tree at a byte a pixel (`r8unorm`, seen at each of the five) | `artCache` 43.7 -> 38.1; `buffers` 21.1-21.4 -> 22.5-22.6 (the trees' numbers, 1.40 MB); `gpu` 69.8-73.3, no rise; atlas 78-107 rows, never full | `artCache` 107.0 -> 101.4; `buffers` 22 -> 23.4; net 4.2 MB less |
| 5249 | `fx-made` | the effects the game's tools made drawn from their 256-colour twins as colour numbers (the owner's "Go recommended": the effects' twins on, a family a PR): `p256.js` reads a twin for one family at a time now, `fx-made` on by default (`?fxmade=0` off; `?p256=1` every twin, `?p256=0` none). The family table: the seven twins are `fx-made-twins`, drawn as numbers; the originals only where the twins are not; the stale `sfx-m4a` row dropped. Mended at the gatekeeper's sitting 8: not the snowball's burst (it loads as you walk toward the frost land, in play, and a twin's numbers are read off a canvas on the page), and `?fxmade` and `?p256` given their rows in card T's switch table | `artCache` 38.1 -> 35.0; `gpu` 71.2-76.2 (the effects up front, 1.05 MB at a byte a pixel); `buffers` 22.9-23.1 (packed numbers), within its line; atlas 110-115 rows, never full | `artCache` 101.4 -> 98.3 |
| 5250 | `icons-items-world` | the icons drawn in the world read from 256-colour twins as colour numbers: `tools/art/reduce256.mjs` twins them by name (WebPs, twinned even within 256 colours, as only a palette PNG is read as numbers; its 18 twins before came out byte for byte the same), `p256.js` reads them by default (`?worldicons=0`); the arrow, dice, spell and xp popups have none (their widths need padding). Mended at sitting 9: not the trap's box (a missed trap's break cuts its pixels after the pack has emptied them: `trapFx.js` `_missBreak`, `wheelShatter.js` `cutPicture`); the heart popup's cut through `readSourceRect`; `?worldicons` in the switch table. `fx-sheets-supplied` before it was measured and not converted: its 2 MB at the fight is the whirlwind, whose declined pack `gearSheets.js` kept as a picture (the next family PR's road, now gearSheets.js is card P's) | `artCache` 35.0 -> 33.8; `buffers` 23.0-23.3 (the icons' numbers, 0.30 MB); `gpu` 73.4-76.0 (0.35 MB of icons); atlas 82-130 rows, never full | `artCache` 98.3 -> 97.1; `buffers` 23.4 -> 23.7; net 0.9 MB less |
| 5252 | `fx-sheets-supplied` | the effects cut from the owner's sheets (the stun stars, the whirlwind, the grease, woodchips, rocks and splash bursts) read from their twins (`?fxsheets=0`); `gearSheets.js` (card P's since the planning session's word: card H done in substance) reads a twin whose pack is declined as colour numbers whole, where it kept it a picture: the whirlwind, the family's whole 2 MB at the fight (measured and not converted at 5250's turn for that reason) | `artCache` 33.8 -> 31.8; `buffers` 23.4-23.5; `gpu` 75.0-77.2 (1.51 MB of sheets); atlas 117-135 rows, never full. With the sitting-9 mends (three runs at `cc8fea875`): `artCache` 31.9, `buffers` 23.4-23.5, `gpu` 74.8-75.1, atlas 118-135 rows, never full; the census unchanged, 1.51 MB | `artCache` 97.1 -> 95.1; `buffers` 23.7 -> 24.2 (the whirlwind's numbers, 0.50 MB); the page's lines 1.5 MB less; by the census, chip counted, 2.00 -> 1.51 MB: 0.49 MB less (sitting 9) |
