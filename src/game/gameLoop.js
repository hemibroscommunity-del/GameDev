/* ═══ GAME LOOP — Canvas rendering + simulation ═══ */
/* Bulk extracted from index.html lines 11448-22244 */
/* This is the main useEffect body that runs the game loop. */
/* It receives all closure dependencies as a context object. */

/* Import all game data via barrel — avoids needing to track which export lives in which file */
import * as DATA from "@/data/index.js";
import { IMAGE_ZONE_MAPS } from "@/rendering/tiledMaps.js";

/* Destructure the most commonly used symbols for convenience */
const {
  TILE, PLAYER_COLORS, FARM_PLOT_MAX, WELL_RESTED_DURATION, WELL_RESTED_XP_MULT, HOUSE_SLEEP_MS,
  ZONES, ELEMENTS, TOWN_BUILDINGS,
  FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS, DEPTH_CONFIG, spawnGatherNodes, canAccessDepth,
  spawnWeaponHitFX, spawnElementStatusFX, getElementDeathFX, getCollisionDeathFX, TOWN_EXITS,
  ZONE_RESOURCES, GEM_DROP_RATES, GOLD_NUGGET_DROP, createDefaultCompStats, skillXpRequired, DEPTH_TIERS,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, RARITY_TIERS,
  STATUS_DEFS, ARCHETYPES, COLLISION_TABLE, BT_AUDIO, BT_ACHIEVEMENTS,
  TILE_SOLID, TILE_COLORS, NPC_DATA, BUILDINGS, SPEED, ANIM_LERP,
  SAFE_ZONE_RADIUS, RESPAWN_INVULN, RESPAWN_BASE, RESPAWN_ESCALATE,
  RESPAWN_ESCALATE_WINDOW, RESPAWN_MAX, DEATH_SCATTER_RECOVERY, DEATH_GOLD_PENALTY,
  WEAPON_STASH_MAX,
  COLS, ROWS, TOWN_W, TOWN_H, updateZoneDimensions,
  STAT_POINTS_PER_LEVEL, LEVEL_CAP, GEAR_STAT_REQ,
  REFORGE_BONUSES, GEM_CUT_TIERS, COOKING_RECIPES,
  EMOTES, TEXT_EMOTES, MKT_CATEGORIES,
  PET_EVOLUTION_TIERS, FURNITURE_RECIPES,
  DUNGEON_TERRAIN_PACKS, DUNGEON_MONSTER_PACKS,
  MASKS, ELEMENTAL_MINIGAMES, MINIGAME_REWARDS,
  QUEST_CHAINS, QUEST_STATUS, CLAN_COLORS, CLAN_CREATE_COST,
  CLAN_MAX_MEMBERS, CLAN_LOGO_SIZE, REPUTATION,
  createMonster, createDefaultRpg, createDefaultLifeSkills, migrateLifeSkills,
  recalcDerived, getActiveWeapon, calcWeaponDmg, calcCritChance, calcCritMult,
  calcMoveSpeed, calcMaxHp, calcMaxStam, calcMaxMana, calcBlockReduction,
  xpRequired, monsterStat,
  applyStatus, tickStatuses, getOldestStatusElement,
  lookupCollision, resolveCollision, getEffectiveness,
  getTileColor, generateZoneMap, spawnMonstersForZone,
  drawMask, getStatVisuals,
  awardSkillXp, addResource, getResource,
  evaluateMinigame, createMinigameInstance, createPet,
  rollReforgeBonus, hardenChance,
  getShieldBonus, getShieldStats, getAmuletBonus,
  getDungeonCreatorUnlocks, validateCustomDungeon,
  hasUnlock, getNpcQuest,
  checkAnniversaryDrop,
  discoverMonster, discoverMaterial, discoverZone, discoverCollision,
  SHOP_PRICES, SHOP_ITEMS_FOR_SALE,
  getGuildRank, getGuildQuest, GUILD_RANKS, GUILD_QUESTS, SKILL_GUILDS,
  meetsStatReq, meetsGearReq, getGearStatReq, STAT_LABELS,
  SWIM_SPEED_MULT, SLED_WOOD_COST, SLED_SPEED_MULT, SLED_DURATION,
  SNOWBALL_DMG_BASE, SNOWBALL_STUN_MS, SNOWBALL_CD, SNOWBALL_RANGE, SNOWBALL_SPEED,
  SNOWMAN_AGGRO_RADIUS, SNOWMAN_DURATION, SNOWMAN_SNOW_COST,
  TIDE_CYCLE_MS, RAFT_WOOD_COST, RAFT_WATER_SPEED,
  TORCH_WOOD_COST, TORCH_DURATION, TORCH_RADIUS_BASE, DARKNESS_RADIUS, ECHO_AGGRO_MULT,
  GAMBLE_WIN_CHANCE, GAMBLE_MIN_BET, GAMBLE_MAX_BET,
  RARE_DROP_CHANCE, RARE_DROP_ITEMS, QUEST_AP_REWARD,
  SALVAGE_RETURN_RATE, GEM_EXTRACT_BASE_COST,
  THREAT_BASE_DURATION, THREAT_PER_LEVEL_DIFF, THREAT_COOLDOWN,
  GUARD_CONFISCATION_TIME, GUARD_GOLD_LEVY,
  DIVE_MAX_AIR, DIVE_AIR_DRAIN, DIVE_AIR_REFILL, DIVE_DAMAGE_RATE,
  ARENA_ENTRY_FEE, ARENA_WIN_REWARD, ARENA_POLL_INTERVAL,
  flavorName, AMULET_TIERS, AMULET_GEM_STATS, SHIELD_GEM_STATS,
  NUGGETS_PER_BAR, RESOURCE_TIERS, LIFE_SKILLS, ELEMENT_FLAVOR,
  FEEDBACK_CATEGORIES, FEEDBACK_TOPICS,
  ANNIVERSARY_ITEMS, ARENA_BET_MIN, ARENA_BET_MAX,
  MINIGAME_DURATION, MINIGAME_MIN_PLAYERS, MINIGAME_MAX_PLAYERS, MINIGAME_ENTRY_FEE,
  JACKPOT_HOUSE_CUT, JACKPOT_MIN_DEPOSIT,
  getSalvageReturns, getAmuletSalvageReturns, gemExtractCost,
  addLifeSkillXp,
  flavorSpotName,
  hasDungeonClear, getMaxDepth,
} = DATA;

import { syncRpgToServer, wsrvUrl, btRpc, getBtPlayerId, getBtPassphrase } from "@/networking/index.js";
/* Rendering — PixiJS renderer is initialized externally and passed via ctx */
/* import { renderFrame } from "@/rendering/canvasRenderer.js"; // REPLACED BY PIXI */

/* Babel helper polyfills */
function _slicedToArray(r, e) { if (Array.isArray(r)) return r; if (Symbol.iterator in Object(r)) { const a = []; let f = true; const t = r[Symbol.iterator](); for (let n; !(f = (n = t.next()).done) && (a.push(n.value), a.length !== e); f = true); return a; } }
function _toConsumableArray(r) { return Array.isArray(r) ? [...r] : Array.from(r); }
function _typeof(o) { return typeof o; }

/**
 * Sets up the game loop. Called from a useEffect in BroTown.
 * @param {Object} ctx - All closure dependencies from the React component
 * @returns {Function} cleanup function
 */
