/* ═══ v2.3.5102: THE SYSTEM MAP (grand plan step 5.2, card B PR 3) ═══
 *
 * The game's files, sorted into systems.  A system has: its files, its spec
 * (docs/specs/), its traps (docs/TRAPS.md, by card I's census), its tests
 * (server/test/ suites and phone scenarios), its doors (the one function a
 * kind of change goes through) and its switches (live flags).  docs/SYSTEMS.md
 * is MADE from this table (`node tools/guards/systems.test.mjs --write`), and
 * tools/guards/systems.test.mjs holds it:
 *
 *   - every file under src/ and server/src/ is in ONE system, or in
 *     `unsorted`; a file two systems claim fails;
 *   - `unsorted` only falls (UNSORTED_LINE below; rule 3: a census, made
 *     strict by the gatekeeper alone);
 *   - a door's file is in its system and holds the door's name;
 *   - the page is what this table makes.
 *
 * HOW A FILE IS PLACED.  A system lists `files`: regular expressions over the
 * path from the repository's root.  A file that matches two systems' `files`
 * is a fault.  A system may also list `rest`: the files of a folder that no
 * system's `files` claims (src/rendering/ is `render` except what `look`,
 * `memory`, `preload` or `art` claim).  A file matched by no `files` and no
 * `rest` is `unsorted`.  src/game/ and server/src/ have no `rest`: a new file
 * there is unsorted until somebody gives it a system.
 *
 * THE NAMES are short and in the code's words (a folder's, a door's), and
 * follow card I's traps census where it had one (its "System" column).  Cards
 * U (the state ledger), V (traps into guards), M and T (the switch table)
 * read them: rename one only with them.
 *
 * TESTS AND SPECS are found by a system's `words`: a suite, scenario or spec
 * whose file name holds one of them.  A starting point, not a ruling: a name
 * can sit in two systems' lists; the helper that finds a system's files for a
 * test is PR 4's (step 5.2b).
 *
 * SWITCHES.  The switch table is card T's (tools/guards/lib/switches.mjs):
 * a system's switches are the table's rows with its `system`, read from the
 * table (v2.3.5303, card T PR 3), never typed here again
 * (`node tools/guards/switches.test.mjs --list <system>` prints them).
 * docs/SYSTEMS.md links to the system's section of docs/SWITCHES.md and
 * lists no names: a list there would change, and conflict, with every
 * switch added anywhere (the gatekeeper's sitting 9).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SWITCHES } from './switches.mjs';   /* v2.3.5303: a system's switches are the switch table's rows (card T) */

