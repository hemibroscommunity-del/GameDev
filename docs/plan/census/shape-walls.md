# Review: "the client has walls" (finish line 6, pillars 5/6/7) -- working notes

main 0aec6482 (history is SHALLOW: starts 2026-11-17; earlier line values come from comments in
tools/guards/lib/fourLines.mjs:476-500 and docs/plan/status/B.md).

## Measured (commands run, outputs)

### Four lines (tools/guards/lib/fourLines.mjs:501-552; guard tools/guards/four-lines.test.mjs)
`node tools/guards/four-lines.test.mjs` -> all green, 24 s. Values today vs line vs first set (2026-11-14):
| what | first set | line today | measured today |
|---|---|---|---|
| effectsRenderer.js code lines | 9871 | 9870 | 9425 (445 room, line NOT lowered after FX) |
| entityRenderer.js | 8968 | 8941 | 7959 (982 room, line NOT lowered after EN) |
| BroTown.jsx | 8371 | 8370 | 8332 |
| BroTown (function) | 7801 | 7800 | 7789 |
| BroTown.jsx#gameLoop | 1584 | 1583 | 1573 |
| BroTown.jsx#(anonymous) | 2133 | 2132 | 2129 |
| entityRenderer#_updatePlayer | 1369 | 1369 | 1369 (unchanged) |
| entityRenderer#_updateMonsters | 1086 | 1086 | 1086 (unchanged) |
| wsClient.js | 3296 | 3039 | 3034 (real fall: send lists -> actions.js rows) |
| wsClient#setupWebSocket | 3097 | 2839 | 2829 |
| import cycles / files | 5 / 29 | 5 / 29 | 5 / 29 (unchanged) |
| writes to S from src/rendering | 114 | 114 | 113 |
No line raised (by the comment log; git history before 11-17 not available; no change to LINES values in 11-17..11-19).
OTHER_FILE 1500 / OTHER_FUNCTION 1000: any new file/function may be that big.

### 5.4 frame steps
- loop: src/ui/BroTown.jsx:4892 `var _gameLoop = function gameLoop(_rafT)`; try opens 4901 `_steps.begin(0)`; `_steps.end(0)` at 8436; catch 8470.
- steps = timing marks `_steps.begin/to/end(i)` around 16 existing call sites (src/game/frameSteps.js STEPS: name, calls, inLegacy). No inputs/outputs declared.
- legacy = 1531 code lines of gameLoop's 1573 (97%). 1555 -> 1531 = ten call sites re-labelled, nothing moved.
- guard tools/guards/frame-steps.test.mjs: order of marks (regex over text), each listed call once between its marks, LEGACY_LINE 1531 only falls.
- M-tables.md: census of the two renderers' top-level tables + part 5 "the code, counted"; written by render-tables.test.mjs --write, read by render-tables guard (page == scan) and tools/dev/render-code-census.mjs.

