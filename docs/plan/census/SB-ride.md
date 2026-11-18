# SB: what holds the page on the skateboard (v2.3.6380, card SB PR 1)

The owner, 2026-11-18: *"I notice 'grainy' feeling when on a skateboard
playing on my phone where sometimes it freezes just for tiny fractions of a
second while it loads."*

`mp-heldsweep` has a `ride` station now: on the board, a ring of 16 points
2200 game px round the Wheel's centre (inside BroTown's safe ground, 2937),
glided at the board's 300 game px a second (mp-townride's and `town`'s way:
`z` to get on, `H.glideTo`), about 60 s. `ridewalk` (asked for only) walks
the same ring at 150. Both start at the ring's first point, reached before
the profiler starts.

```
NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
BT_QA_PROFILE=budget-android BT_HS_STACKS=1 BT_HS_STATIONS=ride,ridewalk QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep
```

Main at 7569a0c0, one unminified build, ten stations' worth (five runs of
two), 2026-11-18. **The first ring a page goes meets the world's art down
the profile's thin line for the first time ("cold"); the second finds most
of it come ("warm")**, so each profile was run both ways round.
budget-android's first run shared the box with the precheck for part of its
ride (its numbers may read long); the others ran alone.

## The rings, side by side

| run | station | s | pieces laid | a second | came on screen unlaid | held outside the frame | holds >= 12 ms |
|---|---|---|---|---|---|---|---|
| budget-android 1 | ride, cold | 63 | 105 | 1.7 | 105 (100%) | 4352 ms | 62 |
| budget-android 1 | walk, warm | 106 | 678 | 6.5 | 26 (4%) | 5754 ms | 64 |
| budget-android 2 | walk, cold | 104 | 554 | 5.4 | 267 (48%) | 6317 ms | 78 |
| budget-android 2 | ride, warm | 66 | 515 | 8.1 | 408 (79%) | 3666 ms | 58 |
| hotel-laptop 1 | ride, cold | 58 | 47 | 0.8 | 46 (98%) | 2064 ms | 5 |
| hotel-laptop 1 | walk, warm | 103 | 514 | 5.1 | 342 (67%) | 3275 ms | 11 |
| hotel-laptop 2 | walk, cold | 100 | 234 | 2.4 | 225 (96%) | 3663 ms | 16 |
| hotel-laptop 2 | ride, warm | 60 | 186 | 3.2 | 180 (97%) | 1819 ms | 2 |
| plain (no profile) | walk, cold | 101 | 677 | 6.8 | 69 (10%) | 2185 ms | 12 |
| plain (no profile) | ride, warm | 60 | 586 | 10.0 | 216 (37%) | 1444 ms | 10 |

Per second the ride holds the page about as much as the walk (budget-android
warm: 56 ms a second riding, 54 walking), with fewer holds over the line a
second walking than riding (0.6 against 0.9). **The board does not bring a
new kind of hold; it brings the same ones about one and a half times as
often**, and the ground's pieces among them.

