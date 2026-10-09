/* ═══ v2.3.2964: THE OBJECT STUDIO'S CATALOG — everything that stands up ═══
 *
 * Owner, 2026-10-01, asked what the new map needs next: "Yes make object
 * studio.  I'll also want to redo all the buildings again using more
 * specific prompts."
 *
 * Everything that stands up is an object, not ground paint (docs/WORLD-
 * BIBLE.md §11): trees, rocks, bushes, fences, lamp posts, barrels -- and
 * every building, each a picture of its own standing on its empty plot (§5).
 * This is the list of them, one entry per picture to make, and what each
 * prompt is built from (prompts.js):
 *
 *   id      the picture's name; for a building, its plot's id in the plan
 *           (../world/plan.js town.lots), so placing it is a lookup
 *   group   'buildings', 'town' (the town's props), or the land it grows in
 *           (the Wheel's region id, as the Ground Studio's groups)
 *   count   how many different ones one picture holds, side by side; the
 *           studio cuts them apart (style/process.js splitObjects)
 *   fit     'h' or 'w': which way `size` measures
 *   size    in game px.  The studio makes every picture exactly this big at
 *           2 picture px a game px (style/bible.js PIXEL.gamePxPerArtPx), the
 *           middle of a set at this size and the rest in proportion
 *   frame   'square', or 'wide' (3:2) for sets too wide for a square.
 *           Either way the picture is as tall as a ground swatch covers, 512
 *           game px, so ChatGPT draws its pixels the ground's size
 *   ground  the swatch it is shown standing on, in the studio
 *           (public/world/ground/<ground>-A.png)
 *   key     the flat background it is drawn on, cut away by the studio:
 *           magenta, or green for the few things that are pink or purple
 *   what    what it is, for the prompt; `ones` how the ones in a set differ
 *   ar      v2.3.2965: about how wide one is for its height, as drawn -- the
 *           sheet packer's estimate (sheets.js), never a size the studio sets
 *
 * A building also has `job` (what players do there), `look` (its
 * architecture and materials), `bro` (its one or two big jokes, §12) and
 * `sign` (the one or two words on it).  The four ends of town each have a
 * material of their own (ENDS), so a street reads as one place:
 * workshops north, the saloon end south, farming west, money east (§5).
 */

/* The ends of town, by the arm each plot is on (plan.js town.lots) */
export const ENDS = {
  square: 'It stands alone in the middle of the town square, the grandest building in town.',
  north: 'It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.',
  south: 'It is at the saloon end of town, where buildings are painted boards in warm, bold colours, with fancy trim and balconies.',
  west: 'It is at the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs.',
  east: 'It is at the money end of town, toward the mines: red brick, pale cut sandstone, brass fittings and iron bars.',
};

/* A building on a 200 x 200 art px plot is 300 x 300 game px of ground
   (plan.js town.lot, x 1.5); it filled the plot's width but for a strip of
   yard either side, 276 game px (the Town Hall, on 208, 290).
   v2.3.2971: 1.4 times that.  Owner, 2026-10-02, with all sixteen made:
   "the buildings needed to be upscaled to 140% for all of them because
   they were too small in the game.  Maybe could've been larger too." --
   140% was the top of the size menu.  So a building is now about three
   and a half people wide, and the menu's 140% goes nearly twice the old
   plan.  The plots grew to match when the buildings were placed (v2.3.2975:
   plan.js town.lot, 405 game px wide, the town laid out round them --
   world/core/layout.js townPlan).  `sizeWas`
   is the old size, so a size chosen against it, or a picture made from
   its prompt, is still known (objects/app.js). */
const PLOT_W = 386, HALL_W = 406;
const PLOT_W_WAS = 276, HALL_W_WAS = 290;

const B = (o) => ({ group: 'buildings', kind: 'building', count: 1, fit: 'w', size: PLOT_W, sizeWas: PLOT_W_WAS, frame: 'square', ground: 'town-yard', key: 'magenta', ...o });