const re = (s) => new RegExp(s);
/* a basename under a folder: f('server/src', 'gold|bag') */
const f = (dir, names) => {
  const r = re('^' + dir.replace(/\//g, '\\/') + '\\/(?:' + names + ')\\.(?:js|jsx|mjs|json)$');
  r.named = { dir, names: names.split('|') };   /* the guard checks each name is a file */
  return r;
};

export const SYSTEMS = Object.freeze({
  wire: {
    what: 'the socket and the messages: the router, the relay, the client\'s connection and its event switch, what each side can do (caps)',
    /* v2.3.5061 (card N): server/src/wire/, the wire table (one row a message or route) */
    files: [f('server/src', 'index|relay|bundle|clientoff|flood'), re('^server/src/wire/'), re('^src/networking/'), f('src/game', 'clientOff|clientOffApply|blockedAsks|workerClock|t1Sync|tooFar|thawCarried'),
      f('src/game', 'actions|connectionDoor'),   /* v2.3.5528: + the connection door (card L); v2.3.5185 (card K): the action door, the one way a request leaves the page */
      f('server/src', 'heapforget|reqonce|gidnames|send|words'),   /* v2.3.5544 (card K, RT-1 N11): the room forgets who left; v2.3.5194: a repeat acts once; v2.3.5193: the send door; v2.3.5197: the words rule */
    ],
    words: ['wire', 'protocol', 'relay', 'caps', 'bundle', 'privileged', 'clientoff', 'flood', 'heap-forget', 'req-once', 'gid-names', 'send-door', 'words-rule'],
    traps: ['wire'],
    doors: [
      /* v2.3.5184 (the gatekeeper, sitting 13): the two lists are made from the wire table now (lists.js, card K PR 1) */
      { name: 'PRIVILEGED_EVENTS', file: 'server/src/wire/lists.js', what: 'every type the server sends (every out row of the wire table); anything else a client could forge' },
      { name: 'RELAY_TYPES', file: 'server/src/wire/lists.js', what: 'RELAY.TYPES: the relays a phone may send (every relay row), rebuilt in its name' },
      { name: 'wireDoorJudge', file: 'server/src/wire/door.js', what: 'the wire door: the table\'s checks on every message and the room\'s routes, before any handler (v2.3.5184)' },
      { name: 'act', file: 'src/game/actions.js', what: 'ACTIONS: the one way a request leaves the page, and its request id (v2.3.5185)' },
    ],
  },
  session: {
    what: 'a sitting: the join, leaving, lingering, the rejoin and what it re-sends',
    files: [f('server/src', 'join|leave|linger|lastplace|pacekeep|rejoinresend|nearjoin|presence2|actor|sitting|playtrace'),   /* v2.3.6480: actor.js, who is acting (card WHO); v2.3.6481: sitting.js, the sitting's card; v2.3.6482: playtrace.js, the owner's play recorded */ f('src/game', 'rejoinSlots|resumeListeners|quietPhone|nearJoin|presence2|stateCleanup')],
    words: ['join', 'leave', 'linger', 'rejoin', 'reconnect', 'presence', 'session', 'quiet-phone', 'quietphone'],
    traps: [],
    doors: [
      { name: '_playerLeaves', file: 'server/src/leave.js', what: 'LEAVE_WAYS: the one way a session leaves' },
      { name: 'REJOIN_SLOTS', file: 'src/game/rejoinSlots.js', what: 'what the phone clears at state_sync, with the worker\'s re-send' },
    ],
  },
  identity: {
    what: 'who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket',
    files: [f('server/src', 'account|devicelock|loginkeys|verify|broverify|origin|httpauth|charname'), f('src/game', 'tabIdentity|characterRecord|charName'), re('^src/ui/account/')],   /* v2.3.5622: + charname, charName (card MOD) */
    words: ['account', 'login', 'devicelock', 'device-lock', 'identity', 'origin', 'verify', 'turnstile'],
    traps: ['identity'],
    doors: [],
  },
  bots: {
    what: 'telling a person from a script: bot signals, fingerprints, claims that are bounded',
    files: [f('server/src', 'botfp|botsig|botstats|charwatch|hitproof|moveclaims|swordswing|bowshot|harvestgrade')],   /* v2.3.5548: the sword's swing, a bounded claim; v2.3.5550: a bow's claim an arrow seen; v2.3.5900: the harvest's grade judged */
    words: ['bot', 'antibot', 'anticheat', 'charwatch', 'hitproof', 'moveclaim'],
    traps: [],
    doors: [],
  },
  liveops: {
    what: 'the live flags, the admin and dev levers, test mode, feedback',
    files: [f('server/src', 'liveops|admin|devtools|testmode|feedback|usagemeter'), f('src/game', 'testMode|switches|ownerSwitches|feedbackOwner|silenceOwner|renameOwner|adminKeyStore|usageMeter'),   /* v2.3.5602: ownerSwitches; v2.3.5603: feedbackOwner; v2.3.5605: silenceOwner; v2.3.5611: renameOwner (card OPS); v2.3.5718: adminKeyStore (card SEC); v2.3.6001: usagemeter, usageMeter (card CS) */
      f('server/src', 'restore'),   /* v2.3.5288 (card R): the room's way back, the owner's lever */
      f('server/src', 'playerrestore'),   /* v2.3.5285 (card R): one player's restore, the owner's lever */
    ],
    words: ['liveops', 'admin', 'devtools', 'test-mode', 'testmode', 'feedback', 'flags'],
    traps: ['liveops'],
    doors: [
      { name: 'flagNameOk', file: 'server/src/liveops.js', what: 'the names a live flag (a kill switch) may take' },
      { name: '_testMode', file: 'server/src/testmode.js', what: 'the one question an honesty check asks' },
    ],
  },
  'server-core': {
    what: 'the worker\'s spine: saving, migrations, the tick, its pace, hidden settings, the room\'s own row',
    files: [f('server/src', 'persistence|migrations|tick|tickpace|cadence|data|grids|heapburn|hidden|daybook|storagemarks|roomrow')],
    words: ['persistence', 'migration', 'tick', 'storage', 'save', 'hidden', 'cost-guard', 'costguard', 'daybook', 'roomrow'],
    traps: ['server-core'],
    doors: [
      { name: 'HIDDEN_SPEC', file: 'server/src/hidden.js', what: 'a server-only number a copier would value' },
      { name: 'bookAdd', file: 'server/src/daybook.js', what: 'the day\'s book (`daybook:`): every part adds through it (v2.3.5080, card E)' },
    ],
  },
  /* v2.3.5601 (card OPS): the room under a crowd and the watch on it.  Its
     own system so a switch of it runs its own suites in the switches-thrown
     guard: server-core's and liveops' include suites that fail under the
     guard's preload with any flag (tick-pace, cold-flags; card T's Found). */
  ops: {
    what: 'the room under a crowd and the watch on it: its health for a monitor, the waiting crowd\'s pace, a seat held, the public boards\' and the room\'s public reads, a guest\'s join',
    files: [f('server/src', 'health|rfspread|seathold|publicreads|guestlazy')],   /* v2.3.5609: publicreads; v2.3.5610: guestlazy */
    words: ['room-health', 'rf-spread', 'seat-hold', 'board-cache', 'public-reads', 'guest-lazy', 'owner-pages'],   /* v2.3.5608: board-cache (leaderboard.js stays social's file); v2.3.5607: owner-pages (the reads stay their systems' files) */
    traps: [],
    doors: [],
  },
  combat: {
    what: 'hitting and being hit: weapons, abilities, the bow, shields, damage, PvP',
    files: [f('src/rendering/tables', 'combat') /* v2.3.5345: its hand-tuned tables (card M) */,
      f('server/src', 'combat|hits|abilities|accuracy|burst|freeswing|fightlock|killroll|threat|telegraph|elemental|oneformula|statcap|arrowblast|swordconvert|shieldwear|shieldgem|weapongem|amulet|pvpbalance|pvpextras|pvplunge'),
      f('src/game', 'abilities|accuracy|combatHelpers|manualCombat|targeting|projectiles|bowDraw|bowFeel|bowVolley|swordFeel|staffFeel|weaponFeel|deathBlow|dodge|elemHits|elemWindup|killRoll|killXp|pvpSwing|shieldCopies|shieldGem|shieldToggle|guardDoor|shieldWear|arrowEdge|whirlCatch|deskShield|weaponGem|weaponSlots|amuletGem|apChip|peerShots|shotGround|shockSpark|stormSparks|waterAttack'),
    ],
    words: ['combat', 'hit', 'ability', 'abilit', 'bow', 'arrow', 'sword', 'staff', 'shield', 'weapon', 'pvp', 'damage', 'whirl', 'dodge', 'elemental', 'accuracy'],
    traps: ['combat'],
    doors: [{ name: '_monsterHit', file: 'server/src/hits.js', what: 'MONSTER_HITS: every monster hit on a player' }],
  },
  monsters: {
    what: 'the monsters\' lives, moves, status, spawns and the boss',
    files: [f('src/rendering/tables', 'monsters') /* v2.3.5345: its hand-tuned tables (card M) */,
      f('server/src', 'monsterlife|monstermoves|monsterstatus|slimeboss|spawnscale|wheelspawns|wheelspawns1|aggrogrid'),
      f('src/game', 'monsterCarry|monsterCodex|monsterCombat|monsterMoves|monsterNoises|monsterStrips|slimeBlast|slimeSplatPose|crowdCap'),
    ],
    words: ['monster', 'slime', 'spawn', 'boss', 'aggro', 'mob'],
    traps: ['monsters'],
    doors: [],
  },
  economy: {
    what: 'gold, the bag, the bank, the market and shops, trades, drops, chests and daily rewards',
    files: [f('src/rendering/tables', 'economy') /* v2.3.5346: its hand-tuned tables (card M) */,
      f('server/src', 'gold|bag|bank|market|marketplace|shop|store|storechat|storegear|storeoffer|trade|trade2|xfer|econcard|worldsum|valuepause|inbox|itemdrop|deathpile|gearstash|stash|gear|gearprov|salvage|gamble|dice|dailychest|dailyrewards|risechest|revealbag|loginspin|eventcapes'),
      f('server/src', 'playerroads'),   /* v2.3.5280 (card R): the roads between players, one table */
      f('src/game', 'bank|itemDrop|groundLoot|lootAsk|dropLines|dropLook|storeAnswer|storeSellTap|tradeSlot|weaponSell|salvage|postOffice|revealBag|dice|dailyRewards|bossChest|loginSpinWheel|coinArt|spinBoard|gearWornSync|arenaStakes|econCard'),
    ],
    words: ['gold', 'bag', 'bank', 'market', 'shop', 'store', 'trade', 'inbox', 'drop', 'loot', 'chest', 'salvage', 'gamble', 'dice', 'daily', 'auction', 'gear', 'coin'],
    traps: ['economy'],
    doors: [
      { name: '_goldGive', file: 'server/src/gold.js', what: 'GOLD_ROADS: every change to a player\'s gold (_goldGive, _goldTake, _goldSet)' },
      { name: 'bagGive', file: 'server/src/bag.js', what: 'BAG_ROADS: every change to a bag count (bagGive, bagTake, bagSet)' },
    ],
  },
  skills: {
    what: 'the life skills: gathering, cooking, smithing, the farm, fishing, trapping',
    files: [f('src/rendering/tables', 'skills') /* v2.3.5346: its hand-tuned tables (card M) */,
      f('server/src', 'gathering|cooking|smelting|armorforge|forgeladder|farm|farmorders|fishlog|trapping|hardening|hardenedwood|drawgather|firetrail|gscopper|shardcrack|gems'),
      f('src/game', 'smithing|forgeTabs|farmFeedback|farmTrip|farmWalk|farmWork|fishWeigh|trapping|tierOre|tierTrees|drawGather|lifeSkillRewards|harvestDoor|quickEat|fightFood|mastery|shardCrack|fireRefuse'),
    ],
    words: ['gather', 'cook', 'smelt', 'smith', 'forge', 'farm', 'fish', 'trap', 'harden', 'firemaking', 'skill', 'gem', 'ore', 'tree', 'shard'],
    traps: ['skills'],
    doors: [],
  },
  quests: {
    what: 'quests, achievements, the codex, pets\' book, points',
    files: [
      f('server/src', 'quests|achievements|codex|petbook|pets|pointsreset|prog3'),
      f('server/src', 'skillpoints'),   /* v2.3.5283 (card R): the skill points' door */
      f('server/src', 'xp'),   /* v2.3.5289 (card R): experience and levels' door */
      f('server/src', 'queststate'),   /* v2.3.5284 (card R): quest state's door */
      f('src/game', 'quests|questCard|questComplete|questFly|questHandIn|questJournal|questKept|questPages|questPins|questRoute|questTrailStyle|questWays|trackedQuest|achievements|petBook|petFetch|pointsBubbles|pointsReset|pointsTips|tour|levelCelebration|xpBar|xpPop|welcomeBanner'),
    ],
    words: ['quest', 'achievement', 'codex', 'pet', 'points', 'tour', 'xp', 'level'],
    traps: ['quests'],
    doors: [
      { name: 'pointsGive', file: 'server/src/skillpoints.js', what: 'POINT_ROADS: every change to a player\'s build points (pointsGive, pointsTake, pointsSet, pointsDeal; v2.3.5283, card R)' },
      { name: 'xpGive', file: 'server/src/xp.js', what: 'XP_ROADS: every change to a character\'s experience and levels (xpGive, xpLevelUp, xpSet, xpMake; v2.3.5289, card R)' },
      { name: 'questStateSet', file: 'server/src/queststate.js', what: 'QUEST_ROADS: every change to a quest\'s state, progress, flags and kept lists (seven verbs; v2.3.5284, card R)' },
    ],
  },
  social: {
    what: 'parties, clans, guilds, friends, chat, emotes, duels, the arena, races, boards',
    files: [f('src/rendering/tables', 'social') /* v2.3.5346: its hand-tuned tables (card M) */,
      /* v2.3.5480 (card PW): + power, the boards' power index; v2.3.5484: + statboards;
         v2.3.5218 (card L): + raceDoor, the race's page door; v2.3.5594: + reservednames (a name that reads as staff); v2.3.5621: + silence (card MOD);
         v2.3.5807 (card RV): + lookform / lookForm, a player's avatar and colour in the game's own forms (the boards, the friends list) */
      f('server/src', 'party|clanparty|clans|guilds|alliance|friends|chatlanes|chatmod|chatguard|reservednames|silence|emotes|boards|arena|gladiator|duel|spar|race|leaderboard|power|statboards|lookform'),
      f('src/game', 'lookForm|alliance|allyDrafts|duelDoor|partyDoor|arenaDoor|skullDoor|chat|chatChannel|chatColor|chatMute|emotes|emoteMoves|gesturePose|friendErrors|duelLock|duelPending|partyChip|partyEq|partyMarks|partyRows|peerDot|race|raceDoor|spar|sparTargets|bubbleSkins|boardBumps|dictation|ranksPage'),   /* v2.3.5503 (card LB part 2): + ranksPage, the Ranks page's rules */
    ],
    words: ['party', 'clan', 'guild', 'alliance', 'friend', 'chat', 'emote', 'duel', 'arena', 'gladiator', 'spar', 'race', 'board', 'leaderboard', 'social'],
    traps: ['social'],
    doors: [],
  },
  world: {
    what: 'the Wheel: zones and their doors, lands, dungeons, No Man\'s Land, the map, props',
    files: [
      f('server/src', 'wheelzone|wheelnear|wheelfaces|wheeltables|wheeldungeon|dungeon|dungeonreward|zonejudge|nomansland|props|eventplace'),
      f('src/game', 'wheelBreak|wheelDungeons|wheelHome|wheelNoticeboard|wheelSize|wheelTownDoors|wheelTrial|worldTrial|worldViewport|zoneGate|zoneMechanics|zoneTransitions|veilDoor|dungeonDoor|dungeonArt|dungeonClear|dungeonWaves|noMansLand|nmlAsk|nmlExplainOnce|mapPinPlaces|mapPins|pinSlots|buildingRooms|placeSafety|plateSafety|bodyPlace|timeOfDay|season|expoAddress|onePic|bannerReach'),
    ],
    words: ['wheel', 'zone', 'land', 'dungeon', 'nomansland', 'nml', 'map', 'world', 'town', 'door', 'prop'],
    traps: ['world'],
    doors: [],
  },
  movement: {
    what: 'moving: steps, sprinting, jumping, climbing, riding, swimming, resting',
    files: [
      f('server/src', 'movement|movepath|steadymovers|sprint|rest|ride|staminaregen|safeheal'),
      f('src/game', 'sprint|jump|jumpActions|tapJump|climb|climbActions|ride|rideGround|rest|wheelSwim|moveDiet|legSync|orientationSync|avatarHold'),
    ],
    words: ['move', 'sprint', 'jump', 'climb', 'ride', 'swim', 'rest', 'stamina', 'walk', 'step'],
    traps: [],
    doors: [],
  },
  townsfolk: {
    what: 'the townspeople: their days, walks, talk and reactions',
    files: [f('src/rendering/tables', 'townsfolk') /* v2.3.5345: its hand-tuned tables (card M) */, f('src/game', 'townsfolkDay|townsfolkReact|townsfolkWalk|townChatter|mayorTalk|interactions|poseDoor')],
    words: ['townsfolk', 'npc', 'mayor', 'folk'],
    traps: [],
    doors: [],
  },
  life: {
    what: 'a player\'s health and life phase: dying, the death card, respawning',
    files: [f('server/src', 'life|xpdecay'), f('src/game', 'respawn|dyingDoor|phoneDeath|deathCard')],
    words: ['life', 'death', 'respawn', 'die', 'hp'],
    traps: [],
    doors: [{ name: '_hpSet', file: 'server/src/life.js', what: 'HP_ROADS: every change to a player\'s health; the life phase only through _lifeTo' }],
  },
  audio: {
    what: 'sound and music: cues, voices, ambience, the music deck, the Sound Studio',
    files: [
      f('src/game', 'ambientBeds|eventSounds|hitSounds|moveSounds|ownSounds|npcVoices|soundStudio|slimeAudio|splashAudio|rideSound|townAmbience|townMusic|waterAmbience|wheelMusic'),
      f('src/data', 'soundStudio|soundFold|sfxCache|eventSounds|footstepClips|monsterNoiseClips|ownerSoundClips|voiceCap|bowFeelSound|weaponFeelSound|sprintBreath|sprintGrunt'),
      f('src/ui', 'uiSfxDelegate'),
    ],
    words: ['sound', 'audio', 'music', 'sfx', 'voice', 'ambience', 'ambient', 'cue'],
    traps: ['audio'],
    doors: [],
  },
  input: {
    what: 'touch and the controls on a phone',
    files: [f('src/game', 'controlVisibility|playerActions|coachMarkSize|stickZones|sight|latch|freeAttack|thumbSide|thumbGlue|thumbArc|contextButton|lockFace|bowSpecialNow|aimMarks|padSkin'), f('src/ui', 'tapDismiss|swallowTapClick')],   /* v2.3.6540: + stickZones, sight, latch (card CT, the two buttons); v2.3.6547: + freeAttack (item 8); v2.3.6549: + thumbSide, thumbGlue, thumbArc (part 16); v2.3.6550: + contextButton (part 17); v2.3.6551: + lockFace (part 18); v2.3.6557: + bowSpecialNow (part 23 PR 2); v2.3.6555: + aimMarks (card CT part 22, the aim's frame and caret); v2.3.6640: + padSkin (card PAD, the controller) */
    words: ['touch', 'control', 'tap', 'thumb', 'swallow'],
    traps: ['input'],
    doors: [],
  },
  desktop: {
    what: 'a computer: keys, clicks, the wide window and its words',
    files: [f('src/game', 'deskCombos|deskKeyList|deskKeys|deskTeachState|deskWords|desktopControls|dashSidePref|say'), f('src/ui', 'deskTeach|deskWide')],   /* v2.3.6320: + say (the words table's one reader, card WD2) */
    words: ['desk', 'desktop', 'keyboard', 'computer', 'mouse'],
    traps: ['desktop'],
    doors: [{ name: 'NAV_KEYS', file: 'src/game/deskKeys.js', what: 'every key a computer player presses lives here, worn by its button (data-key)' }],
  },
  device: {
    what: 'what kind of device this is and how much it can draw: the profile, resolution, the view cap',
    files: [f('src/game', 'deviceProfile|renderRes|viewCap|speedTest|loadTimes|lookPaletteChoice|drawLanes')],   /* v2.3.5221: + drawLanes (card O's lanes) */
    words: ['device', 'profile', 'viewcap', 'render-res', 'speed'],
    traps: [],
    doors: [{ name: 'deviceProfile', file: 'src/game/deviceProfile.js', what: 'the one place that asks what the device is (devClass, when SHAPES part 8 builds it)' }],
  },
  'page-thread': {
    what: 'the page\'s one thread: the frame\'s pace and clock, what holds the page',
    files: [f('src/game', 'framePacer|frameClock|frameSteps|renderFrame|heapBurn|buildWatch'), f('src/ui', 'afterFrame')],   /* v2.3.5340: + frameSteps (the frame as named steps, card M) */
    words: ['frame', 'held', 'pacer', 'thread', 'jank', 'smooth'],
    traps: ['page-thread'],
    doors: [{ name: 'beforeDraw', file: 'src/game/framePacer.js', what: 'a read that waits for the graphics chip runs at the top of a frame' }],
  },
  memory: {
    what: 'what the page holds: pictures kept on the chip or as images, colour numbers, trims and frees',
    files: [f('src/rendering', 'gpuOnly|keepAsImage|heldNumbers|paletteTex|paletteLoad|paletteDraw|heapTrim|texturePoolTrim|bulkTexDestroy|releaseCanvasTexture|quietClear|textRelease|fishTopEvict|maskedEvict|gfxLean|batchIdsLean|picsNumbers|canvasWitness')],
    words: ['memory', 'mem', 'gpu', 'heap', 'palette', 'trim', 'leak'],
    traps: ['memory'],
    doors: [{ name: 'keepOnGpuOnly', file: 'src/rendering/gpuOnly.js', what: 'a picture made on a canvas that nothing reads back' }],
  },
  preload: {
    what: 'what loads behind the loading screen, and what loads later on purpose',
    files: [f('src/rendering/tables', 'preload') /* v2.3.5345: its hand-tuned tables (card M) */, f('src/rendering', 'preloadAnimations|preloadReport|chestPreload|controlsPreload|gestureCuePreload|levelUpBurstPreload|loginSpinPreload|questArtPreload|statDemoPreload|xpBarPreload|zoneBannerPreload|loadSetLater|warmOnce|picsOnce'), f('src/ui', 'loadingGate|lazyPanel|lazyPanels')],
    words: ['preload', 'loading', 'lazy', 'warm'],
    traps: ['preload'],
    doors: [{ name: 'preloadWorldAnimations', file: 'src/rendering/preloadAnimations.js', what: 'every animation and sprite loads behind the loading screen' }],
  },
  art: {
    what: 'loading art in play: strips of 256 colours, the readers off the page\'s thread, bakes on workers',
    files: [f('src/rendering', 'zoneTextures|stripRead|stripPack|png8Decode|png8Worker|p256|webpImage|artBottoms|artHolds|workerCanvas|trimPack|trimRules|fxStrips|bodyBake|bodyBakeWorker|maskedBake|maskedBakeWorker|retintPalette|sharpPixels|tiledMaps')],
    words: ['art', 'strip', 'png', 'p256', 'bake', 'sprite', 'pic'],
    traps: ['art'],
    doors: [{ name: 'loadTrackedStrip', file: 'src/rendering/zoneTextures.js', what: 'art that loads while the world is in play' }],
  },
  look: {
    what: 'how a character looks: traits, the look palette, garments, heads, gear on the body',
    files: [f('src/rendering/tables', 'look') /* v2.3.5345: its hand-tuned tables (card M) */, re('^src/rendering/traits/'), re('^src/rendering/lookSets/'), f('src/rendering', 'lookArmour|lookArmourProbe|lookBake|lookExpand|lookFolk|lookPalette|lookPaletteProbe|lookShirt|lookShirtFrame|lookShirtProbe|lookUnpack|hemiLook|hemiBust|hemiBustCore|hemiAtlasIndex|characterPortrait|traitThumbs|gearBake|gearCatalog|gearLookFrame|gearLookProbe|gearNumbers|gearSheets|gearVariants|gearVersion|gearWalkFrame|weaponLookFrame|bodyRecolor|toolRecolor|garmentConfine|hairClip|headCrowns|headFrames|flipHead|earAnchors|earSides|eyeBlankMask|eyeMask|standInGarb|standInInk|standIns|retryLooks|capeSprites|playerSkins|nftAvatars'), f('server/src', 'lookrelay|poses')],
    words: ['look', 'trait', 'hair', 'head', 'garment', 'cape', 'armour', 'armor', 'skin', 'stand-in', 'standin', 'portrait'],
    traps: ['look'],
    doors: [],
  },
  render: {
    what: 'drawing the world: the Pixi renderer, the entity and effects renderers, light, fx',
    files: [f('src/rendering/tables', 'render') /* v2.3.5345: its hand-tuned tables (card M) */, f('src/game', 'poseHides|cameraFollow') /* v2.3.6208: what a body's pose hides (card EN); v2.3.6660: the camera's follow (card GR) */],
    rest: [re('^src/rendering/')],
    words: ['render', 'draw', 'fx', 'pixi', 'batch', 'light', 'camera'],
    traps: ['render'],
    doors: [],
  },
  ui: {
    what: 'the screens: BroTown.jsx, the band and its panels, windows, banners',
    files: [f('src/rendering/tables', 'ui') /* v2.3.5345: its hand-tuned tables (card M) */, f('src/game', 'windowDoor|guardBreak|broPages|ui2Tokens|dashNav|dashDests|broHub|screenZones|pending|combatHub|progression|metricTree') /* v2.3.6686: a headline number as a tree (card UI2-combat PR 2) */ /* v2.3.6683: Bro's six doors, a screen's zones and actions, what is out (card UI2-bro) */ /* v2.3.6685: Combat's hub and its pools, a skill's progress (card UI2-combat) */ /* v2.3.6681: the dashboard's way round and its destinations (card UI2-frame); v2.3.6680: the new dashboard kit's tokens (card UI2); v2.3.6554: the shield drawn down at the worker's break (card CT part 20); v2.3.6600: the Bro tab's pages (card BRO) */, f('src/game', 'itemInspect') /* v2.3.6687: the one item page's model (card UI2-gear) */, f('src/game', 'compare|equipProject|workspace') /* v2.3.6688: Gear's comparison, its projection, the two-panel workspace (card UI2-gear PR 2) */],
    rest: [re('^src/ui/'), re('^src/styles/')],
    words: ['ui', 'panel', 'window', 'band', 'banner', 'screen', 'dash', 'sheet', 'popup'],
    traps: ['ui'],
    doors: [],
  },
  data: {
    what: 'the client\'s tables (src/data/): items, zones, abilities, the long display and systems tables',
    files: [],
    rest: [re('^src/data/')],
    words: ['data', 'table', 'mirror'],
    traps: [],
    doors: [],
  },
  /* v2.3.5160 (card U PR 1, the planning session's call): the ledger's
     files, src/state/<system>.js and its README.  A ledger is plain data
     about another system's state; nothing imports it yet */
  state: {
    what: 'the state ledger: every field of S and top-of-file variable, a file a system',
    /* v2.3.5203 (card L PR 3, the planning session's call): and resetOn.js,
       the state's resets registered beside their state and run at each
       edge's one door (grand plan step 5.3, step 2) */
    files: [re('^src/state/'), f('src/game', 'resetOn')],
    words: ['ledger'],
    traps: [],
    doors: [],
  },
  debug: {
    what: 'the crash ring, the perf HUD, the debug overlay, the field report (its worker half: server/src/report.js, v2.3.5127)',
    files: [re('^src/debug/'), f('server/src', 'report')],
    words: ['debug', 'crash', 'perf', 'report'],
    traps: [],
    doors: [],
  },
  shell: {
    what: 'the page itself: main.jsx, index.html, the QA harness pages, the public files',
    files: [re('^src/[^/]+$'), re('^src/public/'), re('^src/lib/')],
    words: ['shell', 'main', 'index'],
    traps: [],
    doors: [],
  },
  vendor: {
    what: 'code from outside, kept as it came (with its licence)',
    files: [re('^server/src/vendor/')],
    words: [],
    traps: [],
    doors: [],
  },
});

/* `unsorted` may only fall.  Set 2026-11-14 at its first count; only the
   gatekeeper lowers it (a PR of its own); nobody raises it. */
export const UNSORTED_LINE = 11;

/** The files the map covers: every file under src/ and server/src/. */
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export function mappedFiles(root = ROOT) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(join(root, d), { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk('src');
  walk('server/src');
  return out.sort();
}

/** Place every file: { bySystem: {name: [files]}, unsorted: [files], twice: [{file, systems}] } */
export function placeFiles(files = mappedFiles()) {
  const bySystem = Object.create(null);
  for (const n of Object.keys(SYSTEMS)) bySystem[n] = [];
  const unsorted = [];
  const twice = [];
  for (const file of files) {
    const claims = Object.keys(SYSTEMS).filter((n) => SYSTEMS[n].files.some((r) => r.test(file)));
    if (claims.length > 1) { twice.push({ file, systems: claims }); continue; }
    if (claims.length === 1) { bySystem[claims[0]].push(file); continue; }
    const rest = Object.keys(SYSTEMS).filter((n) => (SYSTEMS[n].rest || []).some((r) => r.test(file)));
    if (rest.length > 1) { twice.push({ file, systems: rest }); continue; }
    if (rest.length === 1) { bySystem[rest[0]].push(file); continue; }
    unsorted.push(file);
  }
  return { bySystem, unsorted, twice };
}

/** The system a file is in ('unsorted' when none; null for a file outside the map). */
export function systemOf(file, placed = placeFiles()) {
  for (const [n, fs] of Object.entries(placed.bySystem)) if (fs.includes(file)) return n;
  return placed.unsorted.includes(file) ? 'unsorted' : null;
}

/* ── tests, specs and traps, for the page ── */

/* a file name's words: split on anything not a letter or digit, and on a
   lower-to-upper change (bodyBake -> body, bake), lower-cased */
function tokens(name) {
  return name.replace(/\.[a-z]+$/i, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
/** Does a file name hold one of a system's words (a word is the start of one of its words)? */
export function nameHolds(name, words) {
  const t = tokens(name);
  return words.some((w) => t.some((x) => x.startsWith(w.toLowerCase().replace(/[^a-z0-9]/g, ''))) || (w.includes('-') && name.toLowerCase().includes(w)));
}

function listDir(root, d, keep) {
  try { return readdirSync(join(root, d)).filter(keep).sort(); } catch { return []; }
}

/** The traps census's rows: [{ n: '§12', systems: ['wire', 'combat'] }] */
export function trapRows(root = ROOT) {
  const p = join(root, 'docs/plan/census/traps.md');
  if (!existsSync(p)) return [];
  const out = [];
  for (const m of readFileSync(p, 'utf8').matchAll(/^\| (§\d+|line \d+) \| [^|]* \| ([a-z\/-]+) \|/gm)) out.push({ n: m[1], systems: m[2].split('/') });
  return out;
}

/** Everything the page says, by system. */
export function describe(root = ROOT) {
  const placed = placeFiles(mappedFiles(root));
  const suites = listDir(root, 'server/test', (f) => f.endsWith('.test.mjs'));
  const scen = listDir(root, 'tools/qa/mp', (f) => /^mp-.+\.mjs$/.test(f));
  const specs = listDir(root, 'docs/specs', (f) => f.endsWith('.md'));
  const traps = trapRows(root);
  const out = [];
  for (const [name, s] of Object.entries(SYSTEMS)) {
    const words = s.words || [];
    out.push({
      name, what: s.what,
      files: placed.bySystem[name],
      suites: words.length ? suites.filter((x) => nameHolds(x.replace(/\.test\.mjs$/, ''), words)) : [],
      scenarios: words.length ? scen.filter((x) => nameHolds(x.replace(/^mp-|\.mjs$/g, ''), words)) : [],
      specs: words.length ? specs.filter((x) => nameHolds(x, words)) : [],
      traps: traps.filter((t) => t.systems.some((v) => (s.traps || []).includes(v))).map((t) => t.n),
      doors: s.doors, switches: SWITCHES.filter((r) => r.system === name).map((r) => r.name),
    });
  }
  return { systems: out, unsorted: placed.unsorted, twice: placed.twice, trapCount: traps.length };
}

/* a pattern in words: "server/src/: gold, bag" or "everything under src/ui/account/" */
function patternWords(r) {
  if (r.named) return '`' + r.named.dir + '/`: ' + r.named.names.join(', ');
  const m = /^\^(.*)$/.exec(r.source);
  const p = m ? m[1].replace(/\\\//g, '/') : r.source;
  if (p === 'src/[^/]+$') return 'the files at the top of `src/`';
  return 'everything under `' + p + '`';
}

/** docs/SYSTEMS.md, made from the table.  It says the RULES (patterns, words,
    doors, switches), never today's lists of files, suites or specs: those
    change with every PR anywhere, and a page that listed them would make
    every PR that adds a file or a test meet every other at this page.
    `node tools/guards/systems.test.mjs --list <system>` prints them. */
export function makePage() {
  const L = [];
  L.push('# The systems (made by `node tools/guards/systems.test.mjs --write`; never edit by hand)');
  L.push('');
  L.push('The grand plan\'s step 5.2 (card B, v2.3.5102). The table is `tools/guards/lib/systems.mjs`;');
  L.push('`tools/guards/systems.test.mjs` holds it on every PR: every file under `src/` and `server/src/` is in one');
  L.push('system or in `unsorted`, a file two systems claim fails, `unsorted` only falls (the gatekeeper lowers its');
  L.push('line), every door is in its system\'s files, and this page is what the table makes.');
  L.push('');
  L.push('- **To give a file a system**: add it to that system\'s `files` in the table, then run');
  L.push('  `node tools/guards/systems.test.mjs --write`.');
  L.push('- **A system\'s files, suites, scenarios, specs and traps today**:');
  L.push('  `node tools/guards/systems.test.mjs --list <system>` (`--list unsorted` for the files with none).');
  L.push('- **Files** are placed by the patterns below. A folder\'s **rest** (render, ui, data) takes the files of that');
  L.push('  folder that no system\'s patterns claim. `src/game/` and `server/src/` have no rest: a new file there is');
  L.push('  `unsorted` until it is given a system.');
  L.push('- **Words** find a system\'s suites (`server/test/`), phone scenarios (`tools/qa/mp/`) and specs');
  L.push('  (`docs/specs/`): a file whose name holds one. A starting point, not a ruling.');
  L.push('- **Traps**: the rows of card I\'s census (`docs/plan/census/traps.md`) whose provisional system is one of');
  L.push('  these words.');
  L.push('- **Doors**: the one function a kind of change goes through (CLAUDE.md part 5). **Switches**: the rows of');
  L.push('  the switch table (`docs/SWITCHES.md`, card T) with the system\'s name: `node tools/guards/switches.test.mjs --list <system>`.');
  L.push('');
  L.push('| System | What |');
  L.push('|---|---|');
  for (const [name, s] of Object.entries(SYSTEMS)) L.push(`| [${name}](#${name}) | ${s.what} |`);
  L.push('| unsorted | no system yet: the count only falls |');
  L.push('');
  const list = (xs) => (xs && xs.length ? xs.map((x) => '`' + x + '`').join(', ') : 'none');
  for (const [name, s] of Object.entries(SYSTEMS)) {
    L.push(`## ${name}`);
    L.push('');
    L.push(s.what[0].toUpperCase() + s.what.slice(1) + '.');
    L.push('');
    for (const r of s.files) L.push(`- **Files**: ${patternWords(r)}`);
    for (const r of s.rest || []) L.push(`- **Rest of**: ${patternWords(r).replace(/^everything under /, '')}`);
    L.push(`- **Doors**: ${s.doors.length ? s.doors.map((x) => '`' + x.name + '` in `' + x.file + '` (' + x.what + ')').join('; ') : 'none named yet'}`);
    L.push(`- **Switches**: [its rows in the switch table](SWITCHES.md#${name})`);
    L.push(`- **Words**: ${list(s.words)}`);
    L.push(`- **Traps**: ${list(s.traps)}`);
    L.push('');
  }
  return L.join('\n');
}
