card: D
branch: claude/plan-d-state-census
prs: none yet (PR 1, tag 5030, opens when its line of the card is done)
state: working

## Done

- PR 1's machine half (tag 5030): `tools/dev/state-census.mjs` reads all
  883 files under `src/` as syntax trees and writes
  `docs/plan/census/state.md`: 647 fields of `S`, 1,482 variables at the
  top of files. It prints the same page twice; `--check` holds the page to
  the code.

## Next

- The hand-made column ("should reset, suggested, not confirmed"): readers
  are on the rows, a slice each; 1,258 of 1,920 are read. Then the counts
  and the PR.

## Found

- `src/rendering/systems/entityRenderer.js` `_npcDrawn` (line 496): the QA
  record of each townsperson drawn is written and never deleted, so
  `window.__btNpcSprites()` lists one at an old spot after he is gone.
- `src/ui/panels/DungeonCreatorPanel.jsx` (line 896): on a worker without
  `caps.dungeon`, `S._preDungeonMap`, `_preDungeonMonsters` and
  `_preDungeonNodes` keep the last place's map and monsters for the sitting;
  nothing reads or clears them.
- `src/rendering/zoneTextures.js` `_stripStats` (line 395): a QA list that
  gains a record at every monster strip loaded, with no cap.

## Needs

- Nothing. (The tag check's FAIL on the card's own tag went with #1664,
  v2.3.5055: `main` is merged in.)
