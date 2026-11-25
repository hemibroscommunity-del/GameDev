card: CT
branch: claude/plan-ct-23-nearpick (part 23 PR 1, tag 6556); claude/plan-ct-24-bowspecial (PR 2, tag 6557, stacked)
prs: part 23 PR 1 (6556, draft, ready), part 23 PR 2 (6557, draft, ready, stacked on PR 1); before: #2346 (6552 + 6553), part 20 (6554, merged #2350), #2345 (6551), #2344 (6550), #2342 (6549), 6548, #2340 (6547), #2282, #2293, #2308, #2327, #2330, 6545-6546
state: ready

## Done
- PRs 1-5 (6540-6544), items 6-8 (6545-6547), parts 15-22 (6548-6554): on
  main or in their PRs (git log; their specs).
- Part 23 PR 1 (6556): the nearest threat first (sight.js sightPick, one
  in view first; latch.js latchAway; `?nearpick=0`). 156 mutants, 11 left,
  all equivalent; mp-nearpick 8/8 once on the test box. Its PR body.
- Part 23 PR 2 (6557): the bow's special at once (game/bowSpecialNow.js:
  the lock, else Attack's pick, fires now and the latch takes it; nothing
  to take readies it; `?specialnow=0`). bow-special.test 44 drives the real
  specialAttack: the five plants red; 29 mutants, 27 killed, 2 equivalent.
  mp-bowspecial 16/16 once on the test box. Its PR body.

## Next
- The card is done once PR 2 lands (both PRs stacked: PR 1 first).

## Found
- 3c/3d flip: the own rules' 550 perimeter, ended in part 16 (combatReach
  no limit in mode 5; sight.test 8 pins it).
- Part 20: a blocked blow breaking the guard on the regen's own tick is
  refilled before the flush (tick.js: regen, then flush): the phone reads 7,
  not 0, and keeps that break drawn (~1 in 30). A worker change: not built.
- Part 20: mp-twobuttons on that branch: shield steps green; 2b, 2c, 6a
  and 3h red, none in the files it touched.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
