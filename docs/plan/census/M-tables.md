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
| lone constants | 67 | 71 |
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
- effectsRenderer.js: `BLOCK_POSE_FRAME`:37, `PEER_CHOP_IDLE_MS`:157, `GPU_WAIT_MS`:158, `PEER_INK_CAP`:183, `PEER_INK_IDLE_MS`:184, `PRINT_TTL_MS`:203, `PRINT_ALPHA`:204, `FARM_MIN_BLOB`:289, `PEER_CHOP_REACH`:316, `PEER_COOK_REACH`:317, `PEER_GATHER_NODE_TTL_MS`:318, `PEER_SEAT_MATCH_PX`:323, `CHOP_GEAR_FW`:358, `DRESSED_MAX`:391, `FIRE_FRAME_MS`:457, `PEER_FIG_BUDGET`:595, `PEER_FIG_IDLE_MS`:603, `PEER_FIG_LOAD_MS`:611, `PEER_FIG_RETRY_MS`:612, `PEER_GREAVES_WAIT_MS`:613, `GEAR_STRIP_TIMEOUT_MS`:614, `DMG_FONT_PX`:893, `DMG_CRIT_FONT_PX`:894, `MSG_MAX_LINES`:953, `MSG_EDGE_PX`:954, `DMG_CRIT_COLOR`:978, `MAGIC_BOLT_FRAME_MS`:1058, `HOT_SPECIAL_ARROW`:1154, `SWORD_FEEL_AUTHORED_DIR`:1172, `JET_STREAM_ENABLED`:1367, `JET_LINGER_MS`:1368, `JET_ALPHA`:1372, `JET_MAX`:1376, `FX_BURST_MS`:1432, `SLIME_WAVE_MS`:1490, `ARROW_BLAST_MS`:1491, `ARROW_BLAST_D`:1492, `SNOWBALL_BURST_MS`:1510, `SNAP_G`:1628, `SNAP_REST_MS`:1629, `SNAP_FADE_MS`:1630, `SNAP_MAX`:1631, `PROP_SLASHES_PER_PROP`:1632, `PROP_ARROWS_PER_PROP`:1635, `PROP_SCORCHES_PER_PROP`:1636, `PROP_MARKS_MAX`:1637, `SCORCH_GLOW_MS`:1638, `ORE_SPLIT_MS`:1924, `ORE_POP_LATE_MS`:1937, `DMG_BMP_BAKE_PX`:2009, `DMG_WORD_BAKE_PX`:2012, `DMG_WORD_PAGE_PX`:2013, `NPC_BUBBLE_REACH`:2202, `EMOTE_POP_FONT`:2207, `REMOTE_BAKE_CACHE_MAX`:2312, `BEAM_RISE_S`:2378, `BEAM_A`:2379, `BEAM_HALO_A`:2380, `BEAM_FLICKER`:2381, `BEAM_PULSE_HZ`:2382, `BEAM_MOTES`:2383, `MOTE_TEX`:2384, `LOOT_BEAMS_MAX`:2387, `PEER_FIRES`:2393, `LAND_S`:2459, `POP_JUMP`:2461, `POP_DELAY_S`:2462, `POP_ARC_S`:2463, `POP_BOUNCE_S`:2464, `SMITH_FLAME_H0`:2580, `WHIRL_CATCH_MAX`:2586

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
| `_fxPreload` | effectsRenderer.js | 26 | written: .push() (line 38) | loader-retries |
| `_combatTrimStats` | effectsRenderer.js | 42 | written: assigned (line 14308) | loader-retries |
| `_standInTrimStats` | effectsRenderer.js | 63 | written: assigned (line 134) | - |
| `POPUP_ICONS` | effectsRenderer.js | 980 | written: assigned (line 1028) | - |
| `SHARD_ICONS` | effectsRenderer.js | 1043 | written: assigned (line 1045) | - |
| `MAGIC_BOLT_FRAMES` | effectsRenderer.js | 1057 | written: .push() (line 1068) | - |
| `ARROW_PINE` | effectsRenderer.js | 1227 | written: assigned (line 1269) | - |
| `JET_STREAM` | effectsRenderer.js | 1349 | written: assigned (line 1351) | - |
| `ARROW_BLAST` | effectsRenderer.js | 1488 | written: .push() (line 1501) | - |
| `SNOWBALL_BURST` | effectsRenderer.js | 1509 | written: .push() (line 1524) | - |
| `NODE_SPRITE_TEX` | effectsRenderer.js | 1809 | written: assigned (line 1869) | - |
| `TREE_TEX` | effectsRenderer.js | 1821 | written: assigned (line 1822) | - |
| `ORE_TEX` | effectsRenderer.js | 1831 | written: assigned (line 1833) | pixel-readers |
| `ORE_ICON_TIER_TEX` | effectsRenderer.js | 1896 | written: assigned (line 1899) | - |
| `SMITH_ANVIL` | effectsRenderer.js | 2575 | written: assigned (line 2577) | - |
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
| `_emoteIds` | effectsRenderer.js | 32 | handed on: aliased (line 9191) | - |
| `_emoteSrcs` | effectsRenderer.js | 32 | handed on: aliased (line 9191) | - |
| `_emoteEms` | effectsRenderer.js | 32 | handed on: aliased (line 9191) | - |
| `FIRE_SKIN_OPTS` | effectsRenderer.js | 470 | handed on: an argument (line 5124) | - |
| `ARROW_SPECIAL` | effectsRenderer.js | 1135 | handed on: in a literal (line 1379) | - |
| `MAGIC_SPECIAL` | effectsRenderer.js | 1155 | handed on: in a literal (line 1380) | - |
| `SWORD_SLASH` | effectsRenderer.js | 1164 | handed on: in a literal (line 1381) | - |
| `EFFECT_BURSTS` | effectsRenderer.js | 1415 | handed on: an argument (line 1427) | - |
| `GESTURE_TOOLS` | effectsRenderer.js | 1712 | handed on: an argument (line 1755) | mirror-audit |
| `NODE_SPRITE_SOURCES` | effectsRenderer.js | 1806 | handed on: an argument (line 1868) | - |
| `DMG_ALL_CHARS` | effectsRenderer.js | 2023 | handed on: an argument (line 2028) | - |
| `DMG_DIGIT_CHARS` | effectsRenderer.js | 2024 | handed on: an argument (line 2029) | - |
| `_NO_HOP` | effectsRenderer.js | 2497 | handed on: returned (line 2469) | - |
| `_AT_MIDDLE` | effectsRenderer.js | 2562 | handed on: aliased (line 9736) | loot-clock |
| `_PEER_WORN_SLOTS` | entityRenderer.js | 3141 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 5317 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 600 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 2592 | frozen | - |

