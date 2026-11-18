card: RD
branch: claude/plan-rd-2-crowdfight (one PR a branch, claude/plan-rd-*)
prs: #2191 (6180) itemdrop 5b: merged; (6181) crowdfight: working
state: working

## Done
- #2191 (6180) itemdrop 5b: the TEST's (aged past its end; 0.6 fps at
  dpr 2). Merged.

## Next
- crowdfight "knew every bot" (6181): the TEST's, TRAPS §200. On this box
  the dpr-3 page among 30 bots draws a frame every few seconds and, reading
  each gap as a phone come back, rejoins every 5-20 s ("resume-resync thaw
  away Ns, forcing rejoin": wsClient.js _resumeRecover, RESYNC_AWAY_MS).
  It heard the step's 10 new bots after ~100 s; the test gave it 60 s of
  the wall clock (20 known). Fix: wait until it knows them, up to 240 s,
  rejoins and seconds in the row. Five full runs going.
- Then manualcombat 10a (6182; edit drafted: the drawn bow looses on the
  release, docs/specs/bow-feel.md "A computer"), then jumpbtn (6183,
  added by the planning session).

## Found
- tools/qa/mp/mp-itemdrop.mjs's 6a went red once in 15 runs at dpr 2 with
  nothing to read; it now names its step (#2191).

## Needs
