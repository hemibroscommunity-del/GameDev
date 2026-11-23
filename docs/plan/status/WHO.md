card: WHO
branch: claude/plan-who-1-actor
prs: 6480 (working)
state: working

## Done
- 6480 built, not yet opened: server/src/actor.js (the actor, made at the join; the room's; the owner's made, unwired), `xfer:` rows carry `actor` (test: true for test mode), the day's book's `econ` part keeps test play under `test` (the sitting's seconds), `actor: false`, cap `actor`. Suite actor.test (37 checks, 7 plants red).

## Next
- 6480: wait for the orchestrator's answers (Needs 1-3), then open it ready.

## Found
- server/src/econcard.js openSeconds counts a test-mode sitting's open seconds with play (the book's are apart now). Not mine.
- tools/guards/lib/systems.mjs: server/src/actor.js is in no system's files (the `session` system fits); not my file.

## Needs (asked the orchestrator once, 2026-11-23)
1. qa: no proof of QA exists on the socket (a join carries no key; ADMIN_KEY is HTTP-only): `qa` left unbuilt. A proof later (e.g. the harness's join carrying an HMAC of its id under ADMIN_KEY), or leave it?
2. The day's book: gold reaches it from gold.js econGold (line 392), not my file: one line to pass the record would book test gold apart. Bag counts cannot be split (bagGive gets the bag alone). Until answered: seconds split, gold and items with play.
3. HTTP/admin: an HTTP call acts as its live session's actor (SHAPES part 1), resolved in xfer.js; httpauth.js and admin.js untouched; the owner's actor made, not wired.

## The About panel's words (the owner's; a draft)
- "Who did what: each trade's record says whose tap settled it, and marks the owner's test characters, so testing never counts as play."
