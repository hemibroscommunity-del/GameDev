# Card T: the page's reads of its address still outside the reader (v2.3.5318)

On main after #2002 (2026-11-17): **71** reads of `location.search` in
`src/` outside `src/game/switches.js` (`switch-reader.test` check 3's line).
Each waits on one of three things. A T session moves them as each clears;
`pageAddress()` (a read handing the address on) or `sw()`/`swHas()` (a
single-name switch whose row has no need its old test lacks), its old test
in `MOVED`, as PRs 5309-5317 did.

## 1. Files card K or L holds (16 reads): move when that card is `done`

| reads | file | held by |
|---|---|---|
| 3 | src/networking/wsClient.js | K (wire; and L's `net` door waits on it) |
| 1 | src/networking/gameEvents.js | K |
| 1 | src/game/desktopControls.js | K |
| 1 | src/game/jumpActions.js | K |
| 1 | src/game/nmlAsk.js | K (`?nmlask` moved in 5306; the passes' read is left) |
| 1 | src/game/ride.js | K, L (ride door) |
| 1 | src/game/speedTest.js | K (named in its card) |
| 1 | src/game/resetOn.js | L (the state's resets) |
| 1 | src/ui/mobile/dash/SettingsPanel.jsx | K |
| 2 | src/ui/mobile/sheet/HeroExpanded.jsx | K |
| 1 | src/ui/panels/TradeWindowPanel.jsx | K |
| 2 | src/rendering/npcSprites.js | K, L (named in their cards) |

## 2. Kept for card M (38 reads): move after M, or with its leave

| reads | file |
|---|---|
| 0 | src/ui/BroTown.jsx (its 16 moved, v2.3.5342: 13 on `sw`/`swHas` in `MOVED`; `?dtsmooth`, `?pace`, `?shieldaim` (rules handed the whole address: `frameSmoothOn`, `framePaceOn`, `shieldFollowsPointerAlways`) on `pageAddress()`) |
| 0 | src/rendering/systems/effectsRenderer.js (its 13 moved, v2.3.5343: 10 on `sw`/`swHas` in `MOVED`; `?legslook` (a need), `?dmgscale`, `?orebreakms` (values) on `pageAddress()`, the old test in place) |
| 0 | src/rendering/systems/entityRenderer.js (its 9 moved, v2.3.5343: 6 on `sw`/`swHas` in `MOVED`; `?traitretry` (a need), `?lookinline` (`=0` is not thrown), `?lookpalette=1`/`?lookprobe` (two names) on `pageAddress()`) |

(Part 11: nothing beside card M in BroTown.jsx or the two renderers; cards
K and L also name them.)

## 3. Held by another card's suite (17 reads): need that suite's owner

| reads | file | what holds it |
|---|---|---|
| 8 | src/data/gameDisplay.js | four-lines (at its line: an import is one over); tests-by-system (the reader guard may not name it); sound-fold 3c and sound-cues 18f, 18i, 21a read `?stereosfx`, `?sfxcache`, `?sfxahead`, `?soundgate`, `?voicecap` in its text |
| 1 | src/data/soundFold.js | sound-fold 4e reads `foldgentle=(0\|off\|false)` in its text |
| 2 | src/game/manualCombat.js | manual-combat 10a: no imports |
| 1 | src/game/weaponFeel.js | weapon-feel 8a: imports only manualCombat.js |
| 1 | src/game/pinSlots.js | map-pin 9i: no imports |
| 1 | src/rendering/keepAsImage.js | keep-as-image 7h: no imports |
| 1 | src/rendering/retryLooks.js | loader-retries runs its text in a vm |
| 1 | src/rendering/traits/traitImg.js | picture-door runs its text in a vm |
| 1 | src/ui/mobile/BottomDashboard.jsx | held-sweep 10a reads `bandbeat=(0\|off\|false)` in its text |

Each can move once its suite reads the reader's answer instead of the
file's text (or allows the import-free `switches.js`): that suite's
owner's change, named under Found in docs/plan/status/T.md.
