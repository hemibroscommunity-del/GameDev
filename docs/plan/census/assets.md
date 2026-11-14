# The asset census: MB held at the memory check's fight, by family (v2.3.5242)

Card P, PR 2 (grand plan step 9.1, part two); `docs/specs/asset-door.md`
part 2 says how it is read. Written by `node tools/assets/fightmb.mjs <runs> --write`,
never by hand, from 3 runs of `QA_MB_ROWS=1 node tools/qa/mp/run.mjs membudget` at `4811c479c`.

**MB at the fight** is the most a family held at any one fight stop of any
run: on the graphics chip, the picture the page keeps, the colour numbers the
page keeps, and decoded sound (BT_AUDIO's own count, by file). **Atlas** is
the rows of the palette atlas its pictures took there. **Over bar** counts its
files over 256 colours by their own bytes: a PNG the game's reader (`png8Decode.js`)
does not read, a WebP with no colour index, a JPEG. **Waits on H**: its
loader is one of the files card P leaves alone while card H runs.
**Backlog**: whether a backlog PR may take it: never a data family (the door
never rewrites data: the look sheets are colour NUMBERS), never a sound (the
door re-encodes no sound: every sound at 24 kHz is the owner's call), a made
family only by changing its own tool, and a family waiting on card H only
after H. A backlog PR may change a loader rather than a file: a family already
on 256 colours that is held at four bytes a pixel is put in its slot's form.

This is the backlog's order (card P, PR 6 on), most MB held first. The backlog
stops at the first family under 1 MB (the line below the table's marker).

| family | kind | draw | files | MB on disk | MB at the fight | chip | page | numbers | sound | atlas | over bar | backlog | waits on H |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|---|
| `monster-fire-goblin` | made | strip | 14 | 1.32 | **8.11** | 2.57 | 0.00 | 5.54 | 0.00 | 14 |  | after H | zoneTextures.js, stripRead.js |
| `sfx-supplied` | supplied | sfx | 26 | 1.20 | **5.93** | 0.00 | 0.00 | 0.00 | 5.93 |  |  | no: sound | soundFold.js (the fold) |
| `gear-walk-twins` | made | file | 69 | 1.76 | **5.72** | 5.72 | 0.00 | 0.00 | 0.00 |  | 62 | after H | gearSheets.js |
| `monster-slime` | made | file | 6 | 0.06 | **4.56** | 0.00 | 4.56 | 0.00 | 0.00 |  |  | yes, by its tool |  |
| `look-standin` | data | look | 21 | 1.06 | **4.31** | 4.31 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `look-gear` | data | look | 42 | 1.53 | **4.29** | 4.29 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `sfx-m4a-twins` | made | sfx | 19 | 0.19 | **3.71** | 0.00 | 0.00 | 0.00 | 3.71 |  |  | no: sound | soundFold.js (the fold) |
| `look-gearwalk` | data | look | 44 | 1.12 | **3.65** | 3.65 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `sfx-footsteps` | supplied | sfx | 10 | 0.17 | **2.46** | 0.00 | 0.00 | 0.00 | 2.46 |  |  | no: sound | soundFold.js (the fold) |
| `sfx-owner-cuts` | made | sfx | 36 | 0.38 | **2.22** | 0.00 | 0.00 | 0.00 | 2.22 |  |  | no: sound | soundFold.js (the fold) |
| `icons-elements` | made | file | 18 | 0.12 | **2.16** | 0.02 | 2.14 | 0.00 | 0.00 |  |  | after H | entityRenderer.js |
| `traits-hairmasks` | made | file | 155 | 0.07 | **2.07** | 0.18 | 1.89 | 0.00 | 0.00 |  | 155 | after H | entityRenderer.js |
| `sfx-older` | made | sfx | 6 | 0.18 | **2.03** | 0.00 | 0.00 | 0.00 | 2.03 |  |  | no: sound | soundFold.js (the fold) |
| `fx-sheets-supplied` | supplied | file | 6 | 1.16 | **2.00** | 0.00 | 2.00 | 0.00 | 0.00 |  | 6 | yes |  |
| `look-standinlegs` | data | look | 8 | 0.42 | **2.00** | 2.00 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `world-objects` | made | wheel | 40 | 5.14 | **1.78** | 0.89 | 0.00 | 0.89 | 0.00 | 1 |  | yes, by its tool |  |
| `icons-items-world` | made | file | 19 | 0.11 | **1.62** | 0.00 | 1.62 | 0.00 | 0.00 |  | 6 | yes, by its tool |  |
| `ambient-loops` | made | sfx | 6 | 0.33 | **1.53** | 0.00 | 0.00 | 0.00 | 1.53 |  |  | no: sound | soundFold.js (the fold) |
| `pets` | made | file | 1 | 0.35 | **1.50** | 0.00 | 1.50 | 0.00 | 0.00 |  | 1 | yes, by its tool |  |
| `world-fish-spot` | made | file | 1 | 0.03 | **1.50** | 0.00 | 1.50 | 0.00 | 0.00 |  | 1 | yes, by its tool |  |
| `cape-hood` | made | file | 6 | 0.02 | **1.50** | 0.00 | 1.50 | 0.00 | 0.00 |  | 6 | yes, by its tool |  |
| `hud-bars` | made | file | 7 | 0.08 | **1.43** | 0.28 | 1.15 | 0.00 | 0.00 |  | 7 | after H | entityRenderer.js |
| `look-bodyheads` | data | look | 11 | 0.14 | **1.42** | 1.42 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `tree-tiers` | made | file | 5 | 0.31 | **1.40** | 0.00 | 0.00 | 1.40 | 0.00 | 5 |  | yes, by its tool |  |
| `player-death` | supplied | file | 1 | 0.34 | **1.31** | 0.00 | 1.31 | 0.00 | 0.00 |  | 1 | yes |  |
| `cape` | supplied | file | 5 | 0.09 | **1.25** | 0.00 | 1.25 | 0.00 | 0.00 |  | 5 | yes |  |
| `player-naked` | supplied | file | 5 | 0.08 | **1.25** | 0.00 | 1.25 | 0.00 | 0.00 |  | 5 | after H | entityRenderer.js |
| `traits-nft` | supplied | file | 5 | 0.04 | **1.25** | 0.00 | 1.25 | 0.00 | 0.00 |  | 5 | after H | entityRenderer.js |
| `icons-from-uploads-world` | supplied | file | 3 | 0.08 | **1.25** | 0.00 | 1.25 | 0.00 | 0.00 |  | 3 | after H | entityRenderer.js |
| `look-weapons` | data | look | 8 | 0.09 | **1.17** | 1.17 | 0.00 | 0.00 | 0.00 |  |  | no: data |  |
| `ore-tiers` | made | file | 5 | 0.07 | **1.15** | 0.00 | 1.15 | 0.00 | 0.00 |  |  | yes, by its tool |  |
| `props-parts` | made | file | 2 | 0.14 | **1.10** | 0.00 | 1.10 | 0.00 | 0.00 |  | 2 | yes, by its tool |  |
| `projectile-sheets` | made | file | 3 | 0.16 | **1.06** | 0.00 | 1.06 | 0.00 | 0.00 |  | 3 | yes, by its tool |  |
| `fx-made` | made | none | 7 | 0.73 | **1.05** | 1.05 | 0.00 | 0.00 | 0.00 | 6 | 7 | yes, by its tool |  |
| **under 1 MB at the fight: the backlog stops here** | | | | | | | | | | | | | |
| `icons-coins` | made | file | 14 | 0.08 | **0.55** | 0.00 | 0.55 | 0.00 | 0.00 |  |  | yes, by its tool |  |
| `weapons-greatsword` | supplied | file | 5 | 0.06 | **0.51** | 0.00 | 0.51 | 0.00 | 0.00 |  | 5 | yes |  |
| `monster-stills` | made | file | 5 | 0.03 | **0.50** | 0.00 | 0.50 | 0.00 | 0.00 |  | 1 | after H | zoneTextures.js |
| `weapons-sword-256` | made | file | 2 | 0.01 | **0.50** | 0.00 | 0.50 | 0.00 | 0.00 |  | 2 | yes, by its tool |  |
| `icons-hero-crit` | made | file | 1 | 0.04 | **0.25** | 0.00 | 0.25 | 0.00 | 0.00 |  | 1 | yes, by its tool |  |
| `sfx-hand-cuts` | made | sfx | 5 | 0.10 | **0.19** | 0.00 | 0.00 | 0.00 | 0.19 |  |  | no: sound | soundFold.js (the fold) |
| `weapons-wood` | made | file | 7 | 0.03 | **0.17** | 0.00 | 0.17 | 0.00 | 0.00 |  | 7 | yes, by its tool |  |
| `icons-owner-world` | made | file | 6 | 0.02 | **0.17** | 0.00 | 0.17 | 0.00 | 0.00 |  | 5 | after H | entityRenderer.js |
| `ride` | made | file | 3 | 0.00 | **0.10** | 0.00 | 0.10 | 0.00 | 0.00 |  |  | yes, by its tool |  |
| `icons-small-world` | made | file | 2 | 0.01 | **0.08** | 0.02 | 0.06 | 0.00 | 0.00 |  | 2 | after H | entityRenderer.js |
| `icons-owner-items` | made | file | 2 | 0.01 | **0.06** | 0.00 | 0.06 | 0.00 | 0.00 |  |  | yes, by its tool |  |
| `shields` | made | file | 3 | 0.01 | **0.05** | 0.00 | 0.05 | 0.00 | 0.00 |  | 3 | yes, by its tool |  |
| `projectile-arrow` | made | file | 1 | 0.01 | **0.02** | 0.00 | 0.02 | 0.00 | 0.00 |  | 1 | yes, by its tool |  |

## Held nothing at the fight (153 families)

Loaded elsewhere (another land, a window, a computer's path), or by nothing.
A family whose draw path is `none` is loaded by nothing on any device by
default: removing any of its files but the 19 `.m4a` is the owner's yes.

| family | kind | draw | files | MB on disk | over bar |
|---|---|---|--:|--:|--:|
| `world-ground` | supplied | wheel | 100 | 33.19 |  |
| `music` | made | music | 12 | 14.47 |  |
| `world-interiors` | supplied | dom | 16 | 4.85 | 16 |
| `gear-combat-supplied` | supplied | file | 25 | 2.49 | 25 |
| `npc-bakes` | made | file | 42 | 2.06 | 29 |
| `maps-farm` | made | wheel | 1 | 1.95 |  |
| `monster-water-frog` | made | strip | 15 | 1.72 |  |
| `player-sheet-twins` | made | file | 25 | 1.32 | 25 |
| `icons-t2` | made | dom | 30 | 1.17 | 30 |
| `icons-app` | supplied | dom | 6 | 1.12 | 6 |
| `npc-storekeeper` | supplied | dom | 1 | 1.11 | 1 |
| `ui-welcome-loop` | made | dom | 1 | 1.07 |  |
| `monster-snowman` | made | strip | 15 | 1.06 |  |
| `gear-combat-made` | made | file | 17 | 1.05 | 17 |
| `player-standin-twins` | made | file | 21 | 1.05 | 21 |
| `skills-farm` | made | file | 8 | 1.03 | 8 |
| `traits-hi` | supplied | dom | 275 | 0.97 | 275 |
| `monster-mummy` | made | strip | 6 | 0.91 |  |
| `fx-zonebanners` | made | dom | 4 | 0.91 | 4 |
| `look-body` | data | look | 20 | 0.89 |  |
| `skills-strips-made` | made | file | 3 | 0.89 | 3 |
| `ambient-wind` | supplied | sfx | 1 | 0.88 |  |
| `ui-welcome` | made | dom | 26 | 0.88 | 25 |
| `ui-title` | made | dom | 6 | 0.76 | 3 |
| `icons-items` | made | dom | 111 | 0.68 |  |
| `wheel-placed` | data | data | 2 | 0.68 |  |
| `icons-hero` | made | dom | 19 | 0.67 | 19 |
| `world-farm` | supplied | wheel | 75 | 0.63 |  |
| `intro-clip` | supplied | dom | 1 | 0.61 |  |
| `icons-sheets` | made | dom | 51 | 0.61 | 51 |
| `icons-owner` | made | dom | 82 | 0.61 | 68 |
| `skills-strips` | made | file | 2 | 0.60 | 2 |
| `traits-thumbs` | supplied | dom | 48 | 0.46 | 48 |
| `ui-daily-spin` | made | dom | 10 | 0.44 |  |
| `ui-paint` | made | dom | 5 | 0.44 | 5 |
| `monster-rock-golem` | made | strip | 2 | 0.41 |  |
| `traits-thumbs-made` | made | dom | 79 | 0.39 | 79 |
| `fx-levelup-numbers` | made | dom | 8 | 0.38 |  |
| `monster-rotcap` | made | strip | 2 | 0.36 |  |
| `traits-frames` | made | file | 285 | 0.36 | 285 |
| `fx-made-twins` | made | numbers | 7 | 0.35 |  |
| `icons-bag` | made | dom | 10 | 0.34 | 10 |
| `monster-skeleton` | made | strip | 6 | 0.33 |  |
| `ui-quest` | made | dom | 31 | 0.31 | 31 |
| `world-dungeons` | made | file | 5 | 0.31 |  |
| `look-manifests` | data | data | 9 | 0.25 |  |
| `traits-meta` | data | data | 61 | 0.24 |  |
| `icons-achievements` | made | dom | 24 | 0.22 | 24 |
| `player-head-twins` | made | file | 11 | 0.22 | 11 |
| `icons-points` | made | dom | 26 | 0.20 | 26 |
| `music-dance` | made | music | 1 | 0.18 |  |
| `look-heads` | data | look | 59 | 0.18 |  |
| `ui-daily-chest` | made | dom | 1 | 0.18 | 1 |
| `icons-made-dom` | made | dom | 15 | 0.17 | 9 |
| `tool-gestures` | made | file | 3 | 0.15 | 3 |
| `monster-storm-eye` | made | strip | 2 | 0.14 |  |
| `player-sword-weapon-twins` | made | file | 3 | 0.12 | 3 |
| `monster-codex` | made | dom | 3 | 0.11 |  |
| `icons-ui-unknown` | made | dom | 5 | 0.11 | 5 |
| `world-objects-data` | data | data | 41 | 0.09 |  |
| `look-shirt` | data | look | 10 | 0.09 |  |
| `fx-coinflip` | supplied | dom | 2 | 0.08 | 2 |
| `icons-small` | made | dom | 14 | 0.07 | 14 |
| `species-frames` | made | file | 53 | 0.07 | 53 |
| `wheel-detail` | made | dom | 40 | 0.06 | 40 |
| `tool-pan` | supplied | file | 1 | 0.06 | 1 |
| `icons-cut-from-uploads` | supplied | dom | 14 | 0.06 | 14 |
| `species-meta` | data | data | 2 | 0.04 |  |
| `player-body-anchors` | data | data | 1 | 0.04 |  |
| `icons-frames-3x` | made | dom | 7 | 0.03 | 7 |
| `intro-poster` | made | dom | 1 | 0.03 | 1 |
| `icons-elements-gems` | made | dom | 2 | 0.02 |  |
| `ui-controls-drawn` | made | dom | 8 | 0.02 |  |
| `icons-board` | made | dom | 5 | 0.02 |  |
| `player-anchors` | data | data | 1 | 0.02 |  |
| `ui-cc-tabs` | made | dom | 11 | 0.02 | 11 |
| `player-bow-weapon` | made | file | 5 | 0.02 | 5 |
| `world-ground-manifest` | data | data | 1 | 0.02 |  |
| `wheel-overview` | made | wheel | 1 | 0.01 | 1 |
| `npc-heads` | made | dom | 21 | 0.01 | 12 |
| `icons-svg` | supplied | dom | 5 | 0.01 |  |
| `player-body-tops` | data | data | 1 | 0.01 |  |
| `traits-hi-made` | made | dom | 10 | 0.00 | 10 |
| `traits-shirt-thumb` | made | dom | 1 | 0.00 | 1 |
| `species-monkey` | supplied | file | 5 | 0.00 | 5 |
| `species-alien` | made | file | 5 | 0.00 | 5 |
| `skills-crowns` | data | data | 1 | 0.00 |  |
| `traits-nft-meta` | data | data | 1 | 0.00 |  |
| `weapons-handles` | data | data | 1 | 0.00 |  |
| `props-town` | made | none | 17 | 3.55 | 17 |
| `maps-retired` | made | none | 9 | 3.05 |  |
| `music-retired` | made | none | 1 | 2.78 |  |
| `gear-combat-twins` | made | none | 44 | 2.70 | 36 |
| `gear-walk-supplied` | supplied | none | 38 | 2.51 | 38 |
| `monster-retired` | made | none | 6 | 2.41 | 1 |
| `player-sheets` | supplied | none | 25 | 2.05 | 25 |
| `player-retired` | supplied | none | 17 | 1.70 | 17 |
| `maps-farm-webp` | made | none | 1 | 1.62 |  |
| `props-buildings` | supplied | none | 3 | 1.47 | 3 |
| `intro-retired` | supplied | none | 2 | 1.37 |  |
| `props-other` | made | none | 4 | 1.17 | 4 |
| `gear-chop-originals` | supplied | none | 3 | 1.08 | 3 |
| `player-standin-parts` | made | none | 13 | 1.03 | 13 |
| `player-retired-twins` | made | none | 17 | 1.02 | 16 |
| `world-sprites-retired` | made | none | 36 | 0.96 | 36 |
| `minigame-mining` | supplied | none | 2 | 0.86 |  |
| `gear-walk-made` | made | none | 20 | 0.68 | 20 |
| `ui-title-unwired` | made | none | 6 | 0.65 | 6 |
| `player-standin-bodies` | supplied | none | 8 | 0.63 | 8 |
| `p256-twins` | made | none | 11 | 0.61 |  |
| `ui-cc-sheet` | made | none | 12 | 0.45 | 12 |
| `fx-levelup-strip` | made | none | 1 | 0.41 | 1 |
| `icons-ui-unwired` | made | none | 20 | 0.39 | 20 |
| `gear-dodge` | made | none | 6 | 0.38 | 6 |
| `ui-welcome-unwired` | made | none | 17 | 0.37 | 17 |
| `player-renders` | supplied | none | 5 | 0.36 | 5 |
| `player-heads` | made | none | 11 | 0.36 | 11 |
| `tiles-retired` | made | none | 14 | 0.35 |  |
| `world-arena` | made | none | 11 | 0.28 |  |
| `player-sword-weapon` | supplied | none | 3 | 0.27 | 3 |
| `world-originals` | supplied | none | 3 | 0.19 | 3 |
| `icons-sheets-unwired` | made | none | 15 | 0.18 | 15 |
| `icons-bag-unwired` | made | none | 5 | 0.17 | 5 |
| `wheel-short` | made | none | 3 | 0.16 |  |
| `npc-retired` | supplied | none | 5 | 0.14 | 5 |
| `gear-belt` | made | none | 5 | 0.14 | 5 |
| `icons-hero-unwired` | made | none | 4 | 0.14 | 4 |
| `minigame-mining-pictures` | made | none | 2 | 0.11 | 2 |
| `icons-badge-retired` | supplied | none | 16 | 0.08 | 16 |
| `projectile-arrow-special` | made | none | 1 | 0.07 | 1 |
| `icons-old-folders` | made | none | 12 | 0.07 | 12 |
| `weapons-sword-originals` | supplied | none | 3 | 0.07 | 3 |
| `intro-retired-poster` | made | none | 1 | 0.06 | 1 |
| `icons-owner-unwired` | made | none | 7 | 0.06 | 7 |
| `icons-shards-png` | made | none | 9 | 0.05 |  |
| `tool-pan-v1` | made | none | 1 | 0.04 | 1 |
| `icons-frames-3x-unwired` | made | none | 4 | 0.01 | 4 |
| `world-farm-manifest` | data | none | 1 | 0.01 |  |
| `icons-svg-unwired` | supplied | none | 8 | 0.01 |  |
| `gear-icons` | made | none | 3 | 0.01 | 3 |
| `traits-shirt` | supplied | none | 5 | 0.01 | 5 |
| `icons-verified-full` | supplied | none | 1 | 0.01 | 1 |
| `ui-welcome-cat` | supplied | none | 7 | 0.01 | 7 |
| `portrait-atlas` | data | none | 1 | 0.01 |  |
| `player-bow-weapon-twins` | made | none | 5 | 0.01 |  |
| `world-farm-sale-sign` | supplied | none | 1 | 0.00 |  |
| `icons-small-unwired` | made | none | 2 | 0.00 | 2 |
| `cape-meta` | data | none | 1 | 0.00 |  |
| `timingbar` | supplied | none | 1 | 0.00 |  |
| `sfx-footstep-clips` | data | none | 1 | 0.00 |  |
| `traits-shirt-meta` | data | none | 1 | 0.00 |  |
| `ui-cc-tab-species` | made | none | 1 | 0.00 | 1 |
| `player-handles-stale` | data | none | 1 | 0.00 |  |

## Made in play (no family holds these)

A texture whose label is not a file in reach: a canvas, a render texture, a
ground piece, a look atlas page. The renderers' bakes: for reading, never
the door's to change. Digits in a label are folded to `#`.

| label | MB at the fight | chip | page | numbers | sound | atlas |
|---|--:|--:|--:|--:|--:|--:|
| `unnamed` (on the chip: canvas 16.64, render 1.55, buffer 0.00) | 22.19 | 18.19 | 4.00 | 0.00 | 0.00 |  |
| `blob: (a picture made in play from bytes)` | 13.55 | 13.55 | 0.00 | 0.00 | 0.00 |  |
| `wheel-ground` | 8.55 | 8.55 | 0.00 | 0.00 | 0.00 | 57 |
| `bt-look:page/#-#-#` | 5.31 | 5.31 | 0.00 | 0.00 | 0.00 |  |
| `bt-shadow-pieces` | 0.93 | 0.93 | 0.00 | 0.00 | 0.00 |  |
| `worldfx/cloud#` | 0.47 | 0.00 | 0.47 | 0.00 | 0.00 |  |
| `bt-palette-atlas` | 0.25 | 0.25 | 0.00 | 0.00 | 0.00 |  |
| 20 more, each under 0.1 MB | 0.18 | | | | | |

## The fight stops read

Each stop's rows, summed, beside the lines the check reads at the same stop.
The chip's rows are its whole list, so they sum to the `gpu` line. The page's
rows are the asset cache's, the `artCache` line. Sound by file is BT_AUDIO's
own count (`soundHeld`); the `sound` line counts every buffer the page can
still reach, so it can be higher.

| run | stop | gpu line | chip rows | artCache line | page rows | numbers | sound line | soundHeld | sound rows | atlas rows used | rowsFull | monster bundles |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | trip 1: a fight at the Flame Fields (9 swings; 0 px short af | 61.6 | 61.37 | 35 | 35.05 | 7.82 | 17.5 | 17.5 | 17.48 | 114 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 1 | trip 2: a fight at the Flame Fields (11 swings; 0 px short a | 64.9 | 64.63 | 35 | 35.05 | 7.82 | 17.5 | 17.5 | 17.48 | 114 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 1 | trip 3: a fight at the Flame Fields (9 swings; 0 px short af | 68.1 | 67.82 | 35 | 35.05 | 7.82 | 18.1 | 17.6 | 17.65 | 114 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 2 | trip 1: a fight at the Flame Fields (6 swings; 0 px short af | 64.9 | 64.60 | 35 | 35.05 | 7.82 | 18.1 | 17.6 | 17.65 | 114 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 2 | trip 2: a fight at the Flame Fields (4 swings; 0 px short af | 72.4 | 72.09 | 35 | 35.05 | 7.82 | 17.6 | 17.6 | 17.65 | 115 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 2 | trip 3: a fight at the Flame Fields (3 swings; 0 px short af | 72.6 | 72.32 | 35 | 35.05 | 7.82 | 18.1 | 17.6 | 17.65 | 110 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/fx/portal-beam.webp, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 3 | trip 1: a fight at the Flame Fields (9 swings; 0 px short af | 66.2 | 65.90 | 35 | 35.05 | 7.82 | 18.1 | 18.1 | 18.07 | 114 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/portal-beam.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 3 | trip 2: a fight at the Flame Fields (7 swings; 0 px short af | 72.2 | 71.92 | 35 | 35.05 | 7.82 | 18.1 | 18.1 | 18.07 | 113 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/portal-beam.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
| 3 | trip 3: a fight at the Flame Fields (5 swings; 0 px short af | 72.8 | 72.49 | 35 | 35.05 | 7.82 | 18.1 | 17.6 | 17.65 | 111 of 256 | 0 | p256:/sprites/effects/jet-stream-v1.png, p256:/sprites/fx/smith-anvil.webp, p256:/sprites/fx/portal-beam.webp, p256:/sprites/fx/fire-trail-v1.png, p256:/sprites/effects/arrow-blast-v1.webp, p256:/sprites/fx/snow-footprints.webp, fireGoblin |
