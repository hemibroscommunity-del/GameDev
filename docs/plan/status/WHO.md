card: WHO
branch: claude/plan-who-2-sitting (6481) and claude/plan-who-3-trace (6482, stacked on it); part 4
prs: #2285 6480 (ready), 6481 (built, waits on #2283), 6482 (built, stacked on 6481)
state: working

## Done
- 6480: #2285, the actor (server/src/actor.js; `xfer:` rows' `actor`, test play apart in the day's book; `actor: false`; cap `actor`). Ready; deploys when merged.
- 6481 (built, not opened): server/src/sitting.js, the sitting's card inside `_econ` (`s` open, `sh` the last 32 closed), ECON_V 1 -> 2 (shape bump), opened or carried on at the join (the actor made below the record's load, with the sitting's stint), the leave's touch, `sitting: false`, cap `sitting` on its own line. The orchestrator's yes (2026-11-23): one call each in movement.js, combat.js + hitproof.js, gold.js econGold; and (2026-11-24, answer 3) one more call in movement.js: a test-mode move counts as activity (before `ps.lastMoveAt = _now`, never over a budget). sitting.test 58 checks, 20 plants red. No new row, no new put, no cost-guard line moved.

- 6482 (built, stacked on 6481): server/src/playtrace.js, the owner's play recorded: a test-mode sitting's first ten active minutes, ONE `play_trace:<pid>:<slot>` row (a ring of 8), labelled human, in the league's trace form; rung 4 (replay.mjs) reads it as a person's at 60/30/20/4 fps and through a deploy (playtrace.test §2). Test mode's checks run in shadow ("would refuse", `wr`). The orchestrator's yes (2026-11-24) for the files outside the card: index.js `_onMessage` (one traceNote line after the silence door); the shadow's one call each in movement.js (the budget), gathering.js (too early; no start of its own), cooking.js (rate, start, floor), combat.js (hitproof's weapon/far/rate, the bow's arrow, the sword's swing). Not shadowed: botfp, botsig, the quests' order, lastplace, the roll window (the replay is their shadow). Flag `playtrace: false` (needs `sitting`), cap `playtrace` on its own line, the registry row, marks, RESTORE_WAYS (`left`), test mode's three lists. playtrace.test 36 checks, 12 plants red.

## Next (part 4, from 2026-11-24)
- The orchestrator's three answers (2026-11-24): 1 YES admin.js KEPT_OUT's one `play_trace:` row (already on 6482); 2 the trace stays ONE row of 96 KB, `cut: 'size'` accepted, nothing more built; 3 YES the movement.js test-mode call (in 6481, committed, not pushed).
- 6481: when the orchestrator says #2283 has merged: merge `main` once, precheck, push, open READY ("shape bump: ECON_V" first; the yeses: movement.js (two judged calls and the test-mode one), combat.js + hitproof.js, gold.js econGold; migrations.js econClean; report.js NOT, card PH's).
- 6482: merge 6481 in, precheck, push, open READY on claude/plan-who-2-sitting ("stacked on 6481" at the top; the files outside the card with their lines; admin.js KEPT_OUT, the orchestrator's yes; answer 2 named; not shadowed: botfp, botsig, the quests' order, lastplace, the roll window).
- Then report.js's one sitReport call after #2279 (card PH), on the orchestrator's word.

## Found
- qa: no proof of QA on the socket (a login change, a new card); `qa` unbuilt.
- Items are not split by test play: bag.js bagGive is handed the bag alone.
- server/src/econcard.js openSeconds counts a test-mode sitting's open seconds with play.
- The card's counts reach storage only with a save the record makes anyway (no put of its own): a sitting with no save after its last activity (walking only, nothing dirty at the close) loses the counts since its last save; the card closes at its last saved moment (SHAPES part 2).

- A walking page sends about ten moves a second: 96 KB holds about five active minutes of it, so a walk-heavy sitting's row ends `cut: 'size'` before the ten minutes (the bench's harvester did: playtrace.test §2). The whole ten minutes would take two rows or a coarser form in the league's trace (tools/league, not this card's): the orchestrator's answer (2026-11-24): one row, `cut: 'size'` accepted for now.
- Test mode judges no move, so the sitting's card (6481) counts no active second from a test-mode character's moves (only its hit claims): the trace keeps its own active clock. Fixed in 6481 (the orchestrator's yes, 2026-11-24): movement.js counts a test-mode move (sitting.test §10).
- The cook's start in shadow sees no spent plan (test mode never spends one), so a second result on one plan is not counted as would-refuse.

## Needs
- #2283 (card DG) merged: the orchestrator tells me.
- report.js's one call (soft, build, seen, drawn) after #2279 (card PH) merges: in 6482 or a small PR after it (the orchestrator's word).

## Readings chosen (for the gatekeeper)
- Active seconds: gaps of at most SIT.IDLE_MS (60 s) between activities (a move, a hit claimed); the gap: SIT.GAP_MS = BOTSIG.BREAK_MS (5 min); hours of the day in UTC; gold by class signed net.

## The About panel's words (the owner's; a draft)
- "The owner's play: the first ten minutes of each of the owner's test sittings are kept as a recording (what the phone sent, never what was said in chat), to check that the game's bot checks would let a real person through." 
- "Who did what: each trade's record says whose tap settled it, and marks the owner's test characters, so testing never counts as play."
- "Each visit: the server keeps a small card of your last 32 visits (how long, how active, moves, hits, gold by kind) to tell people from scripts. It never leaves the server."