export const BUILDINGS = [
  B({
    id: 'townhall', name: 'Town Hall', end: 'square', size: HALL_W, sizeWas: HALL_W_WAS, ground: 'plaza', sign: 'TOWN HALL',
    job: 'where Mayor Bro stands and the town is run',
    look: 'A handsome two-storey civic hall of pale cut stone below and white-painted clapboard above, with a square clock tower rising from the middle of its roof, a flagpole on the tower, and a columned porch at the top of wide stone steps.',
    bro: 'a stone statue of Mayor Bro beside the steps, a burly man with a big moustache flexing both arms, on a plinth; and a glass trophy case on the porch crammed with trophies of every size. Strings of red and gold bunting hang along the porch roof',
  }),
  B({
    id: 'blacksmith', name: 'Blacksmith', end: 'north', sign: 'BLACKSMITH',
    job: 'where players forge their gear',
    look: 'A sturdy smithy: a heavy fieldstone ground floor and a dark timber upper storey, a wide open forge bay on one side of the front with the forge inside, its coals bright orange, and a huge stone chimney.',
    bro: 'a rack of hammers on the front wall, hung in a row from tiny to enormous; and a dumbbell made of two anvils on an iron bar beside the door, beside a dented anvil set up on a stone plinth like a trophy',
  }),
  B({
    id: 'woodworker', name: 'Woodworker', end: 'north', sign: 'WOODWORKER',
    job: 'where players craft bows and staves',
    look: 'A timber workshop of rough-sawn planks with big log corner posts, a lean-to on one side stacked with sawn lumber, and a giant two-handed saw hung over the door.',
    bro: 'a chopping log with an axe stuck in it, next to a scoreboard of tally marks; and a carved wooden bear in sunglasses flexing beside the door. Bows and staves are racked along the porch like trophies',
  }),
  B({
    id: 'gemcutter', name: 'Gem Works', end: 'north', key: 'green', sign: 'GEMS',
    job: 'where players cut raw gems and have them set into their gear',
    look: 'A narrow, tidy two-storey shop of fieldstone and dark timber, with iron-barred windows and one big bay window of small glass panes.',
    bro: 'a giant cut amethyst the size of a barrel mounted on the roof like a trophy, and a jeweller\'s magnifying glass as big as a cartwheel hanging over the door as the shop\'s sign',
  }),
  B({
    id: 'sheriff', name: "Sheriff's Office", end: 'north', sign: 'SHERIFF', also: 'the one big 0 on the chalkboard',
    job: 'where players sign up for duels and the arena, and take bounties',
    look: 'A squat, solid jailhouse of fieldstone with a flat roof behind a square false front, small barred windows, an iron-strapped door, and a hitching rail along the porch.',
    bro: 'wanted posters of monsters pinned beside the door, the biggest a green slime wearing a cowboy hat; and a chalkboard showing one big "0" (days since the last slime incident). A sheriff\'s star as big as a cartwheel is nailed above the door',
  }),
  B({
    id: 'saloon', name: 'Saloon', end: 'south', sign: 'SALOON',
    job: 'where players meet and form parties',
    look: 'A classic two-storey frontier saloon of red-brown painted boards with cream trim, a tall square false front, a balcony with a railing along the upper floor, and swinging half-doors.',
    bro: 'a moose head wearing sunglasses mounted over the doors, and an arm-wrestling table with two stools on the porch. A row of beer mugs, each a different colour, hangs on hooks along the porch',
  }),
  B({
    id: 'gambling', name: 'Gambling Den', end: 'south', sign: 'GAMBLING',
    job: 'where players test their luck',
    look: 'A low, flashy building of dark green painted boards with gold trim, a red-and-cream striped awning over the porch, and club and diamond shapes cut into its shutters.',
    bro: 'a giant red die as big as a crate propping the door open, and a big wheel of fortune standing by the door',
  }),
  B({
    id: 'hotel', name: 'Hotel', end: 'south', sign: 'HOTEL',
    job: 'where players rest, and come back after a fall',
    look: 'A tall three-storey hotel of cream-painted clapboard with sky-blue shutters, a balcony along each upper floor, and dormer windows in a pitched roof.',
    bro: 'hammocks strung along the top balcony with a pair of boots sticking out of one; and a picture sign by the door of a dragon crossed out in red',
  }),
  B({
    id: 'post', name: 'Post Office & Telegraph', end: 'south', sign: 'POST OFFICE',
    job: 'where players send and collect their mail',
    look: 'A neat one-storey office of painted boards in deep blue with white trim and window frames, a row of little brass mailboxes along the front wall, and a tall telegraph pole beside it with wires and white insulators.',
    bro: 'a mailbox as tall as a man by the door, dented and proudly patched; and a mail sack hung from the porch roof as a punching bag',
  }),
  B({
    id: 'cookhouse', name: 'Cookhouse', end: 'west', sign: 'COOKHOUSE',
    job: 'where players cook food that makes them stronger',
    look: 'A cosy whitewashed cookhouse with a green tin roof, a big stone chimney, a round stone bread oven bulging from one side, and strings of sausages and garlic hung along the porch.',
    bro: 'a giant fork and spoon crossed over the door like swords, and a hot-sauce challenge shelf on the porch: a row of pepper jars from small and green to huge and red',
  }),
  B({
    id: 'feedseed', name: 'Feed & Seed', end: 'west', sign: 'FEED & SEED',
    job: 'where players buy seeds and grow their crops',
    look: 'A barn-like farm store with a big gambrel roof, barn-red upright boards with white trim, a hayloft door with a hoist arm above the main doors, and sacks of seed stacked on the porch.',
    bro: 'a giant prize pumpkin with a blue ribbon on the porch, and a scarecrow in sunglasses flexing beside the door',
  }),
  B({
    id: 'landoffice', name: 'Land Office', end: 'west', sign: 'LAND OFFICE',
    job: 'where players get to their own farm',
    look: 'A small, tidy office of whitewashed boards with a green tin roof, a big framed map of farm plots hung on its front wall, and a surveyor\'s tripod by the door.',
    bro: 'a huge wooden key hung over the door, the key to your farm; and a "biggest turnip" trophy on a post by the steps, holding a turnip as big as a barrel',
  }),
  B({
    id: 'guildhall', name: 'Guild Hall', end: 'west', sign: 'GUILD HALL',
    job: 'where players found and run their clans',
    look: 'A great log hall: walls of huge round logs, a steep shingled roof with carved crossed beams at the gable, big double doors, and banners in many different colours hanging along the front, one for each clan, with no writing on them.',
    bro: 'a giant golden cup on the roof\'s peak, and a wall of mounted monster horns and tusks around the doors like hunting trophies',
  }),
  B({
    id: 'bank', name: 'Bank', end: 'east', sign: 'BANK',
    job: 'where players keep their things safe',
    look: 'A solid, handsome bank of pale cut sandstone blocks with a columned front, heavy iron-barred windows, and a round steel vault door set into the front wall beside the entrance.',
    bro: 'two stone lions in sunglasses guarding the steps, and gold bars stacked on a bar like barbell weights on a bench by the door',
  }),
  B({
    id: 'store', name: 'General Store', end: 'east', sign: 'DEALS',
    job: 'where players buy and sell their goods',
    look: 'A big, busy general store of red brick with a tall false front, a striped awning over two big shop windows, and a long porch lined with barrels and sacks.',
    bro: 'crates stacked into a leaning tower beside the porch, propped up with a plank; and the sign, as big as the whole false front',
  }),
  B({
    id: 'auction', name: 'Auction House', end: 'east', sign: 'AUCTION',
    job: 'where players buy and sell with each other',
    look: 'A tall, proud hall of red brick with sandstone trim, a big arched entrance, tall arched windows and a small bell tower on the roof.',
    bro: 'a bidding paddle as big as a door leaning beside the entrance, and an auctioneer\'s podium with a brass gong on the porch',
  }),
];

