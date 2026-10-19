/* ═══ v2.3.3498: THE SOUND STUDIO'S CATALOGUE -- WHERE EVERY SOUND PLAYS ═══
 *
 * The owner, after a playtest: "I think sounds were wired in the wrong
 * places.  The labels should tell you where they go.  Might need to build a
 * quick studio to show which sounds belong where."  The studio
 * (ui/panels/SoundStudio.jsx, the Test panel's "Sound studio") lists every
 * sound the game makes, under the moment it plays at, in plain words, with a
 * play button -- played through the game's own BT_AUDIO, so it is what the
 * game plays -- and which recording each one is made of, so a sound in the
 * wrong place can be found and named.
 *
 * This file is only WHAT each sound is called and where it belongs; nothing
 * here plays.  It is plain data so the sound suite can read it in Node:
 * server/test/sound-cues.test.mjs §12 fails for a cue in data/eventSounds.js,
 * or a key of BT_AUDIO's HIT_VOICES, PROP_SOUNDS, SHOT_SOUNDS, ELEM_SOUNDS
 * or MONSTER_NOISE_CLIPS, that has no line here -- a new sound gets its label
 * in the same change -- and for a line here naming a sound that is gone.
 *
 * Labels say WHEN, in the player's words ("Your bow shot", "A snowman
 * throwing a snowball"), never the code's. */

/* The studio's sections, in its order: [id, title, what is in it]. */
export const STUDIO_SECTIONS = [
  ['fight', 'Fighting', 'Your weapons, your shield and your dodges'],
  ['hits', 'Your hits', 'What a hit sounds like, by what it lands on'],
  ['hurt', 'Getting hurt', 'Blows on you, statuses, low health, dying'],
  ['move', 'Moving', 'Footsteps, jumping, sprinting, swimming'],
  ['monsters', 'Monsters', 'Their noises, throws, attacks, deaths and the bosses'],
  ['world', 'The world', 'Dungeons, doors, buildings and things you can break'],
  ['gather', 'Gathering and the farm', 'Chopping, mining, fishing, fires, cooking, crops'],
  ['craft', 'Crafting', 'The Blacksmith, the Woodworker, the Gem Works, the Cookhouse'],
  ['loot', 'Loot, quests and trading', 'Pickups, the reveal, quests, shops, the auction house, the Gambling Den'],
  ['players', 'Other players', "Duels, the arena, No man's land, alliances, sparring"],
  ['social', 'Chat, emotes and the townsfolk', 'Chat, invites, the moves, the townsfolk talking'],
  ['pets', 'Pets and traps', 'Your pet and its ward'],
  ['you', 'You', 'Eating, drinking, points, levels'],
];

