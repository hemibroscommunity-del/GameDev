# The Wheel's resources — ore, trees and fish, richer the farther out (v2.3.3012)

Owner, 2026-10-03: *"Add harvestable resources back to the wheel"*, and of
their tiers: *"I'm thinking the higher lvl resources will be progressively more
distant ... let's plan on 'black steel' in like level 10+ areas and have its
own ore to mine. Iron can be in lvl 1 monster areas. Copper can be in the safe
areas around town. Same principle for fishing and wood cutting too."* And
earlier: *"fishing could be bodies of water close to town with active fishing
areas showing fish swimming around in the water"*.

Since the Wheel became the world (v2.3.2990) there was nothing to gather in
it, so Mayor Bro's two trade quests, *Learn a Trade* and *Rock Bottom*, could
not be finished. Now the Wheel grows **142 resource nodes** (140 until v2.3.3013, below) in three bands:

| Where | Levels | Gathering tier | Ore | Wood | Fish |
|---|---|---|---|---|---|
| The safe ground round Brotown (the commons) | — | 1 | copper | pine log | minnow |
| Each land's first two stages | 1–10 | 6 | **iron** | softwood | clownfish |
| Each land's next two stages, up to the first pass | 11–20 | 11 | **black steel** | hardwood | trout |
| Past the first pass (v2.3.3094) | 21–30 | 16 | **titanium** | cedar | salmon |
| ...out to the camp at 40 (v2.3.3094) | 31–40 | 21 | **obsidian** | maple | pike |

Since v2.3.3094 the second stage grows its own too: see "Past level 20"
below. 259 nodes in all.

## What the player sees

- **Copper, pine and minnows round town.** Six copper veins and six pines on
  the commons, nearest the gates first, and ten fishing spots in its four
  ponds and the Sweetwater River.
- **Iron, softwood and clownfish** in every land's levels 1–10, where the
  monsters start: three veins and three trees in each of the eight lands.
- **Black steel, hardwood and trout** in levels 11–20, farther out: three veins
  and three trees in each land.
- **Every land has fishing** (the owner: *"Make all 8 have fishing spots"*).
  Clownfish swim in six lands' levels 1–10 and trout in seven lands'
  levels 11–20. The three gaps are geography, not rules:
  - the Hollows' levels 1–10 have no water a line can reach;
  - the Electric Foundry's coast at 1–10 has no dry seat: its one spot
    there had the angler's boots on drawn water, and the next is too far
    in;
  - the Verdant Wilds' shores at 11–20 have their water on the wrong side
    (below, "Fishing spots").
  The Hollows and the Electric Foundry have trout, and the Verdant Wilds
  clownfish.
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
- **Swimming (v2.3.3003) and the resources.** The water a spot's fish swim in
  is water you can swim in too. A swimmer who taps a fishing spot climbs out
  onto its seat and fishes from there, and the same for a vein, as fishing and
  mining always seat you and every Wheel seat is baked onto dry ground. A tree
  or a campfire has no seat, so chopping or cooking from the water is refused
  with "Swimming!", like a swing (`lifeSkillRewards.js` `startExtraction`).
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
  - dry, clear ground under the angler's seat (`FISH_SEAT_DX/DY`, 52 px
    east): the boots' cell, the one east of it and the one below it (the
    boots stand 3 px above that cell's edge). Each is ground by the plan and
    by the game's own walk grid, which counts a land cell mostly ringed by
    water as water: since swimming (v2.3.3003) that is water you swim in.

  A survey of all 33 seats in the game, the ground as it is drawn, found
  three with the angler's boots on drawn water and one on a land cell the
  walk grid counts as water. The rule above fixes all four: a second survey
  of the 32 left found every pair of boots dry. It cost the Electric
  Foundry its levels 1–10 spot.

