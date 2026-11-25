card: CT
branch: claude/plan-ct-13-talkicon (#2346: parts 19 and 21, TALK's pill and its place; main 096d7000 in)
prs: #2346 (6552 + 6553, draft on main, lands after #2345), #2345 (6551, part 18: the join, draft on main), #2344 (6550, done: in the join), #2342 (6549, done: in the join), part 15 (6548, draft on claude/plan-ct-8-freefire), #2340 (6547, draft on main), #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate)
state: working

## Done
- PRs 1-5 (6540-6544) merged or in via #2330; items 6-8 (6545 rim sprint,
  6546 the line in combat, 6547 the free arrow, `?freefire=0`) in #2340.
- Part 16 (6549): each button its own moment (thumbSide.js), the right
  thumb's arc (thumbArc.js), the flip's cause (no 550 hold). 4 switches.
- Part 15 (6548): tap and hold (latch idle/active/auto, `?holdauto=0`).
- Part 17 (6550, in #2344): Attack always attacks; ONE button under the
  nearest thing (contextButton.js, 35 mutants; `?ctxbuttons=0`).
- Part 18 (#2345): #2342 + #2344 joined (world button z 29); 6551: mode
  5's lock faces (lockFace.js; lock-face.test, 6 mutants, none left).
- Part 19 (6552): TALK is the owner's pill, no word, no plate (ctxLook;
  cut-talk-pill.mjs, 3.4 kB inline; 19 mutants, none left).
- Part 21 (6553; the owner: "Talk icon below npc"): TALK's pill below the
  name tag and the quest line, 6 px under the lowest (ctxTalkBelow, 20/20 px
  measured off mp-contextbuttons' 3x shot; ctxPlateTop the renderer's drop;
  held on screen at the foot). context-button.test 3b-3h, 9f-9g, 23 mutants,
  none left; mp-contextbuttons 1b green on the test box.

## Next
- #2342 (6549): the helper's clean mp-twobuttons run; the owner plays the arc.

## Found
- Item 8's repro (430x775 @3x, a greatsword, one press, 5 s): the body
  moved 0 px; nothing on mode 5's press reaches maybeSwordDash. Main from
  #2293 to #2330 (11-24 06:56-10:24 -0800) ran it as mode 4's press: the lunge.
- 3c/3d flip: the own rules' 550 perimeter, ended in part 16 (combatReach
  no limit in mode 5; sight.test 8 pins it).
- Part 17's own runs: TALK, CHOP, the swing, the beats, `ctxbuttons=0` green
  upright; mode 4's disc press started no chop (pre-existing? the helper's
  run says what was under the finger).

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