<!-- part 5: the code (tools/dev/render-code-census.mjs --write) -->
## 5. The code, counted (v2.3.5347)

Written by `node tools/dev/render-code-census.mjs --write` at 320cc393; the rules are
`tools/guards/lib/renderCode.mjs`'s header. Moves nothing. A **leaf** is a
top-level function that reads no `this` and reaches no module state; its
**level** is 0 when it reads no other in-file function, else one more than
the highest leaf it reads (a function reading a non-leaf has no level).

| | functions | their code lines | leaves | leaf lines | with a level | methods | method lines |
|---|---|---|---|---|---|---|---|
| entityRenderer.js | 116 | 2692 | 42 | 601 | 13 | 20 | 4490 |
| effectsRenderer.js | 41 | 501 | 10 | 91 | 9 | 195 | 8488 |

### The order of the moves: leaves, level by level (largest first in each)

- level 0: 21 functions, 203 code lines
- level 1: 1 functions, 6 code lines

### Every function and method

| name | file | line | code | this | level | module state | in-file names | suites |
|---|---|---|---|---|---|---|---|---|
| `_ensureHudBarTextures` | entityRenderer.js | 228 | 1 | - | 0 | - | `_hudBarLoads` | renderer-life |
| `_crowdK` | entityRenderer.js | 397 | 1 | - | 0 | - | `_noPeerCull` | crowd-cap |
| `_folkSheetsStep` | entityRenderer.js | 539 | 7 | - | - | `_folkJobs` | `_FOLK_SHEETS_ON`, `_folkSheets`, `prewarmFolkBodies` | folk-sheets |
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
| `prewarmFolkBodies` | entityRenderer.js | 1638 | 15 | - | - | `_folkJobs` | `_remoteBodyArt` | folk-bakes, folk-sheets, townsfolk-walk, traps-page-rules |
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
| `EntityRenderer._updateNPCs` | entityRenderer.js | 15653 | 309 | yes | - | `NAME_STYLE` | `FOLK_FAR_MARGIN`, `_attachNamePill`, `_bindSmallTex`, `_folkSheetsStep`, `_npcDrawn`, `_questPinTex`, `_smallTex`, `_updateNamePill` | folk-sheets, traps-page-rules, traps-phone-memory |
| `EntityRenderer._updatePlayerHud` | entityRenderer.js | 16263 | 215 | yes | - | `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `PLAYER_BAND_Y`, `PLAYER_HPBAR_H`, `RES_EN_Y`, `_ensureHudBarTextures`, `_hpFillTexFor` | traps-page-rules |
| `EntityRenderer.clear` | entityRenderer.js | 16669 | 15 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
| `_fxLoad` | effectsRenderer.js | 38 | 1 | - | - | `_fxPreload` | - | owner-icons, picture-door, pixel-readers |
| `effectsAnimationsReady` | effectsRenderer.js | 39 | 1 | - | - | `_fxPreload` | - | - |
| `_standInLook` | effectsRenderer.js | 95 | 5 | - | 0 | - | - | held-sweep |
| `_legsLookHas` | effectsRenderer.js | 101 | 1 | - | 0 | - | `LEGS_LOOK_OFF` | held-sweep |
| `_sliceStandIn` | effectsRenderer.js | 103 | 34 | - | - | `_standInTrimFrames`, `_standInTrimStats` | - | gpu-only |
| `_bakeChopStrip` | effectsRenderer.js | 167 | 6 | - | - | - | `_sliceStandIn` | townsfolk-walk |
| `farmCrownMed` | effectsRenderer.js | 296 | 9 | - | - | `_farmCrownMid` | - | - |
| `_fireLogToBark` | effectsRenderer.js | 500 | 23 | - | - | `_fireLogWood` | `FIRE_LOG_LIT_OFF` | - |
| `_bakeFireSplit` | effectsRenderer.js | 528 | 8 | - | - | `FIRE_SKIN_OPTS` | `FIRE_LEGLESS_OFF`, `FIRE_LOG_OFF`, `_fireLogToBark` | - |
| `_peerStandInColours` | effectsRenderer.js | 618 | 6 | - | 0 | - | - | - |
| `_localStandInColourKey` | effectsRenderer.js | 625 | 3 | - | 0 | - | - | - |
| `_isGatheringStandIn` | effectsRenderer.js | 727 | 4 | - | - | `FARM_POSES` | - | - |
| `_placeStandInCapeOn` | effectsRenderer.js | 819 | 26 | - | - | `_capeProbe` | `_STAND_IN_CAPE_OVER_BODY` | - |
| `isDamagePopup` | effectsRenderer.js | 911 | 8 | - | - | `DMG_MARK_ICONS` | `DMG_PLAIN_RE` | - |
| `wrapMessage` | effectsRenderer.js | 960 | 12 | - | 0 | - | `MSG_MAX_LINES` | - |
| `_loadPopupIcon` | effectsRenderer.js | 1025 | 12 | - | - | `POPUP_ICONS`, `TIGHT_POPUP_ICONS` | `POPUP_ICON_SRC`, `_fxLoad` | picture-door, pixel-readers |
| `stuckShaftScale` | effectsRenderer.js | 1288 | 5 | - | - | `ARROW_PINE` | - | - |
| `debrisDotTex` | effectsRenderer.js | 1446 | 14 | - | - | `_DEBRIS_DOT_TEX` | - | traps-page-rules |
| `ensureArrowBlastTex` | effectsRenderer.js | 1494 | 14 | - | - | `ARROW_BLAST`, `_arrowBlastLoad` | `_fxLoad` | traps-page-rules |
| `ensureSnowballBurstTex` | effectsRenderer.js | 1517 | 14 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | `_fxLoad` | mirror-audit, traps-page-rules |
| `freeFrostImpactTex` | effectsRenderer.js | 1549 | 15 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | - | traps-phone-memory |
| `propSlashTex` | effectsRenderer.js | 1585 | 25 | - | - | `_PROP_SLASH_TEX` | - | traps-page-rules |
| `splinterTex` | effectsRenderer.js | 1618 | 10 | - | - | `_SPLINTER_TEX` | - | traps-page-rules |
| `hardDotTex` | effectsRenderer.js | 1663 | 10 | - | - | `_HARD_DOT_TEX` | - | traps-page-rules |
| `groundDecalTex` | effectsRenderer.js | 1679 | 17 | - | - | `_GROUND_DECAL_TEX` | - | traps-page-rules |
| `nodeSpriteTex` | effectsRenderer.js | 1903 | 5 | - | - | `NODE_SPRITE_TEX`, `ORE_TEX`, `TREE_TEX` | - | - |
| `_installDmgFont` | effectsRenderer.js | 2027 | 5 | - | - | `DMG_ALL_CHARS`, `DMG_DIGIT_CHARS` | `DMG_BMP_BAKE_PX`, `DMG_WORD_BAKE_PX`, `DMG_WORD_PAGE_PX` | - |
| `_dmgFontsNow` | effectsRenderer.js | 2034 | 1 | - | 0 | - | - | - |
| `_reinstallDmgFont` | effectsRenderer.js | 2060 | 14 | - | - | `_dmgFontSig` | `_dmgLog`, `_installDmgFont` | - |
| `dmgFontNeedsRebuild` | effectsRenderer.js | 2090 | 1 | - | - | `_dmgBmpReady`, `_dmgPagesGone` | - | - |
| `_letGoOfDmgPages` | effectsRenderer.js | 2091 | 10 | - | - | `_dmgPagesGone` | `_dmgFontsNow`, `_dmgLog` | - |
| `_dmgLog` | effectsRenderer.js | 2120 | 3 | - | - | `_dmgPagesGone` | - | - |
| `prewarmDmgFontPipe` | effectsRenderer.js | 2123 | 43 | - | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `_dmgBmpReady`, `_dmgPagesGone` | `DMG_BMP_BAKE_PX`, `DMG_WORD_BAKE_PX`, `_dmgLog`, `_letGoOfDmgPages`, `_reinstallDmgFont`, `dmgFontNeedsRebuild` | traps-phone-memory |
| `bubbleGradient` | effectsRenderer.js | 2221 | 14 | - | - | `_chatBubbleGrad` | `_bubbleGrads` | - |
| `cssToHex` | effectsRenderer.js | 2268 | 9 | - | - | `_hexMemo` | - | zone-leftovers |
| `_trimBakeCache` | effectsRenderer.js | 2331 | 13 | - | - | `_bakeFrame` | `REMOTE_BAKE_CACHE_MAX` | traps-phone-memory |
| `makeBeamTexture` | effectsRenderer.js | 2397 | 27 | - | 0 | - | - | traps-page-rules |
| `makeMoteTexture` | effectsRenderer.js | 2426 | 14 | - | 0 | - | `MOTE_TEX` | traps-page-rules |
| `lootPop` | effectsRenderer.js | 2468 | 24 | - | - | `_NO_HOP` | `POP_ARC_S`, `POP_BOUNCE_S`, `POP_DELAY_S`, `POP_JUMP`, `POP_LAND_S` | - |
| `lootHop` | effectsRenderer.js | 2500 | 19 | - | - | `_NO_HOP` | `LAND_S`, `lootPop` | loot-clock |
| `pileLayout` | effectsRenderer.js | 2546 | 16 | - | 0 | - | - | - |
| `EffectsRenderer.constructor` | effectsRenderer.js | 2597 | 738 | yes | - | `JET_STREAM`, `_fxPreload`, `_standInLegsUse` | `CHOP_GEAR_FW`, `DMG_SCALE`, `JET_LINGER_MS`, `JET_STREAM_ENABLED`, `LEGS_LOOK_OFF`, `MSG_FONT_PX`, `STANDIN_LEGS_OFF`, `_fxLoad`, `_legsLookHas`, `_sliceStandIn`, `_standInLook`, `makeBeamTexture`, `makeMoteTexture` | art-holds, elem-windup, farmwalk, fish-top-evict, held-numbers, keep-as-image, loader-retries, loot-clock, mirror-audit, owner-icons, picture-door, storm-eye, tick, water-frog, phase-table, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._standInTriggers` | effectsRenderer.js | 4339 | 27 | yes | - | - | - | - |
| `EffectsRenderer._loadChopSkinStrips` | effectsRenderer.js | 4378 | 11 | yes | - | - | - | - |
| `EffectsRenderer._bakeChopStrips` | effectsRenderer.js | 4430 | 36 | yes | - | - | `_bakeChopStrip` | - |
| `EffectsRenderer._peerChopFrames` | effectsRenderer.js | 4530 | 27 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_RETRY_MS`, `_bakeChopStrip`, `_peerStandInColours` | - |
| `EffectsRenderer._dropPeerChop` | effectsRenderer.js | 4565 | 14 | yes | - | - | - | - |
| `EffectsRenderer._loadCookStrips` | effectsRenderer.js | 4604 | 12 | yes | - | - | - | - |
| `EffectsRenderer._fetchAndBakeCook` | effectsRenderer.js | 4639 | 9 | yes | - | - | - | - |
| `EffectsRenderer._bakeCookStrips` | effectsRenderer.js | 4676 | 36 | yes | - | - | `_sliceStandIn` | - |
| `EffectsRenderer._peerStandInInk` | effectsRenderer.js | 4756 | 30 | yes | - | - | `PEER_INK_CAP`, `STANDIN_INK`, `_sliceStandIn` | - |
| `EffectsRenderer._dropPeerStandInInk` | effectsRenderer.js | 4789 | 15 | yes | - | - | - | - |
| `EffectsRenderer._peerFigFrames` | effectsRenderer.js | 4814 | 25 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_LOAD_MS`, `PEER_FIG_RETRY_MS`, `STANDIN_INK`, `_sliceStandIn` | - |
| `EffectsRenderer._peerFigBytes` | effectsRenderer.js | 4848 | 10 | yes | - | - | `PEER_FIG_EST` | - |
| `EffectsRenderer._peerFigRoom` | effectsRenderer.js | 4864 | 19 | yes | - | - | `PEER_FIG_BUDGET` | - |
| `EffectsRenderer._dropPeerFig` | effectsRenderer.js | 4884 | 17 | yes | - | - | - | - |
| `EffectsRenderer._gearStripPending` | effectsRenderer.js | 4910 | 10 | yes | - | - | `PEER_GREAVES_WAIT_MS` | - |
| `EffectsRenderer._peerFigure` | effectsRenderer.js | 4944 | 55 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_LEGLESS_OFF`, `_localStandInColourKey`, `_peerStandInColours` | - |
| `EffectsRenderer._peerFigureReady` | effectsRenderer.js | 5011 | 4 | yes | - | - | - | - |
| `EffectsRenderer._loadFireStrips` | effectsRenderer.js | 5051 | 19 | yes | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fireWantLegless` | effectsRenderer.js | 5088 | 5 | - | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fetchAndBakeFire` | effectsRenderer.js | 5094 | 39 | yes | - | `FIRE_SKIN_OPTS` | `FIRE_URL`, `_bakeFireSplit`, `_sliceStandIn` | - |
| `EffectsRenderer._seatStandInTraits` | effectsRenderer.js | 5175 | 7 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOn` | effectsRenderer.js | 5182 | 14 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer.update` | effectsRenderer.js | 5213 | 64 | yes | - | `_bakeFrame` | `GPU_WAIT_MS`, `REMOTE_BAKE_CACHE_MAX`, `_trimBakeCache` | drop-lines, elem-windup, fire-strip, keep-as-image, mirror-audit, owner-icons, renderer-life, storm-eye, water-frog |
| `EffectsRenderer._dot` | effectsRenderer.js | 5333 | 19 | yes | - | - | `hardDotTex` | - |
| `EffectsRenderer._hideSpareDots` | effectsRenderer.js | 5353 | 21 | yes | - | - | - | - |
| `EffectsRenderer._updateParticles` | effectsRenderer.js | 5379 | 171 | yes | - | - | `cssToHex` | - |
| `EffectsRenderer._updateDamageNumbers` | effectsRenderer.js | 5667 | 236 | yes | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `POPUP_ICONS`, `TIGHT_POPUP_ICONS`, `_dmgBmpReady` | `DMG_BMP_BAKE_PX`, `DMG_BMP_RE`, `DMG_CRIT_FONT_PX`, `DMG_DIGIT_RE`, `DMG_FONT_PX`, `DMG_SCALE`, `DMG_WORD_BAKE_PX`, `MSG_EDGE_PX`, `MSG_FONT_PX`, `isDamagePopup`, `wrapMessage` | traps-phone-memory |
| `EffectsRenderer._updateScreenFlash` | effectsRenderer.js | 6132 | 41 | yes | - | - | `cssToHex` | - |
| `EffectsRenderer._updateAtmosphere` | effectsRenderer.js | 6176 | 29 | yes | - | - | - | - |
| `EffectsRenderer._updateProjectiles` | effectsRenderer.js | 6220 | 319 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `MAGIC_BOLT_FRAMES`, `MAGIC_SPECIAL` | `HOT_SPECIAL_ARROW`, `cssToHex`, `stuckShaftScale` | - |
| `EffectsRenderer._placeCookFood` | effectsRenderer.js | 6853 | 29 | yes | - | `GESTURE_TOOLS` | `_fxLoad` | - |
| `EffectsRenderer._placeMagicBolt` | effectsRenderer.js | 6896 | 47 | yes | - | `MAGIC_BOLT_FRAMES` | `MAGIC_BOLT_FRAME_MS` | - |
| `EffectsRenderer._placeSpecialFx` | effectsRenderer.js | 6974 | 48 | yes | - | - | - | - |
| `EffectsRenderer.projScaleProbe` | effectsRenderer.js | 7076 | 1 | yes | - | - | - | - |
| `EffectsRenderer.stuckScaleProbe` | effectsRenderer.js | 7077 | 1 | yes | - | - | - | - |
| `EffectsRenderer._updateProjectileTrail` | effectsRenderer.js | 7079 | 26 | - | - | - | - | - |
| `EffectsRenderer._fillPoly` | effectsRenderer.js | 7123 | 6 | - | - | - | - | - |
| `EffectsRenderer._drawArrow` | effectsRenderer.js | 7135 | 21 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._placeArrowSprite` | effectsRenderer.js | 7188 | 24 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._noteJetStream` | effectsRenderer.js | 7240 | 35 | yes | - | `ARROW_PINE`, `JET_STREAM` | `JET_MAX`, `JET_STREAM_ENABLED` | - |
| `EffectsRenderer._drawJetStreams` | effectsRenderer.js | 7319 | 22 | yes | - | `JET_STREAM` | `JET_ALPHA`, `JET_LINGER_MS` | - |
| `EffectsRenderer._placeJetSprite` | effectsRenderer.js | 7355 | 18 | yes | - | - | - | - |
| `EffectsRenderer._resetArrowSprites` | effectsRenderer.js | 7387 | 10 | yes | - | - | - | - |
| `EffectsRenderer._drawStuckArrow` | effectsRenderer.js | 7403 | 17 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._drawStuckMagicShard` | effectsRenderer.js | 7444 | 8 | yes | - | - | - | - |
| `EffectsRenderer._updateTelegraphs` | effectsRenderer.js | 7454 | 16 | yes | - | - | - | - |
| `EffectsRenderer._updateOverlays` | effectsRenderer.js | 7474 | 396 | yes | - | - | - | - |
| `EffectsRenderer._renderChatBubble` | effectsRenderer.js | 8768 | 130 | yes | - | - | `bubbleGradient` | - |
| `EffectsRenderer._updateChatBubbles` | effectsRenderer.js | 9052 | 57 | yes | - | - | `NPC_BUBBLE_REACH` | traps-page-rules |
| `EffectsRenderer._updateEmotePops` | effectsRenderer.js | 9184 | 83 | yes | - | `_emoteActive`, `_emoteEms`, `_emoteIds`, `_emoteSrcs` | `EMOTE_POP_FONT` | - |
| `EffectsRenderer._updateHUD` | effectsRenderer.js | 9280 | 21 | yes | - | - | - | - |
| `EffectsRenderer.disposeLootById` | effectsRenderer.js | 9327 | 10 | yes | - | - | - | - |
| `EffectsRenderer.disposeLootRef` | effectsRenderer.js | 9344 | 5 | yes | - | - | - | - |
| `EffectsRenderer.flushAllLoot` | effectsRenderer.js | 9358 | 5 | yes | - | - | - | - |
| `EffectsRenderer._renderPileShine` | effectsRenderer.js | 9370 | 82 | yes | - | - | `BEAM_A`, `BEAM_AT_S`, `BEAM_FLICKER`, `BEAM_HALO_A`, `BEAM_MOTES`, `BEAM_ON`, `BEAM_PULSE_HZ`, `BEAM_RISE_S`, `LOOT_BEAMS_MAX`, `MOTE_TEX`, `makeBeamTexture`, `makeMoteTexture` | - |
| `EffectsRenderer._disposeLoot` | effectsRenderer.js | 9471 | 29 | yes | - | - | - | - |
| `EffectsRenderer._renderDroppedItem` | effectsRenderer.js | 9522 | 56 | yes | - | `DROP_COUNT_STYLE` | `DROP_ICON_WORLD` | - |
| `EffectsRenderer._renderOwnerLabel` | effectsRenderer.js | 9589 | 31 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._renderShardOverlay` | effectsRenderer.js | 9627 | 18 | yes | - | `SHARD_ICONS` | - | - |
| `EffectsRenderer._renderCoinOverlay` | effectsRenderer.js | 9650 | 37 | yes | - | `LABEL_STYLE` | - | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._renderRareItems` | effectsRenderer.js | 9704 | 76 | yes | - | `_AT_MIDDLE` | `lootHop` | loot-clock |
| `EffectsRenderer._updateGroundLoot` | effectsRenderer.js | 9791 | 403 | yes | - | `LABEL_STYLE`, `LABEL_STYLE_EMOJI`, `_AT_MIDDLE` | `cssToHex`, `lootHop`, `pileLayout` | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._updateFootprints` | effectsRenderer.js | 10443 | 33 | yes | - | - | `PRINT_ALPHA`, `PRINT_TTL_MS` | - |
| `EffectsRenderer._updateGroundSplatter` | effectsRenderer.js | 10507 | 54 | yes | - | - | `cssToHex`, `groundDecalTex` | - |
| `EffectsRenderer._updateArrowSnaps` | effectsRenderer.js | 10605 | 22 | yes | - | - | - | - |
| `EffectsRenderer._spawnArrowSnap` | effectsRenderer.js | 10628 | 40 | yes | - | `ARROW_PINE` | `SNAP_G`, `SNAP_MAX`, `splinterTex` | - |
| `EffectsRenderer._stepSnapPiece` | effectsRenderer.js | 10679 | 28 | - | - | - | `SNAP_FADE_MS`, `SNAP_G`, `SNAP_REST_MS` | - |
| `EffectsRenderer._killArrowSnap` | effectsRenderer.js | 10709 | 4 | - | - | - | - | - |
| `EffectsRenderer._clearArrowSnaps` | effectsRenderer.js | 10714 | 4 | yes | - | - | - | - |
| `EffectsRenderer.arrowSnapProbe` | effectsRenderer.js | 10720 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propById` | effectsRenderer.js | 10756 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propRec` | effectsRenderer.js | 10769 | 4 | yes | - | - | - | - |
| `EffectsRenderer._propOverlay` | effectsRenderer.js | 10774 | 15 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._clearPropMarks` | effectsRenderer.js | 10790 | 12 | yes | - | - | - | - |
| `EffectsRenderer._killPropMark` | effectsRenderer.js | 10803 | 5 | - | - | - | - | - |
| `EffectsRenderer._spawnPropMark` | effectsRenderer.js | 10810 | 67 | yes | - | - | `HOT_SPECIAL_ARROW`, `PROP_ARROWS_PER_PROP`, `PROP_MARKS_MAX`, `PROP_SCORCHES_PER_PROP`, `PROP_SLASHES_PER_PROP`, `propSlashTex` | - |
| `EffectsRenderer._stuckArrowTex` | effectsRenderer.js | 10886 | 7 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._poseStuckArrow` | effectsRenderer.js | 10899 | 14 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._placePropArrow` | effectsRenderer.js | 10917 | 33 | yes | - | - | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._heatPropArrow` | effectsRenderer.js | 10962 | 5 | - | - | - | - | - |
| `EffectsRenderer._volleyWorld` | effectsRenderer.js | 10971 | 3 | - | - | - | - | - |
| `EffectsRenderer._reapPropArrows` | effectsRenderer.js | 10977 | 9 | yes | - | - | - | - |
| `EffectsRenderer._updatePropMarks` | effectsRenderer.js | 10987 | 62 | yes | - | - | `HOT_SPECIAL_ARROW`, `SCORCH_GLOW_MS` | - |
| `EffectsRenderer.propDepthProbe` | effectsRenderer.js | 11061 | 10 | yes | - | - | - | - |
| `EffectsRenderer.propMarksProbe` | effectsRenderer.js | 11074 | 25 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `_PROP_SLASH_TEX` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._updateDebrisBursts` | effectsRenderer.js | 11104 | 18 | yes | - | - | - | - |
| `EffectsRenderer._disposeNode` | effectsRenderer.js | 11134 | 15 | - | - | - | - | - |
| `EffectsRenderer._peerWorkNodes` | effectsRenderer.js | 11167 | 30 | - | - | - | `PEER_SEAT_MATCH_PX` | - |
| `EffectsRenderer._treeSeeThrough` | effectsRenderer.js | 11204 | 21 | - | - | - | - | - |
| `EffectsRenderer._updateGatherNodes` | effectsRenderer.js | 11237 | 179 | yes | - | `_trapArt` | `cssToHex`, `nodeSpriteTex` | - |
| `EffectsRenderer._drawGatherHpBar` | effectsRenderer.js | 11598 | 38 | yes | - | - | - | - |
| `EffectsRenderer._nodeLabelAt` | effectsRenderer.js | 11677 | 20 | yes | - | - | - | - |
| `EffectsRenderer._nodeHpBarAt` | effectsRenderer.js | 11707 | 27 | - | - | - | - | - |
| `EffectsRenderer._updateMonsterImpacts` | effectsRenderer.js | 11745 | 6 | yes | - | - | - | - |
| `EffectsRenderer._updateSlimeShockwaves` | effectsRenderer.js | 11765 | 39 | yes | - | - | `SLIME_WAVE_MS` | - |
| `EffectsRenderer.snowballBurstProbe` | effectsRenderer.js | 11812 | 4 | yes | - | `SNOWBALL_BURST` | - | - |
| `EffectsRenderer.sootProbe` | effectsRenderer.js | 11818 | 1 | yes | - | - | - | - |
| `EffectsRenderer.slimeShockwaveProbe` | effectsRenderer.js | 11821 | 4 | yes | - | - | - | - |
| `EffectsRenderer._updateSnowballBursts` | effectsRenderer.js | 11829 | 36 | yes | - | `SNOWBALL_BURST` | `SNOWBALL_BURST_MS` | mirror-audit |
| `EffectsRenderer._updateArrowBlasts` | effectsRenderer.js | 11887 | 37 | yes | - | `ARROW_BLAST` | `ARROW_BLAST_D`, `ARROW_BLAST_MS` | - |
| `EffectsRenderer.arrowBlastProbe` | effectsRenderer.js | 11934 | 11 | yes | - | `ARROW_BLAST` | - | - |
| `EffectsRenderer._landAuraCap` | effectsRenderer.js | 11947 | 1 | - | - | - | - | - |
| `EffectsRenderer._spawnOreBreak` | effectsRenderer.js | 11955 | 20 | yes | - | `ORE_ICON_TIER_TEX`, `ORE_TEX` | - | - |
| `EffectsRenderer._spawnItemPopup` | effectsRenderer.js | 11979 | 10 | yes | - | - | - | - |
| `EffectsRenderer._advanceItemPops` | effectsRenderer.js | 11991 | 18 | yes | - | - | - | - |
| `EffectsRenderer._advanceOreBreaks` | effectsRenderer.js | 12014 | 26 | yes | - | - | `ORE_BREAK_LIE_MS`, `ORE_POP_LATE_MS`, `ORE_SPLIT_MS` | - |
| `EffectsRenderer._oreBreakVol` | effectsRenderer.js | 12073 | 6 | - | - | - | - | - |
| `EffectsRenderer._oreCrack` | effectsRenderer.js | 12085 | 10 | yes | - | - | - | - |
| `EffectsRenderer._oreSplit` | effectsRenderer.js | 12098 | 7 | yes | - | `ORE_ICON_TEX` | - | - |
| `EffectsRenderer._spawnCookSmoke` | effectsRenderer.js | 12121 | 20 | yes | - | - | `debrisDotTex` | - |
| `EffectsRenderer._updateCookSmoke` | effectsRenderer.js | 12145 | 19 | yes | - | - | - | - |
| `EffectsRenderer._updateFxBursts` | effectsRenderer.js | 12165 | 30 | yes | - | `EFFECT_BURSTS` | `FX_BURST_MS` | - |
| `EffectsRenderer._updateFireTrail` | effectsRenderer.js | 12224 | 52 | yes | - | - | - | - |
| `EffectsRenderer._updateWhirlVortex` | effectsRenderer.js | 12316 | 44 | yes | - | - | - | - |
| `EffectsRenderer._buildSmithFx` | effectsRenderer.js | 12387 | 40 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | - |
| `EffectsRenderer._updateSmithing` | effectsRenderer.js | 12439 | 57 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | sound-cues, townsfolk-walk |
| `EffectsRenderer._updateElemStatusFx` | effectsRenderer.js | 12536 | 451 | yes | - | - | `BURN_BLAZE`, `GOO_HOLD`, `PEER_FIRES` | - |
| `EffectsRenderer._updateAbilityWindups` | effectsRenderer.js | 13096 | 49 | yes | - | - | - | - |
| `EffectsRenderer._markWhirlCatch` | effectsRenderer.js | 13180 | 59 | yes | - | - | `WHIRL_CATCH_MAX` | - |
| `EffectsRenderer._updateCatchFlights` | effectsRenderer.js | 13258 | 44 | yes | - | - | - | - |
| `EffectsRenderer._updateFishingHole` | effectsRenderer.js | 13320 | 18 | yes | - | - | - | - |
| `EffectsRenderer._drawFishingHole` | effectsRenderer.js | 13352 | 15 | yes | - | - | - | - |
| `EffectsRenderer._updateCampfire` | effectsRenderer.js | 13382 | 3 | yes | - | - | `FIRE_FRAME_MS` | - |
| `EffectsRenderer._updateFiremaking` | effectsRenderer.js | 13388 | 64 | yes | - | - | `FIRE_FRAME_MS` | - |
| `EffectsRenderer._peerChopTree` | effectsRenderer.js | 13542 | 19 | - | - | - | `PEER_CHOP_REACH`, `PEER_GATHER_NODE_TTL_MS` | - |
| `EffectsRenderer._updateRemoteExtraction` | effectsRenderer.js | 13575 | 261 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_FRAME_MS`, `PEER_CHOP_IDLE_MS`, `PEER_COOK_REACH`, `PEER_FIG_IDLE_MS`, `PEER_INK_IDLE_MS` | - |
| `EffectsRenderer._tintGearSprite` | effectsRenderer.js | 14136 | 7 | - | - | - | `_standInTints` | - |
| `EffectsRenderer._weaponStrip` | effectsRenderer.js | 14161 | 9 | yes | - | - | - | - |
| `EffectsRenderer._gearStripFrame` | effectsRenderer.js | 14171 | 76 | yes | - | `_combatTrimFrames`, `_combatTrimStats`, `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | loader-retries, picture-door |
| `EffectsRenderer._shirtId` | effectsRenderer.js | 14353 | 6 | - | - | - | - | - |
| `EffectsRenderer._myShirtLook` | effectsRenderer.js | 14366 | 7 | yes | - | - | - | - |
| `EffectsRenderer._peerShirtLook` | effectsRenderer.js | 14373 | 10 | - | - | - | - | - |
| `EffectsRenderer._dressedShirtFrame` | effectsRenderer.js | 14388 | 56 | yes | - | `_fxPreload` | `SHIRT_PATTERN_K` | picture-door |
| `EffectsRenderer._evictDressed` | effectsRenderer.js | 14449 | 10 | yes | - | - | `DRESSED_MAX` | - |
| `EffectsRenderer._warmDressedShirts` | effectsRenderer.js | 14462 | 17 | yes | - | - | `CHOP_GEAR_FW` | - |
| `EffectsRenderer._placeSwingShirt` | effectsRenderer.js | 14481 | 22 | yes | - | - | - | - |
| `EffectsRenderer._peerStandInArt` | effectsRenderer.js | 14548 | 7 | - | - | - | - | - |
| `EffectsRenderer._greavesShapeOnce` | effectsRenderer.js | 14568 | 22 | yes | - | `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | picture-door |
| `EffectsRenderer._noteGreavesShape` | effectsRenderer.js | 14593 | 15 | yes | - | - | `STANDIN_LEGS_OFF` | loader-retries |
| `EffectsRenderer._greavesUnder` | effectsRenderer.js | 14611 | 8 | yes | - | `_standInLegsUse` | - | - |
| `EffectsRenderer._legsUnderFor` | effectsRenderer.js | 14622 | 6 | yes | - | - | - | held-sweep |
| `EffectsRenderer._legsWornFor` | effectsRenderer.js | 14629 | 4 | yes | - | `_standInLegsUse` | - | held-sweep |
| `EffectsRenderer._rebakeLegBodies` | effectsRenderer.js | 14634 | 11 | yes | - | - | - | - |
| `EffectsRenderer._remoteBodyFramesFor` | effectsRenderer.js | 14650 | 29 | yes | - | `_bakeFrame`, `_standInLegsUse` | `_legsLookHas`, `_sliceStandIn`, `_standInLook`, `_trimBakeCache` | - |
| `EffectsRenderer._remoteSheetFramesFor` | effectsRenderer.js | 14695 | 24 | yes | - | `_bakeFrame` | `_sliceStandIn`, `_standInLook`, `_trimBakeCache` | - |
| `EffectsRenderer._placeJogLegs` | effectsRenderer.js | 14734 | 50 | yes | - | - | `_standInTints` | - |
| `EffectsRenderer._ensureRemoteSwordSet` | effectsRenderer.js | 14856 | 9 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOnFor` | effectsRenderer.js | 14876 | 12 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer._updateRemoteSwordSwings` | effectsRenderer.js | 14894 | 161 | yes | - | `SWORD_SLASH` | - | - |
| `EffectsRenderer._ensureRemoteBowSet` | effectsRenderer.js | 15144 | 12 | yes | - | - | - | - |
| `EffectsRenderer._updateRemoteBowShots` | effectsRenderer.js | 15175 | 127 | yes | - | - | `BLOCK_POSE_FRAME` | - |
| `EffectsRenderer._publishPeerBlockArms` | effectsRenderer.js | 15361 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placePeerBlockHands` | effectsRenderer.js | 15386 | 56 | yes | - | - | - | - |
| `EffectsRenderer._orderSwingWeapon` | effectsRenderer.js | 15451 | 11 | - | - | - | - | - |
| `EffectsRenderer._placeStandInShield` | effectsRenderer.js | 15476 | 49 | yes | - | - | - | - |
| `EffectsRenderer._updateSwordSwing` | effectsRenderer.js | 15560 | 134 | yes | - | `SWORD_SLASH` | - | - |
| `EffectsRenderer._placeBlockOffHand` | effectsRenderer.js | 15822 | 12 | yes | - | - | - | - |
| `EffectsRenderer._placeOffHandWeapon` | effectsRenderer.js | 15847 | 64 | - | - | - | - | - |
| `EffectsRenderer._predictBowGrip` | effectsRenderer.js | 16022 | 20 | yes | - | - | `BOW_GRIP_GUESS_OFF` | - |
| `EffectsRenderer._updateBowShot` | effectsRenderer.js | 16047 | 137 | yes | - | - | `BLOCK_POSE_FRAME` | - |
| `EffectsRenderer.captureAttackFrames` | effectsRenderer.js | 16334 | 84 | yes | - | `ARROW_PINE`, `SWORD_SLASH` | - | - |
| `EffectsRenderer._photographFar` | effectsRenderer.js | 16453 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placeCookFigure` | effectsRenderer.js | 16480 | 38 | yes | - | - | - | - |
| `EffectsRenderer._loadFarmStrips` | effectsRenderer.js | 16596 | 36 | yes | - | - | - | - |
| `EffectsRenderer._farmReadyNow` | effectsRenderer.js | 16642 | 6 | yes | - | - | - | - |
| `EffectsRenderer._farmUnderWanted` | effectsRenderer.js | 16655 | 1 | - | - | - | - | - |
| `EffectsRenderer._bakeFarmBodies` | effectsRenderer.js | 16656 | 34 | yes | - | - | `FARM_MIN_BLOB`, `_sliceStandIn` | - |
| `EffectsRenderer._warmFarmDressed` | effectsRenderer.js | 16701 | 14 | yes | - | - | - | - |
| `EffectsRenderer._dropGearStrip` | effectsRenderer.js | 16718 | 10 | yes | - | `_combatTrimFrames` | - | - |
| `EffectsRenderer._freeFarm` | effectsRenderer.js | 16730 | 34 | yes | - | - | - | - |
| `EffectsRenderer._peerFarmFigure` | effectsRenderer.js | 16783 | 14 | yes | - | - | `_peerStandInColours` | - |
| `EffectsRenderer._drawPeerFarmer` | effectsRenderer.js | 16801 | 75 | yes | - | - | `farmCrownMed` | - |
| `EffectsRenderer._destroyPeerFarmer` | effectsRenderer.js | 16889 | 8 | - | - | - | - | art-holds |
| `EffectsRenderer._peerFarmersProbe` | effectsRenderer.js | 16899 | 20 | yes | - | - | - | - |
| `EffectsRenderer._updateFarmWork` | effectsRenderer.js | 16928 | 96 | yes | - | - | `farmCrownMed` | - |
| `EffectsRenderer.setCaptureRenderer` | effectsRenderer.js | 17084 | 1 | yes | - | - | - | - |
| `EffectsRenderer._peerOnWorker` | effectsRenderer.js | 17107 | 33 | yes | - | `_bakeFrame` | `_trimBakeCache` | - |
| `EffectsRenderer._dressedOnWorker` | effectsRenderer.js | 17149 | 30 | yes | - | - | - | - |
| `EffectsRenderer._own` | effectsRenderer.js | 17179 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._gpuOnly` | effectsRenderer.js | 17202 | 10 | yes | - | - | - | - |
| `EffectsRenderer._gpuOnceDrawn` | effectsRenderer.js | 17217 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._release` | effectsRenderer.js | 17222 | 7 | yes | - | - | - | - |
| `EffectsRenderer._letGo` | effectsRenderer.js | 17229 | 16 | yes | - | - | - | - |
| `EffectsRenderer.destroy` | effectsRenderer.js | 17263 | 41 | yes | - | - | - | art-holds, death-zones, elem-windup, fish-top-evict, folk-sheets, keep-as-image, loader-retries, loot-clock, renderer-life, storm-eye, townsfolk-walk, water-frog, weapon-feel, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._slimeTexelWorld` | effectsRenderer.js | 17341 | 1 | - | - | - | - | - |
| `EffectsRenderer._filmScale` | effectsRenderer.js | 17343 | 1 | yes | - | - | - | - |
| `EffectsRenderer.captureFxFilm` | effectsRenderer.js | 17345 | 20 | yes | - | - | - | - |
| `EffectsRenderer._filmShoot` | effectsRenderer.js | 17371 | 13 | - | - | - | - | - |
| `EffectsRenderer._filmGunk` | effectsRenderer.js | 17395 | 43 | yes | - | - | - | - |
| `EffectsRenderer._filmStuck` | effectsRenderer.js | 17463 | 36 | yes | - | `ARROW_PINE` | `stuckShaftScale` | - |
| `EffectsRenderer._filmHotArrow` | effectsRenderer.js | 17512 | 46 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._filmCrash` | effectsRenderer.js | 17575 | 29 | yes | - | - | - | - |
| `EffectsRenderer._updateExtractionCue` | effectsRenderer.js | 17611 | 230 | yes | - | `GESTURE_TOOLS` | `CHOP_GEAR_FW` | - |
| `EffectsRenderer.clear` | effectsRenderer.js | 18116 | 65 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
