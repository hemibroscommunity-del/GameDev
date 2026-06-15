# Rebuild-in-Place Plan — BroTown.jsx strangler-fig decomposition

Written 2026-06-12 at **v2.3.765**. This is the working roadmap for rebuilding
the client's architecture *incrementally*, instead of a ground-up parallel
rewrite. The live game keeps shipping; each PR moves one system out of
`src/ui/BroTown.jsx`, behavior-frozen.

**Why not a parallel rebuild:** the server, rendering, and data layers are
already well-factored; the legacy debt is concentrated in one file. A parallel
rewrite would chase a moving target (the game ships near-daily), lose the
institutional memory encoded in 271+ `v2.x.y:` comment tags, and leave one
maintainer with two codebases. Decomposition gets the same end state — a
modular client — without ever having a broken game.

> **Doc trust note:** `docs/ARCHITECTURE.md` and parts of the GDD predate
> recent iterations and are stale (see the banner in ARCHITECTURE.md).
> **Code is the source of truth.** Everything below was re-derived from
> source at v2.3.765. Companion docs written at the same time:
> `docs/WIRE-PROTOCOL.md` (message inventory) and `docs/STATE-SCHEMA.md`
> (the `S` object).

## Current reality (v2.3.765)

`src/ui/BroTown.jsx` is ~33k lines. Layout (anchors will drift; the section
banners are the durable markers):

| Region | Approx. lines | Contents |
|---|---|---|
| Imports + globalThis assignments | 1–140 | incl. `Object.assign(globalThis, DATA)` and babel-helper globals — load-bearing for legacy code |
| Component start, `stateRef` initializer | 141–310 | the `S` object baseline (STATE-SCHEMA.md) |
| Hooks, identity, chat (`sendChat` ~1515), misc effects | 310–1845 | ~hundreds of useState/useEffect |
| **Live WebSocket client** (one giant `useEffect`) | ~1845–4464 | lobby resolution, `join` (protocolVersion 2), main switch ~2048–2829, `_processGameEvent` ~3033–4279, channelShim + input batching ~4302–4451 |
| **Live game loop** (banner: `═══ GAME LOOP ═══`) | ~4547–11400 | simulation + PixiJS/Canvas2D render orchestration |
| Desktop keyboard controls | ~11475–11637 | `onKeyDown` etc. |
| JSX: menus, panels, modals | ~11700–end | the UI |