- **v2.3.3013: clear of the next stretches' monsters too.** Every land's
  levels 6–20 got monsters of their own the same day (docs/specs/
  wheel-monsters.md "Past level 5"), so a node keeps its 300 px from those
  places as well (`monsterPts` in the bake takes each land's `deeper`
  places). Before, 24 nodes stood inside that distance of one.
  - The bake places nodes one after another, so moving those moved 84 of
    the 140. The count per land, kind and tier is unchanged, except that the
    Water Caves and the Mist Marsh each gained a levels 1–10 fishing spot:
    **142** in all, 34 of them fishing spots.
  - The seat survey is a scenario now, **`mp-wheelseats`**. It walks to every
    fishing spot on a phone and reads the ground as drawn. All 34 pass: every
    spot and its school's middle are in water, and every seat is open land
    with the angler's boots dry and fewer than four of a swimmer's five looks
    wet, so a seated angler stays out of the water.
  - It also prints where the drawn shore brushes a seat's edge or a school's
    rim. Two commons spots, unchanged since v2.3.3012, show it:
    `wn-commons-19`'s seat has two of its five looks on water (the boots
    themselves dry), and one rim point of `wn-commons-12`'s school is on the
    bank. That is a look, not a fault, and it is reported rather than
    asserted.

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
- The walk test skips a fishing spot's pond ellipse in the Wheel: you swim in
  its water (or, with `?noswim`, the water stops you anyway), and the ellipse
  would only take a bite out of the bank.
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
- `mp-wheelnodes` (phone, real worker), 29-30 assertions:
  - none drawn without tools, and none marked on the minimap;
  - the road goes to the nearest fishing spot, then to a tree;
  - six minnows swim where the ground is drawn as water, and the seat is dry
    ground: its cell is land, the walk test opens it, and at most one of a
    swimmer's five looks round the boots is wet, so one who climbs out there
    is out of the water;
  - a swimmer beside the spot who taps it is seated on the bank, fishing, and
    swimming no more;
  - a tree tapped while swimming is not chopped, and "Swimming!" says why;
  - the minimap marks every live node in its reach once the tools are in;
  - a black steel greatsword is drawn in the Black Steel metal;
  - tapping and the gesture pay a minnow, and the fish go;
  - only the nodes near the view hold a display;
  - an iron vein is drawn in its own picture, and mining it pays iron ore;
  - the nodes drop at the flip to town;
  - no page errors.
  - Pictures: `wheelnodes-{fish,fish-close,minimap,blacksteel,iron,iron-close}.png`.
  - v2.3.3016: its long walks could stall, on main as well. The walker
    checks the worker's idea of where it stands every four hops and steps
    back to it when they differ; on this box's slow frames the last hop had
    often not reached the worker yet, so the walker stepped back, the worker
    then took the hop, and the two chased each other 200 px each way. After
    two minutes without a tap or a key the page logged the angler out as
    away, and the minnow was never paid. Now the walker steps back only to a
    place the worker still holds a beat later, and presses Control (which
    does nothing in the game) every 20 s, as `mp-wheelseats` does. 29
    assertions on the re-baked places: the "softwood tree near the iron vein"
    check runs only when one is in view there.
- `mp-wheelseats` (v2.3.3013, phone, real worker): every one of the 34 fishing
  spots, walked to: the spot and its school's middle in drawn water, the seat
  open land with the boots dry and fewer than four looks wet; where the shore
  brushes an edge, printed.
- `test-world-core` checks the bake is current; `mp-questline` (CI's
  "playable") still passes in the Wheel.

## Level requirements (v2.3.3038)

Owner, 2026-10-05: *"I'll change tier level requirements in levels of 5. So
with the exception of copper and iron where you can mine both, black steel now
requires a mining level of at least 5. Fishing clownfish required fishing
level 5. I haven't thought the rest out yet, game is still a demo."*

Until now a node's tier only made it slower to work (more hit points, a
longer legacy timer). The client's own check had been switched off
(`if (false)` in BroTown.jsx) and the worker had none. Now the level is a
real requirement:

