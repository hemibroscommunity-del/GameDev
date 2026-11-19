card: EN
branch: claude/plan-en-6-pump (6205)
prs: #2189 6200, #2195 6201, #2207 6202, #2234 6203, #2255 6204 (merged), #2263 6205 (checks)
state: working

## Done

- #2255 (6204): HB's row 37, a peer's look prewarm in 4 ms slices, each its
  own task (budget-android, peer: main 25.4 ms x13 in 1 run of 3; PR 0 in 2);
  Z51's mend (PNG queue capped 600, drained after 15 s). Merged (sitting 52).
- #2234 (6203), #2207 (6202, `?folksheets=0`, gpu line 114.3 -> 109.3),
  #2195 (6201), #2189 (6200): merged.

## Next

- 6205: HB's row 23. A job asked for starts in a task of its own
  (`_pumpSoon`); a look job's answer is read in one of its own; the next job
  still goes from the worker's answer (a hop there slowed the bakes: a
  copperwaist frame unbaked). budget-android, peer: main `_runLookBake >
  reply` 12.0 / 20.9 ms in 2 of 3 runs; PR none in 3 of 3.
  Then 6206 (row 33), 6207 (the frame's folk).

## Found

- `mp-membudget`'s heap line (38.5) at its edge on main: EN's runs read
  38.3-39.1 with `?folksheets` on AND off (memory-budget.mjs).
- On this box, red on main as on 6203 (not EN's): `wornbake` (58-60 of 177
  frames baked in time), `fisharmour` a/b (no gauntlet px), `bakeleak`'s
  baseline guard, `heldsweep` peer/armour (`screen-check` 303 > 260).
- `copperwaist`'s iron guard (the equipped ids back to copper mid-stride)
  red once of three on 6204, once of two on 6205; reads getEquip, not pictures (told Z52).
- `state-census.mjs --check` fails on main too (the state page): no guard runs it.
- Re-baking the folk's 35 sheets took 78-88 s on this box (worker),
  so a free-and-re-bake road meets them plain: not taken.

## Needs

- (none). Planning session part 7 (session_01LccHaivkofvyigGL4fgBWZ);
  gatekeeper sitting 52 (session_01LccHaiB6Vh6BfVAavjcZ9b).
