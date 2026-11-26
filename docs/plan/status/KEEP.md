card: KEEP
branch: claude/plan-keep-5-objects
prs: PR 1 (6740; #2385), PR 2 (6741; #2388), PR 3a (6742, sounds; #2389), PR 3b (6743, icons; #2392), PR 3c (6744, objects; draft, on #2392)
state: ready

## Done

- PR 1 (6740): the census (`versions.mjs`, `mp-keepcensus`, KEEP-requests.md).
- PR 2 (6741): the build stamps written-out addresses; bare 315 -> 128.
- PR 3a (6742): the sounds: `assetUrl` + its table; `/sfx/*` kept a year.
- PR 3b (6743): the icons through assetUrl (679 rows, 30.1 KB); no block
  (10 hand requests pinned by server tests' text; HUD bars are LOAD's).
- PR 3c (6744), the objects: in PAGE_FAMILIES (760 rows, 33.7 KB, +3.6);
  each sheet AND its page at its own version (Pixi copies a sheet's query
  onto its page: the page posted to png8Worker, `data.texture` to Pixi,
  sheetPage.js); the farm's copy `?v=<10>&farm=1`; the manifest posted to
  the ground worker. Census 0/1/88 -> 89/0/0; `/world/objects/*` kept.

## Next

- PR 3c's last phone runs on its final code: a helper's (playable,
  membudget, keepcensus, pagebases, palette, farmpalette).
- `/icons/*` block: after LOAD part 2 moves HUD_BAR_VER, and a server-test
  PR unpins owner-icons 8g, bag-icons 2a, 5c, achievements 9a, 9f.
- The next family (my pick): `/ui`'s quest pictures (ui-quest, 31 bare:
  questArt.jsx, questArtPreload.js, ownerIcons.js, townBoard.js; none held).
  /ui's block also waits on ui-pad (18 hand: padSkin, PadHousings: PAD's).

## Found

- 20 requests a load for trait frames that do not ship (PR 1's finding).
- picture-door's RAW skips `Assets.loader.load(` (sheetPage.js: the page
  load Pixi's sheet loader made inside before, under its sheet's row).
- held-sweep.test 3c pins `w.postMessage({ id, url, bases: _basesWay() })`:
  the page's address goes first, as `{ pageOf: id, image }` (png8Worker).

## Needs

- The orchestrator's call: a PR of server tests' text (it deploys the
  worker) so the icons' last hand key and the `/icons/*` block can land.
