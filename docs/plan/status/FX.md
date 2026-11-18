card: FX
branch: claude/plan-fx-4-canvas-makers (on fx-3, on fx-2, on fx-1)
prs: #2190 6220 (ready), #2194 6221 (ready), #2200 6222 (draft), 6223 (draft)
state: ready

## Done

- #2190 (6220), ready: 40 level-0 leaves + 12 constants moved verbatim
  to src/rendering/leaves/effects-*.js; 6 suites re-keyed; main ed1abc20
  merged in (EN's #2189/#2195), M-tables.md re-generated (sitting 46).
- #2194 (6221), ready: the 7 level-1 leaves + 2 constants; held-sweep 9.
- #2200 (6222): ore rocks as numbers, projectile twins; artCache 13.4 ->
  11.2 (line kept 79.3 with framePacer.js's copy: Q8), buffers line 24.2
  -> 24.8 (net 1.7 MB less); tierore 74/74, magicburst 7/7.
- 6223: the 7 canvas makers kept as images (keepAsImage); beam and mote
  moved to the economy leaf; canvas-pictures 49 -> 41; effectsRenderer.js
  has no leaf left at any level. lootbeam 10/10, wheelbreak 30/30,
  membudget 11/11, questline 187/187.
- heldsweep sample (lands, fight) on the whole stack: 6/6 (main: 5/6,
  ui:GearTab 19.6 ms over).

## Next

- The card's four PRs are open. Merge main up the stack as each lands;
  retarget #2194, #2200, 6223 to main as their base merges (sitting 47).

## Found

- mp-membudget fails on main on this box: heap 38.3-39.2 (line 38.5),
  buffers 24.2-24.3 (line 24.2), three runs. Not FX's lines.
- heldsweep's lands/fight sample on main (ed1abc20): ui:GearTab 19.6 ms
  over its 12 ms line. Not FX's.
- precheck's server-tests sometimes times out here (the suite takes
  11-13 min): npm test run alone instead.

## Needs

- Nothing. The gatekeeper's sittings for the merges.
