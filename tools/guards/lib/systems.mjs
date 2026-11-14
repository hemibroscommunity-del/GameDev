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
 * SWITCHES.  The switch table is card T's.  Until it lands this column holds
 * only the switches a system is already known by (CAMEL_SWITCHES in
 * liveops.js, the switches CLAUDE.md names); T's table fills the rest.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    files: [f('server/src', 'index|relay|bundle|clientoff'), re('^src/networking/'), f('src/game', 'clientOff|clientOffApply|blockedAsks|workerClock|t1Sync|tooFar')],
    words: ['wire', 'protocol', 'relay', 'caps', 'bundle', 'privileged', 'clientoff'],
    traps: ['wire'],
    doors: [
      { name: 'PRIVILEGED_EVENTS', file: 'server/src/index.js', what: 'every type the server sends; anything else a client could forge' },
      { name: 'TYPES', file: 'server/src/relay.js', what: 'RELAY.TYPES: the relays a phone may send, rebuilt in its name' },
    ],
    switches: [],
  },
  session: {
    what: 'a sitting: the join, leaving, lingering, the rejoin and what it re-sends',
    files: [f('server/src', 'join|leave|linger|lastplace|rejoinresend|nearjoin|presence2'), f('src/game', 'rejoinSlots|resumeListeners|quietPhone|nearJoin|presence2|stateCleanup')],
    words: ['join', 'leave', 'linger', 'rejoin', 'reconnect', 'presence', 'session', 'quiet-phone', 'quietphone'],
    traps: [],
    doors: [
      { name: '_playerLeaves', file: 'server/src/leave.js', what: 'LEAVE_WAYS: the one way a session leaves' },
      { name: 'REJOIN_SLOTS', file: 'src/game/rejoinSlots.js', what: 'what the phone clears at state_sync, with the worker\'s re-send' },
    ],
    switches: [],
  },
  identity: {
    what: 'who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket',
    files: [f('server/src', 'account|devicelock|loginkeys|verify|broverify|origin|httpauth'), f('src/game', 'tabIdentity|characterRecord'), re('^src/ui/account/')],
    words: ['account', 'login', 'devicelock', 'device-lock', 'identity', 'origin', 'verify', 'turnstile'],
    traps: ['identity'],
    doors: [],
    switches: [],
  },
  bots: {
    what: 'telling a person from a script: bot signals, fingerprints, claims that are bounded',
    files: [f('server/src', 'botfp|botsig|botstats|charwatch|hitproof|moveclaims')],
    words: ['bot', 'antibot', 'anticheat', 'charwatch', 'hitproof', 'moveclaim'],
    traps: [],
    doors: [],
    switches: [],
  },
  liveops: {
    what: 'the live flags, the admin and dev levers, test mode, feedback',
    files: [f('server/src', 'liveops|admin|devtools|testmode|feedback'), f('src/game', 'testMode')],
    words: ['liveops', 'admin', 'devtools', 'test-mode', 'testmode', 'feedback', 'flags'],
    traps: ['liveops'],
    doors: [
      { name: 'flagNameOk', file: 'server/src/liveops.js', what: 'the names a live flag (a kill switch) may take' },
      { name: '_testMode', file: 'server/src/testmode.js', what: 'the one question an honesty check asks' },
    ],
    switches: [],
  },
  'server-core': {
    what: 'the worker\'s spine: saving, migrations, the tick, its pace, hidden settings',
    files: [f('server/src', 'persistence|migrations|tick|tickpace|cadence|data|grids|heapburn|hidden')],
    words: ['persistence', 'migration', 'tick', 'storage', 'save', 'hidden', 'cost-guard', 'costguard'],
    traps: ['server-core'],
    doors: [{ name: 'HIDDEN_SPEC', file: 'server/src/hidden.js', what: 'a server-only number a copier would value' }],
    switches: [],
  },
  combat: {
    what: 'hitting and being hit: weapons, abilities, the bow, shields, damage, PvP',
    files: [
      f('server/src', 'combat|hits|abilities|accuracy|burst|freeswing|fightlock|killroll|threat|telegraph|elemental|oneformula|statcap|arrowblast|swordconvert|shieldwear|shieldgem|weapongem|amulet|pvpbalance|pvpextras|pvplunge'),
      f('src/game', 'abilities|accuracy|combatHelpers|manualCombat|targeting|projectiles|bowDraw|bowFeel|bowVolley|swordFeel|staffFeel|weaponFeel|deathBlow|dodge|elemHits|elemWindup|killRoll|killXp|pvpSwing|shieldCopies|shieldGem|shieldToggle|shieldWear|arrowEdge|whirlCatch|deskShield|weaponGem|weaponSlots|amuletGem|apChip|peerShots|shotGround|shockSpark|stormSparks|waterAttack'),
    ],
    words: ['combat', 'hit', 'ability', 'abilit', 'bow', 'arrow', 'sword', 'staff', 'shield', 'weapon', 'pvp', 'damage', 'whirl', 'dodge', 'elemental', 'accuracy'],
    traps: ['combat'],
    doors: [{ name: '_monsterHit', file: 'server/src/hits.js', what: 'MONSTER_HITS: every monster hit on a player' }],
    switches: ['whirlWindup'],
  },
  monsters: {
    what: 'the monsters\' lives, moves, status, spawns and the boss',
    files: [
      f('server/src', 'monsterlife|monstermoves|monsterstatus|slimeboss|spawnscale|steadymovers|wheelspawns|wheelspawns1|aggrogrid'),
      f('src/game', 'monsterCarry|monsterCodex|monsterCombat|monsterMoves|monsterNoises|monsterStrips|slimeBlast|slimeSplatPose|crowdCap'),
    ],
    words: ['monster', 'slime', 'spawn', 'boss', 'aggro', 'mob'],
    traps: ['monsters'],
    doors: [],
    switches: [],
  },
  economy: {
    what: 'gold, the bag, the bank, the market and shops, trades, drops, chests and daily rewards',
    files: [
      f('server/src', 'gold|bag|bank|market|marketplace|shop|store|storechat|storegear|storeoffer|trade|trade2|inbox|itemdrop|deathpile|gearstash|gear|gearprov|salvage|gamble|dice|dailychest|dailyrewards|risechest|revealbag|loginspin|eventcapes'),
      f('src/game', 'bank|itemDrop|groundLoot|lootAsk|dropLines|dropLook|storeAnswer|storeSellTap|tradeSlot|weaponSell|salvage|postOffice|revealBag|dice|dailyRewards|bossChest|loginSpinWheel|coinArt|spinBoard|gearWornSync|arenaStakes'),
    ],
    words: ['gold', 'bag', 'bank', 'market', 'shop', 'store', 'trade', 'inbox', 'drop', 'loot', 'chest', 'salvage', 'gamble', 'dice', 'daily', 'auction', 'gear', 'coin'],
    traps: ['economy'],
    doors: [
      { name: '_goldGive', file: 'server/src/gold.js', what: 'GOLD_ROADS: every change to a player\'s gold (_goldGive, _goldTake, _goldSet)' },
      { name: 'bagGive', file: 'server/src/bag.js', what: 'BAG_ROADS: every change to a bag count (bagGive, bagTake, bagSet)' },
    ],
    switches: ['storeGear', 'dailyChest'],
  },
  skills: {
    what: 'the life skills: gathering, cooking, smithing, the farm, fishing, trapping',
    files: [
      f('server/src', 'gathering|cooking|smelting|armorforge|forgeladder|farm|farmorders|fishlog|trapping|hardening|hardenedwood|drawgather|firetrail|gscopper|shardcrack|gems'),
      f('src/game', 'smithing|forgeTabs|farmFeedback|farmTrip|farmWalk|farmWork|fishWeigh|trapping|tierOre|tierTrees|drawGather|lifeSkillRewards|quickEat|fightFood|mastery|shardCrack|fireRefuse'),
    ],
    words: ['gather', 'cook', 'smelt', 'smith', 'forge', 'farm', 'fish', 'trap', 'harden', 'firemaking', 'skill', 'gem', 'ore', 'tree', 'shard'],
    traps: ['skills'],
    doors: [],
    switches: [],
  },
  quests: {
    what: 'quests, achievements, the codex, pets\' book, points',
    files: [
      f('server/src', 'quests|achievements|codex|petbook|pets|pointsreset|prog3'),
      f('src/game', 'quests|questCard|questComplete|questFly|questHandIn|questJournal|questKept|questPins|questRoute|questTrailStyle|questWays|trackedQuest|achievements|petBook|petFetch|pointsBubbles|pointsReset|pointsTips|tour|levelCelebration|xpBar|xpPop|welcomeBanner'),
    ],
    words: ['quest', 'achievement', 'codex', 'pet', 'points', 'tour', 'xp', 'level'],
    traps: ['quests'],
    doors: [],
    switches: [],
  },
  social: {
    what: 'parties, clans, guilds, friends, chat, emotes, duels, the arena, races, boards',
    files: [
      f('server/src', 'party|clanparty|clans|guilds|alliance|friends|chatlanes|chatmod|chatguard|emotes|boards|arena|gladiator|duel|spar|race|leaderboard'),
      f('src/game', 'alliance|chat|chatChannel|chatColor|chatMute|emotes|emoteMoves|gesturePose|friendErrors|duelLock|duelPending|partyChip|partyEq|partyMarks|partyRows|peerDot|race|spar|sparTargets|bubbleSkins|boardBumps|dictation'),
    ],
    words: ['party', 'clan', 'guild', 'alliance', 'friend', 'chat', 'emote', 'duel', 'arena', 'gladiator', 'spar', 'race', 'board', 'leaderboard', 'social'],
    traps: ['social'],
    doors: [],
    switches: [],
  },
  world: {
    what: 'the Wheel: zones and their doors, lands, dungeons, No Man\'s Land, the map, props',
    files: [
      f('server/src', 'wheelzone|wheelnear|wheelfaces|wheeltables|wheeldungeon|dungeon|dungeonreward|zonejudge|nomansland|props|eventplace|flood'),
      f('src/game', 'wheelBreak|wheelDungeons|wheelHome|wheelNoticeboard|wheelSize|wheelTownDoors|wheelTrial|worldTrial|worldViewport|zoneGate|zoneMechanics|zoneTransitions|dungeonArt|dungeonClear|dungeonWaves|noMansLand|nmlAsk|nmlExplainOnce|mapPinPlaces|mapPins|pinSlots|buildingRooms|placeSafety|plateSafety|bodyPlace|timeOfDay|season|expoAddress|onePic|bannerReach'),
    ],
    words: ['wheel', 'zone', 'land', 'dungeon', 'nomansland', 'nml', 'map', 'world', 'town', 'door', 'prop', 'flood'],
    traps: ['world'],
    doors: [],
    switches: [],
  },
  movement: {
    what: 'moving: steps, sprinting, jumping, climbing, riding, swimming, resting',
    files: [
      f('server/src', 'movement|movepath|sprint|rest|ride|staminaregen|safeheal'),
      f('src/game', 'sprint|jump|jumpActions|tapJump|climb|climbActions|ride|rideGround|rest|wheelSwim|moveDiet|legSync|orientationSync|avatarHold'),
    ],
    words: ['move', 'sprint', 'jump', 'climb', 'ride', 'swim', 'rest', 'stamina', 'walk', 'step'],
    traps: [],
    doors: [],
    switches: [],
  },
  townsfolk: {
    what: 'the townspeople: their days, walks, talk and reactions',
    files: [f('src/game', 'townsfolkDay|townsfolkReact|townsfolkWalk|townChatter|mayorTalk|interactions')],
    words: ['townsfolk', 'npc', 'mayor', 'folk'],
    traps: [],
    doors: [],
    switches: [],
  },
  life: {
    what: 'a player\'s health and life phase: dying, the death card, respawning',
    files: [f('server/src', 'life|xpdecay'), f('src/game', 'respawn|phoneDeath|deathCard')],
    words: ['life', 'death', 'respawn', 'die', 'hp'],
    traps: [],
    doors: [{ name: '_hpSet', file: 'server/src/life.js', what: 'HP_ROADS: every change to a player\'s health; the life phase only through _lifeTo' }],
    switches: [],
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
    switches: [],
  },
  input: {
    what: 'touch and the controls on a phone',
    files: [f('src/game', 'controlVisibility|playerActions|coachMarkSize'), f('src/ui', 'tapDismiss|swallowTapClick')],
    words: ['touch', 'control', 'tap', 'thumb', 'swallow'],
    traps: ['input'],
    doors: [],
    switches: [],
  },
  desktop: {
    what: 'a computer: keys, clicks, the wide window and its words',
    files: [f('src/game', 'deskCombos|deskKeyList|deskKeys|deskTeachState|deskWords|desktopControls|dashSidePref'), f('src/ui', 'deskTeach|deskWide')],
    words: ['desk', 'desktop', 'keyboard', 'computer', 'mouse'],
    traps: ['desktop'],
    doors: [{ name: 'NAV_KEYS', file: 'src/game/deskKeys.js', what: 'every key a computer player presses lives here, worn by its button (data-key)' }],
    switches: [],
  },
  device: {
    what: 'what kind of device this is and how much it can draw: the profile, resolution, the view cap',
    files: [f('src/game', 'deviceProfile|renderRes|viewCap|speedTest|loadTimes|lookPaletteChoice')],
    words: ['device', 'profile', 'viewcap', 'render-res', 'speed'],
    traps: [],
    doors: [{ name: 'deviceProfile', file: 'src/game/deviceProfile.js', what: 'the one place that asks what the device is (devClass, when SHAPES part 8 builds it)' }],
    switches: [],
  },
  'page-thread': {
    what: 'the page\'s one thread: the frame\'s pace and clock, what holds the page',
    files: [f('src/game', 'framePacer|frameClock|renderFrame|heapBurn|buildWatch'), f('src/ui', 'afterFrame')],
    words: ['frame', 'held', 'pacer', 'thread', 'jank', 'smooth'],
    traps: ['page-thread'],
    doors: [{ name: 'beforeDraw', file: 'src/game/framePacer.js', what: 'a read that waits for the graphics chip runs at the top of a frame' }],
    switches: [],
  },
  memory: {
    what: 'what the page holds: pictures kept on the chip or as images, colour numbers, trims and frees',
    files: [f('src/rendering', 'gpuOnly|keepAsImage|heldNumbers|paletteTex|paletteLoad|paletteDraw|heapTrim|texturePoolTrim|bulkTexDestroy|releaseCanvasTexture|quietClear|textRelease|fishTopEvict|maskedEvict|gfxLean|batchIdsLean|picsNumbers|canvasWitness')],
    words: ['memory', 'mem', 'gpu', 'heap', 'palette', 'trim', 'leak'],
    traps: ['memory'],
    doors: [{ name: 'keepOnGpuOnly', file: 'src/rendering/gpuOnly.js', what: 'a picture made on a canvas that nothing reads back' }],
    switches: [],
  },
  preload: {
    what: 'what loads behind the loading screen, and what loads later on purpose',
    files: [f('src/rendering', 'preloadAnimations|preloadReport|chestPreload|controlsPreload|gestureCuePreload|levelUpBurstPreload|loginSpinPreload|questArtPreload|statDemoPreload|xpBarPreload|zoneBannerPreload|loadSetLater|warmOnce|picsOnce'), f('src/ui', 'loadingGate|lazyPanel|lazyPanels')],
    words: ['preload', 'loading', 'lazy', 'warm'],
    traps: ['preload'],
    doors: [{ name: 'preloadWorldAnimations', file: 'src/rendering/preloadAnimations.js', what: 'every animation and sprite loads behind the loading screen' }],
    switches: [],
  },
  art: {
    what: 'loading art in play: strips of 256 colours, the readers off the page\'s thread, bakes on workers',
    files: [f('src/rendering', 'zoneTextures|stripRead|stripPack|png8Decode|png8Worker|p256|webpImage|artBottoms|artHolds|workerCanvas|trimPack|trimRules|fxStrips|bodyBake|bodyBakeWorker|maskedBake|maskedBakeWorker|retintPalette|sharpPixels|tiledMaps')],
    words: ['art', 'strip', 'png', 'p256', 'bake', 'sprite', 'pic'],
    traps: ['art'],
    doors: [{ name: 'loadTrackedStrip', file: 'src/rendering/zoneTextures.js', what: 'art that loads while the world is in play' }],
    switches: [],
  },
  look: {
    what: 'how a character looks: traits, the look palette, garments, heads, gear on the body',
    files: [re('^src/rendering/traits/'), re('^src/rendering/lookSets/'), f('src/rendering', 'lookArmour|lookArmourProbe|lookBake|lookExpand|lookFolk|lookPalette|lookPaletteProbe|lookShirt|lookShirtFrame|lookShirtProbe|lookUnpack|hemiLook|hemiBust|hemiBustCore|hemiAtlasIndex|characterPortrait|traitThumbs|gearBake|gearCatalog|gearLookFrame|gearLookProbe|gearNumbers|gearSheets|gearVariants|gearVersion|gearWalkFrame|weaponLookFrame|bodyRecolor|toolRecolor|garmentConfine|hairClip|headCrowns|headFrames|flipHead|earAnchors|earSides|eyeBlankMask|eyeMask|standInGarb|standInInk|standIns|retryLooks|capeSprites|playerSkins|nftAvatars'), f('server/src', 'lookrelay|poses')],
    words: ['look', 'trait', 'hair', 'head', 'garment', 'cape', 'armour', 'armor', 'skin', 'stand-in', 'standin', 'portrait'],
    traps: ['look'],
    doors: [],
    switches: [],
  },
  render: {
    what: 'drawing the world: the Pixi renderer, the entity and effects renderers, light, fx',
    files: [],
    rest: [re('^src/rendering/')],
    words: ['render', 'draw', 'fx', 'pixi', 'batch', 'light', 'camera'],
    traps: ['render'],
    doors: [],
    switches: [],
  },
  ui: {
    what: 'the screens: BroTown.jsx, the band and its panels, windows, banners',
    files: [],
    rest: [re('^src/ui/'), re('^src/styles/')],
    words: ['ui', 'panel', 'window', 'band', 'banner', 'screen', 'dash', 'sheet', 'popup'],
    traps: ['ui'],
    doors: [],
    switches: [],
  },
  data: {
    what: 'the client\'s tables (src/data/): items, zones, abilities, the long display and systems tables',
    files: [],
    rest: [re('^src/data/')],
    words: ['data', 'table', 'mirror'],
    traps: [],
    doors: [],
    switches: [],
  },
  debug: {
    what: 'the crash ring, the perf HUD, the debug overlay',
    files: [re('^src/debug/')],
    words: ['debug', 'crash', 'perf'],
    traps: [],
    doors: [],
    switches: [],
  },
  shell: {
    what: 'the page itself: main.jsx, index.html, the QA harness pages, the public files',
    files: [re('^src/[^/]+$'), re('^src/public/'), re('^src/lib/')],
    words: ['shell', 'main', 'index'],
    traps: [],
    doors: [],
    switches: [],
  },
  vendor: {
    what: 'code from outside, kept as it came (with its licence)',
    files: [re('^server/src/vendor/')],
    words: [],
    traps: [],
    doors: [],
    switches: [],
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
      doors: s.doors, switches: s.switches,
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
  L.push('- **Doors**: the one function a kind of change goes through (CLAUDE.md part 5). **Switches**: the switch');
  L.push('  table is card T\'s; until it lands, only the switches a system is known by.');
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
    L.push(`- **Switches**: ${list(s.switches)}`);
    L.push(`- **Words**: ${list(s.words)}`);
    L.push(`- **Traps**: ${list(s.traps)}`);
    L.push('');
  }
  return L.join('\n');
}
