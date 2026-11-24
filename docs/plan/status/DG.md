card: DG
branch: claude/dg-books (PR 3), on claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1)
prs: #2283 (PR 1, 6440, ready: part 3's sitting 57 mend), #2295 (PR 2, 6441, ready: sitting 57's mends), #2300 (PR 3, 6442, tests only)
state: ready

## Done
- Sitting 57's hold on #2295 (review-z57.md): the three planted lines are
  red in their own guards, read off the syntax tree (writesOf.mjs and
  action-door.test.mjs): an item changed through `.find(...)` / `.at(i)` /
  a `forEach` / `map` / `reduce` callback, on the stash or a filtered copy
  of it (stash-door); `Object.assign(ps, patch)` with `patch` a name of an
  object (filled after, spread, a ternary) and a helper handed the record
  and the key (`bump(ps, 'coins', n)`, its callers' words) (gold-door);
  `S['channel'].send(m)` (the receiver's key read as a node) and `const go
  = fetch` / `fetch.bind` / `fetch.call` / `window['fetch']` (action-door
  §7). Each planted in a real file and run in its suite: RED; each also a
  case of writes-of.test.mjs and action-door §7, with the reads beside them.
- Sitting 57's CI (#2295 red): doorHolders walks each file once (gold-door
  46 s -> 4.6 s); PR 1's heap-forget mends merged in (part 3's, a98fff04).
- PR 2 (6441): one scanner, tools/guards/lib/writesOf.mjs, for every door
  test; door plants of plants1-4 red by the scan alone, but SEND-2 (PR 6's).
- PR 1 (6440, #2283): the running room refuses (part 3 is its caretaker).
- PR 3 (6442): gold-door §10 and bag-door §10 run EVERY road of GOLD_ROADS
  and BAG_ROADS, and every MAIL_CLASSES word on the mail road, on a blank
  record and carried ones, several amounts, step 2's sum on and off (the
  bag: named, and waiting then folded): the record's `_econ` and the day's
  book moved exactly what the purse or count moved (mint, burn) or nothing
  (move, escrow, a load); `econ: false` moves the same, books nothing.
  shape-books plant 1 red by §10; PAY2-1 red by PR 2's scan (§3), which a
  books check cannot see (a doubled mint books what it moves).

## Next
- Sitting 58 (2026-11-25): #2283, #2295, #2300 together.
- PR 4 (6443): card DG part 4's, on claude/dg-books.
- testroom §7 tries four fields (Z's Found): PR 1's line, the running
  room's proof, not the scans' (one system a PR): for a later PR of the
  card.

## Found
- none (no real second writer: the wider reads found nothing new in
  server/src or src/)

## Needs
- none

## Note
- A Map's `.get(k)` is not an element of the container (a session got from
  `sessions` is no write of the map: session-door).
