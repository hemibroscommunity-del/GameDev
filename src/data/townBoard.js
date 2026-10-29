/* ═══ v2.3.3766: THE TOWN HALL'S BOARD -- EVERYTHING TO DO, AND WHERE ═══
 *
 * The owner, 2026-10-28: "I was also thinking it would be cool if at the town
 * hall it was just a big menu board of all the things to do (dungeon,
 * gambling, arena, woodworking, etc) with a page that describes what each
 * thing does and pin drop you can put on the map to go to the one you want
 * (two pins can be active at once - red pin and blue pin).  When you "enter
 * it" it brings up the board."
 *
 * One row a thing to do, BUILT AND REACHABLE in the world today (CLAUDE.md §2:
 * a dormant system stays off the board -- the Bank stores nothing, so it is
 * here as what it is, a look at your gold and gear).  Each row:
 *   id     the pin's name for it (game/mapPins.js keeps ids, never places);
 *   group  the board's heading (GROUPS, in order);
 *   name, icon, emoji   the tile.  v2.3.3779, the owner: "use better icons
 *          for each one" -- every tile its OWN picture (town-board.test 1k),
 *          from the game's art: a building its map picture
 *          (data/wheelBuildingDoors.js WHEEL_BUILDING_ICONS), a townsperson
 *          his head, a land its scene (ownerIcons.js LAND_SCENE, the owner's
 *          pick 1b), a dungeon its boss and the Arena its gate
 *          (public/icons/board/, cut small from the monsters' and the arena's
 *          own art at 256 colours: tools/ui/bake-board-icons.py);
 *   iconAspect   a picture wider than tall (width / height; 1 if absent);
 *   page   2-4 short sentences: what it is, what you do, what you get, the
 *          level or cost (numbers from the code: docs/GDD-AS-BUILT.md and the
 *          worker's own tables, never invented);
 *   where  where it is, in words;
 *   at     how its place is found AT RUNTIME (game/mapPinPlaces.js), never a
 *          coordinate written here (CLAUDE.md §1):
 *            { door }   a building of the town, by its plot id (the door's
 *                       foot, wheelTownDoors);
 *            { npc }    a townsperson, by name (where he stands);
 *            { mouth }  a dungeon's way in, by its land (wheelDungeonDoors);
 *            { land }   a land, its first stretch (the world map's `lands`);
 *            null       nowhere in particular (`nopin`: its page has no pins);
 *   {land}  in a name, a page or a where: that land's name from the world's
 *          own plan (v2.3.3779: lane K's rename of a land lands in one place,
 *          public/tools/world/plan.js; boardWords fills it in);
 *   sub    the one line under the tile's name (v2.3.3801, the owner's
 *          review); a land's and a dungeon's are made at runtime
 *          (mapPinPlaces.js boardSub: its compass and element, its levels);
 *   ifCap  { cap, sub, page }: the words when the worker has `cap` (the Bank
 *          with lane L's vault);
 *   action a page with no place has ONE button in place of the pins
 *          (v2.3.3801): 'quests' opens your Quests page, 'ride' gets you on
 *          the skateboard (only where you may ride);
 *   cap    a worker cap it waits for (the tile is not shown without it);
 *   mouth  a dungeon the worker must open (game/wheelDungeons.js).
 * No imports: a node suite reads it (server/test/town-board.test.mjs). */

export const GROUPS = Object.freeze([
  /* v2.3.3801: the owner's review of the board (ChatGPT's, adopted): these
     names and this order.  The ids stay (the pins and tests key on them) */
  { id: 'quests', name: 'Quests' },   /* v2.3.3788: the owner, "(quests should've be another one)" -- first */
  { id: 'lands', name: 'Explore the Lands' },
  { id: 'dungeons', name: 'Dungeons' },   /* v2.3.3779: the owner, "classified by 'dungeon' not by 'fight'" */
  { id: 'fight', name: 'Fight' },
  { id: 'make', name: 'Craft & Grow' },
  { id: 'money', name: 'Trade & Bank' },
  { id: 'gambling', name: 'Gambling' },   /* v2.3.3788: the owner, "'Gambling' should be another category" */
  { id: 'people', name: 'Town Life' },
]);

