card: CT
branch: claude/plan-ct-2-stick
prs: #2282 (6540, ready), PR 2 (6541, working)
state: working

## Done
- PR 1 (6540, #2282): the three rules (stickZones, sight, latch), their
  suites, the phase rows, the ledger rows, mode 5 in manualMode, the
  switch rows.
- PR 2 (6541): the left stick in mode 5 (stickDrive: turn, walk, the
  knob to the drawn radius; the ring on the disc); the frame's step
  `input` (stickFrame: the loop's stick and keys read moved whole out of
  legacy, 1531 -> 1513); `mp-twobuttons` part 1 green upright and
  sideways (real CDP touches; the flick's four touches in one page task).
- PR 1's mend (the gatekeeper's sitting 56): the negative wrap's check
  (plant S11 red), the exact edges (B3, B5, L2), the phase rows held to
  the modules' lists (G2); facing8 gives west as +PI only; latchCheck lets
  go on a distance that is not a number. Each plant proved red.

## Next
- PR 2: the mode-off runs (heldcombat, sprint, framesteps), precheck, push.

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
