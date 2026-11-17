# Card M: the renderers' tables, counted (v2.3.5344)

Made by `node tools/guards/render-tables.test.mjs --write` from
`tools/guards/lib/renderTables.mjs`, the one reader of the two renderers'
top level (its header pins the rules). Never edited by hand: the guard
fails a page that is not the scan's (line numbers aside). The tables line
(`TABLES_LINE`) only falls; the gatekeeper lowers it.

## The count

| | entityRenderer.js | effectsRenderer.js |
|---|---|---|
| tables (counted) | 0 | 24 |
| written into (apart) | 14 | 15 |
| handed on (apart) | 10 | 14 |
| frozen (a call: apart) | 3 | 2 |
| lone constants | 80 | 115 |
| ...tuned (leave with the tables) | 0 | 32 |

Suites that name a counted table or a tuned constant by its text: 4 (`drop-lines`, `loader-retries`, `loot-clock`, `townsfolk-walk`). They move with the two table PRs (the owner's review, 2026-11-17).

## The systems, and their order (largest first)

A counted table's system is read by hand from what it draws
(`SYSTEM_BY_HAND` in the lib). The tables leave in two PRs, one a renderer
(tag 5345 entityRenderer.js, 5346 effectsRenderer.js); in each, the
systems go in this order, a system's tables together.

| renderer | system | tables | their lines |
|---|---|---|---|
| effectsRenderer.js | skills | 14 | 33 |
| effectsRenderer.js | economy | 5 | 12 |
| effectsRenderer.js | combat | 4 | 4 |
| effectsRenderer.js | look | 1 | 1 |

## 0. Moved out (src/rendering/tables/)

Each moved verbatim with its comment block and imported back by the same
name; the PR that moved it showed each deep-equal to its literal before.

- `src/rendering/tables/combat.js` (10): `SOUTH_IDLE_TILT`, `GRIP_NUDGE_X`, `GRIP_HOLE_FACINGS`, `GRIP_HOLE_R`, `GRIP_HOLE_R_BY_FACING`, `SWING_FULL_ARC`, `REST_ANG`, `BLOCK_ARM_SHOULDER`, `SOUTH_BLOCK_OFFHAND`, `SOUTH_BLOCK_OFFHAND_BY_TYPE`
- `src/rendering/tables/look.js` (27): `MINE_TRAIT_MUL`, `FISH_TRAIT_MUL`, `PLAYER_SIZE_MULT`, `TRAIT_RETRY_LATER_MS`, `_TRAIT_RETRY_MS`, `MIRROR_SCREEN_DIR`, `JOG_FOOT_FRAMES`, `BODY_DIR_SCALE`, `BODY_ROWS`, `JOG_EW_HAT_TUNE`, `STAND_HAT_TUNE`, `FULLSET_CROWN`, `FULLSET_HEAD_RES`, `FULLSET_HEAD_SEAT`, `_GEAR_SLOTS`, `_CAPE_HIDDEN_POSES`, `_CAPE_JOG_TILT`, `_CAPE_PIVOT_Y`, `_CAPE_JOG_DX`, `_CAPE_HOOD_TILT_K`, `_CAPE_HOOD_DX_K`, `BODY_NECK_FRAC`, `BODY_WAIST_FRAC`, `_REGION_SPR`, `BODY_CELL_MID`, `LOCAL_BODY_SCALE`, `NECK_ROWS`
- `src/rendering/tables/monsters.js` (1): `MONSTER_SIZE_MULT`
- `src/rendering/tables/preload.js` (1): `PREWARM_POSES`
- `src/rendering/tables/render.js` (2): `PET_DRAW_K`, `SECTORS`
- `src/rendering/tables/townsfolk.js` (8): `NPC_TALK_PX`, `NPC_SPRITE_SCALE`, `NPC_FRAME_FEET_Y`, `NPC_FRAME_TOP_Y`, `NPC_PLATE_DROP_FRAC`, `NPC_DIRS_8`, `NPC_WALK_PX_PER_FRAME`, `QUEST_BADGE_R`
- `src/rendering/tables/ui.js` (28): `THREAT_SKULL_PX`, `HPBAR_ASPECT`, `HPBAR_IN_X`, `HPBAR_IN_W`, `HPBAR_IN_Y`, `HPBAR_IN_H`, `PEER_HPBAR_Y`, `MONSTER_HPBAR_W`, `PLAYER_HPBAR_W`, `PLAYER_HEART_SIZE`, `MONSTER_HEART_SIZE`, `HP_RING_OUTER_R`, `HP_RING_GAP_PX`, `PLATE_BORDER_PX`, `PLATE_LEVEL_STROKE_PX`, `PLATE_H_RATIO`, `PLATE_PAD_L_RATIO`, `PLATE_GAP_RATIO`, `PLATE_PAD_R_RATIO`, `PLATE_BADGE_TYPE_RATIO`, `RES_BAR_W`, `RES_BAR_H`, `RES_MP_Y`, `RES_BLOCK_W`, `RES_FILL`, `RES_GHOST`, `RES_GHOST_HEX`, `RES_SPENT_GAP`

## 1. The tables (counted)

| name | file | line | lines | system | names tables | suites that read it |
|---|---|---|---|---|---|---|
| `CHOP_INK_KEYS` | effectsRenderer.js | 234 | 1 | skills | - | - |
| `COOK_URL` | effectsRenderer.js | 288 | 1 | skills | - | - |
| `SECTORS8` | effectsRenderer.js | 398 | 1 | combat | - | - |
| `FARM_GEAR` | effectsRenderer.js | 562 | 1 | skills | - | - |
| `FARM_PEER_LAYERS` | effectsRenderer.js | 565 | 1 | skills | - | - |
| `GEAR_STRIP_TWIN` | effectsRenderer.js | 692 | 1 | skills | - | loader-retries |
| `DRESSED_ONE_FRAME` | effectsRenderer.js | 741 | 1 | skills | - | - |
| `FIRE_LOG_BAND` | effectsRenderer.js | 898 | 1 | skills | - | - |
| `_STAND_IN_TRAIT_KEYS` | effectsRenderer.js | 1204 | 1 | look | - | - |
| `FIRE_GEAR_REG` | effectsRenderer.js | 1347 | 16 | skills | - | - |
| `BOW_AIM_SECTORS` | effectsRenderer.js | 1496 | 1 | combat | - | - |
| `MAGIC_BOLT_ANCHOR` | effectsRenderer.js | 1687 | 1 | combat | - | - |
| `SWORD_FEEL_FLIP` | effectsRenderer.js | 1803 | 1 | combat | - | - |
| `NODE_SPRITE_HEIGHT_BASE` | effectsRenderer.js | 2506 | 1 | skills | - | - |
| `NODE_SPRITE_ANCHOR_Y` | effectsRenderer.js | 2507 | 1 | skills | - | - |
| `NODE_ART_BASE` | effectsRenderer.js | 2521 | 1 | skills | - | - |
| `NODE_HPBAR_AT` | effectsRenderer.js | 2548 | 5 | skills | - | - |
| `NODE_LABEL_TOP` | effectsRenderer.js | 2558 | 1 | skills | - | - |
| `NODE_TIER_TINT` | effectsRenderer.js | 2597 | 1 | skills | - | - |
| `LOOT_Z` | effectsRenderer.js | 3187 | 4 | economy | - | loot-clock |
| `LOOT_BEAMS_BY_RANK` | effectsRenderer.js | 3241 | 1 | economy | - | - |
| `BEAM_SLOTS` | effectsRenderer.js | 3244 | 5 | economy | - | - |
| `RARE_KINDS` | effectsRenderer.js | 3314 | 1 | economy | - | - |
| `HOP_KEYS` | effectsRenderer.js | 3373 | 1 | economy | - | - |

## 2. The tuned lone constants (a scale, an offset or an anchor of the art)

Marked by the name's words (`TUNED_WORDS`, none of `UNTUNED_WORDS`). They
leave with their renderer's tables.

| name | file | line | system | suites that read it |
|---|---|---|---|---|
| `PRINT_W` | effectsRenderer.js | 327 | (not read yet) | - |
| `STANDIN_REF_BODY_H` | effectsRenderer.js | 439 | (not read yet) | - |
| `CHOP_STANDIN_H` | effectsRenderer.js | 487 | (not read yet) | townsfolk-walk |
| `COOK_STANDIN_H` | effectsRenderer.js | 532 | (not read yet) | townsfolk-walk |
| `COOK_PAN_DX` | effectsRenderer.js | 608 | (not read yet) | - |
| `CHOP_OFFSET` | effectsRenderer.js | 635 | (not read yet) | - |
| `FIRE_STANDIN_H` | effectsRenderer.js | 819 | (not read yet) | - |
| `FIRE_FEET_ROW` | effectsRenderer.js | 834 | (not read yet) | - |
| `DMG_LIFT` | effectsRenderer.js | 1424 | (not read yet) | - |
| `JET_LEN_PX` | effectsRenderer.js | 1988 | (not read yet) | - |
| `SNOWBALL_BURST_H` | effectsRenderer.js | 2163 | (not read yet) | - |
| `PROP_SLASH_LEN` | effectsRenderer.js | 2296 | (not read yet) | - |
| `HARD_DOT_R` | effectsRenderer.js | 2328 | (not read yet) | - |
| `CAMPFIRE_HPBAR_GAP` | effectsRenderer.js | 2568 | (not read yet) | - |
| `DMG_STROKE_PX` | effectsRenderer.js | 2666 | (not read yet) | drop-lines |
| `DMG_WORD_PAD` | effectsRenderer.js | 2762 | (not read yet) | - |
| `EMOTE_POP_PX` | effectsRenderer.js | 3000 | (not read yet) | - |
| `LOOT_SCALE` | effectsRenderer.js | 3172 | (not read yet) | loot-clock |
| `DROP_GROW` | effectsRenderer.js | 3199 | (not read yet) | - |
| `BEAM_H_PX` | effectsRenderer.js | 3228 | (not read yet) | - |
| `BEAM_W_PX` | effectsRenderer.js | 3229 | (not read yet) | - |
| `BEAM_TEX_W` | effectsRenderer.js | 3231 | (not read yet) | - |
| `BEAM_TEX_H` | effectsRenderer.js | 3231 | (not read yet) | - |
| `BEAM_HALO_W` | effectsRenderer.js | 3232 | (not read yet) | - |
| `MOTE_PX` | effectsRenderer.js | 3237 | (not read yet) | - |
| `POP_H` | effectsRenderer.js | 3335 | (not read yet) | - |
| `POP_BOUNCE_H` | effectsRenderer.js | 3340 | (not read yet) | - |
| `PILE_R` | effectsRenderer.js | 3435 | (not read yet) | - |
| `SMITH_ANVIL_W` | effectsRenderer.js | 3479 | (not read yet) | - |
| `SMITH_ANVIL_X` | effectsRenderer.js | 3480 | (not read yet) | - |
| `SMITH_ANVIL_FOOT` | effectsRenderer.js | 3481 | (not read yet) | - |
| `SMITH_FACE_Y` | effectsRenderer.js | 3482 | (not read yet) | - |

## 3. The other lone constants (stay)

- entityRenderer.js: `WARD_RING_MS`:151, `COLLISION_GLOW_RANGE_PX`:181, `SKULL_RED_TINT`:199, `HUD_BAR_VER`:204, `CHAT_BUBBLE_MS`:253, `PEER_HPBAR_HOLD_MS`:258, `NOTICE_MS`:266, `HPBAR_FLASH_MS`:278, `POPUP_BAR_CLEAR`:288, `CARRY_WOBBLE`:314, `SPAWN_FX_MS`:323, `BOSS_SEE_THROUGH`:344, `FOLK_FAR_MARGIN`:589, `TRAIT_NFT_ID`:903, `TRAIT_VER`:910, `HEAD_WATCH_MS`:1142, `BODY_DATA_TIMEOUT_MS`:1226, `MASKED_CAP`:2585, `_BAKE_BUSY_MAX`:2987, `_BAKE_STUCK_MS`:3390, `_LOCAL_PATIENCE_MS`:3403, `FISH_TOP_CAP`:4347, `FISH_SKIN_DARK`:4374, `FISH_SKIN_LIGHT`:4374, `FISH_STEEL_LO`:4374, `FISH_STEEL_HI`:4374, `FISH_STEEL_INK`:4374, `FISH_RIM_MIN`:4375, `FISH_PINE_RG`:4376, `HAIR_MASK_ROUNDS`:4715, `SWORD_SWING_MS`:5082, `BOW_SHOT_MS`:5087, `BOW_RELEASE_MS`:5092, `HP_RING_BAND`:5620, `HP_RING_TRACK`:5623, `HP_RING_CENTER_FILL`:5624, `HP_TIER_GREEN`:5625, `HP_TIER_YELLOW`:5625, `HP_TIER_ORANGE`:5625, `HP_TIER_RED`:5625, `HP_RING_OUTLINE`:5626, `HP_GHOST_WHITE`:5627, `HP_GHOST_DRAIN`:5628, `HP_GHOST_DRAIN_M`:5629, `HP_GHOST_HOLD_MS`:5632, `SWING_ANIM_MS`:5788, `THROW_RELEASE_GRACE_MS`:5876, `_HIT_FLASH`:5917, `SELF_DEATH_HOLD_MS`:6405, `PLATE_INK`:6459, `PLATE_FILL_ALPHA`:6590, `PLATE_NAME_FILL`:6600, `PLATE_NAME_WEIGHT`:6607, `PLATE_BORDER_ALPHA`:6614, `PLATE_LEVEL_STROKE`:6683, `PLATE_ALARM_FILL`:6701, `PLATE_ALARM_FILL_ALPHA`:6727, `PLATE_ALARM_NAME_FILL`:6728, `PLATE_ALARM_NAME_WEIGHT`:6729, `PLATE_BOSS_FILL`:6739, `PLATE_BOSS_FILL_ALPHA`:6740, `PLATE_ALARM_LEVEL_FILL`:6749, `PLATE_ENGAGED_MS`:6753, `BRO_BADGE_URL`:6923, `PLATE_SCALE_MIN`:7111, `PLATE_SCALE_MAX`:7112, `CUE_ZOOM_MAX`:7123, `CARET_OUT`:7488, `CARET_BACK`:7489, `CARET_HALF`:7490, `SOUTH_BLOCK_OFFHAND_ENABLED`:7541, `SOUTH_BLOCK_OFFHAND_AIM`:7549, `RES_BORDER`:8773, `RES_BAR_MAX_W`:8815, `RES_HOLD_MS`:8821, `RES_FADE_MS`:8822, `RES_SLIDE_MS`:8823, `RES_TRACK`:8828, `RES_BORDER_COL`:8829, `RES_SPENT_TRAVEL`:8848
- effectsRenderer.js: `BLOCK_POSE_FRAME`:68, `PEER_CHOP_IDLE_MS`:235, `GPU_WAIT_MS`:236, `COOK_FW`:283, `COOK_FH`:283, `PEER_INK_CAP`:286, `PEER_INK_IDLE_MS`:287, `PRINT_TTL_MS`:326, `PRINT_ALPHA`:331, `FARM_MIN_BLOB`:556, `PEER_CHOP_REACH`:656, `PEER_COOK_REACH`:657, `PEER_GATHER_NODE_TTL_MS`:658, `PEER_SEAT_MATCH_PX`:663, `CHOP_GEAR_FW`:699, `DRESSED_MAX`:732, `FIRE_FW`:806, `FIRE_FH`:806, `FIRE_FRAME_MS`:841, `FIRE_LOG_LIT_REACH`:920, `PEER_FIG_BUDGET`:1036, `PEER_FIG_IDLE_MS`:1044, `PEER_FIG_LOAD_MS`:1052, `PEER_FIG_RETRY_MS`:1053, `PEER_GREAVES_WAIT_MS`:1054, `GEAR_STRIP_TIMEOUT_MS`:1055, `DMG_FONT_PX`:1383, `DMG_CRIT_FONT_PX`:1384, `POPUP_ZOOM`:1491, `POPUP_Z_MIN`:1492, `POPUP_Z_MAX`:1492, `MSG_WRAP_W`:1524, `MSG_WRAP_SCREEN`:1525, `MSG_MAX_LINES`:1526, `MSG_EDGE_PX`:1527, `DMG_CRIT_COLOR`:1582, `MAGIC_BOLT_FRAME_MS`:1688, `HOT_SPECIAL_ARROW`:1784, `SWORD_FEEL_AUTHORED_DIR`:1802, `JET_STREAM_ENABLED`:2003, `JET_LINGER_MS`:2004, `JET_ALPHA`:2008, `JET_MAX`:2012, `FX_BURST_MS`:2068, `SLIME_WAVE_MS`:2142, `ARROW_BLAST_MS`:2143, `ARROW_BLAST_D`:2144, `SNOWBALL_BURST_MS`:2162, `SNAP_G`:2292, `SNAP_REST_MS`:2293, `SNAP_FADE_MS`:2294, `SNAP_MAX`:2295, `PROP_SLASHES_PER_PROP`:2297, `PROP_ARROWS_PER_PROP`:2300, `PROP_SCORCHES_PER_PROP`:2301, `PROP_MARKS_MAX`:2302, `SCORCH_GLOW_MS`:2303, `ORE_SPLIT_MS`:2626, `ORE_POP_LATE_MS`:2639, `DMG_BMP_FONT`:2702, `DMG_BMP_BAKE_PX`:2724, `DMG_WORD_FONT`:2753, `DMG_WORD_BAKE_PX`:2754, `DMG_WORD_PAGE_PX`:2755, `NPC_BUBBLE_REACH`:2988, `EMOTE_POP_FONT`:2999, `REMOTE_BAKE_CACHE_MAX`:3105, `BEAM_RISE_S`:3227, `BEAM_A`:3230, `BEAM_HALO_A`:3233, `BEAM_FLICKER`:3234, `BEAM_PULSE_HZ`:3235, `BEAM_MOTES`:3236, `MOTE_TEX`:3238, `LOOT_BEAMS_MAX`:3249, `PEER_FIRES`:3255, `LAND_S`:3324, `POP_JUMP`:3336, `POP_DELAY_S`:3337, `POP_ARC_S`:3338, `POP_BOUNCE_S`:3339, `SMITH_FLAME_H0`:3484, `WHIRL_CATCH_MAX`:3502

## 4. Apart: not counted, they stay

A table the code writes into, or hands on (aliased, an argument, an
element of a literal, returned: it may be written where it goes), and a
literal wrapped in `Object.freeze` (a call).

| name | file | line | why | suites that read it |
|---|---|---|---|---|
| `_propsDrawn` | entityRenderer.js | 444 | written: assigned (line 17011) | - |
| `_fgDrawn` | entityRenderer.js | 450 | written: assigned (line 17110) | - |
| `_traitCache` | entityRenderer.js | 959 | written: assigned (line 987) | - |
| `_bakeWorkerStats` | entityRenderer.js | 2899 | written: counted (line 2991) | - |
| `_bakeQueue` | entityRenderer.js | 2983 | written: .push() (line 3003) | - |
| `_localBakeStats` | entityRenderer.js | 3373 | written: counted (line 3079) | - |
| `_localMisses` | entityRenderer.js | 3402 | written: .shift() (line 3432) | - |
| `_peerBakeStats` | entityRenderer.js | 3454 | written: counted (line 3478) | - |
| `_peerQueue` | entityRenderer.js | 3456 | written: .splice() (line 3529) | - |
| `prewarmProgress` | entityRenderer.js | 3674 | written: assigned (line 3749) | - |
| `_hairMaskCache` | entityRenderer.js | 4672 | written: assigned (line 4677) | loader-retries |
| `_standInHairClip` | entityRenderer.js | 5098 | written: assigned (line 5142) | - |
| `_traitTex` | entityRenderer.js | 5473 | written: assigned (line 5497) | - |
| `_mannequinTex` | entityRenderer.js | 5480 | written: assigned (line 5506) | - |
| `_fxPreload` | effectsRenderer.js | 25 | written: .push() (line 69) | loader-retries |
| `_combatTrimStats` | effectsRenderer.js | 73 | written: assigned (line 15224) | loader-retries |
| `_standInTrimStats` | effectsRenderer.js | 94 | written: assigned (line 165) | - |
| `POPUP_ICONS` | effectsRenderer.js | 1584 | written: assigned (line 1657) | - |
| `SHARD_ICONS` | effectsRenderer.js | 1672 | written: assigned (line 1674) | - |
| `MAGIC_BOLT_FRAMES` | effectsRenderer.js | 1686 | written: .push() (line 1698) | - |
| `ARROW_PINE` | effectsRenderer.js | 1858 | written: assigned (line 1900) | - |
| `JET_STREAM` | effectsRenderer.js | 1980 | written: assigned (line 1982) | - |
| `ARROW_BLAST` | effectsRenderer.js | 2140 | written: .push() (line 2153) | - |
| `SNOWBALL_BURST` | effectsRenderer.js | 2161 | written: .push() (line 2177) | - |
| `NODE_SPRITE_TEX` | effectsRenderer.js | 2475 | written: assigned (line 2570) | - |
| `TREE_TEX` | effectsRenderer.js | 2487 | written: assigned (line 2488) | - |
| `ORE_TEX` | effectsRenderer.js | 2497 | written: assigned (line 2499) | pixel-readers |
| `ORE_ICON_TIER_TEX` | effectsRenderer.js | 2598 | written: assigned (line 2601) | - |
| `SMITH_ANVIL` | effectsRenderer.js | 3470 | written: assigned (line 3472) | - |
| `_staffTipOut` | entityRenderer.js | 156 | handed on: an argument (line 12781) | - |
| `_hudBarTex` | entityRenderer.js | 205 | handed on: in a literal (line 240) | renderer-life |
| `NODE_HPBAR_PARTS` | entityRenderer.js | 735 | handed on: aliased (line 776) | - |
| `JOG_EW_HAIR_TUNE` | entityRenderer.js | 1422 | handed on: returned (line 1424) | - |
| `_BASE_DIRS` | entityRenderer.js | 3687 | handed on: an argument (line 3300) | - |
| `PLAYER_HP_NUM_STYLE` | entityRenderer.js | 5603 | handed on: in a literal (line 792) | - |
| `HP_RING_MAX_STYLE` | entityRenderer.js | 5633 | handed on: in a literal (line 8347) | - |
| `MONSTER_HP_NUM_STYLE` | entityRenderer.js | 5641 | handed on: in a literal (line 6097) | - |
| `_STAND_SOUTH` | entityRenderer.js | 6335 | handed on: an argument (line 6337) | - |
| `PLATE_BAND` | entityRenderer.js | 6626 | handed on: in a literal (line 7450) | - |
| `_emoteIds` | effectsRenderer.js | 63 | handed on: aliased (line 10107) | - |
| `_emoteSrcs` | effectsRenderer.js | 63 | handed on: aliased (line 10107) | - |
| `_emoteEms` | effectsRenderer.js | 63 | handed on: aliased (line 10107) | - |
| `FIRE_SKIN_OPTS` | effectsRenderer.js | 854 | handed on: an argument (line 6040) | - |
| `ARROW_SPECIAL` | effectsRenderer.js | 1765 | handed on: in a literal (line 2015) | - |
| `MAGIC_SPECIAL` | effectsRenderer.js | 1785 | handed on: in a literal (line 2016) | - |
| `SWORD_SLASH` | effectsRenderer.js | 1794 | handed on: in a literal (line 2017) | - |
| `EFFECT_BURSTS` | effectsRenderer.js | 2051 | handed on: an argument (line 2063) | - |
| `GESTURE_TOOLS` | effectsRenderer.js | 2378 | handed on: an argument (line 2421) | mirror-audit |
| `NODE_SPRITE_SOURCES` | effectsRenderer.js | 2472 | handed on: an argument (line 2569) | - |
| `DMG_ALL_CHARS` | effectsRenderer.js | 2769 | handed on: an argument (line 2796) | - |
| `DMG_DIGIT_CHARS` | effectsRenderer.js | 2770 | handed on: an argument (line 2797) | - |
| `_NO_HOP` | effectsRenderer.js | 3374 | handed on: returned (line 3345) | - |
| `_AT_MIDDLE` | effectsRenderer.js | 3452 | handed on: aliased (line 10652) | loot-clock |
| `_PEER_WORN_SLOTS` | entityRenderer.js | 3508 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 6197 | frozen | - |
| `CAPTURE_SHEET` | entityRenderer.js | 6201 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 1041 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 3508 | frozen | - |
