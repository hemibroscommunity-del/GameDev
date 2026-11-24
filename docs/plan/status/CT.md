card: CT
branch: claude/plan-ct-5-words (PR 5, stacked on claude/plan-ct-4-sight)
prs: #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in)
state: ready

## Done
- PR 1 (6540, #2282): merged at sitting 57.
- PR 2 (6541, #2293): the left stick. Merged at sitting 60.
- PR 3 (6542, #2308): the latch, the lock, the stick's one owner; held
  at 60, mended: ONE gate, latch.js twoButtonsLive (latch.test H1, H2).
- PR 4 (6543, #2327 ready, head 08d6735d): the sight line, Block and the
  specials with the sight. mp-twobuttons 48 PASS, 0 FAIL, 1 SKIP (2c).
- PR 5 (6544, #2330): the Test panel's row "Controls: two sticks / two
  buttons"; the tour's and coach's words; honest-trouble.md D; node
  two-buttons-choose; mp-twobuttons part 4.
- PR 5 on main 598cfd38 (part 11): the leaf only draws (sightStream);
  its line from the state, record and __btSightLine in
  rendering/sightLineDraw.js (leaves guard); the row reads pageAddress,
  twoButtonsChoose(on, search) gives `?...` (switch-reader 3).

## Next
- Item 6 (6545, sprint from the left stick): a fresh part.

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6`.
- This box: a CDP flick waits behind a slow frame (mp-twobuttons 1f).
- 3c/3d sideways was the TEST: the sight holds 400 ms, stepped once a
  frame; this box draws one every 767-1117 ms, so one missed frame drops
  it. 3c: a SKIP with the frame time when frames are wider than the hold
  (TRAPS 200); 3d counts each button (Block, then Special a render later).

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
