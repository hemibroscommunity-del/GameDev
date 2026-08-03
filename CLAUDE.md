# CLAUDE.md — Hemi Bros ARPG (BroTown)

Read this first. It encodes context that is expensive to rediscover.

## What this repo is

A real-time **100% server-based multiplayer** ARPG, fully contained in
this one repository. There is no single-player mode and never will be
(owner directive, 2026-07-02) — any client-local game logic is a legacy
remnant to migrate server-side, not a mode to preserve.

- **Client** — Vite + React + PixiJS (WebGL). Entry `src/main.jsx`, game
  UI/loop in `src/ui/BroTown.jsx`, rendering in `src/rendering/`,
  networking in `src/networking/` (`wsClient.js` connection + message
  switch, `gameEvents.js` event dispatcher, `index.js` identity/API
  base), data tables in `src/data/`.
- **Server** — `server/` is a Cloudflare Worker. Live Durable Objects:
  **GameRoom** (one shared room `brotown-1` — world, combat, economy
  settlement, clans/arena/market order book all live HERE), Leaderboard,
  Feedback. The Marketplace and Arena DO classes still exist for their
  wrangler bindings but are **retired from routing** — their logic was
  folded into the GameRoom (see `docs/ARCHITECTURE-HANDOFF.md`).
- **Heavy-systems architecture (v2.3.1116+):** persistent identity,
  offline mail/escrow, server-settled marketplace/trades/quests/duels.
  Before touching the server, read **`docs/ARCHITECTURE-HANDOFF.md`** —
  it is the charter of load-bearing conventions (storage-key registry,
  opId idempotency, caps/settled deploy-order flags, DO concurrency
  rules) plus the prioritized successor backlog.
- **Docs** — the root `README.md` is the Master Game Design Document
  (GDD), NOT a setup guide; don't put tooling docs in it.
  `docs/specs/*.md` holds implementation specs for shipped features.
- **Doc trust (owner directive, 2026-06-13):** the GDD (`README.md` /
  `gdd.md`) and `docs/ARCHITECTURE.md` are STALE — early design
  thinking only, describing many systems that were never built and
  missing many that were. NEVER use them as a blueprint to change,
  "fix", or "restore" game behavior. Code is the source of truth.
  Current, trustworthy docs: `docs/ARCHITECTURE-HANDOFF.md`,
  `docs/UI-BIBLE.md` (UI design law + icon-generation prompts, v2.3.1222),
  `docs/LANTERN-SLATE-SPEC.md` (the UI visual system — colors, depth,
  components; supersedes UI-BIBLE Part 2, v2.3.1227),
  `docs/specs/*.md`, `docs/WIRE-PROTOCOL.md`, `docs/BALANCE-PLAN.md`,
  `docs/OPTIMIZATION-ROADMAP.md`, `docs/REBUILD-PLAN.md` (client
  decomposition), `docs/STATE-SCHEMA.md` (client S object; pre-dates
  v2.3.1116 — trust for shape, not for the new systems).
  Content-facing systems found in code may also be dormant
  (collectibles) — confirm with the owner before building on one.

The server previously lived in a separate `brotown-server` repo, now
archived. Do not push there or build patches against it.

## AI session protocol (v2.3.1201)

Parallel AI sessions build this repo and used to collide — on
2026-07-07 five sessions claimed one version tag and two built the same
feature. A SessionStart hook now runs `tools/dev/session-brief.mjs`
(version high-water, next free `v2.3.N` tag, in-flight `claude/*`
branches): claim ONE tag above high-water, check the branch list for
your topic first. Run `node tools/dev/precheck.mjs` before EVERY push —
it is the fast local gate (syntax, dup switch cases, tag collisions,
storage-key registry, server suite).

