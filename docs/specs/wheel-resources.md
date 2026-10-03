# The Wheel's resources — ore, trees and fish, richer the farther out (v2.3.3007)

Owner, 2026-10-03: *"Add harvestable resources back to the wheel"*, and of
their tiers: *"I'm thinking the higher lvl resources will be progressively more
distant ... let's plan on 'black steel' in like level 10+ areas and have its
own ore to mine. Iron can be in lvl 1 monster areas. Copper can be in the safe
areas around town. Same principle for fishing and wood cutting too."* And
earlier: *"fishing could be bodies of water close to town with active fishing
areas showing fish swimming around in the water"*.

Since the Wheel became the world (v2.3.2990) there was nothing to gather in
it, so Mayor Bro's two trade quests, *Learn a Trade* and *Rock Bottom*, could
not be finished. Now the Wheel grows **141 resource nodes** in three bands:

| Where | Levels | Gathering tier | Ore | Wood | Fish |
|---|---|---|---|---|---|
| The safe ground round Brotown (the commons) | — | 1 | copper | pine log | minnow |
| Each land's first two stages | 1–10 | 6 | **iron** | softwood | clownfish |
| Each land's next two stages, up to the first pass | 11–20 | 11 | **black steel** | hardwood | trout |

Past level 20 (the first pass) the next tiers will grow once they are
planned.

## What the player sees

- **Copper, pine and minnows round town.** Six copper veins and six pines on
  the commons, nearest the gates first, and ten fishing spots in its four
  ponds and the Sweetwater River.
- **Iron, softwood and clownfish** in every land's levels 1–10, where the
  monsters start: three veins and three trees in each of the eight lands.
- **Black steel, hardwood and trout** in levels 11–20, farther out: three veins
  and three trees in each land.
- **Every land has fishing** (the owner: *"Make all 8 have fishing spots"*).
  Clownfish swim in seven lands' levels 1–10 and trout in seven lands'
  levels 11–20. The two gaps are geography, not rules:
  - the Hollows' levels 1–10 have no water a line can reach;
  - the Verdant Wilds' shores at 11–20 have their water on the wrong side
    (below, "Fishing spots").
  The Hollows have trout, and the Verdant Wilds clownfish.
- **Each tier looks like itself.** An iron vein's flecks are rust red; a black
  steel vein is dark slate with blue-black metal; copper keeps its gold-flecked
  look. Softwood trees are paler and yellower than pines, hardwood darker and
  olive. In the bag, iron ore, black steel ore, softwood and hardwood each have
  their own icon, and the ore that pops out of a broken vein is its own.
- **A fishing spot is fish in the water.** The Wheel's spots stand in its real
  ponds, river and sea, so there is no painted pond any more: a few fish circle
  under the surface where the line will land, and rings open where they rise.
  The kind tells the tier — a school of six silver minnows, three orange-and-white
  clownfish, three big speckled trout. Fished out, the fish are gone until the
  spot comes back.
- **You fish from dry land.** Every spot has a patch of water to its west,
  four cells wide and three tall, where its fish swim. The angler sits on dry
  ground two cells east of it. Nothing tall stands in front of him, or in
  front of a vein or tree.
- **As anywhere, a node needs its tool** (axe, pole, pickaxe). Without the
  tool it is not drawn.
- **The minimap shows them** (the owner: *"Show nodes on minimap"*). Each
  vein, tree and fishing spot in the box's reach gets a small glyph: a
  faceted lump, a pine, a fish. Its colour is its tier:
  - ore: copper orange, iron rust, black steel slate;
  - trees: pine green, pale softwood, olive hardwood;
  - fish: silver minnow, orange clownfish, olive trout.

  The glyphs sit under the bros, the monsters and the quest's star. Like the
  world, the minimap marks only live nodes you hold the tool for
  (`wheelMinimap.js`; the glyphs are minted in `minimapRenderer.js`).
- **The quest's way leads to them.** *Learn a Trade*'s gold road on the
  minimap now goes to the nearest fishing spot, then, once a fish is in the
  bag, to the nearest tree. *Rock Bottom*'s goes to the nearest vein. Light the
  fire and cook have no road, as before.
- **A land's node drops that land's shard** (a third of the time, as
  anywhere). A commons node, which belongs to no element, drops none.

