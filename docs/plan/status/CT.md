card: CT
branch: claude/plan-ct-22-aimmarks (part 22: the frame and the caret, 6555)
prs: part 22 (6555, draft: this branch), #2346 (6552 + 6553), part 20 (6554, merged #2350), #2345 (6551), #2344 (6550), #2342 (6549), part 15 (6548), #2340 (6547), #2282, #2293, #2308, #2327, #2330, items 6-7 (6545-6546)
state: ready

## Done
- PRs 1-5 (6540-6544), items 6-8 (6545-6547), parts 15-21 (6548-6554):
  on main or in their PRs (git log; their specs).
- Part 22 (6555): in the two buttons (`?manual=5`, touch) the monster the
  next Attack takes wears a YELLOW frame (four corner brackets, the drawn
  box x 1.25, at least 48 CSS px, 2 px, 0.6 alpha), the locked one a RED
  one from the press that locks it, never both; a brass caret 26 CSS px out
  from the feet points the drawn facing, or at the lock. What shows is
  src/game/aimMarks.js (asks latch.js sightNow, the press's own pick);
  lockReticle.js AimFrame/AimCaret draw it once, then move/turn/tint it.
  The chevrons are not drawn while the frame is on; `?targetframe=0` gives
  them back, `?aimcaret=0` hides the caret. aim-marks.test: 71 checks; 75
  mutants, 68 killed, 7 equivalent (the suite's header says which).
  mp-aimmarks green on the test box (upright and sideways).

## Next
- The PR at the gate.

## Found
- The sight's pick (sight.js sightPick) takes the monster nearest the
  facing LINE, not the nearest: mp-aimmarks' first run framed a frog 666 px
  off, off the screen (bow range 675), over one 164 px away 6 degrees
  further off the line. The press locks the same one. CT part 23 holds the
  pick's rule.
- In mode 5 the lock chip (effectsRenderer, v2.3.2295, the filled orange
  triangle over S.lockedTarget) still stands over the latched monster, above
  the red frame: the card did not name it; kept as it is.

## Needs
- Asked of the orchestrator: should the lock chip go in mode 5 while the
  red frame is up (one mark on the lock)? Today: kept.
