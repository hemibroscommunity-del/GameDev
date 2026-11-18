card: WD
branch: claude/plan-wd-3-spec (one PR a branch, claude/plan-wd-*)
prs: #2171 (6140) census, #2179 (6141) guard, #2180 (6142) spec: ready (merge in that order)
state: ready

## Done
- (nothing merged yet)

- PR 1 (6140) #2171: tools/dev/words-census.mjs, docs/plan/census/words.md.
  Totals: 7486 player-facing (2164 in a table, 4941 in place on the page,
  381 on the worker); 2990 of them `?`; 3110 developer-only apart.

- PR 2 (6141) #2179: tools/guards/player-words.test.mjs, lines 4941 / 381;
  the break proofs fail as they should.
- PR 3 (6142) #2180: docs/specs/player-words.md, the table's shape and the order
  of moves: all 446 screens named, in waves W0 to W6 and "stays".

## Next
- Nothing: all three are green and wait for the gatekeeper. Then: done.
  #2179 and #2180 carry the PRs before them (stacked branches).

## Found
- "Wheel" a player may read: one row, `?`, src/ui/BroTown.jsx:9045 (the
  watchdog's crash note "the Wheel's ground gone"; most likely never shown).
- "remnant(s)" a player reads: none.
- "tap" outside deskWords(): 75 rows written in place in 34 files (the
  census's tap list; most in ControlsTutorial, QuestCoach, PlayerPaint,
  guideArrow, pointsTips), 21 more in src/data tables. Some are phone-only
  screens or swapped by deskWords() where drawn: a human reads the list.

## Needs
- Nothing yet.
