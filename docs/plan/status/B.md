card: B
branch: claude/plan-b-4-tests-by-system (one branch a PR, each begun from the one before: -1- to -8-)
prs: #1685 (ready), #1687 (ready), #1689 (ready), PR 4 (working)
state: working

## Done
- PR 1 (5100, #1685): a scenario is a file (`old-map.test` reads files,
  refuses a hidden file); `mp-topaudit` on the world, 5/6, 1 red (Found).

- PR 2 (5101, #1687): the four lines guard, rules pinned in
  `tools/guards/lib/fourLines.mjs` (esbuild; GitHub has no @babel): 9,871
  (`effectsRenderer.js`), 7,801 (`BroTown`), 5 cycles over 29 files, 114.

- PR 3 (5102, #1689): the system map, `tools/guards/lib/systems.mjs`, 31
  systems, `unsorted` 11; `docs/SYSTEMS.md` says the rules only.

## Next
- PR 4 (5103): `tools/guards/lib/filesOf.mjs` (`filesOf`, `readSystem`,
  `findIn`); the census of suites naming a big file by path (222 pairs,
  117 suites, `lib/bigFileSuitesKnown.mjs`, `--write` only removes); guard
  `tests-by-system.test.mjs`. Card U can start after PRs 3 and 4.

## Found
- `mp-topaudit` red, the GAME's (suspected): at a faked 59 px top inset the
  world map's button (the Wheel minimap) stays at top 53, 6 px under the
  status bar and inside the taller top bar. `wheelMinimap.js` `update()`
  takes a `topInset` that `pixiRenderer.js:869` never passes. Unproven on a
  device; no card owns it.
- Nothing holds `docs/plan/census/state.md` to the code on a PR (card D's
  `--check` is not in precheck or `npm test`): rule 4 of the four lines
  holds what the page says. Its script takes 16 s and needs @babel.
- `tools/dev/precheck.mjs`'s old-map block still names `mp-topaudit.mjs` in
  `LEFT_BEFORE_5021` (harmless now: the file names its world). Not my file.

## Needs
- Owner: `mp-topaudit` was to be "run once green": it is kept on the world
  with one red that is the game's (Found, first line). Keep it as it is (the
  red stays as the finding), or delete it with its line in OLD-MAP-TESTS?
