/* ═══ v2.3.2931: THE WORLD PLAN — one seamless map, painted square by square ═══
 *
 * Owner: "I'm wanting one seamless map and to have chatGPT draw it into
 * squares.  I'll need to fuse them together but have some type of grid and
 * prompt system to construct the entire thing."  And, the next day: "I would
 * want your help creating the through lines that tie it all together in a
 * cool way ... I'm imagining [Brotown] laid out closer to an 1800's style map
 * where there's a Main Street and some buildings line the street."
 *
 * This file is the single source of truth for that map.  The World Builder
 * page (index.html next to this file) reads it to draw the grid, build the
 * blueprint, write every square's prompt and fuse what ChatGPT paints.  The
 * WORLD itself -- the story, the through-lines, what every region and border
 * looks like and why -- is written up for people in docs/WORLD-BIBLE.md; the
 * machinery in docs/WORLD-MAP-PIPELINE.md.  Keep the three in step.
 *
 * ── EVERY POSITION IS IN SQUARES FROM THE WORLD CENTRE ──
 * East is +x, south is +y, one unit is one square step (768 art px).  The
 * centre is the middle of square M13, where the Town Hall stands.  Positions
 * never depend on how big the painted area is, so growing the world (below)
 * moves nothing.  Town layout numbers are in art px from the same centre.
 *
 * ── DECIDE THESE BEFORE PAINTING, NOT AFTER ──
 * `grid`, `square`, `worldPxPerArtPx`, `seed`, and every position below
 * decide WHERE things sit in each square's blueprint.  Change one after a
 * square is painted and that square no longer matches its plan: the builder
 * compares each painted square's plan with the current one and names the
 * squares that changed, but it cannot repaint them.  The descriptive text
 * (paint, zones, borders, style, never) is safe to change at any time -- it
 * only changes prompts.
 *
 * ── THE NUMBERS, IN ONE PLACE ──
 *   square   1024 art px; each ChatGPT picture is resampled to this
 *   overlap   256 art px (25%) shared with each neighbour: the seam hides here
 *   step      768 art px between square origins (square - overlap)
 *   frame    25 x 25 squares, A1..Y25 -- names and positions; M13 is the
 *            centre
 *   active   G7..S19, 13 x 13 squares -- what is painted today
 *   island   ~6 squares from the centre to the coast: 10,240 art px of
 *            active area = 13,312 world px across (x 1.3 world px per art
 *            px, the density the town is drawn at today); ~80 s to walk
 *            coast to coast at the ~150 px/s base run speed
 *   squares  169 in the active area: 137 have land and need painting, 32
 *            are open sea past the coast (optional)
 *
 * ── GROWING THE WORLD LATER ──
 * Widen `active` (say to F6..T20).  Nothing already painted moves or is
 * renamed; the new squares are open sea until the plan puts land there --
 * new islands reached by boat, or the coast pushed outward (which changes
 * the coast squares, and only those: the builder names them).  The core
 * suite proves both (tools/world/test-world-core.mjs, "growth").
 */

