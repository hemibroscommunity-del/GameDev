# Each wood its own tree (v2.3.3345)

> The owner, 2026-10-18, on resources: *"A fun idea is to make the beginner tier
> scale up in physical size to the final tier where you have huge fish, ore,
> and trees at the end."* Then: *"Ok I agree with having each resource in every
> land. The problem though is that the appearance of the trees would need to be
> different to match the aesthetic of the land but the log art (in terms of
> color to represent the type of wood) would need to be the same across all 8
> lands to keep it consistent with the wood tier."* And: *"Maybe you add effects
> to a pine tree to make it look like it belongs in that elemental zone but the
> wood logs stay the same?"*, *"keep in mind there are actually 10 elemental
> zones"*. Sending the two pictures: *"You can start with this."*

Before this version, every tree you could chop was the same old painted pine.
Higher tiers took a colour wash over the whole tree and grew 15% taller every
two tiers. So a maple was an orange-tinted pine about as tall as a person and a
half.

Now **each wood has its own tree**, and it is the same picture in every land:

| Tier (gatherLvl) | Wood | Tree | Height | Bark, like its log |
|---|---|---|---|---|
| 1 (the commons) | Pine | a young pine | 1.5 people (159 px) | warm reddish brown |
| 6 (levels 1–10) | Softwood | a willow | 2 people (212 px) | olive tan |
| 11 (levels 11–20) | Hardwood | a gnarled old hardwood tree | 2.5 people (265 px) | dark chocolate brown |
| 16 (levels 21–30) | Cedar | a tall cedar | 3 people (318 px) | red brown |
| 21 (levels 31–40) | Maple | a huge autumn maple | 4 people (424 px) | orange brown |

- **The tree's shape and size say the tier.** It is small by town and huge at
  the far end. A player learns five trees once and knows them in any land.
- **The bark is its log's colour** (`docs/art/log-icons-key.png`). So the tree,
  the log in the bag and, later, the bow are one colour for one tier.
- **The land is not in the picture.** The plan is to show it with effects
  drawn in code (snow drifting down, embers rising), for all ten elemental
  zones. That is a later round (below).
- **The hardwood tree is not an oak.** The commons already has scenery oaks
  you can't chop.

## How it works

- **The pictures** are the owner's: two ChatGPT sheets, kept in
  `assets/prop-source/trees/`. The tool `tools/world/add-tree-art.mjs` cuts
  them with the Object Studio's own steps, in a headless Chromium as
  `add-farm-art.mjs` does:
  - the magenta is cut away;
  - the trees are found by count;
  - each tree is shrunk to its own height at 2 picture px a game px;
  - each sheet gets 64 colours of its own;
  - each tree is written as a see-through palette PNG to
    `public/sprites/trees/wood-<wood>.png`.

  It also writes `src/data/treeArt.js` (GENERATED). For each tier that holds
  the picture's size, its **foot** (the trunk's middle at its lowest row) and
  its **trunk**'s half-width, read 6–12% of the way up, above the roots.
- **`src/game/tierTrees.js`** says where a tree stands and how big it is, for
  everything that asks. It has no Pixi.
  - **The foot** stands `TREE_FOOT_DY` (27) world px north of the node's point.
    That is where the old pine's drawn base stood at tier 1. So everything
    worked out from the node's point keeps its meaning: the ground the bake
    keeps clear, the lumberjack planted at `node.y + 6` in front of the trunk,
    the reach test, the depth line.
  - **The trunk** (`treeTrunkEllipse`) is the only solid part. It is as wide as
    the trunk just above the roots and a third as deep. The crown is
    walk-under, as before.
  - **The lumberjack** (`treeChopOffset`) stands 59 px out (the blade's reach
    at the strike) less 60% of the trunk's half-width, 15 at most. So the
    blade bites inside the trunk whatever its size: 44 for a broad trunk, as
    before, and 55 for the slim pine, whose trunk the old 44 would have swung
    past.
- **The renderer** (`effectsRenderer`):
  - Loads the five pictures on the loading screen's gate (`_fxLoad`), as the
    preloading law wants.
  - Draws each tree at half its picture's px with the foot as its anchor,
    untinted. The depth line (`_groundDy`) is the foot.
  - Hangs the name label and the harvest bar over the tree's own crown, but
    never more than 300 world px above its foot (`treeMarkY`). Over the
    maple's top, 424 px up, an upright phone with the woodcutter at its trunk
    put the bar under the pinned quest card, so you could not see your chop.
    The maple and the cedar wear them in their crowns' upper part.
  - Stops loading `tree-pine-940` (3.4 MB decoded).
  - Moves the peer's lumberjack by the same rule (`_peerChopTree` carries the
    tree's tier).
