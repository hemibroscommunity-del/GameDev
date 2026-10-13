# A steady walk on the safe ground is sent half as often (v2.3.3204)

> Owner, 2026-10-13: *"begin looking at additional ways to increase the maximum
> number of concurrent players without noticeably decreasing quality."*

## Why

While anyone shares your zone, your phone sends your position every 33 ms
(`src/networking/wsClient.js`, `MOVE_GAP_SEEN_MS`). The Wheel is one zone, so
in the Wheel that is always: 30 messages a second from every walking player.

Since v2.3.3203 (#890) the room passes a steady walker on to the other phones
at most every 66 ms (`server/src/steadymovers.js`): the phones draw other
players moving along the speed of their last update, so the updates between
change nothing anyone sees. That made half of a steady walker's moves useless
-- the room still took each one in, parsed it and judged it, and
then held it.

Messages coming IN are also what the game pays Cloudflare for: incoming
WebSocket messages are billed, 20 to a request, and position updates were
about 87% of the game's request bill when that was measured (wsClient.js,
v2.3.1635).

## What changed

On the Wheel's **safe ground** (Brotown and the commons round it, the circle
no monster goes after anyone in), the phone keeps a move back while it is on
the line its last move drew -- **the room's own rule, done where the move is
made** (`src/game/moveDiet.js`, its numbers pinned to the room's by
`server/test/move-diet.test.mjs`):

- every field of the move but the position and speed is as it was sent --
  facing, zone, gear, harvest, shield, roll, sprint, every field the move
  carries, read off the move itself so a field added later is covered too;
- still moving, or still standing: a **start or a stop goes at once**;
- the speed of the last move sent, give or take a thumb's wobble (4%, about
  2 degrees), within **2 px** of the line it drew, and about as far along it as
  that speed takes you.

Then the move waits until **66 ms** after the last one sent -- the rate a phone
alone in its zone has always used (v2.3.1767, the owner's call). A turn, a
stop, new gear, a shove, anything else goes on the next 33 ms batch as before.
What waits is never lost: the next frame writes where you are then, and that
is what goes.

**Not in a fight**: a monster locked (one is near), an attack held, a duel or
an arena match turn it off (`wsClient.js` `moveDietOn`). **Not off the safe
ground**: out in the lands monsters chase the room's copy of you and a player's
hit is judged against it, so every move goes there, as before.

**The room** (`steadymovers.js`): a move that comes 44 ms or more after the
last one it sent (`STEADY.SPACED_MS`, by the moves' own times) is never held --
its phone already spaced it. Without that, the room judged a spaced move by
its ticks' times, and held half of them a tick more: in the first measurement
the others saw positions 12-16 ms later.

**Kill switch:** `movediet: false` in the live flags. The room stops
advertising `caps.movediet`, and each phone sends every move again from its
next join (a deploy reconnects everyone). Against an old room (no
`caps.movediet`) the phone never diets.

## What the others see

`server/test/move-diet.test.mjs` runs a phone's frames (every 16.7 ms) and its
33 ms batch on one clock with the room's ticks -- a walker in Brotown, a
watcher beside them -- and feeds the watcher's own drawing code
(`visualSystems.js`, as `steady-movers.test.mjs` does) with what it got, on a
walk of straight runs, turns, a zigzag every quarter second and stops:

| | Moves the phone sent | Drawn off by, on average | 95% of the time |
|---|---|---|---|
| Every move sent, every move passed on | 196 | 14.6 px | 30.2 px |
| The room's hold alone (#890) | 196 | 14.2 px | 32.8 px |
| The phone's diet + the room's hold | 101 | 14.2 px | 32.8 px |

**The phone keeps back exactly what the room would have held**: the watcher
draws the walker the same either way (the test holds it to within 0.5 px). A
turn, a stop, a start and new gear reach the watcher on the very next tick; a
spaced move is never held a tick more; off the safe ground every move goes.

(The hold's own cost shows here a little more than in #890's test: 2.6 px more
at the 95th percentile, the same on average -- inside the 30 px the phone lets
anyone drift before it pulls them back.)

## What it does for a crowd

The real runtime (`tools/qa/load/load.mjs`, phone-shaped bots, 30% fighting;
the walkers with `--diet`, the phone's own rule), with #888-#890 in both:

| Players | #888-#890: thread busy, ticks a second, moves coming in a second, others' moves seen (half the time) | With this |
|---|---|---|
| 50 | 34%, 41.9, 987, 22 ms | 34%, 41.4, **518**, **16 ms** |
| 100 | 68%, 40.8, 2,169, 24 ms | 66%, 41.5, **1,033**, **20 ms** |
| 125 | 88%, **32.0**, 2,609, 31 ms | 87%, **37.7**, **1,236**, 35 ms |
| 150 | 91%, **30.5**, 3,219, 31 ms | 93%, **33.8**, **1,451**, 46 ms |

- **The messages coming in are about halved** (the bots' walkers stay on the
  safe ground; the fighters, out in the lands, send every move as before).
  Those are the messages Cloudflare bills.
- **The room stays smooth (33+ ticks a second) to about 150 players**, against
  about 120-130 with #888-#890: 37.7 ticks at 125 instead of 32.0, 33.8 at 150
  instead of 30.5.
- **Others' moves arrive sooner up to 100 players** (16 ms against 22 at 50, 20
  against 24 at 100) and **later at 125-150** (35 against 31, 46 against 31): a
  busy room is slower to get each message out. These are the steady stretches
  -- what the phones already draw from the speed; turns, stops and starts go at
  once in both.
- **Without the room's part** (`SPACED_MS`, measured the same way): 64% of the
  thread at 100 players and 38.3 ticks at 125, but others' moves arrived later
  than today at every size -- 28, 32, 39 and 54 ms. So it stays.
- Each phone is sent a few more tick messages a second at 50-100 players (44
  against 39 at 50): the room no longer holds a spaced move, so fewer ticks go
  out empty. The bytes are about the same (84 against 78 KB/s unzipped at 50,
  151 against 150 at 100).

## Tests

`server/test/move-diet.test.mjs` (26 checks): the phone's rule on its own and
its numbers against the room's; a room with a phone's frames and batches -- a
straight walk sent about every 66 ms, never more than 66 + 33 apart; each
spaced move passed on at the first tick; the watcher served as before; a turn,
a stop, a start and new gear at once; the walk's last place sent; every move
off the safe ground; the drawing above; `caps.movediet` and its switch.
`steady-movers.test.mjs` §1o: a spaced move is never held.

On a phone (`tools/qa/mp/mp-movediet.mjs`, 6 checks): a page in BroTown with a
peer beside it, the page's own move broadcast written every 16 ms. A straight
walk: 10.7 moves a second on the wire, the diet on the whole walk, 31 kept
back; a walk turning 360 degrees a second: 18 a second and nothing kept back
(this box's page timers manage no more; a phone's 30); a held attack or a lock
turns it off; no page errors. The box draws the game in software, which takes
the page's whole thread -- its timers ran 2-4 times a second -- so the
scenario slows the game's drawing to a frame a second while it walks.