What the table shows besides (a Found, not this PR's): **the ground does not
keep up with the board on a slow machine.** Riding warm, 79% of the pieces
on budget-android and 37% plain came on screen before they were laid
(`wheelGround.js` popIns: the overview's plan colours shown there until the
piece comes); cold on a thin line, nearly all. The ground worker lays about
8 to 10 pieces a second at most here, and the board needs that many.

## The ground's own holds on the ring (card SB's)

Resolved by each hold's own call path (`BT_HS_STACKS=1`). Three kinds:

- **the atlas**: `paletteTex.js` `takeRow` > `source.update()` > Pixi's
  `GlTextureSystem.onSourceUpdate` > `texSubImage2D` of the WHOLE 256 x 256
  colour atlas (256 KB) for one row of 1 KB; from `wheelGround.js` `_sprite >
  _source > makePaletteSource` (a piece) and `wheelObjects.js`
  `loadPalettePage > makePaletteSource` (an object page);
- **a piece's first upload**: `wheelGround.js` `_sprite > _toGpu >
  initSource` > `texImage2D` (one byte a pixel, ~160 KB) and
  `applyStyleParams` / `_applyMipRange`;
- **a piece made**: `_sprite`'s own (`new Sprite`, `Texture`, `addChild`,
  `BufferImageSource`).

| run | station | the atlas | a piece's first upload | a piece made |
|---|---|---|---|---|
| budget-android 2 | ride, warm | 15 holds, 148 ms, **21.3** the longest | 7, 62 ms, 17.4 | 8, 66 ms, 12.3 |
| budget-android 1 | ride, cold | 6, 58 ms, 12.4 | 4, 45 ms, 15.0 | 1, 7 ms, 7.1 |
| budget-android 2 | walk, cold | 35, 298 ms, 15.4 | 16, 166 ms, 16.8 | 14, 105 ms, 10.8 |
| budget-android 1 | walk, warm | 31, 246 ms, 13.7 | 26, 184 ms, 12.3 | 19, 132 ms, 13.0 |
| hotel-laptop 2 | ride, warm | 3, 17 ms, 6.2 | 2, 15 ms, 9.6 | 8, 47 ms, 11.2 |
| hotel-laptop 1 | walk, warm | 15, 95 ms, 10.6 | 7, 43 ms, 9.3 | 7, 35 ms, 6.2 |
| plain | ride, warm | 4, 30 ms, 9.7 | 4, 22 ms, 8.2 | 2, 13 ms, 6.4 |
| plain | walk, cold | 8, 50 ms, 11.6 | 7, 34 ms, 6.7 | 4, 26 ms, 8.6 |

**Read these as stretches, not as the sends' own time.** A hold is an
unbroken run of the page busy outside the frame, named by the call path with
the most samples in it; on a slowed box several jobs run back to back (a
worker's reply, a piece placed, a garbage collection, a band redraw), and the
whole run is the hold. The atlas's own time was then measured directly
(`paletteTex.js` `atlasRowSent`'s clock, `mp-rideheld`, PR 2's branch): the
whole atlas sent holds the page **0.08 ms** a send on the plain box (2.3 ms
the longest of 983) and **0.43 ms on budget-android** (4.5 ms the longest of
425). So the 21.3 ms "atlas" hold was some 0.4 ms of the atlas inside 21 ms of
other work. The ground's own sends are a sliver of the ride's holds, not
their cause; card SB's PR 2 (a row of 1 KB sent alone: 0.03 and 0.15 ms a
send) is worth that sliver only. The same caution holds for every row below:
the ms is the stretch's, the path is its biggest part.

## Every family over the line on the ride, worst first

Slowed (budget-android, both rides; hotel-laptop, both), holds of 12 ms or
more outside the frame, by the hold's own path. "x" is how many, over the
four rides. A family the tour already lists keeps its own line (`gc` 60,
`the frame itself` 70, `R > J` 16).

| # | longest | x | family (the path) | where in src | whose |
|---|---|---|---|---|---|
| 1 | 61.0 | 13 | `gc`, the garbage collector | the browser's (listed, 60: one 61.0 at budget-android's cold ride) | browser (make less garbage) |
| 2 | 39.6 (in a frame) | 1 | `the frame itself`: `_updatePlayer`, `_updateGatherNodes` | `BroTown.jsx` loop (listed, 70) | box |
| 3 | 33.6 | 5 | `wrapped > pack > deflate > Blob` | `rendering/p256.js` `pack` > `deflate` (a 256-colour twin packed on the page, `CompressionStream`) | **HB2** (p256.js) |
| 4 | 28.6 | 9 | `wrapped` (a timer's job with no name of the game's under it) | `debug/perfTracker.js` `wrapped`: unresolved | list |
| 5 | 27.8 | 6 | `load > stripAsNumbers > numbersOf > getImageData` (`pack-page`) | `rendering/picsNumbers.js` `stripAsNumbers` (a strip read back off a canvas on the page) | **HB2** (the pack-page path, its PR 5) |
| 6 | 27.5 | 2 | `tick$2 > resourceTick > questRoutePoint > questRouteExit(s) > questTargetZone > _routeQuests` | `ui/deskTeach.js` `tick` > `resourceTick` > `game/questRoute.js` | **HB2** (src/game, outside the renderers) |
| 7 | 24.1 | 8 | `(anonymous)` | unresolved (no name on the stack) | list |
| 8 | 23.6 | 2 | `_flushOutbox > Wrapped.ws.send > send` | `networking/wsClient.js` `_flushOutbox` | RR (wsClient.js) |
| 9 | 23.4 | 1 | `stop$2 > terminate`, and `job > ask$2 > worker$1 > Worker` (16.9, walking) | `rendering/stripRead.js` `stop` / `worker`: the strip reader's worker let go after 4 s idle (`IDLE_MS`) and made again for the next look; a ride meets looks seconds apart | list (no card holds stripRead.js) |
| 10 | 22.1 | 1 | `tick$1 > guideState > harvestCoachWanted > loadTeach` | `game/deskTeachState.js` / `ui/guideArrow.js` `loadTeach` | **HB2** |
| 11 | 21.7 | 14 | `R > J` / `R > S2` (React, no game name) | listed (16): over it at budget-android's ride, 21.7 | **HB2** (its debt row) |
| 12 | 21.3 (the atlas's own: 0.43 a send, 4.5 the longest) | 4 | **the atlas** (above) | `rendering/paletteTex.js` `takeRow` | **SB** (PR 2) |
| 13 | 19.6 | 15 | `server-message`: `ws.onmessage`, `_w$2.onmessage` (the readers' replies) | `networking/wsClient.js` `ws.onmessage`; the strip reader's `onmessage` | RR / list (HB-holds row 15) |
| 14 | 18.3 | 14 | `ui:GearTab`, `BottomDashboard`, `VitalBar`, `BandKeys` redrawn | `src/ui/**` band components | **HB2** (GearTab, its PR 4) / list |
| 15 | 17.4 (a stretch: its own share not yet timed) | 3 | **a piece's first upload** (above) | `rendering/wheelGround.js` `_toGpu` | **SB** (PR 3) |
| 16 | 17.9 | 4 | `strip-made` (`_stripOfNumbers`; `tick2 > requestAnimationFrame`) | `rendering/zoneTextures.js` `_stripOfNumbers`, `stripRows.js` | list |
| 17 | 15.5 | 8 | `_runLine > _pack > _bandBytes` / `_cellBytes` | `rendering/framePack.js` (a monster strip kept deflated a frame at a time, v2.3.5257) | list |
| 18 | 15.6 | 1 | `sweepPicsOnceTurn` | `rendering/picsOnce.js` (seen before: this box's pauses, held-budget.mjs 5049) | list |
| 19 | **12.3** | 1 | **a piece made** (`_sprite > Sprite`) | `rendering/wheelGround.js` `_sprite` | SB (with PR 3) |

Under the line, or one just past it (the judge's noise): `_objectSpread`,
`tick2 > shown > querySelectorAll`, `window.__btTex`, `_tick`,
`letGoWhenIdle`.

**Card EN's: none.** No hold on any ring had `entityRenderer.js` or a
townsperson's look on its path: the ring runs round the safe ground's
outside, past the town's folk.

## What it means for card SB

- The ground is NOT what holds the ride: its sends are a sliver of the
  stretches named after them (the atlas: 0.43 ms a send on budget-android,
  measured directly). **PR 2 (6381, `?atlasrow=0`)** still sends a row of
  1 KB in place of the 256 KB atlas (a third of the time, the same colours
  on the chip, byte for byte): small, and said so. A piece's first upload
  is timed directly before any PR 3 is opened for it.
- **What holds the ride on budget-android is mostly others' work**: HB2's
  (p256's pack, the strip read back, the quest route, React and the band's
  redraws), the garbage collector, the unnamed timers, the worker's
  messages. The ride station's line (`held-budget.mjs` `STATION_LINES.ride`)
  is the general 12 ms, which the plain box meets today.
- **What the board does that walking does not: it outruns the ground** on a
  slow machine (pieces on screen before they are laid, the overview's plan
  colours shown there: 79% riding warm on budget-android). The planning
  session's answer (2026-11-18): in scope, likely part of the owner's
  "grainy"; a later SB PR may look further ahead / lay faster while riding,
  memory not up, no hold over the line. Also card SB's now: the strip
  reader's worker let go and remade (row 9) and framePack.js `_pack`
  (row 17), timed directly first.
