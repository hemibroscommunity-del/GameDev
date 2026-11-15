card: T
branch: claude/plan-t-7-cold (one branch a PR, each begun from main once the one before merged)
prs: #1754, #1768, #1816, #1817, #1837 (5301-5305, merged); #1863 (5306, ready); PR 7 (5307, ready)
state: ready

## Done

- PR 1 (5301, #1754): the table, the scanner, the census guard, the page.
- PR 2 (5302, #1768): the page's game-side rows; the scanner's shapes.
- PR 3 (5303, #1816, for #1797): the drawing side's rows, unlisted 0; B's
  map reads the table; SHAPES' two lines point at it.
- PR 4 (5304, #1817, for #1804): a row's place by its name (check 10);
  needs and readers (check 11); the thrown run (thrown.mjs, a preload).
- PR 5 (5305, #1837): the end date (`on`, `--due`, the fallback hold).

## Next

- #1863 (5306): the page's one reader, src/game/switches.js; its guard.
- PR 7 (5307): the thrown run's preload changes nothing by itself (a module
  hook; no early load, no game function replaced): every server suite
  passes with a flag nothing reads (`--none`), two canaries on every PR.
  The planning session's finding. Then the reads moved (5308 on).

## Found

- The table is now the one list of switch names for card A's `sw` (the
  report) and card K's `flag` (the wire table): each is to read it.
- New switch rows need `on`; a page row also `--write` (the reader's forms).
- RT-3's #1878 skips cold-flags.test in the thrown run as a stopgap: once it
  is on main, the skip comes out (this PR's canary holds the suite).
- Card B's map files src/game/crowdCap.js under `monsters`; `?crowd` caps players.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O's knobs stay O's reads (step 2.4): `?pixbudget`, `?res`,
  `?onebatch`, `?lookpalette`, `?pace`, `?crowd`, the passes'; and `govern`
  (a value on the page) is a need the reader cannot resolve.

## Needs

- The gatekeeper: #1863, then PR 7.
