# The message diet: a steady walk is sent as a path (v2.3.3726)

> Owner, 2026-10-28: *"Before when you mentioned using less server messages for
> movement, can that be started now?"* -- after asking *"Wouldn't the message
> diet slow down the game? Like introduce more lag than otherwise?"* and being
> told it must not.

**OFF BY DEFAULT.** Merged as it is, the game behaves exactly as before. It
turns on with `movepath: true` in the live flags (`POST /api/admin/flags`,
`{"name":"movepath","value":true}`), and off again by deleting the flag or
setting it `false`.

## Why

A moving phone sends its place 15 to 30 times a second (`wsClient.js`
`MOVE_GAP_SEEN_MS` 33 ms with a player near, 66 ms alone; 66 ms on the safe
ground since `docs/specs/move-diet.md`). Messages coming in are the biggest
line of the server bill and what fills a room
(`docs/WORLD-ARCHITECTURE.md` §11, "The fix: fewer messages", item 1).

v2.3.1635 tried a plain 5 a second while alone, and chasing monsters
rubber-banded: they chase the server's copy of you, and that copy then moved
in 40 px jumps. v2.3.1767 put the floor back to 15 a second. So the diet only
works if the server **fills in** between messages, and that is what this does.

## What changed

**The phone** (`src/game/moveDiet.js` `pathMayWait`, `pathTurned`;
`wsClient.js` `movePathOn`), against a worker that advertises `caps.movepath`,
in the Wheel, not in a duel or an arena match:

- every move carries `pd: 1` ("move me along my speed until my next one");
- a **steady** move -- every other field as sent, still moving, the same speed
  within ~2 degrees, within 2 px of the line, and as far along it as the speed
  says (to 2 px + 8 ms of the speed), under 500 px a second -- waits until
  **200 ms** after the last one sent: about 5 a second;
- a **change** -- a turn past ~2 degrees, a start, a stop, a sprint, a roll, new
  gear, any field -- goes on the very next 33 ms batch (sooner than today when
  alone, where it waited for 66 ms);
- a move that is only **off its line at the same speed** -- a wall, a monster's
  body, a shove, the ice -- keeps the rate it always had (33 or 66 ms).

Your own controls never wait: the phone moves you at once, as always. The
moves are only its reports.

**The worker** (`server/src/movepath.js`), with the switch on, for a move
marked `pd: 1`:

- it moves its copy of you along your speed between moves, first thing every
  tick (`_tickMovePath`), before the lag compensation's history is taken, the
  monsters chase and any hit is judged -- so all of those read a player who
  walks smoothly;
- never faster than the walk's own bound (`MOVE_BUDGET.SPEED_PX`, with the
  potion and move stat it sold, and the sprint only when it bills it): a
  faster speed on the wire is clipped to it;
- never more than **300 ms** past the last move: a phone that goes quiet is
  left there, as today;
- **each new move is judged from the last move's place**, not from the guess
  (`_movePathRewind`): the walk budget, the sprint's bill, the race's flags and
  the poses work from move to move exactly as before. The glide is never spent,
  billed or trusted;
- it stops the moment anything else puts you somewhere (a lunge, a dash, a
  respawn, a follow), you die, or you leave the Wheel;
- a glider goes out to the other phones every 66 ms, the steady hold's own
  rate, so a watching phone gets the walker as often as before and draws them
  from their speed, as it always has.

The worker has no walls (the phone does), so the copy stops at what the worker
already refuses (speed and zone) and no more. A phone that meets a wall
reports at once (its place stops matching its speed), so an honest copy runs
into a wall for at most one batch: measured 6.9 px.

**Both protocol versions** keep working: the move message is the same for v1
and v2, with one more field. An old phone never sends `pd` and is never
glided; an old worker never advertises the cap and every phone sends as
before.

## Measured

### The server test (`server/test/move-path.test.mjs`, 30 checks)

A phone's frames (every 16.7 ms), its 33 ms batch, a network of 40 ms each way
(give or take 15 ms) and the room's ticks on one clock, a walker beside a
watcher. A walk of straight runs, turns, a zig-zag every quarter second, hard
back-and-forths every 180 ms and stops.

