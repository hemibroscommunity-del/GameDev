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

## Writes that must commit together (v2.3.3185)

A Durable Object commits every write made in one synchronous run as one
batch; an `await` between two writes splits them, and a restart (every
server merge restarts the room) can land between the batches. Two places
split writes that only make sense together, and a restart between them LOST
a player's gold (never doubled it), found by the overnight economy review
(decision 10):

- **The mail drain** (`_drainInbox`) rewrote or deleted the mailbox, awaited,
  and saved the player after: a restart between them took the mail away with
  its gold or goods never saved. Saving the player first would be no better
  (the mail would pay again). Both are now issued in one run.
- **A duel's stakes** (duel.js accept): a's stake, b's stake and the
  `duelEscrow:` record were three writes, and the restart sweep refunds only
  what a record names, so a stake taken before the record was gone. They now
  go through `_escrowDebitGoldTogether(debits, puts)`: every purse checked
  first, then every debit, its save, its oplog stamp and the caller's records
  in one run, for players who are online. (An arena entry's debit and its
  `arena_entry:` record are written the same way, in gladiator.js.)

Tests: `inbox.test.mjs` §8b and `duel.test.mjs` §7b run the flow on a storage
that commits by batch and crash it at EVERY batch in turn, restart on what
was written, and require the exact amounts (the mail's 500 delivered once;
both duellists back to their 100 after the sweep).

Still open, and noted rather than changed: `_creditPlayer` stamps its opId
before it applies the credit, so a restart between them loses that payout;
moving the stamp after the credit would let a retry pay twice, which is
worse. And two records (market orders, clan wars) rely on oplog stamps that
are pruned after 48 hours.

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

## v2.3.3165: an escrow's stamp and its debit are one write

`_escrowDebitGold` and `_escrowTakeItem` wrote the oplog stamp first,
awaited, and saved the debit after it, in the next batch. A worker restart
between the two (every merge touching `server/**` restarts the room) left
"paid" in the oplog with nothing taken. The auction house's wake-time
rebuild takes that stamp as proof of payment (store.js: a buy-now's
`store:<id>:pay`, a bid's `store:<id>:bid:<seq>`, an offer's
`store:<id>:offer:<seq>`), so it settled sales nobody paid for. In the
overnight economy review's simulated restart, a 900-gold buy settled while the
buyer kept all 1,000, and an outbid refund paid back 500 that was never taken.
The window is about a millisecond wide and only a restart opens it, but every
merge brings one.

Now the debit's own save and the stamp are issued in ONE synchronous run:
both puts go out before any await, so they commit together (rule 8). Either
both land, or neither does and the retry debits as if for the first time. A
retry of a stamped payment is still `{ ok: true, dup: true }` and takes
nothing more. The callers (duel wagers, the arena's entry fee and stakes,
the auction house's listing escrow, buy-now, bids and offers) are unchanged.

Tests: `inbox.test.mjs`, the last section (5 checks). Its storage "crashes"
the instant the stamp is written: online and offline, gold and items, the
debit is already durable. All 5 fail on main.
