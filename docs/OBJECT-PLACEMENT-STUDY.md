# How the Wheel's objects are spread, and what a good spread is (v2.3.2999)

> Owner, 2026-10-03: *"work throughout the night on studying object placement
> in the game's maps and what a good distribution is"*.

This is what the study found, what good placement looks like (from shipped
games and the maths of natural patterns), and **placing v2**: a preview you
can walk with `?placing=2`. Without that switch the game is unchanged.

## In short

- **The Wheel has no woods.** Today's trees are spread about as evenly as
  random dots. The plan's "obstacle clumps", which were meant to be woods,
  are hundreds of blobs each about one tree across. So every screen looks
  roughly the same: no forests, no clearings.
- **Rocks, cacti and mushrooms stand like polka dots.** They are one at a
  time and evenly spaced, where nature puts them in piles, patches and rings.
- **Fights happen in the clutter.** The monsters' camps hold as much as the
  land around them, and up to as many trees.
- **Some gaps catch your feet.** 467 gaps between two objects are wide
  enough to try and too narrow to walk through cleanly.
- **Placing v2 fixes all four**, keeps each land's object count about the
  same, and adds see-through trees, so a wood never hides you.

## How it was studied

`node tools/world/study-placement.mjs` (add `--placing 2` for v2) measures
every object the game places, the way a player meets it. All screen
numbers use today's view: 619 × 1280 game px on a phone.

- **How many** things fit on one screen, per land. They are counted by
  size: tall (170 px and up: trees, pylons, hoodoos), medium (rocks, cacti,
  toadstools) and low (flowers, shells).
- **How they are spaced:**
  - each tall thing's nearest tall neighbour;
  - the Clark–Evans ratio (under 1 is clumped, 1 is random, over 1 is even);
  - how many tall things stand within 300 px of a tall thing, compared with
    random dots. Above 1 means groves.
- **How much ground is covered**, by one picture and by two or more.
- **400 phone screens dropped on each land**: things in view, kinds in view,
  and the share of screens that are bare or busy.
- **Distance from roads**: things per screen-area at increasing distances
  from a road.
- **The camps**: clutter inside the band where each land's monsters stand,
  compared with the land as a whole.
- **Twins**: a tall thing whose nearest same-kind neighbour is under 250 px
  away, drawn from the same picture the same way round.