/* Every cue in data/eventSounds.js EVENT_SOUNDS: [section, where it plays]. */
export const CUE_PLACES = {
  shieldBlock: ['fight', "A monster's blow landing on your raised shield"],
  shieldBall: ['fight', "A monster's ball (snowball, fireball, goo) breaking on your raised shield"],
  shieldUp: ['fight', 'Raising your shield'],
  shieldDown: ['fight', 'Lowering your shield'],
  dodged: ['fight', "A monster's blow that misses you: you dodged it"],
  dodgeRoll: ['fight', 'Your dodge roll'],
  crit: ['fight', 'A critical hit (over the hit\'s own sound)'],
  parry: ['fight', 'Parrying a blow with your shield'],
  bowLoose: ['fight', 'Your bow shot: each arrow as it leaves the bow (another player\'s, quieter)'],
  staffSpecial: ['fight', "Your staff's special: the big bolt"],
  burstCast: ['fight', 'Your Element Burst: the cast'],
  burstNova: ['fight', 'Your Element Burst: the blast going off'],
  collision: ['fight', 'Two elements colliding on a monster (a combo)'],
  discovery: ['fight', 'Something found for the first time: a new element combo, a new Codex page'],
  swapSword: ['fight', 'Switching to your sword'],
  swapBow: ['fight', 'Switching to your bow'],
  swapStaff: ['fight', 'Switching to your staff'],

  jumpUp: ['move', 'Your jump: the push-off'],
  jumpLand: ['move', 'Landing from a jump'],
  sprintOut: ['move', 'Your sprint running out of stamina (one time the grunt, worn out...)'],
  sprintOutBreath: ['move', '...the next time the tired breath'],
  statusEnd: ['hurt', 'A chill, burn or poison on you wearing off'],
  respawn: ['hurt', 'Standing up again after a death'],

  pvpKill: ['players', 'You knocking out another player'],
  duelWin: ['players', 'Winning a duel'],
  duelLose: ['players', 'Losing a duel'],
  duelStart: ['players', 'A duel starting'],
  arenaStart: ['players', 'An arena match starting (the war horn)'],
  champion: ['players', "Becoming the arena's champion"],
  nmlEnter: ['players', "Crossing into No man's land"],
  nmlSkull: ['players', "A skull put on you in No man's land"],
  nmlLoss: ['players', "What a death in No man's land took from you"],
  nmlTake: ['players', "What your kill in No man's land took from them"],
  sparDown: ['players', 'Sparring: a clone knocking you down, or you knocking one down'],
  sparWin: ['players', 'Sparring: winning the round'],
  rollWin: ['loot', "A kill's roll landing on a drop (the gold number over the monster)"],

  throwSnow: ['monsters', 'A snowman throwing a snowball'],
  throwFire: ['monsters', 'A fire goblin throwing a fireball'],
  throwGoo: ['monsters', 'A slime throwing a goo glob'],
  windSlam: ['monsters', 'A monster winding up a slam'],
  windLunge: ['monsters', 'A monster winding up a lunge'],
  slamHit: ['monsters', "A monster's slam hitting the ground"],
  lungeMiss: ['monsters', "A monster's lunge that hits nobody"],
  blueSwell: ['monsters', 'The Blue Slime swelling up to burst'],
  blueBurst: ['monsters', 'The Blue Slime bursting'],
  burrow: ['monsters', 'A snowman digging into its snow pile'],
  emerge: ['monsters', 'A snowman bursting out of its snow pile'],
  dieGoblin: ['monsters', 'A fire goblin dying'],
  dieRock: ['monsters', 'A rock monster or a thorn shambler dying'],
  dieFish: ['monsters', 'A fishman dying'],
  dieLurker: ['monsters', 'A bog lurker dying'],
  respawnSlime: ['monsters', 'A slime coming back to life'],
  respawnOther: ['monsters', 'Any other monster coming back to life'],
  unwrap: ['monsters', "A mummy's wrappings whipping off (the skeleton inside)"],
  bossArrive: ['monsters', 'A dungeon boss arriving (the roar)'],
  bossWarn: ['monsters', "A dungeon boss's warning before a big attack"],
  bossSlam: ['monsters', "A dungeon boss's slam"],
  bossCharge: ['monsters', 'A dungeon boss charging'],
  bossEnrage: ['monsters', 'A dungeon boss enraged'],
  bossSummon: ['monsters', 'A dungeon boss summoning helpers'],
  bossSiphon: ['monsters', 'A dungeon boss draining life'],

  dungeonIn: ['world', 'Entering a dungeon'],
  dungeonWave: ['world', 'A dungeon wave coming in (the war horn)'],
  dungeonClear: ['world', '"Dungeon cleared!"'],
  dungeonOut: ['world', 'Leaving a dungeon'],
  door: ['world', 'Going in through a building\'s door'],
  landCross: ['world', 'Crossing into a land (under its banner)'],
  fireStrike: ['gather', 'Lighting a campfire: the flint strikes'],
  campfire: ['gather', 'Lighting a campfire: the fire catching'],
  gatherReady: ['gather', 'A harvest\'s moment to swipe: the gesture\'s window opening'],
  fireCatch: ['world', 'A building you keep hitting catching fire'],
  mended: ['world', 'A broken object mending itself'],
  signpost: ['world', "A town signpost's boards popping up"],
  lootDrop: ['loot', 'Loot landing on the ground'],
  cropRipe: ['gather', 'A crop ripening on your farm'],
  petWard: ['pets', "Your pet's ward softening an element's hit on you"],

  smelt: ['craft', 'Bars smelted at the Blacksmith'],
  forge: ['craft', 'A weapon forged at the Blacksmith'],
  forgeFail: ['craft', 'The Blacksmith refusing a forge (not enough bars, gold or level)'],
  armourForge: ['craft', 'Armour forged at the Blacksmith (a torso or greaves)'],
  hardenOk: ['craft', 'A hardening that worked'],
  hardenFail: ['craft', 'A hardening that failed'],
  woodwork: ['craft', 'A bow or a staff made at the Woodworker'],
  treeFelled: ['gather', 'The last chop: the tree you are cutting coming down'],
  hardWood: ['craft', 'Hardened wood made at the Woodworker'],
  trapsMade: ['craft', 'Box traps made at the Woodworker'],
  gemCut: ['craft', 'A gem cut at the Gem Works'],
  gemShatter: ['craft', 'A gem shattering as it is cut'],
  gemSet: ['craft', 'A gem set into a weapon or a shield'],
  salvage: ['craft', 'Salvaging a piece at the Blacksmith'],
  cookDone: ['craft', 'A dish cooked at the Cookhouse'],
  cookStart: ['players', 'Another player starting to cook'],

  pickGear: ['loot', 'Picking up armour, a weapon or a remnant'],
  pickShard: ['loot', 'Picking up a shard'],
  pickGem: ['loot', 'Picking up a gem'],
  revealTick: ['loot', 'The Rare / Elite / Godly reveal: each grade flicking past'],
  revealStage: ['loot', 'The reveal: a stage landing'],
  revealRare: ['loot', 'The reveal landing on Rare'],
  revealElite: ['loot', 'The reveal landing on Elite'],
  revealGodly: ['loot', 'The reveal landing on Godly'],
  questAccept: ['loot', 'Taking a quest'],
  questReady: ['loot', 'A quest\'s tasks done ("Return to ...")'],
  shopBuy: ['loot', 'Buying from a shop'],
  marketList: ['loot', 'Listing something on the auction house'],
  marketBuy: ['loot', 'Buying on the auction house'],
  marketBid: ['loot', 'Bidding on the auction house'],
  marketSold: ['loot', 'Your auction selling'],
  tradeDone: ['loot', 'A trade completed'],
  tradeOff: ['loot', 'A trade called off'],
  diceRoll: ['social', '/roll in the chat'],
  coinToss: ['social', '/flip in the chat'],
  spinTick: ['loot', "The Daily Spin's wheel ticking past each slice"],
  allianceUp: ['players', 'Your party becoming an alliance'],
  allianceWar: ['players', 'A war declared between alliances (the war horn)'],
  farmHarvest: ['gather', 'Pulling a crop from its bed on your farm'],
  betIn: ['loot', "A wager put down (the Gambling Den's pot, an arena stake)"],
  betWon: ['loot', 'A wager won'],
  betLost: ['loot', 'A wager lost'],
  jackpotWin: ['loot', 'Winning the weekly jackpot'],
  guildQuest: ['loot', "A guild's rank quest turned in"],
  warWon: ['players', "Your alliance's war won"],
  warLost: ['players', "Your alliance's war lost"],
  arenaJoin: ['players', 'Signing up for the arena'],
  petOut: ['pets', 'Taking your pet out'],
  petAway: ['pets', 'Putting your pet away'],
  petFree: ['pets', 'Releasing your pet to the wild'],
  rested: ['gather', "A night in your farm's bed"],
  duelAsk: ['players', 'A duel challenge for you'],
  tradeAsk: ['social', 'Someone asking to trade with you'],
  anvil: ['world', "The Blacksmith's forge at work, heard near his building in town"],

  emotePop: ['social', "An emote's emoji popping up over a head"],
  slap: ['social', 'The Facepalm move'],
  sitDown: ['social', 'The Sit move'],
  flop: ['social', 'The Flop move'],
  flexShine: ['social', 'The Flex move'],
  cheerPop: ['social', 'The Cheer move'],
  bagIn: ['gather', 'A harvest\'s prize landing in your bag'],

  hurtA: ['hurt', 'Your hurt grunt when a blow lands on you (one of two)'],
  hurtB: ['hurt', 'Your hurt grunt when a blow lands on you (the other)'],
  heartbeat: ['hurt', 'Your heartbeat while your health is low'],
  munch: ['you', 'Eating (Quick Eat, the bag\'s Eat, the Cookhouse)'],
  gulp: ['you', 'Drinking a brew'],
  chatPop: ['social', 'A chat line coming in'],
  chatSent: ['social', 'Your chat line going out'],
  notify: ['social', "Something for you: mail, an invite, a friend's message, an announcement"],
  denied: ['you', 'A "no": not enough mana, gold or level, locked, and the like'],
  laugh: ['social', 'The Laugh move'],
  snore: ['social', 'The Sleep move (and again while asleep)'],
  npcVoice0: ['social', 'A townsperson\'s voice: opening a talk, or their line popping up (hum 1)'],
  npcVoice1: ['social', 'A townsperson\'s voice (hum 2)'],
  npcVoice2: ['social', 'A townsperson\'s voice (hum 3)'],
  npcVoice3: ['social', 'A townsperson\'s voice (hum 4)'],
  npcVoice4: ['social', 'A townsperson\'s voice (hum 5)'],
  pointsSpent: ['you', 'Points spent in the Points window'],
  peerShield: ['players', 'Another player raising their shield'],
  peerCast: ['players', 'Another player casting a fishing line'],
};

