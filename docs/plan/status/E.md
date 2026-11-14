card: E
branch: claude/plan-e-1-daybook (one branch a PR, each begun from the one before, as W's and H's are: merge them in order)
prs: PR 1 the day's book on the branch above (ready; its number goes here with PR 2's commit, to spare a paid run)
state: ready

## Done

- PR 1 (5080), the day's book's frame: `server/src/daybook.js` (one door
  `bookAdd`, one put a 5-minute pace, 60 days pruned a page at a time,
  `daybook: false`), `daybook.test` (77), cost-guard §15 (13 rows an
  hour; break proof: a 1-minute pace writes 60 and fails). Touches
  `server/`: its merge deploys the worker. Card A may build on it.

## Next

- PR 2 (tag 5081), the roads' classes.

## Found

- The card's own text: committed byte for byte from
  `origin/claude/plan-x-cards` (e274b27), so #1682 merges clean.

## Needs

- Owner: the book loses at most one pace (5 minutes) of counts when the
  room empties and its worker is put to sleep before the next add. A
  one-line flush at "the last one out" (`server/src/leave.js`, beside the
  tick's stop) would close it, but that file is not on card E. May card E
  add that line, or is the 5-minute loss fine?
