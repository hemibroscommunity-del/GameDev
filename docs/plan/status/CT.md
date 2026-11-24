card: CT
branch: claude/plan-ct-9-hold (part 15: tap and hold, stacked on claude/plan-ct-8-freefire)
prs: part 15 (6548, draft on claude/plan-ct-8-freefire, PR to come), #2340 (6547, draft on main), #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate)
state: working

## Done
- PRs 1-5 (6540-6544) merged or in via #2330; items 6-8 (6545 rim sprint,
  6546 the line in combat, 6547 the free arrow, `?freefire=0`) in #2340.
- Part 15 (6548, working): tap and hold. A tap on Attack is one attack (a
  lock that stays); a hold on a lock fills a ring (600 ms, `?autohold=<ms>`)
  and turns auto-attack on (lit); a tap while auto ends it; a kill lets
  everything go (no hop). The latch's phases idle/active/auto (one field,
  latchTo; S.autoAttack from latchHolds). `?holdauto=0` the old press.
  latch.js + freeAttack.js; latch.test 6, free-attack 4-5 (no server/src).

## Next
- Part 15: mp-twobuttons 2a-2d to the new rule; the helper's run of #2340.
- Two CT parts after it: Block, Charge (the dash's button), the thumb's
  layout; node and townsfolk.

## Found
- Item 8's repro (430x775 @3x, a greatsword, one press, 5 s): the body
  moved 0 px; nothing on mode 5's press reaches maybeSwordDash. Main from
  #2293 to #2330 (11-24 06:56-10:24 -0800) ran it as mode 4's press: the lunge.
- "Jump to every monster" may also be the latch's 'moved' rule (after a
  kill the lock goes to the next with no press): left for the next part.
- 3c/3d sideways: Block/Special flip in the DOM while their probes say
  shown and the phase holds (part 12's; seen again in item 8's run).
- mp-twobuttons (item 8, last run): 94, 89 pass; 2c's stay and 7b pass up
  and sideways. 7a/7c red were the bow firing at a prop on its line (today's
  rule): the steps now read the line (not rerun). 7d (a free arrow meets a
  monster): the test's hiding of a sighted monster did not take in my runs
  (the press locked it); the helper's run passed it upright (58 -> 49).
- Turn band at 430x775: dead 4.5, TURN 11.25, rim 37.5 px.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
