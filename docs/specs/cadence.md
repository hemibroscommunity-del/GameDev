# Time-cadence framework (v2.3.1149)

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

> **v2.3.3140: a login pays nothing now.** The owner found the chest window at
> login intrusive; the day's reward is the free spin at the Gambling Den
> (docs/specs/daily-rewards.md). This consumer keeps the login STREAK, now
> forgiving: a freeze every 7 days of streak (2 held at most) is spent
> automatically on a missed day. Record `{period, streak, fz, saved, best}`;
> `_cadenceLoginReward` returns it on a day's first login, else null. The
> paragraph below is the history.

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

## v2.3.3167: the jackpot weighs real tickets, and no player id is a built-in name

Found by the overnight economy review and reproduced on main. `jackpot:draw`'s
`entries` is a plain object keyed by player id, and the join refused only
`__proto__`, `constructor` and `prototype` as ids. For an id like `toString`
or `valueOf`, the inherited FUNCTION was the "previous" ticket count, so a
deposit stored `"function toString() { [native code] }1"`. At the draw the
total became a string and the roll NaN, so no entrant was ever reached, and
the week's FIRST depositor won the whole pool every time: 1 ticket against
400 won 40 of 40 draws. One alt with such an id was enough to hand a
partner, or itself, every honest depositor's gold each week.

- `_handleJackpotDeposit` adds to the depositor's OWN entry, as a number.
- `_jackpotMaybeResolve` weighs only entries that are a finite, positive
  number of tickets.
- join.js refuses every own name of `Object.prototype` as an id (`MAGIC_IDS`),
  not three of them. This backstops every other plain-object map keyed by
  player id. No real client makes such an id (they are `bp_<hash>` or
  legacy randoms), so the refusal is the same `join_rejected { reason:
  'auth' }` as before.

No price, odd or rule changed. Tests: `cadence.test.mjs` (the draw follows the
real tickets past a string count; a deposit stores a number) and
`identity.test.mjs` (six more names refused, four checks each). All fail on
main.