/* BT_AUDIO.HIT_VOICES (data/gameDisplay.js): a hit, by what it lands on --
   every weapon's (data/monsterVariants.js hitSoundOf picks it by monster). */
export const HIT_VOICE_PLACES = {
  flesh: 'Your hit on another player or a townsperson (flesh)',
  bone: 'Your hit on a skeleton or a mummy (bone)',
  goo: 'Your hit on a slime or a mire wisp (goo)',
  ember: 'Your hit on a fire goblin (ember)',
  stone: 'Your hit on a rock monster or a thorn shambler (stone)',
  snow: 'Your hit on a snowman (snow)',
  mud: 'Your hit on a bog lurker (mud)',
  wet: 'Your hit on a fishman (wet)',
};

/* BT_AUDIO.PROP_SOUNDS: hitting and breaking the Wheel's objects, by what
   they are made of (data/wheelMaterials.js); each its what-it-is words. */
export const PROP_PLACES = {
  wood: 'something wooden: a fence, crate, barrel, bench, a tree\'s trunk',
  stone: 'something of stone: a rock, a wall, a stone building',
  metal: 'something of metal: a lamp post, a mine cart, scrap, a pylon',
  leaf: 'a bush',
  plant: 'a cactus or a giant flower',
  mushroom: 'a toadstool',
  straw: 'hay, a haystack or a scarecrow',
  snow: 'something of snow (none in the Wheel yet)',
  ice: 'an ice spire',
  crystal: 'a crystal or obsidian',
  coal: 'a lump of coal',
};
/* ...and what each of a material's sounds is: [PROP_SOUNDS row, label]. */
export const PROP_KINDS = [
  ['hit', 'Hitting %s'],
  ['big', 'Hitting a big one: %s (a big tree, a building)'],
  ['brk', 'Breaking %s'],
  ['tree', 'A tree you broke falling: %s'],
  ['building', 'A building collapsing: %s'],
];

