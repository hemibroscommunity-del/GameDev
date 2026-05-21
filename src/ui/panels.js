/* ═══ BROTOWN UI — React JSX panels ═══ */
/* Bulk extracted from index.html lines 22750-42641 */
/* Contains all game UI panels: stats, inventory, skills, shop, */
/* marketplace, clan, arena, guilds, encyclopedia, etc. */
/* Pre-transpiled React.createElement calls (not JSX). */

import React from 'react';

/* Babel helpers */
function _slicedToArray(r, e) { if (Array.isArray(r)) return r; if (Symbol.iterator in Object(r)) { const a = []; let f = true; const t = r[Symbol.iterator](); for (let n; !(f = (n = t.next()).done) && (a.push(n.value), a.length !== e); f = true); return a; } }
function _toConsumableArray(r) { return Array.isArray(r) ? [...r] : Array.from(r); }
function _typeof(o) { return typeof o; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; Object.keys(t).forEach(function (r) { Object.defineProperty(e, r, { value: t[r], enumerable: true, configurable: true, writable: true }); }); } return e; }

import {
  TILE, ZONES, ELEMENTS, TOWN_BUILDINGS, PLAYER_COLORS,
  CLAN_COLORS, CLAN_CREATE_COST, CLAN_MAX_MEMBERS, CLAN_LOGO_SIZE,
} from "@/data/constants.js";

import * as DATA from "@/data/index.js";

const {
  BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, RARITY_TIERS,
  BT_AUDIO, BT_ACHIEVEMENTS,
  NPC_DATA, BUILDINGS,
  STAT_POINTS_PER_LEVEL, LEVEL_CAP, GEAR_STAT_REQ,
  REFORGE_BONUSES, GEM_CUT_TIERS, COOKING_RECIPES,
  EMOTES, TEXT_EMOTES, MKT_CATEGORIES,
  PET_EVOLUTION_TIERS, FURNITURE_RECIPES,
  DUNGEON_TERRAIN_PACKS, DUNGEON_MONSTER_PACKS,
  MASKS, ELEMENTAL_MINIGAMES, MINIGAME_REWARDS,
  QUEST_CHAINS, QUEST_STATUS, REPUTATION,
  createDefaultRpg, createDefaultLifeSkills, migrateLifeSkills,
  recalcDerived, getActiveWeapon,
  calcWeaponDmg, calcCritChance, calcCritMult, calcMoveSpeed,
  calcMaxHp, calcMaxStam, calcMaxMana, calcBlockReduction,
  xpRequired,
  getShieldBonus, getShieldStats, getAmuletBonus,
  getSalvageReturns, getAmuletSalvageReturns, gemExtractCost,
  rollReforgeBonus, hardenChance,
  hasUnlock, getNpcQuest,
  SHOP_PRICES, SHOP_ITEMS_FOR_SALE,
  getGuildRank, getGuildQuest, GUILD_RANKS, GUILD_QUESTS, SKILL_GUILDS,
  meetsStatReq, meetsGearReq, getGearStatReq, STAT_LABELS,
  createMinigameInstance, evaluateMinigame,
  getDungeonCreatorUnlocks, validateCustomDungeon, createDefaultDungeonConfig,
  createDefaultClan,
  LIFE_SKILLS, RESOURCE_TIERS,
  AMULET_TIERS, AMULET_GEM_STATS, SHIELD_GEM_STATS,
  GOLD_NUGGET_DROP, NUGGETS_PER_BAR,
  SALVAGE_RETURN_RATE, GEM_EXTRACT_BASE_COST,
  GAMBLE_WIN_CHANCE, GAMBLE_MIN_BET, GAMBLE_MAX_BET,
  JACKPOT_HOUSE_CUT, JACKPOT_MIN_DEPOSIT,
  QUEST_AP_REWARD, RARE_DROP_ITEMS,
  DEPTH_CONFIG, DEPTH_TIERS,
  FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS,
  ZONE_RESOURCES, GEM_DROP_RATES,
  ELEMENT_FLAVOR, flavorName,
  FEEDBACK_CATEGORIES, FEEDBACK_TOPICS,
  ARENA_ENTRY_FEE, ARENA_BET_MIN, ARENA_BET_MAX,
  MINIGAME_DURATION, MINIGAME_MIN_PLAYERS, MINIGAME_MAX_PLAYERS, MINIGAME_ENTRY_FEE,
  skillXpRequired, addLifeSkillXp, awardSkillXp,
  addResource, getResource,
  getEffectiveness,
  TOWN_EXITS,
  SLED_WOOD_COST, RAFT_WOOD_COST, TORCH_WOOD_COST,
  SNOWMAN_SNOW_COST,
  checkAnniversaryDrop, ANNIVERSARY_ITEMS,
  createPet,
} = DATA;

import { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase } from "@/networking/index.js";

/**
 * Renders all UI panels. Called from BroTown component.
 * This function contains the intermediate useState-dependent code 
 * (lines 22750-23754) and the main JSX return (23755-42641).
 * 
 * Due to extreme coupling with 100+ useState hooks, this is passed
 * all state and setters as a context object.
 */
