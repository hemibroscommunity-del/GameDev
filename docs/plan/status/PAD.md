card: PAD
branch: claude/plan-pad-1-controller
prs: #2354 (draft, tag 6640)
state: ready

## Done
- tag 6640 part 1: the touch controls as a controller (`?padskin=0` today's
  look): the art (tools/art/cut-pad.mjs, 18 pieces, 192 kB, 96 colours), the
  rules (src/game/padSkin.js; server/test/pad-skin.test.mjs, 176 checks, 119
  of 133 mutants killed, the 14 left equivalent: the PR body), the housings,
  the five buttons and the stick in their sockets, mp-padskin, UI notes.
- tag 6640 part 2: mp-padskin 5b (sideways, held Attack) was not a bug in
  behaviour: nothing sits over the disc's centre sideways (screenshot), the
  step waited a fixed 1.5 s for the resolver to raise the disc; it now waits
  for the disc to take touches and reads the held attack by the clock.
  mp-twobuttons reads the controller where it is on (3f each control on its
  socket and no two boxes over each other; 6a/6b the painted face, no plain
  sword or crosshair; 3e Attack on its socket), the old reading under
  `&padskin=0` (`TWO_Q='&padskin=0'` runs it so); 3i skips a hop that ends
  swimming (3d's skip).
- Phone runs on this box: mp-padskin 31/31 (twice); mp-twobuttons 101/117
  under the controller, 102/117 with `&padskin=0`: every red under the
  controller is main's (2b, 2c, 6a, 3h: debts.md CT 64-65) but 3i
  (placement: mended as a skip). mp-membudget 12/12 on part 1's box, head
  96f0ebf3, no line raised.

## Found
- No left-handed setting exists in the game (card reading 8): the layout
  mirrors (tested), nothing turns it on.
- mp-twobuttons 6a reads red wherever 2b's tap goes to `auto` (the face
  is right; the latch reads 'auto' for 'lock'): main's, with 2b.

## Needs
- The gatekeeper's sitting (docs/plan/status/Z.md).
