card: PAD
branch: claude/plan-pad-1-controller
prs: (the draft, tag 6640; its number in the orchestrator's message)
state: working

## Done
- tag 6640: the touch controls as a controller (`?padskin=0` today's look):
  the art cut from the owner's four sheets (tools/art/cut-pad.mjs, 18
  pieces, 192 kB, 96 colours), the rules (src/game/padSkin.js;
  server/test/pad-skin.test.mjs, 176 checks, 119 of 133 mutants killed, the
  14 left equivalent), the housings (PadHousings.jsx), the five buttons and
  the stick in their sockets, mp-padskin, UI notes, the review state.
- Phone runs on this box: mp-padskin 30/31, mp-contextbuttons 27/27.

## Next (handed over at the memory line)
- mp-padskin 5b sideways: holding Attack read no held attack (upright
  passes); see what is over the disc's centre sideways (elementFromPoint).
- mp-twobuttons under the controller: 3f (the arc's 8 px of air: the
  sockets' faces have 4 to 6) and 6a (the plain sword / crosshair: the face
  is the sword now) measure the old look -- run that scenario with
  `&padskin=0` or read the sockets; 2b/2c (a tap went to `auto`) and 3h
  (a tap on Charge in its context socket: presses 0) need a look: they may
  be the controller's (what is over Charge and Attack's centres).
- mp-membudget: not yet read.

## Found
- No left-handed setting exists in the game (card reading 8): the layout
  mirrors (tested), nothing turns it on.

## Needs
- A fresh session to finish Next (the orchestrator's).
