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
| written into (apart) | 15 | 15 |
| handed on (apart) | 10 | 14 |
| frozen (a call: apart) | 2 | 2 |
| lone constants | 72 | 69 |
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

- entityRenderer.js: `WARD_RING_MS`:139, `COLLISION_GLOW_RANGE_PX`:188, `SKULL_RED_TINT`:193, `HUD_BAR_VER`:198, `PEER_HPBAR_HOLD_MS`:247, `NOTICE_MS`:255, `HPBAR_FLASH_MS`:267, `POPUP_BAR_CLEAR`:277, `SPAWN_FX_MS`:292, `BOSS_SEE_THROUGH`:313, `FOLK_FAR_MARGIN`:525, `FOLK_POSE_MARGIN`:527, `TRAIT_NFT_ID`:811, `TRAIT_VER`:818, `HEAD_WATCH_MS`:1050, `BODY_DATA_TIMEOUT_MS`:1126, `MASKED_CAP`:2276, `KEEP_QUIET_MS`:2322, `KEEP_PER_SLICE`:2322, `KEEP_GAP_MS`:2322, `KEEP_MAX`:2328, `KEEP_LONGEST_MS`:2328, `_BAKE_BUSY_MAX`:2700, `_BAKE_STUCK_MS`:3103, `_LOCAL_PATIENCE_MS`:3116, `PEER_LOOK_SLICE_MS`:3244, `FISH_TOP_CAP`:4047, `FISH_SKIN_DARK`:4054, `FISH_SKIN_LIGHT`:4054, `FISH_STEEL_LO`:4054, `FISH_STEEL_HI`:4054, `FISH_STEEL_INK`:4054, `FISH_RIM_MIN`:4055, `FISH_PINE_RG`:4056, `HAIR_MASK_ROUNDS`:4402, `SWORD_SWING_MS`:4657, `BOW_SHOT_MS`:4662, `BOW_RELEASE_MS`:4667, `HP_RING_BAND`:5043, `HP_RING_TRACK`:5046, `HP_RING_CENTER_FILL`:5047, `HP_TIER_GREEN`:5048, `HP_TIER_YELLOW`:5048, `HP_TIER_ORANGE`:5048, `HP_TIER_RED`:5048, `HP_RING_OUTLINE`:5049, `HP_GHOST_WHITE`:5050, `HP_GHOST_DRAIN`:5051, `HP_GHOST_DRAIN_M`:5052, `HP_GHOST_HOLD_MS`:5055, `SWING_ANIM_MS`:5153, `THROW_RELEASE_GRACE_MS`:5176, `PLATE_INK`:5576, `PLATE_FILL_ALPHA`:5707, `PLATE_NAME_FILL`:5717, `PLATE_NAME_WEIGHT`:5724, `PLATE_BORDER_ALPHA`:5731, `PLATE_LEVEL_STROKE`:5796, `PLATE_ALARM_FILL`:5814, `PLATE_ALARM_FILL_ALPHA`:5840, `PLATE_ALARM_NAME_FILL`:5841, `PLATE_ALARM_NAME_WEIGHT`:5842, `PLATE_BOSS_FILL`:5852, `PLATE_BOSS_FILL_ALPHA`:5853, `PLATE_ALARM_LEVEL_FILL`:5862, `PLATE_ENGAGED_MS`:5866, `BRO_BADGE_URL`:6021, `CUE_ZOOM_MAX`:6221, `SOUTH_BLOCK_OFFHAND_ENABLED`:6573, `RES_SLIDE_MS`:7605, `RES_TRACK`:7610, `RES_BORDER_COL`:7611
- effectsRenderer.js: `BLOCK_POSE_FRAME`:39, `PEER_CHOP_IDLE_MS`:142, `GPU_WAIT_MS`:143, `PEER_INK_CAP`:168, `PEER_INK_IDLE_MS`:169, `PRINT_TTL_MS`:188, `PRINT_ALPHA`:189, `FARM_MIN_BLOB`:274, `PEER_CHOP_REACH`:301, `PEER_COOK_REACH`:302, `PEER_GATHER_NODE_TTL_MS`:303, `PEER_SEAT_MATCH_PX`:308, `CHOP_GEAR_FW`:343, `DRESSED_MAX`:376, `FIRE_FRAME_MS`:445, `PEER_FIG_BUDGET`:583, `PEER_FIG_IDLE_MS`:591, `PEER_FIG_LOAD_MS`:599, `PEER_FIG_RETRY_MS`:600, `PEER_GREAVES_WAIT_MS`:601, `GEAR_STRIP_TIMEOUT_MS`:602, `DMG_FONT_PX`:871, `DMG_CRIT_FONT_PX`:872, `MSG_EDGE_PX`:932, `DMG_CRIT_COLOR`:942, `MAGIC_BOLT_FRAME_MS`:1027, `HOT_SPECIAL_ARROW`:1123, `SWORD_FEEL_AUTHORED_DIR`:1141, `JET_STREAM_ENABLED`:1336, `JET_LINGER_MS`:1337, `JET_ALPHA`:1341, `JET_MAX`:1345, `FX_BURST_MS`:1401, `SLIME_WAVE_MS`:1460, `ARROW_BLAST_MS`:1461, `ARROW_BLAST_D`:1462, `SNOWBALL_BURST_MS`:1480, `SNAP_G`:1600, `SNAP_REST_MS`:1601, `SNAP_FADE_MS`:1602, `SNAP_MAX`:1603, `PROP_SLASHES_PER_PROP`:1604, `PROP_ARROWS_PER_PROP`:1607, `PROP_SCORCHES_PER_PROP`:1608, `PROP_MARKS_MAX`:1609, `SCORCH_GLOW_MS`:1610, `ORE_SPLIT_MS`:1901, `ORE_POP_LATE_MS`:1914, `DMG_BMP_BAKE_PX`:1986, `DMG_WORD_BAKE_PX`:1989, `DMG_WORD_PAGE_PX`:1990, `NPC_BUBBLE_REACH`:2178, `EMOTE_POP_FONT`:2183, `REMOTE_BAKE_CACHE_MAX`:2288, `BEAM_RISE_S`:2354, `BEAM_A`:2355, `BEAM_HALO_A`:2356, `BEAM_FLICKER`:2357, `BEAM_PULSE_HZ`:2358, `BEAM_MOTES`:2359, `LOOT_BEAMS_MAX`:2363, `PEER_FIRES`:2369, `LAND_S`:2391, `POP_JUMP`:2393, `POP_DELAY_S`:2394, `POP_ARC_S`:2395, `POP_BOUNCE_S`:2396, `SMITH_FLAME_H0`:2484, `WHIRL_CATCH_MAX`:2490

## 4. Apart: not counted, they stay

A table the code writes into, or hands on (aliased, an argument, an
element of a literal, returned: it may be written where it goes), and a
literal wrapped in `Object.freeze` (a call).

| name | file | line | why | suites that read it |
|---|---|---|---|---|
| `_propsDrawn` | entityRenderer.js | 383 | written: assigned (line 15585) | - |
| `_fgDrawn` | entityRenderer.js | 389 | written: assigned (line 15684) | - |
| `_traitCache` | entityRenderer.js | 867 | written: assigned (line 895) | - |
| `_keepQueue` | entityRenderer.js | 2331 | written: .push() (line 2335) | - |
| `_bakeWorkerStats` | entityRenderer.js | 2623 | written: counted (line 2704) | - |
| `_bakeQueue` | entityRenderer.js | 2696 | written: .push() (line 2716) | - |
| `_localBakeStats` | entityRenderer.js | 3086 | written: counted (line 2813) | - |
| `_localMisses` | entityRenderer.js | 3115 | written: .shift() (line 3145) | - |
| `_peerBakeStats` | entityRenderer.js | 3167 | written: counted (line 3188) | - |
| `_peerQueue` | entityRenderer.js | 3169 | written: .splice() (line 3223) | - |
| `prewarmProgress` | entityRenderer.js | 3384 | written: assigned (line 3453) | - |
| `_hairMaskCache` | entityRenderer.js | 4359 | written: assigned (line 4364) | loader-retries |
| `_standInHairClip` | entityRenderer.js | 4673 | written: assigned (line 4717) | - |
| `_traitTex` | entityRenderer.js | 4896 | written: assigned (line 4920) | - |
| `_mannequinTex` | entityRenderer.js | 4903 | written: assigned (line 4929) | - |
| `_fxPreload` | effectsRenderer.js | 28 | written: .push() (line 40) | loader-retries |
| `_combatTrimStats` | effectsRenderer.js | 44 | written: assigned (line 14195) | loader-retries |
| `_standInTrimStats` | effectsRenderer.js | 65 | written: assigned (line 119) | - |
| `POPUP_ICONS` | effectsRenderer.js | 944 | written: assigned (line 996) | - |
| `SHARD_ICONS` | effectsRenderer.js | 1011 | written: assigned (line 1014) | - |
| `MAGIC_BOLT_FRAMES` | effectsRenderer.js | 1026 | written: .push() (line 1037) | - |
| `ARROW_PINE` | effectsRenderer.js | 1196 | written: assigned (line 1238) | - |
| `JET_STREAM` | effectsRenderer.js | 1318 | written: assigned (line 1320) | - |
| `ARROW_BLAST` | effectsRenderer.js | 1458 | written: .push() (line 1471) | - |
| `SNOWBALL_BURST` | effectsRenderer.js | 1479 | written: .push() (line 1494) | - |
| `NODE_SPRITE_TEX` | effectsRenderer.js | 1783 | written: assigned (line 1846) | - |
| `TREE_TEX` | effectsRenderer.js | 1795 | written: assigned (line 1796) | - |
| `ORE_TEX` | effectsRenderer.js | 1810 | written: assigned (line 1811) | pixel-readers |
| `ORE_ICON_TIER_TEX` | effectsRenderer.js | 1873 | written: assigned (line 1876) | - |
| `SMITH_ANVIL` | effectsRenderer.js | 2479 | written: assigned (line 2481) | - |
| `_staffTipOut` | entityRenderer.js | 144 | handed on: an argument (line 11352) | - |
| `_hudBarTex` | entityRenderer.js | 199 | handed on: in a literal (line 234) | renderer-life |
| `NODE_HPBAR_PARTS` | entityRenderer.js | 643 | handed on: aliased (line 684) | - |
| `JOG_EW_HAIR_TUNE` | entityRenderer.js | 1290 | handed on: returned (line 1292) | - |
| `_BASE_DIRS` | entityRenderer.js | 3392 | handed on: an argument (line 3013) | - |
| `PLAYER_HP_NUM_STYLE` | entityRenderer.js | 5026 | handed on: in a literal (line 700) | - |
| `HP_RING_MAX_STYLE` | entityRenderer.js | 5056 | handed on: in a literal (line 7166) | - |
| `MONSTER_HP_NUM_STYLE` | entityRenderer.js | 5064 | handed on: in a literal (line 5337) | - |
| `_STAND_SOUTH` | entityRenderer.js | 5500 | handed on: an argument (line 5502) | - |
| `PLATE_BAND` | entityRenderer.js | 5743 | handed on: in a literal (line 6536) | - |
| `_emoteIds` | effectsRenderer.js | 34 | handed on: aliased (line 9078) | - |
| `_emoteSrcs` | effectsRenderer.js | 34 | handed on: aliased (line 9078) | - |
| `_emoteEms` | effectsRenderer.js | 34 | handed on: aliased (line 9078) | - |
| `FIRE_SKIN_OPTS` | effectsRenderer.js | 458 | handed on: an argument (line 5038) | - |
| `ARROW_SPECIAL` | effectsRenderer.js | 1104 | handed on: in a literal (line 1348) | - |
| `MAGIC_SPECIAL` | effectsRenderer.js | 1124 | handed on: in a literal (line 1349) | - |
| `SWORD_SLASH` | effectsRenderer.js | 1133 | handed on: in a literal (line 1350) | - |
| `EFFECT_BURSTS` | effectsRenderer.js | 1384 | handed on: an argument (line 1396) | - |
| `GESTURE_TOOLS` | effectsRenderer.js | 1686 | handed on: an argument (line 1729) | mirror-audit |
| `NODE_SPRITE_SOURCES` | effectsRenderer.js | 1780 | handed on: an argument (line 1845) | - |
| `DMG_ALL_CHARS` | effectsRenderer.js | 2000 | handed on: an argument (line 2005) | - |
| `DMG_DIGIT_CHARS` | effectsRenderer.js | 2001 | handed on: an argument (line 2006) | - |
| `_NO_HOP` | effectsRenderer.js | 2429 | handed on: returned (line 2401) | - |
| `_AT_MIDDLE` | effectsRenderer.js | 2466 | handed on: aliased (line 9623) | loot-clock |
| `_PEER_WORN_SLOTS` | entityRenderer.js | 3218 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 5437 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 588 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 2496 | frozen | - |

