# A player walking steadily is sent less often (v2.3.3203)

> Owner, 2026-10-13: *"begin looking at additional ways to increase the maximum
> number of concurrent players without noticeably decreasing quality."*

## Why

Every phone in the Wheel is sent, every tick, every nearby player who moved
(`server/src/tick.js`; far ones less often since #886). A phone sends its
position 30 times a second, so in a crowd every phone gets every walker about
30 times a second. The room compresses each message for each phone, on its one
thread, and that is now the biggest single cost in a big room: sampling the
real runtime's thread with a debugger at 150 players, a third of the samples
were inside zlib (`deflate_slow`, `longest_match`, `compress_block`).

But a phone does not draw another player from each position it is sent. It
draws them **moving along the speed the last update gave** (`vx`, `vy`; dead
reckoning, `src/game/visualSystems.js`), and only pulls them back toward an
update's position when they are more than 30 px off. So while someone walks in
a straight line, the updates in between change nothing on anyone's screen.

## What changed

A Wheel player's update is **held** for the next tick while all of this is
true (`server/src/steadymovers.js`):

- it went out less than **66 ms** ago (two of a phone's moves);
- everything in it but the position and speed is as it was sent -- gear,
  facing, zone, harvesting, sprint, skull, pet, every field the update carries,
  read off the update itself so a field added later is covered too;
- they are still moving, or still standing: a **start or a stop goes out at
  once**, because it changes the pose the phones draw;
- they move at the speed the last update gave, give or take a thumb's
  wobble (4% of it, about 2 degrees), and they are within **2 px** of the line
  it drew them along -- what every phone is drawing -- and about as far along
  it as that speed takes them. "About": the times are when the room took the
  moves in, and a busy room takes them in late and unevenly (50 ms of that is
  allowed for). A first version timed the line exactly, and at 150 players
  the room's own lateness made a third of the updates look like turns.

A turn, a stop, a start, a new piece of gear, a shove, anything else goes out
on the very next tick. A held update is never dropped: the player stays
"moved" and is looked at again next tick, and goes out within 66 ms with where
they are then. The far send (every 250 ms, to every phone in the Wheel) and the
1 Hz roster count as sent. Phones treat a player with no update for 150 ms as
standing still (`entityRenderer.js` `STALE_UPDATE_MS`), well above 66.

**Server only.** The fields are the same, there are just fewer of them; the
phones already draw this way, and an old phone gets the same updates, fewer.

**Kill switch:** `steadymovers: false` in the live flags -- every move goes
out again, from the next tick.

**Readout:** `/dev/overview` shows `steadyMovers`: since the room started, the
movers' updates the room would have sent before (`moved`: one a tick with a
new move), the ones it sent (`sent`) and the share it saved (`saved`). The load
test's bots walk dead straight; this is what real thumbs save.

## What a phone draws

`server/test/steady-movers.test.mjs` §3 feeds the phone's own dead reckoning
(the other-player block of `visualSystems.js`, copied into the test, 60 frames
a second) with the updates a watcher really got from the room, on a walk of
straight runs, turns, a zigzag every quarter second, a diagonal and stops --
with the hold and without -- and measures where it draws the walker against
where the walker really is, every millisecond:

| | Updates the watcher got | Drawn off by, on average | 95% of the time | At worst |
|---|---|---|---|---|
| Every move (before) | 197 | 14.4 px | 30.4 px | 33.4 px |
| Steady movers held | 104 | 14.4 px | 30.4 px | 33.4 px |

Half the updates, and the phone draws the walker exactly where it did. (The
14 px is the phone's own way of drawing anyone: it starts a walker where the
first update put them, a network trip behind, and never pulls them in under 30
px -- the same with every update or half of them.)

**A real thumb is shakier than a test's walk.** The stick is analog -- its
angle comes straight from the finger (`BroTown.jsx`) -- so a real walk's
heading drifts a little from one move to the next, and the load test's bots
walk dead straight. §4 of the test walks with a shaky thumb, 2 degrees of drift
a move (the hold's speed check allows about 2.3 at a walk): 100 updates -> 58,
drawn 16.1 px off on average with every update and 16.2 with the hold. A
simulation of the rule alone (one walker, 30 moves a second, a new direction
every 2 s) gives about 14 updates a second for a straight walk, 14 at 1 degree
a move, 17 at 2, 19 at 3 and 22 at 5 -- against about 30 without the hold. So
real players should save less than the bots below, though still a good part.

## What it does for a crowd

The real runtime (`tools/qa/load/load.mjs`: a private copy of the server under
`wrangler dev`, phone-shaped bots over real sockets, 30% fighting), with #888's
grids and #889's pacing on both sides. (The bots now move by the time that
really passed, as a phone moves by its frame time: before, a bot whose timer
fired late still moved a whole step, so the speed it reported was not the
speed it moved at -- `tools/qa/load/bots.mjs`.)

| Players | Before: thread busy, ticks a second, each phone downloads (unzipped), others' moves arrive (half the time / 95%) | With the hold |
|---|---|---|
| 50 | 41%, 41.6, 134 KB/s, 20 / 37 ms | 36%, 41.4, 82 KB/s, 23 / 43 ms |
| 100 | 80%, 41.3, 220 KB/s, 23 / 46 ms | 66%, 41.5, 154 KB/s, 26 / 49 ms |
| 150 (two runs each) | 96-97%, 30.4-31.8, 190-225 KB/s, 28-30 / 47-53 ms | 89-92%, 29.9-32.0, 181-189 KB/s, 31-33 / 61-64 ms |

- **At 50-100 players the room does 13-18% less work and each phone downloads
  30-39% less**, with the world at the same speed (the pacer already keeps it
  there). That is headroom: room to spare for spikes and for more players.
- **At 150 it saves about 6 points of the thread but no more ticks.** There
  the tick's own work -- building and compressing 150 messages -- sets the pace
  (the pacer is at its 6 ms floor), and a walker's update is sent nearly as
  often as before, as ticks come about as often as moves.
- **Positions arrive a few milliseconds later on average** (2-5 ms; up to 12
  ms more at the 95th percentile at 150): a held update goes out with the
  newest position a tick or two later. What the phones DRAW does not change
  (above): they draw from the speed, and the speed is never held.

A whole ramp later in the night, each run from 10 to 175 players one step after
the other, the thread busy and the ticks a second (the same runs as
`tick-pace.md`'s ramp):

| Players | 10 | 25 | 50 | 75 | 100 | 125 | 150 | 175 |
|---|---|---|---|---|---|---|---|---|
| main | 15%, 39.8 | 30%, 37.6 | 45%, 37.8 | 64%, 36.1 | 81%, 33.5 | 86%, 31.8 | 92%, 25.7 | 98%, 20.6 |
| #888 | 13%, 41.0 | 24%, 40.4 | 43%, 39.2 | 61%, 38.3 | 79%, 36.7 | 87%, 32.4 | 94%, 25.8 | 95%, 22.0 |
| #888 + #889 | 14%, 42.1 | 24%, 41.8 | 42%, 41.5 | 62%, 41.8 | 78%, 40.5 | 95%, 34.9 | 98%, 29.9 | 98%, 22.4 |
| #888 + #889 + this | 14%, 42.2 | 20%, 42.2 | 34%, 41.9 | 54%, 41.7 | 68%, 40.8 | 88%, 32.0 | 91%, 30.5 | 96%, 23.4 |

- **From 25 to 100 players the thread is 4-10 points less busy at the same
  speed of the world** -- at 100, 68% against 78%. That is the room's spare
  time for a spike, a crowd fight, or more players.
- **It does not move where the room stops being smooth** (33 ticks a second,
  the load test's line): about 120-130 players with or without it. At 125 the
  column with the hold read 32.0 against 34.9 without -- within what that step
  varies from one run to the next (about 3 ticks a second). Past that point the
  tick itself -- building and compressing a message for every phone -- is the
  limit, and the hold barely changes how many there are.

## Tests

`server/test/steady-movers.test.mjs` (32 checks): the rule on its own (a turn,
a stop, a start, new gear, a shove, standing still, time running backwards,
the line checked between moves' times); a room with a walker beside a watcher
at a phone's 30 moves a second -- a straight walk about 16 updates a second
instead of 30, never more than 66 ms + a tick apart, every change out on the
next tick, the walk's last place always sent, a far watcher still served, a
presence tick holding nobody, the kill switch, the overview's count; the
drawing above; and a shaky thumb's walk, still held and still drawn in the same
place.
`far-players.test.mjs` runs with the hold off: its checks are about who is
near and far, one small test move at a time.
