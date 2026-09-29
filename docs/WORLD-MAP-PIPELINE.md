# One Seamless World — the grid, the prompts and the fuser (v2.3.2931)

**Status:** Phase 1 shipped: the **World Builder** page
(`public/tools/world/`, live at `/tools/world/` on the site). No game code
changes yet. The world plan in `public/tools/world/plan.js` is the source of
truth for the map's layout.

> Owner, 2026-09-28: *"I'm wanting one seamless map and to have chatGPT draw it
> into squares. I'll need to fuse them together but have some type of grid and
> prompt system to construct the entire thing."*

This follows a feasibility study done the same day. It found the zones cannot be joined as they are.
Every zone is a self-contained painting with its own framing and its own sun:
frost is a peninsula, tidal an island, town a cliff-ringed plateau, ember and the
dunes fade to horizons. A seamless world therefore needs **new continuous art**,
and art is the long pole. This document covers how that art gets made. The
engine work that follows is at the end.

---

## The phases

| # | Phase | Who | State |
|---|---|---|---|
| 1 | **Tooling**: plan, blueprint, prompts, fuser, World Builder page | sessions | **shipped v2.3.2931** |
| 2 | **Test strip**: paint ~5 squares below the town (F8, G8, F9, …), judge the joins on a phone, tune prompts | owner | next |
| 3 | **Paint the world**: work outward from the town until every land square is done | owner | — |
| 4 | **Export for the game**: cut the fused world into streaming chunks under `public/maps/world/` | sessions | — |
| 5 | **Engine**: chunk streaming, region from position, server interest by region (see "What the game needs") | sessions | — |
| 6 | **Walls, climbing, jumping** from the blueprint's terrain classes | sessions | — |

Phase 2 exists so the prompt and the fuser can be tuned on real ChatGPT output
before anyone paints 126 squares with them.

---

## The owner's loop (per square)

1. Open **`/tools/world/`** on the site. The map shows the plan with the grid
   over it. Squares outlined in gold are **ready**: their neighbours (or the
   town) are finished, so ChatGPT will see real edges. **Next square →**
   picks the best one.
2. **Save the template picture.** It shows the square's piece of the plan in
   flat colours, with the finished art of its neighbours already painted along
   its edges.
3. **Copy the prompt.**
4. In ChatGPT, start a **new chat**, attach the template, paste the prompt and
   send. Save the picture it makes. If it added a border, text or a horizon,
   ask again. That is cheaper than fixing a seam.
5. **Bring the picture back** (choose it, drop it, or paste it). The page lines
   it up, matches its colour and cuts the seam. It then shows the join with a
   grade: *Seamless*, *Joins well*, *May show* or *Try again*.
6. **Keep it** or **Try again**.

Work is kept in the browser on that device. **Download backup** gives a `.zip`
of every ChatGPT picture. **Restore backup** rebuilds the whole world from it
on any device. The page asks for a backup every 5 squares. iPhone Safari may
reload the tab while you are in the ChatGPT app; the page reopens the square
you were on.

---

## How it works

### The grid

- The map is **12 × 12 squares**, named like a spreadsheet. A1 is the
  north-west corner, L12 the south-east.
- Each square is **1024 px** of art, and each ChatGPT picture is resampled to
  that. ChatGPT returns 1024 or 1254 px squares depending on the day.
- Squares **overlap by 256 px (25%)** on every side, so origins sit 768 px
  apart. The overlap is where the seam goes. It is also all the model ever sees
  of a neighbour, which is why it is generous.
- World size: 12 × 768 + 256 = **9472 art px**. At **1.3 game px per art px**
  (exactly how `town_v17` is drawn today), that is **12,314 game px**, about
  **82 s** to walk across. Every current zone put together is about 25 s.

| Grid | Squares to paint | Walk across |
|---|---|---|
| 8 × 8 | 60 | ~55 s |
| 10 × 10 | 90 | ~69 s |
| **12 × 12** (the plan) | **126** (+18 optional open-sea) | **~82 s** |
| 14 × 14 | 168 | ~95 s |

**The grid size, the scale, the seed and the region layout must be decided
before painting starts.** They fix where every square sits. Changing them
afterwards moves squares out from under the art already painted for them. The
builder detects a changed plan (`planHash`) and says so, but it cannot repaint
anything. The descriptive text (region descriptions, the style bible) is safe
to change at any time.

### The town is an anchor

- `town_v17` is not regenerated. It sits in the middle of the world at its
  current size, and every square grows outward from it.
- Its top ~140 px are trimmed off because they contain painted sky.
- It fades into the squares around it over 56 px.
- Squares next to it see its edges in their template and are asked to continue
  them. The fuser writes those squares *under* the painting, and the painting's
  own soft edge makes that join.
- Every trail starts at the foot of its stairs, the town's only way down.

### The blueprint (`core/layout.js`)

- A colour-coded plan of the whole world: one cell per 8 art px
  (1184 × 1184 cells). Each cell holds a terrain **class** (ground, trail,
  thick trees/rocks, water, sea, cliff, lava, landmark) and a **region**.
