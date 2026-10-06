# Memory plan: what the phone holds, what leaks, and the order of the fixes (v2.3.3075)

Owner, 2026-10-05: *"Make a plan for how you will optimize game performance
(particularly memory usage) without affecting quality of gameplay"* -- and
then *"continue with your recommended plan of action"*.  The black screens
(*"It happens too often that the screen goes black"*) are what this is for.

This is the running record: the measurements it started from, the rules every
change keeps, and each item's status.  A change that lands updates its row.

## How it is measured

Everything here is a phone (390 x 844, dpr 3) in headless Chromium against a
local worker, in the Wheel's Brotown unless it says otherwise.  An iPhone's own
numbers differ; what does not differ is which code holds what, and a leak is a
leak on both.

- `mp-gpuaudit` (v2.3.3037): the textures on the GPU, named, and their peaks.
- `__btTex()`: the asset cache, decoded size (the figure the ~250 MB line in
  this repo's notes is about).
- `mp-memledger` (v2.3.3075): everything the two above cannot see -- decoded
  sound, every 2D canvas alive (tracked from its creation), the main thread's
  and each worker's JS heap and ArrayBuffers -- and a tour of the eight lands,
  twice, to see what does not come back.
- `mp-bakeleak` (v2.3.3074): three renderer rebuilds and eight designer strokes.
- Heap snapshots of an UNMINIFIED build (`npx vite build --minify false
  --outDir <dir>`, served with `QA_DIST=<dir>`) say WHO holds a leaked object;
  that is how the rebuild leak's holders were found (TRAPS §139).

## Where it started (main, v2.3.3037)

| | MB | Counted before? |
|---|---|---|
| textures on the GPU, arriving / at a fight | 93 / 116 | yes (mp-gpuaudit) |
| asset cache, arriving / peak | 172 / 197 | yes (`__btTex`) |
| decoded sound (65 sounds, 273 s), all held | 89 | no |
| 2D canvases alive (548) | 128 | partly |
| the ground's second copy (54 pieces of 402 x 402) | 34 | no |
| the ground's worker | ~20-40 | no |
| JS heap | ~22 | no |

Leaks, measured:

- **A black screen's recovery** (`_rebuildRenderer`) left the old renderer's
  art behind: the asset cache 172 -> 200 -> 252 -> 303 MB over three rebuilds,
  2D canvases 128 -> 321 MB, three WebGLRenderers alive after two.  Each black
  screen made the next likelier.
- **A stroke in the character designer** left 11.5 MB behind (92 MB for eight).
- **Touring the eight lands**: textures come back, 2D canvases grew ~5 MB a lap.

Memory spent on nothing:

- **The old town's music** (`village.mp3`, 40 MB decoded, 43 on an iPhone,
  which decodes at 48 kHz) is decoded at the hidden stop in today's town on
  the way in and kept for good.  What the Wheel then plays depends on the
  phone (measured, scratch timing probe, CPU at 1x and 4x): on a quick one
  the intro's hand-off (IntroVideo `beginTransition`, v2.3.831) lands after
  the arrival and starts the old town's song IN the Wheel; on a slow one it
  lands before, the song plays in today's town under the ocean clip, and the
  Wheel gets the session track.  After a death, a dungeon or the farm the
  Wheel plays the session track, and the 40 MB sits idle -- until a farm
  visit, which plays the old town's song.  Letting it go was tried (not
  shipped): every way to do it changes what you hear somewhere -- a gap at
  the intro's end, or on the next farm visit, while the song is decoded
  again -- so it went to the owner (Phase 4), who said yes to streaming the
  music instead: #815, v2.3.3073, and no song had to change.
- **Every return from another app** after 2 s re-decodes every sound
  (`_rebuildContext`), a 50-90 MB spike while the old copies wait to be freed.
- **The damage-number font** is 11 pages of 512 x 512: ~11 MB of canvases and
  14.6 MB on the GPU, not the 6.7 MB TRAPS §137 measured (that counted 400 px
  logical pages).

## The rules every change keeps

1. **Same pixels, same sound.**  Proven byte-identical where it can be
   (bake-identity, qa-bake-ident, mp-geartrim) or by side-by-side phone
   screenshots; anything not identical goes to the owner first, as the chop
   layers did (v2.3.2375).
2. **No new first-use hitch.**  The preloading law and the Wheel's
   looks-as-you-walk clause stand (CLAUDE.md).  Nothing moves off the loading
   screen.
3. **No pop-in, no gameplay change.**  The server is not touched by this work;
   the phone scenarios for each changed path pass (mp-questline, CI's playable,
   among them).
4. **One system per PR**, its before / after numbers in the PR, a scenario that
   fails on main and passes after.