**Already extracted (done — don't redo):** zone/map generation
(`generateZoneMap`, `spawnMonstersForZone` in `src/data/gameSystems.js`;
`spawnGatherNodes` in `src/data/lifeSkills.js`), monster variants
(`src/data/monsterVariants.js`), rendering (`src/rendering/`), mastery
(`src/game/mastery.js`), and as of this version the module-scope **combat
helpers** (`src/game/combatHelpers.js` — build progression, peer damage
smoothing, shield arc, lifesteal tracking).

**Dead duplicates from an earlier abandoned extraction (deleted in Phase 1,
v2.3.766 — list kept as the record of what was removed and why):**

- `src/game/gameLoop.js` (~5k lines) — imported by nothing live; the real
  loop is inline in BroTown.jsx.
- `src/game/createInitialState.js` — stale copy of the `stateRef` initializer.
- `src/game/index.js` barrel — re-exports the dead gameLoop; nothing imports it.
- `setupWebSocket` in `src/networking/wsClient.js` — pre-protocol-v2, never
  called. (Keep `getTickTimes`/`getTickSizes` — `fpsOverlay.js` imports them.)

These are exactly the failure mode this plan's working rules prevent: code
was *copied* out instead of *moved*, both copies kept evolving, the inline
copy won.

## Working rules — every decomposition PR

1. **Behavior-frozen.** Pure code movement. No logic edits, no renames, no
   drive-by cleanups, no "while I'm here".
2. **Move, never copy.** The moved code is deleted from BroTown.jsx and the
   import wired up **in the same PR**. A parallel copy is an automatic reject.
3. **Version comments move verbatim.** `v2.3.xxx:` tags and spec references
   are the project's institutional memory.
4. **One system per PR**, self-contained, explained in plain language,
   mergeable with one button.
5. **Gate:** `npm run build` green + `package.json` version bump + verify on
   the Cloudflare Pages **PR preview URL on iPhone Safari** (touch controls,
   not just desktop), with a feature-specific checklist in the PR description.
6. **Never touch `server/`** in a client decomposition PR (server deploys
   independently via the deploy workflow; keep concerns separate).
7. **No globals in extracted modules.** Extracted code evaluates *before*
   BroTown's `Object.assign(globalThis, ...)` runs — import every dependency
   explicitly (`@/data/index.js` etc.). This includes the babel helpers
   (`_objectSpread`, `_slicedToArray`, …): code that uses them must not rely
   on the globalThis copies.
8. **Style modernization** (var→const, transpiled patterns→modern JS) only as
   a separate commit within the PR — never mixed into the move diff, so the
   move stays reviewable as pure relocation.

## Phases (one PR each)

- **Phase 0 — ✅ done (v2.3.765, PR #31):** foundation docs (this file,
  WIRE-PROTOCOL.md, STATE-SCHEMA.md, ARCHITECTURE.md staleness banner) +
  first extraction: module-scope combat helpers → `src/game/combatHelpers.js`.
- **Phase 1 — ✅ done (v2.3.766):** removed `src/game/gameLoop.js`,
  `src/game/createInitialState.js`, `src/game/index.js`, and
  `setupWebSocket` from `src/networking/wsClient.js`. Rewrote
  ARCHITECTURE.md's stale rows. Zero behavior change; bundle unaffected
  (these were already tree-shaken out) — hygiene + foot-gun removal.
  Note: the NET overlay's tick buffers were only ever fed by the deleted
  `setupWebSocket`, so they were already empty in production; wiring the
  live inline `tick` handler into them is a Phase 5 follow-up.
- **Phase 2 — ✅ done (v2.3.767):** chat → `src/game/chat.js`
  (`sendChatMessage`, `handleChatEvent`, `handleEmoteEvent`), functions
  taking `(S, deps)` with the React setters in deps. BroTown keeps a thin
  `sendChat` wrapper owning the input-widget state (chatInput, refocus).
- **Phase 3 — ✅ done (v2.3.782):** quest accept/turn-in transition logic →
  `src/game/quests.js` (`acceptQuest`, `turnInQuest`): `_quests` state
  machine, server `quest_accept`/`quest_turn_in` sends, rewards/chain
  unlock, persistence. Quest *data* was already in the data layer
  (`QUESTS`/`QUEST_STATUS`/`getNpcQuest`); the panel JSX and the one-line
  NPC-tap open-panel wiring stay in BroTown by design.
  **⚠ Dormant system (owner-confirmed, 2026-06-12):** quests date from the
  earliest builds — the current game content has no quest-giver NPCs or
  buildings, so none of this code path is reachable in live play and the
  owner hasn't seen it in months. The machinery is fully wired end-to-end
  (client logic, server `quest_accept`/`quest_turn_in` cases, data tables),
  so it was preserved behavior-frozen, but: (a) it cannot be play-verified
  until quest content returns, (b) don't invest further decomposition or
  fixes in it, and (c) it is a candidate for a future owner decision —
  revive with new content, or remove client+server+data together as its
  own PR. Same likely applies to other early-build content systems
  (collectibles/scavenger hunt, some NPC interactions) — check with the
  owner before assuming any content-facing system is live.
- **Phase 4 — ✅ done (v2.3.783):** `_processGameEvent` (~1,215 lines, the
  bulk of the 40+ message handlers) → `src/networking/gameEvents.js` as
  `processGameEvent(type, payload, S, deps)`. Closure captures made
  explicit: data/variant/combat/chat imports at module scope; React setters
  + `pixiRef` + the effect-scoped `_buildServerPile` via a `_gameEventDeps`
  object built once per WS-effect run. eslint `no-undef` was the capture
  detector (caught `pixiRef`, `DEATH_GOLD_PENALTY`, `updateZoneDimensions`/
  `generateZoneMap`, `BT_API_BASE`).
- **Phase 5 — ✅ done (v2.3.784):** the remaining inline WS effect body
  (~1,560 lines: lobby room resolution, protocol-v2 join, the main message
  switch, `_buildServerPile`, reconnect backoff, the v2.3.778 resume-resync
  recovery ladder, channelShim) → `src/networking/wsClient.js`
  `setupWebSocket(ctx)`; BroTown keeps a thin useEffect passing the ctx
  (setters/refs/gating flags). Every dependency imported explicitly; the
  stale eslint LEGACY DEBT globals blocks for wsClient.js (19 entries) and
  the deleted gameLoop.js (30) were removed — wsClient lints with zero
  grandfathered globals. **The networking layer is now fully out of
  BroTown.jsx.** Follow-up noted: wire the live `tick` case into the
  `tickTimes`/`tickSizes` NET-overlay buffers (pre-existing gap, kept
  frozen).
- **Phase 6 — ✅ done (v2.3.787):** the zone-transition block (~457 lines of
  the game loop) → `src/game/zoneTransitions.js`
  `handleZoneTransitions(S, ptx, pty, _zone, W, H)`: town-exit proximity
  warp, tile-9 return-to-town, the disabled tile-10 dungeon entrance
  (`if (false &&` preserved verbatim), and the dungeon exit. `ptx`/`pty`/
  `_zone` stay computed in BroTown and are passed in — downstream loop code
  (wasteland gate, water check) keeps reading the pre-transition values,
  same as inline. The zone-specific mechanics that followed the block stay
  put for the game-loop-slicing phases.
  Note: the dungeon entrance/exit paths are dormant (entrance disabled
  since v2.3.54) — same owner-decision caveat as the Phase 3 quest system.
- **Wasteland removal — ✅ done (v2.3.788, same PR as Phase 6):** the first
  "dormant content system" owner decision (see the Phase 3 caveat) landed:
  the owner confirmed the wasteland / Lawless Land no longer exists in the
  game (the Ferryman NPC was despawned when NPC_DATA was emptied, leaving
  the zone unreachable) and asked for full removal. Deleted: the zone def
  (`zones.js`), the wasteland branch of `generateZoneMap`, the fence-climb
  game-loop block, both (duplicate!) Ferryman panel JSX copies, the
  ferryman keyboard/tap wiring, the wasteland HUD banners + climb progress
  bars, and the Lawless stat display rows. Kept: tile 11/12 table entries
  (shared infra), the generic `zone.lawless` flag checks (inert with no
  lawless zone), and the `lawlessKills`/`lawlessDeaths` comp-stat fields
  (saved-data shape). `server/` had zero references.
- **Phase 7 — ✅ done (v2.3.789):** desktop keyboard controls (the
  onKeyDown/onKeyUp pair inside the game-loop effect) →
  `src/game/desktopControls.js` `setupDesktopControls(S, deps)`, which
  registers the window listeners and returns the teardown the effect
  cleanup calls. The `_desktop*` useCallback helpers and the §5.8
  contextual-dodge resolver stay in BroTown (shared with touch controls)
  and arrive via deps; `BT_AUDIO`/`getNpcQuest` are module imports. The
  captured `chatOpen` value keeps the original closure's staleness
  semantics (effect dep array unchanged). WASD movement itself was never
  here — the game loop reads `S.keys`, which the extracted handlers
  still populate.
- **Phase 8 — game-loop slicing, in progress.**
  - **Slice 1 — ✅ done (v2.3.809):** per-zone mechanics (~270 lines) →
    `src/game/zoneMechanics.js` `updateZoneMechanics(S, ptx, pty)`:
    FROZEN SHORE snowballs/snowmen/sled (dormant — the action UI is
    disabled), TIDAL CAVES tide/swim/§DIVE (live), DEEP HOLLOWS torch
    (dormant) + echo flag (live). Found while moving: the dormant
    snowball/sled damage formulas read a bare `R` (the pre-module
    global rpg alias) that no longer exists — they'd have thrown a
    ReferenceError if the disabled UI were ever re-enabled. Guarded
    with a documented `var R;` so they fall back to their intended
    `|| 0` path; zero effect on live play. Frozen-shore actions are
    another revive-or-remove owner decision (like quests).
  - **Slice 2 — ✅ done (v2.3.810):** §14.1 dungeon wave progression
    (~356 lines) → `src/game/dungeonWaves.js`
    `updateDungeonWaves(S, { stateRef, setRpgState })`: next-wave spawn,
    boss spawn (custom §DNG + standard depth-scaled), completion rewards
    + return-home / next-depth warps, endgame unlock on core clear. The
    custom-dungeon path (Dungeon Workshop) is live; the standard path is
    dormant behind the disabled tile-10 entry. The 3s setTimeouts re-read
    `stateRef.current`, preserved via deps.
  - **Slice 3 — ✅ done (v2.3.811):** the MONSTER AI + COMBAT block
    (~2,460 lines — the single largest game-loop block) →
    `src/game/monsterCombat.js`
    `updateMonsterCombat(S, { activeWpn, setRpgState, setLevelUpMsg })`:
    the whole `if (S.monsters && S.rpg)` body — per-frame weapon/crit
    setup, the `S.monsters.forEach(m)` AI + combat loop (status ticks,
    archetype AI, aggro, boss abilities/phases, telegraphs, fodder ranged
    attacks, attack FX, block feedback, melee resolution, kills,
    drops/shards/gems/nuggets), the player-swing PvP pass over
    `S.others`, and the periodic RPG save. Because the build can't run in
    the web sandbox (npm registry blocked), captures were enumerated with
    a **depth-aware scope scanner** rather than eslint; the first naive
    scanner under-reported (a `Math.atan2(P.y, P.x)` initializer made it
    treat `P` as declared), so it was rewritten to track paren/brace
    depth before trusting the result. Non-obvious captures: `P`
    (player); `activeWpn` — the OUTER loop weapon var, distinct from the
    block-internal `_activeWpn`, captured via deps so the one shard-roll
    RPC reading `activeWpn.element1` stays byte-identical; the two React
    setters. `window._pixiRenderer` stays a runtime global.
    **lint-build caught one missed capture** the scanner mis-classified:
    `arch`, used at 3 spots inside an `if (false)` dead death-FX block —
    fixed with a local declaration (unreachable, so byte-equivalent at
    runtime). A good reminder that combat-sized slices need the CI gate.
  - **Slice 4 — ✅ done (v2.3.812):** the ground-loot pickup block
    (~347 lines) → `src/game/groundLoot.js`
    `updateGroundLootPickup(S, { pixiRef, setRpgState, setLevelUpMsg })`:
    the whole `if (S.groundLoot)` filter — stale-pile expiry, loot
    magnetism, multiplayer recipient/claim gating, coin/xp/item/shard
    awards on pickup, pickup sparkle + level-up burst, post-pickup
    despawn delay. 16 captures, all clean on the first scan.
  - **Slice 5 — ✅ done (v2.3.813):** arrow + slime projectile sims
    (~575 lines) → `src/game/projectiles.js` `updateArrows(S, {
    setRpgState, setLevelUpMsg })` (flight/aim/homing, monster hit +
    kills sharing the melee drop/shard/xp path, wall/range expiry) and
    `updateSlimeProjectiles(S)` (fodder-slime projectiles with
    mid-flight shield/block re-eval + contact damage). Arrows: 35
    captures, only P/setters non-module; slime: 7, all clean. No
    `if (false)` dead blocks (the slice-3 `arch` failure mode), so the
    scope scanner's flat-scope limitation didn't bite.
  - **Slice 6 — ✅ done (v2.3.814):** the VISUAL SYSTEM UPDATES
    "pre-render simulation" block (~107 lines) → `src/game/visualSystems.js`
    `updateVisualSystems(S)`: screen-shake decay, player facing (discrete
    dir + continuous angle), footstep timer/stats, other-player
    interpolation, remote-projectile simulation. Cleanest slice yet — the
    only capture is `BT_AUDIO`; the block reads `S.player` directly so no
    `P` and no deps.
  - **Slice 7 — ✅ done (v2.3.815):** the per-frame state-cleanup block
    (~26 lines) → `src/game/stateCleanup.js` `updateStateCleanup(S)`:
    expiry of transient flags/timers (block/level-up/death flashes, zone
    wipe, combo grace + next-extended, monster telegraphs, chat bubbles,
    ground splatter, impact rings) and expired-ground-loot marking. 3
    captures (S + two combo constants); `_now` confirmed block-local
    (not read by the render dispatch that follows).
  - **Slice 8 — ✅ done (v2.3.816):** the RENDER dispatch + sim/render
    perf split (~89 lines) → `src/game/renderFrame.js`
    `renderFrame(S, { pixiRef, canvas, nfts, perfNow, perfDelta })`:
    `pixiRef.current.update()` (PixiJS-only), the 90-frame poisoned-
    renderer self-heal, and the `perfTracker.record(...)` per-frame
    breakdown + throttled `[bt-frame-split]` warn. Turned out to be a
    clean verbatim move after all — `W`/`H` compute inside from the
    canvas; the only captures are pixiRef/canvas/nfts and the two
    loop-top frame-timing values (passed as perfNow/perfDelta). The
    crashTrap dynamic-import path resolves to the same `src/debug/`
    target from `src/game/`. 9 references, zero unresolved.
  - **✅ Phase 8 complete (v2.3.816).** The game-loop `useEffect` body is
    now a flat sequence of imported calls — death-flow catch, farm sleep,
    zone transitions, zone mechanics, dungeon waves, monster combat,
    ground-loot, the regen/dmg-number bookkeeping that's inherently
    React-stateful, projectiles, visual systems, state cleanup, and the
    render dispatch — with the per-frame perf setup at the top. No large
    inline simulation blocks remain. BroTown.jsx is ~25,080 lines (from
    ~33k at the plan's start). What's left in BroTown is genuine
    component territory: hooks/effects, the `_desktop*`/dodge helpers
    shared with touch, and the JSX. Further shrinkage would be UI/JSX
    decomposition (panels, modals) — a different kind of work from the
    game-loop strangler-fig, to be planned separately if desired.

## Post-Phase-8 — game-logic helpers still inline in the component

The game *loop* is done; a few cohesive game-logic helper clusters still
live in BroTown alongside the React/JSX. These are the same `(S, …)`-style
pure-logic moves and continue thinning the component.

- **Dodge cluster — ✅ done (v2.3.817):** the §5.8 contextual
  dodge/lunge/retreat-shot helpers → `src/game/dodge.js`
  (`triggerContextualDodge` + internal `resolveDodgeContext`,
  `doStandardDodge`, `doLunge`, `doRetreatShot`). All five already took
  explicit `(S, R, ang)`; 14 references, every one a module import (zero
  React state / refs), so BroTown imports only `triggerContextualDodge`
  (the touch-swipe + keyboard entry point) and the cluster's cross-calls
  resolve inside the module. Bodies byte-identical.
- **Player-actions cluster — ✅ done (v2.3.819):** the `doSwing` /
  `doSpecialAttack` / `doShield` useCallback *bodies* → `src/game/
  playerActions.js` `swingAttack(S)` / `specialAttack(S)` / `raiseShield(S,
  { setShieldUp })`. The component keeps thin useCallback wrappers (so the
  referential identity every JSX/handler caller depends on is unchanged)
  that just call the module fn with `stateRef.current`. specialAttack's
  one `stateRef.current._tutorialStep` read became `S._tutorialStep` (same
  object); raiseShield's only React setter (`setShieldUp`) goes via deps.
  Bodies byte-identical.
- **Life-skill rewards cluster — ✅ done (v2.3.841):** the gather/
  extraction reward flow → `src/game/lifeSkillRewards.js`:
  `startExtraction` (per-node swipe-window state machine),
  `succeedExtraction` (routes a valid swipe to the per-skill applier),
  `applyCookingResult`, plus module-internal `applyFishingReward` /
  `applyWoodReward` / `applyMiningReward` (only `succeedExtraction` calls
  them). The component keeps thin useCallback wrappers for the three with
  external callers. `setRpgState` is the only React setter (threaded via
  deps; `succeedExtraction` forwards it to the appliers); `setItem` was
  `localStorage`, `setCookingMini` belongs to the interleaved cookingBus
  effect (left in place). All six bodies byte-identical. The scope scan
  caught (and I fixed) two body slices that had wrongly kept their
  `var S = stateRef.current` opener.
- **Interactions cluster — ✅ done (v2.3.842):** `sendEmote` (emote
  broadcast) and `enterBuilding` (building-tap → unlock-gate check →
  open panel) → `src/game/interactions.js`. Thin useCallback wrappers
  stay in the component (imported aliased — `sendEmoteImpl` /
  `enterBuildingImpl` — to avoid shadowing the same-named wrappers).
  Both were synchronous and read `stateRef.current` directly; rewritten
  to the passed-in `S` (same object). Setters via deps (setShowEmotes,
  setBuildingPanel). This roughly exhausts the cleanly-separable
  game-logic in BroTown; what remains is genuine UI/JSX territory.
## Dead-content removal (owner-directed)

- **In-window gather minigame removed — ✅ done (v2.3.867):** the old
  `gatherMini` timing-bar modal ("TAP when the bar hits the green zone"
  for fishing/woodcutting/mining, ~300 lines: useState + animation
  useEffect + 3 dead `setGatherMini` fall-throughs + the UI block) was
  deleted. Owner confirmed (2026-06-14) the in-window life-skill minigames
  were replaced by on-screen gesture events. Proven dead first: every
  gather node type (fishSpot/tree/oreVein/campfire, plus createGatherNode's
  `oreVein` default) returns early into the gesture flow
  (`_startExtraction`/`_startCookingAtCampfire`) before the `setGatherMini`
  fall-through, so it was unreachable. The elemental Minigame Arena
  (`showMinigame`/`ELEMENTAL_MINIGAMES`) is a SEPARATE system and was left
  untouched. `evaluateMinigame` (only used by gatherMini) dropped from the
  DATA destructure. Zero residual refs; gesture flow intact.

## Dead/unwanted-content removal (owner-directed)

- **Elemental Minigame Arena removed — ✅ done (v2.3.871):** the on-farm
  2–4 player elemental minigames (Lava Dodge, etc.) — owner asked to
  remove (same "no in-window minigames" direction). It was LIVE/reachable
  (not dead): `ZONES.farm_home._minigameArena` was placed during farm-map
  gen, gating a proximity button → `showMinigame` modals. Removed across
  3 files (client-only — it used peer `broadcast` events, no server DO
  handler): BroTown (two `showMinigame` modal blocks ~820 lines, the
  showMinigame/minigameInstance useStates, the `_nearMinigameArena`
  detection, the farm button, the arena-only imports), `desktopControls.js`
  (the E-key arena branch + its dep), and `gameSystems.js` (the farm-gen
  arena structure + `_minigameArena` rect). **Kept `MINIGAME_REWARDS`**
  (still used by the live gesture extraction). The now-orphaned data-layer
  cluster (`ELEMENTAL_MINIGAMES`, `createMinigameInstance`,
  `evaluateMinigame`, arena `MINIGAME_*` consts) has no importers and is
  tree-shaken — left as a trivial optional follow-up. ~890 lines removed.

## UI/JSX decomposition (the remaining BroTown mass)

The game-logic is out; what's left in BroTown is the React component + its
JSX panel/modal tree (~20 `showX && React.createElement(...)` blocks).
Pattern: move a panel's createElement subtree to `src/ui/panels/<Name>.jsx`
as a component, pass the values it closed over as props, mount it with
`React.createElement(<Name>, { ...props })`. Caveat: the JSX tree is the
hottest part of the file (splash/HUD/camera/life-skill sessions edit it),
so pick self-contained panels clear of that churn, and keep prop surfaces
small. `npm run build` can't run in the web sandbox — lint-build/Pages is
the gate, and eslint no-undef catches a missed prop in the new component.

- **InfoPanel — ✅ done (v2.3.855):** the online-count + mute/close
  utility popup (`showInfo`, ~66 lines) → `src/ui/panels/InfoPanel.jsx`.
  Proof-of-concept for the panel pattern: tiny prop surface
  (`playerCount`, `setPlayerCount`, `setShowInfo`, `stateRef`; `BT_AUDIO`
  imported), end-of-tree and isolated from the parallel UI work. Subtree
  byte-identical; BroTown full-file syntax re-checked after the splice.
- **LeaderboardPanel — ✅ done (v2.3.856):** the top-50 rankings modal
  (`showLeaderboard`, ~288 lines) → `src/ui/panels/LeaderboardPanel.jsx`.
  Includes its render-time IIFE (fetches /api/leaderboard on tab change,
  merges nearby players, sorts, renders) — moved verbatim, side effects
  preserved. 5 props (stateRef, leaderboardTab, setLeaderboardTab,
  setRpgState, setShowLeaderboard); LIFE_SKILLS/BT_API_BASE/babel
  imported; fetch is the global. Boundaries found by paren-matching (not
  by eye) since the panel ends in a nested IIFE; full-file syntax
  re-checked.
- **GuildPanel — ✅ done (v2.3.857):** the skill-guild rank/quest/title
  screen (`showGuildPanel`, ~342 lines) → `src/ui/panels/GuildPanel.jsx`.
  6 props (rpgState, guildSkill, setGuildSkill, setRpgState,
  setShowGuildPanel, stateRef); GUILD_RANKS/SKILL_GUILDS/getGuildQuest/
  getGuildRank/BT_AUDIO + babel imported. Boundary paren-matched; subtree
  byte-identical; full-file syntax re-checked.
- **FeedbackPanel — ✅ done (v2.3.858):** the submit + browse community
  feedback modal (`showFeedback`, ~598 lines — the biggest panel yet) →
  `src/ui/panels/FeedbackPanel.jsx`. Includes its async ticket-list fetch,
  moved verbatim. 18 props (8 feedback-* useState values + their setters +
  setShowFeedback + stateRef); FEEDBACK_CATEGORIES/FEEDBACK_TOPICS/
  BT_API_BASE/BT_AUDIO + babel async/spread helpers imported; fetch /
  URLSearchParams are globals. Props destructure + mount object generated
  programmatically to avoid typos across the large surface.
- **ClanPanel — ✅ done (v2.3.859):** the clan create/manage/war screen
  (`showClanPanel`, ~726 lines — now the biggest) → `src/ui/panels/
  ClanPanel.jsx`. 8 props; CLAN_*/ELEMENTS/ZONES/createClanWar/
  createDefaultClan/BT_AUDIO + babel imported (CLAN_WAR_ZONES +
  createClanWar were globalThis-only inline — imported explicitly per the
  no-globals rule). **Gotcha the scanner caught:** `_clanData$members(2)`
  are babel optional-chaining temps hoisted to BroTown's top-level var
  list, not declared in the panel — declared locally in the component
  (reassigned before each read, byte-equivalent). A reminder to scan every
  panel for hoisted transpiler temps, not just state/props.
- **SocialPanel — ✅ done (v2.3.860):** the friends/muted/blocked lists
  modal (`showSocialPanel`, ~257 lines) → `src/ui/panels/SocialPanel.jsx`.
  Purely presentational — zero module imports (only React + 8 props: the
  three lists + their setters + setShowSocialPanel + stateRef). Two
  verification notes: (a) the depth-aware scan MISSED `setBlockedList` (a
  bare-call setter) — caught by a direct `grep set[A-Z]\w*(` enumeration,
  now part of the per-panel checklist; (b) the `_stateRef$current26/28`
  and `_f$name` babel temps were declared locally inside the panel (lines
  45/215), not hoisted like ClanPanel's — verified directly.
- **Per-panel pre-ship checklist (learned the hard way):** (1) paren-match
  the boundary; (2) depth-aware scan for the prop surface; (3) **grep all
  `set[A-Z]\w*(` calls** (scan has a bare-call blind spot); (4) **verify
  every module import is a real `export`** (not just present in the `=
  DATA` destructure — `createDefaultClan` was a phantom); (5) grep for
  hoisted babel temps (`_x$y`) not declared in the subtree; (6) full-file
  `node --check`. CI (vite build) remains the final gate.
- **PetHousePanel — ✅ done (v2.3.861):** the pet slots/evolve/enchant
  modal (`showPetHouse`, ~460 lines) → `src/ui/panels/PetHousePanel.jsx`.
  10 props; ELEMENTS/MAX_PET_SLOTS/PET_EVOLUTION_TIERS/enchantPet/evolvePet/
  BT_AUDIO + babel imported (all verified real exports). Six hoisted babel
  temps (`_rpgState$lifeSkills{3,4,5,6,8,9}`) declared locally — caught by
  a comprehensive `_\w+(\$\w+)+` temp enumeration (some were assigned
  inside `var pets = (...)` initializers, so a naive "declared?" check
  false-positived; the depth-aware enumeration is the reliable one).
- **FurniturePanel — ✅ done (v2.3.862):** the furniture crafting
  workshop (`showFurniture`, ~158 lines) → `src/ui/panels/FurniturePanel.jsx`.
  4 props; FURNITURE_RECIPES/addLifeSkillXp/BT_AUDIO + babel imported
  (real exports verified); `_R$lifeSkills2`/`_rpgState$lifeSkills0` hoisted
  temps declared locally.
- **DungeonCreatorPanel — ✅ done (v2.3.863):** the custom-dungeon
  builder (`showDungeonCreator`, ~1073 lines — the largest panel) →
  `src/ui/panels/DungeonCreatorPanel.jsx`. 8 props; ARCHETYPES/DUNGEON
  packs/ELEMENTS/TILE/createMonster/getDungeonCreatorUnlocks/
  validateCustomDungeon/BT_AUDIO + babel imported (real exports verified);
  no hoisted temps; globalThis is a runtime global. Caught locally: a `*/`
  inside the header comment (from `DUNGEON_*/`) closed the block comment
  early — node --check flagged it before push. (Watch for `*/` sequences
  in generated comments.)
- **EncyclopediaPanel — ✅ done (v2.3.864):** the discovery compendium
  (`showEncyclopedia`, ~703 lines) → `src/ui/panels/EncyclopediaPanel.jsx`.
  Notably reads no rpgState/stateRef — discovery state comes via the
  imported discovered*/visitedZones selectors. 3 props; 15 data symbols +
  babel imported (all real exports); `_key$split2` hoisted temp local.
- **SkillsPanel — ✅ done (v2.3.865):** the life-skill levels / resources
  / quest-progress screen (`showSkills`, ~574 lines) → `src/ui/panels/
  SkillsPanel.jsx`. Display-only — 3 props (rpgState, stateRef,
  setShowSkills; no setRpgState). 5 data + babel imports (real exports);
  `_rpgState$lifeSkills46` hoisted temp local. (The `_`/`g`/`herb` the
  scanner flagged were regex/string content, not identifiers.)
- **ShopPanel — ✅ done (v2.3.866):** the town shop buy/sell modal
  (`showShop`, ~222 lines) → `src/ui/panels/ShopPanel.jsx`. 4 props;
  SHOP_ITEMS_FOR_SALE/SHOP_PRICES/BT_AUDIO + syncRpgToServer + babel
  imported (real exports verified); no hoisted temps.
- **StatScreenPanel — ✅ done (v2.3.869):** the character stats /
  attribute-allocation screen (`showStatScreen`, ~251 lines) → `src/ui/
  panels/StatScreenPanel.jsx`. 4 props; calc derived-stat helpers +
  getActiveWeapon/getWeaponCritStat/xpRequired/BT_AUDIO + babel imported
  (real exports verified); no hoisted temps; confirm/localStorage globals.
- **QuestPanel — ✅ done (v2.3.870):** the NPC quest accept/turn-in dialog
  (`questPanel`, ~127 lines) → `src/ui/panels/QuestPanel.jsx`. The
  transition logic already lived in `@/game/quests.js` (Phase 3); the
  panel imports acceptQuest/turnInQuest from there. 5 props;
  `_questPanel$npcRef` hoisted temp declared locally. (Quest content is
  dormant, but the panel is wired and moved behavior-frozen.)
- **buildingPanel sub-panels — ✅ COMPLETE (owner-approved sub-by-sub):**
  the ~5.8k-line buildingPanel container was decomposed one sub-panel
  at a time into `src/ui/panels/buildings/`, not lifted wholesale. All 11
  sub-panels are now extracted (forge, woodwork, enchant, gemcut,
  exchange, farm, bank, cook, gamble, party, shop→VendorPanel). Each
  `buildingPanel === 'X' &&` gate stays in BroTown; only the Fragment
  subtree moved. BroTown.jsx dropped from ~15.9k to ~12.1k lines over the
  run.
  - **ForgePanel — ✅ done (v2.3.872):** the `buildingPanel === 'forge'`
    blacksmith clause (~1,134 lines: weapon/armor craft, reforge, harden,
    salvage) → `src/ui/panels/buildings/ForgePanel.jsx`. 3 props (rpgState,
    stateRef, setRpgState); 19 data/helper imports verified real;
    `_rpgState$lifeSkills21` hoisted temp local. The `buildingPanel ===
    'forge' &&` gate stays in BroTown; the Fragment subtree is the panel.
  - **WoodworkPanel — ✅ done (v2.3.873):** the `buildingPanel === 'woodwork'`
    clause (~367 lines) → `src/ui/panels/buildings/WoodworkPanel.jsx`. 3
    props; imports verified real; 4 hoisted babel temps declared locally.
  - **EnchantPanel — ✅ done (v2.3.874):** the `buildingPanel === 'enchant'`
    clause (~412 lines: gem socketing / amulet+shield enchant) →
    `src/ui/panels/buildings/EnchantPanel.jsx`. 3 props; imports verified
    real; 5 hoisted babel temps declared locally.
  - **GemcutPanel — ✅ done (v2.3.875):** the `buildingPanel === 'gemcut'`
    clause (~135 lines: raw-gem cutting / GEM_CUT_TIERS) →
    `src/ui/panels/buildings/GemcutPanel.jsx`. 3 props
    (rpgState, stateRef, setRpgState); imports verified real; 2 hoisted
    babel temps declared locally.
  - **ExchangePanel — ✅ done (v2.3.876):** the `buildingPanel === 'exchange'`
    clause (~792 lines: the player marketplace — buy/sell orders, price
    estimation, order matching, async fetch to the worker) →
    `src/ui/panels/buildings/ExchangePanel.jsx`. The big, entangled one:
    21 props (rpgState, stateRef, setRpgState + the 9 `mkt*` state values
    and their 9 setters). Data imports verified real; `BT_API_BASE`
    re-imported from `@/networking/index.js` (byte-identical to BroTown's
    local var); async/regenerator + spread/slice babel helpers imported;
    14 hoisted optional-chaining temps declared locally. eslint is
    correctness-only (no-undef etc.; no no-unused-vars/no-redeclare), so
    declaring the full temp set is safe and avoids any out-of-scope ref.
  - **FarmPanel — ✅ done (v2.3.877):** the `buildingPanel === 'farm'`
    clause (~310 lines: the farm plot manager — plant/harvest crops,
    regenerate the farm_home zone map) →
    `src/ui/panels/buildings/FarmPanel.jsx`. 4 props (rpgState, stateRef,
    setRpgState, setBuildingPanel). Data imports verified real
    (generateZoneMap / updateZoneDimensions resolve from gameSystems via
    the @/data barrel); 2 hoisted babel temps declared locally.
  - **BankPanel — ✅ done (v2.3.878):** the `buildingPanel === 'bank'`
    clause (~55 lines: the bank / equipped-gear summary view) →
    `src/ui/panels/buildings/BankPanel.jsx`. The simplest one: 1 prop
    (rpgState), read-only, no setters / data tables / babel helpers; 3
    hoisted optional-chaining temps declared locally.
  - **CookPanel — ✅ done (v2.3.879):** the `buildingPanel === 'cook'`
    clause (~531 lines: the cooking station — pick a fish, hit the
    sweet-spot timing, brew a heal dish) →
    `src/ui/panels/buildings/CookPanel.jsx`. 5 props (rpgState, stateRef,
    setRpgState, cookMinigame, setCookMinigame). Data imports verified
    real (createDefaultCompStats from items via the @/data barrel);
    hoisted optional-chaining temp set declared locally.
  - **GamblePanel — ✅ done (v2.3.880):** the `buildingPanel === 'gamble'`
    clause (~262 lines: the casino — coin-flip bet + jackpot deposit) →
    `src/ui/panels/buildings/GamblePanel.jsx`. 3 props (rpgState,
    stateRef, setRpgState). Data imports verified real
    (createDefaultCompStats from items via the @/data barrel); the 8
    hoisted `_compStats` optional-chaining temps declared locally.
  - **PartyPanel — ✅ done (v2.3.881):** the `buildingPanel === 'party'`
    clause (~1634 lines — the **largest** sub-panel: the Arena, with a
    live tournament bracket, match betting, champion rewards, and worker
    polling for arena state) → `src/ui/panels/buildings/PartyPanel.jsx`.
    15 props (rpgState, stateRef, setRpgState plus the 6 `arena*` state
    values and their 6 setters). Data imports verified real; BT_API_BASE
    re-imported from @/networking (byte-identical to BroTown's local var);
    async/regenerator + spread/spread-array babel helpers imported; the
    hoisted optional-chaining temp set declared locally.
  - **VendorPanel — ✅ done (v2.3.882):** the `buildingPanel === 'shop'`
    clause (~142 lines: the in-building Vendor view — basic supplies for
    starting adventurers) → `src/ui/panels/buildings/VendorPanel.jsx`.
    **Named VendorPanel, not ShopPanel**, to avoid colliding with the
    pre-existing town-shop modal `panels/ShopPanel.jsx` (the `showShop`
    overlay) — they are two distinct shop UIs. 3 props (rpgState,
    stateRef, setRpgState); BT_AUDIO verified real; no hoisted temps.
    This was the last buildingPanel sub-panel.
- **InventoryPanel — ✅ done (v2.3.883):** the `showInventory && rpgState`
  modal subtree (~827 lines: the full inventory / equipment screen — equip
  and compare gear, weapon stash, amulet/shield/pet slots, item actions) →
  `src/ui/panels/InventoryPanel.jsx`. The first modal that needed
  BroTown-local bindings passed as props: alongside rpgState/stateRef/
  setRpgState/setShowInventory it takes **gearWorn** (a useState value) and
  **toggleGearSlot** (a useCallback) — 6 props total, the "deps object" the
  plan anticipated, but just plain props. 18 data/helper imports verified
  real (including `discoveredCollisions`, a `Set` exported from
  gameSystems). NOTE: the inventory subtree has multi-`$` babel temps
  (e.g. `_ELEMENTS$wpn$element0`); the extraction scanner's single-`$`
  regex truncated them to prefixes and the free-var verifier caught the
  resulting `no-undef` risk — the full multi-`$` set is now declared
  locally. Use the `_[A-Za-z0-9_]+(\$[A-Za-z0-9]+)+` pattern for temps.
- **TradePanel — ✅ done (v2.3.884):** the `showTrade && tradeTarget &&
  rpgState` modal subtree (~179 lines: the outgoing player-to-player trade
  window — pick items + quantities to offer, send/cancel) →
  `src/ui/panels/TradePanel.jsx`. 6 props: rpgState, stateRef, tradeTarget,
  tradeOffer (state) and setShowTrade, setTradeOffer (setters). No
  data-table imports; only spread/slice babel helpers; no hoisted temps.
- **IncomingTradePanel — ✅ done (v2.3.885):** the `incomingTrade &&
  rpgState` modal subtree (~150 lines: the inbound trade-request popup —
  review the offer, accept or decline) →
  `src/ui/panels/IncomingTradePanel.jsx`. 4 props: stateRef, incomingTrade
  (state), setIncomingTrade, setRpgState (setters); rpgState is read only
  in the gate, not the subtree. BT_AUDIO verified real; spread/slice babel
  helpers; one hoisted temp declared locally.
- **PlayerListPanel + EmotePanel — ✅ done (v2.3.886):** two small HUD
  overlays extracted together (low-risk, same gated-subtree pattern).
  - `showPlayerList` (~42 lines: the online-players list, tap to inspect) →
    `src/ui/panels/PlayerListPanel.jsx`. 3 props (playerList,
    setInspectPlayer, setShowPlayerList).
  - `showEmotes` (~44 lines: the emote / quick-chat picker) →
    `src/ui/panels/EmotePanel.jsx`. 1 prop (sendEmote, a useCallback);
    EMOTES/TEXT_EMOTES imported.
- **InspectPlayerPanel — ✅ done (v2.3.887):** the `inspectPlayer` modal
  subtree (~549 lines: the player-inspect / social-actions popup — view
  another player's gear and reputation, friend / mute / block, or open a
  trade) → `src/ui/panels/InspectPlayerPanel.jsx`. 13 props: stateRef,
  inspectPlayer/blockedList/clanData/friendsList/mutedList (state) and
  setBlockedList/setFriendsList/setInspectPlayer/setMutedList/setShowTrade/
  setTradeOffer/setTradeTarget (setters). Data imports (BT_AUDIO,
  PVP_THREAT_BASE_COUNTDOWN, PVP_THREAT_COOLDOWN, REPUTATION, ZONES)
  verified real; slice/spread-array babel helpers; 7 hoisted temps local.
- **NameModal — ✅ done (v2.3.888):** the `if (showNameModal) { … }`
  early-return render path (~352 lines: the vertical guided character
  creator — banner, character showcase, name row, customization drawer,
  Randomize, PLAY) → `src/ui/panels/NameModal.jsx`. First **render-helper**
  extraction (the "different strategy"): the whole render body, including
  its local `_objTiles`/`_colTiles`/category-builder helpers, moves into
  the component; the `if (showNameModal)` gate stays in BroTown and now
  just returns `<NameModal …/>`. Render-only — NO effects or game-loop
  logic moved. Trait catalogs + their sprite setters import from
  `@/rendering/*` (the modules they actually live in — same imports BroTown
  uses); BUILD_INFO from BuildBadge. 41 props carry the React selection
  state, its `*Sel` setters, the preview refs, and BroTown handler
  closures (joinTown, randomizeWithFlair, rollRandomName, rotatePreview,
  markObjPicked, _swatchTile, _thumbTile, _dragRotX). Key lesson:
  `set*` is NOT always a React setter — `setHeadwear/setHair/setShirt/…`
  are **imported** trait functions, only the `*Sel` ones are state.
  Classify each free var against BroTown's import lines before deciding
  import-vs-prop. With this BroTown.jsx is under 10k lines (9,963).
- **KeyboardHintsPanel — ✅ done (v2.3.889):** the `bt-kb-hints` desktop
  WASD/hotkey help strip → `src/ui/panels/KeyboardHintsPanel.jsx`. The
  cleanest extraction yet: **zero props** (fully static markup); the
  desktop-detection `window.matchMedia` gate stays in BroTown.
- **TouchControls — ✅ done (v2.3.890):** the floating dual-joystick touch
  overlay (left movement zone, right aim/combat zone, both joystick
  base+knob+preview stacks, legacy hidden shield) → `src/ui/panels/
  TouchControls.jsx`. The first **multi-sibling render extraction**: the
  five elements were a contiguous tail of children of a parent container,
  so they're wrapped in a Fragment and the parent's closing tag + the rest
  of the tree stay in BroTown. Boundary found by depth-tracking from the
  lZone `React.createElement` and stopping right before the parent-closing
  `)` (the next sibling is the `bt-kb-hints` gate); paren-balance verified
  0. 15 props: stateRef + the 11 joystick/zone/knob/preview/shield refs +
  autoAttack/isLandscape/shieldUp render flags; 3 stateRef.current temps
  local. **Correctness key:** BroTown still owns the ref objects and its
  dual-joystick touch effects bind to them; TouchControls attaches those
  SAME refs to the DOM, so the effects keep working unchanged. Render-only;
  no effect/loop code moved. (Primary iPhone input — verify on device.)
- **DuelRequestPanel + ThreatIncomingPanel — ✅ done (v2.3.891):** two PvP
  popups extracted together (render-only gated subtrees that survived the
  earlier sweep, still lower-risk than effects).
  - `duelRequest` (~110 lines: incoming duel-challenge — accept/decline) →
    `src/ui/panels/DuelRequestPanel.jsx`. 3 props (stateRef, duelRequest,
    setDuelRequest); BT_AUDIO.
  - `threatIncoming && !threatIncoming.responded` (~150 lines: incoming-PvP
    -threat popup — ignore/call-guards) →
    `src/ui/panels/ThreatIncomingPanel.jsx`. 3 props (stateRef,
    threatIncoming, setThreatIncoming); BT_AUDIO + _objectSpread.
- **ChatPanel — ✅ done (v2.3.892):** the `chatOpen` chat-input overlay
  (~109 lines: type + send a message) → `src/ui/panels/ChatPanel.jsx`. 6
  props: chatInput (state), chatInputRef / chatInputValRef (the SAME refs
  BroTown's canvas render loop mirrors — passed through, same correctness
  pattern as TouchControls), sendChat (useCallback), setChatInput,
  setChatOpen. No data imports or temps.
- **WarBanner (ActiveWarBanner + EndedWarBanner) — ✅ done (v2.3.893):**
  the two clan-war HUD banner IIFEs → `src/ui/panels/WarBanner.jsx`. They
  used the `function (_temp) { … }()` pattern (called with no arg — the
  param was just a babel optional-chaining temp). Each IIFE body became a
  **stateRef-only** component that reads `stateRef.current._activeClanWar`
  at render and returns its banner or null (same read-at-render timing,
  behavior-frozen). ZONES imported; the babel temp is a local var. Pattern
  note: an `function(_t){…}()` IIFE → `Component({stateRef})` with `_t` as
  a local var is a clean conversion when the only free vars are stateRef +
  imports. BroTown.jsx now under 9k lines (8,969).
- **MenuBar — ✅ done (v2.3.894):** the scrollable bottom action/menu
  button bar (~427 lines: the horizontal-scroll row of buttons that open
  every panel — inventory, skills, stats, social, clan, guild, leaderboard,
  encyclopedia, feedback, shop, emotes, info — plus special-attack, chat
  toggle, pet/body bits) → `src/ui/panels/MenuBar.jsx`. The most entangled
  render extraction: 32 props (rpgState/stateRef + the show* flags, the
  panel-toggle setters, doSpecialAttack), 6 @/data + 4 @/networking + 4
  babel imports, 7 hoisted temps. The onClick handlers (incl. async
  btRpc/syncRpgToServer calls) are event handlers that moved with the JSX —
  no effect/loop bodies touched. Watch the `*/`-in-comment trap (a literal
  `getBt*/` in the header closed the block comment early — caught by
  node --check).
## Effect / game-loop extraction (started v2.3.895)

The render decomposition is essentially complete — BroTown.jsx is at the
plan's target (~8.5k lines of component + JSX). The new phase moves effect
**bodies** into `src/game/` behind a thin call, keeping the `useEffect` +
its dep array in BroTown. Pattern: `useEffect(() => wireX(deps), [deps])`
calling `export function wireX(deps) { …; return cleanup; }`. Each effect
that touches live behavior needs **on-device verification**.

- **gearWornSync — ✅ done (v2.3.895):** the first effect-body extraction.
  The empty-dep `useEffect` that subscribes to chest/legs/shirt equip
  changes and pushes a worn-map into React state →
  `src/game/gearWornSync.js` (`wireGearWornSync(setGearWorn)`). Verbatim
  body; `getEquip`/`onEquipChange` imported from `@/rendering/gearCatalog`;
  BroTown's effect is now `useEffect(() => wireGearWornSync(setGearWorn), [])`.
  Ideal first pick: empty deps, one React dep, clear cleanup, no
  render-timing subtleties. Establishes the pattern for the rest.

- **splashAudio (wireTorchCrackle + wireThemeMusic) — ✅ done (v2.3.896):**
  the two showNameModal-gated character-creator audio effects (arm on the
  splash's first pointerdown, loop) → `src/game/splashAudio.js`. Verbatim
  bodies; each early-returns (no cleanup) when the modal isn't showing,
  exactly as before. BroTown effects are now
  `useEffect(() => wireTorchCrackle(showNameModal), [showNameModal])` and
  `useEffect(() => wireThemeMusic(showNameModal, themeAudioRef), [showNameModal])`.
  Device-verified: splash torch crackle + theme music still play on tap.

- **characterCreatorEffects — ✅ done (v2.3.897):** the three
  character-creator lifecycle effects → `src/game/characterCreatorEffects.js`:
  `wireCharacterPortrait(previewCanvasRef, sel)` (redraw the preview +
  prewarm 7 angles on selection change; the 12 selections pass as a `sel`
  object so the redraw body stays byte-identical), `wireSplashPrewarm(
  showNameModal, introWarmRef)` (2.5s-delayed in-game-sheet + intro-clip
  prefetch; returns clearTimeout cleanup), and `clampLongHairColor(hairSel,
  hairColorSel, setHairColorSel)` (force dark hair color for the long
  style). Trait/render helpers imported from `@/rendering/*`. GOTCHA caught
  pre-CI: `LONG_HAIR_COLORS` had a SECOND use in BroTown (a hair-color
  filter helper) beyond the clamp effect — removing its decl would have
  been a no-undef; the decl was kept. Always grep a moved local for OTHER
  uses before deleting it.

- **Dead weapon-swap-bus path removed — ✅ done (v2.3.898):** while
  extracting the `weaponSwapBus.subscribe` effect (PR #107, closed) the
  owner flagged the weapon-swap bar + emoji indicator as dead. Verified:
  nothing calls `weaponSwapBus.setSlot` (no publisher), `WeaponSwapBar.jsx`
  was already deleted (only comments reference it), BottomDashboard's bus
  import was unused, and the live weapon swap runs via a separate path
  (BroTown mutates `rpg.activeSlot` + sends `set_active_slot` directly). So
  instead of relocating dead code, removed it: the `weaponSwapBus.subscribe`
  effect + its BroTown import, the unused BottomDashboard import, and the
  orphaned `src/ui/mobile/weaponSwapBus.js`. Behavior-neutral (the
  subscription never fired). Lesson: when an extraction target turns out to
  be dead, delete don't relocate.

- **townMusic — ✅ done (v2.3.899):** the `[showNameModal, showLogin]`-gated
  in-town background-melody interval (a chiptune note every 1.8s via
  BT_AUDIO) → `src/game/townMusic.js` (`wireTownMusic(showNameModal,
  showLogin)`). Verbatim; returns clearInterval cleanup; early-returns
  while the splash/login is up.

- **spriteSheets — ✅ done (v2.3.900):** the ~129-line mount-time
  (empty-dep) loader for the per-direction player jog/hit sheets, slime
  sheets, weapon sprites + hand anchors, and Tiled walkability maps →
  `src/game/spriteSheets.js` (`wireSpriteSheets(stateRef, refs)`). The 10
  image/anchor refs pass via a `refs` object so the body stays
  byte-identical (destructured back to the original names); the 4
  tiledMaps imports move to the module. Biggest effect extraction so far
  (−127 lines). Genuine game-system code that belongs in src/game/.

- **slimeAudio — ✅ done (v2.3.901):** the empty-dep slime proximity-audio
  loop (80ms tick → nearest fodder monster → inverse-distance gain on a
  looping BufferSource through BT_AUDIO's master bus) →
  `src/game/slimeAudio.js` (`wireSlimeAudio(stateRef, slimeIdleAudioRef)`).
  Verbatim; returns the interval-clear + source-stop cleanup.
  (Owner note: the frame-drop incident this audio was tied to was the OLD
  HTMLAudio impl; the current Web-Audio version FIXED it — feature is live,
  not disabled.)

- **orientationSync — ✅ done (v2.3.902):** the empty-dep resize/orientation
  listener that updates the isLandscape flag → `src/game/orientationSync.js`
  (`wireOrientationSync(setIsLandscape)`). Verbatim; returns the
  listener-removal cleanup.

### The rAF game loop stays in BroTown (decision)
The `═══ GAME LOOP ═══` effect (~2,453 lines, deps `[showNameModal,
showLogin, glEpoch]`, BroTown ~1678) is the perf-critical simulation +
PixiJS/Canvas render loop with an enormous closure (100+ captured vars).
The WS channel effect is already a thin `setupWebSocket({...})` wrapper.
Per the plan's end-state ("BroTown shrinks to UI orchestration… game
systems live in src/game/"), the game loop IS the orchestration that
belongs in the component — extracting it behind a 100+ entry deps object
would be more error-prone and less readable than leaving it, and it can't
be fully device-verified. **Recommendation: leave the game loop inline;**
the decomposition has reached its sensible end-state (BroTown 15.9k → 8.3k).
Remaining nibbles (small post-loop effects: firemakingBus sub — verify it
has a live publisher first, the edge-swipe guard, chat-focus/BT_AUDIO.init,
session-resume) are optional low-value follow-ups.
- **Candidates remaining (now the genuinely harder ones):**
  - More effects, by ascending risk: the small splash-audio / portrait
    effects (gated by showNameModal — could also fold into NameModal), then
    listener/subscription effects, then the channel/networking setup, then
    the rAF game loop (highest risk — extract last, verify hard).
  - A few small inline HUD bits remain (well-rested indicator ~18 lines,
    torch button, nearBuilding/nearNode interact prompts) — these are
    scattered between already-extracted mounts, so each is its own small
    component. Low value; batch a few if continuing.
  - **Top-level effect / game-loop / channel wiring** — the highest-risk
    category. Prefer moving effect bodies into `src/game/` behind a deps
    object, one effect at a time, only with the full verification protocol
    and anchors re-derived each pass.

Re-derive line anchors at the start of each phase — they drift with every
release. The extraction order may be reshuffled if a phase turns out to be
more entangled than it looks; safety (rules above) outranks the sequence.

## Verification protocol (referenced by every phase)

1. `npm run build` (the only static gate; there is no client lint/test suite
   yet — adding a smoke/unit harness around extracted modules is a welcome
   follow-up once a few pure modules exist).
2. Optional local smoke: `npm run build && npm run preview` + `node
   tools/qa/qa-smoke.mjs` (Playwright boot/join/walk, captures pageerrors and
   `bt-crashlog`).
3. Canonical: **PR preview URL on iPhone Safari**, with the per-phase
   behavioral checklist from the PR description.

## End state

BroTown.jsx shrinks to UI orchestration (~5–8k lines of component + JSX);
game systems live in `src/game/`, networking in `src/networking/`, all
documented. At that point the architecture *is* rebuilt — without a rewrite,
without parity gaps, and without ever taking the live game down.