/* BT_AUDIO.SHOT_SOUNDS: a monster's ball breaking -- on you, on your shield
   (quieter) or on the ground (quieter still). */
export const SHOT_PLACES = {
  snowball: "A snowman's snowball breaking on you",
  fire: "A fire goblin's fireball breaking on you",
  goo: "A slime's goo glob breaking on you",
};

/* BT_AUDIO.ELEM_SOUNDS: a monster's element taking hold of you
   (game/elemHits.js), and a gem's on another player. */
export const ELEM_PLACES = {
  chill: 'Chilled by a frost monster\'s hit (slowed)',
  burn: 'Set burning by an ember monster\'s hit',
  burnTick: 'Each tick of a burn on you',
  gust: 'Shoved away by a wind monster\'s gust',
  stuck: 'Held in place by a flora monster\'s hit',
  daze: 'Dazed by a rock monster\'s hit',
  shock: 'Shocked by a storm slime\'s hit',
  shockTick: 'The shock arcing on to a player near you',
  soak: 'Soaked by a fishman (stamina refills slower)',
  poison: 'Poisoned by a wisp or a lurker',
  poisonTick: 'Each tick of poison on you',
  slow: 'Slowed (a gem\'s frost, between players)',
  fracture: 'Fractured (a gem\'s stone, between players)',
  thorn: 'Thorns (a gem\'s flora, between players)',
  thornTick: 'Each prick the thorns give back',
};

/* MONSTER_NOISE_CLIPS (data/monsterNoiseClips.js): a monster's own noise as
   it notices you, now and then while it chases you, and as a mummy sheds. */