5. **Keep what was learned.**  Textures stay `<img>`-backed (v2.3.778: an
   ImageBitmap becomes an invisible husk on an iPhone after a purge); the
   canvases behind bakes a rebuilt renderer re-uploads from are never zeroed.

## The order, and where each item stands

**Phase 0 -- measure what matters.**

| Item | Status |
|---|---|
| The plan, this file | v2.3.3075 |
| `mp-memledger`: sound, canvases by maker, heaps, the eight-land tour | v2.3.3075 |
| Crash reports carry a memory snapshot and the rebuild count | v2.3.3075 |

**Phase 1 -- stop the leaks** (the biggest effect on black screens).

| Item | Measured | Status |
|---|---|---|
| A rebuild lets go of the old renderer: listeners, bakes, ground, Pixi's render-target listeners | cache flat over three rebuilds (was 172 -> 327 MB) | #802, v2.3.3074 |
| A re-bake lets go of what it replaced (`releaseCanvasSource`, every site) | eight strokes +0.4 MB of cache (was +92) | #802, v2.3.3074 |
| The ~5 MB-a-lap canvas growth on the land tour | flat after #802 (monster recolours released properly) | #802 |
| A destroyed texture lets go of its picture even where Pixi still points at it (pooled batches, hidden sprites' draw data) | after a tour of four lands: 22-35 MB of freed object sheets, canvases and ground held -> 0 (`mp-zombietex`) | #810, v2.3.3069 |
| Freed on close: the world map's canvas (11.3 MB an open at 3x, held until the next GC) | five opens: 3 dead canvases, 31.4 MB -> 0 (`mp-worldmapfree`) | #812, v2.3.3070 |
| Freed on close: the loading clip's warm-up copy | a hidden `<video>` of `loading-ashore.mp4` (a 0.6 MB file) and its poster, held for the session by BroTown's `_introWarmRef` -- only on a session that shows the welcome; ~1-3 MB on a phone at most; rubble's scratch canvases are locals the GC takes | small; not done on its own |
| A snowball burst playing when the frost art is handed back (found on the way: app.render threw until the burst ended) | retired before the frame draws (`mp-burstfree`) | #813, v2.3.3071 |

**Phase 2 -- stop paying for what nobody sees or hears.**

| Item | Saves | Status |
|---|---|---|
| Decoded sounds kept across the audio rebuild after an app switch | a 50-90 MB spike per return | needs an iPhone: the spec lets a buffer outlive its context (`_rebuildContext` drops them as "decoded against the dead context"), but this is the path that brings sound back after another app took it, and only a real iPhone can say a kept buffer still plays there |
| The ground's CPU copy dropped once uploaded (re-laid after a graphics reset) | 33 MB standing, 52 after a walk, 62 after a rebuild (page ArrayBuffers 53 -> 20 MB) | #806, v2.3.3076 |
| The damage-number font's atlas trimmed | 5-10 MB | not a clean win: its letters draw words ("Blocked!", "+30 XP"), so a smaller set sends some to the slower canvas text; its canvases are what a rebuilt renderer uploads it from |
| Wheel objects loaded by their own size, not the largest building's (a page loads when any object on it stands within the view + 480 game px + the LARGEST picture's size: 548 tall, 275 a side) | measured offline (the game's placing and manifest, 25 spots from the town to each land's third stretch, the QA phone's view): 12.1 -> 9.5 MB of pages loaded on average, 21.0 -> 17.6 kept; up to 12 MB less at a land's second stretch | not done: that slack is also what hides a slow page from a small object coming into view -- taking it away is a pop-in risk on a slow connection (rule 3); the owner's call if wanted |
| Small: the chopper's spare copy, the worker's caches, sounds decoded twice, idle bake worker | measured much smaller than first thought: the ground worker 2 MB of heap + 18.6 MB of buffers (the swatches and fields it lays with, all in use), the bake worker 0.3 MB, sounds decoded twice ~1 MB, and the lumberjack's two key-intact crops (4.8 MB) are what a skin change re-bakes from | not worth a change: ~6 MB at most, and the crops' only replacement is a fetch on every skin change |

**Phase 3 -- bigger, still pixel-identical** (each its own PR).

| Item | Saves | Status |
|---|---|---|
| Canvas art made purgeable (compressed images the iPhone can drop and re-decode) | up to ~70 MB | |
| Character art kept on the GPU only, re-baked after a black screen's rebuild (measured 2026-10-06: of 540 canvases, 127 are copies of a texture already uploaded -- 45.6 MB, mostly the gear sheets, the damage font's pages and the skill poses, all module caches a rebuilt renderer re-uploads FROM the canvas; the effects renderer's own big strips are not on the GPU until first drawn).  Pixel-identical by construction (the same bakes run again), but it changes the black-screen recovery path, so it is planned with the owner first.  Named by a probe (unminified main, arrival in the Wheel: 46.8 MB in 139 canvases): the walking gear sheets 18.1 MB (gearSheets packTrimmed), the combat poses' gear strips 13.9 MB (effectsRenderer _gearStrip), the damage font's pages 11 MB, the rest under 4 MB | 25 MB of page memory: the combat strips and the font (`mp-gpuonly`, 118.0 -> 93.1 MB of canvases on arrival) | #824, v2.3.3088 (the owner's yes, a slightly slower recovery after a black screen: the font is installed afresh for a rebuilt renderer, in the face the first install drew).  The walking gear sheets stay: the masked-body bakes read them back (drawGearFrame).  Found on the way: pixi 8.17's GPU collector unloads a texture marked autoGarbageCollect (the font's pages are) after 60 s undrawn and uploads it again from its canvas -- an emptied canvas draws blank -- so a picture kept on the chip only is taken out of the collection |
| Skill figures baked for what you wear only, the other in the background | 16-19 MB | |
| Palette textures for the ground and the Wheel's objects | ~55 MB | |
| The unused depth buffer off: the screen asks for its stencil (the masks) alone | ~11 MB of GPU memory on a 3x iPhone (~20 if Metal pads the packed buffer to 8 bytes a pixel); none on Chrome, which allocates a packed buffer whatever is asked.  Per WebKit's `WebGLDefaultFramebuffer` (depth + stencil: `DEPTH24_STENCIL8`, on Metal 32-bit float + 8; stencil alone: `STENCIL_INDEX8`).  DEPTH_TEST is never turned on, so not a pixel changes (`mp-nodepth`) | #814, v2.3.3072 |

