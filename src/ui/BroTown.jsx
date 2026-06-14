import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExtractionSwipeLayer } from './ExtractionSwipeLayer.jsx';
/* v2.3.855: first UI-panel extraction — the info/online-count popup. */
import { InfoPanel } from './panels/InfoPanel.jsx';
/* v2.3.856: leaderboard panel extraction. */
import { LeaderboardPanel } from './panels/LeaderboardPanel.jsx';
/* v2.3.857: guild panel extraction. */
import { GuildPanel } from './panels/GuildPanel.jsx';
/* v2.3.858: feedback panel extraction. */
import { FeedbackPanel } from './panels/FeedbackPanel.jsx';
/* v2.3.859: clan panel extraction. */
import { ClanPanel } from './panels/ClanPanel.jsx';
/* v2.3.860: social panel extraction. */
import { SocialPanel } from './panels/SocialPanel.jsx';
/* v2.3.861: pet house panel extraction. */
import { PetHousePanel } from './panels/PetHousePanel.jsx';
/* v2.3.862: furniture panel extraction. */
import { FurniturePanel } from './panels/FurniturePanel.jsx';
/* v2.3.863: dungeon creator panel extraction. */
import { DungeonCreatorPanel } from './panels/DungeonCreatorPanel.jsx';
/* v2.3.864: encyclopedia panel extraction. */
import { EncyclopediaPanel } from './panels/EncyclopediaPanel.jsx';
/* v2.3.865: skills panel extraction. */
import { SkillsPanel } from './panels/SkillsPanel.jsx';
/* v2.3.866: shop panel extraction. */
import { ShopPanel } from './panels/ShopPanel.jsx';
import { MINE_SPOT_R } from '@/data/constants.js';
import { IntroVideo } from './IntroVideo.jsx';
import { BUILD_INFO } from './BuildBadge.jsx';
import { pushHudPopup } from './XpFlyOverlay.jsx';

/* Per-fish cooking pan map.  CookingMinigame defaults to pan.png
   (yellow tang) when no panSheetSrc is passed.  Keys are inventory
   keys (fish_<species>) so this matches the fishKey prop directly. */
const COOK_PAN_BY_FISH = {
  /* -v3 from a fresh clownfish-in-pan source video — visually consistent
     with the minnow pan (same bubbling-oil style).  Filename version
     bump cache-busts the prior v2 strip. */
  fish_clownfish: '/sprites/cook/pan-clownfish-v3.png',
};

/* Per-cooked-food heal amount when the player taps the tile to eat.
   Default to COOKED_HEAL_DEFAULT for any cooked_fish_* not listed. */
const COOKED_HEAL_DEFAULT = 30;
const COOKED_HEAL_BY_KEY = {
  cooked_fish_clownfish: 50,
};
import { firemakingBus } from './mobile/firemakingBus.js';
import { eatBus } from './mobile/eatBus.js';
import { weaponSwapBus } from './mobile/weaponSwapBus.js';
import { blockRingBus } from './mobile/blockRingBus.js';
/* Renderer: PixiJS (WebGL) with Canvas 2D fallback */
import { initPixiRenderer, preloadPlayerAssets, prewarmBaseSheets } from '@/rendering/pixiRenderer.js';
import { preloadAllTiledMaps, getWalkability, TILED_ZONE_MAPS, loadWalkabilityMaps, IMAGE_ZONE_MAPS } from '@/rendering/tiledMaps.js';
import { perfTracker } from '@/debug/perfTracker.js';
import * as DATA from '@/data/index.js';
import { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase, generatePassphrase, passphraseToId, getDeviceNonce } from '@/networking/index.js';
import { HEADWEAR_CATALOG, getHeadwear, setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { FACIALHAIR_CATALOG, getFacialHair, setFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { HAIR_CATALOG, getHair, setHair } from '@/rendering/traits/hairCatalog.js';
import { SKIN_CATALOG, PANTS_CATALOG, SHOES_CATALOG, getSkin, setSkin, getPants, setPants, getShoes, setShoes } from '@/rendering/playerSkins.js';
import { drawCharacterPortrait, prewarmPortraitDirs } from '@/rendering/characterPortrait.js';
import { HAIR_COLOR_CATALOG, getHairColor, setHairColor, hairColorTarget } from '@/rendering/traits/hairColorCatalog.js';
import { HAT_COLOR_CATALOG, getHatColor, setHatColor, hatColorTarget } from '@/rendering/traits/hatColorCatalog.js';
import { FACIALHAIR_COLOR_CATALOG, getFacialHairColor, setFacialHairColor, facialHairColorTarget } from '@/rendering/traits/facialHairColorCatalog.js';
import { SHIRT_CATALOG, getShirt, setShirt } from '@/rendering/traits/shirtCatalog.js';
import { SHIRT_COLOR_CATALOG, getShirtColor, setShirtColor, shirtColorTarget } from '@/rendering/traits/shirtColorCatalog.js';
import { getEquip, setEquip, onEquipChange, reconcileGearStash } from '@/rendering/gearCatalog.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
/* v2.3.765: combat helpers extracted behavior-frozen (docs/REBUILD-PLAN.md Phase 0). */
import { BUILD_LABELS, BUILD_ICONS, peerDmgKey, enqueuePeerDamage, releasePeerDamage, addBuildProg, addBuildUse, distributeKillXpToBuild, isAttackInShieldArc, trackMonsterDamage, applyMeleeLifesteal } from '@/game/combatHelpers.js';
/* v2.3.767: chat send + chat/emote handlers extracted behavior-frozen (REBUILD-PLAN Phase 2). */
import { sendChatMessage, handleChatEvent, handleEmoteEvent } from '@/game/chat.js';
/* v2.3.782: quest accept/turn-in transitions extracted behavior-frozen (REBUILD-PLAN Phase 3). */
import { acceptQuest, turnInQuest } from '@/game/quests.js';
/* v2.3.787: zone transitions (town exits, tile-9 return, dungeon entrance/exit)
   extracted behavior-frozen (REBUILD-PLAN Phase 6). */
import { handleZoneTransitions } from '@/game/zoneTransitions.js';
/* v2.3.789: desktop keyboard handlers extracted behavior-frozen (REBUILD-PLAN Phase 7). */
import { setupDesktopControls } from '@/game/desktopControls.js';
/* v2.3.809: per-zone mechanics extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 1). */
import { updateZoneMechanics } from '@/game/zoneMechanics.js';
/* v2.3.810: dungeon wave progression extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 2). */
import { updateDungeonWaves } from '@/game/dungeonWaves.js';
/* v2.3.811: monster AI + player-melee block extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 3). */
import { updateMonsterCombat } from '@/game/monsterCombat.js';
/* v2.3.812: ground-loot pickup block extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 4). */
import { updateGroundLootPickup } from '@/game/groundLoot.js';
/* v2.3.813: arrow + slime projectile sims extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 5). */
import { updateArrows, updateSlimeProjectiles } from '@/game/projectiles.js';
/* v2.3.814: pre-render visual-system updates extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 6). */
import { updateVisualSystems } from '@/game/visualSystems.js';
/* v2.3.815: per-frame state-cleanup block extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 7). */
import { updateStateCleanup } from '@/game/stateCleanup.js';
/* v2.3.816: render dispatch + sim/render perf split extracted behavior-frozen (REBUILD-PLAN Phase 8, slice 8). */
import { renderFrame } from '@/game/renderFrame.js';
/* v2.3.817: §5.8 contextual dodge/lunge/retreat cluster extracted behavior-frozen. */
import { triggerContextualDodge } from '@/game/dodge.js';
/* v2.3.819: swing/special/shield action bodies extracted; component keeps thin useCallback wrappers. */
import { swingAttack, specialAttack, raiseShield } from '@/game/playerActions.js';
/* v2.3.841: extraction + fishing/cooking/wood/mining reward bodies extracted; component keeps thin useCallback wrappers. */
import { startExtraction, succeedExtraction, applyCookingResult } from '@/game/lifeSkillRewards.js';
/* v2.3.842: emote + building-entry interaction bodies extracted; component keeps thin useCallback wrappers. */
import { sendEmote as sendEmoteImpl, enterBuilding as enterBuildingImpl } from '@/game/interactions.js';
/* v2.3.784: connection lifecycle extracted behavior-frozen (REBUILD-PLAN Phase 5);
   the Phase-4 dispatcher is now consumed by wsClient.js, not here. */
import { setupWebSocket } from '@/networking/wsClient.js';
import { applyZoneVariant, baseArchetypeOf, isFodderLike, incomingDmgScalarFor, usesClientSideMovement, isRemnantSkull, xpMultFor, MONSTER_VARIANTS, maybeTransformMonster } from '@/data/monsterVariants.js';
import { rollMonsterShard, rollHarvestShard, shardByKey } from '@/data/shards.js';

/* Destructure everything from DATA — the component body references 100+ symbols */
const {
  TILE, PLAYER_COLORS, ZONES, ELEMENTS, TOWN_BUILDINGS, TOWN_EXITS,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, RARITY_TIERS, BT_AUDIO, BT_ACHIEVEMENTS,
  BUILDINGS, NPC_DATA, TILE_SOLID, TILE_COLORS,
  updateZoneDimensions,
  STAT_POINTS_PER_LEVEL, LEVEL_CAP, GEAR_STAT_REQ,
  REFORGE_BONUSES, GEM_CUT_TIERS, COOKING_RECIPES,
  EMOTES, TEXT_EMOTES, MKT_CATEGORIES,
  PET_EVOLUTION_TIERS, FURNITURE_RECIPES,
  DUNGEON_TERRAIN_PACKS, DUNGEON_MONSTER_PACKS,
  MASKS, ELEMENTAL_MINIGAMES, MINIGAME_REWARDS,
  QUEST_CHAINS, QUEST_STATUS, REPUTATION,
  CLAN_COLORS, CLAN_CREATE_COST, CLAN_MAX_MEMBERS, CLAN_LOGO_SIZE, CLAN_TAG_MAX, CLAN_NAME_MAX,
  createMonster, createDefaultRpg, createDefaultLifeSkills, migrateLifeSkills,
  recalcDerived, getActiveWeapon, meleeSwingSfx, calcWeaponDmg, calcCritChance, calcCritMult,
  getWeaponCritStat, awardWeaponXp, migrateWeaponT2,
  migrateDefenseT2, awardDefenseXp, getDefenseBlockBonus, getIronSkinReduction,
  calcMoveSpeed, calcMaxHp, calcMaxStam, calcMaxMana, calcBlockReduction, getArmorHp,
  calcSpecialDmg, rollPassiveDodge,
  xpRequired, monsterStat, createDefaultCompStats,
  applyStatus, tickStatuses, getOldestStatusElement,
  lookupCollision, resolveCollision, getEffectiveness,
  getTileColor, generateZoneMap, spawnMonstersForZone, spawnGatherNodes, createGatherNode,
  drawMask, getStatVisuals, createDefaultClan,
  awardSkillXp, addLifeSkillXp, addResource, getResource, skillXpRequired,
  createMinigameInstance, createPet,
  rollReforgeBonus, hardenChance,
  getShieldBonus, getShieldStats, getAmuletBonus,
  getSalvageReturns, getAmuletSalvageReturns, gemExtractCost,
  getDungeonCreatorUnlocks, validateCustomDungeon, createDefaultDungeonConfig,
  hasUnlock, getNpcQuest,
  discoverMonster, discoverMaterial, discoverZone, discoverCollision,
  SHOP_PRICES, SHOP_ITEMS_FOR_SALE,
  getGuildRank, getGuildQuest, GUILD_RANKS, GUILD_QUESTS, SKILL_GUILDS,
  meetsStatReq, meetsGearReq, getGearStatReq, STAT_LABELS,
  LIFE_SKILLS, RESOURCE_TIERS, DEPTH_CONFIG, DEPTH_TIERS,
  FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS,
  ZONE_RESOURCES, GEM_DROP_RATES, GOLD_NUGGET_DROP,
  AMULET_TIERS, AMULET_GEM_STATS, SHIELD_GEM_STATS,
  NUGGETS_PER_BAR, SALVAGE_RETURN_RATE, GEM_EXTRACT_BASE_COST,
  ELEMENT_FLAVOR, flavorName, canAccessDepth,
  GAMBLE_WIN_CHANCE, GAMBLE_MIN_BET, GAMBLE_MAX_BET,
  JACKPOT_HOUSE_CUT, JACKPOT_MIN_DEPOSIT,
  RARE_DROP_CHANCE, RARE_DROP_ITEMS, QUEST_AP_REWARD,
  FEEDBACK_CATEGORIES, FEEDBACK_TOPICS,
  ARENA_ENTRY_FEE, ARENA_BET_MIN, ARENA_BET_MAX,
  ARENA_WIN_REWARD, ARENA_POLL_INTERVAL,
  MINIGAME_DURATION, MINIGAME_MIN_PLAYERS, MINIGAME_MAX_PLAYERS, MINIGAME_ENTRY_FEE,
  SLED_WOOD_COST, SLED_SPEED_MULT, SLED_DURATION,
  SNOWBALL_DMG_BASE, SNOWBALL_STUN_MS, SNOWBALL_CD, SNOWBALL_RANGE, SNOWBALL_SPEED,
  SNOWMAN_AGGRO_RADIUS, SNOWMAN_DURATION, SNOWMAN_SNOW_COST,
  TIDE_CYCLE_MS, RAFT_WOOD_COST, RAFT_WATER_SPEED, SWIM_SPEED_MULT,
  TORCH_WOOD_COST, TORCH_DURATION, TORCH_RADIUS_BASE, DARKNESS_RADIUS, ECHO_AGGRO_MULT,
  THREAT_BASE_DURATION, THREAT_PER_LEVEL_DIFF, THREAT_COOLDOWN,
  GUARD_CONFISCATION_TIME, GUARD_GOLD_LEVY,
  DIVE_MAX_AIR, DIVE_AIR_DRAIN, DIVE_AIR_REFILL, DIVE_DAMAGE_RATE,
  SPEED, ANIM_LERP, SAFE_ZONE_RADIUS, RESPAWN_INVULN,
  RESPAWN_BASE, RESPAWN_ESCALATE, RESPAWN_ESCALATE_WINDOW, RESPAWN_MAX,
  DEATH_SCATTER_RECOVERY, DEATH_GOLD_PENALTY, WEAPON_STASH_MAX,
  FARM_PLOT_MAX, WELL_RESTED_DURATION, WELL_RESTED_XP_MULT, HOUSE_SLEEP_MS,
  STATUS_DEFS, ARCHETYPES, COLLISION_TABLE,
  SWING_COOLDOWN, SWING_RANGE, SWING_ARC, SPECIAL_ATK_MULT,
  COMBO_BURST_BONUS, COMBO_SPREAD_RADIUS, COMBO_SPREAD_DURATION_MULT,
  COMBO_NEXT_DURATION_BONUS, COMBO_NEXT_WINDOW_MS, COMBO_GRACE_MULT,
  RESONANCE_WINDOW_RATIO, RESONANCE_STREAK_WINDOW_MS,
  LUNGE_DIRECTION_THRESHOLD, LUNGE_STAMINA_FRACTION, LUNGE_DAMAGE_MULT,
  LUNGE_DASH_FRAMES, LUNGE_DASH_PX_PER_FRAME, LUNGE_IFRAMES_MS,
  RETREAT_SHOT_STAMINA_FRACTION, RETREAT_SHOT_DAMAGE_MULT, RETREAT_STAFF_CONE_RAD,
  spawnWeaponHitFX, spawnElementStatusFX, getElementDeathFX, getCollisionDeathFX,
  MKT_TIERS, MKT_WOOD_TIERS, createMktOrder, matchMktOrders, estimateMktPrice,
  hasDungeonClear, getMaxDepth,
  discoveredCollisions, discoveredMonsters, discoveredMaterials, visitedZones,
  computeOpenDelay, EXTRACT_WINDOW_MS, EXTRACT_CANCEL_R,
} = DATA;

import { _regenerator, _regeneratorDefine2, _asyncToGenerator, _typeof, _slicedToArray, _toConsumableArray, _objectSpread, _defineProperty, _toPropertyKey, _toPrimitive, ownKeys, _arrayWithHoles, _iterableToArrayLimit, _unsupportedIterableToArray, _arrayLikeToArray, _nonIterableRest, _arrayWithoutHoles, _iterableToArray, _nonIterableSpread, _createForOfIteratorHelper, asyncGeneratorStep } from '@/lib/babelHelpers.js';

/* Expose all exports as globals for the pre-transpiled code.
   The original index.html had everything in one scope; this bridges the gap. */
Object.assign(globalThis, DATA);
Object.assign(globalThis, { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase, generatePassphrase, passphraseToId });
/* BT_API_BASE etc from networking — derive fresh each time */
var BT_API_BASE = (window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev').replace('wss://', 'https://').replace('ws://', 'http://');
var SUPA_URL = ''; var SUPA_KEY = ''; var supa = null;
Object.assign(globalThis, { BT_API_BASE, SUPA_URL, SUPA_KEY, supa });
Object.assign(globalThis, { _regenerator, _regeneratorDefine2, _asyncToGenerator, _typeof, _slicedToArray, _toConsumableArray, _objectSpread, _defineProperty, _toPropertyKey, _toPrimitive, ownKeys, _arrayWithHoles, _iterableToArrayLimit, _unsupportedIterableToArray, _arrayLikeToArray, _nonIterableRest, _arrayWithoutHoles, _iterableToArray, _nonIterableSpread, _createForOfIteratorHelper, asyncGeneratorStep });

export var BroTown = function BroTown(_ref0) {
  var _stateRef$current, _stateRef$current2, _minigameInstance$win, _minigameInstance$win2, _rpgState$lifeSkills3, _rpgState$lifeSkills4, _rpgState$lifeSkills5, _rpgState$lifeSkills6, _rpgState$lifeSkills0, _rpgState$weapon, _rpgState$rangedWeapo, _rpgState$armor, _rpgState$lifeSkills1, _ELEMENTS$rpgState$am2, _ELEMENTS$rpgState$sh2, _rpgState$lifeSkills14, _rpgState$lifeSkills18, _stateRef$current7, _rpgState$_compStats, _rpgState$_compStats2, _rpgState$_compStats3, _rpgState$_compStats4, _rpgState$_compStats5, _rpgState$_compStats6, _rpgState$_compStats7, _rpgState$_compStats8, _arenaStatus$currentM, _arenaStatus$currentM2, _arenaTournament$play5, _MKT_CATEGORIES$mktCa, _rpgState$lifeSkills21, _rpgState$lifeSkills29, _rpgState$lifeSkills33, _rpgState$lifeSkills36, _stateRef$current18, _stateRef$current19, _stateRef$current20, _stateRef$current$_sl, _stateRef$current21, _stateRef$current22, _stateRef$current$_fe, _stateRef$current23, _stateRef$current24, _stateRef$current$_sl2, _stateRef$current25, _clanData$members, _clanData$members2, _questPanel$npcRef, _incomingTrade$offer, _RARITY_TIERS$rpgStat, _rpgState$armor2, _rpgState$armor3, _rpgState$armor4, _AMULET_TIERS$rpgStat, _ELEMENTS$rpgState$am4, _ELEMENTS$rpgState$am5, _ELEMENTS$rpgState$am6, _BLACKSMITH_TIERS$rpg, _BLACKSMITH_TIERS$rpg2, _rpgState$lifeSkills37, _rpgState$lifeSkills38, _rpgState$lifeSkills39, _rpgState$lifeSkills40, _rpgState$lifeSkills42, _stateRef$current30, _REPUTATION$stateRef$, _REPUTATION$stateRef$2, _stateRef$current31, _ZONES, _stateRef$current33, _REPUTATION$inspectPl, _REPUTATION$inspectPl2, _inspectPlayer$bro$di, _inspectPlayer$rpgDat, _stateRef$current40, _stateRef$current41, _stateRef$current42, _stateRef$current43, _stateRef$current44, _stateRef$current45, _stateRef$current46, _stateRef$current47, _stateRef$current48, _stateRef$current49, _stateRef$current50, _stateRef$current51, _stateRef$current52, _stateRef$current53, _stateRef$current54, _stateRef$current55, _stateRef$current56, _stateRef$current57, _stateRef$current58, _stateRef$current$_ne, _stateRef$current$_ne2, _stateRef$current$_ne3, _stateRef$current$_ne4, _window$matchMedia, _window;
  var nfts = _ref0.nfts,
    onExit = _ref0.onExit;
  var canvasRef = useRef(null);
  var pixiRef = useRef(null);
  /* Promise that resolves once the local player's avatar assets (body,
     recolored skin, equipped gear for every direction, weapon, shield) are
     fully baked.  The intro overlay holds until this settles so the player
     never sees the armour->unarmoured flicker on first turn. */
  var introWaitRef = useRef(null);
  /* v2.3.831: the splash theme Audio lives in a ref (not a per-effect
     local) so it survives the splash->loading-screen transition and the
     IntroVideo can crossfade it into the town ambience. */
  var themeAudioRef = useRef(null);
  /* PixiJS is the only render path now — Canvas 2D fallback was
     removed once every system finished migrating.  If Pixi fails
     to init, the game logs the error and continues without a
     visible scene; users on devices that can't run WebGL will see
     a black canvas, which is preferable to maintaining 6000 lines
     of duplicate fallback code. */
  /* Player sprite sheets — 5 directional poses (east/north/northeast/south/
     southwest) × 2 modes (jog 8-frame, stand 1-frame). West/NW/SE are rendered
     by horizontal mirror at draw time. Map<key, {img, frames, w}> when loaded. */
  var playerSpritesRef = useRef(null);
  /* Slime monster sprite sheets — idle bob (6 × 128×128 = 768×128) and
     death splash (8 × 128×128 = 1024×128). Loaded once on mount, used
     in the fodder render branch + the death-effect renderer. */
  var slimeIdleImgRef = useRef(null);
  var slimeDeathImgRef = useRef(null);
  var slimeShootImgRef = useRef(null);
  var slimeHitImgRef = useRef(null);
  var slimeProjectileImgRef = useRef(null);
  var slimeRemnantsImgRef = useRef(null);
  /* Web Audio buffer + nodes for the slime proximity loop.  Created
     lazily on first need; gain scales with distance to nearest slime,
     gain goes to 0 when none in range.  Moved off HTMLAudio in v2.1.68
     because iOS Safari's HTMLAudio property accesses / play() promise
     work was firing between RAFs and causing rhythmic 60-80 ms stutter
     in zones with slimes (meadow, ember).  Same recipe as zone music. */
  var slimeIdleAudioRef = useRef({ buffer: null, source: null, gain: null });
  /* Per-zone themed-ground tile sheets — small repeatable swatches
     loaded from public/sprites/tiles/ground-<elem>.png and converted
     into CanvasPattern objects on first frame so the canvas-2D render
     can fill the floor with createPattern instead of a solid color. */
  /* Per-zone themed tree sprites — replaces the procedural trunk+canopy
     for tree gather-nodes when the current zone has a matching sheet
     loaded.  Keyed by zoneId (ember/mist/frost/etc.). */
  /* Singleton Audio element for the slime death splat — bypasses
     BT_AUDIO.playFile (cloneNode was failing silently on iOS).
     Reused per kill: set currentTime=0 then play(). */
  var slimeDeathAudioRef = useRef(null);
  /* Weapon sprite icons — sword / bow / staff. Drawn next to the character
     scaled down from the 64×64 source. Map<weapon-type, HTMLImageElement>. */
  var weaponSpritesRef = useRef(null);
  /* Per-frame right-hand anchor coords (0..64 in source-pixel space).
     Annotated via public/tools/anchor.html. Lets the weapon track the hand
     frame-by-frame instead of using a fixed facing-based offset. */
  var handAnchorsRef = useRef(null);
  /* Per-weapon handle pixel in the source weapon image (0..64).
     Annotated via public/tools/weapon-anchor.html. Without this we'd
     assume the handle is at bottom-center of the weapon image, which is
     wrong for diagonally-drawn sources. */
  var weaponHandlesRef = useRef(null);
  var stateRef = useRef({
    player: {
      x: 16 * TILE,
      y: 16 * TILE,
      vx: 0,
      vy: 0,
      dir: 'down'
    },
    others: {},
    camera: {
      x: 0,
      y: 0
    },
    keys: {},
    stickX: 0,
    stickY: 0,
    map: null,
    currentZone: 'town',
    /* zone ID — starts in town */
    chatLog: [],
    chatBubbles: {},
    /* {playerId: {text, ts}} */
    myId: Math.random().toString(36).slice(2, 10),
    myName: '',
    myColor: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
    myAvatar: null,
    myBroData: null,
    /* {ID, diScore, rank, tier} */
    channel: null,
    lastBroadcast: 0,
    emote: null,
    /* {emoji, ts} */
    nearBuilding: null,
    /* index into BUILDINGS or null */
    bodyTorso: '#2563eb',
    bodyLegs: '#1e3a5f',
    bodySize: 'slim',
    autoAttack: false,
    weapon: 'sword',
    arrows: [],
    _dodgeRoll: null,
    _aimAngle: null,
    _aimActive: false,
    trail: [],
    /* [{x,y,ts}] — position history for trail effect */
    collectibles: null,
    /* [{x,y,emoji,id,collected}] — scavenger hunt items */
    collectedIds: new Set(),
    /* IDs of collected items */
    score: 0,
    /* collectible score */
    npcs: null,
    /* NPC state array */
    /* RPG state */
    /* RPG state — GDD v8.0 two-tier stat system */
    rpg: null,
    /* created by createDefaultRpg() in useEffect */
    /* Legacy compat fields still read by some UI code: */
    /* rpg.str, rpg.def, rpg.vit, rpg.spd, rpg.lck, rpg.swordTier → mapped from new system */
    monsters: null,
    /* spawned monster instances via createMonster() */
    destroyedTrees: new Set(),
    /* 'col,row' keys of destroyed trees */
    fishTimer: 0,
    swingTimer: 0,
    /* cooldown */
    lockedTarget: null,
    /* {type:'monster'|'player', id, ref} */
    swingAngle: 0,
    /* current swing visual angle */
    isSwinging: false,
    dmgNumbers: [],
    /* [{x,y,text,color,ts}] */
    groundLoot: [],
    /* [{x,y,coins,xp,skull,skullEmoji,ts}] */
    hitParticles: [],
    /* blood/impact particles [{x,y,vx,vy,life,color,size}] */
    groundSplatter: [],
    /* persistent kill marks [{x,y,color,size,ts,element}] */
    screenShake: 0,
    /* shake intensity, decays to 0 */
    deathExplosions: [],
    /* [{x,y,ts,emoji,particles}] */
    _deathDrops: [],
    /* §5.5 [{zone,x,y,items,ts,expiry}] — scattered inventory from death */
    /* Zone-specific mechanic state */
    _snowballs: [],
    /* [{x,y,vx,vy,ts}] — in-flight snowballs */
    _snowmen: [],
    /* [{x,y,ts,hp}] — placed snowman decoys */
    _sled: null,
    /* {started,direction,speed} — active sled ride */
    _torch: null,
    /* {started,radius} — active torch in Deep Hollows */
    _raft: false,
    /* has player crafted a raft for Tidal Caves */
    lastDamageTaken: 0,
    /* timestamp of last damage for HP regen */
    respawnTimer: 0,
    /* invulnerability countdown */
    shieldActive: 0,
    /* timestamp when shield activated */
    shieldEnd: 0,
    /* when shield expires */
    stats: null,
    /* persistent player stats */
    badges: [] /* earned achievement IDs */
  });
  /* Expose state for autotest */
  window._gameState = stateRef;
  window._gameFns = {
    addLifeSkillXp: addLifeSkillXp,
    awardSkillXp: awardSkillXp,
    createMonster: createMonster,
    createDefaultLifeSkills: createDefaultLifeSkills,
    migrateLifeSkills: migrateLifeSkills,
    spawnMonstersForZone: spawnMonstersForZone,
    spawnGatherNodes: spawnGatherNodes,
    generateZoneMap: generateZoneMap,
    calcWeaponDmg: calcWeaponDmg,
    calcCritChance: calcCritChance,
    xpRequired: xpRequired,
    ZONES: ZONES,
    ELEMENTS: ELEMENTS,
    ARCHETYPES: ARCHETYPES,
    DEPTH_CONFIG: DEPTH_CONFIG,
    ZONE_RESOURCES: ZONE_RESOURCES,
    COOKING_RECIPES: COOKING_RECIPES,
    BLACKSMITH_TIERS: BLACKSMITH_TIERS,
    WOODWORKING_TIERS: WOODWORKING_TIERS,
    GEM_CUT_TIERS: GEM_CUT_TIERS,
    AMULET_TIERS: AMULET_TIERS,
    AMULET_GEM_STATS: AMULET_GEM_STATS,
    GOLD_NUGGET_DROP: GOLD_NUGGET_DROP,
    REFORGE_BONUSES: REFORGE_BONUSES,
    getAmuletBonus: getAmuletBonus,
    rollReforgeBonus: rollReforgeBonus,
    hardenChance: hardenChance,
    SHIELD_GEM_STATS: SHIELD_GEM_STATS,
    getShieldBonus: getShieldBonus,
    getShieldStats: getShieldStats,
    getSalvageReturns: getSalvageReturns,
    getAmuletSalvageReturns: getAmuletSalvageReturns,
    gemExtractCost: gemExtractCost,
    SALVAGE_RETURN_RATE: SALVAGE_RETURN_RATE,
    hasUnlock: hasUnlock,
    QUEST_CHAINS: QUEST_CHAINS,
    QUEST_STATUS: QUEST_STATUS,
    QUEST_AP_REWARD: QUEST_AP_REWARD,
    FISHING_TIERS: FISHING_TIERS,
    WOODCUTTING_TIERS: WOODCUTTING_TIERS,
    MINING_TIERS: MINING_TIERS,
    WEAPON_TYPES: WEAPON_TYPES,
    RARITY_TIERS: RARITY_TIERS,
    TILE: TILE,
    TOWN_BUILDINGS: TOWN_BUILDINGS,
    LIFE_SKILLS: LIFE_SKILLS,
    ELEMENT_FLAVOR: ELEMENT_FLAVOR,
    flavorName: flavorName,
    GEM_DROP_RATES: GEM_DROP_RATES,
    STAT_POINTS_PER_LEVEL: STAT_POINTS_PER_LEVEL,
    RESOURCE_TIERS: RESOURCE_TIERS,
    canAccessDepth: canAccessDepth
  };
  /* Restore persisted player on mount and after login */
  useEffect(function () {
    if (showLogin) return;
    /* Load clan data */
    try {
      var savedClan = JSON.parse(localStorage.getItem('bt_clan'));
      if (savedClan) {
        setClanData(savedClan);
        stateRef.current._clanData = savedClan;
      }
    } catch (e) {}
    try {
      var _saved4 = JSON.parse(localStorage.getItem('bt_player'));
      if (_saved4) {
        var S = stateRef.current;
        S.myName = _saved4.name || 'Anon';
        S.myAvatar = _saved4.avatar || null;
        S.myBroData = _saved4.bro || null;
        S.myColor = _saved4.color || S.myColor;
        S.bodyTorso = _saved4.bodyTorso || '#2563eb';
        S.bodySize = _saved4.bodySize || 'slim';
        S.bodyLegs = _saved4.bodyLegs || '#1e3a5f';
      }
      /* Load persistent stats */
      try {
        var stats = JSON.parse(localStorage.getItem('bt_stats'));
        var _S = stateRef.current;
        if (stats) {
          _S.stats = stats;
          _S.badges = stats.badges || [];
        } else {
          _S.stats = {
            steps: 0,
            msgsSent: 0,
            emotesUsed: 0,
            buildingsVisited: 0,
            totalCollected: 0,
            dailyCollected: 0,
            daysVisited: 1,
            timesInspected: 0,
            lastDay: '',
            badges: [],
            visitedBuildings: new Set(),
            /* Comprehensive tracking */
            kills: 0,
            deaths: 0,
            pvpKills: 0,
            pvpDeaths: 0,
            lawlessKills: 0,
            lawlessDeaths: 0,
            duelsWon: 0,
            duelsLost: 0,
            bossKills: 0,
            grandSlams: 0,
            totalDmgDealt: 0,
            totalDmgTaken: 0,
            totalHealed: 0,
            collisionsTriggered: 0,
            critsLanded: 0,
            fishCaught: 0,
            oresMined: 0,
            treesChopped: 0,
            cropsHarvested: 0,
            itemsCrafted: 0,
            itemsSalvaged: 0,
            cookingSuccesses: 0,
            cookingBurns: 0,
            reforgeAttempts: 0,
            hardenSuccesses: 0,
            hardenFailures: 0,
            goldEarnedTotal: 0,
            goldLostTotal: 0,
            goldGambled: 0,
            goldWonGambling: 0,
            petsCaptured: 0,
            questsCompleted: 0,
            highestMonsterKill: 0,
            deepestZone: 'shallow',
            rareFounds: 0,
            achievementPoints: 0,
            playTimeSeconds: 0,
            _sessionStart: Date.now()
          };
          _S.badges = [];
        }
        /* Track daily visits */
        var today = new Date().toDateString();
        if (_S.stats.lastDay !== today) {
          _S.stats.daysVisited = (_S.stats.daysVisited || 0) + 1;
          _S.stats.dailyCollected = 0;
          _S.stats.lastDay = today;
        }
      } catch (_unused9) {
        var _S2 = stateRef.current;
        _S2.stats = {
          steps: 0,
          msgsSent: 0,
          emotesUsed: 0,
          buildingsVisited: 0,
          totalCollected: 0,
          dailyCollected: 0,
          daysVisited: 1,
          timesInspected: 0,
          lastDay: new Date().toDateString(),
          badges: [],
          visitedBuildings: new Set(),
          kills: 0,
          deaths: 0,
          pvpKills: 0,
          pvpDeaths: 0,
          lawlessKills: 0,
          lawlessDeaths: 0,
          duelsWon: 0,
          duelsLost: 0,
          bossKills: 0,
          grandSlams: 0,
          totalDmgDealt: 0,
          totalDmgTaken: 0,
          totalHealed: 0,
          collisionsTriggered: 0,
          critsLanded: 0,
          fishCaught: 0,
          oresMined: 0,
          treesChopped: 0,
          cropsHarvested: 0,
          itemsCrafted: 0,
          itemsSalvaged: 0,
          cookingSuccesses: 0,
          cookingBurns: 0,
          reforgeAttempts: 0,
          hardenSuccesses: 0,
          hardenFailures: 0,
          goldEarnedTotal: 0,
          goldLostTotal: 0,
          goldGambled: 0,
          goldWonGambling: 0,
          petsCaptured: 0,
          questsCompleted: 0,
          highestMonsterKill: 0,
          deepestZone: 'shallow',
          rareFounds: 0,
          achievementPoints: 0,
          playTimeSeconds: 0,
          _sessionStart: Date.now()
        };
        _S2.badges = [];
      }
      /* Spawn outside the building we entered from */
      var lastBldg = localStorage.getItem('bt_lastBuilding');
      if (lastBldg !== null) {
        var bi = JSON.parse(lastBldg);
        var b = BUILDINGS[bi];
        if (b) {
          var _S3 = stateRef.current;
          /* Position below the building entrance */
          _S3.player.x = (b.bx + b.bw / 2) * TILE;
          _S3.player.y = (b.by + b.bh + 2) * TILE;
        }
        localStorage.removeItem('bt_lastBuilding');
      }
    } catch (e) {}
  }, [showLogin]);
  var _useState = useState(''),
    _useState2 = _slicedToArray(_useState, 2),
    chatInput = _useState2[0],
    setChatInput = _useState2[1];
  var chatInputValRef = useRef(''); /* mirror for canvas render loop */
  var chatInputRef = useRef(null);
  /* v2.3.772: WebGL-rebuild epoch.  iOS Safari reclaims the GPU context of
     backgrounded tabs and sometimes never restores it on resume (black
     world, and NO webglcontextlost event ever fires).  A lost context can
     never be re-acquired on the same <canvas> element, so the only real
     recovery is: remount the canvas (key'd on this epoch in the JSX) and
     re-run the game-loop effect (epoch in its dep list), which re-inits
     Pixi on the fresh element.  Game state lives in stateRef and the
     socket lives in its own effect -- both survive the rebuild. */
  var _useGlEpoch = useState(0),
    _useGlEpoch2 = _slicedToArray(_useGlEpoch, 2),
    glEpoch = _useGlEpoch2[0],
    setGlEpoch = _useGlEpoch2[1];
  var _useState3 = useState(false),
    _useState4 = _slicedToArray(_useState3, 2),
    chatOpen = _useState4[0],
    setChatOpen = _useState4[1];
  var _useState5 = useState(null),
    _useState6 = _slicedToArray(_useState5, 2),
    nearBuilding = _useState6[0],
    setNearBuilding = _useState6[1];
  var _useState7 = useState(false),
    _useState8 = _slicedToArray(_useState7, 2),
    showPlayerList = _useState8[0],
    setShowPlayerList = _useState8[1];
  var _useState9 = useState(null),
    _useState0 = _slicedToArray(_useState9, 2),
    inspectPlayer = _useState0[0],
    setInspectPlayer = _useState0[1]; /* {id, name, color, avatar, bro, x, y} */
  var _useState1 = useState([]),
    _useState10 = _slicedToArray(_useState1, 2),
    playerList = _useState10[0],
    setPlayerList = _useState10[1];
  var _useState11 = useState(false),
    _useState12 = _slicedToArray(_useState11, 2),
    showEmotes = _useState12[0],
    setShowEmotes = _useState12[1];
  var _useState13 = useState(false),
    _useState14 = _slicedToArray(_useState13, 2),
    showInfo = _useState14[0],
    setShowInfo = _useState14[1];
  /* v2.3.678: the old debug toggles (Armor ON/OFF top-left button + G hotkey,
     window.__btHideArmor) are retired -- armour visibility is now governed
     purely by the equip slots below, surfaced as inventory items in the
     Equipment menu. */
  /* Per-slot armour equip state (chest/legs) -- equip/unequip each gear slot
     live from the Equipment menu.  Mirrors gearCatalog.setEquip; default ids
     per slot. */
  var GEAR_DEFAULT_ID = { chest: 'steelplate', legs: 'steelgreaves', shirt: 'tshirt' };
  var _useStateGear = useState(function () {
    return { chest: getEquip('chest') !== 'none', legs: getEquip('legs') !== 'none', shirt: getEquip('shirt') !== 'none' };
  }),
    _useStateGear2 = _slicedToArray(_useStateGear, 2),
    gearWorn = _useStateGear2[0],
    setGearWorn = _useStateGear2[1];
  var toggleGearSlot = useCallback(function (slot) {
    setGearWorn(function (g) {
      var worn = !g[slot];
      setEquip(slot, worn ? GEAR_DEFAULT_ID[slot] : 'none');
      var ng = Object.assign({}, g);
      ng[slot] = worn;
      return ng;
    });
  }, []);
  /* v2.3.685: the dashboard Loadout can now equip/unequip the same gear slots
     (popup unequip -> bag).  Track external setEquip calls so this menu's
     WORN ARMOUR toggle reflects them instead of going stale. */
  useEffect(function () {
    var offs = ['chest', 'legs', 'shirt'].map(function (slot) {
      return onEquipChange(slot, function () {
        setGearWorn({ chest: getEquip('chest') !== 'none', legs: getEquip('legs') !== 'none', shirt: getEquip('shirt') !== 'none' });
      });
    });
    return function () { offs.forEach(function (off) { off(); }); };
  }, []);
  var _useState15 = useState([]),
    _useState16 = _slicedToArray(_useState15, 2),
    chatLog = _useState16[0],
    setChatLog = _useState16[1];
  var _useState17 = useState(false),
    _useState18 = _slicedToArray(_useState17, 2),
    showChatLog = _useState18[0],
    setShowChatLog = _useState18[1];
  var _useState19 = useState(0),
    _useState20 = _slicedToArray(_useState19, 2),
    unreadChats = _useState20[0],
    setUnreadChats = _useState20[1];
  var _useState21 = useState(0),
    _useState22 = _slicedToArray(_useState21, 2),
    collectScore = _useState22[0],
    setCollectScore = _useState22[1];
  var _useState23 = useState(null),
    _useState24 = _slicedToArray(_useState23, 2),
    collectMsg = _useState24[0],
    setCollectMsg = _useState24[1]; /* {emoji, text, ts} */
  var _useState25 = useState([]),
    _useState26 = _slicedToArray(_useState25, 2),
    myBadges = _useState26[0],
    setMyBadges = _useState26[1];
  var _useState27 = useState(null),
    _useState28 = _slicedToArray(_useState27, 2),
    achievementMsg = _useState28[0],
    setAchievementMsg = _useState28[1]; /* {icon, name, ts} */
  var _useState29 = useState(null),
    _useState30 = _slicedToArray(_useState29, 2),
    rpgState = _useState30[0],
    setRpgState = _useState30[1];
  var _useState31 = useState(false),
    _useState32 = _slicedToArray(_useState31, 2),
    showStatScreen = _useState32[0],
    setShowStatScreen = _useState32[1];
  var _useState33 = useState(false),
    _useState34 = _slicedToArray(_useState33, 2),
    showEncyclopedia = _useState34[0],
    setShowEncyclopedia = _useState34[1];
  var _useState35 = useState('bestiary'),
    _useState36 = _slicedToArray(_useState35, 2),
    encyclopediaTab = _useState36[0],
    setEncyclopediaTab = _useState36[1]; /* 'bestiary' | 'codex' | 'materials' | 'zones' */
  var _useState37 = useState(null),
    _useState38 = _slicedToArray(_useState37, 2),
    dungeonCreator = _useState38[0],
    setDungeonCreator = _useState38[1]; /* custom dungeon config being edited */
  var _useState39 = useState('design'),
    _useState40 = _slicedToArray(_useState39, 2),
    dungeonCreatorTab = _useState40[0],
    setDungeonCreatorTab = _useState40[1]; /* 'design' | 'monsters' | 'store' | 'play' */
  var _useState41 = useState(false),
    _useState42 = _slicedToArray(_useState41, 2),
    showDungeonCreator = _useState42[0],
    setShowDungeonCreator = _useState42[1];
  var _useState43 = useState(false),
    _useState44 = _slicedToArray(_useState43, 2),
    showLeaderboard = _useState44[0],
    setShowLeaderboard = _useState44[1];
  var _useState45 = useState('level'),
    _useState46 = _slicedToArray(_useState45, 2),
    leaderboardTab = _useState46[0],
    setLeaderboardTab = _useState46[1]; /* 'level'|'lifeskills'|'ap'|'kills'|'dungeons'|'gold'|'playtime' */
  var _useState47 = useState('buy'),
    _useState48 = _slicedToArray(_useState47, 2),
    mktMode = _useState48[0],
    setMktMode = _useState48[1]; /* 'buy' | 'sell' */
  var _useState49 = useState('weapon'),
    _useState50 = _slicedToArray(_useState49, 2),
    mktCategory = _useState50[0],
    setMktCategory = _useState50[1];
  var _useState51 = useState('greatsword'),
    _useState52 = _slicedToArray(_useState51, 2),
    mktSubtype = _useState52[0],
    setMktSubtype = _useState52[1];
  var _useState53 = useState('iron'),
    _useState54 = _slicedToArray(_useState53, 2),
    mktTier = _useState54[0],
    setMktTier = _useState54[1];
  var _useState55 = useState(null),
    _useState56 = _slicedToArray(_useState55, 2),
    mktElement1 = _useState56[0],
    setMktElement1 = _useState56[1];
  var _useState57 = useState(null),
    _useState58 = _slicedToArray(_useState57, 2),
    mktElement2 = _useState58[0],
    setMktElement2 = _useState58[1];
  var _useState59 = useState(100),
    _useState60 = _slicedToArray(_useState59, 2),
    mktPrice = _useState60[0],
    setMktPrice = _useState60[1];
  var _useState61 = useState([]),
    _useState62 = _slicedToArray(_useState61, 2),
    mktOrders = _useState62[0],
    setMktOrders = _useState62[1]; /* combined local + remote orders */
  var _useState63 = useState(null),
    _useState64 = _slicedToArray(_useState63, 2),
    mktSellItem = _useState64[0],
    setMktSellItem = _useState64[1]; /* stash index for sell */
  var _useState65 = useState(false),
    _useState66 = _slicedToArray(_useState65, 2),
    showPetHouse = _useState66[0],
    setShowPetHouse = _useState66[1];
  var _useState67 = useState('pets'),
    _useState68 = _slicedToArray(_useState67, 2),
    petHouseTab = _useState68[0],
    setPetHouseTab = _useState68[1]; /* 'pets' | 'evolve' | 'enchant' */
  var _useState69 = useState(null),
    _useState70 = _slicedToArray(_useState69, 2),
    petEvolve1 = _useState70[0],
    setPetEvolve1 = _useState70[1]; /* pet index for evolution slot 1 */
  var _useState71 = useState(null),
    _useState72 = _slicedToArray(_useState71, 2),
    petEvolve2 = _useState72[0],
    setPetEvolve2 = _useState72[1]; /* pet index for evolution slot 2 */
  var _useState73 = useState(false),
    _useState74 = _slicedToArray(_useState73, 2),
    showFurniture = _useState74[0],
    setShowFurniture = _useState74[1];
  var _useState75 = useState(false),
    _useState76 = _slicedToArray(_useState75, 2),
    showClanWar = _useState76[0],
    setShowClanWar = _useState76[1];
  var _useState77 = useState(false),
    _useState78 = _slicedToArray(_useState77, 2),
    showArena = _useState78[0],
    setShowArena = _useState78[1];
  var _useState79 = useState(null),
    _useState80 = _slicedToArray(_useState79, 2),
    arenaStatus = _useState80[0],
    setArenaStatus = _useState80[1]; /* {status:'none'|'queued'|'fighting'|'eliminated', ...} */
  var _useState81 = useState(null),
    _useState82 = _slicedToArray(_useState81, 2),
    arenaTournament = _useState82[0],
    setArenaTournament = _useState82[1];
  var _useState83 = useState([]),
    _useState84 = _slicedToArray(_useState83, 2),
    arenaHistory = _useState84[0],
    setArenaHistory = _useState84[1];
  var _useState85 = useState(false),
    _useState86 = _slicedToArray(_useState85, 2),
    showGuildPanel = _useState86[0],
    setShowGuildPanel = _useState86[1];
  var _useState87 = useState('woodcutting'),
    _useState88 = _slicedToArray(_useState87, 2),
    guildSkill = _useState88[0],
    setGuildSkill = _useState88[1]; /* which guild is selected */
  var _useState89 = useState(100),
    _useState90 = _slicedToArray(_useState89, 2),
    arenaBetAmount = _useState90[0],
    setArenaBetAmount = _useState90[1];
  var _useState91 = useState(null),
    _useState92 = _slicedToArray(_useState91, 2),
    arenaBetTarget = _useState92[0],
    setArenaBetTarget = _useState92[1]; /* playerId bet on */
  var _useState93 = useState([]),
    _useState94 = _slicedToArray(_useState93, 2),
    arenaBets = _useState94[0],
    setArenaBets = _useState94[1]; /* [{playerId, amount, targetPlayerId, ts}] */
  var _useState95 = useState(false),
    _useState96 = _slicedToArray(_useState95, 2),
    showFeedback = _useState96[0],
    setShowFeedback = _useState96[1];
  var _useState97 = useState('browse'),
    _useState98 = _slicedToArray(_useState97, 2),
    feedbackTab = _useState98[0],
    setFeedbackTab = _useState98[1]; /* 'browse' | 'submit' */
  var _useState99 = useState('top'),
    _useState100 = _slicedToArray(_useState99, 2),
    feedbackSort = _useState100[0],
    setFeedbackSort = _useState100[1];
  var _useState101 = useState(null),
    _useState102 = _slicedToArray(_useState101, 2),
    feedbackTopic = _useState102[0],
    setFeedbackTopic = _useState102[1];
  var _useState103 = useState(null),
    _useState104 = _slicedToArray(_useState103, 2),
    feedbackCategory = _useState104[0],
    setFeedbackCategory = _useState104[1];
  var _useState105 = useState([]),
    _useState106 = _slicedToArray(_useState105, 2),
    feedbackTickets = _useState106[0],
    setFeedbackTickets = _useState106[1];
  var _useState107 = useState(''),
    _useState108 = _slicedToArray(_useState107, 2),
    feedbackText = _useState108[0],
    setFeedbackText = _useState108[1];
  var _useState109 = useState('combat'),
    _useState110 = _slicedToArray(_useState109, 2),
    feedbackSubmitTopic = _useState110[0],
    setFeedbackSubmitTopic = _useState110[1];
  var _useState111 = useState('add'),
    _useState112 = _slicedToArray(_useState111, 2),
    feedbackSubmitCategory = _useState112[0],
    setFeedbackSubmitCategory = _useState112[1];
  var _useState113 = useState(false),
    _useState114 = _slicedToArray(_useState113, 2),
    showMinigame = _useState114[0],
    setShowMinigame = _useState114[1];
  var _useState115 = useState(null),
    _useState116 = _slicedToArray(_useState115, 2),
    minigameInstance = _useState116[0],
    setMinigameInstance = _useState116[1];
  var _useState117 = useState(0),
    _useState118 = _slicedToArray(_useState117, 2),
    minigameScore = _useState118[0],
    setMinigameScore = _useState118[1];
  var _useState119 = useState(0),
    _useState120 = _slicedToArray(_useState119, 2),
    minigameTick = _useState120[0],
    setMinigameTick = _useState120[1];
  /* Close all menus — enforce single menu open at a time */
  var closeAllMenus = function closeAllMenus() {
    setShowStatScreen(false);
    setShowInventory(false);
    setShowSkills(false);
    setShowClanPanel(false);
    setShowSocialPanel(false);
    setShowEmotes(false);
    setShowInfo(false);
    setShowShop(false);
    setShowEncyclopedia(false);
    setShowLeaderboard(false);
    setShowGuildPanel(false);
    setShowFeedback(false);
  };
  /* §15 Onboarding — tutorial teaches by doing */
  var _useState123 = useState(function () {
      try {
        return parseInt(localStorage.getItem('bt_tutorial')) || 0;
      } catch (_unused0) {
        return 0;
      }
    }),
    _useState124 = _slicedToArray(_useState123, 2),
    tutorialStep = _useState124[0],
    setTutorialStep = _useState124[1];
  /* Keep tutorialStep on stateRef so the game loop (which doesn't re-mount on state change) reads the live value */
  stateRef.current._tutorialStep = tutorialStep;
  var _useState125 = useState(false),
    _useState126 = _slicedToArray(_useState125, 2),
    showInventory = _useState126[0],
    setShowInventory = _useState126[1];
  var _useState127 = useState(null),
    _useState128 = _slicedToArray(_useState127, 2),
    selectedItem = _useState128[0],
    setSelectedItem = _useState128[1]; /* {key, emoji, name} */
  var _useState129 = useState(false),
    _useState130 = _slicedToArray(_useState129, 2),
    showSkills = _useState130[0],
    setShowSkills = _useState130[1];
  var _useState131 = useState(false),
    _useState132 = _slicedToArray(_useState131, 2),
    showShop = _useState132[0],
    setShowShop = _useState132[1];
  var _useState133 = useState(null),
    _useState134 = _slicedToArray(_useState133, 2),
    buildingPanel = _useState134[0],
    setBuildingPanel = _useState134[1]; /* 'shop'|'bank'|'enchant'|'cook'|'farm'|'party'|'exchange'|'forge'|'gemcut'|'woodwork' */
  var _useState135 = useState(null),
    _useState136 = _slicedToArray(_useState135, 2),
    cookMinigame = _useState136[0],
    setCookMinigame = _useState136[1]; /* {fishKey, fishName, healAmt, tier, started, result} */
  var _useState137 = useState(0),
    _useState138 = _slicedToArray(_useState137, 2),
    cookTick = _useState138[0],
    setCookTick = _useState138[1]; /* forces re-render for minigame animation */
  React.useEffect(function () {
    if (!cookMinigame || cookMinigame.result) return;
    var id = setInterval(function () {
      return setCookTick(function (t) {
        return t + 1;
      });
    }, 50); /* 20fps animation */
    return function () {
      return clearInterval(id);
    };
  }, [cookMinigame === null || cookMinigame === void 0 ? void 0 : cookMinigame.started, cookMinigame === null || cookMinigame === void 0 ? void 0 : cookMinigame.result]);
  var _useState139 = useState(null),
    _useState140 = _slicedToArray(_useState139, 2),
    questPanel = _useState140[0],
    setQuestPanel = _useState140[1]; /* {npc, quest, status} or null */
  var _useState149 = useState(null),
    _useState150 = _slicedToArray(_useState149, 2),
    duelRequest = _useState150[0],
    setDuelRequest = _useState150[1]; /* {fromId, fromName, ts} or null */
  var _useState151 = useState(0),
    _useState152 = _slicedToArray(_useState151, 2),
    duelWager = _useState152[0],
    setDuelWager = _useState152[1]; /* gold wager for duels */
  var _useState153 = useState(null),
    _useState154 = _slicedToArray(_useState153, 2),
    threatIncoming = _useState154[0],
    setThreatIncoming = _useState154[1]; /* {fromId, fromName, fromLevel, ts, countdown, responded} */
  var _useState155 = useState(null),
    _useState156 = _slicedToArray(_useState155, 2),
    threatOutgoing = _useState156[0],
    setThreatOutgoing = _useState156[1]; /* {targetId, ts, cooldownUntil} */
  var _useState157 = useState(null),
    _useState158 = _slicedToArray(_useState157, 2),
    clanData = _useState158[0],
    setClanData = _useState158[1]; /* clan object or null */
  var _useState159 = useState(false),
    _useState160 = _slicedToArray(_useState159, 2),
    showClanPanel = _useState160[0],
    setShowClanPanel = _useState160[1];
  var _useState161 = useState(false),
    _useState162 = _slicedToArray(_useState161, 2),
    clanCreateMode = _useState162[0],
    setClanCreateMode = _useState162[1];
  var _useState163 = useState(function () {
      try {
        return JSON.parse(localStorage.getItem('bt_friends')) || [];
      } catch (e) {
        return [];
      }
    }),
    _useState164 = _slicedToArray(_useState163, 2),
    friendsList = _useState164[0],
    setFriendsList = _useState164[1];
  var _useState165 = useState(function () {
      try {
        return JSON.parse(localStorage.getItem('bt_blocked')) || [];
      } catch (e) {
        return [];
      }
    }),
    _useState166 = _slicedToArray(_useState165, 2),
    blockedList = _useState166[0],
    setBlockedList = _useState166[1];
  var _useState167 = useState(function () {
      try {
        return JSON.parse(localStorage.getItem('bt_muted')) || [];
      } catch (e) {
        return [];
      }
    }),
    _useState168 = _slicedToArray(_useState167, 2),
    mutedList = _useState168[0],
    setMutedList = _useState168[1];
  var _useState169 = useState(false),
    _useState170 = _slicedToArray(_useState169, 2),
    showSocialPanel = _useState170[0],
    setShowSocialPanel = _useState170[1];
  var _useState171 = useState(false),
    _useState172 = _slicedToArray(_useState171, 2),
    showTrade = _useState172[0],
    setShowTrade = _useState172[1];
  var _useState173 = useState(null),
    _useState174 = _slicedToArray(_useState173, 2),
    tradeTarget = _useState174[0],
    setTradeTarget = _useState174[1]; /* {id, name} */
  var _useState175 = useState({}),
    _useState176 = _slicedToArray(_useState175, 2),
    tradeOffer = _useState176[0],
    setTradeOffer = _useState176[1]; /* {item_key: qty} */
  var _useState177 = useState({}),
    _useState178 = _slicedToArray(_useState177, 2),
    tradeRequest = _useState178[0],
    setTradeRequest = _useState178[1]; /* what we want */
  var _useState179 = useState(null),
    _useState180 = _slicedToArray(_useState179, 2),
    incomingTrade = _useState180[0],
    setIncomingTrade = _useState180[1]; /* received offer */
  var _useState181 = useState([]),
    _useState182 = _slicedToArray(_useState181, 2),
    campfires = _useState182[0],
    setCampfires = _useState182[1]; /* [{x,y,ts}] */
  var _useState183 = useState(null),
    _useState184 = _slicedToArray(_useState183, 2),
    levelUpMsg = _useState184[0],
    setLevelUpMsg = _useState184[1];
  /* v2.3.153: expose the setter to module-scope helpers
     (pushStatIncreaseNotice, addBuildProg) so they can fire the big
     LEVEL UP banner with kind=stat for build-stat ticks. Setter ref
     is stable across renders for useState so this is idempotent. */
  if (typeof window !== 'undefined') window._setLevelUpMsg = setLevelUpMsg;
  var _useState185 = useState(1),
    _useState186 = _slicedToArray(_useState185, 2),
    playerCount = _useState186[0],
    setPlayerCount = _useState186[1];
  var _useState187 = useState(false),
    _useState188 = _slicedToArray(_useState187, 2),
    joinFlash = _useState188[0],
    setJoinFlash = _useState188[1];
  /* Simple welcome screen — always show (fresh session each time) */
  var _useState189 = useState(true),
    _useState190 = _slicedToArray(_useState189, 2),
    showWelcome = _useState190[0],
    setShowWelcome = _useState190[1];
  /* Bro Town intro video — overlays the game for ~4 s after character
     creation (fades out at 3 s).  Town music starts during the video. */
  var _useState229 = useState(false),
    _useState230 = _slicedToArray(_useState229, 2),
    showIntro = _useState230[0],
    setShowIntro = _useState230[1];
  var showLogin = false; /* disabled — no passphrase system */
  var showNameModal = showWelcome;
  var _useState191 = useState(''),
    _useState192 = _slicedToArray(_useState191, 2),
    nameInput = _useState192[0],
    setNameInput = _useState192[1];
  var _useState193 = useState(null),
    _useState194 = _slicedToArray(_useState193, 2),
    selectedAvatar = _useState194[0],
    setSelectedAvatar = _useState194[1];
  var _useState195 = useState(''),
    _useState196 = _slicedToArray(_useState195, 2),
    nftIdInput = _useState196[0],
    setNftIdInput = _useState196[1];
  var _useState197 = useState(null),
    _useState198 = _slicedToArray(_useState197, 2),
    nftLookup = _useState198[0],
    setNftLookup = _useState198[1]; /* {ID, Image, broType} or null */
  var _useState199 = useState(false),
    _useState200 = _slicedToArray(_useState199, 2),
    nftLoading = _useState200[0],
    setNftLoading = _useState200[1];
  var _useState201 = useState(''),
    _useState202 = _slicedToArray(_useState201, 2),
    nftError = _useState202[0],
    setNftError = _useState202[1];
  /* Headwear picker selection (login screen). Mirrors the headwearCatalog
     store so the on-screen highlight updates; setHeadwear() persists +
     tells the renderer to swap textures. */
  var _hwSelState = useState(getHeadwear()),
    headwearSel = _hwSelState[0],
    setHeadwearSel = _hwSelState[1];
  var _fhSelState = useState(getFacialHair()),
    facialHairSel = _fhSelState[0],
    setFacialHairSel = _fhSelState[1];
  var _hairSelState = useState(getHair()),
    hairSel = _hairSelState[0],
    setHairSel = _hairSelState[1];
  var _skinSelState = useState(getSkin()),
    skinSel = _skinSelState[0],
    setSkinSel = _skinSelState[1];
  var _hairColorSelState = useState(getHairColor()),
    hairColorSel = _hairColorSelState[0],
    setHairColorSel = _hairColorSelState[1];
  var _hatColorSelState = useState(getHatColor()),
    hatColorSel = _hatColorSelState[0],
    setHatColorSel = _hatColorSelState[1];
  var _beardColorSelState = useState(getFacialHairColor()),
    beardColorSel = _beardColorSelState[0],
    setBeardColorSel = _beardColorSelState[1];
  var _shirtSelState = useState(getShirt()),
    shirtSel = _shirtSelState[0],
    setShirtSel = _shirtSelState[1];
  var _shirtColorSelState = useState(getShirtColor()),
    shirtColorSel = _shirtColorSelState[0],
    setShirtColorSel = _shirtColorSelState[1];
  var _pantsSelState = useState(getPants()),
    pantsSel = _pantsSelState[0],
    setPantsSel = _pantsSelState[1];
  var _shoesSelState = useState(getShoes()),
    shoesSel = _shoesSelState[0],
    setShoesSel = _shoesSelState[1];
  /* Which appearance-picker category is active.  v2.3.797: single active
     tab string (replaces the v2.3.711 accordion's expanded-map) — the
     tabs+drawer creator always shows exactly one category; 'hat' is the
     landing tab. */
  var _catState = useState('hat'),
    activeCat = _catState[0],
    setActiveCat = _catState[1];
  /* v2.3.834: per-category flag set the first time the user taps an object
     in that category this session.  The color menu only appears once this
     is set (owner: hide colors until an object is picked, so the object
     grid gets the full drawer width by default). */
  var _objPickState = useState({}),
    objPicked = _objPickState[0],
    setObjPicked = _objPickState[1];
  var markObjPicked = function (k) { setObjPicked(function (p) { if (p[k]) return p; var n = Object.assign({}, p); n[k] = true; return n; }); };
  /* v2.3.835: per-category open/collapsed state for the object grid and the
     color grid.  Picking an object collapses its grid to just that pick
     (checkmark) and opens the colors; picking a color collapses the color
     grid to that swatch; tapping a collapsed pick re-expands its grid.
     Absent key === open (the default on first view). */
  var _objOpenState = useState({}), objOpen = _objOpenState[0], setObjOpen = _objOpenState[1];
  var _colOpenState = useState({}), colOpen = _colOpenState[0], setColOpen = _colOpenState[1];
  /* Live character preview on the login screen -- redraws whenever any
     cosmetic selection (or the preview angle) changes. */
  var previewCanvasRef = useRef(null);
  /* v2.3.711: drag-to-rotate -- horizontal swipes on the preview canvas step
     the facing every 26px of travel; the corner buttons remain for
     discoverability.  Holds the last x where a step fired. */
  var _dragRotX = useRef(null);
  /* Which of the 8 compass directions the preview faces; rotate buttons step
     through them.  Clockwise order. */
  var _PREVIEW_DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];
  var _previewDirState = useState('southwest'),
    previewDir = _previewDirState[0],
    setPreviewDir = _previewDirState[1];
  var rotatePreview = function (step) {
    var i = _PREVIEW_DIRS.indexOf(previewDir);
    if (i < 0) i = 0;
    setPreviewDir(_PREVIEW_DIRS[(i + step + _PREVIEW_DIRS.length) % _PREVIEW_DIRS.length]);
  };
  useEffect(function () {
    if (!previewCanvasRef.current) return;
    drawCharacterPortrait(previewCanvasRef.current, {
      dir: previewDir,
      skin: skinSel, pants: pantsSel, shoes: shoesSel,
      hair: hairSel, hairColor: hairSel === 'long' ? null : hairColorTarget(hairColorSel),
      facialHair: facialHairSel, facialHairColor: facialHairColorTarget(beardColorSel),
      headwear: headwearSel, hatColor: hatColorTarget(hatColorSel),
      shirt: shirtSel, shirtColor: shirtColorTarget(shirtColorSel),
    });
    /* v2.3.715: warm the other 7 angles for whatever is selected NOW, so
       rotating never waits on the network. */
    prewarmPortraitDirs({ hair: hairSel, facialHair: facialHairSel, headwear: headwearSel });
  }, [previewDir, skinSel, pantsSel, shoesSel, hairSel, hairColorSel, facialHairSel, beardColorSel, headwearSel, hatColorSel, shirtSel, shirtColorSel]);
  /* v2.3.715: the welcome modal is dead network time -- start pulling the
     heavy in-game sheets (network/decode only; the CPU bakes still run
     behind the intro overlay via preloadPlayerAssets in joinTown) and warm
     the intro clip so it starts instantly on PLAY.  The video element is
     held in a ref so the prefetch isn't garbage-collected mid-download. */
  var _introWarmRef = useRef(null);
  useEffect(function () {
    if (!showNameModal) return;
    /* v2.3.717: prewarm DELAYED 2.5s -- kicking it immediately had the
       game sheets racing the welcome screen's own theme art for
       bandwidth, which is exactly the "modal loads slow" complaint.
       Let the visible UI finish dressing first. */
    var t = setTimeout(function () {
      try { prewarmBaseSheets(); } catch (e) {}
      try {
        var v = document.createElement('video');
        v.preload = 'auto';
        v.muted = true;
        v.src = '/intro/brotown-intro.mp4';
        v.load();
        _introWarmRef.current = v;
      } catch (e) {}
    }, 2500);
    return function () { clearTimeout(t); };
  }, [showNameModal]);
  /* v2.3.722: torch crackle, extracted from the owner's flame clip.
     Browsers refuse un-muted autoplay, so it arms on the modal's first
     pointerdown (any tap counts), loops quietly, and stops when the
     modal closes (PLAY). */
  useEffect(function () {
    if (!showNameModal) return;
    var au = null;
    var start = function () {
      try {
        au = new Audio('/ui/welcome/torch-crackle.m4a');
        au.loop = true;
        au.volume = 0.22;
        au.play().catch(function () {});
      } catch (e) {}
    };
    window.addEventListener('pointerdown', start, { once: true });
    return function () {
      window.removeEventListener('pointerdown', start);
      try { if (au) { au.pause(); au.src = ''; au = null; } } catch (e) {}
    };
  }, [showNameModal]);
  /* v2.3.830: splash theme music (owner's chiptune adventure track).  Same
     autoplay-policy dance as the torch crackle — browsers block un-muted
     autoplay, so it arms on the modal's first pointerdown and loops.
     v2.3.831: it now KEEPS PLAYING through the loading screen (held in
     themeAudioRef, not stopped on the modal's cleanup); IntroVideo
     crossfades it into the town ambience at the transition.  start() is a
     no-op if the theme is already armed so re-renders don't double it. */
  useEffect(function () {
    if (!showNameModal) return;
    var start = function () {
      try {
        if (themeAudioRef.current) return;
        var au = new Audio('/ui/welcome/theme.m4a');
        au.loop = true;
        au.volume = 0.4;
        au.play().catch(function () {});
        themeAudioRef.current = au;
      } catch (e) {}
    };
    window.addEventListener('pointerdown', start, { once: true });
    return function () {
      window.removeEventListener('pointerdown', start);
      /* deliberately NOT stopping the theme here — it carries into the
         loading screen; IntroVideo (or the skip-intro path) hands it off. */
    };
  }, [showNameModal]);
  /* The long-hair sprite is ~88% pure black, so a light hair color over-
     processes into a black band around the face (see characterPortrait recolor
     note).  Restrict that one style to dark colors only; clamp the selection
     back to default if a style switch or a returning player leaves it light. */
  var LONG_HAIR_COLORS = ['black'];
  useEffect(function () {
    if (hairSel === 'long' && LONG_HAIR_COLORS.indexOf(hairColorSel) === -1) {
      setHairColor(LONG_HAIR_COLORS[0]); setHairColorSel(LONG_HAIR_COLORS[0]);
    }
  }, [hairSel]);
  /* Category picker helpers: shared tile primitives for the tabs-and-
     drawer creator (v2.3.797 vertical-flow redesign) — thumbnail tiles for
     styles, color chips for colors; the current pick gets a gold ring and
     a check badge. */
  var _apTileStyle = function (sel, size) {
    /* v2.3.731: lighter tile wells (dark thumbs like black hair were
       invisible on the old near-black tiles) + gold ring on the pick.
       v2.3.742: white/light-gray CHECKER wells (owner request).
       v2.3.800: checker -> soft light-gray GRADIENT (owner request) —
       still light enough that dark art silhouettes; selection still
       rides on the gold ring + badge. */
    return { width: size, height: size, flex: '0 0 auto', padding: 2, cursor: 'pointer', boxSizing: 'border-box',
      position: 'relative', borderRadius: 8,
      background: 'linear-gradient(180deg,#f4f5f8,#cdd2dc)',
      border: sel ? '2px solid var(--gold)' : '1.5px solid #56499a',
      display: 'flex', alignItems: 'center', justifyContent: 'center' };
  };
  /* v2.3.711: explicit checkmark badge on the picked tile -- the purple
     highlight alone was ambiguous next to the purple-ish swatches. */
  var _checkBadge = function () {
    return /*#__PURE__*/React.createElement("span", { key: 'ck', style: { position: 'absolute', right: -2, bottom: -2, width: 14, height: 14, borderRadius: '50%', background: 'var(--pop)', border: '1px solid #fff', color: '#fff', fontSize: 9, lineHeight: '12px', textAlign: 'center', fontWeight: 800, pointerEvents: 'none' } }, "✓");
  };
  var _swatchTile = function (opt, selId, onSet, size, thumbCat, thumbItem) {
    /* The 'default' option = keep the item's original color (no recolor).
       v2.3.711: the old diagonal-slash cue read poorly (owner feedback).
       Now: trait colors (hat/hair/beard/shirt) pass thumbCat/thumbItem and
       the default tile shows the selected item's own thumbnail in its
       original colors -- "this is what you get".  Body colors (skin/pants/
       shoes) keep a plain swatch: their catalog 'default' swatches ARE the
       sprite's native colors, so the swatch is accurate as-is. */
    var sel = selId === opt.id;
    var inner = opt.id === 'default' && thumbCat && thumbItem && thumbItem !== 'none'
      ? /*#__PURE__*/React.createElement("img", { src: '/sprites/traits/' + thumbCat + '/' + thumbItem + '/thumb.png?v=' + BUILD_INFO.version, alt: 'Original', style: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' } })
      : /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: '100%', borderRadius: 5, background: opt.swatch, border: '1px solid rgba(0,0,0,0.35)', boxSizing: 'border-box' } });
    return /*#__PURE__*/React.createElement("button", {
      key: 'c_' + opt.id, type: 'button', title: opt.id === 'default' ? 'Original color' : opt.name,
      onClick: function () { onSet(opt.id); }, style: _apTileStyle(sel, size || 32)
    }, inner, sel ? _checkBadge() : null);
  };
  var _thumbTile = function (cat, opt, selId, onSet, size) {
    var sz = size || 50;
    var sel = selId === opt.id;
    return /*#__PURE__*/React.createElement("button", {
      key: 's_' + opt.id, type: 'button', title: opt.name,
      onClick: function () { onSet(opt.id); }, style: _apTileStyle(sel, sz)
    }, opt.id === 'none'
      ? /*#__PURE__*/React.createElement("div", { style: { width: sz - 14, height: sz - 14, borderRadius: '50%', border: '2px dashed var(--line)', boxSizing: 'border-box' } })
      : /*#__PURE__*/React.createElement("img", { src: '/sprites/traits/' + cat + '/' + opt.id + '/thumb.png?v=' + BUILD_INFO.version, alt: opt.name, style: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' } }),
    sel ? _checkBadge() : null);
  };
  /* v2.3.797: the collapsed-pill kit (_swOf/_miniThumb/_miniSwatch summary
     previews, _chevron, _pillBox/_pillLabel chrome and the _apPill
     accordion itself — the v2.3.710-735 rail era) is retired: the
     vertical-flow redesign renders categories as text tabs with one
     shared drawer, inline in the modal JSX.  The tile helpers above
     (_apTileStyle/_checkBadge/_swatchTile/_thumbTile) carry over
     unchanged. */
  var randomizeAppearance = function () {
    var rpick = function (c) { return c[Math.floor(Math.random() * c.length)].id; };
    var sk = rpick(SKIN_CATALOG); setSkin(sk); setSkinSel(sk);
    var pt = rpick(PANTS_CATALOG); setPants(pt); setPantsSel(pt);
    var sh = rpick(SHOES_CATALOG); setShoes(sh); setShoesSel(sh);
    var hr = rpick(HAIR_CATALOG); setHair(hr); setHairSel(hr);
    var hcCat = hr === 'long' ? HAIR_COLOR_CATALOG.filter(function (c) { return LONG_HAIR_COLORS.indexOf(c.id) >= 0; }) : HAIR_COLOR_CATALOG;
    var hcc = rpick(hcCat); setHairColor(hcc); setHairColorSel(hcc);
    var bd = rpick(FACIALHAIR_CATALOG); setFacialHair(bd); setFacialHairSel(bd);
    var bcc = rpick(FACIALHAIR_COLOR_CATALOG); setFacialHairColor(bcc); setBeardColorSel(bcc);
    var st = rpick(SHIRT_CATALOG); setShirt(st); setShirtSel(st);
    var stc = rpick(SHIRT_COLOR_CATALOG); setShirtColor(stc); setShirtColorSel(stc);
    var ht = rpick(HEADWEAR_CATALOG); setHeadwear(ht); setHeadwearSel(ht);
    var htc = rpick(HAT_COLOR_CATALOG); setHatColor(htc); setHatColorSel(htc);
  };
  /* v2.3.711: RANDOMIZE rolls a few quick looks before settling -- the
     slot-machine beat makes the button feel fun instead of a dry reroll. */
  var randomizeWithFlair = function () {
    randomizeAppearance();
    var n = 0;
    var t = setInterval(function () { randomizeAppearance(); if (++n >= 3) clearInterval(t); }, 110);
  };
  /* v2.3.711: dice button beside the name box -- naming is the spot players
     freeze on.  Longest combo is 16 chars, inside the 20-char input cap. */
  /* v2.3.747: 100 x 100 pools = 10,000 combos (owner request).  Keep
     firsts <=8 and lasts <=9 chars so the longest combo stays inside the
     20-char input cap; the two lists share no words (no 'Savage Savage'). */
  var _NAME_FIRST = [
    'Brad', 'Chad', 'Turbo', 'Mega', 'Big', 'Lil', 'Iron', 'Captain', 'Duke', 'Rad',
    'Ultra', 'Gnarly', 'Sir', 'Lord', 'Baron', 'Diesel', 'Buck', 'Rex', 'Hank', 'Bruno',
    'Atlas', 'Rowdy', 'Beefy', 'Wild', 'Epic', 'Grand', 'Slick', 'Macho', 'Heavy', 'Stone',
    'Young', 'Crispy', 'Major', 'Frosty', 'Salty', 'Thicc', 'Swift', 'Mighty', 'Brave', 'Bold',
    'Noble', 'Royal', 'Golden', 'Shadow', 'Crimson', 'Cosmic', 'Mystic', 'Arcane', 'Coach', 'Sarge',
    'General', 'Colonel', 'Cadet', 'Rookie', 'Elder', 'Primal', 'Feral', 'Grumpy', 'Spicy', 'Smoky',
    'Chunky', 'Husky', 'Burly', 'Brawny', 'Jacked', 'Ripped', 'Buff', 'Alpha', 'Sigma', 'Omega',
    'Prime', 'Apex', 'Zesty', 'Saucy', 'Toasty', 'Drippy', 'Steely', 'Bronze', 'Cobalt', 'Onyx',
    'Dusty', 'Rusty', 'Stormy', 'Sunny', 'Lunar', 'Solar', 'Astro', 'Hyper', 'Nitro', 'Laser',
    'Cyber', 'Retro', 'Disco', 'Funky', 'Groovy', 'Jolly', 'Cranky', 'Feisty', 'Sneaky', 'Jumbo'];
  var _NAME_LAST = [
    'Bro', 'Flex', 'Gains', 'Smash', 'Thunder', 'Blaze', 'Dozer', 'Knuckles', 'Storm', 'Hammer',
    'Biceps', 'Swole', 'Crusher', 'Punch', 'Wreck', 'Fury', 'Quake', 'Steel', 'Granite', 'Pecs',
    'Cardio', 'Protein', 'Slam', 'Clutch', 'Bolt', 'Rumble', 'Savage', 'Grit', 'Boulder', 'Bash',
    'Stomp', 'Quads', 'Deltoid', 'Mullet', 'Burrito', 'Nugget', 'Lats', 'Traps', 'Mauler', 'Brawler',
    'Slugger', 'Bruiser', 'Clobber', 'Wallop', 'Haymaker', 'Uppercut', 'Suplex', 'Bodyslam', 'Headlock', 'Gunshow',
    'Deadlift', 'Squats', 'Bench', 'Curls', 'Burpee', 'Whey', 'Macros', 'Bulk', 'Shred', 'Dragon',
    'Griffin', 'Phoenix', 'Hydra', 'Kraken', 'Cyclops', 'Titan', 'Golem', 'Ogre', 'Wyvern', 'Chimera',
    'Valor', 'Glory', 'Legend', 'Quest', 'Rune', 'Aegis', 'Bastion', 'Citadel', 'Vanguard', 'Warpath',
    'Tsunami', 'Cyclone', 'Tempest', 'Inferno', 'Wildfire', 'Magma', 'Ember', 'Glacier', 'Blizzard', 'Monsoon',
    'Zephyr', 'Taco', 'Nacho', 'Brisket', 'Gravy', 'Waffle', 'Meatball', 'Pickle', 'Jerky', 'Mohawk'];
  var rollRandomName = function () {
    var p = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    setNameInput(p(_NAME_FIRST) + ' ' + p(_NAME_LAST));
  };
  var nftCatalogRef = useRef(null); /* cached CSV data [{ID,Image,...}] */
  var _useState203 = useState('#2563eb'),
    _useState204 = _slicedToArray(_useState203, 2),
    bodyTorsoColor = _useState204[0],
    setBodyTorsoColor = _useState204[1];
  var _useState205 = useState('slim'),
    _useState206 = _slicedToArray(_useState205, 2),
    bodyWidth = _useState206[0],
    setBodyWidth = _useState206[1];
  var _useState207 = useState('#1e3a5f'),
    _useState208 = _slicedToArray(_useState207, 2),
    bodyLegColor = _useState208[0],
    setBodyLegColor = _useState208[1];
  var avatarPool = useMemo(function () {
    if (!nfts || !nfts.length) return [];
    var top = _toConsumableArray(nfts).sort(function (a, b) {
      return b.diScore - a.diScore;
    }).slice(0, 50);
    var shuffled = _toConsumableArray(top).sort(function () {
      return Math.random() - .5;
    });
    return shuffled.slice(0, 8);
  }, [nfts]);

  /* ═══ NFT ID LOOKUP — fetches CSV from GitHub repo ═══ */
  var NFT_CSV_URL = 'https://raw.githubusercontent.com/hemibroscommunity-del/Hemi-Bros-catalogue/main/Hemi%20Bro%20spreadsheet-CleanDataWithImages.csv';
  var lookupNftById = useCallback(/*#__PURE__*/function () {
    var _ref1 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(id) {
      var numId, fromProp, resp, text, lines, header, idIdx, imgIdx, typeIdx, catalog, i, cols, found, _t2;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            numId = parseInt(id, 10);
            if (!(isNaN(numId) || numId < 1)) {
              _context3.n = 1;
              break;
            }
            setNftError('Enter a valid NFT ID (1-6666)');
            return _context3.a(2);
          case 1:
            setNftLoading(true);
            setNftError('');
            _context3.p = 2;
            if (!(nfts && nfts.length > 0)) {
              _context3.n = 3;
              break;
            }
            fromProp = nfts.find(function (n) {
              return n.ID === numId;
            });
            if (!fromProp) {
              _context3.n = 3;
              break;
            }
            setNftLookup(fromProp);
            setNftError('');
            setNftLoading(false);
            return _context3.a(2);
          case 3:
            if (nftCatalogRef.current) {
              _context3.n = 11;
              break;
            }
            _context3.n = 4;
            return fetch(NFT_CSV_URL);
          case 4:
            resp = _context3.v;
            if (resp.ok) {
              _context3.n = 5;
              break;
            }
            throw new Error('Failed to fetch NFT catalog');
          case 5:
            _context3.n = 6;
            return resp.text();
          case 6:
            text = _context3.v;
            lines = text.split('\n');
            header = lines[0].split(',');
            idIdx = header.indexOf('ID');
            imgIdx = header.indexOf('Image');
            typeIdx = header.indexOf('Bro Type');
            catalog = {};
            i = 1;
          case 7:
            if (!(i < lines.length)) {
              _context3.n = 10;
              break;
            }
            if (lines[i].trim()) {
              _context3.n = 8;
              break;
            }
            return _context3.a(3, 9);
          case 8:
            cols = lines[i].split(',');
            if (cols[idIdx]) catalog[parseInt(cols[idIdx], 10)] = {
              ID: parseInt(cols[idIdx], 10),
              Image: cols[imgIdx],
              broType: cols[typeIdx] || ''
            };
          case 9:
            i++;
            _context3.n = 7;
            break;
          case 10:
            nftCatalogRef.current = catalog;
          case 11:
            found = nftCatalogRef.current[numId];
            if (!found) {
              setNftError('NFT #' + numId + ' not found');
              setNftLookup(null);
            } else {
              setNftLookup(found);
              setNftError('');
            }
            _context3.n = 13;
            break;
          case 12:
            _context3.p = 12;
            _t2 = _context3.v;
            console.warn('NFT lookup failed:', _t2);
            setNftError('Could not load catalog. Check connection.');
          case 13:
            setNftLoading(false);
          case 14:
            return _context3.a(2);
        }
      }, _callee3, null, [[2, 12]]);
    }));
    return function (_x11) {
      return _ref1.apply(this, arguments);
    };
  }(), [nfts]);
  var frameRef = useRef(0);

  /* Send chat message — input-widget concerns stay here; the network/state
     body lives in src/game/chat.js (v2.3.767, REBUILD-PLAN Phase 2). */
  var sendChat = useCallback(function () {
    var text = chatInput.trim();
    if (!text) return;
    sendChatMessage(stateRef.current, text, { setChatLog: setChatLog });
    setChatInput('');
    chatInputValRef.current = '';
    /* Keep keyboard open by re-focusing */
    requestAnimationFrame(function () {
      if (chatInputRef.current) chatInputRef.current.focus();
    });
  }, [chatInput]);
  /* Ambient background music — gentle chiptune loop */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    var melody = [262, 294, 330, 294, 262, 330, 392, 330, 262, 294, 330, 392, 440, 392, 330, 294];
    var noteIdx = 0;
    var interval = setInterval(function () {
      if (!BT_AUDIO.muted && BT_AUDIO.ctx) {
        BT_AUDIO.bgNote(melody[noteIdx % melody.length], 0.6);
      }
      noteIdx++;
    }, 1800);
    return function () {
      return clearInterval(interval);
    };
  }, [showNameModal, showLogin]);
  /* Weapon-swap bar (WeaponSwapBar.jsx) publishes the requested slot here;
     mirror it into rpgState so the rKnob emoji + getActiveWeapon callers
     pick up the change. weaponSwapBus already mutates window._gameState
     directly so game-loop logic flips immediately on tap. */
  useEffect(function () {
    return weaponSwapBus.subscribe(function (slot) {
      var S = stateRef.current;
      if (!S || !S.rpg) return;
      S.rpg.activeSlot = slot;
      setRpgState(_objectSpread({}, S.rpg));
    });
  }, []);
  /* Load player sprite sheets once, on mount. Per-direction frame counts
     and cycle durations differ — east source video is ~1 s, north/south
     ~2 s. Storing intervalMs per sheet lets each direction animate at its
     native speed instead of forcing a uniform tick. */
  useEffect(function () {
    /* Source clip durations (ms), used to compute per-direction frame interval. */
    var JOG_DURATION_MS = {
      east: 1333, north: 2008, northeast: 1503, south: 2000, southwest: 1998,
    };
    var JOG_FRAMES = 24;
    /* Hit-react sheets: 6 frames × 64×64 each (384×64), played once over
       250 ms (≈ 24 fps source) when the player takes damage. The character
       is locked from movement/actions during this window — see the
       playerStunned check in the input section. */
    var HIT_FRAMES = 6;
    var HIT_DURATION_MS = 250;
    var sheets = {};
    var dirs = ['east', 'north', 'northeast', 'south', 'southwest'];
    var poses = ['stand', 'jog', 'hit'];
    var total = dirs.length * poses.length, loaded = 0;
    poses.forEach(function (pose) {
      dirs.forEach(function (dir) {
        var img = new Image();
        img.onload = function () {
          var frames = pose === 'jog' ? JOG_FRAMES : pose === 'hit' ? HIT_FRAMES : 1;
          var intervalMs = pose === 'jog' ? JOG_DURATION_MS[dir] / JOG_FRAMES
                          : pose === 'hit' ? HIT_DURATION_MS / HIT_FRAMES
                          : 1000;
          sheets[pose + '-' + dir] = { img: img, frames: frames, w: 64, intervalMs: intervalMs };
          loaded++;
          if (loaded === total) playerSpritesRef.current = sheets;
        };
        img.onerror = function () { loaded++; if (loaded === total) playerSpritesRef.current = sheets; };
        /* Cache-buster: bump v= each time sheet content or frame count changes. */
        img.src = '/sprites/player/' + pose + '-' + dir + '.png?v=43'; /* v43: regenerated NE jog cycle (v2.3.708) */
      });
    });

    /* Weapon icons. Map weapon.type → image. Greatsword shares the sword
       icon. */
    var wsheets = {};
    var wMap = {
      sword:      '/sprites/weapons/swords/Sword1.png',
      greatsword: '/sprites/weapons/swords/Sword1.png',
      bow:        '/sprites/weapons/bows/Bow2.png',
      staff:      '/sprites/weapons/staffs/Wizard%20Staff2.png',
    };
    var wTotal = Object.keys(wMap).length, wLoaded = 0;
    Object.keys(wMap).forEach(function (type) {
      var wImg = new Image();
      wImg.onload = function () {
        wsheets[type] = wImg;
        wLoaded++;
        if (wLoaded === wTotal) weaponSpritesRef.current = wsheets;
      };
      wImg.onerror = function () { wLoaded++; if (wLoaded === wTotal) weaponSpritesRef.current = wsheets; };
      wImg.src = wMap[type] + '?v=1';
    });

    /* Per-frame hand anchors (built by the public/tools/anchor.html annotator).
       Bump ?v= when re-annotating so cached copies don't shadow the new file. */
    fetch('/sprites/player/anchors.json?v=3')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) handAnchorsRef.current = j; })
      .catch(function () { /* missing file — sprite falls back to facing-based offset */ });

    /* Per-weapon handle pixel (built by public/tools/weapon-anchor.html).
       Without this the renderer assumes the handle is at the bottom-center
       of the weapon image — wrong for diagonally-drawn sources. */
    fetch('/sprites/weapons/handles.json?v=1')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) weaponHandlesRef.current = j; })
      .catch(function () { /* missing — fall back to bottom-center */ });

    /* Slime monster sprites — idle bob loop + death splash.  Sheets are
       128 px tall; renderer reads frame count from naturalWidth / 128
       so we can swap in new sheets with different frame counts without
       touching render code (v4 was 8 frames, v5 is 24 frames). */
    var slimeIdle = new Image();
    slimeIdle.onload = function () { slimeIdleImgRef.current = slimeIdle; };
    slimeIdle.src = '/sprites/monsters/slime-idle-v5.png';
    var slimeDeath = new Image();
    slimeDeath.onload = function () { slimeDeathImgRef.current = slimeDeath; };
    slimeDeath.src = '/sprites/monsters/slime-death-v10.png';
    /* Shoot/attack animation — same 8-frame sheet shape as idle/death.
       Plays briefly when the slime lunges at the player so the attack
       cadence reads visually. */
    var slimeShoot = new Image();
    slimeShoot.onload = function () { slimeShootImgRef.current = slimeShoot; };
    slimeShoot.src = '/sprites/monsters/slime-shoot-v2.png';
    /* Hit-reaction sheet — squash anim plays for 250 ms when a fodder
       slime takes damage. Priority order in render: hit > shoot > idle. */
    var slimeHit = new Image();
    slimeHit.onload = function () { slimeHitImgRef.current = slimeHit; };
    slimeHit.src = '/sprites/monsters/slime-hit-v1.png';
    /* Projectile (single-frame orb) and remnants splat (single-frame
       ground splatter for the inventory pickup drop). */
    var slimeProj = new Image();
    slimeProj.onload = function () { slimeProjectileImgRef.current = slimeProj; };
    slimeProj.src = '/sprites/monsters/slime-projectile-v1.png';
    var slimeRem = new Image();
    slimeRem.onload = function () { slimeRemnantsImgRef.current = slimeRem; };
    slimeRem.src = '/sprites/monsters/slime-remnants-v1.png';

    /* Zone swatch + tree-sprite loaders removed — those were used
       only by the Canvas 2D rendering path (gather-node procedural
       tree replacement, ground-tile pattern fill).  The Pixi tile
       renderer pulls art from public/maps/<zone>_v4.jpg directly
       and the gather nodes are sprite-based via tileAssets. */

    /* Tiled maps — fire-and-forget preload so the renderer can pick
       them up as soon as they arrive. Once each map resolves, stash
       its walkability grid on stateRef so isSolid() can consult it. */
    preloadAllTiledMaps().then(function () {
      var S = stateRef.current;
      if (!S) return;
      S._tiledWalkable = S._tiledWalkable || {};
      Object.keys(TILED_ZONE_MAPS).forEach(function (zid) {
        var grid = getWalkability(zid);
        if (grid) S._tiledWalkable[zid] = grid;
      });
    });

    /* Image-zone walkability JSONs (e.g. town, where the painted yellow
       overlay was processed offline into a 32x32 boolean grid).  Stored
       on the same _tiledWalkable map isSolid() already consults. */
    loadWalkabilityMaps().then(function (grids) {
      var S = stateRef.current;
      if (!S) return;
      S._tiledWalkable = S._tiledWalkable || {};
      Object.keys(grids).forEach(function (zid) {
        S._tiledWalkable[zid] = grids[zid];
      });
    });
  }, []);

  /* Slime proximity-audio loop.  Tick every 80 ms: find nearest alive
     fodder monster within SLIME_AUDIO_RANGE, scale gain by inverse
     distance (closer = louder, max 0.5).  Routed through Web Audio
     (BT_AUDIO.ctx) — the previous HTMLAudio path's property accesses
     and play() promise work were firing between RAFs and caused the
     rhythmic 60-80 ms stutter shown in IMG_8281/8282 (zones with
     slimes: meadow, ember).  Same recipe as zone music: fetch +
     decodeAudioData once, then a single looping BufferSource whose
     gain we modulate. */
  useEffect(function () {
    var SLIME_AUDIO_RANGE = 250;
    var SLIME_AUDIO_VOL_MAX = 0.5;
    var URL = '/audio/slime-idle.mp3';
    var slot = slimeIdleAudioRef.current;
    var loadBuffer = function () {
      if (slot.buffer || slot._loading || !BT_AUDIO.ctx) return;
      slot._loading = true;
      fetch(URL)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return BT_AUDIO.ctx.decodeAudioData(ab); })
        .then(function (buf) { slot.buffer = buf; slot._loading = false; })
        .catch(function () { slot._loading = false; });
    };
    var ensureSource = function () {
      if (slot.source || !slot.buffer || !BT_AUDIO.ctx) return;
      try {
        var src = BT_AUDIO.ctx.createBufferSource();
        var gain = BT_AUDIO.ctx.createGain();
        src.buffer = slot.buffer;
        src.loop = true;
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(BT_AUDIO._out()); /* v2.3.786: through the master bus */
        src.start(0);
        slot.source = src;
        slot.gain = gain;
      } catch (e) {}
    };
    loadBuffer();
    var id = setInterval(function () {
      var S = stateRef.current;
      if (!S || !S.player || !S.monsters || BT_AUDIO.muted) return;
      if (!BT_AUDIO.ctx) return;
      var nearest = Infinity;
      for (var i = 0; i < S.monsters.length; i++) {
        var m = S.monsters[i];
        if (!m.alive) continue;
        var arch = m.archetype || m.type || 'fodder';
        if (arch !== 'fodder') continue;
        var dx = m.x - S.player.x, dy = m.y - S.player.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearest) nearest = d;
      }
      if (nearest <= SLIME_AUDIO_RANGE) {
        if (!slot.buffer) { loadBuffer(); return; }
        ensureSource();
        if (slot.gain) {
          var vol = SLIME_AUDIO_VOL_MAX * (1 - nearest / SLIME_AUDIO_RANGE);
          slot.gain.gain.value = Math.max(0, Math.min(SLIME_AUDIO_VOL_MAX, vol));
        }
      } else if (slot.gain) {
        slot.gain.gain.value = 0;
      }
    }, 80);
    return function () {
      clearInterval(id);
      try { if (slot.source) slot.source.stop(); } catch (e) {}
      slot.source = null;
      slot.gain = null;
    };
  }, []);

  /* Prevent iOS page scroll + track keyboard height */
  var wrapRef = useRef(null);
  useEffect(function () {
    if (showNameModal || showLogin) return;
    /* Lock the page so iOS can't scroll it */
    var orig = {
      htmlOF: document.documentElement.style.overflow,
      bodyOF: document.body.style.overflow,
      bodyPos: document.body.style.position,
      bodyW: document.body.style.width,
      bodyH: document.body.style.height
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    /* ═══ iOS KEYBOARD FIX ═══ */
    /* Lock the game wrapper to the initial viewport height. When the iOS keyboard opens,
       it fires a visualViewport resize — we ignore it and keep our fixed height.
       The keyboard overlays on top; the game never moves. */
    var el = wrapRef.current;
    var initialHeight = window.innerHeight;
    if (el) el.style.height = initialHeight + 'px';

    /* On iOS, the visual viewport shrinks when keyboard opens. We counteract by
       keeping our wrapper at the original height and scrolling the body to top. */
    var handleResize = function handleResize() {
      if (el) el.style.height = initialHeight + 'px';
    };

    /* Also handle orientation changes — re-lock to new height */
    var handleOrientationChange = function handleOrientationChange() {
      setTimeout(function () {
        var newHeight = window.innerHeight;
        if (el) el.style.height = newHeight + 'px';
      }, 300); /* delay for iOS to settle */
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return function () {
      document.documentElement.style.overflow = orig.htmlOF;
      document.body.style.overflow = orig.bodyOF;
      document.body.style.position = orig.bodyPos;
      document.body.style.width = orig.bodyW;
      document.body.style.height = orig.bodyH;
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [showNameModal, showLogin]);
  /* Initialize WebSocket connection to Durable Objects game server.
     v2.3.784: the ~1,560-line effect body moved verbatim to
     src/networking/wsClient.js setupWebSocket (REBUILD-PLAN Phase 5);
     ctx carries the closure captures it used to take from this scope. */
  useEffect(function () {
    return setupWebSocket({
      stateRef: stateRef,
      showNameModal: showNameModal,
      showLogin: showLogin,
      setPlayerCount: setPlayerCount,
      setChatLog: setChatLog,
      setUnreadChats: setUnreadChats,
      setJoinFlash: setJoinFlash,
      setRpgState: setRpgState,
      setLevelUpMsg: setLevelUpMsg,
      setDuelRequest: setDuelRequest,
      setThreatIncoming: setThreatIncoming,
      setIncomingTrade: setIncomingTrade,
      setArenaTournament: setArenaTournament,
      setArenaBets: setArenaBets,
      pixiRef: pixiRef
    });
  }, [showNameModal, showLogin]);

  /* ═══ Server stats_update sync ═══
     The worker tracks HP authoritatively but doesn't know our derived
     stats (maxHp / def / amulet hpRegen / restoration).  Whenever
     rpgState changes (equipment, stat allocation, level-up), we push
     a stats_update so the worker's damage math and regen tick stay
     consistent with the client's view.  Debounced via React's
     coalesced state updates -- one emit per render commit.

     Signature dedupe: rpgState changes on every player_state
     received (which is at minimum every regen tick when below max),
     and stats_update triggers a server-side player_state response,
     creating a feedback loop that doubled WS traffic.  Now we only
     emit when the signature actually changes. */
  useEffect(function () {
    if (!rpgState) return;
    var S = stateRef.current;
    if (!S || !S.channel) return;
    /* v2.3.227 (Phase 1): the old `def` damage-reduction formula is
       retired.  Armor now contributes flat HP via getArmorHp() inside
       recalcDerived(), so the stats payload no longer carries def.
       Send 0 on the wire to keep any older worker that still reads
       def from crashing on a missing field. */
    var def = 0;
    var amuBon = rpgState._amuletBonus || null;
    var amuletHpRegen = (amuBon && amuBon.stat === 'hpRegen') ? (amuBon.value || 0) : 0;
    var amuletStaminaRegen = (amuBon && amuBon.stat === 'staminaRegen') ? (amuBon.value || 0) : 0;
    var _sig = [
      rpgState.maxHp || 100, rpgState.maxStamina || 100, rpgState.maxMana || 100,
      def, amuletHpRegen, amuletStaminaRegen,
      rpgState.power || 0, rpgState.vitality || 0, rpgState.endurance || 0,
      rpgState.agility || 0, rpgState.mind || 0, rpgState.ferocity || 0,
      rpgState.elementalMastery || 0, rpgState.fortification || 0,
      rpgState.restoration || 0, rpgState.influence || 0,
      /* v2.3.236: include armor in the dedupe so armor swaps trigger
         a fresh stats_update -- otherwise the worker's view of armor
         goes stale and its echoed player_state silently re-equips. */
      rpgState.armor ? JSON.stringify(rpgState.armor) : 'noarmor',
    ].join('|');
    if (S._lastStatsUpdateSig === _sig) return;
    S._lastStatsUpdateSig = _sig;
    try {
      S.channel.send({
        type: 'stats_update',
        payload: {
          /* maxHp / maxStamina / maxMana ignored by worker since v2.3.79
             -- server tracks raw stats below and computes its own maxes
             from the formula.  Kept on the wire for backward compat with
             any older worker that hasn't been deployed yet. */
          maxHp: rpgState.maxHp || 100,
          maxStamina: rpgState.maxStamina || 100,
          maxMana: rpgState.maxMana || 100,
          /* Equipment-derived (still client-trusted because amulet
             store isn't server-migrated yet). */
          def: def,
          amuletHpRegen: amuletHpRegen,
          amuletStaminaRegen: amuletStaminaRegen,
          /* v2.3.236: armor object (or null on unequip) -- worker
             clamps tierMult + recomputes maxHp via _armorHp.  Without
             this the armorStash flow is purely local and the worker's
             ps.armor stays stale. */
          armor: rpgState.armor || null,
          /* Raw stats — worker clamps each to level * 10 + 20.  Cheater
             pushing R.vitality = 99999 gets clamped on the server,
             which then recomputes maxHp from the clamped value.  T1
             use-trained increments + amulet stat bonuses still land. */
          power: rpgState.power || 0,
          vitality: rpgState.vitality || 0,
          endurance: rpgState.endurance || 0,
          agility: rpgState.agility || 0,
          mind: rpgState.mind || 0,
          ferocity: rpgState.ferocity || 0,
          elementalMastery: rpgState.elementalMastery || 0,
          fortification: rpgState.fortification || 0,
          restoration: rpgState.restoration || 0,
          influence: rpgState.influence || 0,
        },
      });
    } catch (e) {}
  }, [rpgState]);


  /* ═══ GAME LOOP — Full simulation + PixiJS/Canvas 2D rendering ═══ */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    var canvas = canvasRef.current;
    if (!canvas) return;
    var S = stateRef.current;

    /* Canvas resize.  Reserve 25vh at the bottom for the BottomDashboard
       so the playfield doesn't draw underneath it.  The camera follows the
       player, so a shorter canvas just means less peripheral world is
       visible — the player stays centered. */
    var vv = window.visualViewport;
    /* DASH_FRAC must stay in sync with the --dash-h CSS variable in
       src/styles/game.css.  Both express the bottom-dashboard fraction
       of the viewport. */
    var DASH_FRAC = 0.28;
    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var vw = vv ? vv.width : window.innerWidth;
      var vhFull = vv ? vv.height : window.innerHeight;
      /* iOS keyboard fix: when the chat input pops the keyboard,
         visualViewport.height shrinks by ~300 px while window.innerHeight
         stays at the original value.  Detect that gap and SKIP the
         canvas resize so the canvas stays full-size — the keyboard
         then floats over the canvas like an overlay instead of
         shifting the scene up and exposing a black bar at the bottom. */
      if (vv && window.innerHeight - vhFull > 100) return;
      var vh = Math.max(120, Math.round(vhFull * (1 - DASH_FRAC)));
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
    }
    /* Pre-size the canvas BEFORE Pixi init so pixiApp's createPixiApp
       reads non-zero clientWidth/Height (it falls back to those if the
       attribute width/height aren't set, and at first useEffect run the
       canvas is fresh from React with both undefined). */
    resize();
    window.addEventListener('resize', resize);
    if (vv) vv.addEventListener('resize', resize);
    var resizeObs = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (resizeObs && canvas.parentElement) resizeObs.observe(canvas.parentElement);

    /* Initialize PixiJS renderer (async).  By this point the canvas has
       been resized so createPixiApp reads non-zero clientWidth/Height.
       No fallback path — if Pixi fails to init, the game logs and the
       canvas stays black. */
    if (!pixiRef.current) {
      initPixiRenderer(canvas).then(function(renderer) {
        pixiRef.current = renderer;
        /* v2.3.130: also publish to window so module-distant code
           (gameLoop, panels, ws handlers) can call renderer methods
           like flushAllLoot without ref plumbing.  Mirrors __pixiActive. */
        window._pixiRenderer = renderer;
        window.__pixiActive = true;
        /* v2.3.774: detect the silent Canvas-renderer fallback.  When iOS
           refuses a WebGL context under GPU pressure, createPixiApp falls
           back to Pixi's Canvas renderer -- which cannot draw our
           baked/tinted pipeline: the world shows near-black with the odd
           plain sprite (the iPhone two-window screenshot).  If this device
           ran WebGL before (we're here via a rebuild), keep retrying
           WebGL with backoff while the canvas renderer keeps the lights
           on; foreground tabs usually get a context again within seconds.
           v2.3.778: createPixiApp is now fail-fast (no canvas renderer),
           so this branch is defensive -- it only fires if that ever
           regresses. */
        var _noGl = !(renderer.app && renderer.app.renderer && renderer.app.renderer.gl);
        window.__btCanvasFallback = _noGl && !!window.__btLastGlRebuild;
        if (window.__btCanvasFallback) {
          var _cfails = (window.__btPixiInitFails || 0) + 1;
          window.__btPixiInitFails = _cfails;
          try {
            import('../debug/crashTrap.js').then(function (ct) {
              ct.recordCrash('pixi-canvas-fallback', 'WebGL refused, attempt ' + _cfails + ' -- retrying');
            }).catch(function () {});
          } catch (e) {}
          if (_cfails <= 8) {
            setTimeout(function () {
              setGlEpoch(function (n) { return n + 1; });
            }, Math.min(15000, 1000 * Math.pow(2, _cfails - 1)));
          }
          return;
        }
        window.__btPixiInitFails = 0;
        /* v2.3.774: confirm recovery in the crash log -- but only after
           a rebuild, so normal boots stay quiet. */
        if (window.__btLastGlRebuild && Date.now() - window.__btLastGlRebuild < 60000) {
          try {
            import('../debug/crashTrap.js').then(function (ct) {
              ct.recordCrash('gl-rebuild-ok', 'renderer re-initialized (webgl)');
            }).catch(function () {});
          } catch (e) {}
          /* v2.3.776: screen probe.  'gl-rebuild-ok' proves init, not
             pixels -- the iPhone showed a black map under a healthy
             renderer.  Sample the frame: record the result either way
             (evidence), and if it's still dark, retry ONCE. */
          setTimeout(function () {
            if (canvasRef.current !== canvas) return; /* superseded by a newer rebuild */
            try {
              requestAnimationFrame(function () {
                try {
                  var _c2 = document.createElement('canvas');
                  _c2.width = 32; _c2.height = 18;
                  var _g2 = _c2.getContext('2d');
                  _g2.drawImage(canvas, 0, 0, 32, 18);
                  var _d2 = _g2.getImageData(0, 0, 32, 18).data;
                  var _lit = 0;
                  for (var _i2 = 0; _i2 < _d2.length; _i2 += 4) {
                    if (_d2[_i2] + _d2[_i2 + 1] + _d2[_i2 + 2] > 45) _lit++;
                  }
                  var _pct = Math.round(100 * _lit / (32 * 18));
                  import('../debug/crashTrap.js').then(function (ct) {
                    ct.recordCrash('post-rebuild-screen', _pct + '% lit');
                  }).catch(function () {});
                  if (_pct < 2 && !window.__btBlackRetry) {
                    window.__btBlackRetry = true;
                    setTimeout(function () {
                      if (window._rebuildRenderer) window._rebuildRenderer('screen still black after rebuild');
                    }, 2000);
                  } else if (_pct >= 2) {
                    window.__btBlackRetry = false;
                  }
                } catch (e) {}
              });
            } catch (e) {}
          }, 5000);
        }
      }).catch(function(err) {
        console.error('[pixi-init] FAILED:', err);
        window.__pixiActive = false;
        /* v2.3.774: iOS can REFUSE to create a WebGL context while the
           GPU is under memory pressure (e.g. a second game window holds
           one).  This used to be a console-only dead end = permanent
           black canvas with the UI still alive (the iPhone two-window
           screenshot).  Record it and retry on a fresh canvas with
           backoff -- pressure usually clears once this tab is the
           foreground one. */
        var _fails = (window.__btPixiInitFails || 0) + 1;
        window.__btPixiInitFails = _fails;
        try {
          import('../debug/crashTrap.js').then(function (ct) {
            ct.recordCrash('pixi-init-failed', 'attempt ' + _fails + ': ' + ((err && err.message) || err));
          }).catch(function () {});
        } catch (e) {}
        if (_fails <= 8) {
          setTimeout(function () {
            setGlEpoch(function (n) { return n + 1; });
          }, Math.min(15000, 1000 * Math.pow(2, _fails - 1)));
        }
      });
    }

    /* v2.3.772: full renderer rebuild -- the only recovery from a GL
       context the browser refuses to restore.  Bumping the epoch remounts
       the canvas (fresh element = fresh context) and re-runs this whole
       effect; the cleanup below destroys the dead Pixi app first.  Called
       by the resume probe (ws effect) and crashTrap's contextlost
       escalation.  Debounced: a foreground contextlost timer and the
       resume probe can both conclude 'rebuild' for the same death. */
    /* v2.3.773: each effect run starts on a fresh canvas/context -- any
       loss recorded against a previous canvas is history, not a pending
       emergency for the resume probe. */
    window.__btGlLostAt = 0;
    window._rebuildRenderer = function (reason) {
      var _now = Date.now();
      if (window.__btLastGlRebuild && _now - window.__btLastGlRebuild < 5000) return;
      window.__btLastGlRebuild = _now;
      /* v2.3.773: let the fresh renderer record its own first error --
         otherwise a rebuild that didn't cure the throw leaves no trace. */
      window.__pixiUpdateErrLogged = false;
      try {
        import('../debug/crashTrap.js').then(function (ct) {
          ct.recordCrash('gl-rebuild', reason || 'manual');
        }).catch(function () {});
      } catch (e) {}
      setGlEpoch(function (n) { return n + 1; });
    };

    if (!S.map) {
      updateZoneDimensions(S.currentZone);
      S.map = generateZoneMap(S.currentZone);
      /* §11 Start zone ambient sound */
      BT_AUDIO.startZoneAmbient(S.currentZone);
      /* Spawn monsters for current zone */
      var zone = ZONES[S.currentZone];
      if(!S._serverMonsters) S.monsters = spawnMonstersForZone(zone);
      /* Spawn gathering nodes (skipped when the server is authoritative -- the
         worker's state_sync / zone_nodes broadcast replaces S.gatherNodes
         and flips S._serverGatherNodes on). */
      if (!S._serverGatherNodes) S.gatherNodes = spawnGatherNodes(S.currentZone, 'shallow');
      /* Initialize life skills if missing */
      if (S.rpg && !S.rpg.lifeSkills) S.rpg.lifeSkills = createDefaultLifeSkills();
      if (S.rpg && !S.rpg.dungeonClears) S.rpg.dungeonClears = {};
      if (S.rpg && !S.rpg.inventory) S.rpg.inventory = {};
    }

    /* Collectibles removed */
    S.collectibles = [];

    /* Initialize RPG stats — use localStorage as cache, server overwrites async */
    if (!S.rpg) {
      /* Use localStorage cache immediately so game loop can start */
      var savedRpg = function () {
        try {
          return JSON.parse(localStorage.getItem('bt_rpg'));
        } catch (_unused11) {
          return null;
        }
      }();

      /* Detect if saved data uses old system (has 'str') or new (has 'power') */
      if (savedRpg && savedRpg.power !== undefined) {
        /* New stat system — load directly */
        S.rpg = savedRpg;
        /* v2.3.224: retire the legacy "snow" inventory placeholder
           from any save written before the auto-collection was
           removed, so the bag no longer renders a ◇ for it. */
        if (S.rpg.inventory && S.rpg.inventory.snow != null) {
          delete S.rpg.inventory.snow;
        }
        recalcDerived(S.rpg);
      } else {
        /* Either no save or old system — create fresh with new system */
        S.rpg = createDefaultRpg();
        recalcDerived(S.rpg);
        /* Migrate coins/level from old save if present */
        if (savedRpg) {
          S.rpg.level = savedRpg.level || 1;
          S.rpg.xp = savedRpg.xp || 0;
          S.rpg.coins = savedRpg.coins || 50;
          /* Give them points to allocate based on their old level */
          var earnedPts = (S.rpg.level - 1) * STAT_POINTS_PER_LEVEL;
          S.rpg.unspentT1 = 5 + Math.floor(earnedPts / 2);
          S.rpg.unspentT2 = 0; /* T2 retired — weapon points now come from per-category weapon-skill levels */
          recalcDerived(S.rpg);
        }
      }
      if (!S.rpg.inventory) S.rpg.inventory = {};
      if (!S.rpg.lifeSkills) S.rpg.lifeSkills = createDefaultLifeSkills();
      /* Migrate old saves — adds new skills, converts gathering → mining */
      S.rpg.lifeSkills = migrateLifeSkills(S.rpg.lifeSkills);
      /* T2 redesign: backfill per-weapon-category build fields + wipe the
         retired generic specs (one-time, idempotent). */
      migrateWeaponT2(S.rpg);
      migrateDefenseT2(S.rpg);   /* v2.3.693: backfill the Defense T2 category */
      /* v2.3.687: restore any orphaned steel piece (worn nowhere, bagged
         nowhere -- e.g. unequipped via the old Equipment-menu toggle) into
         the bag so it's never lost. */
      try { reconcileGearStash(S.rpg); } catch (e) { /* best-effort */ }
      if (!S.rpg._quests) S.rpg._quests = {};
      if (!S.rpg._questFlags) S.rpg._questFlags = {};
      if (!S.rpg._questKills) S.rpg._questKills = {};
      if (!S.rpg._statLocks) S.rpg._statLocks = { power: false, vitality: false, endurance: false, agility: false, mind: false };
      if (S.rpg.influence === undefined) S.rpg.influence = 0;
      if (S.rpg.power === undefined) S.rpg.power = 0;
      if (!S.rpg.weapon) S.rpg.weapon = {
        type: 'sword',
        tier: 'common',
        tierMult: 1.0,
        element1: null,
        element2: null,
        name: 'Wood Sword',
        gearBase: 'wood',
        isVolatile: false
      };
      if (!S.rpg.rangedWeapon) S.rpg.rangedWeapon = {
        type: 'bow',
        tier: 'common',
        tierMult: 1.0,
        element1: null,
        element2: null,
        name: 'Wood Bow',
        gearBase: 'wood',
        isVolatile: false
      };
      if (!S.rpg.staffWeapon) S.rpg.staffWeapon = {
        type: 'staff',
        tier: 'common',
        tierMult: 1.0,
        element1: null,
        element2: null,
        name: 'Wood Staff',
        gearBase: 'wood',
        isVolatile: false
      };
      if (!S.rpg.activeSlot) S.rpg.activeSlot = 'melee';
      /* v2.3.249: Leather Armor removed from the game.  Migration
         strips it from the equipped slot AND any stash entries so
         pre-existing saves that had it stop showing it.  Other armor
         (forged tiers, future drops) passes through untouched. */
      var _isLeather = function (a) { return !!(a && a.name === 'Leather Armor'); };
      if (S.rpg.armor === undefined || _isLeather(S.rpg.armor)) S.rpg.armor = null;
      if (!S.rpg.armorStash) S.rpg.armorStash = [];
      S.rpg.armorStash = S.rpg.armorStash.filter(function (a) { return !_isLeather(a); });
      if (S.rpg.shield === undefined) S.rpg.shield = null;
      if (!S.rpg.amulet) S.rpg.amulet = null; /* {tier, gem, name} */
      /* v2.3.188: existing saves with no shield get the starter wood
         shield so the always-on-back render has something to draw.
         Matches the default in createDefaultRpg. If a player intentionally
         unequips, the popup's Unequip path can clear shield to null
         AGAIN -- that path doesn't re-default. */
      if (!S.rpg.shield) S.rpg.shield = {
        tier: 'common',
        tierMult: 1.0,
        gearBase: 'wood',
        name: 'Wood Shield',
      };
      if (S.rpg.goldNuggets === undefined) S.rpg.goldNuggets = 0;
      if (S.rpg.goldBars === undefined) S.rpg.goldBars = 0;
      if (S.rpg.achievementPoints === undefined) S.rpg.achievementPoints = 0;
      if (!S.rpg._threatState) S.rpg._threatState = null; /* {target, ts, type:'red'|'white', expires} */
      if (!S.rpg._threatCooldownUntil) S.rpg._threatCooldownUntil = 0;
      if (!S.rpg._guardConfiscateUntil) S.rpg._guardConfiscateUntil = 0;
      if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
      /* v2.3.210: stash bag for unequipped shields, mirror of weaponStash. */
      if (!S.rpg.shieldStash) S.rpg.shieldStash = [];
      /* v2.3.228: stash bag for unequipped armor. */
      if (!S.rpg.armorStash) S.rpg.armorStash = [];
      if (!S.rpg._deathTimestamps) S.rpg._deathTimestamps = [];
      if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
      if (S.rpg.achievementPoints === undefined) S.rpg.achievementPoints = 0;
      /* v2.3.230: existing saves cached maxHp from before armor->HP
         shipped (Phase 1, v2.3.227).  Recompute so the armor HP bonus
         actually lands; nudge current HP by the maxHp delta so the
         player isn't stuck at 100/120 right after loading. */
      var _oldMaxHpAtLoad = S.rpg.maxHp || 100;
      recalcDerived(S.rpg);
      var _maxHpDeltaAtLoad = (S.rpg.maxHp || 100) - _oldMaxHpAtLoad;
      var _curHp = S.rpg.hp || S.rpg.maxHp;
      S.rpg.hp = Math.max(1, Math.min(S.rpg.maxHp, _curHp + _maxHpDeltaAtLoad));
      S.rpg.stamina = S.rpg.stamina || S.rpg.maxStamina;
      S.rpg.mana = S.rpg.mana || S.rpg.maxMana;
      S.respawnTimer = Date.now();

      /* Legacy compat properties — some UI/render code still reads these */
      S.rpg.str = S.rpg.power;
      S.rpg.def = S.rpg.fortification;
      S.rpg.vit = S.rpg.vitality;
      S.rpg.spd = S.rpg.agility;
      S.rpg.lck = S.rpg.ferocity;
      S.rpg.unspentPts = S.rpg.unspentT1 + S.rpg.unspentT2;
      setRpgState(_objectSpread({}, S.rpg));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
      } catch (e) {}
      discoverZone('town'); /* §ENC — Everyone starts in town */

      /* Then fetch from server and overwrite (async, non-blocking) */
      if (!S._serverLoadStarted && getBtPlayerId()) {
        S._serverLoadStarted = true;
        _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
          var pid, sd, sr;
          return _regenerator().w(function (_context4) {
            while (1) switch (_context4.n) {
              case 0:
                pid = getBtPlayerId();
                _context4.n = 1;
                return btRpc('bt_load_player', {
                  p_id: pid
                });
              case 1:
                sd = _context4.v;
                if (!(sd && sd.rpg)) {
                  _context4.n = 2;
                  break;
                }
                sr = sd.rpg;
                /* Server may still have old format — handle both */
                if (sr.power !== undefined) {
                  Object.assign(S.rpg, sr);
                } else {
                  S.rpg.level = sr.level || 1;
                  S.rpg.xp = sr.xp || 0;
                  S.rpg.coins = sr.coins || 0;
                }
                recalcDerived(S.rpg);
                /* Update legacy compat */
                S.rpg.str = S.rpg.power;
                S.rpg.def = S.rpg.fortification;
                S.rpg.vit = S.rpg.vitality;
                S.rpg.spd = S.rpg.agility;
                S.rpg.lck = S.rpg.ferocity;
                S.rpg.unspentPts = S.rpg.unspentT1 + S.rpg.unspentT2;
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                console.log('[Game] Server sync: Lv' + S.rpg.level + ' ' + S.rpg.coins + 'G');
                _context4.n = 3;
                break;
              case 2:
                if (!pid) {
                  _context4.n = 3;
                  break;
                }
                _context4.n = 3;
                return btRpc('bt_register_player', {
                  p_id: pid,
                  p_name: S.myName || 'Anon'
                });
              case 3:
                return _context4.a(2);
            }
          }, _callee4);
        }))();
      }
    }

    /* Monsters spawned with zone map — see S.map init above */
    /* Initialize NPCs — only in town, and only when the Tiled brotown
       map isn't authoring its own town content. */
    if (!S.npcs && S.currentZone === 'town' && !(S._tiledWalkable && S._tiledWalkable.town)) {
      /* v2.3.214: NPC spawn disabled -- user is re-introducing NPCs
         one at a time. To re-enable, filter NPC_DATA to the names
         you want, e.g.
           const ACTIVE_NPCS = ['Mayor Bro'];
           S.npcs = NPC_DATA.filter(n => ACTIVE_NPCS.includes(n.name))
             .map((npc, i) => _objectSpread(...));
         NPC_DATA in src/data/gameSystems.js still has all entries. */
      S.npcs = [];
    }

    /* Loaded avatar images cache */
    var avatarImgs = {};
    var processedAvatars = {}; /* url -> processed canvas with transparent bg */

    var loadAvatarImg = function loadAvatarImg(url) {
      /* Return processed version if available */
      if (processedAvatars[url]) return processedAvatars[url];
      /* Return raw image (triggers load) */
      if (!avatarImgs[url]) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          /* Process: remove background color by sampling corner pixels */
          try {
            var size = 64;
            var offCanvas = document.createElement('canvas');
            offCanvas.width = size;
            offCanvas.height = size;
            var offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(img, 0, 0, size, size);
            var imgData = offCtx.getImageData(0, 0, size, size);
            var d = imgData.data;
            /* Sample background color from top-left corner (0,0) */
            var bgR = d[0],
              bgG = d[1],
              bgB = d[2];
            /* Remove pixels similar to background color */
            var tolerance = 40;
            for (var i = 0; i < d.length; i += 4) {
              var dr = Math.abs(d[i] - bgR);
              var dg = Math.abs(d[i + 1] - bgG);
              var db = Math.abs(d[i + 2] - bgB);
              if (dr < tolerance && dg < tolerance && db < tolerance) {
                d[i + 3] = 0; /* set alpha to 0 */
              }
            }
            offCtx.putImageData(imgData, 0, 0);
            processedAvatars[url] = offCanvas;
          } catch (e) {
            /* CORS or other error — use raw image */
            console.warn('[NFT] Background removal failed:', e.message, url);
            processedAvatars[url] = img;
          }
        };
        img.src = url;
        avatarImgs[url] = img;
      }
      return avatarImgs[url];
    };
    /* Preload own avatar */
    if (S.myAvatar) loadAvatarImg(S.myAvatar);

    /* ═══ NFT 360° DIRECTIONAL SPRITE SYSTEM — V2 ═══ */
    /* "Volumetric sprite" technique: contrast-based face masking, hue-shift depth, ghost parallax */
    var _nftDirCache = {};
    function getNftDirectional(processedImg, url) {
      if (_nftDirCache[url]) return _nftDirCache[url];
      var sz = 28;
      /* FRONT — full processed NFT */
      var fC = document.createElement('canvas');
      fC.width = sz;
      fC.height = sz;
      var fX = fC.getContext('2d');
      fX.imageSmoothingEnabled = false;
      fX.drawImage(processedImg, 0, 0, sz, sz);
      var sd = fX.getImageData(0, 0, sz, sz).data;

      /* ── Adaptive Head Bounds Detection ── */
      var centerX = Math.floor(sz / 2);
      var headTop = sz,
        headBot = 0;
      for (var y = 0; y < sz; y++) {
        var i = (y * sz + centerX) * 4;
        if (sd[i + 3] > 80) {
          headTop = Math.min(headTop, y);
          headBot = Math.max(headBot, y);
        }
      }
      var headH = headBot - headTop;
      /* Face zone: middle portion of detected head (where eyes/mouth/glasses live) */
      var faceTop = headTop + Math.round(headH * 0.25);
      var faceBot = headTop + Math.round(headH * 0.75);

      /* Find left/right head bounds per row */
      var rowBounds = [];
      for (var _y10 = 0; _y10 < sz; _y10++) {
        var left = sz,
          right = 0;
        for (var x = 0; x < sz; x++) {
          if (sd[(_y10 * sz + x) * 4 + 3] > 80) {
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
        }
        rowBounds.push({
          left: left,
          right: right
        });
      }

      /* ── BACK — Contrast-Based Feature Removal ──
         Instead of painting over a fixed rectangle, detect actual facial features
         (eyes, glasses, mouth) by their high contrast/saturation vs surrounding skin.
         Only those pixels get replaced with sampled skin color. */
      var bC = document.createElement('canvas');
      bC.width = sz;
      bC.height = sz;
      var bX = bC.getContext('2d');
      bX.imageSmoothingEnabled = false;
      bX.drawImage(fC, 0, 0);
      var imgData = bX.getImageData(0, 0, sz, sz);
      var d = imgData.data;

      /* Sample skin color from left & right edges of the face zone rows */
      var sr = 0,
        sg = 0,
        sb = 0,
        sn = 0;
      for (var _y11 = faceTop; _y11 < faceBot; _y11++) {
        var rb = rowBounds[_y11];
        if (rb.left >= rb.right) continue;
        /* Left 2 columns */
        for (var _x12 = rb.left; _x12 < Math.min(rb.left + 3, rb.right); _x12++) {
          var _i35 = (_y11 * sz + _x12) * 4;
          if (d[_i35 + 3] > 80) {
            sr += d[_i35];
            sg += d[_i35 + 1];
            sb += d[_i35 + 2];
            sn++;
          }
        }
        /* Right 2 columns */
        for (var _x13 = Math.max(rb.right - 2, rb.left); _x13 <= rb.right; _x13++) {
          var _i36 = (_y11 * sz + _x13) * 4;
          if (d[_i36 + 3] > 80) {
            sr += d[_i36];
            sg += d[_i36 + 1];
            sb += d[_i36 + 2];
            sn++;
          }
        }
      }
      /* Fallback: sample from upper head if edges were empty */
      if (sn < 6) {
        for (var _y12 = headTop; _y12 < faceTop; _y12++) {
          for (var _x14 = Math.round(sz * 0.3); _x14 < Math.round(sz * 0.7); _x14++) {
            var _i37 = (_y12 * sz + _x14) * 4;
            if (sd[_i37 + 3] > 80) {
              sr += sd[_i37];
              sg += sd[_i37 + 1];
              sb += sd[_i37 + 2];
              sn++;
            }
          }
        }
      }
      var skinR = sn > 0 ? Math.round(sr / sn) : 128;
      var skinG = sn > 0 ? Math.round(sg / sn) : 128;
      var skinB = sn > 0 ? Math.round(sb / sn) : 128;
      var skinBri = (skinR + skinG + skinB) / 3;

      /* Per-pixel contrast check in face zone:
         High saturation or outlier brightness = facial feature → replace with skin.
         Low saturation + similar brightness to skin = actual skin/hat → keep. */
      for (var _y13 = faceTop; _y13 < faceBot; _y13++) {
        var _rb = rowBounds[_y13];
        if (_rb.left >= _rb.right) continue;
        /* Only check inner 70% of head width (skip edges which are outline/hat) */
        var span = _rb.right - _rb.left;
        var innerL = _rb.left + Math.round(span * 0.15);
        var innerR = _rb.right - Math.round(span * 0.15);
        for (var _x15 = innerL; _x15 <= innerR; _x15++) {
          var _i38 = (_y13 * sz + _x15) * 4;
          if (d[_i38 + 3] < 40) continue;
          var r = d[_i38],
            g = d[_i38 + 1],
            b = d[_i38 + 2];
          var brightness = (r + g + b) / 3;
          var saturation = Math.max(r, g, b) - Math.min(r, g, b);
          var briDiff = Math.abs(brightness - skinBri);

          /* Feature detection: high saturation (colored glasses, red eyes, etc.)
             OR brightness very different from skin (white of eyes, dark pupils, bright teeth) */
          var isFeature = saturation > 35 || briDiff > 45;
          if (isFeature) {
            /* Replace with skin, slight 5% darken for back-of-head shading */
            d[_i38] = Math.round(skinR * 0.95);
            d[_i38 + 1] = Math.round(skinG * 0.95);
            d[_i38 + 2] = Math.round(skinB * 0.95);
          }
        }
      }

      /* Hue-shift depth: shift all visible pixels toward cool blue/purple.
         Shadows in pixel art are cool-toned, not flat black. */
      for (var _i39 = 0; _i39 < d.length; _i39 += 4) {
        if (d[_i39 + 3] < 40) continue;
        d[_i39] = Math.round(d[_i39] * 0.90);
        d[_i39 + 1] = Math.round(d[_i39 + 1] * 0.93);
        d[_i39 + 2] = Math.min(255, Math.round(d[_i39 + 2] * 1.04 + 4));
      }
      bX.putImageData(imgData, 0, 0);

      /* Sample region colors for reference */
      function regionCol(y1, y2) {
        var r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (var _y14 = y1; _y14 < y2; _y14++) for (var _x16 = Math.round(sz * 0.15); _x16 < Math.round(sz * 0.85); _x16++) {
          var _i40 = (_y14 * sz + _x16) * 4;
          if (sd[_i40 + 3] > 80) {
            r += sd[_i40];
            g += sd[_i40 + 1];
            b += sd[_i40 + 2];
            n++;
          }
        }
        return n > 0 ? "rgb(".concat(Math.round(r / n), ",").concat(Math.round(g / n), ",").concat(Math.round(b / n), ")") : '#555';
      }
      var topCol = regionCol(0, Math.round(sz * 0.3));
      var midCol = regionCol(Math.round(sz * 0.3), Math.round(sz * 0.6));
      var botCol = regionCol(Math.round(sz * 0.6), sz);
      _nftDirCache[url] = {
        front: fC,
        back: bC,
        size: sz,
        topCol: topCol,
        midCol: midCol,
        botCol: botCol
      };
      return _nftDirCache[url];
    }

    /* ── V2 Render: Single-matrix transform with cross-fade and ghost depth ── */
    /* Sprite-sheet player draw — replaces the procedural body when sheets
       are loaded and window.__broUseSprites !== false. Returns true when it
       drew, so the caller can skip the legacy body code. footY = where the
       feet should land in CSS pixels; sprite is bottom-anchored there. */
    var SPRITE_DIR_MAP = [
      { name: 'east',      mirror: false }, /* 0 = E   */
      { name: 'southwest', mirror: true  }, /* 1 = SE  → mirror SW */
      { name: 'south',     mirror: false }, /* 2 = S   */
      { name: 'southwest', mirror: false }, /* 3 = SW  */
      { name: 'east',      mirror: true  }, /* 4 = W   → mirror E  */
      { name: 'northeast', mirror: true  }, /* 5 = NW  → mirror NE */
      { name: 'north',     mirror: false }, /* 6 = N   */
      { name: 'northeast', mirror: false }, /* 7 = NE  */
    ];
    /* Swing animation tuning. SWING_ARC is imported from gameSystems.js
       (the same arc used by hit-detection). Visual rotation runs over
       SWING_ANIM_MS regardless of swing cooldown so combos still feel
       responsive. The arc starts slightly cocked back (-30%) and sweeps
       through to +70% of SWING_ARC, biasing the visual toward forward. */
    var SWING_ANIM_MS = 250;
    function drawSpriteCharacter(ctx, screenX, footY, facingAngle, isMoving, now, drawSize, weaponType, swingProgress, isBackpedaling, hitProgress) {
      if (window.__broUseSprites === false) return false;
      var sheets = playerSpritesRef.current;
      if (!sheets) return false;
      var tau = Math.PI * 2;
      var a = ((facingAngle % tau) + tau) % tau;
      var idx = Math.round(a / (Math.PI / 4)) % 8;
      var info = SPRITE_DIR_MAP[idx];
      /* Hit-react preempts jog/stand. Plays once across 0→1 progress
         and clamps to the final frame when progress >= 1 (caller
         normally stops passing hitProgress past that point, but the
         clamp keeps the render stable on edge frames). */
      var pose = (hitProgress != null) ? 'hit' : (isMoving ? 'jog' : 'stand');
      var sheet = sheets[pose + '-' + info.name];
      if (!sheet) return false;
      /* Stale-cache clamp on frame count. */
      var maxFrames = sheet.img && sheet.img.naturalWidth
        ? Math.max(1, Math.floor(sheet.img.naturalWidth / sheet.w))
        : sheet.frames;
      var effFrames = Math.min(sheet.frames, maxFrames);
      var ivl = sheet.intervalMs || 90;
      var frame;
      if (pose === 'hit') {
        var clamped = Math.max(0, Math.min(0.9999, hitProgress));
        frame = Math.min(effFrames - 1, Math.floor(clamped * effFrames));
      } else {
        frame = effFrames > 1 ? Math.floor(now / ivl) % effFrames : 0;
      }
      /* Reverse the cycle when backpedaling so legs appear to move in the
         opposite direction of forward jogging — same frames played in
         reverse, no separate sheet needed. */
      if (isBackpedaling && effFrames > 1) frame = (effFrames - 1) - frame;
      var srcX = frame * sheet.w;
      /* East source video framed the character slightly smaller. Bump 6%
         (was 18% — user fed back that 18% was too large). The hit pose's
         east source frames the character much larger (~67% of frame
         vs the jog/stand source's ~94%), so it needs the OPPOSITE
         adjustment — shrink to 0.88× to match the apparent size of
         the other directions in-game. */
      var sizeMul = info.name === 'east'
        ? (pose === 'hit' ? 0.88 : 1.06)
        : 1.0;
      var w = drawSize * sizeMul, h = drawSize * sizeMul;

      /* === WEAPON SETUP ===
         Per-frame hand anchor pins the handle to the actual hand pixel
         in each source frame. Mirror weapon image for facings 2..6
         (S, SW, W, NW, N) so the blade angles NW; E / SE / NE keep the
         source NE direction. Z-order: weapon drawn IN FRONT for facings
         0..3 (E, SE, S, SW), BEHIND for 4..7 (W, NW, N, NE) so the
         sword sits in front of the body for forward/east poses and
         behind for back-facing poses. */
      var doWeaponDraw = null;
      var wsheets = weaponSpritesRef.current;
      var wImg = wsheets && weaponType ? wsheets[weaponType] : null;
      if (wImg) {
        var wSize = Math.round(drawSize * 0.45);
        var handleX, handleY;
        var anchors = handAnchorsRef.current;
        var anchorList = anchors && anchors[pose + '-' + info.name];
        var anchor = anchorList && anchorList[Math.min(frame, anchorList.length - 1)];
        if (anchor && anchor.length === 2) {
          var ax = info.mirror ? (sheet.w - anchor[0]) : anchor[0];
          var ay = anchor[1];
          handleX = screenX - w / 2 + (ax / sheet.w) * w;
          handleY = footY - h + (ay / sheet.w) * h;
        } else {
          var handAng = facingAngle + Math.PI / 2;
          var armLen = drawSize * 0.28;
          var bodyCenterY = footY - drawSize * 0.40;
          handleX = screenX + Math.cos(handAng) * armLen;
          handleY = bodyCenterY + Math.sin(handAng) * armLen * 0.35;
        }
        var whandles = weaponHandlesRef.current;
        var srcW = wImg.naturalWidth || 64;
        var srcH = wImg.naturalHeight || 64;
        /* Runtime override (debug command `hpx <weapon> X Y`) wins over the
           handles.json file so the user can iterate the source-pixel handle
           position live until the pivot dot lands on the visible handle. */
        var rtHpxAll = (typeof window !== 'undefined' && window.__broWeaponHpxOverride) || {};
        var hpx = rtHpxAll[weaponType] || (whandles && whandles[weaponType]) || [srcW / 2, srcH];
        /* Per-weapon, per-direction pixel nudge.
           Mirror flipping handedness across facings means a single nudge
           value can't fit all 8 directions, so each weapon stores 8
           overrides (one per facing index 0..7 = E, SE, S, SW, W, NW, N,
           NE) plus a `_default` fallback. Applied to handleX/handleY
           (the mirror pivot) so the offset is screen-space-consistent
           regardless of mirror flag.
           Tune live with `nudge X Y` (applies to current facing + current
           weapon) — see GameApp.jsx debugBus.cmd('nudge', ...). Bake the
           values you find into DEFAULT_WEAPON_NUDGE below. */
        var DIR_NAMES = ['E','SE','S','SW','W','NW','N','NE'];
        var DEFAULT_WEAPON_NUDGE = {
          sword: {
            E:  { x:  5, y: 6 },
            SE: { x:  5, y: 6 },
            S:  { x:  5, y: 6 },
            SW: { x: -5, y: 6 },
            W:  { x: -5, y: 6 },
            NW: { x: -5, y: 6 },
            N:  { x: -5, y: 6 },
            NE: { x:  5, y: 6 },
          },
          bow: { _default: { x: -2, y: 7 } },
          staff: {
            E:  { x:  5, y: 8 },
            SE: { x:  5, y: 8 },
            S:  { x:  5, y: 8 },
            SW: { x: -5, y: 8 },
            W:  { x: -5, y: 8 },
            NW: { x: -5, y: 8 },
            N:  { x: -5, y: 8 },
            NE: { x:  5, y: 8 },
          },
        };
        var dirName = DIR_NAMES[idx];
        var allNudges = (typeof window !== 'undefined' && window.__broWeaponNudge) || {};
        var rtBucket = allNudges[weaponType] || {};
        var dfBucket = DEFAULT_WEAPON_NUDGE[weaponType] || {};
        var nudge = rtBucket[dirName] || rtBucket._default
          || dfBucket[dirName] || dfBucket._default
          || allNudges._default || { x: 0, y: 0 };
        handleX += nudge.x;
        handleY += nudge.y;
        var dx = handleX - (hpx[0] / srcW) * wSize;
        var dy = handleY - (hpx[1] / srcH) * wSize;
        /* idx: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE.
           Mirror weapon on SW, W, NW, N (idx 3..6). E / SE / S / NE keep
           the source NE blade direction. */
        var weaponMirror = idx >= 3 && idx <= 6;
        /* Swing rotation. Sweep is centered on the aim direction so the
           blade slashes toward where the player is auto-attacking,
           matching the hit-detection arc. Source weapon images have a
           "rest blade direction" (sword's blade rests pointing NE in
           its source); we rotate the image by (aimAngle - restBlade)
           plus a swing-offset that sweeps -SWING_ARC/2 → +SWING_ARC/2. */
        var REST_BLADE_CANVAS = {
          sword:      -Math.PI / 4, /* NE — blade goes from grip (lower-left) to tip (upper-right) */
          greatsword: -Math.PI / 4,
          bow:         0,           /* east — bow sits horizontal */
          staff:      -Math.PI / 2, /* north — staff stands vertical */
        };
        var restAng = REST_BLADE_CANVAS[weaponType] != null
          ? REST_BLADE_CANVAS[weaponType]
          : -Math.PI / 4;
        /* SWING_ARC is the hit-detection arc (~153°). Visual swing is
           70% of that (~107°) per user feedback — slightly less wild
           than the full hit arc while still reading as a strong slash. */
        var SWING_FULL_ARC = ((typeof SWING_ARC === 'number' && SWING_ARC) ? SWING_ARC : Math.PI * 0.85) * 0.70;
        var swingAng = 0;
        var swingOffset = 0;
        var swingActive = swingProgress != null && swingProgress < 1;
        /* Pull live aim from window state — facingAngle tracks movement
           direction in non-attack motion, but aim is what we want here. */
        var liveS = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null;
        var aimAngle = (liveS && liveS._aimAngle != null) ? liveS._aimAngle : facingAngle;
        if (swingActive) {
          var eased = 1 - Math.pow(1 - swingProgress, 2);
          swingOffset = -SWING_FULL_ARC / 2 + eased * SWING_FULL_ARC;
          swingAng = (aimAngle - restAng) + swingOffset;
        }
        /* Local image-space offsets — relative to the grip pixel pivot. */
        var dxLocal = -(hpx[0] / srcW) * wSize;
        var dyLocal = -(hpx[1] / srcH) * wSize;
        doWeaponDraw = function () {
          /* Phase B: arc trail centered on the aim direction. Spans
             up to SWING_FULL_ARC across the course of the swing. */
          if (swingActive) {
            ctx.save();
            ctx.translate(handleX, handleY);
            var trailReach = wSize * 1.47; /* 2.10 * 0.7 — shrunk 30% with the arc */
            var startCanvas = aimAngle - SWING_FULL_ARC / 2;
            var nowCanvas   = aimAngle + swingOffset;
            var trailAlpha = (1 - swingProgress) * 0.35;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, trailReach, Math.min(startCanvas, nowCanvas), Math.max(startCanvas, nowCanvas));
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 255, 255, ' + trailAlpha + ')';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 250, 200, ' + (trailAlpha * 1.2) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, trailReach, Math.min(startCanvas, nowCanvas), Math.max(startCanvas, nowCanvas));
            ctx.stroke();
            ctx.restore();
          }
          /* Sword image draw. Idle: apply weaponMirror so the blade
             flips to the body side that holds the grip. Active swing:
             skip mirror — rotation alone aims the blade at the swing
             target, and mirroring during rotation would invert the
             sweep direction visually. */
          ctx.save();
          ctx.translate(handleX, handleY);
          if (weaponMirror && !swingActive) ctx.scale(-1, 1);
          ctx.rotate(swingAng);
          ctx.drawImage(wImg, dxLocal, dyLocal, wSize, wSize);
          ctx.restore();
          /* DEBUG PIVOT DOT — yellow dot rendered at (handleX, handleY).
             This is also the canvas position of the sword's grip pixel
             (verified mathematically — drawImage with the offset I use
             puts the user-clicked grip pixel exactly at this point).
             If the dot isn't on the visible hand even when standing
             still, the nudge values are off — the user's calibration
             aligned the sword grip with the dot, but the dot itself
             isn't where the visible hand is rendered. */
          if (typeof window !== 'undefined' && window.__broShowPivot) {
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(handleX, handleY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        };
      }

      /* idx 0..3 = E / SE / S / SW → sword IN FRONT (drawn after body).
         idx 4..7 = W / NW / N / NE → sword BEHIND (drawn before body). */
      var swordInFront = idx <= 3;

      if (doWeaponDraw && !swordInFront) doWeaponDraw();

      /* === CHARACTER DRAW === */
      ctx.save();
      if (info.mirror) {
        ctx.translate(screenX, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet.img, srcX, 0, sheet.w, sheet.w, -w / 2, footY - h, w, h);
      } else {
        ctx.drawImage(sheet.img, srcX, 0, sheet.w, sheet.w, screenX - w / 2, footY - h, w, h);
      }
      ctx.restore();

      if (doWeaponDraw && swordInFront) doWeaponDraw();
      return true;
    }

    function drawNft360(ctx, nftDir, cx, cy, facingAngle, nftSize) {
      /* turnFromCam: 0=facing camera, π=facing away */
      var rawTurn = facingAngle - Math.PI / 2;
      var turnFromCam = Math.abs((rawTurn % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      var isFacingRight = Math.cos(facingAngle) > 0;
      var sinTurn = Math.sin(turnFromCam);
      var halfSz = nftSize / 2;

      /* sx: Width compression — 0.5 at pure side, 1.0 at front/back */
      var sx = 0.5 + 0.5 * Math.abs(Math.cos(turnFromCam));

      /* kx: Shear factor — peaks at 90°, gives the "3D lean" */
      var kx = sinTurn * 0.25 * (isFacingRight ? -1 : 1);

      /* Cross-fade: blend front↔back between 70°–110° (1.22–1.92 rad) */
      var fadeStart = 1.22,
        fadeEnd = 1.92;
      var frontAlpha, backAlpha;
      if (turnFromCam < fadeStart) {
        frontAlpha = 1;
        backAlpha = 0;
      } else if (turnFromCam > fadeEnd) {
        frontAlpha = 0;
        backAlpha = 1;
      } else {
        var t = (turnFromCam - fadeStart) / (fadeEnd - fadeStart);
        frontAlpha = 1 - t;
        backAlpha = t;
      }
      ctx.save();
      ctx.translate(cx, cy + nftSize); /* pivot at feet (bottom-center) */

      /* Single matrix: scale (with mirror baked in), shear, no separate calls */
      ctx.transform(isFacingRight ? -sx : sx, /* a: horizontal scale + mirror */
      0, /* b: no vertical skew */
      kx, /* c: the "3D lean" shear */
      1, /* d: keep height constant */
      0, 0);

      /* Ghost depth — 1px parallax shadow at high side amounts */
      if (sinTurn > 0.7) {
        ctx.globalAlpha = 0.4;
        var ghostTex = frontAlpha > backAlpha ? nftDir.front : nftDir.back;
        ctx.drawImage(ghostTex, -halfSz + 1, -nftSize, nftSize, nftSize);
        ctx.globalAlpha = 1;
      }

      /* Draw front layer */
      if (frontAlpha > 0.01) {
        ctx.globalAlpha = frontAlpha;
        ctx.drawImage(nftDir.front, -halfSz, -nftSize, nftSize, nftSize);
      }
      /* Draw back layer */
      if (backAlpha > 0.01) {
        ctx.globalAlpha = backAlpha;
        ctx.drawImage(nftDir.back, -halfSz, -nftSize, nftSize, nftSize);
      }

      /* Cool-toned depth overlay */
      var depthAmt = sinTurn * 0.07 + (backAlpha > 0 ? 0.03 : 0);
      if (depthAmt > 0.01) {
        ctx.globalAlpha = depthAmt;
        ctx.fillStyle = 'rgba(20,15,50,1)';
        ctx.fillRect(-halfSz, -nftSize, nftSize, nftSize);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    /* The duplicate resize() block that used to live here has been
       deleted — it called ctx.setTransform(dpr, 0, 0, dpr) UNGUARDED.
       During Pixi's async init window, ctx is null (we deferred the
       getContext('2d') call so Pixi could grab WebGL), and the
       ResizeObserver this block registered would fire on the canvas
       parent's first layout — TypeError on null ctx, gameLoop's
       outer try/catch swallowed it silently, no rendering ever
       happened.  The earlier resize() at line ~2810 (guarded) plus
       its listeners cover the same job. */
    var isSolid = function isSolid(px, py) {
      var _S$map;
      var zone = ZONES[S.currentZone];
      var tx = Math.floor(px / TILE),
        ty = Math.floor(py / TILE);
      if (tx < 0 || tx >= zone.w || ty < 0 || ty >= zone.h) return true;
      /* Tiled-map walkability grid (if loaded for this zone). When a
         grid is present it is AUTHORITATIVE: cells flagged false block,
         everything else is walkable. The legacy TILE_SOLID check is
         skipped because the procedural S.map still has old building
         tiles (3, etc.) underneath the new Tiled render. */
      var _wgrid = (S._tiledWalkable && S._tiledWalkable[S.currentZone]) || null;
      if (_wgrid && _wgrid.length) {
        /* The walkability grid uses its OWN resolution (set by the
           generator — currently 64x64 for the town).  Scale the
           player's world-pixel position into grid cells via the grid
           dimensions instead of relying on the zone tile size, so the
           generator can choose a finer grid without coordinating with
           this lookup.  zone.w/h * TILE is always the world-pixel
           extent of the zone. */
        var _gh = _wgrid.length;
        var _gw = (_wgrid[0] && _wgrid[0].length) || 0;
        if (_gw > 0) {
          var _mw = zone.w * TILE, _mh = zone.h * TILE;
          var _gx = Math.floor(px * _gw / _mw);
          var _gy = Math.floor(py * _gh / _mh);
          if (_gy >= 0 && _gy < _gh && _gx >= 0 && _gx < _gw) {
            return _wgrid[_gy][_gx] === false;
          }
        }
      }
      /* Image-mapped zones (themed/elemental zones) default to fully
         walkable when no explicit walkability grid exists.  Town has
         its own grid via the painted yellow footprints and is handled
         above; the elemental zones (frost / ember / mist / thunder /
         hollows / sky / tidal / meadow) have only the painted art and
         no per-cell collision data, so the player explores freely. */
      if (IMAGE_ZONE_MAPS[S.currentZone]) return false;
      var tile = (_S$map = S.map) === null || _S$map === void 0 || (_S$map = _S$map[ty]) === null || _S$map === void 0 ? void 0 : _S$map[tx];
      if (tile === 8 || tile === 9 || tile === 10 || tile === 12 || tile === 14 || tile === 15) return false; /* exit/dungeon/gate/plot/bed walkable */
      return TILE_SOLID.has(tile);
    };
    var _gameLoop = function gameLoop() {
      frameRef.current = requestAnimationFrame(_gameLoop);
      try {
        if (!S._frameCount) S._frameCount = 0;
        S._frameCount++;

        /* ── Slow-frame diagnostic ── flags any frame whose delta from
           the previous one exceeds the 60-fps budget by a meaningful
           margin (>20 ms ≈ <50 fps).  Logged with surrounding state so
           dips can be correlated with monster count, damage-number
           churn, open minigames, etc.  Throttled to one log per 500 ms
           and to the worst frame seen in that window so the console
           isn't spammed during a sustained dip.  Toggle off at runtime
           with `window.__btPerf = false`. */
        var _perfNow = performance.now();
        if (!S._perf) S._perf = { prevT: _perfNow, slowLastT: 0, worstMs: 0, worstFps: 60, slowFrameCount: 0, totalSlow: 0 };
        var _perfDelta = _perfNow - S._perf.prevT;
        S._perf.prevT = _perfNow;
        if (_perfDelta > 20) {
          S._perf.totalSlow++;
          if (_perfDelta > S._perf.worstMs) {
            S._perf.worstMs = _perfDelta;
            S._perf.worstFps = Math.round(1000 / _perfDelta);
          }
          S._perf.slowFrameCount++;
        }
        if (window.__btPerf !== false && _perfNow - S._perf.slowLastT > 500 && S._perf.worstMs > 0) {
           
          console.warn('[bt-perf]', {
            frameMs: +S._perf.worstMs.toFixed(1),
            instFps: S._perf.worstFps,
            slowFramesIn500ms: S._perf.slowFrameCount,
            totalSlowFrames: S._perf.totalSlow,
            zone: S.currentZone,
            monsters: (S.monsters && S.monsters.length) || 0,
            others: (S.others && S.others.length) || 0,
            projectiles: (S.projectiles && S.projectiles.length) || 0,
            dmgNumbers: (S.dmgNumbers && S.dmgNumbers.length) || 0,
            campfires: (S.campfires && S.campfires.length) || 0,
            miningOpen: !!stateRef.current._miningOpen,
            renderer: window.__pixiActive ? 'pixi' : 'none',
          });
           
          S._perf.worstMs = 0;
          S._perf.slowFrameCount = 0;
          S._perf.slowLastT = _perfNow;
        }
        var _S$map$Math$floor$Mat, _S$map2, _S$rpg5, _ZONES$S$currentZone3, _S$rpg7, _S$rpg8, _S$rpg11, _S$_atkEnergy, _ZONES$S$currentZone8, _S$rpg17, _S$rpg19, _S$rpg20, _S$rpg21, _S$rpg24, _ZONES$S$currentZone12;
        /* Ensure canvas has dimensions */
        if (false) { /* canvas size check removed — PixiJS handles resize */
          resize();
          return;
        }

        /* Hit stop + kill slowmo disabled — felt like lag */
        S._hitStop = null;
        S._killSlowmo = null;
        if (false) {
          return;
        }
        var W = canvas.width / (window.devicePixelRatio || 1);
        var H = canvas.height / (window.devicePixelRatio || 1);
        var P = S.player;
        var K = S.keys;

        /* ═══ Defensive death-flow catch ═══
           The "rich" death handlers (server monster_attack ~2272, local
           monster damage ~6659) set S._dying, broadcast, scatter
           inventory, and schedule the 3.5 s respawn.  But other damage
           paths — drowning (~5012), PvP attack_confirmed (~2632),
           player_attack (~2710), and anything else that just decrements
           S.rpg.hp — never trigger a respawn, so the player dies, the
           renderer's defensive _deathStart fallback plays the animation,
           and then... nothing.  No teleport.  This block is the
           catch-all: if HP reaches 0 from ANY source without S._dying
           being set, run the essentials of the canonical handler so
           respawn always fires.
           In MP the server is the canonical death authority -- it
           emits player_died as soon as ps.hp hits 0, and the rich
           handler in the WS switch runs the death animation +
           respawn.  We MUST NOT fire this catch-all in MP because
           the server's player_state may overwrite local hp to 0
           one tick before player_died lands, and this block would
           then race the canonical handler -- ending up with two
           respawn timers (3.5s here vs. server's player_respawned)
           and a clobbered post-respawn hp via _defRpg.hp = maxHp. */
        if (!S._serverMonsters && S.rpg && S.rpg.hp <= 0 && !S._dying) {
          S._dying = true;
          if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
          S.rpg._compStats.deaths++;
          if (!S._deathStart) S._deathStart = Date.now();
          /* Stop momentum so the corpse doesn't drift during the
             death-anim hold. */
          P.vx = 0; P.vy = 0;
          S._slideVx = 0; S._slideVy = 0;
          /* Tell the server we're dead (move builder reads hp<=0 as
             dead) and broadcast the death so remotes render us prone. */
          if (S.channel) {
            try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: P.x, y: P.y, z: S.currentZone, vx: 0, vy: 0 } }); } catch (e) {}
            try { S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: P.x, y: P.y } }); } catch (e) {}
          }
          /* Gold penalty — same rate as the rich handlers. */
          var _defGoldLost = Math.floor((S.rpg.coins || 0) * DEATH_GOLD_PENALTY);
          S.rpg.coins = Math.max(0, (S.rpg.coins || 0) - _defGoldLost);
          /* Popup (skip if a rich handler already pushed one this tick). */
          S.dmgNumbers.push({ x: P.x, y: P.y - 50, text: 'YOU DIED', color: '#ff5e6c', ts: Date.now() });
          if (_defGoldLost > 0) S.dmgNumbers.push({ x: P.x, y: P.y - 35, text: '-' + _defGoldLost + 'G', color: '#ff5e6c', ts: Date.now() });
          S.screenShake = Math.max(S.screenShake || 0, 10);
          S._deathFlash = Date.now();
          try { BT_AUDIO.playerDeath ? BT_AUDIO.playerDeath() : BT_AUDIO.beep(80, 0.3, 0.4, 'sawtooth'); } catch (e) {}
          /* Deferred restore + teleport.  Captures S.rpg by reference
             (it's the same object across ticks) so mutations apply to
             the current state object even if React reassigns the ref. */
          var _defRpg = S.rpg;
          setTimeout(function () {
            _defRpg.hp = _defRpg.maxHp;
            _defRpg.stamina = _defRpg.maxStamina;
            _defRpg.mana = _defRpg.maxMana;
            S.currentZone = 'town';
            try { updateZoneDimensions('town'); } catch (e) {}
            try { BT_AUDIO.startZoneAmbient('town'); } catch (e) {}
            try { S.map = generateZoneMap('town'); } catch (e) {}
            S.monsters = [];
            S.gatherNodes = []; /* Town is safe -- no harvestable resources; clear stale entries from the previous zone */
            P.x = 24 * TILE;
            P.y = 24 * TILE;
            P.vx = 0; P.vy = 0;
            S.respawnTimer = Date.now() + 3000;
            S._dying = false;
            S._deathStart = 0;
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.arrows = [];
            S._ambientParticles = [];
            if (S.channel) {
              try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: P.x, y: P.y, z: S.currentZone, vx: 0, vy: 0 } }); } catch (e) {}
              try { S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } }); } catch (e) {}
            }
            setRpgState(_objectSpread({}, _defRpg));
            try { localStorage.setItem('bt_rpg', JSON.stringify(_defRpg)); } catch (e) {}
          }, 3500);
        }

        /* Re-initialize NPCs when entering town (they get nulled on zone transitions) */
        if (!S.npcs && S.currentZone === 'town' && !(S._tiledWalkable && S._tiledWalkable.town)) {
          /* v2.3.214: NPC spawn disabled (see init-block comment near
             line 4467 for the re-enable recipe). */
          S.npcs = [];
        }
        /* Active weapon — available to all render/combat sections */
        var activeWpn = S.rpg ? getActiveWeapon(S.rpg) : {
          type: 'greatsword',
          tier: 'common',
          tierMult: 1,
          element1: null,
          element2: null,
          isVolatile: false,
          name: 'Fists'
        };
        /* Live map reference — re-read each frame so zone transitions work */
        var map = S.map;

        /* Check if player is stunned. Two flavors:
           - _realStunned: true gameplay stun (hexer, brute stagger, etc.).
             Used for the stun-indicator UI (dark overlay + stars + STUNNED
             text) so the indicator only shows for actual stuns.
           - playerStunned: folds in the 250 ms hit-react lockout so input
             (joystick + keyboard + auto-attack) is suppressed during the
             hit-reaction sprite without triggering the stun visual. */
        var _hitLockActive = S.lastDamageTaken && (Date.now() - S.lastDamageTaken) < 250;
        var _realStunned = S._playerStunUntil && Date.now() < S._playerStunUntil;
        /* Dead during the death-animation hold (HP=0 or _dying set by
           a death handler).  Suppresses joystick + keyboard + dodge so
           the corpse stays put until the respawn setTimeout fires. */
        var _playerDead = !!S._dying || !!(S.rpg && S.rpg.hp <= 0);
        var playerStunned = _realStunned || _hitLockActive;
        /* Loot pickup freeze — locks movement + faces camera for 0.5s on pickup */
        var _playerLootFrozen = S._lootFreezeUntil && Date.now() < S._lootFreezeUntil;

        /* Movement — analog joystick + keyboard fallback */
        /* Dodge roll — cancelled mid-roll if the player just died. */
        if (S._dodgeRoll && !_playerDead) {
          var rollAge = Date.now() - S._dodgeRoll.startTime;
          /* v2.3.232 (Phase 2): Endurance lengthens the dodge i-frame
             window with diminishing returns.  Base 250ms, +1ms per
             Endurance up to 500ms.  Damage sites read truthiness of
             _dodgeRoll for invuln, so this directly stretches the
             invuln window in sync with the movement window. */
          var _dodgeMs = 250 + Math.min(((S.rpg && S.rpg.endurance) || 0), 250);
          if (rollAge < _dodgeMs) {
            S.player.x += Math.cos(S._dodgeRoll.angle) * 6;
            S.player.y += Math.sin(S._dodgeRoll.angle) * 6;
          } else S._dodgeRoll = null;
        } else if (S._dodgeRoll && _playerDead) {
          S._dodgeRoll = null;
        }
        /* Movement gated by REAL stuns only (hexer / brute charge).
           The 250 ms hit-react lockout (_hitLockActive) no longer
           freezes movement -- in projectile-heavy zones like meadow
           a slime hit every few seconds stacked 250 ms freezes that
           read as "frame stutter" even at 60 fps.  Visual hit-react
           sprite + screen shake + particles still play; the player
           just keeps their dodge ability mid-hit.
           Death also freezes — no walking around as a corpse. */
        var dx = (_realStunned || _playerDead || _playerLootFrozen) ? 0 : S.stickX,
          dy = (_realStunned || _playerDead || _playerLootFrozen) ? 0 : S.stickY;
        /* Keyboard overrides if no stick input — same gating:
           real stuns + death + loot-pickup freeze block, hit-react lockout does not. */
        if (!_realStunned && !_playerDead && !_playerLootFrozen && dx === 0 && dy === 0) {
          if (K['ArrowUp'] || K['w'] || K['W']) dy = -1;
          if (K['ArrowDown'] || K['s'] || K['S']) dy = 1;
          if (K['ArrowLeft'] || K['a'] || K['A']) dx = -1;
          if (K['ArrowRight'] || K['d'] || K['D']) dx = 1;
          /* Normalize diagonal keyboard input */
          if (dx && dy) {
            var len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
          }
        }
        /* Direction for name tag / facing — locked to 'down' (camera-facing) during loot freeze */
        if (_playerLootFrozen) {
          P.dir = 'down';
        } else if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          if (Math.abs(dx) > Math.abs(dy)) P.dir = dx > 0 ? 'right' : 'left';else P.dir = dy > 0 ? 'down' : 'up';
        }

        /* §14 Terrain feel — tile under player affects movement */
        var footTile = (_S$map$Math$floor$Mat = (_S$map2 = S.map) === null || _S$map2 === void 0 || (_S$map2 = _S$map2[Math.floor(P.y / TILE)]) === null || _S$map2 === void 0 ? void 0 : _S$map2[Math.floor(P.x / TILE)]) !== null && _S$map$Math$floor$Mat !== void 0 ? _S$map$Math$floor$Mat : 0;
        var terrainMult = 1.0;
        var terrainSlide = 0;
        if (footTile === 6) terrainMult = 0.7; /* sand: slightly slows */
        if (footTile === 1) terrainMult = 1.1; /* path: feels crisp, slight boost */
        if (footTile === 7) terrainMult = 0.85; /* stone: heavy */
        /* Zone-specific terrain effects */
        var curZone = ZONES[S.currentZone];
        if ((curZone === null || curZone === void 0 ? void 0 : curZone.element) === 'frost') terrainSlide = 0.92; /* ice: adds momentum/slide */
        if ((curZone === null || curZone === void 0 ? void 0 : curZone.element) === 'venom' && footTile === 0) terrainMult *= 0.85; /* swamp: heavy on grass */

        /* v2.3.224: frost-zone snow auto-collection removed.  The
           "snow" inventory key was a placeholder item with no thumb
           art and was retired alongside the Snowman build button. */

        /* Agility-based movement speed */
        var baseSpd = S.rpg ? calcMoveSpeed(S.rpg.agility || 0) / 5.0 * SPEED : SPEED;
        /* Food buff speed bonus */
        var spdBuff = S._spdBuff && Date.now() < S._spdBuff ? 1.15 : 1.0;
        /* Amulet move speed bonus */
        var amuletSpdMult = ((_S$rpg5 = S.rpg) === null || _S$rpg5 === void 0 || (_S$rpg5 = _S$rpg5._amuletBonus) === null || _S$rpg5 === void 0 ? void 0 : _S$rpg5.stat) === 'moveSpd' ? 1 + S.rpg._amuletBonus.value / 100 : 1.0;
        var swimMult = S._swimming ? SWIM_SPEED_MULT : 1.0;
        /* Shield up: half speed.  Trades mobility for the guard. */
        var shieldMult = S._shieldUp ? 0.5 : 1.0;
        var finalSpd = S._sled ? 0 : baseSpd * terrainMult * spdBuff * amuletSpdMult * swimMult * shieldMult; /* sled overrides movement */

        /* Auto-attack movement: 50% speed across the board while
           S.autoAttack is on. Backpedal flag still tracks "moving
           against aim direction" so the renderer can reverse the jog
           cycle and face the aim direction in that specific case. */
        S._backpedaling = false;
        if (S.autoAttack) {
          finalSpd *= 0.5;
          if (S._aimAngle != null && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
            var moveDotAim = dx * Math.cos(S._aimAngle) + dy * Math.sin(S._aimAngle);
            if (moveDotAim < 0) S._backpedaling = true;
          }
        }

        var nx = P.x + dx * finalSpd;
        var ny = P.y + dy * finalSpd;

        /* Store velocity for facing/mirroring code */
        P.vx = dx * finalSpd;
        P.vy = dy * finalSpd;

        /* Ice slide momentum */
        if (terrainSlide > 0 && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
          if (!S._slideVx) S._slideVx = 0;
          if (!S._slideVy) S._slideVy = 0;
          S._slideVx = S._slideVx * terrainSlide + dx * finalSpd * (1 - terrainSlide);
          S._slideVy = S._slideVy * terrainSlide + dy * finalSpd * (1 - terrainSlide);
        } else if (terrainSlide > 0) {
          S._slideVx = (S._slideVx || 0) * terrainSlide;
          S._slideVy = (S._slideVy || 0) * terrainSlide;
          if (Math.abs(S._slideVx) < 0.01) S._slideVx = 0;
          if (Math.abs(S._slideVy) < 0.01) S._slideVy = 0;
        } else {
          S._slideVx = 0;
          S._slideVy = 0;
        }

        /* ═══ PERSONAL FARM — Bed sleep mechanic ═══ */
        if (S.currentZone === 'farm_home' && footTile === FARM_BED_TILE && S.rpg) {
          if (!S._sleeping) {
            S._sleeping = {
              started: Date.now()
            };
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: 'Resting... (3s)',
              color: '#a0a0ff',
              ts: Date.now()
            });
            BT_AUDIO.beep(300, 0.04, 0.06, 'sine');
          } else {
            var sleepElapsed = Date.now() - S._sleeping.started;
            if (sleepElapsed >= HOUSE_SLEEP_MS) {
              /* Full recharge + Well Rested buff */
              var R2 = S.rpg;
              R2.hp = R2.maxHp;
              R2.stamina = R2.maxStamina;
              R2.mana = R2.maxMana;
              R2._wellRestedUntil = Date.now() + WELL_RESTED_DURATION;
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: 'Fully Rested!',
                color: '#3dd497',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 25,
                text: '+10% XP for 30 min',
                color: '#f5c542',
                ts: Date.now()
              });
              BT_AUDIO.collect();
              setTimeout(function () {
                return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
              }, 100);
              setTimeout(function () {
                return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
              }, 200);
              S._sleeping = null;
              setRpgState(_objectSpread({}, R2));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(R2));
              } catch (e) {}
            }
          }
        } else {
          S._sleeping = null;
        }

        /* Collision check — check corners of a 20x20 hitbox */
        var hs = 10;
        /* v2.3.820: monsters are SOLID — the player can't walk into/through
           a monster's body.  Fixes the "monsters run through you" feel and
           the shield arc spinning wildly as a monster overlaps your centre.
           Checked per-axis (like the tile check) so you still slide along a
           monster instead of sticking, and only blocks motion that moves
           DEEPER into a monster — so if a server-driven monster ends up on
           top of you, you can always walk back out.  Body centre uses the
           same per-archetype Y offset as tap-to-lock so the solid footprint
           lines up with the sprite you see. */
        var _monBlock = function (curX, curY, px, py) {
          var ms = S.monsters;
          if (!ms) return false;
          for (var _mi = 0; _mi < ms.length; _mi++) {
            var _m = ms[_mi];
            if (!_m || !_m.alive) continue;
            var _arch = _m.archetype || _m.type;
            var _by = _m.y - (_arch === 'fodder' ? 40 : _arch === 'snowman' ? 19 : 0);
            var _mr = _arch === 'snowman' ? 13 : (_arch === 'fodder' || MONSTER_VARIANTS[_arch]) ? 8 : 32;
            var _rr = _mr + hs;
            var _ndx = px - _m.x, _ndy = py - _by;
            var _nd2 = _ndx * _ndx + _ndy * _ndy;
            if (_nd2 < _rr * _rr) {
              var _cdx = curX - _m.x, _cdy = curY - _by;
              if (_nd2 < _cdx * _cdx + _cdy * _cdy) return true; /* moving deeper in */
            }
          }
          return false;
        };
        if (!isSolid(nx - hs, P.y - hs) && !isSolid(nx + hs, P.y - hs) && !isSolid(nx - hs, P.y + hs) && !isSolid(nx + hs, P.y + hs) && !_monBlock(P.x, P.y, nx, P.y)) P.x = nx;
        if (!isSolid(P.x - hs, ny - hs) && !isSolid(P.x + hs, ny - hs) && !isSolid(P.x - hs, ny + hs) && !isSolid(P.x + hs, ny + hs) && !_monBlock(P.x, P.y, P.x, ny)) P.y = ny;
        /* Apply ice slide */
        if (S._slideVx || S._slideVy) {
          var sx = P.x + (S._slideVx || 0),
            sy = P.y + (S._slideVy || 0);
          if (!isSolid(sx - hs, P.y - hs) && !isSolid(sx + hs, P.y + hs) && !_monBlock(P.x, P.y, sx, P.y)) P.x = sx;
          if (!isSolid(P.x - hs, sy - hs) && !isSolid(P.x + hs, sy + hs) && !_monBlock(P.x, P.y, P.x, sy)) P.y = sy;
        }
        var _zone = ZONES[S.currentZone];
        var ZONE_W = _zone.w * TILE,
          ZONE_H = _zone.h * TILE;
        /* v2.3.822: the local player sprite is CENTRE-anchored; its body
           extends ~57 world-px BELOW P.y (measured from the rendered Pixi
           bounds -- the clamp is in world coords so this is device-
           independent).  With the camera clamped to the map bottom, walking
           to the bottom edge tucked the legs/feet behind the opaque
           dashboard.  Hold the player this far above the map bottom (plus a
           buffer) so the WHOLE character stays above the dashboard -- the
           playable area ends right where the dashboard begins. */
        var _FOOT_MARGIN = 80;
        P.x = Math.max(hs, Math.min(ZONE_W - hs, P.x));
        P.y = Math.max(hs, Math.min(ZONE_H - _FOOT_MARGIN, P.y));

        /* ═══ ZONE TRANSITION — edge-based detection ═══ */
        var ptx = Math.floor(P.x / TILE),
          pty = Math.floor(P.y / TILE);

        /* v2.3.787: the zone-transition block (town-exit proximity warp,
           tile-9 return-to-town, disabled tile-10 dungeon entrance, dungeon
           exit) moved verbatim to src/game/zoneTransitions.js (REBUILD-PLAN
           Phase 6, behavior-frozen). ptx/pty/_zone are intentionally the
           PRE-transition values and stay in this scope — the water check
           below keeps reading them, same as the inline code. */
        handleZoneTransitions(S, ptx, pty, _zone, W, H);

        /* v2.3.788: the WASTELAND fence-climb block that lived here was
           removed with the rest of the Lawless Land content (owner decision,
           2026-06-12). The Ferryman NPC had been despawned long before
           (NPC_DATA emptied), so the zone was already unreachable in play. */

        /* ═══ ZONE-SPECIFIC MECHANICS ═══ */
        /* v2.3.809: per-zone mechanics (FROZEN SHORE snowballs/snowmen/sled —
           dormant, action UI disabled; TIDAL CAVES tide/swim/dive — live;
           DEEP HOLLOWS torch/echo — echo live) moved verbatim to
           src/game/zoneMechanics.js (REBUILD-PLAN Phase 8, slice 1). */
        updateZoneMechanics(S, ptx, pty);

        /* §14.1 Dungeon wave progression — v2.3.810: moved verbatim to
           src/game/dungeonWaves.js (REBUILD-PLAN Phase 8, slice 2). Custom
           §DNG dungeons are live; the standard tile-10 path is dormant. */
        updateDungeonWaves(S, { stateRef: stateRef, setRpgState: setRpgState });

        /* v2.3.823: town building entrances removed (owner request).  The
           town buildings have no in-game art yet, so their "Enter X"
           proximity prompts were floating over empty painted ground.
           Force nearBuilding null so no entrance prompt ever renders.
           (Restore the BUILDINGS proximity scan here when building art
           ships.) */
        var pTileX = Math.floor(P.x / TILE);
        var pTileY = Math.floor(P.y / TILE);
        S.nearBuilding = null;

        /* ═══ PERSONAL FARM — house proximity sleep prompt ═══ */
        if (S.currentZone === 'farm_home' && ZONES.farm_home._house) {
          var hb = ZONES.farm_home._house;
          var inHouse = P.x >= hb.x - TILE && P.x <= hb.x + hb.w + TILE && P.y >= hb.y - TILE && P.y <= hb.y + hb.h + TILE;
          S._nearHouse = inHouse;
        } else {
          S._nearHouse = false;
        }

        /* §DNG — Dungeon Workshop proximity on farm */
        if (S.currentZone === 'farm_home' && ZONES.farm_home._workshop) {
          var wb = ZONES.farm_home._workshop;
          S._nearWorkshop = P.x >= wb.x - TILE * 2 && P.x <= wb.x + wb.w + TILE * 2 && P.y >= wb.y - TILE && P.y <= wb.y + wb.h + TILE * 2;
        } else {
          S._nearWorkshop = false;
        }

        /* §PET — Pet House proximity on farm */
        if (S.currentZone === 'farm_home' && ZONES.farm_home._petHouse) {
          var pb = ZONES.farm_home._petHouse;
          S._nearPetHouse = P.x >= pb.x - TILE * 2 && P.x <= pb.x + pb.w + TILE * 2 && P.y >= pb.y - TILE && P.y <= pb.y + pb.h + TILE * 2;
        } else {
          S._nearPetHouse = false;
        }

        /* §MINI — Minigame Arena proximity on farm */
        if (S.currentZone === 'farm_home' && ZONES.farm_home._minigameArena) {
          var ma = ZONES.farm_home._minigameArena;
          S._nearMinigameArena = P.x >= ma.x - TILE * 2 && P.x <= ma.x + ma.w + TILE * 2 && P.y >= ma.y - TILE && P.y <= ma.y + ma.h + TILE * 2;
        } else {
          S._nearMinigameArena = false;
        }

        /* Revive harvested gather nodes whose respawnAt has elapsed.
           Each node keeps its original x/y/tier/etc.; we just flip
           alive back on and refill HP.  Effects renderer recreates the
           sprite next frame because the previous dispose nulled the
           _pixiSprite slot.

           Skipped when the server is authoritative -- the worker ticks
           its own respawn loop and broadcasts the revival via tick
           deltas; wsClient.js applies alive=true on the local node
           there.  Running both would race. */
        if (S.gatherNodes && !S._serverGatherNodes) {
          var _nowMs = Date.now();
          for (var _gi = 0; _gi < S.gatherNodes.length; _gi++) {
            var _gn = S.gatherNodes[_gi];
            if (!_gn.alive && _gn.respawnAt && _nowMs >= _gn.respawnAt) {
              _gn.alive = true;
              _gn.hp = _gn.maxHp;
              _gn.respawnAt = 0;
            }
          }
        }

        /* Detect nearest gatherable node.  Per-node proximity range
           scales with the node's sprite height so high-tier trees
           (112 * (1 + (tierStep-1) * 0.15) = up to ~262 px on tier
           41-50) are still reachable from the canopy area.  Was a
           fixed 100 px ceiling, which left some tall sprites visually
           in-range but proximity-out-of-range (user: "resources
           showing that have no menu to interact with it"). */
        S._nearNode = null;
        var closestDist = Infinity;
        if (S.gatherNodes) {
          S.gatherNodes.forEach(function (n) {
            if (!n.alive || n.respawnAt && Date.now() < n.respawnAt) return;
            if (n.nodeType === 'oreVein') {
              /* Ore: only offer the Mine action when the player is standing on
                 the spot one tile north of the vein (see _startExtraction). */
              var _sd = Math.sqrt(Math.pow(n.x - P.x, 2) + Math.pow((n.y - TILE) - P.y, 2));
              if (_sd < MINE_SPOT_R && _sd < closestDist) { closestDist = _sd; S._nearNode = n; }
              return;
            }
            var _baseH = n.nodeType === 'tree' ? 112 : 88;
            var _tierStep = Math.min(10, Math.max(1, Math.ceil((n.gatherLvl || 1) / 10)));
            var _spriteH = _baseH * (1 + (_tierStep - 1) * 0.15);
            var _proxR = Math.max(100, _spriteH * 0.75); /* 75% of sprite height + min 100 */
            var nd = Math.sqrt(Math.pow(n.x - P.x, 2) + Math.pow(n.y - P.y, 2));
            if (nd < _proxR && nd < closestDist) {
              closestDist = nd;
              S._nearNode = n;
            }
          });
        }
        /* v2.3.853: a lit campfire is also interactable (Cook) — treat it like
           a node for the prompt/tap path. */
        if (S._campfire && S._campfire.alive) {
          var _cfd = Math.sqrt(Math.pow(S._campfire.x - P.x, 2) + Math.pow(S._campfire.y - P.y, 2));
          if (_cfd < 80 && _cfd < closestDist) { closestDist = _cfd; S._nearNode = S._campfire; }
        }

        /* v2.3.853: firemaking → campfire lifecycle.  Firemaking is a one-shot
           animation (set when a log is lit from the Bag); when it finishes,
           light a campfire at the player.  Campfires burn out after ~45s. */
        if (S._firemaking && Date.now() >= S._firemaking.doneAt) {
          var _fm = S._firemaking;
          S._firemaking = null;
          S._campfire = {
            x: _fm.x, y: _fm.y, nodeType: 'campfire', alive: true,
            litAt: Date.now(), expiresAt: Date.now() + 45000,
            name: 'Campfire', spotName: 'Campfire', gatherLvl: 1, skill: 'cooking', emoji: '🔥',
          };
          try { BT_AUDIO.beep(360, 0.05, 0.12, 'sawtooth'); } catch (e) {}
        }
        if (S._campfire && Date.now() > S._campfire.expiresAt) {
          S._campfire.alive = false;   // so an in-progress cook cancels
          S._campfire = null;
        }

        /* v2.3.229: extraction state machine tick. Replaces the modal
           minigames. Transitions waiting -> ready when the variable
           open delay elapses; ready -> missed when the swipe window
           closes; cancels silently if the player walks beyond
           EXTRACT_CANCEL_R. Success is fired from the swipe handler
           in ExtractionSwipeLayer (Phase 3). */
        if (S._extraction) {
          var _ex = S._extraction;
          var _exNow = Date.now();
          /* v2.3.253: prefer the stored node reference, fall back to
             id lookup for server-replaced node arrays. */
          var _exNode = (_ex.nodeRef && _ex.nodeRef.alive) ? _ex.nodeRef
                       : (S.gatherNodes && _ex.nodeId
                          ? S.gatherNodes.find(function (n) { return n.id === _ex.nodeId; })
                          : null);
          if (!_exNode || !_exNode.alive) {
            /* Node disappeared (server depleted, zone changed) — silent cancel. */
            S._extraction = null;
          } else {
            var _exDx = _exNode.x - P.x, _exDy = _exNode.y - P.y;
            var _exDist = Math.sqrt(_exDx * _exDx + _exDy * _exDy);
            /* v2.3.843: the walk-away cancel radius must be at least the
               range the prompt let you START from, or chopping/fishing
               self-cancels on the very next tick.  Trees/fish use the same
               sprite-height proximity as the detection above (which reaches
               100–196px), but the flat EXTRACT_CANCEL_R is only 90px — so a
               chop begun from the canopy edge died instantly (owner: "the
               button does nothing").  Ore stays tight (90) since mining is
               done from the fixed north spot. */
            var _cancelR = EXTRACT_CANCEL_R;
            if (_exNode.nodeType !== 'oreVein') {
              var _cbH = _exNode.nodeType === 'tree' ? 112 : 88;
              var _cStep = Math.min(10, Math.max(1, Math.ceil((_exNode.gatherLvl || 1) / 10)));
              var _cProx = Math.max(100, (_cbH * (1 + (_cStep - 1) * 0.15)) * 0.75);
              _cancelR = Math.max(EXTRACT_CANCEL_R, _cProx) + 24;
            }
            if (_exDist > _cancelR) {
              /* Walk-away cancel — no XP, no node damage, no popup. */
              S._extraction = null;
            } else if (_ex.status === 'waiting' && _exNow >= _ex.windowOpensAt) {
              _ex.status = 'ready';
              try { BT_AUDIO.beep(820, 0.04, 0.05, 'sine'); } catch (e) {}
            } else if (_ex.status === 'ready' && _exNow >= _ex.windowClosesAt) {
              if (_ex.skill === 'cooking') {
                /* v2.3.853: never flipped in time → the fish burns (consume
                   raw → burnt_dust, no XP).  The campfire is not consumed. */
                applyCookingResult(S, _ex.fishKey, 'burnt', [], { setRpgState: setRpgState });
                try { BT_AUDIO.beep(200, 0.06, 0.08, 'sawtooth'); } catch (e) {}
                S._extraction = null;
              } else {
                /* Window closed without a swipe — fish swims off, axe vanishes.
                   Node depletes locally + via server in MP so it respawns on
                   its normal timer. No XP, no inventory. */
                _exNode.alive = false;
                _exNode.respawnAt = _exNow + (_exNode.respawnTime || 30000);
                if (S._serverGatherNodes && S.channel) {
                  try { S.channel.send({ type: 'node_strike', payload: { id: _exNode.id, zone: S.currentZone, accuracy: 'miss' } }); } catch (e) {}
                }
                S.dmgNumbers.push({
                  x: _exNode.x, y: _exNode.y - 10,
                  text: _ex.skill === 'fishing' ? 'Fish escaped' : 'Missed',
                  color: '#ff5e6c', ts: _exNow,
                });
                try { BT_AUDIO.beep(200, 0.06, 0.08, 'sawtooth'); } catch (e) {}
                S._extraction = null;
              }
            }
          }
        }

        /* §KB — Detect nearest interactable NPC (for E-key on desktop) */
        S._nearNpc = null;
        if (S.npcs && S.currentZone === 'town') {
          var closestNpcDist = 60;
          S.npcs.forEach(function (npc) {
            if (!npc.alive) return;
            var nd = Math.sqrt(Math.pow(npc.x - P.x, 2) + Math.pow(npc.y - P.y, 2));
            if (nd < closestNpcDist) {
              closestNpcDist = nd;
              S._nearNpc = npc;
            }
          });
        }

        /* Trail — record position every few frames */
        if (!S._trailTimer) S._trailTimer = 0;
        S._trailTimer++;
        if (S._trailTimer % 3 === 0 && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
          S.trail.push({
            x: P.x,
            y: P.y,
            ts: now
          });
          if (S.trail.length > 20) S.trail.shift();
        }
        /* Expire old trail points */
        while (S.trail.length > 0 && now - S.trail[0].ts > 800) S.trail.shift();

        /* §5.5 Expire death drops globally */
        if (S._deathDrops && S._deathDrops.length > 0) {
          S._deathDrops = S._deathDrops.filter(function (d) {
            return Date.now() < d.expiry;
          });
        }

        /* Collectible pickup removed */

        /* §18.1 PET FOLLOW + AUTO-LOOT — active pet follows player and vacuums loot */
        if (((_S$rpg7 = S.rpg) === null || _S$rpg7 === void 0 || (_S$rpg7 = _S$rpg7.lifeSkills) === null || _S$rpg7 === void 0 ? void 0 : _S$rpg7.activePet) !== null && ((_S$rpg8 = S.rpg) === null || _S$rpg8 === void 0 || (_S$rpg8 = _S$rpg8.lifeSkills) === null || _S$rpg8 === void 0 ? void 0 : _S$rpg8.activePet) !== undefined) {
          var pets = S.rpg.lifeSkills.pets || [];
          var petIdx = S.rpg.lifeSkills.activePet;
          var pet = pets[petIdx];
          if (pet) {
            /* Initialize pet position */
            if (!S._petX) {
              S._petX = P.x - 30;
              S._petY = P.y + 20;
            }
            /* Follow player — orbit slightly behind */
            var petDistToP = Math.sqrt(Math.pow(S._petX - P.x, 2) + Math.pow(S._petY - P.y, 2));
            var petTargetDist = 35;
            if (petDistToP > petTargetDist + 15) {
              var pDx = P.x - S._petX,
                pDy = P.y - S._petY;
              var pDist = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
              S._petX += pDx / pDist * 2.0;
              S._petY += pDy / pDist * 2.0;
            } else if (petDistToP < petTargetDist - 10) {
              /* Too close — drift outward */
              var bx = S._petX - P.x,
                by = S._petY - P.y;
              var bd = Math.sqrt(bx * bx + by * by) || 1;
              S._petX += bx / bd * 0.5;
              S._petY += by / bd * 0.5;
            }
            /* Personality idle movement */
            if (pet.personality === 'playful') {
              S._petX += Math.sin(now / 300) * 0.3;
              S._petY += Math.cos(now / 400) * 0.2;
            }
            if (pet.personality === 'curious') {
              S._petX += Math.sin(now / 500 + 1) * 0.5;
            }
            if (pet.personality === 'anxious') {
              S._petX += (Math.random() - 0.5) * 0.4;
              S._petY += (Math.random() - 0.5) * 0.4;
            }

            /* AUTO-LOOT — pet collects nearby ground loot */
            if (S.groundLoot) {
              S.groundLoot = S.groundLoot.filter(function (loot) {
                var ld = Math.sqrt(Math.pow(S._petX - loot.x, 2) + Math.pow(S._petY - loot.y, 2));
                if (ld < PET_LOOT_RADIUS && Date.now() > (loot.ts || 0) + 500) {
                  /* Pet picks up the loot! */
                  if (loot.isWeapon && loot.weapon) {
                    var _WEAPON_TYPES$drop$ty, _WEAPON_TYPES;
                    /* Weapon drop — equip if better, stash otherwise */
                    var drop = loot.weapon;
                    var wpnDef = WEAPON_TYPES[drop.type];
                    var isRanged = (wpnDef === null || wpnDef === void 0 ? void 0 : wpnDef.type) === 'ranged';
                    var current = isRanged ? S.rpg.rangedWeapon : S.rpg.weapon;
                    var dropPower = drop.tierMult * (((_WEAPON_TYPES$drop$ty = WEAPON_TYPES[drop.type]) === null || _WEAPON_TYPES$drop$ty === void 0 ? void 0 : _WEAPON_TYPES$drop$ty.base) || 30);
                    var curPower = ((current === null || current === void 0 ? void 0 : current.tierMult) || 1) * (((_WEAPON_TYPES = WEAPON_TYPES[(current === null || current === void 0 ? void 0 : current.type) || 'greatsword']) === null || _WEAPON_TYPES === void 0 ? void 0 : _WEAPON_TYPES.base) || 30);
                    if (dropPower >= curPower) {
                      if (current && current.name) {
                        if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                        if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) S.rpg.weaponStash.push(_objectSpread({}, current));
                      }
                      if (isRanged) S.rpg.rangedWeapon = drop;else S.rpg.weapon = drop;
                      S.dmgNumbers.push({
                        x: S._petX,
                        y: S._petY - 15,
                        text: 'PET -> ' + drop.name,
                        color: loot.tierColor || '#fff',
                        ts: Date.now()
                      });
                    } else {
                      if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                      if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) {
                        S.rpg.weaponStash.push(drop);
                        S.dmgNumbers.push({
                          x: S._petX,
                          y: S._petY - 15,
                          text: 'PET -> ' + drop.name,
                          color: '#8890b8',
                          ts: Date.now()
                        });
                      } else {
                        S.rpg.coins += Math.ceil(dropPower * 0.5);
                        S.dmgNumbers.push({
                          x: S._petX,
                          y: S._petY - 15,
                          text: 'PET -> sold',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                      }
                    }
                  } else {
                    S.rpg.coins += loot.coins || 0;
                    pushHudPopup(S, { target: 'goldIcon', text: '+' + (loot.coins || 0) + ' G', color: '#f5c542' });
                  }
                  /* Pet hands the elemental shard over too -- otherwise
                     auto-looted piles silently lose the shard since this
                     branch removes the loot entry (return false below). */
                  if (loot.shard && S.rpg.inventory) {
                    S.rpg.inventory[loot.shard] = (S.rpg.inventory[loot.shard] || 0) + 1;
                    var _petShard = shardByKey(loot.shard);
                    S.dmgNumbers.push({
                      x: S._petX,
                      y: S._petY - 28,
                      text: pet.emoji + ' + ' + (_petShard ? _petShard.label : 'Shard'),
                      color: (_petShard && _petShard.color) || '#cce6ff',
                      ts: Date.now()
                    });
                  }
                  BT_AUDIO.beep(600, 0.03, 0.04, 'sine');
                  if (!S.rpg._questFlags) S.rpg._questFlags = {};
                  S.rpg._questFlags.petLootCount = (S.rpg._questFlags.petLootCount || 0) + 1;
                  setRpgState(_objectSpread({}, S.rpg));
                  return false; /* remove loot */
                }
                return true;
              });
            }

            /* ═══ PET COMBAT — pet auto-attacks nearest enemy ═══ */
            if (S.monsters && !S._petAtkCd || Date.now() > (S._petAtkCd || 0)) {
              /* Find nearest alive monster to pet */
              var nearestM = null,
                nearestD = 80; /* 80px aggro range */
              S.monsters.forEach(function (m) {
                if (!m.alive) return;
                var d = Math.sqrt(Math.pow(S._petX - m.x, 2) + Math.pow(S._petY - m.y, 2));
                if (d < nearestD) {
                  nearestD = d;
                  nearestM = m;
                }
              });
              if (nearestM && nearestD < 40) {
                /* attack at 40px range */
                /* Pet deals 15% of player weapon damage, scales with pet level */
                var petLvl = pet.level || 1;
                var pDmgBase = S.rpg ? calcWeaponDmg((activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.type) || 'greatsword', S.rpg || {}, (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.tierMult) || 1) : 5;
                var petDmg = Math.max(1, Math.ceil(pDmgBase * 0.15 * (1 + petLvl * 0.02)));
                nearestM.curHp -= petDmg;
                S._petAtkCd = Date.now() + 1500; /* pet attacks every 1.5s */
                /* Visual feedback — small damage number from pet */
                S.dmgNumbers.push({
                  x: nearestM.x,
                  y: nearestM.y - 10,
                  text: pet.emoji + ' -' + petDmg,
                  color: pet.color || '#3dd497',
                  ts: Date.now()
                });
                /* Pet attack particles */
                for (var pp = 0; pp < 3; pp++) {
                  S.hitParticles.push({
                    x: nearestM.x + (Math.random() - 0.5) * 8,
                    y: nearestM.y + (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1 - Math.random(),
                    life: 0.3,
                    color: pet.color || '#3dd497',
                    size: 1.5
                  });
                }
                /* Pet moves toward target when attacking */
                var paDx = nearestM.x - S._petX,
                  paDy = nearestM.y - S._petY;
                var paDist = Math.sqrt(paDx * paDx + paDy * paDy) || 1;
                S._petX += paDx / paDist * 3;
                S._petY += paDy / paDist * 3;
              }
            }
          }
        }

        /* Update NPCs — §19.1 companion follow + quest interaction + wander */
        if (S.npcs) {
          S.npcs.forEach(function (npc) {
            var _npc$followZones;
            if (!npc.alive) {
              if (Date.now() > npc.respawnAt) {
                npc.alive = true;
                npc.hp = npc.maxHp;
                npc.x = npc.spawnX;
                npc.y = npc.spawnY;
              }
              return;
            }

            /* §19.1 Companion follow — NPC follows player if they have an active quest */
            var npcQuest = getNpcQuest(S.rpg, npc.name);
            var isActiveCompanion = npcQuest && npcQuest.status === 'active' && npc.canFollow && ((_npc$followZones = npc.followZones) === null || _npc$followZones === void 0 ? void 0 : _npc$followZones.includes(S.currentZone));
            var distToPlayer = Math.sqrt(Math.pow(npc.x - P.x, 2) + Math.pow(npc.y - P.y, 2));
            if (isActiveCompanion) {
              /* Follow the player — stay 40-60px behind */
              if (distToPlayer > 60) {
                var fDx = P.x - npc.x,
                  fDy = P.y - npc.y;
                var fDist = Math.sqrt(fDx * fDx + fDy * fDy);
                npc.x += fDx / fDist * 1.5;
                npc.y += fDy / fDist * 1.5;
                if (Math.abs(fDx) > Math.abs(fDy)) npc._facing = fDx > 0 ? 'right' : 'left';else npc._facing = fDy > 0 ? 'down' : 'up';
              } else if (distToPlayer < 30) {
                /* Too close — back off slightly */
                var bDx = npc.x - P.x,
                  bDy = npc.y - P.y;
                var bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
                npc.x += bDx / bDist * 0.5;
                npc.y += bDy / bDist * 0.5;
              }
              /* Quest-relevant chat — comment on progress */
              npc.chatTimer -= 16.7;
              if (npc.chatTimer <= 0) {
                var quest = npcQuest.quest;
                var isComplete = quest.check(S.rpg, S);
                var phrase = isComplete ? quest.dialogue.complete : quest.dialogue.progress;
                npc.chatBubble = {
                  text: phrase,
                  ts: Date.now(),
                  isQuest: true
                };
                BT_AUDIO.npcChat();
                npc.chatTimer = 12000 + Math.random() * 8000;
              }
            } else {
              /* Normal wander behavior */
              npc.moveTimer -= 16.7;
              var distToTarget = Math.sqrt(Math.pow(npc.x - npc.targetX, 2) + Math.pow(npc.y - npc.targetY, 2));
              if (distToTarget < 4 || npc.moveTimer <= 0) {
                var angle = Math.random() * Math.PI * 2;
                var dist = Math.random() * npc.pathRadius;
                npc.targetX = npc.spawnX + Math.cos(angle) * dist;
                npc.targetY = npc.spawnY + Math.sin(angle) * dist;
                npc.targetX = Math.max(TILE * 2, Math.min(TOWN_W - TILE * 2, npc.targetX));
                npc.targetY = Math.max(TILE * 2, Math.min(TOWN_H - TILE * 2, npc.targetY));
                npc.moveTimer = 2000 + Math.random() * 4000;
              }
              var nDx = npc.targetX - npc.x,
                nDy = npc.targetY - npc.y;
              var nDist = Math.sqrt(nDx * nDx + nDy * nDy);
              if (nDist > 2) {
                npc.x += nDx / nDist * 0.8;
                npc.y += nDy / nDist * 0.8;
                if (Math.abs(nDx) > Math.abs(nDy)) npc._facing = nDx > 0 ? 'right' : 'left';else npc._facing = nDy > 0 ? 'down' : 'up';
              }
              /* Random chat */
              npc.chatTimer -= 16.7;
              if (npc.chatTimer <= 0) {
                /* If NPC has available quest, hint at it */
                if (npcQuest && npcQuest.status === 'available' && distToPlayer < 100) {
                  npc.chatBubble = {
                    text: 'I have a task for you! Tap me.',
                    ts: Date.now(),
                    isQuest: true
                  };
                } else {
                  npc.chatBubble = {
                    text: npc.phrases[Math.floor(Math.random() * npc.phrases.length)],
                    ts: Date.now()
                  };
                }
                BT_AUDIO.npcChat();
                npc.chatTimer = 8000 + Math.random() * 15000;
              }
            }
            npc.renderX += (npc.x - npc.renderX) * 0.12;
            npc.renderY += (npc.y - npc.renderY) * 0.12;
            if (npc.chatBubble && Date.now() - npc.chatBubble.ts > 5000) npc.chatBubble = null;

            /* Quest marker above NPC head — ! for available, ? for turn-in ready */
            npc._questMarker = null;
            if (npcQuest) {
              if (npcQuest.status === 'available') npc._questMarker = '❗';else if (npcQuest.status === 'active' && npcQuest.quest.check(S.rpg, S)) npc._questMarker = '❓';
            }
          });
        }

        /* ═══ MONSTER AI + COMBAT ═══ */
        /* v2.3.811: the ~2,460-line monster AI + player-melee block moved
           verbatim to src/game/monsterCombat.js (REBUILD-PLAN Phase 8,
           slice 3). activeWpn is the outer game-loop weapon (distinct from
           the block-internal _activeWpn); React setters via deps. */
        updateMonsterCombat(S, { activeWpn: activeWpn, setRpgState: setRpgState, setLevelUpMsg: setLevelUpMsg });

        /* Pick up ground loot — walk over it */
        /* v2.3.812: the ~347-line ground-loot pickup block moved verbatim to
           src/game/groundLoot.js (REBUILD-PLAN Phase 8, slice 4). */
        updateGroundLootPickup(S, { pixiRef: pixiRef, setRpgState: setRpgState, setLevelUpMsg: setLevelUpMsg });

        /* §3.2 HP regeneration — OOC: 1.5%/s after 5s no damage. Restoration scales. */
        if (S.rpg && S.lastDamageTaken && Date.now() - S.lastDamageTaken > 5000) {
          var _R7 = S.rpg;
          /* §18.1 Food buff multipliers */
          var hasRegenBuff = S._regenBuff && Date.now() < S._regenBuff;
          var hasHpBuff = S._hpBuff && Date.now() < S._hpBuff;
          var hasManaBuff = S._manaBuff && Date.now() < S._manaBuff;
          var regenMult = hasRegenBuff ? 1.3 : 1.0;
          /* §3.2 OOC HP regen disabled (v2.3.149) -- melee-kill lifesteal
             is now the only HP recovery source per design. Stamina + mana
             regen below stay on. Worker counterpart in
             docs/specs/disable-hp-regen-server.md.
             Restoration coefficient + regen-buff multiplier left intact in
             case food-buff or amulet design adds HP heals back later. */
          /* Stamina regen — 10/s base (10 sec full recharge) × Restoration.
             v2.3.232 (Phase 2): Endurance also multiplies the regen rate.
             0.2% per point up to 2x at E=500, on top of Restoration. */
          if (_R7.stamina < _R7.maxStamina && !S._serverMonsters) {
            var _R7$_amuletBonus;
            var stRestMult = 1 + (_R7.restoration || 0) * 0.001;
            var stEndMult = 1 + (_R7.endurance || 0) * 0.002;
            var stAmuletMult = ((_R7$_amuletBonus = _R7._amuletBonus) === null || _R7$_amuletBonus === void 0 ? void 0 : _R7$_amuletBonus.stat) === 'staminaRegen' ? 1 + _R7._amuletBonus.value / 100 : 1;
            _R7.stamina = Math.min(_R7.maxStamina, _R7.stamina + 10 / 60 * stRestMult * stEndMult * regenMult * stAmuletMult);
          }
          /* Mana regen — §3.4: OOC 2.5%/s after 2s × Restoration × Mind.
             v2.3.234 (Phase 4): Mind speeds up the recharge alongside
             governing mana pool size + special-attack damage. */
          if (_R7.mana < _R7.maxMana && Date.now() - S.lastDamageTaken > 2000 && !S._serverMonsters) {
            var mRestMult = 1 + (_R7.restoration || 0) * 0.001;
            var mMindMult = 1 + (_R7.mind || 0) * 0.001;
            var manaRegenMult = hasManaBuff ? 1.3 : 1.0;
            _R7.mana = Math.min(_R7.maxMana, _R7.mana + _R7.maxMana * 0.0004 * mRestMult * mMindMult * manaRegenMult);
          }
        } else if (S.rpg) {
          /* In-combat regen — §3.2: 0.3%/s HP, stamina regens always */
          var _R8 = S.rpg;
          /* In-combat HP regen disabled (v2.3.149) -- see OOC block above. */
          /* Stamina always regens — 10/sec.
             v2.3.232 (Phase 2): Endurance multiplies combat regen too. */
          if (_R8.stamina < _R8.maxStamina && !S._serverMonsters) {
            var _stEndMult8 = 1 + (_R8.endurance || 0) * 0.002;
            _R8.stamina = Math.min(_R8.maxStamina, _R8.stamina + 10 / 60 * _stEndMult8);
          }
          /* Slow mana regen in combat — 1%/s × Mind.
             v2.3.234 (Phase 4): Mind multiplies combat regen too. */
          if (_R8.mana < _R8.maxMana && !S._serverMonsters) {
            var _mMindMult8 = 1 + (_R8.mind || 0) * 0.001;
            _R8.mana = Math.min(_R8.maxMana, _R8.mana + _R8.maxMana * 0.00017 * _mMindMult8);
          }
        }

        /* Expire damage numbers — in-place compaction so we don't
           allocate a fresh array (and discard the old one for GC) every
           frame.  Date.now() is hoisted out of the inner loop. */
        /* Release any queued peer damage numbers at a live cadence before
           the TTL prune (smooth-peer-damage-numbers.md). */
        releasePeerDamage(S, Date.now());
        if (S.dmgNumbers && S.dmgNumbers.length) {
          var _dn = S.dmgNumbers;
          var _dnNow = Date.now();
          var _dnW = 0;
          for (var _dnR = 0; _dnR < _dn.length; _dnR++) {
            if (_dnNow - _dn[_dnR].ts < 1200) {
              if (_dnW !== _dnR) _dn[_dnW] = _dn[_dnR];
              _dnW++;
            }
          }
          if (_dnW !== _dn.length) _dn.length = _dnW;
        }

        /* ═══ PLAYTIME TRACKING — increment every ~60 frames (1 second) ═══ */
        if ((_S$rpg11 = S.rpg) !== null && _S$rpg11 !== void 0 && _S$rpg11._compStats) {
          if (!S._playtimeTick) S._playtimeTick = 0;
          S._playtimeTick++;
          if (S._playtimeTick % 60 === 0) S.rpg._compStats.playtimeSeconds++;
        }

        /* §CW — Clan war timer — check if active war has ended */
        if (S._activeClanWar && S._activeClanWar.status === 'active' && Date.now() > S._activeClanWar.endTime) {
          var war = S._activeClanWar;
          war.status = 'ended';
          var cWin = war.challenger.score > war.defender.score ? war.challenger.tag : war.defender.score > war.challenger.score ? war.defender.tag : 'tie';
          war.winner = cWin;
          /* Broadcast war end */
          if (S.channel) S.channel.send({
            type: 'broadcast',
            event: 'clan_war_end',
            payload: {
              warId: war.id,
              winner: cWin
            }
          });
          /* Award rewards */
          var isWinner = S._clanData && cWin === S._clanData.tag;
          var reward = cWin === 'tie' ? CLAN_WAR_REWARDS.loser : isWinner ? CLAN_WAR_REWARDS.winner : CLAN_WAR_REWARDS.loser;
          if (S.rpg) {
            S.rpg.coins += reward.gold;
            S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + reward.ap;
            if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += reward.gold;
          }
          /* Find MVP — most kills in our team */
          var myTeamKills = war.killLog.filter(function (k) {
            var _war$challenger$membe, _war$defender$members;
            var isOurs = S._clanData && (war.challenger.tag === S._clanData.tag && ((_war$challenger$membe = war.challenger.members) === null || _war$challenger$membe === void 0 ? void 0 : _war$challenger$membe.includes(S.myId)) || war.defender.tag === S._clanData.tag && ((_war$defender$members = war.defender.members) === null || _war$defender$members === void 0 ? void 0 : _war$defender$members.includes(S.myId)));
            return isOurs && k.killer === S.myName;
          });
          if (myTeamKills.length > 0) {
            var myKills = myTeamKills.reduce(function (s, k) {
              return s + k.points;
            }, 0);
            var totalTeamKills = war.killLog.filter(function (k) {
              return k.killer !== S.myName;
            }).reduce(function (s, k) {
              return s + k.points;
            }, 0);
            if (myKills >= totalTeamKills) {
              S.rpg.coins += CLAN_WAR_REWARDS.mvp.gold;
              S.rpg.achievementPoints += CLAN_WAR_REWARDS.mvp.ap;
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 70,
                text: 'MVP! +' + CLAN_WAR_REWARDS.mvp.gold + 'G +' + CLAN_WAR_REWARDS.mvp.ap + 'AP',
                color: '#f5c542',
                ts: Date.now()
              });
            }
          }
          S.dmgNumbers.push({
            x: P.x,
            y: P.y - 55,
            text: cWin === 'tie' ? 'War ended in a TIE!' : isWinner ? 'WAR WON!' : 'War lost...',
            color: isWinner ? '#f5c542' : '#ff5e6c',
            ts: Date.now()
          });
          S.dmgNumbers.push({
            x: P.x,
            y: P.y - 40,
            text: '+' + reward.gold + 'G +' + reward.ap + 'AP',
            color: '#f5c542',
            ts: Date.now()
          });
          if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
          S.screenShake = 8;
          setTimeout(function () {
            S._activeClanWar = null;
          }, 10000);
        }

        /* §15 Tutorial progression — teach by doing */
        if (S._tutorialStep >= 0 && S._tutorialStep < 8) {
          var _S$monsters, _S$rpg12;
          var moved = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
          if (S._tutorialStep === 0 && moved) {
            /* Step 0→1: Player moved! */
            setTutorialStep(1);
            try {
              localStorage.setItem('bt_tutorial', '1');
            } catch (e) {}
          }
          if (S._tutorialStep === 1 && (S._dodgeRoll || S._hasDodged)) {
            /* Step 1→2: Player dodged! */
            setTutorialStep(2);
            try {
              localStorage.setItem('bt_tutorial', '2');
            } catch (e) {}
          }
          if (S._tutorialStep === 2 && S.isSwinging) {
            /* Step 2→3: Player attacked! */
            setTutorialStep(3);
            try {
              localStorage.setItem('bt_tutorial', '3');
            } catch (e) {}
          }
          if (S._tutorialStep === 3 && (_S$monsters = S.monsters) !== null && _S$monsters !== void 0 && _S$monsters.some(function (m) {
            return !m.alive;
          })) {
            /* Step 3→4: Player killed a monster! */
            setTutorialStep(4);
            try {
              localStorage.setItem('bt_tutorial', '4');
            } catch (e) {}
          }
          if (S._tutorialStep === 4 && S.currentZone !== 'town') {
            /* Step 4→5: Left town! */
            setTutorialStep(5);
            try {
              localStorage.setItem('bt_tutorial', '5');
            } catch (e) {}
          }
          if (S._tutorialStep === 5 && (((_S$rpg12 = S.rpg) === null || _S$rpg12 === void 0 ? void 0 : _S$rpg12.level) || 1) >= 3) {
            /* Step 7→8: Reached level 3 */
            setTutorialStep(7);
            try {
              localStorage.setItem('bt_tutorial', '7');
            } catch (e) {}
          }
          if (S._tutorialStep === 6) {
            /* Tutorial complete */
            setTutorialStep(10);
            try {
              localStorage.setItem('bt_tutorial', '10');
            } catch (e) {}
          }
        }

        /* Camera centers player in game area — with directional lead */
        var _camLead = 30; /* pixels ahead in movement direction */
        var _camLeadX = Math.abs(dx) > 0.1 ? dx * _camLead : 0;
        var _camLeadY = Math.abs(dy) > 0.1 ? dy * _camLead : 0;
        /* Camera punch — directional kick on big hits */
        var _camPunchX = 0,
          _camPunchY = 0;
        if (S._camPunch) {
          var cpAge = (Date.now() - S._camPunch.ts) / 300;
          if (cpAge < 1) {
            var cpDecay = 1 - cpAge * cpAge; /* ease-out */
            _camPunchX = S._camPunch.dx * cpDecay;
            _camPunchY = S._camPunch.dy * cpDecay;
          } else {
            S._camPunch = null;
          }
        }
        var camTargetX = P.x - W / 2 + _camLeadX + _camPunchX;
        var camTargetY = P.y - H / 2 + _camLeadY + _camPunchY;
        /* Adaptive lerp — snappier during fast movement / combat */
        var _camSpeed = S.isSwinging || S._dodgeRoll ? 0.18 : Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 ? 0.14 : 0.08;
        S.camera.x += (camTargetX - S.camera.x) * _camSpeed;
        S.camera.y += (camTargetY - S.camera.y) * _camSpeed;
        /* v2.3.819: clamp the camera to the map so the viewport never shows
           the out-of-bounds void.  Player movement is already bounded to the
           same ZONE_W/ZONE_H (the P.x/P.y clamp above), so the player keeps
           running toward the screen edge while the camera holds at the map
           boundary -- centered in open areas, edge-locked near the borders.
           Maps narrower/shorter than the viewport (only possible on a very
           wide desktop window) center instead, since some void is then
           unavoidable. */
        var _maxCamX = ZONE_W - W;
        var _maxCamY = ZONE_H - H;
        S.camera.x = _maxCamX <= 0 ? _maxCamX / 2 : Math.max(0, Math.min(_maxCamX, S.camera.x));
        S.camera.y = _maxCamY <= 0 ? _maxCamY / 2 : Math.max(0, Math.min(_maxCamY, S.camera.y));

        /* Broadcast position — slim payload for speed */
        var now = performance.now();
        var isMoving = dx || dy || S._dodgeRoll;
        /* v2.3.396: also broadcast when the facing changes while standing
           (turning to aim without moving) so remote clients see the turn --
           the move payload now carries the true rendered facing (f). */
        var _facingChanged = S._renderFacing && S._renderFacing !== S._lastBroadcastFacing;
        if (now - S.lastBroadcast > 33 && (isMoving || _facingChanged)) {
          S.lastBroadcast = now;
          S._lastBroadcastFacing = S._renderFacing;
          if (S.channel) {
            if (S.channel && (!S._lastMoveBroadcast || Date.now() - S._lastMoveBroadcast > 33)) {
              S._lastMoveBroadcast = Date.now();
              /* Calculate effective velocity — use dodge direction during roll */
              var bcastVx = P.vx;
              var bcastVy = P.vy;
              if (S._dodgeRoll) {
                bcastVx = Math.cos(S._dodgeRoll.angle) * 6;
                bcastVy = Math.sin(S._dodgeRoll.angle) * 6;
              }
              S.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: {
                  i: S.myId,
                  x: Math.round(P.x * 10) / 10,
                  y: Math.round(P.y * 10) / 10,
                  d: P.dir,
                  f: S._renderFacing || null,
                  z: S.currentZone || 'town',
                  vx: Math.round(bcastVx * 100),
                  vy: Math.round(bcastVy * 100),
                  /* v2.3.599: carry equipped gear so remote clients reflect
                     armour on/off live (the renderer reads other.equip; it was
                     only set at join/state_sync, so armour removal never showed
                     for others).  Short ids, cheap. Standing-still changes ride
                     the 2s `track` below + the player_update remap. */
                  eqc: getEquip('chest'),
                  eql: getEquip('legs'),
                  eqs: getEquip('shoulders')
                }
              });
            }
            if (S.channel && (!S._lastTrack || Date.now() - S._lastTrack > 2000)) {
              var _rpg$lifeSkills7, _rpg$lifeSkills$pets, _rpg$_anniversaryItem, _rpg$armor, _rpg$shield, _rpg$amulet, _rpg$_compStats, _rpg$_compStats2, _rpg$_compStats3, _rpg$_compStats4, _rpg$_compStats5, _rpg$_compStats6, _rpg$_compStats7, _rpg$_compStats8, _S$_clanData2, _S$_clanData3, _S$_clanData4;
              S._lastTrack = Date.now();
              var _rpg = S.rpg;
              var _aw = getActiveWeapon(_rpg);
              S.channel.track({
                x: P.x,
                y: P.y,
                name: S.myName,
                color: S.myColor,
                avatar: S.myAvatar,
                dir: P.dir,
                bt: S.bodyTorso,
                bl: S.bodyLegs,
                hw: getHeadwear(),
                fh: getFacialHair(),
                hr: getHair(),
                sk: getSkin(),
                hc: getHairColor(),
                htc: getHatColor(),
                fhc: getFacialHairColor(),
                st: getShirt(),
                stc: getShirtColor(),
                eqc: getEquip('chest'),
                eql: getEquip('legs'),
                eqs: getEquip('shoulders'),
                pt: getPants(),
                sh: getShoes(),
                rpgLv: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.level) || 1,
                rpgHp: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.hp) || 50,
                rpgMaxHp: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.maxHp) || 50,
                bs: S.bodySize || 'slim',
                zone: S.currentZone || 'town',
                wpnType: (_aw === null || _aw === void 0 ? void 0 : _aw.type) || 'greatsword',
                wpnE1: (_aw === null || _aw === void 0 ? void 0 : _aw.element1) || null,
                wpnE2: (_aw === null || _aw === void 0 ? void 0 : _aw.element2) || null,
                rep: S._pvpReputation || 'neutral',
                pet: (_rpg === null || _rpg === void 0 || (_rpg$lifeSkills7 = _rpg.lifeSkills) === null || _rpg$lifeSkills7 === void 0 ? void 0 : _rpg$lifeSkills7.activePet) != null ? (_rpg$lifeSkills$pets = _rpg.lifeSkills.pets) === null || _rpg$lifeSkills$pets === void 0 || (_rpg$lifeSkills$pets = _rpg$lifeSkills$pets[_rpg.lifeSkills.activePet]) === null || _rpg$lifeSkills$pets === void 0 ? void 0 : _rpg$lifeSkills$pets.emoji : null,
                mask: (_rpg === null || _rpg === void 0 ? void 0 : _rpg._activeMask) || null,
                cape: _rpg !== null && _rpg !== void 0 && (_rpg$_anniversaryItem = _rpg._anniversaryItems) !== null && _rpg$_anniversaryItem !== void 0 && _rpg$_anniversaryItem.find(function (a) {
                  return a.type === 'cape';
                }) ? true : false,
                /* Extended RPG data for inspect card */
                rpgData: {
                  weapon: (_aw === null || _aw === void 0 ? void 0 : _aw.name) || 'Fists',
                  armor: (_rpg === null || _rpg === void 0 || (_rpg$armor = _rpg.armor) === null || _rpg$armor === void 0 ? void 0 : _rpg$armor.name) || 'Rags',
                  shield: (_rpg === null || _rpg === void 0 || (_rpg$shield = _rpg.shield) === null || _rpg$shield === void 0 ? void 0 : _rpg$shield.name) || null,
                  amulet: (_rpg === null || _rpg === void 0 || (_rpg$amulet = _rpg.amulet) === null || _rpg$amulet === void 0 ? void 0 : _rpg$amulet.name) || null,
                  power: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.power) || 0,
                  vitality: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.vitality) || 0,
                  endurance: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.endurance) || 0,
                  agility: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.agility) || 0,
                  mind: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.mind) || 0,
                  ap: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.achievementPoints) || 0,
                  kills: (_rpg === null || _rpg === void 0 || (_rpg$_compStats = _rpg._compStats) === null || _rpg$_compStats === void 0 ? void 0 : _rpg$_compStats.monstersKilled) || 0,
                  pvpKills: (_rpg === null || _rpg === void 0 || (_rpg$_compStats2 = _rpg._compStats) === null || _rpg$_compStats2 === void 0 ? void 0 : _rpg$_compStats2.pvpKills) || 0,
                  pvpDeaths: (_rpg === null || _rpg === void 0 || (_rpg$_compStats3 = _rpg._compStats) === null || _rpg$_compStats3 === void 0 ? void 0 : _rpg$_compStats3.pvpDeaths) || 0,
                  deaths: (_rpg === null || _rpg === void 0 || (_rpg$_compStats4 = _rpg._compStats) === null || _rpg$_compStats4 === void 0 ? void 0 : _rpg$_compStats4.deaths) || 0,
                  quests: (_rpg === null || _rpg === void 0 || (_rpg$_compStats5 = _rpg._compStats) === null || _rpg$_compStats5 === void 0 ? void 0 : _rpg$_compStats5.questsCompleted) || 0,
                  playtime: Math.floor(((_rpg === null || _rpg === void 0 || (_rpg$_compStats6 = _rpg._compStats) === null || _rpg$_compStats6 === void 0 ? void 0 : _rpg$_compStats6.playtimeSeconds) || 0) / 60),
                  dungeons: (_rpg === null || _rpg === void 0 || (_rpg$_compStats7 = _rpg._compStats) === null || _rpg$_compStats7 === void 0 ? void 0 : _rpg$_compStats7.dungeonsCleared) || 0,
                  goldEarned: (_rpg === null || _rpg === void 0 || (_rpg$_compStats8 = _rpg._compStats) === null || _rpg$_compStats8 === void 0 ? void 0 : _rpg$_compStats8.totalGoldEarned) || 0,
                  lifeTotal: function () {
                    var ls = _rpg === null || _rpg === void 0 ? void 0 : _rpg.lifeSkills;
                    if (!ls) return 0;
                    return LIFE_SKILLS.reduce(function (s, k) {
                      var _ls$k;
                      return (((_ls$k = ls[k]) === null || _ls$k === void 0 ? void 0 : _ls$k.level) || 0) + s;
                    }, 0);
                  }(),
                  clanTag: ((_S$_clanData2 = S._clanData) === null || _S$_clanData2 === void 0 ? void 0 : _S$_clanData2.tag) || null,
                  clanName: ((_S$_clanData3 = S._clanData) === null || _S$_clanData3 === void 0 ? void 0 : _S$_clanData3.name) || null,
                  clanColor1: ((_S$_clanData4 = S._clanData) === null || _S$_clanData4 === void 0 ? void 0 : _S$_clanData4.color1) || null
                }
              });
            }
          }
        }
        /* Attack energy recharge */
        S._atkEnergy = (_S$_atkEnergy = S._atkEnergy) !== null && _S$_atkEnergy !== void 0 ? _S$_atkEnergy : 100;
        if (S._atkEnergy < 100) S._atkEnergy = Math.min(100, S._atkEnergy + 0.5);

        /* §2.3 Shield — drains stamina while held. 10/sec = 10 second hold
           at 100 max stamina (was 20/sec → 5 s; user reported shield
           "losing its hold" while finger was still down — auto-release
           on stamina-out happening sooner than expected). */
        if (S._shieldUp && S.rpg) {
          /* 10 stamina/sec at 60fps = 0.167/frame.  In MP the worker
             runs the drain on its tick (5/tick at ~1.5 Hz ≈ 7.5/sec),
             so skip the local mutation -- player_state will sync the
             bar.  Local predict still helps the auto-release feel
             responsive at 0, so we keep the <=0 release branch. */
          if (!S._serverMonsters) {
            S.rpg.stamina = Math.max(0, (S.rpg.stamina || 0) - 0.167);
          }
          S.shieldEnd = Date.now() + 100;
          if (S.rpg.stamina <= 0) {
            S.rpg.stamina = 0;
            S._shieldUp = false;
            S._shieldCdUntil = Date.now() + 2000;
            S.shieldEnd = 0;
            /* Flag the active double-tap-hold gesture as auto-released
               so the right-joystick handler doesn't fire a second
               endBlock + broadcast on the eventual touch-end. */
            S._shieldAutoReleased = true;
            try { blockRingBus.endBlock(); } catch (e) {}
            if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: false }});
          }
        } else {
          S.shieldEnd = 0;
        }


        /* ══════════════════════════════════════════════════════════
           ── VISUAL SYSTEM UPDATES (pre-render simulation) ──
           Game logic extracted from the render section so that
           rendering becomes pure "read state, draw pixels."
           ══════════════════════════════════════════════════════════ */

        /* ── Screen-shake / facing / footstep / interp / remote-projectile:
           v2.3.814: moved verbatim to src/game/visualSystems.js
           (REBUILD-PLAN Phase 8, slice 6). ── */
        updateVisualSystems(S);

        /* ── Arrow projectile simulation — v2.3.813: moved verbatim to
           src/game/projectiles.js (REBUILD-PLAN Phase 8, slice 5). ── */
        updateArrows(S, { setRpgState: setRpgState, setLevelUpMsg: setLevelUpMsg });

        /* ── Slime projectile simulation — v2.3.813: moved verbatim to
           src/game/projectiles.js (REBUILD-PLAN Phase 8, slice 5). ── */
        updateSlimeProjectiles(S);

        /* ── State cleanup flags — v2.3.815: moved verbatim to
           src/game/stateCleanup.js (REBUILD-PLAN Phase 8, slice 7). ── */
        updateStateCleanup(S);

        /* ══════════════════════════════════════════════════════════
           ── RENDER ── PixiJS only.  The Canvas 2D fallback path was
           removed once every system finished migrating; if Pixi
           throws here we log + flag and let the next frame retry,
           instead of trying to re-init a defunct Canvas 2D pipeline.
           ══════════════════════════════════════════════════════════ */
        /* Sim/render split — always on, logs only on slow frames
           (>30 ms) and throttled to once every 500 ms to avoid spam
           in the mobile console.  Tells us whether the JS game-loop
           work (simMs) or the Pixi render (renderMs) is the
           bottleneck.  */
        /* Sim/render split — the render half moved verbatim to
           src/game/renderFrame.js (v2.3.816, REBUILD-PLAN Phase 8 slice 8).
           Frame-timing values (_perfNow/_perfDelta) computed at loop top
           are passed in; perfTracker recording lives in the module now. */
        renderFrame(S, { pixiRef: pixiRef, canvas: canvas, nfts: nfts, perfNow: _perfNow, perfDelta: _perfDelta });
      } catch (gameLoopErr) {
        console.error('GameLoop error:', gameLoopErr.message, gameLoopErr.stack);
      }
    };
    perfTracker.init();
    perfTracker.setZone(stateRef.current.currentZone || 'town');
    frameRef.current = requestAnimationFrame(_gameLoop);

    /* ═══ DESKTOP KEYBOARD CONTROLS ═══ */
    /* v2.3.789: keyboard handlers moved verbatim to
       src/game/desktopControls.js (REBUILD-PLAN Phase 7, behavior-frozen).
       The _desktop* helpers and the dodge resolver stay in this component
       (they're shared with the touch controls) and go in via deps. */
    var teardownDesktopControls = setupDesktopControls(S, {
      triggerContextualDodge: triggerContextualDodge,
      _desktopEnterBuilding: _desktopEnterBuilding,
      _desktopSleep: _desktopSleep,
      _desktopOpenWorkshop: _desktopOpenWorkshop,
      _desktopGather: _desktopGather,
      _desktopNpcQuest: _desktopNpcQuest,
      _desktopShieldOn: _desktopShieldOn,
      _desktopShieldOff: _desktopShieldOff,
      _desktopCycleWeapon: _desktopCycleWeapon,
      _desktopSelectSlot: _desktopSelectSlot,
      _desktopSpecialAttack: _desktopSpecialAttack,
      _desktopCloseAll: _desktopCloseAll,
      setShowPetHouse: setShowPetHouse,
      setShowMinigame: setShowMinigame,
      setChatOpen: setChatOpen,
      chatInputRef: chatInputRef,
      chatOpen: chatOpen
    });
    return function () {
      cancelAnimationFrame(frameRef.current);
      teardownDesktopControls();
      window.removeEventListener('resize', resize);
      if (resizeObs) resizeObs.disconnect();
      if (vv) vv.removeEventListener('resize', resize);
      window._rebuildRenderer = null;
      /* v2.3.772: destroy() can throw mid-teardown when the GL context is
         already dead (the very case the epoch rebuild handles) -- never
         let that skip the ref nulling or the re-init guard stays blocked. */
      if (pixiRef.current) {
        try { pixiRef.current.destroy(); } catch (e) {}
        pixiRef.current = null;
        window._pixiRenderer = null;
        window.__pixiActive = false;
      }
    };
  }, [showNameModal, showLogin, glEpoch]);

  /* Sync nearBuilding + player list from game loop to React */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    /* v2.3.777: tiny world-canvas readback -> % of pixels brighter than
       near-black.  Cheap (32x18) and only every 5s. */
    function _sampleLit() {
      try {
        var cv = canvasRef.current;
        if (!cv || !cv.width) return -1;
        var c2 = document.createElement('canvas');
        c2.width = 32;
        c2.height = 18;
        var g2 = c2.getContext('2d');
        g2.drawImage(cv, 0, 0, 32, 18);
        var d2 = g2.getImageData(0, 0, 32, 18).data;
        var lit = 0;
        for (var i2 = 0; i2 < d2.length; i2 += 4) {
          if (d2[i2] + d2[i2 + 1] + d2[i2 + 2] > 30) lit++;
        }
        return Math.round(100 * lit / (32 * 18));
      } catch (e) { return -1; }
    }
    var interval = setInterval(function () {
      var S = stateRef.current;
      /* v2.3.777: black-screen watchdog + resume-snapshot heartbeat.
         The watchdog is the FINAL stability line: it judges recovery by
         actual pixels, not renderer health flags.  Dark 10s -> in-place
         rebuild.  Dark 20s -> flag a recovery reload and reload the page;
         the auto-rejoin effect puts the player straight back into the
         world (fresh boots have never failed).  Capped at 2 reloads per
         5 min so a server-side black screen can't loop the page. */
      var _nowWd = Date.now();
      if (!S.__wdArmedAt) S.__wdArmedAt = _nowWd; /* grace for first bake */
      if ((!S.__wdNext || _nowWd >= S.__wdNext) && _nowWd - S.__wdArmedAt > 15000) {
        S.__wdNext = _nowWd + 5000;
        if (!S.__wdHb || _nowWd - S.__wdHb > 30000) {
          S.__wdHb = _nowWd;
          try {
            var _rawHb = sessionStorage.getItem('bt_resume') || localStorage.getItem('bt_resume');
            if (_rawHb) {
              var _snHb = JSON.parse(_rawHb);
              _snHb.t = _nowWd;
              var _strHb = JSON.stringify(_snHb);
              sessionStorage.setItem('bt_resume', _strHb);
              localStorage.setItem('bt_resume', _strHb);
            }
          } catch (e) {}
        }
        if (document.visibilityState === 'visible') {
          requestAnimationFrame(function () {
            var _pctWd = _sampleLit();
            if (_pctWd < 0) return;
            if (_pctWd >= 1) { S.__wdDark = 0; return; }
            S.__wdDark = (S.__wdDark || 0) + 1;
            try {
              import('../debug/crashTrap.js').then(function (ct) {
                ct.recordCrash('watchdog-dark', 'screen ' + _pctWd + '% lit, strike ' + S.__wdDark);
              }).catch(function () {});
            } catch (e) {}
            if (S.__wdDark === 2 && window._rebuildRenderer) {
              window._rebuildRenderer('watchdog: screen dark 10s');
            }
            if (S.__wdDark >= 4) {
              S.__wdDark = 0;
              try {
                var _rls = JSON.parse(sessionStorage.getItem('bt-reloads') || '[]').filter(function (t) { return Date.now() - t < 300000; });
                if (_rls.length < 2) {
                  _rls.push(Date.now());
                  sessionStorage.setItem('bt-reloads', JSON.stringify(_rls));
                  sessionStorage.setItem('bt_resume_now', '1');
                  import('../debug/crashTrap.js').then(function (ct) {
                    ct.recordCrash('auto-reload', 'world dark 20s despite rebuild -- reloading into game');
                  }).catch(function () {});
                  setTimeout(function () { window.location.reload(); }, 350);
                }
              } catch (e) {}
            }
          });
        }
      }
      var nb = S.nearBuilding;
      setNearBuilding(function (prev) {
        return prev === nb ? prev : nb;
      });
      /* Update player list */
      var list = Object.entries(S.others).map(function (_ref27) {
        var _ref28 = _slicedToArray(_ref27, 2),
          id = _ref28[0],
          o = _ref28[1];
        return {
          id: id,
          name: o.name,
          color: o.color,
          avatar: o.avatar,
          bro: o.bro,
          x: o.x,
          y: o.y,
          badges: o.badges,
          stats: o.stats
        };
      });
      setPlayerList(list);
      /* Check achievements */
      var S2 = stateRef.current;
      if (S2.stats) {
        var _stateRef$current$sta;
        /* Sync RPG stats to stats object for achievement checks */
        if (S2.rpg) {
          var _S2$rpg$_compStats, _S2$rpg$_compStats2, _S2$rpg$_compStats3, _S2$rpg$_customDungeo, _S2$rpg$_compStats4, _S2$rpg$lifeSkills, _S2$rpg$_compStats5, _S2$rpg$_compStats6, _S2$rpg$_compStats7, _S2$rpg$_compStats8;
          S2.stats._combatLevel = S2.rpg.level || 1;
          S2.stats._arenaEntered = ((_S2$rpg$_compStats = S2.rpg._compStats) === null || _S2$rpg$_compStats === void 0 ? void 0 : _S2$rpg$_compStats.arenaEntered) || S2.stats._arenaEntered || 0;
          S2.stats._arenaWins = ((_S2$rpg$_compStats2 = S2.rpg._compStats) === null || _S2$rpg$_compStats2 === void 0 ? void 0 : _S2$rpg$_compStats2.arenaWins) || S2.stats._arenaWins || 0;
          S2.stats._arenaChampion = ((_S2$rpg$_compStats3 = S2.rpg._compStats) === null || _S2$rpg$_compStats3 === void 0 ? void 0 : _S2$rpg$_compStats3.arenaChampion) || S2.stats._arenaChampion || 0;
          S2.stats._furnitureCrafted = S2.rpg._furniture ? Object.keys(S2.rpg._furniture).length : 0;
          S2.stats._dungeonsCreated = ((_S2$rpg$_customDungeo = S2.rpg._customDungeons) === null || _S2$rpg$_customDungeo === void 0 ? void 0 : _S2$rpg$_customDungeo.length) || 0;
          S2.stats._petsEvolved = ((_S2$rpg$_compStats4 = S2.rpg._compStats) === null || _S2$rpg$_compStats4 === void 0 ? void 0 : _S2$rpg$_compStats4.petsEvolved) || S2.stats._petsEvolved || 0;
          var _petsArr = ((_S2$rpg$lifeSkills = S2.rpg.lifeSkills) === null || _S2$rpg$lifeSkills === void 0 ? void 0 : _S2$rpg$lifeSkills.pets) || [];
          if (!Array.isArray(_petsArr)) _petsArr = Object.values(_petsArr); /* v2.3.768 shape guard */
          S2.stats._mythicPets = _petsArr.filter(function (p) {
            return (p.evolutionTier || 0) >= 3;
          }).length;
          S2.stats._mktTrades = ((_S2$rpg$_compStats5 = S2.rpg._compStats) === null || _S2$rpg$_compStats5 === void 0 ? void 0 : _S2$rpg$_compStats5.mktTrades) || S2.stats._mktTrades || 0;
          S2.stats._customDungeonsCleared = ((_S2$rpg$_compStats6 = S2.rpg._compStats) === null || _S2$rpg$_compStats6 === void 0 ? void 0 : _S2$rpg$_compStats6.customDungeonsCleared) || S2.stats._customDungeonsCleared || 0;
          S2.stats._warsParticipated = ((_S2$rpg$_compStats7 = S2.rpg._compStats) === null || _S2$rpg$_compStats7 === void 0 ? void 0 : _S2$rpg$_compStats7.warsParticipated) || S2.stats._warsParticipated || 0;
          S2.stats._warMvps = ((_S2$rpg$_compStats8 = S2.rpg._compStats) === null || _S2$rpg$_compStats8 === void 0 ? void 0 : _S2$rpg$_compStats8.warMvps) || S2.stats._warMvps || 0;
          /* Guild stats */
          var gp = S2.rpg._guildProgress || {};
          S2.stats._guildRanksEarned = Object.values(gp).reduce(function (s, v) {
            return s + v;
          }, 0);
          S2.stats._guildMasterCount = LIFE_SKILLS.filter(function (k) {
            var _S2$rpg$lifeSkills2;
            return (((_S2$rpg$lifeSkills2 = S2.rpg.lifeSkills) === null || _S2$rpg$lifeSkills2 === void 0 || (_S2$rpg$lifeSkills2 = _S2$rpg$lifeSkills2[k]) === null || _S2$rpg$lifeSkills2 === void 0 ? void 0 : _S2$rpg$lifeSkills2.level) || 0) >= 70;
          }).length;
          S2.stats._guildJourneymanAll = LIFE_SKILLS.every(function (k) {
            var _S2$rpg$lifeSkills3;
            return (((_S2$rpg$lifeSkills3 = S2.rpg.lifeSkills) === null || _S2$rpg$lifeSkills3 === void 0 || (_S2$rpg$lifeSkills3 = _S2$rpg$lifeSkills3[k]) === null || _S2$rpg$lifeSkills3 === void 0 ? void 0 : _S2$rpg$lifeSkills3.level) || 0) >= 25;
          });
        }
        /* v2.3.820: achievement toast notifications removed at the owner's
           request ("First Steps", "Renaissance", etc. -- none were
           intentional content).  Badges are still recorded silently so any
           profile/stat that reads S.badges keeps working; only the popup +
           its sound are suppressed.  Level-up, XP, damage, and chat
           feedback are untouched (separate systems). */
        BT_ACHIEVEMENTS.forEach(function (a) {
          if (!S2.badges.includes(a.id) && a.check(S2.stats)) {
            S2.badges.push(a.id);
            S2.stats.badges = _toConsumableArray(S2.badges);
            setMyBadges(_toConsumableArray(S2.badges));
          }
        });
        /* Save stats periodically */
        var statsToSave = _objectSpread(_objectSpread({}, S2.stats), {}, {
          visitedBuildings: S2.stats.visitedBuildings instanceof Set ? _toConsumableArray(S2.stats.visitedBuildings) : S2.stats.visitedBuildings,
          badges: S2.badges
        });
        try {
          localStorage.setItem('bt_stats', JSON.stringify(statsToSave));
        } catch (e) {}
        if (stateRef.current._statsSyncTimer === undefined) stateRef.current._statsSyncTimer = 0;
        stateRef.current._statsSyncTimer++;
        if (stateRef.current._statsSyncTimer % 600 === 0 && getBtPlayerId()) btRpc('bt_update_stats', {
          p_id: getBtPlayerId(),
          p_steps: Math.min(100, ((_stateRef$current$sta = stateRef.current.stats) === null || _stateRef$current$sta === void 0 ? void 0 : _stateRef$current$sta.steps) || 0),
          p_msgs: 0
        });
      }
      /* Clear collect notification after 2s */
      setCollectMsg(function (prev) {
        return prev && Date.now() - prev.ts > 2500 ? null : prev;
      });
      setAchievementMsg(function (prev) {
        return prev && Date.now() - prev.ts > 3500 ? null : prev;
      });
      setSwordReady(Date.now() - stateRef.current.swingTimer >= SWING_COOLDOWN);
      setLevelUpMsg(function (prev) {
        return prev && Date.now() - prev.ts > 3500 ? null : prev;
      });

      /* §ARENA — Background polling for arena match status */
      var S3 = stateRef.current;
      if (!S3._arenaLastBgPoll) S3._arenaLastBgPoll = 0;
      if (Date.now() - S3._arenaLastBgPoll > ARENA_POLL_INTERVAL) {
        S3._arenaLastBgPoll = Date.now();
        fetch(BT_API_BASE + '/api/arena/status?playerId=' + encodeURIComponent(S3.myId)).then(function (r) {
          return r.json();
        }).then(function (d) {
          var _d$tournament3, _d$tournament4, _S3$_betsPaidOut;
          if (!d.ok) return;
          setArenaStatus(d);
          if (d.tournament) setArenaTournament(d.tournament);
          /* Store current match on stateRef for PvP kill hook */
          if (d.status === 'fighting' && d.currentMatch) {
            var _d$tournament2;
            S3._arenaMatch = d.currentMatch;
            S3._arenaTournamentId = (_d$tournament2 = d.tournament) === null || _d$tournament2 === void 0 ? void 0 : _d$tournament2.id;
            /* Notify player they have a match */
            if (!S3._arenaNotified || S3._arenaNotified !== d.currentMatch.id) {
              S3._arenaNotified = d.currentMatch.id;
              var opp = d.currentMatch.p1 === S3.myId ? d.currentMatch.p2Name : d.currentMatch.p1Name;
              S3.dmgNumbers.push({
                x: S3.player.x,
                y: S3.player.y - 50,
                text: 'ARENA MATCH! vs ' + opp,
                color: '#ff5e6c',
                ts: Date.now()
              });
              BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
              setTimeout(function () {
                return BT_AUDIO.beep(200, 0.12, 0.15, 'sawtooth');
              }, 100);
              S3.screenShake = 4;
            }
          } else {
            S3._arenaMatch = null;
          }
          /* §BET — Check for bet payouts when tournament completes */
          if (((_d$tournament3 = d.tournament) === null || _d$tournament3 === void 0 ? void 0 : _d$tournament3.status) === 'complete' && (_d$tournament4 = d.tournament) !== null && _d$tournament4 !== void 0 && _d$tournament4.champion && !((_S3$_betsPaidOut = S3._betsPaidOut) !== null && _S3$_betsPaidOut !== void 0 && _S3$_betsPaidOut[d.tournament.id])) {
            if (!S3._betsPaidOut) S3._betsPaidOut = {};
            S3._betsPaidOut[d.tournament.id] = true;
            var R3 = S3.rpg;
            var myBets = ((R3 === null || R3 === void 0 ? void 0 : R3._arenaBets) || []).filter(function (b) {
              return b.tournamentId === d.tournament.id;
            });
            if (myBets.length > 0) {
              var champId = d.tournament.champion.id;
              var totalWon = 0,
                totalLost = 0;
              myBets.forEach(function (b) {
                if (b.targetPlayerId === champId) {
                  /* Winner! Payout = bet × number of remaining players at time of bet (simplified: 3x) */
                  var payout = b.amount * 3;
                  totalWon += payout;
                  R3.coins += payout;
                  if (R3._compStats) R3._compStats.totalGoldEarned += payout;
                  if (!S3.stats._betsWon) S3.stats._betsWon = 0;
                  S3.stats._betsWon++;
                } else {
                  totalLost += b.amount;
                }
              });
              if (totalWon > 0) {
                S3.dmgNumbers.push({
                  x: S3.player.x,
                  y: S3.player.y - 60,
                  text: 'BET WON! +' + totalWon + 'G',
                  color: '#f5c542',
                  ts: Date.now()
                });
                BT_AUDIO.collect();
              } else {
                S3.dmgNumbers.push({
                  x: S3.player.x,
                  y: S3.player.y - 60,
                  text: 'Bet lost (-' + totalLost + 'G)',
                  color: 'rgba(255,255,255,.4)',
                  ts: Date.now()
                });
              }
              setRpgState(_objectSpread({}, R3));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(R3));
              } catch (_unused12) {}
            }
          }
        }).catch(function () {});
      }
    }, 500);
    return function () {
      return clearInterval(interval);
    };
  }, [showNameModal, showLogin]);

  /* Send emote */
  /* Sword swing attack */
  /* Dodge roll */
  var canvasTouchRef = useRef({
    id: null,
    x: 0,
    y: 0,
    t: 0
  });
  var handleCanvasSwipe = useCallback(function (startX, startY, endX, endY, duration) {
    var dx = endX - startX,
      dy = endY - startY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = dist / Math.max(duration, 1);
    if (speed < 0.8 || dist < 30 || duration > 300) return; /* not a swipe */
    var ang = Math.atan2(dy, dx);
    var S = stateRef.current;
    var R = S.rpg;
    if (!R || S._dodgeRoll) return;
    /* §5.8 Contextual dodge — same input picks dodge / lunge / retreat-shot
       based on lock-on state, swipe direction, and active weapon type. */
    triggerContextualDodge(S, R, ang);
  }, []);
  /* §5.8 — contextual dodge / lunge / retreat-shot cluster moved verbatim
     to src/game/dodge.js (v2.3.817). triggerContextualDodge is imported at
     the top; it dispatches to the internal doStandardDodge/doLunge/
     doRetreatShot. Shared by the touch swipe handler + desktop keyboard. */
  var doSwing = useCallback(function () {
    swingAttack(stateRef.current);
  }, []);

  /* Special attack — 4x damage, 10s cooldown */
  var _useState209 = useState(0),
    _useState210 = _slicedToArray(_useState209, 2),
    specialCd = _useState210[0],
    setSpecialCd = _useState210[1];
  var _useState211 = useState(true),
    _useState212 = _slicedToArray(_useState211, 2),
    swordReady = _useState212[0],
    setSwordReady = _useState212[1];
  var _useState213 = useState(window.innerWidth > window.innerHeight),
    _useState214 = _slicedToArray(_useState213, 2),
    isLandscape = _useState214[0],
    setIsLandscape = _useState214[1];

  /* Re-render on orientation change */
  useEffect(function () {
    var _window$screen;
    var onResize = function onResize() {
      return setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    if ((_window$screen = window.screen) !== null && _window$screen !== void 0 && _window$screen.orientation) window.screen.orientation.addEventListener('change', onResize);
    return function () {
      var _window$screen2;
      window.removeEventListener('resize', onResize);
      if ((_window$screen2 = window.screen) !== null && _window$screen2 !== void 0 && _window$screen2.orientation) window.screen.orientation.removeEventListener('change', onResize);
    };
  }, []);
  /* Expose legacy panel toggles for the utility wheel (replaces toolbar). */
  useEffect(function () {
    window.__broLegacyUI = {
      stats:        function () { setShowStatScreen(function (v) { return !v; }); },
      inventory:    function () { setShowInventory(function (v) { return !v; }); },
      skills:       function () { setShowSkills(function (v) { return !v; }); },
      encyclopedia: function () { setShowEncyclopedia(function (v) { return !v; }); },
      guild:        function () { setShowGuildPanel(function (v) { return !v; }); },
      leaderboard:  function () { setShowLeaderboard(function (v) { return !v; }); },
      feedback:     function () { setShowFeedback(function (v) { return !v; }); },
      clan:         function () { setShowClanPanel(function (v) { return !v; }); },
      social:       function () { setShowSocialPanel(function (v) { return !v; }); },
      chat:         function () { setChatOpen(function (v) { return !v; }); },
    };
    return function () { delete window.__broLegacyUI; };
  }, []);
  var goFullscreen = function goFullscreen() {
    var el = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (el.requestFullscreen) {
        el.requestFullscreen({
          navigationUI: 'hide'
        });
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else {
        window.scrollTo(0, 1);
      }
    } catch (e) {}
    try {
      screen.orientation.lock('landscape').catch(function () {});
    } catch (e) {}
  };
  var _useState215 = useState('slim'),
    _useState216 = _slicedToArray(_useState215, 2),
    bodySize = _useState216[0],
    setBodySize = _useState216[1]; /* 'slim' (36x12) or 'armored' (36x16) */
  var _useState217 = useState('sword'),
    _useState218 = _slicedToArray(_useState217, 2),
    weapon = _useState218[0],
    setWeapon = _useState218[1]; /* 'sword' or 'bow' */
  var _useState219 = useState(false),
    _useState220 = _slicedToArray(_useState219, 2),
    autoAttack = _useState220[0],
    setAutoAttack = _useState220[1];
  var _useState221 = useState(100),
    _useState222 = _slicedToArray(_useState221, 2),
    atkEnergy = _useState222[0],
    setAtkEnergy = _useState222[1]; /* max 100 */
  var _useState223 = useState(0),
    _useState224 = _slicedToArray(_useState223, 2),
    shieldCd = _useState224[0],
    setShieldCd = _useState224[1];
  var _useState225 = useState(false),
    _useState226 = _slicedToArray(_useState225, 2),
    shieldUp = _useState226[0],
    setShieldUp = _useState226[1];
  var _useState227 = useState(3000),
    _useState228 = _slicedToArray(_useState227, 2),
    shieldStamina = _useState228[0],
    setShieldStamina = _useState228[1]; /* max 3000ms */
  var doSpecialAttack = useCallback(function () {
    specialAttack(stateRef.current);
  }, []);

  /* Legacy fishing/campfire/woodcutting systems removed — replaced by §18 Life Skills */

  /* Shield — 80% damage reduction for 2s, stuns attacker, 10s cooldown */
  var doShield = useCallback(function () {
    raiseShield(stateRef.current, { setShieldUp: setShieldUp });
  }, []);
  var sendEmote = useCallback(function (emoji) {
    sendEmoteImpl(stateRef.current, emoji, { setShowEmotes: setShowEmotes });
  }, []);

  /* Enter building */
  var enterBuilding = useCallback(function () {
    enterBuildingImpl(stateRef.current, { setBuildingPanel: setBuildingPanel });
  }, []);

  /* ═══ DESKTOP CONTROL HELPERS — called from keyboard handler ═══ */
  var _desktopEnterBuilding = useCallback(function () {
    enterBuilding();
  }, [enterBuilding]);
  var _desktopSleep = useCallback(function () {
    var S2 = stateRef.current,
      R = S2.rpg;
    if (!R) return;
    R.hp = R.maxHp;
    R.stamina = R.maxStamina;
    R.mana = R.maxMana;
    R._wellRestedUntil = Date.now() + 1800000;
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 40,
      text: 'Zzz... Stats restored!',
      color: '#3dd497',
      ts: Date.now()
    });
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 25,
      text: 'Well Rested +10% XP (30min)',
      color: '#f5c542',
      ts: Date.now()
    });
    BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
    setTimeout(function () {
      return BT_AUDIO.beep(500, 0.05, 0.07, 'sine');
    }, 200);
    setTimeout(function () {
      return BT_AUDIO.beep(600, 0.04, 0.06, 'sine');
    }, 400);
    setRpgState(_objectSpread({}, R));
    try {
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    } catch (e2) {}
  }, []);
  var _desktopGather = useCallback(function () {
    var _R$lifeSkills;
    var S = stateRef.current,
      node = S._nearNode,
      R = S.rpg;
    if (!node || !node.alive || !R) return;
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    var skillName = node.skill || 'mining';
    var skillLvl = ((_R$lifeSkills = R.lifeSkills) === null || _R$lifeSkills === void 0 || (_R$lifeSkills = _R$lifeSkills[skillName]) === null || _R$lifeSkills === void 0 ? void 0 : _R$lifeSkills.level) || 1;
    if (false) { /* gathering level gate disabled — all resources harvestable at lvl 1 */
      S.dmgNumbers.push({
        x: node.x,
        y: node.y - 15,
        text: 'Need ' + skillName.charAt(0).toUpperCase() + skillName.slice(1) + ' Lv' + node.gatherLvl,
        color: '#ff5e6c',
        ts: Date.now()
      });
      BT_AUDIO.beep(200, 0.05, 0.08, 'square');
      return;
    }
    /* v2.3.229: modal minigames replaced by the windowed-swipe
       extraction loop. _startExtraction sets up the state machine;
       the game-tick (search _extraction) drives waiting -> ready ->
       missed, and the ExtractionSwipeLayer pointer handlers fire
       _succeedExtraction on a valid swipe. */
    if (node.nodeType === 'fishSpot') {
      _startExtraction(node, 'fishing');
      return;
    }
    if (node.nodeType === 'tree') {
      _startExtraction(node, 'woodcutting');
      return;
    }
    if (node.nodeType === 'oreVein') {
      _startExtraction(node, 'mining');
      return;
    }
    if (node.nodeType === 'campfire') {
      _startCookingAtCampfire(node);
      return;
    }
  }, []);

  /* v2.3.229: extraction-loop entry. Tapping a node funnels through
     here instead of opening one of the three modal minigames. The
     game-tick state machine (search _extraction in this file) handles
     waiting -> ready -> missed transitions; success is fired from
     the swipe handler. */
  var _startExtraction = useCallback(function (node, skill, extra) {
    startExtraction(stateRef.current, node, skill, extra);
  }, []);

  /* v2.3.853: tapping the campfire starts a cook on the first raw fish in the
     bag (swipe-up-to-flip extraction).  No raw fish → a nudge popup. */
  var _startCookingAtCampfire = useCallback(function (node) {
    var S = stateRef.current;
    var R = S && S.rpg;
    if (!R || !R.inventory) return;
    var fishKey = Object.keys(R.inventory).find(function (k) {
      return k.indexOf('fish_') === 0 && R.inventory[k] > 0;
    });
    if (!fishKey) {
      S.dmgNumbers.push({ x: node.x, y: node.y - 24, text: 'Need raw fish', color: '#ff5e6c', ts: Date.now() });
      try { BT_AUDIO.beep(200, 0.05, 0.08, 'square'); } catch (e) {}
      return;
    }
    _startExtraction(node, 'cooking', { fishKey: fishKey });
  }, []);

  /* Called from the swipe handler when a valid swipe lands during the
     'ready' window. Routes to the existing per-skill reward applier
     so XP + inventory + server node_strike all run unchanged. */
  var _succeedExtraction = useCallback(function (accuracy) {
    return succeedExtraction(stateRef.current, accuracy, { setRpgState: setRpgState });
  }, []);


  /* v2.3.853: tapping a log (wood_*) in the Bag lights a campfire to cook at.
     Consumes one log, plays the one-shot firemaking animation at the player,
     and the tick lights the campfire when it finishes.  Firemaking is NOT a
     tracked skill — no XP. */
  useEffect(function () {
    return firemakingBus.subscribe(function () {
      var key = firemakingBus.consume();
      if (!key) return;
      var S = stateRef.current;
      var R = S && S.rpg;
      if (!R || !R.inventory || (R.inventory[key] || 0) <= 0) return;
      if (S._firemaking) return;  // already lighting one
      R.inventory[key] -= 1;
      if (R.inventory[key] <= 0) delete R.inventory[key];
      var now = Date.now();
      S._firemaking = { startedAt: now, doneAt: now + 1500, x: S.player.x, y: S.player.y + 6 };
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 30, text: 'Lighting fire…', color: '#ff8a3c', ts: now });
      try { BT_AUDIO.beep(180, 0.05, 0.12, 'sawtooth'); } catch (e) {}
      setRpgState(_objectSpread({}, R));
      try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    });
  }, []);

  /* Eat a cooked fish from the bag — consume 1 of the cooked_fish_* key
     and heal +30 HP (clamped to maxHp).  No-op if HP is already full
     (so the player doesn't burn food to no effect — reads as "you're
     not hungry"). */
  useEffect(function () {
    return eatBus.subscribe(function () {
      var key = eatBus.consume();
      if (!key) return;
      var S = stateRef.current;
      var R = S && S.rpg;
      if (!R || !R.inventory) return;
      if ((R.inventory[key] || 0) <= 0) return;
      var maxHp = R.maxHp || 100;
      if ((R.hp || 0) >= maxHp) {
        S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 30, text: 'HP full', color: '#8890b8', ts: Date.now() });
        return;
      }
      var HEAL = COOKED_HEAL_BY_KEY[key] != null ? COOKED_HEAL_BY_KEY[key] : COOKED_HEAL_DEFAULT;
      var before = R.hp || 0;
      R.hp = Math.min(maxHp, before + HEAL);
      var actual = R.hp - before;
      R.inventory[key] -= 1;
      if (R.inventory[key] <= 0) delete R.inventory[key];
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 30, text: '+' + actual + ' HP', color: '#3dd497', ts: Date.now() });
      S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 46, text: 'Ate cooked fish', color: '#f5c542', ts: Date.now() });
      try { BT_AUDIO.beep(620, 0.05, 0.07, 'sine'); } catch (e) {}
      setRpgState(_objectSpread({}, R));
      try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    });
  }, []);

  /* applyCookingResult — called when the cooking minigame completes.
     Consumes 1 raw fish from inventory and writes either
     cooked_<fishKey> (success) or burnt_dust (over-cooked).  Awards a
     small Cooking life-skill XP bump on success. */
  var _applyCookingResult = useCallback(function (fishKey, kind, taps) {
    applyCookingResult(stateRef.current, fishKey, kind, taps, { setRpgState: setRpgState });
  }, []);



  var _desktopOpenWorkshop = useCallback(function () {
    setShowDungeonCreator(true);
    if (!dungeonCreator) setDungeonCreator(createDefaultDungeonConfig());
    BT_AUDIO.enterBuilding();
  }, [dungeonCreator]);
  var _desktopNpcQuest = useCallback(function (npc, npcQ) {
    setQuestPanel({
      npc: npc.name,
      quest: npcQ.quest,
      status: npcQ.status,
      npcRef: npc
    });
  }, []);
  var _desktopShieldOn = useCallback(function () {
    doShield();
  }, [doShield]);
  var _desktopShieldOff = useCallback(function () {
    stateRef.current._shieldUp = false;
    setShieldUp(false);
    if (stateRef.current.channel) stateRef.current.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: stateRef.current.myId, up: false }});
  }, []);
  var _desktopCycleWeapon = useCallback(function () {
    var _S2$rpg$weapon, _S2$rpg$rangedWeapon;
    var S2 = stateRef.current;
    if (!S2.rpg) return;
    var slots = ['melee', 'ranged'];
    if (S2.rpg.staffWeapon) slots.push('staff');
    var curIdx = slots.indexOf(S2.rpg.activeSlot || 'melee');
    var nextSlot = slots[(curIdx + 1) % slots.length];
    S2.rpg.activeSlot = nextSlot;
    /* Mark the session as having an explicit cycle so the player_state
       handler stops accepting the server's persisted activeSlot
       (defense in depth: if set_active_slot never reaches the worker
       due to a transient drop, client at least doesn't revert). */
    S2._userCycledSlot = true;
    /* Tell the worker about the slot change so the persisted value
       is fresh on the next reconnect / fresh session. */
    if (S2.channel) {
      try { S2.channel.send({ type: 'set_active_slot', payload: { slot: nextSlot } }); } catch (e) {}
    }
    setRpgState(_objectSpread({}, S2.rpg));
    var wpnName = nextSlot === 'melee' ? (_S2$rpg$weapon = S2.rpg.weapon) === null || _S2$rpg$weapon === void 0 ? void 0 : _S2$rpg$weapon.name : nextSlot === 'ranged' ? (_S2$rpg$rangedWeapon = S2.rpg.rangedWeapon) === null || _S2$rpg$rangedWeapon === void 0 ? void 0 : _S2$rpg$rangedWeapon.name : 'Staff';
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 40,
      text: wpnName,
      color: '#f5c542',
      ts: Date.now()
    });
    BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
    setTimeout(function () {
      return BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
    }, 60);
    S2._weaponSwapFlash = Date.now();
  }, []);
  var _desktopSelectSlot = useCallback(function (slot) {
    var _S2$rpg$weapon2, _S2$rpg$rangedWeapon2;
    var S2 = stateRef.current;
    if (!S2.rpg || S2.rpg.activeSlot === slot) return;
    S2.rpg.activeSlot = slot;
    setRpgState(_objectSpread({}, S2.rpg));
    var wpnName = slot === 'melee' ? (_S2$rpg$weapon2 = S2.rpg.weapon) === null || _S2$rpg$weapon2 === void 0 ? void 0 : _S2$rpg$weapon2.name : slot === 'ranged' ? (_S2$rpg$rangedWeapon2 = S2.rpg.rangedWeapon) === null || _S2$rpg$rangedWeapon2 === void 0 ? void 0 : _S2$rpg$rangedWeapon2.name : 'Staff';
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 40,
      text: wpnName,
      color: '#f5c542',
      ts: Date.now()
    });
    BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
  }, []);
  var _desktopSpecialAttack = useCallback(function () {
    doSpecialAttack();
  }, [doSpecialAttack]);
  var _desktopCloseAll = useCallback(function () {
    closeAllMenus();
    setBuildingPanel(null);
    setQuestPanel(null);
    setInspectPlayer(null);
  }, []);

  /* Virtual joysticks — each tracks its own finger */
  /* v2.3.816: floating model.  The joysticks are hidden until touched and
     spawn under the finger anywhere in their half of the screen.  lZoneRef
     / rZoneRef are the full-height left/right touch-capture zones; the
     joystick visuals (joystickRef / rJoyRef bases) are position:fixed and
     repositioned to the touch point on each touchstart. */
  var lZoneRef = useRef(null);
  var rZoneRef = useRef(null);
  var joystickRef = useRef(null);
  var knobRef = useRef(null);
  var lStickRef = useRef(null);
  var joystickActive = useRef(false);
  var lTouchId = useRef(null);
  var rJoyRef = useRef(null);
  var rKnobRef = useRef(null);
  var rStickRef = useRef(null);
  var rJoyActive = useRef(false);
  var rTouchId = useRef(null);
  var shieldJoyRef = useRef(null);
  var shieldTouchId = useRef(null);
  var shieldJoyActive = useRef(false);
  var lTrail = useRef([]);
  /* Double-tap gesture state for the joysticks (v2.3.97+).
     Right joystick: tap, then tap-and-hold within DOUBLE_TAP_WINDOW_MS
     activates shield -- the second touch becomes the shield drag handle
     and rotates the block arc; release drops the shield.  Left joystick:
     two quick taps within the window cycles the active weapon slot.
     Each tap (single-tap classification: no movement + brief duration)
     opens a preview window that renders an icon inside the joystick
     disc; the window auto-closes when the timer expires. */
  var rJoyPreviewRef = useRef(null);
  var lJoyPreviewRef = useRef(null);
  var rTapState = useRef({ lastEndAt: 0, lastX: 0, lastY: 0, startAt: 0, startX: 0, startY: 0, moved: false });
  var lTapState = useRef({ lastEndAt: 0, lastX: 0, lastY: 0, startAt: 0, startX: 0, startY: 0, moved: false });
  var rShieldGesture = useRef(false);
  var rPreviewTimer = useRef(null);
  var lPreviewTimer = useRef(null);
  var handleJoystickMove = useCallback(function (clientX, clientY) {
    var base = joystickRef.current;
    if (!base) return;
    var rect = base.getBoundingClientRect();
    var bcx = rect.left + rect.width / 2;
    var bcy = rect.top + rect.height / 2;
    var rawDx = clientX - bcx;
    var rawDy = clientY - bcy;
    var dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    var maxR = rect.width / 2 - 20;
    var clampDist = Math.min(dist, maxR);
    var angle = Math.atan2(rawDy, rawDx);
    var knobX = Math.cos(angle) * clampDist;
    var knobY = Math.sin(angle) * clampDist;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(calc(-50% + ".concat(knobX, "px), calc(-50% + ").concat(knobY, "px))");
    }
    if (lStickRef.current) {
      lStickRef.current.style.width = clampDist + 'px';
      lStickRef.current.style.transform = 'rotate(' + angle + 'rad)';
      lStickRef.current.style.opacity = clampDist > 4 ? '0.85' : '0';
    }
    var S = stateRef.current;
    var deadzone = 12;
    if (dist < deadzone) {
      S.stickX = 0;
      S.stickY = 0;
    } else {
      /* Analog: normalize to -1..1 range based on distance from center */
      var strength = Math.min((dist - deadzone) / (maxR - deadzone), 1);
      S.stickX = Math.cos(angle) * strength;
      S.stickY = Math.sin(angle) * strength;
    }
    lTrail.current.push({
      x: rawDx,
      y: rawDy,
      t: performance.now()
    });
    if (lTrail.current.length > 60) lTrail.current.shift();
  }, []);
  var handleJoystickEnd = useCallback(function () {
    joystickActive.current = false;
    /* v2.3.816: fade the floating joystick back out on release. */
    if (joystickRef.current) joystickRef.current.style.opacity = '0';
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%,-50%)';
    if (lStickRef.current) {
      lStickRef.current.style.width = '0px';
      lStickRef.current.style.opacity = '0';
    }
    var S = stateRef.current;
    /* Dodge roll disabled on joystick — use screen swipe instead */
    lTrail.current = [];
    S.stickX = 0;
    S.stickY = 0;
  }, []);

  /* Right joystick — aim direction + auto-attack while held */
  var rTrail = useRef([]);
  var handleRJoyMove = useCallback(function (clientX, clientY) {
    var base = rJoyRef.current;
    if (!base) return;
    var rect = base.getBoundingClientRect();
    var bcx = rect.left + rect.width / 2,
      bcy = rect.top + rect.height / 2;
    var rawDx = clientX - bcx,
      rawDy = clientY - bcy;
    var dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    var maxR = rect.width / 2 - 18;
    var clampDist = Math.min(dist, maxR);
    var angle = Math.atan2(rawDy, rawDx);
    if (rKnobRef.current) {
      var kx = Math.cos(angle) * clampDist,
        ky = Math.sin(angle) * clampDist;
      rKnobRef.current.style.transform = "translate(calc(-50% + ".concat(kx, "px), calc(-50% + ").concat(ky, "px))");
    }
    if (rStickRef.current) {
      rStickRef.current.style.width = clampDist + 'px';
      rStickRef.current.style.transform = 'rotate(' + angle + 'rad)';
      rStickRef.current.style.opacity = clampDist > 4 ? '0.85' : '0';
    }
    var S = stateRef.current;
    if (dist > 8) {
      var dirs = [['right', 0], ['down', Math.PI / 2], ['left', Math.PI], ['up', -Math.PI / 2]];
      var best = 'right',
        bestD = 99;
      for (var _i42 = 0, _dirs = dirs; _i42 < _dirs.length; _i42++) {
        var _dirs$_i = _slicedToArray(_dirs[_i42], 2),
          d = _dirs$_i[0],
          a = _dirs$_i[1];
        var diff = Math.abs(angle - a);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < bestD) {
          bestD = diff;
          best = d;
        }
      }
      S._facing = best;
      S._aimAngle = angle;
      S._aiming = true;
      S._lastAimAngle = angle;
      S.autoAttack = true;
    }
    rTrail.current.push({
      x: rawDx,
      y: rawDy,
      t: performance.now()
    });
    if (rTrail.current.length > 60) rTrail.current.shift();
  }, []);
  var handleRJoyEnd = useCallback(function () {
    rJoyActive.current = false;
    /* v2.3.816: fade the floating joystick back out on release. */
    if (rJoyRef.current) rJoyRef.current.style.opacity = '0';
    if (rKnobRef.current) rKnobRef.current.style.transform = 'translate(-50%,-50%)';
    if (rStickRef.current) {
      rStickRef.current.style.width = '0px';
      rStickRef.current.style.opacity = '0';
    }
    var S = stateRef.current;
    S.autoAttack = false;
    setAutoAttack(false);
    /* Aim lock — hold direction 2.5s after release */
    var aimCopy = S._aimAngle;
    S._aiming = false;
  }, []);

  /* Shield joystick — hold+drag to aim shield direction */
  var handleShieldMove = useCallback(function (clientX, clientY) {
    var base = shieldJoyRef.current;
    if (!base) return;
    var rect = base.getBoundingClientRect();
    var dx2 = clientX - (rect.left + rect.width / 2);
    var dy2 = clientY - (rect.top + rect.height / 2);
    if (Math.sqrt(dx2 * dx2 + dy2 * dy2) > 8) {
      stateRef.current._shieldAngle = Math.atan2(dy2, dx2);
    }
  }, []);

  /* iOS Safari left-edge swipe absorber (v2.3.112).  iOS treats a
     touchstart within ~20 px of the screen's left edge as the
     browser's back-history gesture, which on this game manifests as
     "the whole game screen scrolls when I swipe from the outer
     edge".  Sit a 18 px tall transparent strip down the left edge
     and preventDefault any touchstart that lands inside it.  Best
     effort -- Safari sometimes overrules; if it persists the user
     can reflag for a PWA / fullscreen path. */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    var guard = document.createElement('div');
    guard.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'width: 18px',
      'height: 100%',
      'z-index: 40',
      'background: transparent',
      'pointer-events: auto',
      'touch-action: none',
    ].join(';');
    var onTouchStart = function (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    guard.addEventListener('touchstart', onTouchStart, { passive: false });
    document.body.appendChild(guard);
    return function () {
      try { guard.removeEventListener('touchstart', onTouchStart); } catch (_) {}
      try { document.body.removeChild(guard); } catch (_) {}
    };
  }, [showNameModal, showLogin]);

  /* Dual joystick — each finger tracked independently */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    /* v2.3.816: touchstart is captured by the full-height left/right zones
       (floating model), not the small joystick bases.  touchmove/end stay
       on window so a drag tracks anywhere once started. */
    var lBase = lZoneRef.current;
    var rBase = rZoneRef.current;
    if (!lBase) return;
    var findT = function findT(tl, id) {
      for (var i = 0; i < tl.length; i++) if (tl[i].identifier === id) return tl[i];
      return null;
    };
    /* v2.3.845: while a fishing reel is in progress, a touch that lands ON the
       character (the reel zone) must drive the circular reel gesture
       (ExtractionSwipeLayer), NOT spawn a movement / aim joystick -- otherwise
       reeling walks the player off the spot and the catch is cancelled before
       the gesture can complete (so no fish is ever awarded).  The reel cue is
       centered on the player; claim touches within ~170 px of it.  Touches
       outside that (screen edges) still move, so walking away to cancel works. */
    var isReelTouch = function (clientX, clientY) {
      var S = stateRef.current;
      if (!S || !S._extraction || S._extraction.skill !== 'fishing') return false;
      var cam = S.camera, P = S.player;
      if (!cam || !P) return false;
      var dx = clientX - (P.x - cam.x);
      var dy = clientY - (P.y - 24 - cam.y);
      return (dx * dx + dy * dy) < (170 * 170);
    };
    /* Left joystick double-tap = cycle weapon (melee -> ranged -> staff).
       Constants shared with the right joystick at the head of this
       useEffect so both gestures use the same tap-vs-drag classifier.
       v2.3.98: window tightened from 350->220 ms after user feedback
       that a quick re-press to start moving after a swap was being
       counted as a second tap and double-cycling the weapon. */
    var DOUBLE_TAP_WINDOW_MS = 220;
    var TAP_MAX_DURATION_MS = 200;
    var TAP_MAX_MOVE_SQ_PX = 100; /* 10 px squared */
    var DOUBLE_TAP_MAX_DIST_SQ_PX = 2500; /* 50 px squared */
    var PREVIEW_HOLD_MS = 350;
    var SLOT_ICON = { melee: 'sword', ranged: 'bow', staff: 'staff' };
    var getNextWeaponSlot = function () {
      var S2 = stateRef.current;
      if (!S2 || !S2.rpg) return 'melee';
      var slots = ['melee', 'ranged'];
      if (S2.rpg.staffWeapon) slots.push('staff');
      var curIdx = slots.indexOf(S2.rpg.activeSlot || 'melee');
      return slots[(curIdx + 1) % slots.length];
    };
    var lS = function lS(e) {
      /* v2.3.848: while the chop swipe window is open, the joystick zones
         must NOT grab the touch — the axe-grab swipe was walking the
         character around.  The chop swipe is handled by the window-level
         pointer layer (ExtractionSwipeLayer), a separate event stream, so
         bailing here leaves it working while stopping movement. */
      var _exL = stateRef.current && stateRef.current._extraction;
      if (_exL && _exL.status === 'ready') { e.preventDefault(); return; }
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      /* v2.3.845: hand reel-zone touches to the fishing gesture, not movement. */
      if (isReelTouch(t.clientX, t.clientY)) return;
      var nowMs = Date.now();
      var lts = lTapState.current;
      lTouchId.current = t.identifier;
      joystickActive.current = true;
      /* v2.3.816: spawn the movement joystick centered under the finger
         (base is position:fixed with translate(-50%,-50%), so left/top ARE
         the centre) and fade it in.  All downstream math reads the base
         rect, so it tracks the spawn point automatically. */
      if (joystickRef.current) {
        joystickRef.current.style.left = t.clientX + 'px';
        joystickRef.current.style.top = t.clientY + 'px';
        joystickRef.current.style.opacity = '0.25';
      }
      lts.startAt = nowMs;
      lts.startX = t.clientX;
      lts.startY = t.clientY;
      lts.moved = false;
      /* No cycle fire on touchstart -- v2.3.98 moved the trigger to
         touchend so a quick re-press to start moving after a single
         tap is correctly classified as a drag and does NOT count as
         the second tap of a double-tap cycle. */
      handleJoystickMove(t.clientX, t.clientY);
    };
    var lM = function lM(e) {
      if (lTouchId.current === null) return;
      var t = findT(e.touches, lTouchId.current);
      if (t) {
        e.preventDefault();
        var lts = lTapState.current;
        var dxs = t.clientX - lts.startX;
        var dys = t.clientY - lts.startY;
        if (dxs * dxs + dys * dys > TAP_MAX_MOVE_SQ_PX) lts.moved = true;
        handleJoystickMove(t.clientX, t.clientY);
      }
    };
    var lE = function lE(e) {
      if (lTouchId.current === null) return;
      var t = findT(e.changedTouches, lTouchId.current);
      if (t) {
        var lts = lTapState.current;
        var endT = Date.now();
        var wasTap = !lts.moved && (endT - lts.startAt) < TAP_MAX_DURATION_MS;
        lTouchId.current = null;
        handleJoystickEnd();
        if (wasTap) {
          /* Did this tap COMPLETE a double-tap with a recent prior
             tap?  Check the prior tap's end-time + position against
             this tap-end.  If yes -> cycle weapon and consume.  If no
             -> start a new preview window. */
          var dxPrev = t.clientX - lts.lastX;
          var dyPrev = t.clientY - lts.lastY;
          var isSecondTap = lts.lastEndAt > 0
            && (endT - lts.lastEndAt) < DOUBLE_TAP_WINDOW_MS
            && (dxPrev * dxPrev + dyPrev * dyPrev) < DOUBLE_TAP_MAX_DIST_SQ_PX;
          if (isSecondTap) {
            lts.lastEndAt = 0;
            if (lPreviewTimer.current) { clearTimeout(lPreviewTimer.current); lPreviewTimer.current = null; }
            if (lJoyPreviewRef.current) lJoyPreviewRef.current.style.display = 'none';
            try { _desktopCycleWeapon(); } catch (err) {}
          } else {
            lts.lastEndAt = endT;
            lts.lastX = t.clientX;
            lts.lastY = t.clientY;
            /* Show the NEXT weapon slot as a preview inside the disc
               so the player can confirm the swap target before
               committing to the second tap.  Window auto-closes
               after PREVIEW_HOLD_MS. */
            if (lJoyPreviewRef.current) {
              var nextSlot = getNextWeaponSlot();
              lJoyPreviewRef.current.textContent = SLOT_ICON[nextSlot] || 'sword';
              lJoyPreviewRef.current.style.display = 'flex';
              if (lPreviewTimer.current) clearTimeout(lPreviewTimer.current);
              lPreviewTimer.current = setTimeout(function () {
                if (lJoyPreviewRef.current) lJoyPreviewRef.current.style.display = 'none';
              }, PREVIEW_HOLD_MS);
            }
          }
        } else {
          /* Drag/long-press cancels any pending double-tap. */
          lts.lastEndAt = 0;
          /* v2.3.816: a fast flick on the movement side triggers the
             contextual dodge/lunge/retreat-shot.  Previously this lived on
             the canvas swipe handler, which the full-screen floating zones
             now sit over -- route it back in.  handleCanvasSwipe self-gates
             on speed/distance/duration, so a normal slow move-and-release
             never dodges. */
          try { handleCanvasSwipe(lts.startX, lts.startY, t.clientX, t.clientY, endT - lts.startAt); } catch (err) {}
        }
      }
    };
    /* Right-joystick swipe-to-special.  Track start (sx/sy/st) on touch
       down and the last known position (lx/ly/lt) on every move; on
       touch end, if the recent motion qualifies as a flick, fire
       doSpecialAttack using the flick direction as the aim angle. */
    var rSwipe = { sx: 0, sy: 0, st: 0, lx: 0, ly: 0, lt: 0 };
    var rS = function rS(e) {
      /* v2.3.848: same chop-swipe guard as the left zone (see lS) so a
         swipe started on the right half during a chop doesn't fire
         attacks/aim instead of chopping. */
      var _exR = stateRef.current && stateRef.current._extraction;
      if (_exR && _exR.status === 'ready') { e.preventDefault(); return; }
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      /* v2.3.845: hand reel-zone touches to the fishing gesture, not aim/attack. */
      if (isReelTouch(t.clientX, t.clientY)) return;
      var nowMs = Date.now();
      var rts = rTapState.current;
      var dxLast = t.clientX - rts.lastX;
      var dyLast = t.clientY - rts.lastY;
      var isDoubleTap = rts.lastEndAt > 0
        && (nowMs - rts.lastEndAt) < DOUBLE_TAP_WINDOW_MS
        && (dxLast * dxLast + dyLast * dyLast) < DOUBLE_TAP_MAX_DIST_SQ_PX;
      rTouchId.current = t.identifier;
      rJoyActive.current = true;
      /* v2.3.816: spawn the combat joystick under the finger (before the
         double-tap-shield branch so the shield arc + BlockRing orbit the
         spawn point too). */
      if (rJoyRef.current) {
        rJoyRef.current.style.left = t.clientX + 'px';
        rJoyRef.current.style.top = t.clientY + 'px';
        rJoyRef.current.style.opacity = '0.25';
      }
      rts.startAt = nowMs;
      rts.startX = t.clientX;
      rts.startY = t.clientY;
      rts.moved = false;
      if (isDoubleTap) {
        /* Second tap of the double-tap-hold gesture: this touch is the
           shield drag.  Suppress auto-attack/swing for this hold so the
           player isn't fighting and blocking at once (per v2.3.97 user
           choice), point the shield arc at the current touch location,
           and activate the shield via the same path the dedicated
           handler used. */
        rts.lastEndAt = 0;
        rShieldGesture.current = true;
        if (rPreviewTimer.current) { clearTimeout(rPreviewTimer.current); rPreviewTimer.current = null; }
        if (rJoyPreviewRef.current) rJoyPreviewRef.current.style.display = 'none';
        var rect = rJoyRef.current ? rJoyRef.current.getBoundingClientRect() : null;
        if (rect) {
          var bcx = rect.left + rect.width / 2;
          var bcy = rect.top + rect.height / 2;
          var ang = Math.atan2(t.clientY - bcy, t.clientX - bcx);
          var S2 = stateRef.current;
          S2._aimAngle = ang;
          S2._shieldAngle = ang;
        }
        try { doShield(); } catch (err) {}
        try { blockRingBus.beginBlock(); } catch (err) {}
        return;
      }
      /* Normal swing/auto-attack path */
      setAutoAttack(true);
      stateRef.current.autoAttack = true;
      rSwipe.sx = t.clientX;
      rSwipe.sy = t.clientY;
      rSwipe.st = nowMs;
      rSwipe.lx = 0;
      rSwipe.ly = 0;
      rSwipe.lt = 0;
      handleRJoyMove(t.clientX, t.clientY);
      doSwing();
    };
    var rM = function rM(e) {
      if (rTouchId.current === null) return;
      var t = findT(e.touches, rTouchId.current);
      if (t) {
        e.preventDefault();
        if (rShieldGesture.current) {
          /* Shield-mode drag: update the block arc angle from the touch
             position relative to the right joystick centre.  Don't call
             handleRJoyMove -- that re-asserts auto-attack which the
             shield gesture explicitly suppresses. */
          var rect2 = rJoyRef.current ? rJoyRef.current.getBoundingClientRect() : null;
          if (rect2) {
            var bcx2 = rect2.left + rect2.width / 2;
            var bcy2 = rect2.top + rect2.height / 2;
            var ang2 = Math.atan2(t.clientY - bcy2, t.clientX - bcx2);
            var Ssh = stateRef.current;
            Ssh._aimAngle = ang2;
            Ssh._aiming = true;
            Ssh._shieldAngle = ang2;
          }
          return;
        }
        var rts2 = rTapState.current;
        var dxs = t.clientX - rts2.startX;
        var dys = t.clientY - rts2.startY;
        if (dxs * dxs + dys * dys > TAP_MAX_MOVE_SQ_PX) rts2.moved = true;
        handleRJoyMove(t.clientX, t.clientY);
        rSwipe.lx = t.clientX;
        rSwipe.ly = t.clientY;
        rSwipe.lt = Date.now();
      }
    };
    var rE = function rE(e) {
      if (rTouchId.current === null) return;
      var t = findT(e.changedTouches, rTouchId.current);
      if (t) {
        if (rShieldGesture.current) {
          /* Release shield on the gesture-touch end.  Mirrors what
             BlockRing.endBlock did when the orbiting glyph was the
             touch target.  If the shield already auto-released due to
             stamina depletion, skip the redundant broadcast + UI
             update -- the game loop already handled it. */
          rShieldGesture.current = false;
          var Send = stateRef.current;
          if (Send && !Send._shieldAutoReleased) {
            Send._shieldUp = false;
            if (Send.channel) {
              try { Send.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: Send.myId, up: false } }); } catch (err) {}
            }
            try { setShieldUp(false); } catch (err) {}
            try { blockRingBus.endBlock(); } catch (err) {}
          }
          if (Send) Send._shieldAutoReleased = false;
          rTouchId.current = null;
          handleRJoyEnd();
          return;
        }
        /* Flick detection -- last-leg speed (recent burst) OR
           total-distance/total-duration speed (slow but committed). */
        var refX = rSwipe.lx || rSwipe.sx;
        var refY = rSwipe.ly || rSwipe.sy;
        var refT = rSwipe.lt || rSwipe.st;
        var dx = t.clientX - refX, dy = t.clientY - refY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var dur = Date.now() - refT;
        var spd = dist / Math.max(dur, 1);
        var totalDx = t.clientX - rSwipe.sx, totalDy = t.clientY - rSwipe.sy;
        var totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
        var totalDur = Date.now() - rSwipe.st;
        var totalSpd = totalDist / Math.max(totalDur, 1);
        var isFlick = (spd > 0.15 && dist > 8 && dur < 400)
          || (totalSpd > 0.2 && totalDist > 15 && totalDur < 500);
        if (isFlick) {
          var Sfk = stateRef.current;
          Sfk._hasUsedSwipe = true;
          var useDx = totalDist > dist ? totalDx : dx;
          var useDy = totalDist > dist ? totalDy : dy;
          var flickAng = Math.atan2(useDy, useDx);
          Sfk._aimAngle = flickAng;
          Sfk._facing = Math.abs(useDx) > Math.abs(useDy)
            ? (useDx > 0 ? 'right' : 'left')
            : (useDy > 0 ? 'down' : 'up');
          doSpecialAttack();
        }
        /* Tap classification for the next double-tap detection.  A tap
           opens the shield preview window inside the right joystick
           disc; the preview auto-hides after PREVIEW_HOLD_MS. */
        var rts3 = rTapState.current;
        var endT = Date.now();
        var wasTap = !rts3.moved && (endT - rts3.startAt) < TAP_MAX_DURATION_MS && !isFlick;
        if (wasTap) {
          rts3.lastEndAt = endT;
          rts3.lastX = t.clientX;
          rts3.lastY = t.clientY;
          /* v2.3.816: a tap on the combat side forwards a synthetic click
             to the canvas so the existing tap-to-lock-on-target logic
             (monsters / NPCs / players / empty-space unlock) keeps working
             now that the floating zone sits over the canvas.  The canvas
             onTouchEnd no longer fires (zone is on top), so _touchHandledAt
             is never set and the canvas onClick runs this once. */
          try {
            if (canvasRef.current) {
              canvasRef.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }));
            }
          } catch (err) {}
          if (rJoyPreviewRef.current) {
            rJoyPreviewRef.current.style.display = 'flex';
            if (rPreviewTimer.current) clearTimeout(rPreviewTimer.current);
            rPreviewTimer.current = setTimeout(function () {
              if (rJoyPreviewRef.current) rJoyPreviewRef.current.style.display = 'none';
            }, PREVIEW_HOLD_MS);
          }
        } else {
          rts3.lastEndAt = 0;
        }
        rTouchId.current = null;
        handleRJoyEnd();
      }
    };
    lBase.addEventListener('touchstart', lS, {
      passive: false
    });
    /* v2.3.697: iOS rubber-band kill.  The joystick touchmove handlers below
       only preventDefault touches they OWN (lM/rM/sM bail early for touches
       that started near-but-not-on a base), so an unclaimed drag over the
       game area fell through to Safari, which treated it as a document
       scroll and elastic-bounced the whole fixed page (the dashboard
       visibly rubber-banded).  CSS touch-action/overscroll-behavior alone
       are not reliably honored by iOS Safari -- a non-passive global guard
       is.  Touches inside genuinely scrollable UI (open panels, chat log:
       overflowY auto/scroll AND actually overflowing) keep native scroll. */
    var _scrollableUp = function _scrollableUp(el) {
      var n = el, i = 0;
      while (n && n !== document.body && i < 12) {
        try {
          var st = getComputedStyle(n);
          if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
        } catch (_e) { return false; }
        n = n.parentElement; i++;
      }
      return false;
    };
    var gM = function gM(e) {
      if (!e.cancelable) return;
      if (e.target && _scrollableUp(e.target)) return;
      e.preventDefault();
    };
    window.addEventListener('touchmove', gM, {
      passive: false
    });
    window.addEventListener('touchmove', lM, {
      passive: false
    });
    window.addEventListener('touchend', lE, {
      passive: false
    });
    window.addEventListener('touchcancel', lE, {
      passive: false
    });
    if (rBase) {
      rBase.addEventListener('touchstart', rS, {
        passive: false
      });
      window.addEventListener('touchmove', rM, {
        passive: false
      });
      window.addEventListener('touchend', rE, {
        passive: false
      });
      window.addEventListener('touchcancel', rE, {
        passive: false
      });
    }
    /* Shield joystick setup */
    var sBase = shieldJoyRef === null || shieldJoyRef === void 0 ? void 0 : shieldJoyRef.current;
    var sS = function sS(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      shieldTouchId.current = t.identifier;
      shieldJoyActive.current = true;
      doShield();
      handleShieldMove(t.clientX, t.clientY);
    };
    var sM = function sM(e) {
      if (shieldTouchId.current === null) return;
      var t = findT(e.touches, shieldTouchId.current);
      if (t) {
        e.preventDefault();
        handleShieldMove(t.clientX, t.clientY);
      }
    };
    var sE = function sE(e) {
      if (shieldTouchId.current === null) return;
      var t = findT(e.changedTouches, shieldTouchId.current);
      if (t) {
        shieldTouchId.current = null;
        shieldJoyActive.current = false;
        stateRef.current._shieldUp = false;
        setShieldUp(false);
      }
    };
    if (sBase) {
      sBase.addEventListener('touchstart', sS, {
        passive: false
      });
      window.addEventListener('touchmove', sM, {
        passive: false
      });
      window.addEventListener('touchend', sE, {
        passive: false
      });
      window.addEventListener('touchcancel', sE, {
        passive: false
      });
    }
    return function () {
      lBase.removeEventListener('touchstart', lS);
      window.removeEventListener('touchmove', gM);
      window.removeEventListener('touchmove', lM);
      window.removeEventListener('touchend', lE);
      window.removeEventListener('touchcancel', lE);
      if (rBase) {
        rBase.removeEventListener('touchstart', rS);
        window.removeEventListener('touchmove', rM);
        window.removeEventListener('touchend', rE);
        window.removeEventListener('touchcancel', rE);
      }
      if (sBase) {
        sBase.removeEventListener('touchstart', sS);
        window.removeEventListener('touchmove', sM);
        window.removeEventListener('touchend', sE);
        window.removeEventListener('touchcancel', sE);
      }
    };
  }, [showNameModal, showLogin, handleJoystickMove, handleJoystickEnd, handleRJoyMove, handleRJoyEnd, handleShieldMove, handleCanvasSwipe]);

  /* Keep keyboard open — focus input when game starts and periodically re-focus */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    BT_AUDIO.init();
    var focusChat = function focusChat() {
      if (chatInputRef.current) chatInputRef.current.focus();
    };
    /* Initial focus after a short delay for DOM to settle */
    var t1 = setTimeout(focusChat, 300);
    var t2 = setTimeout(focusChat, 600);
    return function () {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showNameModal, showLogin]);
  var joinTown = function joinTown() {
    /* Refuse to start while the page is pinch-zoomed.  iOS Safari ignores
       maximum-scale/user-scalable=no, so users can still pinch.  If they
       enter that state and press PLAY, the canvas sizes off the zoomed
       viewport and the in-game layout breaks.  Easier to gate than to
       try to recover. */
    try {
      var _vvScale = (window.visualViewport && window.visualViewport.scale) || 1;
      if (_vvScale > 1.05) {
        alert('Please pinch-out to reset zoom (back to 100%) before starting.');
        return;
      }
    } catch (e) {}
    var name = nameInput.trim() || 'Anon';
    var S = stateRef.current;
    S.myName = name;
    /* NFT ID lookup takes priority over random avatar pool pick */
    if (nftLookup && nftLookup.Image) {
      S.myAvatar = wsrvUrl(nftLookup.Image, 64);
      S.myBroData = {
        ID: nftLookup.ID,
        broType: nftLookup.broType
      };
    } else if (selectedAvatar !== null && avatarPool[selectedAvatar]) {
      var bro = avatarPool[selectedAvatar];
      S.myAvatar = wsrvUrl(bro.Image, 64);
      S.myBroData = {
        ID: bro.ID,
        diScore: bro.diScore,
        rank: bro.rank
      };
    }
    S.bodyTorso = bodyTorsoColor;
    S.bodyLegs = bodyLegColor;
    /* Clear old data — fresh start for everyone */
    try {
      localStorage.removeItem('bt_rpg');
      localStorage.removeItem('bt_passphrase');
      localStorage.removeItem('bt_stats');
      localStorage.removeItem('bt_tutorial');
      localStorage.removeItem('bt_codex');
      localStorage.removeItem('bt_player');
      /* Room state -- always clear sticky on a fresh PLAY click so we
         auto-route to the next open room.  v2.3.222 removed the room
         code input field; bt_room_code stays cleared so wsClient never
         locks to a specific room. */
      localStorage.removeItem('bt_room');
      localStorage.removeItem('bt_room_code');
    } catch (e) {}
    /* Fresh RPG state for all players */
    S.rpg = createDefaultRpg();
    recalcDerived(S.rpg);
    setRpgState(_objectSpread({}, S.rpg));
    /* Persist */
    try {
      localStorage.setItem('bt_player', JSON.stringify({
        name: S.myName,
        avatar: S.myAvatar,
        bro: S.myBroData,
        color: S.myColor,
        bodyTorso: S.bodyTorso,
        bodyLegs: S.bodyLegs
      }));
    } catch (e) {}
    try {
      localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
    } catch (e) {}
    /* Optional server registration */
    var pid = getBtPlayerId();
    if (pid) btRpc('bt_register_player', {
      p_id: pid,
      p_name: S.myName,
      p_avatar: S.myAvatar,
      p_color: S.myColor,
      p_body_torso: S.bodyTorso,
      p_body_legs: S.bodyLegs
    });
    /* v2.3.777: resume snapshot -- the character needed to rejoin without
       the login screen.  Written on every PLAY; heartbeated in-game; read
       by the auto-rejoin effect after a recovery reload or an iOS tab
       eviction.  sessionStorage survives same-tab reloads (even in
       private windows); localStorage is the backup for normal Safari. */
    try {
      var _snapJ = JSON.stringify({
        t: Date.now(),
        name: S.myName,
        avatar: S.myAvatar,
        bro: S.myBroData,
        color: S.myColor,
        bodyTorso: S.bodyTorso,
        bodyLegs: S.bodyLegs,
        traits: {
          headwear: getHeadwear(),
          hair: getHair(),
          facialHair: getFacialHair(),
          skin: getSkin(),
          pants: getPants(),
          shoes: getShoes(),
          hairColor: getHairColor(),
          hatColor: getHatColor(),
          facialHairColor: getFacialHairColor(),
          shirt: getShirt(),
          shirtColor: getShirtColor()
        }
      });
      sessionStorage.setItem('bt_resume', _snapJ);
      localStorage.setItem('bt_resume', _snapJ);
    } catch (e) {}
    BT_AUDIO.init();
    BT_AUDIO.join();
    setShowWelcome(false);
    /* Skip the 4-second intro overlay when the debug console is open
       (URL `?debug=1`) — the intro at z-index 100 with background:#000
       still obscures most of the viewport and makes diagnostics hard to
       read.  Skipping goes straight into gameplay so the panel stays
       readable. */
    var _skipIntro = false;
    try {
      var _p = new URLSearchParams(window.location.search);
      if (_p.get('debug') === '1') _skipIntro = true;
    } catch (e) {}
    /* Kick off the full avatar-asset preload now (equip is finalized at this
       point) so the intro overlay can hold until it's flicker-free. */
    try { introWaitRef.current = preloadPlayerAssets(); } catch (e) { introWaitRef.current = null; }
    if (!_skipIntro) setShowIntro(true);
    else {
      /* v2.3.831: no IntroVideo to hand the theme off, so stop it here;
         the join flow starts the town ambience on its own. */
      try { if (themeAudioRef.current) { themeAudioRef.current.pause(); themeAudioRef.current = null; } } catch (e3) {}
    }
  };

  /* v2.3.777: auto-rejoin -- the stability endgame.  Every in-place
     renderer recovery can be defeated by iOS (context refusal, GPU-backed
     bitmap purges, page eviction), but a fresh page boot has worked 100%
     of the time.  So: a recovery reload (bt_resume_now, set by the
     black-screen watchdog) or any reload within 10 min of the last
     heartbeat skips the character screen and rejoins as the same
     character, straight into the world.  ?noresume=1 escapes to the
     normal character screen. */
  useEffect(function () {
    var snap = null;
    var wanted = false;
    try {
      if (/[?&]noresume=1\b/.test(window.location.search)) return;
      wanted = sessionStorage.getItem('bt_resume_now') === '1';
      sessionStorage.removeItem('bt_resume_now');
      var _rawSnap = sessionStorage.getItem('bt_resume') || localStorage.getItem('bt_resume');
      if (_rawSnap) snap = JSON.parse(_rawSnap);
    } catch (e) {}
    if (!snap || !snap.name) return;
    var fresh = Date.now() - (snap.t || 0) < 10 * 60 * 1000;
    if (!wanted && !fresh) return;
    var S = stateRef.current;
    S.myName = snap.name;
    if (snap.avatar) S.myAvatar = snap.avatar;
    if (snap.bro) S.myBroData = snap.bro;
    if (snap.color) S.myColor = snap.color;
    if (snap.bodyTorso) S.bodyTorso = snap.bodyTorso;
    if (snap.bodyLegs) S.bodyLegs = snap.bodyLegs;
    try {
      var tr = snap.traits || {};
      if (tr.headwear != null) setHeadwear(tr.headwear);
      if (tr.hair != null) setHair(tr.hair);
      if (tr.facialHair != null) setFacialHair(tr.facialHair);
      if (tr.skin != null) setSkin(tr.skin);
      if (tr.pants != null) setPants(tr.pants);
      if (tr.shoes != null) setShoes(tr.shoes);
      if (tr.hairColor != null) setHairColor(tr.hairColor);
      if (tr.hatColor != null) setHatColor(tr.hatColor);
      if (tr.facialHairColor != null) setFacialHairColor(tr.facialHairColor);
      if (tr.shirt != null) setShirt(tr.shirt);
      if (tr.shirtColor != null) setShirtColor(tr.shirtColor);
    } catch (e) {}
    /* NOTE: unlike joinTown, do NOT wipe bt_rpg -- the cached RPG state is
       what makes the rejoin seamless (server state_sync still overwrites). */
    try {
      import('../debug/crashTrap.js').then(function (ct) {
        ct.recordCrash('auto-rejoin', (wanted ? 'recovery reload' : 'fresh snapshot') + ' as ' + snap.name);
      }).catch(function () {});
    } catch (e) {}
    BT_AUDIO.init();
    BT_AUDIO.join();
    try { introWaitRef.current = preloadPlayerAssets(); } catch (e2) { introWaitRef.current = null; }
    setShowWelcome(false); /* straight in -- no intro video on a resume */
    /* v2.3.833: a resume skips the intro loading screen and drops straight
       into the world while the avatar's gear sheets are still baking, which
       tanks the frame rate with no on-screen explanation (owner asked for
       this before; it never shipped).  Inject a top-left spinner DIRECTLY
       on document.body — outside the React tree and at z-index 100000, so
       it's guaranteed on the top layer and its compositor-driven CSS spin
       keeps turning through the main-thread stutter (the React tree is too
       busy to animate one itself).  Removed when the preload resolves
       (assets baked, frame rate recovers), with a 20s safety cap. */
    var _rejoinSpin = null;
    try {
      _rejoinSpin = document.createElement('div');
      _rejoinSpin.className = 'bt-rejoin-loading';
      document.body.appendChild(_rejoinSpin);
    } catch (e4) {}
    var _clearSpin = function () { try { if (_rejoinSpin) { _rejoinSpin.remove(); _rejoinSpin = null; } } catch (e5) {} };
    Promise.resolve(introWaitRef.current).catch(function () {}).then(_clearSpin);
    setTimeout(_clearSpin, 20000);
  }, []); /* mount-only by design: resumes happen once per page load */

  /* Name / avatar selection modal.
     v2.3.710: redesigned to two side-by-side panes at EVERY width (iPhone
     Safari portrait is the primary platform): big live preview + name +
     PLAY on the left (~57%), scrollable category rail + RANDOMIZE on the
     right.  Layout-only change — every input/button keeps its previous
     handlers and state. */
  if (showNameModal) {
    /* v2.3.797: character creator refactored to a VERTICAL GUIDED FLOW
       (owner's spec, second attempt — the v2.3.799-792 run was reverted
       at v2.3.796 for viewport overflow): banner, CTA, landscape
       character SHOWCASE (the character is the star of the screen), name
       row, text-only category tabs fused to ONE customization drawer,
       Randomize, PLAY.  The screen is LOCKED — nothing page-scrolls; the
       drawer absorbs the leftover height and its columns scroll
       internally (the old rail's job, moved down a level), so PLAY is
       always on screen.  Layout verified against to-scale 390x844 and
       375x667 renders before shipping.  Future categories just append a
       tab + a _ccCats entry. */
    /* v2.3.835: collapse-on-select pickers.  _objTiles/_colTiles render the
       full catalog when the grid is open, or just the current pick (with
       its checkmark) when collapsed; the lone collapsed tile re-expands on
       tap.  Picking a real object collapses the object grid and opens the
       colors; picking a color collapses the color grid. */
    var _setOpen = function (setter, k, v) { setter(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };
    var _objTiles = function (k, catalog, kind, spriteCat, sel, setSel) {
      var real = sel && sel !== 'none';
      var collapsed = real && objOpen[k] === false;
      var list = collapsed ? catalog.filter(function (o) { return o.id === sel; }) : catalog;
      if (collapsed && !list.length) { collapsed = false; list = catalog; }
      return list.map(function (o) {
        var onSet = function (id) {
          if (collapsed) { _setOpen(setObjOpen, k, true); return; }
          setSel(id); markObjPicked(k);
          if (id !== 'none') { _setOpen(setObjOpen, k, false); _setOpen(setColOpen, k, true); }
          else { _setOpen(setObjOpen, k, true); }
        };
        return kind === 'thumb' ? _thumbTile(spriteCat, o, sel, onSet, 44) : _swatchTile(o, sel, onSet, 40);
      });
    };
    var _colTiles = function (k, colCat, sel, setSel, spriteCat, objId) {
      var collapsed = colOpen[k] === false;
      var list = collapsed ? colCat.filter(function (o) { return o.id === sel; }) : colCat;
      if (collapsed && !list.length) { collapsed = false; list = colCat; }
      return list.map(function (o) {
        var onSet = function (id) {
          if (collapsed) { _setOpen(setColOpen, k, true); return; }
          setSel(id); _setOpen(setColOpen, k, false);
        };
        return _swatchTile(o, sel, onSet, undefined, spriteCat, objId);
      });
    };
    var _hairColCat = hairSel === 'long' ? HAIR_COLOR_CATALOG.filter(function (c) { return LONG_HAIR_COLORS.indexOf(c.id) >= 0; }) : HAIR_COLOR_CATALOG;
    /* Body-color categories (skin/pants/shoes): the swatches ARE the object
       grid (their catalog 'default' entries carry the sprite's native
       colors), so they have no separate Colors column. */
    var _catDefs = {
      hat: { label: 'Hat', build: function () { return {
        items: _objTiles('hat', HEADWEAR_CATALOG, 'thumb', 'headwear', headwearSel, function (id) { setHeadwear(id); setHeadwearSel(id); }),
        colors: (objPicked['hat'] && headwearSel !== 'none') ? _colTiles('hat', HAT_COLOR_CATALOG, hatColorSel, function (id) { setHatColor(id); setHatColorSel(id); }, 'headwear', headwearSel) : null }; } },
      hair: { label: 'Hair', build: function () { return {
        items: _objTiles('hair', HAIR_CATALOG, 'thumb', 'hair', hairSel, function (id) { setHair(id); setHairSel(id); }),
        colors: (objPicked['hair'] && hairSel !== 'none') ? _colTiles('hair', _hairColCat, hairColorSel, function (id) { setHairColor(id); setHairColorSel(id); }, 'hair', hairSel) : null }; } },
      beard: { label: 'Beard', build: function () { return {
        items: _objTiles('beard', FACIALHAIR_CATALOG, 'thumb', 'facialhair', facialHairSel, function (id) { setFacialHair(id); setFacialHairSel(id); }),
        colors: (objPicked['beard'] && facialHairSel !== 'none') ? _colTiles('beard', FACIALHAIR_COLOR_CATALOG, beardColorSel, function (id) { setFacialHairColor(id); setBeardColorSel(id); }, 'facialhair', facialHairSel) : null }; } },
      skin: { label: 'Skin', build: function () { return {
        items: _objTiles('skin', SKIN_CATALOG, 'swatch', null, skinSel, function (id) { setSkin(id); setSkinSel(id); }), colors: null }; } },
      shirt: { label: 'Shirt', build: function () { return {
        items: _objTiles('shirt', SHIRT_CATALOG, 'thumb', 'shirt', shirtSel, function (id) { setShirt(id); setShirtSel(id); }),
        colors: (objPicked['shirt'] && shirtSel !== 'none') ? _colTiles('shirt', SHIRT_COLOR_CATALOG, shirtColorSel, function (id) { setShirtColor(id); setShirtColorSel(id); }, 'shirt', shirtSel) : null }; } },
      pants: { label: 'Pants', build: function () { return {
        items: _objTiles('pants', PANTS_CATALOG, 'swatch', null, pantsSel, function (id) { setPants(id); setPantsSel(id); }), colors: null }; } },
      shoes: { label: 'Shoes', build: function () { return {
        items: _objTiles('shoes', SHOES_CATALOG, 'swatch', null, shoesSel, function (id) { setShoes(id); setShoesSel(id); }), colors: null }; } }
    };
    var _catOrder = ['hat', 'hair', 'beard', 'skin', 'shirt', 'pants', 'shoes'];
    var _ccCats = _catOrder.map(function (k) { return { key: k, label: _catDefs[k].label }; });
    var _activeKey = _catDefs[activeCat] ? activeCat : 'hat';
    var _built = _catDefs[_activeKey].build();
    var _ccActive = { key: _activeKey, label: _catDefs[_activeKey].label, items: _built.items, colors: _built.colors };
    return /*#__PURE__*/React.createElement("div", {
      className: "bt-name-modal"
    }, /*#__PURE__*/React.createElement("video", {
      /* v2.3.824: animated splash backdrop — the owner's painted vista as a
         seamless 4.5s crossfade loop (built from the 6s source so its end
         frame matches its start, no visible cut).  bg.webp stays the
         poster + the modal's CSS fallback, so a blocked-autoplay or
         decode-failure path still shows the painted still.  Muted +
         playsInline + loop is the iOS inline-autoplay contract.
         NOTE (CLAUDE.md / v2.3.736): iOS Safari's video compositor once
         cyan-tinted a behind-character clip — that was a must-be-black
         starfield; a full-colour vista tolerates a slight shift, but this
         is the surface to eyeball on iPhone. */
      className: "bt-cc-bgvideo",
      src: '/ui/welcome/bg-loop.mp4',
      poster: '/ui/welcome/bg.webp',
      autoPlay: true, muted: true, playsInline: true, loop: true, preload: 'auto',
      "aria-hidden": true
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.801: tavern-banner art retired (owner) — back to the painted
         gold BRO TOWN lettering (logo-brotown.webp, the main piece of the
         pre-v2.3.790 lockup) in the banner's slot at the top of the
         screen.  Width-driven sizing in .bt-cc-logo.
         v2.3.806: owner's gem sword flanks the lettering (the wrap is the
         position context; the sword hangs off its left edge, tilted). */
      className: "bt-cc-logo-wrap"
    }, /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/sword.webp', alt: '', className: "bt-cc-logo-sword"
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.827: CSS specular shine — a light band swept across the
         sword, masked to its shape (sits below the letters like the sword
         itself, so the glint shows on the grip/blade/gem-in-the-O). */
      className: "bt-cc-sword-shine", "aria-hidden": true
    }), /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/logo-brotown.webp', alt: 'BRO TOWN', className: "bt-cc-logo"
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.827: matching shine over the gold lettering (masked to the
         logo), staggered so the two don't glint in unison. */
      className: "bt-cc-logo-shine", "aria-hidden": true
    })), /*#__PURE__*/React.createElement("div", {
      className: "bt-name-box bt-cc-box"
    }, /*#__PURE__*/React.createElement("div", {
      /* Header: call-to-action only — the logo lives in the banner, the
         divider art was cut for vertical budget (every px here comes out
         of the drawer), and the build tag moved to the scroll's tail.
         The class exists so 667pt-class screens can drop the line
         entirely (game.css media query). */
      className: "bt-cc-cta", style: { textAlign: 'center' }
    }, /*#__PURE__*/React.createElement("div", {
      /* v2.3.738: white + heavy dark halo — gold vanished into the sunlit
         half of the painted backdrop.
         v2.3.741: pill backdrop removed (owner: too prominent) — plain
         white text, the heavy halo carries the contrast. */
      style: { fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: "'Baloo 2','Source Sans 3',sans-serif",
        letterSpacing: '.14em', textShadow: '0 1px 2px rgba(0,0,0,.95), 0 0 10px rgba(0,0,0,.8), 0 0 18px rgba(0,0,0,.5)' }
    }, "CREATE YOUR CHARACTER")), /*#__PURE__*/React.createElement("section", {
      /* Character SHOWCASE — full-card-width LANDSCAPE stage (spec §3:
         the character is the star; the wide panel leaves negative space
         for future equipped-item previews / ambient effects beside the
         figure).  Replaces the v2.3.724 3:4 portrait window.
         v2.3.720: DARK window interior per the owner's mockup.  Known
         tradeoff, owner-approved: some trait sprites carry white
         extraction residue that a dark backdrop can expose — the floor
         glow masks the worst of it.
         v2.3.743: owner's storm-light void painting (an IMAGE, not video
         — the v2.3.736 cyan-tint lesson: device video compositing isn't
         color-exact). */
      /* Height lives in .bt-cc-stage (game.css) — v2.3.798: flex-driven,
         not aspect-ratio: the stage and the menu share the real viewport
         with guaranteed minimums.
         v2.3.801: framed dark box (border, void painting, inset shadow,
         star layers) removed — the character floats directly on the
         painted page backdrop (owner).  The element keeps its size and
         position so the pedestal/figure/rotate geometry is untouched. */
      className: "bt-cc-stage",
      style: { position: 'relative', width: '100%', boxSizing: 'border-box' }
    }, /*#__PURE__*/React.createElement("div", {
      /* v2.3.799: pedestal sized by stage HEIGHT, bottom-center anchored —
         it was %-of-WIDTH while the figure scaled with height, so the
         flexing stage broke the boots/platform contact differently on
         every device (owner screenshot: floating player).  Both now
         scale off the same axis, so the contact point is proportional
         everywhere.
         v2.3.802: promoted to a GROUP (aspect-ratio supplies the width
         from the 34% height) so the braziers can stand ON the disc and
         track it at every stage size (owner: goblets on the platform).
         DOM order keeps them behind the character canvas. */
      style: { position: 'absolute', bottom: '3%', left: '50%', height: '34%', aspectRatio: '480 / 165', transform: 'translateX(-50%)', pointerEvents: 'none' }
    }, /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/platform.webp', alt: '',
      /* v2.3.825: drop-shadow grounds the disc against the now-animated
         vista (owner saw it wash out over the bright video). */
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.6))' }
    }), /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--left" }),
    /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--right" })),
    /*#__PURE__*/React.createElement("canvas", {
      ref: previewCanvasRef,
      title: 'Live preview',
      /* v2.3.711: drag-to-rotate.  Pointer capture keeps the gesture alive
         when the finger drifts off the canvas mid-swipe. */
      onPointerDown: function (e) { _dragRotX.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} },
      /* v2.3.723: drag mapping reverted to dx>0 -> +1 (owner: only the
         BUTTONS were backwards; the drag felt right as originally shipped). */
      onPointerMove: function (e) { if (_dragRotX.current === null) return; var dx = e.clientX - _dragRotX.current; if (Math.abs(dx) >= 26) { rotatePreview(dx > 0 ? 1 : -1); _dragRotX.current = e.clientX; } },
      onPointerUp: function () { _dragRotX.current = null; },
      onPointerCancel: function () { _dragRotX.current = null; },
      /* No width/height attributes: drawCharacterPortrait force-sets the
         bitmap to 256x256 on every draw, so attributes here would be dead
         weight.  The bitmap upscales via CSS — object-fit keeps it square
         (never stretched) whatever shape the frame takes, and pixelated
         keeps the pixel-art upscale sharp instead of blurry. */
      style: {
        /* v2.3.799: SQUARE canvas sized by stage HEIGHT and bottom-center
           anchored (was width:100%/height:100% + contain + scale, whose
           figure position depended on the stage's flex-variable shape).
           88% height with a 1:1 aspect keeps the square bitmap exactly
           filling the element — no object-fit cropping at all — and the
           bottom offset plants the boots (≈89% down the bitmap, per the
           v2.3.725 ~83%-of-window tuning) on the pedestal's top face. */
        position: 'absolute',
        left: '50%',
        bottom: '14.5%',
        height: '88%',
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        borderRadius: 8,
        display: 'block',
        touchAction: 'none',
        cursor: 'grab',
        /* v2.3.744: per-angle drop — the SW and E source frames sit higher
           in their 256 box than the others, so those facings (and their
           mirrors) floated above the pedestal (owner: SW/SE down ~20px,
           E/W down ~10px). */
        transform: 'translateX(-50%) translateY(' + ({ southwest: 15, southeast: 15, east: 10, west: 10, northeast: 5, northwest: 5 }[previewDir] || 0) + 'px)', /* v2.3.745: SW/SE 20->15, NE/NW 0->5 per owner */
        /* v2.3.717: transparent — trait sprites carry white extraction
           residue that any dark/colored backdrop would expose.  No
           z-index: DOM order already stacks pillars < canvas < rotate
           buttons, and a z-index here would put the canvas over the
           buttons and eat their taps. */
        background: 'transparent'
      }
    }), /*#__PURE__*/React.createElement("button", {
      /* v2.3.712: circular spin arrows replaced the triangle glyphs -- the
         triangles read like the accordion chevrons in the rail (owner
         feedback), and rotation is a different verb than expand/collapse.
         v2.3.722: signs INVERTED (owner: "they're backwards") -- stepping
         +1 walks the dir list clockwise, but on screen that reads as the
         character turning the other way. */
      type: 'button', title: 'Rotate left', onClick: function () { rotatePreview(1); },
      style: { position: 'absolute', left: 6, bottom: 6, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
        background: 'rgba(18,20,31,0.78)', border: '1.5px solid var(--line)', color: 'var(--txt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 21, fontWeight: 700, lineHeight: 1, transform: 'translateY(-1px)' } }, "↺")),
    /*#__PURE__*/React.createElement("button", {
      type: 'button', title: 'Rotate right', onClick: function () { rotatePreview(-1); },
      style: { position: 'absolute', right: 6, bottom: 6, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
        background: 'rgba(18,20,31,0.78)', border: '1.5px solid var(--line)', color: 'var(--txt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 21, fontWeight: 700, lineHeight: 1, transform: 'translateY(-1px)' } }, "↻"))), /*#__PURE__*/React.createElement("div", {
      /* Name row — DIRECTLY beneath the showcase (v2.3.800: negative
         margin tucks the scroll against the stage frame per owner; the
         card gap alone read as loose).  The dice rerolls the NAME only;
         appearance Randomize lives under the drawer. */
      style: { position: 'relative', width: '100%', marginTop: -2 }
    }, /*#__PURE__*/React.createElement("input", {
      value: nameInput,
      onChange: function onChange(e) {
        return setNameInput(e.target.value);
      },
      onKeyDown: function onKeyDown(e) {
        return e.key === 'Enter' && joinTown();
      },
      placeholder: "Name…",
      maxLength: 20,
      autoFocus: true,
      /* v2.3.718: parchment scroll skin + ink colors live in .bt-cc-name
         (::placeholder needs a stylesheet). */
      className: "bt-cc-name",
      style: {
        width: '100%',
        /* v2.3.711: symmetric side padding clears the quill (left) and dice
           (right) while keeping the centered text centered.  Note the 20px
           scroll border caps also eat into the border-box width — keep
           padding modest or the text area collapses.
           v2.3.721: asymmetric top/bottom — the scroll art's bottom-left
           tail drops its visual center above the input's geometric center,
           so the text rides a few px high to sit on the parchment band. */
        padding: '9px 30px 15px',
        /* v2.3.710: 16px floor — iOS Safari auto-zooms inputs with a smaller
           font on focus, leaving visualViewport.scale > 1, which trips the
           joinTown pinch-zoom gate. */
        fontSize: 16,
        fontWeight: 700,
        outline: 'none',
        textAlign: 'center',
        boxSizing: 'border-box'
      }
    }), /*#__PURE__*/React.createElement("img", {
      /* v2.3.718: owner-generated quill — the "sign here" cue before the
         name (from the mockup).  Decorative; never intercepts taps. */
      src: '/ui/welcome/quill.webp',
      alt: '',
      style: { position: 'absolute', left: 30, top: 'calc(50% - 3px)', transform: 'translateY(-50%)', height: 22, width: 'auto', pointerEvents: 'none' }
    }), /*#__PURE__*/React.createElement("button", {
      type: 'button', title: 'Random name', onClick: rollRandomName,
      /* v2.3.722: pushed onto the scroll cap — at right:25 it clipped the
         end of longer names. */
      style: { position: 'absolute', right: 12, top: 'calc(50% - 3px)', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
        background: 'rgba(18,20,31,0.82)', border: '1.5px solid var(--line)', fontSize: 15, padding: 0, lineHeight: 1 }
    }, "🎲")), /*#__PURE__*/React.createElement("div", {
      /* Tabs + drawer share one wrapper so the card's gap can't split
         them — they must read as a single component (spec §5).  The
         wrapper is also the card's ONE flexing child: the drawer absorbs
         the leftover viewport height. */
      className: "bt-cc-menu"
    }, /*#__PURE__*/React.createElement("nav", {
      className: "bt-cc-tabs"
    }, _ccCats.map(function (c) {
      var on = c.key === activeCat;
      /* Tab semantics: tapping activates it (and only it); tapping the
         active tab is a no-op rather than a close — the drawer always
         shows SOMETHING, so the layout never reflows under PLAY. */
      return /*#__PURE__*/React.createElement("button", {
        key: c.key, type: 'button',
        className: 'bt-cc-tab' + (on ? ' bt-cc-tab--on' : ''),
        onClick: function () { setActiveCat(c.key); }
      }, c.label);
    })), /*#__PURE__*/React.createElement("section", {
      /* Customization drawer — one shared panel under the tabs.  Split
         layout (spec §6): items grid left = "what am I using?", color
         swatches right = "what color is it?"; the column only renders
         for categories that support recoloring.  The 'default' swatch
         tile stays in the grid — it already previews the item's
         original colors. */
      className: "bt-cc-drawer"
    }, /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-items" },
      /*#__PURE__*/React.createElement("span", { className: "bt-cc-drawer-head" }, "— " + _ccActive.label.toUpperCase() + " —"),
      /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-grid" }, _ccActive.items)),
    _ccActive.colors ? /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-colors" },
      /*#__PURE__*/React.createElement("span", { className: "bt-cc-drawer-head" }, "— COLORS —"),
      /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-grid" }, _ccActive.colors)) : null)), /*#__PURE__*/React.createElement("button", {
      /* Appearance RANDOMIZE — full-width gold row directly under the
         menu it acts on (owner placement, v2.3.794); the name dice above
         rerolls just the name. */
      type: 'button', onClick: randomizeWithFlair, className: "bt-cc-rand",
      /* v2.3.800: slimmed with the rest of the vertical rhythm. */
      style: { width: '100%', padding: '4px', minHeight: 34, cursor: 'pointer', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        background: 'rgba(20,16,40,0.93)', color: 'var(--txt)',
        fontSize: 16, fontWeight: 700, letterSpacing: '.02em', fontFamily: "'Baloo 2','Source Sans 3',sans-serif",
        textShadow: '0 1px 2px rgba(0,0,0,.55)' }
    }, /*#__PURE__*/React.createElement("img", { src: '/ui/welcome/fate-orb.webp', alt: '', style: { width: 22, height: 22, flex: '0 0 auto' } }),
    /*#__PURE__*/React.createElement("span", null, "Randomize")), /*#__PURE__*/React.createElement("button", {
      onClick: joinTown,
      /* v2.3.725: the owner's painted PLAY art (label baked in); the img is
         the button.  :active press lives in .bt-cc-play.
         v2.3.797: flow endpoint — the final action once the character is
         ready (spec §8); the locked layout keeps it on screen. */
      className: "bt-cc-play",
      "aria-label": 'Play',
      style: {
        marginTop: 6,
        width: '100%',
        aspectRatio: '560 / 157',
        borderRadius: 12,
        cursor: 'pointer'
      }
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.797: build tag moved out of the header to the scroll's tail
         end (header px now belongs to the drawer). */
      style: {
        fontSize: 9,
        color: 'var(--txt2)',
        fontFamily: 'Source Sans 3, sans-serif',
        letterSpacing: '.06em',
        textAlign: 'center'
      }
    }, "v" + BUILD_INFO.version + " · " + BUILD_INFO.sha)));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, showIntro && /*#__PURE__*/React.createElement(IntroVideo, {
    waitFor: introWaitRef.current,
    themeAudio: themeAudioRef,
    onComplete: function onComplete() { return setShowIntro(false); }
  }), /*#__PURE__*/React.createElement("div", {
    className: "brotown-wrap",
    ref: wrapRef,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      /* v2.3.821: was top:6 right:6 z-999 -- sat directly ON TOP of the
         top-right character card (which is z-30 under it), reading as a
         mystery box "behind" the HUD.  Moved down to stack BELOW the card
         + its new XP bar (card height ~= 6 + ~111), and dropped under the
         card's z so it can never overlap it again. */
      top: 'calc(env(safe-area-inset-top, 0px) + 120px)',
      right: 'calc(env(safe-area-inset-right, 0px) + 6px)',
      zIndex: 28,
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(0,0,0,.7)',
      fontSize: 9,
      fontWeight: 700,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: stateRef.current._realtimeStatus === 'connected' ? '#3dd497' : '#ef4444'
    }
  }), playerCount, " online"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    /* v2.3.772: epoch key -- bumping glEpoch swaps in a brand-new canvas
       element (and thus a brand-new WebGL context; a lost context can
       never be re-acquired on the old element). */
    key: 'cv' + glEpoch,
    ref: canvasRef,
    className: "brotown-canvas",
    style: {
      /* Pin the canvas to the upper 75% of the wrapper.  The lower 25vh
         is reserved for the BottomDashboard, which sits in its own fixed
         layer.  Camera centres the player so cropping the periphery just
         hides outer world tiles, not the avatar itself. */
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 'var(--dash-h)',
      cursor: stateRef.current._isDesktop ? 'crosshair' : 'default'
    },
    onTouchStart: function onTouchStart(e) {
      var t = e.changedTouches[0];
      canvasTouchRef.current = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        t: Date.now()
      };
    },
    onTouchEnd: function onTouchEnd(e) {
      var ct = canvasTouchRef.current;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === ct.id) {
          var _tdx = t.clientX - ct.x, _tdy = t.clientY - ct.y;
          var _tdist = Math.sqrt(_tdx * _tdx + _tdy * _tdy);
          var _tdur = Date.now() - ct.t;
          if (window.__broTapLog) {
            console.log('[tap-to-lock] touchEnd', {
              dist: _tdist.toFixed(1), durationMs: _tdur,
              treatedAsSwipe: _tdist >= 30 && _tdur < 300 && (_tdist / Math.max(_tdur, 1)) >= 0.8,
            });
          }
          handleCanvasSwipe(ct.x, ct.y, t.clientX, t.clientY, _tdur);
          /* Tap-to-lock-on monsters — handleCanvasSwipe early-returns
             for non-swipe taps; the canvas onClick is unreliable on
             multitouch (e.g. left finger on joystick + right finger
             tapping a monster), so route the lock-on check from here
             too.  Same monster hit-test as onClick below. */
          if (_tdist < 30 && _tdur < 300) {
            /* Mobile fires a synthesized click event after touchend.  Mark
               the timestamp so the canvas onClick handler can skip its
               tap-to-lock logic for ~500 ms — otherwise onClick re-runs
               the toggle on the same monster and instantly UNLOCKS what
               we just locked. */
            stateRef.current._touchHandledAt = Date.now();
            var _S = stateRef.current;
            var _rect = e.currentTarget.getBoundingClientRect();
            var _cssX = t.clientX - _rect.left;
            var _cssY = t.clientY - _rect.top;
            var _cx = _S.camera.x, _cy = _S.camera.y;
            if (_S.monsters) {
              var _closest = null, _closestDist = 40;
              _S.monsters.forEach(function (m) {
                if (!m.alive) return;
                /* Match the melee/projectile hit-Y shift so the tap
                   target lines up with the visible slime body, not the
                   feet-level m.y point. */
                var _archTap = m.archetype || m.type;
                var _mTapY = _archTap === 'fodder' ? m.y - 40
                           : _archTap === 'snowman' ? m.y - 19
                           : m.y;
                var _msx = m.x - _cx, _msy = _mTapY - _cy;
                var _d = Math.sqrt(Math.pow(_cssX - _msx, 2) + Math.pow(_cssY - _msy, 2));
                if (_d < _closestDist) { _closestDist = _d; _closest = m; }
              });
              if (_closest) {
                if (_S.lockedTarget && _S.lockedTarget.ref === _closest) {
                  _S.lockedTarget = null;
                } else {
                  _S.lockedTarget = { type: 'monster', id: _closest.id, ref: _closest };
                }
              }
            }
          }
          ct.id = null;
          break;
        }
      }
    },
    onMouseMove: function onMouseMove(e) {
      if (!stateRef.current._isDesktop) return;
      var S = stateRef.current;
      var rect = e.currentTarget.getBoundingClientRect();
      var screenX = e.clientX - rect.left;
      var screenY = e.clientY - rect.top;
      /* Convert screen coords to world coords using camera */
      var worldX = screenX + S.camera.x;
      var worldY = screenY + S.camera.y;
      /* Aim angle from player to mouse world position. Only push the
         aim into S._aimAngle while the player is actively attacking or
         aiming — otherwise mouse hover would override the body's
         facing direction every frame, causing the weapon to drift off
         the hand while walking (mobile sets _aimAngle only during
         right-joystick / attack events, so the weapon stays locked to
         facing during free movement; this mirrors that behavior). The
         click handlers below still seed _aimAngle from _mouseAimAngle
         at attack-start, so attacks still aim where the cursor is. */
      S._mouseAimAngle = Math.atan2(worldY - S.player.y, worldX - S.player.x);
      if (S.autoAttack || S._aiming) S._aimAngle = S._mouseAimAngle;
      S._mouseWorldX = worldX;
      S._mouseWorldY = worldY;
      /* Update facing based on mouse aim */
      var ang = S._mouseAimAngle;
      if (Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang))) S._facing = Math.cos(ang) > 0 ? 'right' : 'left';else S._facing = Math.sin(ang) > 0 ? 'down' : 'up';
    },
    onMouseDown: function onMouseDown(e) {
      if (!stateRef.current._isDesktop) return;
      if (e.button === 0) {
        /* Left click — attack toward mouse */
        var S = stateRef.current;
        if (S._mouseAimAngle != null) S._aimAngle = S._mouseAimAngle;
        S.autoAttack = true;
        setAutoAttack(true);
        S._aiming = true;
        doSwing();
      }
    },
    onMouseUp: function onMouseUp(e) {
      if (!stateRef.current._isDesktop) return;
      if (e.button === 0) {
        stateRef.current.autoAttack = false;
        setAutoAttack(false);
        stateRef.current._aiming = false;
      }
    },
    onContextMenu: function onContextMenu(e) {
      e.preventDefault();
      if (!stateRef.current._isDesktop) return;
      /* Right click — special attack toward mouse */
      var S = stateRef.current;
      if (S._mouseAimAngle != null) S._aimAngle = S._mouseAimAngle;
      doSpecialAttack();
    },
    onClick: function onClick(e) {
      /* Mobile dispatches a synthesized click event ~50-300 ms after
         touchend.  onTouchEnd already ran the tap-to-lock toggle and
         set _touchHandledAt — re-running it here would lock then
         instantly unlock the same monster.  Desktop never sets that
         flag (only the touch path does), so this gate doesn't affect
         mouse clicks. */
      if (stateRef.current._touchHandledAt && Date.now() - stateRef.current._touchHandledAt < 600) {
        return;
      }
      var rect = e.currentTarget.getBoundingClientRect();
      /* CSS-pixel tap coords. Compare against monster screen positions in
         the same CSS-pixel space — the renderer applies scaleY 0.8 (world
         Y is compressed by 20% in render, see pixiRenderer + BroTown's
         W/H = canvas.width/dpr / canvas.height/dpr*1.25), so we forward-
         transform monster world coords to CSS pixels rather than reverse-
         transforming the tap. Hit radius is in CSS pixels. */
      var cssX = e.clientX - rect.left;
      var cssY = e.clientY - rect.top;
      var S = stateRef.current;
      var cx = S.camera.x,
        cy = S.camera.y;
      /* Both render paths use uniform scaling (Canvas 2D: setTransform
         dpr; PixiJS: worldContainer.scale 1.0 because BroTown passes
         viewW=cssW so cssW/viewW=1.0).  World coords map 1:1 to CSS
         pixels after camera offset. */
      var SCALE_X = 1.0;
      var SCALE_Y = 1.0;
      /* TEMP DIAGNOSTIC — remove once tap-to-lock is confirmed working. */
      if (window.__broTapLog) {
        var monstersAlive = (S.monsters || []).filter(function (m) { return m.alive; });
        console.log('[tap-to-lock] click fired', {
          cssX: cssX.toFixed(1), cssY: cssY.toFixed(1),
          camera: { x: cx.toFixed(1), y: cy.toFixed(1) },
          aliveMonsters: monstersAlive.length,
          nearest: monstersAlive.map(function (m) {
            var sx = (m.x - cx) * SCALE_X;
            var sy = (m.y - cy) * SCALE_Y;
            var d = Math.sqrt(Math.pow(cssX - sx, 2) + Math.pow(cssY - sy, 2));
            return { id: m.id, screenX: sx.toFixed(1), screenY: sy.toFixed(1), d: d.toFixed(1) };
          }).sort(function (a, b) { return Number(a.d) - Number(b.d); }).slice(0, 3),
        });
      }
      /* Check monsters for lock-on. Hit radius is in CSS pixels — monster
         bodies are 12-28 px wide (size 6-14, no vertical compression in
         Canvas 2D path), under iOS's 44 px tap-target minimum. 40 px is
         forgiving without making empty-space taps accidentally lock on. */
      if (S.monsters) {
        var closest = null,
          closestDist = 40;
        S.monsters.forEach(function (m) {
          if (!m.alive) return;
          /* Match the melee/projectile hit-Y shift so taps line up with
             the visible body, not the feet-level m.y point. */
          var _archTap = m.archetype || m.type;
          var _mTapY = _archTap === 'fodder' ? m.y - 40
                     : _archTap === 'snowman' ? m.y - 19
                     : m.y;
          var msx = (m.x - cx) * SCALE_X;
          var msy = (_mTapY - cy) * SCALE_Y;
          var d = Math.sqrt(Math.pow(cssX - msx, 2) + Math.pow(cssY - msy, 2));
          if (d < closestDist) {
            closestDist = d;
            closest = m;
          }
        });
        if (closest) {
          /* Toggle lock: tap same = unlock, tap new = lock */
          if (S.lockedTarget && S.lockedTarget.ref === closest) {
            S.lockedTarget = null;
          } else {
            S.lockedTarget = {
              type: 'monster',
              id: closest.id,
              ref: closest
            };
          }
          return;
        }
      }
      /* Check NPCs — tap opens quest dialog if available, otherwise lock-on */
      if (S.npcs) {
        var _iterator2 = _createForOfIteratorHelper(S.npcs),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var npc = _step2.value;
            if (!npc.alive) continue;
            var nsx = (npc.x - cx) * SCALE_X,
              nsy = (npc.y - cy) * SCALE_Y;
            if (Math.sqrt(Math.pow(cssX - nsx, 2) + Math.pow(cssY - nsy, 2)) < 30) {
              /* Check if NPC has a quest */
              var npcQ = getNpcQuest(S.rpg, npc.name);
              if (npcQ) {
                setQuestPanel({
                  npc: npc.name,
                  quest: npcQ.quest,
                  status: npcQ.status,
                  npcRef: npc
                });
                return;
              }
              /* No quest — just lock on */
              if (S.lockedTarget && S.lockedTarget.ref === npc) S.lockedTarget = null;else S.lockedTarget = {
                type: 'npc',
                id: npc.name,
                ref: npc
              };
              return;
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }
      /* Check other players for lock-on OR inspect */
      for (var _i43 = 0, _Object$entries7 = Object.entries(S.others); _i43 < _Object$entries7.length; _i43++) {
        var _Object$entries7$_i = _slicedToArray(_Object$entries7[_i43], 2),
          id = _Object$entries7$_i[0],
          o = _Object$entries7$_i[1];
        var osx = (o.renderX - cx) * SCALE_X,
          osy = (o.renderY - cy) * SCALE_Y;
        if (Math.sqrt(Math.pow(cssX - osx, 2) + Math.pow(cssY - osy, 2)) < 25) {
          if (S.lockedTarget && S.lockedTarget.id === id) {
            S.lockedTarget = null;
          } else {
            S.lockedTarget = {
              type: 'player',
              id: id,
              ref: o
            };
            setInspectPlayer({
              id: id,
              name: o.name,
              color: o.color,
              avatar: o.avatar,
              bro: o.bro,
              x: o.x,
              y: o.y,
              rpgLv: o.rpgLv,
              rpgData: o.rpgData,
              pet: o.pet,
              rep: o.rep,
              clanTag: o.clanTag,
              clanColor1: o.clanColor1
            });
          }
          return;
        }
      }
      /* Tap on empty space = unlock */
      S.lockedTarget = null;
    }
  }), achievementMsg && Date.now() - achievementMsg.ts < 3000 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: 22,
      padding: '12px 24px',
      borderRadius: 14,
      background: 'rgba(91,82,255,.9)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '2px solid rgba(255,255,255,.3)',
      textAlign: 'center',
      animation: 'scoreReveal .4s cubic-bezier(.22,1,.36,1)',
      boxShadow: '0 4px 20px rgba(91,82,255,.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32
    }
  }, achievementMsg.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'rgba(255,255,255,.6)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginTop: 2
    }
  }, "Achievement Unlocked"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#fff',
      marginTop: 2
    }
  }, achievementMsg.name)), collectMsg && Date.now() - collectMsg.ts < 2000 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: 20,
      padding: '10px 20px',
      borderRadius: 12,
      background: 'rgba(0,0,0,.75)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      border: '1.5px solid rgba(245,197,66,.4)',
      textAlign: 'center',
      animation: 'scoreReveal .35s cubic-bezier(.22,1,.36,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, collectMsg.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: '#f5c542',
      marginTop: 4
    }
  }, collectMsg.text)), function (_ZONES$war$zone2) {
    var S = stateRef.current;
    var war = S._activeClanWar;
    if (!war || war.status !== 'active' || !S._clanData) return null;
    var isChallenger = war.challenger.tag === S._clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    var timeLeft = Math.max(0, Math.ceil((war.endTime - Date.now()) / 1000));
    var mins = Math.floor(timeLeft / 60);
    var secs = timeLeft % 60;
    var inWarZone = S.currentZone === war.zone;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'rgba(0,0,0,.75)',
        border: '1.5px solid rgba(255,94,108,.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 2px 12px rgba(255,94,108,.15)',
        minWidth: 200
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px',
        textAlign: 'center',
        minWidth: 60,
        background: us.score > them.score ? 'rgba(61,212,151,.1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 800,
        color: us.color || '#5b52ff',
        letterSpacing: '.05em'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 8px',
        textAlign: 'center',
        borderLeft: '1px solid rgba(255,255,255,.06)',
        borderRight: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 800,
        color: 'rgba(255,255,255,.25)',
        letterSpacing: '.1em'
      }
    }, "VS"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: timeLeft < 120 ? '#ff5e6c' : 'rgba(255,255,255,.5)',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, mins, ":", secs < 10 ? '0' + secs : secs), !inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, "Go to ", (_ZONES$war$zone2 = ZONES[war.zone]) === null || _ZONES$war$zone2 === void 0 ? void 0 : _ZONES$war$zone2.name), inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: '#ff5e6c',
        fontWeight: 700
      }
    }, "\u2694\uFE0F FIGHT!")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px',
        textAlign: 'center',
        minWidth: 60,
        background: them.score > us.score ? 'rgba(255,94,108,.1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 800,
        color: them.color || '#ff5e6c',
        letterSpacing: '.05em'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1
      }
    }, them.score)));
  }(), function (_ZONES$war$zone3) {
    var S = stateRef.current;
    var war = S._activeClanWar;
    if (!war || war.status !== 'ended' || !S._clanData) return null;
    var isChallenger = war.challenger.tag === S._clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    var isWinner = war.winner === S._clanData.tag;
    var isTie = war.winner === 'tie';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, isTie ? '⚔️' : isWinner ? '🏆' : '💀'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: isTie ? 'rgba(255,255,255,.5)' : isWinner ? '#f5c542' : '#ff5e6c',
        marginBottom: 4
      }
    }, isTie ? 'DRAW!' : isWinner ? 'VICTORY!' : 'DEFEAT'), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: us.color || '#5b52ff'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 900,
        color: '#fff'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'rgba(255,255,255,.2)',
        fontWeight: 800
      }
    }, "\u2014"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: them.color || '#ff5e6c'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 900,
        color: '#fff'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.4)'
      }
    }, war.killLog.length, " total kills \xB7 ", (_ZONES$war$zone3 = ZONES[war.zone]) === null || _ZONES$war$zone3 === void 0 ? void 0 : _ZONES$war$zone3.name), war.killLog.length > 0 && function () {
      var killsByPlayer = {};
      war.killLog.forEach(function (k) {
        killsByPlayer[k.killer] = (killsByPlayer[k.killer] || 0) + k.points;
      });
      var sorted = Object.entries(killsByPlayer).sort(function (a, b) {
        return b[1] - a[1];
      }).slice(0, 3);
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: 'rgba(255,255,255,.3)',
          marginBottom: 2
        }
      }, "TOP KILLERS"), sorted.map(function (_ref29, i) {
        var _ref30 = _slicedToArray(_ref29, 2),
          name = _ref30[0],
          pts = _ref30[1];
        return /*#__PURE__*/React.createElement("div", {
          key: i,
          style: {
            fontSize: 9,
            color: 'rgba(255,255,255,.5)'
          }
        }, ['🥇', '🥈', '🥉'][i], " ", name, ": ", pts, "pts");
      }));
    }(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        marginTop: 8
      }
    }, "Closing in a few seconds...")));
  }(), showMinigame && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      if (!minigameInstance || minigameInstance.status === 'waiting' || minigameInstance.status === 'ended') setShowMinigame(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 340,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, (!minigameInstance || minigameInstance.status === 'ended') && /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowMinigame(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8E44AD',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFAE Minigame Arena"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "\uD83D\uDCB0 ", (rpgState === null || rpgState === void 0 ? void 0 : rpgState.coins) || 0, "G \xB7 Entry: ", MINIGAME_ENTRY_FEE, "G \xB7 45 seconds \xB7 1-4 players"), (!minigameInstance || minigameInstance.status === 'ended') && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Choose a Minigame"), ELEMENTAL_MINIGAMES.map(function (g) {
    var elem = ELEMENTS[g.element];
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: function onClick() {
        var S = stateRef.current,
          R = S.rpg;
        if (!R || R.coins < MINIGAME_ENTRY_FEE) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Need ' + MINIGAME_ENTRY_FEE + 'G!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= MINIGAME_ENTRY_FEE;
        if (R._compStats) R._compStats.totalGoldSpent += MINIGAME_ENTRY_FEE;
        var inst = createMinigameInstance(g.id, S.myId, S.myName);
        inst.status = 'countdown';
        inst.startTime = Date.now() + 3000; /* 3s countdown */
        inst.endTime = Date.now() + 3000 + MINIGAME_DURATION;
        setMinigameInstance(inst);
        setMinigameScore(0);
        /* Broadcast to invite nearby players */
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'minigame_start',
          payload: {
            gameId: g.id,
            hostId: S.myId,
            hostName: S.myName,
            instanceId: inst.id
          }
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused16) {}
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        marginBottom: 4,
        textAlign: 'left',
        cursor: 'pointer',
        background: (elem === null || elem === void 0 ? void 0 : elem.color) + '10',
        border: '1.5px solid ' + (elem === null || elem === void 0 ? void 0 : elem.color) + '30'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, g.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: (elem === null || elem === void 0 ? void 0 : elem.color) || '#fff'
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, g.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginTop: 1
      }
    }, g.mechanic, " \xB7 Score: ", g.scoreType)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, MINIGAME_ENTRY_FEE, "G"));
  })), (minigameInstance === null || minigameInstance === void 0 ? void 0 : minigameInstance.status) === 'countdown' && function () {
    var timeLeft = Math.max(0, Math.ceil((minigameInstance.startTime - Date.now()) / 1000));
    if (Date.now() >= minigameInstance.startTime) {
      /* Start! */
      var inst = _objectSpread(_objectSpread({}, minigameInstance), {}, {
        status: 'active'
      });
      setMinigameInstance(inst);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 48,
        fontWeight: 900,
        color: minigameInstance.color
      }
    }, timeLeft || 'GO!'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)'
      }
    }, minigameInstance.gameName));
  }(), (minigameInstance === null || minigameInstance === void 0 ? void 0 : minigameInstance.status) === 'active' && function () {
    var mg = minigameInstance;
    var game = ELEMENTAL_MINIGAMES.find(function (g) {
      return g.id === mg.gameId;
    });
    var timeLeft = Math.max(0, (mg.endTime - Date.now()) / 1000);
    var elem = ELEMENTS[mg.element];

    /* Auto-tick for game updates */
    if (!stateRef.current._mgTick) {
      stateRef.current._mgTick = setInterval(function () {
        return setMinigameTick(function (t) {
          return t + 1;
        });
      }, 100);
    }

    /* Check if time's up */
    if (Date.now() >= mg.endTime) {
      clearInterval(stateRef.current._mgTick);
      stateRef.current._mgTick = null;
      var finalInst = _objectSpread(_objectSpread({}, mg), {}, {
        status: 'ended',
        winner: {
          id: stateRef.current.myId,
          name: stateRef.current.myName,
          score: minigameScore
        }
      });
      setMinigameInstance(finalInst);
      /* Reward */
      var _R10 = stateRef.current.rpg;
      var reward = Math.ceil(MINIGAME_ENTRY_FEE + minigameScore * 2);
      _R10.coins += reward;
      if (_R10._compStats) _R10._compStats.totalGoldEarned += reward;
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 30,
        text: '+' + reward + 'G! Score: ' + minigameScore,
        color: mg.color,
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, _R10));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(_R10));
      } catch (_unused17) {}
    }

    /* Generate hazards/targets based on mechanic */
    var now = Date.now();
    if (!mg._hazards) mg._hazards = [];
    if (!mg._lastSpawn || now - mg._lastSpawn > game.spawnRate) {
      mg._lastSpawn = now;
      var hz = {
        id: 'hz-' + now,
        x: Math.random() * 260 + 20,
        y: Math.random() * 120 + 20,
        type: game.mechanic,
        ts: now,
        active: true,
        size: 16 + Math.random() * 16,
        isDecoy: game.mechanic === 'catch' && Math.random() < 0.3
      };
      mg._hazards.push(hz);
      if (mg._hazards.length > 12) mg._hazards.shift();
    }
    /* Expire old hazards */
    mg._hazards = mg._hazards.filter(function (h) {
      return now - h.ts < 2000;
    });
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: elem === null || elem === void 0 ? void 0 : elem.color
      }
    }, game === null || game === void 0 ? void 0 : game.icon, " ", mg.gameName), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 900,
        color: timeLeft < 10 ? '#ff5e6c' : '#f5c542',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, timeLeft.toFixed(1), "s"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 900,
        color: '#fff'
      }
    }, "Score: ", minigameScore)), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        height: 160,
        borderRadius: 8,
        overflow: 'hidden',
        background: (elem === null || elem === void 0 ? void 0 : elem.color) + '15',
        border: '2px solid ' + (elem === null || elem === void 0 ? void 0 : elem.color) + '40',
        marginBottom: 6
      }
    }, mg._hazards.filter(function (h) {
      return h.active;
    }).map(function (h) {
      var age = (now - h.ts) / 2000;
      var fadeOut = age > 0.7 ? (1 - age) / 0.3 : 1;
      var pulse = 1 + Math.sin(now / 100) * 0.1;
      return /*#__PURE__*/React.createElement("button", {
        key: h.id,
        onClick: function onClick() {
          if (!h.active) return;
          h.active = false;
          if (h.isDecoy) {
            setMinigameScore(function (s) {
              return Math.max(0, s - 2);
            });
            BT_AUDIO.beep(200, 0.08, 0.1, 'square');
          } else {
            setMinigameScore(function (s) {
              return s + 1;
            });
            BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
          }
        },
        style: {
          position: 'absolute',
          left: h.x,
          top: h.y,
          width: h.size * pulse,
          height: h.size * pulse,
          borderRadius: '50%',
          background: h.isDecoy ? 'rgba(255,94,108,.6)' : (elem === null || elem === void 0 ? void 0 : elem.color) + '80',
          border: '2px solid ' + (h.isDecoy ? '#ff5e6c' : (elem === null || elem === void 0 ? void 0 : elem.color) || '#fff'),
          cursor: 'pointer',
          opacity: fadeOut,
          transition: 'opacity .1s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: h.size * 0.5,
          color: '#fff',
          fontWeight: 900,
          boxShadow: '0 0 ' + (h.isDecoy ? '8px rgba(255,94,108,.4)' : '10px ' + (elem === null || elem === void 0 ? void 0 : elem.color) + '40'),
          transform: 'translate(-50%,-50%)',
          padding: 0
        }
      }, h.isDecoy ? '✕' : game.mechanic === 'dodge' ? '🔥' : game.mechanic === 'block' ? '🛡️' : game.mechanic === 'attack' ? '⚡' : '●');
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, game.mechanic === 'dodge' ? 'Avoid the hazards!' : game.mechanic === 'catch' ? 'Tap targets, avoid red decoys!' : 'Tap targets as fast as you can!')));
  }(), (minigameInstance === null || minigameInstance === void 0 ? void 0 : minigameInstance.status) === 'ended' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 4
    }
  }, minigameInstance.icon || '🎮'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: minigameInstance.color || '#8E44AD'
    }
  }, "Game Over!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      color: '#f5c542',
      margin: '6px 0'
    }
  }, "Score: ", ((_minigameInstance$win = minigameInstance.winner) === null || _minigameInstance$win === void 0 ? void 0 : _minigameInstance$win.score) || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Reward: +", Math.ceil(MINIGAME_ENTRY_FEE + (((_minigameInstance$win2 = minigameInstance.winner) === null || _minigameInstance$win2 === void 0 ? void 0 : _minigameInstance$win2.score) || 0) * 2), "G"), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setMinigameInstance(null);
      clearInterval(stateRef.current._mgTick);
      stateRef.current._mgTick = null;
    },
    style: {
      marginTop: 10,
      padding: '8px 24px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 800,
      border: '1.5px solid rgba(142,68,173,.4)',
      background: 'rgba(142,68,173,.15)',
      color: '#8E44AD',
      cursor: 'pointer'
    }
  }, "Play Again")))), /*#__PURE__*/React.createElement("button", {
    className: "bt-exit-fab",
    onClick: function onClick() {
      /* v2.3.785: exiting reloads the whole app, and the teardown stutter
         read as a frame-rate crash with no explanation.
         v2.3.786: the lone 36px spinner wasn't legible over the frozen
         game frame (Safari keeps the old page painted, animations and all
         stopped, until the new document's first paint).  Full-screen dim
         + spinner + label instead, appended OUTSIDE the React tree so
         unmounting can't remove it; navigate on the next frame so it
         paints first.  The new page's #bt-loading boot screen takes over
         from there. */
      try {
        var dim = document.createElement('div');
        dim.className = 'bt-exit-dim';
        var sp = document.createElement('div');
        sp.className = 'bt-exit-loading';
        var lbl = document.createElement('div');
        lbl.className = 'bt-exit-label';
        lbl.textContent = 'Reloading…';
        dim.appendChild(sp);
        dim.appendChild(lbl);
        document.body.appendChild(dim);
      } catch (e) {}
      requestAnimationFrame(function () {
        setTimeout(onExit, 30);
      });
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }))), showGuildPanel && rpgState && /*#__PURE__*/React.createElement(GuildPanel, { rpgState: rpgState, guildSkill: guildSkill, setGuildSkill: setGuildSkill, setRpgState: setRpgState, setShowGuildPanel: setShowGuildPanel, stateRef: stateRef }), showFeedback && /*#__PURE__*/React.createElement(FeedbackPanel, { stateRef: stateRef, feedbackTab: feedbackTab, setFeedbackTab: setFeedbackTab, feedbackCategory: feedbackCategory, setFeedbackCategory: setFeedbackCategory, feedbackTopic: feedbackTopic, setFeedbackTopic: setFeedbackTopic, feedbackText: feedbackText, setFeedbackText: setFeedbackText, feedbackSort: feedbackSort, setFeedbackSort: setFeedbackSort, feedbackTickets: feedbackTickets, setFeedbackTickets: setFeedbackTickets, feedbackSubmitCategory: feedbackSubmitCategory, setFeedbackSubmitCategory: setFeedbackSubmitCategory, feedbackSubmitTopic: feedbackSubmitTopic, setFeedbackSubmitTopic: setFeedbackSubmitTopic, setShowFeedback: setShowFeedback }), showLeaderboard && /*#__PURE__*/React.createElement(LeaderboardPanel, { stateRef: stateRef, leaderboardTab: leaderboardTab, setLeaderboardTab: setLeaderboardTab, setRpgState: setRpgState, setShowLeaderboard: setShowLeaderboard }), showEncyclopedia && /*#__PURE__*/React.createElement(EncyclopediaPanel, { encyclopediaTab: encyclopediaTab, setEncyclopediaTab: setEncyclopediaTab, setShowEncyclopedia: setShowEncyclopedia }), showMinigame && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      if (!minigameInstance || minigameInstance.status === 'waiting') setShowMinigame(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 340,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      setShowMinigame(false);
      setMinigameInstance(null);
      setMinigameScore(0);
    }
  }, "\u2715"), !minigameInstance && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8E44AD',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFAE Minigame Arena"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G \xB7 Entry: ", MINIGAME_ENTRY_FEE, "G \xB7 45 seconds \xB7 Timing-based challenges"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, ELEMENTAL_MINIGAMES.map(function (g) {
    var elem = ELEMENTS[g.element];
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: function onClick() {
        var S = stateRef.current,
          R = S.rpg;
        if (!R || R.coins < MINIGAME_ENTRY_FEE) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Need ' + MINIGAME_ENTRY_FEE + 'G!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= MINIGAME_ENTRY_FEE;
        if (R._compStats) R._compStats.totalGoldSpent += MINIGAME_ENTRY_FEE;
        var inst = createMinigameInstance(g.id, S.myId, S.myName);
        inst.status = 'active';
        inst.startTime = Date.now();
        inst.endTime = Date.now() + MINIGAME_DURATION;
        setMinigameInstance(inst);
        setMinigameScore(0);
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused23) {}
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1.5px solid ' + g.color + '40',
        background: g.color + '10',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, g.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: g.color
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, g.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: (elem === null || elem === void 0 ? void 0 : elem.color) || '#888',
        marginTop: 1
      }
    }, g.element, " \xB7 ", g.mechanic)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, MINIGAME_ENTRY_FEE, "G"));
  }))), minigameInstance && minigameInstance.status === 'active' && function () {
    var inst = minigameInstance;
    var game = ELEMENTAL_MINIGAMES.find(function (g) {
      return g.id === inst.gameId;
    });
    var timeLeft = Math.max(0, inst.endTime - Date.now());
    var timeLeftSec = (timeLeft / 1000).toFixed(1);
    var pct = 1 - timeLeft / MINIGAME_DURATION;

    /* Auto-end check */
    if (timeLeft <= 0 && inst.status === 'active') {
      inst.status = 'ended';
      inst.winner = {
        id: stateRef.current.myId,
        name: stateRef.current.myName,
        score: minigameScore
      };
      /* Rewards */
      var _R11 = stateRef.current.rpg;
      var goldReward = Math.ceil(minigameScore * 2 + 10);
      var apReward = Math.ceil(minigameScore * 0.5);
      _R11.coins += goldReward;
      _R11.achievementPoints = (_R11.achievementPoints || 0) + apReward;
      if (_R11._compStats) {
        _R11._compStats.totalGoldEarned += goldReward;
      }
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 40,
        text: 'Score: ' + minigameScore + ' +' + goldReward + 'G +' + apReward + 'AP',
        color: (game === null || game === void 0 ? void 0 : game.color) || '#a855f7',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setMinigameInstance(_objectSpread({}, inst));
      setRpgState(_objectSpread({}, _R11));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(_R11));
      } catch (_unused24) {}
    }

    /* Minigame tick — spawn hazards/targets */
    var tickKey = Math.floor(Date.now() / 50);
    if (stateRef.current._mgLastTick !== tickKey) {
      stateRef.current._mgLastTick = tickKey;
      /* Spawn new target based on game type */
      if (!inst._targets) inst._targets = [];
      if (Date.now() > (inst._nextSpawn || 0)) {
        inst._nextSpawn = Date.now() + ((game === null || game === void 0 ? void 0 : game.spawnRate) || 700);
        var tx = 20 + Math.random() * 260;
        var ty = 40 + Math.random() * 120;
        var isDecoy = (game === null || game === void 0 ? void 0 : game.mechanic) === 'catch' && Math.random() < 0.3;
        inst._targets.push({
          x: tx,
          y: ty,
          ts: Date.now(),
          hit: false,
          decoy: isDecoy,
          lifespan: 1500
        });
      }
      /* Expire old targets */
      inst._targets = inst._targets.filter(function (t) {
        return Date.now() - t.ts < t.lifespan && !t.hit;
      });
      setMinigameTick(function (t) {
        return t + 1;
      });
    }
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, (game === null || game === void 0 ? void 0 : game.icon) || '🎮'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: (game === null || game === void 0 ? void 0 : game.color) || '#a855f7'
      }
    }, (game === null || game === void 0 ? void 0 : game.name) || 'Minigame'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, game === null || game === void 0 ? void 0 : game.mechanic, " challenge")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 900,
        color: timeLeft < 5000 ? '#ff5e6c' : '#f5c542',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, timeLeftSec, "s"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#fff'
      }
    }, "Score: ", minigameScore))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        borderRadius: 2,
        background: 'rgba(0,0,0,.3)',
        marginBottom: 8,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 2,
        background: timeLeft < 5000 ? '#ff5e6c' : (game === null || game === void 0 ? void 0 : game.color) || '#a855f7',
        width: 100 - pct * 100 + '%',
        transition: 'width .1s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        height: 180,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'rgba(0,0,0,.3)',
        border: '1px solid ' + ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '30',
        cursor: 'crosshair',
        touchAction: 'manipulation'
      },
      onClick: function onClick(e) {
        var rect = e.currentTarget.getBoundingClientRect();
        var cx = e.clientX - rect.left;
        var cy = e.clientY - rect.top;
        /* Check if clicked a target */
        var hitAny = false;
        (inst._targets || []).forEach(function (t) {
          if (t.hit) return;
          var dx = cx - t.x,
            dy = cy - t.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            t.hit = true;
            if (t.decoy) {
              setMinigameScore(function (s) {
                return Math.max(0, s - 5);
              });
              stateRef.current.dmgNumbers.push({
                x: stateRef.current.player.x,
                y: stateRef.current.player.y - 20,
                text: 'Decoy! -5',
                color: '#ff5e6c',
                ts: Date.now()
              });
            } else {
              var points = (game === null || game === void 0 ? void 0 : game.mechanic) === 'attack' ? 3 : (game === null || game === void 0 ? void 0 : game.mechanic) === 'catch' ? 2 : (game === null || game === void 0 ? void 0 : game.mechanic) === 'block' ? 4 : 2;
              setMinigameScore(function (s) {
                return s + points;
              });
              hitAny = true;
            }
          }
        });
        if (!hitAny && (game === null || game === void 0 ? void 0 : game.mechanic) === 'dodge') {
          /* In dodge mode, tapping empty space = dodge success */
          setMinigameScore(function (s) {
            return s + 1;
          });
        }
      },
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        e.currentTarget.click && e.currentTarget.dispatchEvent(new MouseEvent('click', {
          clientX: t.clientX,
          clientY: t.clientY
        }));
      }
    }, (inst._targets || []).filter(function (t) {
      return !t.hit;
    }).map(function (t, i) {
      var age = (Date.now() - t.ts) / t.lifespan;
      var fadeOut = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      var pulse = Math.sin(Date.now() / 100) * 3;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          position: 'absolute',
          left: t.x - 15,
          top: t.y - 15,
          width: 30,
          height: 30,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: t.decoy ? 'rgba(255,94,108,.2)' : ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '30',
          border: '2px solid ' + (t.decoy ? 'rgba(255,94,108,.5)' : ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '60'),
          opacity: fadeOut,
          transform: 'scale(' + (0.8 + pulse * 0.02) + ')',
          boxShadow: '0 0 ' + (8 + pulse) + 'px ' + (t.decoy ? 'rgba(255,94,108,.3)' : ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '40'),
          transition: 'opacity .1s',
          pointerEvents: 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          pointerEvents: 'none'
        }
      }, t.decoy ? '💀' : (game === null || game === void 0 ? void 0 : game.icon) || '⚡'));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center,' + ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '08 0%,transparent 70%)',
        pointerEvents: 'none'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginTop: 4,
        textAlign: 'center'
      }
    }, (game === null || game === void 0 ? void 0 : game.mechanic) === 'dodge' ? 'Tap empty space to dodge!' : (game === null || game === void 0 ? void 0 : game.mechanic) === 'catch' ? 'Tap orbs, avoid 💀 decoys!' : 'Tap targets as they appear!'));
  }(), minigameInstance && minigameInstance.status === 'ended' && function () {
    var game = ELEMENTAL_MINIGAMES.find(function (g) {
      return g.id === minigameInstance.gameId;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        marginBottom: 4
      }
    }, (game === null || game === void 0 ? void 0 : game.icon) || '🎮'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 900,
        color: (game === null || game === void 0 ? void 0 : game.color) || '#a855f7',
        marginBottom: 2
      }
    }, game === null || game === void 0 ? void 0 : game.name, " Complete!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 900,
        color: '#f5c542',
        marginBottom: 4
      }
    }, minigameScore, " pts"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 12
      }
    }, "+", Math.ceil(minigameScore * 2 + 10), "G +", Math.ceil(minigameScore * 0.5), "AP"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setMinigameInstance(null);
        setMinigameScore(0);
      },
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        color: 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, "Back to Menu"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        var S = stateRef.current,
          R = S.rpg;
        if (!R || R.coins < MINIGAME_ENTRY_FEE) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Need ' + MINIGAME_ENTRY_FEE + 'G!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= MINIGAME_ENTRY_FEE;
        var inst = createMinigameInstance(minigameInstance.gameId, S.myId, S.myName);
        inst.status = 'active';
        inst.startTime = Date.now();
        inst.endTime = Date.now() + MINIGAME_DURATION;
        setMinigameInstance(inst);
        setMinigameScore(0);
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused25) {}
      },
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 800,
        border: '1.5px solid ' + ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '60',
        background: ((game === null || game === void 0 ? void 0 : game.color) || '#a855f7') + '18',
        color: (game === null || game === void 0 ? void 0 : game.color) || '#a855f7',
        cursor: 'pointer'
      }
    }, "Play Again (", MINIGAME_ENTRY_FEE, "G)")));
  }())), showPetHouse && rpgState && /*#__PURE__*/React.createElement(PetHousePanel, { rpgState: rpgState, stateRef: stateRef, petHouseTab: petHouseTab, setPetHouseTab: setPetHouseTab, petEvolve1: petEvolve1, setPetEvolve1: setPetEvolve1, petEvolve2: petEvolve2, setPetEvolve2: setPetEvolve2, setRpgState: setRpgState, setShowPetHouse: setShowPetHouse }), showFurniture && rpgState && /*#__PURE__*/React.createElement(FurniturePanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setShowFurniture: setShowFurniture }), showDungeonCreator && dungeonCreator && rpgState && /*#__PURE__*/React.createElement(DungeonCreatorPanel, { rpgState: rpgState, stateRef: stateRef, dungeonCreator: dungeonCreator, setDungeonCreator: setDungeonCreator, dungeonCreatorTab: dungeonCreatorTab, setDungeonCreatorTab: setDungeonCreatorTab, setRpgState: setRpgState, setShowDungeonCreator: setShowDungeonCreator }), showStatScreen && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "\u2694\uFE0F Level ", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "XP: ", rpgState.xp, "/", xpRequired(rpgState.level), " \xB7 \uD83D\uDCB0 ", rpgState.coins), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [['HP', rpgState.hp, rpgState.maxHp, '#ff5e6c'], ['STA', Math.floor(rpgState.stamina || 0), rpgState.maxStamina || 100, '#f5c542'], ['MP', Math.floor(rpgState.mana || 0), rpgState.maxMana || 100, '#3b82f6']].map(function (_ref78) {
    var _ref79 = _slicedToArray(_ref78, 4),
      l = _ref79[0],
      v = _ref79[1],
      mx = _ref79[2],
      c = _ref79[3];
    return /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        flex: 1,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: c,
        marginBottom: 1
      }
    }, l, " ", v, "/", mx), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 2,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.max(1, v / mx * 100) + '%',
        height: '100%',
        background: c,
        borderRadius: 2
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#00d4b8',
      marginBottom: 3,
      marginTop: 4
    }
  }, "TIER 1 \u2014 CAPACITY ", rpgState.unspentT1 > 0 ? "(".concat(rpgState.unspentT1, " pts)") : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "permanent")), [['Power', 'power', '⚔️', 'Base damage', '#ff5e6c'], ['Vitality', 'vitality', '❤️', 'Health pool', '#3dd497'], ['Endurance', 'endurance', '🛡️', 'Stamina pool', '#f5c542'], ['Agility', 'agility', '💨', 'Speed & dodge', '#60a5fa'], ['Mind', 'mind', '💎', 'Mana pool', '#a78bfa']].map(function (_ref80) {
    var _ref81 = _slicedToArray(_ref80, 5),
      label = _ref81[0],
      key = _ref81[1],
      icon = _ref81[2],
      desc = _ref81[3],
      col = _ref81[4];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 65,
        fontSize: 9,
        fontWeight: 700,
        color: col
      }
    }, icon, " ", label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 5,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, (rpgState[key] || 0) / 4) + '%',
        height: '100%',
        background: col,
        borderRadius: 3,
        transition: 'width .2s'
      }
    })), /*#__PURE__*/React.createElement("button", {
      title: (rpgState._statLocks && rpgState._statLocks[key]) ? 'Locked — XP that would train ' + label + ' is burned. Click to unlock.' : 'Lock ' + label + ' at ' + (rpgState[key] || 0) + ' to commit to a pure build. XP that would train it will be burned.',
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        background: (rpgState._statLocks && rpgState._statLocks[key]) ? col : 'rgba(255,255,255,.08)',
        border: (rpgState._statLocks && rpgState._statLocks[key]) ? 'none' : '1px solid rgba(255,255,255,.18)',
        color: (rpgState._statLocks && rpgState._statLocks[key]) ? '#fff' : 'rgba(255,255,255,.5)',
        fontSize: 10,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        padding: 0
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R._statLocks) R._statLocks = { power: false, vitality: false, endurance: false, agility: false, mind: false };
        R._statLocks[key] = !R._statLocks[key];
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.beep(R._statLocks[key] ? 500 : 700, 0.05, 0.08, 'sine');
      }
    }, (rpgState._statLocks && rpgState._statLocks[key]) ? '🔒' : '🔓'));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 3,
      marginTop: 8
    }
  }, "TIER 2 \u2014 TECHNIQUE ", rpgState.unspentT2 > 0 ? "(".concat(rpgState.unspentT2, " pts)") : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "respecable")), [['Ferocity', 'ferocity', '🔥', 'Crit chance & dmg', '#ff5e6c'], ['Elem Mastery', 'elementalMastery', '✨', 'Status & collision dmg', '#00d4b8'], ['Fortification', 'fortification', '🏰', 'Block & Thorns', '#60a5fa'], ['Restoration', 'restoration', '💚', 'Regen & healing', '#3dd497'], ['Influence', 'influence', '👁️', 'CC duration & debuffs', '#a78bfa']].map(function (_ref82) {
    var _ref83 = _slicedToArray(_ref82, 5),
      label = _ref83[0],
      key = _ref83[1],
      icon = _ref83[2],
      desc = _ref83[3],
      col = _ref83[4];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 75,
        fontSize: 9,
        fontWeight: 700,
        color: col
      }
    }, icon, " ", label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 5,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, (rpgState[key] || 0) / 4) + '%',
        height: '100%',
        background: col,
        borderRadius: 3,
        transition: 'width .2s'
      }
    })), rpgState.unspentT2 > 0 && /*#__PURE__*/React.createElement("button", {
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        background: col,
        border: 'none',
        color: '#fff',
        fontSize: 11,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R.unspentT2 || R.unspentT2 <= 0) return;
        if (!confirm('Spend 1 Tier 2 point on ' + label + '? (' + R.unspentT2 + ' remaining)')) return;
        /* Server-validated allocation: send the request, let the worker
           validate ps.unspentT2 + apply, then mirror via stat_allocated
           event.  No local mutation here so a modified client can't
           bypass the unspentT2 gate. */
        if (S.channel) {
          try { S.channel.send({ type: 'stat_allocate', payload: { stat: key } }); } catch (e) {}
        }
        BT_AUDIO.beep(700, 0.06, 0.1, 'sine');
      }
    }, "+"));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.35)',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, "DMG: ", Math.round(calcWeaponDmg(getActiveWeapon(rpgState).type, rpgState || {}, getActiveWeapon(rpgState).tierMult)), ' · ', "Crit: ", (calcCritChance(rpgState.power || 0, getWeaponCritStat(rpgState)) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.power || 0, getWeaponCritStat(rpgState)).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(getDefenseBlockBonus(rpgState), rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0).toFixed(1), "u/s"))), buildingPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setBuildingPanel(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setBuildingPanel(null);
    }
  }, "\u2715"), buildingPanel === 'shop' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83D\uDED2 Vendor"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, " gold \xB7 Basic supplies for starting adventurers."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 8
    }
  }, "For healing, cook fish at the Kitchen! For buffs, cook herb recipes."), [{
    id: 'cookedMinnow',
    name: 'Cooked Minnow',
    icon: '🐟',
    cost: 8,
    desc: 'Heals 23 HP (pre-cooked)',
    effect: 'healFish',
    power: 23
  }, {
    id: 'basicTrap',
    name: 'Basic Trap',
    icon: '🪤',
    cost: 20,
    desc: 'Capture weakened monsters',
    effect: 'trap'
  }, {
    id: 'staminaSalts',
    name: 'Stamina Salts',
    icon: '⚡',
    cost: 12,
    desc: 'Restore 60 Stamina',
    effect: 'stamina'
  }, {
    id: 'manaShard',
    name: 'Mana Shard',
    icon: '💠',
    cost: 18,
    desc: 'Restore 40 Mana',
    effect: 'mana'
  }, {
    id: 'whetstone',
    name: 'Whetstone',
    icon: '🪨',
    cost: 35,
    desc: '+15% damage for 60s',
    effect: 'dmgBuff'
  }].map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, item.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#fff'
      }
    }, item.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, item.desc)), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '4px 10px',
        borderRadius: 6,
        border: 'none',
        fontSize: 9,
        fontWeight: 700,
        background: rpgState.coins >= item.cost ? '#3dd497' : 'rgba(255,255,255,.1)',
        color: rpgState.coins >= item.cost ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var S = stateRef.current;
        /* §2.6 Influence discount — 0.2% per point, max 20% */
        var discount = Math.min(0.20, (R.influence || 0) * 0.002);
        var finalCost = Math.max(1, Math.floor(item.cost * (1 - discount)));
        if (R.coins < finalCost) return;
        /* Server-authoritative shop in MP: worker mirrors the 5-item
           table, validates coins + influence discount, applies effect
           (pool restore / inventory grant), emits player_state.  Local
           mutation stays as snappy visual prediction; server's view
           overwrites on the next player_state. */
        R.coins -= finalCost;
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.boughtItem = true;
        if (item.effect === 'healFish') R.hp = Math.min(R.maxHp, R.hp + (item.power || 23));
        if (item.effect === 'mana') R.mana = Math.min(R.maxMana, (R.mana || 0) + 40);
        if (item.effect === 'stamina') R.stamina = Math.min(R.maxStamina, (R.stamina || 0) + 60);
        if (item.effect === 'cleanse') {/* clear all statuses */}
        if (item.effect === 'trap') {
          if (!R.inventory) R.inventory = {};
          R.inventory.basic_trap = (R.inventory.basic_trap || 0) + 1;
        }
        if (S._serverMonsters && S.channel) {
          try { S.channel.send({ type: 'shop_purchase', payload: { itemId: item.id } }); } catch (e) {}
        }
        if (item.effect === 'dmgBuff') {
          stateRef.current._dmgBuff = Date.now() + 60000;
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: item.icon + ' Used!',
          color: '#3dd497',
          ts: Date.now()
        });
      }
    }, item.cost, "g"));
  })), buildingPanel === 'bank' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83C\uDFE6 Bank"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "Your gold and equipped items are always safe. The bank protects additional items from death scatter."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 10,
      background: 'rgba(245,197,66,.08)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 Gold: ", rpgState.coins), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Gold is never lost on death (only 10% penalty)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 10,
      background: 'rgba(91,82,255,.08)',
      border: '1px solid rgba(91,82,255,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDDE1\uFE0F Equipment"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.5)',
      lineHeight: 1.5
    }
  }, "Melee: ", ((_rpgState$weapon = rpgState.weapon) === null || _rpgState$weapon === void 0 ? void 0 : _rpgState$weapon.name) || 'None', /*#__PURE__*/React.createElement("br", null), "Ranged: ", ((_rpgState$rangedWeapo = rpgState.rangedWeapon) === null || _rpgState$rangedWeapo === void 0 ? void 0 : _rpgState$rangedWeapo.name) || 'None', /*#__PURE__*/React.createElement("br", null), "Armor: ", ((_rpgState$armor = rpgState.armor) === null || _rpgState$armor === void 0 ? void 0 : _rpgState$armor.name) || 'None'))), buildingPanel === 'enchant' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 4
    }
  }, "\u2728 Enchanter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Enchanting Lv", ((_rpgState$lifeSkills1 = rpgState.lifeSkills) === null || _rpgState$lifeSkills1 === void 0 || (_rpgState$lifeSkills1 = _rpgState$lifeSkills1.enchanting) === null || _rpgState$lifeSkills1 === void 0 ? void 0 : _rpgState$lifeSkills1.level) || 1, " \xB7 Slot polished gems into gear with open gem slots."), [{
    label: 'Melee',
    key: 'weapon',
    wpn: rpgState.weapon
  }, {
    label: 'Ranged',
    key: 'rangedWeapon',
    wpn: rpgState.rangedWeapon
  }, {
    label: 'Staff',
    key: 'staffWeapon',
    wpn: rpgState.staffWeapon
  }].map(function (_ref84) {
    var _wpn$gearBase, _WOODWORKING_TIERS$ww, _BLACKSMITH_TIERS$wpn, _rpgState$lifeSkills10, _RARITY_TIERS$wpn$tie, _RARITY_TIERS$wpn$tie2, _ELEMENTS$wpn$element3, _ELEMENTS$wpn$element4;
    var label = _ref84.label,
      key = _ref84.key,
      wpn = _ref84.wpn;
    /* Determine available slots: crafted gear uses BLACKSMITH_TIERS/WOODWORKING_TIERS slots, dropped gear gets 2 free slots */
    var wwKey = wpn !== null && wpn !== void 0 && (_wpn$gearBase = wpn.gearBase) !== null && _wpn$gearBase !== void 0 && _wpn$gearBase.startsWith('ww_') ? wpn.gearBase.slice(3) : null;
    var maxSlots = wwKey ? ((_WOODWORKING_TIERS$ww = WOODWORKING_TIERS[wwKey]) === null || _WOODWORKING_TIERS$ww === void 0 ? void 0 : _WOODWORKING_TIERS$ww.slots) || 0 : wpn !== null && wpn !== void 0 && wpn.gearBase ? ((_BLACKSMITH_TIERS$wpn = BLACKSMITH_TIERS[wpn.gearBase]) === null || _BLACKSMITH_TIERS$wpn === void 0 ? void 0 : _BLACKSMITH_TIERS$wpn.slots) || 0 : wpn ? 2 : 0;
    var usedSlots = (wpn !== null && wpn !== void 0 && wpn.element1 ? 1 : 0) + (wpn !== null && wpn !== void 0 && wpn.element2 ? 1 : 0);
    var openSlots = Math.max(0, maxSlots - usedSlots);
    /* Fusion requires enchanting Lv20+, fusion-compatible gear base for volatile */
    var enchLvl = ((_rpgState$lifeSkills10 = rpgState.lifeSkills) === null || _rpgState$lifeSkills10 === void 0 || (_rpgState$lifeSkills10 = _rpgState$lifeSkills10.enchanting) === null || _rpgState$lifeSkills10 === void 0 ? void 0 : _rpgState$lifeSkills10.level) || 1;
    var canAddSecond = enchLvl >= 20 && maxSlots >= 2;
    var isFusionReady = (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'worldbreaker' || (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'ww_worldbreaker';
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 10,
        background: 'rgba(167,139,250,.06)',
        border: '1px solid rgba(167,139,250,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 4
      }
    }, label, ": ", (wpn === null || wpn === void 0 ? void 0 : wpn.name) || 'None'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: ((_RARITY_TIERS$wpn$tie = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie === void 0 ? void 0 : _RARITY_TIERS$wpn$tie.color) || '#888'
      }
    }, ((_RARITY_TIERS$wpn$tie2 = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie2 === void 0 ? void 0 : _RARITY_TIERS$wpn$tie2.label) || 'Common', " (", (wpn === null || wpn === void 0 ? void 0 : wpn.tierMult) || 1, "\xD7)"), (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$wpn$element3 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element3 === void 0 ? void 0 : _ELEMENTS$wpn$element3.color
      }
    }, "\u25C6 ", wpn.element1), (wpn === null || wpn === void 0 ? void 0 : wpn.element2) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$wpn$element4 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element4 === void 0 ? void 0 : _ELEMENTS$wpn$element4.color
      }
    }, "\u25C6 ", wpn.element2), (wpn === null || wpn === void 0 ? void 0 : wpn.isVolatile) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ff5e6c',
        fontSize: 8
      }
    }, "\u26A1VOLATILE")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, "Gem slots: ", usedSlots, "/", maxSlots, " used", maxSlots === 0 && ' · Craft slotted gear at the Blacksmith or Woodworker first', (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && !(wpn !== null && wpn !== void 0 && wpn.element2) && maxSlots >= 2 && !canAddSecond && ' · Req Enchanting Lv20 for 2nd slot'), wpn && openSlots > 0 && !wpn.element1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, "Choose a polished gem for Slot 1:"), wpn && wpn.element1 && !wpn.element2 && openSlots > 0 && canAddSecond && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, "Choose a polished gem for Slot 2 (Fusion):"), wpn && openSlots > 0 && (!wpn.element1 || wpn.element1 && !wpn.element2 && canAddSecond) && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap'
      }
    }, Object.entries(ELEMENTS).filter(function (_ref85) {
      var _ref86 = _slicedToArray(_ref85, 1),
        e = _ref86[0];
      return e !== (wpn === null || wpn === void 0 ? void 0 : wpn.element1);
    }).map(function (_ref87) {
      var _rpgState$lifeSkills11;
      var _ref88 = _slicedToArray(_ref87, 2),
        elem = _ref88[0],
        edef = _ref88[1];
      var gems = ((_rpgState$lifeSkills11 = rpgState.lifeSkills) === null || _rpgState$lifeSkills11 === void 0 ? void 0 : _rpgState$lifeSkills11.gems) || {};
      var polKey = 'polished_' + elem;
      var polCount = gems[polKey] || 0;
      if (polCount <= 0) return null;
      /* Check volatile compatibility — only allowed on fusionReady gear */
      var wouldBeVolatile = (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && function () {
        var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
        return volPairs.some(function (_ref89) {
          var _ref90 = _slicedToArray(_ref89, 2),
            a = _ref90[0],
            b = _ref90[1];
          return wpn.element1 === a && elem === b || wpn.element1 === b && elem === a;
        });
      }();
      var blockedVolatile = wouldBeVolatile && !isFusionReady;
      return /*#__PURE__*/React.createElement("button", {
        key: elem,
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          border: '1px solid ' + edef.color + '40',
          background: blockedVolatile ? 'rgba(255,60,60,.1)' : edef.color + '20',
          color: blockedVolatile ? 'rgba(255,255,255,.3)' : edef.color,
          fontSize: 8,
          fontWeight: 700,
          cursor: 'pointer'
        },
        title: blockedVolatile ? 'Volatile combo requires Fusion-Compatible gear base' : '',
        onClick: function onClick() {
          if (blockedVolatile) {
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'Needs Fusion-Compatible gear!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return;
          }
          var R = stateRef.current.rpg;
          var sk = R.lifeSkills;
          sk.gems[polKey]--;
          if (sk.gems[polKey] <= 0) delete sk.gems[polKey];
          var w = R[key];
          if (!w.element1) {
            w.element1 = elem;
            w.tier = 'elemental';
            w.tierMult = 1.5;
            w.name = elem.charAt(0).toUpperCase() + elem.slice(1) + ' ' + WEAPON_TYPES[w.type].label;
          } else if (!w.element2) {
            w.element2 = elem;
            w.tier = 'fusion';
            w.tierMult = 2.25;
            var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
            w.isVolatile = volPairs.some(function (_ref91) {
              var _ref92 = _slicedToArray(_ref91, 2),
                a = _ref92[0],
                b = _ref92[1];
              return w.element1 === a && w.element2 === b || w.element1 === b && w.element2 === a;
            });
            var e1n = w.element1.charAt(0).toUpperCase() + w.element1.slice(1);
            var e2n = elem.charAt(0).toUpperCase() + elem.slice(1);
            w.name = e1n + e2n.toLowerCase() + ' ' + WEAPON_TYPES[w.type].label;
          }
          var leveled = addLifeSkillXp(sk, 'enchanting', w.tier === 'fusion' ? 50 : 25);
          if (!R._questFlags) R._questFlags = {};
          R._questFlags.enchantedWeapon = true;
          R._questFlags.slottedGem = true;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: elem + ' enchanted!',
            color: edef.color,
            ts: Date.now()
          });
          if (leveled) stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 50,
            text: 'Enchanting Lv' + sk.enchanting.level + '!',
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.collect();
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
        }
      }, blockedVolatile ? '⚡' : '◆', " ", elem, " (", polCount, ")");
    })), usedSlots >= maxSlots && maxSlots > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "All gem slots filled"));
  }), rpgState.amulet && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCFF Amulet: ", rpgState.amulet.name, rpgState.amulet.gem && function (_ELEMENTS$rpgState$am) {
    var bonus = getAmuletBonus(rpgState.amulet);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: (_ELEMENTS$rpgState$am = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am === void 0 ? void 0 : _ELEMENTS$rpgState$am.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), rpgState.amulet.gem ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: (_ELEMENTS$rpgState$am2 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am2 === void 0 ? void 0 : _ELEMENTS$rpgState$am2.color
    }
  }, rpgState.amulet.gem, " gem"), ". Slot a new gem to replace (old gem lost).") : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slot a polished gem to activate the amulet."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap'
    }
  }, Object.entries(ELEMENTS).map(function (_ref93) {
    var _rpgState$lifeSkills12;
    var _ref94 = _slicedToArray(_ref93, 2),
      elem = _ref94[0],
      edef = _ref94[1];
    var gems = ((_rpgState$lifeSkills12 = rpgState.lifeSkills) === null || _rpgState$lifeSkills12 === void 0 ? void 0 : _rpgState$lifeSkills12.gems) || {};
    var polKey = 'polished_' + elem;
    var polCount = gems[polKey] || 0;
    if (polCount <= 0) return null;
    var gemStat = AMULET_GEM_STATS[elem];
    if (!gemStat) return null;
    var tierData = AMULET_TIERS[rpgState.amulet.tier];
    var previewVal = Math.round((gemStat.base + gemStat.perPower * ((tierData === null || tierData === void 0 ? void 0 : tierData.basePower) || 1)) * 10) / 10;
    return /*#__PURE__*/React.createElement("button", {
      key: elem,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid ' + edef.color + '40',
        background: edef.color + '20',
        color: edef.color,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _AMULET_TIERS$R$amule;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        if ((sk.gems[polKey] || 0) < 1) return;
        sk.gems[polKey]--;
        R.amulet.gem = elem;
        R.amulet.name = (((_AMULET_TIERS$R$amule = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule === void 0 ? void 0 : _AMULET_TIERS$R$amule.label) || 'Simple') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Amulet';
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.slottedGem = true;
        addLifeSkillXp(sk, 'enchanting', 20);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: gemStat.label + ' +' + previewVal + gemStat.unit,
          color: edef.color,
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E", elem, " (", polCount, ") +", previewVal, gemStat.unit);
  }))), !rpgState.amulet && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 8,
      color: 'rgba(255,255,255,.25)'
    }
  }, "\uD83D\uDCFF Craft an amulet at the Blacksmith to slot gems here."), rpgState.shield && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(91,82,255,.06)',
      border: '1px solid rgba(91,82,255,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDEE1\uFE0F Shield: ", rpgState.shield.name, rpgState.shield.gem && function (_ELEMENTS$rpgState$sh) {
    var bonus = getShieldBonus(rpgState.shield);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: (_ELEMENTS$rpgState$sh = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh === void 0 ? void 0 : _ELEMENTS$rpgState$sh.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), rpgState.shield.gem ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: (_ELEMENTS$rpgState$sh2 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh2 === void 0 ? void 0 : _ELEMENTS$rpgState$sh2.color
    }
  }, rpgState.shield.gem, " gem"), ". Slot new gem to replace.") : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slot a polished gem for defensive power."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap'
    }
  }, Object.entries(ELEMENTS).map(function (_ref95) {
    var _rpgState$lifeSkills13;
    var _ref96 = _slicedToArray(_ref95, 2),
      elem = _ref96[0],
      edef = _ref96[1];
    var gems = ((_rpgState$lifeSkills13 = rpgState.lifeSkills) === null || _rpgState$lifeSkills13 === void 0 ? void 0 : _rpgState$lifeSkills13.gems) || {};
    var polKey = 'polished_' + elem;
    var polCount = gems[polKey] || 0;
    if (polCount <= 0) return null;
    var gemStat = SHIELD_GEM_STATS[elem];
    if (!gemStat) return null;
    var bt = BLACKSMITH_TIERS[rpgState.shield.gearBase];
    var previewVal = Math.round((gemStat.base + gemStat.perPower * ((bt === null || bt === void 0 ? void 0 : bt.tierMult) || 1)) * 10) / 10;
    return /*#__PURE__*/React.createElement("button", {
      key: elem,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid ' + edef.color + '40',
        background: edef.color + '20',
        color: edef.color,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _BLACKSMITH_TIERS$R$s;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        if ((sk.gems[polKey] || 0) < 1) return;
        sk.gems[polKey]--;
        R.shield.gem = elem;
        R.shield.name = (((_BLACKSMITH_TIERS$R$s = BLACKSMITH_TIERS[R.shield.gearBase]) === null || _BLACKSMITH_TIERS$R$s === void 0 ? void 0 : _BLACKSMITH_TIERS$R$s.label) || 'Basic') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Shield';
        recalcDerived(R);
        addLifeSkillXp(sk, 'enchanting', 20);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: gemStat.label + ' +' + previewVal + gemStat.unit,
          color: edef.color,
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E", elem, " (", polCount, ") +", previewVal, gemStat.unit);
  }))), !rpgState.shield && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 8,
      color: 'rgba(255,255,255,.25)'
    }
  }, "\uD83D\uDEE1\uFE0F Forge a shield at the Blacksmith to slot defensive gems here.")), buildingPanel === 'cook' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83C\uDF73 Kitchen"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Cooking Lv", ((_rpgState$lifeSkills14 = rpgState.lifeSkills) === null || _rpgState$lifeSkills14 === void 0 || (_rpgState$lifeSkills14 = _rpgState$lifeSkills14.cooking) === null || _rpgState$lifeSkills14 === void 0 ? void 0 : _rpgState$lifeSkills14.level) || 1, " \xB7 Cook fish for healing. Prepare herb recipes for combat buffs."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#3498DB',
      marginBottom: 4
    }
  }, "\uD83D\uDC1F Cook Fish (Healing)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Raw fish \u2192 Cook (timing minigame) \u2192 Cooked fish you can eat to heal."), cookMinigame && !cookMinigame.result && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(234,88,12,.1)',
      border: '1px solid rgba(234,88,12,.3)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83D\uDD25 Cooking: ", cookMinigame.fishName, " (Heals ", cookMinigame.healAmt, " HP)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Tap COOK when the marker is in the green zone!"), function () {
    var spot = cookMinigame.sweetSpot;
    var barW = 260;
    var greenLeft = (spot.center - spot.width / 2) * barW;
    var greenW = spot.width * barW;
    /* Indicator position oscillates based on time */
    var elapsed = (Date.now() - cookMinigame.started) / 1000;
    var speed = 1.2 + cookMinigame.tier * 0.015; /* faster for harder fish */
    var pos = (Math.sin(elapsed * speed * Math.PI) + 1) / 2; /* 0-1 oscillating */
    var indX = pos * barW;
    var inZone = indX >= greenLeft && indX <= greenLeft + greenW;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: barW,
        height: 24,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 4,
        overflow: 'hidden',
        margin: '0 auto 6px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: greenLeft,
        top: 0,
        width: greenW,
        height: '100%',
        background: 'rgba(61,220,151,.25)',
        borderLeft: '2px solid #3dd497',
        borderRight: '2px solid #3dd497'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: indX - 2,
        top: 0,
        width: 4,
        height: '100%',
        background: inZone ? '#3dd497' : '#ff5e6c',
        borderRadius: 2,
        boxShadow: inZone ? '0 0 8px #3dd497' : '0 0 8px #ff5e6c',
        transition: 'left 0.05s linear'
      }
    })), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 6,
        border: 'none',
        fontSize: 11,
        fontWeight: 800,
        background: inZone ? '#3dd497' : '#ea580c',
        color: '#fff',
        cursor: 'pointer',
        letterSpacing: '.05em'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (inZone) {
          /* SUCCESS — cooked! */
          if (!R.inventory) R.inventory = {};
          var cookedKey = 'cooked_' + cookMinigame.fishKey.replace('fish_', '');
          R.inventory[cookedKey] = (R.inventory[cookedKey] || 0) + 1;
          var leveled = addLifeSkillXp(sk, 'cooking', Math.ceil(cookMinigame.tier * 3));
          if (!R._questFlags) R._questFlags = {};
          R._questFlags.cookedRecipe = true;
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.cookSuccess++;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Cooked ' + cookMinigame.fishName + '!',
            color: '#3dd497',
            ts: Date.now()
          });
          if (leveled) stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 45,
            text: 'Cooking Lv' + sk.cooking.level + '!',
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.collect();
          setCookMinigame(_objectSpread(_objectSpread({}, cookMinigame), {}, {
            result: 'success'
          }));
        } else {
          /* FAIL — burnt! Fish consumed, nothing gained */
          addLifeSkillXp(sk, 'cooking', 1);
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.cookBurns++;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Burnt! Fish wasted.',
            color: '#ff5e6c',
            ts: Date.now()
          });
          BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
          setCookMinigame(_objectSpread(_objectSpread({}, cookMinigame), {}, {
            result: 'burnt'
          }));
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        /* Auto-clear result after 1.5s */
        setTimeout(function () {
          return setCookMinigame(null);
        }, 1500);
      }
    }, "\uD83C\uDF73 COOK!"));
  }()), (cookMinigame === null || cookMinigame === void 0 ? void 0 : cookMinigame.result) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 800,
      background: cookMinigame.result === 'success' ? 'rgba(61,220,151,.15)' : 'rgba(255,94,108,.15)',
      border: cookMinigame.result === 'success' ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,94,108,.3)',
      color: cookMinigame.result === 'success' ? '#3dd497' : '#ff5e6c'
    }
  }, cookMinigame.result === 'success' ? '✅ Perfectly cooked!' : '🔥 Burnt to a crisp!'), !cookMinigame && function () {
    var inv = rpgState.inventory || {};
    var rawFish = Object.entries(inv).filter(function (_ref97) {
      var _ref98 = _slicedToArray(_ref97, 2),
        k = _ref98[0],
        v = _ref98[1];
      return v > 0 && k.startsWith('fish_');
    });
    if (rawFish.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginBottom: 8
      }
    }, "No raw fish. Catch some at fishing spots in combat zones!");
    return rawFish.map(function (_ref99) {
      var _rpgState$lifeSkills15;
      var _ref100 = _slicedToArray(_ref99, 2),
        key = _ref100[0],
        qty = _ref100[1];
      var fishName = key.replace('fish_', '').replace(/_/g, ' ');
      var healAmt = getFishHealAmount(key);
      var tierLvl = getFishTierLevel(key);
      var cookLvl = ((_rpgState$lifeSkills15 = rpgState.lifeSkills) === null || _rpgState$lifeSkills15 === void 0 || (_rpgState$lifeSkills15 = _rpgState$lifeSkills15.cooking) === null || _rpgState$lifeSkills15 === void 0 ? void 0 : _rpgState$lifeSkills15.level) || 1;
      var spot = getCookingSweetSpot(cookLvl, tierLvl);
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          padding: '4px 6px',
          borderRadius: 6,
          background: 'rgba(52,152,219,.06)',
          border: '1px solid rgba(52,152,219,.15)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, "\uD83D\uDC1F"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#3498DB',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, "Heals ", healAmt, " HP \xB7 Sweet spot: ", Math.round(spot.width * 100), "%")), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '3px 8px',
          borderRadius: 5,
          border: 'none',
          fontSize: 8,
          fontWeight: 700,
          background: '#ea580c',
          color: '#fff',
          cursor: 'pointer'
        },
        onClick: function onClick() {
          var _rpgState$lifeSkills16;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          setRpgState(_objectSpread({}, R));
          /* Start minigame — fish is consumed whether you succeed or fail */
          setCookMinigame({
            fishKey: key,
            fishName: fishName,
            healAmt: healAmt,
            tier: tierLvl,
            sweetSpot: getCookingSweetSpot(((_rpgState$lifeSkills16 = rpgState.lifeSkills) === null || _rpgState$lifeSkills16 === void 0 || (_rpgState$lifeSkills16 = _rpgState$lifeSkills16.cooking) === null || _rpgState$lifeSkills16 === void 0 ? void 0 : _rpgState$lifeSkills16.level) || 1, tierLvl),
            started: Date.now(),
            result: null
          });
          BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
        }
      }, "Cook"));
    });
  }(), !cookMinigame && function () {
    var inv = rpgState.inventory || {};
    var cookedFish = Object.entries(inv).filter(function (_ref101) {
      var _ref102 = _slicedToArray(_ref101, 2),
        k = _ref102[0],
        v = _ref102[1];
      return v > 0 && k.startsWith('cooked_');
    });
    if (cookedFish.length === 0) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#3dd497',
        marginTop: 6,
        marginBottom: 4
      }
    }, "\uD83C\uDF7D\uFE0F Cooked Fish (Ready to Eat)"), cookedFish.map(function (_ref103) {
      var _ref104 = _slicedToArray(_ref103, 2),
        key = _ref104[0],
        qty = _ref104[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      var healAmt = getFishHealAmount(key);
      var atFull = rpgState.hp >= rpgState.maxHp;
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          padding: '4px 6px',
          borderRadius: 6,
          background: 'rgba(61,220,151,.06)',
          border: '1px solid rgba(61,220,151,.15)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#3dd497',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, "Heals ", healAmt, " HP")), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '3px 8px',
          borderRadius: 5,
          border: 'none',
          fontSize: 8,
          fontWeight: 700,
          background: atFull ? 'rgba(255,255,255,.08)' : '#3dd497',
          color: atFull ? 'rgba(255,255,255,.3)' : '#000',
          cursor: 'pointer'
        },
        onClick: function onClick() {
          if (atFull) return;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          var S = stateRef.current;
          /* Server-authoritative inventory + HP in MP: send eat_request
             and let the worker validate ownership + apply the heal +
             decrement.  Predict locally for snappy bar + popup feel;
             player_state arrives shortly and reconciles. */
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          var healed = Math.min(healAmt, R.maxHp - R.hp);
          R.hp = Math.min(R.maxHp, R.hp + healAmt);
          if (S._serverMonsters && S.channel) {
            try { S.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
          }
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: '+' + healed + ' HP',
            color: '#3dd497',
            ts: Date.now()
          });
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "Eat"));
    }));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginTop: 10,
      marginBottom: 4
    }
  }, "\uD83C\uDF3F Buff Recipes (Herbs)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Combine farmed herbs into combat buff meals. No timing needed \u2014 just ingredients."), COOKING_RECIPES.map(function (recipe, ri) {
    var _rpgState$lifeSkills17;
    var cookLvl = ((_rpgState$lifeSkills17 = rpgState.lifeSkills) === null || _rpgState$lifeSkills17 === void 0 || (_rpgState$lifeSkills17 = _rpgState$lifeSkills17.cooking) === null || _rpgState$lifeSkills17 === void 0 ? void 0 : _rpgState$lifeSkills17.level) || 1;
    var canCook = cookLvl >= recipe.cookLvl;
    var inv = rpgState.inventory || {};
    var hasIngredients = Object.entries(recipe.ingredients).every(function (_ref105) {
      var _ref106 = _slicedToArray(_ref105, 2),
        type = _ref106[0],
        count = _ref106[1];
      var total = Object.entries(inv).filter(function (_ref107) {
        var _ref108 = _slicedToArray(_ref107, 2),
          k = _ref108[0],
          v = _ref108[1];
        return k.includes(type) && v > 0;
      }).reduce(function (sum, _ref109) {
        var _ref110 = _slicedToArray(_ref109, 2),
          k = _ref110[0],
          v = _ref110[1];
        return sum + v;
      }, 0);
      return total >= count;
    });
    var buffDesc = recipe.desc || (recipe.buff === 'heal' ? "Heals ".concat(recipe.power, " HP") : recipe.buff === 'all' ? "+".concat(Math.round(recipe.power * 100), "% all stats") : recipe.buff === 'regen' ? "+".concat(Math.round(recipe.power * 100), "% regen") : recipe.buff === 'resist' ? "+".concat(Math.round(recipe.power * 100), "% resist") : "+".concat(Math.round(recipe.power * 100), "% ").concat(recipe.buff));
    return /*#__PURE__*/React.createElement("div", {
      key: ri,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCook ? 1 : 0.5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, "\uD83C\uDF72"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canCook ? '#fff' : '#666'
      }
    }, recipe.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "T", recipe.tier)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, buffDesc, recipe.duration ? " \xB7 ".concat(Math.round(recipe.duration / 60), "min") : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Needs: ", Object.entries(recipe.ingredients).map(function (_ref111) {
      var _ref112 = _slicedToArray(_ref111, 2),
        t = _ref112[0],
        c = _ref112[1];
      return c + '× ' + t.replace(/_/g, ' ');
    }).join(', '), !canCook && " \xB7 Req Cooking Lv".concat(recipe.cookLvl))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCook && hasIngredients ? '#ea580c' : 'rgba(255,255,255,.08)',
        color: canCook && hasIngredients ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canCook || !hasIngredients) return;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        var S = stateRef.current;
        /* Server-authoritative cooking recipes in MP: worker mirrors
           COOKING_RECIPES + validates ingredient ownership + applies
           buff/heal to ps + ps._buffs.  Local consume + buff timer
           stay as snappy visual prediction; player_state arrives
           shortly with the authoritative inventory + buff state. */
        if (S._serverMonsters && S.channel) {
          try { S.channel.send({ type: 'cook_recipe', payload: { recipeIdx: ri } }); } catch (e) {}
        }
        /* Consume ingredients */
        Object.entries(recipe.ingredients).forEach(function (_ref113) {
          var _ref114 = _slicedToArray(_ref113, 2),
            type = _ref114[0],
            count = _ref114[1];
          var remaining = count;
          Object.keys(R.inventory || {}).forEach(function (k) {
            if (remaining <= 0 || !k.includes(type)) return;
            var take = Math.min(R.inventory[k], remaining);
            R.inventory[k] -= take;
            remaining -= take;
            if (R.inventory[k] <= 0) delete R.inventory[k];
          });
        });
        /* Apply food buff */
        var dur = (recipe.duration || 0) * 1000;
        if (recipe.buff === 'heal') {
          R.hp = Math.min(R.maxHp, R.hp + recipe.power);
        }
        if (recipe.buff === 'regen') S._regenBuff = Date.now() + dur;
        if (recipe.buff === 'resist') S._resistBuff = Date.now() + dur;
        if (recipe.buff === 'damage') S._dmgBuff = Date.now() + dur;
        if (recipe.buff === 'all') {
          S._dmgBuff = Date.now() + dur;
          S._spdBuff = Date.now() + dur;
          S._hpBuff = Date.now() + dur;
          S._manaBuff = Date.now() + dur;
        }
        /* Cooking XP */
        var leveled = addLifeSkillXp(sk, 'cooking', recipe.tier * 25);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.cookedRecipe = true;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: recipe.name + '!',
          color: '#ea580c',
          ts: Date.now()
        });
        if (leveled) S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 50,
          text: 'Cooking Lv' + sk.cooking.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "Cook"));
  })), buildingPanel === 'farm' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83C\uDF3E Farm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Farming Lv", ((_rpgState$lifeSkills18 = rpgState.lifeSkills) === null || _rpgState$lifeSkills18 === void 0 || (_rpgState$lifeSkills18 = _rpgState$lifeSkills18.farming) === null || _rpgState$lifeSkills18 === void 0 ? void 0 : _rpgState$lifeSkills18.level) || 1, " \xB7 Plant seeds from zones, harvest when grown."), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: '1px solid rgba(61,220,151,.3)',
      background: 'rgba(61,220,151,.1)',
      color: '#3dd497',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer',
      marginBottom: 8
    },
    onClick: function onClick() {
      var S2 = stateRef.current,
        P2 = S2.player;
      S2.currentZone = 'farm_home';
      updateZoneDimensions('farm_home');
      S2.map = generateZoneMap('farm_home');
      S2.monsters = [];
      S2.gatherNodes = [];
      S2.npcs = null;
      var fz = ZONES.farm_home;
      P2.x = Math.floor(fz.w / 2) * TILE;
      P2.y = (fz.h - 4) * TILE;
      S2.groundLoot = [];
      S2.hitParticles = [];
      S2.deathExplosions = [];
      S2.arrows = [];
      S2._ambientParticles = [];
      S2._zoneWipe = Date.now();
      S2.dmgNumbers.push({
        x: P2.x,
        y: P2.y - 40,
        text: 'Your Farm',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
      setBuildingPanel(null);
    }
  }, "\uD83C\uDFE1 Visit Your Farm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Your farm has a house where you can sleep to fully restore HP, Mana, Stamina and gain a 30-min Well Rested buff (+10% XP).", ((_stateRef$current7 = stateRef.current) === null || _stateRef$current7 === void 0 || (_stateRef$current7 = _stateRef$current7.rpg) === null || _stateRef$current7 === void 0 ? void 0 : _stateRef$current7._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#3dd497'
    }
  }, " \xB7 \uD83D\uDE34 Well Rested active!")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 6,
      marginBottom: 8
    }
  }, [0, 1, 2, 3, 4, 5].map(function (plotIdx) {
    var _rpgState$lifeSkills19, _rpgState$lifeSkills20;
    var plot = (_rpgState$lifeSkills19 = rpgState.lifeSkills) === null || _rpgState$lifeSkills19 === void 0 || (_rpgState$lifeSkills19 = _rpgState$lifeSkills19.farmPlots) === null || _rpgState$lifeSkills19 === void 0 ? void 0 : _rpgState$lifeSkills19[plotIdx];
    var isGrowing = plot && plot.plantedAt && Date.now() / 1000 < plot.plantedAt + plot.growTime;
    var isReady = plot && plot.plantedAt && Date.now() / 1000 >= plot.plantedAt + plot.growTime;
    var progress = plot ? Math.min(1, (Date.now() / 1000 - plot.plantedAt) / plot.growTime) : 0;
    var farmLvl = ((_rpgState$lifeSkills20 = rpgState.lifeSkills) === null || _rpgState$lifeSkills20 === void 0 || (_rpgState$lifeSkills20 = _rpgState$lifeSkills20.farming) === null || _rpgState$lifeSkills20 === void 0 ? void 0 : _rpgState$lifeSkills20.level) || 1;
    var plotUnlocked = plotIdx < 2 || plotIdx < 4 && farmLvl >= 10 || farmLvl >= 25;
    return /*#__PURE__*/React.createElement("div", {
      key: plotIdx,
      style: {
        padding: 8,
        borderRadius: 8,
        textAlign: 'center',
        minHeight: 70,
        background: isReady ? 'rgba(61,220,151,.1)' : isGrowing ? 'rgba(245,197,66,.06)' : 'rgba(255,255,255,.03)',
        border: "1px solid ".concat(isReady ? 'rgba(61,220,151,.3)' : isGrowing ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.08)'),
        opacity: plotUnlocked ? 1 : 0.4
      }
    }, !plotUnlocked ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginTop: 16
      }
    }, "\uD83D\uDD12 Farm Lv", plotIdx < 4 ? 10 : 25) : isReady ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18
      }
    }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#3dd497'
      }
    }, "Ready!"), /*#__PURE__*/React.createElement("button", {
      style: {
        marginTop: 4,
        padding: '2px 8px',
        borderRadius: 4,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: '#3dd497',
        color: '#000',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        var p = sk.farmPlots[plotIdx];
        var invKey = (p.rType || 'herb') + '_' + p.name.replace(/\s+/g, '_').toLowerCase();
        if (!R.inventory) R.inventory = {};
        R.inventory[invKey] = (R.inventory[invKey] || 0) + (1 + Math.floor(Math.random() * p.tier));
        addLifeSkillXp(sk, 'farming', p.tier * 20);
        delete sk.farmPlots[plotIdx];
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.harvestedCrop = true;
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Harvested ' + p.name + '!',
          color: '#3dd497',
          ts: Date.now()
        });
      }
    }, "Harvest")) : isGrowing ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14
      }
    }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#f5c542',
        marginTop: 2
      }
    }, plot.name), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 3,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 2,
        marginTop: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: progress * 100 + '%',
        height: '100%',
        background: '#f5c542',
        borderRadius: 2
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 2
      }
    }, Math.ceil((plot.plantedAt + plot.growTime - Date.now() / 1000) / 60), "m left")) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginTop: 16
      }
    }, "Empty plot"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 4
    }
  }, "Plant seeds:"), function () {
    var seeds = [];
    var inv = rpgState.inventory || {};
    Object.entries(ZONE_RESOURCES).forEach(function (_ref115) {
      var _ref116 = _slicedToArray(_ref115, 2),
        elem = _ref116[0],
        res = _ref116[1];
      ['crystal', 'ore', 'herb'].forEach(function (rType) {
        [1, 2, 3, 4, 5].forEach(function (tier) {
          var _RESOURCE_TIERS$tier;
          var tierLabel = ((_RESOURCE_TIERS$tier = RESOURCE_TIERS[tier]) === null || _RESOURCE_TIERS$tier === void 0 ? void 0 : _RESOURCE_TIERS$tier.label) || 'Rough';
          var name = tierLabel + ' ' + res[rType];
          var key = rType + '_' + name.replace(/\s+/g, '_').toLowerCase();
          if ((inv[key] || 0) > 0) {
            seeds.push({
              key: key,
              name: name,
              emoji: rType === 'crystal' ? '💎' : rType === 'ore' ? '⛏️' : '🌿',
              count: inv[key],
              tier: tier,
              elem: elem,
              rType: rType
            });
          }
        });
      });
    });
    if (seeds.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No seeds. Gather resources from zones!");
    return seeds.slice(0, 8).map(function (seed) {
      return /*#__PURE__*/React.createElement("div", {
        key: seed.key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(255,255,255,.03)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12
        }
      }, seed.emoji), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          flex: 1,
          color: 'rgba(255,255,255,.6)'
        }
      }, seed.name, " \xD7", seed.count), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '1px 6px',
          borderRadius: 3,
          border: 'none',
          fontSize: 7,
          fontWeight: 700,
          background: '#3dd497',
          color: '#000',
          cursor: 'pointer'
        },
        onClick: function onClick() {
          var R = stateRef.current.rpg;
          var sk = R.lifeSkills;
          if (!sk.farmPlots) sk.farmPlots = {};
          /* Find empty plot */
          var emptyIdx = [0, 1, 2, 3, 4, 5].find(function (i) {
            var _sk$farming, _sk$farming2;
            return !sk.farmPlots[i] && (i < 2 || i < 4 && ((_sk$farming = sk.farming) === null || _sk$farming === void 0 ? void 0 : _sk$farming.level) >= 10 || ((_sk$farming2 = sk.farming) === null || _sk$farming2 === void 0 ? void 0 : _sk$farming2.level) >= 25);
          });
          if (emptyIdx === undefined) {
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'No empty plots!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return;
          }
          if (!R.inventory) R.inventory = {};
          if ((R.inventory[seed.key] || 0) < 1) return;
          R.inventory[seed.key]--;
          if (R.inventory[seed.key] <= 0) delete R.inventory[seed.key];
          /* Plant! Growth time: tier 1=1min, tier 2=5min, tier 3=15min, tier 4=30min, tier 5=60min */
          var growTimes = [0, 60, 300, 900, 1800, 3600];
          sk.farmPlots[emptyIdx] = {
            name: seed.name,
            emoji: seed.emoji,
            tier: seed.tier,
            element: seed.elem,
            rType: seed.rType,
            plantedAt: Math.floor(Date.now() / 1000),
            growTime: growTimes[seed.tier] || 60
          };
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          BT_AUDIO.beep(400, 0.06, 0.1, 'sine');
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Planted ' + seed.name,
            color: '#3dd497',
            ts: Date.now()
          });
        }
      }, "Plant"));
    });
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginTop: 8,
      lineHeight: 1.5
    }
  }, "Plots unlock at Farming Lv1 (\xD72), Lv10 (\xD74), Lv25 (\xD76). Higher tier resources grow longer but yield more. Deeper zones have rarer resources \u2014 complete dungeons to access them.")), buildingPanel === 'gamble' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFB0 Gambling Den"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "g \xB7 AP: \u2B50", rpgState.achievementPoints || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.06)',
      border: '1px solid rgba(255,94,108,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Double or Nothing"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "40% chance to double your wager. 60% chance to lose it all. House always wins... eventually."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 6,
      flexWrap: 'wrap'
    }
  }, [10, 50, 100, 500, 1000, 5000].filter(function (v) {
    return v <= rpgState.coins;
  }).map(function (amt) {
    return /*#__PURE__*/React.createElement("button", {
      key: amt,
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        background: stateRef.current._gambleWager === amt ? 'rgba(255,94,108,.3)' : 'rgba(255,255,255,.06)',
        border: stateRef.current._gambleWager === amt ? '1px solid rgba(255,94,108,.5)' : '1px solid rgba(255,255,255,.08)',
        color: stateRef.current._gambleWager === amt ? '#ff5e6c' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._gambleWager = amt;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, amt, "g");
  })), stateRef.current._gambleResult && Date.now() - stateRef.current._gambleResult.ts < 3000 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 6,
      borderRadius: 6,
      marginBottom: 6,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 900,
      background: stateRef.current._gambleResult.won ? 'rgba(61,220,151,.15)' : 'rgba(255,94,108,.15)',
      border: stateRef.current._gambleResult.won ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,94,108,.3)',
      color: stateRef.current._gambleResult.won ? '#3dd497' : '#ff5e6c'
    }
  }, stateRef.current._gambleResult.won ? '🎉 WON! +' + stateRef.current._gambleResult.amount + 'g' : '💸 LOST! -' + stateRef.current._gambleResult.amount + 'g'), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      border: 'none',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '.03em',
      cursor: 'pointer',
      background: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? '#ff5e6c' : 'rgba(255,255,255,.08)',
      color: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? '#fff' : 'rgba(255,255,255,.3)'
    },
    onClick: function onClick() {
      var wager = stateRef.current._gambleWager;
      if (!wager || wager < GAMBLE_MIN_BET) return;
      var R = stateRef.current.rpg;
      if (R.coins < wager) return;
      if (!R._compStats) R._compStats = createDefaultCompStats();
      R.coins -= wager;
      R._compStats.totalGambled += wager;
      R._compStats.totalGoldSpent += wager;
      var won = Math.random() < GAMBLE_WIN_CHANCE;
      if (won) {
        var winnings = wager * 2;
        R.coins += winnings;
        R._compStats.totalGambleWon += winnings;
        R._compStats.totalGoldEarned += winnings;
        stateRef.current._gambleResult = {
          won: true,
          amount: winnings,
          ts: Date.now()
        };
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: '+' + winnings + 'g!',
          color: '#3dd497',
          ts: Date.now()
        });
        stateRef.current.screenShake = 3;
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
        }, 100);
      } else {
        R._compStats.totalGambleLost += wager;
        stateRef.current._gambleResult = {
          won: false,
          amount: wager,
          ts: Date.now()
        };
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: '-' + wager + 'g',
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
      }
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "\uD83C\uDFB2 ROLL! (", stateRef.current._gambleWager || '—', "g)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFC6 Weekly Jackpot"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Server-wide pool. All deposits collected. One random winner each week. 10% house cut."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: '#f5c542',
      textAlign: 'center',
      marginBottom: 6
    }
  }, "\uD83C\uDFC6 ", stateRef.current._jackpotPool || '???', "g"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      textAlign: 'center',
      marginBottom: 6
    }
  }, "Your deposits this week: ", ((_rpgState$_compStats = rpgState._compStats) === null || _rpgState$_compStats === void 0 ? void 0 : _rpgState$_compStats.jackpotDeposited) || 0, "g \xB7 Min deposit: ", JACKPOT_MIN_DEPOSIT, "g"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, [50, 100, 500, 1000].filter(function (v) {
    return v <= rpgState.coins;
  }).map(function (amt) {
    return /*#__PURE__*/React.createElement("button", {
      key: amt,
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(245,197,66,.3)',
        background: 'rgba(245,197,66,.1)',
        color: '#f5c542'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.coins < amt) return;
        R.coins -= amt;
        if (!R._compStats) R._compStats = createDefaultCompStats();
        R._compStats.jackpotDeposited += amt;
        R._compStats.totalGoldSpent += amt;
        /* In production this would be a Supabase RPC call to add to server pool */
        stateRef.current._jackpotPool = (stateRef.current._jackpotPool || 0) + amt;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Deposited ' + amt + 'g to jackpot',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, amt, "g");
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#8890b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCCA Gambling Stats"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total wagered:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats2 = rpgState._compStats) === null || _rpgState$_compStats2 === void 0 ? void 0 : _rpgState$_compStats2.totalGambled) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total won:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#3dd497',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats3 = rpgState._compStats) === null || _rpgState$_compStats3 === void 0 ? void 0 : _rpgState$_compStats3.totalGambleWon) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total lost:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ff5e6c',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats4 = rpgState._compStats) === null || _rpgState$_compStats4 === void 0 ? void 0 : _rpgState$_compStats4.totalGambleLost) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Net:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: (((_rpgState$_compStats5 = rpgState._compStats) === null || _rpgState$_compStats5 === void 0 ? void 0 : _rpgState$_compStats5.totalGambleWon) || 0) - (((_rpgState$_compStats6 = rpgState._compStats) === null || _rpgState$_compStats6 === void 0 ? void 0 : _rpgState$_compStats6.totalGambleLost) || 0) >= 0 ? '#3dd497' : '#ff5e6c',
      textAlign: 'right'
    }
  }, (((_rpgState$_compStats7 = rpgState._compStats) === null || _rpgState$_compStats7 === void 0 ? void 0 : _rpgState$_compStats7.totalGambleWon) || 0) - (((_rpgState$_compStats8 = rpgState._compStats) === null || _rpgState$_compStats8 === void 0 ? void 0 : _rpgState$_compStats8.totalGambleLost) || 0), "g")))), buildingPanel === 'party' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 2
    }
  }, "\uD83C\uDFDF\uFE0F Gladiator Arena"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G \xB7 Entry fee: ", ARENA_ENTRY_FEE, "G \xB7 10 rounds \xB7 Single elimination \xB7 No healing"), function () {
    var S = stateRef.current;
    /* Poll arena status periodically */
    if (!S._arenaLastPoll || Date.now() - S._arenaLastPoll > ARENA_POLL_INTERVAL) {
      S._arenaLastPoll = Date.now();
      fetch(BT_API_BASE + '/api/arena/status?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) {
          setArenaStatus(d);
          if (d.tournament) setArenaTournament(d.tournament);
        }
      }).catch(function () {});
      fetch(BT_API_BASE + '/api/arena/tournament').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok && d.tournament) setArenaTournament(d.tournament);
      }).catch(function () {});
    }
    return null;
  }(), (!arenaStatus || arenaStatus.status === 'none') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8,
      lineHeight: 1.5
    }
  }, "Enter the arena for a 10-round single elimination tournament. Blind matchups \u2014 any level can face any level. No food or healing allowed. Only the final victor earns the Gladiator title and ", ARENA_CHAMPION_REWARD.ap, " AP!"), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
      var S, R, res, data, _t7;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.p = _context8.n) {
          case 0:
            S = stateRef.current, R = S.rpg;
            if (!(!R || R.coins < ARENA_ENTRY_FEE)) {
              _context8.n = 1;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Need ' + ARENA_ENTRY_FEE + 'G!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context8.a(2);
          case 1:
            R.coins -= ARENA_ENTRY_FEE;
            if (R._compStats) R._compStats.totalGoldSpent += ARENA_ENTRY_FEE;
            _context8.p = 2;
            _context8.n = 3;
            return fetch(BT_API_BASE + '/api/arena/join', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId,
                name: S.myName,
                level: R.level,
                color: S.myColor
              })
            });
          case 3:
            res = _context8.v;
            _context8.n = 4;
            return res.json();
          case 4:
            data = _context8.v;
            if (data.ok) {
              _context8.n = 5;
              break;
            }
            R.coins += ARENA_ENTRY_FEE;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: data.error || 'Failed',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context8.a(2);
          case 5:
            setArenaStatus({
              ok: true,
              status: 'queued',
              position: data.queuePosition || 1,
              queueSize: data.queueSize || 1
            });
            if (data.started && data.tournament) setArenaTournament(data.tournament);
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Entered arena queue!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            _context8.n = 7;
            break;
          case 6:
            _context8.p = 6;
            _t7 = _context8.v;
            R.coins += ARENA_ENTRY_FEE;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Server error',
              color: '#ff5e6c',
              ts: Date.now()
            });
          case 7:
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (_unused31) {}
          case 8:
            return _context8.a(2);
        }
      }, _callee8, null, [[2, 6]]);
    })),
    style: {
      width: '100%',
      padding: '10px 0',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 800,
      border: '2px solid rgba(255,94,108,.5)',
      background: 'rgba(255,94,108,.15)',
      color: '#ff5e6c',
      cursor: 'pointer',
      marginBottom: 8
    }
  }, "\uD83C\uDFDF\uFE0F Enter Arena (", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'queued' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(245,197,66,.08)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\u23F3 In Queue"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Position: ", arenaStatus.position, "/", arenaStatus.queueSize, " \xB7 Waiting for ", arenaStatus.queueSize < 4 ? '4' : '16', " players..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginTop: 4
    }
  }, "You can close this panel \u2014 you'll be notified when matched!"), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var S, _t8;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.p = _context9.n) {
          case 0:
            S = stateRef.current;
            _context9.p = 1;
            _context9.n = 2;
            return fetch(BT_API_BASE + '/api/arena/leave', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId
              })
            });
          case 2:
            S.rpg.coins += ARENA_ENTRY_FEE; /* refund */
            setArenaStatus({
              ok: true,
              status: 'none'
            });
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Left arena queue (+' + ARENA_ENTRY_FEE + 'G)',
              color: 'rgba(255,255,255,.5)',
              ts: Date.now()
            });
            setRpgState(_objectSpread({}, S.rpg));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
            } catch (_unused32) {}
            _context9.n = 4;
            break;
          case 3:
            _context9.p = 3;
            _t8 = _context9.v;
          case 4:
            return _context9.a(2);
        }
      }, _callee9, null, [[1, 3]]);
    })),
    style: {
      marginTop: 6,
      padding: '4px 12px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 700,
      border: '1px solid rgba(255,94,108,.2)',
      background: 'rgba(255,94,108,.08)',
      color: '#ff5e6c',
      cursor: 'pointer'
    }
  }, "Leave Queue (refund ", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'fighting' && arenaStatus.currentMatch && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(255,94,108,.1)',
      border: '2px solid rgba(255,94,108,.4)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 900,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u2694\uFE0F FIGHT! Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 16,
      background: arenaStatus.currentMatch.p1Color || '#5b52ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 900,
      color: '#fff',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM = arenaStatus.currentMatch.p1Name) === null || _arenaStatus$currentM === void 0 ? void 0 : _arenaStatus$currentM.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#fff',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p1Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Lv", arenaStatus.currentMatch.p1Level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: 'rgba(255,255,255,.3)'
    }
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 16,
      background: arenaStatus.currentMatch.p2Color || '#ff5e6c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 900,
      color: '#fff',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM2 = arenaStatus.currentMatch.p2Name) === null || _arenaStatus$currentM2 === void 0 ? void 0 : _arenaStatus$currentM2.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#fff',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p2Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Lv", arenaStatus.currentMatch.p2Level))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginTop: 6
    }
  }, "Find and defeat your opponent! PvP in any zone counts."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginTop: 4
    }
  }, "If opponent doesn't show within 2 min, win is auto-awarded.")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: 'rgba(255,255,255,.5)'
    }
  }, "Eliminated \u2014 Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginTop: 2
    }
  }, arenaStatus.wins, " wins \xB7 You can spectate the rest!")), arenaTournament && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFDF\uFE0F Tournament \u2014 Round ", arenaTournament.round, "/", arenaTournament.maxRounds, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginLeft: 4
    }
  }, arenaTournament.remaining, "/", arenaTournament.playerCount, " remaining")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.map(function (p) {
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: p.eliminated ? 'rgba(255,255,255,.01)' : 'rgba(61,212,151,.08)',
        border: '1px solid ' + (p.eliminated ? 'rgba(255,255,255,.04)' : 'rgba(61,212,151,.2)'),
        color: p.eliminated ? 'rgba(255,255,255,.15)' : p.color || '#fff',
        textDecoration: p.eliminated ? 'line-through' : 'none',
        opacity: p.eliminated ? 0.4 : 1
      }
    }, p.eliminated ? '💀' : '⚔️', " ", p.name, " ", p.wins > 0 && '(' + p.wins + 'W)');
  })), arenaTournament.currentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Current Matches"), arenaTournament.currentMatches.map(function (m) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 6px',
        borderRadius: 4,
        background: m.resolved ? 'rgba(255,255,255,.02)' : 'rgba(255,94,108,.05)',
        border: '1px solid ' + (m.resolved ? 'rgba(255,255,255,.04)' : 'rgba(255,94,108,.15)'),
        marginBottom: 2,
        fontSize: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p1Color || '#5b52ff',
        fontWeight: 700
      }
    }, m.p1Name), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, "vs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p2Color || '#ff5e6c',
        fontWeight: 700
      }
    }, m.p2Name), m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 7,
        color: '#3dd497'
      }
    }, "Winner: ", m.winnerId === m.p1 ? m.p1Name : m.p2Name), !m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 7,
        color: '#f5c542'
      }
    }, "\u2694\uFE0F Fighting"));
  })), arenaTournament.status === 'complete' && arenaTournament.champion && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 8,
      background: 'rgba(245,197,66,.1)',
      border: '2px solid rgba(245,197,66,.4)',
      textAlign: 'center',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, "\uD83C\uDFC6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: '#f5c542'
    }
  }, "GLADIATOR CHAMPION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: '#fff',
      marginTop: 2
    }
  }, arenaTournament.champion.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, arenaTournament.champion.wins, " wins \xB7 Lv", arenaTournament.champion.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#f5c542',
      marginTop: 4
    }
  }, "+", ARENA_CHAMPION_REWARD.gold, "G +", ARENA_CHAMPION_REWARD.ap, "AP + \"Gladiator\" title")), arenaTournament.recentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginTop: 6,
      marginBottom: 2
    }
  }, "Recent Results"), arenaTournament.recentMatches.slice(-5).reverse().map(function (m, i) {
    var _arenaTournament$play, _arenaTournament$play2;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        padding: '1px 0'
      }
    }, "R", m.round, ": ", m.winnerId === m.p1 ? '✅' : '❌', " ", ((_arenaTournament$play = arenaTournament.players.find(function (p) {
      return p.id === m.p1;
    })) === null || _arenaTournament$play === void 0 ? void 0 : _arenaTournament$play.name) || '?', " vs ", ((_arenaTournament$play2 = arenaTournament.players.find(function (p) {
      return p.id === m.p2;
    })) === null || _arenaTournament$play2 === void 0 ? void 0 : _arenaTournament$play2.name) || '?', " ", m.winnerId === m.p2 ? '✅' : '❌');
  }))), arenaTournament && arenaTournament.status === 'active' && (!arenaStatus || arenaStatus.status === 'none' || arenaStatus.status === 'eliminated') && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.05)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Bet on who wins the tournament. Blind \u2014 you can't see others' bets. Winner takes the pot!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Bet on:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    var sel = arenaBetTarget === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return setArenaBetTarget(sel ? null : p.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
        color: sel ? '#f5c542' : p.color || 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, p.name, " (Lv", p.level, ")");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Amount:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 70,
      padding: '3px 6px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 11,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "G (\uD83D\uDCB0", rpgState.coins, ")")), /*#__PURE__*/React.createElement("button", {
    disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
    onClick: function onClick() {
      var _arenaTournament$play3;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        amount: arenaBetAmount,
        targetPlayerId: arenaBetTarget,
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      if (!R._arenaBets) R._arenaBets = [];
      R._arenaBets.push(bet);
      setArenaBets([].concat(_toConsumableArray(arenaBets), [bet]));
      /* Track for achievements */
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      var targetName = ((_arenaTournament$play3 = arenaTournament.players.find(function (p) {
        return p.id === arenaBetTarget;
      })) === null || _arenaTournament$play3 === void 0 ? void 0 : _arenaTournament$play3.name) || '???';
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + targetName + '!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused34) {}
      /* Broadcast bet (server can validate later) */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
    },
    style: {
      width: '100%',
      padding: '6px 0',
      borderRadius: 5,
      fontSize: 10,
      fontWeight: 800,
      border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
      background: arenaBetTarget ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
      color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
      cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
    }
  }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Your Bets:"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    var target = arenaTournament.players.find(function (p) {
      return p.id === b.targetPlayerId;
    });
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.amount, "G on ", (target === null || target === void 0 ? void 0 : target.name) || '???', " ", target !== null && target !== void 0 && target.eliminated ? '💀 (eliminated)' : '⚔️');
  }))), arenaTournament && arenaTournament.status === 'active' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Place a Bet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Blind bet on who wins the tournament. Payout: pot split among winners. Min ", ARENA_BET_MIN, "G, Max ", ARENA_BET_MAX, "G."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Pick a Fighter"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    var sel = arenaBetTarget === p.id;
    var isMe = p.id === stateRef.current.myId;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return !isMe && setArenaBetTarget(sel ? null : p.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
        color: sel ? '#f5c542' : isMe ? 'rgba(255,255,255,.15)' : p.color || 'rgba(255,255,255,.4)',
        cursor: isMe ? 'not-allowed' : 'pointer',
        opacity: isMe ? 0.3 : 1
      }
    }, p.name, " ", p.wins > 0 && '(' + p.wins + 'W)', isMe && ' (you)');
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Bet:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 60,
      padding: '3px 6px',
      borderRadius: 4,
      border: '1px solid rgba(245,197,66,.3)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 10,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginLeft: 'auto'
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G")), /*#__PURE__*/React.createElement("button", {
    disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
    onClick: function onClick() {
      var _arenaTournament$play4;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
      /* Check not already bet on this tournament */
      if (arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      })) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Already bet on this tournament!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        playerName: S.myName,
        targetPlayerId: arenaBetTarget,
        targetName: ((_arenaTournament$play4 = arenaTournament.players.find(function (p) {
          return p.id === arenaBetTarget;
        })) === null || _arenaTournament$play4 === void 0 ? void 0 : _arenaTournament$play4.name) || '???',
        amount: arenaBetAmount,
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      setArenaBets(function (prev) {
        return [].concat(_toConsumableArray(prev), [bet]);
      });
      /* Broadcast bet to others */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName + '!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused35) {}
    },
    style: {
      width: '100%',
      padding: '6px 0',
      borderRadius: 5,
      fontSize: 9,
      fontWeight: 800,
      border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
      background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
      color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
      cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
    }
  }, "\uD83C\uDFB2 Place Bet ", arenaBetTarget ? '(' + arenaBetAmount + 'G on ' + (((_arenaTournament$play5 = arenaTournament.players.find(function (p) {
    return p.id === arenaBetTarget;
  })) === null || _arenaTournament$play5 === void 0 ? void 0 : _arenaTournament$play5.name) || '???') + ')' : ''), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.playerName, " bet ", b.amount, "G on ", b.targetName);
  }))), (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.status) === 'complete' && arenaBets.length > 0 && function (_arenaTournament$cham) {
    var S = stateRef.current;
    if (S._betsResolved === arenaTournament.id) return null;
    S._betsResolved = arenaTournament.id;
    var myBets = arenaBets.filter(function (b) {
      return b.playerId === S.myId && b.tournamentId === arenaTournament.id;
    });
    var allBets = arenaBets.filter(function (b) {
      return b.tournamentId === arenaTournament.id;
    });
    var totalPot = allBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0);
    var winnerId = (_arenaTournament$cham = arenaTournament.champion) === null || _arenaTournament$cham === void 0 ? void 0 : _arenaTournament$cham.id;
    var winningBets = allBets.filter(function (b) {
      return b.targetPlayerId === winnerId;
    });
    var winningTotal = winningBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0);
    myBets.forEach(function (bet) {
      if (bet.targetPlayerId === winnerId && winningTotal > 0) {
        var payout = Math.floor(totalPot * (bet.amount / winningTotal));
        S.rpg.coins += payout;
        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
        if (!S.stats._betsWon) S.stats._betsWon = 0;
        S.stats._betsWon++;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet WON! +' + payout + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
      } else {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet lost (-' + bet.amount + 'G)',
          color: '#ff5e6c',
          ts: Date.now()
        });
      }
    });
    if (myBets.length > 0) {
      setRpgState(_objectSpread({}, S.rpg));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
      } catch (_unused36) {}
    }
    return null;
  }(), arenaTournament && arenaTournament.status === 'active' && (!arenaStatus || arenaStatus.status === 'none' || arenaStatus.status === 'eliminated') && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      padding: 8,
      borderRadius: 6,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Bet blind on who wins! Gold paid out proportionally if your pick wins the tournament."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Pick Winner"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 4
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return setArenaBetTarget(p.id);
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget === p.id ? '#f5c542' : p.color || 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, p.name, " (Lv", p.level, ")");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Amount:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 60,
      padding: '3px 5px',
      borderRadius: 3,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 10,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)'
    }
  }, "G (\uD83D\uDCB0", rpgState.coins, ")")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _arenaTournament$play6;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Pick a player!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      if (R.coins < arenaBetAmount) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Not enough gold!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      /* Check if already bet on this tournament */
      if (arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      })) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Already placed a bet!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        amount: arenaBetAmount,
        targetPlayerId: arenaBetTarget,
        targetName: ((_arenaTournament$play6 = arenaTournament.players.find(function (p) {
          return p.id === arenaBetTarget;
        })) === null || _arenaTournament$play6 === void 0 ? void 0 : _arenaTournament$play6.name) || '???',
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      setArenaBets(function (prev) {
        return [].concat(_toConsumableArray(prev), [bet]);
      });
      /* Broadcast bet to other spectators */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
      /* Track stats */
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName,
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused37) {}
    },
    style: {
      width: '100%',
      padding: '5px 0',
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 800,
      border: '1px solid rgba(245,197,66,.3)',
      background: 'rgba(245,197,66,.1)',
      color: '#f5c542',
      cursor: 'pointer'
    }
  }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.playerId === stateRef.current.myId ? 'You' : b.playerId.slice(0, 4), " \u2192 ", b.targetName, ": ", b.amount, "G");
  }))), arenaTournament && arenaTournament.status === 'complete' && arenaTournament.champion && function () {
    var S = stateRef.current;
    /* Check if we have a winning bet */
    if (!S._betPayoutChecked || S._betPayoutChecked !== arenaTournament.id) {
      S._betPayoutChecked = arenaTournament.id;
      var myBet = arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      });
      if (myBet && myBet.targetPlayerId === arenaTournament.champion.id) {
        /* Winner! Payout 2x */
        var payout = myBet.amount * 2;
        S.rpg.coins += payout;
        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
        if (!S.stats._betsWon) S.stats._betsWon = 0;
        S.stats._betsWon++;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'BET WON! +' + payout + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, S.rpg));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
        } catch (_unused38) {}
      } else if (myBet) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet lost (-' + myBet.amount + 'G)',
          color: '#ff5e6c',
          ts: Date.now()
        });
      }
    }
    return null;
  }(), arenaTournament && arenaTournament.status === 'active' && ((arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'none' || (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated') && function (_remaining$find) {
    var S = stateRef.current;
    var remaining = arenaTournament.players.filter(function (p) {
      return !p.eliminated;
    });
    var myBet = arenaBets.find(function (b) {
      return b.round === arenaTournament.round;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(245,197,66,.06)',
        border: '1px solid rgba(245,197,66,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#f5c542',
        marginBottom: 4
      }
    }, "\uD83C\uDFB2 Spectator Betting"), myBet ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Bet placed: ", myBet.amount, "G on ", ((_remaining$find = remaining.find(function (p) {
      return p.id === myBet.targetPlayerId;
    })) === null || _remaining$find === void 0 ? void 0 : _remaining$find.name) || '???', /*#__PURE__*/React.createElement("br", null), "Round ", arenaTournament.round, " \u2014 waiting for results...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, "Blind bet \u2014 pick who you think will win this round. ", remaining.length, " players left."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, remaining.map(function (p) {
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return setArenaBetTarget(arenaBetTarget === p.id ? null : p.id);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
          background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
          color: arenaBetTarget === p.id ? '#f5c542' : p.color || '#fff',
          cursor: 'pointer'
        }
      }, p.name, " (Lv", p.level, ")");
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, "Bet:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: ARENA_BET_MIN,
      max: Math.min(ARENA_BET_MAX, rpgState.coins),
      value: arenaBetAmount,
      onChange: function onChange(e) {
        return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
      },
      style: {
        width: 60,
        padding: '3px 5px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#f5c542',
        fontSize: 10,
        fontWeight: 800,
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "G (max ", Math.min(ARENA_BET_MAX, rpgState.coins), ")")), /*#__PURE__*/React.createElement("button", {
      disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
      onClick: function onClick() {
        var _remaining$find2;
        var S2 = stateRef.current,
          R = S2.rpg;
        if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
        R.coins -= arenaBetAmount;
        if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
        var bet = {
          playerId: S2.myId,
          amount: arenaBetAmount,
          targetPlayerId: arenaBetTarget,
          round: arenaTournament.round,
          ts: Date.now()
        };
        setArenaBets(function (prev) {
          return [].concat(_toConsumableArray(prev), [bet]);
        });
        if (!S2.stats._betsMade) S2.stats._betsMade = 0;
        S2.stats._betsMade++;
        S2.dmgNumbers.push({
          x: S2.player.x,
          y: S2.player.y - 30,
          text: 'Bet ' + arenaBetAmount + 'G on ' + ((_remaining$find2 = remaining.find(function (p) {
            return p.id === arenaBetTarget;
          })) === null || _remaining$find2 === void 0 ? void 0 : _remaining$find2.name),
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.05, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused39) {}
      },
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
        background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
        cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet")));
  }(), function () {
    var S = stateRef.current;
    if (arenaTournament && arenaBets.length > 0) {
      var lastBet = arenaBets[arenaBets.length - 1];
      /* Check if the round the bet was for has completed */
      if (lastBet.round < arenaTournament.round || arenaTournament.status === 'complete') {
        var _arenaTournament$rece;
        var betRound = lastBet.round;
        var matchResult = (_arenaTournament$rece = arenaTournament.recentMatches) === null || _arenaTournament$rece === void 0 ? void 0 : _arenaTournament$rece.find(function (m) {
          return m.round === betRound && (m.p1 === lastBet.targetPlayerId || m.p2 === lastBet.targetPlayerId);
        });
        if (matchResult && !lastBet._resolved) {
          lastBet._resolved = true;
          var won = matchResult.winnerId === lastBet.targetPlayerId;
          if (won) {
            var payout = Math.ceil(lastBet.amount * 1.8); /* 1.8x payout */
            S.rpg.coins += payout;
            if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
            if (!S.stats._betsWon) S.stats._betsWon = 0;
            S.stats._betsWon++;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 50,
              text: 'BET WON! +' + payout + 'G',
              color: '#3dd497',
              ts: Date.now()
            });
            BT_AUDIO.collect();
          } else {
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 50,
              text: 'Bet lost (-' + lastBet.amount + 'G)',
              color: '#ff5e6c',
              ts: Date.now()
            });
          }
          setRpgState(_objectSpread({}, S.rpg));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
          } catch (_unused40) {}
        }
      }
    }
    return null;
  }(), function () {
    var S = stateRef.current;
    if (!S._arenaHistoryLoaded) {
      S._arenaHistoryLoaded = true;
      fetch(BT_API_BASE + '/api/arena/history').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setArenaHistory(d.champions || []);
      }).catch(function () {});
    }
    return arenaHistory.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "\uD83C\uDFC6 Hall of Fame"), arenaHistory.slice(0, 10).map(function (c, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(245,197,66,.04)',
          border: '1px solid rgba(245,197,66,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10
        }
      }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          color: '#f5c542'
        }
      }, c.championName), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          marginLeft: 'auto'
        }
      }, c.wins, "W \xB7 ", c.totalPlayers, "P"));
    })) : null;
  }(), arenaTournament && arenaTournament.status === 'active' && function () {
    var S = stateRef.current;
    var myPlayer = arenaTournament.players.find(function (p) {
      return p.id === S.myId;
    });
    var isSpectator = !myPlayer || myPlayer.eliminated;
    var activePlayers = arenaTournament.players.filter(function (p) {
      return !p.eliminated;
    });
    var myBets = arenaBets.filter(function (b) {
      return b.bettorId === S.myId;
    });
    if (!isSpectator && !(myPlayer !== null && myPlayer !== void 0 && myPlayer.eliminated)) return null; /* can't bet while fighting */

    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(245,197,66,.05)',
        border: '1px solid rgba(245,197,66,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#f5c542',
        marginBottom: 4
      }
    }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "Blind bet on who wins the tournament. Payout: pot \xF7 winners. \uD83D\uDCB0 ", rpgState.coins, "G"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 2
      }
    }, "Bet on Champion"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, activePlayers.map(function (p) {
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return setArenaBetTarget(p.id);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
          background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
          color: arenaBetTarget === p.id ? '#f5c542' : p.color || 'rgba(255,255,255,.4)',
          cursor: 'pointer'
        }
      }, p.name, " (Lv", p.level, ")");
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Amount:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: ARENA_BET_MIN,
      max: Math.min(ARENA_BET_MAX, rpgState.coins),
      value: arenaBetAmount,
      onChange: function onChange(e) {
        return setArenaBetAmount(Math.max(ARENA_BET_MIN, +e.target.value || ARENA_BET_MIN));
      },
      style: {
        width: 60,
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#f5c542',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: 'Source Sans 3,sans-serif',
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)'
      }
    }, "G"), [50, 100, 500].map(function (v) {
      return /*#__PURE__*/React.createElement("button", {
        key: v,
        onClick: function onClick() {
          return setArenaBetAmount(Math.min(v, rpgState.coins));
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(255,255,255,.03)',
          color: 'rgba(255,255,255,.3)',
          cursor: 'pointer'
        }
      }, v, "G");
    })), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        var _activePlayers$find;
        var R = stateRef.current.rpg;
        if (!R || !arenaBetTarget) return;
        var amt = Math.min(arenaBetAmount, R.coins, ARENA_BET_MAX);
        if (amt < ARENA_BET_MIN) {
          stateRef.current.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Min bet ' + ARENA_BET_MIN + 'G',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (R.coins < amt) {
          stateRef.current.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Not enough gold!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= amt;
        if (R._compStats) R._compStats.totalGoldSpent += amt;
        var bet = {
          bettorId: S.myId,
          targetPlayerId: arenaBetTarget,
          targetName: ((_activePlayers$find = activePlayers.find(function (p) {
            return p.id === arenaBetTarget;
          })) === null || _activePlayers$find === void 0 ? void 0 : _activePlayers$find.name) || '???',
          amount: amt,
          tournamentId: arenaTournament.id,
          ts: Date.now()
        };
        setArenaBets(function (prev) {
          return [].concat(_toConsumableArray(prev), [bet]);
        });
        /* Persist bet for payout logic */
        if (!R._arenaBets) R._arenaBets = [];
        R._arenaBets.push(bet);
        if (!stateRef.current.stats._betsMade) stateRef.current.stats._betsMade = 0;
        stateRef.current.stats._betsMade++;
        /* Broadcast bet (for pot tracking) */
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'arena_bet',
          payload: bet
        });
        stateRef.current.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Bet ' + amt + 'G on ' + bet.targetName,
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused41) {}
      },
      disabled: !arenaBetTarget,
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
        background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
        cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), myBets.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginTop: 6,
        marginBottom: 2
      }
    }, "Your Bets"), myBets.map(function (b, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 8,
          color: 'rgba(255,255,255,.4)',
          padding: '2px 0'
        }
      }, b.amount, "G on ", b.targetName);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        marginTop: 2
      }
    }, "Total wagered: ", myBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0), "G")));
  }()), buildingPanel === 'exchange' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#5b52ff',
      marginBottom: 2
    }
  }, "\uD83C\uDFEA Marketplace"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G \xB7 Cross-room buy & sell \xB7 Orders expire in 1hr"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 8,
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['buy', '🛒 Want to Buy'], ['sell', '💰 Want to Sell'], ['orders', '📋 My Orders']].map(function (_ref119) {
    var _ref120 = _slicedToArray(_ref119, 2),
      id = _ref120[0],
      label = _ref120[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setMktMode(id);
      },
      style: {
        flex: 1,
        padding: '5px 2px',
        fontSize: 8,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: mktMode === id ? 'rgba(91,82,255,.2)' : 'rgba(255,255,255,.03)',
        color: mktMode === id ? '#8880ff' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
      }
    }, label);
  })), mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 6
    }
  }, Object.entries(MKT_CATEGORIES).map(function (_ref121) {
    var _ref122 = _slicedToArray(_ref121, 2),
      k = _ref122[0],
      c = _ref122[1];
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: function onClick() {
        setMktCategory(k);
        setMktSubtype(c.subtypes[0]);
      },
      style: {
        flex: 1,
        padding: '4px 2px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1px solid ' + (mktCategory === k ? 'rgba(91,82,255,.4)' : 'rgba(255,255,255,.08)'),
        background: mktCategory === k ? 'rgba(91,82,255,.12)' : 'rgba(255,255,255,.02)',
        color: mktCategory === k ? '#a0a0ff' : 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, c.icon, " ", c.label);
  })), ((_MKT_CATEGORIES$mktCa = MKT_CATEGORIES[mktCategory]) === null || _MKT_CATEGORIES$mktCa === void 0 ? void 0 : _MKT_CATEGORIES$mktCa.subtypes.length) > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 6
    }
  }, MKT_CATEGORIES[mktCategory].subtypes.map(function (st) {
    var _WEAPON_TYPES$st, _WEAPON_TYPES$st2;
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: function onClick() {
        return setMktSubtype(st);
      },
      style: {
        flex: 1,
        padding: '3px 2px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 600,
        border: '1px solid ' + (mktSubtype === st ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
        background: mktSubtype === st ? 'rgba(91,82,255,.1)' : 'transparent',
        color: mktSubtype === st ? '#c0c0ff' : 'rgba(255,255,255,.35)',
        cursor: 'pointer'
      }
    }, ((_WEAPON_TYPES$st = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st === void 0 ? void 0 : _WEAPON_TYPES$st.emoji) || '🛡️', " ", ((_WEAPON_TYPES$st2 = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st2 === void 0 ? void 0 : _WEAPON_TYPES$st2.label) || st);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Material Tier"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6,
      maxHeight: 80,
      overflowY: 'auto'
    }
  }, (mktCategory === 'weapon' && (mktSubtype === 'bow' || mktSubtype === 'staff') ? MKT_WOOD_TIERS : MKT_TIERS).map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        setMktTier(t.id);
        setMktPrice(estimateMktPrice(t.id, mktSubtype));
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (mktTier === t.id ? t.color + '80' : t.color + '20'),
        background: mktTier === t.id ? t.color + '20' : 'transparent',
        color: mktTier === t.id ? t.color : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Element (optional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setMktElement1(null);
      setMktElement2(null);
    },
    style: {
      padding: '2px 5px',
      borderRadius: 3,
      fontSize: 7,
      fontWeight: 700,
      border: '1px solid ' + (mktElement1 === null ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
      background: mktElement1 === null ? 'rgba(91,82,255,.1)' : 'transparent',
      color: mktElement1 === null ? '#a0a0ff' : 'rgba(255,255,255,.25)',
      cursor: 'pointer'
    }
  }, "Any"), Object.entries(ELEMENTS).filter(function (_ref123) {
    var _ref124 = _slicedToArray(_ref123, 2),
      k = _ref124[0],
      e = _ref124[1];
    return e.type !== 'endgame';
  }).map(function (_ref125) {
    var _ref126 = _slicedToArray(_ref125, 2),
      k = _ref126[0],
      e = _ref126[1];
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: function onClick() {
        return setMktElement1(mktElement1 === k ? null : k);
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (mktElement1 === k ? e.color + '60' : 'rgba(255,255,255,.06)'),
        background: mktElement1 === k ? e.color + '15' : 'transparent',
        color: mktElement1 === k ? e.color : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, k);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, mktMode === 'buy' ? 'Max Bid' : 'Ask Price'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 1,
    max: 99999,
    value: mktPrice,
    onChange: function onChange(e) {
      return setMktPrice(Math.max(1, +e.target.value || 1));
    },
    style: {
      width: 70,
      padding: '4px 6px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 11,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginLeft: 'auto'
    }
  }, "Est: ~", estimateMktPrice(mktTier, mktSubtype), "G")), mktMode === 'sell' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Select Item from Stash"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 6
    }
  }, (rpgState.weaponStash || []).map(function (sw, i) {
    var _WEAPON_TYPES$sw$type;
    var sel = mktSellItem === i;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function onClick() {
        setMktSellItem(i);
        setMktCategory('weapon');
        setMktSubtype(sw.type);
        if (sw.gearBase) setMktTier(sw.gearBase);
        setMktElement1(sw.element1 || null);
        setMktElement2(sw.element2 || null);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#5b52ff' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(91,82,255,.12)' : 'rgba(255,255,255,.02)',
        color: sel ? '#fff' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, ((_WEAPON_TYPES$sw$type = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type === void 0 ? void 0 : _WEAPON_TYPES$sw$type.emoji) || '⚔️', " ", sw.name);
  }), (!rpgState.weaponStash || rpgState.weaponStash.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.2)',
      fontStyle: 'italic'
    }
  }, "No items in stash to sell"))), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var S, R, _R$weaponStash, sellItem, _BLACKSMITH_TIERS$mkt, _WOODWORKING_TIERS$mk, tierLabel, res, data, execPrice, _data$matchedOrder, refund, ob, obd, _t9, _t0;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.p = _context0.n) {
          case 0:
            S = stateRef.current, R = S.rpg;
            if (R) {
              _context0.n = 1;
              break;
            }
            return _context0.a(2);
          case 1:
            if (!(mktMode === 'buy')) {
              _context0.n = 3;
              break;
            }
            if (!(R.coins < mktPrice)) {
              _context0.n = 2;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Not enough gold!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 2:
            _context0.n = 4;
            break;
          case 3:
            if (!(mktMode === 'sell')) {
              _context0.n = 4;
              break;
            }
            if (!(mktSellItem === null || !((_R$weaponStash = R.weaponStash) !== null && _R$weaponStash !== void 0 && _R$weaponStash[mktSellItem]))) {
              _context0.n = 4;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Select an item first!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 4:
            sellItem = mktMode === 'sell' ? R.weaponStash[mktSellItem] : null;
            /* Call server API */
            _context0.p = 5;
            tierLabel = ((_BLACKSMITH_TIERS$mkt = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt.label) || ((_WOODWORKING_TIERS$mk = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk === void 0 ? void 0 : _WOODWORKING_TIERS$mk.label) || mktTier;
            _context0.n = 6;
            return fetch(BT_API_BASE + '/api/market/place', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: mktMode,
                category: mktCategory,
                subtype: mktSubtype,
                tierKey: mktTier,
                element1: mktElement1,
                element2: mktElement2,
                price: mktPrice,
                item: sellItem,
                tierLabel: tierLabel,
                playerName: S.myName,
                playerId: S.myId
              })
            });
          case 6:
            res = _context0.v;
            _context0.n = 7;
            return res.json();
          case 7:
            data = _context0.v;
            if (data.ok) {
              _context0.n = 8;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: data.error || 'Failed!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 8:
            /* Apply client-side effects */
            if (mktMode === 'buy') {
              R.coins -= mktPrice; /* escrow */
              if (R._compStats) R._compStats.totalGoldSpent += mktPrice;
            }
            if (mktMode === 'sell' && mktSellItem !== null) {
              R.weaponStash.splice(mktSellItem, 1);
              setMktSellItem(null);
            }
            if (data.matched) {
              execPrice = data.execPrice;
              if (mktMode === 'buy') {
                refund = mktPrice - execPrice;
                if (refund > 0) R.coins += refund;
                if ((_data$matchedOrder = data.matchedOrder) !== null && _data$matchedOrder !== void 0 && _data$matchedOrder.item) {
                  if (!R.weaponStash) R.weaponStash = [];
                  R.weaponStash.push(data.matchedOrder.item);
                }
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Bought for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              } else {
                R.coins += execPrice;
                if (R._compStats) R._compStats.totalGoldEarned += execPrice;
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Sold for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              }
              BT_AUDIO.collect();
            } else {
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 30,
                text: mktMode === 'buy' ? 'Buy order placed!' : 'Listed for sale!',
                color: '#5b52ff',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.05, 0.08, 'sine');
            }
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
            /* Refresh order book from server */
            _context0.p = 9;
            _context0.n = 10;
            return fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier);
          case 10:
            ob = _context0.v;
            _context0.n = 11;
            return ob.json();
          case 11:
            obd = _context0.v;
            if (obd.ok) setMktOrders(obd.orders);
            _context0.n = 13;
            break;
          case 12:
            _context0.p = 12;
            _t9 = _context0.v;
          case 13:
            _context0.n = 15;
            break;
          case 14:
            _context0.p = 14;
            _t0 = _context0.v;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Server error!',
              color: '#ff5e6c',
              ts: Date.now()
            });
          case 15:
            return _context0.a(2);
        }
      }, _callee0, null, [[9, 12], [5, 14]]);
    })),
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 800,
      border: '1.5px solid ' + (mktMode === 'buy' ? 'rgba(91,82,255,.4)' : 'rgba(245,197,66,.4)'),
      background: mktMode === 'buy' ? 'rgba(91,82,255,.15)' : 'rgba(245,197,66,.15)',
      color: mktMode === 'buy' ? '#a0a0ff' : '#f5c542',
      cursor: 'pointer',
      marginBottom: 8
    }
  }, mktMode === 'buy' ? '🛒 Place Buy Order (' + mktPrice + 'G)' : '💰 List for Sale (' + mktPrice + 'G)')), function (_BLACKSMITH_TIERS$mkt2, _WOODWORKING_TIERS$mk2, _WEAPON_TYPES$mktSubt) {
    var S = stateRef.current;
    var orders = mktOrders || [];
    var filtered = mktMode === 'orders' ? orders.filter(function (o) {
      return o.playerId === S.myId;
    }) : orders.filter(function (o) {
      return o.category === mktCategory && o.subtype === mktSubtype && o.tierKey === mktTier;
    });
    var buys = filtered.filter(function (o) {
      return o.type === 'buy';
    }).sort(function (a, b) {
      return b.price - a.price;
    });
    var sells = filtered.filter(function (o) {
      return o.type === 'sell';
    }).sort(function (a, b) {
      return a.price - b.price;
    });

    /* Auto-refresh order book when tab/filters change */
    var refreshKey = mktMode + mktCategory + mktSubtype + mktTier;
    if (S._mktLastRefresh !== refreshKey) {
      S._mktLastRefresh = refreshKey;
      var endpoint = mktMode === 'orders' ? BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId) : BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier;
      fetch(endpoint).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setMktOrders(d.orders);
      }).catch(function () {});
    }
    return /*#__PURE__*/React.createElement("div", null, mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#3dd497',
        flex: 1
      }
    }, "\uD83D\uDCCA Order Book \u2014 ", ((_BLACKSMITH_TIERS$mkt2 = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt2 === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt2.label) || ((_WOODWORKING_TIERS$mk2 = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk2 === void 0 ? void 0 : _WOODWORKING_TIERS$mk2.label) || mktTier, " ", ((_WEAPON_TYPES$mktSubt = WEAPON_TYPES[mktSubtype]) === null || _WEAPON_TYPES$mktSubt === void 0 ? void 0 : _WEAPON_TYPES$mktSubt.label) || mktSubtype), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null; /* force refresh */
        fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      style: {
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        color: 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), sells.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(255,94,108,.6)',
        marginBottom: 2
      }
    }, "SELL ORDERS (lowest first)"), sells.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(255,94,108,.05)',
          border: '1px solid rgba(255,94,108,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#ff5e6c',
          fontWeight: 700
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          flex: 1
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: '#5b52ff'
        }
      }, "(you)"));
    }), buys.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(61,212,151,.6)',
        marginTop: 4,
        marginBottom: 2
      }
    }, "BUY ORDERS (highest first)"), buys.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(61,212,151,.05)',
          border: '1px solid rgba(61,212,151,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#3dd497',
          fontWeight: 700
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          flex: 1
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: '#5b52ff'
        }
      }, "(you)"));
    }), sells.length === 0 && buys.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 8
      }
    }, "No orders yet. Be the first!")), mktMode === 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#5b52ff',
        flex: 1
      }
    }, "Your Active Orders (", filtered.length, ")"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null;
        fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      style: {
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        color: 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No active orders"), filtered.map(function (o) {
      var _WEAPON_TYPES$o$subty;
      var timeLeft = Math.max(0, Math.ceil((o.expires - Date.now()) / 60000));
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: o.type === 'buy' ? '#3dd497' : '#ff5e6c'
        }
      }, o.type === 'buy' ? 'BUY' : 'SELL'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", ((_WEAPON_TYPES$o$subty = WEAPON_TYPES[o.subtype]) === null || _WEAPON_TYPES$o$subty === void 0 ? void 0 : _WEAPON_TYPES$o$subty.label) || o.subtype, " ", o.element1 ? '(' + o.element1 + ')' : ''), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.25)'
        }
      }, timeLeft, "m left")), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: '#f5c542'
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
          var res, data, _data$cancelled, _data$cancelled2, R2, _t1;
          return _regenerator().w(function (_context1) {
            while (1) switch (_context1.p = _context1.n) {
              case 0:
                _context1.p = 0;
                _context1.n = 1;
                return fetch(BT_API_BASE + '/api/market/cancel?id=' + o.id + '&playerId=' + encodeURIComponent(S.myId), {
                  method: 'DELETE'
                });
              case 1:
                res = _context1.v;
                _context1.n = 2;
                return res.json();
              case 2:
                data = _context1.v;
                if (data.ok) {
                  R2 = stateRef.current.rpg;
                  /* Refund gold for buys, return item for sells */
                  if (((_data$cancelled = data.cancelled) === null || _data$cancelled === void 0 ? void 0 : _data$cancelled.type) === 'buy') R2.coins += data.cancelled.price;
                  if (((_data$cancelled2 = data.cancelled) === null || _data$cancelled2 === void 0 ? void 0 : _data$cancelled2.type) === 'sell' && data.cancelled.item) {
                    if (!R2.weaponStash) R2.weaponStash = [];
                    R2.weaponStash.push(data.cancelled.item);
                  }
                  setRpgState(_objectSpread({}, R2));
                  try {
                    localStorage.setItem('bt_rpg', JSON.stringify(R2));
                  } catch (e) {}
                  S.dmgNumbers.push({
                    x: S.player.x,
                    y: S.player.y - 30,
                    text: 'Order cancelled',
                    color: 'rgba(255,255,255,.5)',
                    ts: Date.now()
                  });
                  /* Refresh */
                  S._mktLastRefresh = null;
                  fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
                    return r.json();
                  }).then(function (d) {
                    if (d.ok) setMktOrders(d.orders);
                  }).catch(function () {});
                }
                _context1.n = 4;
                break;
              case 3:
                _context1.p = 3;
                _t1 = _context1.v;
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Cancel failed',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
              case 4:
                return _context1.a(2);
            }
          }, _callee1, null, [[0, 3]]);
        })),
        style: {
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,94,108,.2)',
          background: 'rgba(255,94,108,.08)',
          color: '#ff5e6c',
          cursor: 'pointer'
        }
      }, "\u2715"));
    })));
  }()), buildingPanel === 'forge' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#b0b0b0',
      marginBottom: 4
    }
  }, "\uD83D\uDD28 Blacksmith"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Blacksmithing Lv", ((_rpgState$lifeSkills21 = rpgState.lifeSkills) === null || _rpgState$lifeSkills21 === void 0 || (_rpgState$lifeSkills21 = _rpgState$lifeSkills21.blacksmithing) === null || _rpgState$lifeSkills21 === void 0 ? void 0 : _rpgState$lifeSkills21.level) || 1, " \xB7 Forge melee weapons from ore. Higher levels unlock gem slots."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [{
    type: 'greatsword',
    label: '⚔️ Greatsword',
    desc: 'Slow, heavy hitter'
  }, {
    type: 'sword',
    label: '🗡️ Sword',
    desc: 'Fast, status pressure'
  }, {
    type: 'shield',
    label: '🛡️ Shield',
    desc: 'Defensive gear'
  }].map(function (wt) {
    var _stateRef$current8, _stateRef$current9, _stateRef$current0;
    return /*#__PURE__*/React.createElement("button", {
      key: wt.type,
      style: {
        flex: 1,
        padding: '4px 6px',
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        background: (((_stateRef$current8 = stateRef.current) === null || _stateRef$current8 === void 0 ? void 0 : _stateRef$current8._bsType) || 'greatsword') === wt.type ? 'rgba(176,176,176,.2)' : 'rgba(255,255,255,.05)',
        border: (((_stateRef$current9 = stateRef.current) === null || _stateRef$current9 === void 0 ? void 0 : _stateRef$current9._bsType) || 'greatsword') === wt.type ? '1px solid rgba(176,176,176,.4)' : '1px solid rgba(255,255,255,.08)',
        color: (((_stateRef$current0 = stateRef.current) === null || _stateRef$current0 === void 0 ? void 0 : _stateRef$current0._bsType) || 'greatsword') === wt.type ? '#d0d0d0' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._bsType = wt.type;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, wt.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 400,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.desc));
  })), Object.entries(BLACKSMITH_TIERS).filter(function (_ref129) {
    var _rpgState$lifeSkills22;
    var _ref130 = _slicedToArray(_ref129, 2),
      key = _ref130[0],
      bt = _ref130[1];
    var bsLvl = ((_rpgState$lifeSkills22 = rpgState.lifeSkills) === null || _rpgState$lifeSkills22 === void 0 || (_rpgState$lifeSkills22 = _rpgState$lifeSkills22.blacksmithing) === null || _rpgState$lifeSkills22 === void 0 ? void 0 : _rpgState$lifeSkills22.level) || 1;
    /* Show tiers within 10 levels of player skill, plus next locked one */
    return bt.minLvl <= bsLvl + 10;
  }).map(function (_ref131) {
    var _rpgState$lifeSkills23, _rpgState$inventory, _stateRef$current1, _stateRef$current10, _stateRef$current12;
    var _ref132 = _slicedToArray(_ref131, 2),
      key = _ref132[0],
      bt = _ref132[1];
    var bsLvl = ((_rpgState$lifeSkills23 = rpgState.lifeSkills) === null || _rpgState$lifeSkills23 === void 0 || (_rpgState$lifeSkills23 = _rpgState$lifeSkills23.blacksmithing) === null || _rpgState$lifeSkills23 === void 0 ? void 0 : _rpgState$lifeSkills23.level) || 1;
    var canForgeSkill = bsLvl >= bt.minLvl;
    var oreKey = 'ore_' + bt.oreName + '_ore';
    var hasOre = (((_rpgState$inventory = rpgState.inventory) === null || _rpgState$inventory === void 0 ? void 0 : _rpgState$inventory[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    var bsMelee = ((_stateRef$current1 = stateRef.current) === null || _stateRef$current1 === void 0 ? void 0 : _stateRef$current1._bsType) || 'greatsword';
    var gearType = bsMelee === 'shield' ? 'shield' : bsMelee;
    var fullIdx = Object.keys(BLACKSMITH_TIERS).indexOf(key);
    var statReq = getGearStatReq(gearType, fullIdx);
    var meetsStat = statReq.value === 0 || (rpgState[statReq.stat] || 0) >= statReq.value;
    var canForge = canForgeSkill && meetsStat;
    var bsType = ((_stateRef$current10 = stateRef.current) === null || _stateRef$current10 === void 0 ? void 0 : _stateRef$current10._bsType) || 'greatsword';
    var reqStat = EQUIP_STAT_MAP[bsType] || 'power';
    var playerStat = rpgState[reqStat] || 0;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canForge && meetsStat ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, bt.slots > 0 ? '💠' : '🔨'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canForge && meetsStat ? '#fff' : '#666'
      }
    }, bt.label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, bt.desc, " ", bt.slots > 0 ? "\xB7 ".concat(bt.slots, " gem slot").concat(bt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g", !canForgeSkill && " \xB7 Req BS Lv".concat(bt.minLvl), canForgeSkill && !meetsStat && " \xB7 Req ".concat(STAT_LABELS[statReq.stat] || statReq.stat, " ").concat(statReq.value), bt.statReq > 0 && function (_stateRef$current11) {
      var bsType = ((_stateRef$current11 = stateRef.current) === null || _stateRef$current11 === void 0 ? void 0 : _stateRef$current11._bsType) || 'greatsword';
      var reqStat = bsType === 'shield' ? SHIELD_EQUIP_STAT : EQUIP_STAT_MAP[bsType] || 'power';
      var playerVal = rpgState[reqStat] || 0;
      var met = playerVal >= bt.statReq;
      return /*#__PURE__*/React.createElement("span", {
        style: {
          color: met ? '#3dd497' : '#ff5e6c'
        }
      }, " \xB7 ", bt.statReq, " ", reqStat, " ", met ? '✓' : '✗');
    }())), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && meetsStat ? '#b0b0b0' : 'rgba(255,255,255,.08)',
        color: canForge && hasOre && hasGold && meetsStat ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !meetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        var bsMelee = stateRef.current._bsType || 'greatsword';
        /* Server-authoritative forge in MP: worker mirrors
           BLACKSMITH_TIERS, validates skill + stat + ore + coins,
           consumes + mints + swaps to stash + applies XP.  Local
           mutation stays as snappy visual prediction; player_state
           arrives with authoritative weapon + stash + coins + inv. */
        {
          var _Sfw = stateRef.current;
          if (_Sfw._serverMonsters && _Sfw.channel) {
            try { _Sfw.channel.send({ type: 'forge_weapon', payload: { weaponType: bsMelee, tierKey: key, isWoodwork: false } }); } catch (e) {}
          }
        }
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        var wpnKey = 'weapon';
        var wpnType = bsMelee;
        if (R[wpnKey] && R[wpnKey].name) {
          if (!R.weaponStash) R.weaponStash = [];
          if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(_objectSpread({}, R[wpnKey]));
        }
        R[wpnKey] = {
          type: wpnType,
          tier: 'common',
          tierMult: bt.tierMult,
          element1: null,
          element2: null,
          isVolatile: false,
          name: bt.label + ' ' + WEAPON_TYPES[wpnType].label,
          gearBase: key,
          reforgeBonus: null,
          hardenBonus: null
        };
        var leveled = addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 5);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.forgedWeapon = true;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Forged ' + bt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
          color: '#b0b0b0',
          ts: Date.now()
        });
        if (bt.slots > 0) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 42,
          text: bt.slots + ' gem slot' + (bt.slots > 1 ? 's' : '') + ' ready!',
          color: '#a855f7',
          ts: Date.now()
        });
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 54,
          text: 'Blacksmithing Lv' + R.lifeSkills.blacksmithing.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Forge (", ((_stateRef$current12 = stateRef.current) === null || _stateRef$current12 === void 0 ? void 0 : _stateRef$current12._bsType) === 'sword' ? 'Sword' : 'Greatsword', ")"));
  }), function (_rpgState$lifeSkills24) {
    var wpn = rpgState.weapon;
    if (!(wpn !== null && wpn !== void 0 && wpn.gearBase)) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginTop: 8
      }
    }, "Forge a weapon first to unlock Reforge & Harden.");
    var bt = BLACKSMITH_TIERS[wpn.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = 'ore_' + bt.oreName + '_ore';
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills24 = rpgState.lifeSkills) === null || _rpgState$lifeSkills24 === void 0 || (_rpgState$lifeSkills24 = _rpgState$lifeSkills24.blacksmithing) === null || _rpgState$lifeSkills24 === void 0 ? void 0 : _rpgState$lifeSkills24.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(176,176,176,.06)',
        border: '1px solid rgba(176,176,176,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#b0b0b0',
        marginBottom: 4
      }
    }, "\uD83D\uDD27 Reforge & Harden: ", wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 4
      }
    }, "Current: ", wpn.reforgeBonus ? "".concat(wpn.reforgeBonus.label, " +").concat(wpn.reforgeBonus.value).concat(wpn.reforgeBonus.unit) : 'No bonus', wpn.hardenBonus ? " \xB7 ".concat(wpn.hardenBonus.label, " +").concat(wpn.hardenBonus.value).concat(wpn.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: '1px solid rgba(91,82,255,.3)',
        background: 'rgba(91,82,255,.12)',
        color: '#a78bfa',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + reforgeCost + 'x ore + ' + reforgeGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        var bonus = rollReforgeBonus(bt.tierMult);
        R.weapon.reforgeBonus = bonus;
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
          color: '#a78bfa',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setTimeout(function () {
          return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
        }, 80);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge (", reforgeCost, " ore + ", reforgeGold, "g)"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: wpn.hardenBonus ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(245,197,66,.3)',
        background: wpn.hardenBonus ? 'rgba(255,255,255,.04)' : 'rgba(245,197,66,.1)',
        color: wpn.hardenBonus ? 'rgba(255,255,255,.3)' : '#f5c542',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.weapon.hardenBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Already hardened!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R.weapon.reforgeBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Reforge first!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + hardenCost + 'x ore + ' + hardenGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          /* SUCCESS — add second bonus */
          var bonus = rollReforgeBonus(bt.tierMult);
          /* Ensure different from first */
          if (bonus.id === R.weapon.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.weapon.hardenBonus = bonus;
          addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 4));
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
            color: '#f5c542',
            ts: Date.now()
          });
          stateRef.current.screenShake = 4;
          BT_AUDIO.collect();
          setTimeout(function () {
            return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
          }, 100);
        } else {
          /* FAILED — weapon breaks, reset to base */
          var oldName = R.weapon.name;
          R.weapon.reforgeBonus = null;
          R.weapon.hardenBonus = null;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'BROKE! ' + oldName + ' lost all bonuses',
            color: '#ff5e6c',
            ts: Date.now()
          });
          stateRef.current.screenShake = 6;
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "% \xB7 ", hardenCost, " ore + ", hardenGold, "g)")));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCFF Amulet Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Gold Nuggets: ", rpgState.goldNuggets || 0, " \xB7 Gold Bars: ", rpgState.goldBars || 0, (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#f5c542'
    }
  }, " \xB7 Can smelt!")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '4px 0',
      borderRadius: 5,
      marginBottom: 6,
      border: '1px solid rgba(245,197,66,.3)',
      fontSize: 8,
      fontWeight: 700,
      cursor: 'pointer',
      background: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.04)',
      color: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? '#f5c542' : 'rgba(255,255,255,.25)'
    },
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if ((R.goldNuggets || 0) < NUGGETS_PER_BAR) return;
      R.goldNuggets -= NUGGETS_PER_BAR;
      R.goldBars = (R.goldBars || 0) + 1;
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 30,
        text: 'Smelted Gold Bar!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
      }, 100);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "\uD83E\uDE99 Smelt ", NUGGETS_PER_BAR, " Nuggets \u2192 1 Gold Bar"), Object.entries(AMULET_TIERS).map(function (_ref133) {
    var _rpgState$lifeSkills25;
    var _ref134 = _slicedToArray(_ref133, 2),
      key = _ref134[0],
      at = _ref134[1];
    var bsLvl = ((_rpgState$lifeSkills25 = rpgState.lifeSkills) === null || _rpgState$lifeSkills25 === void 0 || (_rpgState$lifeSkills25 = _rpgState$lifeSkills25.blacksmithing) === null || _rpgState$lifeSkills25 === void 0 ? void 0 : _rpgState$lifeSkills25.level) || 1;
    var canCraft = bsLvl >= at.minLvl;
    var hasBars = (rpgState.goldBars || 0) >= at.bars;
    var hasGold = rpgState.coins >= at.goldCost;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        padding: '4px 6px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCraft ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, "\uD83D\uDCFF"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: canCraft ? '#f5c542' : '#666'
      }
    }, at.label, " Amulet ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", at.minLvl, "+ \xB7 ", at.basePower, "\xD7 gem power")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.35)'
      }
    }, at.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, at.bars, " bar", at.bars > 1 ? 's' : '', " + ", at.goldCost, "g", !canCraft && " \xB7 Req Lv".concat(at.minLvl))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCraft && hasBars && hasGold ? '#f5c542' : 'rgba(255,255,255,.08)',
        color: canCraft && hasBars && hasGold ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canCraft || !hasBars || !hasGold) return;
        var R = stateRef.current.rpg;
        R.goldBars -= at.bars;
        R.coins -= at.goldCost;
        R.amulet = {
          tier: key,
          gem: null,
          name: at.label + ' Gold Amulet'
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', at.minLvl * 3);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Crafted ' + at.label + ' Amulet!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Craft"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(91,82,255,.06)',
      border: '1px solid rgba(91,82,255,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDEE1\uFE0F Shield Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Forge a shield from ore. Same tiers as melee weapons. Slot a gem at the Enchanter for defensive bonuses.", rpgState.shield && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5b52ff'
    }
  }, " \xB7 Equipped: ", rpgState.shield.name)), Object.entries(BLACKSMITH_TIERS).filter(function (_ref135) {
    var _rpgState$lifeSkills26;
    var _ref136 = _slicedToArray(_ref135, 2),
      key = _ref136[0],
      bt = _ref136[1];
    var bsLvl = ((_rpgState$lifeSkills26 = rpgState.lifeSkills) === null || _rpgState$lifeSkills26 === void 0 || (_rpgState$lifeSkills26 = _rpgState$lifeSkills26.blacksmithing) === null || _rpgState$lifeSkills26 === void 0 ? void 0 : _rpgState$lifeSkills26.level) || 1;
    return bt.minLvl <= bsLvl + 10;
  }).slice(0, 8).map(function (_ref137) {
    var _rpgState$lifeSkills27, _rpgState$inventory2;
    var _ref138 = _slicedToArray(_ref137, 2),
      key = _ref138[0],
      bt = _ref138[1];
    var bsLvl = ((_rpgState$lifeSkills27 = rpgState.lifeSkills) === null || _rpgState$lifeSkills27 === void 0 || (_rpgState$lifeSkills27 = _rpgState$lifeSkills27.blacksmithing) === null || _rpgState$lifeSkills27 === void 0 ? void 0 : _rpgState$lifeSkills27.level) || 1;
    var canForge = bsLvl >= bt.minLvl;
    var oreKey = 'ore_' + bt.oreName + '_ore';
    var hasOre = (((_rpgState$inventory2 = rpgState.inventory) === null || _rpgState$inventory2 === void 0 ? void 0 : _rpgState$inventory2[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    var shieldStatVal = rpgState[SHIELD_EQUIP_STAT] || 0;
    var shieldMeetsStat = !bt.statReq || shieldStatVal >= bt.statReq;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
        padding: '4px 6px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canForge && shieldMeetsStat ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: canForge && shieldMeetsStat ? '#fff' : '#666'
      }
    }, bt.label, " Shield ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g", bt.statReq > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: shieldMeetsStat ? 'rgba(255,255,255,.3)' : '#ff5e6c'
      }
    }, " \xB7 ", SHIELD_EQUIP_STAT.charAt(0).toUpperCase() + SHIELD_EQUIP_STAT.slice(1), " ", bt.statReq, shieldMeetsStat ? '✓' : ''))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 6px',
        borderRadius: 4,
        border: 'none',
        fontSize: 7,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && shieldMeetsStat ? '#5b52ff' : 'rgba(255,255,255,.08)',
        color: canForge && hasOre && hasGold && shieldMeetsStat ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !shieldMeetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        R.shield = {
          gearBase: key,
          gem: null,
          name: bt.label + ' Shield',
          reforgeBonus: null,
          hardenBonus: null
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 3);
        recalcDerived(R);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Forged ' + bt.label + ' Shield!',
          color: '#5b52ff',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Forge"));
  }), function (_rpgState$lifeSkills28) {
    var sh = rpgState.shield;
    if (!(sh !== null && sh !== void 0 && sh.gearBase)) return null;
    var bt = BLACKSMITH_TIERS[sh.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = 'ore_' + bt.oreName + '_ore';
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills28 = rpgState.lifeSkills) === null || _rpgState$lifeSkills28 === void 0 || (_rpgState$lifeSkills28 = _rpgState$lifeSkills28.blacksmithing) === null || _rpgState$lifeSkills28 === void 0 ? void 0 : _rpgState$lifeSkills28.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        padding: 6,
        borderRadius: 6,
        background: 'rgba(91,82,255,.04)',
        border: '1px solid rgba(91,82,255,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#5b52ff',
        marginBottom: 3
      }
    }, "\uD83D\uDD27 ", sh.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 3
      }
    }, sh.reforgeBonus ? "".concat(sh.reforgeBonus.label, " +").concat(sh.reforgeBonus.value).concat(sh.reforgeBonus.unit) : 'No bonus', sh.hardenBonus ? " \xB7 ".concat(sh.hardenBonus.label, " +").concat(sh.hardenBonus.value).concat(sh.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 4,
        border: '1px solid rgba(91,82,255,.25)',
        background: 'rgba(91,82,255,.1)',
        color: '#a78bfa',
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need materials',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        R.shield.reforgeBonus = rollReforgeBonus(bt.tierMult);
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: R.shield.reforgeBonus.label + ' +' + R.shield.reforgeBonus.value + R.shield.reforgeBonus.unit,
          color: '#a78bfa',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 4,
        border: sh.hardenBonus ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(245,197,66,.25)',
        background: sh.hardenBonus ? 'rgba(255,255,255,.03)' : 'rgba(245,197,66,.08)',
        color: sh.hardenBonus ? 'rgba(255,255,255,.25)' : '#f5c542',
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.shield.hardenBonus || !R.shield.reforgeBonus) return;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) return;
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          var bonus = rollReforgeBonus(bt.tierMult);
          if (bonus.id === R.shield.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.shield.hardenBonus = bonus;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label,
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.collect();
        } else {
          R.shield.reforgeBonus = null;
          R.shield.hardenBonus = null;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Shield bonuses lost!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "%)")));
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.06)',
      border: '1px solid rgba(255,94,108,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u267B\uFE0F Salvage Station"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "Extract gems first, then salvage items for ~60% materials back. Reforge bonuses are lost."), [{
    label: 'Melee Weapon',
    key: 'weapon',
    item: rpgState.weapon,
    gemField: 'element1'
  }, {
    label: 'Ranged Weapon',
    key: 'rangedWeapon',
    item: rpgState.rangedWeapon,
    gemField: 'element1'
  }, {
    label: 'Staff',
    key: 'staffWeapon',
    item: rpgState.staffWeapon,
    gemField: 'element1'
  }, {
    label: 'Shield',
    key: 'shield',
    item: rpgState.shield,
    gemField: 'gem'
  }, {
    label: 'Amulet',
    key: 'amulet',
    item: rpgState.amulet,
    gemField: 'gem'
  }].filter(function (s) {
    return s.item && s.item.gearBase;
  }).map(function (s) {
    var hasGem = s.key === 'amulet' ? !!s.item.gem : s.key === 'shield' ? !!s.item.gem : !!(s.item.element1 || s.item.element2);
    var isAmulet = s.key === 'amulet';
    var salvReturns = isAmulet ? getAmuletSalvageReturns(s.item) : getSalvageReturns(s.item);
    var canSalvage = !hasGem && salvReturns;
    var extractCost = hasGem ? gemExtractCost(s.item) : 0;
    var canAffordExtract = rpgState.coins >= extractCost;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      style: {
        padding: 6,
        borderRadius: 6,
        marginBottom: 4,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#ccc',
        marginBottom: 3
      }
    }, s.label, ": ", s.item.name || 'Unknown', hasGem && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: '#a78bfa'
      }
    }, " \xB7 Has gem(s)")), hasGem && /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '3px 0',
        borderRadius: 4,
        marginBottom: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(167,139,250,.3)',
        background: canAffordExtract ? 'rgba(167,139,250,.12)' : 'rgba(255,255,255,.04)',
        color: canAffordExtract ? '#a78bfa' : 'rgba(255,255,255,.25)'
      },
      onClick: function onClick() {
        var _R$amulet, _R$shield;
        var R = stateRef.current.rpg;
        if (R.coins < extractCost) return;
        R.coins -= extractCost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (s.key === 'amulet' && (_R$amulet = R.amulet) !== null && _R$amulet !== void 0 && _R$amulet.gem) {
          var _AMULET_TIERS$R$amule2;
          var polKey = 'polished_' + R.amulet.gem;
          R.lifeSkills.gems[polKey] = (R.lifeSkills.gems[polKey] || 0) + 1;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Extracted ' + R.amulet.gem + ' gem',
            color: '#a78bfa',
            ts: Date.now()
          });
          R.amulet.gem = null;
          R.amulet.name = (((_AMULET_TIERS$R$amule2 = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule2 === void 0 ? void 0 : _AMULET_TIERS$R$amule2.label) || 'Simple') + ' Gold Amulet';
        } else if (s.key === 'shield' && (_R$shield = R.shield) !== null && _R$shield !== void 0 && _R$shield.gem) {
          var _polKey = 'polished_' + R.shield.gem;
          R.lifeSkills.gems[_polKey] = (R.lifeSkills.gems[_polKey] || 0) + 1;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Extracted ' + R.shield.gem + ' gem',
            color: '#a78bfa',
            ts: Date.now()
          });
          R.shield.gem = null;
          var bt = BLACKSMITH_TIERS[R.shield.gearBase];
          R.shield.name = ((bt === null || bt === void 0 ? void 0 : bt.label) || 'Basic') + ' Shield';
        } else if (R[s.key]) {
          var _wpn$gearBase2;
          /* Weapon — extract elements as polished gems */
          var wpn = R[s.key];
          if (wpn.element1) {
            var pk = 'polished_' + wpn.element1;
            R.lifeSkills.gems[pk] = (R.lifeSkills.gems[pk] || 0) + 1;
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'Extracted ' + wpn.element1 + ' gem',
              color: '#a78bfa',
              ts: Date.now()
            });
          }
          if (wpn.element2) {
            var _pk = 'polished_' + wpn.element2;
            R.lifeSkills.gems[_pk] = (R.lifeSkills.gems[_pk] || 0) + 1;
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 45,
              text: 'Extracted ' + wpn.element2 + ' gem',
              color: '#a78bfa',
              ts: Date.now()
            });
          }
          wpn.element1 = null;
          wpn.element2 = null;
          wpn.isVolatile = false;
          wpn.tier = 'common';
          /* Rebuild name without elements */
          var isWW = (_wpn$gearBase2 = wpn.gearBase) === null || _wpn$gearBase2 === void 0 ? void 0 : _wpn$gearBase2.startsWith('ww_');
          var tk = isWW ? wpn.gearBase.slice(3) : wpn.gearBase;
          var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
          wpn.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[wpn.type].label;
        }
        recalcDerived(R);
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E Extract Gem (", extractCost, "g)"), canSalvage && /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '3px 0',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.3)',
        background: 'rgba(255,94,108,.12)',
        color: '#ff5e6c'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        /* Apply salvage returns */
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        var returnText = salvReturns.map(function (r) {
          return r.qty + '× ' + r.label;
        }).join(', ');
        /* Destroy the item */
        if (s.key === 'amulet') R.amulet = null;else if (s.key === 'shield') R.shield = null;else if (s.key === 'weapon') R.weapon = {
          type: 'greatsword',
          tier: 'common',
          tierMult: 1.0,
          element1: null,
          element2: null,
          name: 'Fists',
          isVolatile: false
        };else if (s.key === 'rangedWeapon') R.rangedWeapon = null;else if (s.key === 'staffWeapon') R.staffWeapon = null;
        recalcDerived(R);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Salvaged! ' + returnText,
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
        setTimeout(function () {
          return BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u267B\uFE0F Salvage \u2192 ", salvReturns.map(function (r) {
      return r.qty + '× ' + r.label;
    }).join(' + ')), !hasGem && !canSalvage && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "Cannot salvage (no crafting base)"));
  }), (rpgState.weaponStash || []).filter(function (w) {
    return w.gearBase;
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 3
    }
  }, "Stashed weapons:"), (rpgState.weaponStash || []).map(function (sw, si) {
    if (!sw.gearBase) return null;
    var hasGem = !!(sw.element1 || sw.element2);
    var salvReturns = !hasGem ? getSalvageReturns(sw) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3,
        padding: '3px 6px',
        borderRadius: 4,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#aaa'
      }
    }, sw.name), hasGem && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 6,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(167,139,250,.3)',
        background: 'rgba(167,139,250,.1)',
        color: '#a78bfa'
      },
      onClick: function onClick() {
        var _sw$gearBase;
        var R = stateRef.current.rpg;
        var cost = gemExtractCost(sw);
        if (R.coins < cost) return;
        R.coins -= cost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (sw.element1) {
          R.lifeSkills.gems['polished_' + sw.element1] = (R.lifeSkills.gems['polished_' + sw.element1] || 0) + 1;
        }
        if (sw.element2) {
          R.lifeSkills.gems['polished_' + sw.element2] = (R.lifeSkills.gems['polished_' + sw.element2] || 0) + 1;
        }
        sw.element1 = null;
        sw.element2 = null;
        sw.isVolatile = false;
        sw.tier = 'common';
        var isWW = (_sw$gearBase = sw.gearBase) === null || _sw$gearBase === void 0 ? void 0 : _sw$gearBase.startsWith('ww_');
        var tk = isWW ? sw.gearBase.slice(3) : sw.gearBase;
        var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
        sw.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[sw.type].label;
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E Extract (", gemExtractCost(sw), "g)"), salvReturns && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 6,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.3)',
        background: 'rgba(255,94,108,.1)',
        color: '#ff5e6c'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        R.weaponStash.splice(si, 1);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Salvaged stash item',
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.1, 0.12, 'sawtooth');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u267B\uFE0F Salvage"), !hasGem && !salvReturns && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, "No base"));
  })))), buildingPanel === 'woodwork' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#8B6914',
      marginBottom: 4
    }
  }, "\uD83E\uDE9A Woodworker"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Woodworking Lv", ((_rpgState$lifeSkills29 = rpgState.lifeSkills) === null || _rpgState$lifeSkills29 === void 0 || (_rpgState$lifeSkills29 = _rpgState$lifeSkills29.woodworking) === null || _rpgState$lifeSkills29 === void 0 ? void 0 : _rpgState$lifeSkills29.level) || 1, " \xB7 Craft bows and staves from harvested wood. Higher tiers unlock gem slots."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [{
    type: 'bow',
    label: '🏹 Bow',
    desc: 'Ranged single-target'
  }, {
    type: 'staff',
    label: '🪄 Staff',
    desc: 'Ranged AOE swipe'
  }].map(function (wt) {
    var _stateRef$current13, _stateRef$current14, _stateRef$current15;
    return /*#__PURE__*/React.createElement("button", {
      key: wt.type,
      style: {
        flex: 1,
        padding: '4px 6px',
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        background: ((_stateRef$current13 = stateRef.current) === null || _stateRef$current13 === void 0 ? void 0 : _stateRef$current13._wwType) === wt.type ? 'rgba(139,105,20,.3)' : 'rgba(255,255,255,.05)',
        border: ((_stateRef$current14 = stateRef.current) === null || _stateRef$current14 === void 0 ? void 0 : _stateRef$current14._wwType) === wt.type ? '1px solid rgba(139,105,20,.5)' : '1px solid rgba(255,255,255,.08)',
        color: ((_stateRef$current15 = stateRef.current) === null || _stateRef$current15 === void 0 ? void 0 : _stateRef$current15._wwType) === wt.type ? '#d4a020' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._wwType = wt.type;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, wt.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 400,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.desc));
  })), Object.entries(WOODWORKING_TIERS).filter(function (_ref139) {
    var _rpgState$lifeSkills30;
    var _ref140 = _slicedToArray(_ref139, 2),
      key = _ref140[0],
      wt = _ref140[1];
    var wwLvl = ((_rpgState$lifeSkills30 = rpgState.lifeSkills) === null || _rpgState$lifeSkills30 === void 0 || (_rpgState$lifeSkills30 = _rpgState$lifeSkills30.woodworking) === null || _rpgState$lifeSkills30 === void 0 ? void 0 : _rpgState$lifeSkills30.level) || 1;
    return wt.minLvl <= wwLvl + 10;
  }).map(function (_ref141) {
    var _rpgState$lifeSkills31, _rpgState$inventory3, _stateRef$current16;
    var _ref142 = _slicedToArray(_ref141, 2),
      key = _ref142[0],
      wt = _ref142[1];
    var wwLvl = ((_rpgState$lifeSkills31 = rpgState.lifeSkills) === null || _rpgState$lifeSkills31 === void 0 || (_rpgState$lifeSkills31 = _rpgState$lifeSkills31.woodworking) === null || _rpgState$lifeSkills31 === void 0 ? void 0 : _rpgState$lifeSkills31.level) || 1;
    var canCraftSkill = wwLvl >= wt.minLvl;
    var woodKey = 'wood_' + wt.wood;
    var hasWood = (((_rpgState$inventory3 = rpgState.inventory) === null || _rpgState$inventory3 === void 0 ? void 0 : _rpgState$inventory3[woodKey]) || 0) >= wt.woodCost;
    var hasGold = rpgState.coins >= wt.goldCost;
    var craftType = ((_stateRef$current16 = stateRef.current) === null || _stateRef$current16 === void 0 ? void 0 : _stateRef$current16._wwType) || 'bow';
    var wwFullIdx = Object.keys(WOODWORKING_TIERS).indexOf(key);
    var wwStatReq = getGearStatReq(craftType, wwFullIdx);
    var wwMeetsStat = wwStatReq.value === 0 || (rpgState[wwStatReq.stat] || 0) >= wwStatReq.value;
    var canCraft = canCraftSkill && wwMeetsStat;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCraft ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, wt.slots > 0 ? '💠' : '🪵'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canCraft ? '#fff' : '#666'
      }
    }, wt.label, " ", craftType === 'bow' ? 'Bow' : 'Staff', " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", wt.minLvl, "+ \xB7 ", wt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, wt.desc, " ", wt.slots > 0 ? "\xB7 ".concat(wt.slots, " gem slot").concat(wt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.woodCost, "\xD7 ", wt.wood.replace(/_/g, ' '), " + ", wt.goldCost, "g", !canCraftSkill && " \xB7 Req WW Lv".concat(wt.minLvl), canCraftSkill && !wwMeetsStat && " \xB7 Req ".concat(STAT_LABELS[wwStatReq.stat] || wwStatReq.stat, " ").concat(wwStatReq.value))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCraft && hasWood && hasGold ? '#8B6914' : 'rgba(255,255,255,.08)',
        color: canCraft && hasWood && hasGold ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canCraft || !hasWood || !hasGold) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        var wpnType = craftType === 'bow' ? 'bow' : 'staff';
        /* Server-authoritative forge in MP -- mirrors WOODWORKING_TIERS.
           See blacksmith forge (~line 22273) for the predict + sync flow. */
        {
          var _Sww = stateRef.current;
          if (_Sww._serverMonsters && _Sww.channel) {
            try { _Sww.channel.send({ type: 'forge_weapon', payload: { weaponType: wpnType, tierKey: key, isWoodwork: true } }); } catch (e) {}
          }
        }
        R.inventory[woodKey] = (R.inventory[woodKey] || 0) - wt.woodCost;
        if (R.inventory[woodKey] <= 0) delete R.inventory[woodKey];
        R.coins -= wt.goldCost;
        var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        if (R[wpnKey] && R[wpnKey].name) {
          if (!R.weaponStash) R.weaponStash = [];
          if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(_objectSpread({}, R[wpnKey]));
        }
        R[wpnKey] = {
          type: wpnType,
          tier: 'common',
          tierMult: wt.tierMult,
          element1: null,
          element2: null,
          isVolatile: false,
          name: wt.label + ' ' + WEAPON_TYPES[wpnType].label,
          gearBase: 'ww_' + key,
          reforgeBonus: null,
          hardenBonus: null
        };
        var leveled = addLifeSkillXp(R.lifeSkills, 'woodworking', wt.minLvl * 5);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.craftedWoodWeapon = true;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Crafted ' + wt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
          color: '#8B6914',
          ts: Date.now()
        });
        if (wt.slots > 0) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 42,
          text: wt.slots + ' gem slot' + (wt.slots > 1 ? 's' : '') + ' ready!',
          color: '#a855f7',
          ts: Date.now()
        });
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 54,
          text: 'Woodworking Lv' + R.lifeSkills.woodworking.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Craft"));
  }), function (_stateRef$current17, _wpn$gearBase3, _rpgState$lifeSkills32) {
    var craftType = ((_stateRef$current17 = stateRef.current) === null || _stateRef$current17 === void 0 ? void 0 : _stateRef$current17._wwType) || 'bow';
    var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
    var wpn = rpgState[wpnKey];
    if (!(wpn !== null && wpn !== void 0 && (_wpn$gearBase3 = wpn.gearBase) !== null && _wpn$gearBase3 !== void 0 && _wpn$gearBase3.startsWith('ww_'))) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginTop: 8
      }
    }, "Craft a weapon first to unlock Reforge & Harden.");
    var wwKey = wpn.gearBase.slice(3);
    var wt = WOODWORKING_TIERS[wwKey];
    if (!wt) return null;
    var reforgeCost = Math.ceil(wt.woodCost * 0.5);
    var reforgeWoodKey = 'wood_' + wt.wood;
    var reforgeGold = Math.ceil(wt.goldCost * 0.3);
    var hardenCost = wt.woodCost;
    var hardenGold = Math.ceil(wt.goldCost * 0.5);
    var hChance = hardenChance(wt.tierMult, ((_rpgState$lifeSkills32 = rpgState.lifeSkills) === null || _rpgState$lifeSkills32 === void 0 || (_rpgState$lifeSkills32 = _rpgState$lifeSkills32.woodworking) === null || _rpgState$lifeSkills32 === void 0 ? void 0 : _rpgState$lifeSkills32.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(139,105,20,.06)',
        border: '1px solid rgba(139,105,20,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#8B6914',
        marginBottom: 4
      }
    }, "\uD83D\uDD27 Reforge & Harden: ", wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 4
      }
    }, "Current: ", wpn.reforgeBonus ? "".concat(wpn.reforgeBonus.label, " +").concat(wpn.reforgeBonus.value).concat(wpn.reforgeBonus.unit) : 'No bonus', wpn.hardenBonus ? " \xB7 ".concat(wpn.hardenBonus.label, " +").concat(wpn.hardenBonus.value).concat(wpn.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: '1px solid rgba(139,105,20,.3)',
        background: 'rgba(139,105,20,.12)',
        color: '#d4a020',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeWoodKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + reforgeCost + 'x wood + ' + reforgeGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeWoodKey] -= reforgeCost;
        if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
        R.coins -= reforgeGold;
        var bonus = rollReforgeBonus(wt.tierMult);
        R[wpnKey].reforgeBonus = bonus;
        addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
          color: '#d4a020',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge (", reforgeCost, " wood + ", reforgeGold, "g)"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: wpn.hardenBonus ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(245,197,66,.3)',
        background: wpn.hardenBonus ? 'rgba(255,255,255,.04)' : 'rgba(245,197,66,.1)',
        color: wpn.hardenBonus ? 'rgba(255,255,255,.3)' : '#f5c542',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R[wpnKey].hardenBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Already hardened!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R[wpnKey].reforgeBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Reforge first!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeWoodKey] || 0) < hardenCost || R.coins < hardenGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + hardenCost + 'x wood + ' + hardenGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeWoodKey] -= hardenCost;
        if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          var bonus = rollReforgeBonus(wt.tierMult);
          if (bonus.id === R[wpnKey].reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R[wpnKey].hardenBonus = bonus;
          addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 4));
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
            color: '#f5c542',
            ts: Date.now()
          });
          stateRef.current.screenShake = 4;
          BT_AUDIO.collect();
        } else {
          var oldName = R[wpnKey].name;
          R[wpnKey].reforgeBonus = null;
          R[wpnKey].hardenBonus = null;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'BROKE! ' + oldName + ' lost all bonuses',
            color: '#ff5e6c',
            ts: Date.now()
          });
          stateRef.current.screenShake = 6;
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "% \xB7 ", hardenCost, " wood + ", hardenGold, "g)")));
  }()), buildingPanel === 'gemcut' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a855f7',
      marginBottom: 4
    }
  }, "\uD83D\uDC8E Gem Cutter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Gem Cutting Lv", ((_rpgState$lifeSkills33 = rpgState.lifeSkills) === null || _rpgState$lifeSkills33 === void 0 || (_rpgState$lifeSkills33 = _rpgState$lifeSkills33.gemCutting) === null || _rpgState$lifeSkills33 === void 0 ? void 0 : _rpgState$lifeSkills33.level) || 1, " \xB7 Cut raw gems into polished slottable gems. Higher skill = better success rate."), Object.entries(ELEMENTS).map(function (_ref143) {
    var _rpgState$lifeSkills34, _rpgState$lifeSkills35, _ZONE_RESOURCES$elem, _ZONE_RESOURCES$elem2;
    var _ref144 = _slicedToArray(_ref143, 2),
      elem = _ref144[0],
      edef = _ref144[1];
    var gems = ((_rpgState$lifeSkills34 = rpgState.lifeSkills) === null || _rpgState$lifeSkills34 === void 0 ? void 0 : _rpgState$lifeSkills34.gems) || {};
    var rawKey = 'raw_' + elem;
    var polKey = 'polished_' + elem;
    var rawCount = gems[rawKey] || 0;
    var polCount = gems[polKey] || 0;
    if (rawCount <= 0 && polCount <= 0) return null;
    var gcLvl = ((_rpgState$lifeSkills35 = rpgState.lifeSkills) === null || _rpgState$lifeSkills35 === void 0 || (_rpgState$lifeSkills35 = _rpgState$lifeSkills35.gemCutting) === null || _rpgState$lifeSkills35 === void 0 ? void 0 : _rpgState$lifeSkills35.level) || 1;
    /* Success rate from GEM_CUT_TIERS */
    var successRate = 0.6;
    var tierKeys = Object.keys(GEM_CUT_TIERS);
    for (var i = tierKeys.length - 1; i >= 0; i--) {
      if (gcLvl >= GEM_CUT_TIERS[tierKeys[i]].minLvl) {
        successRate = GEM_CUT_TIERS[tierKeys[i]].successRate;
        break;
      }
    }
    var gemName = ((_ZONE_RESOURCES$elem = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem === void 0 ? void 0 : _ZONE_RESOURCES$elem.gem) || elem + ' Gem';
    var gemCol = ((_ZONE_RESOURCES$elem2 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem2 === void 0 ? void 0 : _ZONE_RESOURCES$elem2.gemColor) || edef.color;
    return /*#__PURE__*/React.createElement("div", {
      key: elem,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: gemCol + '10',
        border: '1px solid ' + gemCol + '25'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: gemCol
      }
    }, gemName), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "\u25C7 Raw: ", rawCount, " \xB7 \u25C6 Polished: ", polCount), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Success: ", Math.round(successRate * 100), "%")), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: rawCount > 0 ? gemCol : 'rgba(255,255,255,.08)',
        color: rawCount > 0 ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer',
        opacity: rawCount > 0 ? 1 : 0.4
      },
      onClick: function onClick() {
        if (rawCount <= 0) return;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        sk.gems[rawKey] = (sk.gems[rawKey] || 1) - 1;
        if (sk.gems[rawKey] <= 0) delete sk.gems[rawKey];
        /* Roll for success */
        if (Math.random() < successRate) {
          sk.gems[polKey] = (sk.gems[polKey] || 0) + 1;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Polished ' + gemName + '!',
            color: gemCol,
            ts: Date.now()
          });
          BT_AUDIO.collect();
        } else {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Gem shattered!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          BT_AUDIO.beep(200, 0.06, 0.1, 'square');
        }
        var leveled = addLifeSkillXp(sk, 'gemCutting', 15);
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 50,
          text: 'Gem Cutting Lv' + sk.gemCutting.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Cut"));
  }), Object.entries(((_rpgState$lifeSkills36 = rpgState.lifeSkills) === null || _rpgState$lifeSkills36 === void 0 ? void 0 : _rpgState$lifeSkills36.gems) || {}).every(function (_ref145) {
    var _ref146 = _slicedToArray(_ref145, 2),
      k = _ref146[0],
      v = _ref146[1];
    return v <= 0;
  }) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      textAlign: 'center',
      padding: 8
    }
  }, "No gems yet. Harvest resources in elemental zones to collect raw gems!")))), ((_stateRef$current18 = stateRef.current) === null || _stateRef$current18 === void 0 ? void 0 : _stateRef$current18.currentZone) === 'farm_home' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(61,220,151,.15)',
      border: '1px solid rgba(61,220,151,.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#3dd497',
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "\uD83C\uDFE1 Your Farm", ((_stateRef$current19 = stateRef.current) === null || _stateRef$current19 === void 0 || (_stateRef$current19 = _stateRef$current19.rpg) === null || _stateRef$current19 === void 0 ? void 0 : _stateRef$current19._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#f5c542'
    }
  }, " \xB7 \uD83C\uDF1F Well Rested"))), ((_stateRef$current20 = stateRef.current) === null || _stateRef$current20 === void 0 ? void 0 : _stateRef$current20._sleeping) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 38,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(100,100,200,.2)',
      border: '1px solid rgba(100,100,200,.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center',
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#a0a0ff',
      marginBottom: 3
    }
  }, "\uD83D\uDCA4 Sleeping..."), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'rgba(255,255,255,.1)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 3,
      background: '#a0a0ff',
      transition: 'width 0.1s',
      width: Math.min(100, (Date.now() - (((_stateRef$current$_sl = stateRef.current._sleeping) === null || _stateRef$current$_sl === void 0 ? void 0 : _stateRef$current$_sl.started) || Date.now())) / HOUSE_SLEEP_MS * 100) + '%'
    }
  }))), ((_stateRef$current23 = stateRef.current) === null || _stateRef$current23 === void 0 ? void 0 : _stateRef$current23.currentZone) === 'farm_home' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(61,220,151,.15)',
      border: '1px solid rgba(61,220,151,.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#3dd497',
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "\uD83C\uDFE1 Your Farm \u2014 Safe Zone")), ((_stateRef$current24 = stateRef.current) === null || _stateRef$current24 === void 0 ? void 0 : _stateRef$current24._sleeping) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 38,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(100,100,200,.2)',
      border: '1px solid rgba(100,100,200,.4)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center',
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#a0a0ff',
      marginBottom: 3
    }
  }, "\uD83D\uDCA4 Sleeping..."), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'rgba(255,255,255,.1)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 3,
      background: '#a0a0ff',
      transition: 'width 0.1s',
      width: Math.min(100, (Date.now() - (((_stateRef$current$_sl2 = stateRef.current._sleeping) === null || _stateRef$current$_sl2 === void 0 ? void 0 : _stateRef$current$_sl2.started) || Date.now())) / HOUSE_SLEEP_MS * 100) + '%'
    }
  }))), (rpgState === null || rpgState === void 0 ? void 0 : rpgState._wellRestedUntil) && Date.now() < rpgState._wellRestedUntil && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: ((_stateRef$current25 = stateRef.current) === null || _stateRef$current25 === void 0 ? void 0 : _stateRef$current25.currentZone) === 'farm_home' ? 32 : 8,
      right: 8,
      zIndex: 20,
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(245,197,66,.15)',
      border: '1px solid rgba(245,197,66,.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "\uD83C\uDF1F Well Rested +10% XP \xB7 ", Math.ceil((rpgState._wellRestedUntil - Date.now()) / 60000), "min")), showSocialPanel && /*#__PURE__*/React.createElement(SocialPanel, { blockedList: blockedList, friendsList: friendsList, mutedList: mutedList, setBlockedList: setBlockedList, setFriendsList: setFriendsList, setMutedList: setMutedList, setShowSocialPanel: setShowSocialPanel, stateRef: stateRef }), showClanPanel && rpgState && /*#__PURE__*/React.createElement(ClanPanel, { rpgState: rpgState, clanCreateMode: clanCreateMode, setClanCreateMode: setClanCreateMode, clanData: clanData, setClanData: setClanData, setRpgState: setRpgState, setShowClanPanel: setShowClanPanel, stateRef: stateRef }), buildingPanel === 'farmhome' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink2)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: 20,
      maxWidth: 280,
      width: '90%',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#4a7a3a',
      marginBottom: 8
    }
  }, "\uD83C\uDFE1 Your Farm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12
    }
  }, "Visit your personal farm to grow crops, rest in bed, and tend your homestead."), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '8px 20px',
      borderRadius: 8,
      border: 'none',
      background: '#4a7a3a',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      width: '100%',
      marginBottom: 6
    },
    onClick: function onClick() {
      var S2 = stateRef.current;
      S2.currentZone = 'farm_home';
      S2.map = generateZoneMap('farm_home');
      var fz = ZONES.farm_home;
      S2.player.x = fz.w * TILE / 2;
      S2.player.y = fz.h * TILE / 2;
      S2.monsters = [];
      S2.gatherNodes = [];
      S2.npcs = null;
      S2.groundLoot = [];
      S2.hitParticles = [];
      S2.deathExplosions = [];
      S2.arrows = [];
      S2._currentDepth = 'shallow';
      S2._ambientParticles = [];
      S2._zoneWipe = Date.now();
      setBuildingPanel(null);
      BT_AUDIO.startZoneAmbient('town');
      BT_AUDIO.beep(500, 0.08, 0.12, 'sine');
    }
  }, "\uD83D\uDEB6 Travel to Farm"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '6px 12px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.06)',
      color: 'rgba(255,255,255,.5)',
      fontSize: 10,
      cursor: 'pointer',
      width: '100%'
    },
    onClick: function onClick() {
      return setBuildingPanel(null);
    }
  }, "Cancel"))), questPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: ((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 900,
      color: '#fff'
    }
  }, questPanel.npc.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: '#fff'
    }
  }, questPanel.npc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, questPanel.status === 'available' ? 'New Quest!' : questPanel.status === 'active' ? 'Quest Active' : ''))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, questPanel.quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.6)',
      lineHeight: 1.5,
      marginBottom: 8
    }
  }, questPanel.status === 'available' ? questPanel.quest.dialogue.start : questPanel.quest.check(rpgState, stateRef.current) ? questPanel.quest.dialogue.complete : questPanel.quest.dialogue.progress), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,255,255,.04)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)'
    }
  }, "Objective:"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fff'
    }
  }, questPanel.quest.desc), questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#3dd497',
      marginTop: 4
    }
  }, "\u2713 Complete!")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Reward: \uD83D\uDCB0", questPanel.quest.reward.gold, "g \xB7 \u2B50", questPanel.quest.reward.xp, "XP"), questPanel.status === 'available' && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#5b52ff',
      color: '#fff',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      acceptQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Accept Quest"), questPanel.status === 'active' && questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#3dd497',
      color: '#000',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Turn In Quest"))), duelRequest && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setDuelRequest(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 280,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 4
    }
  }, "\u2694\uFE0F Duel Challenge!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.7)',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", null, duelRequest.fromName), " challenges you!"), duelRequest.wager > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83D\uDCB0 Wager: ", duelRequest.wager, "g (winner takes all)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 8
    }
  }, "Duels are consensual. No reputation penalty. Loser pays wager (if any). No item loss."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#3dd497',
      color: '#000',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'duel_accept',
        payload: {
          target: duelRequest.fromId,
          from: S2.myId,
          fromName: S2.myName,
          wager: duelRequest.wager || 0
        }
      });
      S2._inDuel = {
        opponent: duelRequest.fromId,
        opponentName: duelRequest.fromName,
        wager: duelRequest.wager || 0,
        startTime: Date.now()
      };
      setDuelRequest(null);
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 40,
        text: 'DUEL!',
        color: '#a78bfa',
        ts: Date.now()
      });
      BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
    }
  }, "Accept", duelRequest.wager > 0 ? ' (' + duelRequest.wager + 'g)' : ''), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 0.6,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.6)',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'duel_decline',
        payload: {
          target: duelRequest.fromId,
          from: S2.myId
        }
      });
      setDuelRequest(null);
    }
  }, "Decline")))), threatIncoming && !threatIncoming.responded && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {}
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "KILL THREAT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.7)',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", null, threatIncoming.fromName), " (Lv", threatIncoming.fromLevel, ") threatens to kill you!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Anyone can attack them without penalty (red \uD83D\uDC80 above their head)."), function () {
    var elapsed = Date.now() - threatIncoming.ts;
    var remaining = Math.max(0, threatIncoming.countdown - elapsed);
    var pct = remaining / threatIncoming.countdown * 100;
    var secs = Math.ceil(remaining / 1000);
    var mins = Math.floor(secs / 60);
    var secR = secs % 60;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#f5c542',
        marginBottom: 4
      }
    }, mins, ":", secR.toString().padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 3,
        background: pct > 50 ? '#f5c542' : pct > 20 ? '#ea580c' : '#ff5e6c',
        width: pct + '%',
        transition: 'width 1s linear'
      }
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.1)',
      color: '#8890b8',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* IGNORE — threatener gets white skull (still attackable, but victim keeps equipped items on death) */
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'threat_response',
        payload: {
          target: threatIncoming.fromId,
          from: S2.myId,
          action: 'ignored'
        }
      });
      setThreatIncoming(_objectSpread(_objectSpread({}, threatIncoming), {}, {
        responded: true
      }));
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 30,
        text: 'Threat ignored. They can still be attacked.',
        color: '#8890b8',
        ts: Date.now()
      });
    }
  }, "\uD83D\uDEB6 Ignore"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#ff5e6c',
      color: '#fff',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* CALL GUARDS — threatener loses 10% gold + gear locked 30min */
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'threat_response',
        payload: {
          target: threatIncoming.fromId,
          from: S2.myId,
          action: 'guards'
        }
      });
      setThreatIncoming(_objectSpread(_objectSpread({}, threatIncoming), {}, {
        responded: true
      }));
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 30,
        text: 'Guards dispatched!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.1, 0.12, 'sine');
    }
  }, "\u2694\uFE0F Call Guards")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginTop: 6
    }
  }, "If you ignore, their skull turns white \u2014 anyone can attack them freely but you keep equipped items. If you call guards, they lose 10% gold and gear is locked for 30 minutes."))), showTrade && tradeTarget && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowTrade(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowTrade(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83E\uDD1D Trade with ", tradeTarget.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Select items to offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 4,
      marginBottom: 8
    }
  }, Object.entries(rpgState.inventory || {}).filter(function (_ref149) {
    var _ref150 = _slicedToArray(_ref149, 2),
      k = _ref150[0],
      v = _ref150[1];
    return v > 0 && k !== 'potions';
  }).map(function (_ref151) {
    var _ref152 = _slicedToArray(_ref151, 2),
      key = _ref152[0],
      qty = _ref152[1];
    var offered = tradeOffer[key] || 0;
    var emojis = {
      slime: '🟢',
      bat: '🦇',
      skeleton: '💀',
      crab: '🦀',
      golem: '🪨',
      logs: '🪵',
      oakLogs: '🟤',
      magicLogs: '✨',
      rawFish: '🐟',
      cookedFish: '🍳',
      rareFish: '⭐',
      burntFish: '🔥'
    };
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      style: {
        padding: '4px 2px',
        borderRadius: 6,
        border: offered > 0 ? '2px solid #3dd497' : '1px solid rgba(255,255,255,.1)',
        background: offered > 0 ? 'rgba(61,212,151,.15)' : 'rgba(255,255,255,.04)',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative'
      },
      onClick: function onClick() {
        return setTradeOffer(function (prev) {
          var n = _objectSpread({}, prev);
          n[key] = ((n[key] || 0) + 1) % (qty + 1);
          if (n[key] === 0) delete n[key];
          return n;
        });
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16
      }
    }, emojis[key] || '📦'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, qty), offered > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -2,
        right: -2,
        fontSize: 8,
        fontWeight: 900,
        color: '#fff',
        background: '#3dd497',
        borderRadius: 6,
        padding: '0 3px',
        minWidth: 12
      }
    }, offered));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)'
    }
  }, "\uD83D\uDCB0 Gold:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    max: rpgState.coins || 0,
    value: tradeOffer._gold || 0,
    onChange: function onChange(e) {
      return setTradeOffer(function (prev) {
        return _objectSpread(_objectSpread({}, prev), {}, {
          _gold: Math.min(rpgState.coins, Math.max(0, parseInt(e.target.value) || 0))
        });
      });
    },
    style: {
      width: 60,
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 4,
      color: '#fff',
      fontSize: 11,
      padding: '3px 6px',
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)'
    }
  }, "/ ", rpgState.coins)), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#3dd497',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) {
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'trade_offer',
          payload: {
            from: S.myId,
            fromName: S.myName,
            target: tradeTarget.id,
            offer: tradeOffer
          }
        });
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Trade sent!',
          color: '#3dd497',
          ts: Date.now()
        });
        setShowTrade(false);
      }
    }
  }, "\uD83D\uDCE8 Send Trade Offer"))), incomingTrade && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 260
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCE8 Trade from ", incomingTrade.fromName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 6
    }
  }, "They offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 8
    }
  }, Object.entries(incomingTrade.offer || {}).filter(function (_ref153) {
    var _ref154 = _slicedToArray(_ref153, 1),
      k = _ref154[0];
    return k !== '_gold';
  }).map(function (_ref155) {
    var _ref156 = _slicedToArray(_ref155, 2),
      key = _ref156[0],
      qty = _ref156[1];
    var emojis = {
      slime: '🟢',
      bat: '🦇',
      skeleton: '💀',
      crab: '🦀',
      golem: '🪨',
      logs: '🪵',
      oakLogs: '🟤',
      magicLogs: '✨',
      rawFish: '🐟',
      cookedFish: '🍳',
      rareFish: '⭐',
      burntFish: '🔥'
    };
    return /*#__PURE__*/React.createElement("span", {
      key: key,
      style: {
        background: 'rgba(255,255,255,.08)',
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11
      }
    }, emojis[key] || key, " \xD7", qty);
  }), (((_incomingTrade$offer = incomingTrade.offer) === null || _incomingTrade$offer === void 0 ? void 0 : _incomingTrade$offer._gold) || 0) > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'rgba(245,197,66,.15)',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      color: '#f5c542'
    }
  }, "\uD83D\uDCB0 ", incomingTrade.offer._gold, "G")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#3dd497',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      /* Accept: add offered items to our inventory */
      Object.entries(incomingTrade.offer || {}).forEach(function (_ref157) {
        var _ref158 = _slicedToArray(_ref157, 2),
          k = _ref158[0],
          v = _ref158[1];
        if (k === '_gold') R.coins += v;else if (R.inventory) R.inventory[k] = (R.inventory[k] || 0) + v;
      });
      setRpgState(_objectSpread({}, R));
      /* Notify sender */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'trade_accept',
        payload: {
          from: S.myId,
          target: incomingTrade.from,
          offer: incomingTrade.offer
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Trade accepted!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setIncomingTrade(null);
    }
  }, "\u2705 Accept"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.15)',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'trade_reject',
        payload: {
          from: S.myId,
          target: incomingTrade.from
        }
      });
      setIncomingTrade(null);
    }
  }, "\u274C Decline")))), showInventory && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowInventory(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowInventory(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83C\uDF92 Equipment"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Active: ", rpgState.activeSlot === 'ranged' ? 'Ranged' : 'Melee', " \xB7 \uD83D\uDCB0 ", rpgState.coins, "g"), [{
    label: 'Melee Weapon',
    wpn: rpgState.weapon,
    slot: 'melee'
  }, {
    label: 'Ranged Weapon',
    wpn: rpgState.rangedWeapon,
    slot: 'ranged'
  }].map(function (_ref159) {
    var _ELEMENTS$wpn$element5, _ELEMENTS$wpn$element6, _ELEMENTS$wpn$element7, _ELEMENTS$wpn$element8, _ELEMENTS$wpn$element9, _ELEMENTS$wpn$element0, _ELEMENTS$wpn$element1, _ELEMENTS$wpn$element10;
    var label = _ref159.label,
      wpn = _ref159.wpn,
      slot = _ref159.slot;
    if (!wpn) return null;
    var wt = WEAPON_TYPES[wpn.type];
    var rt = RARITY_TIERS[wpn.tier];
    var isActive = rpgState.activeSlot === slot || slot === 'melee' && rpgState.activeSlot !== 'ranged';
    var dmg = Math.round(calcWeaponDmg(wpn.type, rpgState || {}, wpn.tierMult));
    return /*#__PURE__*/React.createElement("div", {
      key: slot,
      style: {
        marginBottom: 8,
        padding: 10,
        borderRadius: 10,
        background: isActive ? 'rgba(245,197,66,.08)' : 'rgba(255,255,255,.03)',
        border: "1.5px solid ".concat(isActive ? 'rgba(245,197,66,.3)' : 'rgba(255,255,255,.08)'),
        position: 'relative'
      }
    }, isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 4,
        right: 8,
        fontSize: 7,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, "ACTIVE"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: (rt === null || rt === void 0 ? void 0 : rt.color) || '#888'
      }
    }, wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, rt === null || rt === void 0 ? void 0 : rt.label, " ", wt === null || wt === void 0 ? void 0 : wt.label, " \xB7 ", wpn.tierMult, "\xD7 mult"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, dmg)), /*#__PURE__*/React.createElement("span", null, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.speed) || 1)), /*#__PURE__*/React.createElement("span", null, "RNG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.range) || 0))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center'
      }
    }, wpn.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element5 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element5 === void 0 ? void 0 : _ELEMENTS$wpn$element5.color) + '22',
        color: (_ELEMENTS$wpn$element6 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element6 === void 0 ? void 0 : _ELEMENTS$wpn$element6.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element7 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element7 === void 0 ? void 0 : _ELEMENTS$wpn$element7.color) + '44'
      }
    }, "E1: ", wpn.element1, " (", (_ELEMENTS$wpn$element8 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element8 === void 0 ? void 0 : _ELEMENTS$wpn$element8.status, ")"), wpn.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element9 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element9 === void 0 ? void 0 : _ELEMENTS$wpn$element9.color) + '22',
        color: (_ELEMENTS$wpn$element0 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element0 === void 0 ? void 0 : _ELEMENTS$wpn$element0.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element1 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element1 === void 0 ? void 0 : _ELEMENTS$wpn$element1.color) + '44'
      }
    }, "E2: ", wpn.element2, " (", (_ELEMENTS$wpn$element10 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element10 === void 0 ? void 0 : _ELEMENTS$wpn$element10.status, ")"), wpn.isVolatile && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(255,94,108,.2)',
        color: '#ff5e6c',
        border: '1px solid rgba(255,94,108,.3)'
      }
    }, "\u26A1VOLATILE +30%"), !wpn.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No elements")));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: 'rgba(255,255,255,.55)',
      margin: '10px 0 6px',
      letterSpacing: 0.5
    }
  }, "WORN ARMOUR"), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 8, marginBottom: 8 }
  }, [
    { slot: 'chest', name: 'Steel Plate', sub: 'Chest', icon: '/sprites/gear/icons/steelplate.png' },
    { slot: 'legs', name: 'Steel Greaves', sub: 'Legs', icon: '/sprites/gear/icons/steelgreaves.png' },
    /* v2.3.756: the t-shirt layer -- worn UNDER the chest armour (both can
       be on at once; armour always renders on top). */
    { slot: 'shirt', name: 'T-Shirt', sub: 'Chest \u00b7 under armour', icon: '/sprites/gear/icons/tshirt.png' }
  ].map(function (it) {
    var on = gearWorn[it.slot];
    return /*#__PURE__*/React.createElement("div", {
      key: 'wornarmor-' + it.slot,
      style: {
        flex: 1,
        padding: 8,
        borderRadius: 10,
        background: on ? 'rgba(61,212,151,.07)' : 'rgba(255,255,255,.03)',
        border: "1.5px solid ".concat(on ? 'rgba(61,212,151,.35)' : 'rgba(255,255,255,.08)'),
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: it.icon,
      alt: it.name,
      draggable: false,
      style: {
        width: 40,
        height: 40,
        imageRendering: 'pixelated',
        filter: on ? 'none' : 'grayscale(1) brightness(.6)',
        userSelect: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: on ? '#3dd497' : 'rgba(255,255,255,.55)'
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 5
      }
    }, it.sub), /*#__PURE__*/React.createElement("button", {
      type: 'button',
      onClick: function onClick() { toggleGearSlot(it.slot); },
      style: {
        width: '100%',
        padding: '4px 0',
        fontSize: 9,
        fontWeight: 700,
        borderRadius: 7,
        border: '1px solid rgba(255,255,255,.2)',
        background: on ? 'rgba(255,94,108,.25)' : 'rgba(61,212,151,.25)',
        color: '#fff',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }
    }, on ? 'Unequip' : 'Equip'));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: ((_RARITY_TIERS$rpgStat = RARITY_TIERS[(_rpgState$armor2 = rpgState.armor) === null || _rpgState$armor2 === void 0 ? void 0 : _rpgState$armor2.tier]) === null || _RARITY_TIERS$rpgStat === void 0 ? void 0 : _RARITY_TIERS$rpgStat.color) || '#888'
    }
  }, ((_rpgState$armor3 = rpgState.armor) === null || _rpgState$armor3 === void 0 ? void 0 : _rpgState$armor3.name) || 'No Armor'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, (_rpgState$armor4 = rpgState.armor) !== null && _rpgState$armor4 !== void 0 && _rpgState$armor4.attunement ? "Attuned: ".concat(rpgState.armor.attunement) : 'No attunement')))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: rpgState.amulet ? 'rgba(245,197,66,.05)' : 'rgba(255,255,255,.03)',
      border: rpgState.amulet ? '1px solid rgba(245,197,66,.2)' : '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDCFF"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.amulet ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, rpgState.amulet.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_AMULET_TIERS$rpgStat = AMULET_TIERS[rpgState.amulet.tier]) === null || _AMULET_TIERS$rpgStat === void 0 ? void 0 : _AMULET_TIERS$rpgStat.label) || 'Simple', " Amulet", rpgState.amulet.gem && function (_ELEMENTS$rpgState$am3) {
    var bonus = getAmuletBonus(rpgState.amulet);
    if (!bonus) return null;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        color: ((_ELEMENTS$rpgState$am3 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am3 === void 0 ? void 0 : _ELEMENTS$rpgState$am3.color) || '#fff'
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit);
  }()), rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 4px',
      borderRadius: 3,
      background: ((_ELEMENTS$rpgState$am4 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am4 === void 0 ? void 0 : _ELEMENTS$rpgState$am4.color) + '22',
      color: (_ELEMENTS$rpgState$am5 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am5 === void 0 ? void 0 : _ELEMENTS$rpgState$am5.color,
      border: '1px solid ' + ((_ELEMENTS$rpgState$am6 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am6 === void 0 ? void 0 : _ELEMENTS$rpgState$am6.color) + '44'
    }
  }, rpgState.amulet.gem, " gem")), !rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)',
      marginTop: 2
    }
  }, "No gem \u2014 visit the Enchanter to slot one")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#888'
    }
  }, "No Amulet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Craft at Blacksmith from gold bars (nuggets: ", rpgState.goldNuggets || 0, "/", NUGGETS_PER_BAR, ", bars: ", rpgState.goldBars || 0, ")"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: rpgState.shield ? 'rgba(91,82,255,.05)' : 'rgba(255,255,255,.03)',
      border: rpgState.shield ? '1px solid rgba(91,82,255,.2)' : '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.shield ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#5b52ff'
    }
  }, rpgState.shield.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_BLACKSMITH_TIERS$rpg = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg.label) || 'Basic', " \xB7 ", ((_BLACKSMITH_TIERS$rpg2 = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg2 === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg2.tierMult) || 1, "\xD7", rpgState.shield.gem && function (_ELEMENTS$rpgState$sh3) {
    var bonus = getShieldBonus(rpgState.shield);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$rpgState$sh3 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh3 === void 0 ? void 0 : _ELEMENTS$rpgState$sh3.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.35)'
    }
  }, rpgState.shield.reforgeBonus ? rpgState.shield.reforgeBonus.label + ' +' + rpgState.shield.reforgeBonus.value + rpgState.shield.reforgeBonus.unit : '', rpgState.shield.hardenBonus ? ' · ' + rpgState.shield.hardenBonus.label + ' +' + rpgState.shield.hardenBonus.value + rpgState.shield.hardenBonus.unit : '', !rpgState.shield.reforgeBonus && !rpgState.shield.gem && 'No bonuses yet')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#888'
    }
  }, "No Shield"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Craft at the Blacksmith from ore"))))), function () {
    var inv = rpgState.inventory || {};
    var cookedFish = Object.entries(inv).filter(function (_ref160) {
      var _ref161 = _slicedToArray(_ref160, 2),
        k = _ref161[0],
        v = _ref161[1];
      return v > 0 && k.startsWith('cooked_');
    });
    if (cookedFish.length === 0) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#3dd497',
        marginTop: 4,
        marginBottom: 4
      }
    }, "\uD83C\uDF7D\uFE0F Food (", cookedFish.reduce(function (s, e) {
      return s + e[1];
    }, 0), ")"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap',
        marginBottom: 6
      }
    }, cookedFish.map(function (_ref162) {
      var _ref163 = _slicedToArray(_ref162, 2),
        key = _ref163[0],
        qty = _ref163[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      var healAmt = getFishHealAmount(key);
      var atFull = rpgState.hp >= rpgState.maxHp;
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        style: {
          padding: '3px 6px',
          borderRadius: 5,
          fontSize: 8,
          cursor: 'pointer',
          background: atFull ? 'rgba(255,255,255,.04)' : 'rgba(61,220,151,.1)',
          border: atFull ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(61,220,151,.2)',
          color: atFull ? 'rgba(255,255,255,.3)' : '#3dd497',
          fontWeight: 700,
          textTransform: 'capitalize'
        },
        onClick: function onClick() {
          if (atFull) return;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          var healed = Math.min(healAmt, R.maxHp - R.hp);
          R.hp = Math.min(R.maxHp, R.hp + healAmt);
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: '+' + healed + ' HP',
            color: '#3dd497',
            ts: Date.now()
          });
          /* (Eat handler patched to send eat_request -- see block above.) */
          if (stateRef.current._serverMonsters && stateRef.current.channel) {
            try { stateRef.current.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
          }
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "\uD83D\uDC1F ", fishName, " \xD7", qty, " (+", healAmt, "HP)");
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#a78bfa',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCE6 Weapon Stash (", (rpgState.weaponStash || []).length, "/", WEAPON_STASH_MAX, ")"), (rpgState.weaponStash || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Empty. Weapon drops are auto-stashed here for comparison."), (rpgState.weaponStash || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginBottom: 8
    }
  }, (rpgState.weaponStash || []).map(function (sw, si) {
    var _WEAPON_TYPES$current, _ELEMENTS$sw$element, _ELEMENTS$sw$element2, _ELEMENTS$sw$element3, _ELEMENTS$sw$element4, _ELEMENTS$sw$element5, _ELEMENTS$sw$element6, _WEAPON_TYPES$sw$type2;
    var swt = WEAPON_TYPES[sw.type];
    var srt = RARITY_TIERS[sw.tier];
    var isRanged = (swt === null || swt === void 0 ? void 0 : swt.type) === 'ranged';
    var current = isRanged ? rpgState.rangedWeapon : rpgState.weapon;
    var stashDmg = Math.round(calcWeaponDmg(sw.type, rpgState || {}, sw.tierMult));
    var curDmg = current ? Math.round(calcWeaponDmg(current.type, rpgState || {}, current.tierMult)) : 0;
    var dmgDiff = stashDmg - curDmg;
    var stashSpd = (swt === null || swt === void 0 ? void 0 : swt.speed) || 1;
    var curSpd = current ? ((_WEAPON_TYPES$current = WEAPON_TYPES[current.type]) === null || _WEAPON_TYPES$current === void 0 ? void 0 : _WEAPON_TYPES$current.speed) || 1 : 1;
    var spdDiff = stashSpd - curSpd;
    var stashDps = Math.round(stashDmg * stashSpd);
    var curDps = Math.round(curDmg * curSpd);
    var dpsDiff = stashDps - curDps;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, (swt === null || swt === void 0 ? void 0 : swt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: (srt === null || srt === void 0 ? void 0 : srt.color) || '#888'
      }
    }, sw.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, srt === null || srt === void 0 ? void 0 : srt.label, " ", swt === null || swt === void 0 ? void 0 : swt.label, " \xB7 ", sw.tierMult, "\xD7 \xB7 ", isRanged ? 'Ranged' : 'Melee'))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        fontSize: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashDmg), dmgDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dmgDiff > 0 ? '#3dd497' : '#ff5e6c',
        marginLeft: 2,
        fontSize: 7
      }
    }, dmgDiff > 0 ? '▲' : '▼', Math.abs(dmgDiff))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashSpd), spdDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: spdDiff > 0 ? '#3dd497' : '#ff5e6c',
        marginLeft: 2,
        fontSize: 7
      }
    }, spdDiff > 0 ? '▲' : '▼', Math.abs(spdDiff).toFixed(1))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "DPS: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashDps), dpsDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dpsDiff > 0 ? '#3dd497' : '#ff5e6c',
        marginLeft: 2,
        fontSize: 7
      }
    }, dpsDiff > 0 ? '▲' : '▼', Math.abs(dpsDiff)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        marginBottom: 4
      }
    }, sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element === void 0 ? void 0 : _ELEMENTS$sw$element.color) + '22',
        color: (_ELEMENTS$sw$element2 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element2 === void 0 ? void 0 : _ELEMENTS$sw$element2.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element3 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element3 === void 0 ? void 0 : _ELEMENTS$sw$element3.color) + '44'
      }
    }, sw.element1), sw.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element4 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element4 === void 0 ? void 0 : _ELEMENTS$sw$element4.color) + '22',
        color: (_ELEMENTS$sw$element5 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element5 === void 0 ? void 0 : _ELEMENTS$sw$element5.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element6 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element6 === void 0 ? void 0 : _ELEMENTS$sw$element6.color) + '44'
      }
    }, sw.element2), sw.isVolatile && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: '#ff5e6c'
      }
    }, "\u26A1VOL"), !sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "No elements"), function () {
      var req = getEquipReqLabel(sw, sw.type);
      if (!req) return null;
      var met = (rpgState[req.stat] || 0) >= req.req;
      return /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: met ? '#3dd497' : '#ff5e6c',
          marginLeft: 4
        }
      }, req.label, " ", rpgState[req.stat] || 0, "/", req.req, " ", met ? '✓' : '✗');
    }()), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 5,
        border: '1px solid rgba(91,82,255,.4)',
        background: 'rgba(91,82,255,.15)',
        color: '#a78bfa',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var swapWpn = R.weaponStash[si];
        /* Check stat requirement */
        if (!canEquipItem(R, swapWpn, swapWpn.type)) {
          var req = getEquipReqLabel(swapWpn, swapWpn.type);
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + req.req + ' ' + req.label + ' (have ' + (R[req.stat] || 0) + ')',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var wDef = WEAPON_TYPES[swapWpn.type];
        var swIsRanged = (wDef === null || wDef === void 0 ? void 0 : wDef.type) === 'ranged';
        var old = swIsRanged ? R.rangedWeapon : R.weapon;
        /* Equip from stash, put old weapon in stash */
        if (swIsRanged) R.rangedWeapon = swapWpn;else R.weapon = swapWpn;
        R.weaponStash[si] = old;
        /* Server-authoritative equipment in MP: tell the worker to
           perform the same swap so its view stays in sync.  The
           swap above is local prediction; player_state arrives
           shortly with the worker's authoritative weapon + stash. */
        {
          var _Seq = stateRef.current;
          if (_Seq._serverMonsters && _Seq.channel) {
            try { _Seq.channel.send({ type: 'equip_request', payload: { stashIdx: si, slot: swIsRanged ? 'rangedWeapon' : 'weapon' } }); } catch (e) {}
          }
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "\u2694\uFE0F Equip"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 5,
        border: '1px solid rgba(245,197,66,.3)',
        background: 'rgba(245,197,66,.1)',
        color: '#f5c542',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _WEAPON_TYPES$sold$ty2;
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var sold = R.weaponStash[si];
        var sellVal = Math.ceil((sold.tierMult || 1) * (((_WEAPON_TYPES$sold$ty2 = WEAPON_TYPES[sold.type]) === null || _WEAPON_TYPES$sold$ty2 === void 0 ? void 0 : _WEAPON_TYPES$sold$ty2.base) || 30) * 0.5);
        /* Server-authoritative stash sell in MP: worker validates the
           stash entry exists, computes the same sell value, credits
           coins, splices the stash.  Local mutation stays as snappy
           visual prediction; player_state arrives shortly with the
           authoritative stash + coins. */
        {
          var _Ssw = stateRef.current;
          if (_Ssw._serverMonsters && _Ssw.channel) {
            try { _Ssw.channel.send({ type: 'sell_weapon', payload: { stashIdx: si } }); } catch (e) {}
          }
        }
        R.coins += sellVal;
        if (R._compStats) R._compStats.totalGoldEarned += sellVal;
        R.weaponStash.splice(si, 1);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        var S = stateRef.current;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: '+' + sellVal + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(400, 0.05, 0.08, 'sine');
      }
    }, "\uD83D\uDCB0 Sell (", Math.ceil((sw.tierMult || 1) * (((_WEAPON_TYPES$sw$type2 = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type2 === void 0 ? void 0 : _WEAPON_TYPES$sw$type2.base) || 30) * 0.5), "g)")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#00d4b8',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCD6 Codex: ", discoveredCollisions.size, " collisions discovered"), discoveredCollisions.size > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap',
      marginBottom: 6
    }
  }, _toConsumableArray(discoveredCollisions).slice(0, 20).map(function (cid) {
    var coll = Object.values(COLLISION_TABLE).find(function (c) {
      return c.id === cid;
    });
    return coll ? /*#__PURE__*/React.createElement("span", {
      key: cid,
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(0,212,184,.1)',
        color: '#00d4b8',
        border: '1px solid rgba(0,212,184,.2)'
      }
    }, coll.name) : null;
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginTop: 8,
      marginBottom: 4
    }
  }, "\uD83E\uDEA4 Pets: ", ((_rpgState$lifeSkills37 = rpgState.lifeSkills) === null || _rpgState$lifeSkills37 === void 0 || (_rpgState$lifeSkills37 = _rpgState$lifeSkills37.pets) === null || _rpgState$lifeSkills37 === void 0 ? void 0 : _rpgState$lifeSkills37.length) || 0, "/", MAX_PET_SLOTS, ((_rpgState$lifeSkills38 = rpgState.lifeSkills) === null || _rpgState$lifeSkills38 === void 0 ? void 0 : _rpgState$lifeSkills38.trapping) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, " \xB7 Trapping Lv", rpgState.lifeSkills.trapping.level)), (((_rpgState$lifeSkills39 = rpgState.lifeSkills) === null || _rpgState$lifeSkills39 === void 0 ? void 0 : _rpgState$lifeSkills39.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "No pets. Weaken a monster to <20% HP then tap \uD83E\uDEA4 to capture!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4,
      marginBottom: 6
    }
  }, (((_rpgState$lifeSkills40 = rpgState.lifeSkills) === null || _rpgState$lifeSkills40 === void 0 ? void 0 : _rpgState$lifeSkills40.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills41, _ELEMENTS$pet$element2;
    var isActive = ((_rpgState$lifeSkills41 = rpgState.lifeSkills) === null || _rpgState$lifeSkills41 === void 0 ? void 0 : _rpgState$lifeSkills41.activePet) === pi;
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 6,
        borderRadius: 8,
        textAlign: 'center',
        background: isActive ? 'rgba(245,197,66,.1)' : 'rgba(255,255,255,.03)',
        border: "1px solid ".concat(isActive ? 'rgba(245,197,66,.3)' : 'rgba(255,255,255,.08)'),
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        R.lifeSkills.activePet = isActive ? null : pi;
        stateRef.current._petX = null; /* reset pet position */
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: ((_ELEMENTS$pet$element2 = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element2 === void 0 ? void 0 : _ELEMENTS$pet$element2.color) || '#888'
      }
    }, pet.element), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, "ACTIVE"));
  })), (((_rpgState$lifeSkills42 = rpgState.lifeSkills) === null || _rpgState$lifeSkills42 === void 0 ? void 0 : _rpgState$lifeSkills42.pets) || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)'
    }
  }, "Tap a pet to set active. Active pet follows you and auto-collects loot within ", PET_LOOT_RADIUS, "px."))), showSkills && rpgState && /*#__PURE__*/React.createElement(SkillsPanel, { rpgState: rpgState, stateRef: stateRef, setShowSkills: setShowSkills }), false && tutorialStep >= 0 && tutorialStep < 7 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 180,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      textAlign: 'center',
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.75)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      padding: '8px 16px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.12)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setTutorialStep(10);
      try {
        localStorage.setItem('bt_tutorial', '10');
      } catch (e) {}
    },
    style: {
      position: 'absolute',
      top: 4,
      right: 8,
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,.4)',
      fontSize: 14,
      cursor: 'pointer',
      padding: '0 2px',
      lineHeight: 1
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      fontFamily: 'Source Sans 3,sans-serif',
      letterSpacing: '.03em',
      paddingRight: 16
    }
  }, tutorialStep === 0 && '👋 Welcome! Use the LEFT STICK to move around.', tutorialStep === 1 && '💨 Nice! Now SWIPE the screen to dodge roll!', tutorialStep === 2 && '⚔️ Great dodge! Hold the RIGHT STICK to attack enemies.', tutorialStep === 3 && '💀 First kill! Head to the edge of town to explore the wild.', tutorialStep === 4 && '🗺️ Explore! Walk to the edge of town to enter a combat zone.', tutorialStep === 5 && '⚡ Out in the wild! Monsters here are tougher. Reach Level 3 to prove yourself.', tutorialStep === 6 && '🎉 Tutorial complete! The world is yours. Discover all 36 collisions!'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginTop: 3
    }
  }, "Step ", Math.min(tutorialStep + 1, 7), "/7"))), levelUpMsg && Date.now() - levelUpMsg.ts < 4000 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 22,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '55%',
      transform: 'translate(-50%,-50%)',
      width: 220,
      height: 220,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(245,197,66,.35) 0%, transparent 70%)',
      opacity: Math.max(0, 1 - (Date.now() - levelUpMsg.ts) / 3500)
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      transform: "translateY(".concat(Math.max(0, 30 - (Date.now() - levelUpMsg.ts) / 1000 * 40), "px) scale(").concat(Math.min(1.1, 0.8 + (Date.now() - levelUpMsg.ts) / 3000), ")"),
      opacity: Date.now() - levelUpMsg.ts < 3500 ? Math.min(1, (Date.now() - levelUpMsg.ts) / 400) * Math.max(0, 1 - (Date.now() - levelUpMsg.ts) / 3500) : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      fontWeight: 900,
      fontFamily: 'Source Sans 3,sans-serif',
      color: '#f5c542',
      textShadow: '0 0 30px rgba(245,197,66,.8), 0 0 60px rgba(245,197,66,.4), 0 2px 4px rgba(0,0,0,.6)',
      letterSpacing: '.15em'
    }
  }, "LEVEL UP!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: '#fff',
      textShadow: '0 2px 8px rgba(0,0,0,.7)',
      marginTop: 6
    }
  }, "Level ", levelUpMsg.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(255,255,255,.6)',
      marginTop: 4
    }
  }, "+5 Capacity \xB7 +5 Technique"))), rpgState && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 44,
      left: 8,
      zIndex: 18,
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.6)'
    }
  }, function () {
    var S = stateRef.current;
    if (!S) return null;
    var effects = [];
    if (S._cursedUntil && Date.now() < S._cursedUntil) {
      var rem = Math.ceil((S._cursedUntil - Date.now()) / 1000);
      effects.push({
        icon: '🔮',
        label: 'Cursed',
        color: '#8E44AD',
        time: rem + 's',
        desc: '-30% dmg'
      });
    }
    if (S._bleedUntil && Date.now() < S._bleedUntil) {
      var _rem = Math.ceil((S._bleedUntil - Date.now()) / 1000);
      effects.push({
        icon: '🩸',
        label: 'Bleed',
        color: '#cc3333',
        time: _rem + 's',
        desc: 'DoT'
      });
    }
    if (S._dmgBuff && Date.now() < S._dmgBuff) {
      var _rem2 = Math.ceil((S._dmgBuff - Date.now()) / 1000);
      effects.push({
        icon: '⚔️',
        label: 'Dmg+',
        color: '#ea580c',
        time: _rem2 + 's',
        desc: '+20%'
      });
    }
    if (S._regenBuff && Date.now() < S._regenBuff) {
      var _rem3 = Math.ceil((S._regenBuff - Date.now()) / 1000);
      effects.push({
        icon: '💚',
        label: 'Regen',
        color: '#3dd497',
        time: _rem3 + 's',
        desc: 'HP/s'
      });
    }
    if (S._resistBuff && Date.now() < S._resistBuff) {
      var _rem4 = Math.ceil((S._resistBuff - Date.now()) / 1000);
      effects.push({
        icon: '🛡️',
        label: 'Resist',
        color: '#60a5fa',
        time: _rem4 + 's',
        desc: '-15%'
      });
    }
    if (S._spdBuff && Date.now() < S._spdBuff) {
      var _rem5 = Math.ceil((S._spdBuff - Date.now()) / 1000);
      effects.push({
        icon: '💨',
        label: 'Speed',
        color: '#f5c542',
        time: _rem5 + 's',
        desc: '+15%'
      });
    }
    if (effects.length === 0) return null;
    return React.createElement('div', {
      style: {
        display: 'flex',
        gap: 3,
        marginTop: 3,
        flexWrap: 'wrap'
      }
    }, effects.map(function (e, i) {
      return React.createElement('div', {
        key: i,
        style: {
          padding: '1px 4px',
          borderRadius: 3,
          background: e.color + '20',
          border: '1px solid ' + e.color + '40',
          fontSize: 7,
          color: e.color,
          display: 'flex',
          gap: 2,
          alignItems: 'center'
        }
      }, React.createElement('span', null, e.icon), React.createElement('span', null, e.time));
    }));
  }(), ((_stateRef$current30 = stateRef.current) === null || _stateRef$current30 === void 0 ? void 0 : _stateRef$current30._pvpReputation) && stateRef.current._pvpReputation !== 'neutral' && /*#__PURE__*/React.createElement("span", {
    style: {
      color: ((_REPUTATION$stateRef$ = REPUTATION[stateRef.current._pvpReputation]) === null || _REPUTATION$stateRef$ === void 0 ? void 0 : _REPUTATION$stateRef$.color) || '#888',
      fontSize: 8,
      padding: '0 4px',
      borderRadius: 3,
      marginTop: 2,
      display: 'inline-block',
      background: 'rgba(0,0,0,.4)'
    }
  }, (_REPUTATION$stateRef$2 = REPUTATION[stateRef.current._pvpReputation]) === null || _REPUTATION$stateRef$2 === void 0 ? void 0 : _REPUTATION$stateRef$2.label), ((_stateRef$current31 = stateRef.current) === null || _stateRef$current31 === void 0 ? void 0 : _stateRef$current31._inDuel) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ff5e6c',
      fontSize: 8,
      fontWeight: 800,
      animation: 'pulse-dot 1s ease-in-out infinite'
    }
  }, "\u2694\uFE0F DUEL")), rpgState && function () {
    var activeQuests = Object.entries(rpgState._quests || {}).filter(function (_ref190) {
      var _ref191 = _slicedToArray(_ref190, 2),
        qid = _ref191[0],
        status = _ref191[1];
      return status === QUEST_STATUS.active;
    }).map(function (_ref192) {
      var _ref193 = _slicedToArray(_ref192, 1),
        qid = _ref193[0];
      return QUEST_CHAINS[qid];
    }).filter(Boolean);
    if (activeQuests.length === 0) return null;
    var q = activeQuests[0];
    var done = q.check(rpgState, stateRef.current);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 56,
        left: 8,
        zIndex: 17,
        background: 'rgba(0,0,0,.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: '4px 10px',
        borderRadius: 6,
        border: "1px solid ".concat(done ? 'rgba(61,220,151,.3)' : 'rgba(255,255,255,.1)'),
        maxWidth: 200
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: done ? '#3dd497' : '#f5c542'
      }
    }, "\uD83D\uDCDC ", q.title, " ", done ? '✓' : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, q.desc));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 18,
      fontSize: 14,
      fontWeight: 800,
      letterSpacing: '.08em',
      fontFamily: 'Source Sans 3,sans-serif',
      color: function (_stateRef$current32, _ELEMENTS$z$element4) {
        var z = ZONES[((_stateRef$current32 = stateRef.current) === null || _stateRef$current32 === void 0 ? void 0 : _stateRef$current32.currentZone) || 'town'];
        return z !== null && z !== void 0 && z.element ? (_ELEMENTS$z$element4 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element4 === void 0 ? void 0 : _ELEMENTS$z$element4.color : '#e8eaf8';
      }(),
      /* v2.3.820: was a solid black bar (background:#000 + border) that
         clipped the player when they ran to the top map edge.  Now a
         transparent text overlay -- the map fills the full play area to
         the top, the zone/level label just floats over it with a shadow
         for legibility, and nothing can clip behind it. */
      background: 'transparent',
      padding: '6px 12px',
      textAlign: 'center',
      textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)',
      pointerEvents: 'none',
    }
  }, ((_ZONES = ZONES[((_stateRef$current33 = stateRef.current) === null || _stateRef$current33 === void 0 ? void 0 : _stateRef$current33.currentZone) || 'town']) === null || _ZONES === void 0 ? void 0 : _ZONES.name) || 'Town', function (_stateRef$current34, _stateRef$current35, _stateRef$current36, _z$level) {
    var z = ZONES[((_stateRef$current34 = stateRef.current) === null || _stateRef$current34 === void 0 ? void 0 : _stateRef$current34.currentZone) || 'town'];
    var depth = (_stateRef$current35 = stateRef.current) === null || _stateRef$current35 === void 0 ? void 0 : _stateRef$current35._currentDepth;
    if (!depth || depth === 'shallow' || ((_stateRef$current36 = stateRef.current) === null || _stateRef$current36 === void 0 ? void 0 : _stateRef$current36.currentZone) === 'town') return (z === null || z === void 0 || (_z$level = z.level) === null || _z$level === void 0 ? void 0 : _z$level[1]) > 0 ? " (Lv".concat(z.level[0], "-").concat(z.level[1], ")") : '';
    var dc = DEPTH_CONFIG[depth];
    var lr = (dc === null || dc === void 0 ? void 0 : dc.lvlRange) || [1, 10];
    return " \u2014 ".concat(depth.toUpperCase(), " (Lv").concat(lr[0], "-").concat(lr[1], ")");
  }()), function (_stateRef$current37, _ZONES$nearest$zone) {
    var dd = (_stateRef$current37 = stateRef.current) === null || _stateRef$current37 === void 0 ? void 0 : _stateRef$current37._deathDrops;
    if (!dd || dd.length === 0) return null;
    var active = dd.filter(function (d) {
      return Date.now() < d.expiry;
    });
    if (active.length === 0) return null;
    var nearest = active[0];
    var timeLeft = Math.ceil((nearest.expiry - Date.now()) / 1000);
    var itemCount = nearest.items.reduce(function (s, i) {
      return s + i.qty;
    }, 0);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 18,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'Source Sans 3,sans-serif',
        background: 'rgba(234,88,12,.25)',
        padding: '3px 12px',
        borderRadius: 6,
        border: '1px solid rgba(234,88,12,.5)',
        color: '#ea580c',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: timeLeft < 10 ? 'promptPulse 0.5s ease-in-out infinite' : 'none'
      }
    }, "\uD83D\uDC80 ", itemCount, " items scattered in ", ((_ZONES$nearest$zone = ZONES[nearest.zone]) === null || _ZONES$nearest$zone === void 0 ? void 0 : _ZONES$nearest$zone.name) || nearest.zone, " \u2014 ", timeLeft, "s to recover!");
  }(), showPlayerList && /*#__PURE__*/React.createElement("div", {
    className: "bt-plist"
  }, playerList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 10px',
      textAlign: 'center',
      fontSize: 11,
      color: 'rgba(255,255,255,.4)'
    }
  }, "No other players nearby"), playerList.map(function (p) {
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "bt-plist-item",
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        setInspectPlayer(p);
        setShowPlayerList(false);
      },
      onMouseDown: function onMouseDown(e) {
        e.preventDefault();
        setInspectPlayer(p);
        setShowPlayerList(false);
      }
    }, p.avatar ? /*#__PURE__*/React.createElement("img", {
      className: "bt-plist-av",
      src: p.avatar,
      alt: ""
    }) : /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-dot",
      style: {
        background: p.color
      }
    }, p.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-name"
    }, p.name), p.bro && /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-sub"
    }, "Bro #", p.bro.ID, " \xB7 Rank #", p.bro.rank)));
  })), inspectPlayer && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '85vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, "\u2715"), inspectPlayer.avatar ? /*#__PURE__*/React.createElement("img", {
    className: "bt-inspect-av",
    src: inspectPlayer.avatar,
    alt: "",
    style: {
      borderColor: inspectPlayer.color
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: inspectPlayer.color,
      margin: '0 auto 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      fontWeight: 800,
      color: '#fff',
      border: '2.5px solid ' + inspectPlayer.color
    }
  }, inspectPlayer.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-name",
    style: {
      color: inspectPlayer.color
    }
  }, inspectPlayer.clanTag && /*#__PURE__*/React.createElement("span", {
    style: {
      color: inspectPlayer.clanColor1 || '#a78bfa'
    }
  }, "[", inspectPlayer.clanTag, "] "), inspectPlayer.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, inspectPlayer.rpgLv && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Lv ", inspectPlayer.rpgLv), inspectPlayer.rep && inspectPlayer.rep !== 'neutral' && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: ((_REPUTATION$inspectPl = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl === void 0 ? void 0 : _REPUTATION$inspectPl.color) || '#888'
    }
  }, ((_REPUTATION$inspectPl2 = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl2 === void 0 ? void 0 : _REPUTATION$inspectPl2.label) || inspectPlayer.rep), inspectPlayer.pet && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, inspectPlayer.pet)), inspectPlayer.rpgData && function () {
    var d = inspectPlayer.rpgData;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Equipment"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2px 8px',
        fontSize: 8,
        color: 'rgba(255,255,255,.5)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u2694\uFE0F Weapon"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff',
        textAlign: 'right'
      }
    }, d.weapon), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEE1\uFE0F Armor"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff',
        textAlign: 'right'
      }
    }, d.armor), d.shield && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEE1\uFE0F Shield"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#5b52ff',
        textAlign: 'right'
      }
    }, d.shield)), d.amulet && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCFF Amulet"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#f5c542',
        textAlign: 'right'
      }
    }, d.amulet)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Tier 1 Stats"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, [['POW', d.power, '#ff5e6c'], ['VIT', d.vitality, '#3dd497'], ['END', d.endurance, '#f5c542'], ['AGI', d.agility, '#38bdf8'], ['MND', d.mind, '#a78bfa']].map(function (_ref194) {
      var _ref195 = _slicedToArray(_ref194, 3),
        l = _ref195[0],
        v = _ref195[1],
        c = _ref195[2];
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          background: c + '15',
          border: '1px solid ' + c + '30',
          textAlign: 'center',
          minWidth: 40
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: c,
          fontWeight: 700
        }
      }, l), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 800,
          color: '#fff'
        }
      }, v));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Record"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
        textAlign: 'center'
      }
    }, [['💀', d.kills, 'Kills'], ['⚔️', d.pvpKills, 'PvP Kills'], ['☠️', d.deaths, 'Deaths'], ['🏆', d.quests, 'Quests'], ['⭐', d.ap, 'AP'], ['⏱️', d.playtime + 'm', 'Played']].map(function (_ref196) {
      var _ref197 = _slicedToArray(_ref196, 3),
        icon = _ref197[0],
        val = _ref197[1],
        label = _ref197[2];
      return /*#__PURE__*/React.createElement("div", {
        key: label,
        style: {
          padding: '3px 0'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12
        }
      }, icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: '#fff'
        }
      }, val), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.35)'
        }
      }, label));
    }))), d.clanName && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 6,
        borderRadius: 6,
        background: 'rgba(167,139,250,.08)',
        border: '1px solid rgba(167,139,250,.2)',
        marginBottom: 6,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#a78bfa'
      }
    }, "\uD83C\uDFF0 [", d.clanTag, "] ", d.clanName)));
  }(), inspectPlayer.bro && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill"
  }, "Bro #", inspectPlayer.bro.ID), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--teal)'
    }
  }, "DI ", (_inspectPlayer$bro$di = inspectPlayer.bro.diScore) !== null && _inspectPlayer$bro$di !== void 0 && _inspectPlayer$bro$di.toFixed ? inspectPlayer.bro.diScore.toFixed(1) : inspectPlayer.bro.diScore), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--pop)'
    }
  }, "Rank #", inspectPlayer.bro.rank)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1
    },
    onClick: function onClick() {
      var S = stateRef.current;
      S.player.x = inspectPlayer.x + 40;
      S.player.y = inspectPlayer.y + 40;
      setInspectPlayer(null);
    }
  }, "\uD83D\uDCCD TP"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#3dd497'
    },
    onClick: function onClick() {
      setTradeTarget({
        id: inspectPlayer.id,
        name: inspectPlayer.name
      });
      setTradeOffer({});
      setShowTrade(true);
      setInspectPlayer(null);
    }
  }, "\uD83E\uDD1D Trade"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#a78bfa'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'duel_wager_request',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          wager: 0
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Duel sent',
        color: '#a78bfa',
        ts: Date.now()
      });
      setInspectPlayer(null);
    }
  }, "\u2694\uFE0F Duel"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#ff5e6c'
    },
    onClick: function onClick() {
      var _S$rpg26;
      var S = stateRef.current;
      if (S._pvpThreatCdUntil && Date.now() < S._pvpThreatCdUntil) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Threat on cooldown',
          color: '#ff5e6c',
          ts: Date.now()
        });
        setInspectPlayer(null);
        return;
      }
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'pvp_threat',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          fromLevel: ((_S$rpg26 = S.rpg) === null || _S$rpg26 === void 0 ? void 0 : _S$rpg26.level) || 1
        }
      });
      S._pvpSkullType = 'red';
      S._pvpSkullUntil = Date.now() + PVP_THREAT_BASE_COUNTDOWN;
      S._pvpThreatCdUntil = Date.now() + PVP_THREAT_COOLDOWN;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Threat issued!',
        color: '#ff5e6c',
        ts: Date.now()
      });
      BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
      setInspectPlayer(null);
    }
  }, "\uD83D\uDC80 Threat")), clanData && !((_inspectPlayer$rpgDat = inspectPlayer.rpgData) !== null && _inspectPlayer$rpgDat !== void 0 && _inspectPlayer$rpgDat.clanTag) && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: 6,
      padding: '6px',
      borderRadius: 6,
      border: '1px solid rgba(167,139,250,.3)',
      background: 'rgba(167,139,250,.1)',
      color: '#a78bfa',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'clan_invite',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          clanName: clanData.name,
          clanTag: clanData.tag
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Clan invite sent',
        color: '#a78bfa',
        ts: Date.now()
      });
      setInspectPlayer(null);
    }
  }, "\uD83C\uDFF0 Invite to [", clanData.tag, "]"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 6
    }
  }, function () {
    var isFriend = friendsList.some(function (f) {
      return f.id === inspectPlayer.id;
    });
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: isFriend ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,255,255,.15)',
        background: isFriend ? 'rgba(61,220,151,.1)' : 'rgba(255,255,255,.04)',
        color: isFriend ? '#3dd497' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        if (isFriend) {
          var updated = friendsList.filter(function (f) {
            return f.id !== inspectPlayer.id;
          });
          setFriendsList(updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Removed friend',
            color: '#ff5e6c',
            ts: Date.now()
          });
        } else {
          var _updated = [].concat(_toConsumableArray(friendsList), [{
            id: inspectPlayer.id,
            name: inspectPlayer.name,
            color: inspectPlayer.color,
            addedAt: Date.now()
          }]);
          setFriendsList(_updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(_updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Added friend!',
            color: '#3dd497',
            ts: Date.now()
          });
          BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        }
      }
    }, isFriend ? '💚 Friend' : '➕ Add Friend');
  }(), function () {
    var isMuted = mutedList.includes(inspectPlayer.id);
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,.1)',
        background: isMuted ? 'rgba(245,197,66,.1)' : 'rgba(255,255,255,.04)',
        color: isMuted ? '#f5c542' : 'rgba(255,255,255,.4)'
      },
      onClick: function onClick() {
        if (isMuted) {
          var updated = mutedList.filter(function (m) {
            return m !== inspectPlayer.id;
          });
          setMutedList(updated);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Unmuted',
            color: '#f5c542',
            ts: Date.now()
          });
        } else {
          var _updated2 = [].concat(_toConsumableArray(mutedList), [inspectPlayer.id]);
          setMutedList(_updated2);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(_updated2));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Muted',
            color: '#f5c542',
            ts: Date.now()
          });
        }
      }
    }, isMuted ? '🔇 Muted' : '🔇 Mute');
  }(), function (_ZONES$stateRef$curre, _stateRef$current39) {
    var isBlocked = blockedList.includes(inspectPlayer.id);
    var isLawless = (_ZONES$stateRef$curre = ZONES[(_stateRef$current39 = stateRef.current) === null || _stateRef$current39 === void 0 ? void 0 : _stateRef$current39.currentZone]) === null || _ZONES$stateRef$curre === void 0 ? void 0 : _ZONES$stateRef$curre.lawless;
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.2)',
        background: isBlocked ? 'rgba(255,94,108,.15)' : 'rgba(255,255,255,.04)',
        color: isBlocked ? '#ff5e6c' : 'rgba(255,255,255,.4)',
        opacity: !isBlocked && isLawless ? 0.3 : 1
      },
      onClick: function onClick() {
        if (isBlocked) {
          var updated = blockedList.filter(function (b) {
            return b !== inspectPlayer.id;
          });
          setBlockedList(updated);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Unblocked',
            color: '#3dd497',
            ts: Date.now()
          });
        } else {
          if (isLawless) {
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'Can\'t block in lawless zone!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return;
          }
          var _updated3 = [].concat(_toConsumableArray(blockedList), [inspectPlayer.id]);
          setBlockedList(_updated3);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(_updated3));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Blocked - no interactions',
            color: '#ff5e6c',
            ts: Date.now()
          });
        }
      }
    }, isBlocked ? '🚫 Blocked' : '🚫 Block');
  }()))), false && ((_stateRef$current40 = stateRef.current) === null || _stateRef$current40 === void 0 ? void 0 : _stateRef$current40.currentZone) === 'frost' && rpgState && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 130,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(160,216,240,.2)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid rgba(160,216,240,.3)',
      background: 'rgba(160,216,240,.12)',
      color: '#a0d8f0',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S._snowballCd && Date.now() < S._snowballCd) return;
      var angle = S._aimAngle || S._facingAngle || 0;
      if (!S._snowballs) S._snowballs = [];
      S._snowballs.push({
        x: S.player.x,
        y: S.player.y,
        vx: Math.cos(angle) * SNOWBALL_SPEED,
        vy: Math.sin(angle) * SNOWBALL_SPEED,
        ts: Date.now()
      });
      S._snowballCd = Date.now() + SNOWBALL_CD;
      BT_AUDIO.beep(600, 0.04, 0.06, 'sine');
    }
  }, "\u2744\uFE0F Snowball"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid rgba(160,216,240,.3)',
      background: 'rgba(160,216,240,.12)',
      color: '#a0d8f0',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (!S._snowmen) S._snowmen = [];
      if (S._snowmen.length >= 3) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Max 3 snowmen!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      S._snowmen.push({
        x: S.player.x + (Math.random() - .5) * 30,
        y: S.player.y + 10,
        ts: Date.now(),
        hp: 50
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Snowman placed!',
        color: '#a0d8f0',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
    }
  }, "\u26C4 Snowman"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid rgba(96,165,250,.3)',
      background: (_stateRef$current41 = stateRef.current) !== null && _stateRef$current41 !== void 0 && _stateRef$current41._sled ? 'rgba(96,165,250,.3)' : 'rgba(96,165,250,.12)',
      color: '#60a5fa',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      if (S._sled) return;
      var hasWood = Object.entries(R.inventory || {}).filter(function (_ref198) {
        var _ref199 = _slicedToArray(_ref198, 2),
          k = _ref199[0],
          v = _ref199[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref200) {
        var _ref201 = _slicedToArray(_ref200, 2),
          k = _ref201[0],
          v = _ref201[1];
        return s + v;
      }, 0);
      if (hasWood < SLED_WOOD_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + SLED_WOOD_COST + ' wood!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      /* Consume wood */
      var remaining = SLED_WOOD_COST;
      Object.keys(R.inventory).filter(function (k) {
        return k.startsWith('wood_');
      }).forEach(function (k) {
        if (remaining <= 0) return;
        var take = Math.min(R.inventory[k], remaining);
        R.inventory[k] -= take;
        remaining -= take;
        if (R.inventory[k] <= 0) delete R.inventory[k];
      });
      var angle = S._aimAngle || S._facingAngle || 0;
      S._sled = {
        started: Date.now(),
        angle: angle,
        speed: SLED_SPEED_MULT * 2.5
      };
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'SLED!',
        color: '#60a5fa',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.1, 0.15, 'triangle');
      setRpgState(_objectSpread({}, R));
    }
  }, "\uD83D\uDEF7 Sled (", SLED_WOOD_COST, "w)")), ((_stateRef$current42 = stateRef.current) === null || _stateRef$current42 === void 0 ? void 0 : _stateRef$current42.currentZone) === 'tidal' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 130,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(52,152,219,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontSize: 9,
      fontWeight: 700,
      color: '#3498DB'
    }
  }, "\uD83C\uDF0A Tide: ", ((_stateRef$current43 = stateRef.current) === null || _stateRef$current43 === void 0 ? void 0 : _stateRef$current43._tideLevel) > 0.5 ? 'HIGH' : 'LOW', ((_stateRef$current44 = stateRef.current) === null || _stateRef$current44 === void 0 ? void 0 : _stateRef$current44._swimming) && ' · 🏊 Swimming'), !((_stateRef$current45 = stateRef.current) !== null && _stateRef$current45 !== void 0 && _stateRef$current45._raft) ? /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid rgba(52,152,219,.3)',
      background: 'rgba(52,152,219,.12)',
      color: '#3498DB',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      var hasWood = Object.entries(R.inventory || {}).filter(function (_ref202) {
        var _ref203 = _slicedToArray(_ref202, 2),
          k = _ref203[0],
          v = _ref203[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref204) {
        var _ref205 = _slicedToArray(_ref204, 2),
          k = _ref205[0],
          v = _ref205[1];
        return s + v;
      }, 0);
      if (hasWood < RAFT_WOOD_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + RAFT_WOOD_COST + ' wood!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      var rem = RAFT_WOOD_COST;
      Object.keys(R.inventory).filter(function (k) {
        return k.startsWith('wood_');
      }).forEach(function (k) {
        if (rem <= 0) return;
        var take = Math.min(R.inventory[k], rem);
        R.inventory[k] -= take;
        rem -= take;
        if (R.inventory[k] <= 0) delete R.inventory[k];
      });
      S._raft = true;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Raft built! Sail across water.',
        color: '#3498DB',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
    }
  }, "\uD83D\uDEA3 Build Raft (", RAFT_WOOD_COST, "w)") : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontSize: 9,
      fontWeight: 700,
      color: '#3dd497'
    }
  }, "\uD83D\uDEA3 Raft ready")), ((_stateRef$current46 = stateRef.current) === null || _stateRef$current46 === void 0 ? void 0 : _stateRef$current46.currentZone) === 'hollows' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 130,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(234,88,12,.2)'
    }
  }, !((_stateRef$current47 = stateRef.current) !== null && _stateRef$current47 !== void 0 && _stateRef$current47._torch) ? /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid rgba(234,88,12,.3)',
      background: 'rgba(234,88,12,.12)',
      color: '#ea580c',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      var hasWood = Object.entries(R.inventory || {}).filter(function (_ref206) {
        var _ref207 = _slicedToArray(_ref206, 2),
          k = _ref207[0],
          v = _ref207[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref208) {
        var _ref209 = _slicedToArray(_ref208, 2),
          k = _ref209[0],
          v = _ref209[1];
        return s + v;
      }, 0);
      if (hasWood < TORCH_WOOD_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + TORCH_WOOD_COST + ' wood!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      var rem = TORCH_WOOD_COST;
      Object.keys(R.inventory).filter(function (k) {
        return k.startsWith('wood_');
      }).forEach(function (k) {
        if (rem <= 0) return;
        var take = Math.min(R.inventory[k], rem);
        R.inventory[k] -= take;
        rem -= take;
        if (R.inventory[k] <= 0) delete R.inventory[k];
      });
      S._torch = {
        started: Date.now(),
        radius: TORCH_RADIUS_BASE
      };
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Torch lit! (2 min)',
        color: '#ea580c',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.08, 0.1, 'triangle');
      setRpgState(_objectSpread({}, R));
    }
  }, "\uD83D\uDD25 Light Torch (", TORCH_WOOD_COST, "w)") : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontSize: 9,
      fontWeight: 700,
      color: '#ea580c'
    }
  }, "\uD83D\uDD25 Torch: ", Math.ceil((TORCH_DURATION - (Date.now() - stateRef.current._torch.started)) / 1000), "s"), ((_stateRef$current48 = stateRef.current) === null || _stateRef$current48 === void 0 ? void 0 : _stateRef$current48._echoActive) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontSize: 8,
      fontWeight: 700,
      color: '#ff5e6c'
    }
  }, "\uD83D\uDD0A Echo! 2\xD7 aggro")), false && ((_stateRef$current49 = stateRef.current) === null || _stateRef$current49 === void 0 ? void 0 : _stateRef$current49.currentZone) === 'frost' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 125,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(140,180,220,.2)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      cursor: 'pointer',
      background: stateRef.current._snowballCd && Date.now() < stateRef.current._snowballCd ? 'rgba(255,255,255,.05)' : 'rgba(140,180,220,.2)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: "Throw Snowball",
    onClick: function onClick() {
      var S = stateRef.current;
      if (S._snowballCd && Date.now() < S._snowballCd) return;
      var angle = S._aimAngle || S._facingAngle || 0;
      if (!S._snowballs) S._snowballs = [];
      S._snowballs.push({
        x: S.player.x,
        y: S.player.y,
        vx: Math.cos(angle) * SNOWBALL_SPEED,
        vy: Math.sin(angle) * SNOWBALL_SPEED,
        ts: Date.now()
      });
      S._snowballCd = Date.now() + SNOWBALL_CD;
      BT_AUDIO.beep(600, 0.04, 0.06, 'sine');
    }
  }, "\u2744\uFE0F"), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      cursor: 'pointer',
      background: 'rgba(140,180,220,.2)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: 'Build Snowman (disabled)',
    onClick: function onClick() {
      /* v2.3.224: snow auto-collection retired; button is a no-op
         until a non-placeholder resource is wired in. */
      return;
      /* eslint-disable no-unreachable -- reference impl kept for future wiring */
      var _R$inventory;
      var S = stateRef.current,
        R = S.rpg;
      /* Snow collected from frost zone sand tiles — stored as inventory */
      var snowCount = ((_R$inventory = R.inventory) === null || _R$inventory === void 0 ? void 0 : _R$inventory.snow) || 0;
      if (snowCount < SNOWMAN_SNOW_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + SNOWMAN_SNOW_COST + ' snow (have ' + snowCount + ')',
          color: '#a0d8f0',
          ts: Date.now()
        });
        return;
      }
      R.inventory.snow -= SNOWMAN_SNOW_COST;
      if (R.inventory.snow <= 0) delete R.inventory.snow;
      if (!S._snowmen) S._snowmen = [];
      S._snowmen.push({
        x: S.player.x + 20,
        y: S.player.y,
        ts: Date.now(),
        hp: 50
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Snowman built!',
        color: '#a0d8f0',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
    }
  }, "\u26C4"), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      cursor: 'pointer',
      background: stateRef.current._sled ? 'rgba(96,165,250,.3)' : 'rgba(140,180,220,.2)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: stateRef.current._hasSled ? 'Ride Sled' : 'Craft Sled (' + SLED_WOOD_COST + ' wood)',
    onClick: function onClick() {
      var S = stateRef.current,
        R = S.rpg;
      if (S._sled) return; /* already sledding */
      if (!S._hasSled) {
        /* Craft sled */
        var woodCount = Object.entries(R.inventory || {}).filter(function (_ref210) {
          var _ref211 = _slicedToArray(_ref210, 2),
            k = _ref211[0],
            v = _ref211[1];
          return k.startsWith('wood_') && v > 0;
        }).reduce(function (s, _ref212) {
          var _ref213 = _slicedToArray(_ref212, 2),
            k = _ref213[0],
            v = _ref213[1];
          return s + v;
        }, 0);
        if (woodCount < SLED_WOOD_COST) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Need ' + SLED_WOOD_COST + ' wood (have ' + woodCount + ')',
            color: '#a0d8f0',
            ts: Date.now()
          });
          return;
        }
        var remaining = SLED_WOOD_COST;
        Object.keys(R.inventory).filter(function (k) {
          return k.startsWith('wood_');
        }).forEach(function (k) {
          if (remaining <= 0) return;
          var take = Math.min(R.inventory[k], remaining);
          R.inventory[k] -= take;
          remaining -= take;
          if (R.inventory[k] <= 0) delete R.inventory[k];
        });
        S._hasSled = true;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Sled crafted!',
          color: '#60a5fa',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
      } else {
        /* Ride sled */
        var angle = S._aimAngle || S._facingAngle || 0;
        S._sled = {
          started: Date.now(),
          angle: angle,
          speed: SPEED * SLED_SPEED_MULT
        };
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'WHOOSH!',
          color: '#60a5fa',
          ts: Date.now()
        });
        BT_AUDIO.beep(400, 0.1, 0.15, 'triangle');
      }
    }
  }, "\uD83D\uDEF7")), ((_stateRef$current50 = stateRef.current) === null || _stateRef$current50 === void 0 ? void 0 : _stateRef$current50.currentZone) === 'tidal' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 125,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(52,152,219,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      fontSize: 9,
      color: '#3498DB',
      fontWeight: 700,
      padding: '0 6px'
    }
  }, "\uD83C\uDF0A ", stateRef.current._tideLevel > 0.7 ? 'HIGH' : stateRef.current._tideLevel < 0.3 ? 'LOW' : 'MID', " tide"), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 32,
      padding: '0 10px',
      borderRadius: 8,
      border: 'none',
      fontSize: 10,
      fontWeight: 700,
      cursor: 'pointer',
      background: stateRef.current._raft ? 'rgba(61,220,151,.2)' : 'rgba(52,152,219,.2)',
      color: stateRef.current._raft ? '#3dd497' : '#3498DB'
    },
    onClick: function onClick() {
      var S = stateRef.current,
        R = S.rpg;
      if (S._raft) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Already have a raft!',
          color: '#3498DB',
          ts: Date.now()
        });
        return;
      }
      var woodCount = Object.entries(R.inventory || {}).filter(function (_ref214) {
        var _ref215 = _slicedToArray(_ref214, 2),
          k = _ref215[0],
          v = _ref215[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref216) {
        var _ref217 = _slicedToArray(_ref216, 2),
          k = _ref217[0],
          v = _ref217[1];
        return s + v;
      }, 0);
      if (woodCount < RAFT_WOOD_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + RAFT_WOOD_COST + ' wood',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      var rem = RAFT_WOOD_COST;
      Object.keys(R.inventory).filter(function (k) {
        return k.startsWith('wood_');
      }).forEach(function (k) {
        if (rem <= 0) return;
        var t = Math.min(R.inventory[k], rem);
        R.inventory[k] -= t;
        rem -= t;
        if (R.inventory[k] <= 0) delete R.inventory[k];
      });
      S._raft = true;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Raft built!',
        color: '#3498DB',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
    }
  }, stateRef.current._raft ? '🚣 Raft Ready' : '🪵 Build Raft (' + RAFT_WOOD_COST + ' wood)')), ((_stateRef$current51 = stateRef.current) === null || _stateRef$current51 === void 0 ? void 0 : _stateRef$current51.currentZone) === 'hollows' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 125,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 19,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(0,0,0,.55)',
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(121,85,72,.2)'
    }
  }, stateRef.current._torch && function () {
    var pct = Math.max(0, 1 - (Date.now() - stateRef.current._torch.started) / TORCH_DURATION);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#ea580c',
        fontWeight: 700,
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center'
      }
    }, "\uD83D\uDD25 ", Math.ceil(pct * 100), "%");
  }(), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 32,
      padding: '0 10px',
      borderRadius: 8,
      border: 'none',
      fontSize: 10,
      fontWeight: 700,
      cursor: 'pointer',
      background: stateRef.current._torch ? 'rgba(255,255,255,.05)' : 'rgba(234,88,12,.2)',
      color: stateRef.current._torch ? 'rgba(255,255,255,.3)' : '#ea580c'
    },
    onClick: function onClick() {
      var S = stateRef.current,
        R = S.rpg;
      if (S._torch) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Torch already lit!',
          color: '#ea580c',
          ts: Date.now()
        });
        return;
      }
      var woodCount = Object.entries(R.inventory || {}).filter(function (_ref218) {
        var _ref219 = _slicedToArray(_ref218, 2),
          k = _ref219[0],
          v = _ref219[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref220) {
        var _ref221 = _slicedToArray(_ref220, 2),
          k = _ref221[0],
          v = _ref221[1];
        return s + v;
      }, 0);
      if (woodCount < TORCH_WOOD_COST) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Need ' + TORCH_WOOD_COST + ' wood',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      var rem = TORCH_WOOD_COST;
      Object.keys(R.inventory).filter(function (k) {
        return k.startsWith('wood_');
      }).forEach(function (k) {
        if (rem <= 0) return;
        var t = Math.min(R.inventory[k], rem);
        R.inventory[k] -= t;
        rem -= t;
        if (R.inventory[k] <= 0) delete R.inventory[k];
      });
      S._torch = {
        started: Date.now(),
        radius: TORCH_RADIUS_BASE
      };
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Torch lit!',
        color: '#ea580c',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.06, 0.08, 'triangle');
      setRpgState(_objectSpread({}, R));
    }
  }, stateRef.current._torch ? '🔥 Lit' : '🪵 Light Torch (' + TORCH_WOOD_COST + ' wood)'), !stateRef.current._torch && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      padding: '0 4px',
      display: 'flex',
      alignItems: 'center'
    }
  }, "\u26A0\uFE0F Dark! Monsters hear you.")), showEmotes && /*#__PURE__*/React.createElement("div", {
    className: "bt-emote-bar",
    style: {
      flexWrap: 'wrap',
      maxWidth: 320
    }
  }, EMOTES.map(function (e) {
    return /*#__PURE__*/React.createElement("button", {
      key: e,
      className: "bt-emote-btn",
      onTouchStart: function onTouchStart(ev) {
        ev.preventDefault();
        sendEmote(e);
      },
      onMouseDown: function onMouseDown(ev) {
        ev.preventDefault();
        sendEmote(e);
      }
    }, e);
  }), TEXT_EMOTES.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      style: {
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.08)',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'Source Sans 3,sans-serif',
        letterSpacing: '.05em'
      },
      onTouchStart: function onTouchStart(ev) {
        ev.preventDefault();
        sendEmote(t);
      },
      onMouseDown: function onMouseDown(ev) {
        ev.preventDefault();
        sendEmote(t);
      }
    }, t);
  })), nearBuilding === 0 && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 160
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setShowShop(true);
    },
    onMouseDown: function onMouseDown(e) {
      e.preventDefault();
      setShowShop(true);
    }
  }, "\uD83C\uDFEA Open Shop"), showShop && rpgState && /*#__PURE__*/React.createElement(ShopPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setShowShop: setShowShop }), nearBuilding !== null && BUILDINGS[nearBuilding] && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      enterBuilding();
    },
    onMouseDown: function onMouseDown(e) {
      e.preventDefault();
      enterBuilding();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), BUILDINGS[nearBuilding].icon, " Enter ", BUILDINGS[nearBuilding].label), ((_stateRef$current52 = stateRef.current) === null || _stateRef$current52 === void 0 ? void 0 : _stateRef$current52._nearHouse) && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 140,
      background: 'rgba(61,212,151,.85)'
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      var S2 = stateRef.current,
        R = S2.rpg;
      if (!R) return;
      R.hp = R.maxHp;
      R.stamina = R.maxStamina;
      R.mana = R.maxMana;
      R._wellRestedUntil = Date.now() + 1800000; /* 30 min */
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 40,
        text: 'Zzz... Stats restored!',
        color: '#3dd497',
        ts: Date.now()
      });
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 25,
        text: 'Well Rested +10% XP (30min)',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(500, 0.05, 0.07, 'sine');
      }, 200);
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.04, 0.06, 'sine');
      }, 400);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e2) {}
    },
    onMouseDown: function onMouseDown(e) {
      return e.preventDefault();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), "\uD83D\uDE34 Sleep (Restore All + Well Rested Buff)"), ((_stateRef$current53 = stateRef.current) === null || _stateRef$current53 === void 0 ? void 0 : _stateRef$current53._nearWorkshop) && !showDungeonCreator && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 140,
      background: 'rgba(130,80,220,.85)'
    },
    onClick: function onClick(e) {
      e.preventDefault();
      setShowDungeonCreator(true);
      if (!dungeonCreator) setDungeonCreator(createDefaultDungeonConfig());
      BT_AUDIO.enterBuilding();
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setShowDungeonCreator(true);
      if (!dungeonCreator) setDungeonCreator(createDefaultDungeonConfig());
      BT_AUDIO.enterBuilding();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), "\uD83C\uDFD7\uFE0F Dungeon Workshop"), ((_stateRef$current54 = stateRef.current) === null || _stateRef$current54 === void 0 ? void 0 : _stateRef$current54._nearPetHouse) && !showPetHouse && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: mktMode !== 'orders' && (_stateRef$current55 = stateRef.current) !== null && _stateRef$current55 !== void 0 && _stateRef$current55._nearWorkshop ? 175 : 140,
      background: 'rgba(234,88,12,.85)'
    },
    onClick: function onClick(e) {
      e.preventDefault();
      setShowPetHouse(true);
      BT_AUDIO.enterBuilding();
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setShowPetHouse(true);
      BT_AUDIO.enterBuilding();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), "\uD83D\uDC3E Pet House"), ((_stateRef$current56 = stateRef.current) === null || _stateRef$current56 === void 0 ? void 0 : _stateRef$current56._nearHouse) && !showFurniture && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 175,
      background: 'rgba(139,105,20,.85)'
    },
    onClick: function onClick(e) {
      e.preventDefault();
      setShowFurniture(true);
      BT_AUDIO.enterBuilding();
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setShowFurniture(true);
      BT_AUDIO.enterBuilding();
    }
  }, "\uD83E\uDE91 Furniture Workshop"), ((_stateRef$current57 = stateRef.current) === null || _stateRef$current57 === void 0 ? void 0 : _stateRef$current57._nearMinigameArena) && !showMinigame && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 140,
      background: 'rgba(142,68,173,.85)'
    },
    onClick: function onClick(e) {
      e.preventDefault();
      setShowMinigame(true);
      BT_AUDIO.enterBuilding();
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setShowMinigame(true);
      BT_AUDIO.enterBuilding();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), "\uD83C\uDFAE Minigame Arena"), ((_stateRef$current58 = stateRef.current) === null || _stateRef$current58 === void 0 ? void 0 : _stateRef$current58._nearNode) && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      /* Inline 'bottom: 140' was hiding this button behind the 25vh
         BottomDashboard on mobile.  Sit it just above the dashboard
         instead (matches the class default ~ calc(25vh + 16px) but
         a bit higher so it clears the mobile dashboard's top border
         and stays below the joysticks at calc(25vh + 70px)). */
      bottom: 'calc(var(--dash-h) + 24px)',
      background: 'rgba(0,180,140,.85)'
    },
    onClick: function onClick(e) {
      var _R$lifeSkills3;
      e.preventDefault();
      var S = stateRef.current,
        node = S._nearNode,
        R = S.rpg;
      if (!node || !node.alive || !R) return;
      if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
      var skillName = node.skill || 'mining';
      var skillLvl = ((_R$lifeSkills3 = R.lifeSkills) === null || _R$lifeSkills3 === void 0 || (_R$lifeSkills3 = _R$lifeSkills3[skillName]) === null || _R$lifeSkills3 === void 0 ? void 0 : _R$lifeSkills3.level) || 1;
      if (false) { /* gathering level gate disabled — all resources harvestable at lvl 1 */
        S.dmgNumbers.push({
          x: node.x,
          y: node.y - 15,
          text: 'Need ' + skillName.charAt(0).toUpperCase() + skillName.slice(1) + ' Lv' + node.gatherLvl,
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.05, 0.08, 'square');
        return;
      }
      /* v2.3.229: windowed-swipe extraction loop replaces the modals. */
      if (node.nodeType === 'fishSpot')  { _startExtraction(node, 'fishing');     return; }
      if (node.nodeType === 'tree')      { _startExtraction(node, 'woodcutting'); return; }
      if (node.nodeType === 'oreVein')   { _startExtraction(node, 'mining');      return; }
      if (node.nodeType === 'campfire')  { _startCookingAtCampfire(node);         return; }
    },
    onTouchStart: function onTouchStart(e) {
      var _R$lifeSkills4;
      e.preventDefault();
      var S = stateRef.current,
        node = S._nearNode,
        R = S.rpg;
      if (!node || !node.alive || !R) return;
      if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
      var skillName = node.skill || 'mining';
      var skillLvl = ((_R$lifeSkills4 = R.lifeSkills) === null || _R$lifeSkills4 === void 0 || (_R$lifeSkills4 = _R$lifeSkills4[skillName]) === null || _R$lifeSkills4 === void 0 ? void 0 : _R$lifeSkills4.level) || 1;
      if (false) { /* gathering level gate disabled — all resources harvestable at lvl 1 */
        S.dmgNumbers.push({
          x: node.x,
          y: node.y - 15,
          text: 'Need ' + skillName.charAt(0).toUpperCase() + skillName.slice(1) + ' Lv' + node.gatherLvl,
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.05, 0.08, 'square');
        return;
      }
      /* v2.3.229: windowed-swipe extraction loop replaces the modals. */
      if (node.nodeType === 'fishSpot')  { _startExtraction(node, 'fishing');     return; }
      if (node.nodeType === 'tree')      { _startExtraction(node, 'woodcutting'); return; }
      if (node.nodeType === 'oreVein')   { _startExtraction(node, 'mining');      return; }
      if (node.nodeType === 'campfire')  { _startCookingAtCampfire(node);         return; }
    },
    onMouseDown: function onMouseDown(e) {
      return e.preventDefault();
    }
  }, stateRef.current._isDesktop && /*#__PURE__*/React.createElement("kbd", {
    style: {
      background: 'rgba(255,255,255,.2)',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 10,
      marginRight: 4
    }
  }, "E"), (_stateRef$current$_ne = stateRef.current._nearNode) === null || _stateRef$current$_ne === void 0 ? void 0 : _stateRef$current$_ne.emoji, " ", function () {
    var n = stateRef.current._nearNode;
    var s = (n === null || n === void 0 ? void 0 : n.skill) || 'mining';
    return s === 'woodcutting' ? 'Chop' : s === 'fishing' ? 'Fish' : s === 'cooking' ? 'Cook' : 'Mine';
  }(), /* v2.3.853: campfire shows just "\ud83d\udd25 Cook"; gather nodes show the tier tail */ function () {
    var n = stateRef.current._nearNode;
    if (!n || n.nodeType === 'campfire') return '';
    return '  ' + (n.spotName || '') + ' \u2014 ' + (n.name || '') + ' (Lv' + (n.gatherLvl || 1) + ')';
  }()), /*#__PURE__*/React.createElement(ExtractionSwipeLayer, {
    stateRef: stateRef,
    onSuccess: _succeedExtraction
  }), "e.preventDefault();", function (_R$lifeSkills5, _R$lifeSkills6) {
    var S = stateRef.current;
    var R = S === null || S === void 0 ? void 0 : S.rpg;
    if (!R || (S === null || S === void 0 ? void 0 : S.currentZone) === 'town') return null;
    var wcLvl = ((_R$lifeSkills5 = R.lifeSkills) === null || _R$lifeSkills5 === void 0 || (_R$lifeSkills5 = _R$lifeSkills5.woodcutting) === null || _R$lifeSkills5 === void 0 ? void 0 : _R$lifeSkills5.level) || 0;
    if (wcLvl < 15) return null;
    /* Find best cookable recipe the player can make */
    var cookLvl = ((_R$lifeSkills6 = R.lifeSkills) === null || _R$lifeSkills6 === void 0 || (_R$lifeSkills6 = _R$lifeSkills6.cooking) === null || _R$lifeSkills6 === void 0 ? void 0 : _R$lifeSkills6.level) || 1;
    var inv = R.inventory || {};
    var available = COOKING_RECIPES.filter(function (r) {
      if (cookLvl < r.cookLvl) return false;
      return Object.entries(r.ingredients).every(function (_ref230) {
        var _ref231 = _slicedToArray(_ref230, 2),
          type = _ref231[0],
          count = _ref231[1];
        var total = Object.entries(inv).filter(function (_ref232) {
          var _ref233 = _slicedToArray(_ref232, 2),
            k = _ref233[0],
            v = _ref233[1];
          return k.includes(type) && v > 0;
        }).reduce(function (s, _ref234) {
          var _ref235 = _slicedToArray(_ref234, 2),
            k = _ref235[0],
            v = _ref235[1];
          return s + v;
        }, 0);
        return total >= count;
      });
    });
    if (available.length === 0) return null;
    var best = available[available.length - 1]; /* highest tier available */
    return React.createElement('button', {
      className: 'bt-interact-prompt',
      style: {
        bottom: 175,
        background: 'rgba(200,100,20,.85)'
      },
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        /* Server-authoritative cooking recipe in MP -- see the cooking
           panel onClick (~line 18989) for the predict + sync flow.
           Recipe index resolved by indexOf since `best` is one of the
           filtered COOKING_RECIPES entries. */
        if (S._serverMonsters && S.channel) {
          var _recipeIdx = COOKING_RECIPES.indexOf(best);
          if (_recipeIdx >= 0) {
            try { S.channel.send({ type: 'cook_recipe', payload: { recipeIdx: _recipeIdx } }); } catch (e2) {}
          }
        }
        /* Consume ingredients */
        Object.entries(best.ingredients).forEach(function (_ref236) {
          var _ref237 = _slicedToArray(_ref236, 2),
            type = _ref237[0],
            count = _ref237[1];
          var remaining = count;
          Object.keys(R.inventory || {}).forEach(function (k) {
            if (remaining <= 0 || !k.includes(type)) return;
            var take = Math.min(R.inventory[k], remaining);
            R.inventory[k] -= take;
            remaining -= take;
            if (R.inventory[k] <= 0) delete R.inventory[k];
          });
        });
        /* Apply buff */
        var dur = (best.duration || 0) * 1000;
        if (best.buff === 'heal') R.hp = Math.min(R.maxHp, R.hp + best.power);
        if (best.buff === 'regen') S._regenBuff = Date.now() + dur;
        if (best.buff === 'resist') S._resistBuff = Date.now() + dur;
        if (best.buff === 'damage') S._dmgBuff = Date.now() + dur;
        if (best.buff === 'all') {
          S._dmgBuff = Date.now() + dur;
          S._spdBuff = Date.now() + dur;
          S._hpBuff = Date.now() + dur;
          S._manaBuff = Date.now() + dur;
        }
        addLifeSkillXp(R.lifeSkills, 'cooking', best.tier * 25);
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: best.name + '!',
          color: '#ea580c',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      },
      onMouseDown: function onMouseDown(e) {
        return e.preventDefault();
      }
    }, '🔥 Cook ' + best.name + ' (Field)');
  }(), function (_ZONES$S$currentZone14, _React2) {
    var S = stateRef.current;
    var R = S === null || S === void 0 ? void 0 : S.rpg;
    if (!R || (S === null || S === void 0 ? void 0 : S.currentZone) === 'town') return null;
    var zElem = (_ZONES$S$currentZone14 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone14 === void 0 ? void 0 : _ZONES$S$currentZone14.element;
    var inv = R.inventory || {};
    var buttons = [];

    /* ── FROZEN SHORE actions ── (UI disabled per user request; underlying
       _snowballs / _snowmen / _sled physics still in the game loop in case
       we re-enable.  Flip the false back to enable.) */
    if (false && zElem === 'frost') {
      /* Throw Snowball */
      var canSnowball = !S._snowballCd || Date.now() > S._snowballCd;
      buttons.push(React.createElement('button', {
        key: 'snowball',
        style: {
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          cursor: 'pointer',
          background: canSnowball ? 'rgba(160,216,240,.2)' : 'rgba(255,255,255,.05)',
          border: canSnowball ? '1px solid rgba(160,216,240,.4)' : '1px solid rgba(255,255,255,.08)',
          color: canSnowball ? '#a0d8f0' : 'rgba(255,255,255,.3)'
        },
        onClick: function onClick() {
          if (!canSnowball) return;
          S._snowballCd = Date.now() + SNOWBALL_CD;
          var angle = S._aimAngle || Math.atan2(S.stickY || 0, S.stickX || 1);
          if (!S._snowballs) S._snowballs = [];
          S._snowballs.push({
            x: S.player.x,
            y: S.player.y,
            vx: Math.cos(angle) * SNOWBALL_SPEED,
            vy: Math.sin(angle) * SNOWBALL_SPEED,
            ts: Date.now()
          });
          BT_AUDIO.beep(600, 0.04, 0.06, 'sine');
        }
      }, '❄️ Snowball'));

      /* Build Snowman — costs 5 snow (sand tiles give snow when gathered in frost) */
      var snowCount = inv.snow || 0;
      buttons.push(React.createElement('button', {
        key: 'snowman',
        style: {
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          cursor: 'pointer',
          background: snowCount >= SNOWMAN_SNOW_COST ? 'rgba(160,216,240,.2)' : 'rgba(255,255,255,.05)',
          border: snowCount >= SNOWMAN_SNOW_COST ? '1px solid rgba(160,216,240,.4)' : '1px solid rgba(255,255,255,.08)',
          color: snowCount >= SNOWMAN_SNOW_COST ? '#a0d8f0' : 'rgba(255,255,255,.3)'
        },
        onClick: function onClick() {
          if (snowCount < SNOWMAN_SNOW_COST) return;
          R.inventory.snow -= SNOWMAN_SNOW_COST;
          if (R.inventory.snow <= 0) delete R.inventory.snow;
          if (!S._snowmen) S._snowmen = [];
          S._snowmen.push({
            x: S.player.x + 20,
            y: S.player.y,
            ts: Date.now(),
            hp: 50
          });
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Snowman placed!',
            color: '#a0d8f0',
            ts: Date.now()
          });
          BT_AUDIO.collect();
          setRpgState(_objectSpread({}, R));
        }
      }, '⛄ Snowman (' + snowCount + '/' + SNOWMAN_SNOW_COST + ')'));

      /* Craft Sled */
      var woodCount = Object.entries(inv).filter(function (_ref238) {
        var _ref239 = _slicedToArray(_ref238, 2),
          k = _ref239[0],
          v = _ref239[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref240) {
        var _ref241 = _slicedToArray(_ref240, 2),
          k = _ref241[0],
          v = _ref241[1];
        return s + v;
      }, 0);
      var hasSled = !!S._sled;
      buttons.push(React.createElement('button', {
        key: 'sled',
        style: {
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          cursor: 'pointer',
          background: woodCount >= SLED_WOOD_COST && !hasSled ? 'rgba(96,165,250,.2)' : 'rgba(255,255,255,.05)',
          border: woodCount >= SLED_WOOD_COST && !hasSled ? '1px solid rgba(96,165,250,.4)' : '1px solid rgba(255,255,255,.08)',
          color: woodCount >= SLED_WOOD_COST && !hasSled ? '#60a5fa' : 'rgba(255,255,255,.3)'
        },
        onClick: function onClick() {
          if (woodCount < SLED_WOOD_COST || hasSled) return;
          /* Consume cheapest wood first */
          var remaining = SLED_WOOD_COST;
          Object.keys(R.inventory).filter(function (k) {
            return k.startsWith('wood_');
          }).sort().forEach(function (k) {
            if (remaining <= 0) return;
            var take = Math.min(R.inventory[k], remaining);
            R.inventory[k] -= take;
            remaining -= take;
            if (R.inventory[k] <= 0) delete R.inventory[k];
          });
          var angle = S._aimAngle || 0;
          S._sled = {
            started: Date.now(),
            angle: angle,
            speed: SLED_SPEED_MULT * 2
          };
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'SLED!',
            color: '#60a5fa',
            ts: Date.now()
          });
          S.screenShake = 3;
          BT_AUDIO.beep(400, 0.1, 0.12, 'triangle');
          setRpgState(_objectSpread({}, R));
        }
      }, '🛷 Sled (' + woodCount + '/' + SLED_WOOD_COST + ')'));
    }

    /* ── TIDAL CAVES actions ── */
    if (zElem === 'water') {
      var _woodCount = Object.entries(inv).filter(function (_ref242) {
        var _ref243 = _slicedToArray(_ref242, 2),
          k = _ref243[0],
          v = _ref243[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref244) {
        var _ref245 = _slicedToArray(_ref244, 2),
          k = _ref245[0],
          v = _ref245[1];
        return s + v;
      }, 0);
      var tideStr = S._tideLevel > 0.7 ? 'HIGH' : S._tideLevel < 0.3 ? 'LOW' : 'MID';
      var tideCol = S._tideLevel > 0.7 ? '#3498DB' : S._tideLevel < 0.3 ? '#f5c542' : '#8890b8';
      buttons.push(React.createElement('span', {
        key: 'tide',
        style: {
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          background: 'rgba(52,152,219,.1)',
          border: '1px solid rgba(52,152,219,.3)',
          color: tideCol
        }
      }, '🌊 Tide: ' + tideStr));
      if (!S._raft) {
        buttons.push(React.createElement('button', {
          key: 'raft',
          style: {
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 700,
            cursor: 'pointer',
            background: _woodCount >= RAFT_WOOD_COST ? 'rgba(139,105,20,.2)' : 'rgba(255,255,255,.05)',
            border: _woodCount >= RAFT_WOOD_COST ? '1px solid rgba(139,105,20,.4)' : '1px solid rgba(255,255,255,.08)',
            color: _woodCount >= RAFT_WOOD_COST ? '#d4a020' : 'rgba(255,255,255,.3)'
          },
          onClick: function onClick() {
            if (_woodCount < RAFT_WOOD_COST) return;
            var rem = RAFT_WOOD_COST;
            Object.keys(R.inventory).filter(function (k) {
              return k.startsWith('wood_');
            }).sort().forEach(function (k) {
              if (rem <= 0) return;
              var take = Math.min(R.inventory[k], rem);
              R.inventory[k] -= take;
              rem -= take;
              if (R.inventory[k] <= 0) delete R.inventory[k];
            });
            S._raft = true;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Raft built! You can cross water.',
              color: '#d4a020',
              ts: Date.now()
            });
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
          }
        }, '🚣 Build Raft (' + _woodCount + '/' + RAFT_WOOD_COST + ')'));
      } else {
        buttons.push(React.createElement('span', {
          key: 'raft',
          style: {
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(139,105,20,.15)',
            border: '1px solid rgba(139,105,20,.3)',
            color: '#d4a020'
          }
        }, '🚣 Raft Ready'));
      }
    }

    /* ── DEEP HOLLOWS actions ── */
    if (zElem === 'stone') {
      var hasWood = Object.entries(inv).filter(function (_ref246) {
        var _ref247 = _slicedToArray(_ref246, 2),
          k = _ref247[0],
          v = _ref247[1];
        return k.startsWith('wood_') && v > 0;
      }).reduce(function (s, _ref248) {
        var _ref249 = _slicedToArray(_ref248, 2),
          k = _ref249[0],
          v = _ref249[1];
        return s + v;
      }, 0) >= TORCH_WOOD_COST;
      var torchActive = !!S._torch;
      if (!torchActive) {
        buttons.push(React.createElement('button', {
          key: 'torch',
          style: {
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 700,
            cursor: 'pointer',
            background: hasWood ? 'rgba(234,88,12,.2)' : 'rgba(255,255,255,.05)',
            border: hasWood ? '1px solid rgba(234,88,12,.4)' : '1px solid rgba(255,255,255,.08)',
            color: hasWood ? '#ea580c' : 'rgba(255,255,255,.3)'
          },
          onClick: function onClick() {
            if (!hasWood) return;
            var rem = TORCH_WOOD_COST;
            Object.keys(R.inventory).filter(function (k) {
              return k.startsWith('wood_');
            }).sort().forEach(function (k) {
              if (rem <= 0) return;
              var take = Math.min(R.inventory[k], rem);
              R.inventory[k] -= take;
              rem -= take;
              if (R.inventory[k] <= 0) delete R.inventory[k];
            });
            S._torch = {
              started: Date.now(),
              radius: TORCH_RADIUS_BASE
            };
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Torch lit! (2min)',
              color: '#ea580c',
              ts: Date.now()
            });
            BT_AUDIO.beep(400, 0.08, 0.1, 'triangle');
            setRpgState(_objectSpread({}, R));
          }
        }, '🔥 Light Torch (' + TORCH_WOOD_COST + ' wood)'));
      } else {
        var torchSecs = Math.ceil((TORCH_DURATION - (Date.now() - S._torch.started)) / 1000);
        buttons.push(React.createElement('span', {
          key: 'torch',
          style: {
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(234,88,12,.15)',
            border: '1px solid rgba(234,88,12,.3)',
            color: '#ea580c'
          }
        }, '🔥 Torch: ' + torchSecs + 's'));
      }
      buttons.push(React.createElement('span', {
        key: 'echo',
        style: {
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 8,
          fontWeight: 600,
          background: S._echoActive ? 'rgba(255,94,108,.1)' : 'rgba(255,255,255,.03)',
          border: S._echoActive ? '1px solid rgba(255,94,108,.2)' : '1px solid rgba(255,255,255,.06)',
          color: S._echoActive ? '#ff5e6c' : 'rgba(255,255,255,.3)'
        }
      }, S._echoActive ? '📢 ECHO: 2× aggro' : '📢 Echo: quiet'));
    }
    if (buttons.length === 0) return null;
    return (_React2 = React).createElement.apply(_React2, ['div', {
      style: {
        position: 'absolute',
        bottom: 145,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 18,
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        background: 'rgba(0,0,0,.5)',
        borderRadius: 10,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,.08)'
      }
    }].concat(buttons));
  }(), function (_R$_questFlags) {
    var S = stateRef.current;
    var R = S === null || S === void 0 ? void 0 : S.rpg;
    if (!R || (S === null || S === void 0 ? void 0 : S.currentZone) === 'town' || S !== null && S !== void 0 && S._inDungeon) return null;
    if (S._currentDepth !== 'core') return null;
    if (!((_R$_questFlags = R._questFlags) !== null && _R$_questFlags !== void 0 && _R$_questFlags.endgameUnlocked)) return null;
    var curZone = ZONES[S.currentZone];
    if (!(curZone !== null && curZone !== void 0 && curZone.element) || curZone.endgame) return null; /* already in endgame zone */
    /* Show portal near dungeon entrance */
    return React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 210,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 18,
        display: 'flex',
        gap: 8
      }
    }, React.createElement('button', {
      className: 'bt-interact-prompt',
      style: {
        position: 'relative',
        bottom: 'auto',
        left: 'auto',
        transform: 'none',
        background: 'rgba(44,62,80,.9)',
        border: '1px solid rgba(80,40,120,.5)'
      },
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        var S2 = stateRef.current,
          P2 = S2.player;
        S2.currentZone = 'shadow';
        updateZoneDimensions('shadow');
        BT_AUDIO.startZoneAmbient('shadow');
        S2.map = generateZoneMap('shadow');
        S2.monsters = spawnMonstersForZone(ZONES.shadow, 60);
        S2.gatherNodes = spawnGatherNodes('shadow', 'core');
        S2._currentDepth = 'core';
        P2.x = 20 * TILE;
        P2.y = 37 * TILE;
        S2.groundLoot = [];
        S2.hitParticles = [];
        S2.deathExplosions = [];
        S2.arrows = [];
        S2._ambientParticles = [];
        S2._zoneWipe = Date.now();
        S2.dmgNumbers.push({
          x: P2.x,
          y: P2.y - 40,
          text: 'Shadow Sanctum',
          color: '#8E44AD',
          ts: Date.now()
        });
        S2.dmgNumbers.push({
          x: P2.x,
          y: P2.y - 25,
          text: 'Lv 81-100',
          color: 'rgba(255,255,255,.5)',
          ts: Date.now()
        });
      },
      onMouseDown: function onMouseDown(e) {
        return e.preventDefault();
      }
    }, '🌑 Enter Shadow Sanctum'), React.createElement('button', {
      className: 'bt-interact-prompt',
      style: {
        position: 'relative',
        bottom: 'auto',
        left: 'auto',
        transform: 'none',
        background: 'rgba(200,180,40,.85)',
        border: '1px solid rgba(241,196,15,.5)'
      },
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        var S2 = stateRef.current,
          P2 = S2.player;
        S2.currentZone = 'radiant';
        updateZoneDimensions('radiant');
        BT_AUDIO.startZoneAmbient('radiant');
        S2.map = generateZoneMap('radiant');
        S2.monsters = spawnMonstersForZone(ZONES.radiant, 60);
        S2.gatherNodes = spawnGatherNodes('radiant', 'core');
        S2._currentDepth = 'core';
        P2.x = 20 * TILE;
        P2.y = 37 * TILE;
        S2.groundLoot = [];
        S2.hitParticles = [];
        S2.deathExplosions = [];
        S2.arrows = [];
        S2._ambientParticles = [];
        S2._zoneWipe = Date.now();
        S2.dmgNumbers.push({
          x: P2.x,
          y: P2.y - 40,
          text: 'Radiant Heights',
          color: '#F1C40F',
          ts: Date.now()
        });
        S2.dmgNumbers.push({
          x: P2.x,
          y: P2.y - 25,
          text: 'Lv 81-100',
          color: 'rgba(255,255,255,.5)',
          ts: Date.now()
        });
      },
      onMouseDown: function onMouseDown(e) {
        return e.preventDefault();
      }
    }, '☀️ Enter Radiant Heights'));
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      // Legacy bottom toolbar — replaced by the utility wheel (§1.7d).
      // Hidden in v14.x; kept in tree to avoid surgery on a 33k-line file
      // and because some buttons drive functions not yet relocated.
      display: 'none',
      background: 'rgba(10,8,20,.95)',
      borderTop: '1px solid rgba(255,255,255,.08)',
      alignItems: 'center',
      gap: 3,
      padding: '3px 6px',
      flexShrink: 0,
      height: 44,
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch'
    }
  }, /*#__PURE__*/React.createElement(React.Fragment, null, rpgState && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
      marginRight: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#fff'
    }
  }, "Lv", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 4,
      background: 'rgba(255,255,255,.1)',
      borderRadius: 2,
      overflow: 'hidden'
    },
    title: 'XP: ' + rpgState.xp + '/' + xpRequired(rpgState.level)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.min(100, rpgState.xp / xpRequired(rpgState.level) * 100) + '%',
      height: '100%',
      background: '#a78bfa',
      borderRadius: 2
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 800,
      color: '#f5c542'
    }
  }, "\uD83D\uDCB0", rpgState.coins)), function (_stateRef$current59) {
    var closeAll = function closeAll() {
      setShowStatScreen(false);
      setShowInventory(false);
      setShowSkills(false);
      setShowClanPanel(false);
      setShowSocialPanel(false);
      setShowEmotes(false);
      setShowShop(false);
      setShowInfo(false);
      setShowEncyclopedia(false);
      setShowLeaderboard(false);
      setShowGuildPanel(false);
      setShowFeedback(false);
    };
    var tog = function tog(getter, setter) {
      if (getter) {
        closeAll();
      } else {
        closeAll();
        setter(true);
      }
    };
    return [{
      e: '💬',
      badge: unreadChats || 0,
      fn: function fn() {
        setChatOpen(function (s) {
          return !s;
        });
        if (!chatOpen) setUnreadChats(0);
      }
    }, {
      e: '⚔️',
      fn: function fn() {
        return tog(showStatScreen, setShowStatScreen);
      }
    }, {
      e: '🎒',
      badge: (((_stateRef$current59 = stateRef.current) === null || _stateRef$current59 === void 0 || (_stateRef$current59 = _stateRef$current59.rpg) === null || _stateRef$current59 === void 0 ? void 0 : _stateRef$current59.weaponStash) || []).length || 0,
      fn: function fn() {
        return tog(showInventory, setShowInventory);
      }
    }, {
      e: '📊',
      fn: function fn() {
        return tog(showSkills, setShowSkills);
      }
    }, {
      e: '📖',
      fn: function fn() {
        return tog(showEncyclopedia, setShowEncyclopedia);
      }
    }, {
      e: '🏛️',
      fn: function fn() {
        return tog(showGuildPanel, setShowGuildPanel);
      }
    }, {
      e: '🏆',
      fn: function fn() {
        return tog(showLeaderboard, setShowLeaderboard);
      }
    }, {
      e: '📝',
      fn: function fn() {
        return tog(showFeedback, setShowFeedback);
      }
    }, {
      e: '🏰',
      fn: function fn() {
        return tog(showClanPanel, setShowClanPanel);
      }
    }, {
      e: '👥',
      badge: friendsList.length || 0,
      fn: function fn() {
        return tog(showSocialPanel, setShowSocialPanel);
      }
    }, {
      e: bodySize === 'slim' ? '🧍' : '🛡️',
      fn: function fn() {
        var nb = bodySize === 'slim' ? 'armored' : 'slim';
        setBodySize(nb);
        stateRef.current.bodySize = nb;
      }
    }, {
      e: '💥',
      bg: function (_stateRef$current60) {
        var R = (_stateRef$current60 = stateRef.current) === null || _stateRef$current60 === void 0 ? void 0 : _stateRef$current60.rpg;
        if (!R) return 'rgba(255,60,60,.15)';
        var mana = R.mana || 0;
        var cost = 30;
        return mana >= cost ? 'rgba(60,200,60,.15)' : 'rgba(255,60,60,.15)';
      }(),
      fn: function fn() {
        return doSpecialAttack();
      }
    }, {
      e: '🪤',
      fn: function fn() {
        var _sk$trapping, _sk$woodcutting;
        var S = stateRef.current;
        var R = S.rpg;
        if (!R || !S.lockedTarget || S.lockedTarget.type !== 'monster') {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Lock a weak monster first!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var m = S.lockedTarget.ref;
        if (!m.alive) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Target is dead!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var hpPct = m.curHp / m.hp;
        if (hpPct > TRAP_HP_THRESHOLD) {
          S.dmgNumbers.push({
            x: m.x,
            y: m.y - 25,
            text: 'Too healthy! (<20% HP)',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var sk = R.lifeSkills;
        if (!sk.pets) sk.pets = [];
        if (sk.pets.length >= MAX_PET_SLOTS) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Pet slots full! (' + MAX_PET_SLOTS + ')',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var trapLvl = ((_sk$trapping = sk.trapping) === null || _sk$trapping === void 0 ? void 0 : _sk$trapping.level) || 1;
        var wcLvl = ((_sk$woodcutting = sk.woodcutting) === null || _sk$woodcutting === void 0 ? void 0 : _sk$woodcutting.level) || 1;
        /* Woodcutting provides better trap materials: +0.2% per woodcutting level */
        var wcBonus = wcLvl * 0.002;
        var baseChance = 0.4 + trapLvl * 0.005 + wcBonus;
        var levelPenalty = Math.max(0, (m.level || 1) - R.level) * 0.05;
        var chance = Math.max(0.1, Math.min(0.95, baseChance - levelPenalty));
        if (Math.random() > chance) {
          S.dmgNumbers.push({
            x: m.x,
            y: m.y - 25,
            text: 'Escaped!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          addLifeSkillXp(sk, 'trapping', 5);
          BT_AUDIO.beep(200, 0.08, 0.12, 'square');
          return;
        }
        var pet = createPet(m);
        sk.pets.push(pet);
        if (sk.activePet === null) sk.activePet = sk.pets.length - 1;
        m.alive = false;
        m.respawnAt = Date.now() + 60000;
        var leveled = addLifeSkillXp(sk, 'trapping', 15 + (m.level || 1) * 2);
        S.dmgNumbers.push({
          x: m.x,
          y: m.y - 20,
          text: 'Captured ' + pet.name + '!',
          color: '#3dd497',
          ts: Date.now()
        });
        S.dmgNumbers.push({
          x: m.x,
          y: m.y - 35,
          text: pet.emoji + ' ' + pet.archetype + ' Lv' + (m.level || 1),
          color: pet.color,
          ts: Date.now()
        });
        if (leveled) S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 50,
          text: 'Trapping Lv' + sk.trapping.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        S.lockedTarget = null;
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
        }, 100);
        setTimeout(function () {
          return BT_AUDIO.beep(659, 0.1, 0.08, 'sine');
        }, 200);
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.15, 0.1, 'sine');
        }, 300);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, {
      e: '😀',
      fn: function fn() {
        return setShowEmotes(function (s) {
          return !s;
        });
      }
    }, {
      e: '🔑',
      fn: function fn() {
        var p = getBtPassphrase();
        if (p) alert('Passphrase:\n\n' + p);
      }
    }, {
      e: '🚪',
      bg: 'rgba(255,80,80,.15)',
      fn: function () {
        var _fn = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
          var S, pid, _S$myBroData, _i44, _Object$entries8, _Object$entries8$_i, k, v, _i45, _Object$entries9, _Object$entries9$_i, _k, _v;
          return _regenerator().w(function (_context10) {
            while (1) switch (_context10.n) {
              case 0:
                if (confirm('Log out?')) {
                  _context10.n = 1;
                  break;
                }
                return _context10.a(2);
              case 1:
                S = stateRef.current, pid = getBtPlayerId();
                if (!(pid && S.rpg)) {
                  _context10.n = 9;
                  break;
                }
                _context10.n = 2;
                return btRpc('bt_register_player', {
                  p_id: pid,
                  p_name: S.myName || 'Anon',
                  p_avatar: S.myAvatar,
                  p_color: S.myColor,
                  p_body_torso: S.bodyTorso,
                  p_body_legs: S.bodyLegs,
                  p_bro_id: ((_S$myBroData = S.myBroData) === null || _S$myBroData === void 0 ? void 0 : _S$myBroData.ID) || null,
                  p_bro_data: S.myBroData || null
                });
              case 2:
                syncRpgToServer(S.rpg);
                if (!S.rpg.inventory) {
                  _context10.n = 5;
                  break;
                }
                _i44 = 0, _Object$entries8 = Object.entries(S.rpg.inventory);
              case 3:
                if (!(_i44 < _Object$entries8.length)) {
                  _context10.n = 5;
                  break;
                }
                _Object$entries8$_i = _slicedToArray(_Object$entries8[_i44], 2), k = _Object$entries8$_i[0], v = _Object$entries8$_i[1];
                if (!(v > 0)) {
                  _context10.n = 4;
                  break;
                }
                _context10.n = 4;
                return btRpc('bt_sync_inventory', {
                  p_id: pid,
                  p_item: k,
                  p_qty: v
                });
              case 4:
                _i44++;
                _context10.n = 3;
                break;
              case 5:
                if (!S.rpg.skills) {
                  _context10.n = 8;
                  break;
                }
                _i45 = 0, _Object$entries9 = Object.entries(S.rpg.skills);
              case 6:
                if (!(_i45 < _Object$entries9.length)) {
                  _context10.n = 8;
                  break;
                }
                _Object$entries9$_i = _slicedToArray(_Object$entries9[_i45], 2), _k = _Object$entries9$_i[0], _v = _Object$entries9$_i[1];
                if (!(typeof _v === 'number')) {
                  _context10.n = 7;
                  break;
                }
                _context10.n = 7;
                return btRpc('bt_sync_skill', {
                  p_id: pid,
                  p_skill: _k,
                  p_value: _v
                });
              case 7:
                _i45++;
                _context10.n = 6;
                break;
              case 8:
                if (!S.stats) {
                  _context10.n = 9;
                  break;
                }
                _context10.n = 9;
                return btRpc('bt_update_stats', {
                  p_id: pid,
                  p_steps: S.stats.steps || 0,
                  p_msgs: S.stats.msgsSent || 0,
                  p_emotes: S.stats.emotesUsed || 0
                });
              case 9:
                try {
                  localStorage.removeItem('bt_passphrase');
                  localStorage.removeItem('bt_player');
                  localStorage.removeItem('bt_rpg');
                  localStorage.removeItem('bt_stats');
                } catch (e) {}
                window.location.reload();
              case 10:
                return _context10.a(2);
            }
          }, _callee10);
        }));
        function fn() {
          return _fn.apply(this, arguments);
        }
        return fn;
      }()
    }].map(function (b, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: b.fn,
        style: {
          width: 28,
          height: 28,
          borderRadius: 6,
          border: 'none',
          flexShrink: 0,
          background: b.bg || 'rgba(255,255,255,.06)',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          padding: 0
        }
      }, b.e, b.badge > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: -3,
          right: -3,
          fontSize: 7,
          fontWeight: 900,
          color: '#fff',
          background: '#5b52ff',
          borderRadius: 6,
          padding: '0 3px',
          minWidth: 10,
          textAlign: 'center',
          lineHeight: '12px'
        }
      }, b.badge));
    });
  }())), showInfo && /*#__PURE__*/React.createElement(InfoPanel, { playerCount: playerCount, setPlayerCount: setPlayerCount, setShowInfo: setShowInfo, stateRef: stateRef }), function (_stateRef$current61) {
    var R = (_stateRef$current61 = stateRef.current) === null || _stateRef$current61 === void 0 ? void 0 : _stateRef$current61.rpg;
    if (!R) return null;
    var hp = R.hp || 0,
      maxHp = R.maxHp || 1,
      mana = Math.floor(R.mana || 0),
      maxMana = R.maxMana || 1;
    var stam = Math.floor(R.stamina || 0),
      maxStam = R.maxStamina || 1;
    var hpPct = Math.max(0, Math.min(100, hp / maxHp * 100));
    var manaPct = Math.max(0, Math.min(100, mana / maxMana * 100));
    var stamPct = Math.max(0, Math.min(100, stam / maxStam * 100));
    var hpCol = hpPct > 50 ? '#3dd497' : hpPct > 25 ? '#d4a03d' : '#dd4444';
    var slot = R.activeSlot || 'melee';
    var wpnIcon = slot === 'ranged' ? '🏹' : slot === 'staff' ? '🪄' : '⚔️';
    var wpn = typeof getActiveWeapon === 'function' ? getActiveWeapon(R) : null;
    var elemCol = wpn !== null && wpn !== void 0 && wpn.element1 && ELEMENTS[wpn.element1] ? ELEMENTS[wpn.element1].color : null;
    return React.createElement('div', {
      className: 'bt-desktop-stats'
    }, React.createElement('div', {
      className: 'bt-ds-row'
    }, React.createElement('div', {
      className: 'bt-ds-icon'
    }, '❤️'), React.createElement('div', {
      className: 'bt-ds-track'
    }, React.createElement('div', {
      className: 'bt-ds-fill',
      style: {
        width: hpPct + '%',
        background: hpCol
      }
    })), React.createElement('div', {
      className: 'bt-ds-val'
    }, hp + '/' + maxHp)), React.createElement('div', {
      className: 'bt-ds-row'
    }, React.createElement('div', {
      className: 'bt-ds-icon'
    }, '💧'), React.createElement('div', {
      className: 'bt-ds-track'
    }, React.createElement('div', {
      className: 'bt-ds-fill',
      style: {
        width: manaPct + '%',
        background: '#5b8def'
      }
    })), React.createElement('div', {
      className: 'bt-ds-val'
    }, mana + '/' + maxMana)), React.createElement('div', {
      className: 'bt-ds-row'
    }, React.createElement('div', {
      className: 'bt-ds-icon'
    }, '⚡'), React.createElement('div', {
      className: 'bt-ds-track'
    }, React.createElement('div', {
      className: 'bt-ds-fill',
      style: {
        width: stamPct + '%',
        background: '#d4a03d'
      }
    })), React.createElement('div', {
      className: 'bt-ds-val'
    }, stam + '/' + maxStam)), React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 1
      }
    }, React.createElement('span', {
      style: {
        fontSize: 12
      }
    }, wpnIcon), React.createElement('span', {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.6)',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, (wpn === null || wpn === void 0 ? void 0 : wpn.name) || slot), elemCol && React.createElement('span', {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: elemCol,
        display: 'inline-block'
      }
    })));
  }(),
  /* v2.3.816: floating-joystick touch zones.  Left half = movement, right
     half = aim/combat; each captures touches anywhere in its half and spawns
     the joystick under the finger (see the dual-joystick effect).  Transparent
     and z-index 6 so they sit over the world canvas but under all HUD
     (z>=20).  bt-desktop-hide drops them on desktop so the mouse reaches the
     canvas. */
  /*#__PURE__*/React.createElement("div", {
    ref: lZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'L',
    style: { position: 'fixed', left: 0, top: 0, width: '50%', height: 'calc(100% - var(--dash-h))', zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /*#__PURE__*/React.createElement("div", {
    ref: rZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'R',
    style: { position: 'fixed', right: 0, top: 0, width: '50%', height: 'calc(100% - var(--dash-h))', zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /* duplicate kb-hints removed — kept the one near joystick zone below */ /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-zone",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--dash-h) + 70px)',
      left: isLandscape ? 16 : 12,
      zIndex: 30,
      /* v2.3.816: visuals only -- touches are handled by lZoneRef beneath,
         so this corner box must not intercept them. */
      pointerEvents: 'none',
      width: isLandscape ? 98 : 83,
      height: isLandscape ? 98 : 83
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-base",
    ref: joystickRef,
    style: {
      width: isLandscape ? 90 : 75,
      height: isLandscape ? 90 : 75,
      /* v2.3.816: floating -- position:fixed so left/top (set on touchstart)
         place the base CENTRE at the finger; hidden (opacity 0) until then;
         the whole disc renders at 25% (owner: "75% transparency"). */
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 0.12s ease',
      /* v2.3.99: sprite-backed base.  Overrides the rgba bg + border in
         game.css with the metal-ring + center-hole art the user uploaded.
         No overflow:hidden -- the stick + knob layer on top and don't
         need clipping, the sprite art handles its own rim. */
      backgroundImage: 'url(/sprites/joystick/base.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }, /*#__PURE__*/React.createElement("div", {
    /* Analog "stick" — anchored at joystick centre, grows toward the
       knob when dragged.  transform-origin at left-centre so rotation
       pivots at the disc centre; width set dynamically by
       handleJoystickMove.  v2.3.100: sprite height bumped 14 -> 22
       so the rod reads thicker relative to the outer ring (user
       request: "knob + rod much larger relative to the outer ring"). */
    ref: lStickRef,
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 0,
      height: 33,
      marginTop: -16,
      transformOrigin: '0% 50%',
      transform: 'rotate(0rad)',
      backgroundImage: 'url(/sprites/joystick/stick.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: 0,
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-knob",
    ref: knobRef,
    style: {
      zIndex: 1,
      /* v2.3.100: sprite-backed knob.  Size override below + the
         CSS .bt-joystick-knob 24->44 px bump in game.css makes the
         knob much larger relative to the outer ring (user request). */
      width: isLandscape ? 48 : 42,
      height: isLandscape ? 48 : 42,
      backgroundImage: 'url(/sprites/joystick/knob.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }), /*#__PURE__*/React.createElement("div", {
    /* Left-joystick weapon-swap preview overlay (v2.3.97).  Hidden by
       default; shown for PREVIEW_HOLD_MS ms after a single tap so the
       player can confirm the NEXT slot before committing to the
       second tap.  The lE handler stamps a slot label via
       innerText. */
    ref: lJoyPreviewRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
      fontSize: isLandscape ? 18 : 16,
      fontWeight: 800,
      color: 'rgba(255,235,160,0.95)',
      textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(255,200,80,0.5)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bt-desktop-hide",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--dash-h) + 70px)',
      right: isLandscape ? 50 : 50,
      zIndex: 30,
      /* v2.3.816: visuals only -- touches handled by rZoneRef beneath. */
      pointerEvents: 'none',
      width: isLandscape ? 98 : 83,
      height: isLandscape ? 98 : 83
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: rJoyRef,
    className: "bt-rjoy-base",
    style: {
      width: isLandscape ? 90 : 75,
      height: isLandscape ? 90 : 75,
      /* v2.3.816: floating -- position:fixed, hidden until touchstart sets
         left/top to the finger; whole disc at 25% opacity. */
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      opacity: 0,
      transition: 'opacity 0.12s ease',
      /* v2.3.99: sprite-backed base.  The previous rgba bg + dynamic
         autoAttack border/shadow are gone; auto-attack signal is now a
         separate red-ring overlay rendered below.  borderRadius kept
         so the hit-test shape stays circular. */
      borderRadius: '50%',
      backgroundImage: 'url(/sprites/joystick/base.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      touchAction: 'none',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }, autoAttack && /*#__PURE__*/React.createElement("div", {
    /* v2.3.99: auto-attack indicator.  Replaces the dynamic
       border/box-shadow recoloring we used to do on .bt-rjoy-base
       (which we can't do anymore now that the base is a fixed sprite).
       Thin red ring sits flush on top of the base sprite. */
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: '2px solid rgba(255,80,80,0.85)',
      boxShadow: '0 0 12px rgba(255,80,80,0.55)',
      pointerEvents: 'none',
      zIndex: 2,
    }
  }), /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      transform: 'rotate(-90deg)',
      pointerEvents: 'none',
      zIndex: 1
    }
  }, function (_stateRef$current65) {
    var lastSwipe = ((_stateRef$current65 = stateRef.current) === null || _stateRef$current65 === void 0 ? void 0 : _stateRef$current65._lastSwipe) || 0;
    var cd = 1500;
    var elapsed = Date.now() - lastSwipe;
    var pct = Math.min(1, elapsed / cd);
    if (pct < 1) return React.createElement('circle', {
      cx: '50%',
      cy: '50%',
      r: '28%',
      fill: 'none',
      stroke: pct > 0.8 ? 'rgba(180,255,180,.3)' : 'rgba(255,255,255,.15)',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeDasharray: "".concat(Math.PI * 2 * 28 / 100 * pct * 100, " 999")
    });
    return null;
  }()), /* Mana text removed — shown contextually above the player. */
  null, /*#__PURE__*/React.createElement("div", {
    /* Analog "stick" for the right joystick — mirrors lStickRef.  Width
       and rotation are driven by handleRJoyMove.  v2.3.100: height
       bumped 14 -> 22 to match the left joystick (user request:
       "knob + rod much larger relative to the outer ring"). */
    ref: rStickRef,
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 0,
      height: 33,
      marginTop: -16,
      transformOrigin: '0% 50%',
      transform: 'rotate(0rad)',
      backgroundImage: 'url(/sprites/joystick/stick.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: 0,
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: rKnobRef,
    style: {
      /* v2.3.100: sprite-backed knob, bumped 24 -> 44 px so it reads
         much larger relative to the outer ring (user request).  Same
         drag math (translate from joystick center to clamped finger
         pos) so no handleRJoyMove changes needed. */
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: isLandscape ? 48 : 42,
      height: isLandscape ? 48 : 42,
      backgroundImage: 'url(/sprites/joystick/knob.png?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }, /* Knob left blank — active weapon is shown in WeaponSwapBar instead. */ null), /*#__PURE__*/React.createElement("div", {
    /* Right-joystick shield preview overlay (v2.3.97).  Hidden by
       default; shown for PREVIEW_HOLD_MS ms after a single tap as a
       visual cue that "another tap-and-hold here activates shield."
       The orbiting BlockRing glyph stays hidden until shield is
       actually engaged (per user request: it serves as the active
       arc indicator, not a static button). */
    ref: rJoyPreviewRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
      fontSize: isLandscape ? 16 : 14,
      fontWeight: 800,
      color: 'rgba(150,200,255,0.95)',
      textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(80,140,255,0.5)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }
  }, 'shield'))), /*#__PURE__*/React.createElement("div", {
    ref: shieldJoyRef,
    className: "bt-desktop-hide bt-legacy-shield-removed",
    style: {
      // Legacy standalone shield button — removed v14.x in favor of BlockRing.
      // Element kept in tree (display:none) because BroTown still references
      // shieldJoyRef from non-render code paths; visible UI is now BlockRing.jsx.
      display: 'none',
      position: 'fixed',
      bottom: isLandscape ? 102 : 96,
      right: isLandscape ? 20 : 10,
      zIndex: 30,
      width: isLandscape ? 70 : 60,
      height: isLandscape ? 70 : 60,
      touchAction: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      position: 'relative',
      overflow: 'hidden',
      border: '3px solid ' + (shieldUp ? 'rgba(96,165,250,.8)' : 'rgba(96,165,250,.2)'),
      background: shieldUp ? 'radial-gradient(circle,rgba(96,165,250,.5) 0%,rgba(40,80,180,.3) 100%)' : 'radial-gradient(circle,rgba(50,60,100,.3) 0%,rgba(30,40,70,.2) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: shieldUp ? '0 0 15px rgba(96,165,250,.4)' : 'none',
      cursor: 'pointer',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none'
    }
  }, function (_stateRef$current69) {
    var R = (_stateRef$current69 = stateRef.current) === null || _stateRef$current69 === void 0 ? void 0 : _stateRef$current69.rpg;
    if (!R) return null;
    var stam = R.stamina || 0,
      maxStam = R.maxStamina || 100;
    var pct = Math.max(0, stam / maxStam);
    var isLow = pct < 0.2;
    var onCd = stateRef.current._shieldCdUntil && Date.now() < stateRef.current._shieldCdUntil;
    var filledColor = onCd ? 'rgba(220,50,50,.4)' : isLow ? 'rgba(255,150,30,.4)' : pct > 0.5 ? 'rgba(50,180,100,.4)' : 'rgba(200,160,40,.4)';
    var emptyColor = 'rgba(0,0,0,.3)';
    var deg = Math.round(pct * 360);
    return React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: "conic-gradient(from 0deg at 50% 50%, ".concat(filledColor, " 0deg, ").concat(filledColor, " ").concat(deg, "deg, ").concat(emptyColor, " ").concat(deg, "deg, ").concat(emptyColor, " 360deg)"),
        mask: 'radial-gradient(circle,transparent 48%,black 49%)',
        WebkitMask: 'radial-gradient(circle,transparent 48%,black 49%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'rotate(-90deg)'
      }
    });
  }(), shieldUp && function () {
    var ang = stateRef.current._shieldAngle || 0;
    var sz = isLandscape ? 70 : 60;
    var r = sz * 0.35;
    var ccx = sz / 2,
      ccy = sz / 2;
    return React.createElement('svg', {
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2
      }
    }, React.createElement('line', {
      x1: ccx,
      y1: ccy,
      x2: ccx + Math.cos(ang) * r,
      y2: ccy + Math.sin(ang) * r,
      stroke: 'rgba(96,165,250,.9)',
      strokeWidth: 3,
      strokeLinecap: 'round'
    }));
  }(), function (_stateRef$current70) {
    var R = (_stateRef$current70 = stateRef.current) === null || _stateRef$current70 === void 0 ? void 0 : _stateRef$current70.rpg;
    if (!R) return null;
    var stam = Math.floor(R.stamina || 0),
      maxStam = R.maxStamina || 100,
      deficit = maxStam - stam;
    var pct = stam / maxStam;
    return React.createElement('div', {
      style: {
        position: 'absolute',
        top: 2,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: 1,
        zIndex: 2
      }
    }, React.createElement('div', {
      style: {
        fontSize: 5,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        letterSpacing: '.3px'
      }
    }, 'ENERGY'), React.createElement('div', {
      style: {
        fontSize: 8,
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,.8)'
      }
    }, stam));
  }(), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: isLandscape ? 22 : 18,
      pointerEvents: 'none',
      zIndex: 1
    }
  }, "\uD83D\uDEE1\uFE0F")))), ((_window$matchMedia = (_window = window).matchMedia) === null || _window$matchMedia === void 0 || (_window$matchMedia = _window$matchMedia.call(_window, '(pointer:fine)')) === null || _window$matchMedia === void 0 ? void 0 : _window$matchMedia.matches) && /*#__PURE__*/React.createElement("div", {
    className: "bt-kb-hints"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "WASD"), " Move"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Click"), " Attack"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "R-Click"), " Special"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Space"), " Dodge"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "E"), " Interact"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Q"), " Shield"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Tab"), " Swap"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "F"), " Special"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "C"), " Chat"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Esc"), " Close")), chatOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 10,
      right: 10,
      bottom: '70%',
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 8px',
      background: 'rgba(10,8,20,.95)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.2)',
      boxShadow: '0 4px 24px rgba(0,0,0,.7)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setChatOpen(false);
      setChatInput('');
      chatInputValRef.current = '';
    },
    onClick: function onClick() {
      setChatOpen(false);
      setChatInput('');
      chatInputValRef.current = '';
    },
    style: {
      width: 28,
      height: 28,
      borderRadius: 6,
      border: 'none',
      flexShrink: 0,
      background: 'rgba(255,255,255,.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      padding: 0,
      color: '#fff'
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("input", {
    ref: chatInputRef,
    placeholder: "Tap to type\u2026",
    value: chatInput,
    onChange: function onChange(e) {
      setChatInput(e.target.value);
      chatInputValRef.current = e.target.value;
    },
    onKeyDown: function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChat();
        setChatOpen(false);
        if (chatInputRef.current) chatInputRef.current.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setChatOpen(false);
        if (chatInputRef.current) chatInputRef.current.blur();
      }
    },
    enterKeyHint: "send",
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: "false",
    maxLength: 200,
    style: {
      flex: 1,
      padding: '8px 10px',
      /* Opaque white BG + black text so the input stays readable
         regardless of iOS / Android default input styling overrides
         (some platforms force white BG even when CSS asks for
         translucent — that combined with our prior color:#fff was
         showing as white-on-white). */
      background: '#ffffff',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 6,
      color: '#000',
      fontSize: 16,
      outline: 'none',
      minWidth: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      if (chatInputRef.current) chatInputRef.current.blur();
      sendChat();
    },
    onClick: function onClick() {
      if (chatInputRef.current) chatInputRef.current.blur();
      sendChat();
    },
    style: {
      padding: '8px 14px',
      background: 'var(--pop)',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "Send")));
};
