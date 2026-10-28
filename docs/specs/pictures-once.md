# Every picture from a file held once (v2.3.3715)

The owner, 2026-10-28: *"The game needs to be extremely memory efficient."*
iPhone Safari closes the tab at about 250 MB; a big fight holds about 335 MB on
the memory check's measure.

Two switches, both **on by default**. The owner, 2026-10-28: *"I think
including the new memory change work by default would be better. I can always
revert the change if I don't like it or it doesn't work well."* `?onecopy=0`
and `?picnumbers=0` in the address turn each off for one phone (the game
exactly as before):

| switch | what it does | file |
|---|---|---|
| `?onecopy` | a picture from a file that is on the graphics chip lets go of its copy in the page; an ImageBitmap never drawn becomes an `<img>` | `src/rendering/picsOnce.js` |
| `?picnumbers` | a monster's strips are read into colour numbers as they are packed and sent to the chip as them (a byte a pixel, their colours a row of the shared atlas) | `src/rendering/picsNumbers.js` |

`?gpucopies` and QA's `__btTrimVerify` also keep everything as it was. Probes: `window.__btPicsOnce()`, `window.__btPicNumbers()`.

## 1. The census: what the page and the chip hold at a fight

`mp-picsonce` (a phone, 390 x 844 at 3x, in the Wheel's BroTown, walked to the
Flame Fields' goblins, a fight) lists every picture in Pixi's asset cache --
what `mp-membudget`'s **artCache** line counts, 102.2 MB on main -- and every
texture on the chip, with its size, what it is kept as, whether it is on the
chip, how many colours it is drawn on, what draws it, and whether anything read
it back on the CPU (a 2D canvas's `drawImage` / `createPattern` /
`createImageBitmap` of it, caught by an init script with the reader's place in
the code). Results in `tools/qa/mp/out/picsonce.json`.

**The task's premise -- "once a picture from a file is drawn, the page keeps it
twice" -- describes 1.1 MB of the 102.2.** What the line counts:

| kept as | pictures | counted | on the chip | what it really is |
|---|--:|--:|--:|---|
| a canvas, still full, not drawn | 92 | 31.6 MB | -- | the game's own crops waiting to be drawn: 14 MB of them the fire goblin's packed strips (256 colours or fewer); also counted by the `canvases` line |
| an `<img>`, never drawn | 78 | 28.6 MB | -- | loaded behind the loading screen (the preload law) and not drawn yet at this fight: the death sheet, the pets, the coin flip, effects. A browser keeps an `<img>`'s file and decodes it when it is drawn, so most of this is the line's way of counting, not memory |
| **a canvas already emptied** | 38 | **21.6 MB** | 21.6 MB | gpuOnly.js / heldNumbers.js emptied these once on the chip: the probe counted them at their texture's size. **Nothing is held: a measuring mistake**, fixed (below) |
| an ImageBitmap, never drawn | 51 | 17.7 MB | -- | the trees', rocks', icons' and shards' pictures, loaded by modules as they are first read -- before pixiRenderer.js's `preferCreateImageBitmap: false` line runs -- so they came back as ImageBitmaps (decoded, in the page, and the very kind v2.3.778 banned: an iPhone's memory purge empties them) |
| a canvas, on the chip | 4 | 1.7 MB | 1.7 MB | |
| **an `<img>`, on the chip** | 5 | **1.1 MB** | 1.1 MB | the portal's beam, the health bars, the talk and quest pins: the held-twice case |

By family (the asset cache only):

