# The gatekeeper's review, sitting 53 (card Z; tag 6267)

Taken 2026-11-18/19 on `main` c0a0791c (sitting 52 fully merged; nothing
deployed: no file under `server/`). The cards running came from the
planning session (session_01LccHaivkofvyigGL4fgBWZ); the heads from each
card's own message to this sitting (session_01LccHamePtPKqupA44QuCar),
checked against GitHub. The list was kept open 23:50 to ~02:30 UTC while
PRs turned ready. Tags bare.

## Two reds on `main` found this sitting (no open PR caused them)

1. **`usage-meter.test` 5** (`server/test/`), red everywhere from 00:00
   UTC 2026-11-19: the step pinned its clock to 2026-11-18 23:59, but
   `_usageCount` reads `Date.now()`, so the count went into the real day.
   Every PR's `test` (the gate) and deploy-worker's suite went red. Found
   by card RR on #2260's CI, confirmed here (18 passed, 1 failed on main).
   RR's #2265 (6305): the step on its own clock, the check unchanged.
   A `test` re-run reuses its old merge commit, so every other PR on this
   list merged #2265's branch (main + the fix) as its next push and
   carries its one file until #2265 lands.
2. **`mp-membudget`'s heap line** (38.5 MB), red in GitHub's own CI on
   heads with no game change (RR's #2258 38.8, #2260 39.0 and 39.2; HB2's
   #2266 box 39.2). Sitting 52 named it Found; it is now every PR's
   `memory-budget`. The A/B here (`mp-membudget` alone, its own build each):
   main c0a0791c 38.9, 38.6, 38.6; `?keepimage=0` (EN's keep queue off)
   38.6, 38.6; old main 1cd3fced 38.6, 38.8, 38.6. `?groundsend` is inert
   there (the tour never rides). GitHub's runs on old main's heads: 37.4 to
   38.6. No PR is named: the line sat inside main's own scatter. The planning
   session (the line's owner): trace first, then re-measure. RR's #2267
   (6306): 38.5 -> 40.0 (+1.5 MB: the highest seen, 39.2, plus 0.8 of room;
   39.5 would have left 0.3), its why in the file's header.

## What was open

| card | PR | tag | head | state on GitHub |
|---|---|---|---|---|
| RR | #2265 usage-meter 5 on its own clock | 6305 | 14199711 | ready, every check green; DEPLOYS (a server/test file) |
| RR | #2267 the heap line 38.5 -> 40.0 | 6306 | 7c77c441 | stacked on #2265; ready 02:14, every check green |
| RR | #2258 mp-firststeps 6, the test's | 6302 | 2709b32f | ready, every check green (#2265 merged in) |
| RR | #2260 mp-recoverpay, the test's | 6303 | 35c434e7 | ready; `test` green, `memory-budget` red on the heap line only (#2267) |
| HB2 | #2261 `other: R > J` off the debt list by its own rule | 6287 | 46da76db | ready, every check green |
| HB2 | #2244 the band's tap and its windows' first measures | 6281 | 0552a108 | ready, every check green |
| HB2 | #2247 a tap reads the canvas's remembered corner | 6282 | b6b17daa | ready, every check green; stacked on #2244 |
| HB2 | #2249 the gear tab drawn beside the game's redraw | 6283 | 48888fb0 | ready, every check green; stacked on #2247 |
| HB2 | #2259 the big arrow's tick at the top of the frame | 6286 | 57710b8e | ready, every check green; stacked on #2249 |
| HB2 | #2266 the CLOSE arrow waits for a weapon on | 6288 | eef6697b | ready, every check green |
| EN | #2263 an armour bake's page work in tasks of its own | 6205 | 3f999682 | ready, every check green |

## Step 3: each against its card

- **RR #2265, #2267, #2258, #2260**: `docs/plan/cards/RR.md` PR 2 (one red
  a PR, five runs green) and the planning session's two asks this sitting
  (the date red; the heap line, allowed in RR's file). Files: one server
  test, `memory-budget.mjs`, `mp-firststeps.mjs`, `mp-recoverpay.mjs`, the
  status file. #2258 takes the first quest's arrows as the game lists them
  (Mayor Bro, then the weapon and CLOSE), every other part of step 6
  unchanged; #2260's reload keeps the test's lane (`H.withLane`).
- **HB2 #2244, #2247, #2249** (card HB2 PRs 2-4; sitting 51 reviewed earlier
  heads): re-chained on main + #2265. The merge resolutions keep card WD3's
  words: `say(` counted alike on main and the heads in QuestJournalPage.jsx
  (17), InventoryPanel.jsx (6), BroCard.jsx (31); QuestJournalPage keeps its
  `SAY`/`say` imports beside `AFTER_PAINT`. The layout-read list lowered in
  each where its moves took reads away (331, 325, 325, 324).
- **HB2 #2259, #2261, #2266**: the card's "then any HB family left over its
  line" (#2259, HB-holds row 18), the debt list's last `ours` row by its own
  rule (#2261: five runs of `stand,town` on main 7.0 to 10.6 ms the longest,
  under 12), and RR's find given to HB2 by the planning session (#2266).
  **#2261 meets step 3.1** (`debtOf('ours')` empty): it is ticked by the
  sitting after it merges, not on this list.
- **EN #2263**: card EN PR 6 (HB's row 23); entityRenderer.js, the state
  census's row for `_pumpTimer`, M-tables, the status file.

## Step 4: the review (`/repo-review`)

No PR changes `server/src`, the wire, storage or the economy: angles A to E
and G clean by inspection on each. Angle F (the page, the memory law) by
reading each diff in full:

- **HB2 #2247** (BroTown.jsx `canvasCorner`, mayorScreen.js `canvasPlace`):
  every tap and click reads the canvas's corner as remembered (measured
  again at the top of a frame after a resize, a size change, or half a
  second); `?afterpaint=0` measures at once through mayorScreen's one
  measure. The first box with nothing remembered is measured where asked,
  so no tap reads `{0, 0}` while a canvas exists. Noted, no hold: a canvas
  that MOVES without a resize or a size change (nothing on the page does
  this today) is read at most half a second late.
- **HB2 #2249** (`GearTabDeferred`, `useDeferredValue` + `memo`): the game's
  urgent redraw passes the copy already drawn (memo skips); the tab redraws
  as background work. Noted, no hold: a deferred render is restarted by each
  new urgent update, so under a flood of `setRpgState` the tab could lag
  more than a frame; HB2's measures show it settling.
- **HB2 #2259** (guideArrow.js): the tick asked of `beforeDraw` (with its
  500 ms fallback, so no frame does not freeze the arrow); `asked` per
  start, the callback checks `_timer`. A stop and a restart inside one ask
  ticks once with the old `getS`: harmless.
