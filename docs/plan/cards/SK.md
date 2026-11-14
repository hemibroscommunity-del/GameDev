# Card SK: the skateboard's roll-off and push start (content)

**The owner's words (2026-11-14):** *"on skateboard create a roll off effect where letting go of skateboard button makes it roll for a while down to a slow stop. Also let the skateboard take a push or two before reaching max speed when starting from a stop"*

**Starts:** now. **Tags:** 5440 (PR 1); 5441 to 5459 spare (a fix the gatekeeper asks for takes the next). **Browser:** medium (the ride's phone scenarios, one at a time). **Effort:** extra (`src/ui/BroTown.jsx`, and how movement feels).
**Read first:** `src/game/ride.js` (whole: `RIDE_MULT`, `rideLook` and its pushes, `rideCheck`, `stepOff`), `server/src/ride.js` (the header: what the worker judges and what ends a ride), `server/src/movement.js` ~210-230 (`_rideK` in the move's bound), `src/ui/BroTown.jsx` ~5575-5720 (the movement step: `finalSpd`, `rideMult`, and the ice slide `S._slideVx` / `_slideR` as the model of a velocity carried between frames), `src/game/rideSound.js` (the roll's loop), `server/test/ride.test.mjs`, `tools/qa/mp/mp-skateboard.mjs`, and `grep -n -i "ride\|skate" docs/TRAPS.md`.

## The reading chosen (the owner may correct it)

"Letting go" means letting go of the MOVEMENT (the stick on a phone, the keys on a computer) while on the board: the board rolls on in the way it was going and slows to a gentle stop. The board button itself (a tap: on or off) stays as it is: tapping off stops you as today.

## PR 1 (tag 5440): roll-off and push start

- **The model, in `src/game/ride.js`** (no imports, node-testable): the board's speed as a fraction of top speed (top stays `RIDE_MULT` x the walk), kept in the ride's ONE record `S._ride` (a number, e.g. `S._ride.spd`; never a second boolean like `coasting` beside `on`: CLAUDE.md §5, one field a phase).
  - **From a stop, pushes:** each push (the existing push pose, `RIDE_LOOK`) adds speed. Start with: the first push takes you to about 55% of top, the second to top, about 1 s in all from standing. While you hold the movement at top speed, the existing push every 2 s stays as it is (looks only).
  - **Let go, roll off:** the speed falls smoothly in the last way you went, from top to a stop in about 2 s, slowest at the end (an ease-out, not a straight line). No push poses while coasting: the sideways glide.
  - **Move again while coasting:** carries on from the speed you have, with a push; no restart from zero.
  - The numbers sit in one frozen table (e.g. `RIDE_FEEL`) with a comment each, so the owner can ask for "longer" or "fewer pushes" and it is one line.
- **One movement step, in `BroTown.jsx`:** while riding, `finalSpd`'s ride factor becomes `RIDE_MULT` x the model's fraction; with no input, the board keeps moving at the coasting speed through the SAME step, collision and water checks as a walk (no second movement path). Only the movement step changes in this file.
- **Ends at once (speed 0, no coast):** getting off for any reason (`stepOff`, the worker's `ride_state` off: edge, hit, fight, dead, zone, duel, the kill switch, a tap); blocked by a wall or by water; the shield, a swing, a roll; every hold that sets `finalSpd = 0` today (loading veils, dialogue, the race hold). A coast never carries you past the safe ground's edge further than today: `rideCheck` still steps you off there, with no coast after.
- **On a computer:** keys released, the board coasts. If a click-to-move path exists while riding, it arrives on its point (slows into it, no overshoot).
- **The roll's sound** (`rideSound.js`): it already rises as you move and falls as you stand; make its level follow the speed, so it fades as the board slows. No new sound (TRAPS §305).
- **The worker: no change.** It judges a rider's moves at `RIDE.MULT`, an upper bound; slower moves and a coast are inside it. Prove it in the scenario: the worker refuses no move of a start or a coast. If it refuses any, STOP and ask: that would be a server change (a cap and a live flag first).
- **Others see it** through the moves they already get. Nothing new on the wire.
- **The switch:** `?ridecoast=0` (lower case) brings back today's instant start and stop. If card T's switch table (#1754) is on `main` when you open the PR, add its row there.
- **The pose:** `rideLook` is called from `src/rendering/systems/entityRenderer.js` (~12943, ~14705) with `isMoving`. If a coast does not read as moving there, the fix is a line in that file. Card H's follow-up (tag 5050) holds it now, so ask me before touching it.

**Tests:**
- `server/test/ride.test.mjs` gains the model's cases:
  - top speed within two pushes;
  - a coast from top to 0 in the chosen time, slowest at the end;
  - speed 0 at once on a step-off;
  - a resume with no re-ramp;
  - the switch thrown gives today's behaviour.

  This touches `server/test/`, so its merge deploys the worker: say so in the PR.
- `tools/qa/mp/mp-skateboard.mjs` gains, timed by the renderer's clock (TRAPS §200), on the world (`world: 'wheel'`):
  - from a stop, below top speed early and at top by about 1.2 s;
  - after letting go, still moving, slowing, stopped within about 2.5 s;
  - the worker refused no move;
  - at the safe ground's edge, off with no coast past it.

  Run it upright AND sideways, and once on a computer (`wide: true`, the keys). Also run `townride`, `ridelay`, `boardwheels` and `questline`.

**Files:** `src/game/ride.js`, `src/ui/BroTown.jsx` (the movement step only), `src/game/rideSound.js`, `server/test/ride.test.mjs`, `tools/qa/mp/mp-skateboard.mjs`, the ride's spec under `docs/specs/` (a section: the owner's words, the numbers, the switch), `docs/plan/cards/SK.md`, `docs/plan/status/SK.md`, `tools/dev/tag-blocks.json`. If the state ledger's guard asks for the new field, `state-census.mjs --ledger <system> --write` for the ride's system.

**The laws:** no new art or sound (preloading and memory untouched); nothing new held on the page's thread; no gold, bag or health; one field a phase. The PR's words tell the owner, in plain words, what they will feel on the phone, and the switch to turn it off.

**Done when** the PR is open, ready (not a draft), with every test above green. Then tell me its number.

## Not yours

`server/src/**` (no server change); `entityRenderer.js` (ask first); everything in BroTown.jsx outside the movement step; the ride's phase door (card L's PR 5 list builds it later: leave `S._ride.on` and `ps._ride` as they are).
