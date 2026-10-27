# The fire-lighter's log is wood (v2.3.3660)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

`mp-ghostaudit` lit a fire in pink trousers, and the bro knelt at a **hot pink
log**. The log was not his trousers. It is pink for everyone who lights a fire.

## Why

The skill animations were made holding a flat magenta "key" where the tool or
prop goes, so it can be found and coloured afterwards. The lumberjack's axe,
the angler's rod and the fire-lighter's log all carry it
(`firemaking-strip.webp`: about 10,000 px of the log in each of its eight
384 x 512 frames).

v2.3.2761 gave the axe copper and pine and the rod pine, at load
(`src/rendering/toolRecolor.js`). It left the log on purpose, because "firemaking
is being rebuilt as code-drawn fire in another session". That rebuild drew the
campfire that burns **after** the light. The strip kept its painted log, so for
the half second of every light the log under the fire was magenta.

## The fix

`effectsRenderer.js` `_fireLogToBark` gives the log `TOOL_SPECS.log`'s bark,
which was ready for it. Each key pixel takes its place on the bark's ramp by its
brightness, so the painted shading, the grain and the rings at the end stay where
the artist put them.

- **After the skin, the trousers and the boots are painted, and only where the
  file has the key.** The key test is a range of hues, and trousers the bake has
  painted can fall inside it: pink (214, 112, 168) is hue 327. So, as the rod
  does since v2.3.2854, the log is found in the file and the canvas is coloured
  only there. The key lies in rows 356-464 of every frame (measured over all
  eight), so only a band round those rows is read.
- **Both fire-lighters get it:** yours, which every other player in your colours
  is drawn from, and the one baked for another player's colours on your screen
  (`_peerFigFrames`). The bake for a peer's drawings alone throws its figure away,
  so it skips the log.
- **The skin probe** (`_probeStandInSkin`, read by `mp-standinskin`) measures the
  figure before the log turns to wood. The bark's middle tones pass its skin test.

`?firelog=0` keeps the magenta, for a test's "before". `window.__btFireLog()`
says whether the fix is on and how many pixels the last bake made wood (76,540
across the strip).

## The test: `mp-firelog`

Three phones in the world:

- **Pink** wears pink trousers and blue boots and lights a fire. Every one of the
  eight frames of the fire-lighter is read as the renderer holds it, against the
  same frame of the shipped strip.
- **Before** wears the same colours with `?firelog=0`.
- **Watcher**, in the default colours, stands near Pink and reads Pink's
  fire-lighter. That figure is baked on the watcher's screen in Pink's colours.

The checks:

- Pink has no key colour on any frame.
- Pink's log is there, in bark: at least 90% of the file's key pixels are warm
  browns.
- Before's log is magenta on every frame (5,000 px or more), so the test can see
  the fault.
- Every pixel the file does not key is the same on Pink and Before. Only the log
  changed, and the pink trousers kept their pink.
- `__btFireLog` says Pink made the log wood and Before did not.
- The Watcher's copy of Pink has no key colour either.
- There are no page errors.

Its run, 12 checks of 12:

| frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| the file's key (the log), px | 10,527 | 10,456 | 10,086 | 10,178 | 8,706 | 8,554 | 9,027 | 9,117 |
| still magenta, Pink | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| still magenta, Before (`?firelog=0`) | 10,527 | 10,456 | 10,086 | 10,178 | 8,706 | 8,554 | 9,026 | 9,117 |
| in bark, Pink | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

- Every pixel the file does not key was the same on both pages, on all eight
  frames, so the pink trousers kept their pink.
- `__btFireLog` said 76,650 px made wood.
- The watcher's copy of Pink's fire-lighter, read on three frames, had no
  magenta either.

The first run's faults were the test's. It counted Pink's pink trousers as
magenta (they sit in the key's hue window), and the "before" page was a guest,
whose page reloads into `?guest=1` on the way in and lost `firelog=0`.

## Not changed

The ghost audit also showed a thin line of the trousers at the fire-lighter's
waist between the iron plate and the greaves, and a sliver of boot behind the
greaves on the standing frame. These come from how the garments are laid over
this one figure, and are left as they are. See `docs/specs/ghost-audit.md`.
