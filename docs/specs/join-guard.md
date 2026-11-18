# A join takes only what is its own (v2.3.5730)

Card K2 PR 11, from card RV's review (`docs/plan/census/RV-review.md`, #2072):
ACC-1, ACC-2, SEC-F1 and ACC-3. A switch, `joinguard`, **ON**: decided for
the owner while away by the planning session, on the owner's words of
2026-11-17: *"Go recommended on all."* `joinguard: false` turns it off.

S2's join half (avatar and colour held to their form) came after RV's
`lookform.js`, with its own switch: see "A join's colour and avatar" below.

## What it does

- **SEC-F1: a join with no id is refused.** It was let in as
  `session.id` undefined: one body and one `cadence:login:undefined` row
  shared by every such join. Every phone of the game sends its id, so the
  join gets the malformed id's answer (`join_rejected` `auth`, close 4003),
  and nothing is written (join.js `joinIdMalformed`).
- **ACC-1: a key registers only an id with nothing behind it.** Two cases
  are refused with `key`, never `auth` (TRAPS §209: `auth` makes a phone
  throw its key away):
  - any id a keyless session is playing now;
  - a guest's id (not `bp_`; a guest's id is base-36 random) with a record
    on file.

  Before, a stranger with a key of its own took the guest's record and its
  socket ("superseded by reconnect"), and then the guest's own rejoin was
  refused `auth`. An honest phone's key names its own `bp_` id, made from
  that key. A seeded `bp_` record with no key (a character from before
  keys, or the suites' seeding) still registers as before
  (`_joinGuardTaken`).
- **ACC-2: a guest's join makes no `char:` row.** A guest has no key and no
  record of one. A made-up `bp_` id with no key wrote a `char:` row, kept
  for good.
- **ACC-3: a claim on a held seat passes to the newest socket naming it**
  (seathold.js `_seatGate`), when the socket holding the claim has not
  joined. An id is public, so a socket that named a held seat and never
  joined kept the holder out until the hold ran out, and could knock again
  for it. The old socket is a stranger's from then on. The holder's own
  join still comes in on its held id, whichever socket it is on.

Nothing new is written or sent: each refusal is one a phone already reads.

## Left open (sitting 44's review of #2103)

- **A keyless stranger playing a `bp_` record with no key.** The seeded
  `bp_` record above registers "as before" only while nobody plays it. If
  a keyless join is playing that id, the rightful keyed join is refused
  `key`, and the stranger stays until it leaves. A `bp_` record with no
  key is a character from before keys (or a suite's seed); none is known
  in play.
- **A keyless join naming an online guest's id still replaces the
  guest**, as before. A guest has no key, so there is nothing to tell the
  two apart; ACC-1 stops only the takeover by a key, which then locked the
  guest out.
- **ACC-3's claim, with `seathold` on.** With one socket a seat gone, one
  public held id named on many sockets can fill every held slot until
  those sockets are swept at the join window. `seathold` is off in
  production.
- **ACC-2, a keyless `bp_` join with an old `char:` row.** Since it makes
  no `char:` row, it no longer reads one either, so a stored name and look
  are not applied to a keyless join. A keyed join reads it as before.

## Tests

`join-guard.test` (11 FAIL on main). Two older checks read the old way with
the switch off: `joinid.test` 2 (a join with no id) and `seat-hold.test` 6
(one socket a seat).

## Switch

On unless `joinguard: false` in the live flags. Thrown, all four are as
before.

## A join's colour and avatar, held to their forms (v2.3.5733, `lookjoin`)

Card K2 PR 14: card RV's S2, the join's half. RV's `lookform.js` (#2112)
says why. A player's `color` and `avatar` were any text, cut to length,
sent to every phone and drawn as a CSS colour and an `<img>`, so a player
could make every phone that drew them fetch from a server of theirs.

A switch, `lookjoin`, **ON**: decided for the owner while away by the
planning session, on the owner's words of 2026-11-17: *"Go recommended on
all."* `lookjoin: false` turns it off.

- In `_sanitizeJoinData`, a join's `color` must be a hex colour (`#rgb` to
  `#rrggbbaa`, `lookColor`), and its `avatar` the page's own proxied
  address (`https://wsrv.nl/?url=...`, `lookAvatar`, src/networking/index.js
  `wsrvUrl`). A value off its form is dropped, as a missing one is.
- An empty value is left as it was.
- A character record's stored look is held to the same forms when it is
  laid over the join. A bad stored avatar or colour is not drawn; the
  phone's own, if it is good, stays.

An honest page never sends another form. The `track` relay's half is RV's
(`lookStamp`, index.js).

`join-lookform.test` holds it (6 FAIL on main).

