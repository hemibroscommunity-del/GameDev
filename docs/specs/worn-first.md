# After an equip, how fast your armour is ready: a measure (v2.3.3742)

The owner's showing, 2026-10-28. Right after you put armour on, your bro could
show his plain body under it for a moment while running: the trousers at the
waist between the plate and the greaves. This change adds a way to measure
it, and writes down what the measure found. It changes nothing in the game.

## How the armour is drawn

In most directions a full set is one painted knight figure. In the others
(north-east, and north-west, its mirror) the game draws your own body cut away
under the armour, a "masked bake" for each frame of each move. Those bakes are
made in the background by a helper (the bake worker), one at a time, after
you put the armour on: first the set you wear, a frame a job, then the sets
one equip away (pieces in your bag). Until a frame is baked, your bro is drawn
with the plain body under the armour for that frame (v2.3.2904, so the game
never stalls to bake it). That is the flash.

## The measure

`mp-armourflash` has a new phase straight after putting the copper set on:
every 10 s for 150 s, how many jobs the worker has answered and how many of
the set's frames are ready (`window.__btBakeWorker()`,
`window.__btMaskedCoverage()`), the worker's queue at the end, and the walk
after, its plain body frames counted. It is a measure, not held to a line.

## What it found

On this test box (4 cores shared by the game's server, Chromium and the test;
the game draws one or two frames a second), on main (3d7df4c):

| seconds after the equip | 11 | 31 | 51 | 71 | 91 | 111 | 140 |
|---|---|---|---|---|---|---|---|
| worker jobs answered | 1 | 6 | 10 | 14 | 18 | 21 | 27 |
| frames of the set ready (of 177) | 2 | 7 | 11 | 15 | 19 | 22 | 28 |

About one bake every 5 seconds, steadily, while the same frames baked on the
main thread take well under a second each here. So on a heavily loaded
machine the worker is far slower than an inline bake.

**It is not stuck.** A first reading ("one job out, nothing answered for
90 s") looked like a stall, and a reply timeout was built for it. Sampled, the
worker never stopped answering: the job out was the one in progress, and a
4 s timeout only retired workers that were working (every job ran past it,
and the session fell back to baking on the main thread). It was taken out,
and so was a change that made the spare sets wait for the worn set, whose gain
this box could not show. Whether a real phone sees the same slowness is not
known: the owner's own measure when the worker went in (v2.3.2904, an iPhone)
found it smoother.

## The sure fix

The sure fix for the plain-body flash is the owner's option B: while a frame
is not baked yet, hold the last baked frame of the same move and facing (as
other players' figures already do) instead of the plain body. It costs a
one-frame stutter in the pose, which is why it is the owner's call. It is on
the owner's list for after the showing.
