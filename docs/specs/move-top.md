# The move's top, the player's own (v2.3.5549)

Grand plan step 4.2, the move; card K PR 14. An opt-in switch, `movetop`,
landing **OFF**: turning it on is the owner's choice, because it changes how
moves are judged.

## Why

The worker holds every player to `MOVE_BUDGET.SPEED_PX`, 500 px a second
(`movement.js`). That number was set against the fastest legitimate stack
of the old stats, about 441 px a second. A new character walks 150 px a
second, so a phone could claim more than three times its real speed. The
claims bench (`claims-gain.test`, row `move`) measured a cheat at 2.56 times
an honest player's ground an hour.

## What it does, with `movetop: true`

The 500 becomes **this player's own top speed**, worked out from what the
worker itself stores, the way the page works out the walk (`BroTown.jsx`):

- the walk, 150 px a second (`SPEED` 2.5 a frame);
- x the page's `calcMoveSpeed` of the player's stored agility and swiftness;
- x the fastest amulet's move bonus (1.065: the amulet's bonus is the
  page's, so its largest is allowed);
- x the path tile's lift (1.1);
- x a jump's flip, its air time (1.45, `game/jump.js`);
- x 1.15 headroom for a frame's wobble;
- and then what every bound already reads: a speed buff the worker sold, the
  move stat, the skateboard, and the sprint where it is paid for.

It is folded into `_moveSpeedK`, so every move bound agrees: the budget, the
follow, the glide (`movepath.js`) and the join's judge (`lastplace.js`). A
bow's or a staff's reach (`hitproof.js`) keeps its run as it was.

**The burst stays the same size.** Only the refill tightens: the budget
still holds the old bound's three seconds (1,580 px), so a sword's lunge
(about 900 px at 1,560 px a second), a roll, a gust and a stalled line's
backlog spend it as before. A move over the budget is followed, never
refused, as before.

## The numbers (claims-gain.test 2e)

| | Off (today) | On |
|---|---|---|
| The honest walker and sprinter | as before | the same, no refusal on any disturbance |
| The move's cheat, its gain | 2.56 | **1.17** |

**Phone tests with it on** (a local run, before the flip's 1.45 was added: a tighter bound than this): `sprint` 38/38, `townride` 10/10,
`rollhit` 5/5, `questline` 187/187. `movepath` 10/11: its "no worse in
BroTown" check reads the worker's copy against the phone, and the harness
walks in hops faster than a real walk (485 px a second with it off), so with
the player's own top the copy trails those hops (mean 6.8 -> 12.1 px). A
real walk stays inside the bound. `desklunge` (8/12) is red on main too
(card L's Found: 1 to 4 of 12 by run).

The suites that test the flat 500 itself (`move-budget`, `move-path` 5b,
`ride` 3, `sprint`'s bound) fail with the switch thrown, by design; its
row in the switch table lists them.

## Later (not built)

**Walls on the worker.** The worker has no map: a move through the sea or
across a wall is judged only by its speed. Bringing the Wheel's coast
(`wheel.js`, `plan.js`) onto the worker is a new system and costs worker
memory, so it waits for real players (the planner, 2026-11-17).

## Switch

`movetop: true` in the live flags turns it on; absent or `false`, the bound
is the flat 500 as before.
