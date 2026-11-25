card: CT
branch: claude/plan-ct-10-buttons (part 16: the right side's buttons, stacked on claude/plan-ct-9-hold)
prs: part 16 (6549, draft on claude/plan-ct-9-hold), part 15 (6548, draft on claude/plan-ct-8-freefire), #2340 (6547, draft on main), #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate)
state: working

## Done
- PRs 1-5 (6540-6544) merged or in via #2330; items 6-8 (6545 rim sprint,
  6546 the line in combat, 6547 the free arrow, `?freefire=0`) in #2340.
- Part 16 (6549): each button its own moment (thumbSide.js S._thumbPhase:
  specials in reach, Block at a threat incl. an unseen hit for 3 s, Charge =
  the sword's dash), the right thumb's arc (thumbArc.js), the flip's cause
  (each button's own 550 line, no hold). 4 switches.
- Part 15 (6548): tap and hold (latch idle/active/auto, `?holdauto=0`).

## Next
- Part 16 (6549): the PR's checks; the owner plays the arc on the phone.
- Part 17 (6550, beside: claude/plan-ct-11-context): node and townsfolk
  buttons; whichever reports second merges the other once.

## Found
- Part 15's run (before the lift's mend, stopped at 88 PASS): a 150 ms tap
  went auto both ways: bE's release sat after its findT and missed.
- #2340's helper run: 92/94, 7d both ways (the arrow flew and hurt; free 0):
  7d now waits for nothing in sight and counts any arrow loosed.
- Item 8's repro (430x775 @3x, a greatsword, one press, 5 s): the body
  moved 0 px; nothing on mode 5's press reaches maybeSwordDash. Main from
  #2293 to #2330 (11-24 06:56-10:24 -0800) ran it as mode 4's press: the lunge.
- 3c/3d flip: the own rules' 550 perimeter, ended in part 16 (combatReach
  no limit in mode 5; sight.test 8 pins it).
- Part 16's probe (430x775, 775x430 @3x): the band 257 / 48 px; the
  weapon pill sits left of Attack upright; Ride and the minimap on the right.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
