card: CT
branch: claude/plan-ct-3-right
prs: #2282 (6540, ready), #2293 (6541, ready), PR 3 (6542, working)
state: working

## Done
- PR 1 (6540, #2282): stickZones, sight, latch, their suites, the phase and
  ledger rows, mode 5, the switch rows; mended at sitting 56 (plants red).
- PR 2 (6541, #2293): the left stick in mode 5 (turn, walk, the ring); the
  frame's step `input` (1531 -> 1513 in legacy); `mp-twobuttons` part 1.
- PR 3 (6542, stacked on 6541): the right side in mode 5. latch.js wired
  (latchFrame in the step `input`, latchAttackPress, latchHolds, latchLook:
  the disc's bevel, game.css); targeting.js locks the latch's monster and
  nothing else (touch only); the right half the world's taps only; no flick;
  BroTown 15911 -> 15911 (calls on existing lines).

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
- PR 1's mechanical rows outside the card: approved (answer 1).
- PR 2: card M's guard `tools/guards/frame-steps.test.mjs` (WANT +
  'input'; its indices read from WANT) and `tools/qa/mp/mp-framesteps.mjs`
  (WANT + 'input'): approved by the orchestrator part 1, 2026-11-23 (three
  plants proved red: in the PR's words).
- The ledgers' machine rows for the moved writers (`src/state/input.js`,
  `skills.js`, `ui.js`: stickX/Y, _lastInputAt, player; `_IN`, `_turn`).
