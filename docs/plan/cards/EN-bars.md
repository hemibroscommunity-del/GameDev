# Card EN: the bars whole again, and a fishing player's sword put away (two PRs, in order)

Model and effort: the strong model, high. Tags: 6206 then 6208 (card EN's block, 6200 to 6219). PR 1 on `claude/plan-en-bars` from `main`; PR 2 on `claude/plan-en-fishsword` STACKED on PR 1 (they share `entityRenderer.js`). Each a draft PR opened when its line is done; one message to the orchestrator after each; stop after the second (or hand over at 250,000 with the status file true). No server file, no cap. Both are bugs in what a player sees.

## PR 1 (6206): the mana and energy bars

The owner, 2026-11-25, on their iPhone 14 Pro (their screenshot, on the branch `claude/plan-orc`: `docs/plan/status/assets/owner-2026-11-25-bars-and-target.png`; the bars are under the bro, about x 575 to 715, y 1395 to 1450 of the 1290 x 2796 picture): *"Resource bars like mana and energy aren't displaying correctly. They look like they have holes in them instead of a full pill shape like the original. Also remove the shadows they cast on the game area."*

What the picture shows: FIVE SEPARATE blocks, each with its own blue top and bottom edge and dark sides, the ground showing between them; and a soft dark patch on the ground to the right of the row. What the bars are meant to be (the owner, at v2.3.2300, quoted at `src/rendering/leaves/entity-ui.js:255-277`): *"I want just 5 blocks (with thick borders between them but all connected inside a rectangle)"*. So the blocks are right and the RECTANGLE that joins them is what is missing: a bug, not a new design.

PURPOSE: the bars read as one object: five blocks joined inside one rounded rectangle, nothing of the ground between them, and no shadow of theirs on the world, on the owner's phone as it really draws.

The facts (a reading lane's: check by range): `_drawResourceBar` (`src/rendering/leaves/entity-ui.js:196-342`): a cap-L, a mid and a cap-R frame sprite and pooled cell sprites, placed at :299-340 (the `gfx` is cleared at :278 and draws nothing); textures `BLOCK_BARS` / `BLOCK_GEOM` (`src/rendering/fxStrips.js:101`, `:174`: pitch 49.5, cell 36, cap 18; the sheet 273 x 98 a frame); width `_barWidth(n)` (:174), at most `RES_BAR_MAX_W` 118. Called from `src/rendering/systems/entityRenderer.js:16509` (mana) and `:16527` (stamina); the probe `window.__btResourceBars` (:16538). The old proportional sprites `_hudMpSprite`, `_hudStamSprite` are made and kept invisible (:16513-16531): leave them. The suns' shadows skip a player's `_uiLayer` (`src/rendering/lightfx/casters.js:10-11`, `:134`, `:148`): whether the bars' sprites sit under `_uiLayer` was NOT checked.

The readings:
1. **Diagnose first, with a red test.** The owner's phone draws at 1.5 sharpness (the phone's default), one sprite program, look palettes on: play that shape (430 x 775 at 3x; `H.newPlayer` with `world: 'wheel'`). The test reads the bar's own pixels (a canvas read in a test sets `__btTrimVerify`) and fails while any pixel between the first and the last block, on the bar's middle rows, is the ground's. If this box does not show the fault at the phone's shape, find which of the sharpness, the program, the palette path or the frame's three sprites loses the mid piece, by reading the code and the sheet, and say in the PR body what it was and when it broke (`git log -S`).
2. **Whole at every sharpness the game draws** (1, 1.5, 2, 3), in both sprite programs (`?onebatch=0|1`), mana and energy alike, five blocks and any other count `rpgBlocks` gives.
3. **No shadow from the bars.** Find what draws the dark patch beside them (the bars' sprites reached by the shadow casters; the sheet's own soft edge; or something else: name it) and remove it for the bars, the name plate untouched unless it is the same fault. A fix never turns on something nobody has seen (TRAPS §305).
4. If the sheet must be cut again: through `public/tools/style/process.js`, 256 colours at most, loaded behind the loading screen as it is today; the memory check's lines do not rise.
5. No switch: it is a mend.

Done when: the test (`tools/qa/mp/mp-resbars.mjs`, `world: 'wheel'`, its `lane`) was red on `main`'s code and is green on yours, once on your box; pictures at deviceScaleFactor 3 and at the phone's 1.5 in `docs/shots/` (before and after, mana and energy part-full), in the PR body in plain words for the owner with the preview address `https://claude-plan-en-bars.gamedev-aix.pages.dev/`.

## PR 2 (6208): another player's sword while they fish

The owner, 2026-11-25: *"Last time I saw a character during multilayer fishing and his sword was floating mid air while he fished fix that too"*.

PURPOSE: a player seen by another, in a pose whose picture already holds its tool (fishing, mining, the smith's), shows no weapon of their own: what my own bro hides, a peer's bro hides.

The facts (check by range): my own bro: `_fishingPose` (`entityRenderer.js:12110`; fishing, mining, smithing) hides `_weaponContainer`, `_shieldSprite`, `_handCapSprite` and calls `_hideArmClones` at :12247-12252 (the rod is in the 'fish' sheet: :12099-12105, v2.3.844). A peer: the harvest arrives as `other._ex` (`src/networking/wsClient.js:1075`, 'fish' at :1081), mapped to `_rexBodyPose` at `entityRenderer.js:10690-10703`, which only picks the body's pose (:10727). The peer's weapon is hidden only in the block at :11457-11480 (at :11480), gated on `_meleeSwing || _bowDraw || _oBlockPose`: a peer's fish or mine pose never hides it, and `_weaponContainer` is forced visible for a living peer at :10456. The peer's shield is right (:10634-10653). The weapon slung on the back was NOT checked.

The readings:
1. A peer in a harvest pose hides what my own bro hides in that pose: the weapon in hand, the hand's cap, the arm's clones, the shield, and the weapon on the back if my own bro hides it there. ONE small rule says what a body's pose hides, asked by both paths, so they cannot drift (a leaf under `src/rendering/leaves/entity-*.js` or a module under `src/game/`, with a suite that kills its mutants).
2. Shown again the frame the pose ends; a change of what is visible happens at the change of pose, never every frame (TRAPS §218).
3. The wire already carries the pose: no server file.

Done when: `tools/qa/mp/mp-fishpeer.mjs` (`H.joinPair`, `world: 'wheel'`, its `lane`): A fishes, and on B's page A's weapon is not drawn, and is drawn again when A stops; the same for mining; red on `main`'s code, green on yours, once on your box. `mp-ghostaudit` in its SAMPLE (the fish and mine poses, each direction once: CLAUDE.md §6 "Sample, and offer the choice"; say in the PR body that the full audit was not run). A picture of B's view in `docs/shots/`, before and after.

## Both PRs

Files yours: `src/rendering/leaves/entity-ui.js` and the other `entity-*.js` leaves, `src/rendering/systems/entityRenderer.js` (by range, never whole), `src/rendering/fxStrips.js`, `src/rendering/lightfx/casters.js`, the bars' sheet, the two phone tests and a suite. NOT yours: `src/rendering/systems/effectsRenderer.js` (CT part 22 is in it), `src/ui/BroTown.jsx` and the control panels (card PAD), `src/game/sight.js`, `latch.js`, `playerActions.js` (CT part 23). Do not edit `tools/dev/tag-blocks.json`. Merge `main` ONCE before each PR's one push. `node tools/dev/precheck.mjs` passes; `mp-membudget`'s lines do not rise. `docs/plan/status/EN.md` true, riding the work's commit; this card committed as `docs/plan/cards/EN-bars.md` in PR 1.
