card: Z
branch: claude/plan-z-sitting-53
prs: RR #2265, #2267, #2258, #2260; HB2 #2261, #2244, #2247, #2249, #2259, #2266; EN #2263 (ready); this PR (tag 6267), the last line
state: ready

## Done
- `census/review-z53.md`: 11 PRs checked against their cards and reviewed;
  two reds on main found (usage-meter 5's date; the heap line) and mended
  on the list; merge bases one each, step by step; rehearsed on `main`
  c0a0791c, tree 3aeab427: precheck 0 FAIL (884 s), build, questline 187;
  `mp-firststeps` 46/46 on rehearsal 2's tree (#2258 with #2266).
## The list: merge in this order, "Create a merge commit", in one go
1 #2265 (RR 6305; DEPLOYS: a server test only)  2 #2267 (RR 6306, heap
38.5 -> 40.0)  3 #2258 (RR 6302)  4 #2260 (RR 6303)  5 #2261 (HB2 6287)
6 #2244 (HB2 6281)  7 #2247 (6282)  8 #2249 (6283)  9 #2259 (6286)
10 #2266 (HB2 6288)  11 #2263 (EN 6205)  12 Z (6267).
#2260's `memory-budget` is red on the heap line #2267 raises: not a hold.
## Held / To 54
- None held. To 54: tick 3.1 once #2261 is merged (`debtOf('ours')`
  empty); RR's next (the slow checks, the rejoin loop); EN 6206 on; HB2's
  leftover order (GearTab's body, then the World map labels if
  pixel-identical and freed on close).
## Found
- `usage-meter.test` 5 red on main from 00:00 UTC 2026-11-19 (a pinned
  date): RR's #2265, first on the list. Every PR merged its branch in.
- `mp-membudget`'s heap line under main's own scatter (37.4-39.2): A/B
  named no PR; RR's #2267 re-measures it (planning session's yes). About
  1 MB of creep since the last trim: a trim card's question.
- gatekeeper.mjs could not fetch (branches fetched by hand); precheck
  863-893 s here, 1138 s on RR's box: the 15-min cap is tight (RR's 3).
## Needs
- Decided while away (part 9's list): the heap line +1.5 MB (no saving
  given up; a later trim lowers it).
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form; RR's full 388-scenario sweep (a sample now).
