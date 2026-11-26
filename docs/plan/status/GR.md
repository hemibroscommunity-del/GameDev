card: GR
branch: claude/plan-gr-2-camfollow (stacked on claude/plan-pad-1-controller, PR #2354)
prs: part 2 draft (tag 6660); the census (part 1) on claude/plan-gr-grit, no PR
state: ready

## Done
- Part 1: the grit measured at the owner's shape on the test box:
  `docs/plan/census/GR-grit.md` (branch claude/plan-gr-grit).
- Part 2, tag 6660 (card `docs/plan/cards/GR-part2.md`): the view follows the
  bro, not his speed. `src/game/cameraFollow.js` (no imports): the camera
  moves by the bro's step each frame, then closes what gap is left (the
  punch, the 8/14/18% chase and its frame-rate power moved whole); a step
  past 10 game px a 60th (a lunge, a teleport) is chased as before.
  BroTown's camera block is one call; `?camfollow=0` the old lead and chase
  (its row, `--write`). Block GR 6660-6679 in tag-blocks.json.
- `tools/guards/camera-follow.test.mjs` (in guards: no worker deploy,
  TRAPS §277): a ride from a stand with push and roll-off (east, north-east,
  north) within 2 device px every frame, the old chase red (35 device px);
  jog = ride place; the phone's wobble; the chase rates, punch, lead, the
  call. Mutation run over the module: 141 mutants, 141 killed.
- `tools/qa/mp/mp-camfollow.mjs` (430 x 775 at 3x, `world: 'wheel'`, lane
  full, the scripted 60 clock): 11/11 on the test box, the bro within 0.03
  device px every frame of a 591 game px ride; `?camfollow=0` slides 40.9.

## Readings chosen
- The lead: NONE along the way you go (reading A, the orchestrator's answer
  2026-11-25). Any lead must come in at the stand and leave at the stop, so
  the bro could not sit at one place; today's ride sat at the middle
  already (+1.2 device px), the jog moves 24 device px forward to it.

## Found (not this card's; nothing built)
- Census causes 2 to 5 stand as the census says.
- mp-steadystep logs the camera's slide and the on-screen wander but
  asserts neither; mp-desksmooth reads no camera: neither reads the old trail
  (both green on the test box: 18/18, 29/29).
- The ledger script now files S.camera under `world` (its writers moved);
  `cameraFollow.js` is in the system map's `render`.

## Next
- The owner rides it on the preview; then the orchestrator's word.
