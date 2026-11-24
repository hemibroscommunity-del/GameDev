card: DG
branch: claude/dg-door-guards
prs: #2283 (PR 1, 6440, ready again: sitting 57's CI mend)
state: ready

## Done
- Sitting 57's CI (#2295 red, heap-forget 4,167 B a guest): the guard let
  go of a record only at a sweep after a full collection (+1 KB a guest,
  test room only); now a record leaving the room's map is checked once and
  let go (340 B a guest; plants1 still 17 of 23 red).
- PR 1 (6440): testroom.mjs arms a guard on every live player's record
  (gold, hp and the life phase, xp and level, the bag, the stashes, quest
  state, build points): a write outside its door is refused and fails the
  suite. The 7 door suites play a tour (a quest handed in) under it.
  plants1.json: 17 of 23 RED (16 of 22 realistic); the 6 GREEN write nothing on the path
  (`||=` on a field already set: GOLD-2, XP-2, HP-4; a branch the reward
  never takes: HP-2, STASH-1) or call a legal door (GOLD-4): PR 2's scan.
  Whole server suite: 582 green (799.7 s). Deploys when merged.
- PR 1's mend (sitting 56's purpose review): `roomGuard.holds(ps, room)`
  reads the record itself (coins the guard's accessor, the bag its Proxy,
  the room's map the guarded one); each door's R block checks it, and
  testroom.test §7 records a refusal of 4 spellings run as worker code.
  Red now: guardRecord gutted (gold, life, testroom); `playerState` an own
  data property (gold, bag; gold with GOLD-1 on top). Also `ECON_V + 1` in
  gold-door §9 and bag-door §9 (card WHO's shape bump, the orchestrator's ask).

## Next
- PR 2 (6441), on branch claude/dg-scans: the scans read the syntax tree.

## Found
- none

## Needs
- none
