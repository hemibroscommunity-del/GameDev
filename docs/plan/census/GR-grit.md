# GR: the grit, measured (card GR; a diagnosis, no fix)

Measured 2026-11-24 ON THE TEST BOX (SwiftShader Chromium), never the phone.
The owner's shape: a 430x775 page at 3x, touch, the band folded: canvas 430x737
CSS, drawn 1290x2211 as on their phone; world scale 0.554 (the 0.606 in the
notes is the 390x844 QA phone). BroTown, `world: 'wheel'`. **How:** a scratch
scenario (never committed) put a gate before `requestAnimationFrame`: each
frame got a fake time 16.667 ms after the last (`performance.now` too) and ran
only when let through, so each frame's state and picture was read before the
next. The step taken (`__btStepLog`): 16.667 every frame. Keys held (d, w,
w+d): a full stick, exact. Jog 2.50 game px a frame = 4.156 device px; ride
5.00 = 8.312 (1.663 device px a game px).

## M2 + M4: who sits where (first, at the orchestrator's word)
Every world sprite's corner, device px, each frame, 120 frames through BroTown
(~280 sprites; drawn = rounded as `roundPixels` lands it; the bro unsnapped).
- **Buildings and still props against the ground: never moved.** 0 of 2,605
  frame-pairs (jog east), 0 of 2,268 (ride north-east), not 0.01 device px. No
  layer re-laid, re-sorted, rebuilt or culled-and-re-added in view (0).
- **The bro on the screen: still** (spread 0.005 device px jogging); the
  self-shift (`pixiRenderer.js:697-716`) keeps him where a fractional camera
  would. His board and parts the same; the ride's rideSpot parts animate.
- **The bro to one building, 120 frames: a SAWTOOTH, 1.17 device px high (0.39
  CSS px)** jogging east (the building steps 4,4,4,4,5; the bro 4.159 every
  frame); 1.23 riding north-east (5/6 a frame a side). Not noise, not a re-set.
- **What does move against the ground: the buildings' own life**
  (`wheelLife.js`: smoke, glow, sparks, glints, the flag): 14 of 22 sprites, up
  to 1.66 device px a frame, landing a whole px off 12-15 times a second each.

