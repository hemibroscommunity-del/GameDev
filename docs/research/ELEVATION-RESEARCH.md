> **Research notes, 2026-10-03 (v2.3.2999).** Written overnight on the owner's
> "I'm also thinking how you might make elevation changes". The plan built from
> them is `docs/ELEVATION-PLAN.md`. Kept as written. Paths under `scratchpad/` were
> the research session's probes and are not kept. Code is the source of truth
> where they differ.

# Elevation in the Wheel — design & feasibility study

Status: COMPLETE (2026-10-03). Research only; no repository file was modified. Probes used: scratchpad/probe/*.mjs (read-only, import the repo's own plan).

## 0. Summary

- **Today the Wheel is flat, and its `cliff` class is dead data.** 6,981 cliff cells are stamped (ridges in stages 2-4 of seven lands, plus the river's falls) but `materialMap` draws them as plain ground and `walkBits` blocks only water: 0 of 6,981 block you. plan.js says "cliffs are where climbing will go" -- intent only.
- **Best fit: family (b), terraces drawn in screen space** (ALttP / Stardew / Eastward): a per-cell `alt` layer in the blueprint, faces derived below every southward drop and drawn by the game from a face picture (`laid: 'face'`, like the planks), stairs laid like plank decks (`laid: 'steps'`), faces + rims in the walk grid. Because every position stays the screen-projected ground point, **the existing depth sort, movement, projectiles, server speed bound and wire protocol need no change**; the only visual lie is at a face's ends (fixable with padding/placing rules).
- **One-way ledges (c)** are a small add-on (a scripted hop, inside the server's 500 px/s bound). **Real Z (d)** would touch every system and the wire protocol; not now. **Shading (e)** is code-only polish (face shadows on the `shadows` layer).
- **First visible step: "Prospector's Knoll" behind `?elev`** -- raise the commons landmark the plan already calls "standing stones on a grassy knoll" (game 20122, 20179; ~410 px across; 1,000 px inside safe ground, so no monster ever goes there and the server is untouched) by one 72 px step, stone steps cut into its south face, a back slope where its footpath arrives. Effort M; behind a plan transform so the default world and the baked spawns are bit-for-bit unchanged.
- **Art for it: two Ground Studio pictures** -- `face-commons` (1024 x ~180 px, 512 x ~90 game px, seamless left-right) and `steps` (a 1024 swatch, cut into 12 game px treads); optional standing stones (Object Studio, ~130 game px). Later, one face per land from the `cliffPaint` briefs plan.js already has.
- **Must-fix pitfall first:** the Wheel's walk grid is tested at the body centre (52 px above the boots), not the feet -- faces would stop boots 52 px short of their foot (and water probably has the same 2-cell error today).
- Monsters/projectiles across heights (O4) need a BAKED server table (the server "must never build the map"), and must land before any rise goes where monsters stand.



> Note: while this study ran, another session was editing the same checkout (uncommitted v2.3.2997: town buildings 1.5x -> 1.15x, `VIEW_OUT_DEFAULT = 0.8`, re-baked `server/src/wheelspawns.js`, placing.js `yard`). None of it is from this study. The probe was re-run against that plan: the cliff counts, walk-blocked counts and Prospector's Circle position are identical (the town's size does not touch them).

## 1. How comparable 2D games do elevation (families a-e)

Five families, cheapest first. Almost every top-down 2D game is a mix of (b) and (c); only a few pay for (d).

| Family | What it is | Games | What height DOES in play |
|---|---|---|---|
| **(a) Painted only** | Height is in the picture (terraces, balconies, a void past the edge); the playable floor is one flat plane. | Hades (flat arenas framed by painted terraces and the void), Don't Starve (no elevation at all: flat world, y-sorted billboards, a tilted camera), the old Brotown "clifftop plateau" painting here (town_v17) | Nothing. At most the edge of the floor is a wall or a fall. |
| **(b) Cliffs as walls, stairs/ramps between discrete levels** | The map is still one 2D plane drawn in screen space. A raised area's SOUTH face is a band of unwalkable map cells drawn as rock; its other edges are a thin rim; stairs or a ramp are a walkable gap cut through the face. Nobody has a z; "being on top" is just standing on the cells above the face. | A Link to the Past overworld, Stardew Valley (map layers Back / Buildings / Paths / Front / AlwaysFront: Buildings tiles are walls, Front tiles draw over the farmer when he is north of them and under him when south -- that is how you walk behind a cliff top or a canopy), Eastward, Diablo II (cliff walls in Act 1/3/5, line of sight blocked by them), Pokemon (cliffs + stairs) | Routing (you must find the way up), framing, line of sight if walls block shots. Depth sort by feet still works unchanged because everything is in screen coordinates. |
| **(c) One-way ledges** | A short face you can hop DOWN by walking off it (scripted hop with a little arc), never climb. | Pokemon (ledges hop south/east/west, never up), Link's Awakening and ALttP ledges, Sea of Stars ("jump off a ledge to get down instead of backtracking") | Shortcuts back toward town, one-way loops, "you can't come back this way". Cheap on top of (b). |
| **(d) Real Z** | Every entity has a height; maps have height layers each with its own collision; walking off an edge falls, walking into a low wall jumps up; projectiles travel at a height and hit walls of higher layers; AI paths across levels. | CrossCode (map JSON stores height levels and per-level collision layers; Lea jumps automatically off edges and up small ledges; its pathfinder links levels with "jump-up edges" and "AirNodes" -- see radicalfishgames.com "Path Finding in CrossCode"), Sea of Stars (climb, vault, hoist up and jump off ledges, swim -- a traversal system on a 2D isometric world), Diablo III (true 3D with a 2D navmesh; ramps/stairs join levels, cliffs bound the mesh, most projectiles ignore height) | Real vertical play: shooting down from a ledge, dropping onto enemies, jump puzzles. Every system that measures distance must know z. |
| **(e) Height-shading only** | Distance/height suggested by scale, haze, tint, cast shadow -- no geometry. | Octopath Traveler's HD-2D tilt-shift (its field has real 3D slopes but combat is a separate screen, so height never matters in a fight), atmospheric perspective in most painted games; HERE: the Wind Dunes depth curve (`zoneDepthScale`, server `depth.js`) | Mood and readability. No gameplay. |

Two side notes from the genre that matter here:
- **Falls as a hazard** (Hyper Light Drifter, Link's Awakening pits): walking off into a chasm costs health and puts you back on the last safe ground. Not needed on the Wheel (there are no chasms; the sea is already the edge).
- **The owner's own style references** (`bible.js` HD_STYLE names Eastward and Sea of Stars) sit at (b) and at (b)+(c)+light (d) respectively. Sea of Stars is the ceiling the owner may picture; Eastward is the realistic first target.



Sources (web, for section 1): [Path Finding in CrossCode](https://www.radicalfishgames.com/?p=498), [CrossCode map file layout (wiki)](https://crosscode.fandom.com/wiki/Map_file_layout), [Why auto jump in CrossCode (ModDB)](https://www.moddb.com/news/crossquestion-why-do-we-use-auto-jump-in-crosscode), [Stardew Valley Modding:Maps (layers)](https://stardewvalleywiki.com/Modding:Maps), [Sea of Stars on Steam (traversal)](https://store.steampowered.com/app/1244090/Sea_of_Stars/), [Sea of Stars press kit](https://sabotagestudio.com/presskits/sea-of-stars/). Everything else in section 1 is from the games themselves.

## 2. What exists here today (measured, not assumed)

**The `cliff` class is dead data in the game.** It is stamped, never drawn, never a wall:

- `public/tools/world/core/layout.js`: `CLASS_IDS[5] = 'cliff'` (the list is APPEND ONLY: each index is stored in every cell). Stamped by (1) region `features` `{ class: 'cliff', shape: 'ridge', density, r, len, in: [stages] }` in pass 2 (`stampRidge`, ~l.547), and (2) every river fall: a 34-art-px rock ridge across the river (pass 3, ~l.581) which the river then cuts through.
- `public/tools/world/plan.js` ~l.166-183: `classes.cliff = { walk: false, color: '#6d645a' }` and the comment "cliffs are where climbing will go" -- intent only. Every region has a `cliffPaint` brief (frost "a sheer grey granite cliff capped with snow and icicles", ember "black hexagonal basalt columns", sky "a layered red sandstone cliff", hollows "a sheer grey canyon wall", thunder "a tall riveted iron wall", tidal "a dark mossy sea cliff", mist "a mossy, root-covered rock bank", verdant "a mossy rock ledge overgrown with vines", commons "a low grey rock outcrop"). These fed the old per-square ChatGPT prompts (`core/prompt.js` l.230), not the game.
- `public/tools/world/core/ground.js materialMap` (~l.505-543) has no cliff branch: a cliff cell gets its land's stage swatch, i.e. it is **drawn as plain ground**.
- `ground.js walkBits` (~l.1943) blocks **only water** (blurred water share >= 0.5). Probe on the real plan: **0 of 6,981 cliff cells blocked** (also 11 of 116,827 obstacle cells, 0 of 2,621 landmark cells).
- `placing.js` (~l.289) keeps objects off cliff cells (with roads, water, plots...), so the ridges show up only as gaps in the trees.
- Where they are: hollows st2-4 (2,431 cells), frost st2-4 (1,482), ember st2-4 (1,063), tidal st2-4 (868), thunder st2-4 (630), sky st3-4 (408), verdant st3 (99). **None in stage 1 or the commons**, so no cliff today is anywhere near a monster (monsters stand only at each spoke's inner end, levels 1-5).
- WORLD-BIBLE §13 already decided how the falls should look: "code-drawn water over a cliff **object**". §11: everything that stands up is an object.

**Height-like prior art in this repo:**

| What | Where | Family | Lesson for elevation |
|---|---|---|---|
| Old Brotown "clifftop plateau" painting with painted stairs | `src/rendering/tiledMaps.js` (town_v17), `src/data/townRim.js`, `src/data/effects.js` l.273-289 | (a) then (b) | Height was paint; collision derived from the art BY HUE was rejected by the owner twice (v2.3.1777, v2.3.1794: "the areas you detected for the map are too unreliable"; stairs misread as wall, a 32 px slot trapped the player). What stuck: AUTHORED boundaries (owner's own line for the World View, v2.3.2076; the town rim traced once offline, v2.3.2896, with a checker that spawn/NPCs/doors/stairs are inside and mutually reachable, and **the feet offset baked into the grid**). The Wheel's blueprint ("walls drawn first and painted to", layout.js header) is exactly the authored kind. |
| Wind Dunes depth curve | `src/data/zones.js zoneDepthScale/depthK`, `server/src/depth.js` (mirror + lockstep test + `zoneDepth` kill switch + `caps.zoneDepth`), `docs/specs/dune-depth.md` | (e) | The house pattern for a terrain rule both sides must agree on: client function, server mirror, a drift test, a liveflag kill switch, a caps flag. |
| Silhouette cast shadows | `src/rendering/lightfx/shadows.js`, `lightfx/zoneLight.js`, `shadows` layer (v2.3.2710/2711) | (e) | A cliff's shadow on the ground in front of it is legal ONLY as code (art law rule 4); the machinery for code-drawn shadows along a light direction exists. |
| Plank decks | `layout.js bridgeDeck/joinRoad` (v2.3.2949), `ground.js planksOf` + `laid: 'planks'` | -- | The precedent for a DIRECTIONAL picture laid by the game across a straight, square-ended deck where a road meets an obstacle. Stairs where a road meets a face are the same thing. test-world-core (~l.311) already exempts `laid` entries from the "no direction in a swatch" check. |
| Depth sort by feet | `src/rendering/depthSort.js` (v2.3.2633/2748), `propGround.js` | -- | One key: the ground-contact line. Works unchanged for elevation drawn in screen space (section 3), breaks for real Z. |
| Foreground layer | `pixiApp.js` WORLD_LAYER_NAMES `'foreground'` (v2.3.2655) | -- | EXISTS (CLAUDE.md's "no foreground entry" sentence is stale). Not needed for a first step; useful later for overhangs/framing. |
| Movement abilities honour the walk test | `BroTown.jsx` dash ~l.4719 ("a bash must not post the player through a cliff"), ice slide, gust (v2.3.2996) all per-axis `isSolid` | -- | A face in the walk grid stops dashes, gusts and slides for free. |

**What the game reads, and where (the seams elevation must go through):**

- Walk grid: `ground-worker.js init` posts `walk: { cols, rows, bits }` (1 bit per 24-game-px cell, 400 KB) -> `src/game/wheelTrial.js lazyGrid` -> `S._tiledWalkable['wheel'|'worldview']` (`worldTrial.js syncWheel`) -> `isSolid(px, py)` in `src/ui/BroTown.jsx` ~l.4138, called at the four corners of a +-10 px box round the **body centre** (~l.5067). Nothing shifts it to the feet (52 px lower, `playerGroundDy`).
- Object footprints: `wheelObjects.js` -> `worldProps.setZoneBlockerHook` -> `zoneBlockers('wheel')`: read by `propFeetBlocked` (feet), `sweepBlockPoint` (arrows, per step), `attackBlockPoint`, `propSwingContact` (sword). And they BREAK: `src/game/wheelBreak.js` + `src/data/wheelMaterials.js` give every catalog object an `hp`; a broken object's footprint leaves the walk test for `REPAIR_MS` (3 min).
- Server: `server/src/wheelzone.js` -- "the server has no copy of the map and must never build one"; monsters chase straight; `server/src/props.js slideMove/attackBlocked` read a static per-zone box table (town, frost only) -> nothing blocks anything in 'wheel'. Geometry reaches the server only as a BAKED file (`server/src/wheelspawns.js` by `tools/world/bake-wheel-spawns.mjs`; test-world-core fails until re-baked).
- Speed bound: `server/src/movement.js` 500 px/s x caps + 80 px burst + `_gustAllowance` (a worker-granted widening, v2.3.2996).
- Minimap gold road: `src/rendering/systems/wheelMinimap.js` draws a STRAIGHT line you -> `questRoutePoint` (`src/game/questRoute.js _wheelPoint`); no routing.
- Footsteps: the worker's `under` (one byte per 3 game px of each piece) -> `wheelGroundAt/wheelStepAt` -> `footsteps.js stepOf(id)`.


## 3. What each family would require HERE, file by file

### 3.0 The one idea that makes (b) cheap here: draw height in SCREEN space

In (b) and (c) nobody has a z. A raised area is drawn as the camera sees it: its top surface where it appears, and its south-facing FACE as a band of the map just below the lip, H game px tall. Every position stays the screen-projected ground point the game already uses, so:

- someone on top at the lip has feet y = y_lip; someone at the foot has y = y_lip + H;
- **the depth sort by feet (`depthSort.js`) is still a correct painter's order** for everything standing on either level: a tree at the foot draws over a player on top near the lip (it is nearer the camera), a player at the foot draws over the face and over a monster on top, an object on top draws behind anything below it. No new sort key, no change to `applyDepthBuckets`;
- projectiles, dashes, gusts, monsters, the server's speed bound and the wire protocol all stay 2D;
- only the SOUTH edge of a raised area has a face. East/west edges are seen edge-on (no width) and the north edge faces away: both are just a LIP plus a 1-cell RIM in the walk grid. Basins and canyons fall out of the same rule (a basin's visible wall is its north side; an east-west canyon shows its north wall, a north-south canyon only its lips).

The one place screen space lies: **the ends of a face.** Someone on the lower ground beside a plateau's east or west end, standing north of that face's foot line, is physically behind the face; but a face drawn into the ground layer is under everything, so a shoulder or a tree canopy overlapping the face's last few columns draws over it. Three fixes, cheapest first: (1) keep feet a body's half-width (~24 px, one cell) off the face's end columns in the walk grid; (2) `placing.js` keeps any object whose sprite rectangle would overlap a face out of the strip north of that face's foot; (3) if it still shows, draw just the end columns as small sorted sprites in `entities` with `_groundDy` at the foot (the campfire's `_groundDy` trick, TRAPS §113).

### 3.1 Matrix: what each family touches

| Subsystem (files) | (a) painted only | (b) faces + stairs | (c) one-way ledges (on top of b) | (d) real Z | (e) shading only |
|---|---|---|---|---|---|
| Plan + blueprint (`plan.js`, `core/layout.js`) | nothing (and nowhere to paint it: ground swatches may not show anything that stands up, rule 7) | per-cell `alt` layer + `rises` in the plan, faces/rims/stairs derived | `oneWay` flag on a rise or a ledge feature | per-cell height + per-level collision layers | nothing |
| Ground compositor (`core/ground.js`, `ground-worker.js`) | -- | face band drawn from a face picture, `laid: 'face'`; stairs laid like planks, `laid: 'steps'` | same as (b), a short face | faces + every level's surface, overlaps | maybe a code tint |
| Objects (`objects/catalog.js`, `core/placing.js`, `wheelObjects.js`) | cliff pictures as pure decor | none required; placing keeps off faces/rims/stairs + face-end rule; optional set pieces | none | objects need a z | none |
| Depth sort / layers (`depthSort.js`, `pixiApp.js`) | none | none (3.0), plus the face-end fix | a hop draws the body lifted (z offset on the sprite only) | sort key must become (ground y, z) with per-layer occlusion: rewrite | none |
| Collision (`walkBits`, `wheelTrial.js lazyGrid`, `BroTown.jsx isSolid`) | none | faces + rims blocked, stairs open, **read at the feet** | a ledge cell is passable one way and starts a hop | per-level grids, falls, jumps | none |
| Movement + server bound (`BroTown.jsx` ~l.5067, `server/src/movement.js`) | none | none (dash/gust/slide already per-axis `isSolid`) | scripted hop (~300 ms, 48-96 px: 160-320 px/s, under the 500 px/s bound) | jump/fall physics; server must validate z | none |
| Monsters (`server/src/index.js` chase, `props.js slideMove`, `wheelzone.js`) | none | v1: put elevation where monsters never go; v2: baked face boxes for 'wheel' + same-level aggro + give-up-when-blocked | same as (b); monsters never hop (or do: a ledge is a shortcut toward you) | full 3D pathing (CrossCode's jump-up edges) on a server that has no map | none |
| Projectiles (`src/game/projectiles.js`, `worldProps.sweepBlockPoint`, `server/src/combat.js`) | none | v1: arrows ignore height (fly over faces); v2: altitude-aware stop at faces from below, server mirror for monster throws | same | z per projectile, arcs, server mirror | none |
| Camera | none | none | none (maybe a small ease on landing) | follow z | none |
| Minimap / world map (`core/wheelmap.js`, `wheelMinimap.js`, `WorldMapOverlay.jsx`) | none | lip outlines + stair marks as lines | arrow marks on ledges | same as (b) | none |
| Quest gold road (`questRoute.js _wheelPoint`) | none | straight line leads into a face: waypoint at the stairs when the target's `alt` differs | same | same | none |
| Footsteps (`core/footsteps.js`, worker `under`) | none | `steps` -> 'stone' (or 'wood'); faces unwalkable | a landing thud | same | none |
| Wire protocol | none | none | optional `hop` flag so peers see a hop, not a slide | z in player_state, monster deltas, projectiles; v1/v2 compat work | none |
| iPhone memory | none | ~0 GPU (faces baked into the 0.6 MB pieces); worker +1-2 unpacked pictures | ~0 | more pieces/sprites per level | 0 |


### 3.2 Family (b) in detail: "terraces in screen space"

**Units.** A blueprint cell is 24 game px; the bro is ~104 game px tall (83 CSS px on an iPhone 13-15 with the dashboard closed, 495 game px across 390 CSS px; `playerGroundDy` = 52 = half of him). One height STEP = **72 game px of face = 3 cells = 48 art px** (0.7 of the bro: reads as a terrace on a phone without walling off the screen; ALttP/Stardew faces run about 1-1.3 character heights, so `up: 2` = 144 px is the "real cliff"). A 48 px "bank" (2 cells) is the low option. **Let the owner choose by eye:** `?elev` alone = 72, `?elev=48|72|96` the step in game px (the `bigtown=k` pattern), because the view is changing under it -- an uncommitted v2.3.2997 in this checkout (another session) sets `VIEW_OUT_DEFAULT = 0.8` in `src/game/worldViewport.js` ("about 25% more zoomed out"), which makes the bro ~66 CSS px instead of 83 and a 72 px face ~46 CSS px on an iPhone; the game-px numbers here do not change. Name it **`alt`/"rise"/"step", never "level"**: level, tier and stage already mean monster difficulty here.

**Plan -- `public/tools/world/plan.js`**
- `rises: []` in PLAN (empty, so the default world is bit-for-bit today's), and a preview transform `elevPlan(plan, on)` in the `bigTownPlan` style (v2.3.2982: "the default plan untouched") that fills it under `?elev`.
- An entry: `{ id, name, at: [sx, sy] | landmark: '<region>', r (art px) | pts + up side, shape: 'blob' | 'ridge' | 'escarpment', up: 1 | 2, top: '<swatch id>'?, stairs: [{ side: 's', at: 0..1, w: 48 }], oneWay?: true, clear: <art px> }`.
- Later (b2) a region `features` entry with `rise: 1` reinterprets today's `class: 'cliff', shape: 'ridge'` lines as ESCARPMENTS: one side up. A natural rule for the Wheel is "up = toward the spoke's tip", which makes each land climb toward its gate the way its stage briefs already say ("the frozen crown: a high white plateau", "the storm heights high above the desert", "Mesa Top", "Canyon Bottom", "the Obsidian Stair at the foot of the last climb", "the waterfall cliffs: mossy cliff terraces", passes named "the Sandstone Stair" and "the Steam Stair").

**Blueprint -- `public/tools/world/core/layout.js`**
- A new per-cell layer `alt` (Uint8Array beside `tier`/`band`), stamped in a pass after the features (pass 2) and before rivers/roads, with the existing blob/ridge stamps generalised to write a value, noise read at ABSOLUTE cells (the "growth" property the core suite proves). `clear` keeps a rise off roads, rail and places exactly as the dunes' oases do (`tooNear`, v2.3.2981).
- A pass at the very end derives what the game needs: FACE cells (below every southward drop, `STEP_CELLS x drop` deep), RIM cells (the N/E/W edges of a raised area, and one more cell at each face end -- 3.0), and STAIRS decks (`decks.push({ kind: 'stairs', along: 'y', x0..x1, y0..y1 })`, square-ended like a bridge). Append `'face'` and `'stairs'` to CLASS_IDS (append-only) rather than reusing `cliff`, so today's invisible ridges and the new faces cannot be confused.
- b2: where a road crosses a face, a `stairDeck` exactly as `bridgeDeck`/`joinRoad` do for a river (pass 4).

**Ground -- `public/tools/world/core/ground.js` + `ground-worker.js`**
- `groundCatalog`: `face-<region>` entries (group `faces`, **`laid: 'face'`**, brief from that region's `cliffPaint`) and a `steps` entry (**`laid: 'steps'`**) -- the second and third pictures the game lays itself, after the planks. Only listed when the plan has rises.
- `materialMap`: stairs cells -> `steps`, built and CRISP like the boardwalk; and a compact copy of `alt` (sparse: only the chunks that hold a rise) on `mm`. **The worker keeps a SLIM blueprint with no classes** (v2.3.2984: reading `cls` there broke every piece with water in it), so whatever the compositor needs must be extracted at init like `mm.fresh`.
- `composeFine`: a last step after colour. For each output column, find where the lip crosses it (a smooth `alt` share, blurred like the water share, thresholded per pixel with a little noise, so the lip wanders like the shore and the town edge -- never a ruler line, TRAPS §125); every pixel within H below a lip takes the face picture at (u = world x, v = px below the lip). That is a per-column extrusion: the face follows the lip's curve, the foot is a parallel copy of it, faces stack for `up: 2` or terraces. Seamless between pieces because every input is an absolute position. Until the picture exists, the plan's own cliff colour, chequered -- the convention every swatch has.
- `walkBits`: OR in face + rim cells, clear stairs. Stairs also mark `under` as `steps`.
- `overviewPixels`: faces in the cliff colour, so the minimap's ground shows the lip.
- `ground-worker.js init`: `elevOn(search)` beside `edgePiecesOn`/`blendsOn`; post `map.rises` (simplified lips + stairs) and, for v2, the sparse `alt`.

**Collision -- `src/game/wheelTrial.js` (or `BroTown.jsx isSolid`)**
- Read the Wheel's grid AT THE FEET. Today `isSolid` tests a +-10 px box round the body centre and the grid has no feet shift (`lazyGrid` returns row y for row y). With faces that means boots stopping 52 px short of a face's foot and boots 52 px out over the lip. townRim.js solved the same thing by baking the shift into its grid; here the smallest change is `lazyGrid`'s `rowAt(y)` answering for row `y + 2` (48 px, inside the cell's +-12 px) or a `feetDy` the worker is given. This also changes where water stops you (today the bro probably wades ~2 cells into a shore south of him and stops ~2 cells short of one north of him -- worth confirming with `window.__btIsSolid` in a scenario before and after). Behind `?elev` first.
- Granularity: stops are per 24 px cell while the drawn lip is per pixel: the stop line sits within about half a cell (12 px) of the face, the same tolerance the shore has ("the line you are stopped at is the line you see, give or take its noise (about half a cell, 12 game px)", walkBits header). Stairs at least 3 cells (72 px) wide: the bro's box is 20 px but he is drawn ~40-48 px wide.
- No change to the movement code: walking, the ice slide, the gust and the sword/shield dash all test `isSolid` per axis already.

**Objects -- `public/tools/world/core/placing.js`**
- Add face, rim and stairs to the never-on set (l.289); the face-end rule (3.0); a raised landmark's things (the standing stones) on top.
- **Flat things are not Wheel objects.** `wheelObjects.js` puts every object in `entities`, sorted by its foot, so a stair sprite would draw OVER a player climbing it (his feet are north of its bottom edge). Stairs and carved slabs belong to the ground (or to `groundDetails`), never to the object sheets.
- **Walls are not breakable objects.** Every Wheel object has `hp` (`wheelMaterials.js`) and leaves the walk test while broken (`wheelBreak.js`). A cliff made of objects could be shot open for three minutes. Keep walls in the walk grid.

**Server -- nothing for a first step.** Put the first rises where monsters never go: the commons is safe ground (`_wheelSafeAt`, WHEEL_SAFE_R 2,937 px), and every existing `cliff` ridge is in stages 2-4 where no monster stands yet. For elevation among monsters (b3): a BAKED file of face boxes for 'wheel' near the spawn anchors (`tools/world/bake-wheel-terrain.mjs` -> `server/src/wheelterrain.js`, test-world-core failing until re-baked, the `wheelspawns.js` pattern), fed to the existing `slideMove` (monsters slide along faces) and `attackBlocked` (their throws stop at a face from below); a same-rise rule in target acquisition (index.js ~l.2138, beside the safe-ground skip) and "give up when blocked for N s" in the chase (~l.2221, beside the leash), so a player on top cannot farm a monster stuck under the cliff (the TRAPS §103 turret problem, reversed). Kill switch in liveflags, lower case (TRAPS §117), and a caps flag for deploy order -- the `zoneDepth`/`wheelmonsters` pattern.

**Projectiles.** v1: arrows and bolts ignore height (they fly over faces both ways; the only targets near the knoll are other players, and PvP is off in 'wheel'). v2: a shot carries the `alt` it was fired from and stops at the first face it meets going UP (a per-step test beside `sweepBlockPoint` in `projectiles.js`, with TRAPS §101/§103's rules: a step sweep, and a target standing in the face never becomes unshootable); shooting DOWN passes. Server mirror only for monster throws (b3).

**Camera.** Nothing.

**Map and the gold road.** `core/wheelmap.js` adds `rises` (lips Douglas-Peucker'd like the roads, ticks on the low side -- the cartographer's hachures -- and stair marks); `wheelMinimap.js` and `WorldMapOverlay.jsx` draw them. `questRoute.js _wheelPoint`: when the target and the player are on different rises, the point is the nearest stair until the player is on the target's level (the road is a straight line and would otherwise lead into the face).

**Footsteps.** `footsteps.js`: `steps` -> 'stone' (timber stairs 'wood'); faces never underfoot.

**iPhone.** Faces are baked into the ground pieces the game already streams (192 game px, ~0.6 MB each, 28-48 resident): **no new GPU texture**. The worker unpacks one face picture per land in view (~0.2-0.5 MB as palette indices; DECODED_KEEP 16 -> 18). Per-piece cost: the face step only runs on pieces within H of a lip (a cheap per-piece test against the sparse `alt`). The Wheel arrives at ~176 MB of textures, near iPhone Safari's edge, so the object-based variant (several sprite sheets of cliff pieces per land) is the expensive one.

### 3.3 Family (c), one-way ledges, on top of (b)
- A rise or feature with `oneWay: true`: its face cells are passable FROM THE TOP only. In `isSolid`'s caller (BroTown.jsx movement block, ~l.5067), a step from the top into a ledge cell starts a HOP: a scripted move to the first open cell below (~300 ms), the body drawn lifted on an arc (a z offset on the display only -- entityRenderer -- with its cast shadow left on the ground), a landing sound; input ignored meanwhile. From below the ledge is a wall.
- 48-96 px in ~300 ms is 160-320 px/s: inside the server's 500 px/s bound, no `_gustAllowance`-style grant needed. Peers see a short slide unless the move broadcast carries a `hop` flag (optional, deploy-order safe: old clients ignore it).
- Art: none beyond (b)'s face picture; maybe a lower 48 px face variant.

### 3.4 Family (d), real Z -- why not now
Every system in the matrix changes at once: positions gain z on the wire (v1 and v2 protocol both), the server must validate z and run monsters in 3D on a map it is forbidden to hold, projectiles need height and arcs on both sides, the depth sort's single ground-line key stops being a total order (things on a high platform vs a low wall north of it), and the walk test becomes a grid per level with falls and jump-ups (CrossCode's "jump-up edges" and "AirNodes" pathfinder). It buys vertical combat. Revisit only if the owner asks for jumping as a verb, and then as its own project.

### 3.5 Family (e), shading only -- polish for (b)
- A code-drawn shadow of each face on the ground in front of it, along the map's light (`lightfx/shadows.js`, `zoneLight.js`, the `shadows` layer), which is the ONLY legal way to have one (rule 4).
- Keep any "higher is lighter" tint in code too (the `lighting` layer), never in a swatch.

## 4. Costed options + recommendation (first visible step)

Effort: S = one focused session, M = 3-5, L = 6-10, XL = a project. "Server" means a `server/**` change (a worker deploy).

| # | Option | Family | Effort | Server | Main risks | Payoff |
|---|---|---|---|---|---|---|
| O1 | Make today's 6,981 cliff cells real walls, no heights (draw them as rock, block them) | (b) minus height | S-M | no | invisible walls if drawing lags blocking; random ridges may cut routes (needs a reachability check like `check-town-rim.mjs`) | low: walls, not elevation |
| **O2** | **Knoll preview behind `?elev`: one rise + stairs in safe ground** | (b) | **M** | **no** | ground.js is ~2,000 owner-tuned lines; per-cell stops vs per-pixel lip (+-12 px); the feet fix changes where water stops you (keep it under the flag at first) | **high: the whole pipeline proven on one hill the owner can walk in a minute** |
| O3 | The lands climb: today's ridge features as escarpments ("up = toward the gate"), stairs where roads cross faces, 8 face pictures, map lines, quest road via stairs | (b) | M-L | no (stages 2-4 have no monsters yet) | chokepoints change how lands are walked (owner's design call); roads and rivers crossing rises (gorges, falls) | high: the stage briefs' "climb" made real |
| O4 | Monsters and shots across heights: baked `server/src/wheelterrain.js`, `slideMove`/`attackBlocked` for 'wheel', same-rise aggro, give-up-when-blocked; altitude-aware arrows on the client | (b) | M-L | **yes** | mirror drift (needs a mirror test), turret/snipe exploits, deploy order (caps flag + kill switch) | required before any rise stands where monsters fight |
| O5 | One-way ledges with a hop | (c) | S (after O2) | no (optional `hop` flag) | peers see a slide; a gust/knockback over a ledge needs a rule | medium: shortcuts home, a little play |
| O6 | Code-drawn face shadows | (e) | S | no | frame cost on iPhone (budget with the existing shadows) | polish |
| O7 | Set pieces as objects: Sweetwater Falls' ledge (+ code water, as WORLD-BIBLE §13 says), Mesa Top's rope lift, the Obsidian Stair | (b) objects | S each, art-led | no | must be unbreakable (wheelBreak) and never flat | medium: landmarks |
| O8 | Real Z (jumping, falling, shots with height) | (d) | XL | yes, everywhere | everything in 3.4 | only if jumping becomes a verb |

### Recommendation: O2, "Prospector's Knoll", behind `?elev`

Why this spot (measured on the real plan): Prospector's Circle is the commons landmark the plan already describes as "eight weathered standing stones **on a grassy knoll**". It sits at game (20122, 20179), 1,915 game px north-west of the town square's centre, just past the town's edge in the commons (under a minute's walk), inside safe ground by ~1,000 px (WHEEL_SAFE_R 2,937), so no monster ever comes there and **nothing on the server changes**. The disc is ~17 cells (~410 game px) across and no object stands on it today (placing.js skips landmark cells). A footpath arrives at its north-east side; a pond lies just north.

What the owner would see, opening the game with `?elev`:
- north-west of town, the circle's ground raised by one step: its top the commons grass, its SOUTH side a 72 px front of earth and stones under a grass lip (plan colour, chequered, until the picture is made);
- a flight of stone steps, 3 cells (72 px) wide, cut into the middle of that front; walking up it works, walking into the front stops your boots at its foot, walking off the north/east/west edges stops you at the rim;
- the footpath arriving at the north-east through a gap in the rim (a back slope: no face is seen from that side, so it needs no art);
- trees and rocks at the foot drawing in front of it, you drawing in front of it from below and behind anything below when you are on top;
- the minimap showing its lip.

The work, in order (each step testable on its own):
1. `plan.js`: `rises: []` + `elevPlan()`; `layout.js`: the `alt` layer, faces/rims/stairs derived, CLASS_IDS += `'face'`, `'stairs'`; test-world-core: deterministic, growth-safe, the default plan's blueprint hash unchanged, the knoll's top reachable from the arrival by its stairs.
2. `ground.js`/`ground-worker.js`: `face-commons` and `steps` in the catalog (`laid`), the face step in `composeFine`, stairs laid like planks, `walkBits` with faces/rims, `elevOn(search)`.
3. Feet-aware grid (`wheelTrial.js lazyGrid` row shift) under the flag; `placing.js` rules; `wheelmap.js` lips.
4. The Ground Studio's "Faces" group and `steps` card with their prompts (the studio already grew a Water group the same way, v2.3.2980).
5. A phone scenario (`tools/qa/mp/mp-wheelelev.mjs`): stop distances at foot, lip and rims; the stairs both ways; depth order of a tree at the foot vs a player on top; screenshots for the owner.

Then O5 (ledges) is a small add-on; O3 is the owner's call on whether the lands should climb toward their gates; O4 must land before any rise goes where monsters stand.


## 5. Art the owner would need (Ground Studio / Object Studio terms)

All pictures follow the art law (WORLD-BIBLE §6): 2 px per game px, the HD_STYLE paragraph, the style key attached and nothing else, no cast shadows, no glow, darker pixels only where a thing meets the ground.

**For the knoll (O2): two pictures, both in the Ground Studio.**

| Picture | Studio | Kept as | Game size | What it shows | Laid by the game as |
|---|---|---|---|---|---|
| `face-commons` A (B optional, for variety) | Ground Studio, a new **Faces** group (beside Water) | 1024 x ~180 px, seamless left-right by the studio's own cut run on one axis only (`overlapCut(..., alongX=true)` in style/process.js; `seamlessPixels` does both), its own 64 colours | 512 game px wide x ~90 game px: 72 px of face + ~12 px grass lip on top + ~6 px of darker foot | the FRONT of a low grassy bank as it looks from the game's steep three-quarter view: a grass lip along the top, packed brown earth and embedded grey stones below it, in soft shade (the light is from the upper left, behind the top), a few darker pixels along the foot; no shadow on the ground in front, no plants sticking out past the lip, nothing that would look wrong repeated every 512 px | `laid: 'face'`: each column extruded below the lip, u = world x, v = px below the lip |
| `steps` | Ground Studio, one card | 1024 x 1024, like any swatch | 512 game px square | rough grey stone steps seen from the same angle: each step a long slab with a sunlit tread and a shaded riser, the steps running left to right | `laid: 'steps'`: cut into treads 12 game px deep (half a cell, as the planks' boards), 6 per 72 px face, lined up with the stairs' ends; stairs 72 game px (3 cells) wide |

Optional for the knoll, Object Studio: `standingstone` (2 kinds, ~130 game px tall, ar ~0.4, footprint about w 0.6 / d 0.25, material stone with a high `hp` in `wheelMaterials.js`) -- the "eight weathered standing stones". The "round, flat stone slab carved with an eight-spoked wheel" is FLAT, so it is ground (a decal or a small swatch-like picture laid by the game), not an object (pitfall 10).

**For the lands (O3), later:** one face picture per land, written from the `cliffPaint` each region already has in plan.js (frost: grey granite capped with snow and icicles; ember: black basalt columns, the lava glow flat, no glow spilling; sky: layered red sandstone; hollows: a sheer grey granite canyon wall; thunder: a tall riveted iron wall; tidal: a dark mossy sea cliff with teal cave mouths; mist: a mossy root-covered bank; verdant: a mossy ledge hung with vines). A two-step cliff (`up: 2`, 144 game px) wants its own TALLER picture (1024 x ~330 px), because strata repeated vertically read as fake. Steps per material: stone (most lands), timber (the canyon camps), iron plate (the foundry). Each is one card in the Ground Studio and one prompt in `ground/prompts.js` (a `facePromptFor`, like `waterPromptFor`).

**Never needed:** a cliff baked into a ground swatch (rule 7: anything that stands up is not ground; rule 12: a swatch has no direction), or a cast shadow drawn into any picture (rule 4: code adds it, section 3.5).


## 6. Pitfalls specific to this codebase

1. **The Wheel's walk grid is read at the body centre, not the feet.** `isSolid` tests a +-10 px box round `S.player` (the hips) and `wheelTrial.js lazyGrid` has no shift, while the boots are 52 px lower (`playerGroundDy`; TRAPS §113 "a character's position is its hips"). Faces would stop your boots 52 px short of their foot and let them hang 52 px over the lip. townRim.js already bakes the shift into its grid; do the same for the Wheel (and check water's stop line before/after -- it likely has the same 2-cell error today).
2. **Collision must come from the plan, never from the art.** Hue-derived masks were rejected by the owner twice (tiledMaps.js v2.3.1777/1794: stairs misread as wall, a 32 px slot trapped the player). The blueprint is the authored source; the picture is drawn to it.
3. **`cliff` is dead data today.** Turning on `classes.cliff.walk: false` in `walkBits` without drawing them would put 6,981 invisible walls across stages 2-4. Blocking and drawing ship together.
4. **"Level" is taken.** Monster level, `tier` (levels 5t-4..5t) and `band`/stage already mean difficulty. Call height `alt`/rise/step.
5. **CLASS_IDS is append-only**, and any plan change re-hashes the blueprint, which `tools/world/bake-wheel-spawns.mjs` and test-world-core watch. Ship the first rise behind a plan transform (`elevPlan`, the `bigTownPlan` precedent) so the default plan is bit-for-bit unchanged and nothing needs re-baking.
6. **A swatch has no direction (rule 12) and test-world-core checks it (~l.311).** A face and a flight of steps are directional: they must be `laid:` entries the game draws itself, like the planks (the test already exempts `laid`).
7. **No baked shadows (rule 4).** The face picture carries its own shading (a surface in shade) but never a shadow on the ground in front; that shadow, if wanted, is code (`shadows` layer, lightfx).
8. **No ruler lines.** A lip traced on 24 px cells is a staircase on every diagonal, and slow noise on a cell edge is still a ruler line (TRAPS §125; the owner on the town edge: "razor straight"). Draw the lip per pixel from a smooth field, like the shore; accept that stops are per cell (+-12 px, the shore's own tolerance).
9. **The depth sort is right in screen space except at a face's ends.** Someone beside a plateau, north of the face's foot, is behind the face but drawn over it (face in the ground layer). Pad the end columns in the walk grid, keep objects' sprites out of that strip in placing.js, or give the end columns small sorted sprites with `_groundDy` (3.0).
10. **Flat things cannot be Wheel objects.** `wheelObjects.js` puts every object in the sorted `entities` layer by its foot, so a stair or a carved slab sprite would draw over a player standing on it. Stairs belong to the ground (or `groundDetails`).
11. **Wheel objects break.** Every catalog object has `hp` (`wheelMaterials.js`; test-world-core fails for one without) and leaves the walk test while broken (`wheelBreak.js`, 3 min). A wall made of objects could be shot open. Walls live in the walk grid; cliff set pieces need an unbreakable flag.
12. **Whatever is a footprint blocks arrows and swings too** (`zoneBlockers` hook -> `sweepBlockPoint`, `propSwingContact`) and gets hit sounds and stuck arrows. That is why faces belong in the walk grid (which shots ignore) for v1, with a separate altitude-aware shot test for v2 -- and TRAPS §101/§103 (step sweep, never an unshootable monster inside geometry) for that test.
13. **The server must never build the map.** Monster elevation = a baked table + a mirror test + a lower-case liveflag kill switch (TRAPS §117) + a caps flag; `slideMove`/`attackBlocked` already consume boxes. Monsters spawn and leash without geometry (TRAPS §103), so the bake must keep spawn points off faces and rises they cannot reach.
14. **The worker keeps a slim blueprint.** It drops `cls` after `materialMap`; v2.3.2980's water look read classes there and broke every water piece (v2.3.2984). Extract `alt`/lip/stairs into compact arrays at init (`mm.fresh` pattern) and test composing with the slim copy.
15. **Pieces are composed apart and must meet with no seam.** The face step may only read absolute positions and the sparse `alt`, with an apron H px tall above each piece (a lip just north of a piece's top edge owns face pixels inside it).
16. **iPhone memory.** The Wheel arrives at ~176 MB of textures, near iPhone Safari's limit; pieces are ~0.6 MB each, 28-48 resident. Faces baked into pieces cost no GPU memory; cliffs as sprite sheets would cost several MB per land.
17. **The gold road is a straight line** (`wheelMinimap.js`): a quest target on a rise needs a waypoint at its stairs or the road points into the face.
18. **Dashes stop at walls by design** (BroTown ~l.4719: "a bash must not post the player through a cliff... strike from here"). A dash from a rise at a monster below ends at the lip and whiffs -- the honest outcome, but players will meet it.
19. **Docs.** CLAUDE.md says the foreground layer is missing; it exists (`pixiApp.js`, v2.3.2655). DEPTH-ROADMAP item 4 ("elevation as traversal, not scenery") is the slot this work fills.
20. **The word "stairs" is taken.** `wheelHome.js`/`zoneTransitions.js` "town's stairs" is the old town's exit to the World View, a zone change. Name the new ones `steps`/stair decks in code.


## Appendix: raw notes as I go

### Raw notes — checkpoint 1 (code facts found so far)

- **`cliff` class exists but is NOT drawn and NOT a wall in the game today.**
  - `public/tools/world/core/layout.js` CLASS_IDS index 5 = 'cliff' (APPEND ONLY list).
  - Stamped in two places: (1) region `features` with `{ class: 'cliff', shape: 'ridge', density, r, len, in: [stages] }` (plan.js: frost/ember/dunes/cave/foundry/tidal/flora/...; e.g. cave density 1.1, r 26-48, len 300-700) via `stampRidge` (layout.js pass 2, ~l.547); (2) river "falls": a 34-art-px rock ledge across the river (layout.js pass 3, ~l.581), then the river cuts through it.
  - plan.js `classes.cliff = { walk: false, color: '#6d645a' }` and the comment "cliffs are where climbing will go" (plan.js ~l.166) — INTENT only.
  - `ground.js materialMap` has no cliff branch: a cliff cell falls through to the land's stage swatch, i.e. **drawn as plain ground** (same for obstacle, landmark, gate).
  - `ground.js walkBits` blocks ONLY water (blurred water share >= 0.5); so **cliff cells are walkable** in the game. `walk:false` in plan.classes is not read by the game's walk grid.
  - `placing.js` (~l.289) keeps objects OFF cliff cells (same set as roads/water), and its tree/rock clumps follow the plan's `obstacle` clumps.
  - `prompt.js` uses `cliffPaint` for the World Builder's ChatGPT square prompts (old per-square painting path, not the game's ground).
- **Walk grid**: one bit per blueprint cell = 16 art px = 24 game px (`ground-worker.js` init -> `walk: {cols, rows, bits}`, 1792x1792 cells, 400 KB). Client: `src/game/wheelTrial.js lazyGrid` -> `S._tiledWalkable['wheel'|'worldview']` (rows of booleans made lazily). `isSolid(px,py)` in `src/ui/BroTown.jsx` ~l.4138 reads it; movement is per-axis (`P.x = nx` if 4 corners of a +-hs box not solid, ~l.5067), plus `_monBlock`, `_nodeBlock`, `propFeetBlocked` (prop footprints from `zoneBlockers(zone)` = worldProps hook, tested at the FEET: P.y + playerGroundDy, ~52 px below body centre). "Never trap someone already inside" rule applies to the grid.
- **Prior art for "depth" (not height)**: Wind Dunes (`sky`) perspective curve — `zones.js zoneDepthScale/depthK/zonePlayerScale`, server mirror `server/src/depth.js zoneDepthK` + `_depthK` with kill switch `zoneDepth` in liveflags, caps.zoneDepth; spec `docs/specs/dune-depth.md`. Scales sprites, walk speed, reaches, monster AI distances by y. Proves the codebase's pattern for a client+server mirrored terrain function with a kill switch and a lockstep test.

### Raw notes — checkpoint 2 (rendering, art law, prior art)

- **Layers** (`src/rendering/pixiApp.js` WORLD_LAYER_NAMES): tiles, groundDetails, groundSplatter, shadows, groundLoot, telegraphs, gatherNodesBack, **entities (sorted)**, gatherNodes, particles, monsterUi, **player**, **gatherNodesFront (sorted)**, gestureFront, projectiles, **foreground (exists since v2.3.2655 — CLAUDE.md's "no foreground entry" note is STALE)**, lighting, glows, damageNumbers, overlayWorld. foreground users today: worldFx air layer, ambientFx, entityRenderer (~l.14811, edge-cropped decor). Not depth-sorted.
- **Depth sort** (`src/rendering/depthSort.js`): ONE key = ground-contact line (feet y, `groundOf(c) = c.y + c._groundDy`). Occluders flip between `entities` (behind player) and `gatherNodesFront` (in front) by `wantsFront(groundY, playerFeetY)` with 2 px hysteresis; `raiseOverProps` + `propGround.js groundLineAt` handle non-flat building bases. No notion of height: a thing on a plateau and a thing at the cliff foot are ordered purely by y.
- **Player position = body CENTRE**, feet are `playerGroundDy(zone,x,y)` ~52 px below (`entityRenderer.js` ~l.5325). Every feet-vs-world test adds it (propFeetBlocked, NPC block, nodes). townRim.js bakes the feet offset into its grid.
- **Old town** = "clifftop plateau" PAINTING with painted stairs (town_v17.webp): elevation was paint only (family a). Collision history (`src/rendering/tiledMaps.js` ~l.100-190, `src/data/townRim.js`): hue-derived masks REJECTED by owner twice (v2.3.1777/1794: "too unreliable"; stairs misclassified as blocked, a 32 px slot trapped the player); accepted: AUTHORED boundaries (owner-drawn worldview line v2.3.2076; offline-traced town rim v2.3.2896 with a checker that spawn/NPCs/doors/stairs are inside and mutually reachable). LESSON: elevation collision must come from the PLAN, never from the art.
- **DEPTH-ROADMAP item 4** "Strengthen elevation as traversal, not scenery" (cost M-L, perf low, payoff high, future maps mostly) — unscheduled. Item 5 foreground: shipped as a layer; cap 6 MB decoded/zone, <=8 decor assets, 512 px long-edge (ART-ASSET-PHASES).
- **Art law** (WORLD-BIBLE §6 rules): r1 2 px per game px; r4 light from upper-left, 3-5 shading steps, NO cast shadows on ground, no glow/fog (code adds them); r6 objects 1-px outline in darker own colour, ground none; r7 quiet ground, anything that stands up is an OBJECT; r12 ground swatches have NO DIRECTION (tiled same way up everywhere) — sole exception the boardwalk planks laid by the game (`laid: 'planks'`, `planksOf`); r13 layer order of grounds. §11: everything that stands up is an object; §13: "the falls are code-drawn water over a cliff OBJECT" (already decided cliffs = objects).
- Code-drawn shadows EXIST: `shadows` layer, lightfx/shadows.js silhouette shadows (v2.3.2710/2711, `?lightfx=0` off), zoneLight.js per-zone light direction. So a cliff's shadow could legally be CODE-drawn, never baked.
- **The plan itself asks for elevation** in stage briefs: frost-4 "a high white plateau"; sky-3 "red mesas... sunlit tops, layered sides in shadow" + camp "Mesa Top with a rope lift"; sky-4 "the storm heights ... high above the desert"; hollows-1 "stepped quarry terraces"; hollows-3/4 "granite canyons ... narrow canyons dropping into shadow" + "Canyon Bottom" camp; thunder-4 "the storm plateau"; tidal-3 "sea cliffs and rock shelves"; verdant-3 "waterfall cliffs: mossy cliff terraces" + "Mistfall Terrace"; passes "the Sandstone Stair", "the Steam Stair"; ember camp "the Obsidian Stair ... at the foot of the last climb". Each region already has `cliffPaint`.
- Object catalog (`public/tools/objects/catalog.js`) has NO cliff/ledge/stairs objects; nearest: hoodoo (240 tall), boulder, stonewall (tumbledown wall, 150 wide), icespire, obsidian. Footprints = boxes at the foot (`placing.js FOOT`, `footprintOf`).

### Raw notes — checkpoint 3 (measured on the real plan, read-only probe in scratchpad/probe/elev-probe.mjs)

- Blueprint 1792 x 1792 cells, cell = 16 art px = **24 game px**; square = 768 art = 1152 game px; build ~1.7 s in Node.
- Class counts: ground 682,875; path 41,991; obstacle 116,827; water 17,621; ocean 2,314,553; **cliff 6,981**; lava 4,867; landmark 2,621; street 2,316; plaza 784; lot 7,697; river 2,748; rail 2,270; bridge 129; gate 6,984.
- Cliff cells by region/stage: hollows st2-4 (861/873/697), ember st2-4 (86/763/214), frost st2-4 (471/566/445), sky st3-4 (266/142), thunder st2-4 (108/245/277), tidal st2-4 (61/482/325), verdant st3 (99). NONE in stage 1 or the commons -> today's monsters (levels 1-5, inner ends) never meet them.
- **walkBits blocks 0 of 6,981 cliff cells, 11 of 116,827 obstacle cells, 0 of 2,621 landmark cells.** Cliff cells are drawn as the land's own swatch (e.g. hollows-2: 809). I.e. today's cliffs are invisible AND walkable; `classes.cliff.walk:false` is dead data in the game.
- Prospector's Circle (commons landmark, plan: "eight weathered standing stones on a grassy knoll"): game (20122, 20179), r 210 game px, **1,915 game px from the centre = inside the safe radius (WHEEL_SAFE_R 2,937)** -> no monsters ever. Sweetwater Falls (the river's rock ledge, 34 art px ridge): game (13368, 14147), 10,969 from centre.
- Server: **"the server has no copy of the map and must never build one"** (wheelzone.js header). Monsters chase in straight lines; `server/src/props.js slideMove/attackBlocked` use a static per-zone box table `ZONE_PROPS` (town, frost only) -> in 'wheel' nothing blocks a monster or a monster's shot. Pattern for adding geometry = a BAKED table (like `server/src/wheelspawns.js`, baked by `tools/world/bake-wheel-spawns.mjs`, test-world-core fails until re-baked) + a mirror-audit test.
- Server movement bound: `server/src/movement.js` 500 px/s * caps + 80 px burst + `_gustAllowance` (v2.3.2996 precedent for a worker-granted widening). A ledge hop of 48-96 px over ~300 ms is ~160-320 px/s: inside the bound, no server change.
- Client projectiles: `sweepBlockPoint/attackBlockPoint/propSwingContact` (src/data/worldProps.js) test against `zoneBlockers(zone)`, which in the Wheel is the hook from wheelObjects.js (nearby object footprints). Whatever is a footprint box blocks feet, arrows and swings automatically. TRAPS §101/§103: step-sweep vs whole-line; "an endpoint inside a box never blocks" (monsters spawned inside geometry must stay hittable).
- **Pre-existing pitfall: the Wheel's walk grid is read at the BODY CENTRE** (isSolid at P.x±hs, P.y±hs, hs=10), not the feet (52 px lower). wheelTrial.js lazyGrid has no feet shift (townRim.js bakes it in; the Wheel's doesn't). For water it means the bro wades ~2 cells in at south-facing shores; for cliffs it would mean stopping with boots 52 px short of a face's foot and boots 52 px out over the lip. Elevation MUST fix this (shift the grid by playerGroundDy, or test the feet).
- Quest gold road on wheelMinimap.js is a STRAIGHT line you->target (no routing); the trail BFS in tileRenderer (~l.1688) is for old zones' ground path (put away v2.3.2992).
