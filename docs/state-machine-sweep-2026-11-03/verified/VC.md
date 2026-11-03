# VC · Cluster VC: art loads that never retry, pictures kept too long, and the owner's studios that lock up
Three parts, one section each (VC-1, VC-2, VC-3). Read-only verification, no tests run.
Totals over the 25 findings: 21 confirmed, 4 plausible, 0 refuted. Overall: needs-thought, severity medium.

====================================================================
# VC-1 · Art loads that fail or hang once and are never asked again
- Verdict: needs-thought
- Severity: medium (a phone on a bad connection loses armour poses, capes, shields, weapon icons, badges or the colour-number look for the whole visit; a purely visual loss, but the owner has reported "things go missing" before)
- Who can trigger it: honest player on a flaky connection (a failed or stalled fetch while loading, or a Pages deploy mid-session). Nothing needs a modified phone.
- Summary: Several pictures are asked for once. If that one request fails, the game remembers the failure and never asks again until the page is reloaded. A few others are asked with no time limit, so a request that just goes quiet holds up the loading screen to its 20 s cap and is never retried. The head pieces got retries and time limits in v2.3.3689 (TRAPS 257); these loaders were left out.
- Key files: src/rendering/systems/effectsRenderer.js:14715-14762, src/rendering/lookPalette.js:235-270, src/rendering/capeSprites.js:79-124, src/rendering/systems/entityRenderer.js:1297-1337, src/rendering/systems/entityRenderer.js:5051-5075, src/rendering/picsOnce.js:171-200

## The machine
- Entity, and where its state lives: one memo per art slot, held in module variables: `_bodyDataPromise` (entityRenderer.js:1295), `_hairMaskCache[hat].tex/retryAt` (5024), `_broBadgeTex`/`_smallTexHeld`/`_pinTexHeld` (7356, 7373, 7407), `_gearStrips[key]` (effectsRenderer.js:14675), `_sets[name].loading` (lookPalette.js:236), `_loading[key]` in capeSprites.js:41, `loadPromise` in weaponSprites.js:172 / shieldSprites.js:23, `_done` in npcSprites.js:44, `_bakeBusy` (entityRenderer.js:3391).
- States: unasked, loading, held; plus a failure state that differs per slot: retried-later (body data, hair mask, pet sheet), failed-for-the-page (gear strips, look sets, capes, weapons, shields, NPC portraits, plate icons), stuck-loading (no timeout, never settles).
- Moves:
  - first ask: unasked → loading (each file above)
  - fetch rejects, body data: loading → failed-round → +20 s → next round (entityRenderer.js:1331-1334)
  - fetch rejects, hair mask: → retryAt 5/10/20/40/60 s, up to 10 rounds (entityRenderer.js:5069-5073)
  - fetch rejects, gear strip: loading → `[]` and nothing asks again (effectsRenderer.js:14761)
  - fetch rejects, look set: `s.loading` stays a resolved `false` for ever (lookPalette.js:236-238, 260-268)
  - fetch rejects, cape/weapon/shield/NPC: memo kept, slot empty for ever (capeSprites.js:92 and 84; weaponSprites.js:180-182; shieldSprites.js:30-32; npcSprites.js:204)
  - fetch rejects, pet sheet: memo cleared, so the NEXT run of the loading screen asks again (petSprites.js:28)
  - fetch never answers: loading → (no edge) (body data 1305, hair mask 5067, plate icons 7358/7375/7409, look sets 239, picsOnce restore 184)
- Diagram edges:
  - `Unasked --first ask--> Loading`
  - `Loading --file arrives--> Held`
  - `Loading --fetch rejects (body data, hair mask, pet)--> Retry-later --timer--> Loading`
  - `Loading --fetch rejects (gear strip, look set, cape, weapon, shield, icon)--> Failed-for-page`
  - `Failed-for-page --anything--> Loading` !! (missing edge)
  - `Loading --request goes quiet (body data, hair mask, icons, look set)--> Stuck` !! (no timeout)
  - `Stuck --20 s cap--> Loading screen lifts, slot stays empty`
  - `Held (released copy) --restore fails--> Blank` !! (picsOnce)

