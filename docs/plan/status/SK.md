card: SK
branch: claude/plan-sk-1-rolloff
prs: #1782 (tag 5440; ready: the owner's word given, for the next gatekeeper list)
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

- The next gatekeeper list. Sittings 10 and 11 mended (a harvest, a pose or
  a trap mid-roll holds the board; a slant slides; the roll's moves ride the
  path: 80 -> 31, instant 21). The owner, 2026-11-14 ~21:5x UTC, through the
  planning session: "Just go recommended" -- yes to the +10 moves a ride.

## Found

- `mp-skateboard` (main): the phone had no keep-alive (fixed here); the
  button drops a tap held over 600 ms on this box (`tapOn` retries it).
- `mp-skateboard` check 3 (main) reads `1.6` on the board whatever
  `RIDE_MULT` is: it cannot fail. Left.
- `mp-townride` (main, same numbers on main's build): its two page-hold
  checks are red (no 50 ms bake left to find; `pages: 0`).
- `mp-boardwheels` check 2 (main, red on main's build too): stopped, the
  drawn rider still drifts ~0.5 game px in 0.8 s (5.629 -> 5.635): card J2's.
- `mp-skateboard` check 8 (main's): the banner's fade is seen only if a
  sample hits its 0.25 s rise or a hit comes after 2.8 s; missed 1 run in 7.

## Needs

- Nothing.
