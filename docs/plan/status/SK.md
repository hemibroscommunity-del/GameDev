card: SK
branch: claude/plan-sk-1-rolloff
prs: PR 1 (tag 5440) on the branch above (working; its number with the next commit)
state: working

## Done

- PR 1 (5440), on the branch: the push start and the roll-off.
  - `ride.js` `RIDE_FEEL`, `rideFeel`, `rideStepped`, `rideSpeed`;
    `?ridecoast=0` (its row in `docs/SWITCHES.md`). BroTown's step; the sound.
  - Room for it in BroTown (four-lines): the fight test and the line taken
    once moved into `ride.js` (`rideFighting`, `rideLineDue`), net -1 line.
  - ride.test §7 green; `skateboard` 26/26 (top 0.90 s of the game's clock,
    stopped 1.95 s after letting go; the worker followed no move);
    `questline` 187/187, `ridelay` 3/3.

## Next

- `skateboard` again after the move above; precheck; the PR, ready.

## Found

- `mp-skateboard` (main): the phone had no keep-alive and was logged out on
  a slow box; the button drops a tap held over 600 ms there. Fixed here.
- `mp-skateboard` check 3 (main) reads `1.6` on the board whatever
  `RIDE_MULT` is: it cannot fail. Left.
- `mp-townride` (main, same numbers on main's build): its two page-hold
  checks are red (no 50 ms bake left to find; `pages: 0`).
- The card's "dialogue" hold: there is none in the movement step.

## Needs

- The planning session (asked 2026-11-14):
  - Q1: one line in `entityRenderer.js` (~14705: hand `S._ride` to
    `rideLook`), so your pose pushes when the board does and glides as it
    rolls. Without it a push can show mid-roll.
  - Q2: two lines in `mp-boardwheels.mjs` (~122): wait for the roll to end
    before "stopped" (its check 2 is red by design; 7 of 8 green).
