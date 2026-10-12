/* ═══ v2.3.3153: THE MONSTER CODEX'S PAGES ═══
 *
 * Owner, 2026-10-12: "After you kill a monster you learn more about it, what
 * it does, where it's from, elemental type, special attack, (make up a
 * backstory) etc."
 *
 * One page for each of the Wheel's nine kinds of monster -- the pets' nine
 * (src/data/trapping.js PET_KINDS, the worker's petbook.js), so a codex page
 * and a pet journal page are always about the same monster.  Each fact on a
 * page opens at a number of kills the WORKER counts (server/src/codex.js):
 *
 *   CODEX_TIERS     the kills at which the page, the element, the special
 *                   attack and the story open.  mirror-audit holds them to the
 *                   worker's CODEX.TIERS -- it writes a kill to storage at once
 *                   exactly when it opens something here.
 *   CODEX_STAGE2_AT kills past level 20 that open the elder form (the land's
 *                   recoloured second stage, src/data/wheelStageLooks.js).
 *
 * Every number in a page's words is the game's own, read from the code that
 * does it (server/src/telegraph.js's kits and the snowman's burrow, index.js's
 * thrown balls, monsterstatus.js's elements, data.js's archetypes).  When one
 * of those changes, change the words here: nothing reads them back.  The
 * stories are made up, as asked -- the owner's to change.
 *
 * No imports from the game: the Codex page and the worker's mirror audit both
 * read this file. */

/* the kills that open each fact, in order -- mirror-audit pins the values to
   server/src/codex.js CODEX.TIERS */
export const CODEX_TIERS = Object.freeze({ page: 1, element: 3, special: 10, story: 25 });
export const CODEX_STAGE2_AT = 1;

/* the nine kinds, the worker's order (server/src/codex.js CODEX.KINDS) */
export const CODEX_KINDS = Object.freeze(['snowling', 'gobling', 'mumling', 'pebbling', 'sparklet', 'finling', 'wisplet', 'lurkling', 'dewdrop']);

/* what each fact is called when it opens ("Codex: Snowman - its element") */
export const CODEX_FACT_WORDS = Object.freeze({
  page: 'its page', element: 'its element', special: 'its special attack', story: 'its story', elder: 'its elder form',
});
const FACT_ORDER = ['page', 'element', 'special', 'story'];

/** The facts `n` kills (`n2` of them past level 20) have opened. */
export function codexFactsAt(n, n2) {
  const out = [];
  for (const f of FACT_ORDER) if (n >= CODEX_TIERS[f]) out.push(f);
  if (n >= CODEX_TIERS.page && n2 >= CODEX_STAGE2_AT) out.push('elder');
  return out;
}

/** The next fact `n` kills will open: { fact, at, left }, or null with all open. */
export function codexNextFact(n) {
  for (const f of FACT_ORDER) if (n < CODEX_TIERS[f]) return { fact: f, at: CODEX_TIERS[f], left: CODEX_TIERS[f] - n };
  return null;
}

/* ═══ THE EIGHT ELEMENTS, AND WHAT A HIT OF EACH DOES TO YOU ═══
   server/src/monsterstatus.js (CHILL, BURN, GUST, STUCK, DAZE, SHOCK, SOAK,
   POISON) -- the worker decides every one; `icon` is the land banner's and the
   hit number's (src/game/elemHits.js ELEM_ICON_SRC). */
