card: Z
branch: claude/plan-z-sitting-59
prs: BK #2301 #2309 (listed); this PR (tag 6271), the last line
state: ready

## Done
- `census/review-z59.md`: 23 PRs checked against their cards at their heads
  (the orchestrator's queue of 07:25), each read by a purpose lane (top
  model, plants). Sitting 58's 47 planted lines all RED now; 2 listed, 21
  held or waiting on a held PR, each with its new planted line. Rehearsed
  on `main` 43541e5f, the list in order: tree 26e6a925
  (26e6a925447c6b34e6fe4071e243d7c9d3f9aeb3): precheck 0 FAIL (179 s),
  every switch thrown once (89, 2420 suite runs, 853 s), claims-gain
  --whole (621 s), build, questline 187 passed. One merge base each, step
  by step; both bases `main`.
## The list: merge in this order, "Create a merge commit", in one go
1 #2301 (BK 6463; DEPLOYS)  2 #2309 (BK 6465; DEPLOYS)
3 Z (6271, a draft: mark it ready first).
## Held / To 60
- Held, each a plant green in the PR's own guard (review-z59): #2273 (no
  uncarried gap of 5 to 12 s played), #2285 (test mode taken once), #2316
  (a week-old card reopened: a bug), #2317 (six shadows off), #2286 (a
  URL's text; a frozen spread), #2287 (a spread copy; a method),
  #2298 (`debugBus.getState`; importsOf's file order), #2279 (riding
  forced; nine report lines), #2306 (the rise from `.slice(-1)`), #2314
  (draft; the sample filtered out), #2293 (a later write to `dx`/`dy`),
  #2295 (`S[k].send`; a stash helper; `s.id`), #2310 (an array form;
  `wireform: true` counts), #2312 (a gated read; `msg.length`), #2313
  (draft; new head e2de46fd at 08:14 not reviewed).
- Waiting on a held PR under them (own part passed): #2290, #2302, #2303
  (WL), #2291, #2297 (PH), #2300 (DG).
## Found
- elemental2.test.mjs:187 flaky (about 1 in 1,700; no card). frame-pacer
  23g a text pattern (card O). held-budget and memory-budget lines can
  rise silently. `window.debug.getState()` uncounted (WL). The box had no
  `node_modules` at the start.
## Needs
- Nothing from the owner for this list. The orchestrator: #2291's body
  does not name `renderRes.js` nor its second suite as approved.
