# Server-Settled Gambling (v2.3.1124) — spec + attach points

Wave 2 PR8. The Gamble Hall roll is now rolled and settled by the server.

## The hole this closes

`GamblePanel.jsx` rolled `Math.random() < GAMBLE_WIN_CHANCE` **on the
player's own machine** and credited the 2× payout locally. Like the other
Wave-2 targets this was phantom (the authoritative `player_state` echo
stomped it), but it meant the Gamble Hall did nothing real — and any
future settlement wired onto a client roll would have been a solo
infinite-gold faucet.

## How it works now

- Client sends `gamble_request {wager}` (its own server case — not the
  relay branch).
- Server: gates on dying/dead/disconnected; `Math.floor(wager)` must be
  10..10,000 and ≤ coins; in-memory rate limit 1 roll / 2s
  (`ps._lastGambleAt` — deliberately NOT in the rpg-blob field list, so
  it never persists); rolls `GAMBLE_WIN_CHANCE = 0.40` server-side;
  settles in **one mutation** — `ps.coins += won ? wager : -wager`, one
  `_saveRpg`, one flush. No escrow, no opId: single input-gated event on
  live state, no crash window (ARCHITECTURE-HANDOFF rule 8); a resent
  request is legitimately a new roll, bounded by the rate limit.
- Private `gamble_result {won, wager, payout}` — in `PRIVILEGED_EVENTS`
  (clients can't forge win popups at each other).
- `caps.gamble` in `state_sync`; the panel's legacy local roll runs only
  against workers without the flag. Deploy either side first, safely.

Invalid requests (bad wager, broke, rate-limited, dead) are ignored
silently — the panel's own client-side gates prevent legitimate players
from ever hitting them.

## Wire surface

| Message | Direction | Payload |
|---|---|---|
| `gamble_request` | c→s | `{wager}` int 10..10,000 |
| `gamble_result` | s→c (private) | `{won, wager, payout}` — payout is 2× wager on win, 0 on loss |
| `state_sync.caps` | s→c | gains `gamble: true` |

## Deliberately deferred (design notes in ARCHITECTURE-HANDOFF backlog)

- ~~**Weekly jackpot**~~ — SHIPPED v2.3.1149 on the cadence framework
  (see docs/specs/cadence.md): server-settled `jackpot_deposit`,
  escrow-at-placement `jackpot:draw` record, lazy ISO-week draw via the
  `jackpotwin:<period>` opId, ticket-weighted single winner, offline
  winners paid through the inbox. GamblePanel is caps-gated
  (`caps.jackpot`); the local stub survives only against old workers.
- **Commit-reveal fairness**: server-trust is proportionate at this
  scale; a `nonce` + published daily seed hash is the cheap upgrade if
  ever wanted.

## Tests

`server/test/gamble.test.mjs` (~9 assertions, in `npm test`): caps,
forced win/loss deltas + payout reporting, wager clamps,
insufficient-funds and dead-player ignores, 2s rate limit, forged
`gamble_result` dropped by the deny-list.
