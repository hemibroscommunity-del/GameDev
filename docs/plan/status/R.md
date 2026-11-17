card: R
branch: claude/plan-r-3-weapon-gid (one branch a PR, each begun from main)
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922: merged; #1873 (5282): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- PR 3 (5282, #1873, ready, sitting 21): a weapon's own id; main b2d763a9
  merged in (OPS's #1891 and #1872 live). Schema 21 -> 22: a stored
  record's shape, merged on a line of its own.

## Next

- After #1873: the escrow ledger's other rows, in the planned order. The
  arena's stakes once L's arena door (#1930) merges; the market and the
  auction house only AFTER K's 5194, 5196, 5197 (`market.js`, `store.js`).
  No side work in K's or L's files while waiting.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join's quest maps are plain copies: prototype-free ones, later.

## Needs

- The owner's costs, OFF: `fullsnap` (PR 6: 2 keys more read a player a
  day), `resetbook` (PR 6: one room row, a write a restart; nothing live
  reads it, the census unmoved), `xferescrow` (PR 11: a row a wagered duel).
- LATER (PR 9, "Just go recommended"): the lab's restore try (lab.yml).
- Live flags: `storesize`, `roomexport` on; `roomrewind` off (the owner).
- A tag for each escrow row PR still to come: 5292 onward from R's block
  (5280-5299), unless the planning session says otherwise.
