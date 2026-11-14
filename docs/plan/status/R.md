card: R
branch: claude/plan-r-9-rewind (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287): ready; PR 9 (5288) built
state: ready

## Done

- PR 1 (5280, #1819, ready): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, ready): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, ready): the storage's size in the day's book.
- PR 9 (5288): the room's way back (`restore.js`, POST /api/admin/rewind,
  `rewind.test`), the lab's restore try (`tools/lab/`, `--restore`).
  Built and pushed; opened once its route has its wire row (below).

## Next

- PR 9's route row in `server/src/wire/http.js`, once card K's 5182 is
  merged (the shared table: K 5181, 5182 first). Then PR 9 opens.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: `sql.databaseSize`, `getCurrentBookmark` work;
  `getBookmarkForTime` throws (no point-in-time recovery locally).

## Needs

- PR 2 (5281): card K's 5181, 5184 and card L's #1809, merged. PRs 3, 5,
  6 wait for PR 2. PR 7 (5286) and PR 9's row: card K's 5182.
- Asked (planning session): may PRs 1 and 8 change one line each of SHAPES
  part 7 (the 10.5 row; the day's book's part `size`)?
- For the owner (PR 9): the lab's restore try needs `.github/workflows/
  lab.yml` changed (a `restore` input, `timeout-minutes: 90`, the run line):
  the lines are in `docs/specs/cloudflare-lab.md`. About 65 Actions minutes.
- New live flags, a row each in the switch table: `storesize` (PR 8),
  `roomrewind` (PR 9).
