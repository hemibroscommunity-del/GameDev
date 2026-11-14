card: O
branch: claude/plan-o-4-rate (one branch a PR: claude/plan-o-<n>-<word>; each begun from the one before)
prs: #1787 (5221, ready), #1792 (5222, ready: after #1787), #1794 (5224, ready: sitting 11's hold mended)
state: ready

## Done

- #1787 (5221) `claude/plan-o-1-lanes`: the lane table and its reader, its
  guard, `docs/LANES.md`, the report's lane (`caps.report` 3,
  `reportlanes`), the worker's lists, the wire row. Deploys.
- #1792 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`. Deploys (server tests).
- #1794 (5224): the rate's knob (a 60 screen to a steady 30; a fast screen
  as before: (a)). Sitting 11's hold mended: the governor walks only the
  rungs of knobs marked moved (`liveKnobs`); a kept rung carries its live
  set; a cool phone after a hot sitting is back at 60 in one try
  (frame-pacer §19). `mp-governor` expects the rate's rung; its slow CPU
  no longer leaks into later scenarios.

## Next

- PR 5 (#1800): the mend merged up. Then PR 3 once #1792 is merged; PR 6.

## Found

- Shared lists (rule 3, TRAPS §333): `liveops.js`'s header (#1787
  `reportlanes`); `switches.mjs` (#1787 `?lane`, `reportlanes`; #1792
  `?govern`); `systems.mjs` (`drawLanes`); `src/state/phases.js` (`ladder`).
- No one field says a window covers the world: pixels move at a loading
  screen or a tab's return only.
- Card L: `ladder`'s `reset` is "kept: the device's"; M's BUDGETS #5, #7 kept.
- A 60 screen whose every frame costs 33 ms reads as 30 (`refreshOf` reads
  every call, drawn or passed: the rate's rung alone never does it).

## Needs

- Asked the planning session, 2026-11-14: a cool slow COMPUTER on a 60
  screen steps to 30 too: under "Decided for the owner while away"
  (`?govern=0`, `?ladderrate=0`), and a live flag? And #1800: a kept pixel
  rung (A: loaded without it, recommended; B: as the card).
