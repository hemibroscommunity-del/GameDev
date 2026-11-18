# Card FX: effectsRenderer.js — the code leaves (M's line 8), then what it holds

**Tags:** 6220 to 6239 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order. Stack PRs when they share the file.
**You hold:** `src/rendering/systems/effectsRenderer.js`, new files under `src/rendering/leaves/` named `effects-*.js`, and the census rows/guard lines for this file (`tools/dev/render-code-census.mjs` output, `docs/plan/census/M-tables.md` part 5 rows for effectsRenderer.js; card EN edits the entityRenderer rows of the same files: keep to your rows and re-run the generator; on a collision rebase on main and re-generate). **Never edit:** `entityRenderer.js` (card EN), `src/ui/BroTown.jsx` and `pixiRenderer.js` (card HB), `package.json`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `.github/`.
**Laws:** CLAUDE.md §7 (preloading; MEMORY; the page's one thread; drawing), §8 rows "a picture made on a canvas", "a monster, or any art that loads as you walk", "anything the memory check reads more of". `mp-membudget` and `mp-heldsweep` lines never rise silently.
**Browser:** medium (`playable`, `mp-membudget`, a sample `mp-heldsweep`; one at a time; reap after).

## PRs, in order
1. **(6220) Level-0 leaves leave.** Every effectsRenderer.js function the census marks level 0 moves VERBATIM to `src/rendering/leaves/effects-<system>.js`, one file a system (the system split of `src/rendering/tables/`), imported back by name. A leaf imports nothing from the renderers (IMPORT_CYCLE_FILES has no room). Re-run `node tools/dev/render-code-census.mjs --write`; its guard's count only falls. Done when 0 level-0 leaves are left in effectsRenderer.js, `npm test`, precheck, build and `playable` green, membudget not up.
2. **(6221) Levels 1-3 leaves leave**, the same way. Same done-when.
3. **(6222) `ore-tiers` and `projectile-sheets` (2.1 MB, P2's Found)**: loaded in effectsRenderer.js; build them in their memory slot's form (`docs/MEMORY-MAP.md`): 256-colour palette files if they are not, freed where you leave if per-zone; preloading law kept (still behind the loading screen). `mp-membudget` LOWERED to lock it in, MB in the PR body.
4. **(6223) The 8 canvas makers in effectsRenderer.js (§253)**: each through `keepOnGpuOnly` / `keepAsImage` / colour numbers; `canvas-pictures` guard count falls.

## Readings chosen for you
- "Verbatim": body byte for byte; only `export` and imports change.
- A function the census gets wrong stays, listed in the PR body.
- The damage font's pages (9.3 MB) are the OWNER's call: not this card's; do not touch `prewarmDmgFontPipe` / `dmgFontNeedsRebuild` beyond a verbatim move if they are leaves.
- If a change would need a new `?name=` switch row, ask me first.
