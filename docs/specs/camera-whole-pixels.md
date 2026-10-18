# The camera on whole device pixels (v2.3.3444)

> Owner, 2026-10-18: "When playing the game on PC the world has a warbled
> underwater effect when the character moves diagonally (sw, nw, ne, se). Can
> you fix that?"

## What was wrong

* **The camera was a fraction of a pixel** wherever it stood. The world
  container was placed at `-camera.x * scale` exactly (pixiRenderer.js,
  `update`), on purpose: the old note there says a rounded camera "flips by
  1 px in a stutter pattern, dragging the player sprite with it".
* **Every world sprite was snapped on its own.** Since `roundPixels` came on
  (pixiApp.js), each corner of each ground piece, building, prop, tree and
  label is rounded to a whole device pixel in the shader. With a fractional
  camera, each of them rounds at its own fraction of the camera, so as the
  view glides they all move a whole pixel at a time, but each at its own
  moment, and a quad's width and height breathe by a pixel.
* **On a phone nobody saw it.** A device pixel there is a third of a CSS px and
  the HD art is drawn about one picture px to a device px.
* **On a computer it was a whole pixel.** At one device pixel per CSS px (the
  QA desktop: 1280 x 800, a 436 px column, the world drawn 0.573 to the game
  px), a piece hopping a pixel is plain to see. The ground's art is also shrunk
  3.5x there, so a piece stretched by a pixel samples its picture into a
  different grain.
* **Why the diagonals.** A diagonal walk moves each axis 0.71 of the walk:
  2.5 x 0.71 x 0.573 = 1.01 px a frame, nearly a whole pixel. The camera's
  fraction then creeps 0.013 a frame, so the pieces' moments come round one
  after another: a column of ground tiles hops, then the next, then the next.
  That is a slow ripple across the screen, about every 1.3 s each way: the
  warble. Walking straight across is 1.43 px a frame. The fraction jumps 0.43
  a frame there, and the same hops are a fine fizz with no shape.

## The fix

* **The world container goes on whole device pixels.** In
  `src/rendering/pixiRenderer.js`, `update()` rounds the container's position
  (and the screen shake) to whole device pixels. Every world sprite then keeps
  the same fraction of a pixel however the camera moves, so the world moves as
  one picture, nothing re-sampled.
  * The rounding is to device pixels (`renderDpr()`), not CSS px. The old
    rounding the note describes was to CSS px, three device px on an iPhone.
  * The systems placed from the camera (the night's light map, the clouds and
    motes, the ground and object culling) are handed the camera as drawn.
* **You stay where you were on screen.** The camera follows you, so the
  fractional camera held your figure, your name plate and your bars perfectly
  still. Under a rounded camera your figure would sway by up to half a device
  pixel, and your plate's text would hop a pixel back and forth. So for the
  scene's update, `S.player` is moved on by what the rounding took off (under
  half a device pixel: 0.9 game px on a 1x screen, 0.3 on a 3x phone) and put
  back before the minimap.
  * Everything drawn from your position is then exactly where it was: the
    figure and all it carries, the swing, shot and gathering stand-ins, your
    speech bubble and emoji, the jump, swim and emote moves, and your shadow.
  * Nothing in the renderers writes the player's place. The game's own logic
    (moves, collision, the camera's follow, what is sent to the worker) runs
    before the draw and never sees the shift.
* **Other players, monsters and NPCs** are drawn at their own places. They now
  stand still on the ground when they stand still; before, a standing NPC
  glided while the ground under him hopped.

## Switches and probes

* `?camsnap=0` is the camera as it was, for a side-by-side on a computer.
* `window.__btCamSnap()` returns this frame's numbers:
  * `x`, `y`: where the world was drawn (CSS px).
  * `rawX`, `rawY`: where the old camera would have drawn it.
  * `cx`, `cy`: the camera as drawn (game px).
  * `selfDX`, `selfDY`: how far your own drawings were moved on.

## Measured (mp-camsnap)

The camera is moved exactly as a 60 fps walk moves it, one frame at a time, in
BroTown's ore yard. Each frame is compared with the frame before, moved by the
world's whole-pixel step. The measure is the share of the world's pixels that
did not move with it (a luma change over 24). The page's controls and the HUD
are taken out of the picture, and the bro is left out.

| | north-east | east |
|---|---|---|
| computer (dpr 1), old camera, worst frame | 5.0% | 11.1% |
| computer (dpr 1), old camera, mean | 0.9% | 9.2% |
| computer (dpr 1), whole device pixels, worst frame | 0.01% | 0.02% |
| phone (dpr 3), whole device pixels, worst frame | 0.00% | 0.01% |

* What is left is the lamps' flicker. The old camera's worst diagonal frame
  is a whole column of ground tiles and the Auction House hopping a pixel
  while the rest of the world did not
  (`tools/qa/mp/out/camsnap-old-ne-worst.png`).
* Your figure was drawn 0 device px from where the old camera drew it on every
  frame, on the computer and the phone, while the world under you was rounded
  by up to 0.5 px.
* `mp-camsnap` runs these checks: a computer at dpr 1 and a phone at dpr 3,
  with the old camera as the guard that shows the warble.
