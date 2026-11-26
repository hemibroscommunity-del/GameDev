card: UI3-purse
branch: claude/plan-ui3-7-purse
prs: none yet (draft opens when the line is done; base claude/plan-ui3-2-hud)
state: working

## Done
- (in hand) tag 6786: the gold on the top bar between BroTown and the daily spin: src/game/topGold.js (the rule), tools/guards/top-gold.test.mjs (rules, the drawing's tree, 10 plants red), ZoneHeader.jsx's right column, game.css's .bt-zone-header__gold / spinslot / matched left column, the say row, ?topgold's switch row, states.mjs topbar-gold, UI-DESIGN-NOTES, mp-topgold.

## Next
- the upright phone's layout (waits on the orchestrator's pick, below); then the final runs (helpers) and the PR.

## Found
- src/game/barNumbers.js barNumber says 9,999,999 as "10M" on a narrow bar (rounds up past the true value); Gear says the same, so the bar copies it on purpose. Not mended (not this card's).
- the old purse's history before v2.3.6283 is not in git (the repository starts at 0d4b4985); its pops survive in game.css (.bt-purse-flip / .bt-purse-bump), reused.

## Needs
- the orchestrator's pick for an upright phone (asked 11-26): at 375 x 667 the room between the logo and the spin is 37 px and the gold needs about 72; exact centring doubles it. (A) gold stacked, logo shrinks about 15%; (B) the spin's button the wheel's round picture; (C) drop exact centring.
