card: T
branch: claude/plan-t-9-reads1 (one branch a PR, each begun from the one before)
prs: #1754, #1768, #1816, #1817, #1837, #1863, #1889 (5301-5307, merged); #1935 the `on` days (5308, ready); 5309 reads moved (ready, on #1935)
state: ready

## Done

- PR 1 (5301, #1754): the table, the scanner, the census guard, the page.
- PR 2 (5302, #1768): the page's game-side rows; the scanner's shapes.
- PR 3 (5303, #1816, for #1797): the drawing side's rows, unlisted 0; B's
  map reads the table; SHAPES' two lines point at it.
- PR 4 (5304, #1817, for #1804): a row's place by its name (check 10);
  needs and readers (check 11); the thrown run (thrown.mjs, a preload).
- PR 5 (5305, #1837): the end date (`on`, `--due`, the fallback hold).
- PR 6 (5306, #1863): the page's one reader, src/game/switches.js; its guard.
- 5307 (#1889): the thrown run's preload changes nothing by itself.

## Next

- 5309: nine reads moved (quests, skills, economy, townsfolk, audio); the
  outside line 221 -> 212 (5308 also sets
  `arenadoor`, sitting 21, to 2026-11-17). Then 5310: ui and world reads in free files.

## Found

- The table is now the one list of switch names for card A's `sw` (the
  report) and card K's `flag` (the wire table): each is to read it.
- New switch rows need `on`; a page row also `--write` (the reader's forms).
- The preload's artifact: RT-1 (#1885) and RT-3 (#1878) drop their lines and
  skip in their own PRs; OPS's own `ops` system stays (harmless).
- Card B's map files src/game/crowdCap.js under `monsters`; `?crowd` caps players.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O's knobs stay O's reads (step 2.4): `?pixbudget`, `?res`,
  `?onebatch`, `?lookpalette`, `?pace`, `?crowd`, the passes'; and `govern`
  (a value on the page) is a need the reader cannot resolve.

## Needs

- The gatekeeper: #1935 (5308), then 5309 on it (sitting 21).
