# Each metal its own rock, and bigger fish (v2.3.3345, the rocks 1.4x since v2.3.3443)

> The owner, 2026-10-18, on resources: *"A fun idea is to make the beginner tier
> scale up in physical size to the final tier where you have huge fish, ore,
> and trees at the end."* After the trees (`docs/specs/tier-trees.md`), they
> sent one picture of five rocks on green, small to big, with no words.

Before this version, every ore vein was the same painted copper vein. Higher
tiers had its colours mapped to their metal (`tools/make_tier_art.py`) and grew
15% taller every two tiers. When a vein was mined out, a copper vein cracked in
two, tinted.

Now **each metal has its own rock**, the owner's, and it is the same picture in
every land:

| Tier (gatherLvl) | Ore | Where | Rock | Size (game px) | First cut (v2.3.3345) |
|---|---|---|---|---|---|
| 1 | Copper | the commons | orange and verdigris | 81 wide, 81 tall | 58 x 58 |
| 6 | Iron | levels 1–10 | rust red | 98 x 95 | 70 x 68 |
| 11 | Black steel | levels 11–20 | deep blue | 124 x 112 | 89 x 80 |
| 16 | Titanium | levels 21–30 | pale steel | 138 x 132 | 98 x 94 |
| 21 | Obsidian | levels 31–40 | purple glass | 178 x 157, half as tall again as you | 127 x 112 |

The rock's size says its tier, as the trees' do. A tier past obsidian (the
mining table goes to 96; nothing grows there yet) draws obsidian. Since
v2.3.3443 every rock is 1.4x the first cut, so that copper hides the miner's
shirt as the old vein did (below, "As tall as the old vein again").

## Where a rock stands

The miner decides it. He works a rock from behind it: `startExtraction` seats
him 7 px west and 86 px north of the node's point (`MINE_SEAT_DX/DY`), and he
is drawn 8 px higher than that. His swing's sheet (`mine-south`) has a rock of
its own baked in under his boots, which the real rock -- drawn over him while
he mines -- has to hide. The art cannot lose it: it is one blob with his boots.

Measured on a phone through the body sprite's own transform (`mp-tierore`):

- the baked rock lies 27 to 59 px north of the node's point, from 13 px west to
  18 east at rest, its chips flying 27 west to 35 east at the blow;
- his shoulders are ~111 px over the point and his head 114 to 136;
- **the old copper vein covered 67% of the baked rock.** Its base stood 35 px
  north of the point, and the rest poked out under it -- the "it sits a little
  beneath the ore sprite" the owner saw in v2.3.1476.

So, in `src/game/tierOre.js`:

