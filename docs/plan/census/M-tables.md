# Card M: the renderers' tables, counted (v2.3.5344)

Made by `node tools/guards/render-tables.test.mjs --write` from
`tools/guards/lib/renderTables.mjs`, the one reader of the two renderers'
top level (its header pins the rules). Never edited by hand: the guard
fails a page that is not the scan's (line numbers aside). The tables line
(`TABLES_LINE`) only falls; the gatekeeper lowers it.

## The count

| | entityRenderer.js | effectsRenderer.js |
|---|---|---|
| tables (counted) | 0 | 0 |
| written into (apart) | 14 | 15 |
| handed on (apart) | 10 | 14 |
| frozen (a call: apart) | 2 | 2 |
| lone constants | 67 | 83 |
| ...tuned (leave with the tables) | 0 | 0 |

Suites that name a counted table or a tuned constant by its text: 0 (). They move with the two table PRs (the owner's review, 2026-11-17).

## The systems, and their order (largest first)

A counted table's system is read by hand from what it draws
(`SYSTEM_BY_HAND` in the lib). The tables leave in two PRs, one a renderer
(tag 5345 entityRenderer.js, 5346 effectsRenderer.js); in each, the
systems go in this order, a system's tables together.

| renderer | system | tables | their lines |
|---|---|---|---|

## 0. Moved out (src/rendering/tables/)

Each moved verbatim with its comment block and imported back by the same
name; the PR that moved it showed each deep-equal to its literal before.

- `src/rendering/tables/combat.js` (20): `SOUTH_IDLE_TILT`, `GRIP_NUDGE_X`, `GRIP_HOLE_FACINGS`, `GRIP_HOLE_R`, `GRIP_HOLE_R_BY_FACING`, `SWING_FULL_ARC`, `REST_ANG`, `BLOCK_ARM_SHOULDER`, `SOUTH_BLOCK_OFFHAND`, `SOUTH_BLOCK_OFFHAND_BY_TYPE`, `SECTORS8`, `DMG_LIFT`, `BOW_AIM_SECTORS`, `MAGIC_BOLT_ANCHOR`, `SWORD_FEEL_FLIP`, `JET_LEN_PX`, `SNOWBALL_BURST_H`, `PROP_SLASH_LEN`, `DMG_STROKE_PX`, `DMG_WORD_PAD`
- `src/rendering/tables/economy.js` (16): `LOOT_SCALE`, `LOOT_Z`, `DROP_GROW`, `BEAM_H_PX`, `BEAM_W_PX`, `BEAM_TEX_W`, `BEAM_TEX_H`, `BEAM_HALO_W`, `MOTE_PX`, `LOOT_BEAMS_BY_RANK`, `BEAM_SLOTS`, `RARE_KINDS`, `POP_H`, `POP_BOUNCE_H`, `HOP_KEYS`, `PILE_R`
- `src/rendering/tables/look.js` (28): `MINE_TRAIT_MUL`, `FISH_TRAIT_MUL`, `PLAYER_SIZE_MULT`, `TRAIT_RETRY_LATER_MS`, `_TRAIT_RETRY_MS`, `MIRROR_SCREEN_DIR`, `JOG_FOOT_FRAMES`, `BODY_DIR_SCALE`, `BODY_ROWS`, `JOG_EW_HAT_TUNE`, `STAND_HAT_TUNE`, `FULLSET_CROWN`, `FULLSET_HEAD_RES`, `FULLSET_HEAD_SEAT`, `_GEAR_SLOTS`, `_CAPE_HIDDEN_POSES`, `_CAPE_JOG_TILT`, `_CAPE_PIVOT_Y`, `_CAPE_JOG_DX`, `_CAPE_HOOD_TILT_K`, `_CAPE_HOOD_DX_K`, `BODY_NECK_FRAC`, `BODY_WAIST_FRAC`, `_REGION_SPR`, `BODY_CELL_MID`, `LOCAL_BODY_SCALE`, `NECK_ROWS`, `_STAND_IN_TRAIT_KEYS`
- `src/rendering/tables/monsters.js` (2): `MONSTER_SIZE_MULT`, `HARD_DOT_R`
- `src/rendering/tables/preload.js` (1): `PREWARM_POSES`
- `src/rendering/tables/render.js` (3): `PET_DRAW_K`, `SECTORS`, `PRINT_W`
- `src/rendering/tables/skills.js` (26): `CHOP_STANDIN_H`, `COOK_STANDIN_H`, `COOK_PAN_DX`, `CHOP_OFFSET`, `FIRE_STANDIN_H`, `CHOP_INK_KEYS`, `COOK_URL`, `STANDIN_REF_BODY_H`, `FARM_GEAR`, `FARM_PEER_LAYERS`, `GEAR_STRIP_TWIN`, `DRESSED_ONE_FRAME`, `FIRE_FEET_ROW`, `FIRE_LOG_BAND`, `FIRE_GEAR_REG`, `NODE_SPRITE_HEIGHT_BASE`, `NODE_SPRITE_ANCHOR_Y`, `NODE_ART_BASE`, `NODE_HPBAR_AT`, `NODE_LABEL_TOP`, `CAMPFIRE_HPBAR_GAP`, `NODE_TIER_TINT`, `SMITH_ANVIL_W`, `SMITH_ANVIL_X`, `SMITH_ANVIL_FOOT`, `SMITH_FACE_Y`
- `src/rendering/tables/social.js` (1): `EMOTE_POP_PX`
- `src/rendering/tables/townsfolk.js` (8): `NPC_TALK_PX`, `NPC_SPRITE_SCALE`, `NPC_FRAME_FEET_Y`, `NPC_FRAME_TOP_Y`, `NPC_PLATE_DROP_FRAC`, `NPC_DIRS_8`, `NPC_WALK_PX_PER_FRAME`, `QUEST_BADGE_R`
- `src/rendering/tables/ui.js` (28): `THREAT_SKULL_PX`, `HPBAR_ASPECT`, `HPBAR_IN_X`, `HPBAR_IN_W`, `HPBAR_IN_Y`, `HPBAR_IN_H`, `PEER_HPBAR_Y`, `MONSTER_HPBAR_W`, `PLAYER_HPBAR_W`, `PLAYER_HEART_SIZE`, `MONSTER_HEART_SIZE`, `HP_RING_OUTER_R`, `HP_RING_GAP_PX`, `PLATE_BORDER_PX`, `PLATE_LEVEL_STROKE_PX`, `PLATE_H_RATIO`, `PLATE_PAD_L_RATIO`, `PLATE_GAP_RATIO`, `PLATE_PAD_R_RATIO`, `PLATE_BADGE_TYPE_RATIO`, `RES_BAR_W`, `RES_BAR_H`, `RES_MP_Y`, `RES_BLOCK_W`, `RES_FILL`, `RES_GHOST`, `RES_GHOST_HEX`, `RES_SPENT_GAP`

## 1. The tables (counted)

| name | file | line | lines | system | names tables | suites that read it |
|---|---|---|---|---|---|---|

## 2. The tuned lone constants (a scale, an offset or an anchor of the art)

Marked by the name's words (`TUNED_WORDS`, none of `UNTUNED_WORDS`). They
leave with their renderer's tables.

| name | file | line | system | suites that read it |
|---|---|---|---|---|

## 3. The other lone constants (stay)

- entityRenderer.js: `WARD_RING_MS`:135, `COLLISION_GLOW_RANGE_PX`:179, `SKULL_RED_TINT`:184, `HUD_BAR_VER`:189, `PEER_HPBAR_HOLD_MS`:238, `NOTICE_MS`:246, `HPBAR_FLASH_MS`:258, `POPUP_BAR_CLEAR`:268, `SPAWN_FX_MS`:283, `BOSS_SEE_THROUGH`:304, `FOLK_FAR_MARGIN`:516, `TRAIT_NFT_ID`:800, `TRAIT_VER`:807, `HEAD_WATCH_MS`:1039, `BODY_DATA_TIMEOUT_MS`:1115, `MASKED_CAP`:2265, `_BAKE_BUSY_MAX`:2647, `_BAKE_STUCK_MS`:3026, `_LOCAL_PATIENCE_MS`:3039, `FISH_TOP_CAP`:3934, `FISH_SKIN_DARK`:3941, `FISH_SKIN_LIGHT`:3941, `FISH_STEEL_LO`:3941, `FISH_STEEL_HI`:3941, `FISH_STEEL_INK`:3941, `FISH_RIM_MIN`:3942, `FISH_PINE_RG`:3943, `HAIR_MASK_ROUNDS`:4282, `SWORD_SWING_MS`:4537, `BOW_SHOT_MS`:4542, `BOW_RELEASE_MS`:4547, `HP_RING_BAND`:4923, `HP_RING_TRACK`:4926, `HP_RING_CENTER_FILL`:4927, `HP_TIER_GREEN`:4928, `HP_TIER_YELLOW`:4928, `HP_TIER_ORANGE`:4928, `HP_TIER_RED`:4928, `HP_RING_OUTLINE`:4929, `HP_GHOST_WHITE`:4930, `HP_GHOST_DRAIN`:4931, `HP_GHOST_DRAIN_M`:4932, `HP_GHOST_HOLD_MS`:4935, `SWING_ANIM_MS`:5033, `THROW_RELEASE_GRACE_MS`:5056, `PLATE_INK`:5456, `PLATE_FILL_ALPHA`:5587, `PLATE_NAME_FILL`:5597, `PLATE_NAME_WEIGHT`:5604, `PLATE_BORDER_ALPHA`:5611, `PLATE_LEVEL_STROKE`:5676, `PLATE_ALARM_FILL`:5694, `PLATE_ALARM_FILL_ALPHA`:5720, `PLATE_ALARM_NAME_FILL`:5721, `PLATE_ALARM_NAME_WEIGHT`:5722, `PLATE_BOSS_FILL`:5732, `PLATE_BOSS_FILL_ALPHA`:5733, `PLATE_ALARM_LEVEL_FILL`:5742, `PLATE_ENGAGED_MS`:5746, `BRO_BADGE_URL`:5901, `PLATE_SCALE_MIN`:6089, `PLATE_SCALE_MAX`:6090, `CUE_ZOOM_MAX`:6101, `SOUTH_BLOCK_OFFHAND_ENABLED`:6454, `RES_SLIDE_MS`:7483, `RES_TRACK`:7488, `RES_BORDER_COL`:7489
- effectsRenderer.js: `BLOCK_POSE_FRAME`:69, `PEER_CHOP_IDLE_MS`:235, `GPU_WAIT_MS`:236, `COOK_FW`:283, `COOK_FH`:283, `PEER_INK_CAP`:286, `PEER_INK_IDLE_MS`:287, `PRINT_TTL_MS`:325, `PRINT_ALPHA`:326, `FARM_MIN_BLOB`:445, `PEER_CHOP_REACH`:523, `PEER_COOK_REACH`:524, `PEER_GATHER_NODE_TTL_MS`:525, `PEER_SEAT_MATCH_PX`:530, `CHOP_GEAR_FW`:565, `DRESSED_MAX`:598, `FIRE_FW`:678, `FIRE_FH`:678, `FIRE_FRAME_MS`:685, `FIRE_LOG_LIT_REACH`:745, `PEER_FIG_BUDGET`:861, `PEER_FIG_IDLE_MS`:869, `PEER_FIG_LOAD_MS`:877, `PEER_FIG_RETRY_MS`:878, `PEER_GREAVES_WAIT_MS`:879, `GEAR_STRIP_TIMEOUT_MS`:880, `DMG_FONT_PX`:1185, `DMG_CRIT_FONT_PX`:1186, `POPUP_ZOOM`:1286, `POPUP_Z_MIN`:1287, `POPUP_Z_MAX`:1287, `MSG_WRAP_W`:1310, `MSG_WRAP_SCREEN`:1311, `MSG_MAX_LINES`:1312, `MSG_EDGE_PX`:1313, `DMG_CRIT_COLOR`:1368, `MAGIC_BOLT_FRAME_MS`:1473, `HOT_SPECIAL_ARROW`:1569, `SWORD_FEEL_AUTHORED_DIR`:1587, `JET_STREAM_ENABLED`:1782, `JET_LINGER_MS`:1783, `JET_ALPHA`:1787, `JET_MAX`:1791, `FX_BURST_MS`:1847, `SLIME_WAVE_MS`:1921, `ARROW_BLAST_MS`:1922, `ARROW_BLAST_D`:1923, `SNOWBALL_BURST_MS`:1941, `SNAP_G`:2070, `SNAP_REST_MS`:2071, `SNAP_FADE_MS`:2072, `SNAP_MAX`:2073, `PROP_SLASHES_PER_PROP`:2074, `PROP_ARROWS_PER_PROP`:2077, `PROP_SCORCHES_PER_PROP`:2078, `PROP_MARKS_MAX`:2079, `SCORCH_GLOW_MS`:2080, `ORE_SPLIT_MS`:2366, `ORE_POP_LATE_MS`:2379, `DMG_BMP_FONT`:2441, `DMG_BMP_BAKE_PX`:2463, `DMG_WORD_FONT`:2492, `DMG_WORD_BAKE_PX`:2493, `DMG_WORD_PAGE_PX`:2494, `NPC_BUBBLE_REACH`:2723, `EMOTE_POP_FONT`:2734, `REMOTE_BAKE_CACHE_MAX`:2839, `BEAM_RISE_S`:2916, `BEAM_A`:2917, `BEAM_HALO_A`:2918, `BEAM_FLICKER`:2919, `BEAM_PULSE_HZ`:2920, `BEAM_MOTES`:2921, `MOTE_TEX`:2922, `LOOT_BEAMS_MAX`:2925, `PEER_FIRES`:2931, `LAND_S`:2997, `POP_JUMP`:3008, `POP_DELAY_S`:3009, `POP_ARC_S`:3010, `POP_BOUNCE_S`:3011, `SMITH_FLAME_H0`:3144, `WHIRL_CATCH_MAX`:3162

## 4. Apart: not counted, they stay

A table the code writes into, or hands on (aliased, an argument, an
element of a literal, returned: it may be written where it goes), and a
literal wrapped in `Object.freeze` (a call).

| name | file | line | why | suites that read it |
|---|---|---|---|---|
| `_propsDrawn` | entityRenderer.js | 374 | written: assigned (line 15442) | - |
| `_fgDrawn` | entityRenderer.js | 380 | written: assigned (line 15541) | - |
| `_traitCache` | entityRenderer.js | 856 | written: assigned (line 884) | - |
| `_bakeWorkerStats` | entityRenderer.js | 2570 | written: counted (line 2651) | - |
| `_bakeQueue` | entityRenderer.js | 2643 | written: .push() (line 2663) | - |
| `_localBakeStats` | entityRenderer.js | 3009 | written: counted (line 2739) | - |
| `_localMisses` | entityRenderer.js | 3038 | written: .shift() (line 3068) | - |
| `_peerBakeStats` | entityRenderer.js | 3090 | written: counted (line 3111) | - |
| `_peerQueue` | entityRenderer.js | 3092 | written: .splice() (line 3146) | - |
| `prewarmProgress` | entityRenderer.js | 3291 | written: assigned (line 3360) | - |
| `_hairMaskCache` | entityRenderer.js | 4239 | written: assigned (line 4244) | loader-retries |
| `_standInHairClip` | entityRenderer.js | 4553 | written: assigned (line 4597) | - |
| `_traitTex` | entityRenderer.js | 4776 | written: assigned (line 4800) | - |
| `_mannequinTex` | entityRenderer.js | 4783 | written: assigned (line 4809) | - |
| `_fxPreload` | effectsRenderer.js | 26 | written: .push() (line 70) | loader-retries |
| `_combatTrimStats` | effectsRenderer.js | 74 | written: assigned (line 14884) | loader-retries |
| `_standInTrimStats` | effectsRenderer.js | 95 | written: assigned (line 166) | - |
| `POPUP_ICONS` | effectsRenderer.js | 1370 | written: assigned (line 1443) | - |
| `SHARD_ICONS` | effectsRenderer.js | 1458 | written: assigned (line 1460) | - |
| `MAGIC_BOLT_FRAMES` | effectsRenderer.js | 1472 | written: .push() (line 1483) | - |
| `ARROW_PINE` | effectsRenderer.js | 1642 | written: assigned (line 1684) | - |
| `JET_STREAM` | effectsRenderer.js | 1764 | written: assigned (line 1766) | - |
| `ARROW_BLAST` | effectsRenderer.js | 1919 | written: .push() (line 1932) | - |
| `SNOWBALL_BURST` | effectsRenderer.js | 1940 | written: .push() (line 1955) | - |
| `NODE_SPRITE_TEX` | effectsRenderer.js | 2251 | written: assigned (line 2311) | - |
| `TREE_TEX` | effectsRenderer.js | 2263 | written: assigned (line 2264) | - |
| `ORE_TEX` | effectsRenderer.js | 2273 | written: assigned (line 2275) | pixel-readers |
| `ORE_ICON_TIER_TEX` | effectsRenderer.js | 2338 | written: assigned (line 2341) | - |
| `SMITH_ANVIL` | effectsRenderer.js | 3139 | written: assigned (line 3141) | - |
| `_staffTipOut` | entityRenderer.js | 140 | handed on: an argument (line 11212) | - |
| `_hudBarTex` | entityRenderer.js | 190 | handed on: in a literal (line 225) | renderer-life |
| `NODE_HPBAR_PARTS` | entityRenderer.js | 632 | handed on: aliased (line 673) | - |
| `JOG_EW_HAIR_TUNE` | entityRenderer.js | 1279 | handed on: returned (line 1281) | - |
| `_BASE_DIRS` | entityRenderer.js | 3299 | handed on: an argument (line 2936) | - |
| `PLAYER_HP_NUM_STYLE` | entityRenderer.js | 4906 | handed on: in a literal (line 689) | - |
| `HP_RING_MAX_STYLE` | entityRenderer.js | 4936 | handed on: in a literal (line 7044) | - |
| `MONSTER_HP_NUM_STYLE` | entityRenderer.js | 4944 | handed on: in a literal (line 5217) | - |
| `_STAND_SOUTH` | entityRenderer.js | 5380 | handed on: an argument (line 5382) | - |
| `PLATE_BAND` | entityRenderer.js | 5623 | handed on: in a literal (line 6417) | - |
| `_emoteIds` | effectsRenderer.js | 64 | handed on: aliased (line 9767) | - |
| `_emoteSrcs` | effectsRenderer.js | 64 | handed on: aliased (line 9767) | - |
| `_emoteEms` | effectsRenderer.js | 64 | handed on: aliased (line 9767) | - |
| `FIRE_SKIN_OPTS` | effectsRenderer.js | 698 | handed on: an argument (line 5700) | - |
| `ARROW_SPECIAL` | effectsRenderer.js | 1550 | handed on: in a literal (line 1794) | - |
| `MAGIC_SPECIAL` | effectsRenderer.js | 1570 | handed on: in a literal (line 1795) | - |
| `SWORD_SLASH` | effectsRenderer.js | 1579 | handed on: in a literal (line 1796) | - |
| `EFFECT_BURSTS` | effectsRenderer.js | 1830 | handed on: an argument (line 1842) | - |
| `GESTURE_TOOLS` | effectsRenderer.js | 2154 | handed on: an argument (line 2197) | mirror-audit |
| `NODE_SPRITE_SOURCES` | effectsRenderer.js | 2248 | handed on: an argument (line 2310) | - |
| `DMG_ALL_CHARS` | effectsRenderer.js | 2504 | handed on: an argument (line 2531) | - |
| `DMG_DIGIT_CHARS` | effectsRenderer.js | 2505 | handed on: an argument (line 2532) | - |
| `_NO_HOP` | effectsRenderer.js | 3044 | handed on: returned (line 3016) | - |
| `_AT_MIDDLE` | effectsRenderer.js | 3121 | handed on: aliased (line 10312) | loot-clock |
| `_PEER_WORN_SLOTS` | entityRenderer.js | 3141 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 5317 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 866 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 3168 | frozen | - |

<!-- part 5: the code (tools/dev/render-code-census.mjs --write) -->
## 5. The code, counted (v2.3.5347)

Written by `node tools/dev/render-code-census.mjs --write` at 99ce03b8; the rules are
`tools/guards/lib/renderCode.mjs`'s header. Moves nothing. A **leaf** is a
top-level function that reads no `this` and reaches no module state; its
**level** is 0 when it reads no other in-file function, else one more than
the highest leaf it reads (a function reading a non-leaf has no level).

| | functions | their code lines | leaves | leaf lines | with a level | methods | method lines |
|---|---|---|---|---|---|---|---|
| entityRenderer.js | 116 | 2692 | 42 | 601 | 13 | 20 | 4490 |
| effectsRenderer.js | 81 | 776 | 50 | 366 | 49 | 195 | 8488 |

### The order of the moves: leaves, level by level (largest first in each)

- level 0: 54 functions, 434 code lines
- level 1: 8 functions, 50 code lines

### Every function and method

| name | file | line | code | this | level | module state | in-file names | suites |
|---|---|---|---|---|---|---|---|---|
| `_ensureHudBarTextures` | entityRenderer.js | 228 | 1 | - | 0 | - | `_hudBarLoads` | renderer-life |
| `_crowdK` | entityRenderer.js | 397 | 1 | - | 0 | - | `_noPeerCull` | crowd-cap |
| `_folkSheetsStep` | entityRenderer.js | 539 | 7 | - | - | `_folkJobs` | `_FOLK_SHEETS_ON`, `_folkSheets`, `prewarmFolkBodies` | - |
| `_hpFillTexFor` | entityRenderer.js | 610 | 17 | - | - | `_hudBarTex` | - | - |
| `_nodeHpBarHide` | entityRenderer.js | 633 | 7 | - | - | `NODE_HPBAR_PARTS` | - | - |
| `drawNodeHpBar` | entityRenderer.js | 671 | 99 | - | - | `NAME_STYLE`, `NODE_HPBAR_PARTS`, `PLAYER_HP_NUM_STYLE`, `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `MONSTER_HPBAR_H`, `PLAYER_HPBAR_H`, `_ensureHudBarTextures`, `_hpFillTexFor`, `_nodeHpBarHide` | traps-phone-memory |
| `_traitGaveUp` | entityRenderer.js | 874 | 5 | - | - | `_looksRetryOn`, `_traitRetryOn` | - | keep-as-image |
| `_ensureTraitLoaded` | entityRenderer.js | 879 | 26 | - | - | `_traitCache` | `_fetchTraitMeta`, `_loadTraitDir` | keep-as-image |
| `_fetchTraitMeta` | entityRenderer.js | 913 | 13 | - | - | - | `TRAIT_VER`, `_traitGaveUp`, `_traitMetaLean` | keep-as-image, picture-door, traps-page-rules |
| `_traitMetaLean` | entityRenderer.js | 937 | 6 | - | - | `TRAIT_META_DOC` | - | - |
| `_loadTraitDir` | entityRenderer.js | 948 | 31 | - | - | - | `TRAIT_VER`, `_traitGaveUp` | keep-as-image |
| `_ensureHeadwearLoaded` | entityRenderer.js | 1017 | 1 | - | - | - | `_ensureTraitLoaded` | keep-as-image |
| `_ensureFacialHairLoaded` | entityRenderer.js | 1018 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureEyewearLoaded` | entityRenderer.js | 1019 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureEyeStyleLoaded` | entityRenderer.js | 1020 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureHairLoaded` | entityRenderer.js | 1021 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_traitKick` | entityRenderer.js | 1043 | 12 | - | - | - | `_fetchTraitMeta`, `_headWatch`, `_loadTraitDir` | - |
| `_watchOwnHead` | entityRenderer.js | 1055 | 36 | - | - | `_traitCache` | `HEAD_WATCH_MS`, `_fetchTraitMeta`, `_headWatch`, `_traitKick` | - |
| `_fetchLimited` | entityRenderer.js | 1117 | 9 | - | 0 | - | - | loader-retries, picture-door, traps-page-rules |
| `_ensureBodyData` | entityRenderer.js | 1126 | 32 | - | - | `_bodyAnchors`, `_bodyDataPromise`, `_bodyDataRounds`, `_bodyTops`, `_looksRetryOn`, `_traitRetryOn` | `BODY_DATA_TIMEOUT_MS`, `TRAIT_VER`, `_fetchLimited` | loader-retries, picture-door, traps-page-rules |
| `_hatHairFit` | entityRenderer.js | 1218 | 6 | - | - | - | `_ensureHairLoaded` | - |
| `_hatTune` | entityRenderer.js | 1254 | 9 | - | - | `_folkHatDy256`, `_qaHatDy256` | `_hatHairFit` | - |
| `hairPoseTune` | entityRenderer.js | 1280 | 3 | - | - | `JOG_EW_HAIR_TUNE` | - | - |
| `_placeTrait` | entityRenderer.js | 1294 | 59 | - | - | `_crownOverride` | `_ensureBodyData`, `_lookupBodyTop` | - |
| `_placeHeadwear` | entityRenderer.js | 1465 | 8 | - | - | - | `_ensureHeadwearLoaded`, `_hatTune`, `_placeTrait` | - |
| `_placeFacialHair` | entityRenderer.js | 1480 | 8 | - | - | - | `_ensureFacialHairLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeEyewear` | entityRenderer.js | 1504 | 8 | - | - | - | `_ensureEyewearLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeEyeStyle` | entityRenderer.js | 1536 | 8 | - | - | - | `_ensureEyeStyleLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeSpecies` | entityRenderer.js | 1561 | 22 | - | - | `_crownOverride` | `_placeTrait` | - |
| `remoteBodyArt` | entityRenderer.js | 1627 | 1 | - | - | - | `_remoteBodyArt` | - |
| `prewarmFolkBodies` | entityRenderer.js | 1638 | 15 | - | - | `_folkJobs` | `_remoteBodyArt` | folk-bakes, townsfolk-walk, traps-page-rules |
| `_remoteBodyArt` | entityRenderer.js | 1660 | 14 | - | - | `_bodyArtMemo` | - | folk-bakes |
| `_placeCape` | entityRenderer.js | 1790 | 69 | - | - | - | `_lookupBodyTop` | - |
| `_placeGear` | entityRenderer.js | 1977 | 67 | - | - | `_lastGearDisplay` | - | - |
| `_bodyRegionTex` | entityRenderer.js | 2118 | 13 | - | - | `_regionTexCache` | `REGION_ROWS` | - |
| `_bandTex` | entityRenderer.js | 2147 | 16 | - | - | `_bandTexCache` | - | - |
| `_placeBand` | entityRenderer.js | 2169 | 13 | - | - | - | `_bandTex` | - |
| `_placeSouthBlockLegs` | entityRenderer.js | 2217 | 33 | - | - | - | `_localMaskedFrame`, `_placeBand` | traps-page-rules |
| `_maskedEvictKey` | entityRenderer.js | 2266 | 1 | - | - | `_maskedBodyCache` | - | worn-bake |
| `_maskedDrop` | entityRenderer.js | 2277 | 4 | - | 0 | - | - | worn-bake |
| `_mkBakeCanvas` | entityRenderer.js | 2305 | 1 | - | 0 | - | - | - |
| `_cropBakedFrame` | entityRenderer.js | 2306 | 12 | - | 0 | - | - | - |
| `_maskedBodyFrame` | entityRenderer.js | 2461 | 9 | - | - | - | `_maskedBodyFrameInner` | - |
| `_maskedBodyFrameInner` | entityRenderer.js | 2473 | 24 | - | - | `_maskedBodyCache` | `_gearReadable`, `_mkBakeCanvas`, `_storeBake` | worn-bake |
| `_sendRod` | entityRenderer.js | 2563 | 6 | - | - | `_rodSent` | - | - |
| `_getBakeWorker` | entityRenderer.js | 2571 | 30 | - | - | `_bakeJobs`, `_bakeWorker`, `_bakeWorkerDead` | - | - |
| `_gearReadable` | entityRenderer.js | 2612 | 3 | - | 0 | - | - | worn-bake |
| `_prewarmBake` | entityRenderer.js | 2648 | 19 | - | - | `_bakeByKey`, `_bakeQueue`, `_bakeWorkerStats`, `_maskedBodyCache` | `_getBakeWorker`, `_maskedBodyFrame`, `_pumpBakes` | - |
| `_pumpBakes` | entityRenderer.js | 2667 | 16 | - | - | `_bakeBusy`, `_bakeByKey`, `_bakeQueue`, `_bakeStartedAt` | `_BAKE_BUSY_MAX`, `_runBake` | - |
| `_runBake` | entityRenderer.js | 2684 | 46 | - | - | `_bakeJobs`, `_bakeSeq`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_localBakeStats`, `_maskedBodyCache` | `_getBakeWorker`, `_maskedBodyFrame`, `_maskedFailed`, `_mkBakeCanvas`, `_runLookBake`, `_sendRod`, `_storeBake` | worn-bake |
| `_lookBake` | entityRenderer.js | 2748 | 15 | - | - | `_bakeByKey`, `_bakeQueue` | `_getBakeWorker`, `_pumpBakes`, `_runLookBakeInline` | - |
| `_runLookBake` | entityRenderer.js | 2764 | 31 | - | - | `_bakeJobs`, `_bakeSeq`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_localBakeStats` | `_getBakeWorker`, `_sendRod` | - |
| `_mkCpuCanvas` | entityRenderer.js | 2798 | 6 | - | 1 | - | `_mkBakeCanvas` | - |
| `_runLookBakeInline` | entityRenderer.js | 2804 | 35 | - | - | `_bakeWorkerStats`, `_lookSheetsHere` | `_gearReadable`, `_mkBakeCanvas`, `_mkCpuCanvas` | worn-bake |
| `_placeLookResidue` | entityRenderer.js | 2844 | 37 | - | 0 | - | - | - |
| `_maskedFailed` | entityRenderer.js | 3016 | 4 | - | - | `_maskedFails` | - | - |
| `_maskedRetryInline` | entityRenderer.js | 3020 | 1 | - | - | `_maskedFails` | - | - |
| `_bakeWorkerWatch` | entityRenderer.js | 3027 | 11 | - | - | `_bakeBusy`, `_bakeJobs`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_rodSent` | `_BAKE_STUCK_MS` | - |
| `_localMaskedFrame` | entityRenderer.js | 3041 | 19 | - | - | `_bakeBusy`, `_bakeByKey`, `_bakeStartedAt`, `_localBakeStats`, `_localEpoch`, `_localMissKey`, `_localMisses`, `_maskedBodyCache` | `_LOCAL_PATIENCE_MS`, `_bakeWorkerWatch`, `_getBakeWorker`, `_maskedBodyFrame`, `_maskedRetryInline`, `_prewarmBake` | - |
| `_peerWorkerOk` | entityRenderer.js | 3094 | 1 | - | - | - | `_getBakeWorker` | - |
| `_peerBakeSoon` | entityRenderer.js | 3096 | 6 | - | - | `_maskedBodyCache`, `_peerPending` | `_prewarmBake` | - |
| `_peerMaskedFrame` | entityRenderer.js | 3104 | 23 | - | - | `_maskedBodyCache`, `_peerBakeStats`, `_peerPending` | `_bakeWorkerWatch`, `_maskedBodyFrame`, `_maskedRetryInline`, `_peerBakeSoon`, `_peerWorkerOk`, `_prewarmBake` | - |
| `_peerPrewarmIfChanged` | entityRenderer.js | 3142 | 9 | - | - | `_peerBakeStats`, `_peerQueue`, `_peerRunning` | `_peerWorkerOk`, `_runPeerQueue` | - |
| `_peerLookPrewarmIfChanged` | entityRenderer.js | 3154 | 24 | - | - | `_peerBakeStats` | `_peerWorkerOk` | - |
| `_runPeerQueue` | entityRenderer.js | 3178 | 32 | - | - | `_maskedBodyCache`, `_peerBakeStats`, `_peerPending`, `_peerQueue`, `_peerRunning` | `_prewarmBake` | - |
| `_storeBake` | entityRenderer.js | 3214 | 8 | - | - | `_maskedBodyCache` | `MASKED_CAP`, `_cropBakedFrame`, `_maskedDrop`, `_maskedEvictKey` | worn-bake |
| `_dirsFacingFirst` | entityRenderer.js | 3300 | 4 | - | - | `_BASE_DIRS`, `_localBakeDir` | - | - |
| `_prewarmArts` | entityRenderer.js | 3325 | 6 | - | 0 | - | `_FLIPBAKE_OFF` | owner-notes-2026-10-22 |
| `planPrewarmProgress` | entityRenderer.js | 3359 | 12 | - | - | `prewarmProgress` | `_catalogWornSets`, `_prewarmArts` | - |
| `_ownedIds` | entityRenderer.js | 3416 | 13 | - | - | `_ownedRpg` | - | - |
| `_catalogWornSets` | entityRenderer.js | 3429 | 21 | - | - | - | `_ownedIds` | - |
| `_noteOwnedGear` | entityRenderer.js | 3459 | 12 | - | - | `_ownedAt`, `_ownedRpg`, `_ownedSig` | `_ownedIds`, `prewarmAltWornSets` | - |
| `uploadBakedTextures` | entityRenderer.js | 3490 | 20 | - | - | `_maskedBodyCache`, `_uploadedSources` | - | - |
| `uploadGearTextures` | entityRenderer.js | 3520 | 17 | - | - | `_uploadedSources` | - | - |
| `registerPrewarmRenderer` | entityRenderer.js | 3548 | 1 | - | - | `_prewarmRenderer` | - | - |
| `prewarmMaskedBodyFrames` | entityRenderer.js | 3550 | 71 | - | - | `prewarmProgress` | `_dirsFacingFirst`, `_getBakeWorker`, `_prewarmArts`, `_prewarmBake` | traps-page-rules |
| `prewarmAltWornSets` | entityRenderer.js | 3658 | 78 | - | - | `_altPrewarmSeq`, `_maskedBodyCache`, `_spareSkipped`, `prewarmProgress` | `MASKED_CAP`, `_catalogWornSets`, `_dirsFacingFirst`, `_getBakeWorker`, `_prewarmArts`, `_prewarmBake` | traps-page-rules |
| `_schedulePrewarm` | entityRenderer.js | 3806 | 13 | - | - | `_equipPrewarmAgain`, `_equipPrewarmRunning`, `_equipPrewarmTimer`, `_prewarmRenderer` | `prewarmMaskedBodyFrames`, `uploadBakedTextures` | - |
| `_placeBodyRegions` | entityRenderer.js | 3831 | 19 | - | - | - | `REGION_ROWS`, `_bodyRegionTex` | - |
| `_placePickupHead` | entityRenderer.js | 3866 | 26 | - | 0 | - | - | - |
| `_releaseFishTop` | entityRenderer.js | 3936 | 1 | - | - | `_fishTopShown` | - | fish-top-evict |
| `_fishTopFrame` | entityRenderer.js | 3971 | 160 | - | - | `_FISH_GRIP_TROUSERS`, `_fishTopCache` | `FISH_PINE_RG`, `FISH_RIM_MIN`, `FISH_SKIN_DARK`, `FISH_SKIN_LIGHT`, `FISH_STEEL_HI`, `FISH_STEEL_INK`, `FISH_STEEL_LO`, `FISH_TOP_CAP`, `_FISH_GRIP_OVER_PLATE`, `_gearReadable`, `_releaseFishTop` | fish-top-evict, traps-page-rules |
| `_placeFishHead` | entityRenderer.js | 4223 | 13 | - | - | `_fishTopShown` | `_fishTopFrame` | fish-top-evict |
| `_ensureHairMaskLoaded` | entityRenderer.js | 4240 | 24 | - | - | `_hairMaskCache` | `_loadHairMaskDir` | loader-retries |
| `_loadHairMaskDir` | entityRenderer.js | 4283 | 10 | - | - | `_looksRetryOn`, `_traitRetryOn` | `HAIR_MASK_ROUNDS`, `TRAIT_VER` | loader-retries, picture-door |
| `_clipHairToHat` | entityRenderer.js | 4300 | 25 | - | - | - | `_ensureHairMaskLoaded`, `_ensureHeadwearLoaded`, `_hatTune`, `_placeTrait` | - |
| `_placeHair` | entityRenderer.js | 4346 | 10 | - | - | - | `_clipHairToHat`, `_ensureHairLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeStandaloneCapeLayer` | entityRenderer.js | 4471 | 16 | - | 0 | - | - | - |
| `placeStandInCape` | entityRenderer.js | 4501 | 30 | - | - | - | `_lookupBodyTop`, `_placeStandaloneCapeLayer` | - |
| `_clipStandInHair` | entityRenderer.js | 4584 | 38 | - | - | `_standInHairClip` | `_ensureHairMaskLoaded`, `_ensureHeadwearLoaded` | - |
| `monsterDisplayMap` | entityRenderer.js | 4642 | 1 | - | - | `_monsterDisplaysRef` | - | - |
| `monsterBodySprite` | entityRenderer.js | 4644 | 6 | - | - | `_monsterDisplaysRef` | - | - |
| `placeSkillTraits` | entityRenderer.js | 4656 | 24 | - | - | - | `_clipStandInHair`, `_ensureEyeStyleLoaded`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_hatHairFit` | - |
| `placeSkillTraitsFor` | entityRenderer.js | 4712 | 24 | - | - | - | `_clipStandInHair`, `_ensureEyeStyleLoaded`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_hatHairFit` | townsfolk-walk |
| `_lookupHeadBox` | entityRenderer.js | 4749 | 8 | - | - | `_bodyAnchors` | - | - |
| `_lookupStandHeadBox` | entityRenderer.js | 4762 | 5 | - | - | `_bodyAnchors` | - | - |
| `_lookupBodyTop` | entityRenderer.js | 4771 | 4 | - | - | `_bodyTops` | - | traps-page-rules |
| `_ensureTraitTextures` | entityRenderer.js | 4790 | 28 | - | - | `_mannequinTex`, `_traitLoadStarted`, `_traitMeta`, `_traitTex` | `TRAIT_NFT_ID`, `TRAIT_VER` | picture-door |
| `preloadTraits` | entityRenderer.js | 4838 | 40 | - | - | - | `_ensureBodyData`, `_ensureHairMaskLoaded`, `_ensureHudBarTextures`, `_ensureTraitLoaded`, `_ensureTraitTextures` | look-load |
| `createMonsterDisplay` | entityRenderer.js | 5074 | 55 | - | - | `MONSTER_HP_NUM_STYLE` | `_attachNamePill` | - |
| `playerGroundDy` | entityRenderer.js | 5381 | 3 | - | - | `_STAND_SOUTH` | - | - |
| `_attachNamePill` | entityRenderer.js | 5757 | 56 | - | - | `PLATE_BAND` | `PLATE_LEVEL_STROKE` | traps-page-rules |
| `_iconSet` | entityRenderer.js | 5914 | 2 | - | 0 | - | - | loader-retries |
| `preloadBroBadge` | entityRenderer.js | 5918 | 7 | - | - | `_broBadgeSet`, `_broBadgeTex` | `BRO_BADGE_URL`, `_broBadgeGot`, `_iconSet` | loader-retries |
| `_broBadgeTexture` | entityRenderer.js | 5928 | 7 | - | - | `_broBadgeSet`, `_broBadgeTex` | `BRO_BADGE_URL` | loader-retries |
| `preloadSmallIconTextures` | entityRenderer.js | 5944 | 4 | - | - | `_smallSet` | `_iconSet`, `_smallTexHeld` | small-icons |
| `_smallTex` | entityRenderer.js | 5948 | 10 | - | - | `_smallSet` | `_smallTexHeld` | small-icons |
| `_bindSmallTex` | entityRenderer.js | 5960 | 6 | - | - | - | `_smallTex` | small-icons |
| `preloadQuestPinTextures` | entityRenderer.js | 5980 | 4 | - | - | `_pinSet` | `_iconSet`, `_pinTexHeld` | owner-icons |
| `_questPinTex` | entityRenderer.js | 5984 | 10 | - | - | `_pinSet` | `_pinTexHeld` | owner-icons |
| `setPlateZoom` | entityRenderer.js | 6103 | 5 | - | - | `_cueZoom`, `_plateWorldScale` | `CUE_ZOOM_MAX` | - |
| `_fitPlateToZoom` | entityRenderer.js | 6112 | 15 | - | - | `_plateWorldScale` | `PLATE_SCALE_MAX`, `PLATE_SCALE_MIN` | - |
| `_updateNamePill` | entityRenderer.js | 6150 | 53 | - | - | - | `_broBadgeTexture`, `_drawPlateCapsule`, `_fitPlateToZoom` | folk-names |
| `_drawPlateCapsule` | entityRenderer.js | 6248 | 98 | - | - | `PLATE_BAND` | `PLATE_ALARM_FILL`, `PLATE_ALARM_FILL_ALPHA`, `PLATE_ALARM_LEVEL_FILL`, `PLATE_ALARM_NAME_FILL`, `PLATE_ALARM_NAME_WEIGHT`, `PLATE_BORDER_ALPHA`, `PLATE_BOSS_FILL`, `PLATE_BOSS_FILL_ALPHA`, `PLATE_FILL_ALPHA`, `PLATE_INK`, `PLATE_LEVEL_STROKE`, `PLATE_NAME_FILL`, `PLATE_NAME_WEIGHT`, `_bindSmallTex`, `_broBadgeTexture` | dungeon-clear |
| `createPlayerDisplay` | entityRenderer.js | 6464 | 298 | - | - | `HP_RING_MAX_STYLE`, `NAME_STYLE`, `PLAYER_HP_NUM_STYLE` | `_attachNamePill`, `_smallTex` | traps-page-rules, traps-phone-memory |
| `createOtherPlayerDisplay` | entityRenderer.js | 7119 | 167 | - | - | `NAME_STYLE`, `PLAYER_HP_NUM_STYLE` | `_attachNamePill`, `_smallTex` | traps-page-rules, traps-phone-memory |
| `EntityRenderer.constructor` | entityRenderer.js | 7514 | 16 | yes | - | `_frontLayerRef`, `_monsterDisplaysRef` | - | art-holds, elem-windup, farmwalk, fish-top-evict, held-numbers, keep-as-image, loader-retries, loot-clock, mirror-audit, owner-icons, picture-door, storm-eye, tick, water-frog, phase-table, traps-page-rules, traps-phone-memory |
| `EntityRenderer.update` | entityRenderer.js | 7547 | 12 | yes | - | - | `_noteOwnedGear` | drop-lines, elem-windup, fire-strip, keep-as-image, mirror-audit, owner-icons, renderer-life, storm-eye, water-frog |
| `EntityRenderer._updateMonsters` | entityRenderer.js | 7563 | 1086 | yes | - | `SPAWN_WHITE_FILTER`, `STATUS_TO_ELEMENT`, `_cueZoom`, `_hudBarTex` | `BOSS_SEE_THROUGH`, `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `MONSTER_HPBAR_H`, `NOTICE_MS`, `PLATE_ENGAGED_MS`, `POPUP_BAR_CLEAR`, `SPAWN_FX_MS`, `THROW_RELEASE_GRACE_MS`, `_bindSmallTex`, `_ensureHudBarTextures`, `_hpFillTexFor`, `_updateNamePill`, `createMonsterDisplay` | traps-page-rules |
| `EntityRenderer._drawPeerHpBar` | entityRenderer.js | 9933 | 84 | - | - | `PLAYER_HP_NUM_STYLE`, `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `PEER_BAR_H`, `PEER_BAR_W`, `PEER_BAR_Y`, `PEER_HPBAR_HOLD_MS`, `PLAYER_HPBAR_H`, `_ensureHudBarTextures`, `_hpFillTexFor` | - |
| `EntityRenderer.peerAlwaysDrawn` | entityRenderer.js | 10049 | 11 | - | - | - | `PEER_HPBAR_HOLD_MS` | - |
| `EntityRenderer._updateOtherPlayers` | entityRenderer.js | 10061 | 907 | yes | - | `_crownOverride`, `_lastPeerWeaponSprite`, `_plateWorldScale`, `_staffTipOut` | `BOW_SHOT_MS`, `HEAD_FRAMES_ON`, `PEER_BAR_H`, `PEER_BAR_W`, `PEER_BAR_Y`, `PEER_HPBAR_HOLD_MS`, `SKULL_RED_TINT`, `SOUTH_BLOCK_OFFHAND_ENABLED`, `SWING_ANIM_MS`, `SWORD_SWING_MS`, `_CROWD_ALL_SHOWN`, `_PEER_WORN_SLOTS`, `_bindSmallTex`, `_crowdK`, `_noPeerCull`, `_peerLookPrewarmIfChanged`, `_peerMaskedFrame`, `_peerPrewarmIfChanged`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeFishHead`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeLookResidue`, `_placePickupHead`, `_placeSpecies`, `_remoteBodyArt`, `_smallTex`, `_updateNamePill`, `createOtherPlayerDisplay`, `playerGroundDy` | traps-page-rules |
| `EntityRenderer._updatePlayer` | entityRenderer.js | 11692 | 1369 | yes | - | `_crownOverride`, `_lastHairDisplay`, `_lastWeaponSprite`, `_localBakeDir`, `_localBakeStats`, `_localEpoch`, `_selfDisplayRef`, `_staffTipOut` | `BOW_SHOT_MS`, `COLLISION_GLOW_RANGE_PX`, `HEAD_FRAMES_ON`, `PLAYER_BAND_Y`, `SKULL_RED_TINT`, `SOUTH_BLOCK_OFFHAND_ENABLED`, `SWING_ANIM_MS`, `SWORD_SWING_MS`, `_bindSmallTex`, `_ensureBodyData`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_localMaskedFrame`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeFishHead`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeLookResidue`, `_placePickupHead`, `_placeSouthBlockLegs`, `_placeSpecies`, `_updateNamePill`, `_watchOwnHead`, `createPlayerDisplay`, `playerGroundDy` | traps-page-rules |
| `EntityRenderer.capturePoseFrames` | entityRenderer.js | 14918 | 115 | yes | - | `_localBakeDir` | `CAPTURE_FACING`, `createPlayerDisplay` | - |
| `EntityRenderer.setCaptureRenderer` | entityRenderer.js | 15068 | 1 | yes | - | - | - | - |
| `EntityRenderer._updatePet` | entityRenderer.js | 15094 | 65 | yes | - | `NAME_STYLE` | `WARD_RING_MS` | traps-phone-memory |
| `EntityRenderer._posePet` | entityRenderer.js | 15189 | 28 | - | - | - | - | - |
| `EntityRenderer._updatePeerPets` | entityRenderer.js | 15236 | 53 | yes | - | - | - | - |
| `EntityRenderer.peerPetsDrawn` | entityRenderer.js | 15298 | 10 | yes | - | - | - | - |
| `EntityRenderer.petDrawn` | entityRenderer.js | 15312 | 11 | yes | - | - | - | - |
| `EntityRenderer._updateProps` | entityRenderer.js | 15338 | 67 | yes | - | `_entityLayerRef`, `_propsDrawn` | - | - |
| `EntityRenderer._updateForeground` | entityRenderer.js | 15504 | 44 | yes | - | `_fgDrawn` | - | - |
| `EntityRenderer._drawFolk` | entityRenderer.js | 15564 | 72 | - | - | `_folkHatDy256` | `HEAD_FRAMES_ON`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeSpecies`, `_remoteBodyArt`, `createOtherPlayerDisplay`, `placeSkillTraitsFor` | townsfolk-walk, traps-page-rules |
| `EntityRenderer._updateNPCs` | entityRenderer.js | 15653 | 309 | yes | - | `NAME_STYLE` | `FOLK_FAR_MARGIN`, `_attachNamePill`, `_bindSmallTex`, `_folkSheetsStep`, `_npcDrawn`, `_questPinTex`, `_smallTex`, `_updateNamePill` | traps-page-rules, traps-phone-memory |
| `EntityRenderer._updatePlayerHud` | entityRenderer.js | 16263 | 215 | yes | - | `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `PLAYER_BAND_Y`, `PLAYER_HPBAR_H`, `RES_EN_Y`, `_ensureHudBarTextures`, `_hpFillTexFor` | traps-page-rules |
| `EntityRenderer.clear` | entityRenderer.js | 16669 | 15 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
| `_localBuild` | effectsRenderer.js | 56 | 1 | - | 0 | - | - | - |
| `_peerBuild` | effectsRenderer.js | 57 | 1 | - | 0 | - | - | - |
| `_peerNotDrawn` | effectsRenderer.js | 62 | 1 | - | 0 | - | - | - |
| `_fxLoad` | effectsRenderer.js | 70 | 1 | - | - | `_fxPreload` | - | owner-icons, picture-door, pixel-readers |
| `effectsAnimationsReady` | effectsRenderer.js | 71 | 1 | - | - | `_fxPreload` | - | - |
| `_standInSheet` | effectsRenderer.js | 125 | 1 | - | 0 | - | - | - |
| `_standInLook` | effectsRenderer.js | 127 | 5 | - | 1 | - | `_standInSheet` | held-sweep |
| `_legsLookHas` | effectsRenderer.js | 133 | 1 | - | 1 | - | `LEGS_LOOK_OFF`, `_standInSheet` | held-sweep |
| `_sliceStandIn` | effectsRenderer.js | 135 | 34 | - | - | `_standInTrimFrames`, `_standInTrimStats` | - | gpu-only |
| `_probeStandInSkin` | effectsRenderer.js | 209 | 21 | - | 0 | - | - | - |
| `_chopArtAsymmetric` | effectsRenderer.js | 239 | 3 | - | 0 | - | - | - |
| `_peerChopArt` | effectsRenderer.js | 244 | 5 | - | 0 | - | - | - |
| `_chopKeyMask` | effectsRenderer.js | 253 | 5 | - | 0 | - | - | - |
| `_bakeChopStrip` | effectsRenderer.js | 263 | 6 | - | - | - | `_sliceStandIn` | townsfolk-walk |
| `_loadStandInImg` | effectsRenderer.js | 291 | 9 | - | 0 | - | - | picture-door |
| `_bakeCookSplit` | effectsRenderer.js | 302 | 3 | - | 0 | - | `COOK_FH`, `COOK_FW` | - |
| `_swingBehind` | effectsRenderer.js | 419 | 3 | - | 0 | - | - | - |
| `farmCrownMed` | effectsRenderer.js | 452 | 9 | - | - | `_farmCrownMid` | - | - |
| `placeFarmFigProxy` | effectsRenderer.js | 465 | 8 | - | 0 | - | - | - |
| `makeFarmFigProxy` | effectsRenderer.js | 473 | 9 | - | 0 | - | - | - |
| `chopStandInSpot` | effectsRenderer.js | 508 | 5 | - | 0 | - | - | - |
| `cookStandInSpot` | effectsRenderer.js | 513 | 4 | - | 0 | - | - | - |
| `_dressedKeyOf` | effectsRenderer.js | 608 | 6 | - | 0 | - | - | - |
| `_shirtLookOf` | effectsRenderer.js | 614 | 8 | - | 0 | - | - | - |
| `_fireFrameShift` | effectsRenderer.js | 720 | 4 | - | 0 | - | `FIRE_FW` | fire-strip |
| `_litLogKey` | effectsRenderer.js | 747 | 19 | - | 0 | - | `FIRE_LOG_LIT_REACH` | - |
| `_fireLogToBark` | effectsRenderer.js | 766 | 23 | - | - | `_fireLogWood` | `FIRE_LOG_LIT_OFF`, `_litLogKey` | - |
| `_bakeFireSplit` | effectsRenderer.js | 794 | 8 | - | - | `FIRE_SKIN_OPTS` | `FIRE_FH`, `FIRE_FW`, `FIRE_LEGLESS_OFF`, `FIRE_LOG_OFF`, `_fireLogToBark` | - |
| `_standInColourKey` | effectsRenderer.js | 887 | 4 | - | 0 | - | - | - |
| `_peerStandInColours` | effectsRenderer.js | 893 | 6 | - | 1 | - | `_standInColourKey` | - |
| `_localStandInColourKey` | effectsRenderer.js | 900 | 3 | - | 1 | - | `_standInColourKey` | - |
| `_figBytes` | effectsRenderer.js | 904 | 4 | - | 0 | - | - | - |
| `_projSrcPx` | effectsRenderer.js | 1013 | 5 | - | 0 | - | - | - |
| `_isGatheringStandIn` | effectsRenderer.js | 1019 | 4 | - | - | `FARM_POSES` | - | - |
| `_placeStandInCapeOn` | effectsRenderer.js | 1111 | 26 | - | - | `_capeProbe` | `_STAND_IN_CAPE_OVER_BODY` | - |
| `readDmgScale` | effectsRenderer.js | 1210 | 8 | - | 0 | - | - | - |
| `isDamagePopup` | effectsRenderer.js | 1233 | 8 | - | - | `DMG_MARK_ICONS` | `DMG_PLAIN_RE` | - |
| `popupZoomK` | effectsRenderer.js | 1291 | 5 | - | 0 | - | `POPUP_WORLD`, `POPUP_ZOOM`, `POPUP_Z_MAX`, `POPUP_Z_MIN` | drop-lines |
| `msgWrapW` | effectsRenderer.js | 1317 | 4 | - | 0 | - | `MSG_WRAP_SCREEN`, `MSG_WRAP_W`, `POPUP_WORLD`, `POPUP_ZOOM` | - |
| `msgLines` | effectsRenderer.js | 1325 | 22 | - | 0 | - | - | - |
| `wrapMessage` | effectsRenderer.js | 1350 | 12 | - | 1 | - | `MSG_MAX_LINES`, `msgLines` | - |
| `_tightPopupIcon` | effectsRenderer.js | 1414 | 26 | - | 0 | - | - | pixel-readers |
| `_loadPopupIcon` | effectsRenderer.js | 1440 | 12 | - | - | `POPUP_ICONS`, `TIGHT_POPUP_ICONS` | `POPUP_ICON_SRC`, `_fxLoad`, `_tightPopupIcon` | picture-door, pixel-readers |
| `stuckShaftScale` | effectsRenderer.js | 1703 | 5 | - | - | `ARROW_PINE` | - | - |
| `_crossedFrame` | effectsRenderer.js | 1859 | 7 | - | 0 | - | - | mirror-audit |
| `debrisDotTex` | effectsRenderer.js | 1877 | 14 | - | - | `_DEBRIS_DOT_TEX` | - | traps-page-rules |
| `ensureArrowBlastTex` | effectsRenderer.js | 1925 | 14 | - | - | `ARROW_BLAST`, `_arrowBlastLoad` | `_fxLoad` | traps-page-rules |
| `ensureSnowballBurstTex` | effectsRenderer.js | 1948 | 14 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | `_fxLoad` | mirror-audit, traps-page-rules |
| `freeFrostImpactTex` | effectsRenderer.js | 1980 | 15 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | - | traps-phone-memory |
| `_mixHex` | effectsRenderer.js | 2000 | 8 | - | 0 | - | - | - |
| `propSlashTex` | effectsRenderer.js | 2027 | 25 | - | - | `_PROP_SLASH_TEX` | - | traps-page-rules |
| `splinterTex` | effectsRenderer.js | 2060 | 10 | - | - | `_SPLINTER_TEX` | - | traps-page-rules |
| `hardDotTex` | effectsRenderer.js | 2105 | 10 | - | - | `_HARD_DOT_TEX` | - | traps-page-rules |
| `groundDecalTex` | effectsRenderer.js | 2121 | 17 | - | - | `_GROUND_DECAL_TEX` | - | traps-page-rules |
| `nodeSpriteTex` | effectsRenderer.js | 2345 | 5 | - | - | `NODE_SPRITE_TEX`, `ORE_TEX`, `TREE_TEX` | - | - |
| `_installOneDmgFont` | effectsRenderer.js | 2506 | 20 | - | 0 | - | - | - |
| `_installDmgFont` | effectsRenderer.js | 2530 | 5 | - | - | `DMG_ALL_CHARS`, `DMG_DIGIT_CHARS` | `DMG_BMP_BAKE_PX`, `DMG_BMP_FONT`, `DMG_WORDS_ON`, `DMG_WORD_BAKE_PX`, `DMG_WORD_FONT`, `DMG_WORD_PAGE_PX`, `_installOneDmgFont` | - |
| `_dmgFontNames` | effectsRenderer.js | 2535 | 1 | - | 0 | - | `DMG_BMP_FONT`, `DMG_WORDS_ON`, `DMG_WORD_FONT` | - |
| `_dmgFontsNow` | effectsRenderer.js | 2537 | 1 | - | 1 | - | `_dmgFontNames` | - |
| `_dmgSig` | effectsRenderer.js | 2546 | 10 | - | 0 | - | - | - |
| `_reinstallDmgFont` | effectsRenderer.js | 2573 | 14 | - | - | `_dmgFontSig` | `_dmgFontNames`, `_dmgLog`, `_dmgSig`, `_installDmgFont` | - |
| `dmgFontNeedsRebuild` | effectsRenderer.js | 2603 | 1 | - | - | `_dmgBmpReady`, `_dmgPagesGone` | - | - |
| `_letGoOfDmgPages` | effectsRenderer.js | 2604 | 10 | - | - | `_dmgPagesGone` | `_dmgFontsNow`, `_dmgLog` | - |
| `_dmgLog` | effectsRenderer.js | 2633 | 3 | - | - | `_dmgPagesGone` | - | - |
| `prewarmDmgFontPipe` | effectsRenderer.js | 2636 | 43 | - | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `_dmgBmpReady`, `_dmgPagesGone` | `DMG_BMP_BAKE_PX`, `DMG_BMP_FONT`, `DMG_WORDS_ON`, `DMG_WORD_BAKE_PX`, `DMG_WORD_FONT`, `_dmgLog`, `_letGoOfDmgPages`, `_reinstallDmgFont`, `dmgFontNeedsRebuild` | traps-phone-memory |
| `isAsciiOnly` | effectsRenderer.js | 2698 | 8 | - | 0 | - | - | - |
| `bandWithEmote` | effectsRenderer.js | 2726 | 5 | - | 0 | - | - | - |
| `bubbleGradient` | effectsRenderer.js | 2748 | 14 | - | - | `_chatBubbleGrad` | `_bubbleGrads` | - |
| `cssToHex` | effectsRenderer.js | 2795 | 9 | - | - | `_hexMemo` | - | zone-leftovers |
| `_twinWouldDiffer` | effectsRenderer.js | 2862 | 7 | - | 0 | - | - | - |
| `_trimBakeCache` | effectsRenderer.js | 2869 | 13 | - | - | `_bakeFrame` | `REMOTE_BAKE_CACHE_MAX` | traps-phone-memory |
| `makeBeamTexture` | effectsRenderer.js | 2935 | 27 | - | 0 | - | - | traps-page-rules |
| `makeMoteTexture` | effectsRenderer.js | 2964 | 14 | - | 0 | - | `MOTE_TEX` | traps-page-rules |
| `_hexTint` | effectsRenderer.js | 2978 | 1 | - | 0 | - | - | - |
| `lootPop` | effectsRenderer.js | 3015 | 24 | - | - | `_NO_HOP` | `POP_ARC_S`, `POP_BOUNCE_S`, `POP_DELAY_S`, `POP_JUMP`, `POP_LAND_S`, `_hash` | - |
| `_hash` | effectsRenderer.js | 3045 | 1 | - | 0 | - | - | - |
| `landAgeOf` | effectsRenderer.js | 3055 | 4 | - | 0 | - | `LOOT_POP` | loot-clock |
| `lootHop` | effectsRenderer.js | 3059 | 19 | - | - | `_NO_HOP` | `LAND_S`, `LOOT_POP`, `_hash`, `lootPop` | loot-clock |
| `pileLayout` | effectsRenderer.js | 3105 | 16 | - | 1 | - | `_hash` | - |
| `applySquash` | effectsRenderer.js | 3122 | 6 | - | 0 | - | - | loot-clock |
| `clearIfDrawn` | effectsRenderer.js | 3156 | 3 | - | 0 | - | - | - |
| `EffectsRenderer.constructor` | effectsRenderer.js | 3173 | 738 | yes | - | `JET_STREAM`, `_fxPreload`, `_standInLegsUse` | `CHOP_GEAR_FW`, `DMG_SCALE`, `FIRE_FW`, `JET_LINGER_MS`, `JET_STREAM_ENABLED`, `LEGS_LOOK_OFF`, `MSG_FONT_PX`, `STANDIN_LEGS_OFF`, `_fxLoad`, `_legsLookHas`, `_sliceStandIn`, `_standInLook`, `_standInSheet`, `_twinWouldDiffer`, `makeBeamTexture`, `makeFarmFigProxy`, `makeMoteTexture` | art-holds, elem-windup, farmwalk, fish-top-evict, held-numbers, keep-as-image, loader-retries, loot-clock, mirror-audit, owner-icons, picture-door, storm-eye, tick, water-frog, phase-table, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._standInTriggers` | effectsRenderer.js | 4915 | 27 | yes | - | - | - | - |
| `EffectsRenderer._loadChopSkinStrips` | effectsRenderer.js | 4954 | 11 | yes | - | - | - | - |
| `EffectsRenderer._bakeChopStrips` | effectsRenderer.js | 5006 | 36 | yes | - | - | `_bakeChopStrip`, `_chopArtAsymmetric`, `_chopKeyMask`, `_probeStandInSkin`, `_standInColourKey` | - |
| `EffectsRenderer._peerChopFrames` | effectsRenderer.js | 5106 | 27 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_RETRY_MS`, `_bakeChopStrip`, `_chopArtAsymmetric`, `_chopKeyMask`, `_figBytes`, `_peerChopArt`, `_peerStandInColours` | - |
| `EffectsRenderer._dropPeerChop` | effectsRenderer.js | 5141 | 14 | yes | - | - | - | - |
| `EffectsRenderer._loadCookStrips` | effectsRenderer.js | 5180 | 12 | yes | - | - | - | - |
| `EffectsRenderer._fetchAndBakeCook` | effectsRenderer.js | 5215 | 9 | yes | - | - | `_loadStandInImg` | - |
| `EffectsRenderer._bakeCookStrips` | effectsRenderer.js | 5252 | 36 | yes | - | - | `COOK_FH`, `COOK_FW`, `_bakeCookSplit`, `_probeStandInSkin`, `_sliceStandIn`, `_standInColourKey` | - |
| `EffectsRenderer._peerStandInInk` | effectsRenderer.js | 5332 | 30 | yes | - | - | `PEER_INK_CAP`, `STANDIN_INK`, `_loadStandInImg`, `_peerChopArt`, `_sliceStandIn` | - |
| `EffectsRenderer._dropPeerStandInInk` | effectsRenderer.js | 5365 | 15 | yes | - | - | - | - |
| `EffectsRenderer._peerFigFrames` | effectsRenderer.js | 5390 | 25 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_LOAD_MS`, `PEER_FIG_RETRY_MS`, `STANDIN_INK`, `_figBytes`, `_loadStandInImg`, `_sliceStandIn` | - |
| `EffectsRenderer._peerFigBytes` | effectsRenderer.js | 5424 | 10 | yes | - | - | `PEER_FIG_EST` | - |
| `EffectsRenderer._peerFigRoom` | effectsRenderer.js | 5440 | 19 | yes | - | - | `PEER_FIG_BUDGET` | - |
| `EffectsRenderer._dropPeerFig` | effectsRenderer.js | 5460 | 17 | yes | - | - | - | - |
| `EffectsRenderer._gearStripPending` | effectsRenderer.js | 5486 | 10 | yes | - | - | `PEER_GREAVES_WAIT_MS` | - |
| `EffectsRenderer._peerFigure` | effectsRenderer.js | 5520 | 55 | yes | - | - | `CHOP_GEAR_FW`, `COOK_FW`, `FIRE_FW`, `FIRE_LEGLESS_OFF`, `_localStandInColourKey`, `_peerChopArt`, `_peerStandInColours` | - |
| `EffectsRenderer._peerFigureReady` | effectsRenderer.js | 5587 | 4 | yes | - | - | - | - |
| `EffectsRenderer._loadFireStrips` | effectsRenderer.js | 5627 | 19 | yes | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fireWantLegless` | effectsRenderer.js | 5664 | 5 | - | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fetchAndBakeFire` | effectsRenderer.js | 5670 | 39 | yes | - | `FIRE_SKIN_OPTS` | `FIRE_FH`, `FIRE_FW`, `FIRE_URL`, `_bakeFireSplit`, `_loadStandInImg`, `_probeStandInSkin`, `_sliceStandIn`, `_standInColourKey` | - |
| `EffectsRenderer._seatStandInTraits` | effectsRenderer.js | 5751 | 7 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOn` | effectsRenderer.js | 5758 | 14 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer.update` | effectsRenderer.js | 5789 | 64 | yes | - | `_bakeFrame` | `GPU_WAIT_MS`, `REMOTE_BAKE_CACHE_MAX`, `_trimBakeCache`, `popupZoomK` | drop-lines, elem-windup, fire-strip, keep-as-image, mirror-audit, owner-icons, renderer-life, storm-eye, water-frog |
| `EffectsRenderer._dot` | effectsRenderer.js | 5909 | 19 | yes | - | - | `hardDotTex` | - |
| `EffectsRenderer._hideSpareDots` | effectsRenderer.js | 5929 | 21 | yes | - | - | - | - |
| `EffectsRenderer._updateParticles` | effectsRenderer.js | 5955 | 171 | yes | - | - | `_peerNotDrawn`, `cssToHex` | - |
| `EffectsRenderer._updateDamageNumbers` | effectsRenderer.js | 6243 | 236 | yes | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `POPUP_ICONS`, `TIGHT_POPUP_ICONS`, `_dmgBmpReady` | `DMG_BMP_BAKE_PX`, `DMG_BMP_FONT`, `DMG_BMP_RE`, `DMG_CRIT_FONT_PX`, `DMG_DIGIT_RE`, `DMG_FONT_PX`, `DMG_SCALE`, `DMG_WORDS_ON`, `DMG_WORD_BAKE_PX`, `DMG_WORD_FONT`, `MSG_EDGE_PX`, `MSG_FONT_PX`, `isAsciiOnly`, `isDamagePopup`, `msgWrapW`, `popupZoomK`, `wrapMessage` | traps-phone-memory |
| `EffectsRenderer._updateScreenFlash` | effectsRenderer.js | 6708 | 41 | yes | - | - | `clearIfDrawn`, `cssToHex` | - |
| `EffectsRenderer._updateAtmosphere` | effectsRenderer.js | 6752 | 29 | yes | - | - | `clearIfDrawn` | - |
| `EffectsRenderer._updateProjectiles` | effectsRenderer.js | 6796 | 319 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `MAGIC_BOLT_FRAMES`, `MAGIC_SPECIAL` | `HOT_SPECIAL_ARROW`, `_projSrcPx`, `cssToHex`, `stuckShaftScale` | - |
| `EffectsRenderer._placeCookFood` | effectsRenderer.js | 7429 | 29 | yes | - | `GESTURE_TOOLS` | `_fxLoad` | - |
| `EffectsRenderer._placeMagicBolt` | effectsRenderer.js | 7472 | 47 | yes | - | `MAGIC_BOLT_FRAMES` | `MAGIC_BOLT_FRAME_MS` | - |
| `EffectsRenderer._placeSpecialFx` | effectsRenderer.js | 7550 | 48 | yes | - | - | - | - |
| `EffectsRenderer.projScaleProbe` | effectsRenderer.js | 7652 | 1 | yes | - | - | - | - |
| `EffectsRenderer.stuckScaleProbe` | effectsRenderer.js | 7653 | 1 | yes | - | - | - | - |
| `EffectsRenderer._updateProjectileTrail` | effectsRenderer.js | 7655 | 26 | - | - | - | - | - |
| `EffectsRenderer._fillPoly` | effectsRenderer.js | 7699 | 6 | - | - | - | - | - |
| `EffectsRenderer._drawArrow` | effectsRenderer.js | 7711 | 21 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._placeArrowSprite` | effectsRenderer.js | 7764 | 24 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._noteJetStream` | effectsRenderer.js | 7816 | 35 | yes | - | `ARROW_PINE`, `JET_STREAM` | `JET_MAX`, `JET_STREAM_ENABLED` | - |
| `EffectsRenderer._drawJetStreams` | effectsRenderer.js | 7895 | 22 | yes | - | `JET_STREAM` | `JET_ALPHA`, `JET_LINGER_MS` | - |
| `EffectsRenderer._placeJetSprite` | effectsRenderer.js | 7931 | 18 | yes | - | - | - | - |
| `EffectsRenderer._resetArrowSprites` | effectsRenderer.js | 7963 | 10 | yes | - | - | - | - |
| `EffectsRenderer._drawStuckArrow` | effectsRenderer.js | 7979 | 17 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._drawStuckMagicShard` | effectsRenderer.js | 8020 | 8 | yes | - | - | - | - |
| `EffectsRenderer._updateTelegraphs` | effectsRenderer.js | 8030 | 16 | yes | - | - | - | - |
| `EffectsRenderer._updateOverlays` | effectsRenderer.js | 8050 | 396 | yes | - | - | `_mixHex` | - |
| `EffectsRenderer._renderChatBubble` | effectsRenderer.js | 9344 | 130 | yes | - | - | `bubbleGradient`, `isAsciiOnly` | - |
| `EffectsRenderer._updateChatBubbles` | effectsRenderer.js | 9628 | 57 | yes | - | - | `NPC_BUBBLE_REACH`, `_peerNotDrawn`, `bandWithEmote` | traps-page-rules |
| `EffectsRenderer._updateEmotePops` | effectsRenderer.js | 9760 | 83 | yes | - | `_emoteActive`, `_emoteEms`, `_emoteIds`, `_emoteSrcs` | `EMOTE_POP_FONT`, `_peerNotDrawn`, `bandWithEmote` | - |
| `EffectsRenderer._updateHUD` | effectsRenderer.js | 9856 | 21 | yes | - | - | `clearIfDrawn` | - |
| `EffectsRenderer.disposeLootById` | effectsRenderer.js | 9903 | 10 | yes | - | - | - | - |
| `EffectsRenderer.disposeLootRef` | effectsRenderer.js | 9920 | 5 | yes | - | - | - | - |
| `EffectsRenderer.flushAllLoot` | effectsRenderer.js | 9934 | 5 | yes | - | - | - | - |
| `EffectsRenderer._renderPileShine` | effectsRenderer.js | 9946 | 82 | yes | - | - | `BEAM_A`, `BEAM_AT_S`, `BEAM_FLICKER`, `BEAM_HALO_A`, `BEAM_MOTES`, `BEAM_ON`, `BEAM_PULSE_HZ`, `BEAM_RISE_S`, `LOOT_BEAMS_MAX`, `MOTE_TEX`, `_hash`, `_hexTint`, `landAgeOf`, `makeBeamTexture`, `makeMoteTexture` | - |
| `EffectsRenderer._disposeLoot` | effectsRenderer.js | 10047 | 29 | yes | - | - | - | - |
| `EffectsRenderer._renderDroppedItem` | effectsRenderer.js | 10098 | 56 | yes | - | `DROP_COUNT_STYLE` | `DROP_ICON_WORLD` | - |
| `EffectsRenderer._renderOwnerLabel` | effectsRenderer.js | 10165 | 31 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._renderShardOverlay` | effectsRenderer.js | 10203 | 18 | yes | - | `SHARD_ICONS` | `applySquash` | - |
| `EffectsRenderer._renderCoinOverlay` | effectsRenderer.js | 10226 | 37 | yes | - | `LABEL_STYLE` | `applySquash` | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._renderRareItems` | effectsRenderer.js | 10280 | 76 | yes | - | `_AT_MIDDLE` | `applySquash`, `landAgeOf`, `lootHop` | loot-clock |
| `EffectsRenderer._updateGroundLoot` | effectsRenderer.js | 10367 | 403 | yes | - | `LABEL_STYLE`, `LABEL_STYLE_EMOJI`, `_AT_MIDDLE` | `applySquash`, `cssToHex`, `landAgeOf`, `lootHop`, `pileLayout` | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._updateFootprints` | effectsRenderer.js | 11019 | 33 | yes | - | - | `PRINT_ALPHA`, `PRINT_TTL_MS` | - |
| `EffectsRenderer._updateGroundSplatter` | effectsRenderer.js | 11083 | 54 | yes | - | - | `cssToHex`, `groundDecalTex` | - |
| `EffectsRenderer._updateArrowSnaps` | effectsRenderer.js | 11181 | 22 | yes | - | - | - | - |
| `EffectsRenderer._spawnArrowSnap` | effectsRenderer.js | 11204 | 40 | yes | - | `ARROW_PINE` | `SNAP_G`, `SNAP_MAX`, `splinterTex` | - |
| `EffectsRenderer._stepSnapPiece` | effectsRenderer.js | 11255 | 28 | - | - | - | `SNAP_FADE_MS`, `SNAP_G`, `SNAP_REST_MS` | - |
| `EffectsRenderer._killArrowSnap` | effectsRenderer.js | 11285 | 4 | - | - | - | - | - |
| `EffectsRenderer._clearArrowSnaps` | effectsRenderer.js | 11290 | 4 | yes | - | - | - | - |
| `EffectsRenderer.arrowSnapProbe` | effectsRenderer.js | 11296 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propById` | effectsRenderer.js | 11332 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propRec` | effectsRenderer.js | 11345 | 4 | yes | - | - | - | - |
| `EffectsRenderer._propOverlay` | effectsRenderer.js | 11350 | 15 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._clearPropMarks` | effectsRenderer.js | 11366 | 12 | yes | - | - | - | - |
| `EffectsRenderer._killPropMark` | effectsRenderer.js | 11379 | 5 | - | - | - | - | - |
| `EffectsRenderer._spawnPropMark` | effectsRenderer.js | 11386 | 67 | yes | - | - | `HOT_SPECIAL_ARROW`, `PROP_ARROWS_PER_PROP`, `PROP_MARKS_MAX`, `PROP_SCORCHES_PER_PROP`, `PROP_SLASHES_PER_PROP`, `propSlashTex` | - |
| `EffectsRenderer._stuckArrowTex` | effectsRenderer.js | 11462 | 7 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._poseStuckArrow` | effectsRenderer.js | 11475 | 14 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._placePropArrow` | effectsRenderer.js | 11493 | 33 | yes | - | - | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._heatPropArrow` | effectsRenderer.js | 11538 | 5 | - | - | - | - | - |
| `EffectsRenderer._volleyWorld` | effectsRenderer.js | 11547 | 3 | - | - | - | - | - |
| `EffectsRenderer._reapPropArrows` | effectsRenderer.js | 11553 | 9 | yes | - | - | - | - |
| `EffectsRenderer._updatePropMarks` | effectsRenderer.js | 11563 | 62 | yes | - | - | `HOT_SPECIAL_ARROW`, `SCORCH_GLOW_MS` | - |
| `EffectsRenderer.propDepthProbe` | effectsRenderer.js | 11637 | 10 | yes | - | - | - | - |
| `EffectsRenderer.propMarksProbe` | effectsRenderer.js | 11650 | 25 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `_PROP_SLASH_TEX` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._updateDebrisBursts` | effectsRenderer.js | 11680 | 18 | yes | - | - | - | - |
| `EffectsRenderer._disposeNode` | effectsRenderer.js | 11710 | 15 | - | - | - | - | - |
| `EffectsRenderer._peerWorkNodes` | effectsRenderer.js | 11743 | 30 | - | - | - | `PEER_SEAT_MATCH_PX` | - |
| `EffectsRenderer._treeSeeThrough` | effectsRenderer.js | 11780 | 21 | - | - | - | - | - |
| `EffectsRenderer._updateGatherNodes` | effectsRenderer.js | 11813 | 179 | yes | - | `_trapArt` | `cssToHex`, `nodeSpriteTex` | - |
| `EffectsRenderer._drawGatherHpBar` | effectsRenderer.js | 12174 | 38 | yes | - | - | - | - |
| `EffectsRenderer._nodeLabelAt` | effectsRenderer.js | 12253 | 20 | yes | - | - | - | - |
| `EffectsRenderer._nodeHpBarAt` | effectsRenderer.js | 12283 | 27 | - | - | - | - | - |
| `EffectsRenderer._updateMonsterImpacts` | effectsRenderer.js | 12321 | 6 | yes | - | - | - | - |
| `EffectsRenderer._updateSlimeShockwaves` | effectsRenderer.js | 12341 | 39 | yes | - | - | `SLIME_WAVE_MS` | - |
| `EffectsRenderer.snowballBurstProbe` | effectsRenderer.js | 12388 | 4 | yes | - | `SNOWBALL_BURST` | - | - |
| `EffectsRenderer.sootProbe` | effectsRenderer.js | 12394 | 1 | yes | - | - | - | - |
| `EffectsRenderer.slimeShockwaveProbe` | effectsRenderer.js | 12397 | 4 | yes | - | - | - | - |
| `EffectsRenderer._updateSnowballBursts` | effectsRenderer.js | 12405 | 36 | yes | - | `SNOWBALL_BURST` | `SNOWBALL_BURST_MS` | mirror-audit |
| `EffectsRenderer._updateArrowBlasts` | effectsRenderer.js | 12463 | 37 | yes | - | `ARROW_BLAST` | `ARROW_BLAST_D`, `ARROW_BLAST_MS` | - |
| `EffectsRenderer.arrowBlastProbe` | effectsRenderer.js | 12510 | 11 | yes | - | `ARROW_BLAST` | - | - |
| `EffectsRenderer._landAuraCap` | effectsRenderer.js | 12523 | 1 | - | - | - | - | - |
| `EffectsRenderer._spawnOreBreak` | effectsRenderer.js | 12531 | 20 | yes | - | `ORE_ICON_TIER_TEX`, `ORE_TEX` | - | - |
| `EffectsRenderer._spawnItemPopup` | effectsRenderer.js | 12555 | 10 | yes | - | - | - | - |
| `EffectsRenderer._advanceItemPops` | effectsRenderer.js | 12567 | 18 | yes | - | - | - | - |
| `EffectsRenderer._advanceOreBreaks` | effectsRenderer.js | 12590 | 26 | yes | - | - | `ORE_BREAK_LIE_MS`, `ORE_POP_LATE_MS`, `ORE_SPLIT_MS` | - |
| `EffectsRenderer._oreBreakVol` | effectsRenderer.js | 12649 | 6 | - | - | - | - | - |
| `EffectsRenderer._oreCrack` | effectsRenderer.js | 12661 | 10 | yes | - | - | - | - |
| `EffectsRenderer._oreSplit` | effectsRenderer.js | 12674 | 7 | yes | - | `ORE_ICON_TEX` | - | - |
| `EffectsRenderer._spawnCookSmoke` | effectsRenderer.js | 12697 | 20 | yes | - | - | `debrisDotTex` | - |
| `EffectsRenderer._updateCookSmoke` | effectsRenderer.js | 12721 | 19 | yes | - | - | - | - |
| `EffectsRenderer._updateFxBursts` | effectsRenderer.js | 12741 | 30 | yes | - | `EFFECT_BURSTS` | `FX_BURST_MS` | - |
| `EffectsRenderer._updateFireTrail` | effectsRenderer.js | 12800 | 52 | yes | - | - | - | - |
| `EffectsRenderer._updateWhirlVortex` | effectsRenderer.js | 12892 | 44 | yes | - | - | - | - |
| `EffectsRenderer._buildSmithFx` | effectsRenderer.js | 12963 | 40 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | - |
| `EffectsRenderer._updateSmithing` | effectsRenderer.js | 13015 | 57 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | sound-cues, townsfolk-walk |
| `EffectsRenderer._updateElemStatusFx` | effectsRenderer.js | 13112 | 451 | yes | - | - | `BURN_BLAZE`, `GOO_HOLD`, `PEER_FIRES`, `_peerNotDrawn` | - |
| `EffectsRenderer._updateAbilityWindups` | effectsRenderer.js | 13672 | 49 | yes | - | - | `_peerNotDrawn` | - |
| `EffectsRenderer._markWhirlCatch` | effectsRenderer.js | 13756 | 59 | yes | - | - | `WHIRL_CATCH_MAX` | - |
| `EffectsRenderer._updateCatchFlights` | effectsRenderer.js | 13834 | 44 | yes | - | - | - | - |
| `EffectsRenderer._updateFishingHole` | effectsRenderer.js | 13896 | 18 | yes | - | - | - | - |
| `EffectsRenderer._drawFishingHole` | effectsRenderer.js | 13928 | 15 | yes | - | - | - | - |
| `EffectsRenderer._updateCampfire` | effectsRenderer.js | 13958 | 3 | yes | - | - | `FIRE_FRAME_MS` | - |
| `EffectsRenderer._updateFiremaking` | effectsRenderer.js | 13964 | 64 | yes | - | - | `FIRE_FH`, `FIRE_FRAME_MS`, `FIRE_FW`, `_fireFrameShift`, `_localBuild` | - |
| `EffectsRenderer._peerChopTree` | effectsRenderer.js | 14118 | 19 | - | - | - | `PEER_CHOP_REACH`, `PEER_GATHER_NODE_TTL_MS` | - |
| `EffectsRenderer._updateRemoteExtraction` | effectsRenderer.js | 14151 | 261 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_FH`, `FIRE_FRAME_MS`, `FIRE_FW`, `PEER_CHOP_IDLE_MS`, `PEER_COOK_REACH`, `PEER_FIG_IDLE_MS`, `PEER_INK_IDLE_MS`, `_crossedFrame`, `_fireFrameShift`, `_peerBuild`, `_peerNotDrawn`, `chopStandInSpot`, `cookStandInSpot` | - |
| `EffectsRenderer._tintGearSprite` | effectsRenderer.js | 14712 | 7 | - | - | - | `_standInTints` | - |
| `EffectsRenderer._weaponStrip` | effectsRenderer.js | 14737 | 9 | yes | - | - | - | - |
| `EffectsRenderer._gearStripFrame` | effectsRenderer.js | 14747 | 76 | yes | - | `_combatTrimFrames`, `_combatTrimStats`, `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | loader-retries, picture-door |
| `EffectsRenderer._shirtId` | effectsRenderer.js | 14929 | 6 | - | - | - | - | - |
| `EffectsRenderer._myShirtLook` | effectsRenderer.js | 14942 | 7 | yes | - | - | `_shirtLookOf` | - |
| `EffectsRenderer._peerShirtLook` | effectsRenderer.js | 14949 | 10 | - | - | - | `_shirtLookOf` | - |
| `EffectsRenderer._dressedShirtFrame` | effectsRenderer.js | 14964 | 56 | yes | - | `_fxPreload` | `SHIRT_PATTERN_K`, `_dressedKeyOf` | picture-door |
| `EffectsRenderer._evictDressed` | effectsRenderer.js | 15025 | 10 | yes | - | - | `DRESSED_MAX` | - |
| `EffectsRenderer._warmDressedShirts` | effectsRenderer.js | 15038 | 17 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_FW` | - |
| `EffectsRenderer._placeSwingShirt` | effectsRenderer.js | 15057 | 22 | yes | - | - | - | - |
| `EffectsRenderer._peerStandInArt` | effectsRenderer.js | 15124 | 7 | - | - | - | `_twinWouldDiffer` | - |
| `EffectsRenderer._greavesShapeOnce` | effectsRenderer.js | 15144 | 22 | yes | - | `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | picture-door |
| `EffectsRenderer._noteGreavesShape` | effectsRenderer.js | 15169 | 15 | yes | - | - | `STANDIN_LEGS_OFF` | loader-retries |
| `EffectsRenderer._greavesUnder` | effectsRenderer.js | 15187 | 8 | yes | - | `_standInLegsUse` | - | - |
| `EffectsRenderer._legsUnderFor` | effectsRenderer.js | 15198 | 6 | yes | - | - | - | held-sweep |
| `EffectsRenderer._legsWornFor` | effectsRenderer.js | 15205 | 4 | yes | - | `_standInLegsUse` | - | held-sweep |
| `EffectsRenderer._rebakeLegBodies` | effectsRenderer.js | 15210 | 11 | yes | - | - | - | - |
| `EffectsRenderer._remoteBodyFramesFor` | effectsRenderer.js | 15226 | 29 | yes | - | `_bakeFrame`, `_standInLegsUse` | `_legsLookHas`, `_sliceStandIn`, `_standInLook`, `_trimBakeCache` | - |
| `EffectsRenderer._remoteSheetFramesFor` | effectsRenderer.js | 15271 | 24 | yes | - | `_bakeFrame` | `_sliceStandIn`, `_standInLook`, `_trimBakeCache` | - |
| `EffectsRenderer._placeJogLegs` | effectsRenderer.js | 15310 | 50 | yes | - | - | `_standInTints` | - |
| `EffectsRenderer._ensureRemoteSwordSet` | effectsRenderer.js | 15432 | 9 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOnFor` | effectsRenderer.js | 15452 | 12 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer._updateRemoteSwordSwings` | effectsRenderer.js | 15470 | 161 | yes | - | `SWORD_SLASH` | `_peerBuild`, `_peerNotDrawn`, `_swingBehind` | - |
| `EffectsRenderer._ensureRemoteBowSet` | effectsRenderer.js | 15720 | 12 | yes | - | - | - | - |
| `EffectsRenderer._updateRemoteBowShots` | effectsRenderer.js | 15751 | 127 | yes | - | - | `BLOCK_POSE_FRAME`, `_peerBuild`, `_peerNotDrawn` | - |
| `EffectsRenderer._publishPeerBlockArms` | effectsRenderer.js | 15937 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placePeerBlockHands` | effectsRenderer.js | 15962 | 56 | yes | - | - | - | - |
| `EffectsRenderer._orderSwingWeapon` | effectsRenderer.js | 16027 | 11 | - | - | - | - | - |
| `EffectsRenderer._placeStandInShield` | effectsRenderer.js | 16052 | 49 | yes | - | - | - | - |
| `EffectsRenderer._updateSwordSwing` | effectsRenderer.js | 16136 | 134 | yes | - | `SWORD_SLASH` | `_swingBehind` | - |
| `EffectsRenderer._placeBlockOffHand` | effectsRenderer.js | 16398 | 12 | yes | - | - | - | - |
| `EffectsRenderer._placeOffHandWeapon` | effectsRenderer.js | 16423 | 64 | - | - | - | - | - |
| `EffectsRenderer._predictBowGrip` | effectsRenderer.js | 16598 | 20 | yes | - | - | `BOW_GRIP_GUESS_OFF` | - |
| `EffectsRenderer._updateBowShot` | effectsRenderer.js | 16623 | 137 | yes | - | - | `BLOCK_POSE_FRAME` | - |
| `EffectsRenderer.captureAttackFrames` | effectsRenderer.js | 16910 | 84 | yes | - | `ARROW_PINE`, `SWORD_SLASH` | - | - |
| `EffectsRenderer._photographFar` | effectsRenderer.js | 17029 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placeCookFigure` | effectsRenderer.js | 17056 | 38 | yes | - | - | `_localBuild` | - |
| `EffectsRenderer._loadFarmStrips` | effectsRenderer.js | 17172 | 36 | yes | - | - | - | - |
| `EffectsRenderer._farmReadyNow` | effectsRenderer.js | 17218 | 6 | yes | - | - | - | - |
| `EffectsRenderer._farmUnderWanted` | effectsRenderer.js | 17231 | 1 | - | - | - | - | - |
| `EffectsRenderer._bakeFarmBodies` | effectsRenderer.js | 17232 | 34 | yes | - | - | `FARM_MIN_BLOB`, `_loadStandInImg`, `_probeStandInSkin`, `_sliceStandIn`, `_standInColourKey` | - |
| `EffectsRenderer._warmFarmDressed` | effectsRenderer.js | 17277 | 14 | yes | - | - | `_dressedKeyOf` | - |
| `EffectsRenderer._dropGearStrip` | effectsRenderer.js | 17294 | 10 | yes | - | `_combatTrimFrames` | - | - |
| `EffectsRenderer._freeFarm` | effectsRenderer.js | 17306 | 34 | yes | - | - | - | - |
| `EffectsRenderer._peerFarmFigure` | effectsRenderer.js | 17359 | 14 | yes | - | - | `_peerChopArt`, `_peerStandInColours` | - |
| `EffectsRenderer._drawPeerFarmer` | effectsRenderer.js | 17377 | 75 | yes | - | - | `_peerBuild`, `farmCrownMed`, `makeFarmFigProxy`, `placeFarmFigProxy` | - |
| `EffectsRenderer._destroyPeerFarmer` | effectsRenderer.js | 17465 | 8 | - | - | - | - | art-holds |
| `EffectsRenderer._peerFarmersProbe` | effectsRenderer.js | 17475 | 20 | yes | - | - | - | - |
| `EffectsRenderer._updateFarmWork` | effectsRenderer.js | 17504 | 96 | yes | - | - | `_localBuild`, `farmCrownMed`, `placeFarmFigProxy` | - |
| `EffectsRenderer.setCaptureRenderer` | effectsRenderer.js | 17660 | 1 | yes | - | - | - | - |
| `EffectsRenderer._peerOnWorker` | effectsRenderer.js | 17683 | 33 | yes | - | `_bakeFrame` | `_trimBakeCache` | - |
| `EffectsRenderer._dressedOnWorker` | effectsRenderer.js | 17725 | 30 | yes | - | - | - | - |
| `EffectsRenderer._own` | effectsRenderer.js | 17755 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._gpuOnly` | effectsRenderer.js | 17778 | 10 | yes | - | - | - | - |
| `EffectsRenderer._gpuOnceDrawn` | effectsRenderer.js | 17793 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._release` | effectsRenderer.js | 17798 | 7 | yes | - | - | - | - |
| `EffectsRenderer._letGo` | effectsRenderer.js | 17805 | 16 | yes | - | - | - | - |
| `EffectsRenderer.destroy` | effectsRenderer.js | 17839 | 41 | yes | - | - | - | art-holds, death-zones, elem-windup, fish-top-evict, keep-as-image, loader-retries, loot-clock, renderer-life, storm-eye, townsfolk-walk, water-frog, weapon-feel, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._slimeTexelWorld` | effectsRenderer.js | 17917 | 1 | - | - | - | - | - |
| `EffectsRenderer._filmScale` | effectsRenderer.js | 17919 | 1 | yes | - | - | - | - |
| `EffectsRenderer.captureFxFilm` | effectsRenderer.js | 17921 | 20 | yes | - | - | - | - |
| `EffectsRenderer._filmShoot` | effectsRenderer.js | 17947 | 13 | - | - | - | - | - |
| `EffectsRenderer._filmGunk` | effectsRenderer.js | 17971 | 43 | yes | - | - | - | - |
| `EffectsRenderer._filmStuck` | effectsRenderer.js | 18039 | 36 | yes | - | `ARROW_PINE` | `stuckShaftScale` | - |
| `EffectsRenderer._filmHotArrow` | effectsRenderer.js | 18088 | 46 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._filmCrash` | effectsRenderer.js | 18151 | 29 | yes | - | - | - | - |
| `EffectsRenderer._updateExtractionCue` | effectsRenderer.js | 18187 | 230 | yes | - | `GESTURE_TOOLS` | `CHOP_GEAR_FW`, `_crossedFrame`, `_localBuild`, `chopStandInSpot`, `cookStandInSpot` | - |
| `EffectsRenderer.clear` | effectsRenderer.js | 18692 | 65 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