**`npm install` WORKS in this sandbox (verified 2026-08-03).** This file
said for a long time that it was blocked, and that claim was load-bearing
in the wrong direction: it is why client changes were treated as
unbuildable and unverifiable, and shipped on reasoning alone. They are
not. `npm install && npm run build && npx vite preview --port 4173` all
run, `playwright-core` drives the Chromium at `/opt/pw-browsers`, and
`cd server && npx wrangler dev --port 8787 --local` gives you a real
worker on localhost. That means a client change CAN be smoke-tested here
before it ships — see `tools/qa/qa-ui-shots.mjs` (captures every menu)
and `tools/qa/qa-move-rate.mjs` (drives two real clients against a real
worker). Do not re-add the "blocked" claim without re-testing it.
What is NOT reachable is the open internet: the agent proxy denies
`*.pages.dev` and the production worker, so test against localhost.
Maps keyed by client-supplied ids must be `Object.create(null)` or
`Map` — plain `{}` silently no-ops on `'__proto__'` (fixed 3× in one
day: duel.away v2.3.1175, party meta v2.3.1185, amulet tiers
v2.3.1192). Details: `docs/DEV-TOOLS.md`. Before review or any "fix"
of old behavior: run `/repo-review` (adversarial multi-angle protocol,
`.claude/commands/repo-review.md`) and check `docs/TRAPS.md` — the
registry of plausible-but-wrong moves (v2.3.1204).

## Deployment (important)

- **Client:** Cloudflare Pages builds `main` automatically →
  production site. Every PR gets a preview URL posted by the Pages bot.
- **Server:** `.github/workflows/deploy-worker.yml` runs
  `wrangler deploy` from `server/` on any merge to `main` touching
  `server/**`. Requires the `CLOUDFLARE_API_TOKEN` repo secret.
- **NEVER deploy the worker from a local machine.** A laptop deploy of
  a stale clone on 2026-06-10 rolled back three weeks of server work
  and broke combat in production (the reason this repo is a monorepo).
- Rollback: Cloudflare dashboard → Workers & Pages → brotown-server →
  Deployments → rollback. Player data lives in Durable Object storage
  and survives deploys/rollbacks.
- A worker deploy briefly disconnects live players (clients
  auto-reconnect) and cold-starts the room: the first join after a
  deploy may retry its loading screen a few times. One-time per
  deploy; not a bug. Prefer merging server changes at quiet hours.

## Wire protocol

Two protocol versions coexist; both must keep working:

- The client sends `protocolVersion: 2` in the `join` message.
- v2 sessions get: delta `player_state` (changed fields only,
  no-change emits skipped), per-entity monster/node tick deltas,
  merged `zone_state` on zone change.
