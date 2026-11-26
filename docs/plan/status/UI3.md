card: UI3
branch: claude/plan-ui3-2-hud
prs: PR 2 (UI3-hud, tag 6781): draft, base claude/plan-pad-9-rimsprint
state: working

(Created by PR 2's session: PR 1's (UI3-kit) status file had not reached this branch. PR 1 writes its own lines here when the two meet.)

## Done
- PR 2, UI3-hud (6781): the character HUD top left (face, name, "Lv N", the gold bar of the weapon whose next level raises the combat level); the tracked quest as one line under it; a tap opens Bro; the top bar's XP slot quiet while it shows; the status column and the party chip moved down by the HUD's height; `?hud=0` (remembered) the old top left. Rules `src/game/charHud.js`, guards `char-hud` and `char-hud-mount` (every plant red; mutants killed or listed), phone test `mp-charhud`.

## Next
- Waiting on a helper (cheapest model) running the final phone runs on the final code (mp-charhud and the eleven older ones the card names); one push and the draft PR after. A 40-minute reminder is set.

## Found
- `tools/qa/ui-review/packets.mjs` (not this card's file): the three new screens (`charhud`, `charhud-side`, `charhud-desk`) are in no ChatGPT packet, so `capture.mjs --check-notes` lists them (the guard `screens-listed` does not read packets).
- The tag block UI3 [[6780, 6799]] is not yet in `tools/dev/tag-blocks.json` (the gatekeeper registers it).

## Needs
- For the owner (flagged, not settled): the online player count's new home (none on the HUD since v2.3.1227; Social is step 7's); health and energy stay off the top left; the fold of v2.3.4207 gives way to the one line; XP earned on a weapon that is not the HUD's shows only its "+N"; the two earlier take-outs (the strip, the face and frame) are reversed by their 2026-11-26 word.
