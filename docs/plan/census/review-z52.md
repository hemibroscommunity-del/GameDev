# The gatekeeper's review, sitting 52 (card Z; tag 6266)

Taken 2026-11-18 on `main` 1cd3fced (sitting 51 fully merged). The cards
running came from the planning session (session_01LccHaivkofvyigGL4fgBWZ);
the heads from each card's own message to this sitting
(session_01LccHaiB6Vh6BfVAavjcZ9b), checked against GitHub. The list was
kept open while PRs turned ready (21:02 to ~23:00 UTC). Tags bare.

## The deploys sitting 51 queued

Runs 44381829545 (10356e53) and 44382339345 (a756a519) of
`deploy-worker.yml`: both completed, **success** (19:53 and 20:18 UTC).

## What was open

| card | PR | tag | head | state on GitHub |
|---|---|---|---|---|
| RR | #2251 the reds census (a sample) | 6300 | 2a8875d8 | ready, `test` and Pages green; documents only |
| RR | #2256 mp-mayordoor, the test's | 6301 | eaaca384 | ready, every check green; STACKED on #2251 (its three docs) |
| LR | #2252 the layout-read list lowered 365 -> 337 | 6362 | 5dd874c6 | ready, every check green |
| SB | #2253 the ground keeps up with the board (`?groundsend`) | 6382 | fd2a169a, then a978e2e4 | held at SB's own word 21:32, back with a978e2e4 (below) |
| EN | #2255 a peer's look prewarm a few ms at a time; the PNG queue capped | 6204 | 325d1fbe | ready, every check green |
| HB2 | #2244 #2247 #2249 (6281-6283) | | ae77a66e ba5fb191 35c44898 | drafts, `dirty` (main to merge: WD3's words) all sitting |
| HB2 | #2254 p256 on the worker | 6284 | 50d38b58 | draft all sitting |

## Step 3: each against its card

- **RR #2251**: `docs/plan/cards/RR.md` (the card itself, written by the
  planning session, lands with it), `docs/plan/census/RR-reds.md`, the
  status file. The card's PR 1: a sample of 48 scenarios (the full 388 is
  the owner's choice, about 20 hours on one box), every batch red run again
  alone, each red with its cause and owner. Documents only.
- **RR #2256**: `tools/qa/mp/mp-mayordoor.mjs` and the status file (RR
  holds `tools/qa/mp/*`). Three causes, each the TEST's (TRAPS §177): the
  phone idled out in part 1 (`H.keepAlive`); a monster wandered under the
  click at the other bro's body (the spot read quiet when the clicks come,
  the distance named in the line); a copy still sliding when clicked (read
  standing still first). The click on the monster is read where it is
  DRAWN and tried up to three times, the count named: a click on nothing
  locks and asks nothing, so a miss can never pass. No check loosened.
  Five of five green (12/12) on RR's box. Stacked on #2251: merge it after.
- **LR #2252**: `tools/guards/lib/layoutReadsKnown.mjs` by its `--write`
  (six QuestCoach rows, 28 reads, off: 365 -> 337, the reads HB2's #2224
  moved after the paint) and the status file. Asked of LR by sitting 51 and
  the planning session after #2224. LR's card is done when it merges.
- **SB #2253**: `wheelGround.js`, `mp-heldsweep.mjs` (the ride ring's
  radius now from `WHEEL_SAFE_R`: sitting 51's mend done), a new
  `mp-rideheld.mjs` (`world: 'wheel'`, lane `full`), the switch row in
  `switches.js`, `tools/guards/lib/switches.mjs` and `docs/SWITCHES.md`
  (the name approved by the planning session, as the card asks), the
  status file, and at a978e2e4 one dated note under TRAPS §128 (allowed by
  the planning session in this PR). The card's numbers are the share of
  the view not yet drawn rather than ms: SB-ride.md found the board
  outrunning the ground, not a hold.
- **EN #2255**: `entityRenderer.js`, `census/M-tables.md` (re-made), the
  status file; card EN's 5 (HB's row 37) and sitting 51's mend (the
  `_keepQueue` cap). Row 37's holds: 25.4 ms x13 on main, none in 2 of 2
  runs (budget-android, the peer station). No held-budget line rises.

## Step 4: the review (`/repo-review`)

