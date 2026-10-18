# The farm you walk (v2.3.3136; the farmer's own moves v2.3.3345)

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
>
> And then, of the kneel: *"Cooking animation might be better. You can use
> something to occlude the part where the pan or log is."*
>
> And then (2026-10-17): *"Do any animations need to be built? I'd like to
> have animations during the farming process perhaps on a sprite sheet."* They
> made three sheets from the prompts they were given (v2.3.3345, "The
> farmer's own moves" below).
>
> And of the first cut (2026-10-18): *"How do you want me to add armor and the
> shirt? Do you want to give me the south facing idle character wearing each
> and give me a prompt to put it on each of the 3 outputs? The sleeves aren't
> right during the animation while wearing the shirt. Whole arm was green"*.
> They made the six dressed sheets that plan asked for.

Until now the beds lived in the Feed & Seed's window: pick a tool, tap a
square. Now they lie on **your farm**, a place you walk on, and you work each
one where it lies: with a hoe, a watering can, or kneeling with your hands in
the soil. The worker's farm is unchanged (`docs/specs/farm.md`):
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
4. **You work it.** You stand at the bed's back, a little left of its
   middle, facing the screen, and work it in the owner's own moves (below,
   "The farmer's own moves"):
   - you **dig** with a hoe, swung twice;
   - you **water** from a can;
   - you **kneel** with your hands in the soil to **plant**, **fertilize** and
     **harvest**.

   Each time the work lands (the blade strikes, the water reaches the soil,
   the hands press in), dirt, water, seeds or compost fly from that spot. Each
   comes with a sound, from recordings already in the game: the dirt footstep
   at different speeds, the lure's plop for water. A harvest's leaves fly from
   the crop.
5. **When the step ends** it goes to the worker as one `farm_act`. The bed
   changes when the worker answers; a harvested crop flies from the bed to
   your bag.
6. **Walk away** (or die) mid-step and the step is dropped. Nothing is sent.

| Step | Takes | Move | The work lands |
|---|---|---|---|
| Dig | 1.5 s | the hoe, swung twice | twice (the blade striking, frame 5 of each swing) |
| Plant | 1.1 s | the kneel | twice (frames 3 and 5) |
| Water | 1.15 s | the can, one pour | twice (frames 4 and 6) |
| Fertilize | 1.1 s | the kneel | twice (frames 3 and 5) |
| Harvest | 1.25 s | the kneel | twice (frames 3 and 5) |

**The order of steps** is the worker's: dig, plant, water, fertilize,
harvest. Water and fertilizer stay optional on the worker (a crop ripens dry
and unfed), so a ripe crop offers **Harvest** whatever was skipped. While a
crop is watered and fed, only its timer shows: there is nothing to do.
`src/game/farmWork.js` `bedNext` is that rule, and `farmwalk.test.mjs` walks a
bed through the worker step by step to prove the two agree.

**What a step needs is said before you start it,** over the bed: *"No seeds: the
Feed & Seed sells them"*, *"No compost: the Feed & Seed sells it"*,
*"Growing: 4m 12s"*, *"The farm is closed for now"*, or "Reconnecting…" while
the socket is down.

**Which seed is planted:** the one you picked, while you hold it; else the
last kind you planted; else the first you hold in the crop order that your
Farming level can plant. With two or more kinds in the bag, each kind's ripe
picture sits over the button and a tap picks one. That is the only choice
farming asks of you, made where you stand.

## The farmer's own moves (v2.3.3345)

The owner asked for animations on a sprite sheet. They were given three
prompts and one reference picture (the fire-lighter with his log taken out),
and made three sheets in ChatGPT: eight frames each, in a 4 × 2 grid of
384 × 512 cells on flat magenta. Then, to dress him, each sheet again with the
bro in the game's white tee and again in its steel armour, from two reference
pictures of the game's own walking bro so dressed (`docs/art/`). All nine are
kept as they were sent, in `tools/farm_anim_src/`:

