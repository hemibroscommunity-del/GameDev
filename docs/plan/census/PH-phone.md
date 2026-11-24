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

## mp-membudget, three more runs with PR 2 (bce0ac59), the test box, 2026-11-24

Run on PR 3's provisional lines (so they FAILED where noted); the game's code is
main's plus PR 2's alarm, which no line reads.

| line | run 4 | run 5 | run 6 | six runs: highest | scatter | PR 3's line |
|---|---|---|---|---|---|---|
| artCache | 11.2 | 11.2 | 11.2 | 11.2 | 0 | 12.2 |
| gpu | 83.8 | 81.0 | 76.4 | 83.8 | 10.2 | 94.0 |
| canvases | 12.7 | 12.7 | 12.7 | 13.7 | 1.0 | 14.7 |
| sound | 18.1 | 18.1 | 18.1 | 18.1 | 0.2 | 19.1 |
| heap | 39.7 | 39.8 | 39.9 | 39.9 | 1.7 | 40.0 (kept) |
| buffers | 24.8 | 24.9 | 24.9 | 24.9 | 0.5 | 24.8 (kept: over in two) |
| workers | 18.6 | 18.5 | 18.1 | 21.2 | 3.1 | 24.3 |
| total | 207.8 | 205.1 | 199.6 | 207.8 | 8.2 | 216.0 (new) |

The total is read only in runs 4 to 6 (READ.total is new). Heap and buffers sit
AT their lines on main's own code on this box: CI's own run decides.

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
