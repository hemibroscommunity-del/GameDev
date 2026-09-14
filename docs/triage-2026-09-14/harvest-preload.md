> **Evidence appendix for `docs/BACKLOG-TRIAGE-2026-09-14.md` (v2.3.2471).** Raw checkpoint log of a read-only research pass against `main` 8f74d42 (v2.3.2470). Line numbers are as of that commit — grep the quoted identifier if they drift. `TODO` lines are the researcher's own open threads at the time of writing, not work items. KNOWN = read in code; INFERRED = the reading the code most directly supports.

# harvest-preload triage research (READ-ONLY) — checkpoint file
HEAD = 8f74d42 (v2.3.2470). Shallow clone (188 commits). package.json version 2.3.2324 (stale).

## Q2 groundwork (KNOWN unless marked)
- src/game/gesturePose.js:84-92  gestureDemo01: `if (ex._gestureDown) return null;` then 600ms hold on `_gestureMovedAt` (performance.now clock), else `return ((now % cycle) / cycle)`.
- gesturePose.js:115-116  gesturePose01: `const demo = gestureDemo01(ex, now); if (demo != null) { ex._posT = now; ex._posF = demo; return demo; }` — demo bypasses chase.
- src/ui/ExtractionSwipeLayer.jsx:432-435 listeners on `window` (pointerdown/move/up/cancel, passive:false). NO pointerId tracking anywhere in the file.
- ExtractionSwipeLayer.jsx:197-205 onPointerDown gated by `readyExtraction()` (status==='ready') and `Math.hypot(x-cue.x, y-cue.y) > cue.r + BUTTON_SLACK_PX` → return.
- :251 `ex._gestureDown = true;`  :368 `ex._gestureMovedAt = performance.now();` (only in onPointerMove, only when swipeRef.current set) ; :403-414 onPointerUp: `swipeRef.current = null; ... ex._gestureDown = false; ex._gestureMovedAt = performance.now();` — fires for ANY pointer (left thumb too).
- Consumers: entityRenderer.js:10019 `gesturePose01(S._extraction, now, 700)` (mine), :10030 `gesturePose01(S._extraction, now, 450, true)` (fish); effectsRenderer.js:9422 `gesturePose01(ex, now, 700)` (chop), :9591 `gesturePose01(ex, now, 1600, true)` (cook); BroTown.jsx:5139 `gestureDemo01(_ex, Date.now())` for button strip/finger.
- git log 352902c(v2.3.2386)..HEAD: NO commits touch gesturePose.js / ExtractionSwipeLayer.jsx / TouchControls.jsx. BroTown.jsx touched by many (v2.3.2446 guard-held gesture, v2.3.2451 rotate held guard, v2.3.2465 swipe/shot, v2.3.2437 world waits for server ...). entityRenderer/effectsRenderer touched by v2.3.2431 stand-in bake slicing, v2.3.2425 drawings on swing, v2.3.2461/2462 dash, v2.3.2470.

## Q1 checkpoint (KNOWN)
- effectsRenderer.js:1705 `_fxLoad('/sprites/skills/chop-strip.webp?v=2.3.1469').then((tex) => {` raw Pixi load, frames sliced from tex.source — NO recolorStandInSkin. Same for :1719 chop-strip-legless. (Cook: :2548-2563 `_bakeCookStrips` → `recolorStandInSkin(img, skinT, FH)`; Fire: :2636-2637 `recolorStandInSkin(img, skinT, FIRE_FH, FIRE_SKIN_OPTS)`; both re-bake on onSkinChange :2527/:2611.)
- effectsRenderer.js:39 imports `recolorBodyToCanvas, recolorStandInSkin, DEFAULT_SKIN_TARGET, skinTarget...` ; :2049 sword/bow stand-ins `const skinT = skinTarget(getSkin()) || DEFAULT_SKIN_TARGET;` then :2099 `recolorBodyToCanvas(img, skinT, pantsT, shoesT, ...)`.
- Mine/fish = REAL body sheet poses: entityRenderer.js:10004 `} else if (pose === 'mine') {` :10024 `} else if (pose === 'fish') {` — playerSprites.js:119 POSES includes mine/fish (south only :126). Real body goes through playerSkins recolour (to confirm getBodyFrame).
- Stand-in gear tint cache: effectsRenderer.js:336 `const _standInTints = Object.create(null);` (gear tints, not skin). Cook/fire skin bake is stored in this._cookFrames/_fireFrames (single skin at a time, rebake on change) — no per-skin cache.

