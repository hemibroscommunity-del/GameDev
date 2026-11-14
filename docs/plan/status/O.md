card: O
branch: claude/plan-o-15-govoff (one branch a PR: claude/plan-o-<n>-<word>; this one begun from #1800)
prs: #1787 (merged); #1792, #1794, #1800, the switch (5222-5225, 5235; in that order); PR 7
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

- The switch (5235): `govern` on the Test panel's list, in place of the
  card's cap (the planning session's word). PR 7 (5227): the device asked in
  one place. PR 3 once #1792 merges; PR 6 waits (`entityRenderer.js`).

## Found

- Shared lists (rule 3, TRAPS §333): `liveops.js`'s header (#1787
  `reportlanes`); `switches.mjs` (`?lane`, `reportlanes`; `?govern`, made
  `govern` both sides by 5235); `systems.mjs`; `phases.js` (`ladder`).
- No one field says a window covers the world: pixels move at a loading
  screen or a tab's return only.
- Card L: `ladder`'s `reset` is "kept: the device's"; M's BUDGETS #5, #7 kept.
- A 60 screen whose every frame costs 33 ms reads as 30 (`refreshOf` reads
  every call, drawn or passed: the rate's rung alone never does it).

## Needs

- #1792 held to sitting 12 (with it #1794, #1800): its `DOOR_SUITES` row
  once today's list lands (card L's guard; the planning session's answer).
