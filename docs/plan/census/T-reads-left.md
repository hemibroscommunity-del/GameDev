# Card T: the page's reads of its address still outside the reader (v2.3.5318)

On main after #2002 (2026-11-17): **71** reads of `location.search` in
`src/` outside `src/game/switches.js` (`switch-reader.test` check 3's line).
Each waits on one of three things. A T session moves them as each clears;
`pageAddress()` (a read handing the address on) or `sw()`/`swHas()` (a
single-name switch whose row has no need its old test lacks), its old test
in `MOVED`, as PRs 5309-5317 did.

## 1. Files card K or L held (16 reads): MOVED by card T2 (v2.3.5740-5743)

All 16 moved; the line **55** after card T2's PR 4 (`switch-reader.test`
check 3: the 38 of part 2 and the 17 of part 3 are left).

| reads | file | moved by |
|---|---|---|
| 3 | src/networking/wsClient.js | 5742, #2087 (`?wheelwhole` on `sw`; `?diet`, `?room` on `pageAddress()`) |
| 1 | src/networking/gameEvents.js | 5743 (`killXpOn(pageAddress())`) |
| 1 | src/game/desktopControls.js | 5740, #2071 (`?dbltap` on `sw`) |
| 1 | src/game/jumpActions.js | 5740, #2071 (`?jumpms` on `pageAddress()`) |
| 1 | src/game/nmlAsk.js | 5740, #2071 (`?nmlaskms` on `pageAddress()`) |
| 1 | src/game/ride.js | 5740, #2071 (`rideCoastOn(pageAddress())`) |
| 1 | src/game/speedTest.js | 5740, #2071 (`?speedms` on `pageAddress()`) |
| 1 | src/game/resetOn.js | 5740, #2071 (`resetSwitches(pageAddress())`) |
| 1 | src/ui/mobile/dash/SettingsPanel.jsx | 5741, #2075 (`?dev` on `sw`) |
| 2 | src/ui/mobile/sheet/HeroExpanded.jsx | 5741, #2075 (`?p3colour`, `?p3cols` on `sw`) |
| 1 | src/ui/panels/TradeWindowPanel.jsx | 5741, #2075 (`?tradeside` on `pageAddress()`) |
| 2 | src/rendering/npcSprites.js | 5741, #2075 (`?npcheads`, `?coinflip` on `sw`) |

## 2. Kept for card M (38 reads): move after M, or with its leave

| reads | file |
|---|---|
| 16 | src/ui/BroTown.jsx |
| 13 | src/rendering/systems/effectsRenderer.js |
| 9 | src/rendering/systems/entityRenderer.js |

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
