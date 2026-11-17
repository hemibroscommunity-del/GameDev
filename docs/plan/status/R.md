card: R
branch: claude/plan-r-14-weapon-reader (one branch a PR, each begun from main)
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922, #1961: merged; #1960 (5294), #1969 (5295): ready; #1873 (5282): held
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- Merged, sitting 23: PR 13 (5292, #1961, which replaced #1950): the
  arena's stakes' ledger rows.
- PR 3 (5282, #1873, HELD by sitting 23): a roll-back past it lost every
  weapon carrying a gid (no schema gate outside `rpg:`). Waits for PR 14
  deployed; a later sitting.
- PR 14 (5294, #1960, sitting 24): the tolerant weapon reader, first
  (gear.js, gearprov.js GID_RE); deploys before #1873.
- PR 15 (5295, #1969, sitting 24): #1961's two lows (a share's own bound,
  SHARES_MAX 128; the owner's card counts no item for a share).
  `econcard.js` is outside the card: decided by the planner.

## Next

- After PR 14 deploys: #1873 again, with sitting 23's worldsum.js:90 low.
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
