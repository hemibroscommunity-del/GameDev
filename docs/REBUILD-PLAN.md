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

**Dead duplicates from an earlier abandoned extraction (to delete, Phase 1):**

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

- **Phase 0 — this PR (v2.3.765):** foundation docs (this file,
  WIRE-PROTOCOL.md, STATE-SCHEMA.md, ARCHITECTURE.md staleness banner) +
  first extraction: module-scope combat helpers → `src/game/combatHelpers.js`.
- **Phase 1 — dead-code deletion:** remove `src/game/gameLoop.js`,
  `src/game/createInitialState.js`, `src/game/index.js`, and
  `setupWebSocket` from `src/networking/wsClient.js`. Rewrite
  ARCHITECTURE.md's stale rows. Zero behavior change; bundle unaffected
  (these are already tree-shaken out) — this is hygiene + foot-gun removal.
- **Phase 2 — chat:** `sendChat` (~1515) + the `chat`/`emote` dispatcher
  cases → `src/game/chat.js`, functions taking `(S, deps)` where deps are the
  React setters (`setChatLog`, `setUnreadChats`, …).
- **Phase 3 — quests:** quest panel state + `quest_accept`/`quest_turn_in`
  senders + NPC quest gating.
- **Phase 4 — WS event dispatcher:** lift `_processGameEvent` (~3033–4279,
  the bulk of the 40+ message handlers) → `src/networking/gameEvents.js` as
  `(type, payload, S, deps)`.
- **Phase 5 — connection lifecycle:** move the remaining inline WS effect
  body (~1845–3030 + channelShim) into `src/networking/wsClient.js`,
  **replacing** the stale file wholesale; BroTown keeps a ~10-line useEffect
  that calls it with a context object.
- **Phase 6+ —** zone-transition block, desktop keyboard controls
  (~11475–11637), then game-loop slicing (extract per-zone mechanic blocks,
  then the simulation/render split) guided by perf needs.

Re-derive line anchors at the start of each phase — they drift with every
release. The extraction order may be reshuffled if a phase turns out to be
more entangled than it looks; safety (rules above) outranks the sequence.

## Verification protocol (referenced by every phase)

1. `npm run build` (the only static gate; there is no client lint/test suite
   yet — adding a smoke/unit harness around extracted modules is a welcome
   follow-up once a few pure modules exist).
2. Optional local smoke: `npm run build && npm run preview` + `node
   tools/qa-smoke.mjs` (Playwright boot/join/walk, captures pageerrors and
   `bt-crashlog`).
3. Canonical: **PR preview URL on iPhone Safari**, with the per-phase
   behavioral checklist from the PR description.

## End state

BroTown.jsx shrinks to UI orchestration (~5–8k lines of component + JSX);
game systems live in `src/game/`, networking in `src/networking/`, all
documented. At that point the architecture *is* rebuilt — without a rewrite,
without parity gaps, and without ever taking the live game down.
