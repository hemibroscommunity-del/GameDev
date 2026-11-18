card: Z
branch: claude/plan-z-sitting-47
prs: this PR (tag 6261), the last line of sitting 47's list (ready)
state: ready

## Done
- `census/review-z47.md`. 4.2 ticked (K2, K4), 10.6 ticked (LG); notes
  on 7.5 (CAP), 8.1 (TL, RD), 8.8 (WD), 10.7 (LG). K4, LG, TL, RV, CAP,
  WD, CS done (TL's #2197 folded in: close it). Part 9: EN's folksheets,
  FX's buffers line.
## The list: merge in this order, each "Create a merge commit"
1-2 RD #2204, #2205 (tests; once each `test` is green and marked ready)
· 3-5 HB #2199, #2201, #2202 · 6-8 FX #2194, #2200, #2203 · 9 Z. On
`main` e898c0c7, one base at every step, every base `main`. 5 and 6
DEPLOY the worker (a file in `server/test` each): merge them one after
the other. Heads, trees: the census.
## Held / To 48
- None held. To 48: EN PR 3 (6202, not green by the cut; deploys), RD's
  crowdfight (6181), anything opened after the cut.
## Found
- 46's (a)-(aj) carried. Recorded here: CS's stale "OFF by default" in
  specs and comments (duel.js, gladiator.js, market.js, store.js,
  storeoffer.js, playerroads.js, req-once.md, seat-hold.md ...) and the
  Set-a-switch chips (ownerSwitches.js) not listing the six. TL's
  run.mjs orphans when precheck's timeout kills `npm test` (seen again
  here). LG's K4 rows: mended by K4's #2176, #2177, #2182, #2187; LG's
  rung 2 missed by every detector (LG PR 2). RV's SEC-F3 (`wsClient.js`):
  card L is done, no card owns it. WD's 96 "tap" words outside
  deskWords(). canvas-witness 8b reads only a comment. mp-membudget
  heap/buffers over on session boxes, CI fine. elemental2 maxMana under
  duelpace: watch. New: the gatekeeper's tool caps precheck at 15 min,
  under the server suite's ~12 plus the rest (tools/dev/gatekeeper.mjs).
## Needs
- Decided for the owner while away (the planning session): EN's
  folksheets ON (`?folksheets=0`, sitting 48); FX #2200's buffers line
  24.2 -> 24.8 for a net 1.7 MB saving.
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form needing a public repository.
