card: CT
branch: claude/plan-ct-2-stick (PR 2) and claude/plan-ct-3-right (PR 3)
prs: #2282 (6540, merged), #2293 (6541, ready: sitting 58's hold mended), #2308 (6542, draft)
state: working

## Done
- PR 1 (6540, #2282): merged at sitting 57.
- PR 2 (6541, #2293): the left stick, step `input`. Sitting 57's eight
  plants red (stick-zones 8, 7b). Sitting 58's hold mended (part 5): the
  idle clock is stickFrame's own (Date.now(), the idle judge's; no clock
  handed in), three minutes of walking played on that clock; the walk's
  binding followed off the syntax tree (`_in` read only as `_in.dx/_in.dy`,
  each the whole start of dx/dy; gameLoop reads no stick and hides S from
  nothing; every reader of the stick in src/ on a closed list). 16 plants
  red, tried by hand. The card's +44 (item 6, tag 6545) named in the PR's
  words as the orchestrator's addition.
- PR 3 (6542, #2308 draft, stacked): the latch wired, the lock, S.stickX/Y
  one owner (stickAnalog, stickLift; stick-zones 9).

## Next
- PR 3: mp-twobuttons 2c mended (claude/plan-ct-3-helper, f3ba66dd): one
  helper run (session_01LccHaiTxWSWL6uNTsEJoZL). Green: PR 2 merged up,
  main merged, precheck, push, #2308 ready. Red: mend 2c, run again.
- Then PR 4 (6543), PR 5 (6544), item 6 (6545).

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6`.
- On this box a CDP flick cannot be a swipe: each touch waits behind a
  frame of a few hundred ms (past the swipe's 300 ms), and moves sent with
  no frame between are coalesced into a tap (mode 4 too; mp-twobuttons 1f).

## Needs
- The two OWNED rows (stickX, stickY pinned to `input`, OWNED_LINE + 2 in
  WL's `tools/guards/state-ledger.test.mjs`: approved by the orchestrator,
  2026-11-24) land when #2290 is on `main` (merged in before the last push).
- Approved: PR 1's mechanical rows; PR 2's frame-steps WANT + 'input';
  the ledgers' machine rows for moved writers (`--write`).
