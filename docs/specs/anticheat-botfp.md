# Behavioral Anti-Bot for Life Skills (v2.3.1146)

Server half of `docs/ANTICHEAT-SPEC.md`, shipped **FLAG-ONLY** per owner
decision (2026-07-03): behavioral signals record evidence and shadow-flag
accounts for the owner's review — nothing behavioral changes gameplay
automatically. Engine: `server/src/botfp.js` (mixin), hooks in
`_handleNodeStrike`, `_handleCookRequest`, the join case, and
`webSocketClose`.

## Wire surface (all pre-existing except the cook fp)

| Field | Direction | Since | Notes |
|---|---|---|---|
| `node_strike.swipeFp {len,n,dur,ent,tv,vc,h}` | c→s | v2.3.694 | gesture fingerprint; tv/vc/h were DROPPED server-side until now |
| `cook_request.swipeFp` | c→s | v2.3.1146 | the flip-stroke fp; client attaches only when `state_sync.caps.botfp` |
| `join.device {id, env}` | c→s | v2.3.694 | random localStorage nonce + coarse env hash — read server-side for the first time |
| `state_sync.caps.botfp` | s→c | v2.3.1146 | gates the cook fp attach (deploy-order safety) |
| `GET /api/botstat?id=…` / `?flagged=1` | HTTP | v2.3.1146 | owner-only; 404 unless `env.ADMIN_KEY` configured AND sent as `x-admin-key` |

## Detection rules

Per granted harvest strike (missing fp = permissive + `noFpStrikes++`,
the `_extractionMissing` posture — old clients never punished):

- **Entropy floor (forgery guard, the one grading effect):** claimed
  `perfect` with `ent < 0.04` is capped to `ok`. The CLIENT itself has
  required ent ≥ 0.04 for perfect since v2.3.694, so an under-floor
  perfect is a forged packet, not behavior.
- **Synthetic strike:** ≥2 of {`ent < 0.04`, `tv ≤ 1`, `vc ≤ 0.02`} → +2
  score. Single floors never score: iOS Safari frame-coalesces pointer
  events and rounds timestamps to 1ms, so a REAL iPhone legitimately
  sends tv 0–1. Requiring two independent floors makes a human trip
  effectively impossible.
- **Replay:** `swipeFp.h` (FNV-1a over the 8px-quantized path) repeating
  within the identity's last 64 → +3 score. Humans never reproduce a
  path bit-for-bit; hash-collision odds ≈ 5e-7 per strike and a
  collision only adds decaying score. Last 32 hashes persist in
  `botstat:` so reconnect-cycling doesn't clear the window.
- **Accumulator (every 25th strike):** variance collapse over the last
  ≥48 strikes (`var(ent) < 0.0004` or `var(vc) < 0.0001` → +5 + flag —
  humans drift, bots converge; the three gesture shapes alone differ by
  >0.1 mean entropy); inter-strike regularity (gaps ≤45s only, n≥20,
  CV < 0.05 → +2, evidence-grade only — respawn-camping humans can be
  regular); **fleet signal** — ≥4 identities on one device nonce with ≥3
  harvesting ≥30 strikes this hour → flag listing the ids (the anchor
  against free passphrase cycling).
- **Score:** single channel, 30-min half-life decay. Score ≥ 10 →
  shadow flag (max one auto-flag/hour/identity, ring capped 20).

## Economic hourly caps (ANTICHEAT-SPEC §6 — the approved clamps)

- Gathering: **810/hour/skill** (v2.3.1983; was 270). The number is
  derived, never picked: world supply per skill per zone is
  `nodes x 3600/respawnSeconds`, and the cap sits 50% above it so it can
  only ever fire on the physically impossible. Population-scaled spawns
  (`docs/specs/spawn-scaling.md`) grow a crowded zone to 3 nodes per
  skill, so the supply it is derived from went 1 x 180 = 180/h to
  3 x 180 = 540/h, and 540 x 1.5 = 810. `NODE_RESPAWN_TIME` is untouched
  at 20s because the arithmetic is anchored to it.
  A player ALONE still sees one node and the old 180/h ceiling
  (`node-respawn.test.mjs` §3b pins exactly that), so the raise hands a
  solo bot nothing; and the cap was never the bound on the world — a
  teleporting bot touring all 9 wilderness zones could reach
  9 x 180 = 1620/h at base density, so 810 still clips it by half.
  Whoever changes `SPAWN_SCALE.NODE_MAX`, `_getZoneNodeConfig` or
  `NODE_RESPAWN_TIME` owns this number next.
- Cooking: **700/hour** (sustained human ≈ 450; the prior only bound was
  `_cookRateOk`'s 20/min = 1200/h burst rate).
- Over-cap: harvest node still depletes but the grant is withheld
  silently (`capClamps++`, player_state snap-back); cook is dropped
  without consuming the fish. Hour window lives in `botstat:` —
  reconnect-proof, lazily rolled (no alarms).

## Storage

- `botstat:<playerId>` (~1–2KB): counters {strikes, noFpStrikes,
  syntheticStrikes, entFloorHits, replayHits, taplessCooks, cooks,
  capClamps}, hour window, hRing tail (32), Welford mean/M2 for ent/vc
  (n capped 200 with halving = exponential forgetting), score, flags
  (≤20, each with a counter snapshot). Written fire-and-forget from
  event handlers only, throttled 30s; flags and first cap-clamp flush
  immediately; final flush on socket close.
- `device:<deviceId>` (~200B): env hash, firstSeen, last 8 identities
  (30-day prune). Written at join only when the identity list changes.
- Live state (in-memory, rule 11): per-identity record ring (64 fps),
  hRing (64), intervals (32), score — Map capped 128 identities /
  256 devices.

## Privacy

`device.id` is a random token the client minted in localStorage;
`device.env` is a coarse FNV hash of environment traits. Neither is PII;
neither leaves the server; the admin endpoint is invisible without the
owner's key.

## Cooking adaptation (spec §1)

The §1 tap golden-zone rule targets a mechanic that no longer exists —
cooking became a swipe-flip. Replacement: the flip's own swipeFp rides
`cook_request` (caps-gated), the replay ring applies to it, and `cooked`
with no fp increments `taplessCooks` (burn-in bookkeeping; automatic
rejection of tapless cooks is a future step once telemetry shows new
clients dominate). The gathering entropy floor is deliberately NOT
applied to flips — an honest flip is a short near-straight stroke.
`kind` itself remains client-trusted (bounded by both cadence caps).

## Deploy-order matrix

| Client | Worker | Result |
|---|---|---|
| old | new | no fp on strikes → counters only, full grants; no cook fp → taplessCooks counting; no device → identity-only record. Hourly caps still apply (unreachable by humans). |
| new | old | cook fp gated off by missing `caps.botfp`; `device` ignored as today. |
| new | new | full pipeline. |

## Deferred (recorded here so they're not lost)

- ANTICHEAT-SPEC §4 server-seeded challenge variation (reps ± 1, cue
  radius) — needs a client change to read the extraction_start ack.
- Tapless-cook REJECTION after the burn-in window.
- `STRICT_EXTRACTION` (hard-enforce the timing window) once telemetry
  confirms no false positives.
- Folding `/api/botstat` under a general `/api/admin/*` umbrella if the
  operator-toolkit PR lands.
