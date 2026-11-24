card: CT
branch: claude/plan-ct-7-mends (item 7, stacked on claude/plan-ct-6-sprint)
prs: #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, draft: its number in the PR's words)
state: ready

## Done
- PR 1 (6540, #2282) merged at 57; PR 2 (6541, #2293) merged at 60.
- PR 3 (6542, #2308): the latch, the lock; ONE gate, twoButtonsLive.
- PR 4 (6543, #2327): the sight line, Block and the specials with it.
- PR 5 (6544, #2330): the Test panel's row, the words, honest-trouble D;
  on main 598cfd38: the line's record in rendering/sightLineDraw.js.
- Item 6 (6545): sprint past the stick's rim (stickZones.js rimSprint,
  1.25 on / 1.05 off, a hold, how 'rim'; no server change); no sprint
  button in mode 5; the ring lit gold; `?rimsprint=0`. stick-zones 10,
  mp-twobuttons part 5.
- Item 7 (6546, the owner's mends of 11-24): the line only in combat
  (latch.js latchLine, `?sightline=1`; sight.test 11); Attack wears the
  plain sword (wpn-melee, mode 5 only); turn band measured, no new default.

## Next
- The owner's verdict on the trial (the card's "Stop there").

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6`.
- This box: a CDP flick waits behind a slow frame (mp-twobuttons 1f).
- 3c/3d sideways was the TEST: the sight holds 400 ms, stepped once a
  frame; this box draws one every 767-1117 ms, so one missed frame drops
  it. 3c: a SKIP with the frame time when frames are wider than the hold
  (TRAPS 200); 3d counts each button (Block, then Special a render later).
- 3c's 8 Block/Special changes (part 12): not seen again (item 7's runs: 0
  up and sideways, each change now logged with what the rules read).
- Turn band at 430x775: dead 4.5, TURN 11.25, rim 37.5 px (sideways 5.4,
  13.5, 45): 7-8 px; `?turnzone=50/60` for the owner's thumb.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
