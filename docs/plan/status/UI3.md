card: UI3
branch: claude/plan-ui3-2-hud
prs: PR 2 (UI3-hud, tag 6781): draft, base claude/plan-pad-9-rimsprint
state: ready

## Done
- v2.3.6780, PR 1 (UI3-kit; branch claude/plan-ui3-1-kit from main 7ec316e9): the three weights in the kit (`Ui2Tile` raised; `Ui2Stat` sunk, a large gold number, a chevron only when it opens, `size="pill"`; `Ui2Facts` / `Ui2Fact` new, flat rows in one sunk container, `dir="row"` a strip), a caller's className joined, never put in the kit's place; the owner's six colours to the digit (`--ui2-line` its own table); the bevel 2 to 1, the shadows down; `--ui2-fs-nav` on every tile word and header control; `?ui2look=0` (remembered, `bt_ui2look`; `UI2_WAS`; its switch row); `tools/guards/ui3-weights.test.mjs` (R1-R10, 30 dodges planted, each red); `ui2-tokens.test` 11-14; `mp-uikit` 8-10 and a computer run; the kit page's plate "Three weights", the demo tiles pressable, no hex; the decision log's block, part 17, part 0's line; UI-DESIGN-NOTES's kit section; the feedback document and the UI3 cards committed.
- PR 2, UI3-hud (6781): the character HUD top left (face, name, "Lv N", the gold bar of the weapon whose next level raises the combat level); the tracked quest as one line under it; a tap opens Bro; the top bar's XP slot quiet while it shows; the status column and the party chip moved down by the HUD's height; `?hud=0` (remembered) the old top left. Rules `src/game/charHud.js`, guards `char-hud` and `char-hud-mount` (every plant red; mutants killed or listed), phone test `mp-charhud`.
- PR 2's mend (sitting 71's hold, 6781): `char-hud` 9h and 9i read CharacterHud's own tree as an allow list: `const on = charHudOn()` and `if (!on ...) return null;` before every return that draws; every `model.level` and the one Lv span under a test that is exactly `model.ready`. Eleven plants red every run (the gatekeeper's two, the return moved into a function, a block or below the drawing, the switch read unused or made to say nothing or forced on, the Lv span alone, an alias, an always-true test). Main e8ccff26 merged.

## Next
- Nothing on PR 1. PRs 2 to 5 are other sessions' (cards UI3-hud, UI3-bro, UI3-combat, UI3-menus), PRs 3 to 5 stacked on this branch.
- Nothing for PR 2: it waits for the gatekeeper. The mend's runs on its final code (on the test box): precheck 0 FAIL; char-hud and char-hud-mount green; mp-charhud 26/26 (6. `?hud=0` on a phone page). Before the mend: mp-charhud 26/26; moved tests pass but xpbar's 320 px check; questguide, membudget and xpbar's 320 px also red on main plus the base branch without this PR; killxp's one red passed on its repeat.

## Found
- `src/ui/mobile/dash/ItemPage.jsx`:101: the item page's doors are `<Ui2Stat k="">` (a door drawn as a stat); now sunk with a large word until mended. On the guard's allow list (Gear's PR 3 holds the file): THE NEXT JOB, `Ui2Tile size="compact"` with `data-item-door` and the handler kept.
- `WeaponPage.jsx`:145, `SharedPage.jsx`:116: stats kept raised through their className; on the allow list for card UI3-combat (drawn exactly as before: the sunk rules skip `.u2-raised`).
- `sheet/CharacterPage.jsx`:266: `go(s.opens)` pushes nothing for a summary with no page: raised and dead at run time for those rows (the guard reads the tree, not the run); card UI3-bro rebuilds that page.
- `mp-uikit` on main: 1a counted 9 plates where 12 are drawn, 1b/1c red sideways (the Zones, Empty and Confirm plates) and "Skill guilds" cut: mended here (the kit page is this card's file).
- The guard reads the sheets with a small rule reader, not postcss: CI installs only `server/`'s packages, which hold no CSS parser (and no file under `server/` is this card's).
- Red without this PR (main eb90c6fd merged into claude/plan-pad-9-rimsprint, on the test box): mp-questguide 7 (the "!" pin drawn with no picture, the quest's count stuck at 0/4), mp-membudget buffers 25.1 MB over its 25 line, mp-xpbar 5 "upright 320" (the track past the spin button).
- `tools/qa/ui-review/packets.mjs` (not this card's file): the three new screens (`charhud`, `charhud-side`, `charhud-desk`) are in no ChatGPT packet, so `capture.mjs --check-notes` lists them (the guard `screens-listed` does not read packets).
- The tag block UI3 [[6780, 6799]] is not yet in `tools/dev/tag-blocks.json` (the gatekeeper registers it).

## Needs
- The owner (FLAGGED, never settled here): #4B6275 is 2.5 to 1 as an edge on the base (1.8 on a raised face), under the 3 to 1 asked of a control's edge: kept as theirs; the disabled grey stays under 4.5 (as on main); the stops around each of their values are this card's.
- For the owner (flagged, not settled): the online player count's new home (none on the HUD since v2.3.1227; Social is step 7's); health and energy stay off the top left; the fold of v2.3.4207 gives way to the one line; XP earned on a weapon that is not the HUD's shows only its "+N"; the two earlier take-outs (the strip, the face and frame) are reversed by their 2026-11-26 word.
