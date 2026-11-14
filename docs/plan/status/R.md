card: R
branch: claude/plan-r-8-size (one branch a PR, each begun from main)
prs: #1819 (5280, ready), #1823 (5283, ready), PR 8 tag 5287 (working)
state: working

## Done

- PR 1 (5280, #1819, ready): the roads between players (`playerroads.js`,
  14 rows, all zero); `XFER.ROADS`/`KILLS` made from it; strict guard.
- PR 4 (5283, #1823, ready): the skill points' door (`skillpoints.js`, 26
  roads; step 1, no sum changes); `skillpoints-door.test`.

## Next

- PR 8 (5287): the storage's size in the day's book (part `size`, riding;
  `databaseSize` reads no row); its line on the owner's card. New live
  flag `storesize` (a row of its own in the switch table).
- Then PR 9 (5288), the room's way back: tested on a stand-in storage only
  (local workerd: "does not implement point-in-time recovery").

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd (wrangler dev): `sql.databaseSize` and
  `getCurrentBookmark` work; `getBookmarkForTime` throws (no PITR locally).

## Needs

- PR 2 (5281) waits for card K's 5181 and 5184 (`index.js`) and card L's
  trade door (#1809, `trade2.js`), merged. PRs 3, 5, 6 wait for PR 2.
- PR 7 (5286) waits for card K's 5182 (the wire table's columns).
- Asked (planning session): may PR 1 change one line of SHAPES part 7
  (its 10.5 row), and PR 8 its day's book row (the part `size`)?
- PR 4 names a road in one line each of `power.js` and five test files.
