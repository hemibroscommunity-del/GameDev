card: DG
branch: claude/dg-reach (PR 5), on claude/dg-wireform (PR 4), on claude/dg-books (PR 3), on claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1)
prs: #2283 (PR 1, 6440, CI mend), #2295 (PR 2, 6441, CI mend), #2300 (PR 3, 6442, ready), #2310 (PR 4, 6443, ready), PR 5 (6444, ready); all base main
state: ready

## Done
- PR 5 (6444): wire-hostile watches what is read off each message after the
  door (test room only): 3a every named field read or in NOT_REACHED with
  why (104, REACH_LINE; 3b it only falls); 4 no unnamed read (three named in
  in.js: monster_damage element, ability_use tier, pet_house_buy id); 4b no
  listing of a message's keys (a copy hides its reads). 8 plants red.
- PR 4 (6443, #2310): the wire door holds a named field to its form (door.js
  WIRE_FORM, the table's `form` column); `wireform` absent refuses, 'count'
  counts, false the old door; cap wireForm. judge.mjs refuses every plant;
  playable and mp-bank green.
- Sitting 57's CI (#2295): one scan walk a file (gold-door 46 s -> 4.6 s);
  PR 1's guard lets go of a record leaving the room's map (heap-forget).
- PR 1 (6440, #2283): the running room refuses a write of a guarded field
  outside its door (testroom.mjs); ECON_V + 1 for card WHO. Deploys.
- PR 2 (6441, #2295): one scanner, tools/guards/lib/writesOf.mjs (the syntax
  tree), read by every door suite, the action door and wire-audit.
- PR 3 (6442, #2300): gold-door §10 and bag-door §10 run every road of
  GOLD_ROADS and BAG_ROADS: the books moved what the purse or bag moved.

## Next
- PR 6 (6445): the gaps beside the doors (a branch from claude/dg-reach).

## Found
- none (no real second writer)

## Needs
- none

## Note
- PR 6's `sessions.clear()` / rebuilt `sessions` and `ws.send` through
  `bind` landed in PR 2 (the session and send doors' scans).
- wire-hostile's count is 0 under LINE 1 on this stack: not lowered here.
- PR 5 adds no cap and no live flag. PR 4's files outside the card: its PR.
