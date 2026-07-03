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

---

# Addendum: Two-Sided Trade Window — v2.3.1132 (handoff item H)

The gift flow above is unchanged (old clients keep working). The real
trade window is a PARALLEL explicit command surface — deliberately not
an extension of the gift handshake — implemented in
`server/src/trade2.js` (session machine) + `TradeWindowPanel.jsx`
(a pure renderer of server truth). Tests: `server/test/trade2.test.mjs`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `trade2_open` | `{target}` | Mutual-open: A opens toward B (B gets `trade2_invite`); B opening back goes live. One live session per player. |
| c→s | `trade2_set` | `{offer: {itemKey: qty, _gold}}` | Replace YOUR side wholesale (gift sanitizer's shape). ANY change resets BOTH confirms — the anti-switch rule. |
| c→s | `trade2_confirm` | — | Both confirmed → validate BOTH sides at commit, debit both synchronously, credit both via `_creditPlayer` (opIds `trade2:<id>:<pid>:…`). Shortfall cancels with no partial application. |
| c→s | `trade2_cancel` | — | Either side; disconnect cancels too; idle sessions sweep after 5 min. |
| s→c | `trade2_invite` | `{from, fromName}` | Private to the target. |
| s→c | `trade2_state` | full session snapshot (+ `settled`/`reason` on terminal states) | Private to both on every change — the window renders only this. |

`trade2_state`/`trade2_invite` in PRIVILEGED_EVENTS; caps flag
`trade2` gates the InspectPlayerPanel Trade button (gift panel stays
as the old-worker fallback). All four commands are client
PRIORITY_EVENTS (no 33ms batch lag on window clicks).

## Scope + successor notes

- v1 trades inventory items + gold only. WEAPONS deliberately trade
  through the marketplace's escrowed listings (opaque-blob custody +
  stash-cap interactions are already solved there); adding a weapon
  lane here means escrow-at-stage, not validate-at-commit.
- Sessions are memory-only (nothing escrowed; a deploy voids open
  windows harmlessly).
- The atomicity argument: both debits run synchronously inside one
  input-gated event BEFORE any credit; credits are opId-idempotent.
