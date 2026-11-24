# The shape review of 2026-11-23: is what was built what the plan meant? (v2.3.6400)

The owner, 2026-11-23: *"review the work in accordance with the plan to make
sure it's the correct shape because I've been using less intelligent models
to do the work."*

Six reviewers on the top model each took one part of the finished work on
`main` 0aec6482 and tried to break it: they planted the fault a guard exists
to stop, written the way a tired programmer would write it, and ran the
guard. Node only, no browser. Their evidence, command by command:
`shape-doors.md`, `shape-books.md`, `shape-walls.md`, `shape-smooth.md`,
`shape-cost.md` (this folder); the plants themselves, to run again:
`tools/dev/plants/`. The controls' map is `controls-map.md`.

A verdict is one of: **HOLDS** (a plant went red), **WEAK** (true today, and
a named spelling walks past), **WRONG SHAPE** (ticked, and its purpose is not
what the code does), **PAPER** (a table or a document with nothing behind it).

## 1. The short of it

- **Today's code is in the state the plan wanted on the server.** No way to
  cheat was found. One writer a door is true now; settlements and their
  ledger rows are one write; the judges are real limits.
- **The guards are weaker than the code they guard.** Rule 8 (a finish line
  has a break proof) was met for the spelling each guard was written
  against. Of 47 realistic plants on the server's doors, 44 passed the
  door's own suite. The next slip by a session would not be caught.
- **On the page, the plan built instruments and fences, not walls.** The
  big file is the size it was. The frame's "steps" are timing marks; 97% of
  the loop is one step named `legacy`.
- **Nothing about smoothness was confirmed on a real phone.** The page-hold
  fixes are real. The governor, on a model that heats with the work done,
  only ever halves the frame rate, and see-saws.
- **Working here got dearer.** The suite went from 69 s to 979 s (one guard
  is 894 s of it); every push pays about 22 minutes of GitHub's time.
- **The gate checked the letter.** In 50 sittings the rehearsal never found
  a failing test; its holds were merge conflicts. A review against the
  card's "done when" passes a card whose "done when" is a table.

## 2. What holds (leave it alone)

| What | Proof |
|---|---|
| The phase table: 37 state machines, one writer each (5.3b) | a plain second writer on the page and on the worker went red twice |
| A settlement and its ledger row are one write (rule 5, 10.3) | a row awaited after the swap: red (`xfer` 3, `trade-onewrite`); a market cross with no row: red |
| The judges of four claims (4.2): move, sword, harvest, bow | read as code: each recomputes or limits on the worker |
| The send door (4.1b) | census strict and at zero; a planted `ws.send` red |
| The lists made from the wire table | a router case, a sent type, a route with no row: each red |
| The debt list's fixes (3.1) | nine of twelve families fixed by a worker or by slices, each with a sample; no line raised |
| Memory saved (pillar 9) | lines down 35.8 MB net, readings down about 35 |
| The device asked in one place; one controller of "late" (2.1, rule 6) | two `userAgent` reads left, both harmless; `setRung` has one writer |
| The switch table's rows (7.1) | 12 of 619 read: each specific, none a default |

## 3. What does not, ranked, with its card

### The server (cards DG, BK, WHO)

1. **WRONG SHAPE: the wire door does not hold a field to a form (4.1).**
   `wire/door.js:244-249` refuses only a non-finite number and, for `words`,
   a non-string or over 2,000 characters: 34 of 756 fields. `bank_deposit`
   with `n` as `"5"`, `-5`, `1.5`, `true`, `{}`, `[1,2]` is let in
   (`tools/dev/plants/judge.mjs`); the handlers clamp, the door does not.
   Nothing ties a row's `trust` to the code: a planted read of an unnamed
   field, and a row's fields cut, left four suites green. Three real reads
   are unnamed: `player_attack` `dmgBase` and `critChance`
   (`combat.js:2445`), `move` `dead` (`movement.js:996`), `trade2_cancel`
   `id` (`trade2.js:571`). **Card DG.**
2. **WEAK: the seven value doors' tests are patterns of text.** `Object.assign`,
   `||=`, a computed key, a destructured alias, `delete`, a receiver named
   `m`, `const room = this`, a `bind`: each walked past gold, health, bag,
   experience, quest, points or stash (`plants1.json`: 22 of 22). **Card DG**
   (the running room refuses; the scans read the syntax tree).
3. **WEAK: the whole world's sum plays six systems (4.4).** Bank, gamble,
   the shop, the trade window, mail, a death pile. Not the market, the
   Auction House, offers, the jackpot, pets, farm, harvest, cook, forge, a
   weapon's sale, a quest's hand-in, loot gold. A road that books one less
   than it gives (`loot_gold`) left 16 suites green. **Cards DG** (each road
   booked what it moved) **and BK** (the sum plays what it sums).
4. **WEAK: "losses the restart test knows of: 0" is an empty list (4.5).**
   Six paths are restarted. A jackpot deposit whose save was removed doubles
   the gold after a restart: 19 suites green. **Card BK.**
5. **WRONG SHAPE: the 1.5 bar is gated at up to 1.98 (4.2).** The gate is
   `gain <= LINES + SPREAD`. The sword's reach reads 1.43 to 1.92 by seed,
   mean about 1.55; the default seed is the lowest of six. The recorded
   break proof (`CLAIMS_PLANT=reach`) no longer fails. **Card BK.**
6. **PAPER: the actor and the sitting's id (10.1, 11.2, ticked).** `actor`,
   `stint`, `principal` appear in no line of `server/src`. The owner's test
   play is mixed into the day's book and the ledger and cannot be told apart
   later (rule 9). **Card WHO.**
7. **PAPER: the roads table's `fee`, `hold`, `pace` (10.5).** All zero and
   read by nothing: turning one up would change nothing. **Card BK** (marked
   "not wired").
