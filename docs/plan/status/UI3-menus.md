card: UI3-menus
branch: claude/plan-ui3-5-menus
prs: (opened with the work's push; base claude/plan-ui3-1-kit)
state: ready

Tag 6784. Stacked on the kit (claude/plan-ui3-1-kit, PR #2395) with Gear's PR 3 (claude/plan-ui2-9c-equipment, #2391) merged in for the item page's files.

## Done
- Reading 1-2: the Menu's picture the largest the tile holds, capped 58 / 35 (src/game/menuTile.js, guard menu-tile with M1-M7 planted red); tile padding 2 in MenuGrid; Bro's six and the hubs by the same rule.
- Readings 4-6: the bag square's one socket (`BagTile kit`, Gear's call only; guard gear-socket, four plants red); label rows 24 px, words 11 px caps; the gold a recessed Ui2Stat pill, coin 16 px.
- Reading 7: the bag in whole rows (src/game/gearGeometry.js, guard gear-geometry over W 300-900 x H 100-420, D1-D5 planted red); scroller = its rows; scroll-snap to a row (gearPanels.css).
- ItemPage's doors: Ui2Tile size="compact" (data-item-door and handlers kept); raisedFormsKnown's ItemPage row fell.
- mp-ui3menus (new, lane full): steps 1-6 and 3b.
- Docs: UI-DESIGN-NOTES (the Menu's root, Gear's two panels), states.mjs abouts, the decision log's two lines, this card's newest copy.

## Next
- Nothing: the ONE message to the orchestrator.

## Found
- (none outside the card)

## Needs
- The owner: whether a bag square may go under 44 px (not needed on the four phone shapes: three rows fit upright).