### 5.3 state ledger
- src/state/<system>.js, 27 ledgers, 2252 rows listed of 2274 (650 fields, 1624 variables); guard tools/guards/state-ledger.test.mjs.
- "owner" = `system` column = "the file that sets it most (the census's provisional system)" (src/state/README.md).
- fields (641 listed): lifetime zone 35, rejoin 6, zone+rejoin 1 (42 with an enforced reset); sitting+`kept:` 144; sitting with NO decision 455 (361 suggested never; 94 suggested a reset).
- variables (1611): all `sitting`; 95 with `kept:`; 1516 undecided (112 with a suggested reset, 130 '?').
- "206 rows sitting with a suggestion" (was 233): ui 88, render 118 = rows the census script thinks should reset at zone/death/rejoin and nobody decided.
- fields written from 2+ files: 148 `2+` + 15 `2+~` (plan start: 146). rpg has 48 writer files, monsters 26, others 20.
- PLANT 1: `S._deathCard = null;` as first line of updateGroundLootPickup (src/game/groundLoot.js:26; field's ledger is `life`, one writer deathCard.js).
  -> state-ledger FAIL 5 ("writers ... the script's [...groundLoot.js]: make the ledger again").
  -> ran the guard's own advice `node tools/dev/state-census.mjs --ledger life --write` -> "all green", row now twoFiles '2+', two writers.
  VERDICT: the ledger RECORDS a second writer, it does not refuse one. No owner wall.

### 5.3b phase table (src/state/phases.js, 37 rows all `door`; guard tools/guards/phase-table.test.mjs; a suite per door)
- PLANT 2a plain: `S._shieldUp = true;` in tickFarmWalk (src/game/farmWalk.js) -> phase-table FAIL 2 AND guard-page-door FAIL 2 (names farmWalk.js:106). HOLDS.
- PLANT 2a dodge: `var _farmDefaults = { _shieldUp: true }; Object.assign(S, _farmDefaults);` -> phase-table all green, state-ledger all green, guard-page-door all green. NOT CAUGHT.
  (no existing code in src/ does Object.assign(S, <variable>) or S[<computed>] = : grep found 0; so hypothetical today)
- PLANT 2b plain: `fight.status = 'resolved'` over this._duels in server/src/party.js _partySend -> phase-table FAIL 2 and duel-door FAIL 2. HOLDS.
- PLANT 2b dodge: `this._duels.set(d.id, { ...d, status: 'resolved' })` in party.js -> phase-table all green, duel-door all green. NOT CAUGHT (record replaced, not property written).
- inherent: a new boolean beside the phase (S._guardHeld) is only a new ledger row (regenerate) -- the guard row's own note lists 7 companion fields beside S._shieldUp.

### 5.2b tests by system
- helper tools/guards/lib/filesOf.mjs: filesOf/readSystem/findIn(system, regex) = the same regex over a system's files instead of one path.
- census tools/guards/lib/bigFileSuitesKnown.mjs: 222 pairs in 117 suites over 8 big files. Card B's status (11-14) said 222. Today 222. NOT ONE converted in 10 days.
- 518 server suites; 251 read client source; 14 use filesOf (plus 12 guards); 237 by path only. Only suites naming one of the EIGHT big files are counted; the other ~130 by-path readers are on no list.
- "converted" suites still match exact code lines: ride.test.mjs:609 findIn('wire', /if \(pathWaits\(movePathOn\(\), isRiding\(stateRef\.current\) && rideFeelOn\(\), _pendingMove, .../); townsfolk-walk (counted by-system) still does src('src/ui/BroTown.jsx') at :299, :319.
- manual-combat.test.mjs pins the loop's combat-input line: /var _wantAtk = _mcOn \? _mcFire : \(S\.autoAttack \|\| _engSwing \|\| _tapAtkNow\);/ -> the planned input redesign turns these red by text.
- PLANT 4a: `S.rpg.coins -= Math.floor(S.rpg.coins * 0.1);` inside the death catch-all block (BroTown.jsx:5050, inside `if (catchAllDies(S)) {`).
  phone-death.test.mjs:92 check "4c it takes no gold (the worker never does)" = !/coins\s*=/.test(blk) -> ALL GREEN (the `-=` spelling is not matched).
  four-lines all green, state-ledger all green; frame-steps FAIL 5 (legacy 1532 of 1531) -- red for a line count only.
  Same statement put on the SAME LINE as the dyingTo(...) call -> frame-steps green too (1531 of 1531). EVERYTHING GREEN.
- new door suites (card L) are better: they scan all of src/ for `.name =` through any object (window-door.test.mjs:67-86).

### Pillar 7 switches (tools/guards/lib/switches.mjs; 619 rows: 556 switch, 18 value, 45 lever)
- rows are real: every `off` sentence unique (0 duplicates, median 65 chars), born unknown 2, every switch has `on`, needs on 50 rows, reader on 31, fallback on 5, thrownFails on 75 worker rows. risk = logic on 475/556.
- 152 logic switches are already on >= 28 days with no fallback (7.2's rule would let them go); nothing reaped (7.3 LATER).
- switches-thrown on a PR throws only rows born >= tag 5301: 89 of 353 worker/both switches. The 264 older ones only by hand (`--all`, "about 45 minutes", "the owner's to ask for"); the header records only a 17-switch sample (2026-11-14). 203 page switches: no browser run; NO_PLAY_LINE 76 have no suite or scenario that plays them thrown.
- "71 reads left" is STALE: switch-reader check 3 today = 17 reads of location.search outside the reader (line 17). The 17 are T-reads-left.md part 3: each blocked by ANOTHER suite pinning the file's text ("manual-combat 10a: no imports", sound-cues reading `?stereosfx` in gameDisplay.js's text) or by four-lines ("gameDisplay.js at its line: an import is one over").
- PLANT 6: `if (new URL(window.location.href).searchParams.get('farmfast') === '1') return;` in tickFarmWalk -> switch-reader ALL GREEN (it counts `location.search` text only); switches.test FAIL 1 ("1 unlisted ... ?farmfast"). So: every switch a row HOLDS; "one reader" is dodged by location.href.

### Leaves (src/rendering/leaves/, 16 files, 2,670 lines with comments, ~118 exported functions; tables/ 10 files 1,321 lines)
- no top-level mutable state today; none imports systems/*Renderer.js. They are the functions that already read no `this` and no module state (M-tables.md part 5 definition).
- M-tables.md part 5 (at cbbe4cda): entityRenderer.js 20 methods = 4,490 code lines; effectsRenderer.js 195 methods = 8,488 code lines. That is what is left; _updatePlayer 1369 and _updateMonsters 1086 unchanged since 11-14.
- no guard is about leaves as such. PLANT 5 in leaves/entity-social.js: `import '../systems/entityRenderer.js'; let _bubbleSeen = new Map();` + `S._lastBubbleAsk = now` in _chatBubbleUp:
  four-lines FAIL 3 (files in cycles 30 > 29) -> the import IS caught (only because the cycle line has no room);
  state-ledger FAIL 4 (24 unlisted of line 22) -> ran `state-census.mjs --ledger render --write` -> all green. Module state + a new S field in a "leaf" passes; writes-to-S-from-rendering 114 <= 114.
  render-tables all green, systems all green.

### 5.7 window._gameState
- src/ui/BroTown.jsx:1289 `window._gameState = stateRef;` :1290 `window._gameFns = {`. 96 code lines in 53 files under src/ read window._gameState (game 23 files, ui 21, rendering 5, debug 3, networking 1); _gameFns read in 1 file. 356 files under tools/qa name _gameState. No guard or census names it.

### Sizes today (lib/fourLines.mjs measureClient): 1,071 client files, 187,101 code lines
- functions >1000 code lines: 13; >500: 34; >300: 68. With no line of their own and room to 1000: initPixiRenderer 960, InventoryPanel 941, PlayerPaint 917, _updateOtherPlayers 907, DevPanel 896.
- BroTown.jsx: BroTown @1053 7789; (anonymous effect) @3674 2129; gameLoop @4892 1573.
- rendering/leaves = 1,387 code lines, rendering/tables = 213: what left the two renderers (1,455 code lines of 18,839 = 8%).
- census counts: first (11-14) 647 fields + 1,482 top-of-file variables; today 650 + 1,624 (state-ledger.test.mjs comment vs its run).
- swing decision: src/game/monsterCombat.js:1655 (`var _wantAtk = ...`) inside updateMonsterCombat (1,722 code lines, its line 1724). 21 suites name monsterCombat/playerActions/targeting/manualCombat/desktopControls by path; 20 suites pin input words.
- card M status: "guards/switches-thrown alone 5-8 min" on a PR (header says "under about 30 s").
- 6.1: docs/plan/census/checklist.md is read by no guard (grep), break proofs "tried once by hand". Not re-run by me.

## Verdicts (ranked)
1. 5.4 frame steps: WRONG SHAPE (an instrument, not a structure; legacy = 97% of the loop)
2. 5.3 ledger / "state with owners": PAPER for ownership (plant 1), real for 42 resets
3. 5.2b tests by system: WRONG SHAPE (222 -> 222; helper = same regex; plant 4a passes)
4. 5.1 four lines: WEAK (ratchet works; slack 982/445 unlocked; same-line dodge; blocks 1-line cleanups)
5. 5.3b phase table: HOLDS for a plain second writer (2 plants, 2 checks each); dodged by Object.assign(S, var) and {...d, status}
6. 7.1 switch table: rows HOLD (plant 6); "one reader" WEAK; thrown-run covers 89 of 353 worker switches on a PR
7. 5.5 leaves: real but the easy 8%; a leaf is a leaf by convention (plant 5)
8. 5.7: open, 96 reads / 53 files, no census
