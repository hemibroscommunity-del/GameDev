card: R
branch: claude/plan-r-13-arena-stakes (one branch a PR, each begun from main)
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922: merged; #1873 (5282), PR 13 (5292): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- PR 3 (5282, #1873, ready, sitting 22): a weapon's own id. Schema 21 -> 22:
  a stored record's shape, merged on a line of its own.
- PR 13 (5292, this branch, ready): the arena's stakes' ledger rows (the
  planning session's reading (1): one row a losing stake, to the fighter,
  the winning sponsors' parts in `ids`); `xferescrow` still OFF.

## Next

- Then the market and the auction house (tag 5293) only AFTER K's 5194,
  5196, 5197 (`market.js`, `store.js`). No side work in K's or L's files.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- `_isGearNotWeapon` told gear by a gid alone; PR 3 reads `prov` instead.
- The join's quest maps are plain copies: prototype-free ones, later.
- `arena_entries` (the entry fees to the champion) stays `none`: not on the
  card's list; a pool among many, as the jackpot (gladiator.js).

## Needs

- The owner's costs, OFF: `fullsnap` (PR 6: 2 keys more read a player a
  day), `resetbook` (PR 6: one room row, a write a restart), `xferescrow`
  (PR 11: a row a wagered duel; PR 13: a row a losing stake a match).
- LATER (PR 9, "Just go recommended"): the lab's restore try (lab.yml).
- Live flags: `storesize`, `roomexport` on; `roomrewind` off (the owner).
