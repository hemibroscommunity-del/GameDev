# Making an offer, with the gold actually put up

v2.3.2623. Companion page to the PR, because GitHub's PR-body API mangles
markdown image syntax and these are pictures.

---

## What you asked for

> "the seller can have a few different replies. Like yes, I'll think about it,
> no, what's your offer? Then the buyer can type in a number that they're
> willing to pay in gold"

> "I like the idea of escrow so when they offer they're actually putting up gold
> so that way the [seller] can accept on the spot"

Both, exactly as described.

### The buyer's side

![The buyer offering](assets/listing-offers/390-buyer.webp)

Type a number, press **Offer**, and **your gold leaves your purse right then.**
The panel says it is being held, and gives you a **Take it back** button.

### The seller's side

![The seller answering](assets/listing-offers/390-seller.webp)

*Lyria offers 400g*, with your three answers: **Accept 400g**,
**I'll think about it**, **No**. Accepting sells the item on the spot — the
goods go to her, her 400 gold comes to you, and the listing leaves the shelf.

The Accept button names the amount rather than just saying "Yes", because a
one-tap button that completes a sale shouldn't read like small talk.

*"What's your offer?"* is there too, as an ordinary chat line — it doesn't move
any money, so it isn't one of the three answers.

---

## The safety, in plain terms

This is the first thing in this batch that moves real gold on its own, so here
is what stops it going wrong.

**Nobody can spend the same gold twice.** This was the most likely real bug.
It can't happen, because offering *takes the coins immediately*. Someone holding
100 gold who offers 100 has nothing left, so a second offer is refused for
exactly the same reason a second bid would be. There's no separate list of
"committed" gold that could drift out of step with what's actually in the purse —
**the purse is the list.**

**Every way a listing can end gives the gold back.** Sold to someone else,
bought outright, taken down, expired, or the server restarting mid-sale — all of
them run through the same two pieces of code that already handled returning a
losing bid. There is deliberately no third exit, so "the listing ended and my
gold is still gone" has one place to be wrong instead of six.

**An offer can't be left hanging forever.** It expires after **two days** — much
sooner than the listing's week — and the gold comes back on its own. Long enough
to survive a seller's weekend, short enough that ignoring an offer isn't a
week-long loan of someone else's money.

**"I'll think about it" keeps the gold held**, deliberately. If it released the
gold, the reply would mean nothing — you'd be saying "maybe" to an offer that no
longer exists. The honest cost is that a buyer's gold is tied up while you think.
They can always take it back, which is what makes that fair.

**A listing holds five offers at once**, and a buyer can only have one on each
listing (making a new one refunds the old first, so raising your offer never
needs you to hold both amounts).

---

## How it was built, and why it stayed small

The big question before starting was whether the existing escrow could hold
several people's gold against one listing — the store's own notes say a listing
has *"at most one live bid"*.

It turned out that limit is in how a **listing record is shaped**, not in the
money machinery. The arena already holds entry fees from many players against one
tournament, each refundable on its own. So offers reuse the bidding code's exact
escrow, refund and settlement steps under a different name, and needed **no new
money-handling code at all.** That's why this is one module rather than a rewrite
of the store.

---

## Testing

This is settlement, so the bar was higher than the rest of this work.

- **Server:** a new suite, `server/test/storeoffer.test.mjs` — every branch you
  listed: can't afford it, the same gold twice, the seller accepting two offers,
  the listing selling or expiring underneath standing offers, the seller ignoring
  it, the buyer withdrawing, declining, "I'll think about it", buy-it-now over
  offers, and the server restarting mid-escrow. Plus two properties:
  - **no double spend** — a buyer with N gold can never be committed for more;
  - **conservation** — the total gold in the world is unchanged across accept,
    decline, withdraw, offer-expiry and listing-expiry.

  `cd server && npm test` — all pass.

- **Through the screen:** `tools/qa/mp/mp-listingoffer.mjs` — **32 checks, 32
  passed**, two real players against one real server at 360 and 390. It reads the
  **buyer's purse and the seller's purse off their own running clients** after
  the accept, because a panel that drew an optimistic "sold!" would pass
  everything else.

- `node tools/dev/precheck.mjs` — 0 FAIL.

### A real bug the two-client test caught

A seller whose chat panel was **shut** when an offer arrived opened it and was
told *"Nobody has asked about this listing yet"* — while the buyer's gold sat
escrowed against their listing. The offers were only ever delivered as a live
event, so anyone not already looking never learned of them.

Opening the thread is now the authoritative read, with the live event as the
update — which is how every other field on that screen already worked. A
single-client test could not have found this.

Full design notes: `docs/specs/store-offers.md`.
