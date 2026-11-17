card: OPS
branch: claude/plan-ops-7b-seatmend (on main 8149d61e; PR 11, PR 8, 5613 on their own)
prs: #1944 (5610), #1951 (5607), #1957 (5613), the seat mend (5612): ready
state: ready

## Done

- RT-2's findings (#1867, draft); #1871 migrations guard; #1872 OPERATIONS.
- Merged in sitting 19b: #1874 (5600) card; #1880 (5601) `/health/room`;
  #1886 (5604) `rf_spread`; #1908 (5606) `seathold` OFF; #1891 (5602),
  #1893 (5603), #1905 (5605), #1917 (5611) the Test panel's rows; #1913
  (5608) the boards; #1920 (5609) `publicreads`.
- #1944 (5610) `guestlazy`: a guest's join 5 rows -> 0, keyed unchanged
  (`docs/specs/guest-lazy.md`).

## Next

- The seathold mend (5612), OFF: seat-hold 43/43; seatrace (a 300 ms
  join) blip 6/6 (main 5/6), restart 6/6 (main 5/6). Its
  src/networking/wsClient.js line (K's chain file, outside the card's
  list) decided by the planner, 2026-11-17.

## Found

- Card T: under `switches-thrown`'s preload, `cold-flags` and `tick-pace`
  fail with any flag (no baseline on a PR): OPS's switches are in `ops`.
- `mp-itemdrop` is red on main b2d763a9 (16/18: 5b the flash, 6a the
  trout drop); on PR 11 also 5a/5c once (the dropper's card timing out).
  The test's (TRAPS §177), not guestlazy's.

## Needs


- `seathold` stays OFF; mended in 5612, ON is the owner's word (at most
  5,760 writes a day, and one as the room empties).
- 19b's LOW: a kept public read can be up to 3 s stale after a socket
  write (noted; fixed only if cheap).
- The owner: the draw page reads a contest's window by the hour, outward
  (decided for the owner; `exactseen` re-runs an old draw exactly).
