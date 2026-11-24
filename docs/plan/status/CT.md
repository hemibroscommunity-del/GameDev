card: CT
branch: claude/plan-ct-5-words (PR 5, stacked on claude/plan-ct-4-sight)
prs: #2282 (6540, merged), #2293 (6541, held at 59), #2308 (6542, ready), #2327 (6543, ready), PR 5 (6544, working)
state: working

## Done
- PR 1 (6540, #2282): merged at sitting 57.
- PR 2 (6541, #2293): the left stick. Head bfd443e9 green, frozen (held
  at 59: the owner is asked).
- PR 3 (6542, #2308 ready, head 6bb4d0f0): the latch, the lock, the
  stick's one owner; 2c's sideways fight a SKIP with the box's frame time.
- PR 4 (6543, #2327 ready, head 08d6735d): the sight line, Block and the
  specials with the sight. mp-twobuttons 48 PASS, 0 FAIL, 1 SKIP (2c).
- PR 5 (6544, part 10): the Test panel's row "Controls: two sticks / two
  buttons" (manualCombat twoButtonsChoose: the same key as `?manual=5`, the
  page loads again into it); the tour's and the coach's words for the
  mode (say tables controlsTutorial, new questCoach); honest-trouble.md
  section D (the latched fight to each signal of aim or press rhythm; no
  line moves; `rooted` margin #4 wider). Node: two-buttons-choose (15
  checks; 5 plants red, 2 equivalent survivors listed). Phone:
  mp-twobuttons part 4 (4a-4c: the row tapped both ways, the words).

## Next
- PR 5: precheck, one helper run of mp-twobuttons, main merged once, one
  push, the draft PR, then tell the orchestrator. Item 6 (6545, sprint
  from the stick) is a fresh part's.

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
