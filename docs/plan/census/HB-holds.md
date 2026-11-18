# HB: what holds the page on a slow machine, resolved (v2.3.6240, card HB PR 1)

Every family O2's full run found over the line (`docs/plan/census/O2-profiles.md`,
both profiles), resolved to the file and function on main today
(5ea5c7d5), worst first, with the card that owns its fix.

## How it was resolved

O2's names come from `mp-heldsweep`'s short path, and some are not the game's
own: `jg > Ek`, `R > J`, `Qj`, `Nh` and the like are React's production build
(pre-minified in `node_modules`, so an unminified build keeps them); `rE2`,
`measure2`, `loop2 > draw$1` and `tick$1` are the bundler's renamings of
`rE`, `measure`, `loop > draw` and `tick`, and there are several of each. So
they were run again with the whole path, under both profiles on a fresh
unminified build of main (`npx vite build --minify false --outDir dist-prof`):

```
BT_QA_PROFILE=hotel-laptop   BT_HS_STACKS=1 QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep   # all 8 stations, 635 s
BT_QA_PROFILE=budget-android BT_HS_STACKS=1 QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep   # all 8 stations, 707 s
```

and once more on budget-android (`stand,town,lands,fight,peer`) with each
frame's line in the bundle added to the path, a change made only for that run
and not committed. Each name was then read in the bundle at its line, and
found in `src/`.

**The runs agree with O2's.** Every family O2 named over the line came back
over it on one profile or the other, except the few marked "not seen again".
This is one run each, and the order of the smaller families moves from run to
run.

**Read the throttled numbers with care.** budget-android slows the processor
4x and hotel-laptop 2x. Chromium slows a page by pausing its thread, and a
pause is counted against whatever was running when it came. So a hold's
LENGTH is real (the page was held that long), but inside it the time is
spread over its functions more loosely than on an unslowed run. Where a
function's own time looks too large for what it does (`wrapped`, the
long-task observer), that is the reason. On budget-android the 12 ms line is
about 3 ms of the job's own work.

## The map, worst first

