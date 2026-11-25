card: UI2
branch: claude/plan-ui2-4-visual
prs: part 1's draft PR #2360 (6401, `claude/plan-ui2-1-audit`); part 2's draft PR #2362 (6402, stacked on it); part 3's draft PR #2364 (6403, stacked on #2362); part 4's draft PR (6404, stacked on #2364; its number is in the message to the orchestrator)
state: ready

## Done
- Part 1 (6401), documents only: `docs/design/UI_ARCHITECTURE_V2.md` (the owner's document word for word, with part 13, the decision log); `UI_ARCHITECTURE_V2_AUDIT.md` (the game today against parts 2 to 8); `UI_ARCHITECTURE_V2_PLAN.md` (the phases and the owner's ten questions); `docs/plan/cards/UI2-nav.md` (phase 1's card, a draft); CLAUDE.md section 2's line.
- Part 2 (6402), documents only: the owner's addendum (questions 36 to 72) word for word as part 14; part 13's 23 dated lines; part 0's status table; the audit's second half; the plan's pieces, "What waits for gameplay", ten facts and the ten questions.
- Part 3 (6403), documents only: the owner's FINAL architecture addendum (questions 73 to 85) word for word as part 15; part 13's 15 dated lines; part 0 brought up to question 85 with the line that the foundational architecture is complete; the audit's third half (15 §2 to §6, the trade's safeguards one by one, NOT IN THE GAME for each); the plan (phase 7b, the workspaces at the buildings and the townsfolk; where each new piece lands; the ten facts across all three documents; "The room your mockups must fit"; six new questions). ONE document now holds all three hand-offs.
- Part 4 (6404), documents only: the owner's VISUAL design hand-off (questions 86 to 108) word for word as part 16; part 13's 23 dated lines and a status line; part 0's second table, "The look" (approved, working, open); the audit's fourth half, "The look" (the eight colours against the real tokens, the fonts, rarity's five scales, what exists of each rule, the buttons, the pictures by door, the laws a look must keep); the plan (the order with the look in it, five more facts to take back, "The kit for your mockups", six questions of the look). Nothing built: no token, style, font or picture.

## Next
- nothing: no phase starts. The visual direction is approved (part 16); the owner's own mockups come next (the Bro landing screen first), then their approval, then building. A next document from the owner is merged the same way, by a new part of this card.

## Found
- Parts 1 and 2 wrote the band's page as 178 px (78 px sideways), from an old comment (`src/ui/mobile/sheet/sheetGeometry.js`:933). The game's own functions give 191 px (82 px sideways) and a 243 px band at 390 x 844. Corrected in the audit, the plan and `UI2-nav.md`; the comment at :933 itself is stale (not this card's file).
- The points rule, another player's relayed blob, the phone-counted records, the Notifications page that is the chat log: as parts 1 and 2 found (the audit's first two halves).
- Part 3: `server/src/trade2.js`:42-43's header still says weapons trade only at the marketplace; the code trades weapons (to 4, in escrow) and pets (to 16).
- Part 3: `src/ui/panels/buildings/VendorPanel.jsx`'s comments still call it the auction house's shelf; it is one tile that opens `StorePanel`.
- Part 3: two comments disagree on whether E or a controller's stick can open a townsperson's talk (`src/ui/BroTown.jsx` about 957-971). Not verified which holds.
- Part 3: no craft handler carries a request stamp against a repeat (`server/src/armorforge.js`:32 says so of itself): a craft sent twice is made twice.
- Part 3: `dash/SettingsPanel.jsx`'s "menu side" row is a setting of the old side column; whether it does anything under the one band was not verified.
- Part 3: the level-up burst (`src/ui/LevelUpBurst.jsx`) does not read the device's reduce-motion preference, and about twenty files each read it for themselves.
- Part 4: `docs/LANTERN-SLATE-SPEC.md` prints the palette from before v2.3.1235's correction (band-top, raised, well, text, brass, focus ring all differ from `src/styles/game.css`:98-230) and still calls the third grade "Legendary", purple (:157-163); the code says Elite, orange (v2.3.3142). The class `.ls-slot--legendary` draws Elite.
- Part 4: `src/index.html`:66 asks Google Fonts for Raleway; no use of it was found, and `CREDITS.md` has no row for it.
- Part 4: three loops in `src/styles/game.css` do not read reduced motion (`.bt-build-flash` :1168, the XP bar's landing :2499, `.bt-arrive-pulse` :1173), and `.bt-player-dot` (:1130) pulses for ever against the spec's own rule.

## Needs
- The owner: nothing blocks. For their mockups: the plan's "The kit for your mockups" and "The room your mockups must fit". Theirs to settle (the plan's "The look's questions"): the grade's names (the game says Normal, Rare, Elite, Godly; the hand-off common and epic); a filled red button against "danger never fills"; the font; which actions are destructive.
