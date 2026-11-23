card: DG
branch: claude/dg-door-guards
prs: PR 1 (tag 6440) finishing: the whole suite, then opened
state: working

## Done
- PR 1 (6440), in hand: testroom.mjs arms a guard on every live player's
  record (gold, hp and the life phase, xp and level, the bag, the stashes,
  quest state, build points): a write outside its door is refused and fails
  the suite. The 7 door suites play a tour (a quest handed in) under it.
  plants1.json: 18 of 23 RED; the 5 GREEN write nothing on the path
  (`||=` on a field already set: GOLD-2, XP-2, HP-4; a branch the reward
  never takes: HP-2, STASH-1) or call a legal door (GOLD-4): PR 2's scan.

## Next
- PR 1: the whole suite green, precheck, push, open ready.
- PR 2 (6441): tools/guards/lib/writesOf.mjs (drafted, finds every door
  plant's spelling), the door tests moved onto it.

## Found
- none yet

## Needs
- none
