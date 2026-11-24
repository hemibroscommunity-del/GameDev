# The gatekeeper's review, sitting 60 (card Z; tag 6272)

The third sitting of 2026-11-24, by the owner's leave for that day. The
first under the owner's rule of 2026-11-24 (`docs/plan/finish.md` part 8,
card Z step 4b): only a red rehearsal or `test`, a bug in behaviour, a
card's own dodge still green, or an earlier review's plant still green on
the head listed as its mend holds a PR. A reviewer's NEW hole is the card's
next job (below) and the PR lands.

The queue: the orchestrator's (part 9) 28 PRs in six stacks, every head
checked against `origin` (all 28 as given) and every `test` green. Sitting
59's frozen heads were not reviewed again; its holds on them were sorted by
the rule. What was new or moved was read by six purpose lanes on the top
model, one a stack, each planting the card's dodges, 59's plants and its
own. WHO's mend #2325 (89eecb3a) came after WHO's lane and the rehearsal
had started: sitting 61's.

## The verdicts

| Stack | PR | Head | Verdict |
|---|---|---|---|
| LF | #2273 the rejoin loop | 72c08a15 | HOLD: red rehearsal (with WL's #2286); 59's hold itself mended by #2320 |
| LF | #2320 the thaw's edges (draft) | 8245fb8a | HOLD with #2273 (its review: 59's five plants red; 14/14 plants red) |
| LF | #2321 elemental2 pinned (draft) | 9b68335b | LAND: the pin hides nothing (the clamp and the 4% both still red) |
| WHO | #2285 the actor | 93a97348 | LAND (59's holes: WHO's next job) |
| WHO | #2316 the sitting | c6652622 | LAND: 59's BUG mended (a probe: a week-old card closed, never reopened, switch on and off) |
| WHO | #2317 the play trace | 281e7aae | HOLD: red rehearsal (with DG's #2313) |
| WL | #2286, #2287, #2290, #2298, #2302, #2303 | frozen | LAND (59's plants red on #2322) |
| WL | #2322 the mend (draft) | dedeffac | LAND: 59's 15 plants and the card's 7 dodges red; the phase-table a declared fence |
| PH | #2279, #2291, #2297, #2306, #2314 | frozen | HOLD: #2279's mend leaves three of 59's plants green |
| PH | #2318 the governor (draft) | 1ede9800 | HOLD: a bug in behaviour; and a card dodge green |
| PH | #2323 the mend (draft) | c2c3ff1c | HOLD: three of 59's `report` plants green |
| CT | #2293 the left stick | bfd443e9 | LAND (59's holes: CT's next job) |
| CT | #2308 the right button | 6bb4d0f0 | HOLD: a bug in behaviour |
| DG | #2295, #2300, #2310, #2312 | frozen | LAND (59's plants red on #2324) |
| DG | #2313 the gaps (draft) | e2de46fd | LAND: the card's nine dodges red |
| DG | #2324 the mend (draft) | ba7a4c54 | LAND: plants6.json 35/35 red; own 8/8 red |

## The holds

- **#2273 and #2320** (LF; a red rehearsal): with WL's #2286 merged,
  `four-lines` 1 fails: `src/networking/wsClient.js: 2599 statements, its
  line 2598`. #2286 lowers wsClient's line 3039 -> 2598 (its own
  tightening); the rejoin loop adds the statement over it. Each is green
  alone; #2321 (elemental2, from `main`) does not meet it and lands. The
  mend: after WL lands, LF merges `main` and takes one statement out of
  wsClient.js (the line only falls). The review found nothing else: both
  land at sitting 61 on that one change.
- **#2317** (WHO; a red rehearsal): with DG's #2313 merged, `wire-gaps` 2b
  fails: `traceNote(this, session, msg)` (index.js:4886) hands the phone's
  message, as it came, to a reader not in `TAKERS`. Each is green alone.
  The mend: after DG lands, #2317 merges `main` and either names
  `traceNote` in `TAKERS` (a reader of `msg.type` only) or hands it the
  type, not the message. Without #2317 the guard is green.
