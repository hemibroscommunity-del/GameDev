card: CK
branch: claude/ck-asset-git-ids (one PR a branch, claude/ck-*; on #2284's)
prs: #2284 (6420, ready), (6421) asset guards by git's ids: working
state: working

## Done
- (6420) #2284: switches-thrown throws on a PR what it touched and a few
  by the commit; `--whole` once a sitting (the gatekeeper). Docs branch's
  suite 979 -> 215.5 s (claims-gain 162 s, card BK's); plants A, B red.
- (6421) asset guards by git's ids: a file whose git id and row are
  main's is trusted (its size read); the rest hashed; 6 and 7 read only
  what is not main's (all when a reader changed); 6's census by change,
  a family that rose counted whole; the gatekeeper's precheck hashes all
  (BT_ASSETS_WHOLE=1). Plants 9-11 and sources 4-5 red, here and committed.

## Next
- (6421) precheck, push, open READY (stacked on #2284: merge after it);
  then 6422 (one parse of the big files), 6423 (the bookkeeping).

## Found
- docs/specs/switch-table.md line 165 ("On every PR only the rows born
  from tag 5301 on run"): stale after 6420 (not this card's file).
- server/test/claims-gain.test.mjs (card BK's): 162 s alone here
  (`time node test/claims-gain.test.mjs`), its header says about 25 s:
  the whole suite cannot be under 120 s while it is.
- server/test/run.mjs: a name picks every suite whose name holds it
  (`npm test -- switches` runs switches-thrown too): PR 4's file.
- switches-thrown's changedFiles finds main as lib/sinceMain.mjs does:
  one could serve both (6423 or later; mine).

## Needs
- None. (Answered by the orchestrator, 2026-11-23: #2284 goes to the
  gatekeeper as it is; its 120 s shortfall is claims-gain's, card BK's.)
- PR 5 waits on the owner's own words, two changes under `.github/`:
  (a) server-ci.yml: `concurrency: { group: <workflow>-<ref>,
  cancel-in-progress: true }`, so a newer push cancels the older run
  (each push 22 to 43 paid minutes); (b) the required `test` job ends
  green at its first step when the PR changes only `docs/` (a step that
  diffs against main, never a path filter on the trigger: TRAPS 238),
  saving a whole suite run on every documents-only push.
