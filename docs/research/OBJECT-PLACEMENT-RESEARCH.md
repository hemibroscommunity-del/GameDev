> **Research notes, 2026-10-03 (v2.3.2999).** Written overnight for the
> object placement study (`docs/OBJECT-PLACEMENT-STUDY.md`, the owner: "studying
> object placement in the game's maps and what a good distribution is"). Kept as
> written. Each claim is tagged: [S] a search result (with its URL), [G] a real
> game data file, [K] knowledge not re-checked online, [D] derived from our code
> or a small simulation. Numbers marked [K] are reasoned starting points, not
> rules. Paths under `scratchpad/` were the research session's and are not kept.
> Code is the source of truth where they differ.

# Object placement research — what a good distribution is (BroTown / the Wheel)

Status: COMPLETE (2026-10-03). Sections 0-7 written; checkpointed as written.
Started: 2026-10-03

Scope: 2D top-down (3/4) pixel-art ARPG on iPhone. Procedural placement in
public/tools/world/core/placing.js (jittered lattice per layer + clump mask).
Research only — no repository files changed.


## Executive summary

1. **Our pattern, by the numbers [D].** Inside the plan's clumps the big
   layer is a regular jittered lattice (Clark-Evans R ~1.42; natural
   stands measure ~0.75-1.25), yet trunks can stand 35 px apart under
   ~270 px crowns. Everywhere a layer is thinned hard (open ground, all
   mid/small layers), the per-cell coin flip makes it pure random
   (R ~1.0-1.1): about half the objects have an oddly close twin. That
   reads as "clumpy sprinkle", and the jitter can't fix it.
2. **The scales are wrong [D].** A plan "clump" is 33-143 px in radius,
   about one tree crown. So there are no woods, only 1-5-tree
   clusters spread evenly. Open-ground density varies only ~3:1, at
   one screen's wavelength. Shipped games run 10:1 (Don't Starve) to
   200:1 (Minecraft) between woods and open land [G].
3. **The micro scale is inverted [D].** Small and mid things are pushed
   AWAY from big ones (`gapBig`) and are hardly denser in clumps. Natural
   scenes (and our own art briefs) put undergrowth AT the roots and at
   wood edges.
4. **Gameplay gaps [D].** Nothing keeps tall pictures off roads' south
   sides or out of the monster spawn bands. Those bands are at ordinary
   land density, and props stop arrows. There is no canopy fade, so a
   tree south of you or of a monster hides it.
5. **Top fixes (section 6).** All stay position-only and hash-based:
   (1) Matern-II hash-priority hard core with r ~0.4 x local spacing,
   which gives R 1.1-1.3 and no twins (simulated); (2) groves grown
   around the clumps, plus a wood/glade mask at 2-5 screens with
   >= 10:1 contrast; (3) 3/4-view picture-cover test for roads and
   camps, plus camp clearings; then satellites/understorey, canopy fade
   in the renderer, variety rules, set pieces every 1-2 screens, and
   ecotones.
6. **Measure (section 5.2).** 21 metrics with target bands: R per layer
   and scale, twins, g(r), objects per screen, glade share, canopy cover,
   blocked %, pockets, ambiguous 20-80 px gaps, camp LOS, overdraw, atlas
   pages per screen, POI spacing.

## 0. Sources & method

- Network (2026-10-03): the agent proxy BLOCKS direct page fetches of most
  sites (redblobgames.com, cs.ubc.ca, wikipedia, minecraft.wiki,
  rimworldwiki all refused). The WebSearch tool works (returns search-engine
  summaries with URLs), and raw.githubusercontent.com is reachable (used for
  game data files where a public mirror exists). So: facts marked [S] come
  from search results (URL given), [G] from a raw data file fetched from
  GitHub (URL given), and [K] are from my own knowledge (no page could be
  opened to re-check) -- treat [K] numbers as well-known but unverified here.
- Derived numbers about OUR generator are computed from the code (section 1)
  and marked [D].
- The working tree held another session's uncommitted v2.3.2997 edits while
  this was written (placing.js town `yard` props, plan.js BUILDINGS 1.15,
  worldViewport.js zoom-out). None touch placing.js section 5 "nature" or
  LAYERS/LANDS, so section 1 holds. The 619 x 1280 view is the zoomed-out
  one.

## 1. What our generator does today (from placing.js, read 2026-10-03)

Read: `public/tools/world/core/placing.js` (v2.3.2981), `core/layout.js`
(pass 2, feature lattice + `stampBlob`), `plan.js` (region `features`),
`tools/objects/catalog.js` (sizes). Numbers below are DERIVED from the code,
not measured on a run.

**Two-level structure.**
- *Macro/meso mask = the plan's "obstacle" clumps* (layout.js pass 2): one
  candidate per L x L art-px lattice cell, L = sqrt(1e6 / density), jittered
  over the WHOLE cell (`hash2` in [0,1)), each a noisy disc (`stampBlob`,
  edge noise 0.32 x valueNoise) of radius r art px. 1 art px = 1.5 game px.

| land | density | L (game px) | blob r (game px) | rough cover |
|---|---|---|---|---|
| commons | 5 | 671 | 33-75 | ~2% |
| frost st.1-3 | 20 | 335 | 39-117 | ~18% |
| ember | 13 | 416 | 39-105 | ~10% |
| sky (dunes) | 10 | 474 | 51-143 | ~14% |
| verdant | 25 | 300 | 51-129 | ~30% |

  ("rough cover" = density x E[pi r^2], ignoring overlap/exclusions.)
  **Key observation: a "clump" is only 33-143 game px in radius, i.e. ONE
  big tree's canopy across (an oak is ~270 x 300 px, a pine ~190 x 340, a
  jungle tree ~360 x 400).** With the big lattice at 116 px, a clump holds
  ~1-5 big objects. So the "groves" are really tree-clusters of a handful,
  and there is no larger "forest vs meadow" scale except the clump DENSITY
  per land and the weak drift noise below.
- *Object scatter = 3 jittered lattices* (placing.js section 5 "nature"):

| layer | step | candidates /1e6 px^2 | p(in clump) | p(open) | gapBig | foot r noted |
|---|---|---|---|---|---|---|
| big | 116 | 74 | 0.9 | 0.05 | 0 | 26 |
| mid | 92 | 118 | 0.18 | 0.08 | 46 | 14 |
| small | 68 | 216 | 0.10 | 0.11 | 34 | 8 |

  Per-land `dense` multiplies chance (clump: x sqrt(dense), capped at 1;
  open: x dense). Open-ground chance is further x (0.25 + 1.5 drift^2),
  drift = 0.5 + 0.5 fbm(x/1400, y/1400, 2 octaves) -- value-noise fbm
  concentrates near 0, so drift is mostly 0.25-0.75 and the factor
  ~0.35-1.1: **only a ~3:1 contrast between "drifts" and "clearings"**, at a
  ~1,400 px wavelength (about one screen height).
- Jitter range 0.15-0.85 of the cell: two neighbours can be as close as
  0.3 x step in one axis and 0 in the other -> **min spacing ~35 px (big),
  ~28 px (mid), ~20 px (small); no minimum-distance rule WITHIN a layer.**
  Big trees ~270 px wide at ~35-116 px spacing in clumps = canopies
  overlapping 2-8x (the verdant "sea of canopy" the code comment mentions).
  The lattice also keeps a faint row/column regularity (offset range 0.7 of
  the cell; a full-cell jitter would remove it but allow coincident points).
- Cross-layer rule only: mid keeps 46 + 26 px from a big foot, small keeps
  34 + (8/14/26) from any earlier foot. Order big -> mid -> small; decided
  in a fixed order, so still position-only (deterministic).
- Kind choice: per-land weighted list, weights per stage (1-4); flip 50%
  unless NO_FLIP; piece (variant) by hash. **No neighbour rule**: two
  identical pieces with the same flip may stand side by side.
