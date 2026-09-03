import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js'; /* v2.3.2213: the crit preview hook uses the real crit colour */
import { shopBus } from './mobile/shopBus.js';   /* v2.3.2050: Shopkeeper Bro's window */
import { uiBusyBus } from './mobile/uiBusyBus.js'; /* v2.3.2085: tell chrome outside this tree to stand aside */
import { zonePlayerScale } from '@/data/zones.js'; /* v2.3.1574: the one copy of the vista perspective curve */
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
/* v2.3.869: stat screen panel extraction. */
import { StatScreenPanel } from './panels/StatScreenPanel.jsx';
/* v2.3.870: quest panel extraction (logic already in @/game/quests.js). */
import { QuestPanel } from './panels/QuestPanel.jsx';
import { InventoryPanel } from './panels/InventoryPanel.jsx';
import { TradePanel } from './panels/TradePanel.jsx';
import { TradeWindowPanel } from './panels/TradeWindowPanel.jsx';
import { PartyHUD } from './panels/PartyHUD.jsx';
import { IncomingTradePanel } from './panels/IncomingTradePanel.jsx';
import { PlayerListPanel } from './panels/PlayerListPanel.jsx';
import { EmotePanel } from './panels/EmotePanel.jsx';
import { InspectPlayerPanel } from './panels/InspectPlayerPanel.jsx';
import { NameModal } from './panels/NameModal.jsx';
/* v2.3.1814: the login door that now sits in front of the creator.
   getBtPassphrase is already imported further down with the other
   networking helpers — only checkAccountLogin is new here. */
import { LoginScreen } from './panels/LoginScreen.jsx';
import { checkAccountLogin } from '@/networking/index.js';
import { KeyboardHintsPanel } from './panels/KeyboardHintsPanel.jsx';
import { UpdateBanner } from './panels/UpdateBanner.jsx';
import { startBuildWatch } from '@/game/buildWatch.js';
import { TouchControls } from './panels/TouchControls.jsx';
import { AbilityButtons } from './panels/AbilityButtons.jsx'; /* v2.3.1733 */
import { ShieldButton } from './panels/ShieldButton.jsx'; /* v2.3.2242: the shield is a toggle button under Attack */
import { GESTURE_TOOL_URLS } from '@/game/gesturePose.js'; /* v2.3.2245: the tool strips the button face plays */
import { TargetArrows } from './panels/TargetArrows.jsx'; /* v2.3.2243: switch targets when two or more are in the perimeter */
import { engageNearest } from '@/game/targeting.js'; /* v2.3.2242: Attack engages the nearest monster in the perimeter */
import { raiseShieldToggle, dropShield, shieldAimAngle } from '@/game/shieldToggle.js'; /* v2.3.2242 */
import { DuelRequestPanel } from './panels/DuelRequestPanel.jsx';
import { ThreatIncomingPanel } from './panels/ThreatIncomingPanel.jsx';
import { ChatPanel } from './panels/ChatPanel.jsx';
import { ActiveWarBanner, EndedWarBanner } from './panels/WarBanner.jsx';
/* v2.3.1205: named z-index registry — see src/ui/zLayers.js for the
   observed ladder + the tutorial-banner-under-dashboard incident. */
import { Z_ABOVE_DASH_PROMPT } from './zLayers.js';
import { MenuBar } from './panels/MenuBar.jsx';
import { RevealOverlay } from './reveal/RevealOverlay.jsx'; /* v2.3.1925 */
/* v2.3.872: buildingPanel sub-panels (decomposed individually). */
import { ForgePanel } from './panels/buildings/ForgePanel.jsx';
import { WoodworkPanel } from './panels/buildings/WoodworkPanel.jsx';
import { EnchantPanel } from './panels/buildings/EnchantPanel.jsx';
import { GemcutPanel } from './panels/buildings/GemcutPanel.jsx';
import { ExchangePanel } from './panels/buildings/ExchangePanel.jsx';
import { FarmPanel } from './panels/buildings/FarmPanel.jsx';
import { BankPanel } from './panels/buildings/BankPanel.jsx';
import { CookPanel } from './panels/buildings/CookPanel.jsx';
import { GamblePanel } from './panels/buildings/GamblePanel.jsx';
import { PartyPanel } from './panels/buildings/PartyPanel.jsx';
import { VendorPanel } from './panels/buildings/VendorPanel.jsx';
import { MINE_SPOT_R, WORLD_ZOOM, FARM_BED_TILE } from '@/data/constants.js';
/* v2.3.1189: LEGACY DEBT burn-down — these five resolved only via the
   Object.assign(globalThis, DATA) below (eslint grandfathered them).
   Explicit imports close the latent ReferenceError window between
   module eval and the globalThis assignment.  Note TOWN_W/TOWN_H are
   live `let` bindings (updateZoneDimensions reassigns them) — the
   import reads the CURRENT value, where the globalThis copy was frozen
   at boot; the only reader is the NPC wander clamp, dormant while
   NPC_DATA is empty. */
import { CLAN_WAR_REWARDS, PET_LOOT_RADIUS, TOWN_W, TOWN_H, calcDisplayHeal,
  hasGatherTool} from '@/data/index.js';
import { IntroVideo } from './IntroVideo.jsx';
/* v2.3.1593: mayorWelcomeSeen dropped — its only caller was the greeting
   trigger the owner asked to remove.  MayorGreeting itself stays imported
   because the (now unreachable) render branch below still references it. */
import { MayorGreeting } from './MayorGreeting.jsx';
/* v2.3.2121: the first-join welcome + "find Mayor Bro" objective.  A banner,
   NOT the greeting video above — see welcomeBanner.js for why those are
   different asks. */
import { maybeShowWelcome } from '@/game/welcomeBanner.js';
import { BUILD_INFO } from './BuildBadge.jsx';
import { pushHudPopup } from './XpFlyOverlay.jsx';

/* v2.3.1745: how long the QUEST ACCEPTED! / QUEST COMPLETED! banner stays
   up.  Exported so the headless check reads the real number instead of
   hard-coding a copy that can drift (tools/qa/mp/mp-questbanner.mjs). */
export var QUEST_MSG_MS = 2200;
/* ═══ v2.3.1816: THE ONES THAT SAY WHAT YOU GOT STAY UP LONGER ═══
   Owner: "Make the reward completion message moments after collecting
   required items stay on screen longer."

   Split by KIND rather than raising the one number, because the three
   banners do different jobs.  QUEST ACCEPTED! is a go-cue — you already know
   what you accepted, you were just reading the card — and 2.2s suits it.
   QUEST COMPLETED! and QUEST REWARD carry the thing you actually want to
   read: which quest closed, and what it paid.  Those fire the moment the last
   required item lands, which is usually mid-fight or mid-harvest with your
   eyes somewhere else, so 2.2s routinely expired before the player looked up.

   4200 was a little under twice as long: enough to look up, find the banner
   and read a title plus a reward line, without holding the screen so long
   that the next banner stacks up behind it (the queue gate waits out the
   current one, so an over-long hold delays whatever follows).

   v2.3.1915 (owner: "Make the quest complete message stay for another
   second"): 4200 -> 5200. The reasoning above is unchanged and so is the
   ceiling it describes — the queue gate still waits out the current banner,
   so this costs a second on anything queued behind a completion. That is
   affordable because completions do not arrive back to back: the next banner
   after a QUEST COMPLETED! is the accept of the following step, which needs a
   walk to the giver first. */
export var QUEST_MSG_LONG_MS = 5200;
/* ONE place decides, so the queue gate, the expiry sweep, the render gate and
   the CSS fade cannot drift apart — a banner that is drawn while considered
   expired (or held with no fade) is the failure that split constants cause. */
/* v2.3.1884: is this NPC's quest ready to HAND IN right now?
 *
 * The proximity latch (v2.3.1701) records that you have already been shown
 * this NPC; what it could not express is that the NEWS changed while you stood
 * there.  This is the ONLY change of news that releases it — see the note in
 * the proximity opener for why it is deliberately just this one.
 *
 * Defined ONCE, at module scope, because THREE doors arm the latch
 * (proximity, tap, desktop E-key) and a hand-copied condition in any of them
 * would latch a state the others cannot recognise, which reads as the dialogue
 * re-opening at random.  Module scope also side-steps the fact that the game
 * loop is written ABOVE the component body: a `var` helper there is hoisted
 * but unassigned, and would only work because the loop happens to run later.
 *
 * `check` is quest-authored and runs every frame, so it is wrapped — a throw
 * here would take the whole render loop down over a cosmetic re-open. */
function _npcQuestReady(S, npcQ) {
  if (!npcQ || npcQ.status !== 'active') return false;
  /* v2.3.1914: the shared implementation, so the opener and the panel it
     opens cannot answer this differently — which is exactly what they were
     doing (see questObjectiveDone). */
  return DATA.questObjectiveDone(npcQ.quest, S, S && S.rpg);
}

export function questMsgMs(kind) {
  /* v2.3.2121: 'welcome' joins the long hold.  It is the one banner whose
     reader has never seen this screen before — 2.2s is a go-cue for someone
     who already knows what the plate is, and the first-join greeting is
     asking them to find a name they have not met yet.  It also fires ONCE in
     a character's life, so the queue cost the note above worries about is
     paid at most once. */
  return (kind === 'completed' || kind === 'reward' || kind === 'welcome')
    ? QUEST_MSG_LONG_MS : QUEST_MSG_MS;
}

/* v2.3.868: COOK_PAN_BY_FISH removed — it fed panSheetSrc to the
   canvas CookingMinigame (pan + doneness slider), retired in v2.3.853
   when cooking became the swipe-to-flip campfire extraction. The map had
   no remaining consumer. */

/* v2.3.1207: COOKED_HEAL_BY_KEY / COOKED_HEAL_DEFAULT removed — the
   mobile eat path's private 30/50-HP table matched neither
   getFishHealAmount nor the server's recovery-folded heal, and the
   path never sent eat_request, so the worker's next player_state echo
   stomped the fake self-heal.  The eatBus handler now mirrors the
   CookPanel/InventoryPanel eat path (calcDisplayHeal prediction +
   eat_request). */
import { unequipWeaponSlot } from './mobile/dash/equipActions.js'; /* v2.3.2123: on the autotest bridge below */
import { firemakingBus } from './mobile/firemakingBus.js';
import { eatBus } from './mobile/eatBus.js';
import { blockRingBus } from './mobile/blockRingBus.js';
import { chatBubbleBus } from './mobile/chatBubbleBus.js'; /* v2.3.1287: self-tap opens chat */
import { chatLogBus } from './mobile/chatLogBus.js'; /* v2.3.1980: the world-chat feed listens here */
import { controlsTutorialBus } from './mobile/controlsTutorialBus.js';
/* v2.3.1796: the questline teaches the controls by flashing the real one
   (owner).  Sibling of, not replacement for, ControlsTutorial above — see
   the header of QuestCoach.jsx for why both exist. */
import { QuestCoach } from './mobile/QuestCoach.jsx';
/* Renderer: PixiJS (WebGL) with Canvas 2D fallback */
import { initPixiRenderer, preloadPlayerAssets } from '@/rendering/pixiRenderer.js';
import { IMAGE_ZONE_MAPS } from '@/rendering/tiledMaps.js';
import { perfTracker } from '@/debug/perfTracker.js';
import { t1StatsPayload } from '@/game/t1Sync.js'; /* v2.3.1633: shared T1 report gate */
import * as DATA from '@/data/index.js';
import { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase, generatePassphrase, passphraseToId } from '@/networking/index.js';
/* v2.3.1923: the device's character roster — see src/networking/charRoster.js */
import { rememberChar, ensureChar, activateChar, inRoster, adoptSharedPhrase } from '@/networking/charRoster.js';
import { HEADWEAR_CATALOG, getHeadwear, setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { FACIALHAIR_CATALOG, getFacialHair, setFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { HAIR_CATALOG, getHair, setHair } from '@/rendering/traits/hairCatalog.js';
import { SKIN_CATALOG, PANTS_CATALOG, SHOES_CATALOG, getSkin, setSkin, getPants, setPants, getShoes, setShoes } from '@/rendering/playerSkins.js';
import { HAIR_COLOR_CATALOG, getHairColor, setHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { HAT_COLOR_CATALOG, hatColorsFor, getHatColor, setHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { EYE_COLOR_CATALOG, getEyeColor, setEyeColor } from '@/rendering/traits/eyeColorCatalog.js'; /* v2.3.1928 */
import { HEIGHT_CATALOG, DEFAULT_HEIGHT, getBuildHeight, setBuildHeight, getBuildFrame, wireHeight, wireFrame } from '@/rendering/traits/buildCatalog.js'; /* v2.3.1953; v2.3.1996: frame locked to medium — no FRAME_CATALOG/setBuildFrame here */
import { getShirtArt, getArt, artHasInk } from '@/rendering/traits/playerArt.js'; /* v2.3.1939; v2.3.1940 + pants/tattoo */
import { clearAllArt } from '@/rendering/traits/artOps.js';   /* v2.3.2114/2115: Reset and Randomize clear the painted art */
import { getPattern } from '@/rendering/traits/patternCatalog.js'; /* v2.3.1941 */
import { FACIALHAIR_COLOR_CATALOG, getFacialHairColor, setFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { SHIRT_CATALOG, getShirt, setShirt } from '@/rendering/traits/shirtCatalog.js';
import { SHIRT_COLOR_CATALOG, getShirtColor, setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
import { getEquip, setEquip, reconcileGearStash, migrateTier1Armor } from '@/rendering/gearCatalog.js';
import { wireGearWornSync } from '@/game/gearWornSync.js';
import { wireTorchCrackle, wireThemeMusic } from '@/game/splashAudio.js';
import { wireCharacterPortrait, wireSplashPrewarm, clampLongHairColor } from '@/game/characterCreatorEffects.js';
import { wireTownMusic } from '@/game/townMusic.js';
import { nextWeaponSlot } from '@/game/weaponSlots.js'; /* v2.3.1845: one weapon-cycle rotation */
import { wireSpriteSheets } from '@/game/spriteSheets.js';
import { wireSlimeAudio } from '@/game/slimeAudio.js';
import { wireOrientationSync } from '@/game/orientationSync.js';
/* v2.3.765: combat helpers extracted behavior-frozen (docs/REBUILD-PLAN.md Phase 0). */
import { releasePeerDamage, addBuildProg, pushDmgPopup, monsterPopupY } from '@/game/combatHelpers.js';
import { applyLocalRespawn } from '@/game/respawn.js'; /* v2.3.1822: stuck-dead watchdog */
/* v2.3.767: chat send + chat/emote handlers extracted behavior-frozen (REBUILD-PLAN Phase 2). */
import { sendChatMessage } from '@/game/chat.js';
import { subscribeMutes } from '@/game/chatMute.js'; /* v2.3.1981 */
/* v2.3.787: zone transitions (town exits, tile-9 return, dungeon entrance/exit)
   extracted behavior-frozen (REBUILD-PLAN Phase 6). */
import { handleZoneTransitions } from '@/game/zoneTransitions.js';
/* v2.3.789: desktop keyboard handlers extracted behavior-frozen (REBUILD-PLAN Phase 7). */
import { setupDesktopControls } from '@/game/desktopControls.js';
import { actionBus } from './mobile/actionBus.js'; /* v2.3.1562: quick-bar weapon swap */
import { dashboardPanelBus } from './mobile/dashboardPanelBus.js'; /* v2.3.1701: "is the bottom sheet open?" for the proximity dialogue */
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
import { worldViewport } from '@/game/worldViewport.js'; /* v2.3.1768b */
/* v2.3.817: §5.8 contextual dodge/lunge/retreat cluster extracted behavior-frozen. */
import { triggerContextualDodge } from '@/game/dodge.js';
/* v2.3.819: swing/special/shield action bodies extracted; component keeps thin useCallback wrappers. */
import { swingAttack, specialAttack, elementBurst } from '@/game/playerActions.js'; /* v2.3.2242: raiseShield superseded by game/shieldToggle.js */
/* v2.3.1733: stamina abilities (Shield Bash / Whirlwind) — PR 5 of the
   combat overhaul.  The cast bodies live in @/game/abilities.js for the
   same reason the swing bodies do; this component keeps thin wrappers. */
import { castAbility, abilityStatus, resolveCastAngle, BASH_POSE_MS } from '@/game/abilities.js';
/* v2.3.841: extraction + fishing/cooking/wood/mining reward bodies extracted; component keeps thin useCallback wrappers. */
import { startExtraction, succeedExtraction, applyCookingResult } from '@/game/lifeSkillRewards.js';
/* v2.3.842: emote + building-entry interaction bodies extracted; component keeps thin useCallback wrappers. */
import { sendEmote as sendEmoteImpl, enterBuilding as enterBuildingImpl } from '@/game/interactions.js';
/* v2.3.784: connection lifecycle extracted behavior-frozen (REBUILD-PLAN Phase 5);
   the Phase-4 dispatcher is now consumed by wsClient.js, not here. */
import { setupWebSocket } from '@/networking/wsClient.js';
import { MONSTER_VARIANTS } from '@/data/monsterVariants.js';
import { shardByKey } from '@/data/shards.js';

/* Destructure everything from DATA — the component body references 100+ symbols */
const {
  TILE, TOWN_SPAWN, PLAYER_COLORS, ZONES, ELEMENTS, TOWN_BUILDINGS, TOWN_EXITS, WORLDVIEW_EXITS, BLOCK_ARC_HALF,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, RARITY_TIERS, BT_AUDIO, BT_ACHIEVEMENTS,
  BUILDINGS, NPC_DATA, TILE_SOLID, TILE_COLORS,
  updateZoneDimensions,
  STAT_POINTS_PER_LEVEL, LEVEL_CAP, GEAR_STAT_REQ,
  REFORGE_BONUSES, GEM_CUT_TIERS, COOKING_RECIPES,
  EMOTES, TEXT_EMOTES, MKT_CATEGORIES,
  PET_EVOLUTION_TIERS, FURNITURE_RECIPES,
  DUNGEON_TERRAIN_PACKS, DUNGEON_MONSTER_PACKS,
  MASKS, MINIGAME_REWARDS,
  QUEST_CHAINS, QUEST_STATUS, REPUTATION,
  CLAN_COLORS, CLAN_CREATE_COST, CLAN_MAX_MEMBERS, CLAN_LOGO_SIZE, CLAN_TAG_MAX, CLAN_NAME_MAX,
  createMonster, createDefaultRpg, createDefaultLifeSkills, migrateLifeSkills,
  recalcDerived, getActiveWeapon, meleeSwingSfx, calcWeaponDmg, calcCritChance, calcCritMult,
  getWeaponCritStat, awardWeaponXp, migrateWeaponT2,
  migrateDefenseT2, awardDefenseXp, getDefenseBlockBonus, getIronSkinReduction, getBlockStaminaMult,
  migrateGrids, getConditioningFlat, migrateUniformT2,
  /* v2.3.1697: getArmorHp dropped from the import — armor stopped folding
     into maxHp this version, and nothing in this file called it anyway. */
  calcMoveSpeed, calcMaxHp, calcMaxStam, calcMaxMana, calcBlockReduction,
  calcSpecialDmg, rollPassiveDodge,
  xpRequired, monsterStat, createDefaultCompStats,
  applyStatus, tickStatuses, getOldestStatusElement,
  lookupCollision, resolveCollision, getEffectiveness,
  getTileColor, generateZoneMap, spawnMonstersForZone, spawnGatherNodes, createGatherNode,
  drawMask, getStatVisuals, createDefaultClan,
  awardSkillXp, addLifeSkillXp, addResource, getResource, skillXpRequired,
  createPet,
  rollReforgeBonus, hardenChance,
  getShieldBonus, getShieldStats, getAmuletBonus,
  getSalvageReturns, getAmuletSalvageReturns, gemExtractCost,
  getDungeonCreatorUnlocks, validateCustomDungeon, createDefaultDungeonConfig,
  hasUnlock, getNpcQuest, npcHasQuestChain, /* v2.3.1773 */
  discoverMonster, discoverMaterial, discoverZone, discoverCollision,
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
  ARENA_WIN_REWARD, ARENA_POLL_INTERVAL, ARENA_IDLE_POLL_INTERVAL,

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
import { SpriteHpBar } from './SpriteHpBar.jsx'; /* v2.3.1273: owner's HP-bar art (desktop HUD row) */
import { navSlotSize, bandFootprint, DASH_GAP, LAND_FOLD_CHIP_W } from './mobile/sheet/sheetGeometry.js'; /* v2.3.1283; v2.3.1290 bar-height canvas; v2.3.1325 slot-derived bar; v2.3.1560 two-row band; v2.3.1635 three-row band; v2.3.1636 columns row; v2.3.2156 one footprint for resize + watchdog */
import { playIsLandscape } from './mobile/playViewport.js'; /* v2.3.2156: the data-orient stamp + the isLandscape seed */
import { resolveDashSide, screenAngle } from '../game/dashSidePref.js'; /* v2.3.2177: which edge the landscape dashboard takes, and the player's pin */
import { dashMinBus } from './mobile/dashMinBus.js'; /* v2.3.2119: folded band = identity row only */
import { stampSheetH } from './mobile/sheetStamp.js'; /* v2.3.2197: --sheet-h joins --dash-h under resize() + the watchdog */
import { recolorEnabled } from '@/rendering/traits/recolorOptions.js';
import { buildingPropNear } from '@/data/worldProps.js'; /* v2.3.1778: building doors */

/* ═══ v2.3.2062: THE MANA DRAUGHT'S FLOOR, IN CLIENT FRAMES ═══
 * The server holds the surge as a flat amount PER REGEN TICK (660 ms); this
 * loop runs per FRAME. Converting here rather than shipping a second constant
 * means the two cannot drift: the number itself is the server's, mirrored onto
 * S._manaFlat by wsClient, and all this does is spread it across the frames in
 * a tick. Returns 0 when the buff is not up or the server never sent one, so a
 * cooked meal -- which sets the same timer with no flat amount -- falls through
 * to the ordinary multiplier path untouched.
 * Prediction only: the worker's player_state is the truth, and this exists so
 * the bar climbs smoothly between echoes rather than stepping. */
var MANA_SURGE_TICK_MS = 660;   /* server: REGEN_TICKS x TICK_RATE */
var MANA_SURGE_FPS = 60;
function manaSurgePerFrame(S, active) {
  if (!active) return 0;
  var flat = Number(S && S._manaFlat);
  if (!(flat >= 1 && flat <= 200)) return 0;   /* same bound the server reads */
  return flat / (MANA_SURGE_TICK_MS / 1000) / MANA_SURGE_FPS;
}

/* Expose all exports as globals for the pre-transpiled code.
   The original index.html had everything in one scope; this bridges the gap. */
Object.assign(globalThis, DATA);
Object.assign(globalThis, { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase, generatePassphrase, passphraseToId });
/* BT_API_BASE etc from networking — derive fresh each time */
var BT_API_BASE = (window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev').replace('wss://', 'https://').replace('ws://', 'http://');
var SUPA_URL = ''; var SUPA_KEY = ''; var supa = null;
Object.assign(globalThis, { BT_API_BASE, SUPA_URL, SUPA_KEY, supa });
Object.assign(globalThis, { _regenerator, _regeneratorDefine2, _asyncToGenerator, _typeof, _slicedToArray, _toConsumableArray, _objectSpread, _defineProperty, _toPropertyKey, _toPrimitive, ownKeys, _arrayWithHoles, _iterableToArrayLimit, _unsupportedIterableToArray, _arrayLikeToArray, _nonIterableRest, _arrayWithoutHoles, _iterableToArray, _nonIterableSpread, _createForOfIteratorHelper, asyncGeneratorStep });

/* ── v2.3.1448: tap-to-open resource menu ──────────────────────────
   Owner: "only when a user touches the resource on screen does the
   resource extraction menu pop up.  If they try to extract while too
   far away a message pops up that says they're too far away."

   Two helpers shared by the per-frame proximity scan, the canvas tap
   hit-test and the desktop E key, so "in reach" and "which resource
   is under my finger" are each defined ONCE.

   nodeReachDist: the distance the reach test uses, or null when the
   node is out of reach.

   v2.3.1450 (owner: "the 'too far away' is based on a location that's
   too far down (south) — sometimes you can be standing right on top of
   the resource and it'll say you're too far away.  Make the distance be
   based on the perimeter as if you were standing directly on where the
   resource sprite is located"):  RIGHT.  Trees and ore veins anchor at
   y=1.0, so `node.y` is the BOTTOM of the art and the whole sprite lives
   NORTH of it — a tier-10 tree is ~395 px tall, so standing in the
   middle of its trunk put you ~200 px from the point the old test
   measured to, i.e. "too far away" while visibly on top of it.  Ore was
   worse: a 42 px circle one tile north of the base, against 132+ px of
   rock art.  The reach is now measured to the sprite's PERIMETER (0 when
   you're standing inside the art) with a small pad, so anywhere on or
   just beside the resource counts.  The old anchor-radius tests are kept
   as a floor underneath so nothing that used to be reachable stopped
   being reachable — this change only ever ADDS reach. */
/* ═══ v2.3.1704: THE DEMO'S FREE BLOCK ═══
   Owner: "make it so holding shield doesn't drain energy.  I need to figure
   out what to do with that.  For the demo I want you to be able to block as
   much as you want."
   One named flag rather than deleted code, because the owner said they still
   have to decide what stamina is FOR — this is a suspension, not a verdict.
   Its twin is BLOCK_COSTS_STAMINA in server/src/index.js, and the worker is
   the side that actually owns stamina, so flip both together or the bar will
   drain on the server while the client thinks it is full. */
/* ═══ v2.3.1731: DELIBERATELY STILL false, and no longer a straight twin ═══
   The server's flag went back to TRUE this version.  These two are not the
   same switch any more, so do NOT "fix" this to match it.
   The SERVER charges per BLOCKED HIT (10 stamina, at the melee site).  THIS
   flag drives something different: a drain-while-HELD on the legacy
   client-authoritative path, which runs only in client-driven zones (town
   and the hubs — where nothing attacks you).  A hold tax punishes the player
   who raises early and reads the fight, which is the exact behaviour the
   v2.3.1730 wind-ups exist to teach, so it stays off on purpose.
   The auto-release-at-zero it also gates is not lost: the server owns the
   guard break now, and its flag is on. */
var BLOCK_COSTS_STAMINA = false;

var NODE_REACH_PAD = 56;   /* px of slack outside the sprite box */

/* v2.3.1913: how long a character may sit with no player input before the
   page hangs up (owner: "Game should be logging out characters after 2
   mins").  Kept equal to the worker's IDLE_TIMEOUT_MS (server/src/index.js)
   and to the AWAY flag's threshold below -- three names for one deadline,
   and they must not drift apart. */
var IDLE_LOGOUT_MS = 120000;

/* The node's art box in WORLD px.  Prefers the renderer's live Pixi
   sprite (exact bounds, anchor and tier scale); falls back to nominal
   art sizes for the procedural campfire and for the frame or two before
   a sprite exists.  Shared by the reach test and the tap hit-test so
   "where the resource is" is defined ONCE. */
function nodeWorldBox(S, n) {
  if (!n) return null;
  var spr = n._pixiSprite;
  var w, h, ax, ay, wx, wy;
  if (spr && !spr.destroyed && spr.width > 2 && spr.height > 2) {
    w = spr.width; h = spr.height;
    ax = spr.anchor ? spr.anchor.x : 0.5;
    ay = spr.anchor ? spr.anchor.y : 0.5;
    wx = typeof spr.x === 'number' ? spr.x : n.x;
    wy = typeof spr.y === 'number' ? spr.y : n.y;
  } else if (n.nodeType === 'campfire') {
    /* procedural fire: glow ellipse 52 wide, flames ~21 up, 9 down */
    w = 56; h = 40; ax = 0.5; ay = 0.75; wx = n.x; wy = n.y;
  } else {
    var _ts = Math.min(10, Math.max(1, Math.ceil((n.gatherLvl || 1) / 10)));
    h = (n.nodeType === 'tree' ? 168 : 132) * (1 + (_ts - 1) * 0.15);
    w = h * 0.8;
    ax = 0.5;
    ay = n.nodeType === 'fishSpot' ? 0.5 : 1.0;
    wx = n.x; wy = n.y;
  }
  return {
    l: wx - w * ax, r: wx + w * (1 - ax),
    t: wy - h * ay, b: wy + h * (1 - ay),
  };
}

/* v2.3.1500 (owner): "make the player unable to walk over ore to mine, just
   the base of trees ... and make ponds unwalkable."

   v2.3.1501: MEASURED FROM THE SPRITE BOX, not from the node anchor.  The
   first cut centred every shape on (n.x, n.y) and got ponds right and ore and
   trees badly wrong, because a pond's art is centred on its anchor while ore
   and tree art is anchored at the BASE and drawn upward.  A flat footprint at
   the anchor therefore matched sideways and blocked nothing at all from the
   north: tools/qa/qa-node-collision.mjs walked the player to within 30px of a
   tier-1 vein whose rock is 132px tall, i.e. straight through it, and 28px into
   a tree through both trunk and canopy.  The owner spotted it immediately and
   guessed the cause exactly ("where the image sits relative to where you're
   measuring from").  Everything below is derived from b.t/b.b/b.l/b.r so the
   anchor convention cannot matter again.

   Ellipses rather than the box: the movement code resolves each axis
   separately, so a box catches on its corners and an ellipse lets you round it.

   ORE blocks its whole drawn body -- the owner does not want it stood on.  That
   puts the old "stand here" marker (one tile north) inside the blocker, so the
   marker moves to the north edge of the art; mining reach is unaffected because
   nodeReachDist measures from the sprite PERIMETER first and only falls back to
   the marker radius.  TREES block a trunk-sized column at the foot only, per
   the owner, so you walk under the canopy -- which now draws in front of you.
   PONDS block the whole pool.  The campfire is deliberately absent: you cook
   standing on it. */
/* Fraction of each texture's CANVAS that the artwork actually occupies,
   measured off the source webp (see tools/qa/qa-node-collision.mjs).  This is
   the second half of the same lesson: even after measuring from the sprite BOX
   rather than the node anchor, the box is mostly empty and each type fills a
   different part of it.  The ore rock floats in the upper middle of its canvas
   and its base sits 35px ABOVE the node anchor at tier 1; the pond is a shallow
   ellipse across the middle; the tree fills a tall wedge whose trunk is a
   narrow column at the bottom.  Sizing collision off the canvas therefore
   over-blocks empty air in one direction and under-blocks the art in another,
   which is what the owner was seeing. */
var NODE_ART = {
  oreVein:  { x0: 0.232, x1: 0.777, y0: 0.223, y1: 0.737 },
  fishSpot: { x0: 0.179, x1: 0.816, y0: 0.348, y1: 0.686 },
  /* tree: the whole silhouette, then the TRUNK alone (bottom 6% of it) --
     the owner wants only the base solid, so the canopy is walk-under. */
  tree:     { x0: 0.250, x1: 0.750, y0: 0.104, y1: 0.840,
              tx0: 0.379, tx1: 0.613, ty0: 0.795, ty1: 0.840 },
};

/* The ellipse the player cannot walk into, in world pixels.  Ellipse rather
   than a box because the movement code resolves each axis separately: a box
   catches on its corners, an ellipse lets you round it -- and all three of
   these shapes (a blobby rock, a round pond, a trunk) are closer to an ellipse
   than to a rectangle anyway. */
function nodeBlockEllipse(S, n) {
  if (!n || !n.alive) return null;
  if (n.respawnAt && Date.now() < n.respawnAt) return null;
  var art = NODE_ART[n.nodeType];
  if (!art) return null;          /* campfire and anything new: walkable */
  var b = nodeWorldBox(S, n);
  if (!b) return null;
  var w = b.r - b.l, h = b.b - b.t;
  var x0 = art.x0, x1 = art.x1, y0 = art.y0, y1 = art.y1;
  if (n.nodeType === 'tree') { x0 = art.tx0; x1 = art.tx1; y0 = art.ty0; y1 = art.ty1; }
  var l = b.l + w * x0, r = b.l + w * x1;
  var t = b.t + h * y0, bt = b.t + h * y1;
  return { x: (l + r) / 2, y: (t + bt) / 2, rx: (r - l) / 2, ry: (bt - t) / 2 };
}

/* Where to stand to mine a vein.  Was n.y - TILE, which v2.3.1501 put inside
   the rock's collision -- it is now the north edge of the art, which is where
   the player physically ends up when they walk into the vein from above. */
function oreStandSpot(S, n) {
  var b = nodeWorldBox(S, n);
  return b ? { x: n.x, y: b.t - 14 } : { x: n.x, y: n.y - TILE };
}

/* `slack` widens every test by that many px — the walk-away cancel uses
   it so a harvest can't self-abort at the range it was started from
   (the v2.3.843 incident: "the button does nothing"). */
function nodeReachDist(S, n, slack) {
  if (!S || !n || !S.player) return null;
  var P = S.player, extra = slack || 0;
  /* 1. Distance to the sprite's perimeter — 0 while standing ON the art. */
  var _b = nodeWorldBox(S, n);
  if (_b) {
    var _bx = Math.max(_b.l - P.x, 0, P.x - _b.r);
    var _by = Math.max(_b.t - P.y, 0, P.y - _b.b);
    var _bd = Math.sqrt(_bx * _bx + _by * _by);
    if (_bd < NODE_REACH_PAD + extra) return _bd;
  }
  /* 2. Legacy anchor-radius floors, so no old reach ever shrinks. */
  if (n.nodeType === 'campfire') {
    var _dc = Math.sqrt(Math.pow(n.x - P.x, 2) + Math.pow(n.y - P.y, 2));
    return _dc < 80 + extra ? _dc : null;
  }
  if (n.nodeType === 'oreVein') {
    var _sp = oreStandSpot(S, n);
    var _ds = Math.sqrt(Math.pow(_sp.x - P.x, 2) + Math.pow(_sp.y - P.y, 2));
    if (_ds < MINE_SPOT_R + extra) return _ds;
  }
  var _baseH = n.nodeType === 'tree' ? 112 : 88;
  var _tierStep = Math.min(10, Math.max(1, Math.ceil((n.gatherLvl || 1) / 10)));
  var _proxR = Math.max(100, _baseH * (1 + (_tierStep - 1) * 0.15) * 0.75);
  var _d = Math.sqrt(Math.pow(n.x - P.x, 2) + Math.pow(n.y - P.y, 2));
  return _d < _proxR + extra ? _d : null;
}

/* nodeAtScreen: which resource (if any) a CSS-pixel tap landed on.
   Uses the node's LIVE Pixi sprite box when the renderer has built
   one — that carries the exact art bounds, anchor and tier scale —
   and falls back to a nominal box for the procedural campfire and
   for the frame or two before a sprite exists.  World->CSS is
   (world - camera) * publishedWorldScale, the same transform the
   monster tap test uses.  Boxes get a small pad so a fingertip just
   off the trunk still counts (iOS 44px tap-target guidance). */
function nodeAtScreen(S, cssX, cssY) {
  if (!S || !S.camera) return null;
  var sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  var PAD = 10;
  var list = [];
  if (S.gatherNodes) for (var i = 0; i < S.gatherNodes.length; i++) list.push(S.gatherNodes[i]);
  if (S._campfire && S._campfire.alive) list.push(S._campfire);
  var best = null, bestD = Infinity;
  for (var j = 0; j < list.length; j++) {
    var n = list[j];
    if (!n || !n.alive) continue;
    if (n.respawnAt && Date.now() < n.respawnAt) continue;
    /* v2.3.1450: same world box the reach test uses, just transformed. */
    var wb = nodeWorldBox(S, n);
    if (!wb) continue;
    var l = (wb.l - S.camera.x) * sx;
    var r = (wb.r - S.camera.x) * sx;
    var t = (wb.t - S.camera.y) * sy;
    var b = (wb.b - S.camera.y) * sy;
    if (cssX < l - PAD || cssX > r + PAD || cssY < t - PAD || cssY > b + PAD) continue;
    /* overlapping boxes (a pond behind a tree): nearest centre wins */
    var d = Math.sqrt(Math.pow(cssX - (l + r) / 2, 2) + Math.pow(cssY - (t + b) / 2, 2));
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

/* v2.3.1669: build a FRESH copy of the active NPC list.  The AI loop
   mutates x/y/hp/chatTimer in place, so handing out the shared module
   literal would let one town visit's state leak into the next. */
function _spawnTownNpcs() {
  /* v2.3.1773: the blacksmith joins the mayor.  This allowlist is the gate —
     NPC_DATA carries the record, but a name missing from here never spawns,
     which is how the table can hold entries that are not live yet. */
  /* v2.3.2046: + Shopkeeper Bro, the first NPC in the game that walks.
     Note 'Storekeeper Bro' beside him is a DIFFERENT, older entry -- the two
     names are one letter apart and getNpcQuest keys on the name, so they must
     not be conflated. */
  /* v2.3.2064: + Lil Bro, the second NPC that walks. Scenery with legs -- no
     quest, no shop -- so nothing but this line and his NPC_DATA record. */
  /* v2.3.2073: 'Shopkeeper Bro' -> 'Diego' (owner's rename). This list is
     keyed by NAME and gates the whole NPC tick — an NPC missing from it stops
     walking, talking and being interactable, so it moves with gameDisplay's
     `name` or the rename silently switches him off. */
  /* v2.3.2091: 'Storekeeper Bro' is gone (owner: "Remove the other shopkeeper
     NPC") — two men did one job and only Diego had any stock. His NPC_DATA
     record went with him, so this is not a dormant entry waiting to be
     re-enabled; see the note at the end of NPC_DATA. */
  var ACTIVE_NPCS = ['Mayor Bro', 'Blacksmith Bro', 'Diego', 'Lil Bro']; /* v2.3.1775 */
  return NPC_DATA.filter(function (n) { return ACTIVE_NPCS.indexOf(n.name) >= 0; })
    .map(function (npc) { return _objectSpread({}, npc); });
}

export var BroTown = function BroTown(_ref0) {
  var _stateRef$current, _stateRef$current2, _minigameInstance$win, _minigameInstance$win2, _rpgState$lifeSkills3, _rpgState$lifeSkills4, _rpgState$lifeSkills5, _rpgState$lifeSkills6, _rpgState$lifeSkills0, _rpgState$weapon, _rpgState$rangedWeapo, _rpgState$armor, _rpgState$lifeSkills1, _ELEMENTS$rpgState$am2, _ELEMENTS$rpgState$sh2, _rpgState$lifeSkills14, _rpgState$lifeSkills18, _stateRef$current7, _rpgState$_compStats, _rpgState$_compStats2, _rpgState$_compStats3, _rpgState$_compStats4, _rpgState$_compStats5, _rpgState$_compStats6, _rpgState$_compStats7, _rpgState$_compStats8, _arenaStatus$currentM, _arenaStatus$currentM2, _arenaTournament$play5, _MKT_CATEGORIES$mktCa, _rpgState$lifeSkills21, _rpgState$lifeSkills29, _rpgState$lifeSkills33, _rpgState$lifeSkills36, _stateRef$current18, _stateRef$current19, _stateRef$current20, _stateRef$current$_sl, _stateRef$current21, _stateRef$current22, _stateRef$current$_fe, _stateRef$current23, _stateRef$current24, _stateRef$current$_sl2, _stateRef$current25, _clanData$members, _clanData$members2, _questPanel$npcRef, _incomingTrade$offer, _RARITY_TIERS$rpgStat, _rpgState$armor2, _rpgState$armor3, _rpgState$armor4, _AMULET_TIERS$rpgStat, _ELEMENTS$rpgState$am4, _ELEMENTS$rpgState$am5, _ELEMENTS$rpgState$am6, _BLACKSMITH_TIERS$rpg, _BLACKSMITH_TIERS$rpg2, _rpgState$lifeSkills37, _rpgState$lifeSkills38, _rpgState$lifeSkills39, _rpgState$lifeSkills40, _rpgState$lifeSkills42, _stateRef$current30, _REPUTATION$stateRef$, _REPUTATION$stateRef$2, _stateRef$current31, _ZONES, _stateRef$current33, _REPUTATION$inspectPl, _REPUTATION$inspectPl2, _inspectPlayer$bro$di, _inspectPlayer$rpgDat, _stateRef$current40, _stateRef$current41, _stateRef$current42, _stateRef$current43, _stateRef$current44, _stateRef$current45, _stateRef$current46, _stateRef$current47, _stateRef$current48, _stateRef$current49, _stateRef$current50, _stateRef$current51, _stateRef$current52, _stateRef$current53, _stateRef$current54, _stateRef$current55, _stateRef$current56, _stateRef$current57, _stateRef$current58, _stateRef$current$_ne, _stateRef$current$_ne2, _stateRef$current$_ne3, _stateRef$current$_ne4, _window$matchMedia, _window;
  var nfts = _ref0.nfts,
    onExit = _ref0.onExit;
  var canvasRef = useRef(null);
  var pixiRef = useRef(null);
  /* v2.3.1448: the resource shell is opened by TAPPING the resource, so
     it has to paint on the next frame, not whenever something else
     happens to re-render.  The game loop mirrors S._nearNode into this
     state on the open/close edge only (the ref is the last value it
     pushed, so the compare costs nothing per frame). */
  var _usePromptNode = useState(null),
    promptNode = _usePromptNode[0],
    setPromptNode = _usePromptNode[1];
  var promptNodeRef = useRef(null);
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
     loaded from public/sprites/tiles/ground-<elem>.webp and converted
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
      /* v2.3.1347: first spawn at the fountain plaza (24,24) — same spot
         death-respawn uses; the old (16,16) dropped new players in a
         nothing-corner of town (owner playtest). */
      /* v2.3.1777: the clifftop town moved the plaza — see TOWN_SPAWN. */
      x: TOWN_SPAWN.x,
      y: TOWN_SPAWN.y,
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
    /* v2.3.1970: null-prototype -- this map is keyed by the sender id off
       a chat payload, and until the same version that id was whatever the
       wire said (the worker now stamps it, but the client has to hold
       against an un-upgraded one).  On a plain {} the key '__proto__' is
       not a no-op here, it is worse: the value is an object, so the
       assignment REPLACES this map's prototype and every later lookup
       reads through a bubble instead of Object.prototype.  Rule 4 /
       TRAPS #6 -- three incidents in one day (duel.away v2.3.1175, party
       meta v2.3.1185, amulet tiers v2.3.1192). */
    chatBubbles: Object.create(null),
    /* {playerId: {text, ts}} */
    /* v2.3.1116: persistent identity -- stable id derived from a stored
       passphrase (silently generated on first boot) instead of a fresh
       random per pageload.  The worker keys rpg storage by this id, so
       progress finally survives reloads.  ?guest=1 escapes to the old
       throwaway-random id (needed to test multiplayer with two tabs in
       ONE browser: two tabs share localStorage, so they'd share an id
       and evict each other by design).  Falls back to random when
       localStorage is unavailable (some private-mode configurations). */
    myId: (function () {
      try {
        if (/[?&]guest=1\b/.test(window.location.search)) return Math.random().toString(36).slice(2, 10);
        var _pf = localStorage.getItem('bt_passphrase');
        /* ═══ v2.3.2110: BEFORE MINTING A KEY, ASK IF THIS IS REALLY A NEW DEVICE ═══
           Owner: "the continue button ... right now it shows empty each time an
           update is pushed."  It is not a new device — it is a new ORIGIN.  Each
           Cloudflare Pages deployment gets its own hostname, localStorage is
           per-origin, and minting here is what turned "your character is in the
           other drawer" into "you have no character".  adoptSharedPhrase reads
           the roster mirror that DOES cross origins (rosterCookie.js) and hands
           back the most recent character, so the player walks straight in.  It
           returns null on every road that is genuinely new or genuinely a
           delete — see its guards — and then we mint as before.  This has to
           happen HERE, before myId is derived: adopting later would need a
           reload to rebuild the ids already baked into module state. */
        if (!_pf) _pf = adoptSharedPhrase();
        if (!_pf) {
          _pf = generatePassphrase();
          localStorage.setItem('bt_passphrase', _pf);
        }
        return passphraseToId(_pf);
      } catch (e) {
        return Math.random().toString(36).slice(2, 10);
      }
    })(),
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
    /* ═══ v2.3.2213: SHOW ME A CRIT WITHOUT PLAYING FOR ONE ═══
       Owner: "You should be able to generate a simulated normal damage
       number vs crit damage number without me needing to start a new char
       and run it every time."

       Right, and the lack of this is why four capture attempts burned ten
       minutes each: to look at a crit you had to accept a quest, equip a
       sword, cross two zones, stay alive, and then wait out a rare roll --
       so a two-second visual question cost a full playthrough, and the
       answer arrived only if the dice agreed.

       This spawns the two popups side by side through the game's OWN
       pushDmgPopup with the game's own flags, so what appears is what a real
       hit paints -- same colour rule, same font sizing, same icon, same
       renderer.  Nothing about the look is mocked; only the dice are
       skipped.  `dmg` defaults are a plausible pair for a starting weapon,
       and a caller can pass the real numbers to compare a specific weapon.

       Autotest surface, same posture as the trait setters below: it mutates
       the world, so it is a hook, not a fixture. */
    previewCritVsNormal: function previewCritVsNormal(normalDmg, critDmg) {
      var S2 = stateRef.current;
      if (!S2 || !S2.player) return null;
      var n = normalDmg || 12, c = critDmg || 41;
      /* BELOW the player, not above: above is where the welcome banner and
         the quest reminder live, and the first run of this put both numbers
         behind the banner where neither could be read. */
      var x = S2.player.x, y = S2.player.y + 44;
      pushDmgPopup(S2, x - 60, y, String(n), '#fff', { iconKey: 'sword', ttl: 6 });
      pushDmgPopup(S2, x + 60, y, String(c), DMG_CRIT_COLOR,
        { iconKey: 'crit', crit: true, ttl: 6 });
      return { normal: n, crit: c };
    },
    /* v2.3.1826: trait setters on the autotest surface.  The owner's
       constraint on the body-size fix was "without breaking anything else
       (relative item scale like hats, beards, etc)", and the only honest way
       to check that is to put a hat on the character and measure it — a
       bare-headed run makes the assertion pass by measuring nothing.  Same
       posture as createMonster above: a hook that mutates the world, so a
       test can set up the case it is actually about. */
    /* v2.3.2123: the weapon unequip flow, on the same surface and for the
       same reason.  It is the path the Equipped pane's button takes, it now
       REFUSES at a full bag (equipActions.js), and "the client refuses what
       the worker refuses" is a claim only reachable by calling the real
       function — a scenario that reimplemented the rule would be asserting
       against its own copy of it. */
    unequipWeaponSlot: unequipWeaponSlot,
    setHeadwear: setHeadwear,
    setFacialHair: setFacialHair,
    HEADWEAR_CATALOG: HEADWEAR_CATALOG,
    FACIALHAIR_CATALOG: FACIALHAIR_CATALOG,
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
    /* v2.3.2229: the variant table and the body-centre offset, so a
       scenario can check that the drawn figure and the hitbox derived from
       it still agree.  They are separate hand-tuned constants in four
       files and the failure mode of scaling one alone is invisible in a
       screenshot -- arrows pass through a body they visibly hit. */
    MONSTER_VARIANTS: MONSTER_VARIANTS,
    monsterBodyOffsetY: DATA.monsterBodyOffsetY,
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
    canAccessDepth: canAccessDepth,
    /* v2.3.1682: drive the MANUAL tap-attack from the QA harness so the
       unarmed-start rule can be tested on the path a finger actually takes.
       This is the same call the doSwing useCallback makes below -- written
       as a thunk because doSwing is not assigned yet at this point in the
       component body (this object literal runs first). */
    swingAttack: function () { swingAttack(stateRef.current); },
    /* v2.3.1703: the hub trail-heads, so the spawn/latch scenario reads the
       game's own coordinates instead of hardcoding a marker that gets
       retuned (mp-townlock already had to say "keep them in step"). */
    TOWN_EXITS: TOWN_EXITS,
    WORLDVIEW_EXITS: WORLDVIEW_EXITS,
    /* v2.3.1703: the WORN LAYER, straight from the store the renderer reads.
       The greaves-don't-show bug was invisible to every assertion that read
       S.rpg, because the stat piece was set correctly the whole time and the
       thing that was wrong lived here. */
    getEquip: getEquip,
    /* v2.3.1720: getEquip's twin.  The bridge exposes the reader because a
       gear-LAYER bug was invisible from S.rpg (v2.3.1703); the same blind
       spot makes a headless check unable to SET a layer, so verifying that a
       new pose's armour sheets actually draw meant reaching through the whole
       server-authoritative grant -> stash -> Equip-button chain just to put a
       plate on a figure.  Reader and writer both, for the same reason. */
    setEquip: setEquip,
    /* v2.3.1705: the shared block half-angle, so the headless check can assert
       that the cone on screen and the arc the worker tests are ONE number
       rather than two that happen to match today. */
    BLOCK_ARC_HALF: BLOCK_ARC_HALF,
    /* v2.3.1706: which quest the walk-up dialogue would show, and in what
       state.  The proximity dialogue is the ONLY route to a turn-in since
       v2.3.1704, so "what does the giver think you are here for" is worth
       being able to ask directly rather than inferring from rendered text. */
    getNpcQuest: getNpcQuest,
    /* v2.3.1702: the same hook for the two other pool-spending actions.
       Their `ability_use` send was gated on _serverMonsters (false in town),
       so the worker never saw a special or a dodge used in the hub and its
       next player_state refunded the spend.  Driven from the harness here so
       the fix is checked on the wire, on the path the finger takes. */
    specialAttack: function () { specialAttack(stateRef.current); },
    contextualDodge: function (ang) { triggerContextualDodge(stateRef.current, stateRef.current.rpg, ang || 0); },
    /* v2.3.1733: the two stamina abilities, on the same bridge and for the
       same reason as specialAttack above — a new client->server type is only
       real if the WORKER hears it (TRAPS #18), and the only way to check
       that is to press the button from the harness and then ask the worker.
       abilityStatus rides along so a scenario can read what the BUTTON would
       show (locked / on cooldown / unaffordable) instead of re-deriving it. */
    castAbility: function (kind) { return castAbility(stateRef.current, kind); },
    /* v2.3.1735: the cast's DIRECTION rule, on the autotest surface for the
       same reason BLOCK_ARC_HALF is (mp-block) — the bug the owner reported
       ("the effect is east") was a pure angle-resolution fault, and a real
       cast needs character level 4, which QA cannot reach.  Exposing the
       rule lets mp-ability pin it at the level a fresh character has. */
    resolveCastAngle: function () { return resolveCastAngle(stateRef.current); },
    BASH_POSE_MS: BASH_POSE_MS,
    abilityStatus: function (kind) { return abilityStatus(stateRef.current, kind); },
    /* v2.3.1734: Element Burst, on the same bridge for the same reason. */
    elementBurst: function () { elementBurst(stateRef.current); }
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
  /* v2.3.1718: a tab left open across a deploy keeps running the old bundle
     (owner: a judge "didn't share the same world").  buildWatch polls the
     static host for the sha this build was stamped with; null until they
     disagree, so nothing renders on a current tab. */
  var _useStaleBuild = useState(null),
    _useStaleBuild2 = _slicedToArray(_useStaleBuild, 2),
    staleBuild = _useStaleBuild2[0],
    setStaleBuild = _useStaleBuild2[1];
  useEffect(function () {
    return startBuildWatch(function (info) {
      /* ═══ v2.3.2237: ON A PRE-GAME SCREEN, JUST TAKE THE NEW BUILD ═══
         Owner: "is there a way to make sure that if you play through the
         mobile web app that it only pulls the latest version?"

         The banner below is the right answer MID-GAME -- interrupting a
         fight with a forced reload would be a worse bug than the staleness
         it reports.  But on the login / checking screen, or with the intro
         overlay still up, a reload costs the player nothing at all: there
         is no fight to lose and no state to keep (it all lives on the
         worker).  So there it is taken rather than offered, which closes
         the case that actually bites -- an installed web app is RESUMED
         rather than reloaded, so it lands on the pre-game screen still
         running whatever bundle it had when it was last opened.

         Read off window.__btPhase, which this component already stamps on
         every render for exactly this class of question, rather than
         threading a ref through an effect that deliberately has no deps. */
      var _ph = null;
      try { _ph = window.__btPhase || null; } catch (e) { /* ignore */ }
      var _preGame = !!(_ph && (_ph.bootPhase === 'checking' || _ph.bootPhase === 'login' || _ph.showIntro));
      if (_preGame) {
        try { window.location.reload(); return; } catch (e) { /* fall through to the banner */ }
      }
      setStaleBuild(info);
    });
  }, []);
  /* v2.3.1715: the desktop keyboard-hints strip can be dismissed (owner:
     "do a toggle on and off option for it too").  Read from storage in the
     INITIALISER for the same reason the quest fold below is — an effect
     would flash the strip for one frame on every load before hiding it. */
  var _useKbHints = useState(function () {
    try { return localStorage.getItem('bt_kb_hints_off') === '1'; } catch (e) { return false; }
  }),
    _useKbHints2 = _slicedToArray(_useKbHints, 2),
    kbHintsOff = _useKbHints2[0],
    setKbHintsOff = _useKbHints2[1];
  var toggleKbHints = React.useCallback(function () {
    setKbHintsOff(function (v) {
      var next = !v;
      try { localStorage.setItem('bt_kb_hints_off', next ? '1' : '0'); } catch (e2) { /* private mode */ }
      return next;
    });
  }, []);
  /* v2.3.1714: the top-left quest reminder collapses to its title on tap.
     Owner: "some users might prefer that view to save screen space."
     Read from storage in the INITIALISER, not in an effect — an effect would
     paint the expanded card for one frame on every load and then snap it
     shut, which looks like a glitch rather than a remembered preference. */
  var _useQuestHudFold = useState(function () {
    try { return localStorage.getItem('bt_quest_hud_collapsed') === '1'; } catch (e) { return false; }
  }),
    _useQuestHudFold2 = _slicedToArray(_useQuestHudFold, 2),
    questHudFolded = _useQuestHudFold2[0],
    setQuestHudFolded = _useQuestHudFold2[1];
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
    return wireGearWornSync(setGearWorn);
  }, []);
  var _useState15 = useState([]),
    _useState16 = _slicedToArray(_useState15, 2),
    chatLog = _useState16[0],
    setChatLog = _useState16[1];
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
  /* v2.3.1239: owner feedback — onboarding is now OPT-IN.  Instead of the
     step banners auto-appearing on first join, a brand-new player (no
     bt_tutorial flag yet) sees ONE small dismissible prompt.  The
     teach-by-doing step machine AND its banners only run once the player
     taps "Start tour" (tourStarted).  "No thanks"/✕ writes the same
     bt_tutorial='10' completion flag the finished tutorial sets, so it
     never nags again.  Veterans (flag already set — including anyone
     mid-tutorial under the old auto model) get neither the prompt nor the
     banners, exactly as before. */
  /* v2.3.1593 (owner: "remove the tutorial and the mayor bro pop up and
     greeting").  Hard-false instead of the localStorage probe, which is the
     whole removal: no prompt means nobody can tap "Start tour", tourStarted
     stays false, and the teach-by-doing step machine and its banners never
     run — they were already gated on it by v2.3.1239.  So one constant
     retires the entire onboarding flow without touching the step machine.
     The manual controls tutorial in Settings is deliberately untouched: it
     only opens on an explicit tap, so it is not a pop-up. */
  var _tourPromptInit = false;
  var _useStateTourP = useState(_tourPromptInit),
    _useStateTourP2 = _slicedToArray(_useStateTourP, 2),
    showTourPrompt = _useStateTourP2[0],
    setShowTourPrompt = _useStateTourP2[1];
  var _useStateTourS = useState(false),
    _useStateTourS2 = _slicedToArray(_useStateTourS, 2),
    tourStarted = _useStateTourS2[0],
    setTourStarted = _useStateTourS2[1];
  /* Mirror onto stateRef so the game loop's step machine can gate on it. */
  stateRef.current._tourStarted = tourStarted;
  /* v2.3.1235: Checkpoint B §7 — the onboarding banner must also yield to
     the controls-tutorial coach (it was showing through the spotlight at
     both test widths). Live subscription so the banner resumes on close. */
  var ctOpen = React.useSyncExternalStore(controlsTutorialBus.subscribe, controlsTutorialBus.isOpen);
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
  /* v2.3.1132: two-sided trade session snapshot (server truth from
     trade2_state) or the incoming-invite stub ({invite:true, ...}). */
  var _useStateTrade2 = useState(null),
    trade2 = _useStateTrade2[0],
    setTrade2 = _useStateTrade2[1];
  /* v2.3.1185: party roster snapshot (server truth from party_state)
     or the incoming-invite stub ({invite:true, ...}) — see PartyHUD. */
  var _useStateParty = useState(null),
    party = _useStateParty[0],
    setParty = _useStateParty[1];
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
  /* v2.3.1981: the mute list is a SERVER fact now (server/src/chatmod.js).
     It arrives as chat_mute_list on join and after every mutation, and
     chatMute.js republishes it through the localStorage mirror this state
     was seeded from — so without this subscription the Social panel and
     the inspect card would keep showing whatever THIS browser last
     remembered while the worker enforced something else.  A mute made on
     a phone has to be visibly in force on the laptop; that is the whole
     point of moving it off the device. */
  useEffect(function () {
    return subscribeMutes(function (list) { setMutedList(list); });
  }, []);
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
  /* ═══ v2.3.1745: THE QUEST BANNER ═══
     Owner: "it would be cool if there was a 'QUEST ACCEPTED!' and 'QUEST
     COMPLETED!' when you start or turn in quests that appear over the quest
     modal menu the moment you accept or turn in the quest."
     Its OWN slot rather than a new kind on levelUpMsg, and the reason is
     functional, not tidiness: a turn-in pays XP, and XP can level you up in
     the same instant.  Sharing one useState would make the two celebrations
     race and the loser would simply never be drawn — most likely the level
     up, which is the bigger news.  Two slots, two vertical positions, both
     land. */
  var _useStateQb = useState(null),
    _useStateQb2 = _slicedToArray(_useStateQb, 2),
    questMsg = _useStateQb2[0],
    setQuestMsg = _useStateQb2[1];
  /* quests.js is a plain module, not a component — same window bridge the
     level-up banner uses (see above). */
  /* v2.3.1746: a one-deep queue, and the rule for who waits.
     A turn-in fires COMPLETED, and the worker's quest_reward_stashed notice
     lands a few hundred ms later — with a bare setter the notice would wipe
     the celebration almost immediately.  But queuing EVERYTHING is wrong the
     other way: turning in re-opens the dialogue on the next quest, so a
     player who taps Accept straight away would watch their banner arrive two
     seconds after the tap, which is the opposite of what was asked for.
     So: banners the PLAYER caused preempt; system notices (`queue: true`)
     wait their turn. */
  var questMsgRef = useRef(null);
  questMsgRef.current = questMsg;
  var questQueueRef = useRef([]);
  if (typeof window !== 'undefined') {
    window._setQuestMsg = function (m) {
      if (!m) { setQuestMsg(null); return; }
      var cur = questMsgRef.current;
      if (m.queue && cur && Date.now() - cur.ts < questMsgMs(cur.kind)) {
        questQueueRef.current.push(m);
        if (questQueueRef.current.length > 3) questQueueRef.current.shift();
        return;
      }
      setQuestMsg(m);
    };
    /* published so the headless check reads the REAL hold time instead of
       keeping its own copy to drift out of sync */
    window.__QUEST_MSG_MS = QUEST_MSG_MS;
    /* v2.3.1816: the per-kind hold too, so mp-questbanner asserts the real
       numbers rather than a copy of them that drifts. */
    window.__QUEST_MSG_LONG_MS = QUEST_MSG_LONG_MS;
    window.__questMsgMs = questMsgMs;
  }
  var _useState185 = useState(1),
    _useState186 = _slicedToArray(_useState185, 2),
    playerCount = _useState186[0],
    setPlayerCount = _useState186[1];
  var _useState187 = useState(false),
    _useState188 = _slicedToArray(_useState187, 2),
    joinFlash = _useState188[0],
    setJoinFlash = _useState188[1];
  /* ═══ v2.3.1980: PUBLISH THE ONLINE COUNT ONTO THE GAME STATE ═══
     `playerCount` is the authoritative room population -- the worker
     broadcasts it on every join and leave (`player_count`, getPlayerCount()
     over all sessions, so it is WORLD-wide and not the zone you happen to be
     standing in) and the client's own join/leave/ghost-sweep paths keep it
     honest in between.  All of that lands in this one React state, which the
     chat window cannot reach: ChatBubble is mounted by GameApp, outside this
     component.  Mirroring it onto stateRef is how every other cross-boundary
     read in this file is done, and it means the feed shows the SERVER's
     number rather than recounting S.others and disagreeing with it. */
  useEffect(function () {
    if (stateRef.current) stateRef.current._playerCount = playerCount;
  }, [playerCount]);
  /* ═══ v2.3.1814: WHICH PRE-GAME SCREEN, IF ANY ═══
     Owner: "character selections in terms of names and traits picked during
     login should be permanent.  When you load a character using the key it
     should just bring you into the game not the login menu anymore.  Which
     means a new login screen needs to be made."

     This used to be `useState(true)` under the comment "always show (fresh
     session each time)", which is the whole behaviour the owner is ending:
     the creator was the front door because a character was something you
     re-made every session.  Now there are three outcomes and the boot check
     picks between them:
       'checking' — asking the worker whether THIS device's key already has
                    a character (read-only; see _bootCharCheck below).
       'login'    — it does not, so: log in with a key, or create one.
       'create'   — the creator, now reached deliberately rather than by
                    default.
       null       — it does, so there is no pre-game screen at all and we
                    walk straight into town.
     Starting at 'checking' rather than 'login' matters: flashing the login
     screen for a moment before skipping it would undo the point of skipping
     it. */
  var _useState189 = useState('checking'),
    _useState190 = _slicedToArray(_useState189, 2),
    bootPhase = _useState190[0],
    setBootPhase = _useState190[1];
  /* v2.3.1861 held the name of the character this device's key already had,
     so the door could warn before overwriting it.  v2.3.1923 retired both the
     overwrite and the warning — a device keeps up to ten characters now — so
     the state is gone and the boot check's lookup feeds the ROSTER instead,
     which is a place the answer is still worth something. */
  var showWelcome = bootPhase === 'create';
  var setShowWelcome = function setShowWelcome(v) { setBootPhase(v ? 'create' : null); };
  /* v2.3.2219 (owner: "Create a character need a back button to main menu").
     NOT setShowWelcome(false) -- that means "done, walk into town" and maps
     to null.  Leaving the creator without a character is a THIRD outcome and
     has to name its phase.

     The ?create=1 param is stripped on the way out: the login screen sets it
     after minting a fresh key so the boot check cannot bounce a new key
     straight back to the door (v2.3.1861).  Left in place, a reload from the
     main menu would land in the creator again -- the screen the player just
     backed out of. */
  var backToMenu = function backToMenu() {
    try {
      if (/[?&]create=1\b/.test(window.location.search)) {
        var _u = new URL(window.location.href);
        _u.searchParams.delete('create');
        window.history.replaceState(null, '', _u.pathname + _u.search + _u.hash);
      }
    } catch (e) { /* no URL/history (old webview): the phase change still stands */ }
    setBootPhase('login');
  };
  /* Bro Town intro video — overlays the game for ~4 s after character
     creation (fades out at 3 s).  Town music starts during the video. */
  var _useState229 = useState(false),
    _useState230 = _slicedToArray(_useState229, 2),
    showIntro = _useState230[0],
    setShowIntro = _useState230[1];
  /* v2.3.1219: Mayor Bro welcome greeting — queued after the loading intro
     fades, gated to once per browser (MayorGreeting.jsx owns the localStorage
     flag).  Only ever set from the IntroVideo onComplete below, so it never
     fires on an auto-rejoin/resume (which shows no intro). */
  var _useState231 = useState(false),
    showMayorGreeting = _useState231[0],
    setShowMayorGreeting = _useState231[1];
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
  /* v2.3.1928: eye colour, same shape as every other creator selection. */
  var _eyeColorSelState = useState(getEyeColor()),
    eyeColorSel = _eyeColorSelState[0],
    setEyeColorSel = _eyeColorSelState[1];
  /* v2.3.1953: height + frame, mirrored into React the same way every other
     pick is — the store is the truth, this is what re-renders the tiles and
     re-runs the preview draw. */
  var _heightSelState = useState(getBuildHeight()),
    heightSel = _heightSelState[0],
    setHeightSel = _heightSelState[1];
  /* v2.3.1996: frame is locked to medium, so getBuildFrame() only ever answers
     'medium' and this state never changes.  Kept rather than deleted because
     the preview and the portrait still take a buildFrame, and because putting
     a second frame back is then FRAME_CATALOG plus a picker -- not a re-thread
     of every call site.  setFrameSel is passed down for the same reason. */
  var _frameSelState = useState(getBuildFrame()),
    frameSel = _frameSelState[0],
    setFrameSel = _frameSelState[1];
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
     creator always shows exactly one category.  v2.3.1251: always a TYPE
     key; NameModal derives the five-group tab state (Hair/Face/Top/
     Bottom/Feet) from it.  'hair' is the landing type (the mockup's
     Hair group opens on its Hair subtype). */
  var _catState = useState('hair'),
    activeCat = _catState[0],
    setActiveCat = _catState[1];
  /* v2.3.1251: the v2.3.834/835 collapse-on-select state (objPicked/
     objOpen/colOpen + markObjPicked) is retired — the approved mockup
     always shows the full option strip with the colors directly below,
     so nothing collapses and colors need no reveal gate. */
  /* Live character preview on the login screen -- redraws whenever any
     cosmetic selection (or the preview angle) changes. */
  var previewCanvasRef = useRef(null);
  /* v2.3.1951: the tap-zoom moved up here from NameModal.  It was local while
     it only resized a box inside that component; it now also tells the preview
     camera to pull back to the whole figure, and that wiring lives in this
     file beside activeCat, which was lifted for the same reason. */
  /* ═══ v2.3.1994: THE CREATOR OPENS ON THE WHOLE CHARACTER ═══
     Owner: "When first getting to the character design screen have the
     character zoomed out normally instead of zooming in by default for his
     hair."

     `previewZoom` true means the WHOLE FIGURE (focusForCat returns FOCUS_FULL,
     and NameModal gives the stage its taller frame) -- the name is a leftover
     from when tapping the character was the only thing that moved the camera.
     It started false, so the very first thing a new player saw was a close-up
     of the top of a head, because `activeCat` starts on 'hair' and v2.3.1951
     wired the camera to follow the open category.  That is the right behaviour
     for a category you CHOSE and the wrong one for the category that merely
     happens to be first.
     So the camera starts pulled back and the category framing engages the
     moment you pick a tab (setActiveCat below) -- the feature is kept, it just
     stops firing before anyone has asked it to. */
  var _zmState = useState(true),
    previewZoom = _zmState[0],
    setPreviewZoom = _zmState[1];
  /* Picking a trait category IS the "aim the camera here" gesture, so it ends
     the opening wide shot.  One place, so the two states can never disagree
     about whether the camera has been aimed yet. */
  var pickPreviewCat = function (c) { setActiveCat(c); setPreviewZoom(false); };
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
    return wireCharacterPortrait(previewCanvasRef, {
      previewDir: previewDir,
      skinSel: skinSel, pantsSel: pantsSel, shoesSel: shoesSel,
      hairSel: hairSel, hairColorSel: hairColorSel,
      facialHairSel: facialHairSel, beardColorSel: beardColorSel,
      headwearSel: headwearSel, hatColorSel: hatColorSel, eyeColor: eyeColorSel,
      shirtSel: shirtSel, shirtColorSel: shirtColorSel,
      buildHeight: heightSel, buildFrame: frameSel,   /* v2.3.1953 */
      /* v2.3.1951: which tab is open drives where the preview camera looks,
         and the tap-zoom overrides it with the whole figure. */
      activeCat: activeCat, zoomedOut: previewZoom,
    });
    /* ═══ v2.3.1818: showNameModal IS A DEPENDENCY ═══
       Owner: "loading character assets seems slow (no char in image)."

       Not slow — never drawn, and this was my own regression from
       v2.3.1814.  wireCharacterPortrait opens with
       `if (!previewCanvasRef.current) return;`, which was harmless while the
       creator WAS the landing screen: the canvas existed on mount, so the
       first run of this effect always found it.  Putting a login screen in
       front of the creator made it mount LATER, so this effect ran against a
       null ref, returned, and — with only the trait selections in its
       dependency list — never ran again.  The stage sat empty until the
       player happened to change a trait.

       Diagnosed rather than guessed: the preview canvas was still 300x150
       (the HTML default, so nothing had ever sized it) and carried no
       `__pseq`, the counter drawCharacterPortrait stamps on its FIRST call.
       No throw, no error — the draw simply never happened, which is why it
       reads as a slow load.

       Listing the mount flag is the whole fix: the effect re-runs when the
       creator appears, the ref is attached by then, and the portrait draws. */
  }, [showNameModal, previewDir, skinSel, pantsSel, shoesSel, hairSel, hairColorSel, facialHairSel, beardColorSel, headwearSel, hatColorSel, shirtSel, shirtColorSel, eyeColorSel, heightSel, frameSel, activeCat, previewZoom]);
  /* v2.3.715: the welcome modal is dead network time -- start pulling the
     heavy in-game sheets (network/decode only; the CPU bakes still run
     behind the intro overlay via preloadPlayerAssets in joinTown) and warm
     the intro clip so it starts instantly on PLAY.  The video element is
     held in a ref so the prefetch isn't garbage-collected mid-download. */
  var _introWarmRef = useRef(null);
  useEffect(function () {
    return wireSplashPrewarm(showNameModal, _introWarmRef);
  }, [showNameModal]);
  /* v2.3.722: torch crackle, extracted from the owner's flame clip.
     Browsers refuse un-muted autoplay, so it arms on the modal's first
     pointerdown (any tap counts), loops quietly, and stops when the
     modal closes (PLAY). */
  useEffect(function () {
    return wireTorchCrackle(showNameModal);
  }, [showNameModal]);
  /* v2.3.830: splash theme music (owner's chiptune adventure track).  Same
     autoplay-policy dance as the torch crackle — browsers block un-muted
     autoplay, so it arms on the modal's first pointerdown and loops.
     v2.3.831: it now KEEPS PLAYING through the loading screen (held in
     themeAudioRef, not stopped on the modal's cleanup); IntroVideo
     crossfades it into the town ambience at the transition.  start() is a
     no-op if the theme is already armed so re-renders don't double it. */
  useEffect(function () {
    return wireThemeMusic(showNameModal, themeAudioRef);
  }, [showNameModal]);
  /* The long-hair sprite is ~88% pure black, so a light hair color over-
     processes into a black band around the face (see characterPortrait recolor
     note).  Restrict that one style to dark colors only; clamp the selection
     back to default if a style switch or a returning player leaves it light. */
  var LONG_HAIR_COLORS = ['black'];
  useEffect(function () {
    clampLongHairColor(hairSel, hairColorSel, setHairColorSel);
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
    /* v2.3.1307 (ChatGPT round-7): the bright lavender border on EVERY
       tile made everything look selected — unselected tiles drop to a
       thin muted slate line; only the pick carries the 2px brass ring
       (+ the painted check badge below). */
    /* v2.3.1527: a consistent inset on every tile (owner).  The art inside is
       object-fit: contain, so a wide hat used to run edge to edge while a
       narrow one floated in the middle — the tiles read as different sizes.
       Padding is a share of the tile, not a fixed 2px, so the inset stays
       proportional as --cc-tile changes with the viewport. */
    return { width: size, height: size, flex: '0 0 auto', padding: '9%', cursor: 'pointer', boxSizing: 'border-box',
      position: 'relative', borderRadius: 8,
      background: 'linear-gradient(180deg,#f4f5f8,#cdd2dc)',
      border: sel ? '2px solid #D8AA58' : '1px solid rgba(238,242,235,.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' };
  };
  /* v2.3.711: explicit checkmark badge on the picked tile.
     v2.3.1307: the owner's painted gold-coin check replaces the flat
     purple disc (round-7 icon set). */
  var _checkBadge = function () {
    return /*#__PURE__*/React.createElement("img", { key: 'ck', src: '/ui/welcome/cc/cc-selected.webp?v=' + BUILD_INFO.version, alt: '',
      style: { position: 'absolute', right: -4, bottom: -4, width: 17, height: 17, pointerEvents: 'none' } });
  };
  /* ═══ v2.3.1932: THE OPTION TILES SHOW THE THREE-QUARTER VIEW ═══
   *
   * Owner: "For the trait picker option previews (options within each trait
   * category) can you actually show the southwest orientation instead of the
   * current south face?"
   *
   * `thumb.png` is the SOUTH view — dead-on and symmetric, so a swept fringe
   * reads as a blob and an angled helmet reads as a plain dome.  `thumb-sw.png`
   * is the same tight crop taken from the southwest art
   * (tools/ui/make-southwest-thumbs.mjs), which is the angle the character
   * sheet already draws for the same reason: three-quarter shows the front AND
   * the side.  The picker now agrees with the figure it is dressing.
   *
   * onError falls back to thumb.png rather than leaving a broken tile.  All 49
   * traits have southwest art today and the generator asserts it (--check), but
   * a trait added without it should look old, not broken. */
  var _thumbSrc = function (cat, id) { return '/sprites/traits/' + cat + '/' + id + '/thumb-sw.png?v=' + BUILD_INFO.version; };
  var _thumbFallback = function (e, cat, id) {
    var el = e && e.currentTarget;
    if (!el || el.dataset.fellBack) return;
    el.dataset.fellBack = '1';
    el.src = '/sprites/traits/' + cat + '/' + id + '/thumb.png?v=' + BUILD_INFO.version;
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
    /* v2.3.1932: southwest here too.  This tile is the SAME item as the strip
       above it ("this is what you get"), so leaving it facing south would put
       two different angles of one hat side by side. */
    var inner = opt.id === 'default' && thumbCat && thumbItem && thumbItem !== 'none'
      ? /*#__PURE__*/React.createElement("img", { src: _thumbSrc(thumbCat, thumbItem), alt: 'Original',
          onError: function (e) { _thumbFallback(e, thumbCat, thumbItem); },
          style: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' } })
      : /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: '100%', borderRadius: 5, background: opt.swatch, border: '1px solid rgba(0,0,0,0.35)', boxSizing: 'border-box' } });
    return /*#__PURE__*/React.createElement("button", {
      key: 'c_' + opt.id, type: 'button', title: opt.id === 'default' ? 'Original color' : opt.name,
      onClick: function () { onSet(opt.id); }, style: _apTileStyle(sel, size || 32)
    }, inner, sel ? _checkBadge() : null);
  };
  /* ═══ v2.3.1953: THE BUILD TILE ═══
     Height and frame have no sprite to show and no colour to swatch — they are
     two numbers — so the tile draws what they DO: a stick silhouette scaled by
     that option's own multiplier, with a ghost of the average build behind it
     so the difference is visible in the tile rather than only on the stage.
     Inline SVG rather than art: it is five shapes, it scales to any density,
     and the animation-preload law's whole reason (an asset that loads late
     hitches) does not apply to one that is never fetched.  Same precedent as
     the designer's pencil (v2.3.1946). */
  var _buildTile = function (opt, selId, onSet, axis, size) {
    var sel = selId === opt.id;
    /* ═══ THE ICON EXAGGERATES.  DELIBERATELY. ═══
       A 12% difference is plain on a 300px character and invisible on a 30px
       glyph, so the tile draws the option at 2.2x its real deviation from
       average.  This is an ICON, not a preview — the preview is the bro on the
       stage, who moves the moment you tap, and who moves by the REAL amount.
       Understating the choice in the picker would make three of these tiles
       look identical, which is worse than overstating it. */
    var _ex = 1 + (opt.mul - 1) * 2.2;
    var sx = axis === 'frame' ? _ex : 1;
    var sy = axis === 'frame' ? 1 : _ex;
    var _figure = function () {
      return /*#__PURE__*/React.createElement("g", {
        /* Anchored on the FEET, like everything else in this feature: a figure
           that grew about its middle would float above the tile's baseline and
           the three of them would no longer line up. */
        transform: 'translate(20,36) scale(' + sx + ',' + sy + ') translate(-20,-36)',
        fill: '#3a4450'
      },
      /*#__PURE__*/React.createElement("circle", { cx: 20, cy: 9.5, r: 5 }),
      /*#__PURE__*/React.createElement("rect", { x: 13, y: 15.5, width: 14, height: 11.5, rx: 3 }),
      /*#__PURE__*/React.createElement("rect", { x: 14.8, y: 27, width: 4.2, height: 9, rx: 1.4 }),
      /*#__PURE__*/React.createElement("rect", { x: 21, y: 27, width: 4.2, height: 9, rx: 1.4 }));
    };
    return /*#__PURE__*/React.createElement("button", {
      key: 'b_' + opt.id, type: 'button', title: opt.name,
      onClick: function () { onSet(opt.id); }, style: _apTileStyle(sel, size || 52)
    },
    /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' } },
      /*#__PURE__*/React.createElement("span", {
        /* Caption ABOVE the silhouette: the selected tile's check badge sits
           in the bottom-right corner, and a caption under the figure ran into
           it — "Average" came back as "Averag(check)".  Above it, the badge has
           the corner to itself and the label is never clipped. */
        style: { fontSize: 8, fontWeight: 800, letterSpacing: '.02em', color: '#3a4450', lineHeight: 1, flex: '0 0 auto' }
      }, opt.name),
      /*#__PURE__*/React.createElement("svg", {
        /* Headroom above and to the sides so the exaggerated `tall` and
           `large` figures are drawn whole rather than cropped at the box. */
        viewBox: '-4 -8 48 46', "aria-hidden": true, focusable: 'false',
        preserveAspectRatio: 'xMidYMax meet',
        /* overflow visible so a `tall` figure is not clipped by its own box —
           the ghost behind it is the reference, and a silhouette cropped at
           the crown would understate exactly the thing being picked. */
        style: { overflow: 'visible', display: 'block', flex: '1 1 auto', width: '100%', minHeight: 0 }
      },
      /* No ghost-of-average behind it: the first cut drew one and on `Short`
         its head floated above the real figure's, reading as a second head.
         Three tiles in a row ARE the comparison. */
      _figure())),
    sel ? _checkBadge() : null);
  };
  var _thumbTile = function (cat, opt, selId, onSet, size) {
    var sz = size || 50;
    var sel = selId === opt.id;
    return /*#__PURE__*/React.createElement("button", {
      key: 's_' + opt.id, type: 'button', title: opt.name,
      onClick: function () { onSet(opt.id); }, style: _apTileStyle(sel, sz)
    }, opt.id === 'none'
      /* v2.3.1307 (round-7): the dashed circle read as a missing asset /
         loading placeholder — the painted bald-head "none" icon with a
         tiny None caption replaces it. */
      ? /*#__PURE__*/React.createElement("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
          /*#__PURE__*/React.createElement("img", { src: '/ui/welcome/cc/cc-no-hair.webp?v=' + BUILD_INFO.version, alt: 'None', draggable: false, style: { width: '68%', height: '68%', objectFit: 'contain' } }),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: '#3a4450', lineHeight: 1 } }, "None"))
      : /*#__PURE__*/React.createElement("img", { src: _thumbSrc(cat, opt.id), alt: opt.name, decoding: 'async',
          onError: function (e) { _thumbFallback(e, cat, opt.id); },
          style: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' } }),
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
    /* v2.3.1494: only roll what is still offered.  Rolling a disabled recolor
       would look like a broken button -- the swatch changes, the character
       does not -- and would still persist and broadcast the dead pick. */
    if (recolorEnabled('skin')) { var sk = rpick(SKIN_CATALOG); setSkin(sk); setSkinSel(sk); }
    if (recolorEnabled('pants')) { var pt = rpick(PANTS_CATALOG); setPants(pt); setPantsSel(pt); }
    if (recolorEnabled('shoes')) { var sh = rpick(SHOES_CATALOG); setShoes(sh); setShoesSel(sh); }
    /* v2.3.1953: roll the build too.  Randomize is how most people first see
       what the creator can do, and a feature it never touches is a feature
       half the players never learn exists. */
    var bh = rpick(HEIGHT_CATALOG); setBuildHeight(bh); setHeightSel(bh);
    /* v2.3.1996: no frame roll -- the axis is locked to medium (FRAME_CATALOG),
       so rolling it would pick 'medium' every time and the only thing it could
       still do is surprise a player whose saved build was Thin or Large. */
    var hr = rpick(HAIR_CATALOG); setHair(hr); setHairSel(hr);
    if (recolorEnabled('hair')) {
      var hcCat = hr === 'long' ? HAIR_COLOR_CATALOG.filter(function (c) { return LONG_HAIR_COLORS.indexOf(c.id) >= 0; }) : HAIR_COLOR_CATALOG;
      var hcc = rpick(hcCat); setHairColor(hcc); setHairColorSel(hcc);
    }
    var bd = rpick(FACIALHAIR_CATALOG); setFacialHair(bd); setFacialHairSel(bd);
    if (recolorEnabled('beard')) { var bcc = rpick(FACIALHAIR_COLOR_CATALOG); setFacialHairColor(bcc); setBeardColorSel(bcc); }
    var st = rpick(SHIRT_CATALOG); setShirt(st); setShirtSel(st);
    if (recolorEnabled('shirt')) { var stc = rpick(SHIRT_COLOR_CATALOG); setShirtColor(stc); setShirtColorSel(stc); }
    var ht = rpick(HEADWEAR_CATALOG); setHeadwear(ht); setHeadwearSel(ht);
    /* v2.3.1927: roll from what THIS hat offers -- rolling a colour its picker
       hides is the same broken-button problem the v2.3.1494 note describes. */
    if (recolorEnabled('hat')) { var htc = rpick(hatColorsFor(ht)); setHatColor(htc); setHatColorSel(htc); }
    if (recolorEnabled('eyes')) { var ec = rpick(EYE_COLOR_CATALOG); setEyeColor(ec); setEyeColorSel(ec); }
  };
  /* ═══ v2.3.2036: RESET — BACK TO THE BARE DEFAULT ═══
   *
   * Owner: "add a reset button so you can make the character back to the
   * default", and then, plainly, "bald shirtless character is what I wanted
   * for reset".
   *
   * These are the stores' OWN defaults, not a snapshot: hair, shirt, headwear
   * and beard are 'none' (hairCatalog.js, shirtCatalog.js, etc.), and every
   * colour is 'default', meaning the sprite's native paint.
   *
   * IT IS NOT AS NAKED AS IT SOUNDS, which is worth writing down because the
   * word "shirtless" invites the obvious worry. Skin, pants and shoes are
   * RECOLOUR-only catalogs -- their 'default' is the base sprite's own
   * colours, and the trousers and boots are painted into the body art itself.
   * There is no 'none' to set them to, so reset cannot undress the legs.
   *
   * Deliberately CONSTANTS rather than the opening look. An earlier draft
   * snapshotted the look when the creator opened and restored that. For a
   * brand-new player the two are identical -- a fresh character opens bald and
   * shirtless -- which is why they can look like the same feature. They part
   * company for a returning player, whose saved character loads first: a
   * snapshot would hand back the look they arrived in, and constants hand back
   * a blank slate. The owner asked for the blank slate.
   *
   * Both halves of every trait are written -- the catalog store AND the React
   * selection state -- exactly as randomizeAppearance does above. Writing only
   * the store leaves the picker's tick on the old tile; writing only the state
   * leaves the character unchanged. That is how this goes subtly wrong, so the
   * pairs are kept literally side by side.
   *
   * ═══ v2.3.2114: THE DRAWINGS GO TOO ═══
   * Owner: "The tattoos are not resetting through character reset and
   * randomize", then "Yes make the shirt and pants reset too" (v2.3.2115).
   *
   * They did not, and the paragraph that used to stand here is why: the
   * painted drawings live in their own canvases behind the designer modal, not
   * in this trait state, and the call was that silently wiping someone's
   * drawing from a button labelled Reset would be worse than leaving it.
   *
   * The owner is right and that call was wrong, for a reason the button itself
   * gives: this Reset means "back to the bare default" (their words: "bald
   * shirtless character is what I wanted"), and a character that comes back
   * bald and shirtless still wearing a face tattoo has not been reset — it has
   * been half reset, which reads as a bug rather than as care.  Same for
   * Randomize: a fresh roll of every other trait around a drawing that never
   * changes makes the drawing look stuck.
   *
   * EVERY painted canvas now — the four tattoos, both shirt sides and the
   * trousers — through artOps.clearAllArt, which drops the SHAPES with the
   * drawing rather than only the flat pixels.  See its note for why the set is
   * the whole canvas list rather than a subset, and why the design slots
   * (v2.3.1950) are deliberately left alone: a drawing saved to a slot
   * survives this, which is what keeps a button that erases things honest. */
  var resetLook = function () {
    clearAllArt();   /* v2.3.2114 / v2.3.2115 */
    setSkin('default'); setSkinSel('default');
    setPants('default'); setPantsSel('default');
    setShoes('default'); setShoesSel('default');
    setBuildHeight(DEFAULT_HEIGHT); setHeightSel(DEFAULT_HEIGHT);
    setHair('none'); setHairSel('none');
    setHairColor('default'); setHairColorSel('default');
    setFacialHair('none'); setFacialHairSel('none');
    setFacialHairColor('default'); setBeardColorSel('default');
    setShirt('none'); setShirtSel('none');
    setShirtColor('default'); setShirtColorSel('default');
    setHeadwear('none'); setHeadwearSel('none');
    setHatColor('default'); setHatColorSel('default');
    setEyeColor('default'); setEyeColorSel('default');
  };

  /* v2.3.711: RANDOMIZE rolls a few quick looks before settling -- the
     slot-machine beat makes the button feel fun instead of a dry reroll. */
  var randomizeWithFlair = function () {
    /* v2.3.2114: once, here, rather than inside randomizeAppearance — the
       flair loop calls that four times, and clearing an already-empty canvas
       three more times is work nobody asked for.  This is also the only
       caller, so the button and the clear cannot drift apart. */
    clearAllArt();
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

  /* ═══ v2.3.1980: EVERY WRITE TO THE CHAT LOG ANNOUNCES ITSELF ═══
     The log is written from four modules (game/chat.js on send and on every
     received line, networking/gameEvents.js for party chat and operator
     announcements, networking/wsClient.js for the welcome line) and all four
     were handed THIS setter -- so wrapping it once here is the whole of it.
     The world-chat feed lives in ChatBubble, which GameApp mounts outside
     this component and which therefore cannot see `chatLog` as a prop; it
     reads S.chatLog and re-renders on the bump. */
  var noteChatLog = useCallback(function (v) {
    setChatLog(v);
    try { chatLogBus.bump(); } catch (e) { /* the log still wrote; only the feed misses a frame */ }
  }, []);

  /* Send chat message — input-widget concerns stay here; the network/state
     body lives in src/game/chat.js (v2.3.767, REBUILD-PLAN Phase 2). */
  var sendChat = useCallback(function () {
    var text = chatInput.trim();
    if (!text) return;
    sendChatMessage(stateRef.current, text, { setChatLog: noteChatLog });
    setChatInput('');
    chatInputValRef.current = '';
    /* Keep keyboard open by re-focusing */
    requestAnimationFrame(function () {
      if (chatInputRef.current) chatInputRef.current.focus();
    });
  }, [chatInput, noteChatLog]);
  /* Ambient background music — gentle chiptune loop */
  useEffect(function () {
    return wireTownMusic(showNameModal, showLogin);
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1869 */
  /* Load player sprite sheets once, on mount. Per-direction frame counts
     and cycle durations differ — east source video is ~1 s, north/south
     ~2 s. Storing intervalMs per sheet lets each direction animate at its
     native speed instead of forcing a uniform tick. */
  useEffect(function () {
    return wireSpriteSheets(stateRef, { handAnchorsRef: handAnchorsRef, playerSpritesRef: playerSpritesRef, slimeDeathImgRef: slimeDeathImgRef, slimeHitImgRef: slimeHitImgRef, slimeIdleImgRef: slimeIdleImgRef, slimeProjectileImgRef: slimeProjectileImgRef, slimeRemnantsImgRef: slimeRemnantsImgRef, slimeShootImgRef: slimeShootImgRef, weaponHandlesRef: weaponHandlesRef, weaponSpritesRef: weaponSpritesRef });
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
    return wireSlimeAudio(stateRef, slimeIdleAudioRef);
  }, []);

  /* Prevent iOS page scroll + track keyboard height */
  var wrapRef = useRef(null);
  useEffect(function () {
    /* v2.3.1869: bootPhase — the login door (v2.3.1814) is a third pre-game
       screen this guard never knew about, and the refs below only exist once
       the game UI renders.  Without it this effect runs while the door is up,
       bails on a null ref, and never re-runs; see the game-loop effect for
       the full account. */
    if (showNameModal || showLogin || bootPhase !== null) return;
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
    /* The wrapper must stay at the FULL viewport height while the iOS keyboard
       is open, so the keyboard overlays the game instead of squashing it.
       v2.3.1533: it used to do that by measuring window.innerHeight ONCE and
       re-stamping that snapshot on every visualViewport resize AND scroll —
       which fire constantly on iOS, so the snapshot won permanently. The
       measurement is taken at the worst possible moment: this effect returns
       early while the login/name modal is up (see the top of the effect), so
       it runs the instant that modal CLOSES — i.e. while the keyboard the
       player just typed their name on is still collapsing. A short reading
       there froze the game into the top half of the screen for the whole
       session, with the toolbar still pinned to the true bottom and black in
       between (owner's friend, several logins in a row; her ~783pt viewport
       was laid out at ~394pt).
       The fix is to stop snapshotting. `100dvh` — already on the element from
       its style prop — is exactly this rule expressed in CSS: it tracks
       browser-chrome changes and does NOT shrink for the on-screen keyboard.
       Where it is supported we simply clear the inline override and let it do
       the work. iOS 14.0-15.3 predates dvh (the game's floor is iOS 14, see
       the WebP note), so those keep a lock — but one that RE-MEASURES, and
       only skips a reading it can tell is keyboard-shrunken, the same test the
       canvas resizer below already uses. */
    var el = wrapRef.current;
    var hasDvh = !!(window.CSS && window.CSS.supports && window.CSS.supports('height', '100dvh'));
    /* clear any px height a previous run of this effect left behind */
    if (el) el.style.height = hasDvh ? '' : window.innerHeight + 'px';

    var lockedHeight = window.innerHeight;
    var relock = function relock(remeasure) {
      if (!el || hasDvh) return;
      var vv = window.visualViewport;
      /* keyboard up: innerHeight stays tall while visualViewport shrinks.
         Hold the last full-height value rather than trust this reading. */
      var keyboardUp = !!(vv && window.innerHeight - vv.height > 100);
      if (remeasure && !keyboardUp) lockedHeight = window.innerHeight;
      el.style.height = lockedHeight + 'px';
    };
    relock(true);

    var handleResize = function handleResize() { relock(true); };
    /* orientation change: iOS reports the new size late, so re-measure again
       after it settles as well as immediately. */
    var handleOrientationChange = function handleOrientationChange() {
      relock(true);
      setTimeout(function () { relock(true); }, 300);
    };
    if (!hasDvh && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    if (!hasDvh) {
      window.addEventListener('resize', handleOrientationChange);
      window.addEventListener('orientationchange', handleOrientationChange);
    }
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
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1869 */
  /* Initialize WebSocket connection to Durable Objects game server.
     v2.3.784: the ~1,560-line effect body moved verbatim to
     src/networking/wsClient.js setupWebSocket (REBUILD-PLAN Phase 5);
     ctx carries the closure captures it used to take from this scope. */
  /* v2.3.1642: UI PANEL REGISTRY for headless capture (tools/qa/qa-ui-shots.mjs).
     Panel visibility lives in React useState, so an automated pass had no
     way to open a menu without walking the player to the right building and
     clicking it -- which cannot reach panels gated on state a fresh account
     does not have (a clan, a party, an incoming trade).
     Same posture as the window._gameState / window._gameFns autotest hooks
     that have been here since the early harnesses: this exposes ONLY
     client-local VIEW state.  Every setter below toggles what is drawn on
     this device; none of them grants anything.  The server validates every
     action independently and treats this client as hostile regardless
     (docs/ARCHITECTURE-HANDOFF.md rule zero), so opening a panel you have
     not earned shows you an empty panel, not a capability. */
  window._uiPanels = {
    building: setBuildingPanel,
    inventory: setShowInventory, skills: setShowSkills, stats: setShowStatScreen,
    shop: setShowShop, social: setShowSocialPanel, leaderboard: setShowLeaderboard,
    encyclopedia: setShowEncyclopedia, info: setShowInfo,
    emotes: setShowEmotes, clan: setShowClanPanel,
    guild: setShowGuildPanel, feedback: setShowFeedback, petHouse: setShowPetHouse,
    furniture: setShowFurniture, playerList: setShowPlayerList,
    dungeonCreatorShow: setShowDungeonCreator, tradeShow: setShowTrade,
    quest: setQuestPanel, inspect: setInspectPlayer, incomingTrade: setIncomingTrade,
    trade2: setTrade2, duelRequest: setDuelRequest, threat: setThreatIncoming,
    clanData: setClanData, party: setParty, welcome: setShowWelcome,
    mayorGreeting: setShowMayorGreeting, tourPrompt: setShowTourPrompt,
    intro: setShowIntro,
    /* These three panels are gated on a COMPANION value, not just their
       boolean — capturing them needs both halves set. */
    chatOpen: setChatOpen,              // the real chat gate (showChatLog is dead state, below)
    dungeonCreator: setDungeonCreator,  // paired with showDungeonCreator
    tradeTarget: setTradeTarget,        // paired with showTrade
  };
  /* v2.3.1701: IS ANY UI IN FRONT OF THE WORLD RIGHT NOW?
     Mirrored into stateRef because the game loop (a plain rAF closure) cannot
     read React state, and the proximity quest-dialogue below must never steal
     focus from something the player deliberately opened.  Written during
     render like window._uiPanels above it, so it is fresh on the very frame
     the panel appears — an effect would be one frame late, which is exactly
     the frame the auto-open would fire on.  Deliberately generous: false
     negatives here open a dialogue over someone's inventory, which is worse
     than a dialogue that waits. */
  /* v2.3.2078: named, because it is now read twice — the proximity gate
     reads it off stateRef on the same frame (see the note above), and the
     effect that puts Diego's drawer away needs it as a dependency. One
     expression, so the two can never disagree about what "a panel is open"
     means. */
  var _anyPanelOpen = !!(questPanel || buildingPanel || showInventory || showSkills
    || showStatScreen || showShop || showEncyclopedia || showLeaderboard || showSocialPanel
    || showClanPanel || showGuildPanel || showFeedback || showPetHouse || showFurniture
    || showPlayerList || showDungeonCreator || showTrade || incomingTrade || trade2
    || duelRequest || threatIncoming || inspectPlayer || chatOpen || showEmotes || showInfo
    || showIntro || showWelcome || showMayorGreeting || showTourPrompt || showNameModal
    || cookMinigame);
  stateRef.current._uiBusy = _anyPanelOpen;
  /* v2.3.2085: and out to the chrome mounted OUTSIDE this tree.  GameApp's
     WorldChatFeed has no path to this React state (its own comment says so),
     and its scrollable list was sitting over the inspect card's Trade button
     -- see uiBusyBus for the whole story.  Published from the same
     `_anyPanelOpen` this component already gates itself on, so there is one
     definition of "busy" rather than two that drift. */
  uiBusyBus.set(_anyPanelOpen);
  /* v2.3.1643: showChatLog, showClanWar and showArena USED TO LIVE HERE
     and were declared but never read — three dead useState pairs whose
     setters nothing called either. Removed. If you are looking for those
     names: chat renders off `chatOpen`, the war banners off
     stateRef.current._activeClanWar, and the arena UI is PartyPanel under
     buildingPanel === 'party'. Wire new panels to those, not to a fresh
     boolean that nothing reads. */
  useEffect(function () {
    return setupWebSocket({
      stateRef: stateRef,
      showNameModal: showNameModal,
      showLogin: showLogin,
      preGame: bootPhase !== null,   /* v2.3.1814: also the boot check + login door */
      setPlayerCount: setPlayerCount,
      setChatLog: noteChatLog,   /* v2.3.1980: wrapped -- see noteChatLog */
      setUnreadChats: setUnreadChats,
      setJoinFlash: setJoinFlash,
      setRpgState: setRpgState,
      setLevelUpMsg: setLevelUpMsg,
      setDuelRequest: setDuelRequest,
      setThreatIncoming: setThreatIncoming,
      setTrade2: setTrade2,
      setParty: setParty,
      setIncomingTrade: setIncomingTrade,
      setArenaTournament: setArenaTournament,
      setArenaBets: setArenaBets,
      /* v2.3.1611: the clan_state echo had nowhere to land in React state --
         see the handler in gameEvents.js for what that broke. */
      setClanData: setClanData,
      pixiRef: pixiRef
    });
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1814: reconnect decision changes with the pre-game phase */

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
       retired.  Armor contributed flat HP via getArmorHp() inside
       recalcDerived(), so the stats payload no longer carries def.
       Send 0 on the wire to keep any older worker that still reads
       def from crashing on a missing field.
       v2.3.1697: the flat-HP contribution is gone too (owner directive).
       Armor's payout is the server's per-hit `_armorDrMult` reduction —
       still nothing this payload carries, and still 0 on the wire. */
    var def = 0;
    var amuBon = rpgState._amuletBonus || null;
    var amuletHpRegen = (amuBon && amuBon.stat === 'hpRegen') ? (amuBon.value || 0) : 0;
    var amuletStaminaRegen = (amuBon && amuBon.stat === 'staminaRegen') ? (amuBon.value || 0) : 0;
    var _sig = [
      /* v2.3.1158: maxHp/maxStamina/maxMana are OUT of the dedupe
         signature (they stay in the payload for old-worker compat).
         The worker ignores and recomputes them, then echoes ITS values
         back — so any coefficient skew between client and worker made
         the signature flip on every recalcDerived, re-emitting
         stats_update in a loop (the "coins flashing" storm when a
         cached pre-1156 client met the 1156 worker).  Locally-derived
         values the server overwrites must never re-trigger this effect. */
      def, amuletHpRegen, amuletStaminaRegen,
      rpgState.power || 0, rpgState.vitality || 0, rpgState.endurance || 0,
      rpgState.agility || 0, rpgState.mind || 0,
      /* v2.3.1155: the five retired T2 stats left the signature with
         the wire fields below. */
      /* v2.3.236: include armor in the dedupe so armor swaps trigger
         a fresh stats_update -- otherwise the worker's view of armor
         goes stale and its echoed player_state silently re-equips. */
      rpgState.armor ? JSON.stringify(rpgState.armor) : 'noarmor',
      /* v2.3.912: include the weapon build channels so spending a point
         actually changes the signature and re-emits stats_update (otherwise
         the worker never learns and channel damage stays client-only). */
      rpgState.weaponSpecs ? JSON.stringify(rpgState.weaponSpecs) : 'nospecs',
      /* v2.3.1021: weapon/defense SKILL track in the signature so a kill that
         only levels a weapon skill (or a Tier-2 spend) re-emits stats_update
         and the worker persists it -- without this a level-up never reaches
         the server (the sig wouldn't change) and resets on reconnect. */
      rpgState.weaponSkills ? JSON.stringify(rpgState.weaponSkills) : 'noskills',
      rpgState.weaponUnspent ? JSON.stringify(rpgState.weaponUnspent) : 'nounspent',
      rpgState.defenseSkill ? JSON.stringify(rpgState.defenseSkill) : 'nodef',
      typeof rpgState.defenseUnspent === 'number' ? ('du' + rpgState.defenseUnspent) : 'nodu',
      rpgState.defenseSpec ? JSON.stringify(rpgState.defenseSpec) : 'nodspec',
      /* v2.3.1154: HP/Endurance grid track in the signature so a grid
         spend (or point grant) re-emits stats_update. */
      rpgState.hpSpec ? JSON.stringify(rpgState.hpSpec) : 'nohp',
      typeof rpgState.hpUnspent === 'number' ? ('hu' + rpgState.hpUnspent) : 'nohu',
      rpgState.enduranceSpec ? JSON.stringify(rpgState.enduranceSpec) : 'noen',
      typeof rpgState.enduranceUnspent === 'number' ? ('eu' + rpgState.enduranceUnspent) : 'noeu',
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
             clamps tierMult and re-derives the pools.  Without this the
             armorStash flow is purely local and the worker's ps.armor
             stays stale.
             v2.3.1697: it matters MORE now, not less.  ps.armor used to
             feed maxHp (_armorHp, retired this version); it now feeds
             _armorDrMult, which decides how hard every incoming hit
             lands — a stale ps.armor is the difference between taking
             56 and taking 100. */
          armor: rpgState.armor || null,
          /* Raw stats — worker clamps each to level * 10 + 20.  Cheater
             pushing R.vitality = 99999 gets clamped on the server,
             which then recomputes maxHp from the clamped value.  T1
             use-trained increments + amulet stat bonuses still land.

             v2.3.1630: ...but ONLY once this client actually KNOWS them.
             These five are the client's to report and the server's to
             store, which means an uninformed client reporting 0 is
             indistinguishable from a real reset -- that is precisely
             the new-device character wipe audit C-2 describes.  The
             server-side guard (grids.js, v2.3.1624) only protects
             against workers that HAVE it; a rollback below that version,
             or any worker still deploying, is unprotected, and it is
             this client that would do the wiping.  So the honest gate
             lives here too: no seed, no report.  The keys are OMITTED
             rather than zeroed, because _handleStatsUpdate skips absent
             keys (`typeof payload[s] === 'number'`), so an omission is
             a true no-op on every worker version ever shipped.
             _t1Seeded is set when the localStorage cache carried stats
             or when a player_state echo delivered them (wsClient.js). */
          ...t1StatsPayload(stateRef.current, rpgState),
          /* v2.3.1155: the five retired T2 stats are off the wire —
             the worker ignores the keys either way. */
          /* v2.3.912: per-weapon-category build channels.  The worker clamps
             each value to [0,99] and applies the damage + crit channels in its
             authoritative damage roll, so spent build points speed up real
             kills (not just client prediction). */
          weaponSpecs: rpgState.weaponSpecs || {},
          /* v2.3.1021: weapon/defense skill track -- reported so the worker
             persists trained levels / points / channels (durable across
             reconnect + device).  Worker clamps; pure store-and-echo. */
          weaponSkills: rpgState.weaponSkills || {},
          weaponUnspent: rpgState.weaponUnspent || {},
          defenseSkill: rpgState.defenseSkill || { level: 0, xp: 0 },
          defenseUnspent: (typeof rpgState.defenseUnspent === 'number') ? rpgState.defenseUnspent : 0,
          defenseSpec: rpgState.defenseSpec || {},
          /* v2.3.1154: HP/Endurance grid track.  Worker clamps [0,50]
             per channel PLUS the grid budget (sum <= governing stat);
             vigor/stamina feed its authoritative pool recompute. */
          hpSpec: rpgState.hpSpec || {},
          hpUnspent: (typeof rpgState.hpUnspent === 'number') ? rpgState.hpUnspent : 0,
          enduranceSpec: rpgState.enduranceSpec || {},
          enduranceUnspent: (typeof rpgState.enduranceUnspent === 'number') ? rpgState.enduranceUnspent : 0,
        },
      });
    } catch (e) {}
  }, [rpgState]);


  /* ═══ GAME LOOP — Full simulation + PixiJS/Canvas 2D rendering ═══ */
  /* ═══ v2.3.1869: THE LOGIN DOOR HAD TO BE A DEPENDENCY ═══
     Owner: "When I try to continue my character the screen is black" — on the
     Create Character pop-up's Continue.

     This effect creates the Pixi renderer and starts the game loop, and it
     bails when `canvasRef.current` is null.  Its guard and its dependency
     list knew about two pre-game screens, `showNameModal` and `showLogin`,
     and nothing else.  v2.3.1814 then put a THIRD screen in front of both of
     them — the login door — gated on `bootPhase`, which was never added
     here.  On that road both old flags are false the whole time, so:

       1. the component mounts with bootPhase 'login'; the render returns the
          door and never renders the <canvas>;
       2. this effect runs anyway (its guards are false), finds canvasRef
          null, and returns — no renderer, no loop;
       3. Continue sets bootPhase null and the canvas finally mounts;
       4. ...and this effect does NOT re-run, because none of its three
          dependencies changed.  Pixi is never initialised.

     The canvas is therefore present and permanently unpainted, which is what
     every measurement of this bug said: canvas:true, 0% lit, and a renderer
     "rebuild" that could not help because there was no renderer to rebuild.
     The black-screen watchdog then struck three times and reloaded — into the
     same trap.

     It also explains the shape of the report: creating a character works,
     because that road toggles showNameModal, which IS a dependency.  Only the
     roads gated purely on bootPhase — the Continue pop-up, and a plain reload
     holding your key — came up black.

     So bootPhase joins both the guard and the deps.  The guard matters as
     much as the list: without it the effect would run while the door is up,
     find no canvas and return, and then have nothing left to re-trigger it. */
  useEffect(function () {
    if (showNameModal || showLogin || bootPhase !== null) return;
    var canvas = canvasRef.current;
    if (!canvas) return;
    var S = stateRef.current;

    /* Canvas resize.  Reserve 25vh at the bottom for the BottomDashboard
       so the playfield doesn't draw underneath it.  The camera follows the
       player, so a shorter canvas just means less peripheral world is
       visible — the player stays centered. */
    var vv = window.visualViewport;
    /* v2.3.1283: geometry constants now come from sheetGeometry.js —
       the shared source BottomDashboard also imports — instead of the
       comment-enforced mirror of --dash-h that lived here through
       v2.3.1280.  v2.3.1290: the canvas keys off the BAR height (toolbar-
       only resting state) in all modes; the expanded sheet (the one
       open state since the v2.3.1350 two-state cut) overlays the world
       without resizing the canvas (see sheetGeometry's invariant note). */
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
      /* ═══ v2.3.1740: ...ONLY WHEN THERE IS ACTUALLY A KEYBOARD ═══
         Owner joined on an iPhone to a world squashed into a ~150px strip
         with the joysticks floating in black below it.  THIS LINE, which
         had no `_typing` test:

             if (vv && window.innerHeight - vhFull > 100) return;

         The gap it looks for is not unique to a keyboard — Safari's own
         chrome produces it.  On a tall phone with the bottom URL bar the
         difference between innerHeight and visualViewport.height clears 100
         on its own, so the guard fired on EVERY call: the first, pre-layout
         resize sized the canvas at ~150px and every later one returned early,
         freezing it there for the whole session.  Reproduced headlessly by
         stubbing a 140px gap (tools/qa/mp/mp-viewport.mjs) — canvas 150px,
         exactly the owner's screenshot.

         A keyboard cannot be open without a focused text field, so that is
         what the guard now asks.  It keeps doing its v2.3.130 job (the chat
         keyboard must float over the canvas, not resize the scene) and stops
         firing on browser chrome, which was never a keyboard. */
      var _ae = document.activeElement;
      var _typing = !!(_ae && (_ae.tagName === 'INPUT' || _ae.tagName === 'TEXTAREA' || _ae.isContentEditable));
      if (vv && _typing && window.innerHeight - vhFull > 100) return;
      /* ═══ v2.3.2197: --sheet-h RIDES WITH THE REST OF THE GEOMETRY ═══
         Owner: "upon first joining the game and first rotating to landscape
         sometimes the joysticks are indeed missing."  The discs hang off
         --sheet-h, which was stamped only by BottomDashboard, only off its
         own bus and (v2.3.2196) its own resize listener -- edge-triggered,
         while --dash-h and --cols-h beside it have been level-triggered by
         the watchdog since v2.3.1975.  The note above those two already says
         where a joystick anchor belongs: "Stamped HERE and not in the
         dashboard because this function owns the canvas."  So it is stamped
         here too, from the one shared formula (sheetStamp.js), which puts it
         behind every trigger this function already has -- window resize,
         visualViewport resize, the ResizeObserver, the orientationchange
         double-fire, and the watchdog's heal.
         AFTER the keyboard guard on purpose: while a text field is focused
         the band must not move under the composer, and the guard's early
         return is what holds it. */
      stampSheetH();
      /* v2.3.1715: on desktop the whole app lives inside a centred, capped
         shell (#root, see the pointer:fine block in game.css), so the
         viewport is no longer what the game gets to use.  Measure the SHELL
         and let every consumer downstream — the canvas, --dash-h, --cols-h,
         the joystick zones, every world-HUD anchor — derive from that one
         number, exactly as they already derive from the viewport on a phone.
         AFTER the iOS-keyboard guard above, deliberately: that guard aborts
         on a big innerHeight-vs-viewport gap, and a shell SHORTER than the
         window is exactly such a gap — measuring first made it read a 540px
         shell as an open keyboard and skip the resize entirely.
         Guarded by `smaller than`: on mobile the shell IS the viewport, so
         this is a no-op there and the primary platform is untouched. */
      /* v2.3.1740: gated on the SAME media query that creates the shell.
         The comment above asserts "on mobile the shell IS the viewport, so
         this is a no-op there" — that is an assumption, not a guarantee:
         #root is only given `height:100%` inside the desktop rule, and on a
         phone its one real child is position:fixed and therefore out of
         flow, so its clientHeight is whatever incidental in-flow content
         exists when resize() runs.  Any small positive value silently became
         the height of the game.  It was not the cause of the owner's strip
         (the keyboard guard above was), but it is the same failure waiting
         on a different trigger, and asking the media query directly costs
         nothing and makes "phones are untouched" true by construction
         rather than by hope. */
      var _shellMq = window.matchMedia && window.matchMedia('(pointer:fine) and (min-width:1000px)');
      var shellEl = (_shellMq && _shellMq.matches) ? document.getElementById('root') : null;
      if (shellEl) {
        var _sw = shellEl.clientWidth, _sh = shellEl.clientHeight;
        if (_sw > 0 && _sw < vw) vw = _sw;
        if (_sh > 0 && _sh < vhFull) vhFull = _sh;
      }
      /* v2.3.1325: the bar height is slot-derived (owner: slot-sized
         toolbar icons), so it varies with the viewport.  Stamp the two
         CSS vars here — the ONE place that already owns viewport
         changes — so every game.css consumer (joystick zones, world-HUD
         anchors) and this canvas math share the same rounded value.
         game.css only carries boot fallbacks. */
      /* v2.3.2119: FOLDED = IDENTITY ROW ONLY.  The fold subtracts the
         columns row from the band and zeroes --cols-h, and every consumer
         downstream — canvas height, the identity row's bottom anchor, the
         chat feed, the joystick zones — derives the folded geometry from
         the same two vars they already read.  The expanded-sheet offset is
         the DIFFERENCE (--dash-h - --cols-h), which this arithmetic leaves
         bit-identical, so a sheet opened out of a folded band sits exactly
         where it always has.  Stamped HERE and not in the dashboard because
         this function owns the canvas: a fold the canvas didn't follow
         would be a black stripe where the columns row was. */
      /* v2.3.2156: that arithmetic lives in bandFootprint() now — ONE copy,
         shared with the watchdog below, because orientation is about to
         become a third input to it (owner: "Landscape would be an optional
         view") and two hand-kept copies of a rule that must match is the
         bug worldViewport.js's header narrates.  Same numbers, same flag. */
      /* v2.3.2157: the open sheet is geometry now.  In portrait this input
         changes nothing (bandFootprint ignores it there -- the BAR-height
         invariant); in landscape an expanded destination narrows the world
         to playW and the sheet takes the difference. */
      /* v2.3.2165: the open sheet's KIND rides along — the dashboard column
         is narrower than a pane column (the owner's 2x4 rotation rule). */
      var _sheetOpen = dashboardPanelBus.state.mode === 'expanded'
        ? (dashboardPanelBus.state.stack[0] === 'dashboard' ? 'dashboard' : 'panel')
        : false;
      /* v2.3.2163: the home-indicator inset, measured through CSS because
         JS cannot read env() directly.  The probe is one reusable fixed div
         parked off-screen; 0 in a browser tab, ~21px in a standalone
         landscape launch.  Cached on the element so the getComputedStyle
         cost is paid once per resize, not per frame. */
      /* ═══ v2.3.2174: THE PROBE READS ALL THREE INSETS ═══
         Owner, on a real iPhone sideways: "The iPhone has a punch hole
         that's awkward since it goes right through the menus."  It does,
         and it is not cosmetic: index.html sets viewport-fit=cover, so the
         page draws UNDER the Dynamic Island, and nothing in the game read
         env(safe-area-inset-left/right) until now.  The SAME probe answers
         all three questions -- one element, one getComputedStyle, three
         paddings -- because a second probe is a second thing to keep in
         sync with resize(). */
      var _sabEl = document.getElementById('bt-sab-probe');
      if (!_sabEl) {
        _sabEl = document.createElement('div');
        _sabEl.id = 'bt-sab-probe';
        _sabEl.style.cssText = 'position:fixed;left:-9999px;top:0;'
          + 'padding-bottom:env(safe-area-inset-bottom,0px);'
          + 'padding-left:env(safe-area-inset-left,0px);'
          + 'padding-right:env(safe-area-inset-right,0px);';
        document.body.appendChild(_sabEl);
      }
      var _sabCS = getComputedStyle(_sabEl);
      var _sab = parseFloat(_sabCS.paddingBottom) || 0;
      var _insL = parseFloat(_sabCS.paddingLeft) || 0;
      var _insR = parseFloat(_sabCS.paddingRight) || 0;
      /* ═══ THE DASHBOARD TAKES THE CLEAR EDGE ═══
         The Island lands on the LEFT or the RIGHT depending on which way the
         phone was rotated, so a fixed side is right for one rotation and
         wrong for the other -- which is why this is measured rather than
         chosen.  Portrait never reads this: the band spans the full width.

         ═══ v2.3.2177: THE INSETS ALONE COULD NEVER ANSWER IT ═══
         This was `(_insL > _insR) ? 'right' : 'left'`, and the owner found
         what that means on a real phone: "It always displays on the left."
         iOS insets BOTH long edges equally in landscape (rounded corners on
         both sides), so the comparison is false in both rotations and the
         tie-break -- left -- was the only answer it ever gave.  The rule now
         lives in dashSidePref.js, which keeps the inset comparison as the
         first signal and falls back to the ROTATION when the insets tie,
         with a Settings pin behind it in case the rotation mapping reads
         backwards on hardware this repo cannot test against. */
      var _dashSide = resolveDashSide(_insL, _insR, screenAngle());
      var _fp = bandFootprint(vw, vhFull, dashMinBus.min, _sheetOpen, _sab);
      var bar = _fp.dashH;
      var colsH = _fp.colsH;
      /* v2.3.2156: the shell's orientation, stamped where every other
         viewport-derived value is stamped.  CSS scoped under
         html[data-orient="landscape"] keys off THIS attribute rather than a
         media query, because a 1400x450 desktop window matches any
         short-and-wide query while its aspect-locked play shell is portrait
         — playIsLandscape() is the one source that knows the difference
         (playViewport.js's two-widths law). Nothing reads it yet; the
         landscape dashboard PR does. */
      try {
        document.documentElement.setAttribute('data-orient', playIsLandscape() ? 'landscape' : 'portrait');
      } catch (e) { /* SSR/teardown: a missed stamp heals on the next resize */ }
      document.documentElement.style.setProperty('--nav-slot', navSlotSize(vw, vhFull) + 'px');
      /* v2.3.1560: --nav-h is the toolbar ribbon alone; --dash-h below is
         the whole band.  Both stamped here so the ribbon and the rows
         above it can be pinned inside the band without any one of them
         re-deriving geometry from CSS. */
      /* v2.3.1637: --nav-h retired with the bottom ribbon.
         v2.3.1642: --rail-w retired too — the nav buttons moved to the
         band's top-left, beside the identity strip, so the rows reserve
         nothing on their left and the top row's own height is simply
         --dash-h minus --cols-h.  Two stamped numbers again. */
      /* v2.3.1635: a third var joins for the same reason --nav-h exists.
         The band is THREE rows now, so the middle row can no longer size
         itself as calc(--dash-h - --nav-h) — that arithmetic silently
         became "middle row + identity row" and would have stretched the
         middle row over both.  Each pinned row is told its own height.
         v2.3.1636: --quick-h -> --cols-h with the three-column row. */
      document.documentElement.style.setProperty('--cols-h', colsH + 'px');
      document.documentElement.style.setProperty('--dash-h', bar + 'px');
      /* v2.3.2157: the play area's width and the sheet's.  Portrait stamps
         playW == vw and sheetW == 0, so nothing there can read a landscape
         number.  In landscape, game.css narrows .brotown-wrap to --play-w
         (contain:paint re-anchors every fixed HUD overlay to it -- the
         desktop shell's own v2.3.1768 mechanic, one level down) and the
         side sheet takes --sheet-w. */
      document.documentElement.style.setProperty('--play-w', _fp.playW + 'px');
      document.documentElement.style.setProperty('--sheet-w', _fp.sheetW + 'px');
      /* ═══ v2.3.2174: WHICH SIDE, AND WHERE THE WORLD STARTS ═══
         Stamped beside --play-w because they are the same fact seen from
         two ends: --play-w is how WIDE the world is, --world-x is where it
         BEGINS.  game.css offsets .brotown-wrap by --world-x, and
         contain:paint carries every fixed HUD child along with it (the
         v2.3.2157 mechanic) -- so the whole world, joysticks and banners
         included, moves with one number.  0 when the panel is on the right,
         which is byte-identical to the layout that shipped.
         --world-pad-l/r are the Island's own insets: the panel takes the
         CLEAR edge, so the Island always falls on the world's side, and the
         owner chose to keep the art full-bleed under it ("keep it
         full-bleed") with the CONTROLS held clear.  game.css spends these
         on the edge clusters only. */
      document.documentElement.style.setProperty('--world-x',
        (_dashSide === 'left' ? _fp.sheetW : 0) + 'px');
      /* ═══ v2.3.2178: THE HOME-INDICATOR INSET, AS A STAMP ═══
         resize() has measured this since v2.3.2163 (the probe exists
         because JS cannot read env()), but the band, the landscape dock and
         the panels that must clear it each read `env(safe-area-inset-bottom)`
         for themselves.  Two costs, and the owner has now been bitten by
         both: the numbers could DISAGREE with --dash-h, which is what put
         the portrait nav buttons above their own band in a standalone
         launch; and nothing downstream was reachable from a test, because
         env() cannot be set in a headless browser -- so every standalone-only
         layout bug could only ever be found on a phone.
         One measured value, stamped where --dash-h and --world-x are
         stamped, ends both: the layout reads the same number resize() sized
         itself with, and the QA harness simulates a standalone launch by
         overriding the probe exactly as it already simulates an Island. */
      document.documentElement.style.setProperty('--sab', _sab + 'px');
      document.documentElement.style.setProperty('--world-pad-l', _insL + 'px');
      document.documentElement.style.setProperty('--world-pad-r', _insR + 'px');
      /* ═══ v2.3.2176b: THE RESTING FOLD CHIP'S FOOTPRINT ═══
         Found by looking at a screenshot of the resting landscape world:
         the ▴ chip and the v2.3.2155 notification bell were drawn in the
         SAME bottom-left corner, chip on top -- so the bell could not be
         read and could not be tapped.  Neither is wrong on its own; they
         only collide in the one state where the dashboard is minimised
         (--world-x drops to 0 and the world's left edge becomes the
         screen's, right where the chip lives).  So the chip states its
         width and the world's bottom-left cluster steps around it: the
         dock's inset + its padding + the 34px chip, plus air.  Zero
         whenever the chip is NOT on the world's left edge -- portrait,
         any open sheet, and every rotation that puts the dashboard on the
         right -- which keeps those layouts byte-identical. */
      document.documentElement.style.setProperty('--land-fold-w',
        (playIsLandscape() && !_sheetOpen && _dashSide === 'left'
          ? 2 * DASH_GAP + LAND_FOLD_CHIP_W + 8 : 0) + 'px');
      try {
        document.documentElement.setAttribute('data-dash-side', _dashSide);
      } catch (e) { /* SSR/teardown: a missed stamp heals on the next resize */ }
      var vh = Math.max(120, Math.round(vhFull - bar) + _fp.overlap); /* v2.3.1290: bar is the resting band; v2.3.2156: overlap rides the footprint (a bandless layout earns none) */
      /* v2.3.1283: short-circuit when nothing changed — the
         ResizeObserver below re-fires during layout churn (e.g. the
         sheet's height animation), and assigning canvas.width even to
         the SAME value reallocates the WebGL drawing buffer. */
      /* v2.3.2157: the canvas is the PLAY width, not the viewport width --
         identical in portrait (playW == vw always), narrower in landscape
         while a sheet is open. */
      var tw = Math.round(_fp.playW * dpr), th = Math.round(vh * dpr);
      if (canvas.width === tw && canvas.height === th) return;
      canvas.width = tw;
      canvas.height = th;
      canvas.style.width = _fp.playW + 'px';
      canvas.style.height = vh + 'px';
    }
    /* Pre-size the canvas BEFORE Pixi init so pixiApp's createPixiApp
       reads non-zero clientWidth/Height (it falls back to those if the
       attribute width/height aren't set, and at first useEffect run the
       canvas is fresh from React with both undefined). */
    resize();
    window.addEventListener('resize', resize);
    if (vv) vv.addEventListener('resize', resize);
    /* ═══ v2.3.2174: A 180-DEGREE FLIP IS NOT A RESIZE ═══
       Turning the phone end-for-end in landscape moves the Dynamic Island
       from one edge to the other WITHOUT changing 844x390, so the 'resize'
       above may never fire and the dashboard would stay on the edge the
       Island just moved to -- the exact complaint this change answers.
       orientationchange does fire, and iOS reports the new insets LATE
       (the same lateness handleOrientationChange documents at :2557), so
       re-run after it settles as well as immediately.  Costs a no-op
       resize() in every other rotation: the short-circuit at the top
       returns before touching the canvas when nothing moved. */
    var _orientResize = function () {
      resize();
      setTimeout(resize, 300);
    };
    window.addEventListener('orientationchange', _orientResize);
    var resizeObs = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (resizeObs && canvas.parentElement) resizeObs.observe(canvas.parentElement);

    /* ═══ v2.3.1975: A WATCHDOG, BECAUSE THE SPECIAL CASES KEEP RUNNING OUT ═══
       Owner, with a screenshot from the FIRST person ever to play-test the
       game: the world squashed into a band at the top, joysticks floating in
       the page background below it, dashboard fine. Unplayable, and the THIRD
       time this exact symptom has reached him.

       Every previous fix identified the trigger and special-cased it — the
       judging session, then v2.3.1715's #root measurement, then v2.3.1740's
       keyboard guard firing on browser chrome. Each was correct. Each time a
       new trigger turned up, because every one of them is a different way of
       reaching the SAME state: resize() ran once against a viewport that was
       not the real one, and nothing ever fired again to correct it.

       That is the thing worth fixing. resize() is edge-triggered — a window
       resize, a visualViewport resize, or a ResizeObserver on the parent — and
       every one of those is the browser PROMISING to tell us. The failure mode
       is the browser not making that call: an in-app browser whose chrome
       settles without an event, a viewport reported small for one frame during
       load, a devicePixelRatio that changes under us. There is no list of
       those to complete; the list is "everything we have not seen yet".

       So this asserts the invariant directly, on a timer, instead of trusting
       the events: if the canvas is not the size the layout says it should be,
       size it. It is level-triggered, so it cannot be defeated by a missing
       event, and it self-heals rather than requiring a reload.

       MEASURED against the owner's screenshot: the world band is ~12% of the
       page viewport where it should be ~56%. The tolerance below is 8% of the
       expected height, which is far looser than any rounding this code does
       (DASH_OVERLAP and the Math.round in vh are single pixels) and far
       tighter than any failure that has ever been reported.

       Two things it deliberately does NOT do:
         - It does not fight the keyboard. While a text field is focused the
           guard above is doing its job on purpose (v2.3.130: the chat keyboard
           must float over the world, not resize the scene), so the watchdog
           stands down and picks it up on the next tick after the blur.
         - It does not run forever at speed. A wrong size is a startup-shaped
           failure, so it checks briskly while that is being decided and then
           settles to a slow heartbeat that costs two reads a second. */
    var wdTicks = 0;
    var watchdog = setInterval(function () {
      wdTicks++;
      /* Fast for the first ~12s, then a slow heartbeat. */
      if (wdTicks > 24 && (wdTicks % 4)) return;
      var _ae2 = document.activeElement;
      if (_ae2 && (_ae2.tagName === 'INPUT' || _ae2.tagName === 'TEXTAREA' || _ae2.isContentEditable)) return;
      /* v2.3.2197: BEFORE the canvas tolerance check below, deliberately.
         That check short-circuits whenever the canvas is the right size --
         and --sheet-h can be wrong on a canvas that is perfectly fine (a
         rotation whose first resize carried pre-rotation dimensions is
         exactly that shape), so a stamp placed after it would never run in
         the case it exists for.  Costs a few reads a tick: stampSheetH does
         not touch the DOM unless the value actually moved. */
      stampSheetH();
      var vvNow = window.visualViewport;
      var haveH = canvas.getBoundingClientRect().height;
      if (!haveH) return;                       /* not laid out yet */
      var fullH = vvNow ? vvNow.height : window.innerHeight;
      /* v2.3.2119: the watchdog must expect the FOLDED band when the fold
         is on, or it and resize() disagree by the columns row's height —
         ~13% on a phone, past the 8% tolerance — and it "heals" the canvas
         to the wrong size twice a second forever.  Same arithmetic as
         resize(), same flag. */
      var _wdVw = vvNow ? vvNow.width : window.innerWidth;
      /* v2.3.2156: the SAME bandFootprint resize() uses — switched in the
         same commit, deliberately: the watchdog's whole job is to re-derive
         resize()'s arithmetic, and the day the two read different formulas
         (a 243-vs-48 landscape disagreement is 10x the 8% tolerance) it
         "heals" the canvas against resize() twice a second forever. */
      var _wdSab = 0;
      try {
        var _wdEl = document.getElementById('bt-sab-probe');
        if (_wdEl) _wdSab = parseFloat(getComputedStyle(_wdEl).paddingBottom) || 0;
      } catch (e) { /* probe not built yet: 0, same as resize's first pass */ }
      var _wdFp = bandFootprint(_wdVw, fullH, dashMinBus.min,
        dashboardPanelBus.state.mode === 'expanded'
          ? (dashboardPanelBus.state.stack[0] === 'dashboard' ? 'dashboard' : 'panel')
          : false, _wdSab); /* v2.3.2157/2163/2165: same inputs as resize() */
      var wantH = Math.max(120, fullH - _wdFp.dashH + _wdFp.overlap);
      /* v2.3.2157: width joins the check -- it varies with the landscape
         sheet now, and a missed open/close resize would otherwise leave a
         black stripe nothing heals.  Same tolerance, same single warning. */
      var haveW = canvas.getBoundingClientRect().width;
      var wantW = _wdFp.playW;
      if (Math.abs(haveH - wantH) <= wantH * 0.08
        && Math.abs(haveW - wantW) <= wantW * 0.08) return;
      /* Say it once, loudly, with the numbers: if this ever fires in the wild
         the log is the whole diagnosis, and silence here would hide the very
         thing three fixes have failed to see. */
      if (!window.__btResizeHealed) {
        window.__btResizeHealed = { at: Date.now(), had: Math.round(haveH), want: Math.round(wantH) };
        try {
          console.warn('[canvas-watchdog] canvas was ' + Math.round(haveH) + 'px, should be '
            + Math.round(wantH) + 'px — resizing. innerH=' + window.innerHeight
            + ' vvH=' + (vvNow ? Math.round(vvNow.height) : 'n/a')
            + ' dpr=' + (window.devicePixelRatio || 1));
        } catch (e) { /* ignore */ }
      }
      resize();
    }, 500);

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
        /* v2.3.1632: seeded only if the cache carries a REAL value.  A
           stored 0 proves nothing -- bt_rpg is rewritten on every
           player_state, so an unseeded session persists zeros and the
           next boot would otherwise mistake them for knowledge. */
        if ((savedRpg.power || 0) > 0 || (savedRpg.vitality || 0) > 0
            || (savedRpg.endurance || 0) > 0 || (savedRpg.agility || 0) > 0
            || (savedRpg.mind || 0) > 0) {
          S._t1Seeded = true;
        }
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
      migrateGrids(S.rpg);       /* v2.3.1154: backfill the HP/Endurance grids */
      migrateUniformT2(S.rpg);   /* v2.3.1156: one-time uniform-cap reprice (double 50-cap grids, refund repriced weapon channels) */
      /* v2.3.910: combat level is now derived (sum of build-skill levels), set
         by recalcDerived above.  Seed _lastShownLevel to the current level so
         the on-kill level-up VFX fires only for levels gained from here on, not
         a burst for every level the character already has.
         v2.3.1342: also clamp DOWNWARD — level-is-build (level = T2 points
         placed) can lower an old save's level, and a stale high-water here
         would mute every celebration until the player re-passed it. */
      if (S.rpg._lastShownLevel == null || S.rpg._lastShownLevel > (S.rpg.level || 1)) S.rpg._lastShownLevel = S.rpg.level || 1;
      /* v2.3.687: restore any orphaned steel piece (worn nowhere, bagged
         nowhere -- e.g. unequipped via the old Equipment-menu toggle) into
         the bag so it's never lost. */
      /* ═══ v2.3.1758: copper replaces iron as tier one ═══
         A save holding the old "Iron Torso" / "Iron Greaves" is rewritten in
         place — see migrateTier1Armor.
         ═══ v2.3.1761: AND IT MUST RUN BEFORE reconcileGearStash ═══
         Owner: "[the steel/iron armor is] appearing in player inventories who
         now also have the copper" / "showing iron greaves thumbnail in legs
         when I had nothing equipped."
         This was ordered after the reconcile, and reconcile is what DERIVES the
         worn cosmetic layer from the stat piece.  So a returning player's
         pieces were still un-migrated at that moment — no material — the layer
         resolved to the STEEL art, and only then did the rename to copper run,
         with nothing re-deriving the layer afterwards.  The result is exactly
         what was reported: copper in the bag, steel on the character and in the
         loadout cell, in the same save.
         The migration is the older fact, so it goes first and everything
         downstream sees one story. */
      try {
        if (migrateTier1Armor(S.rpg)) {
          try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) { /* quota */ }
        }
      } catch (e) { /* a migration must never block the load */ }
      try { reconcileGearStash(S.rpg); } catch (e) { /* best-effort */ }
      if (!S.rpg._quests) S.rpg._quests = {};
      if (!S.rpg._questFlags) S.rpg._questFlags = {};
      if (!S.rpg._questKills) S.rpg._questKills = {};
      if (!S.rpg._statLocks) S.rpg._statLocks = { power: false, vitality: false, endurance: false, agility: false, mind: false };
      if (S.rpg.influence === undefined) S.rpg.influence = 0;
      if (S.rpg.power === undefined) S.rpg.power = 0;
      /* ═══ v2.3.1676: THE STARTER-LOADOUT MIGRATIONS ARE GONE ═══
         Three `if (!S.rpg.X) S.rpg.X = {...}` blocks used to re-grant a
         melee weapon, a bow and a staff to any save whose slots were empty —
         plus a v2.3.943 pass that upgraded an untouched starter sword to a
         greatsword.  As of this version EVERY fresh character has all three
         empty on purpose (owner: "start the game without a weapon"), so these
         would have handed the whole loadout straight back on the first load
         and quietly undone it, with nothing in the diff to point at.
         Mayor Bro's arc is what fills these slots now: sword+shield when you
         accept his first quest, bow when you turn it in, staff on the next.
         Existing saves keep whatever they already had — these blocks only
         ever fired on an EMPTY slot, so removing them takes nothing away from
         anyone who owns a weapon. */
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
      /* v2.3.1676: the "everyone gets a Wood Shield" migration is GONE.
         It re-granted a shield to any save whose slot was empty, which as of
         this version is every FRESH character — the shield is Mayor Bro's to
         give now, and this line would have handed it back on the next load,
         silently undoing the change with nothing in the diff to show it.
         Nothing replaces it: an empty shield slot is a valid state (the
         unequip path has always produced one). */
      if (S.rpg.goldNuggets === undefined) S.rpg.goldNuggets = 0;
      if (S.rpg.goldBars === undefined) S.rpg.goldBars = 0;
      if (S.rpg.achievementPoints === undefined) S.rpg.achievementPoints = 0;
      if (!S.rpg._threatState) S.rpg._threatState = null; /* {target, ts, type:'red'|'white', expires} — v2.3.1193: no longer an orphaned stub; gameEvents.js writes it from the relayed threat handshake (record of MY outgoing threat; the skulls render from S._threatMarks / S._pvpSkull*) */
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

      /* Legacy compat properties — some UI/render code still reads these.
         v2.3.1155: def/lck aliased retired stats (always 0) — literal now. */
      S.rpg.str = S.rpg.power;
      S.rpg.def = 0;
      S.rpg.vit = S.rpg.vitality;
      S.rpg.spd = S.rpg.agility;
      S.rpg.lck = 0;
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
                /* Update legacy compat (v2.3.1155: def/lck literal 0 —
                   they aliased the retired fortification/ferocity) */
                S.rpg.str = S.rpg.power;
                S.rpg.def = 0;
                S.rpg.vit = S.rpg.vitality;
                S.rpg.spd = S.rpg.agility;
                S.rpg.lck = 0;
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
    /* v2.3.1669: the walkability clause is GONE.  It read "spawn NPCs
       only when the Tiled map isn't authoring town content", but town has
       no walkability grid at all (tiledMaps.js has town's .walk.json
       commented out), so the clause was always TRUE — it never gated
       anything and only obscured why the array was empty.  Keeping it
       would also make NPCs silently vanish the day a town mask ships. */
    if (!S.npcs && S.currentZone === 'town') {
      S.npcs = _spawnTownNpcs();
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
    /* v2.3.1794: how close you can get to a townsperson before they block.
       14px against a ~24px-wide drawn figure — see the note in isSolid. */
    var NPC_BLOCK_R2 = 14 * 14;
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
      /* ═══ v2.3.1794: NPCs ARE OBJECTS TOO ═══
         Owner: "only make the objects (like each house and NPC) unwalkable
         areas."  Buildings block through the props grid; townsfolk block here
         instead, as a live radius test, because a grid would be a lie the
         moment one of them moved and because the NPC list is already the
         authority on where they are.  Five of them in town, so this is five
         distance checks on a movement step that already does more work than
         that.

         The radius is deliberately smaller than the sprite: you should be able
         to stand shoulder to shoulder with the blacksmith to use his anvil,
         and a blocker as wide as the drawn figure makes talking to anyone feel
         like bumping into furniture.  Dead NPCs and any without a position do
         not block at all. */
      var _npcs = S.npcs;
      if (_npcs && _npcs.length) {
        var _pp = S.player;
        for (var _ni = 0; _ni < _npcs.length; _ni++) {
          var _n = _npcs[_ni];
          if (!_n || _n.alive === false || _n.x == null || _n.y == null) continue;
          var _ndx = px - _n.x, _ndy = py - _n.y;
          if (_ndx * _ndx + _ndy * _ndy >= NPC_BLOCK_R2) continue;
          /* NEVER TRAP SOMEONE ALREADY INSIDE.  A pure position test would seal
             a player who ends up within the radius by any route that skips
             collision — a teleport, a spawn, a quest hand-in that repositions
             them, or an NPC that walks onto them — because then EVERY
             candidate step is solid and there is no direction out.  Found the
             hard way: mp-townmap put the player at the foot of the steps, 5px
             from Mayor Bro, and he could not move at all.
             So the block only applies from OUTSIDE: if you are already inside,
             every step is allowed and you simply walk free. */
          if (_pp) {
            var _cdx = _pp.x - _n.x, _cdy = _pp.y - _n.y;
            if (_cdx * _cdx + _cdy * _cdy < NPC_BLOCK_R2) continue;
          }
          return true;
        }
      }
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
            var _cellSolid = _wgrid[_gy][_gx] === false;
            /* ═══ v2.3.2075: NEVER TRAP SOMEONE ALREADY INSIDE ═══
               The same rule the NPC branch above states and for the same
               reason, applied to the grid: if the player is ALREADY standing
               in a blocked cell then every candidate step is solid too, there
               is no direction out, and they are stuck for good.
               That is not hypothetical here. The World View's town wall
               (v2.3.2075) is new geometry drawn over ground that was open
               yesterday, so a character who logged out against the old wall
               art can load in inside the new band -- and a returning player
               frozen on the spot is a far worse bug than the one the wall
               fixes. Written for every zone rather than for this one: any mask
               that ever tightens has the same failure.
               A player OUTSIDE the geometry is blocked normally, so this
               cannot be used to walk through a wall -- only out of one. */
            /* S.player directly, NOT the `_pp` the NPC branch above sets:
               that one is only assigned inside `if (_npcs && _npcs.length)`,
               and the World View -- the zone this exists for -- has no NPCs at
               all, so it would be undefined in exactly the place it matters. */
            var _me = S.player;
            if (_cellSolid && _me) {
              var _pgx = Math.floor(_me.x * _gw / _mw);
              var _pgy = Math.floor(_me.y * _gh / _mh);
              if (_pgy >= 0 && _pgy < _gh && _pgx >= 0 && _pgx < _gw
                  && _wgrid[_pgy][_pgx] === false) return false;
            }
            return _cellSolid;
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
    /* ═══ v2.3.2078: QA probe — ASK THE GAME WHERE THE WALLS ARE ═══
       Owner, on the world map: "Can't walk through pinkish lines", and "make
       sure the player doesn't spawn on the line or outside of it".  Nothing
       could check either from outside: the walk mask is a JSON file a test
       can read, but whether the CLIENT agrees with it is a different claim,
       and it is the one that decides whether a player walks through a wall.
       This is the game's own answer, at any point, in world coordinates.
       Attached once per mount (this is the game-loop SETUP effect, not the
       tick), so it costs one property write. */
    if (typeof window !== 'undefined') window.__btIsSolid = (px, py) => isSolid(px, py);
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
        /* ═══ v2.3.1769: MOVEMENT IS PER SECOND, NOT PER FRAME ═══
           Owner, on desktop: "the player movement speed was way higher."
           It was — and not because it was desktop, but because it was a faster
           SCREEN.  Every step below was `P.x += dx * finalSpd` with no time
           term, so speed was literally proportional to refresh rate: a 144Hz
           monitor moved you 2.4x faster than the 60Hz these numbers were tuned
           on.  The same bug runs the other way on the primary platform — an
           iPhone dipping to 30fps moved you at HALF speed, which is part of
           what a frame dip has always felt like here.
           dtScale is the missing term, normalised so 60fps === 1 and every
           existing tuning number keeps exactly the meaning it has today.
           CLAMPED AT BOTH ENDS.  The ceiling (3 frames, 50ms) is what stops a
           tab-return or a GC stall from teleporting the player through a wall —
           collision is tested per step, so an unbounded step tunnels — and it
           keeps the step inside the worker's move cap.  The floor stops a zero
           or negative delta (first frame, clock skew) from freezing movement. */
        S._dtScale = Math.max(0.2, Math.min(3, (_perfDelta || 16.667) / 16.667));
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
        /* v2.3.1090: enlarge the logical viewport by WORLD_ZOOM so camera
           centring/clamping matches the zoomed-out render (renderFrame.js
           scales the world by 1/WORLD_ZOOM). Both must use the same W/H or
           the player drifts off-centre. */
        /* v2.3.1768b: capped by worldViewport(), so a bigger desktop box shows
           the SAME world scaled up rather than more of it.  Below the cap this
           returns exactly what these two lines used to compute. */
        var _wv = worldViewport(canvas);
        var W = _wv.W;
        var H = _wv.H;
        /* v2.3.1095: publish the logical world-viewport size so the projectile
           sim can tell when an arrow nears the visible screen edge (camera.x/y
           is the viewport's top-left in world coords). */
        S._viewW = W;
        S._viewH = H;
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
          pushDmgPopup(S, P.x, P.y - 50, 'YOU DIED', '#D95C54');
          if (_defGoldLost > 0) pushDmgPopup(S, P.x, P.y - 35, '-' + _defGoldLost + 'G', '#D95C54');
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
            P.x = TOWN_SPAWN.x;   /* v2.3.1777 */
            P.y = TOWN_SPAWN.y;
            P.vx = 0; P.vy = 0;
            S.respawnTimer = Date.now() + 3000;
            S._dying = false;
            S._deathStart = 0;
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.arrows = [];
            S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */ S.snowballBursts = []; /* v2.3.2217: and an undrained burst would pop in the new zone at old coords */
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
        /* Both spawn sites must agree, or the NPC survives the first town
           visit and vanishes on re-entry (zone transitions null S.npcs). */
        if (!S.npcs && S.currentZone === 'town') {
          S.npcs = _spawnTownNpcs();
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
        /* ═══ v2.3.1822: STUCK-DEAD WATCHDOG ═══
           Owner: "I died while I was on another tab and my character just got
           stuck there.  I had to wait for a monster to attack me again and
           die again while it was my active screen to respawn in town."

           `S._dying` is cleared by exactly one thing — a `player_respawned`
           from the worker — so any reason that message does not arrive is a
           permanent freeze rather than a hiccup.  The real cause is fixed at
           source (the worker now records an undelivered respawn and replays
           it on rejoin, v2.3.1822 index.js/join.js), but that fix only helps
           against a NEW worker and only when a rejoin actually happens.  This
           is the client's own floor: the worker's respawn timer is 5s, so
           being dead for 20s with the worker reporting us alive means the
           message was lost, not late.  Stand up in town, which is where the
           worker put us.

           Deliberately requires hp > 0 from the wire: while we are really
           dead the worker holds hp at 0 and echoes it, so this cannot fire
           during an honest death, however long the respawn takes. */
        if (S._dying && S._deathStart && (Date.now() - S._deathStart) > 20000
            && S.rpg && S.rpg.hp > 0) {
          try { applyLocalRespawn(S, 'town'); } catch (e) { S._dying = false; S._deathStart = 0; }
        }
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
          /* v2.3.1314: + Reflexes (Stamina-grid T2) on top of the
             Endurance stretch — the roll window IS the i-frame, so
             this directly buys survival frames.
             v2.3.1343 (kid-simple reprice): +2ms/pt, cap +200ms. */
          var _dodgeMs = 250 + Math.min(((S.rpg && S.rpg.endurance) || 0), 250)
            + Math.min(200, 2 * ((S.rpg && S.rpg.enduranceSpec && S.rpg.enduranceSpec.reflexes) || 0));
          /* v2.3.1534: publish the window the roll ACTUALLY got so the dodge
             sprite plays its 9 frames across exactly it (entityRenderer).
             Written here rather than at the three _dodgeRoll creation sites
             in game/dodge.js so the elastic formula stays in one place. */
          S._dodgeRoll.durMs = _dodgeMs;
          if (rollAge < _dodgeMs) {
            /* v2.3.1769: same frame-rate term as the walk step — a dodge is
               the player moving.  On a 144Hz screen it covered 2.4x the ground
               while its invulnerability window, which is timed in ms, did not
               stretch with it: the roll out-ran its own i-frames. */
            var _dodgeStep = 6 * (S._dtScale || 1);
            S.player.x += Math.cos(S._dodgeRoll.angle) * _dodgeStep;
            S.player.y += Math.sin(S._dodgeRoll.angle) * _dodgeStep;
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
        /* v2.3.1402 (owner: "stop the player speed increase in the frozen
           shore zone"): the ice slide applied its momentum ON TOP of normal
           movement (line ~3303 adds _slideVx after the base nx step), so at
           steady state the player moved ~2x speed on ice.  Disabled — frost
           now moves at normal speed.  (Re-enable as a NON-additive slide if
           the glide feel is ever wanted back without the speed gain.) */
        /* if (curZone?.element === 'frost') terrainSlide = 0.92; */
        if ((curZone === null || curZone === void 0 ? void 0 : curZone.element) === 'venom' && footTile === 0) terrainMult *= 0.85; /* swamp: heavy on grass */

        /* v2.3.224: frost-zone snow auto-collection removed.  The
           "snow" inventory key was a placeholder item with no thumb
           art and was retired alongside the Snowman build button. */

        /* Agility-based movement speed */
        /* v2.3.1154: + Swiftness channel (Endurance grid, cap +10%) --
           client-owned; stays under the worker's 500 px/s move bound. */
        var baseSpd = S.rpg ? calcMoveSpeed(S.rpg.agility || 0, (S.rpg.enduranceSpec || {}).swiftness || 0) / 5.0 * SPEED : SPEED;
        /* Food buff speed bonus.
           v2.3.2062: 1.15 is the COOKED-FOOD magnitude and stays the fallback;
           S._spdBuffMul carries a stronger buff's own number (the Swift
           Draught's 1.5). Bounded 1..2 to match the server's read in
           movement.js -- that bound is also what the anti-teleport cap is
           sized against, so a client that ran faster than it would be
           rejected and rubber-banded by the server. */
        var _sbm = Number(S._spdBuffMul);
        var spdBuff = S._spdBuff && Date.now() < S._spdBuff
          ? ((_sbm >= 1 && _sbm <= 2) ? _sbm : 1.15)
          : 1.0;
        /* Amulet move speed bonus */
        var amuletSpdMult = ((_S$rpg5 = S.rpg) === null || _S$rpg5 === void 0 || (_S$rpg5 = _S$rpg5._amuletBonus) === null || _S$rpg5 === void 0 ? void 0 : _S$rpg5.stat) === 'moveSpd' ? 1 + S.rpg._amuletBonus.value / 100 : 1.0;
        var swimMult = S._swimming ? SWIM_SPEED_MULT : 1.0;
        /* Shield up: half speed.  Trades mobility for the guard. */
        var shieldMult = S._shieldUp ? 0.5 : 1.0;
        /* v2.3.858: vista perspective -- on a distance-based playerScale zone
           (the Overlook), slow movement as the avatar shrinks toward the
           distance so a tiny speck on the trail also creeps like a far-off
           figure.  Full speed at the plateau centre, down to a 20% floor. */
        /* v2.3.1574: the curve itself now comes from data/zones.js
           (zonePlayerScale) instead of a third hand-copy of the same math —
           the copies had already drifted apart, and the remote harvest
           stand-ins were missing one entirely.
           VISTA_SPEED_BOOST (owner: "make the players in world view move 2x
           faster"): the depth illusion is worth keeping, but crossing the
           worldview at a 0.2 floor was a slog.  Doubling the whole curve
           keeps the near/far RATIO — so a distant figure still creeps
           relative to a near one — while halving the crossing time.
           v2.3.1674 (owner: "slow movement speed by 50% while in worldview"):
           back to 1.  This multiplies the WHOLE curve, so halving it halves
           the speed everywhere on the map while leaving the near/far ratio —
           the depth illusion the curve exists for — exactly as it was.
           Landing on 1 also means the vista no longer scales speed at all
           beyond its own depth curve, which is the same thing the pre-1574
           code did; the boost was the outlier, not this. */
        var VISTA_SPEED_BOOST = 1;
        var vistaSpeedMult = 1;
        var _vz = ZONES[S.currentZone];
        if (_vz && _vz.playerScale && typeof _vz.playerScale === 'object') {
          var _vnear = _vz.playerScale.near != null ? _vz.playerScale.near : 0.6;
          var _vsc = zonePlayerScale(S.currentZone, S.player.x, S.player.y, TILE);
          vistaSpeedMult = VISTA_SPEED_BOOST * Math.max(0.2, _vsc / _vnear);
        }
        var finalSpd = S._sled ? 0 : baseSpd * terrainMult * spdBuff * amuletSpdMult * swimMult * shieldMult * vistaSpeedMult; /* sled overrides movement */
        /* v2.3.1405: per-zone loading gate — while a zone's assets warm
           behind the loading overlay (zoneTransitions.js), freeze the
           player at the hub exit so the proximity trigger stays armed and
           the entry runs the instant the load resolves. */
        if (S._zoneLoading) finalSpd = 0;

        /* Auto-attack movement: 50% speed across the board while
           S.autoAttack is on. Backpedal flag still tracks "moving
           against aim direction" so the renderer can reverse the jog
           cycle and face the aim direction in that specific case. */
        /* v2.3.1500 (owner): "disable attacks while life skills animations are
           playing".  Held here as well as in swingAttack/specialAttack because
           this loop is what fires bow and staff shots — gating only the tap
           handlers would have left ranged builds shooting mid-chop. */
        if (S._extraction) S.autoAttack = false;
        S._backpedaling = false;
        if (S.autoAttack) {
          finalSpd *= 0.5;
          if (S._aimAngle != null && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
            var moveDotAim = dx * Math.cos(S._aimAngle) + dy * Math.sin(S._aimAngle);
            if (moveDotAim < 0) S._backpedaling = true;
          }
        }

        /* v2.3.1769: the frame-rate term.  Applied HERE, to the step, rather
           than folded into finalSpd above — finalSpd is also read by the ice
           slide's blend below, which is a RATIO between the drive and the
           carried velocity and would be wrong if scaled twice. */
        var _step = finalSpd * (S._dtScale || 1);
        var nx = P.x + dx * _step;
        var ny = P.y + dy * _step;

        /* Store velocity for facing/mirroring code */
        P.vx = dx * finalSpd;
        P.vy = dy * finalSpd;

        /* Ice slide momentum */
        if (terrainSlide > 0 && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
          if (!S._slideVx) S._slideVx = 0;
          if (!S._slideVy) S._slideVy = 0;
          /* v2.3.1769: ice is an EXPONENTIAL blend, so its frame-rate term is a
             POWER, not a multiply.  Retaining `terrainSlide` of the velocity
             once per frame means retaining terrainSlide^dt over dt frames —
             with a plain multiply, a 144Hz screen ran the decay 2.4x as often
             and the ice came out noticeably less slippery than the same zone
             on a phone. */
          var _slideR = Math.pow(terrainSlide, S._dtScale || 1);
          S._slideVx = S._slideVx * _slideR + dx * finalSpd * (1 - _slideR);
          S._slideVy = S._slideVy * _slideR + dy * finalSpd * (1 - _slideR);
        } else if (terrainSlide > 0) {
          var _slideR2 = Math.pow(terrainSlide, S._dtScale || 1);
          S._slideVx = (S._slideVx || 0) * _slideR2;
          S._slideVy = (S._slideVy || 0) * _slideR2;
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
            pushDmgPopup(S, P.x, P.y - 30, 'Resting... (3s)', '#a0a0ff');
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
              pushDmgPopup(S, P.x, P.y - 40, 'Fully Rested!', '#59BF91');
              pushDmgPopup(S, P.x, P.y - 25, '+10% XP for 30 min', '#D8A94D');
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
        /* v2.3.1110: per-archetype body centre + radius, fixed for the tall
           client-AI variants.  The old table gave fireGoblin/mummy/skeleton
           an 8 px disc at the FEET of a ~96 px sprite (offset 0) -- players
           slid straight through the torso, which read as "no collision".
           Offsets now match the chase/tap-lock tables in monsterCombat.js
           (fodder 40, fireGoblin 28, mummy/skeleton 48, snowman 19); the
           variant radius covers the visible torso without intruding on the
           45 px attack ring. */
        var _monBody = function (_m) {
          var _arch = _m.archetype || _m.type;
          var _off = _arch === 'fodder' ? 40
            : _arch === 'snowman' ? 19
            : _arch === 'fireGoblin' ? 28
            : _arch === 'mummy' ? 48
            : _arch === 'skeleton' ? 60   /* v2.3.2229: 1.25x with the sprite */
            : 0;
          var _r = _arch === 'snowman' ? 13
            : _arch === 'fodder' ? 8
            : MONSTER_VARIANTS[_arch] ? 14
            : 32;
          return { by: _m.y - _off, r: _r };
        };
        var _monBlock = function (curX, curY, px, py) {
          var ms = S.monsters;
          if (!ms) return false;
          for (var _mi = 0; _mi < ms.length; _mi++) {
            var _m = ms[_mi];
            if (!_m || !_m.alive) continue;
            var _b = _monBody(_m);
            var _rr = _b.r + hs;
            var _ndx = px - _m.x, _ndy = py - _b.by;
            var _nd2 = _ndx * _ndx + _ndy * _ndy;
            if (_nd2 < _rr * _rr) {
              var _cdx = curX - _m.x, _cdy = curY - _b.by;
              if (_nd2 < _cdx * _cdx + _cdy * _cdy) return true; /* moving deeper in */
            }
          }
          return false;
        };
        /* v2.3.1500: resources are solid, same shape of rule as _monBlock --
           per-axis so you slide around them, and only blocking motion that
           goes DEEPER in, so a node that spawns (or grows a tier) on top of
           you can always be walked back out of. */
        var _nodeBlock = function (curX, curY, px, py) {
          var ns = S.gatherNodes;
          if (!ns) return false;
          for (var _ni = 0; _ni < ns.length; _ni++) {
            var _e = nodeBlockEllipse(S, ns[_ni]);
            if (!_e) continue;
            var _rx = _e.rx + hs, _ry = _e.ry + hs;
            var _ex = (px - _e.x) / _rx, _ey = (py - _e.y) / _ry;
            var _d2 = _ex * _ex + _ey * _ey;
            if (_d2 < 1) {
              var _cx = (curX - _e.x) / _rx, _cy = (curY - _e.y) / _ry;
              if (_d2 < _cx * _cx + _cy * _cy) return true;
            }
          }
          return false;
        };
        if (!isSolid(nx - hs, P.y - hs) && !isSolid(nx + hs, P.y - hs) && !isSolid(nx - hs, P.y + hs) && !isSolid(nx + hs, P.y + hs) && !_monBlock(P.x, P.y, nx, P.y) && !_nodeBlock(P.x, P.y, nx, P.y)) P.x = nx;
        if (!isSolid(P.x - hs, ny - hs) && !isSolid(P.x + hs, ny - hs) && !isSolid(P.x - hs, ny + hs) && !isSolid(P.x + hs, ny + hs) && !_monBlock(P.x, P.y, P.x, ny) && !_nodeBlock(P.x, P.y, P.x, ny)) P.y = ny;
        /* Apply ice slide */
        if (S._slideVx || S._slideVy) {
          /* v2.3.1769: _slideVx is a velocity in px per 60fps-frame (it is
             blended from finalSpd, which is), so applying it once per frame
             slid you further on a faster screen exactly as walking did. */
          var _slideDt = S._dtScale || 1;
          var sx = P.x + (S._slideVx || 0) * _slideDt,
            sy = P.y + (S._slideVy || 0) * _slideDt;
          if (!isSolid(sx - hs, P.y - hs) && !isSolid(sx + hs, P.y + hs) && !_monBlock(P.x, P.y, sx, P.y) && !_nodeBlock(P.x, P.y, sx, P.y)) P.x = sx;
          if (!isSolid(P.x - hs, sy - hs) && !isSolid(P.x + hs, sy + hs) && !_monBlock(P.x, P.y, P.x, sy) && !_nodeBlock(P.x, P.y, P.x, sy)) P.y = sy;
        }
        /* v2.3.1110: PUSH-OUT -- _monBlock only stops the player moving
           deeper; a server-driven monster can still walk INTO the player
           (its movement is worker-side and has no player collision).  When
           a monster body overlaps the player, nudge the player outward a
           couple of px per frame (tile-collision permitting) so the two
           bodies separate instead of coexisting.  Gentle on purpose: reads
           as being shouldered aside, and stays far under the server's
           anti-teleport allowance. */
        if (S.monsters) {
          for (var _pmi = 0; _pmi < S.monsters.length; _pmi++) {
            var _pm = S.monsters[_pmi];
            if (!_pm || !_pm.alive) continue;
            var _pb = _monBody(_pm);
            var _pdx = P.x - _pm.x, _pdy = P.y - _pb.by;
            var _pd2 = _pdx * _pdx + _pdy * _pdy;
            var _prr = _pb.r + hs;
            if (_pd2 > 0.01 && _pd2 < _prr * _prr) {
              var _pd = Math.sqrt(_pd2);
              var _pushX = P.x + (_pdx / _pd) * 2;
              var _pushY = P.y + (_pdy / _pd) * 2;
              if (!isSolid(_pushX - hs, P.y - hs) && !isSolid(_pushX + hs, P.y + hs)) P.x = _pushX;
              if (!isSolid(P.x - hs, _pushY - hs) && !isSolid(P.x + hs, _pushY + hs)) P.y = _pushY;
              break; /* one shove per frame is enough */
            }
          }
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

        /* ═══ v2.3.1778: THE ENTRANCES ARE BACK, BECAUSE THE ART SHIPPED ═══
           v2.3.823 removed them: "the town buildings have no in-game art yet,
           so their Enter X proximity prompts were floating over empty painted
           ground", and left the instruction "Restore the BUILDINGS proximity
           scan here when building art ships."  It has — the owner supplied a
           forge, a bank, an enchanter and a general store, and they are placed
           in worldProps.js.

           The scan is driven off the PROPS, not off TOWN_BUILDINGS: the props
           are where the buildings actually stand and are drawn, while the
           TOWN_BUILDINGS rectangles are rescaled leftovers from the old tile
           village and are what put the prompts on bare ground in the first
           place.  BUILDINGS still supplies the action, the label, the icon and
           the quest-unlock gate — matched by action, so the two tables cannot
           drift into pointing at different doors.

           NOTE this restores access to panels that have been UNREACHABLE for
           the whole time the prompt was off: forge, bank, enchanter and the
           vendor shop. */
        var pTileX = Math.floor(P.x / TILE);
        var pTileY = Math.floor(P.y / TILE);
        S.nearBuilding = null;
        var _doorProp = buildingPropNear(S.currentZone, P.x, P.y, 95);
        if (_doorProp) {
          var _bIdx = BUILDINGS.findIndex(function (b) {
            return (b.action || b.id) === _doorProp.action;
          });
          if (_bIdx >= 0) S.nearBuilding = _bIdx;
        }

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
        /* v2.3.1448 (owner: "only when a user touches the resource on
           screen does the resource extraction menu pop up"): being NEAR
           a resource no longer opens the shell.  This scan now publishes
           S._proxNode — the closest resource actually within reach —
           which the desktop E key uses; the shell renders from
           S._nearNode, and only a TAP on the resource sets that (see
           _tapResourceAt).  The tapped node is held until it's harvested
           out, respawn-pending, or the player walks out of reach.
           v2.3.853: a lit campfire counts as a node here (Cook). */
        S._proxNode = null;
        var closestDist = Infinity;
        if (S.gatherNodes) {
          S.gatherNodes.forEach(function (n) {
            if (!n.alive || n.respawnAt && Date.now() < n.respawnAt) return;
            var nd = nodeReachDist(S, n);
            if (nd != null && nd < closestDist) { closestDist = nd; S._proxNode = n; }
          });
        }
        if (S._campfire && S._campfire.alive) {
          var _cfd = nodeReachDist(S, S._campfire);
          if (_cfd != null && _cfd < closestDist) { closestDist = _cfd; S._proxNode = S._campfire; }
        }
        /* ═══ v2.3.2245: DETECTED BY PERIMETER ═══
           Owner: "No resource extraction button in the middle of the screen
           or needing to tap on the resource ... Resource extraction will be
           detected by perimeter and contextual button will be tapped to
           begin harvest."  So S._nearNode -- what the E key and the button
           offer -- is the closest resource in reach again (S._proxNode),
           gated on owning the tool for it; the v2.3.1448 tap latch
           (_tapNode), the mid-screen shell and its per-frame re-anchoring
           are gone.  Hidden while a harvest is live, as before: you are
           already doing the thing it offers. */
        {
          var _pn = S._proxNode || null;
          if (_pn && _pn !== S._campfire && _pn.nodeType && !hasGatherTool(S.rpg, _pn.nodeType)) _pn = null;
          S._nearNode = S._extraction ? null : _pn;
        }
        if (S._nearNode !== promptNodeRef.current) {
          promptNodeRef.current = S._nearNode;
          setPromptNode(S._nearNode);
        }
        /* ═══ v2.3.2245: THE BUTTON'S FACE, STAMPED PER FRAME ═══
           The right button is contextual: ATTACK with a monster in the
           perimeter (or nothing at all), HARVEST with a resource in reach and
           no monster (control-redesign.md §5.10: Attack wins), and during a
           harvest the owner's gesture cue -- the painted tool strip playing
           at the thumb's own phase, a ring counting the wind-up down and then
           filling with reps.  Imperative DOM writes rather than React state
           because these change every frame while the loop already runs. */
        {
          var _lbl = rLabelRef.current, _cue = rCueRef.current, _ring = rRingRef.current;
          var _ex = S._extraction;
          var _cands = S._targetCands || [];
          /* Priority (control-redesign.md §5.10, revised while building):
             a resource IN REACH beats a monster merely IN THE PERIMETER --
             standing at a node is a deliberate act, and monsters leave a
             harvester alone by rule (v2.3.1704); a HELD LOCK beats the
             node, because a lock is the more deliberate act of the two
             (tap the monster, or press Attack once before stepping up to
             the node).  The first cut let any monster within 220px win,
             and a snowman on the far side of a tree turned every chop
             into a swing. */
          var _lockHeld = !!(S.lockedTarget && S.lockedTarget.ref);
          var _harvestCtx = !!(S._nearNode && !_lockHeld);
          S._btnHarvest = _harvestCtx;
          if (_lbl) {
            var _want;
            if (_ex) _want = (_ex.status === 'ready') ? ({ mining: 'PUMP', woodcutting: 'CHOP', fishing: 'REEL', cooking: 'FLIP' }[_ex.skill] || 'GO') : 'WAIT';
            else if (_harvestCtx) _want = 'HARVEST';
            else _want = 'ATTACK';
            if (_lbl.textContent !== _want) _lbl.textContent = _want;
          }
          if (_cue) {
            if (_ex && _ex.status === 'ready' && GESTURE_TOOL_URLS[_ex.skill]) {
              var _url = 'url(' + GESTURE_TOOL_URLS[_ex.skill] + ')';
              if (_cue.style.backgroundImage !== _url) _cue.style.backgroundImage = _url;
              /* The strip is 8 cells across; background-size 800% puts one
                 cell in the box and position N*100/7 % selects cell N. */
              var _f01 = Math.max(0, Math.min(0.9999, _ex.cueFrame01 || 0));
              var _cell = (_ex.skill === 'mining' || _ex.skill === 'woodcutting') ? Math.min(3, Math.floor(_f01 * 4)) : Math.floor(_f01 * 8);
              var _pos = (_cell * 100 / 7).toFixed(2) + '% 0%';
              if (_cue.style.backgroundPosition !== _pos) _cue.style.backgroundPosition = _pos;
              if (_cue.style.display !== 'block') _cue.style.display = 'block';
            } else if (_cue.style.display !== 'none') _cue.style.display = 'none';
          }
          if (_ring) {
            if (_ex) {
              var _c = _ring.firstChild;
              var _frac, _col;
              if (_ex.status === 'ready') { _frac = Math.max(0, Math.min(1, _ex.progress || 0)); _col = 'rgba(89,191,145,.95)'; }
              else { var _span = Math.max(1, (_ex.windowOpensAt || 0) - (_ex.startedAt || 0)); _frac = Math.max(0, Math.min(1, (Date.now() - (_ex.startedAt || 0)) / _span)); _col = 'rgba(216,168,95,.55)'; }
              /* r = 40% of the box: circumference in the SVG's own units --
                 the box is square, so a percentage radius resolves against
                 its width; stamp the dash as a fraction of 2*pi*r in px. */
              var _rpx = (_ring.clientWidth || 96) * 0.4;
              var _circ = 2 * Math.PI * _rpx;
              if (_c) {
                var _dash = (_circ * _frac).toFixed(1) + ' 9999';
                if (_c.getAttribute('stroke-dasharray') !== _dash) _c.setAttribute('stroke-dasharray', _dash);
                if (_c.getAttribute('stroke') !== _col) _c.setAttribute('stroke', _col);
              }
              if (_ring.style.display !== 'block') _ring.style.display = 'block';
            } else if (_ring.style.display !== 'none') _ring.style.display = 'none';
          }
        }

        /* v2.3.853: firemaking → campfire lifecycle.  Firemaking is a one-shot
           animation (set when a log is lit from the Bag); when it finishes,
           light a campfire at the player.  Campfires burn out after ~45s. */
        if (S._firemaking && Date.now() >= S._firemaking.doneAt) {
          var _fm = S._firemaking;
          S._firemaking = null;
          S._campfire = {
            x: _fm.x, y: _fm.y, nodeType: 'campfire', alive: true,
            /* ═══ v2.3.1748: THE FIRE REMEMBERS WHERE IT WAS LIT ═══
               Owner: "we made a fire in the frost zone level and it appeared
               in worldview too even when we didn't make one there."
               A campfire is a client-local prop with no server state, so it
               cannot have come from the other player — it was THIS player's
               own fire following them through the exit.  Nothing recorded a
               zone on it, the renderer never asked, and no zone-change path
               cleared it, so for the rest of its 45s it redrew at the same
               absolute world coordinates on whatever map you walked onto.
               Not merely cosmetic: it stays in the tap-hit list and the
               proximity prompt, so you could cook in the World View on a fire
               lit in Frost Ridge. */
            zone: S.currentZone,
            litAt: Date.now(), expiresAt: Date.now() + 45000,
            name: 'Campfire', spotName: 'Campfire', gatherLvl: 1, skill: 'cooking', emoji: '🔥',
          };
          try { BT_AUDIO.beep(360, 0.05, 0.12, 'sawtooth'); } catch (e) {}
          /* ═══ v2.3.1753: AND TELL THE OTHER PLAYERS ═══
             Owner: "yes make both peers see a campfire."
             Until now a campfire existed only on the client that lit it, so a
             watcher saw someone crouch, stand up, and then cook over bare
             ground — which is most of what "cooking looked wrong" was.
             This needs NO server change: `type:'broadcast'` already has a
             channelShim passthrough (wsClient.js) and the worker relays
             unknown events room-wide by design, which is the same path
             player_swing / player_dodge / emote already take.  It is
             therefore NOT a privileged event — clients legitimately emit it,
             exactly like a swing.
             Zone rides along in the payload because the relay is room-wide;
             the receiver drops anything from another zone (gameEvents), the
             same rule v2.3.1748 had to add for four other effects. */
          try {
            if (S.channel) S.channel.send({ type: 'broadcast', event: 'campfire_lit', payload: {
              id: S.myId, x: _fm.x, y: _fm.y, zone: S.currentZone, expiresAt: S._campfire.expiresAt,
            } });
          } catch (e) {}
        }
        /* v2.3.1431 (owner: "the minnow isn't getting cooked"): the fire
           must NOT burn out mid-cook.  Since v2.3.1416 the cook window
           holds until the flip (no timeout), so a leisurely cook easily
           outlived the flat 45s fuse — the campfire died under the pan
           and the extraction silently cancelled (flip did nothing).
           While a cooking attempt is active, keep pushing the fuse
           ~15s ahead; it starts burning down only once the cook ends,
           leaving time to start the next one. */
        if (S._campfire && S._extraction && S._extraction.skill === 'cooking') {
          var _cfKeepAlive = Date.now() + 15000;
          if (S._campfire.expiresAt < _cfKeepAlive) S._campfire.expiresAt = _cfKeepAlive;
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
            /* v2.3.843: the walk-away cancel radius must be at least the
               range the prompt let you START from, or chopping/fishing
               self-cancels on the very next tick (owner: "the button does
               nothing").
               v2.3.1450: so it now asks the reach test ITSELF, with a
               slack ring on top, instead of re-deriving a second radius
               that could drift out of step with it.  This is what keeps
               the perimeter-based reach safe: a chop started while
               standing on the canopy stays alive there. */
            /* v2.3.1500 (owner): "disable whatever lifeskill animation is
               happening when the player tries to walk away — this should
               cancel it".  Cancels on the INPUT, not on the distance: the
               radius check below only fired once you had actually travelled
               EXTRACT_CANCEL_R, so pushing the stick left you jogging on the
               spot mid-swing until you cleared it.  Threshold rather than
               >0 because the value is joystick strength, which ramps from 0
               at the edge of the 12px deadzone — a resting thumb must not
               abort a harvest.  Both cancels stay: this one for deliberate
               movement, the radius one for anything else that displaces you
               (knockback, a dodge roll, a server correction). */
            if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
              S._extraction = null;
            } else if (nodeReachDist(S, _exNode, EXTRACT_CANCEL_R) == null) {
              /* Walk-away cancel — no XP, no node damage, no popup. */
              S._extraction = null;
            } else if (_ex.status === 'waiting' && _exNow >= _ex.windowOpensAt) {
              _ex.status = 'ready';
              try { BT_AUDIO.beep(820, 0.04, 0.05, 'sine'); } catch (e) {}
            }
            /* v2.3.1416 (owner: "all resources NOT have a time out window
               — it'll just stay on the phase where the resource can be
               harvested; moving away etc cancels it").  The 'ready ->
               windowClosesAt' expiry branch is GONE: no "Fish escaped" /
               "Missed" node depletion, no cooking burn-by-timer.  The
               ready phase (and the character's harvesting animation, which
               loops from the cue renderer) holds until the gesture
               completes or one of the real cancels fires — walk-away
               above, node death/zone change, or starting a different
               extraction.  windowOpensAt (the wind-up) is unchanged; the
               server's late-strike coercion is relaxed in lockstep
               (gathering.js). */
          }
        }

        /* §KB — Detect nearest interactable NPC (for E-key on desktop) */
        S._nearNpc = null;
        if (S.npcs && S.currentZone === 'town') {
          /* v2.3.1717: 60 -> 90.  A judge on a fresh character could not talk
             to Mayor Bro at all.  Measured: E works at 55px and dies by 65,
             which is under two tiles -- standing what LOOKS like next to him
             was out of range, and the refusal is silent, so it reads as a
             broken NPC rather than "step closer".  90 is ~2.8 tiles, still
             well inside the 110px latch-release radius so the open/close
             hysteresis is unchanged. */
          var closestNpcDist = 90;
          S.npcs.forEach(function (npc) {
            if (!npc.alive) return;
            var nd = Math.sqrt(Math.pow(npc.x - P.x, 2) + Math.pow(npc.y - P.y, 2));
            if (nd < closestNpcDist) {
              closestNpcDist = nd;
              S._nearNpc = npc;
            }
          });
        }

        /* ═══ v2.3.1701: QUEST GIVERS OPEN ON PROXIMITY ═══
           Owner: "make the quest dialog with mayor bro pop up when you get in
           close proximity to him instead of needing to tap him it's finicky
           right now needing to tap him."  Landing a thumb on a 30px NPC while
           the camera moves is the finicky part; walking up to him is not.

           The tap path is UNCHANGED and still works — this is an addition.

           NOTE THE DELIBERATE CONTRAST WITH RESOURCE NODES: those are
           tap-only ON PURPOSE (v2.3.1448, owner: "only when a user touches
           the resource on screen does the resource extraction menu pop up"),
           which is why S._nearNode is fed from S._tapNode and not from
           proximity.  This changes quest-giver NPCs only.

           THE LATCH is the whole design.  Opening on "is he near" alone
           re-opens the dialogue on the very next frame after it is dismissed,
           so the player can never walk away from him — the panel becomes a
           trap rather than a convenience.  So: open ONCE on approach, then
           hold the latch (S._npcProxLatch) until the player has left a LARGER
           radius.  Hysteresis, not one radius: a single threshold flickers
           for anyone standing on the boundary.  Both the TAP and the E-key
           paths arm the same latch, so closing a dialogue you opened yourself
           does not immediately get one back either.

           Radii from his on-screen footprint: the tap target is 30px and
           TILE is 32, so OPEN is ~1.75 tiles (you are standing with him) and
           CLEAR ~3.4 tiles (you have plainly walked off). */
        {
          /* ═══ v2.3.1884: THE LATCH HOLDS A SITUATION, NOT JUST AN NPC ═══
             Owner: "Walking up to claim the quest reward after completing
             'into the blue' doesn't pop up automatically when walking close
             to mayor bro.  Make it so that it does."

             Three readings of that were possible, so all three were MEASURED
             before anything changed (mp-questclaim), and only one was broken:
               A. approaching him with a claimable reward  — already worked
               B. the same, after a zone round trip        — already worked
               C. the reward becoming claimable while you
                  are already standing next to him         — BROKEN

             (C) is the fix.  The latch held the NPC and nothing else, so once
             it had shown you anything about Mayor Bro it stayed armed until
             you left a 110px radius.  "You have already seen this NPC" is not
             the same claim as "you have already seen this NEWS", and a quest
             turning claimable is new news.  It now holds { npc, ready } and
             releases on ONE transition: not-ready -> ready.

             ONE transition, not any change, and THAT IS LOAD-BEARING.  The
             first cut of this released on any change of quest/status, which
             also fires on active -> turnedIn -> next quest offered — so
             handing in a quest while stood on him re-opened the panel with
             the next offer the instant you closed it.  That is the v2.3.1701
             trap wearing a different hat, and mp-questline caught it: three of
             its equip assertions failed because the re-opened dialogue was
             sitting over the gear it was trying to tap.  Ready is the only
             news the player is standing there FOR.

             What this deliberately does NOT do is re-open a claim you
             dismissed while standing still.  That is the frame-after-frame
             re-open the latch exists to prevent, and mp-questprox asserts it.
             Recovering a dismissed panel is a step out and back, which the
             90px release below makes cheap.

             NPC_PROX_CLEAR 110 -> 90.  Not a new number: 90 is the radius
             _nearNpc already uses to decide who you are standing next to
             (raised from 60 at v2.3.1717 for this same family of complaint),
             so the latch now lets go at the same distance the game stops
             considering him nearby.  56 open / 90 release still leaves ~1
             tile of hysteresis, so nobody on the boundary flickers. */
          /* ═══ v2.3.1886: WALKING UP TO HIM MEANS 90px, NOT 56 ═══
             Owner: "Created a new character and first quest didn't trigger by
             walking up to mayor bro.  It should activate by proximity."

             Measured before changing anything, by sweeping the distance: the
             dialogue opened at 40 and 56px and was DEAD from 64px out.  A hard
             cliff at 56 — under two tiles, TILE being 32.

             This is v2.3.1717's incident, in the one place that pass did not
             reach.  That note reads: "A judge on a fresh character could not
             talk to Mayor Bro at all.  Measured: E works at 55px and dies by
             65, which is under two tiles — standing what LOOKS like next to
             him was out of range, and the refusal is silent, so it reads as a
             broken NPC rather than 'step closer'."  It raised the DETECTION
             radius 60 -> 90 and stopped there; the proximity opener, added
             later at v2.3.1701, wrote its own 56 and inherited the bug.  So a
             player standing 60-90px away — close enough that the game calls
             Mayor Bro their nearest NPC, close enough for the tap and the
             E-key to work — got nothing from walking up.  Silently, again.

             90 is not a new number: it is exactly _nearNpc's radius, so "he
             is the NPC you are standing with" and "walking up to him opens
             his quest" are now the same statement rather than two thresholds
             that can drift apart.  That is what stops this recurring a third
             time.

             CLEAR 90 -> 125 to keep the hysteresis: it must exceed OPEN or
             anyone on the boundary flickers, and 35px (~1 tile) is the same
             margin the old 56/90 pair had.  This does cost some of what
             v2.3.1884 bought — recovering a panel you dismissed is a longer
             step now — but an opener that does not fire when you walk up is
             the worse failure of the two, and it is the one that was
             reported. */
          var NPC_PROX_OPEN = 90, NPC_PROX_CLEAR = 125;
          var _px = S.player ? S.player.x : 0, _py = S.player ? S.player.y : 0;
          var _latched = S._npcProxLatch || null;
          var _pn = S._nearNpc;
          /* Resolved BEFORE the latch check so the latch can be compared
             against it.  One small table walk per frame. */
          var _pq = (_pn && S.currentZone === 'town') ? getNpcQuest(S.rpg, _pn.name) : null;
          var _pqReady = _npcQuestReady(S, _pq);
          if (_latched) {
            var _ld = Math.sqrt(Math.pow(_latched.npc.x - _px, 2) + Math.pow(_latched.npc.y - _py, 2));
            /* Released by walking away, by anything that ends this visit to
               town (zone change nulls S.npcs), or by the quest becoming
               claimable under your feet. */
            if (!S.npcs || S.currentZone !== 'town' || _ld > NPC_PROX_CLEAR
              || (_pn === _latched.npc && _pqReady && !_latched.ready)) S._npcProxLatch = null;
          }
          if (_pn && !S._npcProxLatch && S.currentZone === 'town') {
            var _pd = Math.sqrt(Math.pow(_pn.x - _px, 2) + Math.pow(_pn.y - _py, 2));
            /* Every gate that means "not now": something else is on screen,
               mid-extraction, behind the per-zone loading overlay, or dead. */
            var _pOk = _pd <= NPC_PROX_OPEN && !S._uiBusy && !S._extraction && !S._zoneLoading
              && !S._dying && !(S.rpg && typeof S.rpg.hp === 'number' && S.rpg.hp <= 0)
              /* the bottom sheet counts as an open panel — the nav rail's
                 destinations render over the world just like the modals do. */
              && dashboardPanelBus.state.mode === 'bar';
            if (_pOk && _pq) {
              S._npcProxLatch = { npc: _pn, ready: _pqReady };
              setQuestPanel({ npc: _pn.name, quest: _pq.quest, status: _pq.status, npcRef: _pn });
            } else if (_pOk && _pn.shop && !shopBus.open) {
              /* v2.3.2050: walking up to a shopkeeper opens his window, the
                 same proximity gate a quest giver uses -- _pOk already means
                 "close enough, not in combat, nothing else open". The latch is
                 what stops it reopening every frame after you close it while
                 still standing next to him. */
              S._npcProxLatch = { npc: _pn, ready: false };
              shopBus.setOpen(true);
            }
          }
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
                  /* v2.3.1200: server-authoritative vacuum.  The self-
                     credit below was pure theatre for worker-owned
                     piles — the player_state echo stomped every coin
                     the pet "collected".  When the worker advertises
                     caps.petLoot, request the pickup through the SAME
                     loot_pickup path as a manual grab (viaPet widens
                     the server's range gate to the pet vacuum radius);
                     the loot_credit reply grants + despawns.  Gated on
                     the cap per deploy-order rules: an old worker
                     would out-of-range-reject the wide pickup, so
                     against one the legacy self-credit path below
                     stays (harmless — stomped, as ever). */
                  if (loot._serverLoot && loot.lootId && S._serverCaps && S._serverCaps.petLoot) {
                    if (loot._collected) return true; /* credit landed; despawn timer runs */
                    /* Recipient gate mirrors groundLoot.js — don't spam
                       the worker with not-recipient rejections for
                       piles the pet could never claim. */
                    var _petFFA = loot.isDeathDrop && loot.ownerOnlyUntil && Date.now() > loot.ownerOnlyUntil;
                    if (!_petFFA && loot.recipients && !loot.recipients.includes(S.myId)) return true;
                    /* Shares _pickupPending with the manual walk-over
                       path (groundLoot.js) so pet + player never
                       double-send for one pile; same 5 s watchdog
                       clears a lost request. */
                    if (loot._pickupPending && loot._pickupSentAt && Date.now() - loot._pickupSentAt > 5000) {
                      loot._pickupPending = false;
                    }
                    if (!loot._pickupPending) {
                      loot._pickupPending = true;
                      loot._pickupSentAt = Date.now();
                      if (S.channel) {
                        try { S.channel.send({ type: 'loot_pickup', payload: { lootId: loot.lootId, zone: S.currentZone, viaPet: true } }); } catch (e) {}
                      }
                    }
                    return true; /* keep pile until the loot_credit despawns it */
                  }
                  /* Pet picks up the loot! (v2.3.1200: this local
                     self-credit path now only runs for client-local
                     piles or against old workers without caps.petLoot
                     — the deploy-order fallback.) */
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
                        /* ═══ v2.3.2123: THE ONE IT REPLACES IS SOLD, NOT BINNED ═══
                           The push was guarded and the assignment below was
                           not, so a pet upgrade at a full stash deleted the
                           weapon you were holding.  The WORSE-drop branch
                           immediately below has always auto-sold at the cap
                           ("dropping value on the floor is worse than a forced
                           sale", index.js) -- this branch is the same trade
                           seen from the other side, and it simply never got
                           the same treatment.  So: keep the upgrade, sell the
                           old one, say so.  See Alix's "just lost my magic
                           stick" and mp-weaponloss. */
                        if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) {
                          S.rpg.weaponStash.push(_objectSpread({}, current));
                        } else {
                          S.rpg.coins += Math.ceil(curPower * 0.5);
                          pushDmgPopup(S, S._petX, S._petY - 30, 'BAG FULL -> sold ' + current.name, '#D8A94D');
                        }
                      }
                      if (isRanged) S.rpg.rangedWeapon = drop;else S.rpg.weapon = drop;
                      pushDmgPopup(S, S._petX, S._petY - 15, 'PET -> ' + drop.name, loot.tierColor || '#fff');
                    } else {
                      if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                      if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) {
                        S.rpg.weaponStash.push(drop);
                        pushDmgPopup(S, S._petX, S._petY - 15, 'PET -> ' + drop.name, '#B9C1BF');
                      } else {
                        S.rpg.coins += Math.ceil(dropPower * 0.5);
                        pushDmgPopup(S, S._petX, S._petY - 15, 'PET -> sold', '#D8A94D');
                      }
                    }
                  } else {
                    S.rpg.coins += loot.coins || 0;
                    pushHudPopup(S, { target: 'goldIcon', text: '+' + (loot.coins || 0) + ' G', color: '#D8A94D' });
                  }
                  /* Pet hands the elemental shard over too -- otherwise
                     auto-looted piles silently lose the shard since this
                     branch removes the loot entry (return false below). */
                  if (loot.shard && S.rpg.inventory) {
                    S.rpg.inventory[loot.shard] = (S.rpg.inventory[loot.shard] || 0) + 1;
                    var _petShard = shardByKey(loot.shard);
                    pushDmgPopup(S, S._petX, S._petY - 28, pet.emoji + ' + ' + (_petShard ? _petShard.label : 'Shard'), (_petShard && _petShard.color) || '#cce6ff');
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
                var pDmgBase = S.rpg ? calcWeaponDmg((activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.type) || 'greatsword', S.rpg || {}, (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.tierMult) || 1, activeWpn) : 5;
                var petDmg = Math.max(1, Math.ceil(pDmgBase * 0.15 * (1 + petLvl * 0.02)));
                nearestM.curHp -= petDmg;
                S._petAtkCd = Date.now() + 1500; /* pet attacks every 1.5s */
                /* Visual feedback — small damage number from pet */
                pushDmgPopup(S, nearestM.x, monsterPopupY(nearestM, -10), pet.emoji + ' -' + petDmg, pet.color || '#59BF91');
                /* Pet attack particles */
                for (var pp = 0; pp < 3; pp++) {
                  S.hitParticles.push({
                    x: nearestM.x + (Math.random() - 0.5) * 8,
                    y: nearestM.y + (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1 - Math.random(),
                    life: 0.3,
                    color: pet.color || '#59BF91',
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

            /* v2.3.1771: THE TOWN RUNS AT A FRAME RATE.  Every NPC step below
               was per frame and every NPC timer counted down by a hard-coded
               16.7ms per frame — one 60Hz frame, assumed.  On a 144Hz monitor
               the town's NPCs walked 2.4x faster, re-picked wander targets
               2.4x sooner and chattered 2.4x more often than the same town on
               a phone.  This is part of what the owner meant by desktop being
               "COMPLETELY different"; the whole NPC body is scaled by dt. */
            var _npcDt = S._dtScale || 1;
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
                npc.x += fDx / fDist * 1.5 * _npcDt;
                npc.y += fDy / fDist * 1.5 * _npcDt;
                if (Math.abs(fDx) > Math.abs(fDy)) npc._facing = fDx > 0 ? 'right' : 'left';else npc._facing = fDy > 0 ? 'down' : 'up';
              } else if (distToPlayer < 30) {
                /* Too close — back off slightly */
                var bDx = npc.x - P.x,
                  bDy = npc.y - P.y;
                var bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
                npc.x += bDx / bDist * 0.5 * _npcDt;
                npc.y += bDy / bDist * 0.5 * _npcDt;
              }
              /* Quest-relevant chat — comment on progress */
              npc.chatTimer -= 16.7 * _npcDt;
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
              npc.moveTimer -= 16.7 * _npcDt;
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
                npc.x += nDx / nDist * 0.8 * _npcDt;
                npc.y += nDy / nDist * 0.8 * _npcDt;
                if (Math.abs(nDx) > Math.abs(nDy)) npc._facing = nDx > 0 ? 'right' : 'left';else npc._facing = nDy > 0 ? 'down' : 'up';
              }
              /* Random chat */
              npc.chatTimer -= 16.7 * _npcDt;
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
            /* v2.3.1771: same exponential-approach shape as the camera and
               the monster interpolator — 12% of the gap per 60Hz frame. */
            var _npcLerp = 1 - Math.pow(0.88, _npcDt);
            npc.renderX += (npc.x - npc.renderX) * _npcLerp;
            npc.renderY += (npc.y - npc.renderY) * _npcLerp;
            if (npc.chatBubble && Date.now() - npc.chatBubble.ts > 5000) npc.chatBubble = null;

            /* Quest marker above the NPC's head.
               v2.3.1669 (owner): THREE states, not two.
                 ❗ a quest is waiting to be taken
                 ❓ you are carrying one you can now turn in
                 ✅ everything this NPC has is done
               getNpcQuest returns null once every quest of theirs is
               turnedIn, which is exactly why the all-done state was
               previously unreachable: the old code only looked INSIDE
               `if (npcQuest)`.  The renderer already tints any non-❗
               glyph green, so no renderer change is needed.
               quest.check() runs arbitrary predicate code against live
               state — questModel wraps it in try/catch and this site did
               not, so one bad predicate would kill the whole NPC loop
               mid-frame. */
            npc._questMarker = null;
            if (!npcQuest) {
              /* v2.3.1773: ...only if they HAD any.  getNpcQuest returns null
                 both when every quest of theirs is turned in and when they
                 have no chain at all, and this branch read the second as the
                 first — so the blacksmith, who is townsfolk and gives no
                 quests, stood by the fountain wearing the green all-done tick.
                 A tick you were never owed is worse than no tick: it says
                 "nothing more here" about a character you have never spoken
                 to. */
              if (npcHasQuestChain(npc.name)) npc._questMarker = '✅';
            } else if (npcQuest.status === 'available') {
              npc._questMarker = '❗';
            } else if (npcQuest.status === 'active') {
              var _qReady = false;
              try { _qReady = !!(npcQuest.quest.check && npcQuest.quest.check(S.rpg, S)); } catch (_e) { _qReady = false; }
              if (_qReady) npc._questMarker = '❓';
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
            /* v2.3.1155: restoration mult deleted with the stat (was
               ×1.0 for every live player since v2.3.910). */
            var stEndMult = 1 + (_R7.endurance || 0) * 0.002;
            var stAmuletMult = ((_R7$_amuletBonus = _R7._amuletBonus) === null || _R7$_amuletBonus === void 0 ? void 0 : _R7$_amuletBonus.stat) === 'staminaRegen' ? 1 + _R7._amuletBonus.value / 100 : 1;
            /* v2.3.1154: × Conditioning (Endurance grid) -- mirrors the
               worker's regen tick. */
            _R7.stamina = Math.min(_R7.maxStamina, _R7.stamina + 10 / 60 * stEndMult * regenMult * stAmuletMult + getConditioningFlat(_R7) / 60); /* v2.3.1345: flat regen */
          }
          /* Mana regen — §3.4: OOC 2.5%/s after 2s × Mind.
             v2.3.234 (Phase 4): Mind speeds up the recharge alongside
             governing mana pool size + special-attack damage.
             v2.3.1155: restoration mult deleted with the stat. */
          if (_R7.mana < _R7.maxMana && Date.now() - S.lastDamageTaken > 2000 && !S._serverMonsters) {
            var mMindMult = 1 + (_R7.mind || 0) * 0.001;
            var manaRegenMult = hasManaBuff ? 1.3 : 1.0;
            _R7.mana = Math.min(_R7.maxMana, _R7.mana
              + Math.max(manaSurgePerFrame(S, hasManaBuff),
                _R7.maxMana * 0.0004 * mMindMult * manaRegenMult));
          }
        } else if (S.rpg) {
          /* In-combat regen — §3.2: 0.3%/s HP, stamina regens always */
          var _R8 = S.rpg;
          /* In-combat HP regen disabled (v2.3.149) -- see OOC block above. */
          /* Stamina always regens — 10/sec.
             v2.3.232 (Phase 2): Endurance multiplies combat regen too. */
          if (_R8.stamina < _R8.maxStamina && !S._serverMonsters) {
            var _stEndMult8 = 1 + (_R8.endurance || 0) * 0.002;
            /* v2.3.1154: × Conditioning, same as the OOC branch above. */
            _R8.stamina = Math.min(_R8.maxStamina, _R8.stamina + 10 / 60 * _stEndMult8 + getConditioningFlat(_R8) / 60); /* v2.3.1345: flat regen */
          }
          /* Slow mana regen in combat — 1%/s × Mind.
             v2.3.234 (Phase 4): Mind multiplies combat regen too. */
          if (_R8.mana < _R8.maxMana && !S._serverMonsters) {
            var _mMindMult8 = 1 + (_R8.mind || 0) * 0.001;
            /* v2.3.2062: the surge applies IN COMBAT too -- that is the whole
               point of it, since casting specials nonstop is a thing you do
               while fighting. */
            var _hasMana8 = S._manaBuff && Date.now() < S._manaBuff;
            _R8.mana = Math.min(_R8.maxMana, _R8.mana
              + Math.max(manaSurgePerFrame(S, _hasMana8),
                _R8.maxMana * 0.00017 * _mMindMult8));
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
            /* ═══ v2.3.1985: THE POPUP'S OWN ttl DECIDES, NOT A FLAT 1200ms ═══
               Owner: "Make the quest complete message (like actually right
               after getting the 4th snowman remains) stay longer on screen.
               It's there for half a second or less."

               It was, and this line is why. Popups have carried a per-popup
               `ttl` since long before now — 1.5s by default, 2.5s on a kill
               banner, 5s on an operator announcement, and (v2.3.1985) 4.5s on
               the quest-complete floater — and the renderer honours it. This
               prune did not: it dropped EVERY entry at a flat 1200ms and
               destroyed its Pixi objects, so no popup in the game has ever
               outlived 1.2 seconds whatever it asked for. Worse for reading
               it, the renderer fades a popup out over ttl * 0.8, so a 1.5s
               default was still fading on the assumption it had 1.5s while
               this deleted it at 1.2 — the last visible third of every
               message was spent nearly transparent, then it vanished.

               The v2.3.1741 note below is right that TWO TTLs that must stay
               ordered is a bug waiting to come back, and it is the reason
               this prune owns the destroy. The answer to that is not a second
               constant: it is to read the SAME number the renderer reads.
               Now there is one ttl per popup and two places that agree on it,
               which is what v2.3.1741 was reaching for.

               The leak fix is untouched — whoever drops the entry still
               releases what it owns, on the line below.

               WHAT THIS COSTS. An ordinary damage number now lives 1.5s
               instead of 1.2s, so the steady-state population of the
               damageNumbers layer rises by a quarter. That is bounded on both
               sides: MAX_LIVE_POPUPS (24, combatHelpers) still caps the
               default-ttl popups, and only they are eligible to be aged out
               early, so a long-lived message can never be squeezed by a busy
               fight. Two other popups get the life they always asked for and
               never had: the kill banner (2.5s) and the operator announcement
               (5s, gameEvents.js), which is the only on-screen surface a
               server announcement has. */
            var _dnTtl = ((_dn[_dnR].ttl || 1.5) * 1000);
            if (_dnNow - _dn[_dnR].ts < _dnTtl) {
              if (_dnW !== _dnR) _dn[_dnW] = _dn[_dnR];
              _dnW++;
            } else {
              /* ═══ v2.3.1741: RELEASE THE PIXI OBJECTS THIS DROPS ═══
                 Owner: "the game slowed down significantly towards the end
                 (as if framerate drop was slowly accumulating)... lots of
                 monster killing... it fixed after reloading."

                 THIS LOOP WAS THE LEAK.  A damage popup owns three display
                 objects (_pixiText, _pixiIcon, _pixiSub) minted by
                 effectsRenderer._updateDamageNumbers and parented to the
                 damageNumbers layer.  The ONLY code that destroys them is
                 that renderer's own expiry, at a 1.5s TTL — and this prune
                 drops the entry at 1.2s.  The shorter window always wins, so
                 the renderer never saw an expired entry again and every
                 popup's Text and icon stayed in the layer for the whole
                 session.  One orphan per damage number, which is why it
                 tracked how much you killed, why it grew for twenty minutes,
                 and why a reload cleared it.

                 Measured with tools/qa/mp/mp-soak.mjs: the damageNumbers
                 layer went 32 -> 312 children in five minutes and the mean
                 frame time climbed 31.4ms -> 38.9ms.

                 Fixed HERE rather than by widening the window to 1.5s+: two
                 TTLs that must stay ordered is the same bug waiting to come
                 back the next time either number is tuned.  Whoever drops the
                 entry releases what it owns. */
              var _dnDead = _dn[_dnR];
              if (_dnDead._pixiText && !_dnDead._pixiText.destroyed) _dnDead._pixiText.destroy();
              if (_dnDead._pixiIcon && !_dnDead._pixiIcon.destroyed) _dnDead._pixiIcon.destroy();
              if (_dnDead._pixiSub && !_dnDead._pixiSub.destroyed) _dnDead._pixiSub.destroy();
              _dnDead._pixiText = null;
              _dnDead._pixiIcon = null;
              _dnDead._pixiSub = null;
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
              pushDmgPopup(S, P.x, P.y - 70, 'MVP! +' + CLAN_WAR_REWARDS.mvp.gold + 'G +' + CLAN_WAR_REWARDS.mvp.ap + 'AP', '#D8A94D');
            }
          }
          pushDmgPopup(S, P.x, P.y - 55, cWin === 'tie' ? 'War ended in a TIE!' : isWinner ? 'WAR WON!' : 'War lost...', isWinner ? '#D8A94D' : '#D95C54');
          pushDmgPopup(S, P.x, P.y - 40, '+' + reward.gold + 'G +' + reward.ap + 'AP', '#D8A94D');
          if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
          S.screenShake = 8;
          setTimeout(function () {
            S._activeClanWar = null;
          }, 10000);
        }

        /* §15 Tutorial progression — teach by doing */
        /* v2.3.1239: owner feedback — only advance (and write bt_tutorial)
           once the player has opted in via the "Start tour" prompt; a
           player who declined (or hasn't chosen yet) is left untouched. */
        if (S._tourStarted && S._tutorialStep >= 0 && S._tutorialStep < 8) {
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
            /* Step 5→6: Reached level 3.  v2.3.1147: was jumping
               straight to 7, which skipped the step-6 "Tutorial
               complete" message forever (the banner hides at >=7). */
            setTutorialStep(6);
            try {
              localStorage.setItem('bt_tutorial', '6');
            } catch (e) {}
          }
          if (S._tutorialStep === 6) {
            /* Tutorial complete -- v2.3.1147: dwell ~6 s so the
               completion message is actually readable (previously
               advanced to 10 on the very next frame). */
            if (!S._tutorialDoneAt) {
              S._tutorialDoneAt = Date.now();
            } else if (Date.now() - S._tutorialDoneAt > 6000) {
              setTutorialStep(10);
              try {
                localStorage.setItem('bt_tutorial', '10');
              } catch (e) {}
            }
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
        /* v2.3.1769: the camera chases with an exponential approach, so like
           the ice decay its frame-rate term is a POWER — closing 8% of the gap
           once per frame closes 1-(1-0.08)^dt over dt frames.  Left raw, the
           camera converged 2.4x faster on a 144Hz screen (glued to the player)
           and visibly lagged behind on a phone mid-dip.  Camera feel is a
           large part of why the owner said desktop "was COMPLETELY different",
           and it is the same one-line shape as every other fix in this PR. */
        var _camK = 1 - Math.pow(1 - _camSpeed, S._dtScale || 1);
        S.camera.x += (camTargetX - S.camera.x) * _camK;
        S.camera.y += (camTargetY - S.camera.y) * _camK;
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
        /* v2.3.1092: broadcast the current harvest/extraction activity so other
           players SEE this player mining/chopping/fishing/cooking/lighting a
           fire. Harvesting is stationary, so the move gate (movement OR facing
           change) would never fire while gathering — add an extraction-change
           trigger plus a ~500ms heartbeat so a peer that joins mid-harvest
           picks it up promptly. Codes: mine|chop|fish|cook|fire (null = none). */
        var _exSkill = (S._extraction && (S._extraction.status === 'waiting' || S._extraction.status === 'ready')) ? S._extraction.skill : null;
        var _exCode = S._firemaking ? 'fire'
          : _exSkill === 'mining' ? 'mine'
          : _exSkill === 'woodcutting' ? 'chop'
          : _exSkill === 'fishing' ? 'fish'
          : _exSkill === 'cooking' ? 'cook'
          : null;
        var _exChanged = _exCode !== (S._lastBroadcastEx || null);
        var _exHeartbeat = !!_exCode && (now - (S._lastExBroadcast || 0) > 500);
        /* v2.3.1107: explicit REST packet on the moving->stopped edge.
           Stopping used to be signaled by SILENCE (the gate below only fires
           while moving), so peers never got a final vx=0/vy=0 + resting
           position -- their copy coasted on decaying velocity PAST the real
           spot, and the position-delta facing fallback then read the
           convergence as walking backwards.  The staleness timeout, velocity
           snap-to-zero and hysteresis (v2.3.840) all compensate for that
           missing packet; this sends the packet.  P.vx/vy are already 0 on
           the stop frame, so the normal payload below carries the rest state. */
        /* Latched (not edge-only): if the 22ms throttle blocks the exact stop
           frame, the pending flag holds the rest packet for the next slot
           instead of dropping it until the keepalive. Cleared on actual send. */
        if (S._wasMovingBcast && !isMoving) S._restPending = true;
        S._wasMovingBcast = !!isMoving;
        var _justStopped = !!S._restPending;
        /* v2.3.1107: 1 Hz idle keepalive -- same medicine v2.3.1092 gave the
           harvest code (`ex`).  If a facing/rest broadcast is ever lost or a
           peer joins mid-idle, the next keepalive self-heals within a second
           instead of leaving the remote stuck on stale facing forever. */
        var _idleKeepalive = now - S.lastBroadcast > 1000;
        /* v2.3.1110: shield up/down must broadcast IMMEDIATELY.  The
           authoritative ps.blocking rides ONLY on move packets (the wsClient
           shim injects blocking: !!S._shieldUp into every move) and raising
           a shield while standing still fired none of the gate conditions --
           the server kept applying full monster/PvP damage for up to 1 s
           (until the idle keepalive) while the shield was visibly up.  This
           was the dominant "blocking sometimes doesn't work" mechanism, and
           it also starved the PvP lag-comp history of the blocking flag. */
        var _blockNow = !!S._shieldUp;
        var _blockChanged = _blockNow !== !!S._lastBroadcastBlocking;
        /* v2.3.1726: shield ROTATION must broadcast too, not just up/down.
           The authoritative facing (ba) rides only on move packets, and a
           stationary player steering the shield fired none of the gate
           conditions — the server kept testing the arc against a facing up
           to 1 s stale (the idle keepalive), which is a lifetime against a
           1.5 s monster swing cadence.  Same medicine as v2.3.1110 gave
           up/down.  0.05 rad (~3°) of hysteresis so analog ring jitter
           doesn't defeat the 22 ms throttle's purpose. */
        var _baNow = _blockNow && typeof S._shieldAngle === 'number' ? S._shieldAngle : null;
        var _baChanged = _baNow !== null &&
          (typeof S._lastBroadcastBa !== 'number' || Math.abs(_baNow - S._lastBroadcastBa) > 0.05);
        /* v2.3.1107: 33ms -> 22ms send throttle, matching the server's 22ms
           tick.  At 33ms roughly every third server tick relayed a stale
           position; matching cadences means every tick can carry fresh data.
           Delta ticks keep the cost small; revisit if iPhone battery/network
           profiling ever flags it. */
        if ((now - S.lastBroadcast > 22 && (isMoving || _facingChanged || _exChanged || _exHeartbeat || _justStopped || _blockChanged || _baChanged)) || _idleKeepalive) {
          S.lastBroadcast = now;
          S._lastBroadcastFacing = S._renderFacing;
          if (S.channel) {
            if (S.channel && (!S._lastMoveBroadcast || Date.now() - S._lastMoveBroadcast > 22)) {
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
                  eqs: getEquip('shoulders'),
                  /* v2.3.1092: current harvest activity (null when not gathering). */
                  ex: _exCode
                }
              });
              S._lastBroadcastEx = _exCode;
              if (_exCode) S._lastExBroadcast = now;
              S._restPending = false; /* v2.3.1107: rest packet delivered */
              S._lastBroadcastBlocking = _blockNow; /* v2.3.1110 */
              S._lastBroadcastBa = _baNow; /* v2.3.1726 */
            }
            /* ═══ v2.3.1913: LOG OUT AN IDLE CHARACTER ═══
               Owner: "Sometimes I login to the game and see characters I
               played in separate window hours ago just idle.  Game should
               be logging out characters after 2 mins."
               _lastInputAt (v2.3.1324) is stamped by window-capture
               touchstart/pointerdown/keydown, so it counts a thumb on a
               panel just as much as a thumb on the joystick -- which is
               the reason the hang-up lives HERE and not only in the
               worker's AFK sweep: the worker can only see packets, and a
               player reading the market sends none.  The worker's sweep
               (v2.3.1913, server/src/tick.js) stays as the backstop for a
               page that is frozen, old, or lying.
               Rides the 2 s track slot rather than its own timer: this is
               a 2-minute deadline, 2 s of granularity is free, and a
               frozen page runs neither. */
            if (S.channel && S.channel.idleLogout &&
                Date.now() - (S._lastInputAt || Date.now()) > IDLE_LOGOUT_MS) {
              S.channel.idleLogout();
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
                /* v2.3.1324: away flag — 2min without input.  Peers get
                   it via the player_update Object.assign for free; the
                   server never interprets it (friends.md). */
                aw: Date.now() - (S._lastInputAt || Date.now()) > IDLE_LOGOUT_MS ? 1 : 0,
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
                ec: getEyeColor(),   /* v2.3.1930 */
                /* v2.3.1939: the drawn shirt, only when drawn */
                sa: artHasInk(getShirtArt('front')) ? getShirtArt('front') : undefined,
                sb: artHasInk(getShirtArt('back')) ? getShirtArt('back') : undefined,
                /* v2.3.1940: the drawn pants print and the chest tattoo. */
                pa: artHasInk(getArt('pants')) ? getArt('pants') : undefined,
                ta: artHasInk(getArt('tattoo')) ? getArt('tattoo') : undefined,
                /* v2.3.1953: height and frame, so a build changed mid-session
                   reaches everyone on the next relay rather than only on their
                   next join.  Omitted entirely at average/medium. */
                hg: wireHeight(),
                fr: wireFrame(),
                /* v2.3.1961: the face and arm tattoos, which v2.3.1949 put on
                   the join frame and on BOTH server gates (JOIN_COSMETIC_KEYS
                   and TRACK_COSMETIC_KEYS) but not here -- so the two newest
                   canvases were the only ones the relay could not carry.  No
                   allowlist moves for this: the worker has admitted them since
                   v2.3.1949; this is the sender finally sending them.  Same
                   only-when-drawn rule as the four above. */
                tf: artHasInk(getArt('tattooFace')) ? getArt('tattooFace') : undefined,
                tm: artHasInk(getArt('tattooArm')) ? getArt('tattooArm') : undefined,
                tb: artHasInk(getArt('tattooHeadBack')) ? getArt('tattooHeadBack') : undefined,   /* v2.3.2043 */
                tr: artHasInk(getArt('tattooBack')) ? getArt('tattooBack') : undefined,   /* v2.3.2148 */
                /* v2.3.1941: clothing patterns. */
                sp: getPattern('shirt') || undefined,
                pp: getPattern('pants') || undefined,
                fp: getPattern('shoes') || undefined,   /* v2.3.1944 */
                eqc: getEquip('chest'),
                eql: getEquip('legs'),
                eqs: getEquip('shoulders'),
                /* v2.3.2084: the UNDER-SHIRT, which this payload has never
                   carried.  It rode the join frame alone, so peers lost it on
                   the first relay and fell back to deriving a garment from the
                   legacy `st` style -- and the two disagree about the default
                   (the gear slot dresses every new player in a tshirt, `st` is
                   'none' until somebody picks a style), so an ordinary player
                   was drawn bare-chested on every other screen.  Same shape as
                   the three above it. */
                eqst: getEquip('shirt'),
                pt: getPants(),
                sh: getShoes(),
                rpgLv: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.level) || 1,
                rpgHp: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.hp) || 50,
                rpgMaxHp: (_rpg === null || _rpg === void 0 ? void 0 : _rpg.maxHp) || 50,
                bs: S.bodySize || 'slim',
                zone: S.currentZone || 'town',
                wpnType: (_aw === null || _aw === void 0 ? void 0 : _aw.type) || 'greatsword',
                /* v2.3.1760: the metal, so peers draw the weapon you are
                   actually holding.  Sent as the raw blacksmith tier — the
                   receiving renderer decides what is a metal (weaponMaterial),
                   which keeps the rule in ONE place rather than on both sides
                   of the wire. */
                wpnMat: (_aw === null || _aw === void 0 ? void 0 : _aw.gearBase) || undefined,
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
        /* v2.3.1726: keyboard shield tracks the mouse.  The block ring
           writes S._shieldAngle every RAF frame on touch; this is the
           desktop twin, gated on _shieldKb (set only by the Q handler) so
           it can never fight the ring on a touch device that also has a
           mouse plugged in. */
        if (S._shieldUp && S._shieldKb && typeof S._mouseAimAngle === 'number') {
          S._shieldAngle = S._mouseAimAngle;
        } else if (S._shieldUp && S.lockedTarget && S.lockedTarget.ref) {
          /* v2.3.2242: a raised shield faces the locked target every frame --
             BlockRing's lerp used to do this; the toggle button has no
             finger on it to steer, so the lock is the only steer there is. */
          S._shieldAngle = shieldAimAngle(S);
        }
        if (S._shieldUp && S.rpg) {
          /* ═══ v2.3.1704: HOLDING A SHIELD IS FREE ═══
             Owner: "make it so holding shield doesn't drain energy.  I need
             to figure out what to do with that.  For the demo I want you to
             be able to block as much as you want."
             So this is a DELIBERATE, TEMPORARY suspension of a balance rule,
             not a bug fix — the drain and the auto-release-at-zero it feeds
             are switched off behind one named flag rather than deleted, and
             the same flag exists on the worker (BLOCK_COSTS_STAMINA in
             server/src/index.js), which is the side that actually owns
             stamina.  Flip BOTH back to true to restore the old economy; the
             maths either side of the flag is untouched and still correct.
             (Old rule, for whoever flips it: 10 stamina/sec at 60fps =
             0.167/frame on this legacy client-authoritative path, × Bulwark
             block-stamina efficiency; the worker ran 5/tick at ~1.5 Hz.) */
          if (BLOCK_COSTS_STAMINA && !S._serverMonsters) {
            S.rpg.stamina = Math.max(0, (S.rpg.stamina || 0) - 0.167 * getBlockStaminaMult(S.rpg));
          }
          /* v2.3.1110: 100 -> 250 ms rolling window.  Every client-side
             block check gates on Date.now() < shieldEnd, and the window is
             refreshed only by this rAF loop -- a single frame hitch over
             100 ms (common on iPhone) silently expired the block while the
             shield was still up.  250 ms rides out hitches; release paths
             still zero it immediately. */
          S.shieldEnd = Date.now() + 250;
          if (BLOCK_COSTS_STAMINA && S.rpg.stamina <= 0) {
            S.rpg.stamina = 0;
            S._shieldCdUntil = Date.now() + 2000;
            S._shieldAutoReleased = true;
            /* v2.3.2242: the shared drop path (broadcast + bus + shieldEnd). */
            dropShield(S, 'stamina');
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
    /* v2.3.1562: the quick bar's weapon cell fires the SAME cycle handler
       the left-stick double-tap and the keyboard shortcut use — one swap
       path, not three (see actionBus.js). */
    var unregCycleWeapon = actionBus.registerCycleWeapon(_desktopCycleWeapon);
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
      _desktopElementBurst: _desktopElementBurst,   /* v2.3.1734: G */
      _desktopCloseAll: _desktopCloseAll,
      setShowPetHouse: setShowPetHouse,
      setChatOpen: setChatOpen,
      chatInputRef: chatInputRef,
      chatOpen: chatOpen,
      toggleKbHints: toggleKbHints,   /* v2.3.1715: H hides the hints strip */
      /* v2.3.1733: the stamina abilities' desktop keys — E (while blocking)
         and R.  Passed in like every other action so desktopControls stays
         a pure key router. */
      _desktopShieldBash: doShieldBash,
      _desktopWhirlwind: doWhirlwind,
      /* v2.3.1717: so E can SAY why it refused instead of going silent. */
      pushNpcMsg: function pushNpcMsg(text) {
        var S2 = stateRef.current;
        if (!S2 || !S2.player) return;
        pushDmgPopup(S2, S2.player.x, S2.player.y - 74, text, '#D8A94D', { ttl: 1.4, crit: true });
      }
    });
    return function () {
      cancelAnimationFrame(frameRef.current);
      unregCycleWeapon(); /* v2.3.1562 */
      teardownDesktopControls();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', _orientResize);
      if (resizeObs) resizeObs.disconnect();
      if (vv) vv.removeEventListener('resize', resize);
      clearInterval(watchdog);   /* v2.3.1975 */
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
  }, [showNameModal, showLogin, bootPhase, glEpoch]);   /* v2.3.1869: bootPhase — see the note at the top of this effect */

  /* Sync nearBuilding + player list from game loop to React */
  useEffect(function () {
    /* v2.3.1869: bootPhase — the login door (v2.3.1814) is a third pre-game
       screen this guard never knew about, and the refs below only exist once
       the game UI renders.  Without it this effect runs while the door is up,
       bails on a null ref, and never re-runs; see the game-loop effect for
       the full account. */
    if (showNameModal || showLogin || bootPhase !== null) return;
    /* v2.3.777: tiny world-canvas readback -> % of pixels brighter than
       near-black.  Cheap (32x18) and only every 5s. */
    function _sampleLit() {
      try {
        var cv = canvasRef.current;
        if (!cv || !cv.width) return -1;
        /* v2.3.1383 (owner: rejoin "blanks out"): a LOST WebGL context must
           count as FULLY DARK.  drawImage from a dead GL canvas can throw or
           yield nothing -> the old -1 "can't judge" skip meant the watchdog
           never struck, so an iOS memory-pressure context kill left the
           screen blank forever with no rebuild and no reload. */
        try {
          var _glWd = cv.getContext('webgl2') || cv.getContext('webgl');
          if (_glWd && _glWd.isContextLost && _glWd.isContextLost()) return 0;
        } catch (eWd) { /* fall through to the pixel sample */ }
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
    /* ═══ v2.3.1722: THE RECOVERY RELOAD, EXTRACTED ═══
       Measured on a forced-black join: the in-place rebuild does NOT cure
       this failure (a second rebuild fired 8.8s later, still dark) — the
       RELOAD is what fixes it, and it was landing 23.7s after the loading
       screen lifted.  The owner watched ~15s of black on a livestream and
       their friend hit it on an iPhone.  So this had to become reachable in
       seconds rather than after three more five-second strikes, and both
       callers must share ONE implementation, because the 2-per-5-minutes cap
       is the only thing standing between a black screen and a reload loop. */
    function _recoveryReload(why) {
      var S2 = stateRef.current;
      if (!S2 || S2.__wdReloading) return false;
      try {
        var _rls = JSON.parse(sessionStorage.getItem('bt-reloads') || '[]')
          .filter(function (t) { return Date.now() - t < 300000; });
        if (_rls.length >= 2) return false;   /* capped — never loop the page */
        _rls.push(Date.now());
        sessionStorage.setItem('bt-reloads', JSON.stringify(_rls));
        sessionStorage.setItem('bt_resume_now', '1');
        S2.__wdReloading = true;
        import('../debug/crashTrap.js').then(function (ct) {
          ct.recordCrash('auto-reload', why);
        }).catch(function () {});
        /* ═══ v2.3.1868: THE RECOVERY RELOAD HAS TO LAND IN THE WORLD ═══
           reload() keeps the query string, and after a logout that string is
           `?noresume=1&login=1` (v2.3.1840).  Both flags defeat this rescue:
           `noresume=1` makes the auto-rejoin effect return early — it is that
           feature's own escape hatch for a deliberate exit — and `login=1`
           forces the login door.  So the one mechanism built to recover a
           black first join was depositing the player back at the door, where
           pressing Continue starts the same cycle again.  Measured on the
           owner's road: reload at ~7s, back on the door at ~20s.

           Reloading to a CLEAN path fixes it without touching either flag's
           real purpose: both are about what a fresh, deliberate navigation
           should do, and this is neither.  bt_resume_now (set just above) is
           what carries the intent through, and the auto-rejoin effect reads
           it — but only if noresume=1 is not there to make it return first. */
        setTimeout(function () {
          try {
            var _g = /[?&]guest=1\b/.test(window.location.search) ? '?guest=1' : '';
            window.location.replace(window.location.pathname + _g);
          } catch (e2) { window.location.reload(); }
        }, 350);
        return true;
      } catch (e) { return false; }
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
      /* ═══ v2.3.1721: A FIRST JOIN DOES NOT WAIT OUT THE MID-SESSION CADENCE ═══
         Owner: "sometimes upon first joining the game after the loading screen
         it's black."  The watchdog above already recovers this -- but on its
         own clock, which is tuned for a context loss during play: 15s grace,
         then a sample every 5s, then a rebuild only on the SECOND dark strike.
         Measured from the loading screen lifting, that is ~5-10s of black
         before anything happens and ~20s to the reload, which is far longer
         than anyone waits before reloading by hand.
         Two strikes is the right rule DURING PLAY, where one dark sample can
         be a transient.  It is the wrong rule here: we have never rendered a
         lit frame since the overlay lifted, so a dark sample is not a blip, it
         IS the failure.  So until the first lit frame is seen, sample ~2s
         after the lift and act on strike one. */
      var _firstLook = !S.__wdEverLit && S.__introLiftedAt
        && (_nowWd - S.__introLiftedAt) > 2000
        && (!S.__wdFirstNext || _nowWd >= S.__wdFirstNext);
      if (_firstLook) S.__wdFirstNext = _nowWd + 1500;
      if (_firstLook || ((!S.__wdNext || _nowWd >= S.__wdNext) && _nowWd - S.__wdArmedAt > 15000)) {
        S.__wdNext = _nowWd + 5000;
        if (!S.__wdHb || _nowWd - S.__wdHb > 30000) {
          S.__wdHb = _nowWd;
          try {
            var _rawHb = sessionStorage.getItem('bt_resume') || localStorage.getItem('bt_resume');
            if (_rawHb) {
              var _snHb = JSON.parse(_rawHb);
              _snHb.t = _nowWd;
              /* v2.3.1391: refresh the TRAITS too — the snapshot captured
                 them once at PLAY, so an auto-rejoin after a mid-session
                 outfit change silently reverted the look AND overwrote the
                 picker stores with the stale values (repro: equip a hat
                 in-game, recovery-reload -> hat gone everywhere). */
              _snHb.traits = {
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
              };
              var _strHb = JSON.stringify(_snHb);
              sessionStorage.setItem('bt_resume', _strHb);
              localStorage.setItem('bt_resume', _strHb);
            }
            /* v2.3.1923: keep the roster row's LEVEL honest.  The PLAY stamp
               catches the name once; without this a two-hour session that
               took a character from 3 to 12 would still be offering "LV 3" in
               the picker until the next join.  Free — this block is already
               throttled to one write per 30s, and the same guest guard
               applies for the same reason. */
            if (!/[?&]guest=1\b/.test(window.location.search)) {
              var _hbPf = getBtPassphrase();
              if (_hbPf && S.myName) rememberChar(_hbPf, { name: S.myName, level: (S.rpg && S.rpg.level) || 0 });
            }
          } catch (e) {}
        }
        if (document.visibilityState === 'visible') {
          requestAnimationFrame(function () {
            var _pctWd = _sampleLit();
            if (_pctWd < 0) return;
            /* v2.3.1721: the world has rendered at least once — from here the
               conservative two-strike rule applies. */
            if (_pctWd >= 1) { S.__wdDark = 0; S.__wdEverLit = true; return; }
            S.__wdDark = (S.__wdDark || 0) + 1;
            try {
              import('../debug/crashTrap.js').then(function (ct) {
                ct.recordCrash('watchdog-dark', 'screen ' + _pctWd + '% lit, strike ' + S.__wdDark);
              }).catch(function () {});
            } catch (e) {}
            /* v2.3.1721: one strike before the first lit frame, two after. */
            var _strikesNeeded = S.__wdEverLit ? 2 : 1;
            if (S.__wdDark === _strikesNeeded && window._rebuildRenderer) {
              if (!S.__wdEverLit) S.__wdFastRebuiltAt = Date.now();
              window._rebuildRenderer(S.__wdEverLit
                ? 'watchdog: screen dark 10s'
                : 'watchdog: black on first join');
            }
            /* v2.3.1722: a first join still black a beat after its rebuild
               reloads NOW instead of waiting out three more strikes.  The
               rebuild is given 3.5s to take effect — measured, a rebuild that
               is going to work has repainted well inside that — and the code
               has always held that "fresh boots have never failed", which is
               why the reload is the reliable cure and the rebuild is not. */
            if (!S.__wdEverLit && S.__wdFastRebuiltAt
                && (Date.now() - S.__wdFastRebuiltAt) > 3500) {
              S.__wdFastRebuiltAt = 0;
              S.__wdDark = 0;
              _recoveryReload('black on first join, still dark after rebuild -- reloading into game');
            }
            if (S.__wdDark >= 4) {
              S.__wdDark = 0;
              _recoveryReload('world dark 20s despite rebuild -- reloading into game');
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
      /* v2.3.1745: the quest banner is deliberately shorter-lived than the
         level-up one.  Turning in a quest re-opens the dialogue on the
         giver's NEXT quest (v2.3.1713), so COMPLETED and ACCEPTED can fire
         seconds apart — a 3.5s banner would still be sitting there when the
         second one arrives. */
      /* v2.3.1746: expire, then promote whatever was waiting.  Done here in
         the interval body rather than inside the state updater on purpose —
         an updater must stay pure, and shifting a ref inside one would drop
         a queued banner the moment React chose to call it twice. */
      var _qCur = questMsgRef.current;
      if ((!_qCur || Date.now() - _qCur.ts > questMsgMs(_qCur.kind)) && questQueueRef.current.length) {
        var _qNext = questQueueRef.current.shift();
        _qNext.ts = Date.now();
        setQuestMsg(_qNext);
      } else {
        setQuestMsg(function (prev) {
          return prev && Date.now() - prev.ts > questMsgMs(prev.kind) ? null : prev;
        });
      }

      /* §ARENA — Background polling for arena match status */
      var S3 = stateRef.current;
      if (!S3._arenaLastBgPoll) S3._arenaLastBgPoll = 0;
      /* v2.3.1623: only poll FAST when this player actually has arena
         business.  This ran at 3 s for every player in the world forever,
         arena or not — 1,028 HTTP requests per player-hour, ~a third of an
         idle player's entire request bill and billed 1:1 (no WS discount).
         "Business" is: in the queue or a live tournament (set from the last
         response below), or holding a bet that has not paid out yet.
         The bet case is why this stays a slow poll instead of stopping —
         the §BET payout below fires ONLY from this callback, so a spectator
         who bet without entering must keep checking or they never get paid.
         Panel liveness is unaffected: PartyPanel runs its own 3 s poll
         while it is open. */
      var _arenaBusy = !!(S3._arenaMatch || S3._arenaInvolved);
      if (!_arenaBusy) {
        var _R3 = S3.rpg;
        var _bets = (_R3 && _R3._arenaBets) || [];
        for (var _bi = 0; _bi < _bets.length; _bi++) {
          if (!S3._betsPaidOut || !S3._betsPaidOut[_bets[_bi].tournamentId]) { _arenaBusy = true; break; }
        }
      }
      if (Date.now() - S3._arenaLastBgPoll > (_arenaBusy ? ARENA_POLL_INTERVAL : ARENA_IDLE_POLL_INTERVAL)) {
        S3._arenaLastBgPoll = Date.now();
        fetch(BT_API_BASE + '/api/arena/status?playerId=' + encodeURIComponent(S3.myId)).then(function (r) {
          return r.json();
        }).then(function (d) {
          var _d$tournament3, _d$tournament4, _S3$_betsPaidOut;
          if (!d.ok) return;
          setArenaStatus(d);
          if (d.tournament) setArenaTournament(d.tournament);
          /* v2.3.1623: latch "this player has arena business" from the
             authoritative response, so the gate above can pick the fast or
             idle rate on the NEXT pass.  Queue entries carry playerId; the
             tournament roster carries both playerId and id (gladiator.js
             emits a superset of the old and new shapes — see _arenaWire).
             A completed tournament still lists its players, which is what
             keeps a just-finished player polling fast through the payout. */
          var _meId = S3.myId;
          var _inQueue = Array.isArray(d.queue) && d.queue.some(function (p) {
            return p && p.playerId === _meId;
          });
          var _tPlayers = d.tournament && d.tournament.players;
          var _inTourney = Array.isArray(_tPlayers) && _tPlayers.some(function (p) {
            return p && (p.playerId === _meId || p.id === _meId);
          });
          S3._arenaInvolved = !!(_inQueue || _inTourney);
          /* Store current match on stateRef for PvP kill hook */
          if (d.status === 'fighting' && d.currentMatch) {
            var _d$tournament2;
            S3._arenaMatch = d.currentMatch;
            S3._arenaTournamentId = (_d$tournament2 = d.tournament) === null || _d$tournament2 === void 0 ? void 0 : _d$tournament2.id;
            /* Notify player they have a match */
            if (!S3._arenaNotified || S3._arenaNotified !== d.currentMatch.id) {
              S3._arenaNotified = d.currentMatch.id;
              var opp = d.currentMatch.p1 === S3.myId ? d.currentMatch.p2Name : d.currentMatch.p1Name;
              pushDmgPopup(S3, S3.player.x, S3.player.y - 50, 'ARENA MATCH! vs ' + opp, '#D95C54');
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
                pushDmgPopup(S3, S3.player.x, S3.player.y - 60, 'BET WON! +' + totalWon + 'G', '#D8A94D');
                BT_AUDIO.collect();
              } else {
                pushDmgPopup(S3, S3.player.x, S3.player.y - 60, 'Bet lost (-' + totalLost + 'G)', 'rgba(255,255,255,.4)');
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
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1869 */

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
  /* v2.3.2156: seeded from playIsLandscape(), not innerWidth>innerHeight —
     on the desktop shell those disagree (a 1920x1080 WINDOW is landscape
     while the aspect-locked 390/715 PLAY AREA is portrait), so the first
     render laid controls out for an orientation the play area never had
     until the first resize event corrected it.  orientationSync has updated
     this flag from playIsLandscape() since v2.3.1715; the seed just never
     caught up. */
  var _useState213 = useState(playIsLandscape()),
    _useState214 = _slicedToArray(_useState213, 2),
    isLandscape = _useState214[0],
    setIsLandscape = _useState214[1];

  /* Re-render on orientation change */
  useEffect(function () {
    return wireOrientationSync(setIsLandscape);
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
  /* v2.3.2242: the `shieldUp` React state is gone -- its only reader was
     the legacy hidden shield joystick in TouchControls; ShieldButton polls
     S._shieldUp directly. */
  var _useState227 = useState(3000),
    _useState228 = _slicedToArray(_useState227, 2),
    shieldStamina = _useState228[0],
    setShieldStamina = _useState228[1]; /* max 3000ms */
  var doSpecialAttack = useCallback(function () {
    specialAttack(stateRef.current);
  }, []);

  /* v2.3.1733: the two stamina abilities (PR 5).  Thin wrappers over
     castAbility, matching how every other action in this component is
     shaped — the body lives in @/game/abilities.js.  Consumed by the
     desktop E/R keys, the shield-up tap gesture on the combat joystick,
     and the AbilityButtons overlay. */
  var doShieldBash = useCallback(function () {
    castAbility(stateRef.current, 'bash');
  }, []);
  var doWhirlwind = useCallback(function () {
    castAbility(stateRef.current, 'whirl');
  }, []);

  /* Legacy fishing/campfire/woodcutting systems removed — replaced by §18 Life Skills */

  /* Shield — v2.3.2242: one module owns raise/drop (game/shieldToggle.js);
     this wrapper is what the desktop Q key reaches through _desktopShieldOn. */
  var doShield = useCallback(function () {
    raiseShieldToggle(stateRef.current);
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
    pushDmgPopup(S2, S2.player.x, S2.player.y - 40, 'Zzz... Stats restored!', '#59BF91');
    pushDmgPopup(S2, S2.player.x, S2.player.y - 25, 'Well Rested +10% XP (30min)', '#D8A94D');
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
  /* v2.3.2245: _tapResourceAt is gone with the shell it opened -- resources
     are detected by perimeter (S._proxNode -> S._nearNode in the loop) and
     harvested from the right button.  A tap on bare ground still unlocks. */

  var _desktopGather = useCallback(function () {
    var _R$lifeSkills;
    var S = stateRef.current,
      /* v2.3.1448: the E key keeps working on PROXIMITY (desktop has no
         "touch the resource" gesture in the thumb sense) — the tapped
         node wins when there is one. */
      node = S._nearNode || S._proxNode,
      R = S.rpg;
    if (!node || !node.alive || !R) return;
    if (R.lifeSkills) migrateLifeSkills(R.lifeSkills);
    var skillName = node.skill || 'mining';
    var skillLvl = ((_R$lifeSkills = R.lifeSkills) === null || _R$lifeSkills === void 0 || (_R$lifeSkills = _R$lifeSkills[skillName]) === null || _R$lifeSkills === void 0 ? void 0 : _R$lifeSkills.level) || 1;
    if (false) { /* gathering level gate disabled — all resources harvestable at lvl 1 */
      pushDmgPopup(S, node.x, node.y - 15, 'Need ' + skillName.charAt(0).toUpperCase() + skillName.slice(1) + ' Lv' + node.gatherLvl, '#D95C54');
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
    /* v2.3.1431 (owner: "the minnow isn't getting cooked"): the campfire
       used to grab the FIRST fish_ key in bag insertion order, so whole
       species could sit uncooked behind whatever was caught first.  Now
       the lowest-tier raw fish cooks first (minnow -> clownfish ->
       trout; unknown species last), a deterministic order the player
       can reason about. */
    var _fishOrder = { fish_minnow: 1, fish_clownfish: 6, fish_trout: 11 };
    var fishKey = Object.keys(R.inventory).filter(function (k) {
      return k.indexOf('fish_') === 0 && R.inventory[k] > 0;
    }).sort(function (a, b) { return (_fishOrder[a] || 99) - (_fishOrder[b] || 99); })[0];
    if (!fishKey) {
      pushDmgPopup(S, node.x, node.y - 24, 'Need raw fish', '#D95C54');
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
      /* v2.3.1702: the local delete below is a PREDICTION (rule 20) — the
         worker owns the bag, and until this message existed it never heard
         that the log was spent, so the next player_state echo handed it
         back and one log lit unlimited campfires.  Sent BEFORE the local
         mutation so a throw on send can't leave the client short a log the
         worker still holds. */
      if (S.channel) {
        try { S.channel.send({ type: 'firemaking_request', payload: { invKey: key } }); } catch (e) {}
      }
      R.inventory[key] -= 1;
      if (R.inventory[key] <= 0) delete R.inventory[key];
      var now = Date.now();
      /* v2.3.1749: 1500 -> 700ms, following the 3x animation speed-up (owner:
         "for firemaking speed up the animation by about 3x").  The 8-frame
         strip now runs 536ms; leaving the window at 1500 would hold the final
         frame for a second before the real campfire appeared, which reads as a
         freeze rather than a faster animation.  The ~160ms tail is a beat on
         the finished pose, not a stall. */
      S._firemaking = { startedAt: now, doneAt: now + 700, x: S.player.x, y: S.player.y + 6 };
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Lighting fire…', '#ff8a3c', { ts: now });
      try { BT_AUDIO.beep(180, 0.05, 0.12, 'sawtooth'); } catch (e) {}
      setRpgState(_objectSpread({}, R));
      try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    });
  }, []);

  /* Eat a cooked fish from the bag — consume 1 of the cooked_fish_* key
     and heal (clamped to maxHp).  No-op if HP is already full (so the
     player doesn't burn food to no effect — reads as "you're not
     hungry").
     v2.3.1207: legacy remnant rewired to the server eat path.  This
     handler used to self-heal from a private COOKED_HEAL_BY_KEY table
     (30/50 HP — wrong per-fish AND missing the HP-grid Recovery mult)
     and never sent eat_request, so the worker's _handleEatRequest never
     ran and the next player_state echo reverted the heal + restored the
     item.  Now: local heal is an optimistic PREDICTION via
     calcDisplayHeal (the server formula's display twin; rule 20 — the
     echo is the truth) and eat_request makes the worker validate,
     consume, and heal authoritatively — same shape as the
     CookPanel/InventoryPanel eat handlers. */
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'HP full', '#B9C1BF');
        return;
      }
      var HEAL = calcDisplayHeal(R, key);
      var before = R.hp || 0;
      R.hp = Math.min(maxHp, before + HEAL);
      var actual = R.hp - before;
      R.inventory[key] -= 1;
      if (R.inventory[key] <= 0) delete R.inventory[key];
      /* ═══ v2.3.2077: `_serverMonsters` IS FALSE IN TOWN ═══
             Owner-facing symptom: eating and cooking in town do not stick.

             This gate has been `S._serverMonsters && S.channel` since
             v2.3.1207, and that flag means "this zone has server-managed
             monsters" -- wsClient sets it false whenever the zone's monster
             list is empty, and its own comment says so: "Empty list means the
             server has no monsters for this zone (town, or a dungeon the
             server doesn't model)". So in TOWN the message was never sent at
             all. The client healed, decremented the bag and wrote
             localStorage; the server never heard, and its blob -- which is
             authoritative for inventory and HP -- reconciles the change away.

             THIS IS THE THIRD TIME. v2.3.1702 fixed `ability_use` gated the
             same way, and v2.3.2063 fixed `shop_purchase`, where no purchase
             in the game's history had ever reached the server because the
             vendor stands in town. Presence on the channel is the only
             precondition a consume actually has.

             Backlog item N in docs/ARCHITECTURE-HANDOFF.md reads this gate as
             "adequate ... local heal is prediction, the echo is the
             tiebreaker" -- true reasoning about the wrong premise, because
             there is no echo when nothing is sent. */
      if (S.channel) {
        try { S.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
      }
      pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + actual + ' HP', '#59BF91');
      pushDmgPopup(S, S.player.x, S.player.y - 46, 'Ate cooked fish', '#D8A94D');
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
    /* v2.3.1701: the E-key door arms the proximity latch too (see the tap
       handler) — the desktop player is standing next to him by definition. */
    /* v2.3.1884: same shape as the proximity door — { npc, ready }.  A bare
       npc here would crash the loop's `_latched.npc.x` read. */
    stateRef.current._npcProxLatch = { npc: npc, ready: _npcQuestReady(stateRef.current, npcQ) };
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
    dropShield(stateRef.current, 'key');   /* v2.3.2242: shared drop path */
  }, []);
  var _desktopCycleWeapon = useCallback(function () {
    var _S2$rpg$weapon, _S2$rpg$rangedWeapon;
    var S2 = stateRef.current;
    if (!S2.rpg) return;
    /* v2.3.1845: the rotation moved to game/weaponSlots.js, shared with the
       joystick's next-weapon PREVIEW below — the two used to carry separate
       copies and both had 'ranged' ungated, so a sword-only character was
       shown a bow and then moved into an empty ranged slot.  Owner: "when you
       only have sword (no bow or staff) it still shows bow icon when you
       double tap to switch weapons."  A slot you cannot fill is not a weapon
       to switch to. */
    var nextSlot = nextWeaponSlot(S2.rpg);
    /* Nowhere to go — one weapon, one slot.  Returning early keeps the beep
       and the name popup for a swap that did not happen off the screen. */
    if (nextSlot === (S2.rpg.activeSlot || 'melee')) return;
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
    pushDmgPopup(S2, S2.player.x, S2.player.y - 40, wpnName, '#D8A94D');
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
    pushDmgPopup(S2, S2.player.x, S2.player.y - 40, wpnName, '#D8A94D');
    BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
  }, []);
  var _desktopSpecialAttack = useCallback(function () {
    doSpecialAttack();
  }, [doSpecialAttack]);
  /* v2.3.1734: G — Element Burst.  The touch button (ElementBurstButton,
     mounted in GameApp) calls the same action bus entry, so both inputs
     go through ONE implementation (src/game/playerActions.elementBurst). */
  var _desktopElementBurst = useCallback(function () {
    elementBurst(stateRef.current);
  }, []);
  var _desktopCloseAll = useCallback(function () {
    closeAllMenus();
    setBuildingPanel(null);
    setQuestPanel(null);
    setInspectPlayer(null);
  }, []);

  /* ═══ v2.3.2078: THE SHOP DRAWER GETS OUT OF EVERYTHING'S WAY ═══
     Diego's trade drawer is `position: fixed` just above the dashboard, and
     so is every panel that opens over the bottom of the screen. On the
     primary platform's 390x844 they land on top of each other and the drawer
     wins: measured with elementFromPoint, three of the inspect card's four
     actions had the drawer painted over them, so a finger aiming at Trade
     opened a shop slot instead. The sweep found the same shape twice more —
     mp-social could not press "Add Friend", mp-clan could not press "Create
     Clan (500g)" — both reported as visible, enabled and stable and then
     un-clickable, which is what a covered control looks like from outside.

     The proximity gate that OPENS the drawer already refuses while anything
     else is up ("_pOk already means close enough, not in combat, nothing
     else open"). This is that same rule in the other direction, for a drawer
     that was already open when you tapped: one panel at a time.

     Keyed on `_anyPanelOpen` — the SAME expression the gate reads — rather
     than on a list of panels kept here. The card is opened from four places
     and the sheet has a dozen destinations; a rule written per-surface is a
     rule that will be missed on the next one. */
  useEffect(function () {
    if (_anyPanelOpen) { try { shopBus.setOpen(false); } catch (e) { /* no shop */ } }
  }, [_anyPanelOpen]);
  /* ...and the bottom SHEET, which is not in that list. The sheet's
     destinations render off dashboardPanelBus, not off the show* flags
     above, so `_anyPanelOpen` is false while the Social or Clan destination
     is filling the lower half of the screen. Two signals because the app has
     two panel systems; collapsing them into one was tried and quietly
     dropped the sheet. */
  useEffect(function () {
    return dashboardPanelBus.subscribe(function () {
      if (dashboardPanelBus.state.mode !== 'bar') {
        try { shopBus.setOpen(false); } catch (e) { /* no shop */ }
      }
    });
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
  var rLabelRef = useRef(null);   /* v2.3.2242: the button's contextual label */
  var rCueRef = useRef(null);     /* v2.3.2245: the harvest tool frame on the button */
  var rRingRef = useRef(null);    /* v2.3.2245: the wind-up / reps ring */
  var rJoyActive = useRef(false);
  var rTouchId = useRef(null);
  var lTrail = useRef([]);
  /* Double-tap gesture state for the joysticks (v2.3.97+).
     Right joystick: tap, then tap-and-hold within DOUBLE_TAP_WINDOW_MS
     activates shield -- the second touch becomes the shield drag handle
     and rotates the block arc; release drops the shield.  Left joystick:
     two quick taps within the window cycles the active weapon slot.
     Each tap (single-tap classification: no movement + brief duration)
     opens a preview window that renders an icon inside the joystick
     disc; the window auto-closes when the timer expires. */
  var lJoyPreviewRef = useRef(null);
  var rTapState = useRef({ lastEndAt: 0, lastX: 0, lastY: 0, startAt: 0, startX: 0, startY: 0, moved: false });
  var lTapState = useRef({ lastEndAt: 0, lastX: 0, lastY: 0, startAt: 0, startX: 0, startY: 0, moved: false });
  /* v2.3.2242: rShieldGesture / rPreviewTimer / rJoyPreviewRef / rKnobRef /
     rStickRef / shieldJoyRef / shieldTouchId / shieldJoyActive are gone with
     the double-tap-hold gesture and the stick sprites. */
  var lPreviewTimer = useRef(null);
  var handleJoystickMove = useCallback(function (clientX, clientY) {
    var base = joystickRef.current;
    if (!base) return;
    /* v2.3.1233: LANTERN-SLATE-SPEC §10 ENGAGED step — base brightens
       to .92 while the finger is down (fires on touchstart + every
       move; handleJoystickEnd restores the .5 rest value).  The base
       already carries transition:opacity .12s, so this reads as a
       smooth lift, not a blink. */
    base.style.opacity = '0.92';
    var rect = base.getBoundingClientRect();
    /* v2.3.949: docked joystick.  The base sits in its left corner at 50%
       opacity and no longer follows the finger; deflection is measured from the
       touch ORIGIN (where the finger went down anywhere in the left zone), so the
       knob on the docked disc reads as a relative drag in that direction. */
    var _lts = lTapState.current;
    var bcx = (_lts && _lts.startX != null) ? _lts.startX : (rect.left + rect.width / 2);
    var bcy = (_lts && _lts.startY != null) ? _lts.startY : (rect.top + rect.height / 2);
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
    /* v2.3.949: docked joystick stays visible at 50% on release; just recenter
       the knob/stick (no fade-out). */
    if (joystickRef.current) joystickRef.current.style.opacity = '0.5';
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

  /* ═══ v2.3.2242: THE RIGHT CONTROL IS A BUTTON ═══
     Owner: "The right thumbstick no longer acts as independent rotation
     angle. It becomes a slightly larger contextual button ... Right button
     will be held down to auto attack. The swipe on button will continue to
     be the special attack."

     handleRJoyMove used to turn a drag into S._aimAngle / S._facing /
     S._aiming and the knob + rod transforms; handleRJoyEnd undid them.  All
     of that is gone.  What is left is the §10 opacity ladder (rest .5,
     ENGAGED .92 -- v2.3.1233) and the auto-attack flag.  Aim comes from the
     LOCK now (monsterCombat writes S._aimAngle toward the locked target each
     frame while the button is held), and the lock comes from engageNearest
     on the press (game/targeting.js). */
  var handleRBtnPress = useCallback(function () {
    var base = rJoyRef.current;
    if (base) base.style.opacity = '0.92';
    var S = stateRef.current;
    if (!S) return;
    try { engageNearest(S); } catch (e) { /* no candidates: still swings */ }
    S.autoAttack = true;
    setAutoAttack(true);
  }, []);
  var handleRBtnRelease = useCallback(function () {
    rJoyActive.current = false;
    var base = rJoyRef.current;
    if (base) base.style.opacity = '0.5';
    var S = stateRef.current;
    if (!S) return;
    S.autoAttack = false;
    setAutoAttack(false);
    S._aiming = false;
  }, []);
  /* The old names, kept as aliases so the effect deps below and any late
     reader still resolve.  Behaviour is the press/release above. */
  var handleRJoyMove = handleRBtnPress;
  var handleRJoyEnd = handleRBtnRelease;

  /* iOS Safari left-edge swipe absorber (v2.3.112).  iOS treats a
     touchstart within ~20 px of the screen's left edge as the
     browser's back-history gesture, which on this game manifests as
     "the whole game screen scrolls when I swipe from the outer
     edge".  Sit a 18 px tall transparent strip down the left edge
     and preventDefault any touchstart that lands inside it.  Best
     effort -- Safari sometimes overrules; if it persists the user
     can reflag for a PWA / fullscreen path. */
  useEffect(function () {
    /* v2.3.1869: bootPhase — the login door (v2.3.1814) is a third pre-game
       screen this guard never knew about, and the refs below only exist once
       the game UI renders.  Without it this effect runs while the door is up,
       bails on a null ref, and never re-runs; see the game-loop effect for
       the full account. */
    if (showNameModal || showLogin || bootPhase !== null) return;
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
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1869 */

  /* Dual joystick — each finger tracked independently */
  useEffect(function () {
    /* v2.3.1869: bootPhase — the login door (v2.3.1814) is a third pre-game
       screen this guard never knew about, and the refs below only exist once
       the game UI renders.  Without it this effect runs while the door is up,
       bails on a null ref, and never re-runs; see the game-loop effect for
       the full account. */
    if (showNameModal || showLogin || bootPhase !== null) return;
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
    /* v2.3.1429: isReelTouch (v2.3.845) is retired — it predated the
       world-scale fix so its 170px claim circle sat ~20% off at mobile
       viewports, and isGestureTouch below covers fishing (correctly
       scaled) along with every other skill. */
    /* v2.3.1429 (owner: "make sure all life skills can be walked away
       from — I tried walking away while fishing and couldn't"): the
       v2.3.848 guard below used to bail the WHOLE joystick zone while a
       gesture window was open.  Back then 'ready' expired in seconds;
       since v2.3.1416 removed the timeout it lasts forever, so the
       blanket bail rooted the player permanently.  Replace it with a
       cue-proximity claim mirroring ExtractionSwipeLayer's own start
       gate (SWIPE_START_RADIUS 160 + slack): touches near the gesture
       cue belong to the gesture; anything else is movement, so walking
       away works mid-animation for every skill. */
    /* ═══ v2.3.2174: VIEWPORT COORDS ARE NOT CANVAS COORDS ═══
       The two classifiers below compare a raw touch `clientX` (measured from
       the SCREEN's left edge) against world coords converted to CANVAS space
       by (world - camera) * scale.  Those two agree only while the canvas
       starts at screen x=0 -- true on a phone until now, and never true on
       the letterboxed desktop shell, where both have been quietly ~100px off
       for as long as they have existed.
       Landscape can now put the dashboard on the LEFT (owner: the punch hole
       "goes right through the menus"), which offsets the world by the panel's
       whole width -- so a tap on your own character would have opened chat
       ~220px to its left, and the fishing/mining swipe would have missed its
       cue by the same margin.  One helper, both callers, and the desktop bug
       goes with it.  This is the pattern tapResourceAtClient already uses
       forty lines below; it is simply hoisted so everyone shares it. */
    var clientToCanvas = function (clientX, clientY) {
      var c = canvasRef.current;
      if (!c) return { x: clientX, y: clientY };
      var r = c.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };
    /* v2.3.2245: isGestureTouch is gone -- the harvest gesture is performed on
       the right button (ExtractionSwipeLayer anchors on .bt-rjoy-base), so no
       world-space touch is ever a gesture touch. */
    var isSelfTouch = function (clientX, clientY) {
      var S = stateRef.current;
      var cam = S && S.camera, P = S && S.player;
      if (!cam || !P) return false;
      /* v2.3.1111 lesson: world px -> CSS px needs the published
         renderer scale (WORLD_ZOOM), or every tap is ~25% radially off.
         (isReelTouch above predates the fix but its 170px radius
         tolerates the error; this 52px one doesn't.) */
      var sx = S._worldScaleX || 1.0;
      var sy = S._worldScaleY || 1.0;
      var _p = clientToCanvas(clientX, clientY);   /* v2.3.2174 */
      var dx = _p.x - (P.x - cam.x) * sx;
      var dy = _p.y - (P.y - 24 - cam.y) * sy;
      var r = 52 * sx;
      return (dx * dx + dy * dy) < (r * r);
    };
    /* v2.3.1448: the floating joystick zones sit OVER the canvas, so the
       canvas's own touch handlers never see a tap that lands inside one —
       lE/rE forward it as a synthetic click instead.  But the self-tap
       chat gesture (isSelfTouch, ~42 CSS px around the character) claims
       the tap BEFORE that forward, and an in-reach ore vein or campfire
       sits inside exactly that circle — so "touch the resource to open
       its menu" opened chat instead.  Resource wins when its art is under
       the finger; a self-tap on bare character still opens chat. */
    var tapResourceAtClient = function (clientX, clientY) { return false; };   /* v2.3.2245: no tap-to-harvest */
    /* (v2.3.2245: the client-coordinate wrapper went with _tapResourceAt.) */
    var openSelfChat = function () {
      try {
        var _busC = window.__broDashPanelBus;
        if (_busC && _busC.state.mode !== 'bar') _busC.toBar(); /* v2.3.1290 */
      } catch (_e3) {}
      try { chatBubbleBus.setOpen(true); } catch (_e4) {}
    };
    /* v2.3.1324 (Friends server round): AWAY presence — stamp the last
       real user input; the 2s track relay below carries aw:1 after two
       idle minutes, and peers read it straight off S.others (the
       player_update handler Object.assigns every track field).  Window-
       level capture listeners so joystick, toolbar, and panel touches
       all count as activity. */
    stateRef.current._lastInputAt = Date.now();
    var _stampInput = function () { stateRef.current._lastInputAt = Date.now(); };
    window.addEventListener('touchstart', _stampInput, { passive: true, capture: true });
    window.addEventListener('pointerdown', _stampInput, { passive: true, capture: true });
    window.addEventListener('keydown', _stampInput, { passive: true, capture: true });
    /* v2.3.1913: wheel too, now that this clock decides whether to log the
       character out and not just whether to show peers an AWAY pip.  A
       desktop player scrolling a long panel is present, and scrolling is
       the one common input that fires none of the three above. */
    window.addEventListener('wheel', _stampInput, { passive: true, capture: true });
    /* v2.3.1323 (Friends round): the dash Friends views open a friend's
       profile via this bridge — same InspectPlayerPanel the world-tap
       flow uses, built from the live S.others peer entry.  Returns true
       when the peer is live (caller then drops the sheet so the inspect
       card has the world behind it); false for offline friends, whose
       data the client simply doesn't have. */
    window.__broInspectPlayer = function (fid) {
      var S2 = stateRef.current;
      var o = S2 && S2.others && S2.others[fid];
      if (!o) return false;
      setInspectPlayer({
        id: fid, name: o.name, color: o.color, avatar: o.avatar, bro: o.bro,
        x: o.x, y: o.y, rpgLv: o.rpgLv, rpgData: o.rpgData, pet: o.pet,
        rep: o.rep, clanTag: o.clanTag, clanColor1: o.clanColor1,
      });
      return true;
    };
    /* Left joystick double-tap = cycle weapon (melee -> ranged -> staff).
       Constants shared with the right joystick at the head of this
       useEffect so both gestures use the same tap-vs-drag classifier.
       v2.3.98: window tightened from 350->220 ms after user feedback
       that a quick re-press to start moving after a swap was being
       counted as a second tap and double-cycling the weapon. */
    var DOUBLE_TAP_WINDOW_MS = 220;
    var TAP_MAX_DURATION_MS = 200;
    var SELF_TAP_MAX_MS = 400; /* v2.3.1287: chat self-tap dwell ceiling */
    var TAP_MAX_MOVE_SQ_PX = 100; /* 10 px squared */
    var DOUBLE_TAP_MAX_DIST_SQ_PX = 2500; /* 50 px squared */
    var PREVIEW_HOLD_MS = 350;
    var SLOT_ICON = { melee: 'sword', ranged: 'bow', staff: 'staff' };
    /* v2.3.1845: the SAME rotation the double tap performs (weaponSlots.js).
       This is the preview that drew the bow the owner reported — it was a
       second copy of the loop with 'ranged' ungated, so it promised a weapon
       the character did not own, and the tap then delivered it. */
    var getNextWeaponSlot = function () {
      var S2 = stateRef.current;
      if (!S2 || !S2.rpg) return 'melee';
      return nextWeaponSlot(S2.rpg);
    };
    var lS = function lS(e) {
      /* v2.3.848: while the chop swipe window is open, the joystick zones
         must NOT grab the touch — the axe-grab swipe was walking the
         character around.  The chop swipe is handled by the window-level
         pointer layer (ExtractionSwipeLayer), a separate event stream, so
         bailing here leaves it working while stopping movement. */
      /* v2.3.1429: was a blanket "ready => no movement" bail (v2.3.848);
         now only touches near the gesture cue are ceded — see
         isGestureTouch above.  Walking away mid-gesture cancels. */
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      /* v2.3.2245: the harvest gesture lives on the right button now, so the movement zone cedes nothing. */
      /* v2.3.1307: the v2.3.1283 "movement collapses the sheet"
         interlock is REMOVED (owner: players may just want to play
         with menus open).  The joystick zones end above the sheet
         (height keys off --sheet-h in TouchControls), so a touch here
         is world-intent AND the sheet stays put. */
      var nowMs = Date.now();
      var lts = lTapState.current;
      lTouchId.current = t.identifier;
      joystickActive.current = true;
      /* v2.3.949: docked joystick -- the base stays in its corner (50% opacity);
         do NOT move it to the finger.  The touch point recorded below is the
         deflection origin (handleJoystickMove reads lTapState.startX/Y). */
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
        /* v2.3.1287: a tap ON the character opens chat and consumes —
           BEFORE the double-tap weapon-cycle classifier, so a self-tap
           never counts as tap #1 or #2 of a cycle, and no synthetic
           lock-on click is forwarded.  Own 400ms ceiling (see rE). */
        if (!lts.moved && (endT - lts.startAt) < SELF_TAP_MAX_MS
            && isSelfTouch(t.clientX, t.clientY)) {
          lts.lastEndAt = 0;
          openSelfChat();
          return;
        }
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
            /* v2.3.1122: forward the tap to the canvas as a synthetic
               click, exactly like the right zone (rE) has done since
               v2.3.816 -- the floating zones sit OVER the canvas, so
               without this the tap-to-lock-on hit-test never heard
               about taps on the LEFT half of the screen at all (the
               reported "lock-on only works on the right side" bug).
               Only the FIRST tap forwards; the second tap of a
               weapon-cycle double-tap doesn't, so a double-tap on a
               monster doesn't lock-then-instantly-unlock it. */
            try {
              if (canvasRef.current) {
                canvasRef.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }));
              }
            } catch (err) {}
            /* Show the NEXT weapon slot as a preview inside the disc
               so the player can confirm the swap target before
               committing to the second tap.  Window auto-closes
               after PREVIEW_HOLD_MS. */
            if (lJoyPreviewRef.current) {
              var nextSlot = getNextWeaponSlot();
              /* v2.3.1845: with one weapon there is no swap target, and a
                 preview of the weapon you are already holding is a promise
                 the second tap cannot keep — nextWeaponSlot returns the
                 CURRENT slot to say so.  Hide the disc instead of drawing it.
                 (Written as an else rather than an early return: this sits
                 inside the touch-end handler, and bailing out of it here
                 would skip the tap bookkeeping below.) */
              var curSlot = (stateRef.current.rpg && stateRef.current.rpg.activeSlot) || 'melee';
              if (nextSlot === curSlot) {
                lJoyPreviewRef.current.style.display = 'none';
              } else {
                lJoyPreviewRef.current.textContent = SLOT_ICON[nextSlot] || 'sword';
                lJoyPreviewRef.current.style.display = 'flex';
                if (lPreviewTimer.current) clearTimeout(lPreviewTimer.current);
                lPreviewTimer.current = setTimeout(function () {
                  if (lJoyPreviewRef.current) lJoyPreviewRef.current.style.display = 'none';
                }, PREVIEW_HOLD_MS);
              }
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
    /* ═══ v2.3.2242: THE RIGHT HALF FORWARDS TAPS; THE BUTTON FIGHTS ═══
       rZoneRef (the whole right half, z6) used to BE the combat input: any
       touch there was a relative drag that aimed and auto-attacked, a
       double-tap-and-hold raised the shield, a flick was the special.  The
       owner replaced the stick with a button, so the zone keeps exactly one
       job -- forwarding a short tap to the canvas (tap a monster to lock on
       manually, tap yourself to chat, tap a resource) -- and the DISC
       (rJoyRef, pointerEvents:auto since v2.3.2242) takes press / hold /
       flick.  Drags on the zone do nothing: the dodge is the LEFT-side
       swipe and the owner kept it there. */
    var rS = function rS(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      var rts = rTapState.current;
      rTouchId.current = t.identifier;
      rts.startAt = Date.now();
      rts.startX = t.clientX;
      rts.startY = t.clientY;
      rts.moved = false;
    };
    var rM = function rM(e) {
      if (rTouchId.current === null) return;
      var t = findT(e.touches, rTouchId.current);
      if (t) {
        e.preventDefault();
        var rts2 = rTapState.current;
        var dxs = t.clientX - rts2.startX;
        var dys = t.clientY - rts2.startY;
        if (dxs * dxs + dys * dys > TAP_MAX_MOVE_SQ_PX) rts2.moved = true;
      }
    };
    var rE = function rE(e) {
      if (rTouchId.current === null) return;
      var t = findT(e.changedTouches, rTouchId.current);
      if (!t) return;
      rTouchId.current = null;
      var rts3 = rTapState.current;
      var endT = Date.now();
      /* v2.3.1287: self-tap on the aim side opens chat -- no lock-on click.
         Its own 400ms ceiling (SELF_TAP_MAX_MS): opening chat is not a
         twitch gesture, so a deliberate thumb dwell still counts. */
      if (!rts3.moved && (endT - rts3.startAt) < SELF_TAP_MAX_MS
          && isSelfTouch(t.clientX, t.clientY)) {
        openSelfChat();
        return;
      }
      if (!rts3.moved && (endT - rts3.startAt) < TAP_MAX_DURATION_MS) {
        /* v2.3.816: a tap on the combat side forwards a synthetic click to
           the canvas so the existing tap-to-lock-on-target logic (monsters /
           NPCs / players / empty-space unlock) keeps working now that the
           floating zone sits over the canvas. */
        try {
          if (canvasRef.current) {
            canvasRef.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }));
          }
        } catch (err) {}
      }
    };

    /* THE BUTTON.  Press = engage + swing + auto-attack while held; release
       = stop; a quick flick across it = special (the same classifier the
       stick's release used -- last-leg speed OR total-path speed -- so the
       gesture the coach teaches is byte-for-byte the one that fires). */
    var bSwipe = { sx: 0, sy: 0, st: 0, lx: 0, ly: 0, lt: 0 };
    var bTouchId = { current: null };
    var bS = function bS(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      if (!t) return;
      if (bTouchId.current !== null) return;   /* one finger owns the button */
      bTouchId.current = t.identifier;
      rJoyActive.current = true;
      bSwipe.sx = t.clientX; bSwipe.sy = t.clientY; bSwipe.st = Date.now();
      bSwipe.lx = 0; bSwipe.ly = 0; bSwipe.lt = 0;
      /* ═══ v2.3.2245: THE BUTTON IS CONTEXTUAL ═══
         A harvest in progress owns the button: the press is the gesture
         (ExtractionSwipeLayer takes it at the pointer level), not a swing.
         A resource in reach with no monster in the perimeter: the press
         STARTS the harvest -- exactly what the old shell's tap did.
         Otherwise it is Attack. */
      var Sb = stateRef.current;
      if (Sb && Sb._extraction) { bSwipe.harvest = true; return; }
      bSwipe.harvest = false;
      if (Sb && Sb._btnHarvest && Sb._nearNode) {
        var _hn = Sb._nearNode;
        try {
          if (_hn.nodeType === 'fishSpot') _startExtraction(_hn, 'fishing');
          else if (_hn.nodeType === 'tree') _startExtraction(_hn, 'woodcutting');
          else if (_hn.nodeType === 'oreVein') _startExtraction(_hn, 'mining');
          else if (_hn.nodeType === 'campfire') _startCookingAtCampfire(_hn);
        } catch (err) { /* refusal floats its own popup */ }
        bSwipe.harvest = true;
        return;
      }
      handleRBtnPress();
      doSwing();
    };
    var bM = function bM(e) {
      if (bTouchId.current === null) return;
      var t = findT(e.touches, bTouchId.current);
      if (t) {
        e.preventDefault();
        bSwipe.lx = t.clientX; bSwipe.ly = t.clientY; bSwipe.lt = Date.now();
      }
    };
    var bE = function bE(e) {
      if (bTouchId.current === null) return;
      var t = findT(e.changedTouches, bTouchId.current);
      if (!t) return;
      bTouchId.current = null;
      /* v2.3.2245: a harvest press is not a swing and its release is not a
         flick -- a fast chop on the button must never fire the special. */
      if (bSwipe.harvest) { bSwipe.harvest = false; rJoyActive.current = false; return; }
      /* Flick detection -- last-leg speed (recent burst) OR
         total-distance/total-duration speed (slow but committed). */
      var refX = bSwipe.lx || bSwipe.sx;
      var refY = bSwipe.ly || bSwipe.sy;
      var refT = bSwipe.lt || bSwipe.st;
      var dx = t.clientX - refX, dy = t.clientY - refY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dur = Date.now() - refT;
      var spd = dist / Math.max(dur, 1);
      var totalDx = t.clientX - bSwipe.sx, totalDy = t.clientY - bSwipe.sy;
      var totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      var totalDur = Date.now() - bSwipe.st;
      var totalSpd = totalDist / Math.max(totalDur, 1);
      var isFlick = (spd > 0.15 && dist > 8 && dur < 400)
        || (totalSpd > 0.2 && totalDist > 15 && totalDur < 500);
      if (isFlick) {
        var Sfk = stateRef.current;
        Sfk._hasUsedSwipe = true;
        /* The flick direction still seeds the aim for an UNLOCKED special;
           specialAttack itself prefers the locked target (lockAimPoint). */
        var useDx = totalDist > dist ? totalDx : dx;
        var useDy = totalDist > dist ? totalDy : dy;
        var flickAng = Math.atan2(useDy, useDx);
        if (!(Sfk.lockedTarget && Sfk.lockedTarget.ref)) {
          Sfk._aimAngle = flickAng;
          Sfk._facing = Math.abs(useDx) > Math.abs(useDy)
            ? (useDx > 0 ? 'right' : 'left')
            : (useDy > 0 ? 'down' : 'up');
        }
        doSpecialAttack();
      }
      handleRBtnRelease();
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
    /* v2.3.2242: the BUTTON's own listeners.  touchstart on the disc
       (stopPropagation keeps it off the zone beneath); move/end at the
       window so a flick may run off the disc, exactly as the stick's did. */
    var bBase = rJoyRef.current;
    if (bBase) {
      bBase.addEventListener('touchstart', bS, {
        passive: false
      });
      window.addEventListener('touchmove', bM, {
        passive: false
      });
      window.addEventListener('touchend', bE, {
        passive: false
      });
      window.addEventListener('touchcancel', bE, {
        passive: false
      });
    }
    /* v2.3.2242: the legacy shield joystick (sS/sM/sE on shieldJoyRef) is
       gone -- the shield is ShieldButton, a toggle, no handlers here. */
    return function () {
      window.removeEventListener('touchstart', _stampInput, { capture: true });
      window.removeEventListener('pointerdown', _stampInput, { capture: true });
      window.removeEventListener('keydown', _stampInput, { capture: true });
      window.removeEventListener('wheel', _stampInput, { capture: true }); /* v2.3.1913 */
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
      if (bBase) {
        bBase.removeEventListener('touchstart', bS);
        window.removeEventListener('touchmove', bM);
        window.removeEventListener('touchend', bE);
        window.removeEventListener('touchcancel', bE);
      }
    };
  }, [showNameModal, showLogin, bootPhase, handleJoystickMove, handleJoystickEnd, handleRJoyMove, handleRJoyEnd, handleCanvasSwipe]);   /* v2.3.1869; v2.3.2242: handleShieldMove gone */

  /* Keep keyboard open — focus input when game starts and periodically re-focus */
  useEffect(function () {
    /* v2.3.1869: bootPhase — the login door (v2.3.1814) is a third pre-game
       screen this guard never knew about, and the refs below only exist once
       the game UI renders.  Without it this effect runs while the door is up,
       bails on a null ref, and never re-runs; see the game-loop effect for
       the full account. */
    if (showNameModal || showLogin || bootPhase !== null) return;
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
  }, [showNameModal, showLogin, bootPhase]);   /* v2.3.1869 */
  /* ═══ v2.3.1814: DOES THIS DEVICE'S KEY ALREADY HAVE A CHARACTER? ═══
     Asked over the READ-ONLY account endpoint, before connecting, and that
     choice is load-bearing rather than incidental: the alternative — join
     first and decide from state_sync — would have the client send its
     current (default) trait catalogs on that join, and the worker locks in
     the first look it is sent.  Deciding before we connect is what stops
     the boot check itself from minting a blank permanent character.

     Three outcomes, and the failure branch is the interesting one: if the
     worker is old, unreachable, or simply says no, we fall through to the
     login screen.  That is the safe direction — the worst case is a player
     who has to tap "Log in with your Key" once, rather than one who gets
     dropped into the creator and makes a second character by accident. */
  var _bootRan = useRef(false);
  useEffect(function () {
    if (_bootRan.current) return;
    _bootRan.current = true;
    var alive = true;
    (function () {
      /* ═══ v2.3.1840: LOGGING OUT LANDS ON THE DOOR, NOT BACK INSIDE ═══
         Owner: "log out behavior should bring you back to main splash screen
         of create new character or the use key option.  Right now it doesn't."

         It didn't because logout reloaded with `?noresume=1`, and that flag
         only suppresses the RESUME SNAPSHOT (the 10-minute rejoin further
         down this file).  The boot check below is a separate road into the
         world: it finds the stored key, asks the worker whether that key has
         a character, and on yes sets bootPhase null — which auto-joins.  So
         logging out reloaded the page and walked straight back in.

         `?login=1` says "show me the door".  The key is deliberately NOT
         cleared: characters are permanent and the passphrase IS the
         character, so wiping it to force the login screen would throw the
         character away to fix a routing bug.  LoginScreen offers both of the
         things the owner asked for — "Log in with your Key" (which still has
         the stored key) and "Create Character". */
      /* ═══ v2.3.1861: `?create=1` — the door said replace, and meant it ═══
         Set by the login screen's "Create new character" answer AFTER it has
         minted a fresh key.  It has to be its own road: with a new key the
         boot check below would find no character and route to the door,
         which would put the player back on the screen they just answered. */
      var _forceCreate = false;
      try { _forceCreate = /[?&]create=1\b/.test(window.location.search); } catch (e) { _forceCreate = false; }
      if (_forceCreate) {
        if (alive) setBootPhase('create');
        try { window.__btBootRoute = 'create-forced'; } catch (e) {}
        return;
      }
      var _forceLogin = false;
      try { _forceLogin = /[?&]login=1\b/.test(window.location.search); } catch (e) { _forceLogin = false; }
      if (_forceLogin) {
        if (alive) setBootPhase('login');
        try { window.__btBootRoute = 'login-forced'; } catch (e) {}
        /* v2.3.1861: ...and find out whether this key still has a character,
           because the door needs to know before its Create button is pressed.
           Deliberately AFTER setBootPhase: the screen paints immediately and
           the name arrives when it arrives.  A failed check leaves
           existingName null, which degrades to the old straight-through
           behaviour rather than blocking the button on a network call. */
        try {
          var _p = getBtPassphrase();
          if (_p) {
            checkAccountLogin(_p).then(function (res) {
              if (!alive) return;
              if (res && res.ok && res.exists && res.preview && res.preview.hasChar) {
                /* v2.3.1923: the roster self-heals here.  This is the answer
                   to "does the key on this device have a character", asked on
                   every load — so any key the migration could not vouch for
                   locally (charRoster.js) gets its row, with its name, the
                   first time the player passes through the door.
                   ensureChar, NOT rememberChar: standing at the door is not
                   playing, and the list is sorted by when you last played. */
                try { ensureChar(_p, { name: res.preview.name || '', level: res.preview.level || 0 }); } catch (e2) {}
              }
            }).catch(function () {});
          }
        } catch (e) {}
        return;
      }
      var phrase = null;
      try { phrase = getBtPassphrase(); } catch (e) { phrase = null; }
      if (!phrase) { if (alive) setBootPhase('login'); return; }
      checkAccountLogin(phrase).then(function (res) {
        if (!alive) return;
        if (res && res.ok && res.exists && res.preview && res.preview.hasChar) {
          /* Straight in.  The NAME comes from the record via state_sync a
             moment later (wsClient applies it); nameInput is seeded here so
             joinTown's `nameInput.trim() || 'Anon'` cannot stamp 'Anon'
             over a real character in the window before that arrives. */
          if (res.preview.name) setNameInput(res.preview.name);
          /* v2.3.1923: same self-heal as the forced-login road above, on the
             road most players actually take — straight in.  Also ensureChar:
             the play stamp is joinTown's job a moment from now, and doing it
             twice from two places is how the two start disagreeing. */
          try { ensureChar(phrase, { name: res.preview.name || '', level: res.preview.level || 0 }); } catch (e2) {}
          setBootPhase(null);
          try { window.__btBootRoute = 'resume'; } catch (e) {}
        } else {
          setBootPhase('login');
          try { window.__btBootRoute = 'login'; } catch (e) {}
        }
      }).catch(function () {
        if (!alive) return;
        setBootPhase('login');
        try { window.__btBootRoute = 'login'; } catch (e) {}
      });
    })();
    return function () { alive = false; };
  }, []);

  /* Walking in with a stored character: joinTown is the same entry the
     creator's ENTER button uses, so there is ONE way into the world and no
     second path to keep in step.  Held until the phase settles to null AND
     the name has been seeded, so the join carries the right name. */
  var _autoJoined = useRef(false);
  useEffect(function () {
    if (bootPhase !== null || _autoJoined.current) return;
    _autoJoined.current = true;
    try { joinTown(); } catch (e) {
      /* ═══ v2.3.1866: THIS CATCH USED TO ERASE ITS OWN EVIDENCE ═══
         Owner: "When I try to continue my character the screen is black."
         A throw in joinTown lands here, and the only thing that happened was
         a silent bounce back to the login door — no console error (a caught
         exception is not a pageerror), no crash record, nothing on screen to
         say the join had failed.  The player is left looking at the door's
         dark backdrop, which is what "black" is from the outside, and every
         test that checked identity rather than the screen still passed.
         So the error is now RECORDED before the fallback: crashTrap for the
         cross-reload log, and a window probe so a headless run can read the
         message that was previously destroyed here. */
      try {
        window.__btJoinError = { message: String((e && e.message) || e), stack: String((e && e.stack) || '').slice(0, 800), at: Date.now() };
      } catch (e2) {}
      try {
        import('../debug/crashTrap.js').then(function (ct) {
          ct.recordCrash('join-threw', String((e && e.message) || e));
        }).catch(function () {});
      } catch (e3) {}
      /* fall back to the login door */
      setBootPhase('login');
    }
  }, [bootPhase]);

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
    /* v2.3.1116: persistent identity -- bt_passphrase / bt_rpg / bt_stats
       / bt_tutorial / bt_codex are NO LONGER wiped on PLAY.  The old
       "fresh start for everyone" wipe was the demo-reset posture, and it
       was the reason nothing could ever persist: it deleted the passphrase
       (so every session joined under a fresh random id) and the rpg cache
       on every single PLAY click.  The server's stored record is
       authoritative on reconnect (state_sync overwrites); the local copy
       below is just the fast-start cache, same as the boot initializer.
       Room state still clears so wsClient never locks to a stale room
       (v2.3.222 removed the room code input field). */
    try {
      localStorage.removeItem('bt_room');
      localStorage.removeItem('bt_room_code');
    } catch (e) {}
    /* RPG state: reuse the cached copy when it's the current stat system
       (same `power` check as the boot initializer at ~line 1920); fresh
       otherwise.  Guests (?guest=1) always start fresh -- their random id
       has no server record, and bootstrapping the main identity's cached
       values onto a throwaway would just be confusing. */
    var _cachedRpg = null;
    try {
      if (!/[?&]guest=1\b/.test(window.location.search)) {
        _cachedRpg = JSON.parse(localStorage.getItem('bt_rpg'));
      }
    } catch (e) {}
    S.rpg = (_cachedRpg && _cachedRpg.power !== undefined) ? _cachedRpg : createDefaultRpg();
    if (!S.rpg.inventory) S.rpg.inventory = {};
    if (!S.rpg.lifeSkills) S.rpg.lifeSkills = createDefaultLifeSkills();
    S.rpg.lifeSkills = migrateLifeSkills(S.rpg.lifeSkills);
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
    /* ═══ v2.3.1923: THE ROSTER LEARNS WHO THIS KEY IS ═══
       Stamped here, on PLAY, because this is the moment both halves are known
       at once — the name is settled and the rpg blob is loaded — and it is
       also what puts the row at the top of the picker's list ("most recent at
       the top", owner).  A roster filled this way needs no network to draw
       itself; the lookup pass in CharacterPicker exists only for rows this
       never ran for.

       GUESTS ARE EXCLUDED, and this is the one place it matters.  ?guest=1
       keeps the device's real passphrase in localStorage and only swaps the
       ID (the myId initialiser at the top of this file), so a guest session
       is a DIFFERENT character playing under the same key on this device.
       Stamping here would write the throwaway's name and level onto the real
       character's row — the row the player later taps to continue. */
    try {
      if (!/[?&]guest=1\b/.test(window.location.search)) {
        var _rosterPf = getBtPassphrase();
        if (_rosterPf) rememberChar(_rosterPf, { name: S.myName, level: (S.rpg && S.rpg.level) || 0 });
      }
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
  /* v2.3.1814: the login door, and the blank hold while we ask whether this
     key already has a character.  Both return BEFORE the creator: the
     creator is now something you choose, not the default landing. */
  /* v2.3.1866 dev probe: WHICH PRE-GAME SCREEN THIS RENDER CHOSE, and the
     three flags that choose it.  Chasing the owner's black screen, every
     other reading agreed the join had run (S.myName had been stamped by
     joinTown) while the door was still on screen — and nothing published the
     one number that decides that, so there was no way to tell "the phase went
     back" from "the phase never moved".  Stamped on every render, cheap. */
  try {
    if (typeof window !== 'undefined') {
      window.__btPhase = { bootPhase: bootPhase, showIntro: showIntro,
        showNameModal: showNameModal, at: Date.now() };
    }
  } catch (e) {}
  if (bootPhase === 'checking' || bootPhase === 'login') {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      checking: bootPhase === 'checking',
      /* ═══ v2.3.1923: PLAYING A ROW FROM THE PICKER ═══
         Two roads, and which one is taken is decided by activateChar rather
         than by this handler: it returns true only when the ACTIVE key
         actually changed.

         When it did, this MUST reload and cannot simply drop the pre-game
         screen.  S.myId was derived from the old phrase when this component's
         state object was built (the myId initialiser at the top of this
         file), and the module-level identity helpers have already read it —
         so continuing in place would join the world as the character the
         player just navigated away from.  Same reasoning v2.3.1861 records
         for the create road, and the same fix.

         When it did not — the tapped row IS the character this device is
         already on — there is nothing to reload for, and bootPhase null is
         the ordinary returning-player road (the auto-join effect owns it). */
      onPlay: function onPlay(phrase) {
        var switched = false;
        try { switched = activateChar(phrase); } catch (e) { switched = false; }
        if (!switched) { setBootPhase(null); return; }
        try {
          /* Plain '/' deliberately: this door is most often reached BY
             LOGGING OUT, which navigates to '/?noresume=1&login=1'
             (v2.3.1840).  Reloading with those still on would land the
             player back on the door they just chose a character from. */
          var _gp = /[?&]guest=1\b/.test(window.location.search) ? '/?guest=1' : '/';
          window.location.href = _gp;
        } catch (e) { setBootPhase(null); }
      },
      onCreateNew: function onCreateNew() {
        /* ═══ v2.3.1861: REPLACING A CHARACTER ═══
           Owner: "...otherwise it'll be overwritten with the new character."

           A NEW KEY is what does it, and the choice of mechanism matters.
           The alternative was the server-side wipe (`character_reset`,
           v2.3.1347) — but that needs a LIVE socket, and nobody at this door
           has joined anything yet, so it would have to connect as the old
           character purely to delete it.  Minting a key needs no socket and
           destroys nothing: this device gets a genuinely new character, and
           the old one is still there under its own Login Key for anyone who
           wrote it down.  The dialog says exactly that before this runs.

           The previous phrase is stashed the way the auth-rejection path
           already stashes it (v2.3.1143), so a player who replaces a
           character they meant to keep is one devtools read from recovering
           it rather than nothing at all. */
        /* ═══ v2.3.1923: THE CONDITION IS THE ROSTER, NOT THE WARNING ═══
           This used to fire only when the door had managed to look up a name
           for the current key (`existingName`), because the mint was tied to
           the "you already have a character" dialog that asked permission to
           replace it.  Nothing is replaced any more — the outgoing key stays
           on the device as a row in the picker — so the mint is no longer a
           destructive act needing consent, it is simply what CREATE means:
           a new character needs a key that is not already somebody.

           Asking the roster instead of the lookup also closes the hole the
           old condition had.  `existingName` is set by a NETWORK call, so a
           device whose check was slow or offline fell through to the else
           branch and built the new character on a key that already had one —
           and the worker, which locks char:<id> on first join, handed the OLD
           character straight back (charLock, v2.3.1861).  inRoster is local
           and always knows. */
        /* ═══ v2.3.1923b: ...AND THE KEY THAT MOVED UNDER THE SESSION ═══
           There is a second way to arrive here needing a reload, and it is
           three taps away: Continue -> delete the character this device is on
           -> Back -> Create.  The delete removed `bt_passphrase`, but S.myId
           was derived from it when this page loaded and is still the DELETED
           character's id.  A create road that only asks localStorage sees
           "no key, nothing taken, go ahead", runs the creator on that stale
           id, and the worker hands the deleted character back — the v2.3.1861
           charLock bug, through a door that did not exist when it was fixed.
           Measured in mp-roster before this line existed: same bp_ id before
           the delete and inside the creator after it.

           So the question is not only "is this key taken" but "is this key
           still the one this session IS".  Either answer means reload; only
           the mint differs, because a key that is nobody yet is a perfectly
           good key to build a character on. */
        var _curPf = null;
        try { _curPf = localStorage.getItem('bt_passphrase'); } catch (e) { _curPf = null; }
        var _taken = false;
        try { _taken = inRoster(_curPf); } catch (e) { _taken = false; }
        var _stale = !_curPf || !stateRef.current
          || passphraseToId(_curPf) !== stateRef.current.myId;
        if (_taken || _stale) {
          try {
            var _prev = _curPf;
            /* Mint only when the current key is somebody, or when there is
               no key at all.  A key that exists and belongs to nobody is
               already what a new character needs — replacing it would just
               strand it. */
            if (_taken || !_curPf) {
              /* Kept for one more release: the stash predates the roster and
                 something else may still read it.  It is no longer the only
                 copy of the outgoing key — the roster row is. */
              if (_prev) localStorage.setItem('bt_passphrase_prev', _prev);
              localStorage.setItem('bt_passphrase', generatePassphrase());
            }
            /* The stale per-character caches belong to the character being
               left behind; carrying them into a new one is how a "new"
               character shows up wearing old progress. */
            ['bt_rpg', 'bt_stats', 'bt_codex', 'bt_bestiary', 'bt_materials', 'bt_zones', 'bt_resume'].forEach(function (k) {
              localStorage.removeItem(k);
            });
            try { sessionStorage.removeItem('bt_resume'); sessionStorage.removeItem('bt_resume_now'); } catch (e2) {}
          } catch (e) {}
          /* Reload rather than setBootPhase('create'): S.myId was derived
             from the OLD phrase when this component's state was built, so
             the creator would otherwise mint a character against the very
             identity we just walked away from. */
          try {
            var _g = /[?&]guest=1\b/.test(window.location.search) ? '&guest=1' : '';
            window.location.href = '/?create=1' + _g;
            return;
          } catch (e) {}
        }
        setBootPhase('create');
      },
    });
  }
  if (showNameModal) {
    return /*#__PURE__*/React.createElement(NameModal, { onBack: backToMenu, /* v2.3.2219 */ _dragRotX: _dragRotX, _swatchTile: _swatchTile, _thumbTile: _thumbTile, _buildTile: _buildTile, activeCat: activeCat, heightSel: heightSel, setHeightSel: setHeightSel, frameSel: frameSel, setFrameSel: setFrameSel, beardColorSel: beardColorSel, facialHairSel: facialHairSel, hairColorSel: hairColorSel, hairSel: hairSel, hatColorSel: hatColorSel, eyeColorSel: eyeColorSel, setEyeColorSel: setEyeColorSel, headwearSel: headwearSel, joinTown: joinTown, nameInput: nameInput, pantsSel: pantsSel, previewCanvasRef: previewCanvasRef, previewDir: previewDir, previewZoom: previewZoom, setPreviewZoom: setPreviewZoom, randomizeWithFlair: randomizeWithFlair, resetLook: resetLook, rollRandomName: rollRandomName, rotatePreview: rotatePreview, setActiveCat: pickPreviewCat, setBeardColorSel: setBeardColorSel, setFacialHairSel: setFacialHairSel, setHairColorSel: setHairColorSel, setHairSel: setHairSel, setHatColorSel: setHatColorSel, setHeadwearSel: setHeadwearSel, setNameInput: setNameInput, setPantsSel: setPantsSel, setShirtColorSel: setShirtColorSel, setShirtSel: setShirtSel, setShoesSel: setShoesSel, setSkinSel: setSkinSel, shirtColorSel: shirtColorSel, shirtSel: shirtSel, shoesSel: shoesSel, skinSel: skinSel });
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /* v2.3.1925: the mystery-reveal ceremony.  Mounted at the top of the in-world fragment and ALWAYS mounted — it renders null until a hidden grade arrives on the loot credit, and mounting it conditionally would mean the queue it subscribes to could fill before anyone was listening. */ /*#__PURE__*/React.createElement(RevealOverlay, null), showIntro && /*#__PURE__*/React.createElement(IntroVideo, {
    waitFor: introWaitRef.current,
    themeAudio: themeAudioRef,
    /* v2.3.1219: when the loading intro fades, greet a brand-new player with
       the Mayor's welcome (once per browser).  Returning players — whose
       localStorage flag is already set — drop straight into town.
       v2.3.1593 (owner: "remove the tutorial and the mayor bro pop up and
       greeting"): the trigger is gone, so EVERY player now drops straight
       into town.  showMayorGreeting stays wired below rather than being
       ripped out — it is a plain boolean that nothing else sets, so the
       component is simply unreachable, and restoring the greeting is this
       one line.  Same treatment wireThemeMusic got in v2.3.1103. */
    onComplete: function onComplete() {
      /* v2.3.1721: stamp the moment the world becomes VISIBLE.  The
         black-screen watchdog needs it: before this instant a dark canvas is
         correct (the overlay is covering it), and after it a dark canvas is
         the bug the owner reported. */
      try { if (stateRef.current) stateRef.current.__introLiftedAt = Date.now(); } catch (e) {}
      /* v2.3.2121 (owner: "first time upon joining the game you get a message
         about welcome to bro town and find the mayor"): here, because this is
         the instant the world becomes visible — the same beat the v2.3.1593
         greeting used to take.  It is a MESSAGE, not that removed video; see
         welcomeBanner.js.  Once per browser, and it never throws. */
      maybeShowWelcome();
      setShowIntro(false);
    }
  }), showMayorGreeting && /*#__PURE__*/React.createElement(MayorGreeting, {
    onComplete: function onComplete() { return setShowMayorGreeting(false); }
  }),
  /* v2.3.1239: owner feedback — first-join tutorial OPT-IN prompt.  One small
     unobtrusive Lantern Slate card above the dashboard, shown only to a
     brand-new player once the loading intro + Mayor greeting have cleared.
     "Start tour" begins the EXISTING teach-by-doing flow (tourStarted +
     tutorialStep 0 → the step banners run); "No thanks"/✕ suppresses it and
     writes the same bt_tutorial='10' completion flag the finished tutorial
     sets, so it never reappears. */
  showTourPrompt && !showIntro && !showMayorGreeting && /*#__PURE__*/React.createElement("div", {
    onPointerDown: function onPointerDown(e) { e.stopPropagation(); },
    style: {
      position: 'fixed',
      left: '50%',
      bottom: 'calc(var(--dash-h) + 12px)',
      transform: 'translateX(-50%)',
      zIndex: 31,
      width: 'min(92vw, 320px)',
      pointerEvents: 'auto',
      fontFamily: 'Source Sans 3, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'rgba(13,22,27,0.92)',
      border: '1px solid rgba(229,237,233,0.20)',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      color: '#F4F0E7',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss tour prompt",
    onClick: function onClick() {
      setShowTourPrompt(false);
      setTutorialStep(10);
      try {
        localStorage.setItem('bt_tutorial', '10');
      } catch (e) {}
    },
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 44,
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'none',
      border: 'none',
      color: 'rgba(244,240,231,.6)',
      fontSize: 15,
      lineHeight: 1,
      cursor: 'pointer',
      padding: 0
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.3,
      paddingRight: 30
    }
  }, "New here? Want a quick tour?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      setShowTourPrompt(false);
      setTourStarted(true);
      setTutorialStep(0);
    },
    style: {
      flex: 1,
      minHeight: 44,
      background: '#D8AA58',
      color: '#172126',
      border: 'none',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: '.03em',
      cursor: 'pointer',
      fontFamily: 'Source Sans 3, sans-serif'
    }
  }, "Start tour"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      setShowTourPrompt(false);
      setTutorialStep(10);
      try {
        localStorage.setItem('bt_tutorial', '10');
      } catch (e) {}
    },
    style: {
      flex: 1,
      minHeight: 44,
      background: '#293B41',
      color: '#F4F0E7',
      border: '1px solid rgba(229,237,233,0.20)',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.03em',
      cursor: 'pointer',
      fontFamily: 'Source Sans 3, sans-serif'
    }
  }, "No thanks")))), /*#__PURE__*/React.createElement("div", {
    className: "brotown-wrap",
    ref: wrapRef,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      /* ═══ v2.3.1728: 100vw -> 100%, THE DESKTOP MODAL BLOCKER ═══
         A REGRESSION FROM v2.3.1715, live in production since it merged:
         every modal in the game was unreachable on desktop.  Bisected —
         tools/qa/mp/mp-questline.mjs passes 64/64 at a384c8f4 (v2.3.1714,
         the commit before the shell) and dies on its FIRST action after it.
         Not the judges' bug: that one was the interact radius, fixed in
         v2.3.1717.  This one shipped after they played, and would have
         blocked them far harder.

         v2.3.1715 shrank the play window to #root (25% wide) and relied on
         `contain: paint` to re-anchor the 59 position:fixed overlays without
         editing any of them.  Containment does re-anchor a fixed child's
         ORIGIN — measured, this wrap starts exactly at #root's left edge —
         but a VIEWPORT UNIT is immune to it by definition, so the wrap kept
         its full-window 1440px width while living inside a 380px shell.

         Everything centred inside it therefore centred on the middle of the
         WINDOW, ~600px right of the middle of the play area, and
         `contain: paint` clipped it out of sight.  `.bt-inspect` is
         `inset: 0; justify-content: center`, so that is every modal in the
         game: the quest dialogue's Accept/Turn In buttons, Inspect, trades,
         duels, every building interior.  Present in the DOM, visible to
         getComputedStyle, and unreachable by mouse — elementFromPoint at the
         Accept button's own centre returned <body>.

         `100%` resolves against the containing block, which IS #root when
         contained and the viewport otherwise — so the shell wins on desktop
         and phones are byte-identical.  HEIGHT deliberately stays 100dvh:
         the dynamic unit is what keeps the layout correct under the iOS
         Safari URL bar, and the vertical axis was never broken (#root is
         height:100% of the same viewport). */
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /* v2.3.1227: the hanging "N online" pill under the player card is
     removed per Lantern Slate §10 -- presence is now the dot on the
     compact card's portrait; the count will move to a Friends badge. */
  null, /*#__PURE__*/React.createElement("div", {
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
            /* v2.3.1111: this MOBILE tap path never got the v2.3.1090
               world-scale fix that onClick below has -- it compared raw
               world px to CSS px, so with WORLD_ZOOM 1.25 every tap was
               ~25% radially off (only monsters near the camera origin
               could be tapped).  Apply the same published renderer scale. */
            var _tapSX = _S._worldScaleX || 1.0;
            var _tapSY = _S._worldScaleY || 1.0;
            var _closest = null;
            if (_S.monsters) {
              var _closestDist = 40;
              _S.monsters.forEach(function (m) {
                if (!m.alive) return;
                /* v2.3.1111: shared body-centre table (was missing the
                   tall variants -- tapping a mummy torso tested its feet). */
                var _mTapY = DATA.monsterBodyY(m);
                var _msx = (m.x - _cx) * _tapSX, _msy = (_mTapY - _cy) * _tapSY;
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
            /* v2.3.1448: no monster under the finger — see if the tap
               landed on a resource (opens its shell, or warns that it's
               too far).  Monsters keep priority: one standing in front
               of a tree is still the thing you meant to tap. */
            /* v2.3.2245: no tap-to-harvest; the button offers what is in reach. */
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
      /* ═══ v2.3.1756: THE MOUSE AIMS WHERE THE MOUSE IS ═══
         The forward transform the renderer actually uses is
         screen = (world - camera) * S._worldScaleX/Y, and the scale is
         1/WORLD_ZOOM = 0.8 on every screen (constants.js, fixed value).
         Inverting it as a bare translation is not a 25% error that cancels
         out of an angle — it leaves an ADDITIVE term:
             worldX_wrong - player.x = dxScreen - (player.x - camera.x)*(1 - k)
         so the aim vector is displaced by however far the player sits from
         the camera's top-left, and the further into the map you walk the
         worse it points.  Measured 42 degrees off in the duel harness, which
         is a swing aimed at nothing.
         v2.3.1090 fixed exactly this for tap-to-lock (see SCALE_X below) and
         for the touch tap path; this handler was missed, so mouse aim, mouse
         FACING and every attack seeded from _mouseAimAngle have been
         pointing wrong on desktop ever since. */
      var _msX = S._worldScaleX || 1.0;
      var _msY = S._worldScaleY || 1.0;
      var worldX = screenX / _msX + S.camera.x;
      var worldY = screenY / _msY + S.camera.y;
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
      /* v2.3.1090: world->CSS scale follows the renderer's actual world scale
         (1/WORLD_ZOOM, e.g. 0.8 when zoomed out), published each frame by
         pixiRenderer. Hardcoding 1.0 here made taps miss once the world was
         zoomed out. Falls back to 1.0 before the first render. */
      var SCALE_X = S._worldScaleX || 1.0;
      var SCALE_Y = S._worldScaleY || 1.0;
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
          /* v2.3.1111: shared body-centre table (the inline copy was
             missing fireGoblin/mummy/skeleton). */
          var _mTapY = DATA.monsterBodyY(m);
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
            /* ═══ v2.3.1717: CLICK THE NPC, NOT HIS ANKLES ═══
               A judge could not click Mayor Bro.  Measured by sweeping real
               clicks on a 10px grid around him: the only points that opened
               his dialogue were x -20..+20, y -20..+30 RELATIVE TO HIS FEET
               -- a ~40x50 patch on the ground under him.  npc.x/y is the
               sprite's bottom-centre anchor, so a 30px circle on it sits on
               his ankles while his body and head, the parts you actually aim
               at, are 25-70px ABOVE and missed entirely.  Silently.
               So: raise the test point onto his torso and widen it.  Radius
               44 about his mid-body covers head to feet and keeps the 44px
               tap-target guidance the rest of the UI follows. */
            var NPC_TAP_RISE = 26, NPC_TAP_R = 44;
            if (Math.sqrt(Math.pow(cssX - nsx, 2) + Math.pow(cssY - (nsy - NPC_TAP_RISE), 2)) < NPC_TAP_R) {
              /* Check if NPC has a quest */
              var npcQ = getNpcQuest(S.rpg, npc.name);
              if (npcQ) {
                /* v2.3.1701: a TAP arms the same latch the proximity opener
                   uses, so closing a dialogue you opened by hand while
                   standing on him does not get one straight back from the
                   loop.  Both doors, one latch. */
                S._npcProxLatch = { npc: npc, ready: _npcQuestReady(S, npcQ) };
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
          /* ═══ v2.3.1742: NEVER COMBAT-LOCK A PARTY MEMBER ═══
             Owner: "it auto targeted my teammate".  A tap within 25px of
             another player combat-locks them, and in a lawless zone (which
             is every wilderness zone) that lock is what turns your swings
             into real PvP damage.  Fighting shoulder to shoulder with a
             teammate puts them under your thumb constantly, so this reads as
             the game targeting them by itself.
             The tap still INSPECTS them — that is useful and harmless — it
             just no longer aims a weapon.  Belt and braces with the server,
             which since v2.3.1742 refuses party-member damage outright:
             this stops it being aimed, that stops it landing. */
          var _isPartyMate = false;
          try {
            var _pm = S._party && S._party.members;
            if (_pm && _pm.length) {
              for (var _pmI = 0; _pmI < _pm.length; _pmI++) {
                if (_pm[_pmI] && String(_pm[_pmI].id) === String(id)) { _isPartyMate = true; break; }
              }
            }
          } catch (e) { _isPartyMate = false; }
          if (_isPartyMate) {
            if (S.lockedTarget && S.lockedTarget.id === id) S.lockedTarget = null;
            setInspectPlayer({
              id: id, name: o.name, color: o.color, avatar: o.avatar, bro: o.bro,
              x: o.x, y: o.y, rpgLv: o.rpgLv, rpgData: o.rpgData, pet: o.pet,
              rep: o.rep, clanTag: o.clanTag, clanColor1: o.clanColor1
            });
            return;
          }
          /* ═══ v2.3.1917: YOU CAN ONLY AIM AT A DUEL OPPONENT ═══
             Owner: "Also remove the option to kill other players for now."
             The server is where that is actually enforced (GameRoom.OPEN_PVP
             -> _pvpAllowed), but a lock-on that can never land a hit is worse
             than no lock-on: the reticle says "attacking this" and every
             swing silently does nothing.  So the tap stops aiming unless
             there is a live duel with this player, exactly as the v2.3.1745
             party-mate case above already does — inspect, don't target. */
          var _isDuelOpponent = false;
          try {
            var _ad = S._inDuel || S._activeDuel;
            if (_ad) {
              var _oppId = _ad.opponent || _ad.partnerId;
              _isDuelOpponent = String(_oppId) === String(id);
            }
          } catch (e) { _isDuelOpponent = false; }
          if (S.lockedTarget && S.lockedTarget.id === id) {
            S.lockedTarget = null;
          } else if (!_isDuelOpponent) {
            if (S.lockedTarget && S.lockedTarget.id === id) S.lockedTarget = null;
            setInspectPlayer({
              id: id, name: o.name, color: o.color, avatar: o.avatar, bro: o.bro,
              x: o.x, y: o.y, rpgLv: o.rpgLv, rpgData: o.rpgData, pet: o.pet,
              rep: o.rep, clanTag: o.clanTag, clanColor1: o.clanColor1
            });
            return;
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
      /* v2.3.1448: resources come after the creature checks — a click on
         a resource opens its shell (or warns it's out of reach) instead
         of falling through to the unlock branch. */
      /* Tap on empty space = unlock (v2.3.2245: resources are no longer tappable) */
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
      background: 'rgba(216,168,95,.9)',      border: '2px solid rgba(255,255,255,.3)',
      textAlign: 'center',
      animation: 'scoreReveal .4s cubic-bezier(.22,1,.36,1)',
      boxShadow: '0 4px 20px rgba(216,168,95,.5)'
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
      background: 'rgba(17,25,29,.94)' /* v2.3.1233: spec world-overlay ink; blur removed */,      border: '1.5px solid rgba(216,169,77,.4)',
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
      color: '#D8A94D',
      marginTop: 4
    }
  }, collectMsg.text)), React.createElement(ActiveWarBanner, { stateRef: stateRef }), React.createElement(EndedWarBanner, { stateRef: stateRef }), null /* v2.3.1333: bt-exit-fab retired — logout lives in the ZoneHeader rail chip (GameApp), now with confirmation */, showGuildPanel && rpgState && /*#__PURE__*/React.createElement(GuildPanel, { rpgState: rpgState, guildSkill: guildSkill, setGuildSkill: setGuildSkill, setRpgState: setRpgState, setShowGuildPanel: setShowGuildPanel, stateRef: stateRef }), showFeedback && /*#__PURE__*/React.createElement(FeedbackPanel, { stateRef: stateRef, feedbackTab: feedbackTab, setFeedbackTab: setFeedbackTab, feedbackCategory: feedbackCategory, setFeedbackCategory: setFeedbackCategory, feedbackTopic: feedbackTopic, setFeedbackTopic: setFeedbackTopic, feedbackText: feedbackText, setFeedbackText: setFeedbackText, feedbackSort: feedbackSort, setFeedbackSort: setFeedbackSort, feedbackTickets: feedbackTickets, setFeedbackTickets: setFeedbackTickets, feedbackSubmitCategory: feedbackSubmitCategory, setFeedbackSubmitCategory: setFeedbackSubmitCategory, feedbackSubmitTopic: feedbackSubmitTopic, setFeedbackSubmitTopic: setFeedbackSubmitTopic, setShowFeedback: setShowFeedback }), showLeaderboard && /*#__PURE__*/React.createElement(LeaderboardPanel, { stateRef: stateRef, leaderboardTab: leaderboardTab, setLeaderboardTab: setLeaderboardTab, setRpgState: setRpgState, setShowLeaderboard: setShowLeaderboard }), showEncyclopedia && /*#__PURE__*/React.createElement(EncyclopediaPanel, { encyclopediaTab: encyclopediaTab, setEncyclopediaTab: setEncyclopediaTab, setShowEncyclopedia: setShowEncyclopedia }), showPetHouse && rpgState && /*#__PURE__*/React.createElement(PetHousePanel, { rpgState: rpgState, stateRef: stateRef, petHouseTab: petHouseTab, setPetHouseTab: setPetHouseTab, petEvolve1: petEvolve1, setPetEvolve1: setPetEvolve1, petEvolve2: petEvolve2, setPetEvolve2: setPetEvolve2, setRpgState: setRpgState, setShowPetHouse: setShowPetHouse }), showFurniture && rpgState && /*#__PURE__*/React.createElement(FurniturePanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setShowFurniture: setShowFurniture }), showDungeonCreator && dungeonCreator && rpgState && /*#__PURE__*/React.createElement(DungeonCreatorPanel, { rpgState: rpgState, stateRef: stateRef, dungeonCreator: dungeonCreator, setDungeonCreator: setDungeonCreator, dungeonCreatorTab: dungeonCreatorTab, setDungeonCreatorTab: setDungeonCreatorTab, setRpgState: setRpgState, setShowDungeonCreator: setShowDungeonCreator }), showStatScreen && rpgState && /*#__PURE__*/React.createElement(StatScreenPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setShowStatScreen: setShowStatScreen }), buildingPanel && rpgState && /*#__PURE__*/React.createElement("div", {
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
      /* v2.3.1234: was 300 fixed — dead margins on phones; the 11
         building interiors get the full width they were designed to
         bleed into (margin:-20 roots). Cap keeps it off tablet-huge. */
      /* v2.3.1235: §6 — height capped so building content never
         continues behind the dashboard band. Checkpoint B: 100% = the
         .bt-inspect content box, which now reserves BOTH the band
         (padding-bottom) and the HUD chip strip (padding-top — the chip
         paints over in-wrap modals, see game.css). */
      width: 'min(360px, calc(100vw - 24px))',
      maxHeight: '100%',
      overflowY: 'auto',
      /* v2.3.1235: batch-3 QA — 18px bottom scroll-edge fade (same recipe
         as the destination sheets/leaderboard): at 390 the Woodworker's
         hardening button was hard-cut in half at the card fold with no
         cue. Inline on the BUILDING card only — the inspect card pins its
         action row at the bottom and must not fade. */
      WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
      maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setBuildingPanel(null);
    }
  }, "\u2715"), buildingPanel === 'shop' && /*#__PURE__*/React.createElement(VendorPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }), buildingPanel === 'bank' && /*#__PURE__*/React.createElement(BankPanel, { rpgState: rpgState }), buildingPanel === 'enchant' && /*#__PURE__*/React.createElement(EnchantPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }), buildingPanel === 'cook' && /*#__PURE__*/React.createElement(CookPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, cookMinigame: cookMinigame, setCookMinigame: setCookMinigame }), buildingPanel === 'farm' && /*#__PURE__*/React.createElement(FarmPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setBuildingPanel: setBuildingPanel }), buildingPanel === 'gamble' && /*#__PURE__*/React.createElement(GamblePanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }), buildingPanel === 'party' && /*#__PURE__*/React.createElement(PartyPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, arenaBetAmount: arenaBetAmount, arenaBetTarget: arenaBetTarget, arenaBets: arenaBets, arenaHistory: arenaHistory, arenaStatus: arenaStatus, arenaTournament: arenaTournament, setArenaBetAmount: setArenaBetAmount, setArenaBetTarget: setArenaBetTarget, setArenaBets: setArenaBets, setArenaHistory: setArenaHistory, setArenaStatus: setArenaStatus, setArenaTournament: setArenaTournament }), buildingPanel === 'exchange' && /*#__PURE__*/React.createElement(ExchangePanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, mktCategory: mktCategory, mktElement1: mktElement1, mktElement2: mktElement2, mktMode: mktMode, mktOrders: mktOrders, mktPrice: mktPrice, mktSellItem: mktSellItem, mktSubtype: mktSubtype, mktTier: mktTier, setMktCategory: setMktCategory, setMktElement1: setMktElement1, setMktElement2: setMktElement2, setMktMode: setMktMode, setMktOrders: setMktOrders, setMktPrice: setMktPrice, setMktSellItem: setMktSellItem, setMktSubtype: setMktSubtype, setMktTier: setMktTier }), buildingPanel === 'forge' && /*#__PURE__*/React.createElement(ForgePanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }), buildingPanel === 'woodwork' && /*#__PURE__*/React.createElement(WoodworkPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }), buildingPanel === 'gemcut' && /*#__PURE__*/React.createElement(GemcutPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState }))), ((_stateRef$current18 = stateRef.current) === null || _stateRef$current18 === void 0 ? void 0 : _stateRef$current18.currentZone) === 'farm_home' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was green .15+blur — tint lives in border/text now */,
      border: '1px solid rgba(61,220,151,.3)',      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#59BF91',
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "\uD83C\uDFE1 Your Farm", ((_stateRef$current19 = stateRef.current) === null || _stateRef$current19 === void 0 || (_stateRef$current19 = _stateRef$current19.rpg) === null || _stateRef$current19 === void 0 ? void 0 : _stateRef$current19._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#D8A94D'
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
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was indigo .2+blur — tint lives in border/text now */,
      border: '1px solid rgba(100,100,200,.3)',      textAlign: 'center',
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
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was green .15+blur — tint lives in border/text now */,
      border: '1px solid rgba(61,220,151,.3)',      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#59BF91',
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
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was indigo .2+blur — tint lives in border/text now */,
      border: '1px solid rgba(100,100,200,.4)',      textAlign: 'center',
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
      background: 'rgba(216,169,77,.15)',
      border: '1px solid rgba(216,169,77,.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#D8A94D'
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
      /* v2.3.1406: farm map is per-zone-loaded now and this warp bypasses
         the hub-exit gate — kick the load so the ground paints promptly. */
      import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
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
  }, "Cancel"))), questPanel && rpgState && /*#__PURE__*/React.createElement(QuestPanel, { rpgState: rpgState, stateRef: stateRef, questPanel: questPanel, setQuestPanel: setQuestPanel, setRpgState: setRpgState }), duelRequest && /*#__PURE__*/React.createElement(DuelRequestPanel, { stateRef: stateRef, duelRequest: duelRequest, setDuelRequest: setDuelRequest }), threatIncoming && !threatIncoming.responded && /*#__PURE__*/React.createElement(ThreatIncomingPanel, { stateRef: stateRef, threatIncoming: threatIncoming, setThreatIncoming: setThreatIncoming }), showTrade && tradeTarget && rpgState && /*#__PURE__*/React.createElement(TradePanel, { rpgState: rpgState, stateRef: stateRef, tradeTarget: tradeTarget, tradeOffer: tradeOffer, setShowTrade: setShowTrade, setTradeOffer: setTradeOffer }), incomingTrade && rpgState && /*#__PURE__*/React.createElement(IncomingTradePanel, { stateRef: stateRef, incomingTrade: incomingTrade, setIncomingTrade: setIncomingTrade, setRpgState: setRpgState }), trade2 && rpgState && /*#__PURE__*/React.createElement(TradeWindowPanel, { rpgState: rpgState, stateRef: stateRef, trade2: trade2, setTrade2: setTrade2 }), party && /*#__PURE__*/React.createElement(PartyHUD, { party: party, setParty: setParty, stateRef: stateRef }),showInventory && rpgState && /*#__PURE__*/React.createElement(InventoryPanel, { rpgState: rpgState, stateRef: stateRef, setRpgState: setRpgState, setShowInventory: setShowInventory, gearWorn: gearWorn, toggleGearSlot: toggleGearSlot }), showSkills && rpgState && /*#__PURE__*/React.createElement(SkillsPanel, { rpgState: rpgState, stateRef: stateRef, setShowSkills: setShowSkills }), /* v2.3.1147: tutorial banner RE-ENABLED (was `false &&` since the
   prototype era -- the step machine ran all along, only the display was
   gated, so veterans' bt_tutorial already reads 7/10 and never see it) */
  /* v2.3.1235: §6 — the banner yields to every blocking decision
     surface (QA caught it rendering beside the duel prompt and behind
     the tutorial coach). It resumes when the modal closes. */
  /* v2.3.1239: gated behind tourStarted — the step banners only show once
     the player opts in via the first-join prompt (see below). */
  tourStarted && tutorialStep >= 0 && tutorialStep < 7 && !ctOpen && !buildingPanel && !duelRequest && !incomingTrade && !trade2 && !inspectPlayer && !questPanel && !showTrade && !threatIncoming && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:180 / zIndex:20 — INSIDE the opaque
         dashboard band (28vh ≈ 225px on iPhone) and BELOW it (z 30),
         so new players never saw the tutorial (2026-07-07 owner
         report).  Offset off the band + registry z per zLayers.js. */
      /* v2.3.1234: moved to TOP-center (below the zone title and the
         top-right player card) and z 34 → 31 — bottom-center is a
         contested band (.bt-interact-prompt +24 z35, emote bar +64,
         joystick ring tops at the edges), so any bottom slot overlapped
         SOMETHING; top-center below y≈128 is owned by nobody. The old
         z (34) also painted the banner OVER every open decision modal
         (QA screenshots showed it covering panel content); 31 beats
         chrome (30) but yields to the .bt-inspect modals (32). See
         zLayers.js. */
      top: 128,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 31,
      textAlign: 'center',
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(17,25,29,.94)' /* v2.3.1233: spec world-overlay ink; blur removed */,      padding: '8px 16px',
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
      /* v2.3.1235: QA \u2014 the \u2715 was a ~14px target; 32px box (44 incl.
         the card padding around the corner) + brighter glyph. */
      position: 'absolute',
      top: 0,
      right: 0,
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,.55)',
      fontSize: 14,
      cursor: 'pointer',
      padding: 0,
      lineHeight: 1
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#fff',
      fontFamily: 'Source Sans 3,sans-serif',
      letterSpacing: '.03em',
      paddingRight: 22
    }
  }, tutorialStep === 0 && 'Welcome! Use the LEFT STICK to move around.', tutorialStep === 1 && 'Nice! Now SWIPE the screen to dodge roll!', tutorialStep === 2 && 'Great dodge! Hold the RIGHT STICK to attack enemies.', tutorialStep === 3 && 'First kill! Head to the edge of town to explore the wild.', tutorialStep === 4 && 'Explore! Walk to the edge of town to enter a combat zone.', tutorialStep === 5 && 'Out in the wild! Monsters here are tougher. Reach Level 3 to prove yourself.', tutorialStep === 6 && 'Tutorial complete! The world is yours — explore every zone!' /* v2.3.1205: was "Discover all 36 collisions!" — prototype-era copy; there are no "collisions" and ZONES has never had 36 entries */), /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1235: QA — 8px was under the 11px floor. */
      fontSize: 11,
      color: 'rgba(255,255,255,.45)',
      marginTop: 3
    }
  }, "Step ", Math.min(tutorialStep + 1, 7), "/7"))), levelUpMsg && Date.now() - levelUpMsg.ts < 4000 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      /* v2.3.1342: 22 -> 70.  Spending a T2 point in the Build sheet is
         now a level-up (level-is-build), and the dash sheet + spend
         dialog sit at zIndex 60 — the banner must float above them or
         the in-sheet celebration is invisible.  pointerEvents none, so
         nothing underneath loses taps. */
      zIndex: 70,
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
      /* v2.3.1160: banner is kind-aware — 'warning' renders the red
         zone-gate warning (screen-space, readable on iPhone) instead of
         the gold level-up celebration.  zoneTransitions.js used to push
         the warning as a world-space damage number, which the world-view
         camera scaled down to unreadable ("tiny font" playtest report). */
      background: levelUpMsg.kind === 'warning'
        ? 'radial-gradient(circle, rgba(217,92,84,.30) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(216,169,77,.35) 0%, transparent 70%)',
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
      color: levelUpMsg.kind === 'warning' ? '#D95C54' : '#D8A94D',
      textShadow: levelUpMsg.kind === 'warning'
        ? '0 0 30px rgba(217,92,84,.8), 0 0 60px rgba(217,92,84,.4), 0 2px 4px rgba(0,0,0,.6)'
        : '0 0 30px rgba(216,169,77,.8), 0 0 60px rgba(216,169,77,.4), 0 2px 4px rgba(0,0,0,.6)',
      letterSpacing: '.15em'
    }
  }, levelUpMsg.kind === 'warning' ? "⚠️ DANGER"
    /* A life skill gets the same banner and the same place on screen — that
       is the part that decides whether it is seen — but says which kind of
       level it is rather than claiming a character level. */
    : levelUpMsg.kind === 'life' ? "SKILL UP!" : "LEVEL UP!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: '#fff',
      textShadow: '0 2px 8px rgba(0,0,0,.7)',
      marginTop: 6
    }
  }, levelUpMsg.kind === 'warning' ? levelUpMsg.text
    /* v2.3.1915: a life-skill level names the SKILL and, when more than one
       arrived at once, says how many. "Level 7" is useless to someone who
       last looked at 5 — which is the owner's report exactly. */
    : levelUpMsg.kind === 'life'
      ? (levelUpMsg.label || 'Skill') + " Level " + levelUpMsg.level
        + ((levelUpMsg.gained || 1) > 1 ? "  (+" + levelUpMsg.gained + ")" : "")
      : "Level " + levelUpMsg.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(255,255,255,.6)',
      marginTop: 4
    }
  }, levelUpMsg.kind === 'warning' ? (levelUpMsg.sub || '')
    /* v2.3.1342: was "+5 Capacity · +5 Technique" — legacy copy from the
       retired flat per-level T2 grant.  Kid-true line: every level-up
       (kill-path or point spend) refills all three pools.
       v2.3.1727: state the GAINS when the worker sent them (prog3 levels
       carry `gains`, built in wsClient where the constants live).  "You got
       stronger" is a claim; "+1.5 damage · +6 max HP" is the reason the
       owner asked for the retune in the first place.  The old line stays as
       the fallback for legacy level-ups, which really do only refill. */
    : levelUpMsg.kind === 'life'
      /* A life-skill level does NOT refill the pools (celebrateLevelUps does
         that, and only for character levels), so it must not say it did. */
      ? "Keep at it \u2014 better yields and faster gathers"
      : (levelUpMsg.gains || "You got stronger! HP \xB7 Stamina \xB7 Mana refilled")))),
  /* ═══ v2.3.1745: QUEST ACCEPTED! / QUEST COMPLETED! ═══
     Owner: "...that appear over the quest modal menu the moment you accept
     or turn in the quest."
     OVER THE MODAL is the whole point, and it is a z-index fact, not a
     guess: the quest dialogue is .bt-inspect at z-index 32 (game.css), so
     this sits at 71 — one above the level-up banner's 70, which keeps the
     two in a fixed order when a turn-in's XP levels you up in the same
     instant.
     pointerEvents:'none' is load-bearing rather than decorative.  The
     dialogue REMAINS OPEN through both actions (accept flips it to active,
     turn-in re-opens it on the giver's next quest), so the player's very
     next tap is usually a real button underneath this overlay.  A banner
     that ate that tap would make the dialogue feel broken for two seconds.
     Sits at 26% height — above the centred card's middle, and clear of the
     level-up banner at 55%, so both are legible together. */
  questMsg && Date.now() - questMsg.ts < questMsgMs(questMsg.kind) && /*#__PURE__*/React.createElement("div", {
    className: "bt-quest-banner",
    "data-quest-banner": questMsg.kind,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 71,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    /* v2.3.1808: the rise and the fade are CSS now (.bt-quest-plate in
       game.css).  They used to be computed from Date.now() right here, which
       meant the animation only advanced when React re-rendered — the owner saw
       it step.  The key is questMsg.ts so a queued second banner restarts the
       animation instead of inheriting the first one's finished state. */
    className: "bt-quest-plate",
    key: questMsg.ts,
    style: {
      position: 'absolute',
      left: '50%',
      top: '26%',
      /* v2.3.1816: the fade starts 500ms before THIS banner's own hold
         ends — a fixed 1700ms here would have the long banners fade out and
         then sit invisible for two more seconds. */
      '--qm-out': (questMsgMs(questMsg.kind) - 500) + 'ms',
      textAlign: 'center',
      /* v2.3.1745b: a PLATE, not bare text.  The first cut floated the words
         straight onto the dialogue and they landed across the giver's
         portrait and name — two pieces of text over each other, which reads
         as a rendering fault rather than a celebration.  Lantern Slate's
         toast recipe (§ "Toasts": ink 12px radius) gives it a surface, so
         overlapping the card is deliberate instead of accidental. */
      maxWidth: 'calc(100% - 24px)',
      padding: '10px 18px 12px',
      borderRadius: 14,
      background: 'rgba(13,21,26,.90)',
      border: '1px solid ' + (questMsg.kind === 'completed'
        ? 'rgba(97,176,107,.55)' : 'rgba(216,169,77,.55)'),
      boxShadow: '0 12px 30px rgba(3,8,10,.45)'
      /* opacity + transform: see .bt-quest-plate */
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1745b: sized off the VIEWPORT, and never wrapped.  A flat 30px
         put "QUEST COMPLETED!" onto two lines at 390px — the iPhone width
         that is the primary platform — and the second line ran into the
         quest title below it. */
      fontSize: 'min(30px, 6.4vw)',
      whiteSpace: 'nowrap',
      fontWeight: 900,
      fontFamily: 'Source Sans 3,sans-serif',
      /* completed = the semantic success green; accepted = brass.  Same
         two colors the rest of Lantern Slate uses for "done" and "reward". */
      color: questMsg.kind === 'completed' ? '#61B06B' : '#D8A94D',
      letterSpacing: '.12em',
      textShadow: questMsg.kind === 'completed'
        ? '0 0 26px rgba(97,176,107,.85), 0 0 54px rgba(97,176,107,.4), 0 2px 4px rgba(0,0,0,.65)'
        : '0 0 26px rgba(216,169,77,.85), 0 0 54px rgba(216,169,77,.4), 0 2px 4px rgba(0,0,0,.65)'
    }
  }, questMsg.kind === 'completed' ? "QUEST COMPLETED!"
    : questMsg.kind === 'reward' ? "QUEST REWARD"
    /* v2.3.2121: the first-join greeting borrows this plate.  ONE WORD, and
       that is a layout constraint rather than a style choice: the headline is
       `nowrap` at min(30px, 6.4vw), so "WELCOME TO BRO TOWN" would run off a
       390px screen — the primary platform — the same way "QUEST COMPLETED!"
       did before v2.3.1745b sized it.  The town's name goes in the title line
       below, which wraps. */
    : questMsg.kind === 'welcome' ? "WELCOME"
    : "QUEST ACCEPTED!"),
  questMsg.title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: '#F4F0E7',
      textShadow: '0 2px 8px rgba(0,0,0,.75)',
      marginTop: 4,
      /* the giver's card carries the same title right underneath; keep this
         to one line so the two never stack into a wall of text */
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, questMsg.title),
  questMsg.sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: questMsg.kind === 'completed' ? '#D8A94D' : 'rgba(244,240,231,.66)',
      textShadow: '0 2px 8px rgba(0,0,0,.75)',
      marginTop: 3
    }
  }, questMsg.sub))), rpgState && /*#__PURE__*/React.createElement("div", {
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
      /* v2.3.2058: the chip used to say "+20%" for every damage buff, which
         became a lie the moment the Fury Tonic started doubling. Read the
         same magnitude the damage math reads, with the same 1..4 bound and
         the same cooked-food fallback. */
      var _dbm2 = Number(S._dmgBuffMul);
      var _dmul2 = (_dbm2 >= 1 && _dbm2 <= 4) ? _dbm2 : 1.20;
      effects.push({
        icon: '⚔️',
        label: 'Dmg+',
        color: '#ea580c',
        time: _rem2 + 's',
        desc: _dmul2 >= 2 ? 'x' + (Math.round(_dmul2 * 100) / 100) : '+' + Math.round((_dmul2 - 1) * 100) + '%'
      });
    }
    /* v2.3.2062: the Mana Draught had no chip at all, because until now it was
       an instant top-up with nothing to count down. A three-minute buff the
       HUD never mentions is one the player cannot tell is still running. */
    if (S._manaBuff && Date.now() < S._manaBuff) {
      var _rem6 = Math.ceil((S._manaBuff - Date.now()) / 1000);
      effects.push({
        icon: '\u{1F4A0}',
        label: 'Mana',
        color: '#4F8FDE',
        time: _rem6 + 's',
        desc: Number(S._manaFlat) > 0 ? 'Surge' : '+30%'
      });
    }
    if (S._regenBuff && Date.now() < S._regenBuff) {
      var _rem3 = Math.ceil((S._regenBuff - Date.now()) / 1000);
      effects.push({
        icon: '💚',
        label: 'Regen',
        color: '#59BF91',
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
      /* v2.3.2062: the chip said "+15%" for every speed buff, which became a
         lie the moment the Swift Draught started multiplying by 1.5. Reads
         the same magnitude the movement math reads, with the same bound and
         the same cooked-food fallback. */
      var _sbm5 = Number(S._spdBuffMul);
      var _smul5 = (_sbm5 >= 1 && _sbm5 <= 2) ? _sbm5 : 1.15;
      effects.push({
        icon: '💨',
        label: 'Speed',
        color: '#D8A94D',
        time: _rem5 + 's',
        desc: _smul5 >= 1.5 ? 'x' + (Math.round(_smul5 * 100) / 100)
          : '+' + Math.round((_smul5 - 1) * 100) + '%'
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
      color: '#D95C54',
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
    /* v2.3.1914: live rpg, not the snapshot — one answer everywhere. */
    var done = DATA.questObjectiveDone(q, stateRef.current, rpgState);
    return /*#__PURE__*/React.createElement("div", {
      /* v2.3.1714: tap to fold the objective away, leaving just the title.
         onPointerDown stops the tap BEFORE it reaches the canvas — a bare
         onClick would fold the card and ALSO order the character to walk to
         the top-left corner, because the world listens for taps underneath
         this overlay (same reason the tour prompt does it). */
      onPointerDown: function onPointerDown(e) { e.stopPropagation(); },
      onClick: function onClick(e) {
        e.stopPropagation();
        setQuestHudFolded(function (v) {
          var next = !v;
          try { localStorage.setItem('bt_quest_hud_collapsed', next ? '1' : '0'); } catch (e2) { /* private mode */ }
          return next;
        });
      },
      title: questHudFolded ? 'Show the objective' : 'Hide the objective',
      style: {
        position: 'absolute',
        top: 56,
        left: 8,
        zIndex: 17,
        /* An ancestor turns pointer events off so the world stays tappable
           through the HUD layer; this card has to opt back in to be tapped. */
        pointerEvents: 'auto',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.6)+blur */,        padding: '4px 10px',
        borderRadius: 6,
        border: "1px solid ".concat(done ? 'rgba(61,220,151,.3)' : 'rgba(255,255,255,.1)'),
        /* v2.3.1711: 200 -> 248.  The type below roughly doubled, so the old
           width turned the objective into a four-line column pinned to the
           left edge; this keeps it to one or two lines on a 390px iPhone. */
        maxWidth: 248
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1711: was 8px.  Owner: "the text is a bit too small to be
           legible."  8/7 sat below every step of the documented type scale
           (11 caption / 13 body / 15 emphasized / 17 title, UI-BIBLE Part 2)
           -- this HUD had simply never been measured against it.  Title takes
           the BODY step and the objective the CAPTION step, so the two stay
           distinguishable at a glance without inventing a new size. */
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: done ? '#59BF91' : '#D8A94D'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: { flex: 1, minWidth: 0 }
    }, "\uD83D\uDCDC ", q.title, " ", done ? '✓' : ''),
    /* v2.3.1714: the fold affordance.  Without it a collapsed card is just a
       card that quietly lost its second line, with nothing on screen saying
       the title can be tapped to get it back. */
    /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 9, opacity: 0.55, flex: '0 0 auto' }
    }, questHudFolded ? '▸' : '▾')),
    /* v2.3.1714: FOLDED, the card is only ~26px tall, and UI-BIBLE Part 2 is
       explicit — "44x44pt minimum for anything tappable.  Visuals may be
       smaller; the hit area may not."  So the pill keeps its small look and
       this invisible child carries the hit area down to 44.  Anchored at
       top:0 and grown DOWNWARD on purpose: centring it would push 9px up
       under the 46px ZoneHeader rail and start eating taps meant for the
       rail.  Only rendered when folded — expanded, the card is 56px and
       already clears the floor, and this would be a dead strip over the
       world for nothing. */
    questHudFolded && /*#__PURE__*/React.createElement("div", {
      'aria-hidden': true,
      style: { position: 'absolute', left: 0, right: 0, top: 0, height: 44 }
    }), !questHudFolded && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        lineHeight: 1.3,
        marginTop: 1,
        /* v2.3.1711: was 7px / .4 alpha.  Legibility is size AND contrast --
           .4 white on the .85 slate is ~2.6:1.  .72 clears 4.5:1 while
           staying visibly secondary to the title above it. */
        color: 'rgba(255,255,255,.72)'
      }
    }, q.desc));
  }(), null /* v2.3.1333: floating zone label retired — the zone name lives in the ZoneHeader rail (GameApp) */, function (_stateRef$current37, _ZONES$nearest$zone) {
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
        top: 52, /* v2.3.1333: clears the 46px ZoneHeader rail (was 30, under the old text label) */
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 18,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'Source Sans 3,sans-serif',
        background: 'rgba(17,25,29,.85)' /* v2.3.1233: was orange .25+blur — tint lives in border/text now */,
        padding: '3px 12px',
        borderRadius: 6,
        border: '1px solid rgba(234,88,12,.5)',
        color: '#ea580c',        animation: timeLeft < 10 ? 'promptPulse 0.5s ease-in-out infinite' : 'none'
      }
    }, "\uD83D\uDC80 ", itemCount, " items scattered in ", ((_ZONES$nearest$zone = ZONES[nearest.zone]) === null || _ZONES$nearest$zone === void 0 ? void 0 : _ZONES$nearest$zone.name) || nearest.zone, " \u2014 ", timeLeft, "s to recover!");
  }(), showPlayerList && /*#__PURE__*/React.createElement(PlayerListPanel, { playerList: playerList, setInspectPlayer: setInspectPlayer, setShowPlayerList: setShowPlayerList }), inspectPlayer && /*#__PURE__*/React.createElement(InspectPlayerPanel, { stateRef: stateRef, inspectPlayer: inspectPlayer, blockedList: blockedList, clanData: clanData, friendsList: friendsList, mutedList: mutedList, setBlockedList: setBlockedList, setFriendsList: setFriendsList, setInspectPlayer: setInspectPlayer, setMutedList: setMutedList, setShowTrade: setShowTrade, setTradeOffer: setTradeOffer, setTradeTarget: setTradeTarget }), false && ((_stateRef$current40 = stateRef.current) === null || _stateRef$current40 === void 0 ? void 0 : _stateRef$current40.currentZone) === 'frost' && rpgState && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:130 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(160,216,240,.2)'
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Max 3 snowmen!', '#D95C54');
        return;
      }
      S._snowmen.push({
        x: S.player.x + (Math.random() - .5) * 30,
        y: S.player.y + 10,
        ts: Date.now(),
        hp: 50
      });
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Snowman placed!', '#a0d8f0');
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + SLED_WOOD_COST + ' wood!', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'SLED!', '#60a5fa');
      BT_AUDIO.beep(400, 0.1, 0.15, 'triangle');
      setRpgState(_objectSpread({}, R));
    }
  }, "\uD83D\uDEF7 Sled (", SLED_WOOD_COST, "w)")), ((_stateRef$current42 = stateRef.current) === null || _stateRef$current42 === void 0 ? void 0 : _stateRef$current42.currentZone) === 'tidal' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:130 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(52,152,219,.2)'
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + RAFT_WOOD_COST + ' wood!', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Raft built! Sail across water.', '#3498DB');
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
    }
  }, "\uD83D\uDEA3 Build Raft (", RAFT_WOOD_COST, "w)") : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontSize: 9,
      fontWeight: 700,
      color: '#59BF91'
    }
  }, "\uD83D\uDEA3 Raft ready")), ((_stateRef$current46 = stateRef.current) === null || _stateRef$current46 === void 0 ? void 0 : _stateRef$current46.currentZone) === 'hollows' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:130 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(234,88,12,.2)'
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + TORCH_WOOD_COST + ' wood!', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Torch lit! (2 min)', '#ea580c');
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
      color: '#D95C54'
    }
  }, "\uD83D\uDD0A Echo! 2\xD7 aggro")), false && ((_stateRef$current49 = stateRef.current) === null || _stateRef$current49 === void 0 ? void 0 : _stateRef$current49.currentZone) === 'frost' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:125 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(140,180,220,.2)'
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + SNOWMAN_SNOW_COST + ' snow (have ' + snowCount + ')', '#a0d8f0');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Snowman built!', '#a0d8f0');
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
          pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + SLED_WOOD_COST + ' wood (have ' + woodCount + ')', '#a0d8f0');
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Sled crafted!', '#60a5fa');
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'WHOOSH!', '#60a5fa');
        BT_AUDIO.beep(400, 0.1, 0.15, 'triangle');
      }
    }
  }, "\uD83D\uDEF7")), ((_stateRef$current50 = stateRef.current) === null || _stateRef$current50 === void 0 ? void 0 : _stateRef$current50.currentZone) === 'tidal' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:125 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(52,152,219,.2)'
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
      color: stateRef.current._raft ? '#59BF91' : '#3498DB'
    },
    onClick: function onClick() {
      var S = stateRef.current,
        R = S.rpg;
      if (S._raft) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Already have a raft!', '#3498DB');
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + RAFT_WOOD_COST + ' wood', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Raft built!', '#3498DB');
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
    }
  }, stateRef.current._raft ? '🚣 Raft Ready' : '🪵 Build Raft (' + RAFT_WOOD_COST + ' wood)')), ((_stateRef$current51 = stateRef.current) === null || _stateRef$current51 === void 0 ? void 0 : _stateRef$current51.currentZone) === 'hollows' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      /* v2.3.1205: was bottom:125 / zIndex:19 — inside + under the
         opaque 28vh dashboard band, so these zone-action buttons were
         unreachable on iPhone.  See src/ui/zLayers.js. */
      bottom: 'calc(var(--dash-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: Z_ABOVE_DASH_PROMPT,
      display: 'flex',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.55)+blur — spec bans backdrop-filter */,
      borderRadius: 10,      border: '1px solid rgba(121,85,72,.2)'
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Torch already lit!', '#ea580c');
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + TORCH_WOOD_COST + ' wood', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Torch lit!', '#ea580c');
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
  }, "\u26A0\uFE0F Dark! Monsters hear you.")), showEmotes && /*#__PURE__*/React.createElement(EmotePanel, { sendEmote: sendEmote }), /* v2.3.2051 (owner: "Yeah replace it"): the building-side town shop is
     RETIRED -- both the "Open Shop" prompt and the ShopPanel it opened.
     Shopkeeper Bro does this job now, and does it server-side: the old
     panel credited coins and edited the bag in the CLIENT and then told
     the server, which is the same self-credit shape the marketplace note
     calls free duplication for anyone with devtools.
     Its three consumables were not dropped with it -- traps, whetstones
     and antidotes are staples on his list at the SAME prices (shop.js
     SHOP.STAPLES), because this shop was their only source and deleting
     it without them would have removed them from the game rather than
     moved them. */
    null, nearBuilding !== null && BUILDINGS[nearBuilding] && /*#__PURE__*/React.createElement("button", {
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
  }, "E"), BUILDINGS[nearBuilding].iconSrc ? /*#__PURE__*/React.createElement("img", {
    /* v2.3.1224: UI Bible building icon (bldg-*) in the enter prompt;
       falls back to the emoji when iconSrc is absent. */
    src: BUILDINGS[nearBuilding].iconSrc,
    alt: "",
    draggable: false,
    style: {
      width: 16,
      height: 16,
      objectFit: 'contain',
      verticalAlign: '-3px',
      marginRight: 3
    }
  }) : BUILDINGS[nearBuilding].icon, " Enter ", BUILDINGS[nearBuilding].label), ((_stateRef$current52 = stateRef.current) === null || _stateRef$current52 === void 0 ? void 0 : _stateRef$current52._nearHouse) && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 140,
      background: 'rgba(89,191,145,.85)'
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
      pushDmgPopup(S2, S2.player.x, S2.player.y - 40, 'Zzz... Stats restored!', '#59BF91');
      pushDmgPopup(S2, S2.player.x, S2.player.y - 25, 'Well Rested +10% XP (30min)', '#D8A94D');
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
  }, "\uD83E\uDE91 Furniture Workshop"), /* v2.3.2245: the mid-screen harvest shell (#bt-node-prompt, the painted brass-on-navy pill that followed the node) is GONE -- the right button reads HARVEST when a resource is in reach and starts the harvest on a tap (bS in the touch effect). */ null, /*#__PURE__*/React.createElement(ExtractionSwipeLayer, {
    stateRef: stateRef,
    onSuccess: _succeedExtraction
  }), /* v2.3.1235: removed a literal "e.preventDefault();" STRING child —
     leaked into the JSX as visible text by a botched v2.3.1162 edit and
     rendered into the world overlay ever since (caught by a DOM-text QA
     probe; it sat right after the zone label in innerText). */
  function (_R$lifeSkills5, _R$lifeSkills6) {
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
        /* v2.3.2077: see the eat_request note above -- same flag, same
           hole. Cooking happens at a campfire, and a campfire in town is the
           obvious place to cook. */
        if (S.channel) {
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
        /* v2.3.2058: cleared with the timer -- a meal states its own
             magnitude (the 1.20 fallback), it must not inherit a Fury
             Tonic's x2 that is still ticking. Mirrors the server's
             `delete ps._buffs.damageMul` in cooking.js. */
        if (best.buff === 'damage') { S._dmgBuffMul = 0; S._dmgBuff = Date.now() + dur; }
        if (best.buff === 'all') {
          S._dmgBuffMul = 0;   /* v2.3.2058: see above */
          S._spdBuffMul = 0;   /* v2.3.2062: nor a Swift Draught's x1.5 */
          S._dmgBuff = Date.now() + dur;
          S._spdBuff = Date.now() + dur;
          S._hpBuff = Date.now() + dur;
          S._manaBuff = Date.now() + dur;
        }
        addLifeSkillXp(R.lifeSkills, 'cooking', best.tier * 25);
        pushDmgPopup(S, S.player.x, S.player.y - 30, best.name + '!', '#ea580c');
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
          pushDmgPopup(S, S.player.x, S.player.y - 30, 'Snowman placed!', '#a0d8f0');
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
          pushDmgPopup(S, S.player.x, S.player.y - 30, 'SLED!', '#60a5fa');
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
      var tideCol = S._tideLevel > 0.7 ? '#3498DB' : S._tideLevel < 0.3 ? '#D8A94D' : '#B9C1BF';
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Raft built! You can cross water.', '#d4a020');
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Torch lit! (2min)', '#ea580c');
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
          background: S._echoActive ? 'rgba(217,92,84,.1)' : 'rgba(255,255,255,.03)',
          border: S._echoActive ? '1px solid rgba(217,92,84,.2)' : '1px solid rgba(255,255,255,.06)',
          color: S._echoActive ? '#D95C54' : 'rgba(255,255,255,.3)'
        }
      }, S._echoActive ? '📢 ECHO: 2× aggro' : '📢 Echo: quiet'));
    }
    if (buttons.length === 0) return null;
    return (_React2 = React).createElement.apply(_React2, ['div', {
      style: {
        position: 'absolute',
        /* v2.3.1205: was bottom:145 / zIndex:18 — inside + under the
           opaque 28vh dashboard band (see src/ui/zLayers.js).  +32
           keeps its original 15-20px stack above the zone-action bars
           (now at +12). */
        bottom: 'calc(var(--dash-h) + 32px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: Z_ABOVE_DASH_PROMPT,
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        background: 'rgba(17,25,29,.85)' /* v2.3.1233: was rgba(0,0,0,.5)+blur */,
        borderRadius: 10,        border: '1px solid rgba(255,255,255,.08)'
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
        /* v2.3.1205: was bottom:210 / zIndex:18 — inside + under the
           28vh dashboard band on iPhone (≈225px+), which hid the
           ENDGAME PORTAL button entirely on mobile.  +92 preserves its
           original ~80px stack above the zone bars; centered, so it
           clears the corner joysticks at calc(var(--dash-h) + 70px).
           See src/ui/zLayers.js. */
        bottom: 'calc(var(--dash-h) + 92px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: Z_ABOVE_DASH_PROMPT,
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
        /* v2.3.1144: levelMod 60 dropped — the zone band is a real [81,100]
           since v2.3.1140, so the old +60 (a stand-in while bands were
           pinned [1,1]) spawned L141-160 monsters on this SP-fallback path. */
        S2.monsters = spawnMonstersForZone(ZONES.shadow);
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
        pushDmgPopup(S2, P2.x, P2.y - 40, 'Dark Sanctum', '#8E44AD');
        pushDmgPopup(S2, P2.x, P2.y - 25, 'Lv 81-100', 'rgba(255,255,255,.5)');
      },
      onMouseDown: function onMouseDown(e) {
        return e.preventDefault();
      }
    }, '🌑 Enter Dark Sanctum'), React.createElement('button', {
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
        /* v2.3.1144: levelMod 60 dropped — see the shadow branch note. */
        S2.monsters = spawnMonstersForZone(ZONES.radiant);
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
        pushDmgPopup(S2, P2.x, P2.y - 40, 'Light Summit', '#F1C40F');
        pushDmgPopup(S2, P2.x, P2.y - 25, 'Lv 81-100', 'rgba(255,255,255,.5)');
      },
      onMouseDown: function onMouseDown(e) {
        return e.preventDefault();
      }
    }, '☀️ Enter Light Summit'));
  }()), /*#__PURE__*/React.createElement(MenuBar, { stateRef: stateRef, rpgState: rpgState, bodySize: bodySize, chatOpen: chatOpen, friendsList: friendsList, unreadChats: unreadChats, showClanPanel: showClanPanel, showEncyclopedia: showEncyclopedia, showFeedback: showFeedback, showGuildPanel: showGuildPanel, showInventory: showInventory, showLeaderboard: showLeaderboard, showSkills: showSkills, showSocialPanel: showSocialPanel, showStatScreen: showStatScreen, doSpecialAttack: doSpecialAttack, setBodySize: setBodySize, setChatOpen: setChatOpen, setRpgState: setRpgState, setUnreadChats: setUnreadChats, setShowClanPanel: setShowClanPanel, setShowEmotes: setShowEmotes, setShowEncyclopedia: setShowEncyclopedia, setShowFeedback: setShowFeedback, setShowGuildPanel: setShowGuildPanel, setShowInfo: setShowInfo, setShowInventory: setShowInventory, setShowLeaderboard: setShowLeaderboard, setShowShop: setShowShop, setShowSkills: setShowSkills, setShowSocialPanel: setShowSocialPanel, setShowStatScreen: setShowStatScreen }), showInfo && /*#__PURE__*/React.createElement(InfoPanel, { playerCount: playerCount, setPlayerCount: setPlayerCount, setShowInfo: setShowInfo, stateRef: stateRef }),
  /* v2.3.816: floating-joystick touch zones.  Left half = movement, right
     half = aim/combat; each captures touches anywhere in its half and spawns
     the joystick under the finger (see the dual-joystick effect).  Transparent
     and z-index 6 so they sit over the world canvas but under all HUD
     (z>=20).  bt-desktop-hide drops them on desktop so the mouse reaches the
     canvas. */
  /*#__PURE__*/React.createElement(TouchControls, { stateRef: stateRef, lZoneRef: lZoneRef, rZoneRef: rZoneRef, joystickRef: joystickRef, lStickRef: lStickRef, knobRef: knobRef, lJoyPreviewRef: lJoyPreviewRef, rJoyRef: rJoyRef, rLabelRef: rLabelRef, rCueRef: rCueRef, rRingRef: rRingRef, isLandscape: isLandscape }), /* v2.3.1733: the two stamina-ability buttons ride with the touch controls — they self-hide until their milestone level unlocks them (AbilityButtons.jsx). */ /*#__PURE__*/React.createElement(AbilityButtons, { stateRef: stateRef, isLandscape: isLandscape }), /* v2.3.2242: the shield is a toggle button under the Attack button; it shows itself during combat (ShieldButton.jsx). */ /*#__PURE__*/React.createElement(ShieldButton, { stateRef: stateRef, isLandscape: isLandscape }), /* v2.3.2243: the target-switch arrows flank it while two or more monsters are in the perimeter (TargetArrows.jsx). */ /*#__PURE__*/React.createElement(TargetArrows, { stateRef: stateRef, isLandscape: isLandscape })), /* ═══ v2.3.1796: THE COACH MARKS LIVE OUTSIDE THE WRAP ═══
     Not a style choice — a hard requirement this cost a round of QA to
     find.  .brotown-wrap is position:fixed, and Chrome treats that as its
     own stacking context, so EVERY element inside it is confined to one
     rung of the root stack no matter what z-index it carries.  The coach
     mark rendered inside the wrap measured onto the right control, at the
     right size, at opacity 1 — and was invisible in a screenshot even at
     z-index 99999, because the dashboard band paints from outside.  This
     is the third sighting of the same trap (the HUD player chip at
     v2.3.1235 and the keyboard hints at v2.3.1728, both documented in
     game.css) and the answer is the same one they reached: sit outside
     the wrap, with the other fixed overlays.
     The cost of being outside is that the mark now also outranks the
     in-wrap modals, which it must NOT cover — QuestCoach handles that
     itself, by only drawing on a control a finger can actually reach. */
  /*#__PURE__*/React.createElement(QuestCoach, { stateRef: stateRef }), ((_window$matchMedia = (_window = window).matchMedia) === null || _window$matchMedia === void 0 || (_window$matchMedia = _window$matchMedia.call(_window, '(pointer:fine)')) === null || _window$matchMedia === void 0 ? void 0 : _window$matchMedia.matches) && /*#__PURE__*/React.createElement(KeyboardHintsPanel, { hidden: kbHintsOff, onToggle: toggleKbHints }), staleBuild && /*#__PURE__*/React.createElement(UpdateBanner, { info: staleBuild, onReload: function () { try { window.location.reload(); } catch (e) {} }, onDismiss: function () { setStaleBuild(null); } }), chatOpen && /*#__PURE__*/React.createElement(ChatPanel, { chatInput: chatInput, chatInputRef: chatInputRef, chatInputValRef: chatInputValRef, sendChat: sendChat, setChatInput: setChatInput, setChatOpen: setChatOpen }));
};
