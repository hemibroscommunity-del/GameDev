# The value pause (v2.3.5090, grand plan card E PR 9; v2.3.5094)

When the storage refuses a save, what the room holds in memory is no longer
what is written: a restart puts back the last save, and a trade made then
could land half written and happen twice. So **for one minute after the
storage refuses a save**, every action that hands gold or goods to another
player, or into a held place, refuses at its start with the owner's words:

> Saving is paused for a moment, try again.

Every payout keeps working: rewards, loot, the vault's withdrawal, mail
landing, refunds, shops (the owner's "Go recommended", option 1). At worst a
payout made in the minute is lost to a restart, never doubled.

Code: `server/src/valuepause.js` (its header is the full account);
`server/test/valuepause.test.mjs`.

## What starts it, and what ends it

- **The count is card A's**: `_savesRefused()` (`server/src/roomrow.js`),
  read and never counted a second time. The minute starts at the last
  refused put.
- **A refused put of ANY record starts it**, a player's, the day's book, a
  market order's, and it pauses **every** player's value roads, not only the
  refused record's owner. **Each refusal starts the minute again**: a
  storage that keeps refusing keeps the roads paused. Card A's count does not
  say which record was refused. Narrowing the pause to the records that hold
  value is a design change, left for the owner.
- A character a newer server saved, refused at its join, is that player's
  own refusal and does not pause the room.
- **The way out**: `valuepause: false` in the live flags (nothing pauses).

## The actions that wait (14)

The trade window's Accept; a gift's accept; a duel's accept with a stake;
the vault's deposit; an arena sponsorship; the arena's join (its fee); a
jackpot ticket; a General Store order; the Auction House's list, buy, bid
and offer; an item dropped on the ground; a spare weapon staged into the
trade window (v2.3.5094).

Each is refused through its own system's refusal (the table
`VALUE_PAUSE`, the answers `PAUSE_REFUSE`), and nothing it would have moved
moves. The HTTP routes answer `{ok: false, settled: true, error}` with the
owner's words and no `reason` (a `reason` was read by the Auction House's
popup as a gear refusal, "That piece cannot be sold": sitting 11).

## After the minute

- **The trade window** stays open: the same Accept settles.
- **A gift's or a duel's card closes** on the refusal (the phone closes it):
  the giver offers again, or the challenger challenges again. The server
  keeps the offer and the challenge until they run out, so a second press
  of a card still open would settle.
- Everything else is simply pressed again.

## The checks

`valuepause.test`: the pause from card A's count; every gold or bag road of
class `move` or `escrow` either waits or is exempt with why; every router
case that stages into the trade window waits; every row has its line; the
14 actions played under a refused save (nothing moves, each answered); no
payout refuses in the pause; the switch; the phone's words.
