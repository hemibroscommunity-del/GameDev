# One Seamless World — the grid, the prompts and the fuser (v2.3.2931–2936)

**Status:** Phase 1 is shipped: the **World Builder** page
(`public/tools/world/`, live at `/tools/world/` on the site).

- No game code has changed yet, apart from the `?trial=world` switch
  (v2.3.2932, below).
- The world plan in `public/tools/world/plan.js` is the source of truth for
  the map's layout.
- **v2.3.2933 asked two questions before phase 2; v2.3.2935 has both
  answers** (World Bible §6 and §13):
  - the new world is **HD pixel art on a 1.5 game px grid**, matched to the
    player (who is kept). Every prompt here now asks for it;
  - the ground is **baked from swatches**, not painted square by square.
    ChatGPT's pixel art holds about half a square's width per picture, so
    squares are no longer painted one picture each. This page stays the
    plan, the blueprint (where every swatch, road, shore and wall goes) and
    the home of the style key.
- **v2.3.2936: the plan is the Wheel** (World Bible §3): the commons round
  the town, a spoke of land for each of the eight elements with its own
  levels 1–80, sea between them, passes at levels 20 and 60, and a gate to
  the Dark or the Light realm (80–100) at every tip. The geometry is
  `core/wheel.js`; the blueprint stores every cell's level.
- The world's story and look (through-lines, regions, Brotown's Main
  Street, the style key, the character refresh) are written up for people
  in **[WORLD-BIBLE.md](WORLD-BIBLE.md)**.

> Owner, 2026-09-28: *"I'm wanting one seamless map and to have chatGPT draw it
> into squares. I'll need to fuse them together but have some type of grid and
> prompt system to construct the entire thing."*

This follows a feasibility study done the same day. It found that the zones
cannot be joined as they are:

- Every zone is a self-contained painting with its own framing and its own
  sun.
- Frost is a peninsula, tidal an island, town a cliff-ringed plateau, and
  ember and the dunes fade to horizons.

A seamless world therefore needs **new continuous art**, and art is the long
pole. This document covers how that art gets made; the engine work that
follows is at the end.

---

## The phases

| # | Phase | Who | State |
|---|---|---|---|
| 1 | **Tooling**: plan, blueprint, prompts, fuser, World Builder page | sessions | **shipped v2.3.2931** |
| 2 | **The style key**, then the first **ground swatches** (a Ground Studio page, next), judged on a phone next to the bro. *(Before v2.3.2935: paint a test strip of squares round the town square.)* | owner | **next: the style key** |
| 3 | **Make the ground**: every swatch, baked onto the plan. *(Before v2.3.2935: paint every land square.)* | owner + sessions | — |
| 4 | **Export for the game**: cut the fused world into streaming chunks under `public/maps/world/` | sessions | — |
| 5 | **Engine**: chunk streaming, region from position, server interest by region (see "What the game needs") | sessions | — |
| 6 | **Walls, climbing, jumping** from the blueprint's terrain classes | sessions | — |

Phase 2 exists so the style key, the prompts and the fuser can be tuned on
real ChatGPT output before hundreds of pictures are made with them.

---

## The owner's loop

**Once, first: the style key.**

- The page's **Style key** card shows a prompt. Ask ChatGPT with it until
  you love the look, then save the picture in the card.
- From then on every prompt asks ChatGPT to match it, and you attach it next
  to every template. On a phone, **Share…** sends both.
