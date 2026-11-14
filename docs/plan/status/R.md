card: R
branch: claude/plan-r-8-size (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287): ready; PR 9 (5288) built
state: ready

## Done

- PR 1 (5280, #1819, ready): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, ready): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, ready): the storage's size in the day's book (ON).
- PR 9 (5288, built on `claude/plan-r-9-rewind`): the room's way back
  (`restore.js`, `roomrewind` OFF by default) and the lab's restore try.

## Next

- Waiting (the planning session: no side work). PR 9 opens once card K's
  5182 merges (its route's row in `server/src/wire/http.js`).

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: `sql.databaseSize`, `getCurrentBookmark` work;
  `getBookmarkForTime` throws (no point-in-time recovery locally).

## Needs

- PR 2 (5281): card K's 5181, 5184 and card L's #1809, merged. PRs 3, 5,
  6 wait for PR 2. PR 7 (5286) and PR 9's row: card K's 5182.
- Taken from card K: an honest `character_reset` reads to the world's sum
  as value gone; R mends it in PR 6 (5285: persistence.js, its roads).
- For the owner (PR 9): the lab's restore try needs `lab.yml` changed (a
  `restore` input, `timeout-minutes: 90`, a run line; the lines are in
  `docs/specs/cloudflare-lab.md`); about 65 Actions minutes.
- New live flags, a row each: `storesize` (PR 8, on), `roomrewind` (PR 9,
  off until the owner sets it).