| family | kept as | n | counted MB | on chip MB | <=256 colours MB | >256 MB | read back |
|---|---|--:|--:|--:|--:|--:|--:|
| (a canvas the game drew, unnamed) | canvas | 73 | 31.3 | 1.7 | 15.7 | 15.6 | 0 |
| `/sprites/gear/` (combat poses' gear strips) | canvas, emptied | 33 | 13.9 | 13.9 | -- | -- | 0 |
| (monster strip, packed, held as numbers) | canvas, emptied | 6 | 8.9 | 8.9 | 8.9 | -- | 0 |
| `/sprites/trees/` | ImageBitmap | 5 | 5.6 | 0 | 5.6 | 0 | 0 |
| `/sprites/monsters/` (slimes) | img | 8 | 5.1 | 0 | 5.1 | 0 | 0 |
| (unnamed: the body sheets' files) | img | 2 | 4.7 | 0 | 0 | 4.7 | 2 |
| `/sprites/traits/` | img | 16 | 4.0 | 0 | 0.8 | 3.3 | 0 |
| `/icons/ui/` | ImageBitmap | 11 | 3.5 | 0 | 0 | 3.5 | 0 |
| `/sprites/fx/` | img | 4 | 3.0 | 0.8 | 0 | 3.0 | 0 |
| `/icons/shards/` | ImageBitmap | 9 | 2.3 | 0 | 0 | 2.3 | 0 |
| `/sprites/player/` | img | 5 | 2.2 | 0 | 2.2 | 0 | 0 |
| `/sprites/effects/` | img | 1 | 2.0 | 0 | 0 | 2.0 | 0 |
| `/sprites/world/` | ImageBitmap | 1 | 1.5 | 0 | 0 | 1.5 | 0 |
| `/icons/items/` | ImageBitmap | 6 | 1.5 | 0 | 0 | 1.5 | 0 |
| `/sprites/players/`, `/sprites/pets/`, `/sprites/player-naked/` | img | 7 | 3.9 | 0 | 0 | 3.9 | 0 |
| `/sprites/weapons/` | img | 14 | 1.2 | 0 | 0 | 1.1 | 7 |
| `/sprites/ore/` | ImageBitmap | 5 | 1.2 | 0 | 1.2 | 0 | 0 |
| `/sprites/npc/` | img | 8 | 1.1 | 0 | 1.1 | 0 | 0 |
| `/sprites/props/`, `/icons/ui/` imgs, `/sprites/projectiles/`, `/icons/popups/` | img, ImageBitmap | 21 | 4.3 | 0 | 0 | 4.3 | 0 |
| `/ui/bars/`, `/ui/quest/`, `/sprites/shields/` | img | 9 | 0.6 | 0.3 | 0 | 0.5 | 0 |

The chip at the same fight (about 80 MB): 24.9 MB the emptied canvases (the
combat poses' gear, the weapons' bodies), 21.1 MB `<img>`s on more than 256
colours (the walking armour and body sheets kept as images of themselves,
packed-as-images.md: not in the asset cache), 15.0 MB canvases on 256 colours
or fewer (the monsters' strips), 4.6 MB the Wheel's objects already as colour
numbers, 2.7 MB `<img>`s on 256 colours or fewer.

### Who reads a picture from a file back on the CPU

The census caught two readers at the fight, both as the pictures load (before
any is drawn): the body sheets' bake (`entityRenderer`), and the weapons' cut
(`weaponSprites.js`). The code's other readers of `source.resource`, read for
this: the body and gear sheets (`entityRenderer` `drawGearFrame`, `gearSheets.js`),
the eye styles (`eyeStyleColorCatalog.js`), the popups' icons
(`effectsRenderer` `_tightPopupIcon`), the chop strip (`effectsRenderer`
`_cropChop`), the props', trees' and rocks' shadow bases (`propGround.js`
`readArtBottoms`), the hot arrow (`hotArrowFx.js`), the prop chips
(`hitMaterialFx.js`, through `drawSourceRect`), the shatter (`wheelShatter.js`),
the maps (`MapPanel.jsx`, the minimap), the townsfolk (`npcSprites.js`) and the
QA probes on the bro's body (`pixiRenderer.js`). A monster's strip is read
through `heldNumbers.js` `readSourceRect` (the hit chips, a stuck arrow).

## 2. One copy (`?onecopy`, on by default)

`picsOnce.js`. Every second a sweep looks at the asset cache:

- **On the chip, nothing reads it back** (the families `/sprites/fx/`,
  `/sprites/effects/`, `/ui/`, `/icons/ui/` -- `ONLY_DRAWN`; a family is added
  only after its readers are checked): its `<img>` or ImageBitmap is let go of.
  The source keeps a stand-in of its size, so nothing that measures it changes,
  and Pixi's second hold (`options.resource`) goes too. Not closed: a module
  that kept the `<img>` or ImageBitmap itself still draws from it.
- **Pixi's collector takes it off the chip** (60 s undrawn): the `unload` Pixi
  sends brings the page copy back from its file at once (the browser's cache has
  it); it holds its `<img>` as before until it is drawn again.
- **The graphics are lost**: every page copy is loaded again at once, and a
  rebuilt renderer waits for them before its first frame (`createPixiApp`,
  `restoreAllPictures`), behind the rebuild's own wait.
- **A chip asked for one with no page copy anyway**: its space is made empty,
  the file loaded and sent the moment it is in (`blankUploads`, which every
  test reads as 0).
- **An ImageBitmap never drawn** is loaded again as an `<img>` and let go of:
  the same picture, decoded only when drawn, and safe from the purge v2.3.778
  was about.

`keepPageCopy(source)` is the door for a new reader.

## 3. Colour numbers on the chip (`?picnumbers`, on by default)

**No picture's colours are reduced**: only a strip already drawn on 256
colours or fewer is kept this way, every pixel its own colour (the
orchestrator's census with PIL: 48 of the 66 monster strips are; the snowman
and a few others run to 24,000-112,000 colours and keep their canvases).

`picsNumbers.js`, called by `zoneTextures.js` `loadTrackedStrip`. A monster's
strip is read into its colour numbers the moment it is packed (behind its
loading screen, where it was packed) and its canvas let go of there and then;
the chip gets the numbers, one byte a pixel, coloured as it draws by the program
the Wheel's ground and objects use (`paletteTex.js`). A rebuilt renderer is sent
the numbers at once from the page: no canvas for Safari to empty. The readers
read the numbers (`readSourceRect`), as they already did once a strip was held.
The whirlwind's one-colour catch draws a strip kept this way with the
colour-numbers program's twin (`paletteTex.js` `PAL_FILL_BATCHER`, routed by
`fillBatch.js`, compiled behind the loading screen by `warmPicNumbers`).

A monster's strips share rows of the atlas (new colours are added after the
old; a second row only when the first has no room), given back when the
bundle's art goes (`unloadBundle`). The fire goblin's 14 strips each brought
enough new edge colours to need a row of their own (14 of the 256); a full
atlas, more than 256 colours, or a device without the program packs the canvas
exactly as before.

