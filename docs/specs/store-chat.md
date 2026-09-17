# Store chat — talking about one listing (v2.3.2621)

Owner: *"Add the direct message feature (little chat icon)"*, on the
marketplace mockup where the icon sits **on a listing** and opens a thread
**about that listing** — the item as a header, the listing's own expiry, the
bubbles, three canned replies and a 200-character composer.

Module: `server/src/storechat.js` (mixed into GameRoom beside `store.js`).
Panel: `src/ui/panels/buildings/StoreChatPanel.jsx`, opened from a row in
`StorePanel.jsx`. Bus: `src/ui/mobile/storeChatBus.js`.
Suite: `server/test/storechat.test.mjs`. Scenario: `tools/qa/mp/mp-listingdm.mjs`.

---

## Why this is not another chat lane

`chatlanes.js` already whispers to any player in the room and `friends.js`
already DMs a friend. Neither can express **"about THIS sword"**, which is the
whole point: the buyer wants to haggle over one pile of goods and the seller
wants to know which listing is being asked about. So a thread is keyed by the
**listing**, not by the pair of players.

The shape is otherwise deliberately `friends.js`'s `friend_dm`, because that
handler already encodes the four things this needs: own validated case (never
the room rebroadcast), sender stamped from the session, text clamped before
trim, and moderation on the way through.

## The mockup shows one thread. The reality is N.

A listing has one seller and any number of interested buyers, so the seller
actually holds **one conversation per buyer** on that listing. That is what is
stored, and the seller's panel grows a row of name chips to pick between them.
A buyer sees only their own, which is why the mockup is not wrong — it is drawn
from the buyer's side.

## Storage

| Key | Value |
|---|---|
| `store_thread:<listingId>` | `{t: {<buyerId>: [{f, n, x, ts}, ...]}, at}` |

`f` sender id, `n` sender name at the time, `x` text, `ts` stamp.

**One key per listing, not one per conversation.** The obvious
`store_thread:<listingId>:<buyerId>` is worse three ways: `MAX_GLOBAL` is 2000
listings, so that is up to `2000 × THREADS_MAX` keys to create, find and delete
where this is 2000; the seller's own view wants *every* conversation on their
listing, which is one read here and `THREADS_MAX` reads there — and a storage
await holds the room's input gate for its whole duration (handoff rule 9's
second edge); and cleanup is one delete instead of a prefix walk.

### Bounds

| | |
|---|---|
| `TEXT_MAX` | 200 — the mockup's own `0/200`, and `CHAT_LANES.TEXT_MAX` |
| `MSGS_MAX` | 20 per conversation, oldest dropped |
| `THREADS_MAX` | 5 conversations per listing |
| `BURST` / `REFILL_MS` | 5, then one more every 2s |

Worst case one key is ~24KB (well inside the 128KB value limit) and the whole
system ~46MB at full saturation of every listing in the game, which no real
shelf approaches.

## What happens when the listing ends

**The thread goes with it.** A thread is scoped to a listing by definition, so
a sold or expired listing has nothing left to be about — and keeping dead
threads would need its own sweep to stop them accumulating forever, which is a
second unbounded prefix and exactly what rule 9 warns about.

Deleted at every point a listing ends (buy-now, accepted bid, cancel, expiry,
crash-convergence), and deleted **before** the listing record: a crash between
the two then leaves a listing whose thread is empty — which heals itself — rather
than a thread nothing will ever delete.

## Wire surface

| Type | Direction | Payload |
|---|---|---|
| `store_dm_open` | client → server | `{listingId}` |
| `store_dm` | client → server | `{listingId, text, to?}` — `to` only from the seller, naming which conversation |
| `store_dm_thread` | server → client | `{listingId, amSeller, item, askPrice, expiresAt, sellerId, sellerName, threads:[{buyerId, buyerName, msgs}]}` or `{listingId, gone:true}` |
| `store_dm` | server → client | `{listingId, buyerId, msg:{from, fromName, text, ts}}` |
| `store_dm_error` | server → client | `{listingId, reason}` — `too-fast`, `gone`, `no-thread`, `too-many` |

All three server-emitted types are in `PRIVILEGED_EVENTS` (rule 13). Unlisted, a
client could forge a line from a seller, hand a buyer a whole fabricated
conversation, or fake a refusal to make a real seller look unreachable.

## Trust boundary

- **Sender stamped from the session.** The payload's `from`/`fromName` are
  ignored entirely; the suite sends `from: 'FORGED'` and asserts the stored
  sender is the session's.
- **A seller cannot start a conversation.** `to` must name a thread that already
  exists, so a seller cannot open one with a player who never asked, and `to`
  can never mint a thread.
- **Clamp before trim**, so padding cannot smuggle a tail past `TEXT_MAX` — the
  order `party.js` settled on.
- **Its own rate limit.** These are explicit router cases, so the default
  branch's relay token bucket never sees them — the hole v2.3.1970 found in
  `party_invite`. Its own bucket rather than `chatlanes`': a shared one would
  mean haggling over a sword spent the allowance for asking for help.
- **Null-proto / Map** for every id-keyed map (CLAUDE.md rule 4), and
  `'__proto__'` is rejected as a listing id or a buyer id.

## Moderation

Every line goes through `_chatModRemember` **before any delivery decision**, so
an abuse report quotes the server's own copy and never the reporter's claim
(chatmod.js, v2.3.1981). Delivery checks `_chatModMuted` on the **recipient** and
drops rather than storing a backlog — a mute that still filled your inbox for
next login would be a mute in name only.

The line is still **stored** when delivery is muted: the thread is the seller's
record of the haggle either way, and a mute is about what reaches a screen.

## Canned replies

`STORE_CHAT_QUICK` (server) / `QUICK` (panel) — *"Still available?"*, *"Would you
take less?"*, *"I have a question"*. They travel as **ordinary text** through the
same clamp and the same moderation as anything typed. Treating a canned reply as
trusted would make it the one lane worth forging.

## Deploy order (rule 19)

`caps.storeChat`, narrow and **mandatory**. An older worker has no case for
either type, so both would fall through to its **default branch and be
rebroadcast to the whole room** — a private haggle over a sword shouted at
everybody, the same worst case `chatlanes.js` argues about for `/w`. So the icon
must not exist to be tapped against such a worker. Against a new worker an old
client simply never shows it.

## Known limits, deliberately

- **A thread is not a notification system.** A buyer whose seller is offline
  sees their own line and waits; there is no push and no offline backlog like
  `friend_msg:`. The thread *is* the backlog — it is read when the listing is
  opened — so nothing is lost, but nothing arrives unprompted either.
- **`THREADS_MAX` is a real refusal.** The sixth buyer to ask about one listing
  is told the listing already has as many conversations as it can hold. That is
  a deliberate bound, not a bug; raising it raises the storage ceiling with it.
- **Threads die with the listing**, so there is no history after a sale. If the
  owner wants a receipt trail that outlives the sale, that is a different
  feature with a different storage shape and its own sweep.
