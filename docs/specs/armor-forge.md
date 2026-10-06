# Bars into armor at the Blacksmith (v2.3.3092)

> Asked *"Should smelted bars make armour?"*, the owner said *"Yes"*.

It finishes the loop the owner asked for when smelting shipped: *"Make ore
smelt in to bars. Bars into armor."* (docs/specs/smelting.md). Until now a bar
was only worth its vendor price.

## What the player sees

- The Blacksmith has a fifth tab, **Armor**, beside Forge.
- Each row is one piece, made the way the other tabs show things (chips, not
  sentences):
  - the bars it takes, HAVE/NEED;
  - how much damage it stops, e.g. "-30%";
  - the Smithing XP it pays;
  - for black steel, "Defense 5 to wear".
- The tab lists everything you can make now, plus the next metal's two pieces
  with their lock ("Smithing 5"), as the Forge tab shows its next tier.
- **Forge** sends the request. The piece lands in the bag ("BAG: Copper Torso")
  and "+1000 Smithing XP" shows over the smith. A Smithing level-up gets the
  usual life-skill celebration. You wear the piece from the bag like any other.
- Iron and black steel **bars** now smelt too, on the Smelt tab, with their own
  pictures.
- A bar's bag card says "Forge into armor at the Blacksmith".

## Numbers

**Bars** (`SMELT.RECIPES`, server/src/smelting.js):

| Bar | Ore | Smithing | XP a bar |
|---|---|---|---|
| Copper Bar | 5 copper ore | 1 | 400 |
| Iron Bar | 5 iron ore | 5 | 600 |
| Black Steel Bar | 5 black steel ore | 10 | 800 |

**Armor** (`ARMOR_FORGE.RECIPES`, server/src/armorforge.js):

| Piece | Bars | Smithing | Armor step | Stops (normal grade) | XP |
|---|---|---|---|---|---|
| Copper Torso | 4 copper | 1 | 1 | 30% | 800 |
| Copper Greaves | 4 copper | 1 | 1 | 20% | 800 |
| Iron Torso | 4 iron | 5 | 2 | 37.5% | 1,200 |
| Iron Greaves | 4 iron | 5 | 2 | 25% | 1,200 |
| Black Steel Torso | 4 black steel | 10 | 3 | 45% | 1,600 |
| Black Steel Greaves | 4 black steel | 10 | 3 | 30% | 1,600 |

- **Smithing 1, 5 and 10** follow the owner's "levels of 5", the same steps the
  ores' own Mining gates use (black steel ore at Mining 5). Each metal's armor
  opens with its bar.
- **Four bars a piece, torso and greaves alike** (since v2.3.3110; it was
  five and three). The owner: "chest, legs, and sword each take 4 bars to make
  (5 ore makes 1 bar). If you salvage them you get 2 bars back." Salvage and
  the swords' bars are in docs/specs/salvage.md.
- **XP is 200, 300 and 400 a bar used**, half what smelting that bar paid.
- **The armor step** is the armor's own ladder of whole steps (copper 1, iron 2,
  black steel 3; monster-drops.md "Two ladders, one metal"). Black steel asks
  for 5 Defense before it can be worn, through the same `armorDefReq` every
  third-step piece uses.
- **The grade** is rolled as every piece's is (`_rollWeaponQuality`): mostly
  normal, 9% rare, 0.9% elite, 1 in 2,000,000 godly.
- **No gold.** Like smelting, the bars are the cost. A coin price is one field
  per row if it is wanted.

## How it is built

- **Server-settled** (`server/src/armorforge.js`). The client sends
  `forge_armor { recipe }`: a key and nothing else. The worker then:
  1. checks the level and the bars, and takes the bars from its own copy of
     the bag;
  2. mints the piece into the provenance ledger (`src: 'forge'`, as the amulet
     bench does);
  3. pays the XP and saves;
  4. answers `forge_armor_result { recipe, piece, xp, leveled, fromLevel,
     newLevel }` (privileged), then `player_state`.
- **The piece** is the one a monster drops, the daily chest pays or a quest
  grants: `{name, mat, slot, tierMult, quality, gid}`.
  - It carries **no `gearBase` and no `type`**. Either one would move it off
    the armor ladder (data.js `isArmourLadderPiece`) and price it from the
    weapon table.
  - `mat` uses the art's metal ids: `copper`, `iron`, `blacksteel`.
- **Into the bag.** The game puts the piece in its bag through
  `_applyLootCredit`, the daily chest's own path, with its id, metal and grade.
  The worker adopts it by id at the next join (gearstash.js), as it adopts a
  dropped piece. It is worn by its id (`stats_update armorRef`), as every minted
  piece is.
- **The recipe key** is looked up with `hasOwnProperty`, so `__proto__` and
  `constructor` forge nothing (TRAPS #6). The handler is synchronous, so it
  has no opId, the same as `smelt_bar` and `forge_weapon`.
- **Deploy order:** `caps.armorforge` gates the Armor tab and the bar's bag
  line. An older worker has no `forge_armor` case and would rebroadcast the
  request.
- **Kill switch:** `armorforge: false` in liveflags refuses every forge and
  un-advertises the cap. Bars and armor already made are untouched.
- **Black steel's art** (`gearVariants.js`):
  - Two rows, `blacksteelplate` and `blacksteelgreaves`. They use the steel
    sheets tinted with `blacksteel`, so they add no download.
  - Without them a black steel piece drew as bright steel, and the full-set
    knight (both pieces in one metal) never formed.
  - The bag icons (`chest-plate-blacksteel.webp`, `greaves-blacksteel.webp`)
    have existed since v2.3.3012.
- **Bar icons:** `python3 tools/make_bar_icons.py iron blacksteel` writes
  `bar-iron.webp` and `bar-blacksteel.webp` from the owner's grey ingot, in the
  colours the armor wears.

## Not in this change

- **The Forge tab's weapons still take ore**, not bars. Moving them to bars is
  its own change, and the owner's call.
- **A lost receipt.** If the answer cannot reach the game (the socket drops at
  that moment), the piece is recorded in the ledger but never reaches the bag.
  The daily chest accepts the same risk.

## Tests

- `server/test/armorforge.test.mjs` (23 checks):
  - caps;
  - the exact bars taken;
  - the piece's shape: no gearBase or type, a grade, its ledger row from the
    forge;
  - the XP and the receipt;
  - the greaves' slot;
  - refusals that change nothing: a level short, bars short, junk, inherited
    or unknown keys, a dead player;
  - iron at 5 and black steel at 10;
  - worn by its id, with black steel's 5 Defense;
  - the kill switch.
- `server/test/smelting.test.mjs`: the iron and black steel bars (cost, levels,
  XP, vendor).
- `mirror-audit`:
  - the recipes on both sides, every field;
  - every recipe's bar is one the smelter makes;
  - no armor opens before its bar.
- `mp-armorforge` (12 checks, a real client against a real worker): the tab
  and its rows, a torso and greaves forged into the bag with the worker's id,
  the popups and the XP, Forge off at 0/5, the bars' pictures. Pictures:
  `armorforge-*.png`.
- `mp-smithy`: five tabs now, and the Armor tab's text budget.