Not covered, and why: the effect strips at the fight are on more than 256
colours; the townsfolk and icons are not on the chip at the fight; a picture
from a file on 256 colours or fewer and on the chip is 2.7 MB.

## 4. The measuring mistake

`window.__btTex` (`pixiApp.js`) counted a canvas source at its texture's size.
A canvas emptied once its copy is on the chip (`keepOnGpuOnly`,
`heldNumbers.js`) holds nothing, and was counted whole: 21.6 MB of the
`artCache` line at the census's fight. It now counts a canvas by what the
canvas holds. This changes the reading, not the game.

## 5. Measured

`mp-membudget` (a phone in BroTown, a Flame Fields fight and home, three
times), one build, `QA_MB_QUERY` for each way. MB, the fight's average over
the three trips (the line's highest in brackets). **main** is the build before
this change; **neither** is this change with `onecopy=0&picnumbers=0` (the
probe fixed, nothing else):

| line | main | neither | `?onecopy` alone | `?picnumbers` alone | both (the default) |
|---|--:|--:|--:|--:|--:|
| artCache (art loaded from files) | 102.2 (102.2) | 78.9 (79.4) | 78.6 (79.1) | 66.1 (66.1) | 65.8 (65.8) |
| gpu (the graphics chip) | 84.6 (85.4) | 83.8 (85.3) | 84.9 (87.5) | 75.6 (80.6) | 75.2 (82.5) |
| canvases | 38.8 (39.4) | 39.8 (42.2) | 39.4 (40.2) | 26.5 (27.5) | 26.7 (27.5) |
| buffers | 16.3 (20.6) | 16.8 (20.6) | 16.2 (20.6) | 19.4 (20.4) | 19.6 (20.6) |
| heap | 32.2 (33.1) | 32.1 (33.4) | 32.2 (33.2) | 32.2 (33.4) | 32.5 (33.2) |
| sound, workers | 27, 28.5 | the same | the same | the same | the same |

Every run passed every line and the third trip ended where the second did.
The chip's highest reading moves by 2-3 MB run to run on this box (it is
taken anywhere on the trip); the fight's average is the steadier figure.

