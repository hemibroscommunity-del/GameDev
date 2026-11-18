card: EN
branch: claude/plan-en-5-peerprewarm (6204; 6203 #2234 on plan-en-4-canvas)
prs: #2189 6200, #2195 6201, #2207 6202 (merged), #2234 6203 (ready), 6204 (checks)
state: working

## Done

- #2207 (6202): the folk's baked sheets off the chip far from town
  (`?folksheets=0`); gpu line 114.3 -> 109.3. Merged (sitting 48).
- #2195 (6201): levels 1-3 (19 functions, 4 constants), 112/112
  byte-equal; entityRenderer.js 7900 code lines. Merged.
- #2189 (6200): 72 of 84 level-0 leaves + 17 constants moved (89/89
  byte-equal); 12 stay (guards' per-file lists). Merged.

## Next

- 6204: HB's row 37, a peer's look prewarm in 4 ms slices, each its own
  task (budget-android, peer: main 25.4 ms x13 in 1 run of 3; PR 0 in 2);
  plus Z51's mend of 6203: the PNG queue capped (600), drained after 15 s.
  Then 6205 (row 23), 6206 (row 33), 6207 (the frame's folk).

## Found

- `mp-membudget`'s heap line (38.5) at its edge on main: EN's runs read
  38.5-39.1 with `?folksheets` on AND off (memory-budget.mjs).
- On this box, red on main as on 6203 (not EN's): `wornbake` (58-60 of 177
  frames baked in time), `fisharmour` a/b (no gauntlet px), `bakeleak`'s
  baseline guard, `heldsweep` peer/armour (`screen-check` 303 > 260).
- `state-census.mjs --check` fails on main too (the state page): no guard runs it.
- Re-baking the folk's 35 sheets took 78-88 s on this box (worker),
  so a free-and-re-bake road meets them plain: not taken.

## Needs

- (none: the planning session answered constants, suites and systems.mjs,
  2026-11-18). Planning session is now part 7
  (session_01LccHaivkofvyigGL4fgBWZ); it starts sitting 48 with #2207.
- 6202: part 6's yeses (playerSkins.js, one switch row, the gpu line,
  framePacer.js MEM_LINES, src/state ledgers, server/test/folk-sheets).
