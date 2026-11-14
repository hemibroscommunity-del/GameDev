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
  are on the rows, a slice each; 790 of 1,920 are read. Then the counts and
  the PR.

## Found

- `tools/dev/precheck.mjs` `version-tag` FAILS on this card's tag: the card
  on main writes it in full (`docs/plan/cards/D.md` lines 7 and 12). Card W's
  PR 2 (#1662, v2.3.5022) leaves `docs/plan/cards/` out of what main has
  used; outside the cards, main has no `v2.3.5030`. It is the only FAIL; the
  branch is pushed with it, with no pull request.
- `src/rendering/systems/entityRenderer.js` `_npcDrawn` (line 496): the QA
  record of each townsperson drawn is written and never deleted, so
  `window.__btNpcSprites()` lists one at an old spot after he is gone.

## Needs

- Nothing yet. The precheck FAIL above clears when #1662 merges.
