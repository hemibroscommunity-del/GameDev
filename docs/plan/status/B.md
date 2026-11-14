card: B
branch: claude/plan-b-8-pins (one branch a PR, each begun from the one before: -1- to -8-)
prs: #1685 (merged), #1687 (ready), #1689 (ready), #1690 (ready), #1693 (ready), #1696 (ready), #1698 (ready), #1702 (ready)
state: ready

## Done
- PR 1 (5100, #1685, merged at sitting 3): a scenario is a file.
- PR 2 (5101, #1687): the four lines, taken again at main 0c83972
  (`wsClient.js` 3,296 after #1703): 9,871, 7,801, 5 cycles, 114.
- PR 3 (5102, #1689): the system map, 31 systems; card E's `daybook.js`
  and `storagemarks.js` in server-core, `bookAdd` a door.
- PR 4 (5103, #1690): `lib/filesOf.mjs`; suites naming a big file: 222.
- PR 5 (5104, #1693): rule 2's guard; `daybook:` holds on `daybook.js`,
  the report carries `devClass`, `drawLane` (SHAPES part 4's fields).
- PR 6 (5105, #1696): rule 6's table and guard; 16 known seconds.
- PR 7 (5106, #1698): `asset-sources.test.mjs`, sources.json to assets/.
- PR 8 (5107, #1702): PixiJS pinned at 8.17.1; 29 patches in one table.

## Next
- Nothing on the card is left. Sitting 3 held PRs 2-8 (guards red with
  main); each branch has main merged in and every guard green, for
  sitting 4, in order (#1689 and #1690 first for card U). Tags 5108-5119
  unused.

## Found
- `mp-topaudit` red, the GAME's: the minimap's `topInset`
  (`pixiRenderer.js:869`); card Y fixes it (the planning session).
- Nothing holds `docs/plan/census/state.md` to the code on a PR (card D's
  `--check` is in neither precheck nor `npm test`): the four lines' rule 4
  holds what the page says.
- `precheck.mjs`'s old-map block still names `mp-topaudit.mjs` in
  `LEFT_BEFORE_5021` (harmless: it names its world now). Not my file.
- SHAPES part 10's `oplog:` hold (the worker's prefix and `pid`) is not
  among card B's five.

## Needs
- None. `mp-topaudit`: kept on the world (the planning session, 2026-11-14).