<!-- part 5: the code (tools/dev/render-code-census.mjs --write) -->
## 5. The code, counted (v2.3.5347)

Written by `node tools/dev/render-code-census.mjs --write` at cbbe4cda; the rules are
`tools/guards/lib/renderCode.mjs`'s header. Moves nothing. A **leaf** is a
top-level function that reads no `this` and reaches no module state; its
**level** is 0 when it reads no other in-file function, else one more than
the highest leaf it reads (a function reading a non-leaf has no level).

| | functions | their code lines | leaves | leaf lines | with a level | methods | method lines |
|---|---|---|---|---|---|---|---|
| entityRenderer.js | 119 | 2713 | 43 | 603 | 13 | 20 | 4490 |
| effectsRenderer.js | 32 | 421 | 1 | 6 | 0 | 195 | 8488 |

### The order of the moves: leaves, level by level (largest first in each)

- level 0: 12 functions, 107 code lines
- level 1: 1 functions, 6 code lines

### Every function and method

| name | file | line | code | this | level | module state | in-file names | suites |
|---|---|---|---|---|---|---|---|---|
| `_ensureHudBarTextures` | entityRenderer.js | 230 | 1 | - | 0 | - | `_hudBarLoads` | renderer-life |
| `_crowdK` | entityRenderer.js | 399 | 1 | - | 0 | - | `_noPeerCull` | crowd-cap |
| `_folkSheetsStep` | entityRenderer.js | 541 | 7 | - | - | `_folkJobs` | `_FOLK_SHEETS_ON`, `_folkSheets`, `prewarmFolkBodies` | folk-sheets |
| `_hpFillTexFor` | entityRenderer.js | 612 | 17 | - | - | `_hudBarTex` | - | - |
| `_nodeHpBarHide` | entityRenderer.js | 635 | 7 | - | - | `NODE_HPBAR_PARTS` | - | - |
| `drawNodeHpBar` | entityRenderer.js | 673 | 99 | - | - | `NAME_STYLE`, `NODE_HPBAR_PARTS`, `PLAYER_HP_NUM_STYLE`, `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `MONSTER_HPBAR_H`, `PLAYER_HPBAR_H`, `_ensureHudBarTextures`, `_hpFillTexFor`, `_nodeHpBarHide` | traps-phone-memory |
| `_traitGaveUp` | entityRenderer.js | 876 | 5 | - | - | `_looksRetryOn`, `_traitRetryOn` | - | keep-as-image |
| `_ensureTraitLoaded` | entityRenderer.js | 881 | 26 | - | - | `_traitCache` | `_fetchTraitMeta`, `_loadTraitDir` | keep-as-image |
| `_fetchTraitMeta` | entityRenderer.js | 915 | 13 | - | - | - | `TRAIT_VER`, `_traitGaveUp`, `_traitMetaLean` | keep-as-image, picture-door, traps-page-rules |
| `_traitMetaLean` | entityRenderer.js | 939 | 6 | - | - | `TRAIT_META_DOC` | - | - |
| `_loadTraitDir` | entityRenderer.js | 950 | 31 | - | - | - | `TRAIT_VER`, `_traitGaveUp` | keep-as-image |
| `_ensureHeadwearLoaded` | entityRenderer.js | 1019 | 1 | - | - | - | `_ensureTraitLoaded` | keep-as-image |
| `_ensureFacialHairLoaded` | entityRenderer.js | 1020 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureEyewearLoaded` | entityRenderer.js | 1021 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureEyeStyleLoaded` | entityRenderer.js | 1022 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_ensureHairLoaded` | entityRenderer.js | 1023 | 1 | - | - | - | `_ensureTraitLoaded` | - |
| `_traitKick` | entityRenderer.js | 1045 | 12 | - | - | - | `_fetchTraitMeta`, `_headWatch`, `_loadTraitDir` | - |
| `_watchOwnHead` | entityRenderer.js | 1057 | 36 | - | - | `_traitCache` | `HEAD_WATCH_MS`, `_fetchTraitMeta`, `_headWatch`, `_traitKick` | - |
| `_fetchLimited` | entityRenderer.js | 1119 | 9 | - | 0 | - | - | loader-retries, picture-door, traps-page-rules |
| `_ensureBodyData` | entityRenderer.js | 1128 | 32 | - | - | `_bodyAnchors`, `_bodyDataPromise`, `_bodyDataRounds`, `_bodyTops`, `_looksRetryOn`, `_traitRetryOn` | `BODY_DATA_TIMEOUT_MS`, `TRAIT_VER`, `_fetchLimited` | loader-retries, picture-door, traps-page-rules |
| `_hatHairFit` | entityRenderer.js | 1220 | 6 | - | - | - | `_ensureHairLoaded` | - |
| `_hatTune` | entityRenderer.js | 1256 | 9 | - | - | `_folkHatDy256`, `_qaHatDy256` | `_hatHairFit` | - |
| `hairPoseTune` | entityRenderer.js | 1282 | 3 | - | - | `JOG_EW_HAIR_TUNE` | - | - |
| `_placeTrait` | entityRenderer.js | 1296 | 59 | - | - | `_crownOverride` | `_ensureBodyData`, `_lookupBodyTop` | - |
| `_placeHeadwear` | entityRenderer.js | 1467 | 8 | - | - | - | `_ensureHeadwearLoaded`, `_hatTune`, `_placeTrait` | - |
| `_placeFacialHair` | entityRenderer.js | 1482 | 8 | - | - | - | `_ensureFacialHairLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeEyewear` | entityRenderer.js | 1506 | 8 | - | - | - | `_ensureEyewearLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeEyeStyle` | entityRenderer.js | 1538 | 8 | - | - | - | `_ensureEyeStyleLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeSpecies` | entityRenderer.js | 1563 | 22 | - | - | `_crownOverride` | `_placeTrait` | - |
| `remoteBodyArt` | entityRenderer.js | 1629 | 1 | - | - | - | `_remoteBodyArt` | - |
| `prewarmFolkBodies` | entityRenderer.js | 1640 | 15 | - | - | `_folkJobs` | `_remoteBodyArt` | folk-bakes, folk-sheets, townsfolk-walk, traps-page-rules |
| `_remoteBodyArt` | entityRenderer.js | 1662 | 14 | - | - | `_bodyArtMemo` | - | folk-bakes |
| `_placeCape` | entityRenderer.js | 1792 | 69 | - | - | - | `_lookupBodyTop` | - |
| `_placeGear` | entityRenderer.js | 1979 | 67 | - | - | `_lastGearDisplay` | - | - |
| `_bodyRegionTex` | entityRenderer.js | 2120 | 13 | - | - | `_regionTexCache` | `REGION_ROWS` | - |
| `_bandTex` | entityRenderer.js | 2149 | 16 | - | - | `_bandTexCache` | - | - |
| `_placeBand` | entityRenderer.js | 2171 | 13 | - | - | - | `_bandTex` | - |
| `_placeSouthBlockLegs` | entityRenderer.js | 2219 | 33 | - | - | - | `_localMaskedFrame`, `_placeBand` | traps-page-rules |
| `_maskedEvictKey` | entityRenderer.js | 2268 | 1 | - | - | `_maskedBodyCache` | - | worn-bake |
| `_maskedDrop` | entityRenderer.js | 2279 | 4 | - | 0 | - | - | worn-bake |
| `_cachedSourceOf` | entityRenderer.js | 2321 | 1 | - | 0 | - | - | - |
| `_afterBakes` | entityRenderer.js | 2324 | 6 | - | - | `_keepLastAsk`, `_keepQueue`, `_keepTimer` | `KEEP_MAX`, `KEEP_QUIET_MS`, `_keepDrain` | - |
| `_keepDrain` | entityRenderer.js | 2330 | 10 | - | - | `_keepLastAsk`, `_keepQueue`, `_keepTimer` | `KEEP_GAP_MS`, `KEEP_LONGEST_MS`, `KEEP_PER_SLICE`, `KEEP_QUIET_MS` | - |
| `_mkBakeCanvas` | entityRenderer.js | 2343 | 1 | - | 0 | - | - | - |
| `_cropBakedFrame` | entityRenderer.js | 2344 | 13 | - | - | - | `_afterBakes` | - |
| `_maskedBodyFrame` | entityRenderer.js | 2505 | 9 | - | - | - | `_maskedBodyFrameInner` | - |
| `_maskedBodyFrameInner` | entityRenderer.js | 2517 | 24 | - | - | `_maskedBodyCache` | `_gearReadable`, `_mkBakeCanvas`, `_storeBake` | worn-bake |
| `_sendRod` | entityRenderer.js | 2607 | 6 | - | - | `_rodSent` | - | - |
| `_getBakeWorker` | entityRenderer.js | 2615 | 30 | - | - | `_bakeJobs`, `_bakeWorker`, `_bakeWorkerDead` | - | - |
| `_gearReadable` | entityRenderer.js | 2656 | 3 | - | 0 | - | - | worn-bake |
| `_prewarmBake` | entityRenderer.js | 2692 | 19 | - | - | `_bakeByKey`, `_bakeQueue`, `_bakeWorkerStats`, `_maskedBodyCache` | `_getBakeWorker`, `_maskedBodyFrame`, `_pumpBakes` | - |
| `_pumpBakes` | entityRenderer.js | 2711 | 16 | - | - | `_bakeBusy`, `_bakeByKey`, `_bakeQueue`, `_bakeStartedAt` | `_BAKE_BUSY_MAX`, `_runBake` | - |
| `_runBake` | entityRenderer.js | 2728 | 46 | - | - | `_bakeJobs`, `_bakeSeq`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_localBakeStats`, `_maskedBodyCache` | `_getBakeWorker`, `_maskedBodyFrame`, `_maskedFailed`, `_mkBakeCanvas`, `_runLookBake`, `_sendRod`, `_storeBake` | worn-bake |
| `_lookBake` | entityRenderer.js | 2792 | 15 | - | - | `_bakeByKey`, `_bakeQueue` | `_getBakeWorker`, `_pumpBakes`, `_runLookBakeInline` | - |
| `_runLookBake` | entityRenderer.js | 2808 | 31 | - | - | `_bakeJobs`, `_bakeSeq`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_localBakeStats` | `_getBakeWorker`, `_sendRod` | - |
| `_mkCpuCanvas` | entityRenderer.js | 2842 | 6 | - | 1 | - | `_mkBakeCanvas` | - |
| `_runLookBakeInline` | entityRenderer.js | 2848 | 35 | - | - | `_bakeWorkerStats`, `_lookSheetsHere` | `_gearReadable`, `_mkBakeCanvas`, `_mkCpuCanvas` | worn-bake |
| `_placeLookResidue` | entityRenderer.js | 2888 | 37 | - | 0 | - | - | - |
| `_maskedFailed` | entityRenderer.js | 3063 | 4 | - | - | `_maskedFails` | - | - |
| `_maskedRetryInline` | entityRenderer.js | 3067 | 1 | - | - | `_maskedFails` | - | - |
| `_bakeWorkerWatch` | entityRenderer.js | 3074 | 11 | - | - | `_bakeBusy`, `_bakeJobs`, `_bakeStartedAt`, `_bakeWorker`, `_bakeWorkerStats`, `_rodSent` | `_BAKE_STUCK_MS` | - |
| `_localMaskedFrame` | entityRenderer.js | 3088 | 19 | - | - | `_bakeBusy`, `_bakeByKey`, `_bakeStartedAt`, `_localBakeStats`, `_localEpoch`, `_localMissKey`, `_localMisses`, `_maskedBodyCache` | `_LOCAL_PATIENCE_MS`, `_bakeWorkerWatch`, `_getBakeWorker`, `_maskedBodyFrame`, `_maskedRetryInline`, `_prewarmBake` | - |
| `_peerWorkerOk` | entityRenderer.js | 3141 | 1 | - | - | - | `_getBakeWorker` | - |
| `_peerBakeSoon` | entityRenderer.js | 3143 | 6 | - | - | `_maskedBodyCache`, `_peerPending` | `_prewarmBake` | - |
| `_peerMaskedFrame` | entityRenderer.js | 3151 | 23 | - | - | `_maskedBodyCache`, `_peerBakeStats`, `_peerPending` | `_bakeWorkerWatch`, `_maskedBodyFrame`, `_maskedRetryInline`, `_peerBakeSoon`, `_peerWorkerOk`, `_prewarmBake` | - |
| `_peerPrewarmIfChanged` | entityRenderer.js | 3189 | 9 | - | - | `_peerBakeStats`, `_peerQueue`, `_peerRunning` | `_peerWorkerOk`, `_runPeerQueue` | - |
| `_peerLookPrewarmIfChanged` | entityRenderer.js | 3215 | 26 | - | - | `_peerBakeStats` | `PEER_LOOK_SLICE_MS`, `_peerWorkerOk` | - |
| `_runPeerQueue` | entityRenderer.js | 3241 | 32 | - | - | `_maskedBodyCache`, `_peerBakeStats`, `_peerPending`, `_peerQueue`, `_peerRunning` | `_prewarmBake` | - |
| `_storeBake` | entityRenderer.js | 3277 | 8 | - | - | `_maskedBodyCache` | `MASKED_CAP`, `_afterBakes`, `_cropBakedFrame`, `_maskedDrop`, `_maskedEvictKey` | worn-bake |
| `_dirsFacingFirst` | entityRenderer.js | 3363 | 4 | - | - | `_BASE_DIRS`, `_localBakeDir` | - | - |
| `_prewarmArts` | entityRenderer.js | 3388 | 6 | - | 0 | - | `_FLIPBAKE_OFF` | owner-notes-2026-10-22 |
| `planPrewarmProgress` | entityRenderer.js | 3422 | 12 | - | - | `prewarmProgress` | `_catalogWornSets`, `_prewarmArts` | - |
| `_ownedIds` | entityRenderer.js | 3479 | 13 | - | - | `_ownedRpg` | - | - |
| `_catalogWornSets` | entityRenderer.js | 3492 | 21 | - | - | - | `_ownedIds` | - |
| `_noteOwnedGear` | entityRenderer.js | 3522 | 12 | - | - | `_ownedAt`, `_ownedRpg`, `_ownedSig` | `_ownedIds`, `prewarmAltWornSets` | - |
| `uploadBakedTextures` | entityRenderer.js | 3553 | 20 | - | - | `_maskedBodyCache`, `_uploadedSources` | - | - |
| `uploadGearTextures` | entityRenderer.js | 3583 | 17 | - | - | `_uploadedSources` | - | - |
| `registerPrewarmRenderer` | entityRenderer.js | 3611 | 1 | - | - | `_prewarmRenderer` | - | - |
| `prewarmMaskedBodyFrames` | entityRenderer.js | 3613 | 71 | - | - | `prewarmProgress` | `_dirsFacingFirst`, `_getBakeWorker`, `_prewarmArts`, `_prewarmBake` | traps-page-rules |
| `prewarmAltWornSets` | entityRenderer.js | 3721 | 78 | - | - | `_altPrewarmSeq`, `_maskedBodyCache`, `_spareSkipped`, `prewarmProgress` | `MASKED_CAP`, `_catalogWornSets`, `_dirsFacingFirst`, `_getBakeWorker`, `_prewarmArts`, `_prewarmBake` | traps-page-rules |
| `_schedulePrewarm` | entityRenderer.js | 3869 | 13 | - | - | `_equipPrewarmAgain`, `_equipPrewarmRunning`, `_equipPrewarmTimer`, `_prewarmRenderer` | `prewarmMaskedBodyFrames`, `uploadBakedTextures` | - |
| `_placeBodyRegions` | entityRenderer.js | 3894 | 19 | - | - | - | `REGION_ROWS`, `_bodyRegionTex` | - |
| `_placePickupHead` | entityRenderer.js | 3929 | 26 | - | 0 | - | - | - |
| `_releaseFishTop` | entityRenderer.js | 3999 | 1 | - | - | `_fishTopShown` | - | fish-top-evict |
| `_fishTopFrame` | entityRenderer.js | 4034 | 161 | - | - | `_FISH_GRIP_TROUSERS`, `_fishTopCache` | `FISH_PINE_RG`, `FISH_RIM_MIN`, `FISH_SKIN_DARK`, `FISH_SKIN_LIGHT`, `FISH_STEEL_HI`, `FISH_STEEL_INK`, `FISH_STEEL_LO`, `FISH_TOP_CAP`, `_FISH_GRIP_OVER_PLATE`, `_afterBakes`, `_cachedSourceOf`, `_gearReadable`, `_releaseFishTop` | fish-top-evict, traps-page-rules |
| `_placeFishHead` | entityRenderer.js | 4293 | 13 | - | - | `_fishTopShown` | `_fishTopFrame` | fish-top-evict |
| `_ensureHairMaskLoaded` | entityRenderer.js | 4310 | 24 | - | - | `_hairMaskCache` | `_loadHairMaskDir` | loader-retries |
| `_loadHairMaskDir` | entityRenderer.js | 4353 | 10 | - | - | `_looksRetryOn`, `_traitRetryOn` | `HAIR_MASK_ROUNDS`, `TRAIT_VER` | loader-retries, picture-door |
| `_clipHairToHat` | entityRenderer.js | 4370 | 25 | - | - | - | `_ensureHairMaskLoaded`, `_ensureHeadwearLoaded`, `_hatTune`, `_placeTrait` | - |
| `_placeHair` | entityRenderer.js | 4416 | 10 | - | - | - | `_clipHairToHat`, `_ensureHairLoaded`, `_placeTrait`, `hairPoseTune` | - |
| `_placeStandaloneCapeLayer` | entityRenderer.js | 4541 | 16 | - | 0 | - | - | - |
| `placeStandInCape` | entityRenderer.js | 4571 | 30 | - | - | - | `_lookupBodyTop`, `_placeStandaloneCapeLayer` | - |
| `_clipStandInHair` | entityRenderer.js | 4654 | 38 | - | - | `_standInHairClip` | `_ensureHairMaskLoaded`, `_ensureHeadwearLoaded` | - |
| `monsterDisplayMap` | entityRenderer.js | 4712 | 1 | - | - | `_monsterDisplaysRef` | - | - |
| `monsterBodySprite` | entityRenderer.js | 4714 | 6 | - | - | `_monsterDisplaysRef` | - | - |
| `placeSkillTraits` | entityRenderer.js | 4726 | 24 | - | - | - | `_clipStandInHair`, `_ensureEyeStyleLoaded`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_hatHairFit` | - |
| `placeSkillTraitsFor` | entityRenderer.js | 4782 | 24 | - | - | - | `_clipStandInHair`, `_ensureEyeStyleLoaded`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_hatHairFit` | townsfolk-walk |
| `_lookupHeadBox` | entityRenderer.js | 4819 | 8 | - | - | `_bodyAnchors` | - | - |
| `_lookupStandHeadBox` | entityRenderer.js | 4832 | 5 | - | - | `_bodyAnchors` | - | - |
| `_lookupBodyTop` | entityRenderer.js | 4841 | 4 | - | - | `_bodyTops` | - | traps-page-rules |
| `_ensureTraitTextures` | entityRenderer.js | 4860 | 28 | - | - | `_mannequinTex`, `_traitLoadStarted`, `_traitMeta`, `_traitTex` | `TRAIT_NFT_ID`, `TRAIT_VER` | picture-door |
| `preloadTraits` | entityRenderer.js | 4908 | 40 | - | - | - | `_ensureBodyData`, `_ensureHairMaskLoaded`, `_ensureHudBarTextures`, `_ensureTraitLoaded`, `_ensureTraitTextures` | look-load |
| `createMonsterDisplay` | entityRenderer.js | 5144 | 55 | - | - | `MONSTER_HP_NUM_STYLE` | `_attachNamePill` | - |
| `playerGroundDy` | entityRenderer.js | 5451 | 3 | - | - | `_STAND_SOUTH` | - | - |
| `_attachNamePill` | entityRenderer.js | 5827 | 56 | - | - | `PLATE_BAND` | `PLATE_LEVEL_STROKE` | traps-page-rules |
| `_iconSet` | entityRenderer.js | 5984 | 2 | - | 0 | - | - | loader-retries |
| `preloadBroBadge` | entityRenderer.js | 5988 | 7 | - | - | `_broBadgeSet`, `_broBadgeTex` | `BRO_BADGE_URL`, `_broBadgeGot`, `_iconSet` | loader-retries |
| `_broBadgeTexture` | entityRenderer.js | 5998 | 7 | - | - | `_broBadgeSet`, `_broBadgeTex` | `BRO_BADGE_URL` | loader-retries |
| `preloadSmallIconTextures` | entityRenderer.js | 6014 | 4 | - | - | `_smallSet` | `_iconSet`, `_smallTexHeld` | small-icons |
| `_smallTex` | entityRenderer.js | 6018 | 10 | - | - | `_smallSet` | `_smallTexHeld` | small-icons |
| `_bindSmallTex` | entityRenderer.js | 6030 | 6 | - | - | - | `_smallTex` | small-icons |
| `preloadQuestPinTextures` | entityRenderer.js | 6050 | 4 | - | - | `_pinSet` | `_iconSet`, `_pinTexHeld` | owner-icons |
| `_questPinTex` | entityRenderer.js | 6054 | 10 | - | - | `_pinSet` | `_pinTexHeld` | owner-icons |
| `setPlateZoom` | entityRenderer.js | 6173 | 5 | - | - | `_cueZoom`, `_plateWorldScale` | `CUE_ZOOM_MAX` | - |
| `_fitPlateToZoom` | entityRenderer.js | 6182 | 15 | - | - | `_plateWorldScale` | `PLATE_SCALE_MAX`, `PLATE_SCALE_MIN` | - |
| `_updateNamePill` | entityRenderer.js | 6220 | 53 | - | - | - | `_broBadgeTexture`, `_drawPlateCapsule`, `_fitPlateToZoom` | folk-names |
| `_drawPlateCapsule` | entityRenderer.js | 6318 | 98 | - | - | `PLATE_BAND` | `PLATE_ALARM_FILL`, `PLATE_ALARM_FILL_ALPHA`, `PLATE_ALARM_LEVEL_FILL`, `PLATE_ALARM_NAME_FILL`, `PLATE_ALARM_NAME_WEIGHT`, `PLATE_BORDER_ALPHA`, `PLATE_BOSS_FILL`, `PLATE_BOSS_FILL_ALPHA`, `PLATE_FILL_ALPHA`, `PLATE_INK`, `PLATE_LEVEL_STROKE`, `PLATE_NAME_FILL`, `PLATE_NAME_WEIGHT`, `_bindSmallTex`, `_broBadgeTexture` | dungeon-clear |
| `createPlayerDisplay` | entityRenderer.js | 6534 | 298 | - | - | `HP_RING_MAX_STYLE`, `NAME_STYLE`, `PLAYER_HP_NUM_STYLE` | `_attachNamePill`, `_smallTex` | traps-page-rules, traps-phone-memory |
| `createOtherPlayerDisplay` | entityRenderer.js | 7189 | 167 | - | - | `NAME_STYLE`, `PLAYER_HP_NUM_STYLE` | `_attachNamePill`, `_smallTex` | traps-page-rules, traps-phone-memory |
| `EntityRenderer.constructor` | entityRenderer.js | 7584 | 16 | yes | - | `_frontLayerRef`, `_monsterDisplaysRef` | - | art-holds, elem-windup, farmwalk, fish-top-evict, held-numbers, keep-as-image, loader-retries, loot-clock, mirror-audit, owner-icons, picture-door, storm-eye, tick, water-frog, phase-table, traps-page-rules, traps-phone-memory |
| `EntityRenderer.update` | entityRenderer.js | 7617 | 12 | yes | - | - | `_noteOwnedGear` | drop-lines, elem-windup, fire-strip, keep-as-image, mirror-audit, owner-icons, renderer-life, storm-eye, water-frog |
| `EntityRenderer._updateMonsters` | entityRenderer.js | 7633 | 1086 | yes | - | `SPAWN_WHITE_FILTER`, `STATUS_TO_ELEMENT`, `_cueZoom`, `_hudBarTex` | `BOSS_SEE_THROUGH`, `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `MONSTER_HPBAR_H`, `NOTICE_MS`, `PLATE_ENGAGED_MS`, `POPUP_BAR_CLEAR`, `SPAWN_FX_MS`, `THROW_RELEASE_GRACE_MS`, `_bindSmallTex`, `_ensureHudBarTextures`, `_hpFillTexFor`, `_updateNamePill`, `createMonsterDisplay` | traps-page-rules |
| `EntityRenderer._drawPeerHpBar` | entityRenderer.js | 10003 | 84 | - | - | `PLAYER_HP_NUM_STYLE`, `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN_M`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `PEER_BAR_H`, `PEER_BAR_W`, `PEER_BAR_Y`, `PEER_HPBAR_HOLD_MS`, `PLAYER_HPBAR_H`, `_ensureHudBarTextures`, `_hpFillTexFor` | - |
| `EntityRenderer.peerAlwaysDrawn` | entityRenderer.js | 10119 | 11 | - | - | - | `PEER_HPBAR_HOLD_MS` | - |
| `EntityRenderer._updateOtherPlayers` | entityRenderer.js | 10131 | 907 | yes | - | `_crownOverride`, `_lastPeerWeaponSprite`, `_plateWorldScale`, `_staffTipOut` | `BOW_SHOT_MS`, `HEAD_FRAMES_ON`, `PEER_BAR_H`, `PEER_BAR_W`, `PEER_BAR_Y`, `PEER_HPBAR_HOLD_MS`, `SKULL_RED_TINT`, `SOUTH_BLOCK_OFFHAND_ENABLED`, `SWING_ANIM_MS`, `SWORD_SWING_MS`, `_CROWD_ALL_SHOWN`, `_PEER_WORN_SLOTS`, `_bindSmallTex`, `_crowdK`, `_noPeerCull`, `_peerLookPrewarmIfChanged`, `_peerMaskedFrame`, `_peerPrewarmIfChanged`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeFishHead`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeLookResidue`, `_placePickupHead`, `_placeSpecies`, `_remoteBodyArt`, `_smallTex`, `_updateNamePill`, `createOtherPlayerDisplay`, `playerGroundDy` | traps-page-rules |
| `EntityRenderer._updatePlayer` | entityRenderer.js | 11762 | 1369 | yes | - | `_crownOverride`, `_lastHairDisplay`, `_lastWeaponSprite`, `_localBakeDir`, `_localBakeStats`, `_localEpoch`, `_selfDisplayRef`, `_staffTipOut` | `BOW_SHOT_MS`, `COLLISION_GLOW_RANGE_PX`, `HEAD_FRAMES_ON`, `PLAYER_BAND_Y`, `SKULL_RED_TINT`, `SOUTH_BLOCK_OFFHAND_ENABLED`, `SWING_ANIM_MS`, `SWORD_SWING_MS`, `_bindSmallTex`, `_ensureBodyData`, `_ensureEyewearLoaded`, `_ensureFacialHairLoaded`, `_ensureHairLoaded`, `_ensureHeadwearLoaded`, `_localMaskedFrame`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeFishHead`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeLookResidue`, `_placePickupHead`, `_placeSouthBlockLegs`, `_placeSpecies`, `_updateNamePill`, `_watchOwnHead`, `createPlayerDisplay`, `playerGroundDy` | traps-page-rules |
| `EntityRenderer.capturePoseFrames` | entityRenderer.js | 14988 | 115 | yes | - | `_localBakeDir` | `CAPTURE_FACING`, `createPlayerDisplay` | - |
| `EntityRenderer.setCaptureRenderer` | entityRenderer.js | 15138 | 1 | yes | - | - | - | - |
| `EntityRenderer._updatePet` | entityRenderer.js | 15164 | 65 | yes | - | `NAME_STYLE` | `WARD_RING_MS` | traps-phone-memory |
| `EntityRenderer._posePet` | entityRenderer.js | 15259 | 28 | - | - | - | - | - |
| `EntityRenderer._updatePeerPets` | entityRenderer.js | 15306 | 53 | yes | - | - | - | - |
| `EntityRenderer.peerPetsDrawn` | entityRenderer.js | 15368 | 10 | yes | - | - | - | - |
| `EntityRenderer.petDrawn` | entityRenderer.js | 15382 | 11 | yes | - | - | - | - |
| `EntityRenderer._updateProps` | entityRenderer.js | 15408 | 67 | yes | - | `_entityLayerRef`, `_propsDrawn` | - | - |
| `EntityRenderer._updateForeground` | entityRenderer.js | 15574 | 44 | yes | - | `_fgDrawn` | - | - |
| `EntityRenderer._drawFolk` | entityRenderer.js | 15634 | 72 | - | - | `_folkHatDy256` | `HEAD_FRAMES_ON`, `_placeCape`, `_placeEyeStyle`, `_placeEyewear`, `_placeFacialHair`, `_placeGear`, `_placeHair`, `_placeHeadwear`, `_placeSpecies`, `_remoteBodyArt`, `createOtherPlayerDisplay`, `placeSkillTraitsFor` | townsfolk-walk, traps-page-rules |
| `EntityRenderer._updateNPCs` | entityRenderer.js | 15723 | 309 | yes | - | `NAME_STYLE` | `FOLK_FAR_MARGIN`, `_attachNamePill`, `_bindSmallTex`, `_folkSheetsStep`, `_npcDrawn`, `_questPinTex`, `_smallTex`, `_updateNamePill` | folk-sheets, traps-page-rules, traps-phone-memory |
| `EntityRenderer._updatePlayerHud` | entityRenderer.js | 16333 | 215 | yes | - | `_hudBarTex` | `HPBAR_FLASH_MS`, `HP_GHOST_DRAIN`, `HP_GHOST_HOLD_MS`, `HP_GHOST_WHITE`, `PLAYER_BAND_Y`, `PLAYER_HPBAR_H`, `RES_EN_Y`, `_ensureHudBarTextures`, `_hpFillTexFor` | traps-page-rules |
| `EntityRenderer.clear` | entityRenderer.js | 16739 | 15 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
| `_fxLoad` | effectsRenderer.js | 39 | 1 | - | - | `_fxPreload` | - | owner-icons, picture-door, pixel-readers |
| `effectsAnimationsReady` | effectsRenderer.js | 40 | 1 | - | - | `_fxPreload` | - | - |
| `_sliceStandIn` | effectsRenderer.js | 87 | 34 | - | - | `_standInTrimFrames`, `_standInTrimStats` | - | gpu-only |
| `_bakeChopStrip` | effectsRenderer.js | 151 | 6 | - | - | - | `_sliceStandIn` | townsfolk-walk |
| `farmCrownMed` | effectsRenderer.js | 280 | 9 | - | - | `_farmCrownMid` | - | - |
| `_fireLogToBark` | effectsRenderer.js | 484 | 23 | - | - | `_fireLogWood` | `FIRE_LOG_LIT_OFF` | - |
| `_bakeFireSplit` | effectsRenderer.js | 512 | 8 | - | - | `FIRE_SKIN_OPTS` | `FIRE_LEGLESS_OFF`, `FIRE_LOG_OFF`, `_fireLogToBark` | - |
| `_isGatheringStandIn` | effectsRenderer.js | 701 | 4 | - | - | `FARM_POSES` | - | - |
| `_placeStandInCapeOn` | effectsRenderer.js | 793 | 26 | - | - | `_capeProbe` | `_STAND_IN_CAPE_OVER_BODY` | - |
| `isDamagePopup` | effectsRenderer.js | 885 | 8 | - | - | `DMG_MARK_ICONS` | `DMG_PLAIN_RE` | - |
| `_loadPopupIcon` | effectsRenderer.js | 985 | 12 | - | - | `POPUP_ICONS`, `TIGHT_POPUP_ICONS` | `POPUP_ICON_SRC`, `_fxLoad` | picture-door, pixel-readers |
| `stuckShaftScale` | effectsRenderer.js | 1248 | 5 | - | - | `ARROW_PINE` | - | - |
| `debrisDotTex` | effectsRenderer.js | 1406 | 15 | - | - | `_DEBRIS_DOT_TEX` | - | traps-page-rules |
| `ensureArrowBlastTex` | effectsRenderer.js | 1455 | 14 | - | - | `ARROW_BLAST`, `_arrowBlastLoad` | `_fxLoad` | traps-page-rules |
| `ensureSnowballBurstTex` | effectsRenderer.js | 1478 | 14 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | `_fxLoad` | mirror-audit, traps-page-rules |
| `freeFrostImpactTex` | effectsRenderer.js | 1510 | 15 | - | - | `SNOWBALL_BURST`, `_snowballBurstLoad` | - | traps-phone-memory |
| `propSlashTex` | effectsRenderer.js | 1546 | 26 | - | - | `_PROP_SLASH_TEX` | - | traps-page-rules |
| `splinterTex` | effectsRenderer.js | 1580 | 11 | - | - | `_SPLINTER_TEX` | - | traps-page-rules |
| `hardDotTex` | effectsRenderer.js | 1626 | 11 | - | - | `_HARD_DOT_TEX` | - | traps-page-rules |
| `groundDecalTex` | effectsRenderer.js | 1643 | 18 | - | - | `_GROUND_DECAL_TEX` | - | traps-page-rules |
| `nodeSpriteTex` | effectsRenderer.js | 1871 | 5 | - | - | `NODE_SPRITE_TEX`, `ORE_TEX`, `TREE_TEX` | - | - |
| `_installDmgFont` | effectsRenderer.js | 1995 | 5 | - | - | `DMG_ALL_CHARS`, `DMG_DIGIT_CHARS` | `DMG_BMP_BAKE_PX`, `DMG_WORD_BAKE_PX`, `DMG_WORD_PAGE_PX` | - |
| `_reinstallDmgFont` | effectsRenderer.js | 2027 | 14 | - | - | `_dmgFontSig` | `_dmgLog`, `_installDmgFont` | - |
| `dmgFontNeedsRebuild` | effectsRenderer.js | 2057 | 1 | - | - | `_dmgBmpReady`, `_dmgPagesGone` | - | - |
| `_letGoOfDmgPages` | effectsRenderer.js | 2058 | 10 | - | - | `_dmgPagesGone` | `_dmgLog` | - |
| `_dmgLog` | effectsRenderer.js | 2087 | 3 | - | - | `_dmgPagesGone` | - | - |
| `prewarmDmgFontPipe` | effectsRenderer.js | 2090 | 43 | - | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `_dmgBmpReady`, `_dmgPagesGone` | `DMG_BMP_BAKE_PX`, `DMG_WORD_BAKE_PX`, `_dmgLog`, `_letGoOfDmgPages`, `_reinstallDmgFont`, `dmgFontNeedsRebuild` | traps-phone-memory |
| `bubbleGradient` | effectsRenderer.js | 2188 | 14 | - | - | `_chatBubbleGrad` | `_bubbleGrads` | - |
| `cssToHex` | effectsRenderer.js | 2235 | 9 | - | - | `_hexMemo` | - | zone-leftovers |
| `_trimBakeCache` | effectsRenderer.js | 2298 | 13 | - | - | `_bakeFrame` | `REMOTE_BAKE_CACHE_MAX` | traps-phone-memory |
| `lootPop` | effectsRenderer.js | 2391 | 24 | - | - | `_NO_HOP` | `POP_ARC_S`, `POP_BOUNCE_S`, `POP_DELAY_S`, `POP_JUMP`, `POP_LAND_S` | - |
| `lootHop` | effectsRenderer.js | 2423 | 19 | - | - | `_NO_HOP` | `LAND_S`, `lootPop` | loot-clock |
| `EffectsRenderer.constructor` | effectsRenderer.js | 2492 | 738 | yes | - | `JET_STREAM`, `_fxPreload`, `_standInLegsUse` | `CHOP_GEAR_FW`, `DMG_SCALE`, `JET_LINGER_MS`, `JET_STREAM_ENABLED`, `MSG_FONT_PX`, `STANDIN_LEGS_OFF`, `_fxLoad`, `_sliceStandIn` | art-holds, elem-windup, farmwalk, fish-top-evict, held-numbers, keep-as-image, loader-retries, loot-clock, mirror-audit, owner-icons, picture-door, storm-eye, tick, water-frog, phase-table, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._standInTriggers` | effectsRenderer.js | 4234 | 27 | yes | - | - | - | - |
| `EffectsRenderer._loadChopSkinStrips` | effectsRenderer.js | 4273 | 11 | yes | - | - | - | - |
| `EffectsRenderer._bakeChopStrips` | effectsRenderer.js | 4325 | 36 | yes | - | - | `_bakeChopStrip` | - |
| `EffectsRenderer._peerChopFrames` | effectsRenderer.js | 4425 | 27 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_RETRY_MS`, `_bakeChopStrip` | - |
| `EffectsRenderer._dropPeerChop` | effectsRenderer.js | 4460 | 14 | yes | - | - | - | - |
| `EffectsRenderer._loadCookStrips` | effectsRenderer.js | 4499 | 12 | yes | - | - | - | - |
| `EffectsRenderer._fetchAndBakeCook` | effectsRenderer.js | 4534 | 9 | yes | - | - | - | - |
| `EffectsRenderer._bakeCookStrips` | effectsRenderer.js | 4571 | 36 | yes | - | - | `_sliceStandIn` | - |
| `EffectsRenderer._peerStandInInk` | effectsRenderer.js | 4651 | 30 | yes | - | - | `PEER_INK_CAP`, `STANDIN_INK`, `_sliceStandIn` | - |
| `EffectsRenderer._dropPeerStandInInk` | effectsRenderer.js | 4684 | 15 | yes | - | - | - | - |
| `EffectsRenderer._peerFigFrames` | effectsRenderer.js | 4709 | 25 | yes | - | - | `PEER_FIG_EST`, `PEER_FIG_LOAD_MS`, `PEER_FIG_RETRY_MS`, `STANDIN_INK`, `_sliceStandIn` | - |
| `EffectsRenderer._peerFigBytes` | effectsRenderer.js | 4743 | 10 | yes | - | - | `PEER_FIG_EST` | - |
| `EffectsRenderer._peerFigRoom` | effectsRenderer.js | 4759 | 19 | yes | - | - | `PEER_FIG_BUDGET` | - |
| `EffectsRenderer._dropPeerFig` | effectsRenderer.js | 4779 | 17 | yes | - | - | - | - |
| `EffectsRenderer._gearStripPending` | effectsRenderer.js | 4805 | 10 | yes | - | - | `PEER_GREAVES_WAIT_MS` | - |
| `EffectsRenderer._peerFigure` | effectsRenderer.js | 4839 | 55 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._peerFigureReady` | effectsRenderer.js | 4906 | 4 | yes | - | - | - | - |
| `EffectsRenderer._loadFireStrips` | effectsRenderer.js | 4946 | 19 | yes | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fireWantLegless` | effectsRenderer.js | 4983 | 5 | - | - | - | `FIRE_LEGLESS_OFF` | - |
| `EffectsRenderer._fetchAndBakeFire` | effectsRenderer.js | 4989 | 39 | yes | - | `FIRE_SKIN_OPTS` | `FIRE_URL`, `_bakeFireSplit`, `_sliceStandIn` | - |
| `EffectsRenderer._seatStandInTraits` | effectsRenderer.js | 5070 | 7 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOn` | effectsRenderer.js | 5077 | 14 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer.update` | effectsRenderer.js | 5108 | 64 | yes | - | `_bakeFrame` | `GPU_WAIT_MS`, `REMOTE_BAKE_CACHE_MAX`, `_trimBakeCache` | drop-lines, elem-windup, fire-strip, keep-as-image, mirror-audit, owner-icons, renderer-life, storm-eye, water-frog |
| `EffectsRenderer._dot` | effectsRenderer.js | 5228 | 19 | yes | - | - | `hardDotTex` | - |
| `EffectsRenderer._hideSpareDots` | effectsRenderer.js | 5248 | 21 | yes | - | - | - | - |
| `EffectsRenderer._updateParticles` | effectsRenderer.js | 5274 | 171 | yes | - | - | `cssToHex` | - |
| `EffectsRenderer._updateDamageNumbers` | effectsRenderer.js | 5562 | 236 | yes | - | `DMG_STYLE`, `DMG_STYLE_EMOJI`, `POPUP_ICONS`, `TIGHT_POPUP_ICONS`, `_dmgBmpReady` | `DMG_BMP_BAKE_PX`, `DMG_BMP_RE`, `DMG_CRIT_FONT_PX`, `DMG_DIGIT_RE`, `DMG_FONT_PX`, `DMG_SCALE`, `DMG_WORD_BAKE_PX`, `MSG_EDGE_PX`, `MSG_FONT_PX`, `isDamagePopup` | traps-phone-memory |
| `EffectsRenderer._updateScreenFlash` | effectsRenderer.js | 6027 | 41 | yes | - | - | `cssToHex` | - |
| `EffectsRenderer._updateAtmosphere` | effectsRenderer.js | 6071 | 29 | yes | - | - | - | - |
| `EffectsRenderer._updateProjectiles` | effectsRenderer.js | 6115 | 319 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `MAGIC_BOLT_FRAMES`, `MAGIC_SPECIAL` | `HOT_SPECIAL_ARROW`, `cssToHex`, `stuckShaftScale` | - |
| `EffectsRenderer._placeCookFood` | effectsRenderer.js | 6748 | 29 | yes | - | `GESTURE_TOOLS` | `_fxLoad` | - |
| `EffectsRenderer._placeMagicBolt` | effectsRenderer.js | 6791 | 47 | yes | - | `MAGIC_BOLT_FRAMES` | `MAGIC_BOLT_FRAME_MS` | - |
| `EffectsRenderer._placeSpecialFx` | effectsRenderer.js | 6869 | 48 | yes | - | - | - | - |
| `EffectsRenderer.projScaleProbe` | effectsRenderer.js | 6971 | 1 | yes | - | - | - | - |
| `EffectsRenderer.stuckScaleProbe` | effectsRenderer.js | 6972 | 1 | yes | - | - | - | - |
| `EffectsRenderer._updateProjectileTrail` | effectsRenderer.js | 6974 | 26 | - | - | - | - | - |
| `EffectsRenderer._fillPoly` | effectsRenderer.js | 7018 | 6 | - | - | - | - | - |
| `EffectsRenderer._drawArrow` | effectsRenderer.js | 7030 | 21 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._placeArrowSprite` | effectsRenderer.js | 7083 | 24 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._noteJetStream` | effectsRenderer.js | 7135 | 35 | yes | - | `ARROW_PINE`, `JET_STREAM` | `JET_MAX`, `JET_STREAM_ENABLED` | - |
| `EffectsRenderer._drawJetStreams` | effectsRenderer.js | 7214 | 22 | yes | - | `JET_STREAM` | `JET_ALPHA`, `JET_LINGER_MS` | - |
| `EffectsRenderer._placeJetSprite` | effectsRenderer.js | 7250 | 18 | yes | - | - | - | - |
| `EffectsRenderer._resetArrowSprites` | effectsRenderer.js | 7282 | 10 | yes | - | - | - | - |
| `EffectsRenderer._drawStuckArrow` | effectsRenderer.js | 7298 | 17 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._drawStuckMagicShard` | effectsRenderer.js | 7339 | 8 | yes | - | - | - | - |
| `EffectsRenderer._updateTelegraphs` | effectsRenderer.js | 7349 | 16 | yes | - | - | - | - |
| `EffectsRenderer._updateOverlays` | effectsRenderer.js | 7369 | 396 | yes | - | - | - | - |
| `EffectsRenderer._renderChatBubble` | effectsRenderer.js | 8663 | 130 | yes | - | - | `bubbleGradient` | - |
| `EffectsRenderer._updateChatBubbles` | effectsRenderer.js | 8947 | 57 | yes | - | - | `NPC_BUBBLE_REACH` | traps-page-rules |
| `EffectsRenderer._updateEmotePops` | effectsRenderer.js | 9079 | 83 | yes | - | `_emoteActive`, `_emoteEms`, `_emoteIds`, `_emoteSrcs` | `EMOTE_POP_FONT` | - |
| `EffectsRenderer._updateHUD` | effectsRenderer.js | 9175 | 21 | yes | - | - | - | - |
| `EffectsRenderer.disposeLootById` | effectsRenderer.js | 9222 | 10 | yes | - | - | - | - |
| `EffectsRenderer.disposeLootRef` | effectsRenderer.js | 9239 | 5 | yes | - | - | - | - |
| `EffectsRenderer.flushAllLoot` | effectsRenderer.js | 9253 | 5 | yes | - | - | - | - |
| `EffectsRenderer._renderPileShine` | effectsRenderer.js | 9265 | 82 | yes | - | - | `BEAM_A`, `BEAM_AT_S`, `BEAM_FLICKER`, `BEAM_HALO_A`, `BEAM_MOTES`, `BEAM_ON`, `BEAM_PULSE_HZ`, `BEAM_RISE_S`, `LOOT_BEAMS_MAX` | - |
| `EffectsRenderer._disposeLoot` | effectsRenderer.js | 9366 | 29 | yes | - | - | - | - |
| `EffectsRenderer._renderDroppedItem` | effectsRenderer.js | 9417 | 56 | yes | - | `DROP_COUNT_STYLE` | `DROP_ICON_WORLD` | - |
| `EffectsRenderer._renderOwnerLabel` | effectsRenderer.js | 9484 | 31 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._renderShardOverlay` | effectsRenderer.js | 9522 | 18 | yes | - | `SHARD_ICONS` | - | - |
| `EffectsRenderer._renderCoinOverlay` | effectsRenderer.js | 9545 | 37 | yes | - | `LABEL_STYLE` | - | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._renderRareItems` | effectsRenderer.js | 9599 | 76 | yes | - | `_AT_MIDDLE` | `lootHop` | loot-clock |
| `EffectsRenderer._updateGroundLoot` | effectsRenderer.js | 9686 | 403 | yes | - | `LABEL_STYLE`, `LABEL_STYLE_EMOJI`, `_AT_MIDDLE` | `cssToHex`, `lootHop` | traps-page-rules, traps-phone-memory |
| `EffectsRenderer._updateFootprints` | effectsRenderer.js | 10338 | 33 | yes | - | - | `PRINT_ALPHA`, `PRINT_TTL_MS` | - |
| `EffectsRenderer._updateGroundSplatter` | effectsRenderer.js | 10402 | 54 | yes | - | - | `cssToHex`, `groundDecalTex` | - |
| `EffectsRenderer._updateArrowSnaps` | effectsRenderer.js | 10500 | 22 | yes | - | - | - | - |
| `EffectsRenderer._spawnArrowSnap` | effectsRenderer.js | 10523 | 40 | yes | - | `ARROW_PINE` | `SNAP_G`, `SNAP_MAX`, `splinterTex` | - |
| `EffectsRenderer._stepSnapPiece` | effectsRenderer.js | 10574 | 28 | - | - | - | `SNAP_FADE_MS`, `SNAP_G`, `SNAP_REST_MS` | - |
| `EffectsRenderer._killArrowSnap` | effectsRenderer.js | 10604 | 4 | - | - | - | - | - |
| `EffectsRenderer._clearArrowSnaps` | effectsRenderer.js | 10609 | 4 | yes | - | - | - | - |
| `EffectsRenderer.arrowSnapProbe` | effectsRenderer.js | 10615 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propById` | effectsRenderer.js | 10651 | 9 | yes | - | - | - | - |
| `EffectsRenderer._propRec` | effectsRenderer.js | 10664 | 4 | yes | - | - | - | - |
| `EffectsRenderer._propOverlay` | effectsRenderer.js | 10669 | 15 | yes | - | - | - | traps-page-rules |
| `EffectsRenderer._clearPropMarks` | effectsRenderer.js | 10685 | 12 | yes | - | - | - | - |
| `EffectsRenderer._killPropMark` | effectsRenderer.js | 10698 | 5 | - | - | - | - | - |
| `EffectsRenderer._spawnPropMark` | effectsRenderer.js | 10705 | 67 | yes | - | - | `HOT_SPECIAL_ARROW`, `PROP_ARROWS_PER_PROP`, `PROP_MARKS_MAX`, `PROP_SCORCHES_PER_PROP`, `PROP_SLASHES_PER_PROP`, `propSlashTex` | - |
| `EffectsRenderer._stuckArrowTex` | effectsRenderer.js | 10781 | 7 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._poseStuckArrow` | effectsRenderer.js | 10794 | 14 | - | - | `ARROW_PINE`, `ARROW_SPECIAL` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._placePropArrow` | effectsRenderer.js | 10812 | 33 | yes | - | - | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._heatPropArrow` | effectsRenderer.js | 10857 | 5 | - | - | - | - | - |
| `EffectsRenderer._volleyWorld` | effectsRenderer.js | 10866 | 3 | - | - | - | - | - |
| `EffectsRenderer._reapPropArrows` | effectsRenderer.js | 10872 | 9 | yes | - | - | - | - |
| `EffectsRenderer._updatePropMarks` | effectsRenderer.js | 10882 | 62 | yes | - | - | `HOT_SPECIAL_ARROW`, `SCORCH_GLOW_MS` | - |
| `EffectsRenderer.propDepthProbe` | effectsRenderer.js | 10956 | 10 | yes | - | - | - | - |
| `EffectsRenderer.propMarksProbe` | effectsRenderer.js | 10969 | 25 | yes | - | `ARROW_PINE`, `ARROW_SPECIAL`, `_PROP_SLASH_TEX` | `HOT_SPECIAL_ARROW` | - |
| `EffectsRenderer._updateDebrisBursts` | effectsRenderer.js | 10999 | 18 | yes | - | - | - | - |
| `EffectsRenderer._disposeNode` | effectsRenderer.js | 11029 | 15 | - | - | - | - | - |
| `EffectsRenderer._peerWorkNodes` | effectsRenderer.js | 11062 | 30 | - | - | - | `PEER_SEAT_MATCH_PX` | - |
| `EffectsRenderer._treeSeeThrough` | effectsRenderer.js | 11099 | 21 | - | - | - | - | - |
| `EffectsRenderer._updateGatherNodes` | effectsRenderer.js | 11132 | 179 | yes | - | `_trapArt` | `cssToHex`, `nodeSpriteTex` | - |
| `EffectsRenderer._drawGatherHpBar` | effectsRenderer.js | 11493 | 38 | yes | - | - | - | - |
| `EffectsRenderer._nodeLabelAt` | effectsRenderer.js | 11572 | 20 | yes | - | - | - | - |
| `EffectsRenderer._nodeHpBarAt` | effectsRenderer.js | 11602 | 27 | - | - | - | - | - |
| `EffectsRenderer._updateMonsterImpacts` | effectsRenderer.js | 11640 | 6 | yes | - | - | - | - |
| `EffectsRenderer._updateSlimeShockwaves` | effectsRenderer.js | 11660 | 39 | yes | - | - | `SLIME_WAVE_MS` | - |
| `EffectsRenderer.snowballBurstProbe` | effectsRenderer.js | 11707 | 4 | yes | - | `SNOWBALL_BURST` | - | - |
| `EffectsRenderer.sootProbe` | effectsRenderer.js | 11713 | 1 | yes | - | - | - | - |
| `EffectsRenderer.slimeShockwaveProbe` | effectsRenderer.js | 11716 | 4 | yes | - | - | - | - |
| `EffectsRenderer._updateSnowballBursts` | effectsRenderer.js | 11724 | 36 | yes | - | `SNOWBALL_BURST` | `SNOWBALL_BURST_MS` | mirror-audit |
| `EffectsRenderer._updateArrowBlasts` | effectsRenderer.js | 11782 | 37 | yes | - | `ARROW_BLAST` | `ARROW_BLAST_D`, `ARROW_BLAST_MS` | - |
| `EffectsRenderer.arrowBlastProbe` | effectsRenderer.js | 11829 | 11 | yes | - | `ARROW_BLAST` | - | - |
| `EffectsRenderer._landAuraCap` | effectsRenderer.js | 11842 | 1 | - | - | - | - | - |
| `EffectsRenderer._spawnOreBreak` | effectsRenderer.js | 11850 | 20 | yes | - | `ORE_ICON_TIER_TEX`, `ORE_TEX` | - | - |
| `EffectsRenderer._spawnItemPopup` | effectsRenderer.js | 11874 | 10 | yes | - | - | - | - |
| `EffectsRenderer._advanceItemPops` | effectsRenderer.js | 11886 | 18 | yes | - | - | - | - |
| `EffectsRenderer._advanceOreBreaks` | effectsRenderer.js | 11909 | 26 | yes | - | - | `ORE_BREAK_LIE_MS`, `ORE_POP_LATE_MS`, `ORE_SPLIT_MS` | - |
| `EffectsRenderer._oreBreakVol` | effectsRenderer.js | 11968 | 6 | - | - | - | - | - |
| `EffectsRenderer._oreCrack` | effectsRenderer.js | 11980 | 10 | yes | - | - | - | - |
| `EffectsRenderer._oreSplit` | effectsRenderer.js | 11993 | 7 | yes | - | `ORE_ICON_TEX` | - | - |
| `EffectsRenderer._spawnCookSmoke` | effectsRenderer.js | 12016 | 20 | yes | - | - | `debrisDotTex` | - |
| `EffectsRenderer._updateCookSmoke` | effectsRenderer.js | 12040 | 19 | yes | - | - | - | - |
| `EffectsRenderer._updateFxBursts` | effectsRenderer.js | 12060 | 30 | yes | - | `EFFECT_BURSTS` | `FX_BURST_MS` | - |
| `EffectsRenderer._updateFireTrail` | effectsRenderer.js | 12119 | 52 | yes | - | - | - | - |
| `EffectsRenderer._updateWhirlVortex` | effectsRenderer.js | 12211 | 44 | yes | - | - | - | - |
| `EffectsRenderer._buildSmithFx` | effectsRenderer.js | 12282 | 40 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | - |
| `EffectsRenderer._updateSmithing` | effectsRenderer.js | 12334 | 57 | yes | - | `SMITH_ANVIL` | `SMITH_FLAME_H0` | sound-cues, townsfolk-walk |
| `EffectsRenderer._updateElemStatusFx` | effectsRenderer.js | 12431 | 451 | yes | - | - | `BURN_BLAZE`, `GOO_HOLD`, `PEER_FIRES` | - |
| `EffectsRenderer._updateAbilityWindups` | effectsRenderer.js | 12991 | 49 | yes | - | - | - | - |
| `EffectsRenderer._markWhirlCatch` | effectsRenderer.js | 13075 | 59 | yes | - | - | `WHIRL_CATCH_MAX` | - |
| `EffectsRenderer._updateCatchFlights` | effectsRenderer.js | 13153 | 44 | yes | - | - | - | - |
| `EffectsRenderer._updateFishingHole` | effectsRenderer.js | 13215 | 18 | yes | - | - | - | - |
| `EffectsRenderer._drawFishingHole` | effectsRenderer.js | 13247 | 15 | yes | - | - | - | - |
| `EffectsRenderer._updateCampfire` | effectsRenderer.js | 13277 | 3 | yes | - | - | `FIRE_FRAME_MS` | - |
| `EffectsRenderer._updateFiremaking` | effectsRenderer.js | 13283 | 64 | yes | - | - | `FIRE_FRAME_MS` | - |
| `EffectsRenderer._peerChopTree` | effectsRenderer.js | 13437 | 19 | - | - | - | `PEER_CHOP_REACH`, `PEER_GATHER_NODE_TTL_MS` | - |
| `EffectsRenderer._updateRemoteExtraction` | effectsRenderer.js | 13470 | 261 | yes | - | - | `CHOP_GEAR_FW`, `FIRE_FRAME_MS`, `PEER_CHOP_IDLE_MS`, `PEER_COOK_REACH`, `PEER_FIG_IDLE_MS`, `PEER_INK_IDLE_MS` | - |
| `EffectsRenderer._tintGearSprite` | effectsRenderer.js | 14031 | 7 | - | - | - | `_standInTints` | - |
| `EffectsRenderer._weaponStrip` | effectsRenderer.js | 14056 | 9 | yes | - | - | - | - |
| `EffectsRenderer._gearStripFrame` | effectsRenderer.js | 14066 | 76 | yes | - | `_combatTrimFrames`, `_combatTrimStats`, `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | loader-retries, picture-door |
| `EffectsRenderer._shirtId` | effectsRenderer.js | 14248 | 6 | - | - | - | - | - |
| `EffectsRenderer._myShirtLook` | effectsRenderer.js | 14261 | 7 | yes | - | - | - | - |
| `EffectsRenderer._peerShirtLook` | effectsRenderer.js | 14268 | 10 | - | - | - | - | - |
| `EffectsRenderer._dressedShirtFrame` | effectsRenderer.js | 14283 | 56 | yes | - | `_fxPreload` | `SHIRT_PATTERN_K` | picture-door |
| `EffectsRenderer._evictDressed` | effectsRenderer.js | 14344 | 10 | yes | - | - | `DRESSED_MAX` | - |
| `EffectsRenderer._warmDressedShirts` | effectsRenderer.js | 14357 | 17 | yes | - | - | `CHOP_GEAR_FW` | - |
| `EffectsRenderer._placeSwingShirt` | effectsRenderer.js | 14376 | 22 | yes | - | - | - | - |
| `EffectsRenderer._peerStandInArt` | effectsRenderer.js | 14443 | 7 | - | - | - | - | - |
| `EffectsRenderer._greavesShapeOnce` | effectsRenderer.js | 14463 | 22 | yes | - | `_fxPreload` | `GEAR_STRIP_TIMEOUT_MS` | picture-door |
| `EffectsRenderer._noteGreavesShape` | effectsRenderer.js | 14488 | 15 | yes | - | - | `STANDIN_LEGS_OFF` | loader-retries |
| `EffectsRenderer._greavesUnder` | effectsRenderer.js | 14506 | 8 | yes | - | `_standInLegsUse` | - | - |
| `EffectsRenderer._legsUnderFor` | effectsRenderer.js | 14517 | 6 | yes | - | - | - | held-sweep |
| `EffectsRenderer._legsWornFor` | effectsRenderer.js | 14524 | 4 | yes | - | `_standInLegsUse` | - | held-sweep |
| `EffectsRenderer._rebakeLegBodies` | effectsRenderer.js | 14529 | 11 | yes | - | - | - | - |
| `EffectsRenderer._remoteBodyFramesFor` | effectsRenderer.js | 14545 | 29 | yes | - | `_bakeFrame`, `_standInLegsUse` | `_sliceStandIn`, `_trimBakeCache` | - |
| `EffectsRenderer._remoteSheetFramesFor` | effectsRenderer.js | 14590 | 24 | yes | - | `_bakeFrame` | `_sliceStandIn`, `_trimBakeCache` | - |
| `EffectsRenderer._placeJogLegs` | effectsRenderer.js | 14629 | 50 | yes | - | - | `_standInTints` | - |
| `EffectsRenderer._ensureRemoteSwordSet` | effectsRenderer.js | 14751 | 9 | yes | - | - | - | - |
| `EffectsRenderer._placeSkillTraitsOnFor` | effectsRenderer.js | 14771 | 12 | yes | - | - | `_isGatheringStandIn`, `_placeStandInCapeOn` | - |
| `EffectsRenderer._updateRemoteSwordSwings` | effectsRenderer.js | 14789 | 161 | yes | - | `SWORD_SLASH` | - | - |
| `EffectsRenderer._ensureRemoteBowSet` | effectsRenderer.js | 15039 | 12 | yes | - | - | - | - |
| `EffectsRenderer._updateRemoteBowShots` | effectsRenderer.js | 15070 | 127 | yes | - | - | `BLOCK_POSE_FRAME` | - |
| `EffectsRenderer._publishPeerBlockArms` | effectsRenderer.js | 15256 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placePeerBlockHands` | effectsRenderer.js | 15281 | 56 | yes | - | - | - | - |
| `EffectsRenderer._orderSwingWeapon` | effectsRenderer.js | 15346 | 11 | - | - | - | - | - |
| `EffectsRenderer._placeStandInShield` | effectsRenderer.js | 15371 | 49 | yes | - | - | - | - |
| `EffectsRenderer._updateSwordSwing` | effectsRenderer.js | 15455 | 134 | yes | - | `SWORD_SLASH` | - | - |
| `EffectsRenderer._placeBlockOffHand` | effectsRenderer.js | 15717 | 12 | yes | - | - | - | - |
| `EffectsRenderer._placeOffHandWeapon` | effectsRenderer.js | 15742 | 64 | - | - | - | - | - |
| `EffectsRenderer._predictBowGrip` | effectsRenderer.js | 15917 | 20 | yes | - | - | `BOW_GRIP_GUESS_OFF` | - |
| `EffectsRenderer._updateBowShot` | effectsRenderer.js | 15942 | 137 | yes | - | - | `BLOCK_POSE_FRAME` | - |
| `EffectsRenderer.captureAttackFrames` | effectsRenderer.js | 16229 | 84 | yes | - | `ARROW_PINE`, `SWORD_SLASH` | - | - |
| `EffectsRenderer._photographFar` | effectsRenderer.js | 16348 | 18 | yes | - | - | - | - |
| `EffectsRenderer._placeCookFigure` | effectsRenderer.js | 16375 | 38 | yes | - | - | - | - |
| `EffectsRenderer._loadFarmStrips` | effectsRenderer.js | 16491 | 36 | yes | - | - | - | - |
| `EffectsRenderer._farmReadyNow` | effectsRenderer.js | 16537 | 6 | yes | - | - | - | - |
| `EffectsRenderer._farmUnderWanted` | effectsRenderer.js | 16550 | 1 | - | - | - | - | - |
| `EffectsRenderer._bakeFarmBodies` | effectsRenderer.js | 16551 | 34 | yes | - | - | `FARM_MIN_BLOB`, `_sliceStandIn` | - |
| `EffectsRenderer._warmFarmDressed` | effectsRenderer.js | 16596 | 14 | yes | - | - | - | - |
| `EffectsRenderer._dropGearStrip` | effectsRenderer.js | 16613 | 10 | yes | - | `_combatTrimFrames` | - | - |
| `EffectsRenderer._freeFarm` | effectsRenderer.js | 16625 | 34 | yes | - | - | - | - |
| `EffectsRenderer._peerFarmFigure` | effectsRenderer.js | 16678 | 14 | yes | - | - | - | - |
| `EffectsRenderer._drawPeerFarmer` | effectsRenderer.js | 16696 | 75 | yes | - | - | `farmCrownMed` | - |
| `EffectsRenderer._destroyPeerFarmer` | effectsRenderer.js | 16784 | 8 | - | - | - | - | art-holds |
| `EffectsRenderer._peerFarmersProbe` | effectsRenderer.js | 16794 | 20 | yes | - | - | - | - |
| `EffectsRenderer._updateFarmWork` | effectsRenderer.js | 16823 | 96 | yes | - | - | `farmCrownMed` | - |
| `EffectsRenderer.setCaptureRenderer` | effectsRenderer.js | 16979 | 1 | yes | - | - | - | - |
| `EffectsRenderer._peerOnWorker` | effectsRenderer.js | 17002 | 33 | yes | - | `_bakeFrame` | `_trimBakeCache` | - |
| `EffectsRenderer._dressedOnWorker` | effectsRenderer.js | 17044 | 30 | yes | - | - | - | - |
| `EffectsRenderer._own` | effectsRenderer.js | 17074 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._gpuOnly` | effectsRenderer.js | 17097 | 10 | yes | - | - | - | - |
| `EffectsRenderer._gpuOnceDrawn` | effectsRenderer.js | 17112 | 5 | yes | - | - | - | gpu-only |
| `EffectsRenderer._release` | effectsRenderer.js | 17117 | 7 | yes | - | - | - | - |
| `EffectsRenderer._letGo` | effectsRenderer.js | 17124 | 16 | yes | - | - | - | - |
| `EffectsRenderer.destroy` | effectsRenderer.js | 17158 | 41 | yes | - | - | - | art-holds, death-zones, elem-windup, fish-top-evict, folk-sheets, keep-as-image, loader-retries, loot-clock, renderer-life, storm-eye, townsfolk-walk, water-frog, weapon-feel, traps-page-rules, traps-phone-memory |
| `EffectsRenderer._slimeTexelWorld` | effectsRenderer.js | 17236 | 1 | - | - | - | - | - |
| `EffectsRenderer._filmScale` | effectsRenderer.js | 17238 | 1 | yes | - | - | - | - |
| `EffectsRenderer.captureFxFilm` | effectsRenderer.js | 17240 | 20 | yes | - | - | - | - |
| `EffectsRenderer._filmShoot` | effectsRenderer.js | 17266 | 13 | - | - | - | - | - |
| `EffectsRenderer._filmGunk` | effectsRenderer.js | 17290 | 43 | yes | - | - | - | - |
| `EffectsRenderer._filmStuck` | effectsRenderer.js | 17358 | 36 | yes | - | `ARROW_PINE` | `stuckShaftScale` | - |
| `EffectsRenderer._filmHotArrow` | effectsRenderer.js | 17407 | 46 | yes | - | `ARROW_PINE` | - | - |
| `EffectsRenderer._filmCrash` | effectsRenderer.js | 17470 | 29 | yes | - | - | - | - |
| `EffectsRenderer._updateExtractionCue` | effectsRenderer.js | 17506 | 230 | yes | - | `GESTURE_TOOLS` | `CHOP_GEAR_FW` | - |
| `EffectsRenderer.clear` | effectsRenderer.js | 18011 | 65 | yes | - | - | - | drop-lines, dungeon-clear, elem-windup, farmwalk, gpu-only, look-relay, mirror-audit, picture-door, renderer-life, storm-eye, tick, townsfolk-walk, water-frog, weapon-feel, zone-leftovers, phase-table, traps-phone-memory |