export const NOISE_PLACES = {
  'goblin-rawr': 'A fire goblin noticing you, or chasing you (rawr)',
  'skeleton-rattle': "A skeleton's rattling bones (a mummy shedding its wrappings)",
  'slime-bounce': 'A slime noticing you, or chasing you (jelly bounce)',
  'snowman-snarl': 'A snowman noticing you, or chasing you (snarl)',
};

/* BT_AUDIO.footstep: one step, by the ground drawn under your boots
   (data/footstepClips.js) -- the Wheel's grounds; dirt everywhere else. */
export const STEP_PLACES = {
  dirt: 'A step on dirt (the Wheel\'s dirt, the farm, the dungeons)',
  grass: 'A step on grass (and the forest floor)',
  gravel: 'A step on gravel',
  stone: 'A step on stone',
  sand: 'A step on sand',
  snow: 'A step on snow',
  ice: 'A step on ice',
  mud: 'A step in mud',
  ash: 'A step on ash',
  wood: 'A step on wooden planks (a bridge, a boardwalk)',
  metal: 'A step on metal',
};

/* The rest: BT_AUDIO's own helpers, and the sounds the game plays straight
   from a recording.  [id, section, where it plays, how to play it]: `fn` a
   BT_AUDIO function and its arguments, `sample` a recording and play()'s
   options as the game passes them. */
export const OTHER_PLAYS = [
  ['swing', 'fight', 'Your sword swing (the whoosh)', { fn: 'swordSwing', args: ['sword-swing', { vol: 0.6 }] }],
  ['swipe', 'fight', "Your sword's special swipe", { fn: 'specialSwipe', args: [{ vol: 0.6 }] }],
  ['arrowHit', 'hits', 'Your arrow hitting a monster', { sample: 'arrow-hit', opts: { vol: 0.6 } }],
  ['magicHit', 'hits', 'Your staff bolt hitting a monster', { fn: 'magicHit', args: [{ vol: 0.6 }] }],
  ['staffCast', 'fight', 'Your staff casting a bolt', { sample: 'magic-cast', opts: { vol: 0.55 } }],
  ['whirl', 'fight', 'Your whirlwind', { sample: 'whirlwind', opts: { vol: 0.9 } }],
  ['bash', 'fight', 'Your shield bash', { sample: 'shield-bash', opts: { vol: 0.9 } }],
  ['retreat', 'fight', 'Your retreat shot (the bow, after a dodge)', { sample: 'arrow-fly', opts: { vol: 0.7 } }],
  ['blockOld', 'fight', 'A block on your shield (a blow you see coming, a ball on your guard)', { sample: 'shield-block', opts: { vol: 1.0 } }],
  ['heroArmour', 'hurt', "A monster's blow on you, in armour (the clang)", { fn: 'monsterHitHero', args: [true, { vol: 0.6 }] }],
  ['heroBare', 'hurt', "A monster's blow on you, with no armour", { fn: 'monsterHitHero', args: [false, { vol: 0.6 }] }],
  ['playerDeath', 'hurt', 'Your death', { fn: 'playerDeath', args: [] }],
  ['sprint', 'move', 'Your sprint starting: the effort grunt (another player\'s, quieter)', { fn: 'sprintPush', args: [] }],
  ['swimStroke', 'move', 'A swimming stroke', { fn: 'swimStroke', args: [] }],
  ['swimIn', 'move', 'Getting into the water', { fn: 'swimSplash', args: ['in'] }],
  ['swimOut', 'move', 'Climbing out of the water', { fn: 'swimSplash', args: ['out'] }],
  ['dieSnowman', 'monsters', 'A snowman dying', { fn: 'monsterDeath', args: ['snowman'] }],
  ['dieSkeleton', 'monsters', 'A skeleton dying', { fn: 'monsterDeath', args: ['skeleton'] }],
  ['dieSlime', 'monsters', 'A slime dying (the splat)', { sample: 'slime-death', opts: { vol: 0.425 } }],
  ['dieOther', 'monsters', 'Any other monster dying (a mummy, a wisp...)', { fn: 'monsterDeath', args: ['mummy'] }],
  ['chop', 'gather', 'Your axe chopping a tree', { sample: 'axe-chop', opts: { offset: 1.10, duration: 0.5, vol: 0.6 } }],
  ['mine', 'gather', 'Your pickaxe striking a rock', { sample: 'mine-strike', opts: { offset: 0.6, duration: 0.45, vol: 0.55 } }],
  ['oreCrack', 'gather', 'A rock you mined cracking apart', { sample: 'ore-crack', opts: { vol: 0.72, pitchVar: 0.06 } }],
  ['oreRubble', 'gather', '...and its pieces landing', { fn: 'propBreak', args: ['stone', 'small', { vol: 0.32 }] }],
  ['cast', 'gather', 'Casting your fishing line', { sample: 'lure-drop', opts: { vol: 0.6 } }],
  ['bite', 'gather', 'A fish biting', { sample: 'fish-on-hook', opts: { vol: 0.65 } }],
  ['catch', 'gather', 'Landing a fish', { sample: 'catch-splash', opts: { vol: 0.65 } }],
  ['cooked', 'gather', 'A fish cooked at a campfire', { sample: 'cook-success', opts: { vol: 0.6 } }],
  ['coins', 'loot', 'Gold coming in: a sale, a credit, a prize', { sample: 'coin-pickup', opts: { vol: 0.45 } }],
  ['questDone', 'loot', 'Turning in a quest', { sample: 'quest-complete-v2', opts: { vol: 0.9 } }],
  ['levelUp', 'you', 'Levelling up', { sample: 'level-up', opts: { vol: 0.55, pitchVar: 0 } }],
  ['flipWin', 'loot', "Ace's coin flip: a win", { sample: 'flip-win', opts: { vol: 0.5, duration: 1.6 } }],
  ['flipLose', 'loot', "Ace's coin flip: a loss", { sample: 'flip-lose', opts: { vol: 0.5, duration: 0.7 } }],
  ['chestLid', 'loot', 'A chest opening (the lid, a sparkle)', { sample: 'wood-chop', opts: { vol: 0.32, rate: 1.18 } }],
  ['uiClick', 'you', 'The menu click: any button', { fn: 'uiClickNow', args: [] }],
  ['uiEquip', 'you', 'Putting gear on or taking it off', { fn: 'uiEquip', args: [] }],
  ['uiClose', 'you', 'A window closing', { fn: 'uiTick', args: ['ui-close', 0.5] }],
];