## Q3 checkpoint (KNOWN)
- gameSystems.js:2006 `EXTRACT_WINDOW_MS = 3500` ; :2009 `EXTRACT_CANCEL_R = 110`; :2015-2017 EXTRACT_OPEN_MIN 2000 / MAX 10000 / BASE 4000; :2035 `EXTRACT_REPS_TARGET = { mining: 3, woodcutting: 3, fishing: 1.5, cooking: 1 }`.
- BroTown.jsx:5575-5577 `else if (_ex.status === 'waiting' && _exNow >= _ex.windowOpensAt) { _ex.status = 'ready'; beep }` ; :5579-5591 comment: v2.3.1416 the 'ready -> windowClosesAt' expiry branch is GONE (no timeout). Cancels: joystick |dx|/|dy|>0.2 (:5571), walk-away radius (:5572), node dead/zone change.
- Client-side success: ExtractionSwipeLayer.jsx:375-399 `if (ex.progress >= 1)` grade → onSuccess(accuracy) → BroTown.jsx:7726 succeedExtraction(...) → server node_strike.
- Server: gathering.js:684-697 earliestOpen/latestClose window using openDelayBase*jitter ± EXTRACTION_GRACE_MS and EXTRACT_WINDOW_MS; 'too-early' refused; accuracy coerced; :784 `_ratedHarvestAccuracy` rate-limits 'perfect'; yield via _harvestYieldMult (:189).