| | Tier 1 | Tier 6 | Tier 11 |
|---|---|---|---|
| Mining | copper **1** | iron **1** | black steel **5** |
| Fishing | minnow **1** | clownfish **5** | trout **10** |
| Woodcutting | pine **1** | softwood **5** | hardwood **10** |

The owner named black steel, copper/iron and clownfish. Trout and the wood
follow the same "levels of 5" rule and are the owner's to change: one table,
`GATHER_REQ_LVL` in `server/src/gathering.js`, mirrored in
`src/data/lifeSkills.js` and pinned together by `mirror-audit.test.mjs`. It is
keyed by node type and tier and is deliberately not the tier itself: the tier
names the item, its art, its hit points, its XP and the baked places, none of
which moved.

- **The worker** refuses `extraction_start` (no hit plan) and `node_strike`
  (the paying call, refused before the node is spent, recorded as
  `skill-too-low` with `need` and `have` for the operator view). The skill is
  the node's own, never the message's.
- **The client** never asks the worker for a node you cannot work yet. Since
  v2.3.3059 a tap on one TRIES instead of being turned away on the spot (see
  "A try at a resource you cannot work yet" below); before, it said "Need
  Mining Lv 5" and beeped. The tap, the harvest button and the E key all come
  through `startExtraction`. The quest's gold road skips a node you cannot
  work yet (`questRoute.js` `_wheelGatherPoint`).
