# How many players one room holds — the bot load test (v2.3.3194)

> Owner, 2026-10-12, picking the first of the recommendations ("Find out how
> many players the game can hold ... A load test would connect 100 or more
> fake players to a test copy of the server and show where it starts to
> struggle"): *"Yeah start 1"*.

The whole game is one room (one Durable Object, `brotown-1`), and since
v2.3.2990 one zone in it, the Wheel. `docs/WORLD-ARCHITECTURE.md` §11 estimated
that a room "tops out around 30-60 busy players" and asked for a bot load test
"before any launch push". The capacity campaign before it (`server/test/load-crowd.mjs`,
`docs/specs/room-full.md`, v2.3.1973) measured the old meadow zone inside a
simulated room, before the Wheel existed. This is the first measurement of the
Wheel, and the first against the real runtime.

## The answer

Measured here, in the sandbox, with everyone in the Wheel: 70% of the players
walking the town and its commons, 30% fighting their land's first stretch,
every one sending what a phone sends at a phone's rate (33 ms while moving).
The local runtime's own tracing was off: it is on by default and made every
message about five times dearer (see "The trap in local numbers" below).

| Players | What a player would see | The room |
|---|---|---|
| 25 | smooth: the others' moves arrive in 18 ms (half the time), 30 ms (95%) | its thread 29% busy, 39 ticks a second |
| 50 | smooth: 22 / 36 ms; a new player gets in within 33 ms | 55% busy, 36 ticks a second |
| 75 | the world starts to slow: 32 ticks a second; moves 26 / 40 ms | 73% busy |
| 100 | slower: 29 ticks a second, monsters at 64% of their speed; moves 32 / 46 ms; a new player 91 ms | 88% busy |
| 125 | about half speed: 25 ticks a second; moves 37 / 57 ms; a new player 0.14 s | 89% busy |
| 150 | 20 ticks a second; moves 37 / 57 ms; a new player 0.3 s | 98% busy |

So with today's code the room is **smooth to about 70 busy players** (33 ticks
a second or more: the world at three quarters of its designed speed or
better), and the cap of 60 then (`MAX_PLAYERS`, `server/src/index.js`; 120
since v2.3.3205, `docs/specs/cap-120.md`) sat inside that. Past it the room does not fall over: it slows. A tick starts
22 ms after the last one finishes, and the world moves a fixed step a tick (a
monster's `spd` is pixels a tick), so a busier room is a slower world. It
never froze, up to 150 players, and it came back when players left (an earlier
run, taken back down to 60 after 100: 34 ticks a second again).

**#885 (`docs/specs/room-capacity.md`)** makes the room's own work
cheaper, with the same bytes to every player: smooth to about 110 players
instead of about 70, and not yet at half speed with 150 (26 ticks a second).

**#888 (`docs/specs/near-searches.md`)** finds who is near whom by squares,
the same picks: smooth to about 125. **v2.3.3202 (`docs/specs/tick-pace.md`)**
paces the gap between ticks, since "a tick starts 22 ms after the last one
finishes" is the runtime's `setInterval` (TRAPS §170): a busy room keeps a
quiet room's speed while its thread has the time -- 40.4 ticks a second at
100 players, about 30 at 150, smooth to about 130.

**What each phone downloads** grows with the crowd, because every phone is sent
every moving player's position: about 3.5 KB a second for each moving player
while the room keeps up, **as the phone unzips it**. On the wire it is about a
thirteenth of that, because the room compresses every message (v2.3.3199,
below): **about 15 KB/s at 60 players, about 55 MB per hour of play** -- not
the 205 KB/s and 740 MB this page first said, which were the unzipped bytes.
A room that slows sends less (fewer ticks), which is not a saving anyone wants.

## What a phone really downloads, and what compressing it costs (v2.3.3199)

**The room compresses everything it sends.** The worker's compatibility date
(`compatibility_date = "2024-12-01"` in `server/wrangler.toml`) is past
2023-08-15, which turns on the runtime's `web_socket_compression`, and every
browser asks for compression (`permessage-deflate`) when it connects. So does
Node's own WebSocket, which the bots use: the bots were always compressed, and
the room's CPU in every table here already includes the compressing. What the
tables did NOT show is the wire: a bot counts the messages as it reads them,
unzipped.

`load.mjs` now measures the wire too: the first bot of the first process goes
through a byte-counting proxy (`startWireProxy`), and the `wire KB/s` column is
every phone's download on the wire, from that bot's ratio of unzipped to
compressed bytes (about 13 to 1).

**Compressing is about 40% of the room's work.** `--no-deflate` makes the bots
connect without asking for compression (a WebSocket of their own, `PlainWS` in
`bots.mjs`, since the `no_web_socket_compression` flag in a copy's
`wrangler.toml` did not stop the local runtime compressing), so the room sends
them plain text. On main after #886, the same steps one after the other:

| Players | Room's thread, compressed (as phones are) | Room's thread, plain | Ticks a second, compressed / plain | Each phone, unzipped / on the wire |
|---|---|---|---|---|
| 50 | 45.5% | 27.3% | 36.3 / 37.3 | 135 / 10.4 KB/s |
| 100 | 79.6% | 44.6% | 34.0 / 34.3 | 217 / 17.4 KB/s |
| 150 | 92.3% | 55.5% | 26.2 / 31.7 | 199 / 19.9 KB/s |

So **what the room sends costs it CPU**: deflate runs once per message per
phone, over that message's whole length. Turning compression off is not an
answer -- each phone would download thirteen times as much. But not every byte
costs the same: **repeated text is nearly free and new text is not.** Leaving
the unchanged gear keys out of every player entry (item 3 below) cut 29% of
the bytes at 100 players and saved the room nothing it could measure (79.5% of
its thread before, 82.9% after, inside the run-to-run noise): deflate finds
those repeats at once. What costs is what changes from tick to tick --
positions, speeds -- and the number of messages: the same 100 players sent a
message every other tick instead of every tick (half the messages, each
carrying both ticks' changes, so about a quarter fewer player entries) took
the room from 79.5% to 61.5%.

**What the bytes are.** A phone walking in BroTown with 100 players about
(`tools/qa/load/tickmix.mjs`, a probe that sorts each message it receives): 98% of its bytes are
other players' entries in the tick (55 a tick, 146 bytes each), 1.4% combat
events, and no monsters (the town is safe ground). Each entry repeats the
player's zone, gear and activity (`z`, `eqc`, `eql`, `eqs`, `ex`) on every
move.

**Two other ideas measured and dropped** (main after #886, same steps):

| Tried | 50 | 100 | 150 | |
|---|---|---|---|---|
| plain `accept()`ed sockets instead of the hibernation API (index.js) | 45.1% | 76.3% | 91% | within run-to-run noise (about 3 points) |
| near circle 1,400 px instead of 2,400 (`FAR_PLAYERS.NEAR_R`) | 46% | 79.9% | 92.6% | 6-15% fewer bytes, the same CPU: most of a town crowd is inside 1,400 px anyway |

**And one that works: fewer moves.** `--move-ms 66` has every bot send a move
every 66 ms instead of a phone's 33: messages in drop from 2,098 to 1,156 a
second at 100 players, the room's thread from 79.6% to 68.9%, and each phone's
download by a quarter. That is the message diet's lever (§11, item 4 below).

## Why: where the room's time goes

`tools/qa/load/load-wheel.mjs` runs the real room code inside Node with simulated
connections and a simulated clock, which measures the game's own code with no
runtime around it. "% of a core" is what one second of play costs (measured
with the first bots' moves, whose 16-digit numbers cost the room a little more
to read and write than a phone's do):

| Players | Messages in a second | % of a core | KB/s per phone (unzipped) |
|---|---|---|---|
| 1 | 24 | 7.5% | 53 |
| 10 | 230 | 12.8% | 48 |
| 25 | 579 | 22% | 97 |
| 50 | 1,155 | 32% | 172 |
| 75 | 1,727 | 56% | 244 |
| 100 | 2,299 | 57-71% | 317 |
| 150 | 3,443 | 116% | 466 |
| 200 | 4,586 | 174% | 614 |

A profile at 100 players (`node --cpu-prof`) splits that time:

| Share | What | Where |
|---|---|---|
| 43% | building each player's own tick message | `buildFor` in `server/src/tick.js` |
| 25% | the 384 monsters' AI | `_tickMonsters` in `server/src/index.js` |
| 7% | safe-ground checks, every monster against every player | `_wheelSheltered` / `_wheelProvokedBy`, `server/src/wheelzone.js` |
| 7% | the per-tick history snapshot of every player | the tick loop, `server/src/tick.js` |
| 4% | which monsters each player hears about | `_wheelInterest`, `server/src/wheelzone.js` |
| 3% | taking the players' moves in | `webSocketMessage`, `_handleMove` |

The biggest line is the Wheel's own: each player hears only the monsters near
them, so tick.js builds every Wheel player's message on its own
(`key += '|' + s.id`), and every one of those messages lists every moving
player in the Wheel. That is the same player list serialised once per person
-- work that grows with the square of the crowd. (#885 builds the shared parts
once, among other things: room-capacity.md.)

The real runtime costs more than the code alone (at 50 players its thread was
55% busy where the code alone is 32%). Taking a message in is a small part of
that, measured with players who stand still and send extra `pong`s (the
cheapest message the worker accepts: its case only folds a number into the
session's round-trip time):

| Standing players | Messages in a second | Room's thread |
|---|---|---|
| 25 | 36 | 11% |
| 25, plus 30 pongs a second each | 790 | 18% |
| 50 | 69 | 19% |
| 50, plus 30 pongs a second each | 1,575 | 28% |

About **0.06-0.09 ms of the room's thread a message**, so 60 moving players'
1,250-1,430 messages a second cost about a tenth of it. The rest is mostly
**sending**: every player's update, every tick, which grows with the square of
the crowd like the bytes above. A crowd standing still is cheap (50 standing
players, 19%): moving players are what cost, twice -- their messages in, and
their positions out to everyone else.

## The trap in local numbers

`wrangler dev` (4.x) records a trace and the logs of EVERY event for its local
explorer page, on by default (`X_LOCAL_OBSERVABILITY`, `X_LOCAL_EXPLORER`). The
live runtime does nothing of the kind, and every incoming WebSocket message is
an event. With it on, the same measurements said:

- a message cost the room 0.3-0.5 ms, not 0.06-0.09;
- the room was full at about 60 players;
- at about 95-100 players it froze. Nothing reached anyone, a web request into
  the room went unanswered, memory climbed 0.6 -> 1.9 GB in two minutes, and it
  did not come back when players left.

None of that happens with it off (tested to 150 players). `load.mjs` turns it
off; `--observability` turns it back on to compare. Any local measurement of a
Durable Object's message handling should do the same.

## How sure this is: this machine is not Cloudflare

- **The processor.** The sandbox is a 4-core 2.1 GHz Xeon virtual machine.
  Cloudflare's servers are newer and probably faster per thread.
- **The runtime.** `wrangler dev --local` runs `workerd`, the same open-source
  runtime Cloudflare runs. Production adds its own layers (routing, metering),
  not measured here.
- **Cloudflare's own guidance** (WORLD-ARCHITECTURE §11) is about 500-1,000
  requests a second for one Durable Object. 60 moving players send 1,250-1,430
  messages a second. Whether incoming WebSocket messages count fully against
  that is not documented; if they do, production would be past it at 25-45
  players.
- **The network** here is the machine itself. Real phones add 50-200 ms and
  need the download speeds above.

The only way to know production's number is to run this tool against a copy of
the server deployed on Cloudflare (a separate worker with its own name, never
the live game). That is a decision for the owner, not done here.

**For planning:** with today's code, treat **60 busy players** (today's cap)
as the most one room holds smoothly. The server would hold more after #885, but
each phone's download grows with the crowd too (about 3.5 KB a second per
moving player unzipped, about a quarter of a kilobyte on the wire; less after
#886: `docs/specs/far-players.md`). On the wire that is small: a room of 150
sends each phone about 20 KB a second. What the phones pay for a bigger crowd
is mostly drawing it (`tools/qa/mp/mp-crowd.mjs` measures that), not downloading it. `max_players` (a live flag, `docs/specs/room-full.md`) lowers the cap
without a deploy.

## What would raise the limit

1. **#885, the same bytes to everyone:**
   - each tick's shared parts are built once;
   - each player's monsters are found on a grid;
   - the safe-ground check comes after the distance check;
   - the history snapshot reuses its entries.
2. **#886 (`docs/specs/far-players.md`): players far from you
   less often** (§11's "distance-based updates"), as monsters already were
   (`_wheelInterest`, 2,400 px): each phone downloads 13-25% less with a crowd
   mostly in town and 23-41% less with everyone out in the lands. And
   **positions in whole pixels** -- but the phones already send a tenth of a
   pixel, so that part saves only ~2.4% of a player's update; the "about a
   quarter" this list once said came from the first bots' 16-digit numbers.
3. **Leave out what did not change**: a player's zone, gear and activity ride
   every move (about 40% of the update). The gear and activity can go with no
   change on the phone: the game already keeps the last gear and activity it
   was sent when an entry leaves them out (`wsClient.js`, the tick's players).
   The zone cannot: an entry without one puts the player in no zone.
   Measured (v2.3.3199): 29% fewer bytes for each phone, but none of the
   room's time -- the repeated keys were nearly free to compress (above).
4. **The message diet** (§11): five positions a second with direction and
   speed instead of thirty. The biggest change: the server has to move each
   player between their messages, or monsters chasing them lurch (v2.3.1635
   tried a plain 5 Hz and was rolled back, §11). Half the moves alone took the
   room from 79.6% to 68.9% of its thread at 100 players (`--move-ms 66`,
   above): fewer messages in, and fewer player entries to build and compress
   for every phone.
5. **Run monster AI only near players.** Most of the 384 monsters are far from
   everyone at any moment, yet they cost 7.5% of a core with one player in the
   room. *v2.3.3201 (`docs/specs/near-searches.md`): the part that grew with
   the crowd -- every monster measuring its distance to every player, a
   quarter of the room's work at 150 -- now looks only in the squares near
   the monster, with the same picks; 3-4 more ticks a second at every size,
   smooth to about 120.*
6. **Refuse new players before the room slows down too much**, for example
   when it runs fewer than 30 ticks a second, instead of letting everyone's
   world slow.
7. **Past one room: split it by connection** (v2.3.3208,
   `docs/SERVER-SPLIT-PLAN.md`): front doors that do each phone's work, one
   world behind them. A scratch copy of the room doing only the world's part
   ran 1,000 players in 6 ms of a 22 ms tick. And the phone's side of a big
   crowd: `tools/qa/mp/mp-crowdbots.mjs` stands a phone page among the load
   test's bots (`BT_NO_TRACE=1 node tools/qa/mp/run.mjs crowdbots`). The
   game's own work for one frame grew about 4x from an empty town to 106
   players on screen.

## How it was measured

- `tools/qa/load/load.mjs` (the conductor) copies `server/` to a temporary
  folder, raises `MAX_PLAYERS` in the copy only (the game's own code is never
  edited), and starts the copy with `npx wrangler dev --local` on its own empty
  storage. It forks bot processes, adds players step by step, lets each step
  settle (20 s: a fighter's walk out to its land), measures 20 s, and saves the
  results after every step. It stops at the first sign of a broken room, then
  takes 40% of the players out to see if the room recovers.
- `tools/qa/load/bots.mjs` (the fake players) speaks the real wire protocol
  with Node's built-in WebSocket: a guest join with `protocolVersion: 2`, a
  `pong` for every `ping`, the zone change down to the Wheel at the town square
  a beat after `state_sync`, positions every 33 ms while walking at 150-180
  px/s and once a second standing (the client's own cadence, `wsClient.js`),
  `monster_damage` every ~0.7 s for fighters within reach, and a walk back in
  after `player_respawned`. Each move is a phone's (BroTown.jsx's broadcast
  through the shim): positions to a tenth of a pixel, speed in whole
  hundredths of a pixel a frame, the 8-way facing, worn gear, and an id as long
  as a real one. Two players in each process read every tick and time how long
  the move of another player within 2,400 px of them (on their screen) took
  to reach them.
- The first version of this test sent positions to a hundredth of a pixel and
  speed as a 16-digit fraction. Against those the room measured a little worse
  (smooth to about 65, half speed from about 110) and the phones' download a
  little lower (no gear in the moves); the tables here are a phone's moves.
- The server's CPU is read from `/proc`: the busiest thread of `workerd` (a
  Durable Object runs on one thread, so that is the number that says "full").
- `tools/qa/load/load-wheel.mjs` measures the code alone, as above.
- The local runtime's tracing is off (`X_LOCAL_OBSERVABILITY=false`,
  `X_LOCAL_EXPLORER=false`; "The trap in local numbers").

The fake players' own CPU (about 20% of a core per process, three processes)
and event-loop delay (13-15 ms at p99) were watched in every step. They were
not the bottleneck.

## v2.3.3240: `--track`, the phones' 2 s look

The bots never sent `track`: a phone's whole look, every 2 s, which the worker
relayed to every other player. So every number above it left that out.

- `--track` makes each bot send a real phone's payload
  (`track-sample.json`, caught by `mp-trackcapture`).
- Without the look relay's change (`docs/specs/look-relay.md`) the room was
  smooth only to about 105. With it, about 145, as these pages say.
- Use `--track` for any capacity number from now on (TRAPS §173).
- `--walk-r N` packs the walkers into a smaller circle round the square.

## How to run it

Both tools run here in the sandbox. Neither touches the live game.

```
# the real runtime: a private copy of the server, fake players over real sockets
node tools/qa/load/load.mjs                       # 10 .. 200 players, about 12 minutes
node tools/qa/load/load.mjs --steps 10,25,50 --hold 10
node tools/qa/load/load.mjs --idle --fighters 0   # everyone standing still
node tools/qa/load/load.mjs --idle --fighters 0 --pong 30   # plus 30 do-nothing messages a second each
node tools/qa/load/load.mjs --server ../other/server   # another branch's server, same steps
node tools/qa/load/load.mjs --no-deflate             # bots that don't ask for compression (what it costs)
node tools/qa/load/load.mjs --move-ms 66              # every bot moves every 66 ms, not 33
node tools/qa/load/tickmix.mjs 'ws://127.0.0.1:PORT/ws?room=loadtest&rf=1' 25   # beside a run: what one phone is sent, by part
node tools/qa/load/load.mjs --town-move-ms 66         # only the town walkers move every 66 ms (v2.3.3203)
node tools/qa/load/load.mjs --worker-log /tmp/w.log   # keep the worker's whole log (console.log of a copy)

# where the real runtime's thread goes, during a long hold (v2.3.3203)
node tools/qa/load/load.mjs --steps 150 --hold 120 --inspector-port 9230 &
node tools/qa/load/cdpprof.mjs 9230 20 /tmp/room.cpuprofile   # its JavaScript, through its debugger
node tools/qa/load/gdbprof.mjs 30                              # its C++ too: compressing, writing, parsing

# the server's own code, no runtime: CPU per player count, and a profile
node tools/qa/load/load-wheel.mjs 1,10,25,50,100
node --cpu-prof --cpu-prof-dir=/tmp/prof tools/qa/load/load-wheel.mjs 100
```

`load.mjs` options:
- `--steps`: player counts;
- `--hold`: seconds measured a step (20);
- `--settle`: seconds after a step fills before measuring (20);
- `--procs`: bot processes (3);
- `--fighters`: share of players who fight (0.3);
- `--cap`: the copy's player cap (400);
- `--joinrate`: joins a second while a step fills (10);
- `--idle`, `--pong N`;
- `--recover-to`: share kept after a break (0.6);
- `--recover-settle`: seconds given to recover (20);
- `--no-recover`;
- `--observability`: leave wrangler's local tracing on (off by default, see above);
- `--server <folder>`: test another checkout's `server/` (a branch under test),
  copied the same way;
- `--url ws://127.0.0.1:PORT`: an already running LOCAL worker. Anything else
  is refused, because the tool fills a room with hundreds of characters.
- `--no-deflate` (v2.3.3199): the bots do not ask for compression, so the room
  sends them plain text: what compressing costs the room;
- `--move-ms N` (v2.3.3199): a bot's move every N ms instead of a phone's 33;
- `--seen-r N` (v2.3.3199): "others' moves seen" counts senders within N px
  (2,400 by default, the worker's near circle);
- `--relays` (v2.3.3245): with each blow, a fighter also sends what a phone
  tells the others about it: its swing (`player_swing`) or, for half of them,
  its arrow (`player_projectile`). The room relays these to every phone
  (before events by place), and without them the bots never showed it;
- `--events` (v2.3.3245): what the probes' ticks carry in `events`, a second,
  in all and by type (docs/specs/events-by-place.md).

A step counts as broken when:
- the others' moves arrive later than 1.5 s at p95; or
- the room runs fewer than 25 ticks a second; or
- no ticks reach the players; or
- the server's memory grows by more than 300 MB in a step.

Results go to `tools/qa/out/load/load-<time>.json` and `.md` (git-ignored).

Run one at a time, with nothing else heavy beside it. The fake players share
the machine with the server, and their own CPU is in the table so a run where
they were the bottleneck can be spotted. Afterwards check `ps` for stray
`workerd` processes (CLAUDE.md, "reap stragglers").

## What each column means

| Column | What it is |
|---|---|
| players | fake players in the room |
| msgs/s in | messages the room received a second, all players together |
| server thread | the busiest thread of the local runtime, as a share of one core. A room runs on one thread, so 100% is full |
| ticks/s | how many ticks the server really ran a second. The tick is set for every 22 ms (45 a second); even with 10 players the local room ran about 40 |
| tick delay | from a tick's own timestamp to a player receiving it |
| others' moves seen | from one player sending a position to another player receiving it: the lag a player sees in everyone else |
| down KB/s /player | what each phone is sent a second, as it reads it (unzipped) |
| wire KB/s | what each phone downloads a second on the wire, compressed (v2.3.3199: one bot through a byte-counting proxy gives the ratio) |
| RSS MB | the local runtime's memory (the whole process, not only the room) |
| bots CPU | each fake-player process, as a share of one core |
| drops | sockets that closed during the step |
| probes | how fast the room answers a web request, and how fast a brand-new player gets its first message |
