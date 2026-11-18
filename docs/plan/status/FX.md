card: FX
branch: claude/plan-fx-3-ore-projectiles (on fx-2, on fx-1)
prs: #2190 6220 (ready), #2194 6221 (draft, CI), 6222 (draft)
state: ready

## Done

- #2190 (6220), ready: CI green at 381dc69 (test, playable,
  memory-budget, lint-build). 40 level-0 leaves (census at 5ea5c7d5) + 12 constants they
  read moved verbatim to src/rendering/leaves/effects-{look,skills,combat,
  ui,economy,render,social}.js (52 statements, 0 not verbatim); 6 suites
  re-keyed (planning session's Q2 (A)); npm test 557 green, questline
  187/187, membudget as main (heap/buffers on their lines on main too).

## Next

- #2194 (6221, on #2190): 7 level-1 leaves + 2 constants, verbatim;
  held-sweep 9 re-keyed; questline 187/187, membudget all green.
- 6222 (on #2194): ore rocks as numbers, projectile twins; artCache
  13.4 -> 11.2, buffers line 24.2 -> 24.8 (net 1.7 MB less); tierore
  74/74, magicburst 7/7, questline 187/187.
- Then 6223 (the canvas makers, §253).

## Found

- mp-membudget fails on main on this box: heap 38.3-39.2 (line 38.5),
  buffers 24.2-24.3 (line 24.2), three runs. Not FX's lines.
- precheck's server-tests times out here (the suite takes 11-13 min):
  npm test run alone instead.

## Needs

- #2190 clashes with EN's #2189 in M-tables.md: EN merges first; main
  merged in when gatekeeper 46 asks (planning session, 2026-11-18).
- Q8 (planning session): lower artCache 79.3 -> 77.1 with framePacer.js
  MEM_LINES's copy (frame-pacer.test 23a), or keep 79.3 as v2.3.5982 did?