- every rock's **base** stands `ORE_BASE_DY` (22) px north of the node's
  point, its foot's middle on the point's x. Each of the five then lies over
  **all** of the baked rock at rest, and over 98% (copper's flying chips) to
  all of it at the blow -- since v2.3.3443's bigger rocks, 99.5% (copper) to
  all of it;
- no rock is drawn higher than `ORE_TOP_MAX_UP` (110) px over the point, under
  the miner's shoulders. A taller one stands further south instead, so he keeps
  his head and shoulders over it. Since v2.3.3443 that is every rock from iron
  on: iron's base 15 px north of the point, black steel's 2 px south,
  titanium's 21.5 south and obsidian's 47 south (in the first cut only titanium
  and obsidian, 16 north and 2 south). The old vein hid him to the chin from
  black steel on.

The first cut's copper was as big as it was because it had to hide the baked
rock: smaller, and the rock in his swing showed. It turned out to be too small
for his shirt (next section).

## As tall as the old vein again (v2.3.3443)

> The owner, of the first cut: *"One problem is that the smaller ore size now
> exposes the unfinished design work around aligning the players worn items
> during the animation (shirt doesn't fit during animation). Can you make the
> ore the original size again but just scale up the other ores to keep the size
> differences relatively the same?"*

In the miner's swing (`mine-south`) the shirt (`gear/shirt/tshirt/mine-south`)
rides up off the trousers, and a band of bare belly shows under its hem in all
fourteen frames: 1,340 pixels of the body's skin within 12 rows under the
shirt's lowest row, frame by frame. The old copper vein stood its rock from 35
to 102.5 px over the node's point and hid most of it. The first cut's copper
stood from 22 to 80 px and hid almost none.

The rock cannot simply stand higher again: its base at 22 px north is what
hides the rock baked into the swing (above). So it has to be taller. Cut from
the owner's picture at each size and counted over the fourteen frames (the
first column is pixels of the band left showing):

| Copper | Band showing | Its top over the point | Size (game px) |
|---|---|---|---|
| the old vein, where it stood | 163 | 102.5 | 72 x 68 |
| the first cut | 1,331 | 80 | 58 x 58 |
| 1.2x (the old vein's own size) | 685 | 91 | 70 x 69 |
| 1.3x | 217 | 97 | 76 x 75 |
| **1.4x** | **52** | **102.5** | **81 x 81** |

At **1.4x** copper's top is back on the old vein's top line, and it hides more of
the band than the old vein did. Every rock is cut at the same 1.4x
(`tools/world/add-ore-art.mjs` `ORE_GROW`), so the steps between the five stay
the first cut's. From iron on, each rock meets `ORE_TOP_MAX_UP` and stands
further south (above). None leaves more than 39 pixels of the band showing:
iron 12, black steel 21, titanium 27, obsidian 39.

What changed with them:

- **Where the resources stand** (`tools/world/bake-wheel-spawns.mjs`, which
  keeps each rock's own drawn box clear since v2.3.3401). Re-baked:
  - the live Wheel keeps all 1,222 resources, every land, kind and tier's
    count as it was;
  - 198 rocks and 195 trees stand somewhere new (a rock's band places trees
    after it);
  - every fishing spot, the commons' first copper and pine, every monster and
    every dungeon door are where they were;
  - no resource stands in front of another;
  - the short Wheel keeps its 260.

  This changes `server/src/wheelspawns.js` and `wheelspawns1.js`, so merging
  deploys the worker.
- **Memory**: the five pictures are 1.2 MB decoded (0.6 before), 74 KB to
  download.
- **Nothing else** needed changing: the label, the bar, the walk test, the
  tap, the break into pieces and the lands' effects all read the rock's size
  from `oreArt.js` through `tierOre.js`. The miner's seat is unchanged, so the
  strike still comes from 86 px, inside the worker's 110.

The shirt itself still rides up in the swing, and a rock only hides it while
you mine. Fitting the shirt to the mining sheet is still to do.

## How it works

- **The picture** is the owner's, kept in `assets/prop-source/ore/ore.png`. The
  tool `tools/world/add-ore-art.mjs` cuts it with the Object Studio's own
  steps, as `add-tree-art.mjs` does: the green cut away, the rocks found by
  count, each shrunk to its own height at 2 picture px a game px, 64 colours
  for the sheet, trimmed, written as see-through palette PNGs to
  `public/sprites/ore/ore-<metal>.png`. It writes `src/data/oreArt.js`
  (GENERATED): each picture's size and its **foot** (the middle of its lowest
  rows, at its lowest row).
- **`src/game/tierOre.js`** says where a rock stands (`oreGeom`) and the body
  you cannot walk into (`oreBlockEllipse`: its whole drawn body, the owner's
  rule for ore since v2.3.1500). No Pixi.
- **The renderer** (`effectsRenderer`):
  - loads the five pictures on the loading screen's gate (`_fxLoad`);
  - draws each at half its picture's px, untinted, the depth line
    (`_groundDy`) its base;
  - hangs the name label over the rock's top and the harvest bar under its
    base, as before ("For mining you can put the bar beneath the ore");
  - **a rock mined out breaks into pieces of itself**: its own picture cut into
    shards (`wheelShatter.js`, the cut and the fall the Wheel's broken objects
    use), flying apart from the pick's blow on its north-west, falling where it
    stood, fading after 0.9 s. The ore still pops out and the rock still cracks
    350 ms in, where the old strip's split frame was (`ORE_SPLIT_MS`), on
    whatever frame reaches it (v2.3.3146's rule).
- **BroTown**: `nodeBlockEllipse` and `nodeWorldBox`'s fallback read
  `tierOre.js`. The reach is the rock's box plus 56 px, as before, and the seat
  then snaps you in: the strike always comes from the seat, well inside the
  worker's 110 px.

The server is unchanged.

## Memory

The five rocks are **1.2 MB** decoded together since v2.3.3443 (0.6 MB in the
first cut). The old copper vein, its four
colour-mapped twins and the break strip were 7.7 MB (and the strip's mipmaps on
top), and none of them is loaded any more. They are 74 KB to download (46 KB in
the first cut). The old files stay in `public/sprites/world/`, and `mp-tierore`
reads the old vein's picture as its yardstick.

## The fish

The fish are drawn in code (`src/rendering/wheelNodes.js`), so they grow there.
Each tier's are bigger and fewer:

| Tier | Fish | How many | Length | Was |
|---|---|---|---|---|
| 1 | minnows | 6 (a school) | 14 px | 6 x 16 |
| 6 | clownfish | 4 | 23 px | 3 x 19 |
| 11 | trout | 3 | 30 px | 3 x 25 |
| 16 | salmon | 2 | 37 px | 3 x 27 |
| 21 | pike | 1 | 42 px (55 nose to tail) | 2 x 31 |

A bro is ~64 px tall. A bigger fish swims a smaller circle (`swim`), so all of
it, its tail too, stays in the block of water the bake keeps west of a spot
(x-84..x+12, y-36..y+36). Worked out over the whole circle for nose and tail,
the pike reaches x-71..x+11 and y +/- 35. Past that a fish dives, as before.

## Not in this round

- **The ten zones' effects** on trees and rocks, drawn in code: v2.3.3402
  (`docs/specs/land-auras.md`).
- **The bake's sizes** were the OLD art's (a tree 62 x 196, a vein 52 x 118).
  Since v2.3.3401 the bake keeps each tier's own rock clear, and its miner
  (`docs/specs/tier-trees.md` "Where each one grows").

## Tests

- `mp-tierore` runs on a phone in the Wheel. It walks out from BroTown to a vein
  of every tier and checks each one:
  - drawn with its own picture, at its own size, untinted;
  - its rock where `tierOre.js` says, the depth line its base;
  - its label over its top;
  - seated to mine it: the rock baked into the swing, every pixel taken through
    the body sprite's own transform into the vein's picture, all under the
    vein's solid pixels at rest and at least 97% at the blow; the rock no
    higher than the miner's shoulders; the bar under its base, on the screen;
  - and since v2.3.3443 the bare belly his shirt's hem shows in the swing,
    counted the same way, leaves no more pixels showing than the old copper
    vein did (`ore-vein-627`, placed as it stood). On the first cut it failed
    at the copper (1,331 against 163) and the iron.

  At the copper, walking north into it stops you short of its middle. At the
  copper and the obsidian, a real mine (Mining 99, a tap, the worker's hits, the
  gesture): the rock breaks into pieces of itself that fade, it cracks, and
  the worker pays its ore. Pictures: `tools/qa/mp/out/tierore-<metal>.png`,
  `-mine.png`, `-break.png`.

  The pieces lie 0.9 s in the game. The test holds them 20 s with
  `?orebreakms=20000` and checks they are still there once `-break.png` is
  taken. On the test machine the break is seen a few seconds after it starts,
  and a screenshot takes seconds more: with the pieces held 6 s, no picture
  showed them.
- `mp-wheelnodes` checks the iron vein is its own rock (it checked the old
  418 px twin), and still mines it.
