# More players in one room, the same game (v2.3.3193)

> Owner, 2026-10-12, after the bot load test (#883): *"After testing with this
> many players, are there optimizations you can add that allow more players
> without adding cost or loss of quality?"*

The bot load test (`tools/qa/load/`, `docs/specs/load-test.md`) profiled the
room with everyone in the Wheel. This change makes the room's own work
cheaper in four places. **Every player receives exactly the same bytes as
before**: no message, rate, field or rule changes, so nothing a player sees or
does changes, and nothing is added to the bill (Cloudflare charges a room for
the time it is running and for the messages players send, neither of which
this touches).

## What changed

1. **A tick's shared parts are built once** (`server/src/tick.js`,
   `buildShared`). In the Wheel every player's tick is built on its own,
   because each hears only the monsters near it. Each of those messages also
   listed every moving player, re-built and re-stringified once per player:
   the same list N times a tick, work that grew with the square of the
   crowd. Now the players, the events (per mute key), a zone's nodes and each
   monster's line are stringified once a tick, and each message is put
   together from those strings in the same key order JSON.stringify used.
2. **Each player's monsters are found on a grid** (`server/src/wheelzone.js`,
   `_wheelMonsterGrid` and `_wheelInterest`'s `grid`). Every Wheel player
   used to walk all 384 monsters every tick to find the ones within reach,
   and tick.js then walked all 384 again to pick the changed ones. Now the
   monsters go on a grid of 1,400 px squares once a tick, each player walks
   only the squares within 2,800 px, in the monsters' own order, and the
   short list it finds is the one tick.js filters.
3. **The monsters' safe-ground check comes after the distance check**
   (`server/src/index.js`, `_tickMonsters`). Every monster asked whether
   each player was sheltered on the safe ground before comparing distances,
   384 monsters by every player every tick. It now asks only about a player
   who would be the nearest so far. The pick is the same: the check has no
   side effects, and a player it turns away could not have been picked.
4. **The lag-compensation history reuses the entry that falls off the end**
   (`tick.js`): the same fields and values, without a new object for every
   player every tick.

## How we know nothing changed

`server/test/tick-share.test.mjs`, in `npm test`, 18 checks:

- **Byte for byte.** With `_tickShareVerify` set (tests only), the tick builds
  every message both ways and compares them. 300 ticks of a busy mixed room,
  covering:
  - v2 players in the Wheel's town and on its spokes;
  - a v1 player in the Wheel, and players of both versions in town and in the
    meadow;
  - a socket that never joined, and presence ticks;
  - chat and emotes, with two players muting the speaker;
  - monsters coming into a player's reach, and dirty nodes.

  Thousands of messages compared, none different.
- **The grid** gives exactly the full walk's answer: the same monsters in
  reach, the same new ones, the same order. Checked over 400 ticks of moving
  monsters and a walking, sometimes jumping, player. A position that isn't a
  finite number reaches nothing.
- **The history** equals what the old code would have stored, tick after
  tick, and no entry is in two places.
- **The monster scan** still passes over a nearer player on the safe ground
  for one off it, and picks a nearer one who provoked it from there.
- **The off switch** works: `tickshare: false` in the live flags builds every
  message the old way (`buildFor`) and walks every monster, with no deploy.

A change to what a tick carries now goes in both builders (`buildFor` and the
shared parts), and the byte-for-byte check fails until they agree.

## What it buys

Measured in the sandbox with the bot load test, today's code against this
change, the same machine and the same fake players (70% walking the town,
30% fighting, everyone in the Wheel). The local runtime's own tracing was off
(see `docs/specs/load-test.md`: it is on by default in `wrangler dev` and
inflated every message's cost about five times).

The room's own code (`tools/qa/load/load-wheel.mjs`, the code alone, as a
share of one core):

| Players | Before | After | One tick, before → after |
|---|---|---|---|
| 25 | 26% | 18% | 5.5 → 3.6 ms |
| 50 | 28% | 17% | 5.8 → 3.3 ms |
| 100 | 62% | 23% | 12.8 → 4.1 ms |
| 150 | 117% (cannot keep up) | 26% | 24.7 → 4.7 ms |
| 200 | 174% | 32% | 36.8 → 5.6 ms |

The real runtime (`tools/qa/load/load.mjs`, fake players over real sockets),
both servers run back to back through the same steps:

| Players | Ticks a second, before → after | The others' moves (95%), before → after | A new player's first message, before → after |
|---|---|---|---|
| 50 | 35 → 37 | 35 → 32 ms | 32 → 26 ms |
| 75 | 32 → 37 | 43 → 35 ms | 54 → 37 ms |
| 100 | 27 → 33 | 56 → 42 ms | 67 → 81 ms |
| 125 | 22 → 26 | 62 → 46 ms | 201 → 155 ms |
| 150 | 17 → 21 | 88 → 54 ms | 296 → 261 ms |

- **Smooth play** (33 ticks a second or more, the world at three quarters of
  its designed speed or better) now lasts to **about 100 players instead of
  about 65**.
- **Badly degraded** (under 25 ticks a second, the world at half speed or
  less) now starts at **about 130 players instead of about 110**.
- Neither server froze; both slow down past these points.

The gain on the real runtime is smaller than the code-alone table, because the
code is now the smaller part of the room's work.

Why ticks a second matter: a tick starts 22 ms after the last one finishes,
and the world moves a fixed step each tick (a monster's `spd` is pixels a
tick). So a slower tick is a slower world, not only a later one. With 100
players the monsters walked at 54% of their designed speed before, and 75%
now.

What binds now is no longer the game's code. It is the runtime taking the
players' messages in and pushing every player's update out. Those updates
grow with the square of the crowd, because every phone is sent every moving
player. That is the next limit for the server and the phones alike, and it is
the first item below.

## Not done (each would change what players get)

- **Send each phone only the players near it.** Each phone still downloads
  every moving player's position (about 3 KB a second per player). That is now
  the limit that matters more than the server's, and only a change in what is
  sent can cut it. Players farther away than the screen could be sent less
  often: the only visible difference would be how smoothly their dots move on
  the map.
- **Shorter numbers on the wire.** Positions to a tenth of a pixel instead of
  sixteen digits would cut about a quarter of those bytes. The difference is
  invisible, but the bytes are not the same.
- **The message diet** (WORLD-ARCHITECTURE §11): fewer position messages from
  each phone. The bigger change, because the server would have to fill in the
  movement between them.
