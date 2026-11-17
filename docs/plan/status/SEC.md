card: SEC
branch: claude/plan-sec-<n>-<topic> (one a PR; PR 2 on PR 1's branch until #2030 merges)
prs: #2030 (5700, the card): ready; PR 2 (5701, the join's id form): ready
state: ready

## Done

- PR 1 (5700, #2030): the card, this file and the block SEC (ready, sent to sitting 36).
- PR 2 (5701): a join's id is 1 to 64 of A-Z a-z 0-9 _ or refused as a
  magic name is (join.js `joinIdMalformed`; switch `joinidform`; suite
  `joinid.test`, red on main: 58 FAIL; a one-item list `['bp_x']` wrote
  `auth:bp_x`, a real character's own key).

## Next

- PR 3 (5702): a refused vault write owed, written with the character's
  next save in one put; the leave writes both (bank.js, persistence.js,
  leave.js, linger.js).

## Found

- A join with NO id is let in as `session.id` undefined: a body under
  `playerState.undefined` and a `cadence:login:undefined` row, shared by
  every such join (join.js; PR 2's card covers an id present only).

## Needs

- Card L (asked by message 2026-11-17): does it hold
  src/networking/gameEvents.js? PR 14's first half waits on the answer.
