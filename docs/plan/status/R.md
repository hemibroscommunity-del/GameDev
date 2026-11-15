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
- PR 5 (5284, #1877, ready, sitting 19): quest state's door.
- PR 6 (5285, `claude/plan-r-6-player-restore`, ready): a player's restore
  from the registry (`playerrestore.js`, `RESTORE_WAYS`) and the restart
  booked (`econ_gone`); `fullsnap` and `resetbook` OFF (Needs).

## Next

- Waiting (the planning session: no side work). Then PR 10 (the XP
  door, after L's doors) and PR 11 (the escrow roads' ledger).

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- The stash cuts that remain after PR 2: for later (stash-door.md).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join loads the quest maps as plain copies (with a prototype); every
  id written is the server's own table's: prototype-free copies, later.

## Needs

- The owner's call, two costs (PR 6): `fullsnap` (2 keys more read a
  player a day, a copy ~190 bytes bigger) and `resetbook` (one row for the
  room, a read and a write a restart; card K's census line falls with it).
- For the owner, LATER (PR 9; the owner's "Just go recommended": not now):
  the lab's restore try (`lab.yml` lines in `docs/specs/cloudflare-lab.md`).
- New live flags, a row each: `storesize` (PR 8, on), `roomexport` (PR 7,
  on), `roomrewind` (PR 9, off until the owner sets it).