## Concerns, verified
- [CONFIRMED] R1-2: body placement tables fetch has no time limit, so one stalled request pins `_bodyDataPromise` for the page. Evidence: entityRenderer.js:1305 (bare `fetch`), 1327-1334 (re-arm only runs in `.then` after `allSettled`), compare the meta.json's 15 s abort at 1094-1096. How checked: read both loaders side by side; TRAPS 257 text says "the body's placement tables ... start another round later" and requires a timeout on every load. The stall itself needs a dropped connection (not measured). Sub-point "rounds uncapped" also true (1333) and harmless. Docs: TRAPS 257 rule; retry-looks.md "Limit".
- [CONFIRMED] R1-9: hair-mask `Assets.load` has no time limit, so a stalled facing is never retried. Evidence: entityRenderer.js:5066-5073 (retry scheduled only in `.catch`), 5913-5914 (loading screen waits on `e.ready`). How checked: read the loader; the header at 5051-5063 says the rounds were added for REJECTED loads only; it postdates 257 (v2.3.3865 vs v2.3.3689) yet takes no timeout. Impact: hair draws unclipped through a hat, cosmetic. Docs: TRAPS 257; retry-looks.md row 42.
- [PLAUSIBLE] R1-4: a job that never settles keeps `_bakeBusy` at 1 for the page, so peers, prewarm and look armour wait; only the local path has the 1 s patience. Evidence: entityRenderer.js:3422-3427, 3456-3462, 3774, no `onmessageerror` (3329-3342). Unproven link: that a worker reply can actually be lost or `createImageBitmap` hang (the worker catches its own errors, `onerror` already resolves all pending). Settle by measurement: mp-longplay (long session, would show bakes stalling) or a new probe forcing the worker to drop a reply; no existing test injects that. The hidden-tab "late" misfire (second concern) is also plausible, depends on browser throttling.
- [PLAUSIBLE] R1-7: the equip re-prewarm latch `_equipPrewarmRunning` never clears if one bake never settles. Evidence: entityRenderer.js:4381, 4398, 4584-4593. Depends entirely on R1-4's unproven hang. Dead `prewarmProgress` (4016, 4126) is true and harmless (IntroVideo.jsx:17-18 says the poll was removed). Settle with the same probe as R1-4.
- [PLAUSIBLE] R1-15: a failed or stalled load of the Bro badge, party badge, skull, talk bubble is never asked again. Evidence: entityRenderer.js:7357-7358, 7374-7376 (failure becomes `null`), 7408-7410; lookups only read `Assets.cache` (7362, 7380). Unproven link: Pixi's own loader may retry before it rejects (this repo sets no `retryCount`/`loadOptions`, grep empty, and Pixi's source is not installed). The skull-bound-only-on-flip point is true as written (13543-13546, 16732-16735) but needs a texture to arrive after the flip. Settle: a QA run that blocks `/icons/ui/*` once; none exists (retry-looks.md does not list these loaders).
- [CONFIRMED] R4-18: a gear strip whose single image fetch errors is stored as `[]` and never asked again. Evidence: effectsRenderer.js:14761 (`.catch` sets `[]`), 14768 (`!e.length` returns no frame); dressed shirt 14888. How checked: read the loader; it uses a bare `new Image()` (14712), not `loadCroppedStrip`, so it also has no timeout (a stall leaves it `'loading'`, which `_gearStripPending` only waits for a limit). Walking figure keeps the armour (different loader). Leak sub-point: `_fxPreload.push(_p)` at 14762 and 14891 grows for the page, true but only resolved promises (small). Docs: none.
- [PLAUSIBLE] R6-16: a failed restore of a released picture leaves its chip copy blank for good. Evidence: picsOnce.js:171-200 (failure resolves false, nothing retries), 225-238 (blank upload then restore). Code path is clear; the unproven link is Pixi: that a drawn texture is never re-uploaded without `update()` or an unload (Pixi not installed). Settle: mp-picsonce already reads `restoreFailed` and `blankUploads` (mp-picsonce.mjs:327-343) but only online; add an offline restore to it.
- [CONFIRMED] R7-6: a look set that fails is never retried; `loadSet` returns the stored resolved-false promise for ever, and the fetches have no time limit. Evidence: lookPalette.js:236-238, 239 (bare fetch), 260-268, preloadLookSheets 344 (`_loading` once only). Consequence: bodies draw as copies (the ~5.8 MB a look cost the palette removes). The fallback is deliberate (comment 338-340). Half-present set (242-245 vs 260-266) is true by reading: other sheets keep loading after the first reject, and `buildSheet` registers them later. Settle size on a phone with mp-membudget (it runs the palette on). Docs: retry-looks.md:36-55 does not list sets.
- [CONFIRMED] R8-5: "load once" is written four ways. Cape: `_loading[key]` kept after failure, `continue` guard at capeSprites.js:84, so never retried. Weapons/shields/NPCs: memo promise never cleared. Pet sheet: `_loading = null` on failure (petSprites.js:28) but only re-asked when the loading screen runs again (BroTown.jsx:12223, 12323), which happens on each join. How checked: read all five. Softened-blade canvases without `keepOnGpuOnly` (weaponSprites.js:138-154) not checked against Pixi; PLAUSIBLE, settle with mp-gpuaudit.

