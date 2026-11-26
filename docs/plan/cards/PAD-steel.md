# Card PAD, part 10: the controller in the owner's steel, the gold gone (one PR)

Model and effort: the strong model, high. Tag: 6645 (PAD's block 6640 to 6659). Branch `claude/plan-pad-10-steel`, STACKED on `claude/plan-pad-9-rimsprint` (draft #2393, itself on #2387): base that branch. ONE draft PR, ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. You commit this card as `docs/plan/cards/PAD-steel.md`, and the owner's sheet (below) at its path, in the PR.

## Purpose

The owner, 2026-11-26, in the orchestrator's session, with ONE picture: *"Also swap out the control color with this one. I don't like the gold."* The picture is a new sheet of the whole controller with a STEEL-BLUE rim where today's is gold: `assets/icons-source/owner-2026-11-26-pad4/sheet.png` on the branch `claude/plan-orc` (1774 x 887, RGBA, its own transparency; `git show origin/claude/plan-orc:assets/icons-source/owner-2026-11-26-pad4/sheet.png > ...`). It replaces the look of 2026-11-25 (`assets/icons-source/owner-2026-11-25-pad3/`, with its `layout.json`; the game's files `public/ui/pad/*.png`, drawn by `src/game/padSkin.js`). The LAYOUT, the sockets, what each button does and when it shows are NOT this card's: only the pictures change.

## What is on the sheet (looked at by the orchestrator)

- Top: the housing (the stick's lobe at the left, the low rail, the taller right lobe), dark navy inside a steel-blue rim.
- Middle row, left to right: the stick's base (four small gold arrows), the stick's thumb (grey), Jump (green), Attack with the sword, the bow, the staff (red).
- Bottom row: the shield (blue), Special (a gold star), Skate (purple), Charge (purple, a dashing sword), two EMPTY sockets (steel rim), one empty socket with a glowing GOLD ring (the lit slot).
- Not on the sheet, in `public/ui/pad/` today: `attack-off.png`, `icon-sword.png`, `icon-bow.png`, `icon-staff.png`, and whatever Whirlwind and Shield Bash wear. Make each the way part 3 made it from the pad3 pictures (read how first: `git show origin/claude/plan-orc:docs/plan/cards/PAD-part3.md`, the header of `padSkin.js`, `git log --stat -- public/ui/pad`), from the NEW pieces, and say how in the PR.

## The readings, chosen so you do not guess

1. **Same names, same sizes, same anchors.** Every file of `public/ui/pad/` is replaced by its piece from the new sheet at the SAME pixel size and with the same measure the code leans on (`padSkin.js`:9, :311, :331: the housing's left wall, its rail's shoulder, the right lobe drawn taller for the specials). Cut each piece by its own alpha, fit it to the old file's box. If the new housing's outline differs from the old one's by more than a pixel or two once fitted, re-measure and change the numbers in `padSkin.js` (and its mirror in `server/test/pad-skin.test.mjs`) rather than stretch the picture; SAY which.
2. **The art law**: every picture through `public/tools/style/process.js`; 256 colours a picture at most; no new file name, so the loaders (preloading is law) and the memory lines stay; if `mp-membudget` reads more, the line and the MB are said in the PR body, never raised silently.
3. **The lit slot** (`slot-on.png`) is the sheet's gold-ringed socket and the plain `slot.png` / `socket.png` its steel ones: the gold RIM is what the owner dislikes; a gold glow for "this one is lit" is on their own sheet, so it stays.
4. **Nothing else gold is this card's**: the dashboard, the menus and their palette are the UI3 sessions'. But LIST, for the owner, every gold thing that still sits beside the controller once the steel is in (a ring, a number, the energy blocks), with a picture: they say what goes next.
5. `?padskin=0` (the controller before the redesign) is untouched. No new switch: the pad3 gold is not kept as a choice (the owner's own words).
6. No server rule. If `server/test/pad-skin.test.mjs` changes (a measure), the PR DEPLOYS THE WORKER: say so in your message.

## Files

Yours: `public/ui/pad/*.png`; the owner's sheet at `assets/icons-source/owner-2026-11-26-pad4/sheet.png` and a small `layout.json` beside it (each piece's box on the sheet, as pad3 has); `src/game/padSkin.js` (measures only, if reading 1 asks); `server/test/pad-skin.test.mjs` (the same measures); `tools/qa/mp/mp-padskin.mjs` if a step pins a colour; the pictures in `docs/shots/` that show the controller (`pad3-*`); `docs/UI-DESIGN-NOTES.md`'s controller section (one paragraph: the owner's words and the date); `CREDITS.md` if the pad3 art has a row (the owner's own picture). NOT yours: `src/ui/BroTown.jsx` (UI3-hud holds its mount line), `TouchControls`, `stickZones.js`, `BottomDashboard.jsx`, `src/ui/kit/*`, a renderer, `.github/`.

## Done when

Precheck 0 FAIL; `pad-skin.test` green (whole server suite once before the push); `mp-padskin` green on the final code (more than three phone runs, or a repeat, is a haiku helper's: finish.md part 6); `mp-contextbuttons` and `mp-rimsprint` as green as on your base; `playable` and `memory-budget` green on the PR. Pictures, at deviceScaleFactor 2, upright 390 x 844 and sideways 844 x 390: out of a fight, in a fight with the shield up, the specials showing; each beside the owner's sheet. Your ONE message: the PR, its full head, whether it deploys, the Cloudflare preview's address, the pictures' paths, reading 4's list, and anything on the sheet you could not place.
