card: SB
branch: claude/plan-sb-3-groundsend
prs: #2228 (6380): merged; 6381 parked (no PR); PR 6382: working
state: working

## Done

- #2228 (6380): `ride` station in mp-heldsweep (+ `ridewalk`);
  docs/plan/census/SB-ride.md; held-budget STATION_LINES.ride (12). Merged.
- 6381 (`?atlasrow`, the atlas's row sent alone): measured 0.43 -> 0.15 ms
  a send; parked by the planning session (a sliver), branch
  claude/plan-sb-2-atlasrow kept, no PR, no switch row on main.

## Next

- PR 6382 (`?groundsend=0`): on the board the ground's worker is asked for
  6 pieces at a time, not 3, and the side it rolls away from is let go
  sooner. mp-rideheld: view unlaid 19.3 -> 3.1% (plain), 33.5 -> 8.0%
  (budget-android); +3.4 MB at worst riding (approved, a line at the peak).
  Then the strip reader's worker remade, framePack _pack (timed first).

## Found

- mp-skateboard parts 3-4 red here (the phone off the board before part
  3); same on the parked 6381 branch; checking main (TRAPS §177).
- stripRead.js lets its worker go after 4 s idle and remakes it (now SB's).

## Needs

- Nothing (the planning session, 18:58: ship 6382 as is, memory line).
