card: DG
branch: claude/dg-books (PR 3), on claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1)
prs: #2283 (PR 1, 6440, CI mend), #2295 (PR 2, 6441, CI mend), #2300 (PR 3, 6442, ready); all base main
state: ready

## Done
- Sitting 57's CI (#2295 red): doorHolders walked every file once a name
  (gold-door 1 s -> 46 s, past switches-thrown's 180 s): one walk a file
  (4.6 s; GOLD-4 still red); PR 1's guard lets go of a record leaving the
  room's map (heap-forget, +1 KB a guest in the test room), merged in.
- PR 1 (6440, #2283): the running room refuses a write of a guarded field
  outside its door (testroom.mjs); mended for sitting 56 (roomGuard.holds;
  ECON_V + 1 for card WHO). Deploys when merged.
- PR 2 (6441, #2295): one scanner, tools/guards/lib/writesOf.mjs (the
  syntax tree), read by every door suite, the action door and wire-audit;
  allow-lists by file + function + field + count; the '*' rows name their
  files. Door plants of plants1-4 red by the scan alone, but SEND-2 (PR 6).
- PR 3 (6442): gold-door §10 and bag-door §10 run EVERY road of GOLD_ROADS
  and BAG_ROADS, and every MAIL_CLASSES word on the mail road, on a blank
  record and carried ones, several amounts, step 2's sum on and off (the
  bag: named, and waiting then folded): the record's `_econ` and the day's
  book moved exactly what the purse or count moved (mint, burn) or nothing
  (move, escrow, a load); `econ: false` moves the same, books nothing.
  shape-books plant 1 red by §10; PAY2-1 red by PR 2's scan (§3), which a
  books check cannot see (a doubled mint books what it moves).

## Next
- PR 4 (6443): the wire door holds a field to a form (behaviour: count
  mode first, its cap on its own line, a kill switch).

## Found
- none (no real second writer)

## Needs
- none

## Note
- PR 6's `sessions.clear()` / rebuilt `sessions` and `ws.send` through
  `bind` landed in PR 2 (they are the session and send doors' scans).
- PR 3 is stacked on 6441 and does not merge `main` (its diff stays its own).
