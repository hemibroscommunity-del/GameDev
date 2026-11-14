card: T
branch: claude/plan-t-6-reader (one branch a PR, each begun from main once the one before merged)
prs: #1754, #1768, #1816, #1817, #1837 (5301-5305, merged); PR 6 (5306, ready)
state: ready

## Done

- PR 1 (5301, #1754): the table, the scanner, the census guard, the page,
  the spec, the scoreboard row, liveops.test §8f, §8g.
- PR 2 (5302, #1768): the page's game-side rows; the scanner's shapes,
  each a fixture (sitting 8); the page carries no count (sitting 9).
- PR 3 (5303, #1816, for #1797): the drawing side's rows, unlisted 0; B's
  map reads the table; SHAPES' two lines point at it.
- PR 4 (5304, #1817, for #1804): a row's place by its name (check 10);
  needs and readers (check 11); the thrown run (thrown.mjs, a preload).
- PR 5 (5305, #1837): the end date (`on`, `--due`, the fallback hold).

## Next

- PR 6 (5306): the page's one reader, src/game/switches.js (`sw`, `swHas`,
  `swValue`, `thrown`; forms and needs from the table, check 13); its guard
  switch-reader.test (moves held to their old answers; outside reads 220).
  First seven reads moved. Then PR 7 on: the reads moved, a few systems a PR.

## Found

- The table is now the one list of switch names for card A's `sw` (the
  report) and card K's `flag` (the wire table): each is to read it.
- New switch rows: L's resets and doors, SK's, O's ladder; each needs `on`.
- The thrown run: 17 s a PR with no baseline (#1837); `--all` (45 min) the owner's.
- Card B's map files src/game/crowdCap.js under `monsters`; `?crowd` caps players.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O's knobs stay O's reads (step 2.4): `?pixbudget`, `?res`,
  `?onebatch`, `?lookpalette`, `?pace`, `?crowd`, the passes'; and `govern`
  (a value on the page) is a need the reader cannot resolve.

## Needs

- The gatekeeper: PR 6.
