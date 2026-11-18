card: FX
branch: claude/plan-fx-2-effects-leaves (stacked on claude/plan-fx-1-effects-leaves)
prs: #2190 6220 (ready), 6221 (working: draft)
state: ready

## Done

- #2190 (6220), ready: CI green at 381dc69 (test, playable,
  memory-budget, lint-build). 40 level-0 leaves (census at 5ea5c7d5) + 12 constants they
  read moved verbatim to src/rendering/leaves/effects-{look,skills,combat,
  ui,economy,render,social}.js (52 statements, 0 not verbatim); 6 suites
  re-keyed (planning session's Q2 (A)); npm test 557 green, questline
  187/187, membudget as main (heap/buffers on their lines on main too).

## Next

- 6221 (stacked on #2190): the 7 level-1 leaves + LEGS_LOOK_OFF and
  MSG_MAX_LINES, verbatim (61 statements in all, 0 not verbatim);
  held-sweep 9 re-keyed; npm test 566 green after it, questline 187/187,
  membudget all green. Ready once CI is.
- Then 6222 (ore numbers, projectile twins), then 6223 (canvas makers).

## Found

- mp-membudget fails on main on this box: heap 38.3-39.2 (line 38.5),
  buffers 24.2-24.3 (line 24.2), three runs. Not FX's lines.
- precheck's server-tests times out here (the suite takes 11-13 min):
  npm test run alone instead.

## Needs

- #2190 clashes with EN's #2189 in M-tables.md: EN merges first; main
  merged in when gatekeeper 46 asks (planning session, 2026-11-18).
- 6222: answered (part 6): files outside approved, existing off-ramps
  ?treenumbers=0 / ?p256=0, buffers measured both ways.
