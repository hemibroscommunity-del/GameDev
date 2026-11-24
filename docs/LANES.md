# The lanes and the ladder

MADE by `node tools/guards/draw-lanes.test.mjs --write` from `src/game/drawLanes.js`. Never edit it by hand:
`tools/guards/draw-lanes.test.mjs` fails a page that is not what the table makes. The rules are
`docs/specs/draw-lanes.md` (grand plan step 2.1, card O).

A **lane** is a row of knobs: how much a device draws. A device's facts pick its lane, never the name of a system,
browser, chip or model. The **ladder** is the rungs below a lane's row: when a phone runs hot or slow, the game
steps down one rung at a time, each rung one knob one step, and steps back up when it can. **No quality is lowered
in silence**: every rung is a row below, in the words of what a player sees. **Combat's timing and loading are never
on the ladder**: no knob changes a swing, a cooldown, the dash, the bow's sight or what loads behind the loading
screen.

## The lanes

| Lane | What it is |
|---|---|
| `full` | What every device draws today |
| `light` | A lighter picture, for tests and slow devices: picked only by `?lane=light` |
| `thirty` | A screen of 30 a second (an iPhone in Low Power Mode): the full lane's row (v2.3.5230: but monsters' art 8 ms a frame, a 30 screen's quarter, as before) and a step of three of its frames, 100 ms (v2.3.5233, card O PR 13) |

A device picks `thirty` where its screen runs at 30 a second, else `full` (`pickLane`). Where nothing is known yet: `full`.
`?lane=<name>` draws a page in that lane, whatever its facts.

| Knob | `full` | `light` | `thirty` |
|---|---|---|---|
| `rate` | Every frame the screen offers (a faster screen: steady down to about 40 a second) | A steady 30 frames a second on a 60 screen (a faster screen: as before) | Every frame the screen offers (a faster screen: steady down to about 40 a second) |
| `pixels` | Every pixel of the budget | Every pixel of the budget | Every pixel of the budget |
| `crowd` | The 50 nearest other players drawn | The 30 nearest other players drawn | The 50 nearest other players drawn |
| `program` | One drawing program for the world's sprites | One drawing program for the world's sprites | One drawing program for the world's sprites |
| `look` | Looks coloured on the graphics chip | Looks coloured on the graphics chip | Looks coloured on the graphics chip |
| `shine` | Metal shines | No shine on metal | Metal shines |
| `shadows` | Shadows drawn | Shadows drawn | Shadows drawn |
| `water` | The sea moves | The sea moves | The sea moves |
| `queue` | Monsters' art loads 4 ms a frame at most (a 60 screen's quarter) | Monsters' art loads 4 ms a frame at most (a 60 screen's quarter) | Monsters' art loads 8 ms a frame at most (a 30 screen's quarter) |
| `caches` | Every cache holds what its own cap allows | Every cache holds what its own cap allows | Every cache holds what its own cap allows |
| `step` | A frame moves the world at most 50 ms (three frames at 60) | A frame moves the world at most 50 ms (three frames at 60) | A frame moves the world at most 100 ms (three frames at 30): a missed refresh is still its whole ground |
| `prewarm` | No prewarm ring (not built) | No prewarm ring (not built) | No prewarm ring (not built) |

## The ladder

