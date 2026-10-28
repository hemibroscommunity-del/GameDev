# After an equip, the set you wear bakes before the spares (v2.3.3742)

The owner's showing, 2026-10-28. Right after you put armour on, your bro could
show his plain body under it for a moment while running: the trousers at the
waist between the plate and the greaves.

## How the armour is drawn

In most directions a full set is one painted knight figure. In the others
(north-east, and north-west, its mirror) the game draws your own body cut away
under the armour, a "masked bake" for each frame of each move. Those bakes are
made in the background by a helper (the bake worker) after you put the armour
on, one at a time. Until a frame is baked, your bro is drawn with the plain
body under the armour for that frame (v2.3.2904, so the game never stalls to
bake it), and that is the flash.

## The change

Putting a piece on starts two background passes: the set you now wear, and
the sets "one equip away" (the pieces in your bag, so the next equip is ready
too). Their jobs took turns at the worker, so the frames of the set you wear
came at about half speed. Now the spare sets wait while the set you wear
bakes (`entityRenderer.js` `_wornBakeGate`), in play only: behind the loading
screen nothing waits. The same bakes in another order: no memory, no frame
more.

## What it does not do

A jog started the instant the armour goes on can still meet a frame not baked
yet. Holding the last baked frame instead closes that, at the cost of a
one-frame stutter in the pose: a choice for the owner.

## Measured, and one thing found

`mp-armourflash` has a new phase straight after putting the set on: every
10 s, the worker's answered jobs and the set's frames held, for 150 s.

On this test box (4 cores shared by the game's server, Chromium and the
test; the game draws one or two frames a second), the worker answered about
one job every 5 seconds, steadily (main, 3d7df4c: 27 jobs, 28 frames held at
140 s, of the 177 the copper set needs). The same frames baked on the main
thread take well under a second each here. So on a heavily loaded machine the
worker is far slower than an inline bake. It is not stuck: a first reading of
"one job out, nothing for 90 s" was the job in progress, and a reply timeout
built for it (4 s) only retired workers that were working. That was taken out
before this shipped. Whether a real phone sees the same is not known: the
owner's own measure when the worker went in (v2.3.2904, an iPhone) found it
smoother.

## The checks

- `server/test/worn-first.test.mjs`: the gate shut before the worn pass's
  first bake and opened in a finally; a spare set's frame waits on it in play
  only; it only lets go of its own promise.
- `mp-armourflash`: the new phase (a measure, not held to a line).
