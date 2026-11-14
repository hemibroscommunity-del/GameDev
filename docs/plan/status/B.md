card: B
branch: claude/plan-b-2-four-lines (one branch a PR, each begun from the one before: -1- to -8-)
prs: #1685 (ready), PR 2 four lines (working)
state: working

## Done
- PR 1 (5100, #1685): a scenario is a file. `old-map.test` reads the files
  (a scratch `mp-zzz.mjs` with no world -> FAIL 1), refuses a file a table
  line hides (`mp-landview.mjs` -> FAIL 5, `run.mjs` too); `run.mjs` with
  no name runs the unlisted files; `rails` takes precheck's rule;
  `mp-topaudit` plays the world: 5 of 6 green, 1 red the game's (Found).

## Next
- PR 2 (5101): the four lines, `tools/guards/four-lines.test.mjs`, its
  rules and table in `tools/guards/lib/fourLines.mjs` (esbuild: GitHub's
  job has no @babel). Code lines: a line esbuild's map points at. Today:
  largest file 9,871 (`effectsRenderer.js`), longest function 7,801
  (`BroTown`), 5 import cycles over 29 files, 114 writes to `S` from
  rendering (card D's page). `rails` now allows `tools/guards/lib/`
  (helpers; PR 4's goes there too). Each break proof tried.

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