Two axes. The game's own work (the crowd, then the rate) is stepped down when the late frames' time was the
game's own; waiting for the graphics chip (the rate, then the passes, then the pixels) when it was the rest. A steady
lower frame rate comes before a softer picture (the owner's call 16). The rate's rung is on both axes: whichever
takes it first lowers the rate (on a screen of 60 or slower: a faster one keeps its own steps). The pixels change only behind
a loading screen or a tab's return.

### The game's own work

| Rung | Knob | What a player sees |
|---|---|---|
| 1 | `crowd` | The 30 nearest other players drawn |
| 2 | `crowd` | The 15 nearest other players drawn |
| 3 | `rate` | A steady 30 frames a second on a 60 screen (a faster screen: as before) |

### Waiting for the graphics chip

| Rung | Knob | What a player sees |
|---|---|---|
| 1 | `rate` | A steady 30 frames a second on a 60 screen (a faster screen: as before) |
| 2 | `shine` | No shine on metal |
| 3 | `shadows` | No shadows |
| 4 | `water` | The sea is still |

### Waiting for the graphics chip

| Rung | Knob | What a player sees |
|---|---|---|
| 1 | `pixels` | A quarter fewer pixels (a little softer) |
| 2 | `pixels` | Half the pixels (softer) |

### Waiting for the graphics chip

| Rung | Knob | What a player sees |
|---|---|---|
| 1 | `caches` | A full memory: each cache holds half its own cap, its oldest let go |
| 2 | `crowd` | The 30 nearest other players drawn |
| 3 | `crowd` | The 15 nearest other players drawn |

Every rung of both axes: 12 (the report's `rung` counts the rungs taken at once).

## The knobs, and who reads each

A knob is read through `laneKnob('<name>')` once its card O PR has moved it; until then its file reads its own
value, the `full` row's.

| Knob | What it is | Steps | Read by | Moved | PR | Switch | System |
|---|---|---|---|---|---|---|---|
| `rate` | the frame rate: the slowest frame, in ms, the pacer may hold a steady rate at, on a screen of 60 or slower (v2.3.5224: a fast screen keeps its own steps, down to about 40, whatever the lane or the rung) | `26`, `34` | `src/game/framePacer.js` | yes | 4 | `?ladderrate` | page-thread |
| `pixels` | the pixels drawn, a share of the lowest of the screen's own and card G's budget (renderRes.js; v2.3.5225: of the pixels drawn, phones too: the planning session's (b)) | `1`, `0.75`, `0.5` | `src/game/renderRes.js` | yes | 5 | `?ladderpix` | device |
| `crowd` | the most other players drawn in full (your party, your target, whoever fights you and your duel always) | `50`, `30`, `15` | `src/game/crowdCap.js` | yes | 6 | `?laddercrowd` | monsters |
| `program` | one drawing program for the world's sprites, or three (chosen behind the loading screen: never a rung; v2.3.5228: the three an override's, below) | `one`, `three` | `src/rendering/paletteTex.js` | yes | 8 | `?onebatch` | memory |
| `look` | how a character's look is made: coloured on the chip, or each baked (chosen behind the loading screen: never a rung; v2.3.5228: baked an override's, below) | `palette`, `baked` | `src/game/lookPaletteChoice.js` | yes | 8 | `lookpalette` | device |
| `shine` | the metal's shine on gear | `on`, `off` | `src/rendering/lightfx/glint.js` | yes | 9 | `?sheen` | render |
| `shadows` | the light and the shadows | `on`, `off` | `src/rendering/lightfx/lightFx.js` | yes | 9 | `?lightfx` | render |
| `water` | the sea's waves | `moving`, `still` | `src/rendering/wheelWater.js` | yes | 9 | `?waves` | render |
| `queue` | the ms a frame the strip queue may take loading monsters' art in play (v2.3.5230: the lane's, never the frame's length; was a quarter of the frame, 3 to 50 ms) | `4`, `8` | `src/rendering/zoneTextures.js` | yes | 10 | `?stripslice` | art |
| `caches` | the caches' caps, as a share of each cache's own (docs/BUDGETS.md part 3) | `1`, `0.5` | `src/rendering/gearNumbers.js`, `src/rendering/maskedEvict.js` | yes | 11 | - | look |
| `step` | the longest step, in ms, one frame may move the world (frameClock.js SMOOTH_MAX_MS, handed in; the loop's clamp): three of the lane's frames | `50`, `100` | `src/ui/BroTown.jsx` | yes | 13 | `?dtsmooth` | ui |
| `prewarm` | the prewarm ring (step 3.3, LATER): one value and no reader until 3.3 builds the ring | `0` | none yet | - | - | - | - |

Not yet moved: 0 of 11 knobs with a reader.

## The overrides

An override pins a knob, over the lane and the ladder; the governor never moves a pinned knob.

| Knob | Pinned to | When the device is | Why |
|---|---|---|---|
| `program` | `three` | `software` | a software renderer runs every branch of the one program for every pixel (TRAPS §225: 4.1 frames a second against 9.2) |
| `program` | `three` | `computer` | a Windows or Mac computer builds programs through ANGLE, whose compilers took minutes over the look palette's; this one was never built there (v2.3.5016) |
| `look` | `baked` | `windows` | Windows: ANGLE's FXC inlines the look palette's program, the loading screen stood at 75% for 5-10 minutes on the owner's laptop (v2.3.3838) |
| `look` | `baked` | `mac` | a Mac: ANGLE's Metal inlines as FXC does, and a computer has the memory the palette saves (v2.3.3842) |

The off-ramps: a switch in the address pins its knob (to a step, or to the lane's row: `-`), read through the page's one reader (`src/game/switches.js`).

| Knob | Pinned to | When the address has | Why |
|---|---|---|---|
| `program` | `three` | `?onebatch=0` | the three programs, as before the one program |
| `program` | `one` | `?onebatch=1` | the one program asked for (QA: a software renderer would keep the three) |
| `look` | `baked` | `?lookpalette=0` | every look baked |
| `look` | `palette` | `?lookpalette=1` | the look palette asked for (QA: even on Windows) |
| `water` | `still` | `?nowaves` | the sea still |
| `shine` | `off` | `?shine=0` | No shine on metal |
| `shine` | `on` | `?shine=1` | Metal shines |
| `rate` | - | `?pace` | the pacer off (`?pace=0`): the rate is read by nothing |
| `crowd` | - | `?crowd` | a crowd cap of its own (`?crowd=K`): the knob is read by nothing |

## The game's own drawing programs

The report's `self` names one that failed its self-test at the door (step 1.7). Pixi's own programs are not the
game's.

| Name | File | Programs built | Its way back |
|---|---|---|---|
| `one` | `src/rendering/paletteTex.js` | `bt-one-batch` | the three programs |
| `palette` | `src/rendering/paletteTex.js` | `bt-palette-batch`, `bt-palette-clip`, `bt-palette-hairclip`, `bt-palette-mesh`, `bt-palette-fill` | whole colours |
| `look` | `src/rendering/lookPalette.js` | `bt-look-batch`, `bt-look-sheen-batch` | each look baked |
| `sharp` | `src/rendering/sharpPixels.js` | `batch-sharp` | plain pixels |
| `clip` | `src/rendering/hairClip.js` | `batch-clip`, `batch-clip-alpha` | pictures to the alpha mask (colour numbers stay on the stencil) |
| `fill` | `src/rendering/fillBatch.js` | `batch-fill` | no one-colour glow |
| `water` | `src/rendering/wheelWater.js` | `bt-wheel-water`, `bt-wheel-water-all`, `bt-wheel-water-pal`, `bt-wheel-water-pal-all` | still water |
| `glint` | `src/rendering/lightfx/glint.js` | `bt-glint-filter` | the filtered pieces plain |
| `sheen` | `src/rendering/lightfx/sheenBatch.js` | `batch-sheen` | its pass |
| `shadow` | `src/rendering/lightfx/shadows.js` | `bt-shadow-shade`, `bt-shadow-filter` | the old pass |
