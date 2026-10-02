/* ═══ v2.3.2931: THE WORLD PLAN — one seamless map ═══
 * ═══ v2.3.2936: ...laid out as THE WHEEL — a spoke of land per element ═══
 *
 * Owner: "I'm wanting one seamless map and to have chatGPT draw it into
 * squares.  I'll need to fuse them together but have some type of grid and
 * prompt system to construct the entire thing."  And, the next day: "I would
 * want your help creating the through lines that tie it all together in a
 * cool way ... I'm imagining [Brotown] laid out closer to an 1800's style map
 * where there's a Main Street and some buildings line the street."
 *
 * Then, v2.3.2936: "I want each 8 regions to have its own monster tiers
 * though (im thinking 1-80 with a zone sized space separating each 5
 * levels) so The game is all about elements ... light and dark ... are
 * endgame elements (im thinking lvl 80-100)", and, choosing: "1-80 plus dark
 * and light".  So the island is a WHEEL (core/wheel.js): Brotown and its
 * safe commons at the hub, one spoke of land per element with its own
 * ladder of levels 1-80 -- one zone of walking per five levels -- sea
 * between the spokes, passes joining neighbours at levels 20 and 60, and at
 * every tip a gate to the Dark or the Light realm (80-100).
 *
 * This file is the single source of truth for that map.  The World Builder
 * page (index.html next to this file) reads it to draw the grid and build
 * the blueprint -- where every road, shore, wall, level and ground look
 * goes.  The WORLD itself -- the story, the through-lines, what every spoke
 * looks like and why -- is written up for people in docs/WORLD-BIBLE.md; the
 * machinery in docs/WORLD-MAP-PIPELINE.md.  Keep the three in step.
 *
 * ── EVERY POSITION IS IN SQUARES FROM THE WORLD CENTRE ──
 * East is +x, south is +y, one unit is one square step (768 art px).  The
 * centre is the middle of square Y25, where the Town Hall stands.  Positions
 * never depend on how big the planned area is, so growing the world (below)
 * moves nothing.  Town layout numbers are in art px from the same centre.
 * The wheel's own numbers are in ZONES, the owner's unit: one of today's
 * 1,024 game px zones, about one phone screen tall.
 *
 * ── THE UNIT: ONE ART PX IS 1.5 GAME PX ──
 * v2.3.2936: the art was HD pixel art on a 1.5 game px grid (v2.3.2935,
 * docs/WORLD-BIBLE.md §6), so one art px here was one pixel of the finished
 * art: 1.5 game px, `worldPxPerArtPx` below.  The town's numbers were scaled
 * from the old 1.3 so it keeps its size in the game.  v2.3.2942: the art is
 * now kept finer, at 2 px per game px (PIXEL.gamePxPerArtPx 0.5 in
 * ../style/bible.js -- the owner found the 1.5 grid "soft and gritty"), so
 * the art px is only the plan's unit: three picture px to one.  It must
 * stay a whole number of them, so the ground lays on a clean grid (the core
 * suite checks).
 *
 * ── THE NUMBERS, IN ONE PLACE ──
 *   square   1024 art px (1,536 game px); the grid's unit for names and
 *            positions, 768 art px apart
 *   frame    49 x 49 squares, A1..AW49 -- names and positions; Y25 is the
 *            centre
 *   active   G7..AQ43, 37 x 37 squares -- the planned area, sea round the
 *            wheel's tips
 *   wheel    the hub (town and commons) 2.7 zones across the radius; eight
 *            spokes 3 zones wide, each 16 tiers of one zone (levels 1-80,
 *            five a tier) plus a tip for its gate: about 19 zones from the
 *            Town Hall to a gate, two minutes' walk at the ~150 game px/s
 *            base run speed
 *   land     about 480 squares' worth (the core suite measures it)
 *
 * ── DECIDE THESE BEFORE ANYTHING IS BUILT ON THEM ──
 * `grid`, `centre`, `square`, `worldPxPerArtPx`, `seed`, the wheel and every
 * position decide WHERE things sit.  Changing one later moves roads, shores
 * and levels under whatever was made to match them (the World Builder names
 * the squares that changed).  The descriptive text (stages, paint, borders,
 * style, never) is safe to change at any time -- it only changes prompts.
 *
 * ── GROWING THE WORLD LATER ──
 * Widen `active` toward the frame's edge.  Nothing already planned moves or
 * is renamed; the new squares are open sea until the plan puts land there --
 * islands reached by boat, or longer spokes (say to level 100).  The core
 * suite proves nothing moves (tools/world/test-world-core.mjs, "growth").
 */
import { wheelInfo, spokePoint, arcPoint, arcPoints, stageOf } from './core/wheel.js';
import { townPlan, townGates } from './core/layout.js';
import { MATERIALS } from '../style/bible.js';