export function renderBroTownUI(uiCtx) {
  /* All state and setters destructured from context */
  const {
    stateRef, canvasRef, wrapRef, nfts, onExit,
    chatInput, setChatInput, chatInputRef, chatInputValRef,
    chatOpen, setChatOpen, chatLog, setChatLog,
    nearBuilding, setNearBuilding,
    showPlayerList, setShowPlayerList,
    inspectPlayer, setInspectPlayer,
    playerList, setPlayerList,
    showEmotes, setShowEmotes,
    showInfo, setShowInfo,
    showChatLog, setShowChatLog,
    unreadChats, setUnreadChats,
    collectScore, setCollectScore,
    collectMsg, setCollectMsg,
    myBadges, setMyBadges,
    achievementMsg, setAchievementMsg,
    rpgState, setRpgState,
    showStatScreen, setShowStatScreen,
    showEncyclopedia, setShowEncyclopedia,
    encyclopediaTab, setEncyclopediaTab,
    dungeonCreator, setDungeonCreator,
    dungeonCreatorTab, setDungeonCreatorTab,
    showDungeonCreator, setShowDungeonCreator,
    showLeaderboard, setShowLeaderboard,
    leaderboardTab, setLeaderboardTab,
    mktMode, setMktMode,
    mktCategory, setMktCategory,
    mktSubtype, setMktSubtype,
    mktTier, setMktTier,
    mktElement1, setMktElement1,
    mktElement2, setMktElement2,
    mktPrice, setMktPrice,
    mktOrders, setMktOrders,
    mktSellItem, setMktSellItem,
    showPetHouse, setShowPetHouse,
    petHouseTab, setPetHouseTab,
    petEvolve1, setPetEvolve1,
    petEvolve2, setPetEvolve2,
    showFurniture, setShowFurniture,
    showClanWar, setShowClanWar,
    showArena, setShowArena,
    arenaStatus, setArenaStatus,
    arenaTournament, setArenaTournament,
    arenaHistory, setArenaHistory,
    showGuildPanel, setShowGuildPanel,
    guildSkill, setGuildSkill,
    arenaBetAmount, setArenaBetAmount,
    arenaBetTarget, setArenaBetTarget,
    arenaBets, setArenaBets,
    showFeedback, setShowFeedback,
    feedbackTab, setFeedbackTab,
    feedbackSort, setFeedbackSort,
    feedbackTopic, setFeedbackTopic,
    feedbackCategory, setFeedbackCategory,
    feedbackTickets, setFeedbackTickets,
    feedbackText, setFeedbackText,
    feedbackSubmitTopic, setFeedbackSubmitTopic,
    feedbackSubmitCategory, setFeedbackSubmitCategory,
    showMinigame, setShowMinigame,
    minigameInstance, setMinigameInstance,
    minigameScore, setMinigameScore,
    minigameTick, setMinigameTick,
    anniversaryDrop, setAnniversaryDrop,
    tutorialStep, setTutorialStep,
    showInventory, setShowInventory,
    selectedItem, setSelectedItem,
    showSkills, setShowSkills,
    showShop, setShowShop,
    buildingPanel, setBuildingPanel,
    cookMinigame, setCookMinigame,
    cookTick, setCookTick,
    questPanel, setQuestPanel,
    gatherMini, setGatherMini,
    gatherTick, setGatherTick,
    ferrymanPanel, setFerrymanPanel,
    fenceClimbing, setFenceClimbing,
    duelRequest, setDuelRequest,
    duelWager, setDuelWager,
    threatIncoming, setThreatIncoming,
    threatOutgoing, setThreatOutgoing,
    clanData, setClanData,
    showClanPanel, setShowClanPanel,
    clanCreateMode, setClanCreateMode,
    friendsList, setFriendsList,
    blockedList, setBlockedList,
    mutedList, setMutedList,
    showSocialPanel, setShowSocialPanel,
    showTrade, setShowTrade,
    tradeTarget, setTradeTarget,
    tradeOffer, setTradeOffer,
    tradeRequest, setTradeRequest,
    incomingTrade, setIncomingTrade,
    campfires, setCampfires,
    levelUpMsg, setLevelUpMsg,
    playerCount, setPlayerCount,
    joinFlash, setJoinFlash,
    showWelcome, setShowWelcome,
    nameInput, setNameInput,
    selectedAvatar, setSelectedAvatar,
    nftIdInput, setNftIdInput,
    closeAllMenus, sendChat,
    showNameModal, showLogin,
  } = uiCtx;

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
      text: '😴 Zzz... Stats restored!',
      color: '#3dd497',
      ts: Date.now()
    });
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 25,
      text: '✨ Well Rested +10% XP (30min)',
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
    if (skillLvl < node.gatherLvl) {
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
    var targetSize = Math.min(0.4, 0.12 + skillLvl * 0.004);
    var target = 0.2 + Math.random() * 0.6;
    setGatherMini({
      node: node,
      skill: skillName,
      started: Date.now(),
      target: target,
      targetSize: targetSize,
      result: null
    });
    BT_AUDIO.beep(600, 0.03, 0.04, 'sine');
  }, []);
  var _desktopFerryman = useCallback(function () {
    setFerrymanPanel(true);
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
    setRpgState(_objectSpread({}, S2.rpg));
    var wpnName = nextSlot === 'melee' ? (_S2$rpg$weapon = S2.rpg.weapon) === null || _S2$rpg$weapon === void 0 ? void 0 : _S2$rpg$weapon.name : nextSlot === 'ranged' ? (_S2$rpg$rangedWeapon = S2.rpg.rangedWeapon) === null || _S2$rpg$rangedWeapon === void 0 ? void 0 : _S2$rpg$rangedWeapon.name : 'Staff';
    S2.dmgNumbers.push({
      x: S2.player.x,
      y: S2.player.y - 40,
      text: '🔄 ' + wpnName,
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
      text: '🔄 ' + wpnName,
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
    setFerrymanPanel(false);
    setInspectPlayer(null);
  }, []);

  /* Virtual joysticks — each tracks its own finger */
  var joystickRef = useRef(null);
  var knobRef = useRef(null);
  var joystickActive = useRef(false);
  var lTouchId = useRef(null);
  var rJoyRef = useRef(null);
  var rKnobRef = useRef(null);
  var rJoyActive = useRef(false);
  var rTouchId = useRef(null);
  var shieldJoyRef = useRef(null);
  var shieldTouchId = useRef(null);
  var shieldJoyActive = useRef(false);
  var lTrail = useRef([]);
  var handleJoystickMove = useCallback(function (clientX, clientY) {
    var base = joystickRef.current;
    if (!base) return;
    var rect = base.getBoundingClientRect();
    var bcx = rect.left + rect.width / 2;
    var bcy = rect.top + rect.height / 2;
    var rawDx = clientX - bcx;
    var rawDy = clientY - bcy;
    var dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    var maxR = rect.width / 2 - 10;
    var clampDist = Math.min(dist, maxR);
    var angle = Math.atan2(rawDy, rawDx);
    var knobX = Math.cos(angle) * clampDist;
    var knobY = Math.sin(angle) * clampDist;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(calc(-50% + ".concat(knobX, "px), calc(-50% + ").concat(knobY, "px))");
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
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%,-50%)';
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
    var maxR = rect.width / 2 - 8;
    var clampDist = Math.min(dist, maxR);
    var angle = Math.atan2(rawDy, rawDx);
    if (rKnobRef.current) {
      var kx = Math.cos(angle) * clampDist,
        ky = Math.sin(angle) * clampDist;
      rKnobRef.current.style.transform = "translate(calc(-50% + ".concat(kx, "px), calc(-50% + ").concat(ky, "px))");
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
    if (rKnobRef.current) rKnobRef.current.style.transform = 'translate(-50%,-50%)';
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

  /* Dual joystick — each finger tracked independently */
  useEffect(function () {
    if (showNameModal || showLogin) return;
    var lBase = joystickRef.current;
    var rBase = rJoyRef.current;
    if (!lBase) return;
    var findT = function findT(tl, id) {
      for (var i = 0; i < tl.length; i++) if (tl[i].identifier === id) return tl[i];
      return null;
    };
    var lS = function lS(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      lTouchId.current = t.identifier;
      joystickActive.current = true;
      handleJoystickMove(t.clientX, t.clientY);
    };
    var lM = function lM(e) {
      if (lTouchId.current === null) return;
      var t = findT(e.touches, lTouchId.current);
      if (t) {
        e.preventDefault();
        handleJoystickMove(t.clientX, t.clientY);
      }
    };
    var lE = function lE(e) {
      if (lTouchId.current === null) return;
      var t = findT(e.changedTouches, lTouchId.current);
      if (t) {
        lTouchId.current = null;
        handleJoystickEnd();
      }
    };
    var rSwipe = {
      sx: 0,
      sy: 0,
      st: 0,
      lx: 0,
      ly: 0,
      lt: 0
    };
    var _rLastTap = 0;
    var WEAPON_CYCLE = ['melee', 'ranged', 'staff']; /* sword → bow → staff */
    var rS = function rS(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      rTouchId.current = t.identifier;
      rJoyActive.current = true;
      setAutoAttack(true);
      stateRef.current.autoAttack = true;
      rSwipe.sx = t.clientX;
      rSwipe.sy = t.clientY;
      rSwipe.st = Date.now();
      /* Double-tap detection → weapon swap */
      var now = Date.now();
      if (now - _rLastTap < 350) {
        var S2 = stateRef.current;
        if (S2.rpg) {
          var _S2$rpg$weapon3, _S2$rpg$rangedWeapon3, _ELEMENTS$swapElem;
          var slots = ['melee', 'ranged'];
          /* Add staff if player has a staff weapon */
          if (S2.rpg.staffWeapon) slots.push('staff');
          var curIdx = slots.indexOf(S2.rpg.activeSlot || 'melee');
          var nextSlot = slots[(curIdx + 1) % slots.length];
          S2.rpg.activeSlot = nextSlot;
          setRpgState(_objectSpread({}, S2.rpg));
          var wpnName = nextSlot === 'melee' ? (_S2$rpg$weapon3 = S2.rpg.weapon) === null || _S2$rpg$weapon3 === void 0 ? void 0 : _S2$rpg$weapon3.name : nextSlot === 'ranged' ? (_S2$rpg$rangedWeapon3 = S2.rpg.rangedWeapon) === null || _S2$rpg$rangedWeapon3 === void 0 ? void 0 : _S2$rpg$rangedWeapon3.name : 'Staff';
          S2.dmgNumbers.push({
            x: S2.player.x,
            y: S2.player.y - 40,
            text: '🔄 ' + wpnName,
            color: '#f5c542',
            ts: now
          });
          BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
          setTimeout(function () {
            return BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
          }, 60);
          /* ═══ WEAPON SWAP VISUAL — burst of element-colored sparks ═══ */
          S2._weaponSwapFlash = now;
          var swapWpn = getActiveWeapon(S2.rpg);
          var swapElem = swapWpn === null || swapWpn === void 0 ? void 0 : swapWpn.element1;
          var swapColor = swapElem ? ((_ELEMENTS$swapElem = ELEMENTS[swapElem]) === null || _ELEMENTS$swapElem === void 0 ? void 0 : _ELEMENTS$swapElem.color) || '#fff' : '#f5c542';
          for (var ws = 0; ws < 12; ws++) {
            var wsA = ws / 12 * Math.PI * 2;
            S2.hitParticles.push({
              x: S2.player.x,
              y: S2.player.y,
              vx: Math.cos(wsA) * (1.5 + Math.random() * 2),
              vy: Math.sin(wsA) * (1.5 + Math.random() * 2) - 1,
              life: 0.4,
              color: swapColor,
              size: 1 + Math.random() * 1.5
            });
          }
        }
        _rLastTap = 0;
        return; /* don't swing on the swap tap */
      }
      _rLastTap = now;
      handleRJoyMove(t.clientX, t.clientY);
      doSwing();
    };
    var rM = function rM(e) {
      if (rTouchId.current === null) return;
      var t = findT(e.touches, rTouchId.current);
      if (t) {
        e.preventDefault();
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
        /* Check for flick/swipe → elemental attack */
        /* Compare against last tracked position (catches flick at end of hold) */
        var refX = rSwipe.lx || rSwipe.sx;
        var refY = rSwipe.ly || rSwipe.sy;
        var refT = rSwipe.lt || rSwipe.st;
        var dx = t.clientX - refX,
          dy = t.clientY - refY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var dur = Date.now() - refT;
        var spd = dist / Math.max(dur, 1);
        /* Also check total distance from start as fallback */
        var totalDx = t.clientX - rSwipe.sx,
          totalDy = t.clientY - rSwipe.sy;
        var totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
        var totalDur = Date.now() - rSwipe.st;
        var totalSpd = totalDist / Math.max(totalDur, 1);
        var isFlick = spd > 0.15 && dist > 8 && dur < 400 || totalSpd > 0.2 && totalDist > 15 && totalDur < 500;
        if (isFlick) {
          /* Elemental swipe in flick direction */
          var S2 = stateRef.current;
          S2._hasUsedSwipe = true;
          /* Use whichever has more distance for the angle */
          var useDx = totalDist > dist ? totalDx : dx;
          var useDy = totalDist > dist ? totalDy : dy;
          var flickAng = Math.atan2(useDy, useDx);
          S2._aimAngle = flickAng;
          S2._facing = Math.abs(useDx) > Math.abs(useDy) ? useDx > 0 ? 'right' : 'left' : useDy > 0 ? 'down' : 'up';
          doSpecialAttack();
        }
        rTouchId.current = null;
        handleRJoyEnd();
      }
    };
    lBase.addEventListener('touchstart', lS, {
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
  }, [showNameModal, showLogin, handleJoystickMove, handleJoystickEnd, handleRJoyMove, handleRJoyEnd, handleShieldMove]);

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
    BT_AUDIO.init();
    BT_AUDIO.join();
    setShowWelcome(false);
  };

  /* Name / avatar selection modal */
  if (showNameModal) return /*#__PURE__*/React.createElement("div", {
    className: "bt-name-modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-name-box"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 4
    }
  }, "\u2694\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: 'var(--txt)',
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
      letterSpacing: '.06em'
    }
  }, "HEMI BROS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--pop)',
      fontWeight: 700,
      marginBottom: 2
    }
  }, "Action RPG"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'var(--txt3)',
      marginBottom: 16
    }
  }, "9 Elements \xB7 36 Collisions \xB7 Open World"), /*#__PURE__*/React.createElement("input", {
    value: nameInput,
    onChange: function onChange(e) {
      return setNameInput(e.target.value);
    },
    onKeyDown: function onKeyDown(e) {
      return e.key === 'Enter' && joinTown();
    },
    placeholder: "Enter your name\u2026",
    maxLength: 20,
    autoFocus: true,
    style: {
      width: '100%',
      padding: '12px 14px',
      background: 'var(--ink3)',
      border: '1.5px solid var(--line)',
      borderRadius: 10,
      color: 'var(--txt)',
      fontSize: 15,
      fontWeight: 600,
      outline: 'none',
      textAlign: 'center',
      marginBottom: 12,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--txt3)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 6
    }
  }, "Your Hemi Bro NFT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: nftIdInput,
    onChange: function onChange(e) {
      return setNftIdInput(e.target.value.replace(/[^0-9]/g, ''));
    },
    onKeyDown: function onKeyDown(e) {
      return e.key === 'Enter' && lookupNftById(nftIdInput);
    },
    placeholder: "NFT ID (1-6666)",
    maxLength: 5,
    style: {
      flex: 1,
      padding: '10px 12px',
      background: 'var(--ink3)',
      border: '1.5px solid var(--line)',
      borderRadius: 8,
      color: 'var(--txt)',
      fontSize: 14,
      fontWeight: 600,
      outline: 'none',
      textAlign: 'center',
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return lookupNftById(nftIdInput);
    },
    disabled: nftLoading || !nftIdInput,
    style: {
      padding: '10px 16px',
      background: nftLoading ? 'var(--ink3)' : 'var(--pop)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      opacity: nftLoading || !nftIdInput ? 0.5 : 1,
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
      whiteSpace: 'nowrap'
    }
  }, nftLoading ? '...' : 'FIND')), nftError && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#ef4444',
      marginTop: 4,
      textAlign: 'center'
    }
  }, nftError), nftLookup && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
      padding: '8px 10px',
      background: 'var(--ink3)',
      borderRadius: 8,
      border: '1.5px solid var(--pop)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: wsrvUrl(nftLookup.Image, 80),
    alt: '#' + nftLookup.ID,
    style: {
      width: 48,
      height: 48,
      borderRadius: 6,
      imageRendering: 'pixelated',
      background: 'var(--ink)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: 'var(--txt)',
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
    }
  }, "Hemi Bro #", nftLookup.ID), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--pop)',
      fontWeight: 600
    }
  }, nftLookup.broType)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      cursor: 'pointer',
      color: 'var(--txt3)'
    },
    onClick: function onClick() {
      setNftLookup(null);
      setNftIdInput('');
    }
  }, "\u2715")), !nftLookup && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'var(--txt3)',
      marginTop: 4,
      textAlign: 'center'
    }
  }, "Enter your NFT ID to play as your Hemi Bro")), avatarPool.length > 0 && !nftLookup && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--txt3)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 6
    }
  }, "Or pick a random Bro"), /*#__PURE__*/React.createElement("div", {
    className: "bt-avatar-pick"
  }, avatarPool.map(function (n, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: n.ID,
      className: "bt-avatar-opt ".concat(selectedAvatar === i ? 'sel' : ''),
      onClick: function onClick() {
        return setSelectedAvatar(selectedAvatar === i ? null : i);
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: wsrvUrl(n.Image, 80),
      alt: "#".concat(n.ID),
      loading: "lazy"
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--txt3)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Masks & Headwear"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if (R) {
        R._activeMask = null;
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused13) {}
      }
    },
    style: {
      width: 32,
      height: 32,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: !((_stateRef$current = stateRef.current) !== null && _stateRef$current !== void 0 && (_stateRef$current = _stateRef$current.rpg) !== null && _stateRef$current !== void 0 && _stateRef$current._activeMask) ? 'rgba(91,82,255,.2)' : 'rgba(255,255,255,.03)',
      border: '2px solid ' + (!((_stateRef$current2 = stateRef.current) !== null && _stateRef$current2 !== void 0 && (_stateRef$current2 = _stateRef$current2.rpg) !== null && _stateRef$current2 !== void 0 && _stateRef$current2._activeMask) ? '#5b52ff' : 'rgba(255,255,255,.08)'),
      fontSize: 10
    }
  }, "\u2715"), MASKS.map(function (m) {
    var _stateRef$current3, _stateRef$current4, _stateRef$current5, _stateRef$current6;
    var owned = (_stateRef$current3 = stateRef.current) === null || _stateRef$current3 === void 0 || (_stateRef$current3 = _stateRef$current3.rpg) === null || _stateRef$current3 === void 0 || (_stateRef$current3 = _stateRef$current3._masks) === null || _stateRef$current3 === void 0 ? void 0 : _stateRef$current3.includes(m.id);
    var active = ((_stateRef$current4 = stateRef.current) === null || _stateRef$current4 === void 0 || (_stateRef$current4 = _stateRef$current4.rpg) === null || _stateRef$current4 === void 0 ? void 0 : _stateRef$current4._activeMask) === m.id;
    var canBuy = (((_stateRef$current5 = stateRef.current) === null || _stateRef$current5 === void 0 || (_stateRef$current5 = _stateRef$current5.rpg) === null || _stateRef$current5 === void 0 ? void 0 : _stateRef$current5.level) || 1) >= m.minLvl && (((_stateRef$current6 = stateRef.current) === null || _stateRef$current6 === void 0 || (_stateRef$current6 = _stateRef$current6.rpg) === null || _stateRef$current6 === void 0 ? void 0 : _stateRef$current6.coins) || 0) >= m.cost;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      onClick: function onClick() {
        var _R$_masks;
        var R = stateRef.current.rpg;
        if (!R) return;
        if (owned || (_R$_masks = R._masks) !== null && _R$_masks !== void 0 && _R$_masks.includes(m.id)) {
          R._activeMask = active ? null : m.id;
        } else if (canBuy) {
          R.coins -= m.cost;
          if (!R._masks) R._masks = [];
          R._masks.push(m.id);
          R._activeMask = m.id;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: m.emoji + ' ' + m.name + ' unlocked!',
            color: '#f5c542',
            ts: Date.now()
          });
        } else return;
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused14) {}
        setRpgState(_objectSpread({}, R));
      },
      title: m.name + ' — ' + (owned ? 'Owned (tap to equip)' : 'Lv' + m.minLvl + ' · ' + m.cost + 'G'),
      style: {
        width: 32,
        height: 32,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 16,
        position: 'relative',
        background: active ? 'rgba(245,197,66,.2)' : owned ? 'rgba(61,212,151,.08)' : 'rgba(255,255,255,.03)',
        border: '2px solid ' + (active ? '#f5c542' : owned ? 'rgba(61,212,151,.3)' : 'rgba(255,255,255,.06)'),
        opacity: !owned && !canBuy ? 0.35 : 1
      }
    }, m.emoji, !owned && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        fontSize: 5,
        fontWeight: 900,
        background: 'rgba(0,0,0,.7)',
        color: '#f5c542',
        padding: '0 2px',
        borderRadius: 2
      }
    }, m.cost, "G"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.2)',
      textAlign: 'center',
      marginTop: 3
    }
  }, "Tap to buy & equip. Tap again to remove.")), /*#__PURE__*/React.createElement("button", {
    onClick: joinTown,
    style: {
      marginTop: 12,
      padding: '12px 32px',
      background: 'var(--pop)',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 800,
      cursor: 'pointer',
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
      letterSpacing: '.08em',
      width: '100%'
    }
  }, "PLAY")));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
      top: 6,
      right: 6,
      zIndex: 999,
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
    ref: canvasRef,
    className: "brotown-canvas",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
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
          handleCanvasSwipe(ct.x, ct.y, t.clientX, t.clientY, Date.now() - ct.t);
          ct.id = null;
          break;
        }
      }
    },
    onMouseMove: function onMouseMove(e) {
      if (!stateRef.current._isDesktop) return;
      var S = stateRef.current;
      var rect = e.currentTarget.getBoundingClientRect();
      var screenX = (e.clientX - rect.left) * 1.0;
      var screenY = (e.clientY - rect.top) * 1.0;
      /* Convert screen coords to world coords using camera */
      var worldX = screenX + S.camera.x;
      var worldY = screenY + S.camera.y;
      /* Aim angle from player to mouse world position */
      S._mouseAimAngle = Math.atan2(worldY - S.player.y, worldX - S.player.x);
      S._aimAngle = S._mouseAimAngle;
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
      var rect = e.currentTarget.getBoundingClientRect();
      var tapX = (e.clientX - rect.left) * 1.0;
      var tapY = (e.clientY - rect.top) * 1.0;
      var S = stateRef.current;
      var cx = S.camera.x,
        cy = S.camera.y;
      /* Check monsters for lock-on */
      if (S.monsters) {
        var closest = null,
          closestDist = 30;
        S.monsters.forEach(function (m) {
          if (!m.alive) return;
          var msx = m.x - cx,
            msy = m.y - cy;
          var d = Math.sqrt(Math.pow(tapX - msx, 2) + Math.pow(tapY - msy, 2));
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
            var nsx = npc.x - cx,
              nsy = npc.y - cy;
            if (Math.sqrt(Math.pow(tapX - nsx, 2) + Math.pow(tapY - nsy, 2)) < 25) {
              /* The Ferryman — special travel dialog */
              if (npc.isFerryman) {
                setFerrymanPanel(true);
                return;
              }
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
        var osx = o.renderX - cx,
          osy = o.renderY - cy;
        if (Math.sqrt(Math.pow(tapX - osx, 2) + Math.pow(tapY - osy, 2)) < 20) {
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
  }(), anniversaryDrop && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.85)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 28,
      maxWidth: 300
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 8,
      animation: 'scoreReveal .6s cubic-bezier(.22,1,.36,1)'
    }
  }, "\uD83C\uDFF4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Anniversary Drop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      color: '#f5c542',
      marginBottom: 4,
      textShadow: '0 0 20px rgba(212,160,48,.5)'
    }
  }, anniversaryDrop.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, anniversaryDrop.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      justifyContent: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 800,
      background: 'rgba(212,160,48,.15)',
      border: '1px solid rgba(212,160,48,.3)',
      color: '#f5c542'
    }
  }, (_anniversaryDrop$rari = anniversaryDrop.rarity) === null || _anniversaryDrop$rari === void 0 ? void 0 : _anniversaryDrop$rari.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 700,
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.4)'
    }
  }, "Tradeable"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 700,
      background: 'rgba(255,94,108,.1)',
      border: '1px solid rgba(255,94,108,.2)',
      color: '#ff5e6c'
    }
  }, "Discontinued")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 80,
      margin: '0 auto 12px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 10,
      top: 5,
      width: 40,
      height: 50,
      borderRadius: 4,
      background: 'linear-gradient(180deg, ' + anniversaryDrop.colors.primary + ' 0%, ' + anniversaryDrop.colors.primary + ' 70%, ' + anniversaryDrop.colors.accent + ' 100%)',
      border: '1.5px solid ' + anniversaryDrop.colors.trim,
      boxShadow: '0 0 15px ' + anniversaryDrop.colors.glow
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if (!R._anniversaryItems) R._anniversaryItems = [];
      R._anniversaryItems.push({
        id: anniversaryDrop.id,
        name: anniversaryDrop.name,
        emoji: anniversaryDrop.emoji,
        type: anniversaryDrop.type,
        rarity: anniversaryDrop.rarity,
        colors: anniversaryDrop.colors,
        claimedAt: Date.now(),
        tradeable: true
      });
      setAnniversaryDrop(null);
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 40,
        text: '🏴 OG Bro Cape claimed!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.levelUp();
      stateRef.current.screenShake = 6;
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused15) {}
    },
    style: {
      padding: '12px 32px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 900,
      border: '2px solid #f5c542',
      background: 'rgba(245,197,66,.15)',
      color: '#f5c542',
      cursor: 'pointer',
      letterSpacing: '.05em',
      boxShadow: '0 0 20px rgba(245,197,66,.3)',
      textTransform: 'uppercase'
    }
  }, "\u2728 Claim"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.2)',
      marginTop: 8
    }
  }, "One per account \xB7 Can be traded with other players"))), showMinigame && /*#__PURE__*/React.createElement("div", {
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
        text: '🎮 +' + reward + 'G! Score: ' + minigameScore,
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
    onClick: onExit
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
  }))), showGuildPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowGuildPanel(false);
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
      return setShowGuildPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#a855f7',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFDB\uFE0F Life Skill Guilds"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Progress through guild ranks to earn titles and AP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, Object.entries(SKILL_GUILDS).map(function (_ref31) {
    var _rpgState$lifeSkills;
    var _ref32 = _slicedToArray(_ref31, 2),
      key = _ref32[0],
      g = _ref32[1];
    var lvl = ((_rpgState$lifeSkills = rpgState.lifeSkills) === null || _rpgState$lifeSkills === void 0 || (_rpgState$lifeSkills = _rpgState$lifeSkills[key]) === null || _rpgState$lifeSkills === void 0 ? void 0 : _rpgState$lifeSkills.level) || 1;
    var rank = getGuildRank(lvl);
    var sel = guildSkill === key;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      onClick: function onClick() {
        return setGuildSkill(key);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? g.color : 'rgba(255,255,255,.08)'),
        background: sel ? g.color + '20' : 'rgba(255,255,255,.02)',
        color: sel ? g.color : 'rgba(255,255,255,.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }
    }, g.icon, " ", key.replace(/([A-Z])/g, ' $1').trim(), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: rank.color
      }
    }, rank.title.charAt(0)));
  })), function (_rpgState$lifeSkills2) {
    var key = guildSkill;
    var g = SKILL_GUILDS[key];
    var skill = (_rpgState$lifeSkills2 = rpgState.lifeSkills) === null || _rpgState$lifeSkills2 === void 0 ? void 0 : _rpgState$lifeSkills2[key];
    var lvl = (skill === null || skill === void 0 ? void 0 : skill.level) || 1;
    var rank = getGuildRank(lvl);
    var nextRank = GUILD_RANKS.find(function (r) {
      return r.minLvl > lvl;
    });
    var quest = getGuildQuest(key, rpgState);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 10,
        borderRadius: 8,
        background: g.color + '10',
        border: '1.5px solid ' + g.color + '30',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28
      }
    }, g.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: g.color
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Guildmaster: ", g.master), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: rank.color,
        marginTop: 2
      }
    }, rank.title))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#fff'
      }
    }, "Lv ", lvl), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: 'rgba(0,0,0,.3)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 3,
        background: g.color,
        width: Math.min(100, (lvl - rank.minLvl) / Math.max(1, nextRank.minLvl - rank.minLvl) * 100) + '%',
        transition: 'width .3s'
      }
    })), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Next: ", nextRank.title, " (Lv", nextRank.minLvl, ")"), !nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#f5c542'
      }
    }, "MAX RANK"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Guild Ranks"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 8
      }
    }, GUILD_RANKS.map(function (r) {
      var achieved = lvl >= r.minLvl;
      return /*#__PURE__*/React.createElement("div", {
        key: r.rank,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          background: achieved ? r.color + '20' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (achieved ? r.color + '40' : 'rgba(255,255,255,.05)'),
          color: achieved ? r.color : 'rgba(255,255,255,.12)'
        }
      }, achieved ? '✅' : '🔒', " ", r.title, " (Lv", r.minLvl, ")", achieved && r.ap > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.3)',
          marginLeft: 2
        }
      }, "+", r.ap, "AP"));
    })), quest && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 6,
        background: quest.complete ? 'rgba(61,212,151,.08)' : 'rgba(255,255,255,.03)',
        border: '1px solid ' + (quest.complete ? 'rgba(61,212,151,.2)' : 'rgba(255,255,255,.08)'),
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: quest.complete ? '#3dd497' : '#f5c542',
        marginBottom: 2
      }
    }, quest.complete ? '✅' : '📋', " ", quest.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, quest.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginTop: 2
      }
    }, "Progress: Lv", quest.currentLvl, "/", quest.checkLvl, " \xB7 Reward: ", quest.reward.gold, "G +", quest.reward.ap, "AP"), quest.complete && /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        var R = stateRef.current.rpg,
          S = stateRef.current;
        if (!R._guildProgress) R._guildProgress = {};
        var completed = R._guildProgress[key] || 0;
        R._guildProgress[key] = completed + 1;
        R.coins += quest.reward.gold;
        R.achievementPoints = (R.achievementPoints || 0) + quest.reward.ap;
        if (R._compStats) {
          R._compStats.totalGoldEarned += quest.reward.gold;
          R._compStats.questsCompleted++;
        }
        /* Track guild stats for achievements */
        if (!S.stats._guildRanksEarned) S.stats._guildRanksEarned = 0;
        S.stats._guildRanksEarned++;
        var newRank = getGuildRank(quest.currentLvl);
        if (newRank.rank >= 5) {
          if (!S.stats._guildMasterCount) S.stats._guildMasterCount = 0;
          S.stats._guildMasterCount++;
        }
        /* Add title */
        if (!R._titles) R._titles = [];
        var titleStr = newRank.title + ' ' + key.replace(/([A-Z])/g, ' $1').trim();
        if (!R._titles.includes(titleStr)) R._titles.push(titleStr);
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 40,
          text: '🏛️ ' + quest.title + ' complete!',
          color: g.color,
          ts: Date.now()
        });
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 25,
          text: '+' + quest.reward.gold + 'G +' + quest.reward.ap + 'AP',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused18) {}
      },
      style: {
        marginTop: 4,
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid rgba(61,212,151,.4)',
        background: 'rgba(61,212,151,.15)',
        color: '#3dd497',
        cursor: 'pointer'
      }
    }, "\uD83C\uDFDB\uFE0F Claim Reward")), !quest && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        padding: 8,
        textAlign: 'center'
      }
    }, "All guild quests completed! You are a ", rank.title, " of the ", g.name, "."), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 6,
        borderRadius: 5,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.04)',
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: g.masterColor,
        fontWeight: 700
      }
    }, g.master, ":"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        fontStyle: 'italic'
      }
    }, lvl < 10 ? "Welcome to the guild. Work hard and you'll rise." : lvl < 25 ? "You're making progress. Keep at it." : lvl < 50 ? "Impressive dedication. The guild honors your commitment." : lvl < 75 ? "Few reach this level. You are a true craftsman." : lvl < 100 ? "A master walks among us. The guild bows to your skill." : "You have transcended mortal limits. Legendary.")), (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 2
      }
    }, "Earned Titles"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).map(function (t, i) {
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          background: g.color + '15',
          border: '1px solid ' + g.color + '30',
          color: g.color
        }
      }, t);
    }))));
  }())), showFeedback && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowFeedback(false);
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
      return setShowFeedback(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#5b52ff',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDCDD Community Feedback"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Report bugs, suggest features, vote on priorities"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['browse', '📋 Browse'], ['submit', '✏️ Submit']].map(function (_ref33) {
    var _ref34 = _slicedToArray(_ref33, 2),
      id = _ref34[0],
      label = _ref34[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setFeedbackTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 10,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: feedbackTab === id ? 'rgba(91,82,255,.2)' : 'rgba(255,255,255,.03)',
        color: feedbackTab === id ? '#8880ff' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
      }
    }, label);
  })), feedbackTab === 'browse' && function () {
    var S = stateRef.current;
    /* Fetch tickets on filter change */
    var filterKey = feedbackSort + (feedbackTopic || 'all') + (feedbackCategory || 'all');
    if (S._fbLastFilter !== filterKey) {
      S._fbLastFilter = filterKey;
      var params = new URLSearchParams({
        sort: feedbackSort,
        limit: '20',
        offset: '0'
      });
      if (feedbackTopic) params.set('topic', feedbackTopic);
      if (feedbackCategory) params.set('category', feedbackCategory);
      fetch(BT_API_BASE + '/api/feedback/list?' + params).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setFeedbackTickets(d.tickets || []);
      }).catch(function () {});
    }
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2,
        marginBottom: 6
      }
    }, [['top', '🔥 Top'], ['trending', '📈 Trending'], ['new', '🆕 New']].map(function (_ref35) {
      var _ref36 = _slicedToArray(_ref35, 2),
        id = _ref36[0],
        label = _ref36[1];
      return /*#__PURE__*/React.createElement("button", {
        key: id,
        onClick: function onClick() {
          setFeedbackSort(id);
          S._fbLastFilter = null;
        },
        style: {
          flex: 1,
          padding: '4px 2px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (feedbackSort === id ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
          background: feedbackSort === id ? 'rgba(91,82,255,.1)' : 'transparent',
          color: feedbackSort === id ? '#8880ff' : 'rgba(255,255,255,.3)',
          cursor: 'pointer'
        }
      }, label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackTopic(null);
        S._fbLastFilter = null;
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (feedbackTopic === null ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
        background: feedbackTopic === null ? 'rgba(91,82,255,.08)' : 'transparent',
        color: feedbackTopic === null ? '#8880ff' : 'rgba(255,255,255,.2)',
        cursor: 'pointer'
      }
    }, "All"), FEEDBACK_TOPICS.map(function (t) {
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: function onClick() {
          setFeedbackTopic(feedbackTopic === t.id ? null : t.id);
          S._fbLastFilter = null;
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 600,
          border: '1px solid ' + (feedbackTopic === t.id ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.04)'),
          background: feedbackTopic === t.id ? 'rgba(91,82,255,.08)' : 'transparent',
          color: feedbackTopic === t.id ? '#8880ff' : 'rgba(255,255,255,.18)',
          cursor: 'pointer'
        }
      }, t.label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackCategory(null);
        S._fbLastFilter = null;
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (feedbackCategory === null ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)'),
        background: feedbackCategory === null ? 'rgba(255,255,255,.05)' : 'transparent',
        color: feedbackCategory === null ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.18)',
        cursor: 'pointer'
      }
    }, "All"), FEEDBACK_CATEGORIES.map(function (c) {
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: function onClick() {
          setFeedbackCategory(feedbackCategory === c.id ? null : c.id);
          S._fbLastFilter = null;
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid ' + (feedbackCategory === c.id ? c.color + '50' : 'rgba(255,255,255,.04)'),
          background: feedbackCategory === c.id ? c.color + '15' : 'transparent',
          color: feedbackCategory === c.id ? c.color : 'rgba(255,255,255,.18)',
          cursor: 'pointer'
        }
      }, c.label);
    })), feedbackTickets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 12
      }
    }, "No feedback yet. Be the first to submit!"), feedbackTickets.map(function (t) {
      var cat = FEEDBACK_CATEGORIES.find(function (c) {
        return c.id === t.category;
      });
      var top = FEEDBACK_TOPICS.find(function (tp) {
        return tp.id === t.topic;
      });
      var score = t.up - t.down;
      var age = Date.now() - t.ts;
      var ageStr = age < 60000 ? 'now' : age < 3600000 ? Math.floor(age / 60000) + 'm' : age < 86400000 ? Math.floor(age / 3600000) + 'h' : Math.floor(age / 86400000) + 'd';
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          display: 'flex',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 3,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.05)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          minWidth: 28
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
          var res, d, _t4;
          return _regenerator().w(function (_context5) {
            while (1) switch (_context5.p = _context5.n) {
              case 0:
                _context5.p = 0;
                _context5.n = 1;
                return fetch(BT_API_BASE + '/api/feedback/vote', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ticketId: t.id,
                    playerId: stateRef.current.myId,
                    vote: 'up'
                  })
                });
              case 1:
                res = _context5.v;
                _context5.n = 2;
                return res.json();
              case 2:
                d = _context5.v;
                if (d.ok) setFeedbackTickets(function (prev) {
                  return prev.map(function (x) {
                    return x.id === t.id ? _objectSpread(_objectSpread({}, x), {}, {
                      up: d.up,
                      down: d.down
                    }) : x;
                  });
                });
                _context5.n = 4;
                break;
              case 3:
                _context5.p = 3;
                _t4 = _context5.v;
              case 4:
                return _context5.a(2);
            }
          }, _callee5, null, [[0, 3]]);
        })),
        style: {
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          color: score > 0 ? '#3dd497' : 'rgba(255,255,255,.2)',
          padding: 0
        }
      }, "\u25B2"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 900,
          color: score > 0 ? '#3dd497' : score < 0 ? '#ff5e6c' : 'rgba(255,255,255,.3)'
        }
      }, score), /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
          var res, d, _t5;
          return _regenerator().w(function (_context6) {
            while (1) switch (_context6.p = _context6.n) {
              case 0:
                _context6.p = 0;
                _context6.n = 1;
                return fetch(BT_API_BASE + '/api/feedback/vote', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ticketId: t.id,
                    playerId: stateRef.current.myId,
                    vote: 'down'
                  })
                });
              case 1:
                res = _context6.v;
                _context6.n = 2;
                return res.json();
              case 2:
                d = _context6.v;
                if (d.ok) setFeedbackTickets(function (prev) {
                  return prev.map(function (x) {
                    return x.id === t.id ? _objectSpread(_objectSpread({}, x), {}, {
                      up: d.up,
                      down: d.down
                    }) : x;
                  });
                });
                _context6.n = 4;
                break;
              case 3:
                _context6.p = 3;
                _t5 = _context6.v;
              case 4:
                return _context6.a(2);
            }
          }, _callee6, null, [[0, 3]]);
        })),
        style: {
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          color: score < 0 ? '#ff5e6c' : 'rgba(255,255,255,.2)',
          padding: 0
        }
      }, "\u25BC")), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          padding: '1px 4px',
          borderRadius: 2,
          fontSize: 6,
          fontWeight: 800,
          background: (cat === null || cat === void 0 ? void 0 : cat.color) + '20',
          color: cat === null || cat === void 0 ? void 0 : cat.color,
          border: '1px solid ' + (cat === null || cat === void 0 ? void 0 : cat.color) + '30'
        }
      }, (cat === null || cat === void 0 ? void 0 : cat.label) || t.category), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.2)'
        }
      }, (top === null || top === void 0 ? void 0 : top.label) || t.topic), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.12)',
          marginLeft: 'auto'
        }
      }, ageStr)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: 'rgba(255,255,255,.7)',
          lineHeight: 1.3,
          wordBreak: 'break-word'
        }
      }, t.text), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.15)',
          marginTop: 2
        }
      }, "by ", t.playerName, " \xB7 \uD83D\uDC4D", t.up, " \uD83D\uDC4E", t.down)));
    }), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        stateRef.current._fbLastFilter = null;
        setFeedbackTickets([]);
      },
      style: {
        width: '100%',
        marginTop: 4,
        padding: '4px 0',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.08)',
        background: 'rgba(255,255,255,.03)',
        color: 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04 Refresh"));
  }(), feedbackTab === 'submit' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 3
    }
  }, "Topic"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, FEEDBACK_TOPICS.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        return setFeedbackSubmitTopic(t.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (feedbackSubmitTopic === t.id ? 'rgba(91,82,255,.4)' : 'rgba(255,255,255,.06)'),
        background: feedbackSubmitTopic === t.id ? 'rgba(91,82,255,.12)' : 'rgba(255,255,255,.02)',
        color: feedbackSubmitTopic === t.id ? '#8880ff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 3
    }
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 8
    }
  }, FEEDBACK_CATEGORIES.map(function (c) {
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: function onClick() {
        return setFeedbackSubmitCategory(c.id);
      },
      style: {
        padding: '4px 8px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (feedbackSubmitCategory === c.id ? c.color + '60' : 'rgba(255,255,255,.08)'),
        background: feedbackSubmitCategory === c.id ? c.color + '18' : 'rgba(255,255,255,.02)',
        color: feedbackSubmitCategory === c.id ? c.color : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, c.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        fontWeight: 400,
        color: 'rgba(255,255,255,.2)',
        marginTop: 1
      }
    }, c.desc));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 3
    }
  }, "Description (", feedbackText.length, "/100)"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackText,
    onChange: function onChange(e) {
      return setFeedbackText(e.target.value.slice(0, 100));
    },
    maxLength: 100,
    rows: 3,
    placeholder: "Brief description...",
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#fff',
      fontSize: 11,
      fontFamily: 'inherit',
      resize: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var S, res, d, _t6;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.p = _context7.n) {
          case 0:
            S = stateRef.current;
            if (feedbackText.trim()) {
              _context7.n = 1;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Write something first!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context7.a(2);
          case 1:
            _context7.p = 1;
            _context7.n = 2;
            return fetch(BT_API_BASE + '/api/feedback/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId,
                playerName: S.myName,
                category: feedbackSubmitCategory,
                topic: feedbackSubmitTopic,
                text: feedbackText.trim()
              })
            });
          case 2:
            res = _context7.v;
            _context7.n = 3;
            return res.json();
          case 3:
            d = _context7.v;
            if (d.ok) {
              _context7.n = 4;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: d.error || 'Failed',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context7.a(2);
          case 4:
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: '📝 Feedback submitted!',
              color: '#5b52ff',
              ts: Date.now()
            });
            BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
            setFeedbackText('');
            setFeedbackTab('browse');
            S._fbLastFilter = null; /* force refresh */
            _context7.n = 6;
            break;
          case 5:
            _context7.p = 5;
            _t6 = _context7.v;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Server error',
              color: '#ff5e6c',
              ts: Date.now()
            });
          case 6:
            return _context7.a(2);
        }
      }, _callee7, null, [[1, 5]]);
    })),
    disabled: !feedbackText.trim(),
    style: {
      width: '100%',
      padding: '10px 0',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 800,
      border: '1.5px solid ' + (feedbackText.trim() ? 'rgba(91,82,255,.4)' : 'rgba(255,255,255,.06)'),
      background: feedbackText.trim() ? 'rgba(91,82,255,.15)' : 'rgba(255,255,255,.02)',
      color: feedbackText.trim() ? '#8880ff' : 'rgba(255,255,255,.15)',
      cursor: feedbackText.trim() ? 'pointer' : 'not-allowed'
    }
  }, "\uD83D\uDCDD Submit Feedback")))), showLeaderboard && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowLeaderboard(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 320,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowLeaderboard(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFC6 Leaderboards"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, Object.keys(stateRef.current.others).length + 1, " players online"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 1,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)',
      flexWrap: 'wrap'
    }
  }, [['level', '⚔️ Level'], ['lifeskills', '⛏️ Skills'], ['ap', '🏆 AP'], ['kills', '💀 Kills'], ['dungeons', '🐉 Dungeons'], ['gold', '💰 Gold'], ['playtime', '⏱️ Time']].map(function (_ref40) {
    var _ref41 = _slicedToArray(_ref40, 2),
      id = _ref41[0],
      label = _ref41[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setLeaderboardTab(id);
      },
      style: {
        flex: '1 0 auto',
        padding: '5px 4px',
        fontSize: 8,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: leaderboardTab === id ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.03)',
        color: leaderboardTab === id ? '#f5c542' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit',
        transition: 'all .15s',
        minWidth: 40
      }
    }, label);
  })), function () {
    var S = stateRef.current;
    var myRpg = S.rpg;

    /* Fetch from server on tab change */
    if (S._lbLastTab !== leaderboardTab) {
      S._lbLastTab = leaderboardTab;
      S._lbServerData = null;
      fetch(BT_API_BASE + '/api/leaderboard/top?category=' + leaderboardTab + '&limit=50').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) {
          S._lbServerData = d.results;
          setRpgState(function (prev) {
            return _objectSpread({}, prev);
          }); /* force re-render */
        }
      }).catch(function () {});
    }

    /* Build entries: prefer server data, fallback to local S.others */
    var entries = [];
    if (S._lbServerData && S._lbServerData.length > 0) {
      entries = S._lbServerData.map(function (p) {
        return _objectSpread(_objectSpread({}, p), {}, {
          isMe: p.id === S.myId,
          gold: p.goldEarned || 0
        });
      });
      /* Ensure self is in the list */
      if (!entries.find(function (e) {
        return e.isMe;
      })) {
        var _S$_clanData5;
        var cs = (myRpg === null || myRpg === void 0 ? void 0 : myRpg._compStats) || {};
        var myLifeTotal = myRpg !== null && myRpg !== void 0 && myRpg.lifeSkills ? LIFE_SKILLS.reduce(function (s, k) {
          var _myRpg$lifeSkills$k;
          return (((_myRpg$lifeSkills$k = myRpg.lifeSkills[k]) === null || _myRpg$lifeSkills$k === void 0 ? void 0 : _myRpg$lifeSkills$k.level) || 0) + s;
        }, 0) : 0;
        entries.push({
          id: S.myId,
          name: S.myName || 'You',
          color: S.myColor,
          isMe: true,
          level: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.level) || 1,
          lifeTotal: myLifeTotal,
          ap: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.achievementPoints) || 0,
          kills: cs.monstersKilled || 0,
          dungeons: cs.dungeonsCleared || 0,
          gold: cs.totalGoldEarned || 0,
          playtime: Math.floor((cs.playtimeSeconds || 0) / 60),
          clanTag: ((_S$_clanData5 = S._clanData) === null || _S$_clanData5 === void 0 ? void 0 : _S$_clanData5.tag) || null
        });
      }
    } else {
      var _S$_clanData6;
      /* Fallback: local data from connected players */
      var _cs = (myRpg === null || myRpg === void 0 ? void 0 : myRpg._compStats) || {};
      var _myLifeTotal = myRpg !== null && myRpg !== void 0 && myRpg.lifeSkills ? LIFE_SKILLS.reduce(function (s, k) {
        var _myRpg$lifeSkills$k2;
        return (((_myRpg$lifeSkills$k2 = myRpg.lifeSkills[k]) === null || _myRpg$lifeSkills$k2 === void 0 ? void 0 : _myRpg$lifeSkills$k2.level) || 0) + s;
      }, 0) : 0;
      entries.push({
        id: S.myId,
        name: S.myName || 'You',
        color: S.myColor,
        isMe: true,
        level: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.level) || 1,
        lifeTotal: _myLifeTotal,
        ap: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.achievementPoints) || 0,
        kills: _cs.monstersKilled || 0,
        dungeons: _cs.dungeonsCleared || 0,
        gold: _cs.totalGoldEarned || 0,
        playtime: Math.floor((_cs.playtimeSeconds || 0) / 60),
        clanTag: ((_S$_clanData6 = S._clanData) === null || _S$_clanData6 === void 0 ? void 0 : _S$_clanData6.tag) || null
      });
      Object.entries(S.others).forEach(function (_ref42) {
        var _ref43 = _slicedToArray(_ref42, 2),
          id = _ref43[0],
          o = _ref43[1];
        var d = o.rpgData || {};
        entries.push({
          id: id,
          name: o.name || '???',
          color: o.color,
          isMe: false,
          level: o.rpgLv || 1,
          lifeTotal: d.lifeTotal || 0,
          ap: d.ap || 0,
          kills: d.kills || 0,
          dungeons: d.dungeons || 0,
          gold: d.goldEarned || 0,
          playtime: d.playtime || 0,
          clanTag: d.clanTag || null
        });
      });
    }

    /* Sort by selected tab */
    var sortKey = {
      level: 'level',
      lifeskills: 'lifeTotal',
      ap: 'ap',
      kills: 'kills',
      dungeons: 'dungeons',
      gold: 'gold',
      playtime: 'playtime'
    }[leaderboardTab] || 'level';
    entries.sort(function (a, b) {
      return b[sortKey] - a[sortKey];
    });
    var medals = ['🥇', '🥈', '🥉'];
    var formatVal = function formatVal(val, tab) {
      if (tab === 'playtime') return val >= 60 ? Math.floor(val / 60) + 'h ' + val % 60 + 'm' : val + 'm';
      if (tab === 'gold') return val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
      return val;
    };
    var tabLabel = {
      level: 'Level',
      lifeskills: 'Skill Total',
      ap: 'Achievement Pts',
      kills: 'Monsters Killed',
      dungeons: 'Dungeons Cleared',
      gold: 'Gold Earned',
      playtime: 'Playtime'
    }[leaderboardTab];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, tabLabel), entries.map(function (e, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: e.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 2,
          background: e.isMe ? 'rgba(245,197,66,.08)' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (e.isMe ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.04)')
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 20,
          textAlign: 'center',
          fontSize: i < 3 ? 14 : 10,
          fontWeight: 800,
          color: i < 3 ? '#f5c542' : 'rgba(255,255,255,.3)'
        }
      }, i < 3 ? medals[i] : i + 1), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          background: e.color || '#5b52ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
          border: e.isMe ? '2px solid #f5c542' : '2px solid rgba(255,255,255,.1)'
        }
      }, (e.name || '?').charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: e.isMe ? '#f5c542' : '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.clanTag && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)',
          marginRight: 3
        }
      }, "[", e.clanTag, "]"), e.name, " ", e.isMe && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "(you)")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, "Lv ", e.level)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 900,
          color: i === 0 ? '#f5c542' : i < 3 ? '#c0a0e0' : 'rgba(255,255,255,.6)',
          textAlign: 'right',
          minWidth: 40
        }
      }, formatVal(e[sortKey], leaderboardTab)));
    }), entries.length <= 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 12
      }
    }, "Connect with more players to see rankings!"));
  }())), showEncyclopedia && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowEncyclopedia(false);
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
      return setShowEncyclopedia(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#00d4b8',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDCD6 Encyclopedia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, discoveredMonsters.size, " creatures \xB7 ", discoveredCollisions.size, " collisions \xB7 ", discoveredMaterials.size, " materials \xB7 ", visitedZones.size, " zones"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['bestiary', '🐉 Bestiary'], ['codex', '⚗️ Codex'], ['materials', '⛏️ Materials'], ['zones', '🗺️ Zones']].map(function (_ref44) {
    var _ref45 = _slicedToArray(_ref44, 2),
      id = _ref45[0],
      label = _ref45[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setEncyclopediaTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: encyclopediaTab === id ? 'rgba(0,212,184,.2)' : 'rgba(255,255,255,.03)',
        color: encyclopediaTab === id ? '#00d4b8' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }
    }, label);
  })), encyclopediaTab === 'bestiary' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Kill monsters to discover entries. ", discoveredMonsters.size, "/", function () {
    var t = 0;
    Object.values(ZONES).forEach(function (z) {
      if (z.spawns && z.spawns.length) z.spawns.forEach(function (s) {
        return t++;
      });
    });
    return t;
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Archetypes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 8
    }
  }, Object.entries(ARCHETYPES).map(function (_ref46) {
    var _ref47 = _slicedToArray(_ref46, 2),
      key = _ref47[0],
      a = _ref47[1];
    var anyDiscovered = _toConsumableArray(discoveredMonsters).some(function (k) {
      return k.startsWith(key + ':');
    });
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        background: anyDiscovered ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (anyDiscovered ? a.color + '60' : 'rgba(255,255,255,.06)'),
        color: anyDiscovered ? a.color : 'rgba(255,255,255,.15)'
      }
    }, anyDiscovered ? a.emoji : '❓', " ", anyDiscovered ? key : '???', anyDiscovered && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginLeft: 3
      }
    }, "HP\xD7", a.hpMult, " DMG\xD7", a.dmgMult, " SPD\xD7", a.spdMult));
  })), Object.values(ZONES).filter(function (z) {
    return z.spawns && z.spawns.length > 0;
  }).map(function (zone) {
    var _ELEMENTS$zone$elemen;
    var zoneDiscovered = zone.spawns.filter(function (s) {
      return discoveredMonsters.has(s.arch + ':' + zone.id);
    });
    var zoneEmojis = zone.enemyEmoji || {};
    return /*#__PURE__*/React.createElement("div", {
      key: zone.id,
      style: {
        marginBottom: 8,
        padding: 6,
        borderRadius: 6,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: (_ELEMENTS$zone$elemen = ELEMENTS[zone.element]) === null || _ELEMENTS$zone$elemen === void 0 ? void 0 : _ELEMENTS$zone$elemen.color,
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: zone.element ? ELEMENTS[zone.element].color : '#fff'
      }
    }, zone.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "Lv", zone.level[0], "-", zone.level[1]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 'auto'
      }
    }, zoneDiscovered.length, "/", zone.spawns.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }
    }, zone.spawns.map(function (s, i) {
      var found = discoveredMonsters.has(s.arch + ':' + zone.id);
      var arch = ARCHETYPES[s.arch];
      var emoji = zoneEmojis[s.arch] || (arch === null || arch === void 0 ? void 0 : arch.emoji) || '❓';
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 8,
          background: found ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.01)',
          border: '1px solid ' + (found ? ((arch === null || arch === void 0 ? void 0 : arch.color) || '#666') + '40' : 'rgba(255,255,255,.04)'),
          color: found ? (arch === null || arch === void 0 ? void 0 : arch.color) || '#aaa' : 'rgba(255,255,255,.12)'
        }
      }, found ? emoji : '❓', " ", found ? s.arch : '???', found && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)',
          marginLeft: 2
        }
      }, "\xD7", s.count));
    })));
  })), encyclopediaTab === 'codex' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Elements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 10
    }
  }, Object.entries(ELEMENTS).map(function (_ref48) {
    var _ref49 = _slicedToArray(_ref48, 2),
      key = _ref49[0],
      el = _ref49[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '3px 7px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        background: el.color + '18',
        border: '1px solid ' + el.color + '40',
        color: el.color,
        display: 'flex',
        alignItems: 'center',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: el.color,
        display: 'inline-block'
      }
    }), key, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "\u2192", el.status));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Effectiveness Circle"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 10,
      fontSize: 8,
      color: 'rgba(255,255,255,.5)'
    }
  }, EFFECTIVENESS.map(function (_ref50, i) {
    var _ELEMENTS$a, _ELEMENTS$b;
    var _ref51 = _slicedToArray(_ref50, 2),
      a = _ref51[0],
      b = _ref51[1];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$a = ELEMENTS[a]) === null || _ELEMENTS$a === void 0 ? void 0 : _ELEMENTS$a.color
      }
    }, a), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, " \u2192 "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$b = ELEMENTS[b]) === null || _ELEMENTS$b === void 0 ? void 0 : _ELEMENTS$b.color
      }
    }, b));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Collisions (", discoveredCollisions.size, "/", Object.keys(COLLISION_TABLE).length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Apply two different elements to trigger a collision reaction"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, Object.entries(COLLISION_TABLE).map(function (_ref52) {
    var _ELEMENTS$e, _ELEMENTS$e2;
    var _ref53 = _slicedToArray(_ref52, 2),
      key = _ref53[0],
      coll = _ref53[1];
    var found = discoveredCollisions.has(coll.id);
    var _key$split = key.split('|'),
      _key$split2 = _slicedToArray(_key$split, 2),
      e1 = _key$split2[0],
      e2 = _key$split2[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 6px',
        borderRadius: 4,
        background: found ? 'rgba(0,212,184,.06)' : 'rgba(255,255,255,.01)',
        border: '1px solid ' + (found ? 'rgba(0,212,184,.15)' : 'rgba(255,255,255,.04)')
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: found ? ((_ELEMENTS$e = ELEMENTS[e1]) === null || _ELEMENTS$e === void 0 ? void 0 : _ELEMENTS$e.color) || '#666' : 'rgba(255,255,255,.1)',
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: found ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)',
        minWidth: 28
      }
    }, found ? e1 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)'
      }
    }, "+"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: found ? ((_ELEMENTS$e2 = ELEMENTS[e2]) === null || _ELEMENTS$e2 === void 0 ? void 0 : _ELEMENTS$e2.color) || '#666' : 'rgba(255,255,255,.1)',
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: found ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)',
        minWidth: 28
      }
    }, found ? e2 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        margin: '0 2px'
      }
    }, "="), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: found ? '#00d4b8' : 'rgba(255,255,255,.1)',
        flex: 1
      }
    }, found ? coll.name : '???'), found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, coll.type));
  }))), encyclopediaTab === 'materials' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#795548',
      marginBottom: 4
    }
  }, "\u26CF\uFE0F Mining Ores"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, MINING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('mining:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? t.streakColor + '18' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? t.streakColor + '40' : 'rgba(255,255,255,.05)'),
        color: found ? t.streakColor : 'rgba(255,255,255,.12)'
      }
    }, found ? '⛏️' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#6b4226',
      marginBottom: 4
    }
  }, "\uD83E\uDE93 Woodcutting"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, WOODCUTTING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('woodcutting:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? t.canopyColor + '18' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? t.canopyColor + '40' : 'rgba(255,255,255,.05)'),
        color: found ? t.canopyColor : 'rgba(255,255,255,.12)'
      }
    }, found ? '🪓' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#3498DB',
      marginBottom: 4
    }
  }, "\uD83C\uDFA3 Fishing"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, FISHING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('fishing:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? 'rgba(52,152,219,.15)' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? 'rgba(52,152,219,.3)' : 'rgba(255,255,255,.05)'),
        color: found ? '#3498DB' : 'rgba(255,255,255,.12)'
      }
    }, found ? '🎣' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#c0c0c8',
      marginBottom: 4
    }
  }, "\uD83D\uDD28 Blacksmith Metals"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, Object.entries(BLACKSMITH_TIERS).map(function (_ref54) {
    var _ref55 = _slicedToArray(_ref54, 2),
      key = _ref55[0],
      t = _ref55[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: t.color + '18',
        border: '1px solid ' + t.color + '40',
        color: t.color
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#a08050',
      marginBottom: 4
    }
  }, "\uD83E\uDEB5 Woodworking"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, Object.entries(WOODWORKING_TIERS).map(function (_ref56) {
    var _ref57 = _slicedToArray(_ref56, 2),
      key = _ref57[0],
      t = _ref57[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: t.color + '18',
        border: '1px solid ' + t.color + '40',
        color: t.color
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83D\uDD25 Cooking Recipes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, COOKING_RECIPES.map(function (r, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 3,
        background: 'rgba(234,88,12,.05)',
        border: '1px solid rgba(234,88,12,.15)',
        fontSize: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: '#ea580c',
        minWidth: 70
      }
    }, r.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", r.cookLvl), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 'auto'
      }
    }, r.buff === 'heal' ? '❤️ +' + r.power + ' HP' : r.buff === 'regen' ? '💚 Regen' : r.buff === 'resist' ? '🛡️ Resist' : r.buff === 'damage' ? '⚔️ DMG' : r.buff === 'all' ? '✨ All' : '🍖', r.duration ? ' (' + r.duration + 's)' : ''));
  }))), encyclopediaTab === 'zones' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Visited ", visitedZones.size, "/", Object.keys(ZONES).length, " zones"), Object.values(ZONES).map(function (zone) {
    var visited = visitedZones.has(zone.id) || zone.id === 'town';
    var elem = zone.element ? ELEMENTS[zone.element] : null;
    var sec = zone.secondary ? ELEMENTS[zone.secondary] : null;
    return /*#__PURE__*/React.createElement("div", {
      key: zone.id,
      style: {
        padding: 8,
        borderRadius: 6,
        marginBottom: 4,
        background: visited ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.01)',
        border: '1px solid ' + (visited ? ((elem === null || elem === void 0 ? void 0 : elem.color) || '#5b52ff') + '30' : 'rgba(255,255,255,.04)')
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2
      }
    }, elem && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: elem.color,
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: visited ? (elem === null || elem === void 0 ? void 0 : elem.color) || '#fff' : 'rgba(255,255,255,.12)'
      }
    }, visited ? zone.name : '???'), visited && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginLeft: 'auto'
      }
    }, "Lv", zone.level[0], "-", zone.level[1])), visited && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        fontSize: 7
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        color: elem === null || elem === void 0 ? void 0 : elem.color,
        padding: '1px 4px',
        borderRadius: 2,
        background: (elem === null || elem === void 0 ? void 0 : elem.color) + '15'
      }
    }, zone.element), zone.secondary && /*#__PURE__*/React.createElement("span", {
      style: {
        color: sec === null || sec === void 0 ? void 0 : sec.color,
        padding: '1px 4px',
        borderRadius: 2,
        background: (sec === null || sec === void 0 ? void 0 : sec.color) + '15'
      }
    }, "+", zone.secondary), zone.safe && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#3dd497',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(61,212,151,.1)'
      }
    }, "Safe"), zone.lawless && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ff5e6c',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(255,94,108,.1)'
      }
    }, "PvP"), zone.endgame && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#f5c542',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(245,197,66,.1)'
      }
    }, "Endgame"), zone.personal && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#3dd497',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(61,212,151,.1)'
      }
    }, "Personal"), zone.spawns && zone.spawns.length > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, zone.spawns.length, " enemy types")), !visited && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.1)',
        fontStyle: 'italic'
      }
    }, "Travel here to discover"));
  })))), anniversaryDrop && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.85)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 24,
      maxWidth: 300
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 8,
      animation: 'scoreReveal .6s cubic-bezier(.22,1,.36,1)'
    }
  }, "\uD83C\uDFF4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Anniversary Drop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      color: '#f5c542',
      marginBottom: 4
    }
  }, anniversaryDrop.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, anniversaryDrop.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 60,
      height: 80,
      margin: '0 auto 12px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "60",
    height: "80",
    viewBox: "0 0 60 80"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "capeGrad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: ((_anniversaryDrop$colo = anniversaryDrop.colors) === null || _anniversaryDrop$colo === void 0 ? void 0 : _anniversaryDrop$colo.primary) || '#1a1a1a'
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "70%",
    stopColor: ((_anniversaryDrop$colo2 = anniversaryDrop.colors) === null || _anniversaryDrop$colo2 === void 0 ? void 0 : _anniversaryDrop$colo2.primary) || '#1a1a1a'
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: ((_anniversaryDrop$colo3 = anniversaryDrop.colors) === null || _anniversaryDrop$colo3 === void 0 ? void 0 : _anniversaryDrop$colo3.accent) || '#d4a030'
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M15,10 L45,10 L48,70 L12,70 Z",
    fill: "url(#capeGrad)",
    stroke: ((_anniversaryDrop$colo4 = anniversaryDrop.colors) === null || _anniversaryDrop$colo4 === void 0 ? void 0 : _anniversaryDrop$colo4.trim) || '#f5c542',
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "70",
    x2: "48",
    y2: "70",
    stroke: ((_anniversaryDrop$colo5 = anniversaryDrop.colors) === null || _anniversaryDrop$colo5 === void 0 ? void 0 : _anniversaryDrop$colo5.trim) || '#f5c542',
    strokeWidth: "2"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      justifyContent: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 800,
      background: 'rgba(245,197,66,.15)',
      border: '1px solid rgba(245,197,66,.3)',
      color: '#f5c542'
    }
  }, "Legendary"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 800,
      background: 'rgba(255,94,108,.15)',
      border: '1px solid rgba(255,94,108,.3)',
      color: '#ff5e6c'
    }
  }, "Discontinued"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 800,
      background: 'rgba(91,82,255,.15)',
      border: '1px solid rgba(91,82,255,.3)',
      color: '#5b52ff'
    }
  }, "Tradeable")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if (!R._anniversaryItems) R._anniversaryItems = [];
      R._anniversaryItems.push({
        id: anniversaryDrop.id,
        name: anniversaryDrop.name,
        emoji: anniversaryDrop.emoji,
        type: anniversaryDrop.type,
        colors: anniversaryDrop.colors,
        rarity: anniversaryDrop.rarity,
        claimedAt: Date.now(),
        year: anniversaryDrop.year,
        tradeable: true
      });
      setAnniversaryDrop(null);
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 40,
        text: '🏴 ' + anniversaryDrop.name + ' claimed!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.levelUp();
      stateRef.current.screenShake = 6;
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused22) {}
    },
    style: {
      padding: '12px 32px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 900,
      border: '2px solid rgba(245,197,66,.5)',
      background: 'linear-gradient(135deg,rgba(26,26,26,.9),rgba(212,160,48,.3))',
      color: '#f5c542',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(212,160,48,.3)'
    }
  }, "Claim Cape"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.2)',
      marginTop: 8
    }
  }, "One per account \xB7 Tradeable \xB7 Never drops again"))), showMinigame && rpgState && /*#__PURE__*/React.createElement("div", {
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
        text: '🎮 Score: ' + minigameScore + ' · +' + goldReward + 'G +' + apReward + 'AP',
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
                text: '❌ Decoy! -5',
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
  }())), showPetHouse && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowPetHouse(false);
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
      return setShowPetHouse(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#ea580c',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDC3E Pet House"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, (((_rpgState$lifeSkills3 = rpgState.lifeSkills) === null || _rpgState$lifeSkills3 === void 0 ? void 0 : _rpgState$lifeSkills3.pets) || []).length, "/", MAX_PET_SLOTS, " pets \xB7 Trapping Lv", ((_rpgState$lifeSkills4 = rpgState.lifeSkills) === null || _rpgState$lifeSkills4 === void 0 || (_rpgState$lifeSkills4 = _rpgState$lifeSkills4.trapping) === null || _rpgState$lifeSkills4 === void 0 ? void 0 : _rpgState$lifeSkills4.level) || 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['pets', '🐾 Pets'], ['evolve', '🧬 Evolve'], ['enchant', '✨ Enchant']].map(function (_ref58) {
    var _ref59 = _slicedToArray(_ref58, 2),
      id = _ref59[0],
      label = _ref59[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setPetHouseTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: petHouseTab === id ? 'rgba(234,88,12,.2)' : 'rgba(255,255,255,.03)',
        color: petHouseTab === id ? '#ea580c' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
      }
    }, label);
  })), petHouseTab === 'pets' && /*#__PURE__*/React.createElement("div", null, (((_rpgState$lifeSkills5 = rpgState.lifeSkills) === null || _rpgState$lifeSkills5 === void 0 ? void 0 : _rpgState$lifeSkills5.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.2)',
      fontStyle: 'italic',
      padding: 8,
      textAlign: 'center'
    }
  }, "No pets yet. Weaken monsters to <20% HP and tap \uD83E\uDEA4!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 4
    }
  }, (((_rpgState$lifeSkills6 = rpgState.lifeSkills) === null || _rpgState$lifeSkills6 === void 0 ? void 0 : _rpgState$lifeSkills6.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills7, _ELEMENTS$pet$element;
    var isActive = ((_rpgState$lifeSkills7 = rpgState.lifeSkills) === null || _rpgState$lifeSkills7 === void 0 ? void 0 : _rpgState$lifeSkills7.activePet) === pi;
    var tier = PET_EVOLUTION_TIERS[pet.evolutionTier || 0];
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 8,
        borderRadius: 8,
        textAlign: 'center',
        background: isActive ? 'rgba(245,197,66,.1)' : 'rgba(255,255,255,.03)',
        border: '1.5px solid ' + (isActive ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.08)'),
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        R.lifeSkills.activePet = isActive ? null : pi;
        stateRef.current._petX = null;
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused26) {}
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: (_ELEMENTS$pet$element = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element === void 0 ? void 0 : _ELEMENTS$pet$element.color
      }
    }, pet.element), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: pet.evolutionTier >= 2 ? '#f5c542' : pet.evolutionTier >= 1 ? '#a855f7' : 'rgba(255,255,255,.25)'
      }
    }, tier), pet._enchants && pet._enchants.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        display: 'flex',
        gap: 2,
        justifyContent: 'center',
        marginTop: 2
      }
    }, pet._enchants.map(function (e, i) {
      var _ELEMENTS$e$element;
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          width: 6,
          height: 6,
          borderRadius: 3,
          background: ((_ELEMENTS$e$element = ELEMENTS[e.element]) === null || _ELEMENTS$e$element === void 0 ? void 0 : _ELEMENTS$e$element.color) || '#888',
          display: 'inline-block'
        }
      });
    })), pet.combatPower && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)'
      }
    }, "\u2694\uFE0F", pet.combatPower), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 800,
        color: '#f5c542',
        marginTop: 2
      }
    }, "ACTIVE"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.2)',
      marginTop: 6
    }
  }, "Tap to set active. Active pet follows and auto-loots.")), petHouseTab === 'evolve' && function (_rpgState$lifeSkills8) {
    var pets = ((_rpgState$lifeSkills8 = rpgState.lifeSkills) === null || _rpgState$lifeSkills8 === void 0 ? void 0 : _rpgState$lifeSkills8.pets) || [];
    var canEvolve = petEvolve1 !== null && petEvolve2 !== null && petEvolve1 !== petEvolve2 && pets[petEvolve1] && pets[petEvolve2];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 6
      }
    }, "Select two pets to merge. Both are consumed. The evolved pet inherits the best traits."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Pet 1"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve1(petEvolve1 === i ? null : i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          border: '1.5px solid ' + (petEvolve1 === i ? '#ea580c' : 'rgba(255,255,255,.08)'),
          background: petEvolve1 === i ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
          color: petEvolve1 === i ? '#fff' : p.color,
          cursor: 'pointer',
          opacity: petEvolve2 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Pet 2"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve2(petEvolve2 === i ? null : i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          border: '1.5px solid ' + (petEvolve2 === i ? '#ea580c' : 'rgba(255,255,255,.08)'),
          background: petEvolve2 === i ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
          color: petEvolve2 === i ? '#fff' : p.color,
          cursor: 'pointer',
          opacity: petEvolve1 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    })))), canEvolve && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 6,
        background: 'rgba(234,88,12,.08)',
        border: '1px solid rgba(234,88,12,.2)',
        marginBottom: 6,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#ea580c',
        marginBottom: 2
      }
    }, "\uD83E\uDDEC Evolution Preview"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#fff'
      }
    }, pets[petEvolve1].emoji, " ", pets[petEvolve1].name, " + ", pets[petEvolve2].emoji, " ", pets[petEvolve2].name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginTop: 2
      }
    }, "\u2192 ", PET_EVOLUTION_TIERS[Math.min((pets[petEvolve1].evolutionTier || 0) + 1, 3)], " form \xB7 Lv", Math.max(pets[petEvolve1].level, pets[petEvolve2].level) + 2)), /*#__PURE__*/React.createElement("button", {
      disabled: !canEvolve,
      onClick: function onClick() {
        if (!canEvolve) return;
        var R = stateRef.current.rpg;
        var p1 = R.lifeSkills.pets[petEvolve1],
          p2 = R.lifeSkills.pets[petEvolve2];
        var evolved = evolvePet(p1, p2);
        /* Remove both pets (higher index first to avoid shifting) */
        var idxs = [petEvolve1, petEvolve2].sort(function (a, b) {
          return b - a;
        });
        idxs.forEach(function (i) {
          return R.lifeSkills.pets.splice(i, 1);
        });
        R.lifeSkills.pets.push(evolved);
        if (R.lifeSkills.activePet === petEvolve1 || R.lifeSkills.activePet === petEvolve2) {
          R.lifeSkills.activePet = R.lifeSkills.pets.length - 1;
        } else if (R.lifeSkills.activePet !== null) {
          /* Count how many removed pets had lower index than activePet */
          var removedBefore = [petEvolve1, petEvolve2].filter(function (i) {
            return i < R.lifeSkills.activePet;
          }).length;
          R.lifeSkills.activePet = Math.max(0, R.lifeSkills.activePet - removedBefore);
        }
        setPetEvolve1(null);
        setPetEvolve2(null);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 40,
          text: '🧬 ' + evolved.name + ' evolved!',
          color: '#ea580c',
          ts: Date.now()
        });
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused27) {}
      },
      style: {
        width: '100%',
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 800,
        border: '1.5px solid ' + (canEvolve ? 'rgba(234,88,12,.4)' : 'rgba(255,255,255,.06)'),
        background: canEvolve ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
        color: canEvolve ? '#ea580c' : 'rgba(255,255,255,.15)',
        cursor: canEvolve ? 'pointer' : 'not-allowed'
      }
    }, "\uD83E\uDDEC Evolve Pets"));
  }(), petHouseTab === 'enchant' && function (_rpgState$lifeSkills9) {
    var pets = ((_rpgState$lifeSkills9 = rpgState.lifeSkills) === null || _rpgState$lifeSkills9 === void 0 ? void 0 : _rpgState$lifeSkills9.pets) || [];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 6
      }
    }, "Slot elements onto pets for elemental attacks. Evolved pets have more slots."), pets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No pets to enchant"), pets.map(function (pet, pi) {
      var maxSlots = pet.enchantSlots || 1;
      var usedSlots = (pet._enchants || []).length;
      var canEnchant = usedSlots < maxSlots;
      return /*#__PURE__*/React.createElement("div", {
        key: pet.id,
        style: {
          padding: 8,
          borderRadius: 6,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 4
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
      }, pet.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: pet.color
        }
      }, pet.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Slots: ", usedSlots, "/", maxSlots, " \xB7 ", PET_EVOLUTION_TIERS[pet.evolutionTier || 0]))), (pet._enchants || []).length > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 2,
          marginBottom: 4
        }
      }, pet._enchants.map(function (e, i) {
        var _ELEMENTS$e$element2, _ELEMENTS$e$element3, _ELEMENTS$e$element4;
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            padding: '2px 5px',
            borderRadius: 3,
            fontSize: 7,
            fontWeight: 700,
            background: ((_ELEMENTS$e$element2 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element2 === void 0 ? void 0 : _ELEMENTS$e$element2.color) + '20',
            border: '1px solid ' + ((_ELEMENTS$e$element3 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element3 === void 0 ? void 0 : _ELEMENTS$e$element3.color) + '40',
            color: (_ELEMENTS$e$element4 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element4 === void 0 ? void 0 : _ELEMENTS$e$element4.color
          }
        }, e.element, " \u2694\uFE0F", e.power);
      })), canEnchant && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2
        }
      }, Object.entries(ELEMENTS).filter(function (_ref60) {
        var _ref61 = _slicedToArray(_ref60, 2),
          k = _ref61[0],
          e = _ref61[1];
        return e.type !== 'endgame';
      }).map(function (_ref62) {
        var _ref63 = _slicedToArray(_ref62, 2),
          key = _ref63[0],
          el = _ref63[1];
        return /*#__PURE__*/React.createElement("button", {
          key: key,
          onClick: function onClick() {
            var R = stateRef.current.rpg;
            var p = R.lifeSkills.pets[pi];
            if (!p) return;
            if (R.coins < 50) {
              stateRef.current.dmgNumbers.push({
                x: stateRef.current.player.x,
                y: stateRef.current.player.y - 30,
                text: 'Need 50G!',
                color: '#ff5e6c',
                ts: Date.now()
              });
              return;
            }
            R.coins -= 50;
            enchantPet(p, key);
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: '✨ ' + key + ' enchanted!',
              color: el.color,
              ts: Date.now()
            });
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (_unused28) {}
          },
          style: {
            padding: '2px 5px',
            borderRadius: 3,
            fontSize: 7,
            fontWeight: 700,
            border: '1px solid ' + el.color + '40',
            background: el.color + '10',
            color: el.color,
            cursor: 'pointer'
          }
        }, key, " (50G)");
      })));
    }));
  }())), showFurniture && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowFurniture(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 320,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowFurniture(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8B6914',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83E\uDE91 Furniture Workshop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Woodworking Lv", ((_rpgState$lifeSkills0 = rpgState.lifeSkills) === null || _rpgState$lifeSkills0 === void 0 || (_rpgState$lifeSkills0 = _rpgState$lifeSkills0.woodworking) === null || _rpgState$lifeSkills0 === void 0 ? void 0 : _rpgState$lifeSkills0.level) || 1, " \xB7 Craft furniture for stat buffs"), function (_R$lifeSkills2) {
    var R = rpgState;
    var owned = R._furniture || {};
    var wcLvl = ((_R$lifeSkills2 = R.lifeSkills) === null || _R$lifeSkills2 === void 0 || (_R$lifeSkills2 = _R$lifeSkills2.woodworking) === null || _R$lifeSkills2 === void 0 ? void 0 : _R$lifeSkills2.level) || 1;
    var inv = R.inventory || {};
    /* Count total wood across all types */
    var totalWood = Object.entries(inv).filter(function (_ref64) {
      var _ref65 = _slicedToArray(_ref64, 1),
        k = _ref65[0];
      return k.includes('wood') || k.includes('lumber') || k.includes('bark') || k.includes('timber');
    }).reduce(function (s, _ref66) {
      var _ref67 = _slicedToArray(_ref66, 2),
        v = _ref67[1];
      return s + v;
    }, 0);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginBottom: 6
      }
    }, "\uD83E\uDEB5 Wood: ", totalWood, " \xB7 \uD83D\uDCB0 ", R.coins, "G \xB7 Placed: ", Object.keys(owned).length, "/", FURNITURE_RECIPES.length), FURNITURE_RECIPES.map(function (f) {
      var isOwned = owned[f.id];
      var canCraft = wcLvl >= f.wcLvl && totalWood >= f.woodCost && R.coins >= f.goldCost;
      return /*#__PURE__*/React.createElement("div", {
        key: f.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 3,
          background: isOwned ? 'rgba(61,212,151,.06)' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (isOwned ? 'rgba(61,212,151,.2)' : 'rgba(255,255,255,.06)'),
          opacity: !isOwned && wcLvl < f.wcLvl ? 0.4 : 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, f.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: isOwned ? '#3dd497' : '#fff'
        }
      }, f.name, " ", isOwned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, f.desc), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, "WC Lv", f.wcLvl, " \xB7 ", f.woodCost, " wood \xB7 ", f.goldCost, "G", f.statBuff && Object.entries(f.statBuff).map(function (_ref68) {
        var _ref69 = _slicedToArray(_ref68, 2),
          k = _ref69[0],
          v = _ref69[1];
        return /*#__PURE__*/React.createElement("span", {
          key: k,
          style: {
            color: '#f5c542',
            marginLeft: 4
          }
        }, "+", typeof v === 'number' && v < 1 ? '-' + Math.round((1 - v) * 100) + '% cost' : typeof v === 'number' && v > 1 ? '+' + Math.round((v - 1) * 100) + '%' : v);
      }))), !isOwned && /*#__PURE__*/React.createElement("button", {
        disabled: !canCraft,
        onClick: function onClick() {
          var R2 = stateRef.current.rpg;
          if (!canCraft) return;
          R2.coins -= f.goldCost;
          /* Deduct wood — take from any wood type */
          var woodLeft = f.woodCost;
          Object.keys(R2.inventory || {}).forEach(function (k) {
            if (woodLeft <= 0) return;
            if (k.includes('wood') || k.includes('lumber') || k.includes('bark') || k.includes('timber')) {
              var take = Math.min(R2.inventory[k], woodLeft);
              R2.inventory[k] -= take;
              woodLeft -= take;
              if (R2.inventory[k] <= 0) delete R2.inventory[k];
            }
          });
          if (!R2._furniture) R2._furniture = {};
          R2._furniture[f.id] = {
            built: Date.now()
          };
          addLifeSkillXp(R2.lifeSkills, 'woodworking', f.wcLvl * 10);
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: f.icon + ' ' + f.name + ' crafted!',
            color: '#8B6914',
            ts: Date.now()
          });
          BT_AUDIO.collect();
          setRpgState(_objectSpread({}, R2));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R2));
          } catch (_unused29) {}
        },
        style: {
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (canCraft ? 'rgba(139,105,20,.4)' : 'rgba(255,255,255,.06)'),
          background: canCraft ? 'rgba(139,105,20,.15)' : 'rgba(255,255,255,.02)',
          color: canCraft ? '#8B6914' : 'rgba(255,255,255,.15)',
          cursor: canCraft ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDD28 Craft"));
    }));
  }())), showDungeonCreator && dungeonCreator && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowDungeonCreator(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 360,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowDungeonCreator(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8050d0',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFD7\uFE0F Dungeon Workshop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Design custom dungeons \xB7 Max monster level: ", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['design', '🎨 Design'], ['monsters', '🐉 Monsters'], ['store', '🛒 Store'], ['play', '▶️ Play']].map(function (_ref70) {
    var _ref71 = _slicedToArray(_ref70, 2),
      id = _ref71[0],
      label = _ref71[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setDungeonCreatorTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: dungeonCreatorTab === id ? 'rgba(130,80,220,.2)' : 'rgba(255,255,255,.03)',
        color: dungeonCreatorTab === id ? '#a070e0' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }
    }, label);
  })), dungeonCreatorTab === 'design' && function () {
    var dc = dungeonCreator;
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Dungeon Name"), /*#__PURE__*/React.createElement("input", {
      value: dc.name,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          name: e.target.value.slice(0, 30)
        }));
      },
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#fff',
        fontSize: 12,
        fontFamily: 'inherit',
        marginBottom: 8,
        outline: 'none'
      },
      placeholder: "My Dungeon"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Terrain Theme"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 8
      }
    }, DUNGEON_TERRAIN_PACKS.map(function (p) {
      var unlocked = unlocks.terrains.includes(p.id);
      var sel = dc.terrain === p.id;
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return unlocked && setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
            terrain: p.id
          }));
        },
        style: {
          padding: '4px 7px',
          borderRadius: 5,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (sel ? '#a070e0' : unlocked ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'),
          background: sel ? 'rgba(130,80,220,.2)' : unlocked ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.01)',
          color: sel ? '#c0a0f0' : unlocked ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.15)',
          cursor: unlocked ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("span", null, p.icon), " ", p.name, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.2)'
        }
      }, "\uD83D\uDD12", p.reqBoss ? 'Boss' : '💰' + p.cost));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Width"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 20,
      max: 40,
      value: dc.width,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          width: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.width, " tiles")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Height"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 15,
      max: 35,
      value: dc.height,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          height: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.height, " tiles"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Waves (max ", unlocks.maxWaves, ")"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 1,
      max: unlocks.maxWaves,
      value: Math.min(dc.waves, unlocks.maxWaves),
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          waves: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.waves, " waves")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Monster Level (max ", unlocks.maxLevel, ")"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 1,
      max: unlocks.maxLevel,
      value: Math.min(dc.monsterLevel, unlocks.maxLevel),
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          monsterLevel: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, "Lv ", dc.monsterLevel))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Dungeon Element (optional)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          element: null
        }));
      },
      style: {
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (dc.element === null ? '#a070e0' : 'rgba(255,255,255,.1)'),
        background: dc.element === null ? 'rgba(130,80,220,.15)' : 'rgba(255,255,255,.03)',
        color: dc.element === null ? '#c0a0f0' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, "\u2B1C None"), Object.entries(ELEMENTS).filter(function (_ref72) {
      var _ref73 = _slicedToArray(_ref72, 2),
        k = _ref73[0],
        e = _ref73[1];
      return e.type !== 'endgame';
    }).map(function (_ref74) {
      var _ref75 = _slicedToArray(_ref74, 2),
        key = _ref75[0],
        el = _ref75[1];
      var bossReq = {
        flame: 'ember',
        frost: 'frost',
        venom: 'mist',
        storm: 'thunder',
        stone: 'hollows',
        wind: 'sky',
        water: 'tidal'
      }[key];
      var bossBeaten = unlocks.bossesDefeated[bossReq];
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        onClick: function onClick() {
          return bossBeaten && setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
            element: key
          }));
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (dc.element === key ? el.color : 'rgba(255,255,255,.1)'),
          background: dc.element === key ? el.color + '25' : 'rgba(255,255,255,.03)',
          color: bossBeaten ? dc.element === key ? el.color : 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.15)',
          cursor: bossBeaten ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 6,
          height: 6,
          borderRadius: 3,
          background: bossBeaten ? el.color : 'rgba(255,255,255,.1)',
          display: 'inline-block'
        }
      }), key, !bossBeaten && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6
        }
      }, "\uD83D\uDD12"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          hasBoss: !dc.hasBoss
        }));
      },
      style: {
        padding: '4px 10px',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        border: '1.5px solid ' + (dc.hasBoss ? '#ff5e6c' : 'rgba(255,255,255,.1)'),
        background: dc.hasBoss ? 'rgba(255,94,108,.15)' : 'rgba(255,255,255,.03)',
        color: dc.hasBoss ? '#ff5e6c' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDC09 ", dc.hasBoss ? 'Boss Enabled' : 'No Boss'), dc.hasBoss && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "HP \xD7", dc.bossMultiplier), dc.hasBoss && /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 2,
      max: 10,
      value: dc.bossMultiplier,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          bossMultiplier: +e.target.value
        }));
      },
      style: {
        flex: 1
      }
    })));
  }(), dungeonCreatorTab === 'monsters' && function () {
    var dc = dungeonCreator;
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    var monsters = dc.monsters || [];
    var addMonster = function addMonster(arch) {
      var updated = [].concat(_toConsumableArray(monsters), [{
        archetype: arch,
        count: 3,
        element: dc.element
      }]);
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    var removeMonster = function removeMonster(idx) {
      var updated = monsters.filter(function (_, i) {
        return i !== idx;
      });
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    var updateMonster = function updateMonster(idx, field, val) {
      var updated = monsters.map(function (m, i) {
        return i === idx ? _objectSpread(_objectSpread({}, m), {}, _defineProperty({}, field, val)) : m;
      });
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "Configure monsters per wave. Each wave spawns these groups."), monsters.map(function (m, i) {
      var _ARCHETYPES$m$archety, _ARCHETYPES$m$archety2;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, ((_ARCHETYPES$m$archety = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety === void 0 ? void 0 : _ARCHETYPES$m$archety.emoji) || '❓'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: ((_ARCHETYPES$m$archety2 = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety2 === void 0 ? void 0 : _ARCHETYPES$m$archety2.color) || '#aaa'
        }
      }, m.archetype), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Count:"), /*#__PURE__*/React.createElement("input", {
        type: "range",
        min: 1,
        max: 8,
        value: m.count,
        onChange: function onChange(e) {
          return updateMonster(i, 'count', +e.target.value);
        },
        style: {
          width: 60,
          height: 8
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: 'rgba(255,255,255,.5)',
          minWidth: 12
        }
      }, m.count))), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return removeMonster(i);
        },
        style: {
          width: 20,
          height: 20,
          borderRadius: 4,
          border: 'none',
          background: 'rgba(255,94,108,.2)',
          color: '#ff5e6c',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, "\u2715"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginTop: 6,
        marginBottom: 3
      }
    }, "Add Monsters"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }
    }, Object.entries(ARCHETYPES).map(function (_ref76) {
      var _ref77 = _slicedToArray(_ref76, 2),
        key = _ref77[0],
        a = _ref77[1];
      var pack = DUNGEON_MONSTER_PACKS.find(function (p) {
        var _p$archetypes2;
        return (_p$archetypes2 = p.archetypes) === null || _p$archetypes2 === void 0 ? void 0 : _p$archetypes2.includes(key);
      });
      var unlocked = pack && unlocks.monsters.includes(pack.id);
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        onClick: function onClick() {
          return unlocked && addMonster(key);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (unlocked ? a.color + '60' : 'rgba(255,255,255,.04)'),
          background: unlocked ? a.color + '10' : 'rgba(255,255,255,.01)',
          color: unlocked ? a.color : 'rgba(255,255,255,.12)',
          cursor: unlocked ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }
      }, a.emoji, " ", key, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6
        }
      }, "\uD83D\uDD12"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(130,80,220,.08)',
        border: '1px solid rgba(130,80,220,.15)',
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Total per wave: ", monsters.reduce(function (s, m) {
      return s + m.count;
    }, 0), " monsters \xB7 ", dc.waves, " waves", dc.hasBoss && ' + Boss', " \xB7 Lv ", dc.monsterLevel));
  }(), dungeonCreatorTab === 'store' && function () {
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    var ownedPacks = rpgState._ownedPacks || [];
    var buyPack = function buyPack(packId, cost) {
      var S = stateRef.current,
        R = S.rpg;
      if (!R || R.coins < cost) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Not enough gold!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= cost;
      if (!R._ownedPacks) R._ownedPacks = [];
      if (!R._ownedPacks.includes(packId)) R._ownedPacks.push(packId);
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: '🛒 Pack purchased!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "\uD83D\uDCB0 Gold: ", rpgState.coins, " \xB7 Purchase content packs for your dungeons"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginBottom: 4
      }
    }, "\uD83D\uDDFA\uFE0F Terrain Packs"), DUNGEON_TERRAIN_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 16
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: owned ? '#3dd497' : '#fff'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: '#ff5e6c'
        }
      }, "\uD83D\uDD12 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid rgba(245,197,66,.3)',
          background: 'rgba(245,197,66,.1)',
          color: '#f5c542',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDCB0 ", p.cost, "G"), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          color: '#3dd497',
          fontWeight: 700
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginTop: 8,
        marginBottom: 4
      }
    }, "\uD83D\uDC09 Monster Packs"), DUNGEON_MONSTER_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 16
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: owned ? '#3dd497' : '#fff'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: '#ff5e6c'
        }
      }, "\uD83D\uDD12 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid rgba(245,197,66,.3)',
          background: 'rgba(245,197,66,.1)',
          color: '#f5c542',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDCB0 ", p.cost, "G"), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          color: '#3dd497',
          fontWeight: 700
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(61,212,151,.05)',
        border: '1px solid rgba(61,212,151,.1)',
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Free packs included: Stone Halls terrain, Basic Beasts, Heavy Hitters, Dark Arts, Volatile Pack"));
  }(), dungeonCreatorTab === 'play' && function () {
    var dc = dungeonCreator;
    var errors = validateCustomDungeon(dc, rpgState);
    var savedDungeons = rpgState._customDungeons || [];
    var saveDungeon = function saveDungeon() {
      var S = stateRef.current,
        R = S.rpg;
      if (!R) return;
      if (!R._customDungeons) R._customDungeons = [];
      if (R._customDungeons.length >= 5) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Max 5 saved dungeons!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R._customDungeons.push(_objectSpread(_objectSpread({}, dc), {}, {
        created: Date.now()
      }));
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: '💾 Dungeon saved!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
    };
    var deleteDungeon = function deleteDungeon(idx) {
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !R._customDungeons) return;
      R._customDungeons.splice(idx, 1);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    };
    var launchDungeon = function launchDungeon(config) {
      var launchErrors = validateCustomDungeon(config, rpgState);
      if (launchErrors.length > 0) return;
      var S = stateRef.current,
        P = S.player;
      var terrain = DUNGEON_TERRAIN_PACKS.find(function (t) {
        return t.id === config.terrain;
      }) || DUNGEON_TERRAIN_PACKS[0];
      /* Generate custom dungeon arena */
      var dW = config.width,
        dH = config.height;
      S._preDungeonMap = S.map;
      S._preDungeonMonsters = S.monsters;
      S._preDungeonNodes = S.gatherNodes;
      S._preDungeonPos = {
        x: P.x,
        y: P.y
      };
      var dMap = Array.from({
        length: dH
      }, function () {
        return Array(dW).fill(0);
      });
      for (var x = 0; x < dW; x++) {
        dMap[0][x] = 7;
        dMap[dH - 1][x] = 7;
      }
      for (var y = 0; y < dH; y++) {
        dMap[y][0] = 7;
        dMap[y][dW - 1] = 7;
      }
      var dMX = Math.floor(dW / 2),
        dMY = Math.floor(dH / 2);
      for (var _x18 = 1; _x18 < dW - 1; _x18++) dMap[dMY][_x18] = 1;
      for (var _y16 = 1; _y16 < dH - 1; _y16++) dMap[_y16][dMX] = 1;
      /* Scattered path tiles for visual variety */
      for (var i = 0; i < Math.floor(dW * dH * 0.08); i++) {
        var rx = 2 + Math.floor(Math.random() * (dW - 4));
        var ry = 2 + Math.floor(Math.random() * (dH - 4));
        dMap[ry][rx] = 1;
      }
      dMap[dH - 1][dMX] = 9;
      dMap[dH - 1][dMX + 1] = 9;
      S.map = dMap;
      TOWN_W = dW * TILE;
      TOWN_H = dH * TILE;
      COLS = dW;
      ROWS = dH;
      /* Set up custom dungeon state */
      S._inDungeon = true;
      S._inCustomDungeon = true;
      S._customDungeonConfig = config;
      S._customDungeonTerrain = terrain;
      S._dungeonZone = S.currentZone;
      S._dungeonDepth = 'shallow';
      S._dungeonWave = 0;
      S._dungeonMaxWaves = config.waves;
      S._dungeonBossSpawned = false;
      S._dungeonComplete = false;
      /* Spawn first wave from config */
      S.monsters = [];
      var waveArchs = config.monsters || [{
        archetype: 'fodder',
        count: 4,
        element: null
      }];
      waveArchs.forEach(function (mg, gi) {
        for (var wi = 0; wi < mg.count; wi++) {
          var mx = (3 + Math.random() * (dW - 6)) * TILE;
          var my = (2 + Math.random() * (dH / 2 - 2)) * TILE;
          var m = createMonster('cdw-0-' + gi + '-' + wi, mg.archetype, config.monsterLevel + Math.floor(Math.random() * 3), mx, my, config.element || mg.element);
          m.curHp = m.hp;
          m.type = mg.archetype;
          S.monsters.push(m);
        }
      });
      S.gatherNodes = [];
      S.groundLoot = [];
      S.hitParticles = [];
      S.deathExplosions = [];
      S.arrows = [];
      P.x = dMX * TILE;
      P.y = (dH - 3) * TILE;
      S._zoneWipe = Date.now();
      S.dmgNumbers.push({
        x: P.x,
        y: P.y - 50,
        text: '⚔️ ' + config.name,
        color: '#a070e0',
        ts: Date.now()
      });
      S.dmgNumbers.push({
        x: P.x,
        y: P.y - 35,
        text: 'Wave 1/' + config.waves,
        color: 'rgba(255,255,255,.5)',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      }, 100);
      setShowDungeonCreator(false);
    };
    return /*#__PURE__*/React.createElement("div", null, errors.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#ff5e6c',
        marginBottom: 3
      }
    }, "\u26A0\uFE0F Issues"), errors.map(function (err, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 8,
          color: '#ff5e6c',
          padding: '2px 0'
        }
      }, "\u2022 ", err);
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(61,212,151,.08)',
        border: '1px solid rgba(61,212,151,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#3dd497'
      }
    }, "\u2705 Ready to play!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginTop: 2
      }
    }, dc.name, " \xB7 ", dc.waves, " waves \xB7 Lv", dc.monsterLevel, dc.element && ' · ' + dc.element, " ", dc.hasBoss && ' · Boss ×' + dc.bossMultiplier)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: saveDungeon,
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        border: '1px solid rgba(245,197,66,.3)',
        background: 'rgba(245,197,66,.1)',
        color: '#f5c542',
        cursor: 'pointer'
      }
    }, "\uD83D\uDCBE Save Design"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return launchDungeon(dc);
      },
      disabled: errors.length > 0,
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        border: '1px solid ' + (errors.length ? 'rgba(255,255,255,.06)' : 'rgba(61,212,151,.4)'),
        background: errors.length ? 'rgba(255,255,255,.02)' : 'rgba(61,212,151,.15)',
        color: errors.length ? 'rgba(255,255,255,.15)' : '#3dd497',
        cursor: errors.length ? 'not-allowed' : 'pointer'
      }
    }, "\u25B6\uFE0F Play Now")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginBottom: 4
      }
    }, "\uD83D\uDCBE Saved Dungeons (", savedDungeons.length, "/5)"), savedDungeons.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic'
      }
    }, "No saved dungeons yet"), savedDungeons.map(function (sd, i) {
      var sdErrors = validateCustomDungeon(sd, rpgState);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
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
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#fff'
        }
      }, sd.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Lv", sd.monsterLevel, " \xB7 ", sd.waves, "w ", sd.element || 'neutral', " ", sd.hasBoss ? '🐉' : '')), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return setDungeonCreator(_objectSpread({}, sd));
        },
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,255,255,.1)',
          background: 'rgba(255,255,255,.04)',
          color: 'rgba(255,255,255,.5)',
          cursor: 'pointer'
        }
      }, "Edit"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return launchDungeon(sd);
        },
        disabled: sdErrors.length > 0,
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid ' + (sdErrors.length ? 'rgba(255,255,255,.06)' : 'rgba(61,212,151,.3)'),
          background: sdErrors.length ? 'rgba(255,255,255,.02)' : 'rgba(61,212,151,.1)',
          color: sdErrors.length ? 'rgba(255,255,255,.15)' : '#3dd497',
          cursor: sdErrors.length ? 'not-allowed' : 'pointer'
        }
      }, "\u25B6\uFE0F"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return deleteDungeon(i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,94,108,.2)',
          background: 'rgba(255,94,108,.08)',
          color: '#ff5e6c',
          cursor: 'pointer'
        }
      }, "\uD83D\uDDD1\uFE0F"));
    }));
  }())), showStatScreen && rpgState && /*#__PURE__*/React.createElement("div", {
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
    })), rpgState.unspentT1 > 0 && /*#__PURE__*/React.createElement("button", {
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
        if (!R.unspentT1 || R.unspentT1 <= 0) return;
        if (!confirm('Spend 1 Tier 1 point on ' + label + '? (' + R.unspentT1 + ' remaining)')) return;
        R[key] = (R[key] || 0) + 1;
        R.unspentT1--;
        R.unspentPts = (R.unspentT1 || 0) + (R.unspentT2 || 0);
        /* Update legacy compat */
        R.str = R.power;
        R.def = R.fortification;
        R.vit = R.vitality;
        R.spd = R.agility;
        R.lck = R.ferocity;
        recalcDerived(R);
        R.hp = R.maxHp;
        R.stamina = R.maxStamina;
        R.mana = R.maxMana;
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.beep(600, 0.06, 0.1, 'sine');
      }
    }, "+"));
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
        R[key] = (R[key] || 0) + 1;
        R.unspentT2--;
        R.unspentPts = (R.unspentT1 || 0) + (R.unspentT2 || 0);
        R.str = R.power;
        R.def = R.fortification;
        R.vit = R.vitality;
        R.spd = R.agility;
        R.lck = R.ferocity;
        recalcDerived(R);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
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
  }, "DMG: ", Math.round(calcWeaponDmg(getActiveWeapon(rpgState).type, rpgState.power, getActiveWeapon(rpgState).tierMult)), ' · ', "Crit: ", (calcCritChance(rpgState.ferocity || 0) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.ferocity || 0).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(rpgState.fortification || 0, rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0).toFixed(1), "u/s"))), buildingPanel && rpgState && /*#__PURE__*/React.createElement("div", {
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
        /* §2.6 Influence discount — 0.2% per point, max 20% */
        var discount = Math.min(0.20, (R.influence || 0) * 0.002);
        var finalCost = Math.max(1, Math.floor(item.cost * (1 - discount)));
        if (R.coins < finalCost) return;
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
            text: '✨ ' + elem + ' enchanted!',
            color: edef.color,
            ts: Date.now()
          });
          if (leveled) stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 50,
            text: '✨ Enchanting Lv' + sk.enchanting.level + '!',
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
          text: '📿 ' + gemStat.label + ' +' + previewVal + gemStat.unit,
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
          text: '🛡️ ' + gemStat.label + ' +' + previewVal + gemStat.unit,
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
            text: '🍳 Cooked ' + cookMinigame.fishName + '!',
            color: '#3dd497',
            ts: Date.now()
          });
          if (leveled) stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 45,
            text: '🍳 Cooking Lv' + sk.cooking.level + '!',
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
            text: '🔥 Burnt! Fish wasted.',
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
            text: '🍽️ +' + healed + ' HP',
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
        var S = stateRef.current;
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
          text: '🍳 ' + recipe.name + '!',
          color: '#ea580c',
          ts: Date.now()
        });
        if (leveled) S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 50,
          text: '🍳 Cooking Lv' + sk.cooking.level + '!',
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
        text: '🏡 Your Farm',
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
          text: '🌾 Harvested ' + p.name + '!',
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
            text: '🌱 Planted ' + seed.name,
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
          text: '🎉 +' + winnings + 'g!',
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
          text: '💸 -' + wager + 'g',
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
          text: '🏆 Deposited ' + amt + 'g to jackpot',
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
              text: '🏟️ Entered arena queue!',
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
        text: '🎲 Bet ' + arenaBetAmount + 'G on ' + targetName + '!',
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
        text: '🎲 Bet ' + arenaBetAmount + 'G on ' + bet.targetName + '!',
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
          text: '🎲 Bet WON! +' + payout + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
      } else {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: '🎲 Bet lost (-' + bet.amount + 'G)',
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
        text: '🎲 Bet ' + arenaBetAmount + 'G on ' + bet.targetName,
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
          text: '🎲 BET WON! +' + payout + 'G',
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
          text: '🎲 Bet lost (-' + myBet.amount + 'G)',
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
          text: '🎲 Bet ' + arenaBetAmount + 'G on ' + ((_remaining$find2 = remaining.find(function (p) {
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
              text: '🎲 BET WON! +' + payout + 'G',
              color: '#3dd497',
              ts: Date.now()
            });
            BT_AUDIO.collect();
          } else {
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 50,
              text: '🎲 Bet lost (-' + lastBet.amount + 'G)',
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
          text: '🎲 Bet ' + amt + 'G on ' + bet.targetName,
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
                  text: '🤝 Bought for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              } else {
                R.coins += execPrice;
                if (R._compStats) R._compStats.totalGoldEarned += execPrice;
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: '🤝 Sold for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              }
              BT_AUDIO.collect();
            } else {
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 30,
                text: mktMode === 'buy' ? '🛒 Buy order placed!' : '💰 Listed for sale!',
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
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        var bsMelee = stateRef.current._bsType || 'greatsword';
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
          text: '🔨 Forged ' + bt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
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
          text: '🔨 Blacksmithing Lv' + R.lifeSkills.blacksmithing.level + '!',
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
            text: 'Need ' + reforgeCost + '× ore + ' + reforgeGold + 'g',
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
          text: '🔧 Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
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
            text: 'Need ' + hardenCost + '× ore + ' + hardenGold + 'g',
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
            text: '⚒️ HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
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
            text: '💔 BROKE! ' + oldName + ' lost all bonuses',
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
        text: '🪙 Smelted Gold Bar!',
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
          text: '📿 Crafted ' + at.label + ' Amulet!',
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
          text: '🛡️ Forged ' + bt.label + ' Shield!',
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
          text: '🔧 ' + R.shield.reforgeBonus.label + ' +' + R.shield.reforgeBonus.value + R.shield.reforgeBonus.unit,
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
            text: '⚒️ HARDENED! +' + bonus.label,
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
            text: '💔 Shield bonuses lost!',
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
            text: '💎 Extracted ' + R.amulet.gem + ' gem',
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
            text: '💎 Extracted ' + R.shield.gem + ' gem',
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
              text: '💎 Extracted ' + wpn.element1 + ' gem',
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
              text: '💎 Extracted ' + wpn.element2 + ' gem',
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
          text: '♻️ Salvaged! ' + returnText,
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
          text: '♻️ Salvaged stash item',
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
        R.inventory[woodKey] = (R.inventory[woodKey] || 0) - wt.woodCost;
        if (R.inventory[woodKey] <= 0) delete R.inventory[woodKey];
        R.coins -= wt.goldCost;
        var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        var wpnType = craftType === 'bow' ? 'bow' : 'staff';
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
          text: '🪚 Crafted ' + wt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
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
          text: '🪚 Woodworking Lv' + R.lifeSkills.woodworking.level + '!',
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
            text: 'Need ' + reforgeCost + '× wood + ' + reforgeGold + 'g',
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
          text: '🔧 Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
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
            text: 'Need ' + hardenCost + '× wood + ' + hardenGold + 'g',
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
            text: '⚒️ HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
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
            text: '💔 BROKE! ' + oldName + ' lost all bonuses',
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
            text: '💎 Polished ' + gemName + '!',
            color: gemCol,
            ts: Date.now()
          });
          BT_AUDIO.collect();
        } else {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: '💔 Gem shattered!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          BT_AUDIO.beep(200, 0.06, 0.1, 'square');
        }
        var leveled = addLifeSkillXp(sk, 'gemCutting', 15);
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 50,
          text: '💎 Gem Cutting Lv' + sk.gemCutting.level + '!',
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
  }, "No gems yet. Harvest resources in elemental zones to collect raw gems!")))), ferrymanPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setFerrymanPanel(false);
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
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setFerrymanPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "The Ferryman"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.6)',
      marginBottom: 8,
      lineHeight: 1.5
    }
  }, "\"Beyond the fence lies the Lawless Land. No rules. No mercy. Attack anyone. Loot everything.\""), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.1)',
      border: '1px solid rgba(255,94,108,.3)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u26A0\uFE0F WARNING"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.5)',
      lineHeight: 1.5
    }
  }, "If you die in the Lawless Land, you lose ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#ff5e6c'
    }
  }, "EVERYTHING"), " \u2014 equipped weapons, armor, shield, amulet, all inventory, all gold. Items drop where you fall. Other players can take them.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Travel cost: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#f5c542'
    }
  }, "100g"), " \xB7 Your gold: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#f5c542'
    }
  }, rpgState.coins, "g")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px 0',
      borderRadius: 8,
      border: 'none',
      fontSize: 11,
      fontWeight: 800,
      background: rpgState.coins >= 100 ? '#ff5e6c' : 'rgba(255,255,255,.08)',
      color: rpgState.coins >= 100 ? '#fff' : 'rgba(255,255,255,.3)',
      cursor: 'pointer',
      letterSpacing: '.03em'
    },
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if (R.coins < 100) return;
      R.coins -= 100;
      var S = stateRef.current;
      /* Travel to wasteland */
      S.currentZone = 'wasteland';
      updateZoneDimensions('wasteland');
      S.map = generateZoneMap('wasteland');
      S.monsters = [];
      S.gatherNodes = [];
      S.npcs = null;
      /* Spawn in safe pad center */
      var wz = ZONES.wasteland;
      S.player.x = Math.floor(wz.w / 2) * TILE;
      S.player.y = (wz.h - 7) * TILE;
      S.groundLoot = [];
      S.hitParticles = [];
      S.deathExplosions = [];
      S.arrows = [];
      S._ambientParticles = [];
      S._zoneWipe = Date.now();
      S._fenceClimb = null;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 40,
        text: '☠️ The Lawless Land',
        color: '#ff5e6c',
        ts: Date.now()
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 25,
        text: 'Climb the fence to enter. No turning back easy.',
        color: '#ea580c',
        ts: Date.now()
      });
      BT_AUDIO.beep(100, 0.2, 0.3, 'sawtooth');
      setTimeout(function () {
        return BT_AUDIO.beep(80, 0.15, 0.25, 'sawtooth');
      }, 150);
      setRpgState(_objectSpread({}, R));
      setFerrymanPanel(false);
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "\u2620\uFE0F ENTER THE WASTELAND (100g)"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 0.6,
      padding: '8px 0',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.06)',
      color: 'rgba(255,255,255,.6)',
      fontSize: 10,
      fontWeight: 600,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      return setFerrymanPanel(false);
    }
  }, "Nevermind")))), ((_stateRef$current18 = stateRef.current) === null || _stateRef$current18 === void 0 ? void 0 : _stateRef$current18.currentZone) === 'farm_home' && /*#__PURE__*/React.createElement("div", {
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
  }))), ((_stateRef$current21 = stateRef.current) === null || _stateRef$current21 === void 0 ? void 0 : _stateRef$current21.currentZone) === 'wasteland' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(255,94,108,.2)',
      border: '1px solid rgba(255,94,108,.4)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#ff5e6c',
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
    }
  }, "\u2620\uFE0F LAWLESS LAND \u2014 ALL items drop on death")), ((_stateRef$current22 = stateRef.current) === null || _stateRef$current22 === void 0 ? void 0 : _stateRef$current22._fenceClimb) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 38,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      padding: '4px 14px',
      borderRadius: 8,
      background: 'rgba(245,197,66,.2)',
      border: '1px solid rgba(245,197,66,.4)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center',
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 3
    }
  }, "\uD83E\uDDD7 Climbing fence..."), /*#__PURE__*/React.createElement("div", {
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
      background: '#f5c542',
      transition: 'width 0.1s',
      width: Math.min(100, (Date.now() - (((_stateRef$current$_fe = stateRef.current._fenceClimb) === null || _stateRef$current$_fe === void 0 ? void 0 : _stateRef$current$_fe.started) || Date.now())) / 2000 * 100) + '%'
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
  }, "\uD83C\uDF1F Well Rested +10% XP \xB7 ", Math.ceil((rpgState._wellRestedUntil - Date.now()) / 60000), "min")), showSocialPanel && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowSocialPanel(false);
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
      return setShowSocialPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 8
    }
  }, "\uD83D\uDC65 Social"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83D\uDC9A Friends (", friendsList.length, ")"), friendsList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "No friends yet. Tap a player and add them!"), friendsList.map(function (f) {
    var _stateRef$current26, _f$name;
    var online = (_stateRef$current26 = stateRef.current) === null || _stateRef$current26 === void 0 || (_stateRef$current26 = _stateRef$current26.others) === null || _stateRef$current26 === void 0 ? void 0 : _stateRef$current26[f.id];
    return /*#__PURE__*/React.createElement("div", {
      key: f.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        marginBottom: 2,
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: online ? '#3dd497' : '#555'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: f.color || '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 800,
        color: '#fff'
      }
    }, ((_f$name = f.name) === null || _f$name === void 0 ? void 0 : _f$name.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: f.color || '#fff'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, online ? 'Online · ' + online.zone : 'Offline')), online && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(91,82,255,.3)',
        background: 'rgba(91,82,255,.1)',
        color: '#a78bfa'
      },
      onClick: function onClick() {
        stateRef.current.player.x = online.x + 40;
        stateRef.current.player.y = online.y + 40;
        setShowSocialPanel(false);
      }
    }, "\uD83D\uDCCD TP"), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.3)',
        background: 'rgba(255,94,108,.08)',
        color: '#ff5e6c'
      },
      onClick: function onClick() {
        var updated = friendsList.filter(function (fr) {
          return fr.id !== f.id;
        });
        setFriendsList(updated);
        try {
          localStorage.setItem('bt_friends', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "\u2715"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83D\uDEAB Blocked (", blockedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 4
    }
  }, "Blocked players can't chat, attack, trade, or duel you in lawful areas. Block does NOT apply in the Lawless Land."), blockedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Nobody blocked."), blockedList.map(function (bid) {
    var _stateRef$current27;
    var o = (_stateRef$current27 = stateRef.current) === null || _stateRef$current27 === void 0 || (_stateRef$current27 = _stateRef$current27.others) === null || _stateRef$current27 === void 0 ? void 0 : _stateRef$current27[bid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || bid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: bid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        marginBottom: 2,
        borderRadius: 4,
        background: 'rgba(255,94,108,.05)',
        border: '1px solid rgba(255,94,108,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#ff5e6c'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(61,220,151,.3)',
        background: 'rgba(61,220,151,.08)',
        color: '#3dd497'
      },
      onClick: function onClick() {
        var updated = blockedList.filter(function (b) {
          return b !== bid;
        });
        setBlockedList(updated);
        try {
          localStorage.setItem('bt_blocked', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "Unblock"));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDD07 Muted (", mutedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 4
    }
  }, "Muted players' chat appears as [muted]. They can still interact with you."), mutedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Nobody muted."), mutedList.map(function (mid) {
    var _stateRef$current28;
    var o = (_stateRef$current28 = stateRef.current) === null || _stateRef$current28 === void 0 || (_stateRef$current28 = _stateRef$current28.others) === null || _stateRef$current28 === void 0 ? void 0 : _stateRef$current28[mid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || mid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: mid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        marginBottom: 2,
        borderRadius: 4,
        background: 'rgba(245,197,66,.05)',
        border: '1px solid rgba(245,197,66,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#f5c542'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(61,220,151,.3)',
        background: 'rgba(61,220,151,.08)',
        color: '#3dd497'
      },
      onClick: function onClick() {
        var updated = mutedList.filter(function (m) {
          return m !== mid;
        });
        setMutedList(updated);
        try {
          localStorage.setItem('bt_muted', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "Unmute"));
  })))), showClanPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 320,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, "\u2715"), !clanData && !clanCreateMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 8
    }
  }, "\uD83C\uDFF0 Clans"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "Clans are groups of up to ", CLAN_MAX_MEMBERS, " players. Create one with a custom name, tag, and pixel logo that shows above your head."), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '10px',
      borderRadius: 8,
      border: 'none',
      fontSize: 12,
      fontWeight: 800,
      background: '#a78bfa',
      color: '#fff',
      cursor: 'pointer',
      marginBottom: 8
    },
    onClick: function onClick() {
      return setClanCreateMode(true);
    }
  }, "\uD83C\uDFF0 Create Clan (", CLAN_CREATE_COST, "g)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "To join a clan, have a clan member invite you by tapping your character.")), !clanData && clanCreateMode && function () {
    var nameRef = React.createRef();
    var tagRef = React.createRef();
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: '#a78bfa',
        marginBottom: 8
      }
    }, "\uD83C\uDFF0 Create Clan"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 3
      }
    }, "Clan Name"), /*#__PURE__*/React.createElement("input", {
      ref: nameRef,
      maxLength: CLAN_NAME_MAX,
      placeholder: "My Awesome Clan",
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: '#fff',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 3
      }
    }, "Clan Tag (max ", CLAN_TAG_MAX, " chars)"), /*#__PURE__*/React.createElement("input", {
      ref: tagRef,
      maxLength: CLAN_TAG_MAX,
      placeholder: "CLAN",
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: '#fff',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box',
        textTransform: 'uppercase'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '10px',
        borderRadius: 8,
        border: 'none',
        fontSize: 11,
        fontWeight: 800,
        background: rpgState.coins >= CLAN_CREATE_COST ? '#a78bfa' : 'rgba(255,255,255,.08)',
        color: rpgState.coins >= CLAN_CREATE_COST ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _nameRef$current, _tagRef$current;
        var name = (_nameRef$current = nameRef.current) === null || _nameRef$current === void 0 || (_nameRef$current = _nameRef$current.value) === null || _nameRef$current === void 0 ? void 0 : _nameRef$current.trim();
        var tag = (_tagRef$current = tagRef.current) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.value) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.trim()) === null || _tagRef$current === void 0 ? void 0 : _tagRef$current.toUpperCase();
        if (!name || name.length < 3) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Name too short (min 3)',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!tag || tag.length < 1) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need a clan tag',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var R = stateRef.current.rpg;
        if (R.coins < CLAN_CREATE_COST) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + CLAN_CREATE_COST + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= CLAN_CREATE_COST;
        var newClan = createDefaultClan(name, tag, CLAN_COLORS[2], CLAN_COLORS[3], stateRef.current.myId);
        setClanData(newClan);
        stateRef.current._clanData = newClan;
        setClanCreateMode(false);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 40,
          text: '🏰 Clan [' + tag + '] Created!',
          color: '#a78bfa',
          ts: Date.now()
        });
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_clan', JSON.stringify(newClan));
        } catch (e) {}
      }
    }, "Create (", CLAN_CREATE_COST, "g)"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.5,
        padding: '10px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: 'rgba(255,255,255,.6)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        return setClanCreateMode(false);
      }
    }, "Cancel")));
  }(), clanData && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'rgba(0,0,0,.3)',
      position: 'relative'
    }
  }, clanData.logo && function () {
    var px3 = 40 / CLAN_LOGO_SIZE;
    return clanData.logo.map(function (row, ri) {
      return row.map(function (ci, ci2) {
        if (ci < 0) return null;
        return /*#__PURE__*/React.createElement("div", {
          key: ri + '-' + ci2,
          style: {
            position: 'absolute',
            left: ci2 * px3,
            top: ri * px3,
            width: px3 + 0.5,
            height: px3 + 0.5,
            background: CLAN_COLORS[ci] || '#fff'
          }
        });
      });
    });
  }()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#a78bfa'
    }
  }, "[", clanData.tag, "] ", clanData.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_clanData$members = clanData.members) === null || _clanData$members === void 0 ? void 0 : _clanData$members.length) || 1, "/", CLAN_MAX_MEMBERS, " members \xB7 Lv", clanData.clanLevel || 1))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 4
    }
  }, "\uD83C\uDFA8 Logo Editor"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 4,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: "eraser",
    style: {
      width: 16,
      height: 16,
      borderRadius: 3,
      cursor: 'pointer',
      border: stateRef.current._clanPaintColor === -1 ? '2px solid #fff' : '1px solid rgba(255,255,255,.2)',
      background: 'repeating-conic-gradient(rgba(255,255,255,.1) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
    },
    onClick: function onClick() {
      stateRef.current._clanPaintColor = -1;
      setRpgState(_objectSpread({}, rpgState));
    }
  }), CLAN_COLORS.map(function (c, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 16,
        height: 16,
        borderRadius: 3,
        background: c,
        cursor: 'pointer',
        border: stateRef.current._clanPaintColor === i ? '2px solid #fff' : '1px solid rgba(255,255,255,.15)'
      },
      onClick: function onClick() {
        stateRef.current._clanPaintColor = i;
        setRpgState(_objectSpread({}, rpgState));
      }
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-grid',
      gridTemplateColumns: "repeat(".concat(CLAN_LOGO_SIZE, ",1fr)"),
      gap: 1,
      background: 'rgba(255,255,255,.08)',
      padding: 2,
      borderRadius: 4
    }
  }, clanData.logo.map(function (row, ri) {
    return row.map(function (ci, ci2) {
      return /*#__PURE__*/React.createElement("div", {
        key: ri + '-' + ci2,
        style: {
          width: 24,
          height: 24,
          cursor: 'pointer',
          borderRadius: 1,
          background: ci >= 0 ? CLAN_COLORS[ci] || '#fff' : 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)'
        },
        onClick: function onClick() {
          var _stateRef$current$_cl;
          var paint = (_stateRef$current$_cl = stateRef.current._clanPaintColor) !== null && _stateRef$current$_cl !== void 0 ? _stateRef$current$_cl : 0;
          var newLogo = clanData.logo.map(function (r) {
            return _toConsumableArray(r);
          });
          newLogo[ri][ci2] = paint;
          var updated = _objectSpread(_objectSpread({}, clanData), {}, {
            logo: newLogo
          });
          setClanData(updated);
          stateRef.current._clanData = updated;
          try {
            localStorage.setItem('bt_clan', JSON.stringify(updated));
          } catch (e) {}
        },
        onMouseDown: function onMouseDown() {
          stateRef.current._clanPainting = true;
        },
        onMouseEnter: function onMouseEnter() {
          var _stateRef$current$_cl2;
          if (!stateRef.current._clanPainting) return;
          var paint = (_stateRef$current$_cl2 = stateRef.current._clanPaintColor) !== null && _stateRef$current$_cl2 !== void 0 ? _stateRef$current$_cl2 : 0;
          var newLogo = clanData.logo.map(function (r) {
            return _toConsumableArray(r);
          });
          newLogo[ri][ci2] = paint;
          var updated = _objectSpread(_objectSpread({}, clanData), {}, {
            logo: newLogo
          });
          setClanData(updated);
          stateRef.current._clanData = updated;
        }
      });
    });
  })), /*#__PURE__*/React.createElement("div", {
    onMouseUp: function onMouseUp() {
      stateRef.current._clanPainting = false;
    },
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 7,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(255,94,108,.3)',
      background: 'rgba(255,94,108,.1)',
      color: '#ff5e6c'
    },
    onClick: function onClick() {
      var cleared = _objectSpread(_objectSpread({}, clanData), {}, {
        logo: Array(CLAN_LOGO_SIZE).fill(null).map(function () {
          return Array(CLAN_LOGO_SIZE).fill(-1);
        })
      });
      setClanData(cleared);
      stateRef.current._clanData = cleared;
      try {
        localStorage.setItem('bt_clan', JSON.stringify(cleared));
      } catch (e) {}
    }
  }, "Clear Logo"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 7,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(61,220,151,.3)',
      background: 'rgba(61,220,151,.1)',
      color: '#3dd497'
    },
    onClick: function onClick() {
      try {
        localStorage.setItem('bt_clan', JSON.stringify(clanData));
      } catch (e) {}
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 30,
        text: '🏰 Logo saved!',
        color: '#a78bfa',
        ts: Date.now()
      });
      BT_AUDIO.collect();
    }
  }, "Save Logo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 3
    }
  }, "Members (", ((_clanData$members2 = clanData.members) === null || _clanData$members2 === void 0 ? void 0 : _clanData$members2.length) || 1, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, (clanData.members || []).map(function (m, i) {
    var _stateRef$current29;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 0',
        borderBottom: '1px solid rgba(255,255,255,.05)'
      }
    }, m === ((_stateRef$current29 = stateRef.current) === null || _stateRef$current29 === void 0 ? void 0 : _stateRef$current29.myId) ? '⭐ You (Founder)' : m);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      marginBottom: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.05)',
      border: '1px solid rgba(255,94,108,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u2694\uFE0F Clan Wars"), stateRef.current._activeClanWar ? function (_ZONES$war$zone4, _ZONES$war$zone5) {
    var war = stateRef.current._activeClanWar;
    var timeLeft = Math.max(0, Math.ceil((war.endTime - Date.now()) / 60000));
    var isChallenger = war.challenger.tag === clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: us.color || '#5b52ff'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.3)',
        fontWeight: 700
      }
    }, "VS"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: them.color || '#ff5e6c'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, ((_ZONES$war$zone4 = ZONES[war.zone]) === null || _ZONES$war$zone4 === void 0 ? void 0 : _ZONES$war$zone4.name) || war.zone, " \xB7 ", timeLeft, "m remaining \xB7 ", war.killLog.length, " kills"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        textAlign: 'center',
        marginTop: 2
      }
    }, "Travel to ", (_ZONES$war$zone5 = ZONES[war.zone]) === null || _ZONES$war$zone5 === void 0 ? void 0 : _ZONES$war$zone5.name, " to fight! PvP kills score points."), war.killLog.slice(-3).reverse().map(function (k, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)',
          textAlign: 'center'
        }
      }, k.killer, " defeated ", k.victim, " (+", k.points, "pts)");
    }));
  }() : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Challenge another clan to a 30-minute PvP battle in a zone. Most kills wins!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Battle Zone"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, CLAN_WAR_ZONES.map(function (zId) {
    var _ELEMENTS$z$element, _ELEMENTS$z$element2, _ELEMENTS$z$element3;
    var z = ZONES[zId];
    var sel = stateRef.current._warZone === zId;
    return /*#__PURE__*/React.createElement("button", {
      key: zId,
      onClick: function onClick() {
        stateRef.current._warZone = zId;
        setRpgState(_objectSpread({}, rpgState));
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (sel ? (((_ELEMENTS$z$element = ELEMENTS[z.element]) === null || _ELEMENTS$z$element === void 0 ? void 0 : _ELEMENTS$z$element.color) || '#5b52ff') + '60' : 'rgba(255,255,255,.06)'),
        background: sel ? (((_ELEMENTS$z$element2 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element2 === void 0 ? void 0 : _ELEMENTS$z$element2.color) || '#5b52ff') + '15' : 'transparent',
        color: sel ? ((_ELEMENTS$z$element3 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element3 === void 0 ? void 0 : _ELEMENTS$z$element3.color) || '#5b52ff' : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, z.name);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Target Clan"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, function () {
    var S = stateRef.current;
    var otherClans = {};
    Object.entries(S.others).forEach(function (_ref147) {
      var _o$rpgData;
      var _ref148 = _slicedToArray(_ref147, 2),
        id = _ref148[0],
        o = _ref148[1];
      var ct = (_o$rpgData = o.rpgData) === null || _o$rpgData === void 0 ? void 0 : _o$rpgData.clanTag;
      if (ct && ct !== clanData.tag && !otherClans[ct]) {
        var _o$rpgData2, _o$rpgData3;
        otherClans[ct] = {
          tag: ct,
          name: ((_o$rpgData2 = o.rpgData) === null || _o$rpgData2 === void 0 ? void 0 : _o$rpgData2.clanName) || ct,
          color: ((_o$rpgData3 = o.rpgData) === null || _o$rpgData3 === void 0 ? void 0 : _o$rpgData3.clanColor1) || '#888'
        };
      }
    });
    var clans = Object.values(otherClans);
    if (clans.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No other clans online");
    return clans.map(function (c) {
      var sel = S._warTarget === c.tag;
      return /*#__PURE__*/React.createElement("button", {
        key: c.tag,
        onClick: function onClick() {
          S._warTarget = c.tag;
          S._warTargetData = c;
          setRpgState(_objectSpread({}, rpgState));
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (sel ? '#ff5e6c' : 'rgba(255,255,255,.08)'),
          background: sel ? 'rgba(255,94,108,.12)' : 'rgba(255,255,255,.02)',
          color: sel ? '#ff5e6c' : 'rgba(255,255,255,.4)',
          cursor: 'pointer'
        }
      }, "[", c.tag, "] ", c.name);
    });
  }()), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _ZONES$zone;
      var S = stateRef.current;
      var zone = S._warZone || CLAN_WAR_ZONES[0];
      var target = S._warTargetData;
      if (!target) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Select a target clan!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      var war = createClanWar(clanData, target, zone);
      /* Add self to war */
      war.challenger.members.push(S.myId);
      S._activeClanWar = war;
      /* Broadcast war declaration */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'clan_war_declare',
        payload: {
          war: war,
          challengerTag: clanData.tag,
          defenderTag: target.tag
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 40,
        text: '⚔️ WAR DECLARED vs [' + target.tag + ']!',
        color: '#ff5e6c',
        ts: Date.now()
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 25,
        text: 'Battle zone: ' + ((_ZONES$zone = ZONES[zone]) === null || _ZONES$zone === void 0 ? void 0 : _ZONES$zone.name),
        color: 'rgba(255,255,255,.5)',
        ts: Date.now()
      });
      BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
      setTimeout(function () {
        return BT_AUDIO.beep(150, 0.2, 0.25, 'sawtooth');
      }, 100);
      S.screenShake = 6;
      setRpgState(_objectSpread({}, rpgState));
    },
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 800,
      border: '1.5px solid rgba(255,94,108,.4)',
      background: 'rgba(255,94,108,.15)',
      color: '#ff5e6c',
      cursor: 'pointer'
    }
  }, "\u2694\uFE0F Declare War"))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '6px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(255,94,108,.3)',
      background: 'rgba(255,94,108,.08)',
      color: '#ff5e6c'
    },
    onClick: function onClick() {
      setClanData(null);
      stateRef.current._clanData = null;
      try {
        localStorage.removeItem('bt_clan');
      } catch (e) {}
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 30,
        text: 'Left clan',
        color: '#ff5e6c',
        ts: Date.now()
      });
    }
  }, "Leave Clan")))), buildingPanel === 'farmhome' && /*#__PURE__*/React.createElement("div", {
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
      var R = stateRef.current.rpg;
      if (!R._quests) R._quests = {};
      R._quests[questPanel.quest.id] = QUEST_STATUS.active;
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      setQuestPanel(_objectSpread(_objectSpread({}, questPanel), {}, {
        status: 'active'
      }));
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 40,
        text: '📜 Quest Accepted: ' + questPanel.quest.title,
        color: '#5b52ff',
        ts: Date.now()
      });
      BT_AUDIO.collect();
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
      var R = stateRef.current.rpg;
      if (!R._quests) R._quests = {};
      R._quests[questPanel.quest.id] = QUEST_STATUS.turnedIn;
      R.coins += questPanel.quest.reward.gold;
      R.xp += questPanel.quest.reward.xp;
      /* Achievement points for quest completion */
      R.achievementPoints = (R.achievementPoints || 0) + QUEST_AP_REWARD;
      if (!R._compStats) R._compStats = createDefaultCompStats();
      R._compStats.questsCompleted++;
      R._compStats.totalGoldEarned += questPanel.quest.reward.gold;
      /* Unlock next quest in chain */
      if (questPanel.quest.next && !R._quests[questPanel.quest.next]) {
        R._quests[questPanel.quest.next] = QUEST_STATUS.available;
      }
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 40,
        text: '🏆 Quest Complete! +' + questPanel.quest.reward.gold + 'G +' + questPanel.quest.reward.xp + 'XP',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.levelUp();
      setQuestPanel(null);
    }
  }, "Turn In Quest"))), ferrymanPanel && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setFerrymanPanel(false);
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
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setFerrymanPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "The Ferryman"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.7)',
      marginBottom: 8,
      lineHeight: 1.5
    }
  }, "\"The Lawless Land awaits. No rules. No mercy.", /*#__PURE__*/React.createElement("br", null), "Attack any player. Win everything they carry.", /*#__PURE__*/React.createElement("br", null), "Lose... and they take everything from you.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "All items drop on death. All gold. All gear."), /*#__PURE__*/React.createElement("br", null), "Equipped weapons, armor, amulet, shield \u2014 everything.\""), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#f5c542',
      marginBottom: 8,
      padding: '4px 8px',
      borderRadius: 6,
      background: 'rgba(245,197,66,.1)',
      border: '1px solid rgba(245,197,66,.2)'
    }
  }, "\u26A0\uFE0F Travel cost: 100 gold \xB7 You arrive at a fenced safe area.", /*#__PURE__*/React.createElement("br", null), "Climb the fence (2s) to enter the lawless zone."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '10px',
      borderRadius: 8,
      border: 'none',
      background: rpgState.coins >= 100 ? '#ff5e6c' : 'rgba(255,255,255,.1)',
      color: rpgState.coins >= 100 ? '#fff' : 'rgba(255,255,255,.3)',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if (R.coins < 100) return;
      R.coins -= 100;
      var S = stateRef.current;
      S.currentZone = 'wasteland';
      updateZoneDimensions('wasteland');
      S.map = generateZoneMap('wasteland');
      S.monsters = [];
      S.gatherNodes = [];
      S.npcs = null;
      /* Spawn in safe pad center */
      var wz = ZONES.wasteland;
      S.player.x = Math.floor(wz.w / 2) * TILE;
      S.player.y = (wz.h - 7) * TILE;
      S.groundLoot = [];
      S.hitParticles = [];
      S.deathExplosions = [];
      S.arrows = [];
      S._ambientParticles = [];
      S._zoneWipe = Date.now();
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 40,
        text: '💀 The Lawless Land',
        color: '#ff5e6c',
        ts: Date.now()
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 25,
        text: 'Climb the fence to enter. All items at risk.',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(100, 0.15, 0.2, 'sawtooth');
      setTimeout(function () {
        return BT_AUDIO.beep(80, 0.1, 0.15, 'sawtooth');
      }, 150);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      setFerrymanPanel(false);
    }
  }, "\uD83D\uDC80 Travel (100g)"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '10px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.06)',
      color: 'rgba(255,255,255,.6)',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      return setFerrymanPanel(false);
    }
  }, "Not today")))), duelRequest && /*#__PURE__*/React.createElement("div", {
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
        text: '⚔️ DUEL!',
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
        text: '⚔️ Guards dispatched!',
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
          text: '📨 Trade sent!',
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
        text: '✅ Trade accepted!',
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
    var dmg = Math.round(calcWeaponDmg(wpn.type, rpgState.power || 0, wpn.tierMult));
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
            text: '🍽️ +' + healed + ' HP',
            color: '#3dd497',
            ts: Date.now()
          });
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
    var stashDmg = Math.round(calcWeaponDmg(sw.type, rpgState.power || 0, sw.tierMult));
    var curDmg = current ? Math.round(calcWeaponDmg(current.type, rpgState.power || 0, current.tierMult)) : 0;
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
  }, "Tap a pet to set active. Active pet follows you and auto-collects loot within ", PET_LOOT_RADIUS, "px."))), showSkills && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowSkills(false);
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
      return setShowSkills(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83D\uDCCA Life Skills"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginBottom: 4
    }
  }, "HARVESTING"), [{
    name: 'Woodcutting',
    key: 'woodcutting',
    icon: '🪓',
    color: '#8B6914',
    desc: 'Chop trees for wood + zone gems'
  }, {
    name: 'Fishing',
    key: 'fishing',
    icon: '🎣',
    color: '#3498DB',
    desc: 'Catch fish for cooking + zone gems'
  }, {
    name: 'Mining',
    key: 'mining',
    icon: '⛏️',
    color: '#8a8a8a',
    desc: 'Mine ore (iron Lv1-5, steel Lv6-10) + zone gems'
  }].map(function (sk) {
    var _rpgState$lifeSkills43;
    var skill = ((_rpgState$lifeSkills43 = rpgState.lifeSkills) === null || _rpgState$lifeSkills43 === void 0 ? void 0 : _rpgState$lifeSkills43[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginTop: 6,
      marginBottom: 4
    }
  }, "CRAFTING"), [{
    name: 'Cooking',
    key: 'cooking',
    icon: '🍳',
    color: '#ea580c',
    desc: 'Cook fish + ingredients for healing food'
  }, {
    name: 'Blacksmithing',
    key: 'blacksmithing',
    icon: '🔨',
    color: '#b0b0b0',
    desc: 'Forge melee gear bases with gem slots'
  }, {
    name: 'Woodworking',
    key: 'woodworking',
    icon: '🪚',
    color: '#8B6914',
    desc: 'Craft bows & staves with gem slots'
  }, {
    name: 'Gem Cutting',
    key: 'gemCutting',
    icon: '💎',
    color: '#a855f7',
    desc: 'Cut raw gems into polished slottable gems'
  }, {
    name: 'Enchanting',
    key: 'enchanting',
    icon: '✨',
    color: '#a78bfa',
    desc: 'Slot gems into gear for elemental power'
  }].map(function (sk) {
    var _rpgState$lifeSkills44;
    var skill = ((_rpgState$lifeSkills44 = rpgState.lifeSkills) === null || _rpgState$lifeSkills44 === void 0 ? void 0 : _rpgState$lifeSkills44[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginTop: 6,
      marginBottom: 4
    }
  }, "UTILITY"), [{
    name: 'Farming',
    key: 'farming',
    icon: '🌾',
    color: '#3dd497',
    desc: 'Grow ingredients at the farm'
  }, {
    name: 'Trapping',
    key: 'trapping',
    icon: '🪤',
    color: '#f5c542',
    desc: 'Capture weakened monsters as pets'
  }].map(function (sk) {
    var _rpgState$lifeSkills45;
    var skill = ((_rpgState$lifeSkills45 = rpgState.lifeSkills) === null || _rpgState$lifeSkills45 === void 0 ? void 0 : _rpgState$lifeSkills45[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#a855f7',
      marginBottom: 4
    }
  }, "\uD83D\uDC8E Gems"), function (_rpgState$lifeSkills46) {
    var gems = ((_rpgState$lifeSkills46 = rpgState.lifeSkills) === null || _rpgState$lifeSkills46 === void 0 ? void 0 : _rpgState$lifeSkills46.gems) || {};
    var entries = Object.entries(gems).filter(function (_ref164) {
      var _ref165 = _slicedToArray(_ref164, 2),
        k = _ref165[0],
        v = _ref165[1];
      return v > 0;
    });
    if (entries.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No gems yet. Harvest resources or kill monsters in elemental zones!");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap'
      }
    }, entries.map(function (_ref166) {
      var _ZONE_RESOURCES$elem3, _ZONE_RESOURCES$elem4;
      var _ref167 = _slicedToArray(_ref166, 2),
        k = _ref167[0],
        v = _ref167[1];
      var parts = k.split('_'); /* raw_flame, polished_frost, etc */
      var qual = parts[0];
      var elem = parts[1];
      var gc = ((_ZONE_RESOURCES$elem3 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem3 === void 0 ? void 0 : _ZONE_RESOURCES$elem3.gemColor) || '#a855f7';
      return /*#__PURE__*/React.createElement("span", {
        key: k,
        style: {
          fontSize: 7,
          padding: '2px 5px',
          borderRadius: 3,
          background: gc + '15',
          color: gc,
          border: '1px solid ' + gc + '30'
        }
      }, qual === 'raw' ? '◇' : '◆', " ", ((_ZONE_RESOURCES$elem4 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem4 === void 0 ? void 0 : _ZONE_RESOURCES$elem4.gem) || elem + ' Gem', " \xD7", v);
    }));
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDCDC Active Quests"), function () {
    var active = Object.entries(rpgState._quests || {}).filter(function (_ref168) {
      var _ref169 = _slicedToArray(_ref168, 2),
        qid = _ref169[0],
        st = _ref169[1];
      return st === QUEST_STATUS.active;
    }).map(function (_ref170) {
      var _ref171 = _slicedToArray(_ref170, 1),
        qid = _ref171[0];
      return QUEST_CHAINS[qid];
    }).filter(Boolean);
    if (active.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No active quests. Talk to NPCs with \u2757 markers!");
    return active.map(function (q) {
      var done = q.check(rpgState, stateRef.current);
      return /*#__PURE__*/React.createElement("div", {
        key: q.id,
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
          fontSize: 10,
          color: done ? '#3dd497' : '#f5c542'
        }
      }, done ? '✓' : '○'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 600,
          color: '#fff'
        }
      }, q.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, q.desc)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, q.npc));
    });
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\u2B50 Achievement Points: ", rpgState.achievementPoints || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#8890b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCCA Player Stats"), function () {
    var cs = rpgState._compStats || createDefaultCompStats();
    /* Update playtime */
    var playmins = Math.floor(((cs.playtimeSeconds || 0) + (Date.now() - (cs._sessionStart || Date.now())) / 1000) / 60);
    var sections = [{
      label: 'Combat',
      color: '#ff5e6c',
      stats: [['Monsters Killed', cs.monstersKilled], ['Deaths', cs.deaths], ['Grand Slams', cs.grandSlams], ['Bosses Killed', cs.bossesKilled], ['Highest Kill Lv', cs.highestMonsterKill], ['Crits Landed', cs.critLanded], ['Collisions', cs.collisionsTriggered]]
    }, {
      label: 'PvP',
      color: '#a78bfa',
      stats: [['PvP Kills', cs.pvpKills], ['PvP Deaths', cs.pvpDeaths], ['Lawless Kills', cs.lawlessKills], ['Lawless Deaths', cs.lawlessDeaths], ['Duels Won', cs.duelsWon], ['Duels Lost', cs.duelsLost]]
    }, {
      label: 'Life Skills',
      color: '#3dd497',
      stats: [['Fish Caught', cs.fishCaught], ['Trees Felled', cs.treesFelled], ['Ores Mined', cs.oresMined], ['Items Crafted', cs.itemsCrafted], ['Items Salvaged', cs.itemsSalvaged], ['Cook Success', cs.cookSuccess], ['Cook Burns', cs.cookBurns], ['Reforges', cs.reforgeAttempts], ['Harden OK', cs.hardenSuccess], ['Harden Fail', cs.hardenFails]]
    }, {
      label: 'Economy',
      color: '#f5c542',
      stats: [['Gold Earned', cs.totalGoldEarned], ['Gold Spent', cs.totalGoldSpent], ['Gold Lost (death)', cs.goldLostToDeath], ['Total Gambled', cs.totalGambled], ['Gamble Won', cs.totalGambleWon], ['Gamble Lost', cs.totalGambleLost]]
    }, {
      label: 'Progress',
      color: '#5b52ff',
      stats: [['Quests Done', cs.questsCompleted], ['Rare Drops', cs.rareDropsFound], ['Zones Explored', cs.zonesExplored], ['Dungeons Cleared', cs.dungeonsCleared], ['Pets Captured', cs.petsCapured], ['Playtime', playmins + 'min']]
    }];
    return sections.map(function (sec) {
      return /*#__PURE__*/React.createElement("div", {
        key: sec.label,
        style: {
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: sec.color,
          marginBottom: 2
        }
      }, sec.label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1px 8px',
          fontSize: 7,
          color: 'rgba(255,255,255,.5)'
        }
      }, sec.stats.map(function (_ref172) {
        var _ref173 = _slicedToArray(_ref172, 2),
          k = _ref173[0],
          v = _ref173[1];
        return /*#__PURE__*/React.createElement(React.Fragment, {
          key: k
        }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
          style: {
            textAlign: 'right',
            color: '#fff'
          }
        }, v || 0));
      })));
    });
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#00d4b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCE6 Resources"), function () {
    var inv = rpgState.inventory || {};
    var items = Object.entries(inv).filter(function (_ref174) {
      var _ref175 = _slicedToArray(_ref174, 2),
        k = _ref175[0],
        v = _ref175[1];
      return v > 0;
    });
    if (items.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No resources. Harvest nodes in combat zones!");
    /* Categorize */
    var fish = items.filter(function (_ref176) {
      var _ref177 = _slicedToArray(_ref176, 1),
        k = _ref177[0];
      return k.startsWith('fish_');
    });
    var wood = items.filter(function (_ref178) {
      var _ref179 = _slicedToArray(_ref178, 1),
        k = _ref179[0];
      return k.startsWith('wood_');
    });
    var ore = items.filter(function (_ref180) {
      var _ref181 = _slicedToArray(_ref180, 1),
        k = _ref181[0];
      return k.startsWith('ore_');
    });
    var herbs = items.filter(function (_ref182) {
      var _ref183 = _slicedToArray(_ref182, 1),
        k = _ref183[0];
      return k.startsWith('herb_');
    });
    var gear = items.filter(function (_ref184) {
      var _ref185 = _slicedToArray(_ref184, 1),
        k = _ref185[0];
      return k.startsWith('gear_');
    });
    var other = items.filter(function (_ref186) {
      var _ref187 = _slicedToArray(_ref186, 1),
        k = _ref187[0];
      return !k.startsWith('fish_') && !k.startsWith('wood_') && !k.startsWith('ore_') && !k.startsWith('herb_') && !k.startsWith('gear_');
    });
    var renderGroup = function renderGroup(label, emoji, color, arr) {
      if (arr.length === 0) return null;
      return React.createElement('div', {
        key: label,
        style: {
          marginBottom: 4
        }
      }, React.createElement('div', {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: color,
          marginBottom: 2
        }
      }, emoji + ' ' + label), React.createElement('div', {
        style: {
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap'
        }
      }, arr.map(function (_ref188) {
        var _ref189 = _slicedToArray(_ref188, 2),
          k = _ref189[0],
          v = _ref189[1];
        return React.createElement('span', {
          key: k,
          style: {
            fontSize: 7,
            padding: '1px 4px',
            borderRadius: 3,
            background: color + '15',
            color: color,
            border: '1px solid ' + color + '25'
          }
        }, k.replace(/^(fish|wood|ore|herb|gear)_/, '').replace(/_/g, ' ') + ' ×' + v);
      })));
    };
    return React.createElement(React.Fragment, null, renderGroup('Fish', '🎣', '#3498DB', fish), renderGroup('Wood', '🪓', '#8B6914', wood), renderGroup('Ore', '⛏️', '#8a8a8a', ore), renderGroup('Herbs', '🌿', '#3dd497', herbs), renderGroup('Gear', '🔨', '#b0b0b0', gear), other.length > 0 && renderGroup('Other', '📦', '#00d4b8', other));
  }()))), tutorialStep >= 0 && tutorialStep < 7 && /*#__PURE__*/React.createElement("div", {
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 18,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.05em',
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
      color: function (_stateRef$current32, _ELEMENTS$z$element4) {
        var z = ZONES[((_stateRef$current32 = stateRef.current) === null || _stateRef$current32 === void 0 ? void 0 : _stateRef$current32.currentZone) || 'town'];
        return z !== null && z !== void 0 && z.element ? (_ELEMENTS$z$element4 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element4 === void 0 ? void 0 : _ELEMENTS$z$element4.color : '#e8eaf8';
      }(),
      background: 'rgba(0,0,0,.5)',
      padding: '3px 12px',
      borderRadius: 6,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      textAlign: 'center'
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
  }(), function (_stateRef$current38) {
    var fc = (_stateRef$current38 = stateRef.current) === null || _stateRef$current38 === void 0 ? void 0 : _stateRef$current38._fenceClimb;
    if (!fc) return null;
    var elapsed = Date.now() - fc.started;
    var pct = Math.min(100, elapsed / fc.duration * 100);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 52,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 18,
        width: 180,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'Atkinson Hyperlegible,sans-serif',
        color: '#f5c542',
        marginBottom: 2
      }
    }, "\uD83E\uDDD7 Climbing ", fc.direction === 'out' ? 'OUT' : 'IN', "... ", Math.ceil((fc.duration - elapsed) / 1000), "s"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: 6,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        background: fc.direction === 'out' ? '#ff5e6c' : '#3dd497',
        borderRadius: 3,
        transition: 'width 0.1s linear'
      }
    })));
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
        text: '⚔️ Duel sent',
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
        text: '💀 Threat issued!',
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
        text: '🏰 Clan invite sent',
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
            text: '💚 Added friend!',
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
            text: '🔇 Muted',
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
            text: '🚫 Blocked — no interactions',
            color: '#ff5e6c',
            ts: Date.now()
          });
        }
      }
    }, isBlocked ? '🚫 Blocked' : '🚫 Block');
  }()))), ((_stateRef$current40 = stateRef.current) === null || _stateRef$current40 === void 0 ? void 0 : _stateRef$current40.currentZone) === 'frost' && rpgState && /*#__PURE__*/React.createElement("div", {
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
        text: '⛄ Snowman placed!',
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
        text: '🛷 SLED!',
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
        text: '🚣 Raft built! Sail across water.',
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
        text: '🔥 Torch lit! (2 min)',
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
  }, "\uD83D\uDD0A Echo! 2\xD7 aggro")), ((_stateRef$current49 = stateRef.current) === null || _stateRef$current49 === void 0 ? void 0 : _stateRef$current49.currentZone) === 'frost' && rpgState && hasUnlock(rpgState, 'zone_mechanics') && /*#__PURE__*/React.createElement("div", {
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
    title: 'Build Snowman (' + SNOWMAN_SNOW_COST + ' snow)',
    onClick: function onClick() {
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
        text: '⛄ Snowman built!',
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
          text: '🛷 Sled crafted!',
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
          text: '🛷 WHOOSH!',
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
        text: '🚣 Raft built!',
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
        text: '🔥 Torch lit!',
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif',
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
  }, "\uD83C\uDFEA Open Shop"), showShop && rpgState && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowShop(false);
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
      return setShowShop(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "\uD83C\uDFEA Market"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 10
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, " Gold"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "Sell Items"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4,
      marginBottom: 10
    }
  }, Object.entries(rpgState.inventory || {}).filter(function (_ref222) {
    var _ref223 = _slicedToArray(_ref222, 2),
      k = _ref223[0],
      v = _ref223[1];
    return v > 0 && SHOP_PRICES[k] > 0;
  }).map(function (_ref224) {
    var _ref225 = _slicedToArray(_ref224, 2),
      key = _ref225[0],
      qty = _ref225[1];
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
      npc: '💀'
    };
    var price = SHOP_PRICES[key] || 0;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      style: {
        padding: '6px 4px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        textAlign: 'center',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R.inventory || !R.inventory[key] || R.inventory[key] < 1) return;
        R.inventory[key]--;
        R.coins += price;
        setRpgState(_objectSpread({}, R));
        syncRpgToServer(R);
        BT_AUDIO.beep(500, 0.05, 0.08, 'sine');
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: '+' + price + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14
      }
    }, emojis[key] || '📦'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: '#f5c542'
      }
    }, price, "G"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "\xD7", qty));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "Buy Items"), SHOP_ITEMS_FOR_SALE.map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        padding: '6px 8px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
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
        background: rpgState.coins >= item.cost ? '#3dd497' : 'rgba(60,60,60,.5)',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (R.coins < item.cost) return;
        R.coins -= item.cost;
        if (item.key === 'potions') {
          R.hp = Math.min(R.maxHp, R.hp + 30);
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: '💚 +30HP',
            color: '#3dd497',
            ts: Date.now()
          });
        }
        setRpgState(_objectSpread({}, R));
        BT_AUDIO.collect();
      }
    }, item.cost, "G"));
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: 6,
      padding: '8px',
      borderRadius: 8,
      border: '1px solid rgba(255,92,108,.3)',
      background: 'rgba(255,92,108,.15)',
      color: '#ff5e6c',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      var total = 0;
      Object.entries(R.inventory || {}).forEach(function (_ref226) {
        var _ref227 = _slicedToArray(_ref226, 2),
          k = _ref227[0],
          v = _ref227[1];
        if (v > 0 && SHOP_PRICES[k] > 0) {
          total += SHOP_PRICES[k] * v;
          R.inventory[k] = 0;
        }
      });
      R.coins += total;
      setRpgState(_objectSpread({}, R));
      if (total > 0) syncRpgToServer(R);
      if (total > 0) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: '💰 +' + total + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
      }
    }
  }, "Sell All (", Object.entries(rpgState.inventory || {}).reduce(function (t, _ref228) {
    var _ref229 = _slicedToArray(_ref228, 2),
      k = _ref229[0],
      v = _ref229[1];
    return t + (SHOP_PRICES[k] || 0) * v;
  }, 0), "G)"))), nearBuilding !== null && BUILDINGS[nearBuilding] && /*#__PURE__*/React.createElement("button", {
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
        text: '😴 Zzz... Stats restored!',
        color: '#3dd497',
        ts: Date.now()
      });
      S2.dmgNumbers.push({
        x: S2.player.x,
        y: S2.player.y - 25,
        text: '✨ Well Rested +10% XP (30min)',
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
  }, "E"), "\uD83C\uDFAE Minigame Arena"), ((_stateRef$current58 = stateRef.current) === null || _stateRef$current58 === void 0 ? void 0 : _stateRef$current58._nearNode) && !gatherMini && /*#__PURE__*/React.createElement("button", {
    className: "bt-interact-prompt",
    style: {
      bottom: 140,
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
      if (skillLvl < node.gatherLvl) {
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
      /* Launch timing bar minigame — green zone width scales with skill level */
      var targetSize = Math.min(0.4, 0.12 + skillLvl * 0.004); /* 12%–40% of bar */
      var target = 0.2 + Math.random() * 0.6; /* random position 20%–80% */
      setGatherMini({
        node: node,
        skill: skillName,
        started: Date.now(),
        target: target,
        targetSize: targetSize,
        result: null
      });
      BT_AUDIO.beep(600, 0.03, 0.04, 'sine');
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
      if (skillLvl < node.gatherLvl) {
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
      var targetSize = Math.min(0.4, 0.12 + skillLvl * 0.004);
      var target = 0.2 + Math.random() * 0.6;
      setGatherMini({
        node: node,
        skill: skillName,
        started: Date.now(),
        target: target,
        targetSize: targetSize,
        result: null
      });
      BT_AUDIO.beep(600, 0.03, 0.04, 'sine');
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
    return s === 'woodcutting' ? 'Chop' : s === 'fishing' ? 'Fish' : 'Mine';
  }(), "  ", (_stateRef$current$_ne2 = stateRef.current._nearNode) === null || _stateRef$current$_ne2 === void 0 ? void 0 : _stateRef$current$_ne2.spotName, " \u2014 ", (_stateRef$current$_ne3 = stateRef.current._nearNode) === null || _stateRef$current$_ne3 === void 0 ? void 0 : _stateRef$current$_ne3.name, " (Lv", (_stateRef$current$_ne4 = stateRef.current._nearNode) === null || _stateRef$current$_ne4 === void 0 ? void 0 : _stateRef$current$_ne4.gatherLvl, ")"), gatherMini && !gatherMini.result && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 130,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      width: 260,
      padding: '10px 14px',
      borderRadius: 12,
      background: 'rgba(10,8,20,.95)',
      border: '1px solid rgba(255,255,255,.2)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--txt)',
      marginBottom: 6,
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
    }
  }, gatherMini.skill === 'woodcutting' ? '🪓' : gatherMini.skill === 'fishing' ? '🎣' : '⛏️', " TAP when the bar hits the green zone!"), function (_gatherMini$node) {
    var elapsed = (Date.now() - gatherMini.started) / 1000;
    var speed = 1.2 + (((_gatherMini$node = gatherMini.node) === null || _gatherMini$node === void 0 ? void 0 : _gatherMini$node.gatherLvl) || 1) * 0.03; /* faster for higher tier nodes */
    var progress = elapsed * speed % 2; /* ping-pong 0→1→0 */
    var pos = progress <= 1 ? progress : 2 - progress;
    var t = gatherMini.target,
      ts = gatherMini.targetSize;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        height: 28,
        background: 'rgba(255,60,60,.25)',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: (t - ts) * 100 + '%',
        width: ts * 200 + '%',
        height: '100%',
        background: 'rgba(0,200,100,.35)',
        borderLeft: '2px solid #3dd497',
        borderRight: '2px solid #3dd497'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: t * 100 + '%',
        width: 2,
        height: '100%',
        background: '#f5c542',
        opacity: 0.6
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: pos * 100 + '%',
        top: 2,
        width: 4,
        height: 24,
        background: '#fff',
        borderRadius: 2,
        boxShadow: '0 0 6px #fff',
        transform: 'translateX(-2px)'
      }
    }));
  }(), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _gatherMini$node2;
      var elapsed = (Date.now() - gatherMini.started) / 1000;
      var speed = 1.2 + (((_gatherMini$node2 = gatherMini.node) === null || _gatherMini$node2 === void 0 ? void 0 : _gatherMini$node2.gatherLvl) || 1) * 0.03;
      var progress = elapsed * speed % 2;
      var pos = progress <= 1 ? progress : 2 - progress;
      var result = evaluateMinigame(pos, gatherMini.target, gatherMini.targetSize);
      var reward = MINIGAME_REWARDS[result];
      var S = stateRef.current,
        node = gatherMini.node,
        R = S.rpg;
      if (!node || !R) {
        setGatherMini(null);
        return;
      }

      /* Show result text */
      S.dmgNumbers.push({
        x: node.x,
        y: node.y - 10,
        text: reward.label,
        color: reward.color,
        ts: Date.now()
      });
      if (result === 'miss') {
        BT_AUDIO.beep(150, 0.06, 0.1, 'square');
        setGatherMini(null);
        return; /* miss = no harvest, try again */
      }

      /* Hit the node */
      BT_AUDIO.beep(gatherMini.skill === 'woodcutting' ? 400 : gatherMini.skill === 'fishing' ? 600 : 800, 0.03, 0.06, 'triangle');
      node.hp -= result === 'perfect' ? 2 : 1; /* perfect = double damage */
      for (var gp = 0; gp < 5; gp++) S.hitParticles.push({
        x: node.x + (Math.random() - .5) * 8,
        y: node.y + (Math.random() - .5) * 8,
        vx: (Math.random() - .5) * 3,
        vy: -1 - Math.random() * 2,
        life: 0.6,
        color: node.color,
        size: 1.5 + Math.random()
      });
      S.dmgNumbers.push({
        x: node.x,
        y: node.y - 15,
        text: node.emoji + ' ' + Math.max(0, node.hp) + '/' + node.maxHp,
        color: node.color,
        ts: Date.now()
      });
      if (node.hp <= 0) {
        node.alive = false;
        node.respawnAt = Date.now() + node.respawnTime;
        if (!R.inventory) R.inventory = {};
        var baseName = node.baseName || node.name;
        var baseKey = node.resourceType + '_' + baseName.replace(/\s+/g, '_').toLowerCase();
        var yieldQty = reward.yieldMult || 1;
        R.inventory[baseKey] = (R.inventory[baseKey] || 0) + yieldQty;
        var processVerb = gatherMini.skill === 'fishing' ? 'Descaled' : gatherMini.skill === 'woodcutting' ? 'Stripped' : 'Smelted';
        if (node.element) {
          var _ZONE_RESOURCES$node$, _ZONE_RESOURCES$node$2;
          var gemKey = 'raw_' + node.element;
          if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
          R.lifeSkills.gems[gemKey] = (R.lifeSkills.gems[gemKey] || 0) + 1;
          var gemName = ((_ZONE_RESOURCES$node$ = ZONE_RESOURCES[node.element]) === null || _ZONE_RESOURCES$node$ === void 0 ? void 0 : _ZONE_RESOURCES$node$.gem) || node.element + ' Gem';
          var gemCol = ((_ZONE_RESOURCES$node$2 = ZONE_RESOURCES[node.element]) === null || _ZONE_RESOURCES$node$2 === void 0 ? void 0 : _ZONE_RESOURCES$node$2.gemColor) || '#fff';
          S.dmgNumbers.push({
            x: node.x + 12,
            y: node.y - 42,
            text: '💎 ' + gemName + '!',
            color: gemCol,
            ts: Date.now()
          });
          BT_AUDIO.beep(900, 0.04, 0.06, 'sine');
        }
        if (Math.random() < GOLD_NUGGET_DROP.lifeSkill) {
          R.goldNuggets = (R.goldNuggets || 0) + 1;
          S.dmgNumbers.push({
            x: node.x,
            y: node.y - 55,
            text: '✨ Gold Nugget!',
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
        }
        if (Math.random() < RARE_DROP_CHANCE) {
          var rareDrop = RARE_DROP_ITEMS[Math.floor(Math.random() * RARE_DROP_ITEMS.length)];
          R.achievementPoints = (R.achievementPoints || 0) + rareDrop.points;
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.rareDropsFound++;
          S.dmgNumbers.push({
            x: node.x,
            y: node.y - 65,
            text: rareDrop.emoji + ' RARE: ' + rareDrop.name,
            color: '#f5c542',
            ts: Date.now()
          });
        }
        if (!R._compStats) R._compStats = createDefaultCompStats();
        if (gatherMini.skill === 'fishing') R._compStats.fishCaught++;else if (gatherMini.skill === 'woodcutting') R._compStats.treesFelled++;else if (gatherMini.skill === 'mining') R._compStats.oresMined++;
        /* §ENC — Material discovery */
        if (discoverMaterial(gatherMini.skill, baseName)) {
          S.dmgNumbers.push({
            x: node.x,
            y: node.y - 75,
            text: '📖 New Material Entry!',
            color: '#00d4b8',
            ts: Date.now()
          });
        }
        var xpAmt = Math.ceil((node.xp || 10) * reward.xpMult);
        var leveled = addLifeSkillXp(R.lifeSkills, gatherMini.skill, xpAmt);
        if (!R._questKills) R._questKills = {};
        Object.keys(QUEST_CHAINS).forEach(function (qid) {
          var _R$_quests;
          if (((_R$_quests = R._quests) === null || _R$_quests === void 0 ? void 0 : _R$_quests[qid]) === QUEST_STATUS.active) R._questKills[qid] = (R._questKills[qid] || 0) + 1;
        });
        var skillLabel = gatherMini.skill.charAt(0).toUpperCase() + gatherMini.skill.slice(1);
        S.dmgNumbers.push({
          x: node.x,
          y: node.y - 20,
          text: node.emoji + ' ' + baseName + (yieldQty > 1 ? ' ×' + yieldQty : ''),
          color: node.color,
          ts: Date.now()
        });
        S.dmgNumbers.push({
          x: node.x,
          y: node.y - 52,
          text: '+' + xpAmt + ' ' + skillLabel + ' XP',
          color: '#00d4b8',
          ts: Date.now()
        });
        if (leveled) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 50,
            text: node.emoji + ' ' + skillLabel + ' Level ' + R.lifeSkills[gatherMini.skill].level + '!',
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.collect();
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
      setGatherMini(null);
    },
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      e.target.click();
    },
    style: {
      marginTop: 8,
      padding: '10px 24px',
      background: '#3dd497',
      color: '#000',
      border: 'none',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 800,
      cursor: 'pointer',
      width: '100%',
      fontFamily: 'Atkinson Hyperlegible,sans-serif',
      letterSpacing: '.05em'
    }
  }, "\u26A1 STRIKE!")), "e.preventDefault();", function (_R$lifeSkills5, _R$lifeSkills6) {
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
          text: '🔥 ' + best.name + '!',
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

    /* ── FROZEN SHORE actions ── */
    if (zElem === 'frost') {
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
            text: '⛄ Snowman placed!',
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
            text: '🛷 SLED!',
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
              text: '🚣 Raft built! You can cross water.',
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
              text: '🔥 Torch lit! (2min)',
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
      background: 'rgba(10,8,20,.95)',
      borderTop: '1px solid rgba(255,255,255,.08)',
      display: 'flex',
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
            text: '🪤 Escaped!',
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
          text: '🪤 Captured ' + pet.name + '!',
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
          text: '🪤 Trapping Lv' + sk.trapping.level + '!',
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
  }())), showInfo && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 80,
      right: 10,
      zIndex: 40,
      padding: '10px 16px',
      borderRadius: 10,
      background: 'rgba(10,8,20,.95)',
      border: '1px solid rgba(255,255,255,.12)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-player-dot"
  }), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#3dd497'
    }
  }, playerCount, " online"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: stateRef.current._realtimeStatus === 'connected' ? '#3dd497' : '#ef4444',
      marginLeft: 4
    }
  }, stateRef.current._realtimeStatus === 'connected' ? '●' : '○')), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      BT_AUDIO.muted = !BT_AUDIO.muted;
      setPlayerCount(function (c) {
        return c;
      });
    },
    style: {
      padding: '6px 12px',
      borderRadius: 6,
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.12)',
      color: '#fff',
      fontSize: 11,
      cursor: 'pointer',
      width: '100%'
    }
  }, BT_AUDIO.muted ? '🔇 Unmute' : '🔊 Mute'), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return setShowInfo(false);
    },
    style: {
      marginTop: 6,
      padding: '4px 10px',
      borderRadius: 5,
      background: 'rgba(255,255,255,.04)',
      border: 'none',
      color: 'rgba(255,255,255,.4)',
      fontSize: 9,
      cursor: 'pointer',
      width: '100%'
    }
  }, "Close")), function (_stateRef$current61) {
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
        fontFamily: 'Atkinson Hyperlegible,sans-serif'
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
  }(), stateRef.current._isDesktop && /*#__PURE__*/React.createElement("div", {
    className: "bt-kb-hints"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "WASD"), " Move"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "LMB"), " Attack"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "RMB"), " Special"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Space"), " Dodge"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "E"), " Interact"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Q"), " Shield"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Tab"), " Swap"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Esc"), " Close")), /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-zone",
    style: {
      position: 'fixed',
      bottom: 88,
      left: isLandscape ? 90 : 50,
      zIndex: 30,
      width: isLandscape ? 130 : 110,
      height: isLandscape ? 130 : 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-base",
    ref: joystickRef,
    style: {
      width: isLandscape ? 120 : 100,
      height: isLandscape ? 120 : 100,
      position: 'relative',
      overflow: 'hidden'
    }
  }, function (_stateRef$current62) {
    var R = (_stateRef$current62 = stateRef.current) === null || _stateRef$current62 === void 0 ? void 0 : _stateRef$current62.rpg;
    if (!R) return null;
    var hp = R.hp,
      maxHp = R.maxHp,
      deficit = maxHp - hp;
    var hpPct = Math.max(0, hp / maxHp);
    var sz = isLandscape ? 120 : 100;
    var filledColor = hpPct > 0.5 ? 'rgba(50,180,100,.45)' : hpPct > 0.25 ? 'rgba(200,160,40,.45)' : 'rgba(220,50,50,.45)';
    var emptyColor = 'rgba(0,0,0,.35)';
    /* Conic gradient: filled portion then empty portion, starting from top */
    var deg = Math.round(hpPct * 360);
    var bg = "conic-gradient(from 0deg at 50% 50%, ".concat(filledColor, " 0deg, ").concat(filledColor, " ").concat(deg, "deg, ").concat(emptyColor, " ").concat(deg, "deg, ").concat(emptyColor, " 360deg)");
    return React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: bg,
        mask: 'radial-gradient(circle,transparent 38%,black 39%)',
        WebkitMask: 'radial-gradient(circle,transparent 38%,black 39%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'rotate(-90deg)' /* start from 12 o'clock */
      }
    });
  }(), function (_stateRef$current63) {
    var R = (_stateRef$current63 = stateRef.current) === null || _stateRef$current63 === void 0 ? void 0 : _stateRef$current63.rpg;
    if (!R) return null;
    var hp = R.hp,
      maxHp = R.maxHp,
      deficit = maxHp - hp;
    return React.createElement('div', {
      style: {
        position: 'absolute',
        top: 6,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: 1,
        zIndex: 2
      }
    }, React.createElement('div', {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(255,255,255,.6)',
        letterSpacing: '.5px'
      }
    }, 'HP'), React.createElement('div', {
      style: {
        fontSize: 12,
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,.8)'
      }
    }, hp), deficit > 0 && React.createElement('div', {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,200,200,.7)',
        textShadow: '0 1px 2px rgba(0,0,0,.8)'
      }
    }, '-' + deficit));
  }(), /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-knob",
    ref: knobRef,
    style: {
      zIndex: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bt-desktop-hide",
    style: {
      position: 'fixed',
      bottom: 88,
      right: isLandscape ? 140 : 90,
      zIndex: 30,
      width: isLandscape ? 130 : 110,
      height: isLandscape ? 130 : 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: rJoyRef,
    style: {
      width: isLandscape ? 120 : 100,
      height: isLandscape ? 120 : 100,
      borderRadius: '50%',
      border: '3px solid ' + (autoAttack ? 'rgba(255,100,100,.6)' : 'rgba(180,40,40,.25)'),
      background: autoAttack ? 'radial-gradient(circle,rgba(160,30,30,.5) 0%,rgba(80,15,15,.3) 100%)' : 'radial-gradient(circle,rgba(60,30,30,.35) 0%,rgba(30,15,15,.25) 100%)',
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      boxShadow: autoAttack ? '0 0 15px rgba(255,60,60,.3)' : 'none',
      touchAction: 'none',
      overflow: 'hidden'
    }
  }, function (_stateRef$current64) {
    var R = (_stateRef$current64 = stateRef.current) === null || _stateRef$current64 === void 0 ? void 0 : _stateRef$current64.rpg;
    if (!R) return null;
    var mana = R.mana || 0,
      maxMana = R.maxMana || 100;
    var pct = Math.max(0, mana / maxMana);
    var filledColor = pct > 0.5 ? 'rgba(40,100,220,.4)' : pct > 0.25 ? 'rgba(180,120,40,.4)' : 'rgba(220,50,50,.4)';
    var emptyColor = 'rgba(0,0,0,.3)';
    var deg = Math.round(pct * 360);
    return React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: "conic-gradient(from 0deg at 50% 50%, ".concat(filledColor, " 0deg, ").concat(filledColor, " ").concat(deg, "deg, ").concat(emptyColor, " ").concat(deg, "deg, ").concat(emptyColor, " 360deg)"),
        mask: 'radial-gradient(circle,transparent 30%,black 31%)',
        WebkitMask: 'radial-gradient(circle,transparent 30%,black 31%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'rotate(-90deg)'
      }
    });
  }(), /*#__PURE__*/React.createElement("svg", {
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
  }()), function (_stateRef$current66) {
    var R = (_stateRef$current66 = stateRef.current) === null || _stateRef$current66 === void 0 ? void 0 : _stateRef$current66.rpg;
    if (!R) return null;
    var mana = Math.floor(R.mana || 0),
      maxMana = R.maxMana || 100,
      deficit = maxMana - mana;
    return React.createElement('div', {
      style: {
        position: 'absolute',
        top: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: 1,
        zIndex: 2
      }
    }, React.createElement('div', {
      style: {
        fontSize: 6,
        fontWeight: 700,
        color: 'rgba(255,255,255,.55)',
        letterSpacing: '.5px'
      }
    }, 'MANA'), React.createElement('div', {
      style: {
        fontSize: 11,
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,.8)'
      }
    }, mana), deficit > 0 && React.createElement('div', {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(180,200,255,.6)',
        textShadow: '0 1px 2px rgba(0,0,0,.8)'
      }
    }, '-' + Math.ceil(deficit)));
  }(), /*#__PURE__*/React.createElement("div", {
    ref: rKnobRef,
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: isLandscape ? 38 : 32,
      height: isLandscape ? 38 : 32,
      borderRadius: '50%',
      background: function (_stateRef$current67, _ELEMENTS$elem) {
        var wpn = (_stateRef$current67 = stateRef.current) !== null && _stateRef$current67 !== void 0 && _stateRef$current67.rpg ? getActiveWeapon(stateRef.current.rpg) : null;
        var elem = wpn === null || wpn === void 0 ? void 0 : wpn.element1;
        var col = elem ? (_ELEMENTS$elem = ELEMENTS[elem]) === null || _ELEMENTS$elem === void 0 ? void 0 : _ELEMENTS$elem.color : 'rgba(200,60,60,1)';
        return autoAttack ? "radial-gradient(circle,".concat(col, "cc 0%,").concat(col, "88 100%)") : "radial-gradient(circle,".concat(col, "66 0%,").concat(col, "44 100%)");
      }(),
      border: '2px solid rgba(255,255,255,.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontSize: 14,
      pointerEvents: 'none',
      lineHeight: 1
    }
  }, function (_stateRef$current68) {
    var slot = ((_stateRef$current68 = stateRef.current) === null || _stateRef$current68 === void 0 || (_stateRef$current68 = _stateRef$current68.rpg) === null || _stateRef$current68 === void 0 ? void 0 : _stateRef$current68.activeSlot) || 'melee';
    return slot === 'ranged' ? '🏹' : slot === 'staff' ? '🪄' : '⚔️';
  }()))), /*#__PURE__*/React.createElement("div", {
    ref: shieldJoyRef,
    className: "bt-desktop-hide",
    style: {
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
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 6,
      color: '#fff',
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
      fontFamily: 'Atkinson Hyperlegible,sans-serif'
    }
  }, "Send")));
};
}
