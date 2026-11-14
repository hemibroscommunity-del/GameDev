card: T
branch: claude/plan-t-4-thrown (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1754 (5301, merged), #1768 (5302, merged), #1797 (5303, ready), PR 4 (5304, working)
state: working

## Done

- PR 1 (5301, #1754, merged): the table, the scanner, the census guard,
  `docs/SWITCHES.md`, the spec, the scoreboard row, liveops.test §8f, §8g.
- PR 2 (5302, #1768, merged): the page's game-side rows (81); sitting 8's
  mend (the scanner's shapes, each a fixture; excuses are functions);
  sitting 9's (the page carries no count: row-adding PRs merge side by side).

## Next

- #1797 (5303, ready; card O's #1787 merged in for sitting 11): the
  drawing side's rows, 458 rows, unlisted 0; B's map reads the table.
- PR 4 (5304): rule 4. A row's place set by its name (check 10, sitting
  11); needs and readers (check 11); the thrown run (thrown.mjs, a preload;
  on every PR the rows born from 5301, 16 s). The sample (17 switches):
  every fail is the switch's own but one two-switch case. The full run
  (about 45 min) is the owner's to ask for.

## Found

- `?debug`, `?nodebug` (src/debug/debugBus.js): born in April commits with
  no tag anywhere: `born: 'unknown'`, counted (the line 2).
- New switches add their own rows (the table is on `main`): card L's
  `?<system>reset=0`, card SK's `?ridecoast=0`.
- Rule 4's sample: `ahonewrite` thrown beside store-heal-wait.test's own
  `storehealwait: false` fails its check 2 (two switches off, not one).
- Card O (planning session, 2026-11-14): the device knobs' off-ramps
  become overrides of O's ladder (step 2.4). PR 7 leaves their reads to O,
  unmoved: `?pixbudget`, `?res`, `?onebatch`, `?lookpalette`, `?pace`,
  `?crowd`, and the passes'. They keep their rows as they are today.

## Needs

- The gatekeeper: #1797 merged.
