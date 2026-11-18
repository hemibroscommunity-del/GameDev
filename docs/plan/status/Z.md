card: Z
branch: claude/plan-z-sitting-52
prs: RR #2251, #2256; LR #2252; HB2 #2254, #2257; SB #2253; EN #2255 (ready); this PR (tag 6266), the last line
state: ready

## Done
- `census/review-z52.md`: 7 PRs checked against their cards; #2253, #2255,
  #2254 and #2257 reviewed (SB's mends folded into #2253 at a978e2e4);
  merge bases one each, step by step; rehearsed on `main` 1cd3fced:
  REHEARSAL3. Deploys 44381829545 and 44382339345: success. WD3 done.
## The list: merge in this order, "Create a merge commit", in one go
1 #2251 (RR 6300)  2 #2256 (RR 6301, stacked on #2251)  3 #2252 (LR 6362)
4 #2254 (HB2 6284)  5 #2253 (SB 6382, head a978e2e4)  6 #2255 (EN 6204)
7 #2257 (HB2 6285)  8 Z (6266).  No server file: nothing deploys.
## Held / To 53
- None held at close. #2253 was held 21:32-22:23 at SB's word (its ride's
  peak 89 MB on a fast lap) and came back at a978e2e4 (look ahead 1.5x).
- To 53: RR #2258 (6302, mp-firststeps; ready 23:11, after the close;
  stacked on #2256); HB2 #2244, #2247, #2249 (6281-6283; drafts, merge main first:
  WD3's words); mark LR and SB done once #2252 and #2253 merge; RR's
  next (the reds to trace, the slow checks, the rejoin loop); EN 6205 on.
## Found
- `mp-membudget`'s heap line 38.5 MB: red on main about half the time
  here (38.4-38.8), the merged tree 38.5-39.3; no card owns it (the
  planning session's call: a card to bring it down, or a re-measured line).
- `mp-skateboard`: green alone on #2253's head (30/30) and on main (RR);
  SB's earlier red was a busy box. Not a red on main.
- RR's census: recoverpay, firststeps 6, deskkeys, headframes, quietphone,
  desklunge, cuelevels 3, brocard 4 and geartab sideways (HB2's screens),
  waterfrog hangs (part 6), hairstencil 3 parts: RR's to trace.
- 46-51 carried: gatekeeper.mjs's 15-min precheck cap (860-873 s here;
  RR's 3); `state-census --check` red on main (EN's find); the rejoin
  loop (RR's last). gatekeeper.mjs could not fetch here (branches fetched
  by hand first).
## Needs
- Decided for the owner while away: SB `groundsend` ON (`?groundsend=0`):
  the board's look ahead 1.5x, the ride's memory at or under the on-foot
  peak (re-decided from "+3.4 MB" on SB's re-measure). Parked: `atlasrow`.
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form; RR's full 388-scenario sweep (a sample now).
