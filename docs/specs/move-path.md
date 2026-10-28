# The message diet: a steady walk is sent as a path (v2.3.3726)

> Owner, 2026-10-28: *"Before when you mentioned using less server messages for
> movement, can that be started now?"* -- after asking *"Wouldn't the message
> diet slow down the game? Like introduce more lag than otherwise?"* and being
> told it must not.

**Off for players by default, with three switches** (the owner, 2026-10-28:
*"I would want to play it with it on before tomorrow to see if there's any
noticeable difference. If not, I'd rather just leave it on."*):

- **The worker always understands it**: it glides any move a phone marks
  `pd: 1`. No phone marks its moves unless asked, so with nothing set every
  phone sends exactly as today.
- **One phone**: open the game with `?diet=1` at the end of its address (for
  example `https://<the game's address>/?diet=1`). That tab keeps it through
  reloads; `?diet=0` takes it off again.
- **Every phone**: the Test panel, **Message diet**, **On for everyone** (the
  live flag `pathall: true`). **Only ?diet=1 phones** goes back to the
  default; **Off for everyone** is the kill switch (`movepath: false`), which
  stops it on every phone, `?diet=1` ones too. Each tap reaches every phone at
  once (`move_path`); nobody needs to reload, and no deploy is needed.

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

### The load test (`tools/qa/load/load.mjs --diet [--path]`)

The real runtime, phone-shaped bots, 30% fighting. Three runs each way (the
first two at 50 and 100 players, the third at 100 with `--tick-parts`); this
box's numbers wander from run to run, so all of them are here:

| Players | Messages in a second | Room thread busy | Ticks a second | Tick delay p95 | Download a player (unzipped) | One probe's wire |
|---|---|---|---|---|---|---|
| 50, today | 483 | 49.5% | 41.8 | 14 ms | 60.5 KB/s | 6.3 KB/s |
| 50, path (run 1 / run 2) | **199 / 208** | **44.8% / 42.3%** | 41.8 / 41.8 | 8 / 8 ms | 63.5 / 70.8 KB/s | 6.5 / 7.5 KB/s |
| 100, today (run 1 / run 3) | 891 / 971 | 85.7% / 80.8% | 39.9 / 40.9 | 16 / 19 ms | 88.5 / 105 KB/s | 10.8 / 8.3 KB/s |
| 100, path (run 1 / 2 / 3) | **405 / 429 / 399** | **80.8% / 84.6% / 73.5%** | 40.0 / 40.0 / 41.4 | 15 / 11 / 10 ms | 114 / 143 / 97 KB/s | 11.1 / 12.4 / 11.3 KB/s |

- **Messages in are cut by more than half** (the bots' walkers stay on the
  safe ground, where today's diet already halved them; the fighters send
  every 200 ms instead of 33).
- **The room's thread is a little less busy and the ticks hold** at 50 and
  100.
- **What each phone downloads is about the same to a third more.** With
  `--tick-parts` (run 3), a tick's players shrank (1.83 to 1.27 KB) and its
  monsters grew (0.31 to 0.44 KB): a monster chasing a player now moves every
  tick, smoothly, where today it ran, arrived and waited -- the rubber-banding
  of v2.3.1767 gone, paid for in monster updates. Glided places also compress
  less well than repeated ones. The wire figure is one probe's view and
  wanders (8.3 and 10.8 KB/s on two runs of today). Downloads are not what the
  bill counts (messages in are); a phone's data use is.
- The load test's "others' moves seen" column matches a place a bot SENT with
  a place it is SHOWN, which a glided place never is, so it says nothing about
  the path; the watcher's view is measured in the server test and on the
  phone instead.

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

A real page and a bare peer socket, a page as today and one with `?diet=1`
(11 checks; the first page also has `pathall` and then the kill switch
flipped live, and follows each at once). Two runs, both passing; the first
run's numbers: The box draws the game in software, so during a walk
the game draws a frame a second and the walk is the game's own move broadcast
written from a page timer (as `mp-movediet`); the worker's copy is read 20
times a second off `/api/admin/player`.

| | Today | With the path |
|---|---|---|
| Moves a second on the wire, a straight walk | 9.7 (this box's timers) | 4.3 |
| ...the zig-zag | 11.6 | 6.2 |
| The peer is sent the walker, a second | 9 | 15.3 |
| BroTown zig-zag: the copy from the phone, average / 95% | 7.2 / 17.3 px | 5.1 / 22.6 px |
| ...in the 150 ms after a change, average / 95% | 8.6 / 32 px | 3.8 / 8.2 px |
| The peer draws the walker off by, average / 95% | 29.8 / 66.9 px | 22 / 44.2 px |
| Among the Flame Fields' monsters: the copy from the phone, average / 95% | 7.6 / 28.9 px | 7.0 / 34.8 px |
| ...after a change, average | 7.9 px | 5.1 px |
| Blows on the walker in 38 s / within 150 ms of a change | 5 / 0 | 3 / 1 |
| The copy from the phone at a blow, average | 5.2 px | 1.4 px |

The second run (after the switches moved to `?diet=1`): straight walk 11.7 ->
5 moves a second, the zig-zag 11.9 -> 6; BroTown copy from the phone mean 7.3
-> 2.6 px, 95% 21.1 -> 8.4, after a change mean 6.9 -> 2.2, 95% 21.1 -> 7.6;
the peer's drawing mean 22.9 -> 15.9, 95% 41.2 -> 37.1; among the monsters
mean 6.9 -> 3.6, after a change 6.6 -> 3.1 (95% 17.5 -> 11.9), overall 95%
17.5 -> 21.1; at a blow 2.6 -> 1.7 px (1 blow -> 6).

After a change (a turn, a roll, a stop) the copy is much closer than today,
and the watcher draws the walker closer. The worse 95% overall comes from this
box's page timers, which run a few times a second: a change waits for the
page's batch, and in the meantime today's copy stands still while the path's
walks on the old way. A phone's timers run on time (the server test above
runs a phone's on its own clock). The blows are too few in either run to say
more than that the copy was where the phone was when they landed.

## Switches and caps

- `caps.movepath` (join.js): the worker glides `pd` moves. On by default;
  `movepath: false` in the live flags (the kill switch) takes it away and
  stops every glide from the next tick.
- `caps.pathall`: every phone is on the path. Only with `pathall: true` in the
  live flags, and never with the kill switch thrown.
- A change to either flag (`POST` or `DELETE /api/admin/flags`) sends every
  phone `move_path {on, all}` (a privileged type), and each phone's next batch
  follows it.
- The phone (`wsClient.js` `movePathOn`): on the path when the worker glides
  and either `?diet=1` was in the address (kept for the tab in
  sessionStorage `bt_diet`) or `caps.pathall` is on and the address did not
  say `?diet=0`.
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
