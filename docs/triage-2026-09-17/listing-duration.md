# The seller chooses how long a listing runs

v2.3.2619. Companion page to the PR, because GitHub's PR-body API mangles
markdown image syntax and these are pictures.

---

## What you asked for

> "Longest listing a week, shortest is 1 day."

Every listing used to run for exactly 24 hours, hardcoded. Now the sell sheet
has a **Listing duration** dropdown, and the server holds the listing for as
long as you picked.

![The sell sheet, 390 portrait](assets/listing-duration/390-portrait-sheet.webp)

![The sell sheet, 360 portrait](assets/listing-duration/360-portrait-sheet.webp)

---

## The options I chose, and why

Your mockup's dropdown showed "24 hours", so that is the first entry and the
default. The other four fill out the range you set:

| Option | |
|---|---|
| **24 hours** | the default — exactly what every listing used to get |
| **2 days** | |
| **3 days** | |
| **5 days** | |
| **7 days (max)** | your ceiling |

Five is enough to be useful and few enough to read on a phone without the sheet
growing. **These five are a screen decision, not a server one** — the server
only checks "between 1 and 7 days", so a different set can be offered later
without touching the server at all.

The line under the dropdown updates as you pick: *"It leaves your bag now and
comes back in 7 days if nobody buys it."*

And the shelf no longer claims everything lasts a day. Each row already shows
its own clock (from PR #678); the footer now says sellers choose, 1 to 7 days.

---

## The server decides, not the app

The duration is a number the app sends, and **anything the app sends is a
claim, not a fact**. This is the rule the marketplace code already has written
down from an earlier incident, so this follows it:

- The server checks the number against **its own** 1-day and 7-day bounds. It
  does not trust the dropdown, and it would refuse a 30-day listing even if a
  modified copy of the game asked for one.
- A bad duration is **refused, not quietly shortened.** Silently giving someone
  24 hours when they asked for a week would mean their sword comes back six
  days early with nothing to explain it. They get a sentence instead: *"Listings
  run from 1 day to 7 days."*
- The check runs **before anything leaves the bag**, so a refused listing costs
  the seller nothing.

Worth knowing what the old server did with these: it **accepted all of them** —
a month, one hour, `abc`, even infinity — ignored the number, escrowed the
goods, and made a 24-hour listing. That is what the new tests fail on when run
against it.

## Old and new versions of the game keep working together

The dropdown only appears once the server has said it can handle the choice.
Against an older server the sheet just says 24 hours, which is what that server
would actually do — so it can never promise something that will not happen.
Going the other way, an older app sends no duration and gets the same 24 hours
it always got. Either half can be updated first.

---

## Expiry still works, with mixed lifetimes

Two things had to be checked rather than assumed, because listings no longer
share one lifetime:

1. **The expiry sweep.** Listings used to all expire in the order they were
   made. They do not any more — a week-long listing made on Monday outlives a
   day-long one made on Friday. There is a test for exactly that: a 7-day
   listing created *first* must survive a sweep that clears a 1-day listing
   created *after* it. It does.

2. **Server restarts.** When the server wakes up it rebuilds its list of
   listings from storage. The expiry time was always stored per listing rather
   than recalculated, so this already worked — but "it happens to work today" is
   how it quietly stops working, so there is now a test that a 7-day listing is
   still a 7-day listing after a restart, and is not swept early.

---

## Testing

- **Server:** 14 new cases in `server/test/market.test.mjs` §S5c — the default,
  both ends of the range, refusals above and below, nonsense values, that a
  refused listing escrows nothing, the mixed-lifetime sweep, and the restart.
  `cd server && npm test` — **all pass**. Run against the previous server, the
  new cases **fail**, as they should.
- **Through the screen:** `tools/qa/mp/mp-listduration.mjs` — picks 7 days in
  the real sheet with a real tap, lists the item, then **reads it back out of
  the server** and measures what the server is actually holding. A dropdown that
  changed a number on screen and sent nothing would pass everything else; this is
  the check that would catch it. **36 checks, 36 passed**, plus 2 honest skips —
  see below.
- `node tools/dev/precheck.mjs` — 0 FAIL.

### The 2 skips: you still cannot list an item sideways

The sell sheet's **Put it up** button sits below the bottom of the screen in
landscape, and the panel it is in does not scroll — so there is no way to reach
it with a thumb. Measured in a 390-tall landscape screen:

| | "Put it up" button top |
|---|---|
| without this PR's duration row | 484px (94px off-screen) |
| with it | 526px (136px off-screen) |

So **it was already unreachable, and this row makes it 42px worse.** It does not
change the outcome — you could not finish a listing sideways before this PR and
you cannot now — but it is honest to say the row did not help.

Here is what it looks like; the sheet simply runs off the bottom:

![The sell sheet in landscape, cut off](assets/listing-duration/390-landscape-sheet.webp)

The dropdown itself is fine at that size — it is the sheet's height that is
wrong. This is the same problem already flagged in PR #678 ("you can't list an
item while holding the phone sideways"), now measured. It needs its own fix: the
sheet's container wants to scroll, which touches the whole item popup, and that
is too much to change inside a PR about durations.

The tests say so out loud rather than quietly testing something easier.
