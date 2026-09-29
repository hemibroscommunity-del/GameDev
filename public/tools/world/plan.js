/* ═══ v2.3.2931: THE WORLD PLAN — one seamless map, painted square by square ═══
 *
 * Owner: "I'm wanting one seamless map and to have chatGPT draw it into
 * squares.  I'll need to fuse them together but have some type of grid and
 * prompt system to construct the entire thing."
 *
 * This file is the single source of truth for that map.  The World Builder
 * page (index.html next to this file) reads it to draw the grid, build the
 * blueprint, write every square's prompt and fuse what ChatGPT paints.  The
 * design, the owner's workflow and the reasoning behind each number below are
 * in docs/WORLD-MAP-PIPELINE.md.
 *
 * ── DECIDE THESE BEFORE PAINTING, NOT AFTER ──
 * `grid`, `square`, `worldPxPerArtPx`, `seed`, the anchor and the region
 * hearts all decide WHERE every square sits and what its blueprint says.
 * Change any of them after squares are painted and those squares no longer
 * line up with their neighbours: the builder detects it (planHash) and says
 * so, but it cannot repaint them for you.  The descriptive text (paint,
 * style, never) is safe to change at any time -- it only changes prompts.
 *
 * ── THE NUMBERS, IN ONE PLACE ──
 *   square   1024 art px, each ChatGPT picture is resampled to this
 *   overlap   256 art px (25%) shared with each neighbour: the seam hides here
 *   step      768 art px between square origins (square - overlap)
 *   world    12 x 768 + 256 = 9472 art px = 12,314 world px across
 *            (x 1.3 world px per art px, the density the town is drawn at
 *            today, so the town painting drops in unchanged)
 *   walk     ~82 s edge to edge at the ~150 px/s base run speed; every
 *            current zone put together is ~25 s
 *   squares  144 on the grid: 18 are open sea past the coast (optional) and
 *            126 need painting -- the four under the town only need the
 *            forest round its cliffs
 *
 * ── HOW BIG, IN SQUARES (measured with this plan, only `grid` changed) ──
 *    8 x  8    60 to paint    ~55 s to walk across
 *   10 x 10    90 to paint    ~69 s
 *   12 x 12   126 to paint    ~82 s     <- this plan
 *   14 x 14   168 to paint    ~95 s
 */

