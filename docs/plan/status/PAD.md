card: PAD
branch: claude/plan-pad-1-controller
prs: (the draft, tag 6640; its number in the orchestrator's message)
state: ready

## Done
- tag 6640: the touch controls as a controller (`?padskin=0` today's look):
  the art cut from the owner's four sheets (tools/art/cut-pad.mjs, 18
  pieces, 192 kB, 96 colours), the layout and face rules
  (src/game/padSkin.js, server/test/pad-skin.test.mjs), the housings
  (src/ui/panels/PadHousings.jsx), the five buttons and the stick in their
  sockets, the phone test (tools/qa/mp/mp-padskin.mjs), the UI notes and
  the review state.

## Next
- The gatekeeper's review of the draft.

## Found
- No left-handed setting exists in the game (card reading 8): the layout
  mirrors (tested), nothing turns it on.
- mp-padskin does not bring a monster: Block and Special landing in their
  sockets in a fight is held by pad-skin.test 4 (the places are the
  screen's alone), not played.

## Needs
- Nothing.
