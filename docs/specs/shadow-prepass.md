# The shadows drawn before the frame (v2.3.3377)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*. After draw-lists.md, sheen-batch.md and one-batch.md.

## What was wrong

The shadow layer (lightfx/shadows.js) is drawn through one filter: every
shadow piece is drawn opaque into a picture of its own at CSS resolution, and
the filter turns "covered" into the shade at the land's alpha, with a
one-texel soft edge. That keeps overlaps from darkening twice, and it is the
look the owner likes.

But a filter is a **render pass**, and this one ran in the **middle** of the
frame: the ground was already drawn when the graphics chip stopped, drew the
pieces into their picture, and went back to the screen to draw the shade.

A phone's chip (tile-based: every iPhone, most Androids) holds the frame in
its own small fast memory while it draws. Stopping in the middle writes the
half-drawn frame out to main memory, and going back reads it in again: the
colour and the stencil, about 15 MB each way at 3x on a big iPhone. Every
frame, for every player, wherever there is a shadow on screen -- in the
Wheel, nearly always. (TRAPS §221 is the same lesson for the metal shine.)

## What changes

The pieces are drawn into their picture **first**, before the frame starts,
and the frame draws the shade from it as one more quad. The chip draws the
frame in one go.

- The pieces live in a container of their own (`cast`), which is never in the
  scene. At the end of the shadows' update -- the last world pass, after the
  camera and every figure have moved, right before the frame is drawn -- it is
  drawn into `rt`: the screen's size in CSS px plus 2 a side (the filter's own
  padding), at one texel a CSS px, as the filter's picture was.
- It is drawn with the world's transform less the camera's fraction of a pixel
  (the lock to the world's grid, v2.3.3149) plus the padding, so every piece
  lands on the same phase of the same grid as in the filter's picture.
- The shade is a quad over the screen (`shade`) in the shadows layer's place,
  drawn with the filter's own fragment program: the same five reads at the
  same points, slid back by the same fraction (`uShift`), at `highp`.
- If the pre-pass ever throws on a device, Pixi's state is put back
  (renderHeal.js) and that page uses the filter, as before.
- `?shadowpass` is the filter in the middle of the frame, as it was.
- `window.__btShadowPrepass` (`on`, `set`, `redraw`, `stats`, `casts`) is the
  QA's handle; `set` is also the Speed test's lever.

## The same picture

`mp-shadowprepass` holds the game's frames and draws one frame three ways:
before the frame, the old way (the filter, the same pieces), and before the
frame again. Measured: see the PR.

## Steadier, for free

v2.3.3338 drew the shadow pieces unsnapped because, inside the filter, Pixi
snapped every corner to a grid 0.77 x 0.83 of a texel (it rounds by the pooled
power-of-two texture's size, not the picture drawn into), and that crawled as
the camera crossed whole pixels. The pre-pass draws into a picture exactly the
screen's size, so Pixi's snapping lands on the picture's own texel grid and
costs nothing: `mp-shadowlock`, a whole CSS px a step, measured

| | across | down |
|---|---|---|
| before the frame, unsnapped (the game) | 0.0003 | 0.0184 |
| before the frame, snapped (`?shadowsnap=1`) | 0 | 0.0183 |
| the old way, snapped (`?shadowsnap=1&shadowpass`) | 0.0332 | 0.1098 |

(of a luma level a pixel, from one step to the next). The unsnapping stays: it
is what keeps the fallback (the filter) steady. `mp-shadowlock`'s snapped run is
now the old way's, the flicker its checks 7 and 8 measure against.

## Measured

On this box's software graphics a pass costs nothing extra (there is no tile
memory to write out), so what can be shown here is the count:

| | before the frame | the old way |
|---|---|---|
| the screen bound, a frame | | |

**On a phone, the Speed test can show it**: a new step, *"Shadows the old way
(a pass mid-frame)"*, and the card says how many frames a second drawing them
first saves there. The card now also says how many times a frame the screen
was set aside (`resumes`).

## How it is checked

- `mp-shadowprepass`: in BroTown's ore yard and at a Flame Fields fight, the
  shadows drawn before the frame; one held frame drawn both ways; the shade
  put away changes thousands of pixels; drawing that held frame binds the
  screen one time fewer than the old way (the live frames' counts printed
  beside: other passes come and go from frame to frame).
- `mp-speedtest` expects the new step, the screen set aside more often by it,
  and the switch back on after.
- `mp-palette` hides the pieces it leaves out in their own container and draws
  the picture again for its camera (`redraw`).
- `mp-shadowlock` (its snapped run now the old way's, above), `mp-lightfx`,
  `mp-wheelshadows`, `mp-worldshadow`, `mp-sceneleak`, `mp-membudget` and
  `mp-questline` run on it.