export const PLAN = {
  id: 'brotown-world',
  version: 2,
  /* Every random choice in the blueprint (coast wobble, where the ponds and
     tree clumps go, how the region borders wander) comes from this number
     and from absolute position.  Same seed -> same world, on every device,
     forever -- and the same square keeps the same plan when the world grows. */
  seed: 20260929,

  /* The FRAME: names and positions.  Columns A..Y west to east, rows 1..25
     north to south.  It may grow toward the south and east later (more
     columns after Y, more rows after 25); never shrink it, and never add
     anything before A or row 1 -- that renames every square. */
  grid: { cols: 25, rows: 25 },
  /* The square whose middle is the world centre: every position below is
     measured from here, which is what lets the frame grow without moving
     anything.  Never change it. */
  centre: 'M13',
  /* The ACTIVE area: the squares there are to paint.  Grow it to grow the
     world (see the header). */
  active: { from: 'G7', to: 'S19' },

  /* What each ChatGPT picture becomes.  ChatGPT hands back 1024 or 1254 px
     squares depending on the day; both are resampled to `px`, so the rest
     of the pipeline never sees the difference.  `overlap` is the band each
     square shares with each neighbour.  25% is deliberately generous: the
     model only ever sees that much of a finished neighbour, and the fuser
     needs room to route its seam around a tree rather than through it. */
  square: { px: 1024, overlap: 256 },

  /* World px per art px.  1.3 is how the town is drawn today (town_v17:
     1674 px of art over 2176 world px), so characters and buildings keep
     their current size against the ground.  The spokes are drawn sharper
     today (0.82); matching them instead would need (1.3/0.82)^2 = 2.5x as
     many squares for the same ground. */
  worldPxPerArtPx: 1.3,

  /* One blueprint cell covers this many art px.  8 keeps the active area to
     1280 x 1280 cells: quick to build on a phone, fine enough that a road is
     10 cells wide. */
  blueprintScale: 8,

  /* ── THE SHAPE OF THE ISLAND (squares from the centre) ──
     `radius` is the coast's distance, wobbled by noise of `freq` cycles per
     square so it is not a circle; `square` blends the shape from a circle
     (0) toward a square (1) so the island uses more of the grid. */
  coast: { radius: 5.95, wobble: 0.45, square: 0.35, freq: 0.25 },
  /* The Starting Meadow is a ring round the town rather than a spoke:
     everything else is reached through it, which is what a starting area
     is for. */
  meadow: { radius: 2.8, wobble: 0.6, freq: 0.34 },
  /* How far region borders wander from the straight line between two
     hearts (squares), and how tangled they are (cycles per square). */
  regionWarp: { amount: 1.35, freq: 0.42 },
  /* Each region is painted in three bands, by how far out you are between
     the meadow and the coast: the FRINGE where it meets the frontier, its
     HEART, and the wild RIM toward the sea.  Danger rises outward. */
  bands: [0.33, 0.72],

  /* ── ANCHORS: finished paintings placed before any square is made ──
     None by default: Brotown is being redrawn as a Main Street town (below),
     so the old town painting (town_v17) is no longer the centrepiece.  The
     machinery stays, for any painting that should be kept exactly as it is.
     Shape of an entry, positions in squares from the centre:
       { id, name, src, size: [w, h], at: [sx, sy], inset: {top, left,
         right, bottom}, feather, gate: [fx, fy] } */
  anchors: [],

  /* ── TERRAIN CLASSES: the colours of the blueprint ──
     The blueprint is a flat colour-coded plan of the whole world.  It does
     two jobs.  Today it is the layout sketch ChatGPT paints over, so a river
     or a road crossing a square border continues on both sides.  Later it
     becomes the game's collision map: `walk` says whether feet may stand
     there, and cliffs are where climbing will go.  Drawing the walls FIRST
     and painting to them is the opposite of what failed twice before
     (walls traced off finished paintings, tiledMaps.js v2.3.1693/1794).

     `color` is what the sketch shows ChatGPT; `colorName` is how the prompt
     refers to it.  Classes whose look depends on the region (ground,
     obstacle, water, cliff, river) take colour or description from the
     region.  Every colour is distinct across the whole world, so a legend
     line can never mean two things. */
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
    rail:      { walk: true,  color: '#ffffff', colorName: 'white',
                 paint: 'a single-track mine railway: dark wooden sleepers under two iron rails on a gravel bed, with a line of wooden telegraph poles beside it' },
    bridge:    { walk: true,  color: '#ffd21f', colorName: 'bright yellow',
                 paint: 'a sturdy wooden bridge of heavy planks with low rails, wide enough for a wagon' },
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
     BIBLE.md has the reasoning). */
  town: {
    name: 'Brotown',
    main: 72,          /* Main Street half-width (north-south) */
    row: 60,           /* Market Row half-width (east-west) */
    boardwalk: 26,
    square: 250,       /* the town square's half-size */
    hall: 120,         /* the Town Hall plot's half-size, in the square's middle */
    lot: { front: 230, deep: 230, gap: 40, first: 340, perSide: 2 },
    yard: 90,          /* town ground kept behind the plots */
    gate: 1000,        /* where the streets leave town and become roads */
    wobble: 40,        /* how ragged the town's edge is */
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

  /* ── THE OLD ROADS ──
     Four trunk roads leave the town gates and run to the heart of the
     region on their compass point; each forks once where the meadow ends,
     turning left, to the diagonal region -- a pinwheel, so every region is
     one road and at most one fork from town.  A fork starts ON a point of
     its trunk, so the two meet cleanly.  `half` is the half-width in art px. */
  roads: [
    { id: 'north', name: 'the North Road', to: 'ember', half: 40, pts: [[0, -1.25], [0, -1.9], [0, -2.6], [0.12, -3.5], [0, -4.35]] },
    { id: 'frost-trail', name: 'the Frost Trail', to: 'frost', half: 32, pts: [[0, -2.6], [-1.2, -2.85], [-2.4, -3.2], [-3.4, -3.4]] },
    { id: 'east', name: 'the East Road', to: 'hollows', half: 40, pts: [[1.25, 0], [1.9, 0], [2.6, 0], [3.5, -0.08], [4.35, 0]] },
    { id: 'dune-trail', name: 'the Dune Trail', to: 'sky', half: 32, pts: [[2.6, 0], [2.8, -1.4], [3.1, -2.6], [3.4, -3.4]] },
    { id: 'south', name: 'the South Road', to: 'tidal', half: 40, pts: [[0, 1.25], [0, 2.6], [-0.12, 3.5], [0, 4.35]] },
    { id: 'foundry-road', name: 'the Foundry Road', to: 'thunder', half: 32, pts: [[0, 2.6], [1.3, 2.85], [2.4, 3.15], [3.3, 3.3]] },
    { id: 'west', name: 'the West Road', to: 'verdant', half: 40, pts: [[-1.25, 0], [-2.6, 0], [-3.5, 0.08], [-4.35, 0]] },
    { id: 'bog-trail', name: 'the Bog Trail', to: 'mist', half: 32, pts: [[-2.6, 0], [-2.8, 1.3], [-3.05, 2.4], [-3.3, 3.3]] },
    { id: 'stones-path', name: "the path to Prospector's Circle", half: 22, pts: [[0, -1.9], [-0.9, -1.88], [-1.75, -1.75]] },
    { id: 'arena-path', name: 'the path to the Arena', half: 26, pts: [[1.9, 0], [1.95, -0.7], [1.55, -1.3]] },
  ],
  /* A road crossing the river gets a bridge, named here by road id. */
  bridges: {
    west: { name: 'the Mill Bridge', paint: 'a wide wooden bridge of heavy timbers with low rails, strong enough for ore wagons' },
  },

  /* ── THE SWEETWATER RIVER ──
     Born under the frost glacier, it drops over the falls where the frost
     plateau meets the Wilds, runs past the west side of town (the Mill
     Bridge carries the West Road over it) and spreads into a delta on the
     southern beaches.  Width grows from source to sea (art px). */
  rivers: [
    {
      id: 'sweetwater', name: 'the Sweetwater River',
      pts: [[-4.05, -3.95], [-3.6, -2.65], [-3.3, -1.55], [-2.55, -0.75], [-2.0, 0.1], [-1.75, 1.35], [-1.45, 2.6], [-1.3, 3.85], [-1.4, 5.9]],
      width: [40, 120], wobble: 40,
      source: 'pouring as meltwater from under the glacier',
      mouth: 'spreads into a delta of sandy channels as it meets the sea',
      falls: [{ at: [-3.36, -1.75], len: 1.3, name: 'Sweetwater Falls',
                paint: 'the river pours over the rock ledge as a roaring white waterfall into a churning pool below' }],
    },
  ],

  /* ── THE MINE RAILWAY ──
     The boomtown's lifeline: from the Rail Depot east of town to the Great
     Cave, with a branch to the Foundry Dome and an abandoned spur toward
     the Buried City that was never finished.  A telegraph line runs beside
     it.  Points in squares; drawn as a smooth curve through them. */
  rails: [
    { id: 'mine-line', name: 'the mine railway', pts: [[1.72, 0.36], [2.3, 0.36], [2.9, 0.22], [3.6, 0.08], [4.2, 0.02]] },
    { id: 'foundry-branch', name: 'the foundry branch of the mine railway', pts: [[2.9, 0.22], [3.15, 1.0], [3.3, 2.0], [3.3, 2.95]] },
    { id: 'dunes-spur', name: 'the abandoned dunes spur of the mine railway', abandoned: true,
      paint: 'an abandoned single-track railway: rails rusted and half-buried in drifting sand, sleepers missing, telegraph poles leaning or fallen',
      pts: [[3.6, 0.08], [3.7, -0.9], [3.65, -1.9], [3.58, -2.75]] },
  ],

  /* ── PLACES: empty plots outside town, for sprites added later ──
     `at` in squares; `size` [w, h] art px, or `r` for a round plot. */
  places: [
    { id: 'depot', name: 'the Rail Depot', at: [1.5, 0.36], size: [300, 150], paint: 'where the mine railway begins' },
    { id: 'mill', name: 'the Old Mill', at: [-2.12, -0.52], size: [170, 150], paint: 'on the river bank, beside the Mill Bridge' },
    { id: 'arena', name: 'the Arena', at: [1.55, -1.38], r: 230, paint: 'a round rodeo ring and duelling ground' },
    { id: 'waystation-n', name: 'the North Fork waystation', at: [0.3, -2.62], r: 110, paint: 'a roadhouse where the Frost Trail leaves the North Road' },
    { id: 'waystation-e', name: 'the East Fork waystation', at: [2.95, -0.33], r: 110, paint: 'a roadhouse where the Dune Trail leaves the East Road' },
    { id: 'waystation-s', name: 'the South Fork waystation', at: [-0.3, 2.62], r: 110, paint: 'a roadhouse where the Foundry Road leaves the South Road' },
    { id: 'waystation-w', name: 'the West Fork waystation', at: [-2.6, -0.3], r: 110, paint: 'a roadhouse where the Bog Trail leaves the West Road' },
  ],

  /* ── REGIONS ──
     The eight themed zones keep the positions they have on the World View
     painting (worldview_v4.webp): frost north-west, the volcano north, the
     dunes north-east, the cave east, the foundry south-east, the sea caves
     south, the poison forest south-west, the flower jungle west -- with the
     town in the middle and the Starting Meadow round it.

     `heart` (squares) is where the region is deepest; its road ends there,
     at its landmark.  Every landmark hides a KEYSTONE -- a round stone disc
     carved with an eight-spoked wheel, the ancient thing the shard rush is
     really about (docs/WORLD-BIBLE.md).

     `zones` describe the region's three bands (see `bands` above) -- the
     prompt uses whichever the square falls in.  `meadowEdge` is how the
     meadow changes as it meets this region; `riverPaint` how the Sweetwater
     looks here.

     ONE LIGHT FOR THE WHOLE WORLD.  Electric Foundry is painted at night and
     Stone Hollows inside a cave today.  In one seamless map a hard day/night
     line at a region border would be the worst seam of all, so every square
     is painted in the same daylight and the region's MOOD is carried by its
     materials (black iron, glowing crystal) -- the game can darken a region
     as you walk in with the atmosphere layer it already has.

     `features` scatter shapes of a class inside the region: `density` per
     million art px², `r` a radius range in art px, `shape` blob (round) or
     ridge (long, for cliffs and streams), `in` the bands it appears in. */
  regions: {
    town: {
      name: 'Brotown', short: 'the town',
      ground: '#b98f55', groundName: 'ochre',
      paint: "packed-earth yards with patchy grass between the building plots, with barrels, crates, hitching posts, water troughs and a parked wagon or two",
    },
    meadow: {
      name: 'Starting Meadow', short: 'the meadow', level: [1, 10],
      ground: '#86b94f', groundName: 'grass green',
      paint: 'bright green meadow grass sprinkled with white, yellow and purple wildflowers',
      zones: {
        fringe: { name: 'the outskirts', paint: 'neat fenced fields of crops and hay just outside town, haystacks, a scarecrow, split-rail fences and cart tracks through short green grass' },
        heart: { name: 'the rolling meadow', paint: 'rolling green meadow with wildflowers (white, yellow and purple), lone oak trees and clumps of bushes' },
        rim: { name: 'the wild edge', paint: 'taller, wilder meadow grass with thickets, brambles, fallen logs and mossy boulders' },
      },
      obstacle: '#3c6b2c', obstacleName: 'dark green',
      obstaclePaint: 'clumps of leafy oaks, pines and bushes with mossy grey boulders',
      water: '#46a9d8', waterName: 'sky blue',
      waterPaint: 'a clear pond with reeds and a rocky bank',
      cliffPaint: 'a low grey rock outcrop covered in moss and flowers',
      riverPaint: 'a clear, gently winding river with reeds, pebbly banks and a few flat stones',
      /* The meadow is a ring, not a spoke: its landmark sits north-west of
         town on a footpath off the North Road. */
      landmark: { name: "Prospector's Circle", at: [-1.75, -1.75], color: '#c8c8c8', colorName: 'light grey', r: 160,
                  paint: 'a ring of eight weathered standing stones on a grassy knoll, around a round, flat stone slab carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 13, r: [30, 85], in: ['heart', 'rim'] },
        { class: 'obstacle', density: 3, r: [25, 50], in: ['fringe'] },
        { class: 'water', density: 0.5, r: [90, 190] },
      ],
    },
    frost: {
      name: 'Frost Ridge', short: 'the frost', level: [8, 25], heart: [-3.4, -3.4],
      ground: '#eef3f8', groundName: 'snow white',
      paint: 'deep snow with wind-carved drifts and patches of frosted grass',
      zones: {
        fringe: { name: 'the thaw line', paint: "patchy snow melting over wet brown grass, bare birches, trickling meltwater and an abandoned trapper's sled" },
        heart: { name: 'the snowbound taiga', paint: 'deep snow with wind-carved drifts, boot and hoof tracks, and snow-laden pines' },
        rim: { name: 'the glacier', paint: 'a blue-white glacier of cracked ice and wind-scoured snow crust, split by deep blue crevasses' },
      },
      meadowEdge: 'the meadow grass stiffens with frost and the first snow lies in the hollows',
      obstacle: '#3e5d4f', obstacleName: 'dark pine green',
      obstaclePaint: 'clumps of snow-laden pine trees and snow-capped grey boulders',
      water: '#bfe6f7', waterName: 'pale ice blue',
      waterPaint: 'a frozen lake: pale blue ice with long cracks, snow drifting over its edges',
      cliffPaint: 'a sheer grey granite cliff capped with snow and icicles',
      riverPaint: 'a fast, icy meltwater river with shelves of ice along its banks',
      landmark: { name: 'the Ice Spires', color: '#6fd0ff', colorName: 'bright light blue', r: 230,
                  paint: 'a cluster of tall, jagged, glowing blue ice crystal spires around a round stone slab carved with an eight-spoked wheel, frozen into the ice' },
      features: [
        { class: 'obstacle', density: 15, r: [30, 90] },
        { class: 'water', density: 0.7, r: [120, 260] },
        { class: 'cliff', density: 0.45, r: [28, 46], shape: 'ridge', len: [300, 700] },
      ],
    },
    ember: {
      name: 'Flame Fields', short: 'the flame fields', level: [55, 80], heart: [0, -4.35],
      ground: '#3b2c27', groundName: 'charcoal brown',
      paint: 'black volcanic ash and cracked basalt ground with faint glowing embers in the cracks',
      zones: {
        fringe: { name: 'the burn line', paint: 'scorched yellow grass giving way to grey ash, charred fence posts and blackened tree stumps, thin smoke rising from smouldering patches' },
        heart: { name: 'the ash plains', paint: 'black volcanic ash and cracked basalt ground with glowing embers in the cracks, sulphur-yellow vents puffing steam, and small rivers of lava' },
        rim: { name: 'the volcano flanks', paint: 'steep black basalt slopes and cooled lava flows, bright lava running in channels, heat shimmer and drifting ash' },
      },
      meadowEdge: 'the meadow grass browns and scorches, with drifts of grey ash',
      obstacle: '#16100e', obstacleName: 'near-black',
      obstaclePaint: 'jagged black basalt spires and charred dead trees',
      cliffPaint: 'a wall of black hexagonal basalt columns with lava glowing in the joints',
      landmark: { name: 'the Heart of the Volcano', color: '#6a2012', colorName: 'dark red-brown', r: 420,
                  paint: 'the foot of a great volcano: a steep black cone with glowing lava running down its sides and smoke rising from vents, and at its base a sealed round stone gate carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 10, r: [30, 80] },
        { class: 'lava', density: 1.1, r: [80, 220], in: ['heart', 'rim'] },
        { class: 'lava', density: 0.35, r: [18, 34], shape: 'ridge', len: [400, 900], in: ['heart', 'rim'] },
        { class: 'cliff', density: 0.4, r: [30, 50], shape: 'ridge', len: [300, 650] },
      ],
    },
    sky: {
      name: 'Wind Dunes', short: 'the dunes', level: [38, 58], heart: [3.4, -3.4],
      ground: '#dfc27c', groundName: 'sand yellow',
      paint: 'golden desert sand with wind ripples, patches of cracked dry earth, cacti and dry shrubs',
      zones: {
        fringe: { name: 'the sage flats', paint: 'dry sage scrub and tough grass on cracked earth, bleached cattle skulls, tumbleweeds and a broken wagon wheel' },
        heart: { name: 'the dunes', paint: 'golden sand dunes with wind ripples, red hoodoo rock stacks, cacti and a half-buried wagon wreck' },
        rim: { name: 'the red mesas', paint: 'flat-topped red sandstone mesas seen from above like everything else: sunlit tops, layered sides in shadow, sand drifting between them' },
      },
      meadowEdge: 'the meadow grass dries to straw and sand blows across it',
      obstacle: '#9c5f36', obstacleName: 'red-brown',
      obstaclePaint: 'red sandstone rock stacks and small mesas',
      cliffPaint: 'a layered red sandstone cliff',
      landmark: { name: 'the Buried City', color: '#c65a3a', colorName: 'terracotta', r: 260,
                  paint: 'half-buried sandstone ruins: broken columns and a giant carved stone face, with a round stone disc carved with an eight-spoked wheel set in its brow' },
      features: [
        { class: 'obstacle', density: 8, r: [40, 110] },
        { class: 'cliff', density: 0.2, r: [30, 50], shape: 'ridge', len: [300, 600] },
      ],
    },
    hollows: {
      name: 'Stone Hollows', short: 'the hollows', level: [38, 58], heart: [4.35, 0],
      ground: '#8c8378', groundName: 'stone grey',
      paint: 'grey stone badlands of cracked flagstone ground, loose rubble and pale moss',
      zones: {
        fringe: { name: 'the quarry', paint: 'stepped quarry terraces of cut grey stone, rubble heaps, abandoned mine carts and scattered picks and shovels' },
        heart: { name: 'the badlands', paint: 'grey stone badlands of cracked flagstone ground, loose rubble and pale moss, with clusters of glowing blue and violet crystals' },
        rim: { name: 'the granite walls', paint: 'towering grey granite walls and narrow canyons dropping into shadow, with crystal veins glowing in the rock' },
      },
      meadowEdge: 'the meadow thins over stony ground and grey boulders',
      obstacle: '#4a453f', obstacleName: 'dark stone',
      obstaclePaint: 'clusters of rock spires with glowing blue and violet crystals at their feet',
      water: '#28364a', waterName: 'dark slate blue',
      waterPaint: 'a deep, still, dark pool reflecting glowing crystals',
      cliffPaint: 'a sheer grey canyon wall dropping into shadow',
      landmark: { name: 'the Great Cave', color: '#1a1a1a', colorName: 'black', r: 260,
                  paint: 'the mouth of a huge cave in a grey rock mountainside, framed by glowing crystals, with the mine railway and the road running into it past a round stone disc carved with an eight-spoked wheel' },
      features: [
        { class: 'obstacle', density: 10, r: [40, 100] },
        { class: 'cliff', density: 0.9, r: [30, 55], shape: 'ridge', len: [350, 800] },
        { class: 'water', density: 0.2, r: [80, 160] },
      ],
    },
    thunder: {
      name: 'Electric Foundry', short: 'the foundry', level: [55, 80], heart: [3.3, 3.3],
      ground: '#4d5163', groundName: 'slate',
      paint: 'dark slate and iron floor plates joined by brass seams, with crackling blue electric light in the cracks',
      zones: {
        fringe: { name: 'the smelter yards', paint: 'trampled dirt yards scattered with slag heaps, coal piles and iron scrap' },
        heart: { name: 'the foundry works', paint: 'dark slate and iron floor plates joined by brass seams, thick iron pipes along the ground and crackling blue electric light in the cracks' },
        rim: { name: 'the foundry docks', paint: 'riveted iron docks and piers at the water\'s edge, with mooring chains, bollards and cargo crates' },
      },
      meadowEdge: 'the meadow is trampled to dirt, with coal dust and scattered scrap',
      obstacle: '#23252f', obstacleName: 'black iron',
      obstaclePaint: 'iron machinery: thick pipes, gear-wheel pylons and small Tesla-coil towers glowing with blue-violet electric light',
      cliffPaint: 'a tall riveted iron wall',
      landmark: { name: 'the Foundry Dome', color: '#7a86c8', colorName: 'periwinkle', r: 260,
                  paint: 'a great iron dome with glowing blue windows, ringed by crackling electric pylons, with a round stone disc carved with an eight-spoked wheel caged in copper coils before its doors' },
      features: [
        { class: 'obstacle', density: 12, r: [30, 80] },
        { class: 'cliff', density: 0.3, r: [28, 44], shape: 'ridge', len: [300, 600] },
      ],
    },
    tidal: {
      name: 'Water Caves', short: 'the sea caves', level: [8, 25], heart: [0, 4.35],
      ground: '#e6d6a3', groundName: 'pale sand',
      paint: 'pale beach sand and sea grass between dark mossy rocks',
      zones: {
        fringe: { name: 'the dune grass', paint: 'low sandy dunes held together by dune grass, driftwood, fishing nets drying on poles and a beached rowing boat' },
        heart: { name: 'the lagoons', paint: 'pale sand bars and dark mossy rocks between shallow lagoons, with the wreck of a small ship lying on its side' },
        rim: { name: 'the harbour cliffs', paint: 'dark mossy sea cliffs with glowing teal caves at their foot and a wooden landing jetty' },
      },
      meadowEdge: 'the meadow grass turns to sandy dune grass',
      obstacle: '#5a5f55', obstacleName: 'dark rock',
      obstaclePaint: 'dark, mossy sea-rock outcrops',
      water: '#39c0c8', waterName: 'turquoise',
      waterPaint: 'a shallow turquoise lagoon with rocks showing through the water',
      cliffPaint: 'a dark mossy sea cliff with glowing teal caves at its foot',
      riverPaint: 'a wide, slow river mouth splitting into sandy channels as it meets the sea',
      landmark: { name: 'the Drowned Keystone', color: '#2ab3a8', colorName: 'teal', r: 240,
                  paint: 'a rocky headland pierced by sea caves glowing teal from inside, and in the shallows before it a round stone disc carved with an eight-spoked wheel, half under the water' },
      features: [
        { class: 'obstacle', density: 8, r: [40, 100] },
        { class: 'water', density: 1.1, r: [110, 250] },
        { class: 'cliff', density: 0.5, r: [30, 50], shape: 'ridge', len: [300, 650] },
      ],
    },
    mist: {
      name: 'Poison Forest', short: 'the poison forest', level: [22, 40], heart: [-3.3, 3.3],
      ground: '#5f6d3f', groundName: 'murky olive',
      paint: 'murky moss and bog ground with low drifting mist',
      zones: {
        fringe: { name: 'the blighted farm', paint: 'a blighted field of withered crops and sickly yellow grass, a toppled scarecrow and a broken snake-oil wagon spilling green bottles' },
        heart: { name: 'the slime woods', paint: 'murky moss and bog ground with low drifting mist, among twisted dead trees dripping green slime and giant purple and yellow toadstools' },
        rim: { name: 'the mangrove marsh', paint: 'a mangrove marsh of tangled roots over dark water and green scum, hung with grey moss' },
      },
      meadowEdge: 'the meadow grass yellows and sickens, with the first mushrooms and a sour green haze',
      obstacle: '#2c351f', obstacleName: 'dark bog green',
      obstaclePaint: 'twisted dead trees dripping green slime, and giant purple and yellow toadstools',
      water: '#8fd13f', waterName: 'acid green',
      waterPaint: 'a glowing acid-green poison pool with ripples',
      cliffPaint: 'a mossy, root-covered rock bank',
      riverPaint: 'a slow, murky green-brown river edged with reeds and slime',
      landmark: { name: 'the Toadstool Ring', color: '#9a4fc0', colorName: 'purple', r: 220,
                  paint: 'a ring of giant purple toadstools around a glowing poison pool, with a round stone disc carved with an eight-spoked wheel sinking into the mud at its centre' },
      features: [
        { class: 'obstacle', density: 14, r: [30, 80] },
        { class: 'water', density: 1.4, r: [60, 150] },
      ],
    },
    verdant: {
      name: 'Verdant Wilds', short: 'the wilds', level: [22, 40], heart: [-4.35, 0],
      ground: '#3f9a3f', groundName: 'deep green',
      paint: 'lush jungle floor of grass, ferns and giant colourful flowers (red, purple, teal and yellow)',
      zones: {
        fringe: { name: 'the overgrown orchards', paint: 'an old orchard of fruit trees gone wild, a tumbledown stone wall, tall grass and the first giant flowers' },
        heart: { name: 'the vine jungle', paint: 'lush jungle floor of ferns and giant colourful flowers (red, purple, teal and yellow) under giant mossy trees hung with vines' },
        rim: { name: 'the waterfall cliffs', paint: 'mossy cliff terraces with small waterfalls tumbling between ferns into jade pools' },
      },
      meadowEdge: 'the meadow grass grows lush and tall, with giant flowers and the first vines',
      obstacle: '#1d5a22', obstacleName: 'dark jungle green',
      obstaclePaint: 'giant mossy trees draped in hanging vines, with ferns and mossy boulders at their roots',
      water: '#2fc0b0', waterName: 'jade',
      waterPaint: 'a clear jade stream with mossy stones and small waterfalls',
      cliffPaint: 'a mossy rock ledge overgrown with vines and flowers',
      riverPaint: 'a clear, fast river over mossy stones, edged with ferns and giant flowers',
      landmark: { name: 'the Vine Arch', color: '#e070b0', colorName: 'pink', r: 200,
                  paint: 'a great archway of living vines hung with giant flowers, framing a round stone disc carved with an eight-spoked wheel wrapped in roots' },
      features: [
        { class: 'obstacle', density: 19, r: [40, 100] },
        { class: 'water', density: 0.5, r: [18, 30], shape: 'ridge', len: [500, 1000] },
      ],
    },
  },

  /* ── BORDERS: what the land looks like where two regions meet ──
     Keyed by the two region ids in alphabetical order.  A square straddling
     a border gets this line, so the change of landscape is designed rather
     than left to chance (the meadow's borders are each region's
     `meadowEdge`). */
  borders: {
    'ember|frost': 'steam fields: snow melting into hot springs and wet black rock, with geysers and drifting steam',
    'ember|sky': 'ash dunes: grey volcanic ash blowing over golden sand, and charred cacti',
    'hollows|sky': 'the sand gives way to stone: red sandstone breaking up into grey granite boulders',
    'hollows|thunder': 'the mine works: spoil heaps, ore piles, abandoned mine carts and the first iron pipes',
    'thunder|tidal': 'the foundry meets the shore: slag running down to the sand, rusted chains and cargo crates',
    'mist|tidal': 'brackish marsh: lagoons gone murky, mangrove roots and sickly dune grass',
    'mist|verdant': 'the rot line: the jungle\'s giant flowers wilting grey-green and its vines turning into slimy dead branches',
    'frost|verdant': 'alpine meadows: snowmelt streams through short green grass and alpine flowers, with the first pines',
  },

  /* ── THE STYLE BIBLE ──
     The part of every prompt that never changes.  Consistency across a
     hundred separate generations comes from here, from the STYLE KEY below
     and from the finished edges in each template -- never from ChatGPT
     remembering earlier squares.  `{person}` and `{across}` are filled in
     from the scale above. */
  style: [
    'Seen from straight above at a steep three-quarter angle, like a classic 2D action-RPG map. No horizon, no sky and no perspective: the top of the square is exactly as close to the camera as the bottom, and everything is drawn at the same size wherever it is.',
    'Daylight from the upper left. Every tree, rock and cliff casts a soft shadow toward the lower right.',
    'Rich, painterly, hand-painted detail with soft natural colours, matching the finished painted parts exactly in brushwork, colour and level of detail.',
    'Scale: a person would be about {person} pixels tall here, so the square is about {across} people across. A tree is about as tall as a person; a boulder about half that.',
    'The ground runs off all four edges of the square. It is one piece of a bigger map, not a picture of its own.',
  ],
  never: [
    'text', 'letters', 'numbers', 'labels', 'signs with writing', 'grid lines', 'a border or frame', 'a vignette or darkened edges',
    'sky', 'clouds', 'a horizon', 'people', 'animals', 'monsters',
    'buildings or houses (building plots stay empty)', 'UI', 'a compass', 'a watermark',
  ],

  /* ── THE STYLE KEY ──
     One picture, made once, before the first square, and attached to EVERY
     square's chat after that (the builder keeps it).  Words alone drift over
     a hundred generations; a picture to match does not drift as far.  It
     also carries a building and a person, so the same key can anchor the
     buildings and characters that are redrawn later (docs/WORLD-BIBLE.md). */
  styleKey: {
    prompt: [
      'Make a STYLE KEY sheet for a hand-painted 2D action-RPG world: one square picture divided into a 3 x 3 grid of nine equal square tiles, separated by thin plain dark-grey gaps.',
      'Every tile is a small piece of the same world, seen from the same steep three-quarter top-down angle with no horizon and no sky, lit by the same daylight from the upper left (soft shadows to the lower right), and painted in the same rich, painterly, hand-painted style with soft natural colours. Every tile is drawn at the same scale: a person is about a quarter of a tile tall.',
      'The nine tiles, left to right, top to bottom:',
      '1. green meadow grass with wildflowers, a leafy oak, a mossy boulder, and a dirt wagon road with two wheel ruts crossing the tile;',
      '2. a stretch of a frontier town\'s Main Street: packed dirt with wheel ruts, a raised wooden boardwalk, and the front of one two-storey wooden false-front shop with a porch and hitching post;',
      '3. a riverbank with clear blue water, reeds, pebbles and a wooden plank bridge;',
      '4. deep snow with snow-laden pines, a frozen pond edge and a granite boulder;',
      '5. black volcanic ash with a glowing lava stream and black basalt columns;',
      '6. golden desert sand with wind ripples, a red sandstone rock stack and a cactus;',
      '7. grey stone ground with glowing blue crystals and a short stretch of mine railway;',
      '8. a dark bog with a twisted dead tree, a glowing green pool and giant purple toadstools;',
      '9. one adventurer standing on grass, full body, in simple frontier clothes -- the scale reference for characters.',
      'No text, letters or labels anywhere. No border round the whole picture.',
    ],
  },
};

/* The regions that are not the town or the meadow, in their compass order
   round it -- the order roads are listed in and the builder shows them. */
export const SPOKES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
