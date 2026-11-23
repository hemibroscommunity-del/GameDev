card: WHO
branch: claude/plan-who-1-actor
prs: 6480 (working: precheck, then opened ready)
state: working

## Done
- 6480 built: server/src/actor.js (the actor made at the join; the room's; the owner's made, nothing reads it yet); `xfer:` rows carry `actor` (`test: true` for a test-mode character); the day's book's `econ` part keeps test play's seconds and gold under `test` (gold.js, one line, the orchestrator's yes); `actor: false`; cap `actor`. Suite actor.test (39 checks; 9 plants red). gold-door, bag-door, cost-guard unchanged and green.

## Next
- 6480: precheck, merge main, push, open ready; then 6481 (the sitting's card).

## Found
- qa: no proof of QA exists on the socket (a join carries no key; ADMIN_KEY is HTTP-only), so `qa` is unbuilt. A proof would be a login change (a new card): e.g. the harness's join carrying an HMAC of its id under ADMIN_KEY.
- Items are not split by test play: bag.js bagGive is handed the bag alone, no record (every caller would change).
- server/src/econcard.js openSeconds counts a test-mode sitting's open seconds with play (the book's are apart now).
- tools/guards/lib/systems.mjs: server/src/actor.js is in no system's files (the `session` system fits).

## Needs
- none (the orchestrator answered 1-3, 2026-11-23: qa unbuilt; gold.js one line; HTTP as SHAPES part 1, httpauth.js and admin.js untouched).

## The About panel's words (the owner's; a draft)
- "Who did what: each trade's record says whose tap settled it, and marks the owner's test characters, so testing never counts as play."
