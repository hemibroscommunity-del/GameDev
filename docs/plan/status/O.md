card: O
branch: claude/plan-o-8-program (one branch a PR: claude/plan-o-<n>-<word>; main 64bb498 merged in)
prs: #1787, #1792, #1794, #1800, #1814, #1815, #1832 (merged); #1841 (5228, sitting 16), #1836 (5226: after #1837), #1850 (5229): ready; PR 10 (5230, working)
state: ready

## Done

- #1787 (5221) the lane table; #1792 (5222) the governor, `LANE._rung`.
- #1794 (5224) the rate's knob, live knobs; #1800 (5225) the pixels', (A).
- #1814 (5235) `govern` on the Test panel; #1815 (5227) the device asked
  only in `deviceProfile.js`; #1832 (5223) every phone test names its lane.
- #1836 (5226): the crowd cap a knob (50, 30, 15); `?laddercrowd=0`; a
  crowd step that hides no one is passed (sitting 15's medium).
- #1841 (5228): `program` and `look` knobs; their fallbacks `OVERRIDES`
  asked of `deviceProfile.js` alone; `one-program.test` (new).
- #1850 (5229): the passes (shine, shadows, still water) knobs of the chip
  axis after the rate; `?ladderpass=0`; (A) revised: a kept rung keeps the
  rate only (the planning session's word); `ladder-passes.test` (new).
- PR 10 (5230): the strip slice the lanes' `queue` knob (4 ms; `thirty` 8),
  never the frame's length; BUDGETS part 8's #6 gone.

## Next

- #1836 has #1837's head (036d9b4) merged in: it lands right after #1837.
- PR 11 (caches) waits for card P; 12 for card T's PR 6.

## Found

- Shared lists (rule 3, TRAPS §333): `switches.mjs` (`?lane`, `govern`,
  `?ladder*`, the `?onebatch`/`lookpalette` fallbacks); `systems.mjs`;
  `phases.js` (`ladder`); `DOOR_SUITES` (frame-pacer).
- A suite importing `src/rendering/**` stands in for `pixi.js` (CI installs
  only server/'s packages): #1841's first push was red on it.
- For card Z: traps census §225, §259 name names now in `deviceProfile.js`.

## Needs

- (none)
