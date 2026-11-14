card: SK
branch: claude/plan-sk-1-rolloff
prs: PR 1 (tag 5440) on the branch above (working; its number with the next commit)
state: working

## Done

- PR 1 (5440), on the branch: the push start and the roll-off.
  - `src/game/ride.js`: `RIDE_FEEL`, `rideFeel`, `rideStepped`, `rideSpeed`,
    `?ridecoast=0`.
  - BroTown's movement step: two lines.
  - `rideSound.js`: its level follows the speed.
  - `ride.test` §7: green.
  - `mp-skateboard` 10 to 12 green on the computer and the phone sideways
    (top at 0.90 s of the game's clock, stopped 1.95 s after letting go, the
    worker following no move); the phone upright re-running (the test's own
    fault, below).
  - The switch's row in `docs/SWITCHES.md`.

## Next

- `mp-skateboard` again (the phone's keep-alive), then `townride`,
  `ridelay`, `boardwheels`, `questline`; precheck; the PR, ready.

## Found

- `mp-skateboard` (main): the phone had no keep-alive, and on a slow box the
  computer's way in took over 2 minutes: the phone was logged out ("You were
  away") and its first tap reached nothing (checks 1 to 4 red). Fixed in this
  PR (the card's file).
- `mp-skateboard` check 3 (main) reads `1.6` when on the board, whatever
  `RIDE_MULT` is (2.0): it can never fail. Left as it is (not this card's).
- The card lists "dialogue" among today's holds of the walk: there is none in
  the movement step (the veils, `_netHold` and the race line set
  `finalSpd = 0`; a stun, death and the loot freeze zero the stick). All of
  those stop the board at once; a roll under a dialogue opened by a tap runs
  out on its own (2 s at most).

## Needs

- The planning session (asked 2026-11-14): may SK change one line in
  `entityRenderer.js` (~14705, your own figure's `rideLook` call) to hand it
  `S._ride`, so your pose pushes exactly when the board does and glides while
  it rolls? Without it, your pose keeps the rule from your moves, and a push
  can show mid-roll.