The O2 column is the longest hold in O2's full run, then the profile, the
station and how many times it was over the line, as O2 recorded them (a "sample"
number is from O2's sampled run). The HB column is the longest in this card's
reruns (A: budget-android, H: hotel-laptop). Owner: **HB** (outside the two
renderers), **EN** (`src/rendering/systems/entityRenderer.js`), **FX**
(`effectsRenderer.js`), **list** (the worker's message size: listed only),
**box** / **browser** (`held-budget.mjs`'s `whose`: not the game's to bring
down here).

| # | family (O2's names) | O2 longest | HB rerun | resolved to | owner |
|---|---|---|---|---|---|
| 1 | `screen-check` (debt list, line 260) | 303.7 H peer x3 | 307.2 A peer x4; 281.9 H | `BroTown.jsx` `_wdThumbCollect`, its `getBufferSubData`, run at the top of the frame (`runBeforeDraw > poll`). Two pages on one software chip (`peer`, `armour`) | box |
| 2 | the frame itself (debt list, line 70) | 153.3 A armour x13 | 132.7 A lands; 62.5 H | no one function: the most of it is `_updateNPCs > _drawFolk > _placeTrait / _placeHeadwear` and `_updateOtherPlayers` (EN); `_updateMonsters > wheelArtTick / wheelArtReady > looksOf` (`wheelMonsterArt.js`, called from EN); Pixi's `updateTransformAndChildren`, `addToBatch` and texture uploads; `BroTown.jsx` `_monBlock > _monBody`; `townsfolkDay.js giversOf`; `worldFx.js _updateAir > worldTrial.js isWheelTrialZone` | box (EN, HB parts) |
| 3 | `other: jg > Ek` | 113.5 A windows x2 | 83.7 A windows; 41.2 H | one cause with rows 5, 7, 11, 12, 21 and `JumpButton` (27.1 A): the band's geometry measured inside React's commit. `ShieldButton.jsx` `jumpAnchor > weaponPillTopPx > weaponPillAnchor > pillNarrow` reads `window.innerWidth`; `bandSideways.js` `wantSideways` reads `innerWidth`/`innerHeight`; `OneBandColumns.jsx` `read` (`read2`) and `NavRail.jsx` `measure` (`measure2`) read `clientWidth` in a layout effect. The first read after a window mounts lays out the whole page | HB |
| 4 | `other: loop2 > draw$1` | 108.1 A windows x2 | 69.3 A; 43.1 H | `WorldMapOverlay.jsx` `loop > draw > label > measureText` (each place name measured on the canvas at every redraw) and `draw > drawGlyph > glyphPath` | HB |
| 5 | `other: measure2` | 72.9 A windows | 61.4 A; 46.7 H | `NavRail.jsx:103` `measure` (`clientWidth`), in the commit of a window opening (with row 3) | HB |
| 6 | `gc` (debt list, line 60) | (not over in O2) | gc 95.4 A peer | the browser's collector | browser |
| 7 | `other: onPointerUp > set` | 64.1 A folk x5 | 55.9 A windows; 33.2 H | `dashMinBus.js` `set` (the band's fold) dispatches a synthetic `resize` inside the tap: every `resize` listener runs there, each measuring: `BottomDashboard.jsx:907` `recompute` (`playVw`, `visualViewport`), BroTown's `resize`, then the commit's `pillNarrow`. `onPointerUp > open` (53.3 A) is the same through `dashboardPanelBus.js` `emit` > `syncBandSideways > wantSideways` | HB |
| 8 | `other: wrapped > _poll` | 52.0 A armour x2 | 42.8 A; 28.3 A town (lines run) | the field report's timer, `src/debug/report.js` `_poll > _due > buildReport`, which asks `pixiApp.js` `window.__btGpuTex` (a walk over every texture the graphics chip holds) and `__btTex` for the report's memory column, once a report (`_poll > _whereNow > wheelHere` is the cheap part) | HB |
| 9 | `portrait` | 40.1 A armour x3 | 34.9 A; 16.4 H | `rendering/characterPortrait.js` `drawCharacterPortrait > _drawGearLayer > upscaleToFrameHeight / drawImage` (the Equipment screen's figure as armour goes on and off; Card H sliced it in v2.3.5042, one step is still long under the throttle) | HB |
| 10 | `other: QuestCoach` | 37.4 A peer | 18.7 A peer (`QuestCoach > worldRect`) | `QuestCoach.jsx` render, the lesson's `worldRect` (`mayorScreen.js mayorScreenRect > canvasBox > getBoundingClientRect`) | HB |
| 11 | `other: R > J` (debt list, line 16) | 36.7 A town x16 | 39.2 A town x10; 18.3 H | J2's find, unchanged: `BroTown.jsx` `placeOverHead` (bundle line 178996) > `XpFlyOverlay.jsx:695` `playerScreenPoint > getBoundingClientRect` in React's commit. O2's sampled `playerScreenPoint` (30.2) is the same. The other `R > J` holds are React redraws with no one function (GearTab, BottomDashboard, NavRail, ZoneHeader, MorePanel `statusFor`) | HB |
| 12 | `other: coachFollow > worldRect` | 35.7 A armour | 25.6 A armour | `QuestCoach.jsx:219` `coachFollow > worldRect > mayorScreen.js mayorScreenRect` (`getPropertyValue`, a computed style read) in the commit | HB |
| 13 | `other: jumpAnchor > weaponPillTopPx` | 35.2 A armour x7 | 61.3 A windows; 33.4 H | `ShieldButton.jsx:511` `jumpAnchor > :809 weaponPillTopPx > weaponPillAnchor > :790 pillNarrow` (`window.innerWidth`), on every JumpButton render (row 3) | HB |
| 14 | `other: dispatchEvent` | 34.6 A fight x3 | 38.1 A (`rE2`), 40.5 A (lines run) | the harness's synthetic taps (`evaluate > dispatchEvent`) into `BroTown.jsx` `rE` (the right stick's touch end) > `tapResourceAtClient` (:11054) > `_tapScan > lifeSkills.js hasGatherTool`, and `clientToCanvas > getBoundingClientRect`. Rows 18, 33 are the same | HB |
| 15 | `server-message` | 33.0 A lands x37 | 21.4 A lands x259 (most 12-17 ms) | `wsClient.js` `ws.onmessage` and the worker frames it hands on (`processGameEvent`, `w.onmessage` of the readers) | list |
| 16 | `pack-page` | 35.8 A town (sample), 28.3 A town x4 | 27.4 A town; 17.2 H | two: `rendering/p256.js` `p256LoadParser.load > picsNumbers.js stripAsNumbers > heldNumbers.js numbersOf > getImageData` (a 256-colour twin read on the page as it loads in play), and `p256.js` `pack > deflate > Blob` on a timer (`wrapped > pack`, 24.1 sample, 19.8 H) | HB |
| 17 | `other: wrapped > sweepPicsOnceTurn` | 27.6 A armour x6 | 23.8 A peer (`releasable` 12) | `rendering/picsOnce.js` `sweepPicsOnceTurn > sweepSlice > sweepOne > releasable` | HB |
| 18 | `other: wrapped > tick$1` | 26.8 A armour x8 | 31.2 A peer (lines run) | `ui/guideArrow.js:463` `tick` (bundle `tick$1`): `onTop > elementFromPoint`, `shown > querySelectorAll`, `guideState > deskTeachState.js harvestCoachWanted > loadTeach > localStorage.getItem`, `hide > sweepStrays > querySelectorAll` | HB |
| 19 | `other: wrapped > rememberChar` | 26.0 H armour x2 | 17.9 A; 12.6 H | `BroTown.jsx:9014` (the 30 s heartbeat) > `networking/charRoster.js:480` `rememberChar > _write > writeShared > _set$1` (a cookie and storage write) | HB |
| 20 | `other: wrapped` (no function named) | 25.4 A lands x22 | 28.9 A lands; 19.3 H | the timer wrapper itself, `src/debug/perfTracker.js:99/117` `wrapped` (bundle line 86134), with time of its own and no child: the throttle's pauses land in it, or a native callback runs under it. Its children, when named, are the rows above | HB |
| 21 | `other: BroTown2` | 25.3 A armour x3 | 14.1 A (`> jumpAnchor`) | BroTown's own render calling `jumpAnchor > pillNarrow` (row 13) | HB |
| 22 | `other: (anonymous)` | 27.7 H armour x4, 24.6 A fight x13 | 41.5 A lands (lines run: bundle 86110) | most are `perfTracker.js`'s long-task `PerformanceObserver` callback (`initLongTaskObserver`), its own time the throttle's pauses again; the rest React's anonymous scheduler work | HB |
| 23 | `other: _runLookBake > reply` | 24.5 A peer | 16.1 A (`_runLookBake > _sendGearSheets > postMessage`) | `entityRenderer.js:3105` `_runLookBake` | EN |
| 24 | `other: wrapped > tick2` | 24.3 A lands x4 | 16.3 A (`tick2 > getBagEntries`) | `ui/mobile/gearFlash.js:81` `tick` every 300 ms (`shown > querySelectorAll`), and a band timer reading `bagModel.js getBagEntries` | HB |
| 25 | `other: _sprite > _toGpu` | 24.1 A lands x2 (sample) | 21.3 A lands x30 | `rendering/wheelGround.js:452` `_toGpu` (`texImage2D`, `texParameteri` in Pixi's `_applyMipRange`): a ground piece's first upload to this box's software chip | HB |
| 26 | `other: job > _foldSliced` | 24.0 A town (sample) | 21.3 A town (counted `strip-made`) | `data/soundFold.js:136` `_foldSliced` (Card H's sliced fold; a slice longer under the throttle) | HB |
| 27 | `other: wrapped > tick$1` see 18; `other: wrapped > tick2` see 24 | | | | |
| 28 | `other: rE2 > tapResourceAtClient` | 23.3 A fight x5 (sample) | 15.1 A x13; 13.0 H | row 14 | HB |
| 29 | `other: wrapped > flushInputBuffer` | 23.2 H armour | 14.6 H | `networking/wsClient.js:5725` `flushInputBuffer > wsOut > queueMicrotask` (and `_flushOutbox > ws.send`, 14.5 H) | HB |
| 30 | `gear-sheet` | 22.8 A peer | 23.3 H armour | `characterPortrait.js` `drawCharacterPortrait > playerDecal.js:1447 composeShirt > drawImage` (row 9's figure) | HB |
| 31 | `other: rS2`, `other: rE2`, `other: rE2 > onClick` | 13.8-22.5 A | 38.1 A (`rE2`) | `BroTown.jsx` the right stick's `rS` / `rE` touch handlers, and `onClick` on a tap (row 14) | HB |
| 32 | `other: step2 > measure`, `other: step2` | 17.0 H peer x2 | 15.4 A (`step2 > live > canvasBox`) | `QuestCoach.jsx:1137` `step` (its own requestAnimationFrame, outside the game's frame) > `measure` (:244: `getBoundingClientRect`, `reachable`'s `elementsFromPoint`) and `live > mayorScreen.js canvasBox` | HB |
| 33 | `masked-bake` | 21.3 H peer | 14.3 H peer | the family's pattern (`_runBake`, `entityRenderer.js`'s bake pump) matched in a hold whose path read `NavRail`'s redraw: the bake's page part is EN's | EN |
| 34 | `other: wrapped > clearOfThumbs` | 21.1 A lands (sample) | not seen again | `ui/mobile/NmlBadge.jsx:234` `clearOfThumbs` (measures the thumb controls) | HB |
| 35 | `other: the BottomDashboard redrawn` | 20.2 A lands x4 (sample) | 15.7 A x26 | `BottomDashboard.jsx` render: `readyQuestCount > questModel.js deriveQuestLog > deriveQuestOffers` (the quest log rebuilt in render), `sheetTransition > motion.js prefersReducedMotion` (a media query) | HB |
| 36 | `other: wrapped > tick$2` (deskTeach) | (in O2's `wrapped`) | 33.8 A lands (lines run), 23.6 A x17 | `ui/deskTeach.js:237` `tick` > `resourceTick > questRoute.js questRoutePoint > questWays.js wheelWay` (a route worked out on a timer), `attackTick > onComputer > fineInput > matchMedia` | HB |
| 37 | `other: _peerLookPrewarmIfChanged > gearDrawFrame / lookArmourPrewarm` | (O2: in `(anonymous)`) | 40.0 A peer (lines run); 20.6 H | `entityRenderer.js` `_peerLookPrewarmIfChanged` > `lookArmour.js lookArmourPrewarm > lookArmourFrame` (`matOf`, `lookFrames`) | EN |
| 38 | `other: the GearTab redrawn` (x9 A sample, x13 A full) | 13.8-22.5 A | 35.5 A peer x53 | `ui/mobile/dash/GearTab.jsx` render (`bars`, `getBagEntries`, `getEquippedSlots`); under it `elementsFromPoint` from row 18 sharing the hold | HB |
| 39 | `strip-made` | 13.8-22.5 A | 21.3 A town x8 | `zoneTextures.js loadStrip > picsNumbers.js _stripOfNumbers / stripAsNumbers` (the row checks and texture; Card H moved the numbering to a worker) | HB |
| 40 | `other: window.__btTex` | 13.8-22.5 A | 20.2 A x11 | `pixiApp.js:404` `__btTex` asked by `crashTrap.js markAlive > _memNow` and the report (row 8); `markAlive > decodedMB > _bufBytes` 16.3 A | HB |
| 41 | `other: _pack > _deflateAll`, `_pack > _cellBytes`, `_runLine > _pack` | 13.8-22.5 A | 26.3 A lands (lines run); 12.2 A | `rendering/framePack.js:96` `_cellBytes`, `:167` `_runLine`, `:179` `_deflateAll > deflateOnWorker > ask > postMessage` (the cells read on the page before the worker) | HB |
| 42 | `other: _sprite > _source` x14 | 13.8-22.5 A | 20.9 A lands x37 | `wheelGround.js:383` `_sprite > _source > paletteTex.js makePaletteSource > takeRow` > Pixi's upload (`texSubImage2D`): a row of colours uploaded to this box's chip | HB |
| 43 | `other: _resumeRecover`, `other: onGesture > gestureKick` | 13.8-22.5 A | 18.0 A, 15.3 A armour | `wsClient.js:5308` `_resumeRecover > _forceRejoin > connect` (a new WebSocket) and `gameDisplay.js gestureKick > connect`: the tour's own return-to-view at `armour` | HB |
| 44 | `other: loadLook` | 13.8-22.5 A | not seen again | `rendering/wheelMonsterArt.js:152` `loadLook` | HB |
| 45 | `other: the GearCellView redrawn` | 13.8-22.5 A | 13.9 A (`ui:GearTab`) | `GearTab.jsx` `GearCellView` | HB |
| 46 | `other: tapResourceAtClient`, `other: tick2`, `other: wrapped > tick$1` (smaller) | 13.8-22.5 A | | rows 14, 24, 18 | HB |
| 47 | `other: NavRail` | 12-20 A (sample) | 18.8 A town; 14.6 A x13 | `NavRail.jsx` render | HB |
| 48 | `other: createObjectURL` | (O2 sample: under the line) | 20.1 H armour; 17.9 A peer | a blob's address made on the page (`?` caller in the profile; the armour station's sheets) | HB |
| 49 | `other: _onPointerMove > mapEvent`, `other: query` | | 15.3 A, 18.3 A windows | Pixi's pointer events; `query` is Playwright's own selector engine (the harness, not the game) | HB / harness |

Rows 27 and 46 point back to rows above. They are kept because O2's tables
name those families separately.

## By cause: what a fix would be, for the HB rows

The card's order (CLAUDE.md §7): the palette, offline, a worker, slices; a
read of the chip at the top of a frame; a timer's redraw as a transition;
nothing measuring the page inside a frame.

1. **The band's geometry, measured in the commit and in a synthetic resize**
   (rows 3, 5, 7, 13, 21, `JumpButton`, `onPointerUp > open`): the worst on
   both profiles, at `windows`, `folk`, and on every JumpButton render.
   `pillNarrow` and `wantSideways` read `window.innerWidth/innerHeight`
   (which lays the page out when anything changed) on each render; the fold's
   and a window's `resize` event runs every listener inside the tap; NavRail and
   OneBandColumns read `clientWidth` in a layout effect beside a
   ResizeObserver that would hand them the size anyway. Fix: remember the
   window's size (read once a resize, not once a render); take the size from
   the ResizeObserver's entry; and let the synthetic resize's listeners read
   the remembered size. Nothing on screen moves.
2. **The World map's labels** (row 4): measure each name once and keep its
   width (a cache keyed by text and font), not every redraw.
3. **The door prompt** (row 11, the debt list's `R > J`): J2's `next`: place it
   from a remembered canvas box, measured at the top of a frame, not in the
   commit.
4. **The quest coach** (rows 10, 12, 32): `mayorScreen.js canvasBox` and the
   coach's `measure` read the page each frame of its own loop and in the
   commit. Remember the canvas box (`mayorScreen.js` already remembers
   some of it) and the anchors' rects, measured again on a resize or a
   change of window.
5. **The field report's memory column** (rows 8, 40): `__btGpuTex` walks every
   texture to sum MB. Keep the sum as textures come and go, or walk it in
   slices across report turns. (`src/debug/report.js`, `pixiApp.js`.)
6. **The timers that ask the page** (rows 18, 24, 36): guideArrow's
   `elementFromPoint` and `querySelectorAll` every turn, `localStorage` read
   every turn (`loadTeach`), deskTeach's route worked out on a timer. Remember
   what does not change between turns; ask the page less often.
7. **A 256-colour twin read on the page in play** (row 16): read through the
   strip reader's worker (`stripRead.js`), as §7 asks of art that loads in
   play; `pack`'s deflate is on the page's timer: hand it to the deflate
   worker (`framePack.js` already has one).
8. **The figure on the Equipment screen** (rows 9, 30): already sliced
   (v2.3.5042); its `upscaleToFrameHeight` and `composeShirt` steps are each
   one piece: slice smaller, or do them on the body bake's worker.
9. **The band's redraws** (rows 35, 38, 45, 47): `deriveQuestLog` in
   BottomDashboard's render (memoise it on the quest state), the GearTab's
   bars; React's redraws on a timer as transitions.
10. **Writes on the heartbeat** (rows 19, 29): `rememberChar`'s cookie only when
    the row changed.
11. **The timer wrapper and the long-task observer** (rows 20, 22): their own
    time is the throttle's pauses landing in them. Nothing to fix until an
    unslowed run shows time of their own.
12. **First uploads to the chip** (rows 25, 42, 39): on a phone a row's upload
    is far cheaper than this box's software chip. Listed, not first in line.

## For the other cards

- **EN** (`src/rendering/systems/entityRenderer.js`): row 23
  (`_runLookBake > reply / _sendGearSheets`, 24.5 A peer); row 37
  (`_peerLookPrewarmIfChanged > lookArmourPrewarm / gearDrawFrame`, 40.0 A,
  20.6 H peer); row 33 (`masked-bake`, 21.3 H peer); and the debt list's
  "the frame itself" (row 2), whose biggest part is EN's `_updateNPCs >
  _drawFolk > _placeTrait / _placeHeadwear` and `_updateOtherPlayers >
  _placeHeadwear > _ensureTraitLoaded` (11 ms of a 110.7 ms frame at `peer`, A).
- **FX** (`effectsRenderer.js`): no family over the line is FX's own. Inside
  "the frame itself" FX's `_updateDamageNumbers` is 6 ms of a 252 ms frame
  (A, peer).
- **The worker's message size** (list only): `server-message`, 33.0 A lands
  x37 (O2), 21.4 A x259 here, most of them 12 to 17 ms under the 4x throttle.
- **The box and the browser**: `screen-check` (row 1, two pages on one
  software chip: 303.7 / 307.2 ms against 260) and `gc` (95.4 A against 60)
  grew past their lines under the throttle. Neither is a phone's.
