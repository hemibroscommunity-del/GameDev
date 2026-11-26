card: UI2
branch: claude/plan-ui2-1-audit
prs: the one draft PR of this branch (6401; its number is in the message to the orchestrator)
state: ready

## Done
- Part 1 (6401), documents only: `docs/design/UI_ARCHITECTURE_V2.md` (the owner's document word for word, with part 13, the decision log); `UI_ARCHITECTURE_V2_AUDIT.md` (the game today against parts 2 to 8); `UI_ARCHITECTURE_V2_PLAN.md` (seven phases and the owner's ten questions); `docs/plan/cards/UI2-nav.md` (phase 1's card, a draft); CLAUDE.md section 2's line.

## Next
- nothing: phase 1 starts only on the owner's yes and their answers to questions 1 to 3.

## Found
- The document's points rule is not the game's: shared points come with the best weapon's level (`server/src/prog3.js`, the note of v2.3.3538), and a weapon's points may buy body stats.
- Another player's card is drawn from a blob their own phone relays (`rpgData`; `server/src/index.js` about 6309 calls it vanity-only): levels and item names there can be forged.
- `dash/EncyclopediaPanel.jsx` has three tabs (Codex, Materials, Zones) that read lists nothing writes; `dash/SpendPointConfirm.jsx` is mounted but is not in today's points flow (not verified whether anything still reaches it).
- `dash/NavRail.jsx` about line 44 still says "five" buttons; there are six.

## Needs
- The owner: yes or no to the plan, and questions 1 to 3 (the Menu's eight; the closed row and the Menu button; how phase 1 arrives).
