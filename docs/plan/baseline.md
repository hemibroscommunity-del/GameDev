# The baseline (v2.3.5024)

What the test box measured before the grand plan's work began, so a later
number has something to be compared with. Card W's PR 4.

- **The commit:** `main` at `2d4138e` (v2.3.5020, the grand plan). Measured
  on wave 0's branch, whose changes are tools and documents only: no file
  under `src/`, `server/src/` or `public/` differs from that commit.
- **The box:** this repository's cloud test box, 4 processors, software
  drawing (no graphics chip), Chromium headless. **Its own numbers.** A
  phone draws many times faster; compare a later run on this box with these,
  never with a phone.
- **Never the Cloudflare lab**: CLAUDE.md §4 forbids running it from a
  branch.
- Measured 2026-11-13.

## The memory check (`mp-membudget`), whole

`node tools/qa/mp/run.mjs membudget`: a phone in BroTown, three trips to a
fight at the Flame Fields and home. 11 of 11 passed, 350 s.

| Line | Highest | Where | Budget |
|---|---|---|---|
| artCache (art loaded from files) | 48.7 MB | trip 1, the fight | 112 MB |
| gpu (textures on the graphics chip) | 72.9 MB | trip 3, home again | 115 MB |
| canvases (pictures the game draws) | 15.1 MB | trip 2, the fight | 56 MB |
| sound (decoded) | 17.9 MB | BroTown, on arrival | 22 MB |
| heap (the page's objects) | 35.4 MB | trip 2, home again | 38.5 MB |
| buffers (raw data) | 21.3 MB | trip 2, home again | 22 MB |
| workers | 20.7 MB | trip 3, the fight | 36 MB |

The third trip ended where the second did (gpu +0.9 MB, heap -0.3 MB, the
rest +0). Closest to their lines: buffers (0.7 MB of room) and heap (3.1).

## What holds the page (`mp-heldsweep`), a sample

A sample, as CLAUDE.md §6 asks for a run of more than about 30 minutes: three
stations of the tour, once, on the unminified build
(`docs/specs/held-sweep.md`):

```
NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
BT_HS_STATIONS=stand,town,fight QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep
```

5 of 5 passed, 114 s: nothing new over its line, nothing on the debt list
over its own (13 rows listed, 0 over).

| Station | Outside the frame | Holds of 4 ms or more | Longest | Frames | Middle frame (game's code) | Frames over 16 ms |
|---|---|---|---|---|---|---|
| standing in the town (11 s) | 102 ms | 7 | 9.9 ms | 42 | 4 ms | 0 |
| the ride through the town (41 s) | 764 ms | 57 | 16.4 ms | 247 | 5.8 ms | 7 |
| a fight (26 s) | 197 ms | 4 | 27.7 ms (the garbage collector) | 96 | 4 ms | 2 |

The worst holds across the three, longest first: the frame itself 33.5 ms
(9 times; town, fight); the garbage collector 27.7 ms (8 times);
`retintPalette` 11.3 ms (2, town); a monster strip's texture made 9.7 ms (11,
town). Everything else under 9 ms.

**Note:** the fight station counted 0 swings in this run (its own line says
`{"swings":0}`): it measured the fight's place, not a fight. A later
comparison of the fight station should check its swing count first.

### Not run: the whole tour, and the crowd tour

The whole sweep (every station, about 12 minutes) and the crowd tour
(`mp-crowdsweep`, about 15 minutes) were left out of this sample. Either can
be added here by a later run of the same commands with no
`BT_HS_STATIONS`; say so if you want them.
