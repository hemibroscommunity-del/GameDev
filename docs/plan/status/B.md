card: B
branch: claude/plan-b-1-scenario-files (one branch a PR, each begun from the one before: -1- to -8-)
prs: PR 1 (working)
state: working

## Done
- (none merged yet)

## Next
- PR 1 (5100): a scenario is a file. `old-map.test` reads the files (break
  proof: a scratch `mp-zzz.mjs` with no world -> FAIL 1) and refuses a file
  a table line hides (`touch mp-landview.mjs` -> FAIL 5; `run.mjs` refuses
  it too); `run.mjs` with no name runs the files with no line; `rails.test`
  takes precheck's rule (an arrow default export passes in both);
  `mp-topaudit` plays the world (kept: `.bt-zone-header`, `--sat` and the
  away banner are all in the game). Its one run: 5 of 6 green, 1 red below.

## Found
- `mp-topaudit` red, the GAME's (suspected): at a faked 59 px top inset the
  world map's button (the Wheel minimap) stays at top 53, 6 px under the
  status bar and inside the taller top bar. `wheelMinimap.js` `update()`
  takes a `topInset` that `pixiRenderer.js:869` never passes. Unproven on a
  device; no card owns it.
- `tools/dev/precheck.mjs`'s old-map block still names `mp-topaudit.mjs` in
  `LEFT_BEFORE_5021` (harmless now: the file names its world). Not my file.

## Needs
- Owner: `mp-topaudit` was to be "run once green": it is kept on the world
  with one red that is the game's (Found, first line). Keep it as it is (the
  red stays as the finding), or delete it with its line in OLD-MAP-TESTS?
