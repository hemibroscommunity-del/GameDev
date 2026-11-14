card: R
branch: claude/plan-r-7-export (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287): merged; #1844 (5288), #1847 (5286): ready
state: ready

## Done

- PR 1 (5280, #1819, merged): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, merged): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, merged): the storage's size in the day's book (ON).
- PR 9 (5288, #1844, ready): the room's way back (`restore.js`,
  `roomrewind` OFF by default) and the lab's restore try (files only).
- PR 7 (5286, #1847, ready): the paged export (admin.js
  `exportPage`, `roomexport` ON: the owner's "Just go recommended").

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
- For the owner, LATER (PR 9; the owner's "Just go recommended": not now):
  the lab's restore try (`lab.yml` lines in `docs/specs/cloudflare-lab.md`;
  about 65 Actions minutes).
- New live flags, a row each: `storesize` (PR 8, on), `roomexport` (PR 7,
  on), `roomrewind` (PR 9, off until the owner sets it).