export const PLAN = {
  id: 'brotown-world',
  version: 3,
  /* Every random choice in the blueprint (coast wobble, where the ponds and
     tree clumps go, how the region borders wander) comes from this number
     and from absolute position.  Same seed -> same world, on every device,
     forever -- and the same square keeps the same plan when the world grows. */
  seed: 20260929,

  /* The FRAME: names and positions.  Columns A..AW west to east, rows 1..49
     north to south.  It may grow toward the south and east later; never
     shrink it, and never add anything before A or row 1 -- that renames
     every square.  (v2.3.2936: 49 x 49 round Y25, up from 25 x 25 round M13:
     a spoke reaches 17 squares from the centre, and M13 had only 12 to its
     north and west.  Nothing had been painted, so the renaming cost
     nothing.) */
  grid: { cols: 49, rows: 49 },
  /* The square whose middle is the world centre: every position below is
     measured from here, which is what lets the frame grow without moving
     anything.  Never change it. */
  centre: 'Y25',
  /* The ACTIVE area: the squares the plan covers.  Grow it to grow the
     world (see the header). */
  active: { from: 'G7', to: 'AQ43' },

  /* The grid's unit.  ChatGPT hands back 1024 or 1254 px pictures; the
     World Builder resamples a painted square to `px`.  `overlap` is the band
     each square shares with each neighbour.  (Since v2.3.2935 the ground is
     made from swatches, not painted square by square: squares are the
     plan's names and positions.) */
  square: { px: 1024, overlap: 256 },

  /* Game px per art px: one pixel of the HD pixel art (../style/bible.js,
     PIXEL.gamePxPerArtPx).  Was 1.3, the old town painting's density. */
  worldPxPerArtPx: 1.5,

  /* One blueprint cell covers this many art px.  16 keeps the active area
     to 1,792 x 1,792 cells (12 MB, fine on a phone) with a road still four
     or five cells wide.  A cell is 24 game px: the grain of the collision
     map the blueprint becomes. */
  blueprintScale: 16,

  /* ── THE WHEEL (core/wheel.js does the geometry) ──
     In ZONES of `zonePx` game px, the owner's unit.  Spokes are listed in
     `regions` below; each names its compass `dir`. */
  wheel: {
    zonePx: 1024,
    hub: 2.7,          /* the commons' edge, from the centre: where every spoke's tier 1 begins */
    tiers: 16,         /* per spoke: levels 1-80 */
    levelsPerTier: 5,
    tierZones: 1,      /* one zone of walking per tier -- per five levels (owner) */
    width: 3,          /* each spoke three zones wide */
    tip: 0.8,          /* land past the last tier, where the gate stands */
    stageTiers: 4,     /* the ground changes look every four tiers (20 levels): four stages per spoke */
    camps: [4, 8, 12, 16],   /* a waystation in the middle of these tiers: levels 20, 40, 60 and 80 */
    passes: [4, 12],         /* neighbouring spokes joined across the sea in these tiers: levels 20 and 60 */
    passZones: 1,            /* a pass's width */
    passWobble: 0.1,         /* squares: a pass's edge wanders less than a coast, so it never pinches shut */
  },
  /* How ragged a spoke's coast is: `wobble` squares either way, `freq`
     cycles per square. */
  coast: { wobble: 0.28, freq: 0.3 },
  /* The same for the commons' edge, where tier 1 begins. */
  commons: { wobble: 0.25, freq: 0.34 },
  /* How far the border between two neighbouring spokes wanders from the
     line halfway between them (squares), and how tangled it is. */
  regionWarp: { amount: 0.5, freq: 0.42 },
  /* How far a tier's edge wanders, so a new stage's ground never begins on
     a perfect circle. */
  tierWarp: { amount: 0.14, freq: 0.5 },

  /* ── ANCHORS: finished paintings placed before any square is made ──
     None by default: Brotown is being redrawn as a Main Street town (below),
     so the old town painting (town_v17) is no longer the centrepiece.  The
     machinery stays, for any painting that should be kept exactly as it is.
     Shape of an entry, positions in squares from the centre:
       { id, name, src, size: [w, h], at: [sx, sy], inset: {top, left,
         right, bottom}, feather, gate: [fx, fy] } */
  anchors: [],

  /* ── TERRAIN CLASSES: the colours of the blueprint ──
     The blueprint is a flat colour-coded plan of the whole world.  It says
     where the ground swatches, roads, shores and plots go, and it becomes
     the game's collision map: `walk` says whether feet may stand there, and
     cliffs are where climbing will go.  Drawing the walls FIRST and making
     the art to them is the opposite of what failed twice before (walls
     traced off finished paintings, tiledMaps.js v2.3.1693/1794).

     `color` is what the sketch shows; `colorName` is how a prompt refers to
     it.  Classes whose look depends on the region (ground, obstacle, water,
     cliff, river, landmark, gate) take colour or description from the
     region.  No two things that can meet share a colour, so a legend line
     can never mean two things. */
  classes: {
    ground:    { walk: true },
    path:      { walk: true,  color: '#c9a36a', colorName: 'tan',
                 paint: 'a worn dirt wagon road with two wheel ruts, soft grassy edges and scattered pebbles (the narrowest are footpaths)' },
    obstacle:  { walk: false },
    water:     { walk: false, color: '#3f86d6', colorName: 'blue' },
    ocean:     { walk: false, color: '#1f5a9e', colorName: 'deep blue',
                 paint: 'open sea: deep blue water with gentle waves, turning turquoise in the shallows, with white foam along the shore' },
    cliff:     { walk: false, color: '#6d645a', colorName: 'dark grey-brown' },
    lava:      { walk: false, color: '#ff6a1a', colorName: 'bright orange',
                 paint: 'molten lava glowing orange and yellow under a cracked black crust' },
    landmark:  { walk: false },
    anchor:    { walk: true },
    street:    { walk: true,  color: '#7b4a26', colorName: 'chestnut brown',
                 paint: "the town's main street: wide, hard-packed dirt with wagon-wheel ruts, hoof prints and a few puddles" },
    boardwalk: { walk: true,  color: '#4a2f1a', colorName: 'dark brown',
                 paint: 'a raised wooden boardwalk of weathered planks with a step down to the street' },
    plaza:     { walk: true,  color: '#d8d2c4', colorName: 'pale grey',
                 paint: 'the town square: packed gravel ringed with flagstones, a few benches and iron lamp posts, open for crowds' },
    lot:       { walk: false, color: '#fff4d6', colorName: 'cream',
                 paint: 'an EMPTY, level building plot of bare packed earth. Leave it completely empty: the building is added to the game separately' },
    river:     { walk: false, color: '#1747d8', colorName: 'royal blue' },
    /* `half`: half the railway's width in art px (v2.3.2936: at the new
       blueprint scale a thinner line breaks up) */
    rail:      { walk: true,  color: '#ffffff', colorName: 'white', half: 22,
                 paint: 'a single-track mine railway: dark wooden sleepers under two iron rails on a gravel bed, with a line of wooden telegraph poles beside it' },
    bridge:    { walk: true,  color: '#ffd21f', colorName: 'bright yellow',
                 paint: 'a sturdy wooden bridge of heavy planks with low rails, wide enough for a wagon' },
    /* v2.3.2936: the keystone gate at a spoke's tip; colour per spoke */
    gate:      { walk: false },
  },


  /* ── BROTOWN: a Main Street town, open on all four sides ──
     Owner: "a full refresh of the Brotown map ... something that allows easy
     entrance and exits ... closer to an 1800's style map where there's a
     Main Street and some buildings line the street."

     A courthouse-square town: Main Street runs north-south, Market Row
     east-west, and they meet at the town square with the Town Hall (Mayor
     Bro) standing in its middle.  Each street leaves town through a gate and
     becomes one of the four Old Roads, so every direction is a way out --
     today's town has one stairway.

     The ground painting leaves every building plot EMPTY.  Buildings become
     separate sprites standing on their plots: the game already depth-sorts
     sprites by their ground line (depthSort.js, v2.3.2633), so a player can
     walk behind a building, which a building painted into the ground can
     never allow.  It also means a building can be redrawn without touching
     the map.

     Art px from the world centre.  Plots line both sides of each street
     arm, `perSide` per side, `front` wide along the street and `deep` back
     from it, starting `first` px out from the centre, behind a boardwalk.
     `lots` lists them square-outward per arm and side; `today` is the
     building in src/data/buildings.js each one would take (docs/WORLD-
     BIBLE.md has the reasoning).

     v2.3.2936: every number is the old one x 1.3/1.5, so with the art px
     now a pixel of the 1.5 grid the town keeps its size in the game --
     the scale the owner likes ("I prefer the scale of when the character is
     in town"). */
  town: {
    name: 'Brotown',
    main: 62,          /* Main Street half-width (north-south) */
    row: 52,           /* Market Row half-width (east-west) */
    boardwalk: 22,
    /* v2.3.2960: the boardwalks are PUT AWAY until the buildings come.
       Owner, 2026-10-01, walking Market Row in the Wheel trial: "The one
       thing I want to change are the boards.  They do not look good and I
       don't know what those are supposed to be.  Is it a road?"  With no
       shop behind it a boardwalk is a strip of planks in the dirt -- it
       reads as a fence.  It comes back as each shop's porch, drawn with the
       building; the plots stay set back by `boardwalk` to leave it room,
       and the town's ground runs up to the street meanwhile.  `true` lays
       them again, exactly as before (layout.js pass 5; the tests do). */
    boardwalks: false,
    /* v2.3.2975: the town laid out round the buildings the owner drew
       (core/layout.js townPlan): each faces south, its door at the bottom,
       so every door opens onto the square, a street, the Back Lane or a
       front walk, and no roof hides another's door.  Was: square 217, the
       hall's plot 208 square, plots 200 x 200 (300 game px), two a side
       from 295 out, gates at 867. */
    square: 240,       /* the town square's half-size */
    /* the Town Hall's plot, in the square's middle: 420 x 240 game px, its
       door to the south (the building is planned 406 wide, catalog.js) */
    hall: { w: 280, d: 160 },
    /* a plot: `w` wide (405 game px; the buildings are 386), `d` of ground
       from its door back (225 game px), room for a building drawn `tall`
       (465 game px; the tallest is 453), a front walk `walk` wide, `gap`
       between two side by side, `verge` between Main Street and a plot
       beside it, `porch` between a door and the street or square it opens
       onto; `perSide` plots a side on each street arm */
    lot: { w: 270, d: 150, tall: 310, walk: 60, gap: 34, verge: 14, porch: 8, perSide: 2 },
    yard: 78,          /* town ground kept behind the plots */
    gate: 1050,        /* where the streets leave town and become roads (v2.3.2975: was 867) */
    /* v2.3.2977: how the town's edge wanders, in art px -- `amp` either way
       over `wave`, and smaller `amp2` over `wave2` and `amp3` over `wave3`
       on top: bays, coves and bumps.  The owner, of
       the yards' edge on the grass: "the lines between dirt and grass are
       razor straight".  It was `wobble: 35`, the town's rectangles grown by
       noise that changed over 480 art px and was sampled every 128, so each
       side stayed a ruler line a few px either way.  (core/layout.js
       townEdgeAt; the same for the plots out in the country, `places`.) */
    edge: { amp: 60, wave: 300, amp2: 30, wave2: 110, amp3: 12, wave3: 45 },
    hallLot: { id: 'townhall', name: 'Town Hall', today: 'mayor (NPC)' },
    lots: {
      north: {
        west: [{ id: 'blacksmith', name: 'Blacksmith', today: 'blacksmith' }, { id: 'woodworker', name: 'Woodworker', today: 'woodworker' }],
        east: [{ id: 'gemcutter', name: 'Gem Cutter', today: 'gemcutter' }, { id: 'sheriff', name: "Sheriff's Office", today: '(new: duels, arena sign-up, bounties)' }],
      },
      south: {
        west: [{ id: 'saloon', name: 'Saloon', today: 'party' }, { id: 'gambling', name: 'Gambling Den', today: 'gambler' }],
        east: [{ id: 'hotel', name: 'Hotel', today: '(new: rest, respawn)' }, { id: 'post', name: 'Post Office & Telegraph', today: '(new: mail and offline inbox)' }],
      },
      west: {
        north: [{ id: 'cookhouse', name: 'Cookhouse', today: 'cooking' }, { id: 'feedseed', name: 'Feed & Seed', today: 'farm' }],
        south: [{ id: 'landoffice', name: 'Land Office', today: 'farmhome' }, { id: 'guildhall', name: 'Guild Hall', today: '(new: clans and guilds)' }],
      },
      east: {
        north: [{ id: 'bank', name: 'Bank', today: 'bank' }, { id: 'assay', name: 'Assay Office', today: 'enchanting' }],
        south: [{ id: 'store', name: 'General Store', today: 'marketplace' }, { id: 'auction', name: 'Auction House', today: 'auctionhouse' }],
      },
    },
  },

  /* ── ROUTES THAT ARE NOT THE WHEEL'S ──
     The wheel's own roads -- a trunk down every spoke, the passes, the
     footpaths off them -- the Sweetwater River and the mine railway are laid
     out at the end of this file from the wheel's geometry, so they always
     run where the spokes are.  `roads`, `rivers`, `rails` and `places` fill
     in there. */
  roads: [],
  rivers: [],
  rails: [],
  /* A road crossing the river gets a bridge, named here by road id. */
  bridges: {
    west: { name: 'the Mill Bridge', paint: 'a wide wooden bridge of heavy timbers with low rails, strong enough for ore wagons' },
    'bog-trail': { name: 'the Snake Bridge', paint: 'a rickety plank bridge on crooked stilts, green with slime' },
  },

  /* ── PLACES: empty plots for sprites added later ──
     `at` in squares; `size` [w, h] art px, or `r` for a round plot.  The
     wheel's camps join these at the end of the file. */
  places: [
    { id: 'depot', name: 'the Rail Depot', at: [1.5, 0.42], size: [260, 130], paint: 'where the mine railway begins' },
    { id: 'mill', name: 'the Old Mill', at: [-1.62, -0.4], size: [150, 130], paint: 'on the river bank, beside the Mill Bridge' },
    { id: 'arena', name: 'the Arena', at: [1.2, -1.15], r: 200, paint: 'a round rodeo ring and duelling ground' },
  ],

  /* ── REGIONS: the town, the commons, and one spoke per element ──
     The spokes keep the compass points the zones have on the World View
     painting (worldview_v4.webp) -- frost north-west, the volcano north,
     the dunes north-east, the cave east, the foundry south-east, the sea
     caves south, the poison forest south-west, the flower jungle west --
     and each keeps its zone id, so the game's zones, shards and elements
     (src/data/zones.js, shards.js, elements.js) line up with them.

     A spoke's `dir` points it; `element` is its element; `realm` is which
     endgame realm its tip gate opens (Dark on the four compass points,
     Light on the diagonals).  `stages` are its four looks, one per twenty
     levels -- the prompt and the ground swatches use whichever a place is
     in -- each with the CAMP (waystation) that ends it.  `ground` in a
     stage is the swatch's brief: ground only, since whatever stands up is
     an object (docs/WORLD-BIBLE.md §11), and -- v2.3.2944, the owner's rule
     after wagon ruts tiled sideways -- with no detail that runs one way
     (style/bible.js NO_DIRECTION); `groundRevised` marks a brief rewritten
     for that, so the Ground Studio says which swatches to make again.
     `commonsEdge` is how the commons
     changes as it meets the spoke; `riverPaint` how the Sweetwater looks
     here.

     Every tip holds a KEYSTONE GATE -- a round stone gate carved with an
     eight-spoked wheel, the ancient thing the shard rush is really about
     (docs/WORLD-BIBLE.md).  A `landmark` is a place partway out, at the
     middle of `tier`, `side` squares right of the road looking outward.

     ONE LIGHT FOR THE WHOLE WORLD.  In one seamless map a hard day/night
     line at a border would be the worst seam of all, so everything is made
     in the same daylight and a spoke's MOOD is carried by its materials
     (black iron, glowing crystal) -- the game can darken a place with the
     atmosphere layer it already has.

     `features` scatter shapes of a class inside the region: `density` per
     million art px², `r` a radius range in art px, `shape` blob (round) or
     ridge (long, for cliffs and streams), `in` the stages (1-4) they appear
     in. */
  regions: {
    town: {
      name: 'Brotown', short: 'the town',
      ground: '#b98f55', groundName: 'ochre',
      paint: "packed-earth yards with patchy grass between the building plots, with barrels, crates, hitching posts, water troughs and a parked wagon or two",
    },
    commons: {
      name: 'Brotown Commons', short: 'the commons',
      ground: '#86b94f', groundName: 'grass green',
      paint: 'the safe common land round the town: neat fenced fields of crops and hay, orchards, split-rail fences, haystacks and cart tracks through short green grass',
      stages: [
        { name: 'the commons', paint: 'neat fenced fields of crops and hay, a few orchard trees, split-rail fences, haystacks and cart tracks through short green grass',
          ground: 'short green grass with a few small wildflowers' },
      ],
      obstacle: '#3c6b2c', obstacleName: 'dark green',
      obstaclePaint: 'clumps of leafy oaks and bushes with mossy grey boulders',
      water: '#46a9d8', waterName: 'sky blue',
      waterPaint: 'a clear pond with reeds and a rocky bank',
      cliffPaint: 'a low grey rock outcrop covered in moss and flowers',
      riverPaint: 'a clear, gently winding river with reeds, pebbly banks and a few flat stones',
      /* No monsters here: the commons is where everyone meets, and every
         spoke's level 1 starts at its edge. */
      landmark: { name: "Prospector's Circle", at: [-1.2, -1.15], color: '#c8c8c8', colorName: 'light grey', r: 140,
                  paint: 'a ring of eight weathered standing stones on a grassy knoll, around a round, flat stone slab carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 5, r: [22, 50] },
        { class: 'water', density: 0.5, r: [70, 150] },
      ],
    },
    frost: {
      name: 'Frost Ridge', short: 'the frost', element: 'frost', dir: 'NW', realm: 'radiant',
      road: { id: 'frost-trail', name: 'the Frost Trail' },
      ground: '#eef3f8', groundName: 'snow white',
      paint: 'deep snow with wind-carved drifts and patches of frosted grass',
      stages: [
        { name: 'the thaw line', paint: "patchy snow melting over wet brown grass, bare birches, trickling meltwater and an abandoned trapper's sled",
          ground: 'patchy snow melting over wet brown grass and mud',
          camp: { name: "Trapper's Rest", paint: 'a log cabin with furs drying on racks and a woodpile by the door' } },
        { name: 'the snowbound taiga', paint: 'deep snow with wind-carved drifts, boot and hoof tracks, and snow-laden pines',
          ground: 'deep, soft snow in gentle rounded drifts, shaded pale blue in the hollows', groundRevised: 'v2.3.2944',
          camp: { name: 'the Snowshoe Lodge', paint: 'a snowed-in hunting lodge with a smoking chimney and snowshoes by the door' } },
        { name: 'the glacier', paint: 'a blue-white glacier of cracked ice and wind-scoured snow crust, split by deep blue crevasses',
          ground: 'blue-white glacier ice with fine cracks, under a thin, patchy crust of snow', groundRevised: 'v2.3.2944',
          camp: { name: 'Crevasse Camp', paint: 'an expedition camp of canvas tents, sledges and ice picks roped together on the ice' } },
        { name: 'the frozen crown', paint: 'a high white plateau of rime ice and frozen spires glittering under a hard blue sky',
          ground: 'hard rime ice and packed snow glittering with frost crystals',
          camp: { name: 'the Last Fire', paint: 'a squat stone hut with a lantern always burning, the last shelter before the Ice Spires' } },
      ],
      commonsEdge: 'the commons grass stiffens with frost and the first snow lies in the hollows',
      obstacle: '#3e5d4f', obstacleName: 'dark pine green',
      obstaclePaint: 'clumps of snow-laden pine trees and snow-capped grey boulders',
      water: '#bfe6f7', waterName: 'pale ice blue',
      waterPaint: 'a frozen lake: pale blue ice with long cracks, snow drifting over its edges',
      cliffPaint: 'a sheer grey granite cliff capped with snow and icicles',
      riverPaint: 'a fast, icy meltwater river with shelves of ice along its banks',
      gate: { name: 'the Ice Spires', color: '#6fd0ff', colorName: 'bright light blue', r: 250,
              paint: 'a cluster of tall, jagged, glowing blue ice crystal spires around a round stone gate carved with an eight-spoked wheel, frozen into the ice' },
      features: [
        { class: 'obstacle', density: 20, r: [26, 78], in: [1, 2, 3] },
        { class: 'obstacle', density: 8, r: [22, 50], in: [4] },
        { class: 'water', density: 0.9, r: [100, 220], in: [1, 2, 3] },
        { class: 'cliff', density: 0.6, r: [24, 40], shape: 'ridge', len: [260, 600], in: [2, 3, 4] },
      ],
    },
    ember: {
      name: 'Flame Fields', short: 'the flame fields', element: 'flame', dir: 'N', realm: 'shadow',
      road: { id: 'north', name: 'the North Road' },
      ground: '#3b2c27', groundName: 'charcoal brown',
      paint: 'black volcanic ash and cracked basalt ground with faint glowing embers in the cracks',
      stages: [
        { name: 'the burn line', paint: 'scorched yellow grass giving way to grey ash, charred fence posts and blackened tree stumps, thin smoke rising from smouldering patches',
          ground: 'scorched yellow grass with patches of grey ash',
          camp: { name: 'Firewatch Post', paint: 'a wooden fire lookout tower with water barrels and a hand bell' } },
        { name: 'the ash plains', paint: 'black volcanic ash and cracked basalt ground with glowing embers in the cracks, and sulphur-yellow vents puffing steam',
          ground: 'black volcanic ash over cracked basalt, with a few faint glowing embers',
          camp: { name: 'Cinder Camp', paint: 'soot-stained tents behind a windbreak of stacked basalt' } },
        { name: 'the lava fields', paint: 'cracked black basalt crossed by channels of bright lava, with sulphur vents and heat shimmer',
          ground: 'cracked black basalt with thin glowing orange seams',
          camp: { name: 'Sulphur Springs', paint: 'a wooden bathhouse over a steaming yellow sulphur spring' } },
        { name: 'the volcano flanks', paint: 'steep black basalt slopes and cooled lava flows, bright lava running in channels, drifting ash',
          ground: 'rough black cooled lava with drifts of grey ash',
          camp: { name: 'the Obsidian Stair', paint: 'a camp cut into glassy black obsidian at the foot of the last climb' } },
      ],
      commonsEdge: 'the commons grass browns and scorches, with drifts of grey ash',
      obstacle: '#16100e', obstacleName: 'near-black',
      obstaclePaint: 'jagged black basalt spires and charred dead trees',
      cliffPaint: 'a wall of black hexagonal basalt columns with lava glowing in the joints',
      gate: { name: 'the Heart of the Volcano', color: '#6a2012', colorName: 'dark red-brown', r: 320,
              paint: 'the foot of a great volcano: a steep black cone with glowing lava running down its sides and smoke rising from vents, and at its base a sealed round stone gate carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 13, r: [26, 70] },
        { class: 'lava', density: 1.4, r: [70, 190], in: [2, 3, 4] },
        { class: 'lava', density: 0.5, r: [16, 30], shape: 'ridge', len: [350, 800], in: [3, 4] },
        { class: 'cliff', density: 0.5, r: [26, 44], shape: 'ridge', len: [260, 560], in: [2, 3, 4] },
      ],
    },
    sky: {
      name: 'Wind Dunes', short: 'the dunes', element: 'wind', dir: 'NE', realm: 'radiant',
      road: { id: 'dune-trail', name: 'the Dune Trail' },
      ground: '#dfc27c', groundName: 'sand yellow',
      paint: 'golden desert sand with wind ripples, patches of cracked dry earth, cacti and dry shrubs',
      stages: [
        { name: 'the sage flats', paint: 'dry sage scrub and tough grass on cracked earth, bleached cattle skulls, tumbleweeds and a broken wagon wheel',
          ground: 'cracked dry earth with tufts of sage and tough grass',
          camp: { name: 'Tumbleweed Station', paint: 'a stagecoach relay station with a wooden water tower and a corral' } },
        { name: 'the dunes', paint: 'golden sand dunes with wind ripples, red hoodoo rock stacks, cacti and a half-buried wagon wreck',
          ground: 'fine golden sand in soft, rounded hummocks, with a few small pebbles', groundRevised: 'v2.3.2944',
          camp: { name: 'Oasis Camp', paint: 'striped tents round a small palm-shaded oasis pool' } },
        { name: 'the red mesas', paint: 'flat-topped red sandstone mesas seen from above like everything else: sunlit tops, layered sides in shadow, sand drifting between them',
          ground: 'red sandstone rock with drifts of red sand',
          camp: { name: 'Mesa Top', paint: 'a camp on a mesa top with a rope lift and a wind vane' } },
        { name: 'the storm heights', paint: 'wind-scoured bare rock high above the desert, sand streaming across it, and arches carved by the wind',
          ground: 'wind-polished pale rock with small pockets of blown sand', groundRevised: 'v2.3.2944',
          camp: { name: 'Windbreak Keep', paint: 'a squat stone watchtower with ragged banners streaming in the wind' } },
      ],
      commonsEdge: 'the commons grass dries to straw and sand blows across it',
      obstacle: '#9c5f36', obstacleName: 'red-brown',
      obstaclePaint: 'red sandstone rock stacks and small mesas',
      cliffPaint: 'a layered red sandstone cliff',
      /* where the abandoned railway spur was heading when the money ran out */
      landmark: { name: 'the Buried City', tier: 9, side: 0.7, color: '#c65a3a', colorName: 'terracotta', r: 260,
                  paint: 'half-buried sandstone ruins: broken columns, toppled statues and a giant carved stone face half sunk in the sand' },
      gate: { name: 'the Sky Arch', color: '#ff8a8a', colorName: 'coral', r: 260,
              paint: 'a great natural stone arch on the highest rock, the wind howling through it, and beneath it a round stone gate carved with an eight-spoked wheel' },
      /* v2.3.2981: the OASES -- pools on the sage flats, the dunes and the
         red mesas (none up on the storm heights), each ringed with palms
         (placing.js, `oasis`): the owner, "The palm trees don't belong in
         the desert unless they surround water to emulate an oasis".  Big
         enough to show between palms 300 game px tall (330-480 game px
         across; the first try, a third of that, was hidden under their
         crowns), `clear` of the roads, the railway, the camps and the
         landmarks (layout.js), and last in the list, so the rocks and cliffs
         before it keep their places. */
      water: '#1f9e96', waterName: 'deep teal',
      waterPaint: 'a small, still oasis pool of clear water ringed with palm trees',
      features: [
        { class: 'obstacle', density: 10, r: [34, 95] },
        { class: 'cliff', density: 0.3, r: [26, 44], shape: 'ridge', len: [260, 520], in: [3, 4] },
        { class: 'water', density: 2, r: [110, 160], in: [1, 2, 3], clear: 30 },
      ],
    },
    hollows: {
      name: 'Stone Hollows', short: 'the hollows', element: 'stone', dir: 'E', realm: 'shadow',
      road: { id: 'east', name: 'the East Road' },
      ground: '#8c8378', groundName: 'stone grey',
      paint: 'grey stone badlands of cracked flagstone ground, loose rubble and pale moss',
      stages: [
        { name: 'the quarry', paint: 'stepped quarry terraces of cut grey stone, rubble heaps, abandoned mine carts and scattered picks and shovels',
          ground: 'packed grey gravel and stone dust with chips of cut stone',
          /* the junction where the railway's two branches leave through the passes */
          camp: { name: 'Railhead Junction', paint: 'the mine railway\'s junction: a wooden water tower, a coal bunker and a signal box' } },
        { name: 'the badlands', paint: 'grey stone badlands of cracked flagstone ground, loose rubble and pale moss, with clusters of glowing blue and violet crystals',
          ground: 'cracked grey flagstone rock with loose rubble and pale moss',
          camp: { name: 'Crystal Camp', paint: 'a prospectors\' camp of tents and sluice boxes among crystal outcrops' } },
        { name: 'the granite canyons', paint: 'towering grey granite walls and narrow canyons dropping into shadow, with crystal veins glowing in the rock',
          ground: 'smooth grey granite with thin glowing crystal veins',
          camp: { name: 'Canyon Bottom', paint: 'a camp at the bottom of a canyon, strung with rope bridges' } },
        { name: 'the deep roots', paint: 'dark stone galleries of the mountain\'s roots, with giant crystal pillars and still, dark pools',
          ground: 'dark slate-grey cave stone, smooth and cold',
          camp: { name: 'the Deep Lamp', paint: 'a miners\' lamp-house with a cage lift and a rack of lanterns' } },
      ],
      commonsEdge: 'the commons thins over stony ground and grey boulders',
      obstacle: '#4a453f', obstacleName: 'dark stone',
      obstaclePaint: 'clusters of rock spires with glowing blue and violet crystals at their feet',
      water: '#28364a', waterName: 'dark slate blue',
      waterPaint: 'a deep, still, dark pool reflecting glowing crystals',
      cliffPaint: 'a sheer grey canyon wall dropping into shadow',
      /* the mine that started the boomtown: the railway runs into it */
      landmark: { name: 'the Great Cave', tier: 6, side: 0.75, color: '#1a1a1a', colorName: 'black', r: 240,
                  paint: 'the mouth of a huge cave in a grey rock mountainside, framed by glowing crystals, with the mine railway running into it' },
      gate: { name: "the Titan's Door", color: '#5b4a8a', colorName: 'dusky violet', r: 260,
              paint: 'a colossal door carved into the mountainside at the end of the deepest canyon, sealed by a round stone gate carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 13, r: [34, 86] },
        { class: 'cliff', density: 1.1, r: [26, 48], shape: 'ridge', len: [300, 700], in: [2, 3, 4] },
        { class: 'water', density: 0.3, r: [70, 140], in: [3, 4] },
      ],
    },
    thunder: {
      name: 'Electric Foundry', short: 'the foundry', element: 'storm', dir: 'SE', realm: 'radiant',
      road: { id: 'foundry-road', name: 'the Foundry Road' },
      ground: '#4d5163', groundName: 'slate',
      paint: 'dark slate and iron floor plates joined by brass seams, with crackling blue electric light in the cracks',
      stages: [
        { name: 'the smelter yards', paint: 'trampled dirt yards scattered with slag heaps, coal piles and iron scrap',
          ground: 'trampled dark dirt with coal dust and flecks of slag',
          camp: { name: 'Coaling Station', paint: 'a coaling station with a crane over a heap of coal' } },
        { name: 'the foundry works', paint: 'dark slate and iron floor plates joined by brass seams, thick iron pipes along the ground and crackling blue electric light in the cracks',
          ground: 'dark, square iron floor plates joined by brass seams', groundRevised: 'v2.3.2944',
          camp: { name: 'Shift House', paint: 'a brick workers\' canteen with a steam whistle on the roof' } },
        { name: 'the coil fields', paint: 'fields of copper coils and lightning rods on scorched iron ground, arcs of blue electricity jumping between them',
          ground: 'scorched iron plating and cracked slate, with loose loops of copper wire', groundRevised: 'v2.3.2944',
          camp: { name: 'Relay Nine', paint: 'a telegraph relay hut with a humming antenna mast' } },
        { name: 'the storm plateau', paint: 'a high plateau of black iron under endless lightning, with twisted metal towers',
          ground: 'black iron plate spattered with fused glass where lightning struck',
          camp: { name: 'the Grounding Post', paint: 'a lightning-proof bunker under a tall copper rod' } },
      ],
      commonsEdge: 'the commons is trampled to dirt, with coal dust and scattered scrap',
      obstacle: '#23252f', obstacleName: 'black iron',
      obstaclePaint: 'iron machinery: thick pipes, gear-wheel pylons and small Tesla-coil towers glowing with blue-violet electric light',
      cliffPaint: 'a tall riveted iron wall',
      /* the railway's foundry branch ends here */
      landmark: { name: 'the Foundry Dome', tier: 6, side: -0.75, color: '#7a86c8', colorName: 'periwinkle', r: 240,
                  paint: 'a great iron dome with glowing blue windows, ringed by crackling electric pylons' },
      gate: { name: 'the Lightning Gate', color: '#b6ff00', colorName: 'electric lime', r: 260,
              paint: 'a ring of iron pylons crackling with blue lightning round a round stone gate carved with an eight-spoked wheel, caged in copper coils' },
      features: [
        { class: 'obstacle', density: 16, r: [26, 70] },
        { class: 'cliff', density: 0.4, r: [24, 38], shape: 'ridge', len: [260, 520], in: [2, 3, 4] },
      ],
    },
    tidal: {
      name: 'Water Caves', short: 'the sea caves', element: 'water', dir: 'S', realm: 'shadow',
      road: { id: 'south', name: 'the South Road' },
      ground: '#e6d6a3', groundName: 'pale sand',
      paint: 'pale beach sand and sea grass between dark mossy rocks',
      stages: [
        { name: 'the dune grass', paint: 'low sandy dunes held together by dune grass, driftwood, fishing nets drying on poles and a beached rowing boat',
          ground: 'pale sand with tufts of dune grass',
          camp: { name: "Netmender's Wharf", paint: 'a fishing shack on stilts with nets drying on poles' } },
        { name: 'the lagoons', paint: 'pale sand bars and dark mossy rocks between shallow lagoons, with the wreck of a small ship lying on its side',
          ground: 'wet pale sand with small tide pools',
          camp: { name: 'Wreck Cove', paint: 'a camp built from the planks of a wrecked ship' } },
        { name: 'the sea caves', paint: 'dark mossy sea cliffs and rock shelves with glowing teal caves at their foot',
          ground: 'dark wet rock with barnacles and faintly glowing teal algae',
          camp: { name: 'Lighthouse Point', paint: 'a small striped lighthouse on a rock' } },
        { name: 'the drowned reef', paint: 'a shallow reef of coral and giant shells, half under the water',
          ground: 'pale coral rubble and wet sand',
          camp: { name: 'Coral Watch', paint: 'a hut of driftwood and giant shells on the reef' } },
      ],
      commonsEdge: 'the commons grass turns to sandy dune grass',
      obstacle: '#5a5f55', obstacleName: 'dark rock',
      obstaclePaint: 'dark, mossy sea-rock outcrops',
      water: '#39c0c8', waterName: 'turquoise',
      waterPaint: 'a shallow turquoise lagoon with rocks showing through the water',
      cliffPaint: 'a dark mossy sea cliff with glowing teal caves at its foot',
      riverPaint: 'a wide, slow river mouth splitting into sandy channels as it meets the sea',
      gate: { name: 'the Drowned Keystone', color: '#2ab3a8', colorName: 'teal', r: 260,
              paint: 'a rocky headland pierced by sea caves glowing teal from inside, and in the shallows before it a round stone gate carved with an eight-spoked wheel, half under the water' },
      features: [
        { class: 'obstacle', density: 10, r: [34, 86] },
        { class: 'water', density: 1.4, r: [95, 215], in: [2, 3, 4] },
        { class: 'cliff', density: 0.6, r: [26, 44], shape: 'ridge', len: [260, 560], in: [3, 4] },
      ],
    },
    mist: {
      name: 'Poison Forest', short: 'the poison forest', element: 'venom', dir: 'SW', realm: 'radiant',
      road: { id: 'bog-trail', name: 'the Bog Trail' },
      ground: '#5f6d3f', groundName: 'murky olive',
      paint: 'murky moss and bog ground with low drifting mist',
      stages: [
        { name: 'the blighted farm', paint: 'a blighted field of withered crops and sickly yellow grass, a toppled scarecrow and a broken snake-oil wagon spilling green bottles',
          ground: 'sickly yellow grass and patchy clumps of withered crops on grey soil', groundRevised: 'v2.3.2944',
          camp: { name: 'Snake-Oil Stop', paint: "a travelling quack doctor's painted wagon and awning" } },
        { name: 'the slime woods', paint: 'murky moss and bog ground among twisted dead trees dripping green slime and giant purple and yellow toadstools',
          ground: 'murky green moss over black bog mud',
          camp: { name: 'the Stilt House', paint: 'a house on tall stilts above the bog, with a ladder' } },
        { name: 'the mangrove marsh', paint: 'a mangrove marsh of tangled roots over dark water and green scum, hung with grey moss',
          ground: 'dark mud laced with tangled roots and green scum',
          camp: { name: 'Gator Landing', paint: 'a plank landing over the marsh with a flat-bottomed boat tied up' } },
        { name: 'the spore depths', paint: 'a deep fungal forest floor carpeted in glowing spores, with toadstools taller than trees',
          ground: 'a spongy purple fungal mat dusted with glowing spores',
          camp: { name: 'the Mask Hut', paint: 'a hut hung with gas masks and bundles of drying herbs' } },
      ],
      commonsEdge: 'the commons grass yellows and sickens, with the first mushrooms and a sour green haze',
      obstacle: '#2c351f', obstacleName: 'dark bog green',
      obstaclePaint: 'twisted dead trees dripping green slime, and giant purple and yellow toadstools',
      water: '#8fd13f', waterName: 'acid green',
      waterPaint: 'a glowing acid-green poison pool with ripples',
      cliffPaint: 'a mossy, root-covered rock bank',
      riverPaint: 'a slow, murky green-brown river edged with reeds and slime, spreading into a delta of muddy channels',
      gate: { name: 'the Toadstool Ring', color: '#9a4fc0', colorName: 'purple', r: 250,
              paint: 'a ring of giant purple toadstools round a glowing poison pool, with a round stone gate carved with an eight-spoked wheel sinking into the mud at its centre' },
      features: [
        { class: 'obstacle', density: 18, r: [26, 70] },
        { class: 'water', density: 1.8, r: [50, 130], in: [2, 3, 4] },
      ],
    },
    verdant: {
      name: 'Verdant Wilds', short: 'the wilds', element: 'flora', dir: 'W', realm: 'shadow',
      road: { id: 'west', name: 'the West Road' },
      ground: '#3f9a3f', groundName: 'deep green',
      paint: 'lush jungle floor of grass, ferns and giant colourful flowers (red, purple, teal and yellow)',
      stages: [
        { name: 'the overgrown orchards', paint: 'an old orchard of fruit trees gone wild, a tumbledown stone wall, tall grass and the first giant flowers',
          ground: 'tall green grass with fallen leaves and small wildflowers',
          camp: { name: 'the Orchard House', paint: 'an old farmhouse turned travellers\' inn, with cider barrels on the porch' } },
        { name: 'the vine jungle', paint: 'lush jungle floor of ferns and giant colourful flowers (red, purple, teal and yellow) under giant mossy trees hung with vines',
          ground: 'dark green jungle floor of ferns and moss with fallen petals',
          camp: { name: 'Vine Bridge Camp', paint: 'platforms and rope bridges slung between giant tree trunks' } },
        { name: 'the waterfall cliffs', paint: 'mossy cliff terraces with small waterfalls tumbling between ferns into jade pools',
          ground: 'wet mossy stone and fern-covered earth',
          camp: { name: 'Mistfall Terrace', paint: 'a terraced camp beside a waterfall, with a water wheel' } },
        { name: 'the elder grove', paint: 'a primeval grove of colossal ancient trees with roots like walls and glowing flowers in the gloom',
          ground: 'deep moss and root-laced earth scattered with glowing petals',
          camp: { name: "the Rootwarden's Hollow", paint: 'a round-doored hut built inside a hollow root' } },
      ],
      commonsEdge: 'the commons grass grows lush and tall, with giant flowers and the first vines',
      obstacle: '#1d5a22', obstacleName: 'dark jungle green',
      obstaclePaint: 'giant mossy trees draped in hanging vines, with ferns and mossy boulders at their roots',
      water: '#2fc0b0', waterName: 'jade',
      waterPaint: 'a clear jade stream with mossy stones and small waterfalls',
      cliffPaint: 'a mossy rock ledge overgrown with vines and flowers',
      riverPaint: 'a clear, fast river over mossy stones, edged with ferns and giant flowers',
      gate: { name: 'the Vine Arch', color: '#e070b0', colorName: 'pink', r: 250,
              paint: 'a great archway of living vines hung with giant flowers, framing a round stone gate carved with an eight-spoked wheel wrapped in roots' },
      features: [
        { class: 'obstacle', density: 25, r: [34, 86] },
        { class: 'water', density: 0.7, r: [16, 26], shape: 'ridge', len: [430, 860], in: [2, 3, 4] },
        { class: 'cliff', density: 0.5, r: [24, 40], shape: 'ridge', len: [260, 520], in: [3] },
      ],
    },
  },

  /* ── THE REALMS: the endgame, behind the keystone gates ──
     Levels 80-100, for the two endgame elements, Dark and Light
     (src/data/elements.js).  Each is a map of its own behind the gates at
     four spoke tips -- a door, in the language of docs/WORLD-ARCHITECTURE.md
     -- so neither takes room on the island.  Each has eight corners, one
     per element, so the element a player chose still matters at the top:
     the gate from Flame Fields opens onto the Dark Sanctum's flame corner.
     The ids and names are today's endgame zones (src/data/zones.js). */
  realms: {
    shadow: {
      name: 'the Dark Sanctum', element: 'dark', level: [80, 100],
      paint: 'a realm of endless dusk where every element lives on corrupted: black frost, cold violet fire, still poisoned water, dead stone that whispers',
    },
    radiant: {
      name: 'the Light Summit', element: 'light', level: [80, 100],
      paint: 'a realm of blinding dawn above the clouds where every element is found purified: singing ice, white flame, water like glass, stone that glows',
    },
  },

  /* ── BORDERS AND PASSES: where two neighbouring spokes meet ──
     Keyed by the two region ids in alphabetical order.  `land` is the
     landscape in between, used wherever the two meet: at their bases next
     to the commons, and on the PASSES that join them across the sea.
     `ground` is its ground swatch's brief (v2.3.2937, the Ground Studio):
     ground only, since whatever stands up is an object, and nothing that
     runs one way (v2.3.2944; `groundRevised` as for the stages).
     `passes` names the pass in each tier of `wheel.passes` (levels 20 and
     60): the home for monsters of both elements, and the natural place for
     fusion.  Only neighbours meet, so there are exactly eight. */
  borders: {
    'ember|frost': { land: 'steam fields: snow melting into hot springs and wet black rock, with geysers and drifting steam',
                     ground: 'wet black rock and slushy melting snow, with small steaming puddles',
                     passes: ['Geyser Gap', 'the Steam Stair'] },
    'ember|sky': { land: 'ash dunes: grey volcanic ash blowing over golden sand, and charred cacti',
                   ground: 'grey volcanic ash drifted over golden sand',
                   passes: ['Cinder Crossing', 'the Ashen Reach'] },
    'hollows|sky': { land: 'the sand gives way to stone: red sandstone breaking up into grey granite boulders',
                     ground: 'red sand scattered over grey granite gravel',
                     passes: ['Redrock Gap', 'the Sandstone Stair'] },
    'hollows|thunder': { land: 'the mine works: spoil heaps, ore piles, abandoned mine carts and the first iron pipes',
                         ground: 'trampled grey spoil and ore dust with flakes of rusty iron',
                         passes: ['Ore Cut', 'the Slag Causeway'] },
    'thunder|tidal': { land: 'the foundry meets the shore: slag running down to the sand, rusted chains and cargo crates',
                       ground: 'dark sand spattered with grey slag and flecks of rust', groundRevised: 'v2.3.2944',
                       passes: ['Chain Ford', 'the Iron Pier'] },
    'mist|tidal': { land: 'brackish marsh: lagoons gone murky, mangrove roots and sickly dune grass',
                    ground: 'wet grey-green mud with patches of sickly dune grass',
                    passes: ['Brackwater Crossing', 'the Rotting Causeway'] },
    'mist|verdant': { land: 'the rot line: the jungle\'s giant flowers wilting grey-green and its vines turning into slimy dead branches',
                      ground: 'wilting grey-green grass and fallen grey petals over dark soil',
                      passes: ['Wilt Gap', 'the Blight Bridge'] },
    'frost|verdant': { land: 'alpine meadows: snowmelt streams through short green grass and alpine flowers, with the first pines',
                       ground: 'short alpine grass with small white and purple flowers and patches of old snow',
                       passes: ['Meltwater Gap', 'the High Meadow Pass'] },
  },
  /* How a pass looks, by the tier it is in: short at level 20, where the
     spokes are close; a long causeway at level 60, where they are far. */
  passPaint: {
    4: 'a neck of land between two seas',
    12: 'a long, narrow ridge of land across the open sea',
  },

  /* ── THE STYLE BIBLE: BroTown HD pixel art (v2.3.2935) ──
     Owner, 2026-09-29, choosing between the looks: "I think HD pixel art is
     the direction I want to go", and "Yes 1.5 grid" -- one art pixel was 1.5
     game px (the bro's own pixels are about 2), until v2.3.2942 kept every
     picture at 2 px per game px instead.

     The part of every prompt that never changes.  Consistency across a
     hundred separate generations comes from here, from the STYLE KEY below
     and from the finished edges in each template -- never from ChatGPT
     remembering earlier squares.  What words cannot hold, the art pipeline
     does to every picture afterwards: its sharpness (2 px per game px), one frozen palette,
     no stray single pixels (public/tools/style/process.js).  The rules and
     the reasons are in docs/WORLD-BIBLE.md §6.  `{person}` and `{across}`
     are filled in from the scale above. */
  style: [
    'BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients.',
    'Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones. Shadows shift toward cool blue-purple and highlights toward warm yellow. Moderate saturation.',
    MATERIALS,
    'Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog, night or lighting effects: the game adds those.',
    'The ground is calm, mid-toned and low in contrast, so characters and monsters stand out, and it has no outlines. Anything that stands up (a cliff, a rock) has a one-pixel outline in a darker shade of its own colour, never black.',
    'Seen from straight above at a steep three-quarter angle, like a classic 2D action-RPG map. No horizon, no sky and no perspective: the top of the square is exactly as close to the camera as the bottom, and everything is drawn at the same size wherever it is.',
    'Scale: a person would be about {person} pixels tall here, so the square is about {across} people across. A tree is nearly twice as tall as a person; a boulder about half.',
    'The ground runs off all four edges of the square. It is one piece of a bigger map, not a picture of its own.',
  ],
  never: [
    'text', 'letters', 'numbers', 'labels', 'signs with writing', 'grid lines', 'a border or frame', 'a vignette or darkened edges',
    'sky', 'clouds', 'a horizon', 'people', 'animals', 'monsters',
    'buildings or houses (building plots stay empty)', 'UI', 'a compass', 'a watermark',
    'blur or soft gradients', 'glow or light effects', 'cast shadows', 'black outlines',
  ],

  /* ── THE STYLE KEY ──
     One picture, made once, before anything else, and attached to EVERY
     picture's chat after that: ground, objects, buildings, characters (the
     builder keeps it for squares).  Words alone drift over a hundred
     generations; a picture to match does not drift as far.

     Eight of its tiles are GROUND, because the ground swatches are made
     first and must match each other exactly (docs/WORLD-BIBLE.md §13).

     v2.3.2939, owner: "I don't really want my character to be the reference
     image because I'm wanting the world to be high definition pixel art
     (especially material-aware texturing) and my character is simple pixel
     art."  Until then the ninth tile was the bro, from a screenshot attached
     to the chat -- which pulled the whole key toward his chunkier, flatter
     pixels.  Now nothing is attached: the ninth tile is a plain figure for
     SIZE beside an oak, a boulder and an iron-hooped barrel -- foliage, bark,
     stone, wood and metal in one tile, so every later object has its
     outline, shading, materials and size to match.  The lava, crystal and
     ooze tiles ask for bright colour, not glow (rule 4). */
  styleKey: {
    prompt: [
      'Make a STYLE KEY sheet for BroTown, a 2D action RPG drawn in HD pixel art: one square picture divided into a 3 x 3 grid of nine equal square tiles, separated by thin plain dark-grey gaps.',
      'Every tile is drawn in the same crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars: hard-edged pixels only, with no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, shadows shifted toward cool blue-purple and highlights toward warm yellow, in soft daylight from the upper left, with no cast shadows, no glow and no fog.',
      MATERIALS,
      'Every tile is seen from the same steep three-quarter top-down angle, with no horizon, no sky and no perspective, and drawn at the same scale: the figure in tile 9 is about a quarter of a tile tall.',
      'The ground is calm and mid-toned, with no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black.',
      'The nine tiles, left to right, top to bottom:',
      '1. green meadow grass with a few small wildflowers, crossed by a dirt path with two wheel ruts;',
      "2. the dirt Main Street of a frontier town, with wheel ruts, meeting the edge of a raised wooden boardwalk;",
      '3. pale beach sand meeting clear, shallow turquoise water;',
      '4. deep snow with wind-carved drifts, meeting the edge of a frozen pond;',
      '5. black volcanic ash and cracked basalt, with a thin crack of bright molten lava (bright colour only, with no glow round it);',
      '6. golden desert sand with wind ripples and a few loose red stones;',
      '7. grey cave-stone floor with a small cluster of sharp-faceted blue crystals;',
      '8. dark bog mud with twisted roots and a small puddle of bright green ooze;',
      '9. the size and materials tile: on grass, a plain dark-grey silhouette of a standing man with no face or clothing (a size marker only), beside a leafy oak tree nearly twice his height, a mossy boulder half his height and a wooden barrel with iron hoops about waist-high.',
      'No text, letters or labels anywhere. No border round the whole picture.',
    ],
  },
};

