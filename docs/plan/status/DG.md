card: DG
branch: claude/dg-door-guards
prs: PR 1 (6440) opened ready (see Done)
state: ready

## Done
- PR 1 (6440): testroom.mjs arms a guard on every live player's record
  (gold, hp and the life phase, xp and level, the bag, the stashes, quest
  state, build points): a write outside its door is refused and fails the
  suite. The 7 door suites play a tour (a quest handed in) under it.
  plants1.json: 17 of 23 RED (16 of 22 realistic); the 6 GREEN write nothing on the path
  (`||=` on a field already set: GOLD-2, XP-2, HP-4; a branch the reward
  never takes: HP-2, STASH-1) or call a legal door (GOLD-4): PR 2's scan.
  Whole server suite: 582 green (799.7 s). Deploys when merged.

## Next (HANDOVER: this session's memory passed 250,000 tokens)
- A fresh session takes PR 2 (6441). Start from branch
  `claude/dg-pr2-draft` (no PR; pushed only to keep the work): it holds
  `tools/guards/lib/writesOf.mjs`, the drafted scanner, and
  `docs/plan/census/dg-pr2-draft.md`, what it finds and what is left.
  Base PR 2 on `claude/dg-door-guards` (PR 1) or on main once PR 1 merges.
- The plant files are only in PR #2275: `git show
  origin/claude/game-grand-plan-combat-6v7yq4:tools/dev/plants/<file>`.
  `cd server && npm install` first (@babel for the scanner).

## Found
- none

## Needs
- none