const E = (o) => Object.freeze(o);

export const BOARD = Object.freeze([
  /* ── Quests (v2.3.3788, the owner: "(quests should've be another one)";
     the numbers are the worker's QUEST_REWARDS and GUILD_QUESTS, held to
     these words by town-board.test 1r) ── */
  E({ id: 'mayor', group: 'quests', name: 'Mayor\u2019s Story', sub: 'Main story quests', icon: '/sprites/npc/mayor-bro-head.webp', emoji: '🎩',
    page: ['The Mayor\u2019s quests, six in a row: slimes in the land of {verdant}, snowmen in {frost}, skeletons in {sky} and fire goblins in {ember}, then a hunt and a dungeon.',
      'About 1,175 gold in all, with XP and gear on the way. His first quest opens everyone else\u2019s.'],
    where: 'Mayor Bro, on the Town Hall\u2019s steps, in BroTown.', at: { npc: 'Mayor Bro' } }),
  /* not one place (six people), so no pins: the gold "!" over a head says who */
  E({ id: 'townquests', group: 'quests', name: 'Town Quests', sub: 'Help the townsfolk', icon: '/ui/quest/pin-offer.webp?v=2.3.3481', emoji: '❗',
    page: ['Twelve quests from six people: Blacksmith Bro, Woodworker Bro, Farmer Bro, Beastmaster Bro, Diego and Lil Bro. Each teaches a trade and pays gold and tools.',
      'They open after the Mayor\u2019s first quest. Look for the gold \u201c!\u201d over a head, in the street and on your map.'],
    where: 'Around BroTown\u2019s square.', at: null, nopin: true, action: 'quests' }),   /* v2.3.3801: its one button opens your Quests page */
  /* ── Dungeons (v2.3.3779: their own heading, and each its own boss's picture) ── */
  E({ id: 'goo-grotto', group: 'dungeons', name: 'Goo Grotto', icon: '/icons/board/goo-grotto.png?v=2.3.3779', emoji: '🕳',
    page: ['A dungeon of the land of {verdant}: three waves of its slimes, then a giant slime that splits three times.',
      'Built for a party of 2 or 3 at about level 10. Clear it for gold, the boss’s chest and the land’s shards.',
      'Die inside and you wake in BroTown with your bag kept.'],
    where: 'In the land of {verdant}, west of BroTown, in its first stretch.', at: { mouth: 'verdant' }, mouth: 'verdant' }),
  E({ id: 'great-cave', group: 'dungeons', name: 'Great Cave', icon: '/icons/board/great-cave.png?v=2.3.3779', emoji: '🕳',
    page: ['A dungeon of the rock monsters of {hollows}: three waves, then an Amethyst Golem.',
      'Levels 26 to 30, never above your own level. A clear pays gold and opens the boss’s chest.'],
    where: 'Deep in the land of {hollows}, east of BroTown, at the end of the mine railway.', at: { mouth: 'hollows' }, mouth: 'hollows' }),
  E({ id: 'foundry-dome', group: 'dungeons', name: 'Foundry Dome', icon: '/icons/board/foundry-dome.png?v=2.3.3779', emoji: '🕳',
    page: ['A dungeon of the slimes of {thunder}: three waves, then a giant Storm Slime that splits three times.',
      'Levels 26 to 30, never above your own level. A clear pays gold and opens the boss’s chest.'],
    where: 'Deep in the land of {thunder}, south-east of BroTown.', at: { mouth: 'thunder' }, mouth: 'thunder' }),
  E({ id: 'buried-city', group: 'dungeons', name: 'Buried City', icon: '/icons/board/buried-city.png?v=2.3.3779', emoji: '🕳',
    page: ['A dungeon of the mummies of {sky}: three waves, then a Gilded Mummy.',
      'Levels 41 to 45, never above your own level. A clear pays gold and opens the boss’s chest.'],
    where: 'Far out in the land of {sky}, north-east of BroTown.', at: { mouth: 'sky' }, mouth: 'sky' }),
  /* ── Fight ── */
  E({ id: 'arena', group: 'fight', name: 'The Arena', sub: 'Entry: 100 gold', icon: '/icons/board/arena.png?v=2.3.3779', iconAspect: 1.27, emoji: '🏟',
    page: ['A tournament between players: 100 gold to enter, up to 8 fighters, one knockout bracket.',
      'Each match is a 3-minute duel with no healing. The champion wins 250 gold for every fighter in the bracket.',
      'Not fighting? Back a fighter with gold and share the losing side’s stakes.'],
    where: 'Sign up at the Sheriff’s Office, in BroTown.', at: { door: 'sheriff' } }),
  /* v2.3.3766: No man's land is everywhere past the safe ground, not one
     place, so its page has no pins (`nopin`); its level words stay general
     (lane H is changing how its levels step) */
  E({ id: 'nomansland', group: 'fight', name: 'No man\u2019s land', sub: 'PvP \u00b7 Loot at risk', icon: '/icons/ui/threat-skull.webp', emoji: '☠️',
    page: ['Outside BroTown\u2019s safe ground, players may fight each other. The further out you go, the higher the levels of the players you can meet there.',
      'Attacking is a choice you are asked first. The attacker wears a red skull, the one attacked a white one.',
      'Killed by a player there, you lose everything you carry; what you wear you keep, unless you wear the red skull.'],
    where: 'Everywhere outside BroTown\u2019s safe ground.', at: null, nopin: true }),
  E({ id: 'duel', group: 'fight', name: 'Duels', sub: 'Friendly \u00b7 No loss', icon: '/icons/ui/soc-duel.webp', emoji: '⚔️',
    page: ['Challenge another player to a friendly fight. Nobody loses anything: no items, no gold.',
      'Pick a player from the list at the Sheriff’s Office, or from their card.'],
    where: 'The Sheriff’s Office, in BroTown.', at: { door: 'sheriff' } }),

  /* ── Explore the lands (each its first stretch) ── */
  E({ id: 'land-verdant', group: 'lands', name: '{verdant}', icon: '/ui/banners/land-verdant.webp?v=2.3.3511', iconAspect: 2, emoji: '🌿',
    page: ['The flora land, where slimes live. The Mayor’s first quest sends you here.',
      'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'West of BroTown.', at: { land: 'verdant' } }),
  E({ id: 'land-ember', group: 'lands', name: '{ember}', icon: '/ui/banners/land-ember.webp?v=2.3.3511', iconAspect: 2, emoji: '🔥',
    page: ['The flame land of Fire Goblins.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'North of BroTown.', at: { land: 'ember' } }),
  E({ id: 'land-frost', group: 'lands', name: '{frost}', icon: '/ui/banners/land-frost.webp?v=2.3.3511', iconAspect: 2, emoji: '❄️',
    page: ['The frost land of Snowmen.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'North-west of BroTown.', at: { land: 'frost' } }),
  E({ id: 'land-sky', group: 'lands', name: '{sky}', icon: '/ui/banners/land-sky.webp?v=2.3.3511', iconAspect: 2, emoji: '🌪',
    page: ['The wind land of Mummies and Skeletons, with the Buried City far out.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'North-east of BroTown.', at: { land: 'sky' } }),
  E({ id: 'land-hollows', group: 'lands', name: '{hollows}', icon: '/ui/banners/land-hollows.webp?v=2.3.3511', iconAspect: 2, emoji: '🪨',
    page: ['The stone land of Rock Monsters, with the Great Cave at the end of the railway.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'East of BroTown.', at: { land: 'hollows' } }),
  E({ id: 'land-thunder', group: 'lands', name: '{thunder}', icon: '/ui/banners/land-thunder.webp?v=2.3.3511', iconAspect: 2, emoji: '⚡',
    page: ['The storm land of Slimes, with the Foundry Dome far out.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'South-east of BroTown.', at: { land: 'thunder' } }),
  E({ id: 'land-tidal', group: 'lands', name: '{tidal}', icon: '/ui/banners/land-tidal.webp?v=2.3.3511', iconAspect: 2, emoji: '💧',
    page: ['The water land of Fishmen.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'South of BroTown.', at: { land: 'tidal' } }),
  E({ id: 'land-mist', group: 'lands', name: '{mist}', icon: '/ui/banners/land-mist.webp?v=2.3.3511', iconAspect: 2, emoji: '☠️',
    page: ['The venom land of Mire Wisps and Bog Lurkers.', 'Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.'],
    where: 'South-west of BroTown.', at: { land: 'mist' } }),

  /* ── Make ── */
  E({ id: 'forge', group: 'make', name: 'Blacksmith', sub: 'Forge & upgrade', icon: '/icons/ui/bldg-forge.webp?v=2.3.1224', emoji: '⚒',
    page: ['Smelt ore into bars, then forge great swords and armour from them.',
      'Upgrade (harden) your gear, make an amulet, or salvage old pieces for bars.',
      'Blacksmith Bro, by its steps, has the smithing quests.'],
    where: 'In BroTown, north of the square.', at: { door: 'blacksmith' } }),
  E({ id: 'woodworker', group: 'make', name: 'Woodworker', sub: 'Bows, staffs & traps', icon: '/icons/ui/bldg-woodwork.webp?v=2.3.1224', emoji: '🪚',
    page: ['Turn logs into hardened wood, then make bows and staffs from it.',
      'Box traps for catching pets are made here too, one log each.'],
    where: 'In BroTown, north of the square.', at: { door: 'woodworker' } }),
  E({ id: 'gemworks', group: 'make', name: 'Gem Works', sub: 'Cut & socket gems', icon: '/icons/ui/skill-gemcutting.webp?v=2.3.1224', emoji: '💎',
    page: ['Crack the shards monsters and harvests drop to find raw gems; three raw gems make an elemental gem.',
      'Set a gem in a weapon, an amulet or a shield: every hit then carries its element.'],
    where: 'In BroTown, east of the square.', at: { door: 'gemcutter' } }),
  E({ id: 'cookhouse', group: 'make', name: 'Cookhouse', sub: 'Food & buffs', icon: '/icons/ui/bldg-cook.webp?v=2.3.1224', emoji: '🍲',
    page: ['Cook your crops and herbs into dishes that heal, refill stamina or speed you up for a while.',
      'Raw fish cook at a campfire you light from a log, anywhere in the world.'],
    where: 'In BroTown, west of the square.', at: { door: 'cookhouse' } }),
  E({ id: 'feedseed', group: 'make', name: 'Feed & Seed', sub: 'Seeds & orders', icon: '/icons/ui/skill-farming.webp?v=2.3.1224', emoji: '🌱',
    page: ['Buy seeds and fill orders, and go to your farm.',
      'On the farm you dig, plant, water and harvest sixteen kinds of crop. Crops grow while you are away.'],
    where: 'In BroTown, west of the square.', at: { door: 'feedseed' } }),
  E({ id: 'farm', group: 'make', name: 'Your Farm', sub: 'Grow 16 crops', icon: '/icons/ui/bldg-farm.webp?v=2.3.1224', emoji: '🚜',
    page: ['Your own beds to grow crops in, free. The barn is the Pet House; the haystack gives a night’s rest.',
      'The Land Office takes you there; the farm’s gate brings you back to the same door.'],
    where: 'The Land Office, in BroTown, west of the square.', at: { door: 'landoffice' } }),
  E({ id: 'pets', group: 'make', name: 'Pets', sub: 'Catch & collect loot', icon: '/sprites/npc/beastmaster-bro-head.webp', emoji: '🐾',
    page: ['Arm a box trap on a monster, then defeat it, and you may catch it as a pet. Catching is rare.',
      'A pet follows you, picks up loot and wards off its element. Beastmaster Bro teaches you.'],
    where: 'Beastmaster Bro, by the Woodworker, in BroTown.', at: { npc: 'Beastmaster Bro' }, cap: 'beastmaster' }),

  /* ── Money and trade ── */
  E({ id: 'store', group: 'money', name: 'General Store', sub: 'Player weapon exchange', icon: '/icons/ui/panel-shop.webp', emoji: '🏪',
    page: ['The Exchange: buy and sell weapons with other players by placing orders. No fee.'],
    where: 'In BroTown, west of the square.', at: { door: 'store' } }),
  E({ id: 'diego', group: 'money', name: 'Diego\u2019s Shop', sub: 'Sell goods & tools', icon: '/sprites/npc/shopkeeper-bro-head.webp', emoji: '🪙',
    page: ['Diego buys what you gather and make: ore, bars, logs, crops and gems.',
      'He also sells back the pickaxe, hatchet and rod, 100 gold each, if you lose one.'],
    where: 'Beside the General Store, in BroTown.', at: { npc: 'Diego' } }),
  E({ id: 'auction', group: 'money', name: 'Auction House', sub: 'Buy, bid & sell', icon: '/icons/ui/bldg-auction-gavel.webp?v=2.3.3526', emoji: '🔨',
    page: ['List items, weapons, gear or pets at your own price for 7 days, or buy, bid and make offers.',
      'Sales are paid by mail if you are away. No fee.'],
    where: 'In BroTown, east of the square.', at: { door: 'auction' } }),
  E({ id: 'gambling', group: 'gambling', name: 'Gambling Den', sub: 'Free spins & wagers', icon: '/icons/ui/bldg-gamble.webp?v=2.3.1224', emoji: '🎲',
    page: ['A free daily spin you can double or nothing, a wager of 10 to 10,000 gold, and a weekly jackpot of 50-gold tickets.'],
    where: 'In BroTown, south of the square.', at: { door: 'gambling' } }),
  E({ id: 'ace', group: 'gambling', name: 'Ace\u2019s Coin Flip', sub: '45% chance to win', icon: '/sprites/npc/cardsharp-bro-head.webp', emoji: '🪙',
    page: ['Ace flips a coin: stake at least 10 gold, and win three times your stake or lose three times it.',
      'The odds are against you: you win 45 times in 100.'],
    where: 'Beside the Gambling Den, in BroTown.', at: { npc: 'Ace' } }),
  E({ id: 'bank', group: 'money', name: 'Bank', sub: 'Gold & gear overview', icon: '/icons/ui/bldg-bank.webp?v=2.3.1224', emoji: '🏦',
    page: ['A look at your gold and your gear. Nothing can be stored here yet.'],
    where: 'In BroTown, east of the square.', at: { door: 'bank' },
    /* v2.3.3801: a worker with lane L's vault (caps.bank) stores things here:
       its own words (mapPinPlaces.js boardSub, boardPage) */
    ifCap: { cap: 'bank', sub: 'Store gold & items',
      page: ['Your vault: put gold and items in to keep them safe, and take them out when you need them.'] } }),

  /* ── People ── */
  E({ id: 'saloon', group: 'people', name: 'Saloon', sub: 'Parties & shared health', icon: '/icons/ui/bldg-tavern.webp?v=2.3.1224', emoji: '🍺',
    page: ['Team up: invite players to your party. A party sees each other’s health, has its own chat and goes into dungeons together.'],
    where: 'In BroTown, south of the square.', at: { door: 'saloon' } }),
  E({ id: 'guildhall', group: 'quests', name: 'Guild Hall', sub: '10 skill guilds', icon: '/icons/ui/panel-guild.webp', emoji: '🏛',
    page: ['Your rank in each life skill’s guild, and its quests: a ladder of eight rewards for reaching level 5, 15, 30, 50, 70, 90, 100 and 150 in the skill.',
      'Each pays gold, from 30 at the first to 2,000 at the last.'],
    where: 'In BroTown, north of the square.', at: { door: 'guildhall' } }),
  E({ id: 'post', group: 'people', name: 'Post Office', sub: 'Mail & payouts', icon: '/icons/ui/evt-mail.webp', emoji: '📫',
    page: ['Your mail: sales, refunds, trade payouts and rewards, and anything that came while you were away. Write to your friends here too.'],
    where: 'In BroTown, north of the square.', at: { door: 'post' } }),
  E({ id: 'hotel', group: 'people', name: 'Hotel', sub: 'Free rest \u00b7 XP boost', icon: '/ui/controls/sleep.webp?v=2.3.3526', emoji: '🛏',
    page: ['A free night’s rest: full health, stamina and mana, and Well Rested, more XP from fights for a while.'],
    where: 'In BroTown, south of the square.', at: { door: 'hotel' }, cap: 'rest' }),
  E({ id: 'race', group: 'people', name: 'Lil Bro\u2019s Race', sub: 'Race around town', icon: '/sprites/npc/lil-bro-head.webp', emoji: '🏁',
    page: ['Race Lil Bro once round the Town Hall’s square. He runs a little faster than you walk, so sprint.'],
    where: 'Lil Bro, on the square west of the Town Hall.', at: { npc: 'Lil Bro' }, cap: 'race' }),
  /* v2.3.3801: the skateboard (game/ride.js), with its button's own picture
     (rendering/rideFx.js RIDE_ICON_URL); everywhere on the safe ground, so no
     pin, and its page's one button gets you on (`action`) */
  E({ id: 'skate', group: 'people', name: 'Skateboard', sub: 'Ride around town', icon: '/sprites/ride/skateboard-top.png?v=2.3.3776', emoji: '🛹',
    page: ['Ride a skateboard, twice as fast as walking, on BroTown\u2019s safe ground only.',
      'Press the board button (Z on a computer) to get on or off. You step off at the edge of town, when you are hit, or in a fight.'],
    where: 'Anywhere on BroTown\u2019s safe ground.', at: null, nopin: true, cap: 'ride', action: 'ride' }),
]);

/** Can a pin go on row `id` (a row with a place)? */
export function boardPinnable(id) {
  const e = boardEntry(id);
  return !!e && !e.nopin && !!e.at;
}

/** The row for `id`, or null. */
export function boardEntry(id) {
  if (typeof id !== 'string') return null;
  for (const e of BOARD) if (e.id === id) return e;
  return null;
}

/* v2.3.3779: a land's name is the world's (plan.js regions[id].name, which
   reaches the phone as the world map's `names`), never spelt here: a
   `{land}` in a row's words is filled from `names`; without them (the map not
   made yet, a node test) the land's element, "the flora land". */
const ELEMENT = Object.freeze({ frost: 'frost', ember: 'flame', sky: 'wind', hollows: 'stone',
  thunder: 'storm', tidal: 'water', mist: 'venom', verdant: 'flora' });
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** `text` with each `{land}` as that land's name (`names`: region id to
 *  name, the world map's `names`, or null). */
export function boardWords(text, names) {
  return String(text).replace(/\{([a-z]+)\}/g, (m, id) => {
    if (own(names, id) && typeof names[id] === 'string' && names[id]) return names[id];
    return own(ELEMENT, id) ? 'the ' + ELEMENT[id] + ' land' : m;
  });
}

/** The tile's name: a land's own name (`names`), else its element's. */
export function boardName(e, names) {
  const n = boardWords(e.name, names);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/* v2.3.3801: a land's line, its compass and element ("West \u00b7 Flora",
   "NW \u00b7 Frost"), from the world's plan (the world map's `lands`:
   `dir`, `element`); the element alone without them */
const DIR_WORD = Object.freeze({ N: 'North', S: 'South', E: 'East', W: 'West' });
const ELEMENT_WORD = Object.freeze({ flame: 'Fire' });
export function landSub(dir, element) {
  const el = typeof element === 'string' && element
    ? (own(ELEMENT_WORD, element) ? ELEMENT_WORD[element] : element.charAt(0).toUpperCase() + element.slice(1)) : '';
  const d = typeof dir === 'string' && dir ? (own(DIR_WORD, dir) ? DIR_WORD[dir] : dir) : '';
  return d && el ? d + ' \u00b7 ' + el : (d || el || null);
}

/** v2.3.3801: the land a row stands for, or null */
export function boardLand(e) {
  return e && e.at && typeof e.at.land === 'string' ? e.at.land : null;
}
/** v2.3.3801: its element, from this table (no map yet) */
export function boardLandElement(id) {
  return own(ELEMENT, id) ? ELEMENT[id] : null;
}