- **Walking**, using the player's feet box (20 × 20 px):
  - ground the objects alone shut off (**pockets**);
  - gaps between two footprints under 20 px (**closed**: they look passable
    and aren't);
  - gaps of 20–36 px (**tight**: passable, but your feet catch).

It also draws a density map of the Wheel
(`tools/qa/out/placement-density*.png`).
`render-wheel-objects.mjs --at land:<land>:<stage> --placing 2` draws any
spot with its objects. The browser test `mp-placing2` takes in-game
pictures of the same spots with and without v2.

Two research notes were written alongside:

- `docs/research/OBJECT-PLACEMENT-RESEARCH.md`: what shipped games do, the
  maths of natural point patterns, and phone budgets. Each claim is tagged
  by where it came from.
- `docs/research/ELEVATION-RESEARCH.md`: the elevation question, answered
  in `docs/ELEVATION-PLAN.md`.

## What a good spread is

These are the principles the study holds the Wheel to. Sources are in the
research note.

1. **Three scales, not one.**
   - Woods and clearings at the size of a few screens, with at least
     **10 to 1** between them. Shipped games use 10:1 to 200:1; Don't
     Starve's forest against its grassland is about 12:1.
   - Groves of 5–20 trees inside the woods.
   - Undergrowth at the feet of single trees.
   - Today's Wheel has only the third, and not even that.
2. **Spacing like nature's.** Trees in a wood are a little more even than
   random dots (Clark–Evans about 1.1–1.3). No two trunks stand closer than
   their crowns allow. The standard way to get this is *Matérn II thinning*:
   a candidate stays only if no stronger neighbour within its reach also
   qualifies. It never depends on the order things were made in, which
   matches the placer's rule that a position depends only on where it is.
3. **Small things in groups.** Rocks in piles, cacti scattered loosely,
   toadstools in fairy rings, ruined walls in lines, with open ground
   between the groups.
4. **Roads framed, never covered.** Seen from the south, a tree's picture
   covers the ground *north* of its foot. So a tree just south of a road
   stands in it, visually. Woods should frame a road from the sides and
   thin out toward it, not wall it in.
5. **Fights in clearings.** A camp should be open in the middle, so the
   player sees the monsters and the monsters' shots, and framed at its edge.
6. **Gaps either open or closed.** A gap should be wide enough to walk
   through without catching (40 px here), or not there at all. Never a
   pocket you can see and never reach.
7. **No twins, stands of a kind.** No identical neighbours. A secondary kind
   (birch among pines) grows in stands, not salt-and-pepper.
8. **See-through canopy.** Woods are only fair if you can see yourself in
   them. Stardew Valley and Diablo II fade a tree or wall that hides the
   player.
9. **Something to remember every screen or two.** Small set pieces (a ring
   of stones, a wreck, a fallen giant) at intervals help you find your way.
   *Not done yet; see "Next".*

## What v1 (today) measures, and what v2 measures

Per land. "→" goes from today to v2. Clutter in the camps is compared with
the land's own average.

| land | things a screen | tall a screen | grove (tall near tall vs random) | canopy cover | clutter in the camps | tall in the camps | twins |
|---|---|---|---|---|---|---|---|
| commons | 40.1 → 29.9 | 5.3 → 5.5 | 1.4 → 1.34 | 44% → 43% | – | – | 14% → 3% |
| frost | 23.7 → 23.9 | 8.2 → 7.5 | 1.01 → 1.47 | 47% → 41% | 77% → 51% | 74% → 0% | 19% → 3% |
| ember | 27.2 → 25.1 | 3.5 → 2.4 | 1.36 → 2.28 | 37% → 31% | 89% → 46% | 109% → 0% | 20% → 1% |
| sky | 21.1 → 19.1 | 6.9 → 5.8 | 1.14 → 1.42 | 36% → 33% | 70% → 31% | 86% → 76%* | 21% → 10% |
| hollows | 24.7 → 23.4 | 0 → 0 | – | 23% → 20% | 91% → 56% | – | – |
| thunder | 21 → 18.7 | 5.6 → 5.2 | 0.82 → 1.69 | 35% → 31% | 97% → 50% | 111% → 0% | 11% → 4% |
| tidal | 14.3 → 12.4 | 0.2 → 0.2 | 1.82 → 1.86 | 15% → 10% | 62% → 0% | – | – |
| mist | 12.6 → 17.6 | 5.5 → 5.8 | 0.9 → 1.35 | 40% → 46% | 59% → 34% | 27% → 0% | 15% → 2% |
| verdant | 26.7 → 23 | 9.6 → 7.4 | 0.88 → 1.05 | 78% → 67% | 85% → 6% | 74% → 0% | 20% → 2% |

\* The dunes' camp keeps its oasis palms. They ring the water and v2 leaves
them alone.

Walking, the whole Wheel:

| | today | v2 |
|---|---|---|
| gaps your feet catch in (20–36 px) | 467 | 30 |
| closed slits (under 20 px) | 387 | 225 |
| pockets the objects shut off | 4 (4,864 px²) | 4 (1,728 px²) |
| objects placed | 12,818 | 12,061 |

What's left of the closed slits is mostly stones inside one pile, whose
pictures overlap so they read as one lump.

Next to roads, today's lands crowd the band just past the kept-clear
cells. Frost has 29 things a screen there against 23 further out.

With v2 the count rises smoothly with distance from the road:

| | 0–48 px | 48–96 | 96–192 | 192–384 | beyond |
|---|---|---|---|---|---|
| frost, today | 14.9 | 29.2 | 24 | 25.8 | 23.1 |
| frost, v2 | 7.1 | 10.8 | 16.7 | 24.1 | 26.1 |

## Placing v2 (`?placing=2`)

All of it is in `public/tools/world/core/placing.js` ("PLACING v2" and
`natureV2`). It changes only each land's own scatter. The town, its
furniture, the fences along the Old Roads and the oases' palms are placed
exactly as today, and the world tests check that they are identical.

1. **The woods field.** A slow, warped noise over the land (`V2.field`,
   about 2,400 game px across) is the place each land's tall things come
   from:
   - clearings below 0.36 (about 0.3 tall things a screen);
   - open woodland around the middle (about 4);
   - woods above 0.6 (about 22 at heart);
   - each land's own multiplier on top (`V2_LANDS`), set so each land keeps
     about today's tall count.

   The plan's clumps still make a spot a little thicker.
2. **Tall things spaced like a wood.** Candidates come from a 64 px
   lattice. Each keeps a hard core of 0.42 × its picture's width (Matérn II
   by hashed priority, `hardCore`). No two tall things stand closer than
   that; the world test checks it on every one, 2,266 of them.
3. **Nothing tall covers a road**, a plot, a landmark or a camp's middle.
   The upper part of its picture is checked at 9 points, and 2 hits rule it
   out. Woods frame the roads.
