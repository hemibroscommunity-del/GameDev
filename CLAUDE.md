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
  `docs/DEPTH-ROADMAP.md` (the costed depth work, code-aware),
  `docs/ART-ASSET-PHASES.md` (what environment art to commission, at what
  size, in what order — the decoded-RGBA budget and the free-standing
  vs edge-cropped test live here, v2.3.2650),
  `docs/WORLD-MAP-PIPELINE.md` (the ONE-SEAMLESS-WORLD plan: the World
  Builder at `public/tools/world/` — grid, blueprint, per-square ChatGPT
  prompts, fuser — and the engine phases after it, v2.3.2931; its
  "world trial" section is the `?trial=world` switch that streams the
  old round island, baked from today's zone art, in place of the World
  View, v2.3.2932; `?trial=wheel` (v2.3.2943) puts the World View on the
  Wheel itself at full size, its ground laid on the phone from the Ground
  Studio's own swatches (read from its IndexedDB on the same site, then
  `public/world/ground/`) by a worker, `public/tools/world/core/ground-worker.js`
  via `src/game/wheelTrial.js` and `src/rendering/wheelGround.js`; since v2.3.2936 the plan is **the Wheel**: the safe
  commons round Brotown, one spoke of land per element with its own levels
  1–80 at one zone per five levels, sea between, passes at 20 and 60, and a
  keystone gate to the Dark or Light realm (80–100) at every tip — geometry
  in `public/tools/world/core/wheel.js`, and the blueprint stores every
  cell's tier, the level map; since v2.3.2937 the ground is 48 swatches made
  in the **Ground Studio** at `public/tools/ground/` and laid onto the plan
  by `public/tools/world/core/ground.js`, deterministic and seamless between
  chunks — the phone's future ground builder; since v2.3.2947 two grounds
  meet in a layered, pair-sized edge drawn from the two pictures, a land's
  stages change in patches, and each ground has an optional EDGE PIECES
  prompt, its loose tufts on magenta: `edgeRecipe`, `pieceMap`,
  `edgePromptFor`, WORLD-MAP-PIPELINE "Where two grounds meet"; since
  v2.3.2948 the edge pieces are PUT AWAY, the owner seeing no difference:
  kept and tested, but shown and loaded only with `?edgepieces` in the
  address, and `EDGE_PIECES` in ground.js brings them back; since v2.3.2949
  every boardwalk and bridge is a PLANK DECK -- `bp.decks` from layout.js,
  bridges straight and square-ended -- whose boards the game lays itself,
  12 game px each, across the deck and lined up with its ends: `planksOf`,
  the boardwalk's `laid: 'planks'`, the one swatch that may run one way,
  WORLD-MAP-PIPELINE "Bridges and boardwalks"; since v2.3.2950 ALIKE
  grounds -- one kind, or earth/sand/ash -- MIX over a wide zone in big
  patches shaped by both pictures (`MIX`, `MIX_PATCH`, `MIX_HEIGHTS`), the
  town square and street included, only the boardwalks keeping straight
  edges (`CRISP`): WORLD-MAP-PIPELINE "Alike grounds mix"; since v2.3.2951
  such a pair may have a BLEND picture, the owner's idea, laid through the
  middle of the zone (`opts.blends[blendKey(a, b)]`, the studio's version
  `M` under the pair's key, `ground/<key>-M.png` + the manifest's `blends`,
  `blendPromptFor` attaching the two swatches and not the key): optional
  per pair, a pair without one mixing exactly as before; since v2.3.2952
  laid as TWO WHOLE PLAIN MIXES either side of the blend (`BLEND_OFF`, the
  zone 1.4x wider, heights at `BLEND_HEIGHTS` 0.45 to keep it cheap) --
  v2.3.2951's halved changes ran into the zone's end and drew a straight
  line beside the plan's cell edge, which the owner spotted; since
  v2.3.2953 their big patches are `BLEND_BIG` 1.3x as strong in a zone as
  much wider (1.7x), so the blend's edges wander as far as a plain mix's;
  WORLD-MAP-PIPELINE "Blend pictures"; and since v2.3.2953 a picture is
  made SEAMLESS BY A CUT where its two ends look alike, never a cross-fade
  -- the old one left three quarters of every tile see-through, two
  pictures at once (docs/TRAPS.md, averaging two textures is mush) -- the
  studio remaking saved tiles from the uploads once (`PREP_MADE`):
  `seamless`/`seamlessPixels` in `public/tools/style/process.js`,
  WORLD-MAP-PIPELINE "Seamless by a cut"; and since v2.3.2954 where
  three grounds meet EVERY partner in reach has its say (`edgeAt` ->
  `ruleAt`, ties by `marginAt` + `PARTNER_TIE` noise, `settle` the same) --
  "answer to the nearest partner" cut patches off along the straight line
  halfway between two, the owner's "V" at the street corners (TRAPS §122)
  -- and a MIX zone reaches `MIX_LIM` 1.15; blends stay optional, the owner
  choosing two pictures a pair: WORLD-MAP-PIPELINE "Where three grounds
  meet"; and since v2.3.2955 the blends are PUT AWAY like the edge pieces
  (owner: "Yeah hide it"): `BLENDS`/`blendsOn` in ground.js, the studio's
  card and the game's worker only with `?blends` in the address, kept and
  tested; still open when the owner stopped that round: a short
  checkmark-shaped edge beside the street corner, and rocky ground lying ON
  TOP of plain dirt where they mix -- WORLD-MAP-PIPELINE "Still open"; and
  since v2.3.2957 the studio's "Download for the game" packs only the manifest
  and finished tiles, as palette PNGs (`world/core/png8.js`, half the bytes,
  the same pixels), in zips under 24 MB for GitHub's website, while
  "Download all" (279 MB with every original) stays the owner's backup and
  never goes on GitHub -- WORLD-MAP-PIPELINE "Download for the game"; since
  v2.3.2958 the owner's own 96 tiles (48 swatches, A and B) ARE the game's
  ground, in `public/world/ground/` with its manifest; since v2.3.2959 a slow
  or failing download can no longer stop the ground: downloads run apart
  from the laying, four at a time with a 15 s limit and retries, a piece
  waits at most 4 s and is laid without a missing picture, then filled in
  when the worker says it came (`got`), pictures come two pieces ahead, and
  `?v=<manifest date>` + `public/_headers` let the phone keep them -- tested
  by the `wheelnet` scenario, WORLD-MAP-PIPELINE "On a slow connection"),
  `docs/WORLD-BIBLE.md` (that world's story and look — through-lines,
  region/border briefs, the Main Street Brotown plot table, the style key,
  the character-refresh order; a DRAFT the owner is reacting to, and
  `public/tools/world/plan.js` wins where they differ, v2.3.2931; its §6
  is the ART LAW since v2.3.2935: the owner chose **HD pixel art**, kept
  since v2.3.2942 at **2 px per game px** (the phone's own sharpness; the
  old 1.5 game px grid shrank ChatGPT's pictures and stretched them back —
  "soft and gritty" — and ground swatches now cover 512 game px, laid by
  `composeGround` at `opts.scale` 3 while the plan's unit stays 1.5 game px),
  one frozen 128-colour palette (64 until v2.3.2940), no gradients or baked
  shadows/glow, quiet ground, ground baked from swatches — the numbers and
  prompt words live in `public/tools/style/bible.js`, and every picture
  goes through `public/tools/style/process.js`; since v2.3.2939 every
  material is drawn as itself (`MATERIALS`, the owner's "material-aware
  texturing"), since v2.3.2944 nothing in a ground swatch runs one way
  (`NO_DIRECTION`: the owner's Main Street ruts tiled sideways, because a
  swatch is laid the same way up whichever way a road runs), and the STYLE KEY is the only picture any chat is matched to —
  NEVER attach the bro: he is simpler pixel art than the world and ChatGPT
  copies what it sees, so sizes are given in words (`personScale`) and he is
  only the size check in previews),
  `docs/STYLE-TEST.md` (the art-style test the owner ran in the Style Lab
  at `public/tools/style/` — six looks round the real bro, scored, v2.3.2934;
  decided v2.3.2935, and the lab's "HD pixel art (chosen)" look is now the
  place to check a picture at game size),
  `docs/WORLD-ARCHITECTURE.md` (the long-run TARGET for the seamless,
  many-room world: one home per piece of state, maps not zones, cells and
  interest, a character vault per player, one market settling by mail, the
  art pipeline, build order; ARCHITECTURE-HANDOFF still governs today's
  code, v2.3.2934; §11 is the cost and capacity plan, v2.3.2936: about
  0.1¢ per player-hour, a room is limited by INCOMING MESSAGES (~500–1,000
  a second per Durable Object, today's phones send 15–30 each), so the fix
  is a ~5 Hz message diet plus each world split into 11 area servers along
  the Wheel's spokes, not more small rooms; v2.3.2938 adds the bill at 100
  to 100,000 monthly players, about $5 to $1,100–2,800 a month, and the
  owner's business model: free play capped at 2 h a day, a $2-a-month
  supporter pass for unlimited — the server counts the hours, and logging
  every room message would cost more than the game),
  `docs/specs/*.md`, `docs/WIRE-PROTOCOL.md`, `docs/BALANCE-PLAN.md`,
  `docs/OPTIMIZATION-ROADMAP.md`, `docs/REBUILD-PLAN.md` (client
  decomposition), `docs/STATE-SCHEMA.md` (client S object; pre-dates
  v2.3.1116 — trust for shape, not for the new systems).
  Content-facing systems found in code may also be dormant
  (collectibles) — confirm with the owner before building on one.
  `docs/WORLD-DEPTH-PLAN.md` is the owner's world ART CONSTITUTION and is
  INTENT, not description: it asks for things the renderer cannot do yet.
  Never read it as evidence a feature exists; work from
  `docs/DEPTH-ROADMAP.md`, which costs it against the actual renderer.
  (Dynamic occlusion WAS the headline example here and no longer is —
  it shipped v2.3.2633–2635, `src/rendering/depthSort.js`. The still-
  missing one is a near-camera FOREGROUND layer: `WORLD_LAYER_NAMES` has
  no foreground entry, so edge-cropped framing art cannot be drawn at
  all — roadmap item 5.)

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

**AGENTS AND WORKFLOWS DIE SILENTLY. CHECKPOINT OR LOSE IT (owner
directive, 2026-09-10).** On 2026-09-09 four investigation workflows stopped
at ~22:47 and were reported as "still running" for three more hours. Two of
them had produced NOTHING and their work was lost entirely — the owner paid
for it twice. Rules, because this is money and time:

- **Never infer liveness from output.** A journal with no new results looks
  identical whether the agent is thinking or dead. Check the **mtime** of
  `subagents/workflows/<run>/agent-*.jsonl`; if nothing has been written in
  ~15 minutes, it is dead, not busy. Say so.
- **Make agents checkpoint.** Long investigations must write findings to a
  scratch file **as they go**, not only in a final structured return. A dead
  agent's return value is lost; a file on disk is not.
- **Run ONE heavy workflow at a time.** This box has 4 vCPUs and every UI
  scenario spawns a wrangler worker plus a Chromium. Four concurrent hunts
  plus local test runs is what killed them, and they left **48 orphaned
  chromium/workerd processes** behind.
- **Reap stragglers** (`pkill -f workerd; pkill -f chromium`) after any
  workflow that drove browsers, and check `ps` before starting another.
- **Resume, don't restart.** `Workflow({scriptPath, resumeFromRunId})`
  replays completed agents from cache. Read `journal.jsonl` first to see what
  actually returned before re-running anything.

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
    Those THREE categories (FIVE since v2.3.2596's zone banner and
    v2.3.2651's decor props) now load PER-ZONE via `preloadZoneAssets(zoneId)`
    (`preloadAnimations.js`) behind a brief per-zone loading overlay on
    zone entry (`src/game/zoneTransitions.js`, the `S._zoneLoading` gate),
    and the previous zone's ~4MB map is freed on exit (`freeZoneMap`,
    `tiledMaps.js`; worldview stays resident — town's map, NPCs and
    buildings free too since v2.3.2859, veiled back in by
    `zoneTransitions.syncTownScenery` however you arrive). This does NOT
    weaken the law's real intent — the per-zone loads are AWAITED behind
    an overlay (a deliberate loading SCREEN, not an unawaited lazy
    `Assets.load` that hitches mid-play). Everything else — player, town
    map, slime, all fx/skill/attack strips, head traits, fullset figures
    — still preloads up front on the gate. If you add a new PER-ZONE
    system, register it in `preloadZoneAssets` (not the global manifest)
    and free it on exit; anything global still registers in
    `preloadWorldAnimations`. **And whatever DISPLAYS it must drop its
    texture reference on the way out, not merely hide it** — v2.3.2651:
    the prop sprites hid but kept `spr.texture`, harmless while all prop
    art was global, and once decor was actually freed the second visit to
    a zone rendered a destroyed source ("Cannot read properties of null
    (reading 'alphaMode')", caught by mp-zonechurn).
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
