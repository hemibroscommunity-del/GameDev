card: T
branch: claude/plan-t-5-due (one branch a PR, each begun from main once the one before merged)
prs: #1754, #1768, #1816, #1817 (5301-5304, merged); #1837 (5305, ready)
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

## Next

- #1837 (5305): the end date. `on` on every switch row (a day from git,
  `onBy` where a later change turned it on, `'off'` for 2 opt-ins);
  `--due` (101 may go today, nothing reaped); the fallback hold (check 12,
  `FALLBACKS` a census of 5). Then PR 6 (5306), the page's one reader.

## Found

- The table is now the one list of switch names for card A's `sw` (the
  report) and card K's `flag` (the wire table): each is to read it.
- New switch rows: L's resets and doors, SK's, O's ladder; each needs `on`.
- The thrown run: 17 s a PR with no baseline (#1837); `--all` (45 min) the owner's.
- Card B's map files src/game/crowdCap.js under `monsters`; `?crowd` caps players.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O (planning session, 2026-11-14): the device knobs' off-ramps
  become overrides of O's ladder (step 2.4). PR 7 leaves their reads to O,
  unmoved: `?pixbudget`, `?res`, `?onebatch`, `?lookpalette`, `?pace`,
  `?crowd`, and the passes'. They keep their rows as they are today.

## Needs

- The gatekeeper: #1837.
