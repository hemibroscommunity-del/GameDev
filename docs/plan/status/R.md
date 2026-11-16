card: R
branch: claude/plan-r-6-player-restore (stacked on #1877's head, the planning session's word)
prs: #1819 (5280), #1823 (5283), #1825 (5287), #1844 (5288), #1862 (5281), #1847 (5286): merged; #1873 (5282), #1877 (5284), PR 6 (5285): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862).
- PR 7 (5286, #1847, merged): the paged export (allow list; ON).
- PR 3 (5282, #1873, ready): a weapon's own id (schema 22; waits for
  card OPS's first PR and RT-2's rollback guide, #1872).
- PR 5 (5284, #1877, ready, sitting 20): quest state's door.
- PR 6 (5285, #1887, ready, sitting 20): a player's restore and the restart
  booked; `fullsnap`, `resetbook` OFF (Needs); sitting 20's three mended.

## Next

- NEXT PR (sitting 20): the credit guards read `_creditWith(` too (first:
  a double-pay risk); quest-door's scanner `||=`, `??=`, Object.assign.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join loads the quest maps as plain copies (with a prototype); every
  id written is the server's own table's: prototype-free copies, later.

## Needs

- The owner's call, two costs (PR 6): `fullsnap` (2 keys more read a
  player a day, a copy ~190 bytes bigger) and `resetbook` (one row for the
  room, a write a restart; nothing live reads it, the census unmoved).
- For the owner, LATER (PR 9; the owner's "Just go recommended": not now):
  the lab's restore try (`lab.yml` lines in `docs/specs/cloudflare-lab.md`).
- New live flags, a row each: `storesize` (PR 8, on), `roomexport` (PR 7,
  on), `roomrewind` (PR 9, off until the owner sets it).
