# Card DG: the doors' guards hold against any spelling (steps 4.1, 4.3, 4.4; rule 8)

**Purpose:** a second way to change a guarded thing fails a test however it
is written, and a message's field is held to a form before any handler.
Today's code has one writer a door; the guards would not catch the next
slip.

**Acceptance (the review's plants, `tools/dev/plants/`,
`docs/plan/census/shape-doors.md`):** on 2026-11-23, 44 of 47 realistic
plants stayed GREEN. After this card every one is RED, or is listed in a
PR's words with why it cannot be. `tools/dev/plants/README.md` says how to
run them.

**Tags:** 6440 to 6459, one a PR, in order.
**Model and effort:** the strong model, high.
**Read:** `CLAUDE.md` section 5; `docs/plan/finish.md` parts 5 and 6 (they
bind you); `docs/ARCHITECTURE-HANDOFF.md`; `shape-doors.md`;
`shape-review.md` part 3, items 1, 2, 3, 8, 9;
`tools/guards/phase-table.test.mjs` (how it reads the syntax tree).
**You hold:** `server/test/*-door.test.mjs`, `server/test/testroom.mjs`,
`server/test/wire-*.test.mjs`, `tools/guards/action-door.test.mjs`, a new
`tools/guards/lib/writesOf.mjs`, `server/src/wire/door.js` and the rows of
`server/src/wire/in.js`, `server/src/send.js` (bytes), `server/src/relay.js`
and `index.js` only for item 6's three lines, `liveops.js` (one flag),
`join.js` (one cap, on a line of its own).
**Not yours:** `world-sum`, `storm`, `chaos-restart`, `claims-gain` (card
BK's); the scoreboard (card WL's).
**Browser:** none.

## PRs, in order

1. **(6440) The running room refuses.** In the shared test room
   (`testroom.mjs`), a player's record refuses a set or a delete of a
   guarded field (gold, health and the life phase, experience and level, the
   bag and its counts, the stashes, quest state, build points) unless a
   door is running. Every suite that plays a path then catches any spelling.
   No cost on the live worker: the hook is the test room's alone.
   Done when `plants1.json` (`Object.assign`, `||=`, a computed key, an
   alias, a destructure, `delete`, a receiver named `m`) goes red in a suite
   that plays the planted path, and the whole suite is green.
2. **(6441) The scans read the syntax tree.** One shared scanner for every
   "one door" test (gold, bag, stash, life, points, quest, experience, hit,
   session, send, the page's action door): a write is an assignment of any
   kind, a `delete`, `Object.assign` onto the record or its bag, a rebuilt
   copy put back, a destructured alias written through, a computed key; a
   call of a door's method counts in any position (`bind`, `call`, `const
   room = this`). The `'*'` rows of `bag-door` and `xp-door` name their
   files.
   Done when the door plants of `plants1.json` to `plants4.json` are red by
   the scan alone.
3. **(6442) Each road booked what it moved.** In `gold-door.test` and
   `bag-door.test`, every road in `GOLD_ROADS` and `BAG_ROADS` runs once on
   a blank record: the books moved exactly what the purse or the bag moved
   (mint, burn), or nothing (move, escrow).
   Done when `loot_gold` booking one less than it gives
   (`shape-books.md`, plant 1) and a `bind` double give (`plants4.json`,
   PAY2) are red.
4. **(6443) The wire door holds a field to a form.** A form for each kind
   of trust, and for a field where its row says more: a whole number of
   zero or more, an id of a known shape and length, one of a closed list,
   yes or no, words of a length. FIRST AS A COUNT: with the live flag
   `wireform: 'count'` the door counts what it would refuse and refuses
   nothing; over the whole suite and the storm the count is zero or each
   case is explained. Only then does it refuse (`wireform: false` is the
   old door). The three reads the table does not name get their rows
   (`player_attack` `dmgBase` and `critChance`, `move` `dead`,
   `trade2_cancel` `id`). Both protocol versions keep working.
   Done when `tools/dev/plants/judge.mjs` prints a refusal for `n` as
   `"5"`, `-5`, `1.5`, `true`, `{}`, `[1,2]` and for a 15,000-character
   id, and the phone scenarios `playable` and `mp-bank` are green.
5. **(6444) The hostile suite measures its reach.** The read-watcher the
   review used (`plants3.json`, REACH; `reach.mjs`) stays in the suite: a
   named field that no case ever reads fails unless its row is on a list
   "phase not reached" that only falls (104 today); a read of a field the
   row does not name fails.
6. **(6445) The gaps beside the doors**, each with its plant from
   `plants4.json` and `plants5.json`: a relay type allowed by hand beside
   the made list; a privileged type let through by hand; a route placed
   before the routes' door; `sessions.clear()` and a rebuilt `sessions`;
   `ws.send` through `bind`; `sendOutside` imported into a room's file; the
   send door counts bytes, not characters.

## Readings chosen for you

- A guard here reads the syntax tree or the running room, never a pattern
  of text (`finish.md` part 5, rule 2).
- Every PR touches `server/**`, so each merge deploys the worker. PRs 1, 2,
  3, 5 and 6 change no behaviour: the gatekeeper lists them together. PR 4
  is behaviour: a line of its own, in count mode first.
- PR 4 is a server behaviour: its cap on its own line in `join.js` and in
  `CAP_GATES`, its lower-case kill switch, its row in the switch table.
- A real second writer you find is Found, not fixed, unless it is one line
  and its door is yours to call; say which.
- Never raise a `cost-guard` line. The test room's hook writes nothing.
