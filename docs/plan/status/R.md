card: R
branch: claude/plan-r-14-weapon-reader (one branch a PR, each begun from main)
prs: #1819, #1823, #1825, #1844, #1862, #1847, #1877, #1887, #1895, #1898, #1922: merged; #1950 (5292), PR 14 (5294): ready; #1873 (5282): held
state: ready

## Done

- Merged: PR 1 (5280, #1819), PR 4 (5283, #1823), PR 8 (5287, #1825),
  PR 9 (5288, #1844), PR 2 (5281, #1862), PR 7 (5286, #1847).
- Merged, sitting 20: PR 5 (5284, #1877), PR 6 (5285, #1887), PR 11 (5290,
  #1895, the duel pot's row), PR 10 (5289, #1898), PR 12 (5291, #1922).
- PR 3 (5282, #1873, HELD by sitting 23): a roll-back past it lost every
  weapon carrying a gid (no schema gate outside `rpg:`). Waits for PR 14.
- PR 13 (5292, #1950, sitting 23): the arena's stakes' ledger rows.
- PR 14 (5294, this branch, ready): the tolerant weapon reader, first
  (gear.js, gearprov.js GID_RE); deploys before #1873.

## Next

- After PR 14 deploys: #1873 again, with sitting 23's worldsum.js:90 low.
- Tag 5295: #1950's two lows (econcard itemsOf counts `share:` ids; IDS_MAX
  cuts shares). `econcard.js` is outside the card: decided by the planner.
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
