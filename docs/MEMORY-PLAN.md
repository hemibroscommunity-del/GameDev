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

- **The old town's music** (`village.mp3`, 40 MB decoded) is decoded for the
  hidden stop in today's town on the way in, and kept: the Wheel has no track
  of its own, so it never plays and is never let go of.
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
| Freed on close: the world map's canvas (~10 MB an open), rubble's scratch canvases, finished videos | | next |

**Phase 2 -- stop paying for what nobody sees or hears.**

| Item | Saves | Status |
|---|---|---|
| The town's music not decoded for the hidden stop; tracks dropped where none plays | 40 MB (43 on an iPhone, which decodes at 48 kHz) | next |
| Decoded sounds kept across the audio rebuild after an app switch | a 50-90 MB spike per return | |
| The ground's CPU copy dropped once uploaded (re-laid after a graphics reset) | 34 MB, 56 sprinting | |
| The damage-number font's atlas trimmed | 5-10 MB | |
| Wheel objects loaded by their own size, not the largest building's; their sheets cached for good | 4 MB, fewer downloads | |
| Small: the chopper's spare copy, the worker's caches, sounds decoded twice, idle bake worker | 25-35 MB | |

**Phase 3 -- bigger, still pixel-identical** (each its own PR).

| Item | Saves |
|---|---|
| Canvas art made purgeable (compressed images the iPhone can drop and re-decode) | up to ~70 MB |
| Skill figures baked for what you wear only, the other in the background | 16-19 MB |
| Palette textures for the ground and the Wheel's objects | ~55 MB |
| The unused depth buffer off | 8-19 MB (to check on a phone) |

**Phase 4 -- the owner's call** (each trades something a player might notice;
none is done without a yes): a smaller ring of ground round the view (-10 MB),
tighter object-loading margins (-15 MB), fewer rubble heaps (-15 MB), idle
armour sheets off the GPU (-30 MB GPU, a tiny upload on the next swing), music
streamed instead of decoded (-23 MB; the loop seam and the silent switch).

**Frame time, alongside** (measured first on a phone with `?perf=1`): the
per-frame QA probes only when testing, a Graphics cleared only when it drew,
monsters looked up by id in the network tick, buttons re-rendered only when
what they show changes, the black-screen check reading a 32 x 18 thumbnail;
then Pixi render groups for the world and the sheen without mid-frame target
switches.

## How we know it worked

Per PR: the numbers above, before and after, and its scenario.  In the field:
the crash feed (`/api/feedback/crashes`) -- black screens (`CONTEXT_LOST`,
`gl-rebuild`) and killed pages per hour of play, per version, now with the
memory snapshot each report carries.
