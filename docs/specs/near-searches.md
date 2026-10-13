# Who is near whom, found by squares (v2.3.3201)

> Owner, 2026-10-13: *"begin looking at additional ways to increase the maximum
> number of concurrent players without noticeably decreasing quality."*

Two searches the room makes every tick (45 times a second) grew with the crowd
faster than anything else once the Wheel's 384 monsters and a big crowd were
in it. Both are now done on a grid of squares, and both give **exactly the
answer they gave before** -- the same monster chases the same player, every
phone gets the same bytes. Nothing a player sees or does changes.

## 1. A monster looks for a player near it, not through every player

Every tick each of the Wheel's 384 monsters looks for the nearest player it
may go after (`_tickMonsters`, `server/src/index.js`). It did that by measuring
its distance to every player in the Wheel: with 150 players, 57,600 distances a
tick, about 2.6 million a second. The load test's profile put that one loop at
about a quarter of all the room's work -- and almost all of it was wasted, as a
monster only notices a player within its aggro range (120 px; a snowman 300)
and nearly every player is thousands of pixels from nearly every monster.

Now, once a tick, the Wheel's players are dropped into squares 256 px a side
(`server/src/aggrogrid.js`), and a monster looks only in the squares its range
reaches, usually four.

**Why it is the same pick.** The full loop chose the nearest player who is not
harvesting and not sheltered by the safe ground, the first in the zone's list
on a tie. The grid finds every player within the range (the squares cover the
range, plus a pixel for rounding) and keeps the one with the smallest distance,
the first in the list on a tie: the same player, by the same arithmetic. A
player beyond the range could never be chased, so the full loop's "nearest"
out there only reached code that behaves the same either way -- with one
exception, a sticky aggro (a monster you shot keeps after you for 10 s) that
had run out: the leash used to clear it only when it met the monster with a
player in hand. Nothing reads one that has run out, so it is now cleared up
front, the tick after it runs out, and the leash clears only one that is
there.

The full loop still answers whenever the grid cannot: any zone but the Wheel,
fewer than 8 players, a position that is not an ordinary number, or a range
wider than 25 squares (the 1,200 px of a sticky aggro whose target has just
left). **Kill switch:** `aggrogrid: false` in the live flags puts the full loop
back everywhere at once, no deploy.

## 2. The monsters a phone hears about: squares with number keys

Each Wheel player is told only about the monsters within 2,400 px
(`_wheelInterest`, `server/src/wheelzone.js`, since v2.3.2978), and since #885
those are found on a grid of 1,400 px squares. Each square was looked up by a
string key, `'12,15'` -- up to 25 strings made and hashed for every player
every tick -- and the monsters found were put in order with a sort that called
a function for every comparison. Those two were two thirds of the search's
cost. The key is now a number and the sort is the typed array's own: the same
monsters, in the same order.

## What it saves

The room's own code, inside Node (`tools/qa/load/load-wheel.mjs`: everyone in
the Wheel, 30% fighting, a simulated clock, three runs each):

| Players | Before (main) | Monsters' grid | + number keys |
|---|---|---|---|
| 100 | 7.2-7.7 ms a tick, 37-40% of a core | 5.0 ms, 28% | 3.1-4.0 ms, 18-24% |
| 150 | 7.3-7.5 ms a tick, 39-40% of a core | 5.1-5.7 ms, 29-32% | 3.9-4.2 ms, 23.5-25% |

About **40% less of the room's own work at 150 players**. In the real runtime
the room's thread also compresses every message (about 40% of its time,
`docs/specs/load-test.md`), which this does not touch, so the thread saves
less than that: see the next section.

In the real runtime (`tools/qa/load/load.mjs`: a private copy of the server
under `wrangler dev`, phone-shaped bots over real sockets, the same steps one
after the other, main after #886 against this change):

| Players | Before: the room's thread, ticks a second, others' moves seen (half the time) | After |
|---|---|---|
| 50 | 46% busy, 36.8 ticks, 21 ms | 40%, 40 ticks, 18 ms |
| 100 | 80% busy, 33.4 ticks, 25 ms | 76%, 37 ticks, 21 ms |
| 150 | 92% busy, 25.4 ticks, 30 ms | 90%, 29.2 ticks, 27 ms |

**The world runs faster at every size**: 3-4 more ticks a second, so at 100
players it moves at 82% of its designed speed instead of 74%, and the room
stays smooth (33 ticks a second or more, the load test's line) to about 125
players instead of about 105-110. The thread is still nearly full at 150 because
the extra ticks are extra messages to compress: compressing is now most of the
thread's work (`docs/specs/load-test.md`, "What a phone really downloads"), so
what raises the limit next is sending less, not computing less. Each tick
costs the thread about 15% less than before.

## How it is tested

`server/test/aggro-grid.test.mjs`:

1. **The pick against the rule.** 4,000 made-up crowds, each checked against
   the full loop written out in the test: players on top of each other, ties at
   equal distances, players exactly on the range (not in it), harvesters,
   players on the safe ground (passed over unless they provoked the monster),
   every range the game uses, monsters on the corners of squares.
2. **The whole room both ways.** Two rooms in lockstep, one with the kill
   switch (the full loop) and one with the grid, the same 44 players doing the
   same things with the same dice for 600 ticks: fighters provoking monsters
   and walking onto the safe ground with them in tow, players tied and exactly
   on the range, harvesters beside monsters, players sheltered inside the safe
   ground in a monster's reach, a sticky aggro running out on the safe ground
   with nobody near, the grid switched off and on mid-fight, a position that is
   not a number. After every tick every monster (every field), every player and
   every message must be the same in both rooms.

Each check was shown to catch a broken grid: leaving out the safe-ground check
(1 and 2 fail), a range 40 px too short (1 fails), and leaving out the
run-out-override clearing (2 fails at the tick it matters).

`server/test/tick-share.test.mjs` §5 already compared the interest grid with
walking every monster, over 400 ticks of a moving crowd; §5d and §5e add a
monster and a player past the number keys' reach (no Wheel is that big), where
the grid steps aside for the full walk.
