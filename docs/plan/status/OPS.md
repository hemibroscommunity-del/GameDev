card: OPS
branch: claude/plan-ops-9-boards (one line: #1874 > #1880 > #1886 > #1908 > #1891 > #1872 > #1893 > #1905 > #1913)
prs: #1874 (5600), #1880 (5601), #1886 (5604), #1908 (5606), #1891 (5602), #1872 (5588), #1893 (5603), #1905 (5605), #1913 (5608): ready, in that order; #1871 (5587) ready
state: ready

## Done

- RT-2's findings (#1867, the record, draft); #1871 the migrations guard;
  #1872 OPERATIONS, rolling back (its step 2 is the Test panel's row).
- #1874 (5600) the card. #1880 (5601) `/health/room` (`roomhealth`), the
  `ops` system.
- #1886 (5604) `rf_spread`: 800 waiting knock 81/s, not 159 (local).
- #1908 (5606) `seathold`, OFF: a restart keeps 6 of 6 (off 1), a blip 6
  of 6 (off 3); local, 30 waiting.
- #1891 (5602) the Test panel sets a switch; `mp-setswitch` 8/8.
- #1893 (5603) the feedback rows; `mp-feedbackowner` 5/5 with #1878.
- #1905 (5605) silence from a chat report; `mp-silenceowner` 5/5 with
  #1897.
- #1913 (5608) the boards: kept a minute, swept, `playtime` on its own
  board, `lastSeen` by the hour (`boardcache`; `exactseen` the exact time).

## Next

- The Rename row (card MOD's #1907), on the end of the line.

## Found

- Card T: under `switches-thrown`'s preload, `cold-flags` and `tick-pace`
  fail with any flag (no baseline on a PR): OPS's switches are in `ops`.

## Needs

- `seathold` stays OFF until the owner's word: at most 5,760 writes a day
  (~17 cents a month), a quiet room none.
- PR 8 (5607) waits for card R's PR 7 (`admin.js`, `liveops.js`).
- The owner: the draw page reads a contest's window by the hour, outward
  (decided for the owner; `exactseen` re-runs an old draw exactly).