- **Seen through when you stand behind one.** A tree is drawn over anyone
  behind its foot (the owner's v2.3.1500, kept by the depth pass), and the
  four-person maple would hide you whole.
  - So while its crown covers your body, it eases to 0.42 and back when you
    step out: `behindTree`, the scenery trees' rule and numbers (wheelObjects
    `_seeThrough`).
  - It is yours alone. `?treefade=0` keeps every tree solid.
- **The Wheel's node view** draws a node whose anchor is 480 px past the
  view's half-diagonal (`WHEEL_NODE_MARGIN`, was 320). The maple stands 451 px
  over its anchor, so its crown used to come into view with nothing drawn.
- **Walking.** BroTown's `nodeBlockEllipse` reads the trunk from `tierTrees`.
  `nodeWorldBox` (the tap box) is the sprite's own bounds, so a big tree is a
  big target to tap.
- **Where you can chop from** is NOT the picture. The worker pays a chop only
  from within `_nodeStrikeRange` of the node (`server/src/gathering.js`): the
  old pine's box (168 px tall at tier 1, 15% more every ten levels, 0.8 as
  wide, standing on the node), plus the reach test's 56 px pad and 24 of lag
  slack. A reach measured to the new crowns offered chops from up to ~580 px
  (the maple) that the worker refused in silence -- the v2.3.2273 bug, "Chopped
  logs were not going into my inventory", again. Found before this shipped,
  by the phone test below: on the first cut every tree failed it (the
  softwood offered a chop 312 px out, the worker pays to 261).
  - So the reach is `treeReachBox` (`tierTrees.js`), that very box, in
    BroTown's `nodeReachDist`: you chop from beside the trunk, where the
    lumberjack is drawn anyway. The tap still finds the whole tree.
  - The server is unchanged. Change `treeReachBox` and `_nodeStrikeRange`
    together, or neither.

## Memory

The five pictures are 5.6 MB decoded together, and the old pine was 3.4 MB, so
the game holds about **2.1 MB more**. They are 319 KB to download.

## Where each one grows (v2.3.3374)

The owner, of the resources' places: *"Yes fix #3 resource placement."*

`tools/world/bake-wheel-spawns.mjs` works out where every vein, tree and fishing
spot stands, and writes it into the server (`server/src/wheelspawns.js`, the
long Wheel, and `wheelspawns1.js`, the short one). Until now it kept tall
scenery out from in front of a node using the OLD art's one size for every
tier: a box 62 px a side and 196 tall for a tree, 52 and 118 for a vein. The new
maple is 428 px across and 424 tall, so a tall tree of the scenery could stand
over its crown.

Now:

- **Each tier's own picture.** A tree is kept clear as `treeGeom` draws it, and a
  rock as `oreGeom` does, from the picture's top down to its foot. Anything whose
  foot is south of that foot is drawn over it, so nothing like that may overlap
  it.
- **The woodcutter too.** As the miner's and the angler's spots always were, the
  woodcutter's (either side of the trunk, `treeChopOffset`, the side you came
  from) is kept clear. The old pine's box happened to cover it; a slim pine's
  picture does not.
- **Whole where there is room.** In the Verdant Wilds' thick woods a maple
  seldom stands clear of everything: at levels 31–40 there was room for 25 of
  the 30. So a band takes its places with the whole picture clear first. Only
  what that leaves short comes from places where the tree's middle half across
  and its lower half are clear: its trunk and what stands round it. The
  woodcutter, a rock and its miner are always clear.
- **No resource in front of another.** The live table had 15 places where a
  tree or rock stood in front of another resource's picture or the bro working
  it (a willow over an angler, mostly), the short Wheel's 6. Every node placed
  is remembered as what it draws and what must stay in view, and a new one may
  neither stand in front of those nor have its picture in front of a new one's.
  Now 0 in both.
