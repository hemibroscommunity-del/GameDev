# Card EN: entityRenderer.js — the code leaves (M's line 8), then what it holds

**Tags:** 6200 to 6219 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order. Stack PRs when they share the file.
**You hold:** `src/rendering/systems/entityRenderer.js`, new files under `src/rendering/leaves/` named `entity-*.js`, and the census rows/guard lines for this file (`tools/dev/render-code-census.mjs` output, `docs/plan/census/M-tables.md` part 5 rows for entityRenderer.js; card FX edits the effectsRenderer rows of the same files: keep your edits to your rows and re-run the generator; if you collide, rebase on main, re-generate). **Never edit:** `effectsRenderer.js` (card FX), `src/ui/BroTown.jsx` and `pixiRenderer.js` (card HB), `package.json`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `.github/`.
**Laws:** CLAUDE.md §7 (preloading; MEMORY; the page's one thread; drawing), §8 rows "a picture made on a canvas" and "anything the memory check reads more of". `mp-membudget` and `mp-heldsweep` lines never rise silently.
**Browser:** medium (`questline`/`playable`, `mp-membudget`, a sample `mp-heldsweep`, `mp-ghostaudit` sample for the jog sheets; one at a time; reap after).

## PRs, in order
1. **(6200) Level-0 leaves leave.** Every entityRenderer.js function the census marks level 0 (no `this`, no module state, reads no other in-file function) moves VERBATIM to `src/rendering/leaves/entity-<system>.js`, one file a system (the same system split as `src/rendering/tables/`), imported back by name. A leaf imports nothing from the renderers (IMPORT_CYCLE_FILES has no room). Re-run `node tools/dev/render-code-census.mjs --write`; its guard's count only falls. Done when the census shows 0 level-0 leaves left in entityRenderer.js, `npm test`, precheck, `npm run build` and `playable` green, membudget not up.
2. **(6201) Levels 1-3 leaves leave**, the same way, level by level (a level-n leaf imports its lower leaves from the leaves files). Same done-when.
3. **(6202) The townsfolk's jog sheets** (P2's Found: baked RGBA, 3-12 MB on the chip, growing each trip). Make them colour numbers / a capped cache freed where you leave (MEMORY law: 256 colours, a cache has a cap, freed on leaving), default ON with a `?name=0` off-ramp (a row in the switch table is card-owned elsewhere: if a switch row is needed, ask me first). `mp-ghostaudit` sample of the jog poses; `mp-membudget` LOWERED to lock the saving in, MB in the PR body.
4. **(6203) The 5 canvas makers in entityRenderer.js (§253)**: each through `keepOnGpuOnly` / `keepAsImage` / colour numbers as the memory law says; `canvas-pictures` guard count falls.

## Readings chosen for you
- "Verbatim": the function body byte for byte; only `export` and imports change. No renames, no rewrites.
- A function the census gets wrong (it does read module state) stays and is listed in the PR body.
- `?lookidle` (parked) and the damage font (the owner's call) are NOT this card's.

## Your questions
By message to the planning session, `session_01LccHan1V9VY6bUvdCtH1Vk`: one-line updates, questions, each PR's number and full head sha.

## Added by the planning session (2026-11-18): what holds the page (card HB's map)

From `docs/plan/census/HB-holds.md` (#2188). After PR 4, one family a PR,
tags 6204 onward, worst first, by CLAUDE.md §7's order (the palette,
offline, a worker, else a few ms at a time; a read of the graphics chip at
the top of a frame). Nothing a player sees changes; before/after ms on the
slow profile in each PR body; `held-budget.mjs` lines only fall. Pace the
browser runs with HB (one heavy browser job at a time).

5. **(6204) Row 37**: `_peerLookPrewarmIfChanged` > `lookArmourPrewarm` >
   `lookArmourFrame` / `gearDrawFrame`, 40 ms on budget-android at a peer
   (the lookArmour file it calls may be edited for this).
6. **(6205) Row 23**: `_runLookBake` > reply / `_sendGearSheets` >
   `postMessage`, 24.5 ms.
7. **(6206) Row 33**: the masked bake (`_runBake`, the bake pump), 21.3 ms.
8. **(6207) Inside "the frame itself"**: `_updateNPCs` > `_drawFolk` >
   `_placeTrait` / `_placeHeadwear`, and `_updateOtherPlayers` >
   `_placeHeadwear` > `_ensureTraitLoaded` (~11 ms).
