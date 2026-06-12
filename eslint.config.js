/* Minimal correctness-only lint (v2.3.765).
 *
 * Purpose-built after the v2.3.756 incident: a block-scoped const referenced
 * from a sibling scope shipped to production as a per-frame ReferenceError
 * (`_layerShirt`) -- the exact class `no-undef` catches at build time.
 *
 * Deliberately NO style rules: most of src/ui is pre-transpiled legacy code
 * that would generate thousands of useless warnings.  Only rules that flag
 * REAL bugs with near-zero false positives are enabled.  Add rules only with
 * a clean run.
 */
import globals from 'globals';

/* LEGACY DEBT REGISTER: the per-file `globals` blocks at the bottom
 * grandfather identifiers that the legacy monoliths reference WITHOUT a
 * binding -- each one is a latent ReferenceError in a rarely-executed path
 * (artifacts of extracting gameLoop/wsClient from BroTown).  They are listed
 * per file so (a) NEW undefined references still fail the lint everywhere,
 * and (b) the burn-down list is explicit.  Fix = import the symbol where it
 * lives (see the triage table in the v2.3.765 commit message) and delete the
 * entry here. */
export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        /* vite compile-time defines (vite.config.js `define`) */
        __BUILD_VERSION__: 'readonly',
        __BUILD_SHA__: 'readonly',
        __BUILD_TIME__: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',            // undeclared / out-of-scope references
      'no-dupe-keys': 'error',        // duplicate object keys (silent clobber)
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
  {
    /* LEGACY DEBT (7 known latent ReferenceErrors -- see commit). */
    files: ['src/data/gameSystems.js'],
    languageOptions: {
      globals: {
        DEPTH_TIERS: 'readonly',
        FISHING_TIERS: 'readonly',
        ZONE_RESOURCES: 'readonly',
        getAmuletBonus: 'readonly',
        getShieldBonus: 'readonly',
        getShieldStats: 'readonly',
        skillXpRequired: 'readonly',
      },
    },
  },
  {
    /* LEGACY DEBT (1 known latent ReferenceErrors -- see commit). */
    files: ['src/data/lifeSkills.js'],
    languageOptions: {
      globals: {
        ZONE_RESOURCES: 'readonly',
      },
    },
  },
  {
    /* LEGACY DEBT (30 known latent ReferenceErrors -- see commit). */
    files: ['src/game/gameLoop.js'],
    languageOptions: {
      globals: {
        CLAN_WAR_REWARDS: 'readonly',
        DIVE_TREASURE_CHANCE: 'readonly',
        FARM_BED_TILE: 'readonly',
        PET_LOOT_RADIUS: 'readonly',
        PVP_THREAT_DURATION: 'readonly',
        R: 'readonly',
        SPECIAL_ATK_MULT: 'readonly',
        SWING_ARC: 'readonly',
        SWING_COOLDOWN: 'readonly',
        SWING_RANGE: 'readonly',
        _asyncToGenerator: 'readonly',
        _createForOfIteratorHelper: 'readonly',
        _desktopCloseAll: 'readonly',
        _desktopCycleWeapon: 'readonly',
        _desktopEnterBuilding: 'readonly',
        _desktopFerryman: 'readonly',
        _desktopGather: 'readonly',
        _desktopNpcQuest: 'readonly',
        _desktopOpenWorkshop: 'readonly',
        _desktopSelectSlot: 'readonly',
        _desktopShieldOff: 'readonly',
        _desktopShieldOn: 'readonly',
        _desktopSleep: 'readonly',
        _desktopSpecialAttack: 'readonly',
        _objectSpread: 'readonly',
        _regenerator: 'readonly',
        arch: 'readonly',
        setShowMinigame: 'readonly',
        setShowPetHouse: 'readonly',
        setTutorialStep: 'readonly',
      },
    },
  },
  {
    /* LEGACY DEBT (19 known latent ReferenceErrors -- see commit). */
    files: ['src/networking/wsClient.js'],
    languageOptions: {
      globals: {
        ARENA_CHAMPION_REWARD: 'readonly',
        ARENA_WIN_REWARD: 'readonly',
        BT_API_BASE: 'readonly',
        BT_AUDIO: 'readonly',
        CLAN_WAR_REWARDS: 'readonly',
        DEATH_GOLD_PENALTY: 'readonly',
        TILE: 'readonly',
        ZONES: 'readonly',
        _objectSpread: 'readonly',
        _slicedToArray: 'readonly',
        _toConsumableArray: 'readonly',
        createDefaultCompStats: 'readonly',
        generateZoneMap: 'readonly',
        recalcDerived: 'readonly',
        setLevelUpMsg: 'readonly',
        setRpgState: 'readonly',
        setUnreadChats: 'readonly',
        updateZoneDimensions: 'readonly',
        xpRequired: 'readonly',
      },
    },
  },
  {
    /* LEGACY DEBT (27 known latent ReferenceErrors -- see commit). */
    files: ['src/ui/BroTown.jsx'],
    languageOptions: {
      globals: {
        ARENA_CHAMPION_REWARD: 'readonly',
        CLAN_WAR_REWARDS: 'readonly',
        CLAN_WAR_ZONES: 'readonly',
        DIVE_TREASURE_CHANCE: 'readonly',
        EFFECTIVENESS: 'readonly',
        EQUIP_STAT_MAP: 'readonly',
        FARM_BED_TILE: 'readonly',
        LIFE_SKILL_XP: 'readonly',
        MAX_PET_SLOTS: 'readonly',
        PET_LOOT_RADIUS: 'readonly',
        PVP_THREAT_BASE_COUNTDOWN: 'readonly',
        PVP_THREAT_COOLDOWN: 'readonly',
        PVP_THREAT_DURATION: 'readonly',
        R: 'readonly',
        SHIELD_EQUIP_STAT: 'readonly',
        TOWN_H: 'readonly',
        TOWN_W: 'readonly',
        TRAP_HP_THRESHOLD: 'readonly',
        arch: 'readonly',
        canEquipItem: 'readonly',
        createClanWar: 'readonly',
        enchantPet: 'readonly',
        evolvePet: 'readonly',
        getCookingSweetSpot: 'readonly',
        getEquipReqLabel: 'readonly',
        getFishHealAmount: 'readonly',
        getFishTierLevel: 'readonly',
      },
    },
  },
];