- **#2308** (CT; a bug in behaviour): the two buttons' gate is split.
  BroTown.jsx:11702 (the Attack press) asks `twoButtonsOn()` alone;
  :5364 (`latchFrame`), :6471 and targeting.js:671 ask `twoButtonsOn() &&
  !fineInput()`. On a touch screen with a mouse under `?manual=5`, a press
  that reaches the Attack button latches and sets `S.autoAttack = true`,
  no `latchFrame` ends it, and the lift keeps it (:10518 `latchHolds`): a
  node probe on `latch.js` held the phase `active` after the monster died
  and the zone changed. Narrow (a trial address on a mixed device; not the
  owner's iPhone); the mend is one shared gate for every site. The
  `latchLock` fix itself is right (`latch` R red without it).
- **#2318** (PH; a bug in behaviour): framePacer.js:805 `if (coolOn &&
  !cooledFrom(hotWork, workNow)) return;` reads the game's own work, so a
  step down that the CHIP caused never comes back: a probe (the suite's
  model, the chip's cost x1.8 or x2.6 for minutes 5 to 15, the work
  unchanged) took `chip:rate` at 304 s and was still at 30 fps 30 minutes
  after the scene went light; `?govcool=0` came back to 58.4. **And a card
  dodge green**: framePacer.js:639 `if (done && wasUp) { wasUp = false; }`
  (the card: "a failed step up doubles the wait") is green in
  `frame-pacer` on 1ede9800, red on db7d9300 (check 13): the margin masks
  it, and the header's break proof 13 is no longer true. The heap raise
  40.0 -> 42.5 is said in the PR body, the total stays 216.0: not a hold.
- **#2323** (PH's mend; 59's plants still green): server/src/report.js:493
  `for (let i = RIDE_LONG_BIN - 1; i < GAP_BINS; i++)`; :478 hidden seconds
  as seen (`s.up[UP_KEYS[up]] = [secs, drawnOk, ...`); :483
  `int(msg.ride[0], 0, secs)` (a ride longer than the seen time kept). The
  mend drives only the phone's side. The rest of 59's PH list is red
  (client report.js, heap-trend, gate-steps), and 3 of 3 sampled survivors'
  "why" are true. So #2279's hold stands, and the PH stack waits with it.

## Next jobs (new holes: not holds; since the owner's line of 2026-11-24, each is a line of `docs/plan/debts.md`)

- WHO sitting.js `open()` ~179: `const taken = m && m.has(rec); return
  taken ? s : null;` for `m.get(rec) === s` is green in `sitting`.
- WHO sitting.js: the switch thrown off and on again on the SAME socket
  with no rejoin: the same card goes on, the off time its longest gap
  (g = 604799); §7b plays only off-at-the-join.
- WHO: sitting 59's holes on #2285, #2316, #2317 (actor `??=`, the sitting
  gap from the start, `_sitJoin` deleted, `_hpTally` without the attacker,
  `sitGold` moved, `touch(..., true)`, the trace's `if (false)` lines): its
  mend #2325 is sitting 61's.
- WL party.js `_partySend`: `const _k = ['status'][0]; payload[_k] =
  'resolved';`, `Object.assign(payload, Object.fromEntries([['status',
  'resolved']]))`, and a helper `_fin(o, k = 'status')` are green in
  `phase-table` (inside its declared fence); its three unguarded counts
  (2,111 / 776 / 434) are words, not falling lines.
- CT: sitting 59's holes on #2293 (a later write to `dx`/`dy`, the clock
  through a field). For #2308's mend: targeting.js `latchLock` with an
  early `return` when the id matches stays green in `latch` R (a text
  pattern); BroTown.jsx:10518 `S['_latch' + 'Phase'] = 'idle'` green in
  `latch` 4 and `state-ledger`; :11702 `Sb.autoAttack = !!_lp` green (the
  mode-5 wiring has no node guard); `mp-twobuttons.mjs:343`'s SKIP asks
  neither the lock on the target nor the phase active.
- PH framePacer.js:638 `if (done && workNow != null) hotWork = workNow;`
  green in `frame-pacer`; §24 has no run where the chip alone is the cost;
  `memory-budget.mjs`'s `buffers` row carries a stray "40.0 -> 42.5,
  RAISED" comment (its line still 24.8: the orchestrator's WATCH).
- LF, DG: none found.

## The plants

LF 14/14 red; WHO 4/5; WL 35/38 (59's 15/15, the card's 7/7); PH 30/35;
CT 7/15; DG 54/56 (the card's 9/9, plants6 35/35, own at the top 8/8).
Each lane's findings: the sitting's scratch, not kept.

## Step 5: the rehearsal

`gatekeeper.mjs` on `main` 45579dba, three runs:
1. All 28, in the queue's order (tree cb90f645): precheck FAIL 1,
   `wire-gaps` 2b (`traceNote` at index.js:4886; #2317 with #2313). Stopped
   once the lanes had held PH and #2308.
2. The 20 the lanes passed (tree c2c1d549 with #2317; 807c8051 without it):
   `wire-gaps` green without #2317; precheck FAIL 1, `four-lines` 1
   (wsClient.js 2599 statements, its line 2598: LF's #2273/#2320 with WL's
   #2286). Every other command green: switches thrown, claims-gain
   --whole, build, questline 187 passed.
3. **The list, 17 PRs** (tree ae498b55c1158f349836a59017c0c34e2c0def21,
   the same as `git merge-tree` step by step as `--no-ff` merges): precheck
   PASS (257 s); every switch thrown once PASS (1316 s); claims-gain
   --whole PASS (659 s); build PASS (17 s); questline 187 passed (511 s).
   All green.

## Step 5b: what GitHub will merge

Every listed PR merges onto `main` in the list's order without a conflict
(`git merge-tree`, step by step as `--no-ff` merges). Four get TWO merge
bases once the PR under them lands, because each merged `main` after the
branch under it: #2316, #2322, #2310, #2324. Locally they merge
clean. If GitHub says "merge conflicts" on one, its session merges the
new `main` in and pushes. Three are based on another branch, not `main`:
#2316 (`claude/plan-who-1-actor`), #2322 (`claude/plan-wl-6-paper`), #2324 (`claude/dg-gaps`). GitHub
retargets each to `main` when the branch under it is deleted at its
merge; otherwise the orchestrator retargets it first.

## Found (no card's hold)

- The full queue's rehearsal (all 28, tree cb90f645) failed only
  `wire-gaps` 2b (the #2317 and #2313 meeting above), before it was
  stopped for the list's own run.
- #2321's cause: a crit shoves the target past the sword's reach (the game
  as designed); the pin puts it back each swing.
