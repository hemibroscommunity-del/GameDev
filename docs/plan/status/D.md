card: D
branch: claude/plan-d-state-census
prs: PR 1, tag 5030, the state census (ready; its number is in the PR list)
state: ready

## Done

- PR 1 (tag 5030): `tools/dev/state-census.mjs` writes
  `docs/plan/census/state.md` from all 883 files under `src/`: 647 fields of
  `S` (166 written from two or more files) and 1,482 top-of-file variables,
  each with its writers, readers, marks and a suggested reset. All 1,920
  rows a machine cannot judge were read; none is left at `?`.

## Next

- Nothing: the card is one PR. It waits for the gatekeeper.

## Found

- `src/game/elemHits.js:334` `clearElemStatuses` ("death, a respawn or a
  zone change") has no caller: every status timer outlives both.
- `src/game/nmlAsk.js:177` `S._nmlAsked` ("this visit") is never cleared on
  leaving No man's land: an answered player is never asked again by a shot.
- `src/ui/panels/DungeonCreatorPanel.jsx:896` `S._preDungeonMap`, `_Monsters`,
  `_Nodes` (no `caps.dungeon` only): kept for the sitting, never read.
- `src/rendering/systems/entityRenderer.js:496` `_npcDrawn`: a QA record of
  each townsperson drawn, never deleted (stale `__btNpcSprites()`).
- `src/rendering/zoneTextures.js:395` `_stripStats`: a QA list with no cap.

## Needs

- Nothing.
