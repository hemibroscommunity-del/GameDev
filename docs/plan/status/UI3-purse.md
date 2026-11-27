card: UI3-purse
branch: claude/plan-ui3-7-purse
prs: draft PR (ready), base claude/plan-ui3-2-hud
state: ready

## Done
- tag 6786: the gold on the top bar between BroTown and the daily spin: src/game/topGold.js (the rule: Gear's source S.rpg.coins and form barNumber(n, true, 10000), nothing before the worker's record, ?topgold=0 remembered), tools/guards/top-gold.test.mjs (rules, the drawing's tree, 10 plants red), ZoneHeader.jsx's right column (the gold, the spin's slot), game.css (fixed widths, the door's column matched: the name centred; upright the coin over its number, pick A), the say row, ?topgold's switch row, states.mjs topbar-gold, UI-DESIGN-NOTES, mp-topgold.
- runs on the final code 954ea4e7: mp-topgold 79/79, mp-charhud 26/26, mp-topbarplace 20/20 (mp-topbarplace pins no column: unchanged); precheck 0 FAIL.

## Next
- nothing: waits for the gatekeeper.

## Found
- src/game/barNumbers.js barNumber says 9,999,999 as "10M" on a narrow bar (rounds up); Gear says the same, so the bar copies it on purpose. Not mended.
- the old purse's code before v2.3.6283 is not in git (the repository starts at 0d4b4985); its pops survive in game.css (.bt-purse-flip / .bt-purse-bump), reused.
- the worker has no way to set a purse to 0 from a test (grants only add); a new character starts with 50, so mp-topgold measures at 50 and 9,999,999 (the widths are fixed, the 0 case is in the suite).
- mp-charhud rewrites UI3-hud's docs/shots/ui3-hud-*.png on any run; left as committed here.

## Needs
- the owner, when back: pick (A) was the orchestrator's (part 29) while away; (B) the spin's round wheel picture upright, or (C) the centring given up, are theirs to choose. And whether Gear's gold goes now that the bar shows it.
