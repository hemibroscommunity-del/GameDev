card: ORC
branch: claude/plan-orc
prs: #2275 (the direction: the orchestrator drives it; this notes branch never has a PR)
state: working
part: 1, session_01LccHanB57Tk5sgzS4CDR5a (the top model, high), started 2026-11-23 22:29 UTC; the orders are docs/plan/finish.md

## The cards' sessions (started 2026-11-23 22:32 UTC; all children of part 1)
- CK  session_01LccHamkU1qYRAzBZnFhFPA  strong, high   first PR URGENT (shortens the suite)
- LF  session_01LccHanEKaetwRqRMg2sF44  middle, high   #2273 and three branches
- DG  session_01LccHam3hL1TDQFgUsHLUFj  strong, high
- BK  session_01LccHamfKwzuq6ib8fZXqUs  strong, high
- WHO session_01LccHahoLnZrBGcghpNXvuS  strong, high
- PH  session_01LccHahZRduWjAuiDMFSpQ5  strong, high   waits on the owner's calls 1 and 3
- WL  session_01LccHakUejTB5ZPCvtkEHZQ  strong, high
- CT  session_01LccHajYKD9q7dmgA69TUs1  strong, high   alone in BroTown.jsx and the two renderers
- Z   none yet. Sitting 56 starts when #2275, sitting 54's notes, LF's quick
      lines and CK's first PR are ready (at most two sittings a day).

## Decided
- A card's session reads its card byte for byte from PR #2275's branch
  (`git show FETCH_HEAD:docs/plan/cards/<letter>.md`), not from a pasted copy:
  the same card, no transcription, and the orchestrator never reads the bodies.
- Sessions open their PRs READY (not drafts), against main, and message the
  orchestrator only when ready, stalled, asking, or handing over.
- #2275 is the orchestrator's to drive: subscribed; marked ready when `test`
  is green; first on sitting 56's list.

## Waits for the owner (asked 2026-11-23, finish.md part 9)
- call 1: five minutes on the phone (Speed test's table; ?govern=0; ?groundsend=0) -> card PH
- call 2: GitHub's checks (cancel the older run; documents skip the long test): needs the owner's OWN words -> card CK
- call 3: the memory alarm's level -> card PH
- calls 4 to 8: not asked yet (asked when they matter)

## The week (allowance from Monday 21:00 UTC)
- last week's sum: a lane is counting (finish.md part 6, rule 8); past 80% no new card starts.

## Sweeps
- every 90 minutes by send_later, or on a session's message.
