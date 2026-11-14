card: U
branch: claude/plan-u-4-five (one branch a PR, each begun from the one before)
prs: #1721 (ready), #1722 (ready), #1723 (ready), #1725 (ready)
state: ready

## Done

- PR 1 (5160, #1721): the form (`src/state/README.md`), `--ledger` in
  `state-census.mjs`, the guard `state-ledger.test.mjs` (line 2128), the
  first ledger `life` (fewest rows, tied with `liveops`; the tie by name).
  B's map gains the system `state`, and its empty row in `budgets.mjs`.
- PR 2 (5161, #1722): liveops, session, device, page-thread, input (39);
  the census page made again: unlisted 2109.
- PR 3 (5162, #1723): quests, townsfolk, desktop, monsters, audio, social
  (150): unlisted 1959.
- PR 4 (5163, #1725): movement, economy, preload, skills, memory (199):
  unlisted 1760.

## Next

- PR 5 (5164): debug, art, data. Then wire, combat, world; look; render;
  ui (the systems of BroTown.jsx and the two renderers last).

## Found

- Nothing runs `state-census --check`, though `tools/guards/lib/fourLines.mjs:45`
  says it does: `docs/plan/census/state.md` drifts from the code between
  rewrites (at main 75946b7 it lagged by 20 variables; PR 2 made it again).
- `unsorted` rows no ledger can take (16), in files B's map has not placed:
  `src/game/` characterCreatorEffects, rpgSave, spriteSheets, visualSystems.

## Needs

- Nothing. The planning session's calls (2026-11-14): the system `state` in
  B's map, written in PR 1; a ledger PR may rewrite the census page when its
  rows need it; never-changed `let`/`var` are rows (`neverChanged`); a
  field's system is B's of D's file; rows name file and function, not line.
