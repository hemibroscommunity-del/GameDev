# Card E: the books (steps 4.4, 4.5's harness, then 4.5, 10.3, 10.4)

**Starts:** after W and S are merged (both are).
**Read:** `CLAUDE.md` (§5: the doors, one write); the ten rules at the top
of part 5 of `docs/GRAND-PLAN.md` (rules 3 and 5 above all); steps 4.4,
4.5, 10.3, 10.4, 10.5; `docs/SHAPES.md` parts 3 and 7 (its part 7 "Open"
is ruled below); `docs/ARCHITECTURE-HANDOFF.md` in full (rules 1, 2, 5, 7,
9, 10, 24); `docs/specs/gold-door.md`, `bag-door.md`, `migrations.md`;
`server/test/chaos-restart.test.mjs`.
**Tags:** 5080 to 5099, one a PR, in the order below.
**Browser:** none (node suites).
**Effort:** extra: this is money.

## PRs, in order

1. **(tag 5080) The day's book: its frame** (step 10.4, NOW).
   - Files: new `server/src/daybook.js`, a new suite
     `server/test/daybook.test.mjs`, `cost-guard.test.mjs` (its line),
     ARCHITECTURE-HANDOFF's registry (rule 2), `liveops.js` (its switch).
   - `daybook:<yyyymmdd>` (UTC), in parts: `econ` (yours), `room`, `dev`
     and `speed` (card A's). One door, a function a part's writer calls
     with numbers to add; the door keeps the day in memory and puts it at
     most once a pace while the room is awake (choose the pace, give it a
     line in `cost-guard`). Kept 60 days, as `accday:` is, pruned a page a
     tick slot (handoff rule 9). A lower-case kill switch.
   - Card A writes its three parts through your door: build it first, so
     A is not held. `econ` stays empty until PR 6.
2. **(tag 5081) The roads' classes** (step 4.4).
   - Files: `server/src/gold.js`, `server/src/bag.js` (their tables only),
     `gold-door.test.mjs`, `bag-door.test.mjs`, `docs/SHAPES.md` part 3.
   - Every row of `GOLD_ROADS` and `BAG_ROADS` gets `class` (`mint`,
     `burn`, `move`, `escrow`) and, for a `move` or an `escrow`, `other`.
     The door tests fail a row with none, and a `move` or `escrow` with no
     `other`.
   - Rule SHAPES part 3's four edges and write each ruling there, in this
     PR (the page is frozen; its title says it changes SHAPES): a `set`
     road by its difference; the mail's class from a closed table of the
     credit's source (choose the `opId`'s first word or `source`, and say
     why); a mixed payment; the three whole-bag assigns (the death's wipe
     is classed: it moves a bag to `death_pile:`).
3. **(tag 5082) The registry's marks: `value` and `whose`.**
   - Files: a new table in code beside the registry, the test that holds
     the handoff's table to it, `docs/SHAPES.md` part 3 (where they live).
   - **The reading chosen:** the marks are a table in code that a test
     reads (a gate is a test GitHub runs); the handoff's markdown table
     gets NO new column, because precheck's `storage-keys` parses it. The
     test fails a prefix in one and not the other.