/* ── the town's props ── */
const T = (o) => ({ group: 'town', kind: 'prop', count: 4, fit: 'h', frame: 'square', ground: 'street', key: 'magenta', ...o });
export const TOWN = [
  T({ id: 'lamp', ar: 0.3, name: 'Lamp posts', count: 2, size: 180, ground: 'plaza', what: 'black iron street lamps on tall posts, each with a glass lantern box on top under a little iron cap, unlit', ones: 'one straight and plain; one with a bent post and a dent, proudly patched with a riveted iron strap' }),
  T({ id: 'barrel', ar: 0.85, name: 'Barrels', size: 52, what: 'wooden barrels with iron hoops', ones: 'one standing upright; one lying on its side; one small keg; one with a dented hoop and a patched plank' }),
  T({ id: 'crate', ar: 1.0, name: 'Crates', size: 54, what: 'wooden crates with plank sides and corner battens', ones: 'one single crate; two stacked crates; one open crate full of straw; one long crate' }),
  T({ id: 'haybale', ar: 1.3, name: 'Hay bales', size: 46, ground: 'town-yard', what: 'square hay bales tied with twine', ones: 'one single bale; two bales stacked; one bale with a pitchfork stuck in it; one round bale' }),
  T({ id: 'trough', ar: 2.2, name: 'Water troughs', count: 2, size: 48, what: 'wooden water troughs on short legs, full of water', ones: 'one plain; one with an iron hand pump at one end' }),
  T({ id: 'hitch', ar: 1.6, name: 'Hitching posts', count: 2, size: 64, what: 'wooden hitching rails: two short posts with a rail between them, for tying up horses', ones: 'one plain; one with a horseshoe nailed to a post for luck' }),
  T({ id: 'bench', ar: 2.0, name: 'Benches', count: 2, size: 52, ground: 'plaza', what: 'wooden benches seen from the front', ones: 'one plain bench; one with a carved backrest and armrests' }),
  T({ id: 'well', ar: 0.8, name: 'Well', count: 1, size: 160, ground: 'plaza', what: 'a round stone well with a little shingled roof on two posts, a crank and a wooden bucket on a rope' }),
  T({ id: 'signpost', ar: 0.6, name: 'Signposts', count: 2, size: 150, ground: 'road', what: 'wooden signposts with arrow-shaped boards pointing different ways, the boards left blank', ones: 'one with three arrows; one with two arrows and an old boot hung on top' }),
  T({ id: 'cart', ar: 1.6, name: 'Hand cart', count: 1, fit: 'w', size: 150, what: 'a wooden hand cart with two big spoked wheels and long handles, seen from the side, the handles to the left' }),
  T({ id: 'noticeboard', ar: 0.9, name: 'Bragging board', count: 1, size: 150, ground: 'plaza', what: 'a wooden notice board on two posts with a little shingled roof, covered in pinned papers that have only drawings on them (monsters, a big fish, a flexing arm) and no writing, with a mounted trophy fish on top' }),
  T({ id: 'gate', ar: 0.95, name: 'Town gate', count: 1, fit: 'w', size: 270, sign: 'BROTOWN', what: 'the big gate where a street leaves town: two tall log posts with a heavy log crossbeam between them high overhead, a hanging board sign under the beam, and a pair of long cattle horns on top, seen square-on across the street' }),
  T({ id: 'fence', ar: 2.5, name: 'Fence, across', count: 3, fit: 'w', size: 160, ground: 'town-yard', what: 'sections of split-rail fence running straight across the picture, left to right: rough posts with two or three split rails between them', ones: 'two straight sections and one with a little gate in it' }),
  T({ id: 'fence-down', ar: 0.35, name: 'Fence, up and down', count: 2, size: 170, ground: 'town-yard', what: 'sections of split-rail fence (rough posts with two or three split rails) running straight up and down the picture, away from us: seen from above, so the rails are short and the posts stand one behind another', ones: 'two straight sections side by side' }),
];

