# A join takes only what is its own (v2.3.5730)

Card K2 PR 11, from card RV's review (`docs/plan/census/RV-review.md`, #2072):
ACC-1, ACC-2, SEC-F1 and ACC-3. A switch, `joinguard`, **ON**: decided for
the owner while away by the planning session, on the owner's words of
2026-11-17: *"Go recommended on all."* `joinguard: false` turns it off.

S2's join half (avatar and colour held to their form in
`_sanitizeJoinData`) waits for RV's `lookform.js` and comes after it.

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

## Tests

`join-guard.test` (11 FAIL on main). Two older checks read the old way with
the switch off: `joinid.test` 2 (a join with no id) and `seat-hold.test` 6
(one socket a seat).

## Switch

On unless `joinguard: false` in the live flags. Thrown, all four are as
before.
