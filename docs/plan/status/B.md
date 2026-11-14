card: B
branch: claude/plan-b-5-shapes-once (one branch a PR, each begun from the one before: -1- to -8-)
prs: #1685 (ready), #1687 (ready), #1689 (ready), #1690 (ready), PR 5 (working)
state: working

## Done
- PR 1 (5100, #1685): a scenario is a file (`old-map.test` reads files,
  refuses a hidden file); `mp-topaudit` on the world, 5/6, 1 red (Found).

- PR 2 (5101, #1687): the four lines: 9,871, 7,801, 5 cycles, 114.

- PR 3 (5102, #1689): the system map (`lib/systems.mjs`), 31 systems.

- PR 4 (5103, #1690): `lib/filesOf.mjs`; the census of suites naming a
  big file by path (222 pairs, 117 suites), only falls.

## Next
- PR 5 (5104): rule 2's guard, `shapes-once.test.mjs`: SHAPES part 10's
  five holds, all "not built yet" today; a name that appears with no Where
  fails until its builder writes its one file in the guard's table.

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

- SHAPES part 10's "nothing a phone sends is stamped into `oplog:`
  without the worker's prefix and `pid`" is not in card B's five holds.

## Needs
- Owner: `mp-topaudit` was to be "run once green": it is kept on the world
  with one red that is the game's (Found, first line). Keep it as it is (the
  red stays as the finding), or delete it with its line in OLD-MAP-TESTS?
