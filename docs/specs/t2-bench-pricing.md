# Bench-Locked T2 Pricing (v2.3.1451)

Owner directive 2026-07-24: "Make the strength of that skill relative
to current level monsters (and lower) with decaying power carried to
the next level up... each stat point needs to offer an immediate
noticeable improvement similar to an increase in base damage."

Owner-confirmed design decisions (AskUserQuestion, 2026-07-24):
locked-in value (no explicit decay factor — monsters outgrow points);
benchmark = combat level ÷ 10 (ceil, clamped [1,100]); scope = the 10
flat channels only; migration = replay at benchmark.

## What changed

The 10 flat-number channels (edge/drawPower/spellPower,
executioner/headshot/focus, ironskin, resilience, thorns, secondwind,
recovery, lifeblood, vigor, stamina) stop reading the absolute
accelerating formula `t2Accel(pts, T2_UNITS[role])` and read a
**server-owned per-channel accumulator** `ps.t2Flat` instead.  Every
mechanical channel and both counters are untouched.

A point's value is set once, at spend time:

    benchLevel  = clamp(ceil(combatLevel / 10), 1, 100)
    benchStats  = sentinel (1.0/1.0) at benchLevel, via the REAL spawn
                  curves (monsterStat + monsterHpFlat)
    pointValue  = max(1, ceil(T2_BENCH[role].pct × benchStat))
    combatLevel = 1 + points already placed   (t2SpendLevel — derived
                  from the build total on BOTH sides, never ps.level)

CEIL rounding makes the anchors algebraic at every benchmark:
4 vigor points ≥ one sentinel hit of maxHp; 20 ironskin points ≥ one
full sentinel hit soaked (sim gates BN-03/BN-04).

## Shared tables & helpers (mirror-audited)

`src/data/gameSystems.js` ↔ `server/src/data.js`:
`T2_BENCH` (pct table), `T2_BENCH_CANONICAL` (all 30 channels in THE
canonical `_clampBuildTotal` order; `role: null` = mechanical),
`t2BenchLevel`, `t2BenchStats`, `t2PointValue`, `t2SpendLevel`,
`emptyT2Flat`, `t2ReplayFlat`.  `test/mirror-audit.test.mjs` pins the
tables byte-identical and probes every function at several benchmarks.

## The accumulator (`ps.t2Flat`)

    { sword:     { edge, executioner },
      bow:       { drawPower, headshot },
      staff:     { spellPower, focus },
      defense:   { ironskin, thorns, secondwind },
      hp:        { vigor, recovery, lifeblood, resilience },
      endurance: { stamina } }

**Trust posture: `payload.t2Flat` is NEVER read.**  The accumulator
feeds the authoritative damage roll AND the anticheat ceiling, so a
client-supplied value would raise its own cap (the v2.3.1131
forged-godly lesson).  It is priced in exactly one place —
`_t2BenchReprice` (server/src/grids.js), called from
`_handleStatsUpdate` strictly AFTER `_clampBuildTotal`, diffing
post-clamp counts against a pre-mutation snapshot:

- added point (canonical order walk): bank
  `t2PointValue(role, t2BenchLevel(t2SpendLevel(placed)))`, `placed++`
  — the benchmark can tick mid-batch, identical to buying one at a
  time; mechanical points advance `placed` but bank nothing;
- truncated/clamped points never bank (they never happened);
- decreases (stale echo — there is no player respec): proportional
  scale `round(flat × new/old)`, deterministic on both sides.

Persisted in `_saveRpg`, echoed in `_sendPlayerState` (protocol-v2
delta handles it) — the echo is the client's drift corrector.

## Client

- Deploy-order gate: `caps.t2bench` → `setT2BenchEnabled` (wsClient
  state_sync).  Reads are additionally PRESENCE-gated
  (`t2BenchLive(rpg)` = gate on AND `rpg.t2Flat` present): against an
  old worker, before the first echo, and in fixtures the full legacy
  t2Accel math runs — matching whatever worker is authoritative.
- Prediction: `SpendPointConfirm.onConfirm` banks the placed point
  with the same formula (`combatBuildTotal(R) − 1` as the pre-spend
  total), so the echo is normally a no-op.
- Displays: `calcWeaponDmg` / `calcDisplayDmgRange` / `weaponCritFlatFor`
  / `getVigorFlat` / `getRecoveryFlat` / `getStaminaFlat` /
  `getIronSkinFlat` / `applyResilience` read the banked value when
  live.  `derive(v, ctx)` renders "hits +{flat} harder · next +{next}
  (Lv-{bench} monsters)"; ctx built by T2Panel / SpendPointConfirm.

## Migration v9 `bench-locked-t2` + boundary heal

Purchase order was never stored, so `t2ReplayFlat` assumes each
channel's p points were uniformly interleaved across the N total
purchases: point j prices at global position `ceil((2j−1)·N/(2p))`
(midpoint stratification — exact when one channel holds every point;
order-independent; idempotent).  Absent-only fill: a blob that already
carries `t2Flat` was priced live and is never re-replayed.  The join
bootstrap runs the same replay on fresh client payloads AFTER the spec
clamps (join.js); stored blobs adopt via `_sanitizeT2Flat`.

## Deploy matrix

- old client + new server: counts priced server-side; unknown echo
  field ignored; authoritative hp/level echoes win.  Safe.
- new client + old server: no `caps.t2bench` → full legacy path.  Safe.

## Verification

- `cd server && npm test` — new/updated coverage in protocol-v2
  (ceiling + echo + save), combat-lifecycle (all flat fixtures replay
  through `t2ReplayFlat`), grids §11 (diff pricing, forged payload,
  proportional scale, truncation), migrations §13 (v9), mirror-audit,
  display-dps (banked-flat display).
- `node tools/balance-sim.mjs --bench --strict` — point-value table +
  gates BN-01 (2.5–8% noticeability band), BN-02 (never smaller),
  BN-03/04 (vigor/ironskin anchors), BN-05 (crit-pair 3–5×), BN-06
  (decay monotonicity).