/* ═══ THE WHEEL'S ROUTES AND CAMPS, laid out from its geometry ═══
 *
 * The roads, the passes, the camps, the Sweetwater River and the mine
 * railway, placed with core/wheel.js so they always sit where the spokes
 * are: change the wheel's numbers above and they follow.  A side is squares
 * to the right of a spoke's road, looking outward from town.  Everything is
 * rounded to 1/1000 of a square, and a road that forks starts on EXACTLY a
 * point of the road it leaves -- which is how a fork is recognised
 * (core/prompt.js) and why the two meet cleanly (core/layout.js).
 */
/* v2.3.2982: the routes and places the plan lists itself, before the
   wheel's join them -- so a plan with another town (bigTownPlan, below) can
   lay the wheel's again round it */
const BASE_ROUTES = { roads: PLAN.roads.slice(), rivers: PLAN.rivers.slice(), rails: PLAN.rails.slice(), places: PLAN.places.slice() };

function layWheel(P) {
  const W = wheelInfo(P);
  const R = W.tierMid;
  const step = P.square.px - P.square.overlap;
  /* just inside a town gate, to meet its street (v2.3.2982: each street's
     own gate -- Main Street's north and south, Market Row's east and west) */
  const G = townGates(P.town);
  const gateOf = (s) => (s.ux === 0 ? G.ns : G.ew);
  const startOf = (s) => Math.round((gateOf(s) / step - 0.03) * 1000) / 1000;
  /* where a diagonal road leaves its compass road: 1.75 squares out, or
     (v2.3.2982) past the gate of a town that reaches further */
  const forkOf = (s) => Math.max(1.75, Math.round((gateOf(s) / step + 0.3) * 1000) / 1000);
  const cardinal = (s) => s.ux === 0 || s.uy === 0;
  /* The diagonal roads fork off the next compass road clockwise -- the old
     pinwheel: the North Road forks to the Frost Trail, the East Road to the
     Dune Trail, the South Road to the Foundry Road, the West Road to the Bog
     Trail. */
  const forkFrom = Object.create(null);
  for (const [a, b] of W.pairs) if (!cardinal(a) && cardinal(b)) forkFrom[a.id] = b;
  const midpoint = (p, q) => [Math.round((p[0] + q[0]) * 500) / 1000, Math.round((p[1] + q[1]) * 500) / 1000];
  const trunk = Object.create(null), onTier = Object.create(null);

  /* ── a trunk road down every spoke, town to gate ──
     Straight through the camps and the pass junctions (tiers 4, 8, 12, 16),
     wandering a little between them. */
  for (const s of W.spokes) {
    const rd = P.regions[s.id];
    let pts;
    if (cardinal(s)) pts = [spokePoint(s, startOf(s)), spokePoint(s, forkOf(s))];
    else {
      const f = spokePoint(forkFrom[s.id], forkOf(forkFrom[s.id])), h = spokePoint(s, W.hub);
      pts = [f, midpoint(f, h)];
    }
    pts.push(spokePoint(s, W.hub));
    onTier[s.id] = Object.create(null);
    for (let t = 2; t <= W.tiers; t += 2) pts.push((onTier[s.id][t] = spokePoint(s, R(t), t % 4 ? ((s.i + t) % 2 ? 0.18 : -0.18) : 0)));
    pts.push(spokePoint(s, W.gateR));
    trunk[s.id] = pts;
    P.roads.push({ id: rd.road.id, name: rd.road.name, to: s.id, half: cardinal(s) ? 35 : 28, pts });
  }

  /* ── the passes: an arc across the sea at the same level on both sides ── */
  for (const [a, b] of W.pairs) {
    const key = [a.id, b.id].sort().join('|');
    const names = (P.borders[key] && P.borders[key].passes) || [];
    P.wheel.passes.forEach((t, k) => {
      P.roads.push({ id: `pass-${a.id}-${b.id}-${t}`, name: names[k] || 'the pass', half: 26,
        pass: { a: a.id, b: b.id, tier: t, level: W.levels(t)[1] }, pts: arcPoints(a, b, R(t), 8) });
    });
  }

  /* ── the camps: a waystation at levels 20, 40, 60 and 80 on every road,
     just past the pass junction, on the right ── */
  for (const s of W.spokes) {
    const rd = P.regions[s.id];
    for (const t of P.wheel.camps) {
      const st = rd.stages[stageOf(W, t)];
      P.places.push({ id: `camp-${s.id}-${t}`, name: st.camp.name, at: spokePoint(s, R(t) + 0.3, 0.32), r: 95,
        paint: `${st.camp.paint}: a waystation for travellers`, camp: { region: s.id, tier: t, level: W.levels(t)[1] } });
    }
  }

  /* ── footpaths: across the commons, and from a road to each landmark ── */
  P.roads.push({ id: 'stones-path', name: "the path to Prospector's Circle", half: 20,
    pts: [trunk.frost[1], [-1.0, -1.45], P.regions.commons.landmark.at] });
  /* it stops inside the ring, so the arena's middle stays open ground */
  P.roads.push({ id: 'arena-path', name: 'the path to the Arena', half: 22,
    pts: [trunk.sky[1], [1.45, -1.0], [1.31, -1.08]] });
  for (const s of W.spokes) {
    const L = P.regions[s.id].landmark;
    if (!L || !L.tier) continue;
    const from = onTier[s.id][2 * Math.round(L.tier / 2)], to = spokePoint(s, R(L.tier), L.side);
    P.roads.push({ id: `${s.id}-landmark-path`, name: `the path to ${L.name}`, half: 22, pts: [from, midpoint(from, to), to] });
  }

  /* ── THE SWEETWATER RIVER ──
     Born under the glacier on Frost Ridge, it drops over Sweetwater Falls
     where the glacier ends, runs down the spoke's west side, crosses the
     commons past the town's west gate (the Mill Bridge carries the West Road
     over it), cuts across the Bog Trail (the Snake Bridge) and spreads into
     a delta in the brackish lagoon between the Poison Forest and the Water
     Caves.  Width grows from source to sea (art px). */
  const fr = W.byId.frost, mi = W.byId.mist;
  P.rivers.push({
    id: 'sweetwater', name: 'the Sweetwater River',
    pts: [spokePoint(fr, R(10.3), -0.4), spokePoint(fr, R(8.5), -0.5), spokePoint(fr, R(7), -0.62), spokePoint(fr, R(5.2), -0.55),
      spokePoint(fr, R(3.4), -0.62), spokePoint(fr, R(1.6), -0.5), spokePoint(fr, R(1), -0.45),
      [-2.1, -0.95], [-2.02, 0], [-2.08, 1.0],
      spokePoint(mi, R(1.2), 0.25), spokePoint(mi, R(2), -0.55), spokePoint(mi, R(2.45), -1.25), spokePoint(mi, R(2.58), -1.76)],
    width: [34, 104], wobble: 35,
    source: 'pouring as meltwater from under the glacier',
    mouth: 'spreads into a delta of muddy channels as it meets the brackish lagoon',
    falls: [{ at: spokePoint(fr, R(8.5), -0.5), len: 1.0, name: 'Sweetwater Falls',
              paint: 'the river pours off the end of the glacier as a roaring white waterfall into a churning pool below' }],
  });

  /* ── THE MINE RAILWAY ──
     The boomtown's lifeline: from the Rail Depot outside the east gate down
     the Stone Hollows spoke to the Great Cave, with a telegraph line beside
     it.  At Railhead Junction (level 20) two branches leave through the
     passes: to the Foundry Dome through Ore Cut, and an abandoned spur
     through Redrock Gap toward the Buried City that was never finished.
     The branches run on the town side of the pass roads. */
  const st = W.byId.hollows, sm = W.byId.thunder, wd = W.byId.sky;
  const J = spokePoint(st, R(4) - 0.25, 0.5);
  const lm = (s) => { const L = P.regions[s.id].landmark; return spokePoint(s, R(L.tier), L.side); };
  const rr = R(4) - 0.18;
  P.rails.push({ id: 'mine-line', name: 'the mine railway',
    pts: [[1.66, 0.46], [2.3, 0.5], spokePoint(st, R(2), 0.5), spokePoint(st, R(3), 0.52), J, spokePoint(st, R(5), 0.62), lm(st)] });
  P.rails.push({ id: 'foundry-branch', name: 'the foundry branch of the mine railway',
    pts: [J, arcPoint(st, sm, rr, 0.2), arcPoint(st, sm, rr, 0.45), arcPoint(st, sm, rr, 0.7), arcPoint(st, sm, rr, 0.92),
      spokePoint(sm, R(4.7), -0.45), spokePoint(sm, R(5.4), -0.6), lm(sm)] });
  P.rails.push({ id: 'dunes-spur', name: 'the abandoned dunes spur of the mine railway', abandoned: true,
    paint: 'an abandoned single-track railway: rails rusted and half-buried in drifting sand, sleepers missing, telegraph poles leaning or fallen',
    pts: [J, arcPoint(wd, st, rr, 0.8), arcPoint(wd, st, rr, 0.55), arcPoint(wd, st, rr, 0.3), arcPoint(wd, st, rr, 0.08),
      spokePoint(wd, R(4.7), 0.45), spokePoint(wd, R(5.8), 0.55), spokePoint(wd, R(7), 0.6)] });
}
layWheel(PLAN);

