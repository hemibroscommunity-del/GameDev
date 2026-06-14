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
- **Candidates remaining:** the big remaining mass is JSX panels/modals
  are `useCallback`s that read `stateRef.current` + a few setters — more
  entangled (would need a deps object), so a later pass. The big
  remaining mass is JSX panels/modals (UI decomposition), still its own
  separate effort.

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
