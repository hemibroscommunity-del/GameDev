card: EN
branch: claude/plan-en-3-folksheets (6202; 6200 on plan-en-1-leaves, 6201 on plan-en-2-leaves)
prs: #2189 6200 (merged), #2195 6201 (merged), 6202 (draft, CI)
state: working

## Done

- #2195 (6201): levels 1-3 (19 functions, 4 constants), 112/112
  byte-equal; entityRenderer.js 7900 code lines. Merged.
- #2189 (6200): 72 of 84 level-0 leaves + 17 constants moved (89/89
  byte-equal); 12 stay (guards' per-file lists). Merged.

## Next

- 6202 open: chip copies of the folk's baked sheets let go far from town
  (`?folksheets=0`), gpu line 114.3 -> 109.3, folk-sheets.test (DEPLOYS).
  Sitting 48: merge main after FX's #2194/#2200/#2203, re-generate M-tables.

## Found

- `mp-membudget`'s heap line (38.5) at its edge on main: EN's runs read
  38.5-39.1 with `?folksheets` on AND off (memory-budget.mjs).
- Re-baking the folk's 35 sheets took 78-88 s on this box (worker),
  so a free-and-re-bake road meets them plain: not taken.

## Needs

- (none: the planning session answered constants, suites and systems.mjs,
  2026-11-18). Planning session is now part 6
  (session_01LccHam7XmUNAHQrA1CjiNH); heads go to gatekeeper sitting 46.
- 6202: part 6's yeses (playerSkins.js, one switch row, the gpu line,
  framePacer.js MEM_LINES, src/state ledgers, server/test/folk-sheets).
