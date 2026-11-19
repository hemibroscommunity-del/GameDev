card: SB
branch: claude/plan-sb-3-groundsend
prs: #2228 (6380): merged; 6381 parked (no PR); #2253 (6382): working (Z52's mends folded in)
state: working

## Done

- #2228 (6380): `ride` station in mp-heldsweep (+ `ridewalk`);
  docs/plan/census/SB-ride.md; held-budget STATION_LINES.ride (12). Merged.
- 6381 (`?atlasrow`, the atlas's row sent alone): measured 0.43 -> 0.15 ms
  a send; parked by the planning session (a sliver), branch
  claude/plan-sb-2-atlasrow kept, no PR, no switch row on main.

- #2253 (6382, `?groundsend=0`): on the board 6 pieces asked at a time, not
  3; the side behind let go sooner (with a hysteresis); the reach 1.5x a
  walk (a fast lap at 2x held 83 pieces / 89 MB: corrected before merge).
  Fast lap: view unlaid 5.4 -> 0.6%, pieces 82 -> 78, chip 81.5 -> 83.1 MB.
- Timed, no PR (the planning session agreed): the strip reader's worker
  remade (6.7 ms at most), framePack's slices (15 ms once, a collection).

## Next

- #2253's new head to Z52 when green (Z52's mends folded in, one PR, 6382).
  Card SB is done when it merges. Left over the line on budget-android's
  ride: HB2's families, the garbage collector, timers, messages (RR).

## Found

- mp-skateboard red ON MAIN on this box (main's own build: parts 4, 5,
  5b, 5c, 8, 10; the phone comes off the board on its own): card RR's file.

## Needs

- Nothing.