- **The ladders** (Skills' "next unlock", the Encyclopedia) print the level a
  resource asks (`gatherLadderLvl`), not its tier number.
- **Deploy order.** `caps.gatherreq`: the client refuses and draws a required
  level only against a worker that enforces one. An old worker keeps every
  resource at level 1, and so does the client against it. An old client against
  a new worker simply tries and is refused by the worker without a word.
- **Kill switch.** `gatherreq: false` in liveflags un-advertises the cap and
  lifts the worker's gate: every resource is level 1 again, no deploy.

Tests: `wheelzone` §8 (black steel refused at Mining 4 with the vein left up
and the reason recorded, paid at 5; iron at Mining 1; clownfish refused at
Fishing 4 and paid at 5; the kill switch; the table; forged types and tiers),
`mirror-audit` "gather levels".

## The label over each resource, and the ore's crack (v2.3.3040)

Owner: *"Add hatchet icon above trees you can chop. Add pickaxe icon above ore
you can mine with its name and level. Same with fish and tree resources to
harvest. Add cracking sound when the ore splits when user completes the
gesture."*

- **The label** (`src/rendering/nodeLabels.js`): a small dark pill over every
  resource you hold the tool for, holding the TOOL that works it (the bag's
  own hatchet, pickaxe and rod pictures, shrunk to 64 px and preloaded at the
  loading gate), WHAT it gives (Copper Ore, Pine Log, Minnow) and the LEVEL it
  asks, the level red (and the pill's edge) while yours is below it. It is
  sized on the SCREEN, 20 CSS px tall at any zoom, like the monsters' name
  plates. It stands over the crown, the rock and the school of fish, and steps
  aside while the green harvest bar is up over that node, or while another
  player is seated at it.
- **Retired:** the tool emoji, the grey tier dot and the three 7 px proximity
  tips that stood there, sized for the 6–12 px resources of before v2.3.1275.
  The ore's stand-here mark is drawn over the pill when they would touch; the
  spot you stand on did not move.
- **The crack** (`public/sfx/mining/ore-crack.mp3`, `'ore-crack'` in
  `SFX_MANIFEST`): the rock splitting open in the game's own unused mining
  clip, played on the frame the break strip splits the rock, about 350 ms
  after the gesture. Yours plays at full voice. Another player's vein, which
  breaks on your screen too, plays softer and fades out by 1,400 px. Before
  this a finished vein was silent: its only cue was a `beep()`, which has
  played nothing since v2.3.1103.

Tests: `mp-wheelnodes` (a fishing spot's held display is its label now),
`mp-harvestbar`.

## Quieter labels, a grey tool, and a try you can watch fail (v2.3.3059)

Owner, 2026-10-06, on the labels above:

> *"If the user tries to harvest a resource they are too low level in you can
> still show zeroes popping as they try to harvest the resource with the
> message that it requires whatever level. I also think a grayed out icon
> above whatever the resource is (like pickaxe for lvl 5 blacksteel ore) would
> be a good cue that it's harvestable but you're not high enough level yet.
> I like the idea of listing the name of the resource and what level it
> requires next to it. I just don't want the screen to be too busy with text
> though."*

**The labels** (`src/rendering/nodeLabels.js`):

- Every resource drawn shows its tool's picture alone, on a small dark disc
  (20 CSS px, the pill's height).
- The picture is in colour when your level works the resource, and **grey**
  when it asks more than you have. The grey copy of each of the three
  pictures is made once at load from the same file (`NODE_LABEL_ICONS_GRAY`),
  so nothing new is loaded and no filter is used.
- **One** resource says its name and level beside the picture: the nearest
  to you within 260 px (`nodeNameNode`, `NODE_NAME_R`), the one you are
  walking up to. The level is still red while yours is below it.
- Everything else about the label is unchanged: the size, the place, and
  stepping aside while a harvest bar is up.

**A try at a resource you cannot work yet** (`lifeSkillRewards.js`
`_startLockedTry`). A tap, the harvest button or the E key on a locked
resource no longer just says no:

1. You are seated as for any harvest.
2. The tool swings three times on its loop's own blows (`gatherHitTimes`,
   the times a real harvest's hits land).
3. Each blow pops a **0** off the resource, where a real hit's number pops
   (`_popGatherHit`). The bar over the resource stays full.
4. **"Requires Fishing Lv 5"** (or Mining, or Woodcutting) is shown over the
   resource in red from the start, with the refusal beep, and stays up for the
   whole try, rising slowly, so it is on screen with every 0.
5. The try ends by itself 450 ms after the last 0, or at once if you walk
   off, like any harvest.

**Nothing is sent to the worker for a try.** The worker refuses a start and
a strike below the level (`skill-too-low`) and nothing is paid, so the try is
the game's own picture of a refusal, not a request. Against an older worker
(no `caps.gatherreq`) nothing is locked, so nothing is tried this way.

Tests (`mp-nodelabels`):

- On the commons, every resource near you shows its tool; only the nearest,
  within 260 px, says its name and "Lv 1", in gold, its picture in colour.
- At a clownfish spot (Fishing 1), its label says "Clownfish" and "Lv 5" in
  red, and its rod is grey.
- A tap on it tries: three 0s, "Requires Fishing Lv 5", no `extraction_start`
  sent, and the try ends by itself.
- Picture: `nodelabels-try.png`.

## Past level 20 (v2.3.3094)

> The owner: *"build the world past level 20 (levels 21–40 in each land with
> their own monsters and resources)"*.

Each land's second stage grows two tiers of its own, as the first stage does:

| Tier | Levels | Ore | Wood | Fish | Needs |
|---|---|---|---|---|---|
| 16 | 21–30 | Titanium Ore | Cedar Wood | Salmon | Mining 10, Woodcutting 15, Fishing 15 |
| 21 | 31–40 | Obsidian Ore | Maple Wood | Pike | Mining 15, Woodcutting 20, Fishing 20 |

- **Five levels a tier.** The requirements carry on the owner's steps ("in
  levels of 5"), each kind from where its first stage left off (black steel
  Mining 5, trout and hardwood 10). The table is `GATHER_REQ_LVL`, mirrored and
  pinned by mirror-audit.
- **What they make.**
  - Titanium and obsidian are the forge's next two metals: `BLACKSMITH_TIERS`
    titanium (Smithing 21) and obsidian (26) forge from exactly
    `ore_titanium_ore` and `ore_obsidian_ore`.
  - Cedar and maple are the bow bench's (`WOODWORKING_TIERS` cedar and maple).
  - Salmon and pike cook like any fish (`FISH_TIERS`, healing 220 and 260).
  - The client's `MINING_TIERS` 16 and 21 were "Crystal Ore" and "Gold Ore",
    which grew nowhere, and are renamed to match. Its old "Obsidian" at 36
    became "Diamond Ore", the forge's tier there, so there is one obsidian.
- **Where.** The bake's `NODE_RULES` has two more bands, `deep` (tiers 5–6)
  and `deeper` (7–8): three veins, three trees and two fishing spots a land,
  by the same rules as the first stage's.
  - +117 nodes, 259 in all.
  - The richer the tier, the farther out it grows (`wheelzone` §8 checks the
    median distances).
- **Fishing is thinner out here.** The fallback takes any water, as before, and
  still finds none in two places: the Stone Hollows have no water a line can
  reach in either tier, and the Verdant Wilds have none in tier 21.
- **Pictures**, from the art the first stage's came from
  (`python3 tools/make_tier_art.py past20`):
  - titanium and obsidian veins at 418 px (1.4 MB decoded more, loaded at the
    intro gate with the others);
  - their bag ore;
  - cedar and maple logs;
  - salmon and pike, raw and cooked.
  - Trees take a tint (`NODE_TIER_TINT`: cedar red-brown, maple autumn).
  - The fish in the water are drawn in code (`FISH_LOOK`: a pink salmon, a
    long olive pike).
  - Every table that knew three tiers knows five: the minimap's and the world
    map's node tints, the bag's thumbnails, the fly-to-bag icons, the cook's
    raw icon, the campfire's fish order and the trade window's emoji.
- **The bake's "nothing in front" check** sizes a tier-21 node's picture
  1.30× (effectsRenderer draws by `ceil(tier / 10)`), where a tier-11's is
  1.15×.
- **Tests:**
  - `wheelzone` §8: every land grows tiers 16 and 21 veins and trees; salmon
    and pike somewhere; farther out by tier; each tier's own item name; the
    forge's titanium and obsidian and the bench's cedar and maple are the items
    these nodes pay.
  - `mirror-audit`: the level table, `FISH_TIERS` and the harvest XP across
    every wood tier.
  - `mp-wheelpast20`: a titanium vein on Frost Ridge's second stage, named,
    asking Mining 10, drawn from its own picture, its label grey for a miner
    short of it, and cedar, salmon, obsidian, maple and pike around it.

## A resource you can't see stops nobody (v2.3.3145)

The owner: "there are invisible areas that block movement near the town".

- A resource you hold no tool for is not drawn (v2.3.1680) and not marked on
  the minimap, but its rock or trunk was still solid (BroTown.jsx
  `nodeBlockEllipse`). The commons ring BroTown with six copper veins and six
  pines, and "Learn a Trade" hands you the hatchet and the rod but not the
  pickaxe. So each vein was a rock-sized patch of empty grass that stopped you
  (on main, `mp-unseenwall` stops 45 px short of a hidden vein).
- Now it is walkable until the tool is in the bag; the frame it is, the node is
  drawn and solid again.
- The same rule for the two other readers that found hidden nodes (TRAPS §140):
  - a tap on one is a tap on the ground (`_tapHarvestAtCss`) -- no "You need a
    tool for that" over nothing; a resource out of reach lets the tap through
    too, so the right stick jumps (docs/specs/jumping.md "v2.3.3145");
  - the nearest resource in reach (`S._proxNode`) is one you can see, so a
    hidden vein beside a pine no longer leaves the harvest button offering
    nothing.
- `mp-unseenwall`: through a hidden vein, stopped by the drawn one, and a tap on
  a far vein jumps.

## Not in this round

- The world map (the overlay a tap on the minimap opens) shows no nodes.
- Tiers past 40 (levels 41–80) are not placed.
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
