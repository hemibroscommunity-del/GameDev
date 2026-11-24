card: Z
branch: claude/plan-z-sitting-58
prs: CK #2305 #2307, BK #2299, DG #2283, LS #2311 (listed); this PR (tag 6270), the last line
state: ready

## Done
- `census/review-z58.md`: 22 PRs checked against their cards at their heads
  (the orchestrator's 21 and #2300), each read by a purpose lane (top model,
  plants); 5 listed, 17 held or waiting on a held PR, each with its planted
  line. Rehearsed on `main` b966af81, the list in order: tree fa2b5d51
  (fa2b5d51422b758816fb137a666afe8b7ebbc04b): precheck 0 FAIL (176 s),
  every switch thrown once (89, 2420 suite runs, 759 s), build, questline
  187 passed; then `mp-loginspin` 39/39, and red (4 FAIL) with the window's
  old `open()` planted. One merge base each, step by step; every base `main`.
## The list: merge in this order, "Create a merge commit", in one go
1 #2305 (CK 6425, tools)  2 #2307 (CK 6424, Server CI: the owner's words)
3 #2299 (BK 6462)  4 #2283 (DG 6440)  (3 and 4 DEPLOY, `server/test/**`
only: no worker code changes)  5 #2311 (LS 6560, the page only)
6 Z (6270, a draft: mark it ready first).
## Held / To 59
- Held, each a plant green in the PR's own guard (review-z58): #2273
  (an early return before `thawResume`), #2285 (the actor made only while
  `actor` is on), #2293 (`_in.dy || S.stickY`; the fifth argument),
  #2286 (`new URL(location)`; a spread of a variable), #2287 (a named
  forEach callback), #2298 (`import()`, a destructured namespace, `bind`),
  #2279 (seconds as minutes; the ride's bounds), #2291 (`memFull(ts)` reads
  no address), #2301 (a computed key), #2295 (a destructured `channel`;
  `[first]` of the stash), #2310 (the count mode lets in every refusal; its
  head is off the mended stack).
- Waiting on a held PR under them (own part passed): #2290, #2302, #2303
  (WL), #2297 (PH), #2309 (BK), #2300 (DG).
- To 59: those re-pushed; #2312 (DG.md clashes); #2306 (`playable` timed out).
## Found
- BK: gear and pet listings undriven (chaos §7). DG: a row dropped from
  `GUARDED` unseen; #2310's row forms unpinned. D: `state-census --json`
  misses const-key writes. WL: `_tree.mjs` skips a spread. The memory
  lines' `measured` stale. `finish.md` part 9: the reach is 1.92 at worst.
## Needs
- Nothing from the owner for this list. The orchestrator: confirm card LS
  (it came in #2311's own commit) and #2293's edit to CT.md (item 6).
