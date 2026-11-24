card: CT
branch: claude/plan-ct-2-stick (PR 2) and claude/plan-ct-3-right (PR 3)
prs: #2282 (6540, merged), #2293 (6541, held at 59, frozen), #2308 (6542, draft)
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
  red, tried by hand; the card's +44 (item 6) named as the orchestrator's.
  Head bfd443e9 green, frozen (held at 59: the owner is asked).
- Sitting 59's mend rides PR 3 (the orchestrator's word): §8's writes of
  dx/dy an ALLOW list (WALK_WRITES: the statement, its `if`, counted; only
  falls), followed by the binding; both plants and eight of my own red.
- PR 3 (6542, #2308 draft): the latch, the lock, S.stickX/Y one owner.

## Next
- PR 3 (#2308): sideways 2c's fight red on ea3175e7 (43 swings in 90 s,
  a fishman 25 px off at 1 hp). Part 7: the BOX's. The hit test runs only
  on a frame 120-400 ms into a swing; ~0.7 s frames miss it. The test
  counts swings that reached it (S._propSwingAt) and the frame: none, at
  a frame over 280 ms, a SKIP (TRAPS 200); else red. Then #2308 ready.

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6`.
- This box: a CDP flick waits behind a slow frame, past the swipe's 300 ms
  (mode 4 too; mp-twobuttons 1f).

## Needs
- The two OWNED rows (stickX, stickY pinned to `input`, OWNED_LINE + 2 in
  WL's `tools/guards/state-ledger.test.mjs`: approved by the orchestrator,
  2026-11-24) land when #2290 is on `main` (merged in before the last push).
- Approved: PR 1's mechanical rows; PR 2's frame-steps WANT + 'input'; the
  ledgers' machine rows for moved writers (`--write`).
