card: SB
branch: claude/plan-sb-3-groundsend
prs: #2228 (6380): merged; 6381 parked (no PR); #2253 (6382): ready
state: ready

## Done

- #2228 (6380): `ride` station in mp-heldsweep (+ `ridewalk`);
  docs/plan/census/SB-ride.md; held-budget STATION_LINES.ride (12). Merged.
- 6381 (`?atlasrow`, the atlas's row sent alone): measured 0.43 -> 0.15 ms
  a send; parked by the planning session (a sliver), branch
  claude/plan-sb-2-atlasrow kept, no PR, no switch row on main.

- #2253 (6382, `?groundsend=0`): on the board the ground's worker is asked
  for 6 pieces at a time, not 3, and the side it rolls away from is let go
  sooner: view unlaid 19.3 -> 3.1% (plain), 33.5 -> 8.0% (budget-android);
  +3.4 MB at worst riding (approved; mp-rideheld's lines at the peak).
- Timed, no PR (the planning session agreed): the strip reader's worker
  remade (6.7 ms at most), framePack's slices (15 ms once, a collection).

## Next

- Nothing: the card's stop rule is met (the ride under its line plain).
  Card SB is done when #2253 merges. Left over the line on budget-android's
  ride: HB2's families, the garbage collector, timers, messages (RR).

## Found

- mp-skateboard red ON MAIN on this box (main's own build: parts 4, 5,
  5b, 5c, 8, 10; the phone comes off the board on its own): card RR's file.

## Needs

- Nothing.
