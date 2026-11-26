card: KEEP
branch: claude/plan-keep-2-plugin
prs: PR 1 (6740, the census; draft #2385), PR 2 (6741, the plugin; draft, on PR 1)
state: ready

## Done

- PR 1 (6740), the census: `tools/assets/versions.mjs`, its guard,
  `tools/qa/mp/mp-keepcensus.mjs`, `docs/plan/census/KEEP-requests.md`.
- PR 2 (6741), the build stamps every written-out address:
  `tools/assets/stamp.mjs` (syntax tree; CSS url(); index.html),
  `tools/assets/keepVersions.mjs` (the plugin, `...keepVersions()` in
  vite.config.js; the bytes win over a stale row; `KEEP_STAMP=0` is the
  build as it was), guard `tools/guards/asset-stamp.test.mjs` (the card's
  plants and seven break proofs). 1,167 addresses stamped, 108 left
  (alike 41, joined 64, query 2, no-file 1). An address any script builds,
  compares or derives is stamped nowhere (the first census found 4 icons
  downloaded twice without that rule). Census, same base, before
  (KEEP_STAMP=0) and after, test box: bare 315 -> 128, table 0 -> 279,
  hand 1,304 -> 1,185; no file asked more often. Kept folders after:
  `/sprites` 22/961/8, `/ui` 57/61/31, `/sfx` 95/0/1, `/icons` 89/125/0,
  `/world/objects` 0/1/88 (table/hand/bare). Scripts +10.7 KB (index
  +10.1 KB); no table reaches the page. playable, memory-budget (heap
  41.3 of 42.5 MB), keepcensus green; precheck 0 FAIL.

## Next

- PR 3 (6742): the built addresses, a family a PR; first `traits-frames`
  (285, all TRAIT_VER), or `/sfx` (1 bare from 0: the monster death cut).

## Found

- 20 requests a load for trait frames that do not ship (PR 1's finding).
- 161 requests read `x?v=<its own>?v=<key>`: a loader joins its hand key
  to a stamped address (npcArtUrl, ITEMS_V, p256Twin, lookPalette): the
  census lists them by shape; each goes with its family's PR 3.

## Needs

- Nothing.