- Why this matters, and the HD pixel art rules it carries: [WORLD-BIBLE.md §6](WORLD-BIBLE.md#6-one-look-for-everything-brotown-hd-pixel-art).

**Then, per square:**

1. Open **`/tools/world/`** on the site.
   - The map shows the plan with the grid over it.
   - Squares outlined in gold are **ready**: their neighbours are finished,
     so ChatGPT will see real edges.
   - **Next square →** picks the best one. The first is always Y25, the town
     square.
2. **Save the template picture.** It shows the square's piece of the plan in
   flat colours, with the finished art of its neighbours already painted
   along its edges.
3. **Copy the prompt.**
4. In ChatGPT, start a **new chat**. Attach the template and the style key,
   paste the prompt and send. Save the picture it makes.
   - If it added a border, text, a building on a plot or a horizon, ask
     again. That is cheaper than fixing a seam.
5. **Bring the picture back** (choose it, drop it, or paste it).
   - The page lines it up, matches its colour and cuts the seam.
   - It then shows the join with a grade: *Seamless*, *Joins well*, *May
     show* or *Try again*.
6. **Keep it** or **Try again**.

**Keeping the work safe:**

- Work is kept in the browser on that device.
- **Download backup** gives a `.zip` of every ChatGPT picture and the style
  key. **Restore backup** rebuilds the whole world from it on any device.
- The page asks for a backup every 5 squares.
- iPhone Safari may reload the tab while you are in the ChatGPT app; the
  page reopens the square you were on.

---

## How it works

### The grid, and growing it later

**Names.** Squares are named like a spreadsheet, fixed by a **frame of
49 × 49** (A1 is the north-west corner, AW49 the south-east).

**What is planned today.** The **active area** in the middle of the frame:
**G7 to AQ43, 37 × 37 squares**. **Y25** sits exactly on the world centre,
and holds the town square. (v2.3.2936: the frame was 25 × 25 round M13
until the Wheel needed room for its spokes; nothing had been painted.)

**Size of a square.**

- Each square is **1024 px** of art, and each ChatGPT picture is resampled to
  that. ChatGPT returns 1024 or 1254 px squares depending on the day.
- Squares **overlap by 256 px (25%)** on every side, so origins sit 768 px
  apart.
- The overlap is where the seam goes. It is also all the model ever sees of
  a neighbour, which is why it is generous.

**Size of the world.**

- The active area is 37 × 768 + 256 = **28,672 art px**. At **1.5 game px
  per art px** (one pixel of the HD pixel art, v2.3.2936; it was the old
  town painting's 1.3), that is **43,008 game px**.
- The Wheel inside it is about **490 zones of land** (a zone is today's
  1,024 × 1,024 game px). From the Town Hall to a spoke's gate is about
  **2 minutes** at a run.
- **536 squares have land.** 833 are open sea between and round the spokes.

**Growing.** Owner: *"how would I expand the game later?"*

- Widen `plan.active`, in any direction. Nothing already painted moves or is
  renamed.
- The frame can grow too (south and east), because the world centre is
  pinned to square Y25 rather than to the frame's middle.
- This works because every value in the blueprint is a function of absolute
  position:
  - plan positions are measured in squares from the centre;
  - noise is sampled at those positions, on a lattice aligned to absolute
    cells;
  - scattered features sit on a **hashed lattice**, not a random sequence
    whose every draw would shift when the area grew.
- The core suite proves it: it grows the active area and the frame, and
  checks that the plan under every existing square is bit-for-bit unchanged.
- The ways to use new room (longer spokes, islands, underground) and why
  more players need more worlds rather than more squares:
  [WORLD-BIBLE.md §9](WORLD-BIBLE.md#9-growing-the-world-and-the-load-it-can-carry).

**When the plan changes under painted squares.**

- Every kept square records a **plan key**: a fingerprint of its piece of
  the blueprint.
- If a later change touches it (a road moved, the coast pushed out), the page
  names exactly those squares for repainting, and no others.
- The positions, the scale and the seed still decide where everything sits;
  descriptive text (paint, zones, borders, style) is safe to change at any
  time.

### Brotown is part of the plan

**The town is drawn as a Main Street town, from the plan, like everything
else** ([WORLD-BIBLE.md §5](WORLD-BIBLE.md#5-brotown)):

- streets, a town square, boardwalks and 17 EMPTY building plots;
- four gates, with the Old Roads leaving from them.

**Buildings become separate sprites standing on their plots.** The game
depth-sorts sprites by their ground line (`depthSort.js`), so a player can
walk behind a building. A building painted into the ground can never cover
a player standing behind it.

**The old town painting is no longer the centrepiece.**

- `town_v17` was the anchor of the first plan.
- The anchor machinery stays (`plan.anchors`) for any painting that must be
  kept exactly as it is, but none is used by default.

### The blueprint (`core/layout.js`)

**What it is.** A colour-coded plan of the active area: one cell per 16 art
px (1,792 × 1,792 cells; 8 before v2.3.2936). Each cell holds four things:

- a terrain **class**: ground, road, thick trees/rocks, water, sea, cliff,
  lava, landmark, street, boardwalk, plaza, building plot, river, railway,
  bridge or gate;
- a **region**: the town, the commons or one of the eight spokes;
- a **stage**: which of its spoke's four looks, one per 20 levels (stored as
  `band`);
- a **tier**: the level, five levels a tier, 1 to 16 along every spoke, and
  0 where no monster goes. It is the level map a game system asks "how
  dangerous is it here?"

**It is deterministic.** It is built from the plan's seed, so every device
builds the same world. It avoids `Math.sin/cos/pow`, which may differ in the
last bits between Chrome and Safari: the spokes point along the eight
compass directions, made with square roots alone (`core/wheel.js`). It
builds in about 1 s on a desktop.

**What the layout contains (the Wheel, v2.3.2936):**

- **The commons** round the town, safe, and **eight spokes** of land, one
  per element, where the World View painting has the zones: frost NW,
  flame N, wind NE, stone E, storm SE, water S, venom SW, flora W. Sea
  between them. Each spoke is a capsule from the centre, three zones wide,
  with a ragged coast.
- **Passes** joining neighbouring spokes across the sea at levels 20 and 60.
- **Brotown**: Main Street and Market Row, the square, the boardwalks and
  plots.
- **The roads**: a trunk down every spoke from the town gates to the tip,
  the passes, and footpaths to the Arena, to Prospector's Circle and to the
  landmarks beside the roads.
- **The Sweetwater River**: a smooth meandering curve from the glacier on
  Frost Ridge to the lagoon between the Poison Forest and the Water Caves.
  Its falls are cut through a cliff, and a bridge is stamped wherever a road
  crosses it.
- **The mine railway**, with its branch and its abandoned spur through the
  passes.
- Plots for the Rail Depot, the Old Mill, the Arena and 32 camps (levels
  20, 40, 60 and 80 on every spoke).
- Each spoke's woods, ponds, cliffs and lava, by stage. The Buried City,
  the Great Cave and the Foundry Dome partway out, and a **keystone gate**
  at every tip.

**The roads, camps, passes, river and railway are laid out from the wheel's
geometry** at the end of `plan.js`, so they always run where the spokes are.

**The builder's Levels view** colours every land square by its tier, green
at level 1 to red at 80, and each square's title says which levels it
holds.

**Job 1, today: the sketch in every template.**

- It keeps roads, rivers and coasts continuous across squares before
  anything is painted. The main source of seams in tiled AI art is two
  squares disagreeing about *where* things are.
- Outlines are smoothed, so the model is not shown 8 px stair-steps to copy.

**Job 2, later: the game's collision map.**

- The `walk` flag on each class says whether you can stand there, and cliffs
  are where climbing goes.
- Walls are drawn *first* and painted to. That is the reverse of the two
  failed attempts to trace walls off finished paintings (`tiledMaps.js`
  v2.3.1693 and v2.3.1794).

### One light for the whole world

- Electric Foundry is painted at night today, and Stone Hollows inside a cave.
  In one continuous map, a day/night line at a region border would be the
  worst seam of all.
- So every square is painted in the **same daylight**, from the upper left.
- A region's mood comes from its materials (black iron, glowing crystal).
- The game can still darken a region as you walk in, using the atmosphere
  layer it already has.

### The prompt (`core/prompt.js`)

Each prompt is built from four things only.

**1. The style bible** (`plan.style`, `plan.never`), identical for every
square:

- a steep three-quarter top-down view with no horizon and no perspective;
- daylight from the upper left, with shadows to the lower right;
- painterly detail matching the finished edges;
- the scale: a person ≈ 90 px, a tree ≈ a person;
- never text, borders, vignettes, sky, people, monsters, or buildings
  (plots stay empty).

**2. The style key**, when saved: *"paint in exactly the style of the style
key … but do not copy its tiles"*.

**3. What the blueprint puts in the square:**

- **Its region and band.** For example *"Frost Ridge — the snowbound taiga:
  deep snow with wind-carved drifts …"*, plus the next band when the square
  crosses into it.
- **Any other region coming in**, and the **border landscape** between them
  (steam fields, ash dunes …).
- **Brotown's streets and plots**, including which gate a street ends at.
- **Every road, the river and the railway, with the edges they cross.**
  *"The Sweetwater River flows in from the top edge and out by the bottom
  edge"*; *"The Frost Trail comes in from the right edge and ends at the Ice
  Spires"*.
- **The places**: landmarks, the plots outside town, the bridge and the
  falls.
- **A legend of only the colours this sketch shows**, each described in that
  region's terms. Frost water is "a frozen lake …", and the river gets one
  description per region it crosses.

**4. What is already painted:** which edges are finished neighbours.

Consistency across a hundred generations comes from the style key, the style
bible and the real neighbour pixels in each template. It never relies on
ChatGPT remembering earlier squares, which it cannot be trusted to do. A new
chat per square is fine.

### The fuser (`core/fuse.js`, `core/maxflow.js`)

ChatGPT redraws the whole picture, so the "kept" edges come back shifted, a
little zoomed, a shade off in colour, and with all the fine texture re-invented.
Pasting a square down as it comes would leave a line at every border. So:

1. **Align.** It finds the zoom and shift that best line the picture's kept
   parts up with the real finished pixels. This is a masked normalised
   cross-correlation, searched coarse-to-fine on a three-level pyramid, with
   zoom and shift refined *together*. When only one edge is known, a small
   zoom and a small shift look alike along it. Refining them separately left
   the far side of a square 3 px off; the fix is covered by a test.
2. **Colour.** A per-channel gain and offset, measured over the parts it was
   meant to keep.
3. **Seam.** A **minimum graph cut** over the whole overlap ("Graphcut
   Textures", Kwatra et al. 2003). The max-flow is Boykov–Kolmogorov.
   - Pixels touching finished art outside the square must stay old.
   - Pixels touching the square's new-only area must become new.
   - The cut runs where old and new differ least: round a tree, not through it.
   - One cut handles every overlap shape the grid makes: one band, an L, a
     corner block that only a diagonal neighbour painted, a full ring.
   - Pixels the alignment had to smear in at an edge never replace finished
     ones.
4. **Blend** across the cut over ~12 px, then write the square.

**Grades**, calibrated on real zone paintings cut into squares and damaged the
way a regenerated picture is:

| Case | Alignment match | Seam | Grade |
|---|---|---|---|
| clean re-render | 0.97 | 0.027 | Seamless |
| shapes moved 6 px | 0.92 | 0.03 | Seamless |
| shapes moved 15–30 px | 0.83 | 0.045 | Joins well |
| strong colour cast | 0.99 | 0.03 | Seamless (colour match absorbs it) |
| a different picture | 0.4 | 0.15 | Try again |

A fuse takes about 2 s per square in desktop Chromium. Expect 2–5 s on an
iPhone.

### Storage (`store.js`)

IndexedDB in the owner's browser:

- **the project record:** squares, order, grades, and each square's plan key;
- **every ChatGPT picture as uploaded:** these are the real asset;
- **the fused world** in 512 px PNG chunks;
- **the overview picture and the style key.**

**Backups.** A backup `.zip` holds the pictures, the style key, the order and
the plan keys. Restoring re-fuses the pictures in order and gives
byte-identical results, which the browser test checks.

**Redo.** Removes a square and re-fuses the world without it. It then lists
the squares painted after it that touched it, because they were painted to
match it.

---

## Tests

**`node tools/world/test-world-core.mjs`: 72 zero-dependency checks.**

- **Grid:** maths, the frame and the active area, Y25 on the centre, and one
  art px equal to one pixel of the HD pixel art (`style/bible.js`).
- **Growth:** widening the active area, and even the frame, changes the plan
  under no square. Moving one path changes only the few squares it crosses.
- **Blueprint:**
  - determinism;
  - sea at the corners;
  - the Town Hall in the middle of the square, both streets to their gates,
    17 plots each fronting a boardwalk, the depot, the mill and the arena;
  - **the Wheel**: eight spokes, one per element; down every spoke the tier
    climbs 1 to 16, one per zone, in four stages; the commons has no tier;
    sea between the spokes; 16 passes joining neighbours at levels 20 and 60;
    32 camps; 8 gates, four to each realm; a road to every gate and landmark;
    the town to a gate about 19 zones;
  - the railway into the Great Cave and the Foundry Dome, and the spur
    stopping short of the Buried City;
  - the river from Frost Ridge to the sea, the Mill Bridge and the Snake
    Bridge, the falls;
  - about 490 zones of land.
- **Prompts:**
  - the town square and streets, and a gate becoming a road;
  - the river's flow edges, the bridge, the fork, the mill and the commons'
    edge;
  - the river's source, the stage a square is in and the next one, a road
    ending at its gate, a pass with its border landscape, a pass joining the
    next spoke's road, and the abandoned spur;
  - the HD pixel style bible, and the style key line appearing only when a
    key is saved.
- **Max-flow** against brute force on 600 random grids.
- **Fusing** 9 damaged squares on a procedural painting:
  - shift and zoom undone to under 1 px;
  - every join great or ok;
  - the "ignored template" case and the border constraint.
- **The zip round trip.**

**`node tools/qa/world-page.mjs`: 38 checks in real Chromium**, against a
local server over `public/`.

- The plan, and Y25 offered first with a prompt that sets the look; the
  Levels view, and a spoke square saying which levels it holds.
- The style key saved, shown, and written into every prompt.
- Three squares fused through the real upload button:
  - The fake ChatGPT pictures are cut from a known "true" world (the meadow
    painting, tiled) and damaged with zoom, shift, colour cast and noise.
  - Y25 is damaged in colour only, because the first square defines the
    world's geometry.
  - They match the truth at about 31 dB after a colour fit.
  - The second square's template carries the first square's pixels.
- An unrelated picture graded "bad"; a non-square picture centre-cropped.
- Surviving a reload: the squares, the square you were on, and the style
  key.
- Plan keys recorded; Redo.
- A backup restored into a fresh browser profile, with byte-identical
  pixels and the style key.
- Screenshots with `WORLD_SHOTS=<dir>`.

**`node tools/world/render-plan-images.mjs`** regenerates the plan pictures
in `docs/world/` from the live plan: the Wheel with its levels, names and
gates (`wheel-plan.png`), the builder's map with every land square's name,
and Brotown close up.

None of these is on the CI path, following the owner's 2026-07-16 directive.
Run them when touching `public/tools/world/`.

---

## The world trial: walking a seamless island today (v2.3.2932)

> Owner, 2026-09-29: *"Can we do one trial run where you just replicate the
> entire worldview map using copies of existing art so I can test loading times
> and game feel?"*

**v2.3.2936: the trial is the round island the Wheel replaced.** It was baked
from plan v2, and it stays as it is: it measures how streaming loads and
feels, which the Wheel's shape does not change. `bake-trial-world.mjs` now
refuses to run on the new plan rather than bake something half right; the
Wheel's ground will be baked from the new swatches instead.

**How to try it.** Open the game with **`?trial=world`** on the end of the
address (the pull request's preview link, or the site once merged). Then walk
down the town's stairs as usual.

- The World View is replaced by the **whole island at full size**: 13,312 ×
  13,312 game px, about 80 s coast to coast.
- You arrive at the foot of the town painting. The marker there takes you
  back to town.
- The switch sticks for that browser tab. `?trial=off` turns it off.
- Add `&perf=1` for the frame-time readout at the top of the screen.

**What it is:**

- **The layout is this plan's island.** The regions, roads, river and
  bridge, railway, beaches and sea are all where the blueprint puts them.
- **The pictures are copies of today's art.** Each region is its own zone
  painting cropped, resampled to the plan's density and tiled seamlessly,
  blended into its neighbours. Today's town painting sits in the middle at its
  real size.
- **It is baked by `tools/world/bake-trial-world.mjs`** into 400 pieces of
  512 × 512 art px under `public/maps/world-trial-v1/`: 16 MB in all, about
  42 KB a piece. That is the same chunking the World Builder stores, and the
  export in phase 4 will produce the same.
- It looks like a patchwork. The point is how the real thing will **load and
  feel**.

**How it runs** (`src/game/worldTrial.js`, `src/rendering/chunkGround.js`):

- **It rides on the World View.** It is a zone every worker already accepts,
  safe and without monsters, and the worker never clamps a position to a
  zone's size. So the trial needs **no server change**, and a player without
  the switch never meets it.
- **Only the pieces round the camera are in memory.** Those are the pieces
  the view touches plus 360 px, loaded nearest-first, four at a time, and
  freed a piece further out.
- **Pieces not yet arrived show a blurry copy.** A 1/13-scale picture of the
  whole island sits underneath, so they are never a black hole.
- **The way in waits for the first pieces.** The ordinary zone-loading
  overlay holds until the first screen has arrived, and that time is shown.
- **The sea and the river stop you; the bridge does not.**
- **It does not include** monsters, trees or props, buildings, or other
  regions' collision. It is ground only.

**The readout** (bottom-left, in the trial):

- the way in time;
- pieces in memory, and their MB;
- how many have loaded, with the average, last and worst load times;
- **pop-ins**: a piece that was on screen before its picture arrived. This is
  the number that says whether streaming is keeping up.

**Measured** (`node tools/qa/mp/run.mjs worldtrial`, 16 checks). This ran in
headless Chromium with software graphics against a local worker, so a phone
over the internet will be slower to fetch and faster to draw:

| | |
|---|---|
| way in | **0.8 s** |
| pieces in memory | **14–15 (~15 MB)**, however far you walk |
| a walk from town to the Mill Bridge to Frost Ridge | 42 pieces loaded, ~2.5 MB fetched |
| one piece | 230–390 ms to fetch and decode |
| pop-ins | **0**, at a brisk walk |
| the worker | followed the player across the whole island |

**One bug it found, fixed for every zone.** On the frame a zone change lands,
the camera was clamped to the *previous* zone's size. That pinned it in the
old map's far corner, and it slid in over ~15 frames.

- On a 1024 px spoke that is a flick nobody noticed.
- On the island it swept across the map and loaded 17 pieces for nothing.
- `BroTown.jsx` now clamps to the zone you are in.

**Removing the trial** once it has served:

- delete `public/maps/world-trial-v1/`, `src/game/worldTrial.js`,
  `src/rendering/chunkGround.js` and the lines tagged v2.3.2932 that call
  them;
- keep `chunkGround.js` if the real world is going to stream the same way,
  which is the plan.

---

## What the game needs afterwards (phases 4–6)

From the feasibility study, in order.

**Chunk export.**
- Cut the fused world into 512-game-px WebP chunks with a manifest.
- Ground art resident at one time is about 10–25 MB whatever the world's
  size.

**Client streaming.**
- One world coordinate space, with a region derived from position. That
  replaces `S.currentZone`, which is used 313 times across 44 files.
- Chunks prefetched ahead of the camera and freed behind it.
- The preloading rule needs a new clause from the owner: *load the next area as
  you approach it, so it is ready before it is on screen, with a brief hold if
  it is not.*

**Monster art is the memory risk, not the map.**
- iPhone Safari kills the tab at about 250 MB of textures, and the game sits
  at about 165–185 MB.
- Where two elements meet, both sets of monsters must be loaded. On the
  Wheel that is only at the spokes' bases and on the passes, which have
  their own small two-element sets.

**Server.**
- The whole world already runs in one room with about 20× CPU headroom.
- Updates would be scoped by distance instead of by zone, and each world
  split into area servers along the Wheel's spokes
  ([WORLD-ARCHITECTURE.md §11](WORLD-ARCHITECTURE.md#11-what-it-costs-and-how-many-one-world-holds)).
- About 370 zone-keyed sites become region-plus-distance checks.
- There would be a one-time "please refresh" cutover.

**Walls from the blueprint.**
- Server-side collision and simple monster pathing come first. Climbing strips
  and jumpable ledges come after.
- Monsters walk through everything today.

Dungeons, the farm and building interiors keep their doors and loading screens
([WORLD-BIBLE.md §8](WORLD-BIBLE.md#8-farms-dungeons-and-interiors)).

---

## Decisions for the owner

1. ~~**Island size.**~~ Decided in v2.3.2936: **the Wheel**, about 490 zones
   of land. Growing later is safe (longer spokes, islands), and shrinking is
   not.
2. ~~**Scale.**~~ Decided in v2.3.2935–2936: one art px is one pixel of the
   HD pixel art, **1.5 game px**, and the town keeps the size the owner
   likes.
3. **One daylight.** Everything is made in day, with mood from the game's
   atmosphere layer. This is the plan's assumption.
4. **The style key.** Make it and approve it before any other picture.
5. **Brotown's plot table, the premise, and the Wheel's names.** See
   [WORLD-BIBLE.md §10](WORLD-BIBLE.md#10-decisions-for-the-owner).
6. **Where the pictures live.** Today that is the owner's device plus
   downloaded zips. With swatches there are only about 45 of them, so
   committing them to the repo (uploaded on GitHub's website) is the obvious
   home.
