# Card WHO: who acted, and the sitting's card (steps 10.1 and 11.2 as code, 10.2, 10.8)

**Purpose:** rule 9 of the plan: records that cannot be made up later start
first. Today no row says who acted, the owner's test play is mixed into the
day's book and the ledger, and the one real player is not measured at all.
Steps 10.1 and 11.2 are ticked as shapes on paper: `actor`, `stint` and
`principal` appear in no line of `server/src`
(`docs/plan/census/shape-books.md`, question 5).

**Tags:** 6480 to 6499, one a PR, in order.
**Model and effort:** the strong model, high.
**Read:** `CLAUDE.md` section 5; `docs/plan/finish.md` parts 5 and 6 (they
bind you); `docs/ARCHITECTURE-HANDOFF.md` (rules 2, 5, 7, 10: it is the
law here); `docs/SHAPES.md`, the actor's section and part 2 (the shape is
designed there, once: build that, add no twin); steps 10.2 and 10.8 of
`docs/GRAND-PLAN.md`; `server/src/xfer.js`, `daybook.js`, `testmode.js`,
`report.js` (the integrity facts it already sends for the sitting's card).
**You hold:** a new `server/src/actor.js` and `sitting.js`, `join.js` and
`leave.js` (the lines that make and close them), `xfer.js` and `daybook.js`
(one key each), `storagemarks.js`, the registry table in
`ARCHITECTURE-HANDOFF.md`, `docs/SHAPES.md` (marks only: NEW becomes
TODAY), their suites, `liveops.js` (flags), `join.js`'s caps (lines of
their own).
**Browser:** light (`playable` and one join on a phone test).

## PRs, in order

1. **(6480) The actor, made once.** As `docs/SHAPES.md` says: `kind`,
   `pid`, `stint`, `wayIn` (`principal` and `permit` stay empty), made at
   the three ways in and changed by nothing. The sitting's id (`stint`) is
   the server's own, made at the join. A `qa` is known only by proof the
   server holds, never by a field a phone sends: use what proof exists
   today; if none does, leave `qa` unbuilt, say so, and ask. Test mode
   marks a character, not a hand: its play stays a `person`'s, and the
   record's test mode is written beside the kind, so the owner's test play
   can be told apart for ever after.
   It is written under one key on rows that are written already: an `xfer:`
   row's "who started it", and the day's book's parts split by it. No new
   row, no new put.
   Done when a trade made in test mode leaves an `xfer:` row that says so,
   the day's book adds test play apart from play, `cost-guard` is
   unchanged, and with the flag `actor: false` every row is as today.
2. **(6481) The sitting's card (10.2).** About 120 bytes: when, how long,
   active seconds, the longest gap, the network, the build; moves and moves
   over budget; hits claimed, landed, refused by reason; gold by road
   class; the hours of the day played. Its counters ride a save that is
   already paced; a card cut short by a deploy is closed at the next join;
   an account keeps its last 32 (the owner's yes, call 13 of the plan).
   Done when a sitting played in the shared room, cut by a restart halfway,
   leaves one closed card with the right sums, and `cost-guard` shows no
   new write a move and no new row a sitting beyond the record's own save.
3. **(6482) The owner's play is the first human record (10.8; the owner's
   yes, call 13).** The first ten active minutes of a sitting, one row,
   labelled human. Test mode runs the honesty checks in shadow and records
   "would refuse" (a new honesty check's three lists: `testmode.js`'s
   header, its spec, `test-mode` section 8).
   Done when the league's replay (`npm run league`, rung 4) reads such a
   row as a person's.

## Readings chosen for you

- A new storage key goes in the registry (precheck `storage-keys`), gets
  its marks, and its place in `RESTORE_WAYS`. A stored record whose shape
  changes bumps its shape number, and the gatekeeper lists that PR alone.
- A new server behaviour: a cap the page gates on (its own line), a
  lower-case kill switch, a row in the switch table.
- Writes cost money: never a write a move, never a timer of its own. A
  `cost-guard` line is never raised; if the card cannot be built under
  them, stop and ask (it is the owner's).
- What a player sees does not change in this card. The About panel's words
  on what is kept are the owner's: draft them in your status file.
- Card DG is in `join.js`'s caps and the wire table beside you: a line of
  your own in each.
