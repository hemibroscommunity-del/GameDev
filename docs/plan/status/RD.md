card: RD
branch: claude/plan-rd-1-itemdrop (one PR a branch, claude/plan-rd-*)
prs: (6180) itemdrop 5b: opening
state: working

## Done
- itemdrop 5b (6180): the TEST's. Five runs in a row green, 18/18.
  The flash runs on the phone's own clock (itemDrop.js dropAlpha reads
  flashAt), set from the worker's flashLeft on every loot_drop of the pile
  (gameEvents.js): the dropper's at /dev/dropage, the room's at the reveal.
  Step 5 aged the pile a flat 121 s after a 20 s wait for the watcher to
  list a still-private pile (never sent to him: 1g), so it was past its
  130 s end: _tickLoot revealed and let it go in one tick. Now aged to 3 s
  short of the flash by the dropper's reading, read only on flashing
  frames to the pile's end, the phones at dpr 1 (0.6 fps at dpr 2 here).

## Next
- crowdfight "knew every bot" (6181): run on main.

## Found
- tools/qa/mp/mp-itemdrop.mjs's other checks pass, but 6a went red once
  in 15 runs at dpr 2 with nothing to read; it now names its step.

## Needs
