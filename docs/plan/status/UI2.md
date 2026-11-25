card: UI2
branch: claude/plan-ui2-3-final
prs: part 1's draft PR #2360 (6401, `claude/plan-ui2-1-audit`); part 2's draft PR #2362 (6402, stacked on it); part 3's draft PR (6403, stacked on #2362; its number is in the message to the orchestrator)
state: ready

## Done
- Part 1 (6401), documents only: `docs/design/UI_ARCHITECTURE_V2.md` (the owner's document word for word, with part 13, the decision log); `UI_ARCHITECTURE_V2_AUDIT.md` (the game today against parts 2 to 8); `UI_ARCHITECTURE_V2_PLAN.md` (the phases and the owner's ten questions); `docs/plan/cards/UI2-nav.md` (phase 1's card, a draft); CLAUDE.md section 2's line.
- Part 2 (6402), documents only: the owner's addendum (questions 36 to 72) word for word as part 14; part 13's 23 dated lines; part 0's status table; the audit's second half; the plan's pieces, "What waits for gameplay", ten facts and the ten questions.
- Part 3 (6403), documents only: the owner's FINAL architecture addendum (questions 73 to 85) word for word as part 15; part 13's 15 dated lines; part 0 brought up to question 85 with the line that the foundational architecture is complete; the audit's third half (15 §2 to §6, the trade's safeguards one by one, NOT IN THE GAME for each); the plan (phase 7b, the workspaces at the buildings and the townsfolk; where each new piece lands; the ten facts across all three documents; "The room your mockups must fit"; six new questions). ONE document now holds all three hand-offs.

## Next
- nothing: no phase starts. By the owner's own order (15 §7) the visual language and the mockups come first, then building after their approval. A next document from the owner is merged the same way, by a new part of this card.

## Found
- Parts 1 and 2 wrote the band's page as 178 px (78 px sideways), from an old comment (`src/ui/mobile/sheet/sheetGeometry.js`:933). The game's own functions give 191 px (82 px sideways) and a 243 px band at 390 x 844. Corrected in the audit, the plan and `UI2-nav.md`; the comment at :933 itself is stale (not this card's file).
- The points rule, another player's relayed blob, the phone-counted records, the Notifications page that is the chat log: as parts 1 and 2 found (the audit's first two halves).
- Part 3: `server/src/trade2.js`:42-43's header still says weapons trade only at the marketplace; the code trades weapons (to 4, in escrow) and pets (to 16).
- Part 3: `src/ui/panels/buildings/VendorPanel.jsx`'s comments still call it the auction house's shelf; it is one tile that opens `StorePanel`.
- Part 3: two comments disagree on whether E or a controller's stick can open a townsperson's talk (`src/ui/BroTown.jsx` about 957-971). Not verified which holds.
- Part 3: no craft handler carries a request stamp against a repeat (`server/src/armorforge.js`:32 says so of itself): a craft sent twice is made twice.
- Part 3: `dash/SettingsPanel.jsx`'s "menu side" row is a setting of the old side column; whether it does anything under the one band was not verified.
- Part 3: the level-up burst (`src/ui/LevelUpBurst.jsx`) does not read the device's reduce-motion preference, and about twenty files each read it for themselves.

## Needs
- The owner: nothing to answer now. For their next step (drawing): the plan's "The room your mockups must fit" and "What to take back to the design conversation"; the final addendum's first two questions (the loot rows; where the shop, bank, benches and trade live) change what they draw.