| Sheet | Plays for | Dressed |
|---|---|---|
| `hoe.png`: digging | Dig | `hoe-tee.png`, `hoe-armour.png` |
| `water.png`: the watering can | Water | `water-tee.png`, `water-armour.png` |
| `kneel.png`: hands in the soil | Plant, Fertilize, Harvest | `kneel-tee.png`, `kneel-armour.png` |

**Cut by `tools/make_farm_anims.py`** (numpy and Pillow, about 75 s, the same
output every run). It:

1. takes out the magenta, edges included, so there is no pink fringe;
2. lifts the tool off the man into a strip of its own: the hoe (handle,
   blade and the dirt it throws) and the can (and its water). The game
   repaints the man's skin, trousers and boots in yours, and would take the
   can for trousers, the blade for a boot and the handle for skin;
3. lines the frames up. ChatGPT drew the hoe's man drifting 19 px left across
   a row, and its second row 40 px higher than the first (the kneel's 13 px).
   Each frame is moved so his boots (or the ground he kneels on) and his face
   stay put;
4. brings the three to one size: his head is 64 px wide, ears to ears, in
   every strip (ChatGPT drew the three heads at 143, 121 and 114 px);
5. cuts the clothes out of the dressed sheets. ChatGPT kept every pose, so
   each dressed frame is laid on the bare one by the skin of his head (within
   4 px; never by the eyes, which each drawing splits differently round the
   pupil) and cut with the bare frame's own shift and scale:
   - the **shirt**: the white cloth and its black edge, never on his trousers,
     boots or the tool;
   - the **plate** and the **greaves**: the steel and its edge, split by what
     lies under it in the bare frame. Over skin it is the plate (arms, chest),
     over trousers and boots the greaves. The chain-mail belt rides with the
     greaves, over the trousers' top;
   - the **body under greaves**: the bare body with every trouser and boot
     pixel the greaves do not cover taken out, so nothing of them shows round
     the plates;
6. finds the top of his head in each frame, for your hat.

It writes:

- `public/sprites/skills/farm-{hoe,water,kneel}.png`: the man;
- `farm-{hoe,water,kneel}-greaves.png`: the man under greaves;
- `farm-{hoe,water}-prop.png`: the tool;
- `public/sprites/gear/{shirt/tshirt,chest/steelplate,legs/steelgreaves}/farm{hoe,water,kneel}-south.png`:
  the shirt, the plate and the greaves;
- the GENERATED `src/data/farmAnims.js`: each strip's frame size, the point
  between his boots, where the work lands, and the crowns.

Re-run it after a sheet changes: `python3 tools/make_farm_anims.py`.
`PREVIEW=<dir>` also writes contact sheets of every outfit the game can put
together (bare, the tee, plate and greaves, greaves under the tee, the plate
over trousers): a misfit between the sheets shows in the mixed ones.

**He is dressed as you are** (effectsRenderer `_updateFarmWork`), as every
gathering figure is, in this order:

1. his skin, trousers and boots are repainted in yours (`recolorStandInSkin`,
   the lumberjack's repaint). Under greaves, the body cut for them;
2. your greaves, in their metal (`_tintGearSprite`);
3. your shirt, in its colour, with its print and pattern
   (`_placeSwingShirt`), hidden under a plate;
4. your plate, in its metal;
5. the hoe or the can, as drawn;
6. your hair, hat and beard on his head, sized to it (`FARM_ANIM_HEAD / 51`,
   the fire-lighter's rule).

Every garment shows the frame the body shows. All nine garments are loaded
behind the farm's loading screen whatever you wear, since the character menu
can dress you on the farm and a layer cut on its first draw is a hitch. Put
greaves on or take them off there and the body is baked again, the other
cut, at once (`_farmUnderWanted`: asked each frame on the farm, so a change
made while a bake was on its way is caught too).

The clothes are drawn on him, so they follow his arms in every frame:
v2.3.3345's first cut made the shirt out of the bare body, and wherever an arm
crossed in front of him the whole arm came out in the shirt's colour. Garments
drawn on their own never line up: the fire-lighter's still need a nudge every
frame (`FIRE_GEAR_REG`). These lie within a pixel of the body.

**Not dressed yet: your drawings** (no fitted regions for these poses).

**In time** (`src/game/farmWork.js`), each step plays its move's eight frames
as whole turns that fill its time exactly. A step always ends on the eighth
frame, the pose it began in:

- the hoe's turn is 750 ms, so a dig is two swings;
- a watering is one pour;
- a plant, a compost and a harvest are one kneel each (the harvest's stretched
  to 1.25 s).

Each frame has its own time (`FARM_ANIM_TURN`): the hoe is raised slowly,
swung down fast, and the strike is held. The bits fly and the sound plays when
a work frame begins (`FARM_ANIM_BEATS`), from where the work lands in that
strip (`work`), so the dirt never flies before the blade strikes.

**His size.** His head is drawn 31.25 world px (`FARM_ANIM_HEAD_WORLD`), a
little over your walking head's 28.5. ChatGPT drew this bro a little
big-headed, so at your head's size he stood 11% shorter than you. Now he
stands your height: 101 world px with the hoe and 107 with the can, against
your 106 (mp-farmanim).

**Where he stands.** The point between his boots is put where yours are: on
the bed's back edge, 12 game px in and 19 left of its middle
(`FARM_KNEEL_DY`, `FARM_KNEEL_DX`). The hoe strikes and the hands go in at
the bed's edge, and the can pours over its middle.

**Until he is made** (`farmFigureReady`), your walking body stays drawn and
the step still goes to the worker. The farm's loading screen waits for him
(`holdFarmUntilReady`, at most 12 s), so in practice he is always there.

**Gone with it:**

- v2.3.3136's kneel in the cook's figure;
- the four crates that stood where the pan was;
- their tool and data (`make_farm_covers.py`, `farmCovers.js`,
  `farm-cover-*.png`).

The cook at the campfire is unchanged.

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
- the farmer's moves (`ensureStandIn('farm')`): the three bodies in your
  skin, trousers and boots, the hoe and the can, the three shirt layers, and
  your shirt's print or pattern on them.

Every way onto the farm goes through it: the Feed & Seed, the Land Office,
the old FarmPanel, the game-events trip, and the ways back from a Dungeon
Workshop dungeon (`zoneTransitions.js` and both of `dungeonWaves.js`'s).

**Memory.** Everything is let go on leaving (`freeFarmArt` from
`freeZoneAssets`, the map by `freeZoneMap`). The farm's map decodes to 22 MB,
where the cave's was 6 MB, and the farm's pictures to at most 9 MB, all held
only while you are on the farm.

The farmer's moves are let go on leaving too (effectsRenderer `_freeFarm`):
the three bodies (kept on the graphics chip only), the hoe and the can, the
shirt layers and their dressed copies. The biggest two are the hoe's body
(1.35 MB) and the hoe itself (1.56 MB). On the farm the page holds 102.1 MB on
the graphics chip, where v2.3.3136's kneel held 104.6 MB (mp-farmwalk, the
same test on both). That kneel was the cook's figure, two 4.3 MB strips kept
after you left the farm. Nothing of the farmer's is kept now.

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
| `src/rendering/systems/effectsRenderer.js` | The farmer's moves: made (`_makeFarm`, `_bakeFarmBodies`, the body under greaves when you wear them), drawn at the step's frame with your greaves, shirt and plate, the tool and your head's traits (`_updateFarmWork`), let go of (`_freeFarm`). |
| `src/data/farmAnims.js` | GENERATED by `tools/make_farm_anims.py`: each strip's frame size, the body under greaves (`under`), the point between his boots, where the work lands, the crowns. |
| `tools/make_farm_anims.py` | Cuts the owner's three sheets and their six dressed copies (`tools/farm_anim_src/`) into the farmer's strips, tools, bodies under greaves, and shirt, plate and greaves layers. |
| `src/data/farmArtUrl.js` | A farm picture's address, as data, so the network's code (`farmFeedback.js`) imports no renderer. |
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
  1. the farmer's moves: each step's move, every frame shown in order and the
     last held at the end, the work landing at its frames' start (two swings
     a dig), and the strips, bodies under greaves, tools and shirt, plate and
     greaves layers on disk at the sizes `farmAnims.js` says, with their boots,
     work and crowns inside the frame; every garment there in every frame and
     lying on him (the tee 98% over his body at least, the plate 75%, the
     greaves 85%: the shoulder plates stand out of his outline), and the body
     under greaves the body trimmed, never more;
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
  (`node tools/qa/mp/run.mjs farmwalk`, 24 checks). Onto the farm under its
  loading screen; all 41 things and the step pictures drawn; E digs with the
  hoe, dressed in plate and greaves for the check, the hoe drawn over him and
  his boots on yours, and sends one `farm_act`; each step pictured
  (`out/farmwalk-work-dig.png`, `out/farmwalk-kneel-<step>.png`); the seed picker;
  the stick's tap plants, a tap on the bed waters, the button fertilizes;
  no compost refused; walking away cancels; ripe labels; the harvest pays 3
  carrots and flies them to the bag; the barn's wall stops your boots; the
  gate leads back to the Wheel.
- **The moves on a phone:** `tools/qa/mp/mp-farmanim.mjs`
  (`node tools/qa/mp/run.mjs farmanim`, 41 checks). It dresses the player
  (deep skin, blue trousers, red boots, a green tee, a red cap, a blonde beard)
  and checks:
  - the moves are made before the farm's loading screen lifts, in those
    colours;
  - dig, plant, water and fertilize each show their move's eight frames one by
    one (`out/farmanim-<step>-<frame>.png`), his boots on yours and your
    walking body put away in every frame;
  - the shirt is over him and the tool over both;
  - he stands your height with the hoe and with the can;
  - each step ends in one `farm_act` the worker takes;
  - in armour, on bed 1 (`out/farmanim-armour-<step>-<frame>.png`): copper
    plate and greaves with the hoe, the greaves under the tee kneeling, the
    plate over his trousers with the can. In every frame the garments worn are
    drawn and no others, the tee hidden under the plate, the body under greaves
    the one cut for them, each garment on the body's frame, in the order body,
    greaves, shirt, plate, tool, and in the copper his walking figure wears;
  - leaving the farm lets every texture of his go, the garments' too.
- `mp-farm` (the window: Seeds first, no beds, the summary line following the
  worker's farm, the kill switch), `mp-farmorders` and `mp-wheeldoors` (the
  farm's gate) still run.
- mp-farmwalk's memory check (the farm holding less than the Wheel, the two
  together) fails, and fails the same way on main (v2.3.3345: the farm 102.1
  MB on the graphics chip, 104.6 on main, the Wheel 71.3). Most likely since
  v2.3.3190, which cut the Wheel's from about 104 MB to 72 by keeping its
  ground and objects as colour numbers (CLAUDE.md, "Memory is budgeted"); the
  farm's 22 MB map is not kept that way.

## Not yet

- **The farmer's drawings** (above). His shirt and armour came with the
  owner's six dressed sheets (v2.3.3345).
- **Two small specks** in the outfit with greaves under the tee: a few
  pixels of trouser colour at the kneel's left foot (its second frame) and
  beside the can's splash (its fourth). Each is a pixel or two at phone
  size.
- **Other players see you standing at a bed** while you work it: the steps go
  only to the worker, which tells no one else, as since v2.3.3136.
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
