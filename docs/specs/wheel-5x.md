# The Wheel five times longer (v2.3.3300)

The owner, 2026-10-17: *"the game map needs to be larger. It goes from lvl 1
monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed."* Offered
the ways to get there, they chose **"Rebuild for 5x"**. Step 1
(v2.3.3298, `docs/specs/wheel-in-blocks.md`) changed how the phone builds the
map, so a bigger one fits on a phone, and the server learned to let monsters
rest when nobody is near (v2.3.3299, `wheel-monsters.md`). This is step 2:
**every land is five times longer.**

## What a player sees

| | before | now |
|---|---|---|
| a stretch of five levels (1-5, 6-10 ...) | 1,024 game px, ~7 s of walking | 5,120 game px, ~34 s |
| level 1 to the end of level 20 | ~32 s from the town gate | ~2.5 min |
| a land, town gate to tip | ~2 min | ~10 min |
| monsters | 384 | 1,920 (as crowded a stretch: 30 where there were 6) |
| resources (ore, trees, fish) | 259 | 1,222 (the commons' the same) |
| things standing (trees, rocks ...) | 12,635 | 63,486 |

- **BroTown and the commons are the same ground.** The plan's noise is now
  counted from the plan's own corner, not the grown map's, so the town's
  ground pictures, every building, lamp and barrel stand exactly where they
  stood (test-world-core checks all 140 things within 1,800 px of the square,
  and the town's 19,811 cells; 17 of them have a different picture where a
  river or road now bends a little sooner past the town).
- Each land keeps its 80 levels, its stages and passes, its camps and its
  three dungeons (at the same levels, further out). Only the distance changed.
- A stretch's monsters are still its own land's, at its own levels.

## How

**The plan** (`public/tools/world/plan.js`): `PLAN5 = bigTownPlan(TOWN,
BUILDINGS, true, WHEEL_LONG)`, with `wheel.tierZones` five times the short
plan's and the active area grown `wheelGrow(P)` squares past the frame each
way (`grid.js` `active.grow`) so the longer spokes fit. `wheelSized(size)`
picks the plan for a size; `planFor(search, size)` too, except that the
previews (`?bigtown`, `?plaintown`, `?placing=2`) are always the short
Wheel's: their objects are worked out from the whole map, which the long one
is far too big for on a phone.

**The noise anchor.** The ground's noise (`ground.js materialMap`), the
placing's lattices and noise (`placing.js`, `NC`/`NX`) and the plank decks'
hash are counted from the *named* active corner (`nox`, `noy` in cells,
`layout.js planFeatures`), so growing the map does not move the hub's noise.

**The bakes, one set a Wheel.**

| | short Wheel | long Wheel (live) |
|---|---|---|
| objects, overview, lands (`bake-wheel-world.mjs`) | `public/world/placed/` | `public/world/placed5/` |
| overview pixel | 4 cells | 16 cells (the same ~450 px picture) |
| monsters, nodes, doors (`bake-wheel-spawns.mjs`) | `server/src/wheelspawns1.js` | `server/src/wheelspawns.js` |
| places a stretch | 12 | 60 (the worker stands 30) |

The spawn bake builds the long Wheel in Node in ~50 s: distances as bytes,
candidates in buckets and the "far enough from the others" tests hashed, so
it fits; the short Wheel's output is byte for byte what it was.

**The server picks a size once, when the room starts** (`server/src/
wheeltables.js`): the long Wheel unless the live flag `wheel5x: false` (the
kill switch). It says which in `state_sync.caps.wheelsize`; a worker that says
nothing plays the short one, as every worker before did. A flag thrown later
changes nothing until the room starts again: the monsters already stand on
the size they were spawned for.

**The phone says which it can draw.** The join carries `ws: [1, 5]`
(`src/game/wheelSize.js wheelSizesDrawn`). A phone that says nothing -- a tab
left open across the deploy -- is out of step with the long Wheel: it stands
on the short Wheel's ground in the long one's world, so the worker keeps it
out of harm (`_wheelInStep`: no monster targets it, No man's land holds no
rule for it) until it reloads. A preview (`?bigtown` ...) says `ws: [1]` for
the same reason.

**The phone builds the size it is told.** The way into the Wheel waits for
the caps already (`wheelHome.js`); the build itself waits for them too, 8 s
at most (`worldTrial.js preloadWheel`, `wheelSizeTold`). Every copy of the
Wheel's numbers on the phone is kept per size and switched by `setWheelLong`:

- `src/data/zones.js WHEEL_GEOM` (the zone's size, safe ground and lands'
  middles; `setWheelGeom`);
- `src/game/worldTrial.js WHEELS` (the map's size, the way in);
- `src/data/noMansLandRings.js NML_CENTRES` (No man's land's rings, each
  ring a stretch: `NML.TIER * WHEEL_LONG` on the worker).

A room that changes size under a phone already in the Wheel reloads the
page, at most once in two minutes (never a loop of loading screens).

**The walls a byte a cell.** The page's walk grid rows are `Uint8Array`s now
(1 open, 0 a wall), not arrays of booleans: a long Wheel's row is 7,264 cells,
~58 KB as an array on iPhone. Every reader takes 0 as it took `false`
(`isSolid`, `nudgeSpawnToWalkable`, the trail's route).

**The minimap and the world map.** The long Wheel's whole-map picture is a
pixel every 16 cells: blurred to nothing at the minimap's scale. So each
block the worker builds brings its lands a pixel every 4 cells (the short
Wheel's own detail, `ground-worker.js blockLands`), and the minimap and the
world map draw the blocks round you over the coarse picture
(`wheelTrial.js wheelLocalLands`). The world map's zoom 1 is still the whole
Wheel; it zooms ~4x further on the long one, and every "what is shown from
which zoom" step is taken at the short Wheel's scale (`spanK`), so the
town's buildings come in at the same size on screen whichever Wheel it is.

**The way in** still carries every monster (~580 KB of `zone_state` for the
1,920, against ~103 KB on the short Wheel), once. Sending only the ones in
reach needs a message that brings a monster coming into reach whole: a tick
carries a monster's place and HP, not what it is (its kind, level and land),
and the phone ignores a tick's monster it does not already know. That is the
next step, below.

**Monsters rest** where nobody is near (v2.3.3299): with one player in town,
1,838 of 1,920 rest.

## Memory on the phone

<!-- filled from mp-membudget -->

## Tests

- `server/test/wheelzone.test.mjs` sections 1-10 on the short Wheel
  (`wheel5x: false`), §11 the long one: the tables, the caps, five times each
  land's spawn list a stretch on its own places, every id its own, the way in
  under 650 KB, the flag after the spawn, a phone out of step sheltered and
  outside No man's land, resting.
- `nomansland`, `mirror-audit` (the rings per size), `monsterstatus`,
  `petsmatter`, `pvp-lunge`, `spar`, `linger`, `tick-share`, `aggro-grid`,
  `presence2`: joins say `ws`, and stand at the live Wheel's places.
- `caps-audit`: a capability may be a number the room decides with one of
  its own methods (`wheelsize: this._wheelLongNow()`).
- `tools/world/test-world-core.mjs`, "the Wheel five times longer
  (v2.3.3300)": the plan, the previews' rule (and the page's copy of it), the
  town the same ground and the same things, both bakes their plans', the
  places on their own land and stretch, the resources, the dungeons, and every
  copy the game keeps of either Wheel.
- Phone scenarios read the live Wheel from `H.wheelGeom()`
  (`tools/qa/mp/harness.mjs`): its middle, the way in, a stretch on a land's
  spoke, a blueprint of a few cells -- never a short-Wheel number (TRAPS §187).

## Not in this step

- **The way in with only the monsters in reach.** It needs the worker to send
  a monster coming into reach whole (a new message, or the snapshot's fields on
  a tick entry for a phone that says it reads them) and the phone to add one it
  does not know; then the way in drops from ~580 KB to the nodes' ~134 KB and
  the phone holds the monsters near it, not all 1,920. Tried in this step and
  taken out: an empty list on the way in also reads to today's phone as "this
  zone's monsters are mine to run" (wsClient.js `_applyZoneMonstersMsg`).
- The first stretch's monsters are levels 1-2 as before, now over 5,120 px.
  A slope from 1 to 5 across it is one line in `wheelzone.js` if the owner
  wants it.
- The world map far from you draws the coarse picture (a pixel every 16
  cells); only the blocks round you are fine.
- The World Builder and the Ground Studio build the short Wheel.
