# Card B: the walls' rails (steps 5.1, 5.2, 5.2b, 5.9, and the guards of rules 2 and 6)

**Starts:** after W is merged (it is). Card U waits for your PRs 3 and 4.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md` (rules 1, 2, 3, 6 and 8); pillar 5; part 3's table;
`tools/guards/README.md` and `rails.test.mjs`; `docs/SHAPES.md` part 10;
`docs/BUDGETS.md` parts 8 and 9; `docs/plan/census/state.md` and
`traps.md` (their provisional system columns); `docs/plan/status/W.md`
and `Z.md` (their Found lines are this card's).
**Tags:** 5100 to 5119, one a PR, in the order below.
**Browser:** none, except one run of `mp-topaudit` in PR 1 if it is kept.
**Effort:** standard.

## PRs, in order

1. **(tag 5100) A scenario is a file, on GitHub too.**
   - Files: `server/test/old-map.test.mjs`, `tools/qa/mp/run.mjs`,
     `tools/qa/mp/oldMap.mjs` (if it needs to), `tools/guards/rails.test.mjs`,
     `tools/qa/mp/mp-topaudit.mjs`, `docs/OLD-MAP-TESTS.md`.
   - **Ruled:** `old-map.test.mjs` reads only `run.mjs`'s table, so since
     #1661 a new scenario that names no world passes GitHub's check. It
     reads the files (`tools/qa/mp/mp-*.mjs`, and every file the table
     names), as precheck already does.
   - **Ruled:** `run.mjs` with no name also runs the scenario files that
     have no line in the table.
   - **Ruled:** `mp-topaudit.mjs` (an old probe: no world, no line) is
     moved to the world if what it checks (the top of the screen on an
     installed iPhone, `.bt-zone-header`) still exists in the game, and run
     once green; else deleted, with its line in `docs/OLD-MAP-TESTS.md`.
   - Two loose ends Z found: a table name that points at another file
     (`landview`, `thumbbtn`) hides a new `mp-landview.mjs`: refuse such a
     file by name; and precheck runs a check that `rails.test.mjs` refuses
     (an arrow default export): make the two take the same rule.
   - It touches `server/test/`: its merge deploys the worker.
2. **(tag 5101) The four lines** (step 5.1), as a guard.
   - Files: new `tools/guards/four-lines.test.mjs` and its table of lines;
     `tools/dev/scoreboard.mjs` (its two "not measured" rows read yours).
   - Code lines by file, comments not counted; the longest function;
     import cycles (five today, by the plan's count); writes to `S` from
     `src/rendering/`.
   - **Pin the rule** for "code lines" and "the longest function" in the
     guard's header (W found the plan's figures, about 8,700 and about
     3,600, unexplained; a parser gives 9,872 and 14,864). Your rule
     decides; the figures follow it.
   - **Writes to `S` are counted by card D's script**
     (`node tools/dev/state-census.mjs --json`), never by a second counter
     (rule 2).
   - Each line only falls. Only the gatekeeper lowers one.
3. **(tag 5102) The system map** (step 5.2).
   - Files: new `docs/SYSTEMS.md`; the map as a table in code under
     `tools/guards/` (the page is made from it or checked against it);
     its guard.
   - A system: its files, its spec, its traps, its tests, its doors, its
     switches. Start from the provisional system columns of the state and
     traps censuses. An `unsorted` bucket whose count only falls (rule 3:
     a census, made strict by the gatekeeper alone).
   - Every file under `src/` and `server/src/` is in one system or in
     `unsorted`; the guard fails a file in two, and a rise in `unsorted`.
4. **(tag 5103) Tests find code by system** (step 5.2b).
   - Files: one helper ("the files of system X"), under `tools/guards/`
     where both the guards and `server/test/` suites can import it; a
     census of the suites that name a big file by path; its guard.
   - The list of suites that name a big file only falls. No file moves
     before the suites that read it are converted (none moves here).
5. **(tag 5104) Rule 2's guard** (`docs/SHAPES.md` part 10), the five
   holds it lists: each NEW name of SHAPES part 8 is defined in one file,
   its row's "Where"; no code writes a storage key with a prefix of the
   page outside its row's one writer; nothing but the action door makes a
   `reqId`; no `kind`, `wayIn` or `permit` read off a message as an
   actor's; `deviceProfile.js` the one file that asks the device and
   returns `devClass`. A hold whose shape is not built yet passes with a
   line saying so, and starts holding when it is.
6. **(tag 5105) Rule 6's guard** (`docs/BUDGETS.md` part 9): a table of
   code, a row a system (PR 3's names): `reads`, `spends`, `controls`.
   It fails a signal two rows control and a sum of `spends` over its line.
   It lands as a census: BUDGETS part 8's sixteen second controllers are
   listed as known, and the count only falls.
7. **(tag 5106) `sources.json` held to `assets/`** (card F's Needs): a
   guard that fails a file under `assets/` with no row in
   `tools/assets/sources.json`, a row with no file, and a hash that no
   longer matches.
8. **(tag 5107) Pins** (step 5.9): PixiJS at an exact version in
   `package.json` (the version the lockfile holds; `package.json` says
   `^8.6.6` today); the places the
   game patches Pixi's inside in one table, with a guard that fails a
   patch not in it. The client builds; nothing a player sees changes.

## Readings chosen for you

- **Guards live in `tools/guards/`** and run in `npm test` (the README
  says how); they do not deploy. A suite under `server/test/` does.
- **A census, not a wall, where rule 3 says**: the system map's
  `unsorted`, the suites by big file, and rule 6's second controllers.
  Strict from the start only where value hangs on it.
- **Every guard records its break proof** in its header (rule 8), tried
  once by hand.
- **System names** are yours to choose, short and in the code's words (a
  folder's or a door's). Cards U, V, M and T read them.
- `tools/qa/mp/mp-*.mjs` are card J's while J runs: PR 1 touches only
  `mp-topaudit.mjs`, which no card of J's touches. Check J's status file
  before it.

## Not yours

The ledger files (card U); traps into guards (card V); the switch table
(card T); any game code; `held-budget.mjs` (H).