export const PLAN = {
  id: 'brotown-world',
  version: 1,
  /* Every random choice in the blueprint (coast wobble, where the ponds and
     tree clumps go, how the region borders wander) comes from this number.
     Same seed -> same world, on every device, forever. */
  seed: 20260929,

  /* 12 x 12 squares, named like a spreadsheet: columns A-L west to east,
     rows 1-12 north to south.  A1 is the north-west corner. */
  grid: { cols: 12, rows: 12 },

  /* What each ChatGPT picture becomes.  ChatGPT hands back 1024 or 1254 px
     squares depending on the day; both are resampled to `px`, so the rest
     of the pipeline never sees the difference.  `overlap` is the band each
     square shares with each neighbour.  25% is deliberately generous: the
     model only ever sees that much of a finished neighbour, and the fuser
     needs room to route its seam around a tree rather than through it. */
  square: { px: 1024, overlap: 256 },

  /* World px per art px.  1.3 is exactly how town_v17 is drawn today (1674 px
     of art stretched over 2176 world px), so the town painting drops into the
     middle of the world at its current size with no rescale and no seam in
     sharpness.  The spokes are drawn sharper today (0.82); matching them
     instead would need (1.3/0.82)^2 = 2.5x as many squares for the same
     ground, and a visible sharpness step at the town's edge. */
  worldPxPerArtPx: 1.3,

  /* One blueprint pixel covers this many art px.  8 keeps the whole plan to
     1184 x 1184 cells: small enough to build in about a second on a phone,
     fine enough that a trail is 9 cells wide. */
  blueprintScale: 8,

  /* The sea all the way round.  Normalised radius from the world centre
     (0.5 = the middle of an edge), wobbled by noise so the coast is not a
     circle.  `square` blends the shape from a circle (0) toward a square (1)
     so the island uses more of the grid.  Anything past it is open sea:
     squares that are nearly all sea are marked optional in the builder,
     because the game will never let you walk far enough out to look at them
     closely. */
  coast: { radius: 0.46, wobble: 0.045, square: 0.35 },

  /* The Starting Meadow is a ring round the town rather than a spoke:
     everything else is reached through it, which is what a starting area
     is for.  Radius is normalised like the coast. */
  meadow: { radius: 0.19, wobble: 0.022 },

  /* A belt of forest hugging the town's cliffs -- the town painting is
     ringed by tree canopy on every side, so the squares around it have to
     continue that canopy or the join shows.  Art px. */
  townForest: { width: 170 },

  /* How far region borders wander from the straight line between two hearts,
     normalised.  Bigger = more tangled borders. */
  regionWarp: 0.085,

  /* ── ANCHORS: finished paintings placed before any square is made ──
     The town is already painted and the owner has iterated on it more than
     anything else in the game, so it is not re-generated: it sits in the
     middle and every square grows outward from it.  Squares next to it see
     its edges in their template and continue them.

     `inset` trims painted sky off the top corners (measured on the file:
     blue sky and cloud in the top ~140 px at both corners) -- the squares
     repaint that strip as forest instead.  `feather` is the soft edge where
     the painting meets painted squares.  `gate` is the foot of the stairs,
     the town's only way down (TOWN_EXITS, effects.js); every trail starts
     there.  All in art px / fractions of the painting. */
  anchors: [
    {
      id: 'town',
      name: 'the town on its clifftop plateau',
      src: '/maps/town_v17.webp',
      size: [1674, 1774],
      at: [0.5, 0.5],
      inset: { top: 150, left: 70, right: 70, bottom: 12 },
      feather: 56,
      gate: [0.455, 1.0],
    },
  ],

  /* ── TERRAIN CLASSES: the colours of the blueprint ──
     The blueprint is a flat colour-coded plan of the whole world.  It does
     two jobs.  Today it is the layout sketch ChatGPT paints over, so a river
     or a trail crossing a square border continues on both sides.  Later it
     becomes the game's collision map: `walk` says whether feet may stand
     there, and cliffs are where climbing will go.  Drawing the walls FIRST
     and painting to them is the opposite of what failed twice before
     (walls traced off finished paintings, tiledMaps.js v2.3.1693/1794).

     `color` is what the sketch shows ChatGPT; `colorName` is how the prompt
     refers to it.  Classes whose look depends on the region (ground,
     obstacle, water, cliff) take colour and description from the region. */
  classes: {
    ground:   { walk: true },
    path:     { walk: true,  color: '#c9a36a', colorName: 'tan',
                paint: 'a worn dirt trail about two people wide, with soft edges and scattered pebbles' },
    obstacle: { walk: false },
    water:    { walk: false, color: '#3f86d6', colorName: 'blue' },
    ocean:    { walk: false, color: '#1f5a9e', colorName: 'deep blue',
                paint: 'open sea: deep blue water with gentle waves, turning turquoise in the shallows, with white foam along the shore' },
    cliff:    { walk: false, color: '#6d645a', colorName: 'dark grey-brown' },
    lava:     { walk: false, color: '#ff6a1a', colorName: 'bright orange',
                paint: 'molten lava glowing orange and yellow under a cracked black crust' },
    landmark: { walk: false },
    anchor:   { walk: true },
  },

  /* ── REGIONS ──
     The eight themed zones keep the positions they have on the World View
     painting (worldview_v4.webp): frost north-west, the volcano north, the
     dunes north-east, the cave east, the foundry south-east, the sea caves
     south, the poison forest south-west, the flower jungle west -- with the
     town in the middle and the Starting Meadow round it.

     `heart` is where the region is deepest (normalised world position); a
     trail runs to it from the town's stairs along `trail` (waypoints).  `paint`
     texts were written from the current zone paintings so the new world looks
     like the game already does.

     ONE LIGHT FOR THE WHOLE WORLD.  Electric Foundry is painted at night and
     Stone Hollows inside a cave today.  In one seamless map a hard day/night
     line at a region border would be the worst seam of all, so every square
     is painted in the same daylight and the region's MOOD is carried by its
     materials (black iron, glowing crystal) -- the game can darken a region
     as you walk in with the atmosphere layer it already has.

     `features` scatter shapes of a class inside the region: `density` per
     million art px², `r` a radius range in art px, `shape` blob (round) or
     ridge (long, for cliffs and streams). */
  regions: {
    town: {
      name: 'Brotown', short: 'the town',
      ground: '#b98f55', groundName: 'ochre',
      paint: 'the town (already painted)',
    },
    meadow: {
      name: 'Starting Meadow', short: 'the meadow', level: [1, 10],
      ground: '#86b94f', groundName: 'grass green',
      paint: 'bright green meadow grass sprinkled with white, yellow and purple wildflowers',
      obstacle: '#3c6b2c', obstacleName: 'dark green',
      obstaclePaint: 'clumps of leafy trees, pines and bushes with mossy grey boulders',
      water: '#46a9d8', waterName: 'sky blue',
      waterPaint: 'a clear turquoise pond or stream with a rocky bank',
      cliffPaint: 'a low grey rock outcrop covered in moss and flowers',
      /* The meadow is a ring, not a spoke, so it has no heart: its landmark
         sits on the north side of town -- the one side no trail passes --
         with a spur off the western flank so it is somewhere to go. */
      trail: [[0.34, 0.62], [0.30, 0.42]],
      landmark: { name: 'standing stones', color: '#c8c8c8', colorName: 'light grey', r: 150, at: [0.47, 0.345],
                  paint: 'a ring of ancient mossy standing stones on a grassy knoll' },
      features: [
        { class: 'obstacle', density: 13, r: [30, 85] },
        { class: 'water', density: 0.5, r: [90, 190] },
      ],
    },
    frost: {
      name: 'Frost Ridge', short: 'the frost', level: [8, 25], heart: [0.22, 0.22],
      trail: [[0.34, 0.62], [0.30, 0.42]],
      ground: '#eef3f8', groundName: 'snow white',
      paint: 'deep snow with wind-carved drifts and patches of frosted grass',
      obstacle: '#3e5d4f', obstacleName: 'dark pine green',
      obstaclePaint: 'clumps of snow-laden pine trees and snow-capped grey boulders',
      water: '#bfe6f7', waterName: 'pale ice blue',
      waterPaint: 'a frozen lake: pale blue ice with long cracks, snow drifting over its edges',
      cliffPaint: 'a sheer grey granite cliff capped with snow and icicles',
      landmark: { name: 'ice spires', color: '#6fd0ff', colorName: 'bright light blue', r: 230,
                  paint: 'a cluster of tall, jagged, glowing blue ice crystal spires' },
      features: [
        { class: 'obstacle', density: 15, r: [30, 90] },
        { class: 'water', density: 0.7, r: [120, 260] },
        { class: 'cliff', density: 0.45, r: [28, 46], shape: 'ridge', len: [300, 700] },
      ],
    },
    ember: {
      name: 'Flame Fields', short: 'the flame fields', level: [55, 80], heart: [0.50, 0.17],
      trail: [[0.34, 0.62], [0.30, 0.42], [0.38, 0.27]],
      ground: '#3b2c27', groundName: 'charcoal brown',
      paint: 'black volcanic ash and cracked basalt ground with faint glowing embers in the cracks',
      obstacle: '#16100e', obstacleName: 'near-black',
      obstaclePaint: 'jagged black basalt spires and charred dead trees',
      cliffPaint: 'a wall of black hexagonal basalt columns with lava glowing in the joints',
      landmark: { name: 'volcano', color: '#6a2012', colorName: 'dark red-brown', r: 420,
                  paint: 'the base of a great volcano: a steep black cone with glowing lava running down its sides and smoke rising from vents' },
      features: [
        { class: 'obstacle', density: 10, r: [30, 80] },
        { class: 'lava', density: 1.1, r: [80, 220] },
        { class: 'lava', density: 0.35, r: [18, 34], shape: 'ridge', len: [400, 900] },
        { class: 'cliff', density: 0.4, r: [30, 50], shape: 'ridge', len: [300, 650] },
      ],
    },
    sky: {
      name: 'Wind Dunes', short: 'the dunes', level: [38, 58], heart: [0.78, 0.22],
      trail: [[0.66, 0.62], [0.70, 0.40]],
      ground: '#dfc27c', groundName: 'sand yellow',
      paint: 'golden desert sand with wind ripples and dunes, patches of cracked dry earth, cacti, dry shrubs and bleached animal skulls',
      obstacle: '#9c5f36', obstacleName: 'red-brown',
      obstaclePaint: 'red sandstone rock stacks and small mesas',
      cliffPaint: 'a layered red sandstone cliff',
      landmark: { name: 'buried ruins', color: '#c65a3a', colorName: 'terracotta', r: 260,
                  paint: 'half-buried sandstone ruins with a giant carved stone face and a natural rock arch' },
      features: [
        { class: 'obstacle', density: 8, r: [40, 110] },
        { class: 'cliff', density: 0.2, r: [30, 50], shape: 'ridge', len: [300, 600] },
      ],
    },
    hollows: {
      name: 'Stone Hollows', short: 'the hollows', level: [38, 58], heart: [0.84, 0.50],
      trail: [[0.66, 0.62]],
      ground: '#8c8378', groundName: 'stone grey',
      paint: 'grey stone badlands of cracked flagstone ground, loose rubble and pale moss',
      obstacle: '#4a453f', obstacleName: 'dark stone',
      obstaclePaint: 'clusters of stalagmite-like rock spires with glowing blue and violet crystals at their feet',
      water: '#28364a', waterName: 'dark slate blue',
      waterPaint: 'a deep, still, dark pool reflecting glowing crystals',
      cliffPaint: 'a sheer grey canyon wall dropping into shadow',
      landmark: { name: 'great cave', color: '#1a1a1a', colorName: 'black', r: 260,
                  paint: 'the mouth of a huge cave in a grey rock mountainside, glowing crystals framing the entrance' },
      features: [
        { class: 'obstacle', density: 10, r: [40, 100] },
        { class: 'cliff', density: 0.9, r: [30, 55], shape: 'ridge', len: [350, 800] },
        { class: 'water', density: 0.2, r: [80, 160] },
      ],
    },
    thunder: {
      name: 'Electric Foundry', short: 'the foundry', level: [55, 80], heart: [0.77, 0.77],
      trail: [[0.64, 0.70]],
      ground: '#4d5163', groundName: 'slate',
      paint: 'dark slate and iron floor plates joined by brass seams, with crackling blue electric light in the cracks',
      obstacle: '#23252f', obstacleName: 'black iron',
      obstaclePaint: 'iron machinery: thick pipes, gear-wheel pylons and small towers glowing with blue-violet electric light',
      cliffPaint: 'a tall riveted iron wall',
      landmark: { name: 'foundry dome', color: '#7a86c8', colorName: 'periwinkle', r: 260,
                  paint: 'a great iron dome with glowing blue windows, ringed by crackling electric pylons' },
      features: [
        { class: 'obstacle', density: 12, r: [30, 80] },
        { class: 'cliff', density: 0.3, r: [28, 44], shape: 'ridge', len: [300, 600] },
      ],
    },
    tidal: {
      name: 'Water Caves', short: 'the sea caves', level: [8, 25], heart: [0.50, 0.84],
      trail: [[0.50, 0.75]],
      ground: '#e6d6a3', groundName: 'pale sand',
      paint: 'pale beach sand and sea grass between dark mossy rocks',
      obstacle: '#5a5f55', obstacleName: 'dark rock',
      obstaclePaint: 'dark, mossy sea-rock outcrops',
      water: '#39c0c8', waterName: 'turquoise',
      waterPaint: 'a shallow turquoise lagoon with rocks showing through the water',
      cliffPaint: 'a dark mossy sea cliff with glowing teal caves at its foot',
      landmark: { name: 'sea caves', color: '#2ab3a8', colorName: 'teal', r: 240,
                  paint: 'a rocky headland pierced by sea caves glowing teal from inside' },
      features: [
        { class: 'obstacle', density: 8, r: [40, 100] },
        { class: 'water', density: 1.1, r: [110, 250] },
        { class: 'cliff', density: 0.5, r: [30, 50], shape: 'ridge', len: [300, 650] },
      ],
    },
    mist: {
      name: 'Poison Forest', short: 'the poison forest', level: [22, 40], heart: [0.23, 0.77],
      trail: [[0.36, 0.70]],
      ground: '#5f6d3f', groundName: 'murky olive',
      paint: 'murky moss and bog ground with low drifting mist',
      obstacle: '#2c351f', obstacleName: 'dark bog green',
      obstaclePaint: 'twisted dead trees dripping green slime, and giant purple and yellow toadstools',
      water: '#8fd13f', waterName: 'acid green',
      waterPaint: 'a glowing acid-green poison pool with ripples',
      cliffPaint: 'a mossy, root-covered rock bank',
      landmark: { name: 'toadstool ring', color: '#9a4fc0', colorName: 'purple', r: 220,
                  paint: 'a ring of giant purple toadstools around a glowing poison pool' },
      features: [
        { class: 'obstacle', density: 14, r: [30, 80] },
        { class: 'water', density: 1.4, r: [60, 150] },
      ],
    },
    verdant: {
      name: 'Verdant Wilds', short: 'the wilds', level: [22, 40], heart: [0.16, 0.50],
      trail: [[0.34, 0.62]],
      ground: '#3f9a3f', groundName: 'deep green',
      paint: 'lush jungle floor of grass, ferns and giant colourful flowers (red, purple, teal and yellow)',
      obstacle: '#1d5a22', obstacleName: 'dark jungle green',
      obstaclePaint: 'giant mossy trees draped in hanging vines, with ferns and mossy boulders at their roots',
      water: '#2fc0b0', waterName: 'jade',
      waterPaint: 'a clear turquoise stream with mossy stones and small waterfalls',
      cliffPaint: 'a mossy rock ledge overgrown with vines and flowers',
      landmark: { name: 'vine arch', color: '#e070b0', colorName: 'pink', r: 200,
                  paint: 'a great archway of living vines hung with giant flowers' },
      features: [
        { class: 'obstacle', density: 19, r: [40, 100] },
        { class: 'water', density: 0.5, r: [18, 30], shape: 'ridge', len: [500, 1000] },
      ],
    },
  },

  /* ── THE STYLE BIBLE ──
     The part of every prompt that never changes.  Consistency across ninety
     separate generations comes from here and from the finished edges in each
     template -- never from ChatGPT remembering earlier squares.  `{person}`
     and `{across}` are filled in from the scale above. */
  style: [
    'Seen from straight above at a steep three-quarter angle, like a classic 2D action-RPG map. No horizon, no sky and no perspective: the top of the square is exactly as close to the camera as the bottom, and everything is drawn at the same size wherever it is.',
    'Daylight from the upper left. Every tree, rock and cliff casts a soft shadow toward the lower right.',
    'Rich, painterly, hand-painted detail with soft natural colours, matching the finished painted parts exactly in brushwork, colour and level of detail.',
    'Scale: a person would be about {person} pixels tall here, so the square is about {across} people across. A tree is about as tall as a person; a boulder about half that.',
    'The ground runs off all four edges of the square. It is one piece of a bigger map, not a picture of its own.',
  ],
  never: [
    'text', 'letters', 'numbers', 'labels', 'grid lines', 'a border or frame', 'a vignette or darkened edges',
    'sky', 'clouds', 'a horizon', 'people', 'animals', 'monsters', 'buildings (unless the plan shows one)',
    'UI', 'a compass', 'a watermark',
  ],
};

/* The regions that are not the town, in their compass order round it --
   the order trails are drawn in and the order the builder lists them. */
export const SPOKES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