## Black steel

The tier after iron is **Black Steel** now. Its ore is the one levels 11–20
grow (`ore_black_steel_ore`), and the blacksmith's tier that used to be called
Steel forges from it. Its key stays `steel`, because that is the `gearBase`
every forged piece carries and the art's material name. No steel ore was ever
gathered, so no bag held the old key.

**It is black** (the owner: *"Make the black steel black"*). A black steel
sword or greatsword is drawn in the **Black Steel** metal, a blued near-black:
the art's white highlights land on a dark slate (73, 78, 97) and everything
under them darker. That is as black as a tint can go and still show the
blade's shape (`materialTints.js` `MATERIALS.blacksteel`).

- The forge tier keeps its key, so weapons reach the metal through
  `BASE_MATERIAL` (`steel` → `blacksteel`). `steel` itself is still the native
  art for anything else.
- Its design colour is its tint, so the character portrait (a multiply by the
  design colour) and the world (a multiply by the tint) draw the same blade.
- Its bag and forge icons were written by `tools/gear/make-metal-icons.mjs`'s
  multiply, saved lossless: `sword-`, `great-sword-`, `chest-plate-` and
  `greaves-blacksteel.webp`.
- There is no black steel armour yet. The two armour icons are only what the
  tool writes for every metal.

## How it works

**Where they grow is baked from the plan**, like the monsters' places
(`tools/world/bake-wheel-spawns.mjs` → `server/src/wheelspawns.js`,
`WHEEL_NODES`). The worker has no copy of the map and must never build one.
For each area (the commons, then each land) and each band:

- **Veins and trees** stand on open ground of the band. They are kept clear of
  water, roads, the town, every placed object and every monster place. They
  are also kept apart from each other, across lands too, since two lands'
  bands meet at a border. They are also kept off the safe circle, because
  `WHEEL_SAFE_R` reaches a few hundred px into some lands' levels 1–5. Nothing
  tall may stand in front of the node's picture or the miner.
- The commons fills in **nearest town first**; a land's are spread across its
  band **farthest-first**.
- **Fishing spots** are placed by where the baked rod's line falls. The line
  drops down-left of the angler and ends 52 px west of him, 9 px above his
  boots. So a spot needs:
  - a 4 × 3 patch of water from three cells west of it to its own cell, one
    row up and down (its fish swim there, `wheelNodes.js` `SWIM_*`);
  - the cell east of it, which the line crosses;
  - two dry, clear cells under the angler's seat (`FISH_SEAT_DX/DY`, 52 px
    east).

  The first bake asked for a perfectly straight five-row north–south shore,
  which wandering or east–west coasts never have. The Wind Dunes, the Storm
  Peaks and the Verdant Wilds had no spot at all. Spots are in fresh water in
  the commons, a land's coast for clownfish, and its rivers and pools for
  trout (the coast where it has none).

  A shore whose water lies EAST of the land would need the angler mirrored,
  casting right. That is the Verdant Wilds' trout and much of every eastern
  shore. The Hollows' levels 1–10 have only east–west shores, which the line
  cannot reach from either side.
- Positions depend only on the plan and the placer, never on which pictures
  exist. `test-world-core` fails when `wheelspawns.js` is stale, as before.

**The worker** (`server/src/wheelzone.js` `_wheelSpawnNodes`, called from
`gathering.js` `_spawnZoneNodes` for zone `wheel`) builds each baked node
exactly as any zone's: id `wn-<area>-<k>`, `nodeType`, `x`, `y`, `tierLvl`, plus
`home`, the land it grows in (none in the commons). Everything after that is the
ordinary gathering path: tools, reach, the hits, the gesture's window, the
anti-bot cap, XP, respawn. Two things are the Wheel's own:

- the item names for tier 11 (`_harvestNameForTier`: Hardwood, Trout, Black
  Steel Ore);
- a Wheel node's shard is its `home`'s (`shard_wheel` is not an item), and a
  commons node drops none.

On the wire, a Wheel node carries `home` in `zone_state`; every other zone's
snapshot is byte-identical.

**The client** (`src/rendering/wheelNodes.js`, `effectsRenderer`
`_updateGatherNodes`):