export function setupGameLoop(ctx) {
  const {
    canvasRef, stateRef, frameRef, nfts, wrapRef, pixiRenderer,
    setRpgState, setChatLog, setNearBuilding, setPlayerCount,
    setCollectScore, setCollectMsg, setMyBadges, setAchievementMsg,
    setLevelUpMsg, setBuildingPanel, setQuestPanel, setGatherMini,
    setFerrymanPanel, setFenceClimbing, setJoinFlash,
    setMinigameInstance, setMinigameScore, setMinigameTick,
    setAnniversaryDrop, setArenaBets, setArenaStatus, setArenaTournament,
    setDuelRequest, setThreatIncoming, setIncomingTrade,
    setCampfires, setPlayerList, setClanData,
    showNameModal, showLogin,
  } = ctx;

  /* ── Original useEffect body begins ── */
    if (showNameModal || showLogin) return;
    var canvas = canvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    /* Polyfill roundRect for game canvas */
    ctx.roundRect = function (x, y, w, h, r) {
      var radii = typeof r === 'number' ? [r, r, r, r] : Array.isArray(r) ? r.concat([0, 0, 0, 0]).slice(0, 4) : [0, 0, 0, 0];
      this.moveTo(x + radii[0], y);
      this.lineTo(x + w - radii[1], y);
      this.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
      this.lineTo(x + w, y + h - radii[2]);
      this.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
      this.lineTo(x + radii[3], y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
      this.lineTo(x, y + radii[0]);
      this.quadraticCurveTo(x, y, x + radii[0], y);
      this.closePath();
    };
    var S = stateRef.current;

    if (!S.map) {
      updateZoneDimensions(S.currentZone);
      S.map = generateZoneMap(S.currentZone);
      /* §11 Start zone ambient sound */
      BT_AUDIO.startZoneAmbient(S.currentZone);
      /* Spawn monsters for current zone */
      var zone = ZONES[S.currentZone];
      if(!S._serverMonsters) S.monsters = spawnMonstersForZone(zone);
      /* Spawn gathering nodes */
      S.gatherNodes = spawnGatherNodes(S.currentZone, 'shallow');
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
          S.rpg.unspentT2 = 5 + Math.floor(earnedPts / 2);
          recalcDerived(S.rpg);
        }
      }
      if (!S.rpg.inventory) S.rpg.inventory = {};
      if (!S.rpg.lifeSkills) S.rpg.lifeSkills = createDefaultLifeSkills();
      /* Migrate old saves — adds new skills, converts gathering → mining */
      S.rpg.lifeSkills = migrateLifeSkills(S.rpg.lifeSkills);
      if (!S.rpg._quests) S.rpg._quests = {};
      if (!S.rpg._questFlags) S.rpg._questFlags = {};
      if (!S.rpg._questKills) S.rpg._questKills = {};
      if (S.rpg.influence === undefined) S.rpg.influence = 0;
      if (S.rpg.power === undefined) S.rpg.power = 0;
      if (!S.rpg.weapon) S.rpg.weapon = {
        type: 'greatsword',
        tier: 'fusion',
        tierMult: 2.25,
        element1: 'flame',
        element2: 'frost',
        name: 'Emberice Greatsword',
        isVolatile: true
      };
      if (!S.rpg.rangedWeapon) S.rpg.rangedWeapon = {
        type: 'bow',
        tier: 'elemental',
        tierMult: 1.5,
        element1: 'venom',
        element2: null,
        name: 'Venom Bow',
        isVolatile: false
      };
      if (!S.rpg.staffWeapon) S.rpg.staffWeapon = {
        type: 'staff',
        tier: 'elemental',
        tierMult: 1.5,
        element1: 'storm',
        element2: null,
        name: 'Storm Staff',
        isVolatile: false
      };
      if (!S.rpg.activeSlot) S.rpg.activeSlot = 'melee';
      if (!S.rpg.armor) S.rpg.armor = {
        tier: 'common',
        tierMult: 1.0,
        attunement: null,
        name: 'Leather Armor'
      };
      if (S.rpg.shield === undefined) S.rpg.shield = null;
      if (!S.rpg.amulet) S.rpg.amulet = null; /* {tier, gem, name} */
      if (!S.rpg.shield) S.rpg.shield = null; /* {gearBase, gem, name, reforgeBonus, hardenBonus} */
      if (S.rpg.goldNuggets === undefined) S.rpg.goldNuggets = 0;
      if (S.rpg.goldBars === undefined) S.rpg.goldBars = 0;
      if (S.rpg.achievementPoints === undefined) S.rpg.achievementPoints = 0;
      if (!S.rpg._threatState) S.rpg._threatState = null; /* {target, ts, type:'red'|'white', expires} */
      if (!S.rpg._threatCooldownUntil) S.rpg._threatCooldownUntil = 0;
      if (!S.rpg._guardConfiscateUntil) S.rpg._guardConfiscateUntil = 0;
      if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
      if (!S.rpg._deathTimestamps) S.rpg._deathTimestamps = [];
      if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
      if (S.rpg.achievementPoints === undefined) S.rpg.achievementPoints = 0;
      S.rpg.hp = Math.min(S.rpg.hp || S.rpg.maxHp, S.rpg.maxHp);
      S.rpg.stamina = S.rpg.stamina || S.rpg.maxStamina;
      S.rpg.mana = S.rpg.mana || S.rpg.maxMana;
      S.respawnTimer = Date.now();

      /* Legacy compat properties — some UI/render code still reads these */
      S.rpg.str = S.rpg.power;
      S.rpg.def = S.rpg.fortification;
      S.rpg.vit = S.rpg.vitality;
      S.rpg.spd = S.rpg.agility;
      S.rpg.lck = S.rpg.ferocity;
      S.rpg.maxHp = S.rpg.maxHp;
      S.rpg.unspentPts = S.rpg.unspentT1 + S.rpg.unspentT2;
      setRpgState(_objectSpread({}, S.rpg));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
      } catch (e) {}
      discoverZone('town'); /* §ENC — Everyone starts in town */

      /* §ANNIV — Check for anniversary item drop */
      var annivDrop = checkAnniversaryDrop(S.rpg);
      if (annivDrop) {
        setAnniversaryDrop(annivDrop);
      }

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
    /* Initialize NPCs — only in town */
    if (!S.npcs && S.currentZone === 'town') {
      S.npcs = NPC_DATA.map(function (npc, i) {
        return _objectSpread(_objectSpread({}, npc), {}, {
          id: 'npc-' + i,
          hp: 30,
          maxHp: 30,
          alive: true,
          respawnAt: 0,
          x: npc.spawnX,
          y: npc.spawnY,
          targetX: npc.spawnX,
          targetY: npc.spawnY,
          moveTimer: Math.random() * 3000,
          chatTimer: 5000 + Math.random() * 10000,
          chatBubble: null,
          /* {text, ts} */
          dir: 'down',
          _facing: 'down',
          renderX: npc.spawnX,
          renderY: npc.spawnY
        });
      });
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
    var resize = function resize() {
      var _canvas$parentElement;
      var dpr = window.devicePixelRatio || 1;
      var rect = ((_canvas$parentElement = canvas.parentElement) === null || _canvas$parentElement === void 0 ? void 0 : _canvas$parentElement.getBoundingClientRect()) || {
        width: 0,
        height: 0
      };
      /* Fallback to window dimensions if parent has no size yet */
      var w = rect.width || window.innerWidth || 800;
      var h = rect.height || window.innerHeight || 600;
      if (w < 10 || h < 10) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      if (ctx) ctx.setTransform(dpr * 0.8, 0, 0, dpr * 0.8, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    /* Also resize when flex container changes (keyboard open/close) */
    var resizeObs;
    if (window.ResizeObserver && canvas.parentElement) {
      resizeObs = new ResizeObserver(resize);
      resizeObs.observe(canvas.parentElement);
    }
    var vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', resize);
    }
    var isSolid = function isSolid(px, py) {
      var _S$map;
      var zone = ZONES[S.currentZone];
      var tx = Math.floor(px / TILE),
        ty = Math.floor(py / TILE);
      if (tx < 0 || tx >= zone.w || ty < 0 || ty >= zone.h) return true;
      /* Explicit per-zone walkability grid (e.g. town's painted yellow
         footprints) takes precedence over the procedural tile check.
         The grid uses its OWN resolution (64x64 currently) — scale
         world pixels into grid cells via the grid dimensions instead
         of the zone tile size, so the generator can change resolution
         without touching this lookup. */
      var _wgrid = (S._tiledWalkable && S._tiledWalkable[S.currentZone]) || null;
      if (_wgrid && _wgrid.length) {
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
         walkable when no explicit grid exists. */
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
        var _S$map$Math$floor$Mat, _S$map2, _S$rpg5, _ZONES$S$currentZone3, _S$rpg7, _S$rpg8, _S$rpg11, _S$_atkEnergy, _ZONES$S$currentZone8, _S$rpg17, _S$rpg19, _S$rpg20, _S$rpg21, _S$rpg24, _ZONES$S$currentZone12;
        /* Ensure canvas has dimensions */
        if (canvas.width === 0 || canvas.height === 0) {
          resize();
          return;
        }

        /* §6 Candy Crush Principle — Hit Stop: freeze simulation for N ms on big hits */
        if (S._hitStop && Date.now() < S._hitStop) {
          /* During hit stop, render the frozen frame with impact flash — no simulation */
          var hitAge = 1 - (S._hitStop - Date.now()) / (S._hitStopDuration || 60);
          /* White flash overlay — bright at start, fades during freeze */
          if (hitAge < 0.5) {
            ctx.fillStyle = "rgba(255,255,255,".concat((0.5 - hitAge) * 0.25, ")");
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          /* Chromatic aberration-style color split on the frozen frame */
          if (hitAge < 0.3 && S._hitStopDuration > 60) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(2, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(-2, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
          }
          return;
        }
        /* Viewport zoom factor — controls how much world is visible per
           CSS pixel.  Was 1.25 (game showed 25% more world, world
           rendered at scale=0.8).  That sub-pixel scale caused walking
           shimmer/stutter as the camera glided fractionally; world art
           snapped or shimmered depending on filter mode.  At 1.0 the
           world renders at native scale (1 world px = 1 CSS px), so
           there's no sub-pixel resampling and motion is smooth.  Side
           effect: game is more zoomed in (visible area is ~20% smaller
           than before). */
        var W = canvas.width / (window.devicePixelRatio || 1) * 1.0;
        var H = canvas.height / (window.devicePixelRatio || 1) * 1.0;
        var P = S.player;
        var K = S.keys;

        /* Re-initialize NPCs when entering town (they get nulled on zone transitions) */
        if (!S.npcs && S.currentZone === 'town') {
          S.npcs = NPC_DATA.map(function (npc, i) {
            return _objectSpread(_objectSpread({}, npc), {}, {
              id: 'npc-' + i,
              hp: 30,
              maxHp: 30,
              alive: true,
              respawnAt: 0,
              x: npc.spawnX,
              y: npc.spawnY,
              targetX: npc.spawnX,
              targetY: npc.spawnY,
              moveTimer: Math.random() * 3000,
              chatTimer: 5000 + Math.random() * 10000,
              chatBubble: null,
              dir: 'down',
              _facing: 'down',
              renderX: npc.spawnX,
              renderY: npc.spawnY
            });
          });
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

        /* Check if player is stunned */
        var playerStunned = S._playerStunUntil && Date.now() < S._playerStunUntil;

        /* Movement — analog joystick + keyboard fallback */
        /* Dodge roll */
        if (S._dodgeRoll) {
          var rollAge = Date.now() - S._dodgeRoll.startTime;
          if (rollAge < 200) {
            S.player.x += Math.cos(S._dodgeRoll.angle) * 6;
            S.player.y += Math.sin(S._dodgeRoll.angle) * 6;
          } else S._dodgeRoll = null;
        }
        var dx = playerStunned ? 0 : S.stickX,
          dy = playerStunned ? 0 : S.stickY;
        /* Keyboard overrides if no stick input */
        if (dx === 0 && dy === 0) {
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
        /* Direction for name tag / facing */
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
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

        /* Frost zone: walking on sand (snow drifts) collects snow */
        if ((curZone === null || curZone === void 0 ? void 0 : curZone.element) === 'frost' && footTile === 6 && S.rpg) {
          if (!S._lastSnowCollect || Date.now() - S._lastSnowCollect > 2000) {
            S._lastSnowCollect = Date.now();
            if (!S.rpg.inventory) S.rpg.inventory = {};
            S.rpg.inventory.snow = (S.rpg.inventory.snow || 0) + 1;
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 20,
              text: '❄️+1 snow',
              color: '#a0d8f0',
              ts: Date.now()
            });
          }
        }

        /* Agility-based movement speed */
        var baseSpd = S.rpg ? calcMoveSpeed(S.rpg.agility || 0) / 5.0 * SPEED : SPEED;
        /* Food buff speed bonus */
        var spdBuff = S._spdBuff && Date.now() < S._spdBuff ? 1.15 : 1.0;
        /* Amulet move speed bonus */
        var amuletSpdMult = ((_S$rpg5 = S.rpg) === null || _S$rpg5 === void 0 || (_S$rpg5 = _S$rpg5._amuletBonus) === null || _S$rpg5 === void 0 ? void 0 : _S$rpg5.stat) === 'moveSpd' ? 1 + S.rpg._amuletBonus.value / 100 : 1.0;
        var swimMult = S._swimming ? SWIM_SPEED_MULT : 1.0;
        var finalSpd = S._sled ? 0 : baseSpd * terrainMult * spdBuff * amuletSpdMult * swimMult; /* sled overrides movement */

        var nx = P.x + dx * finalSpd;
        var ny = P.y + dy * finalSpd;

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
              text: '💤 Resting... (3s)',
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
                text: '✨ Fully Rested!',
                color: '#3dd497',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 25,
                text: '🌟 +10% XP for 30 min',
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
        if (!isSolid(nx - hs, P.y - hs) && !isSolid(nx + hs, P.y - hs) && !isSolid(nx - hs, P.y + hs) && !isSolid(nx + hs, P.y + hs)) P.x = nx;
        if (!isSolid(P.x - hs, ny - hs) && !isSolid(P.x + hs, ny - hs) && !isSolid(P.x - hs, ny + hs) && !isSolid(P.x + hs, ny + hs)) P.y = ny;
        /* Apply ice slide */
        if (S._slideVx || S._slideVy) {
          var sx = P.x + (S._slideVx || 0),
            sy = P.y + (S._slideVy || 0);
          if (!isSolid(sx - hs, P.y - hs) && !isSolid(sx + hs, P.y + hs)) P.x = sx;
          if (!isSolid(P.x - hs, sy - hs) && !isSolid(P.x + hs, sy + hs)) P.y = sy;
        }
        var _zone = ZONES[S.currentZone];
        var ZONE_W = _zone.w * TILE,
          ZONE_H = _zone.h * TILE;
        P.x = Math.max(hs, Math.min(ZONE_W - hs, P.x));
        P.y = Math.max(hs, Math.min(ZONE_H - hs, P.y));

        /* ═══ ZONE TRANSITION — edge-based detection ═══ */
        var ptx = Math.floor(P.x / TILE),
          pty = Math.floor(P.y / TILE);

        /* In town: reaching any edge finds the nearest exit and transitions */
        if (S.currentZone === 'town' && (pty <= 0 || pty >= _zone.h - 1 || ptx <= 0 || ptx >= _zone.w - 1)) {
          /* Find closest town exit to player position */
          var bestExit = null,
            bestDist = Infinity;
          TOWN_EXITS.forEach(function (ex) {
            var edgeMatch = false;
            if (ex.dir === 'north' && pty <= 0) edgeMatch = true;
            if (ex.dir === 'south' && pty >= _zone.h - 1) edgeMatch = true;
            if (ex.dir === 'east' && ptx >= _zone.w - 1) edgeMatch = true;
            if (ex.dir === 'west' && ptx <= 0) edgeMatch = true;
            if (!edgeMatch) return;
            var d = ex.dir === 'north' || ex.dir === 'south' ? Math.abs(ptx - ex.tx) : Math.abs(pty - ex.ty);
            if (d < bestDist) {
              bestDist = d;
              bestExit = ex;
            }
          });
          if (bestExit) {
            /* Zone exits — open to all players (quest gate removed) */
            {
              S.currentZone = bestExit.zoneId;
              updateZoneDimensions(bestExit.zoneId);
              BT_AUDIO.startZoneAmbient(bestExit.zoneId);
              discoverZone(bestExit.zoneId); /* §ENC — Encyclopedia zone discovery */
              if (S.rpg) {
                if (!S.rpg._questFlags) S.rpg._questFlags = {};
                if (!S.rpg._questFlags.zonesVisited || _typeof(S.rpg._questFlags.zonesVisited) !== 'object') S.rpg._questFlags.zonesVisited = {};
                /* Fix broken Set from old save data */
                if (S.rpg._questFlags.zonesVisited instanceof Set) {
                  var old = S.rpg._questFlags.zonesVisited;
                  S.rpg._questFlags.zonesVisited = {};
                  old.forEach(function (v) {
                    return S.rpg._questFlags.zonesVisited[v] = true;
                  });
                }
                if (typeof S.rpg._questFlags.zonesVisited.add === 'function') S.rpg._questFlags.zonesVisited = {}; /* nuclear fallback */
                S.rpg._questFlags.zonesVisited[bestExit.zoneId] = true;
              }
              /* ═══ ZONE ENTRY — always start at shallow depth ═══ */
              /* Players always enter the first zone layer. Dungeons warp to deeper depths. */
              /* This preserves the sense of progression — you walk through the shallow zone */
              /* to reach the dungeon entrance, which then takes you to your deepest unlocked depth. */
              var entryDepth = 'shallow';
              S._currentDepth = entryDepth;
              S.map = generateZoneMap(bestExit.zoneId);
              var newZone = ZONES[bestExit.zoneId];
              /* Monsters + nodes at shallow depth */
              var depthCfg = DEPTH_CONFIG[entryDepth];
              if(!S._serverMonsters) S.monsters = spawnMonstersForZone(newZone, (depthCfg === null || depthCfg === void 0 ? void 0 : depthCfg.levelMod) || 0);
              S.gatherNodes = spawnGatherNodes(bestExit.zoneId, entryDepth);
              var nW = newZone.w * TILE,
                nH = newZone.h * TILE;
              /* Always enter from the south (single entrance) */
              P.x = Math.floor(newZone.w / 2) * TILE;
              P.y = nH - TILE * 3;
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: newZone.name,
                color: newZone.element ? ELEMENTS[newZone.element].color : '#fff',
                ts: Date.now()
              });
              S.npcs = null;
              S.groundLoot = [];
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              /* §5.5 Restore death-scattered items if returning to death zone */
              if (S._deathDrops) {
                var zoneDrops = S._deathDrops.filter(function (d) {
                  return d.zone === bestExit.zoneId && Date.now() < d.expiry;
                });
                zoneDrops.forEach(function (dd) {
                  S.groundLoot.push({
                    x: dd.x,
                    y: dd.y,
                    ts: Date.now(),
                    isDeathDrop: true,
                    deathItems: dd.items,
                    coins: 0,
                    xp: 0,
                    expiry: dd.expiry
                  });
                });
                /* Remove expired drops */
                S._deathDrops = S._deathDrops.filter(function (d) {
                  return Date.now() < d.expiry && d.zone !== bestExit.zoneId;
                });
              }
              S._zoneWipe = Date.now(); /* trigger transition wipe */
              S._ambientParticles = []; /* clear old zone particles */
            } /* end zone transition */
          }
        } else if (S.currentZone !== 'town' && !S._inDungeon) {
          /* In combat zones: only south entrance returns to town */
          var czZone = ZONES[S.currentZone];
          var czPtx = Math.floor(P.x / TILE),
            czPty = Math.floor(P.y / TILE);
          var czMX = Math.floor(czZone.w / 2);
          /* Check if player is at the south edge near the entrance gap */
          if (czPty >= czZone.h - 1 && Math.abs(czPtx - czMX) <= 2) {
            S.currentZone = 'town';
            updateZoneDimensions('town');
            BT_AUDIO.startZoneAmbient('town');
            S.map = generateZoneMap('town');
            S.monsters = []; /* Town has no monsters */
            P.x = 16 * TILE;
            P.y = 16 * TILE;
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 40,
              text: 'Town',
              color: '#5b52ff',
              ts: Date.now()
            });
            S.npcs = null;
            S.groundLoot = [];
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S._zoneWipe = Date.now();
            S._ambientParticles = [];
          }
        }

        /* Dungeon entrance — tile 10 */
        if (S.map && ptx >= 0 && pty >= 0 && pty < _zone.h && ptx < _zone.w) {
          var _S$map$pty;
          var tile = (_S$map$pty = S.map[pty]) === null || _S$map$pty === void 0 ? void 0 : _S$map$pty[ptx];
          if (tile === 10 && S.currentZone !== 'town' && !S._inDungeon) {
            var _S$rpg6;
            /* §14.1 Dungeon entrance — find deepest accessible depth */
            var currentDepth = S._currentDepth || 'shallow';
            var depthOrder = ['shallow', 'mid', 'deep', 'abyss', 'core'];
            var currentIdx = depthOrder.indexOf(currentDepth);
            var clearKey = S.currentZone + '_' + currentDepth;
            var isCleared = (_S$rpg6 = S.rpg) === null || _S$rpg6 === void 0 || (_S$rpg6 = _S$rpg6.lifeSkills) === null || _S$rpg6 === void 0 || (_S$rpg6 = _S$rpg6.dungeonClears) === null || _S$rpg6 === void 0 ? void 0 : _S$rpg6[clearKey];
            if (currentIdx >= depthOrder.length - 1 && isCleared) {
              /* Core is cleared — zone fully done */
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 30,
                text: 'Zone fully cleared!',
                color: '#3dd497',
                ts: Date.now()
              });
            } else if (isCleared) {
              var _ELEMENTS$zn$element;
              /* Current depth already cleared — warp to next depth zone (skip dungeon) */
              var nextDepth = depthOrder[currentIdx + 1];
              S._currentDepth = nextDepth;
              var dc = DEPTH_CONFIG[nextDepth];
              var zn = ZONES[S.currentZone];
              S.map = generateZoneMap(S.currentZone);
              if(!S._serverMonsters) S.monsters = spawnMonstersForZone(zn, (dc === null || dc === void 0 ? void 0 : dc.levelMod) || 0);
              S.gatherNodes = spawnGatherNodes(S.currentZone, nextDepth);
              P.x = zn.w / 2 * TILE;
              P.y = (zn.h - 3) * TILE;
              S.groundLoot = [];
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S._ambientParticles = [];
              S._zoneWipe = Date.now();
              var lvlRange = dc.lvlRange || [1, 10];
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: zn.name + ' — ' + nextDepth.toUpperCase(),
                color: ((_ELEMENTS$zn$element = ELEMENTS[zn.element]) === null || _ELEMENTS$zn$element === void 0 ? void 0 : _ELEMENTS$zn$element.color) || '#fff',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 25,
                text: 'Lv ' + lvlRange[0] + '-' + lvlRange[1],
                color: 'rgba(255,255,255,.5)',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            } else {
              /* Current depth NOT cleared — enter dungeon fight! */
              var nextDepthMap = {
                shallow: 'mid',
                mid: 'deep',
                deep: 'abyss',
                abyss: 'core'
              };
              var _nextDepth = nextDepthMap[currentDepth];
              /* Enter dungeon! */
              S._inDungeon = true;
              S._dungeonZone = S.currentZone;
              S._dungeonDepth = currentDepth;
              S._dungeonWave = 0;
              S._dungeonMaxWaves = 3 + DEPTH_CONFIG[_nextDepth].depthIdx;
              S._dungeonBossSpawned = false;
              S._dungeonComplete = false;
              S._preDungeonPos = {
                x: P.x,
                y: P.y
              };

              /* Generate small dungeon arena */
              var dW = 25,
                dH = 20;
              S._preDungeonMap = S.map;
              S._preDungeonMonsters = S.monsters;
              S._preDungeonNodes = S.gatherNodes;
              var dMap = Array.from({
                length: dH
              }, function () {
                return Array(dW).fill(0);
              });
              /* Walls around edge */
              for (var x = 0; x < dW; x++) {
                dMap[0][x] = 7;
                dMap[dH - 1][x] = 7;
              }
              for (var y = 0; y < dH; y++) {
                dMap[y][0] = 7;
                dMap[y][dW - 1] = 7;
              }
              /* Path cross */
              var dMX = Math.floor(dW / 2),
                dMY = Math.floor(dH / 2);
              for (var _x17 = 1; _x17 < dW - 1; _x17++) dMap[dMY][_x17] = 1;
              for (var _y15 = 1; _y15 < dH - 1; _y15++) dMap[_y15][dMX] = 1;
              S.map = dMap;
              /* Add exit tile at bottom of dungeon (tile 9 = return) */
              dMap[dH - 1][dMX] = 9;
              dMap[dH - 1][dMX + 1] = 9;
              TOWN_W = dW * TILE;
              TOWN_H = dH * TILE;
              COLS = dW;
              ROWS = dH;
              S.monsters = [];
              S.gatherNodes = [];
              S.groundLoot = [];
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              P.x = dMX * TILE;
              P.y = (dH - 3) * TILE;

              /* Spawn first wave */
              var _zone2 = ZONES[S.currentZone];
              var _dc = DEPTH_CONFIG[_nextDepth];
              var waveLvl = _zone2.level[0] + _dc.levelMod;
              var waveArchs = ['fodder', 'swarm', 'brute', 'sentinel', 'volatile', 'hexer', 'stalker'];
              for (var wi = 0; wi < 4 + S._dungeonWave; wi++) {
                var _arch = waveArchs[Math.floor(Math.random() * waveArchs.length)];
                var mx = (3 + Math.random() * (dW - 6)) * TILE;
                var my = (2 + Math.random() * (dH / 2 - 2)) * TILE;
                var m = createMonster('dw-0-' + wi, _arch, waveLvl + Math.floor(Math.random() * 5), mx, my, _zone2.element);
                m.curHp = m.hp;
                m.type = _arch;
                S.monsters.push(m);
              }
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: '⚔️ DUNGEON: Wave 1/' + S._dungeonMaxWaves,
                color: '#ff5e6c',
                ts: Date.now()
              });
              BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
              setTimeout(function () {
                return BT_AUDIO.beep(150, 0.2, 0.25, 'sawtooth');
              }, 100);
            }
          }
        }

        /* ═══ DUNGEON EXIT — tile 9 in dungeon returns to zone ═══ */
        if (S._inDungeon && S.map && ptx >= 0 && pty >= 0) {
          var _S$map$pty2;
          var dTile = (_S$map$pty2 = S.map[pty]) === null || _S$map$pty2 === void 0 ? void 0 : _S$map$pty2[ptx];
          if (dTile === 9) {
            /* Exit dungeon — return to combat zone at current depth */
            S._inDungeon = false;
            S._dungeonComplete = false;
            var _zn = ZONES[S._dungeonZone || S.currentZone];
            var depth = S._currentDepth || 'shallow';
            S.map = generateZoneMap(S.currentZone);
            var _dc2 = DEPTH_CONFIG[depth];
            TOWN_W = _zn.w * TILE;
            TOWN_H = _zn.h * TILE;
            COLS = _zn.w;
            ROWS = _zn.h;
            if(!S._serverMonsters) S.monsters = spawnMonstersForZone(_zn, (_dc2 === null || _dc2 === void 0 ? void 0 : _dc2.levelMod) || 0);
            S.gatherNodes = spawnGatherNodes(S.currentZone, depth);
            S.groundLoot = [];
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S._ambientParticles = [];
            /* Spawn near dungeon entrance (north end of zone) */
            P.x = Math.floor(_zn.w / 2) * TILE;
            P.y = TILE * 5;
            S._zoneWipe = Date.now();
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: 'Exited dungeon',
              color: '#3dd497',
              ts: Date.now()
            });
            BT_AUDIO.beep(500, 0.05, 0.06, 'sine');
          }
        }

        /* ═══ WASTELAND — gate tile (12) fence climbing ═══ */
        if (S.map && S.currentZone === 'wasteland' && ptx >= 0 && pty >= 0 && pty < _zone.h && ptx < _zone.w) {
          var _S$map$pty3;
          var gateTile = (_S$map$pty3 = S.map[pty]) === null || _S$map$pty3 === void 0 ? void 0 : _S$map$pty3[ptx];
          if (gateTile === 12) {
            /* Player is on a gate tile — start climbing if not already */
            if (!S._fenceClimb) {
              var safePad = ZONES.wasteland._safePad;
              /* Determine direction: if player is inside safe pad, climbing OUT. Otherwise climbing IN. */
              var inSafe = safePad && P.x >= safePad.x && P.x <= safePad.x + safePad.w && P.y >= safePad.y - TILE && P.y <= safePad.y + safePad.h;
              S._fenceClimb = {
                started: Date.now(),
                duration: 2000,
                direction: inSafe ? 'out' : 'in'
              };
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 30,
                text: '🧗 Climbing fence... (2s)',
                color: '#f5c542',
                ts: Date.now()
              });
              BT_AUDIO.beep(300, 0.06, 0.08, 'triangle');
            }
          } else {
            /* Not on gate tile — cancel climb */
            if (S._fenceClimb) {
              S._fenceClimb = null;
            }
          }
        } else if (S._fenceClimb && S.currentZone !== 'wasteland') {
          S._fenceClimb = null;
        }

        /* Fence climb progress — complete after 2 seconds */
        if (S._fenceClimb) {
          var elapsed = Date.now() - S._fenceClimb.started;
          if (elapsed >= S._fenceClimb.duration) {
            /* Climb complete! */
            if (S._fenceClimb.direction === 'out') {
              /* Climbing OUT of safe zone — now in lawless area */
              var gateY = ZONES.wasteland._gateY;
              P.y = gateY - TILE; /* place just north of fence */
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 30,
                text: '☠️ LAWLESS ZONE — All items at risk!',
                color: '#ff5e6c',
                ts: Date.now()
              });
              S.screenShake = 4;
              BT_AUDIO.beep(80, 0.2, 0.25, 'sawtooth');
            } else {
              /* Climbing IN to safe zone — safe now */
              var _safePad = ZONES.wasteland._safePad;
              P.y = _safePad.y + TILE; /* place inside safe pad */
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 30,
                text: '🏠 Safe zone! Walk south to return to town.',
                color: '#3dd497',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            }
            S._fenceClimb = null;
          }
          /* Cancel climb if player takes damage */
          if (S._fenceClimb && S.lastDamageTaken > S._fenceClimb.started) {
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: 'Climb interrupted!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            S._fenceClimb = null;
          }
        }

        /* ═══ ZONE-SPECIFIC MECHANICS ═══ */
        var zoneElem2 = (_ZONES$S$currentZone3 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone3 === void 0 ? void 0 : _ZONES$S$currentZone3.element;

        /* ── FROZEN SHORE: Snowball projectiles ── */
        if (S._snowballs && S._snowballs.length > 0) {
          S._snowballs = S._snowballs.filter(function (sb) {
            sb.x += sb.vx;
            sb.y += sb.vy;
            var age = Date.now() - sb.ts;
            if (age > 2000) return false; /* despawn after 2s */
            /* Hit detection against monsters */
            if (S.monsters) {
              var _iterator = _createForOfIteratorHelper(S.monsters),
                _step;
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  var _m = _step.value;
                  if (!_m.alive) continue;
                  var d = Math.sqrt(Math.pow(sb.x - _m.x, 2) + Math.pow(sb.y - _m.y, 2));
                  if (d < 20) {
                    var _R4;
                    if (_m._invulnerable) {
                      S.dmgNumbers.push({
                        x: _m.x,
                        y: _m.y - 20,
                        text: 'IMMUNE',
                        color: '#888',
                        ts: Date.now()
                      });
                      return false;
                    }
                    var dmg = SNOWBALL_DMG_BASE + (((_R4 = R) === null || _R4 === void 0 ? void 0 : _R4.power) || 0) * 0.3;
                    _m.curHp -= dmg;
                    _m._stunUntil = Date.now() + SNOWBALL_STUN_MS;
                    S.dmgNumbers.push({
                      x: _m.x,
                      y: _m.y - 20,
                      text: '❄️' + Math.round(dmg),
                      color: '#a0d8f0',
                      ts: Date.now()
                    });
                    S.hitParticles.push({
                      x: sb.x,
                      y: sb.y,
                      vx: 0,
                      vy: -2,
                      life: 0.5,
                      color: '#fff',
                      size: 3
                    });
                    for (var sp = 0; sp < 6; sp++) S.hitParticles.push({
                      x: sb.x,
                      y: sb.y,
                      vx: (Math.random() - .5) * 4,
                      vy: (Math.random() - .5) * 4,
                      life: 0.4,
                      color: '#cce8ff',
                      size: 1.5
                    });
                    BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
                    return false;
                  }
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
            }
            return true;
          });
        }

        /* ── FROZEN SHORE: Snowman decoy — draws aggro ── */
        if (S._snowmen && S._snowmen.length > 0) {
          S._snowmen = S._snowmen.filter(function (sm) {
            if (Date.now() - sm.ts > SNOWMAN_DURATION) return false;
            if (sm.hp <= 0) {
              S.dmgNumbers.push({
                x: sm.x,
                y: sm.y - 20,
                text: '⛄ Melted!',
                color: '#a0d8f0',
                ts: Date.now()
              });
              for (var sp = 0; sp < 10; sp++) S.hitParticles.push({
                x: sm.x,
                y: sm.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 3,
                life: 0.6,
                color: '#fff',
                size: 2
              });
              return false;
            }
            /* Snowman draws aggro — monsters within radius target it instead of player */
            if (S.monsters) {
              S.monsters.forEach(function (m) {
                if (!m.alive) return;
                var d = Math.sqrt(Math.pow(sm.x - m.x, 2) + Math.pow(sm.y - m.y, 2));
                if (d < SNOWMAN_AGGRO_RADIUS && d < Math.sqrt(Math.pow(P.x - m.x, 2) + Math.pow(P.y - m.y, 2))) {
                  /* Monster targets snowman instead */
                  var _dx21 = sm.x - m.x,
                    _dy20 = sm.y - m.y,
                    dist = Math.sqrt(_dx21 * _dx21 + _dy20 * _dy20) || 1;
                  m.x += _dx21 / dist * m.spd * 0.5;
                  m.y += _dy20 / dist * m.spd * 0.5;
                  if (d < 18) {
                    sm.hp -= m.dmg * 0.5;
                    m._atkCd = Date.now();
                  }
                }
              });
            }
            return true;
          });
        }

        /* ── FROZEN SHORE: Sled ride — fast movement in direction ── */
        if (S._sled && S.currentZone === 'frost') {
          var sledElapsed = Date.now() - S._sled.started;
          if (sledElapsed < SLED_DURATION) {
            P.x += Math.cos(S._sled.angle) * S._sled.speed;
            P.y += Math.sin(S._sled.angle) * S._sled.speed;
            /* Sled hits monsters for damage */
            if (S.monsters) {
              S.monsters.forEach(function (m) {
                if (!m.alive) return;
                var d = Math.sqrt(Math.pow(P.x - m.x, 2) + Math.pow(P.y - m.y, 2));
                if (d < 25 && !m._sledHit) {
                  var _R5;
                  m._sledHit = true;
                  var sledDmg = Math.ceil(20 + (((_R5 = R) === null || _R5 === void 0 ? void 0 : _R5.power) || 0) * 0.5);
                  m.curHp -= sledDmg;
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: '🛷' + sledDmg,
                    color: '#60a5fa',
                    ts: Date.now()
                  });
                  S.screenShake = 3;
                  BT_AUDIO.beep(300, 0.08, 0.1, 'triangle');
                }
              });
            }
            /* Trail particles */
            S.hitParticles.push({
              x: P.x - Math.cos(S._sled.angle) * 10,
              y: P.y - Math.sin(S._sled.angle) * 10,
              vx: (Math.random() - .5) * 2,
              vy: -1,
              life: 0.3,
              color: '#cce8ff',
              size: 2
            });
          } else {
            S._sled = null;
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: '🛷 Sled stopped',
              color: '#a0d8f0',
              ts: Date.now()
            });
            /* Clear sled hit flags */
            if (S.monsters) S.monsters.forEach(function (m) {
              m._sledHit = false;
            });
          }
        }

        /* ── TIDAL CAVES: Tide level oscillation ── */
        if (S.currentZone === 'tidal') {
          var _S$map$pty4;
          var tidePhase = Date.now() % TIDE_CYCLE_MS / TIDE_CYCLE_MS; /* 0-1 */
          S._tideLevel = Math.sin(tidePhase * Math.PI * 2) * 0.5 + 0.5; /* 0=low, 1=high */
          /* At high tide, water tiles expand — check if player is in water */
          var onWater = S.map && ((_S$map$pty4 = S.map[pty]) === null || _S$map$pty4 === void 0 ? void 0 : _S$map$pty4[ptx]) === 2;
          if (onWater && !S._raft) {
            /* Swimming — slow movement */
            S._swimming = true;

            /* §DIVE — Underwater diving with air meter */
            if (S._diveAir === undefined) S._diveAir = DIVE_MAX_AIR;
            S._diveAir = Math.max(0, S._diveAir - DIVE_AIR_DRAIN);

            /* Drowning damage when out of air */
            if (S._diveAir <= 0 && S.rpg) {
              if (!S._lastDrownTick || Date.now() - S._lastDrownTick > 1000) {
                S._lastDrownTick = Date.now();
                S.rpg.hp -= DIVE_DAMAGE_RATE;
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 20,
                  text: '🫧 -' + DIVE_DAMAGE_RATE + ' (drowning!)',
                  color: '#3498DB',
                  ts: Date.now()
                });
                if (S.rpg.hp <= 0) {
                  S.rpg.hp = 0;
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 40,
                    text: '💀 Drowned!',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
              }
            }

            /* Underwater treasure discovery */
            if (S._diveAir > 0 && Math.random() < DIVE_TREASURE_CHANCE) {
              var treasureGold = 10 + Math.floor(Math.random() * 40);
              S.rpg.coins += treasureGold;
              if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += treasureGold;
              S.dmgNumbers.push({
                x: P.x + Math.random() * 30 - 15,
                y: P.y - 30,
                text: '🏴‍☠️ +' + treasureGold + 'G treasure!',
                color: '#f5c542',
                ts: Date.now()
              });
              BT_AUDIO.collect();
              if (!S.stats._diveTreasures) S.stats._diveTreasures = 0;
              S.stats._diveTreasures++;
            }

            /* Track dive stats */
            if (!S.stats._diveCount) S.stats._diveCount = 0;
            if (!S._diveStarted) {
              S._diveStarted = true;
              S.stats._diveCount++;
            }
          } else {
            S._swimming = false;
            S._diveStarted = false;
            /* Refill air at surface */
            if (S._diveAir !== undefined && S._diveAir < DIVE_MAX_AIR) {
              S._diveAir = Math.min(DIVE_MAX_AIR, S._diveAir + DIVE_AIR_REFILL);
            }
          }
        } else {
          S._tideLevel = 0;
          S._swimming = false;
          S._diveAir = DIVE_MAX_AIR;
        }

        /* ── DEEP HOLLOWS: Torch timer ── */
        if (S._torch && Date.now() - S._torch.started > TORCH_DURATION) {
          S._torch = null;
          S.dmgNumbers.push({
            x: P.x,
            y: P.y - 30,
            text: '🔥 Torch burned out!',
            color: '#ea580c',
            ts: Date.now()
          });
          BT_AUDIO.beep(200, 0.08, 0.1, 'triangle');
        }

        /* ── DEEP HOLLOWS: Echo mechanic — combat noise increases aggro range ── */
        if (S.currentZone === 'hollows' && S.autoAttack) {
          S._echoActive = true; /* flag checked in monster aggro */
        } else {
          S._echoActive = false;
        }

        /* §14.1 Dungeon wave progression */
        if (S._inDungeon && !S._dungeonComplete) {
          var allDead = S.monsters.every(function (m) {
            return !m.alive;
          });
          if (allDead && S.monsters.length > 0) {
            S._dungeonWave++;
            if (S._dungeonWave >= S._dungeonMaxWaves && !S._dungeonBossSpawned) {
              /* ═══ BOSS WAVE ═══ */
              S._dungeonBossSpawned = true;
              var _dW = S.map[0].length,
                _dH = S.map.length;
              if (S._inCustomDungeon && S._customDungeonConfig) {
                /* §DNG — Custom dungeon boss */
                var cfg = S._customDungeonConfig;
                if (cfg.hasBoss) {
                  var bossArch = cfg.bossArchetype || 'brute';
                  var boss = createMonster('cboss-0', bossArch, cfg.monsterLevel + 5, Math.floor(_dW / 2) * TILE, Math.floor(_dH / 3) * TILE, cfg.element);
                  boss.hp *= cfg.bossMultiplier || 4;
                  boss.maxHp = boss.hp;
                  boss.curHp = boss.hp;
                  boss.dmg = Math.ceil(boss.dmg * 1.5);
                  boss.emoji = '🐉';
                  boss.color = '#ff5e6c';
                  boss._isBoss = true;
                  boss._bossSize = 2.0;
                  boss._invulnerable = true;
                  boss._attackPhase = 'idle';
                  boss._phaseTimer = Date.now() + 2000;
                  boss._attackPattern = 0;
                  boss._bossAbilities = ['slam', 'charge'];
                  if (cfg.monsterLevel >= 20) boss._bossAbilities.push('summon');
                  if (cfg.monsterLevel >= 40) boss._bossAbilities.push('sweep');
                  boss._nextAbility = Date.now() + 3000;
                  boss._abilityInterval = 4000;
                  S.monsters = [boss];
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 50,
                    text: '🐉 BOSS FIGHT!',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                  BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
                  S.screenShake = 8;
                } else {
                  /* No boss — dungeon complete */
                  S._dungeonComplete = true;
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 50,
                    text: '🏆 DUNGEON CLEARED!',
                    color: '#f5c542',
                    ts: Date.now()
                  });
                  var bonusGold = 20 * cfg.waves;
                  var bonusXp = 50 * cfg.waves;
                  S.rpg.coins += bonusGold;
                  S.rpg.xp += bonusXp;
                  if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += bonusGold;
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 35,
                    text: '+' + bonusGold + 'G +' + bonusXp + 'XP',
                    color: '#f5c542',
                    ts: Date.now()
                  });
                  BT_AUDIO.levelUp();
                  S.screenShake = 6;
                  setTimeout(function () {
                    var st = stateRef.current;
                    st._inDungeon = false;
                    st._inCustomDungeon = false;
                    st._customDungeonConfig = null;
                    st.currentZone = 'farm_home';
                    updateZoneDimensions('farm_home');
                    st.map = generateZoneMap('farm_home');
                    var fz = ZONES.farm_home;
                    TOWN_W = fz.w * TILE;
                    TOWN_H = fz.h * TILE;
                    COLS = fz.w;
                    ROWS = fz.h;
                    st.monsters = [];
                    st.gatherNodes = [];
                    st.groundLoot = [];
                    st.hitParticles = [];
                    st.deathExplosions = [];
                    st.arrows = [];
                    st.player.x = Math.floor(fz.w / 2) * TILE;
                    st.player.y = (fz.h - 4) * TILE;
                    st._zoneWipe = Date.now();
                  }, 3000);
                }
              } else {
                /* Standard dungeon boss */
                var _zone3 = ZONES[S._dungeonZone];
                var _nextDepth2 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _dc3 = DEPTH_CONFIG[_nextDepth2];
                var bossLvl = _zone3.level[0] + _dc3.levelMod + 10;
                var _boss = createMonster('boss-0', 'brute', bossLvl, Math.floor(_dW / 2) * TILE, Math.floor(_dH / 3) * TILE, _zone3.element);
                _boss.hp *= 8;
                _boss.maxHp = _boss.hp;
                _boss.curHp = _boss.hp;
                _boss.dmg = Math.ceil(_boss.dmg * 2);
                _boss.emoji = '🐉';
                _boss.color = '#ff5e6c';
                _boss._isBoss = true;
                _boss._bossSize = 2.5;
                _boss._invulnerable = true;
                _boss._attackPhase = 'idle';
                _boss._phaseTimer = Date.now() + 2000;
                _boss._attackPattern = 0;
                var depthIdx = _dc3.depthIdx || 0;
                _boss._bossAbilities = ['slam', 'charge'];
                if (depthIdx >= 1) _boss._bossAbilities.push('summon');
                if (depthIdx >= 2) _boss._bossAbilities.push('sweep');
                if (depthIdx >= 3) _boss._bossAbilities.push('enrage');
                _boss._nextAbility = Date.now() + 3000;
                _boss._abilityInterval = Math.max(3000, 6000 - depthIdx * 800);
                S.monsters = [_boss];
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 50,
                  text: '🐉 BOSS FIGHT!',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 35,
                  text: 'Dodge attacks to expose weakness!',
                  color: '#fbbf24',
                  ts: Date.now()
                });
                BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
                setTimeout(function () {
                  return BT_AUDIO.beep(80, 0.3, 0.35, 'sawtooth');
                }, 150);
                S.screenShake = 8;
              }
            } else if (S._dungeonBossSpawned) {
              /* Boss killed — dungeon complete! */
              S._dungeonComplete = true;
              if (S._inCustomDungeon) {
                /* §DNG — Custom dungeon complete with boss */
                var _cfg = S._customDungeonConfig;
                var _bonusGold = 30 * ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.waves) || 3) + ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.monsterLevel) || 1) * 2;
                var _bonusXp = 80 * ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.waves) || 3) + ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.monsterLevel) || 1) * 5;
                S.rpg.coins += _bonusGold;
                S.rpg.xp += _bonusXp;
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 60,
                  text: '🏆 DUNGEON CLEARED!',
                  color: '#f5c542',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 45,
                  text: '+' + _bonusGold + 'G +' + _bonusXp + 'XP',
                  color: '#f5c542',
                  ts: Date.now()
                });
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.dungeonsCleared++;
                S.rpg._compStats.totalGoldEarned += _bonusGold;
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                setTimeout(function () {
                  var st = stateRef.current;
                  st._inDungeon = false;
                  st._inCustomDungeon = false;
                  st._customDungeonConfig = null;
                  st.currentZone = 'farm_home';
                  updateZoneDimensions('farm_home');
                  st.map = generateZoneMap('farm_home');
                  var fz = ZONES.farm_home;
                  TOWN_W = fz.w * TILE;
                  TOWN_H = fz.h * TILE;
                  COLS = fz.w;
                  ROWS = fz.h;
                  st.monsters = [];
                  st.gatherNodes = [];
                  st.groundLoot = [];
                  st.hitParticles = [];
                  st.deathExplosions = [];
                  st.arrows = [];
                  st.player.x = Math.floor(fz.w / 2) * TILE;
                  st.player.y = (fz.h - 4) * TILE;
                  st._zoneWipe = Date.now();
                }, 3000);
              } else {
                var _DEPTH_CONFIG$_nextDe, _DEPTH_CONFIG$_nextDe2;
                var _nextDepth3 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _clearKey = S._dungeonZone + '_' + S._dungeonDepth;
                if (!S.rpg.lifeSkills.dungeonClears) S.rpg.lifeSkills.dungeonClears = {};
                S.rpg.lifeSkills.dungeonClears[_clearKey] = true;
                /* Bonus rewards */
                var _bonusGold2 = 100 * (((_DEPTH_CONFIG$_nextDe = DEPTH_CONFIG[_nextDepth3]) === null || _DEPTH_CONFIG$_nextDe === void 0 ? void 0 : _DEPTH_CONFIG$_nextDe.depthIdx) || 1);
                var _bonusXp2 = 200 * (((_DEPTH_CONFIG$_nextDe2 = DEPTH_CONFIG[_nextDepth3]) === null || _DEPTH_CONFIG$_nextDe2 === void 0 ? void 0 : _DEPTH_CONFIG$_nextDe2.depthIdx) || 1);
                S.rpg.coins += _bonusGold2;
                S.rpg.xp += _bonusXp2;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += _bonusGold2;
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 60,
                  text: '🏆 DUNGEON CLEARED!',
                  color: '#f5c542',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 45,
                  text: '+' + _bonusGold2 + 'G +' + _bonusXp2 + 'XP',
                  color: '#f5c542',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 30,
                  text: _nextDepth3.toUpperCase() + ' depth unlocked!',
                  color: '#a855f7',
                  ts: Date.now()
                });
                /* ═══ SHADOW/RADIANT CONVERGENCE — clearing core unlocks endgame zones ═══ */
                if (_nextDepth3 === 'core' || S._dungeonDepth === 'core') {
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 15,
                    text: '✦ Shadow & Radiant zones revealed!',
                    color: '#F1C40F',
                    ts: Date.now()
                  });
                  if (!S.rpg._questFlags) S.rpg._questFlags = {};
                  S.rpg._questFlags.endgameUnlocked = true;
                }
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                /* Return to zone at NEXT depth after 3 seconds */
                setTimeout(function () {
                  var _ELEMENTS$zn$element2;
                  var st = stateRef.current;
                  st._inDungeon = false;
                  var zn = ZONES[st._dungeonZone];
                  st._currentDepth = _nextDepth3;
                  /* Generate fresh zone at the new deeper depth */
                  st.map = generateZoneMap(st._dungeonZone);
                  var dc = DEPTH_CONFIG[_nextDepth3];
                  TOWN_W = zn.w * TILE;
                  TOWN_H = zn.h * TILE;
                  COLS = zn.w;
                  ROWS = zn.h;
                  st.monsters = spawnMonstersForZone(zn, (dc === null || dc === void 0 ? void 0 : dc.levelMod) || 0);
                  st.gatherNodes = spawnGatherNodes(st._dungeonZone, _nextDepth3);
                  st.groundLoot = [];
                  st.hitParticles = [];
                  st.deathExplosions = [];
                  st.arrows = [];
                  st._ambientParticles = [];
                  /* Spawn player at center of new depth zone */
                  st.player.x = zn.w / 2 * TILE;
                  st.player.y = (zn.h - 3) * TILE;
                  st._zoneWipe = Date.now();
                  var lvlRange = dc.lvlRange || [1, 10];
                  st.dmgNumbers.push({
                    x: st.player.x,
                    y: st.player.y - 40,
                    text: zn.name + ' — ' + _nextDepth3.toUpperCase(),
                    color: ((_ELEMENTS$zn$element2 = ELEMENTS[zn.element]) === null || _ELEMENTS$zn$element2 === void 0 ? void 0 : _ELEMENTS$zn$element2.color) || '#fff',
                    ts: Date.now()
                  });
                  st.dmgNumbers.push({
                    x: st.player.x,
                    y: st.player.y - 25,
                    text: 'Lv ' + lvlRange[0] + '-' + lvlRange[1],
                    color: 'rgba(255,255,255,.5)',
                    ts: Date.now()
                  });
                }, 3000);
              } /* end standard dungeon completion */
            } else if (S._dungeonWave < S._dungeonMaxWaves) {
              /* Spawn next wave */
              var _dW2 = S.map[0].length,
                _dH2 = S.map.length;
              if (S._inCustomDungeon && S._customDungeonConfig) {
                /* §DNG — Custom dungeon wave */
                var _cfg2 = S._customDungeonConfig;
                var _waveArchs = _cfg2.monsters || [{
                  archetype: 'fodder',
                  count: 4,
                  element: null
                }];
                _waveArchs.forEach(function (mg, gi) {
                  for (var _wi = 0; _wi < mg.count; _wi++) {
                    var _mx = (3 + Math.random() * (_dW2 - 6)) * TILE;
                    var _my = (2 + Math.random() * (_dH2 / 2 - 2)) * TILE;
                    var _m2 = createMonster('cdw-' + S._dungeonWave + '-' + gi + '-' + _wi, mg.archetype, _cfg2.monsterLevel + Math.floor(Math.random() * 3), _mx, _my, _cfg2.element || mg.element);
                    _m2.curHp = _m2.hp;
                    _m2.type = mg.archetype;
                    S.monsters.push(_m2);
                  }
                });
              } else {
                /* Standard dungeon wave */
                var _zone4 = ZONES[S._dungeonZone];
                var _nextDepth4 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _dc4 = DEPTH_CONFIG[_nextDepth4];
                var _waveLvl = _zone4.level[0] + _dc4.levelMod + S._dungeonWave * 2;
                var _waveArchs2 = ['fodder', 'swarm', 'brute', 'sentinel', 'volatile', 'hexer', 'stalker'];
                var waveSize = 4 + S._dungeonWave + Math.floor(Math.random() * 2);
                for (var _wi2 = 0; _wi2 < waveSize; _wi2++) {
                  var _arch2 = _waveArchs2[Math.floor(Math.random() * _waveArchs2.length)];
                  var _mx2 = (3 + Math.random() * (_dW2 - 6)) * TILE;
                  var _my2 = (2 + Math.random() * (_dH2 / 2 - 2)) * TILE;
                  var _m3 = createMonster('dw-' + S._dungeonWave + '-' + _wi2, _arch2, _waveLvl, _mx2, _my2, _zone4.element);
                  _m3.curHp = _m3.hp;
                  _m3.type = _arch2;
                  S.monsters.push(_m3);
                }
              }
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: '⚔️ Wave ' + (S._dungeonWave + 1) + '/' + S._dungeonMaxWaves,
                color: '#ff5e6c',
                ts: Date.now()
              });
              BT_AUDIO.beep(300, 0.1, 0.15, 'sawtooth');
              S.screenShake = 4;
            }
          }
        }

        /* Check building proximity (town only) */
        var pTileX = Math.floor(P.x / TILE);
        var pTileY = Math.floor(P.y / TILE);
        var nearBldg = null;
        if (S.currentZone === 'town') {
          for (var i = 0; i < BUILDINGS.length; i++) {
            var b = BUILDINGS[i];
            /* Check if player is within 2 tiles of building edge */
            if (pTileX >= b.bx - 2 && pTileX <= b.bx + b.bw + 1 && pTileY >= b.by - 2 && pTileY <= b.by + b.bh + 1) {
              nearBldg = i;
              break;
            }
          }
          S.nearBuilding = nearBldg;
        } else {
          S.nearBuilding = null;
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

        /* §MINI — Minigame Arena proximity on farm */
        if (S.currentZone === 'farm_home' && ZONES.farm_home._minigameArena) {
          var ma = ZONES.farm_home._minigameArena;
          S._nearMinigameArena = P.x >= ma.x - TILE * 2 && P.x <= ma.x + ma.w + TILE * 2 && P.y >= ma.y - TILE && P.y <= ma.y + ma.h + TILE * 2;
        } else {
          S._nearMinigameArena = false;
        }

        /* Detect nearest gatherable node */
        S._nearNode = null;
        if (S.gatherNodes) {
          var closest = 60; /* max interaction range */
          S.gatherNodes.forEach(function (n) {
            if (!n.alive || n.respawnAt && Date.now() < n.respawnAt) return;
            var nd = Math.sqrt(Math.pow(n.x - P.x, 2) + Math.pow(n.y - P.y, 2));
            if (nd < closest) {
              closest = nd;
              S._nearNode = n;
            }
          });
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
                        text: pet.emoji + ' → 🗡️' + drop.name,
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
                          text: pet.emoji + ' → 📦' + drop.name,
                          color: '#8890b8',
                          ts: Date.now()
                        });
                      } else {
                        S.rpg.coins += Math.ceil(dropPower * 0.5);
                        S.dmgNumbers.push({
                          x: S._petX,
                          y: S._petY - 15,
                          text: pet.emoji + ' → sold',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                      }
                    }
                  } else {
                    S.rpg.coins += loot.coins || 0;
                    S.dmgNumbers.push({
                      x: S._petX,
                      y: S._petY - 15,
                      text: pet.emoji + ' +' + (loot.coins || 0) + 'G',
                      color: '#f5c542',
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
                var pDmgBase = S.rpg ? calcWeaponDmg((activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.type) || 'greatsword', S.rpg.power || 0, (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.tierMult) || 1) : 5;
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
                    text: '❗ I have a task for you! Tap me.',
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
        if (S.monsters && S.rpg) {
          var _R6$_amuletBonus, _R6$_amuletBonus2, _S$rpg9;
          var _R6 = S.rpg;
          /* §2.6 Tag player with Influence for status duration scaling */
          S.player._rpgInfluence = _R6.influence || 0;
          /* §4.4 Weapon Damage — uses new stat system */
          var _activeWpn = getActiveWeapon(_R6);
          var wpnType = WEAPON_TYPES[_activeWpn.type] || WEAPON_TYPES.greatsword;
          var pDmg = calcWeaponDmg(_activeWpn.type, _R6.power, _activeWpn.tierMult);
          /* §4 Amulet bonus — elemental damage boost */
          if (((_R6$_amuletBonus = _R6._amuletBonus) === null || _R6$_amuletBonus === void 0 ? void 0 : _R6$_amuletBonus.stat) === 'elemDmg' && _activeWpn.element1) pDmg *= 1 + _R6._amuletBonus.value / 100;
          /* §18.1 Food buff — damage multiplier */
          if (S._dmgBuff && Date.now() < S._dmgBuff) pDmg *= 1.20;
          /* Hexer curse debuff — reduces damage by 30% */
          if (S._cursedUntil && Date.now() < S._cursedUntil) pDmg *= 0.7;
          /* Swarm bleed tick — damage over time */
          if (S._bleedUntil && Date.now() < S._bleedUntil) {
            if (!S._lastBleedTick || Date.now() - S._lastBleedTick > 500) {
              S._lastBleedTick = Date.now();
              var bleedDmg = S._bleedDps || 1;
              _R6.hp = Math.max(1, _R6.hp - bleedDmg);
              S.dmgNumbers.push({
                x: P.x + 8,
                y: P.y - 15,
                text: '-' + bleedDmg,
                color: '#cc3333',
                ts: Date.now()
              });
            }
          }
          /* §2.1 Crit from Ferocity */
          var critChance = calcCritChance(_R6.ferocity);
          var critMult = calcCritMult(_R6.ferocity);
          /* Staff has halved crit chance — lower DPS, higher AoE + variance */
          var isStaffEquipped = (_R6.activeSlot === 'staff');
          if (isStaffEquipped) {
            critChance *= 0.35; /* 35% of normal crit rate */
          }
          if (((_R6$_amuletBonus2 = _R6._amuletBonus) === null || _R6$_amuletBonus2 === void 0 ? void 0 : _R6$_amuletBonus2.stat) === 'critDmg') critMult += _R6._amuletBonus.value / 100;
          var invuln = Date.now() < S.respawnTimer;
          S.monsters.forEach(function (m) {
            if (!m.alive) {
              /* Server handles respawns when _serverMonsters active */
              if (S._serverMonsters) return;
              if (Date.now() > m.respawnAt) {
                m.alive = true;
                m.curHp = m.hp;
                m.statuses = {}; /* clear statuses on respawn */
                m.x = m.spawnX + (Math.random() - 0.5) * 60;
                m.y = m.spawnY + (Math.random() - 0.5) * 60;
              }
              return;
            }

            /* §9 — Tick statuses (DoT damage, expiry) */
            var expired = tickStatuses(m, 16.7 / 1000, Date.now(), _R6);

            /* ═══ ELEMENT STATUS OVERLAY — ambient particles on statused monsters ═══ */
            if (m.statuses && m.alive) {
              Object.entries(m.statuses).forEach(function (_ref13) {
                var _ref14 = _slicedToArray(_ref13, 2),
                  sid = _ref14[0],
                  st = _ref14[1];
                if (!st || !st.element) return;
                var fx = spawnElementStatusFX(m.x, m.y, st.element, Math.random());
                if (fx) S.hitParticles.push(fx);
              });
            }
            if (m._lastDotDmg && Date.now() - m._lastDotDmg.ts < 100) {
              var dot = m._lastDotDmg;
              var dotElem = Object.keys(ELEMENTS).find(function (e) {
                return ELEMENTS[e].status === dot.statusId;
              });
              var dotColor = dotElem ? ELEMENTS[dotElem].color : '#ff5e6c';
              S.dmgNumbers.push({
                x: m.x + (Math.random() - 0.5) * 10,
                y: m.y - 22,
                text: dot.amount + '',
                color: dotColor,
                ts: Date.now()
              });
              m._lastDotDmg = null;
            }
            /* Check if DoT killed */
            if (m.curHp <= 0 && m.alive) {
              /* When server monsters: server handles kill via monster_kill event — don't set alive=false locally */
              if (S._serverMonsters) {
                m.curHp = 0; /* clamp for HP bar display */
                return;
              }
              m.alive = false;
              m.respawnAt = Date.now() + 30000;
              m.statuses = {};
              /* Quest kill tracking */
              if (_R6._questKills === undefined) _R6._questKills = {};
              Object.keys(QUEST_CHAINS).forEach(function (qid) {
                var _R6$_quests;
                if (((_R6$_quests = _R6._quests) === null || _R6$_quests === void 0 ? void 0 : _R6$_quests[qid]) === QUEST_STATUS.active) _R6._questKills[qid] = (_R6._questKills[qid] || 0) + 1;
              });
              /* Death feedback */
              S.dmgNumbers.push({
                x: m.x,
                y: m.y - 30,
                text: '☠️',
                color: '#ff5e6c',
                ts: Date.now()
              });
              S.groundLoot.push({
                x: m.x,
                y: m.y,
                coins: m.gold || 2,
                xp: 0,
                skull: m.type,
                skullEmoji: '🦴',
                ts: Date.now()
              });
              S.screenShake = 3;
              /* Death particles */
              for (var dp = 0; dp < 12; dp++) {
                S.hitParticles.push({
                  x: m.x,
                  y: m.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6 - 2,
                  life: 1,
                  color: m.color,
                  size: 1.5 + Math.random() * 2
                });
              }
              BT_AUDIO.deathBoom();
              setRpgState(_objectSpread({}, _R6));
            }

            /* Skip if stunned */
            if (m._stunUntil && Date.now() < m._stunUntil) return;

            /* Status-based movement modifiers */
            /* When server monsters are active, skip ALL local AI — server handles movement, aggro, attacks, respawns */
            if (S._serverMonsters) {
              /* Only run render interpolation — smooth monster position toward server position */
              if (m.renderX === undefined) { m.renderX = m.x; m.renderY = m.y; }
              var mInterpDx = m.x - m.renderX;
              var mInterpDy = m.y - m.renderY;
              var mInterpDist = Math.sqrt(mInterpDx * mInterpDx + mInterpDy * mInterpDy);
              if (mInterpDist > 80) { m.renderX = m.x; m.renderY = m.y; }
              else if (mInterpDist > 0.5) {
                var mStep = Math.min(mInterpDist, 3.0);
                m.renderX += (mInterpDx / mInterpDist) * mStep;
                m.renderY += (mInterpDy / mInterpDist) * mStep;
              }
              return; /* skip all local AI below */
            }
            var moveMult = 1.0;
            if (m.statuses.freeze) moveMult = 0; /* frozen = can't move */
            if (m.statuses.root) moveMult = 0; /* rooted = can't move */
            if (m.statuses.slow) moveMult *= 0.4; /* slowed */
            /* Kill slowmo — everything moves at 30% speed during kill dilation */
            if (S._killSlowmo && Date.now() - S._killSlowmo < (S._killSlowmoDuration || 200)) {
              moveMult *= 0.3;
            } else if (S._killSlowmo) {
              S._killSlowmo = null; /* expired */
            }
            /* Legacy compat for old _frozen/_slowed flags */
            if (m._frozen && Date.now() < m._frozen) moveMult = 0;
            if (m._slowed && Date.now() < m._slowed) moveMult *= 0.3;

            /* ═══ ARCHETYPE AI — §Creative Vision §9: Alive, Not Artificial ═══ */
            var distToP = Math.sqrt(Math.pow(m.x - P.x, 2) + Math.pow(m.y - P.y, 2));
            var arch = m.archetype || 'fodder';

            /* Aggro range varies by archetype */
            var aggroRange = {
              fodder: 100,
              brute: 90,
              swarm: 130,
              sentinel: 80,
              volatile: 110,
              stalker: 160,
              hexer: 140
            }[arch] || 120;
            /* Deep Hollows echo — combat noise doubles aggro range */
            if (S._echoActive) aggroRange *= ECHO_AGGRO_MULT;
            var atkRange = arch === 'hexer' ? 60 : arch === 'stalker' ? 30 : 18;
            var atkCooldown = {
              fodder: 1500,
              brute: 2200,
              swarm: 800,
              sentinel: 1800,
              volatile: 1200,
              stalker: 1000,
              hexer: 2500
            }[arch] || 1500;
            if (distToP < aggroRange && moveMult > 0) {
              /* ═══ AGGRO ALERT — "!" flash when enemy first notices player ═══ */
              if (!m._aggroed) {
                m._aggroed = true;
                m._aggroTs = Date.now();
              }
              var chDx = P.x - m.x,
                chDy = P.y - m.y;
              var chDist = Math.sqrt(chDx * chDx + chDy * chDy);

              /* Archetype-specific movement behavior */
              if (arch === 'stalker') {
                /* Stalker: circle-strafe, then dash in for quick hit */
                if (!m._stalkPhase) m._stalkPhase = 'circle';
                if (m._stalkPhase === 'circle') {
                  /* Circle the player */
                  var perpAngle = Math.atan2(chDy, chDx) + Math.PI / 2;
                  if (chDist > 40) {
                    m.x += chDx / chDist * m.spd * moveMult;
                    m.y += chDy / chDist * m.spd * moveMult;
                  } else {
                    m.x += Math.cos(perpAngle) * m.spd * moveMult * 0.8;
                    m.y += Math.sin(perpAngle) * m.spd * moveMult * 0.8;
                  }
                  if (Math.random() < 0.008) m._stalkPhase = 'dash'; /* randomly dash in */
                } else {
                  /* Dash toward player */
                  if (chDist > 15) {
                    m.x += chDx / chDist * m.spd * moveMult * 2.5;
                    m.y += chDy / chDist * m.spd * moveMult * 2.5;
                  }
                  if (chDist < 20 || Math.random() < 0.02) m._stalkPhase = 'circle';
                }
              } else if (arch === 'hexer') {
                /* Hexer: keep distance, back away if player gets close */
                var idealRange = 50;
                if (chDist < idealRange * 0.7) {
                  /* Retreat */
                  m.x -= chDx / chDist * m.spd * moveMult * 1.2;
                  m.y -= chDy / chDist * m.spd * moveMult * 1.2;
                } else if (chDist > idealRange * 1.3) {
                  /* Approach */
                  m.x += chDx / chDist * m.spd * moveMult * 0.7;
                  m.y += chDy / chDist * m.spd * moveMult * 0.7;
                }
                /* Slight side-to-side wobble */
                m.x += Math.sin(Date.now() / 500 + m.spawnX) * 0.3;
              } else if (arch === 'swarm') {
                /* Swarm: rush directly at player, fast, erratic zigzag */
                if (chDist > 12) {
                  var zigzag = Math.sin(Date.now() / 200 + m.spawnX * 10) * 0.6;
                  var moveAngle = Math.atan2(chDy, chDx) + zigzag;
                  m.x += Math.cos(moveAngle) * m.spd * moveMult;
                  m.y += Math.sin(moveAngle) * m.spd * moveMult;
                }
              } else if (arch === 'volatile') {
                /* Volatile: charge straight, explodes on contact if low HP */
                if (chDist > 12) {
                  var chargeSpd = m.curHp < m.hp * 0.3 ? m.spd * 2.0 : m.spd; /* faster when low HP */
                  m.x += chDx / chDist * chargeSpd * moveMult;
                  m.y += chDy / chDist * chargeSpd * moveMult;
                }
              } else if (arch === 'sentinel') {
                /* Sentinel: slow, deliberate, stops periodically to "wind up" attack */
                if (!m._sentinelPause) m._sentinelPause = 0;
                m._sentinelPause -= 16.7;
                if (m._sentinelPause <= 0) {
                  if (chDist > 20) {
                    m.x += chDx / chDist * m.spd * moveMult * 0.6;
                    m.y += chDy / chDist * m.spd * moveMult * 0.6;
                  }
                  if (chDist < 30 && Math.random() < 0.01) m._sentinelPause = 800; /* wind-up pause */
                }
              } else {
                /* Fodder + Brute: direct chase */
                if (chDist > 15) {
                  m.x += chDx / chDist * m.spd * moveMult;
                  m.y += chDy / chDist * m.spd * moveMult;
                }
              }

              /* ═══ BOSS ABILITIES — special attacks on cooldown ═══ */
              if (m._isBoss && m._bossAbilities && Date.now() > (m._nextAbility || 0)) {
                /* ═══ BOSS PHASE CYCLING ═══
                   idle → telegraph (1s warning) → attack → recovery (2s, VULNERABLE) → idle
                   Boss is invulnerable except during recovery phase */
                if (!m._attackPhase || m._attackPhase === 'idle') {
                  /* Start telegraph — warning indicator before attack */
                  m._attackPhase = 'telegraph';
                  m._phaseTimer = Date.now() + 1000; /* 1s telegraph */
                  var abilities = m._bossAbilities;
                  m._currentAttack = abilities[m._attackPattern % abilities.length];
                  m._attackPattern++;
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 40,
                    text: '⚠️ ' + m._currentAttack.toUpperCase() + '!',
                    color: '#fbbf24',
                    ts: Date.now()
                  });
                  BT_AUDIO.beep(400, 0.08, 0.1, 'sine');
                  /* Boss glows during telegraph */
                  m.color = '#fbbf24';
                } else if (m._attackPhase === 'telegraph' && Date.now() > m._phaseTimer) {
                  /* Execute the attack */
                  m._attackPhase = 'attack';
                  m._phaseTimer = Date.now() + 500; /* attack lasts 500ms */
                  m.color = '#ff2020';
                  var _abilities = m._bossAbilities;
                  var ability = m._currentAttack;
                  var bossAngle = Math.atan2(P.y - m.y, P.x - m.x);
                  if (ability === 'slam') {
                    var slamRange = 80;
                    S.screenShake = 10;
                    BT_AUDIO.beep(80, 0.2, 0.25, 'sawtooth');
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 30,
                      text: '💥 SLAM!',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    if (!S._impactRings) S._impactRings = [];
                    S._impactRings.push({
                      x: m.x,
                      y: m.y,
                      ts: Date.now(),
                      color: '#f5c542',
                      maxR: slamRange,
                      duration: 400
                    });
                    for (var sp = 0; sp < 20; sp++) {
                      var sa = sp / 20 * Math.PI * 2;
                      S.hitParticles.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(sa) * (2 + Math.random() * 4),
                        vy: Math.sin(sa) * (2 + Math.random() * 4),
                        life: 0.8,
                        color: '#f5c542',
                        size: 2 + Math.random() * 2
                      });
                    }
                    /* Dodging or shielding avoids damage */
                    var dodged = S._dodgeRoll;
                    var blocked = Date.now() < S.shieldEnd;
                    if (distToP < slamRange && !invuln && !dodged) {
                      var slamDmg = Math.ceil(m.dmg * 1.5);
                      var finalDmg = blocked ? Math.max(1, Math.ceil(slamDmg * 0.3)) : slamDmg;
                      _R6.hp -= finalDmg;
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 20,
                        text: blocked ? '🛡️ Blocked! -' + finalDmg : '-' + finalDmg,
                        color: '#f5c542',
                        ts: Date.now()
                      });
                      S.lastDamageTaken = Date.now();
                      S._hitFlash = Date.now();
                    } else if (distToP < slamRange && dodged) {
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 20,
                        text: '💨 Dodged!',
                        color: '#3dd497',
                        ts: Date.now()
                      });
                    }
                  }
                  if (ability === 'charge') {
                    m._chargeUntil = Date.now() + 600;
                    m._chargeAngle = bossAngle;
                    m._chargeSpeed = m.spd * 6;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 30,
                      text: '🐂 CHARGE!',
                      color: '#ea580c',
                      ts: Date.now()
                    });
                    BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
                  }
                  if (ability === 'sweep') {
                    /* Wide arc sweep — must dodge or shield */
                    var sweepRange = 70;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 30,
                      text: '🌀 SWEEP!',
                      color: '#a855f7',
                      ts: Date.now()
                    });
                    BT_AUDIO.beep(150, 0.15, 0.2, 'square');
                    S.screenShake = 6;
                    if (!S._impactRings) S._impactRings = [];
                    S._impactRings.push({
                      x: m.x,
                      y: m.y,
                      ts: Date.now(),
                      color: '#a855f7',
                      maxR: sweepRange,
                      duration: 300
                    });
                    var _dodged = S._dodgeRoll;
                    var _blocked = Date.now() < S.shieldEnd;
                    if (distToP < sweepRange && !invuln && !_dodged) {
                      var sweepDmg = Math.ceil(m.dmg * 1.2);
                      var _finalDmg = _blocked ? Math.max(1, Math.ceil(sweepDmg * 0.3)) : sweepDmg;
                      _R6.hp -= _finalDmg;
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 20,
                        text: _blocked ? '🛡️ -' + _finalDmg : '-' + _finalDmg,
                        color: '#a855f7',
                        ts: Date.now()
                      });
                      S.lastDamageTaken = Date.now();
                      S._hitFlash = Date.now();
                    }
                  }
                  if (ability === 'summon') {
                    var _S$map$, _S$map3;
                    var summonCount = 2 + Math.floor(Math.random() * 2);
                    var zone2 = ZONES[S.currentZone || S._dungeonZone];
                    var dW2 = ((_S$map$ = S.map[0]) === null || _S$map$ === void 0 ? void 0 : _S$map$.length) || 25,
                      dH2 = ((_S$map3 = S.map) === null || _S$map3 === void 0 ? void 0 : _S$map3.length) || 20;
                    for (var si = 0; si < summonCount; si++) {
                      var _mx3 = m.x + (Math.random() - 0.5) * 80;
                      var _my3 = m.y + (Math.random() - 0.5) * 60;
                      var minion = createMonster('summon-' + Date.now() + '-' + si, 'swarm', Math.max(1, m.level - 5), Math.max(TILE * 2, Math.min(_mx3, (dW2 - 2) * TILE)), Math.max(TILE * 2, Math.min(_my3, (dH2 - 2) * TILE)), zone2 === null || zone2 === void 0 ? void 0 : zone2.element);
                      minion.curHp = minion.hp;
                      minion.type = 'swarm';
                      minion.hp = Math.ceil(minion.hp * 0.3);
                      minion.curHp = minion.hp;
                      minion.maxHp = minion.hp;
                      S.monsters.push(minion);
                    }
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 30,
                      text: '👥 Summon!',
                      color: '#9333ea',
                      ts: Date.now()
                    });
                    BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                  }
                  if (ability === 'enrage' && m.curHp < m.hp * 0.3 && !m._enraged) {
                    m._enraged = true;
                    m.dmg = Math.ceil(m.dmg * 1.5);
                    m.spd *= 1.4;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 30,
                      text: '😡 ENRAGED!',
                      color: '#ff2020',
                      ts: Date.now()
                    });
                    S.screenShake = 6;
                    BT_AUDIO.beep(120, 0.2, 0.3, 'sawtooth');
                  }
                } else if (m._attackPhase === 'attack' && Date.now() > m._phaseTimer) {
                  /* Recovery phase — BOSS IS NOW VULNERABLE */
                  m._attackPhase = 'recovery';
                  m._phaseTimer = Date.now() + 2000; /* 2s vulnerability window */
                  m._invulnerable = false;
                  m.color = '#3dd497'; /* green = vulnerable */
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 30,
                    text: '💫 EXPOSED!',
                    color: '#3dd497',
                    ts: Date.now()
                  });
                  BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
                } else if (m._attackPhase === 'recovery' && Date.now() > m._phaseTimer) {
                  /* Back to idle — invulnerable again */
                  m._attackPhase = 'idle';
                  m._invulnerable = true;
                  m.color = '#ff5e6c';
                  m._nextAbility = Date.now() + (m._abilityInterval || 4000);
                }
              }
              /* Boss charge movement */
              if (m._chargeUntil && Date.now() < m._chargeUntil) {
                m.x += Math.cos(m._chargeAngle) * (m._chargeSpeed || 3) * moveMult;
                m.y += Math.sin(m._chargeAngle) * (m._chargeSpeed || 3) * moveMult;
                /* Charge hit detection */
                if (distToP < 20 && !invuln) {
                  var chargeDmg = Math.ceil(m.dmg * 1.5);
                  var _blocked2 = Date.now() < S.shieldEnd;
                  var _finalDmg2 = _blocked2 ? Math.max(1, Math.ceil(chargeDmg * (1 - calcBlockReduction(_R6.fortification, _R6.shield)))) : chargeDmg;
                  _R6.hp -= _finalDmg2;
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 20,
                    text: '💨 -' + _finalDmg2,
                    color: '#ea580c',
                    ts: Date.now()
                  });
                  S.lastDamageTaken = Date.now();
                  S._hitFlash = Date.now();
                  S.screenShake = 6;
                  m._chargeUntil = 0; /* stop charging on hit */
                  /* Knockback */
                  var kbA = Math.atan2(P.y - m.y, P.x - m.x);
                  P.x += Math.cos(kbA) * 18;
                  P.y += Math.sin(kbA) * 18;
                }
              }

              /* Monster attacks player if in range */
              if (distToP < atkRange && !invuln) {
                if (!m._atkCd || Date.now() - m._atkCd > atkCooldown) {
                  var _R6$_amuletBonus3;
                  /* ═══ TELEGRAPH — show warning before attack lands ═══ */
                  var telegraphDur = 400; /* ms warning */
                  if (!m._telegraphUntil) {
                    /* Start telegraph — monster winds up */
                    m._telegraphUntil = Date.now() + telegraphDur;
                    m._telegraphAngle = Math.atan2(P.y - m.y, P.x - m.x);
                    m._telegraphRange = atkRange;
                    return; /* don't attack yet */
                  }
                  if (Date.now() < m._telegraphUntil) return; /* still telegraphing */
                  /* Telegraph done — execute attack */
                  m._telegraphUntil = null;
                  m._atkCd = Date.now();
                  var shielded = Date.now() < S.shieldEnd;
                  var rawDmg = Math.max(1, m.dmg);
                  /* §18.1 Food buff — resist reduces incoming damage */
                  if (S._resistBuff && Date.now() < S._resistBuff) rawDmg = Math.max(1, Math.floor(rawDmg * 0.85));
                  /* §4 Amulet elemental resistance */
                  if (((_R6$_amuletBonus3 = _R6._amuletBonus) === null || _R6$_amuletBonus3 === void 0 ? void 0 : _R6$_amuletBonus3.stat) === 'elemResist') rawDmg = Math.max(1, Math.floor(rawDmg * (1 - _R6._amuletBonus.value / 100)));
                  /* Shield gear — flat defense reduction */
                  if (_R6.shield) {
                    var ss = getShieldStats(_R6.shield);
                    if (ss.flatDef) rawDmg = Math.max(1, Math.floor(rawDmg - ss.flatDef));
                  }
                  var blockReduc = shielded ? calcBlockReduction(_R6.fortification, _R6.shield) : 0;
                  var dmgTaken = shielded ? Math.max(1, Math.floor(rawDmg * (1 - blockReduc))) : rawDmg;
                  if (shielded) {
                    if (!_R6._questFlags) _R6._questFlags = {};
                    _R6._questFlags.blocksLanded = (_R6._questFlags.blocksLanded || 0) + 1;
                    /* Shield gem: HP on block */
                    if (_R6.shield) {
                      var _ss$gemBonus;
                      var _ss = getShieldStats(_R6.shield);
                      if (((_ss$gemBonus = _ss.gemBonus) === null || _ss$gemBonus === void 0 ? void 0 : _ss$gemBonus.stat) === 'hpOnBlock') {
                        _R6.hp = Math.min(_R6.maxHp, _R6.hp + _ss.gemBonus.value);
                      }
                    }
                  }

                  /* Volatile: AoE damage burst when low HP */
                  if (arch === 'volatile' && m.curHp < m.hp * 0.3 && !m._exploded) {
                    m._exploded = true;
                    m.curHp = 0;
                    m.alive = false;
                    m.respawnAt = Date.now() + 30000;
                    var explodeDmg = Math.round(m.dmg * 2);
                    _R6.hp -= shielded ? Math.max(1, Math.floor(explodeDmg * (1 - blockReduc))) : explodeDmg;
                    S.lastDamageTaken = Date.now();
                    S._hitFlash = Date.now();
                    S.screenShake = 8;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 20,
                      text: '💥BOOM -' + explodeDmg,
                      color: '#ea580c',
                      ts: Date.now()
                    });
                    for (var ep = 0; ep < 30; ep++) {
                      S.hitParticles.push({
                        x: m.x,
                        y: m.y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10 - 3,
                        life: 1.2,
                        color: ['#ea580c', '#f5c542', '#ff5e6c'][Math.floor(Math.random() * 3)],
                        size: 2 + Math.random() * 3
                      });
                    }
                    BT_AUDIO.deathBoom();
                    BT_AUDIO.beep(100, 0.2, 0.3, 'sawtooth');
                    S.groundLoot.push({
                      x: m.x,
                      y: m.y,
                      coins: m.gold,
                      xp: 0,
                      skull: m.type,
                      skullEmoji: '🦴',
                      ts: Date.now()
                    });
                  } else {
                    _R6.hp -= dmgTaken;
                    S.lastDamageTaken = Date.now();
                    S._hitFlash = Date.now();

                    /* ═══ ARCHETYPE-SPECIFIC ATTACK EFFECTS ═══ */
                    if (arch === 'hexer' && !shielded) {
                      /* Hexer: applies curse debuff — reduces player damage for 4s */
                      S._cursedUntil = Date.now() + 4000;
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 20,
                        text: '🔮 Cursed!',
                        color: '#8E44AD',
                        ts: Date.now()
                      });
                      /* Purple curse particles */
                      for (var cp = 0; cp < 8; cp++) {
                        S.hitParticles.push({
                          x: P.x + (Math.random() - 0.5) * 20,
                          y: P.y + (Math.random() - 0.5) * 20,
                          vx: (Math.random() - 0.5) * 2,
                          vy: -1 - Math.random(),
                          life: 0.8,
                          color: '#8E44AD',
                          size: 2 + Math.random()
                        });
                      }
                    }
                    if (arch === 'brute' && !shielded) {
                      /* Brute: heavy hit — knockback + extra screen shake */
                      var kbAngle = Math.atan2(P.y - m.y, P.x - m.x);
                      P.x += Math.cos(kbAngle) * 12;
                      P.y += Math.sin(kbAngle) * 12;
                      S.screenShake = Math.max(S.screenShake || 0, 6);
                      S._playerStunUntil = Date.now() + 300; /* brief stagger */
                    }
                    if (arch === 'swarm') {
                      /* Swarm: rapid weak hits — apply bleed (1% HP/s for 3s) */
                      S._bleedUntil = Date.now() + 3000;
                      S._bleedDps = Math.max(1, Math.ceil(_R6.maxHp * 0.01));
                    }
                    if (arch === 'sentinel' && !shielded) {
                      /* Sentinel: armor-piercing — ignores 50% of block reduction */
                      var pierceDmg = Math.max(0, Math.floor(rawDmg * blockReduc * 0.5));
                      if (pierceDmg > 0) {
                        _R6.hp -= pierceDmg;
                        S.dmgNumbers.push({
                          x: P.x + 10,
                          y: P.y - 22,
                          text: 'Pierce -' + pierceDmg,
                          color: '#e8e8e8',
                          ts: Date.now()
                        });
                      }
                    }
                    if (arch === 'stalker' && !shielded) {
                      /* Stalker: crit chance on dash attacks */
                      if (m._stalkPhase === 'dash' && Math.random() < 0.4) {
                        var critDmg = Math.ceil(dmgTaken * 0.5);
                        _R6.hp -= critDmg;
                        S.dmgNumbers.push({
                          x: P.x,
                          y: P.y - 40,
                          text: '💀 CRIT -' + critDmg,
                          color: '#ff5e6c',
                          ts: Date.now()
                        });
                        S.screenShake = Math.max(S.screenShake || 0, 4);
                      }
                    }
                    if (shielded) {
                      m._stunUntil = Date.now() + 2000;
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 30,
                        text: '🛡️ -' + dmgTaken,
                        color: '#60a5fa',
                        ts: Date.now()
                      });
                      S.dmgNumbers.push({
                        x: m.x,
                        y: m.y - 25,
                        text: 'STUNNED',
                        color: '#f5c542',
                        ts: Date.now()
                      });
                      BT_AUDIO.beep(300, 0.08, 0.12, 'square');
                      /* ═══ BLOCK FEEDBACK — blue flash + shield particles ═══ */
                      S.screenShake = 3;
                      S._blockFlash = Date.now();
                      if (!S._impactRings) S._impactRings = [];
                      S._impactRings.push({
                        x: P.x,
                        y: P.y,
                        ts: Date.now(),
                        color: '#60a5fa',
                        maxR: 25,
                        duration: 200
                      });
                      for (var bp = 0; bp < 10; bp++) {
                        var bpA = Math.atan2(m.y - P.y, m.x - P.x) + (Math.random() - 0.5) * 1.5;
                        S.hitParticles.push({
                          x: P.x + Math.cos(bpA) * 20,
                          y: P.y + Math.sin(bpA) * 20,
                          vx: Math.cos(bpA) * (1 + Math.random() * 3),
                          vy: Math.sin(bpA) * (1 + Math.random() * 3) - 1,
                          life: 0.5,
                          color: ['#60a5fa', '#93c5fd', '#fff'][Math.floor(Math.random() * 3)],
                          size: 1.5 + Math.random()
                        });
                      }
                      BT_AUDIO.beep(600, 0.05, 0.06, 'sine');
                    } else {
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 30,
                        text: '-' + dmgTaken,
                        color: '#ff5e6c',
                        ts: Date.now()
                      });
                    }
                  }
                  if (_R6.hp <= 0) {
                    var _R6$_shieldBonus;
                    /* Shield gem: Death Save — chance to survive at 1 HP */
                    if (((_R6$_shieldBonus = _R6._shieldBonus) === null || _R6$_shieldBonus === void 0 ? void 0 : _R6$_shieldBonus.stat) === 'deathResist' && Math.random() < _R6._shieldBonus.value / 100) {
                      _R6.hp = 1;
                      S.dmgNumbers.push({
                        x: P.x,
                        y: P.y - 50,
                        text: '🛡️ DEATH SAVE!',
                        color: '#5b52ff',
                        ts: Date.now()
                      });
                      S.screenShake = 6;
                      BT_AUDIO.beep(800, 0.1, 0.12, 'sine');
                      setTimeout(function () {
                        return BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                      }, 80);
                    }
                  }
                  if (_R6.hp <= 0) {
                    /* §5.5 Player death — inventory scatter + escalating respawn */
                    if (!_R6._compStats) _R6._compStats = createDefaultCompStats();
                    _R6._compStats.deaths++;
                    var deathX = P.x,
                      deathY = P.y;
                    var deathZone = S.currentZone;

                    /* Death explosion — whimsical limb detach */
                    for (var _dp = 0; _dp < 35; _dp++) {
                      var dpA = _dp / 35 * Math.PI * 2;
                      S.hitParticles.push({
                        x: P.x,
                        y: P.y,
                        vx: Math.cos(dpA) * (2 + Math.random() * 5),
                        vy: Math.sin(dpA) * (2 + Math.random() * 5) - 1,
                        life: 1.2,
                        color: ['#ff5e6c', '#cc2233', '#ff8888', '#aa0020', '#fff'][Math.floor(Math.random() * 5)],
                        size: 2 + Math.random() * 3
                      });
                    }
                    /* Whimsical skull + bone emojis scatter */
                    var deathEmojis = ['💀', '🦴', '🦴', '💫', '⭐'];
                    for (var de = 0; de < 5; de++) {
                      var deA = de / 5 * Math.PI * 2 + Math.random() * 0.5;
                      S.deathExplosions.push({
                        x: deathX + Math.cos(deA) * 20,
                        y: deathY + Math.sin(deA) * 20,
                        ts: Date.now(),
                        emoji: deathEmojis[de],
                        particles: [{
                          vx: Math.cos(deA) * 3,
                          vy: Math.sin(deA) * 3 - 2,
                          life: 1.5
                        }]
                      });
                    }
                    S.screenShake = 12;
                    S._deathFlash = Date.now();
                    BT_AUDIO.playerDeath ? BT_AUDIO.playerDeath() : (BT_AUDIO.beep(80, 0.3, 0.4, 'sawtooth'), setTimeout(function () {
                      return BT_AUDIO.beep(60, 0.2, 0.3, 'sawtooth');
                    }, 150));

                    /* §5.5 Inventory scatter — carried items drop at death location */
                    /* Equipped weapon + armor are SAFE. Banked items are SAFE. */
                    var scatteredItems = [];
                    if (_R6.inventory) {
                      var invKeys = Object.keys(_R6.inventory).filter(function (k) {
                        return _R6.inventory[k] > 0 && k !== 'potions';
                      });
                      invKeys.forEach(function (k) {
                        var qty = _R6.inventory[k];
                        /* Scatter half of each stack (min 1 if have any) */
                        var scatterQty = Math.max(1, Math.floor(qty * 0.5));
                        _R6.inventory[k] -= scatterQty;
                        if (_R6.inventory[k] <= 0) delete _R6.inventory[k];
                        scatteredItems.push({
                          key: k,
                          qty: scatterQty
                        });
                      });
                    }

                    /* Gold penalty */
                    var goldLost = Math.floor(_R6.coins * DEATH_GOLD_PENALTY);
                    _R6.coins = Math.max(0, _R6.coins - goldLost);

                    /* Escalating respawn timer — §5.5 */
                    if (!_R6._deathTimestamps) _R6._deathTimestamps = [];
                    var dnow = Date.now();
                    _R6._deathTimestamps = _R6._deathTimestamps.filter(function (t) {
                      return dnow - t < RESPAWN_ESCALATE_WINDOW;
                    });
                    var recentDeaths = _R6._deathTimestamps.length;
                    _R6._deathTimestamps.push(dnow);
                    var respawnMs = Math.min(RESPAWN_MAX, RESPAWN_BASE + recentDeaths * RESPAWN_ESCALATE);

                    /* Restore and teleport to town */
                    _R6.hp = _R6.maxHp;
                    _R6.stamina = _R6.maxStamina;
                    _R6.mana = _R6.maxMana;
                    S.currentZone = 'town';
                    updateZoneDimensions('town');
                    BT_AUDIO.startZoneAmbient('town');
                    S.map = generateZoneMap('town');
                    S.monsters = []; /* Town has no monsters */
                    P.x = 16 * TILE;
                    P.y = 16 * TILE;
                    S.respawnTimer = Date.now() + respawnMs;

                    /* Place scattered items as recoverable ground loot at death site */
                    /* These persist in a special array so they survive zone transitions for recovery */
                    if (scatteredItems.length > 0) {
                      if (!S._deathDrops) S._deathDrops = [];
                      S._deathDrops.push({
                        zone: deathZone,
                        x: deathX,
                        y: deathY,
                        items: scatteredItems,
                        ts: Date.now(),
                        expiry: Date.now() + DEATH_SCATTER_RECOVERY
                      });
                    }

                    /* Death feedback */
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 50,
                      text: '💀 YOU DIED',
                      color: '#ff5e6c',
                      ts: Date.now()
                    });
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 35,
                      text: 'Respawn: ' + (respawnMs / 1000).toFixed(0) + 's',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    if (goldLost > 0) S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 20,
                      text: '-' + goldLost + 'G',
                      color: '#ff5e6c',
                      ts: Date.now()
                    });
                    if (scatteredItems.length > 0) S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 5,
                      text: 'Items scattered! ' + Math.ceil(DEATH_SCATTER_RECOVERY / 1000) + 's to recover',
                      color: '#ea580c',
                      ts: Date.now()
                    });
                    S.groundLoot = [];
                    S.hitParticles = [];
                    S.arrows = [];
                    S._ambientParticles = [];
                  }
                  setRpgState(_objectSpread({}, _R6));
                }
              }
            } else {
              /* Wander — archetype personality */
              m._aggroed = false;
              m.moveTimer -= 16.7;
              if (m.moveTimer <= 0) {
                var wanderDist = arch === 'swarm' ? 40 : arch === 'stalker' ? 100 : 60;
                m.targetX = m.spawnX + (Math.random() - 0.5) * wanderDist * 2;
                m.targetY = m.spawnY + (Math.random() - 0.5) * wanderDist * 2;
                m.moveTimer = arch === 'swarm' ? 1000 + Math.random() * 1500 : 2000 + Math.random() * 3000;
              }
              var wDx = m.targetX - m.x,
                wDy = m.targetY - m.y;
              var wDist = Math.sqrt(wDx * wDx + wDy * wDy);
              if (wDist > 2) {
                m.x += wDx / wDist * m.spd * 0.5 * moveMult;
                m.y += wDy / wDist * m.spd * 0.5 * moveMult;
              }
            }
          });

          /* §11 Combat intensity — swell ambient when monsters are nearby */
          var nearestMonsterDist = S.monsters.reduce(function (min, m) {
            if (!m.alive) return min;
            var d = Math.sqrt(Math.pow(m.x - P.x, 2) + Math.pow(m.y - P.y, 2));
            return d < min ? d : min;
          }, 9999);
          BT_AUDIO.setCombatIntensity(nearestMonsterDist < 100);

          /* ═══ LOW HP HEARTBEAT — thumping audio pulse below 25% HP ═══ */
          if (_R6.hp < _R6.maxHp * 0.25 && _R6.hp > 0) {
            if (!S._heartbeatTimer) S._heartbeatTimer = 0;
            S._heartbeatTimer++;
            var hbRate = _R6.hp < _R6.maxHp * 0.1 ? 25 : 40; /* faster when critically low */
            if (S._heartbeatTimer % hbRate === 0) {
              BT_AUDIO.beep(45, 0.06, 0.12, 'sine');
              setTimeout(function () {
                return BT_AUDIO.beep(40, 0.04, 0.08, 'sine');
              }, 120);
            }
          } else {
            S._heartbeatTimer = 0;
          }

          /* Sword swing — check hits */
          /* Clear lock if target is dead */
          if (S.lockedTarget) {
            var lt = S.lockedTarget;
            if (lt.type === 'monster' && (!lt.ref.alive || lt.ref.curHp <= 0)) S.lockedTarget = null;else if (lt.type === 'npc' && !lt.ref.alive) S.lockedTarget = null;
          }
          /* Auto-attack: trigger swing/bow automatically */
          /* §4.5 Attack speed — base cooldown modified by amulet */
          var atkSpdAmulet = ((_S$rpg9 = S.rpg) === null || _S$rpg9 === void 0 || (_S$rpg9 = _S$rpg9._amuletBonus) === null || _S$rpg9 === void 0 ? void 0 : _S$rpg9.stat) === 'atkSpd' ? 1 + S.rpg._amuletBonus.value / 100 : 1.0;
          var effectiveSwingCd = Math.max(200, Math.floor(SWING_COOLDOWN / atkSpdAmulet));
          if (S.autoAttack && S.rpg && Date.now() - S.swingTimer >= effectiveSwingCd) {
            if (!(S._playerStunUntil && Date.now() < S._playerStunUntil)) {
              var _S$rpg0, _S$rpg1;
              if (((_S$rpg0 = S.rpg) === null || _S$rpg0 === void 0 ? void 0 : _S$rpg0.activeSlot) === 'ranged' || ((_S$rpg1 = S.rpg) === null || _S$rpg1 === void 0 ? void 0 : _S$rpg1.activeSlot) === 'staff') {
                var _S$rpg10;
                var arrAngle;
                if (S.lockedTarget && S.lockedTarget.ref) {
                  var _lt = S.lockedTarget.ref;
                  arrAngle = Math.atan2((_lt.y || 0) - P.y, (_lt.x || 0) - P.x);
                } else if (S._aiming && S._aimAngle != null) {
                  arrAngle = S._aimAngle;
                } else {
                  var fd = S._facing || 'down';
                  arrAngle = fd === 'right' ? 0 : fd === 'up' ? -Math.PI / 2 : fd === 'left' ? Math.PI : Math.PI / 2;
                }
                if (!S.arrows) S.arrows = [];
                var isStaff = ((_S$rpg10 = S.rpg) === null || _S$rpg10 === void 0 ? void 0 : _S$rpg10.activeSlot) === 'staff';
                S.arrows.push({
                  ang: arrAngle,
                  dist: 14,
                  dmg: Math.round(pDmg * (isStaff ? 1.0 : 0.7)),
                  life: isStaff ? 90 : 120,
                  maxLife: isStaff ? 90 : 120,
                  hitIds: new Set(),
                  isStaff: isStaff
                });
                /* Broadcast projectile to other players */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
                  id: S.myId, x: Math.round(P.x), y: Math.round(P.y), ang: arrAngle, isStaff: isStaff, ts: Date.now()
                }});
                S.swingTimer = Date.now() + (isStaff ? 300 : 0); /* Staff fires slower */
                if (isStaff) {
                  BT_AUDIO.play('magic-cast', { vol: 0.55 });
                } else {
                  BT_AUDIO.play('arrow-fly', { vol: 0.85 });
                }
              } else if (!S.isSwinging) {
                S.swingTimer = Date.now();
                S.isSwinging = true;
                S._specialAttack = false;
                BT_AUDIO.play('sword-swing', { vol: 0.55 });
                /* Broadcast swing to other players */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_swing', payload: { id: S.myId, ts: Date.now() } });
              }
            }
          }
          if (S.isSwinging && Date.now() - S.swingTimer < 400) {
            var baseAngle;
            if (S.lockedTarget && S.lockedTarget.ref) {
              var _lt2 = S.lockedTarget.ref;
              var tx = _lt2.x || _lt2.renderX || P.x;
              var ty = _lt2.y || _lt2.renderY || P.y;
              baseAngle = Math.atan2(ty - P.y, tx - P.x);
            } else if (S._aiming && S._aimAngle != null) {
              baseAngle = S._aimAngle;
            } else {
              var swDir = S._facing || 'down';
              baseAngle = swDir === 'right' ? 0 : swDir === 'up' ? -Math.PI / 2 : swDir === 'left' ? Math.PI : Math.PI / 2;
            }
            /* Hit monsters */
            S.monsters.forEach(function (m) {
              if (!m.alive || m._hitThisSwing) return;
              var mDist = Math.sqrt(Math.pow(m.x - P.x, 2) + Math.pow(m.y - P.y, 2));
              if (mDist > SWING_RANGE) return;
              var mAngle = Math.atan2(m.y - P.y, m.x - P.x);
              var angleDiff = mAngle - baseAngle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              if (Math.abs(angleDiff) < SWING_ARC / 2) {
                var _ELEMENTS$collisionRe2;
                m._hitThisSwing = true;
                var isCrit = Math.random() < critChance;
                var specialMult = S._specialAttack ? SPECIAL_ATK_MULT : 1;

                /* §9 — Apply element status on hit */
                var hitElement = S._specialAttack ? _activeWpn.element2 : _activeWpn.element1;
                if (hitElement) {
                  var _ELEMENTS$hitElement;
                  var statusId = (_ELEMENTS$hitElement = ELEMENTS[hitElement]) === null || _ELEMENTS$hitElement === void 0 ? void 0 : _ELEMENTS$hitElement.status;
                  if (statusId) {
                    var _m$statuses;
                    var wasNew = !((_m$statuses = m.statuses) !== null && _m$statuses !== void 0 && _m$statuses[statusId]);
                    applyStatus(m, statusId, S.player, Date.now());
                    var elemDef = ELEMENTS[hitElement];
                    /* §Stage 2: "Brief bright pop on first application. Then ambient." */
                    if (wasNew) {
                      /* Flash ring at point of contact */
                      for (var ep = 0; ep < 8; ep++) {
                        S.hitParticles.push({
                          x: m.x + (Math.random() - 0.5) * 4,
                          y: m.y + (Math.random() - 0.5) * 4,
                          vx: (Math.random() - 0.5) * 4,
                          vy: (Math.random() - 0.5) * 4 - 1,
                          life: 0.5,
                          color: elemDef.color,
                          size: 1.5 + Math.random() * 2
                        });
                      }
                      /* Soft characteristic sound per element */
                      var pitches = {
                        flame: 350,
                        frost: 800,
                        water: 500,
                        venom: 280,
                        storm: 900,
                        stone: 200,
                        wind: 650,
                        dark: 120,
                        light: 1000
                      };
                      BT_AUDIO.beep(pitches[hitElement] || 400, 0.04, 0.06, 'sine');
                    }
                    /* §10.2 Effectiveness indicator — green/red arrow on hit */
                    if (m.element) {
                      var eff = getEffectiveness(hitElement, m.element);
                      if (eff > 1.0) {
                        S.dmgNumbers.push({
                          x: m.x + 12,
                          y: m.y - 10,
                          text: '▲',
                          color: '#3dd497',
                          ts: Date.now()
                        });
                        if (!_R6._questFlags) _R6._questFlags = {};
                        _R6._questFlags.usedEffectiveness = true;
                      } else if (eff < 1.0) {
                        S.dmgNumbers.push({
                          x: m.x + 12,
                          y: m.y - 10,
                          text: '▼',
                          color: '#ff5e6c',
                          ts: Date.now()
                        });
                      }
                    }
                  }
                }

                /* §10.3 — Check for collision (two different elements on target) */
                var collisionResult = null;
                if (hitElement) {
                  collisionResult = resolveCollision(m, hitElement, S.player, _R6, Date.now());
                }
                var dmg = Math.round((isCrit ? pDmg * critMult : pDmg) * specialMult);
                /* Boss invulnerability — can only be damaged during recovery phase */
                if (m._invulnerable) {
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: 'IMMUNE',
                    color: '#888',
                    ts: Date.now()
                  });
                  BT_AUDIO.beep(200, 0.03, 0.04, 'square');
                  return;
                }
                /* Level-difference scaling — hard to kill monsters much higher level */
                var lvlDiff = (m.level || 1) - (_R6.level || 1);
                if (lvlDiff > 3) dmg = Math.max(1, Math.round(dmg * Math.max(0.1, 1 - lvlDiff * 0.08)));
                var _hpBefore = m.curHp;
                m.curHp -= dmg;

                /* Report damage to server for authoritative resolution */
                if (S._serverMonsters && S.channel) {
                  var totalDmg = dmg;
                  if (collisionResult) totalDmg += collisionResult.damage;
                  S.channel.send({ type: 'monster_damage', payload: {
                    monsterId: m.id, zone: S.currentZone, dmg: totalDmg, isCrit: isCrit, element: activeWpn.element1
                  }});
                }

                /* Collision damage + feedback */
                if (collisionResult) {
                  var _ELEMENTS$collisionRe;
                  m.curHp -= collisionResult.damage;
                  var coll = collisionResult.collision;
                  var elemColor = ((_ELEMENTS$collisionRe = ELEMENTS[collisionResult.triggerElement]) === null || _ELEMENTS$collisionRe === void 0 ? void 0 : _ELEMENTS$collisionRe.color) || '#fff';
                  /* Collision burst damage number */
                  S.dmgNumbers.push({
                    x: m.x + 8,
                    y: m.y - 35,
                    text: '💥' + collisionResult.damage + ' ' + coll.name,
                    color: elemColor,
                    ts: Date.now()
                  });
                  /* Mana restore feedback */
                  if (collisionResult.manaRestored > 0) {
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 45,
                      text: '+' + collisionResult.manaRestored + ' MP',
                      color: '#3b82f6',
                      ts: Date.now()
                    });
                  }
                  /* Collision burst particles — element colored */
                  for (var cp = 0; cp < 15; cp++) {
                    S.hitParticles.push({
                      x: m.x + (Math.random() - 0.5) * 6,
                      y: m.y + (Math.random() - 0.5) * 6,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 6 - 2,
                      life: 0.8,
                      color: elemColor,
                      size: 2 + Math.random() * 3
                    });
                  }
                  S.screenShake = Math.max(S.screenShake, 5);
                  /* Codex discovery */
                  var isNew = discoverCollision(coll.id);
                  if (isNew) {
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 65,
                      text: '📖 NEW: ' + coll.name + '!',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    BT_AUDIO.collect();
                  }
                }
                /* Real WAV — replaces the old synth material thump. */
                BT_AUDIO.play('sword-hit', { vol: 0.55 });

                /* §19.1 Quest tracking — combat flags */
                if (!_R6._questFlags) _R6._questFlags = {};
                if (isCrit) _R6._questFlags.critsLanded = (_R6._questFlags.critsLanded || 0) + 1;
                if (hitElement) {
                  if (!_R6._questFlags.statusesApplied) _R6._questFlags.statusesApplied = {};
                  _R6._questFlags.statusesApplied[hitElement] = true;
                }
                if (collisionResult && _activeWpn.isVolatile) _R6._questFlags.volatileCollision = true;
                /* Three-layer collision sound if collision fired */
                if (collisionResult) {
                  BT_AUDIO.collisionSound(collisionResult.setupElement, collisionResult.triggerElement, collisionResult.manaRestored);
                }
                /* §6 Hit Stop — freeze frame proportional to hit significance */
                if (collisionResult && isCrit) {
                  S._hitStopDuration = 120;
                  S._hitStop = Date.now() + 120; /* Grand moment: collision + crit */
                } else if (collisionResult) {
                  S._hitStopDuration = 80;
                  S._hitStop = Date.now() + 80; /* Collision burst */
                } else if (isCrit) {
                  S._hitStopDuration = 60;
                  S._hitStop = Date.now() + 60; /* Critical hit */
                } else {
                  /* Micro-stop on every hit — subtle weight */
                  S._hitStopDuration = 25;
                  S._hitStop = Date.now() + 25;
                }
                /* Knockback — §Creative Vision: proportional to hit weight.
                   Special attacks knock back ~3x (10 → 30) for the heavy-hit feel. */
                var kbAngle = Math.atan2(m.y - P.y, m.x - P.x);
                var kbForce = S._specialAttack ? 30 : isCrit ? 14 : 6;
                /* Collision adds extra knockback */
                var collisionKb = collisionResult ? 4 : 0;
                m.x += Math.cos(kbAngle) * (kbForce + collisionKb);
                m.y += Math.sin(kbAngle) * (kbForce + collisionKb);
                /* §Creative Vision — Weapon-specific hit particles */
                var wpnHitType = _activeWpn.type || 'sword';
                var weaponFX = spawnWeaponHitFX(m.x, m.y, kbAngle, wpnHitType, isCrit);
                weaponFX.forEach(function (p) {
                  return S.hitParticles.push(p);
                });
                /* Blood splatter on ground */
                for (var bs = 0; bs < (isCrit ? 6 : 3); bs++) {
                  S.hitParticles.push({
                    x: m.x + Math.cos(kbAngle) * (8 + Math.random() * 15),
                    y: m.y + Math.sin(kbAngle) * (8 + Math.random() * 15),
                    vx: 0,
                    vy: 0,
                    life: 1.5,
                    color: '#880011',
                    size: 2 + Math.random() * 2
                  });
                }
                /* Screen shake */
                S.screenShake = isCrit ? 6 : 3;
                /* Camera punch — directional kick toward the hit */
                if (isCrit || collisionResult) {
                  var cpAngle = Math.atan2(m.y - P.y, m.x - P.x);
                  var cpForce = isCrit ? 12 : 8;
                  S._camPunch = {
                    dx: Math.cos(cpAngle) * cpForce,
                    dy: Math.sin(cpAngle) * cpForce,
                    ts: Date.now()
                  };
                }
                /* Impact ring flash — expanding ring at point of contact */
                if (!S._impactRings) S._impactRings = [];
                S._impactRings.push({
                  x: m.x,
                  y: m.y,
                  ts: Date.now(),
                  color: isCrit ? '#f5c542' : collisionResult ? ((_ELEMENTS$collisionRe2 = ELEMENTS[collisionResult.triggerElement]) === null || _ELEMENTS$collisionRe2 === void 0 ? void 0 : _ELEMENTS$collisionRe2.color) || '#fff' : '#fff',
                  maxR: isCrit ? 30 : collisionResult ? 25 : 16,
                  duration: isCrit ? 250 : 150
                });
                /* Damage number — scaled by significance. Display value
                   is capped at the HP that was actually removed so the
                   killing blow doesn't show an inflated overkill number. */
                var _displayDmg = Math.min(dmg, _hpBefore);
                if (isCrit && collisionResult) {
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: '💥⚡ ' + _displayDmg,
                    color: '#f5c542',
                    iconKey: 'sword',
                    ts: Date.now()
                  });
                } else if (isCrit) {
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: '💥 ' + _displayDmg,
                    color: '#f5c542',
                    iconKey: 'sword',
                    ts: Date.now()
                  });
                } else {
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: '' + _displayDmg,
                    color: '#fff',
                    iconKey: 'sword',
                    ts: Date.now()
                  });
                }
                if (m.curHp <= 0) {
                  var _ELEMENTS$splatElem, _ZONES$S$currentZone6;
                  m.alive = false;
                  m.respawnAt = Date.now() + 30000;
                  m.statuses = {};

                  /* §19.1 Quest kill tracking */
                  if (_R6._questKills === undefined) _R6._questKills = {};
                  Object.keys(QUEST_CHAINS).forEach(function (qid) {
                    var _R6$_quests2;
                    if (((_R6$_quests2 = _R6._quests) === null || _R6$_quests2 === void 0 ? void 0 : _R6$_quests2[qid]) === QUEST_STATUS.active) _R6._questKills[qid] = (_R6._questKills[qid] || 0) + 1;
                  });

                  /* ═══ THE GRAND SLAM — §Creative Vision: scaled cinematic micro-event ═══ */
                  var isGrandSlam = isCrit;
                  var isBigEnemy = m.archetype === 'brute' || m.archetype === 'sentinel' || m.archetype === 'hexer';
                  var killScale = isGrandSlam ? isBigEnemy ? 3 : 2 : isBigEnemy ? 1.5 : 1;

                  /* ═══ COMPREHENSIVE STATS — monster kill ═══ */
                  if (!_R6._compStats) _R6._compStats = createDefaultCompStats();
                  _R6._compStats.monstersKilled++;
                  if (isGrandSlam) _R6._compStats.grandSlams++;
                  if (m.level > (_R6._compStats.highestMonsterKill || 0)) _R6._compStats.highestMonsterKill = m.level;
                  if (m.isBoss) _R6._compStats.bossesKilled++;

                  /* §ENC — Bestiary discovery */
                  if (discoverMonster(m.archetype, S.currentZone)) {
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 90,
                      text: '📖 New Bestiary Entry!',
                      color: '#00d4b8',
                      ts: Date.now()
                    });
                  }

                  /* ═══ RARE DROP — 0.1% chance on any kill ═══ */
                  if (Math.random() < RARE_DROP_CHANCE) {
                    var rareDrop = RARE_DROP_ITEMS[Math.floor(Math.random() * RARE_DROP_ITEMS.length)];
                    _R6.achievementPoints = (_R6.achievementPoints || 0) + rareDrop.points;
                    _R6._compStats.rareDropsFound++;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 80,
                      text: rareDrop.emoji + ' RARE: ' + rareDrop.name + ' (+' + rareDrop.points + ' AP)',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    S.screenShake = 4;
                    BT_AUDIO.beep(800, 0.1, 0.12, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                    }, 80);
                    setTimeout(function () {
                      return BT_AUDIO.beep(1200, 0.1, 0.12, 'sine');
                    }, 160);
                  }

                  /* ═══ KILL SLOWMO — brief time dilation on significant kills ═══ */
                  if (isGrandSlam || isBigEnemy) {
                    S._killSlowmo = Date.now();
                    S._killSlowmoDuration = isGrandSlam && isBigEnemy ? 300 : isGrandSlam ? 200 : 150;
                  }

                  /* Sound — proportional to significance */
                  if (isGrandSlam) {
                    BT_AUDIO.grandSlam();
                  } else {
                    BT_AUDIO.deathBoom();
                  }

                  /* Screen shake — proportional */
                  S.screenShake = Math.round(4 * killScale);

                  /* Death particles — element/weapon specific via getElementDeathFX */
                  var killAngle = Math.atan2(m.y - P.y, m.x - P.x);
                  var deathParts = [];
                  var _killElem = hitElement || _activeWpn.element1 || null;
                  var _killColl = collisionResult ? collisionResult.collision : null;

                  /* Try element-specific death first */
                  if (_killColl) {
                    /* Collision kill — use the showpiece collision death effect */
                    var collFx = getCollisionDeathFX(m.x, m.y, _killColl.id, killAngle, {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[arch] || 10, killScale);
                    collFx.forEach(function (p) {
                      return deathParts.push(p);
                    });
                    /* Also add element particles for visual richness */
                    if (_killElem) {
                      var elemFx = getElementDeathFX(m.x, m.y, _killElem, killAngle, m.color, {
                        fodder: 8,
                        brute: 15,
                        swarm: 6,
                        sentinel: 12,
                        volatile: 9,
                        stalker: 10,
                        hexer: 10
                      }[arch] || 10, killScale * 0.5);
                      elemFx.particles.forEach(function (p) {
                        return deathParts.push(p);
                      });
                    }
                  } else if (_killElem) {
                    var _elemFx = getElementDeathFX(m.x, m.y, _killElem, killAngle, m.color, {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[arch] || 10, killScale);
                    _elemFx.particles.forEach(function (p) {
                      return deathParts.push(p);
                    });
                  } else {
                    /* No element — generic directional spray */
                    var partCount = Math.round(20 * killScale);
                    for (var dp = 0; dp < partCount; dp++) {
                      var spread = (Math.random() - 0.5) * 1.2;
                      var spd = (2 + Math.random() * 6) * killScale;
                      deathParts.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(killAngle + spread) * spd,
                        vy: Math.sin(killAngle + spread) * spd - Math.random() * 3,
                        life: 1,
                        color: isGrandSlam ? '#f5c542' : m.color,
                        size: (1.5 + Math.random() * 2) * (isGrandSlam ? 1.5 : 1)
                      });
                    }
                  }
                  /* Extra debris for Grand Slam — always present */
                  if (isGrandSlam) {
                    for (var gp = 0; gp < 10; gp++) {
                      deathParts.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(killAngle + (Math.random() - 0.5) * 0.8) * (5 + Math.random() * 8),
                        vy: -3 - Math.random() * 6,
                        life: 1.5,
                        color: ['#f5c542', '#fff', '#fbbf24', '#fde68a'][Math.floor(Math.random() * 4)],
                        size: 2 + Math.random() * 4
                      });
                    }
                  }
                  S.deathExplosions.push({
                    x: m.x,
                    y: m.y,
                    ts: Date.now(),
                    emoji: m.emoji,
                    particles: deathParts,
                    isGrandSlam: isGrandSlam,
                    killScale: killScale,
                    killType: _activeWpn.type === 'staff' ? 'magic' : _activeWpn.type === 'bow' ? 'ranged' : 'melee',
                    killElement: _killElem,
                    killCollision: (_killColl === null || _killColl === void 0 ? void 0 : _killColl.id) || null,
                    weaponType: _activeWpn.type || 'greatsword',
                    killAngle: killAngle,
                    bodyColor: m.color,
                    bodySize: {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[arch] || 10,
                    archetype: arch,
                    stuckArrows: m._stuckArrows || []
                  });

                  /* ═══ GROUND SPLATTER — persistent kill marks ═══ */
                  if (!S.groundSplatter) S.groundSplatter = [];
                  var splatElem = m.element;
                  var splatCol = splatElem ? ((_ELEMENTS$splatElem = ELEMENTS[splatElem]) === null || _ELEMENTS$splatElem === void 0 ? void 0 : _ELEMENTS$splatElem.color) || '#ff5e6c' : '#8a2030';
                  var splatCount = isGrandSlam ? 5 : 2 + Math.floor(Math.random() * 2);
                  for (var si = 0; si < splatCount; si++) {
                    S.groundSplatter.push({
                      x: m.x + (Math.random() - 0.5) * 24,
                      y: m.y + (Math.random() - 0.5) * 16,
                      color: splatCol,
                      size: 3 + Math.random() * 5 + (isGrandSlam ? 3 : 0),
                      ts: Date.now(),
                      element: splatElem
                    });
                  }
                  /* Cap splatter at 80 marks to prevent memory bloat */
                  if (S.groundSplatter.length > 80) S.groundSplatter.splice(0, S.groundSplatter.length - 80);

                  /* Loot cascade — scattered in kill direction, then settles.
                     XP is still granted on kill, but gold now rides on the
                     loot drop so the pickup is the only path to coins. */
                  var _wrMult = S.rpg._wellRestedUntil && Date.now() < S.rpg._wellRestedUntil ? WELL_RESTED_XP_MULT : 1;
                  var isRare = Math.random() < 0.002; /* 0.2% — 10x scarcer than before */
                  var killXp = Math.ceil((isRare ? m.xp * 3 : m.xp) * _wrMult);
                  var killGold = Math.ceil(isRare ? m.gold * 10 : m.gold);
                  _R6.xp += killXp;
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 25,
                    text: '+' + killXp + 'XP',
                    color: '#60a5fa',
                    ts: Date.now()
                  });
                  var lootCount = isGrandSlam ? 3 : 1;
                  for (var li = 0; li < lootCount; li++) {
                    var lootAngle = killAngle + (Math.random() - 0.5) * 1.0;
                    var lootDist = 15 + Math.random() * 25 * killScale;
                    S.groundLoot.push({
                      x: m.x + Math.cos(lootAngle) * lootDist + (Math.random() - 0.5) * 10,
                      y: m.y + Math.sin(lootAngle) * lootDist + (Math.random() - 0.5) * 10,
                      coins: li === 0 ? killGold : 0,
                      xp: 0,
                      skull: m.type,
                      skullEmoji: '🦴',
                      ts: Date.now() + li * 80,
                      rare: isRare && li === 0
                    });
                  }
                  if (isRare) {
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 50,
                      text: '⭐ RARE DROP!',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    BT_AUDIO.collect();
                    setTimeout(function () {
                      return BT_AUDIO.collect();
                    }, 150);
                  }

                  /* §4.6 Weapon drops — extremely rare below Lv100, meaningful at Lv100 */
                  var mLvl = m.level || 1;
                  /* Drop chance itself is much lower at low levels */
                  /* Lv1: 0.05%, Lv50: 0.3%, Lv100: 3% */
                  var lvlFactor = Math.pow(mLvl / 100, 3); /* cubic — Lv50 = 0.125, Lv100 = 1.0 */
                  var dropChance = 0.0005 + lvlFactor * 0.03 + (isGrandSlam ? 0.005 : 0);
                  if (Math.random() < dropChance) {
                    var _ZONES$S$currentZone4, _ZONES$S$currentZone5;
                    var _zoneElem = (_ZONES$S$currentZone4 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone4 === void 0 ? void 0 : _ZONES$S$currentZone4.element;
                    var secondaryElem = (_ZONES$S$currentZone5 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone5 === void 0 ? void 0 : _ZONES$S$currentZone5.secondary;
                    var dropTier,
                      dropE1,
                      dropE2,
                      dropName,
                      dropVolatile = false;

                    /* ═══ Level-scaled rarity table — cubic scaling ═══ */
                    /* lvlFactor: Lv1=0.000001, Lv10=0.001, Lv25=0.016, Lv50=0.125, Lv75=0.42, Lv100=1.0 */
                    /* Shift:     Lv1: ~1/5,000,000   Lv50: 1/40,000   Lv100: 1/500 */
                    /* Fusion:    Lv1: ~1/500,000      Lv50: 1/4,000    Lv100: 1/50 */
                    /* Elemental: Lv1: ~1/5,000        Lv50: 1/40       Lv100: 1/4 */
                    var shiftChance = 0.0000002 + lvlFactor * 0.002; /* Lv1: 0.00002%, Lv100: 0.2% */
                    var fusionChance = 0.000002 + lvlFactor * 0.02; /* Lv1: 0.0002%, Lv100: 2% */
                    var elemChance = 0.0002 + lvlFactor * 0.25; /* Lv1: 0.02%, Lv100: 25% */
                    var tierRoll = Math.random();
                    if (tierRoll < shiftChance && _zoneElem) {
                      dropTier = 'shift';
                      dropE1 = _zoneElem;
                      dropE2 = null;
                    } else if (tierRoll < shiftChance + fusionChance && _zoneElem) {
                      dropTier = 'fusion';
                      dropE1 = _zoneElem;
                      dropE2 = secondaryElem || ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind'].filter(function (e) {
                        return e !== _zoneElem;
                      })[Math.floor(Math.random() * 6)];
                      var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
                      dropVolatile = volPairs.some(function (_ref15) {
                        var _ref16 = _slicedToArray(_ref15, 2),
                          a = _ref16[0],
                          b = _ref16[1];
                        return dropE1 === a && dropE2 === b || dropE1 === b && dropE2 === a;
                      });
                    } else if (tierRoll < shiftChance + fusionChance + elemChance && _zoneElem) {
                      dropTier = 'elemental';
                      dropE1 = _zoneElem;
                      dropE2 = null;
                    } else {
                      dropTier = 'common';
                      dropE1 = null;
                      dropE2 = null;
                    }

                    /* Random weapon type */
                    var dropTypes = ['greatsword', 'sword', 'bow', 'staff'];
                    var dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                    var wpnLabel = WEAPON_TYPES[dropType].label;
                    var tierMult = RARITY_TIERS[dropTier].mult;
                    var tierColor = RARITY_TIERS[dropTier].color;

                    /* Build name */
                    if (dropTier === 'common') dropName = wpnLabel;else if (dropTier === 'elemental') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + ' ' + wpnLabel;else if (dropTier === 'fusion') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + (dropE2.charAt(0).toUpperCase() + dropE2.slice(1)) + ' ' + wpnLabel;else dropName = 'Prismatic ' + wpnLabel;

                    /* Add to ground loot as weapon drop */
                    var weaponDrop = {
                      x: m.x + (Math.random() - 0.5) * 20,
                      y: m.y + (Math.random() - 0.5) * 20,
                      ts: Date.now(),
                      isWeapon: true,
                      weapon: {
                        type: dropType,
                        tier: dropTier,
                        tierMult: tierMult,
                        element1: dropE1,
                        element2: dropE2,
                        name: dropName,
                        isVolatile: dropVolatile
                      },
                      tierColor: tierColor
                    };
                    S.groundLoot.push(weaponDrop);

                    /* Drop announcement */
                    var tierLabel = RARITY_TIERS[dropTier].label;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 60,
                      text: '🗡️ ' + tierLabel + ' ' + dropName + '!',
                      color: tierColor,
                      ts: Date.now()
                    });
                    if (dropTier !== 'common') {
                      BT_AUDIO.collect();
                      if (dropTier === 'fusion' || dropTier === 'shift') setTimeout(function () {
                        return BT_AUDIO.collect();
                      }, 120);
                    }
                  }

                  /* ═══ GEM DROP FROM MONSTER KILL — less efficient than life skills ═══ */
                  var killZoneElem = (_ZONES$S$currentZone6 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone6 === void 0 ? void 0 : _ZONES$S$currentZone6.element;
                  if (killZoneElem && Math.random() < GEM_DROP_RATES.monsterKill) {
                    var _ZONE_RESOURCES$killZ, _ZONE_RESOURCES$killZ2;
                    if (!_R6.lifeSkills) _R6.lifeSkills = createDefaultLifeSkills();
                    if (!_R6.lifeSkills.gems) _R6.lifeSkills.gems = {};
                    var gemKey = 'raw_' + killZoneElem;
                    _R6.lifeSkills.gems[gemKey] = (_R6.lifeSkills.gems[gemKey] || 0) + 1;
                    var gemName = ((_ZONE_RESOURCES$killZ = ZONE_RESOURCES[killZoneElem]) === null || _ZONE_RESOURCES$killZ === void 0 ? void 0 : _ZONE_RESOURCES$killZ.gem) || killZoneElem + ' Gem';
                    var gemCol = ((_ZONE_RESOURCES$killZ2 = ZONE_RESOURCES[killZoneElem]) === null || _ZONE_RESOURCES$killZ2 === void 0 ? void 0 : _ZONE_RESOURCES$killZ2.gemColor) || '#fff';
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 65,
                      text: '💎 Raw ' + gemName + '!',
                      color: gemCol,
                      ts: Date.now()
                    });
                  }

                  /* ═══ GOLD NUGGET DROP — rare from monster kills ═══ */
                  if (Math.random() < GOLD_NUGGET_DROP.monsterKill) {
                    _R6.goldNuggets = (_R6.goldNuggets || 0) + 1;
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 75,
                      text: '✨ Gold Nugget!',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(1200, 0.06, 0.08, 'sine');
                    }, 80);
                  }
                  if (isGrandSlam) {
                    S.dmgNumbers.push({
                      x: m.x,
                      y: m.y - 40,
                      text: 'GRAND SLAM!',
                      color: '#fbbf24',
                      ts: Date.now()
                    });
                  }

                  /* Check level up — §6.2 tri-phase XP curve */
                  while (_R6.xp >= xpRequired(_R6.level)) {
                    _R6.xp -= xpRequired(_R6.level);
                    _R6.level++;
                    _R6.unspentT1 += 5;
                    _R6.unspentT2 += 5;
                    _R6.unspentPts = _R6.unspentT1 + _R6.unspentT2;
                    recalcDerived(_R6);
                    _R6.hp = _R6.maxHp;
                    _R6.stamina = _R6.maxStamina;
                    _R6.mana = _R6.maxMana;
                    setLevelUpMsg({
                      level: _R6.level,
                      ts: Date.now()
                    });
                    BT_AUDIO.levelUp();
                  }
                  setRpgState(_objectSpread({}, _R6));
                  try {
                    localStorage.setItem('bt_rpg', JSON.stringify(_R6));
                  } catch (e) {}
                  btRpc('bt_monster_kill', {
                    p_id: getBtPlayerId(),
                    p_monster_type: m.type,
                    p_damage: dmg,
                    p_is_crit: isCrit,
                    p_is_special: !!S._specialAttack
                  }).then(function (sr) {
                    if (sr && sr.rpg) {
                      _R6.level = sr.rpg.level;
                      _R6.xp = sr.rpg.xp;
                      _R6.coins = sr.rpg.coins;
                      _R6.unspentPts = sr.rpg.unspent_pts;
                      setRpgState(_objectSpread({}, _R6));
                    }
                  });
                }
              }
            });
            /* §18 Gathering nodes — now use action button, not swing */
            /* Hit NPCs */
            if (S.npcs) {
              S.npcs.forEach(function (npc) {
                if (!npc.alive || npc._hitThisSwing) return;
                var nDist = Math.sqrt(Math.pow(npc.x - P.x, 2) + Math.pow(npc.y - P.y, 2));
                if (nDist > SWING_RANGE) return;
                var nAngle = Math.atan2(npc.y - P.y, npc.x - P.x);
                var naDiff = nAngle - baseAngle;
                while (naDiff > Math.PI) naDiff -= Math.PI * 2;
                while (naDiff < -Math.PI) naDiff += Math.PI * 2;
                if (Math.abs(naDiff) < SWING_ARC / 2) {
                  npc._hitThisSwing = true;
                  var npcDmg = pDmg;
                  npc.hp -= npcDmg;
                  BT_AUDIO.play('sword-hit', { vol: 0.55 });
                  var nkbA2 = Math.atan2(npc.y - P.y, npc.x - P.x);
                  npc.x += Math.cos(nkbA2) * 8;
                  npc.y += Math.sin(nkbA2) * 8;
                  for (var np2 = 0; np2 < 10; np2++) S.hitParticles.push({
                    x: npc.x,
                    y: npc.y,
                    vx: (Math.random() - .5) * 4 + Math.cos(nkbA2) * 2,
                    vy: (Math.random() - .5) * 4 - 1,
                    life: 1,
                    color: ['#cc2233', '#aa1122', '#dd3344'][Math.floor(Math.random() * 3)],
                    size: 1.5 + Math.random() * 2
                  });
                  S.screenShake = 2;
                  var nkbA = Math.atan2(npc.y - P.y, npc.x - P.x);
                  npc.x += Math.cos(nkbA) * 5;
                  npc.y += Math.sin(nkbA) * 5;
                  for (var np = 0; np < 8; np++) {
                    S.hitParticles.push({
                      x: npc.x,
                      y: npc.y,
                      vx: (Math.random() - .5) * 4 + Math.cos(nkbA) * 2,
                      vy: (Math.random() - .5) * 4 - 1,
                      life: 1,
                      color: '#cc2233',
                      size: 1.5 + Math.random() * 2
                    });
                  }
                  S.dmgNumbers.push({
                    x: npc.x,
                    y: npc.y - 20,
                    text: '' + npcDmg,
                    color: '#fff',
                    ts: Date.now()
                  });
                  S.screenShake = 2;
                  if (npc.hp <= 0) {
                    npc.alive = false;
                    npc.respawnAt = Date.now() + 10000;
                    BT_AUDIO.deathBoom();
                    S.screenShake = 5;
                    var ndParts = [];
                    for (var dp = 0; dp < 15; dp++) ndParts.push({
                      x: npc.x,
                      y: npc.y,
                      vx: (Math.random() - .5) * 6,
                      vy: (Math.random() - .5) * 6 - 2,
                      life: 1,
                      color: npc.color,
                      size: 2 + Math.random() * 2
                    });
                    S.deathExplosions.push({
                      x: npc.x,
                      y: npc.y,
                      ts: Date.now(),
                      emoji: '💀',
                      particles: ndParts
                    });
                    S.groundLoot.push({
                      x: npc.x,
                      y: npc.y,
                      coins: 5,
                      xp: 0,
                      skull: 'npc',
                      skullEmoji: '🦴',
                      ts: Date.now()
                    });
                    S.rpg.xp += 5;
                    S.dmgNumbers.push({
                      x: npc.x,
                      y: npc.y - 35,
                      text: '+5XP',
                      color: '#60a5fa',
                      ts: Date.now()
                    });
                  }
                }
              });
            }

            /* Hit other players (PvP) — §19 broadcast attack event.
               Only broadcast when the swing is intentionally aimed at
               another player (tap-locked) or both players are in an
               active duel.  Without this gate, every swing in a
               non-safe zone broadcasts as a PvP hit and co-op partners
               get tagged as victims of each other while killing
               shared monsters. */
            if (S.channel) {
              var _ZONES$S$currentZone7;
              var specialMult2 = S._specialAttack ? SPECIAL_ATK_MULT : 1;
              /* §19 PvP only works outside town and safe zones */
              var inSafeZone = (_ZONES$S$currentZone7 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone7 === void 0 ? void 0 : _ZONES$S$currentZone7.safe;
              var pvpLocked = S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.ref;
              if (!inSafeZone && (pvpLocked || S._inDuel)) {
                var pvpAngle = pvpLocked ? Math.atan2((S.lockedTarget.ref.y || S.lockedTarget.ref.renderY || P.y) - P.y, (S.lockedTarget.ref.x || S.lockedTarget.ref.renderX || P.x) - P.x) : baseAngle;
                /* Track threat — attacking a player starts the threat counter */
                S._pvpThreat = Date.now() + PVP_THREAT_DURATION;
                if (S.channel) S.channel.send({
                  type: 'broadcast',
                  event: 'player_attack',
                  payload: {
                    id: S.myId,
                    x: P.x,
                    y: P.y,
                    angle: pvpAngle,
                    dmgBase: pDmg * specialMult2,
                    critChance: critChance,
                    range: wpnType.range || SWING_RANGE,
                    arc: wpnType.arc || SWING_ARC,
                    ts: Date.now(),
                    inDuel: !!S._inDuel
                  }
                });
              }
            }
            /* Optimistic local visual — show slash effect on nearby players */
            Object.entries(S.others).forEach(function (_ref17) {
              var _ref18 = _slicedToArray(_ref17, 2),
                pid = _ref18[0],
                o = _ref18[1];
              if (o._hitThisSwing) return;
              var oDist = Math.sqrt(Math.pow(o.x - P.x, 2) + Math.pow(o.y - P.y, 2));
              if (oDist > SWING_RANGE) return;
              var oAngle = Math.atan2(o.y - P.y, o.x - P.x);
              var aDiff = oAngle - baseAngle;
              while (aDiff > Math.PI) aDiff -= Math.PI * 2;
              while (aDiff < -Math.PI) aDiff += Math.PI * 2;
              if (Math.abs(aDiff) < SWING_ARC / 2) {
                o._hitThisSwing = true;
                BT_AUDIO.play('sword-hit', { vol: 0.55 });
                var pvpKbA = Math.atan2(o.y - P.y, o.x - P.x);
                for (var _pp = 0; _pp < 12; _pp++) S.hitParticles.push({
                  x: o.x + (Math.random() - .5) * 6,
                  y: o.y + (Math.random() - .5) * 6,
                  vx: Math.cos(pvpKbA + (Math.random() - .5) * 1.5) * (1 + Math.random() * 3),
                  vy: Math.sin(pvpKbA + (Math.random() - .5) * 1.5) * (1 + Math.random() * 3) - 1,
                  life: 1,
                  color: ['#cc2233', '#aa1122'][Math.floor(Math.random() * 2)],
                  size: 1.5 + Math.random() * 2
                });
                S.screenShake = 3;
                S.dmgNumbers.push({
                  x: o.x,
                  y: o.y - 20,
                  text: '⚔️',
                  color: '#fff',
                  ts: Date.now()
                });
              }
            });
          }
          if (Date.now() - S.swingTimer > 450) {
            S.isSwinging = false;
            S.monsters.forEach(function (m) {
              m._hitThisSwing = false;
            });
            if (S.npcs) S.npcs.forEach(function (n) {
              n._hitThisSwing = false;
            });
            Object.values(S.others).forEach(function (o) {
              o._hitThisSwing = false;
            });
          }

          /* Save RPG state periodically */
          if (!S._rpgSaveTimer) S._rpgSaveTimer = 0;
          S._rpgSaveTimer++;
          if (S._rpgSaveTimer % 180 === 0) {
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(_R6));
            } catch (e) {}
            syncRpgToServer(_R6);
          }
        }

        /* Pick up ground loot — walk over it */
        if (S.groundLoot) {
          S.groundLoot = S.groundLoot.filter(function (loot) {
            /* Expire after 60 seconds (death drops use their own expiry timer) */
            if (loot.isDeathDrop && loot.expiry && Date.now() > loot.expiry) return false;
            if (loot._expired) return false;
            if (!loot.isDeathDrop && Date.now() - loot.ts > 60000) return false;
            var lDist = Math.sqrt(Math.pow(P.x - loot.x, 2) + Math.pow(P.y - loot.y, 2));

            /* ═══ LOOT MAGNETISM — pull toward player when close ═══ */
            var magnetRange = 50;
            if (lDist < magnetRange && lDist > 20) {
              var pullStrength = (1 - lDist / magnetRange) * 3;
              var pullAngle = Math.atan2(P.y - loot.y, P.x - loot.x);
              loot.x += Math.cos(pullAngle) * pullStrength;
              loot.y += Math.sin(pullAngle) * pullStrength;
            }
            if (lDist < 20) {
              /* §4.6 Weapon drop pickup — equip if better, stash otherwise */
              if (loot.isWeapon && loot.weapon) {
                var _WEAPON_TYPES$drop$ty2, _WEAPON_TYPES2;
                var drop = loot.weapon;
                var wpnDef = WEAPON_TYPES[drop.type];
                var isRanged = wpnDef.type === 'ranged';
                var current = isRanged ? S.rpg.rangedWeapon : S.rpg.weapon;
                var dropPower = drop.tierMult * (((_WEAPON_TYPES$drop$ty2 = WEAPON_TYPES[drop.type]) === null || _WEAPON_TYPES$drop$ty2 === void 0 ? void 0 : _WEAPON_TYPES$drop$ty2.base) || 30);
                var curPower = ((current === null || current === void 0 ? void 0 : current.tierMult) || 1) * (((_WEAPON_TYPES2 = WEAPON_TYPES[(current === null || current === void 0 ? void 0 : current.type) || 'greatsword']) === null || _WEAPON_TYPES2 === void 0 ? void 0 : _WEAPON_TYPES2.base) || 30);
                var canEquipDrop = meetsStatReq(S.rpg, drop, drop.type);
                if (dropPower >= curPower && canEquipDrop) {
                  /* Better weapon — equip and stash the old one */
                  if (current && current.name) {
                    if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                    if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) S.rpg.weaponStash.push(_objectSpread({}, current));else {
                      var _WEAPON_TYPES$sold$ty;
                      /* Stash full — auto-sell the oldest stashed weapon */
                      var sold = S.rpg.weaponStash.shift();
                      var sv = Math.ceil((sold.tierMult || 1) * (((_WEAPON_TYPES$sold$ty = WEAPON_TYPES[sold.type]) === null || _WEAPON_TYPES$sold$ty === void 0 ? void 0 : _WEAPON_TYPES$sold$ty.base) || 30) * 0.5);
                      S.rpg.coins += sv;
                    }
                  }
                  if (isRanged) S.rpg.rangedWeapon = drop;else S.rpg.weapon = drop;
                  S.dmgNumbers.push({
                    x: loot.x,
                    y: loot.y - 20,
                    text: '🗡️ EQUIPPED: ' + drop.name,
                    color: loot.tierColor || '#fff',
                    ts: Date.now()
                  });
                  BT_AUDIO.collect();
                  if (drop.tier === 'fusion' || drop.tier === 'shift') {
                    BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(659, 0.1, 0.08, 'sine');
                    }, 100);
                    setTimeout(function () {
                      return BT_AUDIO.beep(784, 0.15, 0.1, 'sine');
                    }, 200);
                  }
                } else {
                  /* Weaker drop — stash it for later comparison */
                  if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                  if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) {
                    S.rpg.weaponStash.push(drop);
                    S.dmgNumbers.push({
                      x: loot.x,
                      y: loot.y - 20,
                      text: '📦 STASHED: ' + drop.name,
                      color: '#8890b8',
                      ts: Date.now()
                    });
                  } else {
                    /* Stash full — auto-sell */
                    var sellValue = Math.ceil(dropPower * 0.5);
                    S.rpg.coins += sellValue;
                    if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += sellValue;
                    S.dmgNumbers.push({
                      x: loot.x,
                      y: loot.y - 20,
                      text: '+' + sellValue + 'G (sold)',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                  }
                  BT_AUDIO.beep(400, 0.05, 0.08, 'sine');
                }
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                return false;
              }

              /* §5.5 Death drop recovery — pick up scattered inventory items */
              if (loot.isDeathDrop && loot.deathItems) {
                if (!S.rpg.inventory) S.rpg.inventory = {};
                var recoveredCount = 0;
                loot.deathItems.forEach(function (item) {
                  S.rpg.inventory[item.key] = (S.rpg.inventory[item.key] || 0) + item.qty;
                  recoveredCount += item.qty;
                });
                S.dmgNumbers.push({
                  x: loot.x,
                  y: loot.y - 20,
                  text: '📦 RECOVERED ' + recoveredCount + ' items!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                if (!S.rpg._questFlags) S.rpg._questFlags = {};
                S.rpg._questFlags.recoveredDeathDrop = true;
                BT_AUDIO.collect();
                BT_AUDIO.beep(523, 0.08, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(659, 0.08, 0.08, 'sine');
                }, 80);
                setTimeout(function () {
                  return BT_AUDIO.beep(784, 0.1, 0.1, 'sine');
                }, 160);
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                return false;
              }

              /* Normal loot pickup (gold only — XP granted on kill) */
              S.rpg.coins += loot.coins || 0;
              if (loot.coins && S.rpg._compStats) S.rpg._compStats.totalGoldEarned += loot.coins;
              syncRpgToServer(S.rpg);
              if (loot.skull && S.rpg.inventory) S.rpg.inventory[loot.skull] = (S.rpg.inventory[loot.skull] || 0) + 1;
              if (loot.skull) {
                if (!S.rpg.skulls) S.rpg.skulls = {};
                S.rpg.skulls[loot.skull] = (S.rpg.skulls[loot.skull] || 0) + 1;
              }
              if (loot.coins) S.dmgNumbers.push({
                x: loot.x + 12,
                y: loot.y - 8,
                text: '+' + loot.coins + 'G',
                color: '#f5c542',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.06, 0.1, 'sine');
              /* ═══ LOOT PICKUP SPARKLE — gold/blue particles burst upward ═══ */
              for (var lsp = 0; lsp < 8; lsp++) {
                var lspA = lsp / 8 * Math.PI * 2;
                S.hitParticles.push({
                  x: loot.x,
                  y: loot.y,
                  vx: Math.cos(lspA) * (1 + Math.random() * 2),
                  vy: -1.5 - Math.random() * 3,
                  life: 0.6,
                  color: lsp % 2 === 0 ? '#f5c542' : '#60a5fa',
                  size: 1.5 + Math.random()
                });
              }
              /* Check level up — §6.2 tri-phase */
              while (S.rpg.xp >= xpRequired(S.rpg.level)) {
                S.rpg.xp -= xpRequired(S.rpg.level);
                S.rpg.level++;
                S.rpg.unspentT1 = (S.rpg.unspentT1 || 0) + 5;
                S.rpg.unspentT2 = (S.rpg.unspentT2 || 0) + 5;
                S.rpg.unspentPts = S.rpg.unspentT1 + S.rpg.unspentT2;
                recalcDerived(S.rpg);
                S.rpg.hp = S.rpg.maxHp;
                S.rpg.stamina = S.rpg.maxStamina;
                S.rpg.mana = S.rpg.maxMana;
                setLevelUpMsg({
                  level: S.rpg.level,
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                /* ═══ LEVEL UP BURST — celebratory particle explosion ═══ */
                S.screenShake = 8;
                S._levelUpFlash = Date.now();
                for (var lp = 0; lp < 40; lp++) {
                  var lpAngle = lp / 40 * Math.PI * 2;
                  var lpSpd = 3 + Math.random() * 5;
                  S.hitParticles.push({
                    x: P.x,
                    y: P.y,
                    vx: Math.cos(lpAngle) * lpSpd,
                    vy: Math.sin(lpAngle) * lpSpd - 2,
                    life: 1.2,
                    color: ['#f5c542', '#fbbf24', '#60a5fa', '#3dd497', '#a78bfa', '#fff'][Math.floor(Math.random() * 6)],
                    size: 2 + Math.random() * 3
                  });
                }
                /* Rising level text */
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 50,
                  text: '⬆️ LEVEL ' + S.rpg.level + '!',
                  color: '#f5c542',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 35,
                  text: 'HP/MANA RESTORED',
                  color: '#3dd497',
                  ts: Date.now()
                });
                /* Ascending chime */
                BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(659, 0.08, 0.06, 'sine');
                }, 100);
                setTimeout(function () {
                  return BT_AUDIO.beep(784, 0.08, 0.06, 'sine');
                }, 200);
                setTimeout(function () {
                  return BT_AUDIO.beep(1047, 0.12, 0.1, 'sine');
                }, 300);
              }
              setRpgState(_objectSpread({}, S.rpg));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
              } catch (e) {}
              return false; /* remove loot */
            }
            return true;
          });
        }

        /* §3.2 HP regeneration — OOC: 1.5%/s after 5s no damage. Restoration scales. */
        if (S.rpg && S.lastDamageTaken && Date.now() - S.lastDamageTaken > 5000) {
          var _R7 = S.rpg;
          /* §18.1 Food buff multipliers */
          var hasRegenBuff = S._regenBuff && Date.now() < S._regenBuff;
          var hasHpBuff = S._hpBuff && Date.now() < S._hpBuff;
          var hasManaBuff = S._manaBuff && Date.now() < S._manaBuff;
          var regenMult = hasRegenBuff ? 1.3 : 1.0;
          if (_R7.hp < _R7.maxHp) {
            if (!S._regenTimer) S._regenTimer = 0;
            S._regenTimer++;
            var restMult = 1 + (_R7.restoration || 0) * 0.001;
            if (S._regenTimer % 4 === 0) {
              var healAmt = Math.max(1, Math.ceil(_R7.maxHp * 0.001 * restMult * regenMult));
              var effectiveMax = hasHpBuff ? Math.floor(_R7.maxHp * 1.25) : _R7.maxHp;
              _R7.hp = Math.min(effectiveMax, _R7.hp + healAmt);
              setRpgState(_objectSpread({}, _R7));
            }
          }
          /* Stamina regen — 10/s base (10 sec full recharge) × Restoration */
          if (_R7.stamina < _R7.maxStamina) {
            var _R7$_amuletBonus;
            var stRestMult = 1 + (_R7.restoration || 0) * 0.001;
            var stAmuletMult = ((_R7$_amuletBonus = _R7._amuletBonus) === null || _R7$_amuletBonus === void 0 ? void 0 : _R7$_amuletBonus.stat) === 'staminaRegen' ? 1 + _R7._amuletBonus.value / 100 : 1;
            _R7.stamina = Math.min(_R7.maxStamina, _R7.stamina + 10 / 60 * stRestMult * regenMult * stAmuletMult);
          }
          /* Mana regen — §3.4: OOC 2.5%/s after 2s × Restoration */
          if (_R7.mana < _R7.maxMana && Date.now() - S.lastDamageTaken > 2000) {
            var mRestMult = 1 + (_R7.restoration || 0) * 0.001;
            var manaRegenMult = hasManaBuff ? 1.3 : 1.0;
            _R7.mana = Math.min(_R7.maxMana, _R7.mana + _R7.maxMana * 0.0004 * mRestMult * manaRegenMult);
          }
        } else if (S.rpg) {
          /* In-combat regen — §3.2: 0.3%/s HP, stamina regens always */
          var _R8 = S.rpg;
          if (_R8.hp < _R8.maxHp) {
            if (!S._regenTimer) S._regenTimer = 0;
            S._regenTimer++;
            if (S._regenTimer % 10 === 0) {
              var _R8$_amuletBonus;
              var _healAmt = Math.max(1, Math.ceil(_R8.maxHp * 0.0005));
              if (((_R8$_amuletBonus = _R8._amuletBonus) === null || _R8$_amuletBonus === void 0 ? void 0 : _R8$_amuletBonus.stat) === 'hpRegen') _healAmt = Math.ceil(_healAmt * (1 + _R8._amuletBonus.value));
              _R8.hp = Math.min(_R8.maxHp, _R8.hp + _healAmt);
            }
          }
          /* Stamina always regens — 10/sec */
          if (_R8.stamina < _R8.maxStamina) {
            _R8.stamina = Math.min(_R8.maxStamina, _R8.stamina + 10 / 60);
          }
          /* Slow mana regen in combat — 1%/s */
          if (_R8.mana < _R8.maxMana) {
            _R8.mana = Math.min(_R8.maxMana, _R8.mana + _R8.maxMana * 0.00017);
          }
        }

        /* Expire damage numbers — in-place compaction so we don't
           allocate a fresh array (and discard the old one for GC) every
           frame.  Date.now() is hoisted out of the inner loop. */
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
                text: '🌟 MVP! +' + CLAN_WAR_REWARDS.mvp.gold + 'G +' + CLAN_WAR_REWARDS.mvp.ap + 'AP',
                color: '#f5c542',
                ts: Date.now()
              });
            }
          }
          S.dmgNumbers.push({
            x: P.x,
            y: P.y - 55,
            text: cWin === 'tie' ? '⚔️ War ended in a TIE!' : isWinner ? '🏆 WAR WON!' : '💀 War lost...',
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
        S.camera.x = Math.max(0, Math.min(TOWN_W - W, S.camera.x));
        S.camera.y = Math.max(0, Math.min(TOWN_H - H, S.camera.y));

        /* Broadcast position — slim payload for speed */
        var now = performance.now();
        var isMoving = dx || dy || S._dodgeRoll;
        if (now - S.lastBroadcast > 33 && isMoving) {
          S.lastBroadcast = now;
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
                  z: S.currentZone || 'town',
                  vx: Math.round(bcastVx * 100),
                  vy: Math.round(bcastVy * 100)
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

        /* §2.3 Shield — drains stamina while held. 20/sec = 5 second hold at 100 max stamina. */
        if (S._shieldUp && S.rpg) {
          /* 20 stamina/sec at 60fps = 0.333/frame */
          S.rpg.stamina = Math.max(0, (S.rpg.stamina || 0) - 0.333);
          S.shieldEnd = Date.now() + 100;
          if (S.rpg.stamina <= 0) {
            S.rpg.stamina = 0;
            S._shieldUp = false;
            S._shieldCdUntil = Date.now() + 2000;
            S.shieldEnd = 0;
            if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: false }});
          }
        } else {
          S.shieldEnd = 0;
        }


        /* ── RENDER — delegated to PixiJS renderer ── */
        if (ctx.pixiRenderer) {
          ctx.pixiRenderer.update(S, W, H, nfts);
        }

      } catch (gameLoopErr) {
        console.error('GameLoop error:', gameLoopErr.message, gameLoopErr.stack);
      }
    };
    frameRef.current = requestAnimationFrame(_gameLoop);

    /* ═══ DESKTOP KEYBOARD CONTROLS ═══ */
    S._isDesktop = window.matchMedia('(pointer:fine)').matches;
    var onKeyDown = function onKeyDown(e) {
      var _document$activeEleme, _S$rpg25;
      if (((_document$activeEleme = document.activeElement) === null || _document$activeEleme === void 0 ? void 0 : _document$activeEleme.tagName) === 'INPUT') return;
      S.keys[e.key] = true;
      S._isDesktop = true; /* any keyboard input confirms desktop */

      /* Space — dodge roll in movement or facing direction */
      if (e.code === 'Space') {
        e.preventDefault();
        var _R1 = S.rpg;
        if (!_R1) return;
        var dodgeCost = Math.ceil((_R1.maxStamina || 100) * 0.2);
        if ((_R1.stamina || 0) < dodgeCost || S._dodgeRoll) return;
        /* Direction: use WASD if held, else facing, else mouse aim */
        var ddx = 0,
          ddy = 0;
        if (S.keys['w'] || S.keys['W'] || S.keys['ArrowUp']) ddy = -1;
        if (S.keys['s'] || S.keys['S'] || S.keys['ArrowDown']) ddy = 1;
        if (S.keys['a'] || S.keys['A'] || S.keys['ArrowLeft']) ddx = -1;
        if (S.keys['d'] || S.keys['D'] || S.keys['ArrowRight']) ddx = 1;
        var ang;
        if (ddx || ddy) {
          ang = Math.atan2(ddy, ddx);
        } else if (S._mouseAimAngle != null) {
          ang = S._mouseAimAngle;
        } else {
          var dirs = {
            down: Math.PI / 2,
            up: -Math.PI / 2,
            left: Math.PI,
            right: 0
          };
          ang = dirs[S.player.dir] || 0;
        }
        _R1.stamina -= dodgeCost;
        S._dodgeRoll = {
          angle: ang,
          startTime: Date.now()
        };
        S._hasDodged = true;
        S._dodgeFlash = Date.now();
        if (!S.respawnTimer || Date.now() > S.respawnTimer) S.respawnTimer = Date.now() + 400;
        return;
      }

      /* E — interact priority: building > sleep > gather > NPC quest > ferryman */
      if (e.code === 'KeyE') {
        e.preventDefault();
        /* 1. Building */
        if (S.nearBuilding !== null) {
          _desktopEnterBuilding();
          return;
        }
        /* 2. Sleep at house */
        if (S._nearHouse) {
          _desktopSleep();
          return;
        }
        /* 2b. Dungeon Workshop */
        if (S._nearWorkshop) {
          _desktopOpenWorkshop();
          return;
        }
        /* 2c. Pet House */
        if (S._nearPetHouse) {
          setShowPetHouse(true);
          BT_AUDIO.enterBuilding();
          return;
        }
        /* 2d. Minigame Arena */
        if (S._nearMinigameArena) {
          setShowMinigame(true);
          BT_AUDIO.enterBuilding();
          return;
        }
        /* 3. Gather node */
        if (S._nearNode && S._nearNode.alive) {
          _desktopGather();
          return;
        }
        /* 4. Nearby NPC — open quest dialog or ferryman */
        if (S._nearNpc) {
          var npc = S._nearNpc;
          if (npc.isFerryman) {
            _desktopFerryman();
            return;
          }
          var npcQ = typeof getNpcQuest === 'function' ? getNpcQuest(S.rpg, npc.name) : null;
          if (npcQ) {
            _desktopNpcQuest(npc, npcQ);
            return;
          }
        }
        return;
      }

      /* Q — toggle shield */
      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        if (S._shieldUp) {
          S._shieldUp = false;
          _desktopShieldOff();
        } else {
          _desktopShieldOn();
        }
        return;
      }

      /* Tab — cycle weapon slot */
      if (e.code === 'Tab') {
        e.preventDefault();
        _desktopCycleWeapon();
        return;
      }

      /* 1/2/3 — direct weapon slot */
      if (e.code === 'Digit1') {
        _desktopSelectSlot('melee');
        return;
      }
      if (e.code === 'Digit2') {
        _desktopSelectSlot('ranged');
        return;
      }
      if (e.code === 'Digit3' && (_S$rpg25 = S.rpg) !== null && _S$rpg25 !== void 0 && _S$rpg25.staffWeapon) {
        _desktopSelectSlot('staff');
        return;
      }

      /* F — special attack toward mouse aim */
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        if (S._mouseAimAngle != null) S._aimAngle = S._mouseAimAngle;
        _desktopSpecialAttack();
        return;
      }

      /* Escape — close panels */
      if (e.code === 'Escape') {
        _desktopCloseAll();
        return;
      }
    };
    var onKeyUp = function onKeyUp(e) {
      S.keys[e.key] = false;
      /* Release Q → drop shield */
      if (e.code === 'KeyQ' && S._shieldUp) {
        S._shieldUp = false;
        _desktopShieldOff();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return function () {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      if (resizeObs) resizeObs.disconnect();
      if (vv) vv.removeEventListener('resize', resize);
    };
  /* ── Original useEffect body ends ── */
}