- Built deterministically from the plan's seed, so every device builds the
  same world. It avoids `Math.sin/cos/pow`, which may differ in the last bits
  between Chrome and Safari.
- **Layout:**
  - An island with sea all round.
  - The eight regions where the World View painting has them: frost NW, ember
    N, dunes NE, hollows E, foundry SE, sea caves S, poison forest SW, wilds W.
  - The Starting Meadow as a ring round the town, and a belt of forest hugging
    the town's cliffs.
  - Trails from the stairs to a landmark in each region, merged into one
    network so shared stretches are drawn once.
  - Each region's ponds, tree clumps, cliffs and lava.
- **Job 1, today: the sketch in every template.**
  - It keeps trails, rivers and coasts continuous across squares before
    anything is painted. The main source of seams in tiled AI art is two
    squares disagreeing about *where* things are.
  - Outlines are smoothed, so the model is not shown 8 px stair-steps to copy.
- **Job 2, later: the game's collision map.**
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

Each prompt is built from three things only:

1. **The style bible** (`plan.style`, `plan.never`), identical for every
   square:
   - a steep three-quarter top-down view with no horizon and no perspective;
   - daylight from the upper left, with shadows to the lower right;
   - painterly detail matching the finished edges;
   - the scale: a person ≈ 90 px, a tree ≈ a person;
   - never text, borders, vignettes, sky, people or monsters.
2. **What the blueprint puts in the square:**
   - its regions and where they sit;
   - a legend of only the colours this sketch shows, each described in that
     region's terms (frost water is "a frozen lake …", poison-forest water is
     "a glowing acid-green poison pool …");
   - landmarks, and which edges the trail leaves by.
3. **What is already painted:** which edges are finished neighbours, and
   whether the town is in the square.

Consistency across a hundred generations comes from the style bible and the real
neighbour pixels in each template. It never relies on ChatGPT remembering earlier
squares, which it cannot be trusted to do. A new chat per square is fine.

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

- **the project record:** squares, order, grades;
- **every ChatGPT picture as uploaded:** these are the real asset;
- **the fused world** in 512 px PNG chunks;
- **the overview picture.**

A backup `.zip` holds the pictures and the order. Restoring re-fuses them in
order and gives byte-identical results, which the browser test checks. **Redo**
removes a square and re-fuses the world without it. It then lists the squares
painted after it that touched it, because they were painted to match it.

---

## Tests

- `node tools/world/test-world-core.mjs`: 31 zero-dependency checks.
  - Grid maths; blueprint determinism and shape (sea corners, the town in the
    middle, every region on land, a trail into every landmark, the 126/18
    count); prompt contents.
  - Max-flow against brute force on 600 random grids.
  - Fusing 9 damaged squares on a procedural painting (shift and zoom undone
    to under 1 px, every join great or ok); the "ignored template" case; the
    border constraint; the zip round trip.
- `node tools/qa/world-page.mjs`: 28 checks in real Chromium against a local
  server over `public/`.
  - The plan, the suggestions and the first template (with the town in it).
  - Three squares fused through the real upload button, from fake ChatGPT
    pictures cut from a known "true" world (the meadow painting tiled round
    the town) and damaged with zoom, shift, colour cast and noise. They match
    the truth at 30–32 dB after a colour fit.
  - An unrelated picture graded "bad"; a non-square picture centre-cropped.
  - Reload persistence; the square you were on reopening; Redo.
  - A backup restored into a fresh browser profile with byte-identical pixels.
  - Screenshots with `WORLD_SHOTS=<dir>`.

Neither is on the CI path, following the owner's 2026-07-16 directive. Run them
when touching `public/tools/world/`.

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
- Where two regions meet, both regions' monsters must be loaded. Keep
  neutral land between themed regions, and never let four regions meet.

**Server.**
- The whole world already runs in one room with about 20× CPU headroom.
- Updates would be scoped by region and its neighbours instead of by zone.
- About 370 zone-keyed sites become region-plus-distance checks.
- There would be a one-time "please refresh" cutover.

**Walls from the blueprint.**
- Server-side collision and simple monster pathing come first. Climbing strips
  and jumpable ledges come after.
- Monsters walk through everything today.

Dungeons, the farm and building interiors keep their doors and loading screens.

---

## Decisions for the owner

1. **Grid size**: 12 × 12 (126 squares) is the default. Use the table above.
   Decide before the test strip is kept.
2. **Scale**: 1.3 game px per art px matches the town. Matching the sharper
   spokes (0.82) would need 2.5× the squares.
3. **One daylight**: every region painted in day, with mood from the game's
   atmosphere layer. This is the plan's assumption.
4. **Keeping the town painting** as the anchor, as the plan assumes.
5. **Where backups live**: the owner's device plus downloaded zips today.
   Committing the pictures to the repo (about 0.4–1 MB each) is the obvious
   next step once the test strip is approved.
