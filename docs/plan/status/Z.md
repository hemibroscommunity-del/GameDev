card: Z
branch: claude/plan-z-sitting-57
prs: CK #2288 #2294 #2296, BK #2281 #2289, DG #2283, CT #2282, WL #2290 (listed); this PR (tag 6269), the last line
state: ready

## Done
- `census/review-z57.md`: 19 PRs checked against their cards at their heads
  as they stood, each read by a purpose lane (top model, plants); 8 pass,
  10 held, each with its planted line. Rehearsed on `main` b2cdd55a
  (rehearsal 3, the list in order): RESULT_LINE. One merge base each, step
  by step; every base `main`.
## The list: merge in this order, "Create a merge commit", in one go
1 #2288 (CK 6421, tools)  2 #2294 (CK 6422)  3 #2296 (CK 6423)
4 #2281 (BK 6461)  5 #2289 (BK 6464)  6 #2283 (DG 6440)  7 #2282 (CT 6540)
(2 to 7 DEPLOY, each `server/test/**` only: no worker code changes)
8 #2290 (WL 6522, a guard closing a list, last)  9 Z (6269, a draft: mark
it ready first).
## Held / To 58
- Held, each a plant green in the PR's own guard (review-z57): #2273 (a
  gap judged carried), #2279 (`up` columns raw; `rideGaps` fractions),
  #2291 (`?memalarm=0` unread in play), #2293 (the stick's Y, the corpse),
  #2295 (its `test` red: gold-door 99 s), #2285 (test burns as play;
  `gone`), #2286 (conflicts with `main`; code lines unheld), #2287
  (`forEach` writes), #2298 (namespace import), #2299 (`--whole` red
  unplanted).
- To 58: those re-pushed (review fresh); #2300 (DG), #2301 (BK), #2297.
## Found
- Card BK: `chaos-restart`'s `store_list` row drives items only;
  `piecesHeld` counts pieces, not ids; bots' dice follow their words.
- Card DG: `testroom` §7 tries four fields; a row dropped from `GUARDED`
  is unseen. Card WL: statement lines are blind to JSX and literals.
- The orchestrator's `finish.md` part 9: the reach "about 1.55" is 1.96 at
  worst over six seeds.
- #2296's 10-minute precheck cap times out on a box shared with lanes.
## Needs
- Nothing from the owner for this list. Owner's own still: `.github/`,
  Cloudflare; call 3 (the memory alarm's level, #2291, decided while away).
