card: EN
branch: claude/plan-en-3-folksheets (6202; 6200 on plan-en-1-leaves, 6201 on plan-en-2-leaves)
prs: #2189 6200 (ready), #2195 6201 (ready, after #2189), 6202 (checks)
state: working

## Done

- #2195 (6201): levels 1-3 (19 functions, 4 constants), 112/112
  byte-equal; entityRenderer.js 7900 code lines. Ready, after #2189.
- #2189 (6200): 72 of 84 level-0 leaves + 17 constants moved (89/89
  byte-equal); 12 stay (guards' per-file lists). Suite 566 green,
  questline 187/187, membudget 11/11.

## Next

- 6202: the townsfolk's baked sheets' chip copies let go of far from town
  (`?folksheets=0`): fight `blob:` 13-14 -> 2-7 MB, gpu line 114.3 -> 109.3.
  Ghost-audit sample, screenshots, suite, precheck, then the PR.

## Found

- `mp-membudget`'s heap line (38.5) at its edge on main: EN's runs read
  38.5-39.1 with `?folksheets` on AND off (memory-budget.mjs).
- Re-baking the folk's 35 sheets took 78-88 s on this box (worker),
  so a free-and-re-bake road meets them plain: not taken.

## Needs

- (none: the planning session answered constants, suites and systems.mjs,
  2026-11-18). Planning session is now part 6
  (session_01LccHam7XmUNAHQrA1CjiNH); heads go to gatekeeper sitting 46.
- 6202, answered by part 6 (2026-11-18): yes to road A (playerSkins.js
  `_bodySheets` cap + release; playerSprites.js `loadSheet` only if it
  grows), one `?folksheets=0` row in switches.mjs (this PR only), and
  memory-budget.mjs's gpu line.
