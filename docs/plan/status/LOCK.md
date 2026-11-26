card: LOCK
branch: claude/plan-lock-1-nearest
prs: (opening: one draft PR, tag 6820)
state: working

## Done
- PR 1 (tag 6820): `src/game/lockPick.js` (the pick, one frozen table: dwell 120 ms, tie 1.25, far step 0.88, push 0.2 and in front, reach = swing sum + lunge 48), called by `targeting.js` updateTargeting; `?locknear=0`; suite `tools/guards/lock-pick.test.mjs` (61 checks; 6 dodges and 19 mutants seen red); census `tools/qa/lock-census.mjs` (off the nearest 10.8% -> 8.3%); `mp-locknear` 7/7.

## Next
- Waiting on the orchestrator: may stickZones.js export the walk (stick-zones §8 closed list; the test is under server/test, so not touched). Then precheck, the push, the draft PR, ONE message.

## Found
- The lock orders by the FEET (monPos); the swing measures to the body centre. In 22.8% of the census's fight frames the feet-nearest is not the body-nearest (tall or wide monsters, bosses). Reported, not mended: its own card if the owner wants it.
- Two parts of reading 3 were changed because the census showed them harmful: the push chooses only among ties IN FRONT of it, and its pick is not kept after the thumb lifts (orchestrator told, 2026-11-26).

## Needs
- The orchestrator (part 28), asked once 2026-11-26: may `src/game/stickZones.js` gain `walkNow()` (two lines) so the pick reads the walk without a new S.stickX reader?
