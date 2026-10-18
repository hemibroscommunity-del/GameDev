# The speed test, `?res=`, and three frame-time fixes (v2.3.3339)

> The owner, 2026-10-18: *"Not so sure about the performance. The framerate is
> definitely not totally smooth. It appears to be around 30fps to 40ish fps in
> my experience."*

## Why measure on the phone

The game's own code is small next to a frame: about 5 ms a frame on the QA box,
standing or walking in BroTown (`mp-frameprofile`, perfTracker's `workMs`). What
makes a frame slow on a phone is mostly its graphics chip:

- the screen is drawn at the phone's full pixel ratio, three canvas pixels a
  CSS pixel each way (about 2.9 million pixels a frame on the owner's phone with
  the dashboard folded);
- every pass that touches the whole screen costs that many pixels again: the
  ground (8 texture reads a pixel since the colour-number textures, v2.3.3190),
  the shadow layer, the moving water's shader, cloud shadows;
- every time the chip must stop drawing the screen and draw another picture
  first (the shadow layer's filter, each piece of shining metal's filter, a hat
  that clips the hair), a phone's tile-based chip writes the whole screen out to
  memory and reads it back.

No machine here has such a chip: the QA box draws in software, under 3 frames a
second, so its frame rate says nothing about a phone's. So the measuring is done
on the phone.

## The speed test

Test panel (a 1.2 s press on the place name in the top bar) -> **Speed test** ->
**Run the speed test**. No admin key is needed: it runs in the browser only and
sends nothing.

1. The panel closes, so the test times the game and not the panel over it.
2. While you stand still, it times the frames for 4 seconds (after 1.5 s to
   settle) with, in turn:
   - everything on, as you play;
   - no shadows (the light switch also takes the metal shine);
   - no metal shine;
   - still water;
   - a lower resolution: 2x instead of the phone's own (only on a phone above
     2x);
   - all of those off at once.
3. Everything goes back as it was. The switches are flipped for the page only
   (`setLightFx(on, false)`, `setSheen(on, false)`), so a page that dies
   mid-test comes back as it was.
4. A card shows each step's frames a second and how long its slowest frames took
   (the 95th percentile), then:
   - the biggest gain;
   - a warning when every step ran at about 30, which is what iPhone Low Power
     Mode (or a hot phone) does to the frame rate;
   - the game's own work a frame, how many times a frame the graphics chip
     switched pictures, and how many draws it made;
   - whether most of each frame is the graphics chip's or the game's code;
   - the screen's size and pixel ratio, and the canvas's size in pixels.

A screenshot of the card says what costs the most on that phone, and that is
what gets fixed next.

`src/game/speedTest.js`; `window.__btSpeedTest` is the last result;
`?speedms=<ms>` shortens each step (QA).

## `?res=`

`?res=2` (or 2.5, 1.5 ...) draws the canvas at that many pixels a CSS pixel,
never more than the screen's own (`src/game/renderRes.js` `renderDpr`). The four
places that turn the canvas's pixels into CSS pixels read it, or the canvas
would be resized every frame to the wrong size: BroTown's `resize()`, pixiApp's
init, `pixiRenderer.update` and `worldViewport`. Lowered, the canvas is stretched
smoothly (`html[data-res-soft] .brotown-canvas { image-rendering: auto }`): a
1.5x nearest-neighbour stretch doubles every other pixel, the uneven look the
owner has turned down before. The world is the same size on screen; text keeps
rasterising at the screen's own ratio. Whether the game should draw at a lower
resolution by default is the owner's call: softer, and much less work for the
chip. The speed test's 2x step shows both.

## Three frame-time fixes

Found by `mp-frameprofile` (below), none changes a pixel:

1. **The screen's draw list is no longer rebuilt every frame.** Pixi rebuilds a
   render group's whole draw list whenever a batchable Graphics changes
   (GraphicsPipe.validateRenderable), and `Graphics.clear()` on an empty graphic
   counts as a change. The screen's flash, atmosphere and HUD graphics are empty
   nearly always and were cleared every frame (effectsRenderer `clearIfDrawn`
   now skips that), and the minimap's gold quest road was cleared and drawn
   again every frame even standing still (now redrawn only when it moves,
   `_roadSig`). Measured: the screen's list rebuilt every frame before, never
   after, standing or walking. The world's list is still rebuilt every frame
   (the depth sort moves things every frame), which is a larger job left for
   later.
2. **The overview under the Wheel's ground is drawn only while a piece is
   missing.** The whole Wheel's overview picture was drawn under the ground
   pieces every frame: a full screen of blended pixels that the pieces, laid
   edge to edge and opaque, covered completely. It is now shown only while a
   piece the view touches (and 48 game px past it) is missing or still being
   laid (`wheelGround.js` `UNDER_PAD`). `mp-speedtest` draws the pieces with and
   without it: 0 of 214,130 pixels differ, none see-through.
3. **The stats are written to the browser's storage only when they change.**
   It was a synchronous write twice a second, even standing still.

## Measuring on the QA box

- `node tools/qa/mp/run.mjs frameprofile` (build with `npx vite build
  --sourcemap` first): a CPU profile standing and walking in BroTown, by source
  file; the frame's split; long tasks; how often each render group's draw list
  was rebuilt a second, and which renderables asked for it. `BT_PROFILE_QUERY`
  adds switches, `BT_PROFILE_TAG` names the files.
- `node tools/qa/mp/run.mjs speedtest`: the speed test from the real panel on a
  3x phone-sized page (every step measured, the switches really switched,
  everything back after, nothing saved, the card), `?res=2`, the overview check,
  and the screen's list not rebuilt standing still. 13 checks.

## What is left, by likely cost on a phone

From the frame-rate hunt (2026-10-18), to be ordered by the owner's speed test:

1. **Resolution** (the speed test's 2x step): every cost below scales with it.
2. **The metal shine**: one filter pass a piece of metal, a frame, for every
   armoured player on screen. A batched version would look the same.
3. **The shadow layer's pass**: drawn into its own picture mid-frame. Drawing it
   before the frame starts (as the night's light map is) would remove the break.
4. **The moving water**: its web of light is the heaviest shader in the game;
   `?caustics=0` keeps the waves without it.
5. **The ground's colour numbers** (v2.3.3190): 8 texture reads a pixel instead
   of 1; `?nopalette` is the old way, at about 30 MB more graphics memory.
6. **The world's draw list rebuilt every frame** (the depth sort): CPU.
