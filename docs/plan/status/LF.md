card: LF
branch: claude/plan-hb2-12-narrowkeys (carries this file; later branches keep it true)
prs: #2276 (6292, ready), #2277 (6310, ready), 6291 (this branch: ready on opening); #2273 (6309): stopped
state: working

## Done
- Line 4: #2276 (6292, ground rule): precheck OK, level with main.
- Line 2: #2277 (6310, mp-quietphone): run by LF 2026-11-23 on the merged
  head 18c63fc6, this box: 15/15 pass, 1 named skip; precheck OK.
- Line 3: 6291 (narrow keys): LF run on this box, merged head: oneband all
  pass; deskkeys 60 asserts, 59 pass, 1 skip, 1 fail = 8f (not ours).
  Step 1's two lines changed as the planning session allowed (one file
  outside the card: mp-deskkeys.mjs).
- Line 5: EN.md done; HB2.md true; RR.md as its branch says.

## Next
- Line 1 (#2273, 6309) waits on the orchestrator (see Found).

## Found
- Line 1: mp-comeback red twice (2026-11-23, this box, #2273's head 988dddff
  with main merged): only 5b, "?thawjudge=0 rejoins as before": a socket
  opened (2 -> 3) but `__btThaw().rejoined` stayed 1, and `last` reads
  carried:true under the off switch. The fix was not reworked (card).
- deskkeys 8f stays red on main (CT's verdict).

## Needs
- The orchestrator's word on line 1.