- **Fishing spots first.** A spot needs water, a dry seat on the bank and that
  bank clear, and a land has few. They were chosen after the band's veins and
  trees, so the trees' bigger pictures cost some lands up to three a stretch.
  Now each band chooses its fishing spots first, and the veins and trees go
  round them. Open ground has room to spare.

What changed in the tables:

| | Long Wheel | Short Wheel |
|---|---|---|
| Veins and trees | every count as it was | every count as it was |
| Fishing spots | 1,222 → 1,223 in all: Frost Ridge's trout 9 → 8, its pike 6 → 8 | 259 → 260: Frost Ridge's salmon 1 → 2 |
| Places that moved | 1,002 of 1,223 | 176 of 260 |
| A resource in front of another | 15 → 0 | 6 → 0 |
| Monsters, doors, the safe ground | the same | the same |

- Near town nothing moved that you would notice. The first copper and pine out
  of the gates are where they were, and so are the commons' fishing spots. A
  few veins and trees round the commons moved 20–30 px.
- **The places now depend on the trees' and rocks' picture sizes.** A new cut
  of them (`tools/world/add-tree-art.mjs`, `add-ore-art.mjs`) means a re-bake.
  `test-world-core.mjs` runs the bake with `--check` and fails until it is done,
  and the re-bake changes `server/`, so the worker deploys.
- **A change here deploys the worker.** Merging it briefly disconnects players
  while the room restarts, and the room comes back with every resource whole,
  as after any deploy.

## Not in this round

- **The ten zones' effects** are the next round, drawn in code, with no art.
  Around town the trees stay plain. The idea for each zone:

  | Zone | Effect |
  |---|---|
  | Ice | snow drifting down |
  | Fire | embers rising and a warm glow at the base |
  | Wind | sand streaming off sideways |
  | Poison | green drips and spores |
  | Electric | sparks crackling |
  | Water | drips and a fine mist |
  | Stone | dust, pebbles and crystal glints |
  | Floral | petals and fireflies |
  | Dark | shadow wisps |
  | Light | motes of light rising |

  Dark and Light are the realms past each land's far gate, and they are not
  built yet.
- **The ore veins** came in the same version, from the owner's picture: one
  rock a metal, copper to obsidian (`docs/specs/tier-ore.md`).
- **The fish** grow more in the same version too: 14 px minnows to one 42 px
  pike (`tier-ore.md` "The fish").
- **Bows and staffs** look the same at every tier. They could take their
  wood's colour, as swords take their metal's.
- **The tiers past maple.** The woodcutting table (`WOODCUTTING_TIERS`) lists
  20 woods, Pine Log to Origin Wood, at levels 1–96. Only these five grow in
  the world, because the Wheel's monsters and resources stop at level 40.
  - Built out to level 80 and the realms to 100, one wood every ten land levels
    makes room for about eleven trees, not twenty.
  - The table's names past maple also differ from the bow bench's
    (`WOODWORKING_TIERS`: level 26 is Dense Wood to cut but an Ironbark bow).

  Both are the owner's call when that world is built. A tier past maple draws
  the maple (`treeArtLevelFor`).
- The old elemental tree pictures in `public/sprites/trees/` (`tree-flame` and
  the rest, 160 x 220) were already unused, and stay so.

## Tests

- `mp-tiertrees` runs on a phone in the Wheel. It walks out from BroTown to a
  tree of every tier and checks each one:
  - drawn with its own picture, at its own size, untinted;
  - its foot 27 px north of the node, with the depth line on it;
  - its label and its bar over its own crown (in the maple's and the cedar's,
    300 px over the foot), the bar on the screen below the top cards;
  - the lumberjack off by its own trunk.

  - where a chop is offered: the game's own reach test (`nodeReachDist`, on
    the `_gameFns` bridge), asked at every spot of an 8 px grid round the
    tree, offers it only within the worker's strike range less its 24 px of
    lag slack -- the worker's own function, imported -- and beside the trunk
    on either side.

  Then it checks that the pine's trunk stops you while its crown does not, and
  that the maple is seen through from behind and solid again from in front.
  Last, a real chop of the maple (Woodcutting 99, a tap, the worker's hits, the
  swipe) from the far edge of its reach, and the log read from the worker. It
  takes a picture of each tree and each chop:
  `tools/qa/mp/out/tiertrees-<wood>.png`.
- `mp-wheelnodes` now checks that the softwood tree is the willow at its own
  size and untinted. It used to check the softwood tint.
