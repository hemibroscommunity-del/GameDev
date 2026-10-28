# New armour, ready sooner: the bake queue can't get stuck (v2.3.3742)

The owner's showing, 2026-10-28. Right after you put armour on, your bro could
show his plain body under it for a moment while running: the trousers at the
waist between the plate and the greaves.

## How the armour is drawn

In most directions a full set is one painted knight figure. In the others
(north-east, and north-west, its mirror) the game draws your own body cut away
under the armour, a "masked bake" for each frame of each move. Those bakes are
made in the background by a helper (the bake worker) right after you put the
armour on. Until a frame is baked, your bro is drawn with the plain body under
the armour for that frame (v2.3.2904, so the game never stalls to bake it).

## What was wrong

**The bake queue could stop for good.** The worker takes one job at a time.
In `mp-armourflash`, 90 seconds after putting copper on, the worker had taken
one job (the north-west jog, frame 2) and never answered. Every later bake
(the rest of your set, the spare pieces in your bag, other players' armour)
waited behind it for the rest of the session: 34 of the set's 177 frames
baked. Asked, the worker read `busy 1, pending 1`. It is not the bake itself:
the worker answers even on an error, and the same frame bakes in milliseconds
on the main thread. The worker goes quiet.

**And the spare pieces competed with the set you wear.** Putting a piece on
re-starts two background passes: the set you now wear, and the sets "one
equip away" (pieces in your bag). Their jobs took turns at the worker, so
your own set took about twice as long.

## The fix

- **A job not answered in 10 seconds retires the worker** (`entityRenderer.js`
  `_retireStuckWorker`). Its jobs fall back to the main-thread bake (as a failed
  job always has), the worker is closed, and the next job starts a fresh one,
  which is sent the fishing rod's mask again (the only thing a worker keeps).
  A late answer finds no job and is dropped, never placed twice. After three
  stuck workers in a row (an answered job resets the count) the worker is
  given up, and every bake is done on
  the main thread, as on an old Safari. `window.__btBakeWorker().stuck` counts
  them.
- **The spare sets wait while the set you wear bakes** (`_wornBakeGate`), in
  play only (behind the loading screen nothing waits).

No memory is added and no frame more is baked.

## What it does not do

A jog started the instant the armour goes on can still meet a frame or two
not baked yet. Holding the last baked frame instead closes that, at the cost
of a one-frame stutter in the pose: a choice for the owner.

## The checks

- `server/test/bake-stuck.test.mjs`: the timer, the retire, a late answer, a
  retired worker's error, the worker's state.
- `server/test/worn-first.test.mjs`: the gate.
- `mp-armourflash`: a new phase right after putting the set on, which reports
  how long until the jog, and the whole set, is baked, the worker's queue, and
  the stuck count.
