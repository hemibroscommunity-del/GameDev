card: WHO
branch: claude/plan-who-2-sitting (6481, on claude/plan-who-1-actor)
prs: #2285 6480 (ready), 6481 (working)
state: working

## Done
- 6480: #2285, the actor (server/src/actor.js; `xfer:` rows' `actor`, test play apart in the day's book; `actor: false`; cap `actor`). Ready; deploys when merged.
- 6481 (building): server/src/sitting.js, the sitting's card inside `_econ` (`s` open, `sh` the last 32 closed), ECON_V 1 -> 2 (shape bump), opened or carried on at the join (the actor made below the record's load, with the sitting's stint), the leave's touch, `sitting: false`, cap `sitting` on its own line. sitting.test 45 checks, 11 plants red. No new row, no new put, no cost-guard line moved.

## Next
- 6481: the one call a fact in movement.js, combat.js/hitproof.js, gold.js, report.js once the orchestrator answers; then 6482 (play_trace:, would-refuse in shadow).

## Found
- qa: no proof of QA on the socket (a login change, a new card); `qa` unbuilt.
- Items are not split by test play: bag.js bagGive is handed the bag alone.
- server/src/econcard.js openSeconds counts a test-mode sitting's open seconds with play.
- The card's counts reach storage only with a save the record makes anyway (no put of its own): a sitting with no save after its last activity (walking only, nothing dirty at the close) loses the counts since its last save; the card closes at its last saved moment (SHAPES part 2).

## Needs
- The orchestrator (asked 2026-11-23): one call a fact in movement.js, combat.js + hitproof.js, gold.js econGold, report.js; and ECON_V's bump turns `v: 2` literals in gold-door.test:559 and bag-door.test:488 red (recommended: `ECON_V + 1`).

## Readings chosen (for the gatekeeper)
- Active seconds: gaps of at most SIT.IDLE_MS (60 s) between activities (a move, a hit claimed); the gap: SIT.GAP_MS = BOTSIG.BREAK_MS (5 min); hours of the day in UTC; gold by class signed net.

## The About panel's words (the owner's; a draft)
- "Who did what: each trade's record says whose tap settled it, and marks the owner's test characters, so testing never counts as play."
- "Each visit: the server keeps a small card of your last 32 visits (how long, how active, moves, hits, gold by kind) to tell people from scripts. It never leaves the server."
