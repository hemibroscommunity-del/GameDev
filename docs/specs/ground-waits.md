# The Wheel's ground worker waits for the renderer's word (v2.3.3709)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal."*

## What was wrong

The Wheel's ground is laid by a worker (`public/tools/world/core/ground-worker.js`),
which `src/game/wheelTrial.js` starts on the way into the world. It tells the
worker two things, once, as it starts, and the worker lays every piece of the
visit by them:

- **colour numbers** (`palette`): send each ground piece as one byte a pixel and
  its colours (v2.3.3190), which the graphics chip holds in a quarter of the
  room;
- **moving water** (`moving`): take the frozen web of light out of the water
  pictures, as the game draws its own, moving (v2.3.3021).

Both are the RENDERER's answers: it says them as it is made
(`pixiRenderer.js initPixiRenderer`: `setWheelWaterRenderer`,
`setPaletteRenderer`). The code's comments said the renderer is made "long
before the Wheel's worker starts". On this box's single phone it is, about
3 s before. But the renderer is made asynchronously, and the trip into the world
does not wait for it. When the renderer is slow, the trip starts the worker
first, and the worker is told "colours, still water". It then lays the whole visit
in four bytes a pixel and keeps the water still.

Found by `mp-palette`: its colour-numbers phone (one of two at 3x on a busy
machine) was told `palette: false, moving: false` at 3.4 s. Its ground was not
colour numbers, and its pictures differed from the other phone's by 60%. The
game never noticed: nothing complains, the ground just costs more.

`mp-groundwait` reproduces it on purpose. With the renderer held back 9 s
(`?pixidelay=9000`, as a slow phone's first graphics context), the worker was
told "colours, still water" at 3.0 s, 9.4 s before the renderer was made. None
of BroTown's 54 ground pieces was colour numbers, and the graphics chip held
**62.8 MB against 36.7**.

## What it does now

- `wheelStart` waits until the renderer has said (`wheelRendererSaid`, called
  by `initPixiRenderer` right after both setters) before it tells the worker
  anything. It waits at most 15 s (`RENDERER_WAIT_MS`); a renderer that never
  comes gets the worker as before.
- Once the renderer has said, a start sends at once, as before. On a normal
  boot the renderer has long said (`mp-groundwait`'s probe on a single phone:
  renderer at 4.2-4.6 s, the worker's start at 7.4-8.0 s), so nothing waits.
- In Node or a tool (no window), where nothing will ever say, nothing waits.
- A worker stopped while it waits is told nothing.
- Nothing else changes: the same message, the same pieces.

## Switches

- `?groundwait=0`: the worker starts at once, as before (the test's control).
- `?pixidelay=ms` (QA): the renderer that much later. Nothing else reads it.
- `window.__btGroundWait()`: whether it waits, whether the word came, and how
  long the last start waited.

## Tested

- **`ground-waits` suite** (7 checks, a stand-in Worker):
  1. a start before the word posts nothing;
  2. a start stopped while it waits posts nothing to the stopped worker;
  3. the word sends the init at once, with the answers it gave, once;
  4. a start after the word posts at once;
  5. a renderer that never says: the init goes after the 15 s cap;
  6. in Node nothing waits;
  7. the wiring (the renderer says after both setters; the message unchanged).

  On the old code it fails at its first check.
- **`mp-groundwait`** (two phones, the renderer held back 9 s):
  1. both in the world with the ground laid;
  2. with the wait: told "colour numbers, moving water" after waiting 8.2 s, and
     all 54 pieces in colour numbers;
  3. control, as before: told "colours, still water" at 3.0 s, before the
     renderer at 12.4 s;
  4. 62.8 MB on the graphics chip against 36.7;
  5. no page errors.
