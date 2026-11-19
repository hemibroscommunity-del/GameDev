card: EN
branch: claude/plan-en-8-folk (6207)
prs: #2189 6200, #2195 6201, #2207 6202, #2234 6203, #2255 6204, #2263 6205 (merged), 6206 unused, #2274 6207 (draft, CI)
state: paused (planning session, 2026-11-19: the owner's usage; until Monday)

## Done

- #2263 (6205): row 23. A job asked for starts in a task of its own, a look
  job's answer is read in one; the next job still goes from the worker's
  answer. Peer, budget-android: main 12.0/20.9 ms in 2 of 3; PR none in 3.
- Row 33 closed by 6205 (planning, 2026-11-19): masked-bake 7.7 ms at peer,
  8.1 at armour (21.3 before); a 4 ms slicing gained nothing: 6206 unused.
- #2255 (6204, row 37: a peer's prewarm in 4 ms slices; the PNG queue capped),
  #2234 (6203), #2207 (6202, `?folksheets=0`, gpu line 114.3 -> 109.3),
  #2195 (6201), #2189 (6200): merged.

## Next

- Monday: #2274 (6207, off-screen townsfolk not posed; -9% at peer) CI ->
  ready -> gatekeeper. Then card EN is done.

## Found

- If a crowd ever needs it (planning: not now): skip a townsperson's posing
  while his pose/facing/frame/size/body are unchanged: 44% of draws at peer
  (more at 60 fps); 250 ms refresh, so late art could show 250 ms late.
- For the next card: the belt's gear sheet first built on the page,
  gearSheets.js `getGearFrame > buildSheet > _buildShirtOnWorker`
  (`gear-sheet`, 34.7-40.6 ms at peer on budget-android, main and branch).
- `mp-membudget`'s heap line (38.5) is main's own edge (38.3-39.1 on EN's
  runs since 6202; sitting 53's A/B: `?keepimage=0` the same).
- On this box, red on main as on 6203 (not EN's): `wornbake`, `fisharmour`
  a/b, `bakeleak`'s baseline guard, `heldsweep` (`screen-check` 303 > 260).
- `copperwaist`'s iron guard (getEquip back to copper): EN 3 of ~6 runs,
  main 0 of 4 (c0a0791c); 6205 merged, runs on it to follow.

## Needs

- (none). Planning part 7 (session_01LccHaivkofvyigGL4fgBWZ); gatekeeper 54
  (session_01LccHajNEjqHLh7oJ6yVsxL).
