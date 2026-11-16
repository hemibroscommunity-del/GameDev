card: OPS
branch: claude/plan-ops-1-card (one line: #1874 > #1880 > #1886 > #1908 > #1891 > #1872 > #1893 > #1905 > #1913 > #1917 > #1920)
prs: #1874 (5600), #1880 (5601), #1886 (5604), #1908 (5606), #1891 (5602), #1872 (5588), #1893 (5603), #1905 (5605), #1913 (5608), #1917 (5611), #1920 (5609): ready, in that order; #1871 (5587) ready
state: ready

## Done

- RT-2's findings (#1867, the record, draft); #1871 the migrations guard;
  #1872 OPERATIONS, rolling back (its step 2 is the Test panel's row).
- #1874 (5600) the card. #1880 (5601) `/health/room` (`roomhealth`), the
  `ops` system.
- #1886 (5604) `rf_spread`: 800 waiting knock 81/s, not 159 (local).
- #1908 (5606) `seathold`, OFF: a restart keeps 6 of 6 (off 1), a blip 6
  of 6 (off 3); local, 30 waiting.
- The Test panel: #1891 (5602) sets a switch; #1893 (5603) the feedback
  rows (with #1878); #1905 (5605) silence from a report (with #1897).
- #1913 (5608) the boards: kept a minute, swept, `playtime` on its own
  board, `lastSeen` by the hour (`boardcache`; `exactseen` the exact time).
- #1917 (5611) rename from the Test panel (MOD's #1907); `mp-renameowner`.
- #1920 (5609) `publicreads`: 400 reads of one answer walk once (local).

## Next

- PR 11 (5610) parked on `claude/plan-ops-11-guestlazy` (no PR); then PR 8.

## Found

- Card T: under `switches-thrown`'s preload, `cold-flags` and `tick-pace`
  fail with any flag (no baseline on a PR): OPS's switches are in `ops`.

## Needs

- `seathold` stays OFF: not to be turned on until mended (sitting 19b's
  review, docs/specs/seat-hold.md); ON, at most 5,760 writes a day.
- PR 8 (5607) is free (card R's #1847 merged); after the restack.
- The owner: the draw page reads a contest's window by the hour, outward
  (decided for the owner; `exactseen` re-runs an old draw exactly).
