card: KEEP
branch: claude/plan-keep-4-icons
prs: PR 1 (6740; #2385), PR 2 (6741; #2388), PR 3a (6742, sounds; #2389), PR 3b (6743, icons; draft, on #2389)
state: ready

## Done

- PR 1 (6740): the census (`versions.mjs`, `mp-keepcensus`, KEEP-requests.md).
- PR 2 (6741): the build stamps written-out addresses (`stamp.mjs`,
  `keepVersions.mjs`); census bare 315 -> 128; heap 41.3 of 42.5 MB.
- PR 3a (6742): the sounds: `assetUrl` + its build-written table; `/sfx/*`
  kept a year; guard `keep-sfx.test.mjs`; `/sfx` 96/0/0.
- PR 3b (6743), the icons: `/icons/` in PAGE_FAMILIES (679 rows, 30.1 KB
  of script, +25.9); every built `/icons` address calls assetUrl; hand keys
  gone: ITEMS_V (5 files, 2 lines left), ICON_V (2), FARM_ICON_V,
  FOOD_ICON_V, FISH_PIC_V, IV, smallIcons V, BADGE_V, BenchParts ITEMS_V;
  p256Twin asks an /icons twin at its own version; metalIconPath drops a
  stamped query. Guard keep-sfx takes families (LEFT list). NO `_headers`
  block: 10 hand requests are pinned by server tests' text, and the HUD
  bars' address is built in entityRenderer.js (LOAD's).
- PR 3b's mend (sitting 70's hold): main merged; UI2's two addresses
  stamped (UiKitPage's kit cells, GearPanels' empty-slot ghost, its hand
  `?v=2.3.4199` gone); keep-sfx whole green, its plant red.

## Next

- `/icons/*` block: after LOAD part 2 moves HUD_BAR_VER, and a server-test
  PR unpins owner-icons 8g, bag-icons 2a, 5c, achievements 9a, 9f.

## Found

- 20 requests a load for trait frames that do not ship (PR 1's finding).
- 161 requests read `x?v=<its own>?v=<key>`: a loader joins its hand key
  to a stamped address (npcArtUrl, ITEMS_V, p256Twin, lookPalette): the
  census lists them by shape; each goes with its family's PR 3.

## Needs

- The orchestrator's call: a PR of server tests' text (it deploys the
  worker) so the icons' last hand key and the `/icons/*` block can land.
