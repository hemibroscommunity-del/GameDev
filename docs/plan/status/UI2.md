card: UI2
branch: claude/plan-ui2-2-addendum
prs: part 1's draft PR #2360 (6401, `claude/plan-ui2-1-audit`); part 2's draft PR (6402, stacked on it; its number is in the message to the orchestrator)
state: ready

## Done
- Part 1 (6401), documents only: `docs/design/UI_ARCHITECTURE_V2.md` (the owner's document word for word, with part 13, the decision log); `UI_ARCHITECTURE_V2_AUDIT.md` (the game today against parts 2 to 8); `UI_ARCHITECTURE_V2_PLAN.md` (seven phases and the owner's ten questions); `docs/plan/cards/UI2-nav.md` (phase 1's card, a draft); CLAUDE.md section 2's line.
- Part 2 (6402), documents only: the owner's addendum (questions 36 to 72) word for word as the document's part 14, a note at the top on how the parts rank, and part 13's 23 dated lines for what it settles or changes; the audit's second half (14 §2 to §7, with NOT IN THE GAME for each); the plan (phase 1b the motion, six screens in phase 6, four cards in phase 7, phase 8 the clean-up; where each reusable piece lands; "What waits for gameplay"; the ten questions as they now stand); phase 1's card brought in line.

## Next
- nothing: phase 1 starts only on the owner's yes and their answers to questions 1 to 3.

## Found
- The document's points rule is not the game's: shared points come with the best weapon's level (`server/src/prog3.js`, the note of v2.3.3538), and a weapon's points may buy body stats.
- Another player's card is drawn from a blob their own phone relays (`rpgData`; `server/src/index.js` about 6309 calls it vanity-only): levels and item names there can be forged.
- `dash/EncyclopediaPanel.jsx` has three tabs (Codex, Materials, Zones) that read lists nothing writes; `dash/SpendPointConfirm.jsx` is mounted but is not in today's points flow (not verified whether anything still reaches it).
- `dash/NavRail.jsx` about line 44 still says "five" buttons; there are six.
- Part 2: the lifetime records (`_compStats`, `src/ui/BroTown.jsx` about 1528) and the boards' `lifeTotal` (`server/src/leaderboard.js`:217) are what each phone reports, not the worker's own count.
- Part 2: `src/ui/panels/FurniturePanel.jsx` writes `rpg._furniture` on the phone only; the worker has no furniture at all. Whether a player still reaches the workshop was not verified.
- Part 2: seven private copies of the reduced-motion check (`sheet/motion.js`:9 is the shared one).
- Part 2: the first half of the audit reads "n of 23" achievements; a lane counted 33 rows in `src/data/achievements.js`. Not verified which.
- Part 2: the page called Notifications lists chat lines (`notifBus.js`:55), and the setting called Notifications only hides the chat feed.

## Needs
- The owner: yes or no to the plan, and questions 1 to 3 as they now stand (the Menu's eight; the closed band's two buttons; how phase 1 arrives, with the growing motion as its own small step).
