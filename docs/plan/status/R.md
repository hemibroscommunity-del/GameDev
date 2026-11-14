card: R
branch: claude/plan-r-7-export (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287): merged; #1844 (5288), PR 7 (5286): ready
state: ready

## Done

- PR 1 (5280, #1819, merged): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, merged): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, merged): the storage's size in the day's book (ON).
- PR 9 (5288, #1844, ready): the room's way back (`restore.js`,
  `roomrewind` OFF by default) and the lab's restore try (files only).
- PR 7 (5286, `claude/plan-r-7-export`, ready): the paged export (admin.js
  `exportPage`, `roomexport` OFF by default; spec `docs/specs/room-export.md`).

## Next

- Waiting (the planning session: no side work). PR 2 (5281) waits on card
  K's 5184 (#1838, sitting 16).
- The next PR on the table (PR 2): the gatekeeper's low (review-z13): an
  `xfer` row's road must be a `move` road, or name its writer.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: `sql.databaseSize`, `getCurrentBookmark` work;
  `getBookmarkForTime` throws (no point-in-time recovery locally).

## Needs

- PR 2 (5281): card K's 5184 merged (K's 5181 and L's #1809 are).
  PRs 3, 5, 6 wait for PR 2.
- Taken from card K: an honest `character_reset` reads to the world's sum
  as value gone; R mends it in PR 6 (5285: persistence.js, its roads).
- For the owner (PR 9): the lab's restore try needs `lab.yml` changed (a
  `restore` input, `timeout-minutes: 90`, a run line; the lines are in
  `docs/specs/cloudflare-lab.md`); about 65 Actions minutes.
- A cost question for the owner (PR 7): the export reads up to 50 rows a
  page (200 at most), and the whole room once over is every row it holds.
- New live flags, a row each: `storesize` (PR 8, on), `roomrewind` (PR 9)
  and `roomexport` (PR 7), each off until the owner sets it.