- **HB2 #2244** (the first measures): each first read from the
  ResizeObserver's own first report; with none, read as before. GearTab's
  observer that throws now reads once (was: the first read only).
- **HB2 #2266**: `rpg.weapon` (the worn melee weapon) as the rule's comment
  says; on main alone it would turn `mp-firststeps` 6 red (the old check
  forbids CLOSE), so it lists after #2258.
- **EN #2263**: a job asked starts in its own task (`_pumpSoon`), a look
  job's answer read in its own; the next job still posted from the
  worker's answer. Found here and mended at 3f999682: a look job's key
  left `_bakeByKey` one task before its answer was read (an identical ask
  in that gap would bake twice); now it leaves in the same task.
- **RR #2265**: `Date.now` pinned for the step and put back in a `finally`;
  the two checks of step 5 unchanged.

## Step 5: the rehearsal (`tools/dev/gatekeeper.mjs`)

1. main + #2261 + RR #2258/#2260 + HB2 #2244/#2247/#2249/#2259 (the heads
   before the re-chain): tree 74a7d5fd. precheck 0 FAIL (893 s), build,
   questline 187/187.
2. main + #2265 + #2258 + #2260 (845b5ba5) + #2261 + the re-chained HB2
   stack + #2266 + #2263: tree 47017805. precheck 0 FAIL (863 s), build,
   questline 187/187; then in the same tree `mp-firststeps` 46/46, the
   arrows Mayor -> weapon -> CLOSE on every view (#2258 with #2266).
3. **The list**: main + #2265 + #2267 + #2258 + #2260 (35c434e7) + #2261
   + #2244 + #2247 + #2249 + #2259 + #2266 + #2263: tree **3aeab427**.
   precheck 0 FAIL (884 s), build, questline 187/187.

## Step 5b: what GitHub will merge

Every PR's base is `main`. Merge bases counted step by step down the list
(each branch against main with every PR above it merged in, as merge
commits): one each, no conflict. Every branch carries #2265's head
(14199711), which holds main c0a0791c, so the stacks have one base once
#2265 lands first. Only #2265's test file is under `server/`: one deploy
(a test-only change; the worker's code is the same).

## The list (merge in this order, "Create a merge commit", in one go)

1 #2265 (RR 6305; DEPLOYS, a server test only) · 2 #2267 (RR 6306) · 3
#2258 (RR 6302) · 4 #2260 (RR 6303) · 5 #2261 (HB2 6287) · 6 #2244 (HB2
6281) · 7 #2247 (6282) · 8 #2249 (6283) · 9 #2259 (6286) · 10 #2266 (HB2
6288) · 11 #2263 (EN 6205) · 12 this PR (Z 6267). Held: none.

## Found (no card's, or another card's)

- `gatekeeper.mjs` could not fetch again (it used this machine's copies;
  each branch fetched by hand just before). Precheck ran 863-893 s here
  and 1138 s on RR's box: the 15-minute cap is tight (RR's card, item 3).
- The heap: about 1 MB of creep since v2.3.5007's trim (measured 36.4),
  named in #2267's why; a trim card would lower the line again. The
  planning session's call.