| | Today | With the path |
|---|---|---|
| Moves a second, a straight walk in a land, a player near | 30 | 4.3 |
| ...alone | 15 | 4.3 |
| ...in BroTown (today's diet) | 15 | 4.3 |
| ...the zig-zag walk | 15.7 | 5.3 |
| The server's copy from the phone, average | 10.5 px | 6.8 px |
| ...95% of the time | 18.1 px | 10.6 px |
| ...in the 150 ms after a turn, average / 95% | 9.9 / 17.7 px | 6.8 / 10.6 px |
| Ticks the copy jumped (4+ px past the walk's own step) | 94 of 362 | 3 of 362 |
| The copy's biggest step in a tick | 16.5 px | 13.6 px (a hard reversal's correction) |
| The watcher draws the walker off by, average / 95% | 23.8 / 45.7 px | 23.7 / 43.4 px |
| A turn / stop / start reaching the watcher | 122 / 116 / 100 ms | 100 / 116 / 100 ms |

The copy is **closer** to the phone than today, because today it stands still
between messages and then jumps; now it walks between them. The one place it
is briefly further is the first 40-70 ms after a hard reversal (it walks on
the old way until the turn arrives, where today it stood still): the 3 jumps.

Also checked: a speed past the bound glides at the bound and stops 300 ms on
(a script claiming 30 px a frame moved 150 px); a move is judged from the last
move's place, so a glide plus a whole budget is impossible; a server-placed
player and a dead one are not glided; off by default; `movepath: true`
advertises it; an old phone is sent and moved exactly as today; taking the
switch away stops every glide on the next tick.

### The load test (`tools/qa/load/load.mjs --steps 50,100 --diet [--path]`)

The real runtime, phone-shaped bots, 30% fighting:

| Players | Messages in a second | Room thread busy | Ticks a second | Tick delay p95 | Download a player (unzipped) | On the wire |
|---|---|---|---|---|---|---|
| 50, today | 483 | 49.5% | 41.8 | 14 ms | 60.5 KB/s | 6.3 KB/s |
| 50, path | **199** | **44.8%** | 41.8 | 8 ms | 63.5 KB/s | 6.5 KB/s |
| 100, today | 891 | 85.7% | 39.9 | 16 ms | 88.5 KB/s | 10.8 KB/s |
| 100, path | **405** | **80.8%** | 40.0 | 15 ms | 114.1 KB/s* | 11.1 KB/s |

*Measured before the glide's places were rounded to a tenth of a pixel (a long
fraction on every glided place); the wire, compressed, was about the same.
The load test's "others' moves seen" column matches a place a bot SENT with a
place it is SHOWN, which a glided place never is, so it says nothing about the
path; the watcher's view is measured in the server test and on the phone
instead.

### The cost audit (`tools/qa/load/cost-audit.mjs [--path]`, 20 game minutes)

| Persona | Messages in a player-hour, today | With the path |
|---|---|---|
| walk | 54,544 | 14,164 (-74%) |
| fight | 86,173 | 59,026 (-31%) |
| gather | 2,385 | 1,941 |
| idle | 36 | 36 |

Rows written: walking still writes none; a fighter wrote 690 an hour against
614, from more kills in the same 20 minutes (kill saves 557 against 484), the
same rows a kill.

### On a phone (`tools/qa/mp/mp-movepath.mjs`)

See the PR for the run's numbers.

## Switches and caps

- `movepath: true` in the live flags: the worker advertises `caps.movepath`
  (join.js) and glides. Absent (the default) or `false`: no cap, no glide from
  the next tick; each phone sends every move again from its next join.
- `/api/admin/overview`'s `movePath`: on, and how many glide now.
- Test mode: a test-mode character's moves are taken where the phone says, as
  before; the glide moves it between them like anyone's.
- Nothing is stored (`_mp` is an underscore field on the player state).

## Files

`server/src/movepath.js`; `server/src/movement.js` (`_handleMove`: rewind,
then note); `server/src/tick.js` (the glide first, its time for the steady
hold); `server/src/join.js` (`caps.movepath`); `src/game/moveDiet.js`;
`src/networking/wsClient.js`; `tools/qa/load/bots.mjs`, `load.mjs`,
`cost-audit.mjs` (`--path`); `tools/qa/mp/mp-movepath.mjs`.