/* The spokes, in the order the plan lists them (clockwise from north-west)
   -- the regions that are not the town or the commons. */
export const SPOKES = Object.keys(PLAN.regions).filter((k) => PLAN.regions[k].dir);

/* ═══ v2.3.2982: THE BIG-TOWN PREVIEW ═══
 *
 * Owner, 2026-10-02: "I actually think all the buildings need to be twice as
 * large let me see preview".  `?trial=wheel&bigtown` (twice; `bigtown=1.5`
 * any size up to BIG_TOWN_MAX) lays the town for buildings that many times
 * the size and draws them so: the SAME pictures, drawn bigger -- softer,
 * every pixel of theirs that many times as big as everything else's.
 * Without it nothing changes.
 *
 * What grows with the buildings: each plot (its width, its depth, the room
 * for a roof), the Town Hall's plot, and -- halfway, (1 + k) / 2 -- the
 * square, the front walks and the gaps between plots.  The streets keep
 * their width.  Twice-size buildings make a town twice as wide, four times
 * the ground, and the hub does not grow -- it cannot: the Wheel already
 * nearly fills its frame -- so Market Row keeps ONE plot a side on each arm
 * (`perSideRow`), the second ones' buildings left out (13 of the 17 stand),
 * which keeps the town off the Sweetwater River west of it.  The gates go
 * where the plots end, each street its own (`gateNS`, `gateEW`); the wheel's
 * roads are laid again from them (layWheel), and the Rail Depot and the Old
 * Mill, which the bigger town would cover, move out past the east and west
 * gates.  The monsters stand where they stood: the lands are the same.
 */
