# The World Bible: Brotown and its island (v2.3.2931, DRAFT)

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

1. **Make it first.** Ask ChatGPT with the style key prompt. Ask again until
   you love the look. This is the most important picture in the project:
   every later picture is matched to it.
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
- Painterly brushwork, with the palette and outline weight taken from the
  key.

---

## 7. Redrawing the characters

**What exists today:**

| | What | Size |
|---|---|---|
| NPCs | Mayor Bro, Lil Bro, Ace, Diego, Blacksmith Bro. Walking NPCs have 8-direction walk strips. | ~3 MB |
| Monsters | Slimes (blue and moss), fire goblin, fishman, rock monster, mummy → skeleton, mire wisp, thorn shambler, bog lurker, snowman. Each has idle, attack, hit and death art. | ~8 MB |
| The player | A layered paper doll: body, clothes, every gear piece and weapon as its own layer, in 8 directions, for walking, attacking, bows … with anchor data to line the layers up | ~11 MB |

**The order, cheapest and most visible first:**

1. **The style key**, before anything else (§6).
2. **Buildings.** There are 24 plots, and each building is a single still
   picture, made with the key attached. This proves the key works for
   non-ground art.
3. **NPCs, with Mayor Bro first as the test.** They are few and seen by
   everyone. The method:
   - Make a front/side/back reference sheet with the key attached.
   - Make the walk strips from that sheet.
   - Keep the existing sprite machinery. Only the pictures change.
4. **Monsters, region by region**, alongside that region's map squares, so
   each region's new ground and new monsters are judged together.
5. **The player, last.** It is by far the biggest job: every layer and gear
   piece must be redrawn to line up in every direction and every animation.
   It is also the riskiest, since a slip shows on every screen.
   - Doing it last lets the owner judge, once the world and NPCs are redone,
     whether the current player art actually clashes.
   - If it does, the redraw can be one set of gear at a time.

**Honest cost.** Buildings and NPCs are days of prompting. Monsters are a
few days per region. The paper doll is the only part measured in weeks.

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

### More room is not the same as more players

**More squares help content, not crowding.**

- One room holds **60 players** today (`MAX_PLAYERS`). Everyone is in one
  shared room, `brotown-1`.
- More players than that means **more copies of the world**: realms, such as
  "Brotown 1" and "Brotown 2", each its own server room with the whole
  island.
- **The real work for scale is not the map.** Today a character's saved
  progress lives *inside* the room (per-room storage). A character therefore
  cannot move between realms until accounts are moved into their own store.
- The server's own notes already say to prefer *explicit* realm assignment
  over counting players when that day comes (`server/src/index.js`,
  v2.3.1112).

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

- One room already simulates the whole world at 45 ticks a second. The
  feasibility study measured about 20× CPU headroom.
- What changes is *who hears what*: updates go to players near each other
  instead of to players in the same zone.
- 60 players spread over 137 squares is far less crowded than 60 players in
  one town painting.

---

## 10. Decisions for the owner

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
