card: KEEP
branch: claude/plan-keep-3-sfx
prs: PR 1 (6740, the census; draft #2385), PR 2 (6741, the plugin; draft #2388, on PR 1), PR 3a (6742, the sounds; draft, on PR 2)
state: ready

## Done

- PR 1 (6740), the census: `tools/assets/versions.mjs`, its guard,
  `tools/qa/mp/mp-keepcensus.mjs`, `docs/plan/census/KEEP-requests.md`.
- PR 2 (6741), the build stamps every written-out address:
  `tools/assets/stamp.mjs`, `keepVersions.mjs` (the plugin), guard
  `asset-stamp.test.mjs`; 1,167 stamped, 108 left; census bare 315 -> 128;
  scripts +10.7 KB; heap 41.3 of 42.5 MB; precheck 0 FAIL.
- PR 3a (6742), the sounds: `src/game/assetUrl.js` (one function; its
  table `src/game/assetTable.js` is written by the build's `load` hook,
  97 `/sfx` rows, 4.2 KB of script, about 0.01 MB of heap; committed
  empty, so node and dev ask as written). No `/sfx` address is built from
  parts; the one bare request was a whole literal with a space (Monster
  death-bony.mp3), now `%20`, which the build stamps. `loadSample` calls
  assetUrl (a built one later). `/sfx/*` kept a year in `_headers`. Guard
  `tools/guards/keep-sfx.test.mjs`. Census: `/sfx` 96/0/0; bare 128 -> 127.

## Next

- PR 3b (6743): the next family. `/icons` is 125 hand, 0 bare (the item
  icons' ITEMS_V); traits-frames (285) waits on entityRenderer.js (LOAD).

## Found

- 20 requests a load for trait frames that do not ship (PR 1's finding).
- 161 requests read `x?v=<its own>?v=<key>`: a loader joins its hand key
  to a stamped address (npcArtUrl, ITEMS_V, p256Twin, lookPalette): the
  census lists them by shape; each goes with its family's PR 3.

## Needs

- Nothing.
