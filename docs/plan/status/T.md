card: T
branch: claude/plan-t-3-page-draw (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1754 (5301, merged), #1768 (5302, merged), #1797 (5303, ready)
state: ready

## Done

- PR 1 (5301, #1754, merged): the table, the scanner, the census guard,
  `docs/SWITCHES.md`, the spec, the scoreboard row, liveops.test §8f, §8g.
- PR 2 (5302, #1768, merged): the page's game-side rows (81); sitting 8's
  mend (the scanner's shapes, each a fixture; excuses are functions);
  sitting 9's (the page carries no count: row-adding PRs merge side by side).

## Next

- #1797 (5303, ready): the drawing side's rows (455 rows, unlisted 0); card
  B's map reads a system's switches from the table (SYSTEMS.md links to
  the table, lists no names); SHAPES.md's two lines point at the table.
  Then PR 4 (5304), rule 4's two configurations.

## Found

- `?debug`, `?nodebug` (src/debug/debugBus.js): born in April commits with
  no tag anywhere: `born: 'unknown'`, counted (the line 2).
- New switches add their own rows (the table is on `main`): card L's
  `?<system>reset=0`, card SK's `?ridecoast=0`.
- Card O (planning session, 2026-11-14): the device knobs' off-ramps
  become overrides of O's ladder (step 2.4). PR 7 leaves their reads to O,
  unmoved: `?pixbudget`, `?res`, `?onebatch`, `?lookpalette`, `?pace`,
  `?crowd`, and the passes'. They keep their rows as they are today.

## Needs

- The gatekeeper: #1797 merged. Then PR 4 (5304).
