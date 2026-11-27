card: LOCK
branch: claude/plan-lock-1-nearest
prs: the draft PR from this branch (tag 6820, ready)
state: ready

## Done
- PR 1 (tag 6820): `src/game/lockPick.js` (the pick, one frozen table: dwell 120 ms, tie 1.25, far step 0.88, push 0.2 and in front, reach = swing sum + lunge 48), called by `targeting.js` updateTargeting; `?locknear=0`; suite `tools/guards/lock-pick.test.mjs` (61 checks; 6 dodges and 19 mutants seen red); census `tools/qa/lock-census.mjs` (off the nearest 10.8% -> 8.3%); `mp-locknear` 7/7.

## Next
- Nothing: the PR waits for the gatekeeper. Precheck 0 FAIL (the whole server suite in it); mp-locknear 7/7 on the final code; nearpick, lockreticle, contextbuttons green; lockfar (6/7) and shadowlock (13/23) red exactly as on main eb90c6fd.

## Found
- The lock orders by the FEET (monPos); the swing measures to the body centre. In 22.8% of the census's fight frames the feet-nearest is not the body-nearest (tall or wide monsters, bosses). Reported, not mended: its own card if the owner wants it.
- Outside the card, by the orchestrator's yes (part 28, 2026-11-26): `src/game/stickZones.js` `walkNow()`, so the pick reads the walk without a new S.stickX reader (stick-zones §8); on a computer the walking keys push too.
- `mp-lockfar` step 4 is red on main too: it expects a sword lock released past 275 px, but the sword's hold is 550 since v2.3.3595 (a stale test, not this card's).
- Two parts of reading 3 were changed because the census showed them harmful: the push chooses only among ties IN FRONT of it, and its pick is not kept after the thumb lifts (orchestrator told, 2026-11-26).

## Needs
- Nothing.