**SB #2253 (src/rendering/wheelGround.js).** No `server/`, wire, storage
or economy: angles A, B, C, D, E and G are clean by inspection. Angle F
and the memory law, by one finder at fd2a169a, its findings checked
against the file by hand:

- VERIFIED (by reading): no hysteresis between the two modes. The side
  behind loaded and freed at the view's edge + 48 while the board rolled
  away (the look ahead past a quarter of its reach) and at + 96 once it
  decayed below: a stop-and-go ride, a stick near that angle or a
  correction across a column edge would ask for a column and free it again.
- PLAUSIBLE: a U-turn finds the strip 48-192 px behind already freed, with
  up to six jobs for the old direction queued ahead of it (the worker
  never cancels).
- `_sendOff` cached at module level, against switches.js's v2.3.5306 note
  (a test changes the address mid-page). TRAPS §128 ("Not a bigger
  `MAX_IN_FLIGHT`") stood unanswered.
- DISPROVED: a piece on screen freed (the free box behind is the cover
  box exactly); `inFlight` leaking (the load's then and catch count down
  whatever `_free` did); a new cache (none; getting off frees as before).

Sent to SB as mends. Then SB, re-measuring alone, found a fast lap
holding 83 pieces and 89.1 MB on the chip, over its own lines (80, 84) and
~7 MB over the on-foot peak, and asked for a hold (21:32). The planning
session re-decided: the board's look ahead 1.5 times a walk (it was 2),
the ride's peak at or under the on-foot tour's, the mends folded in, one
PR. At **a978e2e4**: per-side hysteresis (in at a quarter of the reach,
out under an eighth), `sw('groundsend')` read at each ask,
`AHEAD_GROW_SEND = 1.5`, mp-rideheld's U-turn and stop-and-go legs, the
lines at the measured peak (pieces 82, chip 85 MB). SB's fast lap: view
unlaid 0.7%, 78 pieces (the old ride 82), the chip 83.0 MB (the old ride
81.5; 2-4 MB run to run); the see-saw did not show (0 dropped stop-and-go;
0 pop-ins on the U-turn). Read again by hand: the hysteresis holds
per side, the free box behind still equals the cover box, `_dropped` only
counts (QA).

**EN #2255 (src/rendering/systems/entityRenderer.js).** Angles A to E and
G clean by inspection. F: `_peerLookPrewarmIfChanged` now yields with a
`setTimeout(0)` every 4 ms and re-checks `destroyed` and the look's
signature after each yield (the check already stood after the await); the
`_keepQueue` holds 600 at most (past it the oldest stays a canvas, as
before #2234) and drains a slice at a time once its oldest has waited
15 s. EN's first `mp-copperwaist` run failed the iron swap 8 times (rerun
40/40); EN showed the queued canvases are each made for one bake and never
drawn into again, and the failing guard reads the EQUIPPED ids, not
pixels. Settled here: `mp-copperwaist` on main + RR + LR + SB (fd2a169a) +
EN, 40/40 twice (the third run stopped for time).

## Step 5: the rehearsal (`tools/dev/gatekeeper.mjs`)

1. main + #2251 + #2252 + #2253 (fd2a169a): tree ecdcf9d3. precheck 0
   FAIL (873 s), build, questline 187/187.
2. main + #2251 + #2256 + #2252 + #2253 (a978e2e4) + #2255: REHEARSAL2.

## Step 5b: what GitHub will merge

Every PR's base is `main`. Merge bases counted step by step down the list
(each branch against main with every PR above it merged in, as merge
commits): one each. #2256 merged #2251's head and not main again: one base
once #2251 lands.

## Found (no card's, or another card's)

- `mp-skateboard`: SB saw parts 4, 5, 5b, 5c, 8, 10 red on main on a busy
  box; RR then found it green on main alone. Not a red on main until a run
  alone says so (RR's file).
- From RR's census: `mp-recoverpay` (its reload drops `lane=`),
  `mp-firststeps` 6 (the guide's CLOSE arrow), `deskkeys`, `headframes`,
  `quietphone`, `desklunge`, `cuelevels` 3, `brocard` 4, `geartab`
  sideways: RR's to trace (brocard and geartab are HB2's screens).
- `mp-waterfrog` hangs (part 6) and `mp-hairstencil` 3 parts (the planning
  session's list; RR's file).
- EN's `mp-membudget` heap at its edge (38.3 of 38.5 MB; one run 38.7).
