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
- 30 bots: CANNOT BE READ on the test box. Part 2's helper ran
  `BT_NO_TRACE=1 BT_CF_PLACES=fight BT_CF_STEPS=10,30 node tools/qa/mp/run.mjs crowdfight`
  (1018 s): 10 bots read again as chip 75.7, art 11.7, sound 17.5 (total 104.9),
  heap 40.5; at 30 the page answered nothing for 15 minutes (SKIP, its thread
  waiting on the graphics process).

## The memory alarm's level (PR 2, 6501)

MEM_ALARM = { READ: 106.4, MB: 120 }, ON THE TEST BOX: READ the game's own
highest total (mp-membudget, trip 3 home again; the 10-bot fight 104.9), MB 13%
over it. Decided for the owner while away (call 3 unanswered since 22:33 UTC;
the planning session, 2026-11-23, README tag 5058), behind `?memalarm=0`. The
phone's own count waits on the field report (PR 1). If the owner answers
before it merges, their words win.
