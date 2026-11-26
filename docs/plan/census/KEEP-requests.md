# KEEP: which of the game's requests carry a version (the census, tag 6740)

Card KEEP PR 1 (`docs/plan/cards/KEEP.md`). Made by `tools/qa/mp/mp-keepcensus.mjs` on 2026-11-26, the build of 5c6c2345, on the test box (a headless Chromium, a phone 390 x 844 at dpr 3, touch), against this repository's own worker and build. Not measured on a phone; the counts are the page's requests, which do not depend on the device.

**The tour:** one load (from the navigation), into BroTown; a walk to the Flame Fields' first spawn; a fight there (19 swings, 0 px from the spot); home; three windows (gear, the bro's page, quests).

**The columns** (`tools/assets/versions.mjs classify`): **table** asks with `v=` equal to the first 10 characters of the file's SHA-256 in `tools/assets/shipped.json` (the version this card gives every file); **hand** with any other query (a hand-kept key: `GEAR_VERSION`, `TRAIT_VER`, a `?v=2.3.1224` written out, a manifest's date); **bare** with none. A folder is kept a year only when its hand + bare is 0 (the card's rule 2). "Files" counts distinct addresses.

## By folder (1592 requests for 1477 files of the table)

| folder | requests | files | table | hand | bare | kept by this card |
|---|---:|---:|---:|---:|---:|---|
| `/sprites` | 991 | 963 | 22 | 961 | 8 | yes |
| `/ui` | 149 | 134 | 57 | 61 | 31 | yes |
| `/sfx` | 96 | 96 | 95 | 0 | 1 | yes |
| `/icons` | 214 | 193 | 89 | 125 | 0 | yes |
| `/world/objects` | 89 | 47 | 0 | 1 | 88 | yes |
| `/world/ground` | 33 | 27 | 0 | 33 | 0 | only if easy |
| `/audio` | 14 | 11 | 14 | 0 | 0 | only if easy |
| `/world/placed5` | 3 | 3 | 0 | 3 | 0 | only if easy |
| `/intro` | 2 | 2 | 2 | 0 | 0 | only if easy |
| `/world/dungeons` | 1 | 1 | 0 | 1 | 0 | only if easy |
| **all** | **1592** | | **279** | **1185** | **128** | |

## By family (the ranking for PR 3: a family a PR, biggest first)

The family is the file's row in `tools/assets/shipped.json` (`tools/assets/families.mjs`). Sorted by hand + bare.

| family | folder | requests | files | table | hand | bare |
|---|---|---:|---:|---:|---:|---:|
| traits-frames | `/sprites` | 285 | 285 | 0 | 285 | 0 |
| (a sprite bot twin) | `/sprites` | 78 | 66 | 0 | 78 | 0 |
| traits-meta | `/sprites` | 61 | 61 | 0 | 61 | 0 |
| look-heads | `/sprites` | 59 | 59 | 0 | 59 | 0 |
| species-frames | `/sprites` | 53 | 53 | 0 | 53 | 0 |
| traits-thumbs | `/sprites` | 48 | 48 | 0 | 48 | 0 |
| world-objects-data | `/world/objects` | 45 | 24 | 0 | 1 | 44 |
| look-gearwalk | `/sprites` | 44 | 44 | 0 | 44 | 0 |
| world-objects | `/world/objects` | 44 | 23 | 0 | 0 | 44 |
| look-gear | `/sprites` | 42 | 42 | 0 | 42 | 0 |
| traits-hairmasks-twins | `/sprites` | 40 | 30 | 0 | 40 | 0 |
| world-ground | `/world/ground` | 32 | 26 | 0 | 32 | 0 |
| ui-quest | `/ui` | 31 | 31 | 0 | 0 | 31 |
| icons-items | `/icons` | 31 | 31 | 1 | 30 | 0 |
| icons-owner | `/icons` | 40 | 40 | 18 | 22 | 0 |
| npc-heads | `/sprites` | 21 | 21 | 0 | 21 | 0 |
| look-standin | `/sprites` | 21 | 21 | 0 | 21 | 0 |
| look-body | `/sprites` | 20 | 20 | 0 | 20 | 0 |
| ui-pad | `/ui` | 18 | 18 | 0 | 18 | 0 |
| traits-thumbs-made | `/sprites` | 17 | 17 | 0 | 17 | 0 |
| icons-small | `/ui` | 14 | 14 | 0 | 14 | 0 |
| icons-world-twins | `/icons` | 14 | 14 | 0 | 14 | 0 |
| monster-fire-goblin | `/sprites` | 14 | 14 | 0 | 14 | 0 |
| icons-points | `/icons` | 13 | 13 | 0 | 13 | 0 |
| hud-bars-twins | `/icons` | 12 | 6 | 0 | 12 | 0 |
| icons-elements | `/icons` | 20 | 18 | 9 | 11 | 0 |
| look-bodyheads | `/sprites` | 11 | 11 | 0 | 11 | 0 |
| ui-cc-tabs | `/ui` | 10 | 10 | 0 | 10 | 0 |
| look-manifests | `/sprites` | 10 | 10 | 0 | 10 | 0 |
| look-shirt | `/sprites` | 10 | 10 | 0 | 10 | 0 |
| icons-items-world | `/icons` | 12 | 6 | 4 | 8 | 0 |
| fx-levelup-numbers | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| look-weapons | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| look-standinlegs | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| gear-combat-supplied | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| icons-elements-twins | `/icons` | 8 | 8 | 0 | 8 | 0 |
| icons-owner-world | `/icons` | 9 | 6 | 2 | 7 | 0 |
| weapons-wood | `/sprites` | 7 | 7 | 0 | 7 | 0 |
| look-skills | `/sprites` | 7 | 7 | 0 | 7 | 0 |
| fx-sheets-twins | `/sprites` | 6 | 6 | 0 | 6 | 0 |
| fx-made-twins | `/sprites` | 6 | 6 | 0 | 6 | 0 |
| ui-welcome | `/ui` | 20 | 20 | 15 | 5 | 0 |
| player-sheets | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| weapons-greatsword | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| traits-nft | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| player-naked | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| cape | `/sprites` | 5 | 5 | 0 | 0 | 5 |
| species-monkey | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| species-alien | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| tree-tiers | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| ore-tiers | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| icons-small-world | `/icons` | 3 | 2 | 0 | 3 | 0 |
| shields | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| cape-hood | `/sprites` | 3 | 3 | 0 | 0 | 3 |
| ride | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| icons-from-uploads-world-twins | `/icons` | 3 | 3 | 0 | 3 | 0 |
| projectile-sheets-twins | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| ui-title | `/ui` | 6 | 6 | 4 | 2 | 0 |
| icons-hero-crit | `/icons` | 3 | 1 | 1 | 2 | 0 |
| player-body-tops | `/sprites` | 2 | 1 | 0 | 2 | 0 |
| species-meta | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| weapons-sword-256 | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| fx-coinflip | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| wheel-placed | `/world/placed5` | 2 | 2 | 0 | 2 | 0 |
| fx-zonebanners | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| monster-stills | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| icons-sheets | `/icons` | 31 | 27 | 30 | 1 | 0 |
| sfx-m4a-twins | `/sfx` | 19 | 19 | 18 | 0 | 1 |
| icons-owner-items | `/icons` | 3 | 2 | 2 | 1 | 0 |
| world-dungeons | `/world/dungeons` | 1 | 1 | 0 | 1 | 0 |
| gear-walk-supplied | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| traits-shirt-thumb | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| traits-nft-meta | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| player-body-anchors | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| hud-bars | `/icons` | 1 | 1 | 0 | 1 | 0 |
| icons-made-dom | `/icons` | 1 | 1 | 0 | 1 | 0 |
| skills-crowns | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| wheel-overview | `/world/placed5` | 1 | 1 | 0 | 1 | 0 |
| world-ground-manifest | `/world/ground` | 1 | 1 | 0 | 1 | 0 |
| world-fish-spot-twins | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| player-death-twins | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| pets-twins | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| sfx-owner-cuts | `/sfx` | 36 | 36 | 36 | 0 | 0 |
| sfx-supplied | `/sfx` | 26 | 26 | 26 | 0 | 0 |
| ui-daily-spin | `/ui` | 21 | 10 | 21 | 0 | 0 |
| icons-coins | `/icons` | 14 | 14 | 14 | 0 | 0 |
| sfx-footsteps | `/sfx` | 10 | 10 | 10 | 0 | 0 |
| ui-controls-drawn | `/ui` | 8 | 8 | 8 | 0 | 0 |
| icons-hero | `/icons` | 7 | 7 | 7 | 0 | 0 |
| monster-slime | `/sprites` | 5 | 4 | 5 | 0 | 0 |
| sfx-hand-cuts | `/sfx` | 5 | 5 | 5 | 0 | 0 |
| sfx-older | `/audio` | 5 | 5 | 5 | 0 | 0 |
| ambient-loops | `/audio` | 5 | 3 | 5 | 0 | 0 |
| music | `/audio` | 4 | 3 | 4 | 0 | 0 |
| tool-gestures | `/sprites` | 3 | 3 | 3 | 0 | 0 |
| projectile-arrow | `/sprites` | 3 | 1 | 3 | 0 | 0 |
| monster-slime-stills | `/sprites` | 3 | 2 | 3 | 0 | 0 |
| icons-ui-unknown | `/icons` | 3 | 3 | 3 | 0 | 0 |
| cape-hood-twins | `/sprites` | 3 | 3 | 3 | 0 | 0 |
| tool-pan | `/sprites` | 2 | 1 | 2 | 0 | 0 |
| icons-app | `/icons` | 2 | 2 | 2 | 0 | 0 |
| icons-svg | `/icons` | 1 | 1 | 1 | 0 | 0 |
| icons-frames-3x | `/icons` | 1 | 1 | 1 | 0 | 0 |
| ui-welcome-loop | `/ui` | 1 | 1 | 1 | 0 | 0 |
| player-anchors | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| weapons-handles | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| projectile-sheets | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| ui-daily-chest | `/ui` | 1 | 1 | 1 | 0 | 0 |
| intro-poster | `/intro` | 1 | 1 | 1 | 0 | 0 |
| intro-clip | `/intro` | 1 | 1 | 1 | 0 | 0 |
| icons-achievements | `/icons` | 1 | 1 | 1 | 0 | 0 |

## By stage of the tour

| stage | table | hand | bare | not a file of the table |
|---|---:|---:|---:|---:|
| load | 260 | 1126 | 76 | 53 |
| land | 4 | 56 | 10 | 1 |
| fight | 0 | 0 | 0 | 0 |
| home | 3 | 0 | 42 | 0 |
| windows | 12 | 3 | 0 | 0 |

## The hand-kept keys seen (the query's shape, by folder)

A `<10 hex>` is a value the shape of this card's version that is not the file's own. `v=<its own>?v=<key>` (v2.3.6741) is an address the build stamped (PR 2) to which a loader then joined its own hand key: that loader is the card's PR 3.

| folder and query | requests |
|---|---:|
| `/sprites  ?v=2.3.3590` | 360 |
| `/sprites  ?v=2.3.2324` | 66 |
| `/sprites  ?v=2.3.3603` | 65 |
| `/sprites  ?v=103` | 42 |
| `/world/ground  ?v=2026-10-01T19%3A51%3A25.074Z` | 32 |
| `/sprites  ?v=<its own>?v=2.3.3590` | 30 |
| `/icons  ?v=2.3.4222` | 25 |
| `/sprites  ?v=<its own>?v=2.3.3587` | 23 |
| `/sprites  ?v=2.3.3685` | 20 |
| `/icons  ?v=2.3.3279` | 20 |
| `/ui  ?v=2.3.6641` | 18 |
| `/ui  ?v=2.3.2324` | 17 |
| `/sprites  ?v=<its own>?v=<10 hex>` | 17 |
| `/sprites  ?v=2.3.26` | 16 |
| `/sprites  ?v=2.3.2910` | 14 |
| `/ui  ?v=2.3.3526` | 14 |
| `/icons  ?v=2.3.3559` | 13 |
| `/icons  ?v=2.3.3906` | 11 |
| `/icons  ?v=<its own>?v=2.3.4222` | 11 |
| `/sprites  ?v=<its own>?v=v2.3.3737` | 10 |
| `/sprites  ?v=<10 hex>?v=964` | 10 |
| `/sprites  ?v=<its own>?v=2.3.3590&g=1` | 10 |
| `/icons  ?v=2.3.4199` | 9 |
| `/icons  ?v=<its own>?v=<10 hex>?v=2.3.2201` | 9 |
| `/icons  ?v=2.3.2201` | 8 |
| `/sprites  ?v=2.3.5004` | 8 |
| `/sprites  ?v=1039` | 8 |
| `/sprites  ?v=<10 hex>?v=1103` | 6 |
| `/icons  ?v=<its own>?v=<10 hex>` | 6 |
| `/icons  ?v=<its own>?v=2.3.2201` | 5 |
| `/sprites  ?v=8` | 5 |
| `/sprites  ?v=<its own>?v=2026-10-18T02%3A43%3A02.602Z` | 5 |
| `/sprites  ?v=<its own>?v=2026-10-18T16%3A38%3A19.485Z` | 5 |
| `/ui  ?v=2.3.3481` | 4 |
| `/sprites  ?v=2.3.1875` | 3 |
| `/sprites  ?v=2.3.3776` | 3 |
| `/world/placed5  ?v=317a3f7d` | 3 |
| `/icons  ?v=<its own>?v=2.3.68` | 3 |
| `/ui  ?v=<its own>?v=<10 hex>` | 3 |
| `/icons  ?v=<its own>?v=2.3.68&g=1` | 3 |
| (240 more shapes) | |

## Requests for no file of the table

The build's own scripts and styles (`/assets/`, already named by Vite with their hash and kept a year), the page, the world's code under `/tools/` (the ground worker's modules), the server's `/api/`.

| folder | requests |
|---|---:|
| `/tools` | 20 |
| `/assets` | 9 |
| `/api` | 4 |
| `/` | 1 |

### Asked for, and not shipped

Requests for a file that is not in the build: the page's fallback (`index.html`) or a 404 answered. A cost on every load, outside this card (its status file's Found).

| folder | requests |
|---|---:|
| `/sprites/traits/facialhair/beard/*` | 2 |
| `/sprites/traits/eyewear/golden-monocle/*` | 2 |
| `/sprites/traits/eyestyle/sleepy/*` | 2 |
| `/sprites/traits/eyestyle/one-eye/*` | 2 |
| `/sprites/traits/eyestyle/demon/*` | 2 |
| `/sprites/traits/eyestyle/wtf/*` | 2 |
| `/sprites/traits/eyestyle/alien/*` | 2 |
| `/sprites/traits/eyewear/3d-glasses/*` | 1 |
| `/sprites/traits/eyewear/goggles/*` | 1 |
| `/sprites/traits/eyewear/laser-glasses/*` | 1 |
| `/sprites/traits/eyewear/thug-life/*` | 1 |
| `/sprites/traits/eyewear/white-glass/*` | 1 |
| `/sprites/traits/eyewear/golden-glasses/*` | 1 |

### Other sites

Not the game's files, not this card's (this box reaches no outside site, so they fail here).

| host | requests |
|---|---:|
| fonts.gstatic.com | 3 |
| fonts.googleapis.com | 1 |
| raw.githubusercontent.com | 1 |

Every request: `tools/qa/mp/out/keepcensus.json` (not in the repository; 1651 rows).
