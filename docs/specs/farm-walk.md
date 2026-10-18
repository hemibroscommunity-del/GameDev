# The farm you walk (v2.3.3136; the farmer's own moves v2.3.3439)

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
> made three sheets from the prompts they were given (v2.3.3439, "The
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

## The farmer's own moves (v2.3.3439)

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
   - (v2.3.3472) the plate and greaves **in the game's own greys**: ChatGPT
     painted a pale, chalky steel (the plate's middle grey 0.60 where the
     walking plate's is 0.46; the watering can's sheet cream), a different
     metal beside the walking, cooking and chopping armour and a lighter one
     again once a metal's tint multiplies it. Each strip's steel is graded to
     the walking strip's (`jog-south`): each pixel's lightness moved to the
     same place in the walking steel's spread of lightness (41 quantiles, the
     order of light and dark kept -- the shading as painted), its colour the
     walking steel's own near-grey (`steel_like_the_game`). The owner: "the
     armor art does not match what the character is wearing in the game while
     farming ... See what other animations do" (before and after, beside the
     walking and cooking steel: `docs/art/farm-armour-before-after.png`);
   - the **body under greaves**: the bare body with every trouser and boot
     pixel the greaves do not cover taken out, so nothing of them shows round
     the plates. A boot is boot grey below or beside the trousers, or a grey
     piece lying wholly below his waist: the kneel's boot as he leans forward
     and the can's toe beside the splash were too far from their trousers
     for the first two rules, and showed as two specks in your colours until
     that third rule (the `farmwalk` suite now fails on any such speck);
6. finds the top of his head in each frame, for your hat.

It writes:

- `public/sprites/skills/farm-{hoe,water,kneel}.png`: the man;
- `farm-{hoe,water,kneel}-greaves.png`: the man under greaves;
- `farm-{hoe,water}-prop.png`: the tool;
- `public/sprites/gear/{shirt/tshirt,chest/steelplate,legs/steelgreaves}/farm{hoe,water,kneel}-south.png`:
  the shirt, the plate and the greaves;
- the GENERATED `src/data/farmAnims.js`: each strip's frame size, the point
  between his boots, where the work lands, the crowns, and where your
  drawings go (`ink`, below).

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
v2.3.3439's first cut made the shirt out of the bare body, and wherever an arm
crossed in front of him the whole arm came out in the shirt's colour. Garments
drawn on their own never line up: the fire-lighter's still need a nudge every
frame (`FIRE_GEAR_REG`). These lie within a pixel of the body.

**Your drawings** -- face, chest and arms -- go on him too, where the tool
measured each on each frame (`ink` in `farmAnims.js`). It is the shape of
the lumberjack's, cook's and fire-lighter's tables in
`src/rendering/standInInk.js`, which were fitted by eye; these are measured
(`ink_regions`), 24 frames:

- **seeds**: points and lines the game's split (playerDecal
  `splitSkinBySeeds`) floods out from over his skin, first the head's, then
  the chest's, then the arms'. The head is seeded right across, at his
  cheeks and his jaw, so it claims his whole face first; his shoulders, each
  on its own, a few pixels clear of his face; his neck down to the tee's
  neckline at his middle;
- **face** and **torso**: the boxes the face and chest drawings are fitted
  to, the chest's including what an arm or the can hides;
- **armCuts**: on the hoe's strike (frames 3 and 4) both hands hold the
  handle and his arms are one piece of skin. The game fits the arm drawing
  to each arm piece, so one drawing was stretched over both arms and the
  gap between them; a one-pixel column at the hands is left out of the arms
  (`_stampStandInInk`), and they are two again.

Three things the measuring had to get right, each found on the preview
(`PREVIEW=<dir>` writes `ink-<move>.png`: head red, chest green, arms blue,
the boxes and the seeds):

- leaning over the bed, his shoulders come up beside his face, joined to it
  by skin. A head outline 1.1 heads wide round the eyes' middle took them,
  and three kneel frames' face boxes were 65-66 px wide where every other
  frame's is 57-60: the face drawing stretched a seventh wider. The head is
  now a round one head wide round the crown's middle;
- his jaw's corners run down beside his neck as skin, past the chin's
  outline, and the head's flood followed them into the chest drawing's box
  (57-105 px of holes on four kneel frames). Nothing under the chin is his
  face: the row under the face's box is seeded chest and its last row head
  (`_fence_chin`);
- with the hoe raised, his collar's lower half was taken for bare arm and
  seeded so, joining both raised arms into one piece across his chest.

His shoulders stay chest, not arm: as arm, the leaning frames' arm pieces
grew to 91-99 px tall against 56-76 standing, and the arm drawing would
change size between frames more than it does (57-66 leaning). He faces you
and is never flipped, so the front drawings, as the cook's. A drawing
changed on the farm bakes him again once the strokes stop, as the
lumberjack's (400 ms).

**The others on the farm see you work.** The steps go only to the worker,
which tells no one else, so until v2.3.3439 everyone else saw you standing at
the bed. Now your move carries the step as its `ex`, `farm:<step>:<n>`
(`farmWork.js` `farmExCode`; `n` counts your steps, so two alike in a row
start over on their screens), the code a lumberjack's move carries as
`chop`. The worker already keeps it and hands it to everyone near you in its
tick (`movement.js`, `tick.js`): **no worker change**. An older screen knows
no such code and draws you standing, as before.

Their screens draw your farmer from it (effectsRenderer `_drawPeerFarmer`):

- the step's move from its first frame, on their own clock from when the
  code came in, at your boots, your size and build;
- in your colours and with your drawings: their own farmer when you wear
  their colours and neither of you has drawings, else one baked for yours
  (`_peerFarmFigure`, `_peerFigFrames`, one per colours and drawings), under
  greaves the body cut for them;
