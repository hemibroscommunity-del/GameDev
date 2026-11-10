# Marketplace Settlement (v2.3.1118) — spec + attach points

PR3 of the heavy-systems architecture plan. The auction house is now
**server-settled with escrow at placement** — the first real producer of
the PR2 inbox/escrow plumbing (`docs/specs/inbox-escrow.md`).

## What changed and why

The old flow was free item duplication: the global Marketplace DO trusted
the request body (any `item` blob, no ownership check), a match just
deleted the resting order, and the **client paid itself**
(`ExchangePanel.jsx` credited gold/items locally after the HTTP call).
With the owner-directed single shared room, the order book now lives
**inside the GameRoom** (`server/src/market.js`, mixed into the class in
`index.js`), so escrow and settlement are synchronous mutations of the
same player state the room already owns:

- **Sell** — the weapon leaves the seller's stash at listing time, taken
  from the *server's* stash copy by `stashIndex` (the request's `item`
  field is ignored; a forged blob buys nothing).
- **Buy** — the bid gold leaves the buyer's coins at placement.
- **Match** — resting order sets the price; seller is paid, buyer gets
  the weapon, taker-buy price improvement is refunded. All credits go
  through `_creditPlayer`, so an **offline counterparty is paid via the
  inbox** (mail at next join).
- **Cancel / 24h expiry** — escrow refunded via `_creditPlayer` with
  `opId: 'refund:<orderId>'`, so a cancel racing the expiry sweep pays
  exactly once. (The old sweep *deleted* sell orders without refunding.)
- Placement requires being connected to the room (`Not in game`
  otherwise) — escrow always mutates live playerState.
- **Crash ordering (v2.3.1184)** — every settlement path is
  credit-first, delete-last (rule 6; `_duelEscrowSweep` shape): match
  stamps `settle:<makerId>:item|:gold|:diff` on the *persisted* maker
  record before deleting it (item leg first — it's the irreplaceable
  half); cancel/expiry refund before deleting. `_mktRefund` never pays
  over a stamped settlement, and `_mktEnsureIndex` converges crash
  leftovers: a record whose settle/refund stamp exists is deleted on
  rebuild, never re-listed. Before this, a deploy landing between the
  record delete and the credits destroyed both sides' escrow
  unrecoverably (and the old taker-UUID opIds were underivable from
  any surviving record, so no sweep could ever have been written).

Owner decisions encoded: 24h listings (GDD §39 said both 1h and 48h),
bounty boards deferred, self-trades excluded (matcher skips same-player
orders, so they can't execute or enter price history).

## Wire surface (for future UI)

Routed by the worker to the `brotown-1` GameRoom (endpoint URLs unchanged
from the old DO):

| Endpoint | Method | Notes |
|---|---|---|
| `/api/market/place` | POST | body as before **plus `stashIndex`** (required for sells; `item` ignored). Response adds `settled: true`. |
| `/api/market/cancel?id&playerId` | DELETE | response adds `settled: true`; refund arrives via player_state echo or inbox |
| `/api/market/orders?category&subtype&tier` | GET | unchanged |
| `/api/market/my?playerId` | GET | unchanged |
| `/api/market/history?category&subtype&tier[&element1&element2]` | GET | **new**: `{history: [{p, ts}], avg, last}` — last 50 executions, for price-guidance UI |

**`settled: true` is the deploy-order safety flag**: the client keeps its
legacy self-credit path but only runs it when the response *lacks* the
flag (old worker). New worker + old client is also safe — old clients
self-credit AND the server settles, but the authoritative
`player_state` echo overwrites the client's local values, so the server's
answer wins. Reuse this flag pattern for trades (PR4) and quests (PR5).

Storage: `mkt_order:<id>`, `mkt_hist:<indexKey>` in GameRoom storage.
The old Marketplace DO class remains exported (wrangler binding) but is
no longer routed; its stale orders are abandoned (prototype throwaways).

## Tests

`server/test/market.test.mjs` (19 assertions, in `npm test`): stash-index
escrow + forged-blob immunity, gold escrow + insufficient/offline
rejects, both settlement legs + price improvement, offline-counterparty
inbox payment, idempotent cancel/expiry refunds, expiry-refunds-not-
deletes, self-order skip, price history, order cap.

## The phone's Place tap: one at a time, no old pick (v2.3.4369)

The state-machine sweep (2026-11-03, V8a P1-7). The General Store's "List for
Sale" / "Place Buy Order" button (`ExchangePanel.jsx`) had no 'busy' lock, and
the weapon to sell is remembered by its PLACE in the stash (BroTown's
`mktSellItem`, sent as `stashIndex`). A double tap posted twice: the worker
escrowed the picked weapon, then whatever slid into that place, and filed both
under the first weapon's type and tier, sold at once if a resting buy fit (a
buy's double tap escrowed the gold twice). The pick was cleared only on an
"ok", so after a refusal, a "Server error!" or a close and reopen the old chip
was still lit over a changed bag, and the next tap listed another weapon under
its name.

- **One tap at a time**: `src/game/storeSellTap.js` `claimPlace(S)` /
  `releasePlace(S)`. The lock is on the game state, not the panel, so a close
  and reopen while the answer is out does not open a second door. It is
  released on every answer, the fetch's own error included.
- **No old pick**: a sell's pick is cleared on every answer (ok, refusal,
  error), and the window clears it when it opens.
- **No timeout, on purpose.** A timeout read as a refusal makes players list
  twice (the v2.3.2507 double listing). A later change adds one that ends in
  "not sure, check My orders" with the button still locked, and a guard so a
  late answer touches only the card it was sent from.
- **Interim** (review R2): both are phone patches until the worker names a
  sold weapon by its id, not its place. A modified page still can (the known
  open hole).
- Test: `server/test/store-sell-tap.test.mjs` runs the real panel with a stub
  React and fetch (6 of its 14 checks fail on the v2.3.4354 panel).
- **The trap**: never key a sale by a stash place across an await, and never
  leave a pick lit past its answer: the bag under it moves.
