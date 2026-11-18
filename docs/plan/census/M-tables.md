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
| frozen (a call: apart) | 3 | 2 |
| lone constants | 80 | 83 |
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

- entityRenderer.js: `WARD_RING_MS`:152, `COLLISION_GLOW_RANGE_PX`:182, `SKULL_RED_TINT`:200, `HUD_BAR_VER`:205, `CHAT_BUBBLE_MS`:254, `PEER_HPBAR_HOLD_MS`:259, `NOTICE_MS`:267, `HPBAR_FLASH_MS`:279, `POPUP_BAR_CLEAR`:289, `CARRY_WOBBLE`:315, `SPAWN_FX_MS`:324, `BOSS_SEE_THROUGH`:345, `FOLK_FAR_MARGIN`:590, `TRAIT_NFT_ID`:904, `TRAIT_VER`:911, `HEAD_WATCH_MS`:1143, `BODY_DATA_TIMEOUT_MS`:1227, `MASKED_CAP`:2586, `_BAKE_BUSY_MAX`:2988, `_BAKE_STUCK_MS`:3391, `_LOCAL_PATIENCE_MS`:3404, `FISH_TOP_CAP`:4348, `FISH_SKIN_DARK`:4375, `FISH_SKIN_LIGHT`:4375, `FISH_STEEL_LO`:4375, `FISH_STEEL_HI`:4375, `FISH_STEEL_INK`:4375, `FISH_RIM_MIN`:4376, `FISH_PINE_RG`:4377, `HAIR_MASK_ROUNDS`:4716, `SWORD_SWING_MS`:5083, `BOW_SHOT_MS`:5088, `BOW_RELEASE_MS`:5093, `HP_RING_BAND`:5621, `HP_RING_TRACK`:5624, `HP_RING_CENTER_FILL`:5625, `HP_TIER_GREEN`:5626, `HP_TIER_YELLOW`:5626, `HP_TIER_ORANGE`:5626, `HP_TIER_RED`:5626, `HP_RING_OUTLINE`:5627, `HP_GHOST_WHITE`:5628, `HP_GHOST_DRAIN`:5629, `HP_GHOST_DRAIN_M`:5630, `HP_GHOST_HOLD_MS`:5633, `SWING_ANIM_MS`:5789, `THROW_RELEASE_GRACE_MS`:5877, `_HIT_FLASH`:5918, `SELF_DEATH_HOLD_MS`:6406, `PLATE_INK`:6460, `PLATE_FILL_ALPHA`:6591, `PLATE_NAME_FILL`:6601, `PLATE_NAME_WEIGHT`:6608, `PLATE_BORDER_ALPHA`:6615, `PLATE_LEVEL_STROKE`:6684, `PLATE_ALARM_FILL`:6702, `PLATE_ALARM_FILL_ALPHA`:6728, `PLATE_ALARM_NAME_FILL`:6729, `PLATE_ALARM_NAME_WEIGHT`:6730, `PLATE_BOSS_FILL`:6740, `PLATE_BOSS_FILL_ALPHA`:6741, `PLATE_ALARM_LEVEL_FILL`:6750, `PLATE_ENGAGED_MS`:6754, `BRO_BADGE_URL`:6924, `PLATE_SCALE_MIN`:7112, `PLATE_SCALE_MAX`:7113, `CUE_ZOOM_MAX`:7124, `CARET_OUT`:7489, `CARET_BACK`:7490, `CARET_HALF`:7491, `SOUTH_BLOCK_OFFHAND_ENABLED`:7542, `SOUTH_BLOCK_OFFHAND_AIM`:7550, `RES_BORDER`:8774, `RES_BAR_MAX_W`:8816, `RES_HOLD_MS`:8822, `RES_FADE_MS`:8823, `RES_SLIDE_MS`:8824, `RES_TRACK`:8829, `RES_BORDER_COL`:8830, `RES_SPENT_TRAVEL`:8849
- effectsRenderer.js: `BLOCK_POSE_FRAME`:69, `PEER_CHOP_IDLE_MS`:235, `GPU_WAIT_MS`:236, `COOK_FW`:283, `COOK_FH`:283, `PEER_INK_CAP`:286, `PEER_INK_IDLE_MS`:287, `PRINT_TTL_MS`:325, `PRINT_ALPHA`:326, `FARM_MIN_BLOB`:445, `PEER_CHOP_REACH`:523, `PEER_COOK_REACH`:524, `PEER_GATHER_NODE_TTL_MS`:525, `PEER_SEAT_MATCH_PX`:530, `CHOP_GEAR_FW`:565, `DRESSED_MAX`:598, `FIRE_FW`:678, `FIRE_FH`:678, `FIRE_FRAME_MS`:685, `FIRE_LOG_LIT_REACH`:745, `PEER_FIG_BUDGET`:861, `PEER_FIG_IDLE_MS`:869, `PEER_FIG_LOAD_MS`:877, `PEER_FIG_RETRY_MS`:878, `PEER_GREAVES_WAIT_MS`:879, `GEAR_STRIP_TIMEOUT_MS`:880, `DMG_FONT_PX`:1185, `DMG_CRIT_FONT_PX`:1186, `POPUP_ZOOM`:1286, `POPUP_Z_MIN`:1287, `POPUP_Z_MAX`:1287, `MSG_WRAP_W`:1310, `MSG_WRAP_SCREEN`:1311, `MSG_MAX_LINES`:1312, `MSG_EDGE_PX`:1313, `DMG_CRIT_COLOR`:1368, `MAGIC_BOLT_FRAME_MS`:1473, `HOT_SPECIAL_ARROW`:1569, `SWORD_FEEL_AUTHORED_DIR`:1587, `JET_STREAM_ENABLED`:1782, `JET_LINGER_MS`:1783, `JET_ALPHA`:1787, `JET_MAX`:1791, `FX_BURST_MS`:1847, `SLIME_WAVE_MS`:1921, `ARROW_BLAST_MS`:1922, `ARROW_BLAST_D`:1923, `SNOWBALL_BURST_MS`:1941, `SNAP_G`:2070, `SNAP_REST_MS`:2071, `SNAP_FADE_MS`:2072, `SNAP_MAX`:2073, `PROP_SLASHES_PER_PROP`:2074, `PROP_ARROWS_PER_PROP`:2077, `PROP_SCORCHES_PER_PROP`:2078, `PROP_MARKS_MAX`:2079, `SCORCH_GLOW_MS`:2080, `ORE_SPLIT_MS`:2366, `ORE_POP_LATE_MS`:2379, `DMG_BMP_FONT`:2441, `DMG_BMP_BAKE_PX`:2463, `DMG_WORD_FONT`:2492, `DMG_WORD_BAKE_PX`:2493, `DMG_WORD_PAGE_PX`:2494, `NPC_BUBBLE_REACH`:2723, `EMOTE_POP_FONT`:2734, `REMOTE_BAKE_CACHE_MAX`:2839, `BEAM_RISE_S`:2916, `BEAM_A`:2917, `BEAM_HALO_A`:2918, `BEAM_FLICKER`:2919, `BEAM_PULSE_HZ`:2920, `BEAM_MOTES`:2921, `MOTE_TEX`:2922, `LOOT_BEAMS_MAX`:2925, `PEER_FIRES`:2931, `LAND_S`:2997, `POP_JUMP`:3008, `POP_DELAY_S`:3009, `POP_ARC_S`:3010, `POP_BOUNCE_S`:3011, `SMITH_FLAME_H0`:3144, `WHIRL_CATCH_MAX`:3162

