# The farm you walk (v2.3.3124)

> Owner, 2026-10-06: *"Hold on I don't want this type of farming. I want your
> character to be able to walk around on the farm. I want the planting process
> to happen by your character taking action on the plot of ground. You dig,
> you water, you fertilize, etc. you can use the firemaking animation for all
> of that. I don't want the game to just be reading a bunch of boring menus.
> Make the timer appear above the crop that was planted and any next steps it
> needs (next in sequence like "Needs Watering") etc"*
>
> And of the old farm map: *"This map isn't suited for a farm. It was an early
> idea of having it be in a cave."*

Until now the beds lived in the Feed & Seed's window: pick a tool, tap a
square. Now they lie on **your farm**, a place you walk on, and you work each
one by kneeling at it. The worker's farm is unchanged (`docs/specs/farm.md`):
the same six beds, the same steps, the same `farm_act` message. Only where you
take the steps, and what you see, has changed.

## How it plays

1. **Getting there.** The Feed & Seed's **Visit Your Farm** (now at the top
   of its window) or the Land Office. You arrive at the farm's gate under the
   farm's loading screen, which lifts once everything the farm draws is in
   (below).
2. **Walk up to a bed.** Over every bed floats its **next step** as a picture
   (a spade, a sprout, a watering can, a sack of compost, a basket) and its
   **timer** while it grows. The bed you are nearest also says it in words:
   *"Needs Digging"*, *"Needs Planting"*, *"4m 12s · Needs Watering"*,
   *"Needs Fertilizer"*, *"Ready to Harvest!"*.
3. **Take the step**, any of four ways:
   - the button over the dashboard ("Dig", "Plant Carrot", "Water",
     "Fertilize", "Harvest"), beside the bed you are at;
   - a tap on the right stick, which wears the step's picture there;
   - **E** on a keyboard;
   - a tap on the bed itself.
