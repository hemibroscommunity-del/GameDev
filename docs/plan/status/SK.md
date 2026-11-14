card: SK
branch: claude/plan-sk-1-rolloff
prs: #1782 (tag 5440; ready)
state: ready

## Done

- #1782 (5440): the push start and the roll-off.
  - `ride.js` `RIDE_FEEL`, `rideFeel`, `rideStepped`, `rideSpeed`;
    `?ridecoast=0` (its row in `docs/SWITCHES.md`). BroTown's step; the sound.
  - Room for it in BroTown (four-lines): the fight test and the line taken
    once moved into `ride.js` (`rideFighting`, `rideLineDue`), net -1 line.
  - ride.test §7 green; `skateboard` 26/26 (top 0.90 s of the game's clock,
    stopped 1.95 s after letting go; the worker followed no move);
    `questline` 187/187, `ridelay` 3/3.

## Next

- The gatekeeper's sitting for #1782. `skateboard` 26/26 with the pose
  line; `boardwheels` 7/8, its one red main's (Found).

## Found

- `mp-skateboard` (main): the phone had no keep-alive and was logged out on
  a slow box; the button drops a tap held over 600 ms there. Fixed here.
- `mp-skateboard` check 3 (main) reads `1.6` on the board whatever
  `RIDE_MULT` is: it cannot fail. Left.
- `mp-townride` (main, same numbers on main's build): its two page-hold
  checks are red (no 50 ms bake left to find; `pages: 0`).
- `mp-boardwheels` check 2 (main, red on main's build too): stopped, the
  drawn rider still drifts ~0.5 game px in 0.8 s (5.629 -> 5.635 turns).
- The card's "dialogue" hold: there is none in the movement step.

## Needs

- Nothing. The planning session said yes to both (2026-11-14): the line in
  `entityRenderer.js` (~14705) and the two in `mp-boardwheels.mjs`; made.
