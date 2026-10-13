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
better), and today's cap of 60 (`MAX_PLAYERS`, `server/src/index.js`) sits
inside that. Past it the room does not fall over: it slows. A tick starts
22 ms after the last one finishes, and the world moves a fixed step a tick (a
monster's `spd` is pixels a tick), so a busier room is a slower world. It
never froze, up to 150 players, and it came back when players left (an earlier
run, taken back down to 60 after 100: 34 ticks a second again).

**#885 (`docs/specs/room-capacity.md`)** makes the room's own work
cheaper, with the same bytes to every player: smooth to about 110 players
instead of about 70, and not yet at half speed with 150 (26 ticks a second).

**What each phone downloads** grows with the crowd, because every phone is sent
every moving player's position, wherever they are in the Wheel: about 3.5 KB a
second for each moving player while the room keeps up -- **about 205 KB/s at
60 players**, about 740 MB per hour of play, on a phone that may be on a
mobile data plan. A room that slows sends less (fewer ticks), which is not a
saving anyone wants.

## Why: where the room's time goes

`tools/qa/load/load-wheel.mjs` runs the real room code inside Node with simulated
connections and a simulated clock, which measures the game's own code with no
runtime around it. "% of a core" is what one second of play costs (measured
with the first bots' moves, whose 16-digit numbers cost the room a little more
to read and write than a phone's do):

| Players | Messages in a second | % of a core | KB/s per phone |
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
moving player, less after #886: `docs/specs/far-players.md`). So raising the cap is a choice about phones as much as about the
server. `max_players` (a live flag, `docs/specs/room-full.md`) lowers the cap
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
   every move (about 40% of the update). Needs the phone to say it can do
   without them, so a change on both sides.
4. **The message diet** (§11): five positions a second with direction and
   speed instead of thirty. The biggest change: the server has to move each
   player between their messages, or monsters chasing them lurch (v2.3.1635
   tried a plain 5 Hz and was rolled back, §11).
5. **Run monster AI only near players.** Most of the 384 monsters are far from
   everyone at any moment, yet they cost 7.5% of a core with one player in the
   room.
6. **Refuse new players before the room slows down too much**, for example
   when it runs fewer than 30 ticks a second, instead of letting everyone's
   world slow.

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

## How to run it

Both tools run here in the sandbox. Neither touches the live game.

```
# the real runtime: a private copy of the server, fake players over real sockets
node tools/qa/load/load.mjs                       # 10 .. 200 players, about 12 minutes
node tools/qa/load/load.mjs --steps 10,25,50 --hold 10
node tools/qa/load/load.mjs --idle --fighters 0   # everyone standing still
node tools/qa/load/load.mjs --idle --fighters 0 --pong 30   # plus 30 do-nothing messages a second each
node tools/qa/load/load.mjs --server ../other/server   # another branch's server, same steps

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
| down KB/s /player | what each phone downloads a second |
| RSS MB | the local runtime's memory (the whole process, not only the room) |
| bots CPU | each fake-player process, as a share of one core |
| drops | sockets that closed during the step |
| probes | how fast the room answers a web request, and how fast a brand-new player gets its first message |
