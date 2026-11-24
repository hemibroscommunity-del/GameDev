card: DG
branch: claude/dg-wireform (PR 4), on claude/dg-books (PR 3), on claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1)
prs: #2283 (PR 1, 6440, ready, mended), #2295 (PR 2, 6441, ready, base main), #2300 (PR 3, 6442, ready), PR 4 (6443, working)
state: working

## Done
- PR 1 (6440, #2283): the running room refuses a write of a guarded field
  outside its door (testroom.mjs); mended for sitting 56 (roomGuard.holds;
  ECON_V + 1 for card WHO). Deploys when merged.
- PR 2 (6441, #2295): one scanner, tools/guards/lib/writesOf.mjs (the
  syntax tree), read by every door suite, the action door and wire-audit;
  allow-lists by file + function + field + count; the '*' rows name their
  files. Door plants of plants1-4 red by the scan alone, but SEND-2 (PR 6).
- PR 3 (6442, #2300): gold-door §10 and bag-door §10 run every road of
  GOLD_ROADS and BAG_ROADS on blank and carried records: the books moved
  exactly what the purse or bag moved. shape-books plant 1 red by §10;
  PAY2-1 red by PR 2's scan.

## Next
- PR 4 (6443, part 4): the wire door holds a named field to its form
  (wire/door.js WIRE_FORM; the table's `form` column); `wireform` absent
  refuses, `'count'` counts, `false` the old door (the orchestrator's
  answer, 2026-11-24: (a)); cap `wireForm` on its own line; counts on the
  owner's overview.  judge.mjs: every plant refused.  Counting the whole
  suite (test/wire-form-count.mjs), then bots, playable and mp-bank.

## Found
- none (no real second writer)

## Needs
- none

## Note
- PR 6's `sessions.clear()` / rebuilt `sessions` and `ws.send` through
  `bind` landed in PR 2 (they are the session and send doors' scans).
- PR 3 is stacked on 6441 and does not merge `main` (its diff stays its own).
- PR 4 is outside the card's list in: columns.js (the `form` column),
  admin.js (one line, the overview), bank.test §4 and caps-audit (the
  cap's row), the switch table and docs/SWITCHES.md, wire README, spec.
