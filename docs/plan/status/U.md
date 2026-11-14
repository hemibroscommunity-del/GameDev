card: U
branch: claude/plan-u-7-look (one branch a PR, each begun from the one before)
prs: #1721, #1722, #1723, #1725, #1727, #1728, #1730 (all ready)
state: ready

## Done

- PR 1 (5160, #1721): the form (`src/state/README.md`), `--ledger` in
  `state-census.mjs`, the guard `state-ledger.test.mjs` (line 2128), the
  first ledger `life` (fewest rows, tied with `liveops`; the tie by name).
  B's map gains the system `state`, and its empty row in `budgets.mjs`.
- PRs 2 to 6 (5161-5165), the systems by fewest rows, unlisted after each:
  #1722 liveops..input 2109 (the census page made again); #1723 quests..
  social 1959; #1725 movement..memory 1760; #1727 debug, art, data 1578;
  #1728 wire, combat, world 1185.
- PR 7 (5166, #1730): look (194), and the guard takes a phase's empty word: 991.

## Next

- PR 8 (5167): render. PR 9 (5168): ui. Tried: both pass the guard,
  unlisted 16 (the unsorted rows).

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