4. **(tag 5083) The `_econ` field: the second exception to rule 1.**
   - Files: `server/src/persistence.js` (`_saveRpg`'s fixed list),
     `server/src/migrations.js` (the registry and the schema number),
     ARCHITECTURE-HANDOFF rule 1, `docs/SHAPES.md` part 7 ("Open" becomes
     ruled), a test (`migrations.test.mjs` or a suite of its own).
   - **Ruled (the planning session, for the owner, who asked that server
     costs not go up):** the open question of SHAPES part 7 is a second
     named exception to rule 1, ONE field on the `rpg:` record, so no new
     rows. Its name is `_econ` (free: no hit in the code, 2026-11-14). It
     holds the character's running minted and burned by road class,
     written in the purse's own put (rule 5). Card Q later puts the open
     sitting's card inside it, under a key of its own: no third exception.
   - Write the exception into rule 1 beside `_v`, in the same words' form,
     with the test that fails a third field.
   - **This changes a stored record's shape**: the gatekeeper lists it on
     a line of its own, merged by itself (a rolled-back worker refuses a
     newer save). Say so in the PR's first line.
5. **(tag 5084) The world's sum** (step 4.4).
   - Files: new `server/test/world-sum.test.mjs`; the counting in the two
     doors (they add to `_econ` as they run, by the road's class).
   - For each kind of value (SHAPES part 3, "What is summed"): purses,
     vaults, mail waiting and every escrow equal the start, plus minted,
     less burned.
   - Done when a planted double pay through a LEGAL road fails the suite,
     and so does a value record the marks of PR 3 do not count.
6. **(tag 5085) The day's book's `econ` part**: minted and burned by road
   class for the whole room, added through PR 1's door as the two doors
   run. Files: `gold.js` and `bag.js` (that one call), `daybook.js`, its
   suite.
7. **(tag 5086) The shared test room** (step 4.5's harness).
   - Files: a helper under `server/test/` (not a `*.test.mjs`, so it is
     not run by itself), its own small suite, and one existing suite moved
     onto it as the proof.
   - One room for tests: a batch that commits or does not, a queue that
     knows the room's gates, a seeded clock. Beside it, the one closed list
     of **disturbances** (SHAPES part 7): a deploy at any message, a hidden
     tab, 60, 30, 20 and 4 frames a second, the line's delay and loss, and
     each `drawLane` (today the one, `full`).
   - Suites move onto it one at a time, later; this PR moves one.
8. **(tags 5087 to 5089) `KNOWN` empty, one PR a cause** (step 4.5):
   `trade-weapon-half` (`trade2.js`), `arena-stake-place` and
   `arena-stake-settle-loss` (`gladiator.js`). Each moves the writes into
   one run (handoff rules 5 and 7) and takes its case off `KNOWN`.
9. **(tag 5090) A refused save is counted, and a value road fails
   closed** (step 4.5): an action that moves value refuses while the
   storage refuses saves. The COUNT is one counter, step 1.6's "saves
   refused", built by card A in `server/src/roomrow.js` (A's PR 5): read
   it, never count a second time. If it is not on `main` when you get
   here, do PR 10 first and put this one under Needs.
10. **(tag 5091) The storm** (step 4.5): 4.4's sum replayed under the
    closed list of disturbances. Done when it ends with unexplained gold
    0, no honest player flagged, no reload and no dead worker.
11. **(tag 5092) The transfer ledger `xfer:`** (step 10.3): one row each
    time value settles between two players, in the settlement's own run
    of writes (handoff rule 5); its key begins with the day; kept 90 days
    (the owner's yes, call 13); one row a settlement, none a kill, held by
    `cost-guard`. Registry row in the same PR.
12. **(tag 5093) The owner's card in the Test panel** (step 10.4): the
    book's parts on screen, and the economy's five numbers (unexplained
    gold; gold made a player-hour against the week; the share moved one
    way for nothing, from `xfer:`; the share of new gold reaching the
    richest; cases waiting, blank until card Q). In a panel file of its
    own, mounted from `src/ui/panels/DevPanel.jsx` by one line (card A
    adds one line there too). The book is read through the ONE admin
    route card A builds (A's PR 6); if it is not on `main` when you get
    here, build it in `server/src/devtools.js` and say so under Found.
    A screen: `states.mjs` and a section in `UI-DESIGN-NOTES.md`
    (CLAUDE.md §8).

## Readings chosen for you

- **The laws that apply:** the gold and bag doors (CLAUDE.md §5: every
  change goes through `_goldGive`/`_goldTake`/`_goldSet` and `bagGive`/
  `bagTake`/`bagSet`, each naming its row); one write (no `await` between
  a payment, its stamp and both sides); a value a player sees is saved
  before its message goes; a new storage key in the registry (precheck
  `storage-keys`); a new server behaviour has a lower-case kill switch.
  Same-change rows: a storage key; a way to change gold or a bag count.
- **Rows only go up where this card says.** The owner asked that server
  costs not go up: `_econ` rides the purse's put; the book is one put a
  pace; `xfer:` is one row a settlement. Every new row has its line in
  `cost-guard.test.mjs`.
- **Nobody else writes `GOLD_ROADS`** while this card is open (part 11,
  "never side by side"). A card that needs a road asks under Needs.
- **Turning any fee, hold or pace up is the owner's call** (call 12):
  step 10.5's columns are card R's, all at zero.
- Almost every PR here touches `server/**` and so deploys the worker: the
  gatekeeper merges them in batches, a sitting each (TRAPS §277).
- **Card K waits for your fixes** (PRs 8 to 10): part 11 says K never runs
  beside them.
- **A new message or route** (the Test panel's read of the book is an
  admin route) gets its row in card N's wire table once N's guard
  (`tools/guards/wire-table.test.mjs`) is on `main`.

## Not yours

The report and the room's row (card A writes `room`, `dev`, `speed`
through your door); the sitting's card and `xfer:`'s readers (card Q);
restore and the roads' fee columns (card R); the wire table (N).
