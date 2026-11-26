# Card PRT: the performance red team

**The owner's words (2026-11-26):** "Pretend you're a red team but mission is performance enhancements. Go"

**Purpose.** Attack the game for wasted work the way a red team attacks a login: find what the existing checks cannot see, measure every claim before believing it, mend what is plain, and leave the rest ranked with its evidence. The held budget judges long jobs and the memory budget what is held; this card's own ground is the small work that never stops, and it leaves a check for it (`mp-idlecensus`).

**What it found:** `docs/plan/census/PRT-findings.md` (15 rows, what was checked clean, what did not survive measurement). Read it before any job below.

**Tags:** 6700 to 6719 (registered in this card's first PR). One a PR, in order.
**Laws:** CLAUDE.md §7 (THE PAGE'S ONE THREAD; MEMORY: nothing here may raise a memory line; Drawing: no structural change a frame), §5 for job 8 (a cap and a lower-case kill switch for any server behaviour). Every mend lands ON with its `?name=0` off-ramp and its row in the switch table. A new rule is a module under `src/game/` with a suite that plays it (finish.md part 5 rule 5).
**Honesty rule of this card (finish.md part 5 rule 4):** every number says where it was measured. On the test box a frame-rate-bound saving is read at `BT_PF_DPR=0.2` (about 30 frames a second), never at dpr 3 (2 a second). Nothing here is claimed for a phone.

## PRs, in order

1. **(6700) The idle census and its first two mends.** DONE in the orchestrator's own session (a card of one PR).
   - `tools/qa/mp/idle-census.mjs` (the counters and the lines), `mp-idlecensus.mjs` (the scenario, with its break proof in the run), `mp-phoneframe.mjs` (+ `BT_PF_ALLOC`, `BT_PF_REACT`, `fightreal`, the `BT_PF_DPR` note).
   - `src/game/hereCells.js` + `wheelTrial.js`: the last four cells' answers (`?herecells=0`). `src/game/drawOnChange.js` + `ElementBurstButton.jsx`: drawn only on a change (`?burstidle=0`).
   - Done when: `mp-idlecensus` green on the plain build (15 rows), both break proofs seen; `here-cells.test` and `draw-on-change.test` green with their plants red; `playable` and `memory-budget` green.

2. **(6701) The band and the combat buttons draw only on a change** (findings rows 3 and 4). NOT before the new dashboard and the controller are on main: it holds `src/ui/mobile/BottomDashboard.jsx` and `src/ui/panels/{AbilityButtons,ShieldButton,SpecialButton,ChargeButton}.jsx`, with `src/ui/ZoneHeader.jsx`.
   - Each view makes a key of what it shows and asks `drawNow` (`game/drawOnChange.js`); a cooldown's arc is `moving`. The band's key is the hard one: start from what its 200 ms `force` exists for (read `docs/specs/held-sweep.md` fix 6 and the comment at the timer) and key exactly that.
   - Done when: `IDLE_LINES.commitsPerSec` lowered from 20 to what is read plus a quarter (expect under 5), `mp-idlecensus` green; every phone test that reads the band still green (`mp-oneband`, `mp-bandshots`, the tests part's list in the UI2 cards). One `?name=0` for the band, one for the buttons.
   - The strong model, high. One session.

3. **(6702) A `player_state` that only moved the pools does not draw the root again** (row 5). `src/networking/wsClient.js:3383`, `src/networking/gameEvents.js:3836`; a rule module `src/game/rpgDraw.js` (which keys of a `player_state` any screen reads through `rpgState`).
   - Nothing in `src/ui/mobile` reads `rpgState` for the pools (the bars are the renderer's, from `S.rpg`); the `[rpgState]` effect leaves the max pools out on purpose (v2.3.1158). Prove that with the tree, not by grep, before skipping a set.
   - Done when: `mp-phoneframe` `fightreal` with `BT_PF_REACT=1` reads the root under 0.5 renders a second (1.49 today, 0.4 of it the test's refills), and every pool a screen shows still moves (`mp-statfamilies`, `mp-pointsfly`, `playable`).
   - The strong model, high (it is the wire's handler). Small gain (about 1 ms a render): do it only beside job 2, never alone.

4. **(6703 to 6706) The frame's garbage, a file a PR, worst first** (row 6): the townsfolk's draw (`entityRenderer.js` `_updateNPCs`, `_drawFolk` and what they call: `_lookupBodyTop`, `lookPalette.js:708-722`, `entity-look.js _orderTraitsAndWeapon`, `townsfolkWalk.js folkAt`), then the ground and the objects (`wheelGround.js:277`, `wheelObjects.js:550` and its `forEachWheelFlag` / `forEachWheelSwayer` closures), then the shadows (`lightfx/shadows.js placeDepth`), then a fight's (`BT_PF_SCENES=fight` names them).
   - A scratch array or object kept by the function, never one a caller keeps; no iterator where an index walks. Nothing a player sees changes: `mp-ghostaudit`'s sample for anything in a figure's draw.
   - Done when, each PR: `BT_PF_ALLOC=1` at `BT_PF_DPR=0.5` reads that file's rows at a third or less of today's, the frame's KB lower by what was cut, and `the frame makes N KB a frame` written in the PR body before and after. Stop after four PRs or when the town's frame is under 100 KB.
   - Alone in the two renderers while it runs (part 11's "never side by side"). The strong model, high.

5. **(6707) The monsters the phone holds, looked up by id** (row 8). First a count: `mp-longplay` reads `S.monsters.length` at its stations (it only grows today). Then a Map beside the list, made once a tick message (`wsClient.js:1272-1291`, `gameEvents.js:2728-3399`). Pruning far monsters changes the world map: the owner's, not this PR's.

6. **(6708, 6709) The frame's named small costs** (row 10): `hasGatherTool` asked once a frame, not once a node (`src/data/lifeSkills.js:419`; its two callers); the minimap's update when nothing on it moved (`wheelMinimap.js:779`: read why each part is redrawn before skipping any). Each shown by `mp-phoneframe`'s own-time list before and after.

7. **(6710) The raise's two re-parents a frame** (row 11): first SEEN on a page (`mp-phoneframe`'s rebuild counter at a spot behind a building with a townsperson beside its other wall; a test of `depthSort.js` in node with two fake layers plays it without a page). If seen: the bucket pass asks the raise's rule before it moves a figure back. `docs/DEPTH-ROADMAP.md`, TRAPS §104 and §115 first.

8. **Not this card's, written here so they are not lost:** the room's send rate and its smaller ones (rows 7 and 13: a card of its own once the owner has said how a fight may feel; every one needs a cap, a kill switch and a deploy); the returning player's browser (rows 9 and 14: a card of its own once the owner has said what a browser may keep; `public/_headers` is its file).

## Readings chosen for you
- Nothing a player sees changes in jobs 1 to 7. A change you would see is a question for the owner.
- A saving that cannot be shown on the test box at 30 frames a second is not claimed; it is listed as "not seen here" and the mend still lands only if it is plainly less work.
- The lines in `idle-census.mjs` fall as jobs land, and are never raised without the count and the reason in the PR body.
- A job whose files a running session holds waits for it (job 2 above all).
