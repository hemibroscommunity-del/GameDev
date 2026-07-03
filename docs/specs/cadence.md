# Time-cadence framework (v2.3.1145)

The recurring daily/weekly primitive, correct under the DO's three hostile
constraints (handoff rules 11/12): **no alarms**, **the tick loop stops when
the room empties**, **deploys wipe memory**. Nothing is scheduled — periods
are pure functions of the clock, state lives in storage, and settlement is
lazy.

## The primitive (`server/src/cadence.js`)

- Period keys: `_cadencePeriodDaily(now)` → UTC `yyyymmdd` int;
  `_cadencePeriodWeekly(now)` → ISO-8601 `GGGG-Www` (Monday start, week 1
  holds the first Thursday; self-contained UTC helper). `now` is injectable
  — tests fake days/weeks with plain timestamps.
- Records: `cadence:<scope>:<subject>` = `{period, streak, ts}`. Due when
  the record is absent or its period ≠ current.
- Resolution points: per-player scopes on **join**; global scopes on the
  tick's **rate-limited slot** (~60 s, the `_opPruneMaybe` pattern) **and on
  first relevant activity** (handler entry). A week that ends in an empty
  room settles when the next player shows up.
- Idempotency: the cadence record is only the fast-path skip. The wall is
  the `_creditPlayer` opId (`daily:<pid>:<period>`, `jackpotwin:<period>`) —
  a crash between credit and record write converges as `dup` on retry
  (rules 4/5). Tested by deliberately double-resolving.

## Consumer 1 — daily login reward

On join (after the inbox drain): first login of a UTC day pays
`25 + 10×(min(streak,7)−1)` gold. Streak +1 when yesterday's period was
settled, else reset to 1. **Zero client code**: the credit rides
`_creditPlayer` → `inbox_delivered`, which the client already renders as a
"📫 You received …" chat line with the streak note.

## Consumer 2 — weekly jackpot (handoff item J — shipped)

The GamblePanel pool was a pure client stub (burned local coins into
nothing). Now:

- Storage: **one key** `jackpot:draw` = `{period, pool, entries:{pid:tickets}}`
  (single-key deviation from the handoff's two-key sketch, on purpose: one
  record makes deposit/read/rollover atomic under the input gate).
  Escrow-at-placement (rule 7 — the pool is money at rest, survives deploys).
- Deposit: WS `jackpot_deposit {amount}` (explicit switch case). Amount must
  be a multiple of 50 in [50, 5000] and covered by live coins. Debit + pool
  write commit in the ONE gated event (rule 8; no opId — a resend is
  legitimately a new deposit). Private `jackpot_state {pool, period,
  yourTickets, deposited}` reply.
- Draw: `_jackpotMaybeResolve` (join / deposit / rate-limited tick). Stale
  period + entrants → one ticket-weighted winner paid via `_creditPlayer`
  opId `jackpotwin:<period>` (offline winner → inbox, free), broadcast
  `jackpot_result {winnerId, winnerName, amount, period}`, record rolls to
  the current period with pool 0. House takes nothing (v1). Empty stale
  draws roll forward silently.

## Wire surface

- New client→server: `jackpot_deposit` (explicit case; denied-by-default
  convention preserved).
- New server→client (both in `PRIVILEGED_EVENTS`): `jackpot_state`
  (private), `jackpot_result` (broadcast).
- `state_sync.caps` gains `jackpot: true`; the GamblePanel deposit is
  caps-gated (legacy local stub kept for old workers; both deploy orders
  safe — the `player_state` echo is the coins tiebreaker).

## Storage keys (registered in the handoff rule-2 table)

`cadence:<scope>:<subject>`, `jackpot:draw`.

## Ideas for successors (Opus-friendly)

The primitive makes these cheap: daily quests (cadence scope `dailyquest`),
weekend XP events (weekly scope + a caps flag), rested-XP pools, market
listing fee holidays. Pattern: pick a scope, decide per-player vs global,
settle through `_creditPlayer` with a period-keyed opId.
