# Inbox/Mail + Escrow Primitives (v2.3.1117) — spec + attach points

PR2 of the heavy-systems architecture plan. The settlement plumbing every
economy system builds on: the marketplace (PR3), trade sessions (PR4), and
duel wagers (PR6) credit and debit players through these GameRoom methods
instead of trusting the client to pay itself. This also delivers the GDD's
never-designed "mail" system as a side effect: anything a player earns
while offline is waiting for them at the next join.

## Storage layout

All separate storage keys — never inside the rpg blob (`_saveRpg` rewrites
the blob from a fixed field list and drops foreign fields):

| Key | Value |
|---|---|
| `inbox:<playerId>` | array of pending credit entries |
| `oplog:<opId>` | timestamp; idempotency journal, lazily pruned after 48h |

Inbox entry: `{ opId, ts, source, kind, payload, note }` where `kind` is
`'gold'` (`payload {amount}`), `'item'` (`payload {invKey, count}`), or
`'weapon'` (`payload {weapon}` — opaque blob, re-sanitized on apply).

## Server API (GameRoom methods, `server/src/index.js`)

- `await _creditPlayer(playerId, entry)` → `'delivered' | 'inboxed' | 'dup'`
  Online → applied to live playerState immediately + `inbox_delivered`
  notification. Offline (or online with a full weapon stash) → parked in
  the inbox. Duplicate `opId` → no-op.
- `await _escrowDebitGold(playerId, amount, opId)` → `{ok, dup?, reason?}`
- `await _escrowTakeItem(playerId, invKey, count, opId)` → same shape.
  Both validate-and-take in one gated event: live playerState when online
  (storage lags it), the stored blob directly when offline. Duplicate
  `opId` returns `{ok: true, dup: true}` so settlement retries converge.
- `_drainInbox(playerId, ws)` — called automatically in the join handler
  after the rpg load and **before** `state_sync`, so the first snapshot
  the client renders already includes the mail.

Rules encoded (don't regress these):

- **opId discipline**: settlement callers pass deterministic ids, e.g.
  `refund:<orderId>`, `settle:<matchId>:seller` — that's what makes a
  crash-retry safe.
- **Stash-cap partial drain**: weapon deliveries that don't fit under
  `WEAPON_STASH_CAP` stay queued (`_saveRpg` truncates the stash at cap —
  pushing past it would silently destroy the weapon). The client is told
  via `payload.queued`.
- **Soft cap 200 with lossless merge**: at cap, gold amounts and item
  counts merge into existing same-kind entries; weapons still append
  (producers are capped per player upstream).
- **No cross-DO await between validation and commit** — every method here
  only awaits storage ops, which close the DO's input gate.

## Wire surface (for future UI)

| Message | Direction | Payload |
|---|---|---|
| `inbox_delivered` | s→c | `{ entries: [{kind, payload, note, source}], queued }` |

`inbox_delivered` is in `PRIVILEGED_EVENTS` (clients can't forge it). The
credits themselves ride the authoritative `player_state` echo; the event
only drives "you received X" UI. Current placeholder UI: system chat
messages (`gameEvents.js`, case `'inbox_delivered'`). A future mail panel
replaces that case — nothing server-side changes.

## Tests

`server/test/inbox.test.mjs` (18 assertions, in `npm test`): online
credit + notification, opId idempotency, offline park + join drain +
key cleanup + drain-before-state_sync ordering, weapon partial drain at
stash cap, escrow validation failures, live vs stored-blob mutation,
duplicate-debit convergence, cap merge.
