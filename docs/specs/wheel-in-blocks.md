# The Wheel built in blocks round you (v2.3.3298)

The owner, 2026-10-17: *"the game map needs to be larger. It goes from lvl 1
monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed."* Offered
the ways to get there, they chose **"Rebuild for 5x"**: first change how the
phone builds the map, then make every land five times longer.

This is the first step. **Nothing changes on screen.** Every cell of the
ground, every wall and every object is exactly what it was. What changes is
how much the phone has to build, and when.

## Why the map could not just be made bigger

On the way into the Wheel, the phone's ground worker built the **whole map**
in one go: the blueprint (what every 24 x 24 game px cell is), the swatch map
(which ground picture covers each cell), the walls (where water stops you) and
the objects (where every tree, rock and building stands).

Measured on this repo's test box, building the whole map in Node:

| Lands | Cells | Time | Memory at its peak | Objects |
|---|---|---|---|---|
| today's | 1,792 x 1,792 (3.2 M) | ~2.3 s | ~47 MB | 12,635 |
| 2x longer | 3,328 x 3,328 (11 M) | ~5.5 s | ~163 MB | 25,202 |
| 3x longer | 4,672 x 4,672 (22 M) | ~9.4 s | ~233 MB | 38,177 |
| 5x longer | 7,456 x 7,456 (56 M) | ~23.5 s | ~594 MB | 63,657 |

An iPhone tab dies at about 250 MB (docs/MEMORY-PLAN.md). Even 2x longer would
not fit, so the phone has to build only the part of the map round you.

## What the phone builds now

**Blocks** (`public/tools/world/core/worldblocks.js`). The map is cut into
blocks of 128 x 128 cells (3,072 game px, about two phone screens). For each
block the worker builds a blueprint of the block and a margin round it
(`layout.js buildBlueprint(plan, rect)`), the swatch map from that
(`ground.js materialMap`), and the walls (`walkBits`, `swimBits`), and keeps
the block's own cells. A block takes about 16 ms in Node.

The worker builds the blocks under each piece of ground the game asks for,
and the ones next to yours while it has nothing else to do (`idleBlock`). It
keeps the 48 nearest and lets the rest go.

**Walls by block.** Each block's walls go to the game as the block is built
(the worker's `block` message). The game's walk grid (`src/game/wheelTrial.js
lazyGrid`) reads them. A cell in a block not built yet reads as **open**: the
worker builds a block before laying any ground on it, so it is ground you
cannot see yet. A reader that needs walls far from any ground laid asks for
them with `wheelBlocksAround(x, y, r)` (`window.__btWheelBlocks` in tests).

**Baked objects and overview** (`tools/world/bake-wheel-world.mjs`). Where the
objects stand cannot be worked out a block at a time: `placeObjects` places
each one clear of the ones placed before it, in one order over the whole map.
So the objects, the overview picture and the land colours are worked out once
from the standard plan and saved in `public/world/placed/`:

| File | What | Size |
|---|---|---|
| `objects.bin` | every object's kind, picture, flip and place (`core/placedfile.js`) | 138 KB |
| `overview.png` | the whole map small, in the plan's colours (minimap, world map) | 14 KB |
| `lands.png` | which land each overview pixel is in (the flat land colours) | 8 KB |

`public/tools/world/core/placed.js` (generated) names them, with a fingerprint
of all three as the address they are fetched at, so a new bake is a new
address (`public/_headers` lets the phone keep them a year).

The worker uses the baked files only when its own plan's fingerprint
(`planFingerprint`: the plan, the object catalog and the placing's version)
matches the bake's. Otherwise, and for the previews (`?bigtown=`,
`?plaintown`, `?placing=2`), it builds the whole map for the objects and the
overview, as before. The ground still comes from blocks either way.

**The map, the doors, Mayor Bro and the rivers** come from the plan's
features (`layout.js planFeatures`), which never needed the cells.

## How it stays exactly the same

Clipping each step to a rectangle is not enough, because some steps look
beyond the rectangle:

- **The scattered features** (each land's tree clumps, ponds, cliffs and lava)
  depend on order: a feature is left out where an earlier one already covers
  its middle. A rectangle cannot see what covers a middle outside it. So
  whether a feature stands is worked out at its middle, through the earlier
  features that can reach it, and remembered (`stands`).
- **The bridges** need the river cells round a crossing. They are worked out
  once for the plan, from the river's own discs and the earlier decks.
- **The ground's stages** are averaged over about 28 cells. A block is built
  with that much margin, on the whole map's coarse grid.
- **The walls** look up to 11 cells away (the shallows' width). A block's
  blueprint has that margin too.
- **Everything** is measured from the whole map's corner, so a rectangle does
  the same arithmetic as the whole map and gets the same bits.

## Tests

- `tools/world/test-world-core.mjs`, "the Wheel in blocks (v2.3.3298)":
  - every block and 30 odd rectangles of the blueprint equal the whole map's,
    cell for cell, on the plan and on the plan with boardwalks;
  - every block's swatches, regions, tiers, fresh water and walls equal the
    whole map's;
  - pieces of ground laid from blocks equal pieces laid from the whole map
    (made-up pictures for every ground and the water, so every path that
    uses a picture runs);
  - the baked files are the plan's, and read back exactly.
  - The suite: 443 passed, 0 failed.
- Phone scenarios on this build: `wheelhome` 18/18, `wheelshore` 14/14,
  `wheelswim` 30/30, `wheelmap`, `wheeldoors`, `wheelwaves`, `sprint` all
  pass, `questline` (CI's *playable*) 99/99, `membudget` 11/11.
- `mp-wheelobjects` fails 2 and `mp-wheelnodes` fails 1 check, the same ones
  on main's own build (stale expectations: the townsfolk added since, an
  oasis whose palms are off screen, a fishing spot's one dry probe).
- `mp-wheelswim` now asks for the blocks it searches (the open sea is 260
  cells away), and `mp-wheelnodes` waits for the ground under a tree it jumps
  to: a jump that far now waits for its blocks, as no walk does.

## Memory

The memory budget's trip (BroTown, a Flame Fields fight and home, three
times), the ground worker at its highest:

| | heap | buffers | all workers |
|---|---|---|---|
| main | 2.1 MB | 26.6 MB | 30.8 MB |
| this | 5.3 MB | 19.5 MB | 26.9 MB |

On arrival in BroTown the worker holds 15.7 MB, against 20.6 MB before.

## Step 2

Make every land five times longer (`plan.js wheel.tierZones`), bake again, and
place five times the monsters so the land is as busy as now. That step also
needs the overview at a coarser scale (a whole-map picture five times wider
would be 13 MB on the phone), the previews either baked or retired (building
the whole map is what no phone can do at 5x), and the server resting monsters
nobody is near.