**Phase 4 -- the owner's call** (each trades something a player might notice;
none is done without a yes).  Asked on 2026-10-06, the owner said *"Yes do all
of them"* to five: the Wheel's music and music streamed (both #815,
v2.3.3073: one `<audio>` element plays the track from its file, decoded sound
88.7 -> 25.8 MB), the gathering poses made the first time they can be wanted
(#822, v2.3.3077: made on the way to a tree, as a log lands in the bag, when a
campfire is lit; 2D canvases on arrival 118.0 -> 91.1 MB), the character art
on the GPU only (Phase 3, #824) and render groups (frame time below, #826).  The list as it was put: a smaller ring of ground round the view (-10 MB),
tighter object-loading margins (-15 MB), fewer rubble heaps (-15 MB), idle
armour sheets off the GPU (-30 MB GPU, a tiny upload on the next swing), music
streamed instead of decoded (-23 MB; the loop seam and the silent switch), the
gathering stand-ins -- the lumberjack, the cook and the fire-lighter, ~27 MB of
canvases baked on the loading screen and not on the GPU until you gather --
baked the first time you gather instead (-27 MB until then; the preloading law
says no, a hitch the first time), and
which song the Wheel plays: today the old town's after logging in on a quick
phone, the session track on a slow one and after any death, dungeon or farm
trip, with the old town's 40 MB held either way.  The session track always
(the old town's song on the farm only, decoded there and let go of on
leaving) frees the 40 MB for good; the old town's song always makes the
40 MB worth holding.

**Frame time, alongside** (measured first on a phone with `?perf=1`): the
per-frame QA probes only when testing, a Graphics cleared only when it drew,
monsters looked up by id in the network tick, buttons re-rendered only when
what they show changes, the black-screen check reading a 32 x 18 thumbnail;
then Pixi render groups for the world and the sheen without mid-frame target
switches.

| Item | Measured | Status |
|---|---|---|
| The black-screen watchdog's 32 x 18 sample shrunk on the GPU and read back without waiting (it copied the whole canvas out, 11 MB on a 3x phone, and waited for the frame, every 5 s) | ~10% of the main thread in a CPU profile (phone-sized page, CPU x4), walking or fighting -> not in the profile; 2.5 ms against 25 ms + the frame's wait (`mp-wdsample`) | #808, v2.3.3068 |
| Pixi's draw list rebuilt from the whole scene every frame (the owner's yes to render groups, 2026-10-06, a 1-px rounding shift accepted: #826, v2.3.3079 -- the world and the screen are render groups; the game held still in Brotown at CPU x4, ~2.6 -> ~0.15 ms a frame while the camera moves, ~2.7 -> ~1.7 ms with a structure change each frame; the same held frame differs in 0.008% of the screen's pixels in Brotown, 0.036% at a fight, `mp-rendergroups`).  Measured (a probe on every render group's `structureDidChange`, unminified main): EVERY frame rebuilds, standing in Brotown, walking and fighting -- ~25 places change the scene's structure each frame (effects added and removed, pooled sprites shown and hidden, shadows, ground pieces streaming in, the depth sort's moves between layers and its zIndex keys, the minimap's marks, the buildings' life, one Graphics in the ground that fails Pixi's check every frame) | 0.4-1.2 ms a frame on the test machine, ~600-900 containers walked (the HUD layer ~216 of them); ~5% of a fight's CPU profile at x4 | sized, not done.  Stopping the triggers one by one cannot win: any one left rebuilds everything.  Render groups would confine a rebuild to its own layer, but a group under the camera has the camera's move applied on the GPU in 32-bit floats -- the same picture, not the same bytes (an edge pixel can land on its neighbour's texel).  The safe part is the HUD layer as its own group (no camera, an identity transform: byte-identical) once the minimap stops toggling its marks every frame -- ~25-35% of each rebuild |

## All of it together (2026-10-06)

All eight -- #802, #803, #806, #808, #810, #812, #813 and #814 -- merged into
one local build (they merge in any order without a conflict) and measured with
`mp-memledger` (a phone, two laps of the eight lands, back in Brotown):

| | main (lap 1 -> lap 2) | all together (lap 1 -> lap 2) |
|---|---|---|
| 2D canvases | 122.9 -> 127.5 MB, growing ~5 MB a lap | 118.3 -> 118.3 MB, flat |
| the page's ArrayBuffers | 44.2 -> 49.1 MB, growing ~5 MB a lap | 10.9 -> 10.9 MB, flat |
| on arrival, ArrayBuffers | 43.4 MB | 10.1 MB |
| JS heap | 28.1 -> 29.5 MB | 28.0 -> 29.4 MB |
| asset cache | 172.1 -> 172.1 MB | 172.1 -> 172.1 MB |

...plus what these counters cannot see: the freed pictures #810 lets go of
(22-35 MB after a four-land tour), each black screen's recovery no longer
leaving ~50 MB of art behind (#802), the world map's canvases (#812), the
watchdog's 11 MB copy and frame wait every 5 s gone (#808), and the screen's
depth buffer (#814, ~11 MB of GPU memory on an iPhone).

Every PR's own scenario on that one build: `memledger` 7/7, `zombietex` 5/5
(0 MB held, against 22-35 on main), `groundcopy` 8/8 (the GPU's ground
identical to the worker's, to the pixel, none kept by the page), `wdsample`
8/8 (2.3 ms against 28.2 ms and the frame's wait), `burstfree` 6/6,
`worldmapfree` 5/5, `nodepth` 12/12, `bakeleak` 9/9 -- 61 of 61.  (Before
#813 the combined build's `zombietex` tripped once on a snowball burst drawn
after the frost art was freed: a race on main, fixed there.)

### And all twelve (2026-10-06, later)

With the owner's five yeses in -- #815, #822, #824 and #826 added to the eight
above -- one local build of all twelve on today's main (they merge in any
order) against today's main, `mp-memledger` again (a phone, arrival, then two
laps of the eight lands back to Brotown):

| | main (arrival -> lap 2) | all twelve (arrival -> lap 2) |
|---|---|---|
| 2D canvases | 118.0 -> 128.5 MB, growing | **66.2 -> 67.7 MB, flat** |
| decoded sound | 88.8 -> 90.9 MB | **26.0 -> 28.0 MB** (#815) |
| the page's ArrayBuffers | 43.5 -> 49.1 MB, growing | **10.2 -> 11.0 MB, flat** |
| JS heap | 21.8 -> 30.2 MB | 21.7 -> 30.1 MB |
| asset cache | 173.5 MB | **151.5 MB** |
| textures on the GPU | 103.8 -> 116.0 MB | 103.8 -> 129.5 MB |

What the page holds outside the GPU after the two laps -- canvases, sound,
buffers and heap -- is ~299 MB on main and ~137 MB with all twelve, ~160 MB
less, and the asset cache 22 MB less besides.  The GPU's count is ~13 MB
higher after the laps: the pictures #824 keeps on the chip only stay there
(the font's pages among them, which main's GPU collector would unload when
idle and upload again from the page's copy), where main holds them in the
page instead.  `memledger` 7/7 on the combined build.

## How we know it worked

Per PR: the numbers above, before and after, and its scenario.  In the field:
the crash feed (`/api/feedback/crashes`) -- black screens (`CONTEXT_LOST`,
`gl-rebuild`) and killed pages per hour of play, per version, now with the
memory snapshot each report carries.
