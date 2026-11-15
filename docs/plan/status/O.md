card: O
branch: claude/plan-o-14-selftest (one branch a PR: claude/plan-o-<n>-<word>; begun from main 3876051)
prs: #1787, #1792, #1794, #1800, #1814, #1815, #1832, #1841, #1836, #1850, #1854 (merged); PR 14a (5234): ready
state: ready

## Done

- #1787 (5221) the lane table; #1792 (5222) the governor, `LANE._rung`.
- #1794 (5224) the rate's knob, live knobs; #1800 (5225) the pixels', (A).
- #1814 (5235) `govern`; #1815 (5227) the device asked only in
  `deviceProfile.js`; #1832 (5223) every phone test names its lane.
- #1836 (5226) the crowd cap a knob; #1841 (5228) `program` and `look`
  knobs, their fallbacks `OVERRIDES` asked of `deviceProfile.js` alone.
- #1850 (5229) the passes knobs; (A) revised: a kept rung keeps the rate.
- #1854 (5230): the strip slice the lanes' `queue` knob (4 ms; `thirty` 8).
- PR 14a (5234, ready): the self-test at the door, its frame; the one
  program and the colour numbers each draw a known picture and fall back
  alone; `self` in the report; `?selftest=fail:<name>`, `?selftest=0`.

## Next

- PR 14 is three (the planning session's word): 14b (5236) the look, the
  sharp pixels, the sheen, the shadows, and water (moved from 14a: its
  answer is not a pure recolour); 14c (5237) the clip, the fill, the glint.
- PR 11 (caches) waits for card P; 12 for card T's PR 6; 13 for card SK.

## Found

- Shared lists (rule 3, TRAPS §333): `switches.mjs` (`?lane`, `govern`,
  `?ladder*`, the `?onebatch`/`lookpalette` fallbacks); `systems.mjs`;
  `phases.js` (`ladder`); `DOOR_SUITES` (frame-pacer).
- A suite importing `src/rendering/**` stands in for `pixi.js` (CI installs
  only server/'s packages). Traps §225, §259: names now in `deviceProfile.js`.
- `mp-palette` is red on main 3876051 (4 of 15: shadow bases 6 of 13 and
  23 of 40; water 1364 px), the same with 14a: for card Z.

## Needs

- (none)
