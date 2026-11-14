card: R
branch: claude/plan-r-4-points (one branch a PR, each begun from main)
prs: #1819 (5280, ready), #1823 (5283, ready)
state: ready

## Done

- PR 1 (5280, #1819, ready): the roads between players (`playerroads.js`,
  14 rows, all zero); `XFER.ROADS`/`KILLS` made from it; strict guard.

## Next

- PR 4 (5283, #1823, ready): the skill points' door (`skillpoints.js`, 26
  roads; step 1, no sum changes); `skillpoints-door.test`.
- Then the next free PR while PR 2 waits.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (the old grid's
  level-up from build points is dead).

## Needs

- PR 2 (5281) waits for card K's 5181 and 5184 (`index.js`) and card L's
  trade door (#1809, `trade2.js`), merged. PRs 3, 5, 6 wait for PR 2.
- PR 7 (5286) waits for card K's 5182 (the wire table's columns).
- No new live flag or switch row in PRs 1 and 4 (neither changes behaviour).
- Asked (planning session): may PR 1 change one line of SHAPES part 7
  (its 10.5 row) to point at part 3's built table?
- PR 4 names a road in one line each of `power.js` and four test files
  (`power.test`, `power-sim`, `statboards.test`, card PW's, done;
  `one-level.test`, `points-reset.test`): the deal now takes its road.