export const CODEX_ELEMENTS = Object.freeze({
  frost: Object.freeze({ name: 'Frost', status: 'Chill', icon: '/icons/ui/elem-frost.webp',
    effect: 'Its hits chill you: for 1 second you walk at 55% of your speed.' }),
  flame: Object.freeze({ name: 'Flame', status: 'Burn', icon: '/icons/ui/elem-flame.webp',
    effect: 'Its hits set you burning: 3 more ticks, one a second, each a fifth of the hit (never more than a tenth of your max HP).' }),
  wind: Object.freeze({ name: 'Wind', status: 'Gust', icon: '/icons/ui/elem-wind.webp',
    effect: 'Its hits come with a gust that shoves you about a body\'s width away.' }),
  stone: Object.freeze({ name: 'Stone', status: 'Daze', icon: '/icons/ui/elem-stone.webp',
    effect: 'Its hits daze you for half a second: no walking, swinging, rolling or blocking. It cannot daze you again for 2.5 seconds.' }),
  storm: Object.freeze({ name: 'Storm', status: 'Shock', icon: '/icons/ui/elem-storm.webp',
    effect: 'Its hits arc from you to the nearest 4 other players within a few steps of you, for half the damage. Spread out.' }),
  water: Object.freeze({ name: 'Water', status: 'Soak', icon: '/icons/ui/elem-water.webp',
    effect: 'Its hits soak you: for 4 seconds your stamina refills at 40% of its pace.' }),
  venom: Object.freeze({ name: 'Venom', status: 'Poison', icon: '/icons/ui/elem-venom.webp',
    effect: 'Its hits poison you: 5 more ticks, one a second, each about an eighth of the hit (never more than 8% of your max HP).' }),
  flora: Object.freeze({ name: 'Flora', status: 'Hold', icon: '/icons/ui/elem-flora.webp',
    effect: 'Its hits hold you where you stand for 0.7 seconds: no walking and no rolling. It cannot hold you again for 2 seconds.' }),
});

/* ═══ THE NINE PAGES ═══
   name / elder.name: what the world calls it (src/data/gameDisplay.js
   MONSTER_DISPLAY_NAMES, src/data/wheelStageLooks.js).  home: its land
   (src/data/zones.js names it).  look: the look it is drawn in, for its
   portrait and stage (src/data/codexStage.js).  dungeon: the Wheel dungeon
   whose waves are its land's monsters (server/src/wheeldungeon.js). */
