card: CK
branch: claude/ck-checks-cost (one PR a branch, claude/ck-*)
prs: (6420) switches-thrown on a PR: opening
state: working

## Done
- (6420) switches-thrown: on a PR it throws the rows the branch touched
  (the row's line, its system's files, a file that reads it, a suite it
  runs) and a few chosen by the commit (60 suite runs); `--whole` is the
  old set (89 rows), run once a sitting by the gatekeeper as its own step
  (precheck leaves it to that step there); `--list` says what and why.
  GitHub's one-commit checkout: main fetched by the merge's first parent
  (tried on a depth-1 clone; unreachable: the few only, said).

- (6420) measured here: a docs branch's whole suite 979 -> 215.5 s
  (154.7 s without claims-gain; switches-thrown 894 -> 13 s); plant A
  (join.js, `lookjoin`'s off path) red on its PR, 55 s; plant B (index.js,
  `cleanmore`'s, not touched) green on its PR, red at `--whole` (773 s).

## Next
- HANDED OVER at the memory line (244,000 tokens) after 6420: a fresh
  session takes the card from PR 2 (6421, the asset guards by git's ids).
- The plants (by hand, not in any PR): A `join.js` line 522 drop
  `&& this._lookJoinOn()`; B `index.js` room chat
  `text = this._cleanMoreOn() ? this._chatGuardClean(text) : text;`.

## Found
- docs/specs/switch-table.md line 165 ("On every PR only the rows born
  from tag 5301 on run"): stale after 6420 (not this card's file).
- server/test/claims-gain.test.mjs (card BK's): 162 s alone here
  (`time node test/claims-gain.test.mjs`), its header says about 25 s:
  the whole suite cannot be under 120 s while it is.
- server/test/run.mjs: a name picks every suite whose name holds it
  (`npm test -- switches` runs switches-thrown too): PR 4's file.

## Needs
- The orchestrator: the 120 s line of PR 1 is not met while
  claims-gain (card BK's) takes 162 s alone; open it as it is, or hold?