## What needs further thought
- Which pictures matter enough to ask again after a failure? The head pieces already do. Gear poses (swing, bow, cook), capes and the look-palette sets are the visible ones; plate icons and weapon/shield icons fall back gracefully.
- Is "one time limit counts as a failure" to be the rule for EVERY loader (as TRAPS 257 says), or are some allowed to wait for the 20 s cap?
- Making it explicit: one small helper, `loadOnce(key, loader, {timeoutMs, rounds})`, holding per key a state (unasked, loading, held, failed-until(time)). Every module above calls it instead of keeping its own memo; `failed-until` is checked on the next ask (the way `_gearStripAt` already times a pending strip), and the loading screen only awaits the first round. Messages: none (all client side).
- Quick fixes vs design work: quick: add the 15 s abort to `_fetchJson` (R1-2), use `loadCroppedStrip` with `timeoutMs` for the hair mask (R1-9), clear the memo on failure for capes/weapons/shields (R8-5), set `{failedAt}` on gear strips (R4-18). Needs a decision: look-set retry and its cost (R7-6), picsOnce restore retry (R6-16), the shared helper.

====================================================================
# VC-2 · Pictures kept after their zone, life or rebuild
- Verdict: needs-thought
- Severity: medium (iPhone Safari dies near 250 MB; the biggest single item is ~2.4 MB per rejoin, the rest are 1-9 MB held once or in narrow windows)
- Who can trigger it: honest player (rejoin without reload; leave the farm or Wheel while art still loads on a slow phone; black-screen rebuild while in a dungeon or on the farm)
- Summary: A few caches hand back pictures when you leave, but a handful of paths miss. Going back to the menu and joining again re-bakes the blue slime pictures for the stat scene each time and never frees the old ones. A picture that lands after you left the farm, or a slime colour freed mid-build, is left behind. Each is small, but the game has a memory budget and a rule that art is freed where you leave it.
- Key files: src/rendering/statDemoPreload.js:56-101, src/rendering/farmWorld.js:122-173, src/rendering/monsterRecolor.js:136-203, src/rendering/wheelDoors.js:93-128, src/ui/mobile/sheet/slimePins.js:40-80, src/rendering/systems/tileRenderer.js:664-676

## The machine
- Entity, and where its state lives: module-level caches that are only freed by a leave event (`freeZoneAssets`, `freeFarmArt`, `freeMonsterRecolor`, the WheelDoors sweep), plus held lists that are never freed (`_held` arrays, `_blueSheets`, `_fd`, `_sets`).
- States: absent, loading, ready, freed, orphaned (loaded after the free, nobody owns it).
- Moves:
  - enter zone: absent → loading → ready (preloadAnimations.js:193-196, 133)
  - leave zone: ready → freed (preloadAnimations.js:307-311, 280-290)
  - leave while loading: loading → orphaned !! (farm picture farmWorld.js:128-129; recolour monsterRecolor.js:145-156)
  - rejoin without reload: ready → ready + another copy !! (statDemoPreload.js:56-101)
  - rebuild outside the Wheel: mouth picture stays until you return to the Wheel !! (effectsRenderer.js:12048)
