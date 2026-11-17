card: T
branch: claude/plan-t-11-reads3 (one branch a PR, each begun from main once the one before merged)
prs: #1754 ... #1889, #1935, #1939, #1958 (5301-5310, merged)
state: stalled

## Done

- PR 1 (5301, #1754): the table, the scanner, the census guard, the page.
- PR 2 (5302, #1768): the page's game-side rows; the scanner's shapes.
- PR 3 (5303, #1816): the drawing side's rows, unlisted 0; B's map reads it.
- PR 4 (5304, #1817, for #1804): a row's place by its name (check 10);
  needs and readers (check 11); the thrown run (thrown.mjs, a preload).
- PR 5 (5305, #1837): the end date (`on`, `--due`, the fallback hold).
- PR 6 (5306, #1863): the page's one reader, src/game/switches.js; its guard.
- 5307 (#1889): the thrown run's preload changes nothing by itself.
- 5308 (#1935): the `on` days of sittings 19-21's rows.
- 5309 (#1939): nine reads moved; the outside line 212.
- 5310 (#1958): eleven more; the line 201; READER_IMPORT takes `../../`.

## Next

- 5311 waits on the question under Needs.

## Found

- The table is now the one list of switch names for card A's `sw` (the
  report) and card K's `flag` (the wire table): each is to read it.
- New switch rows need `on`; a page row also `--write` (the reader's forms).
- Card B's map files src/game/crowdCap.js under `monsters`; `?crowd` caps players.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O's knobs stay O's reads (step 2.4): `?pixbudget`, `?res`,
  `?onebatch`, `?lookpalette`, `?pace`, `?crowd`, the passes'; and `govern`
  (a value on the page) is a need the reader cannot resolve.
- `?bandbeat` stays outside: server/test/held-sweep.test.mjs 10a pins its
  regex in BottomDashboard.jsx's text (card H's test).

## Needs

- The planning session: the free files' last reads hand the whole address to
  a rule (`killXpOn(location.search)`, `q ?? location.search`) or parse a
  value (`?tod=`, `?halloween=`). Recommended: switches.js exports
  `pageAddress()` (the one read) and those sites call it; meaning unchanged.
  Or should each rule ask `readerFor(q).sw(name)` instead?
