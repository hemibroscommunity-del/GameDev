# Client State Schema — the `S` object

Written 2026-06-12 at **v2.3.765**, derived from source. Line numbers are
anchors as of that version; the field names and writer functions are the
durable references. Trust the code where they disagree.

## What `S` is

The entire game-world state on the client lives in **one mutable object**:

- Created as `stateRef = useRef({...})` in `src/ui/BroTown.jsx` (~line 201).
- Exposed globally as `window._gameState = stateRef` (~310) — the game loop,
  the extracted helper modules, the QA smoke test (`tools/qa-smoke.mjs`), and
  debug overlays all read it as `window._gameState.current`.
- Convention everywhere in the codebase: `var S = stateRef.current;`
- **Mutated directly, not via React.** React state (the ~hundreds of
  `useState` hooks in BroTown) is a *periodic mirror* of selected fields for
  UI rendering; `S` is the source of truth between server pushes.
- Selected functions are exposed as `window._gameFns` (~311) for autotest.

> `src/game/createInitialState.js` is a **stale duplicate** of the initializer
> from an abandoned extraction — do not trust or extend it (REBUILD-PLAN
> Phase 1 deletes it).

## Static baseline (the `useRef` initializer, ~201–308)

| Field | Type / shape | Notes |
|---|---|---|
| `player` | `{x, y, vx, vy, dir}` | local player position; `dir` ∈ up/down/left/right |
| `others` | `{[playerId]: entry}` | remote players — see "Remote player entry" below |
| `camera` | `{x, y}` | world-space camera |
| `keys`, `stickX`, `stickY` | input state | keyboard map + virtual joystick axes |
| `map` | tile array \| null | current zone map |
| `currentZone` | string | zone id, starts `'town'` |
| `chatLog` | array | chat history |
| `chatBubbles` | `{[playerId]: {text, ts}}` | overhead bubbles |
| `myId` | string | random 8-char session id (replaced by persistent identity on login) |
| `myName`, `myColor`, `myAvatar`, `myBroData` | identity | `myBroData` = `{ID, diScore, rank, tier}` |
| `channel` | channelShim \| null | the WS send shim (see WIRE-PROTOCOL.md); null in single-player / pre-connect |
| `rpg` | object \| null | **the RPG character** — created by `createDefaultRpg()` (`src/data/gameSystems.js` ~4928), persisted to localStorage `bt_rpg`; stats, inventory, lifeSkills, equipment stashes, `_buildProg`/`_buildUse` (see `src/game/combatHelpers.js`) |
| `monsters` | `{[zone]: Monster[]}` \| null | local monster instances via `createMonster()` (gameSystems.js), overlaid by server data (see below) |
| `dmgNumbers` | `[{x, y, text, color, ts}]` | floating damage/notice numbers |
| `groundLoot` | `[{x, y, coins, xp, skull, skullEmoji, ts}]` | ground drops |
| `hitParticles`, `groundSplatter`, `deathExplosions`, `screenShake` | VFX state | |
| `arrows`, `trail`, `swingTimer`, `swingAngle`, `isSwinging`, `lockedTarget` | combat visuals/state | `lockedTarget` = `{type:'monster'\|'player', id, ref}` |
| `npcs`, `collectibles`, `collectedIds`, `score`, `destroyedTrees`, `fishTimer` | world interaction state | |
| `lastDamageTaken`, `respawnTimer`, `shieldActive`, `shieldEnd` | survival timers | |
| `stats`, `badges` | persistence | session stats + achievement ids |
| `_deathDrops` | `[{zone, x, y, items, ts, expiry}]` | GDD §5.5 scattered inventory |
| `_snowballs`, `_snowmen`, `_sled`, `_torch`, `_raft` | zone-mechanic state | per-zone minigame mechanics |
| `_dodgeRoll`, `_aimAngle`, `_aimActive` | ability state | |

## Remote player entry (`S.others[pid]`)

Built by the `player_join` / `state_sync` handlers and updated per `tick`
(see WIRE-PROTOCOL.md). Key fields: `x`, `y`, `_serverX`, `_serverY` (server
truth for interpolation), `dir`, `_renderFacing`, `zone`, `_vx`/`_vy`
(velocity ÷100 from wire), `_lastUpdate`, `name`, `color`, appearance fields
(headwear/hair/skin/shirt + colors), `equip` `{head, chest, legs, shoulders,
shirt}` (rebuilt live from broadcast `eqc`/`eql`/`eqs`/`eqst` fields,
v2.3.599), `_isDead` (corpse rendering, cleared by `player_respawned`).

