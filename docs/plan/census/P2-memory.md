# What still holds the most MB in play, family by family (card P2, tag 5980)

Card P2, PR 1 (grand plan step 9.5). Card P's census (`assets.md`) ranks
the FILES a family ships. This one ranks everything the page holds at the
memory check's fight, files or not. Most of what is left is made in play: a
look sheet sent to the chip, a sheet baked from a file, a canvas. So the rows
are what the page holds, named by the code that makes them, with the saving
each would give and the file it is made in. It is the order of this card's
PRs 2 on.

## How it was read (main at fcd1ae9, 2026-11-17)

- **`mp-membudget`, three runs** with `QA_MB_ROWS=1` (every texture's row at
  the three fight stops), read by `node tools/assets/fightmb.mjs` (printed,
  not `--write`: `assets.md` is card P's). All three passed every line.
- **`mp-gpuaudit`** (`QA_GA_NODIE=1`): what the chip holds on arrival in
  BroTown and after standing 20 s, with each texture's seconds since it was
  last drawn (`idleMax`).
- **`mp-memledger`**: the 2D canvases by size, sound, heap, buffers and
  workers, on arrival and after a lap of the eight lands.
- **A scratch probe, not committed**: `mp-membudget`'s trip on an unminified
  build (`QA_DIST=dist-prof`). It recorded the call stack that made each
  canvas, and the stack of each `toBlob` behind a `blob:` texture. That is
  how the 22 MB of "unnamed" and the 12.4 MB of "blob" rows below are named.
  Its own lines read high (heap 40, buffers 29.4): an unminified script and
  the probe's own records. Only its names are used here, never its MB.

## The lines on main

| line | budget | highest of three runs | room |
|---|--:|--:|--:|
| `gpu` | 115 | 82.1 | 33 |
| `heap` | 38.5 | **38.5** | 0 |
| `buffers` | 24.2 | **24.2** | 0 |
| `workers` | 36 | 21.5 | 14.5 |
| `sound` | 22 | 18.1 | 3.9 |
| `artCache` | 79.3 | 16.2 | 63.1 |
| `canvases` | 56 | 15.4 | 40.6 |
| **all seven** | | **~216** | |

- `heap` and `buffers` sit on their lines on main: any PR that adds a few
  hundred KB there fails by luck. Neither is a picture family (`buffers` holds
  the colour numbers kept in the page, so a family moved to numbers RAISES it:
  card P paid that three times).
- `artCache` reads 16.2 against its 79.3 line: card P lowered it only by each
  saving it made, from a line set before M2. Lowering it to the reading plus
  room locks in what is already saved. That is a question (Needs), not a
  saving of this card's.

## The ranking: MB held at the fight, the most first

"Chip" is the graphics chip (`__btGpuTex`), "page" the asset cache
(`__btTex`), "2D" the canvases `memledger` counts. A range is the three
fights' lowest to highest.

| # | what holds it | MB at the fight | where | made in | the saving, and its road | whose |
|--:|---|--:|---|---|---|---|
| 1 | **Look sheets kept on the chip while undrawn**: every sheet of the look sets (`standin` 4.3, `gear` 4.3, `gearwalk` 3.65, `skills` 2.6, `standinlegs` 2.0, `bodyheads` 1.4, `weapons` 1.2) is made with `autoGarbageCollect: false`, so once drawn (behind the loading screen, or once) it stays on the chip for good. Standing in BroTown, 19.9 MB of it had not been drawn for 40 s or more (`skills/cook-south` 1.1 MB at the fight, nobody cooking). | **19.5** chip | `gpu` | `src/rendering/lookPalette.js` (a sheet's `BufferImageSource`, line ~290) | **up to ~15 MB of `gpu`**: a sheet undrawn for 60 s lets its chip copy go (Pixi's own collector). Its numbers stay in the page, so the next draw sends them up again, with nothing fetched and nothing moved off the loading screen. The cost is that send-up (0.2-1.1 MB at a byte a pixel) on the first frame a pose comes back: `mp-heldsweep`'s sample at the fight and the armour stations. The paged sheets (`bt-look:page/*`, 5.3 MB) stay: a page is shared. | P2, PR 2 |
| 2 | **Figure sheets baked in play, kept as pictures**: `keepAsImage` turns a packed canvas into a PNG image (a `blob:` texture, four bytes a pixel on the chip). By the probe: the base body sheets (`playerSprites.js` `loadSheet`, 3.1 -> 3.1 -> 5.2 MB over the three trips) and the packed body and gear pages (`playerSkins.js` `_buildBodySheetPage` and `gearSheets.js` `keepPackedAsImage`, 2.9 -> 5.1 -> 7.0). They GROW trip by trip. | **8.3-12.4** chip | `gpu` | `src/rendering/playerSprites.js`, `playerSkins.js`, `gearSheets.js`, `keepAsImage.js` | **about 6-9 MB of `gpu`**, two roads, read first in the PR: why a phone that draws its figure from the look sets still draws these, and what grows trip to trip (a sheet per pose and facing, never let go); then let the undrawn ones go, or hold them as colour numbers (`paletteTex.js`; the owner's yes to 256 colours for the figures, MEMORY-MAP, "phase 2") | P2, PR 3 |
| 3 | **The damage numbers' bitmap font**: one 1024 x 1024 page and three 512 x 512 pages, canvases sent to the chip (the "unnamed" canvas rows, 5.3 + 4.0) | **9.3** chip | `gpu` | `src/rendering/systems/effectsRenderer.js` (`BitmapFont.install`) | ~8 MB as words drawn at 2x, not 3x: **the owner's call** (MEMORY-MAP, "the owner's calls"), and card M2's file | Found |
| 4 | **The Wheel's ground pieces**: 54 pieces of 404 x 402, already colour numbers (one byte a pixel) | **8.1-8.7** chip | `gpu` | `src/rendering/wheelGround.js`, the ground worker | only by holding fewer pieces (how far a player sees): not a family's form | listed |
| 5 | **The T-shirt's sheets on the chip**: `gear-walk-twins`, 20 files of `/sprites/gear/shirt/tshirt/` (pickup-south alone 1.64 MB), RGBA. A phone draws chest, legs and the full set from `look/gearwalk`, but the shirt from these files. On arrival they were undrawn for 24-45 s. | **4.9-5.0** chip | `gpu` | `src/rendering/gearSheets.js` | **~3.7 MB of `gpu`** as colour numbers (the `gearwalk` set's form, a quarter), or ~4.9 if the files are let go of the chip once baked (the drawn shirt is baked on the body bake's worker) | P2, PR 4 |
| 6 | **The look atlas's pages** (`bt-look:page/*`), already numbers | **5.3** chip | `gpu` | `src/rendering/lookPalette.js` | ~1 MB of gaps: not worth a PR | listed |
| 7 | **Decoded sound** (`sfx-supplied` 5.9, the `.m4a`'s twins 3.7, footsteps 2.5, the owner's cuts 2.2, older 2.0, loops 1.5) | **18.1** | `sound` | `src/data/gameDisplay.js`, `sfxCache.js` | ~10 MB as every sound at 24 kHz: **the owner's call**, and the door re-encodes no sound | listed |
| 8 | **The fire goblin's strips** (numbers kept deflated once drawn: card P's #1840) | **6.3** chip and page | `gpu`, `buffers` | `wheelMonsterArt.js`, `framePack.js` | done by card P; left: none without reducing its art | listed |
| 9 | **Pictures from files in the page** (`artCache`): canvases in the asset cache 4.6, `cape` 2.1, `traits-nft` 1.4, `player-naked` 1.4, `props-parts` 1.1, `ore-tiers` 1.1, swords 1.1, `projectile-sheets` 1.0 | **16.2** page | `artCache` | below | `cape` stays pictures (card P's Found: the capes are drawn crisp); `traits-nft` and `player-naked` are the owner's list (drop their loads, 2.5 MB); `ore-tiers` and `projectile-sheets` load in `effectsRenderer.js` (card M2's file); **`props-parts` (1.1 MB)** is loaded every session behind the gate and drawn only on the retired town's four buildings (`worldProps.js`: every `PROP_PARTS` building has `zone: 'town'`): loaded with the town's own scenery instead (`npcSprites.js` `loadTownScenery`), behind the town's own veil | P2, PR 6 (`props-parts`); the rest Found |
| 10 | **2D canvases** (`canvases`, 15.4): two React canvases of 782 x 782 and 768 x 768 (4.6), the portrait's 768 x 768 (`wireCharacterPortrait`, 2.25), the monsters' thrown goo and fire atlas (`monsterShotFx.js` `packImages`, 1024 x 376 and 1024 x 49: 1.7), the world map's two 454 x 454 (`overviewCanvas`, `landsCanvas`: 1.6, on the chip as well), the hot arrow's art 912 x 170 (0.6), three soft blades 256 x 256 (0.75) | **15.4** 2D | `canvases` | as named | **`monsterShotFx.js`'s atlas (1.7 MB)**: drawn once into, read by nothing after: `keepOnGpuOnly` (`gpuOnly.js`) frees its page copy. The React canvases are `src/ui/` (BroTown.jsx is card M's: their owner read first); the hot arrow is `effectsRenderer.js` (M2) | P2, PR 5 (the goo atlas) |

## The order of this card's PRs

PRs 2 on take the rows above that are this card's, the most MB first. Each
is ON by default with its `?name=0`, has its row in `switches.mjs`, and
lowers the line its saving lands in by three runs' highest:

1. **5981, PR 2**: the tee's stand and jog sheets not sent to the chip where
   a phone draws them from the numbers (row 5, 1.6 MB of `gpu`). Rows 1 and 2
   came out of PR 2's reading as a question and a Found (below).
2. **5982 on**: the monsters' goo and fire atlas on the chip only (row 10,
   1.7 MB of `canvases`); `props-parts` with the retired town's scenery (row
   9, 1.1 MB of `artCache`); row 1 if the planning session says yes; the
   tee's other poses as numbers (row 5's 3.4 MB) if a look family is wanted.

