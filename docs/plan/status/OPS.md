card: OPS
branch: claude/plan-ops-done (on main 3511ec78)
prs: none open (every card PR merged)
state: done

## Done

- RT-2's findings (#1867, draft); #1871 migrations guard; #1872 OPERATIONS.
- Merged in sitting 19b: #1874 (5600) card; #1880 (5601) `/health/room`;
  #1886 (5604) `rf_spread`; #1908 (5606) `seathold` OFF; #1891 (5602),
  #1893 (5603), #1905 (5605), #1917 (5611) the Test panel's rows; #1913
  (5608) the boards; #1920 (5609) `publicreads`.
- Merged 2026-11-17: #1944 (5610) `guestlazy` (a guest's join 5 rows ->
  0); #1951 (5607) the owner's reads paged; #1957 (5613) socket writes
  drop the kept read; #1966 (5612) the seat mend, OFF; #1968 (5614).

## Next

- Nothing: the card is done.

## Found

- Card T: under `switches-thrown`'s preload, `cold-flags` and `tick-pace`
  fail with any flag (no baseline on a PR): OPS's switches are in `ops`.
- `mp-itemdrop` is red on main b2d763a9 (16/18: 5b the flash, 6a the
  trout drop); on PR 11 also 5a/5c once (the dropper's card timing out).
  The test's (TRAPS §177), not guestlazy's.

## Needs

- MOD: a report against a guest that never earned (`not-found`), the
  planner's word (sitting 23's review).
- `seathold` stays OFF; mended in 5612, ON is the owner's word (at most
  5,760 writes a day, and one as the room empties).
- The owner: the draw page reads a contest's window by the hour, outward
  (decided for the owner; `exactseen` re-runs an old draw exactly).