/* ── nature, land by land ── (`size` is the middle one's; ground ids are
   the Ground Studio's swatches) */
const N = (group, o) => ({ group, kind: 'nature', count: 4, fit: 'h', frame: 'square', key: 'magenta', ...o });
export const NATURE = [
  /* Brotown Commons */
  N('commons', { id: 'oak', ar: 0.9, name: 'Oak trees', count: 2, size: 300, frame: 'wide', ground: 'commons', what: 'broad, leafy oak trees with thick trunks and round, layered canopies', ones: 'one big and round; one a little lopsided' }),
  N('commons', { id: 'orchard', ar: 0.9, name: 'Orchard trees', count: 2, size: 220, ground: 'commons', what: 'small orchard apple trees with red apples among the leaves', ones: 'one round; one a little taller' }),
  N('commons', { id: 'bush', ar: 1.3, name: 'Bushes', size: 60, ground: 'commons', what: 'round leafy green bushes', ones: 'one small; one wide; one with a few white flowers; one tall' }),
  N('commons', { id: 'haystack', ar: 1.1, name: 'Haystacks', count: 2, size: 110, ground: 'commons', what: 'big round haystacks of golden hay, a little ragged', ones: 'one tall and rounded; one lower, with a pitchfork leaning on it' }),
  N('commons', { id: 'stone', ar: 1.2, name: 'Stones', size: 50, ground: 'commons', what: 'grey field stones and small boulders', ones: 'one round; one flat; one tall; one pair leaning together' }),
  N('commons', { id: 'flowers', ar: 1.2, name: 'Wildflower clumps', size: 30, ground: 'commons', what: 'small clumps of wildflowers with their leaves', ones: 'yellow; white; blue; and a mix' }),
  N('commons', { id: 'stump', ar: 1.3, name: 'Tree stumps', size: 40, ground: 'commons', what: 'tree stumps sawn flat, showing their rings', ones: 'one wide; one narrow; one with an axe stuck in it; one with moss and a little mushroom' }),
  /* Frost Ridge */
  N('frost', { id: 'pine', ar: 0.55, name: 'Snowy pines', count: 2, size: 340, frame: 'wide', ground: 'frost-2', what: 'tall pine trees heavy with snow on their branches', ones: 'one tall and narrow; one fuller' }),
  N('frost', { id: 'birch', ar: 0.6, name: 'Bare birches', count: 2, size: 280, ground: 'frost-1', what: 'bare white birch trees with no leaves, their thin branches dusted with snow', ones: 'one single trunk; one double trunk' }),
  N('frost', { id: 'snowrock', ar: 1.3, name: 'Snowy rocks', size: 60, ground: 'frost-2', what: 'grey rocks capped with snow', ones: 'one round; one flat; one tall; one pair' }),
  N('frost', { id: 'icespire', ar: 0.5, name: 'Ice spires', count: 2, size: 180, ground: 'frost-4', what: 'jagged spires of blue-white ice standing up from the ground', ones: 'one single tall spire; one cluster of three' }),
  N('frost', { id: 'frostbush', ar: 1.3, name: 'Frosted shrubs', size: 50, ground: 'frost-1', what: 'low brown winter shrubs with frost on their twigs', ones: 'four different shapes' }),
  /* Flame Fields */
  N('ember', { id: 'deadtree', ar: 0.8, name: 'Charred trees', count: 2, size: 260, ground: 'ember-1', what: 'dead trees burnt black, with bare twisted branches and glowing orange cracks drawn flat in the bark', ones: 'one tall; one snapped off halfway' }),
  N('ember', { id: 'charstump', ar: 1.3, name: 'Burnt stumps', size: 40, ground: 'ember-1', what: 'blackened tree stumps', ones: 'four different shapes' }),
  N('ember', { id: 'basalt', ar: 1.2, name: 'Basalt rocks', size: 70, ground: 'ember-2', what: 'black basalt rocks with sharp edges', ones: 'one round; one flat; one tall column; one pair' }),
  N('ember', { id: 'obsidian', ar: 0.6, name: 'Obsidian shards', count: 2, size: 140, ground: 'ember-4', what: 'tall shards of glassy black obsidian with sharp purple-grey highlights', ones: 'one single shard; one cluster of three' }),
  /* Wind Dunes */
  N('sky', { id: 'cactus', ar: 0.7, name: 'Cacti', size: 130, ground: 'sky-2', what: 'desert cacti', ones: 'a tall cactus with two arms; a short one with one arm; a round barrel cactus; a prickly pear with a pink flower' }),
  /* v2.3.2981: `lean` -- every palm leans LEFT in the game's copy (one drawn
     leaning right is mirrored on the way in, and each stands on its trunk:
     objects/atlas.js standPiece), so the Wheel can lean each one round an
     oasis in over its pool (world/core/placing.js) */
  N('sky', { id: 'palm', ar: 0.8, name: 'Palm trees', count: 2, size: 320, frame: 'wide', ground: 'sky-2', what: 'oasis palm trees with curving trunks and a crown of long fronds', ones: 'one leaning left; one leaning right', lean: 'left' }),
  N('sky', { id: 'tumbleweed', ar: 1.1, name: 'Tumbleweeds', size: 40, ground: 'sky-1', what: 'dry tumbleweeds, round tangles of pale twigs', ones: 'four sizes' }),
  N('sky', { id: 'skull', ar: 1.6, name: 'Bleached skulls', fit: 'w', size: 56, ground: 'sky-1', what: 'bleached cattle skulls with horns, lying on the ground', ones: 'four, turned different ways' }),
  N('sky', { id: 'hoodoo', ar: 0.6, name: 'Hoodoo rocks', count: 2, size: 240, ground: 'sky-2', what: 'red sandstone rock stacks, banded in layers, with a wider stone balanced on top', ones: 'one tall and thin; one wider and lower' }),
  N('sky', { id: 'sage', ar: 1.4, name: 'Sage brush', size: 45, ground: 'sky-1', what: 'dry grey-green sage bushes', ones: 'four different shapes' }),
  /* Stone Hollows */
  N('hollows', { id: 'boulder', ar: 1.2, name: 'Boulders', size: 90, ground: 'hollows-1', what: 'grey granite boulders with hard facets and cracks', ones: 'one round; one flat-topped; one split in two; one with pale moss' }),
  N('hollows', { id: 'crystal', ar: 0.9, name: 'Crystal clusters', key: 'green', size: 100, ground: 'hollows-2', what: 'clusters of blue and violet crystals growing out of a grey rock base', ones: 'four different clusters' }),
  N('hollows', { id: 'minecart', ar: 1.4, name: 'Mine cart', count: 1, fit: 'w', size: 110, ground: 'hollows-1', what: 'an old iron mine cart full of grey ore, seen from the side, standing alone with no rails' }),
  N('hollows', { id: 'rubble', ar: 1.6, name: 'Rubble', size: 45, ground: 'hollows-1', what: 'small heaps of broken grey rubble', ones: 'four different heaps' }),
  /* Electric Foundry */
  N('thunder', { id: 'pylon', ar: 0.45, name: 'Iron pylons', count: 2, size: 380, frame: 'wide', ground: 'thunder-3', what: 'tall iron lattice pylons with crossbars and white insulators', ones: 'one straight; one a little bent and patched with riveted plates' }),
  N('thunder', { id: 'scrap', ar: 1.4, name: 'Scrap piles', size: 60, ground: 'thunder-1', what: 'piles of rusty iron scrap: gears, pipes and bent plates', ones: 'four different piles' }),
  N('thunder', { id: 'coal', ar: 1.5, name: 'Coal heaps', count: 2, size: 70, ground: 'thunder-1', what: 'heaps of black coal with a shovel stuck in them', ones: 'one big; one small' }),
  N('thunder', { id: 'coil', ar: 0.5, name: 'Copper coils', count: 2, size: 190, ground: 'thunder-3', what: 'tall copper coils on iron stands, each topped with a lightning rod', ones: 'one single coil; one twin coil' }),
  /* Water Caves */
  N('tidal', { id: 'driftwood', ar: 3.0, name: 'Driftwood', fit: 'w', size: 120, ground: 'tidal-1', what: 'pale, sea-worn driftwood logs and branches lying on the ground', ones: 'four different pieces' }),
  N('tidal', { id: 'netpole', ar: 1.2, name: 'Net poles', count: 2, size: 170, ground: 'tidal-1', what: 'two wooden poles with a fishing net hung between them to dry, with cork floats', ones: 'one neat; one with a torn, patched net' }),
  N('tidal', { id: 'rowboat', ar: 2.6, name: 'Beached boat', count: 1, fit: 'w', size: 210, ground: 'tidal-1', what: 'a small wooden rowing boat pulled up on the sand, seen from the side, the bow to the left, with its oars inside' }),
  N('tidal', { id: 'searock', ar: 1.3, name: 'Sea rocks', size: 70, ground: 'tidal-3', what: 'dark sea rocks with green moss and a few barnacles', ones: 'four different shapes' }),
  N('tidal', { id: 'shell', ar: 1.1, name: 'Giant shells', key: 'green', size: 60, ground: 'tidal-4', what: 'giant sea shells, as big as a barrel', ones: 'a spiral conch; a fan scallop; a clam; a spiky one' }),
  N('tidal', { id: 'coral', ar: 1.0, name: 'Coral', key: 'green', size: 80, ground: 'tidal-4', what: 'clumps of coral', ones: 'pink branching; orange fan; purple brain coral; teal tube coral' }),
  /* Poison Forest */
  N('mist', { id: 'slimetree', ar: 0.8, name: 'Slime trees', count: 2, size: 290, ground: 'mist-2', what: 'twisted dead trees dripping green slime from their branches', ones: 'one tall and crooked; one hunched' }),
  N('mist', { id: 'toadstool', ar: 0.8, name: 'Giant toadstools', key: 'green', size: 130, ground: 'mist-2', what: 'giant toadstools with spotted caps', ones: 'a tall purple one; a wide yellow one; a cluster of small purple ones; a drooping yellow one' }),
  N('mist', { id: 'mangrove', ar: 1.0, name: 'Mangroves', count: 2, size: 270, ground: 'mist-3', what: 'mangrove trees standing on tangled arching roots, hung with grey moss', ones: 'one tall; one wider' }),
  N('mist', { id: 'scarecrow', ar: 0.7, name: 'Scarecrow', count: 1, size: 130, ground: 'mist-1', what: 'a lopsided, withered scarecrow on a pole, in a torn hat and patched shirt' }),
  /* Verdant Wilds */
  N('verdant', { id: 'jungletree', ar: 0.9, name: 'Giant jungle trees', count: 2, size: 400, frame: 'wide', ground: 'verdant-2', what: 'giant jungle trees with huge mossy trunks, buttress roots and vines hanging from a vast canopy', ones: 'one very tall; one wider' }),
  N('verdant', { id: 'wildfruit', ar: 0.9, name: 'Wild fruit trees', count: 2, size: 240, ground: 'verdant-1', what: 'old fruit trees gone wild, overgrown, with orange fruit', ones: 'one round; one leaning' }),
  N('verdant', { id: 'giantflower', ar: 0.7, name: 'Giant flowers', key: 'green', size: 110, ground: 'verdant-2', what: 'giant jungle flowers on thick stems', ones: 'red; purple; teal; yellow' }),
  N('verdant', { id: 'fern', ar: 1.3, name: 'Ferns', size: 60, ground: 'verdant-2', what: 'lush green ferns', ones: 'four different shapes' }),
  N('verdant', { id: 'stonewall', ar: 2.5, name: 'Tumbledown wall', fit: 'w', size: 150, ground: 'verdant-1', what: 'short pieces of an old tumbledown dry-stone wall running left to right, mossy, with a few stones fallen', ones: 'four different pieces' }),
];

/* The groups, in the order the page shows them */
export const GROUPS = [
  { id: 'buildings', name: 'Brotown buildings' },
  { id: 'town', name: 'Town props' },
  { id: 'commons', name: 'Brotown Commons' },
  { id: 'frost', name: 'Frost Ridge' },
  { id: 'ember', name: 'Flame Fields' },
  { id: 'sky', name: 'Wind Dunes' },
  { id: 'hollows', name: 'Stone Hollows' },
  { id: 'thunder', name: 'Electric Foundry' },
  { id: 'tidal', name: 'Water Caves' },
  { id: 'mist', name: 'Poison Forest' },
  { id: 'verdant', name: 'Verdant Wilds' },
];

export function objectCatalog() {
  return [...BUILDINGS, ...TOWN, ...NATURE];
}
