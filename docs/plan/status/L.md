card: L
branch: claude/plan-l-1-ledger-reads-code (one branch a PR, each begun from the one before)
prs: PR 1 (opening)
state: working

## Done

- PR 1 (5201): the ledger's guard and four-lines' fourth number read the
  code on GitHub. `server/` gains the root's exact `@babel/parser` 7.29.2 and
  `@babel/traverse` 7.29.0 (its babel tree pinned to the root's); the
  census script's loader tries the root's, then `server/`'s, exit 3 where
  neither. One run a `npm test`, shared (`fourLines.mjs stateCensus()`, kept
  by a hash of what the script reads). The guard holds the machine's columns
  to the script's (`--json` gains `ledger`). Break proofs 6 to 9 tried with
  the root's packages moved aside. Its merge deploys the worker.

## Next

- PR 2 (5202): the phase table (`src/state/phases.js`) and its guard.

## Found

- `server/test/run.mjs`: the two guards that wait on the census script
  (`guards/state-ledger`, `guards/four-lines`, ~23 s each, one shared run)
  are not in `SLOW_FIRST`; the suite took 81 s, not 72, on this box.
- `UNLISTED_LINE` is still 2128 (16 unlisted): a new top-of-file `let`
  fails the guard only once the gatekeeper sets the line at its count.

## Needs

- Nothing. The planning session's call (2026-11-14): `--json` carries
  `ledger` (ledgerFound's rows, an output), beyond "its loader only"; the
  loader's exit 3 said in PR 1's words.
