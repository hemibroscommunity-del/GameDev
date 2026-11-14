card: U
branch: claude/plan-u-3-six (one branch a PR, each begun from the one before)
prs: #1721 (ready), #1722 (ready), #1723 (ready)
state: ready

## Done

- PR 1 (5160): `src/state/README.md` (the form); `src/state/life.js`, the
  first ledger (fewest rows: `life` and `liveops` one each, the tie by
  name; `S._deathCard`); `state-census.mjs --ledger`; the guard
  `tools/guards/state-ledger.test.mjs` (unlisted 2128, its line 2128).
  B's map gains the system `state` for `src/state/` (the planning
  session's call: B is finished), and its empty row in `budgets.mjs`.
- PR 2 (5161): `liveops`, `session`, `device`, `page-thread`, `input`
  (39 rows), the census page made again (`--write`): unlisted 2109.
- PR 3 (5162): `quests`, `townsfolk`, `desktop`, `monsters`, `audio`,
  `social` (150 rows; the page already held them): unlisted 1959.

## Next

- PR 4 (5163): movement, economy, preload, skills, memory. Then debug,
  art, data; wire, combat, world; look; render; ui (the systems of
  BroTown.jsx and the two renderers last, as the card says).

## Found

- Nothing runs `state-census --check`, though `tools/guards/lib/fourLines.mjs:45`
  says it does: `docs/plan/census/state.md` lags main (885 files, not 883;
  20 variables more, e.g. `debug/report.js`). For a later card.

## Needs

- Nothing. The planning session answered (2026-11-14): (1) `state` in B's
  map, written in PR 1; (2) a ledger PR may rewrite the census page when its
  rows need it; (3) never-changed `let`/`var` are rows (`neverChanged`), a
  field's system is B's of D's file, rows name file and function, not line.