## 4. Apart: not counted, they stay

A table the code writes into, or hands on (aliased, an argument, an
element of a literal, returned: it may be written where it goes), and a
literal wrapped in `Object.freeze` (a call).

| name | file | line | why | suites that read it |
|---|---|---|---|---|
| `_propsDrawn` | entityRenderer.js | 445 | written: assigned (line 17012) | - |
| `_fgDrawn` | entityRenderer.js | 451 | written: assigned (line 17111) | - |
| `_traitCache` | entityRenderer.js | 960 | written: assigned (line 988) | - |
| `_bakeWorkerStats` | entityRenderer.js | 2900 | written: counted (line 2992) | - |
| `_bakeQueue` | entityRenderer.js | 2984 | written: .push() (line 3004) | - |
| `_localBakeStats` | entityRenderer.js | 3374 | written: counted (line 3080) | - |
| `_localMisses` | entityRenderer.js | 3403 | written: .shift() (line 3433) | - |
| `_peerBakeStats` | entityRenderer.js | 3455 | written: counted (line 3479) | - |
| `_peerQueue` | entityRenderer.js | 3457 | written: .splice() (line 3530) | - |
| `prewarmProgress` | entityRenderer.js | 3675 | written: assigned (line 3750) | - |
| `_hairMaskCache` | entityRenderer.js | 4673 | written: assigned (line 4678) | loader-retries |
| `_standInHairClip` | entityRenderer.js | 5099 | written: assigned (line 5143) | - |
| `_traitTex` | entityRenderer.js | 5474 | written: assigned (line 5498) | - |
| `_mannequinTex` | entityRenderer.js | 5481 | written: assigned (line 5507) | - |
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
| `_staffTipOut` | entityRenderer.js | 157 | handed on: an argument (line 12782) | - |
| `_hudBarTex` | entityRenderer.js | 206 | handed on: in a literal (line 241) | renderer-life |
| `NODE_HPBAR_PARTS` | entityRenderer.js | 736 | handed on: aliased (line 777) | - |
| `JOG_EW_HAIR_TUNE` | entityRenderer.js | 1423 | handed on: returned (line 1425) | - |
| `_BASE_DIRS` | entityRenderer.js | 3688 | handed on: an argument (line 3301) | - |
| `PLAYER_HP_NUM_STYLE` | entityRenderer.js | 5604 | handed on: in a literal (line 793) | - |
| `HP_RING_MAX_STYLE` | entityRenderer.js | 5634 | handed on: in a literal (line 8348) | - |
| `MONSTER_HP_NUM_STYLE` | entityRenderer.js | 5642 | handed on: in a literal (line 6098) | - |
| `_STAND_SOUTH` | entityRenderer.js | 6336 | handed on: an argument (line 6338) | - |
| `PLATE_BAND` | entityRenderer.js | 6627 | handed on: in a literal (line 7451) | - |
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
| `_PEER_WORN_SLOTS` | entityRenderer.js | 3509 | frozen | - |
| `CAPTURE_FACING` | entityRenderer.js | 6198 | frozen | - |
| `CAPTURE_SHEET` | entityRenderer.js | 6202 | frozen | - |
| `PEER_FIG_EST` | effectsRenderer.js | 866 | frozen | - |
| `GOO_HOLD` | effectsRenderer.js | 3168 | frozen | - |