## M1: the camera's step (60 held frames at top speed)
| address | jog east | ride east | ride NE (x / y) |
|---|---|---|---|
| default | 4x49 5x10 (`5,4,4,4,4,4,4,5`) | 8x40 9x19 (`9,8,8,9,8,8,8,9`) | 5x8 6x51 / 6x51 5x8 |
| `?camsnap=0` | the container 4.156 even; each sprite still 4 or 5 (`roundPixels`) | 8.312 even; each sprite 8 or 9 | not run |
| `?pace=0` | not run | 8x41 9x18 (the default's) | not run |
| phone wobble, as shipped | not run | 8x41 9x18; step 16.12-17.26 ms | not run |
| phone wobble, `?dtsmooth=0` | not run | 5x1 7x3 8x34 9x20 11x1; step 10.7-22.7 ms | not run |
North alone: the spot was blocked (speed 0), not measured; by the sums it is the
east pattern on y. **One device px uneven (12% of a jog step, 6% of a ride
step), a regular beat. `?camsnap=0` keeps it**, as the owner felt.

## M3: the pictures' own pixels
Device px a picture px: ground 0.83 (`wheelGroundPieces`, linear, no mip
chain), buildings and big props 0.83 (linear), smaller props 1.1-2.1,
townsfolk 1.5-2.2 (look palette, nearest), the bro 1.86 (sharp bilinear,
`sharpPixels.js:107`). **Exactly 1 device px on a 3x phone: `?zoom=0.926`**
(scale 0.6665: 83% of today's width and height in view, 69% of the area).
Twelve camera places one device px apart, stood still in the town, share of the
world's pixels left behind a step:
| | sideways | up/down |
|---|---|---|
| default (0.83) | 0.044-0.053% (one townsperson's speech icon) | 0.000-0.027% (the edge) |
| `?zoom=0.926` (1.00) | 0.000-0.001% | 0.09-0.39% (a beat of three) |
| `?camsnap=0` | 0.003-0.065% | not run |
**Nothing still crawls at today's zoom**: on whole device px the world moves as
one picture. 1:1 buys nothing here and costs a third of the world in view.

## M5: the rubber band on the board
The camera (`BroTown.jsx:7914-7942`): target = the bro + a LEAD of 30 game px x
the stick; it closes 14% of the gap a frame (8% stood, 18% swinging). A 14%
chase trails a steady speed v by 6.1 v, so **the bro's place on the screen
follows his speed**: lead and trail cancel only at the board's top speed.
Device px from the middle along the heading (- = behind), east, full stick:
| frame | 10 | 20 | 30 | 45 | 60 | 90-150 held | let go +50 | +88 |
|---|---|---|---|---|---|---|---|---|
| default | -28.6 | -25.6 | -22.7 | -13.0 | -0.5 | +1.2 flat | -28.6 | -44.3 |
| `?ridecoast=0` | -9.5 | -1.2 | +0.7 | +1.1 | +1.2 | +1.2 flat | 0.0 | 0.0 |
| jogging | -31.1 | -25.8 | -24.7 | -24.4 | -24.3 | -24.3 flat | | |
Board speed share: 0.36 (frame 10), 0.55 (30), 0.89 (45), 1.00 (60); let go,
0.35 at +50. **Each push from a stand slides the bro ~30 device px (10 CSS px)
forward on the screen over 0.8 s; each roll-off ~45 (15 CSS px) back over
1.5 s; jog vs ride sit 24 apart.** Held at top speed: flat (spread 0.005), no
periodic swing. The diagonal: the same, 0.7x a side.

## The causes, ranked by measured size
1. **The view surges with the board's speed: 30-45 device px.** M5.
   `BroTown.jsx:7914-7916` (the lead), `:7932` (the 0.14 chase), `:7941-7943`.
   Ride a lap on **`?ridecoast=0`** (no push, no roll-off: no surge; one 0.3 s
   catch-up at the start). Nothing removes the 24 px jog/ride offset.
2. **Riding diagonally the ground leaves 1.2-1.7% of its pixels behind a
   frame** (two bands of the screen, one-row streaks on the stones' edges;
   0.04% jogging east; stood still 0.6-0.85%, townsfolk and smoke). Ruled
   out: a piece hopping (a band moved a row more never matches better), the
   shadows (hidden: still 0.9-1.8%), the still camera (both axes clean, M3).
   It needs the bro moving: NOT NAMED. Next: the same run with the tiles'
   children hidden one kind at a time, and `?groundkeep=0`. No address.
3. **The world steps whole device px, the bro glides: the 1.2 device px
   sawtooth (0.4 CSS px).** `pixiRenderer.js:681-689` against `:697-716` and
   `pixiApp.js:742`. No address: `?camsnap=0` keeps it. Likely below seeing.
4. **The buildings' life hops a px 12-15 times a second a sprite**
   (`wheelLife.js`). Their own animation; no address.
5. **NOT measurable here:** the 120 Hz screen showing a 60 page (each picture
   held two refreshes: the world jumps 4.2 device px a frame jogging, 8.3
   riding, where iOS's own scrolling moves half as far twice as often: A3's
   item 2, likely the "does not feel like 60"); the phone chip's sampling
   (this box is SwiftShader); a thumb on the stick (a waver moves the lead,
   30 game px x the change, and the speed; keys here were exact). No address.

## A card's draft for the fix (cause 1; one PR; the owner rides it first)
- **The rule**, a new `src/game/cameraFollow.js` (finish.md rule 5; no
  imports; suite `server/test/camera-follow.test.mjs`): the view moves by the
  bro's step each frame, THEN closes the gap, so its trail is 0 at any speed;
  the lead eases with the speed share. The bro sits at one place on the
  screen jogging, pushing, riding, rolling off. The suite: a ride from a stand
  with push and roll-off, the offset within 2 device px of its held value every
  frame; the old follow fails it.
- **The switch** `?camfollow=0` (the old chase): its row in
  `tools/guards/lib/switches.mjs` and `src/game/switches.js`.
- **The call**: `BroTown.jsx:7912-7943` becomes one call. CARD CT's file:
  waits for CT, or asks it for the lines.
- **The proof** `mp-camfollow` (this census's gate: steady 60, the offset each
  frame, the phone's shape, `world: 'wheel'`, its `lane`).
- Owner sees: no slide forward and back on the board. Cost: no memory, a few
  sums a frame. Cause 2 waits on its next run; 3-4 wait on the owner's lap.
