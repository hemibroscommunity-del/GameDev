card: R
branch: claude/plan-r-17-market-rows (one branch a PR, each begun from main)
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922, #1961, #1960, #1969, #1873, #1980: merged; PR 17 (5293): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- Merged, sitting 23: PR 13 (5292, #1961, which replaced #1950).
- Merged, sitting 24: PR 14 (5294, #1960), the tolerant weapon reader.
- Merged, sitting 25: PR 15 (5295, #1969); PR 3 (5282, #1873), a weapon's
  own id (save shape 22), after #1960's deploy.
- Merged: PR 16 (5296, #1980), the world sum's four lows.
- PR 17 (5293, this branch, ready): the market's and the Auction House's
  ledger rows (`xferescrow`, OFF), after K's 5194, 5196, 5197.

## Next

- After PR 17 merges, the card's PRs are all done.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- The join's quest maps are plain copies: prototype-free ones, later.
- `arena_entries` stays `none`: not on the card's list; a pool (gladiator.js).
- worldsum.js: a noted buy order's escrow gold is counted while its gold
  legs are paid (the same stamp question, for gold; not in PR 16).

## Needs

- The owner's costs, OFF: `fullsnap` (PR 6: 2 keys more read a player a
  day), `resetbook` (PR 6: one room row, a write a restart), `xferescrow`
  (PR 11: a row a wagered duel; PR 13: a row a losing stake a match;
  PR 17: a row a market cross or Auction House sale).
- LATER (PR 9, "Just go recommended"): the lab's restore try (lab.yml).
- Live flags: `storesize`, `roomexport` on; `roomrewind` off (the owner).
