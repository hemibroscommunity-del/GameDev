card: R
branch: claude/plan-r-3-weapon-gid (#1873); claude/plan-r-15-share-lows (#1969); one a PR, each from main
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922, #1961, #1960: merged; #1873 (5282), #1969 (5295): ready
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- Merged, sitting 23: PR 13 (5292, #1961, which replaced #1950): the
  arena's stakes' ledger rows.
- Merged, sitting 24: PR 14 (5294, #1960), the tolerant weapon reader.
- PR 3 (5282, #1873, ready once #1960's deploy is live; save shape 21 -> 22,
  a line of its own): main merged, one GID_RE; sitting 23's worldsum low fixed.
- PR 15 (5295, #1969, sitting 25): #1961's two lows (a share's own bound,
  SHARES_MAX 128; the owner's card counts no item for a share).
  `econcard.js` is outside the card: decided by the planner.

## Next

- #1873 and #1969 to sitting 25 (main merged into #1969 when it lands).
- Tag 5293 (market, auction house) only AFTER K's 5194, 5196, 5197.

## Found

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller (dead).
- Local workerd: no point-in-time recovery (`getBookmarkForTime` throws).
- The join's quest maps are plain copies: prototype-free ones, later.
- `arena_entries` stays `none`: not on the card's list; a pool (gladiator.js).

## Needs

- The owner's costs, OFF: `fullsnap` (PR 6: 2 keys more read a player a
  day), `resetbook` (PR 6: one room row, a write a restart), `xferescrow`
  (PR 11: a row a wagered duel; PR 13: a row a losing stake a match).
- LATER (PR 9, "Just go recommended"): the lab's restore try (lab.yml).
- Live flags: `storesize`, `roomexport` on; `roomrewind` off (the owner).
