# Leg sync: your legs keep pace with your feet (v2.3.4077)

> The owner, playing on a computer: *"Character animation speed and actual
> speed is not matching!"*

## What the player sees

- Walking, a bro's planted boot stays put on the ground instead of sliding
  backwards under him. The run's loop lasts as long as the ground takes to go
  one stride by.
- The legs follow the speed, whatever sets it: the shield or an attack held
  (half speed: the legs half as quick), the sprint (1.33x), the skateboard,
  a speed potion or food, agility, a phone's stick half pushed, a vista
  map's depth curve.
- Other players' legs do the same, from the speed their own moves report.
- North and south look as before at a walk. Their boots step in place in the
  art, so there is no slide to fix; their loop now only follows the speed.
- At a walk, east and west run about a fifth slower than before (1120 ms a
  loop, was 900), north-east and north-west about a quarter slower (1193,
  was 877); south-west and south-east are almost unchanged (1613, was 1656).

> **The owner tuned the old cadences by eye** (v2.3.535-707: "east is
> perfect"; north-east tried at 585, 877, 888, 1184 and 1776 ms, and 1184 was
> called too slow at v2.3.601, on the sheet before the v2.3.708 north-east
> redraw). The playtest note wins; `?legsync=0` keeps the old look one
> address away.

## The rule

```
loop ms = stride x scale / ground speed x 1000      (east, north-east, south-west)
loop ms = tuned loop x 150 / ground speed           (north, south)
```

- **stride** (`JOG_STRIDE_PX`, `src/game/legSync.js`): world px the ground
  goes by in one loop of the facing's sheet, at the default figure. Mirrored
  facings share their sheet's (west east's, north-west north-east's,
  south-east south-west's).
- **scale**: the figure's horizontal size against the default
  (`display.scale.x / PLAYER_SIZE_MULT`: the zone's curve and the bro's
  build), rounded to 1/64.
- **ground speed**: world px a second. Yours: `hypot(P.vx, P.vy) x 60` (the
  velocity BroTown sets each frame, every multiplier in it). Another
  player's: `hypot(other._vx, other._vy) x 60`, the velocity their own moves
  carry (`vx`, a 60th of a second's, x100 on the wire).
- **Quantised**: the speed without the sprint (speed / the sprint's
  multiplier) is rounded to a 24th of the walk (6.25 px/s), and held while it
  stays within 0.75 of a step; then the multiplier goes back on exactly. So a
  wobbling stick or a rounded wire velocity never wobbles the loop, and a
  sprint is exactly 1.33x the walk under it.
- **Clamped** to 350-3600 ms.
- **No speed** (held at a door, a capture): the tuned loop.
- The phase carry (`_jogOff`, v2.3.3006) is unchanged: when the loop's length
  changes, the stride carries on from where it was.
- The old rule doubled the loop while aiming, shielding or swinging. With
  leg sync the speed already says so (the shield and the held attack halve
  it), so it is not doubled again; a swing that does not slow you no longer
  slows your legs.
- The townsfolk step by distance on the player's jog (`npcWalkCell` and the
  folk's walk): their stride is the same measured one (`jogStride`).

## The strides, measured

`tools/measure_jog_stride.py` finds the boots on `jog-<dir>-legs.png` (the
only grey on the leg sheet), takes each frame's sole (the boot pixels within
4 rows of the lowest, the run holding the lowest), calls a frame planted when
the sole is within 3 rows of the loop's lowest, and averages the sole's
backward step between planted frames. `--check` fails when `JOG_STRIDE_PX`
no longer matches the sheets: a re-cut jog sheet re-measures.

| facing | frames | planted steps | boot, sheet px a frame | world px a sheet px | sideways a loop | stride |
|---|---|---|---|---|---|---|
| east | 28 | 18 | 4.56 | 1.318 | 168.4 | **168** |
| north-east | 24 | 12 | 4.53 | 1.162 | 126.4 | **179** (/ cos 45) |
| south-west | 20 | 4 | 8.01 | 1.071 | 171.4 | **242** (/ cos 45) |
| north | 23 | 15 | 0.35 (in place) | | | none |
| south | 26 | 19 | 0.22 (in place) | | | none |

- The diagonals' boots slide sideways only: the art's run is drawn near
  side-on. The visible slide is the sideways one, so the stride is the
  sideways travel over cos 45; timing cannot remove the up-and-down share.
- South-west has the fewest planted frames (4 steps), so it is the least
  certain number. It also happens to agree with the owner's tuned loop.
- The survey that started this read east's boot at 5.2 px a frame (stride
  about 192); the sole's centroid says 4.56.

### Foot slip at the walk (150 px/s), before and after

Sideways world px a second: the planted boot's pace through the frame minus
the ground's (+ = the boot slides back, the legs too fast).

| facing | old loop | old slip | legs / ground | new loop | new slip | legs / ground |
|---|---|---|---|---|---|---|
| east / west | 900 | +37.2 | 1.25 | 1120 | +0.4 | 1.00 |
| north-east / north-west | 877 | +38.0 | 1.36 | 1193 | -0.2 | 1.00 |
| south-west / south-east | 1656 | -2.6 | 0.98 | 1613 | +0.2 | 1.00 |
| north, south | 808, 823 | in place | | 808, 823 | in place | |

The old fixed loops slipped more away from the walk: east with the shield up
(75 px/s, the loop doubled) +18.6; sprinting (199.5 px/s) +49.4; a phone's
stick half pushed (75 px/s, the loop not doubled) +112. With leg sync each is
the walk's ~0.

## Switches

- `?legsync=0`: the fixed cadences for one tab, exactly the old arithmetic
  (`jogPace` with `sync: false`; the loop halved while aiming, quickened by
  the sprint).
- A caller that wants a fixed beat asks `playerSprites.cycleMs('jog', dir)`,
  unchanged, or reads the exported `JOG_DURATION_BY_DIR` (a climb drawn from
  the back-facing jog, the capture tool's clocks).

## Where

- `src/game/legSync.js`: the table and the maths (no imports).
- `src/rendering/playerSprites.js`: `JOG_DURATION_BY_DIR` (exported),
  `jogCycle(state, dir, armoured, o)`, `jogStride(dir)`, `LEG_SYNC`.
- `src/rendering/systems/entityRenderer.js`: your jog loop
  (`_updatePlayer`), a peer's (`_updateOtherPlayers`), the townsfolk's
  stride. The QA probes keep their shape: `__btJogCyc = {cyc, base, aim}`,
  `__btPeerJogCyc[id] = {cyc, base, sp}`; `base` is the loop unsped by the
  sprint.

## Tests

- `server/test/leg-sync.test.mjs`: the stride table, the loop, the clamp,
  quantising and its hold, the sprint's exact ratio (yours and a peer's
  rounded wire velocity), `?legsync=0`.
- `mp-sprint`, `mp-sprintpeer`: the sprint's legs still 1.33x the walk's.
- `mp-garmentspecks`, and the ghost audit's jog (`BT_GHOST_ONLY=jog
  BT_GHOST_OUTFITS=full`): the same frames, at a new pace.
