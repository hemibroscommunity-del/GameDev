card: UI3-hudart
branch: claude/plan-ui3-8-hudart
prs: the draft PR from this branch (ready), base claude/plan-ui3-2-hud
state: ready

## Done
- PR 8 (tag 6787): the character HUD in the owner's pictures of 2026-11-26. The sheet cut into seven pieces (tools/art/cut-hud.mjs, 128 colours, 19 kB) in public/ui/hud/; src/game/hudArt.js (the badge the combat level, the pill the weapon in hand's level, the fill, `?hudart`, the layout in UI3-hud's 184 x 52 box); src/ui/hud/HudArt.jsx + hudArt.css (CharacterHud.jsx's one branch); warmed behind the loading screen (controlsPreload.js); tools/guards/hud-art.test.mjs (28 plants, each red); tools/qa/mp/mp-ui3hudart.mjs; the switch row, states.mjs rows, the design notes, UI_ARCHITECTURE_V2 part 13's line.
- On the final code (main e4f08ed6 merged), on the test box: mp-ui3hudart 32/32, mp-charhud 26/26 (now under ?hudart=0), mp-weaponswap 46/46, mp-topbarplace 20/20, playable 187/187, mp-killxp 18/18 (the repeat; its first run missed its kill). mp-xpbar 44/45 and memory-budget 11/12: the same reds on the base. precheck 0 FAIL.

## Next
- Nothing: the line is done; the orchestrator is told.

## Found
- capture.mjs --check-notes exits 1 on the base already: UI3-hud's charhud screens are in no ChatGPT packet (packets.mjs); hudart and hudart-side join them.
- On the base and here: mp-xpbar 5 "upright 320: inside the middle" and memory-budget's buffers line (25.1 MB of 25, trip 2), the same on both.

## Needs
- Nothing.
