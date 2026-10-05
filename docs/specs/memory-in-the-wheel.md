# What the Wheel holds in memory, and the first quick win (v2.3.3037)

Owner, 2026-10-05: *"Also are there any quick wins when it comes to freeing up
memory? It happens too often that the screen goes black."*

## How it is measured

`node tools/qa/mp/run.mjs gpuaudit` (`tools/qa/mp/mp-gpuaudit.mjs`): a phone
(390 x 844, 3x) logs in to the Wheel, stands, walks to the Flame Fields' goblins
and dies, back through today's town. At each stop it lists:

- **the GPU**: everything the renderer has uploaded (`window.__btGpuTex()`,
  `pixiApp.js`: `GlTextureSystem.managedTextures`), grouped by folder, as a
  picture from a file, a canvas, a render texture or a buffer, with its decoded
  size (x 4/3 with mipmaps) and how long since it was drawn;
- **the GPU's own count** and its **peak** since the last stop (a shim on
  WebGL's calls, mp-wheelmem's): the way in, and the trip back from a death;
- **the asset cache** (`__btTex`, decoded sizes: the number iPhone Safari dies
  at, ~250 MB) and its peak, sampled every 250 ms;
- **what the cache holds that the GPU does not**: decoded, never drawn.

`QA_GA_THUMBS=N` writes a thumbnail of each of the N biggest canvases with no
label (`out/gpuaudit-thumb-<i>.png`): a canvas made in code has no file name,
so its picture is its name. `QA_GA_NODIE=1` skips the death.

## What it found (main, v2.3.3032)

| Where | GPU (textures) | Asset cache (decoded) |
|---|---|---|
| on arrival in the Wheel's Brotown | 90 MB, **peak 114** on the way in | 172 MB, **peak 184** |
| at the Flame Fields' goblins | 114 MB | 188 MB, peak 197 |
| back from a death | 94 MB, **peak 117** on the trip | 166 MB, peak 188 |

What is in it, on arrival:

- **the Wheel's ground pieces**: 54 buffers of 402 x 402, 33.5 MB on the GPU
  (and their pixels kept to restore them after a graphics reset);
- **your gear, a sheet per pose**: steel greaves 13.7 MB, steel plate 12.6,
  the t-shirt 8.5, the full set 3.3, uploaded behind the loading screen so the
  first swing, roll or cook never hitches, most of them idle;
- **the Wheel's objects**: its sprite sheets near you, ~10 MB drawn, 31 MB in
  the cache;
- **the damage numbers' font**: six 512 x 512 pages of glyphs, 8 MB with
  mipmaps (the last page holds ". !" alone);
- in the cache and **never on the GPU, 128 MB**, most of it art preloaded so
  its first use does not hitch: the life skills' figures recoloured to your
  skin (the cook's two strips 17 MB, the chopper's four 15 MB, the
  fire-lighter 6 MB), the Wheel's object sheets loaded ahead of you (~20 MB),
  the nodes' pictures, the slime, the bow's blast.

## The quick win: today's town is a stop, so its art is not loaded

Since v2.3.2990 everyone is taken from today's town down its stairs into the
Wheel, on the way in, after a death and out of a dungeon or the farm, under one
veil that never lifts on today's town (v2.3.3025). Yet every one of those stops
loaded all of today's town's art for nobody to see -- its NPCs and buildings
(35 MB decoded, `loadTownScenery`) and its map (11.3 MB, `/maps/town_v17.webp`,
the largest picture in the game) -- and freed it a beat after the stairs.

Now none of it is loaded while the trip is wanted:

- `wheelHome.js` `townSkippedOnTheWay()`: this tab goes to the Wheel (the trial
  flag, not `?nospawn`, not `?wayback`) -- static, so the loading screen can ask;
- the loading screen skips town's scenery (`preloadAnimations.js`) and map
  (`pixiRenderer.js` `preloadPlayerAssets`), and so does the login splash, which
  warmed the map while you typed your name (`characterCreatorEffects.js`
  `wireSplashPrewarm`: the last loader on the way in, found by the audit's
  check below);
- `zoneTransitions.js` `syncTownScenery` does not load it for the stop;
- `tileRenderer.js` puts off the map its race fix used to fetch on entering
  town, and fetches it in `update()` if town is to be seen after all.

If the trip lets go (`TRIP_VEIL_MS`, a worker that never answers), today's town
loads behind its own veil exactly as before; `?trial=off`, `?nospawn` and
`?wayback` are untouched. The way TO the farm still loads it (that stop is not
the Wheel's trip); the way back is the trip.

`mp-gpuaudit` holds it: the cache is sampled every 250 ms for today's town's
map (`/maps/town_v17.webp`), and the way in and a death's trip must never hold
it. On main both checks fail.

Measured (the same run, before and after):

| | Before | After |
|---|---|---|
| GPU peak on the way in | 114.3-115.5 MB | **88 MB**, the level it settles at: no spike |
| asset cache peak on the way in | 184.1 MB | **172 MB** |
| GPU peak on a death's trip | 116.6-117.1 MB | **111.7-112.9 MB** (the fight's own level) |

## Bigger wins, not taken (each trades something)

- **The skill figures for what you wear.** The cook's and chopper's strips are
  baked twice, with legs and without (for leg armour), and the chopper's twice
  again, flipped: ~16 MB could go by baking only what you wear and the other in
  the background after an equip change. Other players' cooks share the bake, so
  it needs care.
- **Idle gear sheets off the GPU.** ~30 MB of your gear's per-pose sheets sit on
  the GPU unused; letting the renderer drop them when idle would re-upload one
  on its next use: a small hitch on the first swing after a while, which the
  animation-preloading law forbids.
- **The Wheel's objects loaded nearer you.** `wheelObjects.js` loads a sheet 480
  game px past the view and keeps it until nothing on it is within 1,000;
  tighter margins risk a building appearing as you walk up.
- **The ground's apron and ring.** 54 pieces of 402 x 402; a smaller ring risks
  a hole at the edge of the screen while sprinting.
