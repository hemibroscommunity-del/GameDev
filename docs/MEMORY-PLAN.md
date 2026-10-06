# Memory plan: what the phone holds, what leaks, and the order of the fixes (v2.3.3061)

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
- `mp-memledger` (v2.3.3061): everything the two above cannot see -- decoded
  sound, every 2D canvas alive (tracked from its creation), the main thread's
  and each worker's JS heap and ArrayBuffers -- and a tour of the eight lands,
  twice, to see what does not come back.
- `mp-bakeleak` (v2.3.3060): three renderer rebuilds and eight designer strokes.
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
  visit, which plays the old town's song.  Letting it go was tried
  (v2.3.3062, not shipped): every way to do it changes what you hear
  somewhere -- a gap at the intro's end, or on the next farm visit, while the
  song is decoded again -- so it is the owner's call (Phase 4).
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
| The plan, this file | v2.3.3061 |
| `mp-memledger`: sound, canvases by maker, heaps, the eight-land tour | v2.3.3061 |
| Crash reports carry a memory snapshot and the rebuild count | v2.3.3061 |

**Phase 1 -- stop the leaks** (the biggest effect on black screens).

| Item | Measured | Status |
|---|---|---|
| A rebuild lets go of the old renderer: listeners, bakes, ground, Pixi's render-target listeners | cache flat over three rebuilds (was 172 -> 327 MB) | #802, v2.3.3060 |
| A re-bake lets go of what it replaced (`releaseCanvasSource`, every site) | eight strokes +0.4 MB of cache (was +92) | #802, v2.3.3060 |
| The ~5 MB-a-lap canvas growth on the land tour | flat after #802 (monster recolours released properly) | #802 |
| A destroyed texture lets go of its picture even where Pixi still points at it (pooled batches, hidden sprites' draw data) | after a tour of four lands: 22-35 MB of freed object sheets, canvases and ground held -> 0 (`mp-zombietex`) | #810, v2.3.3065 |
| Freed on close: the world map's canvas (11.3 MB an open at 3x, held until the next GC) | five opens: 3 dead canvases, 31.4 MB -> 0 (`mp-worldmapfree`) | #812, v2.3.3066 |
| Freed on close: the loading clip's warm-up copy | ~2-3 MB; rubble's scratch canvases are locals the GC takes | |
| A snowball burst playing when the frost art is handed back (found on the way: app.render threw until the burst ended) | retired before the frame draws (`mp-burstfree`) | #813, v2.3.3067 |

**Phase 2 -- stop paying for what nobody sees or hears.**

| Item | Saves | Status |
|---|---|---|
| Decoded sounds kept across the audio rebuild after an app switch | a 50-90 MB spike per return | needs an iPhone: the spec lets a buffer outlive its context (`_rebuildContext` drops them as "decoded against the dead context"), but this is the path that brings sound back after another app took it, and only a real iPhone can say a kept buffer still plays there |
| The ground's CPU copy dropped once uploaded (re-laid after a graphics reset) | 33 MB standing, 52 after a walk, 62 after a rebuild (page ArrayBuffers 53 -> 20 MB) | #806, v2.3.3063 |
| The damage-number font's atlas trimmed | 5-10 MB | not a clean win: its letters draw words ("Blocked!", "+30 XP"), so a smaller set sends some to the slower canvas text; its canvases are what a rebuilt renderer uploads it from |
| Wheel objects loaded by their own size, not the largest building's; their sheets cached for good | 4 MB, fewer downloads | |
| Small: the chopper's spare copy, the worker's caches, sounds decoded twice, idle bake worker | 25-35 MB | |

**Phase 3 -- bigger, still pixel-identical** (each its own PR).

| Item | Saves |
|---|---|
| Canvas art made purgeable (compressed images the iPhone can drop and re-decode) | up to ~70 MB |
| Character art kept on the GPU only, re-baked after a black screen's rebuild (measured 2026-10-06: of 540 canvases, 127 are copies of a texture already uploaded -- 45.6 MB, mostly the gear sheets, the damage font's pages and the skill poses, all module caches a rebuilt renderer re-uploads FROM the canvas; the effects renderer's own big strips are not on the GPU until first drawn).  Pixel-identical by construction (the same bakes run again), but it changes the black-screen recovery path, so it is planned with the owner first | ~46 MB of page memory |
| Skill figures baked for what you wear only, the other in the background | 16-19 MB |
| Palette textures for the ground and the Wheel's objects | ~55 MB |
| The unused depth buffer off | 8-19 MB (to check on a phone) |

**Phase 4 -- the owner's call** (each trades something a player might notice;
none is done without a yes): a smaller ring of ground round the view (-10 MB),
tighter object-loading margins (-15 MB), fewer rubble heaps (-15 MB), idle
armour sheets off the GPU (-30 MB GPU, a tiny upload on the next swing), music
streamed instead of decoded (-23 MB; the loop seam and the silent switch), and
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
| The black-screen watchdog's 32 x 18 sample shrunk on the GPU and read back without waiting (it copied the whole canvas out, 11 MB on a 3x phone, and waited for the frame, every 5 s) | ~10% of the main thread in a CPU profile (phone-sized page, CPU x4), walking or fighting -> not in the profile; 2.5 ms against 25 ms + the frame's wait (`mp-wdsample`) | #808, v2.3.3064 |

## All of it together (2026-10-06)

#802, #803, #806, #808 and #810 merged into one local build and measured
with `mp-memledger` (a phone, two laps of the eight lands, back in Brotown):

| | main (lap 1 -> lap 2) | all together (lap 1 -> lap 2) |
|---|---|---|
| 2D canvases | 122.9 -> 127.5 MB, growing ~5 MB a lap | 118.3 -> 118.3 MB, flat |
| the page's ArrayBuffers | 44.2 -> 49.1 MB, growing ~5 MB a lap | 10.9 -> 10.9 MB, flat |
| on arrival, ArrayBuffers | 43.4 MB | 10.1 MB |
| JS heap | 28.1 -> 29.5 MB | 27.9 -> 29.4 MB |
| asset cache | 172.1 -> 172.1 MB | 172.1 -> 172.1 MB |

...plus what these counters cannot see: the freed pictures #810 lets go of
(22-35 MB after a four-land tour), each black screen's recovery no longer
leaving ~50 MB of art behind (#802), and the watchdog's 11 MB copy and frame
wait every 5 s gone (#808).  On the combined build `groundcopy`, `wdsample`
and `bakeleak` pass, and `zombietex`'s own checks do; its render check
tripped once, on a snowball burst drawn after the frost art was freed -- a
race on main, fixed in #813.

## How we know it worked

Per PR: the numbers above, before and after, and its scenario.  In the field:
the crash feed (`/api/feedback/crashes`) -- black screens (`CONTEXT_LOST`,
`gl-rebuild`) and killed pages per hour of play, per version, now with the
memory snapshot each report carries.