What each part saves, at the fight:

- **the probe** (not memory): 21.6-23.3 MB of canvases already emptied no
  longer counted;
- **`?picnumbers`**: the fire goblin's 14 strips, 22.2 MB of canvases as 5.5 MB
  of numbers -- the page 13 MB fewer canvases and 2.6 MB more buffers, the
  chip 8-9 MB less. At home the goblins' art is let go of either way, so home
  reads the same;
- **`?onecopy`**: 1.1 MB of `<img>`s on the chip let go of, and 17.7 MB of
  ImageBitmaps made `<img>`s. The line counts an `<img>` at its decoded size
  as it did the ImageBitmap, so it shows nothing; what changes is that an
  `<img>` is decoded when it is drawn (never, for most of these at the fight)
  where an ImageBitmap is decoded at once and held, and survives the memory
  purge v2.3.778 was about.

The shared atlas of colours (`__btPalette()`): at the fight with
`?picnumbers`, 16 and 60 of 256 rows used on two runs (the goblin's strips
14 of them, the rest the Wheel's object pages loaded at that moment); 0
pictures went without one on any run (`mp-picsonce` fails if one does).

On the default build (both on, no query) `mp-membudget` read at most: artCache
65.8, gpu 84.2, canvases 27.5, sound 27, heap 33.2, **buffers 21.0 (its line
22: the strips' numbers live there)**, workers 28.6 -- 11 / 11.

## 6. Tests

On this box (4 cores, a software graphics chip), one scenario at a time, both
switches on unless said:

| test | result |
|---|---|
| `mp-picsonce` (census; one copy let go of, read back never, Pixi's collector's unloads restored, a rebuild draws nothing blank; every strip's every cell drawn as numbers against its packed canvas at 3 scales) | 9 / 9 (17.4 million pixels, the most 0 levels apart) |
| `mp-membudget`, each way above | 11 / 11 each |
| `mp-glrestore` (the graphics lost and rebuilt) | 7 / 7 |
| `mp-renderheal` | 7 / 7 |
| `mp-questline` (the "playable" check) | 187 / 187 |
| `mp-tabwipe` | 6 / 7 -- its guard "the masked bakes are made (20)" fails the same way with both switches off: not this change |
| `mp-rebuildjog` | 7 / 8 -- its guard "every jog frame baked" fails the same way with both switches off: not this change |
| `mp-ghostaudit` | 111 / 133 on an 89-minute run: the "nothing of it is left" lines name a pine tree and a copper rock (gathering nodes) standing near the bro, and later families photographed no frames; see the PR for the run with both off |
| `node tools/dev/precheck.mjs` | passes |

## 7. For the owner

- **The `artCache` line**: with the probe fixed main reads ~79 MB at the fight
  against a line of 112. Lowering it locks the saving in; that is for after
  the showing.
- **The ImageBitmaps**: 51 pictures (trees, rocks, icons, shards, popups) are
  loaded as ImageBitmaps because their modules ask before pixiRenderer.js
  says "use `<img>`". `?onecopy` turns them into `<img>`s after the fact; the
  cause (the order the modules load in) is worth its own small change.
- **More of `ONLY_DRAWN`**: one copy lets go of only the families whose
  readers were checked (effects, the HUD's pictures). The rest are mostly not
  on the chip at a fight, so the gain is small; each family added needs its
  readers checked.