## Monster shape

Local spawn: `createMonster()` in `src/data/gameSystems.js`, with zone-variant
overlay via `applyZoneVariant()` (`src/data/monsterVariants.js`). Server
overlay: the `state_sync` / `zone_monsters` / `zone_state` / `tick` handlers
map server entities onto local instances — notable fields: `id`, `arch`
(archetype), `hp`/`curHp`, `x`/`y` + `renderX`/`renderY` (interpolation),
`spawnX`/`spawnY`, `statuses`, `_atkCd`, variant fields from
`MONSTER_VARIANTS`.

## Runtime-grown `_`-prefixed fields

`S` accumulates ~129 underscore-prefixed fields at runtime (writers are
`S._foo = ...` assignments; enumerate with `grep -on "S\._[A-Za-z]\+ =" src/ui/BroTown.jsx`).
The important clusters:

| Cluster | Fields | Written by |
|---|---|---|
| Server mirrors | `_serverMonsters`, `_serverGatherNodes`, `_serverLoot`, `_realtimeStatus`, `_currentRoom`, `_serverLoadStarted` | WS handlers |
| Peer damage smoothing | `_peerDmgQueue`, `_peerDmgLastRel`, `_peerDmgZone` | `src/game/combatHelpers.js` (`enqueuePeerDamage`/`releasePeerDamage`) |
| Lifesteal | `_dmgFromMonster` | `trackMonsterDamage`/`applyMeleeLifesteal` (combatHelpers.js) + WS handlers |
| Shield / block | `_shieldUp`, `_shieldAngle`, `_shieldCdUntil`, `_shieldAutoReleased`, `_blockFlash` | block ring + game loop |
| PvP / social | `_activeDuel`, `_pvpThreat`, `_pvpSkullType`, `_pvpSkullUntil`, `_warTarget`, `_activeClanWar`, `_clanData`, `_remoteBets`, `_arenaMatch`, `_remoteProjectiles`, `_stunEnd` | `_processGameEvent` cases |
| Dungeons | `_inDungeon`, `_dungeonZone`, `_dungeonWave`, `_dungeonDepth`, `_dungeonBossSpawned`, `_customDungeonConfig`, `_preDungeonPos`, … | dungeon flow in game loop |
| Movement/render feel | `_facing`, `_facingAngle`, `_targetFacingAngle`, `_hitStop`, `_killSlowmo`, `_camPunch`, `_hitFlash`, `_deathFlash`, `_frameCount`, … | game loop |
| Zone mechanics | `_swimming`, `_diveAir`, `_tideLevel`, `_fenceClimb`, `_iceAttack`, `_snowballCd`, `_currentDepth`, `_tiledWalkable`, … | zone-specific loop blocks |

Rule of thumb: `_`-prefixed = runtime/transient, not part of the persisted
save; persistence lives in `S.rpg` (localStorage `bt_rpg`) and the server's
Durable Object storage.

## Global mirrors and escape hatches

These are load-bearing — extracted modules must not assume they exist at
module-evaluation time (they're assigned when BroTown.jsx evaluates / renders):

- `Object.assign(globalThis, DATA)` (~131) — every export of `src/data/index.js`
  becomes a global. Much legacy code resolves symbols this way.
- Babel runtime helpers on `globalThis` (~137: `_objectSpread`,
  `_slicedToArray`, …) — any extracted code using these must import or inline
  them instead.
- `window._gameState` (~310), `window._gameFns` (~311),
  `window._setLevelUpMsg` (assigned inside the component each render).
- `globalThis.TOWN_W/TOWN_H/COLS/ROWS` are **rewritten on every zone change**
  via `updateZoneDimensions` — never cache them across zones.

## localStorage inventory

`bt_rpg` (RPG character), `bt_player`, `bt_passphrase`, `bt_device` (identity),
`bt_room`, `bt_room_code` (room override), `bt_blocked`, `bt_muted`,
`bt_friends`, `bt_clan` (social), `bt_stats`, `bt_bestiary`, `bt_codex`,
`bt_materials`, `bt_zones`, `bt_tutorial`, `bt_lastBuilding` (progress/UX),
`bt-gear-v2-*` (gear stash, `src/rendering/gearCatalog.js`), `bt-crashlog`
(crash capture read by `tools/qa-smoke.mjs`).
