# Arena Sponsorship (server-settled stakes) — v2.3.1128

GDD §44: spectators stake gold on arena gladiators and get paid if
their pick wins the match. (Since v2.3.3177 the winners share the losers'
stakes -- a pool -- instead of 3× from the house; see Settlement.) Before this, "betting" was three different
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
| s→c | `arena_stake_result` | `{matchId, targetId, won, amount, payout}` | Private, on match resolution. `payout` = the stake back plus its share of the losing stakes on a win (v2.3.3177; was 3×amount), 0 on loss. |
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
- Escrow: opId `arenastake:<tid>:<mid>:<pid>`; record persisted before the
  ack.
- **The stake and its record are one write** (v2.3.4796). The stake was
  taken by `_escrowDebitGold` (the purse and its stamp, one write) and the
  `arena_stake:` record written after it, in a second: a restart between
  them (every merge touching `server/` restarts the room) kept the gold with
  no record for the sweep to refund -- 300 g staked, 300 g gone. Now the
  purse is checked, then the debit, its save, its stamp and the record go
  out in ONE synchronous run (`inbox.js` `_escrowDebitGoldTogether`, as the
  duel's start and the arena's entry, v2.3.3185), so the stake is placed or
  nothing moved; the rows are the same three. The stamp is no longer read
  first (written with its record, it never stands without one). The sponsor
  must be in the room (their live purse). Kill switch
  `arenastakeonewrite: false` in the live flags puts back the two writes.
  Tests: `sponsorship.test` §12 (a restart before every write). Found by the
  chaos suite (`chaos-restart.test`, its case `arena-stake-place`).

## Settlement

`_arenaOnMatchResolved` (fed exclusively by the duel machine — kills,
forfeits, walkovers, shot-clock timeouts) fire-and-forgets
`_arenaSettleStakes(tid, matchId, winnerId)`:

- **v2.3.3177: a pool.** Every stake on the match is counted once:
  `W` = the stakes on the winner, `L` = the stakes on the loser.
- Backed the winner → the stake back **plus a share of the losing
  stakes**, pro rata to the stake: `stake + floor((L - cut) × stake / W)`,
  credited via `_creditPlayer` (opId `arenastakewin:<tid>:<mid>:<pid>`,
  offline-safe mail).
- The winning competitor gets `cut = floor(L × ARENA.FIGHTER_CUT)` (10%)
  plus the coins the rounding left over (opId `arenastakecut:<tid>:<mid>`),
  so exactly `W + L` is paid out.
- Backed the loser → nothing back. Each losing stake is **stamped**
  `arenastakeloss:<tid>:<mid>:<pid>` (`_opStamp`) before any winner is paid,
  so the sweep can never refund a stake a winner was paid from.
- Nobody backed the winner (`W = 0`) → every losing stake goes to the
  winning competitor whole (opId `arenastakeloss:<tid>:<mid>:<pid>`), as
  before v2.3.3177.
- Records deleted after the stamps; a crash in between cannot double-pay
  (every credit is opId-idempotent and the sweep checks both stamps before
  refunding). A crash part-way costs a payout, never makes one twice.
- **v2.3.5089: the settlement is a plan** (grand plan card E, PR 8c). Before
  a coin moves, the whole settlement (every leg: to whom, how much, its
  opId) is written as ONE record, `arena_settle:<tid>:<mid>`, in the same
  run as the losers' stamps; the stake records are not touched. Then each
  leg pays (`_creditPlayer`, the same opIds as above), and the stakes and
  the plan are deleted in one run. A restart before the plan: the sweep
  refunds every stake. After it: the sweep finishes the plan
  (`_arenaStakeFinish`), each leg once, never a refund; a winner a
  rolled-back worker refunded is paid only the share after. A plan the
  sweep cannot read is kept, with its stakes, for the owner, and pays
  nothing at all (not even its good legs). The oplog prune waits while a
  plan is open (`_arenaSettleWait`, asked by the tick's housekeeping slot
  beside the General Store's and the Auction House's): a plan found after
  48 h would otherwise read its paid legs as unpaid. The cost: TWO rows a
  match more than the old order, the plan's put and its delete (the puts:
  5 → 6 in a 1 v 1, 10 → 11 at 3 v 2, 32 → 33 at 10 v 10; `cost-guard`
  §17). **Off until the owner says yes** (the gatekeeper's sitting 10):
  `arenasettleplan: true` in the live flags turns it on; off, the old order
  runs, its hole included. A plan on file is finished either way. Tests:
  `arena-settle.test`.

Examples (FIGHTER_CUT 10%): 1,000 on the winner, 1,000 on the loser → the
winning backer gets 1,900, the fighter 100. Two backers of the winner at
500 each, 3,000 on the loser → 1,850 each, the fighter 300. Everyone on
the winner → each gets their stake back, nothing more.

**Economics:** no gold is minted. Before v2.3.3177 a won stake paid 3×
from the house and a lost one went to the winning fighter, so betting the
same amount on both sides of any match made the backers +stake and the
winner +stake whoever won (about +10,000 a match with four accounts), and
backing the winner of a match your own accounts fought made 2× per
backer. A pool moves gold only between the people who staked: a hedge
gets back what it put in less the fighter's cut, and a fixed match only
returns the stakes (a fixer can still win honest backers' stakes, as in
any pool, but can no longer make gold). The only faucet left in the arena is the
champion prize. The bet panel already said "Payout: pot split among
winners"; the result toast shows the server's `payout`.

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
