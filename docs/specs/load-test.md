# How many players one room holds — the bot load test (v2.3.3192)

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
every one sending positions at a phone's rate (33 ms while moving).

| Players | What a player would see | The room |
|---|---|---|
| 10 | smooth: the others' moves arrive in 17 ms (half the time), 28 ms (95%) | its thread 32% busy, 40 ticks a second |
| 25 | smooth: 20 / 32 ms | 56% busy, 38 ticks a second |
| 40 | smooth: 21 / 34 ms | 74% busy, 37 ticks a second |
| **60 (today's cap)** | smooth: 25 / 41 ms; a new player gets in within 57 ms | **88-90% busy**, 33-34 ticks a second |
| 70 | the world slows: 30 ticks a second; moves 31 / 52 ms | 95% busy |
| 80 | slower: 28 ticks a second; moves 37 / 54 ms | 96% busy |
| 90 | slower still: 24 ticks a second, so monsters, burns and timers run at about half speed; moves 47 / 69 ms | 98% busy |
| **about 95-100** | **frozen**: nothing reaches anyone, a new player cannot get in, the room does not answer a web request within 10 s | 99% busy, memory climbing (0.6 -> 1.9 GB in two minutes) |
| back down to 60, or to 30 | **still frozen** a minute later | still 99% busy, memory still climbing |

(60 was measured three times: 88.1%, 90.3% and 87.7% busy; 34.1, 33.8 and 33.2
ticks a second.)

So on this machine **about 60 busy players is the edge**, and that is exactly
today's cap (`MAX_PLAYERS` 60, `server/src/index.js`). Past it the room does not
fall over at once: it slows down, because a room whose one thread is full runs
fewer ticks, and the world moves a fixed step per tick. Past about 95 it
freezes, and **a frozen room did not come back** when 40% or even 70% of the
players left. On Cloudflare a room is capped at 128 MB of memory, so the likely
end there is the platform resetting the room, which disconnects everyone at once.

**What each phone downloads** grows with the crowd, because every phone is sent
every moving player's position many times a second, wherever they are in the
Wheel: 46 KB/s at 10 players, 83 at 25, 130 at 40, **170-190 KB/s at 60**. That
is about 600-700 MB per hour of play at 60 players, on a phone that may be on a
mobile data plan.

## Why: where the room's time goes

`tools/qa/load/load-wheel.mjs` runs the real room code inside Node with simulated
connections and a simulated clock, which measures the game's own code with no
runtime around it. "% of a core" is what one second of play costs:

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
-- work that grows with the square of the crowd.

The real runtime costs more than the code alone: at 10 players the local
runtime's thread was 32% busy where the code alone is 13%. The difference is
**taking each message in**. Measured with players who stand still and send
extra `pong`s (the cheapest message the worker accepts: its case only folds a
number into the session's round-trip time):

| Standing players | Messages in a second | Room's thread |
|---|---|---|
| 25 | 34 | 14% |
| 25, plus 30 pongs a second each | 789 | 54% |
| 50 | 72 | 24% |
| 50, plus 30 pongs a second each | 1,576 | 70% |

So the local runtime spends about **0.3-0.5 ms of the room's one thread on
every incoming message**, whatever the message does. At 60 moving players
(1,250-1,430 messages a second) that is roughly half the thread; the game's own
work above is the other half. A crowd standing still is cheap (50 standing
players, 24%): it is moving players that cost, twice -- their messages in, and
their positions out to everyone else.

## Why it freezes instead of slowing down

The probes show the freeze is the room's whole input and output, not only its
tick: a web request into the room (`/api/market`) went unanswered for 10 s, and
a brand-new player's join, whose first message is sent from inside the join
itself, got nothing in 15 s. Meanwhile the thread stayed 99% busy and memory
grew by megabytes a second.

That fits a Durable Object rule: what a room sends (messages and replies) is
held back until the storage writes it made before are confirmed (the "output
gate"), and the room saves often (over a hundred `storage.put` sites, none
with `allowUnconfirmed`). A room with no spare time falls behind on those
confirmations, so everything it sends piles up in memory, and the players'
moves keep arriving. This is the likely mechanism, not a proven one: confirming
it means running the copy with the saves taken out of the picture and seeing
whether the freeze moves.

## How sure this is: this machine is not Cloudflare

- **The processor.** The sandbox is a 4-core 2.1 GHz Xeon virtual machine.
  Cloudflare's servers are newer and probably faster per thread, so the real
  room may hold more players before its thread fills.
- **The runtime.** `wrangler dev --local` runs `workerd`, the same open-source
  runtime Cloudflare runs, plus local development tooling. Production adds its
  own layers. Neither is measured here.
- **Cloudflare's own guidance** (WORLD-ARCHITECTURE §11) is about 500-1,000
  requests a second for one Durable Object. 60 moving players send 1,250-1,430
  messages a second. If incoming WebSocket messages count fully against that,
  production would be past it at 25-45 players.
- **The network** here is the machine itself. Real phones add 50-200 ms and
  need the download speeds above.

The only way to know production's number is to run this tool against a copy of
the server deployed on Cloudflare (a separate worker with its own name, never
the live game). That is a decision for the owner, not done here.

**For planning:** treat about **40-50 busy players** as what one room holds
comfortably today, 60 as the edge, and never more. `max_players` (a live flag,
`docs/specs/room-full.md`) lowers the cap without a deploy.

## What would raise the limit

None of these is built yet.

1. **The message diet** (§11): five positions a second with direction and
   speed instead of thirty. The biggest lever: incoming messages are about half
   the room's thread at 60 players, and this takes away four fifths of them. It
   is also the biggest change: the server has to move each player between
   their messages, or monsters chasing them lurch (v2.3.1635 tried a plain
   5 Hz and was rolled back, §11).
2. **Build the moving players' part of the Wheel's tick once, not once per
   player.** The quickest win: the player list is the same for everyone in the
   Wheel, only the monsters differ, and that repetition is most of the 43%
   `buildFor` line. A contained change in `tick.js`. It leaves what each phone
   downloads unchanged.
3. **Send each phone only the players near it** (§11's "distance-based
   updates"). Monsters already work this way (`_wheelInterest`, 2,400 px). This
   is the only change here that cuts each phone's download. In town, where
   everyone is close, it helps less.
4. **Run monster AI only near players.** Most of the 384 monsters are far from
   everyone at any moment, yet they cost 7.5% of a core with one player in the
   room, and every one is checked against every player for safe ground.
5. **Never freeze.** A room that cannot keep up should refuse new players and
   shed load (for example, stop admitting when the tick rate falls below about
   30 a second) rather than reach a state it does not recover from.

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
  after `player_respawned`. Two players in each process read every tick and
  time how long another player's move took to reach them.
- The server's CPU is read from `/proc`: the busiest thread of `workerd` (a
  Durable Object runs on one thread, so that is the number that says "full").
- `tools/qa/load/load-wheel.mjs` measures the code alone, as above.

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