- Exclusions: never on road/street/plaza/lot/rail/bridge/water/river/ocean/
  lava/cliff/landmark/gate/boardwalk/anchor; `clear` distance (city-block,
  cells of 24 px): big >= 2 cells (48 px), mid/small >= 1 (24 px). Big
  things kept off the town's cells (picture test). Oases ring pools with
  palms (`OASIS`), shore kinds x4 near water (<= 3 cells), x0.3 away + 92%
  culled.
- **Monster camps:** nothing in placing.js knows where the monsters stand.
  (`anchor` in KEEP_CLEAR is the town hub's anchor rectangle, not a camp;
  the plan's waystation `camps` are `places` kept clear in layout.js.) The
  first-stage spawn bands (`server/src/wheelspawns.js`) are BAKED AFTER
  placing, from the gaps between footprints (`bake-wheel-spawns.mjs`,
  `clearObject: 24` px), so camps sit at ordinary land density -- see 3.2.
- Footprints (`FOOT`): trees are trunk-only (w 0.12-0.3 of picture width,
  d 14-24 px) -- you walk "behind" the canopy; rocks/bushes 0.7-0.85 of
  width x 0.3-0.45 of height; flowers/ferns/shells/tumbleweed none.

**Expected per-screen counts on open ground, dense = 1** (camera 619 x 1280
= 0.79e6 px^2, drift factor ~0.65, before exclusions): big ~1.9, mid ~4.9,
small ~12 -> ~19 per screen; inside a clump field the big layer jumps to
~0.9 per 13,456 px^2. ~12,800 objects over the land (world 43,008^2 =
1.85e9 px^2, much of it sea) is on the order of 10-15 per screen averaged
over land -- to be MEASURED (see section 5).

## 2. Principles of natural-looking placement

### 2.1 The point pattern itself (the micro scale)

Four families, from "worst" to "best" for scattered props:

1. **White noise / complete spatial randomness (CSR)** -- every point
   independent (Minecraft's `in_square`, our open-ground coin flip).
   Clark-Evans R = 1. It reads as CLUMPY with odd empty holes and
   "twins" standing almost on top of each other; about half of all points
   have a neighbour closer than half the average spacing (sim, 5.0). People
   systematically see true randomness as clustered (the clustering
   illusion) [K]. CSR is fine for tiny ground clutter seen as texture
   (flowers, pebbles) and bad for anything with a silhouette.
2. **Jittered (stratified) grid** -- one point per lattice cell, offset
   inside it (ours; Don't Starve's per-tile fill with +-1/4 tile jitter [G];
   Minecraft's pre-1.18 dark forest used a 4 x 4 jittered grid per chunk
   [K]). Cheap, deterministic, perfectly local. Artifacts:
   - *Alignment*: with jitter range j < 1 cell (ours: 0.7), rows and
     columns survive, especially along screen axes and with many identical
     objects; the eye finds them on a phone screen where 5-10 trees share a
     row. Red Blob Games' comparison of point sets calls the jittered grid
     "easy to implement but the output isn't great" [S: redblobgames.com/x/1830-jittered-grid].
   - *Near-collisions*: the closest two points can be (1 - j) cells apart
     (ours 0.3 step = 35 px for 116-px big trees); widening j to 1 removes
     alignment but allows coincident points (5th percentile NN 0.27 step).
   - *Thinning destroys it*: keeping each cell with probability p << 1
     (our open ground p ~ 0.03-0.11, mid/small in clumps 0.1-0.18) leaves
     an almost CSR pattern (R 1.03-1.09) -- the lattice's evenness is gone,
     the twins are back (sim, 5.0).
3. **Blue noise / Poisson-disk** -- random, but no two points closer than
   r. Bridson (SIGGRAPH 2007 sketch "Fast Poisson Disk Sampling in
   Arbitrary Dimensions", O(N)): a background grid of cell r/sqrt(2) (one
   sample per cell), an active list, and k (= 30 in the paper) candidates
   drawn uniformly from the annulus [r, 2r] around a random active point;
   a point with no valid candidate after k tries is retired [S: Bridson PDF
   via search summary; numbers K]. Output density ~0.62 points per r^2,
   R ~ 1.7 (sim). Poisson-disk mimics primate retinal cones and tree
   canopies [S]. Order-dependent (the active list), so not directly usable
   in a "position-only" generator; the usual work-arounds are tiles
   (Lagae & Dutre's Poisson-disk tiles, Kopf et al. 2006 "Recursive Wang
   Tiles for Real-Time Blue Noise" -- both surveyed in Lagae & Dutre 2008,
   "A comparison of methods for generating Poisson disk distributions")
   or phase-grids (Wei 2008, "Parallel Poisson disk sampling") [S].
   **Mitchell's best-candidate** (1991): add points one at a time, each the
   farthest of m x n random candidates from those already placed. Slower,
   but *progressive*: every prefix of the sequence is itself well spread,
   so a precomputed tile can serve any density by taking the first N(x)
   points (density mask by rank) [K].
4. **Matern hard-core type II ("priority thinning")** -- give every
   candidate a random mark; keep it iff no other candidate within r has a
   smaller (higher-priority) mark. Retained intensity from a Poisson
   parent of intensity lambda_p: lambda = (1 - exp(-lambda_p pi r^2)) /
   (pi r^2) [S: arXiv 1209.2566 / emergentmind summary]. **This is the
   deterministic, order-free, purely local Poisson-disk** -- Red Blob
   Games' tree placement is exactly this: hash a "blue noise" value per
   cell and put a tree where that value beats every cell within radius R,
   (varying R by biome to vary density is the natural extension; the
   local-maximum rule is [S: redblobgames.com/maps/terrain-from-noise],
   the biome-varying R [K]). Our sim: on 1-per-cell candidates with r = 1 step
   it keeps ~36% of them, R ~ 1.48, minimum distance exactly r, zero
   near-collisions. Saturates at ~1/(pi r^2) (lower than Bridson's 0.62/r^2)
   so to reach a given density pick r ~ 0.55-0.6 / sqrt(target density)
   and offer >= 2-4 candidates per r^2. Multi-size version: per-pair
   exclusion r_ab = (r_a + r_b)/2 or a class matrix ("multi-class blue
   noise", Wei, SIGGRAPH 2010 [S]).

**Choosing r from the art.** For trunk/pillar objects, r is set by the
CANOPY you want to see, not the trunk: r ~ 0.5-0.8 x canopy width gives
an open woodland where crowns touch or overlap a little; r ~ 0.35-0.5 x
canopy width gives a closed canopy; r >= 1.2 x canopy width gives
parkland/savanna [K, consistent with the game data below]. For
rocks/bushes (whole-body footprint), r ~ 1.0-1.5 x picture width so they
never touch unless deliberately grouped. Reference points in shipped
games, expressed in canopy widths of spacing:
- Minecraft trees per 16 x 16 chunk [G: misode/mcmeta placed_feature]:
  plains 0.05, snowy plains 0.1, savanna 1.1, sparse jungle 2.1, swamp
  2.1, windswept forest 3.1, badlands 5.1, flower forest 6.1, forest /
  birch / taiga / old-growth pine / grove / cherry 10.1, mangrove 25,
  jungle 50.1, dark forest 16 (vegetation). With an oak crown ~5 blocks,
  "forest" = one try per 25 blocks^2 ~ 1 crown width apart (many fail on
  occupancy), savanna ~3 crown widths, plains ~14. **Forest vs plains is
  a 200 : 1 density contrast; forest vs savanna 10 : 1.**
- Don't Starve Together rooms [G: taichunmin/dont-starve-together-game-
  scripts, map/rooms/forest/*.lua, map/graphnode.lua]: each 4-unit tile
  is filled with probability `distributepercent` -- DeepForest 0.8,
  BGForest 0.6, Forest 0.3, BGGrass 0.275, Plain 0.2, BGSavanna 0.1,
  Rocky 0.1 -- then a weighted pick (Forest: trees weight 6 vs saplings
  0.8, grass 0.05, rock 0.05, berry bushes 0.045 -> ~86% trees; BGGrass:
  trees 0.3 of ~1.3 -> ~23%, the rest flowers/grass/saplings), placed at
  the tile point +-1 unit. Collision radii [G]: evergreen trunk 0.25,
  player 0.5, boulder 1.0, berry bush 0.1 -- trunks are HALF a player
  wide on a 4-unit (4 player widths) grid, so even the deepest forest
  never pinches the player. Tree-tile share: DeepForest ~0.7, BGForest
  ~0.5, Forest ~0.26, grass ~0.06 -> **~12 : 1 forest-to-meadow contrast**.

### 2.2 Clustered patterns for groves (the meso scale)

Real vegetation is clustered at the 10-100 m scale (seed dispersal,
soil, water) and regular at the 1-5 m scale (competition) [S:
PMC9508254; forestry Clark-Evans studies]. The standard models are the
Neyman-Scott family [S: spatstat rMatClust docs; arXiv 1604.06643]:
- parents (grove centres) Poisson with intensity kappa;
- each has Poisson(mu) offspring, placed uniformly in a disc of radius R
  (Matern cluster) or Gaussian with s.d. sigma (Thomas);
- ecological reading: kappa = how many groves, mu = trees per grove,
  R/sigma = grove size [S: PMC9508254].
Add a hard core (type-II thinning) on top so trunks never collide -- the
sim's "Thomas + Matern-II" row is the textbook signature: R ~ 0.75
overall (clustered), yet a guaranteed minimum spacing within groves.

**Parameter guidance for a top-down game** [K, reasoned from the above and
the camera]: grove radius R ~ 1.5-3 canopy widths (a grove of 5-20 trees
that fills 1/4-1/2 of a screen width); parent spacing ~ 3-6 grove
diameters in "woodland" land, 8-15 in "open" land; mu 5-15 trees; within
a grove a hard core of ~0.4-0.6 canopy widths. A grove should be big
enough to read as a PLACE (a "wood") and to be walked around in a
couple of seconds; on our 619 x 1280 px view that is ~400-900 px
across, i.e. 2-4 oak widths.

**What we have instead [D]:** the plan's obstacle "clumps" are 33-143 px
in radius (section 1) -- a single canopy -- so each clump holds 1-5 big
objects and there is no grove scale at all, only "isolated tree
clusters" in a fairly even scatter of clumps (clumps themselves sit on a
hashed L x L lattice with full-cell jitter -> R ~ 1.26 at the clump
scale: slightly REGULAR, i.e. the clumps are evenly spread, which is
the opposite of natural grove structure).

### 2.3 Density masks: forests vs meadows (the macro scale)

- A low-frequency noise field (fbm, often domain-warped) is thresholded
  or remapped into a density in [0, 1]; density then drives either the
  keep chance (white-noise thinning -- clumpy) or the Poisson radius
  r(x) = r0 / sqrt(density(x)) (blue noise with varying density --
  smooth) [K; Red Blob varies R by biome, S]. Minecraft uses exactly this
  for grass: `noise_threshold_count` 5 tries below noise level -0.8, 10
  above [G].
- Use a remap with a SOFT band, e.g. density = smoothstep(t - w, t + w,
  noise), with w ~ 0.1-0.2 of the noise range: hard thresholds give
  blobs with crisp, artificial edges; soft bands give forest edges that
  thin out over a screen or so (natural "ecotone" / forest edge).
- Contrast is the point: shipped games run 10:1 to 200:1 between their
  densest and sparsest vegetation (2.1). **Our open-ground drift factor
  spans only ~3:1 (0.35-1.1) [D]**, so the open land reads as one even
  sprinkle, and the clump-vs-open contrast (~27:1 for big things [D]) is
  applied at the wrong scale (inside 1-canopy blobs).
- Frequencies: macro mask wavelength ~2-5 screens (2,500-6,000 px here)
  so a player walks through alternating wood / glade / wood every 10-30 s;
  a meso mask (glades inside woods, copses in meadows) at ~0.5-1 screen.
  Our drift is at 1,400 px (one screen height) only.

### 2.4 Multi-scale structure: macro / meso / micro + satellites

A widely used structure (procedural vegetation tools, Horizon Zero
Dawn's GPU placement, Unreal PCG / Houdini scatter graphs) [K]:
1. **Macro** -- biome / land / stage masks (ours: lands, stages 1-4).
2. **Meso** -- groves, thickets, rock fields, clearings, paths' verges.
3. **Micro** -- each big object's "satellites": undergrowth, roots,
   fallen branches, pebbles, ferns, mushrooms in a ring at its base
   (between ~0.4 and ~1.5 footprint radii), denser at grove EDGES (the
   "edge effect"), sparser deep inside and in the open.
Environment art practice names the same hierarchy as primary (big
shapes), secondary (medium props) and tertiary (clutter) and works big
to small [S: 80.lv, Fredrik Maribo].
**We do the opposite at the micro scale [D]:** mid and small things are
placed independently of big ones and are *pushed away* from big feet
(`gapBig` 46 / 34 px), and their in-clump chance (0.18 / 0.10) is barely
above open ground (0.08 / 0.11 -- for small things it is LOWER in
clumps). The plan's own art briefs ask for the satellite look ("ferns and
mossy boulders at their roots", "glowing crystals at their feet").

### 2.5 Size hierarchy

- Natural, uneven-aged stands have a "reverse-J" size distribution: each
  smaller size class has q times as many members (de Liocourt's ratio;
  q ~ 1.3-2 per diameter class in forestry) [K].
- For scenes, a workable rule is that each class covers comparable
  ground area, so counts scale ~ 1 / footprint area: with pictures of
  ~300 / ~100 / ~45 px (our big / mid / small), counts of roughly
  **1 : 3-5 : 8-20** per area [K, heuristic]. Fewer big things than that
  and the land looks like "lawn with props"; more and it becomes a wall.
- Our candidate densities are 74 : 118 : 216 per 1e6 px^2 (1 : 1.6 : 2.9)
  [D]; in clumps the kept counts before the cross-layer gap are
  ~67 : 21 : 22 per 1e6 px^2, and `gapBig` then removes roughly 2/3 of
  the mid and 1/2 of the small ones there (each big foot clears a 72 /
  60 px disc, ~1.1 / 0.8 of the clump area at that tree density) ->
  **~67 : 7 : 10 inside clumps**; on open ground ~2.4 : 6 : 15 (1 : 2.5 :
  6). Clumps are thus all-big (a wall of trunks and crowns with almost no
  understorey); open ground is close to the rule.

### 2.6 Variety rules

- **No identical neighbours**: two copies of the same picture (kind +
  piece + flip) within ~2-3 object widths are what the eye catches as
  "copy-paste". Fix by choosing the variant from a hash with rejection of
  the neighbour's variant (deterministic: the lower-priority point picks
  the next variant), or by a Wang-tile style 2-colouring of the lattice
  [K]. Track "repeat rate" (section 5).
- **Flips** for symmetric subjects (already done, 50%). Lighting
  direction must survive the flip (our art law forbids baked shadows, so
  flips are safe).
- **Scale jitter**: common in 3D (+-10-20%); in HD pixel art at a fixed 2
  px per game px it RESAMPLES pixels and breaks the art law -- prefer
  more variants (2-4 per kind) and flips [K + repo art law].
- **Species mix**: a dominant kind 60-80% plus 1-3 secondaries reads as a
  coherent wood (DST Forest is ~86% trees, with saplings / grass /
  rocks / berries as the rest [G]); a 50/50 mix reads as a garden.
  Secondaries should themselves be clustered (a birch stand inside the
  pines), not salt-and-peppered.
- **Ecotones**: across a land/stage border, ramp the two lists'
  weights over ~1-2 screens (blend by distance to the border + noise)
  rather than switching at the line -- the ground already does this for
  its swatches (`MIX`, WORLD-MAP-PIPELINE "Alike grounds mix"); objects
  should follow the same mask so a pine stand never stops at a straight
  line [K + repo].

## 3. Gameplay principles for a top-down (3/4) action game

Our numbers used below [D, from the code]: player feet collider 20 x 20
px (`hs = 10`, BroTown.jsx movement; footprints are axis-aligned boxes,
x then y moves, so you slide along flat faces but catch on corners);
the bro is ~106 px tall, visually ~45-60 px wide (estimate); base `SPEED`
2.5 px/frame = 150 px/s (the brief says ~200-300 with bonuses); view
~619 x 1280 px portrait, so a screen is ~2-4 s of walking across and
~4-8 s top to bottom. Props block your feet AND attacks: arrows, bolts
and swings stop at footprints (`worldProps.attackBlockPoint`,
`propSwingContact`; the worker has its own copy).

### 3.1 Navigation

- **Gaps are binary: clearly open or clearly shut.** A passage should be
  either >= ~2 visual body widths (>= ~100-120 px here; 3D practice sizes
  passages from the character capsule plus margins on both sides because
  players never walk dead centre [S: medium/my-games "cinematic
  techniques", Corey Delorenzo metrics]) or visibly closed (pictures
  touching, footprints overlapping, < the 20 px collider). The bad band is
  ~20-80 px: collision lets you through but the art says wall (or the
  reverse), so the player either never tries it or snags in it.
  Don't Starve's numbers show the safe pattern: trunk radius 0.25 vs
  player 0.5 on a 4-unit tile grid, so neighbouring trees leave 2-3
  player widths between trunks even in DeepForest [G].
- **Footprints must match what you see.** Trunk-only footprints under
  big crowns (ours: oak w 0.15 of picture, d 16 px) are right in 3/4
  view -- you walk "behind" the crown -- but only if the TRUNK is visible.
  Where crowns overlap 2-8x (our clumps, section 1), the trunks of the
  back trees are hidden under the front trees' crowns, so you bump into
  invisible posts. Either keep trunk spacing >= ~0.5 crown width (hard
  core, 2.1) or make crowns fade when the player is under/behind them.
- **No snag objects.** A small box (8-30 px) alone in open ground is a
  corner to catch on, not a meaningful obstacle. Either give it no
  footprint (walk-through clutter, as flowers/ferns/shells already are)
  or make it >= ~1 collider wide with round-ish corners. DST models every
  obstacle as a circle (`MakeObstaclePhysics(inst, r)`) [G], which slides
  the player round it; with boxes, prefer footprints that are wider than
  deep (ours are) and avoid two boxes forming a 20-40 px notch.
- **No pockets.** Flood-fill a walk grid at collider resolution (e.g. 8
  px cells, dilated by the 10 px half-collider) from the roads; every
  walkable cell should be reached, and enclosed pockets (< ~1 screen of
  area, or with an entrance < ~2 body widths) should be zero. This
  matters more now that a monster's GUST shoves you 48 px (v2.3.2996):
  a shove can put you behind a tree ring you cannot see out of.
- **Roads framed, not blocked.** Shipped worlds line roads with LOW,
  regular objects (lamps, fences) as leading lines -- WoW's Elwynn roads
  "lined with lampposts and fences teach new players where to travel
  without a single UI prompt" [S: medium "MMO world design", via Lynch].
  Keep big things one crown half-width back, low things at the verge.
  **3/4-view asymmetry [K, geometry]:** a picture rises NORTH of its
  foot. A tree standing 48 px SOUTH of an east-west road (our `clear: 2`
  cells for big things) draws its ~300 px crown straight over the road;
  the same tree north of the road covers nothing. So the keep-clear
  distance should be ~0.7-0.9 x picture height on the south side of a
  road / camp / landmark and only the footprint clearance on the north
  side (the oasis code already applies this idea: no palms on the near
  shore, `OASIS.open`).
- **Leading lines and breadcrumbs.** Small repeated things along a trail
  (stones, flowers, a fence run, telegraph poles by the railway) read as
  "this way"; a gap in a fence reads as "enter here" (our fences already
  leave every 6th panel out). Fable 2 replaced a minimap habit with an
  in-world breadcrumb trail [S]; our quest road is minimap-only since
  v2.3.2992, so in-world leading lines are the only on-ground guidance.

### 3.2 Combat spaces and monster camps

- Arena-style areas want one open centre plus a framed edge; too much
  cover "involves players in collisions and impedes movement" [S:
  medium/my-games top-down shooter level design]. Translate to an ARPG
  camp: an open core where melee can circle and ranged can see, framed by
  low/medium cover at the rim.
- **Where ours stand [D]:** each land's first-stage monsters stand in a
  band ~630 px deep (e.g. frost 3,245-3,879 px from the centre) and ~960
  px wide around the spoke's axis (`server/src/wheelspawns.js`), i.e. ~1.5
  screen widths. The bake only keeps 24 px from any footprint
  (`bake-wheel-spawns.mjs clearObject`); placing.js does NOT thin objects
  round the monsters (the plan's `anchor` class is the hub, not the
  camps). So the camps are as dense as any other ground, including
  in-clump tree walls.
- Targets [K, reasoned]: inside the spawn band's core keep big objects
  to <= ~1 per screen and NONE whose picture would cover a monster point
  (i.e. no tall thing within ~0.8 x its height SOUTH of a spawn point --
  depth sorting draws that crown over the monster); keep ranged sight
  lines: < ~10-15% of straight lines between random pairs of spawn
  points should hit a footprint (props stop arrows); ring the band with
  rocks/bushes at ~1-1.3 x its radius as the arena's frame.

### 3.3 Landmarks and orientation

- Lynch's five elements (paths, edges, districts, nodes, landmarks) are
  the standard wayfinding vocabulary in level design; "open areas with no
  landmarks make players feel lost without being able to articulate why"
  [S: medium "So You Want to Build an MMO 8/18", madesignwayfinding].
- The Witcher 3's world team tuned for "something interesting every ~40
  seconds" of travel -- a pack of deer, opponents, wandering NPCs [S:
  tweaktown; Uppsala thesis diva2:1569059]. One practitioner guide puts
  the sweet spot between major POIs at 60-120 s of travel [S:
  strayspark.studio]. BotW's "triangle rule" uses big / medium / small
  triangular forms to hide and reveal, and "gravity" -- smaller
  structures placed between towers to pull the player sideways [S:
  gamedeveloper.com, nintendolife, sourcegaming].
- **Translated to a top-down phone view [K, reasoned]:** there is no
  horizon, so a landmark only works while it is ON SCREEN (plus the
  minimap). At 150-300 px/s, 40 s = 6,000-12,000 px = 5-10 screen
  heights. So: a major landmark/POI every ~5-10 screens of travel; a
  minor "set piece" (a unique object group: a wrecked cart, a ring of
  stones, a giant dead tree, a campfire with crates) every ~1-2 screens
  (~5-10 s), so no screenful is "just scatter". Each spoke here is
  ~18,000 px long with one landmark and four camps [D, plan.js] -- one
  POI per ~3,700 px (~12-25 s): fine for majors, but placing.js has no
  minor set pieces at all.

### 3.4 Readability and negative space on a phone

- Gameplay first: Supergiant describes itself as "first and foremost a
  game design-led team" [S: MCV/DEVELOP]. A student team's 80.lv write-up
  of a Hades/PoE-inspired game sums the style up as "make the silhouette
  readable, don't add too many details but let them stand out" [S: 80.lv
  "Hades Machines"] -- a paraphrase of the genre's practice, not a
  Supergiant statement.
  Environment objects are the background: lower contrast and fewer hard
  details than characters, monsters and loot.
- **Negative space.** On a ~67 CSS px tall hero, a screen packed with
  300 px crowns leaves little ground to read hits, loot and telegraphs
  on. Working targets [K]: >= 55-65% of a combat screen's ground visibly
  open (no picture over it), >= 70-80% in camps; dense "woods" are fine
  as set pieces you walk around, not through.
- **Occlusion.** Standard fixes: fade the occluder (Diablo II fades a wall
  or tree intersecting the character [S: d2mods/Phrozen Keep]; Stardew
  Valley fades trees and buildings to ~0.4 alpha when you stand behind
  them [S: nexusmods "Custom Transparency" description]), a dithered or
  x-ray silhouette of the hero through occluders [S: Unity URP occlusion
  example], or keep tall things out of where action happens. A grep of
  `src/rendering/wheelObjects.js` / `depthSort.js` finds no canopy fade
  or hero silhouette for Wheel objects [D] -- so today the only defence
  is placement.

### 3.5 What shipped games do (summary, with how well each is sourced)

| game | placement method | lesson for us | source |
|---|---|---|---|
| Minecraft (1.18+) | per-chunk `count` tries, uniform `in_square`, the feature fails if occupied; per-biome counts 0.05 (plains) to 50 (jungle); grass by `noise_threshold_count` (5 / 10 tries either side of noise -0.8); pre-1.18 dark forest: 4 x 4 jittered grid per chunk | huge biome contrast (200:1), density from noise, occupancy as a crude hard core | [G] misode/mcmeta; dark forest grid [K] |
| Don't Starve Together | Voronoi "rooms"; each tile point filled with `distributepercent` (0.1 rocky/savanna ... 0.8 deep forest), weighted prefab pick, +-1/4 tile jitter; circle colliders (tree 0.25, player 0.5, boulder 1.0) | a jittered grid is acceptable when (a) the art is one object per tile, (b) the mix is dominated by one kind, (c) trunks are far smaller than gaps | [G] taichunmin/dont-starve-together-game-scripts |
| RimWorld | per-biome `plantDensity` (temperate forest 0.65, boreal 0.4, tropical rainforest 0.99, temperate swamp 0.8, tropical swamp 0.99) times fertility; per-plant `wildClusterRadius` / `wildClusterWeight` make some species (bushes, brambles) grow in clusters | density x cluster-per-species = "stands" not salt-and-pepper | [S] rimworldwiki Biomes / Wild plants; cluster mechanics [S, partial] |
| Diablo III | hand-made tiles placed randomly; outdoor zones mostly static with cut-out chunks filled from sets of "sub-scenes" (an event, a mini-boss, scenery, or nothing) | set pieces in reserved slots (6.8) | [S] diablowiki "Sub-scenes", pcg.wikidot |
| Path of Exile | outdoor areas built tile-by-tile along edge graphs, hand-made rooms/tiles with keys; doodads come with the tiles | hand-authored pieces + procedural layout | [S] ExileCon 2019 "Procedural World Generation in Path of Exile" (Rhys Abraham), via search |
| Diablo II | outdoor presets on a grid; walls/trees fade when they intersect the character | occluder fade | [S] Phrozen Keep forums |
| Stardew Valley | hand-placed maps; trees and buildings fade to ~0.4 alpha when you stand behind them | occluder fade | [S] nexusmods transparency mods' descriptions |
| Zelda: BotW | "triangle rule" (big/medium/small forms that hide and reveal) and "gravity" (smaller POIs between towers) | sizes vary deliberately; POIs pull sideways | [S] CEDEC 2017 coverage (gamedeveloper, nintendolife, sourcegaming) |
| Zelda: ALttP | bushes and rocks are obstacles AND interactables (lift/cut), used to gate and to frame paths | small things can be the gameplay edge of a path | [K] |
| The Witcher 3 | world team rule: something interesting every ~40 s of travel | POI cadence | [S] tweaktown; Uppsala thesis |
| Hades | readability first: "first and foremost a game design-led team"; bold silhouettes, restrained detail | environment is the background | [S] MCV/DEVELOP (quote); silhouette advice from a Hades-inspired student project on 80.lv |

## 4. Mobile performance and readability budgets

### 4.1 What actually limits a PixiJS sprite world on iPhone

- **Sprite count is not the limit.** PixiJS batches thousands of sprites at
  60 fps when they share textures; Goodboy Digital's batching article
  cites 16 textures per batch on desktop Chrome but **8 on iOS** (an
  older-device figure: read `gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)`
  on the target iPhones -- recent ones may report 16), and the
  per-draw-call overhead is proportionally higher on mobile, so "atlas
  aggressively and keep blend modes uniform" [S: goodboy-digital "GPU
  multi-texture sprite batching", appscale.blog 2026]. Round sprite positions to integers on iOS (a known
  PixiJS iOS slowdown with sub-pixel TilingSprite) [S: pixijs issue 4262].
  Our feet are kept at 0.5 px (`placeObjects`), so check the draw side
  snaps.
- **Distinct sheets per screen = draw calls.** With 8 texture units, a
  screen needing more than 8 distinct sheet pages breaks the batch
  every time the depth order alternates between pages. Since depth sort
  interleaves objects by their feet, the realistic cost is
  ~(number of page switches along the sorted list), not the page count.
  Budget [K]: <= 8 object pages live per screen (one batch even on the
  8-unit devices), and
  group a land's commonest kinds on the same page (objects/atlas.js already
  packs "a few objects a page").
- **Fill rate / overdraw.** Each sprite costs its whole quad, transparent
  pixels included. Mobile GPUs are fill-rate bound and transparent layering
  is "the mobile killer" [S: appscale.blog, Unity mobile optimisation
  guides]. No authoritative single number exists; a common working
  ceiling is ~2-3x the screen for the whole scene on mid-range phones [K].
  **Our estimate [D]:** an oak quad is ~270 x 300 = 81,000 game px^2; in a
  clump at keep 0.9 per 116^2 cell the big layer alone is ~5.4x overdraw
  over the clump (verdant jungle trees ~6x); averaged over a screen
  with 10-30% clump cover plus scatter, ~1-2.5x from objects on top of
  the 1x ground. At 3x DPR (~1.9 device px per game px) one oak is ~10%
  of a full-screen fill. Fine on recent iPhones, the thing to watch on
  older ones and under thermal throttling. Cheap wins: trimmed/polygon
  meshes for crowns (cut ~30-50% of transparent quad area [K]), and
  fewer overlapping crowns (which placement fixes anyway).
- **Texture memory** is the repo's real iPhone limit (CLAUDE.md: the
  Wheel arrives at ~176 MB of textures, Safari's edge ~240 MB). Placement
  affects it through how many distinct object pages are in reach at
  once: a land that uses 6 kinds spread over 6 pages costs more than one
  whose common kinds share 2 pages.

### 4.2 Readability budgets per screen (619 x 1280 game px) [K, reasoned]

| context | big (trees, spires, pylons) | mid (rocks, bushes, cacti) | small (walk-through clutter) | open ground visible |
|---|---|---|---|---|
| woodland set piece (walk around) | 8-15 | 10-20 | 15-30 | 30-50% |
| ordinary land | 2-5 | 5-10 | 10-25 | 60-75% |
| open plain / glade | 0-2 | 2-6 | 5-15 | >= 80% |
| monster camp core | 0-1 | 2-5 | 5-15 | >= 80% |

- Derivation: the size hierarchy (2.5: each class ~3-5x more numerous
  than the one above it, by footprint area), the shipped contrasts (2.1:
  10:1 to 200:1 between densest and sparsest), and the negative-space
  targets (3.4). Our expected open-ground totals (big ~1.9, mid ~4.9,
  small ~12; section 1 [D]) sit in the "ordinary land" row; the clumps
  push the big column to ~10-25 per screen where they bunch.
- **Distinct kinds per screen.** 3-6 distinct kinds (plus their variants
  and flips) reads as one coherent place; 1-2 reads as copy-paste; 8+
  starts to read as a garden centre unless strongly zoned [K]. Our lands
  offer 3-7 kinds each across the three layers (LANDS), so the risk is
  the LOW end (e.g. hollows: boulder + crystal + rubble + rare minecart;
  mist: slimetree + mangrove + toadstool) -- variety then has to come from
  variants (2-4 pieces each), grouping and set pieces.
- **Clutter can be measured on screenshots**: Rosenholtz et al. (2007,
  "Measuring visual clutter", J. Vision) define *feature congestion*
  (local variability of colour, orientation, luminance) and *subband
  entropy* (bits to encode the image after a wavelet/steerable-pyramid
  decomposition) [S: persci.mit.edu/research/clutter, JOV]. An open-source
  numpy implementation exists [S: github AlexeyGOblov/visual-attention-
  audit]. Useful to compare placements A/B on identical camera spots.

## 5. Metrics a study can measure, with target ranges

### 5.0 Reference values, simulated [D] (sim/ce.py in this scratchpad)

Torus of 120 x 120 lattice cells (no edge effects); distances in units of
the lattice STEP (x116 px for our big layer, x92 mid, x68 small).
"close" = share of points whose nearest neighbour is < 0.5 x the mean
spacing 1/sqrt(density); "cv" = coefficient of variation of NN distance.

| process | R (Clark-Evans) | NN min | NN 5th pct | close | cv |
|---|---|---|---|---|---|
| CSR (uniform random) | 0.99 | ~0 | 0.13 | 55% | 0.53 |
| square lattice | 2.00 | 1.00 | 1.00 | 0% | 0 |
| **OURS** jitter 0.15-0.85, keep 1.0 | 1.45 | 0.31 | 0.46 | 8% | 0.22 |
| **OURS big in clump** (keep 0.9) | 1.42 | 0.32 | 0.47 | 10% | 0.23 |
| **OURS mid in clump** (keep 0.18) | 1.09 | 0.33 | 0.60 | 49% | 0.40 |
| **OURS big open** (keep 0.05) | 1.04 | 0.44 | 0.77 | 53% | 0.48 |
| DST-like jitter 0.25-0.75, keep 0.6 | 1.37 | 0.51 | 0.63 | 7% | 0.19 |
| full-cell jitter 0-1 | 1.26 | 0.04 | 0.27 | 28% | 0.33 |
| Matern-II r=1.0 on 1-per-cell candidates | 1.48 | 1.00 | 1.02 | 0% | 0.16 |
| Bridson Poisson-disk r=1.0, k=30 | 1.71 | 1.00 | 1.00 | 0% | 0.08 |
| Thomas cluster (kappa .01, mu 20, sigma 1.5) | 0.55 | ~0 | 0.14 | 89% | 0.73 |
| Thomas + Matern-II r=0.8 (groves w/ spacing) | 0.75 | 0.80 | 0.83 | 86% | 0.34 |

Readings:
- Inside a clump our big layer is a fairly REGULAR pattern (R 1.42) -- more
  regular than measured natural stands (R ~0.8-1.2, see 5.1) yet with
  near-collisions (5% of trees have a neighbour within 0.47 step = 54 px,
  min 37 px, while an oak picture is ~270 px wide).
- **Wherever a layer is thinned hard (open ground, all mid/small layers),
  the independent keep turns the lattice into ~pure random (R 1.03-1.09)
  with ~50% of objects having an unusually close neighbour.** Random
  points read as "clumpy, with odd pairs" -- this is the main visual
  artifact to expect on open ground, and it has nothing to do with the
  lattice: it is the independent per-cell coin flip.
- Matern-II thinning (hash priority, keep iff no higher-priority candidate
  within r) gives a hard minimum distance with no regular look, is purely
  local, and costs one neighbourhood scan per candidate.
- Grove-style pattern (cluster process + hard core) gives the textbook
  "clustered at coarse scale (R<1), regular within" signature.


### 5.1 Field reference values (natural forests) [S]

- Clark-Evans R = mean NN distance / (0.5 / sqrt(density)); R < 1
  clustered, ~1 random, > 1 regular; theoretical range 0 to 2.1491
  (hexagonal lattice) [S: spatstat `clarkevans` docs; metricgate].
- Measured stands: Barro Colorado Island plots mean R = 1.09, all > 1
  (regular) [S]; R from 0.81 +- 0.12 (147-year-old stand) to 1.2 +- 0.25
  (36-year-old stand) [S: USDA FS NRS 2018 Looney et al.]; worked
  examples R_regular = 1.17 vs R_clustered = 0.76 [S]. So natural tree
  patterns live in roughly **0.75-1.25**, and anything above ~1.4 looks
  planted.
- Always edge-correct (Donnelly's correction, or a guard area: only score
  points farther from the window edge than their NN distance), and score
  per land and per context -- mixing clump and open ground in one window
  makes R meaningless.

### 5.2 What to measure on our placement, and target ranges

Everything here can be computed offline: `placeObjects(plan, bp)` is pure
and already runs in Node (tools/world/test-world-core.mjs), footprints
come from `objectFootprints(placed, manifest)`
(public/world/objects/manifest.json gives picture sizes), the monster
bands from `server/src/wheelspawns.js`, and
`node tools/world/render-wheel-objects.mjs` renders any spot for visual
A/B. Sample "screens" as 619 x 1280 windows on a grid over land
(skip windows that are > 50% sea), per land and per stage.

| # | metric | how | target [K unless marked] | expectation today [D] |
|---|---|---|---|---|
| 1 | Clark-Evans R, big layer, inside woods | NN on trunks, guard-area corrected | 1.0-1.3 | ~1.42 in clumps |
| 2 | Clark-Evans R, big layer, whole land | same, all big | 0.6-0.9 (groves) | ~1.0-1.2 (even scatter of tiny clumps) |
| 3 | Clark-Evans R, mid / small | per layer | 0.8-1.2 / 0.6-1.0 | ~1.0-1.1 (random) |
| 4 | Twins: share with NN < 0.3 x picture width (same layer) | NN / picture width | < 2% (0 for big) | big: NN can be 35 px vs ~270 px crowns -> many; mid/small ~half below 0.5 x spacing |
| 5 | NN 5th percentile, big | in crown widths | >= 0.4-0.5 (trunks visible) | ~0.2 (54 px / 270) |
| 6 | Multi-scale signature | pair-correlation g(r) or L(r)-r at r = 0.5 crown, 2-4 crowns, 1 screen | g < 1 at 0.5 crown; g > 1.5 at 2-4 crowns; ~1 at a screen | g ~1 at 2-4 crowns (no groves) |
| 7 | Objects per screen | min / median / p90 / max, by layer | see 4.2 table | open: big ~2, mid ~5, small ~12 |
| 8 | Screen-scale contrast | variance/mean (VMR) of big counts per screen; share of "glade" screens (0 big, <= 3 mid) | VMR 2-6; glade screens 10-25% of ordinary land | VMR ~1-2 (drift only 3:1) |
| 9 | Canopy cover | share of ground under any object's picture (alpha mask or quad), per screen | ordinary 15-35%, woods 40-70%, camp core <= 15%, over roads <= 5% | measure |
| 10 | Blocked walkable % | union of footprints / walkable land | 2-6% ordinary, <= 2% camps | measure (trunk-only trees keep it low) |
| 11 | Pockets | flood-fill from roads on an 8 px grid dilated by the 10 px half-collider | 0 enclosed pockets; 0 unreachable spawn points | measure |
| 12 | Ambiguous gaps | pairs of footprints with a gap of 20-80 px | as few as possible; report per 1e6 px^2 | measure |
| 13 | Distinct kinds per screen | count kinds in window | 3-6 typical, >= 2 min | LANDS gives 3-7 |
| 14 | Repetition | share of objects whose nearest same kind+piece+flip is within 2.5 widths | < 5-10% | high in clumps (2 pieces x 2 flips) |
| 15 | Dominance | top kind's share per land | 50-80% | measure |
| 16 | Road verge profile | density per band from the road edge (0-48, 48-150, 150-400, > 400 px), north vs south side separately | no tall picture over the road; low objects peak at the verge; big objects start ~0.7-0.9 x height south of the road | big start at 48 px both sides |
| 17 | Camps | density in the spawn band core vs same-land control; spawn points under a picture; share of spawn-point pairs whose straight line hits a footprint | big <= 0.25x control; 0 hidden spawn points; LOS blocked < 10-15% | camps at land density; measure |
| 18 | Overdraw | sum of object quad areas / screen area | mean <= 2, p95 <= 4 | ~1-2.5 mean, ~5-6 in clumps |
| 19 | Sheet pages per screen | distinct atlas pages in window | p95 <= 8 (one batch at 8 texture units; 16 if the phones report it) | measure |
| 20 | POI spacing | along each road: gap between landmarks, camps, bridges, oases, set pieces | majors every 5-10 screens; minors every 1-2 | majors ~every 3 screens; no minors |
| 21 | Clutter score | Rosenholtz feature congestion / subband entropy on rendered screens [S] | A/B: lower at equal object count is better | -- |

Targets marked [K] are reasoned from sections 2-4 (shipped densities, size
hierarchy, negative space, collider sizes); treat them as starting
bands to tune by eye with the owner, not as laws.

## 6. Ranked changes for a jittered-lattice + clump-mask generator

All keep the house rule: **a decision depends only on WHERE** -- hashes
of absolute lattice coordinates (`hash2(i, j, seed)`), noise sampled at
absolute positions, and only LOCAL neighbourhood tests (bounded radius),
so any piece can be evaluated alone with a margin and growth of the
painted area changes nothing. Ranked by expected improvement per unit
of work.

### 6.0 Two simulation facts behind the ranking [D: sim/*.py]

- Matern-II saturates at ~0.32 / r^2 kept points (= 1 / (pi r^2)) once
  there are >= 2 candidates per r^2, at R ~1.45-1.5 (sim/m2curve.out). So
  to target a density lambda, r ~ 0.57 / sqrt(lambda) gives the densest
  possible (and quite regular) pattern.
- **Keep-by-mask first, then a hard core of r = f x local spacing** (spacing
  = 1 / sqrt(lambda)): f = 0.3-0.5 gives **R 1.12-1.34 -- the measured
  natural range -- with the closest pair >= 0.3-0.45 x spacing (no
  twins)**, at a loss of 3-25% of the points (sim/m2mix.out). With
  full-cell jitter (0-1) instead of our 0.15-0.85 the lattice's rows
  disappear (R 1.25 at p 0.9 before the hard core).

### 1. Hard-core (Matern-II) thinning by hash priority -- HIGH impact, LOW effort

Fixes: twins and "random clumps" on open ground and in mid/small layers
(R ~1.0, half the points with a too-close neighbour), trunk collisions
inside clumps (min 35 px), and the faint lattice rows.
```js
// per layer L: candidates as now, but full-cell jitter
const cx = (i + hash2(i, j, ls)) * st, cy = (j + hash2(i, j, ls + 1)) * st;
// 1) hard constraints + mask keep (as now): ok(i, j) -> boolean
// 2) priority = hash2(i, j, ls + 7); radius from the KIND chosen there
//    (or the layer), and from the local spacing: r = max(rKind, f / sqrt(lambda(x)))
// 3) keep iff no OTHER candidate (i', j') within r that also passes ok()
//    has a higher priority -- scan the (2R/st + 1)^2 neighbouring cells.
```
- Compare only against candidates that pass the hard constraints and the
  mask keep (still local and order-free). Use r_ab = max(r_a, r_b) (or
  the mean) when kinds differ.
- Suggested starts: big r = max(0.45 x crown width, 0.4 / sqrt(lambda));
  mid r = max(1.0 x picture width, 0.4 / sqrt(lambda)); small: r = 0.6 x
  width (clutter may stay loose).
- Cross-layer `gapBig` stays (it is decided in fixed layer order, which is
  already position-only).
- Cost: ~9-25 cell lookups per candidate; trivial next to today's run.

### 2. A real grove scale: woods and glades -- HIGH impact, MEDIUM effort

Fixes: no structure between "one canopy" (the 33-143 px plan clumps) and
"one screen" (drift at 1,400 px, contrast only ~3:1).
- Grow groves AROUND the plan's obstacle clumps: a distance field to
  obstacle cells (the same two-sweep transform as `clear`/`wet`), then
  big-layer density = smoothstep over that distance with a grove radius
  Rg ~ 300-600 px (2-4 crowns), jittered by fbm at ~600 px so groves are
  not round: e.g. lambda_big = lambda_wood x (1 - smoothstep(0.6 Rg, 1.3 Rg, d + 120 fbm)).
  Clumps then read as the hearts of woods of 5-20 trees, not as single
  trees.
- Add a macro wood/glade mask per land: smoothstep(t - w, t + w, fbm(x /
  lambda_macro)) with lambda_macro ~ 2,500-6,000 px and a contrast of
  >= 10:1 between wood and glade (shipped games: 10:1 to 200:1, 2.1);
  `t` per land/stage so the frost woods thicken toward stage 2-3 as the
  stage weights already intend.
- Keep camp bands and road verges out of the wood mask (6.3, 6.4).

### 3. 3/4-view asymmetric clearances: roads, landmarks, plots -- HIGH (play), LOW effort

A picture covers ground NORTH of its foot. Generalise `coversTown` to
"covers anything it must not": sample the picture rectangle (x +- w/2,
y - h .. y) at ~6-9 points and reject a TALL object (h > ~1.5 x the bro,
~160 px) whose picture covers road, street, bridge, rail, camp band,
landmark or a plot by more than a small share (e.g. > 1 of 9 samples).
Low objects keep today's footprint clearance. Effect: roads stay
visible, woods frame them from the north side and thin out to the
south; trees stop "standing in the road" visually even though their
trunks never did.

### 4. Monster-camp clearings -- HIGH (play), LOW-MEDIUM effort

- Derive each first-stage camp band from the plan geometry BEFORE
  placing (anchor + band radii are geometry; the baked points are not --
  they are baked from placing, so using them would be circular).
- Inside the band core: big chance x ~0.1-0.25, no tall picture
  covering the core at all (6.3's test), mid x ~0.5; on a ring at ~1-1.3
  x the band's half-width: mid (rocks/bushes) x 2 as the arena's frame.
- Check with metric 17 (LOS between spawn pairs < 10-15% blocked, 0
  hidden spawn points).

### 5. Satellites / understorey around big objects -- MEDIUM-HIGH (look), LOW effort

- For each kept big object, 0-4 children at hashed angle and distance
  0.5-1.3 x its footprint radius out to its crown's "drip line",
  kinds from a per-land `under` list (verdant: fern, giantflower; frost:
  frostbush, snowrock; hollows: rubble, crystal; ember: charstump,
  basalt; mist: toadstool; tidal: shell/searock; sky: sage/skull;
  thunder: scrap/coal). Hash from the parent's lattice cell and child
  index: hash2(i, j, seed + 101 + k) -> still position-only.
- Satellites may stand inside `gapBig` of their own parent (not on the
  foot); give them no footprint or a small one.
- Edge effect: in the band where the grove mask falls from 1 to 0 (6.2),
  raise mid/small density x1.5-2 -- shrubs gather at wood edges.
- Matches what the plan's own art briefs ask for ("ferns and mossy
  boulders at their roots", "crystals at their feet").

### 6. Canopy fade when the hero (or a monster) is behind -- HIGH (readability), LOW-MEDIUM effort (renderer, not placement)

Stardew fades trees/buildings to ~0.4 alpha when you stand behind
them [S]; Diablo II fades the occluding wall/tree [S]. In
`wheelObjects.js`: if the player's body rect intersects an object's
picture rect and the player's foot y < the object's foot y, ease alpha to
~0.4-0.5 over ~150 ms (and back). Optionally the same for monsters in a
camp. Cheap with the existing per-sprite loop; removes the worst cost of
dense woods.

### 7. Variety rules -- MEDIUM, LOW effort

- No identical neighbours: after choosing kind/piece/flip by hash, if the
  nearest higher-priority same-kind object within 2.5 widths has the same
  piece+flip, step to the next piece (or flip). Deterministic via the
  Matern priorities.
- Species patches instead of salt-and-pepper: pick the kind by
  weight_k x (1 + a x noise_k(x / 600-900 px)) so secondaries come in
  stands (birch stands in the pines, crystal patches among boulders).
- Dominant kind 60-80% per patch.

### 8. Minor set pieces every 1-2 screens -- MEDIUM-HIGH (orientation), MEDIUM effort

A sparse hashed lattice (~1,500-2,500 px) with its own Matern-II (r ~1,200
px) places small hand-made templates on open ground 150-400 px from a
road (visible from it, never on it): a broken cart with crates and a
skull (dunes), a fallen giant pine ringed by rocks (frost), a ring of
stones, a burnt-out campfire with stumps (ember)... built only from
catalog objects that exist. Hits the "something every 40 s" rule at the
minor scale (3.3).

### 9. Ecotones across stage borders -- MEDIUM, LOW effort

Distance to the other stage (`bp.band`) via the same two-sweep transform;
blend the two stages' weight vectors over ~1-2 screens plus fbm, instead
of switching at the cell where `band` changes. The ground already mixes
this way (`MIX`).

### 10. A navigation check in the test suite -- ESSENTIAL guard, LOW effort

Not a placement change: run metrics 11 and 12 (pockets, ambiguous 20-80 px
gaps) and 17 in `test-world-core` on every placing change, and fail on
any enclosed pocket or hidden spawn point. Optionally a deterministic
post-pass: for a pair forming an ambiguous gap, drop the lower-priority
mid/small object.

**If only three things are done:** 1 (hard core), 2 (groves around the
clumps + a real wood/glade mask), and 3+4 together (nothing tall
covering roads or camps). Then 6 (canopy fade) in the renderer.

## 7. References

Fetched data files [G] (raw.githubusercontent.com):
- Minecraft worldgen placed features (misode/mcmeta, `data` branch):
  https://raw.githubusercontent.com/misode/mcmeta/data/data/minecraft/worldgen/placed_feature/trees_plains.json
  (and trees_*.json, dark_forest_vegetation.json, patch_grass_plain.json;
  copies in scratchpad `src/mc_*.json`)
- Don't Starve Together scripts mirror (taichunmin/dont-starve-together-game-scripts):
  map/rooms/forest/terrain_forest.lua, terrain_grass.lua, terrain_savanna.lua,
  terrain_rocky.lua, map/graphnode.lua, prefabs/evergreens.lua,
  prefabs/player_common.lua, prefabs/rocks.lua, prefabs/berrybush.lua,
  constants.lua (copies in scratchpad `src/dst_*.lua`)

Search-result sources [S] (pages could not be opened directly; facts
taken from search summaries):
- Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions" (SIGGRAPH 2007 sketch): https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
- Red Blob Games, "2D Point Sets" (jittered grid): https://www.redblobgames.com/x/1830-jittered-grid/
- Red Blob Games, "Making maps with noise functions" (tree placement): https://www.redblobgames.com/maps/terrain-from-noise/
- Lagae & Dutre 2008 comparison; Kopf 2006 recursive Wang tiles; Mitchell best-candidate (via https://libraopen.lib.virginia.edu/downloads/2r36tx569 and https://link.springer.com/rwe/10.1007/978-3-031-23161-2_398)
- Wei 2008 "Parallel Poisson disk sampling": https://dl.acm.org/doi/10.1145/1360612.1360619 ; Wei 2010 "Multi-class blue noise sampling": https://history.siggraph.org/learning/multi-class-blue-noise-sampling-by-wei/
- Matern hard-core type II: https://arxiv.org/pdf/1209.2566 ; https://www.emergentmind.com/topics/matern-process
- Neyman-Scott / Matern cluster / Thomas: https://rdrr.io/cran/spatstat.random/man/rMatClust.html ; https://arxiv.org/pdf/1604.06643 ; forest ecology use: https://pmc.ncbi.nlm.nih.gov/articles/PMC9508254/
- Clark-Evans index: https://rdrr.io/github/spatstat/spatstat.core/man/clarkevans.html ; https://metricgate.com/docs/clark-evans-nearest-neighbor/ ; stand values: https://www.fs.usda.gov/nrs/pubs/jrnl/2018/nrs_2018_looney_001.pdf ; https://arxiv.org/pdf/1805.08907
- BotW triangle rule / gravity: https://www.gamedeveloper.com/design/5-design-lessons-learned-from-i-the-legend-of-zelda-breath-of-the-wild-i- ; https://www.nintendolife.com/news/2017/10/zelda_breath_of_the_wilds_ingenious_design_is_all_about_triangles_apparently ; https://sourcegaming.info/2017/11/25/holism-breath-of-the-wilds-golden-triangles/
- Witcher 3 "40 second rule": https://www.tweaktown.com/news/59420/witcher-3s-40-second-rule-kept-players-engaged/index.html ; https://uu.diva-portal.org/smash/get/diva2:1569059/FULLTEXT01.pdf ; POI spacing guide: https://www.strayspark.studio/blog/open-world-design-pacing-player-freedom
- Lynch elements in game worlds: https://medium.com/@alexander.bakharev_16063/so-you-want-to-build-an-mmo-8-18-world-design-level-architecture-c07798d17f1c ; https://madesignwayfinding.wordpress.com/2015/03/21/paths-edges-districts-nodes-and-landmarks/
- Stardew transparency: https://www.nexusmods.com/stardewvalley/mods/2359 ; https://www.nexusmods.com/stardewvalley/mods/8891
- Diablo II wall/tree fade: https://d2mods.info/forum/viewtopic.php?t=63795 ; Unity URP occlusion (dither/x-ray): https://github.com/Unity-Technologies/UniversalRenderingExamples/wiki/Occlusion
- Diablo III sub-scenes: https://www.diablowiki.net/Sub-scenes ; http://pcg.wikidot.com/pcg-games:diablo-iii
- Path of Exile generation (ExileCon 2019 talk, via): https://github.com/kchapelier/procedural-generation
- RimWorld biomes / wild plants: https://rimworldwiki.com/wiki/Biomes ; https://rimworldwiki.com/wiki/Wild_plants
- Level design metrics / passages: https://www.coreydelorenzo.design/designblog/2019/6/22/level-design-metrics ; https://medium.com/my-games-company/advanced-level-design-borrowing-cinematic-techniques-for-gameplay-26084fa2f9e9
- Top-down arena design: https://medium.com/my-games-company/top-down-shooter-level-design-how-map-design-supports-game-mechanics-6ae39fdd095d
- Environment art hierarchy (primary/secondary/tertiary): https://80.lv/articles/sci-fi-environment-production-by-fredrik-maribo
- Hades: https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/
- PixiJS batching / iOS 8 texture units: https://medium.com/goodboy-digital/gpu-multi-texture-sprite-batching-21c90ae8f89b ; https://appscale.blog/en/blog/pixijs-high-performance-2d-web-graphics-2026 ; https://github.com/pixijs/pixijs/issues/4262
- Overdraw on mobile: https://thegamedev.guru/unity-gpu-performance/overdraw-optimization/ ; https://unity.com/how-to/mobile-game-optimization-tips-part-2
- Visual clutter metrics: https://persci.mit.edu/research/clutter/ ; https://jov.arvojournals.org/article.aspx?articleid=2122001 ; https://github.com/AlexeyGOblov/visual-attention-audit

Own simulations [D] (scratchpad `sim/`): `ce.py` -> `ce.out` (R and NN
statistics per process), `m2curve.py` -> `m2curve.out` (Matern-II kept
density vs r), `m2mix.py` -> `m2mix.out` (mask keep + hard core).

Repo files read (none modified): public/tools/world/core/placing.js,
core/layout.js, core/rng.js, plan.js, public/tools/objects/catalog.js,
server/src/wheelspawns.js, tools/world/bake-wheel-spawns.mjs,
src/data/worldProps.js, src/ui/BroTown.jsx (movement collider),
src/rendering/wheelObjects.js.
