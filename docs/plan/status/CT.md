card: CT
branch: claude/plan-ct-11-context (part 17: the button under the thing, stacked on claude/plan-ct-9-hold)
prs: part 17 (6550, draft on claude/plan-ct-9-hold), part 15 (6548, draft on claude/plan-ct-8-freefire), #2340 (6547, draft on main), #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate)
state: working

## Done
- PRs 1-5 (6540-6544) merged or in via #2330; items 6-8 (6545 rim sprint,
  6546 the line in combat, 6547 the free arrow, `?freefire=0`) in #2340.
- Part 15 (6548): tap and hold (`?holdauto=0`, `?autohold=<ms>`): latch.js, freeAttack.js.
- Part 17 (6550, working): mode 5's Attack always attacks; ONE button under
  the nearest thing (CHOP/MINE/FISH/COOK on S._btnHarvest, the beat on it in
  the work, TALK within 120 px). `?ctxbuttons=0`. contextButton.js (35
  mutants, none left), ContextButton.jsx, mp-contextbuttons. No server file.

## Next
- Part 15 handed over at 264k: mp-twobuttons on its head (a helper), after
  the lift's mend (bE's release before its changedTouches lookup).
- Two CT parts after it: Block, Charge (the dash's button), the thumb's
  layout; node and townsfolk.

## Found
- Part 15's run (before the lift's mend, stopped at 88 PASS): a 150 ms tap
  went auto both ways: bE's release sat after its findT and missed.
- #2340's helper run: 92/94, 7d both ways (the arrow flew and hurt; free 0):
  7d now waits for nothing in sight and counts any arrow loosed.
- Part 17's own runs: TALK, CHOP, the swing, the beats, `ctxbuttons=0` green
  upright; mode 4's disc press started no chop (pre-existing? the helper's
  run says what was under the finger).

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
