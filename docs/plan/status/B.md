card: B
branch: claude/plan-b-7-asset-sources (one branch a PR, each begun from the one before: -1- to -8-)
prs: #1685 (ready), #1687 (ready), #1689 (ready), #1690 (ready), #1693 (ready), #1696 (ready), PR 7 (working)
state: working

## Done
- PR 1 (5100, #1685): a scenario is a file (`old-map.test` reads files,
  refuses a hidden file); `mp-topaudit` on the world, 5/6, 1 red (Found).
- PR 2 (5101, #1687): the four lines: 9,871, 7,801, 5 cycles, 114.
- PR 3 (5102, #1689): the system map (`lib/systems.mjs`), 31 systems.
- PR 4 (5103, #1690): `lib/filesOf.mjs`; suites naming a big file: 222.
- PR 5 (5104, #1693): rule 2's guard, five holds, all "not built yet".
- PR 6 (5105, #1696): rule 6's table and guard; 16 known seconds.

## Next
- PR 7 (5106): `asset-sources.test.mjs` holds `tools/assets/sources.json`
  to `git ls-files assets` (a file with no row, a row with no file, a
  hash or size changed, the totals); card F's Needs.

## Found
- `mp-topaudit` red, the GAME's (suspected): at a faked 59 px top inset the
  world map's button (the Wheel minimap) stays at top 53, under the status
  bar. `wheelMinimap.js` `update()` takes a `topInset` that
  `pixiRenderer.js:869` never passes. Unproven on a device; no card owns it.
- Nothing holds `docs/plan/census/state.md` to the code on a PR (card D's
  `--check` is in neither precheck nor `npm test`): the four lines' rule 4
  holds what the page says.
- `precheck.mjs`'s old-map block still names `mp-topaudit.mjs` in
  `LEFT_BEFORE_5021` (harmless: it names its world now). Not my file.
- SHAPES part 10's `oplog:` hold (the worker's prefix and `pid`) is not
  among card B's five.

## Needs
- Owner: `mp-topaudit` was to be "run once green": it is kept on the world
  with one red that is the game's (Found, first line). Keep it as it is (the
  red stays as the finding), or delete it with its line in OLD-MAP-TESTS?
