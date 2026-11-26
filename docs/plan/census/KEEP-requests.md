# KEEP: which of the game's requests carry a version (the census, tag 6740)

Card KEEP PR 1 (`docs/plan/cards/KEEP.md`). Made by `tools/qa/mp/mp-keepcensus.mjs` on 2026-11-26, the build of 8f37f5b, on the test box (a headless Chromium, a phone 390 x 844 at dpr 3, touch), against this repository's own worker and build. Not measured on a phone; the counts are the page's requests, which do not depend on the device.

**The tour:** one load (from the navigation), into BroTown; a walk to the Flame Fields' first spawn; a fight there (38 swings, 0 px from the spot); home; three windows (gear, the bro's page, quests); with a bag the worker filled, the item icons' windows (Gear and its bag, the General Store, the Auction House, the Smithy, the Codex), each checked for a missing /icons picture.

**The columns** (`tools/assets/versions.mjs classify`): **table** asks with `v=` equal to the first 10 characters of the file's SHA-256 in `tools/assets/shipped.json` (the version this card gives every file); **hand** with any other query (a hand-kept key: `GEAR_VERSION`, `TRAIT_VER`, a `?v=2.3.1224` written out, a manifest's date); **bare** with none. A folder is kept a year only when its hand + bare is 0 (the card's rule 2). "Files" counts distinct addresses.

## By folder (1620 requests for 1497 files of the table)

| folder | requests | files | table | hand | bare | kept by this card |
|---|---:|---:|---:|---:|---:|---|
| `/sprites` | 985 | 965 | 23 | 954 | 8 | yes |
| `/ui` | 146 | 134 | 57 | 58 | 31 | yes |
| `/sfx` | 96 | 96 | 96 | 0 | 0 | yes |
| `/icons` | 253 | 209 | 243 | 10 | 0 | yes |
| `/world/objects` | 89 | 47 | 0 | 1 | 88 | yes |
| `/world/ground` | 29 | 27 | 0 | 29 | 0 | only if easy |
| `/audio` | 14 | 11 | 14 | 0 | 0 | only if easy |
| `/world/placed5` | 3 | 3 | 0 | 3 | 0 | only if easy |
| `/intro` | 2 | 2 | 2 | 0 | 0 | only if easy |
| `/world/interiors` | 2 | 2 | 0 | 2 | 0 | only if easy |
| `/world/dungeons` | 1 | 1 | 0 | 1 | 0 | only if easy |
| **all** | **1620** | | **435** | **1058** | **127** | |

## By family (the ranking for PR 3: a family a PR, biggest first)

The family is the file's row in `tools/assets/shipped.json` (`tools/assets/families.mjs`). Sorted by hand + bare.

| family | folder | requests | files | table | hand | bare |
|---|---|---:|---:|---:|---:|---:|
| traits-frames | `/sprites` | 285 | 285 | 0 | 285 | 0 |
| (a sprite bot twin) | `/sprites` | 79 | 66 | 0 | 79 | 0 |
| traits-meta | `/sprites` | 61 | 61 | 0 | 61 | 0 |
| look-heads | `/sprites` | 59 | 59 | 0 | 59 | 0 |
| species-frames | `/sprites` | 53 | 53 | 0 | 53 | 0 |
| traits-thumbs | `/sprites` | 48 | 48 | 0 | 48 | 0 |
| world-objects-data | `/world/objects` | 45 | 24 | 0 | 1 | 44 |
| look-gearwalk | `/sprites` | 44 | 44 | 0 | 44 | 0 |
| world-objects | `/world/objects` | 44 | 23 | 0 | 0 | 44 |
| look-gear | `/sprites` | 42 | 42 | 0 | 42 | 0 |
| ui-quest | `/ui` | 31 | 31 | 0 | 0 | 31 |
| traits-hairmasks-twins | `/sprites` | 30 | 30 | 0 | 30 | 0 |
| world-ground | `/world/ground` | 28 | 26 | 0 | 28 | 0 |
| npc-heads | `/sprites` | 21 | 21 | 0 | 21 | 0 |
| look-standin | `/sprites` | 21 | 21 | 0 | 21 | 0 |
| look-body | `/sprites` | 20 | 20 | 0 | 20 | 0 |
| ui-pad | `/ui` | 18 | 18 | 0 | 18 | 0 |
| traits-thumbs-made | `/sprites` | 17 | 17 | 0 | 17 | 0 |
| monster-fire-goblin | `/sprites` | 14 | 14 | 0 | 14 | 0 |
| look-bodyheads | `/sprites` | 11 | 11 | 0 | 11 | 0 |
| icons-owner | `/icons` | 53 | 46 | 43 | 10 | 0 |
| icons-items | `/icons` | 50 | 39 | 40 | 10 | 0 |
| ui-cc-tabs | `/ui` | 10 | 10 | 0 | 10 | 0 |
| look-manifests | `/sprites` | 10 | 10 | 0 | 10 | 0 |
| look-shirt | `/sprites` | 10 | 10 | 0 | 10 | 0 |
| fx-levelup-numbers | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| look-weapons | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| look-standinlegs | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| gear-combat-supplied | `/sprites` | 8 | 8 | 0 | 8 | 0 |
| weapons-wood | `/sprites` | 7 | 7 | 0 | 7 | 0 |
| look-skills | `/sprites` | 7 | 7 | 0 | 7 | 0 |
| icons-small | `/ui` | 14 | 14 | 8 | 6 | 0 |
| fx-sheets-twins | `/sprites` | 6 | 6 | 0 | 6 | 0 |
| fx-made-twins | `/sprites` | 6 | 6 | 0 | 6 | 0 |
| ui-welcome | `/ui` | 20 | 20 | 15 | 5 | 0 |
| player-sheets | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| weapons-greatsword | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| traits-nft | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| player-naked | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| cape | `/sprites` | 5 | 5 | 0 | 0 | 5 |
| species-alien | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| species-monkey | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| tree-tiers | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| ore-tiers | `/sprites` | 5 | 5 | 0 | 5 | 0 |
| icons-owner-world | `/icons` | 9 | 6 | 5 | 4 | 0 |
| hud-bars-twins | `/icons` | 6 | 6 | 3 | 3 | 0 |
| shields | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| cape-hood | `/sprites` | 3 | 3 | 0 | 0 | 3 |
| ride | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| projectile-sheets-twins | `/sprites` | 3 | 3 | 0 | 3 | 0 |
| ui-title | `/ui` | 6 | 6 | 4 | 2 | 0 |
| player-body-tops | `/sprites` | 2 | 1 | 0 | 2 | 0 |
| species-meta | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| weapons-sword-256 | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| fx-coinflip | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| wheel-placed | `/world/placed5` | 2 | 2 | 0 | 2 | 0 |
| pets-twins | `/sprites` | 2 | 1 | 0 | 2 | 0 |
| fx-zonebanners | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| monster-stills | `/sprites` | 2 | 2 | 0 | 2 | 0 |
| world-interiors | `/world/interiors` | 2 | 2 | 0 | 2 | 0 |
| world-dungeons | `/world/dungeons` | 1 | 1 | 0 | 1 | 0 |
| gear-walk-supplied | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| traits-shirt-thumb | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| traits-nft-meta | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| player-body-anchors | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| skills-crowns | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| wheel-overview | `/world/placed5` | 1 | 1 | 0 | 1 | 0 |
| world-ground-manifest | `/world/ground` | 1 | 1 | 0 | 1 | 0 |
| world-fish-spot-twins | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| player-death-twins | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| skills-strips-made | `/sprites` | 1 | 1 | 0 | 1 | 0 |
| sfx-owner-cuts | `/sfx` | 36 | 36 | 36 | 0 | 0 |
| icons-sheets | `/icons` | 35 | 27 | 35 | 0 | 0 |
| sfx-supplied | `/sfx` | 26 | 26 | 26 | 0 | 0 |
| ui-daily-spin | `/ui` | 21 | 10 | 21 | 0 | 0 |
| icons-elements | `/icons` | 20 | 18 | 20 | 0 | 0 |
| sfx-m4a-twins | `/sfx` | 19 | 19 | 19 | 0 | 0 |
| icons-coins | `/icons` | 14 | 14 | 14 | 0 | 0 |
| icons-items-world | `/icons` | 14 | 8 | 14 | 0 | 0 |
| icons-world-twins | `/icons` | 14 | 14 | 14 | 0 | 0 |
| icons-points | `/icons` | 13 | 13 | 13 | 0 | 0 |
| sfx-footsteps | `/sfx` | 10 | 10 | 10 | 0 | 0 |
| icons-hero | `/icons` | 9 | 7 | 9 | 0 | 0 |
| ui-controls-drawn | `/ui` | 8 | 8 | 8 | 0 | 0 |
| icons-elements-twins | `/icons` | 8 | 8 | 8 | 0 | 0 |
| monster-slime | `/sprites` | 5 | 4 | 5 | 0 | 0 |
| sfx-hand-cuts | `/sfx` | 5 | 5 | 5 | 0 | 0 |
| sfx-older | `/audio` | 5 | 5 | 5 | 0 | 0 |
| ambient-loops | `/audio` | 5 | 3 | 5 | 0 | 0 |
| icons-owner-items | `/icons` | 4 | 2 | 4 | 0 | 0 |
| music | `/audio` | 4 | 3 | 4 | 0 | 0 |
| icons-ui-unknown | `/icons` | 4 | 3 | 4 | 0 | 0 |
| tool-gestures | `/sprites` | 3 | 3 | 3 | 0 | 0 |
| icons-hero-crit | `/icons` | 3 | 1 | 3 | 0 | 0 |
| projectile-arrow | `/sprites` | 3 | 1 | 3 | 0 | 0 |
| icons-small-world | `/icons` | 3 | 2 | 3 | 0 | 0 |
| monster-slime-stills | `/sprites` | 3 | 2 | 3 | 0 | 0 |
| icons-from-uploads-world-twins | `/icons` | 3 | 3 | 3 | 0 | 0 |
| cape-hood-twins | `/sprites` | 3 | 3 | 3 | 0 | 0 |
| tool-pan | `/sprites` | 2 | 1 | 2 | 0 | 0 |
| icons-app | `/icons` | 2 | 2 | 2 | 0 | 0 |
| icons-svg | `/icons` | 1 | 1 | 1 | 0 | 0 |
| icons-frames-3x | `/icons` | 1 | 1 | 1 | 0 | 0 |
| ui-welcome-loop | `/ui` | 1 | 1 | 1 | 0 | 0 |
| player-anchors | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| weapons-handles | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| hud-bars | `/icons` | 1 | 1 | 1 | 0 | 0 |
| projectile-sheets | `/sprites` | 1 | 1 | 1 | 0 | 0 |
| icons-made-dom | `/icons` | 1 | 1 | 1 | 0 | 0 |
| ui-daily-chest | `/ui` | 1 | 1 | 1 | 0 | 0 |
| intro-poster | `/intro` | 1 | 1 | 1 | 0 | 0 |
| intro-clip | `/intro` | 1 | 1 | 1 | 0 | 0 |
| icons-achievements | `/icons` | 1 | 1 | 1 | 0 | 0 |
| npc-storekeeper | `/sprites` | 1 | 1 | 1 | 0 | 0 |

## By stage of the tour

| stage | table | hand | bare | not a file of the table |
|---|---:|---:|---:|---:|
| load | 372 | 1017 | 75 | 79 |
| land | 4 | 35 | 10 | 1 |
| fight | 0 | 0 | 0 | 0 |
| home | 3 | 0 | 42 | 1 |
| windows | 56 | 6 | 0 | 7 |

## The hand-kept keys seen (the query's shape, by folder)

A `<10 hex>` is a value the shape of this card's version that is not the file's own. `v=<its own>?v=<key>` (v2.3.6741) is an address the build stamped (PR 2) to which a loader then joined its own hand key: that loader is the card's PR 3.

| folder and query | requests |
|---|---:|
| `/sprites  ?v=2.3.3590` | 360 |
| `/sprites  ?v=2.3.2324` | 66 |
| `/sprites  ?v=2.3.3603` | 65 |
| `/sprites  ?v=103` | 42 |
| `/sprites  ?v=<its own>?v=2.3.3590` | 30 |
| `/world/ground  ?v=2026-10-01T19%3A51%3A25.074Z` | 28 |
| `/sprites  ?v=<its own>?v=2.3.3587` | 23 |
| `/sprites  ?v=2.3.3685` | 21 |
| `/ui  ?v=2.3.6641` | 18 |
| `/ui  ?v=2.3.2324` | 17 |
| `/sprites  ?v=<its own>?v=<10 hex>` | 17 |
| `/sprites  ?v=2.3.26` | 16 |
| `/sprites  ?v=2.3.2910` | 14 |
| `/ui  ?v=2.3.3526` | 14 |
| `/icons  ?v=2.3.4222` | 10 |
| `/sprites  ?v=<its own>?v=v2.3.3737` | 10 |
| `/sprites  ?v=<10 hex>?v=964` | 10 |
| `/sprites  ?v=2.3.5004` | 8 |
| `/sprites  ?v=1039` | 8 |
| `/sprites  ?v=<10 hex>?v=1103` | 6 |
| `/sprites  ?v=8` | 5 |
| `/sprites  ?v=<its own>?v=2026-10-18T02%3A43%3A02.602Z` | 5 |
| `/sprites  ?v=<its own>?v=2026-10-18T16%3A38%3A19.485Z` | 5 |
| `/ui  ?v=2.3.3481` | 4 |
| `/sprites  ?v=2.3.1875` | 3 |
| `/sprites  ?v=2.3.3776` | 3 |
| `/world/placed5  ?v=317a3f7d` | 3 |
| `/ui  ?v=<its own>?v=<10 hex>` | 3 |
| `/ui  ?v=2.3.3677` | 2 |
| `/sprites  ?v=<its own>?v=<10 hex>?v=2.3.4359` | 2 |
| `/sprites  ?v=2.3.2596` | 2 |
| `/world/interiors  ?v=2.3.3143` | 2 |
| `/world/dungeons  ?v=<its own>?v=2026-10-22T17%3A23%3A30.199Z` | 1 |
| `/sprites  ?v=2.3.2769` | 1 |
| `/sprites  ?v=v2.3.3737.f31b12902b6a3c76` | 1 |
| `/sprites  ?v=v2.3.3737.67be4ba5170f11f7` | 1 |
| `/sprites  ?v=v2.3.3737.7c703bde20ed3305` | 1 |
| `/sprites  ?v=v2.3.3737.68dae39d1d35aa87` | 1 |
| `/sprites  ?v=v2.3.3737.88af5dfc59e7a5d8` | 1 |
| `/sprites  ?v=v2.3.3737.7858c08c5bd03ad8` | 1 |
| (228 more shapes) | |

## Requests for no file of the table

The build's own scripts and styles (`/assets/`, already named by Vite with their hash and kept a year), the page, the world's code under `/tools/` (the ground worker's modules), the server's `/api/`.

| folder | requests |
|---|---:|
| `/tools` | 20 |
| `/assets` | 15 |
| `/api` | 6 |
| `/` | 1 |

### Asked for, and not shipped

Requests for a file that is not in the build: the page's fallback (`index.html`) or a 404 answered. A cost on every load, outside this card (its status file's Found).

| folder | requests |
|---|---:|
| `/sprites/traits/facialhair/beard/*` | 10 |
| `/sprites/traits/eyewear/golden-monocle/*` | 4 |
| `/sprites/traits/eyestyle/sleepy/*` | 4 |
| `/sprites/traits/eyestyle/one-eye/*` | 4 |
| `/sprites/traits/eyestyle/demon/*` | 4 |
| `/sprites/traits/eyestyle/wtf/*` | 4 |
| `/sprites/traits/eyestyle/alien/*` | 4 |
| `/sprites/traits/eyewear/3d-glasses/*` | 2 |
| `/sprites/traits/eyewear/goggles/*` | 2 |
| `/sprites/traits/eyewear/laser-glasses/*` | 2 |
| `/sprites/traits/eyewear/thug-life/*` | 2 |
| `/sprites/traits/eyewear/white-glass/*` | 2 |
| `/sprites/traits/eyewear/golden-glasses/*` | 2 |

### Other sites

Not the game's files, not this card's (this box reaches no outside site, so they fail here).

| host | requests |
|---|---:|
| fonts.gstatic.com | 3 |
| fonts.googleapis.com | 1 |
| raw.githubusercontent.com | 1 |

Every request: `tools/qa/mp/out/keepcensus.json` (not in the repository; 1713 rows).
