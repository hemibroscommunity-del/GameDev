card: E
branch: claude/plan-e-1-daybook (one branch a PR, each begun from the one before, as W's and H's are: merge them in order)
prs: PR 1 the day's book (working)
state: working

## Done

- (nothing merged yet)

## Next

- PR 1 (tag 5080), the day's book's frame: `server/src/daybook.js` (one
  door `bookAdd`, one put a 5-minute pace, 60 days pruned a page at a
  time, `daybook: false`), its suite, cost-guard §15 (13 rows an hour at
  most; the line is a number, so a faster pace fails it).

## Found

- The card's own text: committed byte for byte from
  `origin/claude/plan-x-cards` (e274b27), so #1682 merges clean.

## Needs

- Owner: the book loses at most one pace (5 minutes) of counts when the
  room empties and its worker is put to sleep before the next add. A
  one-line flush at "the last one out" (`server/src/leave.js`, beside the
  tick's stop) would close it, but that file is not on card E. May card E
  add that line, or is the 5-minute loss fine?