- v1 (anything that doesn't opt in) gets: full `player_state`
  snapshots, full dirty-zone entity lists, and the legacy
  `zone_monsters`/`zone_nodes`/`zone_loot` trio.
- The client keeps v1 handlers as fallback so it works against any
  worker version. Preserve this on both sides — it is the safety
  property that makes client and server deployable in either order.
- Server is authoritative for damage, HP, loot, XP, inventory, coins,
  quest progress, and ALL economy settlement (market/trade/duel — see
  `docs/ARCHITECTURE-HANDOFF.md`). Client damage popups are local
  prediction; `monster_hit` from the server is the truth. New
  client→server events must be denied by default unless added
  deliberately, and every server-EMITTED event type must be added to
  `PRIVILEGED_EVENTS` in `server/src/index.js` or clients can forge it.
- Deploy-order safety: servers advertise capabilities in
  `state_sync.caps` (WS) / `settled: true` (HTTP); clients gate their
  legacy paths on them. Preserve this on both sides.
- Identity: stable per-browser `bp_` ids from a silent passphrase
  (`bt_passphrase`); two tabs share one identity by design — test
  multiplayer with `?guest=1` on the second tab.

## Testing

- Server: `cd server && npm test` — twenty zero-dependency suites
  (protocol-v2, anticheat, combat-lifecycle, identity, inbox, market,
  trade, quests, duel, gamble, clans, arena, dungeon, sponsorship,
  guilds, threat, pets, hardening, trade2, elemental2; 450+
  assertions) against a mocked DO storage. Every new system adds a
  suite; extend the nearest one when touching its wire format.
- Client: no unit suite; CI runs lint + build on every PR, and the
  Pages bot posts a preview URL. The Playwright smoke harnesses
  (`tools/qa/qa-smoke.mjs`, `qa-facing.mjs`, …) are OFF the PR path
  (owner directive, 2026-07-16 — no live players, CI speed wins) and
  run only via workflow_dispatch on demand. Primary platform is
  **iPhone Safari** — test touch controls, not just desktop.

## Conventions

- **Animation preloading is LAW (owner directive 2026-07-19, after
  repeated first-use-hitch reports).** EVERY animation/sprite asset
  must be fully loaded during the loading screen, before the intro
  overlay lifts — the loading screen is explicitly allowed to take
  longer instead. The intro gate is `preloadPlayerAssets()`
  (`src/rendering/pixiRenderer.js`), which awaits the central manifest
  `preloadWorldAnimations()` (`src/rendering/preloadAnimations.js`).
  Any NEW animation system MUST register its loader in that manifest
  in the same PR. Lazy "load on first sighting/use" patterns
  (`ensure*Loaded` guards, ctor-kicked unawaited `Assets.load`) are
  BUGS unless the asset genuinely cannot be known at load time (e.g.
  a remote player's arbitrary recolor). The owner has flagged this
  multiple times — treat any first-use texture load as a regression.
  - **ZONE-ASSET EXCEPTION (owner directive 2026-07-20, "per zone
    loading instead of one long pregame loading screen", v2.3.1405).**
    The game was "wonky with RAM" on iPhone because the gate above force-
    loaded ALL zone-specific art up front (12 zone maps ~48MB + every
    monster variant + the frost snowman), stacking ~60MB onto the
    startup peak for assets you don't use in the zone you're standing in.
    Those THREE categories now load PER-ZONE via `preloadZoneAssets(zoneId)`
    (`preloadAnimations.js`) behind a brief per-zone loading overlay on
    zone entry (`src/game/zoneTransitions.js`, the `S._zoneLoading` gate),
    and the previous zone's ~4MB map is freed on exit (`freeZoneMap`,
    `tiledMaps.js`; hubs town/worldview stay resident). This does NOT
    weaken the law's real intent — the per-zone loads are AWAITED behind
    an overlay (a deliberate loading SCREEN, not an unawaited lazy
    `Assets.load` that hitches mid-play). Everything else — player, town
    map, slime, all fx/skill/attack strips, head traits, fullset figures
    — still preloads up front on the gate. If you add a new PER-ZONE
    system, register it in `preloadZoneAssets` (not the global manifest)
    and free it on exit; anything global still registers in
    `preloadWorldAnimations`.
- Code comments carry version tags (e.g. `v2.3.694:`) explaining WHY a
  change exists, often with incident history. Match this style; the
  comments are the project's institutional memory.
- `package.json` version tracks the client version loosely; comment
  tags in code are the finer-grained record.
- The repo owner is new to coding: PRs should be self-contained,
  explained in plain language, and mergeable with one button press.
  Avoid asking them to run terminal commands; prefer doing work in
  sessions and shipping reviewable PRs.

## Known history (June 2026)

- PR #10: client protocol v2 + fixes (beard z-order, remote-player
  facing flip, masked-body-frame prewarm, charge-pie dasharray).
- PR #12: server moved into `server/`, protocol v2 server side,
  auto-deploy workflow.
- The charge-pie "blue static" fix addressed exponent-notation
  `strokeDasharray`; if grainy noise on the pie is ever reported
  again on iOS, the next suspect is the CSS `drop-shadow` filter
  compositing over WebGL.
