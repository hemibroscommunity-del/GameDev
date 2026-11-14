card: O
branch: claude/plan-o-6-crowd (one branch a PR: claude/plan-o-<n>-<word>; begun from main)
prs: #1787, #1792, #1794, #1800, #1814, #1815 (merged); #1832 (5223, PR 3: ready, LAST in its sitting), PR 6 (5226, ready)
state: ready

## Done

- #1787 (5221): the lane table, its reader and guard, the report's lane.
- #1792 (5222): the governor (the pacer, grown), its model, `mp-governor`;
  the rung on a module object (`LANE._rung`), its `DOOR_SUITES` row.
- #1794 (5224): the rate's knob; sitting 11's hold mended (live knobs).
- #1800 (5225): the pixels' knob, (b), (A); sitting 12's three mended (the
  pixels an axis of their own, tried up last).
- #1814 (5235): `govern` on the Test panel's list (the owner's switch).
- #1815 (5227): the device asked only in `deviceProfile.js`.
- PR 3 (5223): every phone test names its lane: 381 scenario files
  (`tools/dev/name-lanes.mjs`), `run.mjs` refuses one without, the harness
  puts `lane=` on every page, `tools/qa/lane.mjs` for the other tools, the
  guard `scenario-lanes`; `mp-governor` asks `govern`.
- PR 6 (5226): the crowd cap a knob (50, 30, 15; `crowdK()`, asked every
  frame); `?laddercrowd=0`; `crowd-cap` §4.

## Next

- #1832 (PR 3) merges LAST in its sitting; the gatekeeper runs
  `node tools/dev/name-lanes.mjs` on the rehearsal's tip first.
- PR 8 (one program or three, how a look is made): TF is done (#1828).

## Found

- Shared lists (rule 3, TRAPS §333): `liveops.js`'s header (`reportlanes`);
  `switches.mjs` (`?lane`, `reportlanes`, `govern` both sides, `?ladder*`);
  `systems.mjs`; `phases.js` (`ladder`); `DOOR_SUITES` (frame-pacer).
- PR 3 touches every `tools/qa/mp/mp-*.mjs`: any branch adding or changing
  a scenario meets it (the script writes a new file's line).
- A 60 screen whose frames all cost 33 ms reads as 30 (`refreshOf`).

## Needs

- (none)
