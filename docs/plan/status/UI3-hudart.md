card: UI3-hudart
branch: claude/plan-ui3-8-hudart
prs: one draft PR, base claude/plan-ui3-2-hud (opened when the line is done)
state: working

## Done
- The owner's sheet cut into seven pieces (tools/art/cut-hud.mjs: the style lab's finder, the top row measured, 128 colours, 19 kB) into public/ui/hud/, src/data/hudArt.js and layout.json beside the sheet.
- src/game/hudArt.js (the badge the combat level, the pill the weapon in hand's level, the fill, the switch `?hudart`, the layout in UI3-hud's 184 x 52 box) and tools/guards/hud-art.test.mjs (28 plants, each red).
- src/ui/hud/HudArt.jsx and hudArt.css (the art form; CharacterHud.jsx's one branch), the pictures warmed behind the loading screen (controlsPreload.js), the switch row, states.mjs rows hudart and hudart-side, the design notes, UI_ARCHITECTURE_V2 part 13's line.
- tools/qa/mp/mp-ui3hudart.mjs; mp-charhud now runs under `?hudart=0` (it reads the drawn panel's "Lv N" and word).

## Next
- The final phone runs on the final code, the pictures beside the sheet, precheck, the merge of main and the base, ONE push.

## Found
- tools/qa/ui-review/capture.mjs --check-notes exits 1 on the base already: charhud, charhud-side and charhud-desk (UI3-hud's) are in no ChatGPT packet (packets.mjs); hudart and hudart-side join them. Not this card's file.

## Needs
- Nothing.
