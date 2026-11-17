# Card M: the renderers' tables, counted (v2.3.5344)

Made by `node tools/guards/render-tables.test.mjs --write` from
`tools/guards/lib/renderTables.mjs`, the one reader of the two renderers'
top level (its header pins the rules). Never edited by hand: the guard
fails a page that is not the scan's (line numbers aside). The tables line
(`TABLES_LINE`) only falls; the gatekeeper lowers it.

## The count

| | entityRenderer.js | effectsRenderer.js |
|---|---|---|
| tables (counted) | 30 | 24 |
| written into (apart) | 14 | 15 |
| handed on (apart) | 10 | 14 |
| frozen (a call: apart) | 3 | 2 |
| lone constants | 127 | 115 |
| ...tuned (leave with the tables) | 47 | 32 |

Suites that name a counted table or a tuned constant by its text: 9 (`drop-lines`, `dungeon-clear`, `keep-as-image`, `loader-retries`, `loot-clock`, `picture-door`, `storm-eye`, `townsfolk-walk`, `water-frog`). They move with the two table PRs (the owner's review, 2026-11-17).

## The systems, and their order (largest first)

A counted table's system is read by hand from what it draws
(`TABLE_SYSTEM` in the lib). The tables leave in two PRs, one a renderer
(tag 5345 entityRenderer.js, 5346 effectsRenderer.js); in each, the
systems go in this order, a system's tables together.

| renderer | system | tables | their lines |
|---|---|---|---|
| entityRenderer.js | look | 17 | 216 |
| entityRenderer.js | combat | 7 | 25 |
| entityRenderer.js | ui | 3 | 3 |
| entityRenderer.js | townsfolk | 1 | 2 |
| entityRenderer.js | preload | 1 | 1 |
| entityRenderer.js | render | 1 | 1 |
| effectsRenderer.js | skills | 14 | 33 |
| effectsRenderer.js | economy | 5 | 12 |
| effectsRenderer.js | combat | 4 | 4 |
| effectsRenderer.js | look | 1 | 1 |

## 1. The tables (counted)

| name | file | line | lines | system | names tables | suites that read it |
|---|---|---|---|---|---|---|
| `GRIP_NUDGE_X` | entityRenderer.js | 339 | 1 | combat | - | - |
| `NPC_DIRS_8` | entityRenderer.js | 666 | 2 | townsfolk | - | townsfolk-walk |
| `TRAIT_RETRY_LATER_MS` | entityRenderer.js | 1064 | 1 | look | - | keep-as-image, loader-retries, picture-door |
| `_TRAIT_RETRY_MS` | entityRenderer.js | 1158 | 1 | look | - | - |
| `MIRROR_SCREEN_DIR` | entityRenderer.js | 1405 | 1 | look | - | - |
| `JOG_FOOT_FRAMES` | entityRenderer.js | 1412 | 9 | look | - | - |
| `BODY_DIR_SCALE` | entityRenderer.js | 1463 | 132 | look | - | - |
| `BODY_ROWS` | entityRenderer.js | 1629 | 16 | look | - | - |
| `JOG_EW_HAT_TUNE` | entityRenderer.js | 1693 | 28 | look | - | - |
| `STAND_HAT_TUNE` | entityRenderer.js | 1725 | 4 | look | - | - |
| `FULLSET_CROWN` | entityRenderer.js | 1828 | 9 | look | - | - |
| `FULLSET_HEAD_RES` | entityRenderer.js | 1847 | 3 | look | - | - |
| `FULLSET_HEAD_SEAT` | entityRenderer.js | 1867 | 3 | look | - | - |
| `_GEAR_SLOTS` | entityRenderer.js | 2188 | 1 | look | - | - |
| `_CAPE_HIDDEN_POSES` | entityRenderer.js | 2487 | 1 | look | - | - |
| `_CAPE_JOG_TILT` | entityRenderer.js | 2525 | 1 | look | - | - |
| `_CAPE_JOG_DX` | entityRenderer.js | 2563 | 1 | look | - | - |
| `PREWARM_POSES` | entityRenderer.js | 4232 | 1 | preload | - | - |
| `_REGION_SPR` | entityRenderer.js | 4791 | 1 | look | - | - |
| `SECTORS` | entityRenderer.js | 6215 | 1 | render | - | - |
| `GRIP_HOLE_FACINGS` | entityRenderer.js | 6320 | 1 | combat | - | - |
| `GRIP_HOLE_R_BY_FACING` | entityRenderer.js | 6330 | 1 | combat | - | - |
| `REST_ANG` | entityRenderer.js | 6373 | 6 | combat | - | - |
| `NECK_ROWS` | entityRenderer.js | 6888 | 4 | look | - | - |
| `BLOCK_ARM_SHOULDER` | entityRenderer.js | 8126 | 8 | combat | - | - |
| `SOUTH_BLOCK_OFFHAND` | entityRenderer.js | 8249 | 1 | combat | - | - |
| `SOUTH_BLOCK_OFFHAND_BY_TYPE` | entityRenderer.js | 8257 | 7 | combat | - | - |
| `RES_FILL` | entityRenderer.js | 9562 | 1 | ui | - | - |
| `RES_GHOST` | entityRenderer.js | 9563 | 1 | ui | - | - |
| `RES_GHOST_HEX` | entityRenderer.js | 9564 | 1 | ui | - | - |
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

| name | file | line | suites that read it |
|---|---|---|---|
| `PET_DRAW_K` | entityRenderer.js | 151 | - |
| `THREAT_SKULL_PX` | entityRenderer.js | 197 | - |
| `NPC_TALK_PX` | entityRenderer.js | 198 | - |
| `HPBAR_ASPECT` | entityRenderer.js | 247 | - |
| `HPBAR_IN_X` | entityRenderer.js | 248 | - |
| `HPBAR_IN_W` | entityRenderer.js | 248 | - |
| `HPBAR_IN_Y` | entityRenderer.js | 248 | - |
| `HPBAR_IN_H` | entityRenderer.js | 248 | - |
| `PEER_HPBAR_Y` | entityRenderer.js | 253 | - |
| `MONSTER_HPBAR_W` | entityRenderer.js | 268 | - |
| `PLAYER_HPBAR_W` | entityRenderer.js | 277 | - |
| `PLAYER_SIZE_MULT` | entityRenderer.js | 318 | - |
| `SOUTH_IDLE_TILT` | entityRenderer.js | 332 | - |
| `MONSTER_SIZE_MULT` | entityRenderer.js | 380 | dungeon-clear, storm-eye, water-frog |
| `NPC_SPRITE_SCALE` | entityRenderer.js | 403 | - |
| `NPC_FRAME_FEET_Y` | entityRenderer.js | 646 | - |
| `NPC_FRAME_TOP_Y` | entityRenderer.js | 647 | - |
| `NPC_PLATE_DROP_FRAC` | entityRenderer.js | 652 | - |
| `NPC_WALK_PX_PER_FRAME` | entityRenderer.js | 688 | - |
| `QUEST_BADGE_R` | entityRenderer.js | 737 | - |
| `MINE_TRAIT_MUL` | entityRenderer.js | 1654 | - |
| `FISH_TRAIT_MUL` | entityRenderer.js | 1655 | - |
| `_CAPE_PIVOT_Y` | entityRenderer.js | 2536 | - |
| `_CAPE_HOOD_TILT_K` | entityRenderer.js | 2582 | - |
| `_CAPE_HOOD_DX_K` | entityRenderer.js | 2583 | - |
| `BODY_NECK_FRAC` | entityRenderer.js | 2962 | - |
| `BODY_WAIST_FRAC` | entityRenderer.js | 2963 | - |
| `PLAYER_HEART_SIZE` | entityRenderer.js | 6161 | - |
| `MONSTER_HEART_SIZE` | entityRenderer.js | 6162 | - |
| `HP_RING_OUTER_R` | entityRenderer.js | 6180 | - |
| `HP_RING_GAP_PX` | entityRenderer.js | 6184 | - |
| `GRIP_HOLE_R` | entityRenderer.js | 6321 | - |
| `SWING_FULL_ARC` | entityRenderer.js | 6372 | - |
| `BODY_CELL_MID` | entityRenderer.js | 6801 | - |
| `LOCAL_BODY_SCALE` | entityRenderer.js | 6802 | - |
| `PLATE_BORDER_PX` | entityRenderer.js | 7234 | - |
| `PLATE_LEVEL_STROKE_PX` | entityRenderer.js | 7304 | - |
| `PLATE_H_RATIO` | entityRenderer.js | 7403 | - |
| `PLATE_PAD_L_RATIO` | entityRenderer.js | 7404 | - |
| `PLATE_GAP_RATIO` | entityRenderer.js | 7405 | - |
| `PLATE_PAD_R_RATIO` | entityRenderer.js | 7406 | - |
| `PLATE_BADGE_TYPE_RATIO` | entityRenderer.js | 7407 | - |
| `RES_BAR_W` | entityRenderer.js | 9495 | - |
| `RES_BAR_H` | entityRenderer.js | 9496 | - |
| `RES_MP_Y` | entityRenderer.js | 9504 | - |
| `RES_BLOCK_W` | entityRenderer.js | 9522 | - |
| `RES_SPENT_GAP` | entityRenderer.js | 9583 | - |
| `PRINT_W` | effectsRenderer.js | 327 | - |
| `STANDIN_REF_BODY_H` | effectsRenderer.js | 439 | - |
| `CHOP_STANDIN_H` | effectsRenderer.js | 487 | townsfolk-walk |
| `COOK_STANDIN_H` | effectsRenderer.js | 532 | townsfolk-walk |
| `COOK_PAN_DX` | effectsRenderer.js | 608 | - |
| `CHOP_OFFSET` | effectsRenderer.js | 635 | - |
| `FIRE_STANDIN_H` | effectsRenderer.js | 819 | - |
| `FIRE_FEET_ROW` | effectsRenderer.js | 834 | - |
| `DMG_LIFT` | effectsRenderer.js | 1424 | - |
| `JET_LEN_PX` | effectsRenderer.js | 1988 | - |
| `SNOWBALL_BURST_H` | effectsRenderer.js | 2163 | - |
| `PROP_SLASH_LEN` | effectsRenderer.js | 2296 | - |
| `HARD_DOT_R` | effectsRenderer.js | 2328 | - |
| `CAMPFIRE_HPBAR_GAP` | effectsRenderer.js | 2568 | - |
| `DMG_STROKE_PX` | effectsRenderer.js | 2666 | drop-lines |
| `DMG_WORD_PAD` | effectsRenderer.js | 2762 | - |
| `EMOTE_POP_PX` | effectsRenderer.js | 3000 | - |
| `LOOT_SCALE` | effectsRenderer.js | 3172 | loot-clock |
| `DROP_GROW` | effectsRenderer.js | 3199 | - |
| `BEAM_H_PX` | effectsRenderer.js | 3228 | - |
| `BEAM_W_PX` | effectsRenderer.js | 3229 | - |
| `BEAM_TEX_W` | effectsRenderer.js | 3231 | - |
| `BEAM_TEX_H` | effectsRenderer.js | 3231 | - |
| `BEAM_HALO_W` | effectsRenderer.js | 3232 | - |
| `MOTE_PX` | effectsRenderer.js | 3237 | - |
| `POP_H` | effectsRenderer.js | 3335 | - |
| `POP_BOUNCE_H` | effectsRenderer.js | 3340 | - |
| `PILE_R` | effectsRenderer.js | 3435 | - |
| `SMITH_ANVIL_W` | effectsRenderer.js | 3479 | - |
| `SMITH_ANVIL_X` | effectsRenderer.js | 3480 | - |
| `SMITH_ANVIL_FOOT` | effectsRenderer.js | 3481 | - |
| `SMITH_FACE_Y` | effectsRenderer.js | 3482 | - |

## 3. The other lone constants (stay)

- entityRenderer.js: `WARD_RING_MS`:152, `COLLISION_GLOW_RANGE_PX`:174, `SKULL_RED_TINT`:192, `HUD_BAR_VER`:203, `CHAT_BUBBLE_MS`:262, `PEER_HPBAR_HOLD_MS`:267, `NOTICE_MS`:276, `HPBAR_FLASH_MS`:289, `POPUP_BAR_CLEAR`:299, `CARRY_WOBBLE`:358, `SPAWN_FX_MS`:367, `BOSS_SEE_THROUGH`:391, `FOLK_FAR_MARGIN`:670, `TRAIT_NFT_ID`:995, `TRAIT_VER`:1002, `HEAD_WATCH_MS`:1253, `BODY_DATA_TIMEOUT_MS`:1337, `MASKED_CAP`:3120, `_BAKE_BUSY_MAX`:3522, `_BAKE_STUCK_MS`:3925, `_LOCAL_PATIENCE_MS`:3938, `FISH_TOP_CAP`:4905, `FISH_SKIN_DARK`:4932, `FISH_SKIN_LIGHT`:4932, `FISH_STEEL_LO`:4932, `FISH_STEEL_HI`:4932, `FISH_STEEL_INK`:4932, `FISH_RIM_MIN`:4933, `FISH_PINE_RG`:4934, `HAIR_MASK_ROUNDS`:5273, `SWORD_SWING_MS`:5640, `BOW_SHOT_MS`:5645, `BOW_RELEASE_MS`:5650, `HP_RING_BAND`:6181, `HP_RING_TRACK`:6185, `HP_RING_CENTER_FILL`:6186, `HP_TIER_GREEN`:6187, `HP_TIER_YELLOW`:6187, `HP_TIER_ORANGE`:6187, `HP_TIER_RED`:6187, `HP_RING_OUTLINE`:6188, `HP_GHOST_WHITE`:6189, `HP_GHOST_DRAIN`:6190, `HP_GHOST_DRAIN_M`:6191, `HP_GHOST_HOLD_MS`:6194, `SWING_ANIM_MS`:6371, `THROW_RELEASE_GRACE_MS`:6466, `_HIT_FLASH`:6507, `SELF_DEATH_HOLD_MS`:7018, `PLATE_INK`:7072, `PLATE_FILL_ALPHA`:7203, `PLATE_NAME_FILL`:7213, `PLATE_NAME_WEIGHT`:7220, `PLATE_BORDER_ALPHA`:7227, `PLATE_LEVEL_STROKE`:7303, `PLATE_ALARM_FILL`:7322, `PLATE_ALARM_FILL_ALPHA`:7348, `PLATE_ALARM_NAME_FILL`:7349, `PLATE_ALARM_NAME_WEIGHT`:7350, `PLATE_BOSS_FILL`:7360, `PLATE_BOSS_FILL_ALPHA`:7361, `PLATE_ALARM_LEVEL_FILL`:7370, `PLATE_ENGAGED_MS`:7411, `BRO_BADGE_URL`:7581, `PLATE_SCALE_MIN`:7769, `PLATE_SCALE_MAX`:7770, `CUE_ZOOM_MAX`:7781, `CARET_OUT`:8169, `CARET_BACK`:8170, `CARET_HALF`:8171, `SOUTH_BLOCK_OFFHAND_ENABLED`:8222, `SOUTH_BLOCK_OFFHAND_AIM`:8271, `RES_BORDER`:9497, `RES_BAR_MAX_W`:9547, `RES_HOLD_MS`:9553, `RES_FADE_MS`:9554, `RES_SLIDE_MS`:9555, `RES_TRACK`:9560, `RES_BORDER_COL`:9561, `RES_SPENT_TRAVEL`:9584
- effectsRenderer.js: `BLOCK_POSE_FRAME`:68, `PEER_CHOP_IDLE_MS`:235, `GPU_WAIT_MS`:236, `COOK_FW`:283, `COOK_FH`:283, `PEER_INK_CAP`:286, `PEER_INK_IDLE_MS`:287, `PRINT_TTL_MS`:326, `PRINT_ALPHA`:331, `FARM_MIN_BLOB`:556, `PEER_CHOP_REACH`:656, `PEER_COOK_REACH`:657, `PEER_GATHER_NODE_TTL_MS`:658, `PEER_SEAT_MATCH_PX`:663, `CHOP_GEAR_FW`:699, `DRESSED_MAX`:732, `FIRE_FW`:806, `FIRE_FH`:806, `FIRE_FRAME_MS`:841, `FIRE_LOG_LIT_REACH`:920, `PEER_FIG_BUDGET`:1036, `PEER_FIG_IDLE_MS`:1044, `PEER_FIG_LOAD_MS`:1052, `PEER_FIG_RETRY_MS`:1053, `PEER_GREAVES_WAIT_MS`:1054, `GEAR_STRIP_TIMEOUT_MS`:1055, `DMG_FONT_PX`:1383, `DMG_CRIT_FONT_PX`:1384, `POPUP_ZOOM`:1491, `POPUP_Z_MIN`:1492, `POPUP_Z_MAX`:1492, `MSG_WRAP_W`:1524, `MSG_WRAP_SCREEN`:1525, `MSG_MAX_LINES`:1526, `MSG_EDGE_PX`:1527, `DMG_CRIT_COLOR`:1582, `MAGIC_BOLT_FRAME_MS`:1688, `HOT_SPECIAL_ARROW`:1784, `SWORD_FEEL_AUTHORED_DIR`:1802, `JET_STREAM_ENABLED`:2003, `JET_LINGER_MS`:2004, `JET_ALPHA`:2008, `JET_MAX`:2012, `FX_BURST_MS`:2068, `SLIME_WAVE_MS`:2142, `ARROW_BLAST_MS`:2143, `ARROW_BLAST_D`:2144, `SNOWBALL_BURST_MS`:2162, `SNAP_G`:2292, `SNAP_REST_MS`:2293, `SNAP_FADE_MS`:2294, `SNAP_MAX`:2295, `PROP_SLASHES_PER_PROP`:2297, `PROP_ARROWS_PER_PROP`:2300, `PROP_SCORCHES_PER_PROP`:2301, `PROP_MARKS_MAX`:2302, `SCORCH_GLOW_MS`:2303, `ORE_SPLIT_MS`:2626, `ORE_POP_LATE_MS`:2639, `DMG_BMP_FONT`:2702, `DMG_BMP_BAKE_PX`:2724, `DMG_WORD_FONT`:2753, `DMG_WORD_BAKE_PX`:2754, `DMG_WORD_PAGE_PX`:2755, `NPC_BUBBLE_REACH`:2988, `EMOTE_POP_FONT`:2999, `REMOTE_BAKE_CACHE_MAX`:3105, `BEAM_RISE_S`:3227, `BEAM_A`:3230, `BEAM_HALO_A`:3233, `BEAM_FLICKER`:3234, `BEAM_PULSE_HZ`:3235, `BEAM_MOTES`:3236, `MOTE_TEX`:3238, `LOOT_BEAMS_MAX`:3249, `PEER_FIRES`:3255, `LAND_S`:3324, `POP_JUMP`:3336, `POP_DELAY_S`:3337, `POP_ARC_S`:3338, `POP_BOUNCE_S`:3339, `SMITH_FLAME_H0`:3484, `WHIRL_CATCH_MAX`:3502

## 4. Apart: not counted, they stay

A table the code writes into, or hands on (aliased, an argument, an
element of a literal, returned: it may be written where it goes), and a
literal wrapped in `Object.freeze` (a call).

| name | file | line | why | suites that read it |
|---|---|---|---|---|
| `_propsDrawn` | entityRenderer.js | 503 | written: assigned (line 17747) | - |
| `_fgDrawn` | entityRenderer.js | 509 | written: assigned (line 17846) | - |
| `_traitCache` | entityRenderer.js | 1051 | written: assigned (line 1080) | - |
| `_bakeWorkerStats` | entityRenderer.js | 3434 | written: counted (line 3526) | - |
| `_bakeQueue` | entityRenderer.js | 3518 | written: .push() (line 3538) | - |
| `_localBakeStats` | entityRenderer.js | 3908 | written: counted (line 3614) | - |
| `_localMisses` | entityRenderer.js | 3937 | written: .shift() (line 3967) | - |
| `_peerBakeStats` | entityRenderer.js | 3989 | written: counted (line 4013) | - |
| `_peerQueue` | entityRenderer.js | 3991 | written: .splice() (line 4064) | - |
| `prewarmProgress` | entityRenderer.js | 4209 | written: assigned (line 4306) | - |
| `_hairMaskCache` | entityRenderer.js | 5230 | written: assigned (line 5235) | loader-retries |
| `_standInHairClip` | entityRenderer.js | 5656 | written: assigned (line 5700) | - |
| `_traitTex` | entityRenderer.js | 6031 | written: assigned (line 6055) | - |
| `_mannequinTex` | entityRenderer.js | 6038 | written: assigned (line 6064) | - |
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
| `_staffTipOut` | entityRenderer.js | 157 | handed on: an argument (line 13517) | - |
| `_hudBarTex` | entityRenderer.js | 204 | handed on: in a literal (line 239) | renderer-life |
| `NODE_HPBAR_PARTS` | entityRenderer.js | 827 | handed on: aliased (line 868) | - |
| `JOG_EW_HAIR_TUNE` | entityRenderer.js | 1813 | handed on: returned (line 1815) | - |
| `_BASE_DIRS` | entityRenderer.js | 4244 | handed on: an argument (line 3835) | - |
| `PLAYER_HP_NUM_STYLE` | entityRenderer.js | 6163 | handed on: in a literal (line 884) | - |
| `HP_RING_MAX_STYLE` | entityRenderer.js | 6195 | handed on: in a literal (line 9069) | - |
| `MONSTER_HP_NUM_STYLE` | entityRenderer.js | 6203 | handed on: in a literal (line 6687) | - |
| `_STAND_SOUTH` | entityRenderer.js | 6948 | handed on: an argument (line 6950) | - |
| `PLATE_BAND` | entityRenderer.js | 7246 | handed on: in a literal (line 8108) | - |
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
| `_PEER_WORN_SLOTS` | entityRenderer.js | 4043 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 6806 | frozen | - |
| `CAPTURE_SHEET` | entityRenderer.js | 6810 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 1041 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 3508 | frozen | - |
