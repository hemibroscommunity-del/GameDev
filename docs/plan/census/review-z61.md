# The gatekeeper's review, sitting 61 (card Z; tag 6273)

Under the owner's rule of 2026-11-24 (`docs/plan/finish.md` part 8, card Z
step 4b): only a red rehearsal or `test`, a bug in behaviour, a card's own
dodge still green, or an earlier review's plant still green on the head
listed as its mend holds a PR. A reviewer's NEW hole is a line of
`docs/plan/debts.md`, and the PR lands.

The queue, frozen by the orchestrator at 17:15 UTC: 18 PRs on `main`
598cfd38 (tree d81623ce), in four stacks and two singles. Each stack's top
holds every PR under it and `main` (one merge base each); a stack is one
line, its top. Every head was checked against `origin` (all as given).
What was new was read by five purpose lanes on the top model, one a
stack, each planting the card's dodges, the earlier reviews' plants and
its own. The frozen heads passed at 60 had only the rehearsal.

## The verdicts

| Line | PR | Head | Verdict |
|---|---|---|---|
| LF | #2273, #2320 under TOP #2329 (draft) | 2c57bfb9 | LAND: 60's hold mended (`four-lines` green, wsClient.js on its 2598 line, not raised; the try/catch moved into `thawBeat` behaves the same); plants 11/13 red |
| WHO | #2317, #2325, TOP #2333 (draft) | b9a3fdbb | LAND: #2325 turns 59's 20 plants red; #2333 mends 60's hold (`traceNote` a taker: 5/5 red in `wire-hostile` 5a/5b) and the off-then-on gap (`sitting` 7c); no behaviour bug; plants 34/39 |
| PH | #2279 ... #2323 under TOP #2332 (draft) | 0b5b72a4 | LAND: 60's three holds mended; plants 16/16 red |
| CT | #2308, #2327, TOP #2330 (draft) | f96c1465 | LAND: 60's bug mended (one gate, `twoButtonsLive()`); PR 4 13/13; plants 29/45 (PR 5 names no dodges) |
| VW | #2331 (draft) | 405d968e | LAND: the owner's 0.79 (15:33 UTC); a constant and its tests |
| BK | #2326 (ready) | 778c5e8e | HOLD: a red rehearsal (with PH's #2279, below); its review passed |

**WHO's `open()`.** Sitting 60's plant (`m.has(rec)` for `m.get(rec) ===
s`, sitting.js ~179) is still green. 60 named it a next job, not a hold,
and named no head as its mend; #2333 does not claim it, and the lane found
no reachable difference today. It stays a debt.

**CT's 60 plants.** `S['_latch' + 'Phase'] = 'idle'` and `Sb.autoAttack =
!!_lp` stay green: 60 filed them as next jobs (`!!_lp` is harmless:
`latchFrame` rewrites it the next frame). `latchLock`'s early return is
now red (three spellings).

## The behaviour checks

- **PH, the climb back** (60's bug): the suite's model, chip x1.8 and x2.6
  for minutes 5 to 15, the work unchanged, reads 60.0 fps (120.0 on a 120
  screen) from minute 17, with no rate change after. A chip hot for good
  makes about 13 failed tries in 55 minutes on the doubled wait (cap
  320 s): the designed bound, the same as `?govcool=0`.
- **PH, the governor at a mild heat** (asked of the lane; MAIN's own): at
  60 Hz, heat 1.4, the rate changes 75-88 times in the second half hour on
  `main` 598cfd38, 47-64 on PH's head (34 with no governor at all). The
  stack is better at every heat it touches; #2314's head equals `main`.
  A debt (the governor's), not a hold. The owner's phone test is the
  judge (`finish.md` part 9 item 1).
- **CT, the iPhone**: read for touch, upright and sideways; no bug found.
  `(pointer:fine)` is false there, so the gate is the mode.
- **WHO**: the live flag's call sits after the flag's put; only a POST can
  set `sitting` false; `placeAt` gives the same values as before.

## The raises (each said, each one row)

- WHO: `wire-hostile` TREE_LINE 15 -> 16 (one TREE_FORMS row,
  `playtrace.js note`, handed to `JSON.stringify`); `phase-table` KEYS
  118 -> 119 (`'z server/src/playtrace.js': 1`); one `besides` row in the
  zone door (`return { x, y, z };`). Each row out is red.
- PH: `wire-hostile` REACH_LINE 104 -> 108: exactly four fields (`up`,
  `ride`, `rideGaps`, `ramps`, wire/in.js:66), each read only in
  `reportSums` after `if (!cls) return null` (report.js:377). The heap
  40.0 -> 42.5 (total 216.0 unchanged), known at 60.

## The skips (CT's `mp-twobuttons`: 51 PASS, 0 FAIL, 1 SKIP)

- 2c sideways (:477) skips only when five or more swings had no frame
  inside the blade's contact and the median frame is 280 ms or more; a
  faster page stays strict. Honest, with 60's debt still open (it asks
  neither the lock, the phase nor a small gap).
- 3c (:629) skips only when the edge did not hold and the median frame is
  400 ms or more (the sight's hold). Honest; node holds the hysteresis
  faults (P4a, P4b red).

## VW's preview build

Cloudflare Pages failed on 405d968e at 16:05:40, with started and
completed the same second. Every PR's Pages check reads zero seconds, so
the timing says nothing. The same head is green in `lint-build` (the
build), `test`, `playable` and `memory-budget`, and `npm run build` is
green on the rehearsed tree. Judged Cloudflare's own, not the code: not a
hold. No empty commit (CLAUDE.md). Watch production's build after the
merge.

## Step 5: the rehearsal

1. All six lines, in the order BK, LF, WHO, PH, CT, VW (tree
   c339d7f03b5a416149d43dede0fb770c23979404): precheck FAIL 1,
   `[server-tests]` -> `guards/road-levers` 1: `report.js:131`, "an import
   the scan cannot place (../../src/game/switches.js)". Every other
   command green: every switch thrown PASS (1320 s); claims-gain --whole
   PASS (509 s); build PASS (14 s); questline 187 of 187 (438 s). The
   server suite run again on that tree: 600 suites, 1 FAILED, the same.
   The meeting: BK's #2326 makes `road-levers` fail closed on an import it
   cannot place, and places only paths inside `server/src`; PH's #2279
   (reviewed at 59 and 60) has the worker import the page's switch reader.
   Each is green alone; red together, in either order.
2. The list, without BK (tree
   909f9e677a399189cf987bdd4eb4a6660fd76d05): precheck PASS (0 FAIL; the one WARN is the
   version-tag list of branches), `road-levers` green. BK
   changes only `road-levers.test.mjs` and its status file, so the other
   commands of run 1 stand for this tree.

## Step 5b: what GitHub will merge

Each line merges onto `main` in the list's order with one merge base and
no conflict (`git merge-tree`, step by step as `--no-ff` merges). Four
tops are based on the branch under them, not `main`: #2329
(`claude/plan-lf-thaw-edges`), #2333 (`claude/plan-who-mend59`), #2332
(`claude/plan-ph-mend59`), #2330 (`claude/plan-ct-4-sight`): each is
retargeted to `main` before it merges. No listed PR's body carries a
closing keyword before a PR's number (19 of 19 read).

## Found

- The Deploy worker's `login-keys` 12g on c2da80bf, and `buffers`' flap:
  `docs/plan/debts.md`.
