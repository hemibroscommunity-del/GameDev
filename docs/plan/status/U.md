card: U
branch: claude/plan-u-1-ledger
prs: PR 1, tag 5160 (working)
state: working

## Done

- Nothing yet.

## Next

- PR 1 (5160): `src/state/README.md`, the first ledger, `--ledger` in
  `state-census.mjs`, the guard `tools/guards/state-ledger.test.mjs`.
  Fewest rows by B's map: `life` and `liveops`, one row each (the tie goes
  by name: `life`, the field `_deathCard`).

## Found

- `docs/plan/census/state.md` is behind the code on main: `--check` fails
  (885 files, not 883; 20 variables more, e.g. `debug/report.js`).
- `tools/guards/lib/fourLines.mjs:45` says the page "is held to the code by
  `state-census.mjs --check`": nothing runs `--check` (not precheck, not CI).

## Needs

- Asked the planning session (once, 2026-11-14):
  1. a file under `src/state/` is `unsorted` in B's map (11, its line 11):
     PR 1's two files make 13 and `systems.test` fails. Who places them?
  2. may a ledger PR rewrite the census page (`--write`) so its rows and
     the page the guard reads in CI agree?
