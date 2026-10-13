# The world keeps its speed in a busy room (v2.3.3202)

> Owner, 2026-10-13: *"begin looking at additional ways to increase the maximum
> number of concurrent players without noticeably decreasing quality."*

## What was wrong

The room runs the world 45 times a second: `setInterval(tick, TICK_RATE)` with
`TICK_RATE` 22 ms (`server/src/tick.js`). Monsters move a fixed step each tick,
burns and poisons and regeneration count ticks, the lag compensation counts
ticks. So the number of ticks a second **is** the speed of the world.

The runtime's `setInterval` waits the whole interval **after** each tick has
finished, not from when it started. Measured on the local runtime with a
one-line Durable Object whose tick does a fixed amount of work:

| The tick takes | Ticks a second | Apart |
|---|---|---|
| nothing | 43.2 | 23.1 ms |
| 2 ms | 39.1 | 25.6 ms |
| 5 ms | 35.0 | 28.6 ms |
| 10 ms | 29.5 | 33.9 ms |
| 20 ms | 22.6 | 44.2 ms |

The period is 23.1 ms **plus** the tick. So every millisecond a busier room
spends in its tick slows the whole world down, even while the room's thread
has time to spare: at 100 players (#888's numbers) the room ran 37 ticks a
second -- everything at 87% of a quiet room's speed -- with a quarter of its
thread idle. (`docs/specs/load-test.md`, "The answer", already says it from
the other side: "a tick starts 22 ms after the last one finishes".)

## What changed

The gap between ticks is **paced** (`server/src/tickpace.js`). The room
measures how far apart its ticks really start, smoothed, and:

- when they start further apart than **24 ms** (a quiet room's own period
  here: 22 + the timer's ~1 + a quiet tick's ~1), it shortens the interval by
  half the excess each tick;
- the moment one tick comes sooner than 23 ms, it puts the interval straight
  back up by the whole difference -- never past 22 ms.

So a busy room's ticks start 24 ms apart, like a quiet room's, for as long as
the thread has the time. The interval is only changed by clearing it and
setting it again after a tick, so a steady room keeps one interval.

**What it cannot do:**

- **Make the world faster than a quiet room's.** A quiet room's ticks come 24
  ms apart or less, and then the pacer does nothing at all. When the load
  drops all at once (a crowd's connections lost together), one tick comes
  early and the next is back to normal.
- **Spend time the thread does not have.** At least 6 ms is always left
  between one tick's end and the next one's start for the players' own
  messages. Past the point where the thread is full, ticks slow down exactly
  as before.
- **Chase one slow moment.** A single hitch (a long message, a garbage
  collection) counts at most 60 ms, and brings a few quick ticks at most.

**Where it runs.** Only in the Workers runtime: the Node test harnesses
capture the tick from `setInterval` and call it by hand, and there a re-armed
interval would start ticking on its own. `WebSocketPair` is a global of the
Workers runtime alone (the room opens every socket with it), so that is what
the pacer checks.

**Kill switch:** `tickpace: false` in the live flags -- the plain interval
again, from the next tick, no deploy. `/dev/overview` now shows the pacer
(`tickPace`: whether it is on, the interval in use, how far apart the ticks
really start, ticks a second) -- the first readout of the real tick rate in
production.

## What it does for a crowd

The real runtime (`tools/qa/load/load.mjs`: a private copy of the server under
`wrangler dev`, phone-shaped bots over real sockets, 30% fighting, the same
steps one after the other), with #888's grids in both columns:

| Players | Without the pacer: thread busy, ticks a second, others' moves seen (half the time), a new player's first snapshot | With it |
|---|---|---|
| 50 | 40%, 40 ticks, 18 ms, 23 ms | 42%, 41.6 ticks, 17 ms, 22 ms |
| 100 | 76%, 37 ticks, 21 ms, 37 ms | 84%, 40.4 ticks, 22 ms, 54 ms |
| 150 | 90%, 29.2 ticks, 27 ms, 88 ms | 97%, 32.4 ticks, 28 ms, 153 ms |

At 100 players the world now runs at 97% of a quiet room's speed instead of
89%, and the room stays smooth (33 ticks a second or more, the load test's
line) to about **145 players** -- against about 125 with #888 alone and about
105-110 before it. The others' moves arrive as fast as before; a player
joining a busy room waits a little longer for the first picture of the world
(54 ms instead of 37 at 100 players, behind the loading screen).

Against main before #888 and this, at 100 players: 33.4 -> 40.4 ticks a second
(+21%); at 150: 25.4 -> 32.4 (+28%).

## What to keep in mind

- **A busy room now uses more of its thread.** Today's slowdown was a brake
  that left idle time; with the pacer that time goes into keeping the world at
  speed. The players' own messages still get at least 6 ms between ticks, and
  the measured delays for them hardly moved (above).
- **Production's own quiet period is not measured.** If Cloudflare's timers
  run a quiet room's ticks more than 25 ms apart, the pacer would bring that
  room to 24 ms, at most a few percent faster. `/dev/overview`'s `tickPace`
  shows it.
- **Production may not have the slowdown at all.** If its `setInterval`
  counts from the tick's start, the ticks already come 22-24 ms apart, the
  pacer never acts, and nothing changes.

## Tests

`server/test/tick-pace.test.mjs`: the rule on its own, then a simulated
runtime with exactly the measured timer behaviour -- a quiet room left alone
(no re-arm, its world no faster), 10 ms ticks held at 24 ms instead of 33, 18
ms ticks at the shortest interval, a full thread never below it, a load
dropping all at once costing one quick tick, a single 200 ms hitch costing a
few, random 6-14 ms ticks held near 24 ms, the kill switch -- and in Node the
interval never set again.