- In the Wheel only the nodes **near the view** are drawn (`wheelNodeView`):
  the view's half-diagonal plus 320 px, let go 400 px further. The rest hold
  no sprite and no text, as far monsters are left undrawn. Their game state is
  untouched. A vein that comes into view already mined does not replay its
  break.
- A Wheel fishing spot is drawn by `WheelFish`, in code, on the ground-loot
  layer the pond used, so a monster wading past covers it.
- Tier pictures: `NODE_TIER_SOURCES` (the two vein recolours, loaded on the
  intro gate with the other node art, 1.4 MB decoded), `NODE_TIER_TINT` (the
  trees), `ORE_BREAK_TINT` and `ORE_ICON_TIER_TEX` (the break). They were made
  by `tools/make_tier_art.py` (gradient maps of the existing art, as
  `make_bar_icons.py` makes the bars).
- The walk test skips a fishing spot's pond ellipse in the Wheel: its water
  already stops you, and the ellipse would only take a bite out of the bank.
- Walking up to town drops the Wheel's nodes **on the frame the zone flips**
  (`zoneTransitions.js`, as the monsters are). Before, they stayed until town's
  snapshot came in: drawn, reach-tested and walked into, at the Wheel's
  coordinates, in town.
- The quest's way (`questRoute.js` `_wheelGatherPoint`) reads the kind of node
  from the quest. For `life_1` it is the current step's `node` (fish, then a
  tree); for `life_2` the quest's own `node: 'oreVein'`.

## Deploy order and the kill switch

`caps.wheelnodes` (lower case, a kill switch, TRAPS §117). An older worker
grows no Wheel nodes and does not advertise it. The client then skips the
"no nodes yet" re-send it would otherwise make four times on every way into
the Wheel (`nodeSync.js`), and the Wheel is as before. `wheelnodes: false` in
liveflags un-advertises the cap, and a Wheel whose nodes are spawned after it
has none. Nodes already spawned stay until the room restarts, as the monsters
do.

## Tests

- `server/test/wheelzone.test.mjs` §8 (the worker), 25 assertions:
  - every baked node spawns, with a unique id, a kind and a tier;
  - the commons grows tier 1 with no shard; every land grows iron and black
    steel, softwood and hardwood, off the safe ground; clownfish and trout grow
    somewhere, and every one of the eight lands has fishing;
  - the median distance from town rises with the tier; no two nodes are within
    160 px; none is in a monster camp;
  - the nine names, black steel ore is what the black steel tier forges, and
    the woods are what the bows take;
  - a harvest pays end to end, with its land's shard and none on the commons;
    a strike from another zone is refused;
  - the wire carries `home` only in the Wheel; `caps.wheelnodes`; the kill
    switch.
- `mp-wheelnodes` (phone, real worker), 26 assertions:
  - none drawn without tools, and none marked on the minimap;
  - the road goes to the nearest fishing spot, then to a tree;
  - six minnows swim where the game's own walk test says is water, and the
    seat is dry;
  - the minimap marks every live node in its reach once the tools are in;
  - a black steel greatsword is drawn in the Black Steel metal;
  - tapping and the gesture pay a minnow, and the fish go;
  - only the nodes near the view hold a display;
  - an iron vein is drawn in its own picture, and mining it pays iron ore;
  - the nodes drop at the flip to town;
  - no page errors.
  - Pictures: `wheelnodes-{fish,fish-close,minimap,blacksteel,iron,iron-close}.png`.
- `test-world-core` checks the bake is current; `mp-questline` (CI's
  "playable") still passes in the Wheel.

## Not in this round

- The world map (the overlay a tap on the minimap opens) shows no nodes.
- Tiers past 20 (titanium, cedar, …) are not placed.
- Two lands' bands have no fishing of their tier:
  - The Hollows at 1–10 have no water a line can reach.
  - The Verdant Wilds at 11–20 have shores whose water lies east of the
    land. A mirrored angler would reach them, but that means flipping the
    fishing pose, its rod overlay and armour layers, and how other players
    see you fish.
- The Wind Dunes' oases are ringed with palms that stand in front of every
  seat. The dunes fish their coast.
- The node art for veins and trees is the old painted art; Wheel-style
  pictures would come from the Object Studio.
