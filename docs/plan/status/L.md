card: L
branch: claude/plan-l-2-phase-table (one branch a PR, each begun from the one before)
prs: #1746 (ready), PR 2 (opening)
state: working

## Done

- PR 1 (5201, #1746): the ledger's guard and four-lines' fourth number read
  the code on GitHub (`server/` gains the root's exact @babel; the loader
  tries the root's, then `server/`'s, exit 3 where neither; one shared run a
  `npm test`); the guard holds the machine's columns (`--json` gains
  `ledger`). Its merge deploys the worker.
- PR 2 (5202): the phase table, `src/state/phases.js` (36 rows, 5 `door`:
  session, life, monster on both sides, the page's zone; 31 `todo`) and its
  guard `phase-table.test.mjs` (TODO_LINE 31); `docs/specs/phase-table.md`;
  SHAPES parts 5, 7 and 8. Changes no game file.

## Next

- PR 3 (5203): `resetOn` at the zone door, and the first systems' resets.

## Found

- `server/test/run.mjs`: the two guards that wait on the census script
  (`guards/state-ledger`, `guards/four-lines`, ~23 s each, one shared run)
  are not in `SLOW_FIRST`; the suite took 81 s, not 72, on this box.
- `UNLISTED_LINE` is still 2128 (16 unlisted): a new top-of-file `let`
  fails the guard only once the gatekeeper sets the line at its count.
- `server/src/bodytake.js` ~94 cites "rejoinresend's pose row": there is
  none (`rejoinresend.js` re-sends the duel and the trade only).
- `session.phase` is written in three places (born `open` in index.js
  `fetch`, `joined` in join.js `_handleJoin`, `gone` in leave.js
  `_leaveRun`), and `session-door.test` fails no second writer: the phase
  table's scan holds it now.

## Needs

- Nothing. The planning session's call (2026-11-14): `--json` carries
  `ledger` (ledgerFound's rows, an output), beyond "its loader only"; the
  loader's exit 3 said in PR 1's words.
