card: CT
branch: claude/plan-ct-13-talkicon (#2346: parts 19 and 21, TALK's pill and its place; part 22: main 0c648ebb in)
prs: #2346 (6552 + 6553, ready on main), part 20 (6554, merged #2350), #2345 (6551, part 18: the join), #2344 (6550, in the join), #2342 (6549, in the join), part 15 (6548, draft on claude/plan-ct-8-freefire), #2340 (6547), #2282, #2293 (merged), #2308, #2327, #2330, items 6-7 (6545-6546)
state: ready

## Done
- PRs 1-5 (6540-6544), items 6-8 (6545-6547), parts 15-18 (6548-6551): on
  main or in their PRs (git log; their specs).
- Part 19 (6552): TALK is the owner's pill, no word, no plate (ctxLook;
  cut-talk-pill.mjs, 3.4 kB inline; 19 mutants, none left).
- Part 20 (6554, #2350): the shield drops at 0 stamina (guardBreak.js
  poolsLand/followWorkerGuard; mp-shielddrop, guard-break-page.test). Job 2:
  no Charge while a duel, a match or a player lock holds you (sight.test 8).
- Part 21 (6553; the owner: "Talk icon below npc"): TALK's pill below the
  name tag and the quest line, 6 px under the lowest (ctxTalkBelow, 20/20 px
  measured off mp-contextbuttons' 3x shot; ctxPlateTop the renderer's drop;
  held on screen at the foot). context-button.test 3b-3h, 9f-9g, 23 mutants,
  none left; mp-contextbuttons 1b green on the test box.
- Part 22: merged main 0c648ebb, the 2 words moved to say/contextButton.js.

## Next
- #2346 at the gate.

## Found
- 3c/3d flip: the own rules' 550 perimeter, ended in part 16 (combatReach
  no limit in mode 5; sight.test 8 pins it).
- Part 20: a blocked blow breaking the guard on the regen's own tick is
  refilled before the flush (tick.js: regen, then flush): the phone reads 7,
  not 0, and keeps that break drawn (~1 in 30). A worker change: not built.
- Part 20: mp-shielddrop's walk-in ended 270-364 px off a wandering monster
  here: no real blow in the latch (step 5 a note). mp-twobuttons on that
  branch: shield steps green; 2b, 2c, 6a (the tap, the latch) and 3h (Charge
  dashed, its distance unread) red, none in the files it touched.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