8. **WRONG SHAPE: the hostile suite's reach (4.1 step 2).** Of 306 named
   fields, the run read 202: for 104 the hostile value met no line that
   reads it; 18 rows had no named field read. **Card DG.**
9. Smaller, **card DG**: a relay type allowed by hand beside the made list;
   a route placed before the routes' door; `sessions.clear()`; `ws.send`
   through `bind`; the send door counts characters, the plan says bytes; the
   page's action door misses `S.channel?.send(...)` and an aliased channel.

### The page (cards WL, CT)

10. **WRONG SHAPE: the frame as named steps (5.4, ticked).** The steps are
    `_steps.begin/to/end` marks around 16 calls that already existed; no
    step says what it reads or writes; `legacy` is 1,531 of the loop's 1,573
    code lines. Its gain is real and small: ms a step, and which step threw.
    **Z** splits the box (the instrument done; "legacy falls" open); **card
    CT** makes the first real step (input).
11. **PAPER: state "with owners" (5.3).** 2,252 rows; the owner is "the file
    that sets it most", made by machine; a second writer is recorded by
    making the ledger again, not refused. 186 of 641 fields decided, 42
    enforced. **Card WL** (an `OWNED` set with no way out).
12. **WRONG SHAPE: tests find code by system (5.2b, ticked).** `findIn` is
    the same pattern over a system's files; 222 suite and file pairs, none
    converted in ten days; 237 of 518 suites read the page's source by path.
    A planted "dying takes 10% of your gold" passed `phone-death` 4c
    (`!/coins\s*=/` does not read `-=`). **Card WL** (4c, and a true count);
    converting the pairs is not worth its cost wholesale: a feature converts
    its own slice.
13. **WEAK: the four lines (5.1).** A working ratchet with three holes: two
    statements on one line; the two renderers' lines never lowered after
    cards EN and FX (982 and 445 lines of room); functions under 1,000 lines
    free to grow. **Z** lowers the two lines; **card WL** the count.
14. **WEAK: the leaves (5.5).** Real, and the easy 8%: an import from
    `systems/` and module state planted in a leaf was caught only by luck.
    **Card WL.**
15. **OPEN and uncounted: `window._gameState` (5.7).** 96 code lines in 53
    files under `src/` read it; nothing counts them. **Card WL** (a falling
    census).

### Smooth on a phone (card PH)

16. **WRONG SHAPE: the governor (2.3, ticked).** Its proof heats the phone
    by the clock. With heat driven by the work done
    (`tools/dev/plants/govsim.mjs`, 11 one-hour runs), the only rung taken
    was the rate: a 60 Hz phone 5% too slow when hot spent 74 to 83% of the
    hour at 30, with 10 to 14 rate changes in its last half hour. The heat
    numbers are invented, as the suite's are: the phone must say.
17. **WRONG SHAPE: the governor's memory rung cannot fire.** Its triggers
    are two of the test box's lines (art 79.3 against 11 to 16 read).
18. **WRONG SHAPE: the memory check has 152 MB of room and no total.** Its
    lines sum to 365.7 MB, the readings to about 216; the phone dies near
    250.
19. **WEAK: the heap line follows `main`** (raised six times; about 2.5 MB
    of creep in six days, under each PR's scatter).
20. **WEAK: the report cannot see heat or the board.** No minutes-up, no
    riding flag; only the worker's 15 savers named, not the address bar's.
21. **PAPER: the budget table (8.7).** All 19 rows have empty `spends`: its
    check sums nothing. **Card WL.**
22. The debt list is not a gate (GitHub runs `questline` and `membudget`
    only); `mp-heldsweep` and `mp-skateboard` are red on `main`.

### What it costs (card CK, and the owner's word for `.github/`)

23. `switches-thrown` is 894 of the suite's 979 s and grows with every new
    switch; its header says "under about 30 s".
24. Server CI runs the whole suite on every push (about 22 minutes on
    GitHub's machine), nothing cancels an older run, and a docs-only push
    pays the same. About 50,000 to 75,000 minutes in ten days (an estimate
    from the workflows and the commit counts).
25. 37% of commits are bookkeeping (a status, a census made again, `main`
    merged in), each a push.
26. The written record grows about 0.8 MB a day; `docs/TRAPS.md` grew while
    its traps became guards; `docs/GRAND-PLAN.md` is 103 KB, 16% more in 42
    hours, from the sittings' notes.

## 4. The boxes to make true (the gatekeeper, at its next sitting)

Only Z edits `docs/GRAND-PLAN.md`. From this review:

- **5.4**: ticked for the instrument; add an open box "5.4b: `legacy` falls",
  first move the input step (card CT).
- **5.2b**: reopen; its count is every suite that reads the page's source by
  path (237), not the eight big files' 222 pairs.
- **4.1**: the wire door's forms and the hostile suite's reach are open until
  card DG.
- **4.4, 4.5, 4.2**: each says what it reaches (six systems; six restarts;
  the bar gated at 1.98) until card BK.
- **10.1, 11.2**: "a shape on paper; no code" until card WHO.
- **2.3**: "proved on a model that heats by the clock; not confirmed on a
  phone" until card PH.
- **8.7**: "a table; its sums are empty".
- Lower the two renderers' lines to today's count plus 25.
- From now on a sitting's notes go in `docs/plan/log.md`, one line a step;
  the plan keeps the box and one line saying where its record is.

## 5. What the reviewers did not check

Any browser run; a phone; git history before 2026-11-17 (the clone is
shallow); 35 of 37 phase doors; the request-once door; export, restore and
rewind (4.7); the Auction House's and the arena's ledger rows; PvP claims;
the HTTP routes' rows against what each route reads; cards U2, U3, LR, WD.