- your greaves, shirt (with its print) and plate in their metal, the hoe or
  the can, your hair, hat and beard, in that order;
- the step's sound where its work lands, at your share by distance
  (`FARM_BEAT_SOUND`, the table your own steps play from).

Your walking body is hidden on their screen only while the figure is drawn
(entityRenderer asks `_peerFigureReady`), so until it is made you are seen
standing. Memory: a baked figure is 0.7-1.7 MB (the kneel to the hoe),
inside the 16 MB every peer figure shares (`PEER_FIG_BUDGET`), let go of
15 s after nobody drew it, and everything of it at once on leaving the farm
(`_freeFarm`). Their parse (`parseFarmEx`) takes a step only by name (never
`__proto__`) and nothing longer than 16 characters: the code is relayed, so
anything a player could send.

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
`public/maps/farm_v2.webp`, 2048 × 2816 lossless (1.6 MB on disk), and since
v2.3.3464 its palette twin `public/maps/farm_v2.png` (246 colours, the same
pixels; the game reads it where pictures are drawn as colour numbers), the
two stamped in `tools/world/farm_ground_stamp.json` and held to each other by
`server/test/palette.test.mjs`. It is drawn
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
only while you are on the farm. Since v2.3.3464 they are kept as colour
numbers, one byte a pixel, as BroTown's ground and objects are
(`src/rendering/paletteLoad.js`; the map read from its palette twin
`public/maps/farm_v2.png`, which the bake writes beside the WebP): the map,
the pictures and the borrowed sheets' pages hold 10.4 MB where they held
about 42, and the graphics chip holds 27 MB less on the farm. See
`docs/specs/palette-textures.md` "The farm".

The farmer's moves are let go on leaving too (effectsRenderer `_freeFarm`):
the three bodies (kept on the graphics chip only), the hoe and the can, the
nine garments (shirt, plate and greaves for each move, cropped, about 1.9 MB)
and the shirt's dressed copies. The biggest two are the hoe's body (1.35 MB)
and the hoe itself (1.56 MB). On the farm the page holds 104.5 MB on the
graphics chip (102.1 before the garments came), where v2.3.3136's kneel held
104.6 MB (mp-farmwalk, the same test on both). That kneel was the cook's
figure, two 4.3 MB strips kept after you left the farm. Nothing of the
farmer's is kept now.

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
  (`node tools/qa/mp/run.mjs farmanim`, 81 checks). It dresses the player
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
  - in armour, each of the three outfits on each of the three moves, beds 1-3
    (`out/farmanim-armour-<bed>-<step>-<frame>.png`; v2.3.3472, the owner:
    "Make sure armor combos work too (just wearing legs or just wearing
    torso)"): copper plate and greaves, copper greaves under the tee, the
    copper plate over his trousers -- with the hoe, kneeling and with the can.
    In every frame the garments worn are drawn and no others, the tee hidden
    under the plate, the body under greaves the one cut for them (his trousers
    and boots under the plate alone), each garment on the body's frame, in the
    order body, greaves, shirt, plate, tool, in the copper his walking figure
    wears, and shining as his walking armour does (the sheen's slots hold the
    garments worn and no others);
  - leaving the farm lets every texture of his go, the garments' too.
- **Your drawings on him:** `tools/qa/mp/mp-farmink.mjs`
  (`node tools/qa/mp/run.mjs farmink`, 23 checks). A face drawing on its left
  half in blue, the chest green, the arms pink; every frame of the three moves
  read as baked against the strip as shipped
  (`out/farmink-<move>[-greaves].png`): the face drawing in the face's box
  only, on its left half; the chest drawing in the chest's box only; the arm
  drawing on both arms, nothing in the hoe's cut; every drawn pixel on his
  skin; the face redrawn on its right half on the farm, baked again; under
  greaves, the body cut for them carries them too. The `farmwalk` suite runs
  the game's own split on the shipped strips: nothing of his face under his
  chin, a chest in its box, two arms each frame.
- **The others see you work:** `tools/qa/mp/mp-farmpeer.mjs`
  (`node tools/qa/mp/run.mjs farmpeer`, 17 checks). Two phones on the farm:
  Digger (deep skin, blue trousers, red boots, copper greaves under a green
  tee, a red cap) digs while Watcher stands by. On Watcher's screen: the code
  off the wire; Digger's farmer drawn with the hoe through the swing and his
  walking body put away; at his boots; in a figure baked for his colours, the
  body cut for greaves; greaves (in his copper), tee, hoe and cap in that
  order; the strike heard; his walking body back after. In Watcher's colours
  and no greaves, drawn from Watcher's own farmer. Leaving lets it all go
  (`out/farmpeer-swing.png`).
- `mp-farm` (the window: Seeds first, no beds, the summary line following the
  worker's farm, the kill switch), `mp-farmorders` and `mp-wheeldoors` (the
  farm's gate) still run.
- mp-farmwalk's memory check passes (24 of 24, v2.3.3439): the farm holds
  104.5 MB on the graphics chip and 90.3 cached, 195 together, under its 205
  line, and 0.3 MB of colour numbers (BroTown's 11.1). It used to ask that the
  farm hold less than BroTown, which failed on main too once v2.3.3190 kept
  BroTown's ground and objects as colour numbers (104 MB to 71 on the chip):
  the farm's pictures are still full colour, its 22 MB map the biggest. Main
  asked it as those two questions from v2.3.3399 (#956). Since v2.3.3464 the
  farm's pictures are colour numbers too: 76.7 + 90.3 = 167 MB, and the line
  came down to 177 to keep the saving; none of BroTown's pictures is left
  (`__btPalette()`'s pieces and pages, the farm's own counted apart).

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
