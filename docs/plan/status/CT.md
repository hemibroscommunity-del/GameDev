card: CT
branch: claude/plan-ct-23-nearpick (part 23 PR 1, tag 6556); claude/plan-ct-24-bowspecial (PR 2, tag 6557, stacked)
prs: part 23 PR 1 (6556, draft, ready), part 23 PR 2 (6557, draft, ready, stacked on PR 1); before: #2346 (6552 + 6553), part 20 (6554, merged #2350), #2345 (6551), #2344 (6550), #2342 (6549), 6548, #2340 (6547), #2282, #2293, #2308, #2327, #2330, 6545-6546
state: ready

## Done
- PRs 1-5 (6540-6544), items 6-8 (6545-6547), parts 15-22 (6548-6554): on
  main or in their PRs (git log; their specs).
- Part 23 PR 1 (6556): the nearest threat first. sight.js sightPick: the
  nearest in the cone and range wins (the angle within 15%), one in view
  before one out of it, the kept one held unless a newcomer is 20% nearer
  or it left the view; latch.js latchAway: a lock out of view moves to the
  nearest in view in range after 400 ms; `?nearpick=0` the old. The view is
  S.camera + the size BroTown's ONE latchFrame call now hands in (reading 6:
  TRAPS 237's census forbids a new _viewW reader in src/game).
  sight.test 12, latch.test 7: the card's plants (a)-(g) red; 156 mutants
  of the added lines, 11 left, all equivalent (in the PR body).
  mp-nearpick: 8/8 once on the test box (before the BroTown call).

- Part 23 PR 2 (6557): the bow's special at once. game/bowSpecialNow.js
  bowSpecialPick (pure: mode 5's gate, the ranged slot AND a bow, the
  switch; the latch's lock first, else Attack's pick, latch.js sightNow);
  specialAttack gains three calls: the queue only when there is nothing to
  take, the volley aimed at the taken monster (its lock reaches
  S.lockedTarget only next frame), and the latch's take (latchPress, the
  hold rule: a tap's lock; never over a lock, so auto is never let go).
  `?specialnow=0` the queue back. bow-special.test 44 drives the real
  specialAttack (alias loader + .jsx stubs): the card's five plants red;
  29 mutants of the added lines, 27 killed, 2 equivalent (in the PR body).
  mp-bowspecial: see the PR body (once on the test box).

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
