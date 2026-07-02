# Server-Settled Trades (v2.3.1119) — spec + attach points

PR4 of the heavy-systems architecture plan. Player-to-player trades are
now settled by the GameRoom — the duplication engine is dead.

## The hole this closes

The old flow duplicated goods on every trade: `trade_offer` /
`trade_accept` were blind relays; the recipient minted the offer into
their own inventory on Accept (`IncomingTradePanel.jsx`), the sender's
accept-echo handler minted the offer items AGAIN (`gameEvents.js`), and
the sender was never debited.

## How it works now

Same wire handshake (offer → accept/reject), but the GameRoom intercepts
the relay (`server/src/trade.js`, mixed into the class like market.js):

- **`trade_offer`** — sanitized (quantities clamped, ≤20 item keys, gold
  ≤999,999) and snapshotted server-side, 2-minute TTL. Nothing is
  escrowed: validate-at-commit is sufficient because the commit runs as
  one gated DO event. A deploy wipe just voids un-accepted offers.
- **`trade_accept`** — valid only against a live offer from the *other*
  side's own session (same forge-proofing as the PvP consent pairs).
  The sender's goods are validated **at commit** (they may have spent
  them since offering — the classic trade-window scam), debited
  synchronously, and credited to the accepter through `_creditPlayer`
  (PR2). The relayed accept gains `settled: true`.
- An accept with **no matching live offer is dropped**, not relayed —
  relaying would trigger the legacy mint on the other side (the forgery
  this kills). Replays find nothing (single-shot offers).
- Validation failure → `trade_reject` to the accepter ("Trade declined"
  in the existing UI), no transfer.

## Capability flag (deploy-order safety)

`state_sync` now carries `caps: { trade: true }`. Clients store it
(`S._serverCaps`) and skip their legacy self-credit paths only when the
server has claimed settlement:

- `IncomingTradePanel.jsx` Accept: skips the local mint when
  `S._serverCaps.trade` (the credit arrives via `_creditPlayer` →
  `inbox_delivered` + player_state echo).
- `gameEvents.js` `trade_accept` (sender side): skips the item mint when
  `payload.settled`.
- Old client + new worker double-applies locally, but coins and
  inventory are echoed in `player_state` and adopted, so the
  authoritative value overwrites. Old worker + new client: no `caps`,
  legacy paths run — behavior unchanged. Either side ships first.

Use `caps` for future WS-flow capabilities (PR5 quests uses it too);
use per-response `settled` for HTTP flows (PR3 marketplace pattern).

## Wire surface (for future UI)

| Message | Direction | Payload |
|---|---|---|
| `trade_offer` | c→relay | `{ from, fromName, target, offer: {itemKey: qty, ..., _gold} }` (relayed sanitized) |
| `trade_accept` | c→relay | `{ from, target }` — relayed with `settled: true` after server settlement |
| `trade_reject` | c→relay / s→c | `{ from, target }` — also server-emitted on failed validation |
| `state_sync.caps` | s→c | `{ trade: true }` |

The current UI is one-directional (a gift: only the sender offers).
A future two-sided trade window should NOT extend this handshake —
build it as a proper trade-session state machine (both stage, both
confirm, commit) using this module's validate-at-commit core; the spec
skeleton is in the plan's Pillar C notes.

## Tests

`server/test/trade.test.mjs` (12 assertions, in `npm test`): exact
single transfer + settled annotation, replay/forge drops, spent-goods
reject, expiry, sanitization clamps, sender-disconnect reject.
