# The Gem Works (v2.3.3148)

> Owner, 2026-10-07, after the Assay Office's name came up ("what does that even
> mean"): *"I think one gem building is enough and can do both the gem cutting
> and gem setting maybe with two different NPCs in the same building."* Asked
> what should happen to the Assay Office's building, they chose **Remove it**,
> and named the combined building **Gem Works**.

Cutting a raw gem and setting a polished one into a weapon, a shield or an
amulet were two buildings in the town, a Gem Cutter and an Assay Office. The
Assay Office did not test any ore: its door opened the Enchanter, whose window
already said "Enchanter", so the sign and the window disagreed. They are one
building now.

## What the player sees

- **One door, "Enter GEM WORKS".** The Gem Cutter's building, with the sign it
  always had (GEMS, which covers both jobs, so nothing was repainted).
- **One window, two tabs** under the owner's picture of the room: **Cut gems**
  (raw to polished: the Gem Cutter's panel) and **Set gems** (polished into gear:
  the Enchanter's panel). A tap on a tab switches in place; the picture does not
  flash, because it is the same room.
- The **Assay Office is gone from the east street.** The Bank now stands alone on
  its north side; the Gem Works and the Auction House face it. Nothing else in
  the town moved: the gates, the square and every other plot are where they were.

## What changed in the code

| | |
|---|---|
| `public/tools/world/plan.js` | the `assay` plot is out of both lot lists (`design.lots` and the plain `lots`); the `gemcutter` plot is named "Gem Works" (its id stays, it is the picture's, the room's and the door's name everywhere) |
| `public/tools/objects/catalog.js` | the `assay` building is out (75 objects); `gemcutter` is "Gem Works", its job "where players cut raw gems and have them set into their gear", its sign still GEMS |
| `public/world/objects/` | the manifest's `assay` object and the `buildings-14` page are out (40 sprite sheets, 192 KB less); `gemcutter`'s name is "Gem Works" |
| `placing.js`, `buildingLife.js`, `wheelMaterials.js` | the Assay Office's yard crate, its four life spots and its material row |
| `src/data/wheelBuildingDoors.js` | `WHEEL_BUILDING_DOORS` has eleven doors, not twelve |
| `src/data/buildingRooms.js` | `enchant` shows the `gemcutter` room: sixteen windows, fifteen rooms; `public/world/interiors/assay.webp` (313 KB) is out |
| `src/ui/panels/buildings/GemWorksPanel.jsx` (new) | the two tabs, drawing `GemcutPanel` and `EnchantPanel` **untouched** |
| `src/ui/BroTown.jsx` | draws `GemWorksPanel` for `buildingPanel` `gemcut` or `enchant`; `BuildingRoom` is keyed by its room, not its panel |
| `server/src/wheelspawns.js` | re-baked: **only the plan's fingerprint changed** (see below) |

### Why the panels are not touched

Each panel draws its own header strip and a root that bleeds into the card's
load-bearing 20 px padding with `margin: -20`. The tabs' body is padded 20 px all
round to take that margin back, so the panel fills it exactly, and one rule
(`.bt-gw-body > div`, `game.css`) squares the panel's own rounded corners under
the tab strip. A panel's own rework (the enchanter's gem slots, the cutter's
rates) cannot collide with this change.

A window's `buildingPanel` is still `gemcut` or `enchant`, and a tab is just that
name, so anything that opens either one still does, on its own tab. The old
town's `enchanting` building (closed, `src/data/buildings.js`) is untouched.

### The server

The re-bake (`node tools/world/bake-wheel-spawns.mjs`) changed **only the
blueprint fingerprint** in `server/src/wheelspawns.js`: every monster place, every
resource node and every dungeon mouth is byte-for-byte what it was, because
nothing the bake reads stood on the removed plot. So no player's world moves. The
file is still under `server/`, so merging this PR deploys the worker once, with
nothing new in it; clients reconnect on their own (CLAUDE.md, Deployment).

### The town's layout

`townPlan` (layout.js) reads each Market Row side's list, nearest the square
first; a side with one plot is ordinary. The east arm's farthest plot used to be
the Assay Office, but the west arm's General Store sets `rowEnd`, so the Back
Lane, the town's rectangles and the gates (1,326 / 1,447 art px) are unchanged.

## Quests

mayor_1's "Visit 3 buildings in town" counts the Wheel's building doors: eleven now
(was twelve), `mp-wheeldoors` walks all eleven.

## Not done, and why

- **The two NPCs.** The owner's idea is a cutter and a setter behind the same
  workbench, each with a visitor. The prompts for all four are on the NPC page
  (docs/ART-WISHLIST.md has the room's); the art is the owner's to make. When it
  exists, `ROOM_KEEPERS` (src/data/buildingRooms.js, one keeper per room today)
  becomes a list for this room and each tab a counter.
- **A new inside picture with two stations.** The Gem Cutter's picture has one
  workbench with a lathe and a grinding wheel, which is what the cutter needs; a
  picture with a setting counter beside it would let the two keepers stand apart.
  Optional: a prompt for it is in docs/ART-WISHLIST.md ("Gem Works: inside").
- **The Assay Office's pictures** (its outside on the sprite sheets, its inside)
  are out of the game; git history has them.
- **Walking inside.** Not built; this is the building the owner's walkable
  interiors would start from, with its two counters.

## Tests

- `tools/world/test-world-core.mjs` "the Gem Works": the Assay Office is gone from
  every table (plot, catalog, manifest, page files, room, door, life, material);
  the Gem Works is named in the plan, the catalog and the manifest and still
  signed GEMS; the window's two tabs, the one panel for both names in BroTown; the
  east street's three plots. The older counts moved with it (sixteen buildings,
  eleven doors, fifteen rooms, sixteen pictures).
- `node tools/qa/mp/run.mjs buildingrooms`: a phone walks to the Gem Works' door,
  taps each tab (each at least 44 px tall and reachable by a finger), checks the
  picture is the same element after a tab change, each panel flush with its body,
  and the tabs clear of the close button on a sideways phone. Pictures:
  `tools/qa/mp/out/buildingrooms-gemworks-*.png`.
- `mp-wheeldoors` (sixteen doors, eleven that open a building), `mp-wheelbreak`
  (the Assay Office is no longer a target).