export const BIG_TOWN_MAX = 2.5;

/* The building size the address asks for: `bigtown` alone is 2, `bigtown=k`
   is k (1 to BIG_TOWN_MAX); 1 without it. */
export function bigTownScale(search) {
  const m = /(?:^|[?&])bigtown(?:=([0-9.]*))?(?:&|$)/.exec(search || '');
  if (!m) return 1;
  const k = m[1] ? Number(m[1]) : 2;
  return Number.isFinite(k) && k > 0 ? Math.max(1, Math.min(BIG_TOWN_MAX, k)) : 2;
}

/* The plan with the town laid for buildings `k` times the size, or the plan
   itself when k is 1. */
export function bigTownPlan(k) {
  if (!(k > 1)) return PLAN;
  const T = PLAN.town, L = T.lot;
  const grow = (v) => Math.round(v * k), half = (v) => Math.round((v * (1 + k)) / 2);
  const lot = { ...L, w: grow(L.w), d: grow(L.d), tall: grow(L.tall), walk: half(L.walk), gap: half(L.gap), perSideRow: 1 };
  const town = { ...T, square: half(T.square), hall: { w: grow(T.hall.w), d: grow(T.hall.d) }, lot, buildingScale: k };
  /* the gates: past the last door on each street (Main Street's last front
     walks; Market Row's last plot), and the town's ground behind it */
  const tp = townPlan(town);
  const ends = { ns: 0, ew: tp.rowEnd };
  for (const l of tp.lots) {
    if (l.arm === 'north' || l.arm === 'south') ends.ns = Math.max(ends.ns, Math.abs(l.foot.y) + lot.walk);
  }
  town.gateNS = Math.round(Math.max(T.gate, ends.ns + T.yard));
  town.gateEW = Math.round(Math.max(T.gate, ends.ew + T.yard));
  const step = PLAN.square.px - PLAN.square.overlap;
  /* the depot and the mill, out past the gates as far as they stood past
     the old one (in squares from the centre) */
  const out = (pl, axis, g) => {
    const at = pl.at.slice();
    at[axis] = Math.sign(at[axis]) * (Math.abs(at[axis]) + (g - T.gate) / step);
    return { ...pl, at };
  };
  const places = BASE_ROUTES.places.map((pl) => (pl.id === 'depot' || pl.id === 'mill' ? out(pl, 0, town.gateEW) : pl));
  const P = { ...PLAN, town, bigTown: k, wheel: { ...PLAN.wheel },
    roads: BASE_ROUTES.roads.slice(), rivers: BASE_ROUTES.rivers.slice(), rails: BASE_ROUTES.rails.slice(), places };
  layWheel(P);
  return P;
}
