card: R
branch: claude/plan-r-7-export (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287), #1844 (5288), #1862 (5281): merged; #1847 (5286): ready
state: ready

## Done

- PR 1 (5280, #1819, merged): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, merged): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, merged): the storage's size in the day's book (ON).
- PR 9 (5288, #1844, merged): the room's way back (`restore.js`,
  `roomrewind` OFF by default) and the lab's restore try (files only).
- PR 2 (5281, #1862, merged): the stashes' door (`stash.js`, 35 roads),
  and the gatekeeper's low on `xfer` rows.
- PR 7 (5286, #1847, ready, sitting 18): the paged export (allow list; ON).

## Next

- Waiting (the planning session: no side work). PR 3 (5282, a weapon's
  own id) is free now that PR 2 is merged: on the planning session's word.
  Then PRs 5 and 6.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: `sql.databaseSize`, `getCurrentBookmark` work;
  `getBookmarkForTime` throws (no point-in-time recovery locally).
- The stash cuts that remain after PR 2 (for later, the planning session's
  word): the join's (`_sanitizeWeaponList`), the phone's capped copy, the
  gear lists' at the save (`capStash`) and the join.

## Needs

- Taken from card K: an honest `character_reset` reads to the world's sum
  as value gone; R mends it in PR 6 (5285: persistence.js, its roads).
- For the owner, LATER (PR 9; the owner's "Just go recommended": not now):
  the lab's restore try (`lab.yml` lines in `docs/specs/cloudflare-lab.md`;
  about 65 Actions minutes).
- New live flags, a row each: `storesize` (PR 8, on), `roomexport` (PR 7,
  on), `roomrewind` (PR 9, off until the owner sets it).
