# The World Bible: Brotown and its island (v2.3.2931–2934, DRAFT)

**Status:** a draft for the owner to react to. Nothing in the game uses it
yet. It is the *story and look* of the one seamless world the
[World Builder](WORLD-MAP-PIPELINE.md) paints. The machine-readable version is
`public/tools/world/plan.js`, and **the plan wins wherever they disagree.**
The region, border and plot tables below were generated from it.

> Owner, 2026-09-29: *"I'm considering a full refresh of every map tile. I
> would want your help creating the through lines that tie it all together in
> a cool way … I'm considering a full refresh of the Brotown map too,
> something that allows easy entrance and exits … closer to an 1800's style
> map where there's a Main Street and some buildings line the street. I would
> also redo all the characters including Mayor Bro. I'm needing a consistent
> style across everything, and right now it's not."*

**This document covers:**

1. [The premise](#1-the-premise-a-shard-rush)
2. [The through-lines](#2-the-through-lines)
3. [The regions](#3-the-regions)
4. [The borders](#4-the-borders)
5. [Brotown](#5-brotown)
6. [One look for everything: the style key](#6-one-look-for-everything-the-style-key)
7. [Redrawing the characters](#7-redrawing-the-characters)
8. [Farms, dungeons and interiors](#8-farms-dungeons-and-interiors)
9. [Growing the world, and the load it can carry](#9-growing-the-world-and-the-load-it-can-carry)
10. [Decisions for the owner](#10-decisions-for-the-owner)
11. [Trees, rocks, water and props: objects, not paint](#11-trees-rocks-water-and-props-objects-not-paint)
12. [Built by Bros: buildings, props and people](#12-built-by-bros-buildings-props-and-people)
13. [The ground: paint every square, or bake it from swatches](#13-the-ground-paint-every-square-or-bake-it-from-swatches)
14. [Easy to miss](#14-easy-to-miss)

**v2.3.2933, the owner's second round of decisions,** recorded where they
belong:

- All of today's environment art and every NPC is replaced; the player is
  kept, and monsters may be redone (§7).
- Everything that stands up is a separate object, water included (§11).
- Buildings and NPCs are made "more bro" (§12).
- One scale everywhere: the town's (§6).
- Many rooms, with characters that move between them and one shared
  auction house (§9).

And one question it raises that comes before all of them: **the player is
pixel art and every map is painted** (§6).

---

## 1. The premise: a shard rush

**Brotown is a frontier boomtown.**

- Every region of the island already drops its own elemental shard
  (`src/data/shards.js`: Frost, Ember, Wind, Stone, Thunder, Tidal, Mist and
  Flora, plus the meadow's).
- Word got out. Prospectors came, a town grew where the trails crossed, and a
  railway was laid to haul ore out of the Great Cave.
- That is why the town looks the way it does: a Main Street of wooden
  false-front shops, a bank, an assay office and a rail depot.

**Nobody in town knows what the shards are for. The ruins do.**

- Every region's landmark hides a **keystone**: a round stone disc carved
  with an eight-spoked wheel.
- The wheel is a map of the island: eight spokes for eight regions around one
  hub.
- In the Starting Meadow, **Prospector's Circle** has eight standing stones,
  one for each spoke.
- The hub of the wheel is where the Town Hall stands. The prospectors built
  on top of it without knowing.

**The Convergence is a hook, not a commitment.**

- It is a vault beneath the Town Hall that opens when the eight keystones
  are woken.
- It could become a late-game dungeon or a server-wide event. Nothing
  depends on it.
- The map paints the keystones either way, so the story has somewhere to
  live when it is wanted.

**Why a premise at all.** "Frost, fire, desert, cave …" is a list. A reason
for the town to exist, and one mystery that every region shares, turns it
into a world. It costs nothing to paint and it is the kind of detail that
makes people explore.

---

## 2. The through-lines

These are what make one map instead of eight zones stitched together. Each
one crosses several regions, so walking anywhere you meet one of them.

![The whole island in the blueprint, with every square's name](world/island-plan.png)

*The blueprint the World Builder paints from, the same colours ChatGPT sees
in each square's template:*

- **Tan:** roads.
- **Royal blue:** the Sweetwater River.
- **White:** the railway.
- **Yellow:** the Mill Bridge.
- **Cream:** empty building plots.
- **Blobs:** each region's woods, ponds, cliffs and lava.
- **Coloured discs:** landmarks.

*Regenerate the picture with `node tools/world/render-plan-images.mjs`.*

| Through-line | What you see | Why it matters in play |
|---|---|---|
| **The Old Roads** | Four wagon roads leave the four town gates. Each runs to the heart of the region on its compass point and forks once, turning left, to the diagonal region (North Road → Flame Fields, fork: Frost Trail; East Road → Stone Hollows, fork: Dune Trail; South Road → Water Caves, fork: Foundry Road; West Road → Verdant Wilds, fork: Bog Trail). A waystation (a roadhouse plot) sits at each fork. | Every region is one road and at most one fork from town. New players can never be lost: follow a road back. |
| **The Sweetwater River** | Born as meltwater under the frost glacier. It drops over **Sweetwater Falls** where the frost plateau meets the Wilds, and passes the west gate, where the **Mill Bridge** carries the West Road over it beside the **Old Mill**. On its lower run it divides the Poison Forest from the beaches, then spreads into a delta on the south coast. | A second way home: downstream is always town or the sea. It is also the natural spot for fishing. |
| **The mine railway** | From the **Rail Depot** outside the east gate to the **Great Cave**, with a branch to the **Foundry Dome**. An **abandoned spur** heads for the Buried City and was never finished: its rails are rusted and half-buried in sand. Telegraph poles follow the line, and they lead back to the Post Office & Telegraph in town. | It explains the east side of the map, which is industry, and makes the Hollows and the Foundry feel connected. |
| **The keystones** | The same eight-spoked wheel in every landmark: frozen into the Ice Spires, set in the Buried City's brow, caged in copper at the Foundry Dome, sinking in the Toadstool Ring's mud. | One mystery across all eight regions. |
| **Danger rises outward** | Every region has three bands. The **fringe** is where the frontier reached (a burnt-out fence line, a blighted farm, a quarry). The **heart** is the region itself. The **rim** toward the sea is the wildest part (glacier, volcano flanks, mesas, sea cliffs). | Players read how dangerous a place is from how it looks. Level ranges can follow the bands later. |
| **Designed borders** | Where two regions meet there is a named in-between landscape: steam fields between frost and fire, ash dunes between fire and sand, alpine meadows between frost and jungle (§4). | No hard line where one painting stops and another starts, which was the worst look of the old zone joins. It also gives monster art a buffer (§9). |
| **One sun, one scale, one style** | Daylight from the upper left everywhere, a person the same size everywhere, one style key for every picture (§6). | Consistency, which is the thing the owner asked for. |

---

## 3. The regions

The eight themed zones keep the compass positions they have on the World
View painting, with the town in the middle and the Starting Meadow round it.

**The Wind Dunes will be painted in the same top-down view as everywhere
else.** Its old painting's side-on perspective was an accident. The style
bible now forbids perspective outright, and the mesas are described "seen
from above like everything else".

**Every region is painted in daylight.** The Foundry was painted at night and
the Hollows inside a cave. In one seamless map a hard day/night line at a
border would be the worst seam of all. A region's mood comes from its
materials instead (black iron, glowing crystal), and the game can still
darken a region as you walk in.

### Starting Meadow (the ring round town)

*levels 1–10 today · drops the Verdant Shard*

- **Fringe — the outskirts.** Neat fenced fields of crops and hay just outside town, haystacks, a scarecrow, split-rail fences and cart tracks through short green grass.
- **Heart — the rolling meadow.** Rolling green meadow with wildflowers (white, yellow and purple), lone oak trees and clumps of bushes.
- **Rim — the wild edge.** Taller, wilder meadow grass with thickets, brambles, fallen logs and mossy boulders.
- **Landmark — Prospector's Circle.** A ring of eight weathered standing stones on a grassy knoll, around a round, flat stone slab carved with an eight-spoked wheel.

### Frost Ridge (north-west)

*levels 8–25 today · drops the Frost Shard · reached by the Frost Trail*

- **Fringe — the thaw line.** Patchy snow melting over wet brown grass, bare birches, trickling meltwater and an abandoned trapper's sled.
- **Heart — the snowbound taiga.** Deep snow with wind-carved drifts, boot and hoof tracks, and snow-laden pines.
- **Rim — the glacier.** A blue-white glacier of cracked ice and wind-scoured snow crust, split by deep blue crevasses.
- **Landmark — The Ice Spires.** A cluster of tall, jagged, glowing blue ice crystal spires around a round stone slab carved with an eight-spoked wheel, frozen into the ice.
- **Where the meadow meets it:** the meadow grass stiffens with frost and the first snow lies in the hollows.
- **The Sweetwater here:** a fast, icy meltwater river with shelves of ice along its banks.

### Flame Fields (north)

*levels 55–80 today · drops the Ember Shard · reached by the North Road*

- **Fringe — the burn line.** Scorched yellow grass giving way to grey ash, charred fence posts and blackened tree stumps, thin smoke rising from smouldering patches.
- **Heart — the ash plains.** Black volcanic ash and cracked basalt ground with glowing embers in the cracks, sulphur-yellow vents puffing steam, and small rivers of lava.
- **Rim — the volcano flanks.** Steep black basalt slopes and cooled lava flows, bright lava running in channels, heat shimmer and drifting ash.
- **Landmark — The Heart of the Volcano.** The foot of a great volcano: a steep black cone with glowing lava running down its sides and smoke rising from vents, and at its base a sealed round stone gate carved with an eight-spoked wheel.
- **Where the meadow meets it:** the meadow grass browns and scorches, with drifts of grey ash.

### Wind Dunes (north-east)

*levels 38–58 today · drops the Wind Shard · reached by the Dune Trail*

- **Fringe — the sage flats.** Dry sage scrub and tough grass on cracked earth, bleached cattle skulls, tumbleweeds and a broken wagon wheel.
- **Heart — the dunes.** Golden sand dunes with wind ripples, red hoodoo rock stacks, cacti and a half-buried wagon wreck.
- **Rim — the red mesas.** Flat-topped red sandstone mesas seen from above like everything else: sunlit tops, layered sides in shadow, sand drifting between them.
- **Landmark — The Buried City.** Half-buried sandstone ruins: broken columns and a giant carved stone face, with a round stone disc carved with an eight-spoked wheel set in its brow.
- **Where the meadow meets it:** the meadow grass dries to straw and sand blows across it.

### Stone Hollows (east)

*levels 38–58 today · drops the Stone Shard · reached by the East Road*

- **Fringe — the quarry.** Stepped quarry terraces of cut grey stone, rubble heaps, abandoned mine carts and scattered picks and shovels.
- **Heart — the badlands.** Grey stone badlands of cracked flagstone ground, loose rubble and pale moss, with clusters of glowing blue and violet crystals.
- **Rim — the granite walls.** Towering grey granite walls and narrow canyons dropping into shadow, with crystal veins glowing in the rock.
- **Landmark — The Great Cave.** The mouth of a huge cave in a grey rock mountainside, framed by glowing crystals, with the mine railway and the road running into it past a round stone disc carved with an eight-spoked wheel.
- **Where the meadow meets it:** the meadow thins over stony ground and grey boulders.

### Electric Foundry (south-east)

*levels 55–80 today · drops the Thunder Shard · reached by the Foundry Road*

- **Fringe — the smelter yards.** Trampled dirt yards scattered with slag heaps, coal piles and iron scrap.
- **Heart — the foundry works.** Dark slate and iron floor plates joined by brass seams, thick iron pipes along the ground and crackling blue electric light in the cracks.
- **Rim — the foundry docks.** Riveted iron docks and piers at the water's edge, with mooring chains, bollards and cargo crates.
- **Landmark — The Foundry Dome.** A great iron dome with glowing blue windows, ringed by crackling electric pylons, with a round stone disc carved with an eight-spoked wheel caged in copper coils before its doors.
- **Where the meadow meets it:** the meadow is trampled to dirt, with coal dust and scattered scrap.

### Water Caves (south)

*levels 8–25 today · drops the Tidal Shard · reached by the South Road*

- **Fringe — the dune grass.** Low sandy dunes held together by dune grass, driftwood, fishing nets drying on poles and a beached rowing boat.
- **Heart — the lagoons.** Pale sand bars and dark mossy rocks between shallow lagoons, with the wreck of a small ship lying on its side.
- **Rim — the harbour cliffs.** Dark mossy sea cliffs with glowing teal caves at their foot and a wooden landing jetty.
- **Landmark — The Drowned Keystone.** A rocky headland pierced by sea caves glowing teal from inside, and in the shallows before it a round stone disc carved with an eight-spoked wheel, half under the water.
- **Where the meadow meets it:** the meadow grass turns to sandy dune grass.
- **The Sweetwater here:** a wide, slow river mouth splitting into sandy channels as it meets the sea.

### Poison Forest (south-west)

*levels 22–40 today · drops the Mist Shard · reached by the Bog Trail*

- **Fringe — the blighted farm.** A blighted field of withered crops and sickly yellow grass, a toppled scarecrow and a broken snake-oil wagon spilling green bottles.
- **Heart — the slime woods.** Murky moss and bog ground with low drifting mist, among twisted dead trees dripping green slime and giant purple and yellow toadstools.
- **Rim — the mangrove marsh.** A mangrove marsh of tangled roots over dark water and green scum, hung with grey moss.
- **Landmark — The Toadstool Ring.** A ring of giant purple toadstools around a glowing poison pool, with a round stone disc carved with an eight-spoked wheel sinking into the mud at its centre.
- **Where the meadow meets it:** the meadow grass yellows and sickens, with the first mushrooms and a sour green haze.
- **The Sweetwater here:** a slow, murky green-brown river edged with reeds and slime.

### Verdant Wilds (west)

*levels 22–40 today · drops the Flora Shard · reached by the West Road*

- **Fringe — the overgrown orchards.** An old orchard of fruit trees gone wild, a tumbledown stone wall, tall grass and the first giant flowers.
- **Heart — the vine jungle.** Lush jungle floor of ferns and giant colourful flowers (red, purple, teal and yellow) under giant mossy trees hung with vines.
- **Rim — the waterfall cliffs.** Mossy cliff terraces with small waterfalls tumbling between ferns into jade pools.
- **Landmark — The Vine Arch.** A great archway of living vines hung with giant flowers, framing a round stone disc carved with an eight-spoked wheel wrapped in roots.
- **Where the meadow meets it:** the meadow grass grows lush and tall, with giant flowers and the first vines.
- **The Sweetwater here:** a clear, fast river over mossy stones, edged with ferns and giant flowers.


---

## 4. The borders

A square that straddles two regions gets the line below in its prompt, so
the change of landscape is designed rather than left to chance. Where the
meadow meets a region, that region's "where the meadow meets it" line (§3) is
used instead.

| Between | and | The land in between |
|---|---|---|
| Flame Fields | Frost Ridge | Steam fields: snow melting into hot springs and wet black rock, with geysers and drifting steam |
| Flame Fields | Wind Dunes | Ash dunes: grey volcanic ash blowing over golden sand, and charred cacti |
| Stone Hollows | Wind Dunes | The sand gives way to stone: red sandstone breaking up into grey granite boulders |
| Stone Hollows | Electric Foundry | The mine works: spoil heaps, ore piles, abandoned mine carts and the first iron pipes |
| Electric Foundry | Water Caves | The foundry meets the shore: slag running down to the sand, rusted chains and cargo crates |
| Poison Forest | Water Caves | Brackish marsh: lagoons gone murky, mangrove roots and sickly dune grass |
| Poison Forest | Verdant Wilds | The rot line: the jungle's giant flowers wilting grey-green and its vines turning into slimy dead branches |
| Frost Ridge | Verdant Wilds | Alpine meadows: snowmelt streams through short green grass and alpine flowers, with the first pines |

Only neighbouring regions have a border line. The eight spokes form a ring,
so there are exactly eight borders.

---

## 5. Brotown

### The layout

![Brotown in the blueprint](world/brotown-plan.png)

**It is a courthouse-square town.**

- **Main Street** runs north–south and **Market Row** runs east–west.
- They meet at the **town square**, a gravel plaza with flagstones, benches
  and lamp posts.
- The **Town Hall** (Mayor Bro) stands in the middle of the square.
- Each street leaves town through a **gate** and becomes one of the Old
  Roads.
- The town is open on all four sides. That answers *"easy entrance and
  exits"*: today's town sits on a clifftop plateau with one stairway down.

**Sixteen building plots line the streets**, two on each side of each arm,
each fronted by a raised wooden boardwalk. The corners between the arms are
the **outskirts**: fenced fields, haystacks and cart tracks.

**The plots are painted EMPTY. Buildings are separate pictures standing on
them.** This is the one structural decision here, for three reasons:

1. **You can walk behind a building.** The game already sorts sprites by
   where they touch the ground (`src/rendering/depthSort.js`, v2.3.2633). A
   building painted into the ground can never cover a player standing behind
   it.
2. **A building can be redrawn without repainting the map.** That matters
   for the character and style refresh (§6, §7).
3. **ChatGPT is bad at buildings that cross a square's edge.** A building
   split between two pictures is the most visible seam there is. Empty
   plots are flat and hide seams well.

The same rule covers anything tall you walk under or behind: town gates,
the mill wheel, pylons and arches. These are sprites, not ground paint.

### Sizes (art px; × 1.3 for game px)

| Part | Size |
|---|---|
| Main Street | 144 wide (Market Row 120) |
| Boardwalk | 26 deep |
| Building plot | 230 × 230 |
| Town square | 500 × 500, with the Town Hall plot 240 × 240 in its middle |
| Gate to gate | 2,000 = 2,600 game px, about **17 s** to walk; about **9 s** from the square to any gate |
| The whole town | squares L12–N14. **M13, the middle square, holds the whole town square.** |

### Who goes where (a proposal)

The ends of town have characters:

- **North** (toward the Flame Fields): the workshops.
- **South**: the saloon end.
- **West** (toward the river and fields): farming.
- **East** (toward the depot and mines): money.

Every building the game has today has a plot, and four plots are spare for
systems that exist without a building (duels, mail, clans) or might (an inn).

| Arm | Side | Plot | Takes today's | Plot (art px from the centre) |
|---|---|---|---|---|
| square | — | Town Hall | mayor (NPC) | -120,-120 → 120,120 |
| north | west | Blacksmith | blacksmith | -328,-570 → -98,-340 |
| north | west | Woodworker | woodworker | -328,-840 → -98,-610 |
| north | east | Gem Cutter | gemcutter | 98,-570 → 328,-340 |
| north | east | Sheriff's Office | (new: duels, arena sign-up, bounties) | 98,-840 → 328,-610 |
| south | west | Saloon | party | -328,340 → -98,570 |
| south | west | Gambling Den | gambler | -328,610 → -98,840 |
| south | east | Hotel | (new: rest, respawn) | 98,340 → 328,570 |
| south | east | Post Office & Telegraph | (new: mail and offline inbox) | 98,610 → 328,840 |
| west | north | Cookhouse | cooking | -570,-316 → -340,-86 |
| west | north | Feed & Seed | farm | -840,-316 → -610,-86 |
| west | south | Land Office | farmhome | -570,86 → -340,316 |
| west | south | Guild Hall | (new: clans and guilds) | -840,86 → -610,316 |
| east | north | Bank | bank | 340,-316 → 570,-86 |
| east | north | Assay Office | enchanting | 610,-316 → 840,-86 |
| east | south | General Store | marketplace | 340,86 → 570,316 |
| east | south | Auction House | auctionhouse | 610,86 → 840,316 |

**The NPCs:**

- **Mayor Bro** stands at the Town Hall.
- **Lil Bro** runs around the square.
- **Ace** deals cards at the Gambling Den.
- **Diego** keeps the General Store.
- **Blacksmith Bro** works at the Blacksmith.

### Just outside town

| Place | Where | What it is |
|---|---|---|
| **Rail Depot** | outside the east gate, south of the East Road | where the mine railway begins |
| **Old Mill** and **Mill Bridge** | the river, just past the west gate | the West Road's crossing; the mill's wheel turns in the river |
| **Arena** | north-east of town, on a path off the East Road | a round rodeo ring for duels and the arena |
| **Four waystations** | at the four road forks | roadhouses, where later systems (travel, rest, quests) can live |
| **Prospector's Circle** | north-west of town, on a path off the North Road | the meadow's landmark and the first keystone clue |

---

## 6. One look for everything: the style key

> *"I'm needing a consistent style across everything, and right now it's not."*

### First: pixel art or painted? (v2.3.2933)

> Owner, 2026-09-29: *"The biggest keepable art is the player itself. Then
> monsters (though these can be deeply rehauled too)."*

**The player is pixel art. Every map and building is painted.** Look at any
screenshot:

- the bro is drawn in chunky pixels with a dark outline and flat shading;
- the ground under him, the town and the buildings are soft painted
  illustrations;
- monsters and NPCs sit in between: pixel art, but with much more detail
  and shading than the bro.

That mix is a large part of why the game looks inconsistent. A style key
cannot fix it on its own: whatever the key shows, either the bro or the
world will not match it. So the look is chosen **before** the key is made.

1. **Pixel art everywhere, matched to the bro (recommended).**
   - He is the art being kept, and the most expensive art in the game to
     redraw (§7).
   - **Consistency can be enforced by the pipeline instead of hoped for.**
     Every picture ChatGPT makes (ground, buildings, props, NPCs) is snapped
     to one pixel size and one shared colour palette before it goes in the
     game. A hundred pictures from a hundred chats come out on one grid, in
     one palette.
   - **It is cheaper on the phone.** A picture stored at its true pixel size
     takes a fraction of the memory of a painting of the same ground.
   - The cost: ChatGPT's "pixel art" is only pixel-ish, so the snap step is
     required, and the prompts are rewritten for it.
2. **Painted everywhere.** The bro is redrawn in the painted style. That is
   the paper doll: every body, gear piece and weapon, in every direction and
   animation. It is weeks of work and the riskiest art job in the game.

Pixel characters on painted ground can look good, but it is the kind of
mismatch this section exists to remove. **The style key prompt waits for
this decision**: today's prompt asks for painted tiles, and it is rewritten
for whichever look is chosen.

**How it gets decided: a test, not an argument (v2.3.2934).**

> Owner: *"Yeah I don't know what aesthetic style is best. Maybe it should
> all be pixel art. Maybe only map should be painterly for a unique look. …
> Maybe I'll test which aesthetic style looks best."*

- Six looks are tried side by side, the owner's painted-map idea among them:
  simple pixel art, HD pixel art, painterly, painterly snapped to pixels, flat
  cartoon, and painted ground with pixel objects.
- Each is shown round the real bro at game size in the **Style Lab**
  (`/tools/style/`) and scored.
- The plan: [STYLE-TEST.md](STYLE-TEST.md). The recommendation above stands
  until the test says otherwise.

### One scale: the town's (measured, v2.3.2933)

> Owner: *"I prefer the scale of when the character is in town, the zones
> currently make the character too large when the dashboard is closed."*

**The camera is the same everywhere.** Measured in the real client
(`window.__btWorldView`), town and every 32 × 32 zone zoom identically:

| Phone | Dashboard | The bro on screen | World in view (game px) |
|---|---|---|---|
| iPhone 13/14/15 (390 × 844) | closed | 83 px tall | 495 × 1024 |
| | open | 64 px | 649 × 1024 |
| Pro Max (430 × 932) | closed | 92 px | 493 × 1024 |
| | open | 71 px | 639 × 1024 |

**What differs is how big the pictures are painted.**

- **Each zone is one 1254 px ChatGPT picture stretched over the whole zone**,
  at 0.82 game px per picture px. Its trees and rocks came out small, so the
  bro looks big beside them.
- **The town painting is drawn at 1.3 game px per picture px.** Its
  buildings are painted big.
- **The whole island is planned at the town's 1.3** (`plan.js`,
  `worldPxPerArtPx`). Everything will stand beside the bro the way the town
  does today.
- **The dashboard zoom stays.** Closing it zooms in, which the owner asked to
  keep (v2.3.2262).
- The world trial's regions are copied from the zone paintings at their own
  scale, so away from the town they still look like the zones. The town in
  the middle shows the target.

**ChatGPT's 1254 × 1254 pictures change nothing.** They are square. The
World Builder lines each one up, resamples it to its 1024 px square (the town
painting's sharpness), and keeps ChatGPT's original in the backup.

### The style key

**Why it is inconsistent today.** Every picture was made on its own, from
words alone. Words drift: "painterly, hand-painted" means something slightly
different every time. Over a hundred map squares, twenty buildings and a
cast of characters, the drift is what you see.

**The fix is one picture that everything is matched to: the style key.**

- It is one square sheet of nine small sample tiles, all from the same
  camera and under the same light:
  - meadow and a road;
  - Main Street with one false-front shop;
  - a riverbank and bridge;
  - snow;
  - lava;
  - sand;
  - stone with crystals and railway;
  - bog;
  - one adventurer for scale.
- The prompt is in `plan.js` (`styleKey`), and the World Builder shows it in
  its **Style key** card.

**How it is used:**

1. **Make it first, once the look is chosen** (above). Ask ChatGPT with the
   style key prompt and a screenshot of the bro attached. Ask again until you
   love the look. This is the most important picture in the project: every
   later picture is matched to it.
2. **Save it in the World Builder.** From then on every square's prompt says
   *"paint in exactly the style of the style key … but do not copy its
   tiles"*. Attach it next to each square's template. On a phone,
   **Share…** sends both at once.
3. **Attach it to every building and character picture too.** The key
   includes a building and a person so that it can.

**Rules shared by every picture**, map, building or character:

- A steep three-quarter top-down camera, with no horizon and no perspective.
- Daylight from the upper left, with shadows to the lower right.
- One scale: a person is about 90 art px tall on the map (117 game px).
- The palette and outline weight are taken from the key. Brushwork or pixels
  follow the decision above.
- **Make the key from a screenshot of the bro.** Attach it to the style key
  chat: he is the one piece of existing art everything must match.

---

## 7. Redrawing the characters

> Owner, 2026-09-29: *"Just to be clear I'm 100% ready to scrap all of the
> environmental art that currently exists (along with NPCS etc) it can all be
> improved. The biggest keepable art is the player itself. Then monsters
> (though these can be deeply rehauled too). Nothing about the current maps I
> really care about and can all be swapped (and should) same with the NPCs
> because they have inconsistent art style."*

**Decided (v2.3.2933):**

- Every map, building, prop and NPC is replaced.
- **The player is kept.** Everything new is drawn to match him (§6).
- Monsters are kept for now and redone region by region wherever they clash
  with the style key.

**What exists today:**

| | What | Size |
|---|---|---|
| NPCs | Mayor Bro, Lil Bro, Ace, Diego, Blacksmith Bro. Walking NPCs have 8-direction walk strips. | ~3 MB |
| Monsters | Slimes (blue and moss), fire goblin, fishman, rock monster, mummy → skeleton, mire wisp, thorn shambler, bog lurker, snowman. Each has idle, attack, hit and death art. | ~8 MB |
| The player | A layered paper doll: body, clothes, every gear piece and weapon as its own layer, in 8 directions, for walking, attacking, bows … with anchor data to line the layers up | ~11 MB |

**The order, cheapest and most visible first:**

1. **The look, then the style key** (§6), made from a screenshot of the bro.
2. **Buildings and props**, in the Bros brief (§12). Each is a single still
   picture, made with the key attached. They are objects standing on the
   ground (§11), so they prove the key works for everything that is not
   ground.
3. **NPCs, with Mayor Bro first as the test.** Every one is redrawn: they
   are few and seen by everyone. The method:
   - Make a front/side/back reference sheet with the key and the bro
     screenshot attached, at the bro's size.
   - Make the walk strips from that sheet.
   - Keep the existing sprite machinery. Only the pictures change.
4. **Monsters, region by region**, alongside that region's ground, so each
   region's new ground and its monsters are judged together. A monster that
   already sits well next to the key stays.
5. **The player is kept.** He is by far the biggest art job: every layer and
   gear piece in every direction and animation. Choosing pixel art (§6) is
   what lets him stay as he is.

**Honest cost.** Buildings, props and NPCs are days of prompting. Monsters
are a few days per region where they need it.

---

## 8. Farms, dungeons and interiors

> *"Maybe just the world map is one big fused tapestry but those are still
> separate areas?"*

**Yes. The tapestry is the shared outdoor world everyone walks in. Anything
that belongs to one player or one group is a separate place behind a door**,
with the brief loading screen it has today.

**Dungeons: already done this way.**

- A dungeon run is a server **instance**: a private copy with its own
  monsters, with zone id `dungeon:<id>` (`server/src/dungeon.js`). Up to 8
  run at once.
- On the tapestry, dungeon entrances become places: the Great Cave's mouth,
  the sealed gate in the volcano, the Buried City, the sea caves.
- Walking in is the loading screen into an instance.

**Farms: should become the same kind of place.**

- Today the farm is a single zone on the server (`farm_home`), not a
  per-player copy.
- The proposal is a **homestead instance** per player, `farm:<playerId>`,
  built the same way dungeon instances are.
- It is entered through the **Land Office** in town. Visiting a friend's
  farm means walking into their instance.
- Your crops and buildings stay yours, and nobody's farm takes up room on
  the shared map.

**Interiors: separate small scenes.** Any building interior added later
(the saloon, the bank vault, the Town Hall and the Convergence below it) is
a small separate scene behind its door.

**Why.** Instances are what let a crowd share one world without sharing one
farm or one boss fight. Small separate scenes also keep iPhone memory flat:
only what is behind the door you walked through is loaded.

---

## 9. Growing the world, and the load it can carry

### "Would I just convert the outer sea to more squares?"

That is exactly how it is built.

- **The frame and the active area.** The grid is a fixed **25 × 25 frame**
  of names and positions (A1 to Y25). Today's island uses the middle
  **13 × 13** of it (G7 to S19, with M13 at the centre).
- **Growing** means widening the active area in `plan.js`, in any direction.
  Every square already painted keeps its name and its place. Everything in
  the plan is measured from the world centre and scattered by position, so
  the new squares simply appear around the old ones.
- **The guarantee is tested.** The core test suite grows the world and
  checks that the plan under every existing square is unchanged. If a later
  plan change does touch painted squares, the builder names exactly which
  ones.

There are three ways to use the new room:

1. **New islands in the sea ring**, reached by boat from the Water Caves'
   landing jetty. Nothing painted changes.
2. **Push the coast outward.** Only the coast squares change: their beaches
   become inland. The builder names them for repainting.
3. **Underground**, for example the inside of the Great Cave, as its own
   map behind its mouth.

The frame holds 625 squares, 4.5 times today's island. Past that the frame
itself can grow toward the south and east (columns after Y, rows after 25).
The world centre is pinned to square M13, so that moves nothing either.
Adding anything before column A or row 1 would rename every square, so that
is the one direction that is closed.

### More players: rooms, characters that travel, and one auction house

> Owner, 2026-09-29: *"I would want it so that players can join different
> game room servers. I don't want their character limited to only one server
> forever. I also don't see how isolated game servers would work with the
> auction house where I intended all of the shared server items to be
> available."*

**More squares help content, not crowding.** More players than one room
holds means more copies of the world.

**How it is today:**

- One room, `brotown-1`, holds everyone: up to **60 players**
  (`MAX_PLAYERS`).
- The room also holds every character's save (`rpg:<id>`, `auth:<id>`,
  `inbox:<id>`), the market's order book and the auction house
  (`server/src/market.js`, `store.js`). There is no store outside it (the
  storage-key registry in `docs/ARCHITECTURE-HANDOFF.md`).
- An earlier lobby spread players over `brotown-1` to `brotown-10`
  automatically. It was removed (v2.3.1112) because it silently put two
  friends who joined seconds apart into different rooms, invisible to each
  other.

**How big games do it: channels.** Several copies of the same world run side
by side. The *live* world belongs to a room; everything that belongs to *you*
or to *everyone* lives outside the rooms and is shared.

| Shared by every room | Belongs to one room |
|---|---|
| your character, bag and coins | the players walking around you |
| mail and the offline inbox | monsters, loot on the ground, fights |
| the auction house and the market | duels and face-to-face trades |
| friends, clans, chat between rooms; leaderboards (already shared) | dungeon and farm copies |

**What that takes on the server:**

1. **A character vault**: one small store per player, outside every room
   (one Durable Object per player id).
   - Joining a room *borrows* your character from the vault; leaving hands
     it back.
   - Only one room can borrow a character at a time, so nobody can log into
     two rooms and spend the same coins twice. If a room crashes, its loan
     runs out after a short timeout.
   - Switching rooms is a leave and a join: a short loading screen.
   - **Players choose their room, and "join a friend" puts you in theirs.**
     Never split people silently: that is what the v2.3.1112 lobby did.
2. **One shared auction house and market**, as a service of their own that
   every room talks to.
   - **Listing:** your room takes the item out of your bag first, then hands
     it to the market.
   - **Buying:** your room takes your coins first. The market decides who got
     the item and **delivers it to your mailbox**, and the coins to the
     seller's. If someone beat you to it, your coins come back by mail. World
     of Warcraft's auction house delivers by mail for the same reason.
   - **The rule this respects:** the server never waits on another service
     between checking something and committing it (ARCHITECTURE-HANDOFF,
     rule 9). That rule is why the market was moved *into* the room. Handing
     things over by mail keeps it.
   - The pieces already exist: the mailbox, escrow, and ids that make every
     order count exactly once (`opId`, `oplog:`).
3. **Mail moves into the vault**, so it reaches you whichever room you are
   in.

**When.** It is not needed until one room fills up. It is much easier
before launch, while few people play, than after, because moving
live characters out of a room is a migration with real players' items at
stake. It is the largest server change on the list, larger than streaming
the map.

### What it costs to run (rough)

- **An empty room costs nothing.** Its 45-a-second tick stops when the last
  player leaves (`webSocketClose` in `server/src/index.js`), and the room can
  sleep.
- **A busy room is billed for the time it is awake:** about 10,800 GB-s a
  day (`server/src/tick.js`). On Cloudflare's paid plan that is a few dollars
  a month per room busy round the clock.
- **Messages and saves add to that as players grow.** A moving player's phone
  sends its position 15–30 times a second. A rough estimate for a full room
  of 60, round the clock, is tens of dollars a month, not hundreds.
  Cloudflare's dashboard has the real numbers.
- **The size of the world is free.** Map pieces are plain files served by
  Cloudflare Pages. The server never touches them.
- **The server's processor is not the limit.** Sixty players cost 0.16 ms of
  each 22 ms tick (`docs/specs/room-full.md`).
- **Each phone's download is the limit.**
  - Every moving player near you costs about 4 KB/s. About 20 near you is
    comfortable on cellular.
  - One seamless world keeps that only if the server sends each player what
    is *near* them (phase 5), as it sends only your zone today.
- **Monsters only run near players.** Today a zone with nobody in it does not
  tick its monsters (`_activeZones`). The island does the same, area by area.

### How walking the island will feel

- **You never see the grid.** The squares are how the map is made, not how
  it is walked.
- **Speed.** The bro walks 150 game px a second, faster with agility,
  swiftness and potions.
  - A phone screen shows about 500 × 1024 game px with the dashboard closed.
    Crossing it takes about 3 s side to side and 7 s top to bottom.
  - The town square to a region's heart is about 20–30 s. Coast to coast is
    about 80–90 s.
  - The waystations at the road forks are the natural place for fast travel.
- **No loading screens outdoors.** The ground streams in around you. The
  trial showed no gaps at a brisk walk against a local server; a phone over
  the internet is the real test.
- **Loading screens stay at doors:** the first join, dungeons, farms,
  interiors, switching rooms, and fast travel.
- **A region's monsters load as you approach it.** Border land (§4) is where
  neither region's monsters live, so there is time to load the next set
  before you meet them. The phone never holds more than two regions'
  monsters.
- **Monsters on screen.** This is a density chosen per area.
  - Today's is 6 per 1024 × 1024 zone, about 3 per screen.
  - Wild areas might carry 4–8 per screen; roads and town none.
  - Nobody has measured the most an iPhone can draw. A crowd test with bots
    is the way to find out.
- **Players on screen:** up to 60 in a room. About 20 moving near you is
  comfortable on cellular; more works on wifi.

### "What would the load handling be like?"

**On the phone:**

- The painted world is cut into small chunks. The game keeps only the
  chunks around the camera in memory, loads the next ones as you walk
  toward them, and frees the ones behind.
- Ground art in memory stays around **10–25 MB whatever the size of the
  world**, so a world twice as big costs no more memory to walk around in.
- The per-zone loading screens go away outdoors. They stay only at doors
  (dungeons, farms, interiors).
- The memory to watch is monster art, not the map. iPhone Safari kills a
  tab at about 250 MB, and the game sits at 165–185 MB. Where two regions
  meet, both regions' monsters are needed.
  - The designed border landscapes (§4) double as a buffer: neutral ground
    where neither region's monsters live.
  - Four regions never meet at one point.

**On the server:**

- One room already simulates the whole world at 45 ticks a second, and 60
  players use 0.16 ms of each 22 ms tick (`docs/specs/room-full.md`).
- What changes is *who hears what*: updates go to players near each other
  instead of to players in the same zone.
- 60 players spread over 137 squares is far less crowded than 60 players in
  one town painting.

---

### Measured: the world trial

The streaming above is not only a design. `?trial=world` builds it today (see
[WORLD-MAP-PIPELINE.md, "The world trial"](WORLD-MAP-PIPELINE.md#the-world-trial-walking-a-seamless-island-today-v232932)).
It is this island at full size, baked from copies of today's zone art and
walked in the real game.

The first measurements, headless against a local worker:

- **0.8 s** to walk in.
- **14–15 pieces (~15 MB)** in memory however far you go.
- **Zero** pieces seen before their picture arrived, at a brisk walk.
- The worker followed the player across the whole island with no server
  change.

The phone over the internet is the test that matters. The trial's readout is
there so the owner can take it.

---

## 10. Decisions for the owner

**Asked in v2.3.2933, and needed first:**

- **Pixel art or painted** (§6). It decides the style key prompt, and
  whether the bro stays as he is. Recommended: pixel art, matched to him.
  Decided by the style test ([STYLE-TEST.md](STYLE-TEST.md), v2.3.2934).
- **How the ground is made** (§13). Recommended: baked from swatches, with
  special places painted.

**Decided in v2.3.2933:** everything but the player is replaced (§7); what
stands up is an object (§11); buildings and NPCs are made more bro (§12);
one scale, the town's (§6); characters that travel between rooms, and one
shared auction house (§9). The last one's timing is still open: before
launch is easier.

**From the first draft:**

1. **The premise.** Shard rush and keystones: keep it, change it, or drop
   it. The map paints keystones either way; they can mean anything later.
2. **The plot table** (§5). Is each building where it should be? Are the
   four new ones (Sheriff's Office, Hotel, Post Office & Telegraph, Guild
   Hall) wanted?
3. **Island size.** 137 land squares, about 80 s coast to coast. Decide
   before the first square is kept.
4. **The style key.** Make it and approve it before any square, building or
   character.
5. **The character order** (§7). Mayor Bro as the first test.
6. **Farms as personal homesteads** (§8). A server change, separate from the
   map.
7. **Trees as objects** (§11). Which trees you can chop, and how fast they
   come back. (Objects in general: decided in v2.3.2933.)

---

## 11. Trees, rocks, water and props: objects, not paint

> Owner, 2026-09-29: *"I'm inclined to make all of the water, trees, rocks,
> and other props as separate objects. I figure if would work better with
> layering and manipulating it for different purposes."*

**Agreed (v2.3.2933): everything that stands up is an object**: trees,
rocks, bushes, fences, lamp posts, signs, crates, bridges, gates and every
building. What that buys:

- **Layering.** The game sorts objects by where they touch the ground, so
  you pass behind a tree or a building and in front of it (`depthSort.js`,
  v2.3.2633). Paint can never do that.
- **What stops you is what you see.** Each object carries its own footprint,
  so collision cannot drift away from the picture. On a painted map the wall
  and its collision line are drawn separately and disagree.
- **They can change.** Chop, mine, break, move; lit at night, snowed on in
  winter, swapped for a festival. None of it means repainting a square.
- **One drawing, a thousand copies.** A pine is drawn once and placed
  everywhere, and one picture in memory serves every copy on screen.
- **Consistency.** A few hundred object pictures, each checked against the
  style key, drift far less than a hundred painted squares.

**Two refinements:**

1. **Water is a surface the game draws, not a pile of sprites.**
   - The plan already knows exactly where every river, pond and sea is.
   - The game draws moving water over those areas (ripples, shore foam), and
     collision comes from the same outline, so the shore stops you exactly
     where it is drawn.
   - The ground paint supplies the bed and the banks (mud, pebbles, sand).
   - Water can then freeze, flood or drain.
2. **A thick forest is a few big canopy pieces, not four hundred trees.**
   - The trees along its edge and in the open are separate, choppable
     objects. The middle is canopy you cannot enter.
   - Walking *under* a canopy needs a foreground layer the renderer does not
     have yet (DEPTH-ROADMAP item 5).

**What it costs:**

- **On the phone:** a screen might hold 50–150 objects. That is fine when a
  region's objects share a few packed picture sheets instead of hundreds of
  separate files.
- **On the server:** nothing for decoration. Only the objects you can use
  (chop, mine, open) are known to the server, and only near players.
- **In placing them:** the plan scatters most objects by rule: trees along
  woodland edges, rocks on slopes, crates by the depot. Hand-placed spots
  need a small placement tool, which the World Builder can grow.

**The consequence: ChatGPT paints ground only.** The ground prompts stop
asking for trees, rocks, buildings and water surfaces, and the blueprint
writes out where the objects stand. That rewrite waits on the look (§6). How
the ground itself is made is §13.

### Trees in particular

> Owner, 2026-09-29: *"Don't you think all the trees in the game should be
> replaced with objects that the character can cut down like the pine
> tree?"*

**Mostly yes.**

**How it is today.** Each zone has exactly one choppable tree: a server
gather node that respawns quickly, by the owner's own rule (v2.3.1592, "one
resource per zone but with quick respawn"). Every other tree is paint. You
walk straight through its trunk, its canopy never hides you, and you cannot
chop it.

**Why trees should be objects:**

1. **They would behave the way they look.**
   - A tree object stands on its footprint, so you walk round it.
   - The depth sort (`depthSort.js`, v2.3.2633) draws you behind it when you
     are behind it.
   - Neither is possible for paint.
2. **Woodcutting would be everywhere,** instead of one tree per zone.
3. **The seamless map gets easier.**
   - ChatGPT paints ground, not trees, and a tree straddling a square's
     edge is one of the hardest seams to hide.
   - Trees can be redrawn in the new style without repainting a single
     square, the same argument as the empty building plots (§5).
4. **One set of tree art per biome,** drawn once with the style key (§6):
   pine, oak, palm, dead tree, giant jungle tree, the Foundry's iron pylons.

**But not literally all of them:**

1. **Dense forest stays painted.**
   - A forest mass is a wall you walk round, not four hundred trees.
   - Every choppable tree is server state (where it is, whether it is
     standing, when it comes back). The worker has to keep it and send it to
     the players near it.
   - Hundreds per region is easy; tens of thousands is not.
   - So: the trees on the edges of woods and the ones standing alone in the
     open are objects. The inside of a wood is painted canopy you cannot
     enter.
2. **The economy moves.**
   - Making every tree choppable multiplies the wood supply, and with it
     log prices and woodworking progress.
   - The one-tree rule was chosen on purpose. So pick one: trees come back
     more slowly, a chop yields less, or only some kinds of tree can be cut.
3. **It belongs with the engine work.**
   - Trees placed by the plan (not at random), and sent to the players near
     them, need the same by-distance updates the seamless world needs anyway
     (§9).
   - So it lands in phase 5–6, not before.

**What changes in the World Builder when this is decided:**

- The prompts stop painting trees at all (v2.3.2933: everything that stands
  up is an object).
- The plan's woods (the dark blobs) become canopy pieces over a painted
  forest floor.
- The blueprint writes out a list of tree positions along the edges of the
  woods and scattered in the open, for the game to stand objects on.

---

## 12. Built by Bros: buildings, props and people

> Owner, 2026-09-29: *"For regenerating buildings and NPCs I want something
> more 'bro.'"* — quoting ChatGPT's description of it:
>
> *"A place should feel like it was actually built, modified, and lived in by
> Bros—not like a generic polished fantasy building. The personality was
> bold, friendly, slightly ridiculous, loyal, competitive, adventurous, and
> not overly serious. Bros tend to turn normal things into a challenge,
> hangout, joke, trophy, or opportunity for friendly one-upmanship.
> Visually, that meant details like trophies, weapon racks, weights,
> mugs/barrels, oversized signs, dumb slogans, improvised repairs, adventure
> dents, bragging boards, goofy mascots, ridiculous statues, training
> equipment, or little environmental jokes. I called some of that 'bro
> clutter.' The idea was that the architecture itself could still be
> attractive and handcrafted, but the small details should quietly
> communicate: 'A bunch of optimistic idiots who love adventure, competition,
> and each other live here.'"*

**The brief, for every building, prop and NPC prompt:**

- **Handsome underneath, bro on top.** Solid, well-made frontier
  architecture. The personality is in what was added later: things bolted
  on, bragged about, or patched after an adventure went wrong.
- **Every place is a competition or a hangout.** A scoreboard, a trophy, a
  challenge, somewhere to sit and argue.
- **Proud repairs and adventure dents.** Nothing is new; everything has a
  story.
- **Big, dumb, friendly signs**, with one or two words each. ChatGPT's
  lettering is unreliable past that. Ground squares never carry text.

**Readable at phone size.** A building is seen a few hundred pixels tall on a
phone.

- The bank already has the spirit: lions in sunglasses, "BRO SAVINGS".
- The next versions keep the humour with **fewer, bigger jokes**:
  - one strong silhouette per building, recognisable at a glance;
  - one or two hero jokes per building, big enough to read;
  - clutter at the edges (porch, roof, side yard), never on the ground in
    front of the door where people walk.

**Starting ideas per building,** for the prompts:

| Building | Bro details |
|---|---|
| Town Hall | Mayor Bro's statue mid-flex; a trophy case on the steps; bunting |
| Blacksmith | a rack of hammers ranked by weight; a dented anvil on a plinth; a dumbbell made of two anvils |
| Saloon | a wall of named mugs; an arm-wrestling table on the porch; a moose head in sunglasses |
| Sheriff's Office | wanted posters of monsters (a slime in a cowboy hat); a "days since slime incident" board stuck at 0 |
| Bank | a vault door with a friendly padlock; gold bars stacked like weights |
| General Store | crates stacked into a leaning tower; one huge "DEALS" sign |
| Auction House | an auctioneer's podium with a gong; a bidding paddle as big as a door |
| Hotel | hammocks on the balcony; a "no dragons" sign |
| Gambling Den | a giant die as a doorstop; a wheel of fortune by the door |
| Waystations | joke signposts; a campfire ring; a bench press made of a log |

**NPCs** follow the same brief.

- Each has one bro trait you can see from across the street. The blacksmith
  is always mid-flex, the shopkeeper wears sunglasses at night, and Lil Bro
  carries a stick like a sword.
- They are drawn in the player's style (§6), at his size, so they stand
  beside him as equals.

---

## 13. The ground: paint every square, or bake it from swatches

**Once everything that stands up is an object (§11), ChatGPT only paints
ground:** grass, dirt, sand, snow, ash, stone, cobbles, roads, and the banks
round the water. That opens a second way to make it.

| | Paint every square (the World Builder today) | Bake from swatches (how the trial was made) |
|---|---|---|
| What ChatGPT makes | 137 squares, each from its own template | ~30 seamless ground swatches (grass, dry grass, dirt, cobbles, sand, snow, ash, stone, mud …), plus small ground details (flowers, cracks, puddles) as objects |
| Keeping one style | 137 separate pictures | ~30 pictures |
| Roads, shores and collision | roughly where ChatGPT put them | exactly where the plan says |
| Changing the plan later | repaint every square it touches | re-bake in minutes |
| The owner's time | hundreds of chats | a few evenings |
| The look | the most hand-made: every square unique | more even; variety comes from the details and objects on top |

**Recommended: bake the ground from swatches, and paint only the special
places** as World Builder squares fused into the bake: the town square, the
landmarks, the falls, the border set-pieces.

- With pixel art (§6) the case is stronger still: that is how pixel-art
  ground is normally built.
- The World Builder is not wasted. Its plan and blueprint drive the bake, and
  it paints the special places.
- **The next step is cheap:** about ten swatches for the meadow and the town,
  then the trial re-baked from them, so the owner judges it on a phone before
  any square is painted.

---

## 14. Easy to miss

Things a first big online world tends to trip on, roughly in order of how
much they hurt:

1. **The server does not know where the walls are.** It checks only how fast
   you move (`server/src/movement.js`), not where. On one big map with a real
   economy, a tampered client could walk through water or walls to reach
   things. The island's walk map is small (about 21 KB), so the server can
   check it too.
2. **"Zone" is everywhere in the code.** Quests ("go to the Flame Fields"),
   unlocks, level bands, music, banners, gather nodes, the minimap. On one map
   the zone becomes *the region you are standing in*, worked out from your
   position. That is the biggest code change of the move, done one system at
   a time.
3. **Empty space.** A big map needs something to find every 20–30 seconds
   of walking: a camp, a chest, a gather spot, a view, an NPC, a shortcut.
   Plan the points of interest per region before painting.
4. **Phone memory is the hard ceiling.** Safari kills the tab at about 250 MB
   of pictures, and the game uses 165–185 MB today. Give each region a budget
   for its objects and monsters.
5. **Saved positions after a map change.** When the map changes after launch,
   a saved position can end up inside a new wall. The game moves such a
   player to the nearest safe spot on join.
6. **Characters out of the room before launch** (§9). Easy with no players;
   a careful migration with them.
7. **Test with crowds.** A way to fill a room with bots shows how 60 players
   feel on the owner's phone before real players find out.
