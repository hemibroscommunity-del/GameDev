card: WD2
branch: claude/plan-wd2-1-say (one PR a branch, claude/plan-wd2-*, each stacked on the last)
prs: #2211 (6320) ready; PRs 2-11 (6321-6330) stacked, base main
state: ready

## Done
- (none merged yet)

## Next
- PR 1 (6320) W0: src/game/say.js (say, sayPieces), tools/guards/say.test.mjs,
  src/data/say/clanInvite.js, ClanInviteCard through it. In place 4995 -> 4990.

## Found
- (none yet)

## Needs
- Nothing. Answered by the planning session, 2026-11-18: Q1 yes (`say` in
  systems.mjs's `desktop` list, docs/SYSTEMS.md re-written); Q2 yes
  (sayPieces); Q3 yes (a server/test check that reads a screen's words by
  text is re-pointed to its src/data/say file, one line each, in a PR marked
  "DEPLOYS: server/test" for the gatekeeper to batch; no server/src edits).
