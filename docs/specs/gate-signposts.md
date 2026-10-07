# Brotown's signposts say where their roads go (v2.3.3062, levels v2.3.3089)

> Owner, 2026-10-06, on the recommendations for finding your way round the
> Wheel: *"Continue building recommended."* Signposts naming the lands were
> one of them.

Brotown already had a signpost at each of its four gates, where every street
leaves town. Their boards were left blank on purpose: the Object Studio's
catalog asks for *"the boards left blank"*. Now, when you walk up to one, two
name plates appear over it. Each names a land the road leads to:

| Gate | Straight on | Forks off this road further out |
|---|---|---|
| North | ↑ Flame Fields | ↖ Frost Ridge (the Frost Trail) |
| East | → Stone Hollows | ↗ Wind Dunes (the Dune Trail) |
| South | ↓ Water Caves | ↘ Electric Foundry (the Foundry Road) |
| West | ← Verdant Wilds | ↙ Poison Forest (the Bog Trail) |

This follows the plan's own pinwheel: *"the North Road forks to the Frost Trail,
the East Road to the Dune Trail, the South Road to the Foundry Road, the West
Road to the Bog Trail."* So all eight lands are named, each on the gate whose
road takes you there.

## What a plate shows

- **An arrow** pointing the way the land lies (north is up).
- **The land's element icon**, the same picture the top bar and the land
  banner use.
- **Its name**, in the land's colour lifted toward white, as the top bar and
  the banner print it. The names come from the worker's map, so they never
  disagree with the minimap.
- **The levels its land holds** (since v2.3.3089), after the name in the
  plate's brass: **Lv 1–20**, from the first stretch past the commons to the
  last before the first pass.
  - Asked *"Show levels on the signposts?"*, the owner said *"Yes"*, though
    every land starts at level 1 at its near end, so all eight plates read the
    same. They say how far the road's land goes.
  - The number is `WHEEL_LAND_LEVELS` in `src/data/wheelSignposts.js`.
    `mirror-audit` holds it to the worker's own monsters: the deepest stretch
    baked into `server/src/wheelspawns.js`. When the lands grow past level 20,
    that stretch moves the plates too, or the suite fails.

The plates are dark slate with a brass rim, the Lantern Slate look of the
game's other plates. They sit just above the signpost's picture.

## When they show

- **Only close** (since v2.3.3146): within 300 game px of the signpost. They
  fade in over the last 60 px and pop up out of the post as they do, growing
  from 82% of their size to their full size.
  - The owner, 2026-10-07: *"Change the signage in the town to proximity based
    so it only pops up when you get close."*
  - Until then they showed from 640 px, fading in over the last 160. At the
    Wheel's zoom 640 px is about a phone's whole view, so the plates were up
    whenever their signpost was on screen and read as always there.
  - 300 px is the street the post stands beside. The four stand 159–174 px off
    the middle of their street, so a walk down either side of it passes them
    at 66–252 px. Anywhere on the street at the gate the plates are at least
    80% up; a screen away, none is.
  - From the square nothing is up (*"I just don't want the screen to be too
    busy with text"*), as before.
  - The numbers are `SIGNPOST_SHOW_R` and `SIGNPOST_SHOW_FADE` in
    `src/data/wheelSignposts.js`; the pop is `POP_FROM` in
    `src/rendering/wheelSignposts.js`.
- **World-sized:** they belong to the signpost and move with it.
  - A plate's name is 22 world px, about 13 CSS px at the Wheel's zoom.
  - They are drawn over the buildings and trees round the gates and under the
    player.

## How it works

- `src/data/wheelSignposts.js` holds the gate → lands table and how a signpost
  is placed at a gate: by its larger offset from the town's middle.
  - The town's four signposts stand 1,876–2,118 game px out, and no other
    signpost is placed anywhere.
- `src/rendering/wheelSignposts.js` holds two things:
  - `findGateSignposts` reads the four from the worker's placed objects
    (`wheelObjectsInfo()`);
  - `WheelSignposts` draws their plates, called every frame by effectsRenderer
    beside the dungeon mouths.
- **The icons:** the eight element pictures (256 px each) load behind the
  Wheel's own loading screen (`preloadZoneAssets('wheel')`).
  - Each is drawn down to a 64 px canvas as it lands: about 128 KB for the
    eight, against 2 MB decoded at full size.
  - They are let go on leaving the Wheel, with the plates taken down first, so
    no sprite is left holding a freed texture.
  - A plate whose icon failed to load is drawn without it. Nothing is fetched
    on sight.

## Tests

- `server/test/mirror-audit.test.mjs`, "signposts" (2 checks): every land's
  monsters reach the same top level, and the plates' levels are that.
- `tools/world/test-world-core.mjs`, "the gate signposts" (4 checks):
  - placing puts exactly four signposts in the town, one at each gate;
  - every land is named once, its own compass road's land first;
  - the second land on each sign is the one whose road begins on that compass
    road, read off the plan's roads;
  - how the gates are told apart.
- `mp-signposts` (13 checks), on a phone against a real worker:
  - the four found and the eight icons loaded;
  - nothing up from the square;
  - (v2.3.3146) on the street ~450 px short of each signpost -- where the old
    640 px had its plates fully up -- none of them is up;
  - at each gate both plates pop up to their full size, named as the map
    names them, each with its icon, its arrow pointing the right way and
    "Lv 1–40";
  - they go when you walk away;
  - no page errors.

  Pictures: `signposts-{north,east,south,west}.png`.
