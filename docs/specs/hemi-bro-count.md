# The Hemi Bro checkmark and count (v2.3.3255)

> Owner, 2026-10-14: *"I also want a 'verified' checkmark for people who own 1
> hemi bro or more. It would be cool to list the number of hemi bros owned
> somewhere on their profile. I don't know the best way to do this but
> probably a wallet that holds the hemi bros sending a message to a contract?
> I don't even know if this is built yet. But again, small surface area."*

## What was already there (v2.3.1576)

The Info panel had "Verify Hemi Bro #N" for a player wearing a Hemi Bro as
their avatar. The wallet signs a free message (no transaction, no gas), the
server recovers the signer through the chain's own `ecrecover` and asks the
collection `ownerOf(N)`. A match put the owner's verified badge in that
player's name plate for 24 hours.

Two gaps:

- **It proved one Bro, the one worn,** and said nothing about how many.
- **Nobody else ever saw the badge.** The server put `bro` on every player in
  every tick; the phone never read it. Only your own plate showed it.

## What it does now

- **"Verify my Hemi Bros"** (Info panel), against a server with
  `caps.broCount`. The same free signature, and one more read of the
  collection: `balanceOf(wallet)`, how many Bros that wallet holds. The worn
  Bro (if any) is checked along the way; not holding it is no longer a failure.
- **The checkmark** (the owner's verified badge, in the name plate and on the
  profile) shows for a wallet holding **1 or more**, or a verified worn Bro.
- **The count** shows on the profile beside the achievement points ("3 Hemi
  Bros", gold), in the player list ("✓ 3 Hemi Bros"), and on the Info panel's
  button ("✓ 3 Hemi Bros · check again").
- **Everyone sees everyone's**: the tick's `bro` and new `brn` are read for
  every player in view.
- **A wallet holding none** is linked at 0 and says so ("This wallet holds no
  Hemi Bros."), with no checkmark.

## Small surface, by design

- **No contract, no transaction, no key.** "A wallet sending a message to a
  contract" is not needed: a signature proves the wallet without touching the
  chain, and the server only READS the collection, which already exists.
  Nothing new is deployed, and nothing the game holds can move anyone's Bros
  or money.
- **The server decides, the phone renders.** `bro` and `broN` are written only
  by `broverify.js`, never taken from a phone (not in `TRACK_COSMETIC_KEYS` or
  `JOIN_COSMETIC_KEYS`); `bro_verify_result` is a server-only message.
- **Fails closed.** A count the chain will not give (an outage, a revert, an
  answer bigger than the collection could hold) grants nothing and writes
  nothing.
- **One chain read per 5 seconds a socket** (`BRO_VERIFY_GAP_MS`): a verify
  costs the server two or three RPC calls.

## Staying true

- **Sign once.** The wallet's address is stored with the count
  (`bro_link:<pid>` `{address, ts, count, tokenId?}`).
- **Read again, never re-sign.** A link older than a day is read again in the
  background when its player joins (`_broRefresh`): the join never waits, the
  checkmark comes back when the chain answers, and a Bro sold drops off within
  a day. Two joins at once read once.
- **A player who buys another** taps "check again" (the button stays
  pressable once verified).

## Known limits

- **Moving a Bro between wallets** can verify each for up to a day. It's a
  cosmetic, so the daily re-read is enough.
- **One wallet, any number of characters.** v2.3.3490: the supporter pass
  no longer uses wallets as accounts (each character pays into an address of
  its own, docs/SUPPORTER-PASS-PLAN.md), so no wallet cap comes with it.
- **ERC-721 assumed.** If the collection were ERC-1155, `balanceOf(address)`
  reverts and nobody is granted anything. It has answered `ownerOf` since
  v2.3.1576, so ERC-721 is very likely. This sandbox cannot reach Hemi to
  check, so verify it on a deployed server.

## Kill switch and deploy order

- **Order.** The phone offers the wallet check only against a server
  advertising `caps.broCount`; an older server refuses a verify with no token
  id. An old phone sends the old shape, which is unchanged.
- **Kill switch.** `broCount: false` in the live flags un-advertises it, and
  the phone falls back to the worn-Bro check. Stored counts keep showing.

## Tests

- `server/test/broverify.test.mjs` (96 checks):
  - the wallet check, the worn Bro, a wallet holding none, no count, the shape
    checks, the rate limit;
  - the join restore and the background re-read: sold, outage, two at once, a
    player gone;
  - the wire and the trust boundary;
  - the phone's own rules (`broCountOf`, `broBadgeOf`, `peerEntrySlim`,
    `broCountSupported`).
- `server/test/onchain.test.mjs`: `balanceOf` (the selector, the encoding,
  every refusal) and `verifyBroWallet`.
- `tools/qa/mp/mp-brobadge.mjs`:
  - the badge from a number, as the server sends it;
  - a count of 3 with no worn Bro: the plate's checkmark, and "3 Hemi Bros" on
    the profile;
  - none: neither.