- Diagram edges:
  - `Absent --enter--> Loading`
  - `Loading --lands in time--> Ready`
  - `Ready --leave--> Freed`
  - `Loading --leave first--> Orphaned` !! (farm picture, blue-slime recolour)
  - `Orphaned --next visit's free--> Freed` (farm only; recolour never)
  - `Ready --rejoin on same page--> Ready + extra copy` !! (stat scene's slime)
  - `Ready --renderer rebuilt outside Wheel--> Held until back in Wheel` !! (dungeon mouth)

## Concerns, verified
- [CONFIRMED] R5-9: a second join on the same page re-runs the loading gate and re-bakes the blue slime strips under new blob URLs, never revoking the old ones; the six other `*Preload.js` modules push another full set of Image objects each run. Evidence: BroTown.jsx:2294-2303 (backToMenu only changes bootPhase), 12223 (`preloadPlayerAssets()` per join), statDemoPreload.js:56-79, 101 (no memo), statDemoAssets.js:45 (old URLs replaced, not revoked), `_held.push` at 54. How checked: traced; only chestPreload is memoised. About 2.4 MB per rejoin by the finding's arithmetic (3072x128 + 1920x128 at 4 bytes, not remeasured). Settle size: mp-memledger (counts across a rejoin) or mp-longplay. Docs: MEMORY-MAP.md "a cache has a cap"; none on rejoin.
- [CONFIRMED] R11-9 (main claim): a farm picture that lands after you left is neither stored nor unloaded. Evidence: farmWorld.js:128-129 (`if (gen !== _gen) return;`) vs icons 135-136 and sheets 143-144; `freeFarmArt` unloads only what is in `_tex` (165-166) and returns early when `_tex` is empty (162); hold lifts after 12 s regardless (farmTrip.js:71-80). It is cleaned at the next visit's free, so it is a one batch delay, up to the ~9 MB the finding quotes (not remeasured). Race sub-claim (leave and come back while a sheet loads, Pixi sharing the in-flight promise): PLAUSIBLE, depends on Pixi's shared load promise; settle with mp-memledger visiting the farm twice fast. Third sub-claim (a way off the farm that skips `freeZoneAssets`) NOT traced; leave open.
- [CONFIRMED] R9-12: freeing a recolour while it builds deletes the entry but the running closures then publish into it. Evidence: monsterRecolor.js:142-156 (closure captures `entry`), 188-203 (free only destroys frames already there); `Texture.from(cv)` makes a Cache entry. Window is the 400 ms after the zone flip (preloadAnimations.js free runs after the flip), so a cold cache or slow phone. About 4 MB per slime family per finding, not remeasured. Stale comment also true: header says recolours are left resident (preloadAnimations.js:249-252) while the body frees them (280-290).
- [CONFIRMED] R11-6: after a black-screen rebuild in a dungeon or on the farm, the new effects renderer has no `_wheelDoors`, so the sweep that frees the mouth picture never runs until you are back in the Wheel. Evidence: effectsRenderer.js:12048 (needs `this._wheelDoors`), 18462 (no destroy of it), wheelDoors.js:93-95, 330-332 (module-level `_pics`, `_liveDoors` never reset). ~2.1 MB per finding. Narrow (rebuild only). Race sub-claim PLAUSIBLE (Pixi in-flight promise; mp-memledger).
- [CONFIRMED] R4-6: prop-mark overlay Containers are created per prop face and only hidden when empty, destroyed on a zone change. Evidence: effectsRenderer.js:11273-11282, 11548-11552, 11296-11298. Bounded by the number of props ever hit in the Wheel; trivial.
- [CONFIRMED] M3-18: `_fd` (56 frames of 128x128, two bytes a texel: 56 x 16384 x 2 = 1.8 MB) is kept for the page once any bow or staff stat window opened, and `_sets`/`<style>` entries accumulate per launch point. Evidence: slimePins.js:40, 76, 93-125, 128-145; arrowPin.js:166-172 (two Uint8Arrays per frame). Held on purpose so later launch keys can compute pins without a re-read, but MEMORY-MAP has no row for it.
- [CONFIRMED] R5-10: the zone-label Text pool is hidden, never destroyed or emptied (TRAPS 192), and `_forceImageReload` (set after any rebuild) re-fetches and re-decodes every image zone once. Evidence: tileRenderer.js:665-676 (visible=false), 383 and 848-852 (reload via `Assets.unload` then load). The labels are a few small Texts (a fraction of the 1 MB speech-bubble case in TRAPS 192). The reload's original reason (ImageBitmap husks) was removed by v2.3.778 per the finding; I did not re-read pixiRenderer.js:76-90 to confirm, so the "now unneeded" part is PLAUSIBLE; settle with mp-memledger on a rebuild trip. Video and `_questPath` memo points not checked (dormant per tiledMaps.js).

## What needs further thought
- Should leaving to the menu and joining again reload the page (a clean reset), or should every preload be made idempotent? The second is what the memory law implies.
- Is a ~2 MB leftover per event acceptable on iPhone, or should mp-memledger get a rejoin trip so the number is measured instead of calculated?
- Making it explicit: every one of these caches would carry the same two things: a generation number bumped on leave, and "when a load lands, compare my generation, and if it is old, free what I just made". The farm icons and sheets already do exactly this; the farm pictures, the recolour and the stat-scene bake do not.
- Quick fixes vs design work: quick: unload in the farm picture's stale branch (farmWorld.js:129), a `freed` flag checked by the recolour closures, memoise `preloadStatDemo` and revoke old blob URLs, destroy labels instead of hiding them, reset `_pics` on effects destroy. Needs a decision: rejoin policy, and `_fd` retention.

====================================================================
# VC-3 · The owner's studios: boot that throws before the buttons work, and what a restore does
- Verdict: needs-thought
- Severity: medium (the owner only; one unreadable saved picture locks out Download and Restore so good work cannot be backed up; restore can quietly mark good pictures stale or lose sound and name choices)
- Who can trigger it: owner only (their own browser's saved data, their own zips)
- Summary: Both the Ground Studio and the Object Studio load every saved picture before wiring their buttons. If one saved picture will not read back, the page stops with "Something went wrong" and the Download and Restore buttons never work, so the owner cannot save the rest. Restores also flatten details: one "made from" stamp per swatch, all times reset to now, sound choices replaced, names kept only when the same count of parts is found. The Object Studio stage draws about 1.3 times bigger than the game.
- Key files: public/tools/ground/app.js:355-392, 1437-1506; public/tools/objects/app.js:510-560, 1237-1263, 1160-1186; public/tools/ground/app.js:1273-1276, 1348-1385; public/tools/objects/app.js:89-91, 618-640; public/tools/world/store.js:26-43

## The machine
- Entity, and where its state lives: each studio page (`S.ready`, `S.store`; IndexedDB `brotown-ground-studio` raw/prep/misc and `brotown-object-studio` raw/fin/misc), each saved picture's record (`raw`, `brief`, `at`, `fin`, sheet `assign`).
- States: page: loading, ready, failed. Object: none, from-sheet, own, own-broken (raw kept, no pieces).
- Moves:
  - open: loading → ready, wiring done LAST (ground app.js:1492-1494; objects 1257-1259)
  - one record will not decode: loading → failed, nothing wired !! (ground 378-381; objects 549)
  - restore: pictures saved, THEN made; a throw leaves an own-broken object and the rest of the zip unrestored !! (objects 1180-1182, addSheet 453-455)
  - restore: stale stamp copied from the swatch's first version to all versions; `at` reset; steps replaced !! (ground 1275, 1366, 1377-1380)
- Diagram edges:
  - `Loading --all records read--> Ready (buttons wired)`
  - `Loading --one record will not decode--> Failed (no Download, no Restore)` !!
  - `Own picture --restore saves raw before making--> Own-broken` !!
  - `Own-broken --reload--> Own-broken (retries and fails each load)` !!
  - `Fresh/stale per version --export--> one madeFrom per swatch --restore--> all versions share it` !!
  - `Backup zip --restore--> sound choices replaced, times reset to now` !!

## Concerns, verified
- [CONFIRMED] T2-6: Ground Studio boot. Evidence: ground/app.js:374-381 (`keepPrep(await prepareFor(ver, rec.blob))` with no try, while the remake branch above at 371-372 has one), 1460 (`await loadAll()`), 1492-1494 (wire* after), 1506 (`start().catch` only prints). How checked: followed the throw out of `loadAll`; nothing wires before it. Needs a stored record the browser can no longer read (the upload was decoded when it was added, so a fault in storage or browser). Owner only.
- [CONFIRMED] T2-10: Object Studio boot, same shape. Evidence: objects/app.js:549 (`await blobToCanvas(p.png, 4096)` in the stamp-match branch, no try), also `decodeSheetThumbs(sid)` at 527 has no try; re-make branch has one (556); wiring at 1257-1259; failure at 1263. Restore `at` rewrite true (1179).
- [CONFIRMED] T2-8: restore saves an own picture before making it. Evidence: objects/app.js:1180-1182 (`S.raw.set`, `store.put`, then `finish`), loadAll's re-make failure keeps the raw and drops the pieces (556); `S.raw.has(eid)` shadows the sheet (471, 542); no Remove button without a `fin` (747); `addPicture`'s comment 293 states the opposite rule. MADE bump history from the finding (line 73, not re-read). Only a new upload clears it.
- [CONFIRMED] T2-9: names survive a restore only if the same number of parts is found; sheet ids are packing positions. Evidence: objects/app.js:446 (`keep.assign.length === boxes.length`), sheets.js:95 (`${g.id}-sheet-${i+1}`); `dropCut()` not in a finally (459-460, 493-494); `addSheet` also saves the sheet before `makeFromSheet` (453-455). Docs: WORLD-MAP-PIPELINE.md:1510-1513 promises names come back without a condition.
- [CONFIRMED] T2-2: "made from an older prompt" does not survive the move to another browser. Evidence: ground/app.js:1275 (first version with a brief), 1276 (one madeFrom per swatch), 1366 (`briefOf[m[1]]` applied to A, B and E), `at = Date.now()` at 1366 drives the blend's "made again after" (1018). Zip manifest carries no per-version stamp or `at`. Impact: the owner could ship a stale B marked fresh, or see blends flagged newer without change.
- [CONFIRMED] T2-7: restore replaces footstep choices wholesale while it merges pictures. Evidence: ground/app.js:1296 (zip always carries `steps`, `{}` if unchanged), 1377-1380 (`S.steps = cleanSteps(...)` then put); comment 1375-1376 covers only older zips. The game's worker reads these over the game copy (ground-worker.js:777, 794; not re-read).
- [CONFIRMED] T2-11: the stage draws at the wrong game size. Evidence: objects/app.js:89-91 (`PHONE = 844/1024`) and 624-625, caption 636 claims "as big as on your phone"; worldViewport.js:225 `VIEW_OUT_DEFAULT = 0.77`, with the comment at 207-210 putting the Wheel's scale at about 0.606 on the QA phone, so the stage is about 1.36x too big (0.824/0.606) for that phone; exact ratio varies by phone and zone, so measure it with the QA phone before fixing. Race and `S.stage.id` drift: true by reading (id set at 596 before the awaits at 597-598; only the size menu re-shows after a card rebuild, 773-775); low.
- [CONFIRMED] T1-1: World Builder `select()` has no "still the selected square" check after its awaits. Evidence: world/app.js:446-483 (`S.selected = id` at 448, awaits at 468-469, panel writes 470-480 with no recheck). Mitigated by the prompt text naming the square (finding, not re-read). The loop is dormant per the finding (superseded v2.3.2935, not re-verified).
- [CONFIRMED, latent] T1-7: the shared store opens at a fixed version 1. Evidence: world/store.js:28 (`indexedDB.open(name, 1)`), 29 (stores made only in `onupgradeneeded`). A store added to `STORES` later (ground app.js:70, objects app.js:70, world store.js:18) would be missing in every existing browser. No live trigger today; the lists have not changed. The ground worker opens the DB without a version and aborts if the stores are absent (ground-worker.js:800-812), so it would not be hurt.

## What needs further thought
- Should a studio ever refuse to start? Say it should always wire Download and Restore first, and treat one unreadable record as a card marked "unreadable" with a Remove button.
- On restore, should the zip win, or should it be merged under what is there (steps, names, stamps)? Today pictures merge, but sound, names and stamps replace or reset.
- Is the stage meant to match the game today (rescale from `worldViewport.js`) or the old view?
- Making it explicit: each studio page gets a small state (`booting`, `ready`, `degraded`) and a single `loadRecord(key)` that returns `ok` or `unreadable`, wiring the buttons before loading; the manifest carries `versions: [{v, madeFrom, at}]` and `steps`/names merge rules; stores open at a version derived from the store list.
- Quick fixes vs design work: quick: try/catch around the two bare decodes (T2-6, T2-10) and wire buttons first; `dropCut` in a finally; a generation number in `select()` (T1-1). Medium: make-then-save on restore and re-make (T2-8, T2-9). Needs a decision: per-version stamps in the zip format (T2-2), merge rule for steps and names (T2-7, T2-9), stage scale (T2-11), store versioning (T1-7).

DONE VC: needs-thought, severity medium; 21 confirmed, 4 plausible, 0 refuted
