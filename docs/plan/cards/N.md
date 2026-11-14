# Card N: the wire table (step 4.1, step 1, as code, and its guard)

**Starts:** after W, S and C are merged (all three are).
**Read:** `CLAUDE.md` (§5, the wire's rules); the ten rules at the top of
part 5 of `docs/GRAND-PLAN.md`; step 4.1 and pillar 11; `docs/SHAPES.md`
part 5 (the columns, their closed lists) and part 8 (names);
`docs/plan/census/wire.md` parts 1, 2 and 8 (read rows by grep, a row at a
time: the page is 754 KB); `docs/ARCHITECTURE-HANDOFF.md`;
`tools/guards/README.md`.
**Tags:** 5060 to 5079, one a PR, in the order below.
**Browser:** none.
**Effort:** extra.

## PRs, in order

1. **(tag 5060) The door tests read `server/src/` in depth.**
   - Files: the suites under `server/test/` that list `server/src/` with a
     flat `readdirSync` (today among them `gold-door`, `bag-door`,
     `hit-door`, `life-door`, `session-door`, `refusal-door`,
     `wire-audit`, `opid-audit`, `caps-audit`, `liveops`: grep
     `readdirSync` for the whole list), and one shared walker they import.
   - A file in a folder under `server/src/` is read like one at its top.
     `server/src/vendor/` (the vendored signer, not ours) is left out by
     name, in the walker, with the reason.
   - Done when a scratch `server/src/zz/x.js` that writes `.coins` fails
     `gold-door`, and every suite passes without it. It touches
     `server/test/`: its merge deploys the worker.
2. **(tag 5061) The table: `server/src/wire/`.**
   - Files: new `server/src/wire/` (a file a direction, or a family, your
     choice: say which in its README), a `README.md` there, nothing else.
   - One row for each key of the census (436 today): the router's cases,
     `RELAY.TYPES`, `PRIVILEGED_EVENTS` with `clan_war_declare`, and the
     HTTP routes. A row's key is its `name` and its `dir`.
   - **The columns are the ones `docs/SHAPES.md` part 5 says need the
     handler read**, with SHAPES' names and closed lists: `name`, `dir`,
     `at`, `wayIn`, `envelope`, `phase`, `mayStart`, `doesWhat`, `reqId`,
     `trust` (one value a field), `absent`, `bad`, `answer`. The census's
     prose is turned into those values; its words are not copied.
   - Leaf files: no imports, plain data, so node and the worker can both
     read them. Nothing in the worker imports the table yet (card K does).
   - Done when every census row is a table row, and a script prints the
     counts by `dir` equal to the census's part 8.
3. **(tag 5062) Its guard: `tools/guards/wire-table.test.mjs`.**
   - Counts every key from the code, as the census's part 8 counted it,
     and fails: a key with no row; a row with no key; two rows for one key
     and direction; a value off its column's closed list; a case of the
     phone's direct switch that is not the name of an `out` or `relay` row.
   - The HTTP routes: a lister finds every path a handler tests (the
     census's readers' checklist); a path with no row fails. A row that is
     a handler's fall-through says so in its `at`, and the lister does not
     look for it.
   - Record the break proof in its header (rule 8), tried once by hand.
   - Done when the guard is green on `main` and red on each break proof.

## Readings chosen for you

- **The machine-filled columns** (SHAPES part 5's second table: `fight`,
  `pace`, `cap`, `flag`, `roads`, `privileged`...) are NOT copied into the
  table. Today's lists stay the truth until card K makes each list FROM the
  table (step 4.1, step 2). A copy now is rule 2's second definition.
- **`mayStart`**: the 91 rows the census calls "a person" stay `person`
  (the owner, 2026-11-14: *"Leave open"*; step 11.7 decides). Never
  `helper` unless pillar 11 names the errand.
- **A census row that fits no closed value**: take the safer value
  (`person` for `mayStart`, `claim` for a field's `trust`, `none` for
  `reqId`), and give the row a `note` with the census's words. The table's
  README prints how many rows carry a note.
- **A row the census got wrong** (the code says otherwise): the table says
  what the code does, and the row goes under Found with its file and line.
- **A new message lands while you work** (card A's `report`, or anyone's):
  merge `main`, add its row. Once your guard is on `main`, a new case with
  no row fails it: say so under Found so the gatekeeper tells the others.
- **Not yours to fix**: the census's 209 findings (part 7). They wait for
  cards K, Q and R.
- PRs 1 and 2 both deploy the worker (`server/**`): they merge in one
  sitting (TRAPS §277). The guard does not deploy.

## Not yours

`server/src/index.js`, `relay.js`, `wsClient.js` and every list the table
describes (card K moves them); the action door (`src/game/actions.js`, card
K); `docs/plan/census/wire.md` (C's, done).