4. **You kneel and work it.** You are seated at the bed's back, facing the
   screen, and play the fire-lighter's kneel (the firemaking strip's first
   three frames) with a mound of earth drawn where its log was. Dirt, seeds,
   water or compost fly from your hands at each lean, with a sound each
   (recordings already in the game: the dirt footstep at different speeds,
   the lure's plop for water).
5. **When the kneeling ends** the step goes to the worker as one `farm_act`.
   The bed changes when the worker answers; a harvested crop flies from the
   bed to your bag.
6. **Walk away** (or die) while kneeling and the step is dropped. Nothing is
   sent.

| Step | Kneels for | Leans |
|---|---|---|
| Dig | 1.5 s | 3 |
| Plant | 1.1 s | 2 |
| Water | 1.15 s | 2 |
| Fertilize | 1.1 s | 2 |
| Harvest | 1.25 s | 3 |

**The order of steps** is the worker's: dig, plant, water, fertilize,
harvest. Water and fertilizer stay optional on the worker (a crop ripens dry
and unfed), so a ripe crop offers **Harvest** whatever was skipped. While a
crop is watered and fed, only its timer shows: there is nothing to do.
`src/game/farmWork.js` `bedNext` is that rule, and `farmwalk.test.mjs` walks a
bed through the worker step by step to prove the two agree.

**What a step needs is said before you kneel,** over the bed: *"No seeds: the
Feed & Seed sells them"*, *"No compost: the Feed & Seed sells it"*,
*"Growing: 4m 12s"*, *"The farm is closed for now"*, or "Reconnecting…" while
the socket is down.

**Which seed is planted:** the one you picked, while you hold it; else the
last kind you planted; else the first you hold in the crop order that your
Farming level can plant. With two or more kinds in the bag, each kind's ripe
picture sits over the button and a tap picks one. That is the only choice
farming asks of you, made where you stand.

## The farm

`src/data/farmLayout.js` is the one copy of where everything is. The ground's
bake, the renderer, the walk test, the zone's tile grid and the tests all read
it.

- **32 × 44 tiles** (1024 × 1408 game px), taller than wide so an upright
  phone sees the yard and the beds at once.
- **Six beds** (the worker's free deed) in two rows of three in front of the
  barn, each 98 × 72 game px, the size of the owner's bed pictures.
- **The barn** (the owner's picture) is the **Pet House**: its big door opens
  it. The **haystack** is your bed for the night ("Sleep in the hay") and the
  **notice board** opens the **Dungeon Workshop**, both until the owner's
  Farmhouse and Workshop pictures come (`docs/art/FARM-ART-PROMPTS.md`).
- **41 things** stand on it: the barn, the scarecrow, the wheelbarrow, the
  compost bin, the seed sacks and the tool rack from the owner's farm art, and
  orchard trees, oaks, bushes, flowers, fences, a well, a trough, hay bales
  and the gate from the Wheel's own object sheets. Each is drawn at its foot
  and sorted with you, so you walk behind the barn and in front of the
  wheelbarrow. Their footprints stop your **boots**, as the Wheel's objects
  do.
- **The gate** at the bottom left leads back to the Wheel, to the door you
  left by (the dungeon's way back: `setWheelArrival`).
- **The light** is the Wheel's sun with the commons' shade, and everything
  casts a shadow (the barn column by column, the rest as billboards).

### The ground

There is no ChatGPT picture of the ground. A picture that size cannot reach
the art law's 2 picture px a game px (`docs/WORLD-BIBLE.md` §6), so it is
**laid from the owner's own Ground Studio swatches** by
`tools/world/bake_farm_ground.py`:

- the commons' grass (`commons-A` and `commons-B` in big patches) everywhere;
- a yard of packed earth before the barn (`town-yard-A`);
- a dirt path from the gate (`street-A`).

Their edges wander at three scales of noise, never a ruler line, and every
pixel is copied from a swatch: nothing is blended or painted. The result is
`public/maps/farm_v2.webp`, 2048 × 2816 lossless (1.6 MB on disk). It is drawn
smooth, as the Wheel's ground is (`tiledMaps.js` `MAP_SCALE_LINEAR`).
Re-run the bake after moving the yard or the path:
`python3 tools/world/bake_farm_ground.py` (about a minute).

The old cave grotto (`farm_v1`) is no longer drawn.

## What is loaded, and when

The preloading law: nothing on the farm loads the first time it is seen.
`holdFarmUntilReady` (`src/game/farmTrip.js`) raises the zone's loading
screen and holds you still (`S._farmArtHold`) until all of it is in, for at
most 12 s:

- the farm's map;
- every farm picture a bed can turn into while you stand there: every soil,
  every crop's four stages, and the props (`preloadFarmArt`);
- the Wheel's object sheets the farm uses, at an address of the farm's own
  (`?farm=1`), so the Wheel letting go of its copy never takes the farm's;
- the five step pictures;
- the kneel's frames (`ensureStandIn('fire')`, the mound baked in).

Every way onto the farm goes through it: the Feed & Seed, the Land Office,
the old FarmPanel, the game-events trip, and the ways back from a Dungeon
Workshop dungeon (`zoneTransitions.js` and both of `dungeonWaves.js`'s).

**Memory.** Everything is let go on leaving (`freeFarmArt` from
`freeZoneAssets`, the map by `freeZoneMap`). The farm's map decodes to 22 MB,
where the cave's was 6 MB, and the farm's pictures to at most 9 MB, all held
only while you are on the farm.

## Wire and worker

**Nothing changes on the worker.** The steps are the window's own
`farm_act {op, beds: [i], crop?}`, one bed at a time. The bed changes only
when the worker's `farm_state` says so: nothing on the farm changes a bed,
the bag or the XP by itself.

A player who comes by the Land Office before ever opening the Feed & Seed
has no farm yet: the join sends a farm only once there is one
(`_farmOnJoin`). So arriving with no farm described sends a `farm_open`, as
the window does when it opens, and that makes the free deed. It is asked
again every 5 s while it goes unanswered.

Deploy order: everything rides on `caps.farm`. Against a worker without it
(or with the `farm: false` kill switch), the beds are drawn as plots of
grass with no labels, nothing offers a step, and a tap on a bed says *"The
farm is closed for now"*.

## The Feed & Seed's window

The **Beds** tab is gone, with its tools, its drag and its "… all" buttons.
The window is the farm's shop and its order board:

- **Visit Your Farm** at the top, with one line saying how your beds are
  doing: *"Your farm: 3 ready to harvest · 3 beds to plant"*, in green when
  something is ripe;
- **Seeds** (opens first): seeds and compost;
- **Orders**: today's three orders (`docs/specs/farm-orders.md`).

## Files

| File | What |
|---|---|
| `src/data/farmLayout.js` | Where everything is: the zone, the ground's recipe, the beds, the spots, the gate, the 41 things, the edge, `farmBlockers()`. |
| `src/game/farmWork.js` | The pure rules, no imports beyond data: the steps' times and frames, `bedNext`, a crop's stage and its soil, the timer's words, the bed in reach, the seed to plant. Node-tested. |
| `src/game/farmWalk.js` | Per frame: the bed in reach (`S._nearBed`), a step's sounds, its end or its being walked away from; `startFarmStep` (the refusals, the seat, `S._farmWork`); asking for an undescribed farm. |
| `src/game/farmTrip.js` | `holdFarmUntilReady`: the loading screen until the farm is all there. |
| `src/rendering/farmWorld.js` | Draws the farm: the things, the beds and their crops, the labels, the bits from your hands; the pictures' loading and freeing; the shadow casters. |
| `src/ui/mobile/FarmBedPrompt.jsx` | The step's button and the seed picker. |
| `src/rendering/systems/effectsRenderer.js` | The kneel: the firemaking strip's frames 0–2 with the mound (`public/sprites/skills/farm-mound.png`, from `tools/make_farm_mound.py`) composited after the skin bake, so its browns are never recoloured as skin. |
| `public/ui/controls/farm-*.svg` | The five step pictures (the stick, the labels, the button). |
| `tools/world/bake_farm_ground.py` | The ground's bake. |
| `tools/world/add-farm-art.mjs` | The owner's farm sheets cut into `public/world/farm/` and `src/data/farmArt.js`. |

## The owner's pictures

`tools/world/add-farm-art.mjs` cuts the owner's six ChatGPT sheets (from
`docs/art/FARM-ART-PROMPTS.md`) into 76 game sprites in `public/world/farm/`
with a manifest: each crop's four stages, the soils, the barn and the props.
`src/data/farmArt.js` lists each picture's size and foot (a plant's or a
prop's base, a bed's middle). The Farmhouse and the Dungeon Workshop are the
two pictures still to come.

## Testing

- **Server:** `server/test/farmwalk.test.mjs` (in `npm test`):
  1. the kneel: each step's time, its frames standing at both ends, its
     leans;
  2. `bedNext`'s words, the timer, the crop's stage and soil;
  3. **the worker agrees:** a bed walked from grass through `GameRoom`'s
     `farm_act` by exactly the steps the game offers, nothing offered while it
     only grows, a ripe bed harvested, and a dry ripe bed offered Harvest,
     never Water;
  4. the seed to plant and the bed in reach;
  5. the layout and its pictures (the ground's WebP header read for its size;
     every thing's picture on disk; every crop's four stages);
  6. **a walk** on an 8 px grid from the arrival: every bed, the three spots
     and the gate reachable, each kneel spot open ground;
  7. the tile grid: open ground but for the exit under the gate;
  8. every way onto the farm holds you under its loading screen.
- **On a phone:** `tools/qa/mp/mp-farmwalk.mjs`
  (`node tools/qa/mp/run.mjs farmwalk`, 20 checks). Onto the farm under its
  loading screen; all 41 things and the step pictures drawn; E kneels (the
  farm's frames, the body hidden) and sends one `farm_act`; the seed picker;
  the stick's tap plants, a tap on the bed waters, the button fertilizes;
  no compost refused; walking away cancels; ripe labels; the harvest pays 3
  carrots and flies them to the bag; the barn's wall stops your boots; the
  gate leads back to the Wheel.
- `mp-farm` (the window: Seeds first, no beds, the summary line following the
  worker's farm, the kill switch), `mp-farmorders` and `mp-wheeldoors` (the
  farm's gate) still run.

## Not yet

- The **Farmhouse** and **Dungeon Workshop** pictures (prompts in
  `docs/art/FARM-ART-PROMPTS.md`); until then the haystack and the notice
  board stand in.
- More beds from the Land Office's paid land, and friends visiting
  (`docs/FARMING-PLAN.md` Phases 3 and 4).
- **Everyone's farm is the one zone, `farm_home`**, as it always was: two
  players on their farms at once see each other walking there, each among
  their own beds (the beds are drawn from each page's own `farm_state`). A
  farm of your own -- a zone per player, or the other players hidden there --
  is the plan's Phase 4 question, with visiting.