## Q4 checkpoint (KNOWN)
- effectsRenderer.js:87 `export const CHOP_STANDIN_H = 104.5;` (v2.3.2273: 95 -> 104.5 was ALREADY the owner's "+10%"; history 84→112 (v2.3.1348), 112→95 (v2.3.1476)). Used locally :9424 `const CHOP_H = CHOP_STANDIN_H;` :9452 `const s = (CHOP_H / 220) * pscale;` with `pscale = zonePlayerScale(S.currentZone, _cx, _cy, TILE)` (:9451) and also in _updateRemoteExtraction SPEC table (per comment). COOK_H and FIRE FH deliberately independent (:85-86).

## Q5 checkpoint (partial, KNOWN)
- preloadAnimations.js:184-266 preloadWorldAnimations groups: slime, playerDeath, walkability, fx (effectsAnimationsReady), fxStrips, arrowBlast, traits, capes, npcArt, broBadge; wave2: fullset (preloadFullsetFigures), jogHeads (preloadJogHeadOverlays). NO explicit pickup/gear-sheet entry. preloadZoneAssets (:63-105) = map + monster variants + frost only.
- playerSkins.js:1374-1375 comment "stand + jog (all dirs) + the south-only pickup body & head overlay. Mine stays lazy"; :1438 `prewarm('pickup', 'south');` :1446 `_buildPickupHeadSheet(headKey, 'pickup', 'south', ...)`.
- gearSheets.js:29-30 "pickup-south sheets for chest/steelplate, legs/steelgreaves, and shirt/tshirt -- the loot-pickup freeze pose now shows the recoloured..."; :66 "(fish/pickup ship south only)".
- effectsRenderer.js:2493-2497 ctor prewarms chop/cook gear strips via `_gearStripFrame` for tshirt/steelplate/steelgreaves (registered with effectsAnimationsReady).

## Q5 checkpoint 2 (KNOWN)
- gearSheets.js:~370-406 `preloadGear()`: `const SETS = [['stand', DIRS], ['jog', DIRS], ['hit', DIRS], ['mine', ['south']], ['dodge', ['south', 'east']]];` — NO 'pickup', NO 'fish'. getGearFrame (:~190) `if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }` = lazy bake, null on cold pass → first pickup/fish draws body without shirt/chest/legs gear layer. (v2.3.2463 note in same fn documents the identical dodge bug: "the masked-body prewarm calls getGearFrame ... KICKS the fetch but returns null on the cold pass".)
- gearSheets.js:29-37: pickup-south gear sheets exist (chest/steelplate, legs/steelgreaves, shirt/tshirt, v2.3.1053) and fish-south (v2.3.1123).
- playerSkins.js:1438 `prewarm('pickup', 'south');` + :1441-1445 `prewarm('mine','south')` — the BODY bake for pickup and mine IS prewarmed (preloadBodyAll); fish body bake NOT in that list (stand/jog/hit/dodge/pickup/mine only).
- effectsRenderer.js:2493-2497 chop/cook gear strips prewarmed in ctor (tshirt/steelplate/steelgreaves); 'fire' pose NOT in that list (to verify).

## Q2 checkpoint 2 (KNOWN)
- BroTown.jsx right controls are TOUCH handlers (rS/bS touchstart with preventDefault+stopPropagation, :8765/:8965/:9134; bBase.addEventListener('touchstart', bS) :9420). Touch stopPropagation does not affect the separate pointer event stream ExtractionSwipeLayer listens to (INFERRED from DOM semantics).
- Candidate mechanism A (KNOWN code path): thumb already down before status flips to 'ready' → ExtractionSwipeLayer.onPointerDown bailed (`if (!ex) return;` :198) → `_gestureDown` never set, swipeRef null → onPointerMove `if (!sw) return;` (:319) → demo keeps running while the player pumps. Requires lift+re-press.
- Candidate mechanism B (KNOWN code path): ANY pointerup/pointercancel (other finger) → onPointerUp clears `_gestureDown` and swipeRef (:403-414) — no pointerId check; subsequent right-thumb moves ignored → demo returns after 600ms.

## Q2 checkpoint 3 (KNOWN)
- BroTown.jsx:9152-9162 bS (button TOUCHSTART): `if (Sb && Sb._extraction) { bSwipe.harvest = true; return; }` then `if (Sb._btnHarvest && Sb._nearNode) { ... _startExtraction(_hn, 'woodcutting') ... bSwipe.harvest = true; return; }` — the harvest STARTS on touchstart. The pointerdown for that same finger preceded it with S._extraction null → ExtractionSwipeLayer.onPointerDown returned at :198. A thumb held down from the HARVEST tap through the wind-up into 'ready' never registers `_gestureDown`/swipeRef → its pumps are ignored, demo keeps running (mechanism A, concrete).
- mp-gcue.mjs:199-201 simulates the thumb by setting `ex._gestureDown = true; ex._gestureMovedAt = performance.now(); ex.cueFrame01 = 0.5;` DIRECTLY — the real pointer path (window pointerdown → flag) is NOT exercised by the harness. mp-chopyield drives a real pointer stroke but only after 'ready' with the thumb lifted.
- game.css:630 html/body `touch-action:none`; :1304/:1328 joystick elements `touch-action:none` — pointercancel-from-scroll on iOS unlikely (INFERRED).
- By-design reading: gesturePose.js:115-116 feeds the demo into the BODY on purpose (spec §1 "Fixing only the button would have left the frozen character behind it") — owner's complaint may be the design itself.

## Q3 checkpoint 2 (KNOWN)
- lifeSkillRewards.js:89-150 startExtraction: `S._extraction = { nodeId, nodeRef, skill, startedAt: now, windowOpensAt: now + openDelay, windowClosesAt: now + openDelay + EXTRACT_WINDOW_MS, status: 'waiting', swipeSamples: [] }` + `extraction_start` to server (not for cooking). mining snaps player to node.x-7,node.y-86; fishing to +52,-43.
- :157-175 succeedExtraction requires status==='ready'; applies per-skill reward (client prediction) + node_strike; `S._extraction = null`.
- server/src/index.js:963-967 EXTRACT_WINDOW_MS 3500, OPEN_MIN 2000, MAX 10000, BASE 4000, JITTER 0.15; :983 EXTRACT_SHIELD_MS 120000; :1033 EXTRACTION_TIMEOUT_MS 600000; :1034 EXTRACTION_GRACE_MS 250.
- gathering.js:686-704: only 'too-early' (now < startedAt + openDelayBase*0.85 - 250) is refused; late coercion removed (v2.3.1416, `void latestClose`). ONE node_strike per harvest; reps/gesture never reach the server; swipeFp only feeds botfp flags; 'perfect' rate-limited (_ratedHarvestAccuracy). No sub-window burst enforcement.
- BroTown.jsx:5203-5204 button ring: ready → `_ex.progress` green; waiting → elapsed/(windowOpensAt-startedAt) amber — a wind-up progress indicator already exists on the button.
- Body during 'waiting': clock loops (entityRenderer :10021 `Math.floor((now / cycle) * fc) % fc`; effectsRenderer :9422-9423 `Math.floor(now / CHOP_FRAME_MS) % CHOP_COUNT`).

## Q5 checkpoint 3 (KNOWN)
- pixiRenderer.js:46-100 preloadPlayerAssets gate: loadPlayerSprites, weapons, shields, anchors, preloadGear(), preloadBodyAll(), preloadStartZoneMap('town'), preloadCombatGear(), preloadWorldAnimations(); then prewarmMaskedBodyFrames → prewarmAltWornSets → uploadBakedTextures → uploadGearTextures.
- entityRenderer.js:2853 `const PREWARM_POSES = ['stand', 'jog', 'hit', 'mine', 'dodge'];` — no pickup/fish in masked-body prewarm.
- effectsRenderer.js:2482-2489 (v2.3.2303 comment): "preloadCombatGear ... calls Assets.load, which fills the Pixi ASSETS cache only. _gearStripFrame keeps its own SLICE cache ... and, cold, returns null for a frame while it schedules the cut -- so a hot Assets cache still draws nothing on the first frame." Ctor warms slices only for fire/cook/chop (:2475-2477, :2493-2497). Sword/bow stand-in shirt/chest/legs strips (`_placeSwingShirt` :7958 → `_gearStripFrame`) have NO slice warm → first swing/shot draws without them until the async cut lands.

## FINAL checkpoint (KNOWN unless marked)
### Q1 additions
- entityRenderer.js:10123-10124 LOCAL fish: `let tex = pose === 'fish' ? getFrame('fish', 'south', frameIdx) : getBodyFrame(...)` — RAW untinted sheet on purpose (comment :10115-10119 "the pink rod + line are baked art and the body-region recolor seeds ... would mis-paint them"). Remote :8663-8664 same since v2.3.2304; that comment: "on the raw sheet a fishing character loses their skin tone, trousers, shoes, eye colour and any drawings. That is already what you see of YOURSELF today". Durable fix named there: "re-cut fish art with the rod on its own layer".
- playerSkins.js:1206-1224 getBodyFrame: cold path `if (entry === undefined) { buildBodySheet(...); return getFrame(pose, dir, frameIdx); }` → UNTINTED base frame while a bake runs (mine is prewarmed :1445, so OK).
- Summary: chop = raw stand-in (never baked); fish = raw real sheet (deliberate); mine = tinted real body; cook/fire = skin-baked stand-ins (single current skin, no per-skin cache; sword/bow keep _bodyImgCache for rebake :1987). mp-standinskin probe (`__btStandInSkin`, effectsRenderer :2157-2160) is written only in the sword/bow _bakeBodyStrip → chop/cook/fire/fish/mine all OUTSIDE its coverage.
### Q4 additions
- entityRenderer.js:4668-4670 `_applyBuildScale(display, pscale, heightId, frameId)`: `sx = pscale * b.sx, sy = pscale * b.sy` (buildScale: Short 0.88 / Tall 1.13 Y; Thin 0.87 / Large 1.17 X, docs/specs/character-build.md:16-20). Called :9350 local, :8358 remote. effectsRenderer.js has ZERO references to buildScale/heightId — chop (`(CHOP_H/220)*pscale` :9452), cook h:62, fire h:154 (SPEC :7585-7595) ignore the build. INFERRED: a Tall build body ≈ 84.6*1.13 ≈ 95.6 world px vs lumberjack ≈ (220-47)/220*104.5 ≈ 82 → ~14% smaller; matches "~10% too small". Walking body: BODY_ROWS stand south crown 33 feet 221 (:849) × 1.061 × 0.421875 ≈ 84.6 (comment :4652 "(221-128) * 1.061 * 0.421875").
### Q5 additions
- PICKUP_DURATION_MS = 500 (playerSprites.js:82) vs a cold buildSheet = fetch+recolour+slice → whole first pickup shirtless.
- entityRenderer.js:1893 shirt handling for pose 'pickup' exists (`_GEAR_SLOTS[s][0] === 'shirt' && pose === 'pickup'`), so the pickup shirt is a real gear sheet drawn via getGearFrame (:1850).
- combatGear.js:1-58 preloadCombatGear: Assets.load of chest/legs swing/bowshot URLs only (no shirt), Assets cache only; slice cache `_gearStrips` for sword/bow never warmed.
