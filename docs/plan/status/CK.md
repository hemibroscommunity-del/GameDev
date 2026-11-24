card: CK
branch: claude/ck-one-parse (one PR a branch, claude/ck-*; on #2288's)
prs: #2284 (6420, ready), #2288 (6421, ready; on #2284), (6422) not begun
state: working

## Done
- (6420) #2284: switches-thrown throws on a PR what it touched and a few
  by the commit; `--whole` once a sitting (the gatekeeper). Docs branch's
  suite 979 -> 215.5 s (claims-gain 162 s, card BK's); plants A, B red.
- (6421) #2288: asset guards trust what is main's by git's ids; in the
  suite door 16.5 -> 0.23 s, sources 13.2 -> 0.07 s; docs suite 164.8 s.

## Next
- HANDED OVER (part 2, ~200k tokens) before 6422. Measured alone here:
  ladder-passes 20.3 s is IDLE (cpu-prof: 20 s idle): green, it ends
  without process.exit and a timer (framePacer makeGovernor?) holds it;
  picture-door 7 s, 6.5 s of it `blank()` (line 100) run again on the
  same texts (a Map of each text's blank); phase-table 7 s, babel's
  traverse and GC. So "one parse kept by git id" fits phase-table only.

## Found
- docs/specs/switch-table.md line 165 ("On every PR only the rows born
  from tag 5301 on run"): stale after 6420 (not this card's file).
- server/test/claims-gain.test.mjs (card BK's): 162 s alone here
  (`time node test/claims-gain.test.mjs`), its header says about 25 s:
  the whole suite cannot be under 120 s while it is.
- server/test/run.mjs: a name picks every suite whose name holds it
  (`npm test -- switches` runs switches-thrown too): PR 4's file.
- switches-thrown's changedFiles and lib/sinceMain.mjs both find main.

## Needs
- 6422 changes ladder-passes, picture-door, phase-table: not in the
  card's hold list. May it, and is the per-suite mend PR 3?
- PR 5 waits on the owner's own words, two changes under `.github/`:
  (a) server-ci.yml: `concurrency: { group: <workflow>-<ref>,
  cancel-in-progress: true }`, so a newer push cancels the older run
  (each push 22 to 43 paid minutes); (b) the required `test` job ends
  green at its first step when the PR changes only `docs/` (a step that
  diffs against main, never a path filter on the trigger: TRAPS 238),
  saving a whole suite run on every documents-only push.
