# Anti-Bot / Anti-Cheat Spec — Life Skills

Written 2026-06-10 (v2.3.694). Companion to the client telemetry shipped in the
same version. The game server is the Cloudflare Durable Object in `server/src/
index.js` (deploys independently — every rule here must tolerate old clients
that don't send the new fields). This doc is the implementation guide for the
server-side detection; the client half is already live.

> **STATUS (v2.3.1146, 2026-07-03):** the server half SHIPPED —
> `server/src/botfp.js` + docs/specs/anticheat-botfp.md (the living spec
> for what's live). Owner decision: FLAG-ONLY — the §5 ladder ships rungs
> "evidence + shadow-flag" only; automatic throttling was declined, hard
> action stays manual. Per-section status: §1 ADAPTED (cooking became a
> swipe-flip; the flip's swipeFp rides cook_request, tapless-cook
> REJECTION still deferred) · §2 entropy floor SHIPPED, STRICT_EXTRACTION
> still deferred · §3 SHIPPED · §4 DEFERRED (needs client ack changes) ·
> §5 SHIPPED flag-only incl. device correlation · §6 SHIPPED (270/h
> gathering, 700/h cooking). The bottom "Server TODO" section is done:
> T2 persistence shipped v2.3.1021, mitigation authority v2.3.1113.

## Threat model
- **Casual cheats** — localStorage `bt_rpg` edits, claiming `kind:'cooked'`
  without playing. Already largely closed by `player_state` overwrite + the
  cook_request validation below.
- **Scripted bots** — fixed macros driving the extraction gesture / cooking
  taps. Beatable by per-gesture floors + randomized challenge.
- **Sophisticated agents** (e.g. an LLM-driven client) — can synthesize
  plausible curves and vary them. NOT reliably beatable per-gesture; the
  defense is **statistical accumulation over a session** + **economic rate
  caps**. Assume the adversary reads this doc.

## Trust model today (for reference)
- Server-authoritative, already enforced: coins, inventory, life-skill XP/level
  (all overwritten by `player_state`), combat damage (server-computed), raw T1
  stats (clamped per-level in `_handleStatsUpdate`).
- Client-trusted (not yet server-validated): weapon/defense T2 channel
  allocations (localStorage only — see server TODO), block & Iron Skin
  mitigation (client-applied; `player_state` reconciles hp), gesture grading.

## Client signals now available (shipped v2.3.694)
- **node_strike.swipeFp** `{len, ent, dur, n, tv, vc, h}`
  - `ent` vectorEntropy (angle-delta variance; human ≥ 0.04)
  - `tv` inter-sample timing variance in ms² (synthetic clocks → ~0)
  - `vc` velocity-profile curvature (constant-velocity drags → ~0)
  - `h` FNV-1a hash of the 8px-quantized path (exact-replay key)
  - `n` sample count, `len` path length px, `dur` ms
- **cook_request.taps** `[{t, frac}]` — flip time (ms) + indicator position
  (0..1) for each of the (up to 2) flips.
- **join.device** `{id, env}` — stable localStorage nonce + coarse env hash.

## Server rules to implement

### 1. Cooking validation (cook_request)
- Golden zone is `frac ∈ [0.40, 0.70]`. A `cooked` result requires exactly two
  taps both in-zone with the 2nd later than the 1st; otherwise force `burnt`.
- Burn-in: if `taps` is absent (old client), accept the claimed `kind` but
  increment a `taplessCookCount` per identity for later review. After the
  client burn-in window (say 2 weeks post-deploy), reject tapless `cooked`.

### 2. Extraction timing (node_strike vs extraction_start)
- Persist `extraction_start` {nodeId, t}. On node_strike, require the strike to
  land within the `computeOpenDelay` window the server itself rolls (see §4) —
  graduate from today's permissive logging to enforcing behind a
  `STRICT_EXTRACTION` flag once telemetry confirms no false positives.
- Entropy floor: `ent < 0.04` ⇒ not eligible for `perfect`; downgrade to `ok`.

### 3. Replay detection
- Keep a small ring (per identity, ~64) of recent `swipeFp.h`. A repeat `h`
  within the window ⇒ flag (`replayHits++`) and downgrade the grade. Humans
  effectively never reproduce a path bit-for-bit.

### 4. Randomized challenge variation (defeats fixed scripts)
- The server already seeds ±15% delay jitter. Add: per-attempt, server-seed
  `repsTarget ± 1` and a cue-radius multiplier, returned in the
  `extraction_start` ack so the **client** reads them (client change: read
  these from the ack instead of the local `EXTRACT_REPS_TARGET`). A fixed macro
  tuned to one target will over/undershoot.

### 5. Statistical accumulator (defeats sophisticated agents)
Per `(identity, device.id)` rolling window (e.g. last 200 harvests):
- Distribution of `ent`, `tv`, `vc` — track mean **and variance**. Humans show
  wide, drifting variance; synthetic input converges (low variance-of-variance).
  Flag when variance collapses below a learned floor.
- Inter-harvest interval distribution — bots are too regular; near-constant
  spacing is a signal.
- `device.id` correlation: many passphrase identities sharing one `device.id`
  (or `env` hash) at superhuman aggregate harvest rates ⇒ fleet signal.
- **Response ladder, not instakill:** score → (a) silent yield throttle
  (reduce drop rates / XP for the flagged session), then (b) shadow-flag for
  review, then (c) hard action. Throttling is reversible and low-false-positive;
  bans are last.

### 6. Economic rate caps (backstop, always on)
- Hard per-account caps on resources/hour per skill, independent of detection,
  sized so a legit grinder never hits them but a 24/7 bot does. This bounds the
  worst case even if every behavioral check is defeated.

## Server TODO beyond anti-cheat (cross-cutting, noted here so it's not lost)
- **T2 persistence + validation:** weapon AND defense channel allocations
  currently live only in client localStorage. Persist `weaponSpecs/Skills/
  Unspent` + `defenseSpec/Skill/Unspent` in `_saveRpg`, and validate on
  `stats_update`: each channel ≤ its cap, total spent ≤ points earned from
  skill level. Today a client could inject channel points; this closes it.
- **Mitigation authority:** block reduction (`calcBlockReduction`) and Iron
  Skin (`applyIronSkin`) are client-applied. If/when the server computes
  monster→player damage, mirror both there so authority matches prediction.

## Verification
- Server unit tests in `server/test/`: cook golden-zone validator, replay-hash
  dedupe, challenge-seed determinism, cap-clamp on stats_update.
- Manual: harvest/cook on a branch preview with an OLD client build (no new
  fields) → no rejections; with the new build → telemetry present; replay a
  captured swipeFp.h twice → server flags it.
