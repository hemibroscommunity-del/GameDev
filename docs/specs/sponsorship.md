# Arena Sponsorship (server-settled stakes) — v2.3.1128

GDD §44: spectators stake gold on arena gladiators and get paid 3× if
their pick wins the match. Before this, "betting" was three different
client-minted payout paths in PartyPanel (tournament pot-split,
champion 2×, per-match 1.8×) — all phantom (the player_state echo
stomps the coins) but a live exploit the moment anything trusted them.
Stakes now escrow at placement and settle **only off the
server-observed match result** (the duel outcome that
`_arenaOnMatchResolved` receives). The legacy `arena_bet` relay
remains cosmetic display and settles nothing — the danger note from
handoff item A is load-bearing: never key a payout off it.

Server code: `server/src/gladiator.js` (`_handleArenaSponsor`,
`_arenaSettleStakes`, `_arenaStakeSweep`). Tests:
`server/test/sponsorship.test.mjs`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `arena_sponsor` | `{targetId, amount, matchId?}` | Explicit case. `matchId` optional — the open current-round match containing `targetId` is resolved server-side (the round-bet UI picks a player, not a match). |
| s→c | `arena_stake_placed` | `{matchId, targetId, targetName, amount}` | Private ack; gold already escrowed. |
| s→c | `arena_stake_result` | `{matchId, targetId, won, amount, payout}` | Private, on match resolution. `payout` = 3×amount on win, 0 on loss. |
| s→c | `arena_stake_error` | `{code, message}` | Codes: `no-tournament`, `no-match`, `bad-target`, `own-match`, `bad-amount`, `already-staked`, `no-gold`. |

All three server-emitted types are in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.sponsor` — gates the three PartyPanel self-mint
payout blocks (legacy fallback for old workers) and switches the
round-bet form to send `arena_sponsor`.

## Rules

- Amount clamped 10..5000 (`ARENA.STAKE_MIN/MAX`, mirrors client
  `ARENA_BET_MIN/MAX`).
- One stake per sponsor per match (`arena_stake:<tid>:<mid>:<pid>`
  storage key IS the uniqueness check).
- Competitors cannot sponsor their own match. Sponsors may be anyone
  else in the room, including gladiators in *other* matches.
- Escrow: `_escrowDebitGold` opId `arenastake:<tid>:<mid>:<pid>`;
  record persisted before the ack.

## Settlement

`_arenaOnMatchResolved` (fed exclusively by the duel machine — kills,
forfeits, walkovers, shot-clock timeouts) fire-and-forgets
`_arenaSettleStakes(tid, matchId, winnerId)`:

- Backed the winner → sponsor credited `3× amount` via `_creditPlayer`
  (opId `arenastakewin:<tid>:<mid>:<pid>`, offline-safe mail).
- Backed the loser → the stake amount is credited to the **winning
  competitor** (opId `arenastakeloss:<tid>:<mid>:<pid>`), not the house.
- Records deleted after the opId stamp; a crash in between cannot
  double-pay (the sweep checks both stamps before refunding).

**Economics (flagged deliberately):** a won stake mints 2× the stake
from the house on top of returning it (GDD §44 number). Combined with
the 2000g champion pot this keeps the arena a net gold faucet at
prototype scale — tune `ARENA.STAKE_MULT` to change it.

## Sweep

`_arenaStakeSweep` (kicked from the join path beside
`_arenaEntrySweep`, 5-min rate limit): stakes older than
`STALE_STAKE_MS` whose tournament is gone are refunded via
`_creditPlayer` (opId `arenastakerefund:…`) **unless** their win/loss
opId is already stamped — then the record is just deleted. A deploy
mid-tournament voids stakes exactly like entries.

## Wire-shape regression fixed here

PR10's `_arenaWire` only partially matched the old Arena DO's
`sanitizeTournament` contract: it said `status: 'running'` where the
client gates on `'active'`, emitted `playerId/playerName` where the
betting UI reads `id/name/level/color`, and lacked
`recentMatches[].winnerId` / `champion.id` — so the entire
spectator-betting surface silently rendered nothing against the new
worker. `_arenaWire` now emits a **superset** of both shapes; keep it
that way (readers of both generations exist in PartyPanel).

## Attach points for successors

- **Tournament-champion blind bets** (the pot-split and 2× UIs) have
  no server backbone — they'd need a `champion_stake` pool keyed by
  tournament with pot-split settlement in `_arenaCrown`. The UIs are
  caps-gated off; build the pool before re-enabling them.
- **Stake visibility**: stakes are private today. A privileged
  `arena_stake_board` broadcast (or folding totals into `_arenaWire`)
  would let spectators see the action; keep amounts server-summed.
