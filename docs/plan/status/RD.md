card: RD
branch: claude/plan-rd-1-itemdrop (one PR a branch, claude/plan-rd-*)
prs: (6180) itemdrop: working
state: working

## Done
- (nothing merged yet)

## Next
- itemdrop 5b (6180): the cause is the TEST's. The flash runs on the
  phone's own clock (itemDrop.js dropAlpha reads flashAt), and flashAt is
  set from the worker's flashLeft on every loot_drop of the pile
  (gameEvents.js; the dropper's at /dev/dropage, the room's at the reveal).
  Step 5 aged the pile a flat 121 s after a 20 s wait for the watcher to
  list a pile still private (never sent to him: 1g), so it was aged past
  its 130 s end: _tickLoot told the room of it and let it go in one tick.
  Fix: age it to just short of its flash, by the dropper's reading. Five
  runs in a row going.

## Found

## Needs
