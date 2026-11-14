# Card TF: the townsfolk do what they are (content)

**The owner's words (2026-11-14):** *"make sure all NPCs do things that match their characters. Like chef blaze should cook, not hammer like an anvil"*

**Starts:** now (PR 1); PR 2 as its files free up (below). **Tags:** 5460 (PR 1), 5461 (PR 2); 5462 to 5479 spare. **Browser:** medium. **Effort:** extra (`entityRenderer.js`, art in memory).
**Read first:** `src/game/townsfolkWalk.js` (`FOLK_DAYS`, `FOLK_WORK_POSES`), `src/rendering/folkPose.js`, `entityRenderer.js` `_drawFolk`, `src/data/npcLooks.js` (each townsperson's `why`: who he is), `src/data/wheelBuildingDoors.js` (whose door), `server/test/townsfolk-walk.test.mjs`, `docs/UI-DESIGN-NOTES.md` (the townsfolk), and `grep -n -i "folk\|townsfolk" docs/TRAPS.md`.

## What is wrong today

A townsperson at work has three poses: the mining swing (`mine`, which holds a PICKAXE: it is baked into the body sheet), the pickup and the cast. So Chef Blaze "chops with his cleaver" by swinging a pickaxe, which reads as hammering an anvil. Gavel Greg (the pickaxe as a gavel), the Farmer's hoe and the Woodworker's axe all swing the same pickaxe.

## The art that already exists (use it; make NO new art in this card)

The player's own skill animations: `public/sprites/skills/` (`cook-strip`, `chop-strip`, `farm-hoe`, `farm-water`, `farm-kneel`, `firemaking-strip`, each with `-legless` or `-greaves`/`-prop` parts), the gestures in `public/sprites/tools/` (`pan-gesture`, `axe-gesture`, `pickaxe-gesture`, `reel-gesture`), the look gear's poses (`public/sprites/look/gear/*-cook-south`, `-farmhoe-`, `-farmkneel-`, `-farmwater-`, `-fire-`, `-chop-west`), `public/sprites/props/anvil.png`, `fx/smith-anvil`. Find how a player is drawn cooking, chopping and farming, and draw a townsperson at work the same way.

## PR 1 (tag 5460): the audit, and every wrong tool put away (no new drawing)

- A table in a new `docs/specs/townsfolk-work.md`, one row for each townsperson of the Wheel's BroTown: who he is (npcLooks' `why`, his door), what he does today at each stop, and what he should do, from the art above. Where nothing fits, write the honest closest action and what new animation would make it right (a gavel's bang, a pen stamping a letter...). That list is for the owner: no art is made here.
- In `townsfolkWalk.js`, every stop whose tool is wrong today takes the closest RIGHT action the three poses can already give, or none (he stands or walks). Nobody but a miner or the blacksmith at his anvil swings the pickaxe. So Chef Blaze stops swinging until PR 2 gives him the pan (the pickup at his counter is fine meanwhile), and Gavel Greg holds up a lot (the pickup), not a pickaxe.
- `townsfolk-walk.test` gains a check: a work pose's tool belongs to the townsperson (a small table, tool -> who may hold it). It deploys the worker (`server/test/`): say so.
- Files: `src/game/townsfolkWalk.js`, `server/test/townsfolk-walk.test.mjs`, `docs/specs/townsfolk-work.md`, `docs/plan/cards/TF.md`, `docs/plan/status/TF.md`, `tools/dev/tag-blocks.json`. The loops' places do not change (test-world-core walks them; a moved stop would need the world's check).

## PR 2 (tag 5461): the real work poses

- Add the skill poses a townsperson needs to his work poses: at least `cook` (Chef Blaze, the pan), `chop` (Woodworker Bro, the axe), and the farm's hoe, water or kneel (Farmer Bro, a mix across his stops). Then any other match the audit found.
- **The laws, all of them:**
  - **Preloading:** a pose a townsperson wears loads behind the loading screen (`preloadWorldAnimations`), never on first sight. If the player's strips are already loaded there, nothing new loads; say which.
  - **Memory:** a townsperson is drawn live from his look through the look palette, and a pose the palette has no numbers for makes a bake per look (new MB). So a new work pose is in colour numbers (256 colours, `paletteTex.js`) or he stands. Measure `mp-membudget` before and after. If a line must rise, the PR body says how many MB and why; never silently.
  - **The page's thread:** no new bake in play. Run `mp-heldsweep` at the town stations.
  - **The ghost audit:** every new pose on a townsperson's look goes through `mp-ghostaudit`. Sample each pose once, and offer the owner the full run.
  - **The switch:** `?folkwork=0` already stands them still. Keep it covering the new poses.
- **Files it needs, and who holds them NOW:**
  - `src/rendering/systems/entityRenderer.js`: card H's follow-up (tag 5050) holds it until that merges, the next gatekeeper sitting. Read the status files before you start, and wait for it.
  - `src/rendering/gearSheets.js`: card P's now (its pack-page work). If PR 2 needs a line there, ask me first.
  - `src/rendering/folkPose.js`, `lookPalette.js` and the look sets are free today, but check the status files.
- **Phone tests:** a scenario (`tools/qa/mp/mp-folkwork.mjs`, `world: 'wheel'`) walks to each working townsperson with `H.approachNpc`'s reach and checks his pose by the renderer's probe. Run it upright and sideways, and once on a computer (`wide: true`). Townsfolk are drawn live only with the look palette (computers draw the photographs, standing), so say what a computer shows. Also run `questline`.
- Take one picture of each new pose for the PR's words, so the owner sees it before it merges.

## Not yours

New art of any kind (list what is missing for the owner); the townsfolk's places, loops or looks (`npcLooks.js` is baked by its tools, never by hand); talking (a tap, never a walk-up: CLAUDE.md §7); the server.