/* The owner's own recordings (CREDITS.md): what each file was when it came,
   so a sound can be traced to the recording it is cut from. */
export const SAMPLE_SOURCES = {
  'sprint-grunt': '"Angry Grunt" (freesound_community 103204)',
  'sprint-breath': '"Out of Breath Male" (voicebosch 176715)',
  'hurt-1': '"Male Hurt 7" (freesound_community 48124)',
  'hurt-2': '"Grunt 1" (freesound_community 85280)',
  heartbeat: '"Thudding Heartbeat" (dragon-studio 372487)',
  munch: '"Eating Chocolate" (freesound_community 67566)',
  gulp: '"Gulping Noises" (freesound_community 37758)',
  'chat-pop': '"New Message Pop" (virtual_vibes 464675)',
  chime: '"New Notification 010" (universfield 352755)',
  denied: '"Error Notification 05" (universfield 199276)',
  'points-spent': '"Cute Level Up 1" (floraphonic 189852)',
  laugh: '"Laugh Like Crazy" (chieuk 257881)',
  snore: '"Funny Snore" (universfield 250959)',
  'war-horn': '"War Horn and Drums" (soundmarker33 512545)',
  'boss-roar': '"Epic Dragon Roar" (dragon-studio 364481)',
  explosion: '"Loud Explosion" (dragon-studio 425457)',
  'npc-voices': '"Hmm Ahh" (freesound_community 6426)',
  'swim-splash': '"Water Splash" (universfield 229315)',
  'noise-goblin-rawr': '"Growl and Roar" (freesound_community 102417)',
  'noise-skeleton-rattle': '"Rattling Bones" (freesound_community 105394)',
  'noise-slime-bounce': '"Bouncy Jelly Creature Movement" (yodguard 387892)',
  'noise-snowman-snarl': '"Beast Snarling" (freesound_community 82801)',
  'coin-flip': '"Coinflic1" (freesound_community 103339)',
  'coin-pickup': '"Spilled Coins" (freesound_community 101296)',
  'flip-win': '"Marimba Win F 2" (floraphonic 209688)',
  'flip-lose': '"Classic Game Action Negative 4" (floraphonic 224418)',
  'ui-click': '"Mouse Click" (matthewvakaliuk73627 290204)',
  'ui-equip': '"Item Equip" (freesound_community 6904)',
};
