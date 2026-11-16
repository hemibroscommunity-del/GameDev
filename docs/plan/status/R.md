card: R
branch: claude/plan-r-5-quest-door (one branch a PR, each begun from main)
prs: #1819 (5280), #1823 (5283), #1825 (5287), #1844 (5288), #1862 (5281), #1847 (5286): merged; #1873 (5282), PR 5 (5284): ready
state: ready

## Done

- PR 1 (5280, #1819, merged): the roads between players (`playerroads.js`).
- PR 4 (5283, #1823, merged): the skill points' door (`skillpoints.js`).
- PR 8 (5287, #1825, merged): the storage's size in the day's book (ON).
- PR 9 (5288, #1844, merged): the room's way back (`restore.js`, OFF).
- PR 2 (5281, #1862, merged): the stashes' door (`stash.js`, 35 roads).
- PR 7 (5286, #1847, merged): the paged export (allow list; ON).
- PR 3 (5282, #1873, ready): a weapon's own id (schema 22; waits for
  card OPS's first PR and RT-2's rollback guide, #1872).
- PR 5 (5284, `claude/plan-r-5-quest-door`, ready): quest state's door
  (`queststate.js`, 19 roads, seven verbs; nothing a player sees changes).

## Next

- Waiting (the planning session: no side work). Then PR 6 (a player's
  restore from the registry, and the honest `character_reset`).

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- The stash cuts that remain after PR 2: for later (stash-door.md).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join loads the quest maps as plain copies (with a prototype); every
  id written is the server's own table's: prototype-free copies, later.

## Needs

- Taken from card K: an honest `character_reset` reads to the world's sum
  as value gone; R mends it in PR 6 (5285: persistence.js, its roads).
- For the owner, LATER (PR 9; the owner's "Just go recommended": not now):
  the lab's restore try (`lab.yml` lines in `docs/specs/cloudflare-lab.md`).
- New live flags, a row each: `storesize` (PR 8, on), `roomexport` (PR 7,
  on), `roomrewind` (PR 9, off until the owner sets it).