4. **Camps are clearings with a frame.** Inside the band where the worker's
   monsters stand (`campBands`, the bake's own geometry, which the world
   test holds to the bake):
   - tall things are 0.3 as thick and middle things 0.5;
   - in a 160 px ring round the camp, rocks and bushes are 1.6 times as
     thick, framing the arena.

   Measured: no tall things in any camp but the oasis one, and clutter at
   0–56% of the land's.
5. **Middle things in groups.** Rocks, crystals, scrap and coral come in
   piles; cacti, stumps and driftwood in loose scatters; toadstools in fairy
   rings; the ruined stone walls in lines. Each group is 2–8 things, with
   open ground between groups (their own hard core). Stone likes the open
   and living things the woods. Both gather at a wood's edge.
6. **Undergrowth.** Up to three small things at a tall thing's foot, in
   front of the trunk where they show, from each land's list:
   - ferns and giant flowers in the jungle;
   - frost bushes and snow rocks in Frost Ridge;
   - sage, skulls and tumbleweed in the dunes;
   - and so on for the other lands.
7. **Low things in drifts.** Flowers, shells and sage come in patches, not
   an even sprinkle.
8. **No gap the feet catch in.** A thing is not placed if its footprint
   would leave a gap under 40 px to another's. Two footprints only "touch"
   when they overlap by a clear margin, because the catalog's sizes are not
   the pictures' exact sizes.
9. **No twins.** A tall thing whose nearest same-kind neighbour within 2.5
   widths would be drawn the same is turned the other way. Each kind also
   grows in stands: its weight rides a slow noise of its own.
10. **See-through trees.** With `?placing=2` (or `?fade` on its own), a tree
    whose crown covers you while you stand behind it eases to 42% and back
    when you step out (`src/rendering/wheelObjects.js`, `_seeThrough`).
    Buildings stay solid.

What it costs:

- **Placing time.** v2 places in about 1.6–2.0 s on the way into the Wheel,
  against today's 1.1–1.8 s (QA's headless Chromium). That's about half a
  second more of loading. The woods field and the hard core are the cost;
  both could be made cheaper if v2 is kept.
- **Memory.** Unchanged: the same sprite sheets, and slightly fewer objects.

Still deterministic: every candidate is a hashed point of its own lattice
cell, and every decision is local. The same plan always gives the same
Wheel.

## How to look at it

- **In the game:** add `?placing=2` to the address. The Wheel's lands then
  use v2 and trees go see-through. Remove it and you're back to today's.
- **Pictures:** `tools/qa/mp/out/placing2-{v1,v2}-*.png` (the browser test)
  and `tools/qa/out/study/*.png` (the render tool). These are not in git.

## If v2 becomes the default

1. **Re-bake the monsters' places** (`node tools/world/bake-wheel-spawns.mjs`).
   They keep 24 px clear of objects, so a different scatter can move them a
   little. The bake's own check in `test-world-core` will say so.
2. **Make see-through trees the default** too. Dense woods need them.
3. **Make it the default in `placeObjects`** and update the tests that count
   today's objects.

## Next, ranked

1. **Small set pieces**, every screen or two, built from objects that
   already exist:
   - a ring of standing stones;
   - a wrecked cart with crates and a skull in the dunes;
   - a fallen pine ringed with rocks;
   - a burnt-out camp of stumps.

   These are the one thing a good spread needs that v2 doesn't do yet, and
   they need no new art.
2. **Blend lands at stage borders**, the way the ground already mixes
   (`MIX`), instead of switching at a line.
3. **Fade monsters behind trees too**, not only the player.
4. **Cheaper v2:** compute the woods field once into the worker's plan
   arrays.

## Files

- `public/tools/world/core/placing.js`: PLACING v2, `natureV2`,
  `hardCore`, `campBands`, `placingOpts`.
- `public/tools/world/core/ground-worker.js`: passes `?placing=` on.
- `src/rendering/wheelObjects.js`: see-through trees (`_seeThrough`).
- `src/game/wheelTrial.js`: `wheelObjectStats.version`, `seeThrough`.
- `tools/world/study-placement.mjs`: the measurements.
- `tools/world/render-wheel-objects.mjs`: `--placing 2`.
- `tools/world/test-world-core.mjs`, "placing v2": the switch, determinism,
  v1's town and oases kept, nothing wild off its land or on a road, no
  covered road, camps where the monsters are and clear of tall things, the
  hard core, and the gaps.
- `tools/qa/mp/mp-placing2.mjs`: in the game, both ways, with pictures.