export const CODEX_ENTRIES = Object.freeze({
  snowling: Object.freeze({
    name: 'Snowman', home: 'frost', look: 'snowman', element: 'frost',
    what: 'Slow, heavy and hard to put down. It can never catch you, so it does not try: from a few paces off it lobs snowballs, and up close it swings. The snowball takes almost a second to land, so a step aside is enough.',
    special: Object.freeze({
      name: 'Snow-Pile Burrow',
      text: 'The first time it drops to half its health it dives into the snow. For up to 3 seconds the pile creeps after you and cannot be hurt, and touching it hurts you, once a second. Then it bursts back out and stands there for a moment.',
      tip: 'Walk away from the pile and hit it as it climbs out, or face the pile with your shield up: it bonks off your shield, pops out early and stands dazed for over a second.',
    }),
    story: [
      'Nobody built the first snowman on Frost Ridge. The old prospectors swear a blizzard came down the mountain so thick it piled itself up into the shape of a man, looked around, and decided to stay.',
      'Every snowman since has been built by another snowman, which is why none of them have a nose: they keep eating the carrots. They hate exactly two things, summer and anyone warmer than they are, which is everyone.',
    ],
    elder: Object.freeze({ name: 'Glacier Snowman', text: 'Past the first pass the snow never thaws. The snowmen up there have frozen right through to the middle, blue as glacier ice and twice as stubborn.' }),
  }),
  gobling: Object.freeze({
    name: 'Fire Goblin', home: 'ember', look: 'fireGoblin', element: 'flame',
    what: 'Quick on its feet and quick to fall. It rushes you, pitching fireballs from a little way off, and as it chases you it leaves burning footprints behind it: standing in one hurts, and a shield does not help.',
    special: Object.freeze({
      name: 'The Lunge',
      text: 'Every so often it winds up for over a second, then lunges at you, as hard as a normal swing. No special attack takes longer to wind up: it is the one to practise your blocks on.',
      tip: 'When it winds up, raise your shield facing it or step to one side.',
    }),
    story: [
      'The goblins of the Flame Fields were miners once, digging for a stone that burned without wood. They found it. They lit it. They have been on fire ever since, and have decided they like it.',
      'A goblin\'s greatest shame is going out. They sleep in the hot ash, they bathe in the hot ash, and when two goblins meet they bump heads to swap a few sparks, which is either a greeting or a fight. Goblins are not sure either.',
    ],
    elder: Object.freeze({ name: 'Cinder Goblin', text: 'The goblins past the first pass have burned so long they have gone grey as charcoal. They still smoulder, and they are meaner for it.' }),
  }),
  mumling: Object.freeze({
    name: 'Mummy', home: 'sky', look: 'mummy', element: 'wind', dungeon: 'the Buried City',
    what: 'Slow, shuffling and wrapped up tight, until you hit it. The Wind Dunes\' mummies come in three kinds under the same old bandages: stalkers hit harder than the rest, and a hexer\'s hit curses you, so your own hits do 30% less for 4 seconds.',
    special: Object.freeze({
      name: 'Unwrapped',
      text: 'The first hit tears its bandages off, and a skeleton steps out of them, over four times as fast as the mummy was. The fight starts slow and ends quick.',
      tip: 'Get your footing before you strike: once it is bones, it will be on you in a moment.',
    }),
    story: [
      'Before the wind came, the Wind Dunes were a city, and the city had a rule: nobody leaves until the work is done. Then the sand buried it, the Buried City, and the work was never done.',
      'So the citizens are still at it, wrapped up for the long shift. They walk the dunes looking for whoever owes them a day\'s pay, and since the city\'s ledgers are under forty feet of sand, that is everybody.',
    ],
    elder: Object.freeze({ name: 'Gilded Mummy', text: 'Deeper in the dunes walk the city\'s nobles, still wrapped in gold leaf. Their bones, when they lose the wrappings, are gilded too.' }),
  }),
  pebbling: Object.freeze({
    name: 'Rock Monster', home: 'hollows', look: 'rockmonster', element: 'stone', dungeon: 'the Great Cave',
    what: 'A walking boulder: slow, tougher than most, and its hits land like a rockslide.',
    special: Object.freeze({
      name: 'Slam',
      text: 'It winds up for almost a second, then slams the ground: double damage to anyone in a ring around it. At most once every five seconds.',
      tip: 'When it winds up, step out of the ring, or face it with your shield raised.',
    }),
    story: [
      'The rock monsters are the Stone Hollows themselves: bits of cave wall that got up one day to see what all the digging was about, and never sat back down.',
      'They are not angry, exactly. They are just very, very old, and you are standing where they were going to put their foot. The biggest of them live in the Great Cave and have not been outside in a thousand years. They did not like it then either.',
    ],
    elder: Object.freeze({ name: 'Amethyst Golem', text: 'Past the first pass the hollows run with amethyst, and so do the monsters. Collectors would pay well for one, if anyone had ever brought one home in one piece.' }),
  }),
  sparklet: Object.freeze({
    name: 'Slime', home: 'thunder', look: 'fodder', element: 'storm', dungeon: 'the Foundry Dome',
    what: 'Bouncy and quick to anger. From a distance it spits globs of itself at you; up close it throws its whole self.',
    special: Object.freeze({
      name: 'The Lunge',
      text: 'Every so often it winds up for over a second, then lunges at you. Between lunges, a glob flies whenever you are a few steps away.',
      tip: 'Watch for the wind-up: shield up, or step aside.',
    }),
    story: [
      'The Electric Foundry was built to bottle lightning. The bottles leaked. What leaked out pooled on the floor, sat there humming for a while, and one morning got up and wobbled off on its own.',
      'The slimes hum when they are happy and crackle when they are not, and they are almost never happy. Foundry workers learned to keep their boots rubber-soled and their friends at arm\'s length, which is good advice anywhere near one.',
    ],
    elder: Object.freeze({ name: 'Storm Slime', text: 'Deeper in the foundry the slimes have soaked up so much charge they glow storm-blue. Stand close to a friend near one and you will both find out why.' }),
  }),
  finling: Object.freeze({
    name: 'Fishman', home: 'tidal', look: 'fishman', element: 'water',
    what: 'Slow out of the water, but tough and heavy-handed. It walks right up to you and hits hard.',
    special: Object.freeze({
      name: 'Slam',
      text: 'It winds up for almost a second, then slams down: double damage to anyone in a ring around it. At most once every five seconds.',
      tip: 'When it winds up, step back out of reach, or block facing it.',
    }),
    story: [
      'Fishmen came up out of the Water Caves\' deepest pools looking for the surface, found it, and were deeply unimpressed. Too dry. Too bright. Nothing to eat but you.',
      'They stayed anyway, mostly out of spite, and they have been trying to flood the caves back to how they like them ever since. Every one of them carries a bucket somewhere. Nobody has found where.',
    ],
    elder: Object.freeze({ name: 'Coral Fishman', text: 'The fishmen of the deep caves are crusted over with coral, orange and spiny. It is armour, it is fashion, and it is very hard to get off your boots.' }),
  }),
  wisplet: Object.freeze({
    name: 'Mire Wisp', home: 'mist', look: 'mireWisp', element: 'venom',
    what: 'A drifting blob of poisoned light. It spits venom from a distance and flings itself at you up close.',
    special: Object.freeze({
      name: 'The Lunge',
      text: 'Every so often it winds up for over a second, then lunges at you. Between lunges it spits a glob whenever you are a few steps away.',
      tip: 'Keep moving sideways: a glob aims where you were.',
    }),
    story: [
      'Travellers lost in the Poison Forest used to follow the little lights between the trees, hoping they were lanterns. They were not lanterns.',
      'Nobody knows what the wisps were first. The forest\'s oldest trees say they are the forest\'s own bad dreams, which would explain the smell.',
    ],
    elder: Object.freeze({ name: 'Spectral Wisp', text: 'Deeper in the forest the wisps burn a pale, see-through cyan, like ghosts of themselves. Their venom is just as real.' }),
  }),
  lurkling: Object.freeze({
    name: 'Bog Lurker', home: 'mist', look: 'bogLurker', element: 'venom',
    what: 'A fishman that stayed far too long in the poisoned bog. Slow and tough, and it hits hard.',
    special: Object.freeze({
      name: 'Slam',
      text: 'It winds up for almost a second, then slams down: double damage to anyone in a ring around it. At most once every five seconds.',
      tip: 'When it winds up, step back out of reach, or block facing it.',
    }),
    story: [
      'A lurker was a fishman once, out of the Water Caves and looking for wetter ground. It found the Poison Forest\'s bog, which was wet enough, and stayed until the bog moved in.',
      'They do not move much. They lie under the green water with only their eyes showing, waiting for someone to stop for a rest. If you have ever rested in the Poison Forest, there was one watching.',
    ],
    elder: Object.freeze({ name: 'Shade Lurker', text: 'The lurkers of the deep bog have gone violet and shadowy, hard to see even when you know where to look. Look anyway.' }),
  }),
  dewdrop: Object.freeze({
    name: 'Blue Slime', home: 'verdant', look: 'blueSlime', element: 'flora',
    what: 'Fast and fragile: it goes down quickly, spitting globs as it comes. But kill it and it does not simply die.',
    special: Object.freeze({
      name: 'Death Burst',
      text: 'When it dies it swells for a second and a half to three and a half times its size, where nothing can hurt it, then bursts: 60 damage to everyone near it, and it holds them in place. The burst is elemental, so your Resist cuts it.',
      tip: 'Land the killing blow and walk away while it swells. It cannot follow you.',
    }),
    story: [
      'Every morning the Verdant Wilds are covered in dew, and every morning a little of it does not dry. It gathers in the hollows of the leaves, rolls together, and by midday it is big enough to have opinions.',
      'Its opinion of you is low. A blue slime has nothing inside it but water and grudges, and when it pops it makes very sure you are close enough to share both.',
    ],
    elder: Object.freeze({ name: 'Jade Slime', text: 'Past the first pass the slimes are a deep jade green and the dew they are made of is older. The burst is the same. Walk away anyway.' }),
  }),
});

/** A kind's page, or null. */
export function codexEntry(kind) {
  return typeof kind === 'string' && Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null;
}
