# Escrowed offers on a listing (v2.3.2623)

Owner: *"I like the idea of escrow so when they offer they're actually putting
up gold so that way the [seller] can accept on the spot."*

A buyer names a number in a listing's thread, **their gold is taken there and
then**, and the seller's "Accept" completes the sale immediately — goods to the
buyer, escrowed gold to the seller — with no second trip through Bid or Buy.

Module: `server/src/storeoffer.js`. Suite: `server/test/storeoffer.test.mjs`.
Scenario: `tools/qa/mp/mp-listingoffer.mjs`. UI: `StoreChatPanel.jsx`.

---

## An offer is a private, per-buyer bid, and is built as one

Bidding already escrows gold, already settles, and has a suite pinning it. A
second parallel gold path beside it is how two systems come to disagree about
who owns which coins, so every money move here is the bid's move renamed:

| | |
|---|---|
| escrow | `_escrowDebitGold(buyer, gold, 'store:<id>:offer:<seq>')` |
| refund | `_creditPlayer(buyer, opId 'store:<id>:offerref:<seq>')` |
| settle | `_stSettle()` — unchanged, the same one Buy and Accept-Bid use |

### "Can the escrow carry N holders per listing?" — yes, and it already does

This was the open question before building. `store.js`'s header says a listing
has *"at most one live bid"*, and that turns out to be a property of the
**record shape** (`rec.topBid` is a single object), not of the escrow.

`_escrowDebitGold` (`inbox.js`) is generic and opId-idempotent, and the **arena
is the worked precedent**: N players each escrow an entry fee against one
tournament under `arena:<tid>:entry:<pid>`, each individually refundable
(`_arenaRefundEntry`). So offers needed a bounded map on the record and **no new
settlement machinery** — which is why this is ~340 lines and not a rewrite.

## The double-spend case is closed by construction

The likeliest real bug in a feature like this is the same gold committed twice —
a buyer with a live bid *and* an offer, or offers on several listings. It cannot
happen: **`_escrowDebitGold` debits the coins.** A buyer holding 100g who offers
100g has 0g, and the next offer is refused for want of gold exactly as a second
bid would be. There is no parallel "committed" ledger to drift out of step with
the purse, because **the purse is the ledger**.

## Every ending funnels through two paths that already existed

- `_stSettle` — every sale: buy-now, accepted bid, accepted offer.
- `_stRelease` — every non-sale: cancel, expiry, crash release.

`_soReleaseAll` is called from both, with `rec.sale.offerSeq` naming the offer
whose escrow *was* the payment so it is not also refunded — exactly the guard
`paidBidSeq` gives the standing bid. There is deliberately **no third exit**, so
"the listing ended and somebody's gold stayed locked" has one place to be wrong
instead of six.

## Bounds

| | |
|---|---|
| `MAX_PER_LISTING` | 5 offers on one listing |
| `OFFER_EXPIRY` | 48h — **shorter than the listing's week** |
| `MIN` / max | 1 … `STORE.MAX_PRICE`, refused not clamped |
| `BURST` / `REFILL_MS` | 3, then one every 4s — harder than chat |

**Offers expire sooner than the listing** so gold is not locked for a week by a
seller who never answered. 48h survives a seller's weekend and is not a week-long
loan. Expiry is lazy, on the store's existing sweep (rule 12, no alarms), bounded
by the same pass.

## The replies

Enumerated, never free text — `OFFER_REPLIES = ['yes', 'think', 'no']`; the
client renders the words from the id.

- **Accept `<n>`g** — settles on the spot. The button names the amount because a
  one-tap control that completes a sale must not read like small talk.
- **I'll think about it** — **the escrow stays held.** If thinking released it,
  the reply would mean nothing: the seller would be saying "maybe" to an offer
  that no longer exists. The honest cost is that a buyer's gold stays tied up on
  a non-answer until they withdraw or 48h passes. The buyer can always withdraw;
  that is what makes the hold fair.
- **No** — refunds immediately.
- *"What's your offer?"* is an ordinary chat line, not a reply id: it moves no
  money, so it is not in the server's reply list.

## Storage

**No new key.** Offers live on `store_listing:<id>` as `rec.offers` (a map keyed
by buyer id, null-proto in memory per rule 4), so the wake-time rebuild that
already recovers the listing recovers them, and a listing cannot exist without
its offers or the reverse. `rec.pendOffer` is the in-flight marker, converged on
wake exactly as `rec.pendBid` is: promote iff the debit stamp is present, drop
otherwise, because then no money moved.

## Wire surface

| Type | Direction | Payload |
|---|---|---|
| `store_offer` | client → server | `{listingId, gold}` |
| `store_offer_cancel` | client → server | `{listingId}` |
| `store_offer_reply` | client → server | `{listingId, buyerId, reply}` |
| `store_offer_state` | server → client | `{listingId, offers[], sold?}` |
| `store_offer_error` | server → client | `{listingId, error}` |

Both server-emitted types are in `PRIVILEGED_EVENTS`: unlisted, a client could
forge a state showing a seller gold that was never escrowed, or a fake acceptance
on a buyer's screen. `store_dm_thread` also carries `offers` — **opening the
thread is the authoritative read**, because a seller whose panel was shut when an
offer landed never receives the live event (found by `mp-listingoffer`).

Deploy order: `caps.storeOffer`, narrow and mandatory. An older worker has no case
for `store_offer`, so it would fall through to the default branch and be
rebroadcast as chatter — the buyer sees "sent", no gold moves, no seller can
accept. A money control that silently does nothing is worse than an absent one.

## The testing bar

Every branch the brief listed, plus two properties:

- **No double spend** — a buyer with N gold cannot be committed for more than N.
- **Conservation** — total gold in the world (purses + live escrow + undelivered
  mail) is unchanged across offer→accept, →decline, →withdraw, →offer-expiry and
  →listing-expiry. The suite declares every coin it injects itself, including a
  freshly joined character's 25g starting purse, so the final assertion is exact
  rather than approximately right.
