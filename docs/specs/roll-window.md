# A roll is only as long as the one you paid for (v2.3.3292)

Found by the architecture review (2026-10-17). Server only; no phone change.

## What was wrong

- When a phone rolls, its move messages say `dodging: true`. The worker copies
  that into the player's state (`server/src/movement.js`, the move handler).
- A blow from another player skips anyone who is rolling: the sword's claim
  (`combat.js` `_resolvePvPAttack`, through the lag-comp history) and every
  extra (`pvpextras.js` `_strikePlayer`: the bash, the lunge, the burst, the
  splash).
- Nothing ever ended the claim. One move saying `dodging: true` left the flag
  up until a later move said otherwise. A phone that never said otherwise
  took **no damage from any player**:
  - No man's land, where a death gives the killer your bag;
  - wagered duels;
  - the arena.
- Measured on the real room code: five sword hits on a "rolling" player did
  nothing, and `_strikePlayer` refused every blow. Monster hits never read the
  flag, so they were not affected.

## What changed

- The worker already charges a roll's stamina (`index.js` `_handleAbilityUse`,
  types `dodge`, `lunge` and `retreat`, the three moves the phone plays as a
  roll, `src/game/dodge.js`). The charge now opens a window:
  `ps._rollUntil = now + ROLL.MAX_MS` (`movement.js` `ROLL`, `_rollStamp`).
- `_rollOn(ps, now)` is the one question: the phone says it is rolling **and**
  the window is open. The lag-comp history records that answer each tick
  (`tick.js`), the claim path reads it, and `_strikePlayer` asks it.
- **`ROLL.MAX_MS` is 1,000 ms.** The longest roll a phone plays is 700 ms
  (`dodgeWindowMs`: 250 + up to 250 for Endurance + up to 200 for Reflexes).
  The other 300 ms is the lag-comp history's depth, so a blow judged against
  a late moment of a real roll still finds it.
- A roll the worker refused (not enough stamina, `ability_rejected`) opens
  nothing.
- Sparring clones roll through `_handleAbilityUse` too (`spar.js`
  `_sparRollStart`), so they are unchanged.

## What did not change

- An honest roll protects exactly as before.
- **The retreat shot still has i-frames against players**, as before. The
  phone's own comment says it should not (`dodge.js`: "no i-frames per §5.8.3,
  the shot is the tradeoff for safety"), but the worker has always honoured
  its `dodging`. Whether to take them away is the owner's call; it is one word
  in `ROLL.PAID`.
- Monster hits still ignore the roll, as before. The phone hides the damage
  number while it rolls, though the worker takes the HP. That mismatch belongs
  to the one-door-for-hits work (the architecture review).

## Kill switch

`rollwindow: false` in the live flags trusts the claim as before.

## Tests

- `server/test/anticheat.test.mjs` §10 (13):
  - a bare claim, sent on a real move message, no longer stops a swing;
  - a paid dodge opens a window `ROLL.MAX_MS` long: inside it the swing
    misses, after it the same claim buys nothing;
  - a refused dodge opens nothing;
  - a lunge and a retreat shot open the window too;
  - `_strikePlayer` lands on a bare claim and misses inside a paid roll;
  - the kill switch trusts the claim;
  - the history records the roll as allowed.
- Removing the stamp in `_handleAbilityUse`, or reading the bare claim in
  `_resolvePvPAttack` again, fails §10.
- Three suites now pay for the rolls they test, as a phone does:
  `pvp-extras` §7, `pvp-lunge` §3 and `tick-share` §3.
