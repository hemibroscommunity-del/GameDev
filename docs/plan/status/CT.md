card: CT
branch: claude/plan-ct-3-right
prs: #2282 (6540, merged), #2293 (6541, ready), PR 3 (6542, working)
state: working

## Done
- PR 1 (6540, #2282, merged at sitting 57): the three rules, their suites.
- PR 2 (6541, #2293): the left stick in mode 5, the step `input`, part 1;
  mended for sitting 58 (stick-zones 8 by what stickFrame does, the call
  off the syntax tree: five plants red). Card item 6 (6545) added.
- PR 3 (6542, stacked on 6541): the right side in mode 5. latch.js wired
  (latchFrame in the step `input`, latchAttackPress, latchHolds, latchLook:
  the disc's bevel, game.css); targeting.js locks the latch's monster and
  nothing else (touch only); the right half the world's taps only; no flick;
  S.stickX/Y given one owner (the orchestrator's addition): every mode's
  analog read and lift moved whole to stickZones.js (stickAnalog,
  stickLift; the same values to the last bit, stick-zones 9);
  BroTown 15911 -> 15901.

## Next
- PR 3: `mp-twobuttons` part 2 upright and sideways, `mp-heldcombat`,
  `playable`, `memory-budget`; then open READY.

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6`.
- On this box a CDP flick cannot be a swipe: each touch waits behind a
  frame of a few hundred ms (past the swipe's 300 ms), and moves sent with
  no frame between are coalesced into a tap. The same in mode 4
  (`tools/qa/mp/mp-twobuttons.mjs` 1f says so).

## Needs
- The two OWNED rows (stickX, stickY pinned to `input`, OWNED_LINE + 2 in
  WL's `tools/guards/state-ledger.test.mjs`: approved by the orchestrator,
  2026-11-24) land when #2290 is on `main` (merged in before the last push).
- Approved: PR 1's mechanical rows outside the card; PR 2's card M guard
  rows (frame-steps WANT + 'input'); the ledgers' machine rows for moved
  writers (input, skills, ui, combat: the script's `--write`).
