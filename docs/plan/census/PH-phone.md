# Card PH: the phone's truth -- readings and the owner's words (v2.3.6501)

Every number here says where it was measured (finish.md part 5, rule 4).

## The owner's five minutes (finish.md part 9, call 1)

Not answered yet (2026-11-23 23:25 UTC). The owner's words go here as said:
the Speed test's table, `?govern=0` against on when warm, `?groundsend=0`
on the board.

## mp-membudget, three runs on `main` 0aec6482, the test box, 2026-11-23

| line | run 1 | run 2 | run 3 | highest | scatter | line today |
|---|---|---|---|---|---|---|
| artCache | 11.2 | 11.2 | 11.2 | 11.2 | 0 | 79.3 |
| gpu | 77.8 | 73.6 | 75.6 | 77.8 | 4.2 | 109.3 |
| canvases | 13.7 | 13.7 | 12.7 | 13.7 | 1.0 | 54.3 |
| sound | 17.9 | 17.9 | 17.9 | 17.9 | 0 | 22 |
| heap | 38.2 | 39.0 | 38.5 | 39.0 | 0.8 | 40.0 |
| buffers | 24.4 | 24.5 | 24.5 | 24.5 | 0.1 | 24.8 |
| workers | 21.2 | 20.7 | 18.2 | 21.2 | 3.0 | 36 |

Highest readings sum to 206.3 MB; the lines to 365.7. All three runs PASS.
PR 3 (6502): each line = highest + scatter (a lowered line locks a saving
in); a TOTAL line added. The game's own count (art + chip + sound) at its
highest: 106.4 (run 1, trip 3 home again); at a fight 98.4.

## mp-crowdfight, `main` 0aec6482, the test box, 2026-11-23 (the fight only)

- alone at the Flame Fields: chip 71.1, art 11.2.
- 10 bots: chip 71.6, art 11.6, sound 17.5 -> the game's own total 100.7.
- 30 bots: NOT READ (the run was stopped at the hand-over). The next
  session reads it: `BT_NO_TRACE=1 BT_CF_PLACES=fight BT_CF_STEPS=10,30
  node tools/qa/mp/run.mjs crowdfight` (about 30 minutes; a helper's).

## The memory alarm's level (PR 2, 6501)

Waits for the owner's yes (finish.md part 9, call 3) and the 30-bot
reading: "just above what the game reads in a crowded fight" =
MEM_ALARM.READ (that reading) and MEM_ALARM.MB a little over it
(frame-pacer.test 23a: over READ, at most 1.25 x READ, under 200).
