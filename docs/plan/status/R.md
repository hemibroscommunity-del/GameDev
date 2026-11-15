card: R
branch: claude/plan-r-10-xp-door (stacked on #1895's head, the planning session's word)
prs: #1819 (5280), #1823 (5283), #1825 (5287), #1844 (5288), #1862 (5281), #1847 (5286): merged; #1873 (5282), #1877 (5284), #1887 (5285), #1895 (5290), PR 10 (5289): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862).
- PR 7 (5286, #1847, merged): the paged export (allow list; ON).
- PR 3 (5282, #1873, ready): a weapon's own id (schema 22; waits for
  card OPS's first PR and RT-2's rollback guide, #1872).
- PR 5 (5284, #1877, ready, sitting 19): quest state's door.
- PR 6 (5285, #1887, ready, sitting 19): a player's restore from the
  registry and the restart booked; `fullsnap`, `resetbook` OFF (Needs).
- PR 11 (5290, #1895, ready, sitting 19): the duel pot's ledger row.
- PR 10 (5289, `claude/plan-r-10-xp-door`, ready): experience and levels'
  door (`xp.js`, 22 roads; nothing a player sees changes).

## Next

- WAITING on K and L (no side work). THE ESCROW
  LEDGER'S ORDER (the planning session's (b)): the market, the auction
  house and the arena's stakes join in later R PRs, AFTER K's 5194, 5196,
  5197 (`market.js`, `store.js`) and L's arena door (`gladiator.js`).

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join's quest maps are plain copies: prototype-free ones, later.

## Needs

- The owner's costs, OFF: `fullsnap` (PR 6: 2 keys more read a player a
  day), `resetbook` (PR 6: one room row, a read and a write a restart; K's
  census line falls with it), `xferescrow` (PR 11: a row a wagered duel).
- LATER (PR 9, "Just go recommended"): the lab's restore try (lab.yml).
- Live flags: `storesize`, `roomexport` on; `roomrewind` off (the owner).