Below 1 MB a row is not worth a PR's paid checks (card P's rule).

## What PR 2's reading found (tag 5981)

- **Pixi 8.17 collects nothing by itself.** A texture's
  `autoGarbageCollect` defaults to false (`TextureSource.defaultOptions`),
  so a texture sent to the chip stays there for the visit unless its maker
  says otherwise. `memory-budget.mjs`'s `gpu` line still says "Pixi unloads
  after 60 s unused", and so do the specs: that holds only for the few
  sources made with `autoGarbageCollect: true` (`paletteLoad.js`,
  `wheelObjects.js`). Everything the loading screen sends up
  (`entityRenderer.js` `uploadBakedTextures`, `uploadGearTextures`) is held
  for good.
- **Row 1, the look sheets**: a sheet let off the chip is made again ON THE
  PAGE at its next draw (`lookPalette.js` `make()`: `drawImage` and
  `getImageData` of up to 5112 x 222), in that frame, against the page's
  thread budget. Asked of the planning session (status, Needs).
- **Row 2, the baked figure sheets**, by the probe's file of origin: every
  one is a JOG body sheet (`/sprites/player/jog-*.webp`), as shipped
  (`playerSprites.js` `loadSheet`) or re-skinned (`playerSkins.js`
  `_buildBodySheetPage`), plus one `mine-south`; more facings each trip.
  They are drawn walking home through BroTown: the townsfolk, still drawn
  from baked sheets (MEMORY-MAP: "townsperson ... until then the looks
  bake"). Their move to the look sets is the townsfolk's own work, and their
  draw sites are `entityRenderer.js` (card M2's): Found.
- **Row 5, the T-shirt**: of its 5.0 MB, 1.6 MB is the stand and jog sheets,
  which a phone draws from the numbers (`lookShirtFrame.js`), sent up by the
  loading screen all the same; 3.4 MB is the poses with no sheets of numbers
  (pick up 1.64, fish, roll, mine, hit), sent up so a first use pays no
  upload. PR 2 takes the 1.6 MB (`?teechip=0`); the 3.4 MB needs the tee's
  other poses baked as numbers (`tools/art/shirt-bake.mjs`), a look family
  (`mp-ghostaudit`).

## Not this card's (Found)

- The damage font's pages (9.3 MB): the owner's call (2x words) and card
  M2's file.
- `ore-tiers` (1.1) and `projectile-sheets` (1.0): loaded in
  `effectsRenderer.js` (card M2).
- `traits-nft` and `player-naked` (2.5 MB together): already on the owner's
  list (card P's Needs).
- The React canvases of 782 x 782 and 768 x 768 (4.6 MB of `canvases`): their
  component is to be named first; if it is `BroTown.jsx`, card M's.
- Sound at 24 kHz (~10 MB): the owner's call.
